#!/usr/bin/env node
/**
 * pull-vendor-catalogs.mjs — VENDOR-NETWORK-MS0/U-VDN-CATALOG-PULL
 *
 * Rate-limit-IMMUNE catalog acquisition helper. The fleet throttle is an
 * Anthropic org-wide rate limit tripped by ultracode agent fan-out
 * (knowledge/memories/reference/reference_fleet_rate_limit_diagnosis_2026_05_29.md),
 * so this tool deliberately does NO model/agent work and NO subprocess spawning:
 * it is the PURE logic half (link extraction, ranking, PDF validation, manifest
 * merge). The network half is `curl` driven from Bash — a local subprocess
 * against the vendor's own web server that never touches the Anthropic API.
 *
 * Reuses the lathe vendor-PDF-download manifest pattern
 * (reference_lathe_vendor_pdf_download_design_2026_05_27.md): every attempt is
 * recorded so anything that does not land is a clear operator-wget list.
 *
 * Modes (CLI):
 *   --list                         print seed vendors as `slug|vendor|tier|category|url1,url2`
 *   --extract --base <url>         read HTML on stdin → print ranked .pdf URLs
 *   --validate <path> [--min N]    exit 0 iff file is a real PDF and >= N bytes
 *   --merge --manifest <p> [--results <jsonl>]   merge result lines (stdin or file) into manifest
 *
 * Pure exports (unit-tested, zero I/O): slugify, isValidPdfBuffer, isPdfUrl,
 * extractPdfLinks, pickBestPdfLinks, mergeManifest, SEED_VENDORS.
 */
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, readFileSync as _rf } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_MANIFEST = "H:/prism-slot-charlie/state/shared/quoting/catalog-download-manifest.json";
export const MIN_BYTES_DEFAULT = 500_000;
const MAX_SLUG_LEN = 80;
const PDF_MAGIC_LEN = 4;
const UNRANKED_TIER = 9;

/**
 * Seed list — cutting-tool makers NOT already pulled
 * (Harvey/Helical/Korloy/M.A.Ford/Niagara/Walter) and NOT already ingested into
 * src/data (osg/sandvik/seco/kennametal/iscar/tungaloy/sumitomo/mitsubishi/
 * widia/horn/dormer/guhring/ingersoll/emuge). URLs are best-effort resource /
 * homepage entry points; the HTML scraper resolves the real PDF link, so a URL
 * that 404s or JS-renders yields status:pending (operator-wget), never a
 * fabricated success (R12).
 */
export const SEED_VENDORS = [
  { vendor: "Lakeshore Carbide", slug: "lakeshore-carbide", tier: 1, category: "tooling-consumable",
    urls: ["https://lakeshorecarbide.com/speedsandfeeds.aspx", "https://lakeshorecarbide.com/"] },
  { vendor: "Destiny Tool", slug: "destiny-tool", tier: 1, category: "tooling-consumable",
    urls: ["https://destinytool.com/speeds--feeds.html", "https://destinytool.com/"] },
  { vendor: "Garr Tool", slug: "garr-tool", tier: 1, category: "tooling-consumable",
    urls: ["https://www.garrtool.com/resources/", "https://www.garrtool.com/"] },
  { vendor: "Melin Tool", slug: "melin-tool", tier: 2, category: "tooling-consumable",
    urls: ["https://www.endmill.com/pages/training/Speed%20and%20Feed.html", "https://www.endmill.com/"] },
  { vendor: "Micro 100", slug: "micro-100", tier: 2, category: "tooling-consumable",
    urls: ["https://www.micro100.com/resources", "https://www.micro100.com/"] },
  { vendor: "Fullerton Tool", slug: "fullerton-tool", tier: 2, category: "tooling-consumable",
    urls: ["https://www.fullertontool.com/resources/", "https://www.fullertontool.com/"] },
  { vendor: "IMCO Carbide", slug: "imco-carbide", tier: 2, category: "tooling-consumable",
    urls: ["https://www.imcousa.com/", "https://www.imcousa.com/resources"] },
  { vendor: "YG-1", slug: "yg1", tier: 2, category: "tooling-consumable",
    urls: ["https://www.yg1usa.com/", "https://www.yg1.com/"] },
  { vendor: "Cobra Carbide", slug: "cobra-carbide", tier: 3, category: "tooling-consumable",
    urls: ["https://www.cobracarbide.com/catalog", "https://www.cobracarbide.com/"] },
  { vendor: "Data Flute", slug: "data-flute", tier: 3, category: "tooling-consumable",
    urls: ["https://www.dataflute.com/", "https://www.dataflute.com/resources"] },
  { vendor: "SGS Kyocera", slug: "kyocera-sgs", tier: 3, category: "tooling-consumable",
    urls: ["https://kyocera-sgstool.com/resources/", "https://kyocera-sgstool.com/"] },
  { vendor: "Greenleaf", slug: "greenleaf", tier: 3, category: "tooling-consumable",
    urls: ["https://www.greenleafcorporation.com/", "https://www.greenleafcorporation.com/resources"] },
];

const PDF_PRIORITY = /(catalog|speed|feed|guide|technical|cutting[-_ ]?data|machining|brochure|product)/i;

export function slugify(s) {
  return (
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_SLUG_LEN) || "vendor"
  );
}

/** First 4 bytes must be the PDF magic number. */
export function isValidPdfBuffer(buf) {
  if (!buf || buf.length < PDF_MAGIC_LEN) return false;
  return buf.slice(0, PDF_MAGIC_LEN).toString("latin1") === "%PDF";
}

