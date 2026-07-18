#!/usr/bin/env node
/**
 * post-processor-consolidate.mjs — discover ALL post-processor files across
 * the H: drive (multi-vendor: Fusion .cps + Mastercam .pst + hyperMILL .tcp
 * + ESPRIT .est + SolidCAM .gpp + PowerMill .pm/.opt + NX .tcl + CATIA .lib),
 * categorize by (CAM-format × machine domain × brand), and copy into the
 * structured fleet hierarchy:
 *
 *   JM DIE/POST PROCESSORS/
 *   ├── 1. CONSOLIDATED/
 *   │   ├── vanilla/<domain>/<brand>/
 *   │   └── work-in-progress/<domain>/<brand>/
 *   └── 2. PRISM ENHANCED/<domain>/
 *
 * Closes operator directive 2026-05-25 (slot:echo): "find all posts in the
 * h drive and copy them into 2 folders 1. consolidated post folder and
 * 2. Prism Enhanced posts… categorize by machine domain and brand".
 *
 * Authored 2026-05-25 (slot:echo continuation of post-processor /goal).
 */

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, writeFileSync } from "node:fs";
import { join, basename, extname, relative } from "node:path";

// ── Configuration ────────────────────────────────────────────────────────────

const REPO_ROOT = "H:/prism";
const SCAN_ROOTS = [
  "H:/prism/resources",
  "H:/prism/JM DIE",
];

const DEST_ROOT = "H:/prism/JM DIE/POST PROCESSORS";
const CONSOLIDATED_VANILLA = `${DEST_ROOT}/1. CONSOLIDATED/vanilla`;
const CONSOLIDATED_WIP = `${DEST_ROOT}/1. CONSOLIDATED/work-in-progress`;
const PRISM_ENHANCED = `${DEST_ROOT}/2. PRISM ENHANCED`;
const MANIFEST_PATH = `${DEST_ROOT}/POST-PROCESSOR-MANIFEST.json`;

// Post format → primary CAM system + classification
// EXPANDED 2026-05-25 (operator: "you're missing the hypermill posts"):
// hyperMILL uses .LOC (localized cycle library), .CDR (controller def record),
// .CNC (per-machine config), and compiled .DLL post engines.
const FORMAT_MAP = {
  ".cps": { cam: "autodesk-fusion", canCategorize: true },
  ".pst": { cam: "mastercam", canCategorize: true },
  ".psb": { cam: "mastercam", canCategorize: true },
  ".tcp": { cam: "hypermill", canCategorize: true },
  ".cpr": { cam: "hypermill-config", canCategorize: false },  // config sidecar, not a post
  ".loc": { cam: "hypermill-cycle", canCategorize: false, awarenessOnly: true },   // hyperMILL localized cycle library (per-language) — counted but NOT copied
  ".cdr": { cam: "hypermill-controller", canCategorize: true }, // Controller Definition Record (hyperMILL post core)
  ".cnc": { cam: "hypermill-machine", canCategorize: true }, // hyperMILL per-machine config
  ".est": { cam: "esprit", canCategorize: true },
  ".gpp": { cam: "solidcam", canCategorize: true },
  ".pm": { cam: "powermill", canCategorize: true },
  ".opt": { cam: "powermill", canCategorize: true },
  ".tcl": { cam: "nx-siemens", canCategorize: true },
  ".lib": { cam: "catia-delmia", canCategorize: true },
  // NOTE: .dll (compiled hyperMILL post engines) intentionally excluded —
  // they're binary, not editable, and shouldn't be copied across the tree.
};

// Brand detection patterns (lowercase substring match against filename)
const BRAND_PATTERNS = [
  { brand: "hurco", patterns: ["hurco", "winmax", "tmx", "vmx", "vm30i"] },
  { brand: "okuma", patterns: ["okuma", "osp", "multus", "lb3000", "genos", "m460v"] },
  { brand: "haas", patterns: ["haas", "vf2", "vf-", "umc"] },
  { brand: "fanuc", patterns: ["fanuc", "robocut", "31i", "0i", "30i"] },
  { brand: "heidenhain", patterns: ["heidenhain", "tnc"] },
  { brand: "mazak", patterns: ["mazak", "mazatrol", "smooth"] },
  { brand: "siemens", patterns: ["siemens", "sinumerik", "840d", "828d"] },
  { brand: "mitsubishi", patterns: ["mitsubishi", "meldas", "melcut", "fa10", "fa20", "mv1200", "mv2400"] },
  { brand: "sodick", patterns: ["sodick", "aq", "sl400"] },
  { brand: "makino", patterns: ["makino", "hyperdrive"] },
  { brand: "agie", patterns: ["agie", "charmilles", "agiecharmilles", "vision5", "cut-p"] },
  { brand: "dmg-mori", patterns: ["dmg", "mori", "dmgmori", "celos", "cmx", "nlx", "nhx"] },
  { brand: "brother", patterns: ["brother", "speedio"] },
  { brand: "doosan", patterns: ["doosan", "dn"] },
  { brand: "citizen", patterns: ["citizen", "cincom"] },
  { brand: "roku-roku", patterns: ["roku", "roku-roku", "rokuroku"] },
  { brand: "fadal", patterns: ["fadal"] },
  { brand: "datron", patterns: ["datron"] },
  { brand: "deckel", patterns: ["deckel"] },
  { brand: "hwacheon", patterns: ["hwacheon"] },
  { brand: "kern", patterns: ["kern"] },
  { brand: "amada", patterns: ["amada"] },
  { brand: "grbl", patterns: ["grbl"] },
];

