/**
 * WEDMKnowledgeDistillationEngine Tests — WEDM AGI Phase 2 / U-P2-13
 *
 * Exit gate: a 107-tip input distills to ≤100 rules while every tip
 * remains attached to exactly one rule.
 */
import { describe, it, expect } from "vitest";
import {
  WEDMKnowledgeDistillationEngine,
  wedmKnowledgeDistillationEngine,
  type DistilTip,
} from "../../engines/WEDMKnowledgeDistillationEngine.js";

const engine = new WEDMKnowledgeDistillationEngine();

// ─── fixture builder ───────────────────────────────────────

const CATEGORIES = [
  "troubleshooting",
  "tooling",
  "flushing",
  "surface_finish",
  "taper",
  "workholding",
  "programming",
  "safety",
];

const TAG_POOL = [
  "wire-break",
  "corner",
  "flushing",
  "thick-section",
  "coated-wire",
  "tension",
  "surface-finish",
  "ra",
  "taper",
  "uv",
  "workholding",
  "vibration",
  "pierce",
  "skim",
  "roughing",
  "mirror",
  "carbide",
  "graphite",
];

function makeTips(n: number): DistilTip[] {
  const out: DistilTip[] = [];
  for (let i = 0; i < n; i++) {
    const cat = CATEGORIES[i % CATEGORIES.length];
    const tag = TAG_POOL[i % TAG_POOL.length];
    const confidence = 70 + ((i * 7) % 30); // 70..99 on a 0..100 scale
    out.push({
      id: `tip-${String(i + 1).padStart(3, "0")}`,
      title: `Reduce ${tag.replace("-", " ")} risk (${i + 1})`,
      body: `Reduce the ${tag} risk by tuning the pulse parameters. Increase flush pressure and monitor gap voltage.`,
      category: cat,
      tags: ["wire-edm", tag, `aux-${i}`],
      confidence,
      source: `fixture:${cat}:${i}`,
    });
  }
  return out;
}

// ─── tests ─────────────────────────────────────────────────

describe("WEDMKnowledgeDistillationEngine — exit gate", () => {
  it("107-tip input distills to ≤100 rules with every tip attached", () => {
    const tips = makeTips(107);
    const r = engine.distill({ tips });
    expect(r.stats.input_tip_count).toBe(107);
    expect(r.stats.rule_count).toBeLessThanOrEqual(100);
    const attached = r.rules.flatMap((x) => x.member_tip_ids);
    expect(attached.length).toBe(107);
    expect(new Set(attached).size).toBe(107);
  });

  it("compression ratio < 1 (rules fewer than tips)", () => {
    const tips = makeTips(107);
    const r = engine.distill({ tips });
    expect(r.stats.compression_ratio).toBeLessThan(1);
  });
});

describe("WEDMKnowledgeDistillationEngine — clustering behaviour", () => {
  it("tips with the same category + tag collapse into one rule", () => {
    const tips: DistilTip[] = [
      {
        id: "a",
        title: "Reduce wire break risk on corners",
        body: "Reduce ON time.",
        category: "troubleshooting",
        tags: ["wire-edm", "wire-break"],
        confidence: 0.9,
      },
      {
        id: "b",
        title: "Reduce wire break risk in thick sections",
        body: "Increase flushing.",
        category: "troubleshooting",
        tags: ["wire-edm", "wire-break"],
        confidence: 0.8,
      },
    ];
    const r = engine.distill({ tips });
    expect(r.rules.length).toBe(1);
    expect(r.rules[0].member_tip_ids.sort()).toEqual(["a", "b"]);
    expect(r.rules[0].category).toBe("troubleshooting");
    expect(r.rules[0].topic).toBe("wire-break");
  });

  it("different categories produce separate rules even with same tag", () => {
    const tips: DistilTip[] = [
      {
        id: "a",
        title: "Reduce wire break risk",
        body: "Reduce ON time.",
        category: "troubleshooting",
        tags: ["wire-edm", "wire-break"],
      },
      {
        id: "b",
        title: "Reduce wire break risk",
        body: "Use coated wire.",
        category: "tooling",
        tags: ["wire-edm", "wire-break"],
      },
    ];
    const r = engine.distill({ tips });
    expect(r.rules.length).toBe(2);
  });

  it("falls back to title bigram when no useful tags exist", () => {
    const tips: DistilTip[] = [
      {
        id: "no-tag",
        title: "Flush pressure at corners",
        body: "Keep pressure high.",
        category: "flushing",
      },
    ];
    const r = engine.distill({ tips });
    expect(r.rules.length).toBe(1);
    expect(r.rules[0].topic).toMatch(/flush|pressure/);
  });

  it("ignores noise tags like 'wire-edm' when picking topic", () => {
    const tips: DistilTip[] = [
      {
        id: "noise",
        title: "Some tip",
        body: "Body.",
        category: "troubleshooting",
        tags: ["wire-edm", "edm", "wedm", "tension"],
      },
    ];
    const r = engine.distill({ tips });
    expect(r.rules[0].topic).toBe("tension");
  });
});

