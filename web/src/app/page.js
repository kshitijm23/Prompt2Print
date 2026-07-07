"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const EXAMPLES = [
  "Grade 5 worksheet on adding fractions with bar models",
  "Grade 8 worksheet on solving linear equations, 6 questions",
  "Grade 3 addition worksheet with colorful question boxes",
  "Grade 7 probability word problems, 5 questions",
];

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserEmail(data.user.email);
    });
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }
  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const [referenceFile, setReferenceFile] = useState(null);
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) setReferenceFile(file);
  }

  async function generateWorksheet() {
    const toUse = prompt.trim();
    if (!toUse) return;

    if (referenceFile) {
      // Store the file in sessionStorage as base64 for the worksheet page to pick up
      const buffer = await referenceFile.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      sessionStorage.setItem("p2p-ref-b64", b64);
      sessionStorage.setItem("p2p-ref-name", referenceFile.name);
      sessionStorage.setItem("p2p-ref-type", referenceFile.type);
    } else {
      sessionStorage.removeItem("p2p-ref-b64");
      sessionStorage.removeItem("p2p-ref-name");
      sessionStorage.removeItem("p2p-ref-type");
    }
    router.push("/worksheet?p=" + encodeURIComponent(toUse));
  }

  return (
    <main className="relative min-h-screen bg-[color:#FAFAF6] overflow-hidden">


      {/* account-menu */}
      {userEmail && (
        <div className="absolute top-5 right-6 z-30" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-medium text-sm shadow-[0px_2px_8px_rgba(15,23,42,0.15)] hover:shadow-[0px_4px_16px_rgba(15,23,42,0.2)] transition"
            aria-label="Account menu"
          >
            {userEmail.charAt(0).toUpperCase()}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-xl border border-slate-200 bg-white shadow-[0px_10px_40px_rgba(15,23,42,0.15)] overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Signed in as</p>
                <p className="text-sm text-slate-900 truncate mt-0.5">{userEmail}</p>
              </div>
              <button
                onClick={() => router.push("/library")}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
              >
                Library
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition border-t border-slate-100"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}

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

          {/* Reference upload row */}
          <div className="px-8 mt-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            {referenceFile ? (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 w-fit">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="font-mono text-xs text-slate-700">
                  reference: {referenceFile.name}
                </span>
                <button
                  onClick={() => {
                    setReferenceFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-slate-400 hover:text-slate-900 text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="font-mono text-xs text-slate-500 hover:text-slate-900 underline underline-offset-4 transition"
              >
                + attach a reference (PDF or image, optional)
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="mt-5 border-t border-slate-100" />

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
              size="lg"
              className="w-full h-[52px] text-base font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              Generate worksheet →
            </Button>
          </div>
        </div>

        {/* small footer */}
        <p className="font-mono text-xs text-slate-300 text-center mt-16">
          prompt2.print · generated with claude
        </p>
      </div>
    </main>
  );
}
