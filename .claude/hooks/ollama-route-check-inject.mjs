#!/usr/bin/env node
// tier: T2
/**
 * ollama-route-check-inject.mjs — UserPromptSubmit hook
 *
 * Fires when the operator mentions ollama / offload / local model / qwen /
 * deepseek / route check / offloader / token saving — surfaces a 6-line
 * health summary of the Ollama offload route so the operator can see at a
 * glance whether the route is firing.
 *
 * Reads the SAME source the META artifact reads: `mcp-server/data/state/
 * ollama-offload-stats.json` (schema v2.0.0, top-level offloaded / keptOnClaude
 * / tokensSaved fields — NOT under .totals.* per the schema-v2 fix in CLAUDE.md
 * Recent regressions 2026-05-17). Computes:
 *   - offload ratio = offloaded / (offloaded + keptOnClaude)
 *   - target = 0.30 per feedback_ollama_token_routing
 *   - hook decisions = offloaded + kept + suggested
 *   - effect ratio = decisions / offloader-fires
 *   - top non-routing reason (from last 100 events if available)
 *
 * Advisory only — never blocks. Auto-skips when:
 *   - PRISM_OLLAMA_ROUTE_CHECK_DISABLE=1
 *   - stats file missing / unreadable
 *   - prompt does not match any keyword
 *   - cooldown window (default 300s per session) not elapsed
 *
 * Knobs:
 *   PRISM_OLLAMA_ROUTE_CHECK_DISABLE=1   — disable entirely
 *   PRISM_OLLAMA_ROUTE_CHECK_TARGET=N    — override offload target (default 0.30)
 *   PRISM_OLLAMA_ROUTE_CHECK_COOLDOWN=N  — seconds between fires (default 300)
 */
import { readFileSync, existsSync, statSync, utimesSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

const PRISM_ROOT = "H:/prism";
const STATS_PATH = join(PRISM_ROOT, "mcp-server/data/state/ollama-offload-stats.json");
const STAMP_DIR = join(PRISM_ROOT, ".claude/cache");
const STAMP_PATH = join(STAMP_DIR, "ollama-route-check-stamp.json");

const TRIGGERS = [
  "ollama",
  "offload",
  "local model",
  "qwen",
  "deepseek",
  "offloader",
  "route check",
  "route health",
  "token saving",
  "token saved",
];

function readStdin() {
  try {
    const chunks = [];
    const buf = Buffer.alloc(65536);
    let read;
    while ((read = require("node:fs").readSync(0, buf, 0, buf.length, null)) > 0) {
      chunks.push(buf.slice(0, read).toString("utf8"));
    }
    return chunks.join("");
  } catch {
    return "";
  }
}

function readStats() {
  if (!existsSync(STATS_PATH)) return null;
  try {
    const j = JSON.parse(readFileSync(STATS_PATH, "utf8"));
    // Schema v2.0.0 — fields top-level. Back-compat: v1 stored under .totals.*
    const v2 = ("offloaded" in j);
    const offloaded = v2 ? (j.offloaded || 0) : (j.totals?.offloaded || 0);
    const kept = v2 ? (j.keptOnClaude || 0) : (j.totals?.keptOnClaude || 0);
    const tokensSaved = v2 ? (j.tokensSaved || 0) : (j.totals?.tokensSaved || 0);
    const byHook = j.byHook || j.totals?.byHook || {};
    const offloaderFires = byHook["ollama-task-offloader"]?.fired || 0;
    const events = Array.isArray(j.events) ? j.events : [];
    return { offloaded, kept, tokensSaved, offloaderFires, events, schema: v2 ? "v2" : "v1" };
  } catch {
    return null;
  }
}

function topKeepReason(events) {
  // Inspect the last 100 "keep-on-claude" decisions, count their `reason` field.
  if (!events.length) return null;
  const recent = events.slice(-100).filter(e => e?.decision === "keep" || e?.action === "keep");
  if (!recent.length) return null;
  const counts = new Map();
  for (const e of recent) {
    const r = e.reason || e.cause || "unknown";
    counts.set(r, (counts.get(r) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0] ? `${sorted[0][0]} (${sorted[0][1]}/${recent.length})` : null;
}

function withinCooldown(cooldownSec) {
  try {
    if (!existsSync(STAMP_PATH)) return false;
    const ageMs = Date.now() - statSync(STAMP_PATH).mtimeMs;
    return ageMs < cooldownSec * 1000;
  } catch {
    return false;
  }
}

function bumpStamp() {
  try {
    if (!existsSync(STAMP_DIR)) mkdirSync(STAMP_DIR, { recursive: true });
    writeFileSync(STAMP_PATH, JSON.stringify({ at: new Date().toISOString() }));
  } catch { /* best-effort */ }
}

function main() {
  if (process.env.PRISM_OLLAMA_ROUTE_CHECK_DISABLE === "1") return ok();
  const raw = readStdin();
  let prompt = "";
  try {
    const payload = JSON.parse(raw);
    prompt = String(payload.prompt || "").toLowerCase();
  } catch {
    return ok();
  }
  if (!prompt) return ok();
  // Keyword match — substring is good enough; phrase tokenization not needed
  const matched = TRIGGERS.some(t => prompt.includes(t));
  if (!matched) return ok();

  const cooldownSec = parseInt(process.env.PRISM_OLLAMA_ROUTE_CHECK_COOLDOWN || "300", 10);
  if (withinCooldown(cooldownSec)) return ok();

  const target = parseFloat(process.env.PRISM_OLLAMA_ROUTE_CHECK_TARGET || "0.30");
  const stats = readStats();
  if (!stats) {
    return emit(`## 🔍 Ollama route check\n\n` +
      `Stats file not found at \`${STATS_PATH}\`. The offloader hook hasn't logged any decisions yet, or the stats file was reset. Run \`! node scripts/ollama-offload-dashboard.mjs\` to confirm route state.\n`);
  }

  const total = stats.offloaded + stats.kept;
  const ratio = total > 0 ? stats.offloaded / total : 0;
  const decisions = stats.offloaded + stats.kept;
  const effectRatio = stats.offloaderFires > 0 ? decisions / stats.offloaderFires : 0;
  const verdict = ratio >= target
    ? `✅ HEALTHY (${(ratio * 100).toFixed(1)}% ≥ ${(target * 100).toFixed(0)}% target)`
    : `⚠️ UNDER-TUNED (${(ratio * 100).toFixed(1)}% < ${(target * 100).toFixed(0)}% target)`;
  const reason = topKeepReason(stats.events);

  const lines = [
    `## 🔍 Ollama route health (auto-injected, cooldown ${cooldownSec}s)`,
    ``,
    `**Verdict:** ${verdict}`,
    `**Offloaded:** ${stats.offloaded} · **Kept on Claude:** ${stats.kept} · **Tokens saved:** ${stats.tokensSaved.toLocaleString()}`,
    `**Hook fires:** ${stats.offloaderFires} · **Decision rate:** ${(effectRatio * 100).toFixed(1)}%${reason ? ` · **Top keep-reason:** ${reason}` : ""}`,
    ``,
    `_Dashboard: \`node scripts/ollama-offload-dashboard.mjs\` · stats schema: \`${stats.schema}\` · disable: PRISM_OLLAMA_ROUTE_CHECK_DISABLE=1_`,
  ];

  bumpStamp();
  return emit(lines.join("\n"));
}

function emit(text) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: text,
    },
  }));
  process.exit(0);
}

function ok() {
  process.exit(0);
}

try { main(); } catch { process.exit(0); }
