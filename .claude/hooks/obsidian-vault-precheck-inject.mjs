#!/usr/bin/env node
// tier: T3
/**
 * obsidian-vault-precheck-inject.mjs — UserPromptSubmit
 *
 * HIGH-ROI-TS2/iter1 (audit-remainder loop, 2026-05-22). Closes Finding F2
 * from OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18.md.
 *
 * Surfaces user-written Obsidian vault notes (decisions/errors/research/
 * specs/claude-md/lint-reports/code-index/data-index/Materials) that match
 * keyword tokens in the user prompt. The existing precheck stack covers:
 *   - master-index-precheck-inject       → system-graph nodes
 *   - wiki-precheck-inject                → knowledge/wiki/ entries
 *   - memory-relevance-inject             → knowledge/memories/*
 *
 * THIS hook fills the gap: every OTHER directory under knowledge/ that
 * holds user-jotted notes — none of which are surfaced anywhere today.
 *
 * Sub-token cost. One scan of small flat dirs (each typically <100 files),
 * BM25-lite scoring identical to memory-index-search-lib. Disable knob:
 *   PRISM_OBSIDIAN_VAULT_PRECHECK_DISABLE=1
 */

import fs from "node:fs";
import path from "node:path";
import { dedupeOrMarker } from "../../scripts/lib/injection-dedup-fs.mjs";

const ROOT = "H:/prism/knowledge";
const REPO_ROOT = "H:/prism";
// Directories scanned by this hook. master-index covers system-graph + wiki/memories;
// this list is the "everything else under knowledge/" set that has no precheck.
const SCAN_DIRS = [
  "claude-md", "code-index", "data-index", "decisions",
  "errors", "gsd", "lint-reports", "Materials", "MIT-OCW",
  "PRISM-System-Map", "specs",
];
const MAX_FILES_PER_DIR = 150;
const TOPK = 3;
const MIN_SCORE = 2;
const MAX_TOKEN_LEN = 64;

function readStdinSync() {
  try { return fs.readFileSync(0, "utf8"); } catch { return ""; }
}

function tokens(str) {
  if (!str) return [];
  return String(str).toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((t) => t.length >= 3 && t.length <= MAX_TOKEN_LEN)
    // Drop ultra-common English/dev stopwords that match everything.
    .filter((t) => !["the","and","for","that","this","with","from","you","what","when","how","does","into","over","via","but","not","are","was","were","has","have","been","will","can","may","its","using","use","get","set","new","need","want","add","fix","work","make","run","just"].includes(t));
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && (e.name.endsWith(".md") || e.name.endsWith(".json") || e.name.endsWith(".txt")))
      .slice(0, MAX_FILES_PER_DIR)
      .map((e) => path.join(dir, e.name));
  } catch { return []; }
}

function score(fileTokens, queryTokens) {
  let s = 0;
  const ft = new Set(fileTokens);
  for (const q of queryTokens) {
    if (ft.has(q)) s += 2;
    // partial-word boost (q is prefix of any file token)
    else if ([...ft].some((t) => t.startsWith(q))) s += 1;
  }
  return s;
}

function main() {
  if (process.env.PRISM_OBSIDIAN_VAULT_PRECHECK_DISABLE === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  let stdin = {};
  try { stdin = JSON.parse(readStdinSync() || "{}"); } catch { /* pass */ }
  const prompt = String(stdin.prompt || stdin.user_prompt || "");
  const qt = tokens(prompt);
  if (qt.length === 0) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  const hits = [];
  for (const sub of SCAN_DIRS) {
    const dir = path.join(ROOT, sub);
    for (const file of listFiles(dir)) {
      const base = path.basename(file, path.extname(file)).toLowerCase();
      const ft = base.split(/[^a-z0-9_]+/).filter(Boolean);
      const s = score(ft, qt);
      if (s >= MIN_SCORE) {
        hits.push({ path: path.relative(ROOT, file), bucket: sub, score: s, name: base });
      }
    }
  }
  if (hits.length === 0) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, TOPK);

  const lines = top.map((h) => `  • [${h.bucket}] **${h.name}** \`knowledge/${h.path}\``).join("\n");
  const block =
    `## 📂 Obsidian vault precheck — ${top.length} note(s) match prompt\n` +
    lines + "\n" +
    `_Scanned: ${SCAN_DIRS.join(", ")}. master-index covers wiki+memories+graph; this fills the rest. Disable: \`PRISM_OBSIDIAN_VAULT_PRECHECK_DISABLE=1\`._`;

  // Per-session injection dedup (U-ALPHA-INJECT-DEDUP-FS): re-emit the full block only when its
  // content changes or the 5-min TTL expires; otherwise a 1-line marker. Saves ~835B/turn fleet-wide.
  const additionalContext = dedupeOrMarker(block, {
    sessionId: stdin.session_id, hookName: "obsidian-vault-precheck", root: REPO_ROOT,
  });

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext },
  }));
}

try { main(); }
catch { process.stdout.write(JSON.stringify({ continue: true })); }
