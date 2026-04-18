import { describe, it, expect } from "vitest";
import {
  WEDMProgramVerificationEngine,
  wedmProgramVerificationEngine,
  type VerificationInput,
  type PostOutputSummary,
  type CollisionResultSummary,
  type CapabilityManifestSummary,
  type SafetyEnvelopeSummary,
} from "../engines/WEDMProgramVerificationEngine.js";

function makePost(overrides: Partial<PostOutputSummary> = {}): PostOutputSummary {
  return {
    success: true,
    controller: "mitsubishi_fa",
    dialect_name: "Mitsubishi FA",
    line_count: 120,
    operation_count: 3,
    warnings: [],
    ...overrides,
  };
}

function makeCollision(
  overrides: Partial<CollisionResultSummary> = {},
): CollisionResultSummary {
  return {
    pass: true,
    hard_block: false,
    collision_count: 0,
    critical_count: 0,
    min_clearance_mm: 5.0,
    ...overrides,
  };
}

function makeCapability(
  overrides: Partial<CapabilityManifestSummary> = {},
): CapabilityManifestSummary {
  return {
    process_type: "wire_edm",
    supported_controllers: [
      "mitsubishi_fa", "mitsubishi_mv",
      "sodick_aq", "sodick_al",
      "makino_u", "makino_eu",
      "agie_cut", "agie_charm",
      "fanuc_robocut",
    ],
    entry_points: ["WEDMPrintToProgramEngine"],
    ...overrides,
  };
}

function makeInput(overrides: Partial<VerificationInput> = {}): VerificationInput {
  return {
    program_id: "prog-001",
    requested_process_type: "wire_edm",
    expected_operation_count: 3,
    post_output: makePost(),
    collision_result: makeCollision(),
    capability: makeCapability(),
    ...overrides,
  };
}

