/**
 * SelfModificationApprovalEngine — Require human approval for arch changes
 *
 * Phase 0.25.1 U-SAFE4 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Every
 * proposal produced by SelfModificationProposalEngine must obtain a signed
 * human approval (or be auto-approved only under the tightly-scoped
 * auto-approve list). Approvals are time-boxed and tied to a proposal hash
 * so they cannot be reused for a different change.
 *
 * Pure in-memory. Persistence to an approval ledger is caller-provided.
 *
 * @module engines/SelfModificationApprovalEngine
 * @milestone PP-0.25.1-U-SAFE4
 */

export interface ApprovalSubmission {
  proposalId: string;
  proposalHash: string;
  title: string;
  kind: string;
  submittedBy: string;
  submittedAt?: string;
}

export interface ApprovalRecord {
  proposalId: string;
  proposalHash: string;
  status: "pending" | "approved" | "rejected" | "expired";
  submittedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
  expiresAt: string;
  autoApproved: boolean;
}

export interface ApprovalConfig {
  ttlMinutes: number;
  autoApproveKinds: string[];
}

export const DEFAULT_APPROVAL_CONFIG: ApprovalConfig = Object.freeze({
  ttlMinutes: 60,
  autoApproveKinds: [], // deliberately empty — all proposals need human OK
});

export class SelfModificationApprovalEngine {
  private readonly records = new Map<string, ApprovalRecord>();
  private config: ApprovalConfig;

  constructor(config: ApprovalConfig = DEFAULT_APPROVAL_CONFIG) {
    this.validateConfig(config);
    this.config = {
      ...config,
      autoApproveKinds: config.autoApproveKinds.map((k) => k.toLowerCase()),
    };
  }

  setConfig(config: ApprovalConfig): void {
    this.validateConfig(config);
    this.config = {
      ...config,
      autoApproveKinds: config.autoApproveKinds.map((k) => k.toLowerCase()),
    };
  }

  submit(submission: ApprovalSubmission, nowMs?: number): ApprovalRecord {
    this.validateSubmission(submission);
    const now = nowMs ?? Date.now();
    const submittedAt = submission.submittedAt ?? new Date(now).toISOString();
    const expiresAt = new Date(now + this.config.ttlMinutes * 60 * 1000).toISOString();
    const autoApproved = this.config.autoApproveKinds.includes(submission.kind.toLowerCase());

    const existing = this.records.get(submission.proposalId);
    if (existing && existing.proposalHash !== submission.proposalHash) {
      throw new Error(
        `proposalId '${submission.proposalId}' already registered with different hash`
      );
    }

    const record: ApprovalRecord = existing ?? {
      proposalId: submission.proposalId,
      proposalHash: submission.proposalHash,
      status: autoApproved ? "approved" : "pending",
      submittedAt,
      expiresAt,
      autoApproved,
      decidedAt: autoApproved ? submittedAt : undefined,
      decidedBy: autoApproved ? "auto-approve" : undefined,
    };
    this.records.set(submission.proposalId, record);
    return { ...record };
  }

  approve(proposalId: string, proposalHash: string, by: string, at?: string): ApprovalRecord {
    const r = this.records.get(proposalId);
    if (!r) throw new Error(`no pending submission for ${proposalId}`);
    if (r.proposalHash !== proposalHash) {
      throw new Error("proposalHash mismatch — approval cannot be reused for a different change");
    }
    if (r.status !== "pending") {
      throw new Error(`proposal ${proposalId} is ${r.status}, not pending`);
    }
    r.status = "approved";
    r.decidedAt = at ?? new Date().toISOString();
    r.decidedBy = by;
    return { ...r };
  }

  reject(proposalId: string, proposalHash: string, by: string, reason: string, at?: string): ApprovalRecord {
    const r = this.records.get(proposalId);
    if (!r) throw new Error(`no pending submission for ${proposalId}`);
    if (r.proposalHash !== proposalHash) {
      throw new Error("proposalHash mismatch");
    }
    if (r.status !== "pending") {
      throw new Error(`proposal ${proposalId} is ${r.status}, not pending`);
    }
    r.status = "rejected";
    r.decidedAt = at ?? new Date().toISOString();
    r.decidedBy = by;
    r.reason = reason;
    return { ...r };
  }

  /** Sweep expired pending records; returns the number transitioned to expired. */
  sweep(nowMs?: number): number {
    const now = nowMs ?? Date.now();
    let n = 0;
    for (const r of this.records.values()) {
      if (r.status !== "pending") continue;
      if (Date.parse(r.expiresAt) < now) {
        r.status = "expired";
        r.decidedAt = new Date(now).toISOString();
        n += 1;
      }
    }
    return n;
  }

  /**
   * Returns true only if there is a fresh, approved record whose hash matches
   * the supplied hash. Expired / rejected / different-hash records fail.
   */
  isApproved(proposalId: string, proposalHash: string, nowMs?: number): boolean {
    const r = this.records.get(proposalId);
    if (!r) return false;
    if (r.proposalHash !== proposalHash) return false;
    if (r.status !== "approved") return false;
    const now = nowMs ?? Date.now();
    return Date.parse(r.expiresAt) >= now;
  }

  get(proposalId: string): ApprovalRecord | null {
    const r = this.records.get(proposalId);
    return r ? { ...r } : null;
  }

  listPending(): ApprovalRecord[] {
    return [...this.records.values()].filter((r) => r.status === "pending").map((r) => ({ ...r }));
  }

  size(): number {
    return this.records.size;
  }

  clear(): void {
    this.records.clear();
  }

  private validateSubmission(s: ApprovalSubmission): void {
    if (!s.proposalId || s.proposalId.trim() === "") throw new Error("proposalId required");
    if (!s.proposalHash || s.proposalHash.trim() === "") throw new Error("proposalHash required");
    if (!s.title || s.title.trim() === "") throw new Error("title required");
    if (!s.kind || s.kind.trim() === "") throw new Error("kind required");
    if (!s.submittedBy || s.submittedBy.trim() === "") throw new Error("submittedBy required");
  }

  private validateConfig(c: ApprovalConfig): void {
    if (!Number.isInteger(c.ttlMinutes) || c.ttlMinutes <= 0) {
      throw new Error("ttlMinutes must be positive integer");
    }
    if (!Array.isArray(c.autoApproveKinds)) throw new Error("autoApproveKinds must be array");
  }
}

export const selfModificationApprovalEngine = new SelfModificationApprovalEngine();
