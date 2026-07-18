/**
 * jm-tool-model.ts
 * [JM-FUSION-TOOLS-MS0]/U-JFT-TOOL-MODEL (slot:romeo)
 *
 * The SINGLE structured tool model + cutting-data source shared by the
 * hyperMILL (.sql) and Mastercam (.mcam-tools) generators — so the three CAM
 * formats (Fusion, hyperMILL, Mastercam) carry the SAME geometry, the SAME
 * material-compatibility gate, and the SAME physics-derived cutting data for
 * every JM Die crib tool. No drift between formats.
 *
 * Why this exists: the production `HyperMillToolExportEngine` (E1127) and
 * `MastercamToolExportEngine` (E1123) each `import { toolCatalogEngine }` at
 * module top, which eagerly loads the 25 MB catalog via `catalogLoader.ts`
 * (`__dirname` — crashes under tsx/ESM). And each engine computes cutting data
 * from its OWN hard-coded VC_BASE/FZ_BASE tables — NOT the canonical
 * `UltimateSpeedFeedEngine.lookupCuttingData()` that the Fusion generator uses.
 * This module sources cutting data from `lookupCuttingData` (Kienzle/Taylor
 * CUTTING_PARAMS) for ALL formats, and only imports the two catalog-free,
 * tsx-safe engines (UltimateSpeedFeedEngine + CoatingSelectionAdapter).
 *
 * UNITS: JM crib CSVs are inches. Geometry is parsed and normalized to mm here
 * (output tool DBs are metric, mm_system_id=1). Only SCALAR holder dims are
 * converted (gauge length / projection / OAL) — the raw 3D holder silhouette
 * (`holder_segments`) is carried VERBATIM in its native unit and never
 * arithmetic-converted (eliminates the 25.4× collision-scale-error class).
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ultimateSpeedFeedEngine } from "../../src/engines/UltimateSpeedFeedEngine.js";
import { coatingSelectionAdapter } from "../../src/engines/CoatingSelectionAdapter.js";

// ── Constants ────────────────────────────────────────────────────────────────
export const MM_PER_IN = 25.4;
export const MPM_TO_SFM = 3.28084;

export type IsoGroup = "P" | "M" | "K" | "N" | "S" | "H";
export type OpClass =
  | "milling"
  | "drilling"
  | "reaming"
  | "tapping"
  | "turning"
  | "thread_milling";

export const ALL_ISO: IsoGroup[] = ["P", "M", "K", "N", "S", "H"];

// Default JM crib source directories (first that exists wins).
export const DEFAULT_SRC_DIRS = [
  "H:/prism/resources/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY",
  "H:/prism/resources/FUSION360/tool-library",
];

// Exact Fusion CSV header tokens we read.
const H = {
  preset: "Preset Name (preset_name)",
  type: "Type (tool_type)",
  description: "Description (tool_description)",
  diameter: "Diameter (tool_diameter)",
  number: "Number (tool_number)",
  unit: "Unit (tool_unit)",
  holderDesc: "Holder Description (holder_description)",
  holderVendor: "Holder Vendor (holder_vendor)",
  holderProductId: "Holder Product ID (holder_productId)",
  cornerRadius: "Corner Radius (tool_cornerRadius)",
  fluteLength: "Flute Length (tool_fluteLength)",
  bodyLength: "Body Length (tool_bodyLength)",
  overallLength: "Overall Length (tool_overallLength)",
  shaftDiameter: "Shaft Diameter (tool_shaftDiameter)",
  shoulderLength: "Shoulder Length (tool_shoulderLength)",
  numberOfFlutes: "Number of Flutes (tool_numberOfFlutes)",
  material: "Material (tool_material)",
  comment: "Comment (tool_comment)",
  vendor: "Vendor (tool_vendor)",
  productId: "Product ID (tool_productId)",
  tipAngle: "Tip Angle (tool_tipAngle)",
  tipDiameter: "Tip Diameter (tool_tipDiameter)",
  threadPitch: "Thread Pitch (tool_threadPitch)",
  holderGaugeLength: "Tool Holder Gauge Length (tool_holderGaugeLength)",
  holderOverallLength: "Overall Length (tool_holderOverallLength)",
  assemblyGaugeLength: "Tool Assembly Gauge Length (tool_assemblyGaugeLength)",
  shaftSegments: "Shaft Segments (shaft_segments)",
  holderSegments: "Holder Segments (holder_segments)",
} as const;

// ── CSV parse (RFC-4180-ish; mirrors the Fusion generator) ───────────────────
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function num(v: string | undefined): number | null {
  if (v == null) return null;
  const n = parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function isHss(material: string): boolean {
  return /hss|high\s*speed\s*steel/i.test(material || "");
}

export function classifyOp(toolType: string): OpClass {
  const t = (toolType || "").toLowerCase();
  if (/thread.*mill/.test(t)) return "thread_milling";
  if (/\btap\b|tapping/.test(t)) return "tapping";
  if (/ream/.test(t)) return "reaming";
  if (/drill/.test(t)) return "drilling";
  if (/turn|boring|groov|part/.test(t)) return "turning";
  return "milling";
}

// ── Tool model ───────────────────────────────────────────────────────────────
export interface JmHolder {
  description: string;
  vendor: string;
  productId: string;
  /** Gauge length spindle-face → holder nose, mm */
  gaugeLength_mm: number | null;
  /** Holder overall length, mm */
  overallLength_mm: number | null;
  /** Tool stickout past the holder nose, mm (collision-critical projection) */
  projection_mm: number | null;
  /** Raw Fusion holder silhouette, VERBATIM native-unit string (collision; never converted) */
  segmentsRaw: string;
  /** Raw tool-shaft silhouette, VERBATIM native-unit string */
  shaftSegmentsRaw: string;
}

