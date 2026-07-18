#!/usr/bin/env node
/**
 * sfc-jm-proven-divergence -- SFC-JM-PROVEN / U-SFC-JM-PROVEN-DIVERGENCE (slot:oscar, 2026-06-25)
 * =================================================================================================
 *
 * The "test PRISM against ALL JM parts" artifact. Consumes the JM-Die proven-speedfeed store
 * (16,524 Okuma lathe programs -> 50 proven material x op configs, produced by
 * extract-jm-proven-speedfeed.mjs) and compares each JM-PROVEN cutting speed (CSS, the surface
 * speed the amateur programs actually ran) against PRISM's CANONICAL_TURNING_SPEEDS band for the
 * same ISO material group + operation regime. Per comparable config it verdicts:
 *
 *   - conservative : JM CSS BELOW PRISM's rough band edge -> JM left productivity on the table.
 *   - in-band      : JM CSS within PRISM's [rough, finish] band -> JM agrees with PRISM physics.
 *   - aggressive   : JM CSS ABOVE PRISM's finish band edge -> JM ran hot (tool-life / safety check).
 *
 * HONEST SCOPE: only GENERAL OD/face turning ops (roughing/finishing/facing/boring) are CSS-comparable
 * to the OD-turning canonical band. Specialized ops (parting/grooving/threading/drilling/center_drilling
 * /unknown) run in their OWN speed regime and are NOT forced into the band comparison -- they are counted
 * as excluded, not silently mis-judged. The canonical band is per-ISO-group (not material-specific within
 * a group), so this is a band-level comparison, not a per-material-precision claim.
 *
 * Physics VALUES (turning speeds) are imported from src/physics/constants.ts -- never inlined. The
 * materialGroup->ISO map below is a CLASSIFICATION (category -> ISO 513 group), mirroring the private
 * _MATERIAL_KEYWORD_TO_ISO in constants.ts, NOT a physics constant.
 *
 * Run:
 *   npx tsx scripts/sfc-jm-proven-divergence.mjs                (text report)
 *   npx tsx scripts/sfc-jm-proven-divergence.mjs --json         (machine output)
 *   node    scripts/sfc-jm-proven-divergence.mjs                (self-reexecs under tsx)
 *
 * @milestone SFC-JM-PROVEN
 * @unit U-SFC-JM-PROVEN-DIVERGENCE
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reexecUnderTsxIfNeeded } from "./lib/tsx-reexec-guard.mjs";
import { toConfigArray, classifyTrust, DEFAULT_TRUST_THRESHOLD } from "./sfc-jm-proven-report.mjs";

const MCP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_STORE = path.join(MCP_ROOT, "data", "state", "jm-proven-speedfeed-store.json");

// === PURE HELPERS (no I/O, speeds injected -- unit-tested in sfc-jm-proven-divergence.test.mjs) ===

/**
 * Map the proven-store's material-group label to its ISO 513 group. Mirrors the private
 * _MATERIAL_KEYWORD_TO_ISO in src/physics/constants.ts (the proven store's 7 groups all resolve
 * here). This is a category->category classification, NOT a physics constant.
 */
const MATERIAL_GROUP_TO_ISO = {
  carbon_steel: "P", alloy_steel: "P", steel: "P", mild_steel: "P",
  // tool_steel is machined ANNEALED (~200-250 HB = P-group, Vc ~220-320), then hardened AFTER -- it
  // is never turned at HRC58-64 (you cannot turn HRC62 with carbide at all, so an observed turning CSS
  // is itself proof of soft stock). Default P (the dominant machined state); only EXPLICIT hardened
  // labels go to H. (physics-reviewer 2026-06-25 -- mapping it to H inflated every soft cut to "aggressive".)
  tool_steel: "P",
  stainless: "M", stainless_steel: "M", ss: "M",
  cast_iron: "K", gray_iron: "K", nodular_iron: "K",
  aluminum: "N", aluminium: "N", brass: "N", copper: "N", bronze: "N",
  inconel: "S", titanium: "S", superalloy: "S", waspaloy: "S", hastelloy: "S",
  hardened: "H", hardened_steel: "H",
};

