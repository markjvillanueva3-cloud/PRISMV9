/**
 * TypeFlowTracerEngine — U-FORE-16 (Type-Aware Static Analysis)
 * ==============================================================
 *
 * Traces how a named parameter or local variable is used within a
 * function body. Surface's usage shape so a prospective type change
 * can be evaluated before it's committed.
 *
 * Usage categories:
 *   - property_access: `x.foo`, `x?.foo`
 *   - assigned_from:   `x = something`     (x appears on LHS)
 *   - assigned_to:     `something = x`     (x appears on RHS)
 *   - passed_to_call:  `fn(x)` — tracks function name + arg index
 *   - returned:        `return x`
 *   - narrowed:        `if (typeof x === 'number') {...}` / `instanceof`
 *   - spread:          `{ ...x }` or `[...x]`
 *
 * Inputs  → { file, functionName, parameterName }
 * Outputs → {
 *   file, functionName, parameterName,
 *   usages: Usage[],
 *   shape: "object-like"|"array-like"|"primitive-like"|"callable-like"|"unknown",
 *   totalUsages,
 *   breakageHints: string[]
 * }
 */

import * as fs from "node:fs";

export interface TypeFlowInput {
  file: string;
  functionName: string;
  parameterName: string;
}

export interface UsageEntry {
  line: number;
  kind:
    | "property_access"
    | "assigned_from"
    | "assigned_to"
    | "passed_to_call"
    | "returned"
    | "narrowed"
    | "spread"
    | "other";
  detail?: string;
}

export interface TypeFlowResult {
  file: string;
  functionName: string;
  parameterName: string;
  usages: UsageEntry[];
  shape: "object-like" | "array-like" | "primitive-like" | "callable-like" | "unknown";
  totalUsages: number;
  breakageHints: string[];
}

type TsMorphProject = {
  addSourceFileAtPathIfExists: (p: string) => unknown;
  getSourceFile: (p: string) => TsMorphSourceFile | undefined;
};

type TsMorphSourceFile = {
  getFunction?: (name: string) => TsMorphFunction | undefined;
  getFunctions?: () => TsMorphFunction[];
  getClasses?: () => TsMorphClass[];
  forEachDescendant: (cb: (node: TsMorphNode) => void) => void;
};

type TsMorphClass = {
  getMethods?: () => TsMorphFunction[];
};

type TsMorphFunction = {
  getName?: () => string | undefined;
  getBody?: () => TsMorphNode | undefined;
  forEachDescendant: (cb: (node: TsMorphNode) => void) => void;
};

type TsMorphNode = {
  getKindName: () => string;
  getText: () => string;
  getStartLineNumber: () => number;
  getParent?: () => TsMorphNode | undefined;
  getChildren?: () => TsMorphNode[];
  forEachDescendant: (cb: (node: TsMorphNode) => void) => void;
};

export class TypeFlowTracerEngine {
  readonly name = "TypeFlowTracerEngine";
  private project: TsMorphProject | null = null;

  async trace(input: TypeFlowInput): Promise<TypeFlowResult> {
    this.validate(input);
    const proj = await this.ensureProject();
    proj.addSourceFileAtPathIfExists(input.file);
    const sf = proj.getSourceFile(input.file);
    if (!sf) throw new Error(`TypeFlowTracerEngine: file not in project '${input.file}'`);

    const fn = this.findFunction(sf, input.functionName);
    if (!fn) {
      throw new Error(`TypeFlowTracerEngine: function '${input.functionName}' not found in ${input.file}`);
    }

    const usages: UsageEntry[] = [];
    fn.forEachDescendant((node) => {
      if (node.getKindName() !== "Identifier") return;
      if (node.getText() !== input.parameterName) return;
      const parent = node.getParent ? node.getParent() : undefined;
      const parentKind = parent ? parent.getKindName() : "unknown";
      if (parentKind === "Parameter" || parentKind === "BindingElement") return;
      const line = node.getStartLineNumber();
      usages.push(this.classify(parentKind, parent, line));
    });

    const shape = this.inferShape(usages);
    const breakageHints = this.suggestBreakage(usages, shape);

    return {
      file: input.file,
      functionName: input.functionName,
      parameterName: input.parameterName,
      usages,
      shape,
      totalUsages: usages.length,
      breakageHints,
    };
  }

