#!/usr/bin/env node
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

const CATEGORY_PREFIXES = {
  feedback_: "feedback",
  project_: "project",
  user_: "user",
  reference_: "reference",
  mistakes_: "mistakes",
  mistake_: "mistakes",
  patterns_: "patterns",
  pattern_: "patterns",
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

  const cat = categorize(filename);
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
      additionalContext: `memory-mirror: ${cat}/${filename} → vault, embed=${status}`,
    },
  }));
}

main().catch((e) => {
  // Never block — log to stderr, return continue:true
  process.stderr.write(`memory-mirror error: ${e?.message ?? e}\n`);
  console.log(JSON.stringify({ continue: true }));
});
