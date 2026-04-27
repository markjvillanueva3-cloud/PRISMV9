#!/usr/bin/env node
/**
 * wiki-query-first.mjs — UserPromptSubmit hook
 *
 * Karpathy "wiki-first" pattern. Before Claude derives a domain answer
 * from scratch, check whether wiki/index.md already has a relevant page —
 * inject the top 3 candidate slugs + summaries as additional context so
 * Claude reads-and-cites instead of re-deriving.
 *
 * Heuristic: token-overlap match against `summary` + `slug` columns of
 * `wiki/index.md`. Cheap, deterministic, no Ollama call. Falls back to
 * `{continue: true}` silently when:
 *   - prompt is short (< 16 chars)
 *   - prompt is a slash command (handled elsewhere)
 *   - wiki/index.md is missing or empty
 *   - no entry scores ≥ 2 token overlaps
 *
 * Contract: emit `{continue: true, hookSpecificOutput: {additionalContext: ...}}`.
 * On any error: emit `{continue: true}` and exit 0 so the prompt proceeds.
 */

import fs from "node:fs";

const WIKI_INDEX = "H:/prism/knowledge/wiki/index.md";
const MIN_PROMPT_CHARS = 16;
const MIN_OVERLAP = 2;
const TOP_K = 3;
const MAX_INJECT_CHARS = 1800;

function readStdin() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

function tokenize(s) {
  return new Set(
    String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((t) => t.length >= 4)
  );
}

function parseIndex(text) {
  const out = [];
  const re = /^-\s+\[\[([^\]]+)\]\]\s+—\s+(.*?)\s+\|\s+category:([\w-]+)/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ slug: m[1], summary: m[2], category: m[3] });
  }
  return out;
}

function main() {
  const cont = () => { console.log(JSON.stringify({ continue: true })); };

  let input = {};
  try {
    const raw = readStdin();
    if (raw && raw.trim().startsWith("{")) input = JSON.parse(raw);
  } catch { return cont(); }

  const prompt = String(input.prompt ?? input.user_prompt ?? "").trim();
  if (prompt.length < MIN_PROMPT_CHARS || prompt.startsWith("/")) return cont();

  let entries = [];
  try {
    if (!fs.existsSync(WIKI_INDEX)) return cont();
    const text = fs.readFileSync(WIKI_INDEX, "utf-8");
    entries = parseIndex(text);
  } catch { return cont(); }
  if (entries.length === 0) return cont();

  const promptTokens = tokenize(prompt);
  if (promptTokens.size === 0) return cont();

  const scored = [];
  for (const e of entries) {
    const haystack = tokenize(`${e.slug} ${e.summary}`);
    let overlap = 0;
    for (const t of promptTokens) if (haystack.has(t)) overlap++;
    if (overlap >= MIN_OVERLAP) scored.push({ ...e, overlap });
  }
  if (scored.length === 0) return cont();

  scored.sort((a, b) => b.overlap - a.overlap);
  const top = scored.slice(0, TOP_K);

  const lines = [
    "## 📖 Wiki-first hits (read before re-deriving)",
    "_token-overlap match against `wiki/index.md` — cite by slug, do NOT re-derive if a page already covers this:_",
    "",
  ];
  for (const t of top) {
    lines.push(`- **[[${t.slug}]]** _(${t.category}, overlap=${t.overlap})_ — ${t.summary}`);
  }
  let body = lines.join("\n");
  if (body.length > MAX_INJECT_CHARS) body = body.slice(0, MAX_INJECT_CHARS) + "\n[… truncated]";

  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: body,
      },
    })
  );
}

main();
