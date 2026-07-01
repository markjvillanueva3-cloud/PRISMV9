/**
 * CustomerPortalEngine — Token-Based Customer Portal Access
 * ===========================================================
 *
 * Provides external customer access to quotes, orders, milestones, quality
 * documents, and messaging — all without requiring a PRISM account.
 *
 * Security model:
 * - Access via cryptographic tokens (base64url, 32 bytes)
 * - Tokens are scoped (view, respond, documents, messages)
 * - Time-limited (default 30 days, configurable)
 * - Rate-limited (10 req/min per token, configurable)
 * - Revocable at any time
 *
 * Actions:
 *   portal_create_token, portal_revoke_token, portal_list_tokens,
 *   portal_quote_view, portal_order_status, portal_quote_respond,
 *   portal_documents, portal_document_download, portal_messages,
 *   portal_send_message
 *
 * @version 1.0.0 — Session 6-9 U-PORTAL2
 * @see QuoteRevisionEngine — share tokens (portal extends this pattern)
 * @see MilestoneTrackingEngine — order milestone timelines
 * @see FileStorageEngine — file attachments for quality documents
 */

import * as crypto from "crypto";
import { log } from "../utils/Logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PortalTokenType = "quote" | "order";
export type PortalScope = "view" | "respond" | "documents" | "messages";
export type PortalMessageSender = "customer" | "shop";

export interface PortalToken {
  id: string;
  token: string;
  token_type: PortalTokenType;
  entity_id: string;
  customer_id?: string;
  scope: PortalScope[];
  expires_at: string;
  revoked: boolean;
  last_accessed?: string;
  access_count: number;
  rate_limit: number;
  created_by?: string;
  created_at: string;
}

export interface PortalMessage {
  id: string;
  entity_type: PortalTokenType;
  entity_id: string;
  sender_type: PortalMessageSender;
  sender_name: string;
  message: string;
  read_at?: string;
  created_at: string;
}

