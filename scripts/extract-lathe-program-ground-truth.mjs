#!/usr/bin/env node
/**
 * extract-lathe-program-ground-truth.mjs
 * =======================================
 *
 * Ground-truth header extractor for the 4 JM Die "FULL-PROGRAM-*" Mastercam
 * .MIN originals (ADDISON / AFI / CSM / OPTIMAS).
 *
 * MIKE /goal session (2026-05-24) — provides the empirical data substrate
 * echo (.cps post-edit owner) consumes when validating that re-posted .nc
 * files for the 7 Okuma fleet machines actually match the original Mastercam
 * intent (tool numbering, spindle range, work envelope, feed mode).
 *
 * Pure read-only static parsing. node:fs only. No child_process anywhere.
 *
 * Output JSON schema per program:
 *   {
 *     source_file, customer, part_folder, original_name,
 *     o_number, spindle_max_rpm_cap, bar_stock_envelope,
 *     tool_list_explicit[], tool_calls_in_body[], operations[],
 *     feed_mode, work_planes, spindle_range_mcodes,
 *     live_tool_used, has_c_axis_index, canned_cycles_used[]
 *   }
 *
 * @milestone MIKE-LATHE-CAPABILITY-MS0
 * @unit      U-MIKE-LATHE-GROUND-TRUTH-EXTRACT
 * @slot      mike
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

const FOUR_ORIGINALS = [
  {
    customer: "ADDISON FASTENERS",
    part_folder: ".25 NAT'L PUNCH CASE 730",
    path: "H:/PRISM/JM DIE/CNC LATHE/ADDISON FASTENERS/.25 NAT'L PUNCH CASE 730/OP1-FULL-PROGRAM-MACHINE4.MIN",
  },
  {
    customer: "AFI INDUSTRIES INC",
    part_folder: "DC-SP21-.619",
    path: "H:/PRISM/JM DIE/CNC LATHE/AFI INDUSTRIES INC/DC-SP21-.619/FULL-PROGRAM-MACHINE5.MIN",
  },
  {
    customer: "CSM",
    part_folder: ".1875 HI-PRO PUNCH CASE WITH PIN HOLE .563ID",
    path: "H:/PRISM/JM DIE/CNC LATHE/CSM/.1875 HI-PRO PUNCH CASE WITH PIN HOLE .563ID/FULL-PROGRAM-5.MIN",
  },
  {
    customer: "OPTIMAS",
    part_folder: "T-MHP-R-8MM-S-98Q",
    path: "H:/PRISM/JM DIE/CNC LATHE/OPTIMAS/T-MHP-R-8MM-S-98Q/FULL-PROGRAM-4-MARK.MIN",
  },
];

// Filter threshold for op-label parser: shop convention is short uppercase
// op labels (e.g. "FACE2", "PROFILE ROUGHING4"). Anything longer is a
// tool-comment block leak, not an operation header.
const OP_LABEL_MAX_LEN = 40;

/** Parse the O-number line if present (e.g. "O1001"). */
export function parseONumber(text) {
  const m = text.match(/^\s*O(\d+)\s*$/m);
  return m ? `O${m[1]}` : null;
}

