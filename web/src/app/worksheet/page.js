"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { Textarea } from "@/components/ui/textarea";

const API_URL = "http://127.0.0.1:8000";

export default function Worksheet() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prompt = searchParams.get("p") || "";

  const [pdfUrl, setPdfUrl] = useState(null);
  const [latex, setLatex] = useState("");
  const [status, setStatus] = useState("Preparing your worksheet.…");
  const [isGenerating, setIsGenerating] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [editError, setEditError] = useState("");
  const [saveStatus, setSaveStatus] = useState(""); // "" | "saving" | "saved" | "error"

  const supabase = createClient();

  function autoTitle(promptText) {
    // Take first 60 chars, remove newlines, trim, add ellipsis if truncated
    const cleaned = promptText.replace(/\s+/g, " ").trim();
    if (cleaned.length <= 60) return cleaned;
    return cleaned.slice(0, 60).trim() + "…";
  }

  async function saveToLibrary() {
    if (!latex || !prompt) return;
    setSaveStatus("saving");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaveStatus("error");
        return;
      }
      const { error } = await supabase.from("worksheets").insert({
        user_id: user.id,
        title: autoTitle(prompt),
        prompt,
        latex,
      });
      if (error) throw error;
      setSaveStatus("saved");
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error");
    }
  }

  async function consumePdfResponse(response) {
    const b64 = response.headers.get("X-Latex-B64");
    if (b64) {
      try {
        const decoded = decodeURIComponent(
          atob(b64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        setLatex(decoded);
      } catch {
        // if decoding fails, just skip; PDF still works
      }
    }
    const blob = await response.blob();
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
  }

  // Initial generation
  useEffect(() => {
    if (!prompt) {
      router.push("/");
      return;
    }
    (async () => {
      try {
        const refB64 = typeof window !== "undefined" ? sessionStorage.getItem("p2p-ref-b64") : null;
        const refName = typeof window !== "undefined" ? sessionStorage.getItem("p2p-ref-name") : null;
        const refType = typeof window !== "undefined" ? sessionStorage.getItem("p2p-ref-type") : null;

        let response;
        if (refB64 && refName) {
          // Reference-based generation via multipart form
          const bin = atob(refB64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const blob = new Blob([bytes], { type: refType || "application/pdf" });
          const form = new FormData();
          form.append("prompt", prompt);
          form.append("reference", blob, refName);

          setStatus("Reading your reference and generating...");
          response = await fetch(`${API_URL}/generate-from-reference`, {
            method: "POST",
            body: form,
          });

          // Clear the stashed reference so it doesn't persist
          sessionStorage.removeItem("p2p-ref-b64");
          sessionStorage.removeItem("p2p-ref-name");
          sessionStorage.removeItem("p2p-ref-type");
        } else {
          response = await fetch(`${API_URL}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
          });
        }
        if (!response.ok) {
          setStatus("Couldn’t generate that one. Go back and try rephrasing.");
          return;
        }
        await consumePdfResponse(response);
        setStatus("");
      } catch (err) {
        setStatus("Can’t reach the server. Is the backend running?");
      } finally {
        setIsGenerating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyEdit() {
    const instruction = editNote.trim();
    if (!instruction || !latex) return;
    setIsEditing(true);
    setEditError("");
    try {
      const response = await fetch(`${API_URL}/edit-worksheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex, instruction }),
      });
      if (!response.ok) {
        setEditError("Couldn’t apply that edit. Try rephrasing.");
        return;
      }
      await consumePdfResponse(response);
      setEditNote("");
    } catch {
      setEditError("Can’t reach the server.");
    } finally {
      setIsEditing(false);
    }
  }

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

      {/* Layout B */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* MAIN: PDF */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_0px_0px_rgba(0,0,0,0.03),_0px_20px_60px_-20px_rgba(15,23,42,0.08)] overflow-hidden relative">
            {isGenerating ? (
              <div className="h-[800px] flex flex-col items-center justify-center gap-4">
                <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
                <p className="font-mono text-sm text-slate-500">{status}</p>
              </div>
            ) : pdfUrl ? (
              <>
                <iframe
                  src={pdfUrl}
                  className="w-full h-[800px] border-0 bg-white"
                  title="Worksheet"
                />
                {isEditing && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                    <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
                    <p className="font-mono text-sm text-slate-600">applying your edit…</p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-[800px] flex items-center justify-center">
                <p className="font-mono text-sm text-slate-500">{status}</p>
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <div className="flex flex-col gap-4">
            {/* The original prompt */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">your prompt</p>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">{prompt}</p>
            </div>

            {/* Edit-with-AI */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <p className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">edit with AI</p>
              </div>
              <Textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="e.g. make question 3 harder, add a word bank"
                rows={3}
                disabled={isEditing || isGenerating || !latex}
                className="text-sm resize-none"
              />
              <Button
                onClick={applyEdit}
                disabled={isEditing || isGenerating || !latex || !editNote.trim()}
                className="w-full mt-3 bg-slate-900 hover:bg-slate-800 text-white"
              >
                {isEditing ? "applying…" : "apply edit →"}
              </Button>
              {editError && (
                <p className="mt-2 font-mono text-xs text-red-500">{editError}</p>
              )}
            </div>

                        {/* save-card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-slate-300" />
                <p className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">save</p>
              </div>
              <Button
                onClick={saveToLibrary}
                disabled={!latex || saveStatus === "saving" || saveStatus === "saved"}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-200 disabled:text-slate-400"
              >
                {saveStatus === "saving" && "saving…"}
                {saveStatus === "saved" && "saved to library ✓"}
                {saveStatus === "error" && "couldn’t save — try again"}
                {saveStatus === "" && "save to library"}
              </Button>
            </div>

            {/* New worksheet CTA */}
            <Button
              onClick={() => router.push("/")}
              size="lg"
              className="w-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-50"
            >
              + new worksheet
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
