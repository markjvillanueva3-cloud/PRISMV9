// Chunk 5/5 master Hurco post validation runner.
// rows where (rowIndex % 5) === 4. Maps each combo -> master_post_hurco_v11
// params, POSTs to live drive :3100, writes NC, runs lint + conformance.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = "H:/prism";
const OUTDIR = `${ROOT}/state/shared/master-post-validation`;
const NCDIR = `${OUTDIR}/nc`;
const MATRIX = `${OUTDIR}/test-matrix.json`;

const m = JSON.parse(fs.readFileSync(MATRIX, "utf8"));
const chunk = m.rows.filter((r, i) => (i % 5) === 4);

// ---- axis -> engine mapping ----------------------------------------------
const TOOLING_TO_OP = {
  face: "face", endmill: "pocket", contour: "contour", slot: "slot",
  drill: "drill", tap: "tap", bore: "bore", ballbull3d: "3d_surface",
  adaptive: "adaptive",
};

// Representative tool geometry (mm-native engine). JM jobs are INCH but the
// engine consumes tool_diameter_mm; we emit G20 and state units LOUDLY.
function toolFor(op, rowId) {
  switch (op) {
    case "face": return { d: 50, flutes: 5, desc: "50mm face mill" };
    case "drill": return { d: 8.5, flutes: 2, desc: "8.5mm drill" };
    case "tap": return { d: 6.35, flutes: 3, desc: "M6 tap" };
    case "bore": return { d: 20, flutes: 1, desc: "20mm boring bar" };
    case "3d_surface": return { d: 10, flutes: 4, desc: "10mm ball/bull-nose" };
    case "slot": return { d: 8, flutes: 3, desc: "8mm slot endmill" };
    case "contour": return { d: 12, flutes: 4, desc: "12mm endmill (contour)" };
    case "adaptive": return { d: 12, flutes: 5, desc: "12mm adaptive endmill" };
    case "pocket":
    default: return { d: 10, flutes: 4, desc: "10mm endmill (pocket)" };
  }
}

// Physically plausible S/F per material+op, clamped to machine max_rpm.
const KC = { P: 1800, M: 2100, K: 1100, N: 700, S: 2800, H: 3200 };
function speedFeed(material, op, maxRpm, aggLabel) {
  // base surface-speed-ish RPM by material toughness (lower kc -> faster)
  const baseRpm = { P: 2600, M: 1800, K: 2400, N: 6000, S: 1200, H: 1500 }[material] || 2000;
  let rpm = Math.min(baseRpm, maxRpm);
  // op adjustments
  if (op === "tap") rpm = Math.min(500, maxRpm);
  if (op === "drill") rpm = Math.min(Math.round(rpm * 0.7), maxRpm);
  if (op === "bore") rpm = Math.min(Math.round(rpm * 0.6), maxRpm);
  if (op === "face") rpm = Math.min(Math.round(rpm * 0.9), maxRpm);
  // aggressiveness feed multiplier (matches engine L1..L5 doctrine)
  const aggMul = { L1: 0.6, L2: 0.75, L3: 0.9, L4: 1.0, L5: 1.1 }[aggLabel] || 0.85;
  let feed;
  if (op === "tap") feed = Math.round(rpm * 1.0); // pitch≈1.0mm -> feed=pitch*RPM
  else feed = Math.round(rpm * 0.12 * aggMul * (op === "drill" || op === "bore" ? 0.5 : 1));
  feed = Math.max(20, feed);
  return { rpm, feed };
}

function coordsFor(op) {
  switch (op) {
    case "drill": case "tap": case "bore":
      return [
        { x: 0, y: 0, z: 5, type: "rapid" },
        { x: 0, y: 0, z: -12, type: "linear" },
        { x: 0, y: 0, z: 5, type: "rapid" },
      ];
    case "face":
      return [
        { x: 0, y: 0, z: 1, type: "rapid" },
        { x: 100, y: 0, z: 0, type: "linear" },
        { x: 100, y: 40, z: 0, type: "linear" },
        { x: 0, y: 40, z: 0, type: "linear" },
      ];
    default:
      return [
        { x: 0, y: 0, z: 5, type: "rapid" },
        { x: 20, y: 0, z: -3, type: "linear" },
        { x: 20, y: 20, z: -3, type: "linear" },
        { x: 0, y: 20, z: -3, type: "linear" },
        { x: 0, y: 0, z: -3, type: "linear" },
      ];
  }
}

