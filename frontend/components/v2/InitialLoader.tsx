"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Phase = "boot" | "assemble" | "reveal" | "exit";

interface Particle {
  id: number;
  startX: number;
  startY: number;
  startRot: number;
  startScale: number;
  delay: number;
  duration: number;
  color: string;
}

// Exact 4x4 color map sampled from /logo/white logo.png (row-major, 16 squares)
const LOGO_GRID_COLORS = [
  "#111111", "#111111", "#008FD5", "#B0B2B5",
  "#111111", "#B0B2B5", "#111111", "#111111",
  "#111111", "#B0B2B5", "#111111", "#111111",
  "#111111", "#111111", "#00A870", "#B0B2B5",
];

function generateRandomParticles(): Particle[] {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const maxR = Math.hypot(vw, vh) * 0.56;
  const minR = Math.min(vw, vh) * 0.36;

  return LOGO_GRID_COLORS.map((color, idx) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = minR + Math.random() * (maxR - minR);
    return {
      id: idx,
      startX: Math.cos(angle) * dist,
      startY: Math.sin(angle) * dist,
      startRot: (Math.random() - 0.5) * 320,
      startScale: 0.9 + Math.random() * 1.15,
      delay: Math.round(Math.random() * 180),
      duration: 680 + Math.round(Math.random() * 240),
      color,
    };
  });
}

export default function InitialLoader() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  const [visible, setVisible] = useState(!isAdmin);
  const [phase, setPhase] = useState<Phase>("boot");
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (isAdmin) {
      setVisible(false);
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(false);
      return;
    }

    document.body.style.overflow = "hidden";
    setParticles(generateRandomParticles());

    const timers: number[] = [];

    // Let initial React hydration settle (~160ms) before starting the GPU-composited keyframe flight
    timers.push(
      window.setTimeout(() => {
        setPhase("assemble");

        // Once all 16 particles have completely landed, reveal the DITSNDOTS wordmark beside them
        timers.push(
          window.setTimeout(() => {
            setPhase("reveal");

            // Hold for 1200ms after reveal starts, then fade out cleanly into the site
            timers.push(
              window.setTimeout(() => {
                setPhase("exit");
                document.body.style.overflow = "";

                timers.push(
                  window.setTimeout(() => {
                    setVisible(false);
                  }, 680)
                );
              }, 1200)
            );
          }, 1100)
        );
      }, 160)
    );

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      document.body.style.overflow = "";
    };
  }, [isAdmin]);

  if (!visible || isAdmin) return null;

  const isStarted = phase !== "boot";
  const isRevealed = phase === "reveal" || phase === "exit";

  return (
    <>
      <style>{`
        @keyframes ab-particle-fly-in {
          0% {
            transform: translate3d(var(--sx), var(--sy), 0) rotate(var(--sr)) scale(var(--ss));
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translate3d(0px, 0px, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
        }
        .ab-dots-loader {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          contain: layout style paint;
          opacity: 1;
          transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity;
        }
        .ab-dots-loader[data-exiting="1"] {
          opacity: 0;
          pointer-events: none;
        }
        .ab-loader-stage {
          position: relative;
          width: clamp(260px, 34vw, 440px);
          aspect-ratio: 16 / 9;
        }
        .ab-loader-logo-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          /* Reveal only the wordmark half (grid ends at 36.04%, 'D' starts at 36.72%) */
          clip-path: inset(0 0 0 36.2%);
          opacity: 0;
          transform: translate3d(48px, 0, 0);
          transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.68s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }
        .ab-loader-logo-img[data-revealed="1"] {
          opacity: 1;
          transform: translate3d(8px, 0, 0);
        }
        /* Exact measured 4x4 grid bounds inside 1920x1080 white logo.png (X: 8.33%-36.04%, Y: 25%-74.26%) */
        .ab-loader-grid-overlay {
          position: absolute;
          left: 8.33%;
          top: 25%;
          width: 27.71%;
          height: 49.26%;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(4, 1fr);
          gap: 9.2%;
          pointer-events: none;
        }
        .ab-loader-particle {
          width: 100%;
          height: 100%;
          border-radius: 24%;
          display: block;
          opacity: 0;
          will-change: transform, opacity;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .ab-loader-particle--fly {
          animation-name: ab-particle-fly-in;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
          animation-fill-mode: both;
        }
      `}</style>

      <div
        className="ab-dots-loader"
        data-exiting={phase === "exit" ? "1" : "0"}
        aria-label="Loading Dits N Dots"
        role="status"
      >
        <div className="ab-loader-stage">
          {/* Official white-background logo (exact 16:9 canvas) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/white%20logo.png"
            alt="Dits N Dots"
            data-revealed={isRevealed ? "1" : "0"}
            className="ab-loader-logo-img"
          />

          {/* 16 GPU-composited particles aligned pixel-exactly to the 4x4 squares */}
          <div className="ab-loader-grid-overlay" aria-hidden="true">
            {particles.map((p) => (
              <span
                key={p.id}
                className={
                  isStarted
                    ? "ab-loader-particle ab-loader-particle--fly"
                    : "ab-loader-particle"
                }
                style={
                  {
                    background: p.color,
                    ["--sx" as string]: `${p.startX.toFixed(1)}px`,
                    ["--sy" as string]: `${p.startY.toFixed(1)}px`,
                    ["--sr" as string]: `${p.startRot.toFixed(1)}deg`,
                    ["--ss" as string]: p.startScale.toFixed(2),
                    animationDuration: `${p.duration}ms`,
                    animationDelay: `${p.delay}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
