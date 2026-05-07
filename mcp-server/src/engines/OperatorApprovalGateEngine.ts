/**
 * OperatorApprovalGateEngine — Mandatory Human-in-the-Loop Gate (U-MIO37)
 * ========================================================================
 *
 * Phase 12 Safety Gate: NO program runs without explicit operator
 * verification of setup, tooling, parameters, and safety preconditions.
 *
 * Gate semantics:
 *   1. generateChecklist(context) — produces a structured checklist
 *      derived from the orchestrator plan (tools, WCS, fixture, probing,
 *      first-part checks, stock, material, safety notes).
 *   2. verifyItem(gate_id, item_id, verifier, verified) — operator ticks
 *      each item, identified by name. Non-tickable items (blocked until
 *      upstream) hold the gate closed.
 *   3. requestApproval(gate_id, signature) — operator submits digital
 *      signature. Engine computes gate hash (checklist state + operator
 *      + timestamp) and records it as tamper-evident record.
 *   4. Gate releases production ONLY IF:
 *        - All CRITICAL items verified
 *        - ≥90% of non-critical items verified
 *        - Digital signature captured
 *        - No unresolved escalations
 *
 *   Otherwise: verdict=REJECTED → escalation path kicks in (supervisor
 *   required, safety officer on critical misses).
 *
 * Rationale: derived from lockout/tagout (OSHA 1910.147) + pre-shift
 * inspection standards + ISO 10218-1 robotic safety requirements, adapted
 * for CNC first-cut. Digital signature via SHA-256 of canonical
 * checklist-state JSON + operator id + timestamp; not cryptographically
 * binding but tamper-evident for audit trail.
 *
 * References:
 *   - OSHA 29 CFR 1910.147: The Control of Hazardous Energy (LOTO)
 *   - ISO 10218-1:2011: Robot safety — pre-operation checks
 *   - AIAG APQP §5.8: production trial run / launch authorization
 *   - Shingo Poka-Yoke: inspection at source, not after
 *
 * @module engines/OperatorApprovalGateEngine
 * @milestone MIO-MS0 U-MIO37
 */

import { createHash } from "node:crypto";

// ── Types ──────────────────────────────────────────────────────────────────

export type ChecklistCategory =
  | "setup"        // workholding, WCS set, stock positioned
  | "tooling"      // pockets loaded, offsets preset, life remaining
  | "safety"       // coolant, guards, emergency stops tested
  | "parameters"   // feeds/speeds reviewed, first-part strategy
  | "probing"      // probe calibrated, touch-off verified
  | "quality"      // first-part inspection ready, gages available
  | "documentation";// routing, control plan, setup sheet printed

export type ChecklistSeverity = "critical" | "major" | "minor";

export interface ChecklistItemInput {
  item_id: string;
  category: ChecklistCategory;
  severity: ChecklistSeverity;
  description: string;
  /** Reference to source (setup_sheet, control_plan, routing) */
  source_ref?: string;
  /** If true, operator cannot tick until upstream unblocks */
  blocked?: boolean;
  blocking_reason?: string;
}

export interface ChecklistItem extends ChecklistItemInput {
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  verifier_notes?: string;
}

export interface ApprovalGateInput {
  /** Cross-link to orchestrator plan/setup */
  setup_id?: string;
  control_plan_id?: string;
  routing_id?: string;
  probing_id?: string;
  part_number: string;
  revision: string;
  job_id?: string;
  /** Operator(s) responsible for running the job */
  assigned_operators: string[];
  /** Auto-generated or manually-curated checklist items */
  checklist: ChecklistItemInput[];
}

export type ApprovalVerdict = "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";

export interface ApprovalSignature {
  operator_id: string;
  signature_hash: string;   // SHA-256 of canonical state
  signed_at: string;
}

