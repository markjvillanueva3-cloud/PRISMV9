/**
 * TestASTAnalyzerEngine — TypeScript AST analyzer for engine source files.
 *
 * Purpose (TEST-LEGIT-MS1 U-INFRA01):
 *   Programmatically read engine source to drive realistic test generation.
 *   Without this, generators can only produce shallow tests that shape-match
 *   but don't exercise real methods with real inputs.
 *
 * Layers:
 *   U-INFRA01 (this unit): loadFile, findSingletonExport, findClassDeclaration
 *   U-INFRA02 (next)    : getPublicMethods → MethodSignature[]
 *   U-INFRA03 (next)    : getParameterTypes → TypeDescriptor[]
 *   U-INFRA04 (next)    : getReturnShape → ReturnShape
 *
 * This file intentionally keeps INFRA02-04 hooks present as placeholder methods
 * so the public surface is stable when those units land. They throw
 * "Not yet implemented" until their owning unit completes.
 */

import {
  Project,
  SourceFile,
  ClassDeclaration,
  VariableStatement,
  MethodDeclaration,
  Scope,
  Node,
  Type,
} from "ts-morph";
import * as path from "node:path";
import * as fs from "node:fs";

export interface EngineFileAnalysis {
  filePath: string;
  className: string | null;         // e.g. "AHPEngine"
  singletonName: string | null;     // e.g. "ahpEngine"
  singletonMatchesClass: boolean;   // true iff singleton is `new ClassName()`
  hasDefaultExport: boolean;
  exportedNames: string[];          // all named exports
  errors: string[];                 // non-fatal parse warnings
}

export interface MethodSignature {
  name: string;
  isAsync: boolean;
  isStatic: boolean;
  parameterNames: string[];
  parameterTypeText: string[];
  returnTypeText: string;
  parameterOptional: boolean[];
  parameterHasDefault: boolean[];
}

export interface TypeDescriptor {
  name: string;
  kind: "primitive" | "object" | "array" | "union" | "intersection" | "literal" | "unknown";
  nullable: boolean;
  text: string;
}

export interface ReturnShape {
  typeText: string;
  isAsync: boolean;
  isVoid: boolean;
  isAtomicValue: boolean;  // AtomicValue<T> wrapper from PRISM physics outputs
  innerType: string | null;
}

export class TestASTAnalyzerEngine {
  private project: Project;

