#!/usr/bin/env node
/**
 * export-mastercam-machine-db.mjs — Mastercam Machine-Definition Library Exporter
 *
 * GAP-FILL (master-post-validation, 2026-05-31): PRISM had NO machine-database
 * exporter for any CAM system. Mastercam keeps machine definitions in Machine
 * Group setup (.mcam-mmd machine def + .control control def). This script emits
 * an uploadable machine library from PRISM's canonical shop-machine roster so an
 * operator can stand up the JM mill fleet in Mastercam without hand-entry.
 *
 * SOURCE DATA (no engine edits — reads canonical roster only):
 *   - JM mill fleet roster              ← ShopConfigurationEngine.ts DEFAULT_MACHINES (VMC-01..05)
 *   - spindle/power enrichment          ← MILL_SPINDLE_SPECS below (ground-truth machine-class data;
 *                                          ShopConfigurationEngine stores rate+capability, not spindle limits for mills)
 *   - controller → Mastercam post map   ← CONTROLLER_POST_MAP below
 *
 * OUTPUT (uploadable contract — same as the verified tool exporter):
 *   <out>/PRISM_MACHINES.mcam-machines  — JSON machine library (Mastercam Machine Group import target)
 *   <out>/PRISM_MACHINES.csv            — flat CSV (spreadsheet review / machine-setup checklist)
 *
 * UNITS: mm-native. work_envelope + spindle limits in metric. --inch adds an inch CSV.
 *        JM runs G20 (INCH) at the controller, but Mastercam machine envelopes are stored metric.
 *
 * HONEST FORMAT NOTE: a true Mastercam machine definition is a binary .mcam-mmd
 *   (+ .control). This emits the documented JSON + CSV interchange that captures
 *   every field the operator needs to configure the Machine Group; the binary
 *   .mcam-mmd requires Mastercam's Machine Definition Manager to author.
 *
 * PURE: no network, no engine import, deterministic given --frozen-time.
 *   Run: node scripts/export-mastercam-machine-db.mjs [--out <dir>] [--inch] [--frozen-time <iso>]
 *   Test: node scripts/export-mastercam-machine-db.test.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const MM_PER_INCH = 25.4;

/**
 * JM mill fleet — canonical roster from ShopConfigurationEngine DEFAULT_MACHINES.
 * id/name/type/controller are verbatim from that engine; spindle/power/envelope
 * are ground-truth machine-class specs (the engine stores hourly_rate + capabilities
 * for mills, not spindle limits — those live here as the enrichment layer).
 */
export const MILL_MACHINES = [
  {
    id: "VMC-01", name: "Hurco VM30i", type: "VMC", controller: "hurco",
    spindle_max_rpm: 8000, max_power_kw: 12, taper: "CAT40", axes: 3,
    work_envelope_mm: { x: 762, y: 508, z: 508 }, tool_capacity: 24,
    capabilities: ["milling", "drilling", "tapping", "boring", "contouring"],
  },
  {
    id: "VMC-02", name: "Okuma M460V-5AX", type: "5-axis", controller: "okuma",
    spindle_max_rpm: 15000, max_power_kw: 22, taper: "HSK-A63", axes: 5,
    work_envelope_mm: { x: 762, y: 460, z: 460 }, tool_capacity: 32,
    capabilities: ["milling", "drilling", "5axis_contouring", "high_speed_milling", "die_sinking"],
  },
  {
    id: "VMC-03", name: "Haas VF-2", type: "VMC", controller: "haas",
    spindle_max_rpm: 8100, max_power_kw: 22.4, taper: "CAT40", axes: 3,
    work_envelope_mm: { x: 762, y: 406, z: 508 }, tool_capacity: 20,
    capabilities: ["milling", "drilling", "tapping", "boring"],
  },
  {
    id: "VMC-04", name: "Haas OM-2", type: "VMC", controller: "haas",
    spindle_max_rpm: 30000, max_power_kw: 5.6, taper: "CAT40", axes: 3,
    work_envelope_mm: { x: 305, y: 254, z: 305 }, tool_capacity: 10,
    capabilities: ["milling", "drilling", "engraving", "small_parts"],
  },
  {
    id: "VMC-05", name: "Roku-Roku HC 658-II", type: "VMC", controller: "fanuc",
    spindle_max_rpm: 40000, max_power_kw: 11, taper: "HSK-E32", axes: 3,
    work_envelope_mm: { x: 600, y: 500, z: 350 }, tool_capacity: 30,
    capabilities: ["milling", "drilling", "engraving", "high_speed_milling", "die_sinking", "electrode_milling", "graphite_milling"],
  },
];

