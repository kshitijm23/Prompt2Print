"""Turns a teacher's plain-language prompt into compilable worksheet LaTeX.

Two output styles:
  - "rich"  : colorful, boxed, TikZ diagrams — the current default
  - "plain" : traditional classroom exam paper, no color, no boxes, no graphics

Model tiering:
  - Rich generation, fix, fallback, reference : Opus 4.7 (quality)
  - Plain generation, plain fix               : Haiku 4.5 (cheap, plain LaTeX is easy)
  - Edit patch                                : Haiku 4.5 (small delta, cheap)
  - Edit regenerate fallback                  : reuses generate_latex, respects style
"""

import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

_client = Anthropic()

_MODEL_RICH = "claude-opus-4-7"
_MODEL_PLAIN = "claude-haiku-4-5"


# ---------- Rich style: colorful, boxed, diagrams ----------

_SYSTEM_PROMPT_RICH = r"""You are a worksheet-generating engine for teachers.
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


# ---------- Plain style: traditional exam paper, no color, no graphics ----------

_SYSTEM_PROMPT_PLAIN = r"""You are a worksheet-generating engine for teachers.
You output ONLY valid, compilable LaTeX — no markdown fences, no commentary,
no explanation before or after. Your entire response must be a complete LaTeX
document that compiles with pdflatex/latexmk.

Style: Traditional classroom exam paper. Clean, plain, black-and-white.
No colored boxes, no fancy borders, no decorative graphics. Serif type,
generous whitespace, numbered questions, clean section headings.

Always use exactly this preamble and structure:

\documentclass[12pt]{article}
\usepackage[a4paper,margin=2.5cm]{geometry}
\usepackage{amsmath, amssymb}
\usepackage{enumitem}
\setlength{\parindent}{0pt}
\pagestyle{empty}

\begin{document}

Layout template (adapt titles/subject/grade to the prompt):

\begin{center}
{\Large \bfseries [Worksheet Title]}\\[4pt]
{\normalsize [Grade / Subject]}\\[10pt]
\end{center}

\noindent
\textbf{Name:} \underline{\hspace{5cm}} \hfill \textbf{Date:} \underline{\hspace{3.5cm}}\\[6pt]
\textbf{Class:} \underline{\hspace{5cm}} \hfill \textbf{Marks:} \underline{\hspace{3.5cm}}\\[14pt]

\noindent \textit{Instructions:} [brief instruction line]

\vspace{12pt}

Then present questions. Use \section*{Part A: ...} for logical groupings.
Use enumerate for the actual questions:

\begin{enumerate}[label=\textbf{Q\arabic*.}, leftmargin=*, itemsep=16pt]
  \item Question text here.
  \item Another question.
\end{enumerate}

