/**
 * ValidationOrchestratorEngine — INTEL-OLLAMA-OBSIDIAN-MS0/P10-U02
 *
 * Single-entry router for the 19+ validation engines living in src/engines/.
 * Same shape as AuditChainEngine (P10-U03): canonical domain enum + alias
 * map + backend descriptor table + uniform result envelope. Old engines
 * preserved as backends; this one adds a uniform API for callers.
 *
 * Surfaced via the `prism_dev:validate` dispatcher action.
 *
 * Pure-function exports for tests:
 *   - normalizeDomain(input)        → ValidationDomain | null
 *   - selectBackend(domain)         → BackendDescriptor
 *   - validateRequest(req)          → null | string error
 *   - mergeValidationResults(parts) → ValidationOrchestratorResult
 *   - isCriticalSeverity(envelope)  → boolean (helper for caller alerting)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P10-U02
 */

import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

export type ValidationDomain =
  | "code"
  | "physics"
  | "data"
  | "post"
  | "formula"
  | "machine"
  | "coolant"
  | "gcode"
  | "catalog"
  | "dimensional"
  | "macro"
  | "controller";

export interface ValidationRequest {
  domain: ValidationDomain;
  /** What to validate — file path, machine id, formula id, etc. */
  target: string;
  /** Optional structured options the backend understands */
  options?: Record<string, unknown>;
}

export interface BackendDescriptor {
  engineClass: string;
  singleton: string;
  method: string;
  description: string;
}

export interface ValidationOrchestratorResult {
  domain: ValidationDomain;
  target: string;
  ok: boolean;
  /** "passed" | "warnings" | "failed" — finer-grained than ok */
  severity: "passed" | "warnings" | "failed";
  backend: string;
  data?: unknown;
  errors?: string[];
  warnings?: string[];
  durationMs: number;
  ts: string;
}

// ============================================================================
// ROUTING TABLE
// ============================================================================

export const VALIDATION_BACKEND_TABLE: Record<ValidationDomain, BackendDescriptor> = {
  code: {
    engineClass: "AuditEngine",
    singleton: "auditEngine",
    method: "auditCode",
    description: "Static code-quality + dead-ref + unwired-engine detection",
  },
  physics: {
    engineClass: "KnowledgePhysicsValidatorEngine",
    singleton: "knowledgePhysicsValidatorEngine",
    method: "validate",
    description: "Knowledge-base physics formula sanity (Kienzle, Taylor, deflection)",
  },
  data: {
    engineClass: "DataValidationEngine",
    singleton: "dataValidationEngine",
    method: "validate",
    description: "Schema + range + null/NaN data validation",
  },
  post: {
    engineClass: "PPBlockCompositionValidatorEngine",
    singleton: "ppBlockCompositionValidatorEngine",
    method: "validate",
    description: "Post-processor block composition + sequencing rules",
  },
  formula: {
    engineClass: "FormulaValidationEngine",
    singleton: "formulaValidationEngine",
    method: "validate",
    description: "Formula citations, dimensional consistency, range bounds",
  },
  machine: {
    engineClass: "ControllerStrategyValidatorEngine",
    singleton: "controllerStrategyValidatorEngine",
    method: "validate",
    description: "Controller-specific strategy validation (Okuma OSP, Fanuc, Heidenhain)",
  },
  coolant: {
    engineClass: "CoolantValidationEngine",
    singleton: "coolantValidationEngine",
    method: "validate",
    description: "Coolant strategy validity per material + operation + machine",
  },
  gcode: {
    engineClass: "GCodeValidationEngine",
    singleton: "gCodeValidationEngine",
    method: "validate",
    description: "G-code syntax + modal-state + travel-bounds checks",
  },
  catalog: {
    engineClass: "CrossCatalogValidationEngine",
    singleton: "crossCatalogValidationEngine",
    method: "validate",
    description: "Cross-catalog integrity (tool↔material↔machine joins)",
  },
  dimensional: {
    engineClass: "DimensionalAnalysisCrossValidationEngine",
    singleton: "dimensionalAnalysisCrossValidationEngine",
    method: "validate",
    description: "Cross-formula dimensional consistency (units propagation)",
  },
  macro: {
    engineClass: "MacroValidationEngine",
    singleton: "macroValidationEngine",
    method: "validate",
    description: "G-code macro variable scope + circular-reference detection",
  },
  controller: {
    engineClass: "ControllerStrategyValidatorEngine",
    singleton: "controllerStrategyValidatorEngine",
    method: "validate",
    description: "Alias for 'machine' — controller-specific strategy validation",
  },
};

const VALID_DOMAINS: ValidationDomain[] = Object.keys(VALIDATION_BACKEND_TABLE) as ValidationDomain[];

// ============================================================================
// PURE LOGIC (exported for tests)
// ============================================================================

export function normalizeDomain(input: unknown): ValidationDomain | null {
  if (typeof input !== "string") return null;
  const lower = input.trim().toLowerCase();
  if (lower.length === 0) return null;
  if (VALID_DOMAINS.includes(lower as ValidationDomain)) return lower as ValidationDomain;

  const aliases: Record<string, ValidationDomain> = {
    src: "code",
    source: "code",
    physic: "physics",
    kienzle: "physics",
    taylor: "physics",
    pp: "post",
    "post-processor": "post",
    cnc: "machine",
    nc: "gcode",
    "g-code": "gcode",
    units: "dimensional",
    macros: "macro",
    osp: "controller",
    fanuc: "controller",
    heidenhain: "controller",
  };
  return aliases[lower] ?? null;
}

