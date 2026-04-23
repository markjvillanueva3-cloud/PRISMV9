/**
 * PrototypicalNetworkEngine Tests — U-LEARN-11
 */

import { describe, it, expect, beforeEach } from "vitest";
import { prototypicalNetworkEngine } from "../engines/PrototypicalNetworkEngine.js";

describe("PrototypicalNetworkEngine", () => {
  beforeEach(() => {
    for (const taskId of prototypicalNetworkEngine.listTasks()) {
      prototypicalNetworkEngine.clearTask(taskId);
    }
  });

  it("computes prototypes from support set", () => {
    const result = prototypicalNetworkEngine.computePrototypes({
      task_id: "proto-test-1",
      domain: "mill",
      examples: [
        { class_id: "itw-steel", features: [1, 2, 3], target: 100 },
        { class_id: "itw-steel", features: [1.1, 2.1, 3.1], target: 105 },
        { class_id: "alcoa-aluminum", features: [5, 6, 7], target: 200 },
      ],
    });
    expect(result.prototype_count).toBe(2);
    expect(result.prototypes).toHaveLength(2);
  });

  it("computes correct mean target per class", () => {
    const result = prototypicalNetworkEngine.computePrototypes({
      task_id: "proto-mean",
      domain: "mill",
      examples: [
        { class_id: "itw-steel", features: [1, 2, 3], target: 100 },
        { class_id: "itw-steel", features: [1.1, 2.1, 3.1], target: 105 },
      ],
    });
    const steelProto = result.prototypes.find((p) => p.class_id === "itw-steel");
    expect(steelProto?.mean_target).toBeCloseTo(102.5, 1);
  });

  it("handles single example per class", () => {
    const result = prototypicalNetworkEngine.computePrototypes({
      task_id: "proto-single",
      domain: "lathe",
      examples: [{ class_id: "holo-krome-inconel", features: [10, 20], target: 50 }],
    });
    expect(result.prototype_count).toBe(1);
    expect(result.prototypes[0].support_count).toBe(1);
  });

  it("rejects empty features", () => {
    expect(() =>
      prototypicalNetworkEngine.computePrototypes({
        task_id: "proto-empty",
        domain: "wedm",
        examples: [{ class_id: "test", features: [], target: 0 }],
      })
    ).toThrow(); // Zod validation: "Too small: expected array to have >=1 items"
  });

  it("rejects mismatched feature dimensions", () => {
    expect(() =>
      prototypicalNetworkEngine.computePrototypes({
        task_id: "proto-mismatch",
        domain: "sinker",
        examples: [
          { class_id: "a", features: [1, 2, 3], target: 10 },
          { class_id: "a", features: [1, 2], target: 20 },
        ],
      })
    ).toThrow("dimension mismatch");
  });

  it("predicts using nearest prototype", () => {
    prototypicalNetworkEngine.computePrototypes({
      task_id: "proto-pred-1",
      domain: "mill",
      examples: [
        { class_id: "class-a", features: [0, 0], target: 100 },
        { class_id: "class-b", features: [10, 10], target: 200 },
      ],
    });
    const result = prototypicalNetworkEngine.predict({ task_id: "proto-pred-1", query_features: [1, 1] });
    expect(result.nearest_prototype).toBe("class-a");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("returns weighted prediction based on distances", () => {
    prototypicalNetworkEngine.computePrototypes({
      task_id: "proto-weighted",
      domain: "lathe",
      examples: [
        { class_id: "low", features: [0], target: 0 },
        { class_id: "high", features: [100], target: 1000 },
      ],
    });
    const midResult = prototypicalNetworkEngine.predict({ task_id: "proto-weighted", query_features: [50] });
    expect(midResult.predicted_value).toBeCloseTo(500, -1);
  });

  it("throws for unknown task in predict", () => {
    expect(() => prototypicalNetworkEngine.predict({ task_id: "nonexistent", query_features: [1, 2, 3] })).toThrow("Task not found");
  });

  it("returns null for unknown task in getTaskState", () => {
    expect(prototypicalNetworkEngine.getTaskState("unknown")).toBeNull();
  });

  it("returns state for existing task", () => {
    prototypicalNetworkEngine.computePrototypes({
      task_id: "state-test",
      domain: "grinder",
      examples: [{ class_id: "x", features: [1, 2, 3, 4], target: 50 }],
    });
    const state = prototypicalNetworkEngine.getTaskState("state-test");
    expect(state?.domain).toBe("grinder");
    expect(state?.feature_dim).toBe(4);
  });

  it("clears task correctly", () => {
    prototypicalNetworkEngine.computePrototypes({
      task_id: "clear-test",
      domain: "welder",
      examples: [{ class_id: "y", features: [1], target: 10 }],
    });
    expect(prototypicalNetworkEngine.clearTask("clear-test")).toBe(true);
    expect(prototypicalNetworkEngine.getTaskState("clear-test")).toBeNull();
  });

  it("lists all active tasks", () => {
    prototypicalNetworkEngine.computePrototypes({ task_id: "list-1", domain: "mill", examples: [{ class_id: "a", features: [1], target: 1 }] });
    prototypicalNetworkEngine.computePrototypes({ task_id: "list-2", domain: "lathe", examples: [{ class_id: "b", features: [2], target: 2 }] });
    const tasks = prototypicalNetworkEngine.listTasks();
    expect(tasks).toContain("list-1");
    expect(tasks).toContain("list-2");
  });
});
