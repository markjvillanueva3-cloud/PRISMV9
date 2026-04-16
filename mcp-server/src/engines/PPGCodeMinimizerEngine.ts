/**
 * PPGCodeMinimizerEngine — Strip redundant tokens from G-code
 *
 * Minimizes G-code program size by:
 *   - Removing redundant modal re-statements (e.g., consecutive G1 blocks
 *     only need the first G1; subsequent blocks are implicit modal motion).
 *   - Collapsing repeated F/S word values (only emit when changed).
 *   - Optional whitespace compression (remove interior spaces between
 *     tokens that some controllers don't require).
 *   - Optional block number (N-word) stripping.
 *   - Optional comment stripping.
 *
 * This is useful for DNC drip-feed where smaller programs mean fewer
 * serial round-trips, and as a post-processing step after CAM output.
 *
 * Safety: output is semantically equivalent to input — same motion, same
 * speeds, same feeds. Only redundant tokens are removed.
 *
 * Scope — distinct from:
 *   - PPFeedSpeedScalerEngine: scales F/S values, doesn't remove redundant ones
 *   - PPProgramChunkerEngine: splits programs for drip-feed
 *
 * @module PPGCodeMinimizerEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface MinimizerOptions {
  strip_redundant_modal?: boolean;   // default true
  strip_redundant_fs?: boolean;      // default true
  strip_block_numbers?: boolean;     // default false
  strip_comments?: boolean;          // default false
  collapse_whitespace?: boolean;     // default true
  preserve_program_header?: boolean; // default true (keep O-number + top-of-file modal)
}

export interface MinimizerResult {
  text: string;
  input_bytes: number;
  output_bytes: number;
  input_lines: number;
  output_lines: number;
  saved_bytes: number;
  saved_percent: number;
  tokens_removed: {
    modal_motion: number;
    redundant_f: number;
    redundant_s: number;
    block_numbers: number;
    comments: number;
  };
  warnings: string[];
}

// ── Engine ────────────────────────────────────────────────────────────

export class PPGCodeMinimizerEngine {
  /**
   * Minimize a G-code program.
   */
  minimize(gcode: string, options?: MinimizerOptions): MinimizerResult {
    const opts = {
      strip_redundant_modal: options?.strip_redundant_modal ?? true,
      strip_redundant_fs: options?.strip_redundant_fs ?? true,
      strip_block_numbers: options?.strip_block_numbers ?? false,
      strip_comments: options?.strip_comments ?? false,
      collapse_whitespace: options?.collapse_whitespace ?? true,
      preserve_program_header: options?.preserve_program_header ?? true,
    };

    const inputBytes = gcode.length;
    const inputLines = gcode.split(/\r?\n/).length;

    const tokensRemoved = {
      modal_motion: 0,
      redundant_f: 0,
      redundant_s: 0,
      block_numbers: 0,
      comments: 0,
    };
    const warnings: string[] = [];

    const rawLines = gcode.split(/\r?\n/);
    const outputLines: string[] = [];

    let lastMotion: string | null = null;  // "G0", "G1", "G2", "G3"
    let lastFeed: number | null = null;
    let lastSpeed: number | null = null;

    // Find the header boundary. A "header" consists of % sentinel, O-number
    // line, comment lines, and an initial modal setup block (G90 G21 etc.).
    // Everything before the first motion line is header.
    let firstMotionIdx = -1;
    for (let i = 0; i < rawLines.length; i++) {
      const stripped = this.stripComments(rawLines[i]).toUpperCase();
      if (/\bG0*[0123]\b/.test(stripped) && /[XYZUVWABC]-?\d/.test(stripped)) {
        firstMotionIdx = i;
        break;
      }
    }

    for (let idx = 0; idx < rawLines.length; idx++) {
      let line = rawLines[idx];
      // "inHeader" gates modal-motion and F/S dedup (which need a safe starting
      // state). Block-number and comment stripping apply everywhere — they
      // don't change program semantics.
      const inHeader = opts.preserve_program_header && firstMotionIdx >= 0 && idx < firstMotionIdx;

      // Strip comments if requested (applies everywhere)
      if (opts.strip_comments) {
        const before = line;
        line = this.stripAllComments(line);
        if (line !== before) tokensRemoved.comments++;
      }

      // Strip block numbers (N-words) — applies everywhere, purely syntactic
      if (opts.strip_block_numbers) {
        const before = line;
        line = line.replace(/\bN\d+\s*/g, "");
        if (line !== before) tokensRemoved.block_numbers++;
      }

      // If line is now empty (blank or comment-only stripped), drop it — but
      // only if the original line wasn't deliberately blank for spacing.
      const codeOnly = this.stripComments(line).trim();
      if (codeOnly.length === 0) {
        // Keep blank lines only if we haven't stripped comments AND line has content
        if (opts.strip_comments && line.trim().length === 0) {
          continue;
        }
        outputLines.push(line);
        continue;
      }

      // Modal-motion dedup: if this line starts with same motion word as last,
      // drop the redundant G-word unless this is the header preserving line.
      if (opts.strip_redundant_modal && !inHeader) {
        const motionMatch = codeOnly.match(/\bG0*([0123])\b/);
        if (motionMatch) {
          const motion = "G" + motionMatch[1];
          if (motion === lastMotion) {
            // Remove the motion word (leaving the rest of the block intact)
            line = line.replace(/\bG0*[0123]\b\s*/, "");
            tokensRemoved.modal_motion++;
          } else {
            lastMotion = motion;
          }
        } else if (/\b[XYZUVWABC]-?\d/.test(codeOnly)) {
          // Motion-less coordinate line — modal motion continues from lastMotion
          // no-op
        }
      }

      // Redundant F/S dedup
      if (opts.strip_redundant_fs && !inHeader) {
        const fMatch = codeOnly.match(/\bF(-?\d+\.?\d*)\b/);
        if (fMatch) {
          const f = parseFloat(fMatch[1]);
          if (!Number.isNaN(f)) {
            if (lastFeed !== null && Math.abs(f - lastFeed) < 1e-9) {
              // Remove this F-word
              line = this.removeWord(line, "F", fMatch[1]);
              tokensRemoved.redundant_f++;
            } else {
              lastFeed = f;
            }
          }
        }

        const sMatch = codeOnly.match(/\bS(-?\d+\.?\d*)\b/);
        if (sMatch) {
          const s = parseFloat(sMatch[1]);
          if (!Number.isNaN(s)) {
            if (lastSpeed !== null && Math.abs(s - lastSpeed) < 1e-9) {
              line = this.removeWord(line, "S", sMatch[1]);
              tokensRemoved.redundant_s++;
            } else {
              lastSpeed = s;
            }
          }
        }
      }

      // Collapse whitespace — leave single spaces between tokens
      if (opts.collapse_whitespace) {
        line = line.replace(/[ \t]+/g, " ").trimEnd();
      }

      // Drop line if it's now empty after stripping (only when not header)
      const afterStrip = line.trim();
      if (afterStrip.length === 0 && !inHeader) {
        continue;
      }

      outputLines.push(line);
    }

    const output = outputLines.join("\n");
    const outputBytes = output.length;
    const savedBytes = inputBytes - outputBytes;
    const savedPercent = inputBytes === 0 ? 0 : (savedBytes / inputBytes) * 100;

    return {
      text: output,
      input_bytes: inputBytes,
      output_bytes: outputBytes,
      input_lines: inputLines,
      output_lines: outputLines.length,
      saved_bytes: savedBytes,
      saved_percent: Math.max(0, savedPercent),
      tokens_removed: tokensRemoved,
      warnings,
    };
  }

  /**
   * Convenience — minimize with all aggressive options enabled.
   */
  minimizeAggressive(gcode: string): MinimizerResult {
    return this.minimize(gcode, {
      strip_redundant_modal: true,
      strip_redundant_fs: true,
      strip_block_numbers: true,
      strip_comments: true,
      collapse_whitespace: true,
      preserve_program_header: true,
    });
  }

  /**
   * Convenience — conservative minimize (keep comments and block numbers).
   */
  minimizeConservative(gcode: string): MinimizerResult {
    return this.minimize(gcode, {
      strip_redundant_modal: true,
      strip_redundant_fs: true,
      strip_block_numbers: false,
      strip_comments: false,
      collapse_whitespace: true,
      preserve_program_header: true,
    });
  }

  /**
   * Default options.
   */
  defaultOptions(): Required<MinimizerOptions> {
    return {
      strip_redundant_modal: true,
      strip_redundant_fs: true,
      strip_block_numbers: false,
      strip_comments: false,
      collapse_whitespace: true,
      preserve_program_header: true,
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }

  private stripAllComments(line: string): string {
    // Strip paren comments and ; tails but preserve %/O-header-style lines intact.
    // If the whole line is a comment (starts with paren or ;), drop the line.
    const trimmed = line.trim();
    if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
      return "";
    }
    if (trimmed.startsWith(";")) {
      return "";
    }
    // Remove inline comments
    let r = line.replace(/\([^)]*\)/g, "");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r.trimEnd();
  }

  private removeWord(line: string, letter: string, value: string): string {
    const regex = new RegExp(`\\b${letter}${this.escapeRegex(value)}\\b\\s*`, "g");
    return line.replace(regex, "");
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

export const ppGCodeMinimizerEngine = new PPGCodeMinimizerEngine();
