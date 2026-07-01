/**
 * Tests for INFRA-AGI-ROUTER-MS2/P0-U01 — DomainAGIIntent + DomainAGIResult.
 *
 * Coverage matrix per U01 acceptance:
 *   - 5 valid intents per domain (mill/lathe/wedm) = 15 valid intent cases
 *   - 5 invalid rejection paths
 *   - + helper-function tests (domainForAction, actionsForDomain)
 *   - + DomainAGIResult contract tests (success/failure invariants, decision validation)
 *
 * Every assertion checks a concrete value (no presence-only / weak-assertion patterns).
 *
 * @module __tests__/domainAGIContract
 * @milestone INFRA-AGI-ROUTER-MS2/P0-U01
 */

import { describe, it, expect } from "vitest";

import {
  DOMAIN_AGI_CONTRACT_VERSION,
  DomainAGIIntentSchema,
  DomainAGIResultSchema,
  MillAction,
  LatheAction,
  WedmAction,
  DomainKind,
  domainForAction,
  actionsForDomain,
  type DomainAGIIntent,
  type DomainAGIResult,
} from "../schemas/domainAGIContract.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal-but-complete intent skeleton; tests override per case. */
function baseIntent(overrides: Partial<DomainAGIIntent> & Pick<DomainAGIIntent, "domain" | "action" | "material">): DomainAGIIntent {
  return {
    schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
    features: [],
    constraints: {},
    consensusRequired: false,
    ...overrides,
  } as DomainAGIIntent;
}

/** Build a minimal-but-complete result skeleton. */
function baseResult(overrides: Partial<DomainAGIResult>): DomainAGIResult {
  return {
    schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
    success: true,
    decisions: [],
    confidence: 0.9,
    outcomes: [],
    warnings: [],
    ...overrides,
  } as DomainAGIResult;
}

/** Join all error issue paths into "a.b.c | x.y" strings for concrete content matching. */
function pathString(parsed: { success: false; error: { issues: Array<{ path: ReadonlyArray<string | number>; message: string }> } }): string {
  return parsed.error.issues.map((i) => i.path.join(".")).join(" | ");
}

/** Join all error issue messages for concrete content matching. */
function messageString(parsed: { success: false; error: { issues: Array<{ path: ReadonlyArray<string | number>; message: string }> } }): string {
  return parsed.error.issues.map((i) => i.message).join(" | ");
}

// ─── 5 valid MILL intents ────────────────────────────────────────────────────

describe("DomainAGIIntent — mill domain (5 valid intents)", () => {
  it("accepts mill / roughing — basic features, no constraints", () => {
    const intent = baseIntent({
      domain: "mill",
      action: "roughing",
      material: "1018-steel",
      features: [
        { id: "F-001", kind: "pocket", dimensions: { length_mm: 100, width_mm: 50, depth_mm: 20 } },
      ],
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.domain).toBe("mill");
      expect(parsed.data.action).toBe("roughing");
      expect(parsed.data.material).toBe("1018-steel");
      expect(parsed.data.features).toHaveLength(1);
      expect(parsed.data.features[0]?.id).toBe("F-001");
      expect(parsed.data.features[0]?.kind).toBe("pocket");
      expect(parsed.data.features[0]?.dimensions?.depth_mm).toBe(20);
    }
  });

  it("accepts mill / finishing — with tolerance + Ra constraint", () => {
    const intent = baseIntent({
      domain: "mill",
      action: "finishing",
      material: "Ti-6Al-4V",
      features: [{ id: "F-002", kind: "contour", tolerance_um: 12.5, surface_finish_ra_um: 0.8 }],
      constraints: { surface_finish_max_ra_um: 0.8, tolerance_class: "fine" },
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.constraints.tolerance_class).toBe("fine");
      expect(parsed.data.constraints.surface_finish_max_ra_um).toBe(0.8);
      expect(parsed.data.features[0]?.tolerance_um).toBe(12.5);
      expect(parsed.data.features[0]?.surface_finish_ra_um).toBe(0.8);
    }
  });

  it("accepts mill / drilling — with explicit machine ref", () => {
    const intent = baseIntent({
      domain: "mill",
      action: "drilling",
      material: "6061-T6-aluminum",
      machine: { id: "JM-DIE-HAAS-VF2", rigidity_tier: "medium", controller: "Haas NGC" },
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.machine?.id).toBe("JM-DIE-HAAS-VF2");
      expect(parsed.data.machine?.rigidity_tier).toBe("medium");
      expect(parsed.data.machine?.controller).toBe("Haas NGC");
      expect(parsed.data.action).toBe("drilling");
    }
  });

  it("accepts mill / boring — with consensusRequired=true", () => {
    const intent = baseIntent({
      domain: "mill",
      action: "boring",
      material: "AISI-316L",
      consensusRequired: true,
      features: [{ id: "F-003", kind: "bore", dimensions: { diameter_mm: 50.0, depth_mm: 75 } }],
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.consensusRequired).toBe(true);
      expect(parsed.data.action).toBe("boring");
      expect(parsed.data.features[0]?.kind).toBe("bore");
      expect(parsed.data.features[0]?.dimensions?.diameter_mm).toBe(50.0);
    }
  });

  it("accepts mill / pocketing — with blueprint reference (path + sha256)", () => {
    const intent = baseIntent({
      domain: "mill",
      action: "pocketing",
      material: "1018-steel",
      blueprint: {
        path: "blueprints/part-12345-rev-B.pdf",
        sha256: "a".repeat(64),
        notes: "Customer: ALCOA — Rev B 2026-05-20",
      },
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.blueprint?.path).toBe("blueprints/part-12345-rev-B.pdf");
      expect(parsed.data.blueprint?.sha256).toBe("a".repeat(64));
      expect(parsed.data.blueprint?.notes).toMatch(/ALCOA/);
    }
  });
});

