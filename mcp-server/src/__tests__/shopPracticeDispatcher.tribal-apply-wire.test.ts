/**
 * shopPracticeDispatcher.tribal-apply-wire.test.ts — U-CAMAGI12 round-trip wiring
 *
 * Verifies TribalKnowledgeApplicatorEngine is fully wired into prism_shop_practice:
 * schema-map registration (proven behaviorally), Zod validation (accept + reject
 * paths), and an in-process dispatcher round-trip that exercises the handler →
 * engine path including the live MachiningPlaybook composition branch.
 */
import { describe, it, expect } from "vitest";
import { registerShopPracticeDispatcher } from "../tools/dispatchers/shopPracticeDispatcher.js";
import { ACTION_SHOP_PRACTICE_SCHEMAS } from "../schemas/shopPracticeActionSchemas.js";

type DispatchFn = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

/** Register the dispatcher against a fake MCP server and capture its tool handler. */
function makeDispatch(): DispatchFn {
  let captured: DispatchFn | null = null;
  const fakeServer = {
    tool: (_name: string, _desc: string, _schema: unknown, handler: DispatchFn) => {
      captured = handler;
    },
  };
  registerShopPracticeDispatcher(fakeServer as unknown as Parameters<typeof registerShopPracticeDispatcher>[0]);
  if (!captured) throw new Error("shopPracticeDispatcher did not register a tool handler");
  return captured;
}

/** Unwrap the MCP { content: [{ type:"text", text }] } envelope to the JSON payload. */
function unwrap(res: any): any {
  expect(res?.content?.[0]?.type).toBe("text");
  return JSON.parse(res.content[0].text);
}

const FAST_CANDIDATE = {
  id: "fast",
  name: "Aggressive Roughing",
  baseScore: 0.95,
  params: { feed_mm_rev: 0.55 },
};
const SOUND_CANDIDATE = {
  id: "sound",
  name: "Tribal-Sound Roughing",
  baseScore: 0.8,
  params: { feed_mm_rev: 0.2 },
};
const FEED_CAP_CONSTRAINT = {
  id: "TW-FEED-CAP",
  severity: "critical" as const,
  description: "thin-wall tears above 0.3 mm/rev",
  appliesTo: "feed_mm_rev",
  max: 0.3,
};

describe("shopPracticeDispatcher — tribal_apply wiring (U-CAMAGI12)", () => {
  describe("schema-map registration (behavioral)", () => {
    it("tribal_apply schema is registered and validates a real candidate set", () => {
      const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.tribal_apply.safeParse({
        candidates: [FAST_CANDIDATE, SOUND_CANDIDATE],
      });
      expect(parsed.success).toBe(true);
    });

    it("tribal_apply_stats schema is registered and accepts an empty payload", () => {
      const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.tribal_apply_stats.safeParse({});
      expect(parsed.success).toBe(true);
    });
  });

  describe("schema validation", () => {
    it("accepts a valid candidate set with constraints, context and playbook_category", () => {
      const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.tribal_apply.safeParse({
        candidates: [FAST_CANDIDATE, SOUND_CANDIDATE],
        constraints: [FEED_CAP_CONSTRAINT],
        context: { material: "Ti-6Al-4V", operation: "roughing", feature: "thin-wall" },
        playbook_category: "roughing",
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects an empty candidates array (min(1))", () => {
      const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.tribal_apply.safeParse({ candidates: [] });
      expect(parsed.success).toBe(false);
    });

    it("rejects a candidate missing its required id", () => {
      const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.tribal_apply.safeParse({
        candidates: [{ name: "no-id" }],
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects a constraint with an invalid severity enum value", () => {
      const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.tribal_apply.safeParse({
        candidates: [SOUND_CANDIDATE],
        constraints: [{ id: "X", severity: "catastrophic", description: "bad" }],
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("dispatcher round-trip", () => {
    it("round-trips tribal_apply and overrides the naive pick with the tribal-sound one", async () => {
      const dispatch = makeDispatch();
      const out = unwrap(
        await dispatch({
          action: "tribal_apply",
          params: { candidates: [FAST_CANDIDATE, SOUND_CANDIDATE], constraints: [FEED_CAP_CONSTRAINT] },
        }),
      );
      expect(out.success).toBe(true);
      expect(out.ranked).toHaveLength(2);
      expect(out.chosen.id).toBe("sound"); // tribal-aware override of the faster pick
      expect(out.tribal_rationale).toContain("Tribal-Sound Roughing");
    });

    it("round-trip surfaces a >15% improvement when the naive pick breaks a critical rule", async () => {
      const dispatch = makeDispatch();
      const out = unwrap(
        await dispatch({
          action: "tribal_apply",
          params: { candidates: [FAST_CANDIDATE, SOUND_CANDIDATE], constraints: [FEED_CAP_CONSTRAINT] },
        }),
      );
      expect(out.naive_pick.id).toBe("fast");
      expect(out.improvement_pct).toBeGreaterThan(15);
      expect(out.constraints_applied).toBe(1);
    });

    it("round-trips the live MachiningPlaybook composition branch without crashing", async () => {
      const dispatch = makeDispatch();
      const out = unwrap(
        await dispatch({
          action: "tribal_apply",
          params: { candidates: [SOUND_CANDIDATE], playbook_category: "roughing" },
        }),
      );
      expect(out.success).toBe(true);
      expect(out.chosen.id).toBe("sound"); // the lone candidate must be chosen
      // playbook-derived constraints fold in additively; count is finite & >= 0.
      expect(Number.isFinite(out.constraints_applied)).toBe(true);
      expect(out.constraints_applied).toBeGreaterThanOrEqual(0);
    });

    it("round-trips tribal_apply_stats and returns the scoring configuration", async () => {
      const dispatch = makeDispatch();
      const out = unwrap(await dispatch({ action: "tribal_apply_stats", params: {} }));
      expect(out.success).toBe(true);
      expect(out.stats.severityWeights.critical).toBe(0.5);
      expect(out.stats.severityWeights.important).toBe(0.25);
      expect(out.stats.version).toBe("1.0.0");
    });

    it("rejects an empty candidate set at the dispatcher boundary with a field-named error", async () => {
      const dispatch = makeDispatch();
      const out = unwrap(await dispatch({ action: "tribal_apply", params: { candidates: [] } }));
      // The dispatcher formats validation failures as "<field>: <message>".
      expect(typeof out.error).toBe("string");
      expect(out.error).toContain("candidates");
    });
  });
});
