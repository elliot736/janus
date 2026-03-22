import type { DetectionResult } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Detect common automation frameworks and headless indicators.
 * Each check is wrapped in a try/catch so a single failure does not
 * prevent the remaining signals from being collected.
 */
export function detectAutomation(): DetectionResult {
  const markers: string[] = [];

  // ── navigator.webdriver ────────────────────────────────────────
  let webdriver = false;
  try {
    if ((navigator as any).webdriver === true) {
      webdriver = true;
      markers.push("navigator.webdriver");
    }
  } catch {
    /* ignore */
  }

  // ── PhantomJS / Nightmare ──────────────────────────────────────
  let phantom = false;
  try {
    const w = window as any;
    if (w._phantom || w.__nightmare || w.callPhantom) {
      phantom = true;
      if (w._phantom) markers.push("window._phantom");
      if (w.__nightmare) markers.push("window.__nightmare");
      if (w.callPhantom) markers.push("window.callPhantom");
    }
  } catch {
    /* ignore */
  }

  // ── Selenium / WebDriver markers ───────────────────────────────
  let selenium = false;
  try {
    const doc = document as any;
    const seleniumProps = [
      "$cdc_",
      "$wdc_",
      "__webdriver_evaluate",
      "__selenium_evaluate",
      "__fxdriver_evaluate",
      "__driver_evaluate",
      "__webdriver_unwrap",
      "__selenium_unwrap",
      "__fxdriver_unwrap",
      "__driver_unwrap",
    ];

    for (const prop of seleniumProps) {
      // Check both document and document.documentElement
      if (doc[prop] !== undefined || doc.documentElement?.getAttribute(prop)) {
        selenium = true;
        markers.push(`document.${prop}`);
      }
    }

    // Also look through all document properties for $cdc_ or $wdc_ patterns
    for (const key of Object.keys(doc)) {
      if (key.startsWith("$cdc_") || key.startsWith("$wdc_")) {
        selenium = true;
        if (!markers.includes(`document.${key}`)) {
          markers.push(`document.${key}`);
        }
      }
    }
  } catch {
    /* ignore */
  }

  // ── Chrome DevTools Protocol (CDP) ─────────────────────────────
  let cdp = false;
  try {
    const w = window as any;
    if (
      w.chrome &&
      w.chrome.runtime &&
      typeof w.chrome.runtime.id === "undefined"
    ) {
      // chrome.runtime exists but has no extension id — likely injected by CDP
      cdp = true;
      markers.push("chrome.runtime (no extension)");
    }
  } catch {
    /* ignore */
  }

  // ── Headless indicators ────────────────────────────────────────
  let headless = false;
  try {
    // No plugins is suspicious in a real browser
    if (navigator.plugins && navigator.plugins.length === 0) {
      headless = true;
      markers.push("plugins.length === 0");
    }

    // Missing chrome object in a Chromium-based UA
    const ua = navigator.userAgent.toLowerCase();
    const w = window as any;
    if (
      (ua.includes("chrome") || ua.includes("chromium")) &&
      !w.chrome
    ) {
      headless = true;
      markers.push("missing window.chrome");
    }

    // HeadlessChrome in user agent
    if (ua.includes("headless")) {
      headless = true;
      markers.push("headless UA");
    }
  } catch {
    /* ignore */
  }

  return { webdriver, phantom, selenium, cdp, headless, markers };
}
