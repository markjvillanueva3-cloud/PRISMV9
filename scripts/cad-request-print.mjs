#!/usr/bin/env node
/**
 * cad-request-print.mjs (U-DELTA-CAD-REQUEST-PRINT, slot:delta 2026-06-29)
 *
 * The "DECIPHER THE PRINT" primitive of the operator's closed-loop CAD architecture: turn a natural-language
 * part description (the text request that drives generation -- or, for a real drawing, the OCR'd callouts) into
 * a ground-truth canonical PrintDim[] INCLUDING FEATURES (holes/bores/counterbores), units-resolved to mm.
 * This is the ORIGINAL-print side the self-check (cad-self-check.mjs) grades a generated part against. Without
 * feature deciphering, a sweep can only check the envelope and misses the "2-hole bracket generated 1 hole" class.
 *
 *   parseRequestPrint("a 2.0 inch square plate 0.375 thick with a 0.5 inch diameter hole in each corner")
 *     -> { dims:[linear 50.8, linear 50.8, linear 9.525, diameter 12.7 x4], shape:"square-plate", unit:"in" }
 *
 * Grounded in REAL corpus request strings (state/shared/cad-text-gen/<slug>/request.json): cube / "N by M by P" /
 * "D diameter disc T thick" / "N square plate T thick" / gear-blank, plus hole|bore|central-bore callouts,
 * "in each corner" (=4), and counterbores. Units-first via the canonical convertToMm (never re-implemented).
 * Pure + exported + unit-tested. Returns {dims:[]} for an unparseable request (never fabricates dimensions).
 * Distinct from the print->CAD generation/validation nodes (cad-print-to-cad / print-to-all-cads-validate):
 * this is the print-DECIPHERING direction (text/OCR -> ground-truth dims) that FEEDS the self-check, not generation.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertToMm } from "./lib/ollama-vision-extract-lib.mjs";

const NUM = "(\\d+(?:\\.\\d+)?)";
const UNIT = "(?:\\s*(inch|inches|in|mm|cm|\"))?";
const WORD_COUNT = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

/** Detect the request's dominant unit token (title-block default applied to a number that states none). */
export function dominantUnit(request) {
  const s = String(request || "").toLowerCase();
  if (/mm\b|millimet/.test(s) && !/\binch|\bin\b|"/.test(s)) return "mm"; // "50mm" has no \b before mm -> match mm\b
  if (/\binch|inches\b|\bin\b|"/.test(s)) return "in";
  return null; // unknown -> caller decides (JM convention is INCH, but never silently assume here)
}

/** mm-resolve one (value, unitToken) with a request-level fallback; returns null when unresolved. */
function mmOf(value, unitTok, fallback) {
  const c = convertToMm(value, unitTok || null, fallback);
  return c.resolved && c.mm != null ? Math.round(c.mm * 1e6) / 1e6 : null;
}

/**
 * Parse the ENVELOPE (overall solid) from a request into linear/diameter dims (mm). Handles cube, "N by M by P"
 * rectangular, "L x W x H", "D diameter disc/cylinder/gear-blank T thick/long", "N square plate T thick". Pure.
 */
export function parseEnvelope(request, fallbackUnit) {
  const s = String(request || "").toLowerCase();
  const out = [];
  let shape = null;
  let m;
  // cube: "1.0 inch cube"
  if ((m = s.match(new RegExp(`${NUM}${UNIT}\\s*cube`)))) {
    const v = mmOf(m[1], m[2], fallbackUnit); if (v != null) { out.push({ type: "linear", nominal: v }, { type: "linear", nominal: v }, { type: "linear", nominal: v }); shape = "cube"; }
  }
  // "N by M by P" (rectangular plate/block)
  else if ((m = s.match(new RegExp(`${NUM}${UNIT}\\s*by\\s*${NUM}${UNIT}\\s*by\\s*${NUM}${UNIT}`)))) {
    const a = mmOf(m[1], m[2], fallbackUnit), b = mmOf(m[3], m[4], fallbackUnit), c = mmOf(m[5], m[6], fallbackUnit);
    if (a != null && b != null && c != null) { out.push({ type: "linear", nominal: a }, { type: "linear", nominal: b }, { type: "linear", nominal: c }); shape = "rect"; }
  }
  // "L x W x H"
  else if ((m = s.match(new RegExp(`${NUM}${UNIT}\\s*[x×*]\\s*${NUM}${UNIT}\\s*[x×*]\\s*${NUM}${UNIT}`)))) {
    const a = mmOf(m[1], m[2], fallbackUnit), b = mmOf(m[3], m[4], fallbackUnit), c = mmOf(m[5], m[6], fallbackUnit);
    if (a != null && b != null && c != null) { out.push({ type: "linear", nominal: a }, { type: "linear", nominal: b }, { type: "linear", nominal: c }); shape = "rect"; }
  }
  // "D diameter disc/cylinder/gear blank/round T thick/long/tall"  (and the reverse "disc ... D diameter ... T thick")
  else if ((m = s.match(new RegExp(`${NUM}${UNIT}\\s*diameter\\s*(?:disc|disk|round|gear\\s*blank)\\b.*?${NUM}${UNIT}\\s*(?:thick|long|tall)`)))
        || (m = s.match(new RegExp(`(?:disc|disk|round|gear\\s*blank)\\b.*?${NUM}${UNIT}\\s*diameter.*?${NUM}${UNIT}\\s*(?:thick|long|tall)`)))) {
    const d = mmOf(m[1], m[2], fallbackUnit), t = mmOf(m[3], m[4], fallbackUnit);
    if (d != null && t != null) { out.push({ type: "diameter", nominal: d }, { type: "linear", nominal: t }); shape = "disc"; }
  }
  // TAPERED: truncated cone / tapered plug -- "D1 diameter ... tapering to D2 ... over L" (2 diameters + length, curved)
  else if ((m = s.match(new RegExp(`${NUM}${UNIT}\\s*diameter.*?tapering\\s*to\\s*${NUM}${UNIT}.*?over\\s*(?:a\\s*)?${NUM}${UNIT}`)))) {
    const d1 = mmOf(m[1], m[2], fallbackUnit), d2 = mmOf(m[3], m[4], fallbackUnit), len = mmOf(m[5], m[6], fallbackUnit);
    if (d1 != null && d2 != null && len != null) { out.push({ type: "diameter", nominal: d1 }, { type: "diameter", nominal: d2 }, { type: "linear", nominal: len }); shape = "cone"; }
  }
  // TWO-BODY: flange/die-button/pilot-punch/hub -- "D1 diameter <noun> L1 thick/tall/long (on a | stepping down to) D2 diameter L2 long"
  else if ((m = s.match(new RegExp(`${NUM}${UNIT}\\s*diameter.*?${NUM}${UNIT}\\s*(?:thick|tall|long|high).*?(?:on\\s*a|on|stepping\\s*down\\s*to|step\\s*down\\s*to)\\s*(?:a\\s+)?${NUM}${UNIT}\\s*diameter.*?${NUM}${UNIT}\\s*(?:long|tall|high|thick)`)))) {
    const d1 = mmOf(m[1], m[2], fallbackUnit), l1 = mmOf(m[3], m[4], fallbackUnit), d2 = mmOf(m[5], m[6], fallbackUnit), l2 = mmOf(m[7], m[8], fallbackUnit);
    if ([d1, l1, d2, l2].every((v) => v != null)) { out.push({ type: "diameter", nominal: d1 }, { type: "linear", nominal: l1 }, { type: "diameter", nominal: d2 }, { type: "linear", nominal: l2 }); shape = "two-body"; }
  }
  // SOLID CYLINDER phrased "N in diameter and M tall"
  else if ((m = s.match(new RegExp(`${NUM}${UNIT}\\s*(?:in\\s*)?diameter\\s*and\\s*${NUM}${UNIT}\\s*(?:tall|long|high)`)))) {
    const d = mmOf(m[1], m[2], fallbackUnit), len = mmOf(m[3], m[4], fallbackUnit);
    if (d != null && len != null) { out.push({ type: "diameter", nominal: d }, { type: "linear", nominal: len }); shape = "cylinder"; }
  }
  // SQUARE TUBE: "D square outside with W wall thickness, L long" -> outer square envelope (2 linear) + length (the wall/bore is an internal feature)
  else if ((m = s.match(new RegExp(`${NUM}${UNIT}\\s*square\\s*(?:outside)?.*?wall.*?${NUM}${UNIT}\\s*(?:long|tall|high)`)))) {
    const side = mmOf(m[1], m[2], fallbackUnit), len = mmOf(m[3], m[4], fallbackUnit);
    if (side != null && len != null) { out.push({ type: "linear", nominal: side }, { type: "linear", nominal: side }, { type: "linear", nominal: len }); shape = "square-tube"; }
  }
  // "D diameter by L tall/long cylinder" OR "D diameter cylinder/shaft/rod L long" (length AFTER the noun)
  else if ((m = s.match(new RegExp(`${NUM}${UNIT}\\s*diameter\\s*by\\s*${NUM}${UNIT}\\s*(?:tall|long|high)`)))
        || (m = s.match(new RegExp(`${NUM}${UNIT}\\s*diameter\\s*(?:cylinder|shaft|rod|pin|dowel|bushing|spacer)\\b.*?${NUM}${UNIT}\\s*(?:tall|long|high)`)))) {
    const d = mmOf(m[1], m[2], fallbackUnit), len = mmOf(m[3], m[4], fallbackUnit);
    if (d != null && len != null) { out.push({ type: "diameter", nominal: d }, { type: "linear", nominal: len }); shape = "cylinder"; }
  }
  // "N square plate T thick"
  else if ((m = s.match(new RegExp(`${NUM}${UNIT}\\s*square\\s*(?:plate|bar)?.*?${NUM}${UNIT}\\s*thick`)))) {
    const side = mmOf(m[1], m[2], fallbackUnit), t = mmOf(m[3], m[4], fallbackUnit);
    if (side != null && t != null) { out.push({ type: "linear", nominal: side }, { type: "linear", nominal: side }, { type: "linear", nominal: t }); shape = "square-plate"; }
  }
  return { dims: out, shape };
}

/**
 * Parse FEATURE callouts (holes/bores/counterbores) from a request into diameter dims (mm). A "... in each
 * corner" / "in each of N corners" multiplies the preceding hole to N (default 4). A counterbore adds a
 * second, larger diameter. Pure -- emits one diameter dim per physical feature instance. Uses matchAll (no
 * RegExp.exec loop -- avoids the security scanner's exec false-positive while reading every callout).
 */
export function parseFeatures(request, fallbackUnit) {
  const s = String(request || "").toLowerCase();
  const out = [];
  // primary hole / bore: "0.25 inch diameter through hole", "0.625 inch bore", "0.5 inch diameter central bore"
  const holeRe = new RegExp(`${NUM}${UNIT}\\s*(?:diameter\\s+)?(?:central\\s+|through\\s+|center\\s+|clearance\\s+|tapped\\s+)?(?:hole|bore)s?`, "g");
  for (const m of s.matchAll(holeRe)) {
    const d = mmOf(m[1], m[2], fallbackUnit);
    if (d == null) continue;
    // count: a "... in each corner" / "in each of N corners" within ~80 chars multiplies the feature instances
    const tail = s.slice(m.index, m.index + 80);
    let count = 1;
    const corner = tail.match(/in each(?:\s+of\s+(\d+|one|two|three|four|five|six|eight))?\s+corner/);
    const places = tail.match(/(\d+|two|three|four|five|six|eight)\s+(?:places|holes)/);
    if (corner) count = corner[1] ? (Number(corner[1]) || WORD_COUNT[corner[1]] || 4) : 4;
    else if (places) count = Number(places[1]) || WORD_COUNT[places[1]] || 1;
    for (let i = 0; i < count; i++) out.push({ type: "diameter", nominal: d, feature: "hole" });
  }
  // counterbore secondary diameter: "counterbored to 0.5 inch diameter"
  const cbore = s.match(new RegExp(`counterbored?\\s*to\\s*${NUM}${UNIT}\\s*diameter`));
  if (cbore) { const d = mmOf(cbore[1], cbore[2], fallbackUnit); if (d != null) out.push({ type: "diameter", nominal: d, feature: "counterbore" }); }
  return out;
}

/**
 * Decipher a full request into a ground-truth PrintDim[] (envelope + features, mm). Returns
 * { dims, shape, unit, featureCount }. dims is empty when nothing parses (never fabricates). Pure.
 */
export function parseRequestPrint(request, { assumeUnits = null } = {}) {
  const fallback = assumeUnits || dominantUnit(request);
  const env = parseEnvelope(request, fallback);
  const feats = parseFeatures(request, fallback);
  return { dims: [...env.dims, ...feats], shape: env.shape, unit: fallback, featureCount: feats.length };
}

async function main() {
  const fs = await import("node:fs");
  const args = process.argv.slice(2);
  const get = (n, d) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const reqArg = get("--request", null);
  const reqFile = get("--request-file", null);
  let request = reqArg;
  if (!request && reqFile) { try { request = JSON.parse(fs.readFileSync(path.resolve(reqFile), "utf8")).request; } catch (e) { process.stderr.write(`read failed: ${e.message}\n`); process.exit(2); } }
  if (!request) { process.stderr.write("cad-request-print: --request \"<text>\" or --request-file <request.json>\n"); process.exit(2); }
  const out = parseRequestPrint(request, { assumeUnits: get("--assume-units", null) });
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main().catch((e) => { process.stderr.write(`${e?.stack ?? e}\n`); process.exit(1); });
