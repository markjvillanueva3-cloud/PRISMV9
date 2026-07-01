/**
 * CADWeldmentEngine -- first-class weldment structural geometry for PRISM CAD: structural MEMBERS
 * (profile swept along a length), GUSSET reinforcement plates, and fillet WELD-BEADS. Closes the
 * coverage-meter "weldments: absent" gap.
 *
 * Real weldment geometry (AWS / structural):
 *   - member:    volume = section_area_mm2 * length_mm        (a profile swept along its length)
 *   - gusset:    volume = 0.5 * leg_a * leg_b * thickness     (a right-triangle reinforcement plate)
 *   - weld_bead: volume = 0.5 * leg^2 * length                (an equal-leg fillet weld; the cross-
 *                section is a right isosceles triangle, throat = leg/sqrt(2))
 *
 * Each op also emits the CadQuery op the codegen lane writes. Engine convention: pure calc, typed
 * returns, edge cases return structured {success:false} (never throw), units mm / mm^3.
 */

/** Weldment operation kind. */
export type WeldmentOp = "member" | "gusset" | "weld_bead";

/** Result of a weldment-geometry computation. */
export interface WeldmentResult {
  op: WeldmentOp;
  success: boolean;
  /** Computed volume (mm^3). */
  volume_mm3: number;
  /** Fillet-weld throat (mm) for a weld_bead; 0 otherwise. */
  throat_mm: number;
  cadquery_op: string;
  notes: string[];
}

const OPS = new Set<WeldmentOp>(["member", "gusset", "weld_bead"]);

function allFinite(...vals: number[]): boolean {
  return vals.every((v) => typeof v === "number" && Number.isFinite(v));
}

function allPositive(...vals: number[]): boolean {
  return vals.every((v) => v > 0);
}

function fail(op: WeldmentOp, note: string): WeldmentResult {
  return { op, success: false, volume_mm3: 0, throat_mm: 0, cadquery_op: "", notes: [note] };
}

/** Weldment structural-geometry engine. */
export class CADWeldmentEngine {
  /** A structural member: a profile (cross-section area) swept along its length. */
  member(sectionAreaMm2: number, lengthMm: number): WeldmentResult {
    if (!allFinite(sectionAreaMm2, lengthMm)) return fail("member", "non-finite input");
    if (!allPositive(sectionAreaMm2, lengthMm)) return fail("member", "section area and length must be positive");
    return { op: "member", success: true, volume_mm3: sectionAreaMm2 * lengthMm, throat_mm: 0,
      cadquery_op: `.sweep(profile)  # structural member, ${lengthMm} mm long`, notes: [] };
  }

  /** A right-triangle gusset reinforcement plate (legs a x b, thickness t). */
  gusset(legAMm: number, legBMm: number, thicknessMm: number): WeldmentResult {
    if (!allFinite(legAMm, legBMm, thicknessMm)) return fail("gusset", "non-finite input");
    if (!allPositive(legAMm, legBMm, thicknessMm)) return fail("gusset", "gusset legs and thickness must be positive");
    const vol = 0.5 * legAMm * legBMm * thicknessMm;
    return { op: "gusset", success: true, volume_mm3: vol, throat_mm: 0,
      cadquery_op: `.polyline([(0,0),(${legAMm},0),(0,${legBMm})]).close().extrude(${thicknessMm})  # gusset`, notes: [] };
  }

  /** An equal-leg fillet weld bead: cross-section 0.5*leg^2, throat leg/sqrt(2), volume * length. */
  weldBead(legMm: number, lengthMm: number): WeldmentResult {
    if (!allFinite(legMm, lengthMm)) return fail("weld_bead", "non-finite input");
    if (!allPositive(legMm, lengthMm)) return fail("weld_bead", "weld leg and length must be positive");
    const vol = 0.5 * legMm * legMm * lengthMm;
    const throat = legMm / Math.SQRT2;
    return { op: "weld_bead", success: true, volume_mm3: vol, throat_mm: throat,
      cadquery_op: `# fillet weld: leg ${legMm} mm, length ${lengthMm} mm, throat ${throat.toFixed(3)} mm`, notes: [] };
  }

  /** Dispatcher entrypoint: route a params object to the right weldment op. */
  apply(params: Record<string, unknown>): WeldmentResult {
    const op = String(params.op ?? params.weldment ?? params.type ?? "") as WeldmentOp;
    const n = (k: string): number => Number(params[k]);
    if (!OPS.has(op)) return fail("member", `unknown weldment op '${op}' (expected member|gusset|weld_bead)`);
    switch (op) {
      case "member": return this.member(n("section_area_mm2"), n("length_mm"));
      case "gusset": return this.gusset(n("leg_a_mm"), n("leg_b_mm"), n("thickness_mm"));
      case "weld_bead": return this.weldBead(n("leg_mm"), n("length_mm"));
      default: return fail("member", `unhandled weldment op '${op}'`);
    }
  }
}

export const cadWeldmentEngine = new CADWeldmentEngine();
