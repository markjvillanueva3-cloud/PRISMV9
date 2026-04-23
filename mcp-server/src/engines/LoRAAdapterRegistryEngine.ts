/**
 * LoRAAdapterRegistryEngine — U-LEARN-07
 * =======================================
 *
 * Cross-domain registry of every trained LoRA adapter PRISM knows about.
 * One active adapter per (domain, context-key); older versions stay archived
 * for instant rollback. Persists to state/adapters/registry.jsonl (append-only)
 * with atomic writes.
 *
 * Lifecycle: staged → shadow → canary → active. Older active → archived on
 * successor promotion. rollback() flips (archived ↔ active) atomically.
 *
 * Invariants:
 *   - One "active" adapter per (domain, context-key). Enforced on setStatus.
 *   - Persistence is append-only. `current_state` is a projection: replay
 *     all entries in order → materialize latest-wins state. Readers can
 *     audit every change by scanning the log.
 *   - Never throws — bad input returns {ok, warning}.
 *
 * @module engines/LoRAAdapterRegistryEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-07
 */

import fs from "node:fs";
import path from "node:path";
import {
  LoRAAdapterSchema,
  RegisterAdapterInputSchema,
  SetStatusInputSchema,
  ResolveAdapterInputSchema,
  type LoRAAdapter,
  type RegisterAdapterInput,
  type SetStatusInput,
  type ResolveAdapterInput,
  type AdapterContext,
  type AdapterStatusT,
} from "../schemas/loraAdapterSchema.js";
import type { OutcomeDomainT } from "../schemas/outcomeEventSchema.js";

const REGISTRY_DIR = path.resolve(process.cwd(), "state/adapters");
const REGISTRY_FILE = "registry.jsonl";
const SCHEMA_VERSION = "1.0.0" as const;

export interface OpResult {
  ok: boolean;
  adapter_id: string;
  warning?: string;
}

export class LoRAAdapterRegistryEngine {
  private readonly rootDir: string;

  constructor(rootDir: string = REGISTRY_DIR) {
    this.rootDir = rootDir;
  }

