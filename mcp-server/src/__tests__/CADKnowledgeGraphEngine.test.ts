/**
 * CADKnowledgeGraphEngine tests — CADCAM-DAGI-MS0/U-DAGI02 exit-gate.
 *
 * 20+ required; coverage target 92%. Tests span:
 *   — build() from structured ops for all 4 JM Die part archetypes
 *     (lathe shaft, mill pocket, wire EDM cavity, sinker EDM electrode)
 *   — cycle detection (Johnson DFS): presence + absence cases
 *   — orphan detection + whitelist semantics for Plane / Assembly roots
 *   — transitive ancestors / descendants
 *   — JSON-LD round-trip identity
 *   — BaseEngine contract (execute / validate / getCapabilities / healthCheck)
 */
import { describe, it, expect } from "vitest";
import {
  cadKnowledgeGraphEngine,
  CADKnowledgeGraphEngine,
  type CADGraph,
} from "../engines/CADKnowledgeGraphEngine.js";

// ── Fixtures — one op list per JM Die archetype ──────────────────────────────

const shaftOps = [
  { id: "sk_profile", op: "SKETCH_CREATE", plane: "XZ_PLANE", attrs: { entities: 8 } },
  { id: "feat_revolve", op: "FEAT_REVOLVE", sketch: "sk_profile", attrs: { angle_deg: 360 } },
  { id: "sk_groove", op: "SKETCH_CREATE", plane: "XZ_PLANE" },
  { id: "feat_cut", op: "BOOL_CUT", sketch: "sk_groove" },
];

const pocketOps = [
  { id: "sk_pocket", op: "SKETCH_CREATE", plane: "TOP_PLANE" },
  { id: "feat_pocket", op: "FEAT_EXTRUDE_BLIND", sketch: "sk_pocket", attrs: { depth_mm: 12 } },
  { id: "sk_boss", op: "SKETCH_CREATE", plane: "TOP_PLANE" },
  { id: "feat_boss", op: "FEAT_EXTRUDE_BLIND", sketch: "sk_boss", attrs: { depth_mm: 8 } },
  { id: "feat_fillet", op: "FEAT_FILLET", attrs: { r_mm: 1.0 } },
];

const wedmOps = [
  { id: "sk_cavity", op: "SKETCH_CREATE", plane: "TOP_PLANE", attrs: { closed: true } },
  { id: "feat_through", op: "FEAT_EXTRUDE_THROUGH_ALL", sketch: "sk_cavity" },
];

const sinkerOps = [
  { id: "sk_electrode", op: "SKETCH_CREATE", plane: "TOP_PLANE" },
  { id: "feat_sink", op: "FEAT_EXTRUDE_BLIND", sketch: "sk_electrode", attrs: { depth_mm: 20 } },
  { id: "sk_flats", op: "SKETCH_CREATE", plane: "SIDE_PLANE" },
  { id: "feat_flats", op: "FEAT_PATTERN", sketch: "sk_flats" },
];

// ── Group 1: basic construction ──────────────────────────────────────────────

describe("CADKnowledgeGraphEngine — build()", () => {
  it("builds a graph for a lathe shaft (revolve + boolean cut)", () => {
    const g = cadKnowledgeGraphEngine.build(shaftOps);
    expect(g.nodes.length).toBeGreaterThanOrEqual(6); // 2 sketches, 2 features, 1 plane, >=2 bodies
    expect(g.edges.length).toBeGreaterThanOrEqual(4);
    // Sketch must reference its plane
    expect(
      g.edges.some((e) => e.from === "sk_profile" && e.to === "XZ_PLANE" && e.type === "references"),
    ).toBe(true);
    // Revolve must reference its sketch
    expect(
      g.edges.some((e) => e.from === "feat_revolve" && e.to === "sk_profile" && e.type === "references"),
    ).toBe(true);
  });

  it("builds a mill pocket graph with fillet", () => {
    const g = cadKnowledgeGraphEngine.build(pocketOps);
    expect(g.nodes.some((n) => n.type === "Feature" && n.label === "FEAT_FILLET")).toBe(true);
    expect(g.nodes.some((n) => n.type === "Body")).toBe(true);
    expect(g.nodes.some((n) => n.type === "Plane" && n.id === "TOP_PLANE")).toBe(true);
  });

  it("builds a wire EDM cavity graph", () => {
    const g = cadKnowledgeGraphEngine.build(wedmOps);
    expect(g.nodes).toHaveLength(4); // sketch + feature + plane + body
    expect(g.edges.some((e) => e.type === "references")).toBe(true);
  });

  it("builds a sinker EDM electrode graph with pattern", () => {
    const g = cadKnowledgeGraphEngine.build(sinkerOps);
    expect(g.nodes.some((n) => n.label === "FEAT_PATTERN")).toBe(true);
  });

  it("auto-materializes a default plane when a sketch has no explicit plane", () => {
    const g = cadKnowledgeGraphEngine.build([{ id: "sk_no_plane", op: "SKETCH_CREATE" }]);
    const planes = g.nodes.filter((n) => n.type === "Plane");
    expect(planes.length).toBe(1);
    expect(planes[0].id).toMatch(/^plane_default_/);
  });

  it("auto-assigns ids when none given", () => {
    const g = cadKnowledgeGraphEngine.build([{ op: "SKETCH_CREATE", plane: "TOP" }]);
    expect(g.nodes.some((n) => n.id.startsWith("sketch_"))).toBe(true);
  });
});

