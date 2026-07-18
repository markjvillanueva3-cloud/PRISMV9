/**
 * ImpellerCADEngine — U-CADC15 / CAD-COMPLETE-MS0 (PHASE-4)
 *
 * Generates 3D impeller geometry for pumps, fans, compressors, and turbines.
 * Uses BladeProfileLibraryEngine for NACA airfoil profiles and outputs
 * CADOperation[] sequences for any ICADCodeGenerator (FreeCAD, Fusion 360,
 * SolidWorks, NX, etc.).
 *
 * Supports three impeller flow types:
 *   - radial: centrifugal pumps, radial compressors (flow perpendicular to axis)
 *   - axial: axial fans, propellers, axial compressors (flow parallel to axis)
 *   - mixed: diagonal/mixed-flow (flow at angle to axis)
 *
 * Blade geometry parameters (ISO 10439 / API 617 naming):
 *   - β1: blade inlet angle (degrees from tangent)
 *   - β2: blade outlet angle (degrees from tangent)
 *   - wrap: blade wrap angle (degrees of angular coverage)
 *   - lean: blade lean angle (shroud-to-hub phase offset)
 *   - profile: NACA designation for blade cross-section
 *
 * Hub/shroud surfaces are B-spline revolutions; blades are loft/sweep operations
 * between hub and shroud profiles.
 *
 * References:
 *   - Japikse & Baines, "Diffuser Design Technology" (1998), ch. 4-5
 *   - Stepanoff, "Centrifugal and Axial Flow Pumps" (1957), ch. 2
 *   - Aungier, "Centrifugal Compressors: A Strategy for Aerodynamic Design" (2000)
 *
 * @module engines/ImpellerCADEngine
 */

import type {
  CADOperation,
  CADOperationKind,
  CADOperationArgs,
} from "../interfaces/ICADCodeGenerator.js";
import {
  BladeProfileLibraryEngine,
  type AirfoilProfile,
} from "./BladeProfileLibraryEngine.js";

// ── Public types ─────────────────────────────────────────────────────────

export type ImpellerFlowType = "radial" | "axial" | "mixed";

export interface MeridionalPoint {
  /** Axial coordinate (mm), positive downstream. */
  z: number;
  /** Radial coordinate (mm) from axis. */
  r: number;
}

export interface ImpellerBladeSpec {
  /** NACA designation for blade profile (e.g. "NACA 4412"). */
  profile: string;
  /** Inlet blade angle β1 (degrees from tangent, 20-40 typical for centrifugal). */
  inletAngle_deg: number;
  /** Outlet blade angle β2 (degrees from tangent, 25-65 typical). */
  outletAngle_deg: number;
  /** Blade wrap angle (degrees of circumferential coverage, 60-180). */
  wrapAngle_deg: number;
  /** Blade lean angle (shroud leads hub by this many degrees, 0-15). */
  leanAngle_deg?: number;
  /** Chord length at hub (mm). */
  chordHub_mm: number;
  /** Chord length at tip/shroud (mm). */
  chordTip_mm: number;
  /** Thickness scaling factor (1.0 = use profile thickness as-is). */
  thicknessScale?: number;
  /** Number of blades (typically 5-12 for centrifugal, 2-6 for axial). */
  bladeCount: number;
  /** Splitter blades (shorter blades between main blades). */
  splitterCount?: number;
  /** Splitter chord ratio (0.4-0.7 of main blade chord). */
  splitterChordRatio?: number;
}

export interface ImpellerSpec {
  /** Unique ID for this impeller. */
  id: string;
  /** Flow type. */
  flowType: ImpellerFlowType;

  // Hub geometry
  /** Hub inlet radius (mm). */
  hubInletRadius_mm: number;
  /** Hub outlet radius (mm). */
  hubOutletRadius_mm: number;
  /** Hub axial length (mm). */
  hubLength_mm: number;
  /** Hub meridional profile (optional — computed if not provided). */
  hubProfile?: MeridionalPoint[];

  // Shroud geometry
  /** Shroud inlet radius (mm). */
  shroudInletRadius_mm: number;
  /** Shroud outlet radius (mm). */
  shroudOutletRadius_mm: number;
  /** Shroud axial length (mm — may differ from hub for mixed-flow). */
  shroudLength_mm?: number;
  /** Shroud meridional profile (optional — computed if not provided). */
  shroudProfile?: MeridionalPoint[];

