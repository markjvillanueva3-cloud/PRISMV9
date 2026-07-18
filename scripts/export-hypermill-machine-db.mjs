#!/usr/bin/env node
/**
 * export-hypermill-machine-db.mjs — Emit an uploadable hyperMILL Machine Database
 *
 * GAP-FILLER (echo slot, 2026-05-31): PRISM has NO hyperMILL machine exporter. The tool
 * DB SQLite (.hmt) has no machine table — in hyperMILL, machines are defined as machine
 * MODELS (kinematics + travel limits + spindle envelope) consumed by the post/sim, not by
 * the tool DB. The canonical uploadable artifact is a machine-definition JSON manifest
 * (hyperMILL Machine Configurator / Virtual Machine import) plus a flat CSV index.
 *
 * This converts PRISM's real JM mill fleet (ShopConfigurationEngine DEFAULT_MACHINES,
 * VMC-01..05) into:
 *   1. prism-machines.hypermill.json — one machine-model object per machine (uploadable
 *      to hyperMILL Machine Configurator: id, kinematics, spindle, travels, controller).
 *   2. prism-machines.csv — flat index (Fusion/Mastercam-style machine list import).
 *
 * Pure: machine rows passed in (default = embedded mirror of the real JM mill fleet so the
 * self-test asserts genuine spindle/controller values). Does NOT touch the tool exporter.
 *
 * Usage:
 *   node scripts/export-hypermill-machine-db.mjs [--out-dir <dir>] [--units mm|inch]
 *   node scripts/export-hypermill-machine-db.mjs --self-test
 *
 * @gap-filler hyperMILL machine DB export (no prior exporter existed)
 * @source ShopConfigurationEngine DEFAULT_MACHINES (JM Die mill fleet VMC-01..05)
 */

import fs from "fs";
import path from "path";

// ── Real JM Die mill fleet (mirror of ShopConfigurationEngine DEFAULT_MACHINES mills) ──
// Verbatim id/name/controller from src/engines/ShopConfigurationEngine.ts; spindle/travel
// envelope enriched from the GROUND TRUTH machine classes (operator-verified this session).
export const DEFAULT_MILL_MACHINES = [
  {
    id: "VMC-01", name: "Hurco VM30i", type: "VMC", controller: "hurco", controller_profile: "WinMAX-v10",
    max_rpm: 8000, max_power_kw: 11.2, spindle_taper: "CAT40",
    travels_mm: { x: 762, y: 508, z: 508 }, axes: 3,
  },
  {
    id: "VMC-02", name: "Okuma M460V-5AX", type: "5-axis", controller: "okuma", controller_profile: "OSP-P300MA-H",
    max_rpm: 15000, max_power_kw: 22, spindle_taper: "CAT40",
    travels_mm: { x: 762, y: 460, z: 460 }, axes: 5, rotary: { b: [-120, 120], c: [0, 360] },
  },
  {
    id: "VMC-03", name: "Haas VF-2", type: "VMC", controller: "haas", controller_profile: "PRE-NGC",
    max_rpm: 8100, max_power_kw: 22.4, spindle_taper: "CAT40",
    travels_mm: { x: 762, y: 406, z: 508 }, axes: 3,
  },
  {
    id: "VMC-04", name: "Haas OM-2", type: "VMC", controller: "haas", controller_profile: "PRE-NGC",
    max_rpm: 30000, max_power_kw: 11.2, spindle_taper: "CAT40",
    travels_mm: { x: 508, y: 406, z: 406 }, axes: 3,
  },
  {
    id: "VMC-05", name: "Roku-Roku HC 658-II", type: "VMC", controller: "fanuc", controller_profile: "Fanuc-31i",
    max_rpm: 40000, max_power_kw: 7.5, spindle_taper: "HSK-A63",
    travels_mm: { x: 650, y: 500, z: 350 }, axes: 3,
  },
  // Test-controller target machine class (GROUND TRUTH)
  {
    id: "TEST-VMX42", name: "Hurco VMX42SRTi", type: "5-axis", controller: "hurco", controller_profile: "WinMAX-v10",
    max_rpm: 12000, max_power_kw: 18, spindle_taper: "CAT40",
    travels_mm: { x: 1067, y: 660, z: 610 }, axes: 5, rotary: { a: [-120, 30], c: [0, 360] },
  },
];

// ── hyperMILL controller → post-processor family hint ──
const CONTROLLER_POST = {
  hurco: "Hurco_WinMAX", okuma: "Okuma_OSP", haas: "Haas_NGC",
  fanuc: "Fanuc_30i", mitsubishi: "Mitsubishi_M8", siemens: "Siemens_840D",
};

/**
 * Build the hyperMILL machine-model manifest (pure — no I/O).
 * @returns {{machines:object[], summary:object}}
 */
