"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

// LemonSqueezy checkout URLs (variant UUIDs).
// The user_id is appended at click time so the webhook knows who to credit.
const CHECKOUT_STARTER =
  "https://prompt2print.lemonsqueezy.com/checkout/buy/347687dd-9ffc-494c-b226-506bae31a155";
const CHECKOUT_CLASSROOM =
  "https://prompt2print.lemonsqueezy.com/checkout/buy/8fa14c88-4bc2-4f9c-95bb-70d5b690ab66";

const TIERS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    credits: 5,
    tagline: "One-time, on signup",
    features: [
      "5 worksheets",
      "Full generation quality",
      "Unlimited edits (free forever)",
      "Save to library",
    ],
    cta: "Included with signup",
    ctaDisabled: true,
    checkoutUrl: null,
  },
  {
    key: "starter",
    name: "Starter",
    price: "$9.99",
    credits: 20,
    tagline: "For occasional use",
    features: [
      "20 worksheets",
      "No expiry — use anytime",
      "Unlimited edits",
      "Save to library",
    ],
    cta: "Buy 20 worksheets →",
    ctaDisabled: false,
    checkoutUrl: CHECKOUT_STARTER,
    highlighted: true,
  },
  {
    key: "classroom",
    name: "Classroom",
    price: "$40",
    credits: 100,
    tagline: "For weekly use",
    features: [
      "100 worksheets",
      "No expiry — use anytime",
      "Unlimited edits",
      "Save to library",
      "Best value per worksheet",
    ],
    cta: "Buy 100 worksheets →",
    ctaDisabled: false,
    checkoutUrl: CHECKOUT_CLASSROOM,
  },
];

export default function Pricing() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [busyKey, setBusyKey] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        setUserEmail(data.user.email);
      }
    })();
  }, [supabase]);

  function goToCheckout(tier) {
    if (!tier.checkoutUrl || !userId) return;
    setBusyKey(tier.key);
    // Attach the Supabase user_id as custom data so the webhook can identify who to credit.
    // Also prefill email for a smoother checkout.
    const url = new URL(tier.checkoutUrl);
    url.searchParams.set("checkout[custom][user_id]", userId);
    if (userEmail) url.searchParams.set("checkout[email]", userEmail);
    window.location.href = url.toString();
  }

  return (
    <main className="relative min-h-screen bg-[color:#FAFAF6] overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(42,77,255,0.08), transparent 70%)",
        }}
      />

      <div className="relative border-b border-slate-200 bg-white/70 backdrop-blur">
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
          </div>
          <div />
        </div>
      </div>

      <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-8 text-center">
        <p className="font-mono text-[11px] tracking-wider text-slate-500 uppercase mb-3">
          Pricing
        </p>
        <h1 className="font-display text-[48px] sm:text-[56px] leading-[0.95] tracking-tight text-slate-900">
          Pay for what you print.
        </h1>
        <p className="mt-6 text-slate-700 text-[17px] max-w-xl mx-auto leading-relaxed">
          Every generation costs one worksheet. Edits are free — iterate as much as you like.
        </p>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((tier) => {
            const isBusy = busyKey === tier.key;
            return (
              <div
                key={tier.key}
                className={`relative rounded-2xl border bg-white p-7 flex flex-col ${
                  tier.highlighted
                    ? "border-slate-900 shadow-[0_1px_0px_0px_rgba(0,0,0,0.03),_0px_30px_60px_-15px_rgba(15,23,42,0.2)]"
                    : "border-slate-200 shadow-[0_1px_0px_0px_rgba(0,0,0,0.03),_0px_20px_60px_-20px_rgba(15,23,42,0.08)]"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-[10px] tracking-wider uppercase">
                    Most popular
                  </div>
                )}
                <p className="font-mono text-[11px] tracking-wider text-slate-500 uppercase mb-2">
                  {tier.name}
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-display text-[40px] leading-none text-slate-900">
                    {tier.price}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-6">{tier.tagline}</p>
                <div className="mb-6">
                  <p className="font-display text-[24px] leading-none text-slate-900">
                    {tier.credits} worksheets
                  </p>
                </div>
                <ul className="space-y-2 mb-7 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <svg className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => goToCheckout(tier)}
                  disabled={tier.ctaDisabled || isBusy || !userId}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  {isBusy ? "Redirecting…" : tier.cta}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="font-mono text-xs text-slate-400 text-center mt-12">
          Payments powered by LemonSqueezy · secure hosted checkout
        </p>
      </div>
    </main>
  );
}