/**
 * verifyBlockAnnotations — Per-block S/F gate (MS0/U-PPGM10, schema 1.1.0).
 *
 * Cross-references emitted G-code blocks against the sidecar's
 * block_annotations[] so a post can't quietly emit a feed/speed that no
 * physics chain produced. Runs Node-side in the build pipeline before
 * publishing the .cps output (paired with NoInlinePhysicsConstantsEngine
 * which scans the .cps source for inlined kc1_1/Taylor C/tool-modulus
 * literals — different artifact, same fail-closed posture).
 *
 * Contract:
 *   1. Parser walks each line of the emitted G-code, extracting block_id
 *      from Nxxx labels and the S<n>/F<n> tokens that appear on that line.
 *   2. Lines without an Nxxx label are skipped (anonymous blocks have no
 *      stable identifier the sidecar can attach annotations to).
 *   3. Each labelled line with at least one of S/F is verified against the
 *      annotation looked up by block_id. operator_override blocks bypass
 *      the comparison (caller went off-physics by design).
 *   4. Tier-aware verdicts:
 *        sim          — WARN on any mismatch
 *        proven_out   — WARN on mismatch / missing annotation
 *        production   — HARD_BLOCK on S/F mismatch; WARN on missing
 *        shop_floor   — HARD_BLOCK on mismatch / missing / no annotations
 *
 * Strict equality on S and F: the post is expected to annotate the same
 * value it emitted. If the post rounds at emit time, the annotation must
 * carry the rounded value — drift between the two is exactly the bug this
 * gate exists to catch.
 */

import {
  getBlockAnnotation,
  type SidecarBlockAnnotation,
} from "./loadPhysicsSidecar.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type Tier = "sim" | "proven_out" | "production" | "shop_floor";

export type Verdict = "PASS" | "WARN" | "HARD_BLOCK";

export type MismatchReason =
  | "S_mismatch"           // Emitted S_rpm ≠ annotation.emitted.S_rpm
  | "F_mismatch"           // Emitted F_mmpm ≠ annotation.emitted.F_mmpm
  | "missing_annotation"   // Block emits S/F but no annotation has block_id
  | "no_block_annotations" // Sidecar lacks block_annotations array entirely
  | "operator_override_skip"; // Informational — operator_override skipped

export interface BlockMismatch {
  block_id: string;
  line_number: number;
  reason: MismatchReason;
  emitted: { S_rpm?: number; F_mmpm?: number };
  expected: { S_rpm?: number; F_mmpm?: number };
  detail: string;
}

export interface VerifyResult {
  verdict: Verdict;
  tier: Tier;
  blocks_scanned: number;
  blocks_with_sf: number;
  mismatches: BlockMismatch[];
}

export interface VerifyOptions {
  /** Tier-aware verdict; defaults to shop_floor (fail closed). */
  tier?: Tier;
}

// ============================================================================
// G-CODE BLOCK PARSER
// ============================================================================

/** Parsed emission for a single labelled G-code line. */
interface ParsedBlockLine {
  block_id: string;
  line_number: number;
  S_rpm?: number;
  F_mmpm?: number;
}

/**
 * Strip parenthesis comments `(comment)` from a single G-code line.
 * Brackets nest poorly in real G-code; the parser skips the FIRST closing
 * paren after each opening paren which matches Fanuc/Hurco/Okuma behavior.
 */
function stripParenComments(line: string): string {
  let out = "";
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "(") { depth++; continue; }
    if (ch === ")" && depth > 0) { depth--; continue; }
    if (depth === 0) out += ch;
  }
  return out;
}

/**
 * Extract block_id (Nxxx label) and S/F tokens from a single G-code line.
 * Returns null when the line has no Nxxx label OR when the line has
 * neither S nor F (nothing to verify).
 *
 * Word-token grammar: Letter + signed-decimal. We accept N, S, F as
 * top-level words. Multiple S or F on the same line take the FIRST
 * occurrence (matches controller behavior — later words on the same line
 * are unusual but well-defined as last-write-wins; we choose first-write
 * as the "intended" annotation target).
 */
