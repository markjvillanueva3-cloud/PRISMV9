/**
 * Tests for SFCProvenanceWireEngine — U-PPG-SFC-03
 *
 * Coverage axes:
 *   • Happy path: full payload with ISO group, Kienzle, Taylor → provenance generated
 *   • Formula-only: no adapter, no RAG → fps_source="formula"
 *   • Adapter-based: adapter_id + residual → fps_source="adapter"
 *   • RAG-augmented: rag_hits → fps_source="rag"
 *   • Hybrid: adapter + RAG → fps_source="hybrid"
 *   • Missing ISO group: unknown material → null sources, still generates provenance
 *   • Overrides: kc11_override, taylor_override → operator citations
 *   • Validation: validate() catches missing fields, audit hash mismatch
 *   • Summarize: human-readable output
 *   • ISO group coverage: P (steel), M (stainless), K (cast iron), N (aluminum), S (superalloy), H (hardened)
 *   • Audit hash: hash changes when provenance changes
 *
 * @module __tests__/engines/sfcProvenanceWireEngine.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  SFCProvenanceWireEngine,
} from "../../engines/SFCProvenanceWireEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../../physics/constants.js";
import type { SFCProvenanceWireInput } from "../../schemas/sfcProvenanceSchema.js";

describe("SFCProvenanceWireEngine.cite — happy path", () => {
  it("generates full provenance for P-group steel with formula source", () => {
    const input: SFCProvenanceWireInput = {
      engine: "UltimateSpeedFeedEngine",
      action: "calculate",
      material: "4140",
      iso_group: "P",
      operation: "milling",
      machine_id: "haas-vf4",
      recommended: { sfm: 450, rpm: 4500, fpt: 0.004, doc: 1.5 },
    };

    const result = SFCProvenanceWireEngine.cite(input);

    expect(result.ok).toBe(true);
    expect(result.provenance.recommendation_id).toMatch(/^sfc-/);
    expect(result.provenance.engine).toBe("UltimateSpeedFeedEngine");
    expect(result.provenance.fps_source).toBe("formula");

    // Kienzle source - concrete value checks
    expect(result.provenance.kc11_source).not.toBeNull();
    expect(result.provenance.kc11_source!.group).toBe("P");
    expect(result.provenance.kc11_source!.kc1_1).toBe(1800);
    expect(result.provenance.kc11_source!.mc).toBe(0.25);
    expect(result.provenance.kc11_source!.ref).toBe("constants.ts:CANONICAL_KIENZLE[P]");

    // Taylor source - concrete value checks
    expect(result.provenance.taylor_source).not.toBeNull();
    expect(result.provenance.taylor_source!.group).toBe("P");
    expect(result.provenance.taylor_source!.C).toBe(350);
    expect(result.provenance.taylor_source!.n).toBe(0.25);

    // Citations - must have at least Kienzle + Taylor
    expect(result.provenance.citations.length).toBeGreaterThanOrEqual(2);
    const kienzleCitation = result.provenance.citations.find(c => c.source_id.includes("KIENZLE"));
    expect(kienzleCitation).not.toBeNull();
    expect(kienzleCitation!.source_type).toBe("constant");
    expect(kienzleCitation!.confidence).toBe(1.0);
    expect(kienzleCitation!.corpus).toBe("physics/constants.ts");

    // Audit hash - 16 hex chars
    expect(result.provenance.audit_hash).toMatch(/^[a-f0-9]{16}$/);

    // Reasoning trace includes ISO group
    expect(result.provenance.reasoning_trace).toContain("ISO group P");
    expect(result.provenance.reasoning_trace).toContain("formula");
  });

  it("generates unique recommendation IDs for each call", () => {
    const input: SFCProvenanceWireInput = {
      engine: "SFCCalculateEngine",
      iso_group: "N",
      recommended: { rpm: 8000 },
    };

    const results = Array.from({ length: 10 }, () => SFCProvenanceWireEngine.cite(input));
    const ids = results.map(r => r.provenance.recommendation_id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(10);
    expect(ids.every(id => id.startsWith("sfc-"))).toBe(true);
  });
});

describe("SFCProvenanceWireEngine.cite — ISO group coverage", () => {
  it("correctly cites ISO group P (4140 steel) with kc1.1=1800", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      material: "4140",
      iso_group: "P",
      recommended: { sfm: 100 },
    });

    expect(result.ok).toBe(true);
    expect(result.provenance.kc11_source!.group).toBe("P");
    expect(result.provenance.kc11_source!.kc1_1).toBe(1800);
    expect(result.provenance.kc11_source!.mc).toBe(0.25);
    expect(result.provenance.taylor_source!.C).toBe(350);
    expect(result.provenance.taylor_source!.n).toBe(0.25);
  });

  it("correctly cites ISO group M (316 stainless) with kc1.1=2100", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      material: "316",
      iso_group: "M",
      recommended: { sfm: 100 },
    });

    expect(result.provenance.kc11_source!.group).toBe("M");
    expect(result.provenance.kc11_source!.kc1_1).toBe(2100);
    expect(result.provenance.kc11_source!.mc).toBe(0.25);
    expect(result.provenance.taylor_source!.C).toBe(200);
    expect(result.provenance.taylor_source!.n).toBe(0.20);
  });

  it("correctly cites ISO group K (gray iron) with kc1.1=1100", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      material: "gray_iron",
      iso_group: "K",
      recommended: { sfm: 100 },
    });

    expect(result.provenance.kc11_source!.group).toBe("K");
    expect(result.provenance.kc11_source!.kc1_1).toBe(1100);
    expect(result.provenance.kc11_source!.mc).toBe(0.28);
    expect(result.provenance.taylor_source!.C).toBe(250);
  });

  it("correctly cites ISO group N (6061 aluminum) with kc1.1=700", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      material: "6061",
      iso_group: "N",
      recommended: { sfm: 100 },
    });

    expect(result.provenance.kc11_source!.group).toBe("N");
    expect(result.provenance.kc11_source!.kc1_1).toBe(700);
    expect(result.provenance.kc11_source!.mc).toBe(0.22);
    expect(result.provenance.taylor_source!.C).toBe(600);
    expect(result.provenance.taylor_source!.n).toBe(0.40);
  });

  it("correctly cites ISO group S (Ti-6Al-4V superalloy) with kc1.1=2800", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      material: "Ti-6Al-4V",
      iso_group: "S",
      recommended: { sfm: 100 },
    });

    expect(result.provenance.kc11_source!.group).toBe("S");
    expect(result.provenance.kc11_source!.kc1_1).toBe(2800);
    expect(result.provenance.kc11_source!.mc).toBe(0.27);
    expect(result.provenance.taylor_source!.C).toBe(150);
    expect(result.provenance.taylor_source!.n).toBe(0.18);
  });

  it("correctly cites ISO group H (D2 hardened) with kc1.1=3200", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      material: "D2",
      iso_group: "H",
      recommended: { sfm: 100 },
    });

    expect(result.provenance.kc11_source!.group).toBe("H");
    expect(result.provenance.kc11_source!.kc1_1).toBe(3200);
    expect(result.provenance.kc11_source!.mc).toBe(0.30);
    expect(result.provenance.taylor_source!.C).toBe(120);
    expect(result.provenance.taylor_source!.n).toBe(0.15);
  });
});

describe("SFCProvenanceWireEngine.cite — adapter-based", () => {
  it("sets fps_source to adapter when adapter_id provided", () => {
    const input: SFCProvenanceWireInput = {
      engine: "UltimateSpeedFeedEngine",
      iso_group: "P",
      recommended: { sfm: 278 },
      adapter_id: "sfc-D2-Okuma-v3",
      adapter_confidence: 0.87,
      residual: -44,
    };

    const result = SFCProvenanceWireEngine.cite(input);

    expect(result.ok).toBe(true);
    expect(result.provenance.fps_source).toBe("adapter");
    expect(result.provenance.adapter_info).not.toBeNull();
    expect(result.provenance.adapter_info!.adapter_id).toBe("sfc-D2-Okuma-v3");
    expect(result.provenance.adapter_info!.confidence).toBe(0.87);
    expect(result.provenance.adapter_info!.shadow_mode).toBe(false);
    expect(result.provenance.residual).toBe(-44);

    // Adapter citation exists with correct values
    const adapterCitation = result.provenance.citations.find(c => c.source_type === "lora_adapter");
    expect(adapterCitation).not.toBeNull();
    expect(adapterCitation!.source_id).toBe("sfc-D2-Okuma-v3");
    expect(adapterCitation!.confidence).toBe(0.87);
    expect(adapterCitation!.corpus).toBe("adapters/sfc");

    // Reasoning trace mentions adapter and residual
    expect(result.provenance.reasoning_trace).toContain("LoRA adapter");
    expect(result.provenance.reasoning_trace).toContain("sfc-D2-Okuma-v3");
    expect(result.provenance.reasoning_trace).toContain("-44");
  });

  it("marks shadow mode adapter correctly", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "M",
      recommended: { sfm: 200 },
      adapter_id: "sfc-316-Haas-v1",
      adapter_shadow: true,
    });

    expect(result.provenance.adapter_info!.shadow_mode).toBe(true);
    expect(result.provenance.reasoning_trace).toContain("shadow mode");

    const citation = result.provenance.citations.find(c => c.source_type === "lora_adapter");
    expect(citation!.excerpt).toContain("Shadow mode");
  });
});

describe("SFCProvenanceWireEngine.cite — RAG-augmented", () => {
  it("sets fps_source to rag when rag_hits provided", () => {
    const input: SFCProvenanceWireInput = {
      engine: "MachineAwareSpeedFeedEngine",
      iso_group: "P",
      material: "D2",
      recommended: { sfm: 320 },
      rag_hits: [
        { program_id: "JMDIE/ALCOA/L-2845-D2.MIN", similarity: 0.91, material_match: true },
        { program_id: "JMDIE/ALCOA/L-2901-D2.MIN", similarity: 0.85, material_match: true },
      ],
    };

    const result = SFCProvenanceWireEngine.cite(input);

    expect(result.ok).toBe(true);
    expect(result.provenance.fps_source).toBe("rag");
    expect(result.provenance.rag_evidence).toHaveLength(2);
    expect(result.provenance.rag_evidence[0].program_id).toBe("JMDIE/ALCOA/L-2845-D2.MIN");
    expect(result.provenance.rag_evidence[0].similarity).toBe(0.91);
    expect(result.provenance.rag_evidence[0].material_match).toBe(true);
    expect(result.provenance.rag_evidence[1].program_id).toBe("JMDIE/ALCOA/L-2901-D2.MIN");
    expect(result.provenance.rag_evidence[1].similarity).toBe(0.85);

    // RAG citations with correct structure
    const ragCitations = result.provenance.citations.filter(c => c.source_type === "program");
    expect(ragCitations).toHaveLength(2);
    expect(ragCitations[0].corpus).toBe("jm_die_programs");
    expect(ragCitations[0].source_id).toBe("JMDIE/ALCOA/L-2845-D2.MIN");
    expect(ragCitations[0].retrieval_score).toBe(0.91);

    // Reasoning trace
    expect(result.provenance.reasoning_trace).toContain("RAG-augmented");
    expect(result.provenance.reasoning_trace).toContain("2 historical program matches");
  });

  it("limits RAG evidence to top 5", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "N",
      recommended: { rpm: 10000 },
      rag_hits: Array.from({ length: 10 }, (_, i) => ({
        program_id: `PROG-${i}`,
        similarity: 0.9 - i * 0.05,
      })),
    });

    expect(result.provenance.rag_evidence).toHaveLength(5);
    expect(result.provenance.rag_evidence[0].program_id).toBe("PROG-0");
    expect(result.provenance.rag_evidence[4].program_id).toBe("PROG-4");

    const ragCitations = result.provenance.citations.filter(c => c.source_type === "program");
    expect(ragCitations).toHaveLength(5);
  });
});

describe("SFCProvenanceWireEngine.cite — hybrid source", () => {
  it("sets fps_source to hybrid when adapter + RAG both present", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "UltimateSpeedFeedEngine",
      iso_group: "H",
      recommended: { sfm: 150 },
      adapter_id: "sfc-D2-Okuma-v3",
      adapter_confidence: 0.82,
      rag_hits: [
        { program_id: "JMDIE/OPTIMAS/H-1234.MIN", similarity: 0.88 },
      ],
    });

    expect(result.provenance.fps_source).toBe("hybrid");
    expect(result.provenance.adapter_info!.adapter_id).toBe("sfc-D2-Okuma-v3");
    expect(result.provenance.rag_evidence).toHaveLength(1);
    expect(result.provenance.rag_evidence[0].program_id).toBe("JMDIE/OPTIMAS/H-1234.MIN");
    expect(result.provenance.reasoning_trace).toContain("Hybrid");
    expect(result.provenance.reasoning_trace).toContain("sfc-D2-Okuma-v3");
    expect(result.provenance.reasoning_trace).toContain("1 RAG matches");
  });
});

describe("SFCProvenanceWireEngine.cite — overrides", () => {
  it("uses kc11_override and cites as operator source", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "P",
      material: "custom-alloy",
      recommended: { sfm: 400 },
      kc11_override: 2200,
    });

    expect(result.provenance.kc11_source!.kc1_1).toBe(2200);
    expect(result.provenance.kc11_source!.ref).toBe("override:2200");
    expect(result.provenance.kc11_source!.material_override).toBe("custom-alloy");

    const citation = result.provenance.citations.find(c => c.source_id.includes("kienzle-override"));
    expect(citation).not.toBeNull();
    expect(citation!.source_type).toBe("operator");
    expect(citation!.confidence).toBe(0.9);
    expect((citation!.metadata as Record<string, unknown>).kc1_1).toBe(2200);
  });

  it("uses taylor_override and cites as operator source", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "S",
      recommended: { vc: 50 },
      taylor_override: { C: 180, n: 0.22 },
      tool_grade: "KC725M",
    });

    expect(result.provenance.taylor_source!.C).toBe(180);
    expect(result.provenance.taylor_source!.n).toBe(0.22);
    expect(result.provenance.taylor_source!.tool_override).toBe("KC725M");
    expect(result.provenance.taylor_source!.ref).toBe("override:C=180,n=0.22");

    const citation = result.provenance.citations.find(c => c.source_id.includes("taylor-override"));
    expect(citation).not.toBeNull();
    expect(citation!.source_type).toBe("operator");
    expect((citation!.metadata as Record<string, unknown>).C).toBe(180);
    expect((citation!.metadata as Record<string, unknown>).n).toBe(0.22);
  });
});

describe("SFCProvenanceWireEngine.cite — missing ISO group", () => {
  it("handles unknown material gracefully with null sources", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      material: "unobtainium",
      recommended: { rpm: 5000 },
    });

    expect(result.ok).toBe(true);
    expect(result.provenance.kc11_source).toBeNull();
    expect(result.provenance.taylor_source).toBeNull();
    expect(result.provenance.fps_source).toBe("formula");
    expect(result.provenance.recommendation_id).toMatch(/^sfc-/);
    expect(result.provenance.citations).toHaveLength(0);
  });

  it("resolves ISO group S from Inconel 718 in material database", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      material: "Inconel 718",
      recommended: { sfm: 80 },
    });

    expect(result.provenance.kc11_source).not.toBeNull();
    expect(result.provenance.kc11_source!.group).toBe("S");
    expect(result.provenance.kc11_source!.kc1_1).toBe(2800);
  });
});

describe("SFCProvenanceWireEngine.validate", () => {
  it("accepts valid provenance with no errors", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "P",
      recommended: { sfm: 500 },
    });

    const validation = SFCProvenanceWireEngine.validate(result.provenance);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("rejects null provenance with specific error", () => {
    const validation = SFCProvenanceWireEngine.validate(null);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toHaveLength(1);
    expect(validation.errors[0]).toBe("Provenance is null or not an object");
  });

  it("rejects object with missing required fields", () => {
    const validation = SFCProvenanceWireEngine.validate({
      timestamp: new Date().toISOString(),
      engine: "TestEngine",
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Missing recommendation_id");
    expect(validation.errors).toContain("Missing fps_source");
    expect(validation.errors).toContain("No citations provided - recommendation source unknown");
  });

  it("detects audit hash tampering", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "K",
      recommended: { sfm: 300 },
    });

    const originalHash = result.provenance.audit_hash;
    const tampered = { ...result.provenance, engine: "TamperedEngine" };

    const validation = SFCProvenanceWireEngine.validate(tampered);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBe(1);
    expect(validation.errors[0]).toContain("Audit hash mismatch");
  });
});

describe("SFCProvenanceWireEngine.summarize", () => {
  it("produces human-readable summary with all sections", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "UltimateSpeedFeedEngine",
      iso_group: "P",
      material: "4140",
      recommended: { sfm: 450 },
      adapter_id: "sfc-4140-Haas-v2",
      adapter_confidence: 0.92,
      residual: 15,
      rag_hits: [
        { program_id: "JMDIE/ALCOA/M-1234.MIN", similarity: 0.88 },
      ],
    });

    const summary = SFCProvenanceWireEngine.summarize(result.provenance);

    expect(summary).toContain("SFC Recommendation");
    expect(summary).toContain(result.provenance.recommendation_id);
    expect(summary).toContain("Engine: UltimateSpeedFeedEngine");
    expect(summary).toContain("Source: HYBRID");
    expect(summary).toContain("Kienzle: kc1.1=1800 [P]");
    expect(summary).toContain("Taylor: C=350, n=0.25 [P]");
    expect(summary).toContain("Adapter: sfc-4140-Haas-v2 (92% conf)");
    expect(summary).toContain("Residual: +15");
    expect(summary).toContain("RAG matches: 1");
    expect(summary).toContain("JMDIE/ALCOA/M-1234.MIN (88%)");
    expect(summary).toContain("Citations: ");
  });
});

describe("SFCProvenanceWireEngine — audit hash integrity", () => {
  it("produces different hashes for different engines", () => {
    const result1 = SFCProvenanceWireEngine.cite({
      engine: "Engine1",
      iso_group: "P",
      recommended: { sfm: 400 },
    });

    const result2 = SFCProvenanceWireEngine.cite({
      engine: "Engine2",
      iso_group: "P",
      recommended: { sfm: 400 },
    });

    expect(result1.provenance.audit_hash).not.toBe(result2.provenance.audit_hash);
  });

  it("produces different hashes for different ISO groups", () => {
    const result1 = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "P",
      recommended: { sfm: 400 },
    });

    const result2 = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "M",
      recommended: { sfm: 400 },
    });

    expect(result1.provenance.audit_hash).not.toBe(result2.provenance.audit_hash);
  });

  it("hash format is exactly 16 lowercase hex characters", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "N",
      recommended: { rpm: 12000 },
    });

    expect(result.provenance.audit_hash).toMatch(/^[a-f0-9]{16}$/);
    expect(result.provenance.audit_hash!.length).toBe(16);
  });
});

describe("SFCProvenanceWireEngine — lathe vs mill scenarios", () => {
  it("handles lathe-specific parameters (fpr, ap, vc)", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "LatheSpeedFeedCalculatorFacadeEngine",
      action: "calculate",
      material: "4140",
      iso_group: "P",
      operation: "turning",
      machine_id: "okuma-lb45",
      recommended: { vc: 180, rpm: 950, fpr: 0.20, ap: 2.5 },
    });

    expect(result.ok).toBe(true);
    expect(result.provenance.engine).toBe("LatheSpeedFeedCalculatorFacadeEngine");
    expect(result.provenance.kc11_source!.group).toBe("P");
    expect(result.provenance.kc11_source!.kc1_1).toBe(1800);
    expect(result.provenance.fps_source).toBe("formula");
  });

  it("handles mill-specific parameters (fpt, ae, doc, sfm)", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "UltimateSpeedFeedEngine",
      action: "calculate",
      material: "6061",
      iso_group: "N",
      operation: "milling",
      machine_id: "haas-vf4",
      recommended: { sfm: 1800, rpm: 14000, fpt: 0.006, doc: 0.8, ae: 0.3 },
    });

    expect(result.ok).toBe(true);
    expect(result.provenance.engine).toBe("UltimateSpeedFeedEngine");
    expect(result.provenance.kc11_source!.group).toBe("N");
    expect(result.provenance.kc11_source!.kc1_1).toBe(700);
    expect(result.provenance.taylor_source!.C).toBe(600);
  });
});

describe("SFCProvenanceWireEngine — adversarial inputs", () => {
  it("handles empty recommended object", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "P",
      recommended: {},
    });

    expect(result.ok).toBe(true);
    expect(result.provenance.recommendation_id).toMatch(/^sfc-/);
    expect(result.provenance.kc11_source!.kc1_1).toBe(1800);
  });

  it("handles all optional fields undefined", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      recommended: { sfm: 100 },
    });

    expect(result.ok).toBe(true);
    expect(result.provenance.kc11_source).toBeNull();
    expect(result.provenance.taylor_source).toBeNull();
    expect(result.provenance.adapter_info).toBeNull();
    expect(result.provenance.rag_evidence).toHaveLength(0);
    expect(result.provenance.residual).toBeNull();
  });

  it("handles empty rag_hits array", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "M",
      recommended: { sfm: 200 },
      rag_hits: [],
    });

    expect(result.ok).toBe(true);
    expect(result.provenance.fps_source).toBe("formula");
    expect(result.provenance.rag_evidence).toHaveLength(0);
    const ragCitations = result.provenance.citations.filter(c => c.source_type === "program");
    expect(ragCitations).toHaveLength(0);
  });

  it("handles adapter_confidence of exactly 0", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "H",
      recommended: { sfm: 80 },
      adapter_id: "test-adapter",
      adapter_confidence: 0.0,
    });

    expect(result.ok).toBe(true);
    expect(result.provenance.adapter_info!.confidence).toBe(0);
    const adapterCitation = result.provenance.citations.find(c => c.source_type === "lora_adapter");
    expect(adapterCitation!.confidence).toBe(0);
  });

  it("handles very long program IDs in RAG hits", () => {
    const longId = "JMDIE/" + "A".repeat(200) + ".MIN";
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "P",
      recommended: { sfm: 400 },
      rag_hits: [{ program_id: longId, similarity: 0.8 }],
    });

    expect(result.ok).toBe(true);
    expect(result.provenance.rag_evidence[0].program_id).toBe(longId);
    expect(result.provenance.rag_evidence[0].program_id.length).toBe(210);
  });

  it("handles similarity at boundary values (0 and 1)", () => {
    const result = SFCProvenanceWireEngine.cite({
      engine: "TestEngine",
      iso_group: "K",
      recommended: { sfm: 250 },
      rag_hits: [
        { program_id: "PROG-MIN", similarity: 0.0 },
        { program_id: "PROG-MAX", similarity: 1.0 },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.provenance.rag_evidence[0].similarity).toBe(0);
    expect(result.provenance.rag_evidence[1].similarity).toBe(1);
  });
});
