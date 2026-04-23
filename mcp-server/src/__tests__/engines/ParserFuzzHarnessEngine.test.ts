/**
 * ParserFuzzHarnessEngine tests (U-LPR-PARSER-FUZZ)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  ParserFuzzHarnessEngine,
  type CorpusEntry,
  type ParserObservation,
} from "../../engines/ParserFuzzHarnessEngine.js";

let eng: ParserFuzzHarnessEngine;

const SHA = (seed: string): string => (seed + "0".repeat(64)).slice(0, 64);

function corp(overrides: Partial<CorpusEntry> = {}): CorpusEntry {
  return {
    input_sha256: SHA("a1"),
    dialect: "okuma-osp",
    category: "seed",
    input_len_bytes: 128,
    added_at: 1_000,
    added_by: "fuzz-lead",
    ...overrides,
  };
}

function obs(overrides: Partial<ParserObservation> = {}): ParserObservation {
  return {
    parser_id: "cps-v2",
    input_sha256: SHA("a1"),
    dialect: "okuma-osp",
    parse_ok: true,
    ast_sha256: SHA("b2"),
    observed_at: 2_000,
    ...overrides,
  };
}

beforeEach(() => {
  eng = new ParserFuzzHarnessEngine();
});

// ─────────────────────────────────────────────────────────
// addCorpusEntry / listCorpus
// ─────────────────────────────────────────────────────────

describe("corpus", () => {
  it("adds + lists", () => {
    eng.addCorpusEntry(corp());
    expect(eng.listCorpus()).toHaveLength(1);
  });

  it("filters by dialect + category", () => {
    eng.addCorpusEntry(corp());
    eng.addCorpusEntry(
      corp({ input_sha256: SHA("c3"), dialect: "fanuc-16i", category: "mutation" }),
    );
    expect(eng.listCorpus({ dialect: "fanuc-16i" })).toHaveLength(1);
    expect(eng.listCorpus({ category: "seed" })).toHaveLength(1);
    expect(eng.listCorpus({ category: "mutation" })).toHaveLength(1);
  });

  it("rejects bad sha", () => {
    expect(() =>
      eng.addCorpusEntry(corp({ input_sha256: "nothex" })),
    ).toThrow(/input_sha256/);
  });

  it("rejects empty dialect", () => {
    expect(() => eng.addCorpusEntry(corp({ dialect: "" }))).toThrow(/dialect/);
  });

  it("rejects empty added_by", () => {
    expect(() => eng.addCorpusEntry(corp({ added_by: " " }))).toThrow(/added_by/);
  });

  it("rejects negative length", () => {
    expect(() =>
      eng.addCorpusEntry(corp({ input_len_bytes: -1 })),
    ).toThrow(/input_len_bytes/);
  });

  it("getCorpusEntry returns null when missing", () => {
    expect(eng.getCorpusEntry(SHA("zz"))).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────
// markCrash — minimisation
// ─────────────────────────────────────────────────────────

describe("markCrash", () => {
  it("records first crash fresh", () => {
    const r = eng.markCrash({
      panic_signature: "TypeError@tokenizer:89",
      input_sha256: SHA("d4"),
      input_len_bytes: 500,
      observed_at: 1,
    });
    expect(r.occurrences).toBe(1);
  });

  it("collapses same-signature crashes + increments occurrences", () => {
    eng.markCrash({
      panic_signature: "TypeError@tokenizer:89",
      input_sha256: SHA("d4"),
      input_len_bytes: 500,
      observed_at: 1,
    });
    const r = eng.markCrash({
      panic_signature: "TypeError@tokenizer:89",
      input_sha256: SHA("e5"),
      input_len_bytes: 700,
      observed_at: 2,
    });
    expect(r.occurrences).toBe(2);
    expect(r.input_len_bytes).toBe(500); // smaller repro kept
    expect(r.input_sha256).toBe(SHA("d4"));
  });

  it("adopts smaller repro when encountered later", () => {
    eng.markCrash({
      panic_signature: "TypeError@tokenizer:89",
      input_sha256: SHA("d4"),
      input_len_bytes: 500,
      observed_at: 1,
    });
    const r = eng.markCrash({
      panic_signature: "TypeError@tokenizer:89",
      input_sha256: SHA("f6"),
      input_len_bytes: 50,
      observed_at: 2,
    });
    expect(r.input_len_bytes).toBe(50);
    expect(r.input_sha256).toBe(SHA("f6"));
  });

  it("rejects empty signature", () => {
    expect(() =>
      eng.markCrash({
        panic_signature: " ",
        input_sha256: SHA("d4"),
        input_len_bytes: 1,
        observed_at: 1,
      }),
    ).toThrow(/panic_signature/);
  });

  it("rejects bad sha", () => {
    expect(() =>
      eng.markCrash({
        panic_signature: "E",
        input_sha256: "bad",
        input_len_bytes: 1,
        observed_at: 1,
      }),
    ).toThrow(/input_sha256/);
  });
});

// ─────────────────────────────────────────────────────────
// evaluateBatch — P1 panic
// ─────────────────────────────────────────────────────────

describe("evaluateBatch P1 panic", () => {
  it("records panic as hard breach", () => {
    const r = eng.evaluateBatch([
      obs({
        panicked: true,
        panic_signature: "TypeError@lexer:42",
        parse_ok: false,
        ast_sha256: undefined,
      }),
    ]);
    expect(r.panic_count).toBe(1);
    expect(r.hard_breaches[0].kind).toBe("PANIC");
    expect(r.crash_repros).toHaveLength(1);
  });

  it("missing panic_signature collapses to <no-signature>", () => {
    const r = eng.evaluateBatch([
      obs({ panicked: true, parse_ok: false, ast_sha256: undefined }),
    ]);
    expect(r.crash_repros[0].panic_signature).toBe("<no-signature>");
  });
});

// ─────────────────────────────────────────────────────────
// evaluateBatch — P2 idempotency
// ─────────────────────────────────────────────────────────

describe("evaluateBatch P2 idempotency", () => {
  it("passes when two runs of same parser produce same AST", () => {
    const r = eng.evaluateBatch([obs(), obs({ observed_at: 3_000 })]);
    expect(r.non_idempotent_count).toBe(0);
  });

  it("flags AST drift", () => {
    const r = eng.evaluateBatch([
      obs(),
      obs({ ast_sha256: SHA("ff"), observed_at: 3_000 }),
    ]);
    expect(r.non_idempotent_count).toBe(1);
    expect(r.hard_breaches[0].kind).toBe("NON_IDEMPOTENT");
  });

  it("flags parse_ok flip", () => {
    const r = eng.evaluateBatch([
      obs(),
      obs({
        parse_ok: false,
        ast_sha256: undefined,
        error_code: "E_BOOM",
        observed_at: 3_000,
      }),
    ]);
    expect(r.non_idempotent_count).toBe(1);
    expect(r.hard_breaches[0].detail).toMatch(/parse_ok/);
  });

  it("flags error_code drift", () => {
    const r = eng.evaluateBatch([
      obs({
        parse_ok: false,
        ast_sha256: undefined,
        error_code: "E_A",
      }),
      obs({
        parse_ok: false,
        ast_sha256: undefined,
        error_code: "E_B",
        observed_at: 3_000,
      }),
    ]);
    expect(r.non_idempotent_count).toBe(1);
    expect(r.hard_breaches[0].detail).toMatch(/error_code/);
  });
});

// ─────────────────────────────────────────────────────────
// evaluateBatch — P3 differential
// ─────────────────────────────────────────────────────────

describe("evaluateBatch P3 differential", () => {
  it("hard-breaches when parsers disagree on accept/reject", () => {
    const r = eng.evaluateBatch([
      obs({ parser_id: "cps-v2", parse_ok: true, ast_sha256: SHA("b2") }),
      obs({
        parser_id: "legacy-lex",
        parse_ok: false,
        ast_sha256: undefined,
        error_code: "E_SYNTAX",
      }),
    ]);
    expect(r.accept_reject_diverge_count).toBe(1);
    expect(r.hard_breaches[0].kind).toBe("ACCEPT_REJECT_DIVERGE");
    expect(r.hard_breaches[0].parsers).toHaveLength(2);
  });

  it("soft-breaches when parsers agree on success but differ on AST", () => {
    const r = eng.evaluateBatch([
      obs({ parser_id: "cps-v2", ast_sha256: SHA("b2") }),
      obs({ parser_id: "legacy-lex", ast_sha256: SHA("ee") }),
    ]);
    expect(r.ast_diverge_count).toBe(1);
    expect(r.soft_breaches[0].kind).toBe("AST_DIVERGE");
  });

  it("passes when parsers agree entirely", () => {
    const r = eng.evaluateBatch([
      obs({ parser_id: "cps-v2" }),
      obs({ parser_id: "legacy-lex" }),
    ]);
    expect(r.accept_reject_diverge_count).toBe(0);
    expect(r.ast_diverge_count).toBe(0);
  });

  it("single parser is not P3-compared against itself", () => {
    const r = eng.evaluateBatch([obs()]);
    expect(r.accept_reject_diverge_count).toBe(0);
    expect(r.ast_diverge_count).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
// evaluateBatch — input validation
// ─────────────────────────────────────────────────────────

describe("evaluateBatch input validation", () => {
  it("rejects bad input sha", () => {
    expect(() => eng.evaluateBatch([obs({ input_sha256: "bad" })])).toThrow(
      /input_sha256/,
    );
  });

  it("rejects bad ast sha", () => {
    expect(() => eng.evaluateBatch([obs({ ast_sha256: "bad" })])).toThrow(
      /ast_sha256/,
    );
  });

  it("rejects empty parser_id", () => {
    expect(() => eng.evaluateBatch([obs({ parser_id: " " })])).toThrow(
      /parser_id/,
    );
  });

  it("rejects empty dialect", () => {
    expect(() => eng.evaluateBatch([obs({ dialect: "" })])).toThrow(/dialect/);
  });
});

// ─────────────────────────────────────────────────────────
// snapshot
// ─────────────────────────────────────────────────────────

describe("snapshot", () => {
  it("round-trips with schemaVersion 1", () => {
    eng.addCorpusEntry(corp());
    eng.markCrash({
      panic_signature: "X",
      input_sha256: SHA("a1"),
      input_len_bytes: 128,
      observed_at: 1,
    });
    const snap = eng.toSnapshot();
    expect(snap.schemaVersion).toBe(1);
    const eng2 = new ParserFuzzHarnessEngine();
    eng2.loadSnapshot(snap);
    expect(eng2.listCorpus()).toHaveLength(1);
    expect(eng2.listCrashes()).toHaveLength(1);
  });

  it("rejects unknown schemaVersion", () => {
    expect(() =>
      eng.loadSnapshot({ schemaVersion: 99, corpus: [], crashes: [] }),
    ).toThrow(/schemaVersion/);
  });

  it("clearAll empties state", () => {
    eng.addCorpusEntry(corp());
    eng.clearAll();
    expect(eng.listCorpus()).toHaveLength(0);
  });
});
