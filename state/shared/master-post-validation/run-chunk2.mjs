#!/usr/bin/env node
/**
 * run-chunk2.mjs — chunk 2/5 driver for the master Hurco post test matrix.
 * Rows where (rowIndex % 5) === 1. Maps each combo to master_post_hurco_v11
 * params, POSTs to :3100 (stateless MCP, retry-on-transport-collision),
 * writes NC, runs dialect-lint + conformance. Records every failure.
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = "H:/prism";
const OUT = path.join(ROOT, "state/shared/master-post-validation");
const NC = path.join(OUT, "nc");
const MATRIX = path.join(OUT, "test-matrix.json");
const MCP = "http://127.0.0.1:3100/mcp";
const CAP = 40; // hard cap per task; chunk is 26 so no truncation expected

const matrix = JSON.parse(fs.readFileSync(MATRIX, "utf8"));
const mine = matrix.rows.filter((_, i) => (i % 5) === 1);

// ---- combo → engine param mapping --------------------------------------
// material axis → ISO group letter the engine expects
function materialIso(m) {
  // matrix material values are already ISO letters P/M/K/N/S/H
  return String(m).toUpperCase();
}

// tooling axis → operation_type enum
// engine enums: face|pocket|contour|drill|tap|bore|slot|3d_surface|adaptive
function operationType(tooling, motion) {
  switch (tooling) {
    case "face": return "face";
    case "endmill": return "pocket";        // generic endmill → pocket
    case "ballbull3d": return "3d_surface";
    case "drill": return "drill";
    case "tap": return "tap";
    case "bore": return "bore";
    case "adaptive": return "adaptive";
    default: return "contour";
  }
}

// representative tool diameter (mm) by op
function toolDiaMm(op) {
  switch (op) {
    case "face": return 50;
    case "drill": return 8;
    case "tap": return 6;     // M6 tap
    case "bore": return 20;
    case "3d_surface": return 6;
    case "adaptive": return 12;
    case "pocket": return 10;
    default: return 10;
  }
}
function toolFlutes(op) {
  switch (op) {
    case "face": return 5;
    case "drill": return 2;
    case "tap": return 3;
    case "bore": return 1;
    case "3d_surface": return 2;
    default: return 4;
  }
}

// aggressiveness label → feed scale factor (per matrix labels)
function feedScale(ps) {
  const map = { L1: 0.6, L2: 0.75, L3: 0.9, L4: 1.0, L5: 1.1, prove_out: 0.5 };
  return map[ps] ?? 0.85;
}

// material → baseline spindle rpm / feed for a generic op (clamped to machine)
function baseSpeeds(mat, op, maxRpm) {
  // conservative shop-floor baselines keyed by ISO group
  const rpmBase = { P: 3500, M: 2800, K: 4000, N: 9000, S: 1800, H: 2200 }[mat] ?? 3000;
  const feedBase = { P: 600, M: 450, K: 700, N: 1800, S: 300, H: 350 }[mat] ?? 600;
  let rpm = rpmBase;
  // drill/tap/bore run slower
  if (op === "drill") rpm = Math.round(rpm * 0.6);
  if (op === "bore") rpm = Math.round(rpm * 0.5);
  if (op === "tap") rpm = Math.round(rpm * 0.3);
  rpm = Math.min(rpm, maxRpm || 12000);
  return { rpm, feed: feedBase };
}

// coolant: tsc package → tsc (only if machine coolant_through), else flood;
// off for dry HSM on aluminum-finish ZrN is not modeled — keep flood/tsc/off.
function coolantMode(pkg, coolantThrough, op) {
  if (pkg === "tsc" && coolantThrough) return "tsc";
  if (op === "tap") return "flood";
  return "flood";
}

function unitsOf(ctrl) {
  return ctrl === "units-inch-g20" ? "inch" : "metric";
}

function buildParams(row) {
  const meta = row._meta;
  const mat = materialIso(row.material);
  const op = operationType(row.tooling, row.motion_type);
  const maxRpm = meta.machine_max_rpm || 12000;
  const { rpm, feed } = baseSpeeds(mat, op, maxRpm);
  const fScale = feedScale(row.parameter_settings);
  const feedScaled = Math.round(feed * fScale);
  const dia = toolDiaMm(op);
  const cool = coolantMode(row.optional_packages, meta.machine_coolant_through, op);

  // motion/package → engine config flags
  const useUlti =
    row.motion_type === "ulti-on" ||
    row.optional_packages === "ultimotion-pkg" ||
    row.controller_settings === "hsm-g05p1";
  const useConv =
    row.motion_type === "conversational" ||
    row.optional_packages === "g65-macro";

  // work offset: engine schema requires the literal work-offset REGISTER
  // value (>=54): G54=54..G59=59. Default G54 (=54). The matrix
  // workoffset-g54.1 combo exercises a non-default register — use G55 (55).
  let workOffset = 54;
  if (row.controller_settings === "workoffset-g54.1") workOffset = 55;

  // simple toolpath: a safe approach → 2 cut moves → retract. INCH jobs use
  // small coordinate magnitudes in mm-native engine (engine is mm-native; the
  // units flag only controls the G20/G21 header + decimal formatting).
  const z0 = 5, zCut = -2;
  // engine coordinate type enum: "rapid"|"linear"|"arc_cw"|"arc_ccw"
  const coordinates = [
    { x: 0, y: 0, z: z0, type: "rapid" },
    { x: 0, y: 0, z: zCut, type: "linear" },
    { x: 40, y: 0, z: zCut, type: "linear" },
    { x: 40, y: 30, z: zCut, type: "linear" },
    { x: 0, y: 0, z: z0, type: "rapid" },
  ];

  const operation = {
    operation_type: op,
    tool_number: 1,
    tool_diameter_mm: dia,
    tool_flutes: toolFlutes(op),
    tool_description: `${row.tooling} ${mat} ${row.coating}`,
    material_iso: mat,
    spindle_rpm: rpm,
    feed_mm_min: feedScaled,
    axial_depth_mm: op === "drill" || op === "bore" ? 12 : 2,
    radial_depth_mm: op === "face" ? 40 : dia * 0.4,
    coolant: cool,
    coordinates,
  };

  const config = {
    program_number: 5000 + row.row_id,
    program_comment: `CHUNK2 ROW${row.row_id} ${mat} ${row.tooling} ${row.machine}`,
    use_conversational: useConv,
    use_ultimotion: useUlti,
    coolant_mode: cool,
    work_offset: workOffset,
    units: unitsOf(row.controller_settings),
    safe_z_mm: 25,
  };

  return { operations: [operation], config };
}

// ---- gcode extractor (verified live shape) ------------------------------
// { engine_output: { gcode: string[], block_annotations:[...] }, sidecar }
function extractGcode(p) {
  const fromArrayOrStr = (v) => Array.isArray(v) ? v.join("\n") : (typeof v === "string" ? v : null);
  const g =
    fromArrayOrStr(p?.engine_output?.gcode) ||
    fromArrayOrStr(p?.gcode) ||
    fromArrayOrStr(p?.program) || fromArrayOrStr(p?.nc) ||
    fromArrayOrStr(p?.output?.gcode) || fromArrayOrStr(p?.sealed?.gcode) ||
    fromArrayOrStr(p?.result?.gcode) ||
    (typeof p?._rawText === "string" && /[GM]\d/.test(p._rawText) ? p._rawText : null);
  return (g && g.trim().length > 0) ? g : null;
}

// ---- live drive with transport-collision retry --------------------------
async function callTool(action, params) {
  let lastErr = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const r = await fetch(MCP, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now() + attempt, method: "tools/call", params: { name: "prism_cam", arguments: { action, params } } }),
      });
      const ct = r.headers.get("content-type") || "";
      const t = await r.text();
      if (r.status === 200 && !t.startsWith("<!DOCTYPE")) {
        // parse JSON or SSE
        let payload;
        if (ct.includes("text/event-stream")) {
          const dataLines = t.split(/\r?\n/).filter(l => l.startsWith("data:")).map(l => l.slice(5).trim());
          payload = JSON.parse(dataLines.join(""));
        } else {
          payload = JSON.parse(t);
        }
        if (payload.error) return { ok: false, rpcError: payload.error };
        const inner = payload?.result?.content?.[0]?.text;
        // Empty/contentless 200 = server crash-window artifact (the :3100
        // server crash-loops under fleet load). Treat as retryable flake,
        // NOT a fake success — this is the bug that wrote 0-byte NC files.
        if (inner == null || inner === "") {
          lastErr = "empty-content-window (server likely restarting)";
          await new Promise(res => setTimeout(res, 400 * (attempt + 1)));
          continue;
        }
        let parsed;
        try { parsed = JSON.parse(inner); } catch { parsed = { _rawText: inner }; }
        // If the parse is a real engine reject (success:false) surface it.
        if (parsed && parsed.success === false) return { ok: true, parsed };
        // Require usable gcode; an empty {} parse is another crash artifact.
        const g = extractGcode(parsed);
        if (!g) {
          lastErr = "no-gcode-in-200 (keys=" + Object.keys(parsed || {}).join(",") + ")";
          await new Promise(res => setTimeout(res, 400 * (attempt + 1)));
          continue;
        }
        return { ok: true, parsed, gcode: g };
      }
      lastErr = "transport-collision status=" + r.status;
      await new Promise(res => setTimeout(res, 300 * (attempt + 1)));
    } catch (e) {
      lastErr = e.message;
      await new Promise(res => setTimeout(res, 200 * (attempt + 1)));
    }
  }
  return { ok: false, transportError: lastErr };
}

function runValidator(scriptRel, file, extraArgs = []) {
  try {
    const out = execFileSync("node", [path.join(ROOT, scriptRel), file, ...extraArgs, "--json"], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60000,
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? -1, out: (e.stdout || "") + (e.stderr || "") };
  }
}

// ---- main ---------------------------------------------------------------
const results = [];
const failures = [];
let generated = 0, lintPass = 0, conformancePass = 0;
const toRun = mine.slice(0, CAP);
const capped = mine.length > CAP;

for (const row of toRun) {
  const rec = { row_id: row.row_id, combo: `${row.material}/${row.tooling}/${row.machine}/${row.motion_type}/${row.optional_packages}/${row.controller_settings}`, units: null, generated: false, lint: null, conformance: null };
  const params = buildParams(row);
  rec.units = params.config.units;
  const ncFile = path.join(NC, `chunk2-row${row.row_id}.nc`);

  const res = await callTool("master_post_hurco_v11", params);
  if (!res.ok) {
    const issue = res.rpcError ? `generator rejected: ${res.rpcError.message}` : `transport: ${res.transportError}`;
    failures.push({ combo: rec.combo, stage: "generate", issue });
    rec.genError = issue;
    results.push(rec);
    continue;
  }
  // extract gcode from sealed package. Verified live shape:
  //   { engine_output: { gcode: string[], block_annotations: [...] }, sidecar }
  // gcode is an ARRAY of lines under engine_output. Fall back to other shapes.
  const p = res.parsed;
  const fromArrayOrStr = (v) => Array.isArray(v) ? v.join("\n") : (typeof v === "string" ? v : null);
  let gcode =
    fromArrayOrStr(p?.engine_output?.gcode) ||
    fromArrayOrStr(p?.gcode) ||
    fromArrayOrStr(p?.program) || fromArrayOrStr(p?.nc) ||
    fromArrayOrStr(p?.output?.gcode) || fromArrayOrStr(p?.sealed?.gcode) ||
    fromArrayOrStr(p?.result?.gcode);
  if (!gcode && p?.success === false) {
    const issue = `generator returned success=false: ${p.error || p.message || JSON.stringify(p).slice(0,200)}`;
    failures.push({ combo: rec.combo, stage: "generate", issue });
    rec.genError = issue;
    results.push(rec);
    continue;
  }
  if (!gcode && typeof p?._rawText === "string") gcode = p._rawText;
  if (!gcode) {
    // last resort: deep-scan for a string with G-code lines
    const scan = JSON.stringify(p);
    const issue = `no gcode field in response; top keys: ${Object.keys(p || {}).join(",")}`;
    failures.push({ combo: rec.combo, stage: "generate", issue });
    rec.genError = issue;
    rec.responseKeys = Object.keys(p || {});
    results.push(rec);
    continue;
  }
  fs.writeFileSync(ncFile, gcode, "utf8");
  rec.generated = true;
  rec.ncFile = ncFile;
  rec.gcodeLines = gcode.split(/\r?\n/).length;
  generated++;

  // lint (hurco dialect)
  const lint = runValidator("scripts/post-nc-dialect-lint.mjs", ncFile, ["--dialect", "hurco"]);
  rec.lint = { code: lint.code };
  let lintJson = null;
  try { lintJson = JSON.parse(lint.out); } catch {}
  if (lint.code === 0) { lintPass++; rec.lint.pass = true; }
  else {
    rec.lint.pass = false;
    const detail = lintJson ? summarizeLint(lintJson) : lint.out.slice(0, 300);
    failures.push({ combo: rec.combo, stage: "lint", issue: `exit=${lint.code} ${detail}` });
    rec.lint.detail = detail;
  }

  // conformance (static)
  const conf = runValidator("scripts/post-nc-conformance.mjs", ncFile, []);
  rec.conformance = { code: conf.code };
  let confJson = null;
  try { confJson = JSON.parse(conf.out); } catch {}
  if (conf.code === 0) { conformancePass++; rec.conformance.pass = true; }
  else {
    rec.conformance.pass = false;
    const detail = confJson ? summarizeConf(confJson) : conf.out.slice(0, 300);
    failures.push({ combo: rec.combo, stage: "conformance", issue: `exit=${conf.code} ${detail}` });
    rec.conformance.detail = detail;
  }
  results.push(rec);
}

function summarizeLint(j) {
  // structure unknown; pull error-ish arrays
  const errs = [];
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object") {
      if (o.severity === "error" || o.level === "error") errs.push(o.message || o.rule || JSON.stringify(o).slice(0,80));
      Object.values(o).forEach(walk);
    }
  };
  walk(j);
  return errs.length ? errs.slice(0, 4).join(" | ") : (j.summary || JSON.stringify(j).slice(0, 200));
}
function summarizeConf(j) {
  if (j.error) return j.error;
  const issues = j.issues || j.violations || j.errors || [];
  if (Array.isArray(issues) && issues.length) return issues.slice(0,4).map(x => x.message || x.rule || JSON.stringify(x).slice(0,80)).join(" | ");
  return j.summary || JSON.stringify(j).slice(0, 200);
}

const summary = {
  chunk: 2, total_in_chunk: mine.length, run: toRun.length, capped,
  generated, lintPass, conformancePass, failureCount: failures.length,
};
fs.writeFileSync(path.join(OUT, "chunk2-results.json"), JSON.stringify({ summary, results, failures }, null, 2));
console.log(JSON.stringify(summary));
console.log("FAILURES:" + failures.length);
for (const f of failures) console.log("  ["+f.stage+"] "+f.combo+" :: "+f.issue.slice(0,160));
