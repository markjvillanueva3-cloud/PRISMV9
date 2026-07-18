/**
 * CAMTemplateParameterCompletenessEngine — CAM-AI-TRAINING-MS0/U-CAMT-PARAM-COMPLETE
 *
 * Validates that an emitted CamTemplate has every parameter the B02
 * InputSchema requires. Fills missing required parameters with their
 * documented defaults; reports gaps for operator visibility.
 *
 * The 106-template JSONL emitted in iter 47 is intentionally minimal —
 * it captures what the vendor catalog has. This engine is the bridge:
 * fill in the CamOperationInputSchemaEngine's required parameters for
 * each (op, system) pair, so downstream LoRA/RAG indexers see complete
 * training records.
 *
 * Pure logic — caller passes the template + schema-engine lookup.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

export interface ParameterSpec {
  id: string;
  required: boolean;
  default?: number | string | boolean | null;
  type?: "number" | "string" | "boolean" | "enum";
  enum?: ReadonlyArray<string>;
}

export interface TemplateRecord {
  id: string;
  op: string;
  system: string;
  parameters: Record<string, number | string | boolean | null>;
}

export interface CompletenessResult {
  templateId: string;
  totalRequired: number;
  presentRequired: number;
  filledFromDefault: number;
  missingRequired: ReadonlyArray<string>;
  /** Completion percentage 0-100 — after default-fill. */
  completionPct: number;
  /** Post-fill parameters object. */
  filledParameters: Record<string, number | string | boolean | null>;
}

export interface CorpusCompletenessReport {
  totalTemplates: number;
  completeTemplates: number;
  completionPctAvg: number;
  perSystem: Record<string, { templates: number; completionPctAvg: number }>;
  failingSample: ReadonlyArray<{ templateId: string; missingRequired: ReadonlyArray<string> }>;
}

export class CAMTemplateParameterCompletenessEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMTemplateParameterCompletenessEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Validates CamTemplate parameter completeness vs B02 schema; default-fills gaps.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "check",        description: "Check + default-fill one template", actions: ["cam_param_complete_check"] },
      { name: "check_corpus", description: "Aggregate per-corpus report",       actions: ["cam_param_complete_corpus"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMTemplateParameterCompletenessEngine", note: "use typed methods" };
  }

  /** Check + default-fill one template. */
  check(template: TemplateRecord, schemaParams: ReadonlyArray<ParameterSpec>): CompletenessResult {
    const requiredSpecs = schemaParams.filter((p) => p.required);
    const filled: Record<string, number | string | boolean | null> = { ...template.parameters };
    let presentRequired = 0;
    let filledFromDefault = 0;
    const missingRequired: string[] = [];
    for (const spec of requiredSpecs) {
      const has = Object.prototype.hasOwnProperty.call(filled, spec.id) && filled[spec.id] !== null && filled[spec.id] !== undefined;
      if (has) {
        presentRequired++;
      } else if (spec.default !== undefined && spec.default !== null) {
        filled[spec.id] = spec.default;
        filledFromDefault++;
      } else {
        missingRequired.push(spec.id);
      }
    }
    const cleared = presentRequired + filledFromDefault;
    const completionPct = requiredSpecs.length === 0 ? 100 : (cleared / requiredSpecs.length) * 100;
    return {
      templateId: template.id,
      totalRequired: requiredSpecs.length,
      presentRequired,
      filledFromDefault,
      missingRequired,
      completionPct,
      filledParameters: filled,
    };
  }

  /** Corpus-level aggregate. */
  check_corpus(
    templates: ReadonlyArray<TemplateRecord>,
    schemaLookup: (op: string, system: string) => ReadonlyArray<ParameterSpec>,
  ): CorpusCompletenessReport {
    let completionSum = 0;
    let completeCount = 0;
    const perSystemAgg: Record<string, { templates: number; pctSum: number }> = {};
    const failing: Array<{ templateId: string; missingRequired: ReadonlyArray<string> }> = [];
    for (const t of templates) {
      const specs = schemaLookup(t.op, t.system);
      const r = this.check(t, specs);
      completionSum += r.completionPct;
      if (r.completionPct >= 100 && r.missingRequired.length === 0) {
        completeCount++;
      } else if (failing.length < 100) {
        failing.push({ templateId: t.id, missingRequired: r.missingRequired });
      }
      if (!perSystemAgg[t.system]) perSystemAgg[t.system] = { templates: 0, pctSum: 0 };
      perSystemAgg[t.system].templates++;
      perSystemAgg[t.system].pctSum += r.completionPct;
    }
    const totalTemplates = templates.length;
    const completionPctAvg = totalTemplates === 0 ? 0 : completionSum / totalTemplates;
    const perSystem: Record<string, { templates: number; completionPctAvg: number }> = {};
    for (const [sys, agg] of Object.entries(perSystemAgg)) {
      perSystem[sys] = {
        templates: agg.templates,
        completionPctAvg: agg.templates === 0 ? 0 : agg.pctSum / agg.templates,
      };
    }
    return {
      totalTemplates,
      completeTemplates: completeCount,
      completionPctAvg,
      perSystem,
      failingSample: failing,
    };
  }
}

export const camTemplateParameterCompletenessEngine = new CAMTemplateParameterCompletenessEngine();
