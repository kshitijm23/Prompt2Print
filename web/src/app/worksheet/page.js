"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Worksheet() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prompt = searchParams.get("p") || "";

  const [pdfUrl, setPdfUrl] = useState(null);
  const [status, setStatus] = useState("Preparing your worksheet.…");
  const [isGenerating, setIsGenerating] = useState(true);
  const [editNote, setEditNote] = useState("");

  // Kick off generation on mount using the prompt from the URL.
  useEffect(() => {
    if (!prompt) {
      router.push("/");
      return;
    }
    (async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        if (!response.ok) {
          setStatus("Couldn’t generate that one. Go back and try rephrasing.");
          return;
        }
        const blob = await response.blob();
        setPdfUrl(URL.createObjectURL(blob));
        setStatus("");
      } catch (err) {
        setStatus("Can’t reach the server. Is the backend running?");
      } finally {
        setIsGenerating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-[color:#FAFAF6]">
      {/* slim top bar */}
      <div className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
          >
            <span className="font-mono text-sm">← back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-slate-900 flex items-center justify-center">
              <span className="text-white font-display text-[11px] leading-none">P</span>
            </div>
            <span className="font-mono text-sm text-slate-900">prompt2.print</span>
          </div>
          <div>
            {pdfUrl && (
              <a
                href={pdfUrl}
                download="worksheet.pdf"
                className="font-mono text-sm text-slate-900 underline underline-offset-4 hover:text-slate-600 transition"
              >
                download pdf →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Layout B: split view */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* MAIN: PDF */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_0px_0px_rgba(0,0,0,0.03),_0px_20px_60px_-20px_rgba(15,23,42,0.08)] overflow-hidden">
            {isGenerating ? (
              <div className="h-[800px] flex flex-col items-center justify-center gap-4">
                <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
                <p className="font-mono text-sm text-slate-500">{status}</p>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-[800px] border-0 bg-white"
                title="Worksheet"
              />
            ) : (
              <div className="h-[800px] flex items-center justify-center">
                <p className="font-mono text-sm text-slate-500">{status}</p>
              </div>
            )}
          </div>

          {/* SIDEBAR: prompt + actions + edit placeholder */}
          <div className="flex flex-col gap-4">
            {/* The original prompt */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">your prompt</p>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">{prompt}</p>
            </div>

            {/* Edit-with-AI (coming soon) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-slate-300" />
                <p className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">edit with AI</p>
              </div>
              <Textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="e.g. make question 3 harder, add a word bank..."
                rows={3}
                className="text-sm resize-none"
                disabled
              />
              <Button
                disabled
                className="w-full mt-3 bg-slate-100 text-slate-400 cursor-not-allowed hover:bg-slate-100"
              >
                coming soon
              </Button>
            </div>

            {/* New worksheet CTA */}
            <Button
              onClick={() => router.push("/")}
              size="lg"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
            >
              + new worksheet
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
