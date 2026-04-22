/**
 * InventorCAMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM32
 *
 * Unified function index for InventorCAM / Inventor HSM.
 * Wraps InventorHSMFunctionIndexEngine with additional unified index features
 * including pre-computed stats, cross-references, and training path recommendations.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  InventorHSMFunctionIndexEngine,
  InventorHSMFunctionIndex,
  InventorHSMSection,
  InventorHSMOperation,
  InventorHSMParameter,
} from "./InventorHSMFunctionIndexEngine.js";

export interface UnifiedFunctionIndex {
  schemaVersion: number;
  system_id: string;
  system_display_name: string;
  generated_at: string;
  generated_by: string;
  summary: {
    total_operations: number;
    total_parameters: number;
    total_sections: number;
    total_training_topics: number;
    categories: string[];
  };
  sections: Record<
    string,
    {
      file: string;
      total_operations: number;
      total_parameters: number;
      categories: string[];
      training_topics_count: number;
      canned_cycles?: string[];
      operations: string[];
    }
  >;
  cross_references: {
    canned_cycle_coverage: Record<string, string>;
    adaptive_operations: string[];
    probing_operations: string[];
    multiaxis_operations: string[];
  };
  training_integration: {
    total_topics: number;
    topic_sources: Record<string, number>;
    recommended_learning_path: string[];
  };
}

export interface OperationSummary {
  operation_id: string;
  display_name: string;
  section: string;
  category: string;
  parameter_count: number;
}

export interface CategoryBreakdown {
  category: string;
  operations: string[];
  total_parameters: number;
  sections: string[];
}

export class InventorCAMFunctionIndexEngine {
  private static unifiedIndex: UnifiedFunctionIndex | null = null;

  private static readonly DATA_DIR = join(
    __dirname,
    "../../data/cam-functions/inventor-hsm"
  );

  private static loadUnifiedIndex(): UnifiedFunctionIndex | null {
    if (this.unifiedIndex) return this.unifiedIndex;

    const path = join(this.DATA_DIR, "function-index.json");
    if (existsSync(path)) {
      try {
        this.unifiedIndex = JSON.parse(
          readFileSync(path, "utf-8")
        ) as UnifiedFunctionIndex;
        return this.unifiedIndex;
      } catch {
        return null;
      }
    }
    return null;
  }

  static getUnifiedIndex(): UnifiedFunctionIndex | null {
    return this.loadUnifiedIndex();
  }

  static getSummary(): {
    system_id: string;
    total_operations: number;
    total_parameters: number;
    total_sections: number;
    total_categories: number;
    total_training_topics: number;
    sections: string[];
  } {
    const unified = this.loadUnifiedIndex();
    if (unified) {
      return {
        system_id: unified.system_id,
        total_operations: unified.summary.total_operations,
        total_parameters: unified.summary.total_parameters,
        total_sections: unified.summary.total_sections,
        total_categories: unified.summary.categories.length,
        total_training_topics: unified.summary.total_training_topics,
        sections: Object.keys(unified.sections),
      };
    }
    const idx = InventorHSMFunctionIndexEngine.getIndex();
    return {
      system_id: idx.system_id,
      total_operations: idx.total_operations,
      total_parameters: idx.total_parameters,
      total_sections: Object.keys(idx.sections).length,
      total_categories: idx.categories.length,
      total_training_topics: 0,
      sections: Object.keys(idx.sections),
    };
  }

  static getCategoryBreakdown(): CategoryBreakdown[] {
    const unified = this.loadUnifiedIndex();
    const categories = new Map<
      string,
      { operations: Set<string>; params: number; sections: Set<string> }
    >();

    if (unified) {
      for (const [sectionKey, section] of Object.entries(unified.sections)) {
        for (const cat of section.categories) {
          if (!categories.has(cat)) {
            categories.set(cat, {
              operations: new Set(),
              params: 0,
              sections: new Set(),
            });
          }
          const entry = categories.get(cat)!;
          entry.sections.add(sectionKey);
          entry.params += Math.floor(
            section.total_parameters / section.categories.length
          );
          for (const op of section.operations) {
            entry.operations.add(op);
          }
        }
      }
    } else {
      const idx = InventorHSMFunctionIndexEngine.getIndex();
      for (const [sectionKey, section] of Object.entries(idx.sections)) {
        for (const [opId, op] of Object.entries(section.operations || {})) {
          const cat = op.category;
          if (!categories.has(cat)) {
            categories.set(cat, {
              operations: new Set(),
              params: 0,
              sections: new Set(),
            });
          }
          const entry = categories.get(cat)!;
          entry.operations.add(opId);
          entry.sections.add(sectionKey);
          for (const group of Object.values(op.parameters || {})) {
            entry.params += Object.keys(group).length;
          }
        }
      }
    }

    return Array.from(categories.entries()).map(([cat, data]) => ({
      category: cat,
      operations: Array.from(data.operations),
      total_parameters: data.params,
      sections: Array.from(data.sections),
    }));
  }

  static getCannedCycleReference(): Record<string, string> {
    const unified = this.loadUnifiedIndex();
    if (unified) {
      return unified.cross_references.canned_cycle_coverage;
    }
    return {
      G81: "drill (simple drilling)",
      G82: "counterbore (dwell at bottom)",
      G83: "peck_drill (deep hole peck)",
      G73: "chip_breaking (high-speed peck)",
      G84: "tapping (rigid tap)",
      G85: "reaming (feed out)",
    };
  }

  static getLearningPath(): string[] {
    const unified = this.loadUnifiedIndex();
    if (unified) {
      return unified.training_integration.recommended_learning_path;
    }
    return [
      "2.5d_milling",
      "drilling",
      "3d_hsm",
      "turning",
      "5axis",
      "multiaxis",
    ];
  }

  static getAllOperations(): OperationSummary[] {
    const ops = InventorHSMFunctionIndexEngine.listOperations();
    const unified = this.loadUnifiedIndex();

    return ops.map((op) => {
      let paramCount = 0;
      if (unified?.sections[op.section]) {
        const section = unified.sections[op.section];
        paramCount = Math.floor(
          section.total_parameters / section.total_operations
        );
      }
      return {
        ...op,
        parameter_count: paramCount,
      };
    });
  }

  static searchByCategory(
    category: string
  ): Array<{ operation_id: string; section: string; display_name: string }> {
    const ops = InventorHSMFunctionIndexEngine.listOperations();
    return ops.filter((op) =>
      op.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  static getMultiaxisOperations(): string[] {
    const unified = this.loadUnifiedIndex();
    if (unified) {
      return unified.cross_references.multiaxis_operations;
    }
    return [
      "swarf_5axis",
      "multiaxis_contour",
      "multiaxis_parallel",
      "indexed_3plus2",
      "blade_machining",
      "rotary_wrap",
      "impeller_machining",
    ];
  }

  static getProbingOperations(): string[] {
    const unified = this.loadUnifiedIndex();
    if (unified) {
      return unified.cross_references.probing_operations;
    }
    return ["probe_geometry", "probe_work_offset"];
  }

  static getAdaptiveOperations(): string[] {
    const unified = this.loadUnifiedIndex();
    if (unified) {
      return unified.cross_references.adaptive_operations;
    }
    return ["adaptive_2d", "adaptive_3d"];
  }

  // Re-export base engine methods as proper wrappers
  static getIndex() {
    return InventorHSMFunctionIndexEngine.getIndex();
  }

  static listSections() {
    return InventorHSMFunctionIndexEngine.listSections();
  }

  static getSection(sectionKey: string) {
    return InventorHSMFunctionIndexEngine.getSection(sectionKey);
  }

  static listOperations() {
    return InventorHSMFunctionIndexEngine.listOperations();
  }

  static findParameter(parameterName: string) {
    return InventorHSMFunctionIndexEngine.findParameter(parameterName);
  }

  static searchParameters(query: string, limit = 20) {
    return InventorHSMFunctionIndexEngine.searchParameters(query, limit);
  }
}

export {
  InventorHSMFunctionIndex,
  InventorHSMSection,
  InventorHSMOperation,
  InventorHSMParameter,
};
