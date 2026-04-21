/**
 * SyncCodeVerificationEngine
 * ============================
 *
 * Verifies multi-channel sync codes in mill-turn / Swiss G-code programs.
 * Detects:
 *   - Orphan sync points (one channel waits, other never signals)
 *   - Deadlock (channels wait on each other circularly)
 *   - Channel starvation (one channel does all work while others idle)
 *   - Code mismatch (G126 but no matching G127, etc.)
 *
 * Supports the 4 major sync-code dialects:
 *   - Okuma:   G126 / G127 (wait / release)
 *   - Mazak:   !L1 / !L2 (channel indicator + number)
 *   - Fanuc:   WAITF(n) / POST(n)
 *   - Siemens: SYNCH:n (marker-based)
 *
 * @module engines/SyncCodeVerificationEngine
 * @milestone LATHE-PRO
 */

export type SyncDialect = "okuma" | "mazak" | "fanuc" | "siemens";

export interface ChannelProgram {
  /** Channel identifier (1, 2, 3...) */
  channel: number;
  /** Raw G-code lines */
  lines: string[];
}

export interface SyncPoint {
  channel: number;
  line_number: number;
  code: string; // e.g. "G126 P1"
  marker: string; // e.g. "P1" or "L1"
  kind: "wait" | "signal" | "barrier";
}

export interface SyncIssue {
  severity: "critical" | "warning" | "info";
  channel: number;
  line_number: number;
  message: string;
  kind: "orphan" | "deadlock" | "starvation" | "mismatch" | "missing_pair";
}

export interface VerificationResult {
  dialect: SyncDialect;
  channels_analyzed: number;
  total_sync_points: number;
  issues: SyncIssue[];
  is_valid: boolean;
  channel_work_distribution: Record<number, number>; // lines per channel
  generated_at: string;
}

// ── Dialect patterns ──────────────────────────────────────────────────────

const PATTERNS: Record<
  SyncDialect,
  { wait: RegExp; signal: RegExp; barrier?: RegExp }
