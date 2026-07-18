/**
 * BooleanKernelEngine
 *
 * Thin PRISM engine over the CadQuery-backed CAD bridge for real 3D boolean
 * operations. This is the truthful kernel that higher-level editing engines
 * should delegate to when they need union/subtract/intersect semantics.
 */

import { log } from "../utils/Logger.js";
import { getCadBridge } from "./CadBridge.js";

export type BooleanKernelOperation = "union" | "subtract" | "intersect";

export interface BooleanKernelInput {
  operation: BooleanKernelOperation;
  solid_a: string;
  solid_b: string;
  validate_geometry?: boolean;
  min_wall_mm?: number;
  check_thickness?: boolean;
  thickness_samples?: number;
}

export interface BooleanKernelResult {
  success: boolean;
  kernel: "cadquery_bridge";
  operation: BooleanKernelOperation;
  solid_id: string | null;
  volume_mm3: number | null;
  validation?: {
    is_valid: boolean;
    is_manifold: boolean;
    is_watertight: boolean;
    face_count: number;
    volume_mm3: number;
  };
  warnings: string[];
  errors: string[];
}

class BooleanKernelEngine {
  async execute(input: BooleanKernelInput): Promise<BooleanKernelResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const bridge = getCadBridge();
      const booleanResult = await bridge.booleanOp({
        operation: input.operation,
        solid_a: input.solid_a,
        solid_b: input.solid_b,
      });

      let validation: BooleanKernelResult["validation"];
      if (input.validate_geometry) {
        const report = await bridge.validateGeometry({
          solid_id: booleanResult.solid_id,
          min_wall_mm: input.min_wall_mm,
          check_thickness: input.check_thickness ?? false,
          thickness_samples: input.thickness_samples,
        });
        validation = {
          is_valid: report.is_valid,
          is_manifold: report.is_manifold,
          is_watertight: report.is_watertight,
          face_count: report.face_count,
          volume_mm3: report.volume_mm3,
        };

        if (!report.is_valid) {
          warnings.push("Boolean result failed geometry validation.");
        }
      }

      return {
        success: true,
        kernel: "cadquery_bridge",
        operation: input.operation,
        solid_id: booleanResult.solid_id,
        volume_mm3: booleanResult.volume_mm3,
        validation,
        warnings,
        errors,
      };
    } catch (err: any) {
      const message = err?.message ?? String(err);
      errors.push(`Boolean ${input.operation} failed: ${message}`);
      log?.warn?.(`[BooleanKernelEngine] ${message}`);
      return {
        success: false,
        kernel: "cadquery_bridge",
        operation: input.operation,
        solid_id: null,
        volume_mm3: null,
        warnings,
        errors,
      };
    }
  }
}

export const booleanKernelEngine = new BooleanKernelEngine();
export { BooleanKernelEngine };
