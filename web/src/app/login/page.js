"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // If already signed in, bounce to home.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/");
    });
  }, [router, supabase]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password !== confirm) {
          throw new Error("Passwords don't match.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
        });
        if (err) throw err;
        // If confirm-email is off, signUp returns a session immediately.
        if (data.session) {
          router.replace("/");
          return;
        }
        // Fallback: explicitly sign in.
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signErr) throw signErr;
        router.replace("/");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        router.replace("/");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (err) setError(err.message);
  }

  return (
    <main className="relative min-h-screen bg-[color:#FAFAF6] flex items-center justify-center px-6">
      {/* soft gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(42,77,255,0.08), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* logo + title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center">
            <span className="text-white font-display text-[22px] leading-none">P</span>
          </div>
          <div>
            <p className="font-display text-[24px] leading-none text-slate-900">
              Prompt2Print
            </p>
            <p className="font-mono text-[10px] tracking-wider text-slate-500 uppercase mt-1">
              {mode === "signup" ? "create account" : "sign in"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_1px_0px_0px_rgba(0,0,0,0.03),_0px_20px_60px_-20px_rgba(15,23,42,0.08)]">
          {/* Google button */}
          <Button
            type="button"
            onClick={signInWithGoogle}
            className="w-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-50"
            size="lg"
          >
            continue with google
          </Button>

          {/* divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="font-mono text-[11px] tracking-wider text-slate-400 uppercase">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">
                email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-sm"
              />
            </div>
            <div>
              <label className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">
                password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 6 characters"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-sm"
              />
            </div>

            {mode === "signup" && (
              <div>
                <label className="font-mono text-[11px] tracking-wider text-slate-600 uppercase">
                  confirm password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="re-enter to confirm"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-sm"
                />
              </div>
            )}

            {error && (
              <p className="font-mono text-xs text-rose-600">{error}</p>
            )}

            <Button
              type="submit"
              disabled={busy}
              size="lg"
              className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white"
            >
              {busy ? "working…" : mode === "signup" ? "create account" : "sign in"}
            </Button>
          </form>

          {/* toggle */}
          <p className="text-center mt-6 font-mono text-xs text-slate-500">
            {mode === "signup" ? "already have an account?" : "new here?"}  
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError("");
                setConfirm("");
              }}
              className="text-slate-900 underline underline-offset-4 hover:text-slate-600"
            >
              {mode === "signup" ? "sign in" : "create one"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
