/**
 * PreMOUKickoffChecklistEngine (U-LPR-PRE-MOU, Delivery B1)
 *
 * Gate that prevents the MOU clock (MOUStallGateEngine) from starting
 * until every prerequisite has been independently verified. Running the
 * T+N deadline against an incomplete kickoff is how pilots slip without
 * anyone noticing — this engine is the forcing function that keeps the
 * stall-gate honest.
 *
 * Canonical items (seeded from the Lathe-Prod pilot playbook):
 *
 *   NDA_SIGNED                 — mutual NDA signed by both orgs.
 *   SCOPE_DOC_APPROVED         — scope of work reviewed + approved.
 *   POC_CONFIRMED              — named points of contact on both sides.
 *   MACHINE_ACCESS_WINDOW      — scheduled wet-run window reserved.
 *   MATERIAL_AVAILABILITY      — barstock on hand (or PO firm).
 *   TOOLING_AVAILABILITY       — inserts + holders on hand (or PO firm).
 *   FIXTURE_CONFIRMED          — workholding validated for the geometry.
 *   CAD_CAM_APPROVAL           — part + toolpath approved by customer.
 *   SAFETY_BRIEFING_COMPLETE   — operator briefed on pilot protocol.
 *   ROLLBACK_PLAN_DOCUMENTED   — abort / rollback steps written down.
 *
 * An item is only 'verified' once:
 *   - filled_at recorded,
 *   - evidence_uri non-empty (docusign link, purchase order, schedule ID,
 *     etc.); for items with evidence_optional=true (briefing, rollback),
 *     a signed_off_by alone is enough,
 *   - signed_off_by non-empty.
 *
 * Waivers require justification ≥40 chars + named approver. Waivers
 * decay — after `waiver_expiry_ms` the item goes back to pending.
 *
 * canKickoff() returns { ok, gaps[] }. Only when ok=true should the
 * caller register the blocker in MOUStallGateEngine.
 *
 * Pure engine. Caller persists via `toSnapshot()` to
 * `data/state/KICKOFF_CHECKLIST.json` (schemaVersion 1).
 */

export type ItemStatus = "pending" | "verified" | "waived";

export interface ChecklistItemDef {
  item_id: string;
  title: string;
  description: string;
  evidence_optional: boolean;       // e.g. safety briefings leave only a sign-off
  critical: boolean;                // if true, cannot be waived (NDA, scope)
}

export interface ChecklistItem extends ChecklistItemDef {
  status: ItemStatus;
  filled_at?: number;
  evidence_uri?: string;
  signed_off_by?: string;
  waived_at?: number;
  waived_by?: string;
  waiver_reason?: string;
  waiver_expires_at?: number;
  notes?: string;
}

export interface KickoffRegistration {
  kickoff_id: string;
  blocker_id: string;               // the MOU blocker this checklist gates
  customer: string;
  opened_at: number;                // when the checklist was opened
}

export interface KickoffRecord {
  kickoff_id: string;
  blocker_id: string;
  customer: string;
  opened_at: number;
  items: ChecklistItem[];
  closed_at?: number;
  closed_by?: string;
}

export interface KickoffVerdict {
  ok: boolean;
  total: number;
  verified: number;
  waived: number;
  pending: number;
  gaps: Array<{ item_id: string; reason: string }>;
}

export const CANONICAL_ITEMS: readonly ChecklistItemDef[] = [
  {
    item_id: "NDA_SIGNED",
    title: "Mutual NDA signed",
    description: "Executed mutual NDA between the two orgs, countersigned.",
    evidence_optional: false,
    critical: true,
  },
  {
    item_id: "SCOPE_DOC_APPROVED",
    title: "Scope-of-work approved",
    description: "Written SOW acknowledged by customer + internal PM.",
    evidence_optional: false,
    critical: true,
  },
  {
    item_id: "POC_CONFIRMED",
    title: "Points-of-contact confirmed",
    description: "Named technical + commercial POC on both sides.",
    evidence_optional: false,
    critical: false,
  },
  {
    item_id: "MACHINE_ACCESS_WINDOW",
    title: "Machine access window reserved",
    description: "Wet-run window blocked on the machine schedule.",
    evidence_optional: false,
    critical: false,
  },
  {
    item_id: "MATERIAL_AVAILABILITY",
    title: "Material on hand or PO firm",
    description: "Barstock confirmed on-hand or active PO with ETA.",
    evidence_optional: false,
    critical: false,
  },
  {
    item_id: "TOOLING_AVAILABILITY",
    title: "Tooling on hand or PO firm",
    description: "Inserts + holders confirmed on-hand or active PO.",
    evidence_optional: false,
    critical: false,
  },
  {
    item_id: "FIXTURE_CONFIRMED",
    title: "Workholding validated",
    description: "Fixture / collet / chuck jaws confirmed for geometry.",
    evidence_optional: false,
    critical: false,
  },
  {
    item_id: "CAD_CAM_APPROVAL",
    title: "CAD/CAM approved",
    description: "Part + toolpaths approved by customer engineering.",
    evidence_optional: false,
    critical: true,
  },
  {
    item_id: "SAFETY_BRIEFING_COMPLETE",
    title: "Safety briefing complete",
    description: "Operator walked through pilot-specific safety protocol.",
    evidence_optional: true,
    critical: false,
  },
  {
    item_id: "ROLLBACK_PLAN_DOCUMENTED",
    title: "Rollback plan documented",
    description: "Abort / rollback steps written down and reviewed.",
    evidence_optional: true,
    critical: false,
  },
];

