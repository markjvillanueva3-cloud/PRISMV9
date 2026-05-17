/**
 * ContextEvalEngine.test.ts
 *
 * OBSIDIAN-INTELLIGENCE-MS3/D5/U-CONTEXT-EVAL-GATE — coverage-verdict matrix.
 *
 * Exit-criteria: before an agent acts, score retrieved context vs a golden
 * set; verdict PASS/WARN/FAIL/NO_MATCH with explicit missing tokens/files.
 *
 * Comprehensive-build floor: >=3 failure modes (missing golden, malformed
 * golden, oversize golden), >=2 adversarial (symlink golden, duplicate ids),
 * >=3 spanning verdicts (PASS/WARN/FAIL/NO_MATCH), Zod on every public entry,
 * determinism (pinned now + id tie-break), dispatcher round-trip parity.
 *
 * Filename matches engine (B1 Stop-hook lesson). Hermetic tmpdir golden
 * files. No network.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync, writeFileSync, rmSync, existsSync, symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ContextEvalEngine,
  contextEvalEngine,
  ContextEvalOptionsSchema,
  runContextEval,
  _internals,
} from "../engines/ContextEvalEngine.js";

const NOW = Date.UTC(2026, 4, 17, 12, 0, 0);
const NOW_ISO = "2026-05-17T12:00:00.000Z";

interface Fixture {
  dir: string;
  goldenPath: string;
  writeGolden: (obj: unknown) => string;
  writeRaw: (s: string) => string;
  cleanup: () => void;
}

function makeFixture(): Fixture {
  const dir = mkdtempSync(join(tmpdir(), "prism-ceval-test-"));
  const goldenPath = join(dir, "golden.json");
  return {
    dir, goldenPath,
    writeGolden: (obj) => { writeFileSync(goldenPath, JSON.stringify(obj), "utf8"); return goldenPath; },
    writeRaw: (s) => { writeFileSync(goldenPath, s, "utf8"); return goldenPath; },
    cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* swallow */ } },
  };
}

const GOLDEN_OK = {
  schemaVersion: "1.0.0",
  entries: [
    { id: "kienzle", query: "kienzle cutting force specific energy", requiredTokens: ["kc1_1", "mc", "ap"], requiredFiles: ["constants.ts"], minCoverage: 0.8 },
    { id: "taylor", query: "taylor tool life cutting speed", requiredTokens: ["taylor", "vc", "exponent"] },
  ],
};

describe("ContextEvalEngine — Zod schema", () => {
  it("rejects empty goldenPath", () => {
    expect(() => ContextEvalOptionsSchema.parse({ goldenPath: "" })).toThrow();
  });
  it("rejects threshold > 1", () => {
    expect(() => ContextEvalOptionsSchema.parse({ threshold: 1.5 })).toThrow();
  });
  it("rejects negative floor", () => {
    expect(() => ContextEvalOptionsSchema.parse({ floor: -0.1 })).toThrow();
  });
  it("rejects fractional maxGoldenBytes", () => {
    expect(() => ContextEvalOptionsSchema.parse({ maxGoldenBytes: 1.5 })).toThrow();
  });
  it("accepts every documented option", () => {
    expect(() => ContextEvalOptionsSchema.parse({
      goldenPath: "/g.json", now: NOW, threshold: 0.8, floor: 0.5,
      tokenWeight: 0.7, minMatchScore: 0.15, maxGoldenBytes: 65536,
    })).not.toThrow();
  });
  it("validateOptions fires on loadGolden", () => {
    expect(() => contextEvalEngine.loadGolden({ threshold: 2 })).toThrow();
  });
  it("validateOptions fires on evaluate", () => {
    expect(() => contextEvalEngine.evaluate("q", "ctx", { now: Number.NaN })).toThrow();
  });
  it("validateOptions fires on runContextEval wrapper", () => {
    expect(() => runContextEval("q", "ctx", { floor: 9 })).toThrow();
  });
});

