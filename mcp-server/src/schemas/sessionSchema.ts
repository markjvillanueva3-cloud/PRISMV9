/**
 * sessionSchema.ts -- Zod schemas for PreMOUKickoffChecklistEngine wiring in prism_session.
 *
 * One new action wired in U-INDIA-WIRE-4-UNWIRED:
 *   kickoff_checklist -- multi-op gate that prevents MOUStallGateEngine from
 *                        starting until every pre-MOU prerequisite is verified.
 *
 * Operations (params.op):
 *   register  -- open a new kickoff record for a blocker_id + customer
 *   verify    -- mark one checklist item as verified (with evidence)
 *   waive     -- waive a non-critical item (requires 40-char reason)
 *   can_kickoff -- query readiness verdict { ok, gaps[] }
 *   get       -- retrieve a kickoff record by id
 *   list      -- list all (optionally filter to open only)
 *   close     -- close a completed kickoff (all items must be verified/waived)
 *   sweep_waivers -- decay expired waivers back to pending
 *
 * All schemas use .passthrough() so extra metadata keys flow through.
 */

import { z } from "zod";

// ============================================================================
// Shared primitives
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();

// ============================================================================
// kickoff_checklist
// ============================================================================

export const kickoff_checklist = z
  .object({
    op: z
      .enum([
        "register",
        "verify",
        "waive",
        "can_kickoff",
        "get",
        "list",
        "close",
        "sweep_waivers",
      ])
      .describe(
        "Operation to perform. " +
        "register: open a new kickoff; " +
        "verify: mark item verified; " +
        "waive: waive a non-critical item (reason >= 40 chars); " +
        "can_kickoff: readiness verdict {ok, gaps[]}; " +
        "get: retrieve record; " +
        "list: list all kickoffs; " +
        "close: close completed kickoff; " +
        "sweep_waivers: decay expired waivers to pending."
      ),
    // -- register fields --
    kickoff_id: optStr.describe(
      "Unique kickoff identifier (required for all ops except list/sweep_waivers)."
    ),
    blocker_id: optStr.describe(
      "MOUStallGate blocker this checklist gates (required for register)."
    ),
    customer: optStr.describe("Customer name (required for register)."),
    opened_at: optNum.describe(
      "Epoch-ms when checklist opened (required for register, must be > 0)."
    ),
    // -- verify fields --
    item_id: optStr.describe(
      "Checklist item id from CANONICAL_ITEMS (required for verify / waive). " +
      "Values: NDA_SIGNED | SCOPE_DOC_APPROVED | POC_CONFIRMED | " +
      "MACHINE_ACCESS_WINDOW | MATERIAL_AVAILABILITY | TOOLING_AVAILABILITY | " +
      "FIXTURE_CONFIRMED | CAD_CAM_APPROVAL | SAFETY_BRIEFING_COMPLETE | " +
      "ROLLBACK_PLAN_DOCUMENTED."
    ),
    filled_at: optNum.describe("Epoch-ms when item was completed (required for verify)."),
    evidence_uri: optStr.describe(
      "Evidence link (DocuSign URL, PO #, schedule ID, etc.) " +
      "Required unless item.evidence_optional=true."
    ),
    signed_off_by: optStr.describe("Approver name (required for verify)."),
    notes: optStr.describe("Optional free-text notes for the item."),
    // -- waive fields --
    waived_at: optNum.describe("Epoch-ms of waiver (required for waive)."),
    waived_by: optStr.describe("Approver who granted the waiver (required for waive)."),
    reason: optStr.describe(
      "Waiver justification -- must be >= 40 chars. Critical items cannot be waived."
    ),
    expires_at: optNum.describe(
      "Epoch-ms waiver expiry (optional, defaults to waived_at + 30 days)."
    ),
    // -- close fields --
    closed_at: optNum.describe("Epoch-ms when kickoff was closed (required for close)."),
    closed_by: optStr.describe("Person who closed the kickoff (required for close)."),
    // -- list filter --
    open_only: z
      .boolean()
      .optional()
      .describe("When true, list returns only open (not yet closed) kickoffs."),
    // -- can_kickoff / sweep_waivers --
    now: optNum.describe(
      "Epoch-ms reference timestamp for waiver decay check (default: Date.now())."
    ),
  })
  .passthrough();

export const SESSION_KICKOFF_SCHEMAS = { kickoff_checklist } as const;
