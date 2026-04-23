/**
 * ModelConfidentialityEngine (U-LPR-SEC10)
 *
 * Protects LoRA adapters and base weights from exfiltration and unauthorized
 * disclosure. Five pillars per the Phase-9 plan:
 *
 *   1. Trigger-set watermark — Adi-Shamir black-box fingerprint: register a
 *      secret (prompt, expected_output_hash) challenge set at training time,
 *      verify later against a suspect model. Detects stolen weights even when
 *      attacker re-exports under different file hash.
 *      Reference: Adi et al., "Turning Your Weakness Into a Strength:
 *      Watermarking Deep Neural Networks by Backdooring" (USENIX Security 2018).
 *   2. Egress DLP — scan outbound artifacts for `.safetensors` / `.gguf` /
 *      `.bin` magic headers and adapter_config.json signatures. Block or
 *      quarantine depending on policy. Per NIST SP 800-171 §3.13.10.
 *   3. 4-eyes approval — dual-approver workflow for weight-export requests.
 *      Two distinct human identities must approve before release. Mirrors
 *      ISO/IEC 27001 A.9.2.3 separation-of-duties control.
 *   4. JIT admin access — time-boxed weight-access grants with automatic
 *      expiry. Defaults to 4h window, max 24h. Aligns with NIST SP 800-53
 *      AC-2(5) Inactivity Logout and AC-6(1) Least Privilege.
 *   5. Immutable weight-access audit — every read/copy/export of weight
 *      files is appended to an in-memory ledger (hash-chained). Upstream
 *      integrations persist to the signed audit log from U-LPR-SEC04.
 *
 * Pure calculation engine — no file I/O. Callers pass artifact metadata and
 * receive allow/deny decisions + audit records.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC10 — Model confidentiality
 */

import { createHash } from "node:crypto";

// ============================================================================
// TYPES
// ============================================================================

export type ArtifactKind =
  | "safetensors"
  | "gguf"
  | "bin"
  | "lora_adapter_config"
  | "tokenizer"
  | "checkpoint";

export type ExportDecision = "allow" | "deny" | "quarantine" | "pending_approval";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export type AccessGrantStatus = "active" | "expired" | "revoked";

export interface WatermarkTrigger {
  /** Unique identifier for this challenge. */
  id: string;
  /** Secret prompt presented to the suspect model. Stored hashed. */
  prompt_hash: string;
  /** Expected output hash. Match → model carries our fingerprint. */
  expected_output_hash: string;
  /** Model family this fingerprint was baked into. */
  model_family: string;
  /** Unix ms when trigger was minted. */
  created_at: number;
  /** Optional human note (never logged verbatim). */
  note?: string;
}

export interface WatermarkVerification {
  trigger_id: string;
  model_family: string;
  matched: boolean;
  confidence: number; // [0,1]; 1.0 = exact hash match
  verified_at: number;
}

export interface EgressScanInput {
  /** File name (case-insensitive). */
  filename: string;
  /** First 16 bytes of file as hex (magic header detection). */
  magic_hex?: string;
  /** Size in bytes. */
  bytes: number;
  /** MIME type if known. */
  mime?: string;
  /** Destination (URL, share-link, email). */
  destination: string;
  /** Actor performing the egress. */
  actor: string;
}

export interface EgressScanResult {
  decision: ExportDecision;
  kind: ArtifactKind | null;
  reasons: string[];
  scanned_at: number;
  actor: string;
  destination_redacted: string;
}

export interface ExportRequest {
  id: string;
  requester: string;
  artifact_kind: ArtifactKind;
  artifact_sha256: string;
  destination_class: "internal_share" | "partner_sftp" | "public_s3" | "offline_media";
  justification: string;
  requested_at: number;
  /** Sorted array of distinct approvers — must contain 2 unique identities. */
  approvers: ApprovalRecord[];
  status: ApprovalStatus;
  expires_at: number;
}

