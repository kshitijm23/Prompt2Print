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
    expose_headers=["X-Worksheet-Mode", "X-Latex-B64"],
)

MAX_FIX_ATTEMPTS = 3


class CompileRequest(BaseModel):
    latex: str


class GenerateRequest(BaseModel):
    prompt: str


class EditRequest(BaseModel):
    latex: str
    instruction: str


@app.get("/")
def health():
    return {"status": "ok", "service": "Prompt2Print API"}


def _pdf_response_full(pdf_bytes: bytes, mode: str, latex: str) -> Response:
    """Return PDF as body, send LaTeX as a base64 header so the client can keep it."""
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "X-Worksheet-Mode": mode,
            "X-Latex-B64": base64.b64encode(latex.encode("utf-8")).decode("ascii"),
        },
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
    """Apply a conversational edit to an existing worksheet and return a new PDF."""
    log.info("Editing worksheet with instruction: %s", req.instruction[:100])
    latex = edit_latex(req.latex, req.instruction)
    result = compile_latex(latex)

    attempts = 0
    while not (result.ok and result.pdf_bytes) and attempts < MAX_FIX_ATTEMPTS:
        error_log = "\n".join(result.log.splitlines()[-25:])
        latex = fix_latex(latex, error_log)
        result = compile_latex(latex)
        attempts += 1

    if result.ok and result.pdf_bytes:
        return _pdf_response_full(result.pdf_bytes, "edited", latex)

    return Response(
        content="Could not apply that edit. Try rephrasing.",
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