export function materialGroupToISO(group) {
  if (!group) return null;
  return MATERIAL_GROUP_TO_ISO[String(group).toLowerCase()] ?? null;
}

// Materials not conventionally TURNED on a lathe (carbide/ceramic/CBN/diamond are ground or EDM'd,
// not turned -- e.g. 350 m/min on solid tungsten carbide is physically impossible). A proven "turning
// CSS" for these is a mislabel/context error, NOT a real cut, so they are EXCLUDED rather than
// band-compared (an honest exclusion beats a meaningless verdict). (physics-reviewer 2026-06-25.)
const NOT_CONVENTIONALLY_TURNED = new Set(["tungsten_carbide", "carbide", "ceramic", "cbn", "diamond"]);
export function isConventionallyTurned(group) {
  return !NOT_CONVENTIONALLY_TURNED.has(String(group || "").toLowerCase());
}

// SFM (surface feet/min) -> m/min, EXACT by definition (1 ft = 0.3048 m) -- a unit conversion, NOT an
// empirical physics constant. The proven store records JM's G96 CSS UNCONVERTED: Okuma OSP G96 S-values
// in INCH mode are SFM (the parser field is documented "(SFM)" and the aggregator copies it raw), and
// JM is a US/inch shop. Evidence the corpus is SFM: max G96 S = 3000 (= 914 m/min as SFM -- impossible
// as m/min turning), 0 of 16,558 programs use G21 (metric). So a proven CSS MUST be converted to m/min
// before comparison to CANONICAL_TURNING_SPEEDS (m/min). (slot:oscar 2026-06-25.)
export const SFM_TO_M_PER_MIN = 0.3048;
export function cssToMPerMin(css, unit = "sfm") {
  if (css == null) return NaN;          // null/undefined -> NaN (NOT Number(null)=0), consistent no-css handling
  const v = Number(css);
  if (!Number.isFinite(v)) return NaN;
  // ONLY an explicit "m_min" passes through; everything else (incl a typo) converts -- the JM corpus is
  // SFM, so default-convert is the safe direction (a passthrough default would silently 3.28x under-read).
  return unit === "m_min" ? v : v * SFM_TO_M_PER_MIN;
}

// IPR (inch/rev) -> mm/rev, EXACT (1 in = 25.4 mm) -- a unit conversion, NOT a physics constant. JM lathe
// feed is recorded in IPR: the programs are G95 (feed-per-rev) inch-mode (e.g. `G95 G1 ... F.005`), and
// feeds span F.0005..F.02 -- the classic turning ipr range (0.005 mm/rev = 5um/rev, and 0.005 ipm under
// G94, are both physically absurd). Verified from raw `JM DIE/CNC LATHE/*.MIN` (slot:oscar 2026-06-25).
export const IPR_TO_MM_PER_REV = 25.4;
export function feedToMmPerRev(feed, unit = "ipr") {
  if (feed == null) return NaN;          // null/undefined -> NaN (NOT Number(null)=0), no-feed handled by caller
  const v = Number(feed);
  if (!Number.isFinite(v)) return NaN;
  // ONLY an explicit "mm_rev" passes through; everything else converts -- the JM corpus is IPR, so
  // default-convert is the safe direction (a passthrough default would silently 25.4x under-read).
  return unit === "mm_rev" ? v : v * IPR_TO_MM_PER_REV;
}

/** Resolve which unit the store's css is in: an explicit --css-unit flag wins; else the store's OWN
 *  `cssUnit` label (set once the aggregator units-fix lands and normalizes to m/min); else "sfm" -- the
 *  current unlabeled JM-inch corpus. Forward-compatible: no double-conversion when the store self-describes. */
export function resolveCssUnit(explicitUnit, storeUnit) {
  const valid = (u) => u === "m_min" || u === "sfm";
  if (valid(explicitUnit)) return explicitUnit;
  if (valid(storeUnit)) return storeUnit;
  return "sfm";
}

const ROUGH_OPS = new Set(["od_roughing", "id_roughing"]);
const FINISH_OPS = new Set(["od_finishing", "id_finishing"]);
const GENERAL_TURNING_OPS = new Set(["facing", "boring"]);