function parseBlockLine(rawLine: string, lineNumber: number): ParsedBlockLine | null {
  const line = stripParenComments(rawLine);

  // Nxxx label — anchored at start (after optional whitespace), digits only.
  const nMatch = /^\s*N(\d+)\b/i.exec(line);
  if (!nMatch) return null;
  const block_id = "N" + nMatch[1];

  // S<num> — \d+ optionally followed by .\d+ (G-code S is normally integer
  // but some controls accept decimal). Word boundary on both sides.
  const sMatch = /\bS(\d+(?:\.\d+)?)\b/i.exec(line);
  // F<num> — same shape as S.
  const fMatch = /\bF(\d+(?:\.\d+)?)\b/i.exec(line);

  if (!sMatch && !fMatch) return null;

  const out: ParsedBlockLine = { block_id, line_number: lineNumber };
  if (sMatch) out.S_rpm = parseFloat(sMatch[1]);
  if (fMatch) out.F_mmpm = parseFloat(fMatch[1]);
  return out;
}

/**
 * Walk the emitted G-code text line-by-line; return all parsed labelled
 * blocks that emit at least one of S/F. Empty lines and label-less lines
 * are skipped.
 */
function parseEmittedBlocks(emittedGcode: string): ParsedBlockLine[] {
  const lines = emittedGcode.split(/\r?\n/);
  const out: ParsedBlockLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseBlockLine(lines[i], i + 1);
    if (parsed) out.push(parsed);
  }
  return out;
}

// ============================================================================
// TIER VERDICT POLICY
// ============================================================================

/** Confidence-equivalent mapping per tier. Fail-closed escalates with tier. */
const TIER_POLICY: Record<
  Tier,
  {
    hard_block_on: MismatchReason[];
    warn_on: MismatchReason[];
  }
> = {
  sim: {
    hard_block_on: [],
    warn_on: ["S_mismatch", "F_mismatch", "missing_annotation", "no_block_annotations"],
  },
  proven_out: {
    hard_block_on: [],
    warn_on: ["S_mismatch", "F_mismatch", "missing_annotation", "no_block_annotations"],
  },
  production: {
    hard_block_on: ["S_mismatch", "F_mismatch"],
    warn_on: ["missing_annotation", "no_block_annotations"],
  },
  shop_floor: {
    hard_block_on: ["S_mismatch", "F_mismatch", "missing_annotation", "no_block_annotations"],
    warn_on: [],
  },
};

// ============================================================================
// CORE VERIFY
// ============================================================================

/**
 * Verify each labelled G-code block's S/F against the sidecar's
 * block_annotations[]. Returns a tier-aware verdict and the list of
 * mismatches (informational at sim/proven_out; HARD_BLOCK at production
 * for S/F mismatches and at shop_floor for any mismatch class).
 *
 * Strict equality on S and F. operator_override blocks are skipped (and
 * recorded as informational with reason="operator_override_skip" at sim
 * tier only — mismatches[] for higher tiers excludes them).
 */
