/**
 * LEARN-MS2-S1: Knowledge Graph Enrichment + Cross-Reference Tests
 *
 * Tests:
 * - KnowledgePhysicsValidatorEngine (physics validation, parameter extraction)
 * - ManufacturingKnowledgeGraphEngine (auto-linking, knowledge gap detection)
 * - ContentIngestionPipelineEngine (autoLink integration)
 * - Dispatcher wiring verification (3 new actions)
 */

import { describe, it, expect } from "vitest";
import { knowledgePhysicsValidatorEngine } from "../engines/KnowledgePhysicsValidatorEngine.js";
import { manufacturingKnowledgeGraphEngine } from "../engines/ManufacturingKnowledgeGraphEngine.js";
import { contentIngestionPipelineEngine } from "../engines/ContentIngestionPipelineEngine.js";

// ═══ KnowledgePhysicsValidatorEngine ═══

describe("LEARN-MS2: KnowledgePhysicsValidatorEngine", () => {

  describe("extractParams()", () => {

    it("extracts RPM from text", () => {
      const params = knowledgePhysicsValidatorEngine.extractParams("Run at 10000 RPM with carbide endmill");
      expect(params.rpm).toBe(10000);
    });

    it("extracts SFM from text", () => {
      const params = knowledgePhysicsValidatorEngine.extractParams("Aluminum at 800 SFM");
      expect(params.sfm).toBe(800);
    });

    it("extracts chipload in IPT", () => {
      const params = knowledgePhysicsValidatorEngine.extractParams("chipload 0.003 IPT for finishing");
      expect(params.chipload_ipt).toBe(0.003);
    });

    it("extracts chipload in mm", () => {
      const params = knowledgePhysicsValidatorEngine.extractParams("fz: 0.08 mm/tooth for roughing");
      expect(params.chipload_mm).toBe(0.08);
    });

    it("extracts depth of cut", () => {
      const params = knowledgePhysicsValidatorEngine.extractParams("depth of cut: 3.5 mm with 10mm endmill");
      expect(params.doc_mm).toBe(3.5);
      expect(params.tool_diameter_mm).toBe(10);
    });

    it("extracts feed rate mm/min", () => {
      const params = knowledgePhysicsValidatorEngine.extractParams("feed rate 1200 mm/min");
      expect(params.feed_mm_min).toBe(1200);
    });

    it("extracts flute count", () => {
      const params = knowledgePhysicsValidatorEngine.extractParams("Use a 3 flute carbide endmill");
      expect(params.flute_count).toBe(3);
    });

    it("handles text with no machining params", () => {
      const params = knowledgePhysicsValidatorEngine.extractParams("General machining tip: use coolant");
      expect(Object.keys(params).length).toBe(0);
    });
  });

  describe("resolveMaterial()", () => {

    it("resolves ISO group hint directly", () => {
      const ctx = knowledgePhysicsValidatorEngine.resolveMaterial("some text", "P");
      expect(ctx).not.toBeNull();
      expect(ctx!.iso_group).toBe("P");
      expect(ctx!.kc1_1).toBe(1800);
    });

    it("resolves aluminum from text", () => {
      const ctx = knowledgePhysicsValidatorEngine.resolveMaterial("Machining 7075 aluminum at high speed");
      expect(ctx).not.toBeNull();
      expect(ctx!.iso_group).toBe("N");
    });

    it("resolves stainless from text", () => {
      const ctx = knowledgePhysicsValidatorEngine.resolveMaterial("316 stainless steel turning tips");
      expect(ctx).not.toBeNull();
      expect(ctx!.iso_group).toBe("M");
    });

    it("resolves titanium as superalloy", () => {
      const ctx = knowledgePhysicsValidatorEngine.resolveMaterial("Ti-6Al-4V aerospace part");
      expect(ctx).not.toBeNull();
      expect(ctx!.iso_group).toBe("S");
    });

    it("returns null for unrecognizable material", () => {
      const ctx = knowledgePhysicsValidatorEngine.resolveMaterial("General workshop safety");
      expect(ctx).toBeNull();
    });
  });

  describe("validate()", () => {

    it("validates reasonable steel parameters as valid", () => {
      const result = knowledgePhysicsValidatorEngine.validate(
        "Milling 4140 steel at 8000 RPM with 10mm endmill, chipload 0.08 mm/tooth, depth of cut: 3 mm"
      );
      // Vc = π*10*8000/1000 = 251 m/min — within P range (80-450)
      expect(result.extracted_params.rpm).toBe(8000);
      expect(result.material_context).not.toBeNull();
      expect(result.material_context!.iso_group).toBe("P");
      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.checks.find(c => c.check_type === "cutting_speed")?.passed).toBe(true);
    });

    it("flags unreasonable cutting speed for superalloy", () => {
      const result = knowledgePhysicsValidatorEngine.validate(
        "Machining Inconel 718 at 15000 RPM with 10mm endmill"
      );
      // Vc = π*10*15000/1000 = 471 m/min — way above S range (15-120)
      expect(result.material_context!.iso_group).toBe("S");
      const speedCheck = result.checks.find(c => c.check_type === "cutting_speed");
      expect(speedCheck).toBeTruthy();
      expect(speedCheck!.passed).toBe(false);
      expect(result.is_valid).toBe(false);
    });

    it("links to Kienzle formula when force is calculable", () => {
      const result = knowledgePhysicsValidatorEngine.validate(
        "Milling steel at 8000 RPM with 10mm endmill, fz: 0.1 mm/tooth, depth of cut: 2 mm"
      );
      const kienzleLink = result.formula_links.find(f => f.formula.includes("Kienzle"));
      expect(kienzleLink).toBeTruthy();
      expect(kienzleLink!.constants_used["kc1.1"]).toBe(1800); // ISO P canonical value
    });

    it("links to Taylor tool life formula", () => {
      const result = knowledgePhysicsValidatorEngine.validate(
        "Aluminum at 12000 RPM with 10mm endmill"
      );
      const taylorLink = result.formula_links.find(f => f.formula.includes("Taylor"));
      expect(taylorLink).toBeTruthy();
      expect(taylorLink!.constants_used.C).toBe(900); // ISO N canonical value
    });

    it("warns about very short tool life", () => {
      const result = knowledgePhysicsValidatorEngine.validate(
        "Hardened steel at 20000 RPM with 10mm endmill"
      );
      // Vc = π*10*20000/1000 = 628 m/min — extreme for H group
      expect(result.warnings.some(w => w.includes("tool life"))).toBe(true);
    });

    it("returns neutral confidence when no params extractable", () => {
      const result = knowledgePhysicsValidatorEngine.validate(
        "Use coolant when machining stainless"
      );
      expect(result.checks.length).toBe(0);
      expect(result.confidence).toBe(50);
      expect(result.is_valid).toBe(true); // No failed checks = valid
    });

    it("validates with explicit ISO group hint", () => {
      const result = knowledgePhysicsValidatorEngine.validate(
        "Run at 5000 RPM with 10mm endmill",
        "N" // aluminum
      );
      expect(result.material_context!.iso_group).toBe("N");
    });

    it("computes cutting force from chipload + DOC", () => {
      const result = knowledgePhysicsValidatorEngine.validate(
        "Steel milling: fz: 0.1 mm/tooth, depth of cut: 5 mm"
      );
      const forceCheck = result.checks.find(c => c.check_type === "cutting_force");
      expect(forceCheck).toBeTruthy();
      expect(forceCheck!.extracted_value).toBeGreaterThan(0);
    });
  });

  describe("validateBatch()", () => {

    it("validates multiple tips and provides summary", () => {
      const result = knowledgePhysicsValidatorEngine.validateBatch([
        "Milling 4140 steel at 8000 RPM with 10mm endmill",
        "Inconel 718 at 15000 RPM with 10mm endmill",
        "Use coolant when machining",
      ]);
      expect(result.summary.total).toBe(3);
      expect(result.results.length).toBe(3);
      expect(result.summary.valid + result.summary.invalid + result.summary.unverifiable).toBe(3);
    });
  });
});

