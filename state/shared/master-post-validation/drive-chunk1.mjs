#!/usr/bin/env node
// drive-chunk1.mjs — chunk 1/5 of the master Hurco post test matrix validation.
// Selects rows where (rowIndex % 5)===0 (0-based array index), maps each combo to
// master_post_hurco_v11 params, POSTs to the live MCP bridge (:3100) to GENERATE NC,
// writes NC, then runs post-nc-dialect-lint + post-nc-conformance. Records every failure.
//
// Transport note: the :3100 MCP HTTP transport is STATEFUL (one connection at a time:
// "Already connected to a transport"). All calls are strictly serial + retried.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = "H:/prism";
const MATRIX = `${ROOT}/state/shared/master-post-validation/test-matrix.json`;
const NC_DIR = `${ROOT}/state/shared/master-post-validation/nc`;
const URL = "http://127.0.0.1:3100/mcp";
const CHUNK = 1;
const CAP = 40;

mkdirSync(NC_DIR, { recursive: true });

// ── serial MCP call with transport-busy retry ───────────────────────────────
async function call(args, tries = 8) {
  let lastErr = "";
  for (let t = 0; t < tries; t++) {
    try {
      const body = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "prism_cam", arguments: args } };
      const r = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
        body: JSON.stringify(body),
      });
      const ct = r.headers.get("content-type") || "";
      const raw = await r.text();
      if (r.status === 500 && /Already connected to a transport/.test(raw)) {
        lastErr = "transport-busy";
        await new Promise((z) => setTimeout(z, 350 + t * 300));
        continue;
      }
      if (r.status !== 200) { lastErr = `HTTP ${r.status}: ${raw.slice(0, 200)}`; await new Promise((z) => setTimeout(z, 250)); continue; }
      let j;
      if (ct.includes("event-stream") || raw.startsWith("event:") || raw.startsWith("data:")) {
        const data = raw.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
        j = JSON.parse(data);
      } else {
        j = JSON.parse(raw);
      }
      const text = j?.result?.content?.[0]?.text;
      return text ? JSON.parse(text) : j;
    } catch (e) {
      lastErr = String(e.message || e);
      await new Promise((z) => setTimeout(z, 250 + t * 200));
    }
  }
  return { success: false, error: `call failed after ${tries} tries: ${lastErr}`, _transport: true };
}