const CANONICAL_BY_ID = new Map<string, ChecklistItemDef>(
  CANONICAL_ITEMS.map((d) => [d.item_id, d]),
);

export class PreMOUKickoffChecklistEngine {
  private kickoffs = new Map<string, KickoffRecord>();

  register(input: KickoffRegistration): KickoffRecord {
    if (!input.kickoff_id.trim()) throw new Error("kickoff_id required");
    if (!input.blocker_id.trim()) throw new Error("blocker_id required");
    if (!input.customer.trim()) throw new Error("customer required");
    if (!Number.isFinite(input.opened_at) || input.opened_at <= 0) {
      throw new Error("opened_at must be a positive epoch-ms");
    }
    if (this.kickoffs.has(input.kickoff_id)) {
      throw new Error(`kickoff ${input.kickoff_id} already registered`);
    }
    const rec: KickoffRecord = {
      kickoff_id: input.kickoff_id.trim(),
      blocker_id: input.blocker_id.trim(),
      customer: input.customer.trim(),
      opened_at: input.opened_at,
      items: CANONICAL_ITEMS.map((def) => ({
        ...def,
        status: "pending" as ItemStatus,
      })),
    };
    this.kickoffs.set(rec.kickoff_id, rec);
    return this.snapshot(rec);
  }

  /** Add a custom item beyond the canonical ten. */
  addCustomItem(kickoff_id: string, def: ChecklistItemDef): KickoffRecord {
    const k = this.mustFind(kickoff_id);
    if (!def.item_id.trim()) throw new Error("item_id required");
    if (!def.title.trim()) throw new Error("title required");
    if (CANONICAL_BY_ID.has(def.item_id)) {
      throw new Error(`item_id ${def.item_id} is canonical; cannot redefine`);
    }
    if (k.items.some((i) => i.item_id === def.item_id)) {
      throw new Error(`item ${def.item_id} already exists on kickoff`);
    }
    k.items.push({ ...def, status: "pending" });
    return this.snapshot(k);
  }

  verify(input: {
    kickoff_id: string;
    item_id: string;
    filled_at: number;
    evidence_uri?: string;
    signed_off_by: string;
    notes?: string;
  }): ChecklistItem {
    const k = this.mustFind(input.kickoff_id);
    if (k.closed_at !== undefined) {
      throw new Error(`kickoff ${k.kickoff_id} is closed`);
    }
    const item = k.items.find((i) => i.item_id === input.item_id);
    if (!item) throw new Error(`item ${input.item_id} not on kickoff`);
    if (!input.signed_off_by.trim()) {
      throw new Error("signed_off_by required");
    }
    if (!item.evidence_optional) {
      if (!input.evidence_uri || !input.evidence_uri.trim()) {
        throw new Error(
          `item ${item.item_id} requires evidence_uri (docusign, PO, schedule, etc.)`,
        );
      }
    }
    if (input.filled_at < k.opened_at) {
      throw new Error("filled_at cannot precede opened_at");
    }
    item.status = "verified";
    item.filled_at = input.filled_at;
    item.evidence_uri = input.evidence_uri?.trim() || undefined;
    item.signed_off_by = input.signed_off_by.trim();
    item.notes = input.notes?.trim() || undefined;
    // clear any prior waiver fields
    item.waived_at = undefined;
    item.waived_by = undefined;
    item.waiver_reason = undefined;
    item.waiver_expires_at = undefined;
    return { ...item };
  }