export interface ApprovalRecord {
  approver: string;
  decision: "approved" | "rejected";
  at: number;
  comment?: string;
}

export interface AccessGrant {
  id: string;
  subject: string;
  scope: "read_weights" | "copy_weights" | "export_weights" | "admin_rotate";
  granted_by: string;
  granted_at: number;
  expires_at: number;
  status: AccessGrantStatus;
  justification: string;
}

export interface AccessAuditEntry {
  seq: number;
  at: number;
  actor: string;
  action: "list" | "read" | "copy" | "export" | "rotate_key" | "watermark_verify";
  artifact_sha256: string | null;
  grant_id: string | null;
  outcome: "success" | "denied" | "error";
  chain_hash: string;
  prev_hash: string | null;
  detail?: string;
}

export interface ModelConfidentialityStats {
  triggers_registered: number;
  verifications_total: number;
  verifications_matched: number;
  egress_scans_total: number;
  egress_blocked: number;
  export_requests_pending: number;
  export_requests_approved: number;
  export_requests_rejected: number;
  access_grants_active: number;
  audit_entries: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SAFETENSORS_MAGIC_PREFIX_LEN = 8; // JSON header length prefix (u64 little-endian)
const GGUF_MAGIC_HEX = "47475546"; // "GGUF"
const PYTORCH_PKZIP_MAGIC_HEX = "504b0304"; // "PK\003\004" (ZIP)

const DEFAULT_JIT_WINDOW_MS = 4 * 60 * 60 * 1000; // 4h
const MAX_JIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h hard ceiling per NIST SP 800-53 AC-2(5)

const DEFAULT_APPROVAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7d
const REQUIRED_APPROVERS = 2;

// ============================================================================
// ENGINE
// ============================================================================

export class ModelConfidentialityEngine {
  private triggers = new Map<string, WatermarkTrigger>();
  private verifications: WatermarkVerification[] = [];
  private egressScans: EgressScanResult[] = [];
  private exportRequests = new Map<string, ExportRequest>();
  private accessGrants = new Map<string, AccessGrant>();
  private auditLog: AccessAuditEntry[] = [];
  private auditHead: string | null = null;
  private auditSeq = 0;

  // ──────────────────────────────────────────────────────────────────────
  // 1. Trigger-set watermark
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Register a new black-box watermark trigger. Prompt and expected output
   * are stored as SHA-256 hashes; the raw strings are never retained so a
   * database breach does not expose the challenge set.
   *
   * @param input.id unique identifier
   * @param input.prompt raw prompt presented to model (hashed immediately)
   * @param input.expected_output raw expected model output (hashed immediately)
   * @param input.model_family model family this fingerprint targets
   * @param input.note optional human note
   * @returns the persisted trigger record
   */
  registerWatermarkTrigger(input: {
    id: string;
    prompt: string;
    expected_output: string;
    model_family: string;
    note?: string;
  }): WatermarkTrigger {
    if (!input.id.trim()) throw new Error("trigger id required");
    if (!input.prompt.length) throw new Error("prompt required");
    if (!input.expected_output.length) throw new Error("expected_output required");
    if (!input.model_family.trim()) throw new Error("model_family required");
    if (this.triggers.has(input.id)) throw new Error(`trigger ${input.id} already registered`);

    const t: WatermarkTrigger = {
      id: input.id,
      prompt_hash: this.sha256(input.prompt),
      expected_output_hash: this.sha256(input.expected_output),
      model_family: input.model_family,
      created_at: Date.now(),
      note: input.note,
    };
    this.triggers.set(input.id, t);
    return t;
  }

  listWatermarkTriggers(model_family?: string): WatermarkTrigger[] {
    const all = Array.from(this.triggers.values());
    return model_family ? all.filter(t => t.model_family === model_family) : all;
  }

