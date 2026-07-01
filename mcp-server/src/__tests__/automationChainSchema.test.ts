/**
 * ACP-MS0A — Automation Chain Contract Schema Tests
 * =================================================
 * Reference-value + invariant tests that FREEZE the Automation Control Plane
 * contract defined in `src/schemas/automationChainSchema.ts`. This is the
 * milestone exit-condition "automation-chain JSON schema frozen and validated"
 * (ACP-MS0A P0): the schema is the dependency-ordered foundation that ACP-MS1+
 * (entry router, post-tool validation, context-trim) will build on, so it must
 * be proven BEFORE those consumers exist (R13).
 *
 * Each test encodes WHY the contract value matters (R9 — verify intent):
 *  - A `critical` tier flipped from fail_closed to degrade_silent would let a
 *    safety-critical automation chain silently continue on failure.
 *  - A token-budget cap silently raised would defeat the whole token-economy
 *    purpose of the control plane (alpha's domain).
 *  - A trigger/telemetry field loosened would break the future MS1 router that
 *    consumes these objects.
 *
 * @module __tests__/automationChainSchema.test
 * @milestone ACP-MS0A
 */

import { describe, it, expect } from "vitest";
import {
  TaskClassSchema,
  ChainTierSchema,
  FailBehaviorSchema,
  TriggerTypeSchema,
  ChainTriggerSchema,
  ContextBundleSchema,
  ChainStepSchema,
  BudgetEnforcementSchema,
  AutomationChainSchema,
  TelemetryEventStatusSchema,
  TelemetryEventSchema,
  CommandMappingSchema,
  EventMappingSchema,
  TierFailRulesSchema,
  TIER_FAIL_RULES,
  TOKEN_BUDGET_GUIDELINES,
} from "../schemas/automationChainSchema.js";

// A complete, minimal-but-valid chain used as the happy-path baseline. Built
// once so each failure test mutates a copy of a KNOWN-GOOD object (so a failure
// is attributable to the one mutated field, not an unrelated omission).
function validChain() {
  return {
    id: "coding.backend.standard",
    task_class: "backend" as const,
    tier: "standard" as const,
    triggers: [
      { type: "slash_command" as const, pattern: "smart", priority: 10, enabled: true },
    ],
    token_budget: 2000,
    budget_enforcement: {
      max_tokens: 2000,
      soft_limit_pct: 80,
      hard_limit_pct: 100,
      on_soft_limit: "warn" as const,
      on_hard_limit: "fail" as const,
      rollover: false,
    },
    context_bundles: [
      { id: "engine-digest", files: ["ENGINE_DIGEST.md"], purpose: "engine lookup", token_cost_estimate: 1200, optional: false },
    ],
    steps: [
      { id: "classify", action: "classify_task", description: "Classify the task", required: true, timeout_ms: 5000, retry_count: 0 },
    ],
    fail_behavior: "degrade_warn" as const,
    downstream_hooks: ["post-build-verify"],
  };
}

describe("ACP-MS0A enums — the contract vocabulary is frozen", () => {
  it("TaskClassSchema covers exactly the 9 documented task classes", () => {
    expect(TaskClassSchema.options).toEqual([
      "backend", "web", "cad_python", "roadmap", "audit",
      "speed_feed", "post_process", "erp", "general",
    ]);
  });

  it("ChainTierSchema is exactly the 3 fail-severity tiers", () => {
    expect(ChainTierSchema.options).toEqual(["critical", "standard", "background"]);
  });

  it("FailBehaviorSchema is exactly the 4 documented downgrade behaviors (P0-U03)", () => {
    expect(FailBehaviorSchema.options).toEqual([
      "fail_closed", "degrade_silent", "degrade_warn", "ask_user",
    ]);
  });

  it("TriggerTypeSchema covers all 5 activation sources (P0-U02)", () => {
    expect(TriggerTypeSchema.options).toEqual([
      "hook_event", "slash_command", "keyword", "session_event", "schedule",
    ]);
  });

  it("TelemetryEventStatusSchema includes budget_exceeded + timeout outcomes (P0-U04)", () => {
    expect(TelemetryEventStatusSchema.options).toEqual([
      "started", "completed", "failed", "skipped", "timeout", "budget_exceeded",
    ]);
    // Rejects an undocumented outcome (the telemetry consumer must not see one).
    expect(TelemetryEventStatusSchema.safeParse("partial").success).toBe(false);
  });
});