// ═══ ManufacturingKnowledgeGraphEngine — Auto-Linking ═══

describe("LEARN-MS2: ManufacturingKnowledgeGraphEngine linkTip()", () => {

  it("links a tip with material tags to graph", () => {
    const result = manufacturingKnowledgeGraphEngine.linkTip(
      "test-tip-001",
      "When machining aluminum 7075, use 3-flute carbide endmill at high speed",
      ["material:N", "operation:milling", "tool:endmill_carbide"],
      "test/unit",
    );
    expect(result.node_id).toBe("tip_test-tip-001");
    expect(result.edges_created).toBeGreaterThan(0);
    expect(result.linked_materials.length).toBeGreaterThan(0);
  });

  it("links operations from tags", () => {
    const result = manufacturingKnowledgeGraphEngine.linkTip(
      "test-tip-002",
      "Drilling stainless steel requires flood coolant",
      ["material:M", "operation:drilling"],
      "test/unit",
    );
    expect(result.linked_operations.length).toBeGreaterThanOrEqual(1);
  });

  it("detects material from NL keywords even without tags", () => {
    const result = manufacturingKnowledgeGraphEngine.linkTip(
      "test-tip-003",
      "Titanium machining requires slow cutting speeds and rigid setup",
      [],
      "test/unit",
    );
    expect(result.linked_materials.length).toBeGreaterThan(0);
    // Should resolve titanium → ISO S (Superalloy)
    expect(result.linked_materials.some(m => m.includes("Superalloy") || m.includes("Titanium"))).toBe(true);
  });

  it("creates edges with correct metadata", () => {
    const result = manufacturingKnowledgeGraphEngine.linkTip(
      "test-tip-004",
      "Cast iron face milling with ceramic insert",
      ["material:K"],
      "Facebook/mr.cnc2",
    );
    expect(result.edges_created).toBeGreaterThan(0);
    expect(result.linked_materials.length).toBeGreaterThan(0);
  });

  it("returns empty arrays for unrecognizable content", () => {
    const result = manufacturingKnowledgeGraphEngine.linkTip(
      "test-tip-005",
      "General workshop safety protocol for new employees",
      [],
      "test/unit",
    );
    // Still creates the node, but may have few/no edges
    expect(result.node_id).toBe("tip_test-tip-005");
  });
});

