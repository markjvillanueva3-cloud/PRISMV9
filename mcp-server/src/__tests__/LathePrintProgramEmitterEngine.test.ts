/**
 * LathePrintProgramEmitterEngine Tests — U-LTH40
 *
 * Controller dialect emission, signoff dossier, safety checks, 7 controllers.
 *
 * @milestone LATHE-MASTER U-LTH40
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintProgramEmitterEngine,
  EnvelopeBlockError,
  type EmitOptions,
  type ControllerFamily,
} from "../engines/LathePrintProgramEmitterEngine.js";
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
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

const STEEL: MaterialInput = { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 };
const ALUM: MaterialInput = { name: "6061", iso_group: "N", tensile_strength_mpa: 310 };
const INCO: MaterialInput = { name: "Inconel 718", iso_group: "S", tensile_strength_mpa: 1350 };

const JM_PIN: FeatureInput[] = [
  { id: "F1", type: "face", diameter_mm: 25.4, depth_mm: 2, tolerance_total_mm: 0.05 },
  { id: "F2", type: "od_turn", diameter_mm: 25.4, length_mm: 50, tolerance_total_mm: 0.025 },
  { id: "F3", type: "groove_od", diameter_mm: 20, depth_mm: 2.5 },
];

const STOCK: StockInput = { od_mm: 30, length_mm: 80, id_mm: 0 };

function buildToolpath(features: FeatureInput[], material: MaterialInput) {
  const strat = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(features, material);
  const seq = lathePrintSequencePlannerEngine.planSequence(strat, STOCK, features);
  return lathePrintToolpathGeneratorEngine.generateProgram(seq, features, material);
}

describe("LathePrintProgramEmitterEngine", () => {
  describe("Happy Path — Controller Dialects", () => {
    it("Fanuc: emits valid G-code with O-number, M30, %", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, {
        controller: "fanuc", program_number: 2000, program_name: "test_pin",
      });

      expect(out.controller).toBe("fanuc");
      expect(out.gcode).toContain("O2000");
      expect(out.gcode).toContain("M30");
      expect(out.gcode).toMatch(/^%/);
      expect(out.gcode).toContain("G21");
      expect(out.filename).toBe("test_pin.nc");
    });

    it("Haas: emits correct tool change format T####", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, { controller: "haas" });
      expect(out.gcode).toMatch(/T\d{4}/);
    });

    it("Okuma OSP: uses G181/G180 peck drill + .min extension", () => {
      const drillPart: FeatureInput[] = [
        { id: "D1", type: "drill", diameter_mm: 10, depth_mm: 50 },
      ];
      const tp = buildToolpath(drillPart, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, { controller: "okuma_osp" });
      expect(out.filename).toMatch(/\.min$/);
      expect(out.gcode).toContain("G00 X300 Z300");  // okuma safe home
    });

    it("Siemens: uses semicolon comments and .mpf extension", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, {
        controller: "siemens", include_comments: true,
      });
      expect(out.filename).toMatch(/\.mpf$/);
      expect(out.gcode).toMatch(/^;/m);  // semicolon comments
    });

    it("Mazak: uses .eia extension", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, { controller: "mazak" });
      expect(out.filename).toMatch(/\.eia$/);
    });

    it("Mitsubishi: emits M06 tool change", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, { controller: "mitsubishi" });
      expect(out.gcode).toContain("M06");
    });

    it("Generic: minimal valid program", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, { controller: "generic" });
      expect(out.gcode_lines).toBeGreaterThan(10);
      expect(out.gcode).toContain("M30");
    });
  });

  describe("Signoff Dossier", () => {
    it("contains required physics summary fields", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc" });

      expect(out.dossier.total_operations).toBe(3);
      expect(out.dossier.max_rpm_used).toBeGreaterThan(0);
      expect(out.dossier.max_feed_used).toBeGreaterThan(0);
      expect(out.dossier.physics_summary.max_vc_m_min).toBeGreaterThan(0);
      expect(out.dossier.physics_summary.min_vc_m_min).toBeGreaterThan(0);
      expect(out.dossier.citations.length).toBeGreaterThan(0);
    });

    it("safety_checks include machine_envelope and cutting_force", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc" });

      const checks = out.dossier.safety_checks.map(c => c.check);
      expect(checks).toContain("machine_envelope");
      expect(checks).toContain("cutting_force");
      expect(checks).toContain("operations_present");
    });

    it("includes machinist + programmer approvals", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc" });

      expect(out.dossier.approval_required_from).toContain("machinist");
      expect(out.dossier.approval_required_from).toContain("programmer");
    });

    it("escalates to engineer approval for high-force programs", () => {
      const heavyPart: FeatureInput[] = Array.from({ length: 25 }, (_, i) => ({
        id: `H${i}`, type: "od_turn" as const, diameter_mm: 30, length_mm: 100,
      }));
      const tp = buildToolpath(heavyPart, INCO);
      const out = lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc" });

      expect(out.dossier.approval_required_from).toContain("engineer");
    });
  });

  describe("Options", () => {
    it("use_css=true emits G96/G50", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, {
        controller: "fanuc", use_css: true,
      });
      expect(out.gcode).toContain("G96");
      expect(out.gcode).toContain("G50");
    });

    it("include_coolant=false omits M08/M09", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, {
        controller: "fanuc", include_coolant: false,
      });
      expect(out.gcode).not.toContain("M08");
      expect(out.gcode).not.toContain("M09");
    });

    it("include_coolant=true emits M08/M09", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, {
        controller: "fanuc", include_coolant: true,
      });
      expect(out.gcode).toContain("M08");
      expect(out.gcode).toContain("M09");
    });

    it("work_offset_id=2 uses G55", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, {
        controller: "fanuc", work_offset_id: 2,
      });
      expect(out.gcode).toContain("G55");
    });

    it("decimal_precision=4 produces 4-decimal coordinates", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const out = lathePrintProgramEmitterEngine.emit(tp, {
        controller: "fanuc", decimal_precision: 4,
      });
      expect(out.gcode).toMatch(/X\d+\.\d{4}/);
    });
  });

  describe("Controllers List", () => {
    it("lists all 7 controller families", () => {
      const list = lathePrintProgramEmitterEngine.listControllers();
      expect(list).toContain("fanuc");
      expect(list).toContain("haas");
      expect(list).toContain("okuma_osp");
      expect(list).toContain("mitsubishi");
      expect(list).toContain("mazak");
      expect(list).toContain("siemens");
      expect(list).toContain("generic");
      expect(list.length).toBe(7);
    });
  });

  describe("Dry Run", () => {
    it("returns line count without throwing", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const result = lathePrintProgramEmitterEngine.dryRun(tp, { controller: "fanuc" });
      expect(result.ok).toBe(true);
      expect(result.lines).toBeGreaterThan(0);
    });

    it("returns ok=false for invalid program", () => {
      const result = lathePrintProgramEmitterEngine.dryRun(null as any, { controller: "fanuc" });
      expect(result.ok).toBe(false);
      expect(result.lines).toBe(0);
    });
  });

  describe("Validation", () => {
    it("validate returns valid=true for good emission", () => {
      const tp = buildToolpath(JM_PIN, ALUM);
      const out = lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc" });
      const result = lathePrintProgramEmitterEngine.validate(out);
      expect(result.valid).toBe(true);
    });

    it("validate flags envelope violations (with override) — U-LSR04 audit path", () => {
      const features: FeatureInput[] = [
        { id: "XL1", type: "od_turn", diameter_mm: 100, length_mm: 500 },
      ];
      const strat = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(features, STEEL);
      const seq = lathePrintSequencePlannerEngine.planSequence(strat, STOCK, features);
      const tp = lathePrintToolpathGeneratorEngine.generateProgram(seq, features, STEEL, {
        max_x_mm: 1, max_z_mm: 1, max_rpm: 5000, max_feed_mm_min: 10000,
      });
      const out = lathePrintProgramEmitterEngine.emit(tp, {
        controller: "fanuc",
        allow_envelope_override: true,
      });
      expect(out.warnings.some((w) => w.startsWith("AUDIT: envelope override applied"))).toBe(true);
      const result = lathePrintProgramEmitterEngine.validate(out);
      expect(result.valid).toBe(false);
    });
  });

  describe("U-LSR04 Envelope Hard-Block", () => {
    const outOfEnvelopeProgram = () => {
      const features: FeatureInput[] = [
        { id: "XL1", type: "od_turn", diameter_mm: 100, length_mm: 500 },
      ];
      const strat = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(features, STEEL);
      const seq = lathePrintSequencePlannerEngine.planSequence(strat, STOCK, features);
      return lathePrintToolpathGeneratorEngine.generateProgram(seq, features, STEEL, {
        max_x_mm: 1, max_z_mm: 1, max_rpm: 5000, max_feed_mm_min: 10000,
      });
    };

    it("emit() hard-blocks with EnvelopeBlockError when envelope violated and no override", () => {
      const tp = outOfEnvelopeProgram();
      expect(tp.machine_envelope_check.within_envelope).toBe(false);
      expect(() => {
        lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc" });
      }).toThrow(EnvelopeBlockError);
    });

    it("thrown EnvelopeBlockError exposes code, detail, and ENVELOPE_BLOCKED message", () => {
      const tp = outOfEnvelopeProgram();
      let caught: unknown = null;
      try {
        lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc" });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(EnvelopeBlockError);
      const err = caught as EnvelopeBlockError;
      expect(err.code).toBe("ENVELOPE_BLOCKED");
      expect(err.name).toBe("EnvelopeBlockError");
      expect(err.message).toContain("ENVELOPE_BLOCKED");
      expect(err.message).toContain("allow_envelope_override=true");
      expect(err.detail.max_x_mm).toBe(tp.machine_envelope_check.max_x_mm);
      expect(err.detail.max_z_mm).toBe(tp.machine_envelope_check.max_z_mm);
      expect(err.detail.min_x_mm).toBe(tp.machine_envelope_check.min_x_mm);
      expect(err.detail.min_z_mm).toBe(tp.machine_envelope_check.min_z_mm);
    });

    it("allow_envelope_override=true lets emit succeed but tags AUDIT warning", () => {
      const tp = outOfEnvelopeProgram();
      const out = lathePrintProgramEmitterEngine.emit(tp, {
        controller: "fanuc",
        allow_envelope_override: true,
      });
      expect(out.gcode_lines).toBeGreaterThan(0);
      const audit = out.warnings.find((w) => w.startsWith("AUDIT: envelope override applied"));
      expect(typeof audit).toBe("string");
      expect(audit!).toContain("exceeds declared envelope");
      expect(audit!).toContain("machinist + engineer sign-off");
    });

    it("override still fails validate() because dossier.safety_checks retains machine_envelope=fail", () => {
      const tp = outOfEnvelopeProgram();
      const out = lathePrintProgramEmitterEngine.emit(tp, {
        controller: "fanuc",
        allow_envelope_override: true,
      });
      const envCheck = out.dossier.safety_checks.find((c) => c.check === "machine_envelope");
      expect(envCheck?.status).toBe("fail");
      const result = lathePrintProgramEmitterEngine.validate(out);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("machine_envelope"))).toBe(true);
    });

    it("clean envelope emits normally with no AUDIT warning", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      expect(tp.machine_envelope_check.within_envelope).toBe(true);
      const out = lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc" });
      expect(out.warnings.some((w) => w.startsWith("AUDIT: envelope"))).toBe(false);
    });

    it("dryRun returns ok=false on envelope hard-block (catches throw)", () => {
      const tp = outOfEnvelopeProgram();
      const result = lathePrintProgramEmitterEngine.dryRun(tp, { controller: "fanuc" });
      expect(result.ok).toBe(false);
      expect(result.lines).toBe(0);
    });

    it("dryRun returns ok=true when override bypasses the block", () => {
      const tp = outOfEnvelopeProgram();
      const result = lathePrintProgramEmitterEngine.dryRun(tp, {
        controller: "fanuc",
        allow_envelope_override: true,
      });
      expect(result.ok).toBe(true);
      expect(result.lines).toBeGreaterThan(0);
    });
  });

  describe("Adversarial Inputs", () => {
    it("throws on null program", () => {
      expect(() => {
        lathePrintProgramEmitterEngine.emit(null as any, { controller: "fanuc" });
      }).toThrow(/Invalid toolpath/);
    });

    it("throws on missing operations", () => {
      expect(() => {
        lathePrintProgramEmitterEngine.emit({ program_id: "x" } as any, { controller: "fanuc" });
      }).toThrow(/Invalid toolpath/);
    });

    it("rejects invalid controller (schema)", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      expect(() => {
        lathePrintProgramEmitterEngine.emit(tp, { controller: "bogus" as any });
      }).toThrow();
    });

    it("rejects program_number > 9999 (schema)", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      expect(() => {
        lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc", program_number: 10000 });
      }).toThrow();
    });

    it("rejects work_offset_id > 6 (schema)", () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      expect(() => {
        lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc", work_offset_id: 7 });
      }).toThrow();
    });

    it("handles empty operations gracefully", () => {
      const empty = {
        program_id: "e", source_sequence_plan_id: "s",
        operations: [], total_cycle_time_sec: 0, total_rapid_time_sec: 0,
        total_feed_time_sec: 0, total_cutting_volume_cm3: 0,
        gcode_preview: "", machine_envelope_check: {
          max_x_mm: 0, max_z_mm: 0, min_x_mm: 0, min_z_mm: 0, within_envelope: true,
        },
        warnings: [], timestamp: new Date().toISOString(),
      };
      const out = lathePrintProgramEmitterEngine.emit(empty, { controller: "fanuc" });
      expect(out.dossier.total_operations).toBe(0);
    });
  });

  describe("Material Variability", () => {
    const materials: MaterialInput[] = [
      { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 },
      { name: "316 Stainless", iso_group: "M", tensile_strength_mpa: 580 },
      { name: "Gray Cast Iron", iso_group: "K", tensile_strength_mpa: 250 },
      { name: "Inconel 718", iso_group: "S", tensile_strength_mpa: 1350 },
    ];

    it.each(materials)("emits valid program for $name", (mat) => {
      const tp = buildToolpath(JM_PIN, mat);
      const out = lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc" });
      expect(out.gcode_lines).toBeGreaterThan(10);
      expect(out.dossier.total_operations).toBe(JM_PIN.length);
    });
  });

  describe("Controller Variability", () => {
    const controllers: ControllerFamily[] = ["fanuc", "haas", "okuma_osp", "mitsubishi", "mazak", "siemens"];

    it.each(controllers)("produces valid output for %s", (c) => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const opts: EmitOptions = { controller: c };
      const out = lathePrintProgramEmitterEngine.emit(tp, opts);
      expect(out.controller).toBe(c);
      expect(out.gcode_lines).toBeGreaterThan(10);
      expect(out.filename).toMatch(/\.(nc|min|eia|mpf)$/);
    });
  });

  describe("Dispatcher Integration", () => {
    it("ACTIONS contains lathe_p2p_emit", () => {
      expect(camActions).toContain("lathe_p2p_emit");
    });
    it("ACTIONS contains lathe_p2p_emit_validate", () => {
      expect(camActions).toContain("lathe_p2p_emit_validate");
    });
    it("ACTIONS contains lathe_p2p_emit_controllers", () => {
      expect(camActions).toContain("lathe_p2p_emit_controllers");
    });
    it("ACTIONS contains lathe_p2p_emit_dry_run", () => {
      expect(camActions).toContain("lathe_p2p_emit_dry_run");
    });
    it("ACTIONS contains lathe_p2p_emit_consensus", () => {
      expect(camActions).toContain("lathe_p2p_emit_consensus");
    });
  });

  // ============================================================================
  // CONSENSUS-GATED POST SELECTION — LATHE-P2P-CONSENSUS-MS4/P1-U02
  // ============================================================================

  describe("Consensus-Gated Post Selection (P1-U02)", () => {
    it("single candidate → consensus SKIPPED, emit runs with that controller", async () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const result = await lathePrintProgramEmitterEngine.emitWithConsensus(
        tp,
        ["fanuc"],
        {},
        { publish: () => {} },
      );
      expect(result.selected_controller).toBe("fanuc");
      expect(result.consensus.skipped).toBe(true);
      expect(result.consensus.confidence).toBe(1);
      expect(result.consensus.voters).toHaveLength(0);
      expect(result.escalated_to_human).toBe(false);
      expect(result.emitted.controller).toBe("fanuc");
      expect(result.emitted.gcode_lines).toBeGreaterThan(10);
    });

    it("multi-candidate → consensus picks winner, emit runs with it", async () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const result = await lathePrintProgramEmitterEngine.emitWithConsensus(
        tp,
        ["okuma_osp", "fanuc", "mazak"],
        {},
        {
          consensusDecide: async () => ({
            answer: "okuma_osp",
            confidence: 0.88,
            voters: ["claude", "codex", "gemini"],
            auditId: "audit-post-okuma",
          }),
          publish: () => {},
        },
      );
      expect(result.selected_controller).toBe("okuma_osp");
      expect(result.consensus.skipped).toBe(false);
      expect(result.consensus.confidence).toBeCloseTo(0.88, 5);
      expect(result.consensus.agreement_met).toBe(true);
      expect(result.escalated_to_human).toBe(false);
      expect(result.consensus.auditId).toBe("audit-post-okuma");
      expect(result.emitted.controller).toBe("okuma_osp");
    });

    it("below-threshold confidence flags escalated_to_human (program still emitted)", async () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const result = await lathePrintProgramEmitterEngine.emitWithConsensus(
        tp,
        ["fanuc", "haas"],
        {},
        {
          agreementThreshold: 0.75,
          consensusDecide: async () => ({
            answer: "haas",
            confidence: 0.4,
            voters: ["claude"],
          }),
          publish: () => {},
        },
      );
      expect(result.selected_controller).toBe("haas");
      expect(result.consensus.agreement_met).toBe(false);
      expect(result.escalated_to_human).toBe(true);
      expect(result.emitted.controller).toBe("haas");
    });

    it("seam throw → fail-open to first candidate, escalation flagged", async () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const result = await lathePrintProgramEmitterEngine.emitWithConsensus(
        tp,
        ["mazak", "okuma_osp"],
        {},
        {
          consensusDecide: async () => {
            throw new Error("voices unreachable");
          },
          publish: () => {},
        },
      );
      expect(result.selected_controller).toBe("mazak");
      expect(result.consensus.voters).toHaveLength(0);
      expect(result.consensus.confidence).toBe(0);
      expect(result.escalated_to_human).toBe(true);
    });

    it("unknown vote answer falls back to first candidate", async () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const result = await lathePrintProgramEmitterEngine.emitWithConsensus(
        tp,
        ["fanuc", "siemens"],
        {},
        {
          consensusDecide: async () => ({ answer: "made_up_post", confidence: 0.9, voters: ["claude"] }),
          publish: () => {},
        },
      );
      expect(result.selected_controller).toBe("fanuc");
    });

    it("publishes one outcome event per emit call (multi-candidate)", async () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const events: unknown[] = [];
      await lathePrintProgramEmitterEngine.emitWithConsensus(
        tp,
        ["fanuc", "haas"],
        {},
        {
          consensusDecide: async () => ({ answer: "fanuc", confidence: 0.9, voters: ["claude", "codex"] }),
          publish: (e) => events.push(e),
        },
      );
      expect(events).toHaveLength(1);
      const evt = events[0] as { kind: string; domain: string; schemaVersion: string };
      expect(evt.kind).toBe("cross_process_decision");
      expect(evt.domain).toBe("lathe");
      expect(evt.schemaVersion).toBe("1.1.0");
    });

    it("publishes outcome even when consensus is skipped (single candidate)", async () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const events: unknown[] = [];
      await lathePrintProgramEmitterEngine.emitWithConsensus(
        tp,
        ["fanuc"],
        {},
        { publish: (e) => events.push(e) },
      );
      expect(events).toHaveLength(1);
    });

    it("empty candidate list throws (R12 fail-loud)", async () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      await expect(
        lathePrintProgramEmitterEngine.emitWithConsensus(tp, [], {}, { publish: () => {} }),
      ).rejects.toThrow(/at least one controller family/);
    });

    it("jobId is propagated when supplied", async () => {
      const tp = buildToolpath(JM_PIN, STEEL);
      const result = await lathePrintProgramEmitterEngine.emitWithConsensus(
        tp,
        ["fanuc"],
        {},
        { jobId: "job-post-2026-05-23", publish: () => {} },
      );
      expect(result.job_id).toBe("job-post-2026-05-23");
    });
  });
});
