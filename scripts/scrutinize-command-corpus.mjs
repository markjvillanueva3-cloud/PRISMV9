#!/usr/bin/env node
/**
 * COMMAND-KERNEL-MS0 / U-CK11 — per-category scrutiny pass over the migrated
 * command corpus (`.claude/commands/*.md`).
 *
 * Walks the corpus, parses frontmatter, runs frontmatter + content checks
 * (P0..P3), groups findings BY CATEGORY (frontmatter `category`/`section`/
 * `kind` field, else inferred from the namespace prefix `ns:cmd → ns` or the
 * name prefix `forge-audit → forge`), emits the aggregated report to
 * `state/shared/COMMAND-CORPUS-SCRUTINY.json`.
 *
 * Pure-core (exported helpers) so node:test can hermetically exercise the
 * parsing + categorisation + finding-emit logic. The CLI runner is a thin
 * wrapper around `run()`.
 *
 * @milestone COMMAND-KERNEL-MS0 / U-CK11
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO = resolve(__dirname, "..");
const CMDS_DIR = join(REPO, ".claude", "commands");
const OUT_PATH = join(REPO, "state", "shared", "COMMAND-CORPUS-SCRUTINY.json");

// Schema-derived constants (`.claude/schemas/command-frontmatter.schema.json`).
const NAME_PATTERN = /^[a-z][a-z0-9-]*(:[a-z0-9-]+)?$/;
const MIN_DESC = 16; // schema minLength
const MAX_DESC = 500; // shop-floor heuristic — overlong descriptions are warn-only
const MAX_FILE_BYTES = 50_000;

export function walkMdFiles(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMdFiles(p));
    else if (e.isFile() && e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

/**
 * Split a markdown file into {fmText, body} when the file begins with a
 * `---` frontmatter block. Returns null when there is no opening `---`
 * or the closing fence is missing.
 */
export function extractFrontmatter(content) {
  if (typeof content !== "string") return null;
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) return null;
  const rest = content.replace(/^---\r?\n/, "");
  const endIdx = rest.search(/\r?\n---\r?\n?/);
  if (endIdx === -1) return null;
  const fm = rest.slice(0, endIdx);
  const body = rest.slice(endIdx).replace(/^\r?\n---\r?\n?/, "");
  return { fmText: fm, body };
}

/**
 * Minimal flat-YAML reader — extracts `key: value` scalar pairs. Multi-line
 * continuations (`description: |`, list items) collapse to a single
 * whitespace-joined string. Sufficient for the narrow scrutiny we do
 * (`name`, `description`, `category`/`section`/`kind`).
 */
export function parseFlatYaml(text) {
  const out = {};
  let key = null;
  let buffer = "";
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const m = rawLine.match(/^([A-Za-z_][\w-]*):\s?(.*)$/);
    if (m) {
      if (key) out[key] = buffer.trim();
      key = m[1];
      buffer = m[2];
    } else if (key && rawLine.trim() !== "") {
      buffer += " " + rawLine.trim();
    }
  }
  if (key) out[key] = buffer.trim();
  return out;
}

export function inferCategory(name, fm) {
  if (fm && typeof fm.category === "string" && fm.category.trim()) return fm.category.trim();
  if (fm && typeof fm.section === "string" && fm.section.trim()) return fm.section.trim();
  if (fm && typeof fm.kind === "string" && fm.kind.trim()) return fm.kind.trim();
  if (typeof name !== "string" || !name) return "ungrouped";
  if (name.includes(":")) return name.split(":")[0];
  if (name.includes("-")) return name.split("-")[0];
  return name;
}

