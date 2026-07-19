"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { Textarea } from "@/components/ui/textarea";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ------- localStorage cache helpers -------
const CACHE_KEY = "p2p-cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 5;

function makeCacheKey(prompt, refName, refSize, style) {
  return `${(prompt || "").trim()}||${refName || "noref"}||${refSize || "0"}||${style || "rich"}`;
}

function cacheLookup(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    const now = Date.now();
    const hit = arr.find(
      (e) => e.key === key && now - e.timestamp < CACHE_TTL_MS
    );
    return hit || null;
  } catch {
    return null;
  }
}

function cacheStore(key, latex, pdfB64) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    let arr = raw ? JSON.parse(raw) : [];
    arr = arr.filter((e) => e.key !== key);
    arr.unshift({ key, latex, pdfB64, timestamp: Date.now() });
    arr = arr.slice(0, CACHE_MAX_ENTRIES);
    localStorage.setItem(CACHE_KEY, JSON.stringify(arr));
  } catch {}
}

async function blobToBase64(blob) {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBlob(b64, type = "application/pdf") {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

function WorksheetInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prompt = searchParams.get("p") || "";
  const savedId = searchParams.get("id") || "";
  const style = (searchParams.get("style") || "rich").toLowerCase() === "plain" ? "plain" : "rich";
  const [displayPrompt, setDisplayPrompt] = useState(prompt);

  const [pdfUrl, setPdfUrl] = useState(null);
  const [latex, setLatex] = useState("");
  const [status, setStatus] = useState("Preparing your worksheet.…");
  const [isGenerating, setIsGenerating] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [editError, setEditError] = useState("");
  const [editMode, setEditMode] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [savedRowId, setSavedRowId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [credits, setCredits] = useState(null);
  const [outOfCredits, setOutOfCredits] = useState(false);

  const hasStartedRef = useRef(false);

  const supabase = createClient();

  async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      router.push("/login");
      return null;
    }
    return { Authorization: `Bearer ${session.access_token}` };
  }

  async function refetchCredits() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();
    if (profile) setCredits(profile.credits_remaining);
  }

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

  function autoTitle(promptText) {
    const cleaned = promptText.replace(/\s+/g, " ").trim();
    if (cleaned.length <= 60) return cleaned;
    return cleaned.slice(0, 60).trim() + "…";
  }

  async function saveToLibrary() {
    if (!latex) return;
    const promptForSave = displayPrompt || prompt;
    if (!promptForSave) return;
    setSaveStatus("saving");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaveStatus("error");
        return;
      }
      if (savedRowId) {
        const { error } = await supabase
          .from("worksheets")
          .update({ latex, prompt: promptForSave })
          .eq("id", savedRowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("worksheets")
          .insert({
            user_id: user.id,
            title: autoTitle(promptForSave),
            prompt: promptForSave,
            latex,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (data?.id) setSavedRowId(data.id);
      }
      setSaveStatus("saved");
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error");
    }
  }

  async function consumePdfResponse(response) {
    let decodedLatex = "";
    const b64 = response.headers.get("X-Latex-B64");
    if (b64) {
      try {
        decodedLatex = decodeURIComponent(
          atob(b64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        setLatex(decodedLatex);
        if (savedRowId) {
          setSaveStatus("dirty");
        }
      } catch {}
    }
    const blob = await response.blob();
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    return { latex: decodedLatex, blob };
  }

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    if (!prompt && !savedId) {
      router.push("/");
      return;
    }
    (async () => {
      // Library load path
      if (savedId) {
        try {
          const { data, error } = await supabase
            .from("worksheets")
            .select("prompt, latex")
            .eq("id", savedId)
            .single();
          if (error) throw error;
          setLatex(data.latex);
          setDisplayPrompt(data.prompt);
          setSavedRowId(savedId);

          const authHeaders = await getAuthHeaders();
          if (!authHeaders) return;

          const compileResp = await fetch(`${API_URL}/compile`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ latex: data.latex }),
          });
          if (!compileResp.ok) {
            setStatus("Couldn't compile this saved worksheet.");
            return;
          }
          const blob = await compileResp.blob();
          setPdfUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
          });
          setStatus("");
          setSaveStatus("saved");
        } catch (err) {
          console.error(err);
          setStatus("Couldn't load this saved worksheet.");
        } finally {
          setIsGenerating(false);
        }
        return;
      }

      // Cache lookup — includes style so rich/plain of the same prompt cache separately
      const refNameForKey =
        typeof window !== "undefined" ? sessionStorage.getItem("p2p-ref-name") : "";
      const refSizeForKey =
        typeof window !== "undefined" ? sessionStorage.getItem("p2p-ref-size") : "";
      const key = makeCacheKey(prompt, refNameForKey, refSizeForKey, style);
      const cached = cacheLookup(key);
      if (cached) {
        setLatex(cached.latex);
        const blob = base64ToBlob(cached.pdfB64);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setStatus("");
        setIsGenerating(false);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("p2p-ref-b64");
          sessionStorage.removeItem("p2p-ref-name");
          sessionStorage.removeItem("p2p-ref-type");
          sessionStorage.removeItem("p2p-ref-size");
        }
        return;
      }

      try {
        const authHeaders = await getAuthHeaders();
        if (!authHeaders) return;

        const refB64 =
          typeof window !== "undefined" ? sessionStorage.getItem("p2p-ref-b64") : null;
        const refName =
          typeof window !== "undefined" ? sessionStorage.getItem("p2p-ref-name") : null;
        const refType =
          typeof window !== "undefined" ? sessionStorage.getItem("p2p-ref-type") : null;

        let response;
        if (refB64 && refName) {
          const bin = atob(refB64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const blob = new Blob([bytes], { type: refType || "application/pdf" });
          const form = new FormData();
          form.append("prompt", prompt);
          form.append("reference", blob, refName);
          form.append("style", style);

          setStatus("Reading your reference and generating...");
          response = await fetch(`${API_URL}/generate-from-reference`, {
            method: "POST",
            headers: { ...authHeaders },
            body: form,
          });

          sessionStorage.removeItem("p2p-ref-b64");
          sessionStorage.removeItem("p2p-ref-name");
          sessionStorage.removeItem("p2p-ref-type");
          sessionStorage.removeItem("p2p-ref-size");
        } else {
          response = await fetch(`${API_URL}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ prompt, style }),
          });
        }
        if (!response.ok) {
          if (response.status === 402) {
            setOutOfCredits(true);
            await refetchCredits();
            return;
          }
          setStatus("Couldn't generate that one. Go back and try rephrasing.");
          return;
        }
        const { latex: gotLatex, blob: gotBlob } = await consumePdfResponse(response);
        setStatus("");
        await refetchCredits();

        if (gotLatex && gotBlob) {
          try {
            const pdfB64 = await blobToBase64(gotBlob);
            cacheStore(key, gotLatex, pdfB64);
          } catch {}
        }
      } catch (err) {
        setStatus("Can't reach the server. Is the backend running?");
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
    setEditMode("");
    try {
      const authHeaders = await getAuthHeaders();
      if (!authHeaders) return;

      const response = await fetch(`${API_URL}/edit-worksheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          latex,
          instruction,
          prompt: displayPrompt || prompt,
          style,
        }),
      });
      if (!response.ok) {
        setEditError("Couldn't apply that edit — the underlying document couldn't be modified cleanly. Try a smaller change (e.g. one question at a time), or use \"+ new worksheet\" to start over. Your saved copy in the library is unchanged.");
        return;
      }
      const { latex: editedLatex, blob: editedBlob } = await consumePdfResponse(response);
      const mode = response.headers.get("X-Edit-Mode") || "";
      setEditMode(mode);
      setEditNote("");

      if (!savedId && editedLatex && editedBlob) {
        try {
          const refNameForKey =
            typeof window !== "undefined" ? sessionStorage.getItem("p2p-ref-name") : "";
          const refSizeForKey =
            typeof window !== "undefined" ? sessionStorage.getItem("p2p-ref-size") : "";
          const key = makeCacheKey(prompt, refNameForKey, refSizeForKey, style);
          const pdfB64 = await blobToBase64(editedBlob);
          cacheStore(key, editedLatex, pdfB64);
        } catch {}
      }
    } catch {
      setEditError("Can't reach the server. Is the backend running?");
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
            <span className="font-mono text-sm text-slate-900">Prompt2Print</span>
            <span className="ml-2 font-mono text-[10px] tracking-wider text-slate-400 uppercase">
              · {style === "plain" ? "classic" : "colorful"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {pdfUrl && (
              <a
                href={pdfUrl}
                download="worksheet.pdf"
                className="font-mono text-sm text-slate-900 underline underline-offset-4 hover:text-slate-600 transition mr-2"
              >
                download pdf →
              </a>
            )}
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
                {credits} left
              </button>
            )}
            {userEmail && (
              <>
                <button
                  onClick={() => router.push("/library")}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  Library
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  Sign out
                </button>
                <div
                  className="ml-1 h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-medium text-xs shadow-[0px_2px_8px_rgba(15,23,42,0.15)]"
                  title={userEmail}
                >
                  {userEmail.charAt(0).toUpperCase()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Layout B */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_0px_0px_rgba(0,0,0,0.03),_0px_20px_60px_-20px_rgba(15,23,42,0.08)] overflow-hidden relative">
            {outOfCredits ? (
              <div className="h-[800px] flex flex-col items-center justify-center px-8 text-center">
                <div className="h-14 w-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-5">
                  <svg className="h-7 w-7 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-mono text-[11px] tracking-wider text-rose-700 uppercase mb-2">
                  Out of worksheets
                </p>
                <h2 className="font-display text-[32px] leading-tight text-slate-900 mb-3">
                  You've used all your worksheets.
                </h2>
                <p className="text-slate-600 text-[15px] max-w-md leading-relaxed mb-8">
                  Upgrade to keep generating. Edits stay free — you can still tweak the ones you've made.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => router.push("/pricing")}
                    size="lg"
                    className="bg-slate-900 hover:bg-slate-800 text-white px-6"
                  >
                    View pricing →
                  </Button>
                  <Button
                    onClick={() => router.push("/library")}
                    size="lg"
                    className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 px-6"
                  >
                    Go to library
                  </Button>
                </div>
              </div>
            ) : isGenerating ? (
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
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">your prompt</p>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">{displayPrompt}</p>
            </div>

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
                disabled={isEditing || isGenerating || !latex || outOfCredits}
                className="text-sm resize-none"
              />
              <Button
                onClick={applyEdit}
                disabled={isEditing || isGenerating || !latex || !editNote.trim() || outOfCredits}
                className="w-full mt-3 bg-slate-900 hover:bg-slate-800 text-white"
              >
                {isEditing ? "applying…" : "apply edit →"}
              </Button>
              {editError && (
                <p className="mt-2 font-mono text-xs text-red-500">{editError}</p>
              )}
              {!editError && editMode === "regenerated" && (
                <p className="mt-2 font-mono text-[11px] tracking-wider text-emerald-700 uppercase">
                  ✓ edit applied · regenerated for reliability
                </p>
              )}
              {!editError && editMode === "patched" && (
                <p className="mt-2 font-mono text-[11px] tracking-wider text-slate-400 uppercase">
                  ✓ edit applied
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-slate-300" />
                <p className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">save</p>
              </div>
              <Button
                onClick={saveToLibrary}
                disabled={!latex || saveStatus === "saving" || saveStatus === "saved" || outOfCredits}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-200 disabled:text-slate-400"
              >
                {saveStatus === "saving" && "saving…"}
                {saveStatus === "saved" && "saved to library ✓"}
                {saveStatus === "dirty" && "save changes →"}
                {saveStatus === "error" && "couldn't save — try again"}
                {saveStatus === "" && "save to library"}
              </Button>
            </div>

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

export default function Worksheet() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[color:#FAFAF6]" />}>
      <WorksheetInner />
    </Suspense>
  );
}