  /**
   * Verify a suspect model by presenting it the prompt (caller executes the
   * inference) and submitting the raw output here for hashing + comparison.
   * Exact hash match → confidence 1.0. No near-match scoring; trigger sets
   * are designed as exact-match challenges.
   */
  verifyWatermark(input: {
    trigger_id: string;
    observed_output: string;
  }): WatermarkVerification {
    const t = this.triggers.get(input.trigger_id);
    if (!t) throw new Error(`unknown trigger: ${input.trigger_id}`);
    const observed_hash = this.sha256(input.observed_output);
    const matched = observed_hash === t.expected_output_hash;
    const result: WatermarkVerification = {
      trigger_id: t.id,
      model_family: t.model_family,
      matched,
      confidence: matched ? 1.0 : 0.0,
      verified_at: Date.now(),
    };
    this.verifications.push(result);
    this.appendAudit({
      actor: "watermark_verifier",
      action: "watermark_verify",
      artifact_sha256: null,
      grant_id: null,
      outcome: matched ? "success" : "denied",
      detail: `trigger=${t.id} matched=${matched}`,
    });
    return result;
  }

  // ──────────────────────────────────────────────────────────────────────
  // 2. Egress DLP
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Scan an outbound artifact for weight-file signatures. Combines filename
   * heuristics, magic-byte detection, and MIME type. Returns a decision +
   * human-readable reasons.
   */
  scanEgress(input: EgressScanInput): EgressScanResult {
    const reasons: string[] = [];
    const lowered = input.filename.toLowerCase();
    let kind: ArtifactKind | null = null;

    if (lowered.endsWith(".safetensors")) {
      kind = "safetensors";
      reasons.push("filename .safetensors extension");
    } else if (lowered.endsWith(".gguf")) {
      kind = "gguf";
      reasons.push("filename .gguf extension");
    } else if (lowered.endsWith(".bin") && input.bytes > 1024 * 1024) {
      kind = "bin";
      reasons.push("filename .bin with >1MiB size");
    } else if (lowered === "adapter_config.json" || lowered.endsWith("/adapter_config.json")) {
      kind = "lora_adapter_config";
      reasons.push("LoRA adapter_config.json sidecar");
    } else if (lowered.endsWith(".pt") || lowered.endsWith(".pth")) {
      kind = "checkpoint";
      reasons.push("PyTorch checkpoint extension");
    }

    if (input.magic_hex) {
      const magic = input.magic_hex.toLowerCase();
      if (magic.startsWith(GGUF_MAGIC_HEX)) {
        kind = kind ?? "gguf";
        reasons.push("GGUF magic bytes detected");
      } else if (magic.startsWith(PYTORCH_PKZIP_MAGIC_HEX) && input.bytes > 1024 * 1024) {
        kind = kind ?? "checkpoint";
        reasons.push("PyTorch ZIP-wrapped checkpoint signature");
      } else if (magic.length >= SAFETENSORS_MAGIC_PREFIX_LEN * 2 && input.bytes > 64 && lowered.endsWith(".safetensors")) {
        reasons.push("safetensors u64 length prefix present");
      }
    }

    let decision: ExportDecision = "allow";
    if (kind) {
      // Weight artifacts require dual-approval before egress. Route to
      // quarantine pending an approved ExportRequest; DLP does NOT auto-allow.
      decision = "quarantine";
      reasons.push("weight artifact → quarantine pending 4-eyes approval");
    }
    // Public destinations never allow weights. Classify by explicit allowlist
    // of internal host patterns (.internal/.corp/.local/.lan TLDs, "internal"
    // substring in host, localhost). Anything else is treated as public.
    if (kind) {
      const host = this.extractHost(input.destination).toLowerCase();
      const internal =
        host === "localhost" ||
        host.endsWith(".internal") ||
        host.endsWith(".corp") ||
        host.endsWith(".local") ||
        host.endsWith(".lan") ||
        host.includes("internal.") ||
        host.includes(".internal.") ||
        host.includes(".corp.") ||
        host.startsWith("internal.") ||
        (input.destination.startsWith("s3://") && host.includes("internal"));
      if (!internal) {
        decision = "deny";
        reasons.push("public destination not permitted for model weights");
      }
    }

    const result: EgressScanResult = {
      decision,
      kind,
      reasons,
      scanned_at: Date.now(),
      actor: input.actor,
      destination_redacted: this.redactDestination(input.destination),
    };
    this.egressScans.push(result);
    if (decision !== "allow") {
      this.appendAudit({
        actor: input.actor,
        action: "export",
        artifact_sha256: null,
        grant_id: null,
        outcome: "denied",
        detail: `egress_scan filename=${input.filename} decision=${decision}`,
      });
    }
    return result;
  }

