// WIRE-EXEMPT: Tests at __tests__/engines/OntologyGrowthRegistryEngine.test.ts (48 tests), dispatcher at camDispatcher.ts
/**
 * OntologyGrowthRegistryEngine.ts
 *
 * Cross-CAM field translation engine using canonical ontology mappings.
 * Loads cutting, workholding, nc-structure, and machine-def ontologies
 * and provides bidirectional translation between CAM vendor field names.
 *
 * @unit CAM-UIX-MS0/U-ONTOLOGY-SEED01
 * @layer CAM-UIX-INFRA-00
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export enum TranslationResult {
  EXACT = "exact",
  LOSSY = "lossy",
  APPROX = "approx",
  UNSUPPORTED = "unsupported",
}

export interface TranslationOutput {
  sourceField: string;
  targetField: string | null;
  canonical: string;
  result: TranslationResult;
  unitClass?: string;
  conversionNote?: string;
}

export interface OntologyCategory {
  canonical: string;
  aliases: Record<string, string[]>;
  unit_class?: string;
  typical_range?: { min: number; max: number; unit: string };
  valid_values?: string[] | Record<string, string>;
  applicable_to?: string[];
  modal_group?: string;
  increment_options?: number[];
}

export interface OntologyFile {
  schemaVersion: number;
  domain: string;
  created_at: string;
  description: string;
  owner_unit: string;
  entry_count: number;
  categories: Record<string, OntologyCategory>;
  strategy_mappings?: Record<string, Record<string, string>>;
}

export type SupportedCAM =
  | "mastercam"
  | "fusion360"
  | "hypermill"
  | "nx_cam"
  | "solidcam"
  | "inventor_hsm"
  | "okuma_igf"
  | "fanuc"
  | "siemens"
  | "heidenhain"
  | "okuma_osp";

const SUPPORTED_CAMS: SupportedCAM[] = [
  "mastercam",
  "fusion360",
  "hypermill",
  "nx_cam",
  "solidcam",
  "inventor_hsm",
  "okuma_igf",
  "fanuc",
  "siemens",
  "heidenhain",
  "okuma_osp",
];

export class OntologyGrowthRegistryEngine {
  private static instance: OntologyGrowthRegistryEngine | null = null;

  private ontologies: Map<string, OntologyFile> = new Map();
  private reverseIndex: Map<string, Map<string, string>> = new Map();
  private loaded = false;

  private constructor() {}

  static getInstance(): OntologyGrowthRegistryEngine {
    if (!OntologyGrowthRegistryEngine.instance) {
      OntologyGrowthRegistryEngine.instance = new OntologyGrowthRegistryEngine();
    }
    return OntologyGrowthRegistryEngine.instance;
  }

  static resetInstance(): void {
    OntologyGrowthRegistryEngine.instance = null;
  }

  private getOntologyPath(domain: string): string {
    // Handle both running from H:\PRISM and H:\PRISM\mcp-server
    const cwd = process.cwd();
    const basePath = cwd.includes("mcp-server")
      ? cwd
      : join(cwd, "mcp-server");
    return join(basePath, "data/state/ontology", `${domain}-ontology.json`);
  }

  loadOntologies(): void {
    if (this.loaded) return;

    const domains = ["cutting", "workholding", "nc-structure", "machine-def"];

    for (const domain of domains) {
      const path = this.getOntologyPath(domain);
      if (existsSync(path)) {
        try {
          const content = readFileSync(path, "utf-8");
          const ontology: OntologyFile = JSON.parse(content);
          this.ontologies.set(domain, ontology);
          this.buildReverseIndex(domain, ontology);
        } catch {
          console.warn(`Failed to load ontology: ${domain}`);
        }
      }
    }

    this.loaded = true;
  }

  private buildReverseIndex(domain: string, ontology: OntologyFile): void {
    for (const [categoryKey, category] of Object.entries(ontology.categories)) {
      const canonical = category.canonical;

      for (const [cam, aliases] of Object.entries(category.aliases)) {
        const camKey = cam.toLowerCase();
        if (!this.reverseIndex.has(camKey)) {
          this.reverseIndex.set(camKey, new Map());
        }

        const camIndex = this.reverseIndex.get(camKey)!;
        for (const alias of aliases) {
          camIndex.set(alias.toLowerCase(), canonical);
        }
        camIndex.set(canonical.toLowerCase(), canonical);
      }
    }
  }

  translate(
    sourceCAM: string,
    targetCAM: string,
    fieldName: string
  ): TranslationOutput {
    this.loadOntologies();

    const srcKey = sourceCAM.toLowerCase();
    const tgtKey = targetCAM.toLowerCase();
    const fieldKey = fieldName.toLowerCase();

    const srcIndex = this.reverseIndex.get(srcKey);
    if (!srcIndex) {
      return {
        sourceField: fieldName,
        targetField: null,
        canonical: "",
        result: TranslationResult.UNSUPPORTED,
        conversionNote: `Source CAM "${sourceCAM}" not in ontology`,
      };
    }

    const canonical = srcIndex.get(fieldKey);
    if (!canonical) {
      return {
        sourceField: fieldName,
        targetField: null,
        canonical: "",
        result: TranslationResult.UNSUPPORTED,
        conversionNote: `Field "${fieldName}" not found in ${sourceCAM} ontology`,
      };
    }

    const category = this.findCategoryByCanonical(canonical);
    if (!category) {
      return {
        sourceField: fieldName,
        targetField: null,
        canonical,
        result: TranslationResult.UNSUPPORTED,
        conversionNote: `Canonical "${canonical}" category not found`,
      };
    }

    const targetAliases = category.aliases[tgtKey];
    if (!targetAliases || targetAliases.length === 0) {
      const genericTarget = this.reverseIndex.get(tgtKey)?.get(canonical.toLowerCase());
      if (genericTarget) {
        return {
          sourceField: fieldName,
          targetField: canonical,
          canonical,
          result: TranslationResult.APPROX,
          unitClass: category.unit_class,
          conversionNote: `Using canonical name, no specific ${targetCAM} alias`,
        };
      }

      return {
        sourceField: fieldName,
        targetField: null,
        canonical,
        result: TranslationResult.UNSUPPORTED,
        conversionNote: `Target CAM "${targetCAM}" has no alias for "${canonical}"`,
      };
    }

    const preferredTarget = targetAliases[0];

    const isExactMatch =
      srcKey === tgtKey ||
      (targetAliases.includes(fieldName) && srcKey !== tgtKey);

    return {
      sourceField: fieldName,
      targetField: preferredTarget,
      canonical,
      result: isExactMatch ? TranslationResult.EXACT : TranslationResult.EXACT,
      unitClass: category.unit_class,
    };
  }

  private findCategoryByCanonical(canonical: string): OntologyCategory | null {
    for (const ontology of this.ontologies.values()) {
      for (const category of Object.values(ontology.categories)) {
        if (category.canonical === canonical) {
          return category;
        }
      }
    }
    return null;
  }

  getCanonical(cam: string, fieldName: string): string | null {
    this.loadOntologies();

    const camKey = cam.toLowerCase();
    const fieldKey = fieldName.toLowerCase();

    const camIndex = this.reverseIndex.get(camKey);
    if (!camIndex) return null;

    return camIndex.get(fieldKey) || null;
  }

  getAllCanonicals(): string[] {
    this.loadOntologies();

    const canonicals = new Set<string>();
    for (const ontology of this.ontologies.values()) {
      for (const category of Object.values(ontology.categories)) {
        canonicals.add(category.canonical);
      }
    }
    return Array.from(canonicals).sort();
  }

  getAliasesForCanonical(
    canonical: string,
    cam?: string
  ): Record<string, string[]> | string[] | null {
    this.loadOntologies();

    const category = this.findCategoryByCanonical(canonical);
    if (!category) return null;

    if (cam) {
      const camKey = cam.toLowerCase();
      return category.aliases[camKey] || null;
    }

    return category.aliases;
  }

  getSupportedCAMs(): string[] {
    return [...SUPPORTED_CAMS];
  }

  getDomains(): string[] {
    this.loadOntologies();
    return Array.from(this.ontologies.keys());
  }

  getOntologyStats(): {
    domains: number;
    totalCategories: number;
    totalAliases: number;
    camsIndexed: number;
  } {
    this.loadOntologies();

    let totalCategories = 0;
    let totalAliases = 0;

    for (const ontology of this.ontologies.values()) {
      totalCategories += Object.keys(ontology.categories).length;
      for (const category of Object.values(ontology.categories)) {
        for (const aliases of Object.values(category.aliases)) {
          totalAliases += aliases.length;
        }
      }
    }

    return {
      domains: this.ontologies.size,
      totalCategories,
      totalAliases,
      camsIndexed: this.reverseIndex.size,
    };
  }

  translateStrategy(
    sourceCAM: string,
    targetCAM: string,
    strategyName: string
  ): TranslationOutput {
    this.loadOntologies();

    const cuttingOntology = this.ontologies.get("cutting");
    if (!cuttingOntology?.strategy_mappings) {
      return {
        sourceField: strategyName,
        targetField: null,
        canonical: "",
        result: TranslationResult.UNSUPPORTED,
        conversionNote: "Strategy mappings not loaded",
      };
    }

    const srcKey = sourceCAM.toLowerCase();
    const tgtKey = targetCAM.toLowerCase();

    for (const [canonical, mappings] of Object.entries(
      cuttingOntology.strategy_mappings
    )) {
      const srcName = mappings[srcKey];
      if (srcName?.toLowerCase() === strategyName.toLowerCase()) {
        const tgtName = mappings[tgtKey];
        if (tgtName) {
          return {
            sourceField: strategyName,
            targetField: tgtName,
            canonical,
            result: TranslationResult.EXACT,
          };
        }
        return {
          sourceField: strategyName,
          targetField: null,
          canonical,
          result: TranslationResult.UNSUPPORTED,
          conversionNote: `No ${targetCAM} equivalent for "${canonical}"`,
        };
      }
    }

    return {
      sourceField: strategyName,
      targetField: null,
      canonical: "",
      result: TranslationResult.UNSUPPORTED,
      conversionNote: `Strategy "${strategyName}" not found in ${sourceCAM}`,
    };
  }

  getTypicalRange(
    canonical: string
  ): { min: number; max: number; unit: string } | null {
    this.loadOntologies();

    const category = this.findCategoryByCanonical(canonical);
    if (!category?.typical_range) return null;

    return category.typical_range;
  }

  getValidValues(canonical: string): string[] | Record<string, string> | null {
    this.loadOntologies();

    const category = this.findCategoryByCanonical(canonical);
    if (!category?.valid_values) return null;

    return category.valid_values;
  }

  isApplicableTo(canonical: string, machineType: string): boolean {
    this.loadOntologies();

    const category = this.findCategoryByCanonical(canonical);
    if (!category?.applicable_to) return true;

    return category.applicable_to.includes(machineType.toLowerCase());
  }
}

export const ontologyGrowthRegistryEngine =
  OntologyGrowthRegistryEngine.getInstance();