export interface JmTool {
  /** 1-based index within the parsed corpus */
  index: number;
  sourceFile: string;
  name: string;
  manufacturer: string;
  partNumber: string;
  description: string;
  comment: string;
  prismType: string;          // raw Fusion tool_type (for geometry-class mapping)
  opClass: OpClass;
  nativeUnit: "inches" | "mm";
  // Geometry — all normalized to mm.
  diameter_mm: number;
  cornerRadius_mm: number;
  fluteLength_mm: number;
  overallLength_mm: number;
  shankDiameter_mm: number;
  flutes: number;
  pointAngle_deg: number | null;
  tipDiameter_mm: number | null;
  threadPitch_mm: number | null;
  toolMaterial: "carbide" | "hss";
  coatingHint: string;
  holder: JmHolder;
  /** ISO groups this tool's coating+substrate is metallurgically compatible with */
  compatibleGroups: IsoGroup[];
}

export interface GroupCutting {
  iso: IsoGroup;
  opClass: OpClass;
  vc_mpm: number;
  sfm: number;
  fz_mm: number;          // per-tooth (milling) — for hole ops this is fnRev/flutes
  fnRev_mm: number;       // feed per revolution
  ap_mm: number;
  ae_mm: number;
  rpm: number | null;     // null for turning (CSS, workpiece-diameter driven)
  feed_mmpm: number | null;
  coolant: string;
  useCSS: boolean;
}

// Table coolant strategy → human label kept consistent across emitters.
const COOLANT_LABEL: Record<string, string> = {
  flood: "flood", mist: "mist", dry: "disabled",
  air_blast: "air", through_tool: "through tool",
};

/**
 * Build the per-(tool, ISO group) cutting data from the canonical
 * `UltimateSpeedFeedEngine.lookupCuttingData` (Kienzle/Taylor CUTTING_PARAMS).
 * Op-class aware: milling fz is per-tooth; drilling/reaming feed per-rev;
 * tapping feed is geometry-locked (pitch) so only Vc/RPM vary; turning uses
 * CSS (no fixed RPM). Returns null if no sane physics resolves (fail-loud — the
 * caller skips that group rather than emit a fabricated number).
 */