export interface QualityDocument {
  id: string;
  job_id: string;
  doc_type: "fai_as9102" | "material_cert" | "coc" | "inspection_report" | "ndt_report";
  file_id?: string;
  title: string;
  status: "draft" | "pending_review" | "approved" | "rejected";
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PortalQuoteView {
  quote_id: string;
  status: string;
  revision_number: number;
  unit_price_usd: number;
  total_price_usd: number;
  quantity: number;
  quantity_breaks: Array<{ quantity: number; unit_price: number; total_price: number }>;
  lead_time_options: Array<{ tier: string; days: number; unit_price: number }>;
  dfm_score?: number;
  dfm_issues: Array<{ severity: string; message: string }>;
  expires_at?: string;
}

export interface PortalOrderStatus {
  job_id: string;
  part_number: string;
  part_name?: string;
  quantity: number;
  status: string;
  milestones: Array<{
    key: string;
    label: string;
    status: string;
    completed_at?: string;
  }>;
  current_milestone: string | null;
  progress_pct: number;
  estimated_delivery?: string;
}

export interface PortalServiceCase {
  id: string;
  entity_type: PortalTokenType;
  entity_id: string;
  customer_id?: string;
  subject: string;
  summary: string;
  severity: "low" | "normal" | "high" | "critical";
  status: "open" | "waiting_on_shop" | "waiting_on_customer" | "escalated" | "resolved";
  owner?: string;
  sla_target_at: string;
  escalation_level: number;
  satisfaction_score?: number;
  opened_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface PortalTokenValidation {
  valid: boolean;
  reason?: string;
  token?: PortalToken;
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

interface RateBucket {
  count: number;
  window_start: number;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/** Fields that are NEVER exposed to portal (internal cost data). */
const INTERNAL_FIELDS = new Set([
  "cost_breakdown", "margin", "markup", "internal_cost", "raw_material_cost",
  "labor_cost", "overhead_cost", "profit_margin", "hourly_rate",
  "machine_cost_per_hour", "actual_cost", "estimated_cost",
  "internal_notes", "actual_margin", "actual_margin_pct", "estimated_margin_pct",
  "tooling_cost", "setup_cost", "fixture_cost", "secondary_ops_cost",
  "supplier_cost", "discount_reason", "bid_strategy",
]);

export class CustomerPortalEngine {
  private tokens = new Map<string, PortalToken>();       // token string → PortalToken
  private messages = new Map<string, PortalMessage[]>(); // entity_key → messages
  private qualityDocs = new Map<string, QualityDocument[]>(); // job_id → docs
  private serviceCases = new Map<string, PortalServiceCase[]>(); // entity_key → service cases
  private rateBuckets = new Map<string, RateBucket>();   // token → rate bucket

  // ─── Token Management ───────────────────────────────────────────────────

  /**
   * Create a portal access token for a customer.
   */
  createToken(input: {
    token_type: PortalTokenType;
    entity_id: string;
    customer_id?: string;
    scope?: PortalScope[];
    expires_in_days?: number;
    rate_limit?: number;
    created_by?: string;
  }): PortalToken {
    if (!input.entity_id) throw new Error("entity_id is required");

    const tokenStr = crypto.randomBytes(32).toString("base64url");
    const expiresInDays = input.expires_in_days ?? 30;
    if (expiresInDays < 1 || expiresInDays > 365) {
      throw new Error("expires_in_days must be between 1 and 365");
    }

    const rateLimit = input.rate_limit ?? 10;
    if (rateLimit < 1 || rateLimit > 100) {
      throw new Error("rate_limit must be between 1 and 100");
    }

    const portalToken: PortalToken = {
      id: crypto.randomUUID(),
      token: tokenStr,
      token_type: input.token_type,
      entity_id: input.entity_id,
      customer_id: input.customer_id,
      scope: input.scope ?? ["view"],
      expires_at: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
      revoked: false,
      access_count: 0,
      rate_limit: rateLimit,
      created_by: input.created_by,
      created_at: new Date().toISOString(),
    };

    this.tokens.set(tokenStr, portalToken);
    log.info(`[CustomerPortal] Token created for ${input.token_type}:${input.entity_id}`);
    return portalToken;
  }

  /**
   * Revoke a portal token (immediate access removal).
   */
  revokeToken(token: string): { revoked: boolean } {
    const pt = this.tokens.get(token);
    if (!pt) throw new Error("Token not found");
    pt.revoked = true;
    log.info(`[CustomerPortal] Token revoked for ${pt.token_type}:${pt.entity_id}`);
    return { revoked: true };
  }

  /**
   * List tokens for an entity (admin view).
   */
  listTokens(entityId: string): PortalToken[] {
    const result: PortalToken[] = [];
    for (const pt of this.tokens.values()) {
      if (pt.entity_id === entityId) {
        result.push(pt);
      }
    }
    return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  /**
   * Validate a token: check existence, expiry, revocation, and rate limit.
   * Updates access stats on successful validation.
   */
  validateToken(token: string, requiredScope?: PortalScope): PortalTokenValidation {
    const pt = this.tokens.get(token);
    if (!pt) return { valid: false, reason: "Token not found" };
    if (pt.revoked) return { valid: false, reason: "Token has been revoked" };
    if (new Date(pt.expires_at) < new Date()) return { valid: false, reason: "Token has expired" };

    // Check scope
    if (requiredScope && !pt.scope.includes(requiredScope)) {
      return { valid: false, reason: `Token does not have '${requiredScope}' scope` };
    }

    // Rate limiting (sliding window per minute)
    const now = Date.now();
    const bucket = this.rateBuckets.get(token);
    if (bucket) {
      const windowMs = 60000; // 1 minute
      if (now - bucket.window_start < windowMs) {
        if (bucket.count >= pt.rate_limit) {
          return { valid: false, reason: "Rate limit exceeded. Try again in 1 minute." };
        }
        bucket.count++;
      } else {
        bucket.window_start = now;
        bucket.count = 1;
      }
    } else {
      this.rateBuckets.set(token, { count: 1, window_start: now });
    }

    // Update access stats
    pt.last_accessed = new Date().toISOString();
    pt.access_count++;

    return { valid: true, token: pt };
  }

  // ─── Portal Views (customer-facing, NO internal cost data) ────────────

  /**
   * Get a quote for portal display.
   * Strips all internal cost data — only shows customer-facing pricing.
   */
  getQuoteView(input: {
    quote_id: string;
    revision?: QuoteRevisionLike;
    status?: string;
  }): PortalQuoteView {
    const rev = input.revision;
    if (!rev) throw new Error("Quote revision data required");

    // Defense-in-depth: strip internal fields even though we manually construct output
    return CustomerPortalEngine.stripInternalFields({
      quote_id: input.quote_id,
      status: input.status ?? "sent",
      revision_number: rev.revision_number ?? 1,
      unit_price_usd: rev.unit_price_usd,
      total_price_usd: rev.total_price_usd,
      quantity: rev.quantity,
      quantity_breaks: rev.quantity_breaks ?? [],
      lead_time_options: rev.lead_time_options ?? [],
      dfm_score: rev.dfm_score,
      dfm_issues: (rev.dfm_issues ?? []).filter((i: any) => i.severity !== "internal"),
      expires_at: rev.expires_at,
    }) as PortalQuoteView;
  }

  /**
   * Process customer response to a quote (accept, reject, or request changes).
   */
  respondToQuote(input: {
    quote_id: string;
    response: "accept" | "reject" | "request_changes";
    customer_name: string;
    message?: string;
    requested_changes?: string[];
  }): { recorded: boolean; response: string; message_id?: string } {
    if (!["accept", "reject", "request_changes"].includes(input.response)) {
      throw new Error("Response must be 'accept', 'reject', or 'request_changes'");
    }

    // Record the response as a portal message
    let messageId: string | undefined;
    if (input.message || input.response === "request_changes") {
      const msgText = input.response === "request_changes"
        ? `Changes requested: ${(input.requested_changes ?? []).join("; ")}${input.message ? ` — ${input.message}` : ""}`
        : input.message ?? `Quote ${input.response}ed`;

      const msg = this.addMessage({
        entity_type: "quote",
        entity_id: input.quote_id,
        sender_type: "customer",
        sender_name: input.customer_name,
        message: msgText,
      });
      messageId = msg.id;
    }

    log.info(`[CustomerPortal] Quote ${input.quote_id} response: ${input.response}`);
    return { recorded: true, response: input.response, message_id: messageId };
  }

  /**
   * Get order status with milestone timeline for portal display.
   * Returns only customer-safe data.
   */
  getOrderStatus(input: {
    job_id: string;
    job?: JobLike;
    timeline?: TimelineLike;
  }): PortalOrderStatus {
    const job = input.job;
    const timeline = input.timeline;

    // Defense-in-depth: strip internal fields even though we manually construct output
    return CustomerPortalEngine.stripInternalFields({
      job_id: input.job_id,
      part_number: job?.part_number ?? "N/A",
      part_name: job?.part_name,
      quantity: job?.quantity ?? 0,
      status: job?.status ?? "unknown",
      milestones: timeline?.milestones?.map((m: any) => ({
        key: m.milestone_key,
        label: m.label,
        status: m.status,
        completed_at: m.completed_at,
      })) ?? [],
      current_milestone: timeline?.current_milestone ?? null,
      progress_pct: timeline?.progress_pct ?? 0,
      estimated_delivery: timeline?.estimated_delivery,
    }) as PortalOrderStatus;
  }

  // ─── Quality Documents ────────────────────────────────────────────────

  /**
   * Register a quality document (internal action).
   */
  addQualityDocument(input: {
    job_id: string;
    doc_type: QualityDocument["doc_type"];
    file_id?: string;
    title: string;
    status?: QualityDocument["status"];
    notes?: string;
  }): QualityDocument {
    if (!input.job_id) throw new Error("job_id is required");
    if (!input.title) throw new Error("title is required");

    const doc: QualityDocument = {
      id: crypto.randomUUID(),
      job_id: input.job_id,
      doc_type: input.doc_type,
      file_id: input.file_id,
      title: input.title,
      status: input.status ?? "draft",
      notes: input.notes,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const existing = this.qualityDocs.get(input.job_id) ?? [];
    existing.push(doc);
    this.qualityDocs.set(input.job_id, existing);

    log.info(`[CustomerPortal] Quality doc added: ${input.doc_type} for job ${input.job_id}`);
    return doc;
  }

  /**
   * Update quality document status (approve/reject review).
   */
  updateQualityDocument(input: {
    doc_id: string;
    job_id: string;
    status?: QualityDocument["status"];
    reviewed_by?: string;
    notes?: string;
  }): QualityDocument {
    const docs = this.qualityDocs.get(input.job_id);
    if (!docs) throw new Error(`No documents for job ${input.job_id}`);

    const doc = docs.find((d) => d.id === input.doc_id);
    if (!doc) throw new Error(`Document ${input.doc_id} not found`);

    if (input.status) {
      doc.status = input.status;
      if (input.status === "approved" || input.status === "rejected") {
        doc.reviewed_by = input.reviewed_by;
        doc.reviewed_at = new Date().toISOString();
      }
    }
    if (input.notes) doc.notes = input.notes;
    doc.updated_at = new Date().toISOString();

    return doc;
  }

  /**
   * List quality documents for a job (portal: only approved docs shown).
   */
  listQualityDocuments(jobId: string, portalMode = false): QualityDocument[] {
    const docs = this.qualityDocs.get(jobId) ?? [];
    if (portalMode) {
      return docs.filter((d) => d.status === "approved");
    }
    return [...docs];
  }

  /**
   * Get a specific quality document by ID.
   */
  getQualityDocument(jobId: string, docId: string): QualityDocument | null {
    const docs = this.qualityDocs.get(jobId) ?? [];
    return docs.find((d) => d.id === docId) ?? null;
  }

  // ─── Messages ─────────────────────────────────────────────────────────

  /**
   * Add a message to a portal conversation thread.
   */
  addMessage(input: {
    entity_type: PortalTokenType;
    entity_id: string;
    sender_type: PortalMessageSender;
    sender_name: string;
    message: string;
  }): PortalMessage {
    if (!input.message.trim()) throw new Error("Message cannot be empty");
    if (input.message.length > 5000) throw new Error("Message exceeds 5000 character limit");

    const msg: PortalMessage = {
      id: crypto.randomUUID(),
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      sender_type: input.sender_type,
      sender_name: input.sender_name,
      message: input.message.trim(),
      created_at: new Date().toISOString(),
    };

    const key = `${input.entity_type}:${input.entity_id}`;
    const existing = this.messages.get(key) ?? [];
    existing.push(msg);
    this.messages.set(key, existing);

    // Bound message threads to 500
    if (existing.length > 500) {
      this.messages.set(key, existing.slice(-500));
    }

    return msg;
  }

  /**
   * List messages for a portal entity, newest first.
   */
  listMessages(entityType: PortalTokenType, entityId: string, limit = 50): PortalMessage[] {
    const key = `${entityType}:${entityId}`;
    const msgs = this.messages.get(key) ?? [];
    return [...msgs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  }

  /**
   * Mark messages as read (shop reads customer messages).
   */
  markMessagesRead(entityType: PortalTokenType, entityId: string, senderType: PortalMessageSender): number {
    const key = `${entityType}:${entityId}`;
    const msgs = this.messages.get(key) ?? [];
    let count = 0;
    const now = new Date().toISOString();
    for (const msg of msgs) {
      if (msg.sender_type === senderType && !msg.read_at) {
        msg.read_at = now;
        count++;
      }
    }
    return count;
  }

  // ─── Service Cases ────────────────────────────────────────────────────

  /**
   * Create a customer service case tied to a portal entity.
   */
  createServiceCase(input: {
    entity_type: PortalTokenType;
    entity_id: string;
    customer_id?: string;
    subject: string;
    summary: string;
    severity?: PortalServiceCase["severity"];
    owner?: string;
    sla_hours?: number;
  }): PortalServiceCase {
    if (!input.entity_id) throw new Error("entity_id is required");
    if (!input.subject?.trim()) throw new Error("subject is required");
    if (!input.summary?.trim()) throw new Error("summary is required");

    const severity = input.severity ?? "normal";
    const slaHours = input.sla_hours ?? CustomerPortalEngine.defaultSlaHoursForSeverity(severity);
    if (slaHours < 1 || slaHours > 720) {
      throw new Error("sla_hours must be between 1 and 720");
    }

    const now = new Date();
    const entityKey = CustomerPortalEngine.buildEntityKey(input.entity_type, input.entity_id);
    const serviceCase: PortalServiceCase = {
      id: crypto.randomUUID(),
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      customer_id: input.customer_id,
      subject: input.subject.trim(),
      summary: input.summary.trim(),
      severity,
      status: "waiting_on_shop",
      owner: input.owner?.trim() || undefined,
      sla_target_at: new Date(now.getTime() + slaHours * 3600000).toISOString(),
      escalation_level: 0,
      opened_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const existing = this.serviceCases.get(entityKey) ?? [];
    existing.push(serviceCase);
    this.serviceCases.set(entityKey, existing);

    log.info(`[CustomerPortal] Service case created for ${input.entity_type}:${input.entity_id}`);
    return serviceCase;
  }

  /**
   * List service cases for a portal entity.
   */
  listServiceCases(entityType: PortalTokenType, entityId: string): PortalServiceCase[] {
    const entityKey = CustomerPortalEngine.buildEntityKey(entityType, entityId);
    const cases = this.serviceCases.get(entityKey) ?? [];
    return [...cases].sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }

  /**
   * Update a service case with ownership, status, escalation, or satisfaction.
   */
  updateServiceCase(input: {
    case_id: string;
    status?: PortalServiceCase["status"];
    owner?: string;
    escalate?: boolean;
    satisfaction_score?: number;
  }): PortalServiceCase {
    const serviceCase = this.findServiceCase(input.case_id);
    if (!serviceCase) throw new Error(`Service case ${input.case_id} not found`);

    if (input.owner !== undefined) {
      serviceCase.owner = input.owner.trim() || undefined;
    }

    if (input.escalate) {
      serviceCase.escalation_level += 1;
      if (serviceCase.status !== "resolved") {
        serviceCase.status = "escalated";
      }
    }

    if (input.status) {
      serviceCase.status = input.status;
      if (input.status === "resolved") {
        serviceCase.resolved_at = new Date().toISOString();
      } else {
        serviceCase.resolved_at = undefined;
      }
    }

    if (input.satisfaction_score !== undefined) {
      if (input.satisfaction_score < 1 || input.satisfaction_score > 5) {
        throw new Error("satisfaction_score must be between 1 and 5");
      }
      serviceCase.satisfaction_score = input.satisfaction_score;
    }

    serviceCase.updated_at = new Date().toISOString();
    return serviceCase;
  }

  // ─── Utility ──────────────────────────────────────────────────────────

  /**
   * Strip internal cost fields from any object (safety filter).
   */
  static stripInternalFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!INTERNAL_FIELDS.has(key)) {
        result[key] = value;
      }
    }
    return result as Partial<T>;
  }

  static buildEntityKey(entityType: PortalTokenType, entityId: string) {
    return `${entityType}:${entityId}`;
  }

  static defaultSlaHoursForSeverity(severity: PortalServiceCase["severity"]) {
    switch (severity) {
      case "low":
        return 72;
      case "high":
        return 24;
      case "critical":
        return 8;
      case "normal":
      default:
        return 48;
    }
  }

  private findServiceCase(caseId: string): PortalServiceCase | null {
    for (const cases of this.serviceCases.values()) {
      const serviceCase = cases.find((entry) => entry.id === caseId);
      if (serviceCase) {
        return serviceCase;
      }
    }

    return null;
  }
}

// ─── Loose types for cross-engine data passing ────────────────────────────────

interface QuoteRevisionLike {
  revision_number?: number;
  unit_price_usd: number;
  total_price_usd: number;
  quantity: number;
  quantity_breaks?: Array<{ quantity: number; unit_price: number; total_price: number }>;
  lead_time_options?: Array<{ tier: string; days: number; unit_price: number }>;
  dfm_score?: number;
  dfm_issues?: Array<{ severity: string; message: string }>;
  expires_at?: string;
}

interface JobLike {
  part_number?: string;
  part_name?: string;
  quantity?: number;
  status?: string;
}

interface TimelineLike {
  milestones?: Array<{
    milestone_key: string;
    label: string;
    status: string;
    completed_at?: string;
  }>;
  current_milestone?: string | null;
  progress_pct?: number;
  estimated_delivery?: string;
}

export const customerPortalEngine = new CustomerPortalEngine();
