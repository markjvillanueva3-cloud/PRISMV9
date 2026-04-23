/**
 * SymbolImpactEngine — U-FORE-16 (Type-Aware Static Analysis)
 * ============================================================
 *
 * Given a symbol in a source file, reports the set of files that
 * would be affected if the symbol is renamed, re-typed, or deleted.
 * Built on top of TypeAwareReferenceEngine so the results are
 * semantic, not textual.
 *
 * Inputs  → { targetFile, symbolName, scopeFiles? }
 * Outputs → {
 *   affectedFiles: string[],         // unique producers/consumers
 *   testFiles: string[],             // subset of affectedFiles under __tests__/
 *   dispatcherFiles: string[],       // subset under tools/dispatchers
 *   totalReferences: number,
 *   totalDeclarations: number,
 *   riskLevel: "low" | "medium" | "high"
 * }
 *
 * Risk:
 *   - 0 external references: low
 *   - 1-10 or internal-only: medium
 *   - >10 or touches dispatchers/tests: high
 */

import { typeAwareReferenceEngine } from "./TypeAwareReferenceEngine.js";

export interface SymbolImpactInput {
  targetFile: string;
  symbolName: string;
  scopeFiles?: string[];
}

export interface SymbolImpactResult {
  affectedFiles: string[];
  testFiles: string[];
  dispatcherFiles: string[];
  totalReferences: number;
  totalDeclarations: number;
  riskLevel: "low" | "medium" | "high";
}

const HIGH_RISK_REFERENCES = 10;

export class SymbolImpactEngine {
  readonly name = "SymbolImpactEngine";

  async analyze(input: SymbolImpactInput): Promise<SymbolImpactResult> {
    if (!input) throw new Error("SymbolImpactEngine.analyze: input required");
    if (!input.targetFile) throw new Error("SymbolImpactEngine.analyze: targetFile required");
    if (!input.symbolName) throw new Error("SymbolImpactEngine.analyze: symbolName required");

    const refResult = await typeAwareReferenceEngine.findReferences({
      targetFile: input.targetFile,
      symbolName: input.symbolName,
      scopeFiles: input.scopeFiles,
    });

    const affected = new Set<string>();
    for (const r of refResult.references) affected.add(r.file);
    for (const d of refResult.declarations) affected.add(d.file);
    affected.delete(input.targetFile);

    const affectedFiles = Array.from(affected).sort();
    const testFiles = affectedFiles.filter((f) => /[\\/]__tests__[\\/]/.test(f) || /\.test\.ts$/.test(f));
    const dispatcherFiles = affectedFiles.filter((f) => /dispatchers[\\/]/.test(f));

    const externalReferences = refResult.references.filter((r) => r.file !== input.targetFile).length;
    const touchesCritical = dispatcherFiles.length > 0 || testFiles.length > 0;
    const riskLevel: SymbolImpactResult["riskLevel"] =
      affectedFiles.length === 0
        ? "low"
        : externalReferences > HIGH_RISK_REFERENCES || touchesCritical
          ? "high"
          : "medium";

    return {
      affectedFiles,
      testFiles,
      dispatcherFiles,
      totalReferences: externalReferences,
      totalDeclarations: refResult.declarations.length,
      riskLevel,
    };
  }
}

export const symbolImpactEngine = new SymbolImpactEngine();
