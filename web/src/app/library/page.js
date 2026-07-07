"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return diffMin + "m ago";
  if (diffHr < 24) return diffHr + "h ago";
  if (diffDay < 7) return diffDay + "d ago";

  return d.toLocaleDateString();
}

export default function Library() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from("worksheets")
        .select("id, title, prompt, created_at")
        .order("created_at", { ascending: false });

      if (err) {
        setError(err.message || "Couldn't load library.");
        setItems([]);
      } else {
        setItems(data || []);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleOutsideClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    }

    if (menuOpenId) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [menuOpenId]);

  async function deleteItem(id) {
    const { error: err } = await supabase
      .from("worksheets")
      .delete()
      .eq("id", id);

    if (err) {
      setError("Couldn't delete that.");
      return;
    }

    setItems((prev) => prev.filter((x) => x.id !== id));
    setConfirmDelete(null);
  }

  function startRename(it) {
    setMenuOpenId(null);
    setRenamingId(it.id);
    setRenameValue(it.title || "");
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  async function commitRename(id) {
    const t = renameValue.trim();

    if (!t || t.length === 0) {
      cancelRename();
      return;
    }

    const { error: err } = await supabase
      .from("worksheets")
      .update({ title: t })
      .eq("id", id);

    if (err) {
      setError("Couldn't rename.");
      return;
    }

    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, title: t } : x))
    );

    cancelRename();
  }

  return (
    <main className="relative min-h-screen bg-[color:#FAFAF6]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(42,77,255,0.06), transparent 70%)",
        }}
      />

      <div className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
          >
            <span className="font-mono text-sm">← home</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-slate-900 flex items-center justify-center">
              <span className="text-white font-display text-[11px] leading-none">
                P
              </span>
            </div>
            <span className="font-mono text-sm text-slate-900">
              Prompt2Print
            </span>
          </div>

          <div />
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-12 pb-8">
        <p className="font-mono text-[11px] tracking-wider text-slate-500 uppercase mb-3">
          your library
        </p>

        <h1 className="font-display text-[48px] leading-none tracking-tight text-slate-900">
          Saved worksheets
        </h1>

        <p className="mt-3 text-slate-600 text-[17px]">
          Everything you’ve saved, in one place.
        </p>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pb-24">
        {error && (
          <p className="font-mono text-sm text-rose-600 mb-4">{error}</p>
        )}

        {items === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[180px] rounded-xl border border-slate-200 bg-white animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="h-[360px] border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-4 bg-[color:#FEFEFA]">
            <p className="font-mono text-sm text-slate-400">
              no saved worksheets yet
            </p>

            <Button
              onClick={() => router.push("/")}
              size="lg"
              className="bg-slate-900 hover:bg-slate-800 text-white px-6"
            >
              + create a worksheet
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => {
              const isRenaming = renamingId === it.id;
              const isMenuOpen = menuOpenId === it.id;

              return (
                <div
                  key={it.id}
                  className="group relative rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-400 hover:shadow-[0px_20px_60px_-20px_rgba(15,23,42,0.08)] transition flex flex-col"
                >
                  {/* Kebab menu */}
                  <div
                    className="absolute top-3 right-3"
                    ref={isMenuOpen ? menuRef : null}
                  >
                    <button
                      onClick={() => setMenuOpenId(isMenuOpen ? null : it.id)}
                      aria-label="More options"
                      type="button"
                      className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition"
                    >
                      <span className="font-bold text-xl leading-none">⋮</span>
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-9 w-40 rounded-lg border border-slate-200 bg-white shadow-[0px_10px_40px_rgba(15,23,42,0.15)] overflow-hidden z-20">
                        <button
                          onClick={() => startRename(it)}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                        >
                          Rename
                        </button>

                        <button
                          onClick={() => {
                            setMenuOpenId(null);
                            setConfirmDelete(it.id);
                          }}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition border-t border-slate-100"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="font-mono text-[10px] tracking-wider text-slate-400 uppercase mb-2 pr-8">
                    {formatDate(it.created_at)}
                  </p>

                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(it.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename(it.id);
                        }

                        if (e.key === "Escape") {
                          cancelRename();
                        }
                      }}
                      className="w-full font-display text-[20px] leading-snug text-slate-900 mb-2 outline-none border-b border-slate-400 pb-1"
                    />
                  ) : (
                    <h3 className="font-display text-[20px] leading-snug text-slate-900 mb-2 truncate">
                      {it.title || "Untitled worksheet"}
                    </h3>
                  )}

                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                    {it.prompt}
                  </p>

                  <Button
                    onClick={() => router.push(`/worksheet?id=${it.id}`)}
                    className="w-full mt-auto bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    Open →
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 max-w-sm w-full shadow-[0px_30px_60px_-20px_rgba(15,23,42,0.2)]">
            <h3 className="font-display text-[24px] leading-snug text-slate-900 mb-2">
              Delete this worksheet?
            </h3>

            <p className="text-sm text-slate-500 mb-6">
              This can’t be undone.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                type="button"
                className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition text-sm"
              >
                Cancel
              </button>

              <button
                onClick={() => deleteItem(confirmDelete)}
                type="button"
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}