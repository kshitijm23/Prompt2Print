"""FastAPI server for Prompt2Print."""

import sys
import traceback

# Diagnostic import guard: print full traceback if any import fails
try:
    import base64
    import logging

    from fastapi import Depends, FastAPI, File, Form, Response, UploadFile
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel

    from auth import get_current_user_id
    from compile_latex import compile_latex
    from credits import refund_credit, require_and_deduct_credit
    from generator import (
        edit_latex,
        fix_latex,
        generate_fallback_latex,
        generate_from_reference,
        generate_latex,
    )
except Exception:
    print("=" * 60, flush=True)
    print("MAIN.PY IMPORT FAILED — real traceback below:", flush=True)
    print("=" * 60, flush=True)
    traceback.print_exc()
    print("=" * 60, flush=True)
    sys.stdout.flush()
    sys.stderr.flush()
    raise

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


def _normalize_style(style: str) -> str:
    """Coerce anything except 'plain' back to 'rich'. Never trust client input."""
    return "plain" if (style or "").lower() == "plain" else "rich"


class CompileRequest(BaseModel):
    latex: str


class GenerateRequest(BaseModel):
    prompt: str
    style: str = "rich"


class EditRequest(BaseModel):
    latex: str
    instruction: str
    prompt: str = ""  # original prompt, needed for regenerate-fallback
    style: str = "rich"  # inherited from current worksheet