// ── combo → master_post_hurco_v11 mapping ───────────────────────────────────
// operation_type from tooling + motion_type (per engine enum: face|pocket|contour|drill|tap|bore|slot|3d_surface|adaptive)
function operationType(row) {
  const tl = row.tooling, mt = row.motion_type;
  if (mt === "rigid-tap" || tl === "tap") return "tap";
  if (tl === "drill") return "drill";
  if (tl === "bore") return "bore";
  if (tl === "face") return "face";
  if (tl === "ballbull3d") return "3d_surface";
  if (tl === "adaptive" || mt === "g05.1q1") return "adaptive";
  if (tl === "endmill") return "pocket"; // generic end-mill cut → pocket
  return "contour";
}
// tool diameter (mm) sensible per op type
function toolDiaMm(opType) {
  switch (opType) {
    case "face": return 50;
    case "drill": return 8;
    case "tap": return 6;       // M6 tap class
    case "bore": return 25;
    case "3d_surface": return 10; // ball/bull
    case "adaptive": return 12;
    case "pocket": return 12;
    case "slot": return 10;
    default: return 12;
  }
}
function toolFlutes(opType) {
  if (opType === "drill") return 2;
  if (opType === "tap") return 1; // tap — schema requires >=1; a tap has cutting flutes
  if (opType === "face") return 5;
  if (opType === "3d_surface") return 2;
  return 4;
}
// coolant_mode: tsc requires machine coolant_through; honor optional_packages=tsc, else flood (mist for Al finish)
function coolantMode(row) {
  const op = row.optional_packages;
  if (op === "tsc" && row._meta.machine_coolant_through) return "tsc";
  if (row.material === "N" && row.coating === "ZrN") return "mist"; // Al finish
  return "flood";
}
function useUltimotion(row) {
  return row.motion_type === "ulti-on" || row.optional_packages === "ultimotion-pkg";
}
function useConversational(row) {
  return row.motion_type === "conversational" || row.optional_packages === "g65-macro";
}
function units(row) {
  return row.controller_settings === "units-inch-g20" ? "inch" : "metric";
}
function workOffset(row) {
  // G54 default; extended offsets combos → still use 54 (engine handles base offset)
  return 54;
}
// spindle rpm: pick a per-material baseline, clamp to machine max_rpm
function spindleRpm(row, opType) {
  const maxRpm = row._meta.machine_max_rpm || 10000;
  const base = {
    P: 1500, M: 1200, K: 1800, N: 6000, S: 800, H: 600,
  }[row.material] || 1200;
  let rpm = base;
  if (opType === "tap") rpm = Math.min(rpm, 500);     // tapping is slow
  if (opType === "drill") rpm = Math.round(rpm * 0.8);
  if (opType === "3d_surface" || opType === "adaptive") rpm = Math.round(rpm * 1.2);
  return Math.min(rpm, maxRpm);
}
function feedMmMin(row, opType, rpm) {
  if (opType === "tap") {
    const pitch = 1.0; // M6x1.0 → feed = pitch * rpm
    return Math.round(pitch * rpm);
  }
  const fpt = { P: 0.08, M: 0.06, K: 0.12, N: 0.15, S: 0.04, H: 0.03 }[row.material] || 0.08;
  const flutes = toolFlutes(opType) || 2;
  let aggr = 1.0;
  const ps = row.parameter_settings;
  if (ps === "L1") aggr = 0.6; else if (ps === "L2") aggr = 0.75; else if (ps === "L3") aggr = 0.9;
  else if (ps === "L4") aggr = 1.0; else if (ps === "L5") aggr = 1.1; else if (ps === "prove_out") aggr = 0.5;
  return Math.max(20, Math.round(fpt * flutes * rpm * aggr));
}
// coordinate set per op type (engine wants rapid|linear|arc_cw|arc_ccw)
function coordinates(opType, dia) {
  const safeZ = 5, cutZ = -1;
  if (opType === "drill" || opType === "tap" || opType === "bore") {
    return [
      { x: 0, y: 0, z: safeZ, type: "rapid" },
      { x: 0, y: 0, z: -10, type: "linear" },
      { x: 0, y: 0, z: safeZ, type: "rapid" },
      { x: 25, y: 0, z: safeZ, type: "rapid" },
      { x: 25, y: 0, z: -10, type: "linear" },
      { x: 25, y: 0, z: safeZ, type: "rapid" },
    ];
  }
  if (opType === "3d_surface") {
    return [
      { x: 0, y: 0, z: safeZ, type: "rapid" },
      { x: 0, y: 0, z: cutZ, type: "linear" },
      { x: 40, y: 0, z: cutZ - 0.5, type: "linear" },
      { x: 40, y: 10, z: cutZ - 1.0, type: "linear" },
      { x: 0, y: 10, z: cutZ - 0.5, type: "linear" },
      { x: 0, y: 0, z: safeZ, type: "rapid" },
    ];
  }
  // face / pocket / contour / adaptive / slot — a rectangular path with an arc
  return [
    { x: 0, y: 0, z: safeZ, type: "rapid" },
    { x: 0, y: 0, z: cutZ, type: "linear" },
    { x: 60, y: 0, z: cutZ, type: "linear" },
    { x: 60, y: 40, z: cutZ, type: "linear" },
    { x: 0, y: 40, z: cutZ, type: "linear" },
    { x: 0, y: 0, z: cutZ, type: "linear" },
    { x: 0, y: 0, z: safeZ, type: "rapid" },
  ];
}

function buildParams(row) {
  const opType = operationType(row);
  const dia = toolDiaMm(opType);
  const flutes = toolFlutes(opType);
  const rpm = spindleRpm(row, opType);
  const feed = feedMmMin(row, opType, rpm);
  const coolant = coolantMode(row);
  const op = {
    operation_type: opType,
    tool_number: 1,
    tool_diameter_mm: dia,
    tool_flutes: flutes,
    tool_description: `${row.tooling} ${dia}mm (${row.material} ${row.coating})`,
    material_iso: row.material,
    spindle_rpm: rpm,
    feed_mm_min: feed,
    axial_depth_mm: opType === "face" ? 1.0 : 2.0,
    radial_depth_mm: opType === "face" ? dia * 0.7 : dia * 0.4,
    coolant,
    coordinates: coordinates(opType, dia),
  };
  const config = {
    program_number: 1000 + row.row_id,
    program_comment: `CHUNK1 ROW${row.row_id} ${row.material}/${row.tooling}/${row.machine}`,
    use_conversational: useConversational(row),
    use_ultimotion: useUltimotion(row),
    coolant_mode: coolant,
    work_offset: workOffset(row),
    units: units(row),
    safe_z_mm: 25,
  };
  return { operations: [op], config };
}

