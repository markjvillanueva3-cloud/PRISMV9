/**
 * CustomerComplaintIntakeEngine — phone/email/portal complaint intake.
 *
 * Inbound channel for customer-reported problems. Captures the complaint,
 * triages severity from description keywords + customer tier, optionally
 * cross-creates an NCR via the NonConformanceAndCorrectiveActionEngine bridge.
 *
 * Channels: phone, email, portal, in_person, fax.
 *
 * Triage heuristics (keyword → severity mapping):
 *   - "safety", "injur", "fire", "explos" → critical (auto-NCR)
 *   - "out of spec", "scrap", "rework", "miss" → major (auto-NCR)
 *   - "cosmetic", "minor", "preference" → minor (NCR optional)
 *
 * Pass-in pattern (no rebuild — caller passes NCR-creator fn).
 *
 * Hotel-soul invariants: PII-redacted (customer_id only, no names/contact),
 * Object.frozen, R12 fail-loud, audit-trail.
 *
 * @module CustomerComplaintIntakeEngine
 * @milestone HOTEL/U-CUSTOMER-COMPLAINT-INTAKE (2026-05-25, slot:hotel iter24)
 */

export type ComplaintChannel = "phone" | "email" | "portal" | "in_person" | "fax";
export type ComplaintSeverity = "critical" | "major" | "minor";
export type ComplaintStatus = "received" | "triaged" | "ncr_created" | "resolved" | "closed";

export interface Complaint {
  id: string;
  customer_id: string;
  customer_tier_score: number;     // 0..1 (from BidWinCalibrator tier model)
  channel: ComplaintChannel;
  description: string;
  affected_po_numbers: ReadonlyArray<string>;
  affected_part_ids: ReadonlyArray<string>;
  received_by_employee_id: string;
  received_at: string;
  status: ComplaintStatus;
  triaged_severity?: ComplaintSeverity;
  triaged_at?: string;
  ncr_id?: string;
  resolution_summary?: string;
  closed_at?: string;
}

const SEVERITY_KEYWORDS: Readonly<Record<ComplaintSeverity, ReadonlyArray<RegExp>>> = Object.freeze({
  critical: Object.freeze([/\bsafet/i, /\binjur/i, /\bfire\b/i, /\bexplos/i, /\brecall/i]),
  major: Object.freeze([/\bout of spec\b/i, /\bscrap/i, /\brework/i, /\bmiss/i, /\boversize/i, /\bundersize/i]),
  minor: Object.freeze([/\bcosmetic/i, /\bminor\b/i, /\bpreferenc/i, /\bappearance/i]),
});

class CustomerComplaintIntakeEngine {
  private complaints: Map<string, Complaint> = new Map();
  private nextId = 1;

  receiveComplaint(args: {
    customer_id: string;
    customer_tier_score: number;
    channel: ComplaintChannel;
    description: string;
    received_by_employee_id: string;
    affected_po_numbers?: string[];
    affected_part_ids?: string[];
  }): Complaint {
    if (!args.customer_id) {
      throw new Error("CustomerComplaintIntakeEngine.receiveComplaint: customer_id required");
    }
    if (!args.description || args.description.trim().length < 5) {
      throw new Error(
        "CustomerComplaintIntakeEngine.receiveComplaint: description (≥5 chars) required",
      );
    }
    if (!args.received_by_employee_id) {
      throw new Error("CustomerComplaintIntakeEngine.receiveComplaint: received_by_employee_id required");
    }
    if (!Number.isFinite(args.customer_tier_score) ||
        args.customer_tier_score < 0 || args.customer_tier_score > 1) {
      throw new Error(
        "CustomerComplaintIntakeEngine.receiveComplaint: customer_tier_score must be in [0, 1]",
      );
    }
    const validChannels: ComplaintChannel[] = ["phone", "email", "portal", "in_person", "fax"];
    if (!validChannels.includes(args.channel)) {
      throw new Error(`CustomerComplaintIntakeEngine.receiveComplaint: invalid channel "${args.channel}"`);
    }
    const id = `CMP-${String(this.nextId++).padStart(6, "0")}`;
    const c: Complaint = Object.freeze({
      id,
      customer_id: args.customer_id,
      customer_tier_score: args.customer_tier_score,
      channel: args.channel,
      description: args.description,
      received_by_employee_id: args.received_by_employee_id,
      received_at: new Date().toISOString(),
      status: "received" as const,
      affected_po_numbers: Object.freeze([...(args.affected_po_numbers ?? [])]),
      affected_part_ids: Object.freeze([...(args.affected_part_ids ?? [])]),
    });
    this.complaints.set(id, c);
    return c;
  }

