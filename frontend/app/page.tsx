"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAbstraktMotion } from "../lib/v2/useAbstraktMotion";
import { useLenis } from "../lib/v2/useLenis";
import { useSectionReveal } from "../lib/v2/useSectionReveal";
import CustomCursor from "../components/v2/CustomCursor";
import NavV2 from "../components/v2/NavV2";
import ScrollProgressV2 from "../components/v2/ScrollProgressV2";
import HeroV2 from "../components/v2/HeroV2";
import TrustedByV2 from "../components/v2/TrustedByV2";
// CapabilitiesPetals removed from homepage 2026-09-05 — component kept in
// components/v2/CapabilitiesPetals.tsx and backed up to Downloads/my comp
// for reuse on other projects. Uncomment to restore:
// import CapabilitiesPetals from "../components/v2/CapabilitiesPetals";
import CapabilitiesGridV2 from "../components/v2/CapabilitiesGridV2";
// SeamBand removed from homepage 2026-09-07 — component kept in
// components/v2/SeamBand.tsx. Uncomment to restore:
// import SeamBand from "../components/v2/SeamBand";
import WorksCarousel from "../components/v2/WorksCarousel";
import SelectedWorkV2 from "../components/v2/SelectedWorkV2";
import TestimonialsV2 from "../components/v2/TestimonialsV2";
import FaqV2 from "../components/v2/FaqV2";
import ContactV2 from "../components/v2/ContactV2";
import FooterV2 from "../components/v2/FooterV2";
import SectionEmpty from "../components/v2/SectionEmpty";
import {
  HeroSkeleton,
  WorksSkeleton,
  CapabilitiesSkeleton,
  LogosSkeleton,
  FaqSkeleton,
} from "../components/ui/Skeleton";
// Stats, testimonials and careers copy have no CMS table and are rendered
// from these directly. The rest are imported for their TYPES only — they
// describe the shape each section expects, but are no longer rendered as
// fallback content: a section with no CMS data shows SectionEmpty instead.
import {
  heroContent,
  positionContent,
  logosContent,
  capabilitiesContent,
  workContent,
  faqContent,
  statsContent,
  testimonialsContent,
  contactContent,
} from "./content";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function hasIllustratedProjects(work: unknown): boolean {
  const projects = (work as { projects?: unknown } | null | undefined)?.projects;
  if (!Array.isArray(projects)) return false;
  return projects.some((p) => {
    const proj = p as { image?: string; thumbnailUrl?: string; videoThumbnailUrl?: string } | null;
    return Boolean(proj?.image || proj?.thumbnailUrl || proj?.videoThumbnailUrl);
  });
}

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);

  const [hero, setHero] = useState<typeof heroContent | null>(heroContent);
  const [position, setPosition] = useState<typeof positionContent | null>(positionContent);
  const [logos, setLogos] = useState<typeof logosContent | null>(logosContent);
  const [capabilities, setCapabilities] = useState<typeof capabilitiesContent | null>(capabilitiesContent);
  const [work, setWork] = useState<typeof workContent | null>(workContent);
  const [faq, setFaq] = useState<typeof faqContent | null>(faqContent);
  const [stats, setStats] = useState<typeof statsContent | null>(statsContent);
  const [testimonials, setTestimonials] = useState<typeof testimonialsContent | null>(testimonialsContent);
  const [contact, setContact] = useState<typeof contactContent | null>(contactContent);

  const [status, setStatus] = useState<"loading" | "ready">("ready");

  useEffect(() => {
    const applyCmsData = (data: any) => {
      if (data?.hero?.headlineLine1) setHero(data.hero);
      if (data?.position?.statement) setPosition(data.position);
      if (Array.isArray(data?.logos) && data.logos.length) setLogos(data.logos);
      const cmsPillars = data?.capabilities?.pillars;
      const pillarValues = Object.values(
        (cmsPillars || {}) as Record<string, { title?: string; label?: string } | null>
      );
      if (pillarValues.some((p) => p?.title || p?.label)) setCapabilities(data.capabilities);
      if (hasIllustratedProjects(data?.work)) setWork(data.work);
      if (Array.isArray(data?.faq?.questions) && data.faq.questions.length) {
        setFaq({ ...(data.faq || {}), questions: data.faq.questions });
      }
      if (Array.isArray(data?.stats) && data.stats.length) setStats(data.stats);
      if (Array.isArray(data?.testimonials) && data.testimonials.length) setTestimonials(data.testimonials);
      if (data?.contact?.email || data?.contact?.headlineLine1 || data?.contact?.skills) setContact(data.contact);
    };

    const cached = sessionStorage.getItem("ditsndots_content");
    if (cached) {
      try {
        applyCmsData(JSON.parse(cached));
      } catch (e) {}
    }

    fetch(`${API_BASE}/api/content`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`content API ${res.status}`);
        return res.json();
      })
      .then((data) => {
        applyCmsData(data);
        try {
          sessionStorage.setItem("ditsndots_content", JSON.stringify(data));
        } catch (e) {}
      })
      .catch((err) => {
        console.warn("[content] fetch failed, using static content fallback:", err);
      })
      .finally(() => setStatus("ready"));
  }, []);

  useLenis();
  useAbstraktMotion(rootRef, [hero, position, logos, capabilities, work, faq]);
  useSectionReveal(rootRef, [hero, position, logos, capabilities, work, faq]);

  /** A section renders its skeleton while the request is in flight and its
   *  fallback only once the request has settled — so the page never flashes
   *  "unavailable" at a visitor whose content is still a few hundred ms
   *  away, and never jumps from a spinner to mismatched shapes. Each
   *  skeleton mirrors its section's real layout. */
  const gate = (
    content: unknown,
    node: React.ReactNode,
    label: string,
    skeleton?: React.ReactNode
  ) => {
    if (content) return node;
    if (status === "loading") {
      if (skeleton) return skeleton;
      switch (label) {
        case "The homepage":
          return <HeroSkeleton />;
        case "Our work":
          return <WorksSkeleton />;
        case "Our capabilities":
          return <CapabilitiesSkeleton />;
        case "Our clients":
          return <LogosSkeleton />;
        // "Our process" no longer routes through gate() — the section renders
        // only when it has content, so it has no loading or empty state here.
        case "Frequently asked questions":
          return <FaqSkeleton />;
        default:
          return skeleton ?? null;
      }
    }
    return <SectionEmpty label={label} />;
  };

  return (
    <div
      className="ab-page-dark-end"
      style={{
        "--ab-bg": "#F7F6F3",
        "--ab-ink": "#0E0E0E",
        "--ab-brand": "#E84610",
        "--ab-brand-light": "#F2997C",
        "--ab-card": "#EAE9E4",
        "--ab-ink-deep": "#02AA7A",
        fontFamily: "var(--font-manrope), system-ui, sans-serif",
        background: "#02AA7A",
        color: "var(--ab-ink)",
      } as React.CSSProperties}
    >
      <div ref={rootRef} style={{ width: "100%", overflowX: "clip" }}>
        <CustomCursor />
        <NavV2 />
        <main
          id="top"
          data-screen-label="Home"
          style={{
            position: "relative",
            zIndex: 5,
            width: "100%",
          }}
        >
          {/* The positioning statement is rendered inside the hero rather
              than as its own section: the hero already ended on an empty
              full-screen black band, and the statement now occupies it. Its
              CMS copy is still fetched separately and passed down, so editing
              it in the admin works exactly as before — it is only gated with
              the hero now, since it no longer has a section of its own to
              hold a fallback. */}
          {gate(hero, <HeroV2 data={hero!} statement={position?.statement} />, "The homepage")}
          {/* Proof before credentials: show the work, then the range behind
              it, then the scale and the client list. The logo marquee earns
              more standing here than it did ahead of any of it. */}
          {gate(work, <WorksCarousel data={work!} />, "Our work")}
          {/* One pass at the CMS `pillars` payload: the bento grid. It was
              previously fed the `work` payload and titled as a work section —
              a second look at the same five projects the carousel above
              already shows. It was always meant to be a capability variant;
              this is that correction. */}
          {/* REMOVED 2026-09-05: petal flower showpiece taken off the homepage.
              Code preserved in components/v2/CapabilitiesPetals.tsx + backup in
              Downloads/my comp. Restore with:
              {gate(capabilities, <CapabilitiesPetals data={capabilities!} />, "Our capabilities")} */}
          {/* {gate(capabilities, <CapabilitiesPetals data={capabilities!} />, "Our capabilities")} */}
          {capabilities ? <CapabilitiesGridV2 data={capabilities} /> : null}
          {/* REMOVED 2026-09-07: dot-texture seam band between the ink
              capabilities grid and the cream client band. The ink → cream
              handoff is a straight cut now. Component preserved in
              components/v2/SeamBand.tsx. Restore with:
              {capabilities ? <SeamBand from="#0E0E0E" to="#F5F7FA" tone="ink" /> : null} */}
          {/* Client marks and the numbers behind them are one proof block,
              banded off by hairline rules — the stats are rendered inside
              TrustedByV2 rather than as their own section. */}
          {/* Single curved cream sheet wrapping TrustedBy, Testimonials, FAQ, and Contact */}
          <div
            data-light-sheet="1"
            data-nav-tone="light"
            style={{
              position: "relative",
              zIndex: 5,
              marginTop: -110,
              marginBottom: -130,
              background: "var(--ab-bg, #F7F6F3)",
              color: "var(--ab-ink, #0E0E0E)",
              borderRadius: "clamp(36px, 4vw, 56px)",
              willChange: "margin, border-radius",
            }}
          >
            {gate(
              logos?.length ? logos : null,
              <TrustedByV2 data={logos!} stats={stats || statsContent} />,
              "Our clients"
            )}
            <TestimonialsV2 data={testimonials || testimonialsContent} />
            {gate(
              faq?.questions?.length ? faq : null,
              <FaqV2 data={faq!} />,
              "Frequently asked questions"
            )}
            <ContactV2 data={contact || contactContent} />
          </div>
        </main>
        <FooterV2 />
      </div>
    </div>
  );
}
