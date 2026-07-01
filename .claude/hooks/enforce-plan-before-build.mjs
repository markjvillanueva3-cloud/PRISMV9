#!/usr/bin/env node
// tier: T1
/**
 * enforce-plan-before-build.mjs -- RGS-PLANNING-LOOP-BRIDGE-MS1/U-PLAN-GATE (2026-06-12, slot:tango)
 *
 * The FEASIBLE form of "auto-forced plan mode before autonomous build" (the
 * permission-mode auto-switch is INFEASIBLE per U-SPEC-V2 section 1 -- bypass is
 * already the global default, so the forcing function lives at the artifact
 * layer instead): a PreToolUse gate on NEW engine creation that requires a
 * fresh plan artifact at H:/prism/state/active-plan.json (written by
 * /plan-build, or by the rgs6 PLANNING-LOOP-BRIDGE LAW P2 step on approval).
 *
 * Port of .claude/hooks/lib/enforce-plan-before-build.py (kept on disk,
 * never-delete doctrine) to the fleet .mjs convention -- no .py hook is wired
 * anywhere; portable-node is the standard runner.
 *
 * Scope (narrow by design): Write tool + src/engines/*.ts + not a .test. file.
 * Everything else passes silently. Edits to existing engines are untouched
 * (bug fixes need no plan) -- Write of an EXISTING file also passes (overwrite
 * is not creation; the Write tool itself requires a prior Read for those).
 *
 * Modes via PRISM_RGS_PLAN_GATE:
 *   "0"          -> fully off (silent pass, kill switch)
 *   "1"          -> HARD block when no plan exists; stale plan -> advisory
 *   unset (dflt) -> advisory additionalContext nudge only (fleet-safe: never
 *                   blocks a peer who didn't opt in; new-engine creation is a
 *                   rare event so the nudge is low-noise)
 *
 * Output contract: {decision:"block", reason} (matches duplication-hard-block /
 * file-claim-guard); advisory via hookSpecificOutput.additionalContext; silent
 * pass = no output, exit 0. NEVER throws (fail-open: a gate crash must not
 * block the fleet's Writes).
 */
import * as fs from "node:fs";

const STATE_FILE = process.env.PRISM_RGS_PLAN_GATE_STATE_FILE || "H:/prism/state/active-plan.json"; // shared fleet plan state (worktrees share it); env override for hermetic tests
const MODE = process.env.PRISM_RGS_PLAN_GATE ?? "advisory"; // "0" | "1" | default advisory

/** PURE: is this tool call a NEW-engine-creation candidate? */
export function isNewEngineWrite(toolName, filePath, existsImpl = fs.existsSync) {
  if (toolName !== "Write") return false;
  const p = String(filePath || "").replace(/\\/g, "/");
  if (!p.includes("src/engines/")) return false;
  if (!p.endsWith(".ts") || p.includes(".test.")) return false;
  try { if (existsImpl(p)) return false; } catch { /* treat as new */ }
  return true;
}

/** PURE: decide the gate outcome from the plan state + mode. */
export function decideGate({ plan, mode, today, engineName }) {
  if (mode === "0") return { kind: "pass" };
  if (!plan) {
    const reason =
      `PLAN REQUIRED before creating new engine ${engineName}. ` +
      `Run /plan-build (or the /rgs6 P2 PLAN step) to write H:/prism/state/active-plan.json first: ` +
      `(1) what to build, (2) knowledge sources, (3) machinist-facing output, ` +
      `(4) edge cases + materials, (5) which existing engines to wire to.`;
    return mode === "1" ? { kind: "block", reason } : { kind: "advise", msg: `[plan-gate advisory] ${reason} (set PRISM_RGS_PLAN_GATE=1 to enforce)` };
  }
  const planDate = String(plan.date || "");
  if (planDate !== today) {
    return { kind: "advise", msg: `[plan-gate] STALE PLAN: active-plan.json is from ${planDate}, not today (${today}). Run /plan-build or the /rgs6 P2 step to refresh before creating ${engineName}.` };
  }
  return { kind: "pass" };
}

function main() {
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { return; }
  const toolName = input.tool_name || "";
  const filePath = (input.tool_input && input.tool_input.file_path) || "";
  if (!isNewEngineWrite(toolName, filePath)) return; // silent pass

  let plan = null;
  try { plan = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch { plan = null; }
  const today = new Date().toLocaleDateString("en-CA");
  const engineName = String(filePath).replace(/\\/g, "/").split("/").pop();
  const d = decideGate({ plan, mode: MODE, today, engineName });

  if (d.kind === "block") console.log(JSON.stringify({ decision: "block", reason: d.reason }));
  else if (d.kind === "advise") console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: d.msg } }));
  // pass -> no output
}

// CLI-entry guard so tests can import the pure fns without running main.
import { pathToFileURL } from "node:url";
const invoked = (() => { try { return process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url; } catch { return false; } })();
if (invoked) { try { main(); } catch { /* fail-open */ } }
process.exitCode = 0;
