/**
 * WetRunCustomerCommunicationLogEngine
 * ------------------------------------------------------------
 * Append-only log of customer communications during a wet-run
 * pilot engagement. Every communication (outbound or inbound)
 * is recorded with a monotonic sequence number and timestamp,
 * a named author, explicit recipients, a topic class, and a
 * minimum-length summary.
 *
 * Each topic carries a regulatory-style acknowledgment SLA. An
 * outbound entry with a topic that has an SLA must be
 * acknowledged by the customer (recorded via acknowledge())
 * before the SLA window expires. listBreached() surfaces the
 * expired unacknowledged entries so auditors can see them.
 *
 * The log is append-only — entries cannot be mutated or
 * deleted after record(). Only acknowledgment and closure are
 * additive. Attempting to alter state silently is rejected.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-CUST-COMMS
 */

// ============================================================================
// Constants
// ============================================================================

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** SLA windows (outbound communications) — milliseconds. */
const SLA_WINDOW_MS: Record<TopicKind, number | null> = {
  sev1_incident: 24 * HOUR_MS,
  quality_issue: 48 * HOUR_MS,
  schedule_slip: 72 * HOUR_MS,
  parameter_change: 7 * DAY_MS,
  kickoff: 14 * DAY_MS,
  pilot_exit: 7 * DAY_MS,
  general: null,
};

const MIN_SUMMARY_CHARS = 40;
const MIN_ACK_NAME_CHARS = 2;
const MAX_RECIPIENTS = 32;

// ============================================================================
// Types
// ============================================================================

export type Channel =
  | "email"
  | "phone"
  | "meeting"
  | "written_letter"
  | "in_person"
  | "portal";

export type Direction = "outbound" | "inbound";

export type TopicKind =
  | "kickoff"
  | "parameter_change"
  | "schedule_slip"
  | "quality_issue"
  | "sev1_incident"
  | "pilot_exit"
  | "general";

export type EntryState = "open" | "acknowledged" | "closed";

export interface Acknowledgment {
  acknowledged_by: string;
  ack_ts: number;
  note?: string;
}

export interface CommsEntry {
  id: string;
  pilot_id: string;
  seq: number;
  ts: number;
  direction: Direction;
  channel: Channel;
  topic: TopicKind;
  author: string;
  recipients: string[];
  summary: string;
  related_incident_id?: string;
  state: EntryState;
  acknowledgment?: Acknowledgment;
  closed_at?: number;
  closed_by?: string;
  closure_reason?: string;
}

export interface RecordInput {
  pilot_id: string;
  ts: number;
  direction: Direction;
  channel: Channel;
  topic: TopicKind;
  author: string;
  recipients: string[];
  summary: string;
  related_incident_id?: string;
}

export interface AckInput {
  entry_id: string;
  ack_ts: number;
  acknowledged_by: string;
  note?: string;
}

export interface CloseInput {
  entry_id: string;
  closed_at: number;
  closed_by: string;
  reason: string;
}

export interface BreachReport {
  entry_id: string;
  pilot_id: string;
  topic: TopicKind;
  ts: number;
  sla_deadline_ts: number;
  hours_over_sla: number;
  summary: string;
}

export interface TopicSummary {
  topic: TopicKind;
  total: number;
  outbound: number;
  inbound: number;
  acknowledged: number;
  closed: number;
  open: number;
  breached: number;
}

export interface Snapshot {
  schemaVersion: 1;
  entries: CommsEntry[];
  last_seq_by_pilot: Record<string, number>;
  last_ts_by_pilot: Record<string, number>;
}

// ============================================================================
// Engine
// ============================================================================

export class WetRunCustomerCommunicationLogEngine {
  private entries: CommsEntry[] = [];
  private lastSeqByPilot = new Map<string, number>();
  private lastTsByPilot = new Map<string, number>();

  // --------------------------------------------------------------------
  // record
  // --------------------------------------------------------------------
  record(input: RecordInput): CommsEntry {
    this.validateNonEmpty(input.pilot_id, "pilot_id");
    this.validateNonEmpty(input.author, "author");
    this.validateChannel(input.channel);
    this.validateTopic(input.topic);
    this.validateDirection(input.direction);
    this.validateTs(input.ts);
    this.validateRecipients(input.recipients);
    this.validateSummary(input.summary);

    const prevTs = this.lastTsByPilot.get(input.pilot_id) ?? -Infinity;
    if (input.ts <= prevTs) {
      throw new Error(
        `timestamp not strictly monotonic for pilot=${input.pilot_id}: last=${prevTs} new=${input.ts}`,
      );
    }

    const prevSeq = this.lastSeqByPilot.get(input.pilot_id) ?? 0;
    const seq = prevSeq + 1;
    const id = this.makeId(input.pilot_id, seq);

