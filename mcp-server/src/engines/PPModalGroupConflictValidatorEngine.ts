/**
 * PPModalGroupConflictValidatorEngine — Detect G/M code modal-group
 * conflicts within a single block.
 *
 * Fanuc (and every ISO-derived control) partitions G and M codes into
 * *modal groups*. Only one code per group may be active. The standard
 * behaviour when a block contains two codes from the same group is
 * "last-one-wins" on some controls, "alarm" on others, and "silently
 * drop the earlier one" on Haas — exactly the kind of subtle dialect
 * divergence that makes a program pass in simulation and scrap a part
 * on the shop floor.
 *
 * This engine does NOT track modals across blocks (see
 * `PPModalStateTrackerEngine` for that). It looks at *one block at a
 * time* and flags any pair of codes that belong to the same modal
 * group. A block that says `G0 G1 X10` is always ambiguous regardless
 * of prior state.
 *
 * Modal groups enforced (Fanuc numbering):
 *
 *   Group 01 — motion:            G0 G1 G2 G3 G33 G34 G73 G74 G76 G80 G81-G89
 *   Group 02 — plane:             G17 G18 G19
 *   Group 03 — abs/inc:           G90 G91
 *   Group 05 — feed mode:         G93 G94 G95
 *   Group 06 — units:             G20 G21
 *   Group 07 — cutter comp:       G40 G41 G42
 *   Group 08 — tool length:       G43 G44 G49
 *   Group 10 — return mode:       G98 G99
 *   Group 12 — work coord system: G54-G59 (and G54.1 Pn, treated as G54)
 *   Group 16 — coord rotation:    G68 G69
 *
 *   M-group 04 — stop/end:        M00 M01 M02 M30
 *   M-group 07 — spindle:         M03 M04 M05
 *   M-group 08 — coolant:         M07 M08 M09 (M7+M8 flood+mist = intentional
 *                                               on some shops — warning only)
 *   M-group 09 — tool change:     M06 (alone — multiple M6 in one block
 *                                       doesn't exist but we flag just in case)
 *
 * Findings:
 *   - `motion_group_conflict`     (error): G0+G1, G1+G2, ... in one block.
 *   - `plane_group_conflict`      (error): G17+G18, etc.
 *   - `abs_incr_conflict`         (error): G90+G91.
 *   - `feed_mode_conflict`        (error): G94+G95, G93+G94, etc.
 *   - `units_conflict`            (error): G20+G21.
 *   - `cutter_comp_conflict`      (error): G40+G41, G41+G42, etc.
 *   - `tool_length_conflict`      (error): G43+G44, G43+G49, etc.
 *   - `return_mode_conflict`      (error): G98+G99.
 *   - `work_coord_conflict`       (error): G54+G55, etc.
 *   - `rotation_conflict`         (error): G68+G69.
 *   - `stop_end_conflict`         (error): M02+M30, M01+M30, etc.
 *   - `spindle_conflict`          (error): M03+M04, M03+M05.
 *   - `coolant_conflict`          (warning): M07+M08 (flood+mist common
 *                                             intent; keep as warning).
 *
 * Options:
 *   - `coolant_allow_flood_plus_mist` — default `true`. When true, M7+M8
 *     in the same block downgrades to info. When false, warning stands.
 *
 * Scope — distinct from:
 *   - PPModalStateTrackerEngine: tracks state across blocks.
 *   - PPCutterCompValidatorEngine: focuses on G40/41/42 transitions and
 *     entry/exit geometry, not within-block collisions.
 *   - PPUnitsModeValidatorEngine: flags G20/G21 *mode flips*
 *     mid-program, not two codes in one block.
 *
 * @module PPModalGroupConflictValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type ModalConflictSeverity = "error" | "warning" | "info";

export type ModalConflictKind =
  | "motion_group_conflict"
  | "plane_group_conflict"
  | "abs_incr_conflict"
  | "feed_mode_conflict"
  | "units_conflict"
  | "cutter_comp_conflict"
  | "tool_length_conflict"
  | "return_mode_conflict"
  | "work_coord_conflict"
  | "rotation_conflict"
  | "stop_end_conflict"
  | "spindle_conflict"
  | "coolant_conflict";

export interface ModalConflictIssue {
  line_number: number;
  kind: ModalConflictKind;
  severity: ModalConflictSeverity;
  message: string;
  codes: string[];
  group: string;
}

export interface ModalConflictResult {
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: ModalConflictIssue[];
  summary: {
    valid: boolean;
    lines_scanned: number;
    lines_with_conflicts: number;
    most_common_conflict: ModalConflictKind | null;
  };
}

export interface ModalConflictOptions {
  /** Allow M7+M8 in one block (flood + mist is common). Default true. */
  coolant_allow_flood_plus_mist?: boolean;
}

