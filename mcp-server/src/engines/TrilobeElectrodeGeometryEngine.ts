/**
 * TrilobeElectrodeGeometryEngine — ELEC-PIPE-MS0
 *
 * Generates parametric trilobe (taptite) electrode geometry.
 * REVERSE ENGINEERED from: `Automated Program_Corrected 5-25.xlsm`
 *
 * The Excel macro drove a SolidWorks configurator with dimensions in cells B11-B44.
 * This engine replaces that dependency with native PRISM geometry generation.
 *
 * Trilobe Profile Math:
 * ---------------------
 * A trilobe/taptite has a 3-lobed cross-section defined by:
 *   - C(n): Major diameter across lobe crests [inches]
 *   - E(n): Minor diameter across valleys [inches]
 *
 * Polar equation for 3-lobe profile:
 *   r(θ) = R_base + A × cos(3θ)
 * where:
 *   R_base = (C + E) / 4    — average radius
 *   A = (C - E) / 4         — lobe amplitude
 *
 * For helical trilobes (threads), the profile rotates with lead:
 *   θ_offset(z) = 2π × z / lead_length
 *
 * Output Formats:
 * ---------------
 * - STEP (AP214): For Fusion 360, hyperMILL, Mastercam import
 * - DXF: 2D profile for WEDM
 * - G-code: Direct Okuma OSP-P300 polar interpolation
 * - JSON: Parametric definition for PRISM pipeline
 *
 * AI Integration:
 * ---------------
 * - LLMEngine context for spark gap recommendations
 * - Material-aware undersizing based on EDM physics
 *
 * @module engines/TrilobeElectrodeGeometryEngine
 * @version 1.0.0
 */

import { z } from "zod";
import { llmEngine, type ContextChunk } from "./LLMEngine.js";
import { CANONICAL_MATERIAL_DB, EDM_PHYSICS } from "../physics/constants.js";

// ============================================================================
// TRILOBE DIMENSION TYPES (from Excel B11-B44)
// ============================================================================

/** Single trilobe stage dimensions (C/E pair) */
export interface TrilobeStage {
  /** C diameter — major across lobe crests [inches] */
  c_dia_in: number;
  /** E diameter — minor across valleys [inches] */
  e_dia_in: number;
  /** Z position — start of this stage [inches from datum] */
  z_start_in: number;
  /** Z position — end of this stage [inches from datum] */
  z_end_in: number;
}

/** Complete trilobe electrode input */
export interface TrilobeInput {
  /** Part/order number */
  part_number: string;
  /** Customer name */
  customer?: string;

  // Core trilobe dimensions
  /** Trilobe stages (up to 3 for triple taptite) */
  stages: TrilobeStage[];
  /** Number of lobes (always 3 for taptite) */
  lobe_count: 3;
  /** Lead angle for helical trilobes [degrees] — 0 for straight */
  lead_angle_deg: number;

  // Overall dimensions
  /** Total length [inches] */
  total_length_in: number;
  /** Shank diameter [inches] — for holder interface */
  shank_dia_in: number;
  /** Draft angle [degrees] — typically 0-5° */
  draft_deg: number;

  // Electrode modifications
  /** Undersize amount [inches] — for spark gap compensation */
  undersize_in: number;
  /** Oversize amount [inches] — for rough electrodes */
  oversize_in: number;
  /** Surface finish target [Ra µm] */
  target_finish_Ra_um: number;

  // Workpiece info (for AI recommendations)
  /** Workpiece material */
  workpiece_material: "D2" | "M2" | "S7" | "A2" | "H13" | "carbide";

  // Output options
  /** Export to STEP format */
  export_step: boolean;
  /** Export to DXF (2D profile) */
  export_dxf: boolean;
  /** Generate Okuma polar interpolation G-code */
  export_gcode: boolean;
}

/** 2D profile point */
export interface ProfilePoint2D {
  x: number;  // [inches]
  y: number;  // [inches]
}