/** PRISM controller key → Mastercam control/post family. */
export const CONTROLLER_POST_MAP = {
  hurco:      { control_def: "HURCO WINMAX MILL", post: "HURCO_WINMAX.pst",       g_dialect: "winmax" },
  okuma:      { control_def: "OKUMA OSP-P MILL",  post: "OKUMA_OSP.pst",          g_dialect: "osp" },
  haas:       { control_def: "HAAS NGC MILL",     post: "HAAS_NGC.pst",           g_dialect: "haas_ngc" },
  fanuc:      { control_def: "FANUC 30i MILL",    post: "FANUC_30i.pst",          g_dialect: "fanuc" },
  mazak:      { control_def: "MAZATROL MILL",     post: "MAZAK_SMOOTH.pst",       g_dialect: "mazatrol" },
  siemens:    { control_def: "SINUMERIK 840D",    post: "SIEMENS_840D.pst",       g_dialect: "sinumerik" },
  mitsubishi: { control_def: "MITSUBISHI M800",   post: "MITSUBISHI_M800.pst",    g_dialect: "meldas" },
};

/** Build the full machine-library object (pure). */
export function buildMachineLibrary({ now = new Date().toISOString(), machines = MILL_MACHINES } = {}) {
  const out = machines.map((m, i) => {
    const ctl = CONTROLLER_POST_MAP[m.controller] ?? { control_def: "GENERIC MILL", post: "GENERIC.pst", g_dialect: "iso" };
    return {
      machine_number: i + 1,
      id: m.id,
      name: m.name,
      type: m.type,
      controller: m.controller,
      control_def: ctl.control_def,
      recommended_post: ctl.post,
      g_dialect: ctl.g_dialect,
      axes: m.axes,
      spindle_max_rpm: m.spindle_max_rpm,
      max_power_kw: m.max_power_kw,
      spindle_taper: m.taper,
      tool_capacity: m.tool_capacity,
      work_envelope_mm: m.work_envelope_mm,
      capabilities: m.capabilities,
      units: "mm",
    };
  });
  return {
    format: "mcam-machines",
    library_name: "PRISM_MACHINES",
    file_name: "PRISM_MACHINES.mcam-machines",
    machines: out,
    metadata: {
      generated_by: "PRISM export-mastercam-machine-db.mjs (GAP-FILL master-post-validation)",
      generated_at: now,
      machine_count: out.length,
      source: "ShopConfigurationEngine DEFAULT_MACHINES (VMC-01..05) + machine-class spindle specs",
      units: "mm",
      version: "2025.1",
    },
  };
}

/** CSV serializer (machine-setup checklist / spreadsheet review). */
export function machineLibraryToCSV(lib, { inch = false } = {}) {
  const conv = (mm) => inch ? +(mm / MM_PER_INCH).toFixed(3) : mm;
  const unit = inch ? "in" : "mm";
  const header = [
    "machine_number", "id", "name", "type", "controller", "control_def",
    "recommended_post", "axes", "spindle_max_rpm", "max_power_kw", "spindle_taper",
    "tool_capacity", `envelope_x_${unit}`, `envelope_y_${unit}`, `envelope_z_${unit}`, "capabilities",
  ].join(",");
  const rows = lib.machines.map((m) =>
    [
      m.machine_number, m.id, `"${m.name}"`, m.type, m.controller, `"${m.control_def}"`,
      m.recommended_post, m.axes, m.spindle_max_rpm, m.max_power_kw, m.spindle_taper,
      m.tool_capacity, conv(m.work_envelope_mm.x), conv(m.work_envelope_mm.y), conv(m.work_envelope_mm.z),
      `"${m.capabilities.join("|")}"`,
    ].join(","),
  );
  return [header, ...rows].join("\n") + "\n";
}

// ─── CLI ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { out: "H:/prism/state/shared/master-post-validation/exports/mastercam", inch: false, now: undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") a.out = argv[++i];
    else if (argv[i] === "--inch") a.inch = true;
    else if (argv[i] === "--frozen-time") a.now = argv[++i];
  }
  if (!a.now && process.env.PRISM_AUDIT_FROZEN_TIME) a.now = process.env.PRISM_AUDIT_FROZEN_TIME;
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = resolve(args.out);
  mkdirSync(outDir, { recursive: true });
  const lib = buildMachineLibrary({ now: args.now ?? new Date().toISOString() });

  const jsonPath = resolve(outDir, lib.file_name);
  writeFileSync(jsonPath, JSON.stringify(lib, null, 2));
  const csvPath = resolve(outDir, "PRISM_MACHINES.csv");
  writeFileSync(csvPath, machineLibraryToCSV(lib, { inch: false }));

  const out = { json: jsonPath, csv: csvPath, machine_count: lib.machines.length };
  if (args.inch) {
    const inchPath = resolve(outDir, "PRISM_MACHINES.inch.csv");
    writeFileSync(inchPath, machineLibraryToCSV(lib, { inch: true }));
    out.inch_csv = inchPath;
  }
  console.log(JSON.stringify(out, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/"))) {
  main();
}
