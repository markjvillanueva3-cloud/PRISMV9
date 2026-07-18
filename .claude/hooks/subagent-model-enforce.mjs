// tier: T1
/**
 * subagent-model-enforce.mjs -- PreToolUse(Agent/Task) hook: TRUE enforcement of the model-routing
 * policy on subagent dispatch (U-SUBAGENT-MODEL-ENFORCE, slot:india 2026-06-11).
 *
 * Operator: "if we need hooks for true enforcement, build them and test them." The main-loop model
 * is not hook-forceable, but a PreToolUse hook on the Agent/Task tool CAN DENY a dispatch -- and
 * subagent fan-out is a major token sink. This DENIES the unambiguous leak: a MECHANICAL task
 * (classify/format/extract/summarize/explain/document) explicitly dispatched to opus/fable, naming
 * the cheaper model to re-dispatch with. Genuine think/build/safety tasks on opus/fable pass.
 *
 * FIRES ON: PreToolUse, tools Agent / Task.
 * MODES (PRISM_SUBAGENT_MODEL_ENFORCE): "strict" (DENY the leak -- DEFAULT) | "warn" (advisory only)
 *   | "off" (silent allow). Fail-soft: any error -> allow (never breaks a dispatch on a hook bug).
 */

import { readFileSync } from "node:fs";

async function main() {
  const mode = (process.env.PRISM_SUBAGENT_MODEL_ENFORCE || "strict").toLowerCase();
  if (mode === "off") process.exit(0);

  let payload;
  try { payload = JSON.parse(readFileSync(0, "utf8")); } catch { process.exit(0); }
  const tool = payload?.tool_name || payload?.tool || "";
  if (tool !== "Agent" && tool !== "Task") process.exit(0);

  const ti = payload?.tool_input || {};
  const model = ti.model;
  if (!model) process.exit(0); // inherits parent -> not our concern
  const prompt = String(ti.prompt || ti.description || "");
  if (!prompt.trim()) process.exit(0);

  let decide;
  try { ({ decideSubagentModel: decide } = await import("../../scripts/lib/subagent-model-enforce.mjs")); }
  catch { process.exit(0); }

  let v;
  try { v = decide({ prompt, model }); } catch { process.exit(0); }
  if (!v || v.action !== "deny") process.exit(0);

  if (mode === "warn") {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `## 🎚️ SUBAGENT-MODEL advisory\n${v.reason}`,
      },
    }));
    process.exit(0);
  }

  // strict -> DENY
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `🎚️ SUBAGENT-MODEL-ENFORCE: ${v.reason}`,
    },
  }));
  process.exit(0);
}

main().catch(() => process.exit(0));
