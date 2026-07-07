"""FastAPI server for Prompt2Print."""

import base64
import logging
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, Response, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from compile_latex import compile_latex
from generator import (
    generate_latex, fix_latex, generate_fallback_latex, edit_latex,
    generate_from_reference,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("prompt2print")

app = FastAPI(title="Prompt2Print API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Worksheet-Mode", "X-Latex-B64", "X-Edit-Mode"],
)

MAX_FIX_ATTEMPTS = 3


class CompileRequest(BaseModel):
    latex: str


class GenerateRequest(BaseModel):
    prompt: str


class EditRequest(BaseModel):
    latex: str
    instruction: str
    prompt: str = ""  # original prompt, needed for regenerate-fallback


@app.get("/")
def health():
    return {"status": "ok", "service": "Prompt2Print API"}


def _pdf_response_full(pdf_bytes: bytes, mode: str, latex: str, edit_mode: str = "") -> Response:
    """Return PDF as body, send LaTeX as a base64 header so the client can keep it."""
    headers = {
        "X-Worksheet-Mode": mode,
        "X-Latex-B64": base64.b64encode(latex.encode("utf-8")).decode("ascii"),
    }
    if edit_mode:
        headers["X-Edit-Mode"] = edit_mode
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers=headers,
    )


@app.post("/compile")
def compile_endpoint(req: CompileRequest):
    result = compile_latex(req.latex)
    if result.ok and result.pdf_bytes:
        return Response(content=result.pdf_bytes, media_type="application/pdf")
    last_lines = "\n".join(result.log.splitlines()[-20:])
    return Response(content=last_lines, media_type="text/plain", status_code=422)


@app.post("/generate")
def generate_endpoint(req: GenerateRequest):
    latex = generate_latex(req.prompt)
    result = compile_latex(latex)

    attempts = 0
    while not (result.ok and result.pdf_bytes) and attempts < MAX_FIX_ATTEMPTS:
        error_log = "\n".join(result.log.splitlines()[-25:])
        latex = fix_latex(latex, error_log)
        result = compile_latex(latex)
        attempts += 1

    if result.ok and result.pdf_bytes:
        return _pdf_response_full(result.pdf_bytes, "rich", latex)

    fallback_latex = generate_fallback_latex(req.prompt)
    fb_result = compile_latex(fallback_latex)
    if not (fb_result.ok and fb_result.pdf_bytes):
        error_log = "\n".join(fb_result.log.splitlines()[-25:])
        fallback_latex = fix_latex(fallback_latex, error_log)
        fb_result = compile_latex(fallback_latex)

    if fb_result.ok and fb_result.pdf_bytes:
        return _pdf_response_full(fb_result.pdf_bytes, "fallback", fallback_latex)

    return Response(
        content="Could not generate a worksheet after all attempts.",
        media_type="text/plain",
        status_code=422,
    )


@app.post("/edit-worksheet")
def edit_endpoint(req: EditRequest):
    """Apply a conversational edit to an existing worksheet and return a new PDF.

    Strategy:
      1) Try to *patch* the existing LaTeX with the edit instruction.
      2) If patching fails after MAX_FIX_ATTEMPTS, fall back to *regenerating*
         from a merged prompt (original + edit instruction), running the full
         generate + fix loop + plain-fallback pipeline.
    """
    log.info("Editing worksheet with instruction: %s", req.instruction[:100])

    # --- Path A: patch the existing LaTeX ---
    latex = edit_latex(req.latex, req.instruction)
    result = compile_latex(latex)

    attempts = 0
    while not (result.ok and result.pdf_bytes) and attempts < MAX_FIX_ATTEMPTS:
        error_log = "\n".join(result.log.splitlines()[-25:])
        latex = fix_latex(latex, error_log)
        result = compile_latex(latex)
        attempts += 1

    if result.ok and result.pdf_bytes:
        return _pdf_response_full(result.pdf_bytes, "edited", latex, edit_mode="patched")

    # --- Path B: fall back to regenerating from a merged prompt ---
    log.info("Patch loop failed; falling back to regeneration.")
    original = (req.prompt or "").strip()
    if original:
        merged_prompt = f"{original}\n\nAdditional requirement: {req.instruction.strip()}"
    else:
        merged_prompt = req.instruction.strip()

    regen_latex = generate_latex(merged_prompt)
    regen_result = compile_latex(regen_latex)

    r_attempts = 0
    while not (regen_result.ok and regen_result.pdf_bytes) and r_attempts < MAX_FIX_ATTEMPTS:
        error_log = "\n".join(regen_result.log.splitlines()[-25:])
        regen_latex = fix_latex(regen_latex, error_log)
        regen_result = compile_latex(regen_latex)
        r_attempts += 1

    if regen_result.ok and regen_result.pdf_bytes:
        return _pdf_response_full(regen_result.pdf_bytes, "edited", regen_latex, edit_mode="regenerated")

    # --- Final fallback: plain LaTeX so at least *something* comes back ---
    plain_latex = generate_fallback_latex(merged_prompt)
    plain_result = compile_latex(plain_latex)
    if not (plain_result.ok and plain_result.pdf_bytes):
        error_log = "\n".join(plain_result.log.splitlines()[-25:])
        plain_latex = fix_latex(plain_latex, error_log)
        plain_result = compile_latex(plain_latex)

    if plain_result.ok and plain_result.pdf_bytes:
        return _pdf_response_full(plain_result.pdf_bytes, "fallback", plain_latex, edit_mode="regenerated")

    return Response(
        content="Could not apply that edit. Try starting a new worksheet.",
        media_type="text/plain",
        status_code=422,
    )


@app.post("/generate-from-reference")
async def generate_from_reference_endpoint(
    prompt: str = Form(...),
    reference: UploadFile = File(...),
):
    """Generate a worksheet using an uploaded reference PDF for structural guidance."""
    log.info("Generating from reference: %s", reference.filename)
    file_bytes = await reference.read()

    latex = generate_from_reference(file_bytes, reference.content_type or "application/pdf", prompt)
    result = compile_latex(latex)

    attempts = 0
    while not (result.ok and result.pdf_bytes) and attempts < MAX_FIX_ATTEMPTS:
        error_log = "\n".join(result.log.splitlines()[-25:])
        latex = fix_latex(latex, error_log)
        result = compile_latex(latex)
        attempts += 1

    if result.ok and result.pdf_bytes:
        return _pdf_response_full(result.pdf_bytes, "rich", latex)

    # Fallback path
    fallback_latex = generate_fallback_latex(prompt)
    fb_result = compile_latex(fallback_latex)
    if not (fb_result.ok and fb_result.pdf_bytes):
        error_log = "\n".join(fb_result.log.splitlines()[-25:])
        fallback_latex = fix_latex(fallback_latex, error_log)
        fb_result = compile_latex(fallback_latex)

    if fb_result.ok and fb_result.pdf_bytes:
        return _pdf_response_full(fb_result.pdf_bytes, "fallback", fallback_latex)

    return Response(
        content="Could not generate a worksheet from that reference.",
        media_type="text/plain",
        status_code=422,
    )
