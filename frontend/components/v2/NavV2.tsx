"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { displayFont } from "./tokens";
import { getLenis } from "../../lib/v2/useLenis";
import { triggerSlideOver } from "./SlideOverTransition";

const CENTER_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Works", href: "/work" },
  { label: "Services", href: "#capabilities-grid" },
];

export default function NavV2() {
  const navRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        nav.dataset.tone = tone;
        nav.style.setProperty("--nav-fg", dark ? "#F7F6F3" : "#0E0E0E");
        nav.style.setProperty("--nav-pill-bg", dark ? "#F7F6F3" : "#0E0E0E");
        nav.style.setProperty("--nav-pill-fg", dark ? "#0E0E0E" : "#F7F6F3");
        nav.style.setProperty("--nav-accent", dark ? "#0B111A" : "#0082C8");
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
      setMobileOpen(false);
      if (href.startsWith("#")) {
        const isHomePage = window.location.pathname === "/";
        // "Home" and the logo (#top) always take you to the homepage when on /work or /work/[slug]
        if (href === "#top" && !isHomePage) {
          e.preventDefault();
          triggerSlideOver(() => router.push("/"), "back");
          return;
        }
        // If the target section exists on the current page (e.g. #top, #capabilities-grid, #contact),
        // smoothly scroll right to it on this same page!
        const target = href === "#top" ? null : document.querySelector<HTMLElement>(href);
        if (href === "#top" || target) {
          e.preventDefault();
          const lenis = getLenis();
          if (lenis) {
            lenis.scrollTo(href === "#top" ? 0 : target!, {
              duration: 1.0,
              easing: (t: number) => 1 - Math.pow(1 - t, 3),
            });
          } else if (href === "#top") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            target!.scrollIntoView({ behavior: "smooth" });
          }
          return;
        }
        // Otherwise (e.g. #capabilities-grid when on /work), navigate back to the homepage section via SPA router
        e.preventDefault();
        triggerSlideOver(() => router.push(`/${href}`), "back");
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
          padding: 12px clamp(18px, 3.6vw, 60px);
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
        }
        .ab-nav-logo-stack {
          position: relative;
          display: inline-flex;
          align-items: center;
          height: clamp(62px, 6.2vw, 84px);
          margin: -8px 0;
        }
        .ab-nav-logo-img {
          height: 100%;
          width: auto;
          object-fit: contain;
          display: block;
          transition: opacity 0.28s ease;
        }
        .ab-nav-logo-dark {
          position: absolute;
          left: 0;
          top: 0;
          opacity: 0;
        }
        [data-nav="1"][data-tone="dark"] .ab-nav-logo-light {
          opacity: 0;
        }
        [data-nav="1"][data-tone="dark"] .ab-nav-logo-dark {
          opacity: 1;
        }
        .ab-nav-center {
          display: inline-flex;
          align-items: center;
          gap: clamp(6px, 1.2vw, 14px);
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(247, 246, 243, 0.58);
          backdrop-filter: blur(14px) saturate(160%);
          -webkit-backdrop-filter: blur(14px) saturate(160%);
          border: 1px solid rgba(14, 14, 14, 0.08);
          box-shadow: 0 6px 22px rgba(14, 14, 14, 0.06);
          transition: background 0.32s ease, border-color 0.32s ease, box-shadow 0.32s ease;
        }
        [data-nav="1"][data-tone="dark"] .ab-nav-center {
          background: rgba(11, 17, 26, 0.28);
          border-color: rgba(255, 255, 255, 0.18);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
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
        .ab-nav-hamburger {
          display: none;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--nav-fg, #0E0E0E) 22%, transparent);
          background: color-mix(in srgb, var(--nav-pill-fg, #F7F6F3) 72%, transparent);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: var(--nav-fg, #0E0E0E);
          cursor: pointer;
        }
        .ab-nav-mobile-drawer {
          display: none;
        }
        @media (max-width: 760px) {
          .ab-nav-bar {
            grid-template-columns: auto 1fr auto;
            padding: 16px 18px;
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
        @media (max-width: 640px) {
          .ab-nav-bar {
            grid-template-columns: 1fr auto;
            padding: 14px 16px;
          }
          .ab-nav-center,
          .ab-nav-right {
            display: none;
          }
          .ab-nav-hamburger {
            display: inline-flex;
          }
          .ab-nav-mobile-drawer {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin: 0 14px 12px;
            padding: 14px;
            border-radius: 20px;
            background: rgba(247, 246, 243, 0.96);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(14, 14, 14, 0.1);
            box-shadow: 0 18px 40px rgba(0, 0, 0, 0.14);
          }
          .ab-nav-mobile-link {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 700;
            color: #0E0E0E;
            text-decoration: none;
          }
          .ab-nav-mobile-link:active {
            background: rgba(0, 130, 200, 0.1);
            color: #0082C8;
          }
          .ab-nav-mobile-cta {
            margin-top: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 44px;
            border-radius: 999px;
            background: #0E0E0E;
            color: #F7F6F3;
            font-size: 14px;
            font-weight: 700;
            text-decoration: none;
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
              aria-label="Dits N Dots Home"
              className="ab-nav-logo-stack"
              style={{ textDecoration: "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo/white%20logo.png"
                alt="Dits N Dots"
                className="ab-nav-logo-img ab-nav-logo-light"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo/dark%20logo.png"
                alt=""
                aria-hidden="true"
                className="ab-nav-logo-img ab-nav-logo-dark"
              />
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

          <button
            type="button"
            className="ab-nav-hamburger"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>

        {mobileOpen && (
          <div className="ab-nav-mobile-drawer">
            {CENTER_LINKS.map((item) =>
              item.href.startsWith("/") ? (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="ab-nav-mobile-link"
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true" style={{ color: "#0082C8" }}>&rarr;</span>
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={goTo(item.href)}
                  className="ab-nav-mobile-link"
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true" style={{ color: "#0082C8" }}>&rarr;</span>
                </a>
              )
            )}
            <a href="#contact" onClick={goTo("#contact")} className="ab-nav-mobile-cta">
              Contact Us
            </a>
          </div>
        )}
      </div>
    </>
  );
}
