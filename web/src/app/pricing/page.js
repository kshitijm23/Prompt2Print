"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

const CHECKOUT_STARTER = "https://prompt2print.lemonsqueezy.com/checkout/buy/347687dd-9ffc-494c-b226-506bae31a155";
const CHECKOUT_CLASSROOM = "https://prompt2print.lemonsqueezy.com/checkout/buy/8fa14c88-4bc2-4f9c-95bb-70d5b690ab66";

const TIERS = [
  {
    key: "free", name: "Free", price: "$0", credits: 5, tagline: "One-time, on signup",
    features: ["5 worksheets", "Full generation quality", "Unlimited edits (free forever)", "Save to library"],
    cta: "Included with signup", ctaDisabled: true, checkoutUrl: null,
  },
  {
    key: "starter", name: "Starter", price: "$9.99", credits: 20, tagline: "For occasional use",
    features: ["20 worksheets", "No expiry — use anytime", "Unlimited edits", "Save to library"],
    cta: "Buy 20 worksheets →", ctaDisabled: false, checkoutUrl: CHECKOUT_STARTER, highlighted: true,
  },
  {
    key: "classroom", name: "Classroom", price: "$40", credits: 100, tagline: "For weekly use",
    features: ["100 worksheets", "No expiry — use anytime", "Unlimited edits", "Save to library", "Best value per worksheet"],
    cta: "Buy 100 worksheets →", ctaDisabled: false, checkoutUrl: CHECKOUT_CLASSROOM,
  },
];

export default function Pricing() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [credits, setCredits] = useState(null);
  const [waitingKey, setWaitingKey] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        setUserEmail(data.user.email);
        const { data: profile } = await supabase.from("user_profiles").select("credits_remaining").eq("user_id", data.user.id).single();
        if (profile) setCredits(profile.credits_remaining);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    async function refetch() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase.from("user_profiles").select("credits_remaining").eq("user_id", userData.user.id).single();
      if (profile) setCredits(profile.credits_remaining);
    }
    function onVisible() { if (document.visibilityState === "visible") refetch(); }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refetch);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refetch);
    };
  }, [supabase]);

  useEffect(() => {
    function handleClick(e) { if (!e.target.closest("[data-app-menu]")) setMenuOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function goToCheckout(tier) {
    if (!tier.checkoutUrl || !userId) return;
    setWaitingKey(tier.key);
    const url = new URL(tier.checkoutUrl);
    url.searchParams.set("checkout[custom][user_id]", userId);
    if (userEmail) url.searchParams.set("checkout[email]", userEmail);
    window.open(url.toString(), "_blank", "noopener");
  }

  return (
    <main className="relative min-h-screen bg-[color:#FAFAF6] overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{ background: "radial-gradient(ellipse at top, rgba(42,77,255,0.08), transparent 70%)" }} />

      {/* NAV */}
      <div className="relative border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition flex-shrink-0">
            <span className="font-mono text-xs sm:text-sm">← back</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <div className="h-5 w-5 rounded-md bg-slate-900 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-display text-[11px] leading-none">P</span>
            </div>
            <span className="font-mono text-xs sm:text-sm text-slate-900">Prompt2Print · Pricing</span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {credits !== null && (
              <button onClick={() => router.push("/")}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg font-mono text-[10px] sm:text-xs tracking-wider uppercase text-slate-700 bg-slate-100 hover:bg-slate-200 transition">
                {credits} left
              </button>
            )}

            <button onClick={() => router.push("/library")} className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition">Library</button>
            {userEmail && (
              <button onClick={handleSignOut} className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition">Sign out</button>
            )}
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
              {menuOpen && (
                <div className="absolute right-0 top-11 w-64 bg-white border border-slate-200 rounded-xl shadow-[0_20px_40px_-10px_rgba(15,23,42,0.2)] py-1 z-50">
                  {userEmail && (
                    <div className="px-4 pt-3 pb-2 border-b border-slate-100 mb-1 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-medium text-sm flex-shrink-0">
                        {userEmail.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] tracking-wider text-slate-400 uppercase">Signed in</p>
                        <p className="text-xs text-slate-700 truncate">{userEmail}</p>
                      </div>
                    </div>
                  )}
                  <button onClick={() => { setMenuOpen(false); router.push("/"); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Home</button>
                  <button onClick={() => { setMenuOpen(false); router.push("/library"); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Library</button>
                  {userEmail && <div className="my-1 border-t border-slate-100" />}
                  {userEmail && <button onClick={() => { setMenuOpen(false); handleSignOut(); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Sign out</button>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-6 sm:pb-8 text-center">
        <p className="font-mono text-[11px] tracking-wider text-slate-500 uppercase mb-2 sm:mb-3">Pricing</p>
        <h1 className="font-display text-[36px] sm:text-[48px] lg:text-[56px] leading-[0.95] tracking-tight text-slate-900">
          Pay for what you print.
        </h1>
        <p className="mt-4 sm:mt-6 text-slate-700 text-sm sm:text-[17px] max-w-xl mx-auto leading-relaxed">
          Every generation costs one worksheet. Edits are free — iterate as much as you like.
        </p>
        {waitingKey && (
          <div className="mt-4 sm:mt-6 inline-flex items-start sm:items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 max-w-md mx-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-1.5 sm:mt-0 flex-shrink-0" />
            <span className="font-mono text-[11px] sm:text-xs text-emerald-800 text-left">
              Checkout opened in a new tab. Come back here when you're done — your credits will update automatically.
            </span>
          </div>
        )}
      </div>

      {/* TIERS */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {TIERS.map((tier) => (
            <div key={tier.key}
              className={`relative rounded-2xl border bg-white p-6 sm:p-7 flex flex-col ${
                tier.highlighted
                  ? "border-slate-900 shadow-[0_1px_0px_0px_rgba(0,0,0,0.03),_0px_30px_60px_-15px_rgba(15,23,42,0.2)]"
                  : "border-slate-200 shadow-[0_1px_0px_0px_rgba(0,0,0,0.03),_0px_20px_60px_-20px_rgba(15,23,42,0.08)]"
              }`}>
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-[10px] tracking-wider uppercase whitespace-nowrap">
                  Most popular
                </div>
              )}
              <p className="font-mono text-[11px] tracking-wider text-slate-500 uppercase mb-2">{tier.name}</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-display text-[36px] sm:text-[40px] leading-none text-slate-900">{tier.price}</span>
              </div>
              <p className="text-sm text-slate-500 mb-5 sm:mb-6">{tier.tagline}</p>
              <div className="mb-5 sm:mb-6">
                <p className="font-display text-[22px] sm:text-[24px] leading-none text-slate-900">{tier.credits} worksheets</p>
              </div>
              <ul className="space-y-2 mb-6 sm:mb-7 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <svg className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Button onClick={() => goToCheckout(tier)}
                disabled={tier.ctaDisabled || !userId}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed">
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="font-mono text-[10px] sm:text-xs text-slate-400 text-center mt-8 sm:mt-12">
          Payments powered by LemonSqueezy · secure hosted checkout
        </p>
      </div>
    </main>
  );
}