export function verifyBlockAnnotations(
  emittedGcode: string,
  sidecar: Record<string, unknown> | null | undefined,
  options: VerifyOptions = {},
): VerifyResult {
  if (typeof emittedGcode !== "string") {
    throw new Error("verifyBlockAnnotations: emittedGcode must be a string");
  }
  const tier: Tier = options.tier ?? "shop_floor";
  if (!TIER_POLICY[tier]) {
    throw new Error(`verifyBlockAnnotations: unknown tier "${tier}"`);
  }

  const lines = emittedGcode.split(/\r?\n/);
  const blocks = parseEmittedBlocks(emittedGcode);
  const mismatches: BlockMismatch[] = [];

  // Detect block_annotations presence/shape:
  //   undefined        → v1.0.0 sidecar; "no_block_annotations" branch
  //   array            → per-block check loop
  //   anything else    → shape violation; throw eagerly (loader will too)
  let sidecarHasBlockAnnotations = false;
  if (sidecar && typeof sidecar === "object") {
    const ba = (sidecar as Record<string, unknown>).block_annotations;
    if (typeof ba === "undefined") {
      // v1.0.0 — leave sidecarHasBlockAnnotations = false
    } else if (Object.prototype.toString.call(ba) === "[object Array]") {
      sidecarHasBlockAnnotations = true;
    } else {
      throw new Error(
        "verifyBlockAnnotations: sidecar.block_annotations is present but not an array (shape violation)",
      );
    }
  }

  if (!sidecarHasBlockAnnotations && blocks.length > 0) {
    // Every emitted S/F block becomes a "no_block_annotations" mismatch
    // since there's no annotation source to verify against.
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      mismatches.push({
        block_id: b.block_id,
        line_number: b.line_number,
        reason: "no_block_annotations",
        emitted: { S_rpm: b.S_rpm, F_mmpm: b.F_mmpm },
        expected: {},
        detail:
          `block ${b.block_id} (G-code line ${b.line_number}) emits S/F but the sidecar has no block_annotations[] — ` +
          `cannot verify physics chain. Schema must be ≥1.1.0 and the post must populate block_annotations.`,
      });
    }
  } else if (sidecarHasBlockAnnotations) {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      let annotation: SidecarBlockAnnotation | null;
      try {
        annotation = getBlockAnnotation(sidecar as Record<string, unknown>, b.block_id);
      } catch (err) {
        // Shape violations bubble up with full detail
        throw err;
      }

      if (!annotation) {
        mismatches.push({
          block_id: b.block_id,
          line_number: b.line_number,
          reason: "missing_annotation",
          emitted: { S_rpm: b.S_rpm, F_mmpm: b.F_mmpm },
          expected: {},
          detail: `block ${b.block_id} (G-code line ${b.line_number}) emits S/F but no block_annotation has block_id="${b.block_id}".`,
        });
        continue;
      }

      // operator_override bypasses physics — skip comparison (informational)
      if (annotation.physics_basis === "operator_override") {
        if (tier === "sim") {
          mismatches.push({
            block_id: b.block_id,
            line_number: b.line_number,
            reason: "operator_override_skip",
            emitted: { S_rpm: b.S_rpm, F_mmpm: b.F_mmpm },
            expected: { S_rpm: annotation.emitted.S_rpm, F_mmpm: annotation.emitted.F_mmpm },
            detail: `block ${b.block_id}: operator_override — physics chain bypassed by caller; not verified.`,
          });
        }
        continue;
      }

      // Strict-equality compare on S
      if (typeof b.S_rpm === "number" && b.S_rpm !== annotation.emitted.S_rpm) {
        mismatches.push({
          block_id: b.block_id,
          line_number: b.line_number,
          reason: "S_mismatch",
          emitted: { S_rpm: b.S_rpm },
          expected: { S_rpm: annotation.emitted.S_rpm },
          detail:
            `block ${b.block_id} (G-code line ${b.line_number}): emitted S=${b.S_rpm} ` +
            `does not match annotation.emitted.S_rpm=${annotation.emitted.S_rpm} ` +
            `(physics_basis=${annotation.physics_basis}). Post and sidecar disagree on spindle speed.`,
        });
      }
      // Strict-equality compare on F
      if (typeof b.F_mmpm === "number" && b.F_mmpm !== annotation.emitted.F_mmpm) {
        mismatches.push({
          block_id: b.block_id,
          line_number: b.line_number,
          reason: "F_mismatch",
          emitted: { F_mmpm: b.F_mmpm },
          expected: { F_mmpm: annotation.emitted.F_mmpm },
          detail:
            `block ${b.block_id} (G-code line ${b.line_number}): emitted F=${b.F_mmpm} ` +
            `does not match annotation.emitted.F_mmpm=${annotation.emitted.F_mmpm} ` +
            `(physics_basis=${annotation.physics_basis}). Post and sidecar disagree on feed.`,
        });
      }
    }
  }

  // Verdict
  const policy = TIER_POLICY[tier];
  let verdict: Verdict = "PASS";
  for (let i = 0; i < mismatches.length; i++) {
    const m = mismatches[i];
    if (m.reason === "operator_override_skip") continue; // informational only
    if (policy.hard_block_on.indexOf(m.reason) >= 0) {
      verdict = "HARD_BLOCK";
      break;
    }
    if (policy.warn_on.indexOf(m.reason) >= 0 && verdict === "PASS") {
      verdict = "WARN";
    }
  }

  void lines; // explicit "scanned the whole file" record
  return {
    verdict,
    tier,
    blocks_scanned: lines.length,
    blocks_with_sf: blocks.length,
    mismatches,
  };
}

/**
 * Convenience: verify and throw on HARD_BLOCK. Use from build pipelines.
 */
export function verifyOrThrow(
  emittedGcode: string,
  sidecar: Record<string, unknown> | null | undefined,
  options: VerifyOptions = {},
): VerifyResult {
  const result = verifyBlockAnnotations(emittedGcode, sidecar, options);
  if (result.verdict === "HARD_BLOCK") {
    const top = result.mismatches.slice(0, 3);
    const summary = top
      .map((m) => `  L${m.line_number} ${m.block_id} ${m.reason}: ${m.detail}`)
      .join("\n");
    throw new Error(
      `verifyBlockAnnotations HARD_BLOCK on tier=${result.tier}: ${result.mismatches.length} mismatch(es). Top:\n${summary}\nFix: have the master post engine populate block_annotations[] with the physics chain that produced each emitted S/F.`,
    );
  }
  return result;
}
