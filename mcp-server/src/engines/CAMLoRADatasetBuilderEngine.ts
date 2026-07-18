/**
 * CAMLoRADatasetBuilderEngine — CAM-AI-TRAINING-MS0/U-CAMT-LORA
 *
 * Builds (prompt, completion) tuples from B03 CamTemplates for LoRA
 * fine-tuning of the local manufacturing LLM. Each tuple teaches the
 * model: "given feature class + machine class + op + system, emit these
 * documented parameter defaults."
 *
 * Pure logic. The runner script (scripts/emit-lora-training-tuples.mjs,
 * separate unit) wires the cross-product against the live taxonomy.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { CamTemplate } from "./CAMTemplateGeneratorEngine.js";

export interface LoRATuple {
  /** Stable id matching the source template id. */
  id: string;
  /** Natural-language input the model is conditioned on. */
  prompt: string;
  /** JSON-stringified parameter bag the model should emit. */
  completion: string;
  /** Provenance for audit. */
  source: {
    op: string;
    system: string;
    featureClass: string;
    nativeName: string;
    family: string;
    axisCount: string;
  };
}

export class CAMLoRADatasetBuilderEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMLoRADatasetBuilderEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Builds (prompt, completion) LoRA-training tuples from CamTemplates.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "build_tuple",     description: "One tuple from one CamTemplate",        actions: ["cam_lora_tuple"] },
      { name: "build_dataset",   description: "Tuples for an array of CamTemplates",   actions: ["cam_lora_dataset"] },
      { name: "to_jsonl",        description: "Serialize tuples to JSONL",             actions: ["cam_lora_jsonl"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMLoRADatasetBuilderEngine", note: "use typed methods" };
  }

  /** Build one LoRA tuple from a CamTemplate. */
  buildTuple(template: CamTemplate): LoRATuple {
    const spec = template.spec;
    const promptParts = [
      `Generate CAM parameters for ${template.system}.`,
      `Operation: ${template.nativeName} (canonical: ${template.op}).`,
      `Feature class: ${template.featureClass}.`,
      `Machine family: ${spec?.family ?? "milling_2d"}.`,
      `Axis count: ${spec?.axisCount ?? "3"}.`,
      `Stock model: ${spec?.defaultStock ?? "billet"}.`,
      `Strategy: ${spec?.strategy ?? "roughing"}.`,
      `Return a JSON object mapping parameter id → value.`,
    ];
    const completionObj: Record<string, unknown> = {};
    for (const p of template.parameters) {
      completionObj[p.id] = p.value;
    }
    return {
      id: template.id,
      prompt: promptParts.join(" "),
      completion: JSON.stringify(completionObj),
      source: {
        op: template.op,
        system: template.system,
        featureClass: template.featureClass,
        nativeName: template.nativeName,
        family: spec?.family ?? "milling_2d",
        axisCount: spec?.axisCount ?? "3",
      },
    };
  }

  /** Build tuples for an array of templates. */
  buildDataset(templates: ReadonlyArray<CamTemplate>): LoRATuple[] {
    return templates.map((t) => this.buildTuple(t));
  }

  /** Serialize to JSONL (one tuple per line). */
  toJSONL(tuples: ReadonlyArray<LoRATuple>): string {
    return tuples.map((t) => JSON.stringify(t)).join("\n") + (tuples.length > 0 ? "\n" : "");
  }
}

export const camLoRADatasetBuilderEngine = new CAMLoRADatasetBuilderEngine();
