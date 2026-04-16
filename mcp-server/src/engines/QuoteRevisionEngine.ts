/**
 * QuoteRevisionEngine — Quote revision tracking, status lifecycle, and share tokens
 *
 * Manages the full quote lifecycle: draft → sent → viewed → accepted/rejected/expired.
 * Each revision is a frozen snapshot of pricing, qty breaks, and DFM analysis.
 * Share tokens enable customer portal access without authentication.
 *
 * Actions (6):
 *   quote_revise, quote_get_history, quote_compare_revisions,
 *   quote_status_change, quote_generate_share_token, quote_get_by_token
 *
 * Schema: 003-quote-revisions.sql (quote_revisions, quote_status_history, quote_share_tokens)
 *
 * @module engines/QuoteRevisionEngine
 * @version 1.0.0
 */

import * as crypto from "crypto";
import { log } from "../utils/Logger.js";

// ============================================================================
// Types
// ============================================================================

export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired" | "revised";

/** Valid status transitions (from → allowed targets) */
const STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["sent", "revised"],
  sent: ["viewed", "expired", "revised"],
  viewed: ["accepted", "rejected", "expired", "revised"],
  accepted: [],  // terminal
  rejected: ["revised"],  // can revise after rejection
  expired: ["revised"],   // can revise after expiry
  revised: ["draft"],     // revised quotes start as draft
};

export interface QuoteRevision {
  id: string;
  quote_id: string;
  revision_number: number;
  unit_price_usd: number;
  total_price_usd: number;
  quantity: number;
  ci95_low_usd?: number;
  ci95_high_usd?: number;
  confidence_pct?: number;
  cost_breakdown: Record<string, unknown>;
  quantity_breaks: Array<{ quantity: number; unit_price: number; total_price: number }>;
  lead_time_options: Array<{ tier: string; days: number; unit_price: number }>;
  dfm_score?: number;
  dfm_issues: Array<{ severity: string; message: string }>;
  change_summary?: string;
  revised_by?: string;
  created_at: string;
}

export interface StatusChange {
  id: string;
  quote_id: string;
  from_status: QuoteStatus;
  to_status: QuoteStatus;
  changed_by?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ShareToken {
  id: string;
  quote_id: string;
  token: string;
  expires_at: string;
  revoked: boolean;
  created_by?: string;
  accessed_at?: string;
  access_count: number;
  created_at: string;
}

export interface RevisionInput {
  quote_id: string;
  unit_price_usd: number;
  total_price_usd: number;
  quantity: number;
  ci95_low_usd?: number;
  ci95_high_usd?: number;
  confidence_pct?: number;
  cost_breakdown?: Record<string, unknown>;
  quantity_breaks?: Array<{ quantity: number; unit_price: number; total_price: number }>;
  lead_time_options?: Array<{ tier: string; days: number; unit_price: number }>;
  dfm_score?: number;
  dfm_issues?: Array<{ severity: string; message: string }>;
  change_summary?: string;
  revised_by?: string;
}

export interface RevisionComparison {
  quote_id: string;
  revision_a: number;
  revision_b: number;
  price_delta_usd: number;
  price_delta_pct: number;
  quantity_changed: boolean;
  confidence_delta?: number;
  dfm_score_delta?: number;
  new_issues: Array<{ severity: string; message: string }>;
  resolved_issues: Array<{ severity: string; message: string }>;
  summary: string;
}

// ============================================================================
// In-memory store (production uses PostgreSQL via 003-quote-revisions.sql)
// ============================================================================

interface QuoteState {
  current_status: QuoteStatus;
  current_revision: number;
}

// ============================================================================
// Engine
// ============================================================================

class QuoteRevisionEngine {
  private revisions = new Map<string, QuoteRevision[]>(); // quote_id → revisions
  private statusHistory = new Map<string, StatusChange[]>(); // quote_id → changes
  private shareTokens = new Map<string, ShareToken>(); // token → ShareToken
  private quoteStates = new Map<string, QuoteState>(); // quote_id → state

