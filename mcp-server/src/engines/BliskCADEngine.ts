/**
 * BliskCADEngine — U-CADC16 / CAD-COMPLETE-MS0 (PHASE-4)
 *
 * Generates 3D blisk (blade-integrated disk) geometry for turbomachinery.
 * Blisks are monolithic components where blades are machined from a single
 * forging, eliminating the need for blade root attachments (fir-tree, dovetail).
 *
 * Key differentiator from ImpellerCADEngine:
 *   - Uses `pattern_circular` for blade replication (CAD-native efficiency)
 *   - Uses `blend_surface` for blade root fillets (structural integrity)
 *   - Open design (no shroud) — typical for compressor/turbine stages
 *   - Focus on aerospace applications (jet engines, gas turbines, turbofans)
 *
 * Cross-CAD mapping for pattern_circular:
 *   - CadQuery: Workplane.polarArray()
 *   - FreeCAD: Draft.makeArray() with polar=True
 *   - SolidWorks: CircularPattern
 *   - Inventor: CircularPatternFeature
 *   - Fusion 360: CircularPatternFeatureInput
 *   - NX: Pattern Feature (circular)
 *
 * Blade profiles sourced from BladeProfileLibraryEngine (NACA series).
 *
 * References:
 *   - Rolls-Royce, "The Jet Engine" (5th ed., 2015), ch. 3-4
 *   - Saravanamuttoo et al., "Gas Turbine Theory" (7th ed., 2017)
 *   - MTU Aero Engines, "Blisk Manufacturing Technology" (technical paper)
 *
 * @module engines/BliskCADEngine
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

export type BliskStageType = "compressor" | "turbine" | "fan";

export interface BliskBladeSpec {
  /** NACA designation for blade profile (e.g., "NACA 65-010"). */
  profile: string;
  /** Blade inlet angle β1 (degrees from axial, 20-60 typical). */
  inletAngle_deg: number;
  /** Blade outlet angle β2 (degrees from axial, 30-70 typical). */
  outletAngle_deg: number;
  /** Blade chord length at hub (mm). */
  chordHub_mm: number;
  /** Blade chord length at tip (mm). */
  chordTip_mm: number;
  /** Blade height (radial span, mm). */
  height_mm: number;
  /** Blade twist angle from hub to tip (degrees, 0-30 typical). */
  twist_deg?: number;
  /** Blade lean angle (tangential lean, degrees). */
  lean_deg?: number;
  /** Blade sweep angle (axial sweep, degrees). */
  sweep_deg?: number;
  /** Thickness scaling factor (1.0 = profile thickness as-is). */
  thicknessScale?: number;
}

export interface BliskSpec {
  /** Unique ID for this blisk. */
  id: string;
  /** Stage type (affects default parameters). */
  stageType: BliskStageType;

  // Disk geometry
  /** Disk outer radius (blade root radius, mm). */
  diskOuterRadius_mm: number;
  /** Disk inner radius (bore/web radius, mm). */
  diskInnerRadius_mm: number;
  /** Disk axial thickness (mm). */
  diskThickness_mm: number;
  /** Disk web thickness (thinner section between bore and rim, mm). */
  webThickness_mm?: number;

  // Blade geometry
  /** Number of blades. */
  bladeCount: number;
  /** Blade specification. */
  blade: BliskBladeSpec;
  /** Root fillet radius (blade-to-disk transition, mm). */
  rootFilletRadius_mm: number;
  /** Tip fillet radius (blade tip rounding, mm). */
  tipFilletRadius_mm?: number;

  // Bore / mounting
  /** Bore diameter for shaft (mm). */
  boreDiameter_mm: number;
  /** Spline count (0 = smooth bore). */
  splineCount?: number;
  /** Spline depth (mm). */
  splineDepth_mm?: number;

  // Optional
  /** Material (for metadata/comments). */
  material?: string;
  /** Surface finish Ra (μm) for flow surfaces. */
  surfaceFinish_um?: number;
  /** Balancing features (holes on rim). */
  balanceHoles?: { count: number; diameter_mm: number; depth_mm: number };
}

