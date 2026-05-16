#!/usr/bin/env node
// tier: T1
/**
 * memory-relevance-inject.mjs — PreToolUse hook for Edit/Write/MultiEdit.
 *
 * Before the user edits a file, scan their auto-memory directory for
 * any feedback memo that mentions the file path, basename, or symbol
 * derived from it. Inject the top-3 matches as PreToolUse context.
 *
 * Goal: "no repeated mistakes." If past feedback says "don't soften
 * completeness gates" and we're about to edit a hook with a
 * `continueOnError: true` change, surface that BEFORE the edit.
 *
 * Token budget: ≤1500 chars total injected (~375 tokens).
 *
 * Fail-open. Never blocks. Disable: PRISM_MEMORY_RELEVANCE=0.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";

// Derive from homedir — a hardcoded foreign-user path here caused fail-open
// 0% recall fleet-wide (this fires via edit-bundle.mjs on every Edit).
const MEMORY_DIR =
  process.env.PRISM_MEMORY_DIR ||
  path.join(os.homedir(), ".claude", "projects", "H--prism", "memory");
const MAX_HITS_INJECTED = 3;
const MAX_BODY_PER_HIT = 350;
const MAX_TOTAL_CHARS = 1500;
const RELEVANT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

function readStdin() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function emit(eventName, additionalContext) {
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: eventName, additionalContext },
  }));
}

function deriveSearchTerms(filePath) {
  if (!filePath) return [];
  const terms = new Set();
  const norm = filePath.replace(/\\/g, "/");
  terms.add(norm);
  const base = path.basename(norm);
  if (base) terms.add(base);
  const stem = base.replace(/\.[a-z]+$/i, "").replace(/\.test$/i, "");
  if (stem && stem.length >= 4) terms.add(stem);
  const m = stem.match(/^([A-Z][A-Za-z0-9]+?)(Engine|Hook|Service|Manager|Adapter|Bridge|Router|Provider|Controller|Repository|Validator)?$/);
  if (m && m[1] && m[1].length >= 4) terms.add(m[1]);
  const dom = stem.match(/^([A-Z][a-z]+|[A-Z]{2,})/);
  if (dom && dom[1] && dom[1].length >= 4) terms.add(dom[1]);
  return [...terms];
}

function loadMemoryFiles() {
  if (!existsSync(MEMORY_DIR)) return [];
  let files;
  try { files = readdirSync(MEMORY_DIR); } catch { return []; }
  return files
    .filter((f) => /^(feedback|reference|project|user)_.+\.md$/.test(f))
    .map((f) => ({ name: f, path: path.join(MEMORY_DIR, f) }));
}

function scoreFile(filePath, terms) {
  let body;
  try { body = readFileSync(filePath, "utf8"); } catch { return { score: 0, body: "" }; }
  let score = 0;
  const lc = body.toLowerCase();
  for (const t of terms) {
    if (!t) continue;
    const tl = t.toLowerCase();
    let idx = 0;
    while ((idx = lc.indexOf(tl, idx)) !== -1) {
      score += t.length >= 6 ? 3 : 1;
      idx += tl.length;
    }
  }
  return { score, body };
}

function extractTitleAndOpening(body) {
  let rest = body;
  if (rest.startsWith("---\n")) {
    const close = rest.indexOf("\n---", 4);
    if (close !== -1) rest = rest.slice(close + 4).replace(/^\n+/, "");
  }
  let title = "";
  for (const ln of rest.split("\n")) {
    if (ln.startsWith("# ")) { title = ln.slice(2).trim(); break; }
  }
  const paras = rest.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p && !p.startsWith("# "));
  const opening = (paras[0] || "").slice(0, MAX_BODY_PER_HIT);
  return { title, opening };
}

(() => {
  if (process.env.PRISM_MEMORY_RELEVANCE === "0") process.exit(0);
  try {
    const stdin = readStdin();
    if (!stdin) process.exit(0);
    let payload;
    try { payload = JSON.parse(stdin); } catch { process.exit(0); }
    const tool = payload?.tool_name || payload?.toolName || "";
    if (!RELEVANT_TOOLS.has(tool)) process.exit(0);
    const params = payload?.tool_input || payload?.parameters || {};
    const target = params.file_path || params.notebook_path || params.path;
    if (!target) process.exit(0);
    const terms = deriveSearchTerms(target);
    if (terms.length === 0) process.exit(0);
    const memos = loadMemoryFiles();
    if (memos.length === 0) process.exit(0);
    const scored = [];
    for (const m of memos) {
      const { score, body } = scoreFile(m.path, terms);
      if (score > 0) scored.push({ ...m, score, body });
    }
    if (scored.length === 0) process.exit(0);
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, MAX_HITS_INJECTED);
    const lines = [];
    lines.push("## 🧠 Memory recall — feedback that may apply to this edit");
    lines.push("");
    lines.push(`_Editing \`${path.basename(target)}\` matched ${scored.length} memo(s); top ${top.length} shown. Disable: PRISM_MEMORY_RELEVANCE=0._`);
    lines.push("");
    for (const hit of top) {
      const { title, opening } = extractTitleAndOpening(hit.body);
      lines.push(`### [[${hit.name.replace(/\.md$/, "")}]] (score: ${hit.score})`);
      if (title) lines.push(`**${title}**`);
      lines.push(opening);
      lines.push("");
    }
    let text = lines.join("\n");
    if (text.length > MAX_TOTAL_CHARS) text = text.slice(0, MAX_TOTAL_CHARS - 12) + "\n…(truncated)";
    emit("PreToolUse", text);
    process.exit(0);
  } catch { process.exit(0); }
})();
