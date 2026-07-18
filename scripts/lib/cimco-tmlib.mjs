/**
 * cimco-tmlib.mjs — PRISM tool record → CIMCO Edit 2026 Tool Library (.tmlib) emitter.
 *
 * CIMCO-TOOLDB-FILL-MS0 / U-CTF-LIB (slot:romeo, 2026-06-02). The keystone of
 * "fill the different databases in CIMCO Edit 2026": converts PRISM ToolRegistry
 * /catalog records into the exact XML that CIMCO Edit 2026's Tool Manager loads.
 *
 * TARGET FORMAT — reverse-engineered from REAL bytes in the installed product:
 *   C:/Program Files/CIMCO 2026/CIMCOEdit/ToolLibs/Predefined/*.tmlib
 *   Root: <Library Version="4">; children <Cutter Type="..."> and <Holder Type="...">;
 *   each holds flat <Parameter Type="X">value</Parameter> lines.
 *   Imperial libraries carry INCH values; Metric carry MM. ItemUnitSystem marks which.
 *
 * Confirmed cutter types + parameter sets (read verbatim from the predefined libs):
 *   EndMill       (Inch Mills.tmlib / ISO Mills MM.tmlib)
 *   CommonDrill   (Inch Drills.tmlib)      — TipAngle default 140
 *   SpotDrill     (Inch Spot drills.tmlib) — TipAngle default 90 + TipDiameter
 *   Countersink   (Inch Counter sinks.tmlib)
 *   TapRightHand  (Inch Taps.tmlib)        — ThreadPitch = pitch_mm × 25.4  (see below)
 *   Holder        (Holders.tmlib)          — HolderSegments profile
 *
 * ThreadPitch derivation (verified against Inch Taps.tmlib):
 *   1/4-20 → ThreadPitch 32.258 ; 1/4-28 → 23.04.  pitch_mm = 25.4/TPI.
 *   ThreadPitch = pitch_mm × 25.4  ⇔  25.4²/TPI  ⇔  645.16/TPI.  (32.258 = 1.27×25.4 ✓)
 *   This is CIMCO's own unit and is INDEPENDENT of the library's ItemUnitSystem.
 *
 * PRISM source — units are MILLIMETRES (CuttingTool.geometry.* are mm). When the
 * output ItemUnitSystem is Imperial, lengths are divided by 25.4 (the 25.4× class of
 * error the units-guard exists to prevent — exercised explicitly in the tests).
 *
 * Deferred / honestly-flagged (NOT fabricated here):
 *   - Ball/bull-nose EndMillCornerType enum values are unconfirmed → we emit "Flat"
 *     (the only confirmed value) and carry an accurate CornerRadius. A Metric mills
 *     lib containing ball variants is needed to confirm the enum (follow-up).
 *   - TapLeftHand schema unconfirmed → all taps map to TapRightHand for now.
 *   - Holder-from-interface (BT40/HSK63 → HolderSegments) needs a profile table →
 *     holderToXml() emits supplied segments but classification is out of scope here.
 *   - Metric-tap ThreadPitch uses the same pitch_mm×25.4 formula (inferred; inch verified).
 */

import { randomUUID } from "node:crypto";

export const MM_PER_INCH = 25.4;
export const THREAD_PITCH_FACTOR = MM_PER_INCH * MM_PER_INCH; // 645.16 = 25.4²
export const LIBRARY_VERSION = "4";

/** Common header params present on every <Cutter>. ItemId is intentionally empty. */
export const CUTTER_HEADER = ["ItemId", "ItemNumber", "Description", "ItemGuid", "ItemUnitSystem"];

/** Ordered, type-specific parameter list — order matches the real predefined libs. */
export const CUTTER_BODY = {
  EndMill: ["Material", "Coolant", "LengthOffset", "DiameterOffset", "FluteDiameter", "ShaftDiameter", "BodyLength", "FluteLength", "ShoulderLength", "CornerRadius", "TaperLength", "ShoulderDiameter", "EndMillCornerType", "ChamferDistance"],
  CommonDrill: ["Material", "Coolant", "LengthOffset", "DiameterOffset", "FluteDiameter", "ShoulderDiameter", "ShaftDiameter", "BodyLength", "FluteLength", "ShoulderLength", "TipAngle", "TaperLength"],
  SpotDrill: ["Material", "Coolant", "LengthOffset", "DiameterOffset", "FluteDiameter", "ShoulderDiameter", "ShaftDiameter", "BodyLength", "FluteLength", "ShoulderLength", "TipAngle", "TaperLength", "TipDiameter"],
  Countersink: ["Material", "Coolant", "LengthOffset", "DiameterOffset", "FluteDiameter", "ShoulderDiameter", "ShaftDiameter", "BodyLength", "FluteLength", "ShoulderLength", "TipAngle"],
  TapRightHand: ["Material", "Coolant", "LengthOffset", "DiameterOffset", "TaperLength", "FluteDiameter", "ShoulderDiameter", "ShaftDiameter", "BodyLength", "FluteLength", "ShoulderLength", "ThreadPitch", "TipAngle"],
};