// ── Group 2: cycle detection ────────────────────────────────────────────────

describe("CADKnowledgeGraphEngine — detectCycles()", () => {
  it("reports no cycles on an acyclic pocket graph", () => {
    const g = cadKnowledgeGraphEngine.build(pocketOps);
    const r = cadKnowledgeGraphEngine.detectCycles(g);
    expect(r.hasCycles).toBe(false);
    expect(r.cycles).toEqual([]);
  });

  it("detects a simple 3-node cycle", () => {
    const g: CADGraph = {
      nodes: [
        { id: "a", type: "Feature", label: "A" },
        { id: "b", type: "Feature", label: "B" },
        { id: "c", type: "Feature", label: "C" },
      ],
      edges: [
        { id: "e1", from: "a", to: "b", type: "references" },
        { id: "e2", from: "b", to: "c", type: "references" },
        { id: "e3", from: "c", to: "a", type: "references" },
      ],
    };
    const r = cadKnowledgeGraphEngine.detectCycles(g);
    expect(r.hasCycles).toBe(true);
    expect(r.cycles).toHaveLength(1);
    expect(r.cycles[0]).toHaveLength(3);
  });

  it("detects a self-loop as a cycle", () => {
    const g: CADGraph = {
      nodes: [{ id: "a", type: "Feature", label: "A" }],
      edges: [{ id: "e1", from: "a", to: "a", type: "references" }],
    };
    const r = cadKnowledgeGraphEngine.detectCycles(g);
    expect(r.hasCycles).toBe(true);
  });

  it("deduplicates equivalent cycles reached from different starts", () => {
    const g: CADGraph = {
      nodes: [
        { id: "a", type: "Feature", label: "A" },
        { id: "b", type: "Feature", label: "B" },
      ],
      edges: [
        { id: "e1", from: "a", to: "b", type: "references" },
        { id: "e2", from: "b", to: "a", type: "references" },
      ],
    };
    const r = cadKnowledgeGraphEngine.detectCycles(g);
    expect(r.cycles.length).toBe(1);
  });
});

// ── Group 3: orphan detection ───────────────────────────────────────────────

describe("CADKnowledgeGraphEngine — findOrphans()", () => {
  it("finds zero orphans in a fully connected pocket graph", () => {
    const g = cadKnowledgeGraphEngine.build(pocketOps);
    const r = cadKnowledgeGraphEngine.findOrphans(g);
    expect(r.count).toBe(0);
  });

  it("identifies a dangling sketch as an orphan", () => {
    const g: CADGraph = {
      nodes: [
        { id: "sk1", type: "Sketch", label: "S" },
        { id: "plane", type: "Plane", label: "TOP" },
        { id: "sk_lone", type: "Sketch", label: "LONE" },
      ],
      edges: [{ id: "e1", from: "sk1", to: "plane", type: "references" }],
    };
    const r = cadKnowledgeGraphEngine.findOrphans(g);
    expect(r.orphans).toContain("sk_lone");
    expect(r.orphans).not.toContain("plane"); // roots whitelisted
  });

  it("whitelists Plane and Assembly as valid roots with zero degree", () => {
    const g: CADGraph = {
      nodes: [
        { id: "root_plane", type: "Plane", label: "ROOT" },
        { id: "root_asm", type: "Assembly", label: "ASM" },
      ],
      edges: [],
    };
    const r = cadKnowledgeGraphEngine.findOrphans(g);
    expect(r.count).toBe(0);
  });
});

// ── Group 4: transitive closures ────────────────────────────────────────────

