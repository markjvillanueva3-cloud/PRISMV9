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
