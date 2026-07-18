/**
 * PolicyExperienceLedgerEngine — U-LEARN-09
 * ==========================================
 *
 * Append-only JSONL store of (state, action, reward, next_state) tuples for
 * offline RL. Feeds U-LEARN-08 IQL / MaxEnt IRL. Pairs with:
 *   - OutcomeCaptureBus (U-LEARN-01)    — raw events that become rewards
 *   - FeatureStore      (U-LEARN-02)    — state / next_state snapshots
 *   - MLLineage         (U-LEARN-02)    — causal graph edges
 *   - InferenceLoRAGate (U-LEARN-07)    — action.adapter_used provenance
 *
 * Invariants:
 *   - APPEND-ONLY. Tuples never mutate.
 *   - ATOMIC WRITE. tmp+fsync+rename.
 *   - REWARD DECOMPOSITION PRESERVED. The ledger stores each objective's
 *     raw_value + normalized_z_score + weight + sign_convention so later
 *     reweighting is a read-time operation, not a retrain.
 *   - NEVER-THROW. Bad input returns {ok:false, warning}.
 *
 * @module engines/PolicyExperienceLedgerEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-09
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  ExperienceTupleSchema,
  AppendExperienceInputSchema,
  QueryExperienceInputSchema,
  type AppendExperienceInput,
  type ExperienceTuple,
  type QueryExperienceInput,
  type RewardComponent,
} from "../schemas/policyExperienceSchema.js";

const LEDGER_DIR = path.resolve(process.cwd(), "state/policy");
const LEDGER_FILE = "experience.jsonl";
const SCHEMA_VERSION = "1.0.0" as const;
const MAX_LINE_BYTES = 128 * 1024;

export interface AppendResult {
  ok: boolean;
  experience_id: string;
  reward_total: number;
  path: string;
  warning?: string;
}

export class PolicyExperienceLedgerEngine {
  private readonly rootDir: string;

  constructor(rootDir: string = LEDGER_DIR) {
    this.rootDir = rootDir;
  }

  /**
   * Append a (s, a, r, s') tuple to the ledger. reward_total is computed
   * from reward_components using scalar_contribution when present, else
   * normalized_z_score * weight * sign.
   */
  append(input: AppendExperienceInput): AppendResult {
    const parsed = AppendExperienceInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        experience_id: "",
        reward_total: 0,
        path: "",
        warning: `schema validation failed: ${parsed.error.message}`,
      };
    }
    const reward_total = computeRewardTotal(parsed.data.reward_components);
    const experience_id = parsed.data.experience_id ?? randomUUID();
    const timestamp = parsed.data.timestamp ?? new Date().toISOString();

    const tuple: ExperienceTuple = {
      schemaVersion: SCHEMA_VERSION,
      experience_id,
      lineage_id: parsed.data.lineage_id,
      domain: parsed.data.domain,
      timestamp,
      state: parsed.data.state,
      action_record: parsed.data.action_record,
      reward_components: parsed.data.reward_components.map((c) => ({
        ...c,
        scalar_contribution: c.scalar_contribution ?? componentScalar(c),
      })),
      reward_total,
      // GRPO group-relative advantage (ULTRACODE-SYNERGY-MS0). Only written when
      // provided — keeps the field optional + pre-GRPO tuples byte-identical.
      ...(parsed.data.group_advantage !== undefined ? { group_advantage: parsed.data.group_advantage } : {}),
      next_state: parsed.data.next_state,
      terminal: parsed.data.terminal,
      metadata: parsed.data.metadata,
    };
    const check = ExperienceTupleSchema.safeParse(tuple);
    if (!check.success) {
      return {
        ok: false,
        experience_id,
        reward_total,
        path: "",
        warning: `tuple check failed: ${check.error.message}`,
      };
    }

    let line: string;
    try {
      line = JSON.stringify(tuple) + "\n";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        experience_id,
        reward_total,
        path: "",
        warning: `serialization failed (non-JSON-safe): ${message}`,
      };
    }
    if (Buffer.byteLength(line, "utf8") > MAX_LINE_BYTES) {
      return {
        ok: false,
        experience_id,
        reward_total,
        path: "",
        warning: `tuple exceeds ${MAX_LINE_BYTES} bytes`,
      };
    }

    const filePath = path.join(this.rootDir, LEDGER_FILE);
    const res = this.atomicAppend(filePath, line);
    if (!res.ok) {
      return { ok: false, experience_id, reward_total, path: filePath, warning: res.warning };
    }
    return { ok: true, experience_id, reward_total, path: filePath };
  }

  /**
   * Filter-and-read tuples for a training window or debugging trace.
   */
  query(q: QueryExperienceInput): { tuples: ExperienceTuple[]; truncated: boolean } {
    const parsed = QueryExperienceInputSchema.safeParse(q);
    if (!parsed.success) return { tuples: [], truncated: false };
    const filter = parsed.data;
    const sinceMs = filter.since_iso ? Date.parse(filter.since_iso) : -Infinity;

    const all = this.readAll();
    const out: ExperienceTuple[] = [];
    let truncated = false;

    for (const t of all) {
      if (filter.domain && t.domain !== filter.domain) continue;
      if (filter.lineage_id && t.lineage_id !== filter.lineage_id) continue;
      if (filter.engine_name && t.action_record.engine_name !== filter.engine_name) continue;
      if (filter.adapter_used && t.action_record.adapter_used !== filter.adapter_used) continue;
      if (Date.parse(t.timestamp) < sinceMs) continue;
      if (filter.terminal_only && !t.terminal) continue;
      out.push(t);
      if (out.length >= filter.limit) {
        truncated = true;
        break;
      }
    }
    out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return { tuples: out, truncated };
  }

  /**
   * Stats: total tuples, per-domain counts, per-adapter counts, reward
   * distribution summary (mean, min, max). Feeds /system-health dashboards.
   */
  stats(): {
    root_dir: string;
    total: number;
    by_domain: Record<string, number>;
    by_adapter: Record<string, number>;
    reward_summary: { mean: number; min: number; max: number };
  } {
    const tuples = this.readAll();
    const by_domain: Record<string, number> = {};
    const by_adapter: Record<string, number> = {};
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const t of tuples) {
      by_domain[t.domain] = (by_domain[t.domain] ?? 0) + 1;
      const ad = t.action_record.adapter_used ?? "__none__";
      by_adapter[ad] = (by_adapter[ad] ?? 0) + 1;
      sum += t.reward_total;
      if (t.reward_total < min) min = t.reward_total;
      if (t.reward_total > max) max = t.reward_total;
    }
    return {
      root_dir: this.rootDir,
      total: tuples.length,
      by_domain,
      by_adapter,
      reward_summary: {
        mean: tuples.length ? sum / tuples.length : 0,
        min: tuples.length ? min : 0,
        max: tuples.length ? max : 0,
      },
    };
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private readAll(): ExperienceTuple[] {
    const filePath = path.join(this.rootDir, LEDGER_FILE);
    if (!fs.existsSync(filePath)) return [];
    let raw: string;
    try { raw = fs.readFileSync(filePath, "utf8"); } catch { return []; }
    const out: ExperienceTuple[] = [];
    for (const rawLine of raw.split(/\r?\n/)) {
      if (!rawLine.trim()) continue;
      try {
        const obj = JSON.parse(rawLine);
        const p = ExperienceTupleSchema.safeParse(obj);
        if (p.success) out.push(p.data);
      } catch { /* torn tail — skip */ }
    }
    return out;
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
      } finally { fs.closeSync(fd); }
      fs.renameSync(tmp, filePath);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[PolicyExperienceLedger] atomic-append failed: ${message}\n`);
      return { ok: false, warning: message };
    }
  }

  static getSelfAwareness() {
    return {
      name: "PolicyExperienceLedgerEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-09",
      capabilities: ["append", "query", "stats"],
      dependencies: ["policyExperienceSchema"],
      dataSourcesUsed: ["state/policy/experience.jsonl"],
    };
  }
}

function componentScalar(c: RewardComponent): number {
  const z = c.normalized_z_score ?? 0;
  const w = c.weight ?? 1;
  const s = c.sign_convention === "maximize" ? 1 : -1;
  return w * z * s;
}

function computeRewardTotal(components: RewardComponent[]): number {
  let total = 0;
  for (const c of components) {
    total += c.scalar_contribution ?? componentScalar(c);
  }
  return total;
}

export const policyExperienceLedgerEngine = new PolicyExperienceLedgerEngine();