describe("CADKnowledgeGraphEngine — ancestors/descendants", () => {
  const g = cadKnowledgeGraphEngine.build(pocketOps);

  it("returns ancestors transitively", () => {
    const anc = cadKnowledgeGraphEngine.ancestors(g, "feat_fillet");
    // FEAT_FILLET modifies the last body, which references the previous feature(s).
    expect(anc.length).toBeGreaterThanOrEqual(1);
  });

  it("returns descendants transitively", () => {
    const dsc = cadKnowledgeGraphEngine.descendants(g, "TOP_PLANE");
    // TOP_PLANE is referenced by 2 sketches → descendants should include both.
    expect(dsc).toContain("sk_pocket");
    expect(dsc).toContain("sk_boss");
  });

  it("returns empty arrays for isolated nodes", () => {
    const isolated: CADGraph = {
      nodes: [{ id: "x", type: "Feature", label: "X" }],
      edges: [],
    };
    expect(cadKnowledgeGraphEngine.ancestors(isolated, "x")).toEqual([]);
    expect(cadKnowledgeGraphEngine.descendants(isolated, "x")).toEqual([]);
  });
});

// ── Group 5: JSON-LD round-trip ─────────────────────────────────────────────

describe("CADKnowledgeGraphEngine — JSON-LD", () => {
  it("emits a W3C JSON-LD document with cad: namespace", () => {
    const g = cadKnowledgeGraphEngine.build(shaftOps);
    const doc = cadKnowledgeGraphEngine.toJsonLd(g);
    expect(doc["@context"]).toBeDefined();
    expect(doc["@graph"]).toBeDefined();
    const ctx = doc["@context"] as Record<string, unknown>;
    expect(ctx.cad).toBe("https://prism.local/ns/cad#");
  });

  it("round-trips: fromJsonLd(toJsonLd(g)) preserves node and edge counts", () => {
    const g = cadKnowledgeGraphEngine.build(pocketOps);
    const doc = cadKnowledgeGraphEngine.toJsonLd(g);
    const g2 = cadKnowledgeGraphEngine.fromJsonLd(doc);
    expect(g2.nodes.length).toBe(g.nodes.length);
    expect(g2.edges.length).toBe(g.edges.length);
  });

  it("round-trips preserve edge types", () => {
    const g = cadKnowledgeGraphEngine.build(shaftOps);
    const g2 = cadKnowledgeGraphEngine.fromJsonLd(cadKnowledgeGraphEngine.toJsonLd(g));
    const types = new Set(g2.edges.map((e) => e.type));
    const original = new Set(g.edges.map((e) => e.type));
    for (const t of original) expect(types.has(t)).toBe(true);
  });

  it("throws on malformed JSON-LD (missing @graph)", () => {
    expect(() => cadKnowledgeGraphEngine.fromJsonLd({ foo: "bar" })).toThrow();
  });
});

// ── Group 6: BaseEngine contract ────────────────────────────────────────────

describe("CADKnowledgeGraphEngine — BaseEngine contract", () => {
  it("reports capabilities", () => {
    const caps = cadKnowledgeGraphEngine.getCapabilities();
    expect(caps.length).toBeGreaterThanOrEqual(5);
    expect(caps.some((c) => c.name === "build_graph")).toBe(true);
    expect(caps.some((c) => c.name === "detect_cycles")).toBe(true);
  });

  it("passes healthCheck", async () => {
    const h = await cadKnowledgeGraphEngine.healthCheck();
    expect(h.healthy).toBe(true);
  });

  it("rejects non-object input via validate()", () => {
    const err = cadKnowledgeGraphEngine.validate(42);
    expect(err).not.toBeNull();
  });

  it("executes with operations input", async () => {
    const r = await cadKnowledgeGraphEngine.execute({ operations: shaftOps });
    expect(r.success).toBe(true);
    expect((r.data as CADGraph).nodes.length).toBeGreaterThan(0);
  });

  it("executes with query input", async () => {
    const g = cadKnowledgeGraphEngine.build(pocketOps);
    const r = await cadKnowledgeGraphEngine.execute({ graph: g, query: "detect_cycles" });
    expect(r.success).toBe(true);
  });

  it("execute(ancestors) requires nodeId", async () => {
    const g = cadKnowledgeGraphEngine.build(pocketOps);
    const r = await cadKnowledgeGraphEngine.execute({ graph: g, query: "ancestors" });
    expect(r.success).toBe(false);
  });
});

// ── Group 7: anti-regression — singleton & class identity ───────────────────

describe("CADKnowledgeGraphEngine — singleton", () => {
  it("exports the engine as a singleton of the correct class", () => {
    expect(cadKnowledgeGraphEngine).toBeInstanceOf(CADKnowledgeGraphEngine);
    expect(cadKnowledgeGraphEngine.info.name).toBe("CADKnowledgeGraphEngine");
    expect(cadKnowledgeGraphEngine.info.domain).toBe("cad_neural");
  });
});
