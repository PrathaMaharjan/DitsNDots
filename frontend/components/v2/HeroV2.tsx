"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { getImageProps } from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./parallax-hero.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

interface HeroV2Props {
  // Accepted so the page's CMS wiring keeps compiling; the layer scene
  // does not read copy from it.
  data?: {
    headlineLine1?: string;
    description?: string;
  };
  /**
   * The positioning statement, revealed word by word as the reader scrolls
   * the hero's lower section.
   *
   * This used to be its own full-width section (PositionV2) sitting between
   * the hero and the works carousel. The hero already ended with an empty
   * 100vh black band — `.parallax__content`, a spacer the Osmo source used to
   * give the layer scene something to scroll against — so the reader crossed
   * a screen of nothing before reaching the statement. Putting the statement
   * in that band uses the space the hero was already spending.
   */
  statement?: string;
}

/** Fallback copy, previously PositionV2's own default. */
const DEFAULT_STATEMENT =
  "Your end-to-end partner for Web Development, AI Solutions, and Creative Media. We build the future, one dot at a time.";

// Hero title typewriter cycle: the brand stamps first, then the three
// verbs escalate. Timings ported from the previous site's hero.
const TYPEWRITER_WORDS = ["DITSNDOTS", "DESIGN", "BUILD", "GROW"];
const TYPE_MS = 120;
const HOLD_MS = 2200;
const DELETE_MS = 60;

// Original Osmo reference art, kept for comparison while the local scene
// is dialled in.
// const LAYER_IMAGES = {
//   three:
//     "https://cdn.prod.website-files.com/671752cd4027f01b1b8f1c7f/6717795be09b462b2e8ebf71_osmo-parallax-layer-3.webp",
//   two:
//     "https://cdn.prod.website-files.com/671752cd4027f01b1b8f1c7f/6717795b4d5ac529e7d3a562_osmo-parallax-layer-2.webp",
//   one:
//     "https://cdn.prod.website-files.com/671752cd4027f01b1b8f1c7f/6717795bb5aceca85011ad83_osmo-parallax-layer-1.webp",
// };

// Local hero art from /public/images/hero.
// Desktop uses 3 plates (`three` backmost, `two` studio lights, `one` foreground desk).
// Mobile (<= 768px) uses the dedicated portrait plates (`mobileview_layer2.png`
// backmost room + floor, `mobileview_layer1.png` foreground desk) and skips the middle layer.
const LAYER_IMAGES = {
  three: "/images/hero/layer3.1.jpg",
  two: "/images/hero/55.3.png",
  one: "/images/hero/layer1.1.png",
  mobileTwo: "/images/hero/mobileview_layer2.png",
  mobileOne: "/images/hero/mobileview_layer1.png",
};

const EMPTY_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// Straight from the source: layer 1 sits furthest back and is driven down
// hardest, cancelling most of the page's upward travel so it reads as near
// stationary. Layer 4 is the foreground and barely moves, so it sweeps up
// across the title on layer 3.
const DESKTOP_LAYERS = [
  { layer: "1", yPercent: 70 },
  { layer: "2", yPercent: 55 },
  { layer: "3", yPercent: 40 },
  { layer: "4", yPercent: 10 },
];

const MOBILE_LAYERS = [
  { layer: "1", yPercent: 62 },
  { layer: "3", yPercent: 36 },
  { layer: "4", yPercent: 8 },
];

/**
 * Isolated typewriter component so its 60-120ms character ticks never
 * re-render the parallax image layers or the 20+ positioning statement spans.
 */
const HeroTypewriterTitle = memo(function HeroTypewriterTitle() {
  const [typed, setTyped] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduced);
    if (reduced) {
      setTyped(TYPEWRITER_WORDS[0]);
      return;
    }

    let word = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const step = (current: string) => {
      const full = TYPEWRITER_WORDS[word];
      if (!deleting) {
        if (current.length < full.length) {
          const next = full.slice(0, current.length + 1);
          setTyped(next);
          timer = setTimeout(() => step(next), TYPE_MS);
        } else {
          timer = setTimeout(() => {
            deleting = true;
            step(full);
          }, HOLD_MS);
        }
      } else if (current.length > 0) {
        const next = current.slice(0, -1);
        setTyped(next);
        timer = setTimeout(() => step(next), DELETE_MS);
      } else {
        deleting = false;
        word = (word + 1) % TYPEWRITER_WORDS.length;
        step("");
      }
    };

    timer = setTimeout(() => step(""), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <h2 className="parallax__title" style={{ color: "#ffffff" }}>
      {typed
        ? typed.startsWith("DITSN")
          ? (
            <>
              {typed.slice(0, 4)}
              <span style={{ color: "#0082C8" }}>N</span>
              {typed.slice(5)}
            </>
          )
          : typed
        : "\u200b"}
      {!reducedMotion && <span className="parallax__cursor" aria-hidden="true" />}
    </h2>
  );
});

