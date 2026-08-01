"use client";

import { useRouter } from "next/navigation";

export default function Terms() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[color:#FAFAF6]">
      {/* slim top bar */}
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
          Terms of Service
        </h1>
        <p className="font-mono text-xs text-slate-500 mb-10">
          Last updated: July 2026
        </p>

        <section className="prose prose-slate max-w-none space-y-8">
          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">1. Who we are</h2>
            <p>
              Prompt2Print (&ldquo;the Service&rdquo;) is an AI-powered worksheet generator for teachers,
              operated by Kshitij Mahajan as a sole proprietor. You can reach us at{" "}
              <a href="mailto:kshitijmisc@gmail.com" className="underline hover:text-slate-900">
                kshitijmisc@gmail.com
              </a>
              . By creating an account or using the Service, you agree to these Terms.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">2. What the Service does</h2>
            <p>
              You describe a worksheet in plain language; we generate a printable PDF using
              large language models (currently Anthropic&apos;s Claude family). You can edit,
              save, and download your worksheets. Every account starts with 5 free worksheet
              credits. Additional credits can be purchased in one-time packs (Starter and
              Classroom).
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">3. Account &amp; eligibility</h2>
            <p>
              You must be at least 18 years old (or the age of majority in your jurisdiction) to
              create an account. You are responsible for keeping your login credentials
              confidential and for all activity that occurs under your account.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">4. Credits &amp; payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Each worksheet generation uses one credit. Edits to existing worksheets are free.</li>
              <li>
                Purchased credits do not expire. They remain on your account until used or until
                your account is closed.
              </li>
              <li>
                Payments are processed by LemonSqueezy, our merchant of record. LemonSqueezy
                handles card details, taxes, and receipts. We never see your full card number.
              </li>
              <li>Prices are shown at checkout in USD and may change at any time for new purchases.</li>
              <li>
                If a generation fails on our side (compilation error, no PDF produced), we
                automatically refund the credit to your account.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">5. Refunds</h2>
            <p>
              All purchases are final and non-refundable. Credits do not expire and are yours to
              use whenever you like. If you believe a charge is fraudulent or was made without
              your authorization, contact us and we will work with LemonSqueezy to investigate.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">6. Acceptable use</h2>
            <p>You agree not to use the Service to generate content that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Is illegal, harmful, or infringes on any third party&apos;s rights.</li>
              <li>Contains hate speech, sexual content involving minors, or targeted harassment.</li>
              <li>Attempts to reverse-engineer, resell, or automate mass generation for redistribution.</li>
              <li>Impersonates another person or organization.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate these rules,
              without refund.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">7. Ownership of generated content</h2>
            <p>
              You own the worksheets you generate. You may print, distribute, and use them in
              your classroom or in any other lawful way, including commercially. We claim no
              ownership over your output. Note, however, that AI-generated content may
              coincidentally resemble other content — you are responsible for reviewing what
              you distribute.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">8. Availability &amp; changes</h2>
            <p>
              We aim to keep the Service available at all times but do not guarantee uninterrupted
              access. We may update, change, or discontinue features at any time. If we
              discontinue the Service entirely, we will make a reasonable effort to notify active
              users and to refund unused paid credits.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">9. Disclaimers</h2>
            <p>
              The Service is provided &ldquo;as is,&rdquo; without warranties of any kind, express or
              implied. AI-generated content may be inaccurate, incomplete, or unsuitable for a
              specific classroom context. You are responsible for reviewing all worksheets before
              distributing them to students.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">10. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Prompt2Print will not be liable for any
              indirect, incidental, or consequential damages arising from your use of the
              Service. Our total liability to you for any claim relating to the Service is
              limited to the total amount you paid us in the 12 months preceding the claim.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">11. Termination</h2>
            <p>
              You may close your account at any time by emailing us at{" "}
              <a href="mailto:kshitijmisc@gmail.com" className="underline hover:text-slate-900">
                kshitijmisc@gmail.com
              </a>
              . On closure, your saved worksheets will be deleted within 30 days. Unused
              purchased credits are not refundable on voluntary closure.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">12. Changes to these Terms</h2>
            <p>
              We may update these Terms occasionally. Material changes will be communicated by
              email or via a notice on the site. Continued use of the Service after changes take
              effect constitutes acceptance.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[24px] text-slate-900 mb-3">13. Contact</h2>
            <p>
              Questions? Email{" "}
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