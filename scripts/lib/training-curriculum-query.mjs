/**
 * training-curriculum-query.mjs — pure query layer over the page-by-page
 * training curriculum JSONL emitted by generate-training-curriculum.mjs.
 *
 * Operator directive 2026-05-26 (iter10): make the iter9 curriculum
 * queryable by domain / controller / difficulty / score range so engines
 * and other chats can consume curriculum-ordered training pages.
 *
 * Pure functions only. Streaming JSONL parse, in-memory filter, top-N
 * window. Caller passes an absolute path; this module never decides where
 * the JSONL lives.
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-TRAINING-CURRICULUM-QUERY
 * @slot echo
 * @iter 10
 * @date 2026-05-26
 */
import fs from "node:fs";

export const DIFFICULTY_ORDER = ["unscored", "easy", "intermediate", "advanced", "complex"];

/** Pure: parse JSONL text → array of records. Skips blank lines and JSON errors silently. */
export function parseJsonl(text) {
  if (text == null) return [];
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const t = line.trim();
    if (t.length === 0) continue;
    try { out.push(JSON.parse(t)); } catch { /* skip malformed */ }
  }
  return out;
}

/** Pure: filter records by domain / controller / difficulty / score range. */
export function filterRecords(records, criteria = {}) {
  let out = Array.isArray(records) ? records.slice() : [];
  if (criteria.domain) {
    const wanted = new Set(Array.isArray(criteria.domain) ? criteria.domain : [criteria.domain]);
    out = out.filter((r) => wanted.has(r.domain));
  }
  if (criteria.controller) {
    const wanted = new Set(Array.isArray(criteria.controller) ? criteria.controller : [criteria.controller]);
    out = out.filter((r) => wanted.has(r.controller));
  }
  if (criteria.difficulty) {
    const wanted = new Set(Array.isArray(criteria.difficulty) ? criteria.difficulty : [criteria.difficulty]);
    out = out.filter((r) => wanted.has(r.difficulty));
  }
  if (typeof criteria.minScore === "number") {
    out = out.filter((r) => Number(r.score) >= criteria.minScore);
  }
  if (typeof criteria.maxScore === "number") {
    out = out.filter((r) => Number(r.score) <= criteria.maxScore);
  }
  if (criteria.filename) {
    out = out.filter((r) => String(r.filename || "").includes(criteria.filename));
  }
  return out;
}

/** Pure: load JSONL from disk → records array. Returns [] when file missing. */
export function loadCurriculum(absPath) {
  if (!absPath || !fs.existsSync(absPath)) return [];
  let text;
  try { text = fs.readFileSync(absPath, "utf8"); } catch { return []; }
  return parseJsonl(text);
}

/** Pure: take top-N records (assumes already ordered ascending by score). */
export function topN(records, n) {
  const safeN = Number.isInteger(n) && n > 0 ? n : 10;
  return (Array.isArray(records) ? records : []).slice(0, safeN);
}

/** Pure: take the highest-difficulty N (tail of ordered list). */
export function bottomN(records, n) {
  const safeN = Number.isInteger(n) && n > 0 ? n : 10;
  if (!Array.isArray(records) || records.length === 0) return [];
  return records.slice(-safeN);
}

/** Pure: summary stats by difficulty bucket + domain. */
export function summarize(records) {
  const out = { total: 0, byDifficulty: {}, byDomain: {}, byController: {} };
  for (const d of DIFFICULTY_ORDER) out.byDifficulty[d] = 0;
  for (const r of records || []) {
    out.total++;
    if (out.byDifficulty[r.difficulty] !== undefined) out.byDifficulty[r.difficulty]++;
    out.byDomain[r.domain] = (out.byDomain[r.domain] || 0) + 1;
    if (r.controller) out.byController[r.controller] = (out.byController[r.controller] || 0) + 1;
  }
  return out;
}

/** Pure: filename → record count grouping. */
export function groupByFilename(records) {
  const out = new Map();
  for (const r of records || []) {
    const f = r.filename || "(unknown)";
    if (!out.has(f)) out.set(f, []);
    out.get(f).push(r);
  }
  return out;
}

/** Pure: parse argv pairs `--key=value` / `--key value` into a criteria object. */
export function parseCriteriaArgv(argv) {
  const out = {};
  const args = Array.isArray(argv) ? argv.slice() : [];
  for (let i = 0; i < args.length; i++) {
    const a = String(args[i]);
    let key, val;
    const eqMatch = a.match(/^--([a-zA-Z][a-zA-Z0-9-]*)=(.*)$/);
    if (eqMatch) { key = eqMatch[1]; val = eqMatch[2]; }
    else if (a.startsWith("--")) { key = a.slice(2); val = args[++i]; }
    else continue;
    if (val === undefined || val === "") continue;
    if (key === "min-score" || key === "minScore") out.minScore = Number(val);
    else if (key === "max-score" || key === "maxScore") out.maxScore = Number(val);
    else if (key === "limit") out.limit = Number(val);
    else if (key === "bottom") out.bottom = val === "true" || val === "1" || val === "yes";
    else if (key === "domain" || key === "controller" || key === "difficulty") {
      out[key] = val.includes(",") ? val.split(",").map((s) => s.trim()).filter(Boolean) : val;
    } else {
      out[key] = val;
    }
  }
  return out;
}
