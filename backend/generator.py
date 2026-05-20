"""Turns a teacher''s plain-language prompt into compilable worksheet LaTeX.

Provider-agnostic by design: only generate_latex() knows it''s Claude.
Swap the body of that function to change providers later.
"""

import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()  # reads ANTHROPIC_API_KEY from the .env file

_client = Anthropic()  # picks up the key from the environment
_MODEL = "claude-sonnet-4-6"

# The fixed, known-good preamble. Claude fills the body; we control the rest.
_SYSTEM_PROMPT = r"""You are a worksheet-generating engine for teachers.
You output ONLY valid, compilable LaTeX — no markdown fences, no commentary,
no explanation before or after. Your entire response must be a complete LaTeX
document that compiles with pdflatex/latexmk.

Always use exactly this preamble and structure:

\documentclass[11pt]{article}
\usepackage[a4paper,margin=2cm]{geometry}
\usepackage{amsmath, amssymb}
\usepackage{xcolor}
\usepackage{tikz}
\usetikzlibrary{shapes.geometric, arrows.meta, positioning, calc}
\usepackage{pgfplots}
\pgfplotsset{compat=1.18}
\usepackage[most]{tcolorbox}
\usepackage{enumitem}
\definecolor{brandblue}{HTML}{2563EB}
\definecolor{brandlight}{HTML}{EFF6FF}
\newtcolorbox{questionbox}[1]{colback=brandlight, colframe=brandblue,
  fonttitle=\bfseries, title=#1, boxrule=0.8pt, arc=3pt,
  left=8pt, right=8pt, top=6pt, bottom=6pt}

Rules:
- Wrap each question in a questionbox with a descriptive title.
- Use TikZ for diagrams, number lines, and bar models where helpful.
- Keep math in proper LaTeX math mode.
- Make it visually engaging and student-friendly.
- Output the FULL document from \documentclass to \end{document}.
"""


def generate_latex(prompt: str) -> str:
    """Send the teacher''s request to Claude, return LaTeX source."""
    message = _client.messages.create(
        model=_MODEL,
        max_tokens=4000,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    # The response is a list of content blocks; join the text ones.
    return "".join(
        block.text for block in message.content if block.type == "text"
    ).strip()


if __name__ == "__main__":
    sample = "A grade 5 worksheet on adding fractions, 4 questions, with a visual model."
    print(generate_latex(sample))


def fix_latex(broken_latex: str, error_log: str) -> str:
    """Ask Claude to repair LaTeX that failed to compile."""
    repair_prompt = (
        "The following LaTeX failed to compile. Fix it so it compiles cleanly "
        "with pdflatex. Output ONLY the corrected full LaTeX document, no "
        "commentary.\n\n=== LATEX ===\n" + broken_latex +
        "\n\n=== COMPILER ERROR ===\n" + error_log
    )
    message = _client.messages.create(
        model=_MODEL,
        max_tokens=4000,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": repair_prompt}],
    )
    return "".join(
        block.text for block in message.content if block.type == "text"
    ).strip()
