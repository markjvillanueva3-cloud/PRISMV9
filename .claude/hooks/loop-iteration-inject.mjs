#!/usr/bin/env node
// tier: T2
/**
 * loop-iteration-inject.mjs — UserPromptSubmit hook for /loop awareness.
 *
 * Fires when the user types `/loop` (with or without interval). Surfaces:
 *   - any paused/active loop state for this session (sessionId from stdin)
 *   - global list of running loops (so a chat doesn't accidentally start a 2nd)
 *   - reminder of Karpathy R10 (checkpoint between iterations)
 *
 * Non-blocking. Adds context only — never refuses the prompt.
 *
 * Output schema: { hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: string } }
 *
 * Env knobs:
 *   PRISM_LOOP_INJECT_DISABLE=1  → skip entirely
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const LOOP_STATE_HELPER = path.join("H:", "prism", ".claude", "helpers", "loop-state.mjs");
const NODE_BIN = process.execPath;

// LOOP DISCIPLINE -- auto-invoked rules synthesized from the agent-loop articles
// the operator sent 2026-06-09 (full source + per-rule attribution in wiki
// [[agent-loop-design-rules]]): shannholmberg "what is agent looping" (read in
// full), RLanceMartin "Designing loops with Fable 5", IBuzovskyi "8 Loops Inside
// Hermes Agent", PawelHuryn "Claude Dynamic Workflows", akshay_pachaar/Opik
// "self-repairing harness", 0x_rody anti-fabrication. Injected on every /loop so
// the loop runs CLOSED (bounded + eval-gated), not as an open token-burning slop
// machine. Knob: PRISM_LOOP_RULES_DISABLE=1 drops just this block.
const LOOP_DISCIPLINE = [
  `🔁 LOOP DISCIPLINE (auto-invoked from the agent-loop articles -- wiki [[agent-loop-design-rules]]):`,
  `   1. CLOSED-loop by default -- clear goal -> defined steps -> an eval at EACH step -> a stop/handback. OPEN (exploratory) looping only with explicit budget headroom: on a loose standard an open loop is a "slop machine" that burns insane tokens. [shann]`,
  `   2. EVAL-GATE every iteration -- an iter is NOT done until its eval passes (real tests + per-file scrutiny). NEVER auto-advance past an unverified iter; that ships slop. [shann + Opik self-repair]`,
  `   3. EACH PASS FEEDS THE NEXT -- carry the prior iter's outcome/numbers forward so iter N+1 beats N; never cold-restart. The loop should get better every run. [shann]`,
  `   4. SELF-CORRECT -- draft -> check against the goal -> fix the WEAKEST part -> repeat until it clears the requirements. [RLanceMartin / shann self-loop]`,
  `   5. ORCHESTRATOR owns the goal, specialists own the steps, subagents do the narrow work; keep coordination deterministic + ~zero-token (route, don't reason -- R5; a Workflow coordinator spends nothing). [shann + PawelHuryn]`,
  `   6. BUDGET is a stop condition -- nearing the token ceiling -> checkpoint + /compact, never push an open loop into a spiral (R6/R10). PRISM's multi-timescale loops only COMPOUND if each checkpoints cleanly. [IBuzovskyi]`,
].join("\n");

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf-8");
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function isLoopPrompt(prompt) {
  if (typeof prompt !== "string") return false;
  // Match /loop, /loop 5m, /loop /pick-unit, etc.
  return /(^|\s)\/loop(\s|$)/.test(prompt);
}

function safeSpawn(args) {
  try {
    const r = spawnSync(NODE_BIN, [LOOP_STATE_HELPER, ...args], { encoding: "utf-8", timeout: 2000 });
    if (r.status === 0 && r.stdout) return JSON.parse(r.stdout);
  } catch { /* ignore */ }
  return null;
}