export interface BliskGeometryResult {
  /** Blisk ID. */
  id: string;
  /** Stage type. */
  stageType: BliskStageType;
  /** Generated CAD operations. */
  operations: CADOperation[];
  /** Blade profile control points for one blade (hub to tip sections). */
  bladeControlPoints: Array<Array<[number, number, number]>>;
  /** Estimated volume (mm³). */
  volumeEstimate_mm3: number;
  /** Estimated mass at ρ=8190 kg/m³ (Inconel 718 typical). */
  massEstimate_kg: number;
  /** Warnings generated during processing. */
  warnings: string[];
}

// ── Validation result ─────────────────────────────────────────────────────

export interface BliskValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ── Blade count recommendation ────────────────────────────────────────────

export interface BladeCountRecommendation {
  recommended: number;
  min: number;
  max: number;
  formula: string;
  notes: string[];
}

// ── Profile listing ───────────────────────────────────────────────────────

export interface BliskProfileInfo {
  designation: string;
  suitableFor: BliskStageType[];
  thicknessPercent: number;
  notes: string;
}

// ── Errors ───────────────────────────────────────────────────────────────

export class BliskSpecError extends Error {
  constructor(public readonly field: string, reason: string) {
    super(`Invalid blisk spec '${field}': ${reason}`);
    this.name = "BliskSpecError";
  }
}

// ── Engine ───────────────────────────────────────────────────────────────

export class BliskCADEngine {
  private readonly profileLib: BladeProfileLibraryEngine;

  constructor() {
    this.profileLib = new BladeProfileLibraryEngine();
  }

  // ─── Main generation ──────────────────────────────────────────────────

  /**
   * Generate full blisk geometry as CAD operations.
   * Uses circular pattern for efficient blade replication.
   */
  generate(spec: BliskSpec): BliskGeometryResult {
    this.validateSpecStrict(spec);
    const warnings: string[] = [];

    // Get blade airfoil profile
    const airfoil = this.profileLib.getProfile(spec.blade.profile, 50);

    const ops: CADOperation[] = [];
    let opIndex = 0;

    // 1. Create datum coordinate system at blisk axis
    ops.push(this.makeOp("datum_coord_system", {
      name: `${spec.id}_WCS`,
      origin: [0, 0, 0],
      x_dir: [1, 0, 0],
      y_dir: [0, 1, 0],
    }, `Blisk ${spec.id} coordinate system`, opIndex++));

    // 2. Generate disk body
    const diskOps = this.generateDiskOps(spec, opIndex);
    ops.push(...diskOps);
    opIndex += diskOps.length;

    // 3. Generate single blade geometry (master for pattern)
    const { bladeOps, controlPoints } = this.generateMasterBladeOps(
      spec, airfoil, opIndex
    );
    ops.push(...bladeOps);
    opIndex += bladeOps.length;

    // 4. Apply circular pattern to replicate blade
    ops.push(this.makeOp("pattern_circular", {
      feature: `${spec.id}_master_blade`,
      axis: [0, 0, 1], // Z axis
      count: spec.bladeCount,
      angle: 360, // Full circle
      equal_spacing: true,
      name: `${spec.id}_blade_pattern`,
    }, `Circular pattern: ${spec.bladeCount} blades`, opIndex++));

    // 5. Apply root fillet (blend_surface for smooth transition)
    ops.push(this.makeOp("feature_fillet", {
      edges: [`${spec.id}_blade_pattern_root_edges`],
      radius: spec.rootFilletRadius_mm,
      variable: false,
      tangent_propagation: true,
      name: `${spec.id}_root_fillet`,
    }, `Root fillet: ${spec.rootFilletRadius_mm}mm`, opIndex++));

    // 6. Apply tip fillet if specified
    if (spec.tipFilletRadius_mm && spec.tipFilletRadius_mm > 0) {
      ops.push(this.makeOp("feature_fillet", {
        edges: [`${spec.id}_blade_pattern_tip_edges`],
        radius: spec.tipFilletRadius_mm,
        variable: false,
        name: `${spec.id}_tip_fillet`,
      }, `Tip fillet: ${spec.tipFilletRadius_mm}mm`, opIndex++));
    }

    // 7. Balance holes if specified
    if (spec.balanceHoles) {
      ops.push(...this.generateBalanceHoleOps(spec, opIndex));
      opIndex += 2;
    }

    // Volume estimate
    const diskVol = this.estimateDiskVolume(spec);
    const bladeVol = this.estimateBladeVolume(spec) * spec.bladeCount;
    const totalVol = diskVol + bladeVol;
    const mass = (totalVol / 1e9) * 8190; // Inconel 718 density

    // Add warnings
    if (spec.bladeCount < 20 && spec.stageType === "compressor") {
      warnings.push("Compressor blisks typically have 20+ blades");
    }
    if (spec.rootFilletRadius_mm < 1.5) {
      warnings.push("Root fillet < 1.5mm may cause stress concentration");
    }
    if (spec.blade.height_mm / spec.blade.chordHub_mm > 3) {
      warnings.push("High aspect ratio blades may flutter — consider damping");
    }
    if (spec.diskThickness_mm < spec.blade.chordHub_mm * 0.3) {
      warnings.push("Thin disk may cause vibration coupling with blades");
    }

    return {
      id: spec.id,
      stageType: spec.stageType,
      operations: ops,
      bladeControlPoints: controlPoints,
      volumeEstimate_mm3: totalVol,
      massEstimate_kg: mass,
      warnings,
    };
  }

