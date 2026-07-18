// cimco-dialect-allowlist.mjs — per-dialect G/M-code allowlists mined from JM's OWN golden NC corpus.
//
// U-CIMCO-DIALECT-ALLOWLISTS (slot:echo, CIMCO-INTEGRATION-MS0). The STATIC arm of post-proving that
// works offline TODAY (no live CIMCO app): given a PRISM-generated post, lint its G/M-code vocabulary
// against the set of codes ACTUALLY OBSERVED in JM's proven goldens for that controller dialect. A code
// the post emits that was never seen in any JM golden for that family is SURFACED FOR REVIEW.
//
// HONESTY (R12) — this is a WHITELIST OF OBSERVED CODES, not a controller spec. A code absent from the
// goldens is "unobserved-in-JM-goldens (review)", NOT "invalid": JM may simply never have used it. The
// lint NEVER fails a post on its own — it flags novel codes for a human/sim to confirm. Echo refuses to
// re-derive dialect tables from copyrighted manuals; this allowlist is mined ONLY from JM's own files.
//
// Consistency: the builder and the lint classify a file's dialect with the SAME detectDialect() from
// nc-dialect-masks.mjs, so a candidate is linted against the family it would itself be classified into.
// Corpus walk reuses walkNC()/resolveGoldenDirs() from cimco-post-proof.mjs (no duplicate dir logic).
//
// Data: state/shared/cimco/dialect-allowlists.json. Tests: scripts/cimco-dialect-allowlist.test.mjs.
// Wiki: [[cimco-verification-simulation-integration]].

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { walkNC } from "./cimco-post-proof.mjs";
import { detectDialect } from "./lib/nc-dialect-masks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const JM_ROOT = resolve(REPO, "JM DIE");
const OUT_JSON = resolve(REPO, "state/shared/cimco/dialect-allowlists.json");

export const ALLOWLIST_PATH = "state/shared/cimco/dialect-allowlists.json";

// Top-level golden corpus dirs spanning the JM fleet's dialects. Files are bucketed by detectDialect
// (content-based), NOT by dir name — a Mastercam-posted .MIN in CNC LATHE lands in `mastercam`, a
// native-OSP one in `okuma-osp`, exactly as the lint will classify a candidate.
const CORPUS_DIRS = [
  "CNC MILL HAAS", "HAAS-HURCO", "HURCO CNC PROGRAMS", "HURCO",
  "CNC LATHE", "CNC OKUMA MULTUS", "ROKU-ROKU", "WIRE EDM", "CNC EDM",
];
const PER_DIR_CAP = 600; // bounded sample per corpus dir (avoid the 131K-file lathe tree)

/** Strip NC comments so code extraction never reads a G/M token out of a comment. */
function stripComments(text) {
  return String(text || "")
    .replace(/\([^)\n]*\)/g, " ")   // Fanuc/Mastercam/Okuma/EDM paren comments
    .replace(/;[^\n]*/g, " ");      // semicolon-to-EOL comments (Heidenhain/Siemens style)
}

/**
 * Extract the SET of G-codes and M-codes from an NC program (comment-stripped, uppercased).
 * G codes keep a decimal suffix (G68.2, G84.3); M codes are integer. Returns {g:Set, m:Set}.
 */
export function extractCodes(text) {
  const body = stripComments(text);
  const g = new Set();
  const m = new Set();
  for (const mt of body.matchAll(/\bG(\d{1,3}(?:\.\d+)?)\b/gi)) g.add("G" + mt[1].replace(/^0+(?=\d)/, ""));
  for (const mt of body.matchAll(/\bM(\d{1,3})\b/gi)) m.add("M" + String(parseInt(mt[1], 10)));
  return { g, m };
}

/**
 * Build the per-dialect allowlist by walking the golden corpus. Returns the full doc (also written to
 * disk when {write:true}). `rootOverride` points at a fixture corpus in tests.
 */
export function buildAllowlist({ root = JM_ROOT, write = false, perDirCap = PER_DIR_CAP } = {}) {
  const families = {}; // family → { gCodes:Set, mCodes:Set, sampleCount, firstSeen:{code:file} }
  const ensure = (fam) => (families[fam] ||= { g: new Set(), m: new Set(), sampleCount: 0, firstSeenG: {}, firstSeenM: {} });
  let filesScanned = 0;
  let cappedDirs = 0;

  for (const d of CORPUS_DIRS) {
    const dir = resolve(root, d);
    if (!existsSync(dir)) continue;
    const { files, capped } = walkNC(dir, perDirCap);
    if (capped) cappedDirs++;
    for (const f of files) {
      let text;
      try { text = readFileSync(f, "utf8"); } catch { continue; }
      filesScanned++;
      const fam = detectDialect(text);
      if (fam === "unknown") continue; // can't anchor a vocabulary to an unclassifiable file
      const slot = ensure(fam);
      slot.sampleCount++;
      const { g, m } = extractCodes(text);
      const rel = String(f).slice(root.length + 1).replace(/\\/g, "/");
      for (const code of g) { if (!slot.g.has(code)) { slot.g.add(code); slot.firstSeenG[code] = rel; } }
      for (const code of m) { if (!slot.m.has(code)) { slot.m.add(code); slot.firstSeenM[code] = rel; } }
    }
  }

  const doc = {
    schemaVersion: "1.0.0",
    generatedBy: "U-CIMCO-DIALECT-ALLOWLISTS (slot:echo, 2026-06-03)",
    provenance: "Mined ONLY from JM's own proven golden NC corpus under 'JM DIE' (never a copyrighted manual). Files bucketed by the same content-based detectDialect() the lint uses. A WHITELIST OF OBSERVED codes — a code absent here is 'unobserved-in-JM-goldens (review)', NOT invalid.",
    corpusDirs: CORPUS_DIRS,
    perDirCap,
    filesScanned,
    cappedDirs,
    families: Object.fromEntries(
      Object.entries(families).map(([fam, v]) => [fam, {
        sampleCount: v.sampleCount,
        gCodes: [...v.g].sort(_codeSort),
        mCodes: [...v.m].sort(_codeSort),
        firstSeenG: v.firstSeenG,
        firstSeenM: v.firstSeenM,
      }]),
    ),
  };
  if (write) writeFileSync(OUT_JSON, JSON.stringify(doc, null, 2));
  return doc;
}

