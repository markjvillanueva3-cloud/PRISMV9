/**
 * U-P2PFS10: TribalEnrichmentCoordinatorEngine Tests
 * Verifies unified tribal+playbook+controller knowledge enrichment
 */
import { describe, it, expect } from "vitest";
import {
  TribalEnrichmentCoordinatorEngine,
  tribalEnrichmentCoordinatorEngine,
  type EnrichmentInput,
  type EnrichmentResult,
  type ProcessType,
  type ControllerType,
  type SimpleTip,
  type SimpleRule,
} from "../engines/TribalEnrichmentCoordinatorEngine.js";

describe("TribalEnrichmentCoordinatorEngine (U-P2PFS10)", () => {
  describe("enrich()", () => {
    it("returns enrichment result for wire_edm process", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        material: "D2",
        controller: "mitsubishi",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      expect(result).toHaveProperty("tribal_tips");
      expect(result).toHaveProperty("playbook_rules");
      expect(result).toHaveProperty("controller_tips");
      expect(result).toHaveProperty("merged_advisory");
      expect(result).toHaveProperty("knowledge_sources");

      expect(Array.isArray(result.tribal_tips)).toBe(true);
      expect(Array.isArray(result.playbook_rules)).toBe(true);
      expect(Array.isArray(result.controller_tips)).toBe(true);
      expect(typeof result.merged_advisory).toBe("string");
    });

    it("returns tribal tips with required fields", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        material: "D2",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      if (result.tribal_tips.length > 0) {
        const tip = result.tribal_tips[0];
        expect(tip).toHaveProperty("id");
        expect(tip).toHaveProperty("title");
        expect(tip).toHaveProperty("body");
        expect(tip).toHaveProperty("confidence");
        expect(typeof tip.id).toBe("string");
        expect(typeof tip.title).toBe("string");
        expect(typeof tip.body).toBe("string");
        expect(typeof tip.confidence).toBe("number");
      }
    });

    it("returns playbook rules with required fields", async () => {
      const input: EnrichmentInput = {
        process_type: "milling",
        material: "aluminum",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      if (result.playbook_rules.length > 0) {
        const rule = result.playbook_rules[0];
        expect(rule).toHaveProperty("id");
        expect(rule).toHaveProperty("title");
        expect(rule).toHaveProperty("severity");
        expect(rule).toHaveProperty("rule");
      }
    });

    it("returns controller tips for specified controller", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        controller: "fanuc",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      expect(result.controller_tips.length).toBeGreaterThan(0);
      const tip = result.controller_tips[0];
      expect(tip).toHaveProperty("id");
      expect(tip).toHaveProperty("title");
      expect(tip).toHaveProperty("body");
    });

    it("returns empty controller tips when no controller specified", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        material: "D2",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      expect(result.controller_tips).toEqual([]);
    });

    it("builds merged advisory with process info", async () => {
      const input: EnrichmentInput = {
        process_type: "turning",
        material: "4140",
        controller: "okuma",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      expect(result.merged_advisory).toContain("TURNING");
      expect(result.merged_advisory).toContain("4140");
      expect(result.merged_advisory).toContain("okuma");
    });

    it("tracks knowledge sources in result", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        material: "D2",
        controller: "sodick",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      expect(Array.isArray(result.knowledge_sources)).toBe(true);
      for (const source of result.knowledge_sources) {
        expect(source).toHaveProperty("source");
        expect(source).toHaveProperty("type");
        expect(source).toHaveProperty("count");
      }
    });

    it("limits tips to 5 per category", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        material: "D2",
        controller: "fanuc",
      };

      const result = await tribalEnrichmentCoordinatorEngine.enrich(input);

      expect(result.tribal_tips.length).toBeLessThanOrEqual(5);
      expect(result.playbook_rules.length).toBeLessThanOrEqual(5);
      expect(result.controller_tips.length).toBeLessThanOrEqual(5);
    });
  });

  describe("hasKnowledge()", () => {
    it("returns true when knowledge exists", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        controller: "fanuc",
      };

      const has = await tribalEnrichmentCoordinatorEngine.hasKnowledge(input);
      expect(has).toBe(true);
    });

    it("handles configurations with no matches gracefully", async () => {
      const input: EnrichmentInput = {
        process_type: "grinding",
      };

      const has = await tribalEnrichmentCoordinatorEngine.hasKnowledge(input);
      expect(typeof has).toBe("boolean");
    });
  });

  describe("getTribalOnly()", () => {
    it("returns only tribal tips", async () => {
      const input: EnrichmentInput = {
        process_type: "wire_edm",
        material: "D2",
      };

      const tips = await tribalEnrichmentCoordinatorEngine.getTribalOnly(input);

      expect(Array.isArray(tips)).toBe(true);
      if (tips.length > 0) {
        expect(tips[0]).toHaveProperty("id");
        expect(tips[0]).toHaveProperty("title");
      }
    });
  });

  describe("getPlaybookOnly()", () => {
    it("returns only playbook rules", async () => {
      const input: EnrichmentInput = {
        process_type: "milling",
      };

      const rules = await tribalEnrichmentCoordinatorEngine.getPlaybookOnly(input);

      expect(Array.isArray(rules)).toBe(true);
      if (rules.length > 0) {
        expect(rules[0]).toHaveProperty("id");
        expect(rules[0]).toHaveProperty("rule");
      }
    });
  });

  describe("getControllerOnly()", () => {
    it("returns controller tips for specified controller", async () => {
      const tips = await tribalEnrichmentCoordinatorEngine.getControllerOnly("mitsubishi");

      expect(Array.isArray(tips)).toBe(true);
      expect(tips.length).toBeGreaterThan(0);
      expect(tips[0]).toHaveProperty("title");
    });

    it("returns tips for various controller types", async () => {
      const controllers = ["fanuc", "sodick", "makino", "okuma", "haas"] as const;

      for (const controller of controllers) {
        const tips = await tribalEnrichmentCoordinatorEngine.getControllerOnly(controller);
        expect(Array.isArray(tips)).toBe(true);
      }
    });
  });
});

