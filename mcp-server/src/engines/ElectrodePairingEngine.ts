/**
 * ElectrodePairingEngine — ARC-MS6 / muS-C22
 *
 * Sinker-EDM rougher/finisher electrode pairing: naming-convention parser
 * + sizing-rule validator.
 *
 * Shops fabricate electrode sets in cutting-order stages (rough → semi →
 * finish) and store them under shop-naming conventions where the stage is
 * encoded in the filename — `WAFER880_R.NC` (rough), `WAFER880_F.NC`
 * (finish), `ROUGH_WAFER880.NC`, `WAFER880_RUF1.NC`, etc.  This engine
 * groups a flat file listing into one ElectrodeSet per cavity and (when
 * dimensions are provided) validates that the stages are sized in cutting
 * order — rough ≥ semi ≥ finish in both length and width.
 *
 * Inputs: a list of filenames (typically from a directory listing of the
 * cavity's electrode programs) and optional per-file XY dimensions.
 * Outputs: grouped ElectrodeSet[] with completeness flags + per-set
 * warnings, plus the unpaired-files list and aggregate counts.
 *
 * Stage detection: pattern-based, case-insensitive, with sensible defaults
 * for the four common conventions ((suffix `_R/_S/_F`, word `_ROUGH/_SEMI/
 * _FINISH`, short `_RUF/_SEM/_FIN`, prefix `R_/S_/F_`).  Callers may
 * override the patterns entirely per shop.  Optional trailing digits on a
 * stage tag (`_R2`, `_FINISH3`) are captured as `stage_index`.
 *
 * References:
 *   - Shop naming-convention practice (JM Die electrode archive, 489 files,
 *     972 Roku-Roku programs — see PRISM-UNIFIED-ROADMAP-v2.md ARC-MS6).
 *   - Sinker electrode burn order: rough/semi/finish, decreasing spark gap
 *     → decreasing electrode size (GF Agie Charmilles sinker guide).
 */

import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

export type StageName = "rough" | "semi" | "finish";

/** Patterns to detect each stage tag inside a filename. Case-insensitive. */
export interface StagePatterns {
  rough: RegExp[];
  semi: RegExp[];
  finish: RegExp[];
}

export interface PairedStage {
  stage: StageName;
  file: string;
  /** Optional trailing digits on the stage tag (e.g. `_R2` → 2). */
  stage_index?: number;
  /** Which pattern matched, for traceability. */
  matched_pattern: string;
}

export interface ElectrodeSet {
  /** Base filename with the stage tag stripped — the cavity identifier. */
  cavity_id: string;
  /** Matched files in declared order (rough → semi → finish). */
  stages: PairedStage[];
  has_rough: boolean;
  has_semi: boolean;
  has_finish: boolean;
  /** Has rough + finish at minimum (a usable two-pass set). */
  is_usable: boolean;
  /** Has all three stages (rough + semi + finish). */
  is_complete: boolean;
  /**
   * Sizing consistency vs cutting order (rough ≥ semi ≥ finish in L & W).
   * `null` when no dimensions were supplied for any file in this set.
   */
  sizing_consistent: boolean | null;
  warnings: string[];
}

export interface ElectrodePairingResult {
  electrode_sets: ElectrodeSet[];
  /** Files that matched no stage pattern. */
  unpaired: string[];
  total_files: number;
  total_sets: number;
  complete_sets: number;
  usable_sets: number;
  notes: string[];
  warnings: string[];
}

// ============================================================================
// DEFAULT PATTERNS
// ============================================================================

/**
 * Default stage-tag patterns. The regexes capture optional trailing digits
 * as group 1 (the stage_index) and anchor on a path/extension boundary so
 * they don't false-match mid-word (e.g. `_RIM` won't trip the rough tag).
 *
 * Order matters per stage — longer/more-specific tags are tried first so
 * `_ROUGH` wins over `_R` when both could match.
 */
const DEFAULT_PATTERNS: StagePatterns = {
  rough: [
    /[_-]ROUGH(\d+)?(?=\.|_|-|$)/i,
    /[_-]RUF(\d+)?(?=\.|_|-|$)/i,
    /[_-]R(\d+)?(?=\.|_|-|$)/i,
    /^ROUGH[_-]/i,
    /^R[_-]/i,
  ],
  semi: [
    /[_-]SEMI(\d+)?(?=\.|_|-|$)/i,
    /[_-]SEM(\d+)?(?=\.|_|-|$)/i,
    /[_-]S(\d+)?(?=\.|_|-|$)/i,
    /^SEMI[_-]/i,
    /^S[_-]/i,
  ],
  finish: [
    /[_-]FINISH(\d+)?(?=\.|_|-|$)/i,
    /[_-]FIN(\d+)?(?=\.|_|-|$)/i,
    /[_-]F(\d+)?(?=\.|_|-|$)/i,
    /^FINISH[_-]/i,
    /^F[_-]/i,
  ],
};

