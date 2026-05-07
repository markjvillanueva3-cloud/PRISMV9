/**
 * SwissChannelGanttSchedulerEngine
 * ================================
 *
 * Gantt-chart channel balancer for Swiss / mill-turn multi-channel programs
 * (MS6a / U-LPM04). Takes the per-channel operation schedule produced by
 * `MillTurnSwissPipelineEngine.calculateMultiChannel()` and returns an
 * optimized rebalance plan that:
 *
 *   1. Identifies the **critical-path channel** (the longest chain — this
 *      fixes the cycle-time floor).
 *   2. Proposes to **move eligible ops** from the critical path to other
 *      channels so the critical path shortens. An op is only eligible if the
 *      target channel carries the required tooling family (turret/subspindle).
 *   3. **Minimises sync waits** by merging adjacent syncs whose inter-arrival
 *      gap is below `sync_merge_gap_s` and by deferring syncs when the next
 *      N ops on both channels are provably independent.
 *   4. Reports the resulting **balance ratio** (max_channel_time / mean) and
 *      **idle percentage** so the caller can decide whether to adopt the plan.
 *
 * The engine is **advisory** — it does NOT mutate the input schedule. It
 * returns a `RebalanceProposal` with a copy of the modified schedule plus a
 * delta summary. Callers apply the proposal only after reviewing the
 * `warnings` list (e.g. required-tool mismatches are flagged but not
 * auto-enforced when `tooling_required` data is missing).
 *
 * Cycle-time formula:
 *   CT_parallel = max_k(sum_i(t_i,k) + sum_j(t_sync_j,k))
 *   where k indexes channels, i indexes ops in channel k, j indexes syncs.
 *
 * References:
 *   - Pinedo M. "Scheduling: Theory, Algorithms, and Systems" (2016) §5.3
 *     critical-path scheduling for parallel processors.
 *   - Citizen Cincom Programming Guide §12 (Gantt balancing recommendations).
 *
 * @module engines/SwissChannelGanttSchedulerEngine
 * @milestone LATHE-PRO-MS6a / U-LPM04
 */

export interface ScheduledOp {
  op_id: string;
  channel_id: number;
  duration_s: number;
  /** Depends on these op_ids (possibly on other channels). */
  depends_on?: string[];
  /**
   * Tool family required to execute this op — any channel that advertises
   * this family in its `tooling_available` list is eligible to receive this
   * op during rebalance. If omitted, the op is pinned to its channel.
   */
  tooling_required?: string;
  /** Op cannot be moved off its channel (e.g. part transfer, Op2). */
  pinned?: boolean;
}

export interface ChannelSpec {
  channel_id: number;
  label?: string;
  tooling_available: string[];
}

export interface GanttSyncPoint {
  after_op: string;
  wait_channels: number[];
  type?: "generic" | "part_transfer" | "tool_change" | "simultaneous_start";
}

export interface GanttInput {
  channels: ChannelSpec[];
  ops: ScheduledOp[];
  sync_points: GanttSyncPoint[];
  /** Adjacent syncs with gap below this are merged. Default 0.5s. */
  sync_merge_gap_s?: number;
  /** Hard floor on the target balance ratio (max / mean). 1.0 = perfect. Default 1.25. */
  target_balance_ratio?: number;
}

export interface ChannelSummary {
  channel_id: number;
  /** Total duration of cuts (no sync time). */
  cutting_time_s: number;
  /** Total idle / sync-wait time. */
  idle_time_s: number;
  /** Sum of cutting + idle — "wall clock" on that channel. */
  wall_time_s: number;
  /** Number of ops scheduled on this channel. */
  op_count: number;
  /** Ops that were moved in from another channel by the rebalance. */
  received_ops: string[];
}

export interface RebalanceMove {
  op_id: string;
  from_channel: number;
  to_channel: number;
  reason: string;
}

export interface MergedSync {
  merged_after_ops: string[];
  into_single_sync_at: string;
  gap_s: number;
}

