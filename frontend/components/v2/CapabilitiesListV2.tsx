"use client";

import React, { useState } from "react";
import { displayFont } from "./tokens";
import SectionHeading from "./SectionHeading";
import {
  Capability,
  CapabilityData,
  INK,
  CREAM,
  RULE,
  dim,
  serif,
  toCapabilities,
} from "./section-shared";

interface CapabilitiesListV2Props {
  data?: CapabilityData;
}

/**
 * Capabilities — list variant.
 * 
 * Replaces the bento grid with an elegant, high-contrast agency-style list.
 * Features a stark light theme that inverts to dark on hover, with smooth,
 * refined animations to avoid feeling overwhelming.
 */
export default function CapabilitiesListV2({ data }: CapabilitiesListV2Props) {
  const items = toCapabilities(data);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!items.length) return null;

  return (
    <section
      id="capabilities-list"
      data-reveal="1"
      data-depth="1"
      data-screen-label="Capabilities"
      data-nav-tone="light"
      style={{
        position: "relative",
        background: "#FFFFFF",
        color: "#000000",
        padding: "clamp(48px, 8vh, 100px) clamp(18px, 3.6vw, 60px)",
        overflow: "hidden",
      }}
    >
      <div data-depth-inner="1" style={{ maxWidth: 1280, margin: "0 auto" }}>
        
        {/* Header Section */}
        <div
          className="ab-grid-split ab-cap-head"
          style={{
            display: "grid",
            gridTemplateColumns: "auto auto",
            justifyContent: "space-between",
            gap: "clamp(20px, 3vw, 48px)",
            alignItems: "end",
            paddingBottom: "clamp(20px, 3.5vh, 36px)",
          }}
        >
          <h2
            style={{
              fontFamily: displayFont,
              fontWeight: 700,
              fontSize: "clamp(36px, 5.5vw, 84px)",
              lineHeight: 0.94,
              letterSpacing: "-.04em",
              margin: 0,
            }}
          >
            <span data-rv="line">
              <span>
                <SectionHeading tone="light" accent={1}>
                  Our capabilities
                </SectionHeading>
              </span>
            </span>
          </h2>

          <p
            data-rv="up"
            style={{
              ["--rv-i" as string]: 2,
              margin: "0 0 6px",
              fontSize: "clamp(13px, 1.05vw, 16px)",
              lineHeight: 1.5,
              color: dim(0.62),
              maxWidth: "26ch",
              textAlign: "right",
              justifySelf: "end",
            }}
          >
            Four disciplines, one team — from first sketch through launch, and sharp long after.
          </p>
        </div>

        {/* List Section */}
        <div
          style={{
            borderTop: `1px solid rgba(0,0,0,0.1)`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {items.map((item, idx) => {
            const isHovered = hoveredIndex === idx;
            const midTagIndex = Math.ceil(item.tags.length / 2);
            const leftTags = item.tags.slice(0, midTagIndex);
            const rightTags = item.tags.slice(midTagIndex);

            const imageSrc = item.image || `/images/capabilities/capability-${(idx % 5) + 1}.png`;
            // Keep the images away from the center text by placing them on the left (20%) or right (80%)
            const imageLeft = idx % 2 === 0 ? "80%" : "20%"; 
            const imageRotate = idx % 2 === 0 ? "3deg" : "-3deg";

            return (
              <div
                key={item.num}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr 1fr",
                  alignItems: "center",
                  padding: "clamp(16px, 2.2vw, 28px) clamp(16px, 2.5vw, 32px)",
                  borderBottom: `1px solid rgba(0,0,0,0.1)`,
                  background: isHovered ? INK : "transparent",
                  color: isHovered ? CREAM : "#000000",
                  transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                  borderRadius: isHovered ? "16px" : "0px",
                  cursor: "pointer",
                  margin: isHovered ? "0 -12px" : "0",
                  zIndex: isHovered ? 10 : 1,
                }}
              >
                {/* Image Reveal (Positioned Absolutely) */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: imageLeft,
                    transform: `translate(-50%, -50%) rotate(${isHovered ? imageRotate : "0deg"}) scale(${isHovered ? 1 : 0.85})`,
                    width: "clamp(180px, 18vw, 280px)",
                    aspectRatio: "4/3",
                    opacity: isHovered ? 1 : 0,
                    visibility: isHovered ? "visible" : "hidden",
                    pointerEvents: "none",
                    transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                    borderRadius: "10px",
                    overflow: "hidden",
                    boxShadow: "0 16px 36px rgba(0,0,0,0.25)",
                    zIndex: 20,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    alt={item.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>

                {/* Left Col: Number & Left Tags */}
                <div style={{ display: "flex", alignItems: "center", gap: "20px", zIndex: 1 }}>
                  <span
                    style={{
                      fontFamily: serif,
                      fontSize: "clamp(15px, 1.1vw, 18px)",
                      color: isHovered ? CREAM : dim(0.4),
                      transition: "color 0.35s ease",
                    }}
                  >
                    ({item.num})
                  </span>
                  
                  <div
                    style={{
                      opacity: isHovered ? 1 : 0,
                      transform: isHovered ? "translateX(0)" : "translateX(-8px)",
                      transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                      display: "flex",
                      gap: "10px",
                    }}
                  >
                    {leftTags.map(tag => (
                      <span key={tag} style={{ fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Center Col: Title */}
                <div style={{ textAlign: "center", zIndex: 1 }}>
                  <h3
                    style={{
                      fontFamily: displayFont,
                      fontWeight: 700,
                      fontSize: "clamp(32px, 4.5vw, 68px)",
                      letterSpacing: "-.03em",
                      margin: 0,
                      lineHeight: 1,
                    }}
                  >
                    {item.title}
                  </h3>
                </div>

                {/* Right Col: Right Tags */}
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", zIndex: 1 }}>
                  <div
                    style={{
                      opacity: isHovered ? 1 : 0,
                      transform: isHovered ? "translateX(0)" : "translateX(8px)",
                      transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                      display: "flex",
                      gap: "10px",
                    }}
                  >
                    {rightTags.map(tag => (
                      <span key={tag} style={{ fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
