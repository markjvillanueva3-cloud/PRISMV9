#!/usr/bin/env node
// tier: T1
/**
 * Action Triple Sync — PreTool Edit guard
 *
 * Universal Phase 0.6. When a dispatcher edit touches the `ACTIONS` /
 * `z.enum(` block, the same edit MUST also touch both the action schema
 * registration AND a `case "<action>":` branch. This prevents recurrence
 * of the R4 #3 bug pattern: new enum entry added without a matching
 * switch case → dead action, or worse, duplicate name silently routed
 * to the first case.
 *
 * Scope: only PreTool `Edit` / `MultiEdit` on files under
 * `mcp-server/src/tools/dispatchers/*.ts`.
 *
 * Semantics:
 *   - Extract the new action names introduced by the edit (delta between
 *     `old_string` and `new_string`)
 *   - For each new action name, the same edit must also introduce
 *     (`case "<name>":` or contain a delta into an actionSchemas object)
 *   - If missing either half, BLOCK with permissionDecision=deny
 *
 * Honors BOOTSTRAP_MODE.flag — degrades to warn-only when flag.active.
 *
 * @phase Universal 0.6 Auto-Wiring Transactional Closure
 */

import { createInterface } from "node:readline";
import { isBootstrapActive } from "./bootstrap-mode.mjs";

// ---------------------------------------------------------------------------
// stdin
// ---------------------------------------------------------------------------

async function readStdin() {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin });
    let raw = "";
    rl.on("line", (l) => { raw += l + "\n"; });
    rl.on("close", () => resolve(raw));
  });
}

// ---------------------------------------------------------------------------
// core
// ---------------------------------------------------------------------------

const DISPATCHER_PATTERN = /[/\\]mcp-server[/\\]src[/\\]tools[/\\]dispatchers[/\\].*Dispatcher\.ts$/;

function emit(decision, reason) {
  const out = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision,
    },
  };
  if (reason) out.hookSpecificOutput.permissionDecisionReason = reason;
  console.log(JSON.stringify(out));
  process.exit(0);
}

function emitAllow() {
  process.exit(0);
}

/** Extract quoted action strings added to an ACTIONS enum block. */
function extractAddedEnumActions(oldStr, newStr) {
  // Simple delta: any quoted "identifier" in newStr not in oldStr AND
  // that appears in a context that looks like an enum list entry.
  const newQuoted = [...newStr.matchAll(/^\s*"([a-z][a-z0-9_]*)"\s*,?/gm)].map((m) => m[1]);
  const oldQuoted = new Set([...oldStr.matchAll(/^\s*"([a-z][a-z0-9_]*)"\s*,?/gm)].map((m) => m[1]));
  return [...new Set(newQuoted.filter((a) => !oldQuoted.has(a)))];
}

/** Does the new content contain a `case "<action>":` branch? */
function hasCaseFor(action, content) {
  const re = new RegExp(`case\\s+"${escapeRegex(action)}"\\s*:`, "m");
  return re.test(content);
}

/** Does the new content contain a schema entry for the action? */
function hasSchemaFor(action, content) {
  // Match either actionSchemas.X or { action_name: SomeSchema } style
  const reDotted = new RegExp(`actionSchemas\\s*\\[\\s*"${escapeRegex(action)}"\\s*\\]`, "m");
  const reKey = new RegExp(`^\\s*${escapeRegex(action)}\\s*:\\s*(z\\.|[A-Z])`, "m");
  const reZodParse = new RegExp(`"${escapeRegex(action)}".*?z\\.|z\\.object\\(`, "m");
  return reDotted.test(content) || reKey.test(content) || reZodParse.test(content);
}

function escapeRegex(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

async function main() {
  let input;
  try {
    const raw = await readStdin();
    if (raw) input = JSON.parse(raw);
  } catch {
    emitAllow();
    return;
  }

  const toolName = input?.tool_name ?? process.env.TOOL_NAME ?? "";
  if (!["Edit", "MultiEdit"].includes(toolName)) { emitAllow(); return; }

  const filePath = input?.tool_input?.file_path ?? process.env.TOOL_INPUT_file_path ?? "";
  if (!DISPATCHER_PATTERN.test(filePath)) { emitAllow(); return; }

  // For MultiEdit, Claude Code passes an `edits` array; for Edit, `old_string`/`new_string`.
  const edits = Array.isArray(input?.tool_input?.edits)
    ? input.tool_input.edits
    : [{ old_string: input?.tool_input?.old_string ?? "", new_string: input?.tool_input?.new_string ?? "" }];

  // Aggregate new action names across all edits
  const newActions = new Set();
  const aggregatedNew = edits.map((e) => e.new_string ?? "").join("\n");
  const aggregatedOld = edits.map((e) => e.old_string ?? "").join("\n");
  for (const a of extractAddedEnumActions(aggregatedOld, aggregatedNew)) {
    newActions.add(a);
  }

  if (newActions.size === 0) { emitAllow(); return; }

  // For each new action, require the aggregated new content to contain BOTH:
  //   - a matching `case "<action>":` branch
  //   - a schema registration pattern
  const missing = [];
  for (const a of newActions) {
    const caseOk = hasCaseFor(a, aggregatedNew);
    const schemaOk = hasSchemaFor(a, aggregatedNew);
    if (!caseOk || !schemaOk) {
      missing.push(`${a} { case=${caseOk ? "ok" : "MISSING"}, schema=${schemaOk ? "ok" : "MISSING"} }`);
    }
  }

  if (missing.length === 0) { emitAllow(); return; }

  const reason =
    `🚫 ACTION TRIPLE SYNC BLOCKED: Dispatcher edit adds action(s) to z.enum without matching switch case(s) or schema entries.\n\n` +
    `FILE: ${filePath}\n\n` +
    `MISSING WIRING:\n${missing.map((m) => `  • ${m}`).join("\n")}\n\n` +
    `REQUIRED: Every new z.enum action must be added TOGETHER with\n` +
    `  (1) a case "<action>": switch branch routing to the engine\n` +
    `  (2) a Zod schema entry in actionSchemas (or inline z.object validation)\n\n` +
    `This prevents R4 #3 bug class — dead-code duplicates that Zod accepts but\n` +
    `the switch can never reach. See SCRUTINY-R4 for context.`;

  if (isBootstrapActive()) {
    emit("allow", `⚠️ BOOTSTRAP WARN-ONLY (0.6): ${reason}`);
    return;
  }

  emit("deny", reason);
}

main().catch((err) => {
  // Fail-open on hook error — do not block writes if the hook crashes
  console.error("action-triple-sync error:", err?.message ?? err);
  process.exit(0);
});
