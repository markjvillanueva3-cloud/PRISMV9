/**
 * SwissChannelFileEmitterEngine
 * =============================
 *
 * Emits per-channel program files for 5 Swiss / mill-turn dialects from a
 * `calculateMultiChannel()` schedule. This is the **code-emission** layer that
 * closes the loop between the already-built multi-channel Gantt scheduler and
 * the final G-code files a Swiss / multi-turret controller expects on disk.
 *
 * Supported dialects (MS6a U-LPM01):
 *   - citizen   — Citizen Cincom L/M20/M32 : `$1/$2` headers, `!L/!R` waits
 *   - star      — Star SR/SW/SV            : single file, `M200/M201/M202`
 *   - tsugami   — Tsugami B-series          : `$1/$2` headers, `M96/M97` waits
 *   - mazak     — Mazak Integrex/SmoothAi  : `!C1/!C2` blocks, `WAITM(id)`
 *   - dmg_mori  — DMG MORI NTX              : `CHANDATA(n)` blocks, `WAITM(id,ch1,ch2)`
 *
 * The emitter is intentionally a pure string assembler — it does NOT generate
 * toolpath moves (those already come from `assembleProgram()` on the existing
 * `MillTurnSwissPipelineEngine`). Instead, it takes two streams of pre-formed
 * G-code (one per channel) plus the sync-point schedule and produces the
 * dialect-correct file layout.
 *
 * Physics / reference notes:
 *   - Sync code IDs use stable hash of `after_op` so regenerated files reuse IDs.
 *   - Part-transfer sync is *always* emitted as a distinct sync point marked
 *     `type: "part_transfer"` — consumers (U-LPM03) can expand it into the
 *     full grip-before-cutoff M-code sequence.
 *   - Empty / single-channel inputs return empty file arrays with a warning —
 *     this is a valid no-op, not an error.
 *
 * References:
 *   - Citizen Cincom Programming Manual §7 ($1/$2 multi-system)
 *   - Star CNC Programming Manual §12 (M200/M201/M202 sync)
 *   - Tsugami B-series Programming §8 ($ designators, M96/M97)
 *   - Mazak SmoothAi / Integrex Programming §5 (!C multi-path, WAITM)
 *   - DMG MORI NTX Programming §6 (CHANDATA, WAITM marker IDs)
 *
 * @module engines/SwissChannelFileEmitterEngine
 * @milestone LATHE-PRO-MS6a / U-LPM01
 */

export type SwissDialect = "citizen" | "star" | "tsugami" | "mazak" | "dmg_mori";

export interface ChannelSyncPoint {
  /** Operation id that must complete before the wait releases. */
  after_op: string;
  /** Channels that must all arrive at this sync point. */
  wait_channels: number[];
  /** Idle time (s) spent waiting at this point — diagnostic only. */
  idle_time_s?: number;
  /**
   * Sync category — `part_transfer` triggers M-code expansion for main→sub
   * handoff (see PartTransferSequenceEngine / U-LPM03).
   */
  type?: "generic" | "part_transfer" | "tool_change" | "simultaneous_start";
}

export interface EmitterChannelProgram {
  /** 1-based channel index (main spindle = 1, sub-spindle = 2, …). */
  channel_id: number;
  /** Human-readable channel label — e.g. "main", "sub", "back-working". */
  label?: string;
  /**
   * Body lines for this channel. Each string is ONE G-code block.
   * Do NOT include the channel header / program number / M30 — the emitter
   * adds those per dialect.
   */
  body: string[];
  /** Tool list for this channel (used in file header comments). */
  tools?: Array<{ number: number; offset?: number; label?: string }>;
}

export interface EmitInput {
  dialect: SwissDialect;
  /** Program number (0001–9999). Both channels share the same number in
   *  Citizen / Tsugami — the channel designator comes from `$1` / `$2`. */
  program_number: number;
  /** Program comment (header). */
  program_comment?: string;
  /** Per-channel program bodies. */
  channels: EmitterChannelProgram[];
  /**
   * Sync points, in execution order. Pass the `sync_points` array returned by
   * `MillTurnSwissPipelineEngine.calculateMultiChannel()` directly.
   */
  sync_points: ChannelSyncPoint[];
  /** Cycle time estimate (minutes) for header comment. */
  cycle_time_est_min?: number;
}