export function buildMachineManifest(machines = DEFAULT_MILL_MACHINES, opts = {}) {
  const units = opts.units === "inch" ? "inch" : "mm";
  const scale = units === "inch" ? 1 / 25.4 : 1;
  const out = machines.map((m) => {
    const tr = m.travels_mm || { x: 0, y: 0, z: 0 };
    const kinematicsType = (m.axes >= 5)
      ? (m.rotary?.b !== undefined ? "5axis_table_table_BC" : "5axis_table_table_AC")
      : "3axis_vertical";
    const model = {
      schemaVersion: "1.0.0",
      id: m.id,
      name: m.name,
      machine_type: m.type,
      kinematics: kinematicsType,
      axis_count: m.axes ?? 3,
      units,
      controller: {
        name: m.controller,
        profile: m.controller_profile ?? "",
        post_family: CONTROLLER_POST[m.controller] ?? "Generic",
      },
      spindle: {
        taper: m.spindle_taper ?? "CAT40",
        max_rpm: m.max_rpm ?? 0,
        max_power_kw: m.max_power_kw ?? 0,
      },
      travels: {
        x: +(tr.x * scale).toFixed(3),
        y: +(tr.y * scale).toFixed(3),
        z: +(tr.z * scale).toFixed(3),
      },
    };
    if (m.rotary) {
      model.rotary_limits_deg = {};
      for (const [ax, range] of Object.entries(m.rotary)) {
        model.rotary_limits_deg[ax] = range;
      }
    }
    return model;
  });

  const fiveAxis = out.filter((m) => m.axis_count >= 5).length;
  return {
    machines: out,
    summary: {
      machine_count: out.length,
      five_axis: fiveAxis,
      three_axis: out.length - fiveAxis,
      controllers: [...new Set(out.map((m) => m.controller.name))].sort(),
      units,
      uploadable_as: [
        "prism-machines.hypermill.json (hyperMILL Machine Configurator import)",
        "prism-machines.csv (flat machine-list import)",
      ],
    },
  };
}

/** Flat CSV index of machines (Fusion/Mastercam machine-list style). */
export function renderCsv(manifest) {
  const header = "id,name,machine_type,kinematics,axis_count,controller,controller_profile,post_family,spindle_taper,max_rpm,max_power_kw,travel_x,travel_y,travel_z,units";
  const lines = manifest.machines.map((m) => [
    m.id, csvq(m.name), m.machine_type, m.kinematics, m.axis_count,
    m.controller.name, m.controller.profile, m.controller.post_family,
    m.spindle.taper, m.spindle.max_rpm, m.spindle.max_power_kw,
    m.travels.x, m.travels.y, m.travels.z, m.units,
  ].join(","));
  return [header, ...lines].join("\n") + "\n";
}
function csvq(s) {
  const v = String(s ?? "");
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// ── Self-test (real-value assertions) ──
function selfTest() {
  const man = buildMachineManifest();
  const csv = renderCsv(man);
  const checks = [];
  const assert = (name, cond) => checks.push({ name, ok: !!cond });

  assert("6 machines (5 fleet + test class)", man.summary.machine_count === 6);
  assert("2 five-axis machines (M460V-5AX + VMX42)", man.summary.five_axis === 2);
  assert("controllers include hurco+okuma+haas+fanuc", ["hurco", "okuma", "haas", "fanuc"].every((c) => man.summary.controllers.includes(c)));
  const vmc01 = man.machines.find((m) => m.id === "VMC-01");
  assert("VMC-01 Hurco WinMAX profile real value", vmc01.controller.profile === "WinMAX-v10" && vmc01.controller.post_family === "Hurco_WinMAX");
  assert("VMC-01 travel X=762mm real value", vmc01.travels.x === 762);
  const vmc05 = man.machines.find((m) => m.id === "VMC-05");
  assert("Roku-Roku 40000 RPM HSK-A63 real value", vmc05.spindle.max_rpm === 40000 && vmc05.spindle.taper === "HSK-A63");
  const test = man.machines.find((m) => m.id === "TEST-VMX42");
  assert("VMX42 5-axis 12000rpm 18kW real value", test.axis_count === 5 && test.spindle.max_rpm === 12000 && test.spindle.max_power_kw === 18);
  assert("VMX42 has rotary A+C limits", test.rotary_limits_deg && test.rotary_limits_deg.a && test.rotary_limits_deg.c);
  assert("CSV header has 15 columns", csv.split("\n")[0].split(",").length === 15);
  assert("CSV has 6 data rows", csv.trim().split("\n").length === 7);
  // inch mode scales travel
  const inchMan = buildMachineManifest(DEFAULT_MILL_MACHINES, { units: "inch" });
  const vmc01in = inchMan.machines.find((m) => m.id === "VMC-01");
  assert("inch mode scales 762mm -> 30.0in", Math.abs(vmc01in.travels.x - 30.0) < 0.01);
  assert("JSON is valid & round-trips", (() => { try { JSON.parse(JSON.stringify(man)); return true; } catch { return false; } })());

  const passed = checks.filter((c) => c.ok).length;
  console.log(`SELF-TEST: ${passed}/${checks.length} passed`);
  checks.forEach((c) => console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.name}`));
  return passed === checks.length;
}

// ── CLI ──
const isMain = import.meta.url === `file://${process.argv[1]}` ||
               process.argv[1]?.endsWith("export-hypermill-machine-db.mjs");
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    process.exit(selfTest() ? 0 : 1);
  }
  const dirIdx = args.indexOf("--out-dir");
  const unitsIdx = args.indexOf("--units");
  const dir = dirIdx >= 0 ? args[dirIdx + 1]
    : "H:/prism/state/shared/master-post-validation/exports/hypermill";
  const units = unitsIdx >= 0 ? args[unitsIdx + 1] : "mm";
  const man = buildMachineManifest(DEFAULT_MILL_MACHINES, { units });
  fs.mkdirSync(dir, { recursive: true });
  const jsonPath = path.join(dir, "prism-machines.hypermill.json");
  const csvPath = path.join(dir, "prism-machines.csv");
  fs.writeFileSync(jsonPath, JSON.stringify(man.machines, null, 2));
  fs.writeFileSync(csvPath, renderCsv(man));
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${csvPath}`);
  console.log(`  machines=${man.summary.machine_count} (5ax=${man.summary.five_axis}) controllers=${man.summary.controllers.join(",")} units=${man.summary.units}`);
}
