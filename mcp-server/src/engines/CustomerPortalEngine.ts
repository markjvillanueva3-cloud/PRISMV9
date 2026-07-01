/**
 * CustomerPortalEngine -- Token-Based Customer Portal Access (durable)
 * ====================================================================
 *
 * Provides external customer access to quotes, orders, milestones, quality
 * documents, and messaging -- all without requiring a PRISM account.
 *
 * Security model:
 * - Access via cryptographic tokens (base64url, 32 bytes)
 * - Tokens are scoped (view, respond, documents, messages)
 * - Time-limited (default 30 days, configurable)
 * - Rate-limited (10 req/min per token, configurable)
 * - Revocable at any time
 *
 * PERSISTENCE (U-HOTEL-PORTAL-PERSISTENCE, 2026-06-09 slot:hotel)
 *   The four durable record types -- tokens, messages, quality documents, and
 *   service cases -- are persisted in a SQLite database in WAL mode, modeled on
 *   juliett's CoordinationStoreEngine pattern (lazy ensureOpen, prepared
 *   statements, synchronous=NORMAL, busy_timeout, schema_version in meta).
 *   Previously every record lived only in process-memory Maps and was lost on
 *   every MCP-server restart -- a customer's portal token, message thread,
 *   quality docs, and open service cases evaporated on each redeploy. They now
 *   survive restart.
 *
 *   rateBuckets stays an in-memory Map ON PURPOSE: a per-minute sliding rate
 *   window is transient by definition and SHOULD reset when the process
 *   restarts. Persisting it would be a correctness bug, not a feature.
 *
 *   Tests construct `new CustomerPortalEngine({ dbPath: ":memory:" })` (or a
 *   temp file for kill-restart-readback E2E). The exported singleton uses a
 *   durable file path in production and ":memory:" under vitest so the existing
 *   singleton-based suites stay hermetic with no changes.
 *
 * Actions:
 *   portal_create_token, portal_revoke_token, portal_list_tokens,
 *   portal_quote_view, portal_order_status, portal_quote_respond,
 *   portal_documents, portal_document_download, portal_messages,
 *   portal_send_message
 *
 * @version 2.0.0 -- Session hotel U-HOTEL-PORTAL-PERSISTENCE (SQLite WAL backing)
 * @see CoordinationStoreEngine -- the SQLite WAL store pattern this mirrors
 * @see QuoteRevisionEngine -- share tokens (portal extends this pattern)
 * @see MilestoneTrackingEngine -- order milestone timelines
 * @see FileStorageEngine -- file attachments for quality documents
 */

import * as crypto from "crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import Database, { type Database as DatabaseType, type Statement } from "better-sqlite3";
import { log } from "../utils/Logger.js";

// --- Types ------------------------------------------------------------------

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

// --- Rate Limiter (transient) -----------------------------------------------

interface RateBucket {
  count: number;
  window_start: number;
}

// --- Persistence config -----------------------------------------------------

const HARNESS_ROOT = "H:/prism";
const SCHEMA_VERSION = 1;
const BUSY_TIMEOUT_MS = 5_000;        // below the 30s Stop budget; well above disk hiccups
const RATE_WINDOW_MS = 60_000;        // per-token sliding rate window (1 minute)
const MAX_MESSAGE_LEN = 5_000;        // single message length cap
const MESSAGE_THREAD_CAP = 500;       // newest-N messages retained per entity thread
const DEFAULT_MESSAGE_LIMIT = 50;     // listMessages default page size

/**
 * Resolve the database path for the production singleton.
 * - PRISM_PORTAL_DB_PATH override wins (ops / multi-host).
 * - Under vitest (or NODE_ENV=test) default to ":memory:" so the existing
 *   singleton-based suites stay hermetic and never write a real db file.
 * - Otherwise the durable shared path, sibling to coordination.db.
 */
function defaultPortalDbPath(): string {
  const override = process.env.PRISM_PORTAL_DB_PATH;
  if (typeof override === "string" && override.length > 0) return override;
  if (process.env.VITEST || process.env.NODE_ENV === "test") return ":memory:";
  return path.join(HARNESS_ROOT, "state/shared/customer-portal.db");
}

