"use client";

import { useEffect } from "react";

/**
 * Section arrival choreography for Home v2.
 *
 * Two cooperating layers:
 *
 * 1. Entrance reveals — an IntersectionObserver adds `.ab-in` to any
 *    `[data-reveal]` section the first time it enters, and CSS in
 *    v2-animations.css transitions the `[data-rv]` children (masked
 *    headline line-rise, eyebrow, divider rule, staggered content).
 *    Fires once, then unobserves: re-animating on scroll-up reads cheap.
 *
 * 2. Depth handoff — a scroll-linked pass gives `[data-depth]` sections a
 *    rounded top edge + top shadow that flattens as they lock into place,
 *    while the outgoing section's `[data-depth-inner]` content drifts up
 *    and dims. The dim uses filter: brightness(), matching the existing
 *    Capabilities card-stack, so the whole page reads as one depth idea.
 *    The transform stays on the INNER wrapper so section backgrounds keep
 *    their full bleed (a transformed section would expose slivers of the
 *    page background at its edges). A section whose content relies on
 *    position: sticky opts out of the transform via
 *    data-depth-inner="dim" — a transformed ancestor would break it.
 *
 * Honours prefers-reduced-motion: everything resolves to its final state
 * and no scroll listener is attached.
 */
export function useSectionReveal(
  rootRef: React.RefObject<HTMLElement | null>,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      sections.forEach((s) => s.classList.add("ab-in"));
      return;
    }

    // --- 1. Entrance reveals -------------------------------------------
    // `isIntersecting` is not trusted on its own here. The effect re-runs
    // whenever the page swaps in CMS data, and a freshly constructed
    // observer reports on EVERY observed element in its first callback.
    // Sections far below the fold came back as "intersecting" against the
    // document rather than the viewport, got marked revealed while still
    // off-screen, and were immediately unobserved — so by the time the
    // reader scrolled down, the transition had already run and the section
    // simply appeared. Testing the rect against the viewport directly is
    // what makes a re-run idempotent.
    const onScreen = (el: Element) => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Same ~32% bite as the rootMargin below: reveal once the section is
      // genuinely in front of the reader — head + headline visible — not the
      // instant its top edge grazes the bottom of the screen. Firing at the
      // graze meant the 0.6-0.9s animation finished mid-scroll, before the
      // reader ever looked at the section, so everything read as pre-revealed.
      //
      // `r.bottom > 0` alone is not enough for the lower bound: a section
      // taller than the viewport can have its top scrolled well above the
      // screen while its content still fills it, so the top test is what
      // carries tall sections and the bottom test carries short ones.
      return r.top < vh * 0.82 && r.bottom > vh * 0.06;
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || !onScreen(entry.target)) return;
          entry.target.classList.add("ab-in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -16% 0px" }
    );
    // A section revealed on a previous run keeps its class and is not
    // re-observed, so a data swap never replays an animation the reader
    // has already seen.
    sections.forEach((s) => {
      if (!s.classList.contains("ab-in")) io.observe(s);
    });

    // --- 2. Depth handoff & Humaan-style parallax curved sheets --------
    const depthSections = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]"));
    const positionSheet = root.querySelector<HTMLElement>("[data-position-sheet]");
    const positionText = root.querySelector<HTMLElement>("[data-position-text]");
    const worksHead = root.querySelector<HTMLElement>("[data-works-head]");
    const lightSheet = root.querySelector<HTMLElement>("[data-light-sheet]");
    const capInner = root.querySelector<HTMLElement>("[data-cap-inner]");
    const capScrim = root.querySelector<HTMLElement>("[data-cap-scrim]");
    const trustedInner = root.querySelector<HTMLElement>("[data-trusted-inner]");
    const footerInner = root.querySelector<HTMLElement>("[data-footer-inner]");
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    let raf: number | null = null;

    const tick = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // Safety net for the reveals above. Everything [data-rv] defaults to
      // opacity 0, so a missed IntersectionObserver callback does not just
      // skip an animation — it hides the section's content permanently. This
      // sweep runs on the same scroll pass as the depth work and reveals
      // anything already on screen that the observer did not catch, so no
      // geometry edge case can leave a section blank.
      for (let i = sections.length - 1; i >= 0; i--) {
        const s = sections[i];
        if (s.classList.contains("ab-in")) continue;
        if (onScreen(s)) {
          s.classList.add("ab-in");
          io.unobserve(s);
        }
      }

      if (positionSheet) {
        const pr = positionSheet.getBoundingClientRect();
        const tBot = clamp((vh * 0.96 - pr.bottom) / (vh * 0.84), 0, 1);
        const smoothBot = tBot * tBot * (3 - 2 * tBot);

        if (positionText) {
          const yDrift = (-smoothBot * 52).toFixed(1);
          const sc = (1 - smoothBot * 0.035).toFixed(4);
          positionText.style.transform = `translate3d(0,${yDrift}px,0) scale(${sc})`;
        }

        // Bottom parallax reveal over Our Works as the curved statement sheet lifts off it
        if (worksHead) {
          const pUncover = clamp(1 - pr.bottom / (vh * 0.96), 0, 1);
          const remain = 1 - pUncover;
          const yHold = (-remain * 165).toFixed(1);
          const sc = (1 - remain * 0.045).toFixed(4);
          worksHead.style.transform = `translate3d(0,${yHold}px,0) scale(${sc})`;
          worksHead.style.filter = "none";
        }
      }

      if (lightSheet) {
        const r = lightSheet.getBoundingClientRect();

        // 1. Top parallax & uniform dimming over Our Services:
        //    Pure GPU-composited transform + opacity only (no per-frame margin/border-radius reflows).
        const pCover = clamp(1 - r.top / vh, 0, 1);
        const topExit = clamp((r.top + 120) / 120, 0, 1);
        if (capInner) {
          const yShift = (pCover * 175).toFixed(1);
          const sc = (1 - pCover * 0.055).toFixed(4);
          capInner.style.transform = `translate3d(0,${yShift}px,0) scale(${sc})`;
          capInner.style.filter = "none";
        }
        if (capScrim) {
          capScrim.style.opacity = (pCover * topExit * 0.5).toFixed(3);
        }

        // 1b. Trusted By parallax drift as the curved sheet rises into view & scrolls down
        if (trustedInner) {
          const tr = trustedInner.getBoundingClientRect();
          const pCenter = clamp((vh - tr.top) / (vh + tr.height), 0, 1);
          const yParallax = ((0.5 - pCenter) * 76).toFixed(1);
          trustedInner.style.transform = `translate3d(0,${yParallax}px,0)`;
        }

        // 2. Bottom parallax reveal over Footer: Footer sits shifted up underneath the curved light sheet
        //    and drifts into place at half-speed as the curved bottom edge lifts off it.
        if (footerInner) {
          const pUncover = clamp(1 - (r.bottom - vh * 0.14) / (vh * 0.84), 0, 1);
          const remain = 1 - pUncover;
          const yHold = (-remain * 175).toFixed(1);
          const sc = (1 - remain * 0.045).toFixed(4);
          footerInner.style.transform = `translate3d(0,${yHold}px,0) scale(${sc})`;
          footerInner.style.filter = "none";
        }
      }

      depthSections.forEach((section) => {
        const r = section.getBoundingClientRect();
        const pOut = clamp((vh - r.bottom) / vh, 0, 1);
        const inner = section.querySelector<HTMLElement>("[data-depth-inner]");
        if (inner && !inner.dataset.trustedInner) {
          if (inner.dataset.depthInner !== "dim") {
            inner.style.transform = `translate3d(0,${(-22 * pOut).toFixed(2)}px,0)`;
          }
        }
      });
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        tick();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    tick();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootRef, ...deps]);
}