    const entry: CommsEntry = {
      id,
      pilot_id: input.pilot_id,
      seq,
      ts: input.ts,
      direction: input.direction,
      channel: input.channel,
      topic: input.topic,
      author: input.author,
      recipients: [...input.recipients],
      summary: input.summary,
      related_incident_id: input.related_incident_id,
      state: "open",
    };

    this.entries.push(entry);
    this.lastSeqByPilot.set(input.pilot_id, seq);
    this.lastTsByPilot.set(input.pilot_id, input.ts);

    return { ...entry, recipients: [...entry.recipients] };
  }

  // --------------------------------------------------------------------
  // acknowledge
  // --------------------------------------------------------------------
  acknowledge(input: AckInput): CommsEntry {
    const entry = this.mustGet(input.entry_id);

    if (entry.direction !== "outbound") {
      throw new Error(
        `only outbound entries can be acknowledged: entry=${input.entry_id} direction=${entry.direction}`,
      );
    }
    if (entry.state === "closed") {
      throw new Error(`entry already closed: ${input.entry_id}`);
    }
    if (entry.state === "acknowledged") {
      throw new Error(`entry already acknowledged: ${input.entry_id}`);
    }
    if (!Number.isFinite(input.ack_ts)) {
      throw new Error(`ack_ts must be a finite number`);
    }
    if (input.ack_ts < entry.ts) {
      throw new Error(
        `ack_ts cannot precede entry ts: ack_ts=${input.ack_ts} entry_ts=${entry.ts}`,
      );
    }
    if (
      typeof input.acknowledged_by !== "string" ||
      input.acknowledged_by.trim().length < MIN_ACK_NAME_CHARS
    ) {
      throw new Error(
        `acknowledged_by must be at least ${MIN_ACK_NAME_CHARS} characters`,
      );
    }

    entry.state = "acknowledged";
    entry.acknowledgment = {
      acknowledged_by: input.acknowledged_by.trim(),
      ack_ts: input.ack_ts,
      note: input.note,
    };
    return { ...entry, recipients: [...entry.recipients] };
  }

  // --------------------------------------------------------------------
  // close
  // --------------------------------------------------------------------
  close(input: CloseInput): CommsEntry {
    const entry = this.mustGet(input.entry_id);

    if (entry.state === "closed") {
      throw new Error(`entry already closed: ${input.entry_id}`);
    }
    if (!Number.isFinite(input.closed_at)) {
      throw new Error(`closed_at must be a finite number`);
    }
    if (input.closed_at < entry.ts) {
      throw new Error(
        `closed_at cannot precede entry ts: closed_at=${input.closed_at} entry_ts=${entry.ts}`,
      );
    }
    if (
      typeof input.reason !== "string" ||
      input.reason.trim().length < 20
    ) {
      throw new Error(`closure reason must be at least 20 characters`);
    }
    if (!input.closed_by || input.closed_by.trim().length < 2) {
      throw new Error(`closed_by must be a named human`);
    }

    entry.state = "closed";
    entry.closed_at = input.closed_at;
    entry.closed_by = input.closed_by.trim();
    entry.closure_reason = input.reason.trim();
    return { ...entry, recipients: [...entry.recipients] };
  }

  // --------------------------------------------------------------------
  // listBreached — unacknowledged outbound entries past SLA
  // --------------------------------------------------------------------
  listBreached(nowTs: number, pilotId?: string): BreachReport[] {
    if (!Number.isFinite(nowTs)) {
      throw new Error(`nowTs must be a finite number`);
    }
    const breaches: BreachReport[] = [];
    for (const e of this.entries) {
      if (pilotId !== undefined && e.pilot_id !== pilotId) continue;
      if (e.direction !== "outbound") continue;
      if (e.state !== "open") continue;
      const window = SLA_WINDOW_MS[e.topic];
      if (window == null) continue;
      const deadline = e.ts + window;
      if (nowTs <= deadline) continue;
      const hoursOver = (nowTs - deadline) / HOUR_MS;
      breaches.push({
        entry_id: e.id,
        pilot_id: e.pilot_id,
        topic: e.topic,
        ts: e.ts,
        sla_deadline_ts: deadline,
        hours_over_sla: Math.round(hoursOver * 100) / 100,
        summary: e.summary,
      });
    }
    return breaches;
  }

