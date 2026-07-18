#!/usr/bin/env node
/**
 * extract-wedm-program-ground-truth.mjs
 * ======================================
 *
 * Ground-truth extractor for JM Die WIRE EDM Mitsubishi W31MV-2 .NC programs
 * (3 real programs at H:/PRISM/JM DIE/WIRE EDM/).
 *
 * MIKE /goal pivot (2026-05-24): operator handed lathe work to WHISKEY and
 * pivoted mike to wire EDM. This is the WEDM-domain analog of the lathe
 * ground-truth extractor [[mike-lathe-ground-truth-2026-05-24]] — feeds
 * charlie (wire EDM domain owner per JULIETT-12CHAT) the empirical corpus
 * the 103 existing WEDM engines (per WEDM_DIGEST.md) need to calibrate
 * against.
 *
 * Mitsubishi W31MV-2 dialect specifics:
 *   - H-registers (H1..H175): wire-offset register set (one per cutting pass)
 *   - E-codes (4-digit): energy/spark parameter selection (E2821, E2822, ...)
 *   - M-code wire-EDM macros: M20=thread wire, M78=fill tank, M80=water on,
 *     M82=wire on, M84=power on, M90/M91=adaptive control on/off
 *   - UV coords on G1 lines: taper-angle 4-axis (wire + workpiece + taper)
 *   - PASS=N labels in comments mark each cutting pass (typical 1..4:
 *     rough -> trim -> finish -> skim)
 *   - G92 X0 Y0: work zero
 *   - G42/G41: wire-offset compensation (right/left)
 *
 * Pure read-only static parsing. node:fs only.
 *
 * @milestone MIKE-WEDM-CAPABILITY-MS0
 * @unit      U-MIKE-WEDM-GROUND-TRUTH-EXTRACT
 * @slot      mike
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

const THREE_ORIGINALS = [
  {
    program: "ITW SHAKEPROOF 500-30540-24000-04",
    path: "H:/PRISM/JM DIE/WIRE EDM/ITW SHAKEPROOF 500-30540-24000-04.NC",
  },
  {
    program: "NOZE TEST",
    path: "H:/PRISM/JM DIE/WIRE EDM/NOZE TEST.NC",
  },
  {
    program: "Wire Program - 5 inch square",
    path: "H:/PRISM/JM DIE/WIRE EDM/Wire Program - 5 inch square.NC",
  },
];

/** Parse program number (L###) — Mitsubishi label form. */
export function parseProgramLabel(text) {
  const m = text.match(/^\s*L(\d+)\s*$/m);
  return m ? `L${m[1]}` : null;
}

/** Parse date comment if present (e.g. "(05/24/22)"). */
export function parseDateComment(text) {
  const m = text.match(/^\s*\(\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*\)\s*$/m);
  return m ? m[1] : null;
}

/**
 * Parse H-register assignments — Mitsubishi wire-offset registers.
 *   "H175 = 0.0000"
 *   "H1 =0. + H175"
 * Returns object { H175: "0.0000", H1: "0. + H175", ... }.
 */
export function parseHRegisters(text) {
  const regs = {};
  for (const m of text.matchAll(/^\s*H(\d+)\s*=\s*([^\r\n]+?)\s*$/gm)) {
    regs[`H${m[1]}`] = m[2].trim();
  }
  return regs;
}

/**
 * Parse all E-code (energy) selections — Mitsubishi's E#### picks a
 * power/voltage/dwell row from the manufacturer's energy table.
 * Returns array of { code, h_register, feed_in_min, pass_label }.
 */
export function parseECodes(text) {
  const ecodes = [];
  for (const m of text.matchAll(/E(\d{4})\s+H(\d+)\s+F([\d.]+)(?:\s*\((PASS=\d+)\))?/g)) {
    ecodes.push({
      code: `E${m[1]}`,
      h_register: `H${m[2]}`,
      feed_in_min: Number(m[3]),
      pass_label: m[4] ?? null,
    });
  }
  return ecodes;
}

/**
 * Count cutting passes from the (PASS=N) comments + E-code sequence.
 * Returns max pass number seen.
 */
export function countPasses(text) {
  let max_pass = 0;
  for (const m of text.matchAll(/\(PASS=(\d+)\)/g)) {
    const n = Number(m[1]);
    if (n > max_pass) max_pass = n;
  }
  return max_pass;
}

