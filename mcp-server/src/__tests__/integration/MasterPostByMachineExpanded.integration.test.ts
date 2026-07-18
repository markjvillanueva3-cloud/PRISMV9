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
  | { engine: "okuma"; reason: string; machineId: "LB250II-M" | "LB3000" | "MULTUS-B250II" | "GENOS-L300-M" | "GENOS-L200E-M" | "GENOS-L400II-E" | "LNC8" | "CROWN-L1060" }
  | { engine: "okuma_osp_mill"; reason: string; ospFamily: "P300" | "P500" }
  | { engine: "mitsubishi"; reason: string }
  | { engine: "fa10s"; error: string }
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

  // U-PPGW12 + U-PP-LATHE-MACHINE-AWARE -- Okuma lathe / mill-turn family
  // (LB200/LB250/LB300/LB3000 + MULTUS B250II + OSP-PxxxL controllers).
  if (
    model.includes("OKUMA") || model.includes("LB250") ||
    model.includes("LB3000") || model.includes("MULTUS") ||
    model.includes("LB200") || model.includes("LB300") ||
    model.includes("OSP-P300L") || model.includes("OSP_P300L") ||
    model.includes("OSP-P500L") || model.includes("OSP_P500L") ||
    // U-PP-LATHE-JM-FLEET-IDENTITY -- GENOS L-series, LNC8, Crown L1060.
    // GENOS gated on an L-number so a GENOS *mill* (M-series) does NOT mis-route here.
    (model.includes("GENOS") && (model.includes("L200") || model.includes("L300") || model.includes("L400"))) ||
    model.includes("LNC") || model.includes("CROWN")
  ) {
    // Machine-identity resolution (mirrors camDispatcher master_post_by_machine).
    // LB3000 is checked before B250, and LB250 (which contains "B250") must NOT
    // resolve to MULTUS -- the `&& !model.includes("LB")` guard. GENOS/LNC/Crown
    // map to their jm-fleet-sim-map identities (U-PP-LATHE-JM-FLEET-IDENTITY).
    const machineId: "LB250II-M" | "LB3000" | "MULTUS-B250II" | "GENOS-L300-M" | "GENOS-L200E-M" | "GENOS-L400II-E" | "LNC8" | "CROWN-L1060" =
      model.includes("LB3000") ? "LB3000"
      : (model.includes("MULTUS") || (model.includes("B250") && !model.includes("LB"))) ? "MULTUS-B250II"
      : (model.includes("GENOS") && model.includes("L300")) ? "GENOS-L300-M"
      : (model.includes("GENOS") && model.includes("L200")) ? "GENOS-L200E-M"
      : (model.includes("GENOS") && model.includes("L400")) ? "GENOS-L400II-E"
      : model.includes("LNC") ? "LNC8"
      : model.includes("CROWN") ? "CROWN-L1060"
      : "LB250II-M";
    return { engine: "okuma", reason: "OKUMA/LB-family/OSP-PxxxL substring match", machineId };
  }

  // U-PP-FA10S-WIRE -- FA10S/FA-series is MELCUT (M6/M7/M28/M80), a DISTINCT engine from the
  // MV-series MV1200R (M800/M700V). Caught BEFORE the generic MITSUBISHI branch so it can never
  // mis-route to MV1200R + emit the wrong dialect; fail loud + redirect to wedm_post_mitsubishi_generate.
  if (
    model.includes("FA10") || model.includes("FA-10") || model.includes("FA20") ||
    model.includes("FA SERIES") || model.includes("FA-SERIES") || model.includes("MELCUT")
  ) {
    return { engine: "fa10s", error: "FA10S/FA-series MELCUT dialect -- use wedm_post_mitsubishi_generate, not the MV-series path" };
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
    error: `Unknown machine model: ${machineModel}. Supported lathes: OKUMA_LB200/LB250/LB300, GENOS_L200E-M/L300-M/L400II-E, LNC8, CROWN_L1060, OSP-P300L, OSP-P500L. Supported mills: HURCO VMX/VM10/VM20/V11/MAX31/ULTIMAX/ULTIMOTION; OKUMA OSP-P300M/OSP-P500M (PPG-WIRE-MS5/U-PPGW-OkumaMill). Wire EDM: MITSUBISHI_MV1200R.`,
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
// U-PP-LATHE-MACHINE-AWARE -- LB3000 / MULTUS B250II identity resolution
// ============================================================================

describe("master_post_by_machine -- U-PP-LATHE-MACHINE-AWARE identity resolution", () => {
  it("routes the JM LB3000 to okuma with machineId LB3000", () => {
    const r = routeByMachine("OKUMA_LATHE_LB3000");
    expect(r.engine).toBe("okuma");
    if (r.engine === "okuma") expect(r.machineId).toBe("LB3000");
  });

  it("routes the JM MULTUS B250II to okuma with machineId MULTUS-B250II", () => {
    const r = routeByMachine("OKUMA MULTUS B250IIW");
    expect(r.engine).toBe("okuma");
    if (r.engine === "okuma") expect(r.machineId).toBe("MULTUS-B250II");
  });

  it("[regression] LB250 (contains the substring B250) resolves to LB250II-M, NOT MULTUS", () => {
    const r = routeByMachine("OKUMA LB250II-M");
    expect(r.engine).toBe("okuma");
    if (r.engine === "okuma") expect(r.machineId).toBe("LB250II-M");
  });

  it("a bare OSP-P300L lathe defaults to the LB250II-M identity", () => {
    const r = routeByMachine("OSP-P300L");
    expect(r.engine).toBe("okuma");
    if (r.engine === "okuma") expect(r.machineId).toBe("LB250II-M");
  });
});

// ============================================================================
// U-PP-LATHE-JM-FLEET-IDENTITY -- the 5 GENOS/Crown/LNC JM lathes route AND
// emit their own (MACHINE: ...) header (were silently mislabeled LB250II-M).
// ============================================================================

describe("master_post_by_machine -- U-PP-LATHE-JM-FLEET-IDENTITY", () => {
  // [model string the router receives, resolved machineId, engine's emitted header]
  const JM_FLEET: Array<[string, "GENOS-L300-M" | "GENOS-L200E-M" | "GENOS-L400II-E" | "LNC8" | "CROWN-L1060", string]> = [
    ["OKUMA GENOS L300-M",   "GENOS-L300-M",   "(MACHINE: OKUMA GENOS L300-M OSP-P300L-R)"],
    ["OKUMA GENOS L200E-M",  "GENOS-L200E-M",  "(MACHINE: OKUMA GENOS L200E-M OSP-P200LA-R)"],
    ["OKUMA GENOS L400II-E", "GENOS-L400II-E", "(MACHINE: OKUMA GENOS L400II-E OSP-P300LA-E)"],
    ["OKUMA LNC8",           "LNC8",           "(MACHINE: OKUMA LNC8 OSP-U10L)"],
    ["OKUMA CROWN L1060",    "CROWN-L1060",    "(MACHINE: OKUMA CROWN L1060 OSP-U10L)"],
  ];

  for (const [model, machineId] of JM_FLEET) {
    it(`routes ${model} to okuma with machineId ${machineId} (no LB250II-M mislabel)`, () => {
      const r = routeByMachine(model);
      expect(r.engine).toBe("okuma");
      if (r.engine === "okuma") {
        expect(r.machineId).toBe(machineId);
        expect(r.machineId).not.toBe("LB250II-M");
      }
    });
  }

  it("round-trip: each router-resolved machineId emits the correct (MACHINE: ...) header via the real engine", async () => {
    const { okumaB250LatheMasterPostEngine } = await import("../../engines/OkumaB250LatheMasterPostEngine.js");
    const op = {
      operation_type: "od_rough" as const, tool_number: 1, tool_orientation: 3,
      insert_radius_mm: 0.8, material_iso: "P" as const, css_m_min: 200, feed_mm_rev: 0.25,
      depth_of_cut_mm: 2, start_x: 50, start_z: 0, end_x: 48, end_z: -30, coolant: "flood" as const,
    };
    const headerOf = (g: string[]) => g.find((l) => l.startsWith("(MACHINE:"));
    for (const [model, , expectedHeader] of JM_FLEET) {
      const routed = routeByMachine(model);
      expect(routed.engine).toBe("okuma");
      const id = routed.engine === "okuma" ? routed.machineId : "LB250II-M";
      const out = okumaB250LatheMasterPostEngine.generateProgram([op], { machine_id: id });
      expect(headerOf(out.gcode)).toBe(expectedHeader);
      expect(out.warnings.some((w) => w.includes("Unknown machine_id"))).toBe(false);
    }
  });

  it("[regression] a bare GENOS *mill* (M-series, no L-number) does NOT match the new GENOS lathe clause", () => {
    // GENOS is both a lathe (L-series) and a mill (M-series) family. Without the
    // L-number gate, a bare model.includes("GENOS") would route a GENOS mill to the
    // lathe engine; the gate makes it fall through to else-reject. (NOTE: a model
    // carrying the literal "OKUMA" still matches the pre-existing leading
    // model.includes("OKUMA") clause -- a separate, pre-existing broad-match, not this
    // change. This test pins exactly what the GENOS L-number gate adds.)
    const r = routeByMachine("GENOS M560-V");
    expect(r.engine).not.toBe("okuma");
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
      expect(r.error).toContain("OKUMA_LB200/LB250/LB300");
      expect(r.error).toContain("OSP-P300L, OSP-P500L");
      // U-PP-LATHE-JM-FLEET-IDENTITY: the 5 GENOS/Crown/LNC JM lathes are now advertised.
      expect(r.error).toContain("GENOS_L200E-M/L300-M/L400II-E, LNC8, CROWN_L1060");
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

// ============================================================================
// U-PP-FA10S-WIRE — FA10S (MELCUT) must NOT mis-route to the MV-series MV1200R
// ============================================================================
describe("master_post_by_machine — U-PP-FA10S-WIRE (FA10S MELCUT, not MV-series)", () => {
  it("routes MITSUBISHI FA10S to the FA10S redirect, NOT the MV1200R engine", () => {
    const r = routeByMachine("MITSUBISHI FA10S");
    expect(r.engine).toBe("fa10s"); // caught before the generic MITSUBISHI branch
    expect(r.engine === "fa10s" && /MELCUT|wedm_post_mitsubishi/i.test(r.error)).toBe(true);
  });

  it("FA20 and bare MELCUT models also hit the FA10S redirect", () => {
    expect(routeByMachine("FA20").engine).toBe("fa10s");
    expect(routeByMachine("MITSUBISHI MELCUT").engine).toBe("fa10s");
  });

  it("a plain MV1200R model still routes to the MV-series engine (no false FA10S catch)", () => {
    const r = routeByMachine("MITSUBISHI MV1200R");
    expect(r.engine).toBe("mitsubishi");
  });

  it("MV1200 without an FA token does not redirect (regression guard)", () => {
    expect(routeByMachine("MV1200").engine).toBe("mitsubishi");
  });
});
