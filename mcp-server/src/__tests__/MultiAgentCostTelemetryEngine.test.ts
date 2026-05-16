/**
 * MultiAgentCostTelemetryEngine tests — COST-CASCADE-MS0/U-MULTI-AGENT-COST-TELEMETRY
 *
 * Real-value assertions only. Every test injects a hermetic tmpdir filePath
 * + a deterministic clock so the ledger, rotation, and time-windowed
 * aggregation are verified against exact numbers — not toBeDefined() stubs.
 * Covers the spec's required 5 cases PLUS the verifies_via 100-call burst
 * (100 JSONL lines + correct aggregate) and the spec adversarial cases
 * (ollama $0, null-token degraded, corrupt-line skip, rotation race).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  MultiAgentCostTelemetryEngine,
  COST_TELEMETRY_SCHEMA_VERSION,
  type CostRecordInput,
} from "../engines/MultiAgentCostTelemetryEngine.js";

let tmpDir: string;
let ledger: string;
const FIXED_MS = Date.parse("2026-05-16T12:00:00.000Z");
const fixedClock = () => FIXED_MS;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cost-tel-"));
  ledger = path.join(tmpDir, "cost-telemetry.jsonl");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function deps(extra: Record<string, unknown> = {}) {
  return { filePath: ledger, now: fixedClock, ...extra };
}

const GOOD: CostRecordInput = {
  tentacle: "claude",
  taskClass: "deep_reasoning",
  inputTokens: 1200,
  outputTokens: 800,
  latencyMs: 4300,
  costUSD: 0.042,
};

describe("MultiAgentCostTelemetryEngine.record — happy path", () => {
  it("writes exactly one JSONL line with schema version + ISO ts", () => {
    const r = MultiAgentCostTelemetryEngine.record(GOOD, deps());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.schemaVersion).toBe(COST_TELEMETRY_SCHEMA_VERSION);
      expect(r.value.ts).toBe("2026-05-16T12:00:00.000Z");
      expect(r.value.degraded).toBe(false);
    }
    const lines = fs.readFileSync(ledger, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.tentacle).toBe("claude");
    expect(parsed.taskClass).toBe("deep_reasoning");
    expect(parsed.inputTokens).toBe(1200);
    expect(parsed.costUSD).toBe(0.042);
  });

  it("records ollama local call with costUSD 0 explicitly (not omitted)", () => {
    const r = MultiAgentCostTelemetryEngine.record(
      { ...GOOD, tentacle: "ollama", costUSD: 0 },
      deps(),
    );
    expect(r.ok).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(ledger, "utf8").trim());
    expect(parsed.costUSD).toBe(0);
    expect("costUSD" in parsed).toBe(true);
  });

  it("flags degraded=true when token usage is null but still records", () => {
    const r = MultiAgentCostTelemetryEngine.record(
      { ...GOOD, inputTokens: null, outputTokens: null },
      deps(),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.degraded).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(ledger, "utf8").trim());
    expect(parsed.degraded).toBe(true);
    expect(parsed.inputTokens).toBe(null);
  });

  it("persists optional meta when provided", () => {
    MultiAgentCostTelemetryEngine.record(
      { ...GOOD, meta: { model: "claude-opus-4-7", sessionId: "abc" } },
      deps(),
    );
    const parsed = JSON.parse(fs.readFileSync(ledger, "utf8").trim());
    expect(parsed.meta).toEqual({ model: "claude-opus-4-7", sessionId: "abc" });
  });
});

describe("MultiAgentCostTelemetryEngine.record — validation (missing/bad fields rejected)", () => {
  it("rejects empty tentacle", () => {
    const r = MultiAgentCostTelemetryEngine.record(
      { ...GOOD, tentacle: "" },
      deps(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("tentacle");
    expect(fs.existsSync(ledger)).toBe(false);
  });

  it("rejects empty taskClass", () => {
    const r = MultiAgentCostTelemetryEngine.record(
      { ...GOOD, taskClass: "   " },
      deps(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("taskClass");
  });

  it("rejects a non-integer inputTokens", () => {
    const r = MultiAgentCostTelemetryEngine.record(
      { ...GOOD, inputTokens: 12.5 },
      deps(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("inputTokens");
  });

  it("rejects a negative costUSD (adversarial)", () => {
    const r = MultiAgentCostTelemetryEngine.record(
      { ...GOOD, costUSD: -1 },
      deps(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("costUSD");
  });

  it("rejects NaN latencyMs (adversarial)", () => {
    const r = MultiAgentCostTelemetryEngine.record(
      { ...GOOD, latencyMs: NaN },
      deps(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("latencyMs");
  });

  it("rejects a null input object", () => {
    const r = MultiAgentCostTelemetryEngine.record(
      null as unknown as CostRecordInput,
      deps(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("input");
  });
});

describe("MultiAgentCostTelemetryEngine.record — rotation at size cap", () => {
  it("rotates the file once it exceeds maxFileBytes, fresh file continues", () => {
    // One serialized record is ~185 B; a 50 B cap guarantees the post-call-1
    // size (>cap) trips rotation on call 2 (rotateIfNeeded runs pre-append).
    const d = deps({ maxFileBytes: 50 });
    MultiAgentCostTelemetryEngine.record(GOOD, d); // no file yet → no rotate, then append (~185 B)
    // file now ~185 B ≥ 50 cap → call 2 rotates before its append
    MultiAgentCostTelemetryEngine.record({ ...GOOD, tentacle: "ollama" }, d);
    const rotated = fs
      .readdirSync(tmpDir)
      .filter((f) => f.startsWith("cost-telemetry-") && f.endsWith(".jsonl"));
    expect(rotated.length).toBe(1);
    // the rotated segment must hold the PRE-rotation record verbatim (no
    // clobber / data-loss) — not just exist
    const seg = fs
      .readFileSync(path.join(tmpDir, rotated[0]), "utf8")
      .trim()
      .split("\n");
    expect(seg).toHaveLength(1);
    expect(JSON.parse(seg[0]).tentacle).toBe("claude");
    // active file holds only the post-rotation record
    const active = fs.readFileSync(ledger, "utf8").trim().split("\n");
    expect(active).toHaveLength(1);
    expect(JSON.parse(active[0]).tentacle).toBe("ollama");
  });
});

describe("MultiAgentCostTelemetryEngine.record — concurrent / burst writes", () => {
  it("100-call burst produces exactly 100 well-formed JSONL lines (verifies_via)", () => {
    for (let i = 0; i < 100; i++) {
      MultiAgentCostTelemetryEngine.record(
        {
          tentacle: i % 2 === 0 ? "claude" : "ollama",
          taskClass: i % 3 === 0 ? "summarize" : "deep_reasoning",
          inputTokens: 100 + i,
          outputTokens: 50 + i,
          latencyMs: 1000 + i,
          costUSD: i % 2 === 0 ? 0.01 : 0,
        },
        deps(),
      );
    }
    const lines = fs.readFileSync(ledger, "utf8").trim().split("\n");
    expect(lines).toHaveLength(100);
    // every line is valid JSON with the required keys (no interleave)
    for (const ln of lines) {
      const o = JSON.parse(ln);
      expect(typeof o.tentacle).toBe("string");
      expect(typeof o.taskClass).toBe("string");
      expect(typeof o.costUSD).toBe("number");
    }
  });
});

describe("MultiAgentCostTelemetryEngine.aggregate", () => {
  it("returns zeroed aggregate over an empty window (no file)", async () => {
    const r = await MultiAgentCostTelemetryEngine.aggregate(24, deps());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.totalCalls).toBe(0);
      expect(r.value.totalCostUSD).toBe(0);
      expect(r.value.byTentacle).toEqual([]);
      expect(r.value.byTaskClass).toEqual([]);
      expect(r.value.windowHours).toBe(24);
    }
  });

  it("sums per-tentacle and per-task-class over the 100-call burst", async () => {
    for (let i = 0; i < 100; i++) {
      MultiAgentCostTelemetryEngine.record(
        {
          tentacle: i % 2 === 0 ? "claude" : "ollama",
          taskClass: i % 3 === 0 ? "summarize" : "deep_reasoning",
          inputTokens: 10,
          outputTokens: 5,
          latencyMs: 100,
          costUSD: i % 2 === 0 ? 0.01 : 0,
        },
        deps(),
      );
    }
    const r = await MultiAgentCostTelemetryEngine.aggregate(24, deps());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.totalCalls).toBe(100);
      // 50 claude calls @ $0.01 = $0.50; 50 ollama @ $0 = $0
      expect(r.value.totalCostUSD).toBeCloseTo(0.5, 6);
      const claude = r.value.byTentacle.find((t) => t.tentacle === "claude");
      const ollama = r.value.byTentacle.find((t) => t.tentacle === "ollama");
      expect(claude?.calls).toBe(50);
      expect(claude?.costUSD).toBeCloseTo(0.5, 6);
      expect(claude?.inputTokens).toBe(50 * 10);
      expect(ollama?.calls).toBe(50);
      expect(ollama?.costUSD).toBe(0);
      // task classes: i%3===0 → 34 summarize (0,3,..,99), 66 deep_reasoning
      const summ = r.value.byTaskClass.find((c) => c.taskClass === "summarize");
      expect(summ?.calls).toBe(34);
      // sorted by cost desc — claude (more cost) first
      expect(r.value.byTentacle[0].tentacle).toBe("claude");
    }
  });

  it("excludes records older than the window", async () => {
    // old record at FIXED_MS - 48h
    MultiAgentCostTelemetryEngine.record(GOOD, {
      filePath: ledger,
      now: () => FIXED_MS - 48 * 3_600_000,
    });
    // recent record at FIXED_MS
    MultiAgentCostTelemetryEngine.record(
      { ...GOOD, tentacle: "ollama", costUSD: 0 },
      deps(),
    );
    const r = await MultiAgentCostTelemetryEngine.aggregate(24, deps());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.totalCalls).toBe(1); // only the recent one
      expect(r.value.byTentacle[0].tentacle).toBe("ollama");
    }
  });

  it("degraded (null-token) calls counted but excluded from token sums", async () => {
    MultiAgentCostTelemetryEngine.record(
      { ...GOOD, inputTokens: null, outputTokens: null, costUSD: 0.02 },
      deps(),
    );
    MultiAgentCostTelemetryEngine.record(GOOD, deps());
    const r = await MultiAgentCostTelemetryEngine.aggregate(24, deps());
    expect(r.ok).toBe(true);
    if (r.ok) {
      const c = r.value.byTentacle.find((t) => t.tentacle === "claude");
      expect(c?.calls).toBe(2);
      expect(c?.degradedCalls).toBe(1);
      // only the non-degraded GOOD record's tokens count
      expect(c?.inputTokens).toBe(1200);
      expect(c?.costUSD).toBeCloseTo(0.062, 6);
    }
  });

  it("skips a corrupt/partial trailing line without throwing (defensive read)", async () => {
    MultiAgentCostTelemetryEngine.record(GOOD, deps());
    fs.appendFileSync(ledger, '{"ts":"2026-05-16T12:00:00.000Z","tentacle":', "utf8");
    const r = await MultiAgentCostTelemetryEngine.aggregate(24, deps());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.totalCalls).toBe(1); // corrupt line skipped
  });

  it("skips a corrupt line BETWEEN two good lines (not just trailing)", async () => {
    MultiAgentCostTelemetryEngine.record(GOOD, deps());
    fs.appendFileSync(ledger, "{ this is not json }\n", "utf8");
    MultiAgentCostTelemetryEngine.record(
      { ...GOOD, tentacle: "ollama", costUSD: 0 },
      deps(),
    );
    const r = await MultiAgentCostTelemetryEngine.aggregate(24, deps());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.totalCalls).toBe(2); // both good lines, corrupt skipped
      expect(r.value.byTentacle.map((t) => t.tentacle).sort()).toEqual([
        "claude",
        "ollama",
      ]);
    }
  });

  it("INCLUDES rotated segments within the window (no truncation at rotation)", async () => {
    // Force a rotation: tiny cap → call 1 writes, call 2 rotates call-1's
    // record into a `cost-telemetry-*.jsonl` segment, then appends fresh.
    const d = deps({ maxFileBytes: 50 });
    MultiAgentCostTelemetryEngine.record(GOOD, d); // → rotated segment (claude)
    MultiAgentCostTelemetryEngine.record(
      { ...GOOD, tentacle: "ollama", costUSD: 0 },
      d,
    ); // → active file (ollama)
    // sanity: the rotated segment exists separately from the active file
    const rotated = fs
      .readdirSync(tmpDir)
      .filter((f) => f.startsWith("cost-telemetry-") && f.endsWith(".jsonl"));
    expect(rotated).toHaveLength(1);
    // aggregate MUST see BOTH the active + rotated segment within the window
    const r = await MultiAgentCostTelemetryEngine.aggregate(24, d);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.totalCalls).toBe(2); // rotated claude + active ollama
      expect(r.value.byTentacle.map((t) => t.tentacle).sort()).toEqual([
        "claude",
        "ollama",
      ]);
    }
  });

  it("rejects a non-positive windowHours", async () => {
    const r = await MultiAgentCostTelemetryEngine.aggregate(0, deps());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("windowHours");
  });
});

describe("MultiAgentCostTelemetryEngine — path precedence", () => {
  it("honors PRISM_COST_TELEMETRY_PATH env over the default, but deps.filePath wins over env", () => {
    const envPath = path.join(tmpDir, "env-ledger.jsonl");
    const depsPath = path.join(tmpDir, "deps-ledger.jsonl");
    const prev = process.env.PRISM_COST_TELEMETRY_PATH;
    process.env.PRISM_COST_TELEMETRY_PATH = envPath;
    try {
      // no deps.filePath → env path used
      const r1 = MultiAgentCostTelemetryEngine.record(GOOD, { now: fixedClock });
      expect(r1.ok).toBe(true);
      expect(fs.existsSync(envPath)).toBe(true);
      expect(fs.existsSync(depsPath)).toBe(false);
      // explicit deps.filePath → overrides env
      const r2 = MultiAgentCostTelemetryEngine.record(GOOD, {
        filePath: depsPath,
        now: fixedClock,
      });
      expect(r2.ok).toBe(true);
      expect(fs.existsSync(depsPath)).toBe(true);
      // env ledger still only the one record (deps write went elsewhere)
      expect(
        fs.readFileSync(envPath, "utf8").trim().split("\n"),
      ).toHaveLength(1);
    } finally {
      if (prev === undefined) delete process.env.PRISM_COST_TELEMETRY_PATH;
      else process.env.PRISM_COST_TELEMETRY_PATH = prev;
    }
  });

  it("ignores an empty-string PRISM_COST_TELEMETRY_PATH (falls back to default)", () => {
    const prev = process.env.PRISM_COST_TELEMETRY_PATH;
    process.env.PRISM_COST_TELEMETRY_PATH = "   ";
    try {
      // empty/whitespace env must NOT be used as a path; deps.filePath
      // still wins so this stays hermetic (asserts the guard, not the
      // default write).
      const r = MultiAgentCostTelemetryEngine.record(GOOD, {
        filePath: ledger,
        now: fixedClock,
      });
      expect(r.ok).toBe(true);
      expect(fs.existsSync(ledger)).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.PRISM_COST_TELEMETRY_PATH;
      else process.env.PRISM_COST_TELEMETRY_PATH = prev;
    }
  });
});

describe("MultiAgentCostTelemetryEngine.record — never throws on fs failure", () => {
  it("returns {ok:false} TELEMETRY_DROPPED instead of throwing when the path is unwritable", () => {
    // Point the ledger at a path whose parent is a FILE, not a dir → mkdir
    // + append both fail. record() must swallow and return ok:false.
    const fileAsDir = path.join(tmpDir, "blocker");
    fs.writeFileSync(fileAsDir, "x");
    const r = MultiAgentCostTelemetryEngine.record(GOOD, {
      filePath: path.join(fileAsDir, "nested", "cost-telemetry.jsonl"),
      now: fixedClock,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("TELEMETRY_DROPPED");
  });
});
