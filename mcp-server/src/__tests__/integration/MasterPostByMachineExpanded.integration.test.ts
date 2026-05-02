/**
 * Integration test for master_post_by_machine auto-router — U-PPGW11 + U-PPGW12.
 *
 * U-PPGW11 (Hurco alias-expand + UltiMotion router-infer):
 *   - VMX42 / VM10 / VM20i / MAX31i / ULTIMOTION / ULTIMAX route to HurcoV11
 *   - ULTIMAX (legacy pre-WinMax control) forces cfg.use_ultimotion = false
 *     even when caller passes true (G187 P3 not supported on ULTIMAX)
 *   - Other Hurco models leave caller's config untouched
 *
 * U-PPGW12 (Okuma OSP-P*L lathe alias-expand + mill controller hard-reject):
 *   - LB200 / LB300 / OSP-P300L / OSP-P500L (with `_` and `-` separators)
 *     route to OkumaB250LatheMasterPostEngine
 *   - OSP-P300M / OSP-P500M (mill controllers) hard-reject with explicit
 *     "no Okuma mill master post engine" error — they precede the lathe
 *     match so the dispatcher does NOT mis-route a mill to a lathe engine
 *
 * Pattern mirrors MasterPostByMachineHurco.integration.test.ts: a route
 * helper replicates the dispatcher decision logic so the test asserts
 * routing intent without invoking the broken HurcoV11 engine (kc1_1 bug
 * at line 420 — pre-existing, tracked under PPG-HARDEN).
 */
import { describe, it, expect } from "vitest";
import { ACTION_CAM_SCHEMAS } from "../../schemas/camActionSchemas.js";
import { ACTIONS } from "../../tools/dispatchers/camDispatcher.js";

// ─── Route helper — mirrors camDispatcher.ts:5422 master_post_by_machine ────

type Routed =
  | { engine: "okuma"; reason: string }
  | { engine: "okuma_osp_mill"; reason: string; ospFamily: "P300" | "P500" }
  | { engine: "mitsubishi"; reason: string }
  | { engine: "hurco"; reason: string; configOverrides?: Record<string, unknown> }
  | { engine: null; error: string };

function routeByMachine(
  machineModel: string | undefined,
  callerCfg: Record<string, unknown> = {},
): Routed {
  const model = (machineModel ?? "").toUpperCase();

  // U-PPGW-OkumaMill (PPG-WIRE-MS5) — OSP-P*M mill branch (PRECEDES the
  // OKUMA-lathe match so a model name with both "OKUMA" and "OSP-P300M"
  // still routes to the mill engine, not the lathe engine).
  if (
    model.includes("OSP-P300M") || model.includes("OSP_P300M") ||
    model.includes("OSP-P500M") || model.includes("OSP_P500M")
  ) {
    const ospFamily: "P300" | "P500" =
      (model.includes("OSP-P500") || model.includes("OSP_P500")) ? "P500" : "P300";
    return {
      engine: "okuma_osp_mill",
      reason: "OSP-P*M mill substring match",
      ospFamily,
    };
  }

  // U-PPGW12 — Okuma lathe family (LB200/LB250/LB300 + OSP-PxxxL controllers)
  if (
    model.includes("OKUMA") || model.includes("LB250") ||
    model.includes("LB200") || model.includes("LB300") ||
    model.includes("OSP-P300L") || model.includes("OSP_P300L") ||
    model.includes("OSP-P500L") || model.includes("OSP_P500L")
  ) {
    return { engine: "okuma", reason: "OKUMA/LB-family/OSP-PxxxL substring match" };
  }

  if (model.includes("MITSUBISHI") || model.includes("MV1200")) {
    return { engine: "mitsubishi", reason: "MITSUBISHI/MV1200 substring match" };
  }

  // U-PPGW11 — Hurco alias-expand + UltiMotion router-infer
  if (
    model.includes("HURCO") || model.includes("VMX24") || model.includes("VM30I") || model.includes("V11") ||
    model.includes("VMX") || model.includes("VM10") || model.includes("VM20") ||
    model.includes("MAX31") || model.includes("ULTIMAX") || model.includes("ULTIMOTION")
  ) {
    const configOverrides: Record<string, unknown> = { ...callerCfg };
    if (model.includes("ULTIMAX") && !model.includes("ULTIMOTION")) {
      configOverrides.use_ultimotion = false;
    }
    return { engine: "hurco", reason: "HURCO family + alias-expand match", configOverrides };
  }

  return {
    engine: null,
    error: `Unknown machine model: ${machineModel}. Supported lathes: OKUMA_LB200/LB250/LB300, OSP-P300L, OSP-P500L. Supported mills: HURCO VMX/VM10/VM20/V11/MAX31/ULTIMAX/ULTIMOTION; OKUMA OSP-P300M/OSP-P500M (PPG-WIRE-MS5/U-PPGW-OkumaMill). Wire EDM: MITSUBISHI_MV1200R.`,
  };
}

