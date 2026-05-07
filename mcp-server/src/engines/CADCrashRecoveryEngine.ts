/**
 * CADCrashRecoveryEngine — U-CAD-APP-13 (PHASE-48)
 *
 * Per-app watchdog for CAD crash detection, session re-attachment,
 * and command replay. Monitors CAD application health and provides
 * automatic recovery capabilities.
 *
 * Features:
 *   - Process health monitoring (heartbeat, memory, CPU)
 *   - Crash detection with exit code analysis
 *   - Session state checkpointing
 *   - Automatic re-attach after restart
 *   - Command journal for replay
 *   - Recovery policy configuration
 *
 * @module engines/CADCrashRecoveryEngine
 */

import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

export const CAD_APP_TYPES = [
  "SolidWorks",
  "CATIA",
  "NX",
  "Creo",
  "Inventor",
  "Fusion360",
  "Onshape",
  "Rhino",
  "AutoCAD",
  "FreeCAD",
] as const;
export type CADAppType = (typeof CAD_APP_TYPES)[number];

export const PROCESS_STATES = [
  "running",
  "suspended",
  "crashed",
  "terminated",
  "unknown",
] as const;
export type ProcessState = (typeof PROCESS_STATES)[number];

export const AppHealthSchema = z.object({
  appType: z.enum(CAD_APP_TYPES),
  processId: z.number().int().positive(),
  state: z.enum(PROCESS_STATES),
  memoryMb: z.number().nonnegative(),
  cpuPercent: z.number().min(0).max(100),
  lastHeartbeat: z.string().datetime(),
  uptimeMs: z.number().nonnegative(),
  responseTimeMs: z.number().nonnegative().optional(),
});
export type AppHealth = z.infer<typeof AppHealthSchema>;