// Domain detection (lowercase substring on filename) — order matters: most-specific first
const DOMAIN_PATTERNS = [
  { domain: "wire-edm", patterns: ["wedm", "wire-edm", "wire_edm", "wireedm", "wirecut", "mv1200", "mv2400", "fa10", "fa20", "fa30", "robocut", "agiecharmilles", "agie-cut", "agiecut", "sodick", "makino-u", "makino_u", "makinou"] },
  { domain: "sinker-edm", patterns: ["sinker", "ram-edm", "die-sink"] },
  { domain: "mill-turn", patterns: ["mill-turn", "millturn", "mill_turn", "multus", "multitasking", "multi-tasking", "lb3000"] },
  { domain: "swiss", patterns: ["swiss", "citizen", "cincom", "star-"] },
  { domain: "lathe", patterns: ["lathe", "turning", "turn", "tx8i", "ds-30", "st-10", "st-15", "st-20", "st-25", "st-28", "st-30", "st-35", "st-40", "st-45", "st-55", "ds-30y", "ds-30ssy", "doosan-turn", "doosan_turn", "hwacheon", "genos", "lb3000", "l400", "okuma-lathe"] },
  { domain: "grinder", patterns: ["grinder", "grinding", "grind"] },
  { domain: "laser", patterns: ["laser", "amada-laser", "amada_laser"] },
  { domain: "waterjet", patterns: ["waterjet", "water-jet", "abrasive-jet"] },
  { domain: "router", patterns: ["router", "cnc-router"] },
  { domain: "additive", patterns: ["3d-print", "additive", "fdm", "slm", "selective-laser"] },
  { domain: "inspection", patterns: ["inspection", "probe", "renishaw", "cmm"] },
  // Default fallback
  { domain: "mill", patterns: ["mill", "vmc", "machining-center", "vf-", "vf2", "vmx", "tmx", "umc"] },
];

// ── Discovery ────────────────────────────────────────────────────────────────

function walk(root, depth = 0, maxDepth = 8, out = []) {
  if (depth > maxDepth) return out;
  if (!existsSync(root)) return out;
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = join(root, e.name);
    // Skip noise
    if (e.name.startsWith(".")) continue;
    if (e.name === "node_modules") continue;
    if (e.name === "dist") continue;
    if (e.name === ".git") continue;
    try {
      if (e.isDirectory()) walk(full, depth + 1, maxDepth, out);
      else if (e.isFile()) {
        const ext = extname(e.name).toLowerCase();
        if (FORMAT_MAP[ext]) out.push({ path: full, ext, name: e.name });
      }
    } catch { /* permissions / symlink failure — skip */ }
  }
  return out;
}

function detectBrand(name) {
  const lower = name.toLowerCase();
  for (const { brand, patterns } of BRAND_PATTERNS) {
    for (const p of patterns) if (lower.includes(p)) return brand;
  }
  return "unknown";
}

function detectDomain(name, brandHint) {
  const lower = name.toLowerCase();
  for (const { domain, patterns } of DOMAIN_PATTERNS) {
    for (const p of patterns) if (lower.includes(p)) return domain;
  }
  // Brand-specific defaults
  if (["sodick", "agie", "makino"].includes(brandHint)) return "wire-edm";
  return "mill";  // most common fallback
}

function classifyTier(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.includes("prism modified") || lower.includes("prism-master") || lower.includes("prism enhanced") || lower.includes("prism-enhanced")) {
    return "prism-enhanced";
  }
  if (lower.includes("wip") || lower.includes("work-in-progress") || lower.includes("work_in_progress") || lower.includes("_in_progress")) {
    return "wip";
  }
  return "vanilla";
}