Rules:
- Numbered questions with clear spacing (itemsep=14pt or more).
- All math in proper LaTeX math mode.
- NO color, NO tcolorbox, NO tikz, NO pgfplots. Text and math only.
- Leave adequate blank space for student answers using \vspace or answer lines.
- Use \noindent \rule{...}{0.4pt} or \underline{\hspace{Ncm}} for answer lines.
- Keep it clean, formal, and printer-friendly.
- Output the FULL document from \documentclass to \end{document}.
"""


def _system_prompt_for(style: str) -> str:
    return _SYSTEM_PROMPT_PLAIN if style == "plain" else _SYSTEM_PROMPT_RICH


def _model_for(style: str) -> str:
    return _MODEL_PLAIN if style == "plain" else _MODEL_RICH


def generate_latex(prompt: str, style: str = "rich") -> str:
    """Send the teacher's request to Claude, return LaTeX source."""
    message = _client.messages.create(
        model=_model_for(style),
        max_tokens=4000,
        system=_system_prompt_for(style),
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(
        block.text for block in message.content if block.type == "text"
    ).strip()


def fix_latex(broken_latex: str, error_log: str, style: str = "rich") -> str:
    """Ask Claude to repair LaTeX that failed to compile."""
    repair_prompt = (
        "The following LaTeX failed to compile. Fix it so it compiles cleanly "
        "with pdflatex. Output ONLY the corrected full LaTeX document, no "
        "commentary.\n\n=== LATEX ===\n" + broken_latex +
        "\n\n=== COMPILER ERROR ===\n" + error_log
    )
    message = _client.messages.create(
        model=_model_for(style),
        max_tokens=4000,
        system=_system_prompt_for(style),
        messages=[{"role": "user", "content": repair_prompt}],
    )
    return "".join(
        block.text for block in message.content if block.type == "text"
    ).strip()


# ---------- Bulletproof fallback: minimal, no graphics, any style ----------

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
    """Generate a plain, graphics-free worksheet that is very likely to compile.
    Always uses the high-quality model — this is the last-resort safety net.
    """
    message = _client.messages.create(
        model=_MODEL_RICH,
        max_tokens=4000,
        system=_FALLBACK_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(
        block.text for block in message.content if block.type == "text"
    ).strip()


# ---------- Edit path: patch existing LaTeX ----------

_EDIT_SYSTEM_PROMPT = """You are a LaTeX worksheet editor. You will be given:
1. The existing worksheet as LaTeX
2. An edit instruction from a teacher

Modify the LaTeX to reflect the edit while keeping everything else intact.
Output ONLY the complete, updated LaTeX document — no explanations, no
markdown fences, nothing but the LaTeX from \\documentclass to \\end{document}.
Preserve the existing structure, style, and any diagrams the teacher didn't
ask to change. If the current worksheet is plain (no color, no boxes), stay
plain. If it uses colored questionboxes and TikZ, keep that style."""


def edit_latex(existing_latex: str, edit_instruction: str) -> str:
    """Ask Claude to modify existing worksheet LaTeX based on an instruction.
    Uses Haiku — patch edits are small deltas on existing content, cheap and reliable.
    """
    user_msg = (
        "EXISTING WORKSHEET LATEX:\n" + existing_latex +
        "\n\nEDIT INSTRUCTION:\n" + edit_instruction
    )
    message = _client.messages.create(
        model=_MODEL_PLAIN,
        max_tokens=4000,
        system=_EDIT_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    return "".join(
        block.text for block in message.content if block.type == "text"
    ).strip()


# ---------- Reference-based generation: study a PDF/image, produce similar ----------

_REFERENCE_SYSTEM_PROMPT_RICH = """You are a worksheet-generating engine for teachers.
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

_REFERENCE_SYSTEM_PROMPT_PLAIN = """You are a worksheet-generating engine for teachers.
You will receive:
1. A REFERENCE document (PDF or image) — an existing worksheet the teacher likes.
2. A NEW PROMPT describing the worksheet they want you to make.

Study the reference for STRUCTURE and PEDAGOGY only (question count, type,
topic, grade, difficulty). Do NOT copy its exact wording or visual style.

Output a NEW worksheet in traditional classroom exam paper style — plain
black-and-white, no color, no colored boxes, no TikZ. Serif type, numbered
questions, generous whitespace, clean section headings.

Use this preamble:

\\documentclass[12pt]{article}
\\usepackage[a4paper,margin=2.5cm]{geometry}
\\usepackage{amsmath, amssymb}
\\usepackage{enumitem}
\\setlength{\\parindent}{0pt}
\\pagestyle{empty}

Include a Name/Date/Class header, brief instructions, and numbered questions
using enumerate with itemsep=14pt or more.

Output ONLY compilable LaTeX, no commentary, no markdown fences.
"""


def generate_from_reference(
    file_bytes: bytes, media_type: str, prompt: str, style: str = "rich"
) -> str:
    """Generate worksheet LaTeX from a reference file plus a teacher prompt."""
    import base64 as _b64
    file_b64 = _b64.b64encode(file_bytes).decode("ascii")

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

    system_prompt = (
        _REFERENCE_SYSTEM_PROMPT_PLAIN if style == "plain"
        else _REFERENCE_SYSTEM_PROMPT_RICH
    )
    # Reference generation always uses the high-quality model — multimodal reasoning
    # (studying the reference's structure) is not something Haiku handles as reliably.
    model = _MODEL_RICH

    message = _client.messages.create(
        model=model,
        max_tokens=4000,
        system=system_prompt,
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


if __name__ == "__main__":
    sample = "A grade 5 worksheet on adding fractions, 4 questions, with a visual model."
    print(generate_latex(sample, style="rich"))