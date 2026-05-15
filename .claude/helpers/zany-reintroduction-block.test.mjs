/**
 * zany-reintroduction-block — behavioural tests for INTEL-OLLAMA-OBSIDIAN-MS0/P8-U06.
 *
 * Tests the pure helpers AND the subprocess smoke. The hook is HARD-BLOCKING
 * (PreToolUse decision:"block" exit 2) so bugs would brick the harness — every
 * decision path must have a real-value test, no stubs.
 *
 * Run: node H:/prism/.claude/helpers/zany-reintroduction-block.test.mjs
 */

import { strict as assert } from "node:assert";
import {
  mkdtempSync, rmSync, writeFileSync, mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  countZAny,
  applyMultiEdit,
  computeProposedText,
} from "../hooks/zany-reintroduction-block.mjs";

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const HOOK_PATH = resolve(REPO_ROOT, ".claude", "hooks", "zany-reintroduction-block.mjs");
const NODE_BIN = process.execPath;

const SUBPROCESS_TIMEOUT_MS = 10_000;

let passed = 0;
let failed = 0;
const failures = [];

function it(name, fn) {
  let tmp;
  try {
    tmp = mkdtempSync(join(tmpdir(), "prism-zany-"));
    fn(tmp);
    passed++;
    process.stdout.write(".");
  } catch (err) {
    failed++;
    failures.push({ name, err });
    process.stdout.write("F");
  } finally {
    if (tmp) { try { rmSync(tmp, { recursive: true, force: true }); } catch {} }
  }
}

/** Build a schemas-looking path in tmp dir (must match SCHEMA_PATH_RE). */
function schemaPath(tmp, name = "x.ts") {
  // The regex requires `[\\/]mcp-server[\\/]src[\\/]schemas[\\/]` so emulate it.
  const dir = join(tmp, "mcp-server", "src", "schemas");
  mkdirSync(dir, { recursive: true });
  return join(dir, name);
}

// ---------------------------------------------------------------------------
// countZAny — regex correctness
// ---------------------------------------------------------------------------

it("countZAny returns 0 for empty/non-string", () => {
  assert.equal(countZAny(""), 0);
  assert.equal(countZAny(undefined), 0);
  assert.equal(countZAny(null), 0);
  assert.equal(countZAny(123), 0);
});

it("countZAny finds single z.any() occurrence", () => {
  assert.equal(countZAny("const x = z.any();"), 1);
});

it("countZAny finds multiple z.any() occurrences", () => {
  assert.equal(countZAny("a:z.any(),b:z.any(),c:z.any()"), 3);
});

it("countZAny is stable across repeated calls (no regex.lastIndex bleed)", () => {
  const txt = "x = z.any()";
  assert.equal(countZAny(txt), 1);
  assert.equal(countZAny(txt), 1);
  assert.equal(countZAny(txt), 1);
});

it("countZAny tolerates whitespace variations like z . any (rare formatting)", () => {
  assert.equal(countZAny("z . any()"), 1);
  assert.equal(countZAny("z .any ()"), 1);
});

it("countZAny does NOT match z.unknown() (regression guard)", () => {
  assert.equal(countZAny("z.unknown()"), 0);
});

it("countZAny does NOT match z.array() (false positive guard)", () => {
  assert.equal(countZAny("z.array(z.string())"), 0);
});

it("countZAny matches across multi-line", () => {
  assert.equal(countZAny("const x = z.object({\n  foo: z.any(),\n  bar: z.any(),\n});"), 2);
});

// ---------------------------------------------------------------------------
// applyMultiEdit
// ---------------------------------------------------------------------------

it("applyMultiEdit returns null on non-array edits", () => {
  assert.equal(applyMultiEdit("abc", null), null);
  assert.equal(applyMultiEdit("abc", "not-array"), null);
});

it("applyMultiEdit returns null on non-string base", () => {
  assert.equal(applyMultiEdit(null, []), null);
});

it("applyMultiEdit applies a single substitution", () => {
  const r = applyMultiEdit("hello world", [{ old_string: "world", new_string: "PRISM" }]);
  assert.equal(r, "hello PRISM");
});