/** Classify a turning op for band comparison: rough | finish | general (full-band) | specialized
 *  (own speed regime -> not CSS-comparable to the OD-turning canonical band). */
export function classifyOp(op) {
  const o = String(op || "").toLowerCase();
  if (ROUGH_OPS.has(o)) return "rough";
  if (FINISH_OPS.has(o)) return "finish";
  if (GENERAL_TURNING_OPS.has(o)) return "general";
  return "specialized";
}

/**
 * Verdict the JM-proven CSS against a PRISM canonical band {rough, finish} (m/min). Returns
 * { verdict, deltaPct, band:[lo,hi] } or null when uncomparable (bad css or band).
 *   deltaPct < 0  -> how far BELOW the low edge (conservative)
 *   deltaPct > 0  -> how far ABOVE the high edge (aggressive)
 *   deltaPct = 0  -> in-band
 */
// A CSS this many times above the finish edge is implausible for real carbide turning -> almost
// certainly an SFM->m/min EXTRACTION artifact (700 SFM ~ 213 m/min would be in-band; the ~3.28
// SFM-per-m/min factor lands a mislabel near ~2x the band edge), flagged distinct from a real
// "aggressive" cut per the UNITS-FIRST safety doctrine. (physics-reviewer 2026-06-25.)
export const SUSPECT_UNITS_FACTOR = 1.8;

export function compareCss(jmCss, band) {
  const css = Number(jmCss);
  if (!band || !Number.isFinite(css) || !Number.isFinite(Number(band.rough)) || !Number.isFinite(Number(band.finish))) {
    return null;
  }
  const lo = Math.min(Number(band.rough), Number(band.finish));
  const hi = Math.max(Number(band.rough), Number(band.finish));
  if (lo <= 0) return null;
  if (css < lo) return { verdict: "conservative", deltaPct: ((css - lo) / lo) * 100, band: [lo, hi] };
  if (css > hi * SUSPECT_UNITS_FACTOR) return { verdict: "suspect-units", deltaPct: ((css - hi) / hi) * 100, band: [lo, hi] };
  if (css > hi) return { verdict: "aggressive", deltaPct: ((css - hi) / hi) * 100, band: [lo, hi] };
  return { verdict: "in-band", deltaPct: 0, band: [lo, hi] };
}

/** Verdict the JM-proven feed (mm/rev) against a PRISM canonical turning feed band {rough, finish} (mm/rev,
 *  CANONICAL_TURNING_FEEDS). Roughing feed is HEAVIER than finishing, so the band auto-orients via
 *  compareCss's min/max. Identical semantics: below=JM-light (conservative), in-band, above=JM-heavy
 *  (aggressive), >SUSPECT_UNITS_FACTOR x = suspect-units (a converted-feed > 1.8x the band edge is almost
 *  certainly an IPR->mm/rev double-convert or a wrong feedUnit, not a real cut). Returns null when uncomparable. */
export function compareFeed(jmFeedMmRev, band) {
  return compareCss(jmFeedMmRev, band);
}

/**
 * Build the comparable divergence rows. `turningSpeeds` is CANONICAL_TURNING_SPEEDS (injected).
 * A config is comparable iff it has a numeric css, a resolvable ISO group, and a non-specialized op.
 * Returns { rows, excluded:[{materialGroup,operation,reason}] } -- excluded configs are surfaced
 * honestly (never silently dropped).
 */