  /**
   * Register a new adapter. If adapter_id already exists, updates context/
   * residual fields and writes a new registry entry (append-only history).
   */
  register(input: RegisterAdapterInput): OpResult {
    const parsed = RegisterAdapterInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, adapter_id: input.adapter_id ?? "", warning: `schema validation failed: ${parsed.error.message}` };
    }
    const now = new Date().toISOString();
    const existing = this.materialize().get(parsed.data.adapter_id);
    const adapter: LoRAAdapter = {
      schemaVersion: SCHEMA_VERSION,
      adapter_id: parsed.data.adapter_id,
      domain: parsed.data.domain,
      version: parsed.data.version,
      context: parsed.data.context,
      status: parsed.data.status,
      model_checkpoint_id: parsed.data.model_checkpoint_id,
      residual: parsed.data.residual ?? {},
      training_brier: parsed.data.training_brier,
      confidence: parsed.data.confidence,
      created_ts: existing?.created_ts ?? now,
      updated_ts: now,
      notes: parsed.data.notes,
    };
    const check = LoRAAdapterSchema.safeParse(adapter);
    if (!check.success) {
      return { ok: false, adapter_id: adapter.adapter_id, warning: `adapter check failed: ${check.error.message}` };
    }

    // If setting this adapter to "active", demote the existing active peer.
    if (adapter.status === "active") {
      this.demoteActivePeers(adapter.domain, adapter.context, adapter.adapter_id, now);
    }

    return this.appendAdapter(adapter);
  }

  /**
   * Change status of an existing adapter. Promoting a new one to "active"
   * atomically demotes the current active peer (same domain + same context-key)
   * to "archived".
   */
  setStatus(input: SetStatusInput): OpResult {
    const parsed = SetStatusInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, adapter_id: input.adapter_id ?? "", warning: `schema validation failed: ${parsed.error.message}` };
    }
    const state = this.materialize();
    const cur = state.get(parsed.data.adapter_id);
    if (!cur) {
      return { ok: false, adapter_id: parsed.data.adapter_id, warning: `unknown adapter_id: ${parsed.data.adapter_id}` };
    }
    const now = new Date().toISOString();
    if (parsed.data.status === "active") {
      this.demoteActivePeers(cur.domain, cur.context, cur.adapter_id, now);
    }
    const next: LoRAAdapter = { ...cur, status: parsed.data.status, updated_ts: now, notes: parsed.data.reason ?? cur.notes };
    return this.appendAdapter(next);
  }

  /**
   * Rollback: find the most recently archived peer of a now-undesired active
   * adapter and flip it back to active. The current active becomes archived.
   */
  rollback(domain: OutcomeDomainT, context: AdapterContext): OpResult {
    const state = this.materialize();
    const key = contextKey(context);
    const peers = Array.from(state.values()).filter((a) =>
      a.domain === domain && contextKey(a.context) === key,
    );
    const active = peers.find((p) => p.status === "active");
    const archived = peers
      .filter((p) => p.status === "archived")
      .sort((a, b) => b.updated_ts.localeCompare(a.updated_ts))[0];
    if (!active && !archived) {
      return { ok: false, adapter_id: "", warning: "no adapters to roll back for this context" };
    }
    const now = new Date().toISOString();
    if (active) this.appendAdapter({ ...active, status: "archived", updated_ts: now, notes: "rolled back by peer" });
    if (archived) this.appendAdapter({ ...archived, status: "active", updated_ts: now, notes: "restored via rollback" });
    return { ok: true, adapter_id: archived?.adapter_id ?? active?.adapter_id ?? "" };
  }

  /**
   * Resolve the best-matching adapter for a given (domain, context). Exact
   * context-key match wins; otherwise partial-match scoring picks the
   * adapter overlapping the most context keys.
   */
  resolve(input: ResolveAdapterInput): { adapter: LoRAAdapter | null; match_score: number } {
    const parsed = ResolveAdapterInputSchema.safeParse(input);
    if (!parsed.success) return { adapter: null, match_score: 0 };
    const state = this.materialize();
    const allowed = new Set(parsed.data.require_status);
    const candidates = Array.from(state.values()).filter((a) =>
      a.domain === parsed.data.domain && allowed.has(a.status),
    );
    if (candidates.length === 0) return { adapter: null, match_score: 0 };

    let best: LoRAAdapter | null = null;
    let bestScore = -1;
    for (const c of candidates) {
      const score = contextMatchScore(c.context, parsed.data.context);
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }
    return { adapter: best, match_score: Math.max(0, bestScore) };
  }

  /**
   * List all known adapters with their materialized latest state.
   */
  list(domain?: OutcomeDomainT, status?: AdapterStatusT): LoRAAdapter[] {
    const state = this.materialize();
    return Array.from(state.values()).filter((a) =>
      (!domain || a.domain === domain) && (!status || a.status === status),
    );
  }

  stats(): { root_dir: string; total: number; by_domain: Record<string, number>; by_status: Record<string, number> } {
    const state = this.materialize();
    const by_domain: Record<string, number> = {};
    const by_status: Record<string, number> = {};
    for (const a of state.values()) {
      by_domain[a.domain] = (by_domain[a.domain] ?? 0) + 1;
      by_status[a.status] = (by_status[a.status] ?? 0) + 1;
    }
    return { root_dir: this.rootDir, total: state.size, by_domain, by_status };
  }

  // ------------------------------------------------------------------
  // Internals — materialization + append
  // ------------------------------------------------------------------

  private materialize(): Map<string, LoRAAdapter> {
    const state = new Map<string, LoRAAdapter>();
    const filePath = path.join(this.rootDir, REGISTRY_FILE);
    if (!fs.existsSync(filePath)) return state;
    let raw: string;
    try { raw = fs.readFileSync(filePath, "utf8"); } catch { return state; }
    for (const rawLine of raw.split(/\r?\n/)) {
      if (!rawLine.trim()) continue;
      try {
        const obj = JSON.parse(rawLine);
        const parsed = LoRAAdapterSchema.safeParse(obj);
        if (parsed.success) state.set(parsed.data.adapter_id, parsed.data);
      } catch { /* torn tail — skip */ }
    }
    return state;
  }

  private demoteActivePeers(
    domain: OutcomeDomainT,
    context: AdapterContext,
    incoming_id: string,
    now: string,
  ): void {
    const state = this.materialize();
    const key = contextKey(context);
    for (const peer of state.values()) {
      if (peer.adapter_id === incoming_id) continue;
      if (peer.domain !== domain) continue;
      if (peer.status !== "active") continue;
      if (contextKey(peer.context) !== key) continue;
      this.appendAdapter({ ...peer, status: "archived", updated_ts: now, notes: `demoted by ${incoming_id}` });
    }
  }

  private appendAdapter(adapter: LoRAAdapter): OpResult {
    let line: string;
    try {
      line = JSON.stringify(adapter) + "\n";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, adapter_id: adapter.adapter_id, warning: `serialization failed: ${message}` };
    }
    const filePath = path.join(this.rootDir, REGISTRY_FILE);
    const res = this.atomicAppend(filePath, line);
    if (!res.ok) return { ok: false, adapter_id: adapter.adapter_id, warning: res.warning };
    return { ok: true, adapter_id: adapter.adapter_id };
  }

  private atomicAppend(filePath: string, line: string): { ok: boolean; warning?: string } {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let existing = "";
      if (fs.existsSync(filePath)) existing = fs.readFileSync(filePath, "utf8");
      const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`);
      const fd = fs.openSync(tmp, "w");
      try {
        fs.writeSync(fd, existing);
        fs.writeSync(fd, line);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tmp, filePath);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[LoRAAdapterRegistry] atomic-append failed: ${message}\n`);
      return { ok: false, warning: message };
    }
  }

  static getSelfAwareness() {
    return {
      name: "LoRAAdapterRegistryEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-07",
      capabilities: ["register", "setStatus", "rollback", "resolve", "list", "stats"],
      dependencies: ["loraAdapterSchema"],
      dataSourcesUsed: ["state/adapters/registry.jsonl"],
    };
  }
}