// ============================================================================
// U-WIRE-TRIBAL-ENRICH additions — algebraic invariants + full coverage
// ============================================================================
// The original U-P2PFS10 tests above (14 it() cases) exercise each public
// method end-to-end. The blocks below cover the gaps a dispatcher wire needs:
//   - construction + singleton identity
//   - algebraic invariants that must hold for ANY input (knowledge_sources ↔
//     non-empty arrays, hasKnowledge ↔ enrich, getXOnly ↔ enrich slice)
//   - parametrized coverage of all 6 ProcessTypes and all 9 ControllerTypes
//   - merged_advisory deterministic content (header, Process/Material/Controller
//     lines, "No relevant knowledge found" sentinel)
//   - determinism + result-mutation isolation
//   - optional-field tolerance (thickness/tolerance/Ra/hardness/is_thin_wall)
// Together with the U-P2PFS10 block above this clears the recipe's ≥30 floor
// and pins down the coordinator-vs-direct-fetch contract a future refactor
// could silently break.

const ALL_PROCESS_TYPES: ProcessType[] = [
  "wire_edm", "sinker_edm", "milling", "turning", "grinding", "multi_axis",
];
const ALL_CONTROLLERS: ControllerType[] = [
  "fanuc", "sodick", "makino", "mitsubishi", "agiecharmilles",
  "siemens", "haas", "okuma", "mazak",
];

function assertSimpleTipShape(tip: SimpleTip): void {
  expect(typeof tip.id).toBe("string");
  expect(typeof tip.title).toBe("string");
  expect(typeof tip.body).toBe("string");
  expect(typeof tip.confidence).toBe("number");
  expect(Number.isFinite(tip.confidence)).toBe(true);
}

function assertSimpleRuleShape(rule: SimpleRule): void {
  expect(typeof rule.id).toBe("string");
  expect(typeof rule.title).toBe("string");
  expect(typeof rule.severity).toBe("string");
  expect(typeof rule.rule).toBe("string");
}