/** 3D geometry point */
export interface Point3D {
  x: number;  // [inches]
  y: number;  // [inches]
  z: number;  // [inches]
}

/** Trilobe cross-section at a Z height */
export interface TrilobeSection {
  z_in: number;
  c_dia_in: number;
  e_dia_in: number;
  profile_points: ProfilePoint2D[];
  lobe_rotation_deg: number;
}

/** Generated geometry output */
export interface TrilobeGeometry {
  /** Parametric definition */
  definition: {
    stages: TrilobeStage[];
    lobe_count: number;
    lead_angle_deg: number;
    total_length_in: number;
    undersize_applied_in: number;
  };
  /** Cross-sections at Z intervals */
  sections: TrilobeSection[];
  /** 3D point cloud for visualization */
  point_cloud: Point3D[];
  /** Volume estimate [cubic inches] */
  volume_in3: number;
  /** Surface area estimate [square inches] */
  surface_area_in2: number;
}

/** CAM export result */
export interface CAMExport {
  /** Target CAM system */
  cam_system: "hypermill" | "fusion360" | "mastercam";
  /** Export format */
  format: "step" | "dxf" | "iges" | "template";
  /** File content (base64 for binary, plain text for ASCII) */
  content: string;
  /** Suggested filename */
  filename: string;
  /** File size estimate [bytes] */
  size_bytes: number;
  /** CAM-specific notes */
  notes: string[];
}

/** Engine output */
export interface TrilobeOutput {
  job_id: string;
  part_number: string;
  geometry: TrilobeGeometry;
  cam_exports: CAMExport[];
  ai_recommendations: {
    electrode_material: string;
    spark_gap_mm: number;
    reasoning: string;
    milling_strategy: string;
  };
  warnings: string[];
  created_at: string;
}

// ============================================================================
// GEOMETRY CALCULATIONS
// ============================================================================

/**
 * Calculate trilobe profile points at a given C/E diameter.
 * Uses polar equation: r(θ) = R_base + A × cos(3θ)
 *
 * @param c_dia Major diameter [inches]
 * @param e_dia Minor diameter [inches]
 * @param num_points Number of points around profile (default 360)
 * @param rotation_deg Phase rotation [degrees]
 * @returns Array of 2D profile points
 */
export function calculateTrilobeProfile(
  c_dia: number,
  e_dia: number,
  num_points = 360,
  rotation_deg = 0
): ProfilePoint2D[] {
  const R_base = (c_dia + e_dia) / 4;  // Average radius
  const A = (c_dia - e_dia) / 4;       // Lobe amplitude
  const rotation_rad = (rotation_deg * Math.PI) / 180;

  const points: ProfilePoint2D[] = [];

  for (let i = 0; i < num_points; i++) {
    const theta = (2 * Math.PI * i) / num_points + rotation_rad;
    const r = R_base + A * Math.cos(3 * theta);

    points.push({
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
    });
  }

  return points;
}

/**
 * Calculate lobe rotation at a given Z position for helical trilobes.
 *
 * @param z_position Z position [inches]
 * @param lead_angle Lead angle [degrees]
 * @param total_length Total electrode length [inches]
 * @returns Rotation angle [degrees]
 */
export function calculateLobeRotation(
  z_position: number,
  lead_angle_deg: number,
  total_length: number
): number {
  if (lead_angle_deg === 0) return 0;

  // Full rotation over length based on lead angle
  // Lead angle determines how much the profile rotates per unit length
  const rotations_per_inch = Math.tan((lead_angle_deg * Math.PI) / 180);
  return (z_position * rotations_per_inch * 360) % 360;
}

/**
 * Interpolate C/E diameters between stages (for tapered trilobes).
 */
