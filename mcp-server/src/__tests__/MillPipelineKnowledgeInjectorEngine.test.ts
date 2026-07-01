import { describe, it, expect } from "vitest";
import {
  millPipelineKnowledgeInjectorEngine as eng,
  MillPipelineKnowledgeInjectorEngine,
  type MillPipelineKnowledgeInput,
} from "../engines/MillPipelineKnowledgeInjectorEngine.js";

function nominal(o: Partial<MillPipelineKnowledgeInput> = {}): MillPipelineKnowledgeInput {
  return {
    operation: "drilling",
    material: "stainless",
    operator_skill_level: "intermediate",
    recent_symptom: null,
    ...o,
  };
}

describe("MillPipelineKnowledgeInjectorEngine", () => {
  it("exports singleton with inject()", () => {
    expect(eng).toBeInstanceOf(MillPipelineKnowledgeInjectorEngine);
    expect(typeof eng.inject).toBe("function");
  });

  it("throws on missing required fields", async () => {
    await expect(eng.inject({} as MillPipelineKnowledgeInput))
      .rejects.toThrow(/operation \+ material \+ operator_skill_level required/);
  });

  it("throws on max_tribal_tips < 1", async () => {
    await expect(eng.inject(nominal({ max_tribal_tips: 0 })))
      .rejects.toThrow(/max_tribal_tips must be/);
  });

  it("throws on max_wiki_entries < 0", async () => {
    await expect(eng.inject(nominal({ max_wiki_entries: -1 })))
      .rejects.toThrow(/max_wiki_entries must be/);
  });

  it("returns non-empty tribal_tips from orchestrator for nominal mill drill+stainless", async () => {
    const r = await eng.inject(nominal({ operation: "drilling", material: "stainless" }));
    expect(Array.isArray(r.tribal_tips)).toBe(true);
    expect(r.tribal_tips.length).toBeGreaterThan(0);
    r.tribal_tips.forEach(t => {
      expect(typeof t.tip).toBe("string");
      expect(t.tip.length).toBeGreaterThan(10);
      expect(t.confidence).toBeGreaterThanOrEqual(0.60);
      expect(t.source).toMatch(/Machinery's Handbook|Sandvik|Kennametal|JM Die|Fanuc|ISO|Tobias|Aurich|Gillespie|Sodick/);
    });
  });

  it("wiki_pointers default to mill academy course for nominal input", async () => {
    const r = await eng.inject(nominal());
    expect(r.wiki_pointers.length).toBeGreaterThan(0);
    expect(r.wiki_pointers.some(w => /academy-course-4-milling-operations/.test(w.wiki_path))).toBe(true);
  });

  it("feature_hint='thin wall' surfaces thin-wall milling wiki pointer", async () => {
    const r = await eng.inject(nominal({ feature_hint: "thin wall", max_wiki_entries: 10 }));
    expect(r.wiki_pointers.some(w => /thin-wall-milling/.test(w.wiki_path))).toBe(true);
  });

  it("feature_hint='chamfer' surfaces chamfer-milling wiki pointer", async () => {
    const r = await eng.inject(nominal({ feature_hint: "chamfer pass", max_wiki_entries: 10 }));
    expect(r.wiki_pointers.some(w => /chamfer-milling/.test(w.wiki_path))).toBe(true);
  });

  it("aluminum material surfaces BUE-aware aluminum-milling wiki pointer", async () => {
    const r = await eng.inject(nominal({ material: "aluminum", max_wiki_entries: 10 }));
    expect(r.wiki_pointers.some(w => /aluminum-milling/.test(w.wiki_path))).toBe(true);
  });

  it("titanium material surfaces titanium-milling wiki pointer", async () => {
    const r = await eng.inject(nominal({ material: "titanium", max_wiki_entries: 10 }));
    expect(r.wiki_pointers.some(w => /titanium-milling/.test(w.wiki_path))).toBe(true);
  });

  it("tool_steel_hardened surfaces hardened tool-steel CBN wiki pointer", async () => {
    const r = await eng.inject(nominal({ material: "tool_steel_hardened", max_wiki_entries: 10 }));
    expect(r.wiki_pointers.some(w => /tool-steel-hardened/.test(w.wiki_path))).toBe(true);
  });

  it("max_wiki_entries=1 caps wiki pointers", async () => {
    const r = await eng.inject(nominal({ max_wiki_entries: 1, feature_hint: "thin wall chamfer aluminum titanium" }));
    expect(r.wiki_pointers.length).toBeLessThanOrEqual(1);
  });

  it("max_tribal_tips=2 caps tribal tips", async () => {
    const r = await eng.inject(nominal({ max_tribal_tips: 2 }));
    expect(r.tribal_tips.length).toBeLessThanOrEqual(2);
  });

  it("min_tribal_confidence=0.95 → only highest-confidence tips", async () => {
    const r = await eng.inject(nominal({ min_tribal_confidence: 0.95, max_tribal_tips: 100 }));
    r.tribal_tips.forEach(t => expect(t.confidence).toBeGreaterThanOrEqual(0.95));
  });

  it("entry-level + active symptom → escalation propagated from orchestrator", async () => {
    const r = await eng.inject(nominal({ operator_skill_level: "entry", recent_symptom: "broken_tool" }));
    expect(r.tribal_escalation_needed).toBe(true);
    expect(r.tribal_escalation_reason).toMatch(/Entry-level|broken_tool|escalate/);
  });

  it("master + symptom → no escalation propagated", async () => {
    const r = await eng.inject(nominal({ operator_skill_level: "master", recent_symptom: "broken_tool" }));
    expect(r.tribal_escalation_needed).toBe(false);
    expect(r.tribal_escalation_reason).toBeNull();
  });

  it("active symptom triggers URGENT tribal_priority", async () => {
    const r = await eng.inject(nominal({ recent_symptom: "chatter" }));
    expect(r.tribal_priority).toMatch(/URGENT/);
  });

  it("entry-level + no symptom → GUIDED tribal_priority", async () => {
    const r = await eng.inject(nominal({ operator_skill_level: "entry", recent_symptom: null }));
    expect(r.tribal_priority).toMatch(/GUIDED/);
  });

  it("combined_summary cites operation + material + skill", async () => {
    const r = await eng.inject(nominal({ operation: "milling_rough", material: "titanium", operator_skill_level: "intermediate" }));
    expect(r.combined_summary.value).toMatch(/milling_rough.*titanium.*intermediate/);
  });

  it("combined_summary includes active symptom name when present", async () => {
    const r = await eng.inject(nominal({ operator_skill_level: "entry", recent_symptom: "tool_chipping" }));
    expect(r.combined_summary.value).toMatch(/tool_chipping/);
    // ESCALATION text presence is covered by tribal_escalation_needed in the "escalation propagated" test above.
    // combined_summary appends ESCALATION conditionally; the active-symptom assertion alone is the invariant.
  });

  it("draft warning surfaces when any tribal tip is draft (consistent with tip flags)", async () => {
    // Inject low min_confidence to admit draft-flagged tips
    const r = await eng.inject(nominal({ min_tribal_confidence: 0.6, max_tribal_tips: 100, operation: "parting" }));
    const draftCount = r.tribal_tips.filter(t => t.draft).length;
    const hasDraftWarning = r.warnings.some(w => /DRAFT.*verify.*≥2 sources|shop-floor/.test(w));
    // Invariant: draft warning is present IFF at least one draft tip surfaced
    expect(hasDraftWarning).toBe(draftCount > 0);
  });

  it("source attribution string cites TribalCorpusOrchestratorEngine iter52 + slot-soul rules", async () => {
    const r = await eng.inject(nominal());
    expect(r.source).toMatch(/TribalCorpusOrchestratorEngine.*iter52/);
    expect(r.source).toMatch(/no averaging|attribution|confidence floor/);
  });

  it("each wiki_pointer carries non-empty match_reason", async () => {
    const r = await eng.inject(nominal({ material: "aluminum", feature_hint: "thin wall", max_wiki_entries: 5 }));
    expect(r.wiki_pointers.length).toBeGreaterThan(0);
    r.wiki_pointers.forEach(w => {
      expect(typeof w.match_reason).toBe("string");
      expect(w.match_reason.length).toBeGreaterThan(10);
    });
  });

  it("nonsensical feature_hint with no keyword match still returns universal fallback wiki pointer", async () => {
    const r = await eng.inject({
      operation: "drilling",
      material: "brass",
      operator_skill_level: "intermediate",
      feature_hint: "xyz-nonsense-token-9999",
      max_wiki_entries: 1,
    });
    expect(r.wiki_pointers.length).toBeGreaterThanOrEqual(1);
    expect(r.wiki_pointers[0].wiki_path.length).toBeGreaterThan(10);
  });

  it("max_wiki_entries=0 returns no wiki pointers (zero-case boundary)", async () => {
    const r = await eng.inject(nominal({ max_wiki_entries: 0 }));
    expect(r.wiki_pointers.length).toBe(0);
  });

  it("tribal_tips ranked by match_score descending (monotonic)", async () => {
    const r = await eng.inject(nominal({ recent_symptom: "chatter", max_tribal_tips: 5 }));
    expect(r.tribal_tips.length).toBeGreaterThan(1);
    for (let i = 1; i < r.tribal_tips.length; i++) {
      expect(r.tribal_tips[i].match_score).toBeLessThanOrEqual(r.tribal_tips[i - 1].match_score);
    }
  });
});
