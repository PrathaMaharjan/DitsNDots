"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import CustomCursor from "../../../components/v2/CustomCursor";
import ScrollProgressV2 from "../../../components/v2/ScrollProgressV2";
import NavV2 from "../../../components/v2/NavV2";
import SectionHeading from "../../../components/v2/SectionHeading";
import ContactV2 from "../../../components/v2/ContactV2";
import FooterV2 from "../../../components/v2/FooterV2";
import { displayFont, bodyFont } from "../../../components/v2/tokens";
import { useLenis } from "../../../lib/v2/useLenis";
import { useAbstraktMotion } from "../../../lib/v2/useAbstraktMotion";
import { useSectionReveal } from "../../../lib/v2/useSectionReveal";
import { contactContent, workContent } from "../../content";
import {
  WorkProject,
  getCaseStudyMeta,
  getProjectSlug,
  mergeWithStaticProjects,
} from "../../../lib/v2/workProjects";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function IndividualWorkPage() {
  const params = useParams();
  const rawSlug = Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string) || "";
  const slug = decodeURIComponent(rawSlug).toLowerCase();

  const rootRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<WorkProject[]>(() =>
    mergeWithStaticProjects((workContent.projects || []) as WorkProject[])
  );
  const [contact, setContact] = useState<typeof contactContent>(contactContent);
  const [backTarget, setBackTarget] = useState<"/" | "/work">("/work");

  useEffect(() => {
    window.scrollTo(0, 0);

    try {
      const origin = sessionStorage.getItem("ditsndots_work_back");
      if (origin === "/" || origin === "/work") {
        setBackTarget(origin);
      }
    } catch {}

    const applyCms = (data: any) => {
      if (Array.isArray(data?.work?.projects)) {
        setProjects(mergeWithStaticProjects(data.work.projects));
      }
      if (data?.contact?.email || data?.contact?.headlineLine1) {
        setContact(data.contact);
      }
    };

    const cached = sessionStorage.getItem("ditsndots_content");
    if (cached) {
      try {
        applyCms(JSON.parse(cached));
      } catch (e) {}
    }

    fetch(`${API_BASE}/api/content`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        applyCms(data);
        try {
          sessionStorage.setItem("ditsndots_content", JSON.stringify(data));
        } catch (e) {}
      })
      .catch(() => {});
  }, [slug]);

  useLenis();
  useAbstraktMotion(rootRef, [projects, slug]);
  useSectionReveal(rootRef, [projects, slug]);

  const { currentProject, nextProject, prevProject } = useMemo(() => {
    if (!projects.length) {
      return { currentProject: null, nextProject: null, prevProject: null };
    }
    let idx = projects.findIndex(
      (p, i) => getProjectSlug(p, i) === slug || String(p.id) === slug
    );
    if (idx < 0) idx = 0;

    const current = projects[idx];
    const next = projects[(idx + 1) % projects.length];
    const prev = projects[(idx - 1 + projects.length) % projects.length];
    return { currentProject: current, nextProject: next, prevProject: prev };
  }, [projects, slug]);

  if (!currentProject) return null;

  const meta = getCaseStudyMeta(currentProject);
  const nextSlug = nextProject ? getProjectSlug(nextProject) : "ncsc-public-app";
  const prevSlug = prevProject ? getProjectSlug(prevProject) : "ncsc-public-app";

  return (
    <div
      className="ab-page-dark-end"
      style={{
        "--ab-bg": "#F7F6F3",
        "--ab-ink": "#0E0E0E",
        "--ab-card": "#EAE9E4",
        "--ab-ink-deep": "#0082C8",
        fontFamily: bodyFont,
        background: "#0082C8",
        color: "#0E0E0E",
        minHeight: "100vh",
      } as React.CSSProperties}
    >
      <div ref={rootRef} style={{ width: "100%", overflowX: "clip" }}>
        <CustomCursor />
        <NavV2 />

        <main
          id="top"
          key={slug}
          style={{
            position: "relative",
            zIndex: 5,
            width: "100%",
          }}
        >
          <div
            data-light-sheet="1"
            data-light-sheet-top="flat"
            data-nav-tone="light"
            style={{
              position: "relative",
              zIndex: 5,
              marginBottom: -130,
              background: "#F7F6F3",
              color: "#0E0E0E",
              borderRadius: "0 0 clamp(36px, 4vw, 56px) clamp(36px, 4vw, 56px)",
              paddingTop: "clamp(120px, 16vh, 175px)",
              willChange: "transform",
            }}
          >
            {/* Simple Case Study Header + Images + Optional Proof Link */}
            <section
              style={{
                maxWidth: 1180,
                margin: "0 auto",
                padding: "0 clamp(18px, 3.6vw, 60px) clamp(64px, 9vh, 110px)",
              }}
            >
              {/* Top Row: Clean Back Link + Category */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <Link
                  href={backTarget}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "#5C5C58",
                    textDecoration: "none",
                    transition: "color 0.22s ease, transform 0.22s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#0082C8";
                    e.currentTarget.style.transform = "translateX(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#5C5C58";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                  <span>{backTarget === "/" ? "Back to Home" : "Back to Works"}</span>
                </Link>

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
                  {currentProject.category || "Project"}
                </span>
              </div>

              {/* Title + Short Description + Optional Direct Link */}
              <div
                style={{
                  paddingBottom: 32,
                  marginBottom: 36,
                  borderBottom: "1px solid #E2E1DB",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontFamily: displayFont,
                    fontWeight: 700,
                    fontSize: "clamp(36px, 5.2vw, 72px)",
                    lineHeight: 0.98,
                    letterSpacing: "-0.04em",
                    color: "#0E0E0E",
                  }}
                >
                  <SectionHeading accent={1}>{currentProject.title}</SectionHeading>
                </h1>

                <p
                  style={{
                    margin: "16px 0 0",
                    maxWidth: 680,
                    fontSize: "clamp(15px, 1.2vw, 18px)",
                    lineHeight: 1.6,
                    color: "#4B4B47",
                  }}
                >
                  {meta.summary}
                </p>

                {/* Only renders if a link was explicitly added to this project */}
                {meta.proofLinks.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 18 }}>
                    {meta.proofLinks.map((link, lIdx) => (
                      <a
                        key={lIdx}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: "#0082C8",
                          textDecoration: "underline",
                          textUnderlineOffset: 4,
                        }}
                      >
                        <span>{link.label}</span>
                        <span aria-hidden="true">&#8599;</span>
                      </a>
                    ))}
                  </div>
                )}
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
              <style>{`
                .ab-proj-nav-btn {
                  display: inline-flex;
                  align-items: center;
                  gap: 10px;
                  padding: 12px 22px;
                  border-radius: 999px;
                  border: 1px solid #D6D5CF;
                  background: #EAE9E4;
                  color: #0E0E0E;
                  font-size: 13.5px;
                  font-weight: 700;
                  text-decoration: none;
                  transition: background 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                              color 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                              border-color 0.28s ease,
                              transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                              box-shadow 0.28s ease;
                }
                .ab-proj-nav-btn:hover {
                  background: #0082C8;
                  border-color: #0082C8;
                  color: #FFFFFF;
                  transform: translateY(-2px);
                  box-shadow: 0 10px 24px rgba(0, 130, 200, 0.22);
                }
                .ab-proj-nav-arrow-l,
                .ab-proj-nav-arrow-r {
                  display: inline-block;
                  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
                }
                .ab-proj-nav-btn:hover .ab-proj-nav-arrow-l {
                  transform: translateX(-4px);
                }
                .ab-proj-nav-btn:hover .ab-proj-nav-arrow-r {
                  transform: translateX(4px);
                }
                @media (max-width: 640px) {
                  .ab-proj-nav-row {
                    flex-direction: column;
                    align-items: stretch !important;
                  }
                  .ab-proj-nav-btn {
                    justify-content: space-between;
                    width: 100%;
                    box-sizing: border-box;
                  }
                }
              `}</style>
              <div
                className="ab-proj-nav-row"
                style={{
                  marginTop: 48,
                  paddingTop: 28,
                  borderTop: "1px solid #E2E1DB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 14,
                }}
              >
                {prevProject ? (
                  <Link href={`/work/${prevSlug}`} className="ab-proj-nav-btn">
                    <span className="ab-proj-nav-arrow-l" aria-hidden="true">
                      &larr;
                    </span>
                    <span>{prevProject.title}</span>
                  </Link>
                ) : (
                  <span />
                )}

                {nextProject ? (
                  <Link href={`/work/${nextSlug}`} className="ab-proj-nav-btn">
                    <span>{nextProject.title}</span>
                    <span className="ab-proj-nav-arrow-r" aria-hidden="true">
                      &rarr;
                    </span>
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            </section>

            {/* Let's Build Banner + Start a Project Drawer */}
            <ContactV2 data={contact} />
          </div>
        </main>

        <FooterV2 />
      </div>
    </div>
  );
}
