#!/usr/bin/env node
/**
 * wiki-canonical-to-training-pairs.mjs — convert canonical wiki entries to an AI-training JSONL.
 *
 * Invention F3 (builder-ready spec: knowledge/wiki/architecture/prism-invention-wiki-to-training-pairs-spec.md).
 * Doctrine: feedback_ai_training_first_before_revenue. The pivot's canonical wiki
 * entries are the highest-quality training data PRISM has (physics-grounded,
 * source-cited, confidence-scored). This adapter turns prose into supervised
 * prompt/completion pairs so the LoRA pipeline can consume them.
 *
 * For each `schema: ideablock-v1` entry under the two wiki dirs it emits:
 *   - 1 PRIMARY pair      ## Question -> ## Answer
 *   - N DERIVED pairs     one per "Worked example" line in the Answer
 *   - M ANTIPATTERN pairs one per bullet under ### Anti-patterns
 *
 * Deterministic + idempotent: entries sorted by path, pairs deduped by content
 * hash, atomic write via temp+rename. Output carries an entry->sha256 manifest
 * so the training pipeline can detect corpus drift.
 *
 * Usage:
 *   node scripts/wiki-canonical-to-training-pairs.mjs [--in <dir>...] [--out <file>] [--min-confidence N] [--dry-run]
 *
 * Exit: 0 ok · 1 IO/parse error · 2 no canonical entries found (refuse empty output)
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const DEFAULT_IN_DIRS = [
  path.resolve(ROOT, "knowledge/wiki/code-tribal"),
  path.resolve(ROOT, "knowledge/wiki/architecture"),
];
export const DEFAULT_OUT = path.resolve(ROOT, "state/shared/training/wiki-canonical-pairs.jsonl");

/** Parse the YAML-subset frontmatter of an ideablock-v1 entry. Returns {} if absent/malformed. */
export function parseFrontmatter(text) {
  if (typeof text !== "string") return {};
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return {};
  const fm = {};
  let currentListKey = null;
  for (const rawLine of m[1].split(/\r?\n/)) {
    const listItem = rawLine.match(/^\s+-\s+(.*)$/);
    if (listItem && currentListKey) {
      fm[currentListKey].push(stripQuotes(listItem[1].trim()));
      continue;
    }
    const kv = rawLine.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2].trim();
    if (val === "") { fm[key] = []; currentListKey = key; }
    else { fm[key] = stripQuotes(val); currentListKey = null; }
  }
  return fm;
}

function stripQuotes(s) {
  if (s.length >= 2 && ((s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'")))) {
    return s.slice(1, -1);
  }
  return s;
}

/** Split a markdown body into a map of `## Heading` -> section text. */
export function splitSections(text) {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const sections = {};
  const re = /^##\s+(.+)$/gm;
  const marks = [];
  let m;
  while ((m = re.exec(body)) !== null) marks.push({ title: m[1].trim(), start: m.index, headEnd: re.lastIndex });
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : body.length;
    sections[marks[i].title] = body.slice(marks[i].headEnd, end).trim();
  }
  return sections;
}

/** Find the canonical Question + Answer sections (Answer heading often has a parenthetical). */
function findQA(sections) {
  let question = null, answer = null;
  for (const [title, content] of Object.entries(sections)) {
    const t = title.toLowerCase();
    if (question === null && t === "question") question = content;
    if (answer === null && t.startsWith("answer")) answer = content;
  }
  return { question, answer };
}

/** Extract worked-example lines from an Answer section. */
export function extractWorkedExamples(answer) {
  if (!answer) return [];
  const out = [];
  for (const line of answer.split(/\r?\n/)) {
    const t = line.trim();
    if (/worked example/i.test(t) && t.length > 20) out.push(t.replace(/^[-*]\s*/, ""));
  }
  return out;
}

/**
 * Extract anti-pattern bullets from raw markdown text. The anti-patterns
 * heading is typically `### Anti-patterns ...` (h3, nested inside `## Answer`),
 * so scan the raw text for a heading at ANY level 2-4, then collect bullets
 * until the next heading of equal-or-higher level.
 */
export function extractAntiPatterns(text) {
  if (typeof text !== "string") return [];
  const out = [];
  let inBlock = false;
  let blockLevel = 0;
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      if (/anti-?pattern/i.test(heading[2])) { inBlock = true; blockLevel = level; continue; }
      if (inBlock && level <= blockLevel) inBlock = false; // next same/higher heading ends the block
      continue;
    }
    if (!inBlock) continue;
    const b = line.match(/^[-*]\s+(.*)$/);
    if (b && b[1].trim().length > 15) out.push(b[1].trim());
  }
  return out;
}