function assertEnrichmentResultShape(r: EnrichmentResult): void {
  expect(Array.isArray(r.tribal_tips)).toBe(true);
  expect(Array.isArray(r.playbook_rules)).toBe(true);
  expect(Array.isArray(r.controller_tips)).toBe(true);
  expect(typeof r.merged_advisory).toBe("string");
  expect(Array.isArray(r.knowledge_sources)).toBe(true);
  for (const t of r.tribal_tips) assertSimpleTipShape(t);
  for (const t of r.controller_tips) assertSimpleTipShape(t);
  for (const rule of r.playbook_rules) assertSimpleRuleShape(rule);
}

describe("TribalEnrichmentCoordinatorEngine — construction + singleton", () => {
  it("constructs a fresh instance via the exported class", () => {
    const e = new TribalEnrichmentCoordinatorEngine();
    expect(e).toBeInstanceOf(TribalEnrichmentCoordinatorEngine);
  });

  it("exports a singleton of the right type", () => {
    expect(tribalEnrichmentCoordinatorEngine).toBeInstanceOf(TribalEnrichmentCoordinatorEngine);
  });

  it("exposes the 5 documented public methods on the singleton", () => {
    expect(typeof tribalEnrichmentCoordinatorEngine.enrich).toBe("function");
    expect(typeof tribalEnrichmentCoordinatorEngine.hasKnowledge).toBe("function");
    expect(typeof tribalEnrichmentCoordinatorEngine.getTribalOnly).toBe("function");
    expect(typeof tribalEnrichmentCoordinatorEngine.getPlaybookOnly).toBe("function");
    expect(typeof tribalEnrichmentCoordinatorEngine.getControllerOnly).toBe("function");
  });

  it("a fresh instance and the singleton produce deeply-equal results for the same input", async () => {
    const input: EnrichmentInput = { process_type: "milling", material: "4140 steel" };
    const fromInstance = await new TribalEnrichmentCoordinatorEngine().enrich(input);
    const fromSingleton = await tribalEnrichmentCoordinatorEngine.enrich(input);
    expect(fromInstance).toEqual(fromSingleton);
  });
});

describe("TribalEnrichmentCoordinatorEngine — coverage across all enum values", () => {
  it.each(ALL_PROCESS_TYPES)(
    "produces a structurally valid enrich() result for process_type=%s",
    async (process_type) => {
      const r = await tribalEnrichmentCoordinatorEngine.enrich({ process_type });
      assertEnrichmentResultShape(r);
      expect(r.merged_advisory).toContain(`Process: ${process_type.toUpperCase()}`);
    },
  );

  it.each(ALL_CONTROLLERS)(
    "accepts controller=%s and returns well-formed controller_tips",
    async (controller) => {
      const r = await tribalEnrichmentCoordinatorEngine.enrich({
        process_type: "wire_edm",
        controller,
      });
      expect(Array.isArray(r.controller_tips)).toBe(true);
      for (const t of r.controller_tips) assertSimpleTipShape(t);
    },
  );

  it.each(ALL_CONTROLLERS)(
    "getControllerOnly(%s) returns a well-formed SimpleTip array",
    async (controller) => {
      const tips = await tribalEnrichmentCoordinatorEngine.getControllerOnly(controller);
      expect(Array.isArray(tips)).toBe(true);
      for (const t of tips) assertSimpleTipShape(t);
    },
  );
});

