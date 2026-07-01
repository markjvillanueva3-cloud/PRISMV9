/**
 * HermesParallelVerdictAggregatorEngine — HZP04 fan-out result aggregator.
 *
 * After N parallel agents return, this engine merges their verdicts and
 * flags edge cases (file-edit conflicts, contradictory answers, partial
 * failures) so the parent doesn't silently take the wrong answer.
 *
 * Pure-core: ranks agents by quality score, dedupes verdicts that agree,
 * surfaces conflicts where two agents touched the same file or disagreed
 * on a boolean answer.
 *
 * @module engines/HermesParallelVerdictAggregatorEngine
 */

import { z } from "zod";

export const AgentVerdictSchema = z.object({
  agent_id: z.string().min(1).max(120),
  subtask_id: z.string().min(1).max(120),
  ok: z.boolean(),
  quality: z.number().min(0).max(1),
  duration_ms: z.number().int().min(0).max(3_600_000),
  /** Files this agent wrote — drives the conflict detector. */
  files_written: z.array(z.string().min(1).max(500)).max(500),
  /** Optional boolean/string answer when the task was Q&A — drives the consensus check. */
  answer: z.string().max(500).optional(),
  failure_reason: z.string().max(500).optional(),
});
export type AgentVerdict = z.infer<typeof AgentVerdictSchema>;

export interface AggregationResult {
  total_agents: number;
  ok_count: number;
  failure_count: number;
  /** Mean of quality scores across agents that returned ok=true.  0 if none. */
  mean_ok_quality: number;
  /** Files written by 2+ agents — must be reconciled before the parent commits. */
  file_conflicts: Array<{ file: string; agents: string[] }>;
  /** When agents had an `answer`, lists distinct answers and how many agents gave each. */
  answer_distribution: Array<{ answer: string; agent_ids: string[] }>;
  /** True when there is a single answer with ≥ majority of ok-agents agreeing. */
  has_consensus: boolean;
  /** Failed agents (ok=false) and their reasons. */
  failures: Array<{ agent_id: string; subtask_id: string; reason: string | null }>;
  /** Highest-quality successful agent_id (tiebreak: lower duration). */
  best_agent_id: string | null;
}

export class HermesParallelVerdictAggregatorEngine {
  static aggregate(verdicts: AgentVerdict[]): AggregationResult {
    if (!Array.isArray(verdicts)) throw new Error("HermesVerdictAggregator.aggregate: verdicts must be array");
    if (verdicts.length === 0) throw new Error("HermesVerdictAggregator.aggregate: verdicts must be non-empty");

    // Parse + dedupe-detect on agent_id.
    const seen = new Set<string>();
    const parsed: AgentVerdict[] = [];
    for (const v of verdicts) {
      const av = AgentVerdictSchema.parse(v);
      if (seen.has(av.agent_id)) throw new Error(`HermesVerdictAggregator: duplicate agent_id ${av.agent_id}`);
      seen.add(av.agent_id);
      parsed.push(av);
    }

    const ok = parsed.filter((v) => v.ok);
    const fail = parsed.filter((v) => !v.ok);
    const mean_ok_quality = ok.length ? ok.reduce((s, v) => s + v.quality, 0) / ok.length : 0;

    // File-conflict detector.
    const fileMap = new Map<string, string[]>();
    for (const v of ok) {
      for (const raw of v.files_written) {
        const f = String(raw).replace(/\\/g, "/");
        const list = fileMap.get(f) || [];
        if (!list.includes(v.agent_id)) list.push(v.agent_id);
        fileMap.set(f, list);
      }
    }
    const file_conflicts: Array<{ file: string; agents: string[] }> = [];
    for (const [file, agents] of fileMap.entries()) {
      if (agents.length >= 2) file_conflicts.push({ file, agents: [...agents] });
    }
    file_conflicts.sort((a, b) => a.file.localeCompare(b.file));

    // Answer distribution (only when agents supplied an answer).
    const answerMap = new Map<string, string[]>();
    for (const v of ok) {
      if (typeof v.answer === "string" && v.answer.length > 0) {
        const list = answerMap.get(v.answer) || [];
        list.push(v.agent_id);
        answerMap.set(v.answer, list);
      }
    }
    const answer_distribution = Array.from(answerMap.entries())
      .map(([answer, agent_ids]) => ({ answer, agent_ids: [...agent_ids] }))
      .sort((a, b) => b.agent_ids.length - a.agent_ids.length);

    const okWithAnswer = ok.filter((v) => typeof v.answer === "string" && v.answer.length > 0).length;
    const topCount = answer_distribution.length ? answer_distribution[0].agent_ids.length : 0;
    const has_consensus = okWithAnswer > 0 && topCount * 2 > okWithAnswer;

    // best_agent_id: highest quality, tiebreak lower duration.
    let best_agent_id: string | null = null;
    if (ok.length > 0) {
      const sorted = [...ok].sort((a, b) => {
        if (b.quality !== a.quality) return b.quality - a.quality;
        return a.duration_ms - b.duration_ms;
      });
      best_agent_id = sorted[0].agent_id;
    }

    return {
      total_agents: parsed.length,
      ok_count: ok.length,
      failure_count: fail.length,
      mean_ok_quality,
      file_conflicts,
      answer_distribution,
      has_consensus,
      failures: fail.map((v) => ({
        agent_id: v.agent_id,
        subtask_id: v.subtask_id,
        reason: v.failure_reason ?? null,
      })),
      best_agent_id,
    };
  }

  static renderResult(r: AggregationResult): string {
    const tag = r.failure_count === 0 ? "[AGGREGATE OK]" : r.ok_count === 0 ? "[AGGREGATE FAILED]" : "[AGGREGATE PARTIAL]";
    return `${tag} agents=${r.total_agents} ok=${r.ok_count} fail=${r.failure_count} q=${r.mean_ok_quality.toFixed(2)} fileConflicts=${r.file_conflicts.length} consensus=${r.has_consensus}`;
  }
}

export const hermesParallelVerdictAggregatorEngine = HermesParallelVerdictAggregatorEngine;
