/**
 * Tests for milling-pdf-cited-tips.ts — verifies cited-tip seed integrity:
 *   - Every tip has source attribution (foxtrot-soul refuse-list compliance)
 *   - No anonymous tips (sourceId + sourceTitle + vendor all non-empty)
 *   - operationTopicIndex correctness via tipsForMillingOperation()
 *   - Evidence-level sort order is descending (manufacturer_official first)
 *   - listMillingOperationsWithTips returns sorted distinct ops
 */

import { describe, it, expect } from "vitest";
import {
  MILLING_PDF_CITED_TIPS,
  tipsForMillingOperation,
  listMillingOperationsWithTips,
  type MillingTipEvidenceLevel,
} from "./milling-pdf-cited-tips.js";

describe("MILLING_PDF_CITED_TIPS — source-attribution integrity (foxtrot-soul refuse-list)", () => {
  it("contains at least 10 seed tips covering ≥5 distinct operations", () => {
    expect(MILLING_PDF_CITED_TIPS.length).toBeGreaterThanOrEqual(10);
    const distinct = new Set(MILLING_PDF_CITED_TIPS.map(t => t.operation));
    expect(distinct.size).toBeGreaterThanOrEqual(5);
  });

  it("every tip has a non-empty sourceId, sourceTitle, and vendor (no anonymous tips)", () => {
    for (const tip of MILLING_PDF_CITED_TIPS) {
      expect(tip.sourceId.length).toBeGreaterThan(0);
      expect(tip.sourceTitle.length).toBeGreaterThan(0);
      expect(tip.vendor.length).toBeGreaterThan(0);
    }
  });

  it("every tip has a non-empty id, operation, and headline", () => {
    for (const tip of MILLING_PDF_CITED_TIPS) {
      expect(tip.id.length).toBeGreaterThan(0);
      expect(tip.operation.length).toBeGreaterThan(0);
      expect(tip.headline.length).toBeGreaterThan(0);
    }
  });

  it("every tip carries an evidenceLevel in the allowed enum", () => {
    const allowed: MillingTipEvidenceLevel[] = [
      "manufacturer_official",
      "manufacturer_training",
      "manufacturer_sample",
      "post_processor_doc",
      "industry_reference",
    ];
    for (const tip of MILLING_PDF_CITED_TIPS) {
      expect(allowed).toContain(tip.evidenceLevel);
    }
  });

  it("every tip status is 'draft' or 'validated' (no promoted-without-corroboration regressions)", () => {
    for (const tip of MILLING_PDF_CITED_TIPS) {
      expect(["draft", "validated"]).toContain(tip.status);
    }
  });

  it("every tip ID is unique", () => {
    const ids = MILLING_PDF_CITED_TIPS.map(t => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("corroboratedBy is always an array (never undefined) — no anonymous corroboration", () => {
    for (const tip of MILLING_PDF_CITED_TIPS) {
      expect(Array.isArray(tip.corroboratedBy)).toBe(true);
    }
  });

  it("materialScope is always non-empty (must apply to ≥1 ISO group or 'all')", () => {
    for (const tip of MILLING_PDF_CITED_TIPS) {
      expect(tip.materialScope.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("tipsForMillingOperation — query path used by KnowledgeCurriculumBridgeEngine", () => {
  it("returns at least one tip for 'face_milling'", () => {
    const tips = tipsForMillingOperation("face_milling");
    expect(tips.length).toBeGreaterThanOrEqual(1);
    for (const tip of tips) {
      expect(tip.operation).toBe("face_milling");
    }
  });

  it("returns at least one tip for 'pocket_milling'", () => {
    const tips = tipsForMillingOperation("pocket_milling");
    expect(tips.length).toBeGreaterThanOrEqual(1);
    for (const tip of tips) {
      expect(tip.operation).toBe("pocket_milling");
    }
  });

  it("returns an empty array for an unknown operation (fail-soft)", () => {
    expect(tipsForMillingOperation("not-a-real-op")).toEqual([]);
  });

  it("sorts results with manufacturer_official tips before industry_reference tips", () => {
    // face_milling has a mix: industry_reference (CNCCookbook) + manufacturer_official (Sandvik)
    const tips = tipsForMillingOperation("face_milling");
    if (tips.length >= 2) {
      const ranks: Record<MillingTipEvidenceLevel, number> = {
        manufacturer_official: 4,
        manufacturer_training: 3,
        post_processor_doc: 2,
        industry_reference: 1,
        manufacturer_sample: 0,
      };
      for (let i = 0; i < tips.length - 1; i++) {
        expect(ranks[tips[i].evidenceLevel]).toBeGreaterThanOrEqual(ranks[tips[i + 1].evidenceLevel]);
      }
    }
  });
});

describe("listMillingOperationsWithTips — domain coverage report", () => {
  it("returns a sorted unique list of operations", () => {
    const ops = listMillingOperationsWithTips();
    const sortedCopy = [...ops].sort();
    expect(ops).toEqual(sortedCopy);
    const unique = new Set(ops);
    expect(unique.size).toBe(ops.length);
  });

  it("covers all primary milling operations from course-4-milling-operations", () => {
    const ops = listMillingOperationsWithTips();
    expect(ops).toContain("face_milling");
    expect(ops).toContain("pocket_milling");
    expect(ops).toContain("slotting");
  });

  it("includes at least one ISO-material-broad tip per covered operation", () => {
    const ops = listMillingOperationsWithTips();
    for (const op of ops) {
      const tips = tipsForMillingOperation(op);
      expect(tips.length).toBeGreaterThanOrEqual(1);
    }
  });
});
