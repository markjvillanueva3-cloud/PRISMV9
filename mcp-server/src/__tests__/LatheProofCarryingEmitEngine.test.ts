/**
 * LatheProofCarryingEmitEngine Tests — U-LSR25 (LATHE-HARDENED-MS0)
 *
 * Verifies that:
 *  - All four gates compose into one SafetyRecord
 *  - Skipped gates get SKIPPED signatures (not PASS)
 *  - BLOCKED status throws SafetyProofViolation (no emission)
 *  - allow_override proceeds with emission + audit warning + overall_safe=false
 *  - Deterministic hash is stable across two calls with identical input
 *  - reproduce() works even when the gate is BLOCKED (returns record, no throw)
 *  - Dispatcher wiring
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  latheProofCarryingEmitEngine,
  LatheProofCarryingEmitEngine,
  SafetyProofViolation,
  SafetyRecordSchema,
  type SafetyInputs,
} from "../engines/LatheProofCarryingEmitEngine.js";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";
import {
  lathePrintFeatureStrategySelectorEngine,
  type FeatureInput,
  type MaterialInput,
} from "../engines/LathePrintFeatureStrategySelectorEngine.js";
import {
  lathePrintSequencePlannerEngine,
  type StockInput,
} from "../engines/LathePrintSequencePlannerEngine.js";
import { lathePrintToolpathGeneratorEngine } from "../engines/LathePrintToolpathGeneratorEngine.js";
import type { LatheSafetySignals } from "../engines/LatheSafetySignalEngine.js";
import type { MachineSpindleSpec } from "../engines/SpindleTorqueGateEngine.js";
import type { StockGeometry, Workholding } from "../engines/StockBoundaryGateEngine.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STEEL: MaterialInput = { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 };
const ALUM: MaterialInput = { name: "6061", iso_group: "N", tensile_strength_mpa: 310 };

const JM_PIN: FeatureInput[] = [
  { id: "F1", type: "face", diameter_mm: 25.4, depth_mm: 2, tolerance_total_mm: 0.05 },
  { id: "F2", type: "od_turn", diameter_mm: 25.4, length_mm: 50, tolerance_total_mm: 0.025 },
];

const STOCK_INPUT: StockInput = { od_mm: 30, length_mm: 80, id_mm: 0 };
const STOCK_GEOM: StockGeometry = { od_mm: 30, length_mm: 80, id_mm: 0 };
const WORKHOLDING: Workholding = { gripping_length_mm: 20 };

// Large-spindle turning centre (e.g. DMG Mori NLX 2500) — 22 kW, 281 Nm
// peak, 7500 max rpm. Chosen so the happy-path JM_PIN+ALUM program fits
// comfortably inside the spindle envelope with utilisation well under
// the 85% WARNING threshold.
const OKUMA_LB3000: MachineSpindleSpec = {
  max_power_kW: 22,
  max_torque_Nm: 281,
  max_rpm: 7500,
};

const TINY_SPINDLE: MachineSpindleSpec = {
  max_power_kW: 0.5,
  max_torque_Nm: 2,
  max_rpm: 3000,
};

function buildProgram(features: FeatureInput[], material: MaterialInput) {
  const strat = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(features, material);
  const seq = lathePrintSequencePlannerEngine.planSequence(strat, STOCK_INPUT, features);
  return lathePrintToolpathGeneratorEngine.generateProgram(seq, features, material);
}

function buildOutOfEnvelopeProgram(features: FeatureInput[], material: MaterialInput) {
  const strat = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(features, material);
  const seq = lathePrintSequencePlannerEngine.planSequence(strat, STOCK_INPUT, features);
  return lathePrintToolpathGeneratorEngine.generateProgram(seq, features, material, {
    max_x_mm: 1, max_z_mm: 1, max_rpm: 5000, max_feed_mm_min: 10000,
  });
}

function cleanSignals(): LatheSafetySignals {
  return {
    program_id: "P-REPRO-TEST",
    material_iso_group: "N",
    per_operation: [
      {
        op_number: 1,
        feature_id: "F1",
        tool_id: "T01",
        forces: {
          Fc_N: 250,
          Fr_N: 75,
          Fa_N: 50,
          resultant_N: 265.8,
          chip_thickness_mm: 0.15,
          chip_width_mm: 0.5,
          specific_cutting_force_N_mm2: 700,
        },
        power: {
          cutting_kW: 1.1,
          spindle_torque_Nm: 5.8,
          utilization_pct: 45.8,
          power_safe: true,
        },
        chatter: {
          computed: true,
          is_stable: true,
          current_depth_mm: 0.5,
          critical_depth_mm: 3.0,
          stability_margin_pct: 83,
          chatter_frequency_Hz: 1200,
          optimal_rpm: 4500,
          severity: "stable",
        },
        warnings: [],
      },
    ],
    grip: {
      required_gripping_force_N: 4500,
      centrifugal_force_N: 120,
      grip_loss_at_rpm_pct: 3,
      safety_factor: 2.35,
      max_safe_rpm: 3500,
      is_safe: false,
      deformation_risk: "none",
      worst_spindle_rpm: 1800,
      gate_block: false,
      recommendations: [],
      worst_case_op_number: 1,
    },
    overall: {
      any_force_failure: false,
      any_power_failure: false,
      any_chatter_failure: false,
      any_chatter_unverified: false,
      grip_safe: true,
      worst_case_resultant_N: 265.8,
      worst_case_op_number: 1,
      warnings: [],
    },
    timestamp: "2026-04-24T18:00:00.000Z",
  };
}

// ---------------------------------------------------------------------------

describe("LatheProofCarryingEmitEngine", () => {
  describe("Singleton + schema", () => {
    it("exports a singleton that is an instance of the class", () => {
      expect(latheProofCarryingEmitEngine).toBeInstanceOf(LatheProofCarryingEmitEngine);
    });

    it("safety_record conforms to exported schema", () => {
      const tp = buildProgram(JM_PIN, ALUM);
      const result = latheProofCarryingEmitEngine.emit({
        program: tp,
        options: { controller: "fanuc" },
      });
      const parsed = SafetyRecordSchema.safeParse(result.safety_record);
      expect(parsed.success).toBe(true);
      expect(result.safety_record.schema_version).toBe("1.0.0");
    });
  });

  describe("Happy path — no blocking gates", () => {
    it("emits and attaches safety record when every gate is SAFE or WARNING", () => {
      const tp = buildProgram(JM_PIN, ALUM);
      const result = latheProofCarryingEmitEngine.emit({
        program: tp,
        options: { controller: "fanuc" },
        safety_inputs: {
          machine: OKUMA_LB3000,
          stock: STOCK_GEOM,
          workholding: WORKHOLDING,
          signals: cleanSignals(),
        } as SafetyInputs,
      });
      // Happy path tolerates WARNING (no blocker); only BLOCKED triggers throw.
      expect(result.safety_record.overall_status).not.toBe("BLOCKED");
      expect(result.safety_record.signatures.some((s) => s.status === "BLOCKED")).toBe(false);
      expect(result.safety_record.override_applied).toBe(false);
      expect(result.emitted).not.toBeNull();
      expect(result.emitted!.gcode_lines).toBeGreaterThan(0);
    });

    it("produces four signatures (envelope + torque + stock + predicate)", () => {
      const tp = buildProgram(JM_PIN, ALUM);
      const result = latheProofCarryingEmitEngine.emit({
        program: tp,
        options: { controller: "fanuc" },
        safety_inputs: {
          machine: OKUMA_LB3000,
          stock: STOCK_GEOM,
          workholding: WORKHOLDING,
          signals: cleanSignals(),
        } as SafetyInputs,
      });
      const ids = result.safety_record.signatures.map((s) => s.engine_id);
      expect(ids).toContain("LathePrintProgramEmitterEngine.envelope");
      expect(ids).toContain("SpindleTorqueGateEngine");
      expect(ids).toContain("StockBoundaryGateEngine");
      expect(ids).toContain("LatheSafetyPredicateEngine");
      expect(result.safety_record.signatures).toHaveLength(4);
    });
  });

  describe("Skipped gates", () => {
    it("gates get SKIPPED signatures when their inputs are absent", () => {
      const tp = buildProgram(JM_PIN, ALUM);
      const result = latheProofCarryingEmitEngine.emit({
        program: tp,
        options: { controller: "fanuc" },
      });
      const torque = result.safety_record.signatures.find((s) => s.engine_id === "SpindleTorqueGateEngine")!;
      const stock = result.safety_record.signatures.find((s) => s.engine_id === "StockBoundaryGateEngine")!;
      const pred = result.safety_record.signatures.find((s) => s.engine_id === "LatheSafetyPredicateEngine")!;
      expect(torque.status).toBe("SKIPPED");
      expect(stock.status).toBe("SKIPPED");
      expect(pred.status).toBe("SKIPPED");
      expect(result.safety_record.torque_gate).toBeNull();
      expect(result.safety_record.stock_boundary_gate).toBeNull();
      expect(result.safety_record.predicate_result).toBeNull();
    });

    it("stock gate only runs when BOTH stock and workholding supplied", () => {
      const tp = buildProgram(JM_PIN, ALUM);
      const result = latheProofCarryingEmitEngine.emit({
        program: tp,
        options: { controller: "fanuc" },
        safety_inputs: { stock: STOCK_GEOM } as SafetyInputs, // missing workholding
      });
      const stock = result.safety_record.signatures.find((s) => s.engine_id === "StockBoundaryGateEngine")!;
      expect(stock.status).toBe("SKIPPED");
    });
  });

  describe("Blocked gates — throws SafetyProofViolation", () => {
    it("envelope violation throws SafetyProofViolation with record attached", () => {
      const tp = buildOutOfEnvelopeProgram(
        [{ id: "XL1", type: "od_turn", diameter_mm: 100, length_mm: 500 }],
        STEEL,
      );
      expect(tp.machine_envelope_check.within_envelope).toBe(false);
      let caught: unknown = null;
      try {
        latheProofCarryingEmitEngine.emit({
          program: tp,
          options: { controller: "fanuc" },
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(SafetyProofViolation);
      const err = caught as SafetyProofViolation;
      expect(err.code).toBe("SAFETY_PROOF_VIOLATED");
      expect(err.safety_record.overall_status).toBe("BLOCKED");
      expect(err.safety_record.overall_safe).toBe(false);
      const envSig = err.safety_record.signatures.find(
        (s) => s.engine_id === "LathePrintProgramEmitterEngine.envelope",
      )!;
      expect(envSig.status).toBe("BLOCKED");
      expect(envSig.blocked_reason).toContain("envelope exceeded");
    });

    it("spindle torque block throws (tiny spindle vs real program)", () => {
      const tp = buildProgram(JM_PIN, STEEL);
      expect(() =>
        latheProofCarryingEmitEngine.emit({
          program: tp,
          options: { controller: "fanuc" },
          safety_inputs: { machine: TINY_SPINDLE } as SafetyInputs,
        }),
      ).toThrow(SafetyProofViolation);
    });

    it("violation message includes SAFETY_PROOF_VIOLATED + override hint", () => {
      const tp = buildOutOfEnvelopeProgram(
        [{ id: "XL1", type: "od_turn", diameter_mm: 100, length_mm: 500 }],
        STEEL,
      );
      try {
        latheProofCarryingEmitEngine.emit({
          program: tp,
          options: { controller: "fanuc" },
        });
      } catch (e) {
        const err = e as SafetyProofViolation;
        expect(err.message).toContain("SAFETY_PROOF_VIOLATED");
        expect(err.message).toContain("allow_override=true");
      }
    });
  });

  describe("Override path", () => {
    it("allow_override=true lets blocked emission proceed with AUDIT warning", () => {
      const tp = buildOutOfEnvelopeProgram(
        [{ id: "XL1", type: "od_turn", diameter_mm: 100, length_mm: 500 }],
        STEEL,
      );
      const result = latheProofCarryingEmitEngine.emit({
        program: tp,
        options: { controller: "fanuc" },
        allow_override: true,
      });
      expect(result.emitted).not.toBeNull();
      expect(result.emitted!.gcode_lines).toBeGreaterThan(0);
      expect(result.safety_record.overall_status).toBe("BLOCKED");
      expect(result.safety_record.overall_safe).toBe(false);
      expect(result.safety_record.override_applied).toBe(true);
      const audit = result.safety_record.audit_warnings.find((w) => w.startsWith("AUDIT: safety_proof"));
      expect(typeof audit).toBe("string");
      expect(audit!).toContain("overall_safe=false");
      // And propagated into emitter warnings
      expect(result.emitted!.warnings.some((w) => w.startsWith("AUDIT: safety_proof"))).toBe(true);
    });
  });

  describe("Reproducibility — deterministic hashing", () => {
    it("two runs with identical inputs produce byte-equal signatures", () => {
      const tp = buildProgram(JM_PIN, ALUM);
      const inputs = {
        program: tp,
        options: { controller: "fanuc" as const },
        safety_inputs: {
          machine: OKUMA_LB3000,
          stock: STOCK_GEOM,
          workholding: WORKHOLDING,
          signals: cleanSignals(),
        } as SafetyInputs,
      };
      const r1 = latheProofCarryingEmitEngine.emit(inputs);
      const r2 = latheProofCarryingEmitEngine.emit(inputs);
      expect(r1.safety_record.input_hash).toBe(r2.safety_record.input_hash);
      // Per-gate result hashes are stable too
      for (let i = 0; i < r1.safety_record.signatures.length; i++) {
        expect(r1.safety_record.signatures[i].result_hash).toBe(
          r2.safety_record.signatures[i].result_hash,
        );
      }
    });

    it("input_hash changes when safety inputs differ (stock swap)", () => {
      const tp = buildProgram(JM_PIN, ALUM);
      const base = {
        program: tp,
        options: { controller: "fanuc" as const },
      };
      const a = latheProofCarryingEmitEngine.emit({
        ...base,
        safety_inputs: { stock: STOCK_GEOM, workholding: WORKHOLDING } as SafetyInputs,
      });
      const b = latheProofCarryingEmitEngine.emit({
        ...base,
        safety_inputs: {
          stock: { od_mm: 60, length_mm: 80, id_mm: 0 },
          workholding: WORKHOLDING,
        } as SafetyInputs,
      });
      expect(a.safety_record.input_hash).not.toBe(b.safety_record.input_hash);
    });

    it("input_hash is insensitive to object-key insertion order", () => {
      const tp = buildProgram(JM_PIN, ALUM);
      const optsA: Record<string, unknown> = { controller: "fanuc", use_css: true, include_coolant: true };
      const optsB: Record<string, unknown> = { include_coolant: true, controller: "fanuc", use_css: true };
      const a = latheProofCarryingEmitEngine.emit({
        program: tp,
        options: optsA as never,
      });
      const b = latheProofCarryingEmitEngine.emit({
        program: tp,
        options: optsB as never,
      });
      expect(a.safety_record.input_hash).toBe(b.safety_record.input_hash);
    });
  });

  describe("reproduce() — returns record even when blocked", () => {
    it("returns record with BLOCKED status for out-of-envelope input (no throw)", () => {
      const tp = buildOutOfEnvelopeProgram(
        [{ id: "XL1", type: "od_turn", diameter_mm: 100, length_mm: 500 }],
        STEEL,
      );
      const record = latheProofCarryingEmitEngine.reproduce({
        program: tp,
        options: { controller: "fanuc" },
      });
      expect(record.overall_status).toBe("BLOCKED");
      expect(record.overall_safe).toBe(false);
    });

    it("returns same input_hash as emit() would on the happy path", () => {
      const tp = buildProgram(JM_PIN, ALUM);
      const inputs = { program: tp, options: { controller: "fanuc" as const } };
      const emitHash = latheProofCarryingEmitEngine.emit(inputs).safety_record.input_hash;
      const reproHash = latheProofCarryingEmitEngine.reproduce(inputs).input_hash;
      expect(emitHash).toBe(reproHash);
    });
  });

  describe("Adversarial", () => {
    it("throws plain Error on missing operations", () => {
      expect(() =>
        latheProofCarryingEmitEngine.emit({
          program: { program_id: "x" } as never,
          options: { controller: "fanuc" },
        }),
      ).toThrow(/missing operations/);
    });
  });

  describe("Dispatcher Integration", () => {
    it("ACTIONS contains lathe_proof_carrying_emit", () => {
      expect(camActions).toContain("lathe_proof_carrying_emit");
    });

    it("ACTIONS contains lathe_proof_carrying_reproduce", () => {
      expect(camActions).toContain("lathe_proof_carrying_reproduce");
    });
  });

  // ===========================================================================
  // U-LSR08 — Dispatcher End-to-End Verification
  // ---------------------------------------------------------------------------
  // Engine-level coverage above proves the calculation paths. The block below
  // proves the SAME contract survives camDispatcher transit:
  //   - Zod schema validation
  //   - paramNormalizer (snake_case alias remap)
  //   - SafetyProofViolation -> {thrown:true, code, message, safety_record}
  //   - slimResponse JSON serialization (null/[] stripped from response)
  //
  // Coverage:
  //   - Happy path × 3 ISO groups (P, M, N) — variability floor.
  //   - 3 failure modes: envelope, spindle torque, stock-too-short.
  //   - 2 adversarial: missing operations, allow_override on blocked input.
  //   - Reproducibility through dispatcher (deterministic input_hash).
  //   - LoRA physics actions (U-LSR07-WIRE) round-trip canonical kc1.1.
  // ===========================================================================
  describe("U-LSR08 — Dispatcher End-to-End", () => {
    interface CapturedTool {
      name: string;
      handler: (args: {
        action: string;
        params?: Record<string, unknown>;
      }) => Promise<{ content: Array<{ type: string; text: string }> }>;
    }
    const SHA256_HEX_LEN = 64;
    const RESULT_HASH_MIN_LEN = 16;
    const MIN_GCODE_LINES = 5;

    let handler: CapturedTool["handler"];

    beforeAll(() => {
      const captured: CapturedTool[] = [];
      const stubServer = {
        tools: captured,
        tool(
          name: string,
          _description: string,
          _schema: unknown,
          h: CapturedTool["handler"],
        ) {
          captured.push({ name, handler: h });
        },
      };
      registerCamDispatcher(stubServer as unknown as Parameters<typeof registerCamDispatcher>[0]);
      const tool = captured.find((t) => t.name === "prism_cam");
      if (!tool) throw new Error("prism_cam tool was not registered");
      handler = tool.handler;
    });

    async function invoke(
      action: string,
      params: Record<string, unknown> = {},
    ): Promise<Record<string, unknown>> {
      const res = (await handler({ action, params })) as Record<string, unknown>;
      if (res && (res as { success?: boolean }).success === false) return res;
      const content = (res.content as Array<{ type: string; text: string }> | undefined) ?? [];
      const text = content[0]?.text ?? "";
      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        return { __raw: text };
      }
    }

    interface E2ESafetyRecord {
      schema_version: string;
      program_id: string;
      generated_at: string;
      input_hash: string;
      overall_safe: boolean;
      overall_status: "SAFE" | "WARNING" | "BLOCKED";
      override_applied: boolean;
      signatures: Array<{
        engine_id: string;
        status: "SAFE" | "WARNING" | "BLOCKED" | "SKIPPED";
        result_hash: string;
        version: string;
        blocked_reason?: string;
      }>;
      envelope_check: { within_envelope: boolean; max_x_mm: number; max_z_mm: number };
      audit_warnings?: string[];
    }

    function assertRec(rec: unknown): asserts rec is E2ESafetyRecord {
      expect(typeof rec).toBe("object");
      const r = rec as Record<string, unknown>;
      expect(r.schema_version).toBe("1.0.0");
      expect(typeof r.program_id).toBe("string");
      expect((r.program_id as string).length).toBeGreaterThan(0);
      expect(new Date(r.generated_at as string).toString()).not.toBe("Invalid Date");
      expect(typeof r.input_hash).toBe("string");
      expect((r.input_hash as string).length).toBe(SHA256_HEX_LEN);
      expect(typeof r.overall_safe).toBe("boolean");
      expect(["SAFE", "WARNING", "BLOCKED"]).toContain(r.overall_status);
      expect(typeof r.override_applied).toBe("boolean");
      const sigs = r.signatures as Array<Record<string, unknown>>;
      expect(Array.isArray(sigs)).toBe(true);
      expect(sigs.length).toBeGreaterThanOrEqual(4);
      for (const s of sigs) {
        expect(typeof s.engine_id).toBe("string");
        expect(["SAFE", "WARNING", "BLOCKED", "SKIPPED"]).toContain(s.status);
        expect(typeof s.result_hash).toBe("string");
        expect((s.result_hash as string).length).toBeGreaterThanOrEqual(RESULT_HASH_MIN_LEN);
      }
    }

    const SS_304: MaterialInput = {
      name: "304 SS", iso_group: "M", tensile_strength_mpa: 580,
    };

    async function happyPathFor(material: MaterialInput): Promise<void> {
      const tp = buildProgram(JM_PIN, material);
      const res = await invoke("lathe_proof_carrying_emit", {
        program: tp,
        options: { controller: "fanuc" },
        safety_inputs: {
          machine: OKUMA_LB3000,
          stock: STOCK_GEOM,
          workholding: WORKHOLDING,
          signals: { ...cleanSignals(), material_iso_group: material.iso_group },
        } as SafetyInputs,
      });
      expect("thrown" in res).toBe(false);
      const rec = res.safety_record;
      assertRec(rec);
      expect(rec.override_applied).toBe(false);
      expect(rec.overall_status).not.toBe("BLOCKED");
      const ids = rec.signatures.map((s) => s.engine_id);
      expect(ids).toEqual(
        expect.arrayContaining([
          "LathePrintProgramEmitterEngine.envelope",
          "SpindleTorqueGateEngine",
          "StockBoundaryGateEngine",
          "LatheSafetyPredicateEngine",
        ]),
      );
      const skipped = rec.signatures.filter((s) => s.status === "SKIPPED");
      const blocked = rec.signatures.filter((s) => s.status === "BLOCKED");
      expect(skipped).toHaveLength(0);
      expect(blocked).toHaveLength(0);
      expect(rec.envelope_check.within_envelope).toBe(true);
      const emitted = res.emitted as { gcode_lines: number; gcode: string };
      expect(emitted.gcode_lines).toBeGreaterThan(MIN_GCODE_LINES);
      expect(typeof emitted.gcode).toBe("string");
      expect(emitted.gcode).toMatch(/G0|G1|G96|G97/);
    }

    describe("Happy path × 3 ISO groups (variability floor)", () => {
      it("ISO P (1018 carbon steel) emits clean fanuc G-code through all 4 gates", async () => {
        await happyPathFor(STEEL);
      });

      it("ISO M (304 stainless) emits clean fanuc G-code through all 4 gates", async () => {
        await happyPathFor(SS_304);
      });

      it("ISO N (Alcoa 6061-T6) emits clean fanuc G-code through all 4 gates", async () => {
        await happyPathFor(ALUM);
      });
    });

    describe("Failure modes through dispatcher", () => {
      it("envelope violation -> {thrown:true, SAFETY_PROOF_VIOLATED, envelope sig BLOCKED}", async () => {
        const tp = buildOutOfEnvelopeProgram(
          [{ id: "XL1", type: "od_turn", diameter_mm: 100, length_mm: 500 }],
          STEEL,
        );
        const res = await invoke("lathe_proof_carrying_emit", {
          program: tp,
          options: { controller: "fanuc" },
        });
        expect(res.thrown).toBe(true);
        expect(res.code).toBe("SAFETY_PROOF_VIOLATED");
        expect(res.message as string).toContain("allow_override=true");
        const rec = res.safety_record;
        assertRec(rec);
        expect(rec.overall_status).toBe("BLOCKED");
        expect(rec.overall_safe).toBe(false);
        expect(rec.envelope_check.within_envelope).toBe(false);
        const envSig = rec.signatures.find(
          (s) => s.engine_id === "LathePrintProgramEmitterEngine.envelope",
        );
        expect(envSig?.status).toBe("BLOCKED");
        expect(envSig?.blocked_reason).toContain("envelope exceeded");
      });

      it("tiny spindle on JM_PIN steel -> SpindleTorqueGateEngine BLOCKED, others not blocked", async () => {
        const tp = buildProgram(JM_PIN, STEEL);
        const res = await invoke("lathe_proof_carrying_emit", {
          program: tp,
          options: { controller: "fanuc" },
          safety_inputs: { machine: TINY_SPINDLE } as SafetyInputs,
        });
        expect(res.thrown).toBe(true);
        expect(res.code).toBe("SAFETY_PROOF_VIOLATED");
        const rec = res.safety_record;
        assertRec(rec);
        const torqueSig = rec.signatures.find((s) => s.engine_id === "SpindleTorqueGateEngine");
        expect(torqueSig?.status).toBe("BLOCKED");
        const otherBlocked = rec.signatures
          .filter((s) => s.engine_id !== "SpindleTorqueGateEngine" && s.status === "BLOCKED");
        expect(otherBlocked).toHaveLength(0);
      });

      it("stock length 5mm vs 80mm program -> StockBoundaryGateEngine BLOCKED", async () => {
        const tp = buildProgram(JM_PIN, ALUM);
        const res = await invoke("lathe_proof_carrying_emit", {
          program: tp,
          options: { controller: "fanuc" },
          safety_inputs: {
            stock: { od_mm: 30, length_mm: 5, id_mm: 0 },
            workholding: WORKHOLDING,
          } as SafetyInputs,
        });
        expect(res.thrown).toBe(true);
        const rec = res.safety_record;
        assertRec(rec);
        const stockSig = rec.signatures.find((s) => s.engine_id === "StockBoundaryGateEngine");
        expect(stockSig?.status).toBe("BLOCKED");
      });
    });

    describe("Adversarial through dispatcher", () => {
      it("missing operations -> error path engaged, no emitted gcode, no safety_record", async () => {
        const res = await invoke("lathe_proof_carrying_emit", {
          program: { program_id: "x" },
          options: { controller: "fanuc" },
        });
        // Engine throws plain Error('missing operations'). The dispatcher does NOT
        // wrap that in {thrown:true} — it surfaces as success:false / error text.
        const flat = JSON.stringify(res).toLowerCase();
        expect(flat).toMatch(/missing operations|invalid|error/);
        expect("emitted" in res).toBe(false);
        expect("safety_record" in res).toBe(false);
      });

      it("allow_override=true on envelope-blocked input emits with AUDIT trail and overall_safe=false", async () => {
        const tp = buildOutOfEnvelopeProgram(
          [{ id: "XL1", type: "od_turn", diameter_mm: 100, length_mm: 500 }],
          STEEL,
        );
        const res = await invoke("lathe_proof_carrying_emit", {
          program: tp,
          options: { controller: "fanuc" },
          allow_override: true,
        });
        expect("thrown" in res).toBe(false);
        const rec = res.safety_record;
        assertRec(rec);
        expect(rec.overall_status).toBe("BLOCKED");
        expect(rec.overall_safe).toBe(false);
        expect(rec.override_applied).toBe(true);
        const audits = rec.audit_warnings ?? [];
        expect(audits.length).toBeGreaterThanOrEqual(1);
        expect(audits[0]).toMatch(/^AUDIT: safety_proof/);
        expect(audits[0]).toContain("overall_safe=false");
        const emitted = res.emitted as { gcode_lines: number; gcode: string; warnings: string[] };
        expect(emitted.gcode_lines).toBeGreaterThan(0);
        expect(emitted.warnings.some((w) => w.startsWith("AUDIT: safety_proof"))).toBe(true);
      });
    });

    describe("Reproducibility through dispatcher", () => {
      it("two identical dispatcher calls produce byte-equal input_hash and per-gate result_hash", async () => {
        const tp = buildProgram(JM_PIN, ALUM);
        const args = {
          program: tp,
          options: { controller: "fanuc" },
          safety_inputs: {
            machine: OKUMA_LB3000,
            stock: STOCK_GEOM,
            workholding: WORKHOLDING,
            signals: cleanSignals(),
          } as SafetyInputs,
        };
        const [a, b] = await Promise.all([
          invoke("lathe_proof_carrying_emit", args),
          invoke("lathe_proof_carrying_emit", args),
        ]);
        const recA = a.safety_record;
        const recB = b.safety_record;
        assertRec(recA);
        assertRec(recB);
        expect(recA.input_hash).toBe(recB.input_hash);
        const byIdA = new Map(recA.signatures.map((s) => [s.engine_id, s.result_hash]));
        const byIdB = new Map(recB.signatures.map((s) => [s.engine_id, s.result_hash]));
        expect(byIdA.size).toBe(byIdB.size);
        for (const [id, hashA] of byIdA) {
          expect(byIdB.get(id)).toBe(hashA);
        }
      });

      it("swapping stock geometry flips input_hash (sensitivity check)", async () => {
        // input_hash is computed from {program_id, ops_count, options, machine,
        // stock, workholding, signals, allow_override}. Material differences
        // change feeds/speeds inside operations but not the hashed surface,
        // so we vary stock OD instead.
        const tp = buildProgram(JM_PIN, ALUM);
        const baseArgs = {
          program: tp,
          options: { controller: "fanuc" },
          safety_inputs: { stock: STOCK_GEOM, workholding: WORKHOLDING } as SafetyInputs,
        };
        const altArgs = {
          ...baseArgs,
          safety_inputs: {
            stock: { od_mm: 60, length_mm: 80, id_mm: 0 },
            workholding: WORKHOLDING,
          } as SafetyInputs,
        };
        const [a, b] = await Promise.all([
          invoke("lathe_proof_carrying_emit", baseArgs),
          invoke("lathe_proof_carrying_emit", altArgs),
        ]);
        const hA = (a.safety_record as { input_hash: string }).input_hash;
        const hB = (b.safety_record as { input_hash: string }).input_hash;
        expect(hA).not.toBe(hB);
        expect(hA.length).toBe(SHA256_HEX_LEN);
        expect(hB.length).toBe(SHA256_HEX_LEN);
      });

      it("lathe_proof_carrying_reproduce returns BLOCKED record without throwing", async () => {
        const tp = buildOutOfEnvelopeProgram(
          [{ id: "XL1", type: "od_turn", diameter_mm: 100, length_mm: 500 }],
          STEEL,
        );
        const res = await invoke("lathe_proof_carrying_reproduce", {
          program: tp,
          options: { controller: "fanuc" },
        });
        expect("thrown" in res).toBe(false);
        assertRec(res);
        expect(res.overall_status).toBe("BLOCKED");
        expect(res.overall_safe).toBe(false);
      });

      it("emit and reproduce yield matching input_hash on the happy path", async () => {
        const tp = buildProgram(JM_PIN, ALUM);
        const args = { program: tp, options: { controller: "fanuc" } };
        const [e, r] = await Promise.all([
          invoke("lathe_proof_carrying_emit", args),
          invoke("lathe_proof_carrying_reproduce", args),
        ]);
        const eHash = (e.safety_record as { input_hash: string }).input_hash;
        const rHash = (r as { input_hash: string }).input_hash;
        expect(eHash).toBe(rHash);
      });
    });

    describe("LoRA physics dispatcher actions (U-LSR07-WIRE round-trip)", () => {
      it("lathe_lora_physics_kienzle_coefs returns canonical kc1.1 for all 6 ISO groups", async () => {
        const groups = ["P", "M", "K", "N", "S", "H"] as const;
        const results = await Promise.all(
          groups.map((g) => invoke("lathe_lora_physics_kienzle_coefs", { material_group: g })),
        );
        for (let i = 0; i < groups.length; i++) {
          const g = groups[i];
          const res = results[i];
          expect(res.group).toBe(g);
          // Engine returns { kc11, mc } (no underscore). Compare to canonical.
          const coef = res.coefficients as { kc11: number; mc: number };
          expect(coef.kc11).toBe(CANONICAL_KIENZLE[g].kc1_1);
          expect(coef.mc).toBeCloseTo(CANONICAL_KIENZLE[g].mc, 5);
        }
      });
    });
  });
});
