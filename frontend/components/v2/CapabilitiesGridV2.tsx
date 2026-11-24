"use client";

import React, { useEffect, useRef, useState } from "react";
import { displayFont } from "./tokens";
import SectionHeading from "./SectionHeading";
import GreenWavePattern from "./GreenWavePattern";
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
  const hasImage = Boolean(item.image);
  const bg = hasImage ? "#111111" : isLightCard ? "#F5F3EE" : "#111111";
  const fg = hasImage ? "#FFFFFF" : isLightCard ? "#0E0E0E" : "#F7F6F3";
  const subFg = hasImage
    ? "rgba(255, 255, 255, 0.82)"
    : isLightCard
    ? "rgba(14, 14, 14, 0.66)"
    : "rgba(247, 246, 243, 0.68)";
  const accentColor = isLightCard ? "#0082C8" : "#38BDF8";

  return (
    <div
      ref={cardRef}
      className="ab-service-card-wrap"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "min(370px, max(255px, 26vw), calc(100vw - 44px))",
        height: "clamp(340px, 52vh, 510px)",
        willChange: "transform",
        userSelect: "none",
      }}
    >
      <div
        className="ab-service-card-inner"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 22,
          background: bg,
          color: fg,
          border: "none",
          boxShadow: isLightCard
            ? "-18px 24px 58px rgba(0, 0, 0, 0.42)"
            : "-20px 26px 64px rgba(0, 0, 0, 0.62)",
          padding: "clamp(26px, 2.6vw, 38px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        {/* Optional CMS background image + subtle dimming scrim so text stays legible */}
        {item.image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              className="ab-service-card-img"
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
            <div
              aria-hidden="true"
              className="ab-service-card-scrim"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0, 0, 0, 0.14) 0%, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.38) 100%)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
          </>
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

        {/* Bottom Copy: Lead description (revealed smoothly on hover) */}
        <div
          className="ab-service-card-details"
          style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 14 }}
        >
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
        </div>
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
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (isMobile) return;
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
      // Start rising Card 0 early as Our Services enters the viewport so the left side isn't empty
      targetProgress = clamp((-rect.top + vh * 0.52) / (scrollable + vh * 0.42), 0, 1);
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

      // Only allow hover pop-up once ALL cards have finished rising into place
      const allCardsUp = count > 0 && cardT[count - 1] >= 0.96;
      if (allCardsUp) {
        if (deck.dataset.deckReady !== "1") deck.dataset.deckReady = "1";
      } else if (deck.dataset.deckReady === "1") {
        delete deck.dataset.deckReady;
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
  }, [items.length, isMobile]);

  if (!items.length) return null;

  const scrollMobileTo = (idx: number) => {
    const track = mobileTrackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    const slide = track.children[clamped] as HTMLElement | undefined;
    if (slide) {
      slide.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
    setMobileIndex(clamped);
  };

  const handleMobileScroll = () => {
    const track = mobileTrackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let bestDist = Infinity;
    Array.from(track.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(elCenter - center);
      if (dist < bestDist) {
        bestDist = dist;
        closest = i;
      }
    });
    setMobileIndex(closest);
  };

  if (isMobile) {
    return (
      <section
        id="capabilities-grid"
        data-reveal="1"
        data-screen-label="Capabilities"
        data-nav-tone="dark"
        style={{
          position: "relative",
          zIndex: 1,
          background: "#0082C8",
          color: CREAM,
          padding: "52px 0 128px",
          overflow: "hidden",
        }}
      >
        <GreenWavePattern flip />
        <style>{`
          .ab-mobile-srv-track {
            display: flex;
            gap: 16px;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding: 8px 9vw 18px;
          }
          .ab-mobile-srv-track::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Centered Mobile Header */}
          <div style={{ textAlign: "center", padding: "0 20px 28px" }}>
            <h2
              style={{
                fontFamily: displayFont,
                fontWeight: 700,
                fontSize: "clamp(38px, 11vw, 54px)",
                lineHeight: 0.96,
                letterSpacing: "-.04em",
                margin: "0 0 14px",
                color: "#FFFFFF",
              }}
            >
              <SectionHeading tone="dark" accent={1}>
                Our services
              </SectionHeading>
            </h2>
            <p
              style={{
                margin: "0 auto",
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.55,
                color: "rgba(255, 255, 255, 0.9)",
                maxWidth: "32ch",
              }}
            >
              Five disciplines, one team — from first sketch through launch, and sharp long after.
            </p>
          </div>

          {/* Swipeable Horizontal Carousel Track */}
          <div
            ref={mobileTrackRef}
            onScroll={handleMobileScroll}
            className="ab-mobile-srv-track"
          >
            {items.map((item, idx) => {
              const hasImage = Boolean(item.image);
              const isLight = idx % 2 === 1;
              const bg = hasImage ? "#111111" : isLight ? "#F5F3EE" : "#111111";
              const fg = hasImage ? "#FFFFFF" : isLight ? "#0E0E0E" : "#F7F6F3";

              return (
                <div
                  key={item.key}
                  style={{
                    flex: "0 0 82vw",
                    maxWidth: 340,
                    height: 400,
                    scrollSnapAlign: "center",
                    position: "relative",
                    borderRadius: 22,
                    background: bg,
                    color: fg,
                    overflow: "hidden",
                    padding: 26,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 20px 44px rgba(0, 24, 48, 0.34)",
                  }}
                >
                  {item.image && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                          filter: "brightness(0.76) saturate(1.15)",
                          pointerEvents: "none",
                        }}
                      />
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.08) 45%, rgba(0,0,0,0.62) 100%)",
                          pointerEvents: "none",
                        }}
                      />
                    </>
                  )}

                  <h3
                    style={{
                      position: "relative",
                      zIndex: 2,
                      margin: 0,
                      fontFamily: displayFont,
                      fontWeight: 700,
                      fontSize: 28,
                      lineHeight: 1.06,
                      letterSpacing: "-.035em",
                      color: fg,
                    }}
                  >
                    {item.title.charAt(0).toUpperCase() + item.title.slice(1).toLowerCase()}.
                  </h3>

                  <p
                    style={{
                      position: "relative",
                      zIndex: 2,
                      margin: 0,
                      fontSize: 14.5,
                      fontWeight: 600,
                      lineHeight: 1.5,
                      color: fg,
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Mobile Controls: Prev Arrow | Dots | Next Arrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              marginTop: 14,
              padding: "0 20px",
            }}
          >
            <button
              type="button"
              onClick={() => scrollMobileTo(mobileIndex - 1)}
              disabled={mobileIndex === 0}
              aria-label="Previous service"
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: "1px solid rgba(255, 255, 255, 0.36)",
                background: "rgba(11, 17, 26, 0.2)",
                color: "#FFFFFF",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: mobileIndex === 0 ? 0.35 : 1,
                cursor: mobileIndex === 0 ? "default" : "pointer",
              }}
            >
              &larr;
            </button>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              {items.map((item, i) => (
                <button
                  key={item.key}
                  type="button"
                  aria-label={`Go to ${item.title}`}
                  onClick={() => scrollMobileTo(i)}
                  style={{
                    width: i === mobileIndex ? 22 : 7,
                    height: 7,
                    padding: 0,
                    border: "none",
                    borderRadius: 999,
                    background:
                      i === mobileIndex ? "#FFFFFF" : "rgba(255, 255, 255, 0.38)",
                    transition: "width 0.25s ease, background 0.25s ease",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollMobileTo(mobileIndex + 1)}
              disabled={mobileIndex === items.length - 1}
              aria-label="Next service"
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: "1px solid rgba(255, 255, 255, 0.36)",
                background: "rgba(11, 17, 26, 0.2)",
                color: "#FFFFFF",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: mobileIndex === items.length - 1 ? 0.35 : 1,
                cursor: mobileIndex === items.length - 1 ? "default" : "pointer",
              }}
            >
              &rarr;
            </button>
          </div>
        </div>
      </section>
    );
  }

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
        background: "#0082C8",
        color: CREAM,
      }}
    >
      {/* Sticky viewport stage holding the background headline and the stacking card deck */}
      <style>{`
        .ab-service-card-inner {
          transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.38s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }
        .ab-service-card-img {
          filter: brightness(0.76) saturate(1.18);
          transition: filter 0.38s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-service-card-scrim {
          opacity: 1;
          transition: opacity 0.38s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-service-card-details {
          opacity: 0;
          transform: translate3d(0, 14px, 0);
          pointer-events: none;
          transition: opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
        }
        [data-deck-ready="1"] .ab-service-card-wrap {
          cursor: pointer;
        }
        [data-deck-ready="1"] .ab-service-card-wrap:hover {
          z-index: 60 !important;
        }
        [data-deck-ready="1"] .ab-service-card-wrap:hover .ab-service-card-inner {
          transform: translate3d(0, -28px, 0) scale(1.05);
          box-shadow: 0 36px 84px rgba(0, 22, 44, 0.55) !important;
        }
        [data-deck-ready="1"] .ab-service-card-wrap:hover .ab-service-card-img {
          filter: brightness(1) saturate(1.12);
          transform: scale(1.03);
        }
        [data-deck-ready="1"] .ab-service-card-wrap:hover .ab-service-card-scrim {
          opacity: 0.72;
        }
        [data-deck-ready="1"] .ab-service-card-wrap:hover .ab-service-card-details {
          opacity: 1;
          transform: translate3d(0, 0, 0);
          pointer-events: auto;
        }
        @media (hover: none) {
          .ab-service-card-details {
            opacity: 1;
            transform: none;
            pointer-events: auto;
          }
        }
      `}</style>
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
        <GreenWavePattern flip />
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
