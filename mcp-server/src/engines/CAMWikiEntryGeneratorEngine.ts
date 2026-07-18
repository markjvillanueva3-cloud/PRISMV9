/**
 * CAMWikiEntryGeneratorEngine — CAM-AI-TRAINING-MS0/U-CAMT-WIKI
 *
 * Generates Karpathy-LLM-Wiki entries (markdown frontmatter + body) for
 * every (op, system) pair the taxonomy supports. Each wiki entry is a
 * stable knowledge unit a downstream consumer (wiki indexer, RAG, LoRA
 * trainer) can ingest.
 *
 * Output format mirrors knowledge/wiki/entities/ frontmatter convention.
 *
 * Pure logic — composes B01 taxonomy + B02 schema + B03 template.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import {
  camOperationTaxonomyEngine,
  type CamOperation,
  type CamSystem,
} from "./CAMOperationTaxonomyEngine.js";
import { camOperationInputSchemaEngine } from "./CAMOperationInputSchemaEngine.js";

export interface WikiEntry {
  /** Stable slug — kebab-case "<system>-<op>". */
  slug: string;
  /** Wiki title — "<NativeName> in <System>". */
  title: string;
  op: CamOperation;
  system: CamSystem;
  nativeName: string;
  /** Markdown body w/ frontmatter. */
  markdown: string;
  /** Aggregate facts the wiki indexer can lift into the index. */
  facts: {
    family: string;
    axisCount: string;
    strategy: string;
    parameterCount: number;
    featureClasses: ReadonlyArray<string>;
  };
}

export class CAMWikiEntryGeneratorEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMWikiEntryGeneratorEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Generates wiki entries per (op, system) from B01+B02 stack.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "generate_entry",   description: "Wiki entry for one (op, system)", actions: ["cam_wiki_entry"] },
      { name: "generate_all",     description: "Wiki entries for the full cross-product", actions: ["cam_wiki_all"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMWikiEntryGeneratorEngine", note: "use typed methods" };
  }

  /** Generate one wiki entry. Returns null if (op, system) unsupported. */
  generateEntry(op: CamOperation, system: CamSystem): WikiEntry | null {
    const mapping = camOperationTaxonomyEngine.getPerSoftware(op, system);
    if (!mapping.supported) return null;
    const spec = camOperationTaxonomyEngine.getSpec(op);
    if (!spec) return null;
    const schema = camOperationInputSchemaEngine.getSchema(op, system);
    const params = schema?.parameters ?? [];

    const slug = `${system}-${op}`.replace(/_/g, "-");
    const title = `${mapping.nativeName} in ${system}`;
    const generatedAt = new Date().toISOString();

    const md = [
      "---",
      `title: ${title}`,
      `slug: ${slug}`,
      `op: ${op}`,
      `system: ${system}`,
      `native_name: ${mapping.nativeName}`,
      `family: ${spec.family}`,
      `axis_count: ${spec.axisCount}`,
      `strategy: ${spec.strategy}`,
      `default_stock: ${spec.defaultStock}`,
      `feature_classes: [${spec.featureClasses.map((f) => `"${f}"`).join(", ")}]`,
      `parameter_count: ${params.length}`,
      `generated_at: ${generatedAt}`,
      `source: cam-ai-training-ms0/u-camt-wiki`,
      "---",
      "",
      `# ${title}`,
      "",
      `**Canonical operation:** ${op} (\`${spec.family}\`, ${spec.axisCount}-axis, ${spec.strategy})  `,
      `**Vendor name in ${system}:** ${mapping.nativeName}  `,
      `**Default stock model:** ${spec.defaultStock}`,
      "",
      `## Description`,
      "",
      spec.description,
      "",
      `## Feature classes this operation handles`,
      "",
      ...spec.featureClasses.map((f) => `- \`${f}\``),
      "",
      `## Input parameters (${params.length})`,
      "",
      "| Param | Label | Type | Unit | Default | Required | Source |",
      "|-------|-------|------|------|---------|----------|--------|",
      ...params.map((p) => {
        const def = p.defaultValue !== undefined ? String(p.defaultValue) : "—";
        return `| \`${p.id}\` | ${p.label} | ${p.type} | ${p.unit ?? "—"} | ${def} | ${p.required ? "Y" : "N"} | ${p.source} |`;
      }),
      "",
      `## Cross-references`,
      "",
      `- Taxonomy: [[cam-op-${op.replace(/_/g, "-")}]]`,
      `- System: [[cam-system-${system.replace(/_/g, "-")}]]`,
      "",
    ].join("\n");

    return {
      slug,
      title,
      op,
      system,
      nativeName: mapping.nativeName,
      markdown: md,
      facts: {
        family: spec.family,
        axisCount: spec.axisCount,
        strategy: spec.strategy,
        parameterCount: params.length,
        featureClasses: spec.featureClasses,
      },
    };
  }

  /** Generate the full cross-product of wiki entries. */
  generateAll(): WikiEntry[] {
    const out: WikiEntry[] = [];
    for (const op of camOperationTaxonomyEngine.listOperations()) {
      for (const sys of camOperationTaxonomyEngine.listSystems()) {
        const entry = this.generateEntry(op, sys);
        if (entry) out.push(entry);
      }
    }
    return out;
  }
}

export const camWikiEntryGeneratorEngine = new CAMWikiEntryGeneratorEngine();
