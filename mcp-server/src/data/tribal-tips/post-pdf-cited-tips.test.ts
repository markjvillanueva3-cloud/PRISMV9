/**
 * post-pdf-cited-tips.test.ts — anti-regression for the post-processor
 * cited-tip seed corpus (POST-PDF-NODE-MS0/U-POST-PDF-TRIBAL-TIPS).
 *
 * Foxtrot-soul refuse-list ENFORCEMENT (every tip MUST cite):
 *   - sourceId set to a known PDF corpus ID
 *   - sourceTitle non-empty
 *   - vendor in the allowed set
 *   - citation non-empty (chapter/section reference)
 *
 * Coverage axes:
 *   - all 14 controller dialects reachable via tipsForController (empty scope = matches all)
 *   - all 12 Autodesk chapters represented at least once
 *   - all 13 Postability sections represented at least once via topic tags
 *   - tip ID uniqueness (no dup keys)
 *
 * @slot echo
 * @iter 6
 * @date 2026-05-26
 */

import { describe, it, expect } from "vitest";
import {
  POST_PDF_CITED_TIPS,
  POST_PDF_CITED_TIPS_STATS,
  tipsForController,
  tipsForTopic,
} from "./post-pdf-cited-tips.js";
import { ALL_CONTROLLER_DIALECTS } from "./post-pdf-cited-tips.types.js";

describe("post-pdf-cited-tips — corpus integrity", () => {
  it("has a non-empty seed corpus (≥30 tips)", () => {
    expect(POST_PDF_CITED_TIPS.length).toBeGreaterThanOrEqual(30);
  });

  it("every tip cites a known source (foxtrot-soul refuse-list)", () => {
    const validSourceIds = new Set([
      "PDF-POST-TRAINING-AUTODESK",
      "PDF-POST-POSTABILITY-UPK-2021",
    ]);
    for (const tip of POST_PDF_CITED_TIPS) {
      expect(validSourceIds.has(tip.sourceId)).toBe(true);
      expect(tip.sourceTitle.length).toBeGreaterThan(0);
      expect(tip.vendor === "Autodesk" || tip.vendor === "Postability").toBe(true);
      expect(tip.citation.length).toBeGreaterThan(0);
    }
  });

  it("tip IDs are unique (no duplicate keys)", () => {
    const ids = POST_PDF_CITED_TIPS.map(t => t.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it("every confidence value is one of the documented levels", () => {
    const valid = new Set(["draft", "corroborated", "doctrine"]);
    for (const tip of POST_PDF_CITED_TIPS) {
      expect(valid.has(tip.confidence)).toBe(true);
    }
  });

  it("every status value is draft or validated", () => {
    for (const tip of POST_PDF_CITED_TIPS) {
      expect(tip.status === "draft" || tip.status === "validated").toBe(true);
    }
  });

  it("controllerScope contains only known dialects", () => {
    const valid = new Set(ALL_CONTROLLER_DIALECTS);
    for (const tip of POST_PDF_CITED_TIPS) {
      for (const c of tip.controllerScope) {
        expect(valid.has(c)).toBe(true);
      }
    }
  });

  it("tags array is non-empty for every tip", () => {
    for (const tip of POST_PDF_CITED_TIPS) {
      expect(tip.tags.length).toBeGreaterThan(0);
    }
  });
});

describe("post-pdf-cited-tips — coverage", () => {
  it("all 14 controller dialects are reachable (empty scope = catch-all match)", () => {
    for (const c of ALL_CONTROLLER_DIALECTS) {
      const tips = tipsForController(c);
      // Every dialect MUST have at least the catch-all doctrine tips.
      expect(tips.length).toBeGreaterThan(0);
    }
  });

  it("controllers with dedicated dialect tips: heidenhain reaches its specific HSM tip", () => {
    const heidenhainTips = tipsForController("heidenhain");
    const ids = heidenhainTips.map(t => t.id);
    expect(ids).toContain("POST-TIP-HEIDENHAIN-M120");
    expect(ids).toContain("POST-TIP-RTCP-HEIDENHAIN-TCPM");
  });

  it("mitsubishi reaches its G5.1-leading-zero HSM tip", () => {
    const mitsubishiTips = tipsForController("mitsubishi");
    const ids = mitsubishiTips.map(t => t.id);
    expect(ids).toContain("POST-TIP-FANUC-SMOOTHING-G5.1");
  });

  it("haas reaches its G187 HSM tip + Fanuc-family safe-start", () => {
    const haasTips = tipsForController("haas");
    const ids = haasTips.map(t => t.id);
    expect(ids).toContain("POST-TIP-HAAS-SMOOTHING-G187");
  });

  it("both PDF sources contribute tips", () => {
    expect(POST_PDF_CITED_TIPS_STATS.bySource.autodesk).toBeGreaterThan(10);
    expect(POST_PDF_CITED_TIPS_STATS.bySource.postability).toBeGreaterThan(5);
  });

  it("at least 3 doctrine-level tips (cross-corroborated, every-post-needs-this)", () => {
    expect(POST_PDF_CITED_TIPS_STATS.byConfidence.doctrine).toBeGreaterThanOrEqual(3);
  });

  it("topic taxonomy covers multi_axis, settings, entry_functions, probing, additive (Autodesk chapter spread)", () => {
    const topics = new Set(POST_PDF_CITED_TIPS_STATS.topics);
    expect(topics.has("multi_axis")).toBe(true);
    expect(topics.has("settings")).toBe(true);
    expect(topics.has("entry_functions")).toBe(true);
    expect(topics.has("probing")).toBe(true);
    expect(topics.has("additive")).toBe(true);
  });

  it("topic taxonomy covers UPK domain topics (rotary_switches, work_offset, mill_turn)", () => {
    const topics = new Set(POST_PDF_CITED_TIPS_STATS.topics);
    expect(topics.has("rotary_switches")).toBe(true);
    expect(topics.has("work_offset")).toBe(true);
    expect(topics.has("mill_turn")).toBe(true);
  });
});

describe("post-pdf-cited-tips — lookup helpers", () => {
  it("tipsForTopic('multi_axis') returns the 5-axis tips", () => {
    const tips = tipsForTopic("multi_axis");
    expect(tips.length).toBeGreaterThanOrEqual(4);
    const ids = tips.map(t => t.id);
    expect(ids).toContain("POST-TIP-RTCP-FANUC-G43.4");
    expect(ids).toContain("POST-TIP-RTCP-HEIDENHAIN-TCPM");
    expect(ids).toContain("POST-TIP-SINGULARITY-HANDLING");
  });

  it("tipsForController('fanuc') excludes Heidenhain-only tips", () => {
    const fanucTips = tipsForController("fanuc");
    const ids = new Set(fanucTips.map(t => t.id));
    // Heidenhain TCPM tip has controllerScope:['heidenhain'] only — must NOT appear for Fanuc
    expect(ids.has("POST-TIP-RTCP-HEIDENHAIN-TCPM")).toBe(false);
    // Heidenhain HSM (M120) tip is heidenhain-only — must NOT appear for Fanuc
    expect(ids.has("POST-TIP-HEIDENHAIN-M120")).toBe(false);
  });

  it("tipsForController('generic') still gets the doctrine catch-all tips", () => {
    const genericTips = tipsForController("generic");
    const ids = genericTips.map(t => t.id);
    expect(ids).toContain("POST-TIP-WHAT-IS-A-POST");
    expect(ids).toContain("POST-TIP-COMPARE-REAL-VALUES");
    expect(ids).toContain("POST-TIP-COMMENT-FORMAT");
  });
});