function _codeSort(a, b) {
  const na = parseFloat(a.slice(1)), nb = parseFloat(b.slice(1));
  return na - nb || a.localeCompare(b);
}

/** Load + validate the persisted allowlist. THROWS on missing/corrupt (fail-loud). */
export function loadAllowlist(path = ALLOWLIST_PATH) {
  if (!existsSync(path)) throw new Error(`[cimco-dialect-allowlist] not found at ${path} — run \`node scripts/cimco-dialect-allowlist.mjs build\` (U-CIMCO-DIALECT-ALLOWLISTS); refusing to fabricate an empty allowlist.`);
  let doc;
  try { doc = JSON.parse(readFileSync(path, "utf8")); } catch (e) { throw new Error(`[cimco-dialect-allowlist] ${path} is not valid JSON: ${e.message}`); }
  if (!doc || typeof doc.families !== "object" || Object.keys(doc.families).length === 0)
    throw new Error("[cimco-dialect-allowlist] allowlist.families must be a non-empty object");
  return doc;
}

/**
 * Lint a candidate NC program's code vocabulary against a dialect family's observed allowlist.
 * @param {string} ncText - the candidate program.
 * @param {object} [opts] - { family?: string (override; else detectDialect), allowlist?: doc }.
 * @returns {{family, classified, hasAllowlist, sampleCount, observedG, observedM, unobservedG, unobservedM, review, note}}
 *   unobservedG/M = codes the candidate emits that are NOT in the family goldens (surfaced for review).
 *   FAIL-LOUD: an unknown family or a family with no allowlist → hasAllowlist:false + a clear note (NEVER a silent pass).
 */
export function dialectLint(ncText, opts = {}) {
  const allowlist = opts.allowlist || loadAllowlist();
  const classified = detectDialect(ncText);
  const family = opts.family || classified;
  const fam = allowlist.families[family];
  const { g, m } = extractCodes(ncText);
  const observedG = [...g].sort(_codeSort);
  const observedM = [...m].sort(_codeSort);
  if (!fam) {
    return {
      family, classified, hasAllowlist: false, sampleCount: 0,
      observedG, observedM, unobservedG: [], unobservedM: [], review: false,
      note: `no JM-golden allowlist for dialect '${family}' (classified='${classified}') — cannot lint; verify on the live CIMCO sim instead. NOT a pass.`,
    };
  }
  const allowG = new Set(fam.gCodes), allowM = new Set(fam.mCodes);
  const unobservedG = observedG.filter((c) => !allowG.has(c));
  const unobservedM = observedM.filter((c) => !allowM.has(c));
  const review = unobservedG.length > 0 || unobservedM.length > 0;
  return {
    family, classified, hasAllowlist: true, sampleCount: fam.sampleCount,
    observedG, observedM, unobservedG, unobservedM, review,
    note: review
      ? `${unobservedG.length} G + ${unobservedM.length} M code(s) not observed in ${fam.sampleCount} JM '${family}' goldens — REVIEW (unobserved≠invalid; confirm on live sim).`
      : `all emitted codes were observed in JM '${family}' goldens (${fam.sampleCount} sampled) — no novel codes.`,
  };
}

/** Compact per-family summary for dashboards / dispatcher. */
export function allowlistSummary(allowlist = loadAllowlist()) {
  return {
    schemaVersion: allowlist.schemaVersion,
    filesScanned: allowlist.filesScanned,
    families: Object.fromEntries(
      Object.entries(allowlist.families).map(([fam, v]) => [fam, { sampleCount: v.sampleCount, gCount: v.gCodes.length, mCount: v.mCodes.length }]),
    ),
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
function _main(argv) {
  const cmd = argv[0] || "summary";
  if (cmd === "build") {
    const doc = buildAllowlist({ write: true });
    const fams = Object.entries(doc.families).map(([f, v]) => `${f}:${v.sampleCount}f/${v.gCodes.length}G/${v.mCodes.length}M`).join("  ");
    process.stdout.write(`built dialect-allowlists.json — ${doc.filesScanned} files scanned\n${fams}\n`);
  } else if (cmd === "summary") {
    process.stdout.write(JSON.stringify(allowlistSummary(), null, 2) + "\n");
  } else if (cmd === "families") {
    process.stdout.write(JSON.stringify(loadAllowlist().families, null, 2) + "\n");
  } else if (cmd === "lint") {
    const f = argv[1];
    if (!f) { process.stderr.write("usage: cimco-dialect-allowlist lint <ncFile> [family]\n"); return 2; }
    const r = dialectLint(readFileSync(f, "utf8"), { family: argv[2] });
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    return r.review ? 1 : 0;
  } else {
    process.stderr.write("usage: cimco-dialect-allowlist <build|summary|families|lint <file> [family]>\n");
    return 2;
  }
  return 0;
}

const _argv1 = process.argv[1] || "";
if (_argv1.endsWith("cimco-dialect-allowlist.mjs")) process.exit(_main(process.argv.slice(2)));