  constructor(opts: { tsConfigFilePath?: string } = {}) {
    // Use skipAddingFilesFromTsConfig=true so the project is lean — we add
    // files on demand via addSourceFileAtPath. Loading the whole mcp-server
    // project into ts-morph per-analyzer-instance would be wasteful.
    this.project = new Project({
      tsConfigFilePath: opts.tsConfigFilePath,
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: false,
        declaration: false,
        strict: true,
        target: 99, // ESNext
        module: 99, // ESNext
        moduleResolution: 100, // Bundler
      },
    });
  }

  /**
   * Core U-INFRA01 entry point: analyze a single engine source file.
   * Returns the class name, singleton export name, and a validity flag.
   */
  analyze(filePath: string): EngineFileAnalysis {
    const absPath = path.resolve(filePath);
    const result: EngineFileAnalysis = {
      filePath: absPath,
      className: null,
      singletonName: null,
      singletonMatchesClass: false,
      hasDefaultExport: false,
      exportedNames: [],
      errors: [],
    };

    if (!fs.existsSync(absPath)) {
      result.errors.push(`File not found: ${absPath}`);
      return result;
    }

    let source: SourceFile;
    try {
      source = this.project.addSourceFileAtPath(absPath);
    } catch (err) {
      result.errors.push(`ts-morph load failed: ${String(err)}`);
      return result;
    }

    // Named exports
    try {
      for (const [name] of source.getExportedDeclarations()) {
        result.exportedNames.push(name);
      }
    } catch (err) {
      result.errors.push(`getExportedDeclarations failed: ${String(err)}`);
    }

    // Default export
    result.hasDefaultExport = source.getDefaultExportSymbol() !== undefined;

    // Class declaration — pick the first exported class whose name ends in
    // "Engine" (PRISM convention); fall back to first exported class.
    const classes = source.getClasses().filter((c) => c.isExported());
    const engineClass =
      classes.find((c) => (c.getName() || "").endsWith("Engine")) ?? classes[0] ?? null;
    if (engineClass) {
      result.className = engineClass.getName() ?? null;
    }

    // Singleton — look for `export const fooEngine = new FooEngine(...)`
    const varStatements = source.getVariableStatements().filter((v) => v.isExported());
    for (const stmt of varStatements) {
      const singleton = this.extractSingletonFromStatement(stmt, result.className);
      if (singleton) {
        result.singletonName = singleton.name;
        result.singletonMatchesClass = singleton.matchesClass;
        break;
      }
    }

    // Keep project memory lean: remove the file after analysis. Callers that
    // need repeated access should keep their own reference.
    try {
      source.forget();
    } catch { /* non-fatal */ }

    return result;
  }

  private extractSingletonFromStatement(
    stmt: VariableStatement,
    className: string | null,
  ): { name: string; matchesClass: boolean } | null {
    for (const decl of stmt.getDeclarations()) {
      const init = decl.getInitializer();
      if (!init) continue;
      // Accept `new FooEngine()` or `new FooEngine(args)`
      if (Node.isNewExpression(init)) {
        const expr = init.getExpression();
        const calledName = Node.isIdentifier(expr) ? expr.getText() : expr.getText();
        const matches = className !== null && calledName === className;
        return { name: decl.getName(), matchesClass: matches };
      }
    }
    return null;
  }

  /**
   * U-INFRA02 — Public method signature extractor.
   * Returns every PUBLIC method (excludes private, protected, and the
   * constructor). The PRISM convention is that the engine's primary entry
   * points are instance methods, so static members are included but flagged.
   */
  getPublicMethods(filePath: string): MethodSignature[] {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${absPath}`);
    }
    const source = this.loadSource(absPath);
    try {
      const engineClass = this.selectEngineClass(source);
      if (!engineClass) return [];
      const results: MethodSignature[] = [];
      for (const method of engineClass.getMethods()) {
        const scope = method.getScope();
        if (scope === Scope.Private || scope === Scope.Protected) continue;
        results.push(this.methodToSignature(method));
      }
      return results;
    } finally {
      try { source.forget(); } catch { /* non-fatal */ }
    }
  }

  private methodToSignature(method: MethodDeclaration): MethodSignature {
    const params = method.getParameters();
    const returnNode = method.getReturnTypeNode();
    const returnText = returnNode
      ? returnNode.getText()
      : method.getReturnType().getText(method);
    return {
      name: method.getName(),
      isAsync: method.isAsync(),
      isStatic: method.isStatic(),
      parameterNames: params.map((p) => p.getName()),
      parameterTypeText: params.map((p) => {
        const tn = p.getTypeNode();
        return tn ? tn.getText() : p.getType().getText(p);
      }),
      returnTypeText: returnText,
      parameterOptional: params.map((p) => p.isOptional() || p.hasInitializer()),
      parameterHasDefault: params.map((p) => p.hasInitializer()),
    };
  }

  /**
   * U-INFRA03 — Parameter type introspector.
   * Resolves the parameter types of a named method to structured descriptors.
   * Identifies primitives vs object vs array vs union vs intersection and
   * flags nullable / optional parameters. Accepts filePath + methodName so
   * callers don't need to serialize a ts-morph Node across calls.
   */
  getParameterTypes(filePath: string, methodName: string): TypeDescriptor[] {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${absPath}`);
    }
    const source = this.loadSource(absPath);
    try {
      const engineClass = this.selectEngineClass(source);
      const method = engineClass?.getMethod(methodName);
      if (!method) {
        throw new Error(`Method not found: ${methodName}`);
      }
      return method.getParameters().map((p) => {
        const tn = p.getTypeNode();
        const text = tn ? tn.getText() : p.getType().getText(p);
        return this.describeType(p.getType(), text, p.isOptional() || p.hasInitializer());
      });
    } finally {
      try { source.forget(); } catch { /* non-fatal */ }
    }
  }

  /**
   * U-INFRA04 — Return shape introspector.
   * Identifies: async, void, AtomicValue<T> wrapper, Promise<T> vs sync.
   * AtomicValue is PRISM's canonical physics-output wrapper (value +
   * confidence + source) — flagging it lets test generators emit correct
   * assertions (expect(result.value).toBeCloseTo(...)) rather than naive
   * equality checks on the wrapper object.
   */
  getReturnShape(filePath: string, methodName: string): ReturnShape {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${absPath}`);
    }
    const source = this.loadSource(absPath);
    try {
      const engineClass = this.selectEngineClass(source);
      const method = engineClass?.getMethod(methodName);
      if (!method) {
        throw new Error(`Method not found: ${methodName}`);
      }
      const returnNode = method.getReturnTypeNode();
      const typeText = returnNode
        ? returnNode.getText()
        : method.getReturnType().getText(method);
      const isAsync = method.isAsync();

      // Unwrap Promise<T> when the method is async or the type starts with Promise<
      let inner = typeText;
      let sawPromise = false;
      const promiseMatch = typeText.match(/^\s*Promise<([\s\S]+)>\s*$/);
      if (promiseMatch) {
        sawPromise = true;
        inner = promiseMatch[1].trim();
      }

      const isAtomicValue = /^\s*AtomicValue</.test(inner);
      let innerOfAtomic: string | null = null;
      if (isAtomicValue) {
        const m = inner.match(/^\s*AtomicValue<([\s\S]+)>\s*$/);
        if (m) innerOfAtomic = m[1].trim();
      }

      const isVoid = /^\s*void\s*$/.test(inner);
      return {
        typeText,
        isAsync: isAsync || sawPromise,
        isVoid,
        isAtomicValue,
        innerType: isAtomicValue ? innerOfAtomic : sawPromise ? inner : null,
      };
    } finally {
      try { source.forget(); } catch { /* non-fatal */ }
    }
  }

  // ── Internal helpers ───────────────────────────────────────────────

  private loadSource(absPath: string): SourceFile {
    // Re-load policy: if the file is already in the project (from analyze()
    // earlier in the same run), re-add may throw. Use existing or add fresh.
    const existing = this.project.getSourceFile(absPath);
    if (existing) return existing;
    return this.project.addSourceFileAtPath(absPath);
  }

  private selectEngineClass(source: SourceFile): ClassDeclaration | null {
    const classes = source.getClasses().filter((c) => c.isExported());
    if (classes.length === 0) return null;
    const engineClass = classes.find((c) => (c.getName() || "").endsWith("Engine"));
    return engineClass ?? classes[0];
  }

  private describeType(type: Type, text: string, nullable: boolean): TypeDescriptor {
    const t = text.trim();
    const name = t.split(/[<|&\s]/)[0] || t;
    let kind: TypeDescriptor["kind"] = "unknown";
    // ORDER MATTERS: TypeScript models `boolean` as `true | false` internally,
    // so isUnion() returns true for the plain `boolean` keyword. We must
    // check primitives FIRST (by type-flag AND by the text the author wrote)
    // before falling through to union/intersection classification.
    const isTextualPrimitive = /^(number|string|boolean|bigint|symbol|null|undefined)$/.test(t);
    if (isTextualPrimitive || type.isString() || type.isNumber() || type.isBoolean() || type.isNull() || type.isUndefined()) {
      kind = "primitive";
    } else if (type.isArray() || /\[\]\s*$/.test(t) || /^Array</.test(t)) {
      kind = "array";
    } else if (type.isIntersection()) {
      kind = "intersection";
    } else if (type.isUnion()) {
      kind = "union";
    } else if (type.isLiteral() || type.isBooleanLiteral() || type.isStringLiteral() || type.isNumberLiteral()) {
      kind = "literal";
    } else if (type.isObject() || type.isInterface() || type.isClass()) {
      kind = "object";
    }
    return { name, kind, nullable: nullable || type.isNullable(), text: t };
  }
}

export const testASTAnalyzerEngine = new TestASTAnalyzerEngine();