it("applyMultiEdit applies sequential substitutions", () => {
  const r = applyMultiEdit("a b c", [
    { old_string: "a", new_string: "1" },
    { old_string: "b", new_string: "2" },
    { old_string: "c", new_string: "3" },
  ]);
  assert.equal(r, "1 2 3");
});

it("applyMultiEdit returns null on unmatched old_string", () => {
  const r = applyMultiEdit("abc", [{ old_string: "xyz", new_string: "..." }]);
  assert.equal(r, null);
});

it("applyMultiEdit honors replace_all", () => {
  const r = applyMultiEdit("a a a", [{ old_string: "a", new_string: "b", replace_all: true }]);
  assert.equal(r, "b b b");
});

// ---------------------------------------------------------------------------
// computeProposedText
// ---------------------------------------------------------------------------

it("computeProposedText: Write returns input.content verbatim", () => {
  assert.equal(computeProposedText("Write", { content: "abc" }, "ignored"), "abc");
});

it("computeProposedText: Write returns current when no content", () => {
  assert.equal(computeProposedText("Write", {}, "fallback"), "fallback");
});

it("computeProposedText: Edit applies single substitution", () => {
  assert.equal(
    computeProposedText("Edit", { old_string: "z.any()", new_string: "z.string()" }, "x: z.any()"),
    "x: z.string()",
  );
});

it("computeProposedText: Edit returns null on unmatched old_string", () => {
  assert.equal(
    computeProposedText("Edit", { old_string: "nope", new_string: "..." }, "abc"),
    null,
  );
});

it("computeProposedText: Edit returns null on missing old_string", () => {
  assert.equal(computeProposedText("Edit", { new_string: "x" }, "abc"), null);
});

it("computeProposedText: Edit honors replace_all", () => {
  assert.equal(
    computeProposedText("Edit", { old_string: "a", new_string: "b", replace_all: true }, "a a a"),
    "b b b",
  );
});

it("computeProposedText: MultiEdit applies all edits in order", () => {
  assert.equal(
    computeProposedText("MultiEdit", { edits: [{ old_string: "a", new_string: "1" }, { old_string: "b", new_string: "2" }] }, "a b"),
    "1 2",
  );
});

it("computeProposedText: unknown tool returns null", () => {
  assert.equal(computeProposedText("Bash", { cmd: "ls" }, ""), null);
});

// ---------------------------------------------------------------------------
// Hook entry-point smoke (subprocess) — the load-bearing block logic
// ---------------------------------------------------------------------------

function runHook(input) {
  const r = spawnSync(NODE_BIN, [HOOK_PATH], {
    input: JSON.stringify(input),
    encoding: "utf8",
    timeout: SUBPROCESS_TIMEOUT_MS,
  });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {}
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, parsed };
}

it("hook PASSES (exit 0) for non-Write/Edit tools (Read)", () => {
  const r = runHook({ tool_name: "Read", tool_input: { file_path: "anywhere.ts" } });
  assert.equal(r.status, 0);
  assert.equal(r.parsed?.continue, true);
});

it("hook PASSES for empty stdin", () => {
  const r = runHook({});
  assert.equal(r.status, 0);
  assert.equal(r.parsed?.continue, true);
});

it("hook PASSES for non-schemas path", (tmp) => {
  const p = join(tmp, "not-a-schema.ts").replace(/\\/g, "/");
  writeFileSync(p, "x");
  const r = runHook({ tool_name: "Write", tool_input: { file_path: p, content: "z.any()" } });
  assert.equal(r.status, 0);
  assert.equal(r.parsed?.continue, true);
});

it("hook BLOCKS new z.any() in schemas path (Write)", (tmp) => {
  const p = schemaPath(tmp, "newSchema.ts").replace(/\\/g, "/");
  // No file yet → currentCount=0; proposed has 1.
  const r = runHook({ tool_name: "Write", tool_input: { file_path: p, content: "import { z } from 'zod';\nexport const s = z.any();" } });
  assert.equal(r.status, 2);
  assert.equal(r.parsed?.decision, "block");
  assert.match(r.parsed?.reason ?? "", /z\.any\(\) reintroduction blocked/);
  assert.equal(r.parsed?.details?.netNewZAny, 1);
});

