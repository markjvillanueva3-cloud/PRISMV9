/**
 * ApprovalChainEngine (G8) — multi-step approval chains.
 *
 * Sibling-extension to the existing ApprovalWorkflowEngine (which handles
 * single-step approval). This engine wraps N-step approval chains:
 *   requester → dept-manager → finance → admin
 *
 * Each step has:
 *   • required_rank_min (from ManagerRegistryEngine.RANK_ORDER)
 *   • optional explicit approver_employee_id (overrides rank-only routing)
 *   • optional dollar_threshold_cents (skip step if below threshold)
 *
 * Lifecycle: pending → step_<n>_approved → ... → final_approved | rejected | withdrawn
 *
 * Hotel-soul invariants:
 *   - PII-free, R12 fail-loud, Object.frozen, audit-trail on every transition
 *   - SoD: an approver cannot also be the requester at ANY step
 *   - Financial-aware: dollar thresholds gate per-step entry
 *
 * @module ApprovalChainEngine
 * @milestone HOTEL/U-APPROVAL-CHAIN (2026-05-26, slot:hotel iter8 /goal Phase 3)
 */

import { managerRegistryEngine, type Rank } from "./ManagerRegistryEngine.js";

export type ChainStatus =
  | "pending"
  | "in_progress"
  | "final_approved"
  | "rejected"
  | "withdrawn";

export interface ChainStepSpec {
  /** Sequential step index (1-based). */
  step: number;
  /** Minimum rank required to approve this step. */
  required_rank_min: Rank;
  /** Optional: pin the step to a specific employee (overrides rank-only). */
  approver_employee_id?: string;
  /** Optional: skip this step if amount_cents < threshold. */
  dollar_threshold_cents?: bigint;
  /** Human-readable step label. */
  label: string;
}

export interface ChainStepDecision {
  step: number;
  decided_at: string;
  decided_by_employee_id: string;
  decision: "approved" | "rejected";
  rationale: string;
}

export interface ApprovalChain {
  id: string;
  /** Subject — what's being approved (expense report, PO, GL entry, etc.). */
  subject_kind: string;
  subject_id: string;
  /** Amount in cents (PII-safe currency to-the-cent per hotel-soul). */
  amount_cents: bigint;
  requester_employee_id: string;
  steps: ReadonlyArray<ChainStepSpec>;
  /** Index of the next step to act on (1-based; equals steps.length+1 when done). */
  next_step_index: number;
  status: ChainStatus;
  decisions: ReadonlyArray<ChainStepDecision>;
  created_at: string;
  finalized_at?: string;
  withdrawn_at?: string;
}

export interface SystemVizRoost {
  engine_name: string;
  layer: number;
  node_type: "hub" | "sink" | "source" | "orphan" | "ghost" | "normal";
  psn_legs: ReadonlyArray<number>;
  edges_out: ReadonlyArray<string>;
  edges_in: ReadonlyArray<string>;
}

class ApprovalChainEngine {
  private chains: Map<string, ApprovalChain> = new Map();
  private nextId = 1;

  /**
   * Open a new approval chain. Steps are auto-filtered by dollar_threshold
   * (steps below threshold are skipped at creation — only relevant steps remain).
   */
  open(args: {
    subject_kind: string;
    subject_id: string;
    amount_cents: bigint;
    requester_employee_id: string;
    steps: ChainStepSpec[];
  }): ApprovalChain {
    if (!args.subject_kind) {
      throw new Error("ApprovalChainEngine.open: subject_kind required");
    }
    if (!args.subject_id) {
      throw new Error("ApprovalChainEngine.open: subject_id required");
    }
    if (typeof args.amount_cents !== "bigint") {
      throw new Error(
        "ApprovalChainEngine.open: amount_cents must be a bigint (PII-safe currency invariant)",
      );
    }
    if (args.amount_cents < 0n) {
      throw new Error(
        `ApprovalChainEngine.open: amount_cents must be non-negative (got ${args.amount_cents})`,
      );
    }
    if (!args.requester_employee_id) {
      throw new Error("ApprovalChainEngine.open: requester_employee_id required");
    }
    // Verify requester exists in ManagerRegistry (R12 — no ghost requesters)
    managerRegistryEngine.getEmployee(args.requester_employee_id);

    if (!Array.isArray(args.steps) || args.steps.length === 0) {
      throw new Error("ApprovalChainEngine.open: steps must be a non-empty array");
    }

    // Filter steps by dollar threshold + validate each
    const activeSteps: ChainStepSpec[] = [];
    let lastStep = 0;
    for (const s of args.steps) {
      if (!Number.isInteger(s.step) || s.step <= lastStep) {
        throw new Error(
          `ApprovalChainEngine.open: step indices must be strictly increasing integers (got ${s.step} after ${lastStep})`,
        );
      }
      lastStep = s.step;
      // Verify rank is valid (throws on bad rank)
      managerRegistryEngine.rankIndex(s.required_rank_min);
      if (
        s.dollar_threshold_cents !== undefined &&
        args.amount_cents < s.dollar_threshold_cents
      ) {
        continue; // skip step — amount below threshold
      }
      activeSteps.push(Object.freeze({ ...s }));
    }
    if (activeSteps.length === 0) {
      throw new Error(
        "ApprovalChainEngine.open: amount is below threshold of every step — no approval chain needed; route directly",
      );
    }

    const id = `CHAIN-${String(this.nextId++).padStart(6, "0")}`;
    const now = new Date().toISOString();
    const chain: ApprovalChain = Object.freeze({
      id,
      subject_kind: args.subject_kind,
      subject_id: args.subject_id,
      amount_cents: args.amount_cents,
      requester_employee_id: args.requester_employee_id,
      steps: Object.freeze(activeSteps),
      next_step_index: 1,
      status: "pending" as const,
      decisions: Object.freeze([]),
      created_at: now,
    });
    this.chains.set(id, chain);
    return chain;
  }

