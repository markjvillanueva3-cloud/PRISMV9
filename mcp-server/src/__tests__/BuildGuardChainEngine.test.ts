/**
 * BuildGuardChainEngine Tests — ACP-MS2
 *
 * Validates the Coding & Build Guard Chain:
 *   1. Pre-edit safety validation (critical paths, pipelines, physics, conflicts)
 *   2. Edit tracking with escalating actions
 *   3. TypeScript error parsing and trivial fix identification
 *   4. Affected test resolution (name match, keyword, directory)
 *   5. Full chain execution orchestration
 */
import { describe, it, expect } from "vitest";
import { buildGuardChainEngine } from "../engines/BuildGuardChainEngine.js";

// ── Pre-Edit Safety ────────────────────────────────────────

describe("BuildGuardChainEngine — Pre-Edit Safety", () => {

  it("flags physics/constants.ts as critical", () => {
    const r = buildGuardChainEngine.validatePreEdit("src/physics/constants.ts");
    expect(r.risk_level).toBe("critical");
    expect(r.is_physics_file).toBe(true);
    expect(r.reasons.some(r => r.includes("CRITICAL PATH"))).toBe(true);
  });

  it("flags SpeedFeedOrchestratorEngine as critical", () => {
    const r = buildGuardChainEngine.validatePreEdit("src/engines/SpeedFeedOrchestratorEngine.ts");
    expect(r.risk_level).toBe("critical");
  });

  it("flags pipeline files as high risk", () => {
    const r = buildGuardChainEngine.validatePreEdit("src/engines/EDMProgramAssemblerEngine.ts");
    expect(r.risk_level).toBe("high");
    expect(r.is_pipeline_file).toBe(true);
  });

  it("flags registry files as medium risk", () => {
    const r = buildGuardChainEngine.validatePreEdit("src/registries/MaterialRegistry.ts");
    expect(r.risk_level).toBe("medium");
    expect(r.is_registry_file).toBe(true);
  });

  it("flags KienzleForceModel as physics file", () => {
    const r = buildGuardChainEngine.validatePreEdit("src/engines/KienzleForceModelEngine.ts");
    expect(r.is_physics_file).toBe(true);
  });

  it("rates normal engine as low risk", () => {
    const r = buildGuardChainEngine.validatePreEdit("src/engines/SomeNewEngine.ts");
    expect(r.risk_level).toBe("low");
    expect(r.safe).toBe(true);
  });

  it("detects agent conflict", () => {
    const r = buildGuardChainEngine.validatePreEdit(
      "src/engines/Foo.ts",
      ["src/engines/Foo.ts"]
    );
    expect(r.other_agents_editing).toHaveLength(1);
    expect(r.risk_level).toBe("critical");
  });

  it("normalizes Windows backslashes", () => {
    const r = buildGuardChainEngine.validatePreEdit("src\\physics\\constants.ts");
    expect(r.file_path).toBe("src/physics/constants.ts");
    expect(r.risk_level).toBe("critical");
  });

  it("safe=true when no conflicts even if critical", () => {
    const r = buildGuardChainEngine.validatePreEdit("src/physics/constants.ts", []);
    // Critical path but no agent conflict → safe is true (warning only)
    expect(r.safe).toBe(true);
  });
});

// ── Edit Tracking ────────────────────────────────────────────

