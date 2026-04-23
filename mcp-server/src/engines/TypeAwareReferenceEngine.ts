/**
 * TypeAwareReferenceEngine — U-FORE-16 (Type-Aware Static Analysis)
 * ===================================================================
 *
 * Uses ts-morph to find every type-aware reference to a named symbol
 * across a bounded set of source files. Unlike a text search, this
 * distinguishes between e.g. `MyEngine` the class and `MyEngine` a
 * local variable in unrelated code — only true semantic references
 * are returned.
 *
 * Inputs  → { targetFile, symbolName, scopeFiles? }
 * Outputs → {
 *   references: Array<{ file, line, column, kind, inScope }>,
 *   declarations: Array<{ file, line, column }>,
 *   totalFound
 * }
 *
 * scopeFiles defaults to the PRISM src/ tree to avoid pulling in
 * node_modules (ts-morph otherwise scans declaration files).
 *
 * Performance: first call initializes a Project (~5-15s for full
 * PRISM). Subsequent calls reuse the cached Project. Call reset()
 * after large batches of edits to force a reload.
 */

import * as path from "node:path";
import * as fs from "node:fs";

export interface TypeAwareRefInput {
  targetFile: string;
  symbolName: string;
  scopeFiles?: string[];
}

export interface SymbolReference {
  file: string;
  line: number;
  column: number;
  kind: "reference" | "declaration" | "definition";
  inScope: boolean;
}

export interface TypeAwareRefResult {
  references: SymbolReference[];
  declarations: SymbolReference[];
  totalFound: number;
}

type TsMorphProject = {
  addSourceFileAtPathIfExists: (path: string) => unknown;
  getSourceFile: (path: string) => TsMorphSourceFile | undefined;
};

type TsMorphSourceFile = {
  getFilePath: () => string;
  forEachDescendant: (callback: (node: TsMorphNode) => void) => void;
};

type TsMorphNode = {
  getKindName: () => string;
  getText: () => string;
  getStartLineNumber: () => number;
  findReferences?: () => TsMorphReferencedSymbol[];
};

type TsMorphReferencedSymbol = {
  getDefinition: () => { getSourceFile: () => TsMorphSourceFile; getNode: () => TsMorphNode };
  getReferences: () => TsMorphReference[];
};

type TsMorphReference = {
  getSourceFile: () => TsMorphSourceFile;
  getNode: () => TsMorphNode;
  isDefinition?: () => boolean;
};

export class TypeAwareReferenceEngine {
  readonly name = "TypeAwareReferenceEngine";
  private project: TsMorphProject | null = null;

  async findReferences(input: TypeAwareRefInput): Promise<TypeAwareRefResult> {
    this.validate(input);
    const proj = await this.ensureProject(input.scopeFiles);
    proj.addSourceFileAtPathIfExists(input.targetFile);
    const sourceFile = proj.getSourceFile(input.targetFile);
    if (!sourceFile) {
      throw new Error(`TypeAwareReferenceEngine: target file not found '${input.targetFile}'`);
    }

    const references: SymbolReference[] = [];
    const declarations: SymbolReference[] = [];
    const scope = this.resolveScope(input.scopeFiles);

    sourceFile.forEachDescendant((node) => {
      if (node.getKindName() !== "Identifier") return;
      if (node.getText() !== input.symbolName) return;
      const find = node.findReferences;
      if (typeof find !== "function") return;
      const refs = find.call(node);
      for (const rs of refs) {
        const def = rs.getDefinition();
        const defSourceFile = def.getSourceFile();
        const defNode = def.getNode();
        const defPath = path.normalize(defSourceFile.getFilePath());
        declarations.push({
          file: defPath,
          line: defNode.getStartLineNumber(),
          column: 0,
          kind: "declaration",
          inScope: this.isInScope(defPath, scope),
        });
        for (const r of rs.getReferences()) {
          const rPath = path.normalize(r.getSourceFile().getFilePath());
          const rNode = r.getNode();
          const isDef = typeof r.isDefinition === "function" ? !!r.isDefinition() : false;
          references.push({
            file: rPath,
            line: rNode.getStartLineNumber(),
            column: 0,
            kind: isDef ? "definition" : "reference",
            inScope: this.isInScope(rPath, scope),
          });
        }
      }
    });

    const uniqueRefs = this.dedup(references);
    const uniqueDecls = this.dedup(declarations);
    return {
      references: uniqueRefs,
      declarations: uniqueDecls,
      totalFound: uniqueRefs.length,
    };
  }

  reset(): void {
    this.project = null;
  }

  private dedup(rs: SymbolReference[]): SymbolReference[] {
    const seen = new Set<string>();
    const result: SymbolReference[] = [];
    for (const r of rs) {
      const key = `${r.file}:${r.line}:${r.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(r);
    }
    return result;
  }

  private resolveScope(scopeFiles?: string[]): Set<string> | null {
    if (!scopeFiles) return null;
    return new Set(scopeFiles.map((f) => path.normalize(f)));
  }

  private isInScope(filePath: string, scope: Set<string> | null): boolean {
    if (!scope) return true;
    return scope.has(path.normalize(filePath));
  }

  private async ensureProject(scopeFiles?: string[]): Promise<TsMorphProject> {
    if (this.project) return this.project;
    const tsMorph = await import("ts-morph");
    const Project = (tsMorph as { Project: new (opts: unknown) => TsMorphProject }).Project;
    const tsConfigPath = this.findTsConfig();
    const proj = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true,
    });
    if (scopeFiles) {
      for (const f of scopeFiles) {
        if (fs.existsSync(f)) proj.addSourceFileAtPathIfExists(f);
      }
    }
    this.project = proj;
    return proj;
  }

  private findTsConfig(): string | undefined {
    const candidates = [
      path.resolve(process.cwd(), "tsconfig.json"),
      path.resolve(process.cwd(), "mcp-server/tsconfig.json"),
      path.resolve("H:/prism/mcp-server/tsconfig.json"),
    ];
    for (const c of candidates) if (fs.existsSync(c)) return c;
    return undefined;
  }

  private validate(input: TypeAwareRefInput): void {
    if (!input) throw new Error("TypeAwareReferenceEngine.findReferences: input required");
    if (typeof input.targetFile !== "string" || input.targetFile.length === 0) {
      throw new Error("TypeAwareReferenceEngine.findReferences: targetFile required");
    }
    if (typeof input.symbolName !== "string" || input.symbolName.length === 0) {
      throw new Error("TypeAwareReferenceEngine.findReferences: symbolName required");
    }
    if (!fs.existsSync(input.targetFile)) {
      throw new Error(`TypeAwareReferenceEngine.findReferences: targetFile does not exist '${input.targetFile}'`);
    }
  }
}

export const typeAwareReferenceEngine = new TypeAwareReferenceEngine();
