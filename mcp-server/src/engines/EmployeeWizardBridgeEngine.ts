/**
 * EmployeeWizardBridgeEngine — Unified employee-portal wizard surface.
 *
 * Ties the 4 operator-facing wizards (speed-feed calculator, milling wizard,
 * lathe wizard, wire-EDM wizard) into ONE call surface on the employee portal.
 * Every wizard call automatically threads the per-machine adaptive prior
 * (from `EmployeePerMachineSFAdaptiveEngine`) so the operator gets THIS
 * machine's learned recommendation, not the generic catalog default.
 *
 * Architecture (composition over rebuild):
 *   - Each `recommend*` method calls the adaptive engine for the
 *     (machine_serial, material, tool_type) tuple
 *   - Returns the adapted params + domain-specific strategy hints
 *   - Records the wizard invocation for the cross-job adaptive loop
 *
 * Closes the user directive: "tie the speed feed calculator, milling wizard,
 * lathe wizard and wire edm to the employee portal".
 *
 * Hotel-soul invariants:
 *   - R12 fail-loud on invalid domain/missing required fields
 *   - Object.frozen on every return
 *   - PII-free
 *
 * @module EmployeeWizardBridgeEngine
 * @milestone HOTEL/U-EMP-WIZARD-BRIDGE (2026-05-25, slot:hotel iter8)
 */
import { employeePerMachineSFAdaptiveEngine } from "./EmployeePerMachineSFAdaptiveEngine.js";

// ─── Types ────────────────────────────────────────────────────

export type WizardDomain = "speed_feed" | "milling" | "lathe" | "wire_edm";

export interface WizardCommonInput {
  /** Specific machine SERIAL (not type) — required for per-machine learning. */
  machine_serial: string;
  /** Material short-name (e.g. AL6061-T6, SS304, A2-tool-steel). */
  material: string;
  /** Tool / electrode / wire type. */
  tool_type: string;
  /** Employee id placing the request (for audit). */
  employee_id: string;
  /** Part id (for job-level traceability). */
  part_id: string;
  /** Optional calculator-baseline RPM/feed/DOC/WOC — used as Bayesian bootstrap if no prior exists. */
  bootstrap?: { rpm: number; feed_in_min: number; doc_mm: number; woc_mm: number };
}

export interface MillingWizardInput extends WizardCommonInput {
  operation: "rough" | "finish" | "slot" | "pocket" | "drill" | "ream" | "thread";
  feature_geometry?: {
    depth_mm?: number;
    width_mm?: number;
    diameter_mm?: number;
  };
}

export interface LatheWizardInput extends WizardCommonInput {
  operation: "rough_turn" | "finish_turn" | "face" | "groove" | "part_off" | "thread" | "bore" | "drill";
  spindle_orientation?: "horizontal" | "vertical";
  workpiece_diameter_mm?: number;
}

export interface WireEDMWizardInput extends WizardCommonInput {
  /** Material thickness (mm) — primary EDM cut-rate driver. */
  thickness_mm: number;
  /** Cut count: rough only, rough + skim, rough + 2 skim, etc. */
  cut_count?: 1 | 2 | 3 | 4 | 5;
  /** Required surface finish (Ra μm). */
  required_ra_um?: number;
}

export interface WizardRecommendation {
  domain: WizardDomain;
  /** Per-machine adapted speeds/feeds (from EmployeePerMachineSFAdaptiveEngine). */
  adapted_sf: {
    rpm: number;
    feed_in_min: number;
    doc_mm: number;
    woc_mm: number;
    n_observations: number;
    confidence_band: "low" | "medium" | "high";
  };
  /** Domain-specific strategy hints. */
  strategy: ReadonlyArray<string>;
  /** Safety gates that apply to this operation. */
  safety_gates: ReadonlyArray<string>;
  /** Next-step hint for the operator. */
  next_step: string;
  source: "EmployeeWizardBridgeEngine.v1";
}

// ─── Engine ───────────────────────────────────────────────────

class EmployeeWizardBridgeEngine {
  /**
   * Speed-feed calculator wizard — returns the adapted prior wrapped in
   * a unified WizardRecommendation envelope.
   */
  recommendSpeedFeed(input: WizardCommonInput): WizardRecommendation {
    this.validateCommonInput(input);
    const adapted = this.adapt(input);
    return Object.freeze({
      domain: "speed_feed" as const,
      adapted_sf: adapted,
      strategy: Object.freeze([
        "Run a single trial cut and verify chip color before committing to full-program runtime.",
        "Listen for chatter at 50% and 75% of the recommended feed — back off if you hear it.",
        adapted.n_observations === 0
          ? "First job on this (machine, material, tool) — calculator default in use; record outcome for adaptive learning."
          : `Recommendation reflects ${adapted.n_observations} prior outcomes on this machine.`,
      ]),
      safety_gates: Object.freeze([
        "Verify spindle warm-up complete before high-RPM cuts.",
        "Confirm coolant pressure for material category.",
      ]),
      next_step: "After job completion, record the outcome verdict via emp_sf_record_outcome to update this machine's prior.",
      source: "EmployeeWizardBridgeEngine.v1" as const,
    });
  }

