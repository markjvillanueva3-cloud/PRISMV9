#!/usr/bin/env node
/**
 * quoting-baseline-bootstrap — seed state/shared/quoting/baseline-records.json
 *
 * Operator overnight: scheduled-retrain (yolo-iter3) needs records to consume.
 * This script reads the JM Die fleet ledger (state/shared/scan-tracking/
 * jm-die-scan-ledger.jsonl), filters to docustrata-kind rows with parseable
 * customer+part_id, samples the most-recent N, and emits the baseline
 * records JSON the orchestrator consumes.
 *
 * Records get reasonable defaults so the training loop has something to run
 * against before real actual-revenue data is wired in:
 *   - actual_revenue_usd: derived from size_bytes × $0.0001/byte (placeholder
 *     until real Docustrata invoice extraction lands)
 *   - estimated_time_in_cut_s: 1800 (30 min — typical)
 *   - machine_rate_usd_per_hr: 95 (jm-die default)
 *   - estimated_material_spend_usd: 50
 *
 * This is BOOTSTRAP DATA — the actual training value comes from real
 * actual_revenue_usd numbers (future iter wires DocustrataHistoricalPricing-
 * TrainerEngine's extracted records). Today it gives the cron a non-empty
 * input so the loop fires + we can audit the pipeline end-to-end.
 *
 * Usage:
 *   node H:/prism/scripts/quoting-baseline-bootstrap.mjs
 *   node H:/prism/scripts/quoting-baseline-bootstrap.mjs --limit 200 --out state/shared/quoting/baseline-records.json
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-BASELINE-BOOTSTRAP (charlie /goal-yolo iter4)
 */

import { promises as fs } from "node:fs";
import { resolve, dirname } from "node:path";

const ARGS = process.argv.slice(2);
function val(name, dflt) {
  const idx = ARGS.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < ARGS.length ? ARGS[idx + 1] : dflt;
}

const LEDGER_PATH = val("ledger", resolve(process.cwd(), "state/shared/scan-tracking/jm-die-scan-ledger.jsonl"));
const OUT_PATH = val("out", resolve(process.cwd(), "state/shared/quoting/baseline-records.json"));
const LIMIT = parseInt(val("limit", "100"), 10);
// yolo-iter8: when --scan-archive is passed, walk H:/PRISM/JM DIE directly to
// bypass limited-ledger diversity (yolo-iter7 diagnostic). Bounded depth + total file cap.
const SCAN_ARCHIVE = ARGS.includes("--scan-archive");
const ARCHIVE_ROOT = val("archive-root", "H:/PRISM/JM DIE");
const SCAN_MAX_DEPTH = parseInt(val("scan-max-depth", "5"), 10);
const SCAN_MAX_FILES = parseInt(val("scan-max-files", "10000"), 10);
// iter39: --balance-by-class forces multi-machine-class representation by
// capping records-per-top-level-subdir before customer dedup. Closes iter38's
// "machine_class collapses to mill-only because BFS lands mostly on HAAS-HURCO"
// sampling artifact. Default 0 = disabled (preserves iter9-38 behavior).
const BALANCE_BY_CLASS = ARGS.includes("--balance-by-class");
const PER_CLASS_CAP = parseInt(val("per-class-cap", "15"), 10);
const SIZE_TO_USD = 0.0001;
const DEFAULT_TIME_S = 1800;
const DEFAULT_RATE_USD_HR = 95;
const DEFAULT_MATERIAL_USD = 50;

// iter13: file-metadata-driven variance for training-signal richness. Pre-iter13
// the bootstrap stamped EVERY record with identical defaults — the training
// engine could only learn one global revenue/cost ratio. Now we infer machine-
// rate from extension + path, time-in-cut from file-size bucket, and material
// spend from machine class. Heuristic but >0 variance ships richer gradient
// than zero variance.