  /**
   * Approve the next pending step. Validates rank + SoD + (if step is pinned)
   * approver_employee_id match. If this is the final step, status →
   * final_approved.
   */
  approveStep(args: {
    chain_id: string;
    approver_employee_id: string;
    rationale: string;
  }): ApprovalChain {
    const c = this.requireChain(args.chain_id);
    if (c.status !== "pending" && c.status !== "in_progress") {
      throw new Error(
        `ApprovalChainEngine.approveStep: chain '${c.id}' is '${c.status}' — cannot mutate`,
      );
    }
    if (!args.rationale || args.rationale.trim().length === 0) {
      throw new Error(
        "ApprovalChainEngine.approveStep: non-empty rationale required",
      );
    }
    if (args.approver_employee_id === c.requester_employee_id) {
      throw new Error(
        "ApprovalChainEngine.approveStep: requester cannot approve their own chain (SoD)",
      );
    }
    const nextStep = c.steps.find((s) => s.step === c.next_step_index);
    if (!nextStep) {
      throw new Error(
        `ApprovalChainEngine.approveStep: chain '${c.id}' has no step ${c.next_step_index} — corrupt state`,
      );
    }
    // Verify approver exists + has sufficient rank
    const approver = managerRegistryEngine.getEmployee(args.approver_employee_id);
    if (!approver.active) {
      throw new Error(
        `ApprovalChainEngine.approveStep: approver '${args.approver_employee_id}' is inactive`,
      );
    }
    const approverRankIdx = managerRegistryEngine.rankIndex(approver.rank);
    const requiredIdx = managerRegistryEngine.rankIndex(nextStep.required_rank_min);
    if (approverRankIdx < requiredIdx) {
      throw new Error(
        `ApprovalChainEngine.approveStep: approver rank '${approver.rank}' (idx ${approverRankIdx}) below step ${nextStep.step} required '${nextStep.required_rank_min}' (idx ${requiredIdx})`,
      );
    }
    // If step is pinned to a specific approver, enforce match
    if (
      nextStep.approver_employee_id !== undefined &&
      nextStep.approver_employee_id !== args.approver_employee_id
    ) {
      throw new Error(
        `ApprovalChainEngine.approveStep: step ${nextStep.step} is pinned to '${nextStep.approver_employee_id}', got '${args.approver_employee_id}'`,
      );
    }

    const decision: ChainStepDecision = Object.freeze({
      step: nextStep.step,
      decided_at: new Date().toISOString(),
      decided_by_employee_id: args.approver_employee_id,
      decision: "approved",
      rationale: args.rationale,
    });
    const newNextIdx = c.next_step_index + 1;
    const isFinal = newNextIdx > Math.max(...c.steps.map((s) => s.step));
    const updated: ApprovalChain = Object.freeze({
      ...c,
      next_step_index: newNextIdx,
      status: isFinal ? "final_approved" : "in_progress",
      decisions: Object.freeze([...c.decisions, decision]),
      ...(isFinal && { finalized_at: decision.decided_at }),
    });
    this.chains.set(c.id, updated);
    return updated;
  }