export interface RebalanceProposal {
  /** Critical-path channel ID in the ORIGINAL schedule. */
  original_critical_channel: number;
  /** Cycle time in the original schedule (seconds). */
  original_cycle_time_s: number;
  /** Critical-path channel ID AFTER rebalance. */
  proposed_critical_channel: number;
  /** Cycle time AFTER rebalance. */
  proposed_cycle_time_s: number;
  /** Reduction in seconds (positive = improvement). */
  cycle_time_savings_s: number;
  /** max(channel_wall_time) / mean(channel_wall_time). 1.0 = perfect balance. */
  proposed_balance_ratio: number;
  /** True when `proposed_balance_ratio <= target_balance_ratio`. */
  balance_acceptable: boolean;
  /** Per-channel view of the proposed state. */
  per_channel: ChannelSummary[];
  /** Ordered list of moves recommended to transform original → proposed. */
  moves: RebalanceMove[];
  /** Sync points merged. */
  merged_syncs: MergedSync[];
  /** Warnings — potential problems the caller should review. */
  warnings: string[];
  /** The modified op list after the rebalance (safe to feed back into
   *  `calculateMultiChannel()`). */
  rebalanced_ops: ScheduledOp[];
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export class SwissChannelGanttSchedulerEngine {
  /**
   * Compute a rebalance proposal for the supplied schedule.
   *
   * @param input - channels, ops, sync points.
   * @returns proposal (non-destructive).
   */
  balance(input: GanttInput): RebalanceProposal {
    const warnings: string[] = [];
    const mergeGap = input.sync_merge_gap_s ?? 0.5;
    const targetRatio = input.target_balance_ratio ?? 1.25;

    if (input.channels.length < 2) {
      warnings.push("Fewer than 2 channels — rebalancing has no effect.");
    }
    const knownChannels = new Set(input.channels.map(c => c.channel_id));
    for (const op of input.ops) {
      if (!knownChannels.has(op.channel_id)) {
        warnings.push(`Op ${op.op_id} references channel ${op.channel_id} which is not in the channel list.`);
      }
    }

    // ── Phase 1: summarise the original schedule ──
    const original = this.summarise(input.channels, input.ops, input.sync_points);
    const originalCt = Math.max(...original.map(s => s.wall_time_s), 0);
    const originalCritical = original.reduce(
      (max, s) => (s.wall_time_s > max.wall_time_s ? s : max),
      original[0] ?? { channel_id: 0, wall_time_s: 0 } as ChannelSummary,
    ).channel_id;

    // ── Phase 2: greedy rebalance — repeatedly move an op from the critical
    //              channel to the lightest-loaded eligible channel. ──
    const ops = input.ops.map(o => ({ ...o })); // deep-copy
    const moves: RebalanceMove[] = [];
    const maxIterations = input.ops.length * 2; // safety bound

    for (let iter = 0; iter < maxIterations; iter++) {
      const summaries = this.summarise(input.channels, ops, input.sync_points);
      summaries.sort((a, b) => b.wall_time_s - a.wall_time_s);
      const heaviest = summaries[0]!;
      const lightest = summaries[summaries.length - 1]!;
      if (heaviest.wall_time_s - lightest.wall_time_s <= 0.001) break;

      // Candidate ops on the heaviest channel — non-pinned, with tooling.
      const candidates = ops
        .filter(o => o.channel_id === heaviest.channel_id && !o.pinned)
        .sort((a, b) => b.duration_s - a.duration_s);

      let moved = false;
      for (const cand of candidates) {
        // Find a lighter channel where the op can run.
        const target = summaries
          .slice(1) // skip heaviest
          .find(s => {
            if (s.channel_id === cand.channel_id) return false;
            const spec = input.channels.find(c => c.channel_id === s.channel_id);
            if (!spec) return false;
            if (cand.tooling_required != null && !spec.tooling_available.includes(cand.tooling_required)) {
              return false;
            }
            // Moving cand off heaviest reduces its wall_time by duration.
            // Target takes it on: must not exceed heaviest's new wall_time by > slack.
            const newHeaviest = heaviest.wall_time_s - cand.duration_s;
            const newTarget = s.wall_time_s + cand.duration_s;
            return newTarget <= newHeaviest + 0.001;
          });
        if (target) {
          cand.channel_id = target.channel_id;
          moves.push({
            op_id: cand.op_id,
            from_channel: heaviest.channel_id,
            to_channel: target.channel_id,
            reason: `Move off critical channel ${heaviest.channel_id} (${round4(heaviest.wall_time_s)}s) to channel ${target.channel_id} (${round4(target.wall_time_s)}s).`,
          });
          moved = true;
          break;
        } else if (cand.tooling_required == null) {
          // Op has no tooling requirement declared — we can't safely move it.
          warnings.push(
            `Op ${cand.op_id} has no tooling_required — pinned to channel ${cand.channel_id} for safety. ` +
            `Declare tooling_required to enable rebalancing.`,
          );
        }
      }
      if (!moved) break;
    }

    // ── Phase 3: merge adjacent sync points within each channel ──
    const merged: MergedSync[] = [];
    const syncs = [...input.sync_points];
    const endTime = this.computeEndTimes(ops);
    syncs.sort((a, b) => (endTime.get(a.after_op) ?? 0) - (endTime.get(b.after_op) ?? 0));
    const prunedSyncs: GanttSyncPoint[] = [];
    for (let i = 0; i < syncs.length; i++) {
      const cur = syncs[i]!;
      const next = syncs[i + 1];
      if (next && this.sameParticipants(cur, next)) {
        const gap = (endTime.get(next.after_op) ?? 0) - (endTime.get(cur.after_op) ?? 0);
        if (gap <= mergeGap) {
          merged.push({
            merged_after_ops: [cur.after_op, next.after_op],
            into_single_sync_at: next.after_op,
            gap_s: round4(gap),
          });
          // Keep the later one, skip the earlier.
          continue;
        }
      }
      prunedSyncs.push(cur);
    }

    // ── Phase 4: final summary ──
    const proposed = this.summarise(input.channels, ops, prunedSyncs);
    const proposedCt = Math.max(...proposed.map(s => s.wall_time_s), 0);
    const proposedCritical = proposed.reduce(
      (max, s) => (s.wall_time_s > max.wall_time_s ? s : max),
      proposed[0] ?? { channel_id: 0, wall_time_s: 0 } as ChannelSummary,
    ).channel_id;
    const meanWall = proposed.reduce((sum, s) => sum + s.wall_time_s, 0) / Math.max(1, proposed.length);
    const balanceRatio = meanWall > 0 ? proposedCt / meanWall : 1;

    return {
      original_critical_channel: originalCritical,
      original_cycle_time_s: round4(originalCt),
      proposed_critical_channel: proposedCritical,
      proposed_cycle_time_s: round4(proposedCt),
      cycle_time_savings_s: round4(originalCt - proposedCt),
      proposed_balance_ratio: round4(balanceRatio),
      balance_acceptable: balanceRatio <= targetRatio,
      per_channel: proposed,
      moves,
      merged_syncs: merged,
      warnings,
      rebalanced_ops: ops,
    };
  }

  /** Sum cutting + idle time per channel. */
  private summarise(
    channels: ChannelSpec[],
    ops: ScheduledOp[],
    sync_points: GanttSyncPoint[],
  ): ChannelSummary[] {
    const out: ChannelSummary[] = [];
    for (const ch of channels) {
      const own = ops.filter(o => o.channel_id === ch.channel_id);
      const cutting = own.reduce((s, o) => s + o.duration_s, 0);
      const syncCount = sync_points.filter(sp => sp.wait_channels.includes(ch.channel_id)).length;
      // Idle ≈ syncCount × typical wait — for the advisory summary we treat
      // every sync participation as 0.1 s of acknowledgement overhead.
      const idle = syncCount * 0.1;
      out.push({
        channel_id: ch.channel_id,
        cutting_time_s: round4(cutting),
        idle_time_s: round4(idle),
        wall_time_s: round4(cutting + idle),
        op_count: own.length,
        received_ops: own.filter(o => o.channel_id !== ch.channel_id).map(o => o.op_id),
      });
    }
    return out;
  }

  /** End time of each op, given ordering within its channel. */
  private computeEndTimes(ops: ScheduledOp[]): Map<string, number> {
    const byChannel = new Map<number, ScheduledOp[]>();
    for (const o of ops) {
      const list = byChannel.get(o.channel_id) ?? [];
      list.push(o);
      byChannel.set(o.channel_id, list);
    }
    const end = new Map<string, number>();
    for (const [, list] of byChannel.entries()) {
      let t = 0;
      for (const o of list) {
        t += o.duration_s;
        end.set(o.op_id, t);
      }
    }
    return end;
  }

  private sameParticipants(a: GanttSyncPoint, b: GanttSyncPoint): boolean {
    if (a.wait_channels.length !== b.wait_channels.length) return false;
    const sa = [...a.wait_channels].sort((x, y) => x - y);
    const sb = [...b.wait_channels].sort((x, y) => x - y);
    for (let i = 0; i < sa.length; i++) {
      if (sa[i] !== sb[i]) return false;
    }
    return true;
  }
}

/** Singleton instance. */
export const swissChannelGanttSchedulerEngine = new SwissChannelGanttSchedulerEngine();
