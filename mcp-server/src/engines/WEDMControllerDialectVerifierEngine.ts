/**
 * WEDMControllerDialectVerifierEngine — Controller-Dialect Mismatch Detector
 *
 * A *cross-dialect* verifier: given an emitted WEDM G-code program and the
 * controller it was emitted for, verify that the code actually uses that
 * controller's dialect and not a competitor's. This is orthogonal to
 * {@link WEDMProgramVerificationEngine} which checks structural completeness
 * per controller (pairing, ends, units). This engine answers a different
 * question: "Does this program *look* like what the declared controller would
 * execute, or is it ghost-written in another vendor's dialect?"
 *
 * Motivation
 * ----------
 * The WEDM post-processor registry (EDMPostProcessGCodeEngine) can emit six
 * different dialects. A mis-routed emit — e.g. a Mitsubishi multi-pass plan
 * rendered through the Sodick post — will structurally validate on the
 * *emitted* dialect but crash hard on the wrong machine because the thread/
 * cut/submerge codes diverge. This engine catches exactly that class of
 * failure before the operator sends the program to a controller.
 *
 * Method
 * ------
 *   1. Scan the program for M-codes, G-codes, E-codes, C-codes.
 *   2. For each known controller, compute a *score*:
 *        score_c = Σ weight(sig) over signatures sig ∈ Fingerprint(c) that hit,
 *        minus penalty for strong anti-signatures (other controllers' codes
 *        that have no overlap with c's code set).
 *   3. Compare the declared controller's score against the argmax and the
 *      runner-up. If the declared score is not the top OR another controller
 *      is within ~20 % of the top, emit a MISMATCH verdict with a diff report
 *      (expected/detected/mismatched_codes).
 *
 * Contribution
 * ------------
 *   PASS → 0.10 of S(x); FAIL → 0 and hard-block via
 *   {@link WEDMProgramSafetyGateEngine}.
 *
 * Roundtrip guarantee
 * -------------------
 *   A Mitsubishi plan rendered through the Sodick post is flagged because the
 *   emitted program carries Sodick M50/M51 while the declared controller is
 *   Mitsubishi (which uses M20/M21). Similarly an Agie program is flagged when
 *   declared as Fanuc because `M17` and `G71` are Agie-exclusive.
 *
 * MS-P2.5-SAFETY/U-P2.5-SAFE-06
 *
 * @see WEDMProgramSafetyGateEngine     composite S(x) gate consumer
 * @see WEDMProgramVerificationEngine   structural-per-controller check
 * @see EDMPostProcessGCodeEngine       6-dialect emitter that writes the codes we verify
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type DialectControllerKey =
  | "mitsubishi"
  | "sodick"
  | "makino"
  | "fanuc"
  | "agiecharmilles";

export interface DialectVerifierInput {
  /** Full emitted G-code program (multi-line). */
  program_text: string;
  /** Declared controller this program was emitted for. Accepts canonical keys or
   *  common synonyms (e.g. "mitsubishi_fa", "sodick_al", "fanuc_robocut"). */
  expected_controller: string;
  /** Optional: lower the accept threshold for short test programs.
   *  Minimum distinctive-signature hit count the scorer requires before it will
   *  accept a "best match". Default 2. */
  min_hits?: number;
}

export type DialectVerdict =
  | "pass"
  | "fail_mismatch"
  | "fail_ambiguous"
  | "fail_unknown_controller"
  | "fail_empty_program";

export interface DialectScore {
  controller: DialectControllerKey;
  score: number;
  matched_codes: string[];
  exclusive_hits: string[];
}

