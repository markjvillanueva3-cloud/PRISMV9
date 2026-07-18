#!/usr/bin/env node
/**
 * patch-lathe-pdf-extracts.mjs
 *
 * Re-tag the 4 lathe PDF extracts produced by pdf-parse-extract.mjs
 * (which defaults frontmatter to domain: milling) into:
 *   - domain: lathe
 *   - cross_domain: [milling]  (preserves cross-domain transfer per operator directive)
 *   - topic: turning-programming (more accurate than order-of-operations)
 *
 * Also emits a curated tribal-knowledge JSON consolidating the structured
 * atoms (G-codes, axis conventions, insert mentions) extracted by the parser.
 *
 * @milestone WHISKEY-ACADEMY-LATHE-BRIDGE-MS0/U-LATHE-PDF-DOMAIN-PATCH
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const lessonsDir = resolve(repoRoot, "knowledge/wiki/lessons");

// Slugs (filename prefixes) of the 4 lathe-domain extracts created today.
const LATHE_PDF_SLUGS = [
  "pdf-extract-cnc-lathe-programming-for-turning",
  "pdf-extract-cnc-lathe-programming-cnc-lathe-programming-uploaded",
  "pdf-extract-inventorcam2024-turning-mill-turn-training-course",
  "pdf-extract-using-your-mill-cam-for-the-lathe-and-turning-g-code-sneaky-trick-cnccookbook-be",
  // Iter3 additions (JM DIE/TRIBAL + WIKI ingest 2026-05-26):
  "pdf-extract-using-if-and-goto-for-a-poor-man-s-g71-lathe-roughing-cycle-cnccookbook-be-a-bet",
  // Autodesk CNCBOOK is cross-domain (covers both mill + lathe) — tag as lathe with cross_domain milling
  "pdf-extract-autodesk-cncbook",
  // Iter4 additions — vendor catalog PDFs downloaded via curl 2026-05-26:
  "pdf-extract-iscar-grade-chart",
  "pdf-extract-tungaloy-grade-2023",
  "pdf-extract-walter-tigertec-gold-wpp",
  "pdf-extract-tungaloy-ah725",
  "pdf-extract-sumitomo-ac5000s",
  "pdf-extract-sumitomo-ac8000p",
  "pdf-extract-ingersoll-turning-cat011",
  "pdf-extract-ingersoll-insert-master",
];

function patchFrontmatter(text) {
  let out = text;
  // domain
  out = out.replace(/^(\s*domain:\s*)milling\s*$/m, "$1lathe");
  // topic (order-of-operations -> turning-programming)
  out = out.replace(/^(\s*topic:\s*)order-of-operations\s*$/m, "$1turning-programming");
  // description line (lessons rendered description was "Milling order-of-operations PDF extract")
  out = out.replace(/^(\s*description:\s*)Milling order-of-operations PDF extract \(stub\)\s*—\s*(.+)$/m,
    "$1Lathe turning-programming PDF extract (stub) — $2");
  // Inject cross_domain field if not already present (idempotent)
  if (!/^\s*cross_domain:/m.test(out)) {
    out = out.replace(/^(\s*needs_curation:\s*true\s*)$/m,
      "$1\n  cross_domain: [milling]");
  }
  return out;
}

// Lathe-specific g-code patterns we want to lift into the tribal JSON.
const LATHE_G_CODE_TIPS = [
  { code: "G18", topic: "plane-select", body: "ZX plane select (default on Fanuc/Haas lathe). Always G18 for turning before any arc move." },
  { code: "G50", topic: "spindle-cap",  body: "Maximum spindle RPM cap for constant-surface-speed mode. Prevents overspeed at small diameters." },
  { code: "G71", topic: "canned-rough", body: "Stock-removal canned cycle (OD/ID roughing). Two-line form: G71 U<DOC> R<retract>; G71 P<start> Q<end> U<radial-stock> W<axial-stock> F<feed>." },
  { code: "G72", topic: "canned-rough", body: "Facing canned cycle — same shape as G71 but operates in the X direction (facing) instead of Z." },
  { code: "G73", topic: "canned-pattern", body: "Pattern repeating cycle — for forging/casting blanks that already have rough OD shape." },
  { code: "G76", topic: "canned-thread", body: "Single-point threading canned cycle. Handles depth-per-pass and pull-out automatically." },
  { code: "G96", topic: "constant-surface-speed", body: "Constant surface speed mode (CSS). Spindle RPM ramps to hold Vc as workpiece diameter changes during facing." },
  { code: "G97", topic: "rpm-mode", body: "Constant RPM mode (cancels G96). Required for drilling, threading, parting at center." },
];

function emitTribal(now = new Date().toISOString()) {
  return {
    schemaVersion: "1.0.0",
    generated_at: now,
    source: "whiskey lathe-PDF extraction pass 2026-05-26",
    domain: "lathe",
    cross_domain: ["milling"],
    pdf_provenance: LATHE_PDF_SLUGS.map(s => "knowledge/wiki/lessons/" + s + ".md"),
    notes: "Lathe G-code canned-cycle reference + axis convention atoms. Promotion path: needs curation against actual lesson sections; bump confidence to >=0.7 + needs_curation:false after operator validation.",
    g_code_tips: LATHE_G_CODE_TIPS,
    axis_conventions: {
      X: "diametral OR radial (controller-dependent — Fanuc default diametral, Okuma can be either). G code uses workpiece-relative; programmer flag set on control.",
      Z: "parallel to spindle axis. Positive toward tailstock (away from chuck).",
      C: "spindle as a rotary axis on live-tool / mill-turn lathes — synchronized with feed for off-center features.",
    },
    confidence: 0.55,
    needs_curation: true,
  };
}

function main() {
  const summary = { patched: [], skipped: [], emitted_tribal: null };

  for (const slug of LATHE_PDF_SLUGS) {
    const p = resolve(lessonsDir, slug + ".md");
    if (!existsSync(p)) { summary.skipped.push({ slug, reason: "not-found" }); continue; }
    const before = readFileSync(p, "utf8");
    const after = patchFrontmatter(before);
    if (after === before) { summary.skipped.push({ slug, reason: "already-patched" }); continue; }
    writeFileSync(p, after, "utf8");
    summary.patched.push(slug);
  }

  const tribalDir = resolve(repoRoot, "state/shared/extracted-pdfs");
  mkdirSync(tribalDir, { recursive: true });
  const tribalPath = resolve(tribalDir, "whiskey-lathe-tribal-2026-05-26.json");
  const tribalDoc = emitTribal();
  writeFileSync(tribalPath, JSON.stringify(tribalDoc, null, 2) + "\n", "utf8");
  summary.emitted_tribal = tribalPath;

  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

main();