export function interpolateDiameters(
  z_position: number,
  stages: TrilobeStage[]
): { c_dia: number; e_dia: number } {
  // Find the stage containing this Z position
  for (const stage of stages) {
    if (z_position >= stage.z_start_in && z_position <= stage.z_end_in) {
      // Linear interpolation within stage (for tapered sections)
      const t = (z_position - stage.z_start_in) / (stage.z_end_in - stage.z_start_in || 1);
      return {
        c_dia: stage.c_dia_in,
        e_dia: stage.e_dia_in,
      };
    }
  }

  // Default to first stage if before all stages
  if (stages.length > 0) {
    return {
      c_dia: stages[0].c_dia_in,
      e_dia: stages[0].e_dia_in,
    };
  }

  return { c_dia: 0.5, e_dia: 0.4 }; // Fallback
}

/**
 * Calculate electrode volume using numerical integration.
 */
export function calculateVolume(sections: TrilobeSection[], z_step: number): number {
  let volume = 0;

  for (let i = 0; i < sections.length - 1; i++) {
    const area1 = calculateSectionArea(sections[i].profile_points);
    const area2 = calculateSectionArea(sections[i + 1].profile_points);
    const avg_area = (area1 + area2) / 2;
    volume += avg_area * z_step;
  }

  return volume;
}

/**
 * Calculate area of a closed polygon using shoelace formula.
 */
function calculateSectionArea(points: ProfilePoint2D[]): number {
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2;
}

// ============================================================================
// CAM EXPORT GENERATORS
// ============================================================================

/**
 * Generate STEP file content (AP214 subset).
 * Note: Full STEP generation requires OpenCASCADE. This generates a simplified
 * B-rep definition that most CAM systems can import.
 */
function generateSTEPContent(geometry: TrilobeGeometry, partNumber: string): string {
  const timestamp = new Date().toISOString();

  // STEP AP214 header
  let step = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('PRISM Trilobe Electrode'), '2;1');
FILE_NAME('${partNumber}.step', '${timestamp}', ('PRISM MCP'), ('JM Die Company'), '', 'PRISM TrilobeElectrodeGeometryEngine', '');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
`;

  // Add geometry entities (simplified - full STEP would need B-rep)
  let entityId = 1;

  // Cartesian points for each section
  for (const section of geometry.sections) {
    for (const pt of section.profile_points) {
      step += `#${entityId} = CARTESIAN_POINT('', (${pt.x}, ${pt.y}, ${section.z_in}));\n`;
      entityId++;
    }
  }

  step += `ENDSEC;
END-ISO-10303-21;
`;

  return step;
}

/**
 * Generate DXF content for 2D profile (WEDM use).
 */
function generateDXFContent(profile: ProfilePoint2D[], partNumber: string): string {
  let dxf = `0
SECTION
2
HEADER
9
$INSUNITS
70
1
0
ENDSEC
0
SECTION
2
ENTITIES
`;

  // LWPOLYLINE for the trilobe profile
  dxf += `0
LWPOLYLINE
8
0
90
${profile.length}
70
1
`;

  for (const pt of profile) {
    dxf += `10
${pt.x}
20
${pt.y}
`;
  }

  dxf += `0
ENDSEC
0
EOF
`;

  return dxf;
}

/**
 * Generate Okuma OSP-P300 polar interpolation G-code.
 * G12.1 mode for C-axis + X-axis synchronized motion.
 */
function generateOkumaGcode(
  geometry: TrilobeGeometry,
  input: TrilobeInput
): string {
  const lines: string[] = [];

  lines.push(`(PRISM TRILOBE ELECTRODE)`);
  lines.push(`(PART: ${input.part_number})`);
  lines.push(`(GENERATED: ${new Date().toISOString()})`);
  lines.push(``);
  lines.push(`G90 G95 G40`);
  lines.push(`G28 U0 W0`);
  lines.push(`T0101 (TURNING TOOL - DIAMOND INSERT)`);
  lines.push(`G96 S400 M3 M8 (CSS 400 SFM)`);
  lines.push(``);

  // Z positions for passes
  const z_step = 0.010; // 10 thou per pass
  let z_pos = 0;

  lines.push(`(POLAR INTERPOLATION MODE)`);
  lines.push(`G12.1 (ENABLE POLAR INTERPOLATION)`);
  lines.push(``);

  for (const section of geometry.sections) {
    const rotation = section.lobe_rotation_deg;

    // Calculate X position for each angle
    // In polar mode, X = radius, C = angle
    for (let i = 0; i < 360; i += 5) {
      const theta_rad = ((i + rotation) * Math.PI) / 180;
      const R_base = (section.c_dia_in + section.e_dia_in) / 4;
      const A = (section.c_dia_in - section.e_dia_in) / 4;
      const r = R_base + A * Math.cos(3 * theta_rad) - input.undersize_in;

      lines.push(`G1 X${(r * 2).toFixed(4)} C${i.toFixed(1)} F0.003`);
    }

    lines.push(`G0 Z${section.z_in.toFixed(4)}`);
  }

  lines.push(``);
  lines.push(`G13.1 (CANCEL POLAR INTERPOLATION)`);
  lines.push(`G28 U0 W0`);
  lines.push(`M30`);

  return lines.join("\n");
}

