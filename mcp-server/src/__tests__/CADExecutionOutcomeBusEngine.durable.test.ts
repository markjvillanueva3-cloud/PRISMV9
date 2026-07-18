/**
 * CADExecutionOutcomeBusEngine — durable-channel contract test (NO mocks).
 *
 * The sibling CADExecutionOutcomeBusEngine.test.ts mocks OutcomeCaptureBusEngine
 * at module scope, which means it cannot catch a real contract break between
 * the two engines. This file deliberately uses the REAL OutcomeCaptureBus +
 * the REAL OutcomeEventSchema so the durable channel is verified end-to-end.
 *
 * Regression guard for the U-CADC-LP01 P0 found in 3-of-3 scrutiny: the
 * OutcomeKind enum originally lacked "cad_execution_outcome", so every
 * CADExecutionOutcomeBusEngine.publish() call had its durable forward
 * silently rejected (record() -> OutcomeEventSchema.safeParse fail ->
 * ok:false). The mocked sibling test passed because its stub record()
 * returned ok:true unconditionally, hiding the dead channel.
 *
 * @module __tests__/CADExecutionOutcomeBusEngine.durable.test
 */
import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OutcomeCaptureBusEngine } from "../engines/OutcomeCaptureBusEngine.js";
import { OutcomeKind } from "../schemas/outcomeEventSchema.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("CADExecutionOutcomeBusEngine — durable channel contract (real bus, no mock)", () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), "cad-outcome-bus-"));
  afterAll(() => rmSync(tmpRoot, { recursive: true, force: true }));

  it("OutcomeKind enum accepts cad_execution_outcome and still rejects a bogus kind", () => {
    // Direct enum guard — if this kind is dropped from outcomeEventSchema.ts
    // the durable channel goes dead. The negative case proves the enum is a
    // real allow-list, not a pass-through that would accept anything.
    expect(OutcomeKind.safeParse("cad_execution_outcome").success).toBe(true);
    expect(OutcomeKind.safeParse("cad_execution_outcome_typo").success).toBe(false);
  });

  it("the real OutcomeCaptureBus accepts a publish()-shaped cad_execution_outcome event and writes it", () => {
    // Replicates the EXACT record() input CADExecutionOutcomeBusEngine.publish()
    // forwards on its durable channel (see engine lines ~157-173). A real
    // OutcomeCaptureBusEngine instance (tmp rootDir, no mock) runs the real
    // OutcomeEventSchema.safeParse internally — so ok:true here proves the
    // schema enum + the full context/actual payload shape are all accepted.
    const bus = new OutcomeCaptureBusEngine(tmpRoot);
    const lineageId = "00000000-0000-4000-8000-000000000001";
    const res = bus.record({
      domain: "cad",
      kind: "cad_execution_outcome",
      source: "system",
      lineage_id: lineageId,
      severity: "info",
      context: {
        adapter_id: "fusion360",
        collision: false,
        regeneration_ok: true,
        timing_ms: 250,
      },
      actual: { success: true },
      timestamp: new Date().toISOString(),
    });
    // Pre-fix: ok:false (OutcomeKind lacked cad_execution_outcome).
    expect(res.ok).toBe(true);
    expect(res.lineage_id).toBe(lineageId);
    expect(res.event_id).toMatch(UUID_RE);
    expect(res.path.length).toBeGreaterThan(0);

    // The event must actually land in the durable shard as a parseable line
    // carrying the cad_execution_outcome kind — not just report ok:true.
    const shard = readFileSync(res.path, "utf8").trim().split("\n");
    const lastEvent = JSON.parse(shard[shard.length - 1]);
    expect(lastEvent.kind).toBe("cad_execution_outcome");
    expect(lastEvent.domain).toBe("cad");
    expect(lastEvent.context.adapter_id).toBe("fusion360");
  });

  it("a failure outcome (success:false, severity:medium) also lands on the durable channel", () => {
    // The failure branch — publish() stamps severity:"medium" when success
    // is false (the OutcomeSeverity enum has no "warning"). Both severities
    // must clear the schema, else half the CAD outcomes (the ones learners
    // care about most) would be silently lost.
    const bus = new OutcomeCaptureBusEngine(tmpRoot);
    const res = bus.record({
      domain: "cad",
      kind: "cad_execution_outcome",
      source: "system",
      lineage_id: "00000000-0000-4000-8000-000000000002",
      severity: "medium",
      context: {
        adapter_id: "mastercam",
        collision: true,
        regeneration_ok: false,
        timing_ms: 1200,
      },
      actual: { success: false, error: "regeneration failed" },
      timestamp: new Date().toISOString(),
    });
    expect(res.ok).toBe(true);
    expect(res.path.length).toBeGreaterThan(0);

    const shard = readFileSync(res.path, "utf8").trim().split("\n");
    const lastEvent = JSON.parse(shard[shard.length - 1]);
    expect(lastEvent.severity).toBe("medium");
    expect(lastEvent.actual.success).toBe(false);
    expect(lastEvent.actual.error).toBe("regeneration failed");
  });
});