// Machine-rate table (USD/hr) — JM Die shop floor approximations per
// jm-die-profile.ts conventions. Path-based override > extension-based.
const RATE_BY_PATH_HINT = [
  { re: /\/(WIRE[\s_-]?EDM|WEDM)\//i, rate: 110, class: "wire-edm" },
  { re: /\/(SINKER|EDM)\//i, rate: 100, class: "sinker-edm" },
  { re: /\/LATHE\//i, rate: 85, class: "lathe" },
  { re: /\/(CNC[\s_-]?MILL|MILL)\//i, rate: 95, class: "mill" },
  { re: /\/GRINDER\//i, rate: 75, class: "grinder" },
];

// File-extension fallback (case-insensitive). Empty/missing extension -> default mill.
const RATE_BY_EXT = new Map([
  [".min", { rate: 95, class: "mill" }],         // Mastercam mill
  [".nc",  { rate: 95, class: "mill" }],
  [".eia", { rate: 95, class: "mill" }],
  [".tap", { rate: 95, class: "mill" }],
  [".h",   { rate: 100, class: "mill-heidenhain" }], // Heidenhain TNC
  [".i",   { rate: 110, class: "wire-edm" }],    // wire-EDM ISO
  [".ei",  { rate: 110, class: "wire-edm" }],
  [".g4",  { rate: 110, class: "wire-edm" }],
  [".cnc", { rate: 85, class: "lathe" }],
  [".lpt", { rate: 85, class: "lathe" }],
  [".eds", { rate: 100, class: "sinker-edm" }],
]);

// File-size bucket -> estimated cycle time (seconds). Calibrated from JM Die
// observation: small G-code (<50KB) is typically a 1-feature finish or simple
// part (~10 min); mid (<500KB) is a typical multi-op part (~30 min); large
// (<5MB) is a complex part or fixture (~60 min); huge (>5MB) is a 5-axis
// program (~120 min). These are PRIORS — Docustrata-bridge will replace with
// real cycle-time-in-cut numbers in a future iter.
function timeBucketFromSize(sizeBytes) {
  const b = Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : 0;
  if (b === 0) return 1800;
  if (b < 50_000) return 600;       // < 50 KB -> 10 min
  if (b < 500_000) return 1800;     // < 500 KB -> 30 min
  if (b < 5_000_000) return 3600;   // < 5 MB -> 60 min
  return 7200;                      // >= 5 MB -> 120 min
}

// iter45 (slot:charlie 2026-05-26) — U-QP-BOOTSTRAP-REAL-DEFAULTS:
// Workpiece-material detection from filename/path. Mirrors the ISO-group cost
// brackets from `QuotingMaterialBridgeEngine.DEFAULTS.usd_per_kg` so training-
// time records and runtime quote-time material lookups converge on the same
// brackets. When the path contains an explicit material keyword
// (aluminum/inconel/titanium/steel/cast iron/etc), the matched ISO group's
// $/kg drives material spend; we estimate stock weight as a coarse proxy from
// file size bucket × density-weighted constant. When no material is detected,
// fall back to MATERIAL_BY_CLASS legacy table below.
//
// Path-hint patterns are CONSERVATIVE — explicit single-word material names
// only. Avoid false-positives like "TIN coating" matching "TI" (titanium) —
// require word-boundary + reasonable spelling.
// NB: `\b` in JS treats `_` as a word character, so `\baluminum\b` does NOT
// match in `aluminum_6061_bracket.MIN`. Use letter-boundary lookarounds
// `(?<![a-z])...(?![a-z])` so `_` / `/` / `\` / digits / `.` all separate
// tokens correctly. This is the iter45-iter46 bug-fix lesson — never use
// `\b` for material/identifier matching in filename paths.
const MATERIAL_BY_PATH_HINT = [
  // ISO-N (non-ferrous, cheap-to-mid: Al, Cu, Brass) — $5/kg bracket from QuotingMaterialBridge.
  // The optional `al[-_]?` prefix captures the JM-Die naming convention
  // `AL7075-T6` / `AL6061` / `AL_2024` where the alloy number is bound directly
  // to the AL prefix without whitespace.
  { re: /(?<![a-z])(alum(?:in[ui]um)?|al[-_]?(?:6061|7075|2024|5052)|6061|7075|2024|5052|copper|brass|bronze)(?![a-z])/i, iso: "N", usd_per_kg: 5.00, b2f: 3.0 },
  // ISO-S (superalloys: Inconel, Ti, Hastelloy) — $32/kg bracket. Note "ti"
  // alone is too generic (would hit "ATIVE" etc.) — only match ti-6al or
  // ti-gr5 forms, plus full "titanium".
  { re: /(?<![a-z])(inconel|718|625|hastelloy|titanium|ti-?6al-?4v|ti-?gr-?5|nimonic|waspaloy|monel)(?![a-z])/i, iso: "S", usd_per_kg: 32.00, b2f: 4.5 },
  // ISO-H (hardened tool steel) — $8/kg bracket
  { re: /(?<![a-z])(d2[\s_-]?steel|a2[\s_-]?steel|h13|s7[\s_-]?steel|tool[\s_-]?steel|hardened|hrc[\s_-]?\d{2})(?![a-z])/i, iso: "H", usd_per_kg: 8.00, b2f: 2.2 },
  // ISO-M (stainless: 304, 316, 17-4) — $4.50/kg bracket
  { re: /(?<![a-z])(stainless|ss[\s_-]?\d{3}|304[\s_-]?ss?|316[\s_-]?ss?|17-?4|17[\s_-]?4ph|duplex|austenitic|sus[\s_-]?\d+)(?![a-z])/i, iso: "M", usd_per_kg: 4.50, b2f: 2.5 },
  // ISO-K (cast iron) — $1.20/kg bracket
  { re: /(?<![a-z])(cast[\s_-]?iron|gray[\s_-]?iron|ductile[\s_-]?iron|cgi|nodular|class[\s_-]?\d{2}[\s_-]?gray)(?![a-z])/i, iso: "K", usd_per_kg: 1.20, b2f: 2.0 },
  // ISO-P (steel, broad — last so MORE-specific patterns win earlier) — $1.20/kg
  { re: /(?<![a-z])(carbon[\s_-]?steel|alloy[\s_-]?steel|4140|4340|1018|1045|low[\s_-]?carbon|mild[\s_-]?steel)(?![a-z])/i, iso: "P", usd_per_kg: 1.20, b2f: 2.0 },
];

// Stock-weight estimator from size bucket. JM Die observation: very small G-code
// is typically a finishing op on a small/medium stock; large is bigger stock.
// VERY coarse — exists ONLY to give per-file variance to material spend in
// training data. Real stock weight comes from CAD volume × density (future iter).
function estimateStockWeightKg(sizeBytes) {
  const b = Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : 0;
  if (b === 0) return 0.5;
  if (b < 50_000) return 0.3;        // < 50 KB -> ~0.3 kg (finishing op, small stock)
  if (b < 500_000) return 1.2;       // < 500 KB -> ~1.2 kg (typical part)
  if (b < 5_000_000) return 4.0;     // < 5 MB -> ~4 kg (larger part)
  return 12.0;                       // >= 5 MB -> ~12 kg (fixture / large)
}

// Detect material from filename or path. Returns { iso, usd_per_kg, b2f }
// or null if no detection. Conservative: must hit a path-hint regex.
export function detectMaterialFromPath(absPath) {
  if (typeof absPath !== "string" || absPath.length === 0) return null;
  for (const hint of MATERIAL_BY_PATH_HINT) {
    if (hint.re.test(absPath)) {
      return { iso: hint.iso, usd_per_kg: hint.usd_per_kg, b2f: hint.b2f };
    }
  }
  return null;
}

// Material spend varies by machine class — wire-EDM uses brass wire + dielectric,
// mill uses stock + tooling, lathe uses bar stock. Coarse priors. iter45: this
// table is the FALLBACK when MATERIAL_BY_PATH_HINT detects nothing; when path
// names an explicit material, the ISO-group cost bracket overrides.
const MATERIAL_BY_CLASS = new Map([
  ["wire-edm", 35],         // wire + dielectric per part
  ["sinker-edm", 45],
  ["mill", 60],
  ["mill-heidenhain", 60],
  ["lathe", 40],
  ["grinder", 20],
]);

/**
 * iter13: pure function — derive realistic per-record defaults from path + size.
 * Returns { estimated_time_in_cut_s, machine_rate_usd_per_hr, estimated_material_spend_usd, machine_class }.
 * Defensive against non-string / non-number / null inputs.
 */
/**
 * iter16: pure distribution probe — given the records[] the bootstrap is about
 * to emit, compute histograms confirming iter13's variance injection actually
 * produced a distribution (not all-mill / all-1800s collapse).
 * Returns { total, machineClassHisto, timeBucketHisto, topCustomers, rateRange, materialRange }.
 * topCustomers: Top-K (default 5) {customer, count} sorted desc.
 */
export function summarizeRecordsDistribution(records, topK = 5) {
  const safe = Array.isArray(records) ? records : [];
  const total = safe.length;
  const classes = new Map();
  const times = new Map();
  const customers = new Map();
  let minRate = Infinity, maxRate = -Infinity;
  let minMat = Infinity, maxMat = -Infinity;
  for (const r of safe) {
    if (!r || typeof r !== "object") continue;
    const cls = r.machine_class ?? "unknown";
    classes.set(cls, (classes.get(cls) ?? 0) + 1);
    const t = r.estimated_time_in_cut_s ?? -1;
    times.set(t, (times.get(t) ?? 0) + 1);
    const cust = r.customer ?? "unknown";
    customers.set(cust, (customers.get(cust) ?? 0) + 1);
    const rate = r.machine_rate_usd_per_hr;
    if (typeof rate === "number" && Number.isFinite(rate)) {
      if (rate < minRate) minRate = rate;
      if (rate > maxRate) maxRate = rate;
    }
    const mat = r.estimated_material_spend_usd;
    if (typeof mat === "number" && Number.isFinite(mat)) {
      if (mat < minMat) minMat = mat;
      if (mat > maxMat) maxMat = mat;
    }
  }
  const topCustomers = [...customers.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(0, Math.floor(topK)))
    .map(([customer, count]) => ({ customer, count }));
  return {
    total,
    machineClassHisto: Object.fromEntries([...classes.entries()].sort((a, b) => b[1] - a[1])),
    timeBucketHisto: Object.fromEntries([...times.entries()].sort((a, b) => a[0] - b[0])),
    topCustomers,
    rateRange: total > 0 && minRate !== Infinity ? { min: minRate, max: maxRate } : null,
    materialRange: total > 0 && minMat !== Infinity ? { min: minMat, max: maxMat } : null,
  };
}

export function deriveRecordDefaults(absPath, sizeBytes) {
  const normalized = typeof absPath === "string" ? absPath.replace(/\\/g, "/") : "";
  let rate = DEFAULT_RATE_USD_HR;
  let mClass = "mill";
  // 1) path hint wins
  for (const hint of RATE_BY_PATH_HINT) {
    if (hint.re.test(normalized)) {
      rate = hint.rate;
      mClass = hint.class;
      break;
    }
  }
  // 2) if path matched nothing, fall back to extension
  if (mClass === "mill" && !/\/(CNC[\s_-]?MILL|MILL)\//i.test(normalized)) {
    const name = normalized.split("/").pop() ?? "";
    const dot = name.lastIndexOf(".");
    if (dot > 0) {
      const ext = name.slice(dot).toLowerCase();
      const hit = RATE_BY_EXT.get(ext);
      if (hit) {
        rate = hit.rate;
        mClass = hit.class;
      }
    }
  }
  const time = timeBucketFromSize(sizeBytes);
  // iter45 (U-QP-BOOTSTRAP-REAL-DEFAULTS): material spend now path-aware.
  // When the path names an explicit material, derive spend from ISO-group
  // $/kg × estimated stock weight (size-bucket proxy). This adds material-
  // class variance to training data and aligns training-time defaults with
  // the runtime QuotingMaterialBridgeEngine.DEFAULTS table (iter44 commit).
  // Fall back to MATERIAL_BY_CLASS when no material detected from path.
  const materialHit = detectMaterialFromPath(normalized);
  let material;
  let material_iso = null;
  if (materialHit) {
    const stockKg = estimateStockWeightKg(sizeBytes) * materialHit.b2f;
    material = Math.round(stockKg * materialHit.usd_per_kg * 100) / 100;
    material_iso = materialHit.iso;
  } else {
    material = MATERIAL_BY_CLASS.get(mClass) ?? DEFAULT_MATERIAL_USD;
  }
  return {
    estimated_time_in_cut_s: time,
    machine_rate_usd_per_hr: rate,
    estimated_material_spend_usd: material,
    machine_class: mClass,
    material_iso, // null when no material detected; else "P|M|K|N|S|H"
  };
}

// Machine-category and known-non-customer subdirs under JM DIE.
// yolo-iter7: bootstrap iter6 mapped 50/50 records to "AIR" because the JM
// path actually puts the customer at jmIdx+1 sometimes (not always jmIdx+2),
// AND because "AIR" is an air-handling utility subdir, NOT a customer.
// yolo-iter9: --scan-archive surfaced more leakage — "POST PROCESSORS",
// "_PART LIBRARY", and similar shop-template/library subdirs aren't customers
// either. Extended filter catches the (case-insensitive, optional-leading-underscore,
// optional plural) library/template/macro/master/setup/sample folders.
// iter35: iter34 archive walk surfaced "PRISM MODIFIED POST PROCESSORS" and
// "HURCO CNC PROGRAMS" leaking through. Adding explicit alternates rather than
// loosening word-boundary anchors (which would false-positive "ALCOA POST OFFICE").
// Also adds the orphan "(CNC )?PROGRAMS?" pattern that was missing from iter9.
const NON_CUSTOMER_SUBDIRS =
  /^_?(?:PRISM[\s_-]?MODIFIED[\s_-]?)?(?:HURCO[\s_-]?)?(CNC[\s_-]?)?(MILL|LATHE|WIRE|EDM|SINKER|GRINDER|WEDM|AIR|UTILITY|TOOLING|TOOL[\s_-]?ROOM|FIXTURES?|GAGES?|SCRAP|ARCHIVE|OLD|BACKUP|TEMP|TEST|POST[\s_-]?PROCESSORS?|POSTS?|PART[\s_-]?LIBRAR(Y|IES)|LIBRAR(Y|IES)|MACROS?|TEMPLATES?|MASTERS?|SETUPS?|SAMPLES?|EXAMPLES?|REFERENCE|REFERENCES|DOCS?|DOCUMENTATION|MANUALS?|TUTORIALS?|TRAININGS?|MISC|MISCELLANEOUS|PROGRAMS?|QUEUE|REVERSE[\s_-]?ENGINEERING)$/i;

// iter37: iter34 live walk + iter36 layout audit surfaced "MATTHEW programs"
// (internal programmer's collection, NOT a customer) leaking through. The
// pattern is `<arbitrary name> programs?` — case-insensitive trailing programs
// keyword. Conservative: must be 2+ words AND last word is exactly programs/program.
// This still admits "Acme Corp" / "Holo-Krome" / "Acumant Global Technologies"
// because those don't end in PROGRAMS. Tests pin the boundary on iter37.
const HYBRID_NON_CUSTOMER =
  /^[\w\s.-]+[\s_-](PROGRAMS?|MACROS?|LIBRAR(Y|IES)|TEMPLATES?|SETUPS?|SAMPLES?|EXAMPLES?|DOCS?|MANUALS?|TUTORIALS?)$/i;

// iter37: machine-class compound names — JM Die top-level dirs like
// "WIRE EDM", "CNC OKUMA MULTUS", "CNC MILL HAAS", "HAAS-HURCO", "ROKU-ROKU",
// "OKUMA" are machine-class collections (customers live INSIDE them at depth=2).
// iter9 NON_CUSTOMER_SUBDIRS catches single-word machines (MILL, LATHE) but
// fails on compound names because of the `$` anchor. Mirror iter36's MACHINE_RE
// here to plug the gap surfaced by iter37 live run (WIRE EDM + CNC OKUMA MULTUS
// were leaking as customers despite holding 100+ real customer subdirs).
// iter41 (slot:charlie 2026-05-26): extend MACHINE_NON_CUSTOMER to catch
// (1) hyphenated mill-turn / lathe-turn (separator + TURN/TURNING trailing alt)
// AND (2) concatenated MILLTURN / LATHETURN as first-alternative literals.
// iter40 regen surfaced `"customer": "mill-turn"` rows leaking because the
// iter37 pattern only caught `MILL[_-]LATHE`, not `MILL[_-]TURN`, and not
// the no-separator concatenated form. Adding TURN as a trailing alt closes
// hyphenated; MILLTURN/LATHETURN as first-alt literals close the concat.
const MACHINE_NON_CUSTOMER =
  /^(CNC[\s_-]?)?(MILLTURN|LATHETURN|MILL|LATHE|WIRE|EDM|SINKER|GRINDER|WEDM|AIR|UTILITY|TOOLING|TOOL[\s_-]?ROOM|FIXTURES?|GAGES?|SCRAP|OKUMA|HAAS|HURCO|ROKU[\s_-]?ROKU|MULTUS|MATSUURA|MAZAK|MORI[\s_-]?SEIKI|FANUC)(?:[\s_-](HAAS|HURCO|OKUMA|MULTUS|MILL|LATHE|EDM|GRINDER|SINKER|TURN|TURNING))?$/i;

// iter40: numbered-prefix + PRISM-internal subdirs — JM Die archive contains
// operator working dirs like "2. PRISM ENHANCED", "PRISM CAD TESTING",
// "1. ORIGINAL", "3. REVISION", etc. These are workflow staging dirs, not
// customers. Surfaced by iter39 live walk + iter34 bootstrap remediation.
// Pattern: optional leading digit+dot/space, then PRISM keyword or generic
// workflow-stage words. The PRISM* prefix is the strongest signal.
const NUMBERED_PRISM_NON_CUSTOMER =
  /^(\d+[.\s_-]*)?(PRISM[\s_-]+(ENHANCED|CAD[\s_-]?TESTING|MODIFIED|UPGRADED|ORIGINAL|REVISION|REVISED|REV|R\d+|TESTING|TEST|DEV|DEBUG|WIP|DRAFT|EXAMPLE)|ORIGINAL|REVISION|REVISIONS?|REV|REV[\s_-]?\d+|WORKING[\s_-]?COPY|COPY|COPIES|VERSION|VERSIONS?|V\d+|DRAFTS?|WIP|IN[\s_-]?PROGRESS)$/i;

// iter41 (slot:charlie 2026-05-26): project / corpus / test-scaffolding dirs
// that iter9-40 filters miss because they don't match machine-class /
// workflow-stage / numbered-PRISM patterns. iter40 baseline regen revealed:
//   - "TRIBAL + WIKI" (15 leaked records) — internal corpus assembly dir
//   - "TOOLING CAD FILES" (9 records) — CAD asset library
//   - "OldVersions" — version archive dir
//   - "CHAT-GPT TEST PROMPT PARTS" — LLM regression test fixtures
//   - "OLD VERSIONS" / "ARCHIVE COPIES" / "BACKUP COPIES" — generic
// The signal here is multi-word phrases ending in CAD FILES / TEST PARTS /
// PROMPT PARTS / + WIKI / OldVersions — non-customer corpus / test scaffolding.
// Conservative: keep specific tokens rather than broad word lists so legit
// customer names with "OLD" or "TEST" in them ("HOLOTEST CORP") still admit.
const PROJECT_DIR_NON_CUSTOMER =
  /^(TRIBAL[\s_+-]+WIKI|TOOLING[\s_-]+CAD[\s_-]+FILES?|OLD[\s_-]?VERSIONS?|ARCHIVE[\s_-]+COPIES?|BACKUP[\s_-]+COPIES?|CAD[\s_-]+(FILES?|LIBRARY|LIBRARIES)|CHAT[\s_-]?GPT[\s_-]+(TEST[\s_-]+)?PROMPT[\s_-]+PARTS|LLM[\s_-]+TEST[\s_-]+PARTS?|TEST[\s_-]+PROMPT[\s_-]+PARTS?|TEST[\s_-]+FIXTURES?|REGRESSION[\s_-]+TEST[\s_-]+PARTS?|POSTS?[\s_-]+AND[\s_-]+MACHINES?|MACHINES?[\s_-]+AND[\s_-]+POSTS?|POST[\s_-]+PROCESSORS?[\s_-]+(AND|&)[\s_-]+\w+)$/i;

export function isLikelyCustomer(segment) {
  if (typeof segment !== "string" || segment.length === 0) return false;
  if (segment.length < 2 || segment.length > 50) return false;
  if (NON_CUSTOMER_SUBDIRS.test(segment)) return false;
  if (HYBRID_NON_CUSTOMER.test(segment)) return false;
  if (MACHINE_NON_CUSTOMER.test(segment)) return false;
  if (NUMBERED_PRISM_NON_CUSTOMER.test(segment)) return false;
  if (PROJECT_DIR_NON_CUSTOMER.test(segment)) return false;
  return true;
}

export function extractCustomer(absPath) {
  if (typeof absPath !== "string") return undefined;
  const normalized = absPath.replace(/\\/g, "/");
  const tokens = normalized.split("/");
  const jmIdx = tokens.findIndex(t => /^jm[\s_-]?die$/i.test(t));
  if (jmIdx === -1) return undefined;
  // Walk forward from jmIdx+1 looking for the FIRST segment that doesn't look
  // like a machine-category or utility subdir. Handles BOTH layouts:
  //   JM DIE/CNC MILL/ALCOA/p1.MIN  (skip CNC MILL → customer ALCOA)
  //   JM DIE/ALCOA/CNC MILL/p1.MIN  (customer ALCOA directly)
  for (let i = jmIdx + 1; i < tokens.length - 1; i++) {
    if (isLikelyCustomer(tokens[i])) return tokens[i];
  }
  return undefined;
}

// iter39: extract the JM DIE top-level subdir (machine-class collection or
// customer dir at depth 1). Used by --balance-by-class to group records and
// cap per-class.
export function extractTopLevelClass(absPath) {
  if (typeof absPath !== "string") return "unknown";
  const normalized = absPath.replace(/\\/g, "/");
  const tokens = normalized.split("/");
  const jmIdx = tokens.findIndex((t) => /^jm[\s_-]?die$/i.test(t));
  if (jmIdx === -1 || jmIdx + 1 >= tokens.length) return "unknown";
  return tokens[jmIdx + 1];
}

// iter39: cap records per top-level class. Records arrive most-recent-first
// (already sorted upstream). Walk the list keeping a per-class counter; skip
// any record whose class already hit the cap. Preserves recency ordering
// within each class.
export function balanceByClass(rows, perClassCap) {
  if (!Array.isArray(rows) || perClassCap <= 0) return rows;
  const counts = new Map();
  const kept = [];
  for (const r of rows) {
    const cls = extractTopLevelClass(r.abs_path);
    const c = counts.get(cls) ?? 0;
    if (c >= perClassCap) continue;
    counts.set(cls, c + 1);
    kept.push(r);
  }
  return kept;
}

function extractPartId(absPath) {
  if (typeof absPath !== "string") return "unknown";
  const normalized = absPath.replace(/\\/g, "/");
  const name = normalized.split("/").pop() ?? "unknown";
  const dotIdx = name.lastIndexOf(".");
  return dotIdx > 0 ? name.slice(0, dotIdx) : name;
}

async function walkArchive(root, maxDepth, maxFiles) {
  // Bounded BFS — never recurses below maxDepth, never returns more than maxFiles.
  const rows = [];
  const queue = [{ path: root, depth: 0 }];
  while (queue.length > 0 && rows.length < maxFiles) {
    const { path, depth } = queue.shift();
    let entries;
    try {
      entries = await fs.readdir(path, { withFileTypes: true });
    } catch { continue; }
    for (const ent of entries) {
      if (rows.length >= maxFiles) break;
      const full = `${path}/${ent.name}`;
      if (ent.isDirectory()) {
        if (depth < maxDepth) queue.push({ path: full, depth: depth + 1 });
      } else if (ent.isFile()) {
        try {
          const stat = await fs.stat(full);
          rows.push({
            abs_path: full,
            size_bytes: stat.size,
            mtime_iso: stat.mtime.toISOString(),
          });
        } catch { /* skip unreadable */ }
      }
    }
  }
  return rows;
}

// iter39: per-top-level walk so each machine-class subdir gets equal walk budget.
// Closes the BFS-alphabetic-bias problem where WIRE EDM (late alphabetically) was
// never reached because the walk budget exhausted on earlier dirs.
async function walkArchiveBalanced(root, maxDepth, maxFiles, perClassCap) {
  let topLevel;
  try {
    topLevel = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const topDirs = topLevel.filter((e) => e.isDirectory()).map((e) => e.name);
  if (topDirs.length === 0) return [];

  // Per-class file budget. Use perClassCap as a hard ceiling per top-level subdir;
  // total cap is min(maxFiles, perClassCap * topDirs.length).
  const perDirCap = Math.max(perClassCap, Math.floor(maxFiles / topDirs.length));
  const allRows = [];
  for (const dir of topDirs) {
    if (allRows.length >= maxFiles) break;
    const dirPath = `${root}/${dir}`;
    const remainingBudget = Math.min(perDirCap, maxFiles - allRows.length);
    const dirRows = await walkArchive(dirPath, maxDepth - 1, remainingBudget);
    allRows.push(...dirRows);
  }
  return allRows;
}

async function main() {
  let rows = [];

  if (SCAN_ARCHIVE) {
    if (BALANCE_BY_CLASS) {
      process.stderr.write(`[bootstrap] --scan-archive --balance-by-class: per-top-level walk (depth<=${SCAN_MAX_DEPTH}, max ${SCAN_MAX_FILES} files, per-class cap ${PER_CLASS_CAP})\n`);
      rows = await walkArchiveBalanced(ARCHIVE_ROOT, SCAN_MAX_DEPTH, SCAN_MAX_FILES, PER_CLASS_CAP);
    } else {
      process.stderr.write(`[bootstrap] --scan-archive: walking ${ARCHIVE_ROOT} (depth<=${SCAN_MAX_DEPTH}, max ${SCAN_MAX_FILES} files)\n`);
      rows = await walkArchive(ARCHIVE_ROOT, SCAN_MAX_DEPTH, SCAN_MAX_FILES);
    }
    if (rows.length === 0) {
      process.stderr.write(`[bootstrap] FAIL: --scan-archive found 0 files under ${ARCHIVE_ROOT}\n`);
      process.exit(1);
    }
  } else {
    let lines;
    try {
      const raw = await fs.readFile(LEDGER_PATH, "utf-8");
      lines = raw.split("\n");
    } catch (e) {
      process.stderr.write(`[bootstrap] FAIL: cannot read ledger ${LEDGER_PATH}: ${e}\n`);
      process.exit(1);
    }
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try {
        const row = JSON.parse(t);
        if (typeof row.abs_path === "string" && typeof row.mtime_iso === "string") {
          rows.push(row);
        }
      } catch { /* drop corrupt */ }
    }
    if (rows.length === 0) {
      process.stderr.write(`[bootstrap] FAIL: ledger has 0 parseable rows (try --scan-archive to bypass)\n`);
      process.exit(1);
    }
  }

  // Most-recent-first sort, dedup on (customer, part_id), cap at LIMIT.
  rows.sort((a, b) => (b.mtime_iso ?? "").localeCompare(a.mtime_iso ?? ""));

  // iter39: --balance-by-class — cap records per top-level subdir BEFORE
  // customer dedup, so the LIMIT sample isn't dominated by whichever
  // top-level subdir has the most files. Forces multi-class representation.
  if (BALANCE_BY_CLASS) {
    const before = rows.length;
    rows = balanceByClass(rows, PER_CLASS_CAP);
    process.stderr.write(`[bootstrap] --balance-by-class: capped at ${PER_CLASS_CAP}/class, ${before} -> ${rows.length} rows\n`);
  }

  const seen = new Set();
  const records = [];
  for (const r of rows) {
    const customer = extractCustomer(r.abs_path);
    const partId = extractPartId(r.abs_path);
    if (!customer || !partId) continue;
    const key = `${customer}|${partId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const dateOnly = (r.mtime_iso ?? "").slice(0, 10) || "2026-01-01";
    const sizeBytes = typeof r.size_bytes === "number" ? r.size_bytes : 0;
    // iter13: per-record variance from path + size, not flat defaults.
    const derived = deriveRecordDefaults(r.abs_path, sizeBytes);
    records.push({
      customer,
      part_id: partId,
      doc_date: dateOnly,
      actual_revenue_usd: Math.max(10, Math.round(sizeBytes * SIZE_TO_USD * 100) / 100),
      estimated_time_in_cut_s: derived.estimated_time_in_cut_s,
      machine_rate_usd_per_hr: derived.machine_rate_usd_per_hr,
      estimated_material_spend_usd: derived.estimated_material_spend_usd,
      machine_class: derived.machine_class,
      material_iso: derived.material_iso, // iter45: null when no material detected from path
    });
    if (records.length >= LIMIT) break;
  }

  if (records.length === 0) {
    process.stderr.write(`[bootstrap] FAIL: no records survived customer/part_id extraction\n`);
    process.exit(1);
  }

  const payload = {
    generated_iso: new Date().toISOString(),
    source: "jm-die-fleet-ledger",
    note: "BOOTSTRAP placeholder. actual_revenue_usd is a size-based stub until DocustrataHistoricalPricingTrainerEngine extracts real invoice numbers.",
    record_count: records.length,
    records,
  };

  await fs.mkdir(dirname(OUT_PATH), { recursive: true });
  const tmp = `${OUT_PATH}.tmp-${Date.now()}-${process.pid}`;
  await fs.writeFile(tmp, JSON.stringify(payload, null, 2), "utf-8");
  await fs.rename(tmp, OUT_PATH);

  process.stdout.write(`[bootstrap] WROTE ${OUT_PATH} | ${records.length} records | ${seen.size} unique customer|part_id pairs\n`);

  // iter16: --summary flag emits distribution histograms so operators can
  // confirm iter13's variance injection actually produced diverse records.
  if (ARGS.includes("--summary")) {
    const dist = summarizeRecordsDistribution(records, 5);
    process.stderr.write(`[bootstrap] DIST machine_class=${JSON.stringify(dist.machineClassHisto)}\n`);
    process.stderr.write(`[bootstrap] DIST time_bucket_s=${JSON.stringify(dist.timeBucketHisto)}\n`);
    process.stderr.write(`[bootstrap] DIST rate_range=${JSON.stringify(dist.rateRange)} material_range=${JSON.stringify(dist.materialRange)}\n`);
    process.stderr.write(`[bootstrap] DIST top_customers=${JSON.stringify(dist.topCustomers)}\n`);
  }
}

// iter9: only run main() when invoked as CLI, not when imported as a library
// (the test file imports {isLikelyCustomer, extractCustomer} and must NOT
// trigger a side-effect baseline write).
import { pathToFileURL } from "node:url";
import { argv } from "node:process";
if (import.meta.url === pathToFileURL(argv[1] ?? "").href) {
  main().catch(e => {
    process.stderr.write(`[bootstrap] UNHANDLED: ${e}\n`);
    process.exit(1);
  });
}
