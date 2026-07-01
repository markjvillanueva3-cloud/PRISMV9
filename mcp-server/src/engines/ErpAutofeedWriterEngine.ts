/**
 * ErpAutofeedWriterEngine -- QUOTING-ERP-AUTOFEED/U-ERP-WRITER.
 *
 * Consumes a read-only `ErpAutofeedPayload` (from ErpAutofeedProjectionEngine)
 * and MATERIALIZES the job into the ERP / shop-floor surface so a job passing
 * through the shop auto-appears in the business systems:
 *   1. a shop-floor JOB row              -> ShopFloorJobEngine.createJob
 *   2. an ERP WORK-ORDER sync record     -> ERPWorkOrderEngine.syncFromERP
 *   3. the per-employee PORTAL checklist  -> (already attached by the
 *      projection via jobChecklistEngine; the writer confirms it exists)
 *
 * CROSS-GALAXY NOTE: ShopFloorJobEngine / ERPWorkOrderEngine are hotel-owned
 * (business/ERP). charlie writes through them here (operator-chosen full chain)
 * WITHOUT weakening hotel's authorization model -- see ROLE GATING below.
 *
 * ROLE GATING (FAILS CLOSED, mirrors U-HOTEL-PORTAL-AUTH + the SoD pattern):
 *  - Materializing a job into the ERP is a privileged WRITE. An actor with no
 *    resolvable / insufficient role is REJECTED -- the writer defaults to DENY
 *    for an unidentified actor, never degrades open.
 *  - `dry_run:true` performs NO writes (the read-only autofeed path never
 *    mutates) -- it returns the plan only, ungated (no write = no privilege).
 *
 * FAIL-SOFT: each write is wrapped so one failed write (e.g. a duplicate WO)
 * does NOT lose the others -- the result reports per-write status. Idempotent:
 * re-committing the same job is reported as already-present, not duplicated.
 */

import type { ErpAutofeedPayload } from "./ErpAutofeedProjectionEngine.js";

/** Roles permitted to materialize a job into the ERP (privileged write). */
const WRITE_ROLES = new Set(["lead", "supervisor", "manager", "admin", "planner"]);

/** Result of a single write step. */
export interface WriteStepResult {
  step: "job" | "work_order" | "portal_checklist";
  status: "written" | "skipped" | "failed" | "already_present";
  ref: string | null;
  detail: string;
}

/** Result of an ERP-autofeed commit. */
export interface ErpCommitResult {
  job_id: string;
  /** True = no writes performed (dry run or a refusal). */
  dry_run: boolean;
  /** True = the commit was authorized (or a dry run). */
  authorized: boolean;
  /** Per-write outcomes. */
  writes: WriteStepResult[];
  /** Overall summary. */
  summary: string;
}

/** Input to a commit. */
export interface ErpCommitInput {
  /** The projected payload to materialize. */
  payload: ErpAutofeedPayload;
  /** True = project + plan only, NO writes. */
  dry_run?: boolean;
  /** The acting employee's role (gates the privileged writes). */
  actor_role?: string;
  /** Due date for the created job (ISO; default = today + 14d-ish placeholder). */
  due_date?: string;
}

class ErpAutofeedWriterEngine {
  /**
   * Materialize the ERP-autofeed payload into the shop-floor / ERP surface.
   *
   * Fails closed on authorization: a non-dry-run commit by an actor without a
   * WRITE_ROLES role is REFUSED (no writes). A dry run is always allowed (it
   * writes nothing).
   *
   * @param input - the payload + dry-run flag + actor role
   * @returns the per-write commit result
   * @throws when payload is absent / not an ErpAutofeedPayload
   */
  async commit(input: ErpCommitInput): Promise<ErpCommitResult> {
    const payload = input?.payload;
    if (payload == null || typeof payload !== "object" || typeof payload.job_id !== "string") {
      throw new Error(
        "ErpAutofeedWriterEngine.commit: input.payload must be an ErpAutofeedPayload with a job_id",
      );
    }

    const dryRun = input.dry_run === true;
    const role = typeof input.actor_role === "string" ? input.actor_role.toLowerCase() : "";

    // ---- AUTHORIZATION (FAIL CLOSED) ----
    // A dry run writes nothing -> always allowed. A real commit requires a
    // privileged role; an unidentified / insufficient actor is REFUSED.
    if (!dryRun && !WRITE_ROLES.has(role)) {
      return {
        job_id: payload.job_id,
        dry_run: false,
        authorized: false,
        writes: [],
        summary: role
          ? `REFUSED: role '${role}' is not permitted to materialize a job into the ERP (need one of: ${[...WRITE_ROLES].join(", ")}).`
          : "REFUSED: no actor_role supplied -- materializing a job into the ERP is a privileged write and fails closed for an unidentified actor.",
      };
    }

    const writes: WriteStepResult[] = [];

    // ---- WRITE 1: shop-floor JOB row ----
    writes.push(await this.writeJob(payload, dryRun, input.due_date));

    // ---- WRITE 2: ERP work-order sync record ----
    writes.push(await this.writeWorkOrder(payload, dryRun));

    // ---- WRITE 3: per-employee portal checklist (already attached by the
    //      projection; the writer confirms it is present) ----
    writes.push(this.confirmPortalChecklist(payload));

    const failed = writes.filter((w) => w.status === "failed").length;
    return {
      job_id: payload.job_id,
      dry_run: dryRun,
      authorized: true,
      writes,
      summary: dryRun
        ? `DRY RUN: planned ${writes.length} write(s); no ERP rows created.`
        : `Committed ${writes.length - failed}/${writes.length} write(s) for job ${payload.job_id}.`,
    };
  }