/** Stage cutting order (rough first, finish last). */
const STAGE_ORDER: StageName[] = ["rough", "semi", "finish"];

// ============================================================================
// SCHEMA
// ============================================================================

const dimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
});

const electrodePairingInputSchema = z
  .object({
    /** Filenames to group. */
    files: z.array(z.string().min(1)).min(0),
    /** Optional XY dimensions per file (key = exact filename). */
    electrode_dimensions_mm: z
      .record(z.string(), dimensionsSchema)
      .optional(),
    /** Emit a result warning for any incomplete set. Default true. */
    warn_on_incomplete: z.boolean().optional(),
  })
  .strict();

export type ElectrodePairingInput = z.infer<
  typeof electrodePairingInputSchema
>;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Engine that groups electrode filenames into rough/semi/finish sets and
 * (when dimensions are supplied) validates per-stage sizing order.
 */
export class ElectrodePairingEngine {
  constructor(
    private readonly patterns: StagePatterns = DEFAULT_PATTERNS,
  ) {}

  /**
   * Group filenames into ElectrodeSet[] and report unpaired files.
   *
   * @param rawInput List of filenames + optional dimensions map.
   * @returns Grouped sets, unpaired list, and aggregate counts.
   * @throws Error (engine-named) when input fails validation.
   */
  pair(rawInput: unknown): ElectrodePairingResult {
    const parsed = electrodePairingInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      throw new Error(`ElectrodePairingEngine: invalid input — ${issues}`);
    }
    const input = parsed.data;
    const warnOnIncomplete = input.warn_on_incomplete ?? true;
    const dims = input.electrode_dimensions_mm ?? {};

    // Step 1 — classify every file.
    type Classified = {
      file: string;
      stage: StageName | null;
      stage_index?: number;
      cavity_id: string;
      matched_pattern: string;
    };
    const classified: Classified[] = input.files.map((file) => {
      const m = this.matchStage(file);
      if (!m) {
        return { file, stage: null, cavity_id: file, matched_pattern: "" };
      }
      return {
        file,
        stage: m.stage,
        stage_index: m.stage_index,
        cavity_id: m.cavity_id,
        matched_pattern: m.matched_pattern,
      };
    });

    // Step 2 — split unpaired from paired, then group paired by cavity_id.
    const unpaired: string[] = [];
    const groups = new Map<string, Classified[]>();
    for (const c of classified) {
      if (c.stage === null) {
        unpaired.push(c.file);
        continue;
      }
      const key = c.cavity_id;
      const list = groups.get(key) ?? [];
      list.push(c);
      groups.set(key, list);
    }

    // Step 3 — assemble ElectrodeSet for each group.
    const electrode_sets: ElectrodeSet[] = [];
    const aggregateWarnings: string[] = [];
    for (const [cavity_id, members] of groups) {
      const set = this.assembleSet(cavity_id, members, dims);
      electrode_sets.push(set);
      if (warnOnIncomplete && !set.is_complete) {
        const missing = STAGE_ORDER.filter((s) => {
          if (s === "rough") return !set.has_rough;
          if (s === "semi") return !set.has_semi;
          return !set.has_finish;
        });
        aggregateWarnings.push(
          `${cavity_id}: incomplete set (missing ${missing.join(", ")})`,
        );
      }
      if (set.sizing_consistent === false) {
        aggregateWarnings.push(
          `${cavity_id}: stage sizing violates cutting order (rough ≥ semi ≥ finish)`,
        );
      }
    }

    // Step 4 — sort sets by cavity_id for deterministic output.
    electrode_sets.sort((a, b) => a.cavity_id.localeCompare(b.cavity_id));

    const completeCount = electrode_sets.filter((s) => s.is_complete).length;
    const usableCount = electrode_sets.filter((s) => s.is_usable).length;
    const notes: string[] = [];
    if (input.files.length === 0) {
      notes.push("No input files — result is an empty grouping.");
    }
    if (unpaired.length > 0) {
      notes.push(
        `${unpaired.length} of ${input.files.length} file(s) matched no stage pattern — review the naming convention or supply patterns override.`,
      );
    }
    if (Object.keys(dims).length === 0 && electrode_sets.length > 0) {
      notes.push(
        "No dimensions supplied — sizing-rule validation skipped (sizing_consistent=null).",
      );
    }

