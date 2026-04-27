#!/usr/bin/env node
/**
 * wiki-auto-ingest-suggest.mjs — UserPromptSubmit hook
 *
 * When the user references a raw source path (PDF, transcript, article)
 * that exists under `knowledge/raw/` but is NOT yet ingested into the
 * wiki, inject a one-line suggestion to run `/wiki-ingest <path>`.
 *
 * Detection: regex over the prompt for likely paths (.pdf | .md | .txt
 * | knowledge/raw/...). For each detected path, check whether a wiki
 * page citing that source already exists by grepping `wiki/index.md`
 * for the basename. If not present → suggest ingest.
 *
 * No-op on:
 *   - prompts with no path-like tokens
 *   - paths already ingested (basename appears in wiki/index.md)
 *   - prompts already starting with /wiki-ingest (avoid recursion)
 */

import fs from "node:fs";
import path from "node:path";

const WIKI_INDEX = "H:/prism/knowledge/wiki/index.md";
const RAW_ROOT = "H:/prism/knowledge/raw";
const PATH_RE = /(?:knowledge\/raw\/[^\s"'`)]+|[\w./-]+\.(?:pdf|md|txt|docx|html))/gi;
const MAX_PATHS = 3;

function readStdin() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

function main() {
  const cont = () => console.log(JSON.stringify({ continue: true }));

  let input = {};
  try {
    const raw = readStdin();
    if (raw && raw.trim().startsWith("{")) input = JSON.parse(raw);
  } catch { return cont(); }

  const prompt = String(input.prompt ?? input.user_prompt ?? "");
  if (!prompt || prompt.startsWith("/wiki-ingest")) return cont();

  const matches = Array.from(prompt.matchAll(PATH_RE)).map((m) => m[0]);
  if (matches.length === 0) return cont();

  let indexText = "";
  try {
    if (fs.existsSync(WIKI_INDEX)) indexText = fs.readFileSync(WIKI_INDEX, "utf-8");
  } catch { /* ignore */ }

  const candidates = [];
  for (const p of matches.slice(0, MAX_PATHS)) {
    const base = path.basename(p);
    const stem = base.replace(/\.[^.]+$/, "");
    if (indexText.includes(base) || indexText.includes(stem)) continue;
    // Resolve against RAW_ROOT to confirm the file actually exists before suggesting
    let resolved = p;
    if (!path.isAbsolute(p) && !p.startsWith("knowledge/")) {
      resolved = path.join(RAW_ROOT, p);
    } else if (p.startsWith("knowledge/")) {
      resolved = path.join("H:/prism", p);
    }
    let exists = false;
    try { exists = fs.existsSync(resolved); } catch { /* ignore */ }
    candidates.push({ path: p, resolved, exists });
  }
  if (candidates.length === 0) return cont();

  const lines = [
    "## 📥 Wiki-ingest candidates detected",
    "_paths in your prompt that don't appear in `wiki/index.md` yet:_",
    "",
  ];
  for (const c of candidates) {
    const tag = c.exists ? "✓ on disk" : "⚠ path not found at " + c.resolved;
    lines.push(`- \`${c.path}\` — ${tag}; suggest \`/wiki-ingest ${c.path}\``);
  }
  lines.push("");
  lines.push("Skip this hook by prefixing your prompt with `/wiki-ingest` directly.");

  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: lines.join("\n"),
      },
    })
  );
}

main();