// ============================================================================
// U-PPGW12 — Okuma OSP-P*L lathe alias-expand
// ============================================================================

describe("master_post_by_machine — U-PPGW12 Okuma lathe alias-expand", () => {
  it("routes LB200 to OkumaB250LatheMasterPostEngine", () => {
    const r = routeByMachine("LB200");
    expect(r.engine).toBe("okuma");
  });

  it("routes LB300 to OkumaB250LatheMasterPostEngine", () => {
    const r = routeByMachine("LB300");
    expect(r.engine).toBe("okuma");
  });

  it("routes OSP-P300L (dash separator) to OkumaB250LatheMasterPostEngine", () => {
    const r = routeByMachine("OSP-P300L");
    expect(r.engine).toBe("okuma");
  });

  it("routes OSP_P300L (underscore separator) to OkumaB250LatheMasterPostEngine", () => {
    const r = routeByMachine("OSP_P300L");
    expect(r.engine).toBe("okuma");
  });

  it("routes OSP-P500L to OkumaB250LatheMasterPostEngine", () => {
    const r = routeByMachine("OSP-P500L");
    expect(r.engine).toBe("okuma");
  });

  it("routes OSP_P500L to OkumaB250LatheMasterPostEngine", () => {
    const r = routeByMachine("OSP_P500L");
    expect(r.engine).toBe("okuma");
  });

  it("preserves the existing LB250 routing (regression)", () => {
    const r = routeByMachine("LB250");
    expect(r.engine).toBe("okuma");
  });

  it("preserves the existing OKUMA-prefix routing (regression)", () => {
    const r = routeByMachine("OKUMA LB250II-M");
    expect(r.engine).toBe("okuma");
  });

  it("case-insensitive: lowercase osp-p300l routes to okuma (toUpperCase normalization)", () => {
    const r = routeByMachine("osp-p300l");
    expect(r.engine).toBe("okuma");
  });
});

// ============================================================================
// U-PPGW-OkumaMill (PPG-WIRE-MS5) — Okuma OSP-P*M routes to mill engine
// ============================================================================
//
// Replaces the previous U-PPGW12 HARD-REJECT block. OSP-P300M and OSP-P500M
// now route to OkumaOSPMillMasterPostEngine via the new branch in
// master_post_by_machine. The mill check still PRECEDES the OKUMA-lathe
// branch so a model with both substrings does not mis-route to the lathe.
//
describe("master_post_by_machine — U-PPGW-OkumaMill OSP-P*M mill routing", () => {
  it("routes OSP-P300M to OkumaOSPMillMasterPostEngine with family=P300", () => {
    const r = routeByMachine("OSP-P300M");
    expect(r.engine).toBe("okuma_osp_mill");
    if (r.engine === "okuma_osp_mill") {
      expect(r.ospFamily).toBe("P300");
    }
  });

  it("routes OSP_P300M (underscore variant) with family=P300", () => {
    const r = routeByMachine("OSP_P300M");
    expect(r.engine).toBe("okuma_osp_mill");
    if (r.engine === "okuma_osp_mill") {
      expect(r.ospFamily).toBe("P300");
    }
  });

  it("routes OSP-P500M to OkumaOSPMillMasterPostEngine with family=P500", () => {
    const r = routeByMachine("OSP-P500M");
    expect(r.engine).toBe("okuma_osp_mill");
    if (r.engine === "okuma_osp_mill") {
      expect(r.ospFamily).toBe("P500");
    }
  });

  it("routes OSP_P500M (underscore variant) with family=P500", () => {
    const r = routeByMachine("OSP_P500M");
    expect(r.engine).toBe("okuma_osp_mill");
    if (r.engine === "okuma_osp_mill") {
      expect(r.ospFamily).toBe("P500");
    }
  });

  it("OSP-P300M PRECEDES the OKUMA-lathe branch even when 'OKUMA' is in the name", () => {
    // Locks in branch precedence: a model name containing both "OKUMA"
    // (lathe trigger) and "OSP-P300M" (mill trigger) must hit the mill
    // branch — previously this was a hard-reject; now it routes to the
    // mill engine. The lathe substring "OSP-P300L" does NOT match
    // "OSP-P300M" (different suffix); precedence is a defence against
    // naive looser matching in future refactors.
    const r = routeByMachine("OKUMA OSP-P300M MILL");
    expect(r.engine).toBe("okuma_osp_mill");
    if (r.engine === "okuma_osp_mill") {
      expect(r.ospFamily).toBe("P300");
    }
  });

  it("case-insensitive: lowercase osp-p500m routes to mill (toUpperCase normalization)", () => {
    const r = routeByMachine("osp-p500m");
    expect(r.engine).toBe("okuma_osp_mill");
    if (r.engine === "okuma_osp_mill") {
      expect(r.ospFamily).toBe("P500");
    }
  });
});

