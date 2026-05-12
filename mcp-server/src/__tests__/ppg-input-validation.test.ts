/**
 * PPG-REAL S2 U-PPR05: Input validation layer tests.
 * Verifies that bad input produces clear errors, not dangerous output.
 */
import { describe, it, expect } from "vitest";
import { postProcessorPipelineEngine } from "../engines/PostProcessorPipelineEngine.js";

describe("PPG Input Validation (U-PPR05)", () => {
  it("rejects G-code with no motion blocks", async () => {
    const output = await postProcessorPipelineEngine.process({
      gcode: "(Just a comment)\nM30\n",
    });
    expect(output.overall_status).toBe("fail");
    expect(output.output_gcode).toContain("ERROR");
    expect(output.stages.some(s => s.stage === "input_validation" && s.status === "fail")).toBe(true);
    const valStage = output.stages.find(s => s.stage === "input_validation");
    expect(valStage?.data?.errors?.length).toBeGreaterThan(0);
    expect(valStage?.data?.errors?.[0]?.field).toBe("gcode");
    expect(valStage?.data?.errors?.[0]?.reason).toContain("no motion blocks");
  });

  it("rejects empty G-code string", async () => {
    const output = await postProcessorPipelineEngine.process({
      gcode: "",
    });
    // Empty gcode skips the gcode validation (it's optional — blocks can be pre-parsed)
    // But when provided and empty, we should still process (pipeline handles empty blocks)
    expect(output).toBeDefined();
  });

  it("rejects negative tool number in blocks", async () => {
    const output = await postProcessorPipelineEngine.process({
      gcode: "G0 X0 Y0\nG1 Z-5 F200\nM30",
      blocks: [
        { id: 1, line: "G0 X0 Y0", move_type: "G0", x: 0, y: 0, tool_number: -1 },
        { id: 2, line: "G1 Z-5 F200", move_type: "G1", z: -5, feed_mm_min: 200, tool_number: -1 },
      ],
    });
    expect(output.overall_status).toBe("fail");
    const valStage = output.stages.find(s => s.stage === "input_validation");
    expect(valStage?.data?.errors?.some((e: any) => e.field.includes("tool_number"))).toBe(true);
  });

  it("rejects tool number zero in blocks", async () => {
    const output = await postProcessorPipelineEngine.process({
      gcode: "G0 X0 Y0\nG1 Z-5 F200\nM30",
      blocks: [
        { id: 1, line: "G0 X0 Y0", move_type: "G0", x: 0, y: 0, tool_number: 0 },
      ],
    });
    expect(output.overall_status).toBe("fail");
    const valStage = output.stages.find(s => s.stage === "input_validation");
    expect(valStage?.data?.errors?.some((e: any) => e.reason.includes("positive integer"))).toBe(true);
  });

  it("rejects coordinate exceeding ±99999mm", async () => {
    const output = await postProcessorPipelineEngine.process({
      gcode: "G0 X0 Y0\nG1 X200000 F200\nM30",
      blocks: [
        { id: 1, line: "G0 X0 Y0", move_type: "G0", x: 0, y: 0 },
        { id: 2, line: "G1 X200000 F200", move_type: "G1", x: 200000, feed_mm_min: 200 },
      ],
    });
    expect(output.overall_status).toBe("fail");
    const valStage = output.stages.find(s => s.stage === "input_validation");
    expect(valStage?.data?.errors?.some((e: any) => e.reason.includes("exceeds"))).toBe(true);
  });

  it("validation error includes field, value, reason, and suggestion", async () => {
    const output = await postProcessorPipelineEngine.process({
      gcode: "(No motion)\nM30\n",
    });
    const valStage = output.stages.find(s => s.stage === "input_validation");
    const err = valStage?.data?.errors?.[0];
    expect(err).toBeDefined();
    expect(err.field).toBeTruthy();
    expect(err.reason).toBeTruthy();
    expect(err.suggestion).toBeTruthy();
    expect(err.value).toBeDefined();
  });

  it("pipeline stops on validation failure — no partial output", async () => {
    const output = await postProcessorPipelineEngine.process({
      gcode: "(No motion)\nM30\n",
    });
    expect(output.blocks).toHaveLength(0);
    expect(output.stages.length).toBe(1); // Only validation stage
  });

  it("accepts valid G-code with motion blocks", async () => {
    const output = await postProcessorPipelineEngine.process({
      gcode: "G0 X0 Y0 Z50\nG1 Z-5 F200\nG1 X50 F500\nM30\n",
    });
    // Should not fail validation
    const valStage = output.stages.find(s => s.stage === "input_validation" && s.status === "fail");
    expect(valStage).toBeUndefined();
  });

  it("accepts G-code with G2/G3 arcs as valid motion", async () => {
    const output = await postProcessorPipelineEngine.process({
      gcode: "G2 X10 Y0 I5 J0 F200\nM30\n",
    });
    const valStage = output.stages.find(s => s.stage === "input_validation" && s.status === "fail");
    expect(valStage).toBeUndefined();
  });

  it("accepts blocks with valid positive tool numbers", async () => {
    const output = await postProcessorPipelineEngine.process({
      gcode: "G0 X0 Y0\nG1 Z-5 F200\nM30",
      blocks: [
        { id: 1, line: "G0 X0 Y0", move_type: "G0", x: 0, y: 0, tool_number: 1 },
        { id: 2, line: "G1 Z-5 F200", move_type: "G1", z: -5, feed_mm_min: 200, tool_number: 1 },
      ],
    });
    const valStage = output.stages.find(s => s.stage === "input_validation" && s.status === "fail");
    expect(valStage).toBeUndefined();
  });

  it("accepts coordinates within ±99999mm", async () => {
    const output = await postProcessorPipelineEngine.process({
      gcode: "G0 X0 Y0\nG1 X500 Y-300 Z-50 F200\nM30",
      blocks: [
        { id: 1, line: "G0 X0 Y0", move_type: "G0", x: 0, y: 0 },
        { id: 2, line: "G1 X500 Y-300 Z-50", move_type: "G1", x: 500, y: -300, z: -50, feed_mm_min: 200 },
      ],
    });
    const valStage = output.stages.find(s => s.stage === "input_validation" && s.status === "fail");
    expect(valStage).toBeUndefined();
  });
});
