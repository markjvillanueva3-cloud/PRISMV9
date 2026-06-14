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
// NOTE: the loss-function detector is loaded LAZILY inside buildContext (see the
// nudge block), NOT statically here -- this hook must never crash-on-load and kill
// /goal pre-flight fleet-wide. A static import links before any try/catch can run;
// the lazy await-import matches the loadVerifyUnitReady / loop-inject-dedup pattern.

const TRIGGER_RX = /(^|\s)\/goal(\s|$)/i;

// GOAL DISCIPLINE -- a /goal is usually an OPEN / exploratory loop, which is the
// exact failure mode the agent-loop articles (2026-06-09) warn about: an open
// loop on a loose standard is a "slop machine" that burns insane tokens. So /goal
// must be BOUNDED up front. Synthesized from the same sources as the /loop rules
// (wiki [[agent-loop-design-rules]]); injected on every /goal. Knob:
// PRISM_GOAL_RULES_DISABLE=1 drops just this block.
const GOAL_DISCIPLINE = [
  `🎯 GOAL DISCIPLINE (bound the open loop -- wiki [[agent-loop-design-rules]]):`,
  `   1. CONVERT open -> closed: name the GOAL, the EVAL gate (how you know each step is done -- tests/scrutiny/numbers), and the STOP condition (budget/iteration cap) BEFORE the first build. An unbounded /goal on a loose standard burns tokens into slop. [shann]`,
  `   2. DECOMPOSE: orchestrate goal -> specialist steps -> narrow subagent work; keep coordination deterministic + ~zero-token (route, don't reason -- R5; a Workflow coordinator spends nothing). Route each MECHANICAL/text step (explain/summarize/docstring/classify/lint/diff/triage) to the local lane via the /smart executor contract (resolveExecutor -> ask-ollama.mjs, $0); reserve Claude for judgment + safety. [PawelHuryn]`,
  `   3. EACH PASS FEEDS THE NEXT + checkpoint at YELLOW -- carry numbers forward, /compact before the spiral, never continue from a state you can't describe (R6/R10). [shann/IBuzovskyi]`,
  `   4. BUILD across galaxy lines -- if you are a backend builder (alpha/bravo/golf/sierra/papa/quebec/india) an ownership gate is ADVISORY: coordinate, do not defer-and-wait. [[feedback_primary_backend_builders_no_galaxy_gate_block]]`,
  `   5. FORCE 100% COMPLETION (R15 WIRE->TEST->VALIDATE->APPLY) -- nothing a /goal builds is "done" until ALL hold: (a) WIRE it to every natural dispatcher/consumer/surface in the same commit (no orphans); (b) TEST with real reference-value/invariant tests (happy + >=3 failure + >=2 adversarial), round-tripped THROUGH the dispatcher; (c) VALIDATE on LIVE data with numbers, never "looks fine"; (d) APPLY-TO-ALL-GALAXIES -- a general asset must serve EVERY galaxy, a domain-specific one is cloned (not forked) to each galaxy that shares the need. For EACH artifact, explicitly DETERMINE + state: its GALAXY placement (which engines/<galaxy>/ it belongs to), the consumer NODES to actively wire/bridge it into, whether it needs AUTO-INVOCATION (and if so the hook/trigger + WHEN it fires), and whether it is DOMAIN-ONLY or FLEET/ALL-GALAXY-WIDE. Partial/one-galaxy = [SCOPED] exception only. [[feedback_wire_test_validate_all_galaxies]]`,
].join("\n");
const STATE_DIR = path.join("H:", "prism", "state", "shared");
const ENVELOPE_DIR = path.join("H:", "prism", "mcp-server", "data", "milestones");

/**
 * Lazy-import verifyUnitReady from scripts/verify-unit-ready.mjs (shipped in
 * SYSTEM-VIZ-BRAIN-MS0/U-P3-VERIFY-UNIT-READY 2026-05-16). Wrapped in try/catch
 * so an absent helper degrades to "no pre-flight dep check" gracefully — this
 * hook must never block /goal entry even if the helper is missing.
 */
