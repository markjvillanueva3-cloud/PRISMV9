// drive-chunk3.mjs — chunk 3/5 (rowIndex % 5 === 2) master_post_hurco_v11 validation driver.
// Maps each matrix row -> engine params, POSTs to live :3100 bridge, writes NC,
// runs post-nc-dialect-lint + post-nc-conformance. Emits a JSON result blob to stdout.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = "H:/prism";
const OUT = path.join(ROOT, "state/shared/master-post-validation");
const NC = path.join(OUT, "nc");
fs.mkdirSync(NC, { recursive: true });

const matrix = JSON.parse(fs.readFileSync(path.join(OUT, "test-matrix.json"), "utf8"));
const mine = matrix.rows.filter((_, i) => i % 5 === 2);

// --- axis mappers -----------------------------------------------------------
// tooling axis -> engine operation_type enum (face|pocket|contour|drill|tap|bore|slot|3d_surface|adaptive)
function opType(tooling) {
  switch (tooling) {
    case "face": return "face";
    case "drill": return "drill";
    case "tap": return "tap";
    case "bore": return "bore";
    case "ballbull3d": return "3d_surface";
    case "adaptive": return "adaptive";
    case "endmill": return "contour"; // solid endmill default to contour (pocket also valid)
    default: return "contour";
  }
}
function materialIso(m) { return m; } // P/M/K/N/S/H map 1:1 to engine ISO group

// representative cutting params per material+op (mm-native). Conservative but real.
// spindle_rpm clamped to machine max_rpm to avoid an over-speed safety reject masking a true gap.
function paramsFor(row) {
  const meta = row._meta;
  const mat = row.material;
  const op = opType(row.tooling);
  // base SFM-ish defaults translated to rpm for a ~10mm tool, derated by aggressiveness band
  const baseRpm = { P: 3000, M: 2200, K: 3500, N: 9000, S: 1400, H: 1800 }[mat] ?? 3000;
  const baseFeed = { P: 600, M: 400, K: 700, N: 1800, S: 280, H: 320 }[mat] ?? 500;
  const aggr = { L1: 0.6, L2: 0.75, L3: 0.9, L4: 1.0, L5: 1.1, prove_out: 0.5,
                 max_force_N: 0.85, adv_frac: 0.8 }[row.parameter_settings] ?? 0.9;
  let rpm = Math.round(baseRpm * (op === "drill" || op === "tap" ? 0.4 : 1));
  rpm = Math.min(rpm, meta.machine_max_rpm);
  const diam = (op === "face") ? 50 : (op === "drill" || op === "tap" || op === "bore") ? 10 : 12;
  const flutes = (op === "face") ? 5 : (op === "drill") ? 2 : (op === "tap") ? 3 : 4;
  let feed = Math.round(baseFeed * aggr);
  if (op === "tap") {
    // rigid tap: feed = pitch * rpm. Use M6x1.0 -> pitch 1.0mm.
    feed = Math.round(1.0 * rpm);
  }
  const axial = (op === "face") ? 1.0 : (op === "drill" || op === "bore") ? 5.0 : (op === "tap") ? 12.0 : 2.0;
  const radial = (op === "face") ? 40 : (op === "3d_surface") ? 0.5 : (op === "adaptive") ? 1.2 : 6.0;
  // coolant: tsc only if machine supports through-spindle, else flood (mist for finishing 3d on dry-ish).
  let coolant = "flood";
  if (row.optional_packages === "tsc" && meta.machine_coolant_through) coolant = "tsc";
  // build a small but real toolpath: rapid in, plunge, two cuts, retract
  const coords = (() => {
    if (op === "drill" || op === "tap" || op === "bore") {
      return [
        { x: 25.4, y: 25.4, z: 5, type: "rapid" },
        { x: 25.4, y: 25.4, z: -10, type: "linear" },
        { x: 25.4, y: 25.4, z: 5, type: "rapid" },
      ];
    }
    return [
      { x: 0, y: 0, z: 5, type: "rapid" },
      { x: 0, y: 0, z: -axial, type: "linear" },
      { x: 50, y: 0, z: -axial, type: "linear" },
      { x: 50, y: 30, z: -axial, type: "linear" },
      { x: 0, y: 30, z: -axial, type: "linear" },
      { x: 0, y: 0, z: -axial, type: "linear" },
      { x: 0, y: 0, z: 5, type: "rapid" },
    ];
  })();
  return {
    operation_type: op,
    tool_number: 1,
    tool_diameter_mm: diam,
    tool_flutes: flutes,
    tool_description: `${row.tooling} ${row.coating} (${row.insert})`,
    material_iso: materialIso(mat),
    spindle_rpm: rpm,
    feed_mm_min: feed,
    axial_depth_mm: axial,
    radial_depth_mm: radial,
    coolant,
    coordinates: coords,
  };
}