export function cuttingDataForGroup(tool: JmTool, iso: IsoGroup): GroupCutting | null {
  const op = tool.opClass;
  const lookupOp: OpClass = op === "turning" ? "turning" : op;
  const lk = ultimateSpeedFeedEngine.lookupCuttingData({
    iso_group: iso,
    operation: lookupOp,
    cut_type: "roughing",
    tool_diameter_mm: tool.diameter_mm,
    tool_material: tool.toolMaterial,
  });
  if (!lk || !(lk.vc > 0)) return null;

  const sfm = Math.round(lk.vc * MPM_TO_SFM);
  const coolant = COOLANT_LABEL[lk.coolant as string] ?? (lk.coolant as string) ?? "flood";
  const base: GroupCutting = {
    iso, opClass: op, vc_mpm: lk.vc, sfm,
    fz_mm: 0, fnRev_mm: 0, ap_mm: lk.ap > 0 ? lk.ap : 0, ae_mm: lk.ae > 0 ? lk.ae : 0,
    rpm: null, feed_mmpm: null, coolant, useCSS: false,
  };

  if (op === "turning") {
    // Surface speed is workpiece-diameter driven at the control (CSS).
    base.useCSS = true;
    base.fnRev_mm = lk.fz;           // table fz for turning ≈ feed/rev
    base.fz_mm = lk.fz;
    return base;
  }

  const d = tool.diameter_mm;
  if (!(d > 0)) return null;         // milling/hole ops need a real diameter for RPM
  const rpm = Math.round((lk.vc * 1000) / (Math.PI * d));
  if (!(rpm > 0)) return null;
  base.rpm = rpm;

  if (op === "tapping") {
    // Tap feed = thread pitch (geometry-locked); only Vc/RPM vary by material.
    base.fnRev_mm = tool.threadPitch_mm ?? lk.fz;
    base.fz_mm = base.fnRev_mm;
    base.feed_mmpm = Math.round(base.fnRev_mm * rpm);
    return base;
  }

  if (op === "drilling" || op === "reaming") {
    // CUTTING_PARAMS drilling fz is feed-PER-REV.
    const fnRev = lk.fz;
    base.fnRev_mm = fnRev;
    base.fz_mm = tool.flutes > 0 ? fnRev / tool.flutes : fnRev;
    base.feed_mmpm = Math.round(fnRev * rpm);
    return base;
  }

  // milling / thread_milling: fz is per-tooth.
  const fz = lk.fz;
  base.fz_mm = fz;
  base.fnRev_mm = fz * (tool.flutes > 0 ? tool.flutes : 1);
  base.feed_mmpm = Math.round(base.fnRev_mm * rpm);
  return base;
}

// ── Parse ────────────────────────────────────────────────────────────────────
export interface ParseOpts {
  /** In-memory CSV sources (for hermetic tests). Bypasses the filesystem. */
  csvTexts?: Array<{ name: string; text: string }>;
  /** Source directories to scan (default: DEFAULT_SRC_DIRS). */
  srcDirs?: string[];
}

function toMm(v: number | null, unit: "inches" | "mm"): number | null {
  if (v == null) return null;
  return unit === "mm" ? v : v * MM_PER_IN;
}

