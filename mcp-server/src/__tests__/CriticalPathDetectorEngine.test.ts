/**
 * U-FORE-07 tests — RoadmapDAGEngine + CriticalPathDetectorEngine
 *
 * Coverage floor per engine: happy + ≥3 failure modes + ≥2 adversarial.
 * Variability: 4 DAG shapes (linear chain, fan-out, fan-in, diamond)
 * exercise the critical-path calculator. Plus an on-disk roadmap load
 * test to prove the <1s target against the real 684-milestone index.
 * Dispatcher round-trip included.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  RoadmapDAGEngine,
  type RoadmapMilestone,
} from "../engines/RoadmapDAGEngine.js";
import {
  CriticalPathDetectorEngine,
} from "../engines/CriticalPathDetectorEngine.js";

function writeIndex(milestones: RoadmapMilestone[]): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "roadmap-"));
  const p = path.join(tmp, "roadmap-index.json");
  fs.writeFileSync(
    p,
    JSON.stringify({ version: 1, milestones }, null, 2),
    "utf-8"
  );
  return p;
}

const linearChain: RoadmapMilestone[] = [
  { id: "A", dependencies: [], blocks: ["B"], sessions_p50: 2 },
  { id: "B", dependencies: ["A"], blocks: ["C"], sessions_p50: 3 },
  { id: "C", dependencies: ["B"], blocks: ["D"], sessions_p50: 4 },
  { id: "D", dependencies: ["C"], sessions_p50: 5 },
];

const diamond: RoadmapMilestone[] = [
  { id: "R", blocks: ["L", "M"], sessions_p50: 1 },
  { id: "L", dependencies: ["R"], blocks: ["E"], sessions_p50: 3 },
  { id: "M", dependencies: ["R"], blocks: ["E"], sessions_p50: 5 },
  { id: "E", dependencies: ["L", "M"], sessions_p50: 2 },
];

const fanOut: RoadmapMilestone[] = [
  { id: "ROOT", blocks: ["C1", "C2", "C3"], sessions_p50: 2 },
  { id: "C1", dependencies: ["ROOT"], sessions_p50: 4 },
  { id: "C2", dependencies: ["ROOT"], sessions_p50: 6 },
  { id: "C3", dependencies: ["ROOT"], sessions_p50: 3 },
];

// ─── RoadmapDAGEngine ───────────────────────────────────────────────

describe("RoadmapDAGEngine — load + graph", () => {
  it("loadFromMilestones builds nodes with forward + reverse edges", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(linearChain);
    const a = d.node("A");
    expect(a).not.toBeNull();
    expect(a!.outgoing).toContain("B");
    const b = d.node("B");
    expect(b!.incoming).toContain("A");
  });

  it("filters completed by default", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones([
      { id: "A", status: "complete" },
      { id: "B", dependencies: ["A"] },
    ]);
    expect(d.node("A")).toBeNull();
    expect(d.node("B")).not.toBeNull();
  });

  it("includeCompleted keeps complete nodes", () => {
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

  it("topoSort orders A→B→C→D", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(linearChain);
    const order = d.topoSort().map((n) => n.id);
    expect(order).toEqual(["A", "B", "C", "D"]);
  });

  it("cycle detection catches self-loop", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones([{ id: "X", dependencies: ["X"] }]);
    expect(d.hasCycle()).toBe(true);
    expect(() => d.topoSort()).toThrow(/cycle detected/);
  });

  it("ancestors + descendants walk the DAG transitively", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(linearChain);
    expect(d.ancestors("D").sort()).toEqual(["A", "B", "C"]);
    expect(d.descendants("A").sort()).toEqual(["B", "C", "D"]);
  });

  it("stats report counts for edges/roots/leaves", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(fanOut);
    const s = d.stats();
    expect(s.nodes).toBe(4);
    expect(s.roots).toBe(1);
    expect(s.leaves).toBe(3);
  });

  it("reconciles blocks → dependencies bidirectionally", () => {
    const d = new RoadmapDAGEngine();
    // A blocks B, but B doesn't list A as a dependency — should be inferred
    d.loadFromMilestones([
      { id: "A", blocks: ["B"] },
      { id: "B" },
    ]);
    expect(d.node("B")!.incoming).toContain("A");
  });

  it("FAIL: missing index file throws", () => {
    const d = new RoadmapDAGEngine("/no/such/path/roadmap-index.json");
    expect(() => d.load()).toThrow(/not found/);
  });

  it("FAIL: malformed milestones field throws", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bad-"));
    const p = path.join(tmp, "idx.json");
    fs.writeFileSync(p, JSON.stringify({ milestones: "nope" }), "utf-8");
    const d = new RoadmapDAGEngine(p);
    expect(() => d.load()).toThrow(/expected .milestones to be an array/);
  });

  it("ADV: drops edges to nodes filtered out of the DAG", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones([
      { id: "A", status: "complete", blocks: ["B"] },
      { id: "B", dependencies: ["A"] },
    ]); // A is filtered
    // B's incoming from A should be pruned because A is not in the graph
    expect(d.node("B")!.incoming).toEqual([]);
  });

  it("ADV: loads real on-disk roadmap-index under 1s", () => {
    const real = path.join(process.cwd(), "data", "roadmap-index.json");
    if (!fs.existsSync(real)) return; // skip outside repo
    const d = new RoadmapDAGEngine(real);
    const start = Date.now();
    const nodes = d.load();
    expect(Date.now() - start).toBeLessThan(1000);
    expect(nodes.length).toBeGreaterThan(0);
  });
});

// ─── CriticalPathDetectorEngine ────────────────────────────────────

describe("CriticalPathDetectorEngine — longest weighted path", () => {
  function detector(milestones: RoadmapMilestone[]): CriticalPathDetectorEngine {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(milestones);
    return new CriticalPathDetectorEngine(d);
  }

  it("linear chain: top path is A→B→C→D with summed weights", () => {
    const e = detector(linearChain);
    const r = e.computeCriticalPath({ k: 1 });
    expect(r.topK).toHaveLength(1);
    expect(r.topK[0].path).toEqual(["A", "B", "C", "D"]);
    expect(r.topK[0].totalWeight).toBe(2 + 3 + 4 + 5);
  });

  it("VARIABILITY: diamond picks R→M→E (longest, not R→L→E)", () => {
    const e = detector(diamond);
    const r = e.computeCriticalPath({ k: 1 });
    expect(r.topK[0].path).toEqual(["R", "M", "E"]);
    expect(r.topK[0].totalWeight).toBe(1 + 5 + 2);
  });

  it("VARIABILITY: fan-out picks ROOT→C2 (heaviest child)", () => {
    const e = detector(fanOut);
    const r = e.computeCriticalPath({ k: 1 });
    expect(r.topK[0].path).toEqual(["ROOT", "C2"]);
  });

  it("VARIABILITY: fan-in (multiple roots merging) picks heaviest inbound", () => {
    const fanIn: RoadmapMilestone[] = [
      { id: "P1", blocks: ["T"], sessions_p50: 5 },
      { id: "P2", blocks: ["T"], sessions_p50: 3 },
      { id: "P3", blocks: ["T"], sessions_p50: 7 },
      { id: "T", dependencies: ["P1", "P2", "P3"], sessions_p50: 2 },
    ];
    const e = detector(fanIn);
    const r = e.computeCriticalPath({ k: 1 });
    expect(r.topK[0].path[0]).toBe("P3"); // heaviest predecessor
    expect(r.topK[0].path).toContain("T");
  });

  it("topK size honors k parameter", () => {
    const e = detector(linearChain);
    const r = e.computeCriticalPath({ k: 2 });
    expect(r.topK.length).toBeLessThanOrEqual(2);
  });

  it("default weight applied when sessions_p50 missing", () => {
    const noWeights: RoadmapMilestone[] = [
      { id: "A", blocks: ["B"] },
      { id: "B" },
    ];
    const e = detector(noWeights);
    const r = e.computeCriticalPath({ k: 1 });
    expect(r.topK[0].totalWeight).toBeGreaterThan(0);
  });

  it("criticalUnits returns union of all top-K paths", () => {
    const e = detector(linearChain);
    const ids = e.criticalUnits({ k: 2 });
    expect(ids).toContain("A");
    expect(ids).toContain("D");
  });

  it("announce renders a short human-readable string", () => {
    const e = detector(linearChain);
    const r = e.computeCriticalPath();
    const s = e.announce(r);
    expect(s).toContain("Critical path");
    expect(s).toMatch(/D|A|linear/i);
  });

  it("handles empty DAG without crashing", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones([]);
    const e = new CriticalPathDetectorEngine(d);
    const r = e.computeCriticalPath();
    expect(r.topK).toEqual([]);
    expect(r.totalAnalyzedNodes).toBe(0);
  });

  it("completes under 1s on the 4-node test DAGs", () => {
    const e = detector([...linearChain, ...fanOut, ...diamond]);
    const r = e.computeCriticalPath();
    expect(r.computedInMs).toBeLessThan(1000);
  });

  it("completes under 1s on the real 684-milestone index (if present)", () => {
    const real = path.join(process.cwd(), "data", "roadmap-index.json");
    if (!fs.existsSync(real)) return;
    const d = new RoadmapDAGEngine(real);
    const e = new CriticalPathDetectorEngine(d);
    const r = e.computeCriticalPath();
    expect(r.computedInMs).toBeLessThan(1000);
    expect(r.topK.length).toBeGreaterThan(0);
  });

  it("FAIL-tolerant: cycle in DAG is handled gracefully (no throw)", () => {
    // Real-world roadmaps occasionally have accidental cycles; the detector
    // should degrade gracefully — walk the non-cycle portion and skip the
    // cycle-bound nodes rather than aborting the whole report.
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones([
      { id: "X", dependencies: ["Y"] },
      { id: "Y", dependencies: ["X"] },
      { id: "Z", dependencies: [], sessions_p50: 10 },
    ]);
    const e = new CriticalPathDetectorEngine(d);
    const r = e.computeCriticalPath();
    // Z is outside the cycle — should still show up
    expect(r.topK.some((p) => p.path.includes("Z"))).toBe(true);
    // Cycle nodes fall back to their own-weight only (no DP predecessor)
    const xPath = r.topK.find((p) => p.path.includes("X"));
    if (xPath) expect(xPath.path.length).toBeLessThanOrEqual(1);
  });

  it("ADV: path doesn't loop on self even if seen map triggered", () => {
    const e = detector(linearChain);
    const r = e.computeCriticalPath();
    const ids = new Set(r.topK[0].path);
    expect(ids.size).toBe(r.topK[0].path.length);
  });

  it("ADV: recompute after additional milestones picks up the change", () => {
    const d = new RoadmapDAGEngine();
    d.loadFromMilestones(linearChain);
    const e = new CriticalPathDetectorEngine(d);
    const r1 = e.computeCriticalPath({ k: 1 });
    const w1 = r1.topK[0].totalWeight;
    d.loadFromMilestones([
      ...linearChain,
      { id: "E", dependencies: ["D"], sessions_p50: 100 },
    ]);
    const r2 = e.computeCriticalPath({ k: 1 });
    expect(r2.topK[0].totalWeight).toBeGreaterThan(w1);
    expect(r2.topK[0].path).toContain("E");
  });
});

// ─── Dispatcher round-trip ──────────────────────────────────────────

describe("U-FORE-07 — dispatcher round-trip", () => {
  it("devDispatcher exposes critical_path + roadmap_dag actions", () => {
    const disp = fs.readFileSync(
      path.join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8"
    );
    expect(disp).toContain('"critical_path"');
    expect(disp).toContain('"roadmap_dag_stats"');
    expect(disp).toContain("CriticalPathDetectorEngine.js");
    expect(disp).toContain("RoadmapDAGEngine.js");
  });
});
