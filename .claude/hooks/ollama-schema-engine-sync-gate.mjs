#!/usr/bin/env node
// tier: T0
/**
 * ollama-schema-engine-sync-gate — PreToolUse hook on Edit/Write of schema files.
 *
 * The U-WIRE13 killer (part 2 of 2). Reads the engine-contract cache
 * populated by U-AF06 (ollama-engine-api-extractor) and compares the
 * proposed Zod enum literals in the schema being edited against the
 * union literals captured from engine source. If a drift is detected
 * in autonomous mode without an explicit override, the edit is BLOCKED.
 *
 * BLOCKING when:
 *   - PRISM_AUTONOMOUS=1 AND
 *   - File matches src/schemas/*.ts AND
 *   - Cache exists AND has engine enums AND
 *   - Proposed schema enums drift from cached engine enums
 *
 * NON-BLOCKING when:
 *   - non-autonomous mode
 *   - PRISM_SCHEMA_SYNC_OVERRIDE=1 explicitly set
 *   - target file is not a schema source file
 *   - cache missing / no engine enums available (fail-OPEN)
 *   - schema has no Zod enums (TS-only file)
 *   - all enum sets match
 *
 * U-AF07 of AUTONOMOUS-FOOLPROOF-MS0.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  isSchemaSourceFile,
  decideSchemaSyncGate,
} from "./lib/autonomous-foolproof-logic.mjs";

const CACHE_RELATIVE = "state/shared/ENGINE_CONTRACTS_CACHE.json";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function findProjectRoot(startCwd = process.cwd()) {
  let cur = startCwd;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return startCwd;
}

function loadCache(cachePath) {
  try {
    if (!fs.existsSync(cachePath)) return null;
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Resolve the proposed source for an Edit or Write tool call.
 * - Write → tool_input.content is the full new source.
 * - Edit  → reconstruct by reading the existing file and applying
 *           the str-replace; if anything fails, fall back to the
 *           existing file content (gate runs against current state).
 */
function resolveProposedSource(toolName, toolInput, filePath) {
  if (!toolInput || typeof toolInput !== "object") return null;

  if (toolName === "Write") {
    return typeof toolInput.content === "string" ? toolInput.content : null;
  }

  if (toolName === "Edit") {
    let current = "";
    try {
      current = fs.readFileSync(filePath, "utf8");
    } catch {
      // file may not exist yet — Edit on a non-existent file is rare; skip
      return null;
    }
    const oldStr = typeof toolInput.old_string === "string" ? toolInput.old_string : "";
    const newStr = typeof toolInput.new_string === "string" ? toolInput.new_string : "";
    if (!oldStr) return current;
    if (toolInput.replace_all) {
      return current.split(oldStr).join(newStr);
    }
    return current.replace(oldStr, newStr);
  }

  return null;
}

function emitContinue(extraContext) {
  const payload = { continue: true };
  if (extraContext) {
    payload.hookSpecificOutput = {
      hookEventName: "PreToolUse",
      additionalContext: extraContext,
    };
  }
  console.log(JSON.stringify(payload));
}

function emitBlock(human, drifts) {
  console.log(JSON.stringify({
    decision: "block",
    reason: human,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: human,
      enum_drift: {
        drift_count: drifts.length,
        drifts,
      },
    },
  }));
}

async function main() {
  const isAutonomous = process.env.PRISM_AUTONOMOUS === "1";
  const overrideEnabled = process.env.PRISM_SCHEMA_SYNC_OVERRIDE === "1";

  const raw = readStdinSafe();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  const toolName = payload?.tool_name ?? "";
  const toolInput = payload?.tool_input ?? {};
  const filePath = toolInput?.file_path ?? "";

  if (!isSchemaSourceFile(filePath)) {
    emitContinue();
    return;
  }

  const proposedSrc = resolveProposedSource(toolName, toolInput, filePath);

  const root = findProjectRoot();
  const cache = loadCache(path.join(root, CACHE_RELATIVE));

  const decision = decideSchemaSyncGate({
    filePath,
    proposedSrc,
    isAutonomous,
    overrideEnabled,
    cache,
  });

  if (decision.continue) {
    emitContinue();
    return;
  }

  // BLOCK path
  const drifts = decision.drifts ?? [];
  const lines = [
    "🛑 SCHEMA-ENGINE SYNC GATE — Zod enum drift vs cached engine contract.",
    "",
    `File: ${filePath}`,
    `Drifted fields: ${drifts.length}`,
    "",
  ];
  for (const d of drifts.slice(0, 5)) {
    lines.push(`  • ${d.field} (line ~${d.line_hint ?? "?"}):`);
    if (d.only_in_schema?.length) {
      lines.push(`      schema-only: ${d.only_in_schema.join(", ")}`);
    }
    if (d.only_in_engine?.length) {
      lines.push(`      engine-only: ${d.only_in_engine.join(", ")}`);
    }
  }
  if (drifts.length > 5) {
    lines.push(`  …and ${drifts.length - 5} more`);
  }
  lines.push("");
  lines.push("Either align the schema with the engine contract, or update the");
  lines.push("engine first. Override (one-shot): set PRISM_SCHEMA_SYNC_OVERRIDE=1.");
  lines.push("Cache lives at state/shared/ENGINE_CONTRACTS_CACHE.json.");

  emitBlock(lines.join("\n"), drifts);
}

if (process.argv[1]?.endsWith("ollama-schema-engine-sync-gate.mjs")) {
  main();
}
