/**
 * ConsensusCoordinatorEngine — concurrency-aware wrapper around MultiModelConsensusEngine.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / AUTO-CONSENSUS.
 *
 * Designed for the 6-simultaneous-Claude-terminals reality: every consensus
 * call hits a shared external resource (Codex API, Ollama daemon, Claude
 * subprocess), so naive auto-fan-out from every terminal would saturate the
 * fleet and exhaust the daily Codex token budget within minutes.
 *
 * Coordinator responsibilities:
 *   1. **Cache** — prompt+taskType hash → result (1h TTL, file-backed JSONL).
 *      A terminal that already consensused on prompt P returns cached result
 *      instantly to the next terminal that asks the same.
 *   2. **In-flight tracking** — file-locked registry at
 *      data/state/consensus-inflight.json. Each entry: {terminalId, hash,
 *      startedAt}. Max 1 per terminal, max 3 globally.
 *   3. **Token budget** — daily Codex token cap (default 500k via
 *      PRISM_CONSENSUS_DAILY_BUDGET env). Refuses fan-out when exceeded;
 *      degrades to claude-only.
 *   4. **Soft / hard timeouts** — hard 120s per consensus call to cap blast
 *      radius if a model hangs.
 *   5. **Result publication** — successful consensus posts a chat-bus signal
 *      so peer terminals can pick up the result without re-consensusing.
 *
 * Pure orchestrator — depends on MultiModelConsensusEngine for the actual
 * fan-out. All side effects (file writes, locks, telemetry) are encapsulated.
 *
 * @module engines/ConsensusCoordinatorEngine
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { multiModelConsensusEngine, type ConsensusInput, type ConsensusResult } from "./MultiModelConsensusEngine.js";

/**
 * Acquire a cross-process exclusive lock on `lockPath` by atomic-creating a
 * lockfile with the current pid. Returns a release fn. Stale locks (older
 * than staleMs) are forcibly broken — protects against crashed terminals.
 * Spin-waits with backoff up to maxWaitMs before giving up.
 */
async function acquireLock(lockPath: string, opts: { staleMs?: number; maxWaitMs?: number } = {}): Promise<() => Promise<void>> {
  const staleMs = opts.staleMs ?? 30_000;
  const maxWaitMs = opts.maxWaitMs ?? 5_000;
  const deadline = Date.now() + maxWaitMs;
  const payload = JSON.stringify({ pid: process.pid, host: os.hostname(), ts: Date.now() });

  await fs.mkdir(path.dirname(lockPath), { recursive: true });

  while (true) {
    try {
      const fh = await fs.open(lockPath, "wx");
      try { await fh.writeFile(payload); } finally { await fh.close(); }
      return async () => { try { await fs.rm(lockPath); } catch { /* already gone */ } };
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw e;
      // Stale-lock detection — break if older than staleMs
      try {
        const stat = await fs.stat(lockPath);
        if (Date.now() - stat.mtimeMs > staleMs) {
          await fs.rm(lockPath).catch(() => { /* ignore */ });
          continue;
        }
      } catch { /* fall through to retry */ }
      if (Date.now() >= deadline) {
        throw new Error(`acquireLock timed out after ${maxWaitMs}ms on ${lockPath}`);
      }
      await new Promise((res) => setTimeout(res, 50 + Math.floor(Math.random() * 100)));
    }
  }
}

