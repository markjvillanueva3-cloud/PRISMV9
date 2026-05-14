#!/usr/bin/env node
// tier: T2
/**
 * goal-prereq-inject.mjs — UserPromptSubmit hook for /goal awareness.
 *
 * Complements the existing Stop-hook goal-complete-gate.mjs by surfacing pre-flight
 * status BEFORE the user types /goal complete:
 *   - CLOSE-OUT-CANDIDATES freshness (Stop gate requires <2h)
 *   - sibling-unit status in the same milestone (you said "goal complete" but
 *     unit X in your milestone is still pending — flag it)
 *   - TaskList pending count (if you have open TaskCreate items, surface them)
 *   - uncommitted critical files (stop_on_uncommitted_critical would block anyway)
 *
 * Non-blocking. Pure info injection. The Stop hook still does the hard gate.
 *
 * Env knobs:
 *   PRISM_GOAL_PREREQ_DISABLE=1  → skip
 *   PRISM_GOAL_PREREQ_STALE_HRS=2  → close-out audit staleness threshold
 */

import * as fs from "node:fs";
import * as path from "node:path";

const TRIGGER_RX = /(^|\s)\/goal(\s|$)/i;
const STATE_DIR = path.join("H:", "prism", "state", "shared");

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf-8");
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; } }
function ageHours(p) { try { return (Date.now() - fs.statSync(p).mtimeMs) / 3600000; } catch { return null; } }

function buildContext() {
  const staleHrs = Number(process.env.PRISM_GOAL_PREREQ_STALE_HRS) || 2;
  const lines = [`─── /goal pre-flight ────────────────────────────`];

  // CLOSE-OUT-CANDIDATES staleness (the Stop hook will block on this).
  // Schema: { results: [ { milestone, title, file, candidates: [{ unit_id, title, ... }] } ] }
  const coPath = path.join(STATE_DIR, "CLOSE-OUT-CANDIDATES.json");
  const coAge = ageHours(coPath);
  if (coAge == null) {
    lines.push(`❌ CLOSE-OUT-CANDIDATES not present — Stop hook WILL block /goal complete.`);
    lines.push(`   → Run /close-out-audit FIRST`);
  } else if (coAge >= staleHrs) {
    lines.push(`❌ CLOSE-OUT-CANDIDATES ${coAge.toFixed(1)}h stale (≥${staleHrs}h) — Stop hook WILL block.`);
    lines.push(`   → Refresh: /close-out-audit`);
  } else {
    const co = readJson(coPath);
    // Flatten results[].candidates[] — each candidate carries its parent milestone.
    const cands = Array.isArray(co?.results)
      ? co.results.flatMap((r) => (Array.isArray(r.candidates) ? r.candidates.map((c) => ({ ...c, milestone: c.milestone || r.milestone })) : []))
      : [];
    lines.push(`✓ CLOSE-OUT-CANDIDATES fresh (${coAge.toFixed(1)}h, ${cands.length} candidate(s))`);
    if (cands.length > 0) {
      lines.push(`   Pending triage:`);
      for (const c of cands.slice(0, 3)) {
        lines.push(`   • ${c.milestone}/${c.unit_id || c.unit || "?"} — ${(c.title || "").slice(0, 60)}`);
      }
      if (cands.length > 3) lines.push(`   ... +${cands.length - 3} more`);
    }
  }

  // Deferred list awareness. Entry format under `## Entries`:
  //   <unit-id> | <who> | <iso-ts> | <reason>
  const deferred = path.join(STATE_DIR, "CLOSE-OUT-DEFERRED.md");
  if (fs.existsSync(deferred)) {
    try {
      const content = fs.readFileSync(deferred, "utf-8");
      // A deferral entry = a line with ≥3 pipe-delimited fields whose first
      // field looks like a unit/milestone id (not a markdown table header/rule).
      const items = (content.match(/^[A-Za-z][\w.-]*\s*\|.*\|.*\|/gm) || [])
        .filter((l) => !/^\s*[-|]+\s*\|/.test(l)) // exclude `|---|` table rules
        .length;
      lines.push(`· CLOSE-OUT-DEFERRED: ${items} explicit deferral(s) registered`);
    } catch { /* skip */ }
  }

  // Sibling-unit shipped check (which milestone are we in?)
  const cpPath = path.join("H:", "prism", "state", "CURRENT_POSITION.md");
  if (fs.existsSync(cpPath)) {
    try {
      const cp = fs.readFileSync(cpPath, "utf-8");
      const msMatch = cp.match(/milestone[:\s]+([A-Z][A-Z0-9_-]+)/i);
      if (msMatch) {
        const ms = msMatch[1];
        // Cross-reference MILESTONE_PROGRESS
        const mp = readJson(path.join(STATE_DIR, "MILESTONE_PROGRESS.json"));
        if (mp && Array.isArray(mp.milestones)) {
          const entry = mp.milestones.find((m) => m.id === ms || m.milestone === ms);
          if (entry) {
            const shipped = (entry.shipped || []).length;
            const pending = (entry.pending || []).length;
            lines.push(`· Current milestone ${ms}: ${shipped} shipped · ${pending} pending`);
            if (pending > 0) {
              lines.push(`   ⚠ Pending siblings — /goal complete should account for these:`);
              for (const u of (entry.pending || []).slice(0, 3)) {
                lines.push(`     • ${typeof u === "string" ? u : u.unit_id || JSON.stringify(u)}`);
              }
            }
          }
        }
      }
    } catch { /* skip */ }
  }

  lines.push(`💡 Reminder: /goal complete fires goal-complete-gate.mjs (Stop hook). Bypass: PRISM_GOAL_GATE_AUDIT_BYPASS=1 (logged).`);
  lines.push(`────────────────────────────────────────────────`);
  return lines.join("\n");
}

function main() {
  if (String(process.env.PRISM_GOAL_PREREQ_DISABLE ?? "") === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const stdin = readStdin();
  const prompt = stdin?.prompt ?? stdin?.user_prompt ?? "";
  if (!TRIGGER_RX.test(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const ctx = buildContext();
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ctx },
  }));
}

try { main(); }
catch { process.stdout.write(JSON.stringify({ continue: true })); }