  // --------------------------------------------------------------------
  // summariseByTopic
  // --------------------------------------------------------------------
  summariseByTopic(nowTs: number, pilotId?: string): TopicSummary[] {
    const buckets = new Map<TopicKind, TopicSummary>();
    const breached = new Set(
      this.listBreached(nowTs, pilotId).map((b) => b.entry_id),
    );

    for (const e of this.entries) {
      if (pilotId !== undefined && e.pilot_id !== pilotId) continue;
      let b = buckets.get(e.topic);
      if (!b) {
        b = {
          topic: e.topic,
          total: 0,
          outbound: 0,
          inbound: 0,
          acknowledged: 0,
          closed: 0,
          open: 0,
          breached: 0,
        };
        buckets.set(e.topic, b);
      }
      b.total += 1;
      if (e.direction === "outbound") b.outbound += 1;
      else b.inbound += 1;
      if (e.state === "acknowledged") b.acknowledged += 1;
      if (e.state === "closed") b.closed += 1;
      if (e.state === "open") b.open += 1;
      if (breached.has(e.id)) b.breached += 1;
    }
    return [...buckets.values()].sort((a, b) => a.topic.localeCompare(b.topic));
  }

  // --------------------------------------------------------------------
  // Readers
  // --------------------------------------------------------------------
  getEntry(id: string): CommsEntry | undefined {
    const e = this.entries.find((x) => x.id === id);
    return e ? { ...e, recipients: [...e.recipients] } : undefined;
  }

  listEntries(pilotId?: string): CommsEntry[] {
    const filtered = pilotId
      ? this.entries.filter((e) => e.pilot_id === pilotId)
      : this.entries;
    return filtered.map((e) => ({ ...e, recipients: [...e.recipients] }));
  }

  openCount(pilotId?: string): number {
    return this.listEntries(pilotId).filter((e) => e.state === "open").length;
  }

  breachedCount(nowTs: number, pilotId?: string): number {
    return this.listBreached(nowTs, pilotId).length;
  }

  snapshot(): Snapshot {
    const lastSeq: Record<string, number> = {};
    for (const [k, v] of this.lastSeqByPilot) lastSeq[k] = v;
    const lastTs: Record<string, number> = {};
    for (const [k, v] of this.lastTsByPilot) lastTs[k] = v;
    return {
      schemaVersion: 1,
      entries: this.entries.map((e) => ({
        ...e,
        recipients: [...e.recipients],
      })),
      last_seq_by_pilot: lastSeq,
      last_ts_by_pilot: lastTs,
    };
  }

  static slaWindowMs(topic: TopicKind): number | null {
    return SLA_WINDOW_MS[topic];
  }

  // --------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------
  private validateNonEmpty(value: string, label: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${label} must be a non-empty string`);
    }
  }

  private validateChannel(channel: Channel): void {
    const allowed: Channel[] = [
      "email",
      "phone",
      "meeting",
      "written_letter",
      "in_person",
      "portal",
    ];
    if (!allowed.includes(channel)) {
      throw new Error(`invalid channel: ${channel}`);
    }
  }

  private validateTopic(topic: TopicKind): void {
    if (!(topic in SLA_WINDOW_MS)) {
      throw new Error(`invalid topic: ${topic}`);
    }
  }

  private validateDirection(direction: Direction): void {
    if (direction !== "outbound" && direction !== "inbound") {
      throw new Error(`invalid direction: ${direction}`);
    }
  }

  private validateTs(ts: number): void {
    if (!Number.isFinite(ts)) {
      throw new Error(`ts must be a finite number`);
    }
  }

  private validateRecipients(recipients: string[]): void {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error(`recipients must be a non-empty array`);
    }
    if (recipients.length > MAX_RECIPIENTS) {
      throw new Error(
        `too many recipients (${recipients.length} > ${MAX_RECIPIENTS})`,
      );
    }
    const seen = new Set<string>();
    for (const r of recipients) {
      if (typeof r !== "string" || r.trim().length === 0) {
        throw new Error(`recipient must be non-empty string`);
      }
      const norm = r.trim().toLowerCase();
      if (seen.has(norm)) {
        throw new Error(`duplicate recipient: ${r}`);
      }
      seen.add(norm);
    }
  }

  private validateSummary(summary: string): void {
    if (typeof summary !== "string") {
      throw new Error(`summary must be a string`);
    }
    const trimmed = summary.trim();
    if (trimmed.length < MIN_SUMMARY_CHARS) {
      throw new Error(
        `summary must be at least ${MIN_SUMMARY_CHARS} characters (got ${trimmed.length})`,
      );
    }
  }

  private mustGet(id: string): CommsEntry {
    const e = this.entries.find((x) => x.id === id);
    if (!e) throw new Error(`entry not found: ${id}`);
    return e;
  }

  private makeId(pilotId: string, seq: number): string {
    return `comms:${pilotId}:${seq.toString().padStart(6, "0")}`;
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const wetRunCustomerCommunicationLogEngine =
  new WetRunCustomerCommunicationLogEngine();