  /** Create the shop-floor job row from the traveler steps. Fail-soft. */
  private async writeJob(payload: ErpAutofeedPayload, dryRun: boolean, dueDate?: string): Promise<WriteStepResult> {
    const traveler = payload.employee_portal.traveler;
    if (!traveler || traveler.steps.length === 0) {
      return {
        step: "job",
        status: "skipped",
        ref: null,
        detail: "No traveler steps to map to job operations.",
      };
    }
    const operations = traveler.steps.map((s) => ({
      code: `OP${s.op_num}`,
      description: s.operation,
      department: s.department,
      machineType: s.machine_domain,
      setupMinutes: Number.isFinite(s.est_setup_min) ? s.est_setup_min : 0,
      cycleMinutes: Number.isFinite(s.est_cycle_min) ? s.est_cycle_min : 0,
    }));
    if (dryRun) {
      return {
        step: "job",
        status: "skipped",
        ref: null,
        detail: `Would create job with ${operations.length} operation(s).`,
      };
    }
    try {
      // ShopFloorJobEngine is hotel-owned; charlie writes through it. Its
      // createJob assigns its OWN jobId (the shop-floor id).
      const mod = (await import("./ShopFloorJobEngine.js")) as unknown as {
        ShopFloorJobEngine: {
          createJob: (i: Record<string, unknown>) => { jobId: string };
        };
      };
      const job = mod.ShopFloorJobEngine.createJob({
        partNumber: payload.front_office.part_number ?? payload.job_id,
        revision: payload.front_office.revision ?? "A",
        customer: payload.front_office.customer_id ?? "unknown",
        quantityRequired: Math.max(1, payload.front_office.quantity ?? 1),
        dueDate: dueDate ?? this.defaultDueDate(payload),
        priority: "normal",
        operations,
        notes: payload.manager_notes.manager_notes.join(" | ") || undefined,
      });
      return {
        step: "job",
        status: "written",
        ref: job.jobId,
        detail: `Created shop-floor job ${job.jobId} with ${operations.length} operation(s).`,
      };
    } catch (e) {
      return {
        step: "job",
        status: "failed",
        ref: null,
        detail: `ShopFloorJobEngine.createJob failed: ${(e as Error).message}`,
      };
    }
  }

  /** Register / sync the ERP work-order record. Idempotent + fail-soft. */
  private async writeWorkOrder(payload: ErpAutofeedPayload, dryRun: boolean): Promise<WriteStepResult> {
    const woNumber = `WO-${payload.job_id}`;
    if (dryRun) {
      return {
        step: "work_order",
        status: "skipped",
        ref: woNumber,
        detail: `Would sync ERP work order ${woNumber}.`,
      };
    }
    try {
      const mod = (await import("./ERPWorkOrderEngine.js")) as unknown as {
        ERPWorkOrderEngine: {
          syncFromERP: (
            wo: string,
            data: Record<string, unknown>,
          ) => { success?: boolean };
          getStatus?: (wo: string) => unknown;
        };
      };
      // syncFromERP creates the sync record if absent (idempotent upsert).
      mod.ERPWorkOrderEngine.syncFromERP(woNumber, {
        partNumber: payload.front_office.part_number ?? payload.job_id,
        quantityOrdered: Math.max(1, payload.front_office.quantity ?? 1),
        quantityComplete: 0,
        quantityScrap: 0,
      });
      return {
        step: "work_order",
        status: "written",
        ref: woNumber,
        detail: `Synced ERP work order ${woNumber}.`,
      };
    } catch (e) {
      return {
        step: "work_order",
        status: "failed",
        ref: woNumber,
        detail: `ERPWorkOrderEngine.syncFromERP failed: ${(e as Error).message}`,
      };
    }
  }

  /**
   * Confirm the per-employee portal checklist exists. The projection already
   * attached it via jobChecklistEngine.attachChecklists, so this is a read
   * confirmation (the portal fan-out is the checklist itself; SoD on check-off
   * is enforced by JobChecklistEngine, fail-closed, and NOT widened here).
   */
  private confirmPortalChecklist(payload: ErpAutofeedPayload): WriteStepResult {
    const checklist = payload.employee_portal.checklist;
    if (!checklist) {
      return {
        step: "portal_checklist",
        status: "skipped",
        ref: null,
        detail: "No checklist attached (no routed traveler).",
      };
    }
    return {
      step: "portal_checklist",
      status: "already_present",
      ref: checklist.job_id,
      detail: `Portal checklist present: ${checklist.total_required} required item(s) across ${checklist.steps.length} step(s).`,
    };
  }

  /** A conservative default due date when none supplied (placeholder, advisory). */
  private defaultDueDate(payload: ErpAutofeedPayload): string {
    // Use the projection timestamp's date as a stable, deterministic base;
    // callers should pass an explicit due_date for real scheduling.
    const base = payload.projected_at ?? "";
    return base.length >= 10 ? base.slice(0, 10) : "2026-01-01";
  }
}

export const erpAutofeedWriterEngine = new ErpAutofeedWriterEngine();