export function buildDivergenceRows(configs, turningSpeeds, threshold = DEFAULT_TRUST_THRESHOLD, cssUnit = "sfm", feedUnit = "ipr", turningFeeds = null) {
  const rows = [];
  const excluded = [];
  for (const c of configs) {
    const materialGroup = c?.materialGroup ?? "unknown";
    const operation = c?.operation ?? "unknown";
    // The proven CSS is recorded in SFM (Okuma inch-mode G96, JM convention); convert to m/min for the
    // band compare. null/undefined -> NaN (NOT 0, which would falsely read as a "0 conservative" cut);
    // the no-css guard below excludes it.
    const cssRaw = c?.css?.recommended;
    const jmCssRaw = cssRaw == null ? NaN : Number(cssRaw);
    const jmCss = cssToMPerMin(jmCssRaw, cssUnit);
    const opClass = classifyOp(operation);
    if (!Number.isFinite(jmCss)) { excluded.push({ materialGroup, operation, reason: "no-css" }); continue; }
    if (!isConventionallyTurned(materialGroup)) { excluded.push({ materialGroup, operation, reason: "material-not-conventionally-turned" }); continue; }
    const iso = materialGroupToISO(materialGroup);
    if (!iso) { excluded.push({ materialGroup, operation, reason: "unmapped-material" }); continue; }
    if (opClass === "specialized") { excluded.push({ materialGroup, operation, reason: "specialized-op-own-regime" }); continue; }
    const band = turningSpeeds?.[iso];
    const cmp = compareCss(jmCss, band);
    if (!cmp) { excluded.push({ materialGroup, operation, reason: "no-band-for-iso" }); continue; }
    // Surface the JM proven FEED converted to mm/rev (verified IPR; slot:oscar 2026-06-25) so the
    // "test against ALL JM" artifact covers feed-per-rev, not only CSS. Reference value -- no PRISM
    // feed-band verdict yet (a canonical turning fn band is a clean follow-up); null when the config
    // has no feed.
    const jmFeedRaw = c?.feed?.recommended;
    const jmFeedMmRev = feedToMmPerRev(jmFeedRaw == null ? NaN : Number(jmFeedRaw), feedUnit);
    // Feed verdict vs the canonical turning feed band (when a band is injected). Null when no band or no
    // feed -- the CSS comparison is unaffected (additive). Same conservative/in-band/aggressive semantics.
    const feedCmp = (turningFeeds && Number.isFinite(jmFeedMmRev)) ? compareFeed(jmFeedMmRev, turningFeeds[iso]) : null;
    rows.push({
      materialGroup, operation, iso, opClass,
      jmCssRaw, jmCssUnit: cssUnit, jmCss: Math.round(jmCss),
      jmFeedRaw: jmFeedRaw == null ? null : Number(jmFeedRaw), jmFeedUnit: feedUnit,
      jmFeedMmRev: Number.isFinite(jmFeedMmRev) ? Math.round(jmFeedMmRev * 1000) / 1000 : null,
      feedVerdict: feedCmp ? feedCmp.verdict : null,
      feedDeltaPct: feedCmp ? feedCmp.deltaPct : null,
      feedBand: feedCmp ? feedCmp.band : null,
      prismBand: cmp.band, verdict: cmp.verdict,
      deltaPct: cmp.deltaPct,
      classification: classifyTrust(c, threshold),
      confidence: Number.isFinite(Number(c?.confidence)) ? Number(c.confidence) : null,
      sampleCount: Number(c?.sampleCount) || 0,
    });
  }
  rows.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct)); // biggest divergence first
  return { rows, excluded };
}

/** Aggregate verdict counts (overall + split by trust/override). */
export function summarizeDivergence(rows) {
  const out = {
    comparable: rows.length,
    conservative: 0, inBand: 0, aggressive: 0, suspectUnits: 0,
    trust: { conservative: 0, inBand: 0, aggressive: 0, suspectUnits: 0 },
    override: { conservative: 0, inBand: 0, aggressive: 0, suspectUnits: 0 },
    // Feed-verdict distribution (only rows that have a feed band + a feed). Surfaces the JM accuracy split
    // on feed-per-rev INDEPENDENTLY of CSS -- e.g. JM amateur programs = conservative speeds but in-band feeds.
    feed: { comparable: 0, conservative: 0, inBand: 0, aggressive: 0, suspectUnits: 0 },
  };
  const key = (v) => (v === "in-band" ? "inBand" : v === "suspect-units" ? "suspectUnits" : v);
  for (const r of rows) {
    const k = key(r.verdict);
    out[k]++;
    out[r.classification][k]++;
    if (r.feedVerdict) { out.feed.comparable++; out.feed[key(r.feedVerdict)]++; }
  }
  return out;
}