export function scrutinizeFile(filePath, content) {
  const findings = [];
  const fm = extractFrontmatter(content);
  if (!fm) {
    findings.push({
      file: filePath,
      severity: "P0",
      code: "missing-frontmatter",
      message: "no `---` frontmatter block at file head",
    });
    return { name: null, category: "ungrouped", findings, hasFrontmatter: false };
  }
  const meta = parseFlatYaml(fm.fmText);
  if (!meta.name) {
    findings.push({ file: filePath, severity: "P0", code: "missing-name", message: "frontmatter has no `name` field" });
  }
  if (!meta.description) {
    findings.push({ file: filePath, severity: "P0", code: "missing-description", message: "frontmatter has no `description` field" });
  }
  if (meta.name && !NAME_PATTERN.test(meta.name)) {
    findings.push({ file: filePath, severity: "P1", code: "name-pattern", message: `name "${meta.name}" violates ${NAME_PATTERN}` });
  }
  if (meta.description && meta.description.length < MIN_DESC) {
    findings.push({ file: filePath, severity: "P1", code: "description-too-short", message: `description ${meta.description.length}<${MIN_DESC} chars` });
  }
  if (meta.description && meta.description.length > MAX_DESC) {
    findings.push({ file: filePath, severity: "P2", code: "description-too-long", message: `description ${meta.description.length}>${MAX_DESC} chars` });
  }
  const body = fm.body || "";
  if (body.trim().length === 0) {
    findings.push({ file: filePath, severity: "P1", code: "empty-body", message: "body after frontmatter is empty" });
  }
  if (/\bTODO\b|\bFIXME\b/.test(body)) {
    findings.push({ file: filePath, severity: "P2", code: "todo-marker", message: "body contains TODO/FIXME marker" });
  }
  if (content.length > MAX_FILE_BYTES) {
    findings.push({ file: filePath, severity: "P3", code: "file-oversized", message: `${content.length}B > ${MAX_FILE_BYTES}B` });
  }
  return { name: meta.name || null, category: inferCategory(meta.name, meta), findings, hasFrontmatter: true };
}

export function aggregate(files, _io = {}) {
  const read = _io.read || ((p) => readFileSync(p, "utf8"));
  const byCategory = {};
  const totals = { files: 0, withFrontmatter: 0, valid: 0, withFindings: 0, bySeverity: { P0: 0, P1: 0, P2: 0, P3: 0 } };
  for (const path of files) {
    let content;
    try { content = read(path); } catch { continue; }
    const res = scrutinizeFile(path, content);
    totals.files++;
    if (res.hasFrontmatter) totals.withFrontmatter++;
    const valid = res.findings.length === 0;
    if (valid) totals.valid++;
    else totals.withFindings++;
    for (const f of res.findings) {
      if (totals.bySeverity[f.severity] !== undefined) totals.bySeverity[f.severity]++;
    }
    const cat = res.category;
    if (!byCategory[cat]) byCategory[cat] = { count: 0, valid: 0, withFindings: 0, findings: [] };
    byCategory[cat].count++;
    if (valid) byCategory[cat].valid++;
    else byCategory[cat].withFindings++;
    for (const f of res.findings) byCategory[cat].findings.push(f);
  }
  return { totals, byCategory };
}

export function run({ cmdsDir = CMDS_DIR, outPath = OUT_PATH, write = true } = {}) {
  const files = walkMdFiles(cmdsDir);
  const { totals, byCategory } = aggregate(files);
  const report = {
    schemaVersion: "1.0.0",
    generated: new Date().toISOString(),
    cmdsDir,
    totals,
    byCategory,
  };
  if (write) {
    try { mkdirSync(dirname(outPath), { recursive: true }); } catch { /* exists */ }
    writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  }
  return report;
}

const invokedAsCli = (() => {
  try { return process.argv[1] && resolve(process.argv[1]) === __filename; }
  catch { return false; }
})();
if (invokedAsCli) {
  const r = run();
  const top = Object.entries(r.byCategory)
    .map(([c, s]) => ({ cat: c, count: s.count, valid: s.valid, fail: s.withFindings }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
  console.log(`COMMAND-CORPUS-SCRUTINY: ${r.totals.files} files · ${r.totals.valid} clean · ${r.totals.withFindings} with findings`);
  console.log(`  bySeverity: ${JSON.stringify(r.totals.bySeverity)}`);
  console.log(`top categories:`);
  for (const t of top) console.log(`  ${t.cat.padEnd(20)} count=${t.count} valid=${t.valid} fail=${t.fail}`);
  console.log(`report → ${OUT_PATH}`);
}
