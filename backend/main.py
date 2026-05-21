"""FastAPI server for Prompt2Print."""

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from compile_latex import compile_latex
from generator import generate_latex, fix_latex

app = FastAPI(title="Prompt2Print API")

# Allow the frontend (running in a browser) to call this API.
# For development we allow all origins; we''ll tighten this for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FIX_ATTEMPTS = 2


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
        return Response(content=result.pdf_bytes, media_type="application/pdf")

    detail = "LATEX:\n" + latex + "\n\nLOG:\n" + "\n".join(result.log.splitlines()[-20:])
    return Response(content=detail, media_type="text/plain", status_code=422)