  /** Reject the next pending step — chain transitions to `rejected` immediately. */
  rejectStep(args: {
    chain_id: string;
    rejecter_employee_id: string;
    rationale: string;
  }): ApprovalChain {
    const c = this.requireChain(args.chain_id);
    if (c.status !== "pending" && c.status !== "in_progress") {
      throw new Error(
        `ApprovalChainEngine.rejectStep: chain '${c.id}' is '${c.status}' — cannot mutate`,
      );
    }
    if (!args.rationale || args.rationale.trim().length === 0) {
      throw new Error("ApprovalChainEngine.rejectStep: non-empty rationale required");
    }
    if (args.rejecter_employee_id === c.requester_employee_id) {
      throw new Error(
        "ApprovalChainEngine.rejectStep: requester cannot reject their own chain (SoD)",
      );
    }
    const nextStep = c.steps.find((s) => s.step === c.next_step_index);
    if (!nextStep) {
      throw new Error(
        `ApprovalChainEngine.rejectStep: chain '${c.id}' has no step ${c.next_step_index}`,
      );
    }
    // Same rank check as approve — only approver-qualified reviewers can reject
    const rejecter = managerRegistryEngine.getEmployee(args.rejecter_employee_id);
    const rejecterRankIdx = managerRegistryEngine.rankIndex(rejecter.rank);
    const requiredIdx = managerRegistryEngine.rankIndex(nextStep.required_rank_min);
    if (rejecterRankIdx < requiredIdx) {
      throw new Error(
        `ApprovalChainEngine.rejectStep: rejecter rank '${rejecter.rank}' below step ${nextStep.step} required '${nextStep.required_rank_min}'`,
      );
    }

    const decision: ChainStepDecision = Object.freeze({
      step: nextStep.step,
      decided_at: new Date().toISOString(),
      decided_by_employee_id: args.rejecter_employee_id,
      decision: "rejected",
      rationale: args.rationale,
    });
    const updated: ApprovalChain = Object.freeze({
      ...c,
      status: "rejected" as const,
      decisions: Object.freeze([...c.decisions, decision]),
      finalized_at: decision.decided_at,
    });
    this.chains.set(c.id, updated);
    return updated;
  }

  /** Requester withdraws their own chain — only allowed in pending/in_progress. */
  withdraw(args: {
    chain_id: string;
    by_employee_id: string;
    reason?: string;
  }): ApprovalChain {
    const c = this.requireChain(args.chain_id);
    if (c.status !== "pending" && c.status !== "in_progress") {
      throw new Error(
        `ApprovalChainEngine.withdraw: chain '${c.id}' is '${c.status}' — cannot withdraw`,
      );
    }
    if (args.by_employee_id !== c.requester_employee_id) {
      throw new Error(
        `ApprovalChainEngine.withdraw: only original requester '${c.requester_employee_id}' can withdraw`,
      );
    }
    const updated: ApprovalChain = Object.freeze({
      ...c,
      status: "withdrawn" as const,
      withdrawn_at: new Date().toISOString(),
    });
    this.chains.set(c.id, updated);
    return updated;
  }

  getChain(chain_id: string): ApprovalChain {
    return Object.freeze({ ...this.requireChain(chain_id) });
  }

  listChains(args: {
    requester_employee_id?: string;
    status?: ChainStatus;
    subject_kind?: string;
  } = {}): ReadonlyArray<ApprovalChain> {
    const out: ApprovalChain[] = [];
    for (const c of this.chains.values()) {
      if (args.requester_employee_id && c.requester_employee_id !== args.requester_employee_id) continue;
      if (args.status && c.status !== args.status) continue;
      if (args.subject_kind && c.subject_kind !== args.subject_kind) continue;
      out.push(Object.freeze({ ...c }));
    }
    return Object.freeze(out);
  }

  systemVizRoost(): SystemVizRoost {
    return Object.freeze({
      engine_name: "ApprovalChainEngine",
      layer: 7,
      node_type: "hub",
      psn_legs: Object.freeze([7, 11]),
      edges_out: Object.freeze(["ManagerRegistryEngine"]),
      edges_in: Object.freeze([
        "AIProposalApprovalQueueEngine",
        "EmployeeExpenseReimbursementEngine",
        "PurchaseOrderEngine",
        "LedgerStoreEngine",
      ]),
    });
  }

  private requireChain(id: string): ApprovalChain {
    const c = this.chains.get(id);
    if (!c) {
      throw new Error(`ApprovalChainEngine: unknown chain_id '${id}'`);
    }
    return c;
  }

  reset(): void {
    this.chains.clear();
    this.nextId = 1;
  }
}

export const approvalChainEngine = new ApprovalChainEngine();