// ─── 5 valid LATHE intents ───────────────────────────────────────────────────

describe("DomainAGIIntent — lathe domain (5 valid intents)", () => {
  it("accepts lathe / turning — basic features", () => {
    const intent = baseIntent({
      domain: "lathe",
      action: "turning",
      material: "1144-stressproof",
      features: [{ id: "F-101", kind: "cylinder", dimensions: { diameter_mm: 25.4, length_mm: 100 } }],
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.domain).toBe("lathe");
      expect(parsed.data.action).toBe("turning");
      expect(parsed.data.material).toBe("1144-stressproof");
      expect(parsed.data.features[0]?.dimensions?.diameter_mm).toBe(25.4);
    }
  });

  it("accepts lathe / threading — with tolerance constraint", () => {
    const intent = baseIntent({
      domain: "lathe",
      action: "threading",
      material: "12L14",
      features: [{ id: "F-102", kind: "thread", dimensions: { major_diameter_mm: 12.0, pitch_mm: 1.75 } }],
      constraints: { tolerance_class: "medium" },
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.constraints.tolerance_class).toBe("medium");
      expect(parsed.data.action).toBe("threading");
      expect(parsed.data.features[0]?.dimensions?.pitch_mm).toBe(1.75);
    }
  });

  it("accepts lathe / parting — with machine ref (Okuma)", () => {
    const intent = baseIntent({
      domain: "lathe",
      action: "parting",
      material: "1018-steel",
      machine: { id: "JM-DIE-OKUMA-LB3000", rigidity_tier: "heavy", controller: "Okuma OSP-P300" },
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.machine?.controller).toBe("Okuma OSP-P300");
      expect(parsed.data.machine?.rigidity_tier).toBe("heavy");
      expect(parsed.data.action).toBe("parting");
    }
  });

  it("accepts lathe / facing — with cycle time + cost constraints", () => {
    const intent = baseIntent({
      domain: "lathe",
      action: "facing",
      material: "6061-T6-aluminum",
      constraints: { cycle_time_max_min: 12.5, cost_max_usd: 42.0 },
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.constraints.cycle_time_max_min).toBe(12.5);
      expect(parsed.data.constraints.cost_max_usd).toBe(42.0);
      expect(parsed.data.action).toBe("facing");
    }
  });

  it("accepts lathe / grooving — with blueprint (sha256-only)", () => {
    const intent = baseIntent({
      domain: "lathe",
      action: "grooving",
      material: "303-stainless",
      blueprint: { sha256: "f".repeat(64) },
      consensusRequired: true,
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.blueprint?.sha256).toBe("f".repeat(64));
      expect(parsed.data.blueprint?.path).toBe(undefined);
      expect(parsed.data.consensusRequired).toBe(true);
      expect(parsed.data.action).toBe("grooving");
    }
  });
});

// ─── 5 valid WEDM intents ────────────────────────────────────────────────────