// ═══ ManufacturingKnowledgeGraphEngine — Knowledge Gap Detection ═══

describe("LEARN-MS2: ManufacturingKnowledgeGraphEngine detectKnowledgeGaps()", () => {

  it("returns gap items with material + operation info", () => {
    const result = manufacturingKnowledgeGraphEngine.detectKnowledgeGaps(3, 10);
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.gaps[0]).toHaveProperty("material");
    expect(result.gaps[0]).toHaveProperty("operation");
    expect(result.gaps[0]).toHaveProperty("priority");
    expect(result.gaps[0]).toHaveProperty("description");
  });

  it("returns coverage by material", () => {
    const result = manufacturingKnowledgeGraphEngine.detectKnowledgeGaps();
    expect(result.coverage_by_material).toBeDefined();
    expect(Object.keys(result.coverage_by_material).length).toBeGreaterThan(0);
    // Each material should have tip_count and operation_coverage
    const firstKey = Object.keys(result.coverage_by_material)[0];
    expect(result.coverage_by_material[firstKey]).toHaveProperty("tip_count");
    expect(result.coverage_by_material[firstKey]).toHaveProperty("operation_coverage");
  });

  it("provides most_needed list", () => {
    const result = manufacturingKnowledgeGraphEngine.detectKnowledgeGaps(3, 50);
    expect(result.most_needed.length).toBeGreaterThan(0);
    expect(result.most_needed.length).toBeLessThanOrEqual(5);
    // Each should be "Material + Operation" format
    expect(result.most_needed[0]).toContain("+");
  });

  it("reports total_gaps count", () => {
    const result = manufacturingKnowledgeGraphEngine.detectKnowledgeGaps(3, 5);
    expect(result.total_gaps).toBeGreaterThanOrEqual(result.gaps.length);
  });

  it("respects minTips parameter", () => {
    const result1 = manufacturingKnowledgeGraphEngine.detectKnowledgeGaps(1, 100);
    const result100 = manufacturingKnowledgeGraphEngine.detectKnowledgeGaps(100, 100);
    // Higher minTips should produce more gaps
    expect(result100.total_gaps).toBeGreaterThanOrEqual(result1.total_gaps);
  });

  it("gaps are sorted by priority descending", () => {
    const result = manufacturingKnowledgeGraphEngine.detectKnowledgeGaps(3, 20);
    for (let i = 1; i < result.gaps.length; i++) {
      expect(result.gaps[i - 1].priority).toBeGreaterThanOrEqual(result.gaps[i].priority);
    }
  });
});