// ── Manifest + copy ──────────────────────────────────────────────────────────

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function consolidate(dryRun = false) {
  console.log(`[post-consol] scanning ${SCAN_ROOTS.length} roots…`);
  const found = [];
  for (const root of SCAN_ROOTS) {
    const results = walk(root);
    found.push(...results);
    console.log(`[post-consol]   ${root}: ${results.length} posts`);
  }
  console.log(`[post-consol] total: ${found.length} posts found`);

  const manifest = {
    schemaVersion: "1.0.0",
    generated_at: new Date().toISOString(),
    repo_root: REPO_ROOT,
    scan_roots: SCAN_ROOTS,
    dry_run: dryRun,
    counts: {
      total: found.length,
      by_format: {},
      by_brand: {},
      by_domain: {},
      by_tier: { vanilla: 0, wip: 0, "prism-enhanced": 0 },
    },
    entries: [],
  };

  for (const p of found) {
    const brand = detectBrand(p.name);
    const domain = detectDomain(p.name, brand);
    const tier = classifyTier(p.path);
    const fmt = FORMAT_MAP[p.ext];
    const canCat = fmt.canCategorize !== false;
    manifest.counts.by_format[p.ext] = (manifest.counts.by_format[p.ext] || 0) + 1;
    manifest.counts.by_brand[brand] = (manifest.counts.by_brand[brand] || 0) + 1;
    manifest.counts.by_domain[domain] = (manifest.counts.by_domain[domain] || 0) + 1;
    manifest.counts.by_tier[tier] = (manifest.counts.by_tier[tier] || 0) + 1;

    let destDir;
    if (tier === "prism-enhanced") {
      destDir = `${PRISM_ENHANCED}/${domain}`;
    } else if (tier === "wip") {
      destDir = canCat ? `${CONSOLIDATED_WIP}/${domain}/${brand}` : CONSOLIDATED_WIP;
    } else {
      destDir = canCat ? `${CONSOLIDATED_VANILLA}/${domain}/${brand}` : CONSOLIDATED_VANILLA;
    }
    const destPath = `${destDir}/${p.name}`;

    let bytes = 0;
    try { bytes = statSync(p.path).size; } catch {}

    manifest.entries.push({
      source: relative(REPO_ROOT, p.path).replace(/\\/g, "/"),
      dest: relative(REPO_ROOT, destPath).replace(/\\/g, "/"),
      format: p.ext,
      cam: fmt.cam,
      brand,
      domain,
      tier,
      size_bytes: bytes,
      copied: false,
    });

    // awarenessOnly formats (e.g. hyperMILL .LOC cycle localizations — 8K+ files,
    // translation sidecars not deliverable posts) are counted in the manifest
    // but NOT physically copied into the consolidated tree.
    if (!dryRun && fmt.awarenessOnly !== true) {
      try {
        ensureDir(destDir);
        copyFileSync(p.path, destPath);
        manifest.entries[manifest.entries.length - 1].copied = true;
      } catch (err) {
        manifest.entries[manifest.entries.length - 1].error = String(err?.message ?? err);
      }
    } else if (fmt.awarenessOnly === true) {
      manifest.entries[manifest.entries.length - 1].awareness_only = true;
    }
  }

  ensureDir(DEST_ROOT);
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

  console.log("\n[post-consol] MANIFEST written to", MANIFEST_PATH);
  console.log("[post-consol] Counts by format:", manifest.counts.by_format);
  console.log("[post-consol] Counts by brand:", Object.fromEntries(Object.entries(manifest.counts.by_brand).sort((a, b) => b[1] - a[1]).slice(0, 10)));
  console.log("[post-consol] Counts by domain:", manifest.counts.by_domain);
  console.log("[post-consol] Counts by tier:", manifest.counts.by_tier);
  if (dryRun) console.log("[post-consol] DRY RUN — no files copied. Re-run without --dry-run to apply.");
  return manifest;
}

// ── Main ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const help = args.includes("--help") || args.includes("-h");

if (help) {
  console.log(`post-processor-consolidate.mjs — consolidate H: drive post processors

Usage:
  node scripts/post-processor-consolidate.mjs [--dry-run]

Outputs:
  - H:/prism/JM DIE/POST PROCESSORS/POST-PROCESSOR-MANIFEST.json
  - Copies all .cps/.pst/.psb/.tcp/.cpr/.est/.gpp/.pm/.opt/.tcl/.lib posts into
    the structured (1. CONSOLIDATED + 2. PRISM ENHANCED) hierarchy

Options:
  --dry-run    Enumerate + classify + write manifest only; DO NOT copy files`);
  process.exit(0);
}

const start = Date.now();
const manifest = consolidate(dryRun);
console.log(`[post-consol] done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
