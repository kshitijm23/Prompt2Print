FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        texlive-latex-recommended \
        texlive-latex-extra \
        texlive-pictures \
        texlive-science \
        texlive-fonts-recommended \
        latexmk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN useradd --create-home appuser
USER appuser

CMD ["python", "compile_latex.py"]
