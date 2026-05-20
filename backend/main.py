"""FastAPI server for Prompt2Print: send LaTeX, get a PDF back."""

from fastapi import FastAPI, Response
from pydantic import BaseModel

from compile_latex import compile_latex

app = FastAPI(title="Prompt2Print API")


class CompileRequest(BaseModel):
    latex: str


@app.get("/")
def health():
    return {"status": "ok", "service": "Prompt2Print API"}


@app.post("/compile")
def compile_endpoint(req: CompileRequest):
    result = compile_latex(req.latex)
    if result.ok and result.pdf_bytes:
        return Response(content=result.pdf_bytes, media_type="application/pdf")
    # Compile failed: return the log so the caller can see why.
    last_lines = "\n".join(result.log.splitlines()[-20:])
    return Response(content=last_lines, media_type="text/plain", status_code=422)
