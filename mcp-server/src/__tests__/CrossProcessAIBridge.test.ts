/**
 * Tests for CrossProcessAIBridge
 * @see src/engines/CrossProcessAIBridge.ts
 * @see U-XPROC-AI-01 (cross-process AI orchestration for mill, lathe, wedm)
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessAIBridge,
  AI_SUPPORTED_PROCESSES,
  type AIProcessId,
} from "../engines/CrossProcessAIBridge.js";

// ============================================================================
// SECTION 1 — classify(): keyword-based process classification
// ============================================================================

describe("CrossProcessAIBridge.classify() — happy path", () => {
  it("classifies pocket-milling intent as mill", () => {
    const out = CrossProcessAIBridge.classify("make a pocket in 4140 steel on the mill");
    expect(out.process).toBe("mill");
    expect(out.confidence).toBeGreaterThan(0);
    expect(out.matched_signals.some((s) => s.includes("mill") || s.includes("pocket"))).toBe(
      true,
    );
  });

  it("classifies turning intent as lathe", () => {
    const out = CrossProcessAIBridge.classify(
      "turn an external thread on a chuck-mounted shaft using single point thread",
    );
    expect(out.process).toBe("lathe");
    expect(out.confidence).toBeGreaterThan(0);
    expect(out.matched_signals.length).toBeGreaterThan(0);
  });

  it("classifies wire-EDM intent as wedm", () => {
    const out = CrossProcessAIBridge.classify(
      "wire EDM a tapered profile in D2 with 4 skim passes",
    );
    expect(out.process).toBe("wedm");
    expect(out.confidence).toBeGreaterThan(0);
    expect(out.matched_signals.some((s) => s.includes("wire") || s.includes("skim"))).toBe(true);
  });

  it("classifies face-mill intent as mill via face/face mill keyword", () => {
    const out = CrossProcessAIBridge.classify("face mill 6061 aluminum to flatten");
    expect(out.process).toBe("mill");
  });

  it("classifies OD groove intent as lathe", () => {
    const out = CrossProcessAIBridge.classify("cut an OD groove on a lathe-turned shaft");
    expect(out.process).toBe("lathe");
  });

  it("classifies Mitsubishi MV1200R wire EDM intent as wedm", () => {
    const out = CrossProcessAIBridge.classify(
      "Mitsubishi MV1200R cutting a 4-axis taper through D2 die steel",
    );
    expect(out.process).toBe("wedm");
  });

  it("normalizes intent case (uppercase still matches mill)", () => {
    const out = CrossProcessAIBridge.classify("MAKE A POCKET ON THE VMX MILL");
    expect(out.process).toBe("mill");
  });

  it("normalizes intent whitespace (leading/trailing trimmed)", () => {
    const out = CrossProcessAIBridge.classify("   wire edm taper cut   ");
    expect(out.process).toBe("wedm");
  });

  it("returns alternative_processes sorted by confidence descending", () => {
    const out = CrossProcessAIBridge.classify("face mill the part on the VMX");
    expect(out.alternative_processes).toHaveLength(2);
    expect(out.alternative_processes[0].confidence).toBeGreaterThanOrEqual(
      out.alternative_processes[1].confidence,
    );
  });

  it("clamps confidence to 1.0 even when raw score exceeds 1.0", () => {
    const out = CrossProcessAIBridge.classify(
      "mill milling pocket face facing endmill end mill ballnose vmc vmx hmc 5-axis",
    );
    expect(out.confidence).toBe(1.0);
  });

  it("low-confidence fallback returns confidence in [0, 1] range", () => {
    const out = CrossProcessAIBridge.classify("zzz qqq xxx ppp");
    expect(out.confidence).toBeGreaterThanOrEqual(0);
    expect(out.confidence).toBeLessThanOrEqual(1.0);
  });
});

// ============================================================================
// SECTION 2 — classify(): explicit override + feature bias
// ============================================================================

describe("CrossProcessAIBridge.classify() — context overrides", () => {
  it("explicit context.process forces selection with confidence=1.0", () => {
    const out = CrossProcessAIBridge.classify("ambiguous intent", { process: "wedm" });
    expect(out.process).toBe("wedm");
    expect(out.confidence).toBe(1.0);
    expect(out.matched_signals).toContain("explicit_process_override=wedm");
    expect(out.alternative_processes).toEqual([]);
  });

  it("explicit context.process for lathe wins over mill keywords in intent", () => {
    const out = CrossProcessAIBridge.classify("face mill on VMX", { process: "lathe" });
    expect(out.process).toBe("lathe");
    expect(out.confidence).toBe(1.0);
  });

  it("feature bias [groove_external] tilts toward lathe", () => {
    const out = CrossProcessAIBridge.classify("make a part", { features: ["groove_external"] });
    expect(out.process).toBe("lathe");
    expect(out.matched_signals.some((s) => s.includes("feature:groove_external"))).toBe(true);
  });

  it("feature bias [profile_2d] tilts toward wedm", () => {
    const out = CrossProcessAIBridge.classify("cut this through", { features: ["profile_2d"] });
    expect(out.process).toBe("wedm");
  });

  it("feature bias [pocket_2d] tilts toward mill", () => {
    const out = CrossProcessAIBridge.classify("make a part", { features: ["pocket_2d"] });
    expect(out.process).toBe("mill");
  });

  it("multiple features with same process bias compound (3 features → 3 signals)", () => {
    const out = CrossProcessAIBridge.classify("make a part", {
      features: ["pocket_2d", "slot", "face_milling"],
    });
    expect(out.process).toBe("mill");
    expect(out.matched_signals.filter((s) => s.startsWith("feature:")).length).toBe(3);
  });

  it("material context surfaces in notes", () => {
    const out = CrossProcessAIBridge.classify("turn a part", { material: "Inconel 718" });
    expect(out.notes.some((n) => n.includes("material=Inconel 718"))).toBe(true);
  });

  it("ignores unknown feature ids silently (no biasing, no error)", () => {
    const out = CrossProcessAIBridge.classify("turn a part", {
      features: ["totally_unknown_feature"],
    });
    expect(out.process).toBe("lathe");
    expect(out.matched_signals.every((s) => !s.includes("totally_unknown_feature"))).toBe(true);
  });
});

// ============================================================================
// SECTION 3 — classify(): error paths
// ============================================================================

describe("CrossProcessAIBridge.classify() — error paths", () => {
  it("throws on non-string intent (number)", () => {
    const bad = 42 as unknown as string;
    expect(() => CrossProcessAIBridge.classify(bad)).toThrow(/must be a string/);
  });

  it("throws on non-string intent (null)", () => {
    const bad = null as unknown as string;
    expect(() => CrossProcessAIBridge.classify(bad)).toThrow(/must be a string/);
  });

  it("throws on empty string intent", () => {
    expect(() => CrossProcessAIBridge.classify("")).toThrow(/non-empty/);
  });

  it("throws on whitespace-only intent", () => {
    expect(() => CrossProcessAIBridge.classify("   \t\n   ")).toThrow(/non-empty/);
  });

  it("throws on context.process outside supported processes", () => {
    const bad = "ultrasonic" as unknown as AIProcessId;
    expect(() => CrossProcessAIBridge.classify("intent", { process: bad })).toThrow(
      /not in \[mill, lathe, wedm\]/,
    );
  });
});

// ============================================================================
// SECTION 4 — classify(): default fallback behavior
// ============================================================================

describe("CrossProcessAIBridge.classify() — fallback", () => {
  it("falls back to mill when no signals match", () => {
    const out = CrossProcessAIBridge.classify("xyz abc qrs nothing relevant");
    expect(out.process).toBe("mill");
    expect(out.confidence).toBeLessThan(0.5);
    expect(out.notes.some((n) => n.includes("no keyword or feature signals matched"))).toBe(
      true,
    );
  });

  it("falls back to mill with confidence=0.10 specifically when no signals match", () => {
    const out = CrossProcessAIBridge.classify("zzz qqq xxx ppp");
    expect(out.process).toBe("mill");
    expect(out.confidence).toBeCloseTo(0.10, 5);
  });
});

// ============================================================================
// SECTION 5 — listClassifierKeywords()
// ============================================================================

describe("CrossProcessAIBridge.listClassifierKeywords()", () => {
  it("returns 3 entries (one per process) in canonical order", () => {
    const out = CrossProcessAIBridge.listClassifierKeywords();
    expect(out).toHaveLength(3);
    expect(out.map((c) => c.process)).toEqual(["mill", "lathe", "wedm"]);
  });

  it("each process has at least 10 keyword signals", () => {
    const out = CrossProcessAIBridge.listClassifierKeywords();
    for (const cat of out) {
      expect(cat.signals.length).toBeGreaterThanOrEqual(10);
    }
  });

  it("returns defensive copies — mutation does not corrupt the registry", () => {
    const first = CrossProcessAIBridge.listClassifierKeywords();
    const originalLen = first[0].signals.length;
    (first[0].signals as string[]).push("INJECTED");
    const second = CrossProcessAIBridge.listClassifierKeywords();
    expect(second[0].signals.length).toBe(originalLen);
    expect(second[0].signals).not.toContain("INJECTED");
  });

  it("mill keywords include 'pocket' and 'mill'", () => {
    const out = CrossProcessAIBridge.listClassifierKeywords();
    const mill = out.find((c) => c.process === "mill");
    expect(mill?.signals).toContain("pocket");
    expect(mill?.signals).toContain("mill");
  });

  it("wedm keywords include 'wire edm' and 'skim pass'", () => {
    const out = CrossProcessAIBridge.listClassifierKeywords();
    const wedm = out.find((c) => c.process === "wedm");
    expect(wedm?.signals).toContain("wire edm");
    expect(wedm?.signals).toContain("skim pass");
  });
});

// ============================================================================
// SECTION 6 — orchestrate(): dry-run mode (no engine invocation)
// ============================================================================

describe("CrossProcessAIBridge.orchestrate() — dry_run mode", () => {
  it("dry-runs mill classification and returns mill engine name without invoking it", async () => {
    const out = await CrossProcessAIBridge.orchestrate({
      intent: "make a pocket on the VMX mill in 4140",
      dry_run: true,
    });
    expect(out.dry_run).toBe(true);
    expect(out.classification.process).toBe("mill");
    expect(out.routed_to).toBe("MillMasterOrchestratorFacadeEngine.orchestrate");
    expect(out.orchestrator_response).toEqual(undefined);
  });

  it("dry-runs lathe classification with explicit process override", async () => {
    const out = await CrossProcessAIBridge.orchestrate({
      intent: "make something",
      process: "lathe",
      dry_run: true,
    });
    expect(out.dry_run).toBe(true);
    expect(out.classification.process).toBe("lathe");
    expect(out.routed_to).toBe("LatheMasterOrchestratorFacadeEngine.orchestrate");
    expect(out.classification.confidence).toBe(1.0);
  });

  it("dry-runs wedm classification from intent keywords", async () => {
    const out = await CrossProcessAIBridge.orchestrate({
      intent: "cut a profile on the Mitsubishi MV1200R wire EDM",
      dry_run: true,
    });
    expect(out.dry_run).toBe(true);
    expect(out.classification.process).toBe("wedm");
    expect(out.routed_to).toBe("WEDMCompleteOrchestrationEngine.generateCompleteProgram");
  });

  it("dry-run preserves classification details (signals + alternatives + notes)", async () => {
    const out = await CrossProcessAIBridge.orchestrate({
      intent: "face mill on VMX",
      dry_run: true,
    });
    expect(out.classification.matched_signals.length).toBeGreaterThan(0);
    expect(out.classification.alternative_processes).toHaveLength(2);
    expect(out.notes.some((n) => n.includes("dry_run=true"))).toBe(true);
    expect(out.notes.some((n) => n.includes("routed_to="))).toBe(true);
  });

  it("dry-run surfaces low-confidence warning when intent has no signals", async () => {
    const out = await CrossProcessAIBridge.orchestrate({
      intent: "do the thing",
      dry_run: true,
    });
    expect(out.warnings.some((w) => w.includes("low classification confidence"))).toBe(true);
  });

  it("dry-run does NOT warn when caller supplied explicit process override", async () => {
    const out = await CrossProcessAIBridge.orchestrate({
      intent: "do the thing",
      process: "wedm",
      dry_run: true,
    });
    expect(out.warnings.length).toBe(0);
  });
});

// ============================================================================
// SECTION 7 — orchestrate(): error paths
// ============================================================================

describe("CrossProcessAIBridge.orchestrate() — error paths", () => {
  it("throws when request object is missing", async () => {
    const bad = undefined as unknown as Parameters<typeof CrossProcessAIBridge.orchestrate>[0];
    await expect(CrossProcessAIBridge.orchestrate(bad)).rejects.toThrow(
      /request object required/,
    );
  });

  it("throws on missing intent", async () => {
    const bad = { dry_run: true } as unknown as Parameters<
      typeof CrossProcessAIBridge.orchestrate
    >[0];
    await expect(CrossProcessAIBridge.orchestrate(bad)).rejects.toThrow(/must be a string/);
  });

  it("throws on empty intent", async () => {
    await expect(
      CrossProcessAIBridge.orchestrate({ intent: "", dry_run: true }),
    ).rejects.toThrow(/non-empty/);
  });

  it("throws on whitespace-only intent", async () => {
    await expect(
      CrossProcessAIBridge.orchestrate({ intent: "   ", dry_run: true }),
    ).rejects.toThrow(/non-empty/);
  });

  it("throws on invalid process override", async () => {
    const bad = "ultrasonic" as unknown as AIProcessId;
    await expect(
      CrossProcessAIBridge.orchestrate({ intent: "do something", process: bad, dry_run: true }),
    ).rejects.toThrow(/not in \[mill, lathe, wedm\]/);
  });

  it("throws when classified as mill but mill_request is missing (live mode)", async () => {
    await expect(
      CrossProcessAIBridge.orchestrate({ intent: "make a pocket on the VMX mill" }),
    ).rejects.toThrow(/mill route requires `mill_request`/);
  });

  it("throws when classified as lathe but lathe_request is missing (live mode)", async () => {
    await expect(
      CrossProcessAIBridge.orchestrate({ intent: "turn an OD groove on the lathe" }),
    ).rejects.toThrow(/lathe route requires `lathe_request`/);
  });

  it("throws when classified as wedm but wedm_request is missing (live mode)", async () => {
    await expect(
      CrossProcessAIBridge.orchestrate({
        intent: "wire EDM the profile on the Mitsubishi MV1200R",
      }),
    ).rejects.toThrow(/wedm route requires `wedm_request`/);
  });
});

// ============================================================================
// SECTION 8 — orchestrate(): live mill route (real orchestrator invocation)
// ============================================================================

describe("CrossProcessAIBridge.orchestrate() — live mill route", () => {
  it("routes a wisdom-query through the mill facade and returns its provenance", { timeout: 30_000 }, async () => {
    const out = await CrossProcessAIBridge.orchestrate({
      intent: "wisdom query on milling",
      process: "mill",
      mill_request: {
        request_type: "wisdom",
        query: "how do I rough an aluminum pocket",
        domain: "milling",
      },
    });
    expect(out.dry_run).toBe(false);
    expect(out.classification.process).toBe("mill");
    expect(out.routed_to).toBe("MillMasterOrchestratorFacadeEngine.orchestrate");
    // Mill orchestrator returns { success, request_type, result, provenance, warnings }
    const resp = out.orchestrator_response as {
      request_type: string;
      provenance: { request_type: string; engines_invoked: string[]; processing_time_ms: number };
      warnings: string[];
    };
    expect(resp.request_type).toBe("wisdom");
    expect(resp.provenance.request_type).toBe("wisdom");
    expect(Array.isArray(resp.provenance.engines_invoked)).toBe(true);
    expect(resp.provenance.processing_time_ms).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(resp.warnings)).toBe(true);
  });
});

// ============================================================================
// SECTION 9 — exported constants + cross-cutting behaviors
// ============================================================================

describe("Module exports + cross-cutting", () => {
  it("AI_SUPPORTED_PROCESSES has exactly mill, lathe, wedm (in this order)", () => {
    expect(AI_SUPPORTED_PROCESSES).toEqual(["mill", "lathe", "wedm"]);
  });

  it("classify handles long intent (10k chars) without error and still classifies as mill", () => {
    const longIntent = "mill the part. ".repeat(700);
    expect(longIntent.length).toBeGreaterThan(10000);
    const out = CrossProcessAIBridge.classify(longIntent);
    expect(out.process).toBe("mill");
    // Scorer counts unique keyword presence, not repetitions; "mill" matches once → 0.15
    expect(out.confidence).toBeCloseTo(0.15, 5);
  });

  it("classify handles intent with special chars + unicode", () => {
    const out = CrossProcessAIBridge.classify("Wire EDM ⚡ a Ø10mm taper — 4-axis");
    expect(out.process).toBe("wedm");
  });
});
