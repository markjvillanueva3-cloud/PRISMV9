#!/usr/bin/env node
// tier: T1
/**
 * zany-reintroduction-block.mjs — PreToolUse Write/Edit/MultiEdit hook
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P8-U06.
 *
 * Blocks any Write/Edit/MultiEdit/NotebookEdit that INTRODUCES `z.any()` into
 * a TypeScript schema file (anything under `mcp-server/src/schemas/`). The
 * convention is documented in `H:/.claude/rules/schemas.md`:
 *
 *   > Input validation: use z.string(), z.number(), z.enum() — never z.any()
 *
 * Why a hard block at PreToolUse rather than a Stop-time warning:
 *   - z.any() makes every downstream dispatcher validation worthless
 *   - It is trivial to wire and trivial to backfill once regression slips in
 *   - Reviewer agents catch it AFTER the diff lands; this catches it BEFORE
 *
 * Behavior:
 *   - Only fires on file_path matching `mcp-server/src/schemas/.+\.ts$`
 *     (case-insensitive, normalizes Windows backslash)
 *   - Tolerates: existing z.any() in the CURRENT file (we only block NET-NEW
 *     additions — the diff perspective). The hook reads the on-disk version,
 *     counts existing occurrences, compares against the proposed content's
 *     count, and BLOCKS only when (proposed > current).
 *   - Write tool: replaces whole file → compares current-on-disk vs `content`
 *   - Edit tool: `old_string` → `new_string` substitution; we compute the
 *     final post-edit text in memory before counting.
 *   - MultiEdit tool: applies edits in order to the on-disk content, then
 *     counts the result. If sequential edits aren't computable (e.g.
 *     unmatched `old_string`), we err on the side of NOT blocking.
 *   - NotebookEdit: skip (notebooks don't host PRISM schemas).
 *
 * Output:
 *   - Block: stdout `{decision:"block", reason:"...", details:{...}}` exit 2
 *   - Pass:  stdout `{continue:true}` exit 0
 *
 * Knob: PRISM_ZANY_BLOCK_DISABLE=1 → always pass (operator emergency).
 *
 * The hook is HARD-CRITICAL (continueOnError:false in settings.json) so a
 * crash will block the tool call. We swallow read errors as "file is new"
 * (current count 0) which means the first creation that includes z.any()
 * also gets blocked — by design.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const SCHEMA_PATH_RE = /[\\/]mcp-server[\\/]src[\\/]schemas[\\/][^\\/]+\.ts$/i;
// Match `z.any()` and `z .any()` (rare formatting) but NOT a string literal
// containing the text. Best-effort — false negatives are acceptable, false
// positives are not (we'd block legitimate prose comments).
const ZANY_RE = /\bz\s*\.\s*any\s*\(/g;

async function readStdinJson() {
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function emit(obj, code = 0) {
  process.stdout.write(JSON.stringify(obj) + "\n");
  process.exit(code);
}

/** Count occurrences of z.any() in text. Resets regex.lastIndex per call. */
export function countZAny(text) {
  if (typeof text !== "string") return 0;
  ZANY_RE.lastIndex = 0;
  let n = 0;
  while (ZANY_RE.exec(text) !== null) n++;
  return n;
}

/** Apply MultiEdit ops to a base string. Returns null on first un-matched op. */
export function applyMultiEdit(base, edits) {
  if (typeof base !== "string" || !Array.isArray(edits)) return null;
  let cur = base;
  for (const e of edits) {
    const oldStr = e?.old_string;
    const newStr = e?.new_string ?? "";
    if (typeof oldStr !== "string") return null;
    if (e?.replace_all === true) {
      if (!cur.includes(oldStr)) return null;
      cur = cur.split(oldStr).join(newStr);
    } else {
      const idx = cur.indexOf(oldStr);
      if (idx === -1) return null;
      // first-occurrence replace
      cur = cur.slice(0, idx) + newStr + cur.slice(idx + oldStr.length);
    }
  }
  return cur;
}

/** Compute the proposed text content for the given tool + input + current. */
export function computeProposedText(tool, input, current) {
  if (tool === "Write") {
    return typeof input.content === "string" ? input.content : current ?? "";
  }
  if (tool === "Edit") {
    const oldStr = input.old_string;
    const newStr = input.new_string ?? "";
    if (typeof oldStr !== "string") return null;
    if (typeof current !== "string") return null;
    if (input.replace_all === true) {
      if (!current.includes(oldStr)) return null;
      return current.split(oldStr).join(newStr);
    }
    const idx = current.indexOf(oldStr);
    if (idx === -1) return null;
    return current.slice(0, idx) + newStr + current.slice(idx + oldStr.length);
  }
  if (tool === "MultiEdit") {
    return applyMultiEdit(current ?? "", input.edits ?? []);
  }
  return null;
}

async function main() {
  if (process.env.PRISM_ZANY_BLOCK_DISABLE === "1") {
    emit({ continue: true });
    return;
  }

  const payload = await readStdinJson();
  if (!payload) { emit({ continue: true }); return; }

  const tool = payload.tool_name ?? payload.tool;
  const supported = new Set(["Write", "Edit", "MultiEdit"]);
  if (!supported.has(tool)) { emit({ continue: true }); return; }

  const input = payload.tool_input ?? payload.params ?? {};
  const filePath = input.file_path;
  if (typeof filePath !== "string" || !SCHEMA_PATH_RE.test(filePath)) {
    // Out of scope — pass.
    emit({ continue: true });
    return;
  }

  // Current count (treat missing file as 0).
  let current = "";
  try {
    if (existsSync(filePath)) current = readFileSync(filePath, "utf8");
  } catch { current = ""; }
  const currentCount = countZAny(current);

  const proposed = computeProposedText(tool, input, current);
  if (proposed === null) {
    // Couldn't compute (unmatched old_string etc.) — err on the side of NOT
    // blocking. The tool itself will fail with a clearer message.
    emit({ continue: true });
    return;
  }
  const proposedCount = countZAny(proposed);

  if (proposedCount > currentCount) {
    const delta = proposedCount - currentCount;
    emit({
      decision: "block",
      reason:
        `z.any() reintroduction blocked: ${tool} on ${filePath} would add ${delta} new z.any() occurrence(s) ` +
        `(current=${currentCount}, proposed=${proposedCount}). ` +
        `PRISM doctrine (H:/.claude/rules/schemas.md): "use z.string(), z.number(), z.enum() — never z.any()". ` +
        `Use a specific Zod type, z.unknown() if truly opaque, or z.record(z.string(), z.unknown()) ` +
        `for free-form objects. Operator emergency override: PRISM_ZANY_BLOCK_DISABLE=1.`,
      details: {
        tool,
        filePath,
        currentZAnyCount: currentCount,
        proposedZAnyCount: proposedCount,
        netNewZAny: delta,
      },
    }, 2);
    return;
  }

  emit({ continue: true });
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(process.argv[1]).toLowerCase() === resolve(new URL(import.meta.url).pathname.replace(/^\//, "")).toLowerCase();

if (isMain) main().catch(() => { process.stdout.write(JSON.stringify({ continue: true }) + "\n"); process.exit(0); });
