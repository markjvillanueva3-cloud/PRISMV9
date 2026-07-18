/**
 * CAMPostProcessorBridgeEngine — CAM-AI-TRAINING-MS0/U-CAMT-PP-BRIDGE
 *
 * Per kilo slot-soul: "Cross-pipeline handoff via delta (CAD) + echo (CAM)
 * + india (PP) — kilo orchestrates, does not implement at each stage."
 *
 * This bridge engine converts a B03 CamTemplate into the input envelope
 * the india-slot MasterPostProcessor pipeline expects. Decouples kilo's
 * print-to-program orchestration from india's controller-dialect-specific
 * G-code emission.
 *
 * Pure logic — no I/O, no engine imports beyond BaseEngine.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { CamTemplate } from "./CAMTemplateGeneratorEngine.js";

export type ControllerDialect = "fanuc" | "siemens" | "haas" | "okuma" | "heidenhain" | "mazak" | "mitsubishi";

export interface PostProcessorEnvelope {
  /** Stable id matching the source template. */
  templateId: string;
  /** Canonical operation enum. */
  op: string;
  /** CAM-system the template was generated for. */
  system: string;
  /** Target controller dialect for G-code output. */
  controllerDialect: ControllerDialect;
  /** Resolved parameter bag (no null values). */
  parameters: Record<string, number | string | boolean>;
  /** WCS code from the template (defaults G54). */
  wcs: string;
  /** Coolant code (none|flood|mist|air|through_tool). */
  coolant: string;
  /** Spindle RPM. */
  spindleRpm: number | null;
  /** Cutting feed (mm/min). */
  cuttingFeed: number | null;
  /** Plunge feed (mm/min). */
  plungeFeed: number | null;
  /** Safety axis count tag for the post-processor. */
  axisCount: string;
  /** Provenance for audit. */
  provenance: {
    nativeName: string;
    family: string;
    strategy: string;
    featureClass: string;
    generatedAt: string;
  };
}

const DEFAULT_DIALECT: ControllerDialect = "fanuc";

export class CAMPostProcessorBridgeEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMPostProcessorBridgeEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Converts CamTemplate into india-slot MasterPostProcessor input envelope.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "to_envelope",   description: "CamTemplate → PostProcessorEnvelope",       actions: ["cam_pp_envelope"] },
      { name: "dialects",      description: "Supported controller dialects",             actions: ["cam_pp_dialects"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMPostProcessorBridgeEngine", note: "use typed methods" };
  }

  /** Build a PostProcessorEnvelope from a CamTemplate + target dialect. */
  toEnvelope(template: CamTemplate, dialect: ControllerDialect = DEFAULT_DIALECT): PostProcessorEnvelope {
    const params: Record<string, number | string | boolean> = {};
    for (const p of template.parameters) {
      if (p.value !== null) params[p.id] = p.value as number | string | boolean;
    }
    return {
      templateId: template.id,
      op: template.op,
      system: template.system,
      controllerDialect: dialect,
      parameters: params,
      wcs: String(params.wcs ?? "G54"),
      coolant: String(params.coolant ?? "flood"),
      spindleRpm: typeof params.spindle_rpm === "number" ? params.spindle_rpm : null,
      cuttingFeed: typeof params.feed_xy === "number" ? params.feed_xy : null,
      plungeFeed: typeof params.feed_plunge === "number" ? params.feed_plunge : null,
      axisCount: template.spec.axisCount,
      provenance: {
        nativeName: template.nativeName,
        family: template.spec.family,
        strategy: template.spec.strategy,
        featureClass: template.featureClass,
        generatedAt: template.generatedAt,
      },
    };
  }

  /** Supported controller dialects. */
  dialects(): ReadonlyArray<ControllerDialect> {
    return ["fanuc", "siemens", "haas", "okuma", "heidenhain", "mazak", "mitsubishi"];
  }
}

export const camPostProcessorBridgeEngine = new CAMPostProcessorBridgeEngine();