function configFor(row) {
  const meta = row._meta;
  const ulti = row.motion_type === "ulti-on" || row.motion_type === "g05.1q1" ||
               row.optional_packages === "ultimotion-pkg" || row.controller_settings === "hsm-g05p1";
  const conv = row.motion_type === "conversational" || row.optional_packages === "g65-macro";
  const units = row.controller_settings === "units-inch-g20" ? "inch" : "metric";
  let coolantMode = "flood";
  if (row.optional_packages === "tsc" && meta.machine_coolant_through) coolantMode = "tsc";
  return {
    program_number: 1000 + row.row_id,
    program_comment: `CHUNK3 ROW${row.row_id} ${row.material}/${row.tooling}/${row.machine}`,
    use_conversational: conv,
    use_ultimotion: ulti,
    coolant_mode: coolantMode,
    work_offset: 54,
    units,
    safe_z_mm: 25,
  };
}

// --- live bridge call -------------------------------------------------------
async function callBridge(action, args) {
  const res = await fetch("http://127.0.0.1:3100/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call",
      params: { name: "prism_cam", arguments: { action, params: args } } }),
  });
  const text = await res.text();
  // SSE or plain JSON — extract the JSON object (last data: line if SSE)
  let payload = text;
  if (text.includes("data:")) {
    const lines = text.split(/\r?\n/).filter((l) => l.startsWith("data:"));
    payload = lines[lines.length - 1].slice(5).trim();
  }
  let parsed;
  try { parsed = JSON.parse(payload); } catch (e) {
    return { ok: false, err: `bridge-parse: ${e.message}`, raw: text.slice(0, 400) };
  }
  if (parsed.error) return { ok: false, err: `jsonrpc-error: ${JSON.stringify(parsed.error).slice(0,300)}` };
  const inner = parsed?.result?.content?.[0]?.text;
  if (!inner) return { ok: false, err: "no result.content[0].text", raw: JSON.stringify(parsed).slice(0,400) };
  let obj;
  try { obj = JSON.parse(inner); } catch (e) {
    return { ok: false, err: `result-parse: ${e.message}`, raw: inner.slice(0, 400) };
  }
  return { ok: true, obj };
}

// extract gcode string from sealed package (sealMasterPostOutput wraps engine output)
function extractGcode(obj) {
  // sealed master-post shape: { engine_output: { gcode: string[] }, sidecar }
  const arrCands = [obj?.engine_output?.gcode, obj?.gcode, obj?.engine_output?.nc];
  for (const a of arrCands) {
    if (Array.isArray(a) && a.length > 0) return a.join("\n");
  }
  // try common string shapes
  const cands = [
    obj.gcode, obj.nc, obj.program, obj.output,
    obj?.gcode_program, obj?.result?.gcode,
    obj?.sealed?.gcode, obj?.package?.gcode,
    obj?.engine_output?.gcode,
  ];
  for (const c of cands) if (typeof c === "string" && c.length > 0) return c;
  // deep search for a string field that looks like gcode
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && /(^|\n)\s*[NGMTOS%]/.test(v) && v.length > 40) return v;
    if (v && typeof v === "object") {
      for (const [, v2] of Object.entries(v)) {
        if (typeof v2 === "string" && /(^|\n)\s*[NGMTOS%]/.test(v2) && v2.length > 40) return v2;
      }
    }
  }
  return null;
}

