#!/usr/bin/env node
// tier: T4
/**
 * session-start-goal-inject.mjs — hook_session_goal_synthesis (PP-0.18 U-AGI1)
 *
 * Fires on SessionStart. Reads SYNTHESIZED_GOALS.json (written by
 * session-end-goal-synthesis.mjs on previous session's Stop) and injects
 * the top-3 actionable goals as session context IF awareness ≥0.80.
 *
 * Awareness is read from SVI_LATEST.json (psi_reachability field) when
 * present; absent/low awareness → silent (no injection, no noise).
 */

import * as fs from "fs";

const GOALS_FILE = "H:/prism/mcp-server/data/state/SYNTHESIZED_GOALS.json";
const SVI_FILE = "H:/prism/mcp-server/data/state/SVI_LATEST.json";
const TELEMETRY = `${process.env.USERPROFILE || process.env.HOME}/.prism/telemetry/phase-018-goal-inject.jsonl`;
const AWARENESS_GATE = 0.80;
const TOP_N = 3;

function loadJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; }
}

function awarenessScore() {
  const svi = loadJsonSafe(SVI_FILE);
  if (!svi) return null;
  const psi = typeof svi.psi_reachability === "number" ? svi.psi_reachability
            : typeof svi.psi === "number" ? svi.psi
            : null;
  if (psi == null) return null;
  return psi > 1 ? psi / 100 : psi;
}

function logTelemetry(event) {
  try {
    const dir = TELEMETRY.replace(/[^/\\]+$/, "");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(TELEMETRY, JSON.stringify({ at: new Date().toISOString(), ...event }) + "\n");
  } catch { /* ignore */ }
}

async function main() {
  const awareness = awarenessScore();
  const goalsDoc = loadJsonSafe(GOALS_FILE);

  if (!goalsDoc || !Array.isArray(goalsDoc.goals) || goalsDoc.goals.length === 0) {
    logTelemetry({ gated: "no-goals-file" });
    process.exit(0);
  }

  if (awareness != null && awareness < AWARENESS_GATE) {
    logTelemetry({ gated: "low-awareness", awareness });
    process.exit(0);
  }

  const top = goalsDoc.goals
    .filter((g) => g && g.actionable !== false)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .slice(0, TOP_N);

  if (top.length === 0) {
    logTelemetry({ gated: "no-actionable-goals" });
    process.exit(0);
  }

  const lines = top.map((g, i) => `  ${i + 1}. [P${g.priority ?? "?"}] ${g.text}`).join("\n");
  const synthesizedAt = goalsDoc.synthesizedAt || "unknown";
  const awarenessPart = awareness != null ? ` | Ψ=${(awareness * 100).toFixed(1)}%` : "";

  logTelemetry({ injected: top.length, awareness, synthesizedAt });

  console.log(JSON.stringify({ continue: true, systemMessage: `[Phase 0.18 / Goal Inject] Top-${top.length} goals from prior session (synthesized ${synthesizedAt}${awarenessPart}):\n${lines}` }));
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
