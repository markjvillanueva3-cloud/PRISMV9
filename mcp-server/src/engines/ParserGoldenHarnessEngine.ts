/**
 * ParserGoldenHarnessEngine (U-LPR-PARSER-TESTS)
 *
 * Golden-file regression harness for G-code / post-processor / CPS
 * parsers. The Lathe-Prod pilot exposes a wide variety of dialects
 * (Fanuc, Okuma OSP, Haas, Mitsubishi sinker EDM, Mitsubishi wire EDM,
 * Hurco) and the single-biggest way a parser can silently rot is a
 * one-off regression that changes the interpretation of a single line
 * across an entire fleet of existing programs. This engine locks a
 * canonical "expected parse" per sample file and flags any drift.
 *
 * Each case pins:
 *   - input_sha256       — sha256 of the exact input bytes we tested.
 *   - expected_ast_sha256— sha256 of the JSON-canonicalised AST the
 *                          parser emitted at freeze time.
 *   - expected_error?    — if the case was a deliberate rejection, we
 *                          freeze the error code (not the human message,
 *                          to avoid whitespace rot).
 *   - quarantine?        — reason + expiry for cases that are known
 *                          flaky (e.g. still-evolving Okuma CFIXA
 *                          rules). Quarantined cases downgrade hard
 *                          failures to soft breaches.
 *
 * evaluate() accepts a batch of parser runs, diffs against the frozen
 * golden, and emits:
 *   - hard_breaches      — block the CI run.
 *   - soft_breaches      — reported but do not block.
 *   - missing_cases      — cases in the golden we did not exercise.
 *   - new_cases          — runs with no matching golden (OK during
 *                          authoring, flagged so they get added).
 *
 * Pure engine. Caller persists via `toSnapshot()` to
 * `data/state/PARSER_GOLDEN.json` (schemaVersion 1).
 */

export type BreachKind =
  | "AST_DIFF"
  | "ERROR_DIFF"
  | "UNEXPECTED_ERROR"
  | "UNEXPECTED_SUCCESS";

export interface GoldenCase {
  case_id: string;                     // canonical name (e.g. "okuma-osp-g71-sample-01")
  dialect: string;                     // e.g. "okuma-osp", "fanuc-16i", "wedm-mitsubishi"
  input_sha256: string;                // sha256(raw bytes) — 64-hex
  expected_ast_sha256?: string;        // for success cases
  expected_error?: string;             // for rejection cases
  frozen_at: number;
  frozen_by: string;
  description?: string;
}

export interface QuarantineEntry {
  case_id: string;
  reason: string;
  filed_at: number;
  filed_by: string;
  expires_at?: number;
}

export interface ParserRun {
  case_id: string;
  input_sha256: string;
  parse_ok: boolean;
  ast_sha256?: string;
  error_code?: string;
  run_at: number;
  parser_version?: string;
}

export interface BreachDetail {
  case_id: string;
  kind: BreachKind;
  expected: string;
  got: string;
}

export interface EvaluationReport {
  total_runs: number;
  passed: boolean;
  hard_breaches: BreachDetail[];
  soft_breaches: BreachDetail[];
  missing_cases: string[];
  new_cases: string[];
}

const SHA256_REGEX = /^[0-9a-f]{64}$/;

export class ParserGoldenHarnessEngine {
  private golden = new Map<string, GoldenCase>();
  private quarantine = new Map<string, QuarantineEntry>();

  freeze(cases: GoldenCase[], frozen_by: string): number {
    if (!frozen_by.trim()) throw new Error("frozen_by required");
    if (cases.length === 0) throw new Error("cannot freeze empty golden");
    const seen = new Set<string>();
    for (const c of cases) {
      if (!c.case_id.trim()) throw new Error("case_id required");
      if (seen.has(c.case_id)) {
        throw new Error(`duplicate case_id ${c.case_id} in batch`);
      }
      seen.add(c.case_id);
      if (!c.dialect.trim()) throw new Error(`case ${c.case_id}: dialect required`);
      if (!SHA256_REGEX.test(c.input_sha256)) {
        throw new Error(`case ${c.case_id}: input_sha256 must be 64-hex lower-case`);
      }
      const isSuccessCase = c.expected_ast_sha256 !== undefined;
      const isRejectionCase = c.expected_error !== undefined;
      if (isSuccessCase === isRejectionCase) {
        throw new Error(
          `case ${c.case_id}: must set exactly one of expected_ast_sha256 or expected_error`,
        );
      }
      if (isSuccessCase && !SHA256_REGEX.test(c.expected_ast_sha256!)) {
        throw new Error(`case ${c.case_id}: expected_ast_sha256 must be 64-hex`);
      }
      if (isRejectionCase && !c.expected_error!.trim()) {
        throw new Error(`case ${c.case_id}: expected_error cannot be empty`);
      }
    }
    this.golden.clear();
    for (const c of cases) {
      this.golden.set(c.case_id, {
        ...c,
        frozen_by: frozen_by.trim(),
      });
    }
    return this.golden.size;
  }

  quarantineCase(input: QuarantineEntry): void {
    if (!input.case_id.trim()) throw new Error("case_id required");
    if (!this.golden.has(input.case_id)) {
      throw new Error(`case ${input.case_id} not in golden`);
    }
    if (!input.reason || input.reason.trim().length < 20) {
      throw new Error("quarantine reason must be ≥20 chars");
    }
    if (
      input.expires_at !== undefined &&
      input.expires_at <= input.filed_at
    ) {
      throw new Error("expires_at must be > filed_at");
    }
    if (!input.filed_by.trim()) throw new Error("filed_by required");
    this.quarantine.set(input.case_id, {
      ...input,
      reason: input.reason.trim(),
      filed_by: input.filed_by.trim(),
    });
  }