    return {
      electrode_sets,
      unpaired,
      total_files: input.files.length,
      total_sets: electrode_sets.length,
      complete_sets: completeCount,
      usable_sets: usableCount,
      notes,
      warnings: aggregateWarnings,
    };
  }

  /**
   * Try to match a stage pattern against a filename. Returns the matched
   * stage, the cavity_id (filename with the stage tag stripped), and any
   * captured stage_index.  Order of attempt: rough → semi → finish, with
   * each stage's patterns tried longest/most-specific first.
   */
  private matchStage(
    file: string,
  ):
    | { stage: StageName; stage_index?: number; cavity_id: string; matched_pattern: string }
    | null {
    for (const stage of STAGE_ORDER) {
      for (const re of this.patterns[stage]) {
        const m = file.match(re);
        if (!m) continue;
        const matched = m[0];
        const idxStr = m[1];
        const stage_index = idxStr !== undefined ? Number(idxStr) : undefined;
        // Cavity id = filename with the matched tag removed, then any
        // resulting double separators collapsed back to one.
        const cavity_id = file
          .replace(matched, "")
          .replace(/([_-])[_-]+/g, "$1")
          .replace(/^[_-]|[_-]$/g, "");
        return {
          stage,
          stage_index,
          cavity_id: cavity_id || file, // never collapse to empty
          matched_pattern: matched,
        };
      }
    }
    return null;
  }

  private assembleSet(
    cavity_id: string,
    members: Array<{
      file: string;
      stage: StageName | null;
      stage_index?: number;
      matched_pattern: string;
    }>,
    dims: Record<string, { length: number; width: number }>,
  ): ElectrodeSet {
    // Pick one file per stage. If multiple files share a stage, prefer the
    // one with the smallest stage_index (or first encountered if no index).
    const byStage = new Map<StageName, (typeof members)[number]>();
    const extras: string[] = [];
    for (const m of members) {
      if (m.stage === null) continue;
      const existing = byStage.get(m.stage);
      if (!existing) {
        byStage.set(m.stage, m);
        continue;
      }
      const existingIdx = existing.stage_index ?? Number.POSITIVE_INFINITY;
      const newIdx = m.stage_index ?? Number.POSITIVE_INFINITY;
      if (newIdx < existingIdx) {
        extras.push(existing.file);
        byStage.set(m.stage, m);
      } else {
        extras.push(m.file);
      }
    }

    const stages: PairedStage[] = [];
    for (const stage of STAGE_ORDER) {
      const m = byStage.get(stage);
      if (!m) continue;
      stages.push({
        stage,
        file: m.file,
        stage_index: m.stage_index,
        matched_pattern: m.matched_pattern,
      });
    }

    const has_rough = byStage.has("rough");
    const has_semi = byStage.has("semi");
    const has_finish = byStage.has("finish");
    const is_complete = has_rough && has_semi && has_finish;
    const is_usable = has_rough && has_finish; // rough + finish minimum

    const warnings: string[] = [];
    if (extras.length > 0) {
      warnings.push(
        `Multiple files matched the same stage — kept lowest index, ignored: ${extras.join(", ")}`,
      );
    }

    // Sizing-rule validation (only if dimensions provided for at least one
    // stage in the set).
    let sizing_consistent: boolean | null = null;
    const sized = stages
      .map((s) => ({ stage: s.stage, file: s.file, d: dims[s.file] }))
      .filter((x): x is { stage: StageName; file: string; d: { length: number; width: number } } =>
        x.d !== undefined,
      );
    if (sized.length >= 2) {
      sizing_consistent = true;
      const orderRank: Record<StageName, number> = { rough: 0, semi: 1, finish: 2 };
      sized.sort((a, b) => orderRank[a.stage] - orderRank[b.stage]);
      for (let i = 1; i < sized.length; i++) {
        const prev = sized[i - 1];
        const curr = sized[i];
        if (prev.d.length < curr.d.length || prev.d.width < curr.d.width) {
          sizing_consistent = false;
          warnings.push(
            `Sizing violation between ${prev.stage} (${prev.file}) and ${curr.stage} (${curr.file}): expected rough ≥ semi ≥ finish.`,
          );
        }
      }
    }

    return {
      cavity_id,
      stages,
      has_rough,
      has_semi,
      has_finish,
      is_usable,
      is_complete,
      sizing_consistent,
      warnings,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const electrodePairingEngine = new ElectrodePairingEngine();
