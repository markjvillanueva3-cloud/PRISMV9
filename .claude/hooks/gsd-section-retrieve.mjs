#!/usr/bin/env node
// tier: T2
/**
 * gsd-section-retrieve.mjs — UserPromptSubmit hook
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01.
 *
 * When the user prompt contains GSD-relevant keywords (gsd, get
 * shit done, dev protocol, evidence, gates, buffer, equation,
 * phase, manus, escalation), query Qdrant `gsd` collection for
 * top-3 relevant sections and inject them as additional context.
 * Replaces the full-document scan that prism_gsd:get does so the
 * agent loads only the sections it actually needs.
 *
 * Stdin: UserPromptSubmit hook event { prompt }
 * Stdout: hookSpecificOutput.additionalContext when matches found
 * Exit: always 0 (advisory only)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const RATE_FILE = "H:/prism/.claude/cache/gsd-section-retrieve-last.json";
const RATE_WINDOW_MS = 30_000;
const MCP_TIMEOUT_MS = 3_000;
const SEMANTIC_TOP_K = 3;
const SEMANTIC_MIN_SCORE = 0.5;
const MIN_PROMPT_LEN = 15;
function mcpUrl() { return process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp"; }

const TRIGGER_RE = /\b(gsd|get shit done|dev protocol|evidence|equation|phase 0|phase 1|phase 2|phase 3|phase 4|manus|escalation|gates?|buffer|protocol)\b/i;

function readStdin() {
  try {
    const buf = readFileSync(0);
    if (buf.length === 0) return null;
    try { return JSON.parse(buf.toString("utf8")); } catch { return null; }
  } catch { return null; }
}

function checkRate() {
  try {
    const last = JSON.parse(readFileSync(RATE_FILE, "utf8"));
    return Date.now() - last.timestamp < RATE_WINDOW_MS;
  } catch { return false; }
}

function recordRate() {
  try {
    if (!existsSync(dirname(RATE_FILE))) mkdirSync(dirname(RATE_FILE), { recursive: true });
    writeFileSync(RATE_FILE, JSON.stringify({ timestamp: Date.now() }));
  } catch { /* ignore */ }
}

async function semanticSearchGsd(query, limit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MCP_TIMEOUT_MS);
  try {
    const res = await fetch(mcpUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "prism_memory", arguments: { action: "semantic_search", params: { query, kind: "gsd", limit } } },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const body = await res.json();
    const inner = body?.result?.content?.[0]?.text ?? "";
    try {
      const parsed = JSON.parse(inner);
      return Array.isArray(parsed?.items) ? parsed.items : [];
    } catch { return []; }
  } catch {
    clearTimeout(timer);
    return [];
  }
}

async function main() {
  const input = readStdin();
  if (!input) { console.log(JSON.stringify({ continue: true })); return; }
  const prompt = String(input.prompt ?? input.message ?? "");
  if (!prompt || prompt.length < MIN_PROMPT_LEN || prompt.startsWith("/")) {
    console.log(JSON.stringify({ continue: true })); return;
  }
  if (!TRIGGER_RE.test(prompt)) {
    console.log(JSON.stringify({ continue: true })); return;
  }
  if (checkRate()) { console.log(JSON.stringify({ continue: true })); return; }
  recordRate();
  const hits = await semanticSearchGsd(prompt, SEMANTIC_TOP_K);
  const goodHits = hits.filter((h) => typeof h.score === "number" && h.score >= SEMANTIC_MIN_SCORE);
  if (goodHits.length === 0) {
    console.log(JSON.stringify({ continue: true })); return;
  }
  const lines = ["**📘 GSD top sections (Qdrant):**"];
  for (const h of goodHits.slice(0, SEMANTIC_TOP_K)) {
    const section = (typeof h.metadata?.section === "string" && h.metadata.section) || "(unknown)";
    const source = (typeof h.metadata?.source === "string" && h.metadata.source) || "gsd";
    const score = typeof h.score === "number" ? ` (${h.score.toFixed(2)})` : "";
    const snippet = typeof h.text === "string" ? h.text.split(/\r?\n/).slice(2).join(" ").trim().slice(0, 180) : "";
    lines.push(`  - [${source}] **${section}**${score}${snippet ? ` — ${snippet}` : ""}`);
  }
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: lines.join("\n"),
    },
  }));
}

main().catch((e) => {
  process.stderr.write(`gsd-section-retrieve error: ${e?.message ?? e}\n`);
  console.log(JSON.stringify({ continue: true }));
});
