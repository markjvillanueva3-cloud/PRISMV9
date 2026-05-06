/**
 * AuditChainEngine — INTEL-OLLAMA-OBSIDIAN-MS0/P10-U03
 *
 * Single-entry router that dispatches audit requests to one of the 13+
 * specialised audit backends already living in src/engines/. Old engines
 * are preserved as backends; this engine adds a uniform API + scope
 * normalisation + result shape so callers don't need to know which
 * specialised engine to import.
 *
 * Surfaced via the `prism_dev:audit_chain` dispatcher action.
 *
 * Pure-function exports for tests:
 *   - normalizeType(input)            → AuditType | null
 *   - selectBackend(type)             → BackendDescriptor
 *   - validateRequest(req)            → null | string error
 *   - mergeAuditResults(individual[]) → AuditChainResult
 *
 * The actual .run() method is async + does the lazy import; tests use the
 * pure helpers + a tiny mock backend to round-trip without disk/network.
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P10-U03
 */

import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

export type AuditType =
  | "code"
  | "machine"
  | "data"
  | "hook"
  | "system"
  | "security"
  | "operator"
  | "library"
  | "memory";

export interface AuditChainRequest {
  type: AuditType;
  scope?: string;
  options?: Record<string, unknown>;
}

export interface BackendDescriptor {
  /** PascalCase engine class name in src/engines/ */
  engineClass: string;
  /** Default singleton export name (camelCase) */
  singleton: string;
  /** Method to invoke on the backend with (scope, options) */
  method: string;
  /** Human-friendly description for the audit-chain UI / docs */
  description: string;
}

export interface AuditChainResult {
  type: AuditType;
  scope: string | null;
  ok: boolean;
  backend: string;
  /** Whatever the backend returns; opaque to the chain */
  data?: unknown;
  /** When ok=false, why */
  error?: string;
  /** Wall time in ms (chain layer, not backend internals) */
  durationMs: number;
  ts: string;
}

// ============================================================================
// ROUTING TABLE — single source of truth, exported for tests
// ============================================================================

export const AUDIT_BACKEND_TABLE: Record<AuditType, BackendDescriptor> = {
  code: {
    engineClass: "AuditEngine",
    singleton: "auditEngine",
    method: "auditCode",
    description: "Generic code-quality audit (unwired engine, file errors, dead refs)",
  },
  machine: {
    engineClass: "MachineAuditEngine",
    singleton: "machineAuditEngine",
    method: "audit",
    description: "Per-machine config + tooling + post-processor sanity",
  },
  data: {
    engineClass: "MachineDataAuditEngine",
    singleton: "machineDataAuditEngine",
    method: "audit",
    description: "Machine telemetry / sensor data integrity",
  },
  hook: {
    engineClass: "AuditManagerEngine",
    singleton: "auditManagerEngine",
    method: "auditHooks",
    description: "Hook timeouts, error rates, fired-but-skipped",
  },
  system: {
    engineClass: "AuditManagerEngine",
    singleton: "auditManagerEngine",
    method: "auditSystem",
    description: "Cross-cutting system audit (composes other audits)",
  },
  security: {
    engineClass: "AuditManagerEngine",
    singleton: "auditManagerEngine",
    method: "auditSecurity",
    description: "Settings.json, MCP, hooks, CLAUDE.md leakage detection",
  },
  operator: {
    engineClass: "OperatorActionAuditTrailEngine",
    singleton: "operatorActionAuditTrailEngine",
    method: "audit",
    description: "Shop floor operator action trail (undo/override/halt history)",
  },
  library: {
    engineClass: "PPAGIProgramLibraryAuditorEngine",
    singleton: "ppagiProgramLibraryAuditorEngine",
    method: "audit",
    description: "Program library integrity (G-code archive, tribal tip linkage)",
  },
  memory: {
    engineClass: "CSMMemoryDBAuditEngine",
    singleton: "csmMemoryDBAuditEngine",
    method: "audit",
    description: "Cross-session memory DB consistency check",
  },
};

const VALID_TYPES: AuditType[] = Object.keys(AUDIT_BACKEND_TABLE) as AuditType[];

// ============================================================================
// PURE LOGIC (exported for tests)
// ============================================================================

/**
 * Normalise a free-form audit type string to the canonical enum.
 * Accepts case-insensitive input and a few common aliases.
 */