describe("ContextEvalEngine — loadGolden (failure modes)", () => {
  let f: Fixture;
  beforeEach(() => { f = makeFixture(); });
  afterEach(() => f.cleanup());

  it("missing golden → empty + warning (no throw)", () => {
    const r = contextEvalEngine.loadGolden({ goldenPath: join(f.dir, "nope.json") });
    expect(r.entries).toEqual([]);
    expect(r.warnings.some((w) => w.includes("not found"))).toBe(true);
  });

  it("malformed JSON → empty + warning (no throw)", () => {
    f.writeRaw("{ not json ]");
    const r = contextEvalEngine.loadGolden({ goldenPath: f.goldenPath });
    expect(r.entries).toEqual([]);
    expect(r.warnings.some((w) => w.includes("not valid JSON"))).toBe(true);
  });

  it("schema-invalid golden → empty + warning (no throw)", () => {
    f.writeGolden({ entries: [{ id: "", query: "x", requiredTokens: [] }] });
    const r = contextEvalEngine.loadGolden({ goldenPath: f.goldenPath });
    expect(r.entries).toEqual([]);
    expect(r.warnings.some((w) => w.includes("schema validation"))).toBe(true);
  });

  it("oversize golden → refused + warning", () => {
    f.writeGolden(GOLDEN_OK);
    const r = contextEvalEngine.loadGolden({ goldenPath: f.goldenPath, maxGoldenBytes: 256 });
    expect(r.entries).toEqual([]);
    expect(r.warnings.some((w) => w.includes("exceeds maxGoldenBytes"))).toBe(true);
  });

  it("duplicate ids → first kept + warning", () => {
    f.writeGolden({
      entries: [
        { id: "dup", query: "a b", requiredTokens: ["x"] },
        { id: "dup", query: "c d", requiredTokens: ["y"] },
      ],
    });
    const r = contextEvalEngine.loadGolden({ goldenPath: f.goldenPath });
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].query).toBe("a b");
    expect(r.warnings.some((w) => w.includes("duplicate golden id"))).toBe(true);
  });

  it("symlinked golden → refused (no follow)", () => {
    f.writeGolden(GOLDEN_OK);
    const realTarget = join(f.dir, "real-golden.json");
    writeFileSync(realTarget, JSON.stringify(GOLDEN_OK), "utf8");
    const linkPath = join(f.dir, "link-golden.json");
    try {
      symlinkSync(realTarget, linkPath);
    } catch {
      // Windows without privilege — symlink path is exercised on POSIX/CI.
      return;
    }
    const r = contextEvalEngine.loadGolden({ goldenPath: linkPath });
    expect(r.entries).toEqual([]);
    expect(r.warnings.some((w) => w.includes("symlink"))).toBe(true);
  });

  it("valid golden → entries loaded, no warnings", () => {
    f.writeGolden(GOLDEN_OK);
    const r = contextEvalEngine.loadGolden({ goldenPath: f.goldenPath });
    expect(r.entries.map((e) => e.id)).toEqual(["kienzle", "taylor"]);
    expect(r.warnings).toEqual([]);
  });
});

