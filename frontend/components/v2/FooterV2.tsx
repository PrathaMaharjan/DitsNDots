"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { displayFont } from "./tokens";
import GreenWavePattern from "./GreenWavePattern";

interface PieceSpec {
  id: string;
  char: "D" | "I" | "T" | "S" | "N" | "O" | "DOT";
  color: string;
  /** Width & height in viewBox units (height = 100) */
  vbW: number;
}

/**
 * Colors pulled directly from the Dits N Dots logo:
 * - Pure White (#F7F6F3)
 * - Electric Cyan (#00D2FF) — the 'N'
 * - Ocean Blue (#0084C7) — top-row logo square
 * - Cool Slate Gray (#A3AAB5) — inner logo squares
 * - Emerald Green (#00A870) — bottom-row logo square
 */
const PIECES: PieceSpec[] = [
  { id: "D1", char: "D", color: "#FFFFFF", vbW: 86 },
  { id: "I1", char: "I", color: "#0B111A", vbW: 44 },
  { id: "T1", char: "T", color: "#00467A", vbW: 84 },
  { id: "S1", char: "S", color: "#FFFFFF", vbW: 82 },
  { id: "N1", char: "N", color: "#02AA7A", vbW: 90 },
  { id: "D2", char: "D", color: "#0B111A", vbW: 86 },
  { id: "O1", char: "O", color: "#00467A", vbW: 92 },
  { id: "T2", char: "T", color: "#FFFFFF", vbW: 84 },
  { id: "S2", char: "S", color: "#0B111A", vbW: 82 },
  { id: "dot-blue", char: "DOT", color: "#00467A", vbW: 46 },
  { id: "dot-green", char: "DOT", color: "#02AA7A", vbW: 42 },
  { id: "dot-dark", char: "DOT", color: "#0B111A", vbW: 44 },
];

/** Chunky, ultra-thick, pillow-rounded geometric SVG letterforms (Humaan block weight). */
function ChunkyLetterSVG({ char, color }: { char: PieceSpec["char"]; color: string }) {
  const sw = 26;
  const common = {
    fill: "none",
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (char) {
    case "D":
      return (
        <svg viewBox="0 0 86 100" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}>
          <path d="M 16 15 L 40 15 C 61 15 72 28 72 50 C 72 72 61 85 40 85 L 16 85 Z" {...common} />
        </svg>
      );
    case "I":
      return (
        <svg viewBox="0 0 44 100" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}>
          <line x1="22" y1="15" x2="22" y2="85" {...common} strokeWidth={30} />
        </svg>
      );
    case "T":
      return (
        <svg viewBox="0 0 84 100" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}>
          <line x1="14" y1="16" x2="70" y2="16" {...common} />
          <line x1="42" y1="16" x2="42" y2="85" {...common} />
        </svg>
      );
    case "S":
      return (
        <svg viewBox="0 0 82 100" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}>
          <path
            d="M 64 25 C 58 15 20 12 18 31 C 16 50 66 47 64 69 C 62 88 24 86 16 74"
            {...common}
          />
        </svg>
      );
    case "N":
      return (
        <svg viewBox="0 0 90 100" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}>
          <path d="M 16 85 L 16 15 L 74 85 L 74 15" {...common} />
        </svg>
      );
    case "O":
      return (
        <svg viewBox="0 0 92 100" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}>
          <rect x="15" y="15" width="62" height="70" rx="31" {...common} />
        </svg>
      );
    case "DOT":
      return (
        <svg viewBox="0 0 46 46" style={{ width: "100%", height: "100%", display: "block" }}>
          <rect x="2" y="2" width="42" height="42" rx="12" fill={color} />
        </svg>
      );
  }
}

// Same physics constants & capsule solver as SkillsPhysics.tsx ("Let's Build Something")
const GRAVITY = 2100; // px/s²
const RESTITUTION = 0.16;
const FRICTION = 0.18;
const LINEAR_DAMPING = 0.16;
const ANGULAR_DAMPING = 0.36;
const SOLVER_ITERATIONS = 6;
const DT = 1 / 120;
const MAX_STEPS_PER_FRAME = 5;

