"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
  };
};

let pendingResolve: (() => void) | null = null;
let pendingTimer: number | null = null;

function resolvePending() {
  if (pendingTimer !== null) {
    window.clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  if (pendingResolve) {
    const fn = pendingResolve;
    pendingResolve = null;
    fn();
  }
}

function getRouteDepth(path: string): number {
  const clean = (path || "/").replace(/\/+$/, "") || "/";
  if (clean === "/") return 0;
  return clean.split("/").filter(Boolean).length;
}

export function triggerSlideOver(
  navigate: () => void,
  direction: "forward" | "back" = "forward"
) {
  const doc = document as ViewTransitionDoc;
  if (
    typeof doc.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    navigate();
    return;
  }

  resolvePending();
  document.documentElement.dataset.transitionDir = direction;

  const vt = doc.startViewTransition(() => {
    return new Promise<void>((resolve) => {
      pendingResolve = resolve;
      pendingTimer = window.setTimeout(() => {
        resolvePending();
      }, 900);
      navigate();
    });
  });

  vt.finished.finally(() => {
    delete document.documentElement.dataset.transitionDir;
  });
}

export default function SlideOverTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  // Resolve the active view transition as soon as Next.js commits the new route
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      // Wait one paint frame so the new page DOM is fully laid out before revealing
      requestAnimationFrame(() => {
        resolvePending();
      });
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      // Do not run slide-over on /admin routes or same-page clicks
      if (url.pathname.startsWith("/admin") || window.location.pathname.startsWith("/admin")) {
        return;
      }
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      e.preventDefault();
      const dest = `${url.pathname}${url.search}${url.hash}`;
      const explicitDir = anchor.dataset.transition as "forward" | "back" | undefined;
      const inferredDir =
        getRouteDepth(url.pathname) < getRouteDepth(window.location.pathname)
          ? "back"
          : "forward";
      triggerSlideOver(() => {
        router.push(dest);
      }, explicitDir || inferredDir);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      resolvePending();
    };
  }, [router]);

  return null;
}