  reset(): void {
    this.project = null;
  }

  private classify(parentKind: string, parent: TsMorphNode | undefined, line: number): UsageEntry {
    const parentText = parent?.getText() ?? "";
    switch (parentKind) {
      case "PropertyAccessExpression":
      case "ElementAccessExpression":
        return { line, kind: "property_access", detail: parentText };
      case "CallExpression":
        return { line, kind: "passed_to_call", detail: parentText.slice(0, 120) };
      case "ReturnStatement":
        return { line, kind: "returned" };
      case "BinaryExpression":
        return { line, kind: parentText.includes("=") && !parentText.startsWith("===") ? "assigned_from" : "other" };
      case "SpreadElement":
      case "SpreadAssignment":
        return { line, kind: "spread" };
      case "TypeOfExpression":
      case "InstanceofExpression":
        return { line, kind: "narrowed" };
      default:
        return { line, kind: "other", detail: parentKind };
    }
  }

  private inferShape(usages: UsageEntry[]): TypeFlowResult["shape"] {
    const kinds = new Set(usages.map((u) => u.kind));
    if (kinds.has("property_access")) return "object-like";
    if (kinds.has("spread")) return "array-like";
    if (usages.some((u) => u.kind === "passed_to_call")) return "callable-like";
    if (usages.every((u) => u.kind === "other" || u.kind === "returned")) return "primitive-like";
    return "unknown";
  }

  private suggestBreakage(usages: UsageEntry[], shape: TypeFlowResult["shape"]): string[] {
    const hints: string[] = [];
    const propAccesses = usages.filter((u) => u.kind === "property_access");
    if (propAccesses.length > 0) {
      hints.push(`Changing to a primitive would break ${propAccesses.length} property access(es)`);
    }
    if (shape === "array-like") {
      hints.push("Spread usage implies iterable — removing iterability would break callers");
    }
    if (usages.some((u) => u.kind === "returned")) {
      hints.push("Value is returned — changing its type propagates to the function's caller");
    }
    if (usages.some((u) => u.kind === "passed_to_call")) {
      hints.push("Value is passed into another call — check the callee's expected type");
    }
    return hints;
  }

  private findFunction(sf: TsMorphSourceFile, name: string): TsMorphFunction | undefined {
    if (sf.getFunction) {
      const direct = sf.getFunction(name);
      if (direct) return direct;
    }
    if (sf.getFunctions) {
      const match = sf.getFunctions().find((f) => f.getName && f.getName() === name);
      if (match) return match;
    }
    if (sf.getClasses) {
      for (const cls of sf.getClasses()) {
        if (!cls.getMethods) continue;
        const method = cls.getMethods().find((m) => m.getName && m.getName() === name);
        if (method) return method;
      }
    }
    return undefined;
  }

  private async ensureProject(): Promise<TsMorphProject> {
    if (this.project) return this.project;
    const tsMorph = await import("ts-morph");
    const Project = (tsMorph as { Project: new (opts: unknown) => TsMorphProject }).Project;
    const proj = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
    this.project = proj;
    return proj;
  }

  private validate(input: TypeFlowInput): void {
    if (!input) throw new Error("TypeFlowTracerEngine.trace: input required");
    if (!input.file || !fs.existsSync(input.file)) {
      throw new Error("TypeFlowTracerEngine.trace: file must exist");
    }
    if (!input.functionName) throw new Error("TypeFlowTracerEngine.trace: functionName required");
    if (!input.parameterName) throw new Error("TypeFlowTracerEngine.trace: parameterName required");
  }
}

export const typeFlowTracerEngine = new TypeFlowTracerEngine();