export const CheckpointSchema = z.object({
  id: z.string(),
  appType: z.enum(CAD_APP_TYPES),
  sessionId: z.string(),
  documentPath: z.string().optional(),
  timestamp: z.string().datetime(),
  commandIndex: z.number().int().nonnegative(),
  stateHash: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;

export const JournalEntrySchema = z.object({
  index: z.number().int().nonnegative(),
  command: z.string(),
  args: z.record(z.string(), z.unknown()),
  timestamp: z.string().datetime(),
  durationMs: z.number().nonnegative(),
  success: z.boolean(),
  checkpointId: z.string().optional(),
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const RecoveryPolicySchema = z.object({
  maxRetries: z.number().int().nonnegative().default(3),
  retryDelayMs: z.number().int().positive().default(5000),
  autoReattach: z.boolean().default(true),
  autoReplay: z.boolean().default(false),
  replayFromCheckpoint: z.boolean().default(true),
  maxReplayCommands: z.number().int().positive().default(100),
  notifyOnCrash: z.boolean().default(true),
  createBackup: z.boolean().default(true),
});
export type RecoveryPolicy = z.infer<typeof RecoveryPolicySchema>;

export const CrashEventSchema = z.object({
  id: z.string(),
  appType: z.enum(CAD_APP_TYPES),
  processId: z.number().int().positive(),
  sessionId: z.string(),
  timestamp: z.string().datetime(),
  exitCode: z.number().int().optional(),
  signal: z.string().optional(),
  lastCheckpointId: z.string().optional(),
  recoveryAttempts: z.number().int().nonnegative(),
  recovered: z.boolean(),
  errorMessage: z.string().optional(),
});
export type CrashEvent = z.infer<typeof CrashEventSchema>;

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface CADRecoveryClock {
  now(): string;
  monotonicMs(): number;
}

export interface CADRecoveryTransport {
  getProcessHealth(appType: CADAppType, processId: number): AppHealth | null;
  restartApp(appType: CADAppType): { processId: number; success: boolean };
  attachToProcess(appType: CADAppType, processId: number): boolean;
  executeCommand(appType: CADAppType, command: string, args: Record<string, unknown>): boolean;
  loadDocument(appType: CADAppType, path: string): boolean;
}

function defaultClock(): CADRecoveryClock {
  return {
    now: () => new Date().toISOString(),
    monotonicMs: () => Date.now(),
  };
}

// ── Event Types ─────────────────────────────────────────────────────────────

type CrashSubscriber = (event: CrashEvent) => void;
type RecoverySubscriber = (event: CrashEvent, success: boolean) => void;

// ── Engine Implementation ───────────────────────────────────────────────────

export class CADCrashRecoveryEngine {
  private transport: CADRecoveryTransport;
  private clock: CADRecoveryClock;

  private sessions = new Map<string, { appType: CADAppType; processId: number; documentPath?: string }>();
  private checkpoints = new Map<string, Checkpoint>();
  private journals = new Map<string, JournalEntry[]>();
  private policies = new Map<string, RecoveryPolicy>();
  private crashEvents: CrashEvent[] = [];

  private crashSubscribers: CrashSubscriber[] = [];
  private recoverySubscribers: RecoverySubscriber[] = [];

  private heartbeatIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private defaultPolicy: RecoveryPolicy;
  private crashCounter = 0;
  private checkpointCounter = 0;

  constructor(opts: {
    transport: CADRecoveryTransport;
    clock?: CADRecoveryClock;
    defaultPolicy?: Partial<RecoveryPolicy>;
  }) {
    this.transport = opts.transport;
    this.clock = opts.clock ?? defaultClock();
    this.defaultPolicy = RecoveryPolicySchema.parse(opts.defaultPolicy ?? {});
  }

  // ── Session Management ────────────────────────────────────────────────────

  registerSession(
    sessionId: string,
    appType: CADAppType,
    processId: number,
    opts: { documentPath?: string; policy?: Partial<RecoveryPolicy> } = {},
  ): void {
    this.sessions.set(sessionId, { appType, processId, documentPath: opts.documentPath });
    this.journals.set(sessionId, []);
    if (opts.policy) {
      this.policies.set(sessionId, RecoveryPolicySchema.parse({ ...this.defaultPolicy, ...opts.policy }));
    }
  }

  unregisterSession(sessionId: string): boolean {
    this.stopHeartbeat(sessionId);
    this.sessions.delete(sessionId);
    this.journals.delete(sessionId);
    this.policies.delete(sessionId);
    return true;
  }

  getSession(sessionId: string): { appType: CADAppType; processId: number; documentPath?: string } | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): string[] {
    return [...this.sessions.keys()];
  }

  // ── Health Monitoring ─────────────────────────────────────────────────────

  checkHealth(sessionId: string): AppHealth | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return this.transport.getProcessHealth(session.appType, session.processId);
  }

  startHeartbeat(sessionId: string, intervalMs: number = 5000): boolean {
    if (this.heartbeatIntervals.has(sessionId)) return false;
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const interval = setInterval(() => {
      const health = this.checkHealth(sessionId);
      if (!health || health.state === "crashed" || health.state === "terminated") {
        this.handleCrash(sessionId, health?.state === "crashed" ? -1 : 0);
      }
    }, intervalMs);

    this.heartbeatIntervals.set(sessionId, interval);
    return true;
  }

  stopHeartbeat(sessionId: string): boolean {
    const interval = this.heartbeatIntervals.get(sessionId);
    if (!interval) return false;
    clearInterval(interval);
    this.heartbeatIntervals.delete(sessionId);
    return true;
  }

  isHeartbeatActive(sessionId: string): boolean {
    return this.heartbeatIntervals.has(sessionId);
  }

  // ── Checkpointing ─────────────────────────────────────────────────────────

  createCheckpoint(sessionId: string, opts: { stateHash?: string; metadata?: Record<string, unknown> } = {}): Checkpoint | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const journal = this.journals.get(sessionId) ?? [];
    this.checkpointCounter++;

    const checkpoint: Checkpoint = {
      id: `ckpt-${this.checkpointCounter}-${Date.now()}`,
      appType: session.appType,
      sessionId,
      documentPath: session.documentPath,
      timestamp: this.clock.now(),
      commandIndex: journal.length,
      stateHash: opts.stateHash ?? this.computeHash(journal),
      metadata: opts.metadata,
    };

    this.checkpoints.set(checkpoint.id, checkpoint);
    return checkpoint;
  }

  getCheckpoint(checkpointId: string): Checkpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  getLatestCheckpoint(sessionId: string): Checkpoint | undefined {
    let latest: Checkpoint | undefined;
    for (const ckpt of this.checkpoints.values()) {
      if (ckpt.sessionId === sessionId) {
        if (!latest || ckpt.commandIndex > latest.commandIndex) {
          latest = ckpt;
        }
      }
    }
    return latest;
  }

  listCheckpoints(sessionId?: string): Checkpoint[] {
    const all = [...this.checkpoints.values()];
    if (sessionId) return all.filter(c => c.sessionId === sessionId);
    return all;
  }

  deleteCheckpoint(checkpointId: string): boolean {
    return this.checkpoints.delete(checkpointId);
  }

  // ── Command Journal ───────────────────────────────────────────────────────

  recordCommand(
    sessionId: string,
    command: string,
    args: Record<string, unknown>,
    result: { durationMs: number; success: boolean },
  ): JournalEntry | null {
    const journal = this.journals.get(sessionId);
    if (!journal) return null;

    const entry: JournalEntry = {
      index: journal.length,
      command,
      args,
      timestamp: this.clock.now(),
      durationMs: result.durationMs,
      success: result.success,
    };

    journal.push(entry);
    return entry;
  }

  getJournal(sessionId: string): JournalEntry[] {
    return this.journals.get(sessionId) ?? [];
  }

  getJournalSince(sessionId: string, checkpointId: string): JournalEntry[] {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) return [];
    const journal = this.journals.get(sessionId) ?? [];
    return journal.slice(checkpoint.commandIndex);
  }

  clearJournal(sessionId: string): number {
    const journal = this.journals.get(sessionId);
    if (!journal) return 0;
    const count = journal.length;
    this.journals.set(sessionId, []);
    return count;
  }

  // ── Crash Handling ────────────────────────────────────────────────────────

  handleCrash(sessionId: string, exitCode?: number, signal?: string): CrashEvent {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown session: ${sessionId}`);
    }

    this.stopHeartbeat(sessionId);
    this.crashCounter++;

    const lastCheckpoint = this.getLatestCheckpoint(sessionId);

    const event: CrashEvent = {
      id: `crash-${this.crashCounter}`,
      appType: session.appType,
      processId: session.processId,
      sessionId,
      timestamp: this.clock.now(),
      exitCode,
      signal,
      lastCheckpointId: lastCheckpoint?.id,
      recoveryAttempts: 0,
      recovered: false,
    };

    this.crashEvents.push(event);
    this.notifyCrash(event);

    const policy = this.policies.get(sessionId) ?? this.defaultPolicy;
    if (policy.autoReattach) {
      this.attemptRecovery(event, policy);
    }

    return event;
  }

  attemptRecovery(event: CrashEvent, policy?: RecoveryPolicy): boolean {
    const resolvedPolicy = policy ?? this.policies.get(event.sessionId) ?? this.defaultPolicy;
    const session = this.sessions.get(event.sessionId);
    if (!session) return false;

    for (let attempt = 0; attempt < resolvedPolicy.maxRetries; attempt++) {
      event.recoveryAttempts++;

      const restart = this.transport.restartApp(event.appType);
      if (!restart.success) continue;

      const attached = this.transport.attachToProcess(event.appType, restart.processId);
      if (!attached) continue;

      session.processId = restart.processId;

      if (session.documentPath) {
        const loaded = this.transport.loadDocument(event.appType, session.documentPath);
        if (!loaded) continue;
      }

      if (resolvedPolicy.autoReplay && resolvedPolicy.replayFromCheckpoint) {
        const replaySuccess = this.replayFromCheckpoint(event.sessionId, event.lastCheckpointId, resolvedPolicy.maxReplayCommands);
        if (!replaySuccess) continue;
      }

      event.recovered = true;
      this.notifyRecovery(event, true);
      return true;
    }

    event.errorMessage = `Recovery failed after ${event.recoveryAttempts} attempts`;
    this.notifyRecovery(event, false);
    return false;
  }

  replayFromCheckpoint(sessionId: string, checkpointId?: string, maxCommands?: number): boolean {
    if (!checkpointId) return true;

    const commands = this.getJournalSince(sessionId, checkpointId);
    const limit = maxCommands ?? commands.length;
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    for (let i = 0; i < Math.min(commands.length, limit); i++) {
      const cmd = commands[i];
      const success = this.transport.executeCommand(session.appType, cmd.command, cmd.args);
      if (!success) return false;
    }

    return true;
  }

  // ── Event Subscriptions ───────────────────────────────────────────────────

  onCrash(callback: CrashSubscriber): () => void {
    this.crashSubscribers.push(callback);
    return () => {
      const idx = this.crashSubscribers.indexOf(callback);
      if (idx >= 0) this.crashSubscribers.splice(idx, 1);
    };
  }

  onRecovery(callback: RecoverySubscriber): () => void {
    this.recoverySubscribers.push(callback);
    return () => {
      const idx = this.recoverySubscribers.indexOf(callback);
      if (idx >= 0) this.recoverySubscribers.splice(idx, 1);
    };
  }

  // ── Crash History ─────────────────────────────────────────────────────────

  getCrashHistory(opts?: { sessionId?: string; limit?: number }): CrashEvent[] {
    let events = [...this.crashEvents];
    if (opts?.sessionId) events = events.filter(e => e.sessionId === opts.sessionId);
    if (opts?.limit) events = events.slice(-opts.limit);
    return events;
  }

  clearCrashHistory(): number {
    const count = this.crashEvents.length;
    this.crashEvents = [];
    return count;
  }

  // ── Policy Management ─────────────────────────────────────────────────────

  setPolicy(sessionId: string, policy: Partial<RecoveryPolicy>): void {
    const existing = this.policies.get(sessionId) ?? this.defaultPolicy;
    this.policies.set(sessionId, RecoveryPolicySchema.parse({ ...existing, ...policy }));
  }

  getPolicy(sessionId: string): RecoveryPolicy {
    return this.policies.get(sessionId) ?? this.defaultPolicy;
  }

  setDefaultPolicy(policy: Partial<RecoveryPolicy>): void {
    this.defaultPolicy = RecoveryPolicySchema.parse({ ...this.defaultPolicy, ...policy });
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private computeHash(journal: JournalEntry[]): string {
    const content = journal.map(e => `${e.command}:${JSON.stringify(e.args)}`).join("|");
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
    }
    return hash.toString(16);
  }

  private notifyCrash(event: CrashEvent): void {
    for (const sub of this.crashSubscribers) {
      try { sub(event); } catch { /* ignore */ }
    }
  }

  private notifyRecovery(event: CrashEvent, success: boolean): void {
    for (const sub of this.recoverySubscribers) {
      try { sub(event, success); } catch { /* ignore */ }
    }
  }
}