function buildParams(r) {
  const op = TOOLING_TO_OP[r.tooling] || "pocket";
  const tool = toolFor(op, r.row_id);
  const maxRpm = r._meta.machine_max_rpm;
  const { rpm, feed } = speedFeed(r.material, op, maxRpm, r.parameter_settings);
  const coolThru = r._meta.machine_coolant_through;
  // coolant: tsc only if package/controller requests it AND machine supports it
  const wantsTsc = r.optional_packages === "tsc" || r.controller_settings === "tsc";
  const coolant = wantsTsc && coolThru ? "tsc" : "flood";
  // motion -> ultimotion / conversational
  const useUlti = r.motion_type === "ulti-on" || r.motion_type === "g05.1q1";
  const useConv = r.motion_type === "conversational";
  const workOffset = 54;
  const axial = op === "face" ? 1 : (op === "drill" || op === "tap" || op === "bore" ? 12 : 3);
  const radial = op === "face" ? 40 : (op === "slot" ? tool.d : 5);

  const operation = {
    operation_type: op,
    tool_number: r.row_id % 20 + 1,
    tool_diameter_mm: tool.d,
    tool_flutes: tool.flutes,
    tool_description: tool.desc,
    material_iso: r.material,
    spindle_rpm: rpm,
    feed_mm_min: feed,
    axial_depth_mm: axial,
    radial_depth_mm: radial,
    coolant,
    coordinates: coordsFor(op),
  };
  const config = {
    program_number: 5000 + r.row_id,
    program_comment: `chunk5-row${r.row_id} ${r.material}/${r.tooling}/${r.motion_type} [${r.machine}]`,
    use_ultimotion: useUlti,
    use_conversational: useConv,
    coolant_mode: coolant,
    work_offset: workOffset,
    units: "inch", // JM jobs INCH/G20 — engine tool dims are mm; emitted G20
    safe_z_mm: 25,
  };
  return { operations: [operation], config, _op: op, _rpm: rpm, _feed: feed, _coolant: coolant, _useUlti: useUlti, _useConv: useConv };
}

async function callDrive(args) {
  const body = {
    jsonrpc: "2.0", id: 1, method: "tools/call",
    params: { name: "prism_cam", arguments: { action: "master_post_hurco_v11", params: { operations: args.operations, config: args.config } } },
  };
  const r = await fetch("http://127.0.0.1:3100/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  let j;
  try { j = JSON.parse(t); } catch (e) { return { ok: false, stage: "generate", issue: `non-JSON drive response: ${t.slice(0, 160)}` }; }
  if (j.error) return { ok: false, stage: "generate", issue: `JSON-RPC error: ${JSON.stringify(j.error).slice(0, 200)}` };
  const txt = j.result && j.result.content && j.result.content[0] && j.result.content[0].text;
  if (!txt) return { ok: false, stage: "generate", issue: "no result content text" };
  let inner;
  try { inner = JSON.parse(txt); } catch (e) { return { ok: false, stage: "generate", issue: "result text not JSON" }; }
  if (inner.success === false) return { ok: false, stage: "generate", issue: `dispatcher rejected: ${inner.error}` };
  const eo = inner.engine_output || inner.post_output || inner;
  const gcode = eo.gcode;
  if (!Array.isArray(gcode) || gcode.length === 0) {
    return { ok: false, stage: "generate", issue: `empty gcode (top keys: ${Object.keys(inner).join(",")})` };
  }
  return { ok: true, gcode, warnings: eo.warnings || [], lines: gcode.length };
}

function runValidator(script, file, extra) {
  const a = [`scripts/${script}`, file, ...extra];
  try {
    const out = execFileSync(process.execPath, a, { cwd: ROOT, encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status == null ? -1 : e.status, out: (e.stdout || "") + (e.stderr || "") };
  }
}

const failures = [];
let generated = 0, lintPass = 0, conformancePass = 0;
const perRow = [];

const main = async () => {
  for (const r of chunk) {
    const args = buildParams(r);
    const combo = `row${r.row_id} ${r.material}/${r.tooling}/${r.motion_type}/${r.optional_packages}/${r.controller_settings} [${r.machine} ${args._op} S${args._rpm} F${args._feed} ${args._coolant}]`;
    const rec = { row: r.row_id, combo, op: args._op, generated: false, lint: null, conf: null, ncFile: null };
    const gen = await callDrive(args);
    if (!gen.ok) {
      failures.push({ combo, stage: gen.stage, issue: gen.issue });
      perRow.push(rec);
      continue;
    }
    generated++;
    rec.generated = true;
    const ncFile = `${NCDIR}/chunk5-row${r.row_id}.nc`;
    fs.writeFileSync(ncFile, gen.gcode.join("\n") + "\n");
    rec.ncFile = ncFile;
    rec.lines = gen.lines;

    const lint = runValidator("post-nc-dialect-lint.mjs", ncFile, ["--dialect", "hurco"]);
    if (lint.code === 0) { lintPass++; rec.lint = "PASS"; }
    else { rec.lint = "FAIL"; failures.push({ combo, stage: "lint", issue: `exit ${lint.code}: ${lint.out.replace(/\s+/g, " ").trim().slice(0, 260)}` }); }

    const conf = runValidator("post-nc-conformance.mjs", ncFile, []);
    if (conf.code === 0) { conformancePass++; rec.conf = "PASS"; }
    else { rec.conf = "FAIL"; failures.push({ combo, stage: "conformance", issue: `exit ${conf.code}: ${conf.out.replace(/\s+/g, " ").trim().slice(0, 260)}` }); }

    perRow.push(rec);
  }

  fs.writeFileSync(`${OUTDIR}/_chunk5-results.json`, JSON.stringify({
    combosRun: chunk.length, generated, lintPass, conformancePass, failures, perRow,
  }, null, 2));
  console.log(JSON.stringify({ combosRun: chunk.length, generated, lintPass, conformancePass, failureCount: failures.length }));
};
main();