  liftQuarantine(case_id: string): boolean {
    return this.quarantine.delete(case_id);
  }

  isQuarantined(case_id: string, now?: number): boolean {
    const q = this.quarantine.get(case_id);
    if (!q) return false;
    if (q.expires_at !== undefined) {
      const ts = now ?? Date.now();
      if (ts >= q.expires_at) return false;
    }
    return true;
  }

  listQuarantine(now?: number): QuarantineEntry[] {
    const out: QuarantineEntry[] = [];
    const ts = now ?? Date.now();
    for (const q of this.quarantine.values()) {
      if (q.expires_at !== undefined && ts >= q.expires_at) continue;
      out.push({ ...q });
    }
    return out;
  }

  evaluate(runs: ParserRun[]): EvaluationReport {
    const hard: BreachDetail[] = [];
    const soft: BreachDetail[] = [];
    const missing: string[] = [];
    const newCases: string[] = [];
    const seenCases = new Set<string>();

    for (const run of runs) {
      if (!SHA256_REGEX.test(run.input_sha256)) {
        throw new Error(
          `run ${run.case_id}: input_sha256 must be 64-hex lower-case`,
        );
      }
      if (run.ast_sha256 !== undefined && !SHA256_REGEX.test(run.ast_sha256)) {
        throw new Error(`run ${run.case_id}: ast_sha256 must be 64-hex`);
      }
      const gold = this.golden.get(run.case_id);
      if (!gold) {
        newCases.push(run.case_id);
        continue;
      }
      seenCases.add(run.case_id);
      const detail = this.diff(gold, run);
      if (detail === null) continue;
      if (this.isQuarantined(run.case_id, run.run_at)) {
        soft.push(detail);
      } else {
        hard.push(detail);
      }
    }

    for (const case_id of this.golden.keys()) {
      if (!seenCases.has(case_id)) missing.push(case_id);
    }

    return {
      total_runs: runs.length,
      passed: hard.length === 0,
      hard_breaches: hard,
      soft_breaches: soft,
      missing_cases: missing,
      new_cases: newCases,
    };
  }

  private diff(gold: GoldenCase, run: ParserRun): BreachDetail | null {
    // Parser must have been fed the SAME input; mismatched input_sha256
    // is a hard AST_DIFF (we do not trust a run keyed on stale bytes).
    if (gold.input_sha256 !== run.input_sha256) {
      return {
        case_id: run.case_id,
        kind: "AST_DIFF",
        expected: `input ${gold.input_sha256}`,
        got: `input ${run.input_sha256}`,
      };
    }
    const expectRejection = gold.expected_error !== undefined;
    if (expectRejection) {
      if (run.parse_ok) {
        return {
          case_id: run.case_id,
          kind: "UNEXPECTED_SUCCESS",
          expected: `error ${gold.expected_error}`,
          got: `ast ${run.ast_sha256 ?? "<missing>"}`,
        };
      }
      if ((run.error_code ?? "") !== gold.expected_error) {
        return {
          case_id: run.case_id,
          kind: "ERROR_DIFF",
          expected: gold.expected_error!,
          got: run.error_code ?? "<missing>",
        };
      }
      return null;
    }
    // Success-expected case
    if (!run.parse_ok) {
      return {
        case_id: run.case_id,
        kind: "UNEXPECTED_ERROR",
        expected: `ast ${gold.expected_ast_sha256}`,
        got: `error ${run.error_code ?? "<missing>"}`,
      };
    }
    if (run.ast_sha256 !== gold.expected_ast_sha256) {
      return {
        case_id: run.case_id,
        kind: "AST_DIFF",
        expected: gold.expected_ast_sha256!,
        got: run.ast_sha256 ?? "<missing>",
      };
    }
    return null;
  }

  listGolden(filter?: { dialect?: string }): GoldenCase[] {
    const out: GoldenCase[] = [];
    for (const c of this.golden.values()) {
      if (filter?.dialect && c.dialect !== filter.dialect) continue;
      out.push({ ...c });
    }
    return out;
  }

  getCase(case_id: string): GoldenCase | null {
    const c = this.golden.get(case_id);
    return c ? { ...c } : null;
  }

  toSnapshot(): {
    schemaVersion: 1;
    golden: GoldenCase[];
    quarantine: QuarantineEntry[];
  } {
    return {
      schemaVersion: 1,
      golden: this.listGolden(),
      quarantine: [...this.quarantine.values()].map((q) => ({ ...q })),
    };
  }

  loadSnapshot(snap: {
    schemaVersion: number;
    golden: GoldenCase[];
    quarantine: QuarantineEntry[];
  }): void {
    if (snap.schemaVersion !== 1) {
      throw new Error(`unsupported schemaVersion ${snap.schemaVersion}`);
    }
    this.golden.clear();
    this.quarantine.clear();
    for (const c of snap.golden) this.golden.set(c.case_id, { ...c });
    for (const q of snap.quarantine) this.quarantine.set(q.case_id, { ...q });
  }

  clearAll(): void {
    this.golden.clear();
    this.quarantine.clear();
  }
}

export const parserGoldenHarnessEngine = new ParserGoldenHarnessEngine();
