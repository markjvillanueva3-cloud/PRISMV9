/**
 * ParserFuzzHarnessEngine (U-LPR-PARSER-FUZZ)
 *
 * Property-based + differential fuzz harness for G-code / post-processor
 * parsers. Works alongside ParserGoldenHarnessEngine — goldens lock
 * known-good behaviour, this engine hunts for new failures nobody has
 * seen yet.
 *
 * Three properties enforced on every parser observation:
 *
 *   P1 (no-panic):         parser returns { ok:bool, ... } — never
 *                          throws an uncaught exception on any input,
 *                          including adversarial garbage.
 *
 *   P2 (idempotent):       parsing the SAME bytes twice yields the
 *                          SAME AST hash / error code. Parser output
 *                          must not depend on anything but its input.
 *
 *   P3 (differential):     when two parsers claim support for the
 *                          same dialect, they must agree on whether
 *                          an input parses at all (success/reject
 *                          boundary). They may disagree on exact AST
 *                          hash — that is logged as a soft divergence.
 *                          A hard divergence is one accepts + the other
 *                          rejects.
 *
 * Corpus management:
 *
 *   addCorpusEntry() records a (dialect, input_sha256, input_bytes_len,
 *     category) tuple. Callers bring their own seeded mutation strategy
 *     (string chop, modal injection, coordinate jitter) — this engine
 *     is the registry + property checker, not the mutator itself.
 *
 *   markCrash()   — a crash (panic) is always a hard breach regardless
 *                   of quarantine.
 *
 *   minimiseCrash() — delta-debug-style shrinker: given a list of
 *     crashing inputs and their sizes, pick the smallest. (The engine
 *     is not itself a shrinker — it just tracks the minimal repro.)
 *
 * evaluateBatch() returns aggregate counts (P1/P2/P3 breaches) + list
 * of minimal repros per unique crash signature.
 *
 * Pure engine. Caller persists via `toSnapshot()` to
 * `data/state/PARSER_FUZZ.json` (schemaVersion 1).
 */

export type FuzzBreachKind =
  | "PANIC"                 // P1 — uncaught throw
  | "NON_IDEMPOTENT"        // P2 — two runs of same input diverged
  | "ACCEPT_REJECT_DIVERGE" // P3 hard — parsers disagree on parsability
  | "AST_DIVERGE";          // P3 soft — parsers agree on success/reject but differ on AST

export type CorpusCategory =
  | "seed"                  // hand-written seed
  | "mutation"              // mutated from a seed
  | "generated"             // grammar-generated
  | "adversarial";          // hand-picked edge case

export interface CorpusEntry {
  input_sha256: string;     // 64-hex
  dialect: string;
  category: CorpusCategory;
  input_len_bytes: number;
  added_at: number;
  added_by: string;
  notes?: string;
}

export interface ParserObservation {
  parser_id: string;        // e.g. "cps-v2", "legacy-lex", "reference-grammar"
  input_sha256: string;
  dialect: string;
  parse_ok: boolean;
  ast_sha256?: string;      // populated when parse_ok
  error_code?: string;      // populated when !parse_ok
  panicked?: boolean;       // true ⇒ P1 breach regardless of other fields
  panic_signature?: string; // e.g. stack-top frame, normalised
  duration_ms?: number;
  observed_at: number;
}

export interface FuzzBreach {
  kind: FuzzBreachKind;
  input_sha256: string;
  dialect: string;
  parsers: string[];
  detail: string;
}

export interface CrashRepro {
  panic_signature: string;
  input_sha256: string;
  input_len_bytes: number;
  first_seen_at: number;
  occurrences: number;
}

export interface FuzzBatchReport {
  total_observations: number;
  panic_count: number;
  non_idempotent_count: number;
  accept_reject_diverge_count: number;
  ast_diverge_count: number;
  hard_breaches: FuzzBreach[];
  soft_breaches: FuzzBreach[];
  crash_repros: CrashRepro[];
}

const SHA256_REGEX = /^[0-9a-f]{64}$/;

export class ParserFuzzHarnessEngine {
  private corpus = new Map<string, CorpusEntry>();
  private crashes = new Map<string, CrashRepro>(); // keyed by signature

  addCorpusEntry(entry: CorpusEntry): void {
    if (!SHA256_REGEX.test(entry.input_sha256)) {
      throw new Error("input_sha256 must be 64-hex lower-case");
    }
    if (!entry.dialect.trim()) throw new Error("dialect required");
    if (!entry.added_by.trim()) throw new Error("added_by required");
    if (entry.input_len_bytes < 0) {
      throw new Error("input_len_bytes must be ≥0");
    }
    this.corpus.set(entry.input_sha256, {
      ...entry,
      dialect: entry.dialect.trim(),
      added_by: entry.added_by.trim(),
      notes: entry.notes?.trim() || undefined,
    });
  }

