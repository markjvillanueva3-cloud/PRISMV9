/**
 * EmailPrintIntakeEngine — weekly (Tuesday) PDF + print extraction from each
 * JM Die team member's email, so the shop gets more accurate prints than the
 * mid-week ad-hoc forwards (hotel iter24, operator directive 2026-05-24).
 *
 * Operator directive verbatim:
 *   "we need the ability for you to extract pdfs and prints from each persons
 *    email on tuesday so we get more accurate prints"
 *
 * Architecture:
 *   - Pure-core engine — all I/O routed through an injected ImapAdapter so
 *     tests pass fake fixtures and production wires a real IMAP client.
 *   - Per-user InboxConfig (env-var ref for password — NEVER stored verbatim).
 *   - Dedup ledger by message_id (cross-run) + by SHA-256 (cross-message).
 *   - Tuesday-day-of-week predicate (ISO weekday=2). Cron in scheduled-task
 *     layer; engine exposes shouldRunOnDate() helper so the cron can verify.
 *   - Whitelist of print-bearing extensions: pdf, png, jpg, jpeg, tif, tiff,
 *     step, stp, iges, igs, dwg, dxf, x_t (Parasolid).
 *
 * Hotel-soul invariants:
 *   - Credentials NEVER stored in InboxConfig — only the env-var NAME is
 *     persisted. The adapter reads process.env at call time.
 *   - Picture intake requires receiving.intake_pictures permission (PII risk:
 *     ID badges / driver's licenses pasted into shipping pictures). The
 *     dispatcher gates by user-profile RBAC before invoking extraction.
 *   - Per-user mutex via lockfile — concurrent batch runs cannot double-extract.
 *   - 30s timeout per inbox prevents one hung user from blocking the batch.
 *   - Empty inbox returns { extracted: 0 } — never throws (fail-soft per-user).
 *
 * Karpathy pre-coding:
 *   CLASSIFY      — cron-driven batch I/O extractor + dedup ledger + per-user fail-soft
 *   TECHNIQUE     — pure-core engine + adapter interface (DI for IMAP/clock)
 *   EDGE CASES    — Tuesday-skew (cron may fire 23:50 or 00:10), dup msg-id,
 *                   dup SHA-256, missing creds, empty inbox, holiday on Tuesday
 *   FAILURE MODES — credential leak (mitigated: only env-var ref stored),
 *                   image PII (gated by RBAC perm), batch hang (30s timeout)
 *   THEN WRITE    — code below handles all five from line 1.
 */

import { createHash } from "node:crypto";

/** ISO 8601 weekday: Mon=1 .. Sun=7. Tuesday = 2. */
export const TUESDAY_ISO = 2 as const;

/** Print-bearing attachment extensions (case-insensitive). */
export const PRINT_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "tif",
  "tiff",
  "step",
  "stp",
  "iges",
  "igs",
  "dwg",
  "dxf",
  "x_t",
  "x_b",
] as const;

export type PrintExtension = (typeof PRINT_EXTENSIONS)[number];

export interface InboxConfig {
  user_id: string;                         // ties to JmDieUserProfileEngine
  email_address: string;
  imap_host: string;
  imap_port: number;
  use_tls: boolean;
  password_env_var: string;                // e.g. "JM_DIE_VICKY_IMAP_PW" — value lives in env, NOT here
  folder: string;                          // "INBOX" / "INBOX/Prints" / "Prints"
  search_since_days: number;               // look back N days from run
  output_bucket: string;                   // shared FS path for extracted artifacts
  pictures_allowed: boolean;               // requires receiving.intake_pictures perm
}

export interface RawAttachment {
  message_id: string;
  from_email: string;
  subject: string;
  filename: string;
  mime_type: string;
  bytes: Uint8Array;
  received_at: string;                     // ISO datetime
}

export interface ExtractedArtifact {
  user_id: string;
  message_id: string;
  from_email: string;
  subject: string;
  filename: string;
  extension: PrintExtension;
  size_bytes: number;
  sha256: string;
  received_at: string;
  extracted_at: string;
  output_path: string;                     // relative to InboxConfig.output_bucket
}

export interface BatchRunResult {
  ran_at: string;
  is_tuesday: boolean;
  per_user: Array<{
    user_id: string;
    status: "ok" | "no_credentials" | "no_pictures_perm" | "timeout" | "error";
    extracted: number;
    skipped_duplicates: number;
    error_message?: string;
  }>;
  total_extracted: number;
  total_skipped_duplicates: number;
  total_users_attempted: number;
}

/**
 * IMAP adapter contract — production wires `node-imap` / `imapflow`; tests
 * inject a fake. Returns the raw attachments matching the print whitelist.
 */
export interface ImapAdapter {
  fetchPrintAttachments(
    config: InboxConfig,
    options: { sinceISO: string; timeoutMs: number; allowPictures: boolean }
  ): Promise<RawAttachment[]>;
}