  // Blade geometry
  /** Blade specification. */
  blades: ImpellerBladeSpec;

  // Bore / mounting
  /** Bore diameter for shaft (mm). */
  boreDiameter_mm: number;
  /** Keyway width (mm, 0 = no keyway). */
  keywayWidth_mm?: number;
  /** Keyway depth (mm). */
  keywayDepth_mm?: number;

  // Optional
  /** Balance holes near hub eye (diameter, mm). */
  balanceHoleDiameter_mm?: number;
  /** Number of balance holes. */
  balanceHoleCount?: number;
  /** Material (for metadata/comments). */
  material?: string;
  /** Surface finish Ra (μm) for hydraulic surfaces. */
  surfaceFinish_um?: number;
}

export interface ImpellerGeometryResult {
  /** Impeller ID. */
  id: string;
  /** Flow type. */
  flowType: ImpellerFlowType;
  /** Generated CAD operations. */
  operations: CADOperation[];
  /** Hub meridional profile (Z-R points). */
  hubProfile: MeridionalPoint[];
  /** Shroud meridional profile (Z-R points). */
  shroudProfile: MeridionalPoint[];
  /** Blade 3D control points for each blade (array of [x,y,z][]). */
  bladeControlPoints: Array<Array<[number, number, number]>>;
  /** Estimated volume (mm³). */
  volumeEstimate_mm3: number;
  /** Estimated mass at ρ=7850 kg/m³ (steel). */
  massEstimate_kg: number;
  /** Warnings generated during processing. */
  warnings: string[];
}

// ── Errors ───────────────────────────────────────────────────────────────

export class ImpellerSpecError extends Error {
  constructor(public readonly field: string, reason: string) {
    super(`Invalid impeller spec '${field}': ${reason}`);
    this.name = "ImpellerSpecError";
  }
}

// ── Engine ───────────────────────────────────────────────────────────────

export class ImpellerCADEngine {
  private readonly profileLib: BladeProfileLibraryEngine;

  constructor() {
    this.profileLib = new BladeProfileLibraryEngine();
  }

  // ─── Main generation ──────────────────────────────────────────────────

  /**
   * Generate full impeller geometry as CAD operations.
   */
  generate(spec: ImpellerSpec): ImpellerGeometryResult {
    this.validateSpec(spec);
    const warnings: string[] = [];

    // Compute meridional profiles if not provided
    const hubProfile = spec.hubProfile ?? this.computeHubProfile(spec);
    const shroudProfile = spec.shroudProfile ?? this.computeShroudProfile(spec);

    // Get blade airfoil profile
    const airfoil = this.profileLib.getProfile(spec.blades.profile, 60);

    // Generate operations
    const ops: CADOperation[] = [];
    let opIndex = 0;

    // 1. Create datum coordinate system at impeller axis
    ops.push(this.makeOp("datum_coord_system", {
      name: `${spec.id}_WCS`,
      origin: [0, 0, 0],
      x_dir: [1, 0, 0],
      y_dir: [0, 1, 0],
    }, `Impeller ${spec.id} coordinate system`, opIndex++));

    // 2. Generate hub body (revolve)
    ops.push(...this.generateHubOps(spec, hubProfile, opIndex));
    opIndex += 3; // revolve + bore + keyway

    // 3. Generate shroud body (if closed/semi-open impeller)
    if (spec.flowType !== "axial") {
      ops.push(...this.generateShroudOps(spec, shroudProfile, opIndex));
      opIndex += 2;
    }

    // 4. Generate blades
    const { bladeOps, controlPoints } = this.generateBladeOps(
      spec, hubProfile, shroudProfile, airfoil, opIndex
    );
    ops.push(...bladeOps);
    opIndex += bladeOps.length;

    // 5. Generate splitter blades if specified
    if (spec.blades.splitterCount && spec.blades.splitterCount > 0) {
      const splitterOps = this.generateSplitterOps(spec, hubProfile, shroudProfile, airfoil, opIndex);
      ops.push(...splitterOps);
      opIndex += splitterOps.length;
    }

    // 6. Generate balance holes if specified
    if (spec.balanceHoleDiameter_mm && spec.balanceHoleCount) {
      ops.push(...this.generateBalanceHoleOps(spec, hubProfile, opIndex));
      opIndex += 2;
    }

    // Volume estimate (simplified — hub cylinder + blade volume)
    const hubVol = this.estimateHubVolume(spec, hubProfile);
    const bladeVol = this.estimateBladeVolume(spec, hubProfile, shroudProfile);
    const totalVol = hubVol + bladeVol;
    const mass = (totalVol / 1e9) * 7850; // kg

    // Warnings
    if (spec.blades.bladeCount < 4) {
      warnings.push("Blade count < 4 may cause flow instability");
    }
    if (spec.blades.outletAngle_deg > 90) {
      warnings.push("Outlet angle > 90° is unusual (forward-curved blades)");
    }
    if (spec.hubOutletRadius_mm <= spec.hubInletRadius_mm && spec.flowType === "radial") {
      warnings.push("Radial impeller outlet radius should exceed inlet radius");
    }

    return {
      id: spec.id,
      flowType: spec.flowType,
      operations: ops,
      hubProfile,
      shroudProfile,
      bladeControlPoints: controlPoints,
      volumeEstimate_mm3: totalVol,
      massEstimate_kg: mass,
      warnings,
    };
  }

