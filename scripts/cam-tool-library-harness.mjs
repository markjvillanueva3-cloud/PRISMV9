#!/usr/bin/env node
/**
 * cam-tool-library-harness.mjs -- emit + VALIDATE the per-brand CAM tool libraries for all
 * three CAM systems (Fusion / hyperMILL / Mastercam), then write a coverage report.
 *
 * WHY (slot:romeo, 2026-06-19): the operator asked for "harnesses, loops and crons". This is
 * the harness: a single repeatable command that regenerates every brand library AND proves each
 * emitted file is structurally importable (R15 VALIDATE), failing loud (exit 1) on any bad file
 * so a nightly cron can trust it. It is the formal, regenerable replacement for the now-missing
 * 2026-06-15 generate-fullcorpus-*.ts scripts ([[reference_fullcorpus_cam_export_2026_06_15]]),
 * and it adds the geometry-plausibility gate that earlier export lacked (it only did NaN->0).
 *
 * VALIDATION per format (every emitted file; SYNCHRONOUS + portable -- no native bindings):
 *   fusion     -> parse JSON, assert {version:2, data:[]}, every tool has a numeric geometry.DC
 *   hypermill  -> structural SQL: Tools DDL present + every INSERT INTO Tools has 13-field arity
 *                 (string-literal-aware split, so a comma inside a quoted name does not false-fail).
 *                 (Deep SQLite round-trip is proven separately in emit-brand-tool-libraries tests.)
 *   mastercam  -> parse CSV, assert header == known columns, every data row has the right arity
 *                 and a numeric Diameter_mm.
 *
 * Usage:
 *   node scripts/cam-tool-library-harness.mjs [--formats fusion,hypermill,mastercam]
 *        [--validate-only] [--out <dir>] [--self-test]
 * Exit code: 0 = all libraries valid; 1 = at least one validation failure (cron-safe).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBrandCatalog } from "./lib/brand-tool-catalog.mjs";
import { emitLibraries, MASTERCAM_TOOL_COLUMNS, MASTERCAM_INSERT_COLUMNS, MASTERCAM_HOLDER_COLUMNS } from "./emit-brand-tool-libraries.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = path.resolve(HERE, "../state/shared/tool-libraries");
const ALL_FORMATS = ["fusion", "hypermill", "mastercam", "mastercam-inserts", "hypermill-inserts", "mastercam-holders", "hypermill-holders"];
const HM_TOOLS_INSERT_ARITY = 13; // columns in an INSERT INTO Tools (...) VALUES (...)

// ## Per-format validators (take file content + name -> {ok, tools, errors[]})

export function validateFusionContent(text, file = "") {
  const errors = [];
  let lib;
  try { lib = JSON.parse(text); } catch (e) { return { ok: false, tools: 0, errors: [`${file}: bad JSON -- ${e.message}`] }; }
  if (lib.version !== 2) errors.push(`${file}: version != 2`);
  if (!Array.isArray(lib.data)) return { ok: false, tools: 0, errors: [`${file}: data is not an array`] };
  let bad = 0;
  for (const t of lib.data) {
    const dc = t?.geometry?.DC;
    if (typeof dc !== "number" || !(dc > 0)) bad += 1;
  }
  if (bad > 0) errors.push(`${file}: ${bad} tools with missing/non-positive geometry.DC`);
  return { ok: errors.length === 0, tools: lib.data.length, errors };
}

// split a SQL VALUES tuple on top-level commas (respecting '...' literals with '' escapes)
export function splitSqlValues(s) {
  const out = [];
  let cur = "", inStr = false;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (inStr) {
      if (c === "'" && s[i + 1] === "'") { cur += "''"; i += 1; }
      else if (c === "'") { inStr = false; cur += c; }
      else cur += c;
    } else if (c === "'") { inStr = true; cur += c; }
    else if (c === ",") { out.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  if (cur.trim() !== "") out.push(cur.trim());
  return out;
}

export function validateHypermillContent(text, file = "") {
  const errors = [];
  if (!/CREATE TABLE IF NOT EXISTS Tools/.test(text)) errors.push(`${file}: missing Tools DDL`);
  const inserts = text.split("\n").filter((l) => l.startsWith("INSERT INTO Tools"));
  // FK coverage: every tool_type_id (2nd VALUES field) must be declared in a GeometryClasses
  // INSERT -- a missing class aborts the real SQLite binary build (FK constraint), which the
  // arity-only check would miss (observed: thread-mill type 15 absent from GeometryClasses).
  const declared = new Set();
  for (const l of text.split("\n")) {
    const dm = l.match(/INSERT OR IGNORE INTO GeometryClasses \(id, name\) VALUES \((\d+),/);
    if (dm) declared.add(dm[1]);
  }
  let arityBad = 0, fkBad = 0;
  for (const line of inserts) {
    const m = line.match(/VALUES \((.*)\);?\s*$/);
    if (!m) { arityBad += 1; continue; }
    const fields = splitSqlValues(m[1]);
    if (fields.length !== HM_TOOLS_INSERT_ARITY) arityBad += 1;
    const typeId = (fields[1] || "").trim();
    if (typeId && !declared.has(typeId)) fkBad += 1;
  }
  if (arityBad > 0) errors.push(`${file}: ${arityBad} Tools INSERT(s) with wrong column arity`);
  if (fkBad > 0) errors.push(`${file}: ${fkBad} Tools INSERT(s) reference an undeclared tool_type_id (FK would fail)`);
  return { ok: errors.length === 0, tools: inserts.length, errors };
}

// RFC-4180 single-line CSV parse (handles quoted cells with embedded commas/escaped quotes)
export function parseCsvLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export function validateMastercamContent(text, file = "") {
  const errors = [];
  const lines = text.replace(/\r\n/g, "\n").trim().split("\n");
  if (lines.length === 0 || lines[0] === "") return { ok: false, tools: 0, errors: [`${file}: empty`] };
  if (lines[0] !== MASTERCAM_TOOL_COLUMNS.join(",")) errors.push(`${file}: header mismatch`);
  const cols = MASTERCAM_TOOL_COLUMNS.length;
  const diaIdx = MASTERCAM_TOOL_COLUMNS.indexOf("Diameter_mm");
  let bad = 0;
  for (let i = 1; i < lines.length; i += 1) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length !== cols || !(parseFloat(fields[diaIdx]) > 0)) bad += 1;
  }
  if (bad > 0) errors.push(`${file}: ${bad} data row(s) with wrong arity or non-positive Diameter_mm`);
  return { ok: errors.length === 0, tools: lines.length - 1, errors };
}

export function validateMastercamInsertContent(text, file = "") {
  const errors = [];
  const lines = text.replace(/\r\n/g, "\n").trim().split("\n");
  if (lines.length === 0 || lines[0] === "") return { ok: false, tools: 0, errors: [`${file}: empty`] };
  if (lines[0] !== MASTERCAM_INSERT_COLUMNS.join(",")) errors.push(`${file}: header mismatch`);
  const cols = MASTERCAM_INSERT_COLUMNS.length;
  const icIdx = MASTERCAM_INSERT_COLUMNS.indexOf("InscribedCircle_mm");
  const crIdx = MASTERCAM_INSERT_COLUMNS.indexOf("CornerRadius_mm");
  let bad = 0;
  for (let i = 1; i < lines.length; i += 1) {
    const f = parseCsvLine(lines[i]);
    // a usable insert row needs the right arity AND at least one of {IC, corner radius}
    if (f.length !== cols || (!(parseFloat(f[icIdx]) > 0) && !(parseFloat(f[crIdx]) > 0))) bad += 1;
  }
  if (bad > 0) errors.push(`${file}: ${bad} row(s) with wrong arity or no geometry`);
  return { ok: errors.length === 0, tools: lines.length - 1, errors };
}

const HM_INSERTS_INSERT_ARITY = 8; // columns in an INSERT INTO Inserts (...) VALUES (...)
export function validateHypermillInsertContent(text, file = "") {
  const errors = [];
  if (!/CREATE TABLE IF NOT EXISTS Inserts/.test(text)) errors.push(`${file}: missing Inserts DDL`);
  const inserts = text.split("\n").filter((l) => l.startsWith("INSERT INTO Inserts"));
  let arityBad = 0;
  for (const line of inserts) {
    const m = line.match(/VALUES \((.*)\);?\s*$/);
    if (!m || splitSqlValues(m[1]).length !== HM_INSERTS_INSERT_ARITY) arityBad += 1;
  }
  if (arityBad > 0) errors.push(`${file}: ${arityBad} Inserts INSERT(s) with wrong column arity`);
  return { ok: errors.length === 0, tools: inserts.length, errors };
}

export function validateMastercamHolderContent(text, file = "") {
  const errors = [];
  const lines = text.replace(/\r\n/g, "\n").trim().split("\n");
  if (lines.length === 0 || lines[0] === "") return { ok: false, tools: 0, errors: [`${file}: empty`] };
  if (lines[0] !== MASTERCAM_HOLDER_COLUMNS.join(",")) errors.push(`${file}: header mismatch`);
  const cols = MASTERCAM_HOLDER_COLUMNS.length;
  const bodyIdx = MASTERCAM_HOLDER_COLUMNS.indexOf("BodyDiameter_mm");
  let bad = 0;
  for (let i = 1; i < lines.length; i += 1) {
    const f = parseCsvLine(lines[i]);
    if (f.length !== cols || !(parseFloat(f[bodyIdx]) > 0)) bad += 1; // body diameter required
  }
  if (bad > 0) errors.push(`${file}: ${bad} row(s) with wrong arity or non-positive BodyDiameter_mm`);
  return { ok: errors.length === 0, tools: lines.length - 1, errors };
}

const HM_HOLDERS_INSERT_ARITY = 9; // columns in an INSERT INTO Holders (...) VALUES (...)
export function validateHypermillHolderContent(text, file = "") {
  const errors = [];
  if (!/CREATE TABLE IF NOT EXISTS Holders/.test(text)) errors.push(`${file}: missing Holders DDL`);
  const inserts = text.split("\n").filter((l) => l.startsWith("INSERT INTO Holders"));
  let arityBad = 0;
  for (const line of inserts) {
    const m = line.match(/VALUES \((.*)\);?\s*$/);
    if (!m || splitSqlValues(m[1]).length !== HM_HOLDERS_INSERT_ARITY) arityBad += 1;
  }
  if (arityBad > 0) errors.push(`${file}: ${arityBad} Holders INSERT(s) with wrong column arity`);
  return { ok: errors.length === 0, tools: inserts.length, errors };
}

const VALIDATORS = {
  fusion: validateFusionContent, hypermill: validateHypermillContent,
  mastercam: validateMastercamContent, "mastercam-inserts": validateMastercamInsertContent,
  "hypermill-inserts": validateHypermillInsertContent,
  "mastercam-holders": validateMastercamHolderContent, "hypermill-holders": validateHypermillHolderContent,
};

// ## Harness driver (synchronous, portable)
export function runHarness({ outDir = DEFAULT_OUT, formats = ALL_FORMATS, emit = true } = {}) {
  const report = { formats: {}, allValid: true };
  const catalog = emit ? loadBrandCatalog() : null;

  for (const format of formats) {
    if (emit) emitLibraries({ catalog, format, outDir });
    const formatDir = path.join(outDir, format);
    let files = [];
    try { files = fs.readdirSync(formatDir).filter((f) => f !== "MANIFEST.json" && !f.startsWith(".")); } catch { /* dir absent */ }

    const validate = VALIDATORS[format];
    const fileResults = [];
    let totalTools = 0, validFiles = 0;
    for (const f of files) {
      const res = validate(fs.readFileSync(path.join(formatDir, f), "utf8"), f);
      totalTools += res.tools;
      if (res.ok) validFiles += 1; else report.allValid = false;
      fileResults.push({ file: f, ok: res.ok, tools: res.tools, errors: res.errors });
    }
    report.formats[format] = {
      files: files.length, validFiles, totalTools,
      failures: fileResults.filter((r) => !r.ok),
    };
  }
  return report;
}

