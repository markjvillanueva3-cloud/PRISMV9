/**
 * RoadmapDAGEngine — dedicated per-engine test file (U-FORE-07 helper).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  RoadmapDAGEngine,
  roadmapDAGEngine,
  type RoadmapMilestone,
} from "../engines/RoadmapDAGEngine.js";

const linear: RoadmapMilestone[] = [
  { id: "A", dependencies: [], blocks: ["B"], sessions_p50: 2 },
  { id: "B", dependencies: ["A"], blocks: ["C"], sessions_p50: 3 },
  { id: "C", dependencies: ["B"], sessions_p50: 4 },
];

describe("RoadmapDAGEngine — graph operations", () => {
  it("exports a singleton with correct name", () => {
    expect(roadmapDAGEngine).toBeInstanceOf(RoadmapDAGEngine);
    expect(roadmapDAGEngine.name).toBe("RoadmapDAGEngine");
  });

  it("loadFromMilestones builds forward + reverse edges", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(linear);
    expect(d.node("A")!.outgoing).toContain("B");
    expect(d.node("B")!.incoming).toContain("A");
  });

  it("filters completed milestones by default", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones([
      { id: "A", status: "complete" },
      { id: "B", dependencies: ["A"] },
    ]);
    expect(d.node("A")).toBeNull();
    expect(d.node("B")).not.toBeNull();
  });

  it("includeCompleted keeps complete nodes when requested", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(
      [
        { id: "A", status: "complete" },
        { id: "B", dependencies: ["A"] },
      ],
      { includeCompleted: true }
    );
    expect(d.node("A")).not.toBeNull();
  });

  it("topoSort returns correct order for a linear chain", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(linear);
    expect(d.topoSort().map((n) => n.id)).toEqual(["A", "B", "C"]);
  });

  it("hasCycle detects a self-loop", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones([{ id: "X", dependencies: ["X"] }]);
    expect(d.hasCycle()).toBe(true);
  });

  it("topoSortPartial tolerates cycles and returns what it can order", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones([
      { id: "X", dependencies: ["Y"] },
      { id: "Y", dependencies: ["X"] },
      { id: "Z", dependencies: [] },
    ]);
    const r = d.topoSortPartial();
    expect(r.order.some((n) => n.id === "Z")).toBe(true);
    expect(r.cycleNodes.length).toBeGreaterThan(0);
  });

  it("ancestors walks transitive dependencies", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(linear);
    expect(d.ancestors("C").sort()).toEqual(["A", "B"]);
  });

  it("descendants walks transitive dependents", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(linear);
    expect(d.descendants("A").sort()).toEqual(["B", "C"]);
  });

  it("stats reports counts for nodes/edges/roots/leaves", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(linear);
    const s = d.stats();
    expect(s.nodes).toBe(3);
    expect(s.roots).toBe(1);
    expect(s.leaves).toBe(1);
  });

  it("drops edges to filtered-out completed nodes", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones([
      { id: "A", status: "complete", blocks: ["B"] },
      { id: "B", dependencies: ["A"] },
    ]);
    expect(d.node("B")!.incoming).toEqual([]);
  });

  it("FAIL: missing index file throws on disk load", () => {
    const d = new RoadmapDAGEngine("/no/such/roadmap.json");
    expect(() => d.load()).toThrow(/not found/);
  });

  it("FAIL: non-array .milestones throws", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rdg-bad-"));
    const p = path.join(tmp, "idx.json");
    fs.writeFileSync(p, JSON.stringify({ milestones: "nope" }), "utf-8");
    const d = new RoadmapDAGEngine(p);
    expect(() => d.load()).toThrow(/expected .milestones to be an array/);
  });

  it("reset() forces re-read on next load", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(linear);
    expect(d.allNodes().length).toBe(3);
    d.reset();
    // loadFromMilestones was used — after reset the in-memory graph is gone
    expect(d["loaded"]).toBe(false);
  });
});