describe("DomainAGIIntent — wedm domain (5 valid intents)", () => {
  it("accepts wedm / rough_cut — basic features", () => {
    const intent = baseIntent({
      domain: "wedm",
      action: "rough_cut",
      material: "D2-tool-steel",
      features: [{ id: "F-201", kind: "profile", dimensions: { perimeter_mm: 250, thickness_mm: 50 } }],
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.domain).toBe("wedm");
      expect(parsed.data.action).toBe("rough_cut");
      expect(parsed.data.features[0]?.dimensions?.thickness_mm).toBe(50);
    }
  });

  it("accepts wedm / skim_pass — with Ra target", () => {
    const intent = baseIntent({
      domain: "wedm",
      action: "skim_pass",
      material: "H13",
      features: [{ id: "F-202", kind: "profile", surface_finish_ra_um: 0.4 }],
      constraints: { surface_finish_max_ra_um: 0.4 },
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.constraints.surface_finish_max_ra_um).toBe(0.4);
      expect(parsed.data.features[0]?.surface_finish_ra_um).toBe(0.4);
      expect(parsed.data.action).toBe("skim_pass");
    }
  });

  it("accepts wedm / taper_cut — with machine ref (Sodick)", () => {
    const intent = baseIntent({
      domain: "wedm",
      action: "taper_cut",
      material: "carbide",
      machine: { id: "JM-DIE-SODICK-AQ750L", rigidity_tier: "heavy", controller: "Sodick LN" },
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.machine?.id).toBe("JM-DIE-SODICK-AQ750L");
      expect(parsed.data.machine?.controller).toBe("Sodick LN");
      expect(parsed.data.action).toBe("taper_cut");
    }
  });

  it("accepts wedm / start_hole — with blueprint", () => {
    const intent = baseIntent({
      domain: "wedm",
      action: "start_hole",
      material: "A2-tool-steel",
      blueprint: { path: "blueprints/wedm/part-998.dxf" },
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.blueprint?.path).toBe("blueprints/wedm/part-998.dxf");
      expect(parsed.data.action).toBe("start_hole");
      expect(parsed.data.material).toBe("A2-tool-steel");
    }
  });

  it("accepts wedm / corner_strategy — with safety_floor constraint", () => {
    const intent = baseIntent({
      domain: "wedm",
      action: "corner_strategy",
      material: "M2-tool-steel",
      consensusRequired: true,
      constraints: { safety_floor: 0.95 },
    });
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.constraints.safety_floor).toBe(0.95);
      expect(parsed.data.consensusRequired).toBe(true);
      expect(parsed.data.action).toBe("corner_strategy");
    }
  });
});

// ─── 5 invalid rejection paths ───────────────────────────────────────────────

describe("DomainAGIIntent — 5 invalid rejection paths", () => {
  it("rejects wrong schema version 0.9.0", () => {
    const intent = {
      schemaVersion: "0.9.0",
      domain: "mill",
      action: "roughing",
      features: [],
      material: "1018",
      constraints: {},
      consensusRequired: false,
    };
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(pathString(parsed)).toMatch(/schemaVersion/);
    }
  });

  it("rejects action that does not belong to the named domain (mill domain + lathe-only action)", () => {
    const intent = {
      schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
      domain: "mill",
      action: "threading", // threading is LATHE-only, not in MillAction
      features: [],
      material: "1018",
      constraints: {},
      consensusRequired: false,
    };
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      // Per-file scrutiny arm B P1#1 — silent-pass risk pinned. The base
      // z.union accepts "threading" because LatheAction has it; only the
      // superRefine catches the domain mismatch. Asserting the SPECIFIC
      // custom issue at path=["action"] makes deleting the superRefine
      // flip this test to failing (the weaker pathString.match(/action/)
      // would still pass on the base union's unrelated error noise).
      const customActionIssue = parsed.error.issues.find(
        (i) => i.path.join(".") === "action" && i.code === "custom",
      );
      expect(customActionIssue?.message ?? "").toMatch(/not valid for domain 'mill'/);
      expect(customActionIssue?.message ?? "").toMatch(/Valid actions:/);
    }
  });

  it("rejects invalid domain enum value 'grinder'", () => {
    const intent = {
      schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
      domain: "grinder", // grinder not in DomainKind enum
      action: "roughing",
      features: [],
      material: "1018",
      constraints: {},
      consensusRequired: false,
    };
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(pathString(parsed)).toMatch(/domain/);
    }
  });

  it("rejects missing required `material` field", () => {
    const intent = {
      schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
      domain: "mill",
      action: "roughing",
      features: [],
      // material: MISSING
      constraints: {},
      consensusRequired: false,
    };
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(pathString(parsed)).toMatch(/material/);
    }
  });

  it("rejects empty-string material (violates min(1))", () => {
    const intent = {
      schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
      domain: "wedm",
      action: "rough_cut",
      features: [],
      material: "", // empty — violates min(1)
      constraints: {},
      consensusRequired: false,
    };
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(pathString(parsed)).toMatch(/material/);
    }
  });
});

