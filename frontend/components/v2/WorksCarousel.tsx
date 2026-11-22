"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { BRAND_LIGHT, INK, displayFont, bodyFont } from "./tokens";
import SectionHeading from "./SectionHeading";
import { getProjectSlug } from "../../lib/v2/workProjects";

interface ProjectData {
  id?: string | number;
  title: string;
  subtitle?: string;
  category?: string;
  client?: string;
  /** Static content.ts entries carry `image`; CMS projects carry
   *  `thumbnailUrl` (a data URI) instead — both are accepted. */
  image?: string;
  thumbnailUrl?: string;
  videoThumbnailUrl?: string;
}

interface WorksCarouselProps {
  data?: { projects: ProjectData[] };
}

/** Slots on the ring. The design fixes twelve at 30° apart; with fewer real
 *  projects than that the list is cycled to fill, which is what keeps the ring
 *  visually dense rather than leaving gaps between distant cards. */
const SLOTS = 12;

/** Ring geometry, lifted from the design: cards are 340×400 sitting at
 *  translateZ(-760px) from a 620px perspective. The radius is what sets how
 *  much the ring wraps away from the camera; the card size follows it. */
const CARD_W = 340;
const CARD_H = 400;
const RADIUS = 760;
const PERSPECTIVE = 620;

/** Seconds for one full revolution. */
const SPIN_SECONDS = 110;

/** Half-life (ms) of the ease between spinning and parked. The ring loses
 *  half its remaining speed every this-many ms, so a hover glides it to a
 *  stop over roughly a quarter second instead of snapping. */
const SPIN_RAMP_HALF_LIFE = 190;

/** Cards past this angle from front-centre are hidden — they are edge-on or
 *  behind the ring, and painting them costs compositing for nothing. */
const VISIBLE_ANGLE = 85;

/** The design's stage is authored at this height and scaled to fit. */
const STAGE_TALL = 672;

/** Height multiplier for the whole section. The section's min-height and the
 *  viewport-derived caps in `fit()` are scaled together, so the ring grows
 *  with the band instead of a taller section leaving dead space around a
 *  ring still sized to one screen. */
const SECTION_SCALE = 1.2;

/** Backdrop art: a dark studio wall, lit from the upper left, with leaf
 *  shadows at the left, empty frames on a plinth at the right and clean
 *  negative space through the middle. It carries no typography of its own,
 *  so it sits full-bleed behind the live heading and the ring both. */
const BG_SRC = "/images/our_works_bg.png";

/** Flip when the backdrop art is a dark variant: restores the ink field,
 *  light type and deep card shadows the ring was originally tuned for. */
const BG_IS_DARK = true;

const T = BG_IS_DARK
  ? {
      field: "#02AA7A",
      eyebrow: "#0B111A",
      heading: "#FFFFFF",
      body: "rgba(255, 255, 255, 0.92)",
      wash: "radial-gradient(120% 80% at 50% 46%, rgba(255, 255, 255, 0.12) 0%, rgba(2, 170, 122, 0) 72%)",
      cardShadow: "0 20px 48px rgba(0, 38, 26, 0.36), 0 0 0 1px rgba(247,246,243,0.18)",
      cardHoverShadow: `0 34px 74px rgba(0, 38, 26, 0.48), 0 0 0 2px #FFFFFF`,
      panelBg: "rgba(255, 255, 255, 0.96)",
      panelBorder: "1px solid rgba(11, 17, 26, 0.08)",
      panelShadow: "0 22px 54px rgba(0, 38, 26, 0.28)",
      panelName: "#0B111A",
      panelMeta: "#02AA7A",
      btnBg: "#0B111A",
      btnInk: "#FFFFFF",
      navTone: "dark",
    }
  : {
      // Cream artwork: type drops to ink, and the card shadows warm up and
      // lighten — a black drop shadow on cream reads as grime, not depth.
      field: "#EFE9E0",
      eyebrow: "#E84610",
      heading: "#141210",
      body: "rgba(32,28,24,.72)",
      wash: "linear-gradient(180deg, rgba(243,238,231,.86) 0%, rgba(243,238,231,.34) 34%, rgba(238,231,222,.30) 68%, rgba(232,224,213,.72) 100%)",
      cardShadow: "0 18px 44px rgba(84,64,44,0.22), 0 0 0 1px rgba(32,28,24,0.10)",
      cardHoverShadow: "0 30px 68px rgba(84,64,44,0.30), 0 0 0 1px rgba(232, 70, 16,0.55)",
      panelBg: "rgba(253,251,247,0.78)",
      panelBorder: "1px solid rgba(32,28,24,0.12)",
      panelShadow: "0 24px 60px rgba(84,64,44,0.24)",
      panelName: "#141210",
      panelMeta: "rgba(32,28,24,0.58)",
      btnBg: "#141210",
      btnInk: "#F7F6F3",
      navTone: "light",
    };

