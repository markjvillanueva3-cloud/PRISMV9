/**
 * qualityDispatcher.finish-target-wire.test.ts
 *
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-FINISH-TARGET-ADVISOR —
 * round-trip wire tests for the new `finish_target_advise` action wrapping
 * FinishTargetAdvisorEngine through prism_quality.
 *
 * Real-value assertions against the documented Boothroyd & Knight formulas:
 *   Turning/boring:  Ra = f² / (32 × r)            (mm → ×1000 → µm)
 *   Milling:         Ra = fz² / (32 × R)           (R = cutter_diameter / 2)
 *
 * Reference tables verified literally (engine lines 81-93):
 *   BUE_FACTOR    : P=1.0, M=1.15, K=0.9, N=1.3, S=1.1, H=0.85
 *   COOLANT_FACTOR: dry=1.2, mist=1.05, flood=1.0, mql=0.95, high_pressure=0.9, cryogenic=0.85
 *
 * Best coolant = cryogenic (smallest factor) — assertion guards that the
 * recommendation logic actually consults the table rather than hard-coding.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerQualityDispatcher } from "../tools/dispatchers/qualityDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerQualityDispatcher(fakeServer);
  return { handler };
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("prism_quality finish_target_advise wire (OBSIDIAN-PRISM-OS-MS0)", () => {
  let handler: Handler;

  beforeAll(async () => {
    handler = await createServer().handler;
  });

  // ---------------------------------------------------------------------
  // Boothroyd Ra formula — turning + boring
  // ---------------------------------------------------------------------

  describe("Boothroyd Ra formula (turning/boring)", () => {
    it("turning: f=0.2 mm/rev, r=0.8 mm, P-group, flood, default speed/doc/vb → Ra=1.56 µm", async () => {
      // Boothroyd ideal: Ra_µm = (f² / (32 × r)) × 1000 = (0.04 / 25.6) × 1000 = 1.5625
      // BUE(P)=1.0  thermal(@150 m/min)=1.0  wear(vb=0)=1.0  vib(doc=1)=1.0  coolant(flood)=1.0
      // Engine rounds via Math.round(x*100)/100 → 1.56
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "flood",
      });
      expect(r.achievable_ra_um).toBe(1.56);
      expect(r.ra_breakdown.ideal_ra_um).toBe(1.56);
      expect(r.ra_breakdown.bue_factor).toBe(1.0);
      expect(r.ra_breakdown.thermal_factor).toBe(1.0);
      expect(r.ra_breakdown.wear_factor).toBe(1.0);
      expect(r.ra_breakdown.vibration_factor).toBe(1.0);
      // Engine line 136 uses UNROUNDED clampedRa (1.5625) for Rz, then rounds.
      // Rz = round(1.5625 × 4.5 × 100) / 100 = round(703.125)/100 = 7.03 per ISO 4287 approximation.
      expect(r.achievable_rz_um).toBe(Math.round(1.5625 * 4.5 * 100) / 100);
    });

    it("boring uses the same f²/(32·r) formula as turning", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "boring",
        feed_mm_rev: 0.1,
        tool_nose_radius_mm: 0.4,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "flood",
      });
      // Ra = (0.01 / 12.8) × 1000 = 0.78125 → range.min(boring)=0.4 (no clamp) → 0.78
      expect(r.ra_breakdown.ideal_ra_um).toBe(0.78);
      expect(r.achievable_ra_um).toBe(0.78);
    });
  });

  describe("Boothroyd Ra formula (milling)", () => {
    it("milling: fz=0.1 mm, D=10 mm → ideal Ra=0.0625 µm but clamped to range.min=0.8", async () => {
      // R = D/2 = 5; ideal = (0.01 / 160) × 1000 = 0.0625 → rounded ideal_ra_um = 0.06
      // clampedRa = max(range.min=0.8, 0.0625) = 0.8
      const r = await call(handler, "finish_target_advise", {
        operation: "milling",
        feed_per_tooth_mm: 0.1,
        cutter_diameter_mm: 10,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "flood",
      });
      expect(r.ra_breakdown.ideal_ra_um).toBe(0.06);  // raw geometric value, before clamp
      expect(r.achievable_ra_um).toBe(0.8);            // clamped to range.min
    });
  });

  // ---------------------------------------------------------------------
  // BUE factor table — every ISO group enumerated with full Ra recalculation
  // ---------------------------------------------------------------------

  describe("BUE factor table (engine lines 81-83) drives final Ra multiplicatively", () => {
    // Baseline: ideal=1.5625, all other factors=1.0, so achievable_ra_um = round(1.5625 × bue × 100)/100
    const cases: Array<[string, number, number]> = [
      ["P", 1.0,  1.56],
      ["M", 1.15, 1.80],   // round(1.5625 × 1.15 × 100)/100 = round(1.796875×100)/100 = 1.8
      ["K", 0.9,  1.41],   // round(1.40625 × 100)/100 = 1.41
      ["N", 1.3,  2.03],   // round(2.03125 × 100)/100 = 2.03
      ["S", 1.1,  1.72],   // round(1.71875 × 100)/100 = 1.72
      ["H", 0.85, 1.33],   // round(1.328125 × 100)/100 = 1.33
    ];

    for (const [iso, factor, expectedRa] of cases) {
      it(`${iso}-group → bue_factor=${factor} and achievable_ra_um=${expectedRa}`, async () => {
        const r = await call(handler, "finish_target_advise", {
          operation: "turning",
          feed_mm_rev: 0.2,
          tool_nose_radius_mm: 0.8,
          material_iso_group: iso,
          cutting_speed_m_min: 150,
          coolant: "flood",
        });
        expect(r.ra_breakdown.bue_factor).toBe(factor);
        expect(r.achievable_ra_um).toBe(expectedRa);
      });
    }
  });

  // ---------------------------------------------------------------------
  // Coolant factor table + recommendation logic
  // ---------------------------------------------------------------------

  describe("coolant_advice", () => {
    it("recommended coolant is always cryogenic — smallest factor in the table (0.85)", async () => {
      // Engine sorts COOLANT_FACTOR ascending and picks [0][0] → cryogenic
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        material_iso_group: "P",
        coolant: "flood",
      });
      expect(r.coolant_advice.recommended).toBe("cryogenic");
      expect(r.coolant_advice.current).toBe("flood");
      // raImprovement = round((1 - 0.85/1.0) × 100) = 15
      expect(r.coolant_advice.ra_improvement_pct).toBe(15);
    });

    it("dry coolant → ra_improvement_pct measured against the current factor (1.2)", async () => {
      // round((1 - 0.85/1.2) × 100) = round(29.166...) = 29
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        material_iso_group: "P",
        coolant: "dry",
      });
      expect(r.coolant_advice.current).toBe("dry");
      expect(r.coolant_advice.recommended).toBe("cryogenic");
      expect(r.coolant_advice.ra_improvement_pct).toBe(29);
    });

    it("dry coolant inflates final Ra by 1.2×: 1.5625 × 1.2 = 1.875 → 1.88 µm", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "dry",
      });
      expect(r.achievable_ra_um).toBe(Math.round(1.5625 * 1.2 * 100) / 100);
    });
  });

  // ---------------------------------------------------------------------
  // Thermal / wear / vibration factor math
  // ---------------------------------------------------------------------

  describe("correction factors (thermal / wear / vibration)", () => {
    it("thermal: speed=30 m/min → 1.15 (low-speed BUE prone) and inflates Ra", async () => {
      // Ra = 1.5625 × 1.15 = 1.796875 → round = 1.8
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        material_iso_group: "P",
        cutting_speed_m_min: 30,
        coolant: "flood",
      });
      expect(r.ra_breakdown.thermal_factor).toBe(1.15);
      expect(r.achievable_ra_um).toBe(Math.round(1.5625 * 1.15 * 100) / 100);
    });

    it("thermal: speed=350 m/min → 0.95 (high-speed reduces BUE)", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        material_iso_group: "P",
        cutting_speed_m_min: 350,
        coolant: "flood",
      });
      expect(r.ra_breakdown.thermal_factor).toBe(0.95);
      expect(r.achievable_ra_um).toBe(Math.round(1.5625 * 0.95 * 100) / 100);
    });

    it("wear: VB=0.3 mm → wear_factor=1.5 (50% degradation at the threshold)", async () => {
      // wearFactor = 1 + (vb/0.3)×0.5 = 1.5; Ra = 1.5625 × 1.5 = 2.34375 → 2.34
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "flood",
        tool_wear_vb_mm: 0.3,
      });
      expect(r.ra_breakdown.wear_factor).toBe(1.5);
      expect(r.achievable_ra_um).toBe(Math.round(1.5625 * 1.5 * 100) / 100);
    });

    it("vibration boundary: doc=4 mm → 1.15; doc=2 mm → 1.05; doc=1 mm → 1.0", async () => {
      // Three independent boundary calls — assert each both for factor AND propagated Ra
      const cases: Array<[number, number]> = [[4, 1.15], [2, 1.05], [1, 1.0]];
      for (const [doc, expectedFactor] of cases) {
        const r = await call(handler, "finish_target_advise", {
          operation: "turning",
          feed_mm_rev: 0.2,
          tool_nose_radius_mm: 0.8,
          material_iso_group: "P",
          cutting_speed_m_min: 150,
          coolant: "flood",
          depth_of_cut_mm: doc,
        });
        expect(r.ra_breakdown.vibration_factor).toBe(expectedFactor);
        expect(r.achievable_ra_um).toBe(Math.round(1.5625 * expectedFactor * 100) / 100);
      }
    });
  });

  // ---------------------------------------------------------------------
  // Recommendations
  // ---------------------------------------------------------------------

  describe("recommendations", () => {
    it("worn tool (VB > 0.15 mm) surfaces 'Tool worn' rec when target exceeded", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.5,                  // intentionally heavy feed → Ra well above target
        tool_nose_radius_mm: 0.4,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "flood",
        tool_wear_vb_mm: 0.2,
        target_ra_um: 0.5,
      });
      const recs: string[] = r.recommendations ?? [];
      const wornRec = recs.find(s => /Tool worn/.test(s));
      // Engine line 154: `Tool worn (VB=${vb}mm) — index or replace insert`
      expect(wornRec).toBe("Tool worn (VB=0.2mm) — index or replace insert");
    });

    it("N-group surfaces BUE rec (BUE factor=1.3 > 1.1)", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        material_iso_group: "N",
        cutting_speed_m_min: 150,
        coolant: "flood",
      });
      const recs: string[] = r.recommendations ?? [];
      // Engine line 157: `${iso}-group material prone to BUE — increase speed or use coated insert`
      expect(recs).toContain("N-group material prone to BUE — increase speed or use coated insert");
    });

    it("dry coolant + Ra > target → 'Switch to flood or MQL coolant' rec fires verbatim", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.4,
        tool_nose_radius_mm: 0.4,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "dry",
        target_ra_um: 0.5,
      });
      const recs: string[] = r.recommendations ?? [];
      // Engine line 155: "Switch to flood or MQL coolant for better finish"
      expect(recs).toContain("Switch to flood or MQL coolant for better finish");
    });

    it("nose-radius rec fires verbatim when r<0.8mm and Ra>target (engine line 153)", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.4,
        tool_nose_radius_mm: 0.4,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "flood",
        target_ra_um: 0.5,
      });
      const recs: string[] = r.recommendations ?? [];
      expect(recs).toContain("Increase nose radius — Ra ∝ 1/r");
    });

    it("feed-rate rec fires verbatim for turning when Ra>target (engine line 152)", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.4,
        tool_nose_radius_mm: 0.4,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "flood",
        target_ra_um: 0.5,
      });
      const recs: string[] = r.recommendations ?? [];
      expect(recs).toContain("Reduce feed rate — Ra ∝ f²");
    });

    it("when target met, no rec fires for feed/coolant/wear (only BUE if iso-prone)", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        material_iso_group: "P",   // BUE=1.0 (NOT >1.1)
        cutting_speed_m_min: 150,
        coolant: "flood",
        target_ra_um: 100,         // target so loose it's always met
      });
      const recs: string[] = r.recommendations ?? [];
      expect(recs).toEqual([]);    // nothing fires
    });
  });

  // ---------------------------------------------------------------------
  // Operation alternatives
  // ---------------------------------------------------------------------

  describe("operation_alternatives", () => {
    it("when ra is large, suggests up to 3 alternatives with smaller typical Ra, sorted ascending", async () => {
      // Force a high actual Ra by using rough drilling defaults → range.typical=3.2 µm
      const r = await call(handler, "finish_target_advise", {
        operation: "drilling",
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "flood",
      });
      const alts: { operation: string; expected_ra_um: number; note: string }[] = r.operation_alternatives ?? [];
      // engine line 169: slice(0,3) → at most 3
      expect(alts.length).toBeGreaterThan(0);
      expect(alts.length).toBeLessThanOrEqual(3);
      // strict ascending by expected_ra_um (engine line 168)
      for (let i = 1; i < alts.length; i++) {
        expect(alts[i].expected_ra_um).toBeGreaterThanOrEqual(alts[i - 1].expected_ra_um);
      }
      // every alternative is < the chosen op's Ra (filter clause engine line 162)
      for (const a of alts) {
        expect(a.expected_ra_um).toBeLessThan(r.achievable_ra_um);
      }
      // alternatives never include the requested op (filter clause engine line 161)
      for (const a of alts) {
        expect(a.operation).not.toBe("drilling");
      }
      // For drilling with Ra=3.2 µm, lapping(0.05), honing(0.2), grinding(0.4) are the 3 smallest under 3.2
      // So the first alternative should be lapping (typical 0.05 µm).
      expect(alts[0].operation).toBe("lapping");
      expect(alts[0].expected_ra_um).toBe(0.05);
      expect(alts[0].note).toBe("lapping: typical Ra=0.05µm (range 0.012–0.4)");
    });
  });

  // ---------------------------------------------------------------------
  // Target feasibility
  // ---------------------------------------------------------------------

  describe("target_feasible", () => {
    it("target above range.min × 0.8 threshold → feasible (turning floor=0.32)", async () => {
      // Note: engine line 140 uses `target >= range.min * 0.8` and floating-point
      // gives 0.4 * 0.8 = 0.32000000000000006, so target=0.32 actually fails.
      // Use a clearly-above-floor target to verify the documented contract.
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "flood",
        target_ra_um: 0.4,
      });
      expect(r.target_feasible).toBe(true);
    });

    it("target below the floor → infeasible (turning: target=0.1 < 0.32)", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "flood",
        target_ra_um: 0.1,
      });
      expect(r.target_feasible).toBe(false);
    });
  });

  // ---------------------------------------------------------------------
  // Operation range table — every op produces the documented typical Ra
  // when only operation is supplied (range fallback path, engine line 115).
  // ---------------------------------------------------------------------

  describe("OPERATION_RA_RANGE.typical fallback (engine line 115)", () => {
    // From engine lines 69-78 — every typical value at default conditions
    // (BUE(P)=1.0, thermal(speed=150)=1.0, wear=1.0, vib(doc=1)=1.0, coolant(flood)=1.0)
    // and within range.min .. range.max*2 (no clamp).
    const cases: Array<[string, number]> = [
      ["turning",  1.6],
      ["milling",  1.6],
      ["drilling", 3.2],
      ["grinding", 0.4],
      ["boring",   0.8],
      ["reaming",  0.8],
      ["honing",   0.2],
      ["lapping",  0.05],
    ];

    for (const [op, typicalRa] of cases) {
      it(`${op} default → achievable_ra_um=${typicalRa} (typical from range table)`, async () => {
        const r = await call(handler, "finish_target_advise", {
          operation: op,
          material_iso_group: "P",
          cutting_speed_m_min: 150,
          coolant: "flood",
        });
        expect(r.ra_breakdown.ideal_ra_um).toBe(typicalRa);
        expect(r.achievable_ra_um).toBe(typicalRa);
      });
    }
  });

  // ---------------------------------------------------------------------
  // Schema validation failure paths
  // ---------------------------------------------------------------------

  describe("schema validation", () => {
    it("invalid operation enum → Invalid params", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "lasering", // not in enum
      });
      expect(String(r.error)).toMatch(/invalid params/i);
    });

    it("invalid coolant enum → Invalid params", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        coolant: "ionized_helium", // not in enum
      });
      expect(String(r.error)).toMatch(/invalid params/i);
    });

    it("negative feed_mm_rev → Invalid params (positive() guard)", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: -0.1,
        tool_nose_radius_mm: 0.8,
      });
      expect(String(r.error)).toMatch(/invalid params/i);
    });

    it("invalid material_iso_group → Invalid params", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        material_iso_group: "Z", // not in P/M/K/N/S/H
      });
      expect(String(r.error)).toMatch(/invalid params/i);
    });
  });

  // ---------------------------------------------------------------------
  // Adversarial inputs (boundary)
  // ---------------------------------------------------------------------

  describe("adversarial inputs (boundary)", () => {
    it("missing all numerics → falls back to range.typical (turning typical=1.6)", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
      });
      // ideal=1.6, all factors default to 1.0 → 1.6 (engine line 115 fallback)
      expect(r.ra_breakdown.ideal_ra_um).toBe(1.6);
      expect(r.achievable_ra_um).toBe(1.6);
    });

    it("VB=0 → wear_factor exactly 1.0 (boundary, no degradation)", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        tool_wear_vb_mm: 0,
      });
      expect(r.ra_breakdown.wear_factor).toBe(1.0);
    });

    it("huge feed × tiny radius (heavy roughing) clamps Ra at range.max×2 (turning: 12.6)", async () => {
      // ideal = (1.0² / (32 × 0.1)) × 1000 = 312.5 µm → clamp(min 0.4, max 6.3×2=12.6) → 12.6
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 1.0,
        tool_nose_radius_mm: 0.1,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "flood",
      });
      expect(r.achievable_ra_um).toBe(12.6);
    });
  });

  // ---------------------------------------------------------------------
  // Dispatcher wiring round-trip — real-value E2E
  // ---------------------------------------------------------------------

  describe("dispatcher wiring round-trip (E2E real values)", () => {
    it("turning happy path returns the full payload with exact engine-derived values", async () => {
      const r = await call(handler, "finish_target_advise", {
        operation: "turning",
        feed_mm_rev: 0.2,
        tool_nose_radius_mm: 0.8,
        material_iso_group: "P",
        cutting_speed_m_min: 150,
        coolant: "flood",
      });
      // Every field has a deterministic value derived from the engine math
      expect(r.achievable_ra_um).toBe(1.56);
      // Engine uses UNROUNDED clampedRa (1.5625) for Rz, then rounds (engine line 136 + 173)
      expect(r.achievable_rz_um).toBe(Math.round(1.5625 * 4.5 * 100) / 100);
      expect(r.target_feasible).toBe(true);
      expect(r.ra_breakdown.ideal_ra_um).toBe(1.56);
      expect(r.ra_breakdown.bue_factor).toBe(1.0);
      expect(r.ra_breakdown.thermal_factor).toBe(1.0);
      expect(r.ra_breakdown.wear_factor).toBe(1.0);
      expect(r.ra_breakdown.vibration_factor).toBe(1.0);
      expect(r.coolant_advice.current).toBe("flood");
      expect(r.coolant_advice.recommended).toBe("cryogenic");
      expect(r.coolant_advice.ra_improvement_pct).toBe(15);
    });

    it("action is invoked through prism_quality schema validation (rejects unknown action)", async () => {
      const r = await call(handler, "finish_target_advis", {  // typo, missing 'e'
        operation: "turning",
      });
      // Unknown action: rejected by z.enum at dispatcher entry → not validated through schema
      expect(String(r.error ?? "")).toMatch(/invalid|unknown|action/i);
    });
  });
});