  /**
   * Create a new revision of a quote.
   * Automatically increments revision number and transitions status to 'revised' if needed.
   */
  revise(input: RevisionInput): QuoteRevision {
    if (input.unit_price_usd < 0) throw new Error("unit_price_usd must be >= 0");
    if (input.total_price_usd < 0) throw new Error("total_price_usd must be >= 0");
    if (input.quantity <= 0) throw new Error("quantity must be > 0");

    const existing = this.revisions.get(input.quote_id) ?? [];
    const nextRevision = existing.length + 1;

    // If this is a re-revision (not first), change status to 'revised'
    const state = this.quoteStates.get(input.quote_id);
    if (state && nextRevision > 1) {
      const allowed = STATUS_TRANSITIONS[state.current_status];
      if (allowed.includes("revised")) {
        this.changeStatusInternal(input.quote_id, "revised", input.revised_by, "New revision created");
      }
    }

    const revision: QuoteRevision = {
      id: crypto.randomUUID(),
      quote_id: input.quote_id,
      revision_number: nextRevision,
      unit_price_usd: input.unit_price_usd,
      total_price_usd: input.total_price_usd,
      quantity: input.quantity,
      ci95_low_usd: input.ci95_low_usd,
      ci95_high_usd: input.ci95_high_usd,
      confidence_pct: input.confidence_pct,
      cost_breakdown: input.cost_breakdown ?? {},
      quantity_breaks: input.quantity_breaks ?? [],
      lead_time_options: input.lead_time_options ?? [],
      dfm_score: input.dfm_score,
      dfm_issues: input.dfm_issues ?? [],
      change_summary: input.change_summary ?? (nextRevision === 1 ? "Initial quote" : undefined),
      revised_by: input.revised_by,
      created_at: new Date().toISOString(),
    };

    existing.push(revision);
    this.revisions.set(input.quote_id, existing);

    // Initialize or update quote state — new revisions always start as draft
    this.quoteStates.set(input.quote_id, {
      current_status: "draft",
      current_revision: nextRevision,
    });

    log.info(`Quote ${input.quote_id} revision ${nextRevision} created`);
    return revision;
  }

  /**
   * Get full revision history for a quote, newest first.
   */
  getHistory(quoteId: string): {
    quote_id: string;
    current_status: QuoteStatus;
    current_revision: number;
    revisions: QuoteRevision[];
    status_history: StatusChange[];
  } {
    const revisions = [...(this.revisions.get(quoteId) ?? [])].sort(
      (a, b) => b.revision_number - a.revision_number,
    );
    const statusHistory = [...(this.statusHistory.get(quoteId) ?? [])].sort(
      (a, b) => b.created_at.localeCompare(a.created_at),
    );
    const state = this.quoteStates.get(quoteId) ?? { current_status: "draft" as QuoteStatus, current_revision: 0 };

    return {
      quote_id: quoteId,
      current_status: state.current_status,
      current_revision: state.current_revision,
      revisions,
      status_history: statusHistory,
    };
  }

  /**
   * Compare two revisions side-by-side.
   */
  compareRevisions(quoteId: string, revA: number, revB: number): RevisionComparison {
    const revisions = this.revisions.get(quoteId) ?? [];
    const a = revisions.find(r => r.revision_number === revA);
    const b = revisions.find(r => r.revision_number === revB);

    if (!a) throw new Error(`Revision ${revA} not found for quote ${quoteId}`);
    if (!b) throw new Error(`Revision ${revB} not found for quote ${quoteId}`);

    const priceDelta = b.unit_price_usd - a.unit_price_usd;
    const priceDeltaPct = a.unit_price_usd > 0
      ? Math.round((priceDelta / a.unit_price_usd) * 1000) / 10
      : 0;

    // Find new and resolved DFM issues
    const aIssueMessages = new Set(a.dfm_issues.map(i => i.message));
    const bIssueMessages = new Set(b.dfm_issues.map(i => i.message));
    const newIssues = b.dfm_issues.filter(i => !aIssueMessages.has(i.message));
    const resolvedIssues = a.dfm_issues.filter(i => !bIssueMessages.has(i.message));

    const parts: string[] = [];
    if (priceDelta !== 0) {
      parts.push(`Price ${priceDelta > 0 ? "increased" : "decreased"} by $${Math.abs(priceDelta).toFixed(2)} (${priceDeltaPct > 0 ? "+" : ""}${priceDeltaPct}%)`);
    }
    if (a.quantity !== b.quantity) {
      parts.push(`Quantity changed from ${a.quantity} to ${b.quantity}`);
    }
    if (newIssues.length > 0) {
      parts.push(`${newIssues.length} new DFM issue(s)`);
    }
    if (resolvedIssues.length > 0) {
      parts.push(`${resolvedIssues.length} DFM issue(s) resolved`);
    }
    if (parts.length === 0) parts.push("No significant changes");

    return {
      quote_id: quoteId,
      revision_a: revA,
      revision_b: revB,
      price_delta_usd: Math.round(priceDelta * 100) / 100,
      price_delta_pct: priceDeltaPct,
      quantity_changed: a.quantity !== b.quantity,
      confidence_delta: (b.confidence_pct ?? 0) - (a.confidence_pct ?? 0),
      dfm_score_delta: (b.dfm_score ?? 0) - (a.dfm_score ?? 0),
      new_issues: newIssues,
      resolved_issues: resolvedIssues,
      summary: parts.join(". "),
    };
  }

