/**
 * PPFeedSpeedScalerEngine — Apply uniform or ranged F / S scaling to G-code
 *
 * Rewrites F-words and S-words in a G-code program according to scaling
 * rules. Distinct from FeedRateOptimizationEngine (which computes feeds
 * from engagement geometry) — this engine is a pure post-process edit
 * tool that does NOT look at geometry or material.
 *
 * Use cases:
 *   - Trial cut at 50% feed to verify toolpath before full-speed run
 *   - Emulate machine feed/spindle override in software
 *   - Bulk adjust a legacy program when a new tool calls for slower feed
 *   - Clamp feeds to machine max after importing from a faster machine
 *
 * Scaling modes:
 *   - uniform      — multiply every F-word by feed_factor (and S by speed_factor)
 *   - clamp        — never exceed max_feed / max_speed after scaling
 *   - range        — only scale F-words in [range_min, range_max]
 *   - skip_rapids  — if F appears on a G0 block, leave it untouched
 *
 * The engine preserves all other content verbatim including comments,
 * whitespace, modal context, and the original F/S placement in the block.
 * F/S inside `(...)` comments are NEVER modified.
 *
 * @module PPFeedSpeedScalerEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface FeedScalerOptions {
  feed_factor?: number;    // Multiplier for F-words; default 1
  speed_factor?: number;   // Multiplier for S-words; default 1
  max_feed?: number;       // Clamp F after scaling (machine limit, mm/min)
  max_speed?: number;      // Clamp S after scaling (spindle limit, rpm)
  min_feed?: number;       // Floor F after scaling
  min_speed?: number;      // Floor S after scaling
  feed_range_min?: number; // Only scale F-words >= this value
  feed_range_max?: number; // Only scale F-words <= this value
  skip_rapid_feeds?: boolean;  // If F on G0 block, leave alone (default true)
  round_decimals?: number; // Round scaled values to N decimals (default 4)
}

export interface ScalingChange {
  line_number: number;
  letter: "F" | "S";
  original_value: number;
  new_value: number;
  reason: "scaled" | "clamped_max" | "clamped_min" | "skipped_rapid" | "out_of_range" | "unchanged";
}

export interface ScalerResult {
  text: string;
  total_lines: number;
  total_bytes: number;
  changes: ScalingChange[];
  feeds_scaled: number;
  speeds_scaled: number;
  feeds_clamped: number;
  speeds_clamped: number;
  feeds_skipped: number;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPFeedSpeedScalerEngine {
  /**
   * Rewrite a G-code program with scaled feed and/or spindle values.
   */
  scale(gcode: string, options: FeedScalerOptions = {}): ScalerResult {
    const feedFactor = options.feed_factor ?? 1;
    const speedFactor = options.speed_factor ?? 1;
    const maxFeed = options.max_feed;
    const maxSpeed = options.max_speed;
    const minFeed = options.min_feed;
    const minSpeed = options.min_speed;
    const rangeMin = options.feed_range_min;
    const rangeMax = options.feed_range_max;
    const skipRapids = options.skip_rapid_feeds ?? true;
    const decimals = options.round_decimals ?? 4;

    const rawLines = gcode.split(/\r?\n/);
    const out: string[] = [];
    const changes: ScalingChange[] = [];
    const warnings: string[] = [];

    let feedsScaled = 0, speedsScaled = 0;
    let feedsClamped = 0, speedsClamped = 0;
    let feedsSkipped = 0;

    let currentMotion = "G0";  // modal motion state

    if (feedFactor === 0) {
      warnings.push("feed_factor=0 would zero all feeds — probably unintended");
    }
    if (speedFactor === 0) {
      warnings.push("speed_factor=0 would zero all spindle speeds — probably unintended");
    }

    for (let idx = 0; idx < rawLines.length; idx++) {
      const raw = rawLines[idx];

      // Motion-mode detection from the code portion (ignore ( ) and ;... comments)
      const codeOnly = this.stripCommentsKeep(raw).toUpperCase();
      const motionMatch = codeOnly.match(/\bG0*([0-3])(?!\d)/);
      if (motionMatch) {
        currentMotion = `G${motionMatch[1]}`;
      }
      const isRapid = currentMotion === "G0";

      // Split the line into paren / non-paren segments; only rewrite non-paren.
      // Pattern alternates paren-blocks with non-paren text; ; comments are
      // handled within the non-paren segment by finding the first ; and
      // leaving its tail untouched.
      const modified = this.rewriteLineSegmented(
        raw,
        idx,
        isRapid,
        {
          feedFactor, speedFactor, maxFeed, maxSpeed, minFeed, minSpeed,
          rangeMin, rangeMax, skipRapids, decimals,
        },
        (change) => {
          changes.push(change);
          if (change.letter === "F") {
            if (change.reason === "scaled") feedsScaled++;
            else if (change.reason === "clamped_max" || change.reason === "clamped_min") feedsClamped++;
            else if (change.reason === "skipped_rapid" || change.reason === "out_of_range") feedsSkipped++;
          } else {
            if (change.reason === "scaled") speedsScaled++;
            else if (change.reason === "clamped_max" || change.reason === "clamped_min") speedsClamped++;
          }
        },
      );

      out.push(modified);
    }

    const text = out.join("\n");
    return {
      text,
      total_lines: out.length,
      total_bytes: text.length,
      changes,
      feeds_scaled: feedsScaled,
      speeds_scaled: speedsScaled,
      feeds_clamped: feedsClamped,
      speeds_clamped: speedsClamped,
      feeds_skipped: feedsSkipped,
      warnings,
    };
  }

  scaleFeed(gcode: string, factor: number): ScalerResult {
    return this.scale(gcode, { feed_factor: factor });
  }

  scaleSpeed(gcode: string, factor: number): ScalerResult {
    return this.scale(gcode, { speed_factor: factor });
  }

  clampFeedTo(gcode: string, maxFeed: number): ScalerResult {
    return this.scale(gcode, { max_feed: maxFeed });
  }

  defaultOptions(): FeedScalerOptions {
    return {
      feed_factor: 1,
      speed_factor: 1,
      skip_rapid_feeds: true,
      round_decimals: 4,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Rewrite a single line: protect paren-comments and ;-tail comments, only
   * rewrite F/S in the actual code region.
   */
  private rewriteLineSegmented(
    line: string,
    lineIdx: number,
    isRapid: boolean,
    p: {
      feedFactor: number; speedFactor: number;
      maxFeed?: number; maxSpeed?: number;
      minFeed?: number; minSpeed?: number;
      rangeMin?: number; rangeMax?: number;
      skipRapids: boolean; decimals: number;
    },
    emitChange: (c: ScalingChange) => void,
  ): string {
    // Find the ; comment boundary first — everything after ; is untouched tail.
    // But ; inside () is not a comment; simplify by handling parens first.
    // Build a scan: walk char-by-char tracking paren depth and commented-tail.
    const result: string[] = [];
    let i = 0;
    let codeBuf = "";  // accumulates non-paren, non-;-tail code

    const flushCode = () => {
      if (codeBuf.length > 0) {
        result.push(this.rewriteCodeRegion(codeBuf, lineIdx, isRapid, p, emitChange));
        codeBuf = "";
      }
    };

    while (i < line.length) {
      const ch = line[i];
      if (ch === "(") {
        flushCode();
        // Consume until matching )
        const start = i;
        let depth = 1;
        i++;
        while (i < line.length && depth > 0) {
          if (line[i] === "(") depth++;
          else if (line[i] === ")") depth--;
          i++;
        }
        result.push(line.substring(start, i));
      } else if (ch === ";") {
        // Rest of line is comment
        flushCode();
        result.push(line.substring(i));
        i = line.length;
      } else {
        codeBuf += ch;
        i++;
      }
    }
    flushCode();
    return result.join("");
  }

  /**
   * Rewrite F/S words inside a clean (no comments) code region.
   */
  private rewriteCodeRegion(
    code: string,
    lineIdx: number,
    isRapid: boolean,
    p: {
      feedFactor: number; speedFactor: number;
      maxFeed?: number; maxSpeed?: number;
      minFeed?: number; minSpeed?: number;
      rangeMin?: number; rangeMax?: number;
      skipRapids: boolean; decimals: number;
    },
    emitChange: (c: ScalingChange) => void,
  ): string {
    let out = code;

    // F-words
    out = out.replace(/(^|[^A-Za-z])F(-?\d+\.?\d*)/g, (_m, prefix, valueStr) => {
      const value = parseFloat(valueStr);
      if (Number.isNaN(value)) return `${prefix}F${valueStr}`;

      if (p.skipRapids && isRapid) {
        emitChange({
          line_number: lineIdx + 1, letter: "F",
          original_value: value, new_value: value, reason: "skipped_rapid",
        });
        return `${prefix}F${valueStr}`;
      }
      if (p.rangeMin !== undefined && value < p.rangeMin) {
        emitChange({
          line_number: lineIdx + 1, letter: "F",
          original_value: value, new_value: value, reason: "out_of_range",
        });
        return `${prefix}F${valueStr}`;
      }
      if (p.rangeMax !== undefined && value > p.rangeMax) {
        emitChange({
          line_number: lineIdx + 1, letter: "F",
          original_value: value, new_value: value, reason: "out_of_range",
        });
        return `${prefix}F${valueStr}`;
      }

      let scaled = value * p.feedFactor;
      let reason: ScalingChange["reason"] = p.feedFactor === 1 ? "unchanged" : "scaled";

      if (p.maxFeed !== undefined && scaled > p.maxFeed) {
        scaled = p.maxFeed;
        reason = "clamped_max";
      } else if (p.minFeed !== undefined && scaled < p.minFeed) {
        scaled = p.minFeed;
        reason = "clamped_min";
      }

      const rounded = this.roundTo(scaled, p.decimals);
      // If the result equals the original (e.g., factor=1 with no clamp),
      // keep reason="unchanged" and don't rewrite the token.
      if (rounded === value && reason !== "clamped_max" && reason !== "clamped_min") {
        emitChange({
          line_number: lineIdx + 1, letter: "F",
          original_value: value, new_value: value, reason: "unchanged",
        });
        return `${prefix}F${valueStr}`;
      }

      emitChange({
        line_number: lineIdx + 1, letter: "F",
        original_value: value, new_value: rounded, reason,
      });
      return `${prefix}F${this.formatValue(rounded)}`;
    });

    // S-words
    out = out.replace(/(^|[^A-Za-z])S(-?\d+\.?\d*)/g, (_m, prefix, valueStr) => {
      const value = parseFloat(valueStr);
      if (Number.isNaN(value)) return `${prefix}S${valueStr}`;

      let scaled = value * p.speedFactor;
      let reason: ScalingChange["reason"] = p.speedFactor === 1 ? "unchanged" : "scaled";

      if (p.maxSpeed !== undefined && scaled > p.maxSpeed) {
        scaled = p.maxSpeed;
        reason = "clamped_max";
      } else if (p.minSpeed !== undefined && scaled < p.minSpeed) {
        scaled = p.minSpeed;
        reason = "clamped_min";
      }

      const rounded = this.roundTo(scaled, p.decimals);
      if (rounded === value && reason !== "clamped_max" && reason !== "clamped_min") {
        emitChange({
          line_number: lineIdx + 1, letter: "S",
          original_value: value, new_value: value, reason: "unchanged",
        });
        return `${prefix}S${valueStr}`;
      }

      emitChange({
        line_number: lineIdx + 1, letter: "S",
        original_value: value, new_value: rounded, reason,
      });
      return `${prefix}S${this.formatValue(rounded)}`;
    });

    return out;
  }

  private stripCommentsKeep(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }

  private roundTo(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  private formatValue(value: number): string {
    if (Number.isInteger(value)) return value.toString();
    return value.toString().replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }
}

export const ppFeedSpeedScalerEngine = new PPFeedSpeedScalerEngine();