/**
 * Detect Mitsubishi wire-EDM M-code macros.
 */
export function detectWireEDMMcodes(text) {
  const flags = {
    M20_thread_wire: /\bM20\b/.test(text),
    M22_cut_wire:    /\bM22\b/.test(text),
    M78_fill_tank:   /\bM78\b/.test(text),
    M79_drain_tank:  /\bM79\b/.test(text),
    M80_water_on:    /\bM80\b/.test(text),
    M81_water_off:   /\bM81\b/.test(text),
    M82_wire_on:     /\bM82\b/.test(text),
    M83_wire_off:    /\bM83\b/.test(text),
    M84_power_on:    /\bM84\b/.test(text),
    M85_power_off:   /\bM85\b/.test(text),
    M90_adaptive_on: /\bM90\b/.test(text),
    M91_adaptive_off:/\bM91\b/.test(text),
  };
  return flags;
}

/**
 * Detect wire-offset compensation usage (G41 left, G42 right).
 */
export function detectOffsetCompensation(text) {
  const used = [];
  if (/\bG41\b/.test(text)) used.push("G41_left");
  if (/\bG42\b/.test(text)) used.push("G42_right");
  if (/\bG40\b/.test(text)) used.push("G40_cancel");
  return used;
}

/**
 * Detect taper-cutting (presence of UV coordinates on G1 moves means 4-axis
 * wire EDM with taper angle).
 */
export function detectTaperCutting(text) {
  // U or V coord on the same line as X/Y/G1
  const taper_lines = (text.match(/G1[^\r\n]*\b[UV]-?\d/g) ?? []).length;
  return {
    has_taper_cutting: taper_lines > 0,
    taper_move_count: taper_lines,
  };
}

/**
 * Parse G92 work-zero set lines.
 */
export function parseWorkZeroSets(text) {
  const zeros = [];
  for (const m of text.matchAll(/G92\s+X(-?[\d.]+)\s+Y(-?[\d.]+)/g)) {
    zeros.push({ x: Number(m[1]), y: Number(m[2]) });
  }
  return zeros;
}

/**
 * Parse all G1 / G2 / G3 motion lines — count moves of each type.
 */
export function parseMotionStats(text) {
  const g1 = (text.match(/\bG1\b/g) ?? []).length;
  const g2 = (text.match(/\bG2\b/g) ?? []).length;
  const g3 = (text.match(/\bG3\b/g) ?? []).length;
  const g0 = (text.match(/\bG0\b/g) ?? []).length;
  return { rapid_g0: g0, linear_g1: g1, arc_cw_g2: g2, arc_ccw_g3: g3 };
}

/**
 * Detect dwell commands (G4) and capture dwell-time values.
 */
export function parseDwells(text) {
  const dwells = [];
  for (const m of text.matchAll(/G4\s+X([\d.]+)/g)) {
    dwells.push({ seconds: Number(m[1]) });
  }
  return dwells;
}

/** Extract the full ground-truth header for one WEDM program. */
export function extractWEDMGroundTruth(meta) {
  if (!existsSync(meta.path)) {
    return {
      source_file: meta.path,
      program: meta.program,
      original_name: basename(meta.path),
      _error: "file_not_found",
    };
  }
  const text = readFileSync(meta.path, "utf8");
  const ecodes = parseECodes(text);
  const passes = countPasses(text);
  const taper = detectTaperCutting(text);
  const motion = parseMotionStats(text);
  return {
    source_file: meta.path,
    program: meta.program,
    original_name: basename(meta.path),
    label: parseProgramLabel(text),
    date_comment: parseDateComment(text),
    h_registers: parseHRegisters(text),
    e_codes: ecodes,
    e_code_count: ecodes.length,
    pass_count: passes,
    distinct_e_codes: [...new Set(ecodes.map((e) => e.code))],
    wire_edm_mcodes: detectWireEDMMcodes(text),
    offset_compensation_used: detectOffsetCompensation(text),
    taper_cutting: taper,
    work_zero_sets: parseWorkZeroSets(text),
    motion_stats: motion,
    dwells: parseDwells(text),
    raw_byte_count: text.length,
    raw_line_count: text.split("\n").length,
  };
}

