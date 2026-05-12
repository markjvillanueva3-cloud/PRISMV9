/**
 * ImpactAnalysisEngine — Rename/Delete Impact Protocol
 *
 * Phase 0.8 from AGI proximity plan. Provides impact analysis for:
 *   - Renaming assets (engines, dispatchers, actions, skills)
 *   - Deleting assets (orphan prevention)
 *   - Dependency tracking
 *
 * Integrates with DependencyGraphEngine and ReverseIndexEngine
 * to provide comprehensive impact reports before destructive operations.
 *
 * @module engines/ImpactAnalysisEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ============================================================================
// TYPES
// ============================================================================

export type AssetType = "engine" | "dispatcher" | "action" | "skill" | "hook" | "test" | "schema";

export interface ImpactReport {
  asset: {
    name: string;
    type: AssetType;
    path: string;
  };
  operation: "rename" | "delete";
  newName?: string;
  impactLevel: "low" | "medium" | "high" | "critical";
  directDependents: string[];
  transitiveDependents: string[];
  affectedFiles: AffectedFile[];
  breakingChanges: BreakingChange[];
  warnings: string[];
  recommendations: string[];
  safeToProc: boolean;
  requiresManualReview: boolean;
}

export interface AffectedFile {
  path: string;
  type: "import" | "reference" | "test" | "config";
  lineNumbers: number[];
  autoFixable: boolean;
}

export interface BreakingChange {
  description: string;
  severity: "error" | "warning";
  location: string;
  suggestedFix?: string;
}

export interface RenameOperation {
  fromName: string;
  toName: string;
  assetType: AssetType;
  dryRun?: boolean;
}

export interface DeleteOperation {
  name: string;
  assetType: AssetType;
  force?: boolean;
  dryRun?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CRITICAL_ASSETS = new Set([
  "SafetyEngine",
  "KienzleForceModelEngine",
  "TaylorToolLifeEngine",
  "DuplicationGuardEngine",
  "TransactionLogEngine",
]);

const HIGH_IMPACT_THRESHOLD = 10; // More than 10 dependents = high impact
const MEDIUM_IMPACT_THRESHOLD = 5;

// ============================================================================
// ENGINE
// ============================================================================

export class ImpactAnalysisEngine {
  private baseDir: string;

  constructor() {
    const thisFile = fileURLToPath(import.meta.url);
    this.baseDir = path.resolve(path.dirname(thisFile), "..", "..");
    log.info("[ImpactAnalysis] Initialized — rename/delete impact protocol");
  }

  // ============================================================================
  // MAIN API
  // ============================================================================

  /**
   * Analyze impact of renaming an asset
   */
  async analyzeRename(operation: RenameOperation): Promise<ImpactReport> {
    const { fromName, toName, assetType } = operation;

    log.info(`[ImpactAnalysis] Analyzing rename: ${fromName} → ${toName}`);

    const assetPath = this.getAssetPath(fromName, assetType);
    const directDependents = await this.findDirectDependents(fromName, assetType);
    const transitiveDependents = await this.findTransitiveDependents(fromName, assetType);
    const affectedFiles = await this.findAffectedFiles(fromName, assetType);
    const breakingChanges = this.detectBreakingChanges(fromName, toName, assetType);
    const warnings = this.generateWarnings(fromName, assetType, directDependents.length);
    const recommendations = this.generateRecommendations("rename", fromName, directDependents.length);

    const impactLevel = this.calculateImpactLevel(fromName, directDependents.length, transitiveDependents.length);
    const safeToProc = impactLevel !== "critical" && breakingChanges.filter((b) => b.severity === "error").length === 0;
    const requiresManualReview = impactLevel === "high" || impactLevel === "critical";

    return {
      asset: { name: fromName, type: assetType, path: assetPath },
      operation: "rename",
      newName: toName,
      impactLevel,
      directDependents,
      transitiveDependents,
      affectedFiles,
      breakingChanges,
      warnings,
      recommendations,
      safeToProc,
      requiresManualReview,
    };
  }

  /**
   * Analyze impact of deleting an asset
   */
  async analyzeDelete(operation: DeleteOperation): Promise<ImpactReport> {
    const { name, assetType, force } = operation;

    log.info(`[ImpactAnalysis] Analyzing delete: ${name}`);

    const assetPath = this.getAssetPath(name, assetType);
    const directDependents = await this.findDirectDependents(name, assetType);
    const transitiveDependents = await this.findTransitiveDependents(name, assetType);
    const affectedFiles = await this.findAffectedFiles(name, assetType);
    const breakingChanges: BreakingChange[] = [];
    const warnings = this.generateWarnings(name, assetType, directDependents.length);
    const recommendations = this.generateRecommendations("delete", name, directDependents.length);

    // Deletion with dependents is always a breaking change
    if (directDependents.length > 0) {
      breakingChanges.push({
        description: `Cannot delete ${name} — ${directDependents.length} assets depend on it`,
        severity: force ? "warning" : "error",
        location: assetPath,
        suggestedFix: `Remove dependencies first: ${directDependents.slice(0, 3).join(", ")}${directDependents.length > 3 ? "..." : ""}`,
      });
    }

    const impactLevel = this.calculateImpactLevel(name, directDependents.length, transitiveDependents.length);
    const safeToProc = directDependents.length === 0 && !CRITICAL_ASSETS.has(name);
    const requiresManualReview = directDependents.length > 0 || CRITICAL_ASSETS.has(name);

    return {
      asset: { name, type: assetType, path: assetPath },
      operation: "delete",
      impactLevel,
      directDependents,
      transitiveDependents,
      affectedFiles,
      breakingChanges,
      warnings,
      recommendations,
      safeToProc,
      requiresManualReview,
    };
  }

  /**
   * Execute a rename operation (after analysis approval)
   */
  async executeRename(operation: RenameOperation): Promise<{ success: boolean; changedFiles: string[]; errors: string[] }> {
    const { fromName, toName, assetType, dryRun } = operation;

    const analysis = await this.analyzeRename(operation);

    if (!analysis.safeToProc && !operation.dryRun) {
      return {
        success: false,
        changedFiles: [],
        errors: ["Operation blocked: requires manual review. Use dryRun=true to see impact."],
      };
    }

    const changedFiles: string[] = [];
    const errors: string[] = [];

    if (dryRun) {
      // Return what would be changed
      return {
        success: true,
        changedFiles: analysis.affectedFiles.filter((f) => f.autoFixable).map((f) => f.path),
        errors: [],
      };
    }

    // Execute the rename
    for (const file of analysis.affectedFiles) {
      if (!file.autoFixable) continue;

      try {
        const content = fs.readFileSync(path.join(this.baseDir, file.path), "utf-8");
        const updated = this.replaceReferences(content, fromName, toName, assetType);

        if (content !== updated) {
          fs.writeFileSync(path.join(this.baseDir, file.path), updated);
          changedFiles.push(file.path);
        }
      } catch (err) {
        errors.push(`Failed to update ${file.path}: ${err}`);
      }
    }

    // Rename the main file
    const oldPath = path.join(this.baseDir, analysis.asset.path);
    const newPath = this.getAssetPath(toName, assetType);

    try {
      if (fs.existsSync(oldPath)) {
        const content = fs.readFileSync(oldPath, "utf-8");
        const updated = this.replaceReferences(content, fromName, toName, assetType);
        fs.writeFileSync(path.join(this.baseDir, newPath), updated);
        fs.unlinkSync(oldPath);
        changedFiles.push(newPath);
      }
    } catch (err) {
      errors.push(`Failed to rename file: ${err}`);
    }

    return {
      success: errors.length === 0,
      changedFiles,
      errors,
    };
  }

  /**
   * Check if an asset can be safely deleted
   */
  async canSafelyDelete(name: string, assetType: AssetType): Promise<boolean> {
    const analysis = await this.analyzeDelete({ name, assetType });
    return analysis.safeToProc;
  }

  /**
   * Find all orphaned assets (no dependents and not referenced)
   */
  async findOrphans(assetType: AssetType): Promise<string[]> {
    const orphans: string[] = [];
    const assetsDir = this.getAssetDirectory(assetType);

    try {
      const files = fs.readdirSync(path.join(this.baseDir, assetsDir))
        .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "index.ts");

      for (const file of files) {
        const name = file.replace(".ts", "");
        const dependents = await this.findDirectDependents(name, assetType);

        if (dependents.length === 0) {
          orphans.push(name);
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return orphans;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getAssetPath(name: string, assetType: AssetType): string {
    switch (assetType) {
      case "engine":
        return `src/engines/${name}.ts`;
      case "dispatcher":
        return `src/tools/dispatchers/${name}.ts`;
      case "test":
        return `src/__tests__/${name}.test.ts`;
      case "schema":
        return `src/schemas/${name}.ts`;
      case "skill":
        return `.claude/commands/${this.toKebabCase(name)}.md`;
      case "hook":
        return `.claude/hooks/lib/${name}`;
      default:
        return `src/${name}.ts`;
    }
  }

  private getAssetDirectory(assetType: AssetType): string {
    switch (assetType) {
      case "engine":
        return "src/engines";
      case "dispatcher":
        return "src/tools/dispatchers";
      case "test":
        return "src/__tests__";
      case "schema":
        return "src/schemas";
      default:
        return "src";
    }
  }

  private async findDirectDependents(name: string, assetType: AssetType): Promise<string[]> {
    const dependents: string[] = [];
    const searchDirs = ["src/engines", "src/tools/dispatchers", "src/__tests__"];

    for (const dir of searchDirs) {
      try {
        const dirPath = path.join(this.baseDir, dir);
        if (!fs.existsSync(dirPath)) continue;

        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".ts"));

        for (const file of files) {
          if (file === `${name}.ts`) continue;

          const content = fs.readFileSync(path.join(dirPath, file), "utf-8");

          // Check for imports
          if (this.hasImport(content, name)) {
            dependents.push(file.replace(".ts", ""));
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }

    return [...new Set(dependents)];
  }

  private async findTransitiveDependents(name: string, assetType: AssetType): Promise<string[]> {
    const visited = new Set<string>();
    const queue = [name];
    const transitive: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const dependents = await this.findDirectDependents(current, assetType);
      for (const dep of dependents) {
        if (!visited.has(dep)) {
          transitive.push(dep);
          queue.push(dep);
        }
      }
    }

    return transitive;
  }

  private async findAffectedFiles(name: string, assetType: AssetType): Promise<AffectedFile[]> {
    const affected: AffectedFile[] = [];
    const searchDirs = ["src/engines", "src/tools/dispatchers", "src/__tests__", "src/schemas"];

    for (const dir of searchDirs) {
      try {
        const dirPath = path.join(this.baseDir, dir);
        if (!fs.existsSync(dirPath)) continue;

        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".ts"));

        for (const file of files) {
          const filePath = path.join(dir, file);
          const content = fs.readFileSync(path.join(this.baseDir, filePath), "utf-8");

          if (this.hasReference(content, name)) {
            const lineNumbers = this.findLineNumbers(content, name);
            affected.push({
              path: filePath,
              type: this.inferFileType(file, dir),
              lineNumbers,
              autoFixable: lineNumbers.length < 50, // Too many references = manual review
            });
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }

    return affected;
  }

  private hasImport(content: string, name: string): boolean {
    const importPattern = new RegExp(`import.*from.*["'][^"']*${name}["']`, "i");
    return importPattern.test(content);
  }

  private hasReference(content: string, name: string): boolean {
    return content.includes(name);
  }

  private findLineNumbers(content: string, name: string): number[] {
    const lines = content.split("\n");
    const lineNumbers: number[] = [];

    lines.forEach((line, index) => {
      if (line.includes(name)) {
        lineNumbers.push(index + 1);
      }
    });

    return lineNumbers;
  }

  private inferFileType(file: string, dir: string): "import" | "reference" | "test" | "config" {
    if (file.endsWith(".test.ts") || dir.includes("__tests__")) return "test";
    if (dir.includes("schemas")) return "config";
    return "import";
  }

  private detectBreakingChanges(fromName: string, toName: string, assetType: AssetType): BreakingChange[] {
    const changes: BreakingChange[] = [];

    // Check for case sensitivity issues
    if (fromName.toLowerCase() === toName.toLowerCase() && fromName !== toName) {
      changes.push({
        description: "Case-only rename may cause issues on case-insensitive file systems",
        severity: "warning",
        location: this.getAssetPath(fromName, assetType),
      });
    }

    // Check for reserved words
    const reservedWords = ["index", "types", "utils", "constants", "helpers"];
    if (reservedWords.includes(toName.toLowerCase())) {
      changes.push({
        description: `"${toName}" is a reserved/common name that may cause conflicts`,
        severity: "warning",
        location: this.getAssetPath(fromName, assetType),
        suggestedFix: `Choose a more specific name like "${toName}Engine" or "${toName}Service"`,
      });
    }

    return changes;
  }

  private generateWarnings(name: string, assetType: AssetType, dependentCount: number): string[] {
    const warnings: string[] = [];

    if (CRITICAL_ASSETS.has(name)) {
      warnings.push(`WARNING: ${name} is a CRITICAL asset. Modification may affect system safety.`);
    }

    if (dependentCount > HIGH_IMPACT_THRESHOLD) {
      warnings.push(`WARNING: ${dependentCount} assets depend on ${name}. Consider deprecation instead of direct modification.`);
    }

    return warnings;
  }

  private generateRecommendations(operation: "rename" | "delete", name: string, dependentCount: number): string[] {
    const recommendations: string[] = [];

    if (operation === "delete" && dependentCount > 0) {
      recommendations.push("1. Run impact analysis to identify all dependents");
      recommendations.push("2. Update dependents to remove references first");
      recommendations.push("3. Mark asset as deprecated before deletion");
      recommendations.push("4. Run full test suite after deletion");
    }

    if (operation === "rename") {
      recommendations.push("1. Create new asset with new name");
      recommendations.push("2. Update all references to point to new asset");
      recommendations.push("3. Mark old asset as deprecated");
      recommendations.push("4. Remove old asset after verification");
    }

    return recommendations;
  }

  private calculateImpactLevel(
    name: string,
    directCount: number,
    transitiveCount: number
  ): "low" | "medium" | "high" | "critical" {
    if (CRITICAL_ASSETS.has(name)) return "critical";
    if (transitiveCount > HIGH_IMPACT_THRESHOLD * 2) return "critical";
    if (directCount > HIGH_IMPACT_THRESHOLD) return "high";
    if (directCount > MEDIUM_IMPACT_THRESHOLD) return "medium";
    return "low";
  }

  private replaceReferences(content: string, fromName: string, toName: string, assetType: AssetType): string {
    // Replace import statements
    content = content.replace(
      new RegExp(`(from\\s+["'][^"']*/)${fromName}(["'])`, "g"),
      `$1${toName}$2`
    );

    // Replace class/singleton references
    content = content.replace(new RegExp(`\\b${fromName}\\b`, "g"), toName);

    return content;
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
      .toLowerCase();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const impactAnalysisEngine = new ImpactAnalysisEngine();