describe("WEDMProgramVerificationEngine", () => {
  const engine = new WEDMProgramVerificationEngine();

  it("exposes a singleton", () => {
    expect(wedmProgramVerificationEngine).toBeInstanceOf(
      WEDMProgramVerificationEngine,
    );
  });

  it("reports engine metadata", () => {
    expect(engine.engineId).toBe("WEDMProgramVerificationEngine");
    expect(engine.version).toBe("1.0.0");
  });

  // ── PASS PATH ───────────────────────────────────────────────────────────────

  it("passes a fully compliant program", () => {
    const result = engine.verify(makeInput());
    expect(result.pass).toBe(true);
    expect(result.status).toBe("pass");
    expect(result.hard_block).toBe(false);
    expect(result.block_count).toBe(0);
    expect(result.warn_count).toBe(0);
    expect(result.aggregate_score).toBeGreaterThan(0.4);
  });

  it("includes all baseline checks on a valid program", () => {
    const result = engine.verify(makeInput());
    const names = result.checks.map((c) => c.name);
    expect(names).toContain("controller_supported");
    expect(names).toContain("process_type_in_manifest");
    expect(names).toContain("collision_check");
    expect(names).toContain("post_processor_success");
    expect(names).toContain("gcode_non_empty");
    expect(names).toContain("operation_count_matches");
    expect(names).toContain("no_critical_warnings");
  });

  it("adds safety envelope check when provided", () => {
    const envelope: SafetyEnvelopeSummary = { pass: true, violations: [] };
    const result = engine.verify(makeInput({ safety_envelope: envelope }));
    const names = result.checks.map((c) => c.name);
    expect(names).toContain("safety_envelope");
  });

  it("omits safety envelope check when absent", () => {
    const result = engine.verify(makeInput());
    const names = result.checks.map((c) => c.name);
    expect(names).not.toContain("safety_envelope");
  });

  // ── CONTROLLER ──────────────────────────────────────────────────────────────

  it("blocks an unsupported controller", () => {
    const result = engine.verify(
      makeInput({
        post_output: makePost({ controller: "unknown_controller" }),
        capability: makeCapability({ supported_controllers: ["mitsubishi_fa"] }),
      }),
    );
    expect(result.hard_block).toBe(true);
    expect(result.pass).toBe(false);
    const check = result.checks.find((c) => c.name === "controller_supported");
    expect(check?.status).toBe("block");
    expect(check?.hard_block).toBe(true);
  });

  it("accepts a controller listed only in capability manifest", () => {
    const result = engine.verify(
      makeInput({
        post_output: makePost({ controller: "custom_oem_dialect" }),
        capability: makeCapability({
          supported_controllers: ["custom_oem_dialect"],
        }),
      }),
    );
    const check = result.checks.find((c) => c.name === "controller_supported");
    expect(check?.status).toBe("pass");
  });

  // ── PROCESS TYPE ────────────────────────────────────────────────────────────

  it("blocks when requested process does not match manifest", () => {
    const result = engine.verify(
      makeInput({ requested_process_type: "milling" }),
    );
    expect(result.hard_block).toBe(true);
    const check = result.checks.find(
      (c) => c.name === "process_type_in_manifest",
    );
    expect(check?.status).toBe("block");
  });

  // ── COLLISION ───────────────────────────────────────────────────────────────

  it("blocks when collision check reports hard_block", () => {
    const result = engine.verify(
      makeInput({
        collision_result: makeCollision({
          pass: false,
          hard_block: true,
          collision_count: 2,
          critical_count: 2,
          min_clearance_mm: -0.5,
        }),
      }),
    );
    expect(result.hard_block).toBe(true);
    expect(result.aggregate_score).toBe(0);
  });

  it("warns on non-critical collisions without blocking", () => {
    const result = engine.verify(
      makeInput({
        collision_result: makeCollision({
          pass: false,
          hard_block: false,
          collision_count: 1,
          critical_count: 0,
          min_clearance_mm: 0.8,
        }),
      }),
    );
    expect(result.hard_block).toBe(false);
    const check = result.checks.find((c) => c.name === "collision_check");
    expect(check?.status).toBe("warn");
  });

  // ── POST SUCCESS / GCODE ───────────────────────────────────────────────────

  it("blocks when post processor failed", () => {
    const result = engine.verify(
      makeInput({ post_output: makePost({ success: false }) }),
    );
    expect(result.hard_block).toBe(true);
    const check = result.checks.find(
      (c) => c.name === "post_processor_success",
    );
    expect(check?.status).toBe("block");
  });

  it("blocks when no G-code lines emitted", () => {
    const result = engine.verify(
      makeInput({ post_output: makePost({ line_count: 0 }) }),
    );
    expect(result.hard_block).toBe(true);
    const check = result.checks.find((c) => c.name === "gcode_non_empty");
    expect(check?.status).toBe("block");
  });

  // ── OPERATION COUNT ─────────────────────────────────────────────────────────

  it("warns on operation-count mismatch without blocking", () => {
    const result = engine.verify(
      makeInput({
        expected_operation_count: 5,
        post_output: makePost({ operation_count: 3 }),
      }),
    );
    expect(result.hard_block).toBe(false);
    expect(result.status).toBe("warn");
    const check = result.checks.find(
      (c) => c.name === "operation_count_matches",
    );
    expect(check?.status).toBe("warn");
  });

  // ── SAFETY ENVELOPE ─────────────────────────────────────────────────────────

  it("warns on safety envelope violations", () => {
    const result = engine.verify(
      makeInput({
        safety_envelope: {
          pass: false,
          violations: ["wire exceeds Z-travel limit at op 2"],
        },
      }),
    );
    const check = result.checks.find((c) => c.name === "safety_envelope");
    expect(check?.status).toBe("warn");
    expect(check?.hard_block).toBe(false);
  });

  // ── WARNING ESCALATION ──────────────────────────────────────────────────────

  it("warns on critical post warnings", () => {
    const result = engine.verify(
      makeInput({
        post_output: makePost({
          warnings: ["Critical: offset exceeds wire compensation range"],
        }),
      }),
    );
    const check = result.checks.find((c) => c.name === "no_critical_warnings");
    expect(check?.status).toBe("warn");
  });

  it("ignores non-critical warnings", () => {
    const result = engine.verify(
      makeInput({
        post_output: makePost({
          warnings: ["Info: using default flushing pressure"],
        }),
      }),
    );
    const check = result.checks.find((c) => c.name === "no_critical_warnings");
    expect(check?.status).toBe("pass");
  });

  // ── AGGREGATE SCORE ─────────────────────────────────────────────────────────

  it("sets aggregate_score to 0 when hard-blocked", () => {
    const result = engine.verify(
      makeInput({ post_output: makePost({ success: false }) }),
    );
    expect(result.aggregate_score).toBe(0);
  });

  it("max_possible_score reflects all checks run", () => {
    const without_envelope = engine.verify(makeInput());
    const with_envelope = engine.verify(
      makeInput({
        safety_envelope: { pass: true, violations: [] },
      }),
    );
    expect(with_envelope.max_possible_score).toBeGreaterThan(
      without_envelope.max_possible_score,
    );
  });

  it("summary reflects pass/warn/block status", () => {
    const pass_result = engine.verify(makeInput());
    expect(pass_result.summary).toMatch(/PASS/);

    const warn_result = engine.verify(
      makeInput({
        expected_operation_count: 99,
        post_output: makePost({ operation_count: 1 }),
      }),
    );
    expect(warn_result.summary).toMatch(/WARNING/i);

    const block_result = engine.verify(
      makeInput({ post_output: makePost({ line_count: 0 }) }),
    );
    expect(block_result.summary).toMatch(/BLOCK/i);
  });

  it("pass_count + warn_count + block_count equals total checks", () => {
    const result = engine.verify(
      makeInput({ safety_envelope: { pass: true, violations: [] } }),
    );
    expect(result.pass_count + result.warn_count + result.block_count).toBe(
      result.checks.length,
    );
  });

  // ── MULTIPLE BLOCKS ─────────────────────────────────────────────────────────

  it("reports all block reasons when multiple fail", () => {
    const result = engine.verify(
      makeInput({
        requested_process_type: "milling",
        post_output: makePost({
          controller: "unknown",
          success: false,
          line_count: 0,
        }),
        capability: makeCapability({ supported_controllers: [] }),
      }),
    );
    expect(result.block_count).toBeGreaterThanOrEqual(4);
    expect(result.hard_block).toBe(true);
  });
});
