#!/usr/bin/env node
// tier: T0
/**
 * pretool-memory-size-gate.mjs — U-MEMORY-COMPRESS-V2 (JULIETT-12CHAT-ALLOCATION-MS0).
 *
 * The DURABLE half of the MEMORY.md truncation fix. `memory-compress-v2.mjs`
 * compresses the index once; this PreToolUse:Edit gate prevents re-growth.
 *
 * MEMORY.md is auto-loaded into every chat at SessionStart; the Anthropic
 * harness silently truncates it past 24576 bytes ("Only part of it was
 * loaded"), breaking fleet-wide cross-session recall. `memory-size-watch.mjs`
 * (U-OBS-B1) and `stop-memory-size-watchdog.mjs` both only WARN — post-write,
 * advisory. Neither blocks. This gate is the missing hard stop.
 *
 * Logic — HARD-BLOCK an Edit/MultiEdit on the auto-memory MEMORY.md when the
 * edit would leave it ABOVE the 22000-byte target ceiling AND larger than it
 * is now. Equivalently: block iff `resultBytes > THRESHOLD && resultBytes >
 * currentBytes`. This is the spec's "bytes ≥ 22000 AND diff does not REDUCE"
 * (any growth from ≥22000 lands >22000) PLUS it also catches a single edit
 * that jumps the file from under-ceiling straight over it. A reduction, a
 * neutral edit, or any edit that keeps the file ≤22000 passes.
 *
 * Bypass: `PRISM_MEMORY_APPEND_OK=1` (logged in the allow reason) — for the
 * rare deliberate append. Kill switch: `PRISM_MEMORY_GROWTH_GATE_DISABLE=1`.
 *
 * Fail-OPEN by construction: a malformed payload, an un-simulable edit, or an
 * unreadable target file all ALLOW. The gate blocks only when it is CONFIDENT
 * the edit grows an already-large MEMORY.md — never on its own uncertainty
 * (R12: a gate that guesses-and-blocks is worse than the watchdog it backs).
 */
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Per U-MEMORY-COMPRESS-V2 spec: target ceiling = 22000 B (≈90% of the 24576 B
// harness truncation point). Overridable for tests / future tuning.
export const MEMORY_GATE_THRESHOLD = parseInt(
  process.env.PRISM_MEMORY_GATE_THRESHOLD || "22000",
  10,
) || 22000;

const DISABLED = process.env.PRISM_MEMORY_GROWTH_GATE_DISABLE === "1";
const APPEND_OK = process.env.PRISM_MEMORY_APPEND_OK === "1";

// ─── Pure core (exported for tests) ──────────────────────────────────────

/**
 * Is `filePath` the auto-loaded MEMORY.md? Matches any path whose normalized
 * form sits under `.claude/projects/.../memory/MEMORY.md` (case-insensitive —
 * the project dir is `H--PRISM` or `H--prism` depending on the Windows
 * config). Deliberately narrow: a random `memory.md` elsewhere is NOT gated.
 */
export function isMemoryFile(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  const p = filePath.replace(/\\/g, "/").toLowerCase();
  return p.includes("/.claude/projects/") && /\/memory\/memory\.md$/.test(p);
}

/**
 * Apply one Edit-shaped op `{old_string,new_string,replace_all}` to `content`.
 * Returns the new content, or `null` when the op cannot be applied (old_string
 * absent) — `null` propagates as "not simulable" → fail-open.
 */
export function applyEditToContent(content, edit) {
  if (typeof content !== "string" || !edit || typeof edit !== "object") return null;
  const oldStr = typeof edit.old_string === "string" ? edit.old_string : "";
  const newStr = typeof edit.new_string === "string" ? edit.new_string : "";
  if (edit.replace_all) {
    if (oldStr === "") return content; // replace_all with empty needle is a no-op
    return content.split(oldStr).join(newStr);
  }
  if (oldStr === "") {
    // A non-replace_all Edit with empty old_string is how a fresh-file Write
    // is sometimes modeled; treat as prepend so byte accounting stays honest.
    return newStr + content;
  }
  const idx = content.indexOf(oldStr);
  if (idx === -1) return null; // needle not found — cannot simulate
  return content.slice(0, idx) + newStr + content.slice(idx + oldStr.length);
}

/**
 * Simulate the full edit against `content`. Handles both Edit (top-level
 * old_string/new_string) and MultiEdit (`edits[]`). Returns the resulting
 * string, or `null` if any sub-edit is not simulable.
 */
export function simulateEdits(content, toolInput) {
  if (typeof content !== "string" || !toolInput || typeof toolInput !== "object") return null;
  const edits = Array.isArray(toolInput.edits)
    ? toolInput.edits
    : [{
        old_string: toolInput.old_string,
        new_string: toolInput.new_string,
        replace_all: toolInput.replace_all,
      }];
  if (edits.length === 0) return null;
  let result = content;
  for (const e of edits) {
    result = applyEditToContent(result, e);
    if (result === null) return null;
  }
  return result;
}

/**
 * The gate decision. `resultBytes` may be `null` (un-simulable) → fail-open.
 * Block iff the edit GROWS the file AND leaves it above `threshold`.
 */
export function decideGate({ currentBytes, resultBytes, appendOk = false, threshold = MEMORY_GATE_THRESHOLD }) {
  if (appendOk) {
    return { block: false, reason: "PRISM_MEMORY_APPEND_OK=1 — deliberate append bypass (logged)" };
  }
  if (resultBytes == null || !Number.isFinite(resultBytes)) {
    return { block: false, reason: "edit not simulable — fail-open (watchdog backstops)" };
  }
  if (!Number.isFinite(currentBytes)) {
    return { block: false, reason: "current size unknown — fail-open" };
  }
  if (resultBytes <= threshold) {
    return { block: false, reason: `result ${resultBytes}B ≤ ${threshold}B target — under ceiling` };
  }
  if (resultBytes <= currentBytes) {
    return { block: false, reason: `edit does not grow MEMORY.md (${currentBytes}B → ${resultBytes}B)` };
  }
  return {
    block: true,
    reason:
      `MEMORY.md edit BLOCKED — this edit grows the auto-loaded memory index ` +
      `${currentBytes}B → ${resultBytes}B, past the ${threshold}B target ceiling ` +
      `(harness truncates at 24576B → fleet-wide recall loss). ` +
      `Fix: move detail into the per-memory <slug>.md file and keep the index ` +
      `entry a ≤200-char pointer, OR run \`node scripts/memory-compress-v2.mjs --apply\` ` +
      `to re-compress first. Deliberate append: set PRISM_MEMORY_APPEND_OK=1.`,
  };
}

// ─── Hook I/O ────────────────────────────────────────────────────────────

function emitBlock(reason) {
  process.stdout.write(JSON.stringify({ continue: false, decision: "block", reason }));
  process.exit(2);
}

function emitAllow() {
  process.exit(0);
}

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

/** Byte size of `filePath` on disk, or `null` if unreadable. */
function fileBytes(filePath) {
  try {
    return statSync(filePath).size;
  } catch {
    return null;
  }
}

function main() {
  if (DISABLED) return emitAllow();

  const raw = readStdinSafe();
  if (!raw.trim()) return emitAllow();

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return emitAllow(); // malformed → never block
  }

  const tool = payload.tool_name || payload.toolName || "";
  if (tool !== "Edit" && tool !== "MultiEdit") return emitAllow();

  const toolInput = payload.tool_input || payload.toolInput || {};
  const filePath = toolInput.file_path || toolInput.filePath || "";
  if (!isMemoryFile(filePath)) return emitAllow();

  // Read the file being edited (not a resolved canonical — the edit applies
  // to whatever path the tool named).
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return emitAllow(); // unreadable → fail-open
  }
  const currentBytes = Buffer.byteLength(content, "utf8");

  const resultText = simulateEdits(content, toolInput);
  const resultBytes = resultText == null ? null : Buffer.byteLength(resultText, "utf8");

  const decision = decideGate({ currentBytes, resultBytes, appendOk: APPEND_OK });
  if (decision.block) return emitBlock(decision.reason);
  return emitAllow();
}

// Windows-safe main detection — normalize case + drive letter via file URL.
const __isMain = (() => {
  try {
    const argvUrl = pathToFileURL(resolve(process.argv[1] || "")).href.toLowerCase();
    return fileURLToPath(import.meta.url).toLowerCase() === fileURLToPath(argvUrl).toLowerCase();
  } catch {
    return false;
  }
})();
if (__isMain) main();
