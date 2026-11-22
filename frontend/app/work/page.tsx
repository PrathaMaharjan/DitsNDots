"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CustomCursor from "../../components/v2/CustomCursor";
import NavV2 from "../../components/v2/NavV2";
import SectionHeading from "../../components/v2/SectionHeading";
import ContactV2 from "../../components/v2/ContactV2";
import FooterV2 from "../../components/v2/FooterV2";
import { displayFont, bodyFont } from "../../components/v2/tokens";
import { useLenis } from "../../lib/v2/useLenis";
import { useAbstraktMotion } from "../../lib/v2/useAbstraktMotion";
import { useSectionReveal } from "../../lib/v2/useSectionReveal";
import { contactContent, workContent } from "../content";
import {
  WorkProject,
  getProjectImage,
  getProjectSlug,
  mergeWithStaticProjects,
} from "../../lib/v2/workProjects";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function WorkPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<WorkProject[]>(() =>
    mergeWithStaticProjects((workContent.projects || []) as WorkProject[])
  );
  const [contact, setContact] = useState<typeof contactContent>(contactContent);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    window.scrollTo(0, 0);

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
  }, []);

  useLenis();
  useAbstraktMotion(rootRef, [projects, activeCategory]);
  useSectionReveal(rootRef, [projects, activeCategory]);

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

  return (
    <div
      className="ab-page-dark-end"
      style={{
        "--ab-bg": "#F7F6F3",
        "--ab-ink": "#0E0E0E",
        "--ab-card": "#EAE9E4",
        "--ab-ink-deep": "#02AA7A",
        fontFamily: bodyFont,
        background: "#02AA7A",
        color: "#0E0E0E",
        minHeight: "100vh",
      } as React.CSSProperties}
    >
      <style>{`
        .ab-work-filter-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: clamp(20px, 3vw, 40px);
          padding: 8px clamp(18px, 3.6vw, 60px) 22px;
          border-bottom: 1px solid #E2E1DB;
        }
        .ab-work-filter-pill {
          position: relative;
          padding: 8px 4px;
          border: none;
          background: transparent;
          color: #6B6A64;
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 600;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: color 0.22s ease;
        }
        .ab-work-filter-pill::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -2px;
          height: 2px;
          border-radius: 999px;
          background: #0082C8;
          transform: scaleX(0);
          transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-work-filter-pill:hover {
          color: #0E0E0E;
        }
        .ab-work-filter-pill[data-active="1"] {
          color: #0082C8;
          font-weight: 700;
        }
        .ab-work-filter-pill[data-active="1"]::after {
          transform: scaleX(1);
        }
        .ab-work-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(22px, 2.4vw, 34px);
        }
        .ab-work-card {
          position: relative;
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
          border: 1px solid #E6E5DF;
          border-radius: 18px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 6px 20px rgba(14, 14, 14, 0.04);
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.35s cubic-bezier(0.22, 1, 0.36, 1),
                      border-color 0.35s ease;
        }
        .ab-work-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 18px 42px rgba(14, 14, 14, 0.1);
          border-color: rgba(0, 130, 200, 0.36);
        }
        .ab-work-thumb-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 11;
          overflow: hidden;
          background: #EAE9E4;
        }
        .ab-work-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-work-card:hover .ab-work-thumb-img {
          transform: scale(1.04);
        }
        .ab-work-card-body {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
          padding: 22px 24px 20px;
          gap: 18px;
        }
        .ab-work-card-cat {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #0082C8;
          margin-bottom: 6px;
        }
        .ab-work-card-title {
          margin: 0;
          font-family: ${displayFont};
          font-weight: 700;
          font-size: clamp(18px, 1.45vw, 22px);
          line-height: 1.22;
          letter-spacing: -0.02em;
          color: #0E0E0E;
          transition: color 0.22s ease;
        }
        .ab-work-card:hover .ab-work-card-title {
          color: #0082C8;
        }
        .ab-work-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 14px;
          border-top: 1px solid #F0EFEA;
          font-size: 13px;
          font-weight: 600;
          color: #0082C8;
        }
        .ab-work-card-arrow {
          display: inline-flex;
          align-items: center;
          transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-work-card:hover .ab-work-card-arrow {
          transform: translateX(4px);
        }
        @media (max-width: 1040px) {
          .ab-work-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .ab-work-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>

      <div ref={rootRef} style={{ width: "100%", overflowX: "clip" }}>
        <CustomCursor />
        <NavV2 />

        <main
          id="top"
          style={{
            position: "relative",
            zIndex: 5,
            width: "100%",
          }}
        >
          {/* Curved Cream Sheet wrapping the Work Catalog & Contact Banner, rising from the bottom with curved top corners */}
          <div
            data-light-sheet="1"
            data-light-sheet-top="flat"
            data-nav-tone="light"
            className="ab-sheet-rise"
            style={{
              position: "relative",
              zIndex: 5,
              marginBottom: -130,
              background: "#F7F6F3",
              color: "#0E0E0E",
              borderRadius: "0 0 clamp(36px, 4vw, 56px) clamp(36px, 4vw, 56px)",
              paddingTop: "clamp(108px, 14vh, 150px)",
              willChange: "transform",
            }}
          >
            {/* Centered Header */}
            <section
              style={{
                maxWidth: 1380,
                margin: "0 auto",
                padding: "0 clamp(18px, 3.6vw, 60px) clamp(32px, 4.5vh, 48px)",
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontFamily: displayFont,
                  fontWeight: 700,
                  fontSize: "clamp(36px, 5vw, 68px)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.04em",
                  color: "#0E0E0E",
                }}
              >
                <SectionHeading accent={1}>Selected Works</SectionHeading>
              </h1>
              <p
                style={{
                  margin: "14px auto 0",
                  maxWidth: "52ch",
                  fontSize: "clamp(14.5px, 1.15vw, 17px)",
                  lineHeight: 1.6,
                  color: "#5C5C58",
                }}
              >
                Explore our curated portfolio of web platforms, AI solutions, and digital growth campaigns.
              </p>
            </section>

            {/* Centered Category Filter Bar */}
            <div className="ab-work-filter-bar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className="ab-work-filter-pill"
                  data-active={activeCategory === cat ? "1" : "0"}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* 3-Column Clean Cards Grid */}
            <section
              style={{
                maxWidth: 1380,
                margin: "0 auto",
                padding: "clamp(40px, 6vh, 64px) clamp(18px, 3.6vw, 60px) clamp(76px, 11vh, 124px)",
              }}
            >
              <div className="ab-work-grid">
                {filteredProjects.map((project, idx) => {
                  const slug = getProjectSlug(project, idx);
                  const img = getProjectImage(project);
                  const categoryLabel = project.category || project.serviceType || project.subtitle || "Project";

                  return (
                    <Link
                      key={`${project.id ?? slug}-${idx}`}
                      href={`/work/${slug}`}
                      onClick={() => {
                        try {
                          sessionStorage.setItem("ditsndots_work_back", "/work");
                        } catch {}
                      }}
                      className="ab-work-card"
                    >
                      <div className="ab-work-thumb-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={project.title}
                          loading={idx < 3 ? "eager" : "lazy"}
                          className="ab-work-thumb-img"
                        />
                      </div>

                      <div className="ab-work-card-body">
                        <div>
                          <span className="ab-work-card-cat">{categoryLabel}</span>
                          <h2 className="ab-work-card-title">{project.title}</h2>
                        </div>

                        <div className="ab-work-card-footer">
                          <span>View Project Details</span>
                          <span className="ab-work-card-arrow" aria-hidden="true">
                            &rarr;
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
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
