"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { displayFont } from "./tokens";
import { SkillPill } from "./SkillsPhysics";
import { getLenis } from "../../lib/v2/useLenis";

export interface ContactData {
  headlineLine1?: string;
  headlineLine2?: string;
  description?: string;
  email?: string;
  phone?: string;
  skills?: SkillPill[];
}

interface ContactV2Props {
  data?: ContactData;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const PROJECT_TYPES = [
  "Web Development",
  "Digital Marketing",
  "AI-Driven Apps",
  "Graphic Designing",
  "Video Editing",
  "Other",
];

export default function ContactV2({ data }: ContactV2Props) {
  const line1 = data?.headlineLine1 || "Let's Build Something";
  const line2 = data?.headlineLine2 || "Extraordinary.";
  const description =
    data?.description ||
    "Ready to elevate your digital presence? Reach out to us today and let's discuss how we can help your business grow.";
  const email = data?.email || "hello@Ditsanddots.com";
  const phone = data?.phone || "+1 (817) 330-9194";

  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [projectType, setProjectType] = useState("Digital Marketing");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onOpenSheet = () => setSheetOpen(true);
    window.addEventListener("ditsndots:open-project-sheet", onOpenSheet);
    return () => {
      window.removeEventListener("ditsndots:open-project-sheet", onOpenSheet);
    };
  }, []);

  // Lock background page scroll and drive ultra-smooth GPU-composited scroll expansion (0 -> 1)
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

    // targetP and currentP go from 0 (shrunk at 22vh from top with rounded corners & side inset)
    // to 1 (expanded to fill 100% of the screen width and height).
    let targetP = 0;
    let currentP = 0;
    let raf: number | null = null;
    let lastTime = performance.now();
    let touchLastY = 0;

    // Wait until the initial CSS slide-up entrance finishes before overriding transform for scroll morph
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
      // Quintic smootherstep for silky deceleration at both ends (0 and 1)
      const smooth = p * p * p * (p * (p * 6 - 15) + 10);

      const maxInset = Math.min(38, Math.max(16, vw * 0.025));
      const topGap = (1 - smooth) * vh * 0.21;
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

      // Frame-rate independent exponential smoothing (half-life ~75ms)
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

      // Normalize wheel delta across pixel/line/page wheel modes
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 32;
      else if (e.deltaMode === 2) dy *= window.innerHeight * 0.8;

      // Scrolling down while not yet fully expanded -> grow the card to fill the screen
      if (dy > 0 && targetP < 1) {
        e.preventDefault();
        targetP = clamp(targetP + dy / 420, 0, 1);
        kick();
        return;
      }
      // Scrolling up while at the top of the card -> shrink the card back down
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
      card.style.transform = `translate3d(0, ${(vh * 0.21).toFixed(2)}px, 0) scaleX(${minScaleX.toFixed(5)})`;
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
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    setSubmitError("");
    setIsSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/contact/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          emailAddress: emailAddress.trim(),
          projectType,
          message: message.trim(),
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(resData.error || "Failed to send message. Please try again.");
        return;
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setSheetOpen(false);
        setFullName("");
        setEmailAddress("");
        setMessage("");
      }, 2200);
    } catch {
      setSubmitError("Could not reach the server. Please make sure the backend is running.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section
      id="contact"
      data-reveal="1"
      data-screen-label="Contact"
      style={{
        position: "relative",
        padding: "clamp(52px, 7.5vh, 92px) clamp(18px, 3.6vw, 60px) clamp(88px, 12vh, 144px)",
        scrollMarginTop: 40,
      }}
    >
      <div
        data-rv="scale"
        data-nav-tone="dark"
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1600,
          margin: "0 auto",
          minHeight: "clamp(380px, 52vh, 520px)",
          borderRadius: "clamp(22px, 2.4vw, 32px)",
          overflow: "hidden",
          background: "#121316",
          color: "#F7F6F3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(56px, 9vh, 110px) clamp(56px, 7vw, 120px)",
        }}
      >
        {/* Atmospheric background image (optimized & preloaded via next/image) */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          <Image
            src="/images/our_works_bg.png"
            alt=""
            fill
            sizes="100vw"
            quality={80}
            priority
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>

        {/* Subtle scrim so the background artwork stays clearly visible */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(10, 12, 16, 0.16) 0%, rgba(10, 12, 16, 0.32) 100%)",
          }}
        />

        {/* Centered content block */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: 880,
            margin: "0 auto",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h2
            data-rv="up"
            style={{
              ["--rv-i" as string]: 1,
              margin: 0,
              fontFamily: displayFont,
              fontWeight: 700,
              fontSize: "clamp(34px, 5vw, 74px)",
              lineHeight: 1.06,
              letterSpacing: "-.035em",
              color: "#FFFFFF",
            }}
          >
            {line1}{" "}
            <span style={{ color: "#0082C8" }}>{line2}</span>
          </h2>

          <p
            data-rv="up"
            style={{
              ["--rv-i" as string]: 2,
              margin: "clamp(18px, 2.6vh, 26px) auto 0",
              maxWidth: "50ch",
              fontSize: "clamp(15px, 1.2vw, 19px)",
              lineHeight: 1.6,
              color: "rgba(247, 246, 243, 0.82)",
            }}
          >
            {description}
          </p>

          {/* Bottom 3-item action row: Call | White Pill CTA | Email */}
          <div
            data-rv="up"
            style={{
              ["--rv-i" as string]: 3,
              marginTop: "clamp(28px, 4.2vh, 42px)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "clamp(18px, 2.6vw, 34px)",
            }}
          >
            {/* Left: Phone display (non-copyable) */}
            <span
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 600,
                color: "#FFFFFF",
                cursor: "default",
                opacity: 0.92,
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0082C8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{`Call ${phone}`}</span>
            </span>

            {/* Center: White Pill CTA Button */}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-expanded={sheetOpen}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                height: 48,
                padding: "0 26px",
                borderRadius: 999,
                border: "none",
                background: "#FFFFFF",
                color: "#0E0E0E",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 10px 26px rgba(0, 0, 0, 0.28)",
                transition: "transform 0.25s ease, background 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span>Start a Project</span>
              <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>&rarr;</span>
            </button>

            {/* Right: Email display (non-copyable) */}
            <span
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 600,
                color: "#FFFFFF",
                cursor: "default",
                opacity: 0.92,
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#0082C8" stroke="#0082C8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>{email}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Humaan-style Bottom Sheet Overlay:
          - Full-viewport scroll container with hidden scrollbar
          - Slides slowly up from the bottom of the screen when triggered
          - Starts at 20vh from the top with rounded top corners & side margins
          - As you scroll down inside it, the white sheet rises to 0px and expands to fill the screen width */}
      {mounted &&
        createPortal(
          <>
            <style>{`
              .ab-humaan-backdrop {
                position: fixed;
                inset: 0;
                z-index: 9998;
                background: rgba(14, 14, 14, 0.48);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1);
              }
              .ab-humaan-backdrop[data-open="1"] {
                opacity: 1;
                pointer-events: auto;
              }
              .ab-humaan-scroller {
                position: fixed;
                inset: 0;
                z-index: 9999;
                overflow-y: auto;
                overflow-x: hidden;
                scrollbar-width: none;
                -ms-overflow-style: none;
                pointer-events: none;
              }
              .ab-humaan-scroller::-webkit-scrollbar {
                display: none;
                width: 0;
                height: 0;
              }
              .ab-humaan-scroller[data-open="1"] {
                pointer-events: auto;
              }
              .ab-humaan-card {
                position: relative;
                min-height: 100vh;
                width: 100%;
                background: #F7F6F3;
                color: #0E0E0E;
                border-radius: 44px 44px 0 0;
                padding: clamp(54px, 8vh, 96px) clamp(24px, 7vw, 120px) clamp(72px, 10vh, 120px);
                box-sizing: border-box;
                transform-origin: center top;
                transform: translate3d(0, 105vh, 0) scaleX(0.95);
                transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
                will-change: transform, border-radius;
              }
              .ab-project-close {
                position: sticky;
                top: 28px;
                float: right;
                margin-top: -16px;
                margin-right: -24px;
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
                z-index: 10;
                transition: background 0.25s ease, color 0.25s ease, transform 0.25s ease;
              }
              .ab-project-close:hover {
                background: #0E0E0E;
                color: #F7F6F3;
                transform: scale(1.06);
              }
              .ab-project-grid-2 {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: clamp(20px, 3vw, 36px);
              }
              .ab-project-label {
                display: block;
                font-size: 14px;
                font-weight: 700;
                color: #0E0E0E;
                margin-bottom: 10px;
                letter-spacing: -0.01em;
              }
              .ab-project-input,
              .ab-project-select,
              .ab-project-textarea {
                width: 100%;
                box-sizing: border-box;
                padding: 16px 20px;
                border-radius: 16px;
                border: 1.5px solid #DEDDD7;
                background: #EAE9E4;
                color: #0E0E0E;
                font-family: inherit;
                font-size: 15px;
                font-weight: 500;
                outline: none;
                transition: border-color 0.22s ease, background 0.22s ease, box-shadow 0.22s ease;
              }
              .ab-project-input::placeholder,
              .ab-project-textarea::placeholder {
                color: #8C8B85;
              }
              .ab-project-input:focus,
              .ab-project-select:focus,
              .ab-project-textarea:focus {
                border-color: #0082C8;
                background: #FFFFFF;
                box-shadow: 0 0 0 4px rgba(0, 130, 200, 0.14);
              }
              .ab-project-submit {
                width: 100%;
                height: 56px;
                margin-top: 8px;
                border: none;
                border-radius: 999px;
                background: #0082C8;
                color: #FFFFFF;
                font-family: inherit;
                font-size: 15.5px;
                font-weight: 700;
                letter-spacing: 0.01em;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                cursor: pointer;
                transition: background 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                            color 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                            transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
              }
              .ab-project-submit:hover {
                background: #0E0E0E;
                color: #F7F6F3;
                transform: translateY(-2px);
              }
              @media (max-width: 680px) {
                .ab-humaan-card {
                  border-radius: 28px 28px 0 0;
                  padding: 36px 20px 64px;
                }
                .ab-project-grid-2 {
                  grid-template-columns: 1fr;
                }
                .ab-project-close {
                  margin-right: 0;
                  margin-top: -8px;
                  top: 16px;
                }
              }
            `}</style>

            <div
              className="ab-humaan-backdrop"
              data-open={sheetOpen ? "1" : "0"}
              aria-hidden="true"
            />

            <div
              ref={overlayRef}
              data-lenis-prevent
              role="dialog"
              aria-modal="true"
              aria-label="Start a project"
              className="ab-humaan-scroller"
              data-open={sheetOpen ? "1" : "0"}
              aria-hidden={!sheetOpen}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSheetOpen(false);
              }}
            >
              <div ref={cardRef} className="ab-humaan-card">
                <button
                  type="button"
                  className="ab-project-close"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close project form"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>

                <div style={{ maxWidth: 840, width: "100%", margin: "0 auto", clear: "both" }}>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: displayFont,
                      fontWeight: 700,
                      fontSize: "clamp(42px, 5.8vw, 78px)",
                      lineHeight: 1.02,
                      letterSpacing: "-0.04em",
                      color: "#0E0E0E",
                    }}
                  >
                    Let&apos;s get <span style={{ color: "#0082C8" }}>started.</span>
                  </h2>

                  <div style={{ marginTop: 18, marginBottom: 40 }}>


                  </div>

                  {submitted ? (
                    <div
                      style={{
                        padding: "48px 28px",
                        borderRadius: 20,
                        background: "#EAE9E4",
                        border: "1px solid #D6D5CF",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: "#0082C8",
                          marginBottom: 8,
                        }}
                      >
                        We&apos;ve got your message!
                      </div>
                      <p style={{ margin: 0, fontSize: 15, color: "#5C5C58" }}>
                        Thanks for reaching out to Dits and Dots. We&apos;ve received your inquiry and will be in touch soon.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSubmit}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 26,
                      }}
                    >
                      <div className="ab-project-grid-2">
                        <div>
                          <label className="ab-project-label" htmlFor="proj-full-name">
                            Full Name <span style={{ color: "#0082C8" }}>*</span>
                          </label>
                          <input
                            id="proj-full-name"
                            type="text"
                            required
                            placeholder="Your full name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="ab-project-input"
                          />
                        </div>

                        <div>
                          <label className="ab-project-label" htmlFor="proj-email">
                            Email Address <span style={{ color: "#0082C8" }}>*</span>
                          </label>
                          <input
                            id="proj-email"
                            type="email"
                            required
                            placeholder="you@company.com"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            className="ab-project-input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="ab-project-label" htmlFor="proj-type">
                          Project Type
                        </label>
                        <select
                          id="proj-type"
                          value={projectType}
                          onChange={(e) => setProjectType(e.target.value)}
                          className="ab-project-select"
                        >
                          {PROJECT_TYPES.map((pt) => (
                            <option key={pt} value={pt}>
                              {pt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="ab-project-label" htmlFor="proj-message">
                          Message <span style={{ color: "#0082C8" }}>*</span>
                        </label>
                        <textarea
                          id="proj-message"
                          required
                          rows={4}
                          placeholder="Tell us about your project..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className="ab-project-textarea"
                          style={{ resize: "none", minHeight: 120 }}
                        />
                      </div>

                      {submitError && (
                        <div
                          style={{
                            padding: "12px 16px",
                            borderRadius: 12,
                            background: "#FEF2F2",
                            border: "1px solid #FECACA",
                            color: "#B91C1C",
                            fontSize: 13.5,
                            fontWeight: 600,
                          }}
                        >
                          {submitError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSending}
                        className="ab-project-submit"
                        style={{
                          opacity: isSending ? 0.72 : 1,
                          cursor: isSending ? "not-allowed" : "pointer",
                        }}
                      >
                        <span>{isSending ? "Sending..." : "Send Message"}</span>
                        {!isSending && (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </section>
  );
}
