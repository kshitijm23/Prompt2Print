"use client";

import { useRouter } from "next/navigation";

export default function Privacy() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[color:#FAFAF6]">
      <div className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
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

      <article className="max-w-3xl mx-auto px-6 py-16 text-slate-800 leading-relaxed">
        <p className="font-mono text-[11px] tracking-wider text-slate-500 uppercase mb-3">
          Legal
        </p>
        <h1 className="font-display text-[44px] leading-[1.05] tracking-tight text-slate-900 mb-2">
          Privacy Policy
        </h1>
        <p className="font-mono text-xs text-slate-500 mb-10">
          Last updated: July 2026
        </p>

        <section className="prose prose-slate max-w-none space-y-8">
          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">Overview</h2>
            <p>
              Prompt2Print is operated by Kshitij Mahajan as a sole proprietor. This policy
              explains what data we collect, why, who we share it with, and how you can
              control it. If you have any questions, email us at{" "}
              <a href="mailto:kshitijmisc@gmail.com" className="underline hover:text-slate-900">
                kshitijmisc@gmail.com
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">1. What we collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account information</strong>: your email address, and if you sign in
                with Google, your name and profile picture.
              </li>
              <li>
                <strong>Worksheet content</strong>: the prompts you type, any reference files
                you upload, and the LaTeX/PDF worksheets we generate for you. You can delete
                these at any time from your library.
              </li>
              <li>
                <strong>Usage records</strong>: which endpoints you called, when, and how many
                credits you used. We use this to bill correctly and to debug errors.
              </li>
              <li>
                <strong>Purchase records</strong>: which credit pack you bought, when, and how
                much you paid. We do NOT store your full card number — that stays with our
                payment processor.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">2. Why we collect it</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide the Service (generate, save, and let you re-open worksheets).</li>
              <li>To bill correctly and prevent abuse of the credits system.</li>
              <li>To debug problems when generation fails.</li>
              <li>To send you transactional emails (account confirmation, password reset).</li>
            </ul>
            <p className="mt-3">
              We do not sell your data. We do not use your worksheets to train any AI model. We
              do not send marketing emails without your consent.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">3. Who we share it with</h2>
            <p>
              We use a small number of third-party services to run Prompt2Print. Each processes
              only the data required for their specific function:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Anthropic</strong> (Claude): receives your prompt and any reference file
                you upload, so it can generate worksheet LaTeX. Anthropic&apos;s privacy policy is
                at{" "}
                <a
                  href="https://www.anthropic.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-slate-900"
                >
                  anthropic.com/legal/privacy
                </a>
                .
              </li>
              <li>
                <strong>Supabase</strong>: hosts our database and authentication. Stores your
                email, hashed password, saved worksheets, and credit balance.
              </li>
              <li>
                <strong>Vercel</strong>: hosts our website. Sees standard web traffic (IP
                addresses, browser type) for reliability and abuse prevention.
              </li>
              <li>
                <strong>Railway</strong>: hosts our backend server. Sees the requests you make
                to generate and edit worksheets.
              </li>
              <li>
                <strong>LemonSqueezy</strong>: processes payments as our merchant of record.
                They see your name, email, billing address, and card details — we do not.
              </li>
              <li>
                <strong>Resend</strong>: sends transactional emails (account confirmation,
                password reset). Sees your email address and the message content.
              </li>
              <li>
                <strong>Google</strong> (if you sign in with Google): standard OAuth data flow.
                You can review what you shared at{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-slate-900"
                >
                  myaccount.google.com/permissions
                </a>
                .
              </li>
            </ul>
            <p className="mt-3">
              We do not share your data with anyone else. We may disclose data if legally
              required by court order or similar.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">4. Cookies &amp; sessions</h2>
            <p>
              We use cookies only for authentication (keeping you logged in). We do not use
              tracking or advertising cookies. Some third-party services above may set their
              own cookies as part of their functionality — refer to their policies for
              details.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">5. Data retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your account and saved worksheets: kept as long as your account is active.</li>
              <li>
                Purchase records and credit transactions: kept for at least 5 years for tax and
                audit purposes, as required in most jurisdictions.
              </li>
              <li>
                Deleted worksheets and closed accounts: removed from our active database within
                30 days. Backups may retain data for up to 90 additional days before being
                overwritten.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">6. Your rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access the data we hold about you.</li>
              <li>Correct any inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Object to certain kinds of processing.</li>
              <li>Export your data in a portable format.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these, email{" "}
              <a href="mailto:kshitijmisc@gmail.com" className="underline hover:text-slate-900">
                kshitijmisc@gmail.com
              </a>{" "}
              and we will respond within 30 days.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">7. Children</h2>
            <p>
              Prompt2Print is intended for teachers and other adults. We do not knowingly
              collect data from anyone under 18. If you believe a minor has created an account,
              email us and we will delete it.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">8. International users</h2>
            <p>
              Our infrastructure is hosted in the United States. If you use the Service from
              outside the US, you understand that your data will be processed in the US and
              other countries where our providers operate.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">9. Changes to this policy</h2>
            <p>
              We may update this policy occasionally. Material changes will be communicated by
              email or via a notice on the site.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">10. Contact</h2>
            <p>
              Questions or requests? Email{" "}
              <a href="mailto:kshitijmisc@gmail.com" className="underline hover:text-slate-900">
                kshitijmisc@gmail.com
              </a>
              .
            </p>
          </div>
        </section>

        <p className="font-mono text-xs text-slate-400 text-center mt-16">
          Prompt2Print · built by a teacher, for teachers
        </p>
      </article>
    </main>
  );
}