/** Build the full report for all 3 WEDM originals. */
export function buildWEDMGroundTruth({ originals = THREE_ORIGINALS, generatedAt = new Date().toISOString() } = {}) {
  const programs = originals.map((m) => extractWEDMGroundTruth(m));
  const total_ecodes = programs.reduce((s, p) => s + (p.e_code_count ?? 0), 0);
  const total_passes = programs.reduce((s, p) => s + (p.pass_count ?? 0), 0);
  const total_taper_moves = programs.reduce((s, p) => s + (p.taper_cutting?.taper_move_count ?? 0), 0);
  return {
    schemaVersion: "1.0.0",
    generatedAt,
    advisoryOnly: true,
    must_human_verify: true,
    purpose: "Empirical ground-truth from JM Die WEDM Mitsubishi W31MV-2 .NC programs - calibration corpus for the 103 existing WEDM engines (per WEDM_DIGEST)",
    domain_handoff_to: "charlie (wire EDM domain per JULIETT-12CHAT)",
    target_machine: "WEDM-01 Okuma...Mitsubishi FA10S (controller OSP...W31MV-2) per jm-die-profile.ts",
    summary: {
      program_count: programs.length,
      total_e_code_invocations: total_ecodes,
      total_cutting_passes: total_passes,
      total_taper_moves: total_taper_moves,
      programs_with_taper: programs.filter((p) => p.taper_cutting?.has_taper_cutting).length,
    },
    programs,
    notes: [
      "Mitsubishi W31MV-2 uses E#### 4-digit codes to select energy parameters from the manufacturer's spark table (NOT free-text). E2821 / E2822 etc are real codes the operator looked up.",
      "Each cutting pass has its own H-register (H1 for pass 1, H2 for pass 2, ...) — the H-register holds the wire-offset value (compensates for spark gap + wire radius).",
      "UV coords on G1 lines = 4-axis taper cutting (workpiece bottom XY + wire top UV).",
      "M-code sequence M78 -> M80 -> M82 -> M84 is the canonical wire-EDM-cut-start envelope (fill tank, water on, wire on, power on).",
      "Mike provides extraction infra; charlie (WEDM domain) cross-references against the 103 existing WEDM engines and identifies any calibration gaps.",
    ],
  };
}

// ============================================================================
// CLI
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes("--json");
  const outIdx = args.indexOf("--out");
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

  const report = buildWEDMGroundTruth();
  const json = JSON.stringify(report, null, 2);

  if (outPath) {
    writeFileSync(outPath, json);
    if (!jsonOnly) console.error(`Wrote ${outPath}`);
    return;
  }
  if (jsonOnly) {
    process.stdout.write(json);
    return;
  }

  console.log(`JM Die WEDM Program Ground Truth - ${report.generatedAt}`);
  console.log(`Programs: ${report.summary.program_count} | E-codes: ${report.summary.total_e_code_invocations} | Passes: ${report.summary.total_cutting_passes} | Taper progs: ${report.summary.programs_with_taper}`);
  console.log("");
  for (const p of report.programs) {
    if (p._error) {
      console.log(`  X ${p.program} | ${p.original_name} -> ERROR: ${p._error}`);
      continue;
    }
    console.log(`  - ${p.program} (${p.original_name})`);
    console.log(`      label=${p.label ?? "-"} | date=${p.date_comment ?? "-"} | passes=${p.pass_count} | e-codes=${p.e_code_count} (${p.distinct_e_codes.join(", ")})`);
    console.log(`      offset: ${p.offset_compensation_used.join(",") || "none"} | taper: ${p.taper_cutting.has_taper_cutting} (${p.taper_cutting.taper_move_count} taper moves)`);
    console.log(`      motion: G0=${p.motion_stats.rapid_g0} G1=${p.motion_stats.linear_g1} G2=${p.motion_stats.arc_cw_g2} G3=${p.motion_stats.arc_ccw_g3}`);
    const active_mc = Object.entries(p.wire_edm_mcodes).filter(([, v]) => v).map(([k]) => k.split("_")[0]);
    console.log(`      wire-edm m-codes: ${active_mc.join(",")}`);
  }
}

const __thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1].replace(/\\/g, "/") === __thisFile.replace(/\\/g, "/")) {
  main();
}