/** 1-char feed verdict marker for the compact table: c=conservative, i=in-band, a=aggressive, s=suspect-units. */
function feedMark(verdict) {
  return verdict === "conservative" ? "c" : verdict === "aggressive" ? "a"
    : verdict === "suspect-units" ? "s" : verdict === "in-band" ? "i" : "";
}

function fmtDelta(p) {
  if (p === 0) return "   0%";
  const s = `${p > 0 ? "+" : ""}${p.toFixed(0)}%`;
  return s.padStart(5);
}

/** Render a compact text report. Pure (store + injected speeds -> string). */
export function formatDivergenceReport(store, turningSpeeds, threshold = DEFAULT_TRUST_THRESHOLD, cssUnit = "sfm", turningFeeds = null) {
  const configs = toConfigArray(store.provenParams);
  const { rows, excluded } = buildDivergenceRows(configs, turningSpeeds, threshold, cssUnit, "ipr", turningFeeds);
  const s = summarizeDivergence(rows);
  const L = [];
  L.push(`PRISM-vs-JM-proven turning-speed divergence (JM css ${cssUnit}->m/min; band CANONICAL_TURNING_SPEEDS; trust cutoff ${threshold})`);
  L.push(`source: ${store.source ?? "?"} | programs: ${store.totalPrograms ?? "?"} | proven configs: ${configs.length}`);
  L.push(`comparable: ${s.comparable}  (excluded ${excluded.length}: no-css / unmapped-material / specialized-op)`);
  L.push(`verdict:  CONSERVATIVE ${s.conservative} (JM slow) | IN-BAND ${s.inBand} (agrees) | AGGRESSIVE ${s.aggressive} (JM hot) | SUSPECT-UNITS ${s.suspectUnits} (>${SUSPECT_UNITS_FACTOR}x band)`);
  if (s.feed.comparable > 0) {
    L.push(`feed/rev: CONSERVATIVE ${s.feed.conservative} (JM light) | IN-BAND ${s.feed.inBand} (agrees) | AGGRESSIVE ${s.feed.aggressive} (JM heavy) | SUSPECT-UNITS ${s.feed.suspectUnits}  (of ${s.feed.comparable} configs with a feed)`);
  }
  L.push(`  of TRUST configs:    cons ${s.trust.conservative} / in-band ${s.trust.inBand} / aggr ${s.trust.aggressive} / suspect ${s.trust.suspectUnits}`);
  L.push(`  of OVERRIDE configs: cons ${s.override.conservative} / in-band ${s.override.inBand} / aggr ${s.override.aggressive} / suspect ${s.override.suspectUnits}`);
  L.push(`NOTE: JM CSS read as ${cssUnit} and converted to m/min before the band compare (Okuma inch-mode`);
  L.push("      G96 = SFM; the proven store records it UNCONVERTED -- source fix queued; --css-unit m_min");
  L.push("      overrides). tool_steel -> ISO P (annealed); tungsten_carbide/carbide EXCLUDED (not turned).");
  L.push(`      SUSPECT-UNITS = converted CSS still > ${SUSPECT_UNITS_FACTOR}x band (a genuine anomaly). Band is`);
  L.push("      per-ISO-group, not material-specific within a group.");
  L.push("      feed/rev (mm/rev) = JM proven feed (IPR*25.4) vs CANONICAL_TURNING_FEEDS; marker c=conservative/JM-light");
  L.push("      i=in-band  a=aggressive/JM-heavy  s=suspect-units (likely a feed units artifact).");
  L.push("");
  L.push("material         operation         ISO  sfm ->m/min  feed/rev  PRISM-band    delta  verdict       class");
  L.push("---------------- ----------------- ---  ---- -------  --------  ------------  -----  ------------  --------");
  for (const r of rows) {
    L.push([
      String(r.materialGroup).padEnd(16),
      String(r.operation).padEnd(17),
      String(r.iso).padEnd(3),
      String(r.jmCssRaw).padStart(4),
      String(r.jmCss).padStart(7),
      (r.jmFeedMmRev == null ? "--" : `${r.jmFeedMmRev}${feedMark(r.feedVerdict)}`).padStart(8),
      `[${r.prismBand[0]},${r.prismBand[1]}]`.padEnd(12),
      fmtDelta(r.deltaPct),
      String(r.verdict).padEnd(12),
      r.classification,
    ].join(" "));
  }
  return L.join("\n");
}