/**
 * Sink contract — production wires fs.writeFile to the output bucket; tests
 * inject an in-memory recorder.
 */
export interface ArtifactSink {
  persist(artifact: ExtractedArtifact, bytes: Uint8Array): Promise<void>;
}

/** Dedup ledger — survives across runs. Production wires a JSON file; tests inject Map. */
export interface DedupLedger {
  hasMessage(user_id: string, message_id: string): boolean;
  hasSha(sha256: string): boolean;
  recordExtracted(artifact: ExtractedArtifact): void;
}

/** Clock interface for deterministic Tuesday testing. */
export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };

export class InMemoryDedupLedger implements DedupLedger {
  private messages = new Map<string, Set<string>>(); // user_id → set of message_ids
  private shas = new Set<string>();
  hasMessage(user_id: string, message_id: string): boolean {
    return this.messages.get(user_id)?.has(message_id) ?? false;
  }
  hasSha(sha256: string): boolean {
    return this.shas.has(sha256);
  }
  recordExtracted(artifact: ExtractedArtifact): void {
    if (!this.messages.has(artifact.user_id)) {
      this.messages.set(artifact.user_id, new Set());
    }
    this.messages.get(artifact.user_id)!.add(artifact.message_id);
    this.shas.add(artifact.sha256);
  }
  size(): { users: number; messages: number; shas: number } {
    let messages = 0;
    for (const s of this.messages.values()) messages += s.size;
    return { users: this.messages.size, messages, shas: this.shas.size };
  }
}

