"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function Library() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState("");
  const [credits, setCredits] = useState(null);
  const [worksheets, setWorksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [kebabOpenId, setKebabOpenId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.push("/login"); return; }
      setUserEmail(userData.user.email);
      const { data: profile } = await supabase.from("user_profiles").select("credits_remaining").eq("user_id", userData.user.id).single();
      if (profile) setCredits(profile.credits_remaining);
      const { data } = await supabase.from("worksheets").select("id, title, prompt, created_at").eq("user_id", userData.user.id).order("created_at", { ascending: false });
      setWorksheets(data || []);
      setLoading(false);
    })();
  }, [supabase, router]);

  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest("[data-app-menu]")) setMenuOpen(false);
      if (!e.target.closest("[data-kebab]")) setKebabOpenId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function commitRename(id) {
    const newTitle = renameValue.trim();
    if (!newTitle) { setRenamingId(null); return; }
    const { error } = await supabase.from("worksheets").update({ title: newTitle }).eq("id", id);
    if (!error) {
      setWorksheets((ws) => ws.map((w) => (w.id === id ? { ...w, title: newTitle } : w)));
    }
    setRenamingId(null);
    setRenameValue("");
  }

  async function commitDelete(id) {
    const { error } = await supabase.from("worksheets").delete().eq("id", id);
    if (!error) setWorksheets((ws) => ws.filter((w) => w.id !== id));
    setDeleteConfirmId(null);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  }

  return (
    <main className="min-h-screen bg-[color:#FAFAF6]">
      {/* NAV */}
      <div className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition flex-shrink-0">
            <span className="font-mono text-xs sm:text-sm">← back</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <div className="h-5 w-5 rounded-md bg-slate-900 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-display text-[11px] leading-none">P</span>
            </div>
            <span className="font-mono text-xs sm:text-sm text-slate-900 truncate">Prompt2Print · Library</span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {credits !== null && (
              <button onClick={() => router.push("/pricing")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-mono text-[10px] sm:text-xs tracking-wider uppercase transition ${
                  credits === 0 ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  : credits <= 2 ? "bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}>
                {credits} left
              </button>
            )}

            <button onClick={() => router.push("/pricing")} className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition">Pricing</button>
            <button onClick={handleSignOut} className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition">Sign out</button>
            {userEmail && (
              <div className="hidden sm:flex ml-1 h-8 w-8 rounded-full bg-slate-900 text-white items-center justify-center font-medium text-xs shadow-[0px_2px_8px_rgba(15,23,42,0.15)]" title={userEmail}>
                {userEmail.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="relative sm:hidden" data-app-menu>
              <button onClick={() => setMenuOpen((v) => !v)} className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition" aria-label="Open menu">
                {menuOpen ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>
              {menuOpen && userEmail && (
                <div className="absolute right-0 top-11 w-64 bg-white border border-slate-200 rounded-xl shadow-[0_20px_40px_-10px_rgba(15,23,42,0.2)] py-1 z-50">
                  <div className="px-4 pt-3 pb-2 border-b border-slate-100 mb-1 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-medium text-sm flex-shrink-0">
                      {userEmail.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] tracking-wider text-slate-400 uppercase">Signed in</p>
                      <p className="text-xs text-slate-700 truncate">{userEmail}</p>
                    </div>
                  </div>
                  <button onClick={() => { setMenuOpen(false); router.push("/"); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Home</button>
                  <button onClick={() => { setMenuOpen(false); router.push("/pricing"); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Pricing</button>
                  <div className="my-1 border-t border-slate-100" />
                  <button onClick={() => { setMenuOpen(false); handleSignOut(); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-8">
        <p className="font-mono text-[11px] tracking-wider text-slate-500 uppercase mb-2 sm:mb-3">Library</p>
        <h1 className="font-display text-[32px] sm:text-[44px] leading-tight text-slate-900">
          Your saved worksheets
        </h1>
        <p className="mt-4 text-slate-600 text-sm sm:text-base">
          {worksheets.length === 0 && !loading ? "No worksheets saved yet. Create one to see it here." : `${worksheets.length} worksheet${worksheets.length === 1 ? "" : "s"} saved.`}
        </p>
      </div>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
          </div>
        ) : worksheets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center">
            <p className="font-display text-[24px] sm:text-[28px] text-slate-900 mb-2">Nothing here yet.</p>
            <p className="text-slate-600 text-sm mb-6">Head back to the home page to generate your first worksheet.</p>
            <Button onClick={() => router.push("/")} className="bg-slate-900 hover:bg-slate-800 text-white">
              Create a worksheet →
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {worksheets.map((w) => (
              <div key={w.id} className="relative rounded-xl border border-slate-200 bg-white p-5 hover:shadow-[0_10px_30px_-10px_rgba(15,23,42,0.1)] transition">
                <div className="flex items-start justify-between gap-2 mb-3">
                  {renamingId === w.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(w.id);
                        if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                      }}
                      onBlur={() => commitRename(w.id)}
                      className="flex-1 font-display text-lg text-slate-900 bg-transparent border-b border-slate-400 outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => router.push(`/worksheet?id=${w.id}`)}
                      className="flex-1 text-left font-display text-lg text-slate-900 hover:text-slate-700 transition line-clamp-2"
                    >
                      {w.title || "Untitled worksheet"}
                    </button>
                  )}

                  <div className="relative flex-shrink-0" data-kebab>
                    <button
                      onClick={() => setKebabOpenId((v) => (v === w.id ? null : w.id))}
                      className="p-1 rounded hover:bg-slate-100 text-slate-500 transition"
                      aria-label="Options"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                      </svg>
                    </button>
                    {kebabOpenId === w.id && (
                      <div className="absolute right-0 top-8 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-40">
                        <button onClick={() => { setKebabOpenId(null); setRenamingId(w.id); setRenameValue(w.title || ""); }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Rename</button>
                        <button onClick={() => { setKebabOpenId(null); setDeleteConfirmId(w.id); }}
                          className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50">Delete</button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-500 line-clamp-3 mb-4">{w.prompt}</p>
                <p className="font-mono text-[10px] tracking-wider text-slate-400 uppercase">{formatDate(w.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.3)]">
            <p className="font-mono text-[11px] tracking-wider text-slate-500 uppercase mb-2">Delete worksheet?</p>
            <h3 className="font-display text-[22px] text-slate-900 mb-3">This can't be undone.</h3>
            <p className="text-sm text-slate-600 mb-6">Your saved copy will be removed permanently. You can always create a new one.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button onClick={() => setDeleteConfirmId(null)} className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-50">Cancel</Button>
              <Button onClick={() => commitDelete(deleteConfirmId)} className="bg-rose-600 hover:bg-rose-700 text-white">Delete</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}