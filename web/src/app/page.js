"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Suspense } from "react";
import { startTour } from "@/lib/tour";

const EXAMPLES = [
  "Grade 5 fractions review — 8 mixed problems for a Friday quiz",
  "Grade 7 pre-algebra homework, 10 problems, mix of solving equations and word problems",
  "Grade 3 addition and subtraction with regrouping, 15 problems, kid-friendly formatting",
  "Middle school probability worksheet with real-world scenarios (dice, cards, weather)",
];

const TEMPLATES = [
  { key: "custom", label: "Custom", hint: "free-form — describe anything" },
  { key: "math_computation", label: "Math · Computation", hint: "procedural practice, show your work" },
  { key: "math_word_problems", label: "Math · Word Problems", hint: "real-world contexts, with units" },
  { key: "reading_comprehension", label: "Reading Comp.", hint: "short passage + questions" },
  { key: "science", label: "Science", hint: "concepts, definitions, diagrams" },
  { key: "vocabulary", label: "Vocabulary", hint: "word bank + mixed practice" },
  { key: "fill_in_blank", label: "Fill-in-the-blank", hint: "sentences with blanks" },
];

const PACK_LABELS = {
  starter: "20 worksheets",
  classroom: "100 worksheets",
};

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState(null);
  const [credits, setCredits] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const tourRef = useRef(null);

  useEffect(() => {
    if (searchParams.get("purchase") === "success") {
      const pack = searchParams.get("pack") || "";
      const label = PACK_LABELS[pack] || "worksheets";
      setToastMessage(`🎉 Success — ${label} added to your account`);
      setShowToast(true);
      window.history.replaceState({}, "", "/");
      const t = setTimeout(() => setShowToast(false), 6000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest("[data-user-menu]")) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markTourSeen(uid) {
    if (!uid) return;
    try {
      await supabase.from("user_profiles").update({ has_seen_tour: true }).eq("user_id", uid);
    } catch (err) {
      console.error("markTourSeen failed:", err);
    }
  }

  function launchTour(uid) {
    if (tourRef.current) {
      try { tourRef.current.cancel(); } catch {}
    }
    tourRef.current = startTour({
      onEnd: () => {
        tourRef.current = null;
        markTourSeen(uid);
      },
    });
  }

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setUserEmail(userData.user.email);
      setUserId(userData.user.id);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("credits_remaining, has_seen_tour")
        .eq("user_id", userData.user.id)
        .single();
      if (profile) {
        setCredits(profile.credits_remaining);
        if (!profile.has_seen_tour) {
          setTimeout(() => launchTour(userData.user.id), 400);
        }
      }
    })();

    function onVisible() {
      if (document.visibilityState === "visible") {
        supabase.auth.getUser().then(({ data: userData }) => {
          if (!userData.user) return;
          supabase
            .from("user_profiles")
            .select("credits_remaining")
            .eq("user_id", userData.user.id)
            .single()
            .then(({ data: profile }) => {
              if (profile) setCredits(profile.credits_remaining);
            });
        });
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const [style, setStyle] = useState("rich");
  const [template, setTemplate] = useState("custom");
  const [answerKey, setAnswerKey] = useState(false);
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

    const params = new URLSearchParams({ p: toUse, style, t: template });
    if (answerKey) params.set("ak", "1");
    router.push("/worksheet?" + params.toString());
  }

  const activeTemplate = TEMPLATES.find((t) => t.key === template) || TEMPLATES[0];

  return (
    <main className="relative min-h-screen bg-[color:#FAFAF6] overflow-hidden">

      {showToast && (
        <div className="fixed top-4 left-2 right-2 sm:top-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 animate-[slideDown_0.3s_ease-out]">
          <div className="flex items-center gap-3 px-4 sm:px-5 py-3 bg-emerald-50 border border-emerald-200 rounded-xl shadow-[0px_20px_40px_-10px_rgba(15,23,42,0.15)] max-w-full">
            <span className="font-mono text-xs sm:text-sm text-emerald-800 truncate">{toastMessage}</span>
            <button
              onClick={() => setShowToast(false)}
              className="ml-auto text-emerald-600 hover:text-emerald-900 text-lg leading-none flex-shrink-0"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {userEmail && (
        <div className="absolute top-3 right-3 sm:top-5 sm:right-6 z-30 flex items-center gap-1">
          {credits !== null && (
            <button
              data-tour="credits"
              onClick={() => router.push("/pricing")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-mono text-[10px] sm:text-xs tracking-wider uppercase transition ${
                credits === 0
                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  : credits <= 2
                  ? "bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              title="View pricing"
            >
              {credits} <span className="hidden sm:inline">{credits === 1 ? "worksheet" : "worksheets"} </span>left
            </button>
          )}

          {/* Desktop-only inline nav items */}
          <button
            onClick={() => launchTour(userId)}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Show me around"
            aria-label="Show me around"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => router.push("/library")}
            className="hidden sm:inline-flex px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            Library
          </button>
          <button
            onClick={handleSignOut}
            className="hidden sm:inline-flex px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            Sign out
          </button>

          {/* Avatar — always visible. On mobile it opens a dropdown menu. */}
          <div className="relative ml-1" data-user-menu>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-medium text-sm shadow-[0px_2px_8px_rgba(15,23,42,0.15)] hover:bg-slate-800 transition"
              title={userEmail}
              aria-label="Account menu"
            >
              {userEmail.charAt(0).toUpperCase()}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 w-52 bg-white border border-slate-200 rounded-xl shadow-[0_20px_40px_-10px_rgba(15,23,42,0.2)] py-1 z-50">
                <div className="px-4 pt-2 pb-1 border-b border-slate-100 mb-1">
                  <p className="font-mono text-[10px] tracking-wider text-slate-400 uppercase">Signed in as</p>
                  <p className="text-xs text-slate-700 truncate">{userEmail}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); router.push("/library"); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 sm:hidden"
                >
                  Library
                </button>
                <button
                  onClick={() => { setMenuOpen(false); router.push("/pricing"); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Pricing
                </button>
                <button
                  onClick={() => { setMenuOpen(false); launchTour(userId); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Show me around
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => { setMenuOpen(false); handleSignOut(); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(42,77,255,0.08), transparent 70%)",
        }}
      />

      {/* Hero — added extra top padding on mobile to clear the absolute-positioned nav */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-8 pb-6 sm:pb-8">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-display text-[20px] sm:text-[22px] leading-none">P</span>
          </div>
          <div className="min-w-0">
            <p className="font-display text-[26px] sm:text-[32px] leading-none text-slate-900">
              Prompt2Print
            </p>
            <p className="font-mono text-[10px] sm:text-[11px] tracking-wider text-slate-500 uppercase mt-1">
              built by a teacher, for teachers
            </p>
          </div>
        </div>
        <h1 className="font-display text-[36px] sm:text-[52px] lg:text-[60px] leading-[0.95] tracking-tight text-slate-900">
          Get your Sundays<br />
          <span className="italic text-slate-600">back.</span>
        </h1>
        <p className="mt-6 sm:mt-8 text-slate-700 text-[15px] sm:text-[17px] max-w-2xl leading-relaxed">
          Describe the worksheet you'd normally spend an hour making. Get a print-ready PDF in under a minute — with an answer key if you need one.
        </p>
      </div>

      {/* Generator card */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-10 sm:pb-12">
        <div
          className={`relative rounded-2xl border bg-white transition-all duration-300 ${focused ? "border-slate-400 shadow-[0_0px_0px_1px_rgba(15,23,42,0.06),_0px_40px_80px_-20px_rgba(15,23,42,0.15)]" : "border-slate-300 shadow-[0_1px_0px_0px_rgba(0,0,0,0.03),_0px_30px_70px_-15px_rgba(15,23,42,0.15)]"}`}
        >
          <div className="flex items-center justify-between px-5 sm:px-8 pt-5 sm:pt-7 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <label className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">
                Your prompt
              </label>
            </div>
            <span className="font-mono text-xs text-slate-400">{prompt.length} chars</span>
          </div>

          <div data-tour="prompt" className="px-5 sm:px-8">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
              placeholder="e.g. Grade 6 ratios review — 8 problems mixing tables, tape diagrams, and real-world questions"
              rows={5}
              className="!text-[15px] sm:!text-lg lg:!text-xl leading-relaxed resize-none border-0 shadow-none focus-visible:ring-0 p-0 bg-transparent"
            />
          </div>

          <div className="px-5 sm:px-8 mt-2">
            <p className="font-mono text-xs sm:text-sm text-slate-400">
              tip: be specific — grade, topic, question count, what you want it to feel like
            </p>
          </div>

          <div data-tour="templates" className="px-5 sm:px-8 mt-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
              <span className="font-mono text-[11px] tracking-wider text-slate-500 uppercase">
                template
              </span>
              <span className="font-mono text-xs text-slate-400">
                {activeTemplate.hint}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTemplate(t.key)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition ${
                    template === t.key
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 sm:px-8 mt-5">
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            {referenceFile ? (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 w-fit max-w-full">
                <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="font-mono text-xs text-slate-700 truncate">
                  reference: {referenceFile.name}
                </span>
                <button
                  onClick={() => {
                    setReferenceFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-slate-400 hover:text-slate-900 text-xs flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="font-mono text-xs sm:text-sm text-slate-500 hover:text-slate-900 underline underline-offset-4 transition"
              >
                + attach a reference (PDF or image, optional)
              </button>
            )}
          </div>

          <div className="px-5 sm:px-8 mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div data-tour="style" className="flex items-center gap-3">
              <span className="font-mono text-[11px] tracking-wider text-slate-500 uppercase">
                style
              </span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setStyle("rich")}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition ${
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
                  className={`px-3 sm:px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition ${
                    style === "plain"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Classic
                </button>
              </div>
            </div>

            <label
              data-tour="answer-key"
              className="inline-flex items-center gap-2 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={answerKey}
                onChange={(e) => setAnswerKey(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-xs sm:text-sm text-slate-700">Include answer key</span>
            </label>
          </div>

          <div className="mt-5 border-t border-slate-100" />

          <div className="flex flex-col gap-4 px-5 sm:px-8 py-4 sm:py-5">
            <Button
              onClick={generateWorksheet}
              size="lg"
              className="w-full h-[48px] sm:h-[52px] text-base sm:text-lg font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              Generate worksheet →
            </Button>
            <p className="font-mono text-[10px] sm:text-xs tracking-wider text-slate-400 uppercase">or start from an example</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="text-xs sm:text-sm text-left px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 transition"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="font-mono text-[10px] sm:text-xs text-slate-400 text-center mt-10 sm:mt-16 px-2">
          Built by a 7th-grade math teacher, for teachers who are tired of building worksheets at 10pm on a Sunday.
        </p>

        {/* Footer */}
        <footer className="mt-10 sm:mt-12 pb-8 border-t border-slate-200 pt-6 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 font-mono text-xs text-slate-400">
          <span>© 2026 Prompt2Print</span>
          <button
            onClick={() => router.push("/terms")}
            className="hover:text-slate-700 transition underline underline-offset-2"
          >
            Terms
          </button>
          <button
            onClick={() => router.push("/privacy")}
            className="hover:text-slate-700 transition underline underline-offset-2"
          >
            Privacy
          </button>
          <a
            href="mailto:kshitijmisc@gmail.com"
            className="hover:text-slate-700 transition underline underline-offset-2"
          >
            Contact
          </a>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }

        /* Shepherd.js tour — Prompt2Print theme */
        .p2p-shepherd.shepherd-element {
          border-radius: 14px;
          border: 1px solid rgb(226 232 240);
          background: white;
          box-shadow: 0 30px 80px -20px rgba(15, 23, 42, 0.25);
          max-width: min(400px, calc(100vw - 32px));
          font-family: inherit;
        }
        .p2p-shepherd .shepherd-header {
          background: white;
          border-radius: 14px 14px 0 0;
          padding: 18px 22px 6px;
        }
        .p2p-shepherd .shepherd-title {
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: 22px;
          color: rgb(15 23 42);
          font-weight: 400;
          line-height: 1.2;
        }
        .p2p-shepherd .shepherd-text {
          padding: 6px 22px 18px;
          color: rgb(51 65 85);
          font-size: 14px;
          line-height: 1.6;
        }
        .p2p-shepherd .shepherd-text p {
          margin: 0;
        }
        .p2p-shepherd .shepherd-footer {
          padding: 12px 18px 14px;
          border-top: 1px solid rgb(241 245 249);
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .p2p-shepherd .shepherd-button {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          transition: background 0.15s, color 0.15s;
          border: none;
          cursor: pointer;
          margin: 0;
        }
        .p2p-shepherd-btn-primary {
          background: rgb(15 23 42);
          color: white;
        }
        .p2p-shepherd-btn-primary:hover {
          background: rgb(30 41 59);
        }
        .p2p-shepherd-btn-secondary {
          background: transparent;
          color: rgb(100 116 139);
        }
        .p2p-shepherd-btn-secondary:hover {
          color: rgb(15 23 42);
          background: rgb(241 245 249);
        }
        .p2p-shepherd .shepherd-cancel-icon {
          color: rgb(148 163 184);
          font-size: 20px;
        }
        .p2p-shepherd .shepherd-cancel-icon:hover {
          color: rgb(15 23 42);
        }
        .p2p-shepherd .shepherd-arrow:before {
          background: white;
          border: 1px solid rgb(226 232 240);
        }
        .shepherd-modal-overlay-container {
          fill: rgba(15, 23, 42, 0.55);
        }
      `}</style>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[color:#FAFAF6]" />}>
      <HomeInner />
    </Suspense>
  );
}