// ── small numeric/XML helpers ────────────────────────────────────────────────
const round4 = (x) => Number(x.toFixed(4));

function firstNum(...vals) {
  for (const v of vals) {
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return undefined;
}

function fmtNum(n, decimals) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "0";
  let r = Number(n.toFixed(decimals));
  if (Object.is(r, -0)) r = 0;
  return String(r);
}

function escXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescXml(s) {
  return String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Length string in the OUTPUT unit system (PRISM stores mm). */
function lenStr(mm, unitSystem) {
  const v = unitSystem === "Imperial" ? mm / MM_PER_INCH : mm;
  return fmtNum(v, unitSystem === "Imperial" ? 5 : 4);
}
const angleStr = (deg) => fmtNum(deg, 4);

// ── classification ───────────────────────────────────────────────────────────
/**
 * Map a PRISM tool (or a raw type/category string) → a CIMCO Cutter Type.
 * Returns null for tools that have no confirmed CIMCO cutter mapping (caller skips).
 * Order is significant (tap before mill; spot/countersink before drill).
 */
export function classifyCutterType(input) {
  const t = String(
    input && typeof input === "object"
      ? input.type || input.category || input.subcategory || ""
      : input || ""
  ).toLowerCase();
  if (!t) return null;
  if (/\btap\b|tapping/.test(t)) return "TapRightHand";
  if (/countersink|counter[-\s]?sink|csink/.test(t)) return "Countersink";
  if (/spot|cente?r[-\s]?drill/.test(t)) return "SpotDrill";
  if (/drill|reamer|\bream\b|bore|boring/.test(t)) return "CommonDrill";
  if (/mill|cutter|slot|face|ball|bull|chamfer/.test(t)) return "EndMill";
  return null;
}

// ── normalization (PRISM record → canonical mm geometry) ──────────────────────
/**
 * Collapse the many PRISM tool record shapes (ToolRegistry.CuttingTool, reference-db,
 * catalog-extractions) into one canonical mm geometry. Returns null when the record
 * has no usable cutting diameter (finite, > 0) — such records cannot be exported.
 */
export function normalizeTool(tool) {
  if (!tool || typeof tool !== "object") return null;
  const g = tool.geometry && typeof tool.geometry === "object" ? tool.geometry : {};

  const dia = firstNum(g.diameter, tool.cutting_diameter_mm, tool.diameter_mm, tool.diameter, tool.cutting_diameter, tool.dia);
  if (!(typeof dia === "number" && Number.isFinite(dia) && dia > 0)) return null;

  const shank = firstNum(g.shank_diameter, tool.shank_diameter_mm, tool.shank_diameter, tool.shankDiameter) ?? dia;
  let flute = firstNum(g.flute_length, tool.flute_length_mm, tool.flute_length, tool.loc, tool.cutting_length);
  let oal = firstNum(g.overall_length, tool.overall_length_mm, tool.overall_length, tool.oal, tool.length);
  const corner = firstNum(g.corner_radius, tool.corner_radius_mm, tool.corner_radius) ?? 0;
  const flutes = firstNum(g.flutes, tool.flute_count, tool.flutes, tool.number_of_flutes);
  const point = firstNum(g.point_angle, tool.point_angle, tool.tip_angle, tool.included_angle);

  // Diameter-proportional defaults when geometry is sparse (industry-typical LOC≈3D).
  if (flute === undefined || !(flute > 0)) flute = round4(dia * 3);
  if (oal === undefined || !(oal > 0)) oal = round4(flute + dia * 4);
  if (oal <= flute) oal = round4(flute + Math.max(dia * 2, 5)); // guarantee body > flute

  const name = String(tool.name || tool.description || tool.catalog_number || tool.part_number || tool.id || "TOOL");
  const tpi = firstNum(tool.tpi, tool.threads_per_inch, tool.thread_tpi);
  const pitchMm = firstNum(tool.thread_pitch_mm, tool.pitch_mm, tool.thread_pitch);
  const tipDia = firstNum(tool.tip_diameter_mm, tool.tip_diameter) ?? 0;

  return {
    name,
    diameter_mm: dia,
    shankDia_mm: shank > 0 ? shank : dia,
    fluteLen_mm: flute,
    oal_mm: oal,
    cornerRadius_mm: corner >= 0 ? corner : 0,
    flutes,
    pointAngle_deg: point,
    tpi,
    pitchMm,
    tipDiameter_mm: tipDia >= 0 ? tipDia : 0,
  };
}

// ── tool → cutter param object ────────────────────────────────────────────────
/**
 * Build a {cutterType, params} object from one PRISM tool.
 * opts: { unitSystem?: "Metric"|"Imperial", itemNumber?, guidFn?, cutterType? }
 * Returns null when the tool can't be classified or has no usable diameter.
 */
export function toolToCutter(tool, opts = {}) {
  const cutterType = opts.cutterType || classifyCutterType(tool);
  if (!cutterType || !CUTTER_BODY[cutterType]) return null;
  const norm = normalizeTool(tool);
  if (!norm) return null;

  const unitSystem = opts.unitSystem === "Imperial" ? "Imperial" : "Metric";
  const L = (mm) => lenStr(mm, unitSystem);
  const A = (deg) => angleStr(deg);
  const shoulder = Math.max(0, norm.oal_mm - norm.fluteLen_mm);

  const p = {
    ItemNumber: String(opts.itemNumber ?? 1),
    Description: norm.name,
    ItemGuid: (opts.guidFn || randomUUID)(),
    ItemUnitSystem: unitSystem,
    Material: "Unspecified",
    Coolant: "Disabled",
    LengthOffset: "0",
    DiameterOffset: "0",
  };

  switch (cutterType) {
    case "EndMill":
      Object.assign(p, {
        FluteDiameter: L(norm.diameter_mm),
        ShaftDiameter: L(norm.shankDia_mm),
        BodyLength: L(norm.oal_mm),
        FluteLength: L(norm.fluteLen_mm),
        ShoulderLength: L(shoulder),
        CornerRadius: L(norm.cornerRadius_mm),
        TaperLength: "0",
        ShoulderDiameter: L(norm.shankDia_mm),
        EndMillCornerType: "Flat",
        ChamferDistance: "0",
      });
      break;
    case "CommonDrill":
      Object.assign(p, {
        FluteDiameter: L(norm.diameter_mm),
        ShoulderDiameter: L(norm.diameter_mm),
        ShaftDiameter: L(norm.shankDia_mm),
        BodyLength: L(norm.oal_mm),
        FluteLength: L(norm.fluteLen_mm),
        ShoulderLength: L(shoulder),
        TipAngle: A(norm.pointAngle_deg ?? 140),
        TaperLength: "0",
      });
      break;
    case "SpotDrill":
      Object.assign(p, {
        FluteDiameter: L(norm.diameter_mm),
        ShoulderDiameter: L(norm.diameter_mm),
        ShaftDiameter: L(norm.shankDia_mm),
        BodyLength: L(norm.oal_mm),
        FluteLength: L(norm.fluteLen_mm),
        ShoulderLength: L(shoulder),
        TipAngle: A(norm.pointAngle_deg ?? 90),
        TaperLength: "0",
        TipDiameter: L(norm.tipDiameter_mm ?? 0),
      });
      break;
    case "Countersink":
      Object.assign(p, {
        FluteDiameter: L(norm.diameter_mm),
        ShoulderDiameter: L(norm.diameter_mm),
        ShaftDiameter: L(norm.shankDia_mm),
        BodyLength: L(norm.oal_mm),
        FluteLength: L(norm.fluteLen_mm),
        ShoulderLength: L(shoulder),
        TipAngle: A(norm.pointAngle_deg ?? 90),
      });
      break;
    case "TapRightHand": {
      let pitchMm = norm.pitchMm;
      if ((pitchMm === undefined || !(pitchMm > 0)) && norm.tpi > 0) pitchMm = MM_PER_INCH / norm.tpi;
      const threadPitch = pitchMm > 0 ? fmtNum(pitchMm * MM_PER_INCH, 6) : "0";
      Object.assign(p, {
        TaperLength: "0",
        FluteDiameter: L(norm.diameter_mm),
        ShoulderDiameter: L(norm.diameter_mm),
        ShaftDiameter: L(norm.shankDia_mm),
        BodyLength: L(norm.oal_mm),
        FluteLength: L(norm.fluteLen_mm),
        ShoulderLength: L(shoulder),
        ThreadPitch: threadPitch,
        TipAngle: A(norm.pointAngle_deg ?? 140),
      });
      break;
    }
  }
  return { cutterType, params: p };
}

// ── XML emission ──────────────────────────────────────────────────────────────
function paramLine(type, value) {
  if (type === "ItemId") return '    <Parameter Type="ItemId">\n    </Parameter>';
  return `    <Parameter Type="${type}">${escXml(value ?? "")}</Parameter>`;
}

/** Serialize a {cutterType, params} object to a <Cutter> XML block (2-space indent). */
export function cutterToXml(cutterType, params) {
  const body = CUTTER_BODY[cutterType];
  if (!body) throw new Error(`unknown cutter type: ${cutterType}`);
  const order = [...CUTTER_HEADER, ...body];
  const lines = order.map((t) => paramLine(t, params[t]));
  return `  <Cutter Type="${cutterType}">\n${lines.join("\n")}\n  </Cutter>`;
}

/** Serialize a holder { type?, description?, itemNumber?, guid?, unitSystem?, segments[] }. */
export function holderToXml(holder, opts = {}) {
  const type = holder.type || "MillingHolder";
  const unitSystem = (opts.unitSystem || holder.unitSystem) === "Imperial" ? "Imperial" : "Metric";
  const L = (mm) => lenStr(mm, unitSystem);
  const segs = (holder.segments || []).map(
    (s) => `      <Segment Upper="${L(s.upper)}" Lower="${L(s.lower)}" Length="${L(s.length)}" />`
  );
  const header = [
    paramLine("ItemId"),
    paramLine("ItemNumber", String(holder.itemNumber ?? 1)),
    paramLine("Description", holder.description ?? "HOLDER"),
    paramLine("ItemGuid", holder.guid ?? (opts.guidFn || randomUUID)()),
    paramLine("ItemUnitSystem", unitSystem),
  ];
  const segBlock = `    <Parameter Type="HolderSegments">\n${segs.join("\n")}\n    </Parameter>`;
  return `  <Holder Type="${type}">\n${header.join("\n")}\n${segBlock}\n  </Holder>`;
}

/** Wrap cutter/holder XML blocks in the <Library Version="4"> root. */
export function buildLibraryXml(blocks) {
  return `<Library Version="${LIBRARY_VERSION}">\n${blocks.join("\n")}\n</Library>`;
}

/**
 * High-level: PRISM tool array → a complete .tmlib document.
 * opts: { unitSystem?, guidFn?, startNumber?, cutterType? }
 * Returns { xml, count, skipped, byType }. Unclassifiable/diameterless tools are
 * counted in `skipped` (never silently dropped — R12).
 */
export function toolsToLibraryXml(tools, opts = {}) {
  const unitSystem = opts.unitSystem === "Imperial" ? "Imperial" : "Metric";
  const guidFn = opts.guidFn || randomUUID;
  let n = opts.startNumber ?? 1;
  const blocks = [];
  let skipped = 0;
  const byType = {};
  for (const t of tools || []) {
    const c = toolToCutter(t, { unitSystem, itemNumber: n, guidFn, cutterType: opts.cutterType });
    if (!c) {
      skipped++;
      continue;
    }
    blocks.push(cutterToXml(c.cutterType, c.params));
    byType[c.cutterType] = (byType[c.cutterType] || 0) + 1;
    n++;
  }
  return { xml: buildLibraryXml(blocks), count: blocks.length, skipped, byType };
}

// ── parsing (round-trip + validation against real .tmlib bytes) ───────────────
function readParams(body) {
  const params = {};
  for (const m of body.matchAll(/<Parameter Type="([^"]+)">([\s\S]*?)<\/Parameter>/g)) {
    params[m[1]] = unescXml(m[2].trim());
  }
  return params;
}