// ─── Helper function tests ───────────────────────────────────────────────────

describe("domainForAction helper", () => {
  it("maps mill-only actions → 'mill'", () => {
    expect(domainForAction("roughing")).toBe("mill");
    expect(domainForAction("finishing")).toBe("mill");
    expect(domainForAction("pocketing")).toBe("mill");
    expect(domainForAction("tapping")).toBe("mill");
    expect(domainForAction("thread_milling")).toBe("mill");
  });

  it("maps lathe-only actions → 'lathe'", () => {
    expect(domainForAction("turning")).toBe("lathe");
    expect(domainForAction("threading")).toBe("lathe");
    expect(domainForAction("parting")).toBe("lathe");
    expect(domainForAction("grooving")).toBe("lathe");
    expect(domainForAction("knurling")).toBe("lathe");
    expect(domainForAction("chamfering")).toBe("lathe");
  });

  it("maps wedm actions → 'wedm'", () => {
    expect(domainForAction("rough_cut")).toBe("wedm");
    expect(domainForAction("skim_pass")).toBe("wedm");
    expect(domainForAction("taper_cut")).toBe("wedm");
    expect(domainForAction("start_hole")).toBe("wedm");
    expect(domainForAction("no_core_cut")).toBe("wedm");
    expect(domainForAction("corner_strategy")).toBe("wedm");
  });

  it("returns null for actions ambiguous between mill + lathe (drilling, boring, facing)", () => {
    expect(domainForAction("drilling")).toBe(null);
    expect(domainForAction("boring")).toBe(null);
    expect(domainForAction("facing")).toBe(null);
  });

  it("returns null for unknown action verbs", () => {
    expect(domainForAction("welding")).toBe(null);
    expect(domainForAction("waterjet_cut")).toBe(null);
    expect(domainForAction("")).toBe(null);
  });
});

describe("actionsForDomain helper", () => {
  it("returns the exact mill action list (10 actions, includes the U02 acceptance trio)", () => {
    const actions = actionsForDomain("mill");
    expect(actions).toContain("roughing");
    expect(actions).toContain("finishing");
    expect(actions).toContain("drilling");
    expect(actions.length).toBe(10);
  });

  it("returns the exact lathe action list (9 actions, includes the U03 acceptance trio)", () => {
    const actions = actionsForDomain("lathe");
    expect(actions).toContain("turning");
    expect(actions).toContain("threading");
    expect(actions).toContain("parting");
    expect(actions.length).toBe(9);
  });

  it("returns the exact wedm action list (6 actions, includes the U04 acceptance trio)", () => {
    const actions = actionsForDomain("wedm");
    expect(actions).toContain("rough_cut");
    expect(actions).toContain("skim_pass");
    expect(actions).toContain("taper_cut");
    expect(actions.length).toBe(6);
  });
});

// ─── DomainAGIResult tests ───────────────────────────────────────────────────

