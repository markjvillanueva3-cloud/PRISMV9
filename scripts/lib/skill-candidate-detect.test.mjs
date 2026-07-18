// HERMES-MS0 / U-HERMES03 — tests for skill-candidate-detect (pure lib).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_TOOL_CALLS,
  MAX_TOOL_CALLS,
  SUCCESSFUL_OUTCOMES,
  SCHEMA_VERSION,
  classifyWindow,
  buildSignature,
  classifyKind,
  formatCandidateEntry,
} from "../../scripts/lib/skill-candidate-detect.mjs";

describe("constants", () => {
  it("MIN_TOOL_CALLS is 3", () => assert.equal(MIN_TOOL_CALLS, 3));
  it("MAX_TOOL_CALLS is 50", () => assert.equal(MAX_TOOL_CALLS, 50));
  it("SUCCESSFUL_OUTCOMES is frozen", () => assert.equal(Object.isFrozen(SUCCESSFUL_OUTCOMES), true));
  it("SUCCESSFUL_OUTCOMES contains committed", () => assert.equal(SUCCESSFUL_OUTCOMES.includes("committed"), true));
  it("SCHEMA_VERSION is 1.0.0", () => assert.equal(SCHEMA_VERSION, "1.0.0"));
});

describe("classifyWindow — eligibility gates", () => {
  it("returns ineligible on null window", () => {
    const r = classifyWindow(null);
    assert.equal(r.eligible, false);
    assert.equal(r.reason, "no-window");
  });
  it("returns ineligible on missing toolCalls", () => {
    const r = classifyWindow({});
    assert.equal(r.eligible, false);
    assert.match(r.reason, /too-few-calls/);
  });
  it("returns ineligible below MIN_TOOL_CALLS", () => {
    const r = classifyWindow({ toolCalls: [{ tool: "Edit" }, { tool: "Edit" }], outcome: "committed" });
    assert.equal(r.eligible, false);
    assert.equal(r.reason, "too-few-calls:2<3");
  });
  it("returns ineligible above MAX_TOOL_CALLS", () => {
    const arr = new Array(60).fill({ tool: "Bash" });
    const r = classifyWindow({ toolCalls: arr, outcome: "committed" });
    assert.equal(r.eligible, false);
    assert.equal(r.reason, "too-many-calls:60>50");
  });
  it("returns ineligible on regression-alert true", () => {
    const r = classifyWindow({
      toolCalls: [{ tool: "Edit" }, { tool: "Edit" }, { tool: "Bash" }],
      outcome: "committed",
      regressionAlert: true,
    });
    assert.equal(r.eligible, false);
    assert.equal(r.reason, "regression-alert-set");
  });
  it("returns ineligible on missing outcome", () => {
    const r = classifyWindow({ toolCalls: [{ tool: "Edit" }, { tool: "Edit" }, { tool: "Bash" }] });
    assert.equal(r.eligible, false);
    assert.equal(r.reason, "outcome-not-success:missing");
  });
  it("returns ineligible on non-success outcome", () => {
    const r = classifyWindow({
      toolCalls: [{ tool: "Edit" }, { tool: "Edit" }, { tool: "Bash" }],
      outcome: "test-fail",
    });
    assert.equal(r.eligible, false);
    assert.equal(r.reason, "outcome-not-success:test-fail");
  });
});

describe("classifyWindow — success path", () => {
  it("returns eligible on min-3 successful committed workflow", () => {
    const r = classifyWindow({
      toolCalls: [{ tool: "Edit" }, { tool: "Edit" }, { tool: "Bash" }],
      outcome: "committed",
    });
    assert.equal(r.eligible, true);
    assert.equal(r.reason, "successful-workflow");
    assert.equal(r.signature, "Edit|Edit|Bash");
    assert.equal(r.kind, "edit-heavy");
    assert.equal(r.callCount, 3);
    assert.equal(r.outcome, "committed");
  });
  it("accepts tests-pass + build-pass outcomes", () => {
    for (const outcome of ["tests-pass", "build-pass"]) {
      const r = classifyWindow({
        toolCalls: [{ tool: "Bash" }, { tool: "Bash" }, { tool: "Bash" }],
        outcome,
      });
      assert.equal(r.eligible, true, `outcome ${outcome} should be eligible`);
    }
  });
});

describe("buildSignature", () => {
  it("returns empty string on non-array", () => {
    assert.equal(buildSignature(null), "");
    assert.equal(buildSignature(undefined), "");
    assert.equal(buildSignature("nope"), "");
  });
  it("joins tool names in order", () => {
    assert.equal(
      buildSignature([{ tool: "Read" }, { tool: "Edit" }, { tool: "Bash" }]),
      "Read|Edit|Bash"
    );
  });
  it("renders missing tool as ?", () => {
    assert.equal(buildSignature([{ tool: "Read" }, {}, { tool: "Bash" }]), "Read|?|Bash");
  });
});

describe("classifyKind", () => {
  it("returns mixed on empty / non-array", () => {
    assert.equal(classifyKind([]), "mixed");
    assert.equal(classifyKind(null), "mixed");
  });
  it("classifies edit-heavy when edits ≥ 50%", () => {
    assert.equal(
      classifyKind([{ tool: "Edit" }, { tool: "Edit" }, { tool: "Bash" }]),
      "edit-heavy"
    );
  });
  it("classifies search-heavy when reads/greps/globs ≥ 50%", () => {
    assert.equal(
      classifyKind([{ tool: "Grep" }, { tool: "Read" }, { tool: "Edit" }]),
      "search-heavy"
    );
  });
  it("classifies build-heavy when bash ≥ 50%", () => {
    assert.equal(
      classifyKind([{ tool: "Bash" }, { tool: "Bash" }, { tool: "Edit" }]),
      "build-heavy"
    );
  });
  it("classifies mixed when no category hits 50%", () => {
    // 4 unknown tools (0 edit, 0 search, 0 build) → total counted = 0 → mixed
    assert.equal(
      classifyKind([{ tool: "Task" }, { tool: "Task" }, { tool: "Task" }, { tool: "Task" }]),
      "mixed"
    );
  });
});

describe("formatCandidateEntry", () => {
  const T = Date.parse("2026-05-20T18:00:00Z");
  it("stamps schemaVersion + ISO at + classification fields", () => {
    const c = classifyWindow({
      toolCalls: [{ tool: "Edit" }, { tool: "Edit" }, { tool: "Bash" }],
      outcome: "committed",
    });
    const entry = formatCandidateEntry(c, { slot: "zulu", chatId: "claude-abc12345" }, T);
    assert.equal(entry.schemaVersion, "1.0.0");
    assert.equal(entry.at, "2026-05-20T18:00:00.000Z");
    assert.equal(entry.slot, "zulu");
    assert.equal(entry.chatId, "claude-abc12345");
    assert.equal(entry.eligible, true);
    assert.equal(entry.signature, "Edit|Edit|Bash");
    assert.equal(entry.outcome, "committed");
    assert.equal(entry.callCount, 3);
    assert.equal(entry.kind, "edit-heavy");
  });
  it("records ineligible entries too (for audit)", () => {
    const c = classifyWindow({ toolCalls: [{ tool: "Edit" }], outcome: "committed" });
    const entry = formatCandidateEntry(c, {}, T);
    assert.equal(entry.eligible, false);
    assert.equal(entry.reason, "too-few-calls:1<3");
    assert.equal(entry.slot, null);
    assert.equal(entry.chatId, null);
  });
});
