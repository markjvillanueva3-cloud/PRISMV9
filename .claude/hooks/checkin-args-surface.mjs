#!/usr/bin/env node
// tier: T2
/**
 * checkin-args-surface.mjs — UserPromptSubmit hook.
 *
 * THE PROBLEM IT SOLVES (user-reported 2026-05-16, slot bravo claude-339c8ff7):
 *   `/checkin-<slot> <work order>` forwards the trailing text as ARGUMENTS to
 *   the skill, but `/checkin` front-loads a heavy slot-claim + 15-section
 *   §Report. By the time the runbook reaches the user's actual request it is
 *   buried or deprioritized — functionally the work order gets swallowed.
 *
 * THE FIX (deterministic belt — survives /compact, works fleet-wide, can't be
 *   buried because it is injected context, not a runbook line Claude may skip):
 *   on ANY `/checkin` or `/checkin-<slot>` prompt that carries a free-text
 *   directive beyond recognized flags, re-surface that directive as a
 *   high-priority `★ USER WORK ORDER` block telling the model the slot-bind is
 *   preamble and this text is the deliverable.
 *
 * Pure string work — no file IO, no spawn. Non-blocking. Never throws.
 *
 * Output schema: { continue:true, hookSpecificOutput:{ hookEventName:"UserPromptSubmit", additionalContext:string } }
 *
 * Env knobs:
 *   PRISM_CHECKIN_ARGS_SURFACE_DISABLE=1  → skip entirely (continue:true, no context)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Command head: /checkin or /checkin-<slot> at the very start (slash commands
// are only parsed at prompt start). Word-boundary so /checkindo... never matches.
const CMD_RE = /^\s*\/checkin(?:-[a-z]+)?(?=\s|$)/i;

// Recognized flags from checkin.md §Args. Two groups: VALUE_FLAGS consume the
// next token as their value; BARE_FLAGS stand alone. Everything left after
// stripping the command head + these is the user's free-text work order.
const NATO = new Set(["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett", "kilo", "lima"]);
const BOOLISH = new Set(["true", "false", "1", "0", "yes", "no"]);
// flag → predicate(nextTokenLowercased): is the next token THIS flag's value?
// A flag whose next token FAILS the predicate degrades gracefully — the token
// is NOT consumed and survives as work-order text. This resolves the
// `--slot fix the bug` ambiguity structurally (each flag has a known value
// domain) instead of guessing, fixing Agent A's P1-1 at the root.
const VALUE_FLAGS = new Map([
  ["--slot", (v) => NATO.has(v)],
  ["--preferslot", (v) => NATO.has(v)],
  ["--roadmap", (v) => v === "devtools" || v === "revenue"],
  ["--force", (v) => BOOLISH.has(v)],
  ["--confirmrecent", (v) => BOOLISH.has(v)],
  ["--chatid", (v) => /^claude-/.test(v)],
  ["--topic", (v) => !v.startsWith("--")], // free-form slug: any non-flag token
]);
const BARE_FLAGS = new Set(["--golf", "--no-loop", "--no-claim-filter"]);

// Loop / goal intent keywords — if any survive into the work order the user
// wants the autonomous loop, so the injected guidance says so explicitly.
const LOOP_RE = /(^|\s)(\/loop|\/goal|\/run-continuous|autopilot|continuous|until\s+(complete|done)|keep\s+going|as\s+long\s+as\s+possible)(\s|$)/i;

const MAX_PROMPT = 8000; // bound the work to keep the hook fast + ReDoS-safe

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf-8");
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

/**
 * Extract the free-text work order from a /checkin* prompt.
 * Returns "" when the prompt is a bare check-in (no directive beyond flags).
 * Exported for the test harness.
 */
export function extractWorkOrder(prompt) {
  if (typeof prompt !== "string") return "";
  const p = prompt.slice(0, MAX_PROMPT);
  const m = p.match(CMD_RE);
  if (!m) return "";
  // Everything after the command head, first line only (slash-command args are
  // single-line; a trailing multi-line paste is body, not args).
  let rest = p.slice(m[0].length);
  const nl = rest.indexOf("\n");
  if (nl !== -1) rest = rest.slice(0, nl);
  rest = rest.trim();
  if (!rest) return "";

  // Token-walk: drop recognized flags (and the value token of VALUE_FLAGS).
  // Anything not consumed is real work-order text.
  const toks = rest.split(/\s+/);
  const kept = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const tl = t.toLowerCase();
    const valPred = VALUE_FLAGS.get(tl);
    if (valPred) {
      const nxt = toks[i + 1];
      // Consume the next token as this flag's value ONLY if it matches the
      // flag's known value domain. A forgotten/absent value degrades: the
      // token is left as work-order text instead of being swallowed.
      if (nxt !== undefined && valPred(nxt.toLowerCase())) i++;
      continue;
    }
    if (BARE_FLAGS.has(tl)) continue;                 // skip standalone flag
    if (tl.startsWith("--")) continue;                // unknown -- flag: not a work order
    kept.push(t);
  }
  return kept.join(" ").trim();
}

function buildContext(workOrder) {
  const wantsLoop = LOOP_RE.test(workOrder);
  const lines = [];
  lines.push("─── ★ USER WORK ORDER (primary deliverable) ─────");
  lines.push(`The user typed a /checkin command WITH a request attached. That request — not the check-in ceremony — is what they want done:`);
  lines.push("");
  lines.push(`  ▶ ${workOrder}`);
  lines.push("");
  lines.push("Contract (feedback_checkin_args_are_primary_work_order):");
  lines.push("  • Run the slot-claim / handoff-bind as MINIMAL silent preamble.");
  lines.push("  • Compress the §Report — only expand sections with an actionable finding.");
  lines.push("  • Then ACT on the work order above. Do NOT end the turn having only run check-in.");
  if (wantsLoop) {
    lines.push("  • It contains a loop/goal keyword → enter the autonomous /loop on THIS task,");
    lines.push("    bookended with loop-state.mjs start/tick/end. Zero-questions, no unit cap.");
  }
  lines.push("─────────────────────────────────────────────────");
  return lines.join("\n");
}

function main() {
  if (String(process.env.PRISM_CHECKIN_ARGS_SURFACE_DISABLE ?? "") === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const stdin = readStdin();
  const prompt = stdin?.prompt ?? stdin?.user_prompt ?? "";
  const workOrder = extractWorkOrder(prompt);
  if (!workOrder) {
    // Bare /checkin (or non-checkin prompt) — nothing to surface. Stay silent
    // so a normal check-in is unchanged.
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: buildContext(workOrder),
    },
  }));
}

// isCli: only run main() when invoked as a CLI/hook — NOT when imported by the
// test harness (importing would run readStdin()+stdout-write and corrupt TAP).
const isCli = (() => {
  try { return fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || ""); }
  catch { return false; }
})();

if (isCli) {
  try { main(); }
  catch { try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* stdout gone */ } }
}