// ═══ ContentIngestionPipelineEngine — autoLink() ═══

describe("LEARN-MS2: ContentIngestionPipelineEngine autoLink()", () => {

  it("auto-links a tip with material and operation tags", () => {
    const result = contentIngestionPipelineEngine.autoLink(
      "autolink-001",
      "Milling 7075 aluminum at 10000 RPM with 3-flute carbide endmill",
      ["material:N", "operation:milling"],
      "test/autolink",
    );
    expect(result.success).toBe(true);
    expect(result.tip_id).toBe("autolink-001");
    expect(result.edges_created).toBeGreaterThan(0);
    expect(result.linked_materials.length).toBeGreaterThan(0);
  });

  it("returns success=true even with empty tags", () => {
    const result = contentIngestionPipelineEngine.autoLink(
      "autolink-002",
      "General machining advice for beginners",
      [],
      "test/autolink",
    );
    expect(result.success).toBe(true);
    expect(result.tip_id).toBe("autolink-002");
  });
});

// ═══ Dispatcher Wiring Verification ═══

describe("LEARN-MS2: Dispatcher wiring verification", () => {

  it("schema map has all 3 new MS2 actions", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");

    const newActions = ["learn_auto_link", "learn_gap_detect", "learn_validate_physics"];
    for (const action of newActions) {
      expect(ACTION_KNOWLEDGE_SCHEMAS[action]).toBeTruthy();
    }
  });

  it("learn_validate_physics schema validates iso_group enum", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const schema = ACTION_KNOWLEDGE_SCHEMAS["learn_validate_physics"];

    const valid = schema.safeParse({ text: "Milling steel at 8000 RPM", iso_group: "P" });
    expect(valid.success).toBe(true);

    const invalidGroup = schema.safeParse({ text: "test", iso_group: "Z" });
    expect(invalidGroup.success).toBe(false);
  });

  it("learn_auto_link schema requires tip_id and text", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const schema = ACTION_KNOWLEDGE_SCHEMAS["learn_auto_link"];

    const valid = schema.safeParse({ tip_id: "abc", text: "Milling aluminum" });
    expect(valid.success).toBe(true);

    const missingTipId = schema.safeParse({ text: "Milling aluminum" });
    expect(missingTipId.success).toBe(false);
  });

  it("total knowledge schema count >= 37 (anti-regression)", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const count = Object.keys(ACTION_KNOWLEDGE_SCHEMAS).length;
    expect(count).toBeGreaterThanOrEqual(37);
  });

  it("MS1 actions still present (anti-regression)", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const ms1Actions = [
      "learn_video_process", "learn_video_transcript", "learn_video_keyframes", "learn_video_knowledge",
      "learn_session_create", "learn_session_submit", "learn_session_clarify", "learn_session_summary",
      "learn_url_extract", "learn_url_detect", "learn_social_parse", "learn_social_batch",
    ];
    for (const action of ms1Actions) {
      expect(ACTION_KNOWLEDGE_SCHEMAS[action]).toBeTruthy();
    }
  });
});