interface Body {
  spec: PieceSpec;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  w: number;
  h: number;
  half: number;
  r: number;
  invMass: number;
  invInertia: number;
  el: HTMLElement | null;
  dropAt: number;
  live: boolean;
  held: boolean;
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}

function segClosest(
  px: number, py: number, pdx: number, pdy: number,
  qx: number, qy: number, qdx: number, qdy: number
) {
  const rx = px - qx;
  const ry = py - qy;
  const a = pdx * pdx + pdy * pdy;
  const e = qdx * qdx + qdy * qdy;
  const f = qdx * rx + qdy * ry;
  let s = 0;
  let t = 0;
  if (a <= 1e-8 && e <= 1e-8) return { s: 0, t: 0 };
  if (a <= 1e-8) {
    t = clamp(f / e, 0, 1);
  } else {
    const c = pdx * rx + pdy * ry;
    if (e <= 1e-8) {
      s = clamp(-c / a, 0, 1);
    } else {
      const b = pdx * qdx + pdy * qdy;
      const denom = a * e - b * b;
      s = denom > 1e-8 ? clamp((b * f - c * e) / denom, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a, 0, 1);
      }
    }
  }
  return { s, t };
}

export default function FooterV2() {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const bodiesRef = useRef<Body[]>([]);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const accRef = useRef(0);
  const lastRef = useRef(0);
  const frameRef = useRef(0);
  const dragRef = useRef<{ body: Body; px: number; py: number; lx: number; ly: number } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const replayRef = useRef<(() => void) | null>(null);

  const measure = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    sizeRef.current = { w: box.clientWidth, h: box.clientHeight };
    bodiesRef.current.forEach((b) => {
      if (!b.el) return;
      const w = b.el.offsetWidth || 80;
      const h = b.el.offsetHeight || 96;
      b.w = w;
      b.h = h;
      // Capsule orientation along the longer dimension so tall letters & wide letters both rest flat
      const minDim = Math.min(w, h);
      const maxDim = Math.max(w, h);
      b.r = minDim * 0.46;
      b.half = Math.max(8, (maxDim - minDim) * 0.45 + minDim * 0.14);
      const mass = (w * h) / 2600;
      b.invMass = 1 / mass;
      b.invInertia = 12 / (mass * (w * w + h * h));
    });
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const els = Array.from(box.querySelectorAll<HTMLElement>("[data-footer-piece]"));
    bodiesRef.current = els.map((el, i) => ({
      spec: PIECES[i],
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      a: 0,
      va: 0,
      w: 84,
      h: 96,
      half: 24,
      r: 36,
      invMass: 1,
      invInertia: 0.01,
      el,
      dropAt: 0,
      live: true,
      held: false,
    }));
    measure();

    const bodies = bodiesRef.current;

    /** Place letters assembled as the word DITSNDOTS across the upper stage,
     *  then release them in a rapid fracture cascade so the word breaks and falls. */
    const reset = () => {
      measure();
      const { w, h } = sizeRef.current;
      frameRef.current = 0;

      const letters = bodies.filter((b) => b.spec.char !== "DOT");
      const gap = Math.max(4, w * 0.005);
      const totalW = letters.reduce((sum, b) => sum + b.w, 0) + gap * (letters.length - 1);
      // Position the assembled word across the right half of the stage (leaving left info columns clear)
      let cursorX = Math.max(24, w - totalW - Math.max(24, w * 0.03));
      const wordY = Math.max(80, h * 0.42);

      bodies.forEach((b, i) => {
        if (b.spec.char === "DOT") {
          const dotIdx = i - letters.length;
          b.x = w * (0.56 + dotIdx * 0.14);
          b.y = Math.max(36, wordY - 68);
          b.vx = (Math.random() - 0.5) * 70;
          b.vy = 0;
          b.a = (dotIdx - 1) * 0.25;
          b.va = (Math.random() - 0.5) * 1.8;
          b.dropAt = 24 + dotIdx * 7;
          b.live = false;
          b.held = false;
          return;
        }

        b.x = cursorX + b.w / 2;
        b.y = wordY;
        cursorX += b.w + gap;

        // Center-outward fracture: 'N' (index 4) breaks first, neighbours cascade out
        const distFromCenter = Math.abs(i - 4);
        const dir = i < 4 ? -1 : i > 4 ? 1 : 0;
        b.vx = dir * (28 + distFromCenter * 14) + (Math.random() - 0.5) * 35;
        b.vy = -40 - Math.random() * 45;
        b.a = 0;
        b.va = (i % 2 === 0 ? 1 : -1) * (0.55 + Math.random() * 0.9);
        // Hold intact as "DITSNDOTS" for ~20 frames (~0.17s), then break apart
        b.dropAt = 18 + distFromCenter * 5 + i * 2;
        b.live = false;
        b.held = false;
      });
    };
    reset();

    const applyImpulse = (b: Body, ix: number, iy: number, rx: number, ry: number) => {
      if (b.held) return;
      b.vx += ix * b.invMass;
      b.vy += iy * b.invMass;
      b.va += (rx * iy - ry * ix) * b.invInertia;
    };

    const resolve = (
      A: Body, B: Body | null,
      nx: number, ny: number, depth: number,
      cxA: number, cyA: number, cxB: number, cyB: number
    ) => {
      const invSum = A.invMass + (B ? B.invMass : 0);
      if (invSum <= 0) return;

      const corr = (Math.max(depth - 0.5, 0) / invSum) * 0.7;
      if (!A.held) {
        A.x += nx * corr * A.invMass;
        A.y += ny * corr * A.invMass;
      }
      if (B && !B.held) {
        B.x -= nx * corr * B.invMass;
        B.y -= ny * corr * B.invMass;
      }

      const raX = cxA - A.x;
      const raY = cyA - A.y;
      const rbX = B ? cxB - B.x : 0;
      const rbY = B ? cyB - B.y : 0;

      const vAx = A.vx - A.va * raY;
      const vAy = A.vy + A.va * raX;
      const vBx = B ? B.vx - B.va * rbY : 0;
      const vBy = B ? B.vy + B.va * rbX : 0;

      const rvx = vAx - vBx;
      const rvy = vAy - vBy;
      const vn = rvx * nx + rvy * ny;
      if (vn > 0) return;

      const raCrossN = raX * ny - raY * nx;
      const rbCrossN = rbX * ny - rbY * nx;
      let denom = invSum + raCrossN * raCrossN * A.invInertia;
      if (B) denom += rbCrossN * rbCrossN * B.invInertia;
      if (denom <= 1e-8) return;

      const j = (-(1 + RESTITUTION) * vn) / denom;
      applyImpulse(A, nx * j, ny * j, raX, raY);
      if (B) applyImpulse(B, -nx * j, -ny * j, rbX, rbY);

      const tx = -ny;
      const ty = nx;
      const vt = rvx * tx + rvy * ty;
      const raCrossT = raX * ty - raY * tx;
      const rbCrossT = rbX * ty - rbY * tx;
      let tDenom = invSum + raCrossT * raCrossT * A.invInertia;
      if (B) tDenom += rbCrossT * rbCrossT * B.invInertia;
      if (tDenom <= 1e-8) return;
      let jt = -vt / tDenom;
      const max = j * FRICTION;
      jt = clamp(jt, -Math.abs(max), Math.abs(max));
      applyImpulse(A, tx * jt, ty * jt, raX, raY);
      if (B) applyImpulse(B, -tx * jt, -ty * jt, rbX, rbY);
    };

    const collideWalls = (b: Body) => {
      const { w, h } = sizeRef.current;
      const ca = Math.cos(b.a);
      const sa = Math.sin(b.a);
      for (const sgn of [-1, 1]) {
        const ex = b.x + ca * b.half * sgn;
        const ey = b.y + sa * b.half * sgn;
        if (ex - b.r < 0) resolve(b, null, 1, 0, b.r - ex, ex, ey, 0, 0);
        if (ex + b.r > w) resolve(b, null, -1, 0, ex + b.r - w, ex, ey, 0, 0);
        if (ey + b.r > h) resolve(b, null, 0, -1, ey + b.r - h, ex, ey, 0, 0);
        if (ey - b.r < 0 && b.live) resolve(b, null, 0, 1, b.r - ey, ex, ey, 0, 0);
      }
    };

    const collidePair = (A: Body, B: Body) => {
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const reach = A.half + A.r + B.half + B.r;
      if (dx * dx + dy * dy > reach * reach) return;

      const aCos = Math.cos(A.a) * A.half;
      const aSin = Math.sin(A.a) * A.half;
      const bCos = Math.cos(B.a) * B.half;
      const bSin = Math.sin(B.a) * B.half;

      const p1x = A.x - aCos;
      const p1y = A.y - aSin;
      const q1x = B.x - bCos;
      const q1y = B.y - bSin;
      const pdx = aCos * 2;
      const pdy = aSin * 2;
      const qdx = bCos * 2;
      const qdy = bSin * 2;

      const { s, t } = segClosest(p1x, p1y, pdx, pdy, q1x, q1y, qdx, qdy);
      const cax = p1x + pdx * s;
      const cay = p1y + pdy * s;
      const cbx = q1x + qdx * t;
      const cby = q1y + qdy * t;

      let nx = cax - cbx;
      let ny = cay - cby;
      let d = Math.hypot(nx, ny);
      const rsum = A.r + B.r;
      if (d >= rsum) return;
      if (d < 1e-6) {
        nx = 0;
        ny = -1;
        d = 1e-6;
      } else {
        nx /= d;
        ny /= d;
      }
      resolve(A, B, nx, ny, rsum - d, cax, cay, cbx, cby);
    };

    const step = () => {
      frameRef.current += 1;
      const f = frameRef.current;

      for (const b of bodies) {
        if (!b.live && f >= b.dropAt) {
          b.live = true;
        }
        if (!b.live || b.held) continue;
        b.vy += GRAVITY * DT;
        b.vx -= b.vx * LINEAR_DAMPING * DT;
        b.vy -= b.vy * LINEAR_DAMPING * DT;
        b.va -= b.va * ANGULAR_DAMPING * DT;
        b.x += b.vx * DT;
        b.y += b.vy * DT;
        b.a += b.va * DT;
      }

      for (let it = 0; it < SOLVER_ITERATIONS; it++) {
        for (let i = 0; i < bodies.length; i++) {
          const A = bodies[i];
          if (!A.live) continue;
          collideWalls(A);
          for (let j = i + 1; j < bodies.length; j++) {
            const B = bodies[j];
            if (!B.live) continue;
            collidePair(A, B);
          }
        }
      }
    };

    const draw = () => {
      for (const b of bodies) {
        if (!b.el) continue;
        // Show letters assembled before they drop; dots appear as they drop
        b.el.style.opacity = b.spec.char === "DOT" && !b.live ? "0" : "1";
        b.el.style.transform =
          `translate3d(${(b.x - b.w / 2).toFixed(2)}px, ${(b.y - b.h / 2).toFixed(2)}px, 0)` +
          ` rotate(${b.a.toFixed(4)}rad)`;
      }
    };
    draw();

    let idleFrames = 0;

    const loop = (now: number) => {
      if (!runningRef.current) return;
      const last = lastRef.current || now;
      lastRef.current = now;
      accRef.current += Math.min((now - last) / 1000, 0.1);
      let steps = 0;
      while (accRef.current >= DT && steps < MAX_STEPS_PER_FRAME) {
        step();
        accRef.current -= DT;
        steps++;
      }
      draw();

      // Auto-sleep the physics rAF loop once all pieces have settled on the floor
      // (re-wakes immediately on pointerdown if the user drags a piece).
      let allLive = true;
      let anyHeld = false;
      let maxMotion = 0;
      for (const b of bodies) {
        if (!b.live) {
          allLive = false;
          break;
        }
        if (b.held) {
          anyHeld = true;
          break;
        }
        const m = Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.va) * 45;
        if (m > maxMotion) maxMotion = m;
      }

      if (allLive && !anyHeld && maxMotion < 12) {
        idleFrames += 1;
        if (idleFrames >= 45) {
          runningRef.current = false;
          rafRef.current = null;
          return;
        }
      } else {
        idleFrames = 0;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    const start = () => {
      if (runningRef.current) return;
      idleFrames = 0;
      runningRef.current = true;
      lastRef.current = 0;
      accRef.current = 0;
      rafRef.current = requestAnimationFrame(loop);
    };
    const stop = () => {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };

    replayRef.current = () => {
      reset();
      draw();
      start();
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(box);

    const onVis = () => {
      if (document.visibilityState === "hidden") stop();
    };
    document.addEventListener("visibilitychange", onVis);

    const localPoint = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onPointerDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-footer-piece]");
      if (!el) return;
      const b = bodies.find((x) => x.el === el);
      if (!b) return;
      const p = localPoint(e);
      b.live = true;
      b.held = true;
      b.vx = b.vy = b.va = 0;
      dragRef.current = { body: b, px: p.x - b.x, py: p.y - b.y, lx: p.x, ly: p.y };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      e.preventDefault();
      start();
    };

    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const p = localPoint(e);
      const { w, h } = sizeRef.current;
      d.body.x = clamp(p.x - d.px, d.body.r, w - d.body.r);
      d.body.y = clamp(p.y - d.py, d.body.r, h - d.body.r);
      d.body.vx = (p.x - d.lx) / DT / 12;
      d.body.vy = (p.y - d.ly) / DT / 12;
      d.lx = p.x;
      d.ly = p.y;
      e.preventDefault();
    };

    const onPointerUp = () => {
      const d = dragRef.current;
      if (!d) return;
      d.body.held = false;
      const sp = Math.hypot(d.body.vx, d.body.vy);
      const MAXV = 2400;
      if (sp > MAXV) {
        d.body.vx = (d.body.vx / sp) * MAXV;
        d.body.vy = (d.body.vy / sp) * MAXV;
      }
      d.body.va += (Math.random() - 0.5) * 3.5;
      dragRef.current = null;
    };

    box.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    const onResize = () => {
      const prev = sizeRef.current.w;
      measure();
      const next = sizeRef.current.w;
      if (prev > 0 && next > 0 && next !== prev) {
        const k = next / prev;
        bodies.forEach((b) => {
          b.x = clamp(b.x * k, b.r, next - b.r);
        });
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      box.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", onResize);
    };
  }, [measure]);

  return (
    <footer
      data-reveal="1"
      data-nav-tone="dark"
      style={{
        position: "relative",
        zIndex: 1,
        background: "#0082C8",
        color: "#F7F6F3",
        padding: "clamp(195px, 24vh, 255px) clamp(18px, 3.6vw, 60px) clamp(20px, 2.8vh, 32px)",
        overflow: "hidden",
      }}
    >
      <GreenWavePattern />
      <style>{`
        .ab-footer-cta-arrow {
          display: inline-block;
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ab-footer-cta-head:hover .ab-footer-cta-arrow {
          transform: translateX(10px);
        }
      `}</style>
      <div
        data-footer-inner="1"
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1680,
          margin: "0 auto",
          width: "100%",
          willChange: "transform, filter",
          transformOrigin: "50% 35%",
        }}
      >
        {/* Unified interactive footer stage: heading + left info columns at top-left, open floor below for physics letters */}
        <div
          ref={boxRef}
          style={{
            position: "relative",
            width: "100%",
            minHeight: "clamp(360px, 38vw, 460px)",
            paddingBottom: "clamp(150px, 18vw, 210px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.28)",
            overflow: "hidden",
            userSelect: "none",
            touchAction: "pan-y",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            gap: "clamp(22px, 3.4vh, 36px)",
          }}
        >
          {/* Top-Left Big Humaan-style Display Heading */}
          <div
            data-rv="up"
            style={{
              ["--rv-i" as string]: 0,
              position: "relative",
              zIndex: 3,
              pointerEvents: "none",
            }}
          >
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("ditsndots:open-project-sheet"));
              }}
              className="ab-footer-cta-head"
              style={{
                display: "inline-block",
                padding: 0,
                border: "none",
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
                pointerEvents: "auto",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: displayFont,
                  fontWeight: 700,
                  fontSize: "clamp(34px, 4.8vw, 72px)",
                  lineHeight: 1.04,
                  letterSpacing: "-0.04em",
                  color: "#FFFFFF",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2em" }}>
                  <span>Let&apos;s make</span>
                  <span className="ab-footer-cta-arrow" aria-hidden="true" style={{ color: "#0B111A" }}>
                    &rarr;
                  </span>
                </span>
                <br />
                <span>
                  something <span style={{ color: "#0B111A" }}>extraordinary</span>
                </span>
              </h2>
            </button>
          </div>

          {/* Clean borderless info columns aligned to the bottom-left */}
          <div
            className="ab-grid-footer"
            style={{
              position: "relative",
              zIndex: 3,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(180px, 240px))",
              gap: "clamp(24px, 3.6vw, 52px)",
              pointerEvents: "none",
            }}
          >
            {/* Column 1: Global / Brief / Email */}
            <div
              data-rv="up"
              style={{
                ["--rv-i" as string]: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 15, fontWeight: 800, color: "#FFFFFF" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.1" aria-hidden="true">
                  <circle cx="12" cy="12" r="9.5" />
                  <path d="M2.5 12h19M12 2.5c2.8 2.7 4.4 6 4.4 9.5s-1.6 6.8-4.4 9.5c-2.8-2.7-4.4-6-4.4-9.5s1.6-6.8 4.4-9.5z" />
                </svg>
                <span>We work globally</span>
              </div>
              <span
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  pointerEvents: "auto",
                  fontFamily: "inherit",
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.88)",
                  wordBreak: "break-all",
                  cursor: "default",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              >
                hello@ditsanddots.com
              </span>
            </div>

            {/* Column 2: USA Office */}
            <div
              data-rv="up"
              style={{
                ["--rv-i" as string]: 2,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF", letterSpacing: ".01em" }}>USA</span>
              <span style={{ fontSize: 14.5, fontWeight: 500, color: "rgba(255, 255, 255, 0.86)", lineHeight: 1.45 }}>
                3620 Adelaide
                <br />
                The Colony, TX 75056
              </span>
              <span
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  pointerEvents: "auto",
                  fontFamily: "inherit",
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: "#0B111A",
                  cursor: "default",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              >
                +1 (817) 330-9194
              </span>
            </div>
          </div>

          {/* Chunky, rounded DITSNDOTS SVG letter blocks driven by SkillsPhysics solver */}
          {PIECES.map((piece, idx) => {
            const isDot = piece.char === "DOT";
            const heightExpr = isDot
              ? "clamp(32px, 3.8vw, 56px)"
              : "clamp(78px, 10.2vw, 148px)";
            const widthExpr = isDot
              ? "clamp(32px, 3.8vw, 56px)"
              : `calc(clamp(78px, 10.2vw, 148px) * ${(piece.vbW / 100).toFixed(2)})`;

            return (
              <span
                key={piece.id}
                data-footer-piece={idx}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  zIndex: 2,
                  width: widthExpr,
                  height: heightExpr,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "grab",
                  userSelect: "none",
                  touchAction: "none",
                  willChange: "transform",
                  opacity: 0,
                }}
              >
                <ChunkyLetterSVG char={piece.char} color={piece.color} />
              </span>
            );
          })}
        </div>

        {/* Humaan-style bottom bar below the floor line */}
        <div
          data-rv="up"
          style={{
            ["--rv-i" as string]: 3,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            paddingTop: "clamp(18px, 2.6vh, 28px)",
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo/dark%20logo.png"
                alt="Dits N Dots"
                style={{ height: 64, width: "auto", objectFit: "contain", display: "block", margin: "-12px 0" }}
              />
            </span>
            <span>&copy; 2026 Dits and Dots Agency</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, fontWeight: 700, color: "#FFFFFF" }}>
            <a className="ab-flink" href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#FFFFFF" }}>
              Twitter X
            </a>
            <span aria-hidden="true" style={{ color: "#0B111A", fontSize: 14 }}>&#10033;</span>
            <a className="ab-flink" href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#FFFFFF" }}>
              Instagram
            </a>
            <span aria-hidden="true" style={{ color: "#0B111A", fontSize: 14 }}>&#10033;</span>
            <a className="ab-flink" href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#FFFFFF" }}>
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