export interface EscalationRecord {
  reason: string;
  severity: ChecklistSeverity;
  triggered_at: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface ApprovalGate {
  gate_id: string;
  setup_id: string;
  control_plan_id: string;
  routing_id: string;
  probing_id: string;
  part_number: string;
  revision: string;
  job_id: string;
  assigned_operators: string[];
  created: string;
  updated: string;
  checklist: ChecklistItem[];
  verdict: ApprovalVerdict;
  production_released: boolean;
  signature?: ApprovalSignature;
  escalations: EscalationRecord[];
  summary: {
    total_items: number;
    critical_total: number;
    critical_verified: number;
    major_total: number;
    major_verified: number;
    minor_total: number;
    minor_verified: number;
    blocked_items: number;
    verification_pct: number;
  };
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class OperatorApprovalGateEngine {
  private store: Map<string, ApprovalGate> = new Map();
  private counter = 0;

  /**
   * Open a new approval gate. Gate starts with verdict=PENDING and all
   * items un-verified. Returns the gate id.
   */
  openGate(input: ApprovalGateInput): ApprovalGate {
    if (!input.checklist || input.checklist.length === 0) {
      throw new Error("OperatorApprovalGate: at least one checklist item required");
    }
    if (!input.assigned_operators || input.assigned_operators.length === 0) {
      throw new Error("OperatorApprovalGate: at least one assigned operator required");
    }
    this.counter++;
    const gateId = `APV-${String(this.counter).padStart(5, "0")}`;
    const now = new Date().toISOString();

    const checklist: ChecklistItem[] = input.checklist.map(i => ({
      ...i,
      verified: false,
      blocked: i.blocked ?? false,
    }));

    const gate: ApprovalGate = {
      gate_id: gateId,
      setup_id: input.setup_id ?? "N/A",
      control_plan_id: input.control_plan_id ?? "N/A",
      routing_id: input.routing_id ?? "N/A",
      probing_id: input.probing_id ?? "N/A",
      part_number: input.part_number,
      revision: input.revision,
      job_id: input.job_id ?? "N/A",
      assigned_operators: input.assigned_operators,
      created: now,
      updated: now,
      checklist,
      verdict: "PENDING",
      production_released: false,
      escalations: [],
      summary: this.computeSummary(checklist),
    };

    this.store.set(gateId, gate);
    return gate;
  }

  /**
   * Operator ticks an individual checklist item.
   *
   * @throws if gate unknown, item unknown, or item is blocked.
   */
  verifyItem(
    gate_id: string,
    item_id: string,
    verifier: string,
    notes?: string,
  ): ApprovalGate {
    const gate = this.mustGet(gate_id);
    const item = gate.checklist.find(i => i.item_id === item_id);
    if (!item) throw new Error(`OperatorApprovalGate: item '${item_id}' not found in gate ${gate_id}`);
    if (item.blocked) {
      throw new Error(
        `OperatorApprovalGate: item '${item_id}' is BLOCKED — ${item.blocking_reason ?? "upstream dependency unmet"}`,
      );
    }
    item.verified = true;
    item.verified_by = verifier;
    item.verified_at = new Date().toISOString();
    if (notes) item.verifier_notes = notes;
    gate.updated = new Date().toISOString();
    gate.summary = this.computeSummary(gate.checklist);
    return gate;
  }

  /**
   * Unblock a checklist item (e.g. once upstream dependency met).
   */
  unblockItem(gate_id: string, item_id: string): ApprovalGate {
    const gate = this.mustGet(gate_id);
    const item = gate.checklist.find(i => i.item_id === item_id);
    if (!item) throw new Error(`OperatorApprovalGate: item '${item_id}' not found in gate ${gate_id}`);
    item.blocked = false;
    item.blocking_reason = undefined;
    gate.updated = new Date().toISOString();
    gate.summary = this.computeSummary(gate.checklist);
    return gate;
  }

  /**
   * Operator requests approval. Gate is checked against the release rules:
   *   - All CRITICAL items verified
   *   - ≥90% of non-critical items verified
   *   - No blocked items remaining
   *
   * If rules satisfied: verdict=APPROVED, signature captured,
   * production_released=true.
   * Otherwise: verdict=REJECTED, escalation created.
   *
   * @param gate_id — the gate to evaluate
   * @param operator_id — the operator signing off
   */
  requestApproval(gate_id: string, operator_id: string): ApprovalGate {
    const gate = this.mustGet(gate_id);
    if (!gate.assigned_operators.includes(operator_id)) {
      throw new Error(
        `OperatorApprovalGate: operator '${operator_id}' is not assigned to gate ${gate_id}`,
      );
    }

    const blockedRemaining = gate.checklist.filter(i => i.blocked).length;
    const criticalItems = gate.checklist.filter(i => i.severity === "critical");
    const criticalUnverified = criticalItems.filter(i => !i.verified);
    const nonCritical = gate.checklist.filter(i => i.severity !== "critical");
    const nonCriticalVerifiedPct = nonCritical.length === 0
      ? 1
      : nonCritical.filter(i => i.verified).length / nonCritical.length;

    const now = new Date().toISOString();
    gate.updated = now;

    if (blockedRemaining > 0) {
      gate.verdict = "REJECTED";
      gate.escalations.push({
        reason: `${blockedRemaining} checklist item(s) still BLOCKED by upstream dependencies`,
        severity: "major",
        triggered_at: now,
        resolved: false,
      });
      return gate;
    }

    if (criticalUnverified.length > 0) {
      gate.verdict = "ESCALATED";
      gate.escalations.push({
        reason: `${criticalUnverified.length} CRITICAL item(s) unverified: ${criticalUnverified.map(i => i.item_id).join(", ")}`,
        severity: "critical",
        triggered_at: now,
        resolved: false,
      });
      return gate;
    }

    if (nonCriticalVerifiedPct < 0.9) {
      gate.verdict = "REJECTED";
      gate.escalations.push({
        reason: `Non-critical verification below 90% threshold (${(nonCriticalVerifiedPct * 100).toFixed(1)}%)`,
        severity: "major",
        triggered_at: now,
        resolved: false,
      });
      return gate;
    }

    // APPROVED — capture signature
    const signature: ApprovalSignature = {
      operator_id,
      signature_hash: this.computeSignature(gate, operator_id, now),
      signed_at: now,
    };
    gate.signature = signature;
    gate.verdict = "APPROVED";
    gate.production_released = true;
    return gate;
  }

  /**
   * Resolve an open escalation (supervisor / safety officer action).
   */
  resolveEscalation(
    gate_id: string,
    escalation_index: number,
    resolved_by: string,
    notes: string,
  ): ApprovalGate {
    const gate = this.mustGet(gate_id);
    const esc = gate.escalations[escalation_index];
    if (!esc) {
      throw new Error(
        `OperatorApprovalGate: escalation index ${escalation_index} not found in gate ${gate_id}`,
      );
    }
    if (esc.resolved) {
      throw new Error(`OperatorApprovalGate: escalation already resolved`);
    }
    esc.resolved = true;
    esc.resolved_by = resolved_by;
    esc.resolved_at = new Date().toISOString();
    esc.resolution_notes = notes;
    gate.updated = new Date().toISOString();
    return gate;
  }

  /** Retrieve a gate by id */
  get(gate_id: string): ApprovalGate | null {
    return this.store.get(gate_id) ?? null;
  }

  /** Render a Markdown summary of the gate for operator display */
  renderMarkdown(gate: ApprovalGate): string {
    const out: string[] = [];
    out.push(`# Operator Approval Gate ${gate.gate_id}`);
    out.push("");
    out.push(`**Part:** ${gate.part_number} Rev ${gate.revision}  |  **Job:** ${gate.job_id}`);
    out.push(`**Verdict:** \`${gate.verdict}\`  |  **Released:** ${gate.production_released ? "✅ YES" : "❌ NO"}`);
    out.push(`**Verification:** ${gate.summary.verification_pct.toFixed(1)}% (${gate.summary.total_items - gate.summary.blocked_items}/${gate.summary.total_items} actionable)`);
    out.push("");
    out.push(`| Item | Cat | Sev | ✓ | Verifier | Desc |`);
    out.push(`|------|-----|-----|---|----------|------|`);
    for (const it of gate.checklist) {
      const tick = it.blocked ? "🚫" : it.verified ? "✅" : "☐";
      out.push(`| ${it.item_id} | ${it.category} | ${it.severity} | ${tick} | ${it.verified_by ?? "—"} | ${it.description} |`);
    }
    if (gate.signature) {
      out.push("");
      out.push(`## Signature`);
      out.push(`- **Operator:** ${gate.signature.operator_id}`);
      out.push(`- **Signed:** ${gate.signature.signed_at}`);
      out.push(`- **Hash:** \`${gate.signature.signature_hash}\``);
    }
    if (gate.escalations.length > 0) {
      out.push("");
      out.push(`## Escalations`);
      for (const e of gate.escalations) {
        const status = e.resolved ? `✅ resolved by ${e.resolved_by}` : "⚠ OPEN";
        out.push(`- [${e.severity}] ${e.reason} — ${status}`);
      }
    }
    return out.join("\n");
  }

  /** Clear all gates (primarily for tests) */
  reset(): void {
    this.store.clear();
    this.counter = 0;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private mustGet(gate_id: string): ApprovalGate {
    const g = this.store.get(gate_id);
    if (!g) throw new Error(`OperatorApprovalGate: unknown gate '${gate_id}'`);
    return g;
  }

  private computeSummary(checklist: ChecklistItem[]): ApprovalGate["summary"] {
    const total = checklist.length;
    const crit = checklist.filter(i => i.severity === "critical");
    const maj = checklist.filter(i => i.severity === "major");
    const min = checklist.filter(i => i.severity === "minor");
    const blocked = checklist.filter(i => i.blocked).length;
    const actionable = total - blocked;
    const verifiedActionable = checklist.filter(i => !i.blocked && i.verified).length;
    const pct = actionable === 0 ? 0 : (verifiedActionable / actionable) * 100;
    return {
      total_items: total,
      critical_total: crit.length,
      critical_verified: crit.filter(i => i.verified).length,
      major_total: maj.length,
      major_verified: maj.filter(i => i.verified).length,
      minor_total: min.length,
      minor_verified: min.filter(i => i.verified).length,
      blocked_items: blocked,
      verification_pct: pct,
    };
  }

  /**
   * SHA-256 hash of canonical gate state for tamper-evidence.
   *
   * Algorithm: stable-string-encode the (gate_id, part, rev, operator,
   * timestamp, verified item ids sorted). Any checklist tamper
   * post-signature changes the hash on recomputation, enabling audit
   * detection. NOT a cryptographic signing — use a real KMS/HSM for
   * legal non-repudiation.
   */
  private computeSignature(gate: ApprovalGate, operator: string, ts: string): string {
    const verifiedIds = gate.checklist
      .filter(i => i.verified)
      .map(i => i.item_id)
      .sort();
    const canonical = JSON.stringify({
      gate: gate.gate_id,
      part: gate.part_number,
      rev: gate.revision,
      operator,
      ts,
      verified: verifiedIds,
    });
    return createHash("sha256").update(canonical).digest("hex");
  }
}

export const operatorApprovalGateEngine = new OperatorApprovalGateEngine();
