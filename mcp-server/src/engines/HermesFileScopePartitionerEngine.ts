/**
 * HermesFileScopePartitionerEngine — HZP02 file-scope partitioner.
 *
 * Prevents the index.lock thrash class observed 2026-05-24: when N parallel
 * agents try to write overlapping file sets, they serialize on the git
 * index.lock and the speed advantage of parallelism collapses.
 *
 * Pure-core: given a set of agent specs each with a candidate file scope,
 * partition the files so each file is owned by exactly one agent.  Any
 * file claimed by 2+ agents is moved to `conflicts[]` — the caller resolves
 * (drop the file from one scope, or sequence those two agents).
 *
 * @module engines/HermesFileScopePartitionerEngine
 */

import { z } from "zod";

export const AgentFileScopeSchema = z.object({
  agent_id: z.string().min(1).max(120),
  /** Files the agent intends to read+write — relative paths from repo root. */
  files: z.array(z.string().min(1).max(500)).min(1).max(500),
});
export type AgentFileScope = z.infer<typeof AgentFileScopeSchema>;

export interface PartitionResult {
  /** agent_id → exclusive files owned by that agent (no overlap with any peer). */
  partition: Record<string, string[]>;
  /** file path → list of agent_ids claiming it.  Caller must resolve before launch. */
  conflicts: Array<{ file: string; agents: string[] }>;
  /** Files claimed by exactly one agent — safe to launch in parallel. */
  exclusive_count: number;
  /** Files claimed by 2+ agents — must be reconciled. */
  contested_count: number;
  /** Whether the partition is launch-safe (no conflicts). */
  safe_to_fanout: boolean;
}

export class HermesFileScopePartitionerEngine {
  static partition(scopes: AgentFileScope[]): PartitionResult {
    if (!Array.isArray(scopes)) throw new Error("HermesFileScopePartitioner.partition: scopes must be array");
    if (scopes.length === 0) throw new Error("HermesFileScopePartitioner.partition: scopes must be non-empty");

    // Validate each scope + detect duplicate agent_ids.
    const seenIds = new Set<string>();
    for (const s of scopes) {
      AgentFileScopeSchema.parse(s);
      if (seenIds.has(s.agent_id)) throw new Error(`HermesFileScopePartitioner: duplicate agent_id ${s.agent_id}`);
      seenIds.add(s.agent_id);
    }

    // Build file → claimants map, normalizing path separators.
    const claims = new Map<string, string[]>();
    for (const s of scopes) {
      const seenInScope = new Set<string>();
      for (const raw of s.files) {
        const f = HermesFileScopePartitionerEngine.normalizePath(raw);
        if (seenInScope.has(f)) continue;
        seenInScope.add(f);
        const list = claims.get(f) || [];
        list.push(s.agent_id);
        claims.set(f, list);
      }
    }

    const partition: Record<string, string[]> = {};
    for (const s of scopes) partition[s.agent_id] = [];
    const conflicts: Array<{ file: string; agents: string[] }> = [];

    for (const [file, agents] of claims.entries()) {
      if (agents.length === 1) {
        partition[agents[0]].push(file);
      } else {
        conflicts.push({ file, agents: [...agents] });
      }
    }

    // Sort each partition for deterministic output.
    for (const id of Object.keys(partition)) partition[id].sort();
    conflicts.sort((a, b) => a.file.localeCompare(b.file));

    let exclusive_count = 0;
    for (const id of Object.keys(partition)) exclusive_count += partition[id].length;

    return {
      partition,
      conflicts,
      exclusive_count,
      contested_count: conflicts.length,
      safe_to_fanout: conflicts.length === 0,
    };
  }

  /** Normalize forward/back slashes + trim leading "./". */
  static normalizePath(p: string): string {
    let s = String(p).replace(/\\/g, "/");
    if (s.startsWith("./")) s = s.slice(2);
    return s;
  }

  static renderResult(r: PartitionResult): string {
    const tag = r.safe_to_fanout ? "[PARTITION SAFE]" : "[PARTITION CONTESTED]";
    const agents = Object.keys(r.partition).length;
    return `${tag} agents=${agents} exclusive=${r.exclusive_count} contested=${r.contested_count}`;
  }
}

export const hermesFileScopePartitionerEngine = HermesFileScopePartitionerEngine;