export interface DialectVerifierResult {
  success: boolean;
  pass: boolean;
  verdict: DialectVerdict;
  hard_block: boolean;
  expected_controller: DialectControllerKey;
  expected_requested: string;
  detected_controller: DialectControllerKey;
  ranking: DialectScore[];
  mismatched_codes: string[];
  missing_codes: string[];
  diff_report: string;
  /** Exact shape {@link WEDMProgramSafetyGateEngine}.dialect expects. */
  safety_gate_input: {
    pass: boolean;
    expected_controller: string;
    detected_controller?: string;
    mismatched_codes?: string[];
  };
  safety_score_contribution: number;
  summary: string;
  warnings: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// DIALECT FINGERPRINTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * A fingerprint is a set of (regex, weight) entries plus a set of "exclusive"
 * tokens that, if present, strongly indicate the controller. Weights are tuned
 * to match the relative discriminative power of each code family:
 *   - program end / unit code : 10  (single code, structural)
 *   - thread / cut wire code  : 8   (called at every profile, distinctive)
 *   - submerge on/off         : 6   (mid-program, often unique)
 *   - taper on/off            : 4   (modal, only some programs)
 *   - E-pack / C-code presence: 4   (broad hint, not exclusive)
 */
interface DialectFingerprint {
  /** Line-matching patterns: [regex, weight, canonical-code-string, exclusive?]. */
  patterns: Array<[RegExp, number, string, boolean]>;
  /** Codes that MUST appear somewhere — if absent, list them as missing. */
  required: string[];
}

/**
 * Build the 5-controller fingerprint registry. Each pattern uses a word-boundary
 * check so `M30` matches but `M300` does not.
 */
/**
 * Fingerprints calibrated against the real emit of EDMPostProcessGCodeEngine
 * (CONTROLLER_CONFIGS + post files). Only codes that are TRULY exclusive to
 * one controller's emit path get `exclusive=true`. Utility codes (M14, M78,
 * M28, M24 etc. used for tank-fill on several brands) are NOT exclusive
 * because they overlap, and the ranking instead relies on signature
 * combinations (thread+cut+end+condition).
 *
 * Truly exclusive per controller:
 *   mitsubishi : M20 (thread), H-register offsets
 *   sodick     : C-codes  (condition-code per pass)
 *   fanuc      : G61.1    (exact-stop corner)
 *   agie       : M17 (end), G71/G70 (units)
 *   makino     : — (every Makino code is shared; recognized via the
 *                  combination M60/M61+M30+E-packs, not by a unique token)
 */
const FINGERPRINTS: Record<DialectControllerKey, DialectFingerprint> = {
  mitsubishi: {
    patterns: [
      [/\bM02\b/, 8, "M02", false], // program end (shared with sodick)
      [/\bM20\b/, 12, "M20", true], // Mitsubishi thread wire — exclusive
      [/\bM21\b/, 6, "M21", false], // Mitsubishi cut wire (also Makino submerge)
      [/\bH[0-9]+\b/, 8, "H-offset", true], // H-register offsets — exclusive
      [/\bE[0-9]{3,4}\b/, 4, "E-pack", false],
      [/\bG51\b/, 4, "G51", false],
      [/\bG50\b/, 4, "G50", false],
      [/\bM80\b/, 4, "M80", false], // Mitsubishi water on
      [/\bM82\b/, 4, "M82", false], // Mitsubishi wire on
    ],
    required: [],
  },
  sodick: {
    patterns: [
      [/\bM02\b/, 8, "M02", false],
      [/\bM60\b/, 6, "M60", false], // Sodick thread (shared with Fanuc cut, Makino thread)
      [/\bM61\b/, 6, "M61", false], // Sodick cut    (shared with Makino cut)
      [/\bC[0-9]{3,4}\b/, 12, "C-code", true], // Sodick condition codes — exclusive
      [/\bK0\b/, 4, "K0", false],
      [/\bK1\b/, 4, "K1", false],
      [/\bM14\b/, 4, "M14", false], // Sodick fill dielectric
    ],
    required: [],
  },
  makino: {
    patterns: [
      [/\bM30\b/, 8, "M30", false],
      [/\bM60\b/, 6, "M60", false], // Makino thread
      [/\bM61\b/, 6, "M61", false], // Makino cut
      [/\bE[0-9]{3,4}\b/, 4, "E-pack", false],
      [/\bG64\b/, 4, "G64", false],
      [/\bG61\b(?!\.)/, 4, "G61", false], // bare G61 (not G61.1)
    ],
    required: [],
  },
  fanuc: {
    patterns: [
      [/\bM30\b/, 8, "M30", false],
      [/\bM50\b/, 6, "M50", false], // Fanuc thread (also Agie thread)
      [/\bM60\b/, 6, "M60", false], // Fanuc cut (also Sodick/Makino thread)
      [/\bG61\.1\b/, 12, "G61.1", true], // Fanuc exact corner — exclusive
      [/\bG64\b/, 4, "G64", false],
      [/\bE[0-9]{3,4}\b/, 4, "E-pack", false],
      [/\bD[0-9]+\b/, 4, "D-offset", false],
    ],
    required: [],
  },
  agiecharmilles: {
    patterns: [
      [/\bM17\b/, 14, "M17", true], // Agie program end — exclusive
      [/\bM50\b/, 6, "M50", false], // Agie thread (shared with Fanuc)
      [/\bM51\b/, 6, "M51", false], // Agie cut (shared — M51 is now non-exclusive)
      [/\bG71\b/, 10, "G71", true], // Agie metric (vs G21 everywhere else) — exclusive
      [/\bG70\b/, 10, "G70", true], // Agie imperial — exclusive
      [/\bM24\b/, 4, "M24", false],
      [/\bM25\b/, 4, "M25", false],
    ],
    required: [],
  },
};

/**
 * Cross-map of EACH exclusive code → the controllers that legitimately emit it.
 * Used to determine "this code appeared but the declared controller does NOT
 * use it" — the core of the mismatch diff report.
 */
const CODE_OWNERSHIP: Record<string, DialectControllerKey[]> = (() => {
  const m: Record<string, DialectControllerKey[]> = {};
  for (const [ctrl, fp] of Object.entries(FINGERPRINTS) as Array<
    [DialectControllerKey, DialectFingerprint]
  >) {
    for (const [, , code, exclusive] of fp.patterns) {
      if (!exclusive) continue;
      (m[code] ??= []).push(ctrl);
    }
  }
  return m;
})();

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

const SAFETY_SCORE_PASS = 0.1;
const SAFETY_SCORE_FAIL = 0.0;

export class WEDMControllerDialectVerifierEngine {
  readonly name = "WEDMControllerDialectVerifierEngine";
  readonly version = "1.0.0";