/** better-sqlite3 throws on an `undefined` bind value; coerce to null. */
function nz<T>(v: T | undefined | null): T | null {
  return v === undefined || v === null ? null : v;
}

export interface CustomerPortalEngineOptions {
  /** SQLite path; ":memory:" for hermetic tests, a temp file for restart E2E. */
  dbPath?: string;
}

// --- DDL (one statement each: prepared+run, not a multi-statement batch) -----

const PORTAL_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS portal_tokens (
     token         TEXT PRIMARY KEY,
     id            TEXT NOT NULL,
     token_type    TEXT NOT NULL,
     entity_id     TEXT NOT NULL,
     customer_id   TEXT,
     scope_json    TEXT NOT NULL DEFAULT '["view"]',
     expires_at    TEXT NOT NULL,
     revoked       INTEGER NOT NULL DEFAULT 0,
     last_accessed TEXT,
     access_count  INTEGER NOT NULL DEFAULT 0,
     rate_limit    INTEGER NOT NULL DEFAULT 10,
     created_by    TEXT,
     created_at    TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_portal_tokens_entity ON portal_tokens(entity_id)`,
  `CREATE TABLE IF NOT EXISTS portal_messages (
     id          TEXT PRIMARY KEY,
     entity_type TEXT NOT NULL,
     entity_id   TEXT NOT NULL,
     sender_type TEXT NOT NULL,
     sender_name TEXT NOT NULL,
     message     TEXT NOT NULL,
     read_at     TEXT,
     created_at  TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_portal_messages_entity ON portal_messages(entity_type, entity_id)`,
  `CREATE TABLE IF NOT EXISTS portal_quality_docs (
     id            TEXT PRIMARY KEY,
     job_id        TEXT NOT NULL,
     doc_type      TEXT NOT NULL,
     file_id       TEXT,
     title         TEXT NOT NULL,
     status        TEXT NOT NULL,
     reviewed_by   TEXT,
     reviewed_at   TEXT,
     notes         TEXT,
     metadata_json TEXT NOT NULL DEFAULT '{}',
     created_at    TEXT NOT NULL,
     updated_at    TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_portal_docs_job ON portal_quality_docs(job_id)`,
  `CREATE TABLE IF NOT EXISTS portal_service_cases (
     id                 TEXT PRIMARY KEY,
     entity_type        TEXT NOT NULL,
     entity_id          TEXT NOT NULL,
     customer_id        TEXT,
     subject            TEXT NOT NULL,
     summary            TEXT NOT NULL,
     severity           TEXT NOT NULL,
     status             TEXT NOT NULL,
     owner              TEXT,
     sla_target_at      TEXT NOT NULL,
     escalation_level   INTEGER NOT NULL DEFAULT 0,
     satisfaction_score INTEGER,
     opened_at          TEXT NOT NULL,
     updated_at         TEXT NOT NULL,
     resolved_at        TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS idx_portal_cases_entity ON portal_service_cases(entity_type, entity_id)`,
  `CREATE TABLE IF NOT EXISTS meta (
     key   TEXT PRIMARY KEY,
     value TEXT NOT NULL
   )`,
];

// --- Internal row shapes (DB <-> domain object mapping) ---------------------

interface TokenRow {
  token: string;
  id: string;
  token_type: string;
  entity_id: string;
  customer_id: string | null;
  scope_json: string;
  expires_at: string;
  revoked: number;
  last_accessed: string | null;
  access_count: number;
  rate_limit: number;
  created_by: string | null;
  created_at: string;
}

interface MessageRow {
  id: string;
  entity_type: string;
  entity_id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

interface DocRow {
  id: string;
  job_id: string;
  doc_type: string;
  file_id: string | null;
  title: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

interface CaseRow {
  id: string;
  entity_type: string;
  entity_id: string;
  customer_id: string | null;
  subject: string;
  summary: string;
  severity: string;
  status: string;
  owner: string | null;
  sla_target_at: string;
  escalation_level: number;
  satisfaction_score: number | null;
  opened_at: string;
  updated_at: string;
  resolved_at: string | null;
}

// --- Fields NEVER exposed to portal (internal cost data) --------------------

const INTERNAL_FIELDS = new Set([
  "cost_breakdown", "margin", "markup", "internal_cost", "raw_material_cost",
  "labor_cost", "overhead_cost", "profit_margin", "hourly_rate",
  "machine_cost_per_hour", "actual_cost", "estimated_cost",
  "internal_notes", "actual_margin", "actual_margin_pct", "estimated_margin_pct",
  "tooling_cost", "setup_cost", "fixture_cost", "secondary_ops_cost",
  "supplier_cost", "discount_reason", "bid_strategy",
]);

export class CustomerPortalEngine {
  private readonly dbPath: string;
  private db: DatabaseType | null = null;
  private stmts: {
    insertToken: Statement;
    findToken: Statement;
    revokeToken: Statement;
    listTokensByEntity: Statement;
    updateTokenAccess: Statement;
    insertMessage: Statement;
    trimMessages: Statement;
    listMessagesByEntity: Statement;
    markMessagesRead: Statement;
    insertDoc: Statement;
    findDoc: Statement;
    countDocsByJob: Statement;
    updateDoc: Statement;
    listDocsByJob: Statement;
    listDocsByJobApproved: Statement;
    insertCase: Statement;
    findCaseById: Statement;
    listCasesByEntity: Statement;
    updateCase: Statement;
  } | null = null;

  // Transient: per-minute sliding rate window. Resets on restart by design.
  private rateBuckets = new Map<string, RateBucket>();

  constructor(opts: CustomerPortalEngineOptions = {}) {
    this.dbPath = opts.dbPath ?? defaultPortalDbPath();
  }

  /**
   * Lazy-open the database + apply schema + cache prepared statements.
   * Construction does NOT open the DB (keeps module-import side-effect free);
   * the first portal method call opens it. Safe to call repeatedly.
   */
  private ensureOpen(): { db: DatabaseType; stmts: NonNullable<CustomerPortalEngine["stmts"]> } {
    if (this.db && this.stmts) return { db: this.db, stmts: this.stmts };

    if (this.dbPath !== ":memory:") {
      try { fs.mkdirSync(path.dirname(this.dbPath), { recursive: true }); } catch { /* ignore */ }
    }

    const db = new Database(this.dbPath);
    if (this.dbPath !== ":memory:") {
      db.pragma("journal_mode = WAL");
    }
    db.pragma("synchronous = NORMAL");
    db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);

    // Apply schema one statement at a time (idempotent CREATE IF NOT EXISTS).
    for (const ddl of PORTAL_DDL) db.prepare(ddl).run();
    db.prepare("INSERT OR IGNORE INTO meta(key, value) VALUES ('schema_version', ?)").run(String(SCHEMA_VERSION));

    const stmts = {
      insertToken: db.prepare(`
        INSERT INTO portal_tokens(token, id, token_type, entity_id, customer_id, scope_json,
          expires_at, revoked, last_accessed, access_count, rate_limit, created_by, created_at)
        VALUES(@token, @id, @token_type, @entity_id, @customer_id, @scope_json,
          @expires_at, @revoked, @last_accessed, @access_count, @rate_limit, @created_by, @created_at)
      `),
      findToken: db.prepare(`SELECT * FROM portal_tokens WHERE token = ?`),
      revokeToken: db.prepare(`UPDATE portal_tokens SET revoked = 1 WHERE token = ?`),
      listTokensByEntity: db.prepare(
        `SELECT * FROM portal_tokens WHERE entity_id = ? ORDER BY created_at DESC, rowid DESC`,
      ),
      updateTokenAccess: db.prepare(
        `UPDATE portal_tokens SET last_accessed = @last_accessed, access_count = @access_count WHERE token = @token`,
      ),
      insertMessage: db.prepare(`
        INSERT INTO portal_messages(id, entity_type, entity_id, sender_type, sender_name, message, read_at, created_at)
        VALUES(@id, @entity_type, @entity_id, @sender_type, @sender_name, @message, @read_at, @created_at)
      `),
      trimMessages: db.prepare(`
        DELETE FROM portal_messages
         WHERE entity_type = @entity_type AND entity_id = @entity_id
           AND rowid NOT IN (
             SELECT rowid FROM portal_messages
              WHERE entity_type = @entity_type AND entity_id = @entity_id
              ORDER BY rowid DESC LIMIT @keep
           )
      `),
      listMessagesByEntity: db.prepare(
        `SELECT * FROM portal_messages WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?`,
      ),
      markMessagesRead: db.prepare(`
        UPDATE portal_messages SET read_at = @read_at
         WHERE entity_type = @entity_type AND entity_id = @entity_id
           AND sender_type = @sender_type AND read_at IS NULL
      `),
      insertDoc: db.prepare(`
        INSERT INTO portal_quality_docs(id, job_id, doc_type, file_id, title, status,
          reviewed_by, reviewed_at, notes, metadata_json, created_at, updated_at)
        VALUES(@id, @job_id, @doc_type, @file_id, @title, @status,
          @reviewed_by, @reviewed_at, @notes, @metadata_json, @created_at, @updated_at)
      `),
      findDoc: db.prepare(`SELECT * FROM portal_quality_docs WHERE job_id = ? AND id = ?`),
      countDocsByJob: db.prepare(`SELECT COUNT(*) AS n FROM portal_quality_docs WHERE job_id = ?`),
      updateDoc: db.prepare(`
        UPDATE portal_quality_docs
           SET status = @status, reviewed_by = @reviewed_by, reviewed_at = @reviewed_at,
               notes = @notes, updated_at = @updated_at
         WHERE id = @id
      `),
      listDocsByJob: db.prepare(`SELECT * FROM portal_quality_docs WHERE job_id = ? ORDER BY rowid ASC`),
      listDocsByJobApproved: db.prepare(
        `SELECT * FROM portal_quality_docs WHERE job_id = ? AND status = 'approved' ORDER BY rowid ASC`,
      ),
      insertCase: db.prepare(`
        INSERT INTO portal_service_cases(id, entity_type, entity_id, customer_id, subject, summary,
          severity, status, owner, sla_target_at, escalation_level, satisfaction_score,
          opened_at, updated_at, resolved_at)
        VALUES(@id, @entity_type, @entity_id, @customer_id, @subject, @summary,
          @severity, @status, @owner, @sla_target_at, @escalation_level, @satisfaction_score,
          @opened_at, @updated_at, @resolved_at)
      `),
      findCaseById: db.prepare(`SELECT * FROM portal_service_cases WHERE id = ?`),
      listCasesByEntity: db.prepare(
        `SELECT * FROM portal_service_cases WHERE entity_type = ? AND entity_id = ? ORDER BY updated_at DESC, rowid DESC`,
      ),
      updateCase: db.prepare(`
        UPDATE portal_service_cases
           SET status = @status, owner = @owner, escalation_level = @escalation_level,
               satisfaction_score = @satisfaction_score, resolved_at = @resolved_at, updated_at = @updated_at
         WHERE id = @id
      `),
    };

    this.db = db;
    this.stmts = stmts;
    return { db, stmts };
  }

  // --- row <-> domain mappers -----------------------------------------------

  private static rowToToken(r: TokenRow): PortalToken {
    let scope: PortalScope[];
    try {
      const parsed = JSON.parse(r.scope_json);
      scope = Array.isArray(parsed) ? (parsed as PortalScope[]) : ["view"];
    } catch {
      scope = ["view"];
    }
    return {
      id: r.id,
      token: r.token,
      token_type: r.token_type as PortalTokenType,
      entity_id: r.entity_id,
      customer_id: r.customer_id ?? undefined,
      scope,
      expires_at: r.expires_at,
      revoked: !!r.revoked,
      last_accessed: r.last_accessed ?? undefined,
      access_count: r.access_count,
      rate_limit: r.rate_limit,
      created_by: r.created_by ?? undefined,
      created_at: r.created_at,
    };
  }

  private static rowToMessage(r: MessageRow): PortalMessage {
    return {
      id: r.id,
      entity_type: r.entity_type as PortalTokenType,
      entity_id: r.entity_id,
      sender_type: r.sender_type as PortalMessageSender,
      sender_name: r.sender_name,
      message: r.message,
      read_at: r.read_at ?? undefined,
      created_at: r.created_at,
    };
  }

  private static rowToDoc(r: DocRow): QualityDocument {
    let metadata: Record<string, unknown>;
    try {
      const parsed = JSON.parse(r.metadata_json);
      metadata = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      metadata = {};
    }
    return {
      id: r.id,
      job_id: r.job_id,
      doc_type: r.doc_type as QualityDocument["doc_type"],
      file_id: r.file_id ?? undefined,
      title: r.title,
      status: r.status as QualityDocument["status"],
      reviewed_by: r.reviewed_by ?? undefined,
      reviewed_at: r.reviewed_at ?? undefined,
      notes: r.notes ?? undefined,
      metadata,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private static rowToCase(r: CaseRow): PortalServiceCase {
    return {
      id: r.id,
      entity_type: r.entity_type as PortalTokenType,
      entity_id: r.entity_id,
      customer_id: r.customer_id ?? undefined,
      subject: r.subject,
      summary: r.summary,
      severity: r.severity as PortalServiceCase["severity"],
      status: r.status as PortalServiceCase["status"],
      owner: r.owner ?? undefined,
      sla_target_at: r.sla_target_at,
      escalation_level: r.escalation_level,
      satisfaction_score: r.satisfaction_score ?? undefined,
      opened_at: r.opened_at,
      updated_at: r.updated_at,
      resolved_at: r.resolved_at ?? undefined,
    };
  }

  // --- Token Management -----------------------------------------------------

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

    const { stmts } = this.ensureOpen();
    stmts.insertToken.run({
      token: portalToken.token,
      id: portalToken.id,
      token_type: portalToken.token_type,
      entity_id: portalToken.entity_id,
      customer_id: nz(portalToken.customer_id),
      scope_json: JSON.stringify(portalToken.scope),
      expires_at: portalToken.expires_at,
      revoked: 0,
      last_accessed: null,
      access_count: 0,
      rate_limit: portalToken.rate_limit,
      created_by: nz(portalToken.created_by),
      created_at: portalToken.created_at,
    });
    log.info(`[CustomerPortal] Token created for ${input.token_type}:${input.entity_id}`);
    return portalToken;
  }

  /**
   * Revoke a portal token (immediate access removal).
   */
  revokeToken(token: string): { revoked: boolean } {
    const { stmts } = this.ensureOpen();
    const row = stmts.findToken.get(token) as TokenRow | undefined;
    if (!row) throw new Error("Token not found");
    stmts.revokeToken.run(token);
    log.info(`[CustomerPortal] Token revoked for ${row.token_type}:${row.entity_id}`);
    return { revoked: true };
  }

  /**
   * List tokens for an entity (admin view), newest first.
   */
  listTokens(entityId: string): PortalToken[] {
    const { stmts } = this.ensureOpen();
    const rows = stmts.listTokensByEntity.all(entityId) as TokenRow[];
    return rows.map((r) => CustomerPortalEngine.rowToToken(r));
  }

  /**
   * Validate a token: check existence, expiry, revocation, scope, and rate
   * limit. Updates access stats on successful validation.
   */
  validateToken(token: string, requiredScope?: PortalScope): PortalTokenValidation {
    const { stmts } = this.ensureOpen();
    const row = stmts.findToken.get(token) as TokenRow | undefined;
    if (!row) return { valid: false, reason: "Token not found" };

    const pt = CustomerPortalEngine.rowToToken(row);
    if (pt.revoked) return { valid: false, reason: "Token has been revoked" };
    if (new Date(pt.expires_at) < new Date()) return { valid: false, reason: "Token has expired" };

    // Check scope
    if (requiredScope && !pt.scope.includes(requiredScope)) {
      return { valid: false, reason: `Token does not have '${requiredScope}' scope` };
    }

    // Rate limiting (sliding window per minute) -- transient, in-memory.
    const now = Date.now();
    const bucket = this.rateBuckets.get(token);
    if (bucket) {
      if (now - bucket.window_start < RATE_WINDOW_MS) {
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

    // Update access stats (durable).
    pt.last_accessed = new Date().toISOString();
    pt.access_count++;
    stmts.updateTokenAccess.run({
      token,
      last_accessed: pt.last_accessed,
      access_count: pt.access_count,
    });

    return { valid: true, token: pt };
  }

  // --- Portal Views (customer-facing, NO internal cost data) ----------------

  /**
   * Get a quote for portal display.
   * Strips all internal cost data -- only shows customer-facing pricing.
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
        ? `Changes requested: ${(input.requested_changes ?? []).join("; ")}${input.message ? ` -- ${input.message}` : ""}`
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

  // --- Quality Documents ----------------------------------------------------

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

    const { stmts } = this.ensureOpen();
    stmts.insertDoc.run({
      id: doc.id,
      job_id: doc.job_id,
      doc_type: doc.doc_type,
      file_id: nz(doc.file_id),
      title: doc.title,
      status: doc.status,
      reviewed_by: nz(doc.reviewed_by),
      reviewed_at: nz(doc.reviewed_at),
      notes: nz(doc.notes),
      metadata_json: JSON.stringify(doc.metadata),
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    });

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
    const { stmts } = this.ensureOpen();
    const count = (stmts.countDocsByJob.get(input.job_id) as { n: number }).n;
    if (count === 0) throw new Error(`No documents for job ${input.job_id}`);

    const row = stmts.findDoc.get(input.job_id, input.doc_id) as DocRow | undefined;
    if (!row) throw new Error(`Document ${input.doc_id} not found`);

    const doc = CustomerPortalEngine.rowToDoc(row);
    if (input.status) {
      doc.status = input.status;
      if (input.status === "approved" || input.status === "rejected") {
        doc.reviewed_by = input.reviewed_by;
        doc.reviewed_at = new Date().toISOString();
      }
    }
    if (input.notes) doc.notes = input.notes;
    doc.updated_at = new Date().toISOString();

    stmts.updateDoc.run({
      id: doc.id,
      status: doc.status,
      reviewed_by: nz(doc.reviewed_by),
      reviewed_at: nz(doc.reviewed_at),
      notes: nz(doc.notes),
      updated_at: doc.updated_at,
    });
    return doc;
  }

  /**
   * List quality documents for a job (portal: only approved docs shown).
   */
  listQualityDocuments(jobId: string, portalMode = false): QualityDocument[] {
    const { stmts } = this.ensureOpen();
    const rows = (portalMode
      ? stmts.listDocsByJobApproved.all(jobId)
      : stmts.listDocsByJob.all(jobId)) as DocRow[];
    return rows.map((r) => CustomerPortalEngine.rowToDoc(r));
  }

  /**
   * Get a specific quality document by ID.
   */
  getQualityDocument(jobId: string, docId: string): QualityDocument | null {
    const { stmts } = this.ensureOpen();
    const row = stmts.findDoc.get(jobId, docId) as DocRow | undefined;
    return row ? CustomerPortalEngine.rowToDoc(row) : null;
  }

  // --- Messages -------------------------------------------------------------

  /**
   * Add a message to a portal conversation thread (thread bounded to 500).
   */
  addMessage(input: {
    entity_type: PortalTokenType;
    entity_id: string;
    sender_type: PortalMessageSender;
    sender_name: string;
    message: string;
  }): PortalMessage {
    if (!input.message.trim()) throw new Error("Message cannot be empty");
    if (input.message.length > MAX_MESSAGE_LEN) {
      throw new Error(`Message exceeds ${MAX_MESSAGE_LEN} character limit`);
    }

    const msg: PortalMessage = {
      id: crypto.randomUUID(),
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      sender_type: input.sender_type,
      sender_name: input.sender_name,
      message: input.message.trim(),
      created_at: new Date().toISOString(),
    };

    const { db, stmts } = this.ensureOpen();
    // Insert + bound-to-500 atomically so a concurrent reader never sees an
    // over-long thread or a torn trim.
    const insertAndTrim = db.transaction(() => {
      stmts.insertMessage.run({
        id: msg.id,
        entity_type: msg.entity_type,
        entity_id: msg.entity_id,
        sender_type: msg.sender_type,
        sender_name: msg.sender_name,
        message: msg.message,
        read_at: null,
        created_at: msg.created_at,
      });
      stmts.trimMessages.run({ entity_type: msg.entity_type, entity_id: msg.entity_id, keep: MESSAGE_THREAD_CAP });
    });
    insertAndTrim();

    return msg;
  }

  /**
   * List messages for a portal entity, newest first.
   */
  listMessages(entityType: PortalTokenType, entityId: string, limit = DEFAULT_MESSAGE_LIMIT): PortalMessage[] {
    const { stmts } = this.ensureOpen();
    const rows = stmts.listMessagesByEntity.all(entityType, entityId, limit) as MessageRow[];
    return rows.map((r) => CustomerPortalEngine.rowToMessage(r));
  }

  /**
   * Mark messages as read (shop reads customer messages).
   */
  markMessagesRead(entityType: PortalTokenType, entityId: string, senderType: PortalMessageSender): number {
    const { stmts } = this.ensureOpen();
    const info = stmts.markMessagesRead.run({
      entity_type: entityType,
      entity_id: entityId,
      sender_type: senderType,
      read_at: new Date().toISOString(),
    });
    return info.changes;
  }

  // --- Service Cases --------------------------------------------------------

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

    const { stmts } = this.ensureOpen();
    stmts.insertCase.run({
      id: serviceCase.id,
      entity_type: serviceCase.entity_type,
      entity_id: serviceCase.entity_id,
      customer_id: nz(serviceCase.customer_id),
      subject: serviceCase.subject,
      summary: serviceCase.summary,
      severity: serviceCase.severity,
      status: serviceCase.status,
      owner: nz(serviceCase.owner),
      sla_target_at: serviceCase.sla_target_at,
      escalation_level: serviceCase.escalation_level,
      satisfaction_score: nz(serviceCase.satisfaction_score),
      opened_at: serviceCase.opened_at,
      updated_at: serviceCase.updated_at,
      resolved_at: nz(serviceCase.resolved_at),
    });

    log.info(`[CustomerPortal] Service case created for ${input.entity_type}:${input.entity_id}`);
    return serviceCase;
  }

  /**
   * List service cases for a portal entity, most-recently-updated first.
   */
  listServiceCases(entityType: PortalTokenType, entityId: string): PortalServiceCase[] {
    const { stmts } = this.ensureOpen();
    const rows = stmts.listCasesByEntity.all(entityType, entityId) as CaseRow[];
    return rows.map((r) => CustomerPortalEngine.rowToCase(r));
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
    const { stmts } = this.ensureOpen();
    const row = stmts.findCaseById.get(input.case_id) as CaseRow | undefined;
    if (!row) throw new Error(`Service case ${input.case_id} not found`);

    const serviceCase = CustomerPortalEngine.rowToCase(row);

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

    stmts.updateCase.run({
      id: serviceCase.id,
      status: serviceCase.status,
      owner: nz(serviceCase.owner),
      escalation_level: serviceCase.escalation_level,
      satisfaction_score: nz(serviceCase.satisfaction_score),
      resolved_at: nz(serviceCase.resolved_at),
      updated_at: serviceCase.updated_at,
    });
    return serviceCase;
  }

  // --- Lifecycle / introspection --------------------------------------------

  /** Close the underlying database handle. Safe to call multiple times. */
  close(): void {
    if (this.db) {
      try { this.db.close(); } catch { /* already closed */ }
      this.db = null;
      this.stmts = null;
    }
  }

  /** Path the engine is using -- useful for tests + introspection. */
  getDbPath(): string {
    return this.dbPath;
  }

  /** Reachability + WAL-mode confirmation. Returns the journal mode in effect. */
  health(): { open: boolean; dbPath: string; journalMode: string; schemaVersion: number } {
    const { db } = this.ensureOpen();
    const journalRows = db.pragma("journal_mode") as Array<{ journal_mode: string }>;
    const journalMode = journalRows.length > 0 ? journalRows[0].journal_mode : "unknown";
    const versionRow = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as
      | { value: string }
      | undefined;
    return {
      open: true,
      dbPath: this.dbPath,
      journalMode,
      schemaVersion: versionRow ? Number(versionRow.value) : SCHEMA_VERSION,
    };
  }

  // --- Utility --------------------------------------------------------------

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
}

// --- Loose types for cross-engine data passing ------------------------------

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
