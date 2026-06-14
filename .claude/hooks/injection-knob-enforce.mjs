#!/usr/bin/env node
// tier: T0
/**
 * injection-knob-enforce.mjs -- PreToolUse(Write) HARD-BLOCK enforcement gate.
 *
 * TOKEN-EFFICIENCY-INJECT/U-INJECTION-KNOB-ENFORCE (2026-06-10, slot:bravo).
 *
 * The injection-surface census (audit-injection-surface.mjs) only MEASURES knob
 * coverage; adding knobs by hand is advisory and regresses the moment a new
 * knobless injector is created. This gate makes the discipline SELF-ENFORCING:
 * it BLOCKS the creation of a SessionStart / UserPromptSubmit context-injector
 * that has no operator disable knob -- so the awareness surface can never again
 * grow an un-silenceable auto-injection (the gap the census kept finding).
 *
 * It REUSES the census's own detectKnobs + emitsContext detectors (build once,
 * measure AND enforce with the same logic -- they cannot drift apart).
 *
 * SIGNAL (precise, to bound false positives): block IFF the proposed content
 *   (1) emits the additionalContext injection contract, AND
 *   (2) declares hookEventName SessionStart or UserPromptSubmit (the recurring
 *       per-session / per-prompt surface the census governs), AND
 *   (3) has NO PRISM_* disable/gate knob.
 * Stop / PreToolUse / PostToolUse hooks, guards that emit no context, and any
 * injector that already carries a knob all pass untouched.
 *
 * SCOPE: Write only (full proposed content is available). Edits that bolt an
 * emission onto an existing knobless hook are a documented gap -- Write is where
 * injectors are born, and assessing a partial Edit's resulting file safely is
 * error-prone (could mistake an edit that ADDS the knob for a violation).
 *
 * EXIT CONTRACT (Claude Code PreToolUse):
 *   allow: {continue: true}
 *   block: {hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"..."}}
 *   advise (bypassed): {continue: true, systemMessage: "..."}
 *
 * Knobs:
 *   PRISM_INJECTION_KNOB_ENFORCE_DISABLE=1 -> downgrade the block to an advisory
 *     (emergency bypass; the violation is still surfaced).
 *
 * Test seam: evaluate({stdin, env}) is pure over its inputs (the detectors are
 * pure), so tests drive it without spawning.
 *
 * @module .claude/hooks/injection-knob-enforce
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { detectKnobs, emitsContext } from "../../scripts/audit-injection-surface.mjs";

// True when the proposed source is a recurring (SessionStart/UserPromptSubmit)
// context injector -- the surface the census governs. Stop/PostToolUse emitters
// are out of scope (different budget). emitsContext is the census detector.
export function targetsRecurringInjection(content) {
  if (!emitsContext(content)) return false;
  return /hookEventName["'\s]*[:=][\s]*["'](?:SessionStart|UserPromptSubmit)["']/.test(content)
    || /["'](?:SessionStart|UserPromptSubmit)["']/.test(content) && content.includes("additionalContext");
}

// Suggest the canonical knob name from the hook filename:
//   foo-bar-inject.mjs -> PRISM_FOO_BAR_INJECT_DISABLE
export function suggestKnobName(filePath) {
  const base = String(filePath || "").split(/[\\/]/).pop() || "";
  const stem = base.replace(/\.(?:mjs|cjs|js)$/i, "");
  const upper = stem.replace(/[^A-Za-z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").toUpperCase();
  return upper ? `PRISM_${upper}_DISABLE` : "PRISM_<HOOK>_DISABLE";
}

/**
 * @param {{stdin: object|null, env?: object}} opts
 * @returns {{action:"allow"|"block"|"advise", reason:string, knob?:string}}
 */
export function evaluate({ stdin, env } = {}) {
  const tool = String(stdin?.tool_name || "");
  if (tool !== "Write") return { action: "allow", reason: "tool is not Write" };

  const ti = stdin?.tool_input ?? {};
  const filePath = typeof ti.file_path === "string" ? ti.file_path.replace(/\\/g, "/") : "";
  if (!filePath) return { action: "allow", reason: "no file_path" };
  if (!/\.claude\/hooks\/[^/]+\.mjs$/.test(filePath)) {
    return { action: "allow", reason: "not a .claude/hooks/*.mjs file" };
  }

  const content = typeof ti.content === "string" ? ti.content : "";
  if (!content) return { action: "allow", reason: "no content to assess (fail-open)" };

  if (!targetsRecurringInjection(content)) {
    return { action: "allow", reason: "not a SessionStart/UserPromptSubmit context injector" };
  }
  if (detectKnobs(content).hasKnob) {
    return { action: "allow", reason: "injector already carries a disable/gate knob" };
  }

  const knob = suggestKnobName(filePath);
  const reason =
    `KNOBLESS INJECTOR BLOCKED: ${path.basename(filePath)} emits SessionStart/UserPromptSubmit ` +
    `context every session/prompt but has NO operator disable knob -- it would be un-silenceable, ` +
    `the exact token-control gap the injection-surface census exists to prevent. ` +
    `FIX: add an early-return at the top of main(), e.g.\n` +
    `  if (process.env.${knob} === "1") { console.log(JSON.stringify({ continue: true })); return; }\n` +
    `then re-Write. (Emergency bypass: PRISM_INJECTION_KNOB_ENFORCE_DISABLE=1.)`;

  const bypassed = (env ?? process.env)?.PRISM_INJECTION_KNOB_ENFORCE_DISABLE === "1";
  return { action: bypassed ? "advise" : "block", reason, knob };
}

// ---- script entry ----------------------------------------------------------

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf-8");
    return raw.trim() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function main() {
  let r;
  try {
    r = evaluate({ stdin: readStdinSafe() });
  } catch {
    // Fail OPEN: an enforcement gate that throws must never wedge legitimate work.
    r = { action: "allow", reason: "gate threw; failing open" };
  }
  if (r.action === "block") {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: r.reason,
      },
    }));
  } else if (r.action === "advise") {
    process.stdout.write(JSON.stringify({ continue: true, systemMessage: `[injection-knob-enforce] ${r.reason}` }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
  process.exit(0);
}

const invokedAsScript = (() => {
  try {
    const self = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/i, "$1");
    return path.resolve(self) === path.resolve(process.argv[1] ?? "");
  } catch {
    return false;
  }
})();
if (invokedAsScript) main();