describe("ACP-MS0A P0-U03 — TIER_FAIL_RULES downgrade doctrine (reference values)", () => {
  // Behavioral projection (strip the human-prose `description`): freezes the
  // CONTRACT (fail behavior / retries / escalation / telemetry) by deep equality
  // so any change to a tier's downgrade semantics fails this test, while prose
  // re-wording does not. Order + count are frozen too (array equality).
  const behavior = TIER_FAIL_RULES.map(({ description, ...rest }) => rest);

  it("freezes the full per-tier downgrade contract (behavior, retries, escalation, telemetry)", () => {
    expect(behavior).toEqual([
      { tier: "critical",   default_fail_behavior: "fail_closed",    retry_allowed: false, max_retries: 0, escalation_path: "abort", telemetry_required: true },
      { tier: "standard",   default_fail_behavior: "degrade_warn",   retry_allowed: true,  max_retries: 1, escalation_path: "user",  telemetry_required: true },
      { tier: "background", default_fail_behavior: "degrade_silent", retry_allowed: true,  max_retries: 2, escalation_path: "log",   telemetry_required: false },
    ]);
  });

  it("critical tier is fail_closed with zero retries (a safety-critical chain never silently continues)", () => {
    // The single highest-stakes invariant, asserted on its own so a regression
    // names THIS property in the failure output, not a 3-element array diff.
    const critical = behavior.find((r) => r.tier === "critical");
    expect(critical).toEqual({
      tier: "critical", default_fail_behavior: "fail_closed", retry_allowed: false,
      max_retries: 0, escalation_path: "abort", telemetry_required: true,
    });
  });

  it("defines exactly one rule per ChainTier (no tier left without a fail rule)", () => {
    expect(TIER_FAIL_RULES.map((r) => r.tier).sort()).toEqual([...ChainTierSchema.options].sort());
    expect(TIER_FAIL_RULES.length).toBe(ChainTierSchema.options.length);
  });

  it("every rule (with its prose description) validates against TierFailRulesSchema", () => {
    for (const rule of TIER_FAIL_RULES) {
      expect(TierFailRulesSchema.safeParse(rule).success).toBe(true);
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });

  it("retry-permissiveness increases as severity decreases (critical 0 < standard 1 < background 2)", () => {
    const byTier = Object.fromEntries(TIER_FAIL_RULES.map((r) => [r.tier, r.max_retries]));
    expect(byTier.critical).toBeLessThan(byTier.standard);
    expect(byTier.standard).toBeLessThan(byTier.background);
  });
});

describe("ACP-MS0A P0-U05 — TOKEN_BUDGET_GUIDELINES (the token-economy caps)", () => {
  it("matches the brief's documented per-chain caps", () => {
    // brief: "entry router <500, coding chain <2K, product autopilot <5K"
    expect(TOKEN_BUDGET_GUIDELINES.entry_router.max).toBe(500);
    expect(TOKEN_BUDGET_GUIDELINES.coding_chain.max).toBe(2000);
    expect(TOKEN_BUDGET_GUIDELINES.product_autopilot.max).toBe(5000);
    expect(TOKEN_BUDGET_GUIDELINES.audit_chain.max).toBe(2000);
    expect(TOKEN_BUDGET_GUIDELINES.physics_chain.max).toBe(1000);
    expect(TOKEN_BUDGET_GUIDELINES.roadmap_chain.max).toBe(500);
  });

  it("the entry router is the cheapest tier and product autopilot the most expensive", () => {
    const caps = Object.values(TOKEN_BUDGET_GUIDELINES).map((g) => g.max);
    expect(TOKEN_BUDGET_GUIDELINES.entry_router.max).toBe(Math.min(...caps));
    expect(TOKEN_BUDGET_GUIDELINES.product_autopilot.max).toBe(Math.max(...caps));
  });

  it("every budget guideline is a positive integer with a non-empty description", () => {
    for (const [name, g] of Object.entries(TOKEN_BUDGET_GUIDELINES)) {
      expect(Number.isInteger(g.max), `${name}.max integer`).toBe(true);
      expect(g.max, `${name}.max positive`).toBeGreaterThan(0);
      expect(g.description.length, `${name}.description non-empty`).toBeGreaterThan(0);
    }
  });
});

describe("AutomationChainSchema — happy path + default application (P0-U01)", () => {
  it("parses a complete valid chain", () => {
    const parsed = AutomationChainSchema.parse(validChain());
    expect(parsed.id).toBe("coding.backend.standard");
    expect(parsed.tier).toBe("standard");
    expect(parsed.token_budget).toBe(2000);
  });

  it("applies documented defaults when optional fields are omitted", () => {
    const c = validChain();
    delete (c as Record<string, unknown>).triggers; // has .default([])
    const parsed = AutomationChainSchema.parse(c);
    expect(parsed.version).toBe("1.0.0"); // default
    expect(parsed.enabled).toBe(true);    // default
    expect(parsed.triggers).toEqual([]);  // default []
  });
});

describe("AutomationChainSchema — failure modes (reject malformed contracts)", () => {
  it("rejects a chain missing the required id", () => {
    const c = validChain();
    delete (c as Record<string, unknown>).id;
    expect(AutomationChainSchema.safeParse(c).success).toBe(false);
  });

  it("rejects a chain missing the required fail_behavior (P0-U03 field is mandatory)", () => {
    const c = validChain();
    delete (c as Record<string, unknown>).fail_behavior;
    expect(AutomationChainSchema.safeParse(c).success).toBe(false);
  });

  it("rejects an unknown tier enum value", () => {
    const c = { ...validChain(), tier: "super_critical" };
    expect(AutomationChainSchema.safeParse(c).success).toBe(false);
  });

  it("rejects a non-positive or non-integer token_budget (budget must be a positive int)", () => {
    expect(AutomationChainSchema.safeParse({ ...validChain(), token_budget: 0 }).success).toBe(false);
    expect(AutomationChainSchema.safeParse({ ...validChain(), token_budget: -100 }).success).toBe(false);
    expect(AutomationChainSchema.safeParse({ ...validChain(), token_budget: 2000.5 }).success).toBe(false);
  });
});

describe("AutomationChainSchema — adversarial inputs", () => {
  it("strips unknown extra fields rather than rejecting (non-strict by design)", () => {
    const c = { ...validChain(), __injected: "evil", rogue_budget: 999999 };
    const parsed = AutomationChainSchema.parse(c) as Record<string, unknown>;
    expect("__injected" in parsed).toBe(false);
    expect("rogue_budget" in parsed).toBe(false);
    // The legitimate budget is unaffected by the rogue extra field.
    expect(parsed.token_budget).toBe(2000);
  });

  it("rejects a step with a non-positive timeout (a 0ms timeout would never let a step run)", () => {
    const c = validChain();
    c.steps[0].timeout_ms = 0;
    expect(AutomationChainSchema.safeParse(c).success).toBe(false);
  });
});

describe("ChainTriggerSchema — trigger contract (P0-U01/U02)", () => {
  it("accepts all 5 trigger types and defaults priority=50, enabled=true", () => {
    for (const type of TriggerTypeSchema.options) {
      const parsed = ChainTriggerSchema.parse({ type, pattern: "x" });
      expect(parsed.priority).toBe(50);
      expect(parsed.enabled).toBe(true);
    }
  });

  it("enforces priority bounds [1,100] (boundary + out-of-range)", () => {
    expect(ChainTriggerSchema.safeParse({ type: "keyword", pattern: "x", priority: 1 }).success).toBe(true);
    expect(ChainTriggerSchema.safeParse({ type: "keyword", pattern: "x", priority: 100 }).success).toBe(true);
    expect(ChainTriggerSchema.safeParse({ type: "keyword", pattern: "x", priority: 0 }).success).toBe(false);
    expect(ChainTriggerSchema.safeParse({ type: "keyword", pattern: "x", priority: 101 }).success).toBe(false);
  });
});

describe("BudgetEnforcementSchema — enforcement contract (P0-U05)", () => {
  it("applies documented defaults", () => {
    const parsed = BudgetEnforcementSchema.parse({ max_tokens: 500 });
    expect(parsed.soft_limit_pct).toBe(80);
    expect(parsed.hard_limit_pct).toBe(100);
    expect(parsed.on_soft_limit).toBe("warn");
    expect(parsed.on_hard_limit).toBe("fail");
    expect(parsed.rollover).toBe(false);
  });

  it("rejects a limit percentage above 100 and a non-positive max_tokens", () => {
    expect(BudgetEnforcementSchema.safeParse({ max_tokens: 500, soft_limit_pct: 101 }).success).toBe(false);
    expect(BudgetEnforcementSchema.safeParse({ max_tokens: 0 }).success).toBe(false);
  });

  it("constrains on_hard_limit to the documented enforcement actions", () => {
    expect(BudgetEnforcementSchema.safeParse({ max_tokens: 500, on_hard_limit: "truncate" }).success).toBe(true);
    expect(BudgetEnforcementSchema.safeParse({ max_tokens: 500, on_hard_limit: "explode" }).success).toBe(false);
  });
});

describe("TelemetryEventSchema — telemetry contract (P0-U04)", () => {
  function validEvent() {
    return {
      timestamp: "2026-06-22T13:59:52.195Z",
      chain_id: "coding.backend.standard",
      step_id: "classify",
      status: "completed" as const,
      token_cost: 1200,
      latency_ms: 350,
    };
  }

  it("parses a valid telemetry event and accepts optional budget_remaining/metadata", () => {
    const parsed = TelemetryEventSchema.parse({ ...validEvent(), budget_remaining: 800, metadata: { slot: "alpha" } });
    expect(parsed.chain_id).toBe("coding.backend.standard");
    expect(parsed.budget_remaining).toBe(800);
    expect(parsed.metadata).toEqual({ slot: "alpha" });
  });

  it("rejects a non-ISO timestamp (telemetry must be time-ordered)", () => {
    expect(TelemetryEventSchema.safeParse({ ...validEvent(), timestamp: "yesterday" }).success).toBe(false);
    expect(TelemetryEventSchema.safeParse({ ...validEvent(), timestamp: "2026-06-22" }).success).toBe(false);
  });

  it("rejects a negative token_cost or latency (costs are non-negative)", () => {
    expect(TelemetryEventSchema.safeParse({ ...validEvent(), token_cost: -1 }).success).toBe(false);
    expect(TelemetryEventSchema.safeParse({ ...validEvent(), latency_ms: -5 }).success).toBe(false);
  });
});

describe("Command/Event mapping schemas (P0-U02)", () => {
  it("CommandMappingSchema maps a slash command to a chain with a default priority", () => {
    const parsed = CommandMappingSchema.parse({ command: "smart", chain_id: "coding.backend.standard" });
    expect(parsed.command).toBe("smart");
    expect(parsed.priority).toBe(50);
  });

  it("EventMappingSchema maps a hook event to a chain and accepts an optional condition", () => {
    const parsed = EventMappingSchema.parse({ event: "PostToolUse", chain_id: "audit.review", condition: "tool==Edit" });
    expect(parsed.event).toBe("PostToolUse");
    expect(parsed.condition).toBe("tool==Edit");
  });

  it("ContextBundleSchema requires a non-negative token cost estimate and defaults optional=false", () => {
    expect(ContextBundleSchema.safeParse({ id: "b", files: [], purpose: "p", token_cost_estimate: -1 }).success).toBe(false);
    const parsed = ContextBundleSchema.parse({ id: "b", files: ["f.md"], purpose: "p", token_cost_estimate: 100 });
    expect(parsed.optional).toBe(false); // default
  });
});

describe("ChainStepSchema — step contract (P0-U01, direct coverage)", () => {
  // Previously exercised only transitively via AutomationChainSchema.steps (iter-1
  // scrutiny P2). A chain step is the unit of automation execution, so its contract
  // (executable timeout, retry budget, optional fallback) is pinned directly here.
  const validStep = { id: "edit", action: "code_change", description: "Make the change", required: true, timeout_ms: 60000 };

  it("parses a valid step; retry_count defaults to 0 and fallback_action is omitted when absent", () => {
    const parsed = ChainStepSchema.parse(validStep);
    expect(parsed.retry_count).toBe(0);          // default
    expect("fallback_action" in parsed).toBe(false); // optional, absent (not added by zod)
  });

  it("carries an explicit retry_count and fallback_action through", () => {
    const parsed = ChainStepSchema.parse({ ...validStep, retry_count: 2, fallback_action: "skip_step" });
    expect(parsed.retry_count).toBe(2);
    expect(parsed.fallback_action).toBe("skip_step");
  });

  it("rejects an empty id, a non-positive/non-integer timeout, and a negative retry_count", () => {
    expect(ChainStepSchema.safeParse({ ...validStep, id: "" }).success).toBe(false);
    expect(ChainStepSchema.safeParse({ ...validStep, timeout_ms: 0 }).success).toBe(false);
    expect(ChainStepSchema.safeParse({ ...validStep, timeout_ms: 1000.5 }).success).toBe(false);
    expect(ChainStepSchema.safeParse({ ...validStep, retry_count: -1 }).success).toBe(false);
  });

  it("requires the mandatory fields (action, required) — a step that does nothing is rejected", () => {
    const { action: _a, ...noAction } = validStep;
    const { required: _r, ...noRequired } = validStep;
    expect(ChainStepSchema.safeParse(noAction).success).toBe(false);
    expect(ChainStepSchema.safeParse(noRequired).success).toBe(false);
  });
});
