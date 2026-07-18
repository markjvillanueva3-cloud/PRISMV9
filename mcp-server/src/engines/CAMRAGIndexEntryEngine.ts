/**
 * CAMRAGIndexEntryEngine — CAM-AI-TRAINING-MS0/U-CAMT-RAG
 *
 * Serializes a CamTemplate into a single embedding-ready text blob plus
 * structured metadata that a RAG store (master-index + tribal-embed +
 * memory-vault) can ingest. Each blob is dense + self-contained: the
 * embedder can match a query like "Fusion 360 face mill aluminum 6061"
 * against the canonical (op, system, feature class) entry.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { CamTemplate } from "./CAMTemplateGeneratorEngine.js";

export interface RAGIndexEntry {
  id: string;
  text: string;
  metadata: {
    op: string;
    system: string;
    nativeName: string;
    featureClass: string;
    family: string;
    axisCount: string;
    strategy: string;
    parameterCount: number;
  };
}

export class CAMRAGIndexEntryEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMRAGIndexEntryEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Serialize CamTemplates as RAG embedding-ready entries.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "to_entry",         description: "RAG entry from one CamTemplate",                 actions: ["cam_rag_entry"] },
      { name: "to_entries",       description: "RAG entries for an array of CamTemplates",       actions: ["cam_rag_entries"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMRAGIndexEntryEngine", note: "use typed methods" };
  }

  /** Convert one template into a RAG entry. */
  toEntry(template: CamTemplate): RAGIndexEntry {
    const spec = template.spec;
    const paramSummary = template.parameters
      .filter((p) => p.value !== null)
      .map((p) => `${p.id}=${p.value}${p.unit ? p.unit : ""}`)
      .join(", ");
    const text =
      `${template.nativeName} (${template.system}, canonical op ${template.op}) for ` +
      `${template.featureClass}. Family ${spec.family}, ${spec.axisCount}-axis ${spec.strategy} on ` +
      `${spec.defaultStock} stock. Parameters: ${paramSummary}. ${spec.description}`;
    return {
      id: template.id,
      text,
      metadata: {
        op: template.op,
        system: template.system,
        nativeName: template.nativeName,
        featureClass: template.featureClass,
        family: spec.family,
        axisCount: spec.axisCount,
        strategy: spec.strategy,
        parameterCount: template.parameters.length,
      },
    };
  }

  toEntries(templates: ReadonlyArray<CamTemplate>): RAGIndexEntry[] {
    return templates.map((t) => this.toEntry(t));
  }
}

export const camRAGIndexEntryEngine = new CAMRAGIndexEntryEngine();
