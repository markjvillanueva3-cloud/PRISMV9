/**
 * CNCControllerDeepLearningEngine — learned-pattern consumer tests.
 *
 * AI-TRAINING-FIRST-MS0 / U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP3-4 (slot:india).
 *
 * Verifies Step 3 (ingestLearnedPatterns) + Step 4 (held-out non-stub inference):
 *  - the engine ingests the corpus ledger emitted by
 *    scripts/train-cnc-controller-from-corpus.mjs (Steps 1-2);
 *  - after ingestion recommendMacro/generateMacro produce non-stub output that
 *    provably traces back to the JM-Die Okuma corpus;
 *  - failure modes throw loud; adversarial ledgers are rejected/filtered;
 *  - the two new dispatcher actions round-trip through executeAIReasoningAction.
 *
 * Most tests use a FRESH `new CNCControllerDeepLearningEngine()` so the
 * process-global singleton is never polluted across cases. The dispatcher
 * round-trip necessarily uses the singleton (the dispatcher imports it).
 */

import { describe, it, expect, afterEach } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  statSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import {
  CNCControllerDeepLearningEngine,
} from "../engines/CNCControllerDeepLearningEngine.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const REPO_MCP_ROOT = resolve(__dirname, "..", "..");
const CANONICAL_LEDGER = resolve(
  REPO_MCP_ROOT,
  "data/state/learned-cnc-controller-patterns.json",
);
const EXTRACTOR = resolve(
  REPO_MCP_ROOT,
  "scripts/train-cnc-controller-from-corpus.mjs",
);
const CORPUS_DIR = "H:/prism/JM DIE/MACRO PROGRAMS";

/** A minimal, valid learned-patterns ledger (schemaVersion 1.0.0). */
function makeLedger(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: "1.0.0",
    sourceCorpus: "test-corpus",
    fileCount: 2,
    controllerCounts: { okuma_osp: 2 },
    ledger: {
      tool_slot_conventions: [
        {
          controller: "okuma_osp",
          tool_number: "010101",
          digits: 6,
          operation: "OD ROUGH TURNING",
          source_files: ["ALPHA.min", "BETA.min"],
          frequency: 2,
        },
        {
          controller: "okuma_osp",
          tool_number: "030303",
          digits: 6,
          operation: "SPOT DRILL",
          source_files: ["ALPHA.min"],
          frequency: 1,
        },
      ],
      v_variable_idioms: [
        {
          controller: "okuma_osp",
          name: "VC100",
          expression: "1.32",
          description: "STOCK DIAMETER",
          source_files: ["ALPHA.min", "BETA.min"],
          frequency: 2,
        },
        {
          controller: "okuma_osp",
          name: "VC102",
          expression: "0.7188",
          description: "START BORE DIA",
          source_files: ["ALPHA.min"],
          frequency: 1,
        },
      ],
      macro_labels: [
        {
          controller: "okuma_osp",
          label: "NAT1",
          following_token: "G81",
          source_files: ["ALPHA.min"],
          frequency: 3,
        },
      ],
    },
    ...overrides,
  };
}

/** Tmp dirs created by writeTmp this run — cleaned up after each test. */
const tmpDirs: string[] = [];

/** Write `content` (string or JSON-able) to a fresh tmp file; return its path. */
function writeTmp(content: string | object, name = "ledger.json"): string {
  const dir = mkdtempSync(join(tmpdir(), "cnc-learned-"));
  tmpDirs.push(dir);
  const p = join(dir, name);
  writeFileSync(p, typeof content === "string" ? content : JSON.stringify(content), "utf8");
  return p;
}

