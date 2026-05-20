"""Compiles a LaTeX string into a PDF inside a sandbox."""

from __future__ import annotations
import subprocess
import tempfile
from pathlib import Path
from dataclasses import dataclass

COMPILE_TIMEOUT_SECONDS = 30


@dataclass
class CompileResult:
    ok: bool
    pdf_bytes: bytes | None
    log: str


def compile_latex(source: str) -> CompileResult:
    with tempfile.TemporaryDirectory() as workdir:
        work = Path(workdir)
        tex_file = work / "worksheet.tex"
        tex_file.write_text(source, encoding="utf-8")

        try:
            proc = subprocess.run(
                [
                    "latexmk", "-pdf",
                    "-interaction=nonstopmode",
                    "-no-shell-escape",
                    "-halt-on-error",
                    tex_file.name,
                ],
                cwd=work,
                capture_output=True,
                text=True,
                timeout=COMPILE_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            return CompileResult(False, None, "Compilation timed out.")

        pdf_path = work / "worksheet.pdf"
        log_path = work / "worksheet.log"
        log_text = (
            log_path.read_text(encoding="utf-8", errors="replace")
            if log_path.exists()
            else proc.stdout + "\n" + proc.stderr
        )

        if proc.returncode == 0 and pdf_path.exists():
            return CompileResult(True, pdf_path.read_bytes(), log_text)
        return CompileResult(False, None, log_text)


if __name__ == "__main__":
    sample = r"""\documentclass{article}
\begin{document}
Hello from Prompt2Print.
\end{document}"""
    result = compile_latex(sample)
    if result.ok and result.pdf_bytes:
        Path("/tmp/out.pdf").write_bytes(result.pdf_bytes)
        print(f"SUCCESS - wrote out.pdf ({len(result.pdf_bytes):,} bytes)")
    else:
        print("FAILED - last log lines:")
        print("\n".join(result.log.splitlines()[-10:]))

