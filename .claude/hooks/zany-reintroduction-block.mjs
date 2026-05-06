// zany-reintroduction-block.mjs — PreToolUse(Write|Edit) hook
//
// INTEL-OLLAMA-OBSIDIAN-MS0/P8-U06.
//
// Blocks Write/Edit operations that ADD `z.any()` calls to any file under
// **/schemas/**.ts. P8-U05 spent effort eliminating 184 z.any() instances
// from the schema layer; this hook prevents them from creeping back in.
//
// Behaviour:
//   - PreToolUse for Write tool: parse the entire `content` payload and
//     count z.any() occurrences. Block if >0 inside a schemas/ file.
//   - PreToolUse for Edit tool: parse `new_string` and `old_string`. Block
//     if the proposed edit ADDS z.any() that wasn't already present.
//   - All other tools / file paths: pass through (continue:true).
//
// Failure mode: any error → continue:true. Never blocks legitimate work
// because of a hook crash.
//
// All real logic in `decideBlock()` so tests can drive it without spawning
// a process.
//
// @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P8-U06

import { fileURLToPath } from "node:url";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// PURE LOGIC (exported for tests)
// ---------------------------------------------------------------------------

/**
 * True when `filePath` lives in a `schemas/` directory and ends in `.ts`.
 * Cross-platform: normalises Windows backslashes.
 */
export function isSchemaFile(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) return false;
  const norm = filePath.replace(/\\/g, "/").toLowerCase();
  if (!norm.endsWith(".ts")) return false;
  return /\/schemas\/[^/]+\.ts$/.test(norm);
}

/**
 * Count `z.any(...)` call occurrences in source. The regex matches the
 * literal token `z.any(` so it isn't fooled by `z.anyof(` or comments
 * containing "z.any" without parens.
 */
export function countZAnyCalls(content) {
  if (typeof content !== "string" || content.length === 0) return 0;
  const matches = content.match(/\bz\.any\s*\(/g);
  return matches ? matches.length : 0;
}

/**
 * Decide whether to block a Write or Edit operation.
 *
 * @param {object} args
 * @param {"Write"|"Edit"|string} args.toolName
 * @param {string} args.filePath        — file_path from the tool input
 * @param {string} [args.newContent]    — Write: full content; Edit: new_string
 * @param {string} [args.oldContent]    — Edit: old_string (omitted for Write)
 * @returns {{block: boolean, reason?: string, addedCount: number}}
 */
export function decideBlock(args) {
  if (!args || typeof args !== "object") {
    return { block: false, addedCount: 0 };
  }
  const { toolName, filePath, newContent, oldContent } = args;
  if (toolName !== "Write" && toolName !== "Edit") {
    return { block: false, addedCount: 0 };
  }
  if (!isSchemaFile(filePath)) {
    return { block: false, addedCount: 0 };
  }
  if (typeof newContent !== "string") {
    // Nothing to inspect — let it through; another hook may sanity-check.
    return { block: false, addedCount: 0 };
  }
  const newCount = countZAnyCalls(newContent);
  if (toolName === "Write") {
    // Write replaces the whole file. ANY z.any() in newContent is a block.
    if (newCount > 0) {
      return {
        block: true,
        addedCount: newCount,
        reason: `Write would introduce ${newCount} z.any() call(s) into ${filePath}. P8-U05 eliminated 184 z.any() instances; reintroduction is gated. Use a typed Zod schema (z.string()/z.number()/z.object({...})) or z.unknown() if the field is intentionally opaque.`,
      };
    }
    return { block: false, addedCount: 0 };
  }
  // Edit: count z.any() in old_string (which the new_string will replace).
  // If new_string adds MORE z.any() than old_string had, block. Equal count
  // (refactoring) is allowed; net-zero or net-negative passes.
  const oldCount = typeof oldContent === "string" ? countZAnyCalls(oldContent) : 0;
  const delta = newCount - oldCount;
  if (delta > 0) {
    return {
      block: true,
      addedCount: delta,
      reason: `Edit would add ${delta} new z.any() call(s) to ${filePath} (old: ${oldCount}, new: ${newCount}). P8-U05 eliminated 184 instances; net additions are gated. Consider z.unknown() or a typed schema instead.`,
    };
  }
  return { block: false, addedCount: delta };
}

/**
 * Parse a PreToolUse hook stdin payload. Returns the relevant fields or
 * null if the payload doesn't carry the shape we expect.
 *
 * The Claude Code hook contract gives us:
 *   {
 *     hook_event_name: "PreToolUse",
 *     tool_name: "Write" | "Edit" | ...,
 *     tool_input: { file_path, content?, new_string?, old_string?, ... }
 *   }
 */
export function parsePreToolUsePayload(rawJson) {
  if (typeof rawJson !== "string" || rawJson.length === 0) return null;
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const toolName = parsed.tool_name;
  const input = parsed.tool_input ?? {};
  if (typeof toolName !== "string") return null;
  return {
    toolName,
    filePath: typeof input.file_path === "string" ? input.file_path : "",
    newContent: typeof input.content === "string"
      ? input.content
      : (typeof input.new_string === "string" ? input.new_string : ""),
    oldContent: typeof input.old_string === "string" ? input.old_string : "",
  };
}

// ---------------------------------------------------------------------------
// I/O LAYER
// ---------------------------------------------------------------------------

async function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => resolve(""));
    // Safety: if no stdin is delivered within 250ms, resolve with empty.
    setTimeout(() => resolve(Buffer.concat(chunks).toString("utf8")), 250);
  });
}

async function main() {
  let raw = "";
  try {
    raw = await readStdin();
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    process.exit(0);
  }
  const args = parsePreToolUsePayload(raw);
  if (!args) {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    process.exit(0);
  }
  let decision;
  try {
    decision = decideBlock(args);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    process.exit(0);
  }
  if (decision.block) {
    process.stdout.write(JSON.stringify({
      continue: false,
      decision: "block",
      reason: decision.reason,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: decision.reason,
      },
    }) + "\n");
    process.exit(0);
  }
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

const _isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (_isMain) {
  main().catch(() => {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    process.exit(0);
  });
}