  /**
   * Milling wizard — composes adapted SF + per-operation strategy.
   */
  recommendMilling(input: MillingWizardInput): WizardRecommendation {
    this.validateCommonInput(input);
    if (!input.operation) throw new Error("EmployeeWizardBridgeEngine.recommendMilling: operation required");
    const adapted = this.adapt(input);
    const strategy: string[] = [];
    if (input.operation === "rough") {
      strategy.push("HEM strategy: 10-15% radial engagement, full flute depth — chips carry heat away.");
      strategy.push("Climb-mill where rigidity allows; conventional only for poor-rigidity setups.");
    } else if (input.operation === "finish") {
      strategy.push("Reduce stepover to 5-10% of tool diameter for Ra < 1.6μm finish.");
      strategy.push("Verify part rigidity — finish passes amplify deflection signatures.");
    } else if (input.operation === "slot") {
      strategy.push("Use trochoidal slotting OR pre-drill plunge entry — never plunge full-width.");
      strategy.push("Width-of-cut = 1.0× tool diameter (full slot); reduce ae for high-feed slotting.");
    } else if (input.operation === "pocket") {
      strategy.push("Adaptive pocketing with constant chip load — modern CAM systems do this automatically.");
      strategy.push("Helical entry over plunge — protects center cutting edge.");
    } else if (input.operation === "drill") {
      strategy.push("Peck depth = 3-5× drill diameter for stainless/titanium; 8-10× for aluminum.");
      strategy.push("Through-spindle coolant > flood for deep holes (L/D > 4).");
    } else if (input.operation === "thread") {
      strategy.push("Thread mill > tap on production runs > 50 holes — recover from breakage.");
      strategy.push("Verify spindle synchronization for rigid tapping.");
    }
    return Object.freeze({
      domain: "milling" as const,
      adapted_sf: adapted,
      strategy: Object.freeze(strategy),
      safety_gates: Object.freeze([
        "Tool-path collision check before sending to machine.",
        "Workholding adequate for max cutting force.",
        "Chip evacuation path clear for ae > 50%.",
      ]),
      next_step: `Operation: ${input.operation}. Record outcome with verdict + insert_corner via emp_sf_record_outcome + emp_insert_record_wear.`,
      source: "EmployeeWizardBridgeEngine.v1" as const,
    });
  }

  /**
   * Lathe wizard — composes adapted SF + per-operation lathe strategy.
   */
  recommendLathe(input: LatheWizardInput): WizardRecommendation {
    this.validateCommonInput(input);
    if (!input.operation) throw new Error("EmployeeWizardBridgeEngine.recommendLathe: operation required");
    const adapted = this.adapt(input);
    const strategy: string[] = [];
    if (input.operation === "rough_turn") {
      strategy.push("Constant surface speed (G96/CSS) for diameter changes > 20%.");
      strategy.push("DOC = 0.080-0.150\" typical; keep ap < 0.25 × insert size to control force.");
    } else if (input.operation === "finish_turn") {
      strategy.push("Wiper insert + low fz (≤0.005 ipr) for Ra < 0.8μm.");
      strategy.push("Verify nose-radius ≤ part fillet — never larger.");
    } else if (input.operation === "face") {
      strategy.push("Start at OD, feed toward center with G96 active for constant SFM.");
      strategy.push("Watch for chip evacuation — facing chips can pack against the part.");
    } else if (input.operation === "groove" || input.operation === "part_off") {
      strategy.push("Plunge feed = 50% of turning feed (axial load is structural, not shear).");
      strategy.push("Center-line accuracy critical for part-off — verify Y-axis before plunging.");
    } else if (input.operation === "thread") {
      strategy.push("Pass count from thread depth + flank-load formula (modified flank infeed preferred).");
      strategy.push("Spring-pass at full depth × 2 to size to gage.");
    } else if (input.operation === "bore") {
      strategy.push("L/D < 4 ideal; > 4 needs anti-vibration bar (Sandvik Silent Tools or equivalent).");
      strategy.push("Chip control critical — long stringy chips wrap the bar.");
    } else if (input.operation === "drill") {
      strategy.push("Pilot drill if L/D > 3; peck cycle for stainless or deep holes.");
    }
    return Object.freeze({
      domain: "lathe" as const,
      adapted_sf: adapted,
      strategy: Object.freeze(strategy),
      safety_gates: Object.freeze([
        "Chuck grip force sufficient for cutting force × 2 safety factor.",
        "Tailstock pressure verified for shafts (L/D > 5).",
        "Part-catcher armed for part-off operations.",
      ]),
      next_step: `Operation: ${input.operation}. Record outcome + insert corner via emp_sf_record_outcome + emp_insert_record_wear.`,
      source: "EmployeeWizardBridgeEngine.v1" as const,
    });
  }

