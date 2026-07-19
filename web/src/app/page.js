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
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setUserEmail(userData.user.email);
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("credits_remaining")
          .eq("user_id", userData.user.id)
          .single();
        if (profile) setCredits(profile.credits_remaining);
      }
    })();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const [style, setStyle] = useState("rich"); // "rich" | "plain"
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
      const buffer = await referenceFile.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      sessionStorage.setItem("p2p-ref-b64", b64);
      sessionStorage.setItem("p2p-ref-name", referenceFile.name);
      sessionStorage.setItem("p2p-ref-type", referenceFile.type);
      sessionStorage.setItem("p2p-ref-size", String(referenceFile.size));
    } else {
      sessionStorage.removeItem("p2p-ref-b64");
      sessionStorage.removeItem("p2p-ref-name");
      sessionStorage.removeItem("p2p-ref-type");
      sessionStorage.removeItem("p2p-ref-size");
    }
    router.push(
      "/worksheet?p=" + encodeURIComponent(toUse) + "&style=" + style
    );
  }

  return (
    <main className="relative min-h-screen bg-[color:#FAFAF6] overflow-hidden">

      {/* top-right nav */}
      {userEmail && (
        <div className="absolute top-5 right-6 z-30 flex items-center gap-1">
          {credits !== null && (
            <button
              onClick={() => router.push("/pricing")}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs tracking-wider uppercase transition mr-1 ${
                credits === 0
                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  : credits <= 2
                  ? "bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              title="View pricing"
            >
              {credits} {credits === 1 ? "worksheet" : "worksheets"} left
            </button>
          )}
          <button
            onClick={() => router.push("/library")}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            Library
          </button>
          <button
            onClick={handleSignOut}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            Sign out
          </button>
          <div
            className="ml-1 h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-medium text-sm shadow-[0px_2px_8px_rgba(15,23,42,0.15)]"
            title={userEmail}
          >
            {userEmail.charAt(0).toUpperCase()}
          </div>
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
        <h1 className="font-display text-[52px] sm:text-[60px] leading-[0.95] tracking-tight text-slate-900">
          Beautiful worksheets,<br />
          <span className="italic text-slate-600">in seconds.</span>
        </h1>
        <p className="mt-8 text-slate-700 text-[17px] max-w-2xl leading-relaxed">
          Describe what you need. Get a polished, print-ready PDF with diagrams, boxes, and clean math — no formatting required.
        </p>
      </div>

      {/* Generator - hero card */}
      <div className="relative max-w-6xl mx-auto px-6 pb-24">
        <div
          className={`relative rounded-2xl border bg-white transition-all duration-300 ${focused ? "border-slate-400 shadow-[0_0px_0px_1px_rgba(15,23,42,0.06),_0px_40px_80px_-20px_rgba(15,23,42,0.15)]" : "border-slate-300 shadow-[0_1px_0px_0px_rgba(0,0,0,0.03),_0px_30px_70px_-15px_rgba(15,23,42,0.15)]"}`}
        >
          <div className="flex items-center justify-between px-8 pt-7 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <label className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">
                Your prompt
              </label>
            </div>
            <span className="font-mono text-xs text-slate-400">{prompt.length} chars</span>
          </div>

          <div className="px-8">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
              placeholder="e.g. a grade 6 worksheet on ratios with a real-world word problem and a bar-model diagram..."
              rows={5}
              className="!text-base sm:!text-lg lg:!text-xl leading-relaxed resize-none border-0 shadow-none focus-visible:ring-0 p-0 bg-transparent"
            />
          </div>

          <div className="px-8 mt-2">
            <p className="font-mono text-sm text-slate-400">
              tip: be specific — grade, topic, question count, visuals
            </p>
          </div>

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
                className="font-mono text-sm text-slate-500 hover:text-slate-900 underline underline-offset-4 transition"
              >
                + attach a reference (PDF or image, optional)
              </button>
            )}
          </div>

          {/* Style picker */}
          <div className="px-8 mt-5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] tracking-wider text-slate-500 uppercase">
                style
              </span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setStyle("rich")}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
                    style === "rich"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Colorful
                </button>
                <button
                  type="button"
                  onClick={() => setStyle("plain")}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
                    style === "plain"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Classic
                </button>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {style === "rich"
                  ? "diagrams, colored boxes, visual"
                  : "traditional exam paper, no color"}
              </span>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100" />

          <div className="flex flex-col gap-4 px-8 py-5">
            <Button
              onClick={generateWorksheet}
              size="lg"
              className="w-full h-[52px] text-lg font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              Generate worksheet →
            </Button>
            <p className="font-mono text-xs tracking-wider text-slate-400 uppercase">or start from an example</p>
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
          </div>
        </div>

        <p className="font-mono text-xs text-slate-300 text-center mt-16">
          Prompt2Print · generated with claude
        </p>
      </div>
    </main>
  );
}