/** Parse a .tmlib document → { version, cutters:[{type,params}], holders:[...] }. */
export function parseLibraryXml(xml) {
  const cutters = [];
  const holders = [];
  const version = (xml.match(/<Library Version="([^"]+)">/) || [])[1];

  for (const m of xml.matchAll(/<Cutter Type="([^"]+)">([\s\S]*?)<\/Cutter>/g)) {
    cutters.push({ type: m[1], params: readParams(m[2]) });
  }

  for (const m of xml.matchAll(/<Holder Type="([^"]+)">([\s\S]*?)<\/Holder>/g)) {
    const body = m[2];
    const segs = [];
    for (const sm of body.matchAll(/<Segment Upper="([^"]+)" Lower="([^"]+)" Length="([^"]+)"\s*\/>/g)) {
      segs.push({ upper: +sm[1], lower: +sm[2], length: +sm[3] });
    }
    holders.push({ type: m[1], params: readParams(body), segments: segs });
  }
  return { version, cutters, holders };
}

export default {
  MM_PER_INCH,
  THREAD_PITCH_FACTOR,
  LIBRARY_VERSION,
  CUTTER_HEADER,
  CUTTER_BODY,
  classifyCutterType,
  normalizeTool,
  toolToCutter,
  cutterToXml,
  holderToXml,
  buildLibraryXml,
  toolsToLibraryXml,
  parseLibraryXml,
};
