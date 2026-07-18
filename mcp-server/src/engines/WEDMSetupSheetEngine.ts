/**
 * WEDMSetupSheetEngine — Printable Setup Sheet for Wire EDM Jobs
 *
 * Takes a WEDMProgramResult and generates a complete, machinist-friendly
 * setup sheet containing everything the operator needs to run the job:
 *   - Material / thickness / wire spec
 *   - Machine setup (flush pressure, submerged mode, start holes)
 *   - Per-pass table: E-pack, H-offset, feed, Ra, recast
 *   - Cycle time breakdown
 *   - Wire consumption estimate
 *   - Consumables checklist
 *   - Safety notes
 *
 * Output: structured data object + printable HTML string.
 *
 * @module engines/WEDMSetupSheetEngine
 */

import type {
  WEDMProgramResult,
  PassSummary,
  SetupSheet,
  CycleTimeBreakdown,
  ConfidenceScore,
} from "./WEDMPrintToProgramEngine.js";
import { WEDM_KNOWLEDGE_TIPS } from "../data/wedm-knowledge-tips.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/** Complete setup sheet data — structured for programmatic use */
export interface WEDMSetupSheetData {
  /** Header info */
  header: {
    part_name: string;
    part_number: string;
    material: string;
    hardness_hrc: number;
    thickness_mm: number;
    wire_type: string;
    wire_diameter_mm: number;
    controller: string;
    program_number: number;
    date_generated: string;
  };

  /** Machine setup instructions */
  machine_setup: {
    flush_pressure_bar: number;
    submerged: boolean;
    num_profiles: number;
    num_passes: number;
    start_hole_diameter_mm: number;
    wire_threading: string;
    tank_level: string;
  };

  /** Per-pass parameter table */
  pass_table: PassTableRow[];

  /** Cycle time breakdown */
  cycle_time: {
    total_min: number;
    cutting_min: number;
    non_cutting_min: number;
    per_pass: Array<{ pass: number; type: string; time_min: number }>;
  };

  /** Wire and consumables */
  consumables: {
    wire_needed_m: number;
    wire_needed_kg: number;
    wire_spool_pct: number;
    deionized_water_liters: number;
    filter_check: boolean;
    guide_check: boolean;
  };

  /** Safety notes */
  safety_notes: string[];

  /** Confidence score summary */
  confidence: {
    overall: number;
    summary: string;
  };

  /** Warnings from generation */
  warnings: string[];
}

/** Per-pass table row for the setup sheet */
export interface PassTableRow {
  pass_number: number;
  pass_type: string;
  e_pack_code: string;
  offset_mm: number;
  feed_mm_min: number;
  wire_speed_m_min: number;
  tension_N: number;
  predicted_ra_um: number;
  predicted_recast_um: number;
}

