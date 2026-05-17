/**
 * process-slot-map-name-sanitize.test.mjs — fail-on-revert guard for the
 * 2026-05-17 enum-blind fix (golf slot).
 *
 * ROOT CAUSE (regression, twice): Windows PowerShell 5.1 ConvertTo-Json emits
 * raw C0 control bytes (U+0000..U+001F) inside string literals instead of
 * \uXXXX. ANY process whose string field carries such a byte makes Node's
 * strict JSON.parse throw "Bad control character in string literal", which
 * blinds the ENTIRE process enumeration → fleet-reaper sees 0 procs → orphans
 * accumulate → commit pressure climbs unseen → a chat OOM-crashes.
 *
 * The 2026-05-16b fix sanitized only `$p.CommandLine`. A live repro on
 * 2026-05-17 (golf, fleet-memory-monitor at 96% commit) hit it again at JSON
 * pos 97856 — past the cmd-field byte budget, i.e. a DIFFERENT string field
 * (`$p.Name`) carried the byte. The 2026-05-17 fix extends the strip to
 * `$p.Name`.
 *
 * This test asserts BOTH string-producing fields in the embedded PowerShell
 * template carry the `-replace '[\\x00-\\x1F]', ' '` guard. It fails loudly
 * if a future edit reverts either — catching the revert at the source level
 * (the runtime repro is racy: it needs a process with a control byte in its
 * name to be alive at sample time).
 *
 * Uses node:test (NOT vitest) — the .claude/ vitest config has a known
 * vite-transform infra bug that blocks helper-dir suites (CLAUDE.md §Recent
 * regressions, fleet-reaper.test.mjs note). node:test runs clean.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "..", ".claude", "helpers", "process-slot-map.mjs");

const src = readFileSync(SRC, "utf8");

// The exact sanitization fragment as it appears in the JS template literal.
// Doubled backslashes survive the literal so .NET regex receives [\x00-\x1F].
const STRIP = String.raw`-replace '[\\x00-\\x1F]', ' '`;

test("windowsEnumerate sanitizes $p.Name (closes 2026-05-17 enum-blind)", () => {
  const nameLine = src
    .split("\n")
    .find((l) => l.includes("name") && l.includes("$p.Name"));
  assert.ok(nameLine, "expected a `name = ... $p.Name ...` line in the PS template");
  assert.ok(
    nameLine.includes(STRIP),
    `the $p.Name field MUST carry the control-char strip ${STRIP}; ` +
      `found instead: ${nameLine.trim()}`,
  );
});

test("windowsEnumerate still sanitizes $p.CommandLine (2026-05-16b fix intact)", () => {
  const cmdLine = src
    .split("\n")
    .find((l) => l.includes("cmd") && l.includes("$p.CommandLine"));
  assert.ok(cmdLine, "expected a `cmd = ... $p.CommandLine ...` line in the PS template");
  assert.ok(
    cmdLine.includes(STRIP),
    `the $p.CommandLine field MUST keep the control-char strip ${STRIP}; ` +
      `found instead: ${cmdLine.trim()}`,
  );
});

test("both sanitized fields use the null-preserving if/else form", () => {
  // `if ($p.X) { ... } else { $null }` — keeps a genuine null distinct from
  // an empty string for normalizeProc downstream.
  for (const [field, src_expr] of [["name", "$p.Name"], ["cmd", "$p.CommandLine"]]) {
    const line = src.split("\n").find((l) => l.includes(field) && l.includes(src_expr));
    assert.ok(
      line && line.includes(`if (${src_expr})`) && line.includes("else { $null }"),
      `${field} must use the null-preserving if/else form; found: ${line?.trim()}`,
    );
  }
});
