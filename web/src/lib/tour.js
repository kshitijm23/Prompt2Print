"use client";

import Shepherd from "shepherd.js";
import "shepherd.js/dist/css/shepherd.css";

/**
 * Launch the onboarding tour on the home page.
 * @param {Object} opts
 * @param {() => void} [opts.onEnd] - called when tour completes OR is cancelled
 * @returns The Shepherd tour instance (so caller can call .cancel() to force-stop).
 */
export function startTour({ onEnd } = {}) {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      cancelIcon: { enabled: true },
      scrollTo: { behavior: "smooth", block: "center" },
      classes: "p2p-shepherd",
      modalOverlayOpeningPadding: 8,
      modalOverlayOpeningRadius: 12,
    },
  });

  const next = {
    text: "Next →",
    classes: "p2p-shepherd-btn-primary",
    action: () => tour.next(),
  };
  const back = {
    text: "← Back",
    classes: "p2p-shepherd-btn-secondary",
    action: () => tour.back(),
  };
  const skip = {
    text: "Skip tour",
    classes: "p2p-shepherd-btn-secondary",
    action: () => tour.cancel(),
  };
  const finish = {
    text: "Got it →",
    classes: "p2p-shepherd-btn-primary",
    action: () => tour.complete(),
  };

  tour.addStep({
    id: "welcome",
    title: "Welcome to Prompt2Print",
    text: `
      <p>Let me show you around — takes about 30 seconds.</p>
      <p style="margin-top: 10px; color: #64748b; font-size: 13px;">
        Built by a teacher, for teachers.
      </p>
    `,
    buttons: [skip, next],
  });

  tour.addStep({
    id: "prompt",
    title: "1. Describe your worksheet",
    attachTo: { element: "[data-tour='prompt']", on: "bottom" },
    text: `
      <p>Type what you want in plain English. No formatting needed.</p>
      <p style="margin-top: 8px;"><strong>Be specific</strong> — mention the grade, topic, and how many questions you want.</p>
    `,
    buttons: [back, next],
  });

  tour.addStep({
    id: "template",
    title: "2. Pick a subject (optional)",
    attachTo: { element: "[data-tour='templates']", on: "top" },
    text: `
      <p>Templates give cleaner results for common subjects — Math, Reading, Science, etc.</p>
      <p style="margin-top: 8px;">Or stick with <strong>Custom</strong> to describe everything yourself.</p>
    `,
    buttons: [back, next],
  });

  tour.addStep({
    id: "style",
    title: "3. Choose the look",
    attachTo: { element: "[data-tour='style']", on: "top" },
    text: `
      <p><strong>Colorful</strong> — visual, with question boxes and diagrams. Great for elementary.</p>
      <p style="margin-top: 8px;"><strong>Classic</strong> — clean black-and-white exam paper. Great for older students or formal tests.</p>
    `,
    buttons: [back, next],
  });

  tour.addStep({
    id: "answer-key",
    title: "4. Answer key (optional)",
    attachTo: { element: "[data-tour='answer-key']", on: "top" },
    text: `
      <p>Check this box to get an answer key attached to the end of the PDF.</p>
      <p style="margin-top: 8px; color: #64748b; font-size: 13px;">
        Handy for tests and homework you're grading.
      </p>
    `,
    buttons: [back, next],
  });

  tour.addStep({
    id: "credits",
    title: "5. Your worksheets",
    attachTo: { element: "[data-tour='credits']", on: "bottom" },
    text: `
      <p>You start with <strong>5 free worksheets</strong>. Each generation uses one.</p>
      <p style="margin-top: 8px;"><strong>Edits are free forever</strong> — tweak your worksheets as many times as you want without spending a credit.</p>
      <p style="margin-top: 10px; color: #64748b; font-size: 13px;">
        You can replay this tour anytime with the "?" button in the nav.
      </p>
    `,
    buttons: [back, finish],
  });

  tour.on("complete", () => onEnd && onEnd());
  tour.on("cancel", () => onEnd && onEnd());

  // Wait a beat so DOM is settled after render
  setTimeout(() => tour.start(), 100);

  return tour;
}