/**
 * AI Dispatcher — `consensus_audit_query` action
 * ==============================================
 * Tests for INFRA-CONSENSUS-WIRE-MS0 / P0-U04.
 *
 * Verifies the dispatcher round-trip against the REAL ConsensusAuditLogEngine
 * (no mock of the SUT) using a temp audit-log file via PRISM_CONSENSUS_AUDIT_PATH.
 * Also exercises schema validation for the 3 envelope-mandated failure paths.
 *
 * @module __tests__/AIDispatcherConsensusAuditQuery
 * @milestone INFRA-CONSENSUS-WIRE-MS0/P0-U04
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { ACTION_AI_REASONING_SCHEMAS, AI_REASONING_ACTIONS } from "../schemas/aiReasoningActionSchemas.js";
import {
  ConsensusAuditLogEngine,
  CONSENSUS_AUDIT_SCHEMA_VERSION,
  type ConsensusAuditRecord,
} from "../engines/ConsensusAuditLogEngine.js";

function mkRecord(callerEngine: string, finalDecision: string, ts: string): ConsensusAuditRecord {
  return {
    schemaVersion: CONSENSUS_AUDIT_SCHEMA_VERSION,
    ts,
    callerEngine,
    question: `question for ${callerEngine}`,
    voices: ["claude", "gpt-5.5"],
    perVoiceAnswers: [
      { model: "claude", ok: true, answer: finalDecision, latencyMs: 100, tokens: 10 },
      { model: "gpt-5.5", ok: true, answer: finalDecision, latencyMs: 200, tokens: 12 },
    ],
    finalDecision,
    agreement: 1.0,
    latencyMsTotal: 200,
    tokensTotal: 22,
    sessionId: "dispatcher-test",
  };
}

describe("aiReasoningDispatcher — consensus_audit_query (P0-U04)", () => {
  let tmpDir: string;
  let auditPath: string;
  let savedPath: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "consensus-audit-dispatch-"));
    auditPath = join(tmpDir, "audit.jsonl");
    savedPath = process.env.PRISM_CONSENSUS_AUDIT_PATH;
    process.env.PRISM_CONSENSUS_AUDIT_PATH = auditPath;
  });

  afterEach(() => {
    if (savedPath === undefined) delete process.env.PRISM_CONSENSUS_AUDIT_PATH;
    else process.env.PRISM_CONSENSUS_AUDIT_PATH = savedPath;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("action surface", () => {
    it("consensus_audit_query is registered in the AI_REASONING_ACTIONS enum", () => {
      expect(AI_REASONING_ACTIONS.includes("consensus_audit_query")).toBe(true);
    });

    it("consensus_audit_query has a schema entry in ACTION_AI_REASONING_SCHEMAS", () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.consensus_audit_query;
      expect(schema).not.toBe(undefined);
      // schema accepts an empty object and rejects a bad limit
      expect(schema.parse({})).toEqual({});
      expect(() => schema.parse({ limit: 0 })).toThrow();
    });
  });

  describe("dispatcher round-trip — real engine, real fs", () => {
    it("returns the records the engine wrote, newest-first, with count, inside the {success,data} envelope", async () => {
      ConsensusAuditLogEngine.append(mkRecord("MillingAGIMasterEngine", "0.005 ipt", "2026-05-19T15:00:00.000Z"));
      ConsensusAuditLogEngine.append(mkRecord("LatheAGIMasterEngine", "350 sfm", "2026-05-19T15:01:00.000Z"));

      const res = (await executeAIReasoningAction("consensus_audit_query", {})) as {
        success: boolean;
        data: { records: ConsensusAuditRecord[]; count: number };
      };
      expect(res.success).toBe(true);
      expect(res.data.count).toBe(2);
      expect(res.data.records[0].callerEngine).toBe("LatheAGIMasterEngine");
      expect(res.data.records[0].finalDecision).toBe("350 sfm");
      expect(res.data.records[1].callerEngine).toBe("MillingAGIMasterEngine");
      expect(res.data.records[1].finalDecision).toBe("0.005 ipt");
    });

    it("callerEngine filter passes through to the engine and narrows results", async () => {
      ConsensusAuditLogEngine.append(mkRecord("MillingAGIMasterEngine", "0.005 ipt", "2026-05-19T15:00:00.000Z"));
      ConsensusAuditLogEngine.append(mkRecord("LatheAGIMasterEngine", "350 sfm", "2026-05-19T15:01:00.000Z"));
      ConsensusAuditLogEngine.append(mkRecord("MillingAGIMasterEngine", "0.008 ipt", "2026-05-19T15:02:00.000Z"));

      const res = (await executeAIReasoningAction("consensus_audit_query", {
        callerEngine: "MillingAGIMasterEngine",
      })) as { success: boolean; data: { records: ConsensusAuditRecord[]; count: number } };
      expect(res.data.count).toBe(2);
      expect(res.data.records.map((r) => r.finalDecision)).toEqual(["0.008 ipt", "0.005 ipt"]);
    });

    it("limit param passes through and caps results", async () => {
      ConsensusAuditLogEngine.append(mkRecord("MillingAGIMasterEngine", "d1", "2026-05-19T15:00:00.000Z"));
      ConsensusAuditLogEngine.append(mkRecord("MillingAGIMasterEngine", "d2", "2026-05-19T15:01:00.000Z"));
      ConsensusAuditLogEngine.append(mkRecord("MillingAGIMasterEngine", "d3", "2026-05-19T15:02:00.000Z"));

      const res = (await executeAIReasoningAction("consensus_audit_query", { limit: 2 })) as {
        success: boolean;
        data: { records: ConsensusAuditRecord[]; count: number };
      };
      expect(res.data.count).toBe(2);
      expect(res.data.records.map((r) => r.finalDecision)).toEqual(["d3", "d2"]);
    });

    it("sinceMs param passes through and excludes older records", async () => {
      ConsensusAuditLogEngine.append(mkRecord("MillingAGIMasterEngine", "old", "2026-01-01T00:00:00.000Z"));
      ConsensusAuditLogEngine.append(mkRecord("MillingAGIMasterEngine", "new", "2026-06-01T00:00:00.000Z"));

      const res = (await executeAIReasoningAction("consensus_audit_query", {
        sinceMs: Date.parse("2026-03-01T00:00:00.000Z"),
      })) as { success: boolean; data: { records: ConsensusAuditRecord[]; count: number } };
      expect(res.data.count).toBe(1);
      expect(res.data.records[0].finalDecision).toBe("new");
    });

    it("returns count 0 when the audit log is empty (records[] elided by MCP slimResponse — count is the authoritative empty signal)", async () => {
      const res = (await executeAIReasoningAction("consensus_audit_query", {})) as {
        success: boolean;
        data: { records?: ConsensusAuditRecord[]; count: number };
      };
      // count is the slim-survivable empty signal — the dispatcher always sets
      // it from records.length. An empty `records: []` is elided by the MCP
      // slimResponse layer (token efficiency), so it may be absent here.
      expect(res.data.count).toBe(0);
      expect(res.data.records ?? []).toEqual([]);
    });
  });

  describe("schema validation — rejected inputs", () => {
    it("rejects a non-integer limit", () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.consensus_audit_query;
      expect(() => schema.parse({ limit: 2.5 })).toThrow();
    });

    it("rejects a negative sinceMs", () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.consensus_audit_query;
      expect(() => schema.parse({ sinceMs: -1 })).toThrow();
    });

    it("rejects a non-string callerEngine", () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.consensus_audit_query;
      expect(() => schema.parse({ callerEngine: 123 })).toThrow();
    });

    it("rejects an unknown extra key (strict object)", () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.consensus_audit_query;
      expect(() => schema.parse({ bogusKey: "x" })).toThrow();
    });
  });
});