@app.get("/")
def health():
    """Public health check — Railway pings this. Do NOT require auth here."""
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
def compile_endpoint(
    req: CompileRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Compile raw LaTeX to PDF. Used to re-render saved worksheets from the library."""
    result = compile_latex(req.latex)
    if result.ok and result.pdf_bytes:
        return Response(content=result.pdf_bytes, media_type="application/pdf")
    last_lines = "\n".join(result.log.splitlines()[-20:])
    return Response(content=last_lines, media_type="text/plain", status_code=422)


@app.post("/generate")
def generate_endpoint(
    req: GenerateRequest,
    user_id: str = Depends(get_current_user_id),
):
    style = _normalize_style(req.style)
    require_and_deduct_credit(
        user_id, "generation", {"prompt": req.prompt[:200], "style": style}
    )

    try:
        latex = generate_latex(req.prompt, style=style)
        result = compile_latex(latex)

        attempts = 0
        while not (result.ok and result.pdf_bytes) and attempts < MAX_FIX_ATTEMPTS:
            error_log = "\n".join(result.log.splitlines()[-25:])
            latex = fix_latex(latex, error_log, style=style)
            result = compile_latex(latex)
            attempts += 1

        if result.ok and result.pdf_bytes:
            return _pdf_response_full(result.pdf_bytes, style, latex)

        # Fallback path — plain, graphics-free, high-quality model
        fallback_latex = generate_fallback_latex(req.prompt)
        fb_result = compile_latex(fallback_latex)
        if not (fb_result.ok and fb_result.pdf_bytes):
            error_log = "\n".join(fb_result.log.splitlines()[-25:])
            fallback_latex = fix_latex(fallback_latex, error_log, style="plain")
            fb_result = compile_latex(fallback_latex)

        if fb_result.ok and fb_result.pdf_bytes:
            return _pdf_response_full(fb_result.pdf_bytes, "fallback", fallback_latex)

        refund_credit(
            user_id, "refund_generation_failed",
            {"prompt": req.prompt[:200], "style": style},
        )
        return Response(
            content="Could not generate a worksheet after all attempts.",
            media_type="text/plain",
            status_code=422,
        )
    except Exception:
        refund_credit(
            user_id, "refund_generation_error",
            {"prompt": req.prompt[:200], "style": style},
        )
        raise


@app.post("/edit-worksheet")
def edit_endpoint(
    req: EditRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Apply a conversational edit. Edits are free (no credit cost)."""
    log.info("Editing worksheet with instruction: %s", req.instruction[:100])
    style = _normalize_style(req.style)

    # Path A: patch the existing LaTeX
    latex = edit_latex(req.latex, req.instruction)
    result = compile_latex(latex)

    attempts = 0
    while not (result.ok and result.pdf_bytes) and attempts < MAX_FIX_ATTEMPTS:
        error_log = "\n".join(result.log.splitlines()[-25:])
        latex = fix_latex(latex, error_log, style=style)
        result = compile_latex(latex)
        attempts += 1

    if result.ok and result.pdf_bytes:
        return _pdf_response_full(result.pdf_bytes, "edited", latex, edit_mode="patched")

    # Path B: regenerate from merged prompt, preserving the worksheet's style
    log.info("Patch loop failed; falling back to regeneration (style=%s).", style)
    original = (req.prompt or "").strip()
    if original:
        merged_prompt = f"{original}\n\nAdditional requirement: {req.instruction.strip()}"
    else:
        merged_prompt = req.instruction.strip()

    regen_latex = generate_latex(merged_prompt, style=style)
    regen_result = compile_latex(regen_latex)

    r_attempts = 0
    while not (regen_result.ok and regen_result.pdf_bytes) and r_attempts < MAX_FIX_ATTEMPTS:
        error_log = "\n".join(regen_result.log.splitlines()[-25:])
        regen_latex = fix_latex(regen_latex, error_log, style=style)
        regen_result = compile_latex(regen_latex)
        r_attempts += 1

    if regen_result.ok and regen_result.pdf_bytes:
        return _pdf_response_full(regen_result.pdf_bytes, "edited", regen_latex, edit_mode="regenerated")

    # Final fallback: plain LaTeX so at least something comes back
    plain_latex = generate_fallback_latex(merged_prompt)
    plain_result = compile_latex(plain_latex)
    if not (plain_result.ok and plain_result.pdf_bytes):
        error_log = "\n".join(plain_result.log.splitlines()[-25:])
        plain_latex = fix_latex(plain_latex, error_log, style="plain")
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
    style: str = Form("rich"),
    user_id: str = Depends(get_current_user_id),
):
    """Generate a worksheet using an uploaded reference PDF for structural guidance."""
    log.info("Generating from reference: %s (style=%s)", reference.filename, style)
    file_bytes = await reference.read()
    style = _normalize_style(style)

    require_and_deduct_credit(
        user_id, "generation_from_reference",
        {"prompt": prompt[:200], "style": style},
    )

    try:
        latex = generate_from_reference(
            file_bytes, reference.content_type or "application/pdf", prompt, style=style
        )
        result = compile_latex(latex)

        attempts = 0
        while not (result.ok and result.pdf_bytes) and attempts < MAX_FIX_ATTEMPTS:
            error_log = "\n".join(result.log.splitlines()[-25:])
            latex = fix_latex(latex, error_log, style=style)
            result = compile_latex(latex)
            attempts += 1

        if result.ok and result.pdf_bytes:
            return _pdf_response_full(result.pdf_bytes, style, latex)

        fallback_latex = generate_fallback_latex(prompt)
        fb_result = compile_latex(fallback_latex)
        if not (fb_result.ok and fb_result.pdf_bytes):
            error_log = "\n".join(fb_result.log.splitlines()[-25:])
            fallback_latex = fix_latex(fallback_latex, error_log, style="plain")
            fb_result = compile_latex(fallback_latex)

        if fb_result.ok and fb_result.pdf_bytes:
            return _pdf_response_full(fb_result.pdf_bytes, "fallback", fallback_latex)

        refund_credit(
            user_id, "refund_generation_failed",
            {"prompt": prompt[:200], "style": style},
        )
        return Response(
            content="Could not generate a worksheet from that reference.",
            media_type="text/plain",
            status_code=422,
        )
    except Exception:
        refund_credit(
            user_id, "refund_generation_error",
            {"prompt": prompt[:200], "style": style},
        )
        raise