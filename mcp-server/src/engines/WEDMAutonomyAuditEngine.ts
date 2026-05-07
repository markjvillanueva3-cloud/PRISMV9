/**
 * WEDMAutonomyAuditEngine — Audit trail for WEDM autonomy level changes
 *
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-23
 *
 * Captures HTTP-layer authentication context (user ID, roles, IP) alongside
 * the existing engine-layer transition record (from/to/actor/reason). Gives
 * regulated shops a traceable who/what/when/where chain for every promote,
 * demote, and auto-degrade action issued against the autonomy APIs.
 *
 * Sinks to `data/state/WEDM_AUTONOMY_AUDIT.json` via atomicWrite.
 *
 * References:
 *   - AS9100D §8.5.2 Identification and Traceability
 *   - FDA 21 CFR Part 11 §11.10(e) audit trails
 *   - ISO 13485 §4.2.5 Control of Records
 *
 * @module engines/WEDMAutonomyAuditEngine
 */

import * as fs from "fs";
import * as path from "path";
import { atomicWrite } from "../utils/atomicWrite.js";
import { log } from "../utils/Logger.js";

export type AutonomyAuditAction =
  | "promote"
  | "demote"
  | "auto_degrade"
  | "manual_degrade"
  | "status_read"
  | "history_read";

export type AutonomyAuditOutcome = "success" | "denied" | "failed";

export interface AutonomyAuditEntry {
  /** Monotonic id — "autonomy-audit-<timestamp>-<seq>" */
  id: string;
  /** ISO-8601 timestamp. */
  at: string;
  /** HTTP action against the autonomy API. */
  action: AutonomyAuditAction;
  /** Auth principal from Bearer token. */
  user_id: string | null;
  /** Auth roles from Bearer token. */
  user_roles: string[];
  /** Remote IP (may be a proxy). */
  remote_ip: string | null;
  /** User-supplied actor override from body (often same as user_id). */
  actor: string | null;
  /** User-supplied reason from body. */
  reason: string | null;
  /** Autonomy level before the action (null for read operations). */
  level_from: number | null;
  /** Autonomy level after the action (null for read ops or failed writes). */
  level_to: number | null;
  /** Outcome of the request. */
  outcome: AutonomyAuditOutcome;
  /** Optional error message when outcome !== "success". */
  error: string | null;
  /** True when a counter-sign was supplied (promote only). */
  counter_signed: boolean;
}

export interface AutonomyAuditFile {
  schemaVersion: number;
  generatedAt: string;
  description: string;
  entries: AutonomyAuditEntry[];
}

const AUDIT_SCHEMA_VERSION = 1;
const AUDIT_FILENAME = "WEDM_AUTONOMY_AUDIT.json";
const MAX_ENTRIES_IN_MEMORY = 5000;

function defaultAuditPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "data", "state", AUDIT_FILENAME),
    path.resolve(process.cwd(), "mcp-server", "data", "state", AUDIT_FILENAME),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.dirname(c))) return c;
  }
  return candidates[0];
}

export class WEDMAutonomyAuditEngine {
  private entries: AutonomyAuditEntry[] = [];
  private sequence = 0;
  private filePath: string;
  private loaded = false;

  constructor(filePath: string = defaultAuditPath()) {
    this.filePath = filePath;
  }

  /** Load existing audit log from disk (idempotent). */
  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (!fs.existsSync(this.filePath)) return;
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as AutonomyAuditFile;
      if (Array.isArray(parsed.entries)) {
        this.entries = parsed.entries.slice(-MAX_ENTRIES_IN_MEMORY);
        this.sequence = this.entries.length;
      }
    } catch (e) {
      log.warn(`[WEDMAutonomyAudit] Failed to load ${this.filePath}: ${(e as Error).message}`);
    }
  }

  /** Record an audit entry. Returns the created entry. */
  record(input: Omit<AutonomyAuditEntry, "id" | "at">): AutonomyAuditEntry {
    this.load();
    this.sequence++;
    const now = new Date().toISOString();
    const entry: AutonomyAuditEntry = {
      id: `autonomy-audit-${Date.now()}-${this.sequence}`,
      at: now,
      ...input,
    };
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES_IN_MEMORY) {
      this.entries = this.entries.slice(-MAX_ENTRIES_IN_MEMORY);
    }
    log.info(
      `[AutonomyAudit] ${entry.action} user=${entry.user_id ?? "anon"} ` +
        `roles=[${entry.user_roles.join(",")}] level=${entry.level_from}→${entry.level_to} ` +
        `outcome=${entry.outcome}${entry.error ? ` error="${entry.error}"` : ""}`,
    );
    // Fire-and-forget persist; do not block the HTTP response.
    this.persist().catch(err => {
      log.warn(`[WEDMAutonomyAudit] persist failed: ${(err as Error).message}`);
    });
    return entry;
  }

  /** Force an atomic write of the in-memory log. */
  async persist(): Promise<string> {
    const file: AutonomyAuditFile = {
      schemaVersion: AUDIT_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      description: "WEDM autonomy API audit trail (WEDM-P2P-PRODUCTION-MS0 / U-PROD-23)",
      entries: this.entries,
    };
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await atomicWrite(this.filePath, JSON.stringify(file, null, 2));
    return this.filePath;
  }

  /** Return last N entries (default 100), newest first. */
  recent(limit = 100): AutonomyAuditEntry[] {
    this.load();
    const take = Math.max(0, Math.min(limit, this.entries.length));
    return this.entries.slice(-take).slice().reverse();
  }

  /** Filter entries by action type (newest first). */
  byAction(action: AutonomyAuditAction, limit = 100): AutonomyAuditEntry[] {
    this.load();
    return this.entries
      .filter(e => e.action === action)
      .slice(-limit)
      .slice()
      .reverse();
  }

  /** Filter entries by user id (newest first). */
  byUser(userId: string, limit = 100): AutonomyAuditEntry[] {
    this.load();
    return this.entries
      .filter(e => e.user_id === userId)
      .slice(-limit)
      .slice()
      .reverse();
  }

  /** Summary statistics for the audit log. */
  stats(): {
    totalEntries: number;
    byAction: Record<string, number>;
    byOutcome: Record<string, number>;
    deniedCount: number;
    lastEntryAt: string | null;
  } {
    this.load();
    const byAction: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};
    for (const e of this.entries) {
      byAction[e.action] = (byAction[e.action] ?? 0) + 1;
      byOutcome[e.outcome] = (byOutcome[e.outcome] ?? 0) + 1;
    }
    return {
      totalEntries: this.entries.length,
      byAction,
      byOutcome,
      deniedCount: byOutcome["denied"] ?? 0,
      lastEntryAt: this.entries.length > 0 ? this.entries[this.entries.length - 1].at : null,
    };
  }

  /** Reset the in-memory log — test helper only. */
  reset(): void {
    this.entries = [];
    this.sequence = 0;
    this.loaded = true;
  }
}

export const wedmAutonomyAuditEngine = new WEDMAutonomyAuditEngine();