  listEgressScans(limit = 100): EgressScanResult[] {
    return this.egressScans.slice(-limit);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 3. 4-eyes approval
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Submit a weight-export request. Starts in `pending` state until two
   * distinct approvers (not the requester) approve it.
   */
  submitExportRequest(input: {
    id: string;
    requester: string;
    artifact_kind: ArtifactKind;
    artifact_sha256: string;
    destination_class: ExportRequest["destination_class"];
    justification: string;
  }): ExportRequest {
    if (this.exportRequests.has(input.id)) {
      throw new Error(`export request ${input.id} already exists`);
    }
    if (input.justification.trim().length < 20) {
      throw new Error("justification must be ≥20 chars (audit evidence requirement)");
    }
    if (!/^[a-f0-9]{64}$/i.test(input.artifact_sha256)) {
      throw new Error("artifact_sha256 must be a 64-char hex digest");
    }
    const now = Date.now();
    const req: ExportRequest = {
      id: input.id,
      requester: input.requester,
      artifact_kind: input.artifact_kind,
      artifact_sha256: input.artifact_sha256,
      destination_class: input.destination_class,
      justification: input.justification,
      requested_at: now,
      approvers: [],
      status: "pending",
      expires_at: now + DEFAULT_APPROVAL_WINDOW_MS,
    };
    this.exportRequests.set(req.id, req);
    return req;
  }

  /**
   * Record an approver's decision. Enforces requester ≠ approver and distinct
   * approvers, as required by ISO/IEC 27001 A.9.2.3 separation-of-duties.
   */
  recordApproval(input: {
    request_id: string;
    approver: string;
    decision: "approved" | "rejected";
    comment?: string;
  }): ExportRequest {
    const req = this.exportRequests.get(input.request_id);
    if (!req) throw new Error(`unknown export request: ${input.request_id}`);
    if (req.status !== "pending") throw new Error(`request ${req.id} is ${req.status}`);
    if (Date.now() > req.expires_at) {
      req.status = "expired";
      return req;
    }
    if (input.approver === req.requester) {
      throw new Error("requester cannot self-approve (4-eyes rule)");
    }
    if (req.approvers.some(a => a.approver === input.approver)) {
      throw new Error(`${input.approver} already recorded a decision`);
    }
    req.approvers.push({
      approver: input.approver,
      decision: input.decision,
      at: Date.now(),
      comment: input.comment,
    });

    if (input.decision === "rejected") {
      req.status = "rejected";
    } else if (req.approvers.filter(a => a.decision === "approved").length >= REQUIRED_APPROVERS) {
      req.status = "approved";
    }
    return req;
  }

  getExportRequest(id: string): ExportRequest | null {
    return this.exportRequests.get(id) ?? null;
  }

  listExportRequests(status?: ApprovalStatus): ExportRequest[] {
    const all = Array.from(this.exportRequests.values());
    return status ? all.filter(r => r.status === status) : all;
  }

  // ──────────────────────────────────────────────────────────────────────
  // 4. JIT admin access
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Grant a time-boxed admin access window. Default 4h, ceiling 24h. Caller
   * must pass justification for audit trail. Exceeding the ceiling throws —
   * no permanent admin credentials are permitted.
   */
  grantJITAccess(input: {
    id: string;
    subject: string;
    scope: AccessGrant["scope"];
    granted_by: string;
    justification: string;
    window_ms?: number;
  }): AccessGrant {
    if (this.accessGrants.has(input.id)) throw new Error(`grant ${input.id} already exists`);
    if (input.justification.trim().length < 10) throw new Error("justification required (≥10 chars)");
    if (input.granted_by === input.subject) throw new Error("granter cannot grant to themselves");

    const win = input.window_ms ?? DEFAULT_JIT_WINDOW_MS;
    if (win <= 0 || win > MAX_JIT_WINDOW_MS) {
      throw new Error(`window_ms must be (0, ${MAX_JIT_WINDOW_MS}] per NIST SP 800-53 AC-2(5)`);
    }
    const now = Date.now();
    const grant: AccessGrant = {
      id: input.id,
      subject: input.subject,
      scope: input.scope,
      granted_by: input.granted_by,
      granted_at: now,
      expires_at: now + win,
      status: "active",
      justification: input.justification,
    };
    this.accessGrants.set(grant.id, grant);
    return grant;
  }

  revokeJITAccess(id: string, revoked_by: string): AccessGrant {
    const g = this.accessGrants.get(id);
    if (!g) throw new Error(`unknown grant: ${id}`);
    if (g.status !== "active") return g;
    g.status = "revoked";
    this.appendAudit({
      actor: revoked_by,
      action: "rotate_key",
      artifact_sha256: null,
      grant_id: g.id,
      outcome: "success",
      detail: `grant revoked by ${revoked_by}`,
    });
    return g;
  }

  /**
   * Evaluate whether a subject currently holds an active grant for the given
   * scope. Auto-expires stale grants as a side effect (lazy GC).
   */
  checkAccess(subject: string, scope: AccessGrant["scope"], now: number = Date.now()): {
    allowed: boolean;
    grant_id: string | null;
    expires_at: number | null;
  } {
    for (const g of this.accessGrants.values()) {
      if (g.status === "active" && g.expires_at <= now) g.status = "expired";
      if (
        g.status === "active" &&
        g.subject === subject &&
        g.scope === scope
      ) {
        return { allowed: true, grant_id: g.id, expires_at: g.expires_at };
      }
    }
    return { allowed: false, grant_id: null, expires_at: null };
  }

  listAccessGrants(subject?: string, status?: AccessGrantStatus): AccessGrant[] {
    const now = Date.now();
    const all = Array.from(this.accessGrants.values());
    for (const g of all) {
      if (g.status === "active" && g.expires_at <= now) g.status = "expired";
    }
    return all.filter(g => (!subject || g.subject === subject) && (!status || g.status === status));
  }

  // ──────────────────────────────────────────────────────────────────────
  // 5. Immutable weight-access audit
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Record a weight-access event. Hash-chained: each entry's chain_hash =
   * SHA-256(prev_hash || canonical_json(entry_sans_chain_hash)). Tamper with
   * any past entry → subsequent chain_hash verifications fail.
   */
  recordAccess(input: {
    actor: string;
    action: AccessAuditEntry["action"];
    artifact_sha256?: string;
    grant_id?: string;
    outcome?: AccessAuditEntry["outcome"];
    detail?: string;
  }): AccessAuditEntry {
    return this.appendAudit({
      actor: input.actor,
      action: input.action,
      artifact_sha256: input.artifact_sha256 ?? null,
      grant_id: input.grant_id ?? null,
      outcome: input.outcome ?? "success",
      detail: input.detail,
    });
  }

  listAuditEntries(limit = 200): AccessAuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Verify the hash chain is intact from genesis forward. Returns the first
   * tampered sequence number or null if the chain is clean.
   */
  verifyChain(): { valid: boolean; tampered_seq: number | null } {
    let prev: string | null = null;
    for (const entry of this.auditLog) {
      const recomputed = this.chainHashFor(entry, prev);
      if (recomputed !== entry.chain_hash || entry.prev_hash !== prev) {
        return { valid: false, tampered_seq: entry.seq };
      }
      prev = entry.chain_hash;
    }
    return { valid: true, tampered_seq: null };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Stats + admin
  // ──────────────────────────────────────────────────────────────────────

  getStats(): ModelConfidentialityStats {
    this.gcExpiredGrants();
    const requests = Array.from(this.exportRequests.values());
    return {
      triggers_registered: this.triggers.size,
      verifications_total: this.verifications.length,
      verifications_matched: this.verifications.filter(v => v.matched).length,
      egress_scans_total: this.egressScans.length,
      egress_blocked: this.egressScans.filter(s => s.decision !== "allow").length,
      export_requests_pending: requests.filter(r => r.status === "pending").length,
      export_requests_approved: requests.filter(r => r.status === "approved").length,
      export_requests_rejected: requests.filter(r => r.status === "rejected").length,
      access_grants_active: Array.from(this.accessGrants.values()).filter(g => g.status === "active").length,
      audit_entries: this.auditLog.length,
    };
  }

  clearAll(): void {
    this.triggers.clear();
    this.verifications.length = 0;
    this.egressScans.length = 0;
    this.exportRequests.clear();
    this.accessGrants.clear();
    this.auditLog.length = 0;
    this.auditHead = null;
    this.auditSeq = 0;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────────

  private appendAudit(input: {
    actor: string;
    action: AccessAuditEntry["action"];
    artifact_sha256: string | null;
    grant_id: string | null;
    outcome: AccessAuditEntry["outcome"];
    detail?: string;
  }): AccessAuditEntry {
    const seq = ++this.auditSeq;
    const partial: Omit<AccessAuditEntry, "chain_hash"> = {
      seq,
      at: Date.now(),
      actor: input.actor,
      action: input.action,
      artifact_sha256: input.artifact_sha256,
      grant_id: input.grant_id,
      outcome: input.outcome,
      prev_hash: this.auditHead,
      detail: input.detail,
    };
    const chain_hash = this.chainHashFor(partial, this.auditHead);
    const entry: AccessAuditEntry = { ...partial, chain_hash };
    this.auditLog.push(entry);
    this.auditHead = chain_hash;
    return entry;
  }

  private chainHashFor(
    entry: Omit<AccessAuditEntry, "chain_hash"> | AccessAuditEntry,
    prev: string | null,
  ): string {
    const canonical = JSON.stringify({
      seq: entry.seq,
      at: entry.at,
      actor: entry.actor,
      action: entry.action,
      artifact_sha256: entry.artifact_sha256,
      grant_id: entry.grant_id,
      outcome: entry.outcome,
      prev_hash: prev,
      detail: entry.detail ?? null,
    });
    return createHash("sha256").update(canonical).digest("hex");
  }

  private sha256(s: string): string {
    return createHash("sha256").update(s).digest("hex");
  }

  private redactDestination(dest: string): string {
    // Preserve scheme + host, redact path + query.
    try {
      const u = new URL(dest);
      return `${u.protocol}//${u.host}/<redacted>`;
    } catch {
      return dest.length > 8 ? dest.slice(0, 4) + "…" + dest.slice(-4) : "<redacted>";
    }
  }

  private extractHost(dest: string): string {
    try {
      const u = new URL(dest);
      return u.host || u.hostname;
    } catch {
      // s3://bucket/key → host = "bucket"
      const m = /^[a-z0-9]+:\/\/([^/]+)/i.exec(dest);
      return m ? m[1] : "";
    }
  }

  private gcExpiredGrants(now: number = Date.now()): void {
    for (const g of this.accessGrants.values()) {
      if (g.status === "active" && g.expires_at <= now) g.status = "expired";
    }
  }
}

export const modelConfidentialityEngine = new ModelConfidentialityEngine();