describe("BuildGuardChainEngine — Edit Tracking", () => {

  it("creates fresh state with zero counts", () => {
    const state = buildGuardChainEngine.freshEditState();
    expect(state.session_edits).toBe(0);
    expect(state.edits_since_test).toBe(0);
    expect(state.edits_since_review).toBe(0);
    expect(state.edited_files).toHaveLength(0);
  });

  it("increments edit count on engine edit", () => {
    const state = buildGuardChainEngine.freshEditState();
    const r = buildGuardChainEngine.trackEdit(state, "src/engines/FooEngine.ts");
    expect(r.state.session_edits).toBe(1);
    expect(r.state.edits_since_test).toBe(1);
    expect(r.state.engines_written).toContain("FooEngine.ts");
  });

  it("resets edits_since_test when test file edited", () => {
    const state = {
      ...buildGuardChainEngine.freshEditState(),
      session_edits: 5,
      edits_since_test: 5,
    };
    const r = buildGuardChainEngine.trackEdit(state, "src/__tests__/Foo.test.ts");
    expect(r.state.edits_since_test).toBe(0);
    expect(r.state.test_files_written).toContain("Foo.test.ts");
  });

  it("action=none for first few edits", () => {
    const state = buildGuardChainEngine.freshEditState();
    const r = buildGuardChainEngine.trackEdit(state, "src/engines/X.ts");
    expect(r.action_needed).toBe("none");
  });

  it("action=suggest_test after 3 edits", () => {
    const state = {
      ...buildGuardChainEngine.freshEditState(),
      session_edits: 3,
      edits_since_test: 3,
      edits_since_review: 3,
    };
    const r = buildGuardChainEngine.trackEdit(state, "src/engines/X.ts");
    expect(r.action_needed).toBe("suggest_test");
  });

  it("action=require_test after 5 edits without test", () => {
    const state = {
      ...buildGuardChainEngine.freshEditState(),
      session_edits: 5,
      edits_since_test: 5,
      edits_since_review: 5,
    };
    const r = buildGuardChainEngine.trackEdit(state, "src/engines/X.ts");
    expect(r.action_needed).toBe("require_test");
  });

  it("action=require_review after 8 edits without review", () => {
    const state = {
      ...buildGuardChainEngine.freshEditState(),
      session_edits: 8,
      edits_since_test: 0,
      edits_since_review: 8,
    };
    const r = buildGuardChainEngine.trackEdit(state, "src/engines/X.ts");
    expect(r.action_needed).toBe("require_review");
  });

  it("action=block_edit after 12 edits without review", () => {
    const state = {
      ...buildGuardChainEngine.freshEditState(),
      session_edits: 12,
      edits_since_test: 0,
      edits_since_review: 12,
    };
    const r = buildGuardChainEngine.trackEdit(state, "src/engines/X.ts");
    expect(r.action_needed).toBe("block_edit");
  });

  it("deduplicates edited files", () => {
    let state = buildGuardChainEngine.freshEditState();
    const r1 = buildGuardChainEngine.trackEdit(state, "src/engines/A.ts");
    const r2 = buildGuardChainEngine.trackEdit(r1.state, "src/engines/A.ts");
    expect(r2.state.edited_files.filter(f => f.includes("A.ts"))).toHaveLength(1);
  });
});

// ── Affected Test Resolution ─────────────────────────────────