  listCorpus(filter?: { dialect?: string; category?: CorpusCategory }): CorpusEntry[] {
    const out: CorpusEntry[] = [];
    for (const e of this.corpus.values()) {
      if (filter?.dialect && e.dialect !== filter.dialect) continue;
      if (filter?.category && e.category !== filter.category) continue;
      out.push({ ...e });
    }
    return out;
  }

  getCorpusEntry(input_sha256: string): CorpusEntry | null {
    const e = this.corpus.get(input_sha256);
    return e ? { ...e } : null;
  }

  /** Explicit crash record (e.g. from a timeout-wrapped fuzzer). */
  markCrash(input: {
    panic_signature: string;
    input_sha256: string;
    input_len_bytes: number;
    observed_at: number;
  }): CrashRepro {
    if (!input.panic_signature.trim()) {
      throw new Error("panic_signature required");
    }
    if (!SHA256_REGEX.test(input.input_sha256)) {
      throw new Error("input_sha256 must be 64-hex lower-case");
    }
    if (input.input_len_bytes < 0) {
      throw new Error("input_len_bytes must be ≥0");
    }
    const sig = input.panic_signature.trim();
    const existing = this.crashes.get(sig);
    if (existing === undefined) {
      const fresh: CrashRepro = {
        panic_signature: sig,
        input_sha256: input.input_sha256,
        input_len_bytes: input.input_len_bytes,
        first_seen_at: input.observed_at,
        occurrences: 1,
      };
      this.crashes.set(sig, fresh);
      return { ...fresh };
    }
    existing.occurrences += 1;
    // Keep the smallest repro we have seen for this signature
    if (input.input_len_bytes < existing.input_len_bytes) {
      existing.input_sha256 = input.input_sha256;
      existing.input_len_bytes = input.input_len_bytes;
    }
    return { ...existing };
  }

  listCrashes(): CrashRepro[] {
    return [...this.crashes.values()].map((c) => ({ ...c }));
  }

