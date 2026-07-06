"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.841H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.182l-2.908-2.259c-.806.54-1.837.861-3.048.861-2.344 0-4.328-1.583-5.036-3.71H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.283-1.117-.283-1.71s.103-1.17.283-1.71V4.958H.957C.348 6.173.0 7.548.0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.440 1.345l2.582-2.582C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z"/>
    </svg>
  );
}

export default function Login() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/");
    });
  }, [router, supabase]);

  function switchMode(nnext) {
    setMode(nnext);
    setError("");
    setConfirm("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password !== confirm) throw new Error("Passwords don't match.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.session) { router.replace("/"); return; }
        const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signErr) throw signErr;
        router.replace("/");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
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
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (err) setError(err.message);
  }

  const isSignup = mode === "signup";

  return (
    <main className="relative min-h-screen bg-[color:#FAFAF6] flex items-center justify-center px-6">
      {/* soft gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(42,77,255,0.1), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[calc(24rem+2rem)]">
        {/* brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-[0px_4px_20px_rgba(15,23,42,0.2)]">
            <span className="text-white font-display text-[28px] leading-none">P</span>
          </div>
          <div className="text-center">
            <h1 className="font-display text-[32px] leading-none text-slate-900">
              {isSignup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-slate-500 text-sm">
              {isSignup ? "Start turning prompts into polished worksheets." : "Sign in to continue to Prompt2Print."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_1px_0px_0px_rgba(0,0,0,0.03),_0px_30px_60px_-20px_rgba(15,23,42,0.1)]">
          {/* segmented tabs */}
          <div className="relative grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${isSignup ? "text-slate-500 hover:text-slate-900" : "bg-white text-slate-900 shadow-sm"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${isSignup ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              Create account
            </button>
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 transition"
          >
            <GoogleIcon />
            {isSignup ? "Sign up with Google" : "Continue with Google"}
          </button>

          {/* divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
              or
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm transition focus:outline-none focus:border-slate-900 focus:ring-0"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "At least 6 characters" : "Your password"}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm transition focus:outline-none focus:border-slate-900 focus:ring-0"
              />
            </div>

            {isSignup && (
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter to confirm"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm transition focus:outline-none focus:border-slate-900 focus:ring-0"
                />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-200">
                <svg className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[13px] text-rose-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-medium text-sm transition shadow-[0px_1px_2px_rgba(15,23,42,0.2)]"
            >
              {busy ? "Working…" : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-[12px] text-slate-400">
          Prompt2Print · used by teachers
        </p>
      </div>
    </main>
  );
}