/** Parse the JM crib CSV corpus into structured, mm-normalized tool models. */
export function parseJmCribTools(opts: ParseOpts = {}): JmTool[] {
  const sources: Array<{ name: string; text: string }> = [];
  if (opts.csvTexts && opts.csvTexts.length > 0) {
    sources.push(...opts.csvTexts);
  } else {
    const dirs = opts.srcDirs ?? DEFAULT_SRC_DIRS;
    const dir = dirs.find((d) => existsSync(d));
    if (!dir) throw new Error(`JM crib source dir not found. Tried:\n  ${dirs.join("\n  ")}`);
    for (const f of readdirSync(dir).filter((x) => x.toLowerCase().endsWith(".csv"))) {
      sources.push({ name: f, text: readFileSync(join(dir, f), "utf-8") });
    }
    if (sources.length === 0) throw new Error(`No .csv files in ${dir}`);
  }

  const tools: JmTool[] = [];
  let globalIdx = 0;

  for (const src of sources) {
    const lines = src.text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) continue;
    const headers = parseCsvLine(lines[0]);
    const idx = new Map<string, number>();
    headers.forEach((h, i) => idx.set(h, i));
    const get = (fields: string[], name: string): string => {
      const i = idx.get(name) ?? -1;
      return i >= 0 && i < fields.length ? fields[i] : "";
    };

    for (let li = 1; li < lines.length; li++) {
      const f = parseCsvLine(lines[li]);
      if (f.length < 5) continue;
      globalIdx++;

      const prismType = get(f, H.type) || "endmill";
      const opClass = classifyOp(prismType);
      const nativeUnit: "inches" | "mm" = get(f, H.unit).trim().toLowerCase() === "mm" ? "mm" : "inches";
      const material = get(f, H.material);
      const description = get(f, H.description);
      const toolMaterial: "carbide" | "hss" = isHss(material) ? "hss" : "carbide";

      const dMm = toMm(num(get(f, H.diameter)), nativeUnit) ?? 0;
      const flutes = num(get(f, H.numberOfFlutes)) ?? (opClass === "drilling" ? 2 : opClass === "milling" || opClass === "thread_milling" ? 4 : 1);
      const fluteLen = toMm(num(get(f, H.fluteLength)), nativeUnit) ?? (dMm > 0 ? dMm * 3 : 0);
      const oal = toMm(num(get(f, H.overallLength)), nativeUnit) ?? (dMm > 0 ? dMm * 6 : 0);
      const shankD = toMm(num(get(f, H.shaftDiameter)), nativeUnit) ?? (dMm > 0 ? dMm : 0);
      const cornerR = toMm(num(get(f, H.cornerRadius)), nativeUnit) ?? 0;
      const tipDia = toMm(num(get(f, H.tipDiameter)), nativeUnit);
      const threadPitch = toMm(num(get(f, H.threadPitch)), nativeUnit);
      const pointAngle = num(get(f, H.tipAngle)) ?? (opClass === "drilling" ? (toolMaterial === "hss" ? 118 : 140) : null);

      // Holder scalars (collision-relevant), converted in→mm. Raw silhouette
      // strings kept VERBATIM (native unit; never arithmetic-converted).
      const holderGauge = toMm(num(get(f, H.holderGaugeLength)), nativeUnit);
      const holderOal = toMm(num(get(f, H.holderOverallLength)), nativeUnit);
      const asmGauge = toMm(num(get(f, H.assemblyGaugeLength)), nativeUnit);
      let projection: number | null = null;
      if (asmGauge != null && holderGauge != null && asmGauge > holderGauge) projection = asmGauge - holderGauge;
      else if (oal > 0 && holderGauge != null && holderGauge < oal) projection = oal; // tool stickout fallback ≈ OAL
      const holder: JmHolder = {
        description: get(f, H.holderDesc),
        vendor: get(f, H.holderVendor),
        productId: get(f, H.holderProductId),
        gaugeLength_mm: holderGauge,
        overallLength_mm: holderOal,
        projection_mm: projection != null ? Math.round(projection * 1000) / 1000 : null,
        segmentsRaw: get(f, H.holderSegments),
        shaftSegmentsRaw: get(f, H.shaftSegments),
      };

      const mfr = get(f, H.vendor) || holder.vendor || "JM Die";
      const pn = get(f, H.productId) || get(f, H.number) || "";
      const comment = get(f, H.comment);

      // Material-domain gate — IDENTICAL derivation to the committed Fusion
      // generator so all three formats gate every tool to the same ISO groups.
      let coatingHint = material;
      const descLc = description.toLowerCase();
      if (/alum|non[- ]?ferrous|brass|copper|graphite|plastic/.test(descLc) &&
          !/steel|stainless|inconel|titanium|hardened|tool steel/.test(descLc)) {
        coatingHint = "uncoated for aluminum";
      }
      const compatibleGroups = coatingSelectionAdapter.compatibleIsoGroups(coatingHint, toolMaterial) as IsoGroup[];

      tools.push({
        index: globalIdx,
        sourceFile: src.name,
        name: (pn ? `${mfr} ${pn}` : description || `${prismType} ${dMm.toFixed(2)}mm`).slice(0, 127),
        manufacturer: mfr,
        partNumber: pn,
        description,
        comment,
        prismType,
        opClass,
        nativeUnit,
        diameter_mm: Math.round(dMm * 1000) / 1000,
        cornerRadius_mm: Math.round(cornerR * 1000) / 1000,
        fluteLength_mm: Math.round(fluteLen * 1000) / 1000,
        overallLength_mm: Math.round(oal * 1000) / 1000,
        shankDiameter_mm: Math.round(shankD * 1000) / 1000,
        flutes,
        pointAngle_deg: pointAngle,
        tipDiameter_mm: tipDia != null ? Math.round(tipDia * 1000) / 1000 : null,
        threadPitch_mm: threadPitch != null ? Math.round(threadPitch * 1000) / 1000 : null,
        toolMaterial,
        coatingHint,
        holder,
        compatibleGroups,
      });
    }
  }
  return tools;
}
