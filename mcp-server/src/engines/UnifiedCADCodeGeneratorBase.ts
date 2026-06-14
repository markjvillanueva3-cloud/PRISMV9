// WIRE-EXEMPT: abstract base — subclassed by every ICADCodeGenerator
// (CADQueryGen / OpenSCADGen / etc.). Not user-facing — no MCP dispatch
// surface needed. Tagged 2026-05-26 (slot:victor) per CLAUDE.md
// §ENGINE WIRING "WIRE-EXEMPT: <reason>" convention to suppress the
// unwired-engine audit false-positive.
/**
 * UnifiedCADCodeGeneratorBase — U-CADC00 (PHASE-0B)
 *
 * Abstract base implementing the common scaffolding every ICADCodeGenerator
 * needs: capability enforcement, parameter registry, warning collection, op
 * lineage, subprocess-safe execution helpers, and a default validateOutput()
 * that applies engineering acceptance rules.
 *
 * Subclasses implement two small surfaces:
 *   - emitOp(op, emitter) — host-native code for one operation
 *   - runScriptBody(script) — executes the script body and returns a result
 *
 * Everything else (line numbering, warnings, parameter tables, imports, etc.)
 * is handled once here so concrete generators (FreeCAD, Fusion, CadQuery,
 * Inventor, Mastercam, hyperMILL, hyperCAD-S) stay small and focused.
 *
 * @module engines/UnifiedCADCodeGeneratorBase
 */

import type {
  CADCapabilityMatrix,
  CADOperation,
  CADOperationKind,
  CADScript,
  CADScriptLineageEntry,
  CADBuildWarning,
  CADExecutionResult,
  CADValidationFinding,
  CADValidationReport,
  CADSystemId,
  ICADCodeGenerator,
} from "../interfaces/ICADCodeGenerator.js";

// ── Errors ────────────────────────────────────────────────────────────────

export class UnsupportedCapabilityError extends Error {
  constructor(
    public readonly cadSystem: CADSystemId,
    public readonly kind: CADOperationKind,
    public readonly opIndex: number,
  ) {
    super(
      `CAD system '${cadSystem}' does not support operation '${kind}' (op #${opIndex})`,
    );
    this.name = "UnsupportedCapabilityError";
  }
}

export class CADBuildError extends Error {
  constructor(
    message: string,
    public readonly opIndex: number,
    public readonly kind: CADOperationKind,
  ) {
    super(message);
    this.name = "CADBuildError";
  }
}

// ── Emitter helper passed to subclass.emitOp() ───────────────────────────

export interface CADEmitter {
  /** Append one or more lines to the script body. */
  line(text?: string): void;
  /** Append a block of pre-formatted text (splits on \n). */
  block(text: string): void;
  /** Collect a parameter declaration for the final Script. */
  parameter(
    name: string,
    value: number | string | boolean,
    unit: string,
    description?: string,
  ): void;
  /** Record a non-fatal warning tied to the current operation. */
  warn(message: string, severity?: "info" | "warn" | "error"): void;
  /** Record an import / dependency (deduplicated). */
  require(importSpec: string): void;
  /** Current 1-based line number (next line will be this). */
  readonly nextLine: number;
  /** Indent prefix (mutated by subclasses that need block indentation). */
  indent: string;
}

// ── Abstract base ─────────────────────────────────────────────────────────

export abstract class UnifiedCADCodeGeneratorBase<
  TContext = Record<string, unknown>,
