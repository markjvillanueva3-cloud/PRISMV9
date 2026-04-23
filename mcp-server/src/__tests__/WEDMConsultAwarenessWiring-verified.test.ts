/**
 * MS-P1.5-ONESHOT / U-P1.5-OS-07 — consultAwareness wiring verification
 *
 * The pre-existing WEDMConsultAwarenessWiring.test.ts only checks that the
 * pipeline does not crash when awareness is in the loop — it is lenient by
 * design ("may or may not be consulted"). This suite is stricter: it spies
 * on the middleware and asserts the wiring actually fires with the right
 * keywords at the right stages in both entry points.
 *
 * Exit criteria from milestone:
 *   - every pipeline entry calls consultAwareness with {process, machine, material, wire}
 *   - awareness cache hit rate ≥80% in repeat-material test
 *   - pipeline latency regression ≤5% p95
 *   - fails-open: awareness timeout does NOT block pipeline but logs warning
 *
 * We cover:
 *   (1) WEDMPrintToProgramEngine.generate() invokes consultAwareness with
 *       dispatcher="edm", action="wedm_print_to_program", and keywords
 *       containing process label + material + thickness.
 *   (2) AutoPrintToProgramBridgeEngine.runAutoPipeline() invokes
 *       consultAwareness with dispatcher="auto_print_to_program" and a
 *       process-typed action.
 *   (3) Repeat-invocation cache behavior — second identical call hits cache.
 *   (4) Fail-open — when middleware throws on import, pipeline still returns
 *       a result; when middleware stalls past 50ms, the timeout branch fires
 *       and emits an awareness_consulted: timeout stage WITHOUT blocking.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Minimal closed-square DXF — enough for the pipelines to emit a program.
const SQUARE_DXF = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
0
90
4
70
1
10
0.0
20
0.0
10
25.0
20
0.0
10
25.0
20
25.0
10
0.0
20
25.0
0
ENDSEC
0
EOF`;

describe("U-P1.5-OS-07: WEDMPrintToProgramEngine consultAwareness wiring", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invokes consultAwareness with wire_edm + material + thickness keywords", async () => {
    const consultSpy = vi.fn().mockResolvedValue({
      ok: true,
      query: "wire_edm D2 25mm",
      summary: ["[wedm] D2-25mm reference (92%)"],
      topMatches: [{ domain: "wedm", name: "D2-25mm reference", confidence: 0.92 }],
      suggestions: [],
      latencyMs: 4,
      cached: false,
    });

    vi.doMock("../tools/dispatchers/awarenessMiddleware.js", () => ({
      consultAwareness: consultSpy,
      clearAwarenessCache: vi.fn(),
      awarenessCacheSize: vi.fn(() => 0),
    }));

    const { wedmPrintToProgramEngine } = await import(
      "../engines/WEDMPrintToProgramEngine.js"
    );

    const result = await wedmPrintToProgramEngine.generate({
      dxf_content: SQUARE_DXF,
      material: "D2",
      thickness_mm: 25,
      target_ra_um: 1.6,
    });

    // consultAwareness MUST have fired exactly once at pipeline entry.
    expect(consultSpy).toHaveBeenCalled();
    const firstCall = consultSpy.mock.calls[0]?.[0];
    expect(firstCall).toBeDefined();
    expect(firstCall.dispatcher).toBe("edm");
    expect(firstCall.action).toBe("wedm_print_to_program");
    expect(Array.isArray(firstCall.keywords)).toBe(true);
    // Required categories: process label + material + thickness bucket.
    expect(firstCall.keywords).toContain("wire_edm");
    expect(firstCall.keywords).toContain("D2");
    expect(firstCall.keywords.some((k: string) => k === "25mm")).toBe(true);

    // Stage MUST record the consult so downstream observability sees it.
    const consultStage = result.stages_completed?.find((s: string) =>
      s.startsWith("awareness_consulted:"),
    );
    expect(consultStage).toBeDefined();
  });

  it("passes target_ra_um into keywords when provided", async () => {
    const consultSpy = vi.fn().mockResolvedValue({
      ok: true,
      query: "",
      summary: [],
      topMatches: [],
      suggestions: [],
      latencyMs: 2,
      cached: false,
    });

    vi.doMock("../tools/dispatchers/awarenessMiddleware.js", () => ({
      consultAwareness: consultSpy,
      clearAwarenessCache: vi.fn(),
      awarenessCacheSize: vi.fn(() => 0),
    }));

    const { wedmPrintToProgramEngine } = await import(
      "../engines/WEDMPrintToProgramEngine.js"
    );

    await wedmPrintToProgramEngine.generate({
      dxf_content: SQUARE_DXF,
      material: "D2",
      thickness_mm: 25,
      target_ra_um: 0.8,
    });

    const firstCall = consultSpy.mock.calls[0]?.[0];
    expect(firstCall.keywords).toContain("Ra0.8");
  });

  it("fails open when middleware throws — pipeline still returns", async () => {
    // Simulate a broken middleware module — import itself throws.
    vi.doMock("../tools/dispatchers/awarenessMiddleware.js", () => {
      throw new Error("middleware not installed");
    });

    const { wedmPrintToProgramEngine } = await import(
      "../engines/WEDMPrintToProgramEngine.js"
    );

    const result = await wedmPrintToProgramEngine.generate({
      dxf_content: SQUARE_DXF,
      material: "D2",
      thickness_mm: 25,
      target_ra_um: 1.6,
    });

    // Fail-open: pipeline result must exist and not throw.
    expect(typeof result.success).toBe("boolean");
    // A warning must be surfaced so operators can diagnose.
    const unavailableWarning = result.warnings.find((w: string) =>
      w.includes("Awareness consult unavailable"),
    );
    expect(unavailableWarning).toBeDefined();
  });

  it("fails open when middleware stalls past 50ms timeout", async () => {
    // Simulate a slow middleware that takes longer than 50ms — the engine's
    // Promise.race must win and the timeout branch must fire.
    const slowSpy = vi.fn().mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                query: "slow",
                summary: [],
                topMatches: [],
                suggestions: [],
                latencyMs: 200,
                cached: false,
              }),
            200,
          ),
        ),
    );

    vi.doMock("../tools/dispatchers/awarenessMiddleware.js", () => ({
      consultAwareness: slowSpy,
      clearAwarenessCache: vi.fn(),
      awarenessCacheSize: vi.fn(() => 0),
    }));

    const { wedmPrintToProgramEngine } = await import(
      "../engines/WEDMPrintToProgramEngine.js"
    );

    const result = await wedmPrintToProgramEngine.generate({
      dxf_content: SQUARE_DXF,
      material: "D2",
      thickness_mm: 25,
      target_ra_um: 1.6,
    });

    // Pipeline still completes.
    expect(typeof result.success).toBe("boolean");
    // Timeout branch must have emitted the stage marker.
    const timeoutStage = result.stages_completed?.find((s: string) =>
      s.includes("awareness_consulted: timeout"),
    );
    expect(timeoutStage).toBeDefined();
    // And a warning must surface that the consult timed out.
    const timeoutWarning = result.warnings.find((w: string) =>
      w.includes("Awareness consult timed out"),
    );
    expect(timeoutWarning).toBeDefined();
  });
});

describe("U-P1.5-OS-07: AutoPrintToProgramBridgeEngine consultAwareness wiring", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invokes consultAwareness with process + material keywords", async () => {
    const consultSpy = vi.fn().mockResolvedValue({
      ok: true,
      query: "wire_edm D2",
      summary: ["[wedm] wire-edm D2 context (88%)"],
      topMatches: [{ domain: "wedm", name: "wire-edm D2 context", confidence: 0.88 }],
      suggestions: [],
      latencyMs: 6,
      cached: false,
    });

    vi.doMock("../tools/dispatchers/awarenessMiddleware.js", () => ({
      consultAwareness: consultSpy,
      clearAwarenessCache: vi.fn(),
      awarenessCacheSize: vi.fn(() => 0),
    }));

    const { autoPrintToProgramBridgeEngine } = await import(
      "../engines/AutoPrintToProgramBridgeEngine.js"
    );

    await autoPrintToProgramBridgeEngine.runAutoPipeline({
      content: SQUARE_DXF,
      format: "dxf",
      process_type: "wire_edm",
      material_name: "D2",
      stock_z_mm: 25,
    } as unknown as Parameters<typeof autoPrintToProgramBridgeEngine.runAutoPipeline>[0]);

    expect(consultSpy).toHaveBeenCalled();
    const firstCall = consultSpy.mock.calls[0]?.[0];
    expect(firstCall).toBeDefined();
    expect(firstCall.dispatcher).toBe("auto_print_to_program");
    expect(firstCall.action).toMatch(/^auto_pipeline:/);
    expect(Array.isArray(firstCall.keywords)).toBe(true);
    // The detected/forced process type must appear in keywords.
    expect(firstCall.keywords).toContain("wire_edm");
    expect(firstCall.keywords).toContain("D2");
  });

  it("emits awareness_consulted stage with match count", async () => {
    const consultSpy = vi.fn().mockResolvedValue({
      ok: true,
      query: "wire_edm",
      summary: [],
      topMatches: [
        { domain: "a", name: "m1", confidence: 0.9 },
        { domain: "b", name: "m2", confidence: 0.8 },
      ],
      suggestions: [],
      latencyMs: 3,
      cached: false,
    });

    vi.doMock("../tools/dispatchers/awarenessMiddleware.js", () => ({
      consultAwareness: consultSpy,
      clearAwarenessCache: vi.fn(),
      awarenessCacheSize: vi.fn(() => 0),
    }));

    const { autoPrintToProgramBridgeEngine } = await import(
      "../engines/AutoPrintToProgramBridgeEngine.js"
    );

    const result = await autoPrintToProgramBridgeEngine.runAutoPipeline({
      content: SQUARE_DXF,
      format: "dxf",
      process_type: "wire_edm",
      material_name: "D2",
      stock_z_mm: 25,
    } as unknown as Parameters<typeof autoPrintToProgramBridgeEngine.runAutoPipeline>[0]);

    const consultStage = result.stages_completed?.find((s: string) =>
      s.startsWith("awareness_consulted:"),
    );
    expect(consultStage).toBeDefined();
    expect(consultStage).toContain("2 matches");
  });

  it("fails open when middleware stalls past 50ms", async () => {
    const slowSpy = vi.fn().mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                query: "slow",
                summary: [],
                topMatches: [],
                suggestions: [],
                latencyMs: 200,
                cached: false,
              }),
            200,
          ),
        ),
    );

    vi.doMock("../tools/dispatchers/awarenessMiddleware.js", () => ({
      consultAwareness: slowSpy,
      clearAwarenessCache: vi.fn(),
      awarenessCacheSize: vi.fn(() => 0),
    }));

    const { autoPrintToProgramBridgeEngine } = await import(
      "../engines/AutoPrintToProgramBridgeEngine.js"
    );

    const result = await autoPrintToProgramBridgeEngine.runAutoPipeline({
      content: SQUARE_DXF,
      format: "dxf",
      process_type: "wire_edm",
      material_name: "D2",
      stock_z_mm: 25,
    } as unknown as Parameters<typeof autoPrintToProgramBridgeEngine.runAutoPipeline>[0]);

    const timeoutStage = result.stages_completed?.find((s: string) =>
      s.includes("awareness_consulted: timeout"),
    );
    expect(timeoutStage).toBeDefined();

    const timeoutWarning = result.warnings.find(
      (w: { severity: string; message: string; stage: string }) =>
        w.stage === "awareness" && w.message.includes("timed out"),
    );
    expect(timeoutWarning).toBeDefined();
  });
});

describe("U-P1.5-OS-07: repeat-call cache behavior", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("middleware is invoked on both calls but the second can be served from cache by the middleware itself", async () => {
    let callCount = 0;
    const consultSpy = vi.fn().mockImplementation(() => {
      callCount += 1;
      return Promise.resolve({
        ok: true,
        query: "",
        summary: [],
        topMatches: [],
        suggestions: [],
        latencyMs: callCount === 1 ? 4 : 0, // second is cached → ~0ms
        cached: callCount > 1,
      });
    });

    vi.doMock("../tools/dispatchers/awarenessMiddleware.js", () => ({
      consultAwareness: consultSpy,
      clearAwarenessCache: vi.fn(),
      awarenessCacheSize: vi.fn(() => 1),
    }));

    const { wedmPrintToProgramEngine } = await import(
      "../engines/WEDMPrintToProgramEngine.js"
    );

    const input = {
      dxf_content: SQUARE_DXF,
      material: "D2",
      thickness_mm: 25,
      target_ra_um: 1.6,
    };

    const first = await wedmPrintToProgramEngine.generate(input);
    const second = await wedmPrintToProgramEngine.generate(input);

    expect(consultSpy).toHaveBeenCalledTimes(2);

    const firstStage = first.stages_completed?.find((s: string) =>
      s.startsWith("awareness_consulted:"),
    );
    const secondStage = second.stages_completed?.find((s: string) =>
      s.startsWith("awareness_consulted:"),
    );
    // Second call should report cached=true per our mock.
    expect(secondStage).toContain("cached=true");
    // First call was not cached.
    expect(firstStage).toContain("cached=false");
  });
});
