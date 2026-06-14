// Knob-suppression tests for compact-interval-warning.mjs (R6 -- no pushback to compact).
// The hook short-circuits on the disable knobs BEFORE any git/handoff read, so these are
// hermetic (no repo fixture needed).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const HOOK = "H:/prism/.claude/hooks/compact-interval-warning.mjs";

function run(env) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ session_id: "test-cic", stop_hook_active: false }),
    encoding: "utf-8",
    timeout: 10_000,
    env: { ...process.env, ...env },
  });
  try { return JSON.parse(r.stdout || "{}"); } catch { return { _raw: r.stdout }; }
}

describe("compact-interval-warning knob suppression (R6 no-pushback)", () => {
  it("PRISM_TASK_BOUNDARY_COMPACT_DISABLE=1 -> continues silently, no compact nag", () => {
    const out = run({ PRISM_TASK_BOUNDARY_COMPACT_DISABLE: "1" });
    assert.equal(out.continue, true);
    const ctx = out.hookSpecificOutput?.additionalContext || "";
    assert.doesNotMatch(ctx, /Run \/compact before|compact every/i, "must not nag to compact when disabled");
  });

  it("PRISM_COMPACT_INTERVAL_WARN_DISABLE=1 -> continues silently", () => {
    const out = run({ PRISM_COMPACT_INTERVAL_WARN_DISABLE: "1" });
    assert.equal(out.continue, true);
    const ctx = out.hookSpecificOutput?.additionalContext || "";
    assert.doesNotMatch(ctx, /Run \/compact before/i);
  });

  it("regression guard: the old imperative pushback text is GONE from the source", () => {
    const src = fs.readFileSync(HOOK, "utf8");
    assert.doesNotMatch(src, /Run \/compact before the next non-trivial task/, "imperative pushback must be removed");
    assert.match(src, /PRISM_TASK_BOUNDARY_COMPACT_DISABLE/, "knob check must be present");
  });
});
