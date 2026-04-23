/**
 * Tests for businessDispatcher MLLineage actions
 * (PSAU P2.5-LEARN U-LEARN-02 — pipeline causality graph wiring).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { businessDispatch } from "../../tools/dispatchers/businessDispatcher.js";

const LINEAGE_FILE = path.resolve(process.cwd(), "state/lineage/edges.jsonl");
const BACKUP = LINEAGE_FILE + ".psau-test-backup";

function backupLineage(): void {
  if (fs.existsSync(LINEAGE_FILE)) fs.renameSync(LINEAGE_FILE, BACKUP);
}
function restoreLineage(): void {
  if (fs.existsSync(LINEAGE_FILE)) fs.rmSync(LINEAGE_FILE);
  if (fs.existsSync(BACKUP)) fs.renameSync(BACKUP, LINEAGE_FILE);
}

describe("businessDispatcher — MLLineage wiring (U-LEARN-02)", () => {
  beforeAll(backupLineage);
  afterAll(restoreLineage);

  it("lineage_link: appends a valid edge", async () => {
    const result = await businessDispatch({
      action: "lineage_link",
      from: { kind: "raw_event", id: "BD-EVT-1" },
      to: { kind: "feature_row", id: "BD-FR-1" },
      relation: "derived_from",
    });
    expect(result.success).toBe(true);
    const d = result.data as any;
    expect(d.ok).toBe(true);
    expect(d.edge_id).toBeTruthy();
  });

  it("lineage_link: rejects invalid node kind", async () => {
    const result = await businessDispatch({
      action: "lineage_link",
      from: { kind: "imaginary_kind", id: "X" },
      to: { kind: "feature_row", id: "F" },
      relation: "derived_from",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid input");
  });

  it("lineage_link: rejects invalid relation", async () => {
    const result = await businessDispatch({
      action: "lineage_link",
      from: { kind: "raw_event", id: "E" },
      to: { kind: "feature_row", id: "F" },
      relation: "goes_boom",
    });
    expect(result.success).toBe(false);
  });

  it("lineage_link: rejects empty id", async () => {
    const result = await businessDispatch({
      action: "lineage_link",
      from: { kind: "raw_event", id: "" },
      to: { kind: "feature_row", id: "F" },
      relation: "derived_from",
    });
    expect(result.success).toBe(false);
  });

  it("lineage_trace: walks forward from prediction through the full chain", async () => {
    await businessDispatch({
      action: "lineage_link",
      from: { kind: "prediction", id: "BD-P1" },
      to: { kind: "outcome_event", id: "BD-OE1" },
      relation: "validated_by",
    });
    await businessDispatch({
      action: "lineage_link",
      from: { kind: "prediction", id: "BD-P1" },
      to: { kind: "model_checkpoint", id: "BD-M1" },
      relation: "produced_by",
    });
    await businessDispatch({
      action: "lineage_link",
      from: { kind: "model_checkpoint", id: "BD-M1" },
      to: { kind: "training_example", id: "BD-TE1" },
      relation: "trained_on",
    });

    const trace = await businessDispatch({
      action: "lineage_trace",
      node: { kind: "prediction", id: "BD-P1" },
      direction: "forward",
      max_depth: 5,
    });
    expect(trace.success).toBe(true);
    const d = trace.data as any;
    const kinds = d.nodes.map((n: any) => n.kind);
    expect(kinds).toContain("outcome_event");
    expect(kinds).toContain("model_checkpoint");
    expect(kinds).toContain("training_example");
  });

  it("lineage_trace: honors relation filter", async () => {
    const trace = await businessDispatch({
      action: "lineage_trace",
      node: { kind: "prediction", id: "BD-P1" },
      direction: "forward",
      max_depth: 5,
      relations: ["validated_by"],            // only outcome branch
    });
    const d = trace.data as any;
    const kinds = d.nodes.map((n: any) => n.kind);
    expect(kinds).toContain("outcome_event");
    expect(kinds).not.toContain("training_example");
  });

  it("lineage_trace: max_depth bounds traversal + flags truncation", async () => {
    const trace = await businessDispatch({
      action: "lineage_trace",
      node: { kind: "prediction", id: "BD-P1" },
      direction: "forward",
      max_depth: 1,
    });
    const d = trace.data as any;
    expect(d.truncated_at_depth).toBe(true);
  });

  it("lineage_trace: rejects invalid direction", async () => {
    const trace = await businessDispatch({
      action: "lineage_trace",
      node: { kind: "prediction", id: "X" },
      direction: "sideways",
      max_depth: 3,
    });
    expect(trace.success).toBe(false);
  });

  it("lineage_stats: reports total + by_relation counts", async () => {
    const s = await businessDispatch({ action: "lineage_stats" });
    expect(s.success).toBe(true);
    const d = s.data as any;
    expect(typeof d.total_edges).toBe("number");
    expect(d.total_edges).toBeGreaterThan(0);
    expect(typeof d.by_relation).toBe("object");
  });

  it("lineage_trace: works on orphan node (returns just the root)", async () => {
    const trace = await businessDispatch({
      action: "lineage_trace",
      node: { kind: "prediction", id: "ORPHAN-Z" },
      direction: "forward",
      max_depth: 3,
    });
    expect(trace.success).toBe(true);
    const d = trace.data as any;
    expect(d.edges).toEqual([]);
    expect(d.nodes.length).toBe(1);
  });
});