describe("DomainAGIResult", () => {
  it("accepts a valid success=true result with one tool decision + gcode", () => {
    const result = baseResult({
      decisions: [
        {
          kind: "tool",
          value: "endmill-12mm-4flute-TiAlN",
          confidence: 0.92,
          source: "KienzleForceModel",
          rationale: "Optimal MRR for 1018 steel pocketing at this depth.",
        },
      ],
      gcode: "%\nO1234\nT1 M06\n...\n%",
      confidence: 0.88,
    });
    const parsed = DomainAGIResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.decisions).toHaveLength(1);
      expect(parsed.data.decisions[0]?.kind).toBe("tool");
      expect(parsed.data.decisions[0]?.value).toBe("endmill-12mm-4flute-TiAlN");
      expect(parsed.data.decisions[0]?.confidence).toBe(0.92);
      expect(parsed.data.decisions[0]?.source).toBe("KienzleForceModel");
      expect(parsed.data.confidence).toBe(0.88);
      expect(parsed.data.gcode).toMatch(/^%/);
    }
  });

  it("rejects success=false WITHOUT error object (superRefine invariant)", () => {
    const result = baseResult({ success: false });
    const parsed = DomainAGIResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(pathString(parsed)).toMatch(/error/);
      expect(messageString(parsed)).toMatch(/success=false must populate the `error` field/);
    }
  });

  it("accepts success=false WITH error object (code + message + stage)", () => {
    const result = baseResult({
      success: false,
      confidence: 0.0,
      error: {
        code: "INFEASIBLE_GEOMETRY",
        message: "Internal pocket corner radius below minimum tool radius.",
        stage: "toolpath_generate",
      },
    });
    const parsed = DomainAGIResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.success).toBe(false);
      expect(parsed.data.error?.code).toBe("INFEASIBLE_GEOMETRY");
      expect(parsed.data.error?.stage).toBe("toolpath_generate");
      expect(parsed.data.error?.message).toMatch(/corner radius/);
      expect(parsed.data.confidence).toBe(0.0);
    }
  });

  it("rejects per-decision confidence above 1.0", () => {
    const result = baseResult({
      decisions: [{ kind: "tool", value: "endmill", confidence: 1.5, source: "test" }],
    });
    const parsed = DomainAGIResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(pathString(parsed)).toMatch(/confidence/);
    }
  });

  it("rejects pipeline confidence below 0", () => {
    const result = baseResult({ confidence: -0.1 });
    const parsed = DomainAGIResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(pathString(parsed)).toMatch(/confidence/);
    }
  });

  it("accepts result carrying a canonical OutcomeEvent in outcomes[]", () => {
    const result = baseResult({
      outcomes: [
        {
          schemaVersion: "1.0.0",
          event_id: "evt-test-001",
          lineage_id: "lin-001",
          domain: "mill",
          kind: "recommendation_emitted",
          severity: "info",
          source: "system",
          timestamp: "2026-05-20T00:00:00Z",
          context: { engine: "MillingAGIMasterEngine", operation: "roughing" },
        },
      ],
    });
    const parsed = DomainAGIResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.outcomes).toHaveLength(1);
      expect(parsed.data.outcomes[0]?.event_id).toBe("evt-test-001");
      expect(parsed.data.outcomes[0]?.kind).toBe("recommendation_emitted");
      expect(parsed.data.outcomes[0]?.domain).toBe("mill");
      expect(parsed.data.outcomes[0]?.source).toBe("system");
    }
  });

  // Per-file scrutiny test arm B P1#2 — inverse of the success=false⇒error
  // invariant. A future maintainer who flips the superRefine predicate
  // would break this test; without it the asymmetric invariant could
  // silently widen to "always require error" without the suite noticing.
  it("accepts success=true result with NO error field (inverse of cross-field invariant)", () => {
    const result = baseResult({ success: true, error: undefined });
    const parsed = DomainAGIResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.error).toBe(undefined);
    }
  });
});

// ─── Schema metadata invariants ──────────────────────────────────────────────

describe("schema version + enum invariants", () => {
  it("exports the canonical schema version literal '1.0.0'", () => {
    expect(DOMAIN_AGI_CONTRACT_VERSION).toBe("1.0.0");
  });

  it("DomainKind options are exactly the three router targets", () => {
    expect(new Set(DomainKind.options)).toEqual(new Set(["mill", "lathe", "wedm"]));
  });

  it("MillAction contains the U02 acceptance trio (roughing, finishing, drilling)", () => {
    expect(MillAction.options).toContain("roughing");
    expect(MillAction.options).toContain("finishing");
    expect(MillAction.options).toContain("drilling");
  });

  it("LatheAction contains the U03 acceptance trio (turning, threading, parting)", () => {
    expect(LatheAction.options).toContain("turning");
    expect(LatheAction.options).toContain("threading");
    expect(LatheAction.options).toContain("parting");
  });

  it("WedmAction contains the U04 acceptance trio (rough_cut, skim_pass, taper_cut)", () => {
    expect(WedmAction.options).toContain("rough_cut");
    expect(WedmAction.options).toContain("skim_pass");
    expect(WedmAction.options).toContain("taper_cut");
  });
});
