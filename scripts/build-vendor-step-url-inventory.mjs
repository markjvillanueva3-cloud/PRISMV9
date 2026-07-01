#!/usr/bin/env node
/**
 * build-vendor-step-url-inventory.mjs — Phase C-1 of TOOL-CATALOG-INGEST-MS0.
 *
 * Builds the vendor URL inventory that Phase D portal scrapers (D2-D6) consume
 * as their seed list. Sources:
 *   1. The 8 catalog-extractions/*.json (per-vendor extraction JSONs from B0)
 *   2. The 6 extracted/catalogs/*.js monolith JS files (raw `website:` strings)
 *   3. Hardcoded portal endpoints with documented STEP-download capability
 *      (Sandvik CoroPlus / Kennametal NOVO / Iscar etool / Misumi meCAD / GrabCAD / TraceParts)
 *
 * Output: state/shared/specs/VENDOR-STEP-URL-INVENTORY.json
 *
 * R12 fail-loud: every entry carries `auth_required`, `step_download_capable`,
 * and `tos_check_needed` flags. The inventory is ADVISORY — Phase D scrapers
 * must still respect each site's robots.txt + per-vendor terms of service.
 *
 * Usage:
 *   node scripts/build-vendor-step-url-inventory.mjs [--report]
 *
 * @module scripts/build-vendor-step-url-inventory
 * @since  TOOL-CATALOG-INGEST-MS0/U-TCI-C1 (2026-05-24, slot juliett iter20)
 */

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { PATHS } from "./lib/catalog-storage-paths.mjs";

const REPO_ROOT = "H:/prism";
const MONOLITH_DIR = `${REPO_ROOT}/extracted/catalogs`;
const OUTPUT_PATH = `${REPO_ROOT}/state/shared/specs/VENDOR-STEP-URL-INVENTORY.json`;

// ============================================================================
// Hardcoded portal endpoints — documented STEP download capability per vendor
// Each entry: WHERE PRISM Phase D scrapers should start. tos_check_needed=true
// means operator must verify the site's terms-of-service before automated use.
// ============================================================================

export const KNOWN_PORTALS = {
  sandvik: {
    base: "https://www.coromant.com",
    coroplus: "https://www.coromant.com/en-us/coroplus/toollibrary",
    note: "CoroPlus Tool Library provides documented data export (better than scraping)",
    auth_required: true,
    step_download_capable: true,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 5s (conservative — undocumented limit)",
  },
  kennametal: {
    base: "https://www.kennametal.com",
    novo: "https://www.kennametal.com/us/en/novo.html",
    note: "NOVO web platform — STEP downloads behind login",
    auth_required: true,
    step_download_capable: true,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 3s",
  },
  iscar: {
    base: "https://www.iscar.com",
    etool: "https://www.iscar.com/eCatalog",
    note: "eTool / eCatalog — login required for STEP",
    auth_required: true,
    step_download_capable: true,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 3s",
  },
  seco: {
    base: "https://www.secotools.com",
    suggest_app: "https://suggest.secotools.com",
    note: "SUGGEST web app — Seco's recommendation engine + STEP for some lines",
    auth_required: true,
    step_download_capable: true,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 5s",
  },
  mitsubishi: {
    base: "https://www.mmc-carbide.com",
    note: "Mitsubishi Materials catalog — STEP availability spotty per product line",
    auth_required: false,
    step_download_capable: true,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 5s",
  },
  walter: {
    base: "https://www.walter-tools.com",
    gps: "https://www.walter-tools.com/en-us/walter-gps",
    note: "Walter GPS — Global Productivity System with parametric product data",
    auth_required: true,
    step_download_capable: true,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 5s",
  },
  tungaloy: {
    base: "https://www.tungaloy.com",
    note: "Tungaloy has public datasheets but STEP requires direct contact for most lines",
    auth_required: false,
    step_download_capable: false,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 5s",
  },
  zeni: {
    base: "https://www.zenitools.com",
    note: "Zeni Tools — smaller vendor, public datasheets, STEP availability TBD",
    auth_required: false,
    step_download_capable: false,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 5s",
  },
  // STEP-of-last-resort community libraries (D6 backfill)
  grabcad: {
    base: "https://grabcad.com",
    library: "https://grabcad.com/library",
    note: "GrabCAD community library — search API + scraping-tolerant; STEP backfill source",
    auth_required: true,
    step_download_capable: true,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 2s",
    role: "step_backfill_d6",
  },
  traceparts: {
    base: "https://www.traceparts.com",
    note: "TraceParts CAD library — extensive vendor coverage; commercial license check needed",
    auth_required: true,
    step_download_capable: true,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 5s",
    role: "step_backfill_d6",
  },
  misumi: {
    base: "https://us.misumi-ec.com",
    note: "Misumi meCAD configurator — STEP per-part via Generate STEP button (login required)",
    auth_required: true,
    step_download_capable: true,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 3s (aggressive — bot-detection active)",
    role: "step_backfill_d3",
  },
  pts_tools: {
    base: "https://www.pts-tools.com",
    url_pattern: "/all-categories/[category]/[subcategory]/[product].html",
    note: "PTS Tools e-commerce — spec sheets per product page; STEP availability TBD per line",
    auth_required: false,
    step_download_capable: false,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 3s",
    role: "scraper_d2",
  },
};

