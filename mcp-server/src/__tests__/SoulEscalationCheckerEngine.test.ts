/** SoulEscalationCheckerEngine tests — HSE03. */
import { describe, it, expect } from "vitest";
import { SoulEscalationCheckerEngine } from "../engines/SoulEscalationCheckerEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";

const SOUL = (over: Partial<SlotSoul> = {}): SlotSoul => ({
  slot: "bravo",
  role: "mill-specialist",
  voice: "v",
  tone: "t",
  refuse_list: [],
  preferred_subagent_type: "physics-reviewer",
  domain_filter: "mill|kienzle|taylor",
  escalation_path: "validate-kc-taylor-constants-before-edit; defer-safety-to-physics-reviewer",
  hermes_role: "specialist-mill",
  body: "",
  ...over,
});

describe("SoulEscalationCheckerEngine.check — happy", () => {
  it("file matches domain_filter + subagent spawned → satisfied=true", () => {
    const r = SoulEscalationCheckerEngine.check(SOUL(), {
      filepath: "src/engines/KienzleForceModel.ts",
      intent_keywords: ["force"],
      spawned_subagent_types: ["physics-reviewer"],
    });
    expect(r.satisfied).toBe(true);
    expect(r.missing_subagent_types).toEqual([]);
  });

  it("file matches but subagent NOT spawned → satisfied=false, missing list populated", () => {
    const r = SoulEscalationCheckerEngine.check(SOUL(), {
      filepath: "src/engines/KienzleForceModel.ts",
      intent_keywords: [],
      spawned_subagent_types: [],
    });
    expect(r.satisfied).toBe(false);
    expect(r.missing_subagent_types).toContain("physics-reviewer");
  });

  it("file outside domain_filter + no defer-rule → no requirement → satisfied=true", () => {
    // Soul with no escalation_path AND a domain_filter that won't match — should require nothing.
    const r = SoulEscalationCheckerEngine.check(
      SOUL({ escalation_path: undefined }),
      { filepath: "src/utils/string.ts", intent_keywords: [], spawned_subagent_types: [] },
    );
    expect(r.satisfied).toBe(true);
    expect(r.required_subagent_types).toEqual([]);
  });

  it("intent_keyword triggers domain match", () => {
    const r = SoulEscalationCheckerEngine.check(SOUL(), {
      filepath: "src/x.ts",
      intent_keywords: ["kienzle"],
      spawned_subagent_types: ["physics-reviewer"],
    });
    expect(r.satisfied).toBe(true);
  });
});

describe("SoulEscalationCheckerEngine.check — escalation_path parsing", () => {
  it("'defer-X-to-Y' lexeme requires Y as subagent", () => {
    const r = SoulEscalationCheckerEngine.check(
      SOUL({ escalation_path: "defer-business-to-financial-reviewer", domain_filter: "anything" }),
      { filepath: "x.ts", intent_keywords: [], spawned_subagent_types: ["physics-reviewer"] },
    );
    expect(r.required_subagent_types).toContain("financial-reviewer");
    expect(r.satisfied).toBe(false);
  });

  it("validation_required flag set when path has 'validate-X-before-edit'", () => {
    const r = SoulEscalationCheckerEngine.check(SOUL(), {
      filepath: "src/engines/KienzleForceModel.ts",
      intent_keywords: [],
      spawned_subagent_types: ["physics-reviewer"],
    });
    expect(r.validation_required).toBe(true);
  });

  it("no escalation_path → validation_required=false", () => {
    const r = SoulEscalationCheckerEngine.check(SOUL({ escalation_path: undefined }), {
      filepath: "src/x.ts",
      intent_keywords: [],
      spawned_subagent_types: [],
    });
    expect(r.validation_required).toBe(false);
  });
});

describe("SoulEscalationCheckerEngine.check — failure modes", () => {
  it("missing soul throws", () => {
    expect(() =>
      SoulEscalationCheckerEngine.check(null as never, {
        filepath: "x",
        intent_keywords: [],
        spawned_subagent_types: [],
      }),
    ).toThrow();
  });

  it("empty filepath → zod throws", () => {
    expect(() =>
      SoulEscalationCheckerEngine.check(SOUL(), {
        filepath: "",
        intent_keywords: [],
        spawned_subagent_types: [],
      }),
    ).toThrow();
  });

  it("bad regex in domain_filter → fail-soft (domain rule skipped; defer-rule still applies)", () => {
    // The defer-rule still requires physics-reviewer via lexeme parsing — that's intended.
    // What the bad regex must NOT do: add a SECOND/duplicate physics-reviewer from domain_filter.
    const r = SoulEscalationCheckerEngine.check(SOUL({ domain_filter: "[unclosed" }), {
      filepath: "src/anything.ts",
      intent_keywords: [],
      spawned_subagent_types: ["physics-reviewer"],
    });
    expect(r.satisfied).toBe(true);
    // Required from defer-rule only — exactly 1 occurrence, no dup from bad-regex domain match.
    expect(r.required_subagent_types.filter((s) => s === "physics-reviewer").length).toBe(1);
  });

  it("renderCheck shows tag + counts", () => {
    const md = SoulEscalationCheckerEngine.renderCheck(
      SoulEscalationCheckerEngine.check(SOUL(), {
        filepath: "src/engines/Kienzle.ts",
        intent_keywords: [],
        spawned_subagent_types: ["physics-reviewer"],
      }),
    );
    expect(md.includes("[ESCALATION OK]")).toBe(true);
  });

  it("renderCheck shows MISSING tag when not satisfied", () => {
    const md = SoulEscalationCheckerEngine.renderCheck(
      SoulEscalationCheckerEngine.check(SOUL(), {
        filepath: "src/engines/Kienzle.ts",
        intent_keywords: [],
        spawned_subagent_types: [],
      }),
    );
    expect(md.includes("[ESCALATION MISSING]")).toBe(true);
  });
});
