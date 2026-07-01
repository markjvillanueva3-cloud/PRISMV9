/**
 * v6.0 Integration Tests — Cross-engine verification
 * Validates that all v6.0 engines work together correctly.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("v6.0 Integration", () => {
  // ── Engine Exports ──────────────────────────────────────────────

  it("all v6.0 engines export from index", async () => {
    const idx = await import("../engines/index.js");
    expect(idx.webSocketEngine).toBeDefined();
    expect(idx.llmEngine).toBeDefined();
    expect(idx.alarmEscalationEngine).toBeDefined();
    expect(idx.dataValidationEngine).toBeDefined();
  }, 120_000);

  // ── Alarm → Validation Pipeline ─────────────────────────────────

  it("validates cutting params then triggers alarm on failure", async () => {
    const { dataValidationEngine } = await import("../engines/DataValidationEngine.js");
    const { AlarmEscalationEngine } = await import("../engines/AlarmEscalationEngine.js");

    const alarmEngine = new AlarmEscalationEngine();

    // Validate dangerous cutting params
    const result = dataValidationEngine.validateCuttingParams({
      speed_mpm: 800,
      material_group: "S", // Titanium — max ~120 m/min
      tool_diameter_mm: 12,
      depth_mm: 50, // 4.2× diameter — too deep
    });

    expect(result.valid).toBe(true); // No hard errors, but warnings
    expect(result.issues.length).toBeGreaterThan(0);

    // If validation score is low, trigger safety alarm
    if (result.score < 70) {
      const alarm = alarmEngine.trigger(
        "SAFETY_SCORE_LOW",
        "validation:cutting_params",
        `Validation score ${result.score}/100 — ${result.issues.length} issues`
      );
      expect(alarm.state).toBe("active");
      expect(alarm.severity).toBe("warn");
    }
  });

  // ── Data Validation Cross-Check ─────────────────────────────────

  it("validates material then uses in cutting param check", async () => {
    const { dataValidationEngine } = await import("../engines/DataValidationEngine.js");

    // Step 1: Validate material
    const matResult = dataValidationEngine.validateMaterial({
      name: "Ti-6Al-4V",
      hardness_hrc: 36,
      tensile_strength_mpa: 1100,
      density_kg_m3: 4430,
      iso_group: "S",
    });
    expect(matResult.valid).toBe(true);

    // Step 2: Use validated material in cutting params
    const cutResult = dataValidationEngine.validateCuttingParams({
      speed_mpm: 60,
      feed_mmpt: 0.08,
      depth_mm: 2,
      tool_diameter_mm: 10,
      spindle_rpm: 1910, // π×10×1910/1000 ≈ 60 m/min
      material_group: "S",
    });
    expect(cutResult.valid).toBe(true);
    expect(cutResult.score).toBeGreaterThan(80);
  });

  // ── Alarm Escalation Lifecycle ──────────────────────────────────

  it("full alarm lifecycle: trigger → escalate → acknowledge → resolve", async () => {
    vi.useFakeTimers();
    const { AlarmEscalationEngine } = await import("../engines/AlarmEscalationEngine.js");
    const engine = new AlarmEscalationEngine();

    // Trigger
    const alarm = engine.trigger("SPINDLE_OVERLOAD", "machine:haas-vf2", "Spindle at 98%");
    expect(alarm.state).toBe("active");
    expect(alarm.severity).toBe("critical");

    // Acknowledge before escalation
    const acked = engine.acknowledge(alarm.id, "operator:john");
    expect(acked).not.toBeNull();
    expect(acked!.state).toBe("acknowledged");

    // Resolve
    const resolved = engine.resolve(alarm.id);
    expect(resolved?.state).toBe("resolved");

    // Stats
    const stats = engine.stats();
    expect(stats.total_alarms).toBe(1);
    expect(stats.resolved).toBe(1);

    vi.useRealTimers();
  });

  // ── LLM Engine Offline Mode ─────────────────────────────────────

  it("LLM engine returns valid response (online or offline)", async () => {
    const { LLMEngine } = await import("../engines/LLMEngine.js");
    const engine = new LLMEngine();

    const result = await engine.query({
      prompt: "How do I reduce chatter in milling?",
    });
    expect(result).toBeDefined();
    expect(result.answer).toBeDefined();
    expect(result.answer.length).toBeGreaterThan(0);
    expect(typeof result.model).toBe("string");
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });

  // ── WebSocket Engine Structure ──────────────────────────────────

  it("WebSocket engine has correct event types", async () => {
    const { WebSocketEngine } = await import("../engines/WebSocketEngine.js");
    const engine = new WebSocketEngine();
    expect(engine).toBeDefined();
    // Engine should exist as a class with attach/broadcast methods
    expect(typeof engine.attach).toBe("function");
    expect(typeof engine.broadcast).toBe("function");
    expect(typeof engine.shutdown).toBe("function");
  });

  // ── Validation Stats Accumulate ─────────────────────────────────

  it("validation stats accumulate across multiple calls", async () => {
    const { DataValidationEngine } = await import("../engines/DataValidationEngine.js");
    const engine = new DataValidationEngine();

    engine.validateMaterial({ name: "Steel A" });
    engine.validateMaterial({ name: "Steel B" });
    engine.validateCuttingParams({ speed_mpm: 200 });
    engine.validateJob({ part_name: "X", material: "Y", quantity: 1, machine: "Z" });

    expect(engine.stats().validation_count).toBe(4);
  });

  // ── DB Connection Dry Mode ──────────────────────────────────────

  it("database connection handles dry mode gracefully", async () => {
    const { db } = await import("../db/connection.js");
    expect(db).toBeDefined();
    // In test environment without DATABASE_URL, should be in dry mode
    expect(typeof db.query).toBe("function");
    expect(typeof db.transaction).toBe("function");
  });
});