export default function HeroV2({ statement }: HeroV2Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const words = useMemo(
    () => (statement || DEFAULT_STATEMENT).trim().split(/\s+/),
    [statement]
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Next.js Image Optimization props (default quality 75 for Next 16 compatibility):
  // Mobile (<= 768px) downloads only mobileview_layer2 & mobileview_layer1 at phone widths;
  // Desktop (> 768px) downloads only layer3.1, layer2.3 & layer1.1.
  const desktopBack = getImageProps({
    alt: "",
    width: 1376,
    height: 768,
    quality: 75,
    sizes: "100vw",
    src: LAYER_IMAGES.three,
  }).props;

  const mobileBack = getImageProps({
    alt: "",
    width: 941,
    height: 1672,
    quality: 75,
    sizes: "100vw",
    src: LAYER_IMAGES.mobileTwo,
  }).props;

  const desktopMid = getImageProps({
    alt: "",
    width: 1376,
    height: 768,
    quality: 75,
    sizes: "100vw",
    src: LAYER_IMAGES.two,
  }).props;

  const desktopFront = getImageProps({
    alt: "",
    width: 1376,
    height: 768,
    quality: 75,
    sizes: "100vw",
    src: LAYER_IMAGES.one,
  }).props;

  const mobileFront = getImageProps({
    alt: "",
    width: 594,
    height: 1056,
    quality: 75,
    sizes: "100vw",
    src: LAYER_IMAGES.mobileOne,
  }).props;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        isMobile: "(max-width: 768px)",
        isDesktop: "(min-width: 769px)",
      },
      (context) => {
        const isMobile = Boolean(context.conditions?.isMobile);
        const activeLayers = isMobile ? MOBILE_LAYERS : DESKTOP_LAYERS;

        root.querySelectorAll<HTMLElement>("[data-parallax-layers]").forEach((triggerElement) => {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: triggerElement,
              start: "0% 0%",
              end: "100% 0%",
              scrub: 0,
              fastScrollEnd: true,
            },
          });
          activeLayers.forEach((layerObj, idx) => {
            tl.to(
              triggerElement.querySelectorAll(`[data-parallax-layer="${layerObj.layer}"]`),
              {
                yPercent: layerObj.yPercent,
                ease: "none",
                force3D: true,
              },
              idx === 0 ? undefined : "<"
            );
          });
        });
      },
      root
    );

    return () => mm.revert();
  }, [isMobile]);

  return (
    <div className="parallax" ref={rootRef} data-screen-label="Hero">
      <section className="parallax__header" data-nav-tone="light">
        <div className="parallax__nav-blur" aria-hidden="true" />
        <div className="parallax__visuals">
          <div className="parallax__black-line-overflow" />
          <div data-parallax-layers className="parallax__layers">
            {/* Layer 1 (Backmost room/wall background): mobileview_layer2 on mobile, layer3.1 on desktop */}
            {isMobile ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key="hero-back-mobile"
                src={mobileBack.src}
                srcSet={mobileBack.srcSet}
                sizes="100vw"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={941}
                height={1672}
                data-parallax-layer="1"
                alt=""
                className="parallax__layer-img"
              />
            ) : (
              <picture key="hero-back-desktop" className="parallax__layer-picture">
                <source media="(max-width: 768px)" srcSet={mobileBack.srcSet} sizes="100vw" />
                <source media="(min-width: 769px)" srcSet={desktopBack.srcSet} sizes="100vw" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={desktopBack.src}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  width={1376}
                  height={768}
                  data-parallax-layer="1"
                  alt=""
                  className="parallax__layer-img"
                />
              </picture>
            )}

            {/* Layer 2 (Middle studio lights): desktop only; skipped on mobile */}
            {!isMobile && (
              <picture className="parallax__layer-picture parallax__layer-picture--desktop-only">
                <source media="(max-width: 768px)" srcSet={EMPTY_PIXEL} />
                <source media="(min-width: 769px)" srcSet={desktopMid.srcSet} sizes="100vw" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={EMPTY_PIXEL}
                  loading="eager"
                  decoding="async"
                  width={1376}
                  height={768}
                  data-parallax-layer="2"
                  alt=""
                  className="parallax__layer-img parallax__layer-img--desktop-only"
                />
              </picture>
            )}

            <div data-parallax-layer="3" className="parallax__layer-title">
              <HeroTypewriterTitle />
            </div>

            {/* Layer 4 (Foreground desk setup): mobileview_layer1 on mobile, layer1.1 on desktop */}
            {isMobile ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key="hero-front-mobile"
                src={mobileFront.src}
                srcSet={mobileFront.srcSet}
                sizes="100vw"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={594}
                height={1056}
                data-parallax-layer="4"
                alt=""
                className="parallax__layer-img"
              />
            ) : (
              <picture key="hero-front-desktop" className="parallax__layer-picture">
                <source media="(max-width: 768px)" srcSet={mobileFront.srcSet} sizes="100vw" />
                <source media="(min-width: 769px)" srcSet={desktopFront.srcSet} sizes="100vw" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={desktopFront.src}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  width={1376}
                  height={768}
                  data-parallax-layer="4"
                  alt=""
                  className="parallax__layer-img"
                />
              </picture>
            )}
          </div>
          <div className="parallax__fade" />
        </div>
      </section>
      {/* The statement, in the black band the hero already ended on. The
          section is taller than the viewport with a sticky inner, which is
          what gives the word reveal scroll distance to scrub across — the
          same arrangement PositionV2 used, now inside the hero. Height is
          175vh against a 100vh sticky child, so the words light over 75vh.

          `data-reveal-sec` and `data-rw` are the hooks useAbstraktMotion
          reads; that hook queries by attribute, so it keeps driving this
          without knowing the markup moved. */}
      <section
        id="about"
        className="parallax__content"
        data-position-sheet="1"
        data-reveal-sec="1"
        data-screen-label="Position"
        data-nav-tone="light"
      >
        <div className="parallax__statement-sticky">
          <p className="parallax__statement" data-position-text="1">
            {words.map((w, i) => (
              <span key={i} data-rw="1" style={{ opacity: 0.2 }}>
                {w}{" "}
              </span>
            ))}
          </p>
        </div>
      </section>
    </div>
  );
}
