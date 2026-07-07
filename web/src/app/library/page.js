"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr  = Math.floor(diffMs / 3600000);
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

  const [items, setItems] = useState(null); // null = loading; [] = empty
  const [error, setError] = useState("");

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

  return (
    <main className="relative min-h-screen bg-[color:#FAFAF6]">
      {/* soft gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(42,77,255,0.06), transparent 70%)",
        }}
      />

      {/* slim top bar */}
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
              <span className="text-white font-display text-[11px] leading-none">P</span>
            </div>
            <span className="font-mono text-sm text-slate-900">prompt2.print</span>
          </div>
          <div></div>
        </div>
      </div>

      {/* Header */}
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

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 pb-24">
        {error && (
          <p className="font-mono text-sm text-rose-600 mb-4">{error}</p>
        )}

        {items === null ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((i) => (
              <div
                key={i}
                className="h-[140px] rounded-xl border border-slate-200 bg-white animate-pulse"
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
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => router.push(`/worksheet?id=${it.id}`)}
                className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-400 hover:shadow-[0px_20px_60px_-20px_rgba(15,23,42,0.08)] transition"
              >
                <p className="font-mono text-[10px] tracking-wider text-slate-400 uppercase mb-2">
                  {formatDate(it.created_at)}
                </p>
                <h3 className="font-display text-[20px] leading-snug text-slate-900 mb-2">
                  {it.title || "Untitled worksheet"}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2">
                  {it.prompt}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