  /**
   * Evaluate a batch of parser observations over the corpus. Observations
   * for the SAME (parser_id, input_sha256) must be paired to check P2
   * (idempotency). Observations from DIFFERENT parsers over the SAME
   * (dialect, input_sha256) are checked for P3 (differential agreement).
   */
  evaluateBatch(observations: ParserObservation[]): FuzzBatchReport {
    const hard: FuzzBreach[] = [];
    const soft: FuzzBreach[] = [];
    let panicCount = 0;
    let nonIdempotentCount = 0;
    let acceptRejectCount = 0;
    let astDivergeCount = 0;

    // Validate + dedupe per (parser_id, input_sha256)
    const perParser = new Map<string, ParserObservation[]>();
    const perDialectInput = new Map<string, ParserObservation[]>();
    for (const obs of observations) {
      if (!SHA256_REGEX.test(obs.input_sha256)) {
        throw new Error(
          `obs ${obs.parser_id}/${obs.input_sha256}: input_sha256 must be 64-hex`,
        );
      }
      if (obs.ast_sha256 !== undefined && !SHA256_REGEX.test(obs.ast_sha256)) {
        throw new Error(`obs ${obs.parser_id}: ast_sha256 must be 64-hex`);
      }
      if (!obs.parser_id.trim()) throw new Error("parser_id required");
      if (!obs.dialect.trim()) throw new Error("dialect required");

      // P1: panic
      if (obs.panicked === true) {
        panicCount += 1;
        const sig = obs.panic_signature?.trim() || "<no-signature>";
        hard.push({
          kind: "PANIC",
          input_sha256: obs.input_sha256,
          dialect: obs.dialect,
          parsers: [obs.parser_id],
          detail: sig,
        });
        const entry = this.corpus.get(obs.input_sha256);
        this.markCrash({
          panic_signature: sig,
          input_sha256: obs.input_sha256,
          input_len_bytes: entry?.input_len_bytes ?? 0,
          observed_at: obs.observed_at,
        });
        continue;
      }

      const parserKey = `${obs.parser_id}|${obs.input_sha256}`;
      const arr = perParser.get(parserKey);
      if (arr === undefined) perParser.set(parserKey, [obs]);
      else arr.push(obs);

      const diKey = `${obs.dialect}|${obs.input_sha256}`;
      const arr2 = perDialectInput.get(diKey);
      if (arr2 === undefined) perDialectInput.set(diKey, [obs]);
      else arr2.push(obs);
    }

    // P2: idempotency inside a parser
    for (const [key, arr] of perParser) {
      if (arr.length < 2) continue;
      const first = arr[0];
      for (let i = 1; i < arr.length; i++) {
        const b = arr[i];
        if (first.parse_ok !== b.parse_ok) {
          nonIdempotentCount += 1;
          hard.push({
            kind: "NON_IDEMPOTENT",
            input_sha256: first.input_sha256,
            dialect: first.dialect,
            parsers: [first.parser_id],
            detail: `parse_ok flipped between runs (${String(first.parse_ok)} vs ${String(b.parse_ok)})`,
          });
          continue;
        }
        if (first.parse_ok) {
          if ((first.ast_sha256 ?? "") !== (b.ast_sha256 ?? "")) {
            nonIdempotentCount += 1;
            hard.push({
              kind: "NON_IDEMPOTENT",
              input_sha256: first.input_sha256,
              dialect: first.dialect,
              parsers: [first.parser_id],
              detail: `ast hash drift ${first.ast_sha256} → ${b.ast_sha256}`,
            });
          }
        } else {
          if ((first.error_code ?? "") !== (b.error_code ?? "")) {
            nonIdempotentCount += 1;
            hard.push({
              kind: "NON_IDEMPOTENT",
              input_sha256: first.input_sha256,
              dialect: first.dialect,
              parsers: [first.parser_id],
              detail: `error_code drift ${first.error_code} → ${b.error_code}`,
            });
          }
        }
      }
    }

    // P3: differential agreement across parsers (same dialect, same input)
    for (const [key, arr] of perDialectInput) {
      if (arr.length < 2) continue;
      // Group by parser_id to one canonical observation per parser
      const byParser = new Map<string, ParserObservation>();
      for (const obs of arr) {
        if (!byParser.has(obs.parser_id)) byParser.set(obs.parser_id, obs);
      }
      if (byParser.size < 2) continue;
      const obsList = [...byParser.values()];
      const acceptance = obsList.map((o) => o.parse_ok);
      const anyAccept = acceptance.some((x) => x);
      const allAccept = acceptance.every((x) => x);
      if (anyAccept && !allAccept) {
        acceptRejectCount += 1;
        hard.push({
          kind: "ACCEPT_REJECT_DIVERGE",
          input_sha256: obsList[0].input_sha256,
          dialect: obsList[0].dialect,
          parsers: obsList.map((o) => o.parser_id),
          detail: obsList
            .map((o) => `${o.parser_id}=${o.parse_ok ? "ACCEPT" : "REJECT"}`)
            .join(", "),
        });
        continue;
      }
      if (allAccept) {
        // All parsers accepted — check AST agreement (soft)
        const hashes = obsList.map((o) => o.ast_sha256 ?? "");
        const uniq = new Set(hashes);
        if (uniq.size > 1) {
          astDivergeCount += 1;
          soft.push({
            kind: "AST_DIVERGE",
            input_sha256: obsList[0].input_sha256,
            dialect: obsList[0].dialect,
            parsers: obsList.map((o) => o.parser_id),
            detail: obsList
              .map((o) => `${o.parser_id}=${o.ast_sha256 ?? "<none>"}`)
              .join(", "),
          });
        }
      }
    }

    return {
      total_observations: observations.length,
      panic_count: panicCount,
      non_idempotent_count: nonIdempotentCount,
      accept_reject_diverge_count: acceptRejectCount,
      ast_diverge_count: astDivergeCount,
      hard_breaches: hard,
      soft_breaches: soft,
      crash_repros: this.listCrashes(),
    };
  }

  toSnapshot(): {
    schemaVersion: 1;
    corpus: CorpusEntry[];
    crashes: CrashRepro[];
  } {
    return {
      schemaVersion: 1,
      corpus: this.listCorpus(),
      crashes: this.listCrashes(),
    };
  }

  loadSnapshot(snap: {
    schemaVersion: number;
    corpus: CorpusEntry[];
    crashes: CrashRepro[];
  }): void {
    if (snap.schemaVersion !== 1) {
      throw new Error(`unsupported schemaVersion ${snap.schemaVersion}`);
    }
    this.corpus.clear();
    this.crashes.clear();
    for (const e of snap.corpus) this.corpus.set(e.input_sha256, { ...e });
    for (const c of snap.crashes) this.crashes.set(c.panic_signature, { ...c });
  }

  clearAll(): void {
    this.corpus.clear();
    this.crashes.clear();
  }
}

export const parserFuzzHarnessEngine = new ParserFuzzHarnessEngine();
