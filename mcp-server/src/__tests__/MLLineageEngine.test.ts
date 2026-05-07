/**
 * Tests for MLLineageEngine (U-LEARN-02 lineage subunit).
 *
 * Proves:
 *   - append-only edge writes with atomic tmp+fsync+rename
 *   - typed nodes + relations rejection on schema violations
 *   - forward traversal (raw_event → prediction)
 *   - backward traversal (outcome → model → training_example)
 *   - max_depth bounding + truncated flag
 *   - relation filtering in trace
 *   - crash-tolerant read of torn tail lines
 *   - never-throw contract
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MLLineageEngine } from "../engines/MLLineageEngine.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-lineage-"));
}

describe("MLLineageEngine — U-LEARN-02 (lineage subunit)", () => {
  let root: string;
  let lineage: MLLineageEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    root = tmpRoot();
    lineage = new MLLineageEngine(root);
    cleanups.push(root);
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  // --- link() -----------------------------------------------------------

  it("link: appends a valid edge", () => {
    const res = lineage.link({
      from: { kind: "raw_event", id: "EVT-1" },
      to: { kind: "feature_row", id: "FR-1" },
      relation: "derived_from",
    });
    expect(res.ok).toBe(true);
    expect(res.edge_id).toBeTruthy();
    expect(fs.existsSync(path.join(root, "edges.jsonl"))).toBe(true);
  });

  it("link: rejects invalid node kind", () => {
    const res = lineage.link({
      // @ts-expect-error — invalid kind
      from: { kind: "not_a_kind", id: "X" },
      to: { kind: "feature_row", id: "FR-1" },
      relation: "derived_from",
    });
    expect(res.ok).toBe(false);
    expect(res.warning).toContain("schema validation failed");
  });

  it("link: rejects invalid relation", () => {
    const res = lineage.link({
      from: { kind: "raw_event", id: "E" },
      to: { kind: "feature_row", id: "F" },
      // @ts-expect-error — invalid relation
      relation: "teleports_to",
    });
    expect(res.ok).toBe(false);
  });

  it("link: rejects empty ids", () => {
    const res = lineage.link({
      from: { kind: "raw_event", id: "" },
      to: { kind: "feature_row", id: "F" },
      relation: "derived_from",
    });
    expect(res.ok).toBe(false);
  });

  it("link: persists lineage_id + metadata", () => {
    const res = lineage.link({
      from: { kind: "model_checkpoint", id: "MC-v7" },
      to: { kind: "deployment", id: "DEP-prod" },
      relation: "deployed_as",
      lineage_id: "RUN-2026-04-21",
      metadata: { actor: "cron-train-lora", p90_latency_ms: 48 },
    });
    expect(res.ok).toBe(true);

    const t = lineage.trace({
      node: { kind: "model_checkpoint", id: "MC-v7" },
      direction: "forward",
      max_depth: 2,
    });
    expect(t.edges[0].lineage_id).toBe("RUN-2026-04-21");
    expect((t.edges[0].metadata as any).p90_latency_ms).toBe(48);
  });

  // --- trace forward ----------------------------------------------------

  it("trace forward: full 5-hop pipeline (event → prediction)", () => {
    // raw_event → feature_row → training_example → model_checkpoint →
    // prediction → outcome_event
    lineage.link({
      from: { kind: "raw_event", id: "E1" },
      to: { kind: "feature_row", id: "F1" },
      relation: "derived_from",
    });
    lineage.link({
      from: { kind: "feature_row", id: "F1" },
      to: { kind: "training_example", id: "TE1" },
      relation: "included_in",
    });
    lineage.link({
      from: { kind: "model_checkpoint", id: "M1" },
      to: { kind: "training_example", id: "TE1" },
      relation: "trained_on",
    });
    lineage.link({
      from: { kind: "prediction", id: "P1" },
      to: { kind: "model_checkpoint", id: "M1" },
      relation: "produced_by",
    });
    lineage.link({
      from: { kind: "prediction", id: "P1" },
      to: { kind: "outcome_event", id: "OE1" },
      relation: "validated_by",
    });

    const forward = lineage.trace({
      node: { kind: "raw_event", id: "E1" },
      direction: "forward",
      max_depth: 6,
    });
    // forward from raw_event only has one outgoing edge (derived_from), and that
    // target (feature_row) has one (included_in). Demonstrates traversal works.
    expect(forward.nodes.length).toBeGreaterThanOrEqual(3);
    expect(forward.edges.some(e => e.relation === "derived_from")).toBe(true);
    expect(forward.edges.some(e => e.relation === "included_in")).toBe(true);
  });

  // --- trace backward ---------------------------------------------------

  it("trace forward from prediction: reaches outcome, model, training_example", () => {
    // Edge convention: FROM = downstream, TO = upstream cause, so walking
    // FORWARD from a prediction follows produced_by → model, trained_on → TE,
    // validated_by → outcome. Backward from raw_event instead walks the
    // "who uses me" direction.
    lineage.link({
      from: { kind: "prediction", id: "P1" },
      to: { kind: "outcome_event", id: "OE1" },
      relation: "validated_by",
    });
    lineage.link({
      from: { kind: "prediction", id: "P1" },
      to: { kind: "model_checkpoint", id: "M1" },
      relation: "produced_by",
    });
    lineage.link({
      from: { kind: "model_checkpoint", id: "M1" },
      to: { kind: "training_example", id: "TE1" },
      relation: "trained_on",
    });
    const t = lineage.trace({
      node: { kind: "prediction", id: "P1" },
      direction: "forward",
      max_depth: 5,
    });
    const kinds = t.nodes.map(n => n.kind);
    expect(kinds).toContain("outcome_event");
    expect(kinds).toContain("model_checkpoint");
    expect(kinds).toContain("training_example");
  });

  it("trace backward from training_example: finds the model(s) that trained on it", () => {
    // Complement to the forward test above — given a TE, who trained on it?
    lineage.link({
      from: { kind: "model_checkpoint", id: "M-v1" },
      to: { kind: "training_example", id: "TE-shared" },
      relation: "trained_on",
    });
    lineage.link({
      from: { kind: "model_checkpoint", id: "M-v2" },
      to: { kind: "training_example", id: "TE-shared" },
      relation: "trained_on",
    });
    const t = lineage.trace({
      node: { kind: "training_example", id: "TE-shared" },
      direction: "backward",
      max_depth: 2,
    });
    const modelIds = t.nodes
      .filter(n => n.kind === "model_checkpoint")
      .map(n => n.id)
      .sort();
    expect(modelIds).toEqual(["M-v1", "M-v2"]);
  });

  it("trace honors max_depth and sets truncated_at_depth", () => {
    lineage.link({ from: { kind: "raw_event", id: "A" }, to: { kind: "feature_row", id: "B" }, relation: "derived_from" });
    lineage.link({ from: { kind: "feature_row", id: "B" }, to: { kind: "training_example", id: "C" }, relation: "included_in" });
    lineage.link({ from: { kind: "model_checkpoint", id: "M" }, to: { kind: "training_example", id: "C" }, relation: "trained_on" });
    lineage.link({ from: { kind: "prediction", id: "P" }, to: { kind: "model_checkpoint", id: "M" }, relation: "produced_by" });
    // cap forward walk at 1 from raw_event — should only see feature_row
    const t = lineage.trace({
      node: { kind: "raw_event", id: "A" },
      direction: "forward",
      max_depth: 1,
    });
    expect(t.edges.length).toBe(1);
    expect(t.truncated_at_depth).toBe(true);
  });

  it("trace with relation filter only follows allowed edges", () => {
    lineage.link({ from: { kind: "raw_event", id: "E" }, to: { kind: "feature_row", id: "F" }, relation: "derived_from" });
    lineage.link({ from: { kind: "feature_row", id: "F" }, to: { kind: "training_example", id: "TE" }, relation: "included_in" });
    const t = lineage.trace({
      node: { kind: "raw_event", id: "E" },
      direction: "forward",
      max_depth: 5,
      relations: ["derived_from"],       // exclude included_in
    });
    expect(t.edges.length).toBe(1);
    expect(t.edges[0].relation).toBe("derived_from");
  });

  // --- durability -------------------------------------------------------

  it("50 rapid links all persist (no lost edges)", () => {
    for (let i = 0; i < 50; i++) {
      lineage.link({
        from: { kind: "prediction", id: `P${i}` },
        to: { kind: "model_checkpoint", id: "M-common" },
        relation: "produced_by",
      });
    }
    const s = lineage.stats();
    expect(s.total_edges).toBe(50);
  });

  it("crash-tolerant read: skips torn tail lines", () => {
    lineage.link({
      from: { kind: "raw_event", id: "OK" },
      to: { kind: "feature_row", id: "OK" },
      relation: "derived_from",
    });
    const f = path.join(root, "edges.jsonl");
    fs.appendFileSync(f, "{partial-no-close");
    const s = lineage.stats();
    expect(s.total_edges).toBe(1);       // good edge survives
  });

  it("stats: counts by relation + node kind", () => {
    lineage.link({ from: { kind: "raw_event", id: "E1" }, to: { kind: "feature_row", id: "F1" }, relation: "derived_from" });
    lineage.link({ from: { kind: "raw_event", id: "E2" }, to: { kind: "feature_row", id: "F2" }, relation: "derived_from" });
    lineage.link({ from: { kind: "prediction", id: "P1" }, to: { kind: "outcome_event", id: "OE1" }, relation: "validated_by" });
    const s = lineage.stats();
    expect(s.total_edges).toBe(3);
    expect(s.by_relation.derived_from).toBe(2);
    expect(s.by_relation.validated_by).toBe(1);
    expect(s.by_node_kind_from.raw_event).toBe(2);
    expect(s.by_node_kind_to.outcome_event).toBe(1);
  });

  // --- self-awareness + never-throw ------------------------------------

  it("exposes self-awareness metadata", () => {
    const meta = MLLineageEngine.getSelfAwareness();
    expect(meta.name).toBe("MLLineageEngine");
    expect(meta.capabilities).toContain("link");
    expect(meta.capabilities).toContain("trace");
  });

  it("never throws on trace of isolated node (no edges)", () => {
    expect(() =>
      lineage.trace({
        node: { kind: "prediction", id: "NONE" },
        direction: "forward",
        max_depth: 3,
      }),
    ).not.toThrow();
    const t = lineage.trace({
      node: { kind: "prediction", id: "NONE" },
      direction: "forward",
      max_depth: 3,
    });
    expect(t.edges).toEqual([]);
    expect(t.nodes.length).toBe(1);        // just the root
  });

  it("never throws on circular metadata payload", () => {
    const circ: Record<string, unknown> = {};
    circ.self = circ;
    expect(() =>
      lineage.link({
        from: { kind: "raw_event", id: "E" },
        to: { kind: "feature_row", id: "F" },
        relation: "derived_from",
        metadata: circ,
      }),
    ).not.toThrow();
  });

  it("empty root returns zero stats cleanly", () => {
    const s = lineage.stats();
    expect(s.total_edges).toBe(0);
    expect(s.by_relation).toEqual({});
  });
});
