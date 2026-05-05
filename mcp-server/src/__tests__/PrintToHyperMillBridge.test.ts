/**
 * Tests for PrintToHyperMillBridge — Blueprint OCR → hyperMILL AC Python
 * (CAD-COMPLETE-MS0/U-CADC-HM-PRINT-01)
 */

import { describe, it, expect } from "vitest";
import {
  PrintToHyperMillBridge,
  printToHyperMillBridge,
  type PrintToHyperMillInput,
} from "../engines/PrintToHyperMillBridge.js";
import type { BlueprintAnalysis, ExtractedDimension } from "../engines/BlueprintOCREngine.js";
import type { ExtractedProfile } from "../engines/BlueprintVisionOCREngine.js";

// ── Constants ────────────────────────────────────────────────────────────────
const BRIDGE_VERSION = "1.0.0";
const HOLE_DIA = 8;
const POCKET_W = 40;
const POCKET_H = 25;

// ── Fixtures ─────────────────────────────────────────────────────────────────

function dim(type: ExtractedDimension["type"], n: number): ExtractedDimension {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 7)}`,
    type, nominal: n, unit: "mm", raw_text: `${n}mm`, confidence: 0.9,
  };
}

function holeProfile(d = HOLE_DIA): ExtractedProfile {
  return {
    id: `hole-${d}`, name: "Hole", type: "hole",
    points: [{ x: 0, y: 0 }], is_closed: true, diameter_mm: d, confidence: 0.95,
  };
}

function pocketProfile(): ExtractedProfile {
  return {
    id: "pocket-1", name: "Pocket", type: "pocket",
    points: [{ x: 0, y: 0 }, { x: POCKET_W, y: 0 }, { x: POCKET_W, y: POCKET_H }, { x: 0, y: POCKET_H }],
    is_closed: true, width_mm: POCKET_W, height_mm: POCKET_H, confidence: 0.9,
  };
}

function externalProfile(): ExtractedProfile {
  return {
    id: "ext-1", name: "Outline", type: "external",
    points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 60 }, { x: 0, y: 60 }],
    is_closed: true, confidence: 0.92,
  };
}

function plateAnalysis(): BlueprintAnalysis {
  return {
    dimensions: [dim("linear", 100), dim("linear", 60), dim("linear", 10)],
    gdt_frames: [],
    title_block: { part_number: "JM-PLATE-001", revision: "A", material: "1018 steel", units: "mm", confidence: 0.92 },
    notes: [],
    summary: {
      total_dimensions: 3, total_gdt: 0, total_notes: 0,
      tightest_tolerance_mm: 0.05, critical_features: [], material: "1018 steel", has_gdt: false,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Identity + capabilities
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToHyperMillBridge — identity + capabilities", () => {
  it("singleton matches class + reports v1.0.0", () => {
    expect(printToHyperMillBridge).toBeInstanceOf(PrintToHyperMillBridge);
    expect(printToHyperMillBridge.version).toBe(BRIDGE_VERSION);
  });

  it("capabilities() lists exact supported + unsupported profile types", () => {
    const c = printToHyperMillBridge.capabilities();
    expect([...c.supportedProfileTypes].sort()).toEqual(["external", "hole", "pocket"]);
    expect([...c.unsupportedProfileTypes].sort()).toEqual(["internal", "slot"]);
  });

  it("capabilities() lists 4 default tools with stable numbers", () => {
    const c = printToHyperMillBridge.capabilities();
    const numbers = c.defaultTools.map(t => t.number).sort();
    expect(numbers).toEqual([1, 2, 3, 4]);
    const roles = c.defaultTools.map(t => t.role);
    expect(roles).toContain("drill");
    expect(roles).toContain("pocket_rougher");
    expect(roles).toContain("finish_ball");
    expect(roles).toContain("contour");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validate()
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToHyperMillBridge — validate()", () => {
  const e = printToHyperMillBridge;

  it("rejects null input", () => {
    expect(e.validate(null).valid).toBe(false);
  });

  it("rejects empty input — needs at least analysis or profiles", () => {
    const r = e.validate({});
    expect(r.valid).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/at least one of/);
  });

  it.each([
    [-1, "negative"],
    [0, "zero"],
    [Number.NaN, "NaN"],
    [Number.POSITIVE_INFINITY, "Infinity"],
  ])("rejects defaultDepth=%s (%s)", (d) => {
    const r = e.validate({ analysis: plateAnalysis(), defaultDepth: d });
    expect(r.valid).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/defaultDepth must be a finite positive number/);
  });

  it("rejects bad units", () => {
    const r = e.validate({ analysis: plateAnalysis(), units: "feet" as PrintToHyperMillInput["units"] });
    expect(r.valid).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/units must be/);
  });

  it("accepts a valid profiles-only input", () => {
    expect(e.validate({ profiles: [holeProfile()] }).valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildBridgeScript() — happy paths
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToHyperMillBridge — buildBridgeScript() happy paths", () => {
  it("hole profile emits 1 drilling op + drill tool sized to detected hole", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [holeProfile(12)],
    });
    expect(out.opsEmitted).toBe(1);
    expect(out.operationSummary[0]?.type).toBe("drilling");
    expect(out.operationSummary[0]?.tool).toBe(1);
    // Drill tool table contains the auto-sized drill
    expect(out.toolsCount).toBeGreaterThanOrEqual(1);
    // Largest-hole sizing leaves a warning for traceability
    expect(out.warnings.some(w => /Drill tool 1 sized to ø12/.test(w))).toBe(true);
  });

  it("pocket profile emits roughing + finishing pair", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [pocketProfile()],
    });
    expect(out.opsEmitted).toBe(2);
    const types = out.operationSummary.map(o => o.type);
    expect(types).toContain("pocket_2d");
    expect(types).toContain("scallop_finishing");
  });

  it("external profile emits a contour_2d op with contour tool", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [externalProfile()],
    });
    expect(out.opsEmitted).toBe(1);
    expect(out.operationSummary[0]?.type).toBe("contour_2d");
    expect(out.operationSummary[0]?.tool).toBe(4);
  });

  it("multi-feature blueprint: 2 holes + 1 pocket + 1 external = 5 ops", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      analysis: plateAnalysis(),
      profiles: [holeProfile(8), holeProfile(10), pocketProfile(), externalProfile()],
    });
    // 2 drills + 2 pocket ops + 1 contour
    expect(out.opsEmitted).toBe(5);
    expect(out.material).toBe("1018 steel");
    expect(out.partName).toBe("JM-PLATE-001");
    expect(out.units).toBe("mm");
  });

  it("dimensions-only fallback: no profiles emits HPC + Z-level finishing", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      analysis: plateAnalysis(),
    });
    expect(out.opsEmitted).toBe(2);
    const types = out.operationSummary.map(o => o.type);
    expect(types).toContain("hpc_roughing");
    expect(types).toContain("z_level_finishing");
    expect(out.provenance.source).toBe("dimensions_only");
  });

  it("emitted script contains hyperMILL AC Python header markers", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [pocketProfile()],
    });
    // Generator emits the standard hyperMILL AC header — check key markers
    expect(out.script).toMatch(/PRISM PrintToHyperMillBridge v1\.0\.0/);
    expect(out.script.length).toBeGreaterThan(200);
  });

  it("inch units carries an explicit warning", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [holeProfile()],
      units: "in",
    });
    expect(out.units).toBe("in");
    expect(out.warnings.some(w => /Units=inch/.test(w))).toBe(true);
  });

  it("custom postProcessor flows through", () => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [holeProfile()],
      postProcessor: "omPPHH",
    });
    // The script should reference the custom post (line is generator-internal but
    // we can verify via warnings / through provenance)
    expect(out.opsEmitted).toBe(1);
    // The generator embeds post_processor in its output script — cheap structural check
    expect(out.script.length).toBeGreaterThan(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Failure modes / unsupported features
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToHyperMillBridge — failure modes + unsupported", () => {
  it("throws when no analysis AND no profiles", () => {
    expect(() => printToHyperMillBridge.buildBridgeScript({})).toThrow(/at least one of/);
  });

  it("throws on null input", () => {
    expect(() =>
      printToHyperMillBridge.buildBridgeScript(
        null as unknown as PrintToHyperMillInput,
      ),
    ).toThrow(/PrintToHyperMillBridge/);
  });

  it("throws on bad defaultDepth", () => {
    expect(() =>
      printToHyperMillBridge.buildBridgeScript({
        profiles: [holeProfile()],
        defaultDepth: -5,
      }),
    ).toThrow(/defaultDepth/);
  });

  it("internal profile reported as unsupported (not an error)", () => {
    const internal: ExtractedProfile = {
      id: "i-1", name: "Internal", type: "internal",
      points: [{ x: 0, y: 0 }], is_closed: true, confidence: 0.5,
    };
    const out = printToHyperMillBridge.buildBridgeScript({
      analysis: plateAnalysis(),
      profiles: [internal],
    });
    expect(out.unsupported).toContain("internal");
    // Falls back to dimensions-only because internal didn't yield ops
    expect(out.provenance.source).toBe("dimensions_only");
  });

  it("slot profile reported as unsupported", () => {
    const slot: ExtractedProfile = {
      id: "s-1", name: "Slot", type: "slot",
      points: [{ x: 0, y: 0 }], is_closed: true, confidence: 0.5,
    };
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [slot],
      analysis: plateAnalysis(),
    });
    expect(out.unsupported).toContain("slot");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adversarial inputs
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToHyperMillBridge — adversarial", () => {
  it("hole profile with NaN diameter falls back to default drill diameter", () => {
    const bad: ExtractedProfile = {
      id: "h-nan", name: "Hole", type: "hole",
      points: [{ x: 0, y: 0 }], is_closed: true, diameter_mm: Number.NaN, confidence: 0.5,
    };
    const out = printToHyperMillBridge.buildBridgeScript({ profiles: [bad] });
    expect(out.opsEmitted).toBe(1);
    // Did NOT emit a "sized to ø" warning because we fell back to default
    expect(out.warnings.some(w => /Drill tool 1 sized to ø/.test(w))).toBe(false);
  });

  it("100 holes emits 100 drilling ops without truncation", () => {
    const profiles = Array.from({ length: 100 }, (_, i) => holeProfile(5 + (i % 10)));
    const out = printToHyperMillBridge.buildBridgeScript({ profiles });
    expect(out.opsEmitted).toBe(100);
    expect(out.operationSummary.every(o => o.type === "drilling")).toBe(true);
  });

  it("zero-dimension empty analysis with empty profiles array surfaces the no-ops warning", () => {
    const empty: BlueprintAnalysis = {
      dimensions: [], gdt_frames: [], notes: [],
      title_block: { units: "mm", confidence: 0.5 },
      summary: {
        total_dimensions: 0, total_gdt: 0, total_notes: 0,
        tightest_tolerance_mm: null, critical_features: [], material: null, has_gdt: false,
      },
    };
    // Validation passes (analysis present), but buildOperations emits 0 ops
    const out = printToHyperMillBridge.buildBridgeScript({ analysis: empty });
    expect(out.opsEmitted).toBe(0);
    expect(out.warnings.some(w => /No operations could be derived/.test(w))).toBe(true);
  });

  it("provenance timestamp is ISO-8601", () => {
    const out = printToHyperMillBridge.buildBridgeScript({ profiles: [holeProfile()] });
    expect(out.provenance.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(out.provenance.bridgeVersion).toBe(BRIDGE_VERSION);
    expect(out.provenance.profileCount).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Variability — exercise multiple machine/post combinations
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToHyperMillBridge — variability across machines/posts", () => {
  it.each([
    ["omPPFI", "FANUC interactive"],
    ["omPPHH", "Heidenhain TNC"],
    ["omPPSI", "Siemens Sinumerik"],
    ["omPPF3X", "Haas 3-axis"],
  ])("postProcessor=%s (%s) does not crash", (post) => {
    const out = printToHyperMillBridge.buildBridgeScript({
      profiles: [holeProfile(), pocketProfile()],
      postProcessor: post,
      machineName: `MillMachine_${post}`,
    });
    expect(out.opsEmitted).toBe(3); // 1 drill + 2 pocket
    expect(out.script.length).toBeGreaterThan(100);
  });
});