/** Result from generateSetupSheet */
export interface SetupSheetResult {
  success: boolean;
  data: WEDMSetupSheetData;
  html: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Brass wire density: ~8.5 g/cm³, for 0.25mm wire ≈ 0.42 g/m */
const WIRE_DENSITY_KG_PER_M: Record<number, number> = {
  0.20: 0.000267,
  0.25: 0.000417,
  0.30: 0.000601,
};

/** Standard spool sizes in meters */
const SPOOL_SIZE_M = 8000;

/** Tank water volume estimate per thickness band */
const WATER_LITERS_ESTIMATE = 200;

/** Standard safety notes for every WEDM job */
const STANDARD_SAFETY_NOTES: string[] = [
  "Verify tank interlock switches are functional before starting",
  "Maintain water level above workpiece at all times during cutting",
  "Do not reach into tank while machine is energized",
  "Ensure fire suppression system is armed and inspected",
  "Check dielectric water resistivity before finish cuts (target: 5-15 MΩ·cm)",
  "Empty used wire bucket before it overflows — recycle as scrap brass",
];

/** PPE checklist — always included */
const PPE_CHECKLIST: string[] = [
  "PPE: Safety glasses required when handling wire or opening tank",
  "PPE: Cut-resistant gloves when threading wire or removing slugs",
  "PPE: Non-slip footwear — floor may be wet from dielectric spray",
  "PPE: Avoid loose clothing/jewelry near moving wire",
];

/** Select relevant tribal knowledge tips based on job parameters */
function selectTipsForJob(
  thickness_mm: number,
  material: string,
  hasTaper: boolean,
  numPasses: number,
): string[] {
  const tips: string[] = [];
  const mat = material.toLowerCase();

  for (const tip of WEDM_KNOWLEDGE_TIPS) {
    const tags = tip.tags as readonly string[];
    if (!tags.includes("wire-edm")) continue;

    // Thick section tips
    if (thickness_mm > 50 && tags.includes("thick") || tip.id === "wedm-kb-004") {
      if (thickness_mm > 80) tips.push(`TIP: ${tip.title}`);
      continue;
    }
    // Corner tips for complex profiles
    if (tags.includes("corner") && numPasses >= 4) {
      tips.push(`TIP: ${tip.title}`);
      continue;
    }
    // Taper tips
    if (hasTaper && (tags.includes("taper") || tags.includes("uv"))) {
      tips.push(`TIP: ${tip.title}`);
      continue;
    }
    // Carbide tips
    if ((mat.includes("carbide") || mat.includes("wc")) && tags.includes("carbide")) {
      tips.push(`TIP: ${tip.title}`);
      continue;
    }
    // Wire break recovery (always useful)
    if (tip.id === "wedm-kb-003" || tip.id === "wedm-kb-001") {
      tips.push(`TIP: ${tip.title}`);
    }
  }

  // Deduplicate and cap at 5 tips
  return [...new Set(tips)].slice(0, 5);
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Generate a complete setup sheet from a WEDMProgramResult.
 *
 * @param result - The output from WEDMPrintToProgramEngine.generate()
 * @param hardness_hrc - Workpiece hardness (optional, defaults to 60)
 * @returns SetupSheetResult with structured data and printable HTML
 */
export function generateSetupSheet(
  result: WEDMProgramResult,
  hardness_hrc = 60,
): SetupSheetResult {
  if (!result.success) {
    return {
      success: false,
      data: emptySetupSheetData(),
      html: "<p>Program generation failed — no setup sheet available.</p>",
    };
  }

  const sheet = result.setup_sheet;
  const passes = result.pass_details;
  const cycleTime = result.cycle_time_breakdown;
  const confidence = result.confidence_score;

  // These subsystem outputs are all optional on WEDMGenerateResult (a true
  // `success` flag does not narrow them); if any is missing the sheet cannot be
  // assembled honestly, so fall back to the same empty result the !success path uses.
  if (!sheet || !passes || !cycleTime || !confidence) {
    return {
      success: false,
      data: emptySetupSheetData(),
      html: "<p>Incomplete generation result -- setup sheet unavailable.</p>",
    };
  }

  // Fields the sheet needs that are NOT on SetupSheet are sourced from their real
  // location on the result, derived from real component fields, or fall back to the
  // file's empty-sentinel convention (0/""/false) when the generator does not emit
  // them -- never fabricated.
  const controller = result.controller ?? "";
  const numProfiles = result.profiles_cut ?? 1;
  const numPasses = result.passes_per_profile ?? passes.length;
  const programNumber = 0; // O-number is assigned by the operator at the machine, not the generator
  const submerged = false; // submerged-cut flag is not emitted by the generator; default to spray flushing
  const partName = sheet.part_name ?? "";
  const partNumber = sheet.part_number ?? "";
  const material = sheet.material ?? "";
  const thicknessMm = sheet.thickness_mm ?? 0;

  // ── Build pass table ────────────────────────────────────────────────
  const passTable: PassTableRow[] = passes.map((p: any) => ({
    pass_number: p.pass_number,
    pass_type: p.type,
    e_pack_code: p.e_pack_code || "—",
    offset_mm: round4(p.offset_mm),
    feed_mm_min: round2(p.feed_mm_min),
    wire_speed_m_min: round1(p.wire_speed_m_min),
    tension_N: round1(p.tension_N),
    predicted_ra_um: round2(p.predicted_ra_um),
    predicted_recast_um: round2(p.predicted_recast_um),
  }));

  // ── Cycle time breakdown ────────────────────────────────────────────
  // CycleTimeBreakdown emits component times (rough/skim/thread/setup), not a single
  // cutting_time_min nor a per-pass array. Active cutting time = rough + skim passes.
  const cuttingMin = cycleTime.rough_cut_min + cycleTime.skim_passes_min;
  const nonCuttingMin = cycleTime.total_time_min - cuttingMin;
  // Per-pass durations are not emitted (PassDetail carries parameters, not times);
  // leave empty rather than fabricate per-pass timings.
  const perPass: Array<{ pass: number; type: string; time_min: number }> = [];

  // ── Wire / consumables ──────────────────────────────────────────────
  const wireDia = sheet.wire_diameter_mm;
  // wire_consumption_m is not emitted by the generator (it depends on the machine
  // wire-feed rate, a machine constant absent from the result); 0 = "not computed".
  const wireM = 0;
  const densityKgM = WIRE_DENSITY_KG_PER_M[wireDia] ?? WIRE_DENSITY_KG_PER_M[0.25]!;
  const wireKg = round2(wireM * densityKgM);
  const spoolPct = round1((wireM / SPOOL_SIZE_M) * 100);

  // ── Safety notes + PPE + Tribal Knowledge Tips ──────────────────────
  const safetyNotes = [...PPE_CHECKLIST, ...STANDARD_SAFETY_NOTES];
  if (thicknessMm > 100) {
    safetyNotes.push(`Thick section (${thicknessMm}mm): verify flush nozzle alignment and increase pressure to ${sheet.flush_pressure_bar} bar`);
  }
  if (sheet.flush_pressure_bar >= 8) {
    safetyNotes.push("High flush pressure in use — secure workpiece clamping before starting");
  }
  if (material.toLowerCase().includes("carbide")) {
    safetyNotes.push("CARBIDE: Use coated wire (zinc or moly) — brass wire may break frequently on carbide");
  }
  if (hardness_hrc >= 62) {
    safetyNotes.push(`High hardness (${hardness_hrc} HRC): expect slower cutting speeds and monitor for wire breaks`);
  }
  // Surface tribal knowledge tips for operator reference
  const hasTaper = result.pass_details?.some?.((p: any) => p.type === "taper") ?? false;
  const tips = selectTipsForJob(thicknessMm, material, hasTaper, numPasses);
  safetyNotes.push(...tips);

  // ── Assemble data ───────────────────────────────────────────────────
  const data: WEDMSetupSheetData = {
    header: {
      part_name: partName,
      part_number: partNumber,
      material,
      hardness_hrc,
      thickness_mm: thicknessMm,
      wire_type: sheet.wire_type,
      wire_diameter_mm: wireDia,
      controller,
      program_number: programNumber,
      date_generated: new Date().toISOString().slice(0, 10),
    },
    machine_setup: {
      flush_pressure_bar: sheet.flush_pressure_bar,
      submerged,
      num_profiles: numProfiles,
      num_passes: numPasses,
      start_hole_diameter_mm: round2(wireDia + 0.5),
      wire_threading: "Automatic (AWT) — verify wire path before starting",
      tank_level: submerged
        ? `Fill to ${round0(thicknessMm + 25)}mm above table`
        : "Spray flushing - tank empty",
    },
    pass_table: passTable,
    cycle_time: {
      total_min: round2(cycleTime.total_time_min),
      cutting_min: round2(cuttingMin),
      non_cutting_min: round2(nonCuttingMin),
      per_pass: perPass,
    },
    consumables: {
      wire_needed_m: round1(wireM),
      wire_needed_kg: wireKg,
      wire_spool_pct: spoolPct,
      deionized_water_liters: WATER_LITERS_ESTIMATE,
      filter_check: true,
      guide_check: true,
    },
    safety_notes: safetyNotes,
    confidence: {
      overall: confidence.overall,
      summary: `Overall ${confidence.overall}% confidence (parameters ${confidence.parameter_confidence}%, material match ${confidence.material_match_confidence}%, geometry ${confidence.geometry_confidence}%).`,
    },
    warnings: result.warnings,
  };

  // ── Generate HTML ───────────────────────────────────────────────────
  const html = renderHTML(data);

  return { success: true, data, html };
}

// ============================================================================
// HTML RENDERER
// ============================================================================

function renderHTML(data: WEDMSetupSheetData): string {
  const h = data.header;
  const ms = data.machine_setup;
  const ct = data.cycle_time;
  const cons = data.consumables;

  const passRows = data.pass_table
    .map(
      p =>
        `<tr>
      <td>${p.pass_number}</td>
      <td>${p.pass_type}</td>
      <td>${p.e_pack_code}</td>
      <td>${p.offset_mm}</td>
      <td>${p.feed_mm_min}</td>
      <td>${p.wire_speed_m_min}</td>
      <td>${p.tension_N}</td>
      <td>${p.predicted_ra_um}</td>
      <td>${p.predicted_recast_um}</td>
    </tr>`,
    )
    .join("\n");

  const cycleRows = ct.per_pass
    .map(p => `<tr><td>${p.pass}</td><td>${p.type}</td><td>${p.time_min}</td></tr>`)
    .join("\n");

  const warningItems = data.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join("\n");
  const safetyItems = data.safety_notes.map(n => `<li>${escapeHtml(n)}</li>`).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>WEDM Setup Sheet — ${escapeHtml(h.part_name)}</title>
<style>
  @media print { body { font-size: 10pt; } }
  body { font-family: Arial, Helvetica, sans-serif; max-width: 800px; margin: 0 auto; padding: 16px; color: #222; }
  h1 { font-size: 18pt; margin-bottom: 4px; }
  h2 { font-size: 13pt; margin-top: 16px; border-bottom: 1px solid #999; padding-bottom: 2px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  th, td { border: 1px solid #666; padding: 4px 6px; text-align: left; font-size: 9pt; }
  th { background: #e8e8e8; font-weight: bold; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 10pt; }
  .info-grid dt { font-weight: bold; }
  .info-grid dd { margin: 0; }
  .confidence { font-size: 14pt; font-weight: bold; }
  .warn { color: #b45309; }
  .safety { color: #dc2626; font-weight: bold; }
  ul { margin: 4px 0; padding-left: 20px; }
  li { margin-bottom: 2px; font-size: 9pt; }
</style>
</head>
<body>
<h1>Wire EDM Setup Sheet</h1>
<p style="font-size:10pt;color:#666;">Generated: ${h.date_generated} | Program: O${h.program_number} | Confidence: <span class="confidence">${data.confidence.overall}%</span></p>

<h2>Part Information</h2>
<dl class="info-grid">
  <dt>Part Name</dt><dd>${escapeHtml(h.part_name)}</dd>
  <dt>Part Number</dt><dd>${escapeHtml(h.part_number)}</dd>
  <dt>Material</dt><dd>${escapeHtml(h.material)} (${h.hardness_hrc} HRC)</dd>
  <dt>Thickness</dt><dd>${h.thickness_mm} mm</dd>
  <dt>Wire</dt><dd>${escapeHtml(h.wire_type)} &oslash;${h.wire_diameter_mm} mm</dd>
  <dt>Controller</dt><dd>${escapeHtml(h.controller)}</dd>
</dl>

<h2>Machine Setup</h2>
<dl class="info-grid">
  <dt>Flush Pressure</dt><dd>${ms.flush_pressure_bar} bar</dd>
  <dt>Mode</dt><dd>${ms.submerged ? "Submerged" : "Spray Flushing"}</dd>
  <dt>Profiles</dt><dd>${ms.num_profiles}</dd>
  <dt>Total Passes</dt><dd>${ms.num_passes}</dd>
  <dt>Start Hole</dt><dd>&oslash;${ms.start_hole_diameter_mm} mm</dd>
  <dt>Threading</dt><dd>${escapeHtml(ms.wire_threading)}</dd>
  <dt>Tank Level</dt><dd>${escapeHtml(ms.tank_level)}</dd>
</dl>

<h2>Per-Pass Parameters</h2>
<table>
  <thead>
    <tr>
      <th>Pass</th><th>Type</th><th>E-Pack</th><th>Offset (mm)</th>
      <th>Feed (mm/min)</th><th>Wire Speed (m/min)</th><th>Tension (N)</th>
      <th>Ra (&mu;m)</th><th>Recast (&mu;m)</th>
    </tr>
  </thead>
  <tbody>
    ${passRows}
  </tbody>
</table>

<h2>Cycle Time</h2>
<dl class="info-grid">
  <dt>Total</dt><dd>${ct.total_min} min (${(ct.total_min / 60).toFixed(1)} hrs)</dd>
  <dt>Cutting</dt><dd>${ct.cutting_min} min</dd>
  <dt>Non-Cutting</dt><dd>${ct.non_cutting_min} min (threading, rapid, dwell)</dd>
</dl>
<table>
  <thead><tr><th>Pass</th><th>Type</th><th>Cutting Time (min)</th></tr></thead>
  <tbody>${cycleRows}</tbody>
</table>

<h2>Consumables</h2>
<dl class="info-grid">
  <dt>Wire Needed</dt><dd>${cons.wire_needed_m} m (${cons.wire_needed_kg} kg)</dd>
  <dt>Spool Usage</dt><dd>${cons.wire_spool_pct}% of standard ${SPOOL_SIZE_M}m spool</dd>
  <dt>DI Water</dt><dd>~${cons.deionized_water_liters} L in tank</dd>
  <dt>Filter Check</dt><dd>${cons.filter_check ? "CHECK before start" : "OK"}</dd>
  <dt>Guide Check</dt><dd>${cons.guide_check ? "CHECK before start" : "OK"}</dd>
</dl>

${data.warnings.length > 0 ? `<h2 class="warn">Warnings</h2><ul>${warningItems}</ul>` : ""}

<h2 class="safety">Safety Notes</h2>
<ul>${safetyItems}</ul>

<p style="font-size:8pt;color:#999;margin-top:24px;border-top:1px solid #ddd;padding-top:4px;">
  PRISM Wire EDM — Physics-Optimized Program Generation. ${data.confidence.summary}
</p>
</body>
</html>`;
}

// ============================================================================
// HELPERS
// ============================================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function round0(n: number): number { return Math.round(n); }
function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

function emptySetupSheetData(): WEDMSetupSheetData {
  return {
    header: {
      part_name: "", part_number: "", material: "", hardness_hrc: 0,
      thickness_mm: 0, wire_type: "", wire_diameter_mm: 0,
      controller: "", program_number: 0, date_generated: "",
    },
    machine_setup: {
      flush_pressure_bar: 0, submerged: false, num_profiles: 0,
      num_passes: 0, start_hole_diameter_mm: 0,
      wire_threading: "", tank_level: "",
    },
    pass_table: [],
    cycle_time: { total_min: 0, cutting_min: 0, non_cutting_min: 0, per_pass: [] },
    consumables: {
      wire_needed_m: 0, wire_needed_kg: 0, wire_spool_pct: 0,
      deionized_water_liters: 0, filter_check: false, guide_check: false,
    },
    safety_notes: [],
    confidence: { overall: 0, summary: "" },
    warnings: [],
  };
}
