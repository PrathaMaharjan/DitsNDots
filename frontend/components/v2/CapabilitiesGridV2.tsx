"use client";

import React, { useEffect, useRef } from "react";
import { displayFont } from "./tokens";
import SectionHeading from "./SectionHeading";
import {
  CREAM,
  Capability,
  CapabilityData,
  INK,
  dim,
  toCapabilities,
} from "./section-shared";

interface CapabilitiesGridV2Props {
  data?: CapabilityData;
}

/** Slight organic tilt per card in the horizontal overlapped stack, matching Huge's deck. */
const CARD_TILTS = [-1.6, 1.15, -1.1, 1.35, -0.85];

function StackCard({
  item,
  index,
  cardRef,
}: {
  item: Capability;
  index: number;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  // Alternating dark / cream cards just like the Huge Careers stack
  const isLightCard = index % 2 === 1;
  const bg = isLightCard ? "#F5F3EE" : "#111111";
  const fg = isLightCard ? "#0E0E0E" : "#F7F6F3";
  const subFg = isLightCard ? "rgba(14, 14, 14, 0.66)" : "rgba(247, 246, 243, 0.68)";
  const accentColor = isLightCard ? "#0082C8" : "#38BDF8";
  const border = isLightCard
    ? "1px solid rgba(14, 14, 14, 0.1)"
    : "1px solid rgba(247, 246, 243, 0.14)";

  return (
    <div
      ref={cardRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "clamp(260px, 26vw, 370px)",
        height: "clamp(380px, 56vh, 510px)",
        borderRadius: 22,
        background: bg,
        color: fg,
        border,
        boxShadow: isLightCard
          ? "-18px 24px 58px rgba(0, 0, 0, 0.42)"
          : "-20px 26px 64px rgba(0, 0, 0, 0.62)",
        padding: "clamp(26px, 2.6vw, 38px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        willChange: "transform",
        userSelect: "none",
      }}
    >
      {/* Optional CMS background image if uploaded in admin */}
      {item.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 1,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Top Header: Title */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <h3
          style={{
            margin: 0,
            fontFamily: displayFont,
            fontWeight: 700,
            fontSize: "clamp(26px, 2.35vw, 36px)",
            lineHeight: 1.05,
            letterSpacing: "-.035em",
            color: fg,
          }}
        >
          {item.title.charAt(0).toUpperCase() + item.title.slice(1).toLowerCase()}.
        </h3>
      </div>

      {/* Bottom Copy: Lead description + tags (matching Huge's bottom-anchored layout) */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 14 }}>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(14px, 1.05vw, 16px)",
            fontWeight: 600,
            lineHeight: 1.48,
            color: fg,
          }}
        >
          {item.description}
        </p>

        {item.tags.length > 0 && (
          <p
            style={{
              margin: 0,
              fontSize: "clamp(12.5px, 0.92vw, 14px)",
              fontWeight: 500,
              lineHeight: 1.45,
              color: subFg,
            }}
          >
            {item.tags.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CapabilitiesGridV2({ data }: CapabilitiesGridV2Props) {
  const items = toCapabilities(data);
  const runwayRef = useRef<HTMLElement | null>(null);
  const deckRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bgTextRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const runway = runwayRef.current;
    const deck = deckRef.current;
    if (!runway || !deck || !items.length) return;

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

    // Smooth ease-out with a gentle spring overshoot bounce at the end of the card's rise
    const easeOutBounceSpring = (t: number) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      // C1-continuous cubic Hermite with overshoot (~1.032 at t≈0.84) that settles softly to 1.0
      const c1 = 1.15;
      const c3 = c1 + 1;
      const p = t - 1;
      return 1 + c3 * p * p * p + c1 * p * p;
    };

    let targetProgress = 0;
    let currentProgress = 0;
    let raf: number | null = null;
    let initialized = false;

    const measureProgress = () => {
      const rect = runway.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollable = Math.max(1, rect.height - vh);
      // Start rising Card 0 right as the section locks near the top
      targetProgress = clamp((-rect.top + vh * 0.18) / (scrollable + vh * 0.12), 0, 1);
      if (!initialized) {
        currentProgress = targetProgress;
        initialized = true;
      }
    };

    const renderFrame = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // Silky exponential lerp toward target scroll progress so wheel ticks never jerk
      const diff = targetProgress - currentProgress;
      if (Math.abs(diff) > 0.0002) {
        currentProgress += diff * 0.13;
      } else {
        currentProgress = targetProgress;
      }

      const progress = currentProgress;
      const deckW = deck.clientWidth || Math.min(1360, vw - 48);
      const firstCard = cardRefs.current[0];
      const cardW = firstCard ? firstCard.offsetWidth : Math.min(360, vw * 0.26);
      const count = items.length;

      // Horizontal step between consecutive stacked cards
      const maxSpan = Math.max(0, deckW - cardW);
      const idealStep = cardW * 0.56;
      const stepX = count > 1 ? Math.min(idealStep, maxSpan / (count - 1)) : 0;
      const stepY = vw < 768 ? 14 : 8;

      // All `count` cards (including Card 0!) rise from the bottom one after another
      const stackProgress = clamp(progress / 0.9, 0, 1);
      const overlap = 0.78;
      const span = 1 / ((count - 1) * overlap + 1);
      const startY = vh * 0.96;

      // Precompute raw progress [0..1] for each card
      const cardT: number[] = [];
      for (let i = 0; i < count; i++) {
        const segStart = i * (span * overlap);
        cardT[i] = clamp((stackProgress - segStart) / span, 0, 1);
      }

      for (let i = 0; i < count; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;

        const rawT = cardT[i];
        const bouncedT = easeOutBounceSpring(rawT);

        const targetX = i * stepX;
        const baseTargetY = i % 2 === 1 ? -stepY : stepY * 0.5;

        // Subtle sympathetic bounce on this card right when the NEXT card (i + 1) lands on top of it
        let impactBounceY = 0;
        let impactScale = 1;
        if (i + 1 < count) {
          const nextT = cardT[i + 1];
          if (nextT > 0.65 && nextT < 1) {
            const pulse = Math.sin(((nextT - 0.65) / 0.35) * Math.PI);
            impactBounceY = pulse * 7;
            impactScale = 1 - pulse * 0.012;
          }
        }

        const curY = startY * (1 - bouncedT) + baseTargetY * bouncedT + impactBounceY;
        const baseTilt = CARD_TILTS[i % CARD_TILTS.length];
        const entrySpin = (1 - bouncedT) * (i % 2 === 0 ? -5.5 : 5.5);
        const curTilt = baseTilt + entrySpin;

        el.style.transform = `translate3d(${targetX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) rotate(${curTilt.toFixed(2)}deg) scale(${impactScale.toFixed(4)})`;
        el.style.zIndex = String(10 + i);
      }

      if (bgTextRef.current) {
        bgTextRef.current.style.transform = `translate3d(${(-progress * 36).toFixed(1)}px, 0, 0)`;
      }

      if (Math.abs(targetProgress - currentProgress) > 0.0002) {
        raf = requestAnimationFrame(renderFrame);
      } else {
        raf = null;
      }
    };

    const onScroll = () => {
      measureProgress();
      if (!raf) {
        raf = requestAnimationFrame(renderFrame);
      }
    };

    measureProgress();
    renderFrame();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items.length]);

  if (!items.length) return null;

  return (
    <section
      id="capabilities-grid"
      ref={runwayRef}
      data-reveal="1"
      data-cap-parallax="1"
      data-screen-label="Capabilities"
      data-nav-tone="dark"
      style={{
        position: "relative",
        zIndex: 1,
        // Tall scroll runway so each of the 5 cards stacks one-by-one as you scroll
        height: `${Math.max(280, items.length * 68)}vh`,
        background: "#02AA7A",
        color: CREAM,
      }}
    >
      {/* Sticky viewport stage holding the background headline and the stacking card deck */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100svh",
          width: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "clamp(40px, 6vh, 80px) clamp(18px, 3.6vw, 60px)",
        }}
      >
        <div
          data-cap-inner="1"
          style={{
            position: "relative",
            maxWidth: 1440,
            width: "100%",
            margin: "0 auto",
            height: "clamp(460px, 68vh, 620px)",
            display: "flex",
            alignItems: "center",
            willChange: "transform, filter",
          }}
        >
          {/* Giant background typography sitting behind the cards (visible on the right until covered) */}
          <div
            ref={bgTextRef}
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translate3d(0, 0, 0)",
              translate: "0 -50%",
              textAlign: "right",
              pointerEvents: "none",
              zIndex: 1,
              maxWidth: "min(680px, 90vw)",
              paddingRight: "clamp(8px, 2vw, 32px)",
            }}
          >
            <h2
              style={{
                fontFamily: displayFont,
                fontWeight: 700,
                fontSize: "clamp(48px, 7.6vw, 118px)",
                lineHeight: 0.92,
                letterSpacing: "-.045em",
                margin: "0 0 24px",
                color: "#FFFFFF",
              }}
            >
              <SectionHeading tone="dark" accent={1}>
                Our services
              </SectionHeading>
            </h2>
            <p
              style={{
                margin: "0 0 0 auto",
                fontSize: "clamp(15px, 1.2vw, 18px)",
                fontWeight: 600,
                lineHeight: 1.6,
                color: "rgba(255, 255, 255, 0.92)",
                maxWidth: "32ch",
              }}
            >
              Five disciplines, one team — from first sketch through launch, and sharp long after.
            </p>
          </div>

          {/* Card Stack Stage: Cards stack from left to right as you scroll */}
          <div
            ref={deckRef}
            style={{
              position: "relative",
              zIndex: 5,
              width: "100%",
              height: "clamp(380px, 56vh, 510px)",
            }}
          >
            {items.map((item, i) => (
              <StackCard
                key={item.key}
                item={item}
                index={i}
                cardRef={(el) => {
                  cardRefs.current[i] = el;
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