  // ─── Validation ───────────────────────────────────────────────────────

  /**
   * Validate a blisk spec, returning structured errors/warnings.
   */
  validate(spec: BliskSpec): BliskValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!spec.id || spec.id.trim() === "") {
      errors.push("id: must be non-empty");
    }
    if (!Number.isFinite(spec.diskOuterRadius_mm) || spec.diskOuterRadius_mm <= 0) {
      errors.push("diskOuterRadius_mm: must be positive finite number");
    }
    if (!Number.isFinite(spec.diskInnerRadius_mm) || spec.diskInnerRadius_mm <= 0) {
      errors.push("diskInnerRadius_mm: must be positive finite number");
    }
    if (!Number.isFinite(spec.diskThickness_mm) || spec.diskThickness_mm <= 0) {
      errors.push("diskThickness_mm: must be positive finite number");
    }
    if (!Number.isFinite(spec.boreDiameter_mm) || spec.boreDiameter_mm <= 0) {
      errors.push("boreDiameter_mm: must be positive finite number");
    }
    if (!Number.isFinite(spec.bladeCount) || spec.bladeCount < 3 || spec.bladeCount > 120) {
      errors.push("bladeCount: must be 3-120");
    }
    if (!Number.isFinite(spec.blade.height_mm) || spec.blade.height_mm <= 0) {
      errors.push("blade.height_mm: must be positive finite number");
    }
    if (!Number.isFinite(spec.blade.chordHub_mm) || spec.blade.chordHub_mm <= 0) {
      errors.push("blade.chordHub_mm: must be positive finite number");
    }
    if (!Number.isFinite(spec.blade.chordTip_mm) || spec.blade.chordTip_mm <= 0) {
      errors.push("blade.chordTip_mm: must be positive finite number");
    }
    if (!Number.isFinite(spec.rootFilletRadius_mm) || spec.rootFilletRadius_mm <= 0) {
      errors.push("rootFilletRadius_mm: must be positive finite number");
    }

    // Geometric constraints
    if (spec.diskInnerRadius_mm >= spec.diskOuterRadius_mm) {
      errors.push("diskInnerRadius_mm must be less than diskOuterRadius_mm");
    }
    if (spec.boreDiameter_mm >= spec.diskInnerRadius_mm * 2) {
      errors.push("boreDiameter_mm cannot exceed disk inner diameter");
    }

    // Blade angles
    if (!Number.isFinite(spec.blade.inletAngle_deg) ||
        spec.blade.inletAngle_deg < 0 || spec.blade.inletAngle_deg > 90) {
      errors.push("blade.inletAngle_deg: must be 0-90");
    }
    if (!Number.isFinite(spec.blade.outletAngle_deg) ||
        spec.blade.outletAngle_deg < 0 || spec.blade.outletAngle_deg > 90) {
      errors.push("blade.outletAngle_deg: must be 0-90");
    }

    // Warnings (non-fatal)
    if (spec.blade.height_mm / spec.blade.chordHub_mm > 3) {
      warnings.push("High aspect ratio blade — verify flutter margin");
    }
    if (spec.rootFilletRadius_mm < 1.5) {
      warnings.push("Root fillet < 1.5mm may cause stress concentration");
    }
    const solidity = (spec.bladeCount * spec.blade.chordHub_mm) /
                     (2 * Math.PI * spec.diskOuterRadius_mm);
    if (solidity < 0.8 && spec.stageType === "compressor") {
      warnings.push(`Low solidity (${solidity.toFixed(2)}) — may cause flow separation`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Strict validation — throws on any error.
   */
  private validateSpecStrict(spec: BliskSpec): void {
    const result = this.validate(spec);
    if (!result.valid) {
      throw new BliskSpecError("spec", result.errors.join("; "));
    }
  }

  // ─── Blade count recommendation ────────────────────────────────────────

  /**
   * Recommend blade count based on Zweifel loading coefficient and stage type.
   * Formula: Z ≈ 2π × s/c × cos²(β₂) × (tan(β₁) - tan(β₂))
   * where s = blade pitch, c = chord, β = flow angles
   *
   * For optimal loading Z ≈ 0.8-1.0 (compressor), Z ≈ 0.9-1.1 (turbine)
   */
  recommendBladeCount(params: {
    stageType: BliskStageType;
    diskRadius_mm: number;
    bladeChord_mm: number;
    inletAngle_deg: number;
    outletAngle_deg: number;
  }): BladeCountRecommendation {
    const { stageType, diskRadius_mm, bladeChord_mm, inletAngle_deg, outletAngle_deg } = params;

    const beta1 = (inletAngle_deg * Math.PI) / 180;
    const beta2 = (outletAngle_deg * Math.PI) / 180;
    const circumference = 2 * Math.PI * diskRadius_mm;

    // Target Zweifel coefficient
    const zTarget = stageType === "compressor" ? 0.85 : 1.0;

    // Solve for blade count from Zweifel formula
    // Z = 2 × (s/c) × cos²(β₂) × (tan(β₁) - tan(β₂))
    // s = circumference / N
    // N = circumference / (c × Z / (2 × cos²(β₂) × (tan(β₁) - tan(β₂))))
    const tanDiff = Math.tan(beta1) - Math.tan(beta2);
    const cos2Beta2 = Math.cos(beta2) ** 2;

    if (Math.abs(tanDiff) < 0.01 || cos2Beta2 < 0.01) {
      // Degenerate case — use empirical formula
      const empirical = stageType === "fan" ? 20 :
                        stageType === "turbine" ? 60 : 40;
      return {
        recommended: empirical,
        min: Math.floor(empirical * 0.7),
        max: Math.ceil(empirical * 1.3),
        formula: "Empirical (flat blade angles)",
        notes: ["Blade angles too similar for Zweifel calculation"],
      };
    }

    const pitchOverChord = zTarget / (2 * cos2Beta2 * tanDiff);
    const pitch = pitchOverChord * bladeChord_mm;
    const bladeCount = Math.round(circumference / pitch);

    // Clamp to reasonable bounds
    const minBlades = stageType === "fan" ? 12 : stageType === "turbine" ? 30 : 20;
    const maxBlades = stageType === "fan" ? 40 : stageType === "turbine" ? 100 : 80;
    const recommended = Math.max(minBlades, Math.min(maxBlades, bladeCount));

    return {
      recommended,
      min: Math.max(3, Math.floor(recommended * 0.7)),
      max: Math.ceil(recommended * 1.3),
      formula: `Zweifel Z=${zTarget}: N = 2πR / (c × Z / (2 × cos²β₂ × (tanβ₁ - tanβ₂)))`,
      notes: [
        `Computed pitch: ${pitch.toFixed(2)}mm`,
        `Solidity (c/s): ${(bladeChord_mm / pitch).toFixed(3)}`,
        `Clamped to ${stageType} range: ${minBlades}-${maxBlades}`,
      ],
    };
  }

  // ─── Profile listing ───────────────────────────────────────────────────

  /**
   * List available blade profiles with suitability notes.
   */
  listProfiles(): BliskProfileInfo[] {
    return [
      {
        designation: "NACA 0006",
        suitableFor: ["compressor", "fan"],
        thicknessPercent: 6,
        notes: "Thin symmetric — high-speed compressor blades",
      },
      {
        designation: "NACA 0010",
        suitableFor: ["compressor", "fan", "turbine"],
        thicknessPercent: 10,
        notes: "Standard symmetric — general purpose",
      },
      {
        designation: "NACA 0012",
        suitableFor: ["fan", "turbine"],
        thicknessPercent: 12,
        notes: "Moderate thickness — good structural margin",
      },
      {
        designation: "NACA 2412",
        suitableFor: ["fan"],
        thicknessPercent: 12,
        notes: "Cambered — high-lift fan applications",
      },
      {
        designation: "NACA 4412",
        suitableFor: ["fan"],
        thicknessPercent: 12,
        notes: "High-camber — low-speed high-lift",
      },
      {
        designation: "NACA 65-010",
        suitableFor: ["compressor"],
        thicknessPercent: 10,
        notes: "65-series — optimized for compressor cascade",
      },
      {
        designation: "NACA 65-012",
        suitableFor: ["compressor", "turbine"],
        thicknessPercent: 12,
        notes: "65-series — balanced performance",
      },
      {
        designation: "NACA 23012",
        suitableFor: ["fan", "turbine"],
        thicknessPercent: 12,
        notes: "5-digit — high lift-to-drag ratio",
      },
    ];
  }

  // ─── Disk operations ──────────────────────────────────────────────────

  private generateDiskOps(spec: BliskSpec, startIdx: number): CADOperation[] {
    const ops: CADOperation[] = [];
    let idx = startIdx;

    // Create disk profile sketch (XZ plane)
    ops.push(this.makeOp("sketch_create", {
      plane: "XZ",
      name: `${spec.id}_disk_sketch`,
    }, "Disk cross-section sketch", idx++));

    // Draw disk profile — simplified as stepped profile
    const boreR = spec.boreDiameter_mm / 2;
    const innerR = spec.diskInnerRadius_mm;
    const outerR = spec.diskOuterRadius_mm;
    const webT = spec.webThickness_mm ?? spec.diskThickness_mm * 0.6;
    const diskT = spec.diskThickness_mm;

    // Profile points (Z-R coordinates, will be revolved)
    const profilePts: Array<[number, number]> = [
      [0, boreR],                    // Start at bore, front face
      [0, innerR],                   // Inner radius, front face
      [(diskT - webT) / 2, innerR],  // Step down to web
      [(diskT - webT) / 2, outerR * 0.85], // Web outer
      [0, outerR * 0.85],            // Rim front inner
      [0, outerR],                   // Rim front outer
      [diskT, outerR],               // Rim rear outer
      [diskT, outerR * 0.85],        // Rim rear inner
      [diskT - (diskT - webT) / 2, outerR * 0.85], // Web outer rear
      [diskT - (diskT - webT) / 2, innerR], // Step up from web
      [diskT, innerR],               // Inner radius, rear face
      [diskT, boreR],                // End at bore, rear face
    ];

    // Draw profile as line segments
    for (let i = 0; i < profilePts.length - 1; i++) {
      const p1 = profilePts[i]!;
      const p2 = profilePts[i + 1]!;
      ops.push(this.makeOp("sketch_line", {
        start: [p1[0], p1[1]],
        end: [p2[0], p2[1]],
      }, `Disk profile segment ${i + 1}`, idx++));
    }

    // Close profile
    ops.push(this.makeOp("sketch_line", {
      start: profilePts[profilePts.length - 1]!,
      end: profilePts[0]!,
    }, "Close disk profile", idx++));

    ops.push(this.makeOp("sketch_close", {}, "Complete disk sketch", idx++));

    // Revolve to create disk solid
    ops.push(this.makeOp("feature_revolve", {
      sketch: `${spec.id}_disk_sketch`,
      axis: [1, 0, 0], // Revolve around X (axial)
      angle: 360,
      operation: "new",
      name: `${spec.id}_disk`,
    }, "Revolve disk profile", idx++));

    // Create bore hole
    ops.push(this.makeOp("feature_hole", {
      center: [spec.diskThickness_mm / 2, 0, 0],
      direction: [1, 0, 0],
      diameter: spec.boreDiameter_mm,
      depth: spec.diskThickness_mm,
      operation: "cut",
      name: `${spec.id}_bore`,
    }, "Bore hole", idx++));

    // Splines if specified
    if (spec.splineCount && spec.splineCount > 0 && spec.splineDepth_mm) {
      ops.push(this.makeOp("pattern_circular", {
        feature: `${spec.id}_spline_master`,
        axis: [1, 0, 0],
        count: spec.splineCount,
        angle: 360,
        equal_spacing: true,
        name: `${spec.id}_splines`,
      }, `Spline pattern: ${spec.splineCount} splines`, idx++));
    }

    return ops;
  }

  // ─── Master blade operations ──────────────────────────────────────────

  private generateMasterBladeOps(
    spec: BliskSpec,
    airfoil: AirfoilProfile,
    startIdx: number,
  ): { bladeOps: CADOperation[]; controlPoints: Array<Array<[number, number, number]>> } {
    const ops: CADOperation[] = [];
    const controlPoints: Array<Array<[number, number, number]>> = [];
    let idx = startIdx;

    const bladeId = `${spec.id}_master_blade`;
    const rootR = spec.diskOuterRadius_mm;
    const tipR = rootR + spec.blade.height_mm;
    const twist = (spec.blade.twist_deg ?? 15) * Math.PI / 180;
    const lean = (spec.blade.lean_deg ?? 0) * Math.PI / 180;
    const sweep = (spec.blade.sweep_deg ?? 0) * Math.PI / 180;

    // Generate blade sections from hub to tip
    const sectionCount = 5;
    const sections: Array<{ name: string; points: Array<[number, number, number]> }> = [];

    for (let s = 0; s < sectionCount; s++) {
      const t = s / (sectionCount - 1); // 0 at root, 1 at tip
      const r = rootR + t * spec.blade.height_mm;
      const chord = spec.blade.chordHub_mm + t * (spec.blade.chordTip_mm - spec.blade.chordHub_mm);
      const localTwist = t * twist;
      const localLean = t * lean;
      const localSweep = t * sweep;

      // Interpolate blade angle
      const inletRad = (spec.blade.inletAngle_deg * Math.PI) / 180;
      const outletRad = (spec.blade.outletAngle_deg * Math.PI) / 180;
      const bladeAngle = inletRad + (outletRad - inletRad) * 0.5; // Mid-chord angle

      // Section name
      const secName = `${bladeId}_section_${s}`;
      const secPts: Array<[number, number, number]> = [];

      // Create sketch plane at this radial position
      const planeZ = spec.diskThickness_mm / 2 + localSweep * chord;
      ops.push(this.makeOp("datum_plane", {
        type: "offset",
        reference: "XY",
        offset: r,
        name: `${secName}_plane`,
      }, `Blade section ${s} plane at r=${r.toFixed(1)}mm`, idx++));

      // Create section sketch
      ops.push(this.makeOp("sketch_create", {
        plane: `${secName}_plane`,
        name: `${secName}_sketch`,
      }, `Blade section ${s} sketch`, idx++));

      // Generate airfoil points scaled and rotated
      const thicknessScale = spec.blade.thicknessScale ?? 1.0;
      const sectionAngle = bladeAngle + localTwist;

      // Upper surface
      const upperPts: Array<[number, number]> = [];
      const lowerPts: Array<[number, number]> = [];

      for (const pt of airfoil.upper) {
        const x = pt.x * chord;
        const y = pt.y * chord * thicknessScale;
        // Rotate by section angle
        const xr = x * Math.cos(sectionAngle) - y * Math.sin(sectionAngle);
        const yr = x * Math.sin(sectionAngle) + y * Math.cos(sectionAngle);
        upperPts.push([round4(xr), round4(yr)]);

        // 3D point for control point export
        const x3d = r * Math.cos(localLean) + xr;
        const y3d = r * Math.sin(localLean) + yr;
        const z3d = planeZ;
        secPts.push([round4(x3d), round4(y3d), round4(z3d)]);
      }

      for (const pt of airfoil.lower) {
        const x = pt.x * chord;
        const y = pt.y * chord * thicknessScale;
        const xr = x * Math.cos(sectionAngle) - y * Math.sin(sectionAngle);
        const yr = x * Math.sin(sectionAngle) + y * Math.cos(sectionAngle);
        lowerPts.push([round4(xr), round4(yr)]);
      }

      // Draw as spline
      ops.push(this.makeOp("sketch_spline", {
        points: upperPts,
        closed: false,
        name: `${secName}_upper`,
      }, `Upper surface section ${s}`, idx++));

      ops.push(this.makeOp("sketch_spline", {
        points: lowerPts.reverse(), // Reverse for continuous curve
        closed: false,
        name: `${secName}_lower`,
      }, `Lower surface section ${s}`, idx++));

      // Close the airfoil
      ops.push(this.makeOp("sketch_line", {
        start: upperPts[upperPts.length - 1]!,
        end: lowerPts[0]!,
      }, `Trailing edge close ${s}`, idx++));

      ops.push(this.makeOp("sketch_close", {}, `Complete section ${s}`, idx++));

      sections.push({ name: `${secName}_sketch`, points: secPts });
      controlPoints.push(secPts);
    }

    // Loft through all sections
    ops.push(this.makeOp("feature_loft", {
      profiles: sections.map(s => s.name),
      solid: true,
      ruled: false,
      operation: "join",
      name: bladeId,
    }, `Loft master blade through ${sectionCount} sections`, idx++));

    return { bladeOps: ops, controlPoints };
  }

  // ─── Balance hole operations ──────────────────────────────────────────

  private generateBalanceHoleOps(spec: BliskSpec, startIdx: number): CADOperation[] {
    if (!spec.balanceHoles) return [];

    const ops: CADOperation[] = [];
    let idx = startIdx;

    const holeR = spec.diskOuterRadius_mm * 0.95; // Near rim
    const holeZ = spec.diskThickness_mm / 2;

    // Create one hole
    ops.push(this.makeOp("feature_hole", {
      center: [holeZ, holeR, 0],
      direction: [0, 1, 0], // Radial
      diameter: spec.balanceHoles.diameter_mm,
      depth: spec.balanceHoles.depth_mm,
      operation: "cut",
      name: `${spec.id}_balance_hole_master`,
    }, "Balance hole master", idx++));

    // Pattern around disk
    ops.push(this.makeOp("pattern_circular", {
      feature: `${spec.id}_balance_hole_master`,
      axis: [1, 0, 0],
      count: spec.balanceHoles.count,
      angle: 360,
      equal_spacing: true,
      name: `${spec.id}_balance_holes`,
    }, `Balance hole pattern: ${spec.balanceHoles.count} holes`, idx++));

    return ops;
  }

  // ─── Volume estimation ────────────────────────────────────────────────

  private estimateDiskVolume(spec: BliskSpec): number {
    const outerR = spec.diskOuterRadius_mm;
    const innerR = spec.diskInnerRadius_mm;
    const boreR = spec.boreDiameter_mm / 2;
    const t = spec.diskThickness_mm;
    const webT = spec.webThickness_mm ?? t * 0.6;

    // Simplified as two annular cylinders (rim + web)
    const rimVol = Math.PI * (outerR ** 2 - innerR ** 2) * t;
    const webVol = Math.PI * (innerR ** 2 - boreR ** 2) * webT;

    return rimVol + webVol;
  }

  private estimateBladeVolume(spec: BliskSpec): number {
    // Approximate blade as tapered prism
    const avgChord = (spec.blade.chordHub_mm + spec.blade.chordTip_mm) / 2;
    const height = spec.blade.height_mm;

    // Airfoil cross-section area ≈ 0.1 × chord² (typical NACA)
    const thicknessRatio = 0.1 * (spec.blade.thicknessScale ?? 1.0);
    const avgArea = thicknessRatio * avgChord ** 2;

    return avgArea * height;
  }

  // ─── Helper: make operation ───────────────────────────────────────────

  private makeOp(
    kind: CADOperationKind,
    args: Record<string, unknown>,
    comment: string,
    index: number,
  ): CADOperation {
    return {
      kind,
      args: args as CADOperationArgs,
      comment,
      opIndex: index,
    };
  }
}

// ── Utilities ────────────────────────────────────────────────────────────

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
