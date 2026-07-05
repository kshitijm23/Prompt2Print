"""Turns a teacher''s plain-language prompt into compilable worksheet LaTeX.

Provider-agnostic by design: only generate_latex() knows it''s Claude.
Swap the body of that function to change providers later.
"""

import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()  # reads ANTHROPIC_API_KEY from the .env file

_client = Anthropic()  # picks up the key from the environment
_MODEL = "claude-opus-4-7"

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

# A deliberately minimal preamble that is extremely unlikely to fail.
_FALLBACK_SYSTEM_PROMPT = r"""You are a worksheet-generating engine for teachers.
Output ONLY valid, compilable LaTeX, no markdown fences, no commentary.
Use ONLY this minimal, safe setup. Do NOT use tikz, pgfplots, or tcolorbox.

\documentclass[11pt]{article}
\usepackage[a4paper,margin=2cm]{geometry}
\usepackage{amsmath, amssymb}
\usepackage{enumitem}

Rules:
- Plain, clean formatting. Use \section* for question groupings.
- Use simple enumerate lists for questions.
- Keep all math in proper LaTeX math mode.
- NO graphics packages of any kind. Text and math only.
- Output the FULL document from \documentclass to \end{document}.
"""


def generate_fallback_latex(prompt: str) -> str:
    """Generate a plain, graphics-free worksheet that is very likely to compile."""
    message = _client.messages.create(
        model=_MODEL,
        max_tokens=4000,
        system=_FALLBACK_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(
        block.text for block in message.content if block.type == "text"
    ).strip()



_EDIT_SYSTEM_PROMPT = """You are a LaTeX worksheet editor. You will be given:
1. The existing worksheet as LaTeX
2. An edit instruction from a teacher

Modify the LaTeX to reflect the edit while keeping everything else intact.
Output ONLY the complete, updated LaTeX document — no explanations, no
markdown fences, nothing but the LaTeX from \\documentclass to \\end{document}.
Preserve the existing structure, style, and any diagrams the teacher didn't
ask to change."""


def edit_latex(existing_latex: str, edit_instruction: str) -> str:
    """Ask Claude to modify existing worksheet LaTeX based on an instruction."""
    user_msg = (
        "EXISTING WORKSHEET LATEX:\n" + existing_latex +
        "\n\nEDIT INSTRUCTION:\n" + edit_instruction
    )
    message = _client.messages.create(
        model=_MODEL,
        max_tokens=4000,
        system=_EDIT_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    return "".join(
        block.text for block in message.content if block.type == "text"
    ).strip()


_REFERENCE_SYSTEM_PROMPT = """You are a worksheet-generating engine for teachers.
You will receive:
1. A REFERENCE document (PDF or image) — an existing worksheet the teacher likes.
2. A NEW PROMPT describing the worksheet they want you to make.

Study the reference to understand its STRUCTURE and PEDAGOGY:
- Number and type of questions (MCQ, open-ended, fill-in, word problems, etc.)
- Topic and grade level
- Layout style (single column, boxed sections, etc.)
- Tone and difficulty

Then generate a NEW worksheet that follows the teacher's prompt but is
STRUCTURALLY SIMILAR to the reference. Do NOT copy the reference's exact
problems or wording. Match its shape, not its content.

Output ONLY compilable LaTeX, no commentary, no markdown fences.
Use the standard worksheet preamble with tcolorbox, tikz, xcolor, amsmath, etc.
Wrap questions in questionbox environments and use tipbox for hints.
"""


def generate_from_reference(file_bytes: bytes, media_type: str, prompt: str) -> str:
    """Generate worksheet LaTeX from a reference file (PDF or image) plus a teacher prompt."""
    import base64 as _b64
    file_b64 = _b64.b64encode(file_bytes).decode("ascii")

    # Pick the right content-block shape based on file type.
    is_pdf = media_type == "application/pdf"
    if is_pdf:
        reference_block = {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": file_b64,
            },
        }
    else:
        reference_block = {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": file_b64,
            },
        }

    message = _client.messages.create(
        model=_MODEL,
        max_tokens=4000,
        system=_REFERENCE_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    reference_block,
                    {"type": "text", "text": "NEW PROMPT: " + prompt},
                ],
            }
        ],
    )
    return "".join(
        block.text for block in message.content if block.type == "text"
    ).strip()
