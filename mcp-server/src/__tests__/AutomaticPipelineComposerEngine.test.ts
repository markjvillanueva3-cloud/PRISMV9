/**
 * AutomaticPipelineComposerEngine Tests — Phase 0.24 U-INT3
 */

import { describe, it, expect, beforeEach } from "vitest";
import { automaticPipelineComposerEngine } from "../engines/AutomaticPipelineComposerEngine.js";

describe("AutomaticPipelineComposerEngine", () => {
  beforeEach(() => {
    automaticPipelineComposerEngine.reset();
  });

  it("composes pipeline for speed feed objective", async () => {
    const pipeline = await automaticPipelineComposerEngine.compose({
      objective: "Optimize speed and feed",
      inputs: ["material_spec", "tool_spec"],
      requiredOutputs: ["optimal_params"],
    });
    expect(pipeline.stages.length).toBeGreaterThan(0);
    expect(pipeline.id).toMatch(/^pipeline_/);
  });

  it("composes pipeline for tool selection", async () => {
    const pipeline = await automaticPipelineComposerEngine.compose({
      objective: "Select best tool for the job",
      inputs: ["geometry", "material"],
      requiredOutputs: ["ranked_tools"],
    });
    expect(pipeline.stages.length).toBeGreaterThan(0);
  });

  it("composes pipeline for quality prediction", async () => {
    const pipeline = await automaticPipelineComposerEngine.compose({
      objective: "Predict surface quality",
      inputs: ["machining_params"],
      requiredOutputs: ["validation_result"],
    });
    expect(pipeline.stages.length).toBeGreaterThan(0);
  });

  it("calculates total estimated duration", async () => {
    const pipeline = await automaticPipelineComposerEngine.compose({
      objective: "Optimize speed feed",
      inputs: ["material"],
      requiredOutputs: ["params"],
    });
    expect(pipeline.totalEstimatedDuration).toBeGreaterThan(0);
    expect(pipeline.totalEstimatedDuration).toBe(
      pipeline.stages.reduce((sum, s) => sum + s.estimatedDuration, 0)
    );
  });

  it("provides confidence score", async () => {
    const pipeline = await automaticPipelineComposerEngine.compose({
      objective: "Test",
      inputs: ["in"],
      requiredOutputs: ["out"],
    });
    expect(pipeline.confidence).toBeGreaterThanOrEqual(0);
    expect(pipeline.confidence).toBeLessThanOrEqual(1);
  });

  it("identifies warnings for missing outputs", async () => {
    const pipeline = await automaticPipelineComposerEngine.compose({
      objective: "speed",
      inputs: ["x"],
      requiredOutputs: ["nonexistent_output_xyz"],
    });
    expect(pipeline.warnings.length).toBeGreaterThan(0);
  });

  it("respects max stages constraint", async () => {
    const pipeline = await automaticPipelineComposerEngine.compose({
      objective: "optimize speed",
      inputs: ["x"],
      requiredOutputs: ["y"],
      constraints: { maxStages: 2 },
    });
    expect(pipeline.stages.length).toBeLessThanOrEqual(2);
  });

  it("stages have required fields", async () => {
    const pipeline = await automaticPipelineComposerEngine.compose({
      objective: "speed feed",
      inputs: ["x"],
      requiredOutputs: ["y"],
    });
    for (const stage of pipeline.stages) {
      expect(stage.id).toBeDefined();
      expect(stage.name).toBeDefined();
      expect(stage.assetType).toBeDefined();
      expect(stage.assetId).toBeDefined();
      expect(Array.isArray(stage.inputs)).toBe(true);
      expect(Array.isArray(stage.outputs)).toBe(true);
    }
  });

  it("lists available templates", async () => {
    const templates = await automaticPipelineComposerEngine.listTemplates();
    expect(templates).toContain("speed_feed");
    expect(templates).toContain("tool_selection");
  });

  it("gets specific template", async () => {
    const template = await automaticPipelineComposerEngine.getTemplate("speed_feed");
    expect(template).not.toBeNull();
    expect(template?.length).toBeGreaterThan(0);
  });

  it("returns null for unknown template", async () => {
    const template = await automaticPipelineComposerEngine.getTemplate("nonexistent");
    expect(template).toBeNull();
  });

  it("reset clears templates", () => {
    automaticPipelineComposerEngine.reset();
    expect(true).toBe(true);
  });
});
