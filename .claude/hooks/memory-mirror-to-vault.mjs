#!/usr/bin/env node
// tier: T3
/**
 * memory-mirror-to-vault.mjs — PostToolUse hook
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U04.
 *
 * When Claude writes/edits a file in the user's memory directory
 * (C:/Users/.../.claude/projects/H--prism/memory/), copy it to the H:
 * vault under H:/prism/knowledge/memories/{category}/ and embed it via
 * prism_memory:remember through the running MCP server.
 *
 * Why a PostToolUse hook (not Stop): we want each memory to land in the
 * vault as soon as it's written, so concurrent chats can recall it via
 * semantic_search within the same session.
 *
 * Categories are inferred from the filename prefix; same logic as the
 * bootstrap script. Embedding failures are non-fatal — the on-disk
 * mirror is the durability win.
 *
 * Stdin: PostToolUse hook event (Write/Edit only matter)
 * Stdout: hookSpecificOutput.additionalContext on success (terse)
 * Exit: always 0 (never block tool flow)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P1-U04
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";

const VAULT_TARGET = "H:/prism/knowledge/memories";
const MCP_URL = process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp";
const EMBED_TIMEOUT_MS = 8_000;
const MEMORY_DIR_PATTERN = /[\\/]\.claude[\\/]projects[\\/][^\\/]*[\\/]memory[\\/]/i;

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const OLLAMA_CLASSIFY_MODEL = process.env.OLLAMA_CLASSIFY_MODEL ?? "qwen2.5-coder:7b";
const OLLAMA_CLASSIFY_TIMEOUT_MS = 3_500;
const VALID_CATEGORIES = new Set([
  "feedback", "project", "reference", "user",
  "lessons", "decisions", "mistakes", "patterns", "inbox",
]);

const CATEGORY_PREFIXES = {
  feedback_: "feedback",
  project_: "project",
  user_: "user",
  reference_: "reference",
  mistakes_: "mistakes",
  mistake_: "mistakes",
  patterns_: "patterns",
  pattern_: "patterns",
  lesson_: "lessons",
  lessons_: "lessons",
  decision_: "decisions",
  decisions_: "decisions",
  inbox_: "inbox",
};

function categorize(filename) {
  const base = filename.toLowerCase();
  if (base === "memory.md") return "_index";
  for (const [prefix, cat] of Object.entries(CATEGORY_PREFIXES)) {
    if (base.startsWith(prefix)) return cat;
  }
  return "uncategorized";
}

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function readStdin() {
  try {
    const buf = readFileSync(0);
    if (buf.length === 0) return null;
    try { return JSON.parse(buf.toString("utf8")); } catch { return null; }
  } catch { return null; }
}

async function embedRemote(kind, id, text, metadata) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EMBED_TIMEOUT_MS);
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "prism_memory", arguments: { action: "remember", params: { kind, id, text, metadata } } },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.json();
    const inner = body?.result?.content?.[0]?.text ?? "";
    try {
      const parsed = JSON.parse(inner);
      return { ok: parsed?.ok === true, reason: parsed?.error ?? null };
    } catch {
      return { ok: false, reason: "bad-inner-json" };
    }
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, reason: e?.message ?? String(e) };
  }
}

async function categorizeViaOllama(content, filename) {
  // Strip frontmatter + truncate so the prompt stays small (qwen2.5-coder:7b is fast on short inputs).
  const body = content.replace(/^---\n[\s\S]*?\n---\n/, "").slice(0, 1_500);
  const prompt =
    `Classify this memory note into ONE category. Reply with ONLY the category word, nothing else.\n\n` +
    `Categories:\n` +
    `- feedback: rules/preferences user gave (e.g. "always use X", "never do Y")\n` +
    `- project: ongoing work, milestones, who is doing what, deadlines\n` +
    `- reference: pointers to where info lives (URLs, file paths, dashboards, system maps)\n` +
    `- user: facts about who the user is, their role, expertise, goals\n` +
    `- lessons: things learned the hard way; post-mortem insights\n` +
    `- decisions: choices made between alternatives, with rationale\n` +
    `- mistakes: errors to avoid repeating, with cause + fix\n` +
    `- patterns: recurring shapes/structures seen across the system\n` +
    `- inbox: ungrouped raw capture not yet processed\n\n` +
    `Filename: ${filename}\n\n` +
    `Body:\n${body}\n\n` +
    `Category (one word):`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OLLAMA_CLASSIFY_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_CLASSIFY_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 8 },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { cat: null, reason: `HTTP ${res.status}` };
    const body = await res.json();
    const raw = String(body?.response ?? "").trim().toLowerCase();
    // Match the first valid category word in the response (defends against verbose models)
    const match = raw.match(/\b(feedback|project|reference|user|lessons?|decisions?|mistakes?|patterns?|inbox)\b/);
    if (!match) return { cat: null, reason: `unparseable: ${raw.slice(0, 40)}` };
    let normalized = match[1];
    // singular → plural where the vault dir uses plural
    if (normalized === "lesson") normalized = "lessons";
    if (normalized === "decision") normalized = "decisions";
    if (normalized === "mistake") normalized = "mistakes";
    if (normalized === "pattern") normalized = "patterns";
    if (!VALID_CATEGORIES.has(normalized)) return { cat: null, reason: `invalid: ${normalized}` };
    return { cat: normalized, reason: null };
  } catch (e) {
    clearTimeout(timer);
    return { cat: null, reason: e?.name === "AbortError" ? "timeout" : (e?.message ?? String(e)) };
  }
}

async function main() {
  const input = readStdin();
  if (!input) { console.log(JSON.stringify({ continue: true })); return; }
  const tool = input.tool_name ?? input.toolName ?? "";
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  const filePath = String(input.tool_input?.file_path ?? input.tool_input?.filePath ?? "").replace(/\\/g, "/");
  if (!filePath || !MEMORY_DIR_PATTERN.test(filePath.replace(/\//g, "\\"))) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  if (!existsSync(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const filename = basename(filePath);
  if (!filename.endsWith(".md")) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let content;
  try { content = readFileSync(filePath, "utf8"); }
  catch (e) {
    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `memory-mirror: read failed (${e?.message ?? e})` } }));
    return;
  }

  let cat = categorize(filename);
  let classifierNote = "";
  // If filename prefix didn't match a category, ask Ollama to classify by content.
  // This is what populates lessons/, decisions/, mistakes/, patterns/ when the
  // user's auto-memory protocol only generates 4 prefix types.
  if (cat === "uncategorized" && process.env.PRISM_MEMORY_CLASSIFIER !== "0") {
    const result = await categorizeViaOllama(content, filename);
    if (result.cat) {
      cat = result.cat;
      classifierNote = ` (ollama→${cat})`;
    } else {
      classifierNote = ` (ollama-skip:${result.reason})`;
    }
  }

  const targetDir = join(VAULT_TARGET, cat);
  const targetPath = join(targetDir, filename);
  ensureDir(targetDir);
  try { writeFileSync(targetPath, content); }
  catch (e) {
    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `memory-mirror: write failed (${e?.message ?? e})` } }));
    return;
  }

  const embedResult = await embedRemote("note", `${cat}/${filename}`, content.slice(0, 16_384), { source: "memory-mirror", category: cat, filename });
  const status = embedResult.ok ? "ok" : `embed-skip(${embedResult.reason ?? "unknown"})`;
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `memory-mirror: ${cat}/${filename}${classifierNote} → vault, embed=${status}`,
    },
  }));
}

main().catch((e) => {
  // Never block — log to stderr, return continue:true
  process.stderr.write(`memory-mirror error: ${e?.message ?? e}\n`);
  console.log(JSON.stringify({ continue: true }));
});