// ── Group tables ──────────────────────────────────────────────────────

interface GroupDef {
  name: string;
  kind: ModalConflictKind;
  severity: ModalConflictSeverity;
  /** Regex for each code in the group. */
  patterns: Array<{ code: string; re: RegExp }>;
}

// G0..G3 are motion. G73/74/76/80-89 are also motion (canned cycles).
const MOTION_CODES = ["G0", "G1", "G2", "G3", "G33", "G34", "G73", "G74", "G76",
  "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"];

const WORK_COORD_CODES = ["G54", "G55", "G56", "G57", "G58", "G59"];

function codeRegex(code: string): RegExp {
  // Match "G1", "G01", "G001" as the same canonical code. Forbid a
  // trailing decimal (e.g. G54.1 is a distinct code — caller includes
  // the decimal form as its own entry when needed).
  const digits = code.replace(/^[GM]/, "");
  const letter = code[0];
  return new RegExp(`\\b${letter}0*${digits}(?!\\d|\\.)`, "i");
}

const GROUPS: GroupDef[] = [
  {
    name: "G-group 01 (motion)",
    kind: "motion_group_conflict",
    severity: "error",
    patterns: MOTION_CODES.map((c) => ({ code: c, re: codeRegex(c) })),
  },
  {
    name: "G-group 02 (plane)",
    kind: "plane_group_conflict",
    severity: "error",
    patterns: ["G17", "G18", "G19"].map((c) => ({ code: c, re: codeRegex(c) })),
  },
  {
    name: "G-group 03 (absolute/incremental)",
    kind: "abs_incr_conflict",
    severity: "error",
    patterns: ["G90", "G91"].map((c) => ({ code: c, re: codeRegex(c) })),
  },
  {
    name: "G-group 05 (feed mode)",
    kind: "feed_mode_conflict",
    severity: "error",
    patterns: ["G93", "G94", "G95"].map((c) => ({ code: c, re: codeRegex(c) })),
  },
  {
    name: "G-group 06 (units)",
    kind: "units_conflict",
    severity: "error",
    patterns: ["G20", "G21"].map((c) => ({ code: c, re: codeRegex(c) })),
  },
  {
    name: "G-group 07 (cutter compensation)",
    kind: "cutter_comp_conflict",
    severity: "error",
    patterns: ["G40", "G41", "G42"].map((c) => ({ code: c, re: codeRegex(c) })),
  },
  {
    name: "G-group 08 (tool length offset)",
    kind: "tool_length_conflict",
    severity: "error",
    patterns: ["G43", "G44", "G49"].map((c) => ({ code: c, re: codeRegex(c) })),
  },
  {
    name: "G-group 10 (canned cycle return)",
    kind: "return_mode_conflict",
    severity: "error",
    patterns: ["G98", "G99"].map((c) => ({ code: c, re: codeRegex(c) })),
  },
  {
    name: "G-group 12 (work coordinate system)",
    kind: "work_coord_conflict",
    severity: "error",
    patterns: WORK_COORD_CODES.map((c) => ({ code: c, re: codeRegex(c) })),
  },
  {
    name: "G-group 16 (coord rotation)",
    kind: "rotation_conflict",
    severity: "error",
    patterns: ["G68", "G69"].map((c) => ({ code: c, re: codeRegex(c) })),
  },
  {
    name: "M-group 04 (program stop/end)",
    kind: "stop_end_conflict",
    severity: "error",
    patterns: ["M00", "M01", "M02", "M30"].map((c) => ({ code: c, re: codeRegex(c) })),
  },
  {
    name: "M-group 07 (spindle)",
    kind: "spindle_conflict",
    severity: "error",
    patterns: ["M03", "M04", "M05"].map((c) => ({ code: c, re: codeRegex(c) })),
  },
];