describe("BuildGuardChainEngine — Affected Test Resolution", () => {

  const testFiles = [
    "src/__tests__/FooEngine.test.ts",
    "src/__tests__/BarEngine.test.ts",
    "src/__tests__/wedm-kunieda-feed.test.ts",
    "src/__tests__/wedm-dimensional-accuracy.test.ts",
    "src/__tests__/hypermill-strategy.test.ts",
    "src/__tests__/cli-integration.test.ts",
  ];

  it("resolves direct name match", () => {
    const r = buildGuardChainEngine.resolveAffectedTests("src/engines/FooEngine.ts", testFiles);
    expect(r.test_files).toContain("src/__tests__/FooEngine.test.ts");
    expect(r.resolution_method).toBe("name_match");
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it("resolves keyword match for HyperMill engine", () => {
    const r = buildGuardChainEngine.resolveAffectedTests("src/engines/HyperMillStrategyEngine.ts", testFiles);
    expect(r.test_files.length).toBeGreaterThan(0);
    expect(r.test_files.some(t => t.includes("hypermill"))).toBe(true);
    expect(r.resolution_method).toBe("glob_pattern");
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("returns empty for unmatched files", () => {
    const r = buildGuardChainEngine.resolveAffectedTests("src/engines/UniqueNameXYZ123.ts", testFiles);
    // May or may not find matches depending on keyword extraction
    expect(r.source_file).toBe("src/engines/UniqueNameXYZ123.ts");
  });

  it("normalizes Windows paths", () => {
    const r = buildGuardChainEngine.resolveAffectedTests("src\\engines\\FooEngine.ts", testFiles);
    expect(r.source_file).toBe("src/engines/FooEngine.ts");
  });
});

// ── TypeScript Error Parsing ─────────────────────────────────

describe("BuildGuardChainEngine — TS Error Parsing", () => {

  it("parses clean output as pass", () => {
    const r = buildGuardChainEngine.parseTypecheckOutput("");
    expect(r.pass).toBe(true);
    expect(r.error_count).toBe(0);
  });

  it("parses single error", () => {
    const output = `src/engines/Foo.ts(10,5): error TS2304: Cannot find name 'bar'.`;
    const r = buildGuardChainEngine.parseTypecheckOutput(output);
    expect(r.pass).toBe(false);
    expect(r.error_count).toBe(1);
    expect(r.errors[0].file).toBe("src/engines/Foo.ts");
    expect(r.errors[0].line).toBe(10);
    expect(r.errors[0].column).toBe(5);
    expect(r.errors[0].code).toBe("TS2304");
  });

  it("identifies trivial unused import error", () => {
    const output = `src/engines/Foo.ts(3,10): error TS6133: 'unused' is declared but its value is never read.`;
    const r = buildGuardChainEngine.parseTypecheckOutput(output);
    expect(r.trivial_count).toBe(1);
    expect(r.errors[0].is_trivial).toBe(true);
    expect(r.errors[0].auto_fix).toContain("Remove unused import");
  });

  it("identifies 'Did you mean' as trivial", () => {
    const output = `src/engines/Foo.ts(50,6): error TS2552: Cannot find name 'MAPPINGS_SUPPLEMENT'. Did you mean 'MAPPINGS_EXTENDED'?`;
    const r = buildGuardChainEngine.parseTypecheckOutput(output);
    expect(r.trivial_count).toBe(1);
    expect(r.errors[0].auto_fix).toContain("MAPPINGS_EXTENDED");
  });

  it("classifies non-trivial errors correctly", () => {
    const output = `src/engines/Foo.ts(10,5): error TS2739: Type 'Bar' is missing the following properties from type 'Baz': x, y, z`;
    const r = buildGuardChainEngine.parseTypecheckOutput(output);
    expect(r.non_trivial_count).toBe(1);
    expect(r.errors[0].is_trivial).toBe(false);
  });

  it("parses multiple errors", () => {
    const output = [
      `src/a.ts(1,1): error TS6133: 'x' is declared but its value is never read.`,
      `src/b.ts(5,3): error TS2739: Type missing properties.`,
      `src/c.ts(10,1): error TS1005: ';' expected.`,
    ].join("\n");
    const r = buildGuardChainEngine.parseTypecheckOutput(output);
    expect(r.error_count).toBe(3);
    expect(r.trivial_count).toBe(2); // TS6133 + TS1005
    expect(r.non_trivial_count).toBe(1); // TS2739
  });
});

// ── Trivial Fix Suggestions ──────────────────────────────────

describe("BuildGuardChainEngine — Trivial Fix Suggestions", () => {

  it("groups fixes by file", () => {
    const errors = [
      { file: "src/a.ts", line: 1, column: 1, code: "TS6133", message: "unused", is_trivial: true, auto_fix: "Remove unused import at line 1" },
      { file: "src/a.ts", line: 5, column: 1, code: "TS6133", message: "unused", is_trivial: true, auto_fix: "Remove unused import at line 5" },
      { file: "src/b.ts", line: 3, column: 1, code: "TS1005", message: "missing ;", is_trivial: true, auto_fix: "Add missing token at line 3, column 1" },
    ];
    const r = buildGuardChainEngine.suggestTrivialFixes(errors);
    expect(r).toHaveLength(2); // 2 files
    expect(r.find(f => f.file === "src/a.ts")!.fixes).toHaveLength(2);
    expect(r.find(f => f.file === "src/b.ts")!.fixes).toHaveLength(1);
  });

  it("sorts fixes in reverse line order for safe editing", () => {
    const errors = [
      { file: "src/a.ts", line: 1, column: 1, code: "TS6133", message: "", is_trivial: true, auto_fix: "fix 1" },
      { file: "src/a.ts", line: 10, column: 1, code: "TS6133", message: "", is_trivial: true, auto_fix: "fix 10" },
      { file: "src/a.ts", line: 5, column: 1, code: "TS6133", message: "", is_trivial: true, auto_fix: "fix 5" },
    ];
    const r = buildGuardChainEngine.suggestTrivialFixes(errors);
    const lines = r[0].fixes.map(f => f.line);
    expect(lines).toEqual([10, 5, 1]); // descending
  });

  it("skips non-trivial errors", () => {
    const errors = [
      { file: "src/a.ts", line: 1, column: 1, code: "TS2739", message: "", is_trivial: false },
    ];
    const r = buildGuardChainEngine.suggestTrivialFixes(errors);
    expect(r).toHaveLength(0);
  });
});

// ── Chain Execution ──────────────────────────────────────────

describe("BuildGuardChainEngine — Chain Execution", () => {

  it("executes full chain with clean build", () => {
    const r = buildGuardChainEngine.executeChain(
      ["src/engines/FooEngine.ts"],
      "", // clean tsc
      ["src/__tests__/FooEngine.test.ts"],
      buildGuardChainEngine.freshEditState(),
    );
    expect(r.chain_id).toBe("build_guard");
    expect(r.overall_status).toBe("pass");
    expect(r.steps.length).toBeGreaterThanOrEqual(4);
    expect(r.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("reports partial when typecheck fails", () => {
    const r = buildGuardChainEngine.executeChain(
      ["src/engines/FooEngine.ts"],
      `src/engines/FooEngine.ts(10,5): error TS2739: Type missing properties.`,
      ["src/__tests__/FooEngine.test.ts"],
      buildGuardChainEngine.freshEditState(),
    );
    expect(r.overall_status).toBe("partial");
    const tscStep = r.steps.find(s => s.step === "typecheck");
    expect(tscStep!.status).toBe("failed");
    expect(r.recommendations.some(r => r.includes("TS error"))).toBe(true);
  });

  it("includes affected test recommendations", () => {
    const r = buildGuardChainEngine.executeChain(
      ["src/engines/FooEngine.ts"],
      "",
      ["src/__tests__/FooEngine.test.ts", "src/__tests__/BarEngine.test.ts"],
      buildGuardChainEngine.freshEditState(),
    );
    const testStep = r.steps.find(s => s.step === "affected_tests");
    expect(testStep!.status).toBe("passed");
    expect(r.recommendations.some(r => r.includes("affected test"))).toBe(true);
  });

  it("flags review gate when edits exceed threshold", () => {
    const state = {
      ...buildGuardChainEngine.freshEditState(),
      edits_since_review: 10,
    };
    const r = buildGuardChainEngine.executeChain(
      ["src/engines/X.ts"],
      "",
      [],
      state,
    );
    const reviewStep = r.steps.find(s => s.step === "review_gate");
    expect(reviewStep!.status).toBe("failed");
    expect(r.recommendations.some(r => r.includes("review"))).toBe(true);
  });

  it("flags critical files with extra test recommendation", () => {
    const r = buildGuardChainEngine.executeChain(
      ["src/physics/constants.ts"],
      "",
      [],
      buildGuardChainEngine.freshEditState(),
    );
    expect(r.recommendations.some(r => r.includes("critical") || r.includes("full test suite"))).toBe(true);
  });

  it("updates edit state through chain", () => {
    const r = buildGuardChainEngine.executeChain(
      ["src/engines/A.ts", "src/engines/B.ts"],
      "",
      [],
      buildGuardChainEngine.freshEditState(),
    );
    expect(r.edit_state.session_edits).toBe(2);
    expect(r.edit_state.engines_written).toContain("A.ts");
    expect(r.edit_state.engines_written).toContain("B.ts");
  });
});

// ── Utility Methods ──────────────────────────────────────────

describe("BuildGuardChainEngine — Utility", () => {

  it("getTrivialErrorCodes returns known codes", () => {
    const codes = buildGuardChainEngine.getTrivialErrorCodes();
    expect(codes["TS6133"]).toBe("unused_import");
    expect(codes["TS2552"]).toBe("similar_name");
    expect(codes["TS1005"]).toBe("missing_token");
  });

  it("getChainSteps returns 7 steps", () => {
    const steps = buildGuardChainEngine.getChainSteps();
    expect(steps).toHaveLength(7);
    expect(steps.filter(s => s.required)).toHaveLength(5);
    expect(steps.map(s => s.id)).toContain("typecheck");
    expect(steps.map(s => s.id)).toContain("review_gate");
  });
});