async function loadVerifyUnitReady() {
  try {
    const mod = await import("../../scripts/verify-unit-ready.mjs");
    return mod.verifyUnitReady;
  } catch { return null; }
}

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

async function buildContext(prompt = "") {
  const staleHrs = Number(process.env.PRISM_GOAL_PREREQ_STALE_HRS) || 2;
  const lines = [`─── /goal pre-flight ────────────────────────────`];

  // Deferred-IDs index — load FIRST so candidate display can filter against it.
  // SLOT-DRIFT-FIX-MS0/U-SDF16 (2026-05-17): previously this hook displayed all
  // candidates as "Pending triage" without cross-referencing CLOSE-OUT-DEFERRED.md.
  // Operators saw misleading "needs work" panels for units already deferred days
  // ago (e.g. U-CAMP01/14/15 deferred 2026-05-13 still shown 2026-05-17).
  // The Stop-gate (goal-complete-gate.mjs) does cross-reference correctly; only
  // this pre-flight panel was blind. Now both surfaces agree.
  const deferred = path.join(STATE_DIR, "CLOSE-OUT-DEFERRED.md");
  /** @type {Set<string>} */
  const deferredIds = new Set();
  let deferredCount = 0;
  if (fs.existsSync(deferred)) {
    try {
      const content = fs.readFileSync(deferred, "utf-8");
      const entryLines = (content.match(/^[A-Za-z][\w.\/-]*\s*\|.*\|.*\|/gm) || [])
        .filter((l) => !/^\s*[-|]+\s*\|/.test(l));
      deferredCount = entryLines.length;
      for (const line of entryLines) {
        const id = line.split("|")[0].trim();
        if (!id) continue;
        deferredIds.add(id);
        // Also index the bare unit_id when the entry is composite "MS/UNIT".
        const slashIdx = id.lastIndexOf("/");
        if (slashIdx >= 0 && slashIdx < id.length - 1) {
          deferredIds.add(id.slice(slashIdx + 1));
        }
      }
    } catch { /* skip */ }
  }

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
    const allCands = Array.isArray(co?.results)
      ? co.results.flatMap((r) => (Array.isArray(r.candidates) ? r.candidates.map((c) => ({ ...c, milestone: c.milestone || r.milestone })) : []))
      : [];
    // Subtract anything already deferred (composite OR bare unit_id match).
    const cands = allCands.filter((c) => {
      const unit = c.unit_id || c.unit || "?";
      const composite = `${c.milestone}/${unit}`;
      return !deferredIds.has(composite) && !deferredIds.has(unit);
    });
    const deferredHit = allCands.length - cands.length;
    const totalNote = deferredHit > 0 ? ` (${deferredHit} already deferred)` : "";
    lines.push(`✓ CLOSE-OUT-CANDIDATES fresh (${coAge.toFixed(1)}h, ${cands.length} pending triage${totalNote})`);
    if (cands.length > 0) {
      lines.push(`   Pending triage:`);
      for (const c of cands.slice(0, 3)) {
        lines.push(`   • ${c.milestone}/${c.unit_id || c.unit || "?"} — ${(c.title || "").slice(0, 60)}`);
      }
      if (cands.length > 3) lines.push(`   ... +${cands.length - 3} more`);
    }
  }

  if (deferredCount > 0) {
    lines.push(`· CLOSE-OUT-DEFERRED: ${deferredCount} explicit deferral(s) registered`);
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

            // NEW (U-P3-VERIFY-UNIT-READY composition, 2026-05-16 audit ladder #5):
            // For each pending sibling, run verifyUnitReady against the milestone
            // envelope. Surface blocked deps as ⚠ — operator sees prereq problems
            // BEFORE typing /goal complete, not at Stop-time when goal-complete-gate
            // already blocks.
            const verifyUnitReady = await loadVerifyUnitReady();
            if (verifyUnitReady && pending > 0) {
              const envPath = path.join(ENVELOPE_DIR, `${ms}.json`);
              const env = readJson(envPath);
              if (env && env.units) {
                const envelopes = { [ms]: env };
                const blocked = [];
                for (const u of (entry.pending || []).slice(0, 5)) {
                  const unitId = typeof u === "string" ? u : (u.unit_id || u.unit);
                  if (!unitId) continue;
                  try {
                    const r = verifyUnitReady({ envelopes, unitRef: { milestone: ms, unit_id: unitId } });
                    if (r && !r.ready && Array.isArray(r.missingDeps) && r.missingDeps.length > 0) {
                      blocked.push({ unitId, missing: r.missingDeps });
                    }
                  } catch { /* helper errored on this unit — skip silently per non-blocking contract */ }
                }
                if (blocked.length > 0) {
                  lines.push(`   ⛔ Unit(s) with unsatisfied prereqs (verify-unit-ready):`);
                  for (const b of blocked.slice(0, 3)) {
                    const depList = b.missing.slice(0, 2).map(m => {
                      const id = m.unit_id ? `${m.milestone || ms}:${m.unit_id}` : m.dep;
                      return `${id} (${m.reason}${m.status ? "=" + m.status : ""})`;
                    }).join(", ");
                    lines.push(`     ⛔ ${b.unitId} — blocked by: ${depList}`);
                  }
                  if (blocked.length > 3) lines.push(`     ... +${blocked.length - 3} more blocked`);
                }
              }
            }
          }
        }
      }
    } catch { /* skip */ }
  }

  // Targeted loss-function nudge -- fires ONLY when the goal text is unbounded
  // prose with no measurable check (deterministic, R5; [[feedback_goal_needs_loss_function]]).
  // The static GOAL_DISCIPLINE below is the always-on reminder; this is the sharp,
  // conditional one that a static always-on reminder cannot be (it becomes wallpaper).
  // Knob: PRISM_GOAL_LOSS_NUDGE_DISABLE=1.
  if (String(process.env.PRISM_GOAL_LOSS_NUDGE_DISABLE ?? "") !== "1") {
    try {
      const lf = await import("../../scripts/lib/goal-loss-function-detect.mjs");
      if (lf.detectMissingLossFunction(lf.extractGoalText(prompt)).unbounded) lines.push(lf.LOSS_FUNCTION_NUDGE);
    } catch { /* lazy-import + classifier are fail-open: a fault here never blocks /goal entry */ }
  }
  if (String(process.env.PRISM_GOAL_RULES_DISABLE ?? "") !== "1") lines.push(GOAL_DISCIPLINE);
  lines.push(`💡 Reminder: /goal complete fires goal-complete-gate.mjs (Stop hook). Bypass: PRISM_GOAL_GATE_AUDIT_BYPASS=1 (logged).`);
  lines.push(`────────────────────────────────────────────────`);
  return lines.join("\n");
}

async function main() {
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
  const ctx = await buildContext(prompt);
  let additionalContext = ctx;
  // Loop-context dedup (FOXTROT U-LOOP-INJECT-DEDUP, 2026-05-18): in a /loop the
  // /goal pre-flight panel re-injects byte-identical content every iteration.
  // If unchanged (after volatile-token normalization) since an earlier prompt
  // this session, emit a compact pointer instead. Fail-open + kill-knob — a
  // dedup fault can ONLY ever emit the FULL panel, never wrongly hide it.
  if (String(process.env.PRISM_LOOP_INJECT_DEDUP_DISABLE ?? "") !== "1") {
    try {
      const { recordAndCheck } = await import("../../scripts/lib/loop-inject-dedup.mjs");
      const sid = stdin?.session_id;
      if (sid) {
        const d = recordAndCheck({ sessionId: sid, hookName: "goal-prereq-inject", content: ctx });
        if (d.suppress) additionalContext = d.pointer;
      }
    } catch { /* fail-open: keep the full panel */ }
  }
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext },
  }));
}

main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
