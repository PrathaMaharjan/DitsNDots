"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SectionHeading from "./SectionHeading";
import { displayFont, bodyFont } from "./tokens";
import { getLenis } from "../../lib/v2/useLenis";
import {
  WorkProject,
  getCaseStudyMeta,
  getProjectImage,
  getProjectSlug,
  mergeWithStaticProjects,
} from "../../lib/v2/workProjects";

export type WorkSheetView =
  | { mode: "closed" }
  | { mode: "catalog" }
  | { mode: "detail"; slug: string; fromCatalog?: boolean };

interface WorkSheetDrawerProps {
  view: WorkSheetView;
  projects?: WorkProject[];
  onChangeView: (next: WorkSheetView) => void;
}

export default function WorkSheetDrawer({
  view,
  projects: rawProjects,
  onChangeView,
}: WorkSheetDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const sheetOpen = view.mode !== "closed";
  const projects = useMemo(() => mergeWithStaticProjects(rawProjects), [rawProjects]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset scroll to top when switching between catalog and detail view inside the sheet
  useEffect(() => {
    if (overlayRef.current && sheetOpen) {
      overlayRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [view, sheetOpen]);

  // Same GPU-composited scroll-driven expand & shrink as Start a Project
  useEffect(() => {
    const lenis = getLenis();
    const overlay = overlayRef.current;
    const card = cardRef.current;

    if (!sheetOpen) {
      delete document.documentElement.dataset.menuOpen;
      document.body.style.overflow = "";
      lenis?.start();
      return;
    }

    document.documentElement.dataset.menuOpen = "1";
    document.body.style.overflow = "hidden";
    lenis?.stop();

    if (overlay) {
      overlay.scrollTop = 0;
    }

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

    let targetP = 0;
    let currentP = 0;
    let raf: number | null = null;
    let lastTime = performance.now();
    let touchLastY = 0;

    let entranceComplete = false;
    const entranceTimer = window.setTimeout(() => {
      entranceComplete = true;
      if (card) {
        card.style.transition = "none";
      }
      applyMorph(currentP);
    }, 860);

    const applyMorph = (p: number) => {
      if (!card) return;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const smooth = p * p * p * (p * (p * 6 - 15) + 10);

      const maxInset = Math.min(38, Math.max(16, vw * 0.025));
      const topGap = (1 - smooth) * vh * 0.19;
      const minScaleX = Math.max(0.9, (vw - maxInset * 2) / Math.max(vw, 1));
      const scaleX = minScaleX + (1 - minScaleX) * smooth;
      const radius = (1 - smooth) * 44;

      if (entranceComplete) {
        card.style.transform = `translate3d(0, ${topGap.toFixed(2)}px, 0) scaleX(${scaleX.toFixed(5)})`;
      }
      card.style.borderTopLeftRadius = `${radius.toFixed(1)}px`;
      card.style.borderTopRightRadius = `${radius.toFixed(1)}px`;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const alpha = 1 - Math.exp(-11.5 * dt);
      currentP += (targetP - currentP) * alpha;

      if (Math.abs(targetP - currentP) < 0.0003) {
        currentP = targetP;
      }

      applyMorph(currentP);

      if (Math.abs(targetP - currentP) > 0.0003) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    };

    const kick = () => {
      if (!raf) {
        lastTime = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!overlay) return;
      if (!entranceComplete) {
        entranceComplete = true;
        window.clearTimeout(entranceTimer);
        if (card) card.style.transition = "none";
      }

      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 32;
      else if (e.deltaMode === 2) dy *= window.innerHeight * 0.8;

      if (dy > 0 && targetP < 1) {
        e.preventDefault();
        targetP = clamp(targetP + dy / 420, 0, 1);
        kick();
        return;
      }
      if (dy < 0 && overlay.scrollTop <= 2 && targetP > 0) {
        e.preventDefault();
        targetP = clamp(targetP + dy / 420, 0, 1);
        kick();
        return;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length) {
        touchLastY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!overlay || !e.touches.length) return;
      if (!entranceComplete) {
        entranceComplete = true;
        window.clearTimeout(entranceTimer);
        if (card) card.style.transition = "none";
      }

      const curY = e.touches[0].clientY;
      const dy = touchLastY - curY;
      touchLastY = curY;

      if (dy > 0 && targetP < 1) {
        e.preventDefault();
        targetP = clamp(targetP + dy / 340, 0, 1);
        kick();
      } else if (dy < 0 && overlay.scrollTop <= 2 && targetP > 0) {
        e.preventDefault();
        targetP = clamp(targetP + dy / 340, 0, 1);
        kick();
      }
    };

    const onResize = () => applyMorph(currentP);

    if (card) {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const maxInset = Math.min(38, Math.max(16, vw * 0.025));
      const minScaleX = Math.max(0.9, (vw - maxInset * 2) / Math.max(vw, 1));
      card.style.transition = "transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)";
      card.style.transform = `translate3d(0, ${(vh * 0.19).toFixed(2)}px, 0) scaleX(${minScaleX.toFixed(5)})`;
      card.style.borderTopLeftRadius = "44px";
      card.style.borderTopRightRadius = "44px";
    }

    overlay?.addEventListener("wheel", onWheel, { passive: false });
    overlay?.addEventListener("touchstart", onTouchStart, { passive: true });
    overlay?.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(entranceTimer);
      overlay?.removeEventListener("wheel", onWheel);
      overlay?.removeEventListener("touchstart", onTouchStart);
      overlay?.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      if (card) {
        card.style.transition = "transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)";
        card.style.transform = "translate3d(0, 105vh, 0) scaleX(0.95)";
      }
      delete document.documentElement.dataset.menuOpen;
      document.body.style.overflow = "";
      getLenis()?.start();
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChangeView({ mode: "closed" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, onChangeView]);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    projects.forEach((p) => {
      const cat = (p.category || p.serviceType || "").trim();
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (activeCategory === "All") return projects;
    return projects.filter(
      (p) => (p.category || p.serviceType || "").trim().toLowerCase() === activeCategory.toLowerCase()
    );
  }, [projects, activeCategory]);

  const activeSlug = view.mode === "detail" ? view.slug : "";
  const { currentProject, nextProject, prevProject } = useMemo(() => {
    if (!projects.length) {
      return { currentProject: null, nextProject: null, prevProject: null };
    }
    let idx = projects.findIndex(
      (p, i) => getProjectSlug(p, i) === activeSlug || String(p.id) === activeSlug
    );
    if (idx < 0) idx = 0;
    return {
      currentProject: projects[idx],
      nextProject: projects[(idx + 1) % projects.length],
      prevProject: projects[(idx - 1 + projects.length) % projects.length],
    };
  }, [projects, activeSlug]);

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        .ab-ws-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9998;
          background: rgba(14, 14, 14, 0.5);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ab-ws-backdrop[data-open="1"] {
          opacity: 1;
          pointer-events: auto;
        }
        .ab-ws-scroller {
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
          pointer-events: none;
          font-family: ${bodyFont};
        }
        .ab-ws-scroller::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        .ab-ws-scroller[data-open="1"] {
          pointer-events: auto;
        }
        .ab-ws-card {
          position: relative;
          min-height: 100vh;
          width: 100%;
          background: #F7F6F3;
          color: #0E0E0E;
          border-radius: 44px 44px 0 0;
          padding: clamp(48px, 7vh, 88px) clamp(24px, 5.5vw, 96px) clamp(72px, 10vh, 120px);
          box-sizing: border-box;
          transform-origin: center top;
          transform: translate3d(0, 105vh, 0) scaleX(0.95);
          transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, border-radius;
        }
        .ab-ws-close {
          position: sticky;
          top: 28px;
          float: right;
          margin-top: -12px;
          margin-right: -12px;
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 1px solid #D6D5CF;
          background: #EAE9E4;
          color: #0E0E0E;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          transition: background 0.25s ease, color 0.25s ease, transform 0.25s ease;
        }
        .ab-ws-close:hover {
          background: #0E0E0E;
          color: #F7F6F3;
          transform: scale(1.06);
        }
        .ab-ws-filter-pill {
          height: 40px;
          padding: 0 20px;
          border-radius: 999px;
          border: 1px solid #D6D5CF;
          background: transparent;
          color: #0E0E0E;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 700;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: background 0.25s cubic-bezier(0.22, 1, 0.36, 1),
                      color 0.25s ease,
                      border-color 0.25s ease,
                      transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-ws-filter-pill:hover {
          border-color: #0E0E0E;
          transform: translateY(-1.5px);
        }
        .ab-ws-filter-pill[data-active="1"] {
          background: #0082C8;
          border-color: #0082C8;
          color: #FFFFFF;
        }
        .ab-ws-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: clamp(28px, 3.6vw, 52px);
        }
        .ab-ws-proj-card {
          position: relative;
          display: flex;
          flex-direction: column;
          text-align: left;
          padding: 0;
          border: none;
          background: transparent;
          color: inherit;
          font-family: inherit;
          cursor: pointer;
        }
        .ab-ws-thumb-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10.5;
          border-radius: 24px;
          overflow: hidden;
          background: #EAE9E4;
          border: 1px solid rgba(14, 14, 14, 0.08);
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-ws-proj-card:hover .ab-ws-thumb-wrap {
          transform: translateY(-6px);
          box-shadow: 0 24px 52px rgba(14, 14, 14, 0.14);
        }
        .ab-ws-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-ws-proj-card:hover .ab-ws-thumb-img {
          transform: scale(1.045);
        }
        .ab-ws-thumb-badge {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          height: 30px;
          padding: 0 13px;
          border-radius: 999px;
          background: rgba(14, 14, 14, 0.72);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .ab-ws-thumb-arrow {
          position: absolute;
          bottom: 16px;
          right: 16px;
          z-index: 2;
          width: 44px;
          height: 44px;
          border-radius: 999px;
          background: #0082C8;
          color: #FFFFFF;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
          transform: translateY(8px) scale(0.92);
          opacity: 0;
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease;
        }
        .ab-ws-proj-card:hover .ab-ws-thumb-arrow {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
        .ab-ws-proj-title {
          margin: 0;
          font-family: ${displayFont};
          font-weight: 700;
          font-size: clamp(22px, 2.1vw, 32px);
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: #0E0E0E;
          transition: color 0.25s ease;
        }
        .ab-ws-proj-card:hover .ab-ws-proj-title {
          color: #0082C8;
        }
        .ab-ws-meta-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 24px;
          padding: clamp(24px, 3.5vh, 38px) 0;
          border-top: 1px solid #E2E1DB;
          border-bottom: 1px solid #E2E1DB;
        }
        .ab-ws-split {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: clamp(24px, 3.5vw, 52px);
        }
        .ab-ws-outcomes {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(18px, 2.5vw, 32px);
        }
        .ab-ws-nav-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: clamp(26px, 3.8vh, 42px) clamp(24px, 3.2vw, 42px);
          border-radius: 24px;
          background: #EAE9E4;
          border: 1px solid #DEDDD7;
          color: #0E0E0E;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.32s ease;
        }
        .ab-ws-nav-card:hover {
          transform: translateY(-4px);
          border-color: #0082C8;
        }
        @media (max-width: 860px) {
          .ab-ws-grid,
          .ab-ws-split,
          .ab-ws-outcomes {
            grid-template-columns: minmax(0, 1fr);
          }
          .ab-ws-meta-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>

      <div
        className="ab-ws-backdrop"
        data-open={sheetOpen ? "1" : "0"}
        aria-hidden="true"
      />

      <div
        ref={overlayRef}
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-label={view.mode === "detail" ? "Project case study" : "Selected works"}
        className="ab-ws-scroller"
        data-open={sheetOpen ? "1" : "0"}
        aria-hidden={!sheetOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) onChangeView({ mode: "closed" });
        }}
      >
        <div ref={cardRef} className="ab-ws-card">
          <button
            type="button"
            className="ab-ws-close"
            onClick={() => onChangeView({ mode: "closed" })}
            aria-label="Close works drawer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>

          <div style={{ maxWidth: 1400, width: "100%", margin: "0 auto", clear: "both" }}>
            {view.mode === "detail" && currentProject ? (
              /* =========================================================
                 MINIMAL INDIVIDUAL PROJECT VIEW (Images + Short Copy + Proof Links)
                 ========================================================= */
              (() => {
                const meta = getCaseStudyMeta(currentProject);

                return (
                  <div style={{ maxWidth: 1120, margin: "0 auto" }}>
                    {/* Top Row: Back to All Works + Category */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 14,
                        marginBottom: 24,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button
                          type="button"
                          onClick={() => onChangeView({ mode: "catalog" })}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 16px",
                            borderRadius: 999,
                            border: "1px solid #D6D5CF",
                            background: "#EAE9E4",
                            fontFamily: "inherit",
                            fontSize: 12.5,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "#0E0E0E",
                            cursor: "pointer",
                            transition: "background 0.25s ease, color 0.25s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#0082C8";
                            e.currentTarget.style.color = "#FFFFFF";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#EAE9E4";
                            e.currentTarget.style.color = "#0E0E0E";
                          }}
                        >
                          <span aria-hidden="true">&larr;</span>
                          <span>All Works</span>
                        </button>

                        <span style={{ color: "#D6D5CF" }}>/</span>

                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "#0082C8",
                          }}
                        >
                          {currentProject.category || currentProject.subtitle || "Project"}
                        </span>
                      </div>

                      {/* Tags */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {meta.services.map((srv) => (
                          <span
                            key={srv}
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              padding: "5px 12px",
                              borderRadius: 999,
                              background: "#EAE9E4",
                              color: "#0E0E0E",
                            }}
                          >
                            {srv}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Title & Short Description + Proof of Work Links */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "flex-end",
                        justifyContent: "space-between",
                        gap: 24,
                        paddingBottom: 32,
                        marginBottom: 36,
                        borderBottom: "1px solid #E2E1DB",
                      }}
                    >
                      <div style={{ maxWidth: 680 }}>
                        <h2
                          style={{
                            margin: 0,
                            fontFamily: displayFont,
                            fontWeight: 700,
                            fontSize: "clamp(34px, 4.8vw, 68px)",
                            lineHeight: 0.98,
                            letterSpacing: "-0.04em",
                            color: "#0E0E0E",
                          }}
                        >
                          <SectionHeading accent={1}>{currentProject.title}</SectionHeading>
                        </h2>

                        <p
                          style={{
                            margin: "16px 0 0",
                            fontSize: "clamp(15px, 1.2vw, 18px)",
                            lineHeight: 1.6,
                            color: "#4B4B47",
                          }}
                        >
                          {meta.summary}
                        </p>
                      </div>

                      {/* Proof of Work Links */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {meta.proofLinks.map((link, lIdx) => {
                          const isPrimary = lIdx === 0;
                          return (
                            <a
                              key={lIdx}
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                height: 44,
                                padding: "0 20px",
                                borderRadius: 999,
                                background: isPrimary ? "#0082C8" : "#EAE9E4",
                                border: isPrimary ? "1px solid #0082C8" : "1px solid #D6D5CF",
                                color: isPrimary ? "#FFFFFF" : "#0E0E0E",
                                fontSize: 13.5,
                                fontWeight: 700,
                                textDecoration: "none",
                                transition: "background 0.25s ease, color 0.25s ease, transform 0.25s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#0E0E0E";
                                e.currentTarget.style.color = "#FFFFFF";
                                e.currentTarget.style.transform = "translateY(-2px)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = isPrimary ? "#0082C8" : "#EAE9E4";
                                e.currentTarget.style.color = isPrimary ? "#FFFFFF" : "#0E0E0E";
                                e.currentTarget.style.transform = "translateY(0)";
                              }}
                            >
                              <span>{link.label}</span>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M7 17L17 7" />
                                <path d="M7 7h10v10" />
                              </svg>
                            </a>
                          );
                        })}
                      </div>
                    </div>

                    {/* Clean Visual Showcase Stack (Just Images) */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "clamp(22px, 3.2vh, 36px)",
                      }}
                    >
                      {meta.gallery.map((imgUrl, gIdx) => (
                        <div
                          key={gIdx}
                          style={{
                            width: "100%",
                            aspectRatio: "16 / 9.5",
                            borderRadius: "clamp(18px, 2vw, 28px)",
                            overflow: "hidden",
                            background: "#EAE9E4",
                            border: "1px solid rgba(14, 14, 14, 0.08)",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt={`${currentProject.title} preview ${gIdx + 1}`}
                            loading={gIdx === 0 ? "eager" : "lazy"}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Simple Prev / Next Footer Row */}
                    <div
                      style={{
                        marginTop: 48,
                        paddingTop: 28,
                        borderTop: "1px solid #E2E1DB",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                      }}
                    >
                      {prevProject ? (
                        <button
                          type="button"
                          onClick={() =>
                            onChangeView({
                              mode: "detail",
                              slug: getProjectSlug(prevProject),
                            })
                          }
                          style={{
                            padding: "10px 18px",
                            borderRadius: 999,
                            border: "1px solid #D6D5CF",
                            background: "#EAE9E4",
                            color: "#0E0E0E",
                            fontFamily: "inherit",
                            fontSize: 13.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "background 0.25s ease, color 0.25s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#0E0E0E";
                            e.currentTarget.style.color = "#FFFFFF";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#EAE9E4";
                            e.currentTarget.style.color = "#0E0E0E";
                          }}
                        >
                          &larr; {prevProject.title}
                        </button>
                      ) : <span />}

                      {nextProject ? (
                        <button
                          type="button"
                          onClick={() =>
                            onChangeView({
                              mode: "detail",
                              slug: getProjectSlug(nextProject),
                            })
                          }
                          style={{
                            padding: "10px 18px",
                            borderRadius: 999,
                            border: "1px solid #D6D5CF",
                            background: "#EAE9E4",
                            color: "#0E0E0E",
                            fontFamily: "inherit",
                            fontSize: 13.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "background 0.25s ease, color 0.25s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#0E0E0E";
                            e.currentTarget.style.color = "#FFFFFF";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#EAE9E4";
                            e.currentTarget.style.color = "#0E0E0E";
                          }}
                        >
                          {nextProject.title} &rarr;
                        </button>
                      ) : <span />}
                    </div>
                  </div>
                );
              })()
            ) : (
              /* =========================================================
                 SELECTED WORKS CATALOG VIEW
                 ========================================================= */
              <div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: 28,
                    paddingBottom: "clamp(32px, 4.5vh, 48px)",
                    marginBottom: "clamp(32px, 4.5vh, 48px)",
                    borderBottom: "1px solid #E2E1DB",
                  }}
                >
                  <div style={{ maxWidth: 780 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: displayFont,
                        fontWeight: 700,
                        fontSize: "clamp(40px, 6vw, 88px)",
                        lineHeight: 0.96,
                        letterSpacing: "-0.045em",
                        color: "#0E0E0E",
                      }}
                    >
                      <SectionHeading accent={1}>Selected Works.</SectionHeading>
                    </h2>
                    <p
                      style={{
                        margin: "18px 0 0",
                        maxWidth: "54ch",
                        fontSize: "clamp(15px, 1.2vw, 18px)",
                        lineHeight: 1.6,
                        color: "#5C5C58",
                      }}
                    >
                      A curated archive of web platforms, AI ecosystems, and digital growth engines built for ambitious teams worldwide.
                    </p>
                  </div>

                  {/* Category Filter Pills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className="ab-ws-filter-pill"
                        data-active={activeCategory === cat ? "1" : "0"}
                        onClick={() => setActiveCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2-Column Projects Grid */}
                <div className="ab-ws-grid">
                  {filteredProjects.map((project, idx) => {
                    const slug = getProjectSlug(project, idx);
                    const img = getProjectImage(project);
                    const meta = getCaseStudyMeta(project);
                    const badgeText = project.category || project.serviceType || "Case Study";

                    return (
                      <button
                        key={project.id || slug}
                        type="button"
                        className="ab-ws-proj-card"
                        onClick={() =>
                          onChangeView({
                            mode: "detail",
                            slug,
                            fromCatalog: true,
                          })
                        }
                      >
                        <div className="ab-ws-thumb-wrap">
                          <span className="ab-ws-thumb-badge">{badgeText}</span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={project.title}
                            loading={idx < 2 ? "eager" : "lazy"}
                            className="ab-ws-thumb-img"
                          />
                          <span className="ab-ws-thumb-arrow" aria-hidden="true">
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M7 17L17 7" />
                              <path d="M7 7h10v10" />
                            </svg>
                          </span>
                        </div>

                        <div
                          style={{
                            paddingTop: 20,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            width: "100%",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              fontSize: 12.5,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: "#0082C8",
                            }}
                          >
                            <span>{project.subtitle || meta.services.slice(0, 2).join(" • ")}</span>
                            <span style={{ color: "#8C8B85" }}>{meta.year}</span>
                          </div>

                          <h3 className="ab-ws-proj-title">{project.title}</h3>

                          <p
                            style={{
                              margin: "2px 0 0",
                              fontSize: 14.5,
                              lineHeight: 1.58,
                              color: "#5C5C58",
                              maxWidth: "58ch",
                            }}
                          >
                            {meta.summary}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
