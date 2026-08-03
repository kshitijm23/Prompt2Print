"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function Login() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleEmailSubmit(e) {
    e?.preventDefault?.();
    if (!email || !password) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
          },
        });
        if (signUpErr) throw signUpErr;
        if (data?.session) {
          router.push("/");
        } else {
          setCheckEmail(true);
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        router.push("/");
      }
    } catch (err) {
      setError(err?.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setBusy(true);
    setError("");
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (oauthErr) throw oauthErr;
    } catch (err) {
      setError(err?.message || "Google sign-in failed. Try again.");
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <main className="min-h-screen bg-[color:#FAFAF6] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.15)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center">
              <span className="text-white font-display text-[22px] leading-none">P</span>
            </div>
            <span className="font-display text-[22px] text-slate-900">Prompt2Print</span>
          </div>

          <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="font-display text-[26px] sm:text-[30px] leading-tight text-slate-900 mb-3">Check your inbox.</h1>
          <p className="text-slate-600 text-sm sm:text-[15px] leading-relaxed mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back here to sign in.
          </p>
          <p className="font-mono text-xs text-slate-400 mb-6">
            No email? Check your spam folder. The email is from <strong>onboarding@resend.dev</strong>.
          </p>
          <Button onClick={() => { setCheckEmail(false); setMode("signin"); setPassword(""); }} className="w-full bg-slate-900 hover:bg-slate-800 text-white">
            Back to sign in
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:#FAFAF6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.15)]">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center">
            <span className="text-white font-display text-[22px] leading-none">P</span>
          </div>
          <div>
            <p className="font-display text-[22px] leading-none text-slate-900">Prompt2Print</p>
            <p className="font-mono text-[10px] tracking-wider text-slate-500 uppercase mt-1">built by a teacher, for teachers</p>
          </div>
        </div>

        <h1 className="font-display text-[26px] sm:text-[30px] leading-tight text-slate-900 mb-2">
          {mode === "signup" ? "Create your account." : "Welcome back."}
        </h1>
        <p className="text-slate-600 text-sm mb-6">
          {mode === "signup" ? "5 worksheets on the house — no credit card required." : "Sign in to keep making beautiful worksheets."}
        </p>

        {/* Segmented tabs */}
        <div className="inline-flex p-0.5 bg-slate-100 rounded-lg mb-6 w-full">
          <button onClick={() => { setMode("signin"); setError(""); }}
            className={`flex-1 px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
              mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}>
            Sign in
          </button>
          <button onClick={() => { setMode("signup"); setError(""); }}
            className={`flex-1 px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
              mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}>
            Sign up
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div>
            <label className="font-mono text-[11px] tracking-wider text-slate-500 uppercase block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 transition"
              placeholder="you@school.edu"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] tracking-wider text-slate-500 uppercase block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={mode === "signup" ? 6 : undefined}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 transition"
              placeholder={mode === "signup" ? "at least 6 characters" : "your password"}
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200">
              <p className="font-mono text-xs text-rose-700">{error}</p>
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full bg-slate-900 hover:bg-slate-800 text-white">
            {busy ? (mode === "signup" ? "Creating account…" : "Signing in…") : (mode === "signup" ? "Create account →" : "Sign in →")}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 border-t border-slate-200" />
          <span className="font-mono text-[10px] tracking-wider text-slate-400 uppercase">or</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-xs text-slate-400 text-center mt-6">
          By signing up you agree to our{" "}
          <button onClick={() => router.push("/terms")} className="underline hover:text-slate-700">Terms</button>
          {" "}and{" "}
          <button onClick={() => router.push("/privacy")} className="underline hover:text-slate-700">Privacy Policy</button>.
        </p>
      </div>
    </main>
  );
}