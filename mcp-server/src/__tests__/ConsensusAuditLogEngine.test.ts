/**
 * ConsensusAuditLogEngine tests — INFRA-CONSENSUS-WIRE-MS0/P0-U04
 *
 * Real-fs against an isolated temp audit-log path — no mocks of the SUT.
 * Explicit named fixtures (no synthetic generation loops). Each assertion
 * proves a specific record value or behavioral contract from the spec.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  mkdtempSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConsensusAuditLogEngine,
  CONSENSUS_AUDIT_SCHEMA_VERSION,
  resolveAuditLogPath,
  consensusAuditQueryParamsSchema,
  type ConsensusAuditRecord,
} from "../engines/ConsensusAuditLogEngine.js";

const ROTATION_TEST_THRESHOLD_BYTES = 1024;
const TWO_MB_BYTES = 2 * 1024 * 1024;

const FIX_MILL: ConsensusAuditRecord = {
  schemaVersion: CONSENSUS_AUDIT_SCHEMA_VERSION,
  ts: "2026-05-19T15:00:00.000Z",
  callerEngine: "MillingAGIMasterEngine",
  question: "Optimal chip load for 6061-T6 with 1/2 inch HSS endmill at 10000 RPM?",
  voices: ["claude", "gpt-5.5", "deepseek-r1:14b"],
  perVoiceAnswers: [
    { model: "claude", ok: true, answer: "0.005 in/tooth", latencyMs: 1234, tokens: 42 },
    { model: "gpt-5.5", ok: true, answer: "0.005 in/tooth", latencyMs: 5678, tokens: 38 },
    { model: "deepseek-r1:14b", ok: true, answer: "0.0048 in/tooth", latencyMs: 8901, tokens: null },
  ],
  finalDecision: "0.005 in/tooth",
  agreement: 0.92,
  latencyMsTotal: 8901,
  tokensTotal: 80,
  sessionId: "claude-delta-test-mill",
};

const FIX_LATHE: ConsensusAuditRecord = {
  schemaVersion: CONSENSUS_AUDIT_SCHEMA_VERSION,
  ts: "2026-05-19T15:01:00.000Z",
  callerEngine: "LatheAGIMasterEngine",
  question: "Surface speed for hard-turning 4140HT at HRC 45 with CBN insert?",
  voices: ["claude", "gpt-5.5"],
  perVoiceAnswers: [
    { model: "claude", ok: true, answer: "350 sfm", latencyMs: 1000, tokens: 30 },
    { model: "gpt-5.5", ok: true, answer: "400 sfm", latencyMs: 2200, tokens: 28 },
  ],
  finalDecision: "350 sfm",
  agreement: 0.5,
  latencyMsTotal: 2200,
  tokensTotal: 58,
  sessionId: "claude-delta-test-lathe",
};

const FIX_WEDM: ConsensusAuditRecord = {
  schemaVersion: CONSENSUS_AUDIT_SCHEMA_VERSION,
  ts: "2026-05-19T15:02:00.000Z",
  callerEngine: "WireEDMAGIMasterEngine",
  question: "Wire tension for 0.010 inch brass wire cutting D2 at 1 inch thick?",
  voices: ["claude", "gpt-5.5", "deepseek-r1:14b"],
  perVoiceAnswers: [
    { model: "claude", ok: true, answer: "1400 grams", latencyMs: 1500, tokens: 35 },
    { model: "gpt-5.5", ok: false, answer: "", latencyMs: 0, tokens: null },
    { model: "deepseek-r1:14b", ok: true, answer: "1400 grams", latencyMs: 7200, tokens: null },
  ],
  finalDecision: "1400 grams",
  agreement: 0.67,
  latencyMsTotal: 7200,
  tokensTotal: 35,
  sessionId: "claude-delta-test-wedm",
};

const FIX_LATHE_2: ConsensusAuditRecord = {
  schemaVersion: CONSENSUS_AUDIT_SCHEMA_VERSION,
  ts: "2026-05-19T15:03:00.000Z",
  callerEngine: "LatheAGIMasterEngine",
  question: "Feed rate for finish-pass on 17-4 PH at 0.030 inch depth?",
  voices: ["claude", "gpt-5.5"],
  perVoiceAnswers: [
    { model: "claude", ok: true, answer: "0.004 ipr", latencyMs: 1100, tokens: 28 },
    { model: "gpt-5.5", ok: true, answer: "0.004 ipr", latencyMs: 1800, tokens: 25 },
  ],
  finalDecision: "0.004 ipr",
  agreement: 1.0,
  latencyMsTotal: 1800,
  tokensTotal: 53,
  sessionId: "claude-delta-test-lathe2",
};

describe("ConsensusAuditLogEngine", () => {
  let tmpDir: string;
  let auditPath: string;
  let savedPath: string | undefined;
  let savedDisable: string | undefined;
  let savedRotation: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "consensus-audit-"));
    auditPath = join(tmpDir, "audit.jsonl");
    savedPath = process.env.PRISM_CONSENSUS_AUDIT_PATH;
    savedDisable = process.env.PRISM_CONSENSUS_AUDIT_DISABLE;
    savedRotation = process.env.PRISM_CONSENSUS_AUDIT_ROTATION_BYTES;
    process.env.PRISM_CONSENSUS_AUDIT_PATH = auditPath;
    delete process.env.PRISM_CONSENSUS_AUDIT_DISABLE;
    delete process.env.PRISM_CONSENSUS_AUDIT_ROTATION_BYTES;
  });

  afterEach(() => {
    if (savedPath === undefined) delete process.env.PRISM_CONSENSUS_AUDIT_PATH;
    else process.env.PRISM_CONSENSUS_AUDIT_PATH = savedPath;
    if (savedDisable === undefined) delete process.env.PRISM_CONSENSUS_AUDIT_DISABLE;
    else process.env.PRISM_CONSENSUS_AUDIT_DISABLE = savedDisable;
    if (savedRotation === undefined) delete process.env.PRISM_CONSENSUS_AUDIT_ROTATION_BYTES;
    else process.env.PRISM_CONSENSUS_AUDIT_ROTATION_BYTES = savedRotation;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("resolveAuditLogPath", () => {
    it("returns the explicit PRISM_CONSENSUS_AUDIT_PATH override unchanged", () => {
      process.env.PRISM_CONSENSUS_AUDIT_PATH = "/custom/explicit/audit-path.jsonl";
      expect(resolveAuditLogPath()).toBe("/custom/explicit/audit-path.jsonl");
    });

    it("falls back to PRISM_ROOT-anchored canonical path mcp-server/data/state/consensus-decisions.jsonl", () => {
      delete process.env.PRISM_CONSENSUS_AUDIT_PATH;
      const savedRoot = process.env.PRISM_ROOT;
      process.env.PRISM_ROOT = tmpDir;
      try {
        expect(resolveAuditLogPath()).toBe(join(tmpDir, "mcp-server/data/state/consensus-decisions.jsonl"));
      } finally {
        if (savedRoot === undefined) delete process.env.PRISM_ROOT;
        else process.env.PRISM_ROOT = savedRoot;
      }
    });
  });

  describe("append() round-trip — explicit fixtures", () => {
    it("appends FIX_MILL and reads back the exact question + finalDecision + agreement", () => {
      ConsensusAuditLogEngine.append(FIX_MILL);
      const records = ConsensusAuditLogEngine.read();
      expect(records[0].question).toBe(FIX_MILL.question);
      expect(records[0].finalDecision).toBe("0.005 in/tooth");
      expect(records[0].agreement).toBeCloseTo(0.92, 5);
      expect(records[0].latencyMsTotal).toBe(8901);
      expect(records[0].tokensTotal).toBe(80);
    });

    it("preserves perVoiceAnswers shape including null tokens and not-ok entries", () => {
      ConsensusAuditLogEngine.append(FIX_WEDM);
      const records = ConsensusAuditLogEngine.read();
      const rec = records[0];
      expect(rec.perVoiceAnswers[0].model).toBe("claude");
      expect(rec.perVoiceAnswers[0].ok).toBe(true);
      expect(rec.perVoiceAnswers[0].answer).toBe("1400 grams");
      expect(rec.perVoiceAnswers[0].tokens).toBe(35);
      expect(rec.perVoiceAnswers[1].model).toBe("gpt-5.5");
      expect(rec.perVoiceAnswers[1].ok).toBe(false);
      expect(rec.perVoiceAnswers[1].answer).toBe("");
      expect(rec.perVoiceAnswers[2].tokens).toBe(null);
    });

    it("stores voices array verbatim (order preserved)", () => {
      ConsensusAuditLogEngine.append(FIX_MILL);
      const records = ConsensusAuditLogEngine.read();
      expect(records[0].voices).toEqual(["claude", "gpt-5.5", "deepseek-r1:14b"]);
    });

    it("ts and sessionId pass through unchanged", () => {
      ConsensusAuditLogEngine.append(FIX_LATHE);
      const records = ConsensusAuditLogEngine.read();
      expect(records[0].ts).toBe("2026-05-19T15:01:00.000Z");
      expect(records[0].sessionId).toBe("claude-delta-test-lathe");
    });

    it("writes valid newline-delimited JSON — file ends with newline and each line parses", () => {
      ConsensusAuditLogEngine.append(FIX_MILL);
      ConsensusAuditLogEngine.append(FIX_LATHE);
      const raw = readFileSync(auditPath, "utf-8");
      expect(raw.endsWith("\n")).toBe(true);
      const lines = raw.split("\n").filter((l) => l.length > 0);
      expect(lines.length).toBe(2);
      const line0 = JSON.parse(lines[0]) as ConsensusAuditRecord;
      const line1 = JSON.parse(lines[1]) as ConsensusAuditRecord;
      expect(line0.callerEngine).toBe("MillingAGIMasterEngine");
      expect(line1.callerEngine).toBe("LatheAGIMasterEngine");
    });
  });

  describe("append() — defensive normalization", () => {
    it("forces schemaVersion to the canonical value even when caller submits a wrong value", () => {
      const corrupt: ConsensusAuditRecord = { ...FIX_MILL };
      // @ts-expect-error — runtime override of a const-shaped literal
      corrupt.schemaVersion = "0.0.99-bogus";
      ConsensusAuditLogEngine.append(corrupt);
      const raw = readFileSync(auditPath, "utf-8");
      expect(raw).toContain(`"schemaVersion":"${CONSENSUS_AUDIT_SCHEMA_VERSION}"`);
      expect(raw.includes("0.0.99-bogus")).toBe(false);
      const records = ConsensusAuditLogEngine.read();
      expect(records[0].schemaVersion).toBe(CONSENSUS_AUDIT_SCHEMA_VERSION);
    });

    it("NaN agreement becomes exactly 0 (not stringified as null)", () => {
      const nanRec: ConsensusAuditRecord = { ...FIX_MILL, agreement: NaN, question: "nan-test" };
      ConsensusAuditLogEngine.append(nanRec);
      const records = ConsensusAuditLogEngine.read();
      expect(records[0].question).toBe("nan-test");
      expect(records[0].agreement).toBe(0);
      expect(Number.isFinite(records[0].agreement)).toBe(true);
    });

    it("Infinity latencyMsTotal becomes exactly 0", () => {
      const infRec: ConsensusAuditRecord = { ...FIX_MILL, latencyMsTotal: Infinity, question: "inf-test" };
      ConsensusAuditLogEngine.append(infRec);
      const records = ConsensusAuditLogEngine.read();
      expect(records[0].question).toBe("inf-test");
      expect(records[0].latencyMsTotal).toBe(0);
    });

    it(`${TWO_MB_BYTES / 1024 / 1024}MB question survives round-trip with first and last char intact`, () => {
      const bigQ = "Q".repeat(TWO_MB_BYTES);
      const bigRec: ConsensusAuditRecord = { ...FIX_MILL, question: bigQ };
      ConsensusAuditLogEngine.append(bigRec);
      const records = ConsensusAuditLogEngine.read();
      expect(records[0].question.length).toBe(TWO_MB_BYTES);
      expect(records[0].question[0]).toBe("Q");
      expect(records[0].question[TWO_MB_BYTES - 1]).toBe("Q");
    });
  });

  describe("append() — fire-and-forget contract", () => {
    it("does NOT throw when audit path is actually a directory; directory remains a directory", () => {
      const dirPath = join(tmpDir, "audit-as-dir");
      mkdirSync(dirPath);
      process.env.PRISM_CONSENSUS_AUDIT_PATH = dirPath;
      expect(() => ConsensusAuditLogEngine.append(FIX_MILL)).not.toThrow();
      expect(statSync(dirPath).isDirectory()).toBe(true);
    });

    it("PRISM_CONSENSUS_AUDIT_DISABLE=1 prevents file creation; clearing the flag restores append", () => {
      process.env.PRISM_CONSENSUS_AUDIT_DISABLE = "1";
      ConsensusAuditLogEngine.append(FIX_MILL);
      expect(existsSync(auditPath)).toBe(false);
      delete process.env.PRISM_CONSENSUS_AUDIT_DISABLE;
      ConsensusAuditLogEngine.append(FIX_LATHE);
      expect(existsSync(auditPath)).toBe(true);
      const records = ConsensusAuditLogEngine.read();
      expect(records[0].finalDecision).toBe("350 sfm");
    });

    it("does NOT throw when JSON.stringify fails on a circular reference in perVoiceAnswers", () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      const corrupt: ConsensusAuditRecord = {
        ...FIX_MILL,
        perVoiceAnswers: [{ model: "claude", ok: true, answer: "test", latencyMs: 100, tokens: 10 }],
      };
      // @ts-expect-error — inject circular onto the entry to force JSON.stringify to throw
      corrupt.perVoiceAnswers[0].circular = circular;
      expect(() => ConsensusAuditLogEngine.append(corrupt)).not.toThrow();
    });
  });

  describe("append() — rotation via PRISM_CONSENSUS_AUDIT_ROTATION_BYTES override", () => {
    it("rotates the active log file when the next write would cross the threshold", () => {
      process.env.PRISM_CONSENSUS_AUDIT_ROTATION_BYTES = String(ROTATION_TEST_THRESHOLD_BYTES);
      // Seed the active log with content above the threshold but still valid jsonl
      const seedRec: ConsensusAuditRecord = { ...FIX_MILL, question: "seed-record-before-rotation" };
      const seedLine = JSON.stringify(seedRec) + "\n";
      writeFileSync(auditPath, seedLine);
      // Pad to overshoot threshold
      const padNeeded = ROTATION_TEST_THRESHOLD_BYTES + 10 - seedLine.length;
      writeFileSync(auditPath, seedLine + "x".repeat(padNeeded));
      const sizeBefore = statSync(auditPath).size;
      expect(sizeBefore).toBeGreaterThan(ROTATION_TEST_THRESHOLD_BYTES);

      const postRec: ConsensusAuditRecord = { ...FIX_LATHE, question: "post-rotation-marker" };
      ConsensusAuditLogEngine.append(postRec);

      const filesInDir = readdirSync(tmpDir);
      const rotated = filesInDir.filter((f) => f.includes(".rotated.jsonl"));
      expect(rotated.length).toBe(1);
      const rotatedPath = join(tmpDir, rotated[0]);
      expect(statSync(rotatedPath).size).toBe(sizeBefore);
      const activeContent = readFileSync(auditPath, "utf-8");
      const activeLines = activeContent.split("\n").filter((l) => l.length > 0);
      expect(activeLines.length).toBe(1);
      const newRec = JSON.parse(activeLines[0]) as ConsensusAuditRecord;
      expect(newRec.question).toBe("post-rotation-marker");
      expect(newRec.callerEngine).toBe("LatheAGIMasterEngine");
    });

    it("does NOT rotate when the active log stays under threshold", () => {
      process.env.PRISM_CONSENSUS_AUDIT_ROTATION_BYTES = String(TWO_MB_BYTES);
      ConsensusAuditLogEngine.append(FIX_MILL);
      ConsensusAuditLogEngine.append(FIX_LATHE);
      const filesInDir = readdirSync(tmpDir);
      const rotated = filesInDir.filter((f) => f.includes(".rotated.jsonl"));
      expect(rotated.length).toBe(0);
    });
  });

  describe("read() — failure modes", () => {
    it("returns an empty array (NOT throws) when the audit file does not exist", () => {
      expect(existsSync(auditPath)).toBe(false);
      const records = ConsensusAuditLogEngine.read();
      expect(records.length).toBe(0);
      expect(Array.isArray(records)).toBe(true);
    });

    it("drops malformed lines and returns the valid surrounding records intact", () => {
      const good1 = JSON.stringify(FIX_MILL) + "\n";
      const garbage = "not-json-at-all-broken-line\n";
      const good2 = JSON.stringify(FIX_LATHE) + "\n";
      writeFileSync(auditPath, good1 + garbage + good2);
      const records = ConsensusAuditLogEngine.read();
      // newest-first ordering: FIX_LATHE then FIX_MILL
      expect(records[0].callerEngine).toBe("LatheAGIMasterEngine");
      expect(records[0].finalDecision).toBe("350 sfm");
      expect(records[1].callerEngine).toBe("MillingAGIMasterEngine");
      expect(records[1].finalDecision).toBe("0.005 in/tooth");
    });
  });

  describe("read() — filtering across explicit fixtures", () => {
    it("callerEngine=LatheAGIMasterEngine returns the 2 lathe records in newest-first order", () => {
      ConsensusAuditLogEngine.append(FIX_MILL);
      ConsensusAuditLogEngine.append(FIX_LATHE);
      ConsensusAuditLogEngine.append(FIX_WEDM);
      ConsensusAuditLogEngine.append(FIX_LATHE_2);

      const lathe = ConsensusAuditLogEngine.read({ callerEngine: "LatheAGIMasterEngine" });
      expect(lathe.map((r) => r.finalDecision)).toEqual(["0.004 ipr", "350 sfm"]);
    });

    it("callerEngine=MillingAGIMasterEngine returns only the mill record", () => {
      ConsensusAuditLogEngine.append(FIX_MILL);
      ConsensusAuditLogEngine.append(FIX_LATHE);
      ConsensusAuditLogEngine.append(FIX_WEDM);
      const mill = ConsensusAuditLogEngine.read({ callerEngine: "MillingAGIMasterEngine" });
      expect(mill.length).toBe(1);
      expect(mill[0].finalDecision).toBe("0.005 in/tooth");
      expect(mill[0].agreement).toBeCloseTo(0.92, 5);
    });

    it("callerEngine=WireEDMAGIMasterEngine returns only the wedm record", () => {
      ConsensusAuditLogEngine.append(FIX_MILL);
      ConsensusAuditLogEngine.append(FIX_LATHE);
      ConsensusAuditLogEngine.append(FIX_WEDM);
      const wedm = ConsensusAuditLogEngine.read({ callerEngine: "WireEDMAGIMasterEngine" });
      expect(wedm.length).toBe(1);
      expect(wedm[0].finalDecision).toBe("1400 grams");
      expect(wedm[0].perVoiceAnswers[1].ok).toBe(false);
    });

    it("sinceMs cutoff between 15:01 and 15:02 returns only WEDM and LATHE_2", () => {
      ConsensusAuditLogEngine.append(FIX_MILL);
      ConsensusAuditLogEngine.append(FIX_LATHE);
      ConsensusAuditLogEngine.append(FIX_WEDM);
      ConsensusAuditLogEngine.append(FIX_LATHE_2);
      const cutoff = Date.parse("2026-05-19T15:01:30.000Z");
      const records = ConsensusAuditLogEngine.read({ sinceMs: cutoff });
      // newest-first: LATHE_2 (15:03) then WEDM (15:02)
      expect(records.map((r) => r.finalDecision)).toEqual(["0.004 ipr", "1400 grams"]);
    });

    it("limit=2 returns the two newest records by ts", () => {
      ConsensusAuditLogEngine.append(FIX_MILL);
      ConsensusAuditLogEngine.append(FIX_LATHE);
      ConsensusAuditLogEngine.append(FIX_WEDM);
      ConsensusAuditLogEngine.append(FIX_LATHE_2);
      const records = ConsensusAuditLogEngine.read({ limit: 2 });
      expect(records.map((r) => r.finalDecision)).toEqual(["0.004 ipr", "1400 grams"]);
    });
  });

  describe("schema validation — accepted inputs", () => {
    it("accepts undefined returns undefined", () => {
      expect(consensusAuditQueryParamsSchema.parse(undefined)).toBe(undefined);
    });

    it("accepts empty object returns empty object", () => {
      expect(consensusAuditQueryParamsSchema.parse({})).toEqual({});
    });

    it("accepts limit=10 returns the same value", () => {
      expect(consensusAuditQueryParamsSchema.parse({ limit: 10 })).toEqual({ limit: 10 });
    });

    it("accepts limit=1000 (upper bound) returns the same value", () => {
      expect(consensusAuditQueryParamsSchema.parse({ limit: 1000 })).toEqual({ limit: 1000 });
    });

    it("accepts sinceMs=0 (lower bound) returns the same value", () => {
      expect(consensusAuditQueryParamsSchema.parse({ sinceMs: 0 })).toEqual({ sinceMs: 0 });
    });

    it("accepts callerEngine=MillingAGIMasterEngine returns the same string", () => {
      expect(consensusAuditQueryParamsSchema.parse({ callerEngine: "MillingAGIMasterEngine" })).toEqual({
        callerEngine: "MillingAGIMasterEngine",
      });
    });
  });

  describe("schema validation — rejected inputs", () => {
    it("rejects limit=0 (must be positive integer)", () => {
      expect(() => consensusAuditQueryParamsSchema.parse({ limit: 0 })).toThrow();
    });

    it("rejects limit=1001 (over max)", () => {
      expect(() => consensusAuditQueryParamsSchema.parse({ limit: 1001 })).toThrow();
    });

    it("rejects limit=1.5 (must be integer)", () => {
      expect(() => consensusAuditQueryParamsSchema.parse({ limit: 1.5 })).toThrow();
    });

    it("rejects sinceMs=-1 (must be non-negative)", () => {
      expect(() => consensusAuditQueryParamsSchema.parse({ sinceMs: -1 })).toThrow();
    });

    it("rejects sinceMs='bad' (must be number)", () => {
      expect(() => consensusAuditQueryParamsSchema.parse({ sinceMs: "bad" })).toThrow();
    });

    it("rejects callerEngine=42 (must be string)", () => {
      expect(() => consensusAuditQueryParamsSchema.parse({ callerEngine: 42 })).toThrow();
    });

    it("rejects negative limit at read()", () => {
      expect(() => ConsensusAuditLogEngine.read({ limit: -1 } as never)).toThrow();
    });

    it("rejects negative sinceMs at read()", () => {
      expect(() => ConsensusAuditLogEngine.read({ sinceMs: -100 } as never)).toThrow();
    });
  });
});