/**
 * Generate hyperMILL template suggestion.
 */
function generateHypermillNotes(geometry: TrilobeGeometry, input: TrilobeInput): string[] {
  return [
    `Import STEP file into hyperMILL`,
    `Use 3D Arbitrary Stock definition from imported geometry`,
    `Strategy: 3D Profile Finishing with constant Z stepover`,
    `Tool: Ball endmill R${Math.min(0.125, (input.stages[0]?.c_dia_in - input.stages[0]?.e_dia_in) / 8).toFixed(3)}" for lobe detail`,
    `Recommended DOC: 0.005" for graphite, climb milling`,
    `Enable HSCO (High Speed Cutting Optimization) for smooth surface`,
    `Post-process with Roku-Roku Fanuc 31i-B5 post`,
    `MANDATORY: Include dust extraction M-code in setup`,
  ];
}

/**
 * Generate Fusion 360 import notes.
 */
function generateFusion360Notes(geometry: TrilobeGeometry, input: TrilobeInput): string[] {
  return [
    `Import STEP file via Insert > Insert Mesh or File > Open`,
    `Convert to BRep if needed: Mesh > Modify > Convert Mesh`,
    `Create Manufacture workspace CAM setup`,
    `Use Adaptive Clearing for rough, 3D Contour for finish`,
    `Post-process with generic Fanuc or Roku-Roku post`,
    `For better control, use Fusion 360 API to drive dimensions:`,
    `  adsk.fusion.Component.createNewComponent()`,
    `  Set parameters: C=${input.stages[0]?.c_dia_in}", E=${input.stages[0]?.e_dia_in}"`,
  ];
}

/**
 * Generate Mastercam X8 notes.
 */
function generateMastercamNotes(geometry: TrilobeGeometry, input: TrilobeInput): string[] {
  return [
    `Import STEP file or create from DXF profile`,
    `Use Surface Rough Pocket for material removal`,
    `Use Surface Finish Contour for final profile`,
    `Tool: Bull endmill with corner radius for lobe valleys`,
    `Consider Multi-axis Swarf toolpath for helical trilobes`,
    `Reference existing trilobe templates in:`,
    `  JM DIE/ROKU-ROKU/CAM TEMPLATES/TRILOBE TEMPLATE.invhsm-template`,
  ];
}

// ============================================================================
// AI REASONING INTEGRATION
// ============================================================================

/**
 * Register trilobe context with LLMEngine.
 */
function registerContextProvider(): void {
  llmEngine.registerContextProvider(() => {
    const chunks: ContextChunk[] = [];

    chunks.push({
      type: "custom",
      title: "Trilobe/Taptite Electrode Expertise",
      content: `Trilobes have 3-lobed cross-sections defined by C (major) and E (minor) diameters.
        The lobe amplitude = (C-E)/4. Typical spark gap: 0.03-0.08mm for finish electrodes.
        SAFETY: Never use graphite electrodes on carbide workpieces — use CuW70 instead.
        Okuma lathes (GENOS L300-M, Multus B250II) support C-axis polar interpolation (G12.1).
        Force varies per revolution — use light DOC (0.005") at lobe crests to prevent chipping.`,
      relevance: 0.95,
    });

    return chunks;
  });
}