  // ─── Spec validation ──────────────────────────────────────────────────

  private validateSpec(spec: ImpellerSpec): void {
    if (!spec.id || spec.id.trim() === "") {
      throw new ImpellerSpecError("id", "must be non-empty");
    }
    if (!Number.isFinite(spec.hubInletRadius_mm) || spec.hubInletRadius_mm <= 0) {
      throw new ImpellerSpecError("hubInletRadius_mm", "must be positive finite number");
    }
    if (!Number.isFinite(spec.hubOutletRadius_mm) || spec.hubOutletRadius_mm <= 0) {
      throw new ImpellerSpecError("hubOutletRadius_mm", "must be positive finite number");
    }
    if (!Number.isFinite(spec.hubLength_mm) || spec.hubLength_mm <= 0) {
      throw new ImpellerSpecError("hubLength_mm", "must be positive finite number");
    }
    if (!Number.isFinite(spec.shroudInletRadius_mm) || spec.shroudInletRadius_mm <= 0) {
      throw new ImpellerSpecError("shroudInletRadius_mm", "must be positive finite number");
    }
    if (!Number.isFinite(spec.shroudOutletRadius_mm) || spec.shroudOutletRadius_mm <= 0) {
      throw new ImpellerSpecError("shroudOutletRadius_mm", "must be positive finite number");
    }
    if (!Number.isFinite(spec.boreDiameter_mm) || spec.boreDiameter_mm <= 0) {
      throw new ImpellerSpecError("boreDiameter_mm", "must be positive finite number");
    }
    if (spec.boreDiameter_mm >= spec.hubInletRadius_mm * 2) {
      throw new ImpellerSpecError("boreDiameter_mm", "cannot exceed hub inlet diameter");
    }
    if (spec.blades.bladeCount < 2 || spec.blades.bladeCount > 24) {
      throw new ImpellerSpecError("blades.bladeCount", "must be 2-24");
    }
    if (spec.blades.inletAngle_deg < 0 || spec.blades.inletAngle_deg > 90) {
      throw new ImpellerSpecError("blades.inletAngle_deg", "must be 0-90");
    }
    if (spec.blades.outletAngle_deg < 0 || spec.blades.outletAngle_deg > 120) {
      throw new ImpellerSpecError("blades.outletAngle_deg", "must be 0-120");
    }
    if (spec.blades.wrapAngle_deg < 0 || spec.blades.wrapAngle_deg > 360) {
      throw new ImpellerSpecError("blades.wrapAngle_deg", "must be 0-360");
    }
  }

  // ─── Profile computation ──────────────────────────────────────────────

  private computeHubProfile(spec: ImpellerSpec): MeridionalPoint[] {
    const n = 12;
    const pts: MeridionalPoint[] = [];
    const dz = spec.hubLength_mm / n;

    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const z = t * spec.hubLength_mm;
      let r: number;

      if (spec.flowType === "radial") {
        // Radial: parabolic hub contour
        r = spec.hubInletRadius_mm + (spec.hubOutletRadius_mm - spec.hubInletRadius_mm) * Math.pow(t, 1.5);
      } else if (spec.flowType === "axial") {
        // Axial: nearly constant radius
        r = spec.hubInletRadius_mm + (spec.hubOutletRadius_mm - spec.hubInletRadius_mm) * t * 0.3;
      } else {
        // Mixed: intermediate curve
        r = spec.hubInletRadius_mm + (spec.hubOutletRadius_mm - spec.hubInletRadius_mm) * Math.pow(t, 1.2);
      }

      pts.push({ z: round4(z), r: round4(r) });
    }