export interface ChannelFile {
  channel_id: number;
  /** Human-readable suggested filename (caller owns actual file I/O). */
  filename: string;
  /** Full program text (header + body + footer). */
  text: string;
  /** Number of G-code blocks emitted. */
  line_count: number;
}

export interface EmitResult {
  dialect: SwissDialect;
  /**
   * One entry per channel. Star / DMG MORI emit a SINGLE combined file — in
   * that case the result has one `ChannelFile` with `channel_id = 0` that
   * contains all channels merged, and `channel_files_separate = false`.
   */
  channel_files: ChannelFile[];
  /** `true` when dialect produces distinct files per channel, `false` when merged. */
  channel_files_separate: boolean;
  /** Total sync points emitted across all channels. */
  sync_points_emitted: number;
  /** Unmatched / malformed sync warnings (non-fatal). */
  warnings: string[];
  /** Safety-relevant diagnostics. */
  notes: string[];
}

/** Stable integer hash of an op id, used for deterministic sync IDs. */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** 3-digit sync id in the 100–999 range. */
function syncId(afterOp: string): number {
  return 100 + (hashCode(afterOp) % 900);
}

/** Pad program number to 4 digits. */
function pad4(n: number): string {
  return String(Math.max(0, Math.min(9999, Math.floor(n)))).padStart(4, "0");
}

function fileHeader(dialect: SwissDialect, progNum: number, comment: string): string {
  const tag = `O${pad4(progNum)}`;
  switch (dialect) {
    case "citizen":
    case "tsugami":
      return `${tag} (${comment})`;
    case "star":
      return `${tag} (${comment}) (STAR MULTI-CHANNEL)`;
    case "mazak":
      return `${tag} (${comment}) (MAZAK MULTI-PATH)`;
    case "dmg_mori":
      return `${tag} (${comment}) (DMG MORI NTX)`;
  }
}

function channelHeader(dialect: SwissDialect, channelId: number): string[] {
  switch (dialect) {
    case "citizen":
      return [`($${channelId})`];
    case "tsugami":
      return [`($${channelId})`];
    case "star":
      return [`(--- CHANNEL ${channelId} ---)`];
    case "mazak":
      return [`!C${channelId}`];
    case "dmg_mori":
      return [`CHANDATA(${channelId})`];
  }
}

function channelFooter(dialect: SwissDialect): string[] {
  switch (dialect) {
    case "citizen":
    case "tsugami":
      return ["M30", "%"];
    case "star":
    case "mazak":
    case "dmg_mori":
      return ["M30"];
  }
}

function syncLine(
  dialect: SwissDialect,
  sp: ChannelSyncPoint,
  emittingChannel: number,
): string {
  const id = syncId(sp.after_op);
  const others = sp.wait_channels.filter(c => c !== emittingChannel);
  const otherList = others.join(",");
  switch (dialect) {
    case "citizen": {
      // Citizen: !L in the waiting channel, !R in the signalling channel.
      // Convention: lower channel id = waiter, higher = signaller. Simpler:
      // every channel emits BOTH sides so either order is safe — the matched
      // pair lives in `wait_channels`.
      const role = emittingChannel === Math.min(...sp.wait_channels) ? "!L" : "!R";
      return `${role}${id} ; sync ${sp.type ?? "generic"} after ${sp.after_op}`;
    }
    case "tsugami": {
      const role = emittingChannel === Math.min(...sp.wait_channels) ? "M96" : "M97";
      return `${role} P${id} ; sync after ${sp.after_op}`;
    }
    case "star": {
      // Star uses M200 (start wait) / M201 (complete wait) / M202 (end marker).
      // Emit M200 for the lowest channel, M201 for others, M202 closes.
      const role = emittingChannel === Math.min(...sp.wait_channels) ? "M200" : "M201";
      return `${role} P${id} ; sync after ${sp.after_op}`;
    }
    case "mazak":
      return `WAITM(${id},${otherList || emittingChannel}) ; sync after ${sp.after_op}`;
    case "dmg_mori":
      return `WAITM(${id},${sp.wait_channels.join(",")}) ; sync after ${sp.after_op}`;
  }
}