function contextKey(c: AdapterContext): string {
  const parts = [
    `mat:${c.material ?? ""}`,
    `op:${c.operation ?? ""}`,
    `mach:${c.machine ?? ""}`,
  ];
  return parts.join("|");
}

function contextMatchScore(candidate: AdapterContext, request: AdapterContext): number {
  // +2 per exact match on primary keys, +1 per optional key; candidate with
  // fewer constrained keys loses ties to a more-specific match on actual
  // non-empty fields only (to avoid "empty candidate matches everything").
  const primary: Array<keyof AdapterContext> = ["material", "operation", "machine"];
  const optional: Array<keyof AdapterContext> = ["customer", "tool_geometry_class"];
  let score = 0;
  let candSpecificity = 0;
  for (const k of primary) {
    const cv = candidate[k];
    const rv = request[k];
    if (cv !== undefined && cv !== null && cv !== "") candSpecificity += 2;
    if (cv !== undefined && rv !== undefined && cv === rv) score += 2;
  }
  for (const k of optional) {
    const cv = candidate[k];
    const rv = request[k];
    if (cv !== undefined && cv !== null && cv !== "") candSpecificity += 1;
    if (cv !== undefined && rv !== undefined && cv === rv) score += 1;
  }
  // If candidate has zero specificity (wildcard), only use it when nothing
  // else exists (score goes to 0). If there IS specificity but NO matches,
  // the candidate is not applicable — mark negative so it loses to a truly
  // matching one. Wildcard always yields 0.
  if (candSpecificity === 0) return 0;
  if (score === 0) return -1;
  return score;
}

export const loraAdapterRegistryEngine = new LoRAAdapterRegistryEngine();
