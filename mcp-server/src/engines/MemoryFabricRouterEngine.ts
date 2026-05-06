/**
 * MemoryFabricRouterEngine — INTEL-OLLAMA-OBSIDIAN-MS0/P10-U04
 *
 * Single-entry router for the 12+ memory engines living in src/engines/.
 * Same shape as AuditChainEngine (P10-U03) and ValidationOrchestratorEngine
 * (P10-U02): canonical intent enum + alias map + backend descriptor table +
 * uniform result envelope.
 *
 * Surfaced via the unified `prism_memory:*` surface (existing actions
 * remain wired to their specialised engines; this router gives callers a
 * single intent-driven entry).
 *
 * Pure-function exports for tests:
 *   - normalizeIntent(input)        → MemoryIntent | null
 *   - selectBackend(intent)         → BackendDescriptor
 *   - validateRequest(req)          → null | string error
 *   - mergeMemoryResults(parts)     → MemoryFabricResult
 *   - shouldRouteToVectorStore(intent) → boolean (helper)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P10-U04
 */

import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

export type MemoryIntent =
  | "store"           // write to durable storage (PersistentMemory)
  | "recall"          // read by id or fast cache lookup
  | "consolidate"     // post-session consolidation pass (MemoryConsolidationEngine)
  | "semantic_search" // vector search (QdrantMemoryEngine)
  | "persist"         // sync conversational/working memory to durable
  | "sync"            // cross-session reconciliation (CrossSessionMemoryBridge)
  | "graph"           // graph-walk traversal (MemoryGraphEngine)
  | "pressure"        // budget / OOM probe (MemoryPressureMonitorEngine)
  | "obsidian"        // Obsidian vault read/write (ObsidianMemoryRagEngine)
  | "program"         // program-history memory (ProgramMemoryEngine)
  | "agent"           // multi-agent fabric (AgentMemoryFabricEngine)
  | "audit";          // memory DB integrity (CSMMemoryDBAuditEngine)

export interface MemoryRequest {
  intent: MemoryIntent;
  /** Free-form payload understood by the routed backend */
  payload?: Record<string, unknown> | string;
  options?: Record<string, unknown>;
}

export interface BackendDescriptor {
  engineClass: string;
  singleton: string;
  method: string;
  description: string;
  /** Whether this backend hits the vector store (Qdrant) */
  isVector: boolean;
}

export interface MemoryFabricResult {
  intent: MemoryIntent;
  ok: boolean;
  backend: string;
  data?: unknown;
  error?: string;
  durationMs: number;
  ts: string;
}

// ============================================================================
// ROUTING TABLE
// ============================================================================

export const MEMORY_BACKEND_TABLE: Record<MemoryIntent, BackendDescriptor> = {
  store: {
    engineClass: "PersistentMemoryEngine",
    singleton: "persistentMemoryEngine",
    method: "store",
    description: "Durable JSONL-backed key/value/payload write",
    isVector: false,
  },
  recall: {
    engineClass: "ConsensusRecallCacheEngine",
    singleton: "consensusRecallCacheEngine",
    method: "recall",
    description: "Fast in-memory cache + multi-source consensus recall",
    isVector: false,
  },
  consolidate: {
    engineClass: "MemoryConsolidationEngine",
    singleton: "memoryConsolidationEngine",
    method: "consolidate",
    description: "Post-session consolidation: dedup + cluster + age-out",
    isVector: false,
  },
  semantic_search: {
    engineClass: "QdrantMemoryEngine",
    singleton: "qdrantMemoryEngine",
    method: "search",
    description: "Vector kNN search across kind-collections (768-dim nomic)",
    isVector: true,
  },
  persist: {
    engineClass: "ConversationalMemoryEngine",
    singleton: "conversationalMemoryEngine",
    method: "persist",
    description: "Flush working/conversational memory to durable storage",
    isVector: false,
  },
  sync: {
    engineClass: "CrossSessionMemoryBridgeEngine",
    singleton: "crossSessionMemoryBridgeEngine",
    method: "sync",
    description: "Reconcile memory across sessions / agents / PCs",
    isVector: false,
  },
  graph: {
    engineClass: "MemoryGraphEngine",
    singleton: "memoryGraphEngine",
    method: "walk",
    description: "Graph-walk traversal (concept ↔ document ↔ tip edges)",
    isVector: false,
  },
  pressure: {
    engineClass: "MemoryPressureMonitorEngine",
    singleton: "memoryPressureMonitorEngine",
    method: "probe",
    description: "Memory budget probe + pressure classification",
    isVector: false,
  },
  obsidian: {
    engineClass: "ObsidianMemoryRagEngine",
    singleton: "obsidianMemoryRagEngine",
    method: "query",
    description: "Obsidian vault RAG (markdown read + frontmatter aware)",
    isVector: true,
  },
  program: {
    engineClass: "ProgramMemoryEngine",
    singleton: "programMemoryEngine",
    method: "lookup",
    description: "Past CNC programs + outcomes (G-code archive memory)",
    isVector: true,
  },
  agent: {
    engineClass: "AgentMemoryFabricEngine",
    singleton: "agentMemoryFabricEngine",
    method: "fetch",
    description: "Multi-agent shared fabric (per-agent + cross-agent rows)",
    isVector: false,
  },
  audit: {
    engineClass: "CSMMemoryDBAuditEngine",
    singleton: "csmMemoryDBAuditEngine",
    method: "audit",
    description: "Memory DB integrity check (orphan rows, broken refs)",
    isVector: false,
  },
};