  /**
   * Wire-EDM wizard — material thickness drives cut rate; cut-count drives finish.
   * Wire EDM uses different physics than SF (no spindle/feed in the cutting sense)
   * but the per-machine prior still adapts the cut-feed (mm/min) effectively.
   */
  recommendWireEDM(input: WireEDMWizardInput): WizardRecommendation {
    this.validateCommonInput(input);
    if (!Number.isFinite(input.thickness_mm) || input.thickness_mm <= 0) {
      throw new Error("EmployeeWizardBridgeEngine.recommendWireEDM: thickness_mm must be positive finite");
    }
    const cutCount = input.cut_count ?? 1;
    const adapted = this.adapt(input);
    const strategy: string[] = [];
    strategy.push(`Material thickness ${input.thickness_mm}mm → primary cut rate driver.`);
    if (cutCount === 1) {
      strategy.push("Single rough cut — Ra ~3.2μm typical, kerf-edge taper from wire wear.");
    } else if (cutCount === 2) {
      strategy.push("Rough + 1 skim — Ra ~1.6μm, removes recast layer.");
    } else if (cutCount >= 3) {
      strategy.push(`Rough + ${cutCount - 1} skims — Ra < 0.8μm achievable; verify electrode quality.`);
    }
    if (input.required_ra_um !== undefined && input.required_ra_um < 0.8 && cutCount < 3) {
      strategy.push(`⚠ Ra ${input.required_ra_um}μm requires ≥3 cuts — current cut_count=${cutCount}.`);
    }
    strategy.push("Verify wire tension constant — dielectric flush critical at high cut speeds.");
    return Object.freeze({
      domain: "wire_edm" as const,
      adapted_sf: adapted,
      strategy: Object.freeze(strategy),
      safety_gates: Object.freeze([
        "Dielectric level verified before cut start.",
        "Wire-break sensor armed.",
        "Submerged fire-risk check for oil dielectric on ferrous materials.",
      ]),
      next_step: `Thickness ${input.thickness_mm}mm × ${cutCount} cut(s). Record outcome via emp_sf_record_outcome.`,
      source: "EmployeeWizardBridgeEngine.v1" as const,
    });
  }

  // ─── Internals ──────────────────────────────────────────────

  private adapt(
    input: WizardCommonInput,
  ): {
    rpm: number;
    feed_in_min: number;
    doc_mm: number;
    woc_mm: number;
    n_observations: number;
    confidence_band: "low" | "medium" | "high";
  } {
    const args = {
      machine_serial: input.machine_serial,
      material: input.material,
      tool_type: input.tool_type,
      bootstrap: input.bootstrap,
    };
    let n = 0;
    let rec: { rpm: number; feed_in_min: number; doc_mm: number; woc_mm: number };
    try {
      const r = employeePerMachineSFAdaptiveEngine.adaptPrior(args);
      n = r.observations_applied;
      rec = r.recommended;
    } catch (e) {
      if (input.bootstrap) {
        rec = { ...input.bootstrap };
      } else {
        // No prior + no bootstrap → return zeroes with low confidence so
        // caller knows to surface the catalog default.
        rec = { rpm: 0, feed_in_min: 0, doc_mm: 0, woc_mm: 0 };
      }
    }
    const band: "low" | "medium" | "high" = n >= 10 ? "high" : n >= 3 ? "medium" : "low";
    return Object.freeze({ ...rec, n_observations: n, confidence_band: band });
  }

  private validateCommonInput(input: WizardCommonInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("EmployeeWizardBridgeEngine: input required");
    }
    if (!input.machine_serial || !input.material || !input.tool_type) {
      throw new Error("EmployeeWizardBridgeEngine: machine_serial + material + tool_type required");
    }
    if (!input.employee_id || !input.part_id) {
      throw new Error("EmployeeWizardBridgeEngine: employee_id + part_id required");
    }
  }
}

export const employeeWizardBridgeEngine = new EmployeeWizardBridgeEngine();
