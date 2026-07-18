/**
 * sessionNodeNearAction.ts -- the `prism_session:node_near` action body, extracted
 * for dep-injected testing (mirrors sessionNodeCardAction.ts).
 *
 * Native MCP surface for semantic nearest-neighbor node search (SYSTEM-VIZ /
 * U-VIZ-NEAR, slot:sierra). It delegates to the single-source CLI
 * (`scripts/system-viz-query.mjs near <id> --k <k> --json`) which streams the 768d
 * embedding pool -- so there is NO fork of the search logic and NO 884MB graph load.
 * The CLI emits `{ id, k, total, neighbors:[{id,score,label,layer,kind}] }`; this
 * normalizes that and reports it. Pure given its injected `runCli` dep (the
 * dispatcher case supplies the real execFileSync-backed runner -- argv array, no
 * shell; tests supply a spy).
 */

export interface NodeNearCliDeps {
  /** Run the near CLI for the given id + k and return its raw `--json` stdout. */
  runCli: (id: string, k: number) => string;
}

export interface NodeNearActionResult {
  success: boolean;
  id?: string;
  k?: number;
  total?: number;
  neighbors?: unknown[];
  error?: string;
}

/** Default + max neighbors (k). The max is a caller-side guard on a pathological k. */
export const DEFAULT_NEAR_K = 10;
export const MAX_NEAR_K = 100;

/**
 * Resolve params.id (string, required; aliases node/nodeId) + params.k (optional
 * positive int, default 10, capped at MAX_NEAR_K). Returns { id, k } with id=null
 * when no usable id was given.
 */
export function normalizeNearParams(params: Record<string, unknown>): { id: string | null; k: number } {
  const rawId = params.id ?? params.nodeId ?? params.node;
  const id = typeof rawId === "string" && rawId.trim() ? rawId.trim() : null;
  let k = DEFAULT_NEAR_K;
  const rawK = params.k;
  const n = typeof rawK === "number" ? rawK : (typeof rawK === "string" ? parseInt(rawK, 10) : NaN);
  if (Number.isFinite(n) && n > 0) k = Math.min(Math.floor(n), MAX_NEAR_K);
  return { id, k };
}

/**
 * Run the node_near action: resolve id+k -> semantic-search via the injected CLI
 * runner -> normalize the CLI's `{id,k,total,neighbors}` shape. Fail-soft: every
 * failure (no id, runner throw incl. ENOEMBED, non-JSON output) returns a
 * `{ success: false, error }` result rather than throwing, so the dispatcher never
 * 500s on a token-cheap read.
 */
export function runNodeNearAction(
  params: Record<string, unknown>,
  deps: NodeNearCliDeps,
): NodeNearActionResult {
  const { id, k } = normalizeNearParams(params);
  if (!id) {
    return { success: false, error: "node_near requires params.id (string)" };
  }
  let out: string;
  try {
    out = deps.runCli(id, k);
  } catch (e) {
    return { success: false, error: `node_near search failed: ${String((e as { message?: unknown })?.message ?? e).slice(0, 300)}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(out);
  } catch {
    return { success: false, error: `node_near: CLI returned non-JSON output (${out.slice(0, 120)})` };
  }
  const obj = parsed as { id?: unknown; k?: unknown; total?: unknown; neighbors?: unknown };
  if (!obj || !Array.isArray(obj.neighbors)) {
    return { success: false, error: "node_near: CLI output missing neighbors[]" };
  }
  return {
    success: true,
    id: typeof obj.id === "string" ? obj.id : id,
    k: typeof obj.k === "number" ? obj.k : k,
    total: typeof obj.total === "number" ? obj.total : undefined,
    neighbors: obj.neighbors,
  };
}