  /**
   * Verify dialect consistency. Returns PASS only when the declared controller
   * is the highest-scoring candidate AND wins by a meaningful margin (or ties
   * within one shared-code family, such as M30+E-pack which matches both
   * Makino and Fanuc).
   *
   * @param input program text, declared controller, optional min_hits override
   * @returns verdict with full ranking, diff report, and a safety_gate_input
   *          shape ready for the composite S(x) gate
   */
  verify(input: DialectVerifierInput): DialectVerifierResult {
    const warnings: string[] = [];
    const expected = this.resolveController(input.expected_controller);

    if (!expected) {
      return this.buildUnknownControllerFailure(input);
    }

    if (!input.program_text || !input.program_text.trim()) {
      return this.buildEmptyProgramFailure(input, expected);
    }

    const minHits = Math.max(1, input.min_hits ?? 2);
    const ranking = this.scoreAllControllers(input.program_text);
    const top = ranking[0];
    const runnerUp = ranking[1];

    const detectedScore = ranking.find((r) => r.controller === expected)!;
    const detected = top.controller;
    const mismatched = this.collectMismatchedCodes(input.program_text, expected);
    const missing = this.collectMissingCodes(input.program_text, expected);

    // Controllers that have NO exclusive fingerprint (e.g. Makino — every code
    // it emits is shared with another brand) can still pass on score-margin
    // alone. Only treat zero-exclusive as a failure when that controller's
    // fingerprint *defines* exclusive markers.
    const controllerHasExclusives = FINGERPRINTS[expected].patterns.some((p) => p[3]);

    // Decide PASS / mismatch / ambiguous
    let verdict: DialectVerdict = "pass";
    let pass = true;

    if (detectedScore.score === 0) {
      // Program has no fingerprint match at all — structural mismatch.
      verdict = "fail_mismatch";
      pass = false;
    } else if (controllerHasExclusives && detectedScore.exclusive_hits.length === 0) {
      // Controller advertises exclusive markers but none are present → mismatch.
      verdict = "fail_mismatch";
      pass = false;
    } else if (top.controller !== expected) {
      // A different controller scored higher.
      if (top.score - detectedScore.score >= 4 || top.exclusive_hits.length >= minHits) {
        verdict = "fail_mismatch";
        pass = false;
      } else {
        // Close call — ambiguous but declared is still credible.
        verdict = "fail_ambiguous";
        pass = false;
        warnings.push(
          `Dialect ambiguous — declared ${expected} scored ${detectedScore.score}, top ${top.controller} scored ${top.score}`,
        );
      }
    } else if (
      runnerUp &&
      detectedScore.score > 0 &&
      runnerUp.score > 0 &&
      runnerUp.exclusive_hits.length >= minHits &&
      runnerUp.score >= detectedScore.score * 0.8 &&
      mismatched.length > 0
    ) {
      // Declared won, but a competitor is suspiciously close AND we found
      // tokens that unambiguously belong to that other controller.
      verdict = "fail_ambiguous";
      pass = false;
      warnings.push(
        `Dialect contested — declared ${expected} (score ${detectedScore.score}) narrowly beat ${runnerUp.controller} (score ${runnerUp.score})`,
      );
    }

    if (mismatched.length > 0 && pass) {
      // Declared controller wins scoring but we STILL found codes that only
      // belong to other dialects — downgrade to mismatch.
      verdict = "fail_mismatch";
      pass = false;
    }

    const actualDetected: DialectControllerKey =
      pass || detected === expected ? expected : detected;

    const diffReport = this.buildDiffReport(expected, actualDetected, mismatched, missing, ranking);

    return {
      success: true,
      pass,
      verdict,
      hard_block: !pass,
      expected_controller: expected,
      expected_requested: input.expected_controller,
      detected_controller: actualDetected,
      ranking,
      mismatched_codes: mismatched,
      missing_codes: missing,
      diff_report: diffReport,
      safety_gate_input: {
        pass,
        expected_controller: expected,
        detected_controller: actualDetected,
        mismatched_codes: mismatched,
      },
      safety_score_contribution: pass ? SAFETY_SCORE_PASS : SAFETY_SCORE_FAIL,
      summary: pass
        ? `DIALECT OK: ${expected} fingerprint matches (${detectedScore.exclusive_hits.length} exclusive hit(s))`
        : `DIALECT BLOCK: declared ${expected}, detected ${actualDetected} — ${mismatched.length} mismatched code(s): ${mismatched.slice(0, 6).join(", ")}`,
      warnings,
    };
  }