afterEach(() => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// ingestLearnedPatterns — happy path
// ---------------------------------------------------------------------------

describe("ingestLearnedPatterns — happy path", () => {
  it("ingests a valid ledger and reports accurate counts", () => {
    const eng = new CNCControllerDeepLearningEngine();
    const res = eng.ingestLearnedPatterns(writeTmp(makeLedger()));
    expect(res.loaded).toBe(true);
    expect(res.schemaVersion).toBe("1.0.0");
    expect(res.counts.toolSlotConventions).toBe(2);
    expect(res.counts.vVariableIdioms).toBe(2);
    expect(res.counts.macroLabels).toBe(1);
    expect(res.skipped.unknownController).toBe(0);
    expect(res.skipped.malformedRow).toBe(0);
  });

  it("getLearnedPatternStats reflects ingested state (loaded:false before)", () => {
    const eng = new CNCControllerDeepLearningEngine();
    expect(eng.getLearnedPatternStats().loaded).toBe(false);
    expect(eng.getLearnedPatternStats().counts.toolSlotConventions).toBe(0);
    eng.ingestLearnedPatterns(writeTmp(makeLedger()));
    const s = eng.getLearnedPatternStats();
    expect(s.loaded).toBe(true);
    expect(s.fileCount).toBe(2);
    expect(s.counts.macroLabels).toBe(1);
  });

  it("a second ingest REPLACES (does not append to) prior state", () => {
    const eng = new CNCControllerDeepLearningEngine();
    eng.ingestLearnedPatterns(writeTmp(makeLedger()));
    // second ledger has exactly one tool slot
    const small = makeLedger();
    (small.ledger as any).tool_slot_conventions = [
      {
        controller: "okuma_osp",
        tool_number: "020202",
        digits: 6,
        operation: "FACE",
        source_files: ["X.min"],
        frequency: 1,
      },
    ];
    const res = eng.ingestLearnedPatterns(writeTmp(small));
    expect(res.counts.toolSlotConventions).toBe(1); // replaced, not 2+1
  });
});

// ---------------------------------------------------------------------------
// ingestLearnedPatterns — failure modes (R12 fail-loud)
// ---------------------------------------------------------------------------

describe("ingestLearnedPatterns — failure modes", () => {
  it("throws on an empty / whitespace path", () => {
    const eng = new CNCControllerDeepLearningEngine();
    expect(() => eng.ingestLearnedPatterns("")).toThrow(/non-empty string/);
    expect(() => eng.ingestLearnedPatterns("   ")).toThrow(/non-empty string/);
  });

  it("throws on a missing file", () => {
    const eng = new CNCControllerDeepLearningEngine();
    expect(() =>
      eng.ingestLearnedPatterns(join(tmpdir(), "definitely-not-here-xyz.json")),
    ).toThrow(/cannot read learned-patterns file/);
  });

  it("throws on invalid JSON", () => {
    const eng = new CNCControllerDeepLearningEngine();
    expect(() => eng.ingestLearnedPatterns(writeTmp("{ not json ,,,"))).toThrow(
      /is not valid JSON/,
    );
  });

  it("throws when the root is not an object (array / primitive)", () => {
    const eng = new CNCControllerDeepLearningEngine();
    expect(() => eng.ingestLearnedPatterns(writeTmp("[1,2,3]"))).toThrow(
      /did not parse to a JSON object/,
    );
    expect(() => eng.ingestLearnedPatterns(writeTmp("42"))).toThrow(
      /did not parse to a JSON object/,
    );
  });

  it("throws when the `ledger` object is missing", () => {
    const eng = new CNCControllerDeepLearningEngine();
    const noLedger = makeLedger();
    delete (noLedger as any).ledger;
    expect(() => eng.ingestLearnedPatterns(writeTmp(noLedger))).toThrow(
      /has no "ledger" object/,
    );
  });

  it("throws when a required ledger array is missing or not an array", () => {
    const eng = new CNCControllerDeepLearningEngine();
    const bad = makeLedger();
    (bad.ledger as any).v_variable_idioms = "oops-not-an-array";
    expect(() => eng.ingestLearnedPatterns(writeTmp(bad))).toThrow(
      /missing one of the required arrays/,
    );
  });

  it("does NOT mutate engine state when ingestion throws", () => {
    const eng = new CNCControllerDeepLearningEngine();
    eng.ingestLearnedPatterns(writeTmp(makeLedger())); // valid load
    expect(eng.getLearnedPatternStats().counts.toolSlotConventions).toBe(2);
    // a failed ingest must leave the prior good state intact
    expect(() => eng.ingestLearnedPatterns(writeTmp("garbage"))).toThrow();
    expect(eng.getLearnedPatternStats().counts.toolSlotConventions).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// ingestLearnedPatterns — schemaVersion handshake + adversarial input
// ---------------------------------------------------------------------------

describe("ingestLearnedPatterns — schemaVersion + adversarial", () => {
  it("accepts the legacy DRAFT schemaVersion (back-compat)", () => {
    const eng = new CNCControllerDeepLearningEngine();
    const draft = makeLedger({ schemaVersion: "1.0.0-DRAFT-no-consumer" });
    expect(() => eng.ingestLearnedPatterns(writeTmp(draft))).not.toThrow();
  });

  it("REJECTS an unsupported (future) schemaVersion — version handshake", () => {
    const eng = new CNCControllerDeepLearningEngine();
    const future = makeLedger({ schemaVersion: "2.0.0" });
    expect(() => eng.ingestLearnedPatterns(writeTmp(future))).toThrow(
      /schemaVersion "2\.0\.0" is not supported/,
    );
  });

  it("throws when schemaVersion is missing / non-string", () => {
    const eng = new CNCControllerDeepLearningEngine();
    const noVer = makeLedger();
    delete (noVer as any).schemaVersion;
    expect(() => eng.ingestLearnedPatterns(writeTmp(noVer))).toThrow(
      /has no string "schemaVersion"/,
    );
  });

  it("skips ledger rows whose controller is not a known ControllerFamily", () => {
    const eng = new CNCControllerDeepLearningEngine();
    const mixed = makeLedger();
    (mixed.ledger as any).tool_slot_conventions.push({
      controller: "totally_made_up_controller",
      tool_number: "999",
      digits: 3,
      operation: "BOGUS",
      source_files: [],
      frequency: 1,
    });
    const res = eng.ingestLearnedPatterns(writeTmp(mixed));
    expect(res.counts.toolSlotConventions).toBe(2); // bogus row dropped
    expect(res.skipped.unknownController).toBe(1);
  });

  it("does not let a `__proto__` controller key slip the family filter", () => {
    const eng = new CNCControllerDeepLearningEngine();
    const evil = makeLedger();
    (evil.ledger as any).v_variable_idioms.push({
      controller: "__proto__",
      name: "VEVIL",
      expression: "0",
      description: "x",
      source_files: [],
      frequency: 1,
    });
    const res = eng.ingestLearnedPatterns(writeTmp(evil));
    expect(res.counts.vVariableIdioms).toBe(2); // __proto__ row dropped
    expect(res.skipped.unknownController).toBe(1);
  });

  it("counts malformed rows (required field coerced to empty) as a drift signal", () => {
    const eng = new CNCControllerDeepLearningEngine();
    const drift = makeLedger();
    // a row keyed on a known controller but missing tool_number — field drift
    (drift.ledger as any).tool_slot_conventions.push({
      controller: "okuma_osp",
      operation: "MYSTERY OP",
      source_files: [],
      frequency: 1,
    });
    const res = eng.ingestLearnedPatterns(writeTmp(drift));
    expect(res.counts.toolSlotConventions).toBe(2); // malformed row not stored
    expect(res.skipped.malformedRow).toBe(1);
  });

  it("tolerates malformed rows (null, array, missing fields) without crashing", () => {
    const eng = new CNCControllerDeepLearningEngine();
    const junk = makeLedger();
    (junk.ledger as any).macro_labels.push(null, [1, 2], "string-row", 42);
    expect(() => eng.ingestLearnedPatterns(writeTmp(junk))).not.toThrow();
    const res = eng.ingestLearnedPatterns(writeTmp(junk));
    expect(res.counts.macroLabels).toBe(1); // only the valid row survives
  });

  it("coerces a non-numeric frequency to 0 instead of storing NaN", () => {
    const eng = new CNCControllerDeepLearningEngine();
    const nanFreq = makeLedger();
    (nanFreq.ledger as any).v_variable_idioms[0].frequency = "lots";
    const res = eng.ingestLearnedPatterns(writeTmp(nanFreq));
    expect(res.counts.vVariableIdioms).toBe(2);
    // generateMacro must still produce sane output (no "observed NaN×" leakage)
    const macro = eng.generateMacro("test", "okuma_osp");
    expect(macro.code).not.toMatch(/NaN/);
  });
});

// ---------------------------------------------------------------------------
// recommendMacro — held-out inference (Step 4 acceptance)
// ---------------------------------------------------------------------------

describe("recommendMacro — held-out inference", () => {
  it("returns null for an operation the built-in patterns never covered (pre-ingest)", () => {
    const eng = new CNCControllerDeepLearningEngine();
    // built-in okuma MACRO_PATTERNS cover setup/inspection/die_making/casing only
    expect(eng.recommendMacro("turning", "okuma_osp")).toBeNull();
    expect(eng.recommendMacro("drill", "okuma_osp")).toBeNull();
  });

  it("synthesizes a non-stub macro from the corpus for that same operation (post-ingest)", () => {
    const eng = new CNCControllerDeepLearningEngine();
    eng.ingestLearnedPatterns(writeTmp(makeLedger()));
    const macro = eng.recommendMacro("turning", "okuma_osp");
    expect(macro).not.toBeNull();
    expect(macro!.controller).toBe("okuma_osp");
    expect(macro!.name).toMatch(/^learned_/);
    // the synthesized template must reference REAL corpus data, not a stub
    expect(macro!.code_template).toContain("T010101"); // real tool slot
    expect(macro!.code_template).toContain("OD ROUGH TURNING"); // real operation
    expect(macro!.code_template).toContain("VC100"); // real V-variable
    expect(macro!.code_template).toContain("NAT1 G81"); // real macro label
    expect(macro!.variables.length).toBeGreaterThan(0);
  });

  it("built-in MACRO_PATTERNS still take precedence over learned synthesis", () => {
    const eng = new CNCControllerDeepLearningEngine();
    eng.ingestLearnedPatterns(writeTmp(makeLedger()));
    // "setup" IS a built-in application (probing_cycle_okuma) — built-in wins
    const macro = eng.recommendMacro("setup", "okuma_osp");
    expect(macro).not.toBeNull();
    expect(macro!.name).toBe("probing_cycle_okuma");
  });

  it("returns null when no learned slot matches the operation", () => {
    const eng = new CNCControllerDeepLearningEngine();
    eng.ingestLearnedPatterns(writeTmp(makeLedger()));
    expect(eng.recommendMacro("electrochemical_polish", "okuma_osp")).toBeNull();
  });

  it("returns null for a controller with no learned patterns", () => {
    const eng = new CNCControllerDeepLearningEngine();
    eng.ingestLearnedPatterns(writeTmp(makeLedger())); // okuma-only ledger
    expect(eng.recommendMacro("turning", "haas_ngc")).toBeNull();
  });

  it("handles an empty / whitespace operation without throwing", () => {
    const eng = new CNCControllerDeepLearningEngine();
    eng.ingestLearnedPatterns(writeTmp(makeLedger()));
    expect(eng.recommendMacro("", "okuma_osp")).toBeNull();
    expect(eng.recommendMacro("   ", "okuma_osp")).toBeNull();
  });

  it("is deterministic — repeated calls yield byte-identical templates", () => {
    const eng = new CNCControllerDeepLearningEngine();
    eng.ingestLearnedPatterns(writeTmp(makeLedger()));
    const a = eng.recommendMacro("turning", "okuma_osp");
    const b = eng.recommendMacro("turning", "okuma_osp");
    expect(a!.code_template).toBe(b!.code_template);
  });
});

// ---------------------------------------------------------------------------
// generateMacro — learned V-variable seeding
// ---------------------------------------------------------------------------

describe("generateMacro — learned V-variables", () => {
  it("uses the generic VC1/VC2 template before any corpus is ingested (back-compat)", () => {
    const eng = new CNCControllerDeepLearningEngine();
    const macro = eng.generateMacro("rough a casing", "okuma_osp");
    expect(macro.code).toContain("VC1 = (PARAM 1)");
    expect(macro.variables.map(v => v.name)).toContain("VC1");
  });

  it("seeds the okuma template with learned V-variables after ingest", () => {
    const eng = new CNCControllerDeepLearningEngine();
    eng.ingestLearnedPatterns(writeTmp(makeLedger()));
    const macro = eng.generateMacro("rough a casing", "okuma_osp");
    expect(macro.code).toContain("VC100 = 1.32");
    expect(macro.code).toContain("STOCK DIAMETER");
    expect(macro.code).not.toContain("VC1 = (PARAM 1)"); // generic stub replaced
    expect(macro.explanation).toMatch(/learned from/);
    expect(macro.variables.map(v => v.name)).toContain("VC100");
  });

  it("leaves non-okuma controllers unaffected by okuma corpus ingestion", () => {
    const eng = new CNCControllerDeepLearningEngine();
    eng.ingestLearnedPatterns(writeTmp(makeLedger()));
    const macro = eng.generateMacro("probe corner", "haas_ngc");
    expect(macro.code).toContain("#100"); // unchanged Macro-B template
  });
});

// ---------------------------------------------------------------------------
// Real data — the canonical on-disk ledger (regenerated at schemaVersion 1.0.0)
// ---------------------------------------------------------------------------

describe("real ledger on disk — data/state/learned-cnc-controller-patterns.json", () => {
  it("ingests the canonical ledger and answers a real held-out query", () => {
    if (!existsSync(CANONICAL_LEDGER)) {
      console.warn(`[skip] canonical ledger absent: ${CANONICAL_LEDGER}`);
      return;
    }
    const eng = new CNCControllerDeepLearningEngine();
    const res = eng.ingestLearnedPatterns(CANONICAL_LEDGER);
    expect(res.loaded).toBe(true);
    expect(res.schemaVersion).toBe("1.0.0"); // bumped from DRAFT by this unit
    expect(res.counts.toolSlotConventions).toBeGreaterThan(0);
    expect(res.counts.vVariableIdioms).toBeGreaterThan(0);
    // held-out inference: "turning" is not a built-in okuma application
    const macro = eng.recommendMacro("turning", "okuma_osp");
    expect(macro).not.toBeNull();
    expect(macro!.name).toMatch(/^learned_/);
    // the synthesized template references a real 6-digit corpus tool number
    expect(macro!.code_template).toMatch(/T\d{4,6}/);
  });
});

// ---------------------------------------------------------------------------
// Full pipeline E2E — extractor (Steps 1-2) → engine ingest (Step 3) → recommend
// ---------------------------------------------------------------------------

describe("pipeline E2E — extractor → ingest → recommend", () => {
  it("mines the real JM-Die corpus and recommends a non-stub macro from it", () => {
    let corpusOk = false;
    try {
      corpusOk = statSync(CORPUS_DIR).isDirectory();
    } catch {
      corpusOk = false;
    }
    if (!corpusOk || !existsSync(EXTRACTOR)) {
      console.warn(`[skip] corpus or extractor absent (corpus=${CORPUS_DIR})`);
      return;
    }
    const outDir = mkdtempSync(join(tmpdir(), "cnc-e2e-"));
    const outPath = join(outDir, "fresh-ledger.json");
    try {
      execFileSync(
        process.execPath,
        [EXTRACTOR, "--corpus-dir", CORPUS_DIR, "--out", outPath],
        { stdio: "pipe", timeout: 120_000 },
      );
      expect(existsSync(outPath)).toBe(true);
      const eng = new CNCControllerDeepLearningEngine();
      const res = eng.ingestLearnedPatterns(outPath);
      expect(res.loaded).toBe(true);
      expect(res.counts.toolSlotConventions).toBeGreaterThan(0);
      // a freshly-mined corpus must drive a non-stub recommendation
      const macro = eng.recommendMacro("turning", "okuma_osp");
      expect(macro).not.toBeNull();
      expect(macro!.code_template).toMatch(/T\d{4,6}/);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Dispatcher round-trip — through executeAIReasoningAction (not the singleton)
// ---------------------------------------------------------------------------

describe("dispatcher round-trip — prism_ai controller_* actions", () => {
  it("controller_ingest_learned loads the canonical ledger via the dispatcher", async () => {
    if (!existsSync(CANONICAL_LEDGER)) {
      console.warn(`[skip] canonical ledger absent: ${CANONICAL_LEDGER}`);
      return;
    }
    const res = await executeAIReasoningAction("controller_ingest_learned", {});
    expect(res.success).toBe(true);
    const data = res.data as { loaded: boolean; counts: { toolSlotConventions: number } };
    expect(data.loaded).toBe(true);
    expect(data.counts.toolSlotConventions).toBeGreaterThan(0);
  });

  it("controller_recommend_macro returns a learned pattern after ingest", async () => {
    if (!existsSync(CANONICAL_LEDGER)) {
      console.warn(`[skip] canonical ledger absent: ${CANONICAL_LEDGER}`);
      return;
    }
    // ensure the singleton has the corpus loaded (idempotent across the suite)
    await executeAIReasoningAction("controller_ingest_learned", {});
    const res = await executeAIReasoningAction("controller_recommend_macro", {
      operation: "turning",
      controller: "okuma_osp",
    });
    expect(res.success).toBe(true);
    const data = res.data as { found: boolean; pattern: { name: string } | null };
    expect(data.found).toBe(true);
    expect(data.pattern).not.toBeNull();
    expect(data.pattern!.name).toMatch(/^learned_/);
  });

  it("controller_recommend_macro reports found:false for an unmatched operation", async () => {
    if (!existsSync(CANONICAL_LEDGER)) {
      console.warn(`[skip] canonical ledger absent: ${CANONICAL_LEDGER}`);
      return;
    }
    await executeAIReasoningAction("controller_ingest_learned", {});
    const res = await executeAIReasoningAction("controller_recommend_macro", {
      operation: "electrochemical_polish",
      controller: "okuma_osp",
    });
    expect(res.success).toBe(true);
    const data = res.data as { found: boolean; pattern?: unknown };
    // `found:false` is the authoritative "no recommendation" signal and is
    // always present. The MCP slimResponse layer elides the `pattern:null`
    // field in transport, so it arrives as `undefined` — assert "no pattern
    // object" (null-or-absent), not strict null.
    expect(data.found).toBe(false);
    expect(data.pattern ?? null).toBeNull();
  });

  it("controller_recommend_macro rejects a missing required param via schema", async () => {
    const res = await executeAIReasoningAction("controller_recommend_macro", {
      controller: "okuma_osp",
    } as Record<string, unknown>);
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
