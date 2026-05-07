/**
 * ParserGoldenHarnessEngine tests (U-LPR-PARSER-TESTS)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  ParserGoldenHarnessEngine,
  type GoldenCase,
  type ParserRun,
} from "../../engines/ParserGoldenHarnessEngine.js";

let eng: ParserGoldenHarnessEngine;

const SHA = (seed: string): string => (seed + "0".repeat(64)).slice(0, 64);

function okCase(overrides: Partial<GoldenCase> = {}): GoldenCase {
  return {
    case_id: "okuma-osp-g71-01",
    dialect: "okuma-osp",
    input_sha256: SHA("a1"),
    expected_ast_sha256: SHA("b2"),
    frozen_at: 1_000_000,
    frozen_by: "parser-lead",
    ...overrides,
  };
}

function rejectCase(overrides: Partial<GoldenCase> = {}): GoldenCase {
  return {
    case_id: "fanuc-bad-modal-01",
    dialect: "fanuc-16i",
    input_sha256: SHA("c3"),
    expected_error: "E_MODAL_CONFLICT",
    frozen_at: 1_000_000,
    frozen_by: "parser-lead",
    ...overrides,
  };
}

function run(overrides: Partial<ParserRun> = {}): ParserRun {
  return {
    case_id: "okuma-osp-g71-01",
    input_sha256: SHA("a1"),
    parse_ok: true,
    ast_sha256: SHA("b2"),
    run_at: 2_000_000,
    ...overrides,
  };
}

beforeEach(() => {
  eng = new ParserGoldenHarnessEngine();
});

// ─────────────────────────────────────────────────────────
// freeze validation
// ─────────────────────────────────────────────────────────

describe("freeze", () => {
  it("locks a mix of success + rejection cases", () => {
    const n = eng.freeze([okCase(), rejectCase()], "parser-lead");
    expect(n).toBe(2);
    expect(eng.listGolden()).toHaveLength(2);
  });

  it("rejects empty batch", () => {
    expect(() => eng.freeze([], "parser-lead")).toThrow(/empty/);
  });

  it("rejects missing frozen_by", () => {
    expect(() => eng.freeze([okCase()], " ")).toThrow(/frozen_by/);
  });

  it("rejects duplicate case_id in batch", () => {
    expect(() =>
      eng.freeze([okCase(), okCase()], "parser-lead"),
    ).toThrow(/duplicate/);
  });

  it("rejects empty case_id", () => {
    expect(() =>
      eng.freeze([okCase({ case_id: " " })], "parser-lead"),
    ).toThrow(/case_id/);
  });

  it("rejects empty dialect", () => {
    expect(() =>
      eng.freeze([okCase({ dialect: "" })], "parser-lead"),
    ).toThrow(/dialect/);
  });

  it("rejects malformed input sha", () => {
    expect(() =>
      eng.freeze([okCase({ input_sha256: "ZZZ" })], "parser-lead"),
    ).toThrow(/64-hex/);
  });

  it("rejects malformed ast sha", () => {
    expect(() =>
      eng.freeze(
        [okCase({ expected_ast_sha256: "short" })],
        "parser-lead",
      ),
    ).toThrow(/64-hex/);
  });

  it("rejects case missing both expected fields", () => {
    expect(() =>
      eng.freeze(
        [{ ...okCase(), expected_ast_sha256: undefined }],
        "parser-lead",
      ),
    ).toThrow(/exactly one/);
  });

  it("rejects case setting both expected fields", () => {
    expect(() =>
      eng.freeze(
        [
          {
            ...okCase(),
            expected_error: "E_BOTH",
          },
        ],
        "parser-lead",
      ),
    ).toThrow(/exactly one/);
  });

  it("rejects empty expected_error", () => {
    expect(() =>
      eng.freeze([rejectCase({ expected_error: " " })], "parser-lead"),
    ).toThrow(/expected_error/);
  });

  it("freeze replaces prior golden", () => {
    eng.freeze([okCase()], "parser-lead");
    eng.freeze([rejectCase()], "parser-lead");
    expect(eng.getCase("okuma-osp-g71-01")).toBeNull();
    expect(eng.getCase("fanuc-bad-modal-01")).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────
// evaluate — success path
// ─────────────────────────────────────────────────────────

describe("evaluate (success cases)", () => {
  beforeEach(() => {
    eng.freeze([okCase()], "parser-lead");
  });

  it("passes with matching AST hash", () => {
    const r = eng.evaluate([run()]);
    expect(r.passed).toBe(true);
    expect(r.hard_breaches).toHaveLength(0);
  });

  it("hard-breaches AST_DIFF on hash mismatch", () => {
    const r = eng.evaluate([run({ ast_sha256: SHA("ff") })]);
    expect(r.passed).toBe(false);
    expect(r.hard_breaches[0].kind).toBe("AST_DIFF");
  });

  it("hard-breaches UNEXPECTED_ERROR when parser rejects a good input", () => {
    const r = eng.evaluate([
      run({ parse_ok: false, ast_sha256: undefined, error_code: "E_BOOM" }),
    ]);
    expect(r.hard_breaches[0].kind).toBe("UNEXPECTED_ERROR");
  });

  it("hard-breaches AST_DIFF when input_sha256 drifts", () => {
    const r = eng.evaluate([run({ input_sha256: SHA("ee") })]);
    expect(r.hard_breaches[0].kind).toBe("AST_DIFF");
    expect(r.hard_breaches[0].expected).toContain("input");
  });
});

// ─────────────────────────────────────────────────────────
// evaluate — rejection path
// ─────────────────────────────────────────────────────────

describe("evaluate (rejection cases)", () => {
  beforeEach(() => {
    eng.freeze([rejectCase()], "parser-lead");
  });

  it("passes when parser rejects with expected error code", () => {
    const r = eng.evaluate([
      run({
        case_id: "fanuc-bad-modal-01",
        input_sha256: SHA("c3"),
        parse_ok: false,
        ast_sha256: undefined,
        error_code: "E_MODAL_CONFLICT",
      }),
    ]);
    expect(r.passed).toBe(true);
  });

  it("hard-breaches ERROR_DIFF on wrong error code", () => {
    const r = eng.evaluate([
      run({
        case_id: "fanuc-bad-modal-01",
        input_sha256: SHA("c3"),
        parse_ok: false,
        ast_sha256: undefined,
        error_code: "E_WRONG",
      }),
    ]);
    expect(r.hard_breaches[0].kind).toBe("ERROR_DIFF");
  });

  it("hard-breaches UNEXPECTED_SUCCESS when parser wrongly accepts", () => {
    const r = eng.evaluate([
      run({
        case_id: "fanuc-bad-modal-01",
        input_sha256: SHA("c3"),
        parse_ok: true,
        ast_sha256: SHA("ee"),
      }),
    ]);
    expect(r.hard_breaches[0].kind).toBe("UNEXPECTED_SUCCESS");
  });
});

// ─────────────────────────────────────────────────────────
// new/missing bookkeeping
// ─────────────────────────────────────────────────────────

describe("evaluate — new + missing cases", () => {
  it("tracks new_cases (runs with no golden)", () => {
    eng.freeze([okCase()], "parser-lead");
    const r = eng.evaluate([run({ case_id: "brand-new" })]);
    expect(r.new_cases).toContain("brand-new");
    expect(r.missing_cases).toContain("okuma-osp-g71-01");
  });

  it("tracks missing_cases (golden cases not exercised)", () => {
    eng.freeze([okCase(), rejectCase()], "parser-lead");
    const r = eng.evaluate([run()]);
    expect(r.missing_cases).toEqual(["fanuc-bad-modal-01"]);
  });
});

// ─────────────────────────────────────────────────────────
// evaluate input validation
// ─────────────────────────────────────────────────────────

describe("evaluate input validation", () => {
  it("rejects bad input_sha256 in run", () => {
    expect(() =>
      eng.evaluate([run({ input_sha256: "nothex" })]),
    ).toThrow(/input_sha256/);
  });

  it("rejects bad ast_sha256 in run", () => {
    expect(() =>
      eng.evaluate([run({ ast_sha256: "also-nothex" })]),
    ).toThrow(/ast_sha256/);
  });
});

// ─────────────────────────────────────────────────────────
// quarantine
// ─────────────────────────────────────────────────────────

describe("quarantine", () => {
  beforeEach(() => {
    eng.freeze([okCase()], "parser-lead");
  });

  it("requires ≥20 char reason", () => {
    expect(() =>
      eng.quarantineCase({
        case_id: "okuma-osp-g71-01",
        reason: "nope",
        filed_at: 1,
        filed_by: "qa",
      }),
    ).toThrow(/reason/);
  });

  it("rejects unknown case_id", () => {
    expect(() =>
      eng.quarantineCase({
        case_id: "missing",
        reason: "tracked in CFIXA-42 pending parser refactor",
        filed_at: 1,
        filed_by: "qa",
      }),
    ).toThrow(/not in golden/);
  });

  it("rejects expires_at ≤ filed_at", () => {
    expect(() =>
      eng.quarantineCase({
        case_id: "okuma-osp-g71-01",
        reason: "tracked in CFIXA-42 pending parser refactor",
        filed_at: 1_000,
        expires_at: 500,
        filed_by: "qa",
      }),
    ).toThrow(/expires_at/);
  });

  it("rejects empty filed_by", () => {
    expect(() =>
      eng.quarantineCase({
        case_id: "okuma-osp-g71-01",
        reason: "tracked in CFIXA-42 pending parser refactor",
        filed_at: 1,
        filed_by: " ",
      }),
    ).toThrow(/filed_by/);
  });

  it("downgrades quarantined breach to soft", () => {
    eng.quarantineCase({
      case_id: "okuma-osp-g71-01",
      reason: "tracked in CFIXA-42 pending parser refactor",
      filed_at: 1,
      filed_by: "qa",
    });
    const r = eng.evaluate([run({ ast_sha256: SHA("ff") })]);
    expect(r.passed).toBe(true);
    expect(r.soft_breaches[0].kind).toBe("AST_DIFF");
  });

  it("respects expires_at sunset", () => {
    eng.quarantineCase({
      case_id: "okuma-osp-g71-01",
      reason: "tracked in CFIXA-42 pending parser refactor",
      filed_at: 1_000,
      expires_at: 2_000,
      filed_by: "qa",
    });
    expect(eng.isQuarantined("okuma-osp-g71-01", 1_500)).toBe(true);
    expect(eng.isQuarantined("okuma-osp-g71-01", 2_500)).toBe(false);
  });

  it("liftQuarantine removes entry", () => {
    eng.quarantineCase({
      case_id: "okuma-osp-g71-01",
      reason: "tracked in CFIXA-42 pending parser refactor",
      filed_at: 1,
      filed_by: "qa",
    });
    expect(eng.liftQuarantine("okuma-osp-g71-01")).toBe(true);
    expect(eng.isQuarantined("okuma-osp-g71-01")).toBe(false);
  });

  it("listQuarantine excludes expired", () => {
    eng.quarantineCase({
      case_id: "okuma-osp-g71-01",
      reason: "tracked in CFIXA-42 pending parser refactor",
      filed_at: 1_000,
      expires_at: 2_000,
      filed_by: "qa",
    });
    expect(eng.listQuarantine(1_500)).toHaveLength(1);
    expect(eng.listQuarantine(2_500)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────
// filter / snapshot
// ─────────────────────────────────────────────────────────

describe("listGolden + snapshot", () => {
  it("filters by dialect", () => {
    eng.freeze([okCase(), rejectCase()], "parser-lead");
    expect(eng.listGolden({ dialect: "okuma-osp" })).toHaveLength(1);
    expect(eng.listGolden({ dialect: "fanuc-16i" })).toHaveLength(1);
    expect(eng.listGolden()).toHaveLength(2);
  });

  it("round-trips with schemaVersion 1", () => {
    eng.freeze([okCase()], "parser-lead");
    eng.quarantineCase({
      case_id: "okuma-osp-g71-01",
      reason: "tracked in CFIXA-42 pending parser refactor",
      filed_at: 1,
      filed_by: "qa",
    });
    const snap = eng.toSnapshot();
    expect(snap.schemaVersion).toBe(1);
    const eng2 = new ParserGoldenHarnessEngine();
    eng2.loadSnapshot(snap);
    expect(eng2.listGolden()).toHaveLength(1);
    expect(eng2.listQuarantine()).toHaveLength(1);
  });

  it("rejects unknown schemaVersion", () => {
    expect(() =>
      eng.loadSnapshot({ schemaVersion: 99, golden: [], quarantine: [] }),
    ).toThrow(/schemaVersion/);
  });

  it("clearAll empties state", () => {
    eng.freeze([okCase()], "parser-lead");
    eng.clearAll();
    expect(eng.listGolden()).toHaveLength(0);
  });

  it("getCase returns null when missing", () => {
    expect(eng.getCase("nope")).toBeNull();
  });
});