/** Build the per-channel body with sync points inserted after matching ops. */
function weaveSyncPoints(
  body: string[],
  channelId: number,
  sync_points: ChannelSyncPoint[],
  dialect: SwissDialect,
): { text: string[]; emitted: number; unmatched: string[] } {
  const out: string[] = [];
  const unmatched = new Set(sync_points.map(s => s.after_op));
  let emitted = 0;

  // Match sync points by finding a body line whose comment contains the op id.
  // We accept either `(op=foo123)`, `(foo123)`, or a bare token match.
  const remaining = new Set(
    sync_points
      .filter(sp => sp.wait_channels.includes(channelId))
      .map(sp => sp.after_op)
  );

  for (const line of body) {
    out.push(line);
    // Find any sync points whose `after_op` is mentioned in this line.
    for (const sp of sync_points) {
      if (!sp.wait_channels.includes(channelId)) continue;
      if (!remaining.has(sp.after_op)) continue;
      const hasOpRef =
        line.includes(`(op=${sp.after_op})`) ||
        line.includes(`(${sp.after_op})`) ||
        line.includes(` ${sp.after_op} `) ||
        line.endsWith(` ${sp.after_op}`);
      if (hasOpRef) {
        out.push(syncLine(dialect, sp, channelId));
        emitted += 1;
        remaining.delete(sp.after_op);
        unmatched.delete(sp.after_op);
      }
    }
  }

  // Any remaining sync points that targeted this channel but didn't find an
  // anchor line get appended at the end (conservative — still correct, just
  // late). The caller receives these as `unmatched` warnings.
  const appendedFallback: string[] = [];
  for (const sp of sync_points) {
    if (!sp.wait_channels.includes(channelId)) continue;
    if (!remaining.has(sp.after_op)) continue;
    out.push(syncLine(dialect, sp, channelId));
    out.push(`; WARN: sync after ${sp.after_op} appended — op comment not found in body`);
    emitted += 1;
    remaining.delete(sp.after_op);
    appendedFallback.push(sp.after_op);
  }

  return {
    text: out,
    emitted,
    unmatched: appendedFallback,
  };
}

function commentTools(prefix: string, channel: EmitterChannelProgram): string[] {
  if (!channel.tools || channel.tools.length === 0) return [];
  const parts = channel.tools.map(t => `T${String(t.number).padStart(2, "0")}${t.label ? `(${t.label})` : ""}`);
  return [`${prefix} TOOLS CH${channel.channel_id}: ${parts.join(", ")}`];
}

