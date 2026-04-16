/**
 * SimulationVisualizationBridgeEngine tests
 */
import { describe, it, expect } from "vitest";
import { simulationVisualizationBridgeEngine } from "../engines/SimulationVisualizationBridgeEngine.js";
import { cncSimulationPipelineEngine } from "../engines/CNCSimulationPipelineEngine.js";

const PROGRAM = [
  "S8000 M03", "G00 X0 Y0 Z50", "G00 Z5",
  "G01 Z-5 F200", "G01 X100 F500", "G01 Y50",
  "G01 X0", "G01 Y0", "G00 Z50", "M30",
];

describe("SimulationVisualizationBridgeEngine", () => {
  const sim = cncSimulationPipelineEngine.simulate({
    gcode_blocks: PROGRAM, material: "steel",
  });

  it("generates toolpath segments", () => {
    const viz = simulationVisualizationBridgeEngine.generateVisualization(sim);
    expect(viz.toolpath_segments.length).toBeGreaterThan(0);
    for (const seg of viz.toolpath_segments) {
      expect(seg.start).toHaveLength(3);
      expect(seg.end).toHaveLength(3);
      expect(seg.color).toHaveLength(3);
    }
  });

  it("force color mode: green→yellow→red gradient", () => {
    const viz = simulationVisualizationBridgeEngine.generateVisualization(sim, { colorMode: "force" });
    const cutting = viz.toolpath_segments.filter(s => s.moveType !== "rapid");
    expect(cutting.length).toBeGreaterThan(0);
    // Colors should be valid RGB 0-1
    for (const seg of cutting) {
      for (const c of seg.color) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it("rapids are semi-transparent", () => {
    const viz = simulationVisualizationBridgeEngine.generateVisualization(sim);
    const rapids = viz.toolpath_segments.filter(s => s.moveType === "rapid");
    for (const r of rapids) {
      expect(r.opacity).toBeLessThan(1);
    }
  });

  it("generates collision zone overlays", () => {
    const viz = simulationVisualizationBridgeEngine.generateVisualization(sim);
    expect(viz.collision_zones.length).toBeGreaterThan(0);
    for (const zone of viz.collision_zones) {
      expect(zone.min).toHaveLength(3);
      expect(zone.max).toHaveLength(3);
      expect(zone.color).toHaveLength(4); // RGBA
    }
  });

  it("generates machine envelope", () => {
    const viz = simulationVisualizationBridgeEngine.generateVisualization(sim);
    expect(viz.machine_envelope.min).toHaveLength(3);
    expect(viz.machine_envelope.max).toHaveLength(3);
  });

  it("generates tool timeline for playback", () => {
    const viz = simulationVisualizationBridgeEngine.generateVisualization(sim);
    expect(viz.tool_timeline.length).toBeGreaterThan(0);
    // Timeline should be monotonically increasing
    for (let i = 1; i < viz.tool_timeline.length; i++) {
      expect(viz.tool_timeline[i].time_s).toBeGreaterThanOrEqual(
        viz.tool_timeline[i - 1].time_s
      );
    }
  });

  it("generates heatmap values for cutting blocks", () => {
    const viz = simulationVisualizationBridgeEngine.generateVisualization(sim, { colorMode: "force" });
    expect(viz.heatmap_values.length).toBeGreaterThan(0);
    for (const hv of viz.heatmap_values) {
      expect(hv.position).toHaveLength(3);
      expect(hv.value).toBeGreaterThanOrEqual(0);
    }
  });

  it("temperature color mode works", () => {
    const viz = simulationVisualizationBridgeEngine.generateVisualization(sim, { colorMode: "temperature" });
    expect(viz.toolpath_segments.length).toBeGreaterThan(0);
  });

  it("statistics are populated", () => {
    const viz = simulationVisualizationBridgeEngine.generateVisualization(sim);
    expect(viz.statistics.total_segments).toBeGreaterThan(0);
    expect(viz.statistics.cutting_segments + viz.statistics.rapid_segments)
      .toBeLessThanOrEqual(viz.statistics.total_segments);
  });

  it("stock frames track removal progress", () => {
    const viz = simulationVisualizationBridgeEngine.generateVisualization(sim);
    if (viz.stock_frames.length > 0) {
      expect(viz.stock_frames[0].removed_pct).toBeGreaterThanOrEqual(0);
    }
  });
});