function buildContext(stdin) {
  const sid = stdin?.session_id;
  const lines = [];
  let mine = null;
  if (sid) mine = safeSpawn(["read", "--session", sid]);
  if (mine && mine.sessionId) {
    lines.push(`📌 /loop state for THIS session: iter ${mine.iter}/${mine.target} · status=${mine.status} · task=${mine.task}`);
    if (mine.status === "running") {
      lines.push(`   last tick: ${mine.lastTickAt}`);
      lines.push(`   ▶ Resume by passing the same /loop prompt; helper-tick after each iter:`);
      lines.push(`     node H:/prism/.claude/helpers/loop-state.mjs tick --session ${sid} --status ok --note "<one-line>"`);
      // U-LOOP-AUTO-ADVANCE: when the CURRENT unit is fully shipped (committed +
      // scrutiny), do NOT end-and-wait — auto-roll onto the next unit so the loop
      // continues without a human "continue" prompt.
      lines.push(`   ⏭ AUTO-ADVANCE when this unit is DONE (committed + scrutiny passed) — do NOT stop to wait for a prompt:`);
      // --chatId ${sid} keeps the fleet-fallback pick PEER-CLAIM-FILTERED (never
      // auto-rolls onto a unit another slot is building). --slot scopes the
      // own-lane pick first. The loop auto-ends at PRISM_LOOP_MAX_ROLLS (default 8)
      // so a human re-checkpoints — it does NOT advance the whole roadmap unattended.
      const slotArg = mine.slot ? ` --slot ${mine.slot}` : "";
      lines.push(`     node H:/prism/.claude/helpers/loop-state.mjs next --session ${sid} --terminal ${sid} --chatId ${sid}${slotArg}`);
      lines.push(`     → rolls onto the resolved next unit (resume-flag → own handoff RESUME → own-lane → fleet-fallback). Read the`);
      lines.push(`       returned nextTask, then keep going. END the loop when next returns {"exhausted":true} — including the`);
      lines.push(`       roll-cap stop (reason:"roll-cap") which hands back for a human checkpoint after ${"${PRISM_LOOP_MAX_ROLLS:-8}"} advances.`);
      lines.push(`     node H:/prism/.claude/helpers/loop-state.mjs end --session ${sid} --reason exhausted   # ONLY when next says exhausted`);
    } else if (mine.status === "stale" || mine.status === "abandoned") {
      lines.push(`   ⚠ loop is ${mine.status} — either resume + tick, or end:`);
      lines.push(`     node H:/prism/.claude/helpers/loop-state.mjs end --session ${sid} --reason "<why>"`);
    }
  } else if (sid) {
    lines.push(`📌 No active /loop state for this session — starting fresh.`);
    lines.push(`   Bookend the loop with:`);
    lines.push(`     node H:/prism/.claude/helpers/loop-state.mjs start --session ${sid} --task "<task>" --target 20`);
    lines.push(`     node H:/prism/.claude/helpers/loop-state.mjs tick  --session ${sid} --status ok --note "<one-line>"   # each iter`);
    lines.push(`     node H:/prism/.claude/helpers/loop-state.mjs end   --session ${sid} --reason done                       # at finish`);
  }

  const list = safeSpawn(["list"]);
  if (list && Array.isArray(list.loops) && list.loops.length > 0) {
    const others = list.loops.filter((l) => l.sessionId !== sid && l.status === "running");
    if (others.length > 0) {
      lines.push(``);
      lines.push(`🌐 Other active /loop sessions across fleet (${others.length}):`);
      for (const l of others.slice(0, 5)) {
        const ageMin = Math.round(l.staleMs / 60000);
        lines.push(`   • ${l.sessionId.slice(0, 8)} — ${l.task.slice(0, 50)} — iter ${l.iter}/${l.target} — ${ageMin}m old`);
      }
    }
  }

  if (lines.length === 0) return null;
  lines.unshift(`─── /loop awareness ─────────────────────────────`);
  // Auto-invoke the loop-discipline rules synthesized from the agent-loop
  // articles (the operator's "auto-invoke loop rules" ask). Knob drops just this
  // block back to the bare R10 reminder.
  if (String(process.env.PRISM_LOOP_RULES_DISABLE ?? "") !== "1") {
    lines.push(LOOP_DISCIPLINE);
  } else {
    lines.push(`💡 Karpathy R10: checkpoint state between iterations -- never continue from a state you can't describe.`);
  }
  lines.push(`────────────────────────────────────────────────`);
  return lines.join("\n");
}

function main() {
  if (String(process.env.PRISM_LOOP_INJECT_DISABLE ?? "") === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const stdin = readStdin();
  const prompt = stdin?.prompt ?? stdin?.user_prompt ?? "";
  if (!isLoopPrompt(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const ctx = buildContext(stdin);
  if (!ctx) { process.stdout.write(JSON.stringify({ continue: true })); return; }
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ctx },
  }));
}

try { main(); }
catch { process.stdout.write(JSON.stringify({ continue: true })); }
