/**
 * MILL-MASTER-P1-U03-AGI-BIND — Bidirectional AGI binding test
 *
 * Verifies the new DI-based binding between MillingAGIMasterEngine and the
 * external CAMAGIMasterOrchestrator (which lands in P1-U06). DI avoids
 * circular imports and lets this engine run standalone until the CAM side
 * is wired.
 *
 * Contract:
 *   Outbound (MillingAGIMaster → CAMAGIMaster):
 *     - delegateCamVendorChoice returns structured fallback when unbound
 *     - fallback includes mill-side heuristic (never just "null")
 *     - fallback is deterministic for given context
 *     - after bindCAMAGIMaster(), delegate routes to the binding
 *     - delegate rejects malformed context with reason="invalid_context"
 *     - bindCAMAGIMaster(null) clears the binding + resets counter
 *
 *   Inbound (CAMAGIMaster → MillingAGIMaster):
 *     - handleMillReasoningRequest returns structured result without binding
 *     - response categorizes request (roughing/finishing/difficult/threading/general)
 *     - response includes physics touchpoints appropriate to material ISO
 *     - S/H materials get Johnson-Cook + Archard + thermal
 *     - N materials get Altintas-Budak SLD
 *
 *   Introspection:
 *     - getBindingStatus reflects actual state
 *     - call_count increments per delegation
 *     - bound_at timestamps the binding
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  millingAGIMasterEngine,
  type CAMAGIBinding,
  type CamVendorChoiceContext,
  type CamVendorChoiceResult,
  type CamVendorChoiceFallback,
  type MillReasoningInboundRequest,
} from "../engines/MillingAGIMasterEngine.js";

// ── Mock CAMAGIBinding — simulates what CAMAGIMasterOrchestrator will provide ──
function makeMockBinding(vendor: CamVendorChoiceResult["vendor"] = "hypermill"): CAMAGIBinding {
  return {
    pickVendor: (ctx: CamVendorChoiceContext): CamVendorChoiceResult => ({
      delegated: true,
      vendor,
      confidence: 0.88,
      rationale: `mock — ${vendor} selected for ${ctx.material} ${ctx.operation}`,
      fallbacks: ["mastercam", "fusion360"],
      source: "mock_cam_agi_binding",
    }),
  };
}

const baseCtx: CamVendorChoiceContext = {
  material: "4140",
  material_iso: "P",
  operation: "roughing",
  machine_class: "3-axis",
  complexity: "moderate",
};

describe("MILL-MASTER-P1-U03 · AGI binding — outbound (delegateCamVendorChoice)", () => {
  beforeEach(() => {
    // Ensure clean state before each test — always unbind
    millingAGIMasterEngine.bindCAMAGIMaster(null);
  });

  it("returns structured fallback when no CAMAGI is bound", () => {
    const out = millingAGIMasterEngine.delegateCamVendorChoice(baseCtx);
    expect(out.delegated).toBe(false);
    const fallback = out as CamVendorChoiceFallback;
    expect(fallback.reason).toBe("cam_agi_not_bound");
    expect(fallback.hint).toContain("P1-U06");
  });

  it("unbound fallback includes a mill-side vendor heuristic (never just null)", () => {
    const out = millingAGIMasterEngine.delegateCamVendorChoice(baseCtx) as CamVendorChoiceFallback;
    expect(out.milling_side_recommendation).toBeDefined();
    expect(out.milling_side_recommendation!.length).toBeGreaterThan(0);
  });

  it("heuristic picks hypermill for 5-axis / mill-turn machines", () => {
    const out5 = millingAGIMasterEngine.delegateCamVendorChoice({
      ...baseCtx,
      machine_class: "5-axis",
    }) as CamVendorChoiceFallback;
    expect(out5.milling_side_recommendation).toContain("hypermill");

    const outMT = millingAGIMasterEngine.delegateCamVendorChoice({
      ...baseCtx,
      machine_class: "mill-turn",
    }) as CamVendorChoiceFallback;
    expect(outMT.milling_side_recommendation).toContain("hypermill");
  });

  it("heuristic picks fusion360 for simple/moderate 3-axis parts", () => {
    const out = millingAGIMasterEngine.delegateCamVendorChoice({
      ...baseCtx,
      machine_class: "3-axis",
      complexity: "simple",
    }) as CamVendorChoiceFallback;
    expect(out.milling_side_recommendation).toContain("fusion360");
  });

  it("heuristic defaults to mastercam for complex/extreme parts without 5-axis hint", () => {
    const out = millingAGIMasterEngine.delegateCamVendorChoice({
      ...baseCtx,
      machine_class: "3-axis",
      complexity: "extreme",
    }) as CamVendorChoiceFallback;
    expect(out.milling_side_recommendation).toContain("mastercam");
  });

  it("rejects malformed context (missing material) with invalid_context", () => {
    const out = millingAGIMasterEngine.delegateCamVendorChoice({
      operation: "roughing",
    } as CamVendorChoiceContext);
    expect(out.delegated).toBe(false);
    expect((out as CamVendorChoiceFallback).reason).toBe("invalid_context");
  });

  it("rejects malformed context (missing operation) with invalid_context", () => {
    const out = millingAGIMasterEngine.delegateCamVendorChoice({
      material: "4140",
    } as CamVendorChoiceContext);
    expect((out as CamVendorChoiceFallback).reason).toBe("invalid_context");
  });

  it("after bindCAMAGIMaster(mock), delegate routes to the mock binding", () => {
    const mock = makeMockBinding("mastercam");
    millingAGIMasterEngine.bindCAMAGIMaster(mock);
    const out = millingAGIMasterEngine.delegateCamVendorChoice(baseCtx);
    expect(out.delegated).toBe(true);
    const result = out as CamVendorChoiceResult;
    expect(result.vendor).toBe("mastercam");
    expect(result.source).toBe("mock_cam_agi_binding");
  });

  it("bindCAMAGIMaster(null) clears the binding and subsequent calls fall back", () => {
    millingAGIMasterEngine.bindCAMAGIMaster(makeMockBinding());
    expect(millingAGIMasterEngine.isCAMAGIBound()).toBe(true);
    millingAGIMasterEngine.bindCAMAGIMaster(null);
    expect(millingAGIMasterEngine.isCAMAGIBound()).toBe(false);
    const out = millingAGIMasterEngine.delegateCamVendorChoice(baseCtx);
    expect(out.delegated).toBe(false);
  });
});

describe("MILL-MASTER-P1-U03 · AGI binding — inbound (handleMillReasoningRequest)", () => {
  beforeEach(() => {
    millingAGIMasterEngine.bindCAMAGIMaster(null);
  });

  it("returns structured result without requiring a CAMAGI binding", () => {
    const req: MillReasoningInboundRequest = {
      source: "cam_agi",
      material: "4140",
      material_iso: "P",
      operation: "roughing",
    };
    const out = millingAGIMasterEngine.handleMillReasoningRequest(req);
    expect(out.request_source).toBe("cam_agi");
    expect(out.material).toBe("4140");
    expect(Array.isArray(out.wisdom)).toBe(true);
    expect(out.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(out.confidence).toBeGreaterThan(0);
    expect(out.confidence).toBeLessThanOrEqual(1);
  });

  it("categorizes roughing operations under 'roughing' wisdom", () => {
    const out = millingAGIMasterEngine.handleMillReasoningRequest({
      source: "cam_agi",
      material: "4140",
      operation: "roughing",
    });
    expect(out.wisdom_category).toBe("roughing");
  });

  it("categorizes finishing operations under 'finishing' wisdom", () => {
    const out = millingAGIMasterEngine.handleMillReasoningRequest({
      source: "cam_agi",
      material: "D2",
      operation: "finishing",
    });
    expect(out.wisdom_category).toBe("finishing");
  });

  it("categorizes threading operations under 'threading' wisdom", () => {
    const out = millingAGIMasterEngine.handleMillReasoningRequest({
      source: "cam_agi",
      material: "4140",
      operation: "thread_milling",
    });
    expect(out.wisdom_category).toBe("threading");
  });

  it("categorizes S/H materials under 'difficult_materials'", () => {
    const out = millingAGIMasterEngine.handleMillReasoningRequest({
      source: "cam_agi",
      material: "Inconel 718",
      material_iso: "S",
    });
    expect(out.wisdom_category).toBe("difficult_materials");
  });

  it("defaults unknown inputs to 'general'", () => {
    const out = millingAGIMasterEngine.handleMillReasoningRequest({
      source: "external_agent",
      material: "unknown alloy",
    });
    expect(out.wisdom_category).toBe("general");
  });

  it("physics touchpoints for S material include Johnson-Cook + Archard + thermal", () => {
    const out = millingAGIMasterEngine.handleMillReasoningRequest({
      source: "cam_agi",
      material: "Inconel 718",
      material_iso: "S",
    });
    const tp = out.recommended_physics_touchpoints.join("|");
    expect(tp).toContain("Johnson-Cook");
    expect(tp).toContain("Archard");
    expect(tp).toContain("Komanduri-Hou");
  });

  it("physics touchpoints for H material also include Johnson-Cook + Archard + thermal", () => {
    const out = millingAGIMasterEngine.handleMillReasoningRequest({
      source: "cam_agi",
      material: "D2 (HRC 60)",
      material_iso: "H",
    });
    const tp = out.recommended_physics_touchpoints.join("|");
    expect(tp).toContain("Johnson-Cook");
    expect(tp).toContain("Archard");
  });

  it("physics touchpoints for N material include Altintas-Budak SLD", () => {
    const out = millingAGIMasterEngine.handleMillReasoningRequest({
      source: "cam_agi",
      material: "6061-T6",
      material_iso: "N",
    });
    expect(out.recommended_physics_touchpoints.join("|")).toContain("Altintas-Budak");
  });

  it("physics touchpoints for P material include Kienzle + Taylor + surface finish", () => {
    const out = millingAGIMasterEngine.handleMillReasoningRequest({
      source: "cam_agi",
      material: "4140",
      material_iso: "P",
    });
    const tp = out.recommended_physics_touchpoints.join("|");
    expect(tp).toContain("Kienzle");
    expect(tp).toContain("Taylor");
    expect(tp).toContain("f²/(32·r)");
  });
});

describe("MILL-MASTER-P1-U03 · AGI binding — introspection (getBindingStatus)", () => {
  beforeEach(() => {
    millingAGIMasterEngine.bindCAMAGIMaster(null);
  });

  it("reports cam_agi_bound=false when unbound", () => {
    const status = millingAGIMasterEngine.getBindingStatus();
    expect(status.cam_agi_bound).toBe(false);
    expect(status.bound_at).toBeNull();
    expect(status.call_count).toBe(0);
  });

  it("reports cam_agi_bound=true after binding with timestamped bound_at", () => {
    const before = Date.now();
    millingAGIMasterEngine.bindCAMAGIMaster(makeMockBinding());
    const status = millingAGIMasterEngine.getBindingStatus();
    expect(status.cam_agi_bound).toBe(true);
    expect(status.bound_at).not.toBeNull();
    const boundAt = new Date(status.bound_at!).getTime();
    expect(boundAt).toBeGreaterThanOrEqual(before);
  });

  it("call_count increments per successful delegation, not fallback", () => {
    // Fallback does NOT increment
    millingAGIMasterEngine.delegateCamVendorChoice(baseCtx);
    expect(millingAGIMasterEngine.getBindingStatus().call_count).toBe(0);

    // Bound delegation increments
    millingAGIMasterEngine.bindCAMAGIMaster(makeMockBinding());
    millingAGIMasterEngine.delegateCamVendorChoice(baseCtx);
    millingAGIMasterEngine.delegateCamVendorChoice(baseCtx);
    millingAGIMasterEngine.delegateCamVendorChoice(baseCtx);
    expect(millingAGIMasterEngine.getBindingStatus().call_count).toBe(3);
  });

  it("rebinding resets call_count to 0", () => {
    millingAGIMasterEngine.bindCAMAGIMaster(makeMockBinding());
    millingAGIMasterEngine.delegateCamVendorChoice(baseCtx);
    millingAGIMasterEngine.delegateCamVendorChoice(baseCtx);
    expect(millingAGIMasterEngine.getBindingStatus().call_count).toBe(2);
    millingAGIMasterEngine.bindCAMAGIMaster(makeMockBinding("fusion360"));
    expect(millingAGIMasterEngine.getBindingStatus().call_count).toBe(0);
  });
});

describe("MILL-MASTER-P1-U03 · AGI binding — contract isolation", () => {
  beforeEach(() => {
    millingAGIMasterEngine.bindCAMAGIMaster(null);
  });

  it("inbound handling does not require outbound binding (directions are independent)", () => {
    expect(millingAGIMasterEngine.isCAMAGIBound()).toBe(false);
    const out = millingAGIMasterEngine.handleMillReasoningRequest({
      source: "cam_agi",
      material: "4140",
    });
    expect(out).toBeDefined();
    expect(out.wisdom).toBeDefined();
  });

  it("binding a mock does not break existing validateApproach / getMasterWisdom contracts", () => {
    millingAGIMasterEngine.bindCAMAGIMaster(makeMockBinding());
    const wisdom = millingAGIMasterEngine.getMasterWisdom("general");
    const validation = millingAGIMasterEngine.validateApproach({
      material_iso: "P",
      operation: "roughing",
      rpm: 3000,
      feed: 500,
      doc: 2,
      tool_diameter: 12,
    });
    expect(wisdom.length).toBeGreaterThan(0);
    expect(validation).toHaveProperty("valid");
  });
});
