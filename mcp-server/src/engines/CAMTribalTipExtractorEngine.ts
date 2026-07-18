/**
 * CAMTribalTipExtractorEngine — CAM-AI-TRAINING-MS0/U-CAMT-TRIBAL
 *
 * Extracts tribal-tip records from the per-software function-index
 * catalogs (mcp-server/data/cam-functions/<system>/). Each parameter
 * description in a vendor catalog IS tribal knowledge — "Maximum radial
 * engagement as percentage of tool diameter" is a tip about how Fusion
 * 360's Optimal Load is meant to be set.
 *
 * Pure logic — caller supplies the parsed SoftwareCatalog (production
 * via loadCAMCatalog from CAMCatalogLoader; tests inline).
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { CamSystem } from "./CAMOperationTaxonomyEngine.js";
import type { SoftwareCatalog } from "./CAMClickSequenceEngine.js";

export interface TribalTip {
  /** Stable id: "<system>:<op-key>:<tab>:<param-name>" */
  id: string;
  system: CamSystem;
  opKey: string;
  tab: string;
  paramName: string;
  /** The tribal knowledge — the parameter description. */
  tip: string;
  /** Unit/options when present — useful for tooltip retrieval. */
  unit?: string;
  optionsCount?: number;
  /** Source provenance. */
  source: string;
  /** Domain tag for tribal-by-domain-inject hook. */
  domain: "cam" | "mill" | "lathe" | "wedm";
}

function domainOf(opKey: string): "cam" | "mill" | "lathe" | "wedm" {
  const u = opKey.toUpperCase();
  if (u.includes("WEDM") || u.includes("WIRE_EDM") || u.includes("WIRE EDM")) return "wedm";
  if (u.includes("TURN") || u.includes("LATHE")) return "lathe";
  if (u.includes("MILL") || u.includes("ADAPTIVE") || u.includes("FACE") || u.includes("POCKET")) return "mill";
  return "cam";
}

export class CAMTribalTipExtractorEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMTribalTipExtractorEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Extracts tribal tips from per-software CAM function-index catalogs.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "extract",           description: "Extract tribal tips from one (system, catalog)", actions: ["cam_tribal_extract"] },
      { name: "extract_with_min",  description: "Extract with min-description-length filter",     actions: ["cam_tribal_extract_min"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMTribalTipExtractorEngine", note: "use typed methods" };
  }

  /**
   * Walk every (toolpath, tab, parameter) in the catalog and emit a tip
   * for each parameter that carries a non-empty `description`.
   */
  extract(system: CamSystem, catalog: SoftwareCatalog, opts: { minLength?: number } = {}): TribalTip[] {
    const minLen = opts.minLength ?? 10;
    const out: TribalTip[] = [];
    const toolpaths = catalog.toolpaths ?? {};
    for (const [opKey, tp] of Object.entries(toolpaths)) {
      const tabs = tp.tabs ?? {};
      for (const [tabName, tab] of Object.entries(tabs)) {
        for (const p of tab.parameters ?? []) {
          const desc = (p as { description?: string }).description;
          if (!desc || desc.length < minLen) continue;
          out.push({
            id: `${system}:${opKey}:${tabName}:${p.name}`,
            system,
            opKey,
            tab: tabName,
            paramName: p.name,
            tip: desc,
            unit: p.unit,
            optionsCount: p.options ? p.options.length : undefined,
            source: `data/cam-functions/${system}/<file>:${opKey}.tabs.${tabName}.${p.name}`,
            domain: domainOf(opKey),
          });
        }
      }
    }
    return out;
  }
}

export const camTribalTipExtractorEngine = new CAMTribalTipExtractorEngine();
