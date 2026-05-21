"""FastAPI server for Prompt2Print."""

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from compile_latex import compile_latex
from generator import generate_latex, fix_latex, generate_fallback_latex

app = FastAPI(title="Prompt2Print API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Worksheet-Mode"],
)

MAX_FIX_ATTEMPTS = 3


class CompileRequest(BaseModel):
    latex: str


class GenerateRequest(BaseModel):
    prompt: str


@app.get("/")
def health():
    return {"status": "ok", "service": "Prompt2Print API"}


@app.post("/compile")
def compile_endpoint(req: CompileRequest):
    result = compile_latex(req.latex)
    if result.ok and result.pdf_bytes:
        return Response(content=result.pdf_bytes, media_type="application/pdf")
    last_lines = "\n".join(result.log.splitlines()[-20:])
    return Response(content=last_lines, media_type="text/plain", status_code=422)


def _pdf_response(pdf_bytes: bytes, mode: str) -> Response:
    """Return a PDF, tagging which mode produced it (rich or fallback)."""
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"X-Worksheet-Mode": mode},
    )


@app.post("/generate")
def generate_endpoint(req: GenerateRequest):
    # --- Attempt 1: the rich, visually engaging version ---
    latex = generate_latex(req.prompt)
    result = compile_latex(latex)

    attempts = 0
    while not (result.ok and result.pdf_bytes) and attempts < MAX_FIX_ATTEMPTS:
        error_log = "\n".join(result.log.splitlines()[-25:])
        latex = fix_latex(latex, error_log)
        result = compile_latex(latex)
        attempts += 1

    if result.ok and result.pdf_bytes:
        return _pdf_response(result.pdf_bytes, "rich")

    # --- Fallback: plain, graphics-free version that almost always compiles ---
    fallback_latex = generate_fallback_latex(req.prompt)
    fb_result = compile_latex(fallback_latex)

    # Give the fallback one repair attempt too, just in case.
    if not (fb_result.ok and fb_result.pdf_bytes):
        error_log = "\n".join(fb_result.log.splitlines()[-25:])
        fallback_latex = fix_latex(fallback_latex, error_log)
        fb_result = compile_latex(fallback_latex)

    if fb_result.ok and fb_result.pdf_bytes:
        return _pdf_response(fb_result.pdf_bytes, "fallback")

    # Truly exhausted (very rare): return diagnostics.
    detail = "Could not generate a worksheet after all attempts."
    return Response(content=detail, media_type="text/plain", status_code=422)
