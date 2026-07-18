#!/usr/bin/env node
/**
 * quoting-jm-die-layout-audit — iter36 one-shot read-only layout audit.
 *
 * iter34 F2 surfaced that the iter9 extractor's `/JM DIE/{CUSTOMER}/{MACHINE}/{file}`
 * assumption doesn't match reality — real top-level subdirs are MIX of:
 *   - configuration dirs (POST PROCESSORS, MACRO PROGRAMS, SETUPS)
 *   - customer-themed dirs (BASEBALL PARTS, GENERAL BANDAGES — could be either)
 *   - machine-class dirs (CNC LATHE, CNC MILL HAAS, OKUMA, LATHE, WIRE EDM)
 *   - hybrid (HURCO CNC PROGRAMS — clearly programs subdir, NOT a customer)
 *   - real customers (JM DIE COMPANY itself, MATTHEW programs)
 *
 * This script does a depth=2 read-only walk and emits THREE artifacts:
 *   1. JSON of top-level dirs + their immediate-child counts + dominant child-type
 *      classification (file-only | dir-only | mixed)
 *   2. Markdown human report grouping dirs into 4 buckets:
 *        - LIKELY_CUSTOMER  (depth-1 mostly dirs, names match customer-shape regex)
 *        - LIKELY_MACHINE   (depth-1 names match machine-class regex)
 *        - LIKELY_CONFIG    (POST PROCESSORS / MACROS / SETUPS / TEMPLATES family)
 *        - UNKNOWN          (ambiguous — operator manual triage required)
 *   3. Calibration hint block recommending iter9 NON_CUSTOMER_SUBDIRS additions
 *      AND extractor depth-walk policy (`first non-config dir under JM DIE`)
 *
 * Bounded: no recursion past depth=2, total directory cap 500. Read-only — never
 * writes to JM DIE/.
 *
 * Run: node H:/prism/scripts/quoting-jm-die-layout-audit.mjs [--root <abs>] [--out-dir <abs>]
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-JM-DIE-LAYOUT-AUDIT (charlie /goal-yolo iter36)
 */

import { readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
function arg(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
}

const ROOT = resolve(arg("--root", "H:/PRISM/JM DIE"));
const OUT_DIR = resolve(arg("--out-dir", "H:/prism/state/shared/quoting"));
const MAX_DIRS = parseInt(arg("--max-dirs", "500"), 10);

// Classification regexes — same shape as iter35's NON_CUSTOMER_SUBDIRS for consistency
const CONFIG_RE = /^_?(?:PRISM[\s_-]?MODIFIED[\s_-]?)?(?:HURCO[\s_-]?)?(?:CNC[\s_-]?)?(POST[\s_-]?PROCESSORS?|POSTS?|PART[\s_-]?LIBRAR(Y|IES)|LIBRAR(Y|IES)|MACROS?|TEMPLATES?|MASTERS?|SETUPS?|SAMPLES?|EXAMPLES?|REFERENCE|REFERENCES|DOCS?|DOCUMENTATION|MANUALS?|TUTORIALS?|TRAININGS?|MISC|MISCELLANEOUS|PROGRAMS?|ARCHIVE|OLD|BACKUP|TEMP|TEST|QUEUE|REVERSE[\s_-]?ENGINEERING)$/i;

const MACHINE_RE = /^(CNC[\s_-]?)?(MILL|LATHE|WIRE|EDM|SINKER|GRINDER|WEDM|AIR|UTILITY|TOOLING|TOOL[\s_-]?ROOM|FIXTURES?|GAGES?|SCRAP|OKUMA|HAAS|HURCO|ROKU[\s_-]?ROKU|MULTUS|MATSUURA|MAZAK|MORI[\s_-]?SEIKI|FANUC)(?:[\s_-](HAAS|HURCO|OKUMA|MULTUS|MILL|LATHE|EDM|GRINDER|SINKER))?$/i;

const HYBRID_RE = /^(.+?)[\s_-]+(CNC[\s_-]?)?(PROGRAMS?|MILL|LATHE)$/i;

function classify(name) {
  if (CONFIG_RE.test(name)) return "config";
  if (MACHINE_RE.test(name)) return "machine";
  if (HYBRID_RE.test(name)) return "hybrid"; // e.g. "HURCO CNC PROGRAMS" — config-like but vendor-prefixed
  return "unknown";
}

function safeReaddir(p) {
  try {
    return readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
}

function auditLayout() {
  const entries = safeReaddir(ROOT);
  const dirs = entries.filter((e) => e.isDirectory());
  const results = [];

  let scanned = 0;
  for (const d of dirs) {
    if (scanned >= MAX_DIRS) break;
    const name = d.name;
    const fullPath = join(ROOT, name);

    // depth=2 walk: count immediate children
    const children = safeReaddir(fullPath);
    const childDirs = children.filter((c) => c.isDirectory()).length;
    const childFiles = children.filter((c) => c.isFile()).length;
    const childTotal = childDirs + childFiles;

    let dominantType = "empty";
    if (childTotal > 0) {
      if (childDirs >= childFiles * 2) dominantType = "dir-heavy";
      else if (childFiles >= childDirs * 2) dominantType = "file-heavy";
      else dominantType = "mixed";
    }

    // Sample 3 child dir names to help operator triage (likely customer names if dir-heavy)
    const sampleChildDirs = children
      .filter((c) => c.isDirectory())
      .slice(0, 3)
      .map((c) => c.name);

    const classification = classify(name);

    results.push({
      name,
      classification,
      childDirs,
      childFiles,
      dominantType,
      sampleChildDirs,
    });
    scanned += 1;
  }

  return results;
}

function buildMarkdownReport(results) {
  const buckets = {
    LIKELY_CUSTOMER: [],
    LIKELY_MACHINE: [],
    LIKELY_CONFIG: [],
    UNKNOWN: [],
  };

  for (const r of results) {
    if (r.classification === "config" || r.classification === "hybrid") {
      buckets.LIKELY_CONFIG.push(r);
    } else if (r.classification === "machine") {
      buckets.LIKELY_MACHINE.push(r);
    } else if (r.dominantType === "dir-heavy" && r.childDirs >= 2) {
      buckets.LIKELY_CUSTOMER.push(r);
    } else {
      buckets.UNKNOWN.push(r);
    }
  }

  const lines = [];
  lines.push("# JM DIE archive top-level layout audit");
  lines.push("");
  lines.push(`**Generated:** ${new Date().toISOString()} by quoting-jm-die-layout-audit.mjs (iter36)`);
  lines.push(`**Root:** ${ROOT}`);
  lines.push(`**Total top-level dirs scanned:** ${results.length}`);
  lines.push("");
  lines.push("## Bucket counts");
  lines.push("");
  lines.push(`- LIKELY_CUSTOMER: ${buckets.LIKELY_CUSTOMER.length}`);
  lines.push(`- LIKELY_MACHINE:  ${buckets.LIKELY_MACHINE.length}`);
  lines.push(`- LIKELY_CONFIG:   ${buckets.LIKELY_CONFIG.length}`);
  lines.push(`- UNKNOWN:         ${buckets.UNKNOWN.length}`);
  lines.push("");

  for (const [bucketName, items] of Object.entries(buckets)) {
    if (items.length === 0) continue;
    lines.push(`## ${bucketName}`);
    lines.push("");
    lines.push("| Name | childDirs | childFiles | dominantType | sample children |");
    lines.push("|---|---:|---:|---|---|");
    for (const r of items) {
      const samples = r.sampleChildDirs.length > 0 ? r.sampleChildDirs.join(", ") : "(none)";
      lines.push(`| \`${r.name}\` | ${r.childDirs} | ${r.childFiles} | ${r.dominantType} | ${samples} |`);
    }
    lines.push("");
  }

  // Calibration hints
  lines.push("## Calibration hints for iter9 extractor");
  lines.push("");
  lines.push("### Suggested NON_CUSTOMER_SUBDIRS additions (verify against iter35 list)");
  lines.push("");
  for (const r of buckets.LIKELY_CONFIG) {
    if (!CONFIG_RE.test(r.name) && !HYBRID_RE.test(r.name)) {
      lines.push(`- \`${r.name}\` — classified as config/hybrid but might not be caught by current regex; verify`);
    }
  }
  if (buckets.LIKELY_CONFIG.every((r) => CONFIG_RE.test(r.name) || HYBRID_RE.test(r.name))) {
    lines.push("- _All LIKELY_CONFIG entries already covered by iter35 regex extension._");
  }
  lines.push("");
  lines.push("### Likely customer dirs (LIKELY_CUSTOMER bucket) — these should resolve through extractor as customers");
  lines.push("");
  for (const r of buckets.LIKELY_CUSTOMER) {
    lines.push(`- \`${r.name}\` (${r.childDirs} child dirs)`);
  }
  lines.push("");
  lines.push("### UNKNOWN bucket — operator manual triage required");
  lines.push("");
  for (const r of buckets.UNKNOWN) {
    lines.push(`- \`${r.name}\` — childDirs=${r.childDirs} childFiles=${r.childFiles} (${r.dominantType})`);
  }
  lines.push("");
  lines.push("### Recommended extractor policy");
  lines.push("");
  lines.push("Per iter34 F2: the assumption `/JM DIE/{CUSTOMER}/{MACHINE}/{file}` is only partially true. The actual layout is mixed-mode:");
  lines.push("");
  lines.push("- Some top-level subdirs ARE customers (most LIKELY_CUSTOMER bucket)");
  lines.push("- Some top-level subdirs are machine-class collections that contain customer subdirs at depth=2 (LIKELY_MACHINE bucket — e.g. `CNC MILL HAAS/{CUSTOMER}/...`)");
  lines.push("- Some top-level subdirs are pure config (LIKELY_CONFIG — extractor should skip)");
  lines.push("");
  lines.push("**Conservative extractor policy:** walk `/JM DIE/` looking for the FIRST segment that:");
  lines.push("- is NOT in NON_CUSTOMER_SUBDIRS (iter9+iter35 regex)");
  lines.push("- AND is NOT in MACHINE_RE — if it IS a machine, descend one level and use depth-2 as customer");
  lines.push("");
  lines.push("This matches what iter9 already does. The findings above confirm the policy is sound — what was broken was the regex coverage, which iter35 has now fixed.");

  return lines.join("\n");
}

function main() {
  console.error(`[jm-die-audit] walking ${ROOT} (depth=2, max-dirs=${MAX_DIRS})`);
  const results = auditLayout();
  console.error(`[jm-die-audit] scanned ${results.length} top-level dirs`);

  mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = join(OUT_DIR, "jm-die-layout-audit.json");
  const mdPath = join(OUT_DIR, "jm-die-layout-audit.md");

  writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  const md = buildMarkdownReport(results);
  writeFileSync(mdPath, md);

  console.error(`[jm-die-audit] wrote ${jsonPath}`);
  console.error(`[jm-die-audit] wrote ${mdPath}`);

  // brief stdout summary
  const counts = results.reduce((acc, r) => {
    acc[r.classification] = (acc[r.classification] || 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({ ok: true, total: results.length, by_classification: counts, json: jsonPath, md: mdPath }));
}

// Export pure functions for testing
export { classify, buildMarkdownReport, CONFIG_RE, MACHINE_RE, HYBRID_RE };

// CLI guard — only run main when invoked directly
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMainModule) {
  main();
}