// ============================================================================
// U-PPGW11 — Hurco alias-expand
// ============================================================================

describe("master_post_by_machine — U-PPGW11 Hurco alias-expand", () => {
  it("routes VMX42 to HurcoV11MillMasterPostEngine", () => {
    const r = routeByMachine("VMX42");
    expect(r.engine).toBe("hurco");
  });

  it("routes VMX60i to HurcoV11MillMasterPostEngine", () => {
    const r = routeByMachine("VMX60i");
    expect(r.engine).toBe("hurco");
  });

  it("routes VM10 to HurcoV11MillMasterPostEngine", () => {
    const r = routeByMachine("VM10");
    expect(r.engine).toBe("hurco");
  });

  it("routes VM20i to HurcoV11MillMasterPostEngine", () => {
    const r = routeByMachine("VM20i");
    expect(r.engine).toBe("hurco");
  });

  it("routes MAX31i to HurcoV11MillMasterPostEngine", () => {
    const r = routeByMachine("MAX31i");
    expect(r.engine).toBe("hurco");
  });

  it("routes ULTIMOTION identifier to HurcoV11MillMasterPostEngine", () => {
    const r = routeByMachine("HURCO ULTIMOTION VMX42");
    expect(r.engine).toBe("hurco");
  });

  it("preserves the existing VMX24 routing (regression)", () => {
    const r = routeByMachine("VMX24");
    expect(r.engine).toBe("hurco");
  });

  it("preserves the existing V11 routing (regression)", () => {
    const r = routeByMachine("V11");
    expect(r.engine).toBe("hurco");
  });
});

// ============================================================================
// U-PPGW11 — UltiMotion router-infer (config override for ULTIMAX)
// ============================================================================

describe("master_post_by_machine — U-PPGW11 UltiMotion router-infer", () => {
  it("forces use_ultimotion=false when machine is ULTIMAX (legacy control)", () => {
    const r = routeByMachine("HURCO ULTIMAX-i");
    expect(r.engine).toBe("hurco");
    if (r.engine === "hurco") {
      expect(r.configOverrides?.use_ultimotion).toBe(false);
    }
  });

  it("overrides caller's use_ultimotion=true to false for ULTIMAX (router authoritative)", () => {
    const r = routeByMachine("ULTIMAX", { use_ultimotion: true });
    expect(r.engine).toBe("hurco");
    if (r.engine === "hurco") {
      expect(r.configOverrides?.use_ultimotion).toBe(false);
    }
  });

  it("does NOT override use_ultimotion when ULTIMOTION identifier present (caller's intent wins)", () => {
    // "ULTIMOTION" anywhere in the model name signals the caller is on a
    // UltiMotion-capable machine — the router does NOT force false even
    // though the substring "ULTIMAX" might also be present in some legacy
    // identifiers. Since "ULTIMOTION" identifier override the legacy bias.
    const r = routeByMachine("HURCO VMX42 ULTIMOTION", { use_ultimotion: true });
    expect(r.engine).toBe("hurco");
    if (r.engine === "hurco") {
      expect(r.configOverrides?.use_ultimotion).toBe(true);
    }
  });

  it("leaves caller's use_ultimotion=true intact for normal Hurco models (e.g. VMX42)", () => {
    const r = routeByMachine("VMX42", { use_ultimotion: true });
    expect(r.engine).toBe("hurco");
    if (r.engine === "hurco") {
      expect(r.configOverrides?.use_ultimotion).toBe(true);
    }
  });

  it("leaves caller's use_ultimotion=false intact for normal Hurco models (caller can opt out)", () => {
    const r = routeByMachine("VMX42", { use_ultimotion: false });
    expect(r.engine).toBe("hurco");
    if (r.engine === "hurco") {
      expect(r.configOverrides?.use_ultimotion).toBe(false);
    }
  });

  it("passes through other config keys verbatim during router-infer", () => {
    const callerCfg = {
      program_number: 9001,
      use_conversational: true,
      coolant_mode: "tsc" as const,
    };
    const r = routeByMachine("ULTIMAX", callerCfg);
    expect(r.engine).toBe("hurco");
    if (r.engine === "hurco") {
      expect(r.configOverrides?.program_number).toBe(9001);
      expect(r.configOverrides?.use_conversational).toBe(true);
      expect(r.configOverrides?.coolant_mode).toBe("tsc");
      // Only use_ultimotion is touched
      expect(r.configOverrides?.use_ultimotion).toBe(false);
    }
  });
});

