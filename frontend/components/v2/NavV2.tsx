"use client";

import React, { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { displayFont } from "./tokens";
import { getLenis } from "../../lib/v2/useLenis";

const CENTER_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Works", href: "/work" },
  { label: "Services", href: "#capabilities-grid" },
];

export default function NavV2() {
  const navRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    delete document.documentElement.dataset.menuOpen;
    const nav = navRef.current;
    if (!nav) return;

    const NAV_MIDLINE = 46;
    let lastTone = "";
    let lastY = window.scrollY;
    let hidden = false;
    let rafId = 0;

    const syncNav = () => {
      rafId = 0;
      const y = window.scrollY;

      // 1. Auto-switch font & pill colors based on dark/light section below the bar.
      //    Iterate in reverse DOM order so deeper/nested sections (e.g. the dark Let's Build banner inside the light sheet)
      //    take priority over their outer wrapper.
      let tone = "light";
      const toneSections = document.querySelectorAll<HTMLElement>("[data-nav-tone]");
      for (let i = toneSections.length - 1; i >= 0; i--) {
        const section = toneSections[i];
        const r = section.getBoundingClientRect();
        if (r.top <= NAV_MIDLINE && r.bottom >= NAV_MIDLINE) {
          tone = section.dataset.navTone || "light";
          break;
        }
      }

      if (tone !== lastTone) {
        lastTone = tone;
        const dark = tone === "dark";
        nav.style.setProperty("--nav-fg", dark ? "#F7F6F3" : "#0E0E0E");
        nav.style.setProperty("--nav-pill-bg", dark ? "#F7F6F3" : "#0E0E0E");
        nav.style.setProperty("--nav-pill-fg", dark ? "#0E0E0E" : "#F7F6F3");
      }

      // 2. Slide up out of view when scrolling down, reappear when scrolling up
      if (y > lastY && y > 220) {
        if (!hidden) {
          nav.style.transform = "translate3d(0,-120%,0)";
          hidden = true;
        }
      } else if (y < lastY && hidden) {
        nav.style.transform = "translate3d(0,0,0)";
        hidden = false;
      }
      lastY = y;
    };

    const scheduleSync = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(syncNav);
      }
    };

    syncNav();
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
    };
  }, []);

  const goTo = useCallback(
    (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (href.startsWith("#")) {
        const isHomePage = window.location.pathname === "/";
        // "Home" and the logo (#top) always take you to the homepage when on /work or /work/[slug]
        if (href === "#top" && !isHomePage) {
          e.preventDefault();
          router.push("/");
          return;
        }
        // If the target section exists on the current page (e.g. #contact / ContactV2 on /work or /work/[slug]),
        // smoothly scroll right to it on this same page!
        const target = document.querySelector<HTMLElement>(href);
        if (target) {
          e.preventDefault();
          const lenis = getLenis();
          if (lenis) {
            lenis.scrollTo(target, { duration: 0.75 });
          } else {
            target.scrollIntoView({ behavior: "smooth" });
          }
          return;
        }
        // Otherwise (e.g. #capabilities-grid when on /work), navigate back to the homepage section via SPA router
        e.preventDefault();
        router.push(`/${href}`);
      }
    },
    [router]
  );

  return (
    <>
      <style>{`
        [data-nav="1"] {
          transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                      color 0.3s ease,
                      opacity 0.35s ease;
        }
        .ab-nav-bar {
          max-width: 1680px;
          margin: 0 auto;
          padding: 20px clamp(18px, 3.6vw, 60px);
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
        }
        .ab-nav-center {
          display: inline-flex;
          align-items: center;
          gap: clamp(10px, 1.8vw, 24px);
        }
        .ab-nav-item {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 38px;
          padding: 0 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: var(--nav-fg, #0E0E0E);
          background: transparent;
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
          transition: background 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                      color 0.28s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-nav-item:hover {
          background: var(--nav-pill-bg, #0E0E0E);
          color: var(--nav-pill-fg, #F7F6F3);
        }
        .ab-nav-roll {
          position: relative;
          display: inline-block;
          overflow: hidden;
          line-height: 1.2;
        }
        .ab-nav-roll-top,
        .ab-nav-roll-bot {
          display: block;
          transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-nav-roll-bot {
          position: absolute;
          left: 0;
          top: 100%;
          width: 100%;
        }
        .ab-nav-item:hover .ab-nav-roll-top,
        .ab-nav-cta:hover .ab-nav-roll-top {
          transform: translateY(-100%);
        }
        .ab-nav-item:hover .ab-nav-roll-bot,
        .ab-nav-cta:hover .ab-nav-roll-bot {
          transform: translateY(-100%);
        }
        .ab-nav-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .ab-nav-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 42px;
          padding: 0 22px;
          border-radius: 999px;
          background: var(--nav-pill-bg, #0E0E0E);
          color: var(--nav-pill-fg, #F7F6F3);
          font-size: 13.5px;
          font-weight: 700;
          letter-spacing: 0.01em;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.3s cubic-bezier(0.22, 1, 0.36, 1),
                      color 0.3s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-nav-cta:hover {
          background: #0082C8;
          color: #0E0E0E;
          transform: scale(1.03);
        }
        @media (max-width: 760px) {
          .ab-nav-bar {
            grid-template-columns: auto 1fr auto;
          }
          .ab-nav-center {
            justify-self: center;
            gap: 4px;
          }
          .ab-nav-item {
            padding: 0 10px;
            font-size: 12px;
            height: 32px;
          }
          .ab-nav-cta {
            height: 36px;
            padding: 0 14px;
            font-size: 12px;
          }
        }
      `}</style>
      <div
        ref={navRef}
        data-nav="1"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          willChange: "transform",
        }}
      >
        <div className="ab-nav-bar">
          <div>
            <a
              href="#top"
              onClick={goTo("#top")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontFamily: displayFont,
                fontWeight: 700,
                fontSize: "clamp(18px,2vw,23px)",
                letterSpacing: "-.03em",
                color: "var(--nav-fg,#0E0E0E)",
                transition: "color .3s ease",
                lineHeight: 1,
                textDecoration: "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.png"
                alt="Dits N Dots logo"
                style={{ width: 38, height: 38, objectFit: "contain", display: "block" }}
              />
              <span>
                DITS<span style={{ color: "#0082C8" }}>N</span>DOTS
              </span>
            </a>
          </div>

          <nav aria-label="Main navigation" className="ab-nav-center">
            {CENTER_LINKS.map((item) =>
              item.href.startsWith("/") ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="ab-nav-item"
                >
                  <span className="ab-nav-roll">
                    <span className="ab-nav-roll-top">{item.label}</span>
                    <span className="ab-nav-roll-bot" aria-hidden="true">
                      {item.label}
                    </span>
                  </span>
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={goTo(item.href)}
                  className="ab-nav-item"
                >
                  <span className="ab-nav-roll">
                    <span className="ab-nav-roll-top">{item.label}</span>
                    <span className="ab-nav-roll-bot" aria-hidden="true">
                      {item.label}
                    </span>
                  </span>
                </a>
              )
            )}
          </nav>

          <div className="ab-nav-right">
            <a href="#contact" onClick={goTo("#contact")} className="ab-nav-cta">
              <span className="ab-nav-roll">
                <span className="ab-nav-roll-top">Contact</span>
                <span className="ab-nav-roll-bot" aria-hidden="true">
                  Contact
                </span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