const VALID_INTENTS: MemoryIntent[] = Object.keys(MEMORY_BACKEND_TABLE) as MemoryIntent[];

// ============================================================================
// PURE LOGIC (exported for tests)
// ============================================================================

export function normalizeIntent(input: unknown): MemoryIntent | null {
  if (typeof input !== "string") return null;
  const lower = input.trim().toLowerCase().replace(/-/g, "_");
  if (lower.length === 0) return null;
  if (VALID_INTENTS.includes(lower as MemoryIntent)) return lower as MemoryIntent;

  const aliases: Record<string, MemoryIntent> = {
    write: "store",
    save: "store",
    remember: "store",
    read: "recall",
    get: "recall",
    fetch: "recall",
    search: "semantic_search",
    semantic: "semantic_search",
    knn: "semantic_search",
    vector: "semantic_search",
    flush: "persist",
    save_session: "persist",
    sync_sessions: "sync",
    bridge: "sync",
    walk: "graph",
    traverse: "graph",
    budget: "pressure",
    oom: "pressure",
    vault: "obsidian",
    rag: "obsidian",
    history: "program",
    programs: "program",
    fabric: "agent",
    agents: "agent",
    integrity: "audit",
  };
  return aliases[lower] ?? null;
}

export function selectBackend(intent: MemoryIntent): BackendDescriptor {
  const desc = MEMORY_BACKEND_TABLE[intent];
  if (!desc) {
    throw new Error(`MemoryFabricRouterEngine: no backend for intent "${intent}"`);
  }
  return desc;
}

export function validateRequest(req: unknown): string | null {
  if (!req || typeof req !== "object") return "request must be an object";
  const r = req as Record<string, unknown>;
  const norm = normalizeIntent(r.intent);
  if (!norm) {
    return `unknown memory intent "${r.intent}". Valid: ${VALID_INTENTS.join(", ")}`;
  }
  if (r.payload !== undefined) {
    const okShape = typeof r.payload === "string"
      || (typeof r.payload === "object" && r.payload !== null && !Array.isArray(r.payload));
    if (!okShape) return "payload must be a string or plain object when provided";
  }
  if (r.options !== undefined && (typeof r.options !== "object" || r.options === null || Array.isArray(r.options))) {
    return "options must be a plain object when provided";
  }
  return null;
}

export function mergeMemoryResults(parts: MemoryFabricResult[]): MemoryFabricResult {
  if (!Array.isArray(parts) || parts.length === 0) {
    return {
      intent: "store",
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
    intent: parts[0].intent,
    ok: allOk,
    backend: parts.map((p) => p.backend).join(","),
    data: { parts: parts.map((p) => ({ backend: p.backend, ok: p.ok, data: p.data, error: p.error })) },
    error: allOk ? undefined : errors.join("; "),
    durationMs: parts.reduce((s, p) => s + p.durationMs, 0),
    ts: parts[parts.length - 1].ts,
  };
}

/**
 * True when the intent's backend hits the Qdrant vector store. Useful for
 * caller alerts (e.g. degrade gracefully when Ollama embedder is offline).
 */
export function shouldRouteToVectorStore(intent: MemoryIntent | null | undefined): boolean {
  if (!intent) return false;
  const desc = MEMORY_BACKEND_TABLE[intent];
  return Boolean(desc?.isVector);
}

// ============================================================================
// I/O LAYER
// ============================================================================

export const memoryFabricInputSchema = z.object({
  intent: z.string().min(1, "memory intent is required"),
  payload: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export class MemoryFabricRouterEngine {
  async run(req: MemoryRequest): Promise<MemoryFabricResult> {
    const start = Date.now();
    const err = validateRequest(req);
    if (err) {
      return {
        intent: (normalizeIntent(req?.intent) ?? "store"),
        ok: false,
        backend: "validation",
        error: err,
        durationMs: Date.now() - start,
        ts: new Date().toISOString(),
      };
    }
    const intent = normalizeIntent(req.intent)!;
    const backend = selectBackend(intent);
    try {
      const mod: any = await import(`./${backend.engineClass}.js`);
      const inst = mod[backend.singleton] ?? mod.default ?? null;
      if (!inst || typeof (inst as any)[backend.method] !== "function") {
        return {
          intent,
          ok: false,
          backend: backend.engineClass,
          error: `backend ${backend.engineClass}.${backend.method} not callable`,
          durationMs: Date.now() - start,
          ts: new Date().toISOString(),
        };
      }
      const data = await (inst as any)[backend.method](req.payload, req.options ?? {});
      return {
        intent,
        ok: true,
        backend: backend.engineClass,
        data,
        durationMs: Date.now() - start,
        ts: new Date().toISOString(),
      };
    } catch (e) {
      return {
        intent,
        ok: false,
        backend: backend.engineClass,
        error: (e as Error).message,
        durationMs: Date.now() - start,
        ts: new Date().toISOString(),
      };
    }
  }
}

export const memoryFabricRouterEngine = new MemoryFabricRouterEngine();