describe("ContextEvalEngine — evaluate (verdict matrix)", () => {
  let f: Fixture;
  beforeEach(() => { f = makeFixture(); f.writeGolden(GOLDEN_OK); });
  afterEach(() => f.cleanup());

  it("PASS: all required tokens + files present", () => {
    const r = runContextEval(
      "kienzle cutting force specific energy",
      "The kc1_1 coefficient with mc exponent and ap depth; see constants.ts for canonical values.",
      { goldenPath: f.goldenPath, now: NOW },
    );
    expect(r.verdict).toBe("PASS");
    expect(r.matchedGoldenId).toBe("kienzle");
    expect(r.missingTokens).toEqual([]);
    expect(r.missingFiles).toEqual([]);
    expect(r.coverage).toBeGreaterThanOrEqual(r.threshold);
    expect(r.generatedAt).toBe(NOW_ISO);
  });

  it("PASS: all taylor tokens present as whole tokens (no-file entry)", () => {
    // taylor entry: requiredTokens [taylor, vc, exponent], NO requiredFiles
    // (fileCoverage defaults to 1). All three appear as standalone tokens →
    // tokenCoverage 1 → coverage = 0.7*1 + 0.3*1 = 1.0 ≥ 0.8 → PASS.
    // Guards the sound-matching contract: "vc" is a 2-char pure-alpha token
    // and matches ONLY because it is a whole token here (not a substring of
    // some unrelated word) — the exact P0-3 soundness property.
    const r = runContextEval(
      "taylor tool life cutting speed",
      "taylor curve with vc and the wear exponent both stated explicitly",
      { goldenPath: f.goldenPath, now: NOW },
    );
    expect(r.matchedGoldenId).toBe("taylor");
    expect(r.missingTokens).toEqual([]);
    expect(r.tokenCoverage).toBe(1);
    expect(r.verdict).toBe("PASS");
  });

  it("P0-3 soundness: token is NOT matched as a substring of a longer word", () => {
    // "exponent" appears ONLY as a substring of "exponential" here. The
    // pre-fix pure-`includes` matcher returned a spurious hit
    // ("exponential".includes("exponent") === true); the sound matcher
    // requires a whole-token match, so "exponent" is correctly MISSING.
    // This is the concrete proof of the Arm-B P0-3 fix.
    const r = runContextEval(
      "taylor tool life cutting speed",
      "taylor exponential decay model only; nothing else stated here",
      { goldenPath: f.goldenPath, now: NOW },
    );
    expect(r.matchedGoldenId).toBe("taylor");
    expect(r.missingTokens).toEqual(expect.arrayContaining(["vc", "exponent"]));
    // Only "taylor" (1/3) — proves "exponent" did NOT match "exponential"
    // (old matcher would have given 2/3 here).
    expect(r.tokenCoverage).toBeCloseTo(1 / 3, 5);
    // coverage = 0.7*(1/3) + 0.3*1 = 0.5333 → ≥ floor 0.5, < 0.8 → WARN.
    expect(r.coverage).toBeCloseTo(0.5333, 3);
    expect(r.verdict).toBe("WARN");
  });

  it("WARN: genuinely missing one token (coverage in [floor,threshold))", () => {
    const r = runContextEval(
      "taylor tool life cutting speed",
      "taylor curve mentions vc only; nothing about the third concept",
      { goldenPath: f.goldenPath, now: NOW },
    );
    expect(r.matchedGoldenId).toBe("taylor");
    expect(r.missingTokens).toContain("exponent");
    // 2/3 tokens, no files → coverage 0.7*0.667+0.3*1 = 0.767 ∈ [0.5,0.8) → WARN
    expect(r.verdict).toBe("WARN");
  });

  it("FAIL: coverage below floor", () => {
    const r = runContextEval(
      "kienzle cutting force specific energy",
      "this context is about something entirely unrelated to machining physics",
      { goldenPath: f.goldenPath, now: NOW },
    );
    expect(r.matchedGoldenId).toBe("kienzle");
    expect(r.verdict).toBe("FAIL");
    expect(r.missingTokens.length).toBeGreaterThan(0);
    expect(r.coverage).toBeLessThan(r.floor);
  });

  it("NO_MATCH: query does not match any golden entry", () => {
    const r = runContextEval(
      "how do i bake sourdough bread at high altitude",
      "irrelevant context",
      { goldenPath: f.goldenPath, now: NOW },
    );
    expect(r.verdict).toBe("NO_MATCH");
    expect(r.matchedGoldenId).toBe(null);
  });

  it("NO_MATCH: empty query", () => {
    const r = runContextEval("", "ctx", { goldenPath: f.goldenPath, now: NOW });
    expect(r.verdict).toBe("NO_MATCH");
    expect(r.warnings.some((w) => w.includes("empty query"))).toBe(true);
  });

  it("NO_MATCH: golden file absent (degrade, not throw)", () => {
    const r = runContextEval("kienzle force", "ctx", {
      goldenPath: join(f.dir, "absent.json"), now: NOW,
    });
    expect(r.verdict).toBe("NO_MATCH");
    expect(r.warnings.some((w) => w.includes("no golden entries loaded"))).toBe(true);
  });

  it("per-entry minCoverage override is honored", () => {
    // kienzle has minCoverage 0.8. Provide tokens to land at exactly the
    // file-only miss: all 3 tokens present, file missing →
    // coverage = 0.7*1 + 0.3*0 = 0.7 < 0.8 → WARN (0.7 ≥ floor 0.5).
    const r = runContextEval(
      "kienzle cutting force specific energy",
      "kc1_1 mc ap are all here but the source file is not referenced",
      { goldenPath: f.goldenPath, now: NOW },
    );
    expect(r.matchedGoldenId).toBe("kienzle");
    expect(r.missingFiles).toEqual(["constants.ts"]);
    expect(r.tokenCoverage).toBe(1);
    expect(r.fileCoverage).toBe(0);
    expect(r.coverage).toBeCloseTo(0.7, 5);
    expect(r.verdict).toBe("WARN");
  });

  it("determinism: same inputs + pinned now → byte-equal result", () => {
    const a = runContextEval("kienzle cutting force", "kc1_1 mc ap constants.ts", { goldenPath: f.goldenPath, now: NOW });
    const b = runContextEval("kienzle cutting force", "kc1_1 mc ap constants.ts", { goldenPath: f.goldenPath, now: NOW });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.generatedAt).toBe(NOW_ISO);
  });

  it("match tie-break is deterministic by id", () => {
    f.writeGolden({
      entries: [
        { id: "zzz", query: "alpha beta gamma", requiredTokens: ["x"] },
        { id: "aaa", query: "alpha beta gamma", requiredTokens: ["y"] },
      ],
    });
    const r = runContextEval("alpha beta gamma", "x y", { goldenPath: f.goldenPath, now: NOW });
    // Identical jaccard → lower id wins ("aaa").
    expect(r.matchedGoldenId).toBe("aaa");
  });
});

