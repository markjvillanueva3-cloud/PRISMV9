/**
 * CAMSurfaceFinishMapperEngine — CAM-AI-TRAINING-MS0/U-CAMT-FINISH-MAPPER
 *
 * Maps a Ra (µm) surface-finish requirement to a finishing strategy
 * stack. Used by the kilo print-to-program orchestrator to translate
 * a blueprint's Ra callout into the strategy + stepover + scallop +
 * post-process operation (polish / lap / ECM / EDM as needed).
 *
 * Ra bands (industry standard):
 *   Ra ≤ 0.1   → mirror / lap / polish (post-mill secondary)
 *   Ra ≤ 0.4   → ball-finish + scallop with tight stepover (0.05-0.1mm)
 *   Ra ≤ 0.8   → ball-finish scallop + pencil_trace cleanup
 *   Ra ≤ 1.6   → contour finish (waterline)
 *   Ra ≤ 3.2   → semi-finish parallel/contour
 *   Ra >  3.2  → roughing only — no finish pass required
 *
 * Returns a FinishPlan with strategy stack + recommended stepover +
 * scallop + whether a post-mill secondary op is needed.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

export type FinishStrategy =
  | "lap_polish"
  | "ball_scallop_tight"
  | "ball_scallop_pencil"
  | "contour_waterline"
  | "semi_finish"
  | "rough_only";

export interface FinishPlan {
  raMicrometers: number;
  /** Strategy stack — first entry runs first, last entry leaves the spec finish. */
  strategies: ReadonlyArray<FinishStrategy>;
  /** Recommended stepover mm for the finishing pass. */
  stepoverMm: number;
  /** Allowed scallop height (mm). */
  scallopMm: number;
  /** True when a post-mill secondary op (polish, lap, EDM polish) is required. */
  needsSecondaryOp: boolean;
  rationale: string;
}

const RA_LAP_THRESHOLD = 0.1;
const RA_BALL_TIGHT_THRESHOLD = 0.4;
const RA_BALL_PENCIL_THRESHOLD = 0.8;
const RA_CONTOUR_THRESHOLD = 1.6;
const RA_SEMI_THRESHOLD = 3.2;

export class CAMSurfaceFinishMapperEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMSurfaceFinishMapperEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Maps Ra surface-finish requirement to finishing strategy + stepover + scallop + secondary-op flag.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "map",         description: "Map Ra → FinishPlan",     actions: ["cam_finish_map"] },
      { name: "strategies",  description: "List FinishStrategy enum", actions: ["cam_finish_strategies"] },
      { name: "thresholds",  description: "Return Ra band thresholds", actions: ["cam_finish_thresholds"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMSurfaceFinishMapperEngine", note: "use typed methods" };
  }

  map(raMicrometers: number): FinishPlan {
    const ra = Math.max(0.001, raMicrometers);

    if (ra <= RA_LAP_THRESHOLD) {
      return {
        raMicrometers: ra,
        strategies: ["ball_scallop_tight", "lap_polish"],
        stepoverMm: 0.025,
        scallopMm: 0.0005,
        needsSecondaryOp: true,
        rationale: `Ra ≤${RA_LAP_THRESHOLD} requires mill-then-polish; mill leaves tight scallop, polish/lap brings to mirror`,
      };
    }
    if (ra <= RA_BALL_TIGHT_THRESHOLD) {
      return {
        raMicrometers: ra,
        strategies: ["ball_scallop_tight"],
        stepoverMm: 0.05,
        scallopMm: 0.002,
        needsSecondaryOp: false,
        rationale: `Ra ≤${RA_BALL_TIGHT_THRESHOLD} achievable with tight-stepover ball finish (0.05mm step, 0.002mm scallop)`,
      };
    }
    if (ra <= RA_BALL_PENCIL_THRESHOLD) {
      return {
        raMicrometers: ra,
        strategies: ["ball_scallop_pencil"],
        stepoverMm: 0.10,
        scallopMm: 0.008,
        needsSecondaryOp: false,
        rationale: `Ra ≤${RA_BALL_PENCIL_THRESHOLD} via scallop pass + pencil_trace cleanup for cusps`,
      };
    }
    if (ra <= RA_CONTOUR_THRESHOLD) {
      return {
        raMicrometers: ra,
        strategies: ["contour_waterline"],
        stepoverMm: 0.20,
        scallopMm: 0.015,
        needsSecondaryOp: false,
        rationale: `Ra ≤${RA_CONTOUR_THRESHOLD} via contour / waterline finish (Z-level constant)`,
      };
    }
    if (ra <= RA_SEMI_THRESHOLD) {
      return {
        raMicrometers: ra,
        strategies: ["semi_finish"],
        stepoverMm: 0.30,
        scallopMm: 0.030,
        needsSecondaryOp: false,
        rationale: `Ra ≤${RA_SEMI_THRESHOLD} via semi-finish parallel pass`,
      };
    }
    return {
      raMicrometers: ra,
      strategies: ["rough_only"],
      stepoverMm: 0.50,
      scallopMm: 0.080,
      needsSecondaryOp: false,
      rationale: `Ra >${RA_SEMI_THRESHOLD} achievable by roughing alone — no finish pass required`,
    };
  }

  strategies(): ReadonlyArray<FinishStrategy> {
    return ["lap_polish", "ball_scallop_tight", "ball_scallop_pencil", "contour_waterline", "semi_finish", "rough_only"];
  }

  thresholds(): { lap: number; ballTight: number; ballPencil: number; contour: number; semi: number } {
    return {
      lap: RA_LAP_THRESHOLD,
      ballTight: RA_BALL_TIGHT_THRESHOLD,
      ballPencil: RA_BALL_PENCIL_THRESHOLD,
      contour: RA_CONTOUR_THRESHOLD,
      semi: RA_SEMI_THRESHOLD,
    };
  }
}

export const camSurfaceFinishMapperEngine = new CAMSurfaceFinishMapperEngine();
