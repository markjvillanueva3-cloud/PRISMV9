#!/usr/bin/env node
/**
 * audit-hook-stack-cost.mjs — META artifact for /forge-audit-v2 token-saving audit
 * (2026-05-16, slot juliett).
 *
 * Re-runnable measurement tool. Reads C:/Users/wompu/.claude/settings.json
 * (canonical hook source), enumerates UserPromptSubmit + SessionStart + PreToolUse
 * + Stop chains, scores each by per-event token-cost potential, and emits a
 * sortable JSON/Markdown ranking.
 *
 * Use:
 *   node H:/prism/scripts/audit-hook-stack-cost.mjs              # markdown
 *   node H:/prism/scripts/audit-hook-stack-cost.mjs --json       # json
 *   node H:/prism/scripts/audit-hook-stack-cost.mjs --event UserPromptSubmit
 *
 * Per-finding verification: re-run this script; if a hook's `tokens_est` drops
 * below the baseline captured in `state/shared/AUDIT-HOOK-STACK-COST-BASELINE.json`,
 * a trim landed. If it climbs, regression.
 */
import fs from "node:fs";
import path from "node:path";

const SETTINGS = [
  "C:/Users/wompu/.claude/settings.json",
  "H:/.claude/settings.json",
];

const HEAVY_KEYWORDS = ["inject", "precheck", "awareness", "recall", "presearch", "bridge", "snapshot", "consolidate"];
const ADVISORY_KEYWORDS = ["advisory", "suggest", "warn", "audit", "drift", "guard", "block"];

// Calibration weights — tokens estimated per single hook fire by role.
// Calibrate against real transcripts (see _BASELINE.json) and tighten over time.
const TOKENS_INJECT = 400;
const TOKENS_COMPUTE = 120;
const TOKENS_ADVISORY = 30;
const TOKENS_GUARD = 10;

function fileBytes(p) { try { return fs.statSync(p).size; } catch { return 0; } }

function classifyHook(cmd) {
  const name = path.basename(cmd).replace(/\.mjs$/, "");
  const isHeavy = HEAVY_KEYWORDS.some((k) => name.includes(k));
  const isAdvisory = ADVISORY_KEYWORDS.some((k) => name.includes(k));
  const isInject = /inject|precheck/.test(name);
  return {
    name,
    role: isInject ? "inject" : isAdvisory ? "advisory" : isHeavy ? "compute" : "guard",
  };
}

function estTokensPerFire(hook, role) {
  if (role === "inject") return TOKENS_INJECT;
  if (role === "advisory") return TOKENS_ADVISORY;
  if (role === "compute") return TOKENS_COMPUTE;
  return TOKENS_GUARD;
}

function loadSettings(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function enumerate(j) {
  const out = [];
  const ev = j?.hooks || {};
  for (const event of Object.keys(ev)) {
    const groups = Array.isArray(ev[event]) ? ev[event] : [];
    for (const g of groups) {
      const matcher = g.matcher || "*";
      for (const h of (g.hooks || [])) {
        const cmd = h.command || "";
        const c = classifyHook(cmd);
        const t = estTokensPerFire(h, c.role);
        out.push({
          event,
          matcher,
          name: c.name,
          role: c.role,
          timeout_ms: h.timeout || 0,
          est_tokens_per_fire: t,
        });
      }
    }
  }
  return out;
}

function aggregate(hooks) {
  const byEvent = {};
  for (const h of hooks) {
    byEvent[h.event] = byEvent[h.event] || { event: h.event, count: 0, total_est_tokens: 0, hooks: [] };
    byEvent[h.event].count++;
    byEvent[h.event].total_est_tokens += h.est_tokens_per_fire;
    byEvent[h.event].hooks.push(h);
  }
  return Object.values(byEvent).sort((a, b) => b.total_est_tokens - a.total_est_tokens);
}

function render(byEvent) {
  const lines = ["# Hook stack cost (estimated tokens per single event fire)", ""];
  lines.push("> Heuristic: inject=400, compute=120, advisory=30, guard=10. Calibrate vs actual transcripts.", "");
  for (const e of byEvent) {
    lines.push(`## ${e.event} — ${e.count} hooks, ~${e.total_est_tokens} tokens / event`);
    lines.push("| # | Hook | Role | Tokens (est) | Timeout |");
    lines.push("|---|------|------|-------------:|--------:|");
    e.hooks.sort((a, b) => b.est_tokens_per_fire - a.est_tokens_per_fire).forEach((h, i) => {
      lines.push(`| ${i + 1} | \`${h.name}\` | ${h.role} | ${h.est_tokens_per_fire} | ${h.timeout_ms} |`);
    });
    lines.push("");
  }
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const eventFilter = args.find((a, i) => args[i - 1] === "--event");
  let j = null;
  for (const p of SETTINGS) { j = loadSettings(p); if (j) break; }
  if (!j) { console.error("No settings.json found"); process.exit(2); }
  let hooks = enumerate(j);
  if (eventFilter) hooks = hooks.filter((h) => h.event === eventFilter);
  const byEvent = aggregate(hooks);
  if (asJson) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), byEvent }, null, 2));
  } else {
    console.log(render(byEvent));
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("audit-hook-stack-cost.mjs")) {
  main();
}

export { classifyHook, estTokensPerFire, enumerate, aggregate, render };