it("hook PASSES when proposed has same z.any() count as current", (tmp) => {
  const p = schemaPath(tmp, "existing.ts").replace(/\\/g, "/");
  writeFileSync(p, "x: z.any()");
  const r = runHook({ tool_name: "Write", tool_input: { file_path: p, content: "y: z.any()" } });
  assert.equal(r.status, 0);
  assert.equal(r.parsed?.continue, true);
});

it("hook PASSES when proposed REMOVES z.any() (current>proposed)", (tmp) => {
  const p = schemaPath(tmp, "fix.ts").replace(/\\/g, "/");
  writeFileSync(p, "a: z.any()\nb: z.any()");
  const r = runHook({ tool_name: "Write", tool_input: { file_path: p, content: "a: z.string()\nb: z.string()" } });
  assert.equal(r.status, 0);
  assert.equal(r.parsed?.continue, true);
});

it("hook BLOCKS Edit that adds z.any()", (tmp) => {
  const p = schemaPath(tmp, "edited.ts").replace(/\\/g, "/");
  writeFileSync(p, "x: z.string()");
  const r = runHook({
    tool_name: "Edit",
    tool_input: { file_path: p, old_string: "z.string()", new_string: "z.any()" },
  });
  assert.equal(r.status, 2);
  assert.equal(r.parsed?.decision, "block");
});

it("hook PASSES Edit that replaces z.any() with z.string()", (tmp) => {
  const p = schemaPath(tmp, "good-edit.ts").replace(/\\/g, "/");
  writeFileSync(p, "x: z.any()");
  const r = runHook({
    tool_name: "Edit",
    tool_input: { file_path: p, old_string: "z.any()", new_string: "z.string()" },
  });
  assert.equal(r.status, 0);
  assert.equal(r.parsed?.continue, true);
});

it("hook BLOCKS MultiEdit that adds net z.any()", (tmp) => {
  const p = schemaPath(tmp, "multi.ts").replace(/\\/g, "/");
  writeFileSync(p, "a: z.string()\nb: z.string()");
  const r = runHook({
    tool_name: "MultiEdit",
    tool_input: {
      file_path: p,
      edits: [
        { old_string: "a: z.string()", new_string: "a: z.any()" },
        { old_string: "b: z.string()", new_string: "b: z.any()" },
      ],
    },
  });
  assert.equal(r.status, 2);
  assert.equal(r.parsed?.decision, "block");
  assert.equal(r.parsed?.details?.netNewZAny, 2);
});

it("hook PASSES MultiEdit when sequential edits don't increase z.any()", (tmp) => {
  const p = schemaPath(tmp, "neutral.ts").replace(/\\/g, "/");
  writeFileSync(p, "a: z.any()");
  const r = runHook({
    tool_name: "MultiEdit",
    tool_input: {
      file_path: p,
      edits: [{ old_string: "a: z.any()", new_string: "a: z.unknown()" }],
    },
  });
  assert.equal(r.status, 0);
  assert.equal(r.parsed?.continue, true);
});

it("hook PASSES when MultiEdit op has unmatched old_string (errs-on-side-of-pass)", (tmp) => {
  const p = schemaPath(tmp, "unmatched.ts").replace(/\\/g, "/");
  writeFileSync(p, "x: z.string()");
  const r = runHook({
    tool_name: "MultiEdit",
    tool_input: { file_path: p, edits: [{ old_string: "NOPE", new_string: "x: z.any()" }] },
  });
  assert.equal(r.status, 0);
  assert.equal(r.parsed?.continue, true);
});

it("hook respects PRISM_ZANY_BLOCK_DISABLE=1 override", (tmp) => {
  const p = schemaPath(tmp, "override.ts").replace(/\\/g, "/");
  const r = spawnSync(NODE_BIN, [HOOK_PATH], {
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: p, content: "z.any()" } }),
    encoding: "utf8",
    timeout: SUBPROCESS_TIMEOUT_MS,
    env: { ...process.env, PRISM_ZANY_BLOCK_DISABLE: "1" },
  });
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout.trim());
  assert.equal(parsed.continue, true);
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

process.stdout.write(`\n\n${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write("\nFailures:\n");
  for (const f of failures) {
    process.stdout.write(`  ✗ ${f.name}\n    ${f.err.message}\n`);
  }
  process.exit(1);
}
process.exit(0);
