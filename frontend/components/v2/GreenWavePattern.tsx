"use client";

import React, { useId } from "react";

interface GreenWavePatternProps {
  /** Mirrors the composition horizontally for visual variety between adjacent blue sections */
  flip?: boolean;
}

/**
 * Luminous layered blue backdrop design for all #0082C8 sections
 * (Our Works, Our Services, Footer):
 * - Soft cyan-to-cobalt volumetric glows
 * - Sweeping translucent curved arc/ribbon shapes
 * - Soft-edged halftone dot-matrix grids
 * - Fine parallel glowing wave lines sweeping across the center
 * Masked vertically at top & bottom edges so adjacent blue sections stay seamless.
 */
export default function GreenWavePattern({ flip = false }: GreenWavePatternProps) {
  const uid = useId().replace(/:/g, "");
  const shapeLeftId = `ab-blue-shape-l-${uid}`;
  const shapeRightId = `ab-blue-shape-r-${uid}`;
  const shapeBottomId = `ab-blue-shape-b-${uid}`;
  const waveGradId = `ab-blue-wave-${uid}`;
  const dotPatId = `ab-blue-dots-${uid}`;
  const dotFadeTL = `ab-dot-fade-tl-${uid}`;
  const dotFadeR = `ab-dot-fade-r-${uid}`;
  const dotFadeBL = `ab-dot-fade-bl-${uid}`;
  const dotMaskTL = `ab-dot-mask-tl-${uid}`;
  const dotMaskR = `ab-dot-mask-r-${uid}`;
  const dotMaskBL = `ab-dot-mask-bl-${uid}`;

  // 10 crisp parallel sweeping wave lines across the middle
  const waveLines = Array.from({ length: 10 }, (_, i) => {
    const dy = (i - 4.5) * 16;
    const opacity = (0.14 + Math.sin((i / 9) * Math.PI) * 0.24).toFixed(3);
    const strokeWidth = i === 4 || i === 5 ? 1.35 : 0.95;
    const d = `M -120 ${470 + dy} C 220 ${290 + dy * 0.85}, 480 ${720 + dy * 1.05}, 860 ${600 + dy * 0.9} S 1340 ${310 + dy * 0.95}, 1740 ${350 + dy}`;
    return { d, opacity, strokeWidth };
  });

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
        transform: flip ? "scaleX(-1)" : undefined,
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
      }}
    >
      {/* Volumetric luminous cyan & deep cobalt glows */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(52% 48% at 44% 16%, rgba(56, 210, 255, 0.34) 0%, rgba(56, 210, 255, 0) 68%)",
            "radial-gradient(48% 46% at 88% 48%, rgba(34, 197, 255, 0.28) 0%, rgba(34, 197, 255, 0) 70%)",
            "radial-gradient(56% 52% at 14% 72%, rgba(0, 56, 130, 0.34) 0%, rgba(0, 56, 130, 0) 72%)",
            "radial-gradient(46% 42% at 62% 84%, rgba(0, 44, 112, 0.28) 0%, rgba(0, 44, 112, 0) 70%)",
          ].join(", "),
        }}
      />

      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        <defs>
          {/* Translucent sweeping arc/ribbon gradients */}
          <linearGradient id={shapeLeftId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6BE2FF" stopOpacity="0.34" />
            <stop offset="55%" stopColor="#00A6F4" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#004C97" stopOpacity="0.04" />
          </linearGradient>

          <linearGradient id={shapeRightId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5CD8FF" stopOpacity="0.32" />
            <stop offset="60%" stopColor="#008EE0" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#003E80" stopOpacity="0.06" />
          </linearGradient>

          <linearGradient id={shapeBottomId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#003B82" stopOpacity="0.32" />
            <stop offset="55%" stopColor="#007ACC" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#72E5FF" stopOpacity="0.28" />
          </linearGradient>

          {/* Glowing wave line gradient */}
          <linearGradient id={waveGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9BEBFF" stopOpacity="0.15" />
            <stop offset="25%" stopColor="#B8F3FF" stopOpacity="0.88" />
            <stop offset="55%" stopColor="#7ADFFF" stopOpacity="0.72" />
            <stop offset="85%" stopColor="#C8F6FF" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#9BEBFF" stopOpacity="0.2" />
          </linearGradient>

          {/* Clean halftone dot-matrix pattern */}
          <pattern id={dotPatId} width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="13" cy="13" r="2.2" fill="#B5F0FF" fillOpacity="0.6" />
          </pattern>

          {/* Soft radial fade masks for the dot-matrix clusters */}
          <radialGradient id={dotFadeTL} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={dotFadeR} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={dotFadeBL} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          <mask id={dotMaskTL}>
            <rect x="0" y="0" width="560" height="360" fill={`url(#${dotFadeTL})`} />
          </mask>
          <mask id={dotMaskR}>
            <rect x="1140" y="180" width="520" height="680" fill={`url(#${dotFadeR})`} />
          </mask>
          <mask id={dotMaskBL}>
            <rect x="260" y="560" width="460" height="340" fill={`url(#${dotFadeBL})`} />
          </mask>
        </defs>

        {/* Halftone dot-matrix clusters (top-left, right edge, lower-left) */}
        <rect x="0" y="0" width="560" height="360" fill={`url(#${dotPatId})`} mask={`url(#${dotMaskTL})`} />
        <rect x="1140" y="180" width="520" height="680" fill={`url(#${dotPatId})`} mask={`url(#${dotMaskR})`} />
        <rect x="260" y="560" width="460" height="340" fill={`url(#${dotPatId})`} mask={`url(#${dotMaskBL})`} />

        {/* Large sweeping translucent curved ribbon shapes */}
        {/* Left arching wave */}
        <path
          d="M -120 260 C 120 140, 440 240, 520 520 C 580 730, 460 940, 260 980 L -140 980 Z"
          fill={`url(#${shapeLeftId})`}
        />
        {/* Bottom-left soft dome */}
        <path
          d="M -80 650 C 140 600, 340 720, 410 960 L -80 960 Z"
          fill={`url(#${shapeBottomId})`}
          opacity="0.7"
        />
        {/* Top-right sweeping C-curve ribbon */}
        <path
          d="M 1180 -60 C 980 120, 1020 430, 1270 500 C 1440 545, 1580 450, 1680 340 L 1680 -60 Z"
          fill={`url(#${shapeRightId})`}
        />
        {/* Lower-right sweeping S-hill */}
        <path
          d="M 680 960 C 820 770, 1040 810, 1210 680 C 1360 565, 1490 420, 1680 430 L 1680 960 Z"
          fill={`url(#${shapeBottomId})`}
        />

        {/* Parallel glowing wave contour lines sweeping across the center */}
        <g fill="none" stroke={`url(#${waveGradId})`}>
          {waveLines.map((line, idx) => (
            <path
              key={idx}
              d={line.d}
              strokeWidth={line.strokeWidth}
              opacity={line.opacity}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
