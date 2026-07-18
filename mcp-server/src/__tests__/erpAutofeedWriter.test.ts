/**
 * ErpAutofeedWriterEngine tests -- QUOTING-ERP-AUTOFEED/U-ERP-WRITER.
 *
 * Verifies the ERP materialization: a projected payload becomes a shop-floor
 * job + ERP work-order sync + a confirmed portal checklist. Proves the
 * authorization FAILS CLOSED (no role / wrong role -> REFUSED, zero writes),
 * the dry-run path performs NO writes, real writes land for a privileged
 * actor, and the write is fail-soft (one failed write does not lose the
 * others). The payload is produced by the REAL ErpAutofeedProjectionEngine
 * from a realistic completed pipeline result (round-trip, not a fabricated
 * payload). R9.
 */
import { describe, it, expect } from "vitest";
import { erpAutofeedWriterEngine as writer } from "../engines/ErpAutofeedWriterEngine.js";
import {
  erpAutofeedProjectionEngine as proj,
  type ErpAutofeedPayload,
} from "../engines/ErpAutofeedProjectionEngine.js";
import type {
  QuoteToShipResult,
  StageResult,
  PipelineStageId,
} from "../engines/QuoteToShipOrchestratorEngine.js";

function stage(
  id: PipelineStageId,
  status: StageResult["status"],
  output: Record<string, unknown> | null,
): StageResult {
  return {
    id,
    label: id,
    status,
    duration_ms: 1,
    result_summary: `${id} ${status}`,
    output,
    warnings: [],
    errors: [],
    completed_at: "2026-06-29T00:00:00.000Z",
  };
}

function completedResult(): QuoteToShipResult {
  return {
    pipeline_id: "PIPE-WO-1",
    status: "complete",
    stages: [
      stage("QUOTE", "pass", { quote_id: "Q-9", customer_id: "ITW", quoted_price: 900, quantity: 10 }),
    ],
    total_cost_usd: 720,
    lead_time_days: 8,
    program_paths: [],
    setup_sheet: null,
    production_package: null,
    total_duration_ms: 100,
    warnings: [],
    started_at: "2026-06-29T00:00:00.000Z",
    completed_at: "2026-06-29T00:01:00.000Z",
    pipeline_version: "1.0",
  };
}

/** Project a real payload WITH a routed traveler (features + stock supplied). */
function payloadWithTraveler(): ErpAutofeedPayload {
  return proj.project({
    result: completedResult(),
    job_id: "JOB-WO-1",
    part_number: "WO-PART-1",
    revision: "A",
    customer: "ITW",
    material_iso_group: "P",
    features: [
      { id: "p1", type: "pocket", dimensions: { width_mm: 30, length_mm: 30, depth_mm: 8 } },
    ],
    stock: { x_mm: 60, y_mm: 60, z_mm: 15 },
    batch_size: 10,
    now: "2026-06-29T12:00:00.000Z",
  });
}

describe("ErpAutofeedWriterEngine -- authorization FAILS CLOSED", () => {
  it("REFUSES a real commit when NO actor_role is supplied (no writes)", async () => {
    const r = await writer.commit({ payload: payloadWithTraveler() }); // no role, not dry-run
    expect(r.authorized).toBe(false);
    expect(r.writes.length).toBe(0);
    expect(r.summary).toMatch(/no actor_role/i);
  });

  it("REFUSES a real commit by an operator (insufficient role)", async () => {
    const r = await writer.commit({ payload: payloadWithTraveler(), actor_role: "operator" });
    expect(r.authorized).toBe(false);
    expect(r.writes.length).toBe(0);
    expect(r.summary).toMatch(/not permitted/i);
  });

  it("ALLOWS a privileged actor (lead/manager) to commit", async () => {
    const r = await writer.commit({ payload: payloadWithTraveler(), actor_role: "manager" });
    expect(r.authorized).toBe(true);
    expect(r.writes.length).toBe(3);
  });
});

describe("ErpAutofeedWriterEngine -- dry run performs NO writes (ungated)", () => {
  it("a dry run is allowed without a role and writes nothing", async () => {
    const r = await writer.commit({ payload: payloadWithTraveler(), dry_run: true }); // no role
    expect(r.authorized).toBe(true);
    expect(r.dry_run).toBe(true);
    // job + work_order steps are SKIPPED (planned, not written)
    const job = r.writes.find((w) => w.step === "job")!;
    const wo = r.writes.find((w) => w.step === "work_order")!;
    expect(job.status).toBe("skipped");
    expect(wo.status).toBe("skipped");
    expect(r.summary).toMatch(/DRY RUN/);
  });
});

describe("ErpAutofeedWriterEngine -- real writes materialize the job", () => {
  it("creates a shop-floor job + ERP work order + confirms the portal checklist", async () => {
    const r = await writer.commit({ payload: payloadWithTraveler(), actor_role: "lead" });
    const job = r.writes.find((w) => w.step === "job")!;
    const wo = r.writes.find((w) => w.step === "work_order")!;
    const portal = r.writes.find((w) => w.step === "portal_checklist")!;

    expect(job.status).toBe("written");
    expect(job.ref).toMatch(/^JOB-/); // ShopFloorJobEngine assigns its own id
    expect(wo.status).toBe("written");
    expect(wo.ref).toBe("WO-JOB-WO-1");
    expect(portal.status).toBe("already_present");
    expect(portal.ref).toBe("JOB-WO-1");
  });
});

describe("ErpAutofeedWriterEngine -- failure modes + adversarial", () => {
  it("FAILURE 1: no traveler -> job + portal SKIPPED, never throws", async () => {
    // project WITHOUT features/stock -> no routed traveler
    const payload = proj.project({ result: completedResult(), job_id: "JOB-NO-TRAV", part_number: "X" });
    const r = await writer.commit({ payload, actor_role: "manager" });
    const job = r.writes.find((w) => w.step === "job")!;
    const portal = r.writes.find((w) => w.step === "portal_checklist")!;
    expect(job.status).toBe("skipped");
    expect(portal.status).toBe("skipped");
    // the work order still syncs (it does not need the traveler)
    const wo = r.writes.find((w) => w.step === "work_order")!;
    expect(wo.status).toBe("written");
  });

  it("FAILURE 2: a wrong-case role still resolves (case-insensitive)", async () => {
    const r = await writer.commit({ payload: payloadWithTraveler(), actor_role: "MANAGER" });
    expect(r.authorized).toBe(true);
  });

  it("ADVERSARIAL 1: a missing payload REJECTS with a descriptive error", async () => {
    await expect(
      writer.commit({ payload: null as unknown as ErpAutofeedPayload, actor_role: "admin" }),
    ).rejects.toThrow(/must be an ErpAutofeedPayload/);
  });

  it("ADVERSARIAL 2: idempotent re-commit of the same job does not throw", async () => {
    const p = payloadWithTraveler();
    const r1 = await writer.commit({ payload: p, actor_role: "admin" });
    const r2 = await writer.commit({ payload: p, actor_role: "admin" });
    expect(r1.authorized).toBe(true);
    expect(r2.authorized).toBe(true);
    // both commits succeed; the work order upsert is idempotent (same WO number)
    expect(r2.writes.find((w) => w.step === "work_order")!.status).toBe("written");
  });

  it("ADVERSARIAL 3: an unknown role string is denied (fail closed), not allowed", async () => {
    const r = await writer.commit({ payload: payloadWithTraveler(), actor_role: "ceo-impersonator" });
    expect(r.authorized).toBe(false);
    expect(r.writes.length).toBe(0);
  });
});