/** Parse `G50 S####` — Mastercam emits one per tool change; first is the program-wide ceiling. */
export function parseSpindleMaxCap(text) {
  const m = text.match(/G50\s+S(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Parse Mastercam's `PS LC,[Zmin,Xmin],[Zmax,Xmax]` bar stock envelope.
 */
export function parseBarStockEnvelope(text) {
  const m = text.match(/PS\s+LC\s*,\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]\s*,\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/);
  if (!m) return null;
  return {
    z_min: Number(m[1]),
    x_min: Number(m[2]),
    z_max: Number(m[3]),
    x_max: Number(m[4]),
  };
}

/**
 * Parse the explicit tool-list comment block (CSM format):
 *   (T010101 NR=0.0156 - ZMIN=0.01 - GENERAL TURNING)
 */
export function parseExplicitToolListBlock(text) {
  const tools = [];
  for (const m of text.matchAll(/\(T(\d+)\s+([^)]+)\)/g)) {
    const code = `T${m[1]}`;
    const body = m[2];
    if (!/(NR=|D=|ZMIN=)/i.test(body)) continue; // skip op labels like "(FACE2)"
    const nr = body.match(/NR=([\d.]+)/i);
    const d = body.match(/\bD=([\d.]+)/i);
    const cr = body.match(/\bCR=([\d.]+)/i);
    const taper = body.match(/TAPER=([\d.]+)\s*DEG/i);
    const zmin = body.match(/ZMIN=(-?[\d.]+)/i);
    const desc = body.split("-").pop()?.trim() || null;
    tools.push({
      code,
      nose_radius_in: nr ? Number(nr[1]) : null,
      diameter_in: d ? Number(d[1]) : null,
      corner_radius_in: cr ? Number(cr[1]) : null,
      taper_deg: taper ? Number(taper[1]) : null,
      z_min: zmin ? Number(zmin[1]) : null,
      description: desc,
    });
  }
  return tools;
}

/** Discover all T calls actually invoked in the program body (Mastercam + OPTIMAS named-tool). */
export function parseTCallsInBody(text) {
  const seen = new Set();
  const ordered = [];
  for (const m of text.matchAll(/(?:^|\s)T(\d{4,6})(?=\s|$)/gm)) {
    const code = `T${m[1]}`;
    if (!seen.has(code)) { seen.add(code); ordered.push(code); }
  }
  for (const m of text.matchAll(/\bNAT(\d{2})\b/g)) {
    const code = `NAT${m[1]}`;
    if (!seen.has(code)) { seen.add(code); ordered.push(code); }
  }
  return ordered;
}

/** Discover operation labels (e.g. "FACE2", "PROFILE ROUGHING4", "DRILL1"). */
export function parseOperationLabels(text) {
  const ops = [];
  for (const m of text.matchAll(/\(([A-Z][A-Z\d\s]+)\)/g)) {
    const label = m[1].trim();
    if (label.length > OP_LABEL_MAX_LEN) continue;
    if (label.includes("=")) continue;
    if (/^T\d/.test(label)) continue;
    ops.push(label);
  }
  return ops;
}

/** Detect feed mode (G94 in/min, G95 in/rev). */
export function detectFeedMode(text) {
  const hasG95 = /\bG95\b/.test(text);
  const hasG94 = /\bG94\b/.test(text);
  if (hasG95 && hasG94) return "G95+G94 (mixed turning + drilling)";
  if (hasG95) return "G95";
  if (hasG94) return "G94";
  return "unknown";
}

/** Work-plane (G18=XZ turning, G17=XY milling, G19=YZ). */
export function detectWorkPlanes(text) {
  const planes = [];
  if (/\bG18\b/.test(text)) planes.push("G18_XZ_turning");
  if (/\bG17\b/.test(text)) planes.push("G17_XY_milling");
  if (/\bG19\b/.test(text)) planes.push("G19_YZ");
  return planes;
}

/** Spindle-range M-codes (M41=low, M42=high on Okuma). */
export function detectSpindleRange(text) {
  const ranges = [];
  if (/\bM41\b/.test(text)) ranges.push("M41_low_range");
  if (/\bM42\b/.test(text)) ranges.push("M42_high_range");
  return ranges;
}

/** Live-tool / C-axis detection. */
export function detectLiveToolAndCAxis(text) {
  const live_tool_used = /\bM(13|15|110|147)\b/.test(text) || /\bSB=/.test(text);
  const has_c_axis_index = /\bG0\s+C\d+\./i.test(text) || /\bG138\b/.test(text);
  return { live_tool_used, has_c_axis_index };
}

/** Canned-cycle usage. */
export function detectCannedCycles(text) {
  const cycles = [];
  const map = {
    G70: "finishing_cycle",
    G71: "rough_turning_cycle",
    G72: "rough_facing_cycle",
    G73: "pattern_repeat",
    G76: "threading_cycle",
    G83: "peck_drill",
    G85: "okuma_NTURN_rough",
    G87: "okuma_NTURN_finish",
  };
  for (const [g, label] of Object.entries(map)) {
    if (new RegExp(`\\b${g}\\b`).test(text)) cycles.push(`${g}_${label}`);
  }
  return cycles;
}

/** Extract the full ground-truth header for one program. */
export function extractProgramGroundTruth(meta) {
  if (!existsSync(meta.path)) {
    return {
      source_file: meta.path,
      customer: meta.customer,
      part_folder: meta.part_folder,
      original_name: basename(meta.path),
      _error: "file_not_found",
    };
  }
  const text = readFileSync(meta.path, "utf8");
  const explicit_tools = parseExplicitToolListBlock(text);
  const t_calls = parseTCallsInBody(text);
  const operations = parseOperationLabels(text);
  const { live_tool_used, has_c_axis_index } = detectLiveToolAndCAxis(text);
  return {
    source_file: meta.path,
    customer: meta.customer,
    part_folder: meta.part_folder,
    original_name: basename(meta.path),
    o_number: parseONumber(text),
    spindle_max_rpm_cap: parseSpindleMaxCap(text),
    bar_stock_envelope: parseBarStockEnvelope(text),
    tool_list_explicit: explicit_tools,
    tool_calls_in_body: t_calls,
    operations,
    op_count: operations.length,
    tool_count: t_calls.length,
    feed_mode: detectFeedMode(text),
    work_planes: detectWorkPlanes(text),
    spindle_range_mcodes: detectSpindleRange(text),
    live_tool_used,
    has_c_axis_index,
    canned_cycles_used: detectCannedCycles(text),
    raw_byte_count: text.length,
    raw_line_count: text.split("\n").length,
  };
}

/** Build the full ground-truth report for all 4 originals. */
export function buildGroundTruth({ originals = FOUR_ORIGINALS, generatedAt = new Date().toISOString() } = {}) {
  const programs = originals.map((m) => extractProgramGroundTruth(m));
  const total_tools = programs.reduce((s, p) => s + (p.tool_count ?? 0), 0);
  const total_ops = programs.reduce((s, p) => s + (p.op_count ?? 0), 0);
  return {
    schemaVersion: "1.0.0",
    generatedAt,
    advisoryOnly: true,
    must_human_verify: true,
    purpose: "Empirical ground-truth from the 4 JM Die FULL-PROGRAM-* Mastercam .MIN originals - substrate for echo's .cps post-upgrade validation work",
    domain_handoff_to: "echo (.cps post edits)",
    summary: {
      program_count: programs.length,
      total_tools_invoked: total_tools,
      total_operations: total_ops,
      programs_with_live_tooling: programs.filter((p) => p.live_tool_used).length,
      programs_with_c_axis_index: programs.filter((p) => p.has_c_axis_index).length,
    },
    programs,
    notes: [
      "spindle_max_rpm_cap = first G50 S#### in file (Mastercam emits one per tool change; the first is the program-wide ceiling).",
      "tool_list_explicit is populated when Mastercam emitted a per-tool comment block (CSM format); otherwise the empty array - fall back to tool_calls_in_body for the codes.",
      "bar_stock_envelope: PS LC,[Zmin,Xmin],[Zmax,Xmax] from Mastercam's bar definition. Used by echo to verify re-posted .nc fits within target-machine work envelope.",
      "OPTIMAS uses NAT01..NAT04 named tool addresses + extensive M13/M15/M110/M146/M147 live-tool macros + G138 polar interpolation - this is the only one with C-axis indexing in the 4 originals.",
      "Mike provides extraction infra; echo actions the .cps post-upgrade work using this ground truth as the spec to match.",
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

  const report = buildGroundTruth();
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

  console.log(`JM Die Lathe Program Ground Truth - ${report.generatedAt}`);
  console.log(`Programs: ${report.summary.program_count} | Tools: ${report.summary.total_tools_invoked} | Ops: ${report.summary.total_operations} | Live-tool progs: ${report.summary.programs_with_live_tooling}`);
  console.log("");
  for (const p of report.programs) {
    if (p._error) {
      console.log(`  X ${p.customer} | ${p.original_name} -> ERROR: ${p._error}`);
      continue;
    }
    console.log(`  - ${p.customer} | ${p.original_name}`);
    console.log(`      o_number=${p.o_number ?? "(none)"} | spindle_cap=${p.spindle_max_rpm_cap ?? "?"} rpm | feed=${p.feed_mode} | planes=${p.work_planes.join(",")}`);
    console.log(`      tools: ${p.tool_calls_in_body.join(", ")} (${p.tool_count} unique)`);
    console.log(`      ops:   ${p.operations.slice(0, 8).join(", ")}${p.operations.length > 8 ? ` ... (+${p.operations.length - 8})` : ""}`);
    console.log(`      flags: live_tool=${p.live_tool_used} c_axis=${p.has_c_axis_index} cycles=${p.canned_cycles_used.join(",")}`);
    if (p.bar_stock_envelope) {
      const e = p.bar_stock_envelope;
      console.log(`      bar:   Z[${e.z_min}..${e.z_max}] X[${e.x_min}..${e.x_max}]`);
    }
  }
}

const __thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1].replace(/\\/g, "/") === __thisFile.replace(/\\/g, "/")) {
  main();
}