describe("ContextEvalEngine — _internals (pure)", () => {
  it("clamp01 bounds + NaN/default", () => {
    expect(_internals.clamp01(0.5, 0.9)).toBe(0.5);
    expect(_internals.clamp01(-1, 0.9)).toBe(0);
    expect(_internals.clamp01(2, 0.9)).toBe(1);
    expect(_internals.clamp01(Number.NaN, 0.9)).toBe(0.9);
    expect(_internals.clamp01(undefined as unknown as number, 0.9)).toBe(0.9);
  });

  it("tokenize lowercases, drops <2-char, dedupes", () => {
    const t = _internals.tokenize("Kienzle a OF kc1_1 Kienzle");
    expect(t.has("kienzle")).toBe(true);
    expect(t.has("kc1_1")).toBe(true);
    expect(t.has("a")).toBe(false);
    expect(t.has("of")).toBe(true);
    expect([...t].filter((x) => x === "kienzle")).toHaveLength(1);
  });

  it("jaccard symmetric + bounded", () => {
    const a = new Set(["x", "y", "z"]);
    const b = new Set(["y", "z", "w"]);
    expect(_internals.jaccard(a, b)).toBeCloseTo(2 / 4, 5);
    expect(_internals.jaccard(a, b)).toBe(_internals.jaccard(b, a));
    expect(_internals.jaccard(new Set(), new Set())).toBe(1);
    expect(_internals.jaccard(a, new Set())).toBe(0);
  });

  it("tokenPresent: sound whole-token + compound-substring matching", () => {
    const tp = (req: string, hay: string) =>
      _internals.tokenPresent(req, hay.toLowerCase(), _internals.tokenize(hay));
    // Whole-token match (case-insensitive) — the sound path.
    expect(tp("taylor", "the Taylor model applies")).toBe(true);
    expect(tp("taylor", "no match here")).toBe(false);
    // Compound identifier (digit/_/.) keeps the substring affordance:
    // "kc1_1" inside "kc1_1mpa", "constants.ts" inside a path.
    expect(tp("kc1_1", "the kc1_1mpa value")).toBe(true);
    expect(tp("constants.ts", "see src/physics/constants.ts here")).toBe(true);
    // P0-3: pure-alpha tokens get NO substring fallback — "kienzle" must
    // NOT match "kienzles" (this was the unsound behavior Arm B flagged;
    // "kienzle" is not a whole token of "kienzles model").
    expect(tp("kienzle", "kienzles model")).toBe(false);
    // ...but DOES match when it is a genuine whole token.
    expect(tp("kienzle", "the kienzle force law")).toBe(true);
    // Short pure-alpha token: whole-token only (no "mc" in "mcmaster").
    expect(tp("mc", "the mcmaster catalog")).toBe(false);
    expect(tp("mc", "the mc exponent")).toBe(true);
  });

  it("GoldenEntrySchema rejects empty requiredTokens", () => {
    expect(_internals.GoldenEntrySchema.safeParse({ id: "a", query: "q", requiredTokens: [] }).success).toBe(false);
    expect(_internals.GoldenEntrySchema.safeParse({ id: "a", query: "q", requiredTokens: ["x"] }).success).toBe(true);
  });
});

describe("ContextEvalEngine — dispatcher round-trip", () => {
  it("ACTION_MEMORY_SCHEMAS registers context_eval_score", async () => {
    const { ACTION_MEMORY_SCHEMAS } = await import("../schemas/memoryActionSchemas.js");
    expect(ACTION_MEMORY_SCHEMAS).toHaveProperty("context_eval_score");
    const s = ACTION_MEMORY_SCHEMAS.context_eval_score;
    expect(() => s.parse({ query: "q", retrieved_context: "ctx" })).not.toThrow();
    expect(() => s.parse({ query: "q", retrievedContext: "ctx" })).not.toThrow();
    expect(() => s.parse({ query: "q", retrieved_context: "ctx", threshold: 0.8 })).not.toThrow();
    expect(() => s.parse({ retrieved_context: "ctx" })).toThrow(); // query required
    expect(() => s.parse({ query: "q", retrieved_context: "ctx", threshold: 9 })).toThrow();
  });

  it("singleton + class produce equivalent verdicts", () => {
    const f = makeFixture();
    try {
      f.writeGolden(GOLDEN_OK);
      const a = contextEvalEngine.evaluate("kienzle force", "kc1_1 mc ap constants.ts", { goldenPath: f.goldenPath, now: NOW });
      const b = new ContextEvalEngine().evaluate("kienzle force", "kc1_1 mc ap constants.ts", { goldenPath: f.goldenPath, now: NOW });
      expect(a.verdict).toBe(b.verdict);
      expect(a.coverage).toBe(b.coverage);
      expect(a.matchedGoldenId).toBe(b.matchedGoldenId);
    } finally {
      f.cleanup();
    }
  });
});