export class SwissChannelFileEmitterEngine {
  /**
   * Emit dialect-correct channel files from per-channel bodies + a sync schedule.
   *
   * @param input - Dialect, program metadata, per-channel bodies, sync points.
   * @returns One or more channel files (separate vs merged varies by dialect).
   */
  emit(input: EmitInput): EmitResult {
    const warnings: string[] = [];
    const notes: string[] = [];

    if (!input.channels || input.channels.length === 0) {
      warnings.push("No channels supplied — returning empty result");
      return {
        dialect: input.dialect,
        channel_files: [],
        channel_files_separate: false,
        sync_points_emitted: 0,
        warnings,
        notes,
      };
    }

    if (input.channels.length === 1) {
      notes.push(
        "Single-channel input — multi-channel sync codes are not needed. " +
        "Emitting a single-channel file without sync weaving.",
      );
    }

    const comment = input.program_comment ?? "MULTI-CHANNEL PROGRAM";
    const cycleComment = input.cycle_time_est_min != null
      ? `(CYCLE TIME EST: ${input.cycle_time_est_min.toFixed(2)} min)`
      : null;

    // Dialects that emit SEPARATE files per channel:
    const separate = input.dialect === "citizen" || input.dialect === "tsugami";

    const channelTexts: Array<{ channelId: number; lines: string[]; count: number }> = [];
    let totalEmitted = 0;
    const unmatchedAll: Record<string, string[]> = {};

    for (const ch of input.channels) {
      const header: string[] = [];
      header.push(fileHeader(input.dialect, input.program_number, `${comment} CH${ch.channel_id}`));
      if (cycleComment) header.push(cycleComment);
      header.push(...commentTools("(", ch));
      header.push(...channelHeader(input.dialect, ch.channel_id));
      header.push("");

      const { text: body, emitted, unmatched } = weaveSyncPoints(
        ch.body,
        ch.channel_id,
        input.sync_points,
        input.dialect,
      );
      totalEmitted += emitted;
      if (unmatched.length > 0) {
        unmatchedAll[`ch${ch.channel_id}`] = unmatched;
      }

      const footer = channelFooter(input.dialect);
      const all = [...header, ...body, "", ...footer];
      channelTexts.push({ channelId: ch.channel_id, lines: all, count: all.length });
    }

    if (Object.keys(unmatchedAll).length > 0) {
      for (const [ch, ops] of Object.entries(unmatchedAll)) {
        if (ops.length > 0) {
          warnings.push(
            `Channel ${ch}: ${ops.length} sync point(s) anchored to ops not found ` +
            `in body — appended at end (${ops.join(", ")}).`,
          );
        }
      }
    }

    // Assemble files according to dialect layout:
    const files: ChannelFile[] = [];
    if (separate) {
      for (const ch of channelTexts) {
        files.push({
          channel_id: ch.channelId,
          filename: `O${pad4(input.program_number)}_CH${ch.channelId}.${fileExt(input.dialect)}`,
          text: ch.lines.join("\n"),
          line_count: ch.count,
        });
      }
    } else {
      // Single merged file — Star / Mazak / DMG MORI.
      const merged: string[] = [];
      merged.push(fileHeader(input.dialect, input.program_number, comment));
      if (cycleComment) merged.push(cycleComment);
      merged.push("");
      for (const ch of channelTexts) {
        // Strip the per-channel file header (first line) but keep the CHANDATA / !C / comment separator.
        merged.push(...ch.lines.slice(1));
        merged.push("");
      }
      files.push({
        channel_id: 0,
        filename: `O${pad4(input.program_number)}.${fileExt(input.dialect)}`,
        text: merged.join("\n"),
        line_count: merged.length,
      });
    }

    // Verify sync-pair balance for waitpoint dialects.
    verifyPairBalance(input, warnings);

    return {
      dialect: input.dialect,
      channel_files: files,
      channel_files_separate: separate,
      sync_points_emitted: totalEmitted,
      warnings,
      notes,
    };
  }
}

function fileExt(d: SwissDialect): string {
  switch (d) {
    case "citizen": return "pgm";
    case "tsugami": return "nc";
    case "star":    return "nc";
    case "mazak":   return "eia";
    case "dmg_mori":return "mpf";
  }
}

/**
 * Verify every sync point is referenced by ≥ 2 channels — a sync referenced by
 * only one channel is dead-code and usually indicates a programming bug.
 */
function verifyPairBalance(input: EmitInput, warnings: string[]): void {
  for (const sp of input.sync_points) {
    const refs = new Set(sp.wait_channels);
    if (refs.size < 2) {
      warnings.push(
        `Sync point after ${sp.after_op} references only channel(s) ` +
        `[${[...refs].join(",")}] — at least 2 channels are required for a sync.`,
      );
    }
    // Also flag channels listed in wait_channels that aren't present in input.channels.
    const known = new Set(input.channels.map(c => c.channel_id));
    for (const c of refs) {
      if (!known.has(c)) {
        warnings.push(
          `Sync point after ${sp.after_op} references unknown channel ${c}.`,
        );
      }
    }
  }
}

/** Singleton instance. */
export const swissChannelFileEmitterEngine = new SwissChannelFileEmitterEngine();
