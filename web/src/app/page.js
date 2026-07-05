"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const API_URL = "http://127.0.0.1:8000";

const EXAMPLES = [
  "Grade 5 worksheet on adding fractions with bar models",
  "Grade 8 worksheet on solving linear equations, 6 questions",
  "Grade 3 addition worksheet with colorful question boxes",
  "Grade 7 probability word problems, 5 questions",
];

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [focused, setFocused] = useState(false);

  function generateWorksheet() {
    const toUse = prompt.trim();
    if (!toUse) return;
    router.push("/worksheet?p=" + encodeURIComponent(toUse));
  }

  return (
    <main className="relative min-h-screen bg-[color:#FAFAF6] overflow-hidden">
      {/* soft hero gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(42,77,255,0.08), transparent 70%)",
        }}
      />

      {/* Hero */}
      <div className="relative max-w-6xl mx-auto px-6 pt-8 pb-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center">
            <span className="text-white font-display text-[22px] leading-none">P</span>
          </div>
          <div>
            <p className="font-display text-[32px] leading-none text-slate-900">
              Prompt2Print
            </p>
            <p className="font-mono text-[11px] tracking-wider text-slate-500 uppercase mt-1">
              AI worksheet generator for teachers
            </p>
          </div>
        </div>
        <h1 className="font-display text-[64px] sm:text-[80px] leading-[0.95] tracking-tight text-slate-900">
          Beautiful worksheets,<br />
          <span className="italic text-slate-600">in seconds.</span>
        </h1>
        <p className="mt-8 text-slate-700 text-[22px] max-w-2xl leading-relaxed">
          Describe what you need. Get a polished, print-ready PDF with diagrams, boxes, and clean math — no formatting required.
        </p>
      </div>

      {/* Generator - hero card */}
      <div className="relative max-w-6xl mx-auto px-6 pb-24">
        <div
          className={`relative rounded-2xl border bg-white transition-all duration-300 ${focused ? "border-slate-400 shadow-[0_0px_0px_1px_rgba(15,23,42,0.06),_0px_40px_80px_-20px_rgba(15,23,42,0.15)]" : "border-slate-200 shadow-[0_1px_0px_0px_rgba(0,0,0,0.03),_0px_20px_60px_-20px_rgba(15,23,42,0.08)]"}`}
        >
          {/* Card header row */}
          <div className="flex items-center justify-between px-8 pt-7 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <label className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">
                Your prompt
              </label>
            </div>
            <span className="font-mono text-xs text-slate-400">{prompt.length} chars</span>
          </div>

          {/* Textarea */}
          <div className="px-8">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="e.g. a grade 6 worksheet on ratios with a real-world word problem and a bar-model diagram..."
              rows={5}
              className="text-[17px] leading-relaxed resize-none border-0 shadow-none focus-visible:ring-0 p-0 bg-transparent"
            />
          </div>

          {/* Helper tip */}
          <div className="px-8 mt-2">
            <p className="font-mono text-xs text-slate-400">
              tip: be specific — grade, topic, question count, visuals
            </p>
          </div>

          {/* Divider */}
          <div className="mt-6 border-t border-slate-100" />

          {/* row: examples + generate btn */}
          <div className="flex flex-col gap-4 px-8 py-5">
            <p className="font-mono text-xs tracking-wider text-slate-400 uppercase">Try one</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="text-sm px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 transition"
                >
                  {ex}
                </button>
              ))}
            </div>
            <Button
              onClick={generateWorksheet}
              disabled={isGenerating}
              size="lg"
              className="w-full h-[52px] text-base font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              {isGenerating ? "Generating…" : "Generate worksheet →"}
            </Button>
            {status && (
              <p className="text-center text-slate-500 text-sm font-mono">{status}</p>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-slate-300" />
              <p className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">Preview</p>
            </div>
            {pdfUrl && (
              <a
                href={pdfUrl}
                download="worksheet.pdf"
                className="font-mono text-xs text-slate-900 underline underline-offset-4 hover:text-slate-600 transition"
              >
                download pdf →
              </a>
            )}
          </div>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-[700px] border border-slate-200 rounded-lg bg-white"
              title="Worksheet preview"
            />
          ) : (
            <div className="h-[360px] border border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-[color:#FEFEFA]">
              <p className="font-mono text-sm text-slate-400">your worksheet will appear here</p>
            </div>
          )}
        </div>

        {/* small footer */}
        <p className="font-mono text-xs text-slate-300 text-center mt-16">
          prompt2.print · generated with claude
        </p>
      </div>
    </main>
  );
}