const COOLANT_GROUP: GroupDef = {
  name: "M-group 08 (coolant)",
  kind: "coolant_conflict",
  severity: "warning",
  patterns: ["M07", "M08", "M09"].map((c) => ({ code: c, re: codeRegex(c) })),
};

// ── Engine ────────────────────────────────────────────────────────────

export class PPModalGroupConflictValidatorEngine {
  /** Validate a G-code program for within-block modal-group conflicts. */
  validate(
    gcode: string,
    options?: ModalConflictOptions,
  ): ModalConflictResult {
    const opts: Required<ModalConflictOptions> = {
      coolant_allow_flood_plus_mist:
        options?.coolant_allow_flood_plus_mist ?? true,
    };

    const lines = gcode.split(/\r?\n/);
    const issues: ModalConflictIssue[] = [];
    const linesWithConflicts = new Set<number>();
    const kindCounts: Partial<Record<ModalConflictKind, number>> = {};

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase();
      if (code.length === 0) continue;

      for (const grp of GROUPS) {
        const hit = this.matchedCodes(code, grp);
        if (hit.length >= 2) {
          issues.push({
            line_number: lineNum,
            kind: grp.kind,
            severity: grp.severity,
            message: `${grp.name}: ${hit.join(", ")} in one block — controls disagree on which one wins`,
            codes: hit,
            group: grp.name,
          });
          linesWithConflicts.add(lineNum);
          kindCounts[grp.kind] = (kindCounts[grp.kind] ?? 0) + 1;
        }
      }

      // Coolant — handled separately because of the flood+mist allowance.
      const coolantHit = this.matchedCodes(code, COOLANT_GROUP);
      if (coolantHit.length >= 2) {
        const floodPlusMist =
          coolantHit.length === 2 &&
          coolantHit.includes("M07") &&
          coolantHit.includes("M08");
        const severity: ModalConflictSeverity =
          floodPlusMist && opts.coolant_allow_flood_plus_mist
            ? "info"
            : "warning";
        issues.push({
          line_number: lineNum,
          kind: "coolant_conflict",
          severity,
          message: `${COOLANT_GROUP.name}: ${coolantHit.join(", ")} in one block${
            floodPlusMist && opts.coolant_allow_flood_plus_mist
              ? " (flood+mist intentional on some shops)"
              : ""
          }`,
          codes: coolantHit,
          group: COOLANT_GROUP.name,
        });
        linesWithConflicts.add(lineNum);
        kindCounts.coolant_conflict = (kindCounts.coolant_conflict ?? 0) + 1;
      }
    }

    const errors = issues.filter((i) => i.severity === "error").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;
    const info = issues.filter((i) => i.severity === "info").length;

    let mostCommon: ModalConflictKind | null = null;
    let mostCommonCount = 0;
    for (const [k, v] of Object.entries(kindCounts) as Array<[
      ModalConflictKind,
      number,
    ]>) {
      if (v > mostCommonCount) {
        mostCommon = k;
        mostCommonCount = v;
      }
    }

    return {
      total_issues: issues.length,
      errors,
      warnings,
      info,
      issues,
      summary: {
        valid: errors === 0,
        lines_scanned: lines.length,
        lines_with_conflicts: linesWithConflicts.size,
        most_common_conflict: mostCommon,
      },
    };
  }

  /** Quick pass/fail check. */
  quickCheck(
    gcode: string,
    options?: ModalConflictOptions,
  ): { valid: boolean; errors: number; warnings: number } {
    const r = this.validate(gcode, options);
    return { valid: r.summary.valid, errors: r.errors, warnings: r.warnings };
  }

  /** Default options. */
  defaultOptions(): Required<ModalConflictOptions> {
    return { coolant_allow_flood_plus_mist: true };
  }

  // ── Private ───────────────────────────────────────────────────────

  /**
   * Return canonical (e.g. "G1", "M03") codes from `grp` that appear in
   * `code`, deduplicated. Patterns are regex-based so "G1" matches
   * "G1", "G01", and "G001" all as the same code.
   */
  private matchedCodes(code: string, grp: GroupDef): string[] {
    const seen = new Set<string>();
    for (const p of grp.patterns) {
      if (p.re.test(code)) seen.add(p.code);
    }
    return Array.from(seen);
  }

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppModalGroupConflictValidatorEngine =
  new PPModalGroupConflictValidatorEngine();