> implements ICADCodeGenerator<CADScript<string>, TContext, CADExecutionResult>
{
  abstract readonly cadSystem: CADSystemId;
  abstract readonly capabilities: CADCapabilityMatrix;

  getCapabilities(): CADCapabilityMatrix {
    // Return a snapshot with frozen supportedOps set.
    return {
      ...this.capabilities,
      supportedOps: new Set(this.capabilities.supportedOps),
    };
  }

  // ── Template methods (subclasses override) ──────────────────────────────

  /** Script preamble — imports, headers, helper functions, unit setup. */
  protected abstract preamble(ctx: TContext | undefined, emitter: CADEmitter): void;

  /** Per-op code emission. Subclasses must implement every supportedOp kind. */
  protected abstract emitOp(
    op: CADOperation,
    opIndex: number,
    ctx: TContext | undefined,
    emitter: CADEmitter,
  ): void;

  /** Script epilogue — save/export/close. */
  protected abstract epilogue(ctx: TContext | undefined, emitter: CADEmitter): void;

  /** Filename for the generated script (subclasses choose extension). */
  protected abstract scriptFilename(ctx: TContext | undefined): string;

  /** Execute the final script body (Python subprocess, COM, REST, etc). */
  protected abstract runScriptBody(
    script: CADScript<string>,
  ): Promise<CADExecutionResult>;

  // ── Build phase ─────────────────────────────────────────────────────────

  buildScript(
    ops: ReadonlyArray<CADOperation>,
    ctx?: TContext,
  ): CADScript<string> {
    // Capability fast-check — fail before we emit a single character.
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i]!;
      if (!this.capabilities.supportedOps.has(op.kind)) {
        throw new UnsupportedCapabilityError(this.cadSystem, op.kind, i);
      }
    }

    const lines: string[] = [];
    const lineage: CADScriptLineageEntry[] = [];
    const warnings: CADBuildWarning[] = [];
    const parameters = new Map<
      string,
      { value: number | string | boolean; unit: string; description?: string }
    >();
    const imports = new Set<string>();
    let currentIndent = "";

    const makeEmitter = (opIndex: number | null, opKind: CADOperationKind | null): CADEmitter => {
      const emitter: CADEmitter = {
        line(text = "") {
          lines.push(currentIndent + text);
        },
        block(text) {
          for (const ln of text.split(/\r?\n/)) lines.push(currentIndent + ln);
        },
        parameter(name, value, unit, description) {
          parameters.set(name, { value, unit, description });
        },
        warn(message, severity = "warn") {
          if (opIndex === null || opKind === null) {
            warnings.push({
              opIndex: -1,
              kind: "custom",
              message,
              severity,
            });
          } else {
            warnings.push({ opIndex, kind: opKind, message, severity });
          }
        },
        require(importSpec) {
          imports.add(importSpec);
        },
        get nextLine() {
          return lines.length + 1;
        },
        get indent() {
          return currentIndent;
        },
        set indent(v: string) {
          currentIndent = v;
        },
      };
      return emitter;
    };

    // Preamble.
    const preambleEmitter = makeEmitter(null, null);
    this.preamble(ctx, preambleEmitter);

    // Ops.
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i]!;
      const emitter = makeEmitter(i, op.kind);
      const lineStart = emitter.nextLine;
      try {
        this.emitOp(op, i, ctx, emitter);
      } catch (err) {
        if (err instanceof UnsupportedCapabilityError) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        throw new CADBuildError(
          `emitOp failed at op #${i} (${op.kind}): ${msg}`,
          i,
          op.kind,
        );
      }
      const lineEnd = Math.max(lineStart, emitter.nextLine - 1);
      lineage.push({
        opIndex: i,
        operationId: op.operationId,
        kind: op.kind,
        lineStart,
        lineEnd,
      });
    }

    // Epilogue.
    const epilogueEmitter = makeEmitter(null, null);
    this.epilogue(ctx, epilogueEmitter);

    return {
      cadSystem: this.cadSystem,
      body: lines.join("\n"),
      filename: this.scriptFilename(ctx),
      lineage,
      warnings,
      parameters,
      imports: [...imports],
    };
  }

  // ── Execute phase ───────────────────────────────────────────────────────

  async executeScript(script: CADScript<string>): Promise<CADExecutionResult> {
    const started = Date.now();
    try {
      const res = await this.runScriptBody(script);
      // If subprocess didn't set durationMs, fill it here.
      if (!res.durationMs) {
        return { ...res, durationMs: Date.now() - started };
      }
      return res;
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
      };
    }
  }

  // ── Validate phase ──────────────────────────────────────────────────────

  validateOutput(result: CADExecutionResult): CADValidationReport {
    const findings: CADValidationFinding[] = [];
    if (!result.ok) {
      findings.push({
        severity: "error",
        code: "EXEC_FAILED",
        message: result.error ?? "execution failed",
      });
      return { ok: false, findings };
    }
    const m = result.metrics;
    if (m) {
      if (typeof m.volumeMm3 === "number") {
        if (m.volumeMm3 <= 0) {
          findings.push({
            severity: "error",
            code: "EMPTY_GEOMETRY",
            message: `volume ${m.volumeMm3} mm^3 is non-positive`,
          });
        } else if (m.volumeMm3 > 1e12) {
          findings.push({
            severity: "warn",
            code: "IMPLAUSIBLE_VOLUME",
            message: `volume ${m.volumeMm3} mm^3 exceeds 1 m^3`,
          });
        }
      }
      if (typeof m.faceCount === "number" && m.faceCount === 0) {
        findings.push({
          severity: "error",
          code: "NO_FACES",
          message: "model has zero faces",
        });
      }
      if (m.boundingBoxMm) {
        const [x, y, z] = m.boundingBoxMm;
        if (x < 0 || y < 0 || z < 0) {
          findings.push({
            severity: "error",
            code: "NEGATIVE_BBOX",
            message: `bounding box has negative dimension: ${m.boundingBoxMm.join("×")}`,
          });
        }
      }
    }
    const hasError = findings.some((f) => f.severity === "error");
    return { ok: !hasError, findings };
  }

  // ── Convenience predicates for subclasses ───────────────────────────────

  protected supports(kind: CADOperationKind): boolean {
    return this.capabilities.supportedOps.has(kind);
  }

  protected requireArg<T>(
    op: CADOperation,
    name: string,
    kind: "number" | "string" | "boolean" | "array",
  ): T {
    const v = op.args[name];
    if (v === undefined || v === null) {
      throw new CADBuildError(
        `op '${op.kind}' missing required arg '${name}'`,
        -1,
        op.kind,
      );
    }
    const actualKind = Array.isArray(v) ? "array" : typeof v;
    if (actualKind !== kind) {
      throw new CADBuildError(
        `op '${op.kind}' arg '${name}' must be ${kind}, got ${actualKind}`,
        -1,
        op.kind,
      );
    }
    return v as T;
  }
}