    return pts;
  }

  private computeShroudProfile(spec: ImpellerSpec): MeridionalPoint[] {
    const n = 12;
    const pts: MeridionalPoint[] = [];
    const shroudLen = spec.shroudLength_mm ?? spec.hubLength_mm;

    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const z = t * shroudLen;
      let r: number;

      if (spec.flowType === "radial") {
        // Radial: shroud curves outward
        r = spec.shroudInletRadius_mm + (spec.shroudOutletRadius_mm - spec.shroudInletRadius_mm) * Math.pow(t, 1.3);
      } else if (spec.flowType === "axial") {
        // Axial: nearly constant radius (tip clearance region)
        r = spec.shroudInletRadius_mm + (spec.shroudOutletRadius_mm - spec.shroudInletRadius_mm) * t * 0.2;
      } else {
        // Mixed: diagonal curve
        r = spec.shroudInletRadius_mm + (spec.shroudOutletRadius_mm - spec.shroudInletRadius_mm) * Math.pow(t, 1.1);
      }

      pts.push({ z: round4(z), r: round4(r) });
    }

    return pts;
  }

  // ─── Hub operations ───────────────────────────────────────────────────

  private generateHubOps(
    spec: ImpellerSpec,
    hubProfile: MeridionalPoint[],
    startIdx: number,
  ): CADOperation[] {
    const ops: CADOperation[] = [];
    let idx = startIdx;

    // Sketch for hub revolve
    ops.push(this.makeOp("sketch_create", {
      plane: "XZ",
      name: `${spec.id}_hub_sketch`,
    }, "Hub meridional sketch", idx++));

    // Spline through hub profile points
    const hubSplinePoints: ReadonlyArray<number> = hubProfile.flatMap(p => [p.z, p.r, 0]);
    ops.push(this.makeOp("sketch_spline", {
      points: hubSplinePoints,
      closed: false,
    }, "Hub meridional curve", idx++));

    // Close sketch with axis and ends
    ops.push(this.makeOp("sketch_line", {
      start: [hubProfile[hubProfile.length - 1]!.z, 0, 0],
      end: [hubProfile[0]!.z, 0, 0],
    }, "Hub closure along axis", idx++));

    ops.push(this.makeOp("sketch_close", {}, "Close hub sketch", idx++));

    // Revolve hub
    ops.push(this.makeOp("feature_revolve", {
      sketch: `${spec.id}_hub_sketch`,
      axis: [0, 0, 1],
      angle: 360,
      operation: "new_body",
      name: `${spec.id}_hub`,
    }, "Revolve hub body", idx++));

    // Cut bore
    ops.push(this.makeOp("feature_hole", {
      center: [0, 0, 0],
      diameter: spec.boreDiameter_mm,
      depth: spec.hubLength_mm + 1,
      through: true,
      name: `${spec.id}_bore`,
    }, "Hub bore", idx++));

    // Keyway if specified
    if (spec.keywayWidth_mm && spec.keywayDepth_mm && spec.keywayWidth_mm > 0) {
      ops.push(this.makeOp("feature_pocket", {
        center: [spec.boreDiameter_mm / 2 - spec.keywayDepth_mm / 2, 0, spec.hubLength_mm / 2],
        width: spec.keywayWidth_mm,
        length: spec.hubLength_mm * 0.8,
        depth: spec.keywayDepth_mm,
        name: `${spec.id}_keyway`,
      }, "Shaft keyway", idx++));
    }

    return ops;
  }

  // ─── Shroud operations ────────────────────────────────────────────────

  private generateShroudOps(
    spec: ImpellerSpec,
    shroudProfile: MeridionalPoint[],
    startIdx: number,
  ): CADOperation[] {
    const ops: CADOperation[] = [];
    let idx = startIdx;

    // For closed impellers, shroud is a shell covering the blades
    // Sketch shroud profile
    ops.push(this.makeOp("sketch_create", {
      plane: "XZ",
      name: `${spec.id}_shroud_sketch`,
    }, "Shroud meridional sketch", idx++));

    const shroudSplinePoints: ReadonlyArray<number> = shroudProfile.flatMap(p => [p.z, p.r, 0]);
    ops.push(this.makeOp("sketch_spline", {
      points: shroudSplinePoints,
      closed: false,
    }, "Shroud meridional curve", idx++));

    // Thin revolve for shroud shell
    ops.push(this.makeOp("feature_revolve", {
      sketch: `${spec.id}_shroud_sketch`,
      axis: [0, 0, 1],
      angle: 360,
      operation: "join",
      thin_wall: true,
      thickness: 3.0, // 3mm shroud wall
      name: `${spec.id}_shroud`,
    }, "Revolve shroud shell", idx++));

    return ops;
  }

  // ─── Blade operations ─────────────────────────────────────────────────

  private generateBladeOps(
    spec: ImpellerSpec,
    hubProfile: MeridionalPoint[],
    shroudProfile: MeridionalPoint[],
    airfoil: AirfoilProfile,
    startIdx: number,
  ): { bladeOps: CADOperation[]; controlPoints: Array<Array<[number, number, number]>> } {
    const ops: CADOperation[] = [];
    const controlPoints: Array<Array<[number, number, number]>> = [];
    let idx = startIdx;

    const bladeCount = spec.blades.bladeCount;
    const bladeAngleStep = 360 / bladeCount;
    const wrapRad = (spec.blades.wrapAngle_deg * Math.PI) / 180;
    const inletRad = (spec.blades.inletAngle_deg * Math.PI) / 180;
    const outletRad = (spec.blades.outletAngle_deg * Math.PI) / 180;
    const leanRad = ((spec.blades.leanAngle_deg ?? 0) * Math.PI) / 180;

    for (let b = 0; b < bladeCount; b++) {
      const baseAngle = (b * bladeAngleStep * Math.PI) / 180;
      const bladeId = `${spec.id}_blade_${b + 1}`;
      const bladePts: Array<[number, number, number]> = [];

      // Generate hub curve for this blade
      const hubCurveOps = this.generateBladeCurve(
        `${bladeId}_hub`,
        hubProfile,
        baseAngle,
        wrapRad,
        inletRad,
        outletRad,
        0, // no lean at hub
        spec.blades.chordHub_mm,
        airfoil,
        spec.blades.thicknessScale ?? 1.0,
        idx,
      );
      ops.push(...hubCurveOps.ops);
      bladePts.push(...hubCurveOps.points);
      idx += hubCurveOps.ops.length;

      // Generate shroud curve for this blade
      const shroudCurveOps = this.generateBladeCurve(
        `${bladeId}_shroud`,
        shroudProfile,
        baseAngle,
        wrapRad,
        inletRad,
        outletRad,
        leanRad,
        spec.blades.chordTip_mm,
        airfoil,
        spec.blades.thicknessScale ?? 1.0,
        idx,
      );
      ops.push(...shroudCurveOps.ops);
      bladePts.push(...shroudCurveOps.points);
      idx += shroudCurveOps.ops.length;

      // Loft between hub and shroud curves
      ops.push(this.makeOp("feature_loft", {
        profiles: [`${bladeId}_hub_curve`, `${bladeId}_shroud_curve`],
        solid: true,
        operation: "join",
        name: bladeId,
      }, `Loft blade ${b + 1}`, idx++));

      controlPoints.push(bladePts);
    }

    return { bladeOps: ops, controlPoints };
  }

  private generateBladeCurve(
    name: string,
    profile: MeridionalPoint[],
    baseAngle: number,
    wrapAngle: number,
    inletAngle: number,
    outletAngle: number,
    leanAngle: number,
    chord: number,
    airfoil: AirfoilProfile,
    thicknessScale: number,
    startIdx: number,
  ): { ops: CADOperation[]; points: Array<[number, number, number]> } {
    const ops: CADOperation[] = [];
    const points: Array<[number, number, number]> = [];
    let idx = startIdx;

    // Sample blade curve along meridional profile
    const n = Math.min(profile.length, 8);
    const curvePoints: Array<[number, number, number]> = [];

    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const meridIdx = Math.floor(t * (profile.length - 1));
      const pt = profile[meridIdx]!;

      // Interpolate blade angle from inlet to outlet
      const bladeAngle = inletAngle + (outletAngle - inletAngle) * t;
      // Circumferential position with wrap
      const theta = baseAngle + wrapAngle * t + leanAngle * t;

      // 3D coordinates
      const x = pt.r * Math.cos(theta);
      const y = pt.r * Math.sin(theta);
      const z = pt.z;

      curvePoints.push([round4(x), round4(y), round4(z)]);
      points.push([round4(x), round4(y), round4(z)]);
    }

    // Create 3D spline for blade curve
    ops.push(this.makeOp("sketch_spline", {
      points: curvePoints.flat() as ReadonlyArray<number>,
      closed: false,
      name: `${name}_curve`,
    }, `Blade curve: ${name}`, idx++));

    return { ops, points };
  }

  // ─── Splitter blade operations ────────────────────────────────────────

  private generateSplitterOps(
    spec: ImpellerSpec,
    hubProfile: MeridionalPoint[],
    shroudProfile: MeridionalPoint[],
    airfoil: AirfoilProfile,
    startIdx: number,
  ): CADOperation[] {
    if (!spec.blades.splitterCount || spec.blades.splitterCount <= 0) {
      return [];
    }

    const ops: CADOperation[] = [];
    let idx = startIdx;

    const mainBladeCount = spec.blades.bladeCount;
    const splitterCount = spec.blades.splitterCount;
    const splitterChordRatio = spec.blades.splitterChordRatio ?? 0.5;
    const bladeAngleStep = 360 / mainBladeCount;
    const splitterOffset = bladeAngleStep / 2; // Center splitters between main blades

    // Splitters are shorter blades positioned between main blades
    // They start partway through the passage
    const startFraction = 1 - splitterChordRatio;
    const shortenedHub = hubProfile.slice(Math.floor(hubProfile.length * startFraction));
    const shortenedShroud = shroudProfile.slice(Math.floor(shroudProfile.length * startFraction));

    const wrapRad = (spec.blades.wrapAngle_deg * Math.PI) / 180 * splitterChordRatio;
    const inletRad = (spec.blades.inletAngle_deg * Math.PI) / 180;
    const outletRad = (spec.blades.outletAngle_deg * Math.PI) / 180;

    for (let s = 0; s < mainBladeCount; s++) {
      const baseAngle = ((s * bladeAngleStep + splitterOffset) * Math.PI) / 180;
      const splitterId = `${spec.id}_splitter_${s + 1}`;

      // Hub curve for splitter
      ops.push(this.makeOp("sketch_spline", {
        points: shortenedHub.flatMap((p, i) => {
          const t = i / (shortenedHub.length - 1);
          const theta = baseAngle + wrapRad * t;
          return [
            round4(p.r * Math.cos(theta)),
            round4(p.r * Math.sin(theta)),
            round4(p.z),
          ];
        }) as ReadonlyArray<number>,
        closed: false,
        name: `${splitterId}_hub_curve`,
      }, `Splitter ${s + 1} hub curve`, idx++));

      // Shroud curve for splitter
      ops.push(this.makeOp("sketch_spline", {
        points: shortenedShroud.flatMap((p, i) => {
          const t = i / (shortenedShroud.length - 1);
          const theta = baseAngle + wrapRad * t;
          return [
            round4(p.r * Math.cos(theta)),
            round4(p.r * Math.sin(theta)),
            round4(p.z),
          ];
        }) as ReadonlyArray<number>,
        closed: false,
        name: `${splitterId}_shroud_curve`,
      }, `Splitter ${s + 1} shroud curve`, idx++));

      // Loft splitter
      ops.push(this.makeOp("feature_loft", {
        profiles: [`${splitterId}_hub_curve`, `${splitterId}_shroud_curve`],
        solid: true,
        operation: "join",
        name: splitterId,
      }, `Loft splitter ${s + 1}`, idx++));
    }

    return ops;
  }

  // ─── Balance hole operations ──────────────────────────────────────────

  private generateBalanceHoleOps(
    spec: ImpellerSpec,
    hubProfile: MeridionalPoint[],
    startIdx: number,
  ): CADOperation[] {
    const ops: CADOperation[] = [];
    let idx = startIdx;

    const holeDia = spec.balanceHoleDiameter_mm!;
    const holeCount = spec.balanceHoleCount!;
    const holeRadius = spec.hubInletRadius_mm * 0.7; // Place holes at 70% of inlet radius

    // Create one hole
    ops.push(this.makeOp("feature_hole", {
      center: [holeRadius, 0, hubProfile[0]!.z + 2],
      diameter: holeDia,
      depth: 10, // Typical through-hub-disc
      through: true,
      name: `${spec.id}_balance_hole`,
    }, "Balance hole", idx++));

    // Pattern around axis
    ops.push(this.makeOp("pattern_circular", {
      feature: `${spec.id}_balance_hole`,
      axis: [0, 0, 1],
      count: holeCount,
      angle: 360,
      name: `${spec.id}_balance_holes`,
    }, "Pattern balance holes", idx++));

    return ops;
  }

  // ─── Volume estimation ────────────────────────────────────────────────

  private estimateHubVolume(spec: ImpellerSpec, hubProfile: MeridionalPoint[]): number {
    // Approximate hub as tapered cylinder
    const r1 = spec.hubInletRadius_mm;
    const r2 = spec.hubOutletRadius_mm;
    const h = spec.hubLength_mm;
    const boreR = spec.boreDiameter_mm / 2;

    // Frustum volume minus bore
    const frustumVol = (Math.PI * h / 3) * (r1 * r1 + r1 * r2 + r2 * r2);
    const boreVol = Math.PI * boreR * boreR * h;

    return frustumVol - boreVol;
  }

  private estimateBladeVolume(
    spec: ImpellerSpec,
    hubProfile: MeridionalPoint[],
    shroudProfile: MeridionalPoint[],
  ): number {
    // Simplified: blade as a curved plate
    const avgChord = (spec.blades.chordHub_mm + spec.blades.chordTip_mm) / 2;
    const avgThickness = avgChord * 0.12 * (spec.blades.thicknessScale ?? 1.0); // ~12% thick
    const bladeHeight = (shroudProfile[0]!.r - hubProfile[0]!.r +
      shroudProfile[shroudProfile.length - 1]!.r - hubProfile[hubProfile.length - 1]!.r) / 2;

    const singleBladeVol = avgChord * bladeHeight * avgThickness;
    return singleBladeVol * spec.blades.bladeCount;
  }

  // ─── Operation helper ─────────────────────────────────────────────────

  private makeOp(
    kind: CADOperationKind,
    args: CADOperationArgs,
    description: string,
    opIndex: number,
  ): CADOperation {
    return {
      kind,
      args,
      operationId: `impeller_op_${opIndex}`,
      description,
    };
  }

  // ─── Utility queries ──────────────────────────────────────────────────

  /**
   * List available blade profiles.
   */
  listProfiles(): string[] {
    return this.profileLib.listCatalog().map(e => e.designation);
  }

  /**
   * Recommend blade count based on flow type and design parameters.
   */
  recommendBladeCount(
    flowType: ImpellerFlowType,
    specificSpeed_Ns: number,
  ): { main: number; splitter: number } {
    // Specific speed Ns = N * Q^0.5 / H^0.75 (metric)
    // Higher Ns → fewer blades
    if (flowType === "axial") {
      return { main: specificSpeed_Ns > 4 ? 3 : 4, splitter: 0 };
    }
    if (flowType === "mixed") {
      return { main: specificSpeed_Ns > 2 ? 5 : 7, splitter: specificSpeed_Ns > 2.5 ? 5 : 0 };
    }
    // Radial
    if (specificSpeed_Ns < 0.5) {
      return { main: 12, splitter: 12 };
    }
    if (specificSpeed_Ns < 1.0) {
      return { main: 9, splitter: 9 };
    }
    if (specificSpeed_Ns < 2.0) {
      return { main: 7, splitter: 7 };
    }
    return { main: 6, splitter: 6 };
  }

  /**
   * Validate impeller spec without generating geometry.
   */
  validate(spec: ImpellerSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    try {
      this.validateSpec(spec);
    } catch (e) {
      if (e instanceof ImpellerSpecError) {
        errors.push(e.message);
      } else {
        throw e;
      }
    }

    // Additional soft checks
    if (spec.flowType === "radial" && spec.hubOutletRadius_mm < spec.hubInletRadius_mm * 1.5) {
      errors.push("Warning: Radial impeller outlet/inlet radius ratio < 1.5 is unusual");
    }
    if (spec.blades.wrapAngle_deg > 180) {
      errors.push("Warning: Wrap angle > 180° may cause manufacturing difficulties");
    }

    return { valid: errors.length === 0, errors };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

// ── Singleton export ─────────────────────────────────────────────────────

export const impellerCADEngine = new ImpellerCADEngine();