// ============================================================================
// Pure helpers — use matchAll (no .exec calls for security-hook compatibility)
// ============================================================================

/** Extract `website: 'foo.com'` strings from a JS source blob. */
export function extractWebsiteStrings(jsSource) {
  if (typeof jsSource !== "string") return [];
  const matches = [...jsSource.matchAll(/website:\s*['"]([^'"]+)['"]/g)];
  return matches.map((m) => m[1]);
}

/** Extract per-vendor (slug, website) tuples from a multi-vendor JS file. */
export function extractVendorWebsites(jsSource) {
  if (typeof jsSource !== "string") return [];
  const re = /^\s\s([a-z_]+):\s*\{[\s\S]*?website:\s*['"]([^'"]+)['"]/gm;
  const matches = [...jsSource.matchAll(re)];
  return matches.map((m) => ({ slug: m[1], website: m[2] }));
}

/** Normalize a website string to a base URL. */
export function normalizeWebsite(site) {
  if (typeof site !== "string" || site.length === 0) return null;
  const trimmed = site.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  if (!trimmed) return null;
  return `https://${trimmed}`;
}

/** Merge a known-portal entry with a discovered website URL. */
export function mergeVendorEntry(vendorSlug, knownPortal, discoveredWebsite) {
  const base = knownPortal || {
    base: discoveredWebsite,
    auth_required: false,
    step_download_capable: false,
    tos_check_needed: true,
    rate_limit_recommendation: "1 req / 5s",
    note: `Auto-discovered from monolith JS (no curated portal entry yet)`,
  };
  // If both, prefer known_portal but record the discovered alt
  if (knownPortal && discoveredWebsite && discoveredWebsite !== knownPortal.base) {
    return { ...base, discovered_alt: discoveredWebsite };
  }
  if (!knownPortal && discoveredWebsite) {
    return { ...base, base: discoveredWebsite };
  }
  return base;
}

// ============================================================================
// I/O
// ============================================================================

async function discoverWebsites() {
  const websites = new Map(); // vendorSlug → website URL
  if (existsSync(MONOLITH_DIR)) {
    const files = await readdir(MONOLITH_DIR);
    for (const f of files) {
      if (!f.endsWith(".js")) continue;
      const src = await readFile(join(MONOLITH_DIR, f), "utf8");
      for (const { slug, website } of extractVendorWebsites(src)) {
        websites.set(slug, normalizeWebsite(website));
      }
    }
  }
  // From extraction JSONs — register any vendor that exists in our pipeline
  if (existsSync(PATHS.extractionsDir)) {
    const files = await readdir(PATHS.extractionsDir);
    for (const f of files) {
      if (!f.endsWith("-monolith-extracted.json")) continue;
      const data = JSON.parse(await readFile(join(PATHS.extractionsDir, f), "utf8"));
      const vendor = data.vendor;
      if (vendor && !websites.has(vendor)) {
        websites.set(vendor, null);
      }
    }
  }
  return websites;
}

async function main() {
  const args = process.argv.slice(2);
  const reportMode = args.includes("--report");

  const websites = await discoverWebsites();
  console.log(`Discovered ${websites.size} vendor(s) from monolith + extractions.`);

  const inventory = {
    schemaVersion: "1.0.0",
    generated_at: new Date().toISOString(),
    generated_by: "scripts/build-vendor-step-url-inventory.mjs",
    advisoryOnly: true,
    must_human_verify: true,
    tos_check_required: true,
    purpose: "Seed list for Phase D vendor portal scrapers (D2-D6) — vendor base URLs + portal endpoints + STEP-download capability flags",
    vendors: {},
    summary: { total_vendors: 0, with_known_portal: 0, with_step_capability: 0, with_auth_required: 0 },
  };

  const allSlugs = new Set([...Object.keys(KNOWN_PORTALS), ...websites.keys()]);
  for (const slug of allSlugs) {
    const known = KNOWN_PORTALS[slug];
    const discovered = websites.get(slug);
    const merged = mergeVendorEntry(slug, known, discovered);
    inventory.vendors[slug] = merged;
    inventory.summary.total_vendors++;
    if (known) inventory.summary.with_known_portal++;
    if (merged.step_download_capable) inventory.summary.with_step_capability++;
    if (merged.auth_required) inventory.summary.with_auth_required++;
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(inventory, null, 2));
  console.log(`Inventory written: ${OUTPUT_PATH}`);
  console.log(
    `Summary: ${inventory.summary.total_vendors} vendors / ${inventory.summary.with_step_capability} STEP-capable / ${inventory.summary.with_auth_required} need auth / ${inventory.summary.with_known_portal} curated portals`,
  );
  if (reportMode) {
    for (const [slug, v] of Object.entries(inventory.vendors)) {
      console.log(`  ${slug.padEnd(15)} ${v.base.padEnd(45)} auth=${v.auth_required} step=${v.step_download_capable} role=${v.role || "primary"}`);
    }
  }
}

const isMain = import.meta.url.replace(/\\/g, "/").endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMain) {
  main().catch((err) => {
    console.error("build-vendor-step-url-inventory failed:", err);
    process.exit(1);
  });
}