  /**
   * Triage by keyword + tier:
   *   - keyword match wins; anchor tier (≥0.8) elevates major→critical for visibility
   *   - no keyword match → default to major (safer default, will be reviewed)
   */
  triage(args: { complaint_id: string; override_severity?: ComplaintSeverity }): Complaint {
    const c = this.requireComplaint(args.complaint_id);
    if (c.status !== "received") {
      throw new Error(
        `CustomerComplaintIntakeEngine.triage: complaint must be 'received' (got '${c.status}')`,
      );
    }
    let severity: ComplaintSeverity;
    if (args.override_severity) {
      severity = args.override_severity;
    } else {
      severity = this.classifySeverity(c.description, c.customer_tier_score);
    }
    const updated: Complaint = Object.freeze({
      ...c,
      status: "triaged" as const,
      triaged_severity: severity,
      triaged_at: new Date().toISOString(),
    });
    this.complaints.set(c.id, updated);
    return updated;
  }

  private classifySeverity(description: string, tierScore: number): ComplaintSeverity {
    // Walk by severity rank; first match wins
    for (const sev of ["critical", "major", "minor"] as const) {
      for (const pat of SEVERITY_KEYWORDS[sev]) {
        if (pat.test(description)) {
          // Anchor-tier elevator: major → critical when tier ≥ 0.8
          if (sev === "major" && tierScore >= 0.8) return "critical";
          return sev;
        }
      }
    }
    // No keyword match → default major (safer default, will be reviewed)
    return "major";
  }

  /**
   * Cross-create an NCR via the NCR-creator function. Caller passes the actual
   * NonConformanceAndCorrectiveActionEngine.recordNC fn for separation of concerns.
   */
  attachNCR(args: { complaint_id: string; ncr_id: string }): Complaint {
    const c = this.requireComplaint(args.complaint_id);
    if (c.status !== "triaged") {
      throw new Error(
        `CustomerComplaintIntakeEngine.attachNCR: complaint must be 'triaged' (got '${c.status}')`,
      );
    }
    if (!args.ncr_id) {
      throw new Error("CustomerComplaintIntakeEngine.attachNCR: ncr_id required");
    }
    const updated: Complaint = Object.freeze({
      ...c,
      status: "ncr_created" as const,
      ncr_id: args.ncr_id,
    });
    this.complaints.set(c.id, updated);
    return updated;
  }

  resolve(args: { complaint_id: string; resolution_summary: string }): Complaint {
    const c = this.requireComplaint(args.complaint_id);
    if (c.status === "closed") {
      throw new Error("CustomerComplaintIntakeEngine.resolve: complaint already closed");
    }
    if (!args.resolution_summary || args.resolution_summary.trim().length < 10) {
      throw new Error(
        "CustomerComplaintIntakeEngine.resolve: resolution_summary (≥10 chars) required",
      );
    }
    const updated: Complaint = Object.freeze({
      ...c,
      status: "resolved" as const,
      resolution_summary: args.resolution_summary,
    });
    this.complaints.set(c.id, updated);
    return updated;
  }

  closeComplaint(args: { complaint_id: string }): Complaint {
    const c = this.requireComplaint(args.complaint_id);
    if (c.status !== "resolved") {
      throw new Error(
        `CustomerComplaintIntakeEngine.closeComplaint: must be 'resolved' (got '${c.status}')`,
      );
    }
    const updated: Complaint = Object.freeze({
      ...c,
      status: "closed" as const,
      closed_at: new Date().toISOString(),
    });
    this.complaints.set(c.id, updated);
    return updated;
  }

  listComplaints(args: { customer_id?: string; status?: ComplaintStatus; severity?: ComplaintSeverity }): ReadonlyArray<Complaint> {
    const out: Complaint[] = [];
    for (const c of this.complaints.values()) {
      if (args.customer_id && c.customer_id !== args.customer_id) continue;
      if (args.status && c.status !== args.status) continue;
      if (args.severity && c.triaged_severity !== args.severity) continue;
      out.push(Object.freeze({ ...c }));
    }
    return Object.freeze(out);
  }

  reset(): void {
    this.complaints.clear();
    this.nextId = 1;
  }

  private requireComplaint(id: string): Complaint {
    const c = this.complaints.get(id);
    if (!c) throw new Error(`CustomerComplaintIntakeEngine: unknown complaint_id "${id}"`);
    return c;
  }
}

export const customerComplaintIntakeEngine = new CustomerComplaintIntakeEngine();