export function selectBackend(domain: ValidationDomain): BackendDescriptor {
  const desc = VALIDATION_BACKEND_TABLE[domain];
  if (!desc) {
    throw new Error(`ValidationOrchestratorEngine: no backend for domain "${domain}"`);
  }
  return desc;
}

export function validateRequest(req: unknown): string | null {
  if (!req || typeof req !== "object") return "request must be an object";
  const r = req as Record<string, unknown>;
  const norm = normalizeDomain(r.domain);
  if (!norm) {
    return `unknown validation domain "${r.domain}". Valid: ${VALID_DOMAINS.join(", ")}`;
  }
  if (typeof r.target !== "string" || r.target.length === 0) {
    return "target is required and must be a non-empty string";
  }
  if (r.options !== undefined && (typeof r.options !== "object" || r.options === null || Array.isArray(r.options))) {
    return "options must be a plain object when provided";
  }
  return null;
}

export function mergeValidationResults(parts: ValidationOrchestratorResult[]): ValidationOrchestratorResult {
  if (!Array.isArray(parts) || parts.length === 0) {
    return {
      domain: "code",
      target: "(empty)",
      ok: true,
      severity: "passed",
      backend: "merge:empty",
      data: { parts: [] },
      durationMs: 0,
      ts: new Date().toISOString(),
    };
  }
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  let anyFailed = false;
  let anyWarnings = false;
  for (const p of parts) {
    if (!p.ok || p.severity === "failed") anyFailed = true;
    if (p.severity === "warnings") anyWarnings = true;
    if (Array.isArray(p.errors)) allErrors.push(...p.errors);
    if (Array.isArray(p.warnings)) allWarnings.push(...p.warnings);
  }
  const severity: ValidationOrchestratorResult["severity"] =
    anyFailed ? "failed" : anyWarnings ? "warnings" : "passed";
  return {
    domain: parts[0].domain,
    target: parts[0].target,
    ok: !anyFailed,
    severity,
    backend: parts.map((p) => p.backend).join(","),
    data: { parts: parts.map((p) => ({ backend: p.backend, ok: p.ok, severity: p.severity, data: p.data })) },
    errors: allErrors.length > 0 ? allErrors : undefined,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
    durationMs: parts.reduce((s, p) => s + p.durationMs, 0),
    ts: parts[parts.length - 1].ts,
  };
}

/**
 * Helper for the dispatcher / hook layer to decide whether a result should
 * trigger an alert (block, escalate, surface).
 */
export function isCriticalSeverity(envelope: ValidationOrchestratorResult | null | undefined): boolean {
  if (!envelope) return false;
  if (envelope.severity === "failed") return true;
  // Optional: treat presence of errors[] as critical even when ok=true
  if (Array.isArray(envelope.errors) && envelope.errors.length > 0) return true;
  return false;
}

// ============================================================================
// I/O LAYER
// ============================================================================

export const validationOrchestratorInputSchema = z.object({
  domain: z.string().min(1, "validation domain is required"),
  target: z.string().min(1, "target is required"),
  options: z.record(z.string(), z.unknown()).optional(),
});

export class ValidationOrchestratorEngine {
  async run(req: ValidationRequest): Promise<ValidationOrchestratorResult> {
    const start = Date.now();
    const err = validateRequest(req);
    if (err) {
      return {
        domain: (normalizeDomain(req?.domain) ?? "code"),
        target: typeof req?.target === "string" ? req.target : "",
        ok: false,
        severity: "failed",
        backend: "validation",
        errors: [err],
        durationMs: Date.now() - start,
        ts: new Date().toISOString(),
      };
    }
    const domain = normalizeDomain(req.domain)!;
    const backend = selectBackend(domain);
    try {
      const mod: any = await import(`./${backend.engineClass}.js`);
      const inst = mod[backend.singleton] ?? mod.default ?? null;
      if (!inst || typeof (inst as any)[backend.method] !== "function") {
        return {
          domain,
          target: req.target,
          ok: false,
          severity: "failed",
          backend: backend.engineClass,
          errors: [`backend ${backend.engineClass}.${backend.method} not callable`],
          durationMs: Date.now() - start,
          ts: new Date().toISOString(),
        };
      }
      const data = await (inst as any)[backend.method](req.target, req.options ?? {});
      // Normalise: a backend that returns a `{ valid, errors, warnings }`
      // envelope gets mapped to our severity scale; otherwise default to
      // "passed" + the raw data.
      const resErrors = Array.isArray((data as any)?.errors) ? (data as any).errors as string[] : undefined;
      const resWarnings = Array.isArray((data as any)?.warnings) ? (data as any).warnings as string[] : undefined;
      const sev: ValidationOrchestratorResult["severity"] =
        resErrors && resErrors.length > 0 ? "failed"
        : resWarnings && resWarnings.length > 0 ? "warnings"
        : "passed";
      return {
        domain,
        target: req.target,
        ok: sev !== "failed",
        severity: sev,
        backend: backend.engineClass,
        data,
        errors: resErrors,
        warnings: resWarnings,
        durationMs: Date.now() - start,
        ts: new Date().toISOString(),
      };
    } catch (e) {
      return {
        domain,
        target: req.target,
        ok: false,
        severity: "failed",
        backend: backend.engineClass,
        errors: [(e as Error).message],
        durationMs: Date.now() - start,
        ts: new Date().toISOString(),
      };
    }
  }
}

export const validationOrchestratorEngine = new ValidationOrchestratorEngine();
