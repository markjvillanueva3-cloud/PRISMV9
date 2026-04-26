#!/usr/bin/env node
/**
 * pretool-context-forecast.mjs — PreToolUse hook
 *
 * Cheap check that runs before every tool call: is the session close
 * enough to its context window that we should recommend /compact or
 * /handoff? Uses a local JSON read to find the last-known token count
 * and a rough per-step overhead so the hook stays <50ms.
 *
 * Non-blocking — only advises. Rate-limited to once per 90 seconds.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const TIME_BUDGET_MS = 80;
const RATE_FILE = path.join(os.tmpdir(), "prism-hook-state", "context-forecast.last.json");
const RATE_WINDOW_MS = 90_000;
const WARN_UTIL = 0.85;
const CRIT_UTIL = 0.92;

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function loadRate() { try { return JSON.parse(fs.readFileSync(RATE_FILE, "utf8")); } catch { return {}; } }
function saveRate(s) {
  try {
    const d = path.dirname(RATE_FILE);
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(RATE_FILE, JSON.stringify(s));
  } catch { /* ignore */ }
}

function readKnownTokens() {
  const candidates = [
    path.join(process.cwd(), "state", "context_pressure.json"),
    path.join(process.cwd(), "mcp-server", "data", "state", "context_pressure.json"),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const d = JSON.parse(fs.readFileSync(p, "utf8"));
      const t = d.current_tokens ?? d.tokens ?? d.currentTokens ?? null;
      if (typeof t === "number") return { tokens: t, window: d.window || d.window_tokens || 200_000 };
    } catch { /* ignore */ }
  }
  return null;
}

async function main() {
  const killer = setTimeout(() => {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }, TIME_BUDGET_MS);

  readStdin();
  const known = readKnownTokens();
  clearTimeout(killer);
  if (!known) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const util = known.tokens / known.window;
  if (util < WARN_UTIL) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Rate limit so the reminder doesn't flood the chat
  const rate = loadRate();
  const now = Date.now();
  if (now - (rate.lastFired || 0) < RATE_WINDOW_MS) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  rate.lastFired = now;
  saveRate(rate);

  const icon = util >= CRIT_UTIL ? "🔴" : "🟠";
  const verb = util >= CRIT_UTIL ? "/compact NOW — next step may overflow" : "plan a /compact soon";
  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `${icon} Context at ${(util * 100).toFixed(0)}% (${known.tokens}/${known.window}) — ${verb}.`,
      },
    })
  );
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