function sha256(s) { return crypto.createHash("sha256").update(s, "utf8").digest("hex"); }

/** Build all training pairs for one entry. Returns { pairs[], manifest } or null if not canonical. */
export function entryToPairs(text, relPath) {
  const fm = parseFrontmatter(text);
  if (fm.schema !== "ideablock-v1") return null;
  const sections = splitSections(text);
  const { question, answer } = findQA(sections);
  const confidence = Number.isFinite(parseFloat(fm.confidence)) ? parseFloat(fm.confidence) : 0.90;
  const meta = {
    source_entry: relPath,
    domain: fm.domain || "",
    category: fm.category || "",
    confidence,
    sha256: sha256(text),
  };
  const pairs = [];
  if (question && answer) {
    pairs.push({ kind: "primary", prompt: question, completion: answer, weight: confidence, meta });
  }
  for (const ex of extractWorkedExamples(answer)) {
    pairs.push({ kind: "derived", prompt: `Compute / explain: ${ex.split(":")[0]}`, completion: ex, weight: confidence, meta });
  }
  for (const ap of extractAntiPatterns(text)) {
    pairs.push({ kind: "antipattern", prompt: `Is this correct? ${ap.split("—")[0].split(".")[0]}`, completion: ap, weight: confidence, meta });
  }
  return { pairs, manifest: { entry: relPath, sha256: meta.sha256, confidence, pairCount: pairs.length } };
}

function listMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => path.join(dir, f)).sort();
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, file);
}

export function run(argv = process.argv.slice(2)) {
  const inDirs = [];
  let outFile = DEFAULT_OUT;
  let minConfidence = 0;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--in") inDirs.push(path.resolve(argv[++i]));
    else if (argv[i] === "--out") outFile = path.resolve(argv[++i]);
    else if (argv[i] === "--min-confidence") minConfidence = parseFloat(argv[++i]) || 0;
    else if (argv[i] === "--dry-run") dryRun = true;
  }
  const dirs = inDirs.length ? inDirs : DEFAULT_IN_DIRS;

  const files = dirs.flatMap(listMarkdown).sort();
  const seen = new Set();
  const allPairs = [];
  const manifest = [];
  const perDomain = {};
  let skipped = 0;

  for (const file of files) {
    let text;
    try { text = fs.readFileSync(file, "utf8"); }
    catch (e) { console.error(`skip (read error): ${file} — ${e.message}`); skipped++; continue; }
    const relPath = path.relative(ROOT, file).replace(/\\/g, "/");
    let result;
    try { result = entryToPairs(text, relPath); }
    catch (e) { console.error(`skip (parse error): ${relPath} — ${e.message}`); skipped++; continue; }
    if (!result) continue; // not a canonical ideablock-v1 entry
    if (result.manifest.confidence < minConfidence) continue;
    manifest.push(result.manifest);
    for (const p of result.pairs) {
      const h = sha256(`${p.prompt} ${p.completion}`);
      if (seen.has(h)) continue; // dedup identical pairs across entries
      seen.add(h);
      allPairs.push(p);
      perDomain[p.meta.domain] = (perDomain[p.meta.domain] || 0) + 1;
    }
  }

  if (allPairs.length === 0) {
    console.error("no canonical ideablock-v1 entries produced any pairs — refusing to write empty output");
    return { ok: false, exitCode: 2, pairs: 0, entries: manifest.length, allPairs: [], perDomain: {} };
  }

  const jsonl = allPairs.map((p) => JSON.stringify(p)).join("\n") + "\n";
  const manifestObj = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    totalEntries: manifest.length,
    totalPairs: allPairs.length,
    skipped,
    perDomain,
    entries: manifest.sort((a, b) => a.entry.localeCompare(b.entry)),
  };

  if (!dryRun) {
    atomicWrite(outFile, jsonl);
    atomicWrite(outFile.replace(/\.jsonl$/, ".manifest.json"), JSON.stringify(manifestObj, null, 2) + "\n");
  }
  console.error(`${dryRun ? "[dry-run] " : ""}${allPairs.length} pairs from ${manifest.length} entries (${skipped} skipped) -> ${outFile}`);
  return { ok: true, exitCode: 0, pairs: allPairs.length, entries: manifest.length, perDomain, allPairs, manifest: manifestObj };
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  const r = run();
  process.exit(r.exitCode);
}