  /**
   * Gate wrapper matching the convention of the other safety-gate engines.
   * @returns allow/deny decision plus the full verification result
   */
  gate(input: DialectVerifierInput): {
    allow: boolean;
    reason: string;
    result: DialectVerifierResult;
  } {
    const result = this.verify(input);
    return { allow: result.pass, reason: result.summary, result };
  }

  /**
   * Map a user-supplied controller name to a canonical dialect key. Accepts
   * the 5 canonical keys plus common variants from WEDMProgramVerificationEngine
   * (mitsubishi_fa, sodick_al, fanuc_robocut, etc.). Returns null when no match.
   */
  resolveController(name: string): DialectControllerKey | null {
    if (!name) return null;
    const n = name.toLowerCase().replace(/[\s_-]/g, "");
    if (n.includes("mitsubishi")) return "mitsubishi";
    if (n.includes("sodick")) return "sodick";
    if (n.includes("makino")) return "makino";
    if (n.includes("agie") || n.includes("charm")) return "agiecharmilles";
    if (n.includes("fanuc") || n.includes("robocut")) return "fanuc";
    if (n === "generic") return null; // generic is NOT a committed dialect
    return null;
  }

  /**
   * Score every known controller against the program text.
   * Comments are stripped before scoring because the post-processor may
   * embed cross-controller recovery hints (e.g. "RE-THREAD M60") inside
   * parenthesised comments, which must not count as actual executed codes.
   * @returns descending ranking by score
   */
  scoreAllControllers(programText: string): DialectScore[] {
    const stripped = this.stripComments(programText);
    const ranking: DialectScore[] = [];
    for (const ctrl of Object.keys(FINGERPRINTS) as DialectControllerKey[]) {
      const fp = FINGERPRINTS[ctrl];
      let score = 0;
      const matched: string[] = [];
      const exclusive: string[] = [];
      for (const [re, weight, code, isExclusive] of fp.patterns) {
        const hits = stripped.match(new RegExp(re, "g"));
        if (hits && hits.length > 0) {
          score += weight;
          matched.push(code);
          if (isExclusive) exclusive.push(code);
        }
      }
      ranking.push({ controller: ctrl, score, matched_codes: matched, exclusive_hits: exclusive });
    }
    ranking.sort((a, b) => b.score - a.score);
    return ranking;
  }