> = {
  okuma: {
    wait: /\bG126\s+P(\d+)/i,
    signal: /\bG127\s+P(\d+)/i,
  },
  mazak: {
    wait: /!(L\d+)/i,
    signal: /!(L\d+)/i, // Mazak uses same symbol; paired by marker
  },
  fanuc: {
    wait: /\bWAITF\s*\(\s*(\d+)\s*\)/i,
    signal: /\bPOST\s*\(\s*(\d+)\s*\)/i,
  },
  siemens: {
    wait: /\bWAITM\s*\(\s*(\d+)/i,
    signal: /\bSIGNAL\s*\(\s*(\d+)/i,
    barrier: /\bSYNC\s*:?(\d+)/i,
  },
};

// ── Engine Implementation ──────────────────────────────────────────────────

class SyncCodeVerificationEngineImpl {
  /**
   * Verify sync codes across multi-channel programs.
   */
  verify(
    programs: ChannelProgram[],
    dialect: SyncDialect = "okuma"
  ): VerificationResult {
    const patterns = PATTERNS[dialect];
    const issues: SyncIssue[] = [];
    const syncPoints: SyncPoint[] = [];
    const workDistribution: Record<number, number> = {};

    // Pass 1: extract sync points + count work lines
    for (const prog of programs) {
      let workLines = 0;
      for (let i = 0; i < prog.lines.length; i++) {
        const line = prog.lines[i]!;
        if (line.trim().length === 0 || line.startsWith("(")) continue;

        const waitMatch = line.match(patterns.wait);
        if (waitMatch) {
          syncPoints.push({
            channel: prog.channel,
            line_number: i + 1,
            code: waitMatch[0],
            marker: waitMatch[1]!,
            kind: "wait",
          });
          continue;
        }

        const signalMatch = line.match(patterns.signal);
        if (signalMatch && waitMatch !== null ? false : signalMatch) {
          // Only classify as signal if different pattern matched (for dialects where they differ)
          const isDifferent =
            patterns.wait.source !== patterns.signal.source ||
            line.indexOf("G127") >= 0 ||
            line.indexOf("POST") >= 0 ||
            line.indexOf("SIGNAL") >= 0;
          if (isDifferent) {
            syncPoints.push({
              channel: prog.channel,
              line_number: i + 1,
              code: signalMatch[0],
              marker: signalMatch[1]!,
              kind: "signal",
            });
            continue;
          }
        }

        if (patterns.barrier) {
          const barrierMatch = line.match(patterns.barrier);
          if (barrierMatch) {
            syncPoints.push({
              channel: prog.channel,
              line_number: i + 1,
              code: barrierMatch[0],
              marker: barrierMatch[1]!,
              kind: "barrier",
            });
            continue;
          }
        }

        workLines++;
      }
      workDistribution[prog.channel] = workLines;
    }

    // Pass 2: pair waits + signals (orphan detection)
    const waitsByMarker = new Map<string, SyncPoint[]>();
    const signalsByMarker = new Map<string, SyncPoint[]>();
    for (const sp of syncPoints) {
      const bucket =
        sp.kind === "wait" ? waitsByMarker : signalsByMarker;
      const list = bucket.get(sp.marker) ?? [];
      list.push(sp);
      bucket.set(sp.marker, list);
    }

    if (dialect === "mazak") {
      // Mazak uses same pattern for wait + signal; pair by channel diversity.
      // For each marker, there should be at least 2 channels using it.
      for (const [marker, points] of waitsByMarker) {
        const channels = new Set(points.map((p) => p.channel));
        if (channels.size < 2) {
          issues.push({
            severity: "critical",
            channel: points[0]!.channel,
            line_number: points[0]!.line_number,
            message: `Mazak sync marker ${marker} appears only in channel ${[...channels][0]} — needs matching marker in at least one other channel`,
            kind: "orphan",
          });
        }
      }
    } else {
      // Distinct wait/signal pairing
      for (const [marker, waits] of waitsByMarker) {
        const signals = signalsByMarker.get(marker) ?? [];
        if (signals.length === 0) {
          for (const w of waits) {
            issues.push({
              severity: "critical",
              channel: w.channel,
              line_number: w.line_number,
              message: `Wait ${w.code} has no matching signal on any channel`,
              kind: "orphan",
            });
          }
        }
        // Check wait on same channel as signal = potential deadlock if no cross-channel pair
        const waitChannels = new Set(waits.map((w) => w.channel));
        const signalChannels = new Set(signals.map((s) => s.channel));
        const sameChannelOnly =
          waitChannels.size === 1 &&
          signalChannels.size === 1 &&
          [...waitChannels][0] === [...signalChannels][0];
        if (sameChannelOnly) {
          issues.push({
            severity: "warning",
            channel: [...waitChannels][0]!,
            line_number: waits[0]!.line_number,
            message: `Sync marker ${marker} only used within channel ${[...waitChannels][0]} — purpose unclear`,
            kind: "mismatch",
          });
        }
      }

      for (const [marker, signals] of signalsByMarker) {
        if (!waitsByMarker.has(marker)) {
          for (const s of signals) {
            issues.push({
              severity: "warning",
              channel: s.channel,
              line_number: s.line_number,
              message: `Signal ${s.code} has no waiting channel — may be dead code`,
              kind: "missing_pair",
            });
          }
        }
      }
    }

    // Pass 3: starvation detection
    const workCounts = Object.values(workDistribution);
    if (workCounts.length >= 2) {
      const maxWork = Math.max(...workCounts);
      const minWork = Math.min(...workCounts);
      if (maxWork > 0 && minWork / maxWork < 0.2) {
        const starvedChannel = Object.entries(workDistribution).find(
          ([, count]) => count === minWork
        )?.[0];
        if (starvedChannel) {
          issues.push({
            severity: "warning",
            channel: parseInt(starvedChannel, 10),
            line_number: 0,
            message: `Channel ${starvedChannel} has only ${minWork} work lines vs ${maxWork} elsewhere — starved or idle`,
            kind: "starvation",
          });
        }
      }
    }

    // Pass 4: simple cycle-based deadlock detection
    // If channel A waits on marker X while holding lock Y, and channel B
    // waits on marker Y while holding lock X → deadlock. Approximated
    // by checking that the first wait of each channel has a matching
    // signal from a different channel.
    for (const prog of programs) {
      const firstWait = syncPoints.find(
        (sp) => sp.channel === prog.channel && sp.kind === "wait"
      );
      if (firstWait) {
        const signalsForMarker = signalsByMarker.get(firstWait.marker) ?? [];
        const otherChannelSignal = signalsForMarker.some(
          (s) => s.channel !== prog.channel
        );
        if (
          !otherChannelSignal &&
          signalsForMarker.length > 0 &&
          dialect !== "mazak"
        ) {
          issues.push({
            severity: "critical",
            channel: prog.channel,
            line_number: firstWait.line_number,
            message: `Channel ${prog.channel} waits on marker ${firstWait.marker} but only same channel signals it — deadlock risk`,
            kind: "deadlock",
          });
        }
      }
    }

    const is_valid = issues.every((i) => i.severity !== "critical");

    return {
      dialect,
      channels_analyzed: programs.length,
      total_sync_points: syncPoints.length,
      issues,
      is_valid,
      channel_work_distribution: workDistribution,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Schedule-level verification (MS6a / U-LPM02).
   *
   * Runs BEFORE G-code emission, on the raw multi-channel schedule produced by
   * `MillTurnSwissPipelineEngine.calculateMultiChannel()`. Complements the
   * text-based `verify()` method above (which runs AFTER emission on raw
   * G-code).
   *
   * Checks:
   *   1. Matched pairs — every sync has ≥ 2 participating channels.
   *   2. Deadlock — cross-channel wait graph is a DAG (tri-colour DFS).
   *   3. Monotonic order — sync points within a channel are in execution order.
   *   4. Safe position — each channel is retracted at every sync it participates in.
   */
  verifySchedule(input: {
    sync_points: Array<{
      after_op: string;
      wait_channels: number[];
      idle_time_s?: number;
      type?: "generic" | "part_transfer" | "tool_change" | "simultaneous_start";
    }>;
    ops: Array<{
      op_id: string;
      channel_id: number;
      start_s: number;
      end_s: number;
      end_position?: { x_mm?: number; z_mm?: number; retracted: boolean };
      depends_on?: string[];
    }>;
  }): {
    is_safe: boolean;
    critical_count: number;
    warning_count: number;
    violations: Array<{
      severity: "critical" | "warning" | "info";
      kind:
        | "unmatched_pair"
        | "deadlock_cycle"
        | "non_monotonic_sync"
        | "unsafe_position"
        | "unknown_channel"
        | "empty_sync";
      message: string;
      path?: string[];
      after_op?: string;
    }>;
    summary: string;
  } {
    type V = {
      severity: "critical" | "warning" | "info";
      kind:
        | "unmatched_pair"
        | "deadlock_cycle"
        | "non_monotonic_sync"
        | "unsafe_position"
        | "unknown_channel"
        | "empty_sync";
      message: string;
      path?: string[];
      after_op?: string;
    };
    const violations: V[] = [];

    // (1) Matched pairs + unknown-channel check
    const channelsPresent = new Set(input.ops.map((o) => o.channel_id));
    for (const sp of input.sync_points) {
      const refs = new Set(sp.wait_channels);
      if (refs.size === 0) {
        violations.push({
          severity: "warning",
          kind: "empty_sync",
          message: `Sync after ${sp.after_op} has no wait_channels.`,
          after_op: sp.after_op,
        });
        continue;
      }
      if (refs.size < 2) {
        violations.push({
          severity: "critical",
          kind: "unmatched_pair",
          message:
            `Sync after ${sp.after_op} references only 1 channel — no matching pair. ` +
            `Every sync must be acknowledged by ≥ 2 channels.`,
          after_op: sp.after_op,
        });
      }
      for (const c of refs) {
        if (!channelsPresent.has(c)) {
          violations.push({
            severity: "critical",
            kind: "unknown_channel",
            message: `Sync after ${sp.after_op} references channel ${c} which is not in the op schedule.`,
            after_op: sp.after_op,
          });
        }
      }
    }

    // (2) Deadlock: cross-channel wait graph cycle detection (iterative tri-colour DFS)
    const adj = new Map<string, string[]>();
    const opById = new Map<string, typeof input.ops[number]>();
    for (const o of input.ops) {
      adj.set(o.op_id, []);
      opById.set(o.op_id, o);
    }
    for (const o of input.ops) {
      for (const dep of o.depends_on ?? []) {
        const depOp = opById.get(dep);
        if (!depOp) continue;
        if (depOp.channel_id === o.channel_id) continue; // same-channel deps cannot deadlock
        adj.get(o.op_id)!.push(dep);
      }
    }
    const colour = new Map<string, 0 | 1 | 2>();
    for (const id of adj.keys()) colour.set(id, 0);
    for (const start of adj.keys()) {
      if (colour.get(start) !== 0) continue;
      const stack: Array<{ node: string; i: number }> = [{ node: start, i: 0 }];
      const path: string[] = [];
      while (stack.length > 0) {
        const top = stack[stack.length - 1]!;
        if (colour.get(top.node) === 0) {
          colour.set(top.node, 1);
          path.push(top.node);
        }
        const neigh = adj.get(top.node) ?? [];
        if (top.i < neigh.length) {
          const next = neigh[top.i++]!;
          const c = colour.get(next);
          if (c === 1) {
            const idx = path.indexOf(next);
            const cycle = idx >= 0 ? path.slice(idx).concat(next) : [next, top.node, next];
            violations.push({
              severity: "critical",
              kind: "deadlock_cycle",
              message:
                `Deadlock: wait cycle detected (${cycle.join(" → ")}). ` +
                `Break by reordering ops or removing a sync edge.`,
              path: cycle,
            });
          } else if (c === 0) {
            stack.push({ node: next, i: 0 });
          }
        } else {
          colour.set(top.node, 2);
          path.pop();
          stack.pop();
        }
      }
    }

    // (3) Monotonic ordering per channel
    const endTime = new Map(input.ops.map((o) => [o.op_id, o.end_s] as [string, number]));
    const byChannel = new Map<number, typeof input.sync_points>();
    for (const sp of input.sync_points) {
      for (const ch of sp.wait_channels) {
        const list = byChannel.get(ch) ?? [];
        list.push(sp);
        byChannel.set(ch, list);
      }
    }
    for (const [ch, list] of byChannel.entries()) {
      const keyed = list.map((sp) => ({ sp, t: endTime.get(sp.after_op) ?? Infinity }));
      for (let i = 1; i < keyed.length; i++) {
        if (keyed[i]!.t < keyed[i - 1]!.t) {
          violations.push({
            severity: "warning",
            kind: "non_monotonic_sync",
            message:
              `Channel ${ch}: sync after ${keyed[i]!.sp.after_op} (t=${keyed[i]!.t}s) ` +
              `appears before sync after ${keyed[i - 1]!.sp.after_op} (t=${keyed[i - 1]!.t}s).`,
            after_op: keyed[i]!.sp.after_op,
          });
        }
      }
    }

    // (4) Safe-position invariant
    const lastOpByChannel = new Map<number, typeof input.ops>();
    for (const o of input.ops) {
      const list = lastOpByChannel.get(o.channel_id) ?? [];
      list.push(o);
      lastOpByChannel.set(o.channel_id, list);
    }
    for (const arr of lastOpByChannel.values()) arr.sort((a, b) => a.end_s - b.end_s);

    for (const sp of input.sync_points) {
      const t = endTime.get(sp.after_op);
      if (t == null) continue;
      for (const ch of sp.wait_channels) {
        const ops = lastOpByChannel.get(ch);
        if (!ops) continue;
        let latest: typeof input.ops[number] | undefined;
        for (const o of ops) {
          if (o.end_s <= t + 1e-6) latest = o;
          else break;
        }
        if (!latest) continue;
        if (latest.end_position && latest.end_position.retracted === false) {
          violations.push({
            severity: "warning",
            kind: "unsafe_position",
            message:
              `Channel ${ch} at sync after ${sp.after_op}: last op ${latest.op_id} ` +
              `ended in non-retracted position — add G00 retract before sync.`,
            after_op: sp.after_op,
          });
        }
      }
    }

    const critical = violations.filter((v) => v.severity === "critical").length;
    const warnings = violations.filter((v) => v.severity === "warning").length;
    const is_safe = critical === 0;
    const summary = is_safe
      ? warnings === 0
        ? `OK — ${input.sync_points.length} sync point(s) verified.`
        : `${warnings} warning(s) — safe to emit, review before run.`
      : `BLOCK — ${critical} critical violation(s) detected.`;

    return {
      is_safe,
      critical_count: critical,
      warning_count: warnings,
      violations,
      summary,
    };
  }

  /**
   * List supported dialects.
   */
  getSupportedDialects(): SyncDialect[] {
    return ["okuma", "mazak", "fanuc", "siemens"];
  }

  getStats(): {
    supported_dialects: SyncDialect[];
    detected_issue_kinds: string[];
  } {
    return {
      supported_dialects: this.getSupportedDialects(),
      detected_issue_kinds: [
        "orphan",
        "deadlock",
        "starvation",
        "mismatch",
        "missing_pair",
      ],
    };
  }
}

export const syncCodeVerificationEngine = new SyncCodeVerificationEngineImpl();
export type { SyncCodeVerificationEngineImpl };