describe("WEDMKnowledgeDistillationEngine — rule contents", () => {
  it("confidence is the mean of member confidences (normalised to 0..1)", () => {
    const tips: DistilTip[] = [
      {
        id: "c1",
        title: "Keep flushing high",
        body: "Keep flushing high in deep cuts.",
        category: "flushing",
        tags: ["wire-edm", "flushing"],
        confidence: 80, // 0..100 scale → 0.8
      },
      {
        id: "c2",
        title: "Keep flushing high",
        body: "Keep flushing high in thick sections.",
        category: "flushing",
        tags: ["wire-edm", "flushing"],
        confidence: 0.6, // 0..1 scale
      },
    ];
    const r = engine.distill({ tips });
    expect(r.rules[0].confidence).toBeCloseTo(0.7, 4);
  });

  it("action is derived from an imperative sentence", () => {
    const tips: DistilTip[] = [
      {
        id: "t1",
        title: "Reduce ON time before raising tension",
        body: "Reduce ON time by 10-15%.",
        category: "troubleshooting",
        tags: ["wire-edm", "tension"],
      },
    ];
    const r = engine.distill({ tips });
    expect(r.rules[0].action.toLowerCase()).toContain("reduce");
  });

  it("sources deduplicate across member tips", () => {
    const tips: DistilTip[] = [
      {
        id: "s1",
        title: "A",
        body: "Use coated wire.",
        category: "tooling",
        tags: ["wire-edm", "coated-wire"],
        source: "handbook:reliable_edm_ch5",
      },
      {
        id: "s2",
        title: "B",
        body: "Use coated wire.",
        category: "tooling",
        tags: ["wire-edm", "coated-wire"],
        source: "handbook:reliable_edm_ch5",
      },
    ];
    const r = engine.distill({ tips });
    expect(r.rules[0].sources).toEqual(["handbook:reliable_edm_ch5"]);
  });
});

describe("WEDMKnowledgeDistillationEngine — max_rules cap", () => {
  it("caps rules at max_rules by merging the lowest-priority ones", () => {
    const tips = makeTips(40);
    const r = engine.distill({ tips, max_rules: 5 });
    expect(r.rules.length).toBeLessThanOrEqual(5);
    const attached = r.rules.flatMap((x) => x.member_tip_ids);
    expect(attached.length).toBe(40);
    expect(new Set(attached).size).toBe(40);
  });

  it("respects default cap of 100", () => {
    const tips = makeTips(200);
    const r = engine.distill({ tips });
    expect(r.rules.length).toBeLessThanOrEqual(100);
  });
});

describe("WEDMKnowledgeDistillationEngine — validation", () => {
  it("throws on empty tips array", () => {
    expect(() => engine.distill({ tips: [] })).toThrow(/at least one tip/);
  });

  it("throws on missing tip id", () => {
    expect(() =>
      engine.distill({
        tips: [
          {
            id: "",
            title: "x",
            body: "x",
            category: "c",
          },
        ],
      }),
    ).toThrow(/id/);
  });

  it("throws on missing title", () => {
    expect(() =>
      engine.distill({
        tips: [
          {
            id: "x",
            title: "",
            body: "x",
            category: "c",
          },
        ],
      }),
    ).toThrow(/title/);
  });

  it("throws on duplicate tip ids", () => {
    expect(() =>
      engine.distill({
        tips: [
          { id: "x", title: "A", body: "b", category: "c" },
          { id: "x", title: "B", body: "b", category: "c" },
        ],
      }),
    ).toThrow(/duplicate/);
  });

  it("throws on invalid max_rules", () => {
    expect(() =>
      engine.distill({
        tips: [{ id: "x", title: "A", body: "b", category: "c" }],
        max_rules: 0,
      }),
    ).toThrow(/max_rules/);
  });
});

describe("WEDMKnowledgeDistillationEngine — singleton", () => {
  it("exposes a singleton for dispatcher use", () => {
    expect(wedmKnowledgeDistillationEngine).toBeInstanceOf(
      WEDMKnowledgeDistillationEngine,
    );
  });
});
