/**
 * OllamaIntegrationEngine — Phase 0.19 U-LLM2
 *
 * Operational layer on top of the raw `OllamaClientEngine` RPC client.
 * Tracks connection health, caches the installed-model roster, stores
 * per-task default model selection, and offers a `warmUp()` path that
 * pre-loads a model into VRAM so the first shop query isn't cold.
 *
 * The raw client does one thing (RPC). This engine is the "is Ollama
 * ready, and which model should we call?" brain that higher layers
 * (LocalModelOrchestrator, web status page, the `/model-status` skill)
 * can query without re-implementing boilerplate.
 *
 * Design rules:
 *   1. Never throw on health/polling. A down daemon is normal operational
 *      state, not an exception. Every probe returns a typed record.
 *   2. Host candidates are tried in order. The first reachable one wins
 *      and the choice is remembered.
 *   3. Default-model mapping is in-memory for now — serializing it is
 *      left to whichever caller owns persistent config (env vars, a
 *      future settings engine).
 *
 * @module engines/OllamaIntegrationEngine
 * @milestone PP-0.19-U-LLM2
 */

import { OllamaClientEngine } from "./OllamaClientEngine.js";
import type { TaskKind } from "./ModelRoutingEngine.js";

export interface OllamaHealth {
  connected: boolean;
  host: string | null;
  lastPingAt: string | null;
  lastPingOk: boolean;
  lastPingLatencyMs: number | null;
  avgLatencyMs: number | null;
  okStreak: number;
  failStreak: number;
  pingsAttempted: number;
}

export interface WarmUpReport {
  model: string;
  ok: boolean;
  wallMs: number;
  error?: string;
}

export interface OllamaStatus {
  health: OllamaHealth;
  installedModels: string[];
  defaultModels: Record<string, string>;
  lastRosterRefreshAt: string | null;
}

export interface OllamaIntegrationDeps {
  client?: OllamaClientEngine;
  hostCandidates?: string[];
  /** Number of latency samples kept for the rolling average. */
  latencyWindow?: number;
}

const DEFAULT_CANDIDATES = [
  "http://localhost:11434",
  "http://127.0.0.1:11434",
];

export class OllamaIntegrationEngine {
  private client: OllamaClientEngine;
  private hostCandidates: string[];
  private latencyWindow: number;

  private health: OllamaHealth = {
    connected: false,
    host: null,
    lastPingAt: null,
    lastPingOk: false,
    lastPingLatencyMs: null,
    avgLatencyMs: null,
    okStreak: 0,
    failStreak: 0,
    pingsAttempted: 0,
  };
  private latencySamples: number[] = [];
  private roster: string[] = [];
  private rosterAt: string | null = null;
  private defaultModels: Map<string, string> = new Map();

  constructor(deps: OllamaIntegrationDeps = {}) {
    this.client = deps.client ?? new OllamaClientEngine();
    this.hostCandidates = deps.hostCandidates?.length
      ? [...deps.hostCandidates]
      : [...DEFAULT_CANDIDATES];
    this.latencyWindow = deps.latencyWindow ?? 10;
  }

  /** Try to connect using candidate list; returns true if connected. */
  async ensureConnected(): Promise<boolean> {
    if (this.client.isConnected()) return true;
    for (const host of this.hostCandidates) {
      const r = await this.client.connect(host);
      if (r.ok) {
        this.health.connected = true;
        this.health.host = host;
        return true;
      }
    }
    this.health.connected = false;
    this.health.host = null;
    return false;
  }

  /** One health probe. Updates health state, never throws. */
  async ping(): Promise<OllamaHealth> {
    const started = Date.now();
    this.health.pingsAttempted++;
    this.health.lastPingAt = new Date().toISOString();

    if (!this.client.isConnected()) {
      const ok = await this.ensureConnected();
      if (!ok) {
        this.recordFailure(Date.now() - started);
        return this.snapshotHealth();
      }
    }

    // listModels() is a cheap "is the daemon alive" call that also
    // refreshes the roster as a bonus — kill two birds.
    const r = await this.client.listModels();
    const wall = Date.now() - started;
    if (r.ok) {
      this.recordSuccess(wall);
      this.roster = [...(r.value ?? [])].sort();
      this.rosterAt = new Date().toISOString();
      this.health.host = this.client.getHost();
    } else {
      this.recordFailure(wall);
    }
    return this.snapshotHealth();
  }

  /** Snapshot of current health — pure read, no I/O. */
  snapshotHealth(): OllamaHealth {
    return { ...this.health };
  }

  /** List installed models. Refreshes from daemon if stale or empty. */
  async discoverModels(forceRefresh = false): Promise<string[]> {
    if (!forceRefresh && this.roster.length > 0) return [...this.roster];
    if (!(await this.ensureConnected())) return [...this.roster];
    const r = await this.client.listModels();
    if (r.ok) {
      this.roster = [...(r.value ?? [])].sort();
      this.rosterAt = new Date().toISOString();
    }
    return [...this.roster];
  }

  isModelAvailable(name: string): boolean {
    return this.roster.includes(name);
  }

  /** Record a per-task default model (chat → mistral:7b, code → qwen…). */
  setDefaultModel(task: TaskKind | string, model: string): void {
    if (!model || model.trim() === "") throw new Error("model required");
    this.defaultModels.set(task, model);
  }

  getDefaultModel(task: TaskKind | string): string | null {
    return this.defaultModels.get(task) ?? null;
  }

  listDefaults(): Record<string, string> {
    return Object.fromEntries(this.defaultModels);
  }

  /**
   * Preload a model into VRAM by sending a tiny generate call. Returns
   * a report; failures are captured, not thrown.
   */
  async warmUp(model: string): Promise<WarmUpReport> {
    const started = Date.now();
    if (!model || model.trim() === "") {
      return { model, ok: false, wallMs: 0, error: "model required" };
    }
    if (!(await this.ensureConnected())) {
      return {
        model,
        ok: false,
        wallMs: Date.now() - started,
        error: "not connected",
      };
    }
    const r = await this.client.generate({
      model,
      prompt: "warmup",
      maxTokens: 1,
    });
    return {
      model,
      ok: r.ok,
      wallMs: Date.now() - started,
      error: r.ok ? undefined : (r.error ?? "unknown error"),
    };
  }

  /** Comprehensive status snapshot for status pages and skills. */
  status(): OllamaStatus {
    return {
      health: this.snapshotHealth(),
      installedModels: [...this.roster],
      defaultModels: this.listDefaults(),
      lastRosterRefreshAt: this.rosterAt,
    };
  }

  // ── internals ────────────────────────────────────────────────────────

  private recordSuccess(wallMs: number): void {
    this.health.connected = true;
    this.health.lastPingOk = true;
    this.health.lastPingLatencyMs = wallMs;
    this.health.okStreak++;
    this.health.failStreak = 0;
    this.latencySamples.push(wallMs);
    if (this.latencySamples.length > this.latencyWindow) {
      this.latencySamples.shift();
    }
    this.health.avgLatencyMs =
      this.latencySamples.reduce((s, v) => s + v, 0) /
      this.latencySamples.length;
  }

  private recordFailure(wallMs: number): void {
    this.health.connected = this.client.isConnected();
    this.health.lastPingOk = false;
    this.health.lastPingLatencyMs = wallMs;
    this.health.okStreak = 0;
    this.health.failStreak++;
  }
}

export const ollamaIntegrationEngine = new OllamaIntegrationEngine();
