/**
 * Tests for PPGOutcomeCaptureWireEngine — U-PPG-SFC-02
 *
 * Coverage axes:
 *   • Happy path: full PPG payload → summarized + persisted
 *   • G-code string analysis: raw string → block_count, tool_changes, subprograms
 *   • Lineage threading: caller-supplied lineage_id is preserved end-to-end
 *   • Append-only: two records produce two rows in the shard
 *   • Concurrent: 5 parallel emissions all land
 *   • Adversarial — circular refs: jsonSafe strips them, bus never throws
 *
 * @milestone PSAU-PPG-SFC U-PPG-SFC-02
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  PPGOutcomeCaptureWireEngine,
  summarizePPGRecommendation,
} from "../../engines/PPGOutcomeCaptureWireEngine.js";
import { OutcomeCaptureBusEngine } from "../../engines/OutcomeCaptureBusEngine.js";

let bus: OutcomeCaptureBusEngine;
let wire: PPGOutcomeCaptureWireEngine;
let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ppg-wire-"));
  bus = new OutcomeCaptureBusEngine(tmpDir);
  wire = new PPGOutcomeCaptureWireEngine(bus);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function findEvent(lineage: string) {
  return bus.query({ domain: "post_processor", lineage_id: lineage, limit: 50 })
    .events;
}

describe("summarizePPGRecommendation", () => {
  it("extracts the canonical numeric subset from a structured payload", () => {
    const s = summarizePPGRecommendation({
      block_count: 150,
      tool_changes: 3,
      axis_count: 5,
      cycle_estimate_sec: 245.5,
      ignoredField: "noise",
    });
    expect(s.block_count).toBe(150);
    expect(s.tool_changes).toBe(3);
    expect(s.axis_count).toBe(5);
    expect(s.cycle_estimate_sec).toBe(245.5);
    expect(Object.keys(s).sort()).toEqual([
      "axis_count",
      "block_count",
      "cycle_estimate_sec",
      "tool_changes",
    ]);
  });

  it("extracts string fields for controller and dialect", () => {
    const s = summarizePPGRecommendation({
      controller: "fanuc",
      dialect: "0i-MF",
      modal_state: "G90 G21",
      format: "nc",
      machine_id: "mill-5",
    });
    expect(s.controller).toBe("fanuc");
    expect(s.dialect).toBe("0i-MF");
    expect(s.modal_state).toBe("G90 G21");
    expect(s.format).toBe("nc");
    expect(s.machine_id).toBe("mill-5");
  });

  it("extracts boolean has_subprograms from both naming conventions", () => {
    const snake = summarizePPGRecommendation({ has_subprograms: true });
    const camel = summarizePPGRecommendation({ hasSubprograms: true });
    const falseCase = summarizePPGRecommendation({ has_subprograms: false });

    expect(snake.has_subprograms).toBe(true);
    expect(camel.has_subprograms).toBe(true);
    expect(falseCase.has_subprograms).toBe(false);
  });

  it("normalizes camelCase aliases to snake_case output", () => {
    const s = summarizePPGRecommendation({
      blockCount: 200,
      toolChanges: 4,
      axisCount: 3,
      cycleTime: 180,
    });
    expect(s.block_count).toBe(200);
    expect(s.tool_changes).toBe(4);
    expect(s.axis_count).toBe(3);
    expect(s.cycle_estimate_sec).toBe(180);
  });

  it("unwraps AtomicValue { value } shape", () => {
    const s = summarizePPGRecommendation({
      block_count: { value: 100, unit: "lines" },
      controller: { value: "siemens" },
    });
    expect(s.block_count).toBe(100);
    expect(s.controller).toBe("siemens");
  });

  it("drops non-finite numbers (NaN, Infinity)", () => {
    const s = summarizePPGRecommendation({
      block_count: NaN,
      tool_changes: Infinity,
      cycle_estimate_sec: 120,
    });
    expect(Object.keys(s)).toEqual(["cycle_estimate_sec"]);
    expect(s.cycle_estimate_sec).toBe(120);
  });

  it("returns empty object for null/non-object input", () => {
    expect(Object.keys(summarizePPGRecommendation(null))).toHaveLength(0);
    expect(Object.keys(summarizePPGRecommendation(undefined))).toHaveLength(0);
    expect(Object.keys(summarizePPGRecommendation(42))).toHaveLength(0);
  });
});

describe("summarizePPGRecommendation — G-code string analysis", () => {
  it("counts non-empty lines as block_count", () => {
    const gcode = "O0001\nG90 G21\n\nT1 M6\n\nG0 X0\nM30";
    const s = summarizePPGRecommendation(gcode);
    expect(s.block_count).toBe(5);
  });

  it("counts unique T-codes as tool_changes", () => {
    const gcode = "T1 M6\nG0 X0\nT2 M6\nG0 X10\nT3 M6\nM30";
    const s = summarizePPGRecommendation(gcode);
    expect(s.tool_changes).toBe(3);
  });

  it("does not double-count repeated tool numbers", () => {
    const gcode = "T1 M6\nG0 X0\nT1 M6\nG0 X10\nT1 M6\nM30";
    const s = summarizePPGRecommendation(gcode);
    expect(s.tool_changes).toBe(1);
  });

  it("detects M98 subprogram calls", () => {
    const gcode = "G0 X0\nM98 P1000\nM30";
    const s = summarizePPGRecommendation(gcode);
    expect(s.has_subprograms).toBe(true);
  });

  it("detects M99 subprogram returns", () => {
    const gcode = "O1000\nG0 X0\nM99";
    const s = summarizePPGRecommendation(gcode);
    expect(s.has_subprograms).toBe(true);
  });

  it("detects CALL subprogram syntax", () => {
    const gcode = "G0 X0\nCALL O1000\nM30";
    const s = summarizePPGRecommendation(gcode);
    expect(s.has_subprograms).toBe(true);
  });

  it("reports no subprograms when none present", () => {
    const gcode = "G0 X0\nG1 X10 F100\nM30";
    const s = summarizePPGRecommendation(gcode);
    expect(s.has_subprograms).toBe(false);
  });

  it("extracts modal state from final lines", () => {
    const gcodeMetric = "G90 G21 G17\nG0 X0\nM30";
    const gcodeImperial = "G90 G20\nG0 X0\nM30";
    expect(summarizePPGRecommendation(gcodeMetric).modal_state).toBe("G90 G21");
    expect(summarizePPGRecommendation(gcodeImperial).modal_state).toBe("G90 G20");
  });

  it("extracts nested gcode field from object and merges with metadata", () => {
    const input = {
      controller: "haas",
      gcode: "O0001\nT1 M6\nT2 M6\nT3 M6\nM30",
    };
    const s = summarizePPGRecommendation(input);
    expect(s.controller).toBe("haas");
    expect(s.block_count).toBe(5);
    expect(s.tool_changes).toBe(3);
  });

  it("prefers structured block_count over analyzed count", () => {
    const input = { block_count: 999, gcode: "G0 X0\nM30" };
    const s = summarizePPGRecommendation(input);
    expect(s.block_count).toBe(999);
  });
});

describe("PPGOutcomeCaptureWireEngine.recordEmission — happy path", () => {
  it("persists a recommendation_emitted event with summary + lineage", () => {
    const lineage = `test-${randomUUID()}`;
    const result = wire.recordEmission({
      engine: "PostProcessorEngine",
      action: "process",
      lineageId: lineage,
      context: { cam_system: "mastercam", machine_id: "okuma-1" },
      recommended: { block_count: 150, tool_changes: 3, controller: "fanuc" },
      confidence: 0.92,
    });

    expect(result.ok).toBe(true);
    expect(result.lineage_id).toBe(lineage);
    expect(result.event_id.length).toBeGreaterThan(8);
    expect(result.summary.block_count).toBe(150);
    expect(result.summary.tool_changes).toBe(3);
    expect(result.summary.controller).toBe("fanuc");

    const events = findEvent(lineage);
    expect(events).toHaveLength(1);
    const ev = events[0];
    expect(ev.domain).toBe("post_processor");
    expect(ev.kind).toBe("recommendation_emitted");
    expect(ev.source).toBe("system");
    expect(ev.confidence).toBe(0.92);
    const ctx = ev.context as Record<string, unknown>;
    expect(ctx.engine).toBe("PostProcessorEngine");
    expect(ctx.action).toBe("process");
    expect(ctx.cam_system).toBe("mastercam");
  });
});

describe("PPGOutcomeCaptureWireEngine.recordEmission — context shapes", () => {
  it("records cleanly with no context object provided", () => {
    const lineage = `test-noctx-${randomUUID()}`;
    const result = wire.recordEmission({
      engine: "LathePostProcessorEngine",
      action: "generate",
      lineageId: lineage,
      recommended: { block_count: 80, controller: "okuma" },
    });
    expect(result.ok).toBe(true);
    expect(result.summary.block_count).toBe(80);
    const events = findEvent(lineage);
    expect(events).toHaveLength(1);
    const ctx = events[0].context as Record<string, unknown>;
    expect(ctx.engine).toBe("LathePostProcessorEngine");
    expect(ctx.action).toBe("generate");
  });

  it("auto-generates a lineage_id when caller omits it", () => {
    const r = wire.recordEmission({
      engine: "MasterPostProcessorEngine",
      action: "generate",
      recommended: { block_count: 200 },
    });
    expect(r.ok).toBe(true);
    expect(r.lineage_id.length).toBeGreaterThan(8);
    expect(r.event_id.length).toBeGreaterThan(8);
    expect(r.lineage_id).toBe(r.event_id);
  });

  it("passes agentId to bus for cross-chat attribution", () => {
    const lineage = `test-agent-${randomUUID()}`;
    wire.recordEmission({
      engine: "PostProcessorGeneratorEngine",
      lineageId: lineage,
      agentId: "agent-42",
      recommended: { block_count: 50 },
    });
    const events = findEvent(lineage);
    expect(events).toHaveLength(1);
    expect(events[0].agent_id).toBe("agent-42");
  });
});

describe("PPGOutcomeCaptureWireEngine — append-only persistence", () => {
  it("two emissions on same lineage produce two rows", () => {
    const lineage = `test-append-${randomUUID()}`;
    wire.recordEmission({
      engine: "PostProcessorEngine",
      action: "process",
      lineageId: lineage,
      recommended: { block_count: 100, controller: "fanuc" },
    });
    wire.recordEmission({
      engine: "PostProcessorEngine",
      action: "process",
      lineageId: lineage,
      recommended: { block_count: 200, controller: "siemens" },
    });
    const events = findEvent(lineage);
    expect(events).toHaveLength(2);
    expect(events[0].event_id).not.toBe(events[1].event_id);
    const blockCounts = events
      .map((e) => (e.recommended as { summary: { block_count: number } }).summary.block_count)
      .sort((a, b) => a - b);
    expect(blockCounts).toEqual([100, 200]);
  });
});

describe("PPGOutcomeCaptureWireEngine — concurrent emissions", () => {
  it("5 parallel emissions persist with distinct event_ids", async () => {
    const tag = `test-concurrent-${randomUUID()}`;
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        Promise.resolve(
          wire.recordEmission({
            engine: "MasterPostProcessorUnifiedAGIEngine",
            action: "generate",
            lineageId: `${tag}-${i}`,
            recommended: { block_count: 100 + i * 10, tool_changes: i + 1 },
          }),
        ),
      ),
    );
    expect(results.every((r) => r.ok)).toBe(true);
    const ids = new Set(results.map((r) => r.event_id));
    expect(ids.size).toBe(5);
    for (let i = 0; i < 5; i++) {
      const evs = findEvent(`${tag}-${i}`);
      expect(evs).toHaveLength(1);
      const rec = evs[0].recommended as { summary: { block_count: number } };
      expect(rec.summary.block_count).toBe(100 + i * 10);
    }
  });
});

describe("PPGOutcomeCaptureWireEngine — adversarial inputs", () => {
  it("circular references are stripped, bus does not throw", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const circular: any = { block_count: 150, controller: "fanuc" };
    circular.self = circular;
    const lineage = `test-circular-${randomUUID()}`;
    const result = wire.recordEmission({
      engine: "PostProcessorEngine",
      action: "process",
      lineageId: lineage,
      recommended: circular,
    });
    expect(result.ok).toBe(true);
    expect(result.summary.block_count).toBe(150);
    expect(result.summary.controller).toBe("fanuc");

    const events = findEvent(lineage);
    expect(events).toHaveLength(1);
    const rec = events[0].recommended as {
      summary: { block_count: number };
      raw: Record<string, unknown>;
    };
    expect(rec.summary.block_count).toBe(150);
    expect(rec.raw.self).toBe("[circular]");
    expect(rec.raw.block_count).toBe(150);
  });

  it("functions and BigInt are stripped from raw payload", () => {
    const lineage = `test-stripped-${randomUUID()}`;
    wire.recordEmission({
      engine: "PostProcessorEngine",
      action: "process",
      lineageId: lineage,
      recommended: {
        block_count: 100,
        fn: () => "ignored",
        big: BigInt(42),
        nested: { controller: "haas", also_fn: () => 7 },
      },
    });
    const events = findEvent(lineage);
    expect(events).toHaveLength(1);
    const rec = events[0].recommended as { raw: Record<string, unknown> };
    expect("fn" in rec.raw).toBe(false);
    expect("big" in rec.raw).toBe(false);
    expect(rec.raw.block_count).toBe(100);
    const nested = rec.raw.nested as Record<string, unknown>;
    expect("also_fn" in nested).toBe(false);
    expect(nested.controller).toBe("haas");
  });

  it("infinite/NaN numbers are nulled in the raw payload", () => {
    const lineage = `test-nonfinite-${randomUUID()}`;
    wire.recordEmission({
      engine: "PostProcessorEngine",
      action: "process",
      lineageId: lineage,
      recommended: { block_count: 100, broken: NaN, also: Infinity },
    });
    const events = findEvent(lineage);
    expect(events).toHaveLength(1);
    const rec = events[0].recommended as { raw: Record<string, unknown> };
    expect(rec.raw.broken).toBeNull();
    expect(rec.raw.also).toBeNull();
    expect(rec.raw.block_count).toBe(100);
  });

  it("large G-code strings are truncated to prevent ledger bloat", () => {
    const largeGcode = "G0 X0\n".repeat(20000);
    const lineage = `test-truncate-${randomUUID()}`;
    wire.recordEmission({
      engine: "PostProcessorEngine",
      action: "process",
      lineageId: lineage,
      recommended: largeGcode,
    });
    const events = findEvent(lineage);
    expect(events).toHaveLength(1);
    const rec = events[0].recommended as { raw: string };
    expect(rec.raw.length).toBeLessThan(60000);
    expect(rec.raw).toContain("[truncated");
  });
});

describe("PPGOutcomeCaptureWireEngine — controller variability", () => {
  it("records Fanuc, Siemens, and Okuma shapes with the right controller values", () => {
    const fanucLineage = `test-fanuc-${randomUUID()}`;
    const siemensLineage = `test-siemens-${randomUUID()}`;
    const okumaLineage = `test-okuma-${randomUUID()}`;

    const fanucRes = wire.recordEmission({
      engine: "PostProcessorEngine",
      action: "process",
      lineageId: fanucLineage,
      context: { cam_system: "mastercam", machine_id: "vmc-1" },
      recommended: { block_count: 500, tool_changes: 5, controller: "fanuc", dialect: "0i-MF" },
      confidence: 0.95,
    });
    const siemensRes = wire.recordEmission({
      engine: "AdvancedPostProcessorEngine",
      action: "generate",
      lineageId: siemensLineage,
      context: { cam_system: "hypermill", machine_id: "dmg-1" },
      recommended: { block_count: 800, tool_changes: 8, controller: "siemens", dialect: "840D" },
      confidence: 0.88,
    });
    const okumaRes = wire.recordEmission({
      engine: "LathePostProcessorAIEngine",
      action: "generate",
      lineageId: okumaLineage,
      context: { cam_system: "esprit", machine_id: "lb3000" },
      recommended: { block_count: 300, tool_changes: 4, controller: "okuma", dialect: "OSP-P300" },
      confidence: 0.91,
    });

    expect(fanucRes.summary.controller).toBe("fanuc");
    expect(fanucRes.summary.dialect).toBe("0i-MF");
    expect(fanucRes.summary.block_count).toBe(500);

    expect(siemensRes.summary.controller).toBe("siemens");
    expect(siemensRes.summary.dialect).toBe("840D");
    expect(siemensRes.summary.block_count).toBe(800);

    expect(okumaRes.summary.controller).toBe("okuma");
    expect(okumaRes.summary.dialect).toBe("OSP-P300");
    expect(okumaRes.summary.block_count).toBe(300);

    const fanucEv = findEvent(fanucLineage)[0];
    const siemensEv = findEvent(siemensLineage)[0];
    const okumaEv = findEvent(okumaLineage)[0];
    expect((fanucEv.context as Record<string, unknown>).cam_system).toBe("mastercam");
    expect((siemensEv.context as Record<string, unknown>).cam_system).toBe("hypermill");
    expect((okumaEv.context as Record<string, unknown>).cam_system).toBe("esprit");
  });
});