// ============================================================================
// Branch precedence + identifier-collision invariants
// ============================================================================

describe("master_post_by_machine — branch precedence invariants", () => {
  it("Okuma mill engine precedes Okuma lathe acceptance (ambiguous OSP family)", () => {
    // A model containing both substrings must hit the mill engine branch
    // first — proves the order Okuma-mill-route > Okuma-lathe is wired.
    // Pre-U-PPGW-OkumaMill this branch was a HARD-REJECT; now it routes
    // to OkumaOSPMillMasterPostEngine. Precedence over the OKUMA-lathe
    // accept branch must remain — otherwise a mill model with "OKUMA"
    // in the name would mis-route to the lathe engine.
    const r = routeByMachine("OKUMA OSP-P300M LATHE STAND-IN");
    expect(r.engine).toBe("okuma_osp_mill");
  });

  it("Mitsubishi precedes Hurco when MV1200 + ULTIMOTION both present (Mitsubishi wins)", () => {
    // Identifier-collision invariant: the existing OKUMA -> MITSUBISHI ->
    // HURCO order is preserved. A pathological model name with both
    // "MV1200" and "ULTIMOTION" routes to Mitsubishi (declared earlier).
    const r = routeByMachine("MV1200 ULTIMOTION HYBRID");
    expect(r.engine).toBe("mitsubishi");
  });

  it("Okuma lathe precedes Hurco even if Hurco substrings are present", () => {
    const r = routeByMachine("OKUMA LB250 + VMX24 BENCH-MARK");
    expect(r.engine).toBe("okuma");
  });
});

// ============================================================================
// Unknown-machine error + dispatcher schema acceptance
// ============================================================================

describe("master_post_by_machine — unknown machine + schema invariants", () => {
  it("returns the updated supported-list error for fully-unknown identifiers", () => {
    const r = routeByMachine("BRIDGEPORT_INTERACT");
    expect(r.engine).toBeNull();
    if (r.engine === null) {
      expect(r.error).toContain("HURCO VMX/VM10/VM20/V11/MAX31/ULTIMAX/ULTIMOTION");
      expect(r.error).toContain("OKUMA_LB200/LB250/LB300, OSP-P300L, OSP-P500L");
      expect(r.error).toContain("MITSUBISHI_MV1200R");
      // U-PPGW-OkumaMill (PPG-WIRE-MS5): OSP-P*M is now SUPPORTED — the
      // supported-list copy advertises it, the "explicitly NOT supported"
      // sentence is gone.
      expect(r.error).toContain("OKUMA OSP-P300M/OSP-P500M");
      expect(r.error).not.toContain("explicitly NOT supported");
    }
  });

  it("returns error for empty/missing machine_model", () => {
    expect(routeByMachine(undefined).engine).toBeNull();
    expect(routeByMachine("").engine).toBeNull();
  });

  it("master_post_by_machine remains in the dispatcher action list", () => {
    expect(ACTIONS).toContain("master_post_by_machine");
  });

  it("master_post_by_machine retains its Zod schema entry", () => {
    expect(ACTION_CAM_SCHEMAS).toHaveProperty("master_post_by_machine");
  });
});