function runValidator(script, file, extra = []) {
  try {
    const out = execFileSync(process.execPath, [path.join(ROOT, "scripts", script), file, ...extra],
      { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    // ENOENT/spawn failures are infra, not a validator verdict — surface explicitly
    return { code: e.status ?? -1, out: (e.stdout || "") + (e.stderr || ""), err: e.message, spawn: e.code };
  }
}

// Lint verdict: PASS iff 0 errors (warnings are allowed). Format: "N error · M warn".
function lintVerdict(r) {
  if (r.spawn) return { pass: false, infra: r.spawn }; // spawn failure, not a real verdict
  const m = r.out.match(/total:\s*(\d+)\s*error/i) || r.out.match(/(\d+)\s*error\b/i);
  const errCount = m ? parseInt(m[1], 10) : (/\berror\b/i.test(r.out) ? 1 : 0);
  return { pass: errCount === 0 && r.code === 0, errors: errCount };
}
// Conformance verdict: PASS iff zero FAIL checks. Format: "X/Y (score Z%)" + per-check PASS/FAIL.
function confVerdict(r) {
  if (r.spawn) return { pass: false, infra: r.spawn };
  const score = r.out.match(/(\d+)\/(\d+)\s*\(score\s*(\d+)%\)/);
  const failLines = (r.out.match(/^\s*FAIL\b.*$/gim) || []).map((l) => l.trim());
  return {
    pass: failLines.length === 0 && r.code === 0,
    score: score ? `${score[1]}/${score[2]} (${score[3]}%)` : null,
    failChecks: failLines,
  };
}

const results = [];
for (const row of mine) {
  const rec = { row_id: row.row_id, combo: `${row.material}/${row.tooling}/${row.machine}/${row.motion_type}/${row.optional_packages}/${row.controller_settings}`,
    generated: false, lintPass: false, conformancePass: false, failures: [] };
  const op = paramsFor(row);
  const cfg = configFor(row);
  rec.units = cfg.units;
  rec.op_type = op.operation_type;
  rec.spindle_rpm = op.spindle_rpm;
  rec.coolant = op.coolant;
  try {
    const call = await callBridge("master_post_hurco_v11", { operations: [op], config: cfg });
    if (!call.ok) {
      rec.failures.push({ stage: "generate", issue: call.err + (call.raw ? ` | raw=${call.raw}` : "") });
      results.push(rec); continue;
    }
    const gcode = extractGcode(call.obj);
    if (!gcode) {
      // generator may have returned a rejection/error object — that is a REAL finding
      const errMsg = call.obj?.error || call.obj?.message || call.obj?.reason ||
                     `no gcode in result; keys=${Object.keys(call.obj).join(",")}`;
      rec.failures.push({ stage: "generate", issue: `engine returned no gcode: ${typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg).slice(0,300)}` });
      // persist the raw object for forensic
      fs.writeFileSync(path.join(NC, `chunk3-row${row.row_id}.reject.json`), JSON.stringify(call.obj, null, 2));
      results.push(rec); continue;
    }
    rec.generated = true;
    const file = path.join(NC, `chunk3-row${row.row_id}.nc`);
    fs.writeFileSync(file, gcode);
    rec.bytes = gcode.length;
    // lint (hurco dialect)
    const lint = runValidator("post-nc-dialect-lint.mjs", file, ["--dialect", "hurco"]);
    rec.lintPass = verdict(lint);
    if (!rec.lintPass) rec.failures.push({ stage: "lint", issue: lint.out.trim().split(/\r?\n/).filter(Boolean).slice(-6).join(" | ").slice(0, 500) || lint.err || `exit ${lint.code}` });
    // conformance
    const conf = runValidator("post-nc-conformance.mjs", file, []);
    rec.conformancePass = verdict(conf);
    if (!rec.conformancePass) rec.failures.push({ stage: "conformance", issue: conf.out.trim().split(/\r?\n/).filter(Boolean).slice(-6).join(" | ").slice(0, 500) || conf.err || `exit ${conf.code}` });
  } catch (e) {
    rec.failures.push({ stage: "generate", issue: `driver-exception: ${e.message}` });
  }
  results.push(rec);
}

fs.writeFileSync(path.join(OUT, "chunk3-results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ count: results.length,
  generated: results.filter(r => r.generated).length,
  lintPass: results.filter(r => r.lintPass).length,
  conformancePass: results.filter(r => r.conformancePass).length }, null, 0));