// === MAIN (I/O; tsx-reexec guarded; isMain-gated so tests import the pure helpers cleanly) ===

/** Map comparable divergence rows to a flat JSONL training/eval dataset for india LoRA/GNN (priority-4
 *  feed). Pure -> unit-tested. JM labels are the GUIDELINE-to-test-against (NOT trusted; see the JM trust
 *  policy) -- the css/feed VERDICTS (PRISM-vs-JM) are the supervised signal, with verified units. */
export function toDatasetRows(rows) {
  return rows.map((r) => ({
    iso: r.iso, operation: r.operation, op_class: r.opClass,
    jm_css_mpm: r.jmCss, prism_css_band: r.prismBand, css_verdict: r.verdict, css_delta_pct: r.deltaPct,
    jm_feed_mm_rev: r.jmFeedMmRev, prism_feed_band: r.feedBand, feed_verdict: r.feedVerdict, feed_delta_pct: r.feedDeltaPct,
    classification: r.classification, confidence: r.confidence, sample_count: r.sampleCount,
  }));
}

async function main() {
  // Imports CANONICAL_TURNING_SPEEDS (.ts) below -> relaunch under tsx for bare-node launches.
  reexecUnderTsxIfNeeded(import.meta.url);
  const args = process.argv.slice(2);
  const JSON_OUT = args.includes("--json");
  const DATASET_OUT = args.includes("--dataset"); // JSONL training/eval dataset for india LoRA/GNN (priority-4 feed)
  const tIdx = args.indexOf("--threshold");
  const threshold = tIdx >= 0 && args[tIdx + 1] ? Number(args[tIdx + 1]) : DEFAULT_TRUST_THRESHOLD;
  if (!Number.isFinite(threshold)) {
    console.error(`[sfc-jm-proven-divergence] invalid --threshold (must be a number, e.g. 0.7): ${args[tIdx + 1]}`);
    process.exit(1);
  }
  const sIdx = args.indexOf("--store");
  const storePath = sIdx >= 0 && args[sIdx + 1] ? args[sIdx + 1] : DEFAULT_STORE;
  const uIdx = args.indexOf("--css-unit");
  const explicitUnit = uIdx >= 0 ? args[uIdx + 1] : null; // --css-unit sfm|m_min (resolved vs store.cssUnit below)

  if (!fs.existsSync(storePath)) {
    console.error(
      `[sfc-jm-proven-divergence] store not found: ${storePath}\n` +
      `Run the extractor first: npx tsx scripts/extract-jm-proven-speedfeed.mjs`,
    );
    process.exit(1);
  }
  let store;
  try {
    store = JSON.parse(fs.readFileSync(storePath, "utf8"));
  } catch (e) {
    console.error(`[sfc-jm-proven-divergence] could not parse ${storePath}: ${e.message}`);
    process.exit(1);
  }

  const { CANONICAL_TURNING_SPEEDS, CANONICAL_TURNING_FEEDS } = await import("../src/physics/constants.js");
  const cssUnit = resolveCssUnit(explicitUnit, store.cssUnit); // explicit flag > store's own label > sfm default
  const configs = toConfigArray(store.provenParams);
  const { rows, excluded } = buildDivergenceRows(configs, CANONICAL_TURNING_SPEEDS, threshold, cssUnit, "ipr", CANONICAL_TURNING_FEEDS);

  if (DATASET_OUT) {
    // One comparable config per line (JSONL) -- the india-consumable training/eval dataset.
    for (const d of toDatasetRows(rows)) console.log(JSON.stringify(d));
  } else if (JSON_OUT) {
    console.log(JSON.stringify({
      threshold, cssUnit, summary: summarizeDivergence(rows), rows, excludedCount: excluded.length, excluded,
    }, null, 2));
  } else {
    console.log(formatDivergenceReport(store, CANONICAL_TURNING_SPEEDS, threshold, cssUnit, CANONICAL_TURNING_FEEDS));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(`[sfc-jm-proven-divergence] ${e?.stack || e}`); process.exit(1); });
}