describe("TribalEnrichmentCoordinatorEngine — algebraic invariants", () => {
  it("knowledge_sources.length equals the count of non-empty result arrays", async () => {
    for (const process_type of ALL_PROCESS_TYPES) {
      const r = await tribalEnrichmentCoordinatorEngine.enrich({
        process_type,
        material: "stainless 316",
        controller: "fanuc",
      });
      const nonEmpty =
        (r.tribal_tips.length > 0 ? 1 : 0) +
        (r.playbook_rules.length > 0 ? 1 : 0) +
        (r.controller_tips.length > 0 ? 1 : 0);
      expect(r.knowledge_sources.length).toBe(nonEmpty);
    }
  });

  it("each knowledge_sources entry has a positive count tied to its backing array", async () => {
    const r = await tribalEnrichmentCoordinatorEngine.enrich({
      process_type: "turning",
      material: "1018 steel",
      controller: "okuma",
    });
    const bySource = new Map(r.knowledge_sources.map((s) => [s.source, s.count]));
    for (const src of r.knowledge_sources) {
      expect(src.count).toBeGreaterThan(0);
    }
    if (r.tribal_tips.length > 0) {
      expect(bySource.get("Tribal Knowledge Database")).toBe(r.tribal_tips.length);
    }
    if (r.playbook_rules.length > 0) {
      expect(bySource.get("Machining Playbook")).toBe(r.playbook_rules.length);
    }
    if (r.controller_tips.length > 0) {
      expect(bySource.get("Controller Knowledge")).toBe(r.controller_tips.length);
    }
  });

  it("(knowledge_sources empty) iff merged_advisory says 'No relevant knowledge found'", async () => {
    for (const process_type of ALL_PROCESS_TYPES) {
      const r = await tribalEnrichmentCoordinatorEngine.enrich({ process_type });
      const saysNone = r.merged_advisory.includes("No relevant knowledge found");
      expect(saysNone).toBe(r.knowledge_sources.length === 0);
    }
  });

  it("merged_advisory always carries the advisory header banner", async () => {
    const r = await tribalEnrichmentCoordinatorEngine.enrich({ process_type: "grinding" });
    expect(r.merged_advisory).toContain("=== TRIBAL ENRICHMENT ADVISORY ===");
  });

  it("does not push a Controller Knowledge source when no controller is supplied", async () => {
    const r = await tribalEnrichmentCoordinatorEngine.enrich({ process_type: "milling" });
    expect(r.knowledge_sources.some((s) => s.source === "Controller Knowledge")).toBe(false);
  });

  it("hasKnowledge agrees with enrich: true iff any result array is non-empty", async () => {
    for (const process_type of ALL_PROCESS_TYPES) {
      const input: EnrichmentInput = { process_type, material: "tool steel", controller: "fanuc" };
      const r = await tribalEnrichmentCoordinatorEngine.enrich(input);
      const expected =
        r.tribal_tips.length > 0 ||
        r.playbook_rules.length > 0 ||
        r.controller_tips.length > 0;
      const has = await tribalEnrichmentCoordinatorEngine.hasKnowledge(input);
      expect(has).toBe(expected);
    }
  });

  it("getTribalOnly equals enrich().tribal_tips for the same input", async () => {
    const input: EnrichmentInput = { process_type: "turning", material: "4340 steel" };
    const only = await tribalEnrichmentCoordinatorEngine.getTribalOnly(input);
    const full = await tribalEnrichmentCoordinatorEngine.enrich(input);
    expect(only).toEqual(full.tribal_tips);
  });

  it("getPlaybookOnly equals enrich().playbook_rules for the same input", async () => {
    const input: EnrichmentInput = {
      process_type: "milling",
      material: "6061-T6",
      thickness_mm: 3,
      is_thin_wall: true,
    };
    const only = await tribalEnrichmentCoordinatorEngine.getPlaybookOnly(input);
    const full = await tribalEnrichmentCoordinatorEngine.enrich(input);
    expect(only).toEqual(full.playbook_rules);
  });

  it("getControllerOnly equals enrich().controller_tips for the same controller", async () => {
    const only = await tribalEnrichmentCoordinatorEngine.getControllerOnly("fanuc");
    const full = await tribalEnrichmentCoordinatorEngine.enrich({
      process_type: "wire_edm",
      controller: "fanuc",
    });
    expect(only).toEqual(full.controller_tips);
  });
});

