/**
 * KiloCamProgramTrainingEngine Tests — KILO-CAM-TRAINING-MS0 iter 4
 *
 * @milestone KILO-CAM-TRAINING-MS0
 */

import { describe, it, expect } from "vitest";
import {
  kiloCamProgramTrainingEngine,
  TrainingDatasetSchema,
  type ExtractedCamProgram,
} from "../engines/KiloCamProgramTrainingEngine.js";

const GOOD_MCX: ExtractedCamProgram = {
  part_id: "PART-101",
  program_path: "JM DIE/MACRO PROGRAMS/PART-101.mcx-8",
  system: "mastercam",
  features: [
    { feature_id: "F1", feature_type: "pocket", tolerance_total_mm: 0.05 },
    { feature_id: "F2", feature_type: "face",   tolerance_total_mm: 0.1 },
  ],
  operations: [
    { op_id: "OP1", strategy: "Dynamic Mill", tool_number: 12, tolerance_total_mm: 0.05 },
    { op_id: "OP2", strategy: "Contour",      tool_number: 14 },
  ],
};

const GOOD_OKUMA: ExtractedCamProgram = {
  part_id: "PART-202",
  program_path: "JM DIE/MACRO PROGRAMS/PART-202.min",
  system: "okuma",
  features: [{ feature_id: "F1", feature_type: "turn_blank", tolerance_total_mm: 0.025 }],
  operations: [{ op_id: "OP1", strategy: "SolidTurn Rough", tool_number: 1 }],
};

const GOOD_FUSION: ExtractedCamProgram = {
  part_id: "PART-303",
  program_path: "JM DIE/MACRO PROGRAMS/PART-303.f3d",
  system: "fusion360",
  features: [{ feature_id: "F1", feature_type: "drill_hole" }],
  operations: [{ op_id: "OP1", strategy: "Drilling", tool_number: 7 }],
};

const NO_FEATURES: ExtractedCamProgram = {
  part_id: "BAD-FEAT",
  program_path: "x.mcx",
  system: "mastercam",
  features: [],
  operations: [{ op_id: "OP1", strategy: "Contour", tool_number: 1 }],
};

const NO_OPS: ExtractedCamProgram = {
  part_id: "BAD-OPS",
  program_path: "x.mcx",
  system: "mastercam",
  features: [{ feature_id: "F1", feature_type: "pocket", tolerance_total_mm: 0.05 }],
  operations: [],
};

describe("KiloCamProgramTrainingEngine", () => {
  describe("buildTrainingDataset — happy path", () => {
    const programs = [GOOD_MCX, GOOD_OKUMA, GOOD_FUSION];

    it("emits 1 row per program (3 programs → 3 rows)", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset(programs);
      expect(ds.total_rows).toBe(3);
      expect(ds.programs_emitted).toBe(3);
      expect(ds.programs_input).toBe(3);
    });

    it("per_system_counts split correctly across mastercam / okuma / fusion360", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset(programs);
      expect(ds.per_system_counts.mastercam).toBe(1);
      expect(ds.per_system_counts.okuma).toBe(1);
      expect(ds.per_system_counts.fusion360).toBe(1);
    });

    it("input_features_json round-trips to original features", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset(programs);
      const mcxRow = ds.rows.find((r) => r.part_id === "PART-101");
      const parsed = JSON.parse(mcxRow!.input_features_json);
      expect(parsed.length).toBe(2);
      expect(parsed[0].tolerance_total_mm).toBe(0.05);
    });

    it("output_operations_json round-trips to original ops", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset(programs);
      const mcxRow = ds.rows.find((r) => r.part_id === "PART-101");
      const parsed = JSON.parse(mcxRow!.output_operations_json);
      expect(parsed.length).toBe(2);
      expect(parsed[0].strategy).toBe("Dynamic Mill");
      expect(parsed[0].tool_number).toBe(12);
    });

    it("feature_count + op_count reflect per-row totals", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset(programs);
      const mcxRow = ds.rows.find((r) => r.part_id === "PART-101")!;
      expect(mcxRow.feature_count).toBe(2);
      expect(mcxRow.op_count).toBe(2);
    });

    it("source_program_path flows through verbatim", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset(programs);
      const okumaRow = ds.rows.find((r) => r.part_id === "PART-202")!;
      expect(okumaRow.source_program_path).toBe("JM DIE/MACRO PROGRAMS/PART-202.min");
    });
  });

  describe("buildTrainingDataset — systems filter", () => {
    it("systems filter restricts output", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset(
        [GOOD_MCX, GOOD_OKUMA, GOOD_FUSION],
        { systems: ["mastercam"] },
      );
      expect(ds.total_rows).toBe(1);
      expect(ds.rows[0].system).toBe("mastercam");
    });

    it("empty systems filter excludes all", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset(
        [GOOD_MCX, GOOD_OKUMA],
        { systems: ["does_not_exist"] },
      );
      expect(ds.total_rows).toBe(0);
    });
  });

  describe("refuse: no silent fallback on garbage programs", () => {
    it("program with 0 features is surfaced + not emitted", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset([NO_FEATURES]);
      expect(ds.programs_with_no_features).toEqual(["BAD-FEAT"]);
      expect(ds.total_rows).toBe(0);
      expect(ds.programs_emitted).toBe(0);
    });

    it("program with 0 ops is surfaced + not emitted (default)", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset([NO_OPS]);
      expect(ds.programs_with_no_operations).toEqual(["BAD-OPS"]);
      expect(ds.total_rows).toBe(0);
    });

    it("program with 0 ops IS emitted when allow_empty_ops=true (escape hatch)", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset([NO_OPS], { allow_empty_ops: true });
      expect(ds.programs_with_no_operations).toEqual(["BAD-OPS"]); // still surfaced
      expect(ds.total_rows).toBe(1); // and now emitted
    });

    it("mixed batch: emits good ones, surfaces bad ones separately", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset(
        [GOOD_MCX, NO_FEATURES, GOOD_OKUMA, NO_OPS, GOOD_FUSION],
      );
      expect(ds.programs_input).toBe(5);
      expect(ds.total_rows).toBe(3); // 3 good ones
      expect(ds.programs_with_no_features).toEqual(["BAD-FEAT"]);
      expect(ds.programs_with_no_operations).toEqual(["BAD-OPS"]);
    });
  });

  describe("R12 schema gates", () => {
    it("output passes own zod schema round-trip", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset([GOOD_MCX]);
      const parsed = TrainingDatasetSchema.parse(ds);
      expect(parsed.total_rows).toBe(1);
    });

    it("invalid system enum value rejected", () => {
      const bad = { ...GOOD_MCX, system: "fake_system" as never };
      expect(() => kiloCamProgramTrainingEngine.buildTrainingDataset([bad as ExtractedCamProgram])).toThrow();
    });

    it("output fingerprints source", () => {
      const ds = kiloCamProgramTrainingEngine.buildTrainingDataset([GOOD_MCX]);
      expect(ds.source).toBe("kilo_cam_program_training");
      expect(ds.rows[0].source).toBe("kilo_cam_program_training");
    });
  });
});
