"use client";

import React from "react";

interface BrandLogoProps {
  /**
   * "light" = dark ink for light/cream backgrounds (white logo palette)
   * "dark"  = white/charcoal ink for dark or blue backgrounds (dark logo palette)
   * "auto"  = light by default, automatically switches to dark when ancestor [data-nav][data-tone="dark"]
   */
  variant?: "light" | "dark" | "auto";
  size?: "nav" | "footer";
}

// Row-major 4x4 grid matching /public/logo/white logo.png & dark logo.png
// "ink" = black on light bg, white on dark/blue bg
const GRID_CELLS: Array<"ink" | "blue" | "gray" | "green"> = [
  "ink", "ink", "blue", "gray",
  "ink", "gray", "ink", "ink",
  "ink", "gray", "ink", "ink",
  "ink", "ink", "green", "gray",
];

export default function BrandLogo({ variant = "light", size = "nav" }: BrandLogoProps) {
  const isFooter = size === "footer";

  return (
    <span className={`ab-brand ab-brand--${variant} ab-brand--${size}`}>
      <style>{`
        .ab-brand {
          display: inline-flex;
          align-items: center;
          gap: ${isFooter ? "14px" : "clamp(10px, 1vw, 14px)"};
          line-height: 1;
          user-select: none;
          white-space: nowrap;
        }
        .ab-brand-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(4, 1fr);
          gap: ${isFooter ? "3px" : "2.5px"};
          width: ${isFooter ? "42px" : "clamp(32px, 2.8vw, 40px)"};
          height: ${isFooter ? "42px" : "clamp(32px, 2.8vw, 40px)"};
          flex-shrink: 0;
        }
        .ab-brand-sq {
          width: 100%;
          height: 100%;
          border-radius: 24%;
          display: block;
          transition: background-color 0.28s ease;
        }
        .ab-brand-sq--blue { background-color: #008FD5; }
        .ab-brand-sq--gray { background-color: #A7A9AC; }
        .ab-brand-sq--green { background-color: #00A870; }
        .ab-brand-sq--ink { background-color: #111111; }

        .ab-brand-word {
          font-family: var(--font-display), "Space Grotesk", "Manrope", sans-serif;
          font-size: ${isFooter ? "16px" : "clamp(12px, 1.05vw, 15px)"};
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: baseline;
          line-height: 1;
        }
        .ab-brand-dits {
          color: #111111;
          transition: color 0.28s ease;
        }
        .ab-brand-n {
          color: #A7A9AC;
          margin: 0 0.06em;
          transition: color 0.28s ease;
        }
        .ab-brand-dots {
          color: #008FD5;
          transition: color 0.28s ease;
        }

        /* Explicit dark variant (e.g. footer on #0082C8 blue) OR auto when navbar is over dark/blue */
        .ab-brand--dark .ab-brand-sq--ink,
        [data-nav="1"][data-tone="dark"] .ab-brand--auto .ab-brand-sq--ink {
          background-color: #FFFFFF;
        }
        .ab-brand--dark .ab-brand-dits,
        [data-nav="1"][data-tone="dark"] .ab-brand--auto .ab-brand-dits {
          color: #FFFFFF;
        }
        .ab-brand--dark .ab-brand-n,
        [data-nav="1"][data-tone="dark"] .ab-brand--auto .ab-brand-n {
          color: #C4C7CC;
        }
        .ab-brand--dark .ab-brand-dots,
        [data-nav="1"][data-tone="dark"] .ab-brand--auto .ab-brand-dots {
          color: #1E232A;
        }
      `}</style>

      <span className="ab-brand-grid" aria-hidden="true">
        {GRID_CELLS.map((tone, i) => (
          <span key={i} className={`ab-brand-sq ab-brand-sq--${tone}`} />
        ))}
      </span>
      <span className="ab-brand-word">
        <span className="ab-brand-dits">DITS</span>
        <span className="ab-brand-n">N</span>
        <span className="ab-brand-dots">DOTS</span>
      </span>
    </span>
  );
}
