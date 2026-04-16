/**
 * VideoLearningEngine — Playbook Extraction Tests
 *
 * PB-MS0-P5-U01: Auto-enrichment of MachiningPlaybookEngine from video pipeline.
 * Tests the extractPlaybookRules method (pure; no FFmpeg/network needed).
 */

import { describe, it, expect } from "vitest";
import { videoLearningEngine, type VideoKnowledgeItem } from "../engines/VideoLearningEngine.js";

function mkItem(partial: Partial<VideoKnowledgeItem>): VideoKnowledgeItem {
  return {
    title: partial.title ?? "Untitled clip",
    body: partial.body ?? "",
    category: partial.category ?? "cam",
    tags: partial.tags ?? [],
    confidence: partial.confidence ?? 70,
    source: partial.source ?? "video:test@0s",
    transcript_excerpt: partial.transcript_excerpt,
    frame_reference: partial.frame_reference,
  };
}

describe("VideoLearningEngine — extractPlaybookRules", () => {
  it("classifies anti-pattern phrasing as critical anti_pattern rules", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Never climb-mill thin walls",
        body: "You should never climb-mill thin walls — deflection ruins the finish and chatter takes over.",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(
      items,
      "H:/videos/thin-wall.mp4",
      "Titans of CNC",
      "https://youtube.com/watch?v=abc"
    );
    expect(rules.length).toBe(1);
    expect(rules[0].category).toBe("anti_pattern");
    expect(rules[0].severity).toBe("critical");
    expect(rules[0].source).toContain("Titans of CNC");
    expect(rules[0].source).toContain("https://youtube.com/watch?v=abc");
  });

  it("classifies sequencing phrasing as sequencing rules", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Always face before drilling",
        body: "First face the stock, then drill. Sequence matters for accuracy.",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/seq.mp4");
    expect(rules[0].category).toBe("sequencing");
    expect(rules[0].severity).toBe("important");
  });

  it("classifies thin wall phrasing", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Thin wall strategy",
        body: "When machining thin walls, reduce stepover to prevent deflection and chatter harmonics.",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/thin.mp4");
    expect(rules[0].category).toBe("thin_wall");
  });

  it("classifies finishing phrasing", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Ra 0.8 finish pass",
        body: "Light finish pass at high RPM gives us surface finish Ra 0.8 every time.",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/fin.mp4");
    expect(rules[0].category).toBe("finishing");
  });

  it("classifies coolant phrasing", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Flood coolant on stainless",
        body: "Always use flood coolant when turning stainless to keep chips from welding.",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/cool.mp4");
    // "always" is an anti_pattern marker; accept either coolant_strategy or anti_pattern
    expect(["coolant_strategy", "anti_pattern"]).toContain(rules[0].category);
  });

  it("classifies setup phrasing", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Soft jaw setup strategy",
        body: "Use soft jaws in the chuck with a machined datum face for repeatability.",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/setup.mp4");
    expect(rules[0].category).toBe("setup_strategy");
  });

  it("classifies safety phrasing as critical", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Safe retract plane",
        body: "Always lift to the safe height before any rapid move — crash risk otherwise.",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/safe.mp4");
    // Either anti_pattern ("otherwise"/"always") or safety marker
    expect(["safety", "anti_pattern"]).toContain(rules[0].category);
    expect(rules[0].severity).toBe("critical");
  });

  it("classifies material phrasing as material_tip with tip severity", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "6061 aluminum sweet spot",
        body: "For 6061 aluminum, 2-flute cuts chips cleanly at high RPM.",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/mat.mp4");
    expect(rules[0].category).toBe("material_tip");
    expect(rules[0].severity).toBe("tip");
  });

  it("skips items that are too short to be rule-shaped", () => {
    const items: VideoKnowledgeItem[] = [mkItem({ title: "abc", body: "xyz" })];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/short.mp4");
    expect(rules.length).toBe(0);
  });

  it("dedups within a single video by slug", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Never climb-mill thin walls",
        body: "Never climb-mill thin walls when deflection is likely.",
      }),
      mkItem({
        title: "Never climb-mill thin walls",
        body: "Never climb-mill thin walls — repeated rule, should dedup.",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/dup.mp4");
    expect(rules.length).toBe(1);
  });

  it("generates unique rule IDs with PB-VL prefix", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Never run rapid through material",
        body: "Never issue G00 through uncut stock — guaranteed crash.",
      }),
      mkItem({
        title: "Always ramp into pockets",
        body: "First ramp in at 3 degrees, then lace pattern.",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/two.mp4");
    expect(rules.length).toBe(2);
    expect(rules[0].id).toMatch(/^PB-VL-/);
    expect(rules[1].id).toMatch(/^PB-VL-/);
    expect(rules[0].id).not.toBe(rules[1].id);
  });

  it("includes reasoning from transcript excerpt when available", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Never rough into finish tool",
        body: "Do not use the finish tool for roughing passes.",
        transcript_excerpt: "operator says you should never load up the finish tool",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/reason.mp4");
    expect(rules[0].reasoning).toContain("operator says");
  });

  it("falls back to frame reference when transcript excerpt missing", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Avoid climb mill on thin floor",
        body: "Avoid climb milling on a thin floor to prevent deflection.",
        frame_reference: "42.5s",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/frame.mp4");
    expect(rules[0].reasoning).toContain("42.5s");
  });

  it("returns empty array for empty input", () => {
    const rules = videoLearningEngine.extractPlaybookRules([], "C:/videos/empty.mp4");
    expect(rules).toEqual([]);
  });

  it("marks all extracted rules as not-yet-added-to-playbook (before registration)", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Never plunge carbide",
        body: "Never plunge a carbide endmill — ramp in instead.",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "C:/videos/plunge.mp4");
    expect(rules[0].added_to_playbook).toBe(false);
  });

  it("uses file path in source when URL not provided", () => {
    const items: VideoKnowledgeItem[] = [
      mkItem({
        title: "Avoid stacked clamps",
        body: "Avoid stacking clamps on thin stock — will deflect the part.",
      }),
    ];
    const rules = videoLearningEngine.extractPlaybookRules(items, "H:/PRISM/videos/local.mp4");
    expect(rules[0].source).toContain("H:/PRISM/videos/local.mp4");
    expect(rules[0].source).toContain("VideoLearning");
  });
});