// ## Self-test (validators against synthetic valid + known-bad content)
function selfTest() {
  const checks = [];
  const ok = (n, c) => checks.push({ name: n, ok: !!c });

  ok("fusion valid", validateFusionContent(JSON.stringify({ version: 2, data: [{ geometry: { DC: 6 } }] })).ok === true);
  ok("fusion bad json", validateFusionContent("{not json").ok === false);
  ok("fusion missing DC", validateFusionContent(JSON.stringify({ version: 2, data: [{ geometry: {} }] })).ok === false);
  ok("fusion wrong version", validateFusionContent(JSON.stringify({ version: 1, data: [] })).ok === false);

  const goodSql = "CREATE TABLE IF NOT EXISTS Tools (x);\nINSERT INTO Tools (cols) VALUES (1, 2, 'EM', 'EM', 1, 1, 1, 50.0, 6.0, 10.0, 6.0, 0.0, 4);";
  ok("hypermill valid (13 fields)", validateHypermillContent(goodSql).ok === true && validateHypermillContent(goodSql).tools === 1);
  ok("hypermill arity-bad", validateHypermillContent("CREATE TABLE IF NOT EXISTS Tools (x);\nINSERT INTO Tools (a) VALUES (1, 2, 3);").ok === false);
  ok("hypermill comma-in-name keeps arity", validateHypermillContent("CREATE TABLE IF NOT EXISTS Tools (x);\nINSERT INTO Tools (c) VALUES (1, 2, 'EM, 1/2', 'x', 1, 1, 1, 0.0, 6.0, 0.0, 0.0, 0.0, 4);").ok === true);
  ok("hypermill missing DDL", validateHypermillContent("INSERT INTO Tools (c) VALUES (1);").ok === false);
  ok("splitSqlValues respects quoted commas", splitSqlValues("1, 'a, b', 3").length === 3);

  const hdr = MASTERCAM_TOOL_COLUMNS.join(",");
  ok("mastercam valid", validateMastercamContent(`${hdr}\n1,EM,End Mill,Helical,EM,mm,6,0,10,50,4,6`).ok === true);
  ok("mastercam bad arity", validateMastercamContent(`${hdr}\n1,EM,End Mill`).ok === false);
  ok("mastercam non-positive dia", validateMastercamContent(`${hdr}\n1,EM,End Mill,Helical,EM,mm,0,0,10,50,4,6`).ok === false);
  ok("mastercam quoted comma name OK", validateMastercamContent(`${hdr}\n1,"EM, 1/2",End Mill,Helical,EM,mm,6,0,10,50,4,6`).ok === true);
  ok("mastercam header mismatch", validateMastercamContent("wrong,header\n1,2").ok === false);

  const passed = checks.filter((c) => c.ok).length;
  console.log(`SELF-TEST: ${passed}/${checks.length} passed`);
  checks.forEach((c) => console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.name}`));
  return passed === checks.length;
}

// ## CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) process.exit(selfTest() ? 0 : 1);
  const get = (flag, def) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : def; };
  const formats = get("--formats", ALL_FORMATS.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
  const outDir = get("--out", DEFAULT_OUT);
  const emit = !args.includes("--validate-only");

  const report = runHarness({ outDir, formats, emit });
  try { fs.writeFileSync(path.join(outDir, "HARNESS-REPORT.json"), JSON.stringify(report, null, 2)); } catch { /* dir absent */ }

  console.log(`CAM tool-library harness ${emit ? "(emit + validate)" : "(validate-only)"}:`);
  for (const fmt of formats) {
    const r = report.formats[fmt];
    if (!r) { console.log(`  ${fmt}: (no output dir)`); continue; }
    console.log(`  ${fmt.padEnd(10)} ${r.failures.length ? "FAIL" : "OK"}  ${r.validFiles}/${r.files} files | ${r.totalTools} tools`);
    for (const f of r.failures.slice(0, 5)) console.log(`      x ${f.file}: ${f.errors.join("; ")}`);
  }
  console.log(report.allValid ? "ALL LIBRARIES VALID" : "VALIDATION FAILURES PRESENT");
  process.exit(report.allValid ? 0 : 1);
}
