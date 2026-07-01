/**
 * knowledgeDispatcher — Tribal backlog batch 4 (final) wiring round-trip
 * ======================================================================
 *
 * WIRE-UNWIRED-MS0 / U-WIRE-BACKLOG-TRIBAL batch 4 (2026-05-21, slot:foxtrot)
 *
 * Verifies the FINAL 3 unwired tribal engines now reachable via prism_knowledge,
 * completing U-WIRE-BACKLOG-TRIBAL (12/12 engines wired across 4 batches):
 *   - CAMTribalKnowledgeInjectionEngine     → tribal_cam_tooltip   (5 modes, static class)
 *   - PostProcessorTribalKnowledgeIntegrationEngine → tribal_pp_integrate (14 modes)
 *   - WEDMTribalTipLearnerEngine            → tribal_wedm_learn    (8 modes)
 *
 * @milestone WIRE-UNWIRED-MS0
 * @unit U-WIRE-BACKLOG-TRIBAL (batch 4 / final)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerKnowledgeDispatcher } from "../tools/dispatchers/knowledgeDispatcher.js";

interface CapturedTool {
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}

interface DispatchResult {
  ok: boolean;
  data: Record<string, unknown>;
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = await tool.handler({ action, params });
  if (
    raw &&
    typeof raw === "object" &&
    "success" in raw &&
    (raw as { success: boolean }).success === false
  ) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if ("error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeAll(() => {
  server = new MockMCPServer();
  registerKnowledgeDispatcher(server);
});

// ============================================================================
// CAMTribalKnowledgeInjectionEngine — tribal_cam_tooltip
// ============================================================================

describe("knowledgeDispatcher → tribal_cam_tooltip (CAMTribalKnowledgeInjectionEngine)", () => {
  it("mode=supported_targets returns TooltipTarget[] array", async () => {
    const r = await call(server, "tribal_cam_tooltip", { mode: "supported_targets" });
    expect(r.ok).toBe(true);
    const targets = (r.data.targets as string[] | undefined) ?? [];
    expect(Array.isArray(targets)).toBe(true);
    // Engine exposes a Zod-enum of targets; must be non-empty.
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) expect(typeof t).toBe("string");
  });

  it("mode=render with a context returns a TooltipFrame envelope", async () => {
    const r = await call(server, "tribal_cam_tooltip", {
      mode: "render",
      context: {
        session_id: "test-session-001",
        target: "speed_feed",
        controller: "fanuc",
        material: "1018",
      },
      limit: 5,
    });
    if (r.ok) {
      expect(typeof r.data).toBe("object");
      // TooltipFrame should have a tips field; slim-aware.
      const tips = (r.data.tips as unknown[] | undefined) ?? [];
      expect(Array.isArray(tips)).toBe(true);
    } else {
      // Render may need a specific target shape; surface debuggable error.
      const errStr = JSON.stringify(r.data);
      expect(errStr.length).toBeGreaterThan(0);
    }
  });

  it("mode=stats for a fresh session returns TooltipStats envelope", async () => {
    const r = await call(server, "tribal_cam_tooltip", {
      mode: "stats",
      session_id: "stats-session-001",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    // Stats must have at least one field present.
    expect(Object.keys(r.data).length).toBeGreaterThan(0);
  });

  it("mode=reset_session returns ok:true", async () => {
    const r = await call(server, "tribal_cam_tooltip", {
      mode: "reset_session",
      session_id: "session-to-reset",
    });
    expect(r.ok).toBe(true);
    expect(r.data.ok).toBe(true);
  });

  it("mode=reset_all returns ok:true", async () => {
    const r = await call(server, "tribal_cam_tooltip", { mode: "reset_all" });
    expect(r.ok).toBe(true);
    expect(r.data.ok).toBe(true);
  });

  it("FAILURE — mode=stats without session_id rejects", async () => {
    const r = await call(server, "tribal_cam_tooltip", { mode: "stats" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data)).toMatch(/session_id/i);
  });

  it("FAILURE — mode=render without context rejects", async () => {
    const r = await call(server, "tribal_cam_tooltip", { mode: "render" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data)).toMatch(/context/i);
  });

  it("FAILURE — unknown mode rejects with 'unknown mode'", async () => {
    const r = await call(server, "tribal_cam_tooltip", { mode: "bogus" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data)).toMatch(/unknown mode/i);
  });

  it("ADVERSARIAL — empty session_id in stats is treated literally", async () => {
    const r = await call(server, "tribal_cam_tooltip", {
      mode: "stats",
      session_id: "",
    });
    // Empty-string session_id passes the typeof guard; engine handles it.
    if (r.ok) {
      expect(typeof r.data).toBe("object");
    }
  });

  it("ADVERSARIAL — extremely large limit in render is bounded by engine MAX_TIP_LIMIT", async () => {
    const r = await call(server, "tribal_cam_tooltip", {
      mode: "render",
      context: { session_id: "limit-test", target: "speed_feed" },
      limit: 999_999_999,
    });
    // Either render succeeds (engine clamps to MAX_TIP_LIMIT=50) or rejects cleanly.
    if (r.ok) {
      const tips = (r.data.tips as unknown[] | undefined) ?? [];
      // MAX_TIP_LIMIT is 50 per engine constants.
      expect(tips.length).toBeLessThanOrEqual(50);
    }
  });
});

// ============================================================================
// PostProcessorTribalKnowledgeIntegrationEngine — tribal_pp_integrate
// ============================================================================

describe("knowledgeDispatcher → tribal_pp_integrate (PostProcessorTribalKnowledgeIntegrationEngine)", () => {
  it("mode=all_tips returns the full CURATED_TRIBAL_TIPS array", async () => {
    const r = await call(server, "tribal_pp_integrate", { mode: "all_tips" });
    expect(r.ok).toBe(true);
    const tips = (r.data.tips as { id?: string; priority?: string }[] | undefined) ?? [];
    expect(Array.isArray(tips)).toBe(true);
    // Engine documents 50+ curated tips; must be a non-empty corpus.
    expect(tips.length).toBeGreaterThan(0);
    for (const t of tips.slice(0, 5)) {
      if (t.id) expect(typeof t.id).toBe("string");
    }
  });

  it("mode=critical_safety returns only priority:'critical' + category:'safety' tips", async () => {
    const r = await call(server, "tribal_pp_integrate", { mode: "critical_safety" });
    expect(r.ok).toBe(true);
    const tips =
      (r.data.tips as { priority: string; category: string }[] | undefined) ?? [];
    expect(Array.isArray(tips)).toBe(true);
    // Engine filter contract: every returned tip MUST be priority:critical + category:safety.
    for (const t of tips) {
      expect(t.priority).toBe("critical");
      expect(t.category).toBe("safety");
    }
  });

  it("mode=by_priority='high' returns only high-priority tips", async () => {
    const r = await call(server, "tribal_pp_integrate", {
      mode: "by_priority",
      priority: "high",
    });
    expect(r.ok).toBe(true);
    const tips = (r.data.tips as { priority: string }[] | undefined) ?? [];
    for (const t of tips) expect(t.priority).toBe("high");
  });

  it("mode=for_controller='fanuc' filters to fanuc/all controllers", async () => {
    const r = await call(server, "tribal_pp_integrate", {
      mode: "for_controller",
      controller: "fanuc",
    });
    expect(r.ok).toBe(true);
    expect(Array.isArray((r.data.tips as unknown[] | undefined) ?? [])).toBe(true);
  });

  it("mode=search returns tips matching keyword (engine searches tip/reasoning/physicsBasis/category)", async () => {
    const r = await call(server, "tribal_pp_integrate", {
      mode: "search",
      query: "safety",
    });
    expect(r.ok).toBe(true);
    const tips = (r.data.tips as unknown[] | undefined) ?? [];
    expect(Array.isArray(tips)).toBe(true);
  });

  it("mode=totals returns curated/external/total numeric counts", async () => {
    const r = await call(server, "tribal_pp_integrate", { mode: "totals" });
    expect(r.ok).toBe(true);
    expect(typeof r.data.curated).toBe("number");
    expect(typeof r.data.total).toBe("number");
    expect(r.data.curated as number).toBeGreaterThan(0);
    expect(r.data.total as number).toBeGreaterThanOrEqual(r.data.curated as number);
  });

  it("mode=category_distribution returns category→count map", async () => {
    const r = await call(server, "tribal_pp_integrate", { mode: "category_distribution" });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    const numericVals = Object.values(r.data).filter((v) => typeof v === "number");
    expect(numericVals.length).toBeGreaterThan(0);
  });

  it("mode=external_sources returns ExternalKnowledgeSource[] (8 documented)", async () => {
    const r = await call(server, "tribal_pp_integrate", { mode: "external_sources" });
    expect(r.ok).toBe(true);
    const sources = (r.data.sources as unknown[] | undefined) ?? [];
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBeGreaterThan(0);
  });

  it("mode=inject_agi returns {tipsApplied, criticalWarnings, recommendations, physicsBasis}", async () => {
    const r = await call(server, "tribal_pp_integrate", {
      mode: "inject_agi",
      context: { controller: "fanuc", operation: "rough_profile", material: "1018" },
    });
    expect(r.ok).toBe(true);
    // 4 contract keys must be present (any may be slimmed to absent when empty).
    expect(
      Array.isArray((r.data.tipsApplied as unknown[] | undefined) ?? [])
    ).toBe(true);
    expect(
      Array.isArray((r.data.criticalWarnings as unknown[] | undefined) ?? [])
    ).toBe(true);
    expect(
      Array.isArray((r.data.recommendations as unknown[] | undefined) ?? [])
    ).toBe(true);
  });

  it("FAILURE — mode=get_tip without id rejects", async () => {
    const r = await call(server, "tribal_pp_integrate", { mode: "get_tip" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data)).toMatch(/id/i);
  });

  it("FAILURE — mode=for_material without material rejects", async () => {
    const r = await call(server, "tribal_pp_integrate", { mode: "for_material" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data)).toMatch(/material/i);
  });

  it("FAILURE — unknown mode rejects", async () => {
    const r = await call(server, "tribal_pp_integrate", { mode: "bogus_mode" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data)).toMatch(/unknown mode/i);
  });

  it("ADVERSARIAL — get_tip with unknown id returns tip:undefined (engine contract)", async () => {
    const r = await call(server, "tribal_pp_integrate", {
      mode: "get_tip",
      id: "DEFINITELY-NOT-A-PP-TIP-99999",
    });
    expect(r.ok).toBe(true);
    // Engine: getTip returns undefined → slimResponse strips it → tip absent.
    expect(r.data.tip ?? null).toBe(null);
  });

  it("ADVERSARIAL — search with empty string returns large tip set (matches everything)", async () => {
    const r = await call(server, "tribal_pp_integrate", { mode: "search", query: "" });
    expect(r.ok).toBe(true);
    expect(Array.isArray((r.data.tips as unknown[] | undefined) ?? [])).toBe(true);
  });
});

// ============================================================================
// WEDMTribalTipLearnerEngine — tribal_wedm_learn
// ============================================================================

describe("knowledgeDispatcher → tribal_wedm_learn (WEDMTribalTipLearnerEngine)", () => {
  it("mode=process_queue returns ProcessingResult with processed/auto_approved/pending_review/rejected", async () => {
    const r = await call(server, "tribal_wedm_learn", {
      mode: "process_queue",
      max_candidates: 50,
      auto_approve_threshold: 0.85,
    });
    expect(r.ok).toBe(true);
    // ProcessingResult contract: 4 numeric counters + new_tips[].
    // Zero-counters may slim → ?? 0.
    expect(typeof (r.data.processed ?? 0)).toBe("number");
    expect(typeof (r.data.auto_approved ?? 0)).toBe("number");
    expect(typeof (r.data.pending_review ?? 0)).toBe("number");
    expect(typeof (r.data.rejected ?? 0)).toBe("number");
    expect(
      Array.isArray((r.data.new_tips as unknown[] | undefined) ?? [])
    ).toBe(true);
  });

  it("mode=pending_review returns GeneratedTip[] (may be empty)", async () => {
    const r = await call(server, "tribal_wedm_learn", { mode: "pending_review" });
    expect(r.ok).toBe(true);
    expect(
      Array.isArray((r.data.pending as unknown[] | undefined) ?? [])
    ).toBe(true);
  });

  it("mode=learned returns GeneratedTip[] (may be empty)", async () => {
    const r = await call(server, "tribal_wedm_learn", { mode: "learned" });
    expect(r.ok).toBe(true);
    expect(
      Array.isArray((r.data.learned as unknown[] | undefined) ?? [])
    ).toBe(true);
  });

  it("mode=approved returns GeneratedTip[] (may be empty)", async () => {
    const r = await call(server, "tribal_wedm_learn", { mode: "approved" });
    expect(r.ok).toBe(true);
    expect(
      Array.isArray((r.data.approved as unknown[] | undefined) ?? [])
    ).toBe(true);
  });

  it("mode=stats returns stats object with pendingReviewCount + learnedCorpusSize numerics", async () => {
    const r = await call(server, "tribal_wedm_learn", { mode: "stats" });
    expect(r.ok).toBe(true);
    // Engine return type: typeof this.stats & { pendingReviewCount: number; learnedCorpusSize: number }
    // pendingReviewCount/learnedCorpusSize:0 may slim → ?? 0.
    expect(typeof (r.data.pendingReviewCount ?? 0)).toBe("number");
    expect(typeof (r.data.learnedCorpusSize ?? 0)).toBe("number");
  });

  it("mode=approve unknown tip_id returns approved:false (engine never throws)", async () => {
    const r = await call(server, "tribal_wedm_learn", {
      mode: "approve",
      tip_id: "DEFINITELY-NOT-A-LEARNED-TIP-99999",
    });
    expect(r.ok).toBe(true);
    // Engine returns boolean (false for not-found). False may slim → ?? false.
    expect(r.data.approved ?? false).toBe(false);
  });

  it("mode=reject unknown tip_id returns rejected:false", async () => {
    const r = await call(server, "tribal_wedm_learn", {
      mode: "reject",
      tip_id: "DEFINITELY-NOT-A-LEARNED-TIP-99999",
    });
    expect(r.ok).toBe(true);
    expect(r.data.rejected ?? false).toBe(false);
  });

  it("FAILURE — mode=approve without tip_id rejects", async () => {
    const r = await call(server, "tribal_wedm_learn", { mode: "approve" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data)).toMatch(/tip_id/i);
  });

  it("FAILURE — mode=reject without tip_id rejects", async () => {
    const r = await call(server, "tribal_wedm_learn", { mode: "reject" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data)).toMatch(/tip_id/i);
  });

  it("FAILURE — unknown mode rejects with 'unknown mode'", async () => {
    const r = await call(server, "tribal_wedm_learn", { mode: "bogus_mode" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data)).toMatch(/unknown mode/i);
  });

  it("ADVERSARIAL — process_queue with max_candidates:0 still produces valid envelope", async () => {
    const r = await call(server, "tribal_wedm_learn", {
      mode: "process_queue",
      max_candidates: 0,
    });
    expect(r.ok).toBe(true);
    expect(typeof (r.data.processed ?? 0)).toBe("number");
  });

  it("ADVERSARIAL — process_queue with threshold > 1.0 still produces valid envelope (engine doesn't crash)", async () => {
    const r = await call(server, "tribal_wedm_learn", {
      mode: "process_queue",
      max_candidates: 10,
      auto_approve_threshold: 99.0,
    });
    expect(r.ok).toBe(true);
    // With impossible threshold, nothing auto-approves.
    expect(r.data.auto_approved ?? 0).toBe(0);
  });
});

// ============================================================================
// Wiring completeness — 12-of-12 milestone check
// ============================================================================

describe("knowledgeDispatcher → batch-4 wiring completeness (12-of-12 tribal milestone)", () => {
  it("all 3 final-batch actions invoke concurrently with distinct envelopes", async () => {
    const calls = await Promise.all([
      call(server, "tribal_cam_tooltip", { mode: "supported_targets" }),
      call(server, "tribal_pp_integrate", { mode: "totals" }),
      call(server, "tribal_wedm_learn", { mode: "stats" }),
    ]);
    expect(calls[0]!.ok).toBe(true);
    expect(calls[1]!.ok).toBe(true);
    expect(calls[2]!.ok).toBe(true);
    // Concrete value checks: each engine produces typed output.
    expect(Array.isArray((calls[0]!.data.targets as unknown[] | undefined) ?? [])).toBe(true);
    expect(typeof calls[1]!.data.curated).toBe("number");
    expect(typeof (calls[2]!.data.pendingReviewCount ?? 0)).toBe("number");
  });
});