// ── validators ──────────────────────────────────────────────────────────────
function runLint(file) {
  // exit 0 = no ERROR; exit 1 = ≥1 ERROR. We parse --json for detail.
  try {
    const out = execFileSync(process.execPath, [`${ROOT}/scripts/post-nc-dialect-lint.mjs`, file, "--dialect", "hurco", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const j = JSON.parse(out);
    const r = j.results[0];
    return { pass: r.counts.ERROR === 0, errors: r.counts.ERROR, warns: r.counts.WARN, findings: r.findings.filter((f) => f.severity === "ERROR") };
  } catch (e) {
    // execFileSync throws on non-zero exit; stdout still carries JSON
    const out = e.stdout ? String(e.stdout) : "";
    try {
      const j = JSON.parse(out);
      const r = j.results[0];
      return { pass: r.counts.ERROR === 0, errors: r.counts.ERROR, warns: r.counts.WARN, findings: r.findings.filter((f) => f.severity === "ERROR") };
    } catch {
      return { pass: false, errors: -1, warns: -1, findings: [], runError: String(e.message || e).slice(0, 200) };
    }
  }
}
function runConformance(file) {
  // exit 0 = all checks pass; exit 3 = ≥1 FAIL. --json carries detail.
  try {
    const out = execFileSync(process.execPath, [`${ROOT}/scripts/post-nc-conformance.mjs`, file, "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const j = JSON.parse(out);
    return { pass: j.ok, passed: j.passed, total: j.total, fails: j.checks.filter((c) => !c.pass).map((c) => c.name) };
  } catch (e) {
    const out = e.stdout ? String(e.stdout) : "";
    try {
      const j = JSON.parse(out);
      return { pass: j.ok, passed: j.passed, total: j.total, fails: j.checks.filter((c) => !c.pass).map((c) => c.name) };
    } catch {
      return { pass: false, passed: -1, total: -1, fails: [], runError: String(e.message || e).slice(0, 200) };
    }
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const m = JSON.parse(readFileSync(MATRIX, "utf8"));
  let selected = m.rows.filter((_, i) => i % 5 === 0);
  let capped = false;
  if (selected.length > CAP) { selected = selected.slice(0, CAP); capped = true; }

  const records = [];
  const failures = [];
  let generated = 0, lintPass = 0, confPass = 0;

  for (const row of selected) {
    const params = buildParams(row);
    const rec = {
      row_id: row.row_id,
      combo: `${row.material}/${row.tool_holder}/${row.tooling}/${row.insert}/${row.coating}/${row.parameter_settings}/${row.machine}/${row.spindle_type}/${row.motion_type}/${row.optional_packages}/${row.controller_settings}`,
      opType: params.operations[0].operation_type,
      units: params.config.units,
      rpm: params.operations[0].spindle_rpm,
      maxRpm: row._meta.machine_max_rpm,
      coolant: params.config.coolant_mode,
      ultimotion: params.config.use_ultimotion,
      generated: false, lint: null, conformance: null, file: null, genError: null,
    };

    const res = await call({ action: "master_post_hurco_v11", params });
    if (res && res.engine_output && Array.isArray(res.engine_output.gcode)) {
      const gcode = res.engine_output.gcode.join("\n") + "\n";
      const file = `${NC_DIR}/chunk1-row${row.row_id}.nc`;
      writeFileSync(file, gcode);
      rec.generated = true; rec.file = file; rec.lines = res.engine_output.total_lines;
      generated++;

      const lint = runLint(file);
      rec.lint = lint;
      if (lint.pass) lintPass++;
      else failures.push({ combo: `row${row.row_id} ${rec.combo}`, stage: "lint", issue: lint.runError ? `lint runner error: ${lint.runError}` : `${lint.errors} ERROR finding(s): ` + lint.findings.map((f) => `L${f.line} ${f.rule}`).join("; ") });

      const conf = runConformance(file);
      rec.conformance = conf;
      if (conf.pass) confPass++;
      else failures.push({ combo: `row${row.row_id} ${rec.combo}`, stage: "conformance", issue: conf.runError ? `conformance runner error: ${conf.runError}` : `${conf.passed}/${conf.total} checks; FAILs: ` + conf.fails.join(", ") });
    } else {
      // engine/schema rejection — a REAL finding
      const err = (res && res.error) ? res.error : `unexpected result shape: ${JSON.stringify(res).slice(0, 200)}`;
      rec.genError = err;
      const transport = res && res._transport;
      failures.push({ combo: `row${row.row_id} ${rec.combo}`, stage: "generate", issue: (transport ? "[TRANSPORT] " : "") + err });
    }
    records.push(rec);
    // small gap to let the stateful transport settle between calls
    await new Promise((z) => setTimeout(z, 150));
  }

  const summary = {
    chunk: CHUNK,
    selectedCount: selected.length,
    capped,
    generated, lintPass, conformancePass: confPass,
    failures, records,
  };
  writeFileSync(`${NC_DIR}/../chunk1-results.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ generated, lintPass, conformancePass: confPass, selected: selected.length, capped, failures: failures.length }));
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