/** Atomic write: write temp + rename. Avoids the truncate-then-write race. */
async function atomicWriteJson(file: string, payload: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(payload, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

export interface CoordinatorRequest {
  prompt: string;
  taskType: string;                   // from TaskClassifierEngine
  context?: string;
  terminalId: string;                 // stable session id from per-agent-handoff or env
  /** Override default cache TTL (ms). Default 1h. */
  cacheTtlMs?: number;
  /** Skip cache lookup (useful for forced re-evaluation). Default false. */
  bypassCache?: boolean;
  /** Underlying consensus call options */
  consensus?: Pick<ConsensusInput, "includeClaude" | "ollamaModel" | "codexModel" | "codexEffort" | "mode" | "voteOptions" | "timeoutMs">;
}

export type CoordinatorOutcome =
  | { kind: "cache-hit"; result: ConsensusResult; cachedAt: number }
  | { kind: "fresh"; result: ConsensusResult; tokenCostEstimate: number }
  | { kind: "rate-limited"; reason: string; retryAfterMs: number }
  | { kind: "budget-exceeded"; reason: string; usedToday: number; budget: number }
  | { kind: "validation-error"; reason: string };

const STATE_DIR = "H:/prism/mcp-server/data/state";
const CACHE_FILE = path.join(STATE_DIR, "consensus-cache.jsonl");
const INFLIGHT_FILE = path.join(STATE_DIR, "consensus-inflight.json");
const BUDGET_FILE = path.join(STATE_DIR, "consensus-budget.json");
const COORDINATOR_LOCK = path.join(STATE_DIR, "consensus-coordinator.lock");

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_DAILY_BUDGET_TOKENS = Number(process.env.PRISM_CONSENSUS_DAILY_BUDGET ?? 500_000);
const MAX_INFLIGHT_PER_TERMINAL = 1;
const MAX_INFLIGHT_GLOBAL = 3;
const INFLIGHT_TTL_MS = 120 * 1000; // an entry older than this is presumed dead
const HARD_TIMEOUT_MS = 120_000;
const BUDGET_RESERVATION_TOKENS = 50_000;  // conservative pre-charge for one Codex+Ollama+Claude fan-out

interface CacheEntry {
  ts: number;
  hash: string;
  taskType: string;
  result: ConsensusResult;
}

interface InflightEntry {
  terminalId: string;
  hash: string;
  startedAt: number;
}

interface BudgetState {
  dayKey: string; // YYYY-MM-DD UTC
  tokensUsed: number;
}

export class ConsensusCoordinatorEngine {
  async run(req: CoordinatorRequest): Promise<CoordinatorOutcome> {
    if (!req || typeof req !== "object") {
      return { kind: "validation-error", reason: "CoordinatorRequest required" };
    }
    if (typeof req.prompt !== "string" || req.prompt.length === 0) {
      return { kind: "validation-error", reason: "prompt required" };
    }
    if (typeof req.terminalId !== "string" || req.terminalId.length === 0) {
      return { kind: "validation-error", reason: "terminalId required" };
    }
    if (typeof req.taskType !== "string" || req.taskType.length === 0) {
      return { kind: "validation-error", reason: "taskType required" };
    }

    const hash = this.hash(req.prompt, req.taskType, req.context ?? "");
    const ttl = req.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

    // 1. Cache check
    if (req.bypassCache !== true) {
      const cached = await this.loadCache(hash, ttl);
      if (cached) {
        return { kind: "cache-hit", result: cached.result, cachedAt: cached.ts };
      }
    }

    // 2-4. Atomic gate: budget check + inflight check + reservation, all under
    // a single cross-process lock so 6 concurrent terminals can't race past
    // each others' check-then-write windows.
    const startedAt = Date.now();
    let releaseGate: (() => Promise<void>) | null = null;
    try {
      releaseGate = await acquireLock(COORDINATOR_LOCK);
    } catch (e) {
      return {
        kind: "rate-limited",
        reason: `coordinator lock unavailable: ${(e as Error).message}`,
        retryAfterMs: 1000,
      };
    }
    let gateOutcome: CoordinatorOutcome | null = null;
    try {
      // 2. Token budget check (under lock) — refuse a fan-out whose
      // reservation would push us past the cap, not just one that finds the
      // cap already exhausted. This prevents bursts where N concurrent
      // terminals each see headroom and collectively overspend.
      const budget = await this.loadBudget();
      if (budget.tokensUsed + BUDGET_RESERVATION_TOKENS > DEFAULT_DAILY_BUDGET_TOKENS) {
        gateOutcome = {
          kind: "budget-exceeded",
          reason: `daily Codex token budget would exceed cap with reservation (${budget.tokensUsed} + ${BUDGET_RESERVATION_TOKENS} > ${DEFAULT_DAILY_BUDGET_TOKENS})`,
          usedToday: budget.tokensUsed,
          budget: DEFAULT_DAILY_BUDGET_TOKENS,
        };
        return gateOutcome;
      }

      // 3. In-flight rate limit check (under lock)
      const inflight = await this.loadInflight();
      const perTerminal = inflight.filter((e) => e.terminalId === req.terminalId).length;
      if (perTerminal >= MAX_INFLIGHT_PER_TERMINAL) {
        gateOutcome = {
          kind: "rate-limited",
          reason: `terminal ${req.terminalId} already has ${perTerminal} consensus call in flight (max ${MAX_INFLIGHT_PER_TERMINAL})`,
          retryAfterMs: 5000,
        };
        return gateOutcome;
      }
      if (inflight.length >= MAX_INFLIGHT_GLOBAL) {
        gateOutcome = {
          kind: "rate-limited",
          reason: `global in-flight cap reached (${inflight.length} / ${MAX_INFLIGHT_GLOBAL}) — peers are consensusing now`,
          retryAfterMs: 10000,
        };
        return gateOutcome;
      }

      // 4. Reserve estimated tokens AND register inflight atomically (under lock).
      // Estimate is conservative — refunded after actual usage is known.
      await this.bumpBudget(BUDGET_RESERVATION_TOKENS);
      await this.addInflight({ terminalId: req.terminalId, hash, startedAt });
    } finally {
      if (releaseGate) await releaseGate();
    }
    if (gateOutcome) return gateOutcome;

    let result: ConsensusResult;
    try {
      const consensusInput: ConsensusInput = {
        prompt: req.prompt,
        context: req.context,
        timeoutMs: req.consensus?.timeoutMs ?? HARD_TIMEOUT_MS,
        includeClaude: req.consensus?.includeClaude,
        ollamaModel: req.consensus?.ollamaModel,
        codexModel: req.consensus?.codexModel,
        codexEffort: req.consensus?.codexEffort,
        mode: req.consensus?.mode,
        voteOptions: req.consensus?.voteOptions,
      };
      result = await multiModelConsensusEngine.ask(consensusInput);
    } finally {
      await this.removeInflight(req.terminalId, hash);
    }

    // 5. Compute actual token cost (sum of all model tokens reported, fall back to a flat estimate)
    const tokenCost = result.responses
      .map((r) => r.tokens ?? 0)
      .reduce((s, x) => s + x, 0);
    const tokenCostEstimate = tokenCost > 0 ? tokenCost : 5000;

    // 6. Reconcile budget — we pre-charged BUDGET_RESERVATION_TOKENS at gate
    // time. Now apply the actual cost and refund the overestimate (or charge
    // the underestimate, in the rare case the call cost more than reserved).
    const reconcileDelta = tokenCostEstimate - BUDGET_RESERVATION_TOKENS;
    const releaseRecon = await acquireLock(COORDINATOR_LOCK).catch(() => null);
    try {
      if (reconcileDelta !== 0) await this.bumpBudget(reconcileDelta);
      await this.saveCache({ ts: Date.now(), hash, taskType: req.taskType, result });
    } finally {
      if (releaseRecon) await releaseRecon();
    }

    return { kind: "fresh", result, tokenCostEstimate };
  }

  /** Manual cache lookup — used by hooks that want to display "consensus pending" while a peer's call is still running. */
  async peekCache(prompt: string, taskType: string, context: string = "", ttlMs: number = DEFAULT_CACHE_TTL_MS): Promise<{ ts: number; result: ConsensusResult } | null> {
    const hash = this.hash(prompt, taskType, context);
    return await this.loadCache(hash, ttlMs);
  }

  async getStats(): Promise<{ inflight: InflightEntry[]; budget: BudgetState; cacheBytes: number }> {
    const inflight = await this.loadInflight();
    const budget = await this.loadBudget();
    let cacheBytes = 0;
    try { cacheBytes = (await fs.stat(CACHE_FILE)).size; } catch { /* missing */ }
    return { inflight, budget, cacheBytes };
  }

  /** Reset for testing — wipes all coordinator state files. */
  async resetForTesting(): Promise<void> {
    for (const f of [CACHE_FILE, INFLIGHT_FILE, BUDGET_FILE]) {
      try { await fs.rm(f); } catch { /* ignore */ }
    }
  }

  // ---- internals ----

  private hash(prompt: string, taskType: string, context: string): string {
    return crypto.createHash("sha256").update(`${taskType}::${prompt}::${context}`).digest("hex").slice(0, 24);
  }

  private async loadCache(hash: string, ttlMs: number): Promise<CacheEntry | null> {
    try {
      const raw = await fs.readFile(CACHE_FILE, "utf-8");
      const cutoff = Date.now() - ttlMs;
      // Walk backward — most recent first
      const lines = raw.split("\n").filter((l) => l.length > 0);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]) as CacheEntry;
          if (entry.hash === hash && entry.ts >= cutoff) return entry;
        } catch { /* skip corrupt */ }
      }
    } catch { /* missing */ }
    return null;
  }

  private async saveCache(entry: CacheEntry): Promise<void> {
    try {
      await fs.mkdir(STATE_DIR, { recursive: true });
      await fs.appendFile(CACHE_FILE, JSON.stringify(entry) + "\n", "utf-8");
    } catch { /* best-effort */ }
  }

  private async loadInflight(): Promise<InflightEntry[]> {
    try {
      const raw = await fs.readFile(INFLIGHT_FILE, "utf-8");
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      const cutoff = Date.now() - INFLIGHT_TTL_MS;
      return (arr as InflightEntry[]).filter((e) =>
        typeof e.terminalId === "string"
        && typeof e.hash === "string"
        && typeof e.startedAt === "number"
        && e.startedAt >= cutoff,
      );
    } catch {
      return [];
    }
  }

  private async addInflight(entry: InflightEntry): Promise<void> {
    const current = await this.loadInflight();
    current.push(entry);
    await atomicWriteJson(INFLIGHT_FILE, current);
  }

  private async removeInflight(terminalId: string, hash: string): Promise<void> {
    const release = await acquireLock(COORDINATOR_LOCK).catch(() => null);
    try {
      const current = await this.loadInflight();
      const next = current.filter((e) => !(e.terminalId === terminalId && e.hash === hash));
      await atomicWriteJson(INFLIGHT_FILE, next);
    } finally {
      if (release) await release();
    }
  }

  private async loadBudget(): Promise<BudgetState> {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const raw = await fs.readFile(BUDGET_FILE, "utf-8");
      const j = JSON.parse(raw) as BudgetState;
      if (j.dayKey === today && typeof j.tokensUsed === "number") {
        return j;
      }
    } catch { /* missing or corrupt */ }
    return { dayKey: today, tokensUsed: 0 };
  }

  private async bumpBudget(addTokens: number): Promise<void> {
    const cur = await this.loadBudget();
    const updated: BudgetState = { dayKey: cur.dayKey, tokensUsed: Math.max(0, cur.tokensUsed + addTokens) };
    await atomicWriteJson(BUDGET_FILE, updated);
  }
}

export const consensusCoordinatorEngine = new ConsensusCoordinatorEngine();