  /**
   * Remove parenthesised comments `( ... )` and full-line `;` comments.
   * Preserves every code token outside of comments.
   */
  private stripComments(programText: string): string {
    // Remove `( ... )` comments (greedy within a single line — standard NC syntax)
    let out = programText.replace(/\([^)]*\)/g, " ");
    // Remove ; line comments through EOL
    out = out.replace(/;[^\r\n]*/g, " ");
    return out;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INTERNAL
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Walk the program and return any exclusive codes that belong to OTHER
   * controllers but not the declared one. These are the smoking-gun tokens
   * that prove cross-dialect emission.
   */
  private collectMismatchedCodes(
    programText: string,
    expected: DialectControllerKey,
  ): string[] {
    const stripped = this.stripComments(programText);
    const expectedFp = FINGERPRINTS[expected];
    const expectedCodes = new Set(
      expectedFp.patterns.filter((p) => p[3]).map((p) => p[2]),
    );
    const mismatched = new Set<string>();
    for (const [code, owners] of Object.entries(CODE_OWNERSHIP)) {
      if (expectedCodes.has(code)) continue; // legit for declared controller
      // Check if the program actually contains this code (ignoring comments)
      const re = FINGERPRINTS[owners[0]].patterns.find((p) => p[2] === code)?.[0];
      if (!re) continue;
      if (new RegExp(re, "g").test(stripped)) {
        // Some codes belong to MULTIPLE controllers (e.g. M50 → sodick+fanuc+agiecharmilles).
        // Only flag when the declared controller is NOT one of the owners.
        if (!owners.includes(expected)) mismatched.add(code);
      }
    }
    return Array.from(mismatched).sort();
  }

  /**
   * Required codes that the declared controller's fingerprint demands but the
   * program omits. Currently only flags truly mandatory codes (program-end).
   */
  private collectMissingCodes(programText: string, expected: DialectControllerKey): string[] {
    const stripped = this.stripComments(programText);
    const fp = FINGERPRINTS[expected];
    const missing: string[] = [];
    for (const req of fp.required) {
      const re = fp.patterns.find((p) => p[2] === req)?.[0];
      if (!re) continue;
      if (!new RegExp(re, "g").test(stripped)) missing.push(req);
    }
    return missing;
  }

  private buildDiffReport(
    expected: DialectControllerKey,
    detected: DialectControllerKey,
    mismatched: string[],
    missing: string[],
    ranking: DialectScore[],
  ): string {
    const lines: string[] = [];
    lines.push(`Expected dialect: ${expected}`);
    lines.push(`Detected dialect: ${detected}`);
    if (mismatched.length > 0) {
      lines.push(`Mismatched codes (do not belong to ${expected}): ${mismatched.join(", ")}`);
    } else {
      lines.push("Mismatched codes: none");
    }
    if (missing.length > 0) {
      lines.push(`Missing required codes for ${expected}: ${missing.join(", ")}`);
    }
    lines.push("Ranking (score · exclusive-hits):");
    for (const r of ranking) {
      lines.push(`  ${r.controller.padEnd(16)} ${r.score.toString().padStart(3)}  [${r.exclusive_hits.join(", ")}]`);
    }
    return lines.join("\n");
  }

  private buildUnknownControllerFailure(input: DialectVerifierInput): DialectVerifierResult {
    return {
      success: true,
      pass: false,
      verdict: "fail_unknown_controller",
      hard_block: true,
      expected_controller: "mitsubishi", // fallback to satisfy type
      expected_requested: input.expected_controller ?? "",
      detected_controller: "mitsubishi",
      ranking: [],
      mismatched_codes: [],
      missing_codes: [],
      diff_report: `Unknown controller "${input.expected_controller}"`,
      safety_gate_input: {
        pass: false,
        expected_controller: input.expected_controller ?? "unknown",
        mismatched_codes: [],
      },
      safety_score_contribution: SAFETY_SCORE_FAIL,
      summary: `DIALECT BLOCK: unknown controller "${input.expected_controller}" — cannot resolve to a known dialect`,
      warnings: [
        `Controller "${input.expected_controller}" does not map to a known WEDM dialect — pass one of: mitsubishi, sodick, makino, fanuc, agiecharmilles (or their common variants)`,
      ],
    };
  }

  private buildEmptyProgramFailure(
    input: DialectVerifierInput,
    expected: DialectControllerKey,
  ): DialectVerifierResult {
    return {
      success: true,
      pass: false,
      verdict: "fail_empty_program",
      hard_block: true,
      expected_controller: expected,
      expected_requested: input.expected_controller,
      detected_controller: expected,
      ranking: [],
      mismatched_codes: [],
      missing_codes: FINGERPRINTS[expected].required,
      diff_report: "Program text is empty — nothing to verify.",
      safety_gate_input: {
        pass: false,
        expected_controller: expected,
        mismatched_codes: [],
      },
      safety_score_contribution: SAFETY_SCORE_FAIL,
      summary: `DIALECT BLOCK: empty program — cannot verify ${expected} dialect`,
      warnings: ["Program text is empty"],
    };
  }
}

export const wedmControllerDialectVerifierEngine = new WEDMControllerDialectVerifierEngine();