describe("TribalEnrichmentCoordinatorEngine — merged_advisory field gating", () => {
  it("includes the Material line when a material is supplied", async () => {
    const r = await tribalEnrichmentCoordinatorEngine.enrich({
      process_type: "milling",
      material: "D2 tool steel",
    });
    expect(r.merged_advisory).toContain("Material: D2 tool steel");
  });

  it("omits the Material line when no material is supplied", async () => {
    const r = await tribalEnrichmentCoordinatorEngine.enrich({ process_type: "milling" });
    expect(r.merged_advisory).not.toContain("Material:");
  });

  it("includes the Controller line when a controller is supplied", async () => {
    const r = await tribalEnrichmentCoordinatorEngine.enrich({
      process_type: "wire_edm",
      controller: "sodick",
    });
    expect(r.merged_advisory).toContain("Controller: sodick");
  });

  it("omits the Controller line when no controller is supplied", async () => {
    const r = await tribalEnrichmentCoordinatorEngine.enrich({ process_type: "wire_edm" });
    expect(r.merged_advisory).not.toContain("Controller:");
  });
});

describe("TribalEnrichmentCoordinatorEngine — determinism + isolation", () => {
  it("two enrich() calls with the same input produce deeply-equal results", async () => {
    const input: EnrichmentInput = {
      process_type: "sinker_edm",
      material: "graphite",
      controller: "makino",
    };
    const a = await tribalEnrichmentCoordinatorEngine.enrich(input);
    const b = await tribalEnrichmentCoordinatorEngine.enrich(input);
    expect(a).toEqual(b);
  });

  it("mutating one result's arrays does not affect a later call", async () => {
    const input: EnrichmentInput = { process_type: "milling", material: "brass" };
    const first = await tribalEnrichmentCoordinatorEngine.enrich(input);
    first.tribal_tips.push({ id: "x", title: "x", body: "x", confidence: 1 });
    first.playbook_rules.length = 0;
    const second = await tribalEnrichmentCoordinatorEngine.enrich(input);
    const nonEmpty =
      (second.tribal_tips.length > 0 ? 1 : 0) +
      (second.playbook_rules.length > 0 ? 1 : 0) +
      (second.controller_tips.length > 0 ? 1 : 0);
    expect(second.knowledge_sources.length).toBe(nonEmpty);
  });

  it("tribal + playbook results are identical across controller changes (controller-independent)", async () => {
    const base: EnrichmentInput = { process_type: "wire_edm", material: "tungsten carbide" };
    const a = await tribalEnrichmentCoordinatorEngine.enrich({ ...base, controller: "fanuc" });
    const b = await tribalEnrichmentCoordinatorEngine.enrich({ ...base, controller: "sodick" });
    expect(a.tribal_tips).toEqual(b.tribal_tips);
    expect(a.playbook_rules).toEqual(b.playbook_rules);
  });
});

describe("TribalEnrichmentCoordinatorEngine — optional-field tolerance", () => {
  it("accepts thickness_mm / tolerance_mm / surface_finish_Ra_um without error", async () => {
    const r = await tribalEnrichmentCoordinatorEngine.enrich({
      process_type: "grinding",
      thickness_mm: 8,
      tolerance_mm: 0.005,
      surface_finish_Ra_um: 0.2,
    });
    assertEnrichmentResultShape(r);
  });

  it("accepts hardness_hrc and is_thin_wall without error", async () => {
    const r = await tribalEnrichmentCoordinatorEngine.enrich({
      process_type: "turning",
      hardness_hrc: 58,
      is_thin_wall: false,
    });
    assertEnrichmentResultShape(r);
  });

  it("never throws with a fully-populated input", async () => {
    const input: EnrichmentInput = {
      process_type: "turning",
      material: "Inconel 718",
      controller: "fanuc",
      thickness_mm: 12.5,
      tolerance_mm: 0.01,
      surface_finish_Ra_um: 0.8,
      is_thin_wall: true,
      hardness_hrc: 44,
    };
    const r = await tribalEnrichmentCoordinatorEngine.enrich(input);
    assertEnrichmentResultShape(r);
  });
});