  /** Legal/PM override. Critical items cannot be waived. */
  waive(input: {
    kickoff_id: string;
    item_id: string;
    waived_at: number;
    waived_by: string;
    reason: string;
    expires_at?: number;             // defaults to +30 days
  }): ChecklistItem {
    const k = this.mustFind(input.kickoff_id);
    if (k.closed_at !== undefined) {
      throw new Error(`kickoff ${k.kickoff_id} is closed`);
    }
    const item = k.items.find((i) => i.item_id === input.item_id);
    if (!item) throw new Error(`item ${input.item_id} not on kickoff`);
    if (item.critical) {
      throw new Error(
        `item ${item.item_id} is critical and cannot be waived — verify instead`,
      );
    }
    if (!input.waived_by.trim()) throw new Error("waived_by required");
    if (!input.reason || input.reason.trim().length < 40) {
      throw new Error("waiver reason must be ≥40 chars");
    }
    const expires_at =
      input.expires_at ?? input.waived_at + 30 * 24 * 3600 * 1000;
    if (expires_at <= input.waived_at) {
      throw new Error("expires_at must be > waived_at");
    }
    item.status = "waived";
    item.waived_at = input.waived_at;
    item.waived_by = input.waived_by.trim();
    item.waiver_reason = input.reason.trim();
    item.waiver_expires_at = expires_at;
    return { ...item };
  }

  /**
   * Sweep expired waivers — any 'waived' item whose waiver_expires_at has
   * passed goes back to 'pending'. Returns list of items that decayed.
   */
  sweepExpiredWaivers(now: number): ChecklistItem[] {
    const decayed: ChecklistItem[] = [];
    for (const k of this.kickoffs.values()) {
      if (k.closed_at !== undefined) continue;
      for (const item of k.items) {
        if (
          item.status === "waived" &&
          item.waiver_expires_at !== undefined &&
          now >= item.waiver_expires_at
        ) {
          item.status = "pending";
          item.waived_at = undefined;
          item.waived_by = undefined;
          item.waiver_reason = undefined;
          item.waiver_expires_at = undefined;
          decayed.push({ ...item });
        }
      }
    }
    return decayed;
  }

  canKickoff(kickoff_id: string, now?: number): KickoffVerdict {
    const k = this.mustFind(kickoff_id);
    const ts = now ?? Date.now();
    let verified = 0;
    let waived = 0;
    let pending = 0;
    const gaps: Array<{ item_id: string; reason: string }> = [];
    for (const item of k.items) {
      // decay-aware effective status
      let effective: ItemStatus = item.status;
      if (
        effective === "waived" &&
        item.waiver_expires_at !== undefined &&
        ts >= item.waiver_expires_at
      ) {
        effective = "pending";
      }
      switch (effective) {
        case "verified":
          verified++;
          break;
        case "waived":
          waived++;
          break;
        case "pending":
          pending++;
          gaps.push({
            item_id: item.item_id,
            reason: item.critical
              ? `${item.title} — CRITICAL, not yet verified`
              : `${item.title} — pending`,
          });
          break;
      }
    }
    return {
      ok: pending === 0,
      total: k.items.length,
      verified,
      waived,
      pending,
      gaps,
    };
  }

  close(input: { kickoff_id: string; closed_at: number; closed_by: string }): KickoffRecord {
    const k = this.mustFind(input.kickoff_id);
    if (k.closed_at !== undefined) {
      throw new Error(`kickoff ${k.kickoff_id} already closed`);
    }
    if (!input.closed_by.trim()) throw new Error("closed_by required");
    const verdict = this.canKickoff(input.kickoff_id, input.closed_at);
    if (!verdict.ok) {
      throw new Error(
        `cannot close kickoff with ${verdict.pending} pending items`,
      );
    }
    k.closed_at = input.closed_at;
    k.closed_by = input.closed_by.trim();
    return this.snapshot(k);
  }

  getKickoff(kickoff_id: string): KickoffRecord | null {
    const k = this.kickoffs.get(kickoff_id);
    return k ? this.snapshot(k) : null;
  }

  listKickoffs(filter?: { open_only?: boolean }): KickoffRecord[] {
    const out: KickoffRecord[] = [];
    for (const k of this.kickoffs.values()) {
      if (filter?.open_only && k.closed_at !== undefined) continue;
      out.push(this.snapshot(k));
    }
    return out;
  }

  toSnapshot(): { schemaVersion: 1; kickoffs: KickoffRecord[] } {
    return { schemaVersion: 1, kickoffs: this.listKickoffs() };
  }

  loadSnapshot(snap: { schemaVersion: number; kickoffs: KickoffRecord[] }): void {
    if (snap.schemaVersion !== 1) {
      throw new Error(`unsupported schemaVersion ${snap.schemaVersion}`);
    }
    this.kickoffs.clear();
    for (const k of snap.kickoffs) {
      this.kickoffs.set(k.kickoff_id, this.snapshot(k));
    }
  }

  clearAll(): void {
    this.kickoffs.clear();
  }

  private mustFind(id: string): KickoffRecord {
    const k = this.kickoffs.get(id);
    if (!k) throw new Error(`kickoff ${id} not found`);
    return k;
  }

  private snapshot(k: KickoffRecord): KickoffRecord {
    return {
      ...k,
      items: k.items.map((i) => ({ ...i })),
    };
  }
}

export const preMOUKickoffChecklistEngine = new PreMOUKickoffChecklistEngine();