  /**
   * Change quote status with validation of allowed transitions.
   * Records full audit trail.
   */
  changeStatus(input: {
    quote_id: string;
    to_status: QuoteStatus;
    changed_by?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): StatusChange {
    const state = this.quoteStates.get(input.quote_id);
    if (!state) throw new Error(`Quote not found: ${input.quote_id}`);

    const fromStatus = state.current_status;
    const allowed = STATUS_TRANSITIONS[fromStatus];
    if (!allowed.includes(input.to_status)) {
      throw new Error(
        `Invalid status transition: ${fromStatus} → ${input.to_status}. ` +
        `Allowed: ${allowed.join(", ") || "none (terminal state)"}`,
      );
    }

    return this.changeStatusInternal(
      input.quote_id, input.to_status, input.changed_by, input.reason, input.metadata,
    );
  }

  /**
   * Generate a share token for customer portal access.
   * Default expiry: 30 days.
   */
  generateShareToken(input: {
    quote_id: string;
    expires_in_days?: number;
    created_by?: string;
  }): ShareToken {
    const state = this.quoteStates.get(input.quote_id);
    if (!state) throw new Error(`Quote not found: ${input.quote_id}`);

    const token = crypto.randomBytes(32).toString("base64url");
    const expiresInDays = input.expires_in_days ?? 30;
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();

    const shareToken: ShareToken = {
      id: crypto.randomUUID(),
      quote_id: input.quote_id,
      token,
      expires_at: expiresAt,
      revoked: false,
      created_by: input.created_by,
      access_count: 0,
      created_at: new Date().toISOString(),
    };

    this.shareTokens.set(token, shareToken);
    log.info(`Share token generated for quote ${input.quote_id}, expires ${expiresAt}`);
    return shareToken;
  }

  /**
   * Look up a quote by share token. Returns the latest revision if valid.
   * Increments access count and records access time.
   * Automatically transitions status to 'viewed' if currently 'sent'.
   */
  getByToken(token: string): {
    revision: QuoteRevision;
    status: QuoteStatus;
    quote_id: string;
  } | null {
    const shareToken = this.shareTokens.get(token);
    if (!shareToken || shareToken.revoked) return null;

    // Check expiry
    if (new Date(shareToken.expires_at) < new Date()) {
      return null;
    }

    // Update access stats
    shareToken.accessed_at = new Date().toISOString();
    shareToken.access_count++;

    const state = this.quoteStates.get(shareToken.quote_id);
    if (!state) return null;

    // Auto-transition to 'viewed' if currently 'sent'
    if (state.current_status === "sent") {
      this.changeStatusInternal(shareToken.quote_id, "viewed", undefined, "Customer accessed via share link");
    }

    const revisions = this.revisions.get(shareToken.quote_id) ?? [];
    const latest = revisions.reduce((max, r) =>
      r.revision_number > max.revision_number ? r : max, revisions[0],
    );

    if (!latest) return null;

    return {
      revision: latest,
      status: this.quoteStates.get(shareToken.quote_id)!.current_status,
      quote_id: shareToken.quote_id,
    };
  }

  /**
   * Revoke a share token.
   */
  revokeToken(token: string): boolean {
    const shareToken = this.shareTokens.get(token);
    if (!shareToken) return false;
    shareToken.revoked = true;
    return true;
  }

  /**
   * Get a specific revision by number.
   */
  getRevision(quoteId: string, revisionNumber: number): QuoteRevision | null {
    const revisions = this.revisions.get(quoteId) ?? [];
    return revisions.find(r => r.revision_number === revisionNumber) ?? null;
  }

  /**
   * Get current state of a quote.
   */
  getState(quoteId: string): QuoteState | null {
    return this.quoteStates.get(quoteId) ?? null;
  }

  // ============================================================================
  // Private
  // ============================================================================

  private changeStatusInternal(
    quoteId: string,
    toStatus: QuoteStatus,
    changedBy?: string,
    reason?: string,
    metadata?: Record<string, unknown>,
  ): StatusChange {
    const state = this.quoteStates.get(quoteId);
    if (!state) throw new Error(`Quote not found: ${quoteId}`);

    const fromStatus = state.current_status;
    const change: StatusChange = {
      id: crypto.randomUUID(),
      quote_id: quoteId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: changedBy,
      reason,
      metadata,
      created_at: new Date().toISOString(),
    };

    const history = this.statusHistory.get(quoteId) ?? [];
    history.push(change);
    this.statusHistory.set(quoteId, history);

    state.current_status = toStatus;
    log.info(`Quote ${quoteId}: ${fromStatus} → ${toStatus}`);

    return change;
  }
}

export const quoteRevisionEngine = new QuoteRevisionEngine();