export default function WorksCarousel({ data }: WorksCarouselProps) {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const bandRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLDivElement | null>(null);
  const metaRef = useRef<HTMLDivElement | null>(null);

  const angle = useRef(0);
  const manualOffset = useRef(0);
  /** Target spin rate as a fraction of full speed: 1 running, 0 parked.
   *  `spin` eases toward it each frame rather than snapping, so hovering a
   *  card slows the ring to a stop over ~250ms and leaving it ramps back —
   *  the same treatment the logo marquee uses. */
  const paused = useRef(false);
  const spin = useRef(1);
  const last = useRef(0);
  const raf = useRef(0);

  /** The card the panel currently describes, and a grace timer for the gap
   *  between card and panel. Without the grace period the panel closes the
   *  instant the pointer leaves the card — including while it is travelling
   *  toward the panel's own button, which made "View Project" unclickable. */
  const activeCard = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  /** Distinct projects that actually have artwork, then cycled up to SLOTS so
   *  every position on the ring carries a card. A card with no image is an
   *  empty rectangle on a rotating ring, so unillustrated projects (the CMS
   *  holds several placeholder entries) are dropped rather than shown blank. */
  const slots = useMemo(() => {
    const seen = new Set<string>();
    const distinct = (data?.projects || [])
      .map((p) => ({ ...p, src: p.image || p.thumbnailUrl || p.videoThumbnailUrl || "" }))
      .filter((p) => {
        if (!p.src) return false;
        const key = p.src.slice(0, 200).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (!distinct.length) return [];
    return Array.from({ length: SLOTS }, (_, i) => distinct[i % distinct.length]);
  }, [data]);

  /** Scale the whole stage so the ring fits the viewport at any size. Mirrors
   *  the design's fit(): take the larger of a height- and a width-derived
   *  scale, clamp it, then size the band to the scaled stage. */
  const fit = useCallback(() => {
    const band = bandRef.current;
    const stage = stageRef.current;
    if (!band || !stage) return;
    // The section is SECTION_SCALE viewports tall, so the space the band has
    // to fill is that, not the raw viewport height.
    const h = window.innerHeight * SECTION_SCALE;
    const w = window.innerWidth;
    const kh = (h * 0.5) / STAGE_TALL;
    const kw = (w * 1.05) / 1520;
    const k = Math.max(0.3, Math.min(1.25, Math.max(kh, kw)));
    const bandH = Math.round(Math.min(STAGE_TALL * k, h * 0.68, h - 272));
    stage.style.transform = `scale(${k.toFixed(4)})`;
    stage.style.top = Math.round(bandH / 2 - 210 * k) + "px";
    band.style.height = bandH + "px";
  }, []);

  useEffect(() => {
    if (!slots.length) return;

    fit();
    window.addEventListener("resize", fit);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(fit);
      ro.observe(document.documentElement);
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** Rotate the ring, then counter-rotate each card toward the camera. The
     *  counter-rotation (-0.3 × its angle from centre) is what keeps cards
     *  readable as they swing around instead of turning fully edge-on. */
    const paint = () => {
      const el = ringRef.current;
      if (!el) return;
      el.style.transform = `rotateY(${angle.current}deg)`;
      const kids = el.children;
      const step = 360 / kids.length;
      for (let i = 0; i < kids.length; i++) {
        let p = (angle.current + i * step) % 360;
        if (p > 180) p -= 360;
        const a = Math.abs(p);
        const k = kids[i] as HTMLElement;
        if (a > VISIBLE_ANGLE) {
          if (k.style.visibility !== "hidden") k.style.visibility = "hidden";
          continue;
        }
        if (k.style.visibility === "hidden") k.style.visibility = "visible";
        const cr = (-0.3 * p).toFixed(2);
        k.style.transform = `rotateY(${k.dataset.a}deg) translateZ(-${RADIUS}px) rotateY(${cr}deg)`;
      }
    };

    if (reduced) {
      // Hold the ring still but keep the front cards laid out correctly.
      paint();
      return () => {
        window.removeEventListener("resize", fit);
        if (ro) ro.disconnect();
      };
    }

    const tick = (now: number) => {
      const dt = Math.min(now - last.current, 60);
      last.current = now;
      const period = SPIN_SECONDS * 1000;

      // Exponential ease toward the target rate. Framed as a half-life so the
      // ramp takes the same wall-clock time on 60Hz and 120Hz displays, and
      // so a hover-out mid-slowdown reverses smoothly instead of jumping.
      const target = paused.current ? 0 : 1;
      const k = 1 - Math.pow(0.5, dt / SPIN_RAMP_HALF_LIFE);
      spin.current += (target - spin.current) * k;
      if (Math.abs(target - spin.current) < 0.001) spin.current = target;

      if (spin.current > 0) {
        angle.current =
          (angle.current + (dt / period) * 360 * spin.current + 360) % 360;
      }
      if (Math.abs(manualOffset.current) > 0.05) {
        const step = manualOffset.current * (1 - Math.pow(0.5, dt / 80));
        angle.current = (angle.current + step + 3600) % 360;
        manualOffset.current -= step;
      }
      paint();
      raf.current = requestAnimationFrame(tick);
    };

    last.current = performance.now();
    raf.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", fit);
      if (ro) ro.disconnect();
    };
  }, [slots, fit]);

  /** Park the glass panel beside the hovered card, flipping to its left when
   *  there is no room on the right, and clamped inside the band either way. */
  const showPanel = useCallback((card: HTMLElement) => {
    const p = panelRef.current;
    if (!p) return;
    if (nameRef.current) nameRef.current.textContent = card.dataset.name || "";
    if (metaRef.current) metaRef.current.textContent = card.dataset.meta || "";
    const host = (p.offsetParent || p.parentElement) as HTMLElement | null;
    if (!host) return;
    const hb = host.getBoundingClientRect();
    const cb = card.getBoundingClientRect();
    const pw = 268;
    const ph = p.offsetHeight || 150;
    const cx = cb.left + cb.width / 2 - hb.left;
    const off = cb.width / 2 + pw / 2 + 18;
    let x = cx + off;
    if (x + pw / 2 > hb.width - 14) x = cx - off;
    x = Math.max(pw / 2 + 14, Math.min(hb.width - pw / 2 - 14, x));
    let y = cb.top - hb.top + cb.height / 2 - ph / 2;
    y = Math.max(14, Math.min(hb.height - ph - 14, y));
    p.style.setProperty("--px", Math.round(x) + "px");
    p.style.setProperty("--py", Math.round(y) + "px");
    p.style.setProperty("--po", "1");
    p.style.setProperty("--pty", "0px");
  }, []);

  /** Drop the lifted state on a card and hide the panel. */
  const closeNow = useCallback(() => {
    const c = activeCard.current;
    if (c) {
      c.style.setProperty("--ov", "0");
      c.style.setProperty("--iz", "1");
      c.style.setProperty("--lf", "1");
      c.style.removeProperty("--sh");
      c.style.zIndex = "";
      activeCard.current = null;
    }
    const p = panelRef.current;
    if (p) {
      p.style.setProperty("--po", "0");
      p.style.setProperty("--pty", "12px");
      p.style.pointerEvents = "none";
    }
    paused.current = false;
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  /** Close after a beat, so the pointer can cross the gap into the panel. */
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(closeNow, 220);
  }, [cancelClose, closeNow]);

  const cardIn = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      cancelClose();
      const c = e.currentTarget;
      // Moving straight from one card to another: drop the previous card's
      // lift before adopting the new one, or it stays raised for good.
      if (activeCard.current && activeCard.current !== c) {
        const prev = activeCard.current;
        prev.style.setProperty("--ov", "0");
        prev.style.setProperty("--iz", "1");
        prev.style.setProperty("--lf", "1");
        prev.style.removeProperty("--sh");
        prev.style.zIndex = "";
      }
      activeCard.current = c;
      c.style.setProperty("--ov", "1");
      c.style.setProperty("--iz", "1.07");
      c.style.setProperty("--lf", "1.09");
      c.style.setProperty("--sh", T.cardHoverShadow);
      c.style.zIndex = "6";
      // The ring must hold still while the panel is reachable — a moving card
      // drags the panel with it and the button walks away from the cursor.
      paused.current = true;
      showPanel(c);
      const p = panelRef.current;
      if (p) p.style.pointerEvents = "auto";
    },
    [showPanel, cancelClose]
  );

  const cardOut = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  if (!slots.length) return null;

  return (
    <section
      id="works"
      data-reveal="1"
      data-screen-label="Our works"
      data-nav-tone={T.navTone}
      style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        minHeight: `calc(100svh * ${SECTION_SCALE})`,
        overflow: "hidden",
        background: T.field,
        fontFamily: bodyFont,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Wash over the ground */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: T.wash }} />

      <div
        data-works-head="1"
        style={{
          position: "relative",
          zIndex: 3,
          flex: "0 0 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "min(680px, calc(100% - 64px))",
          margin: "0 auto",
          padding: "clamp(230px, 28vh, 320px) 0 0",
          boxSizing: "border-box",
          textAlign: "center",
          willChange: "transform, filter",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: displayFont,
            fontWeight: 700,
            fontSize: "clamp(38px,5.6vw,72px)",
            lineHeight: 0.96,
            letterSpacing: "-.03em",
            textTransform: "uppercase",
            color: T.heading,
          }}
        >
          <span data-rv="line">
            <span>
              <SectionHeading tone={BG_IS_DARK ? "dark" : "light"}>Our Works</SectionHeading>
            </span>
          </span>
        </h2>
        <p
          data-rv="up"
          style={{
            ["--rv-i" as string]: 2,
            margin: "18px auto 0",
            maxWidth: 440,
            fontSize: "clamp(14px,1.1vw,16px)",
            lineHeight: 1.6,
            color: T.body,
            textWrap: "pretty",
          }}
        >
          Explore our curated portfolio of digital transformations, engineered with precision and creative flair.
        </p>
      </div>

      {/* The band clips the ring; the stage inside is scaled to fit by fit(). */}
      <div
        ref={bandRef}
        data-rv="scale"
        onMouseLeave={scheduleClose}
        style={{ ["--rv-i" as string]: 3, position: "relative", flex: "0 0 auto", marginTop: -36, width: "100%", height: 342, zIndex: 2, overflow: "hidden" }}
      >
        <div
          ref={stageRef}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 420,
            perspective: `${PERSPECTIVE}px`,
            perspectiveOrigin: "50% 50%",
            transformOrigin: "50% 0",
            transform: "scale(0.855)",
          }}
        >
          <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, transformStyle: "preserve-3d", transform: `translateZ(${Math.round(RADIUS * 0.408)}px)` }}>
            <div ref={ringRef} style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transformStyle: "preserve-3d" }}>
              {slots.map((project, i) => {
                const a = ((360 / SLOTS) * i).toFixed(3);
                const slug = getProjectSlug(project, i);
                return (
                  <Link
                    key={i}
                    href={`/work/${slug}`}
                    onClick={() => {
                      try {
                        sessionStorage.setItem("ditsndots_work_back", "/");
                      } catch {}
                    }}
                    data-a={a}
                    data-name={project.title || project.client}
                    data-meta={project.subtitle || project.category || ""}
                    onMouseEnter={cardIn}
                    onMouseLeave={cardOut}
                    style={{
                      position: "absolute",
                      left: -CARD_W / 2,
                      top: -CARD_H / 2,
                      width: CARD_W,
                      height: CARD_H,
                      transform: `rotateY(${a}deg) translateZ(-${RADIUS}px)`,
                      backfaceVisibility: "hidden",
                      cursor: "pointer",
                      textDecoration: "none",
                      color: "inherit",
                      display: "block",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 7,
                        overflow: "hidden",
                        background: BG_IS_DARK ? "#1A1A1A" : "#E4DCD1",
                        boxShadow: `var(--sh, ${T.cardShadow})`,
                        transform: "scale(var(--lf, 1))",
                        transition: "transform 0.55s cubic-bezier(.22,1,.36,1), box-shadow 0.55s ease",
                      }}
                    >
                      {project.src && (
                        <img
                          src={project.src}
                          alt={project.title}
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            transform: "scale(var(--iz, 1))",
                            transition: "transform 0.9s cubic-bezier(.22,1,.36,1)",
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg, rgba(11,17,26,0) 36%, rgba(11,17,26,0.68) 72%, rgba(11,17,26,0.92) 100%)",
                          opacity: "var(--ov, 0)",
                          transition: "opacity 0.4s cubic-bezier(.22,1,.36,1)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                          padding: "22px 22px",
                          pointerEvents: "none",
                        }}
                      >
                        {(project.subtitle || project.category) && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: ".14em",
                              textTransform: "uppercase",
                              color: "#02AA7A",
                              marginBottom: 6,
                            }}
                          >
                            {project.subtitle || project.category}
                          </span>
                        )}
                        <span
                          style={{
                            fontFamily: displayFont,
                            fontWeight: 700,
                            fontSize: 22,
                            lineHeight: 1.18,
                            letterSpacing: "-.02em",
                            color: "#FFFFFF",
                          }}
                        >
                          {project.title}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Prev Arrow on Far Left | Explore More in Center | Next Arrow on Far Right */}
      <div
        data-rv="up"
        style={{
          ["--rv-i" as string]: 4,
          position: "relative",
          zIndex: 4,
          width: "100%",
          maxWidth: 1520,
          margin: "-84px auto 36px",
          padding: "0 clamp(24px, 4vw, 64px)",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Far Left: Bare Previous Arrow */}
        <button
          type="button"
          aria-label="Previous project card"
          onClick={() => {
            manualOffset.current -= 360 / SLOTS;
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            border: "none",
            background: "transparent",
            color: "#FFFFFF",
            cursor: "pointer",
            transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease",
            opacity: 0.88,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateX(-4px)";
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateX(0)";
            e.currentTarget.style.opacity = "0.88";
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Center: Explore More Pill -> links to the full /work page */}
        <Link
          href="/work"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            height: 46,
            padding: "0 26px",
            borderRadius: 999,
            background: "rgba(11, 17, 26, 0.24)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.34)",
            color: "#FFFFFF",
            fontSize: 13.5,
            fontWeight: 700,
            letterSpacing: "0.02em",
            textDecoration: "none",
            whiteSpace: "nowrap",
            transition: "background 0.28s cubic-bezier(0.22, 1, 0.36, 1), color 0.28s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.28s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#FFFFFF";
            e.currentTarget.style.color = "#0B111A";
            e.currentTarget.style.borderColor = "#FFFFFF";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(11, 17, 26, 0.24)";
            e.currentTarget.style.color = "#FFFFFF";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.34)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <span>Explore More</span>
          <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>&rarr;</span>
        </Link>

        {/* Far Right: Bare Next Arrow */}
        <button
          type="button"
          aria-label="Next project card"
          onClick={() => {
            manualOffset.current += 360 / SLOTS;
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            border: "none",
            background: "transparent",
            color: "#FFFFFF",
            cursor: "pointer",
            transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease",
            opacity: 0.88,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateX(4px)";
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateX(0)";
            e.currentTarget.style.opacity = "0.88";
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
}