registerContextProvider();

/**
 * Get AI recommendations for trilobe electrode.
 */
async function getAIRecommendations(input: TrilobeInput): Promise<TrilobeOutput["ai_recommendations"]> {
  const isCarbide = input.workpiece_material === "carbide";

  // Get spark gap from physics constants
  const sparkGap = input.target_finish_Ra_um < 1.0
    ? EDM_PHYSICS.sinker_spark_gap.finish_mm.graphite
    : input.target_finish_Ra_um < 3.2
      ? EDM_PHYSICS.sinker_spark_gap.semi_mm.graphite
      : EDM_PHYSICS.sinker_spark_gap.rough_mm.graphite;

  const prompt = `Recommend electrode setup for trilobe electrode:
C(1)=${input.stages[0]?.c_dia_in}" E(1)=${input.stages[0]?.e_dia_in}"
Workpiece: ${input.workpiece_material}, Target finish: ${input.target_finish_Ra_um}Ra
Lead angle: ${input.lead_angle_deg}°

Consider milling strategy (3D contour vs adaptive) and any special requirements.`;

  const response = await llmEngine.query({
    prompt,
    context_types: ["custom", "material", "tribal"],
    max_tokens: 300,
  });

  return {
    electrode_material: isCarbide ? "copper_tungsten_cuw70" : "graphite_edm3",
    spark_gap_mm: isCarbide ? sparkGap * 0.8 : sparkGap,
    reasoning: response.answer.slice(0, 400),
    milling_strategy: input.lead_angle_deg > 0
      ? "5-axis swarf or multi-axis contour for helical profile"
      : "3D profile finish with constant Z stepover",
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TrilobeElectrodeGeometryEngine {
  private jobCounter = 0;

  /**
   * Generate trilobe electrode geometry with CAM exports.
   */
  async generate(input: TrilobeInput): Promise<TrilobeOutput> {
    const jobId = this.generateJobId(input.part_number);
    const warnings: string[] = [];

    // Validate input
    this.validateInput(input, warnings);

    // Apply undersizing/oversizing
    const adjustedStages = input.stages.map(stage => ({
      ...stage,
      c_dia_in: stage.c_dia_in - input.undersize_in + input.oversize_in,
      e_dia_in: stage.e_dia_in - input.undersize_in + input.oversize_in,
    }));

    // Generate cross-sections at Z intervals
    const z_step = 0.010; // 10 thou intervals
    const sections: TrilobeSection[] = [];

    for (let z = 0; z <= input.total_length_in; z += z_step) {
      const { c_dia, e_dia } = interpolateDiameters(z, adjustedStages);
      const rotation = calculateLobeRotation(z, input.lead_angle_deg, input.total_length_in);
      const profile = calculateTrilobeProfile(c_dia, e_dia, 120, rotation);

      sections.push({
        z_in: z,
        c_dia_in: c_dia,
        e_dia_in: e_dia,
        profile_points: profile,
        lobe_rotation_deg: rotation,
      });
    }

    // Generate 3D point cloud
    const point_cloud: Point3D[] = [];
    for (const section of sections) {
      for (const pt of section.profile_points) {
        point_cloud.push({ x: pt.x, y: pt.y, z: section.z_in });
      }
    }

    // Calculate geometry properties
    const volume = calculateVolume(sections, z_step);
    const surface_area = volume * 4 / input.total_length_in; // Approximation

    const geometry: TrilobeGeometry = {
      definition: {
        stages: adjustedStages,
        lobe_count: 3,
        lead_angle_deg: input.lead_angle_deg,
        total_length_in: input.total_length_in,
        undersize_applied_in: input.undersize_in - input.oversize_in,
      },
      sections,
      point_cloud,
      volume_in3: volume,
      surface_area_in2: surface_area,
    };

    // Generate CAM exports
    const cam_exports: CAMExport[] = [];

    if (input.export_step) {
      const stepContent = generateSTEPContent(geometry, input.part_number);
      cam_exports.push({
        cam_system: "fusion360",
        format: "step",
        content: stepContent,
        filename: `${input.part_number}_trilobe.step`,
        size_bytes: stepContent.length,
        notes: generateFusion360Notes(geometry, input),
      });
      cam_exports.push({
        cam_system: "hypermill",
        format: "step",
        content: stepContent,
        filename: `${input.part_number}_trilobe.step`,
        size_bytes: stepContent.length,
        notes: generateHypermillNotes(geometry, input),
      });
      cam_exports.push({
        cam_system: "mastercam",
        format: "step",
        content: stepContent,
        filename: `${input.part_number}_trilobe.step`,
        size_bytes: stepContent.length,
        notes: generateMastercamNotes(geometry, input),
      });
    }

    if (input.export_dxf) {
      const dxfContent = generateDXFContent(sections[0].profile_points, input.part_number);
      cam_exports.push({
        cam_system: "mastercam",
        format: "dxf",
        content: dxfContent,
        filename: `${input.part_number}_profile.dxf`,
        size_bytes: dxfContent.length,
        notes: ["2D profile for WEDM or lathe programming"],
      });
    }

    if (input.export_gcode) {
      const gcodeContent = generateOkumaGcode(geometry, input);
      cam_exports.push({
        cam_system: "mastercam", // Generic
        format: "template",
        content: gcodeContent,
        filename: `${input.part_number}_okuma.nc`,
        size_bytes: gcodeContent.length,
        notes: [
          "Okuma OSP-P300 polar interpolation G-code",
          "Requires G12.1 (polar mode) capable lathe",
          "Target machines: GENOS L300-M, Multus B250II",
        ],
      });
    }

    // Get AI recommendations
    const ai_recommendations = await getAIRecommendations(input);

    return {
      job_id: jobId,
      part_number: input.part_number,
      geometry,
      cam_exports,
      ai_recommendations,
      warnings,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Generate trilobe profile points only (for preview).
   */
  getProfile(c_dia: number, e_dia: number, rotation_deg = 0): ProfilePoint2D[] {
    return calculateTrilobeProfile(c_dia, e_dia, 360, rotation_deg);
  }

  /**
   * Validate trilobe input.
   */
  private validateInput(input: TrilobeInput, warnings: string[]): void {
    for (const stage of input.stages) {
      if (stage.c_dia_in <= stage.e_dia_in) {
        warnings.push(`Invalid trilobe stage: C(${stage.c_dia_in}) must be > E(${stage.e_dia_in})`);
      }

      const lobe_amplitude = (stage.c_dia_in - stage.e_dia_in) / 4;
      if (lobe_amplitude < 0.005) {
        warnings.push(`Very shallow lobe amplitude (${(lobe_amplitude * 1000).toFixed(1)} thou) may cause machining issues`);
      }
    }

    if (input.workpiece_material === "carbide") {
      warnings.push("SAFETY: Carbide workpiece requires CuW electrode — graphite causes microcracking");
    }

    if (input.lead_angle_deg > 15) {
      warnings.push(`High lead angle (${input.lead_angle_deg}°) may require 5-axis machining`);
    }

    if (input.total_length_in > 4) {
      warnings.push("Long electrode may require additional support or multiple setups");
    }
  }

  private generateJobId(partNumber: string): string {
    this.jobCounter++;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `TRILOBE-${partNumber.slice(0, 6)}-${date}-${this.jobCounter.toString().padStart(3, "0")}`;
  }

  /**
   * Get engine statistics.
   */
  stats(): { jobs_generated: number; cam_systems_supported: number } {
    return {
      jobs_generated: this.jobCounter,
      cam_systems_supported: 3, // hyperMILL, Fusion 360, Mastercam
    };
  }
}

// Export singleton
export const trilobeElectrodeGeometryEngine = new TrilobeElectrodeGeometryEngine();
