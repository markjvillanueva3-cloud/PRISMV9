// tier: T3
/**
 * corpus-integrity.mjs — CADCAM-DAGI-MS0/U-DAGI03 guard hook
 *
 * PostToolUse(Write|Edit|MultiEdit) hook that protects the CAD training
 * corpus pipeline. It runs in two modes:
 *
 *   1. Engine-surface check — when CADCorpusIngesterEngine.ts is edited,
 *      assert it still exports the five public methods the dispatcher
 *      and trainers depend on: classify, ingest, dedup, stats, toJsonl.
 *
 *   2. Corpus JSONL integrity — when any file under
 *      mcp-server/data/cad-corpus/*.jsonl is written, stream-parse every
 *      line and reject the write if:
 *        - a line is not valid JSON
 *        - hashes are malformed (not 16 lowercase hex chars)
 *        - required provenance fields are missing
 *        - duplicate hashes appear within the same file (dedup was skipped)
 *
 * Non-matching files are ignored and the hook exits 0.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ENGINE_REL = "mcp-server/src/engines/CADCorpusIngesterEngine.ts";
const CORPUS_DIR_REL = "mcp-server/data/cad-corpus";
const REQUIRED_METHODS = [
  "classify(",
  "ingestOne(",
  "ingest(",
  "dedup(",
  "stats(",
  "toJsonl(",
];
const REQUIRED_ENTRY_FIELDS = [
  "sourcePath",
  "customer",
  "machineCategory",
  "ext",
  "bytes",
  "hash",
  "tokens",
];
const HASH_RE = /^[0-9a-f]{16}$/;

function log(level, msg) {
  const line = `[corpus-integrity] ${level}: ${msg}`;
  (level === "ERROR" ? process.stderr : process.stdout).write(line + "\n");
}

function checkEngineSurface(abs) {
  let src = "";
  try { src = fs.readFileSync(abs, "utf8"); } catch { return []; }
  return REQUIRED_METHODS.filter((m) => !src.includes(m));
}

function checkCorpusJsonl(abs) {
  let raw = "";
  try { raw = fs.readFileSync(abs, "utf8"); } catch (e) { return [`read failed: ${e.message}`]; }
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const errors = [];
  const seenHashes = new Set();
  for (let i = 0; i < lines.length; i++) {
    let obj;
    try { obj = JSON.parse(lines[i]); }
    catch { errors.push(`line ${i + 1}: invalid JSON`); continue; }
    for (const f of REQUIRED_ENTRY_FIELDS) {
      if (!(f in obj)) errors.push(`line ${i + 1}: missing field '${f}'`);
    }
    if (obj.hash && !HASH_RE.test(obj.hash)) {
      errors.push(`line ${i + 1}: hash '${obj.hash}' fails ^[0-9a-f]{16}$`);
    }
    if (obj.hash) {
      if (seenHashes.has(obj.hash)) errors.push(`line ${i + 1}: duplicate hash ${obj.hash} — dedup skipped`);
      seenHashes.add(obj.hash);
    }
  }
  return errors;
}

export default async function corpusIntegrity({ tool, input, result }) {
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) return;
  if (result?.error) return;
  const target = input?.file_path || input?.path || "";
  if (!target) return;
  const normalized = target.replace(/\\/g, "/");
  const cwd = process.cwd();

  if (normalized.endsWith(ENGINE_REL) || normalized.includes("CADCorpusIngesterEngine.ts")) {
    const abs = path.isAbsolute(normalized) ? normalized : path.join(cwd, normalized);
    const missing = checkEngineSurface(abs);
    if (missing.length > 0) {
      for (const m of missing) log("ERROR", `CADCorpusIngesterEngine missing required method: ${m}`);
      process.exitCode = 2;
      return;
    }
    log("INFO", "CADCorpusIngesterEngine surface intact");
    return;
  }

  if (normalized.includes(CORPUS_DIR_REL) && normalized.endsWith(".jsonl")) {
    const abs = path.isAbsolute(normalized) ? normalized : path.join(cwd, normalized);
    const errs = checkCorpusJsonl(abs);
    if (errs.length > 0) {
      for (const e of errs) log("ERROR", e);
      process.exitCode = 2;
      return;
    }
    log("INFO", `corpus JSONL integrity ok (${path.basename(abs)})`);
  }
}