/** Does a URL point at a PDF (ignoring query/fragment)? */
export function isPdfUrl(url) {
  if (!url || typeof url !== "string") return false;
  const path = url.split(/[?#]/)[0];
  return /\.pdf$/i.test(path);
}

/** Extract .pdf links from HTML/XML/JSON text, resolved against baseUrl.
 *  Two passes (union): (1) href/src attributes (relative or absolute) — normal anchor links;
 *  (2) absolute https?://...pdf anywhere in the text — catches sitemap <loc>, JSON payloads, and
 *  JS-embedded URLs that a JS-rendered site still ships in its initial HTML even when no <a href> does.
 *  Both regexes are lazy + bounded by the literal ".pdf" (linear, ReDoS-safe). */
export function extractPdfLinks(html, baseUrl) {
  if (!html || typeof html !== "string") return [];
  const out = new Set();
  const reAttr = /(?:href|src)\s*=\s*["']([^"']+?\.pdf(?:\?[^"']*)?)["']/gi;
  const reAbs = /https?:\/\/[^\s"'<>)]+?\.pdf(?:\?[^\s"'<>)]*)?/gi;
  let m;
  while ((m = reAttr.exec(html)) !== null) {
    const abs = resolveUrl(m[1].trim(), baseUrl);
    if (abs) out.add(abs);
  }
  while ((m = reAbs.exec(html)) !== null) out.add(m[0]);
  return [...out];
}

function resolveUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

/** Rank PDF links: catalog/speed/feed keywords first, then longer paths. Cap to n. */
export function pickBestPdfLinks(links, n = 2) {
  const uniq = [...new Set((links || []).filter(Boolean))];
  return uniq
    .map((u) => ({ u, score: (PDF_PRIORITY.test(u) ? 100 : 0) + Math.min(u.length, 50) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, n))
    .map((x) => x.u);
}

/**
 * Merge a run's result rows into the manifest, keyed by url. Existing entries
 * keep their first_seen; status/bytes/path refresh. Pure (no I/O).
 */
export function mergeManifest(existing, results, nowIso) {
  const base =
    existing && typeof existing === "object" && Array.isArray(existing.pdfs)
      ? existing
      : { schemaVersion: "1.0.0", manifest_id: "quoting-vendor-catalogs", pdfs: [] };
  // Key by url when present; else a STABLE per-vendor key (NOT title, which can drift run-to-run and
  // would duplicate a pending/no-download row — the exact orphan case this manifest tracks).
  const byKey = new Map(base.pdfs.map((p) => [p.url || `pending::${p.vendor}`, p]));
  for (const r of results || []) {
    if (!r || !r.vendor) continue;
    const key = r.url || `pending::${r.vendor}`;
    const prev = byKey.get(key);
    byKey.set(key, {
      vendor: r.vendor,
      title: r.title || r.slug || r.vendor,
      url: r.url || null,
      tier: r.tier ?? prev?.tier ?? null,
      category: r.category || prev?.category || "tooling-consumable",
      expected_path: r.path || prev?.expected_path || null,
      bytes: r.bytes ?? prev?.bytes ?? 0,
      status: r.status,
      note: r.note || "",
      first_seen: prev?.first_seen || nowIso,
      last_attempt: nowIso,
    });
  }
  return {
    ...base,
    generated_iso: nowIso,
    pdfs: [...byKey.values()].sort(
      (a, b) => (a.tier ?? UNRANKED_TIER) - (b.tier ?? UNRANKED_TIER) || (a.vendor || "").localeCompare(b.vendor || "")
    ),
  };
}

// ---------------------------------------------------------------------------
// CLI (pure node — fs only, no subprocess)
// ---------------------------------------------------------------------------

function readStdin() {
  try {
    return _rf(0, "utf8");
  } catch {
    return "";
  }
}

function main(argv) {
  if (argv.includes("--list")) {
    for (const v of SEED_VENDORS) {
      process.stdout.write(`${v.slug}|${v.vendor}|${v.tier}|${v.category}|${v.urls.join(",")}\n`);
    }
    return 0;
  }

  if (argv.includes("--extract")) {
    const base = argv[argv.indexOf("--base") + 1] || "https://example.com/";
    const links = pickBestPdfLinks(extractPdfLinks(readStdin(), base), 3);
    for (const u of links) process.stdout.write(u + "\n");
    return 0;
  }

  if (argv.includes("--validate")) {
    const path = argv[argv.indexOf("--validate") + 1];
    const minIdx = argv.indexOf("--min");
    const min = minIdx >= 0 ? parseInt(argv[minIdx + 1], 10) || MIN_BYTES_DEFAULT : MIN_BYTES_DEFAULT;
    if (!path || !existsSync(path)) return 1;
    const buf = readFileSync(path);
    return isValidPdfBuffer(buf) && statSync(path).size >= min ? 0 : 1;
  }

  if (argv.includes("--merge")) {
    const manifestPath = argv[argv.indexOf("--manifest") + 1] || DEFAULT_MANIFEST;
    const resIdx = argv.indexOf("--results");
    const raw = resIdx >= 0 ? readFileSync(argv[resIdx + 1], "utf8") : readStdin();
    const results = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    let existing = null;
    if (existsSync(manifestPath)) {
      try {
        existing = JSON.parse(readFileSync(manifestPath, "utf8"));
      } catch {
        existing = null;
      }
    }
    const manifest = mergeManifest(existing, results, new Date().toISOString());
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    const dl = manifest.pdfs.filter((p) => p.status === "downloaded").length;
    process.stdout.write(`[merge] ${manifest.pdfs.length} entries (${dl} downloaded) → ${manifestPath}\n`);
    return 0;
  }

  process.stderr.write("usage: --list | --extract --base <url> | --validate <path> [--min N] | --merge --manifest <p>\n");
  return 2;
}

const invokedDirectly = (() => {
  try {
    return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
