/**
 * GrindingProgramAssemblerEngine — PLACEHOLDER
 *
 * This engine was referenced but not fully implemented.
 * Stub to allow build to pass.
 *
 * @module engines/GrindingProgramAssemblerEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// Types
// ============================================================================

export interface SurfaceGrindProfile {
  length_mm: number;
  width_mm: number;
  depth_mm: number;
  wheel_diameter_mm?: number;
  wheel_width_mm?: number;
  material_iso?: string;
}

export interface CylindricalGrindProfile {
  od_mm: number;
  length_mm: number;
  wheel_diameter_mm?: number;
  material_iso?: string;
}

export interface GrindingProgram {
  program_text: string;
  cycle_time_s: number;
  warnings: string[];
}

// ============================================================================
// Engine
// ============================================================================

export class GrindingProgramAssemblerEngine {
  generateSurfaceGrindProgram(profile: SurfaceGrindProfile): GrindingProgram {
    log.warn("[GrindingProgramAssemblerEngine] Stub - not fully implemented");
    return {
      program_text: "( Surface Grind Program - STUB )\nM30\n",
      cycle_time_s: 0,
      warnings: ["Stub engine - not fully implemented"],
    };
  }

  generateCylindricalGrindProgram(profile: CylindricalGrindProfile): GrindingProgram {
    log.warn("[GrindingProgramAssemblerEngine] Stub - not fully implemented");
    return {
      program_text: "( Cylindrical Grind Program - STUB )\nM30\n",
      cycle_time_s: 0,
      warnings: ["Stub engine - not fully implemented"],
    };
  }
}

export const grindingProgramAssemblerEngine = new GrindingProgramAssemblerEngine();