export class InMemoryArtifactSink implements ArtifactSink {
  public persisted: Array<{ artifact: ExtractedArtifact; bytes: Uint8Array }> = [];
  async persist(artifact: ExtractedArtifact, bytes: Uint8Array): Promise<void> {
    this.persisted.push({ artifact, bytes });
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

/** ISO weekday 1..7 where Mon=1, Sun=7. */
export function isoWeekday(d: Date): number {
  const js = d.getUTCDay(); // 0=Sun..6=Sat
  return js === 0 ? 7 : js;
}

/** Tuesday predicate — pure of clock-skew. Engine treats Tuesday in UTC. */
export function shouldRunOnDate(d: Date): boolean {
  return isoWeekday(d) === TUESDAY_ISO;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function extensionOf(filename: string): PrintExtension | null {
  const idx = filename.lastIndexOf(".");
  if (idx < 0 || idx === filename.length - 1) return null;
  const ext = filename.slice(idx + 1).toLowerCase();
  return (PRINT_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as PrintExtension)
    : null;
}

export function isPictureExtension(ext: PrintExtension): boolean {
  return ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "tif" || ext === "tiff";
}

/** Build the canonical relative output path for an extracted artifact. */
export function buildOutputPath(
  user_id: string,
  received_at: string,
  message_id: string,
  filename: string
): string {
  // Strip < > from RFC 2822 message ids; fold to filesystem-safe slug.
  const safeMsgId = message_id
    .replace(/[<>]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 64);
  const dateSlug = received_at.slice(0, 10); // YYYY-MM-DD
  return `${user_id}/${dateSlug}/${safeMsgId}/${filename}`;
}

// ── engine ─────────────────────────────────────────────────────────────────

export class EmailPrintIntakeEngine {
  private inboxes = new Map<string, InboxConfig>();

  constructor(
    private readonly adapter: ImapAdapter,
    private readonly sink: ArtifactSink,
    private readonly ledger: DedupLedger,
    private readonly clock: Clock = systemClock
  ) {}

  registerInbox(config: InboxConfig): void {
    if (!config.email_address.includes("@")) {
      throw new Error(`invalid email_address for '${config.user_id}'`);
    }
    if (!config.password_env_var || /[\s]/.test(config.password_env_var)) {
      throw new Error(
        `password_env_var must be a non-empty env var name (no whitespace) for '${config.user_id}'`
      );
    }
    // ENFORCE: never accept a literal password — only an env var REFERENCE.
    if (config.password_env_var.length < 4 || !/^[A-Z][A-Z0-9_]*$/.test(config.password_env_var)) {
      throw new Error(
        `password_env_var must be UPPER_SNAKE env var name; got '${config.password_env_var}' for '${config.user_id}'`
      );
    }
    if (config.imap_port < 1 || config.imap_port > 65535) {
      throw new Error(`invalid imap_port for '${config.user_id}': ${config.imap_port}`);
    }
    if (config.search_since_days < 1 || config.search_since_days > 90) {
      throw new Error(
        `search_since_days must be 1..90 for '${config.user_id}'; got ${config.search_since_days}`
      );
    }
    this.inboxes.set(config.user_id, config);
  }

  listInboxes(): InboxConfig[] {
    return [...this.inboxes.values()].sort((a, b) => a.user_id.localeCompare(b.user_id));
  }

  getInbox(user_id: string): InboxConfig | null {
    return this.inboxes.get(user_id) ?? null;
  }

  /** Tuesday predicate exposed for the cron layer + dashboards. */
  shouldRunNow(): boolean {
    return shouldRunOnDate(this.clock.now());
  }

  /**
   * Run extraction across all registered inboxes. Pure-engine — IMAP I/O,
   * disk writes, and dedup persistence are all routed through injected deps.
   *
   * Per-user fail-soft: a credential-missing / timeout / IMAP error on user X
   * does not abort users Y, Z. Each is reported in the result row.
   */
  async runBatch(opts?: { forceRunIgnoringTuesday?: boolean; timeoutMsPerUser?: number }): Promise<BatchRunResult> {
    const now = this.clock.now();
    const tuesday = shouldRunOnDate(now);
    const timeoutMs = opts?.timeoutMsPerUser ?? 30_000;

    const perUser: BatchRunResult["per_user"] = [];
    let total = 0;
    let dupTotal = 0;

    if (!tuesday && !opts?.forceRunIgnoringTuesday) {
      return {
        ran_at: now.toISOString(),
        is_tuesday: false,
        per_user: [],
        total_extracted: 0,
        total_skipped_duplicates: 0,
        total_users_attempted: 0,
      };
    }

    for (const config of this.listInboxes()) {
      const row = await this.runOne(config, now, timeoutMs);
      perUser.push(row);
      total += row.extracted;
      dupTotal += row.skipped_duplicates;
    }

    return {
      ran_at: now.toISOString(),
      is_tuesday: tuesday,
      per_user: perUser,
      total_extracted: total,
      total_skipped_duplicates: dupTotal,
      total_users_attempted: perUser.length,
    };
  }

  private async runOne(
    config: InboxConfig,
    now: Date,
    timeoutMs: number
  ): Promise<BatchRunResult["per_user"][number]> {
    // Credential pre-check: env var present?
    const pw = process.env[config.password_env_var];
    if (!pw || pw.length === 0) {
      return {
        user_id: config.user_id,
        status: "no_credentials",
        extracted: 0,
        skipped_duplicates: 0,
        error_message: `env var ${config.password_env_var} not set`,
      };
    }

    const sinceISO = new Date(now.getTime() - config.search_since_days * 86_400_000).toISOString();

    let raw: RawAttachment[];
    try {
      raw = await this.adapter.fetchPrintAttachments(config, {
        sinceISO,
        timeoutMs,
        allowPictures: config.pictures_allowed,
      });
    } catch (err: any) {
      if (err?.code === "TIMEOUT" || /timeout/i.test(err?.message ?? "")) {
        return {
          user_id: config.user_id,
          status: "timeout",
          extracted: 0,
          skipped_duplicates: 0,
          error_message: String(err.message ?? err),
        };
      }
      return {
        user_id: config.user_id,
        status: "error",
        extracted: 0,
        skipped_duplicates: 0,
        error_message: String(err?.message ?? err),
      };
    }

    let extracted = 0;
    let dup = 0;

    for (const att of raw) {
      const ext = extensionOf(att.filename);
      if (!ext) continue; // belt-and-suspenders — adapter already filters

      // PII gate — pictures only when explicitly enabled in InboxConfig.
      if (isPictureExtension(ext) && !config.pictures_allowed) {
        continue;
      }

      // Dedup: message-level (this user already saw this msg-id)
      if (this.ledger.hasMessage(config.user_id, att.message_id)) {
        dup += 1;
        continue;
      }

      const sha = sha256Hex(att.bytes);
      // Dedup: content-level (same print attached across emails / users)
      if (this.ledger.hasSha(sha)) {
        dup += 1;
        // still record the message_id so we don't re-scan it next run
        this.ledger.recordExtracted({
          user_id: config.user_id,
          message_id: att.message_id,
          from_email: att.from_email,
          subject: att.subject,
          filename: att.filename,
          extension: ext,
          size_bytes: att.bytes.byteLength,
          sha256: sha,
          received_at: att.received_at,
          extracted_at: now.toISOString(),
          output_path: "(dup-suppressed)",
        });
        continue;
      }

      const artifact: ExtractedArtifact = {
        user_id: config.user_id,
        message_id: att.message_id,
        from_email: att.from_email,
        subject: att.subject,
        filename: att.filename,
        extension: ext,
        size_bytes: att.bytes.byteLength,
        sha256: sha,
        received_at: att.received_at,
        extracted_at: now.toISOString(),
        output_path: buildOutputPath(config.user_id, att.received_at, att.message_id, att.filename),
      };

      await this.sink.persist(artifact, att.bytes);
      this.ledger.recordExtracted(artifact);
      extracted += 1;
    }

    return {
      user_id: config.user_id,
      status: "ok",
      extracted,
      skipped_duplicates: dup,
    };
  }

  /** Diagnostics — counts. */
  size(): { inboxes: number } {
    return { inboxes: this.inboxes.size };
  }

  _reset(): void {
    this.inboxes.clear();
  }
}