export function normalizeType(input: unknown): AuditType | null {
  if (typeof input !== "string") return null;
  const lower = input.trim().toLowerCase();
  if (lower.length === 0) return null;

  // Direct match
  if (VALID_TYPES.includes(lower as AuditType)) return lower as AuditType;

  // Alias map for common synonyms
  const aliases: Record<string, AuditType> = {
    src: "code",
    source: "code",
    cnc: "machine",
    sensor: "data",
    telemetry: "data",
    hooks: "hook",
    hard: "system",
    sec: "security",
    op: "operator",
    operations: "operator",
    programs: "library",
    db: "memory",
    cache: "memory",
  };
  return aliases[lower] ?? null;
}

/**
 * Select the backend descriptor for a normalised audit type.
 * Throws if type isn't in the routing table — caller should normalise first.
 */
export function selectBackend(type: AuditType): BackendDescriptor {
  const desc = AUDIT_BACKEND_TABLE[type];
  if (!desc) {
    throw new Error(`AuditChainEngine: no backend for type "${type}"`);
  }
  return desc;
}

/**
 * Validate an incoming audit chain request shape. Returns null on valid,
 * or a descriptive error string on invalid.
 */
export function validateRequest(req: unknown): string | null {
  if (!req || typeof req !== "object") return "request must be an object";
  const r = req as Record<string, unknown>;
  const norm = normalizeType(r.type);
  if (!norm) {
    return `unknown audit type "${r.type}". Valid: ${VALID_TYPES.join(", ")}`;
  }
  if (r.scope !== undefined && typeof r.scope !== "string") {
    return "scope must be a string when provided";
  }
  if (r.options !== undefined && (typeof r.options !== "object" || r.options === null || Array.isArray(r.options))) {
    return "options must be a plain object when provided";
  }
  return null;
}

/**
 * Merge several audit chain results (e.g. when type='system' fans out to
 * multiple backends) into a single envelope.
 */
export function mergeAuditResults(parts: AuditChainResult[]): AuditChainResult {
  if (!Array.isArray(parts) || parts.length === 0) {
    return {
      type: "system",
      scope: null,
      ok: true,
      backend: "merge:empty",
      data: { parts: [] },
      durationMs: 0,
      ts: new Date().toISOString(),
    };
  }
  const allOk = parts.every((p) => p.ok);
  const errors = parts.filter((p) => !p.ok).map((p) => p.error).filter(Boolean);
  return {
    type: parts[0].type,
    scope: parts[0].scope,
    ok: allOk,
    backend: parts.map((p) => p.backend).join(","),
    data: { parts: parts.map((p) => ({ backend: p.backend, ok: p.ok, data: p.data, error: p.error })) },
    error: allOk ? undefined : errors.join("; "),
    durationMs: parts.reduce((s, p) => s + p.durationMs, 0),
    ts: parts[parts.length - 1].ts,
  };
}

// ============================================================================
// I/O LAYER — async dispatch
// ============================================================================

/** Zod schema for the dispatcher action input */
export const auditChainInputSchema = z.object({
  type: z.string().min(1, "audit type is required"),
  scope: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export class AuditChainEngine {
  async run(req: AuditChainRequest): Promise<AuditChainResult> {
    const start = Date.now();
    const err = validateRequest(req);
    if (err) {
      return {
        type: (normalizeType(req?.type) ?? "code"),
        scope: typeof req?.scope === "string" ? req.scope : null,
        ok: false,
        backend: "validation",
        error: err,
        durationMs: Date.now() - start,
        ts: new Date().toISOString(),
      };
    }
    const type = normalizeType(req.type)!;
    const backend = selectBackend(type);
    try {
      // Lazy import keeps the chain engine cheap to load (no transitive eager
      // pull of every audit backend). The catch handles backends that don't
      // exist yet on this branch.
      const mod: any = await import(`./${backend.engineClass}.js`);
      const inst = mod[backend.singleton] ?? mod.default ?? null;
      if (!inst || typeof (inst as any)[backend.method] !== "function") {
        return {
          type,
          scope: req.scope ?? null,
          ok: false,
          backend: backend.engineClass,
          error: `backend ${backend.engineClass}.${backend.method} not callable`,
          durationMs: Date.now() - start,
          ts: new Date().toISOString(),
        };
      }
      const data = await (inst as any)[backend.method](req.scope, req.options ?? {});
      return {
        type,
        scope: req.scope ?? null,
        ok: true,
        backend: backend.engineClass,
        data,
        durationMs: Date.now() - start,
        ts: new Date().toISOString(),
      };
    } catch (e) {
      return {
        type,
        scope: req.scope ?? null,
        ok: false,
        backend: backend.engineClass,
        error: (e as Error).message,
        durationMs: Date.now() - start,
        ts: new Date().toISOString(),
      };
    }
  }
}

export const auditChainEngine = new AuditChainEngine();
