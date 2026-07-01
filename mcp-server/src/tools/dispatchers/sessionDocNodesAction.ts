/**
 * sessionDocNodesAction.ts — the `prism_session:doc_nodes` action body, extracted
 * for dep-injected testing (mirrors sessionNodeCardAction.ts, the FORWARD sibling).
 *
 * Native MCP surface for the REVERSE cheap-node edge (CHEAP-NODE-ACCESS-MS0 ·
 * U-VBL-DISPATCHER, slot:sierra). Where `node_card` answers "graph node → its
 * vault docs", `doc_nodes` answers the inverse: given a vault doc (a wiki path
 * like `architecture/foo` / full `knowledge/wiki/…md`, OR a memory slug like
 * `feedback_psn_definition`), which live graph node(s) document it — so an agent
 * can then `node_card <id>` for the node's real status/wiring.
 *
 * It delegates to the single-source CLI (`scripts/system-viz-query.mjs doc-nodes
 * <key> --json`) which reads the inverted index `vault-backlinks.json` — NO fork
 * of the `.mjs` reader, NO 644MB graph load. The CLI emits the `backlinksFor`
 * result object verbatim; this wrapper normalizes it to a dispatcher result and
 * surfaces the staleness flag. Pure given its injected `runCli` dep (the
 * dispatcher case supplies the real execFileSync-backed runner — argv array, no
 * shell; tests supply a spy).
 */

export interface DocNodesCliDeps {
  /** Run the doc-nodes CLI for the given vault key and return its raw `--json` stdout. */
  runCli: (key: string) => string;
}

export interface DocNodesActionResult {
  success: boolean;
  /** The canonical key the CLI resolved the query to (normalized). */
  key?: string;
  /** Graph node ids that document the vault doc (capped at the index NODE_CAP). */
  nodeIds?: string[];
  /** Honest pre-cap total (≥ nodeIds.length when the doc is heavily referenced). */
  total?: number;
  /** True when nodeIds was capped (total > nodeIds.length). */
  truncated?: boolean;
  /** True when the index has drifted behind node-cards.jsonl (still served, flagged). */
  stale?: boolean;
  staleReason?: string | null;
  /** On a miss: basename-match suggestions (other keys the caller may have meant). */
  suggestions?: string[];
  error?: string;
}

/** The fields a caller may use to supply the vault doc key (first present wins). */
const KEY_ALIASES = ["doc", "query", "q", "key", "path", "slug"] as const;

/**
 * Resolve the vault doc key from any accepted alias, trimmed. Returns "" when none
 * is a usable non-empty string.
 */
export function resolveDocKey(params: Record<string, unknown>): string {
  for (const k of KEY_ALIASES) {
    const v = params[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * Run the doc_nodes action: resolve the vault key → seek backlinks via the injected
 * CLI runner → normalize the `backlinksFor` JSON shape into a dispatcher result.
 * Fail-soft: every failure (no key, runner throw, non-JSON, index unavailable)
 * returns `{ success: false, error }` rather than throwing, so the dispatcher never
 * 500s on a token-cheap reverse lookup. A genuine miss is `success:true` with an
 * empty nodeIds + suggestions (NOT an error — "no node documents this doc" is a
 * valid, useful answer).
 */
export function runDocNodesAction(
  params: Record<string, unknown>,
  deps: DocNodesCliDeps,
): DocNodesActionResult {
  const key = resolveDocKey(params);
  if (!key) {
    return { success: false, error: "doc_nodes requires params.doc (string) — a wiki path or memory slug (aliases: query/q/key/path/slug)" };
  }
  let out: string;
  try {
    out = deps.runCli(key);
  } catch (e) {
    return { success: false, error: `doc_nodes seek failed: ${String((e as { message?: unknown })?.message ?? e).slice(0, 300)}` };
  }
  let parsed: { found?: unknown; key?: unknown; nodeIds?: unknown; total?: unknown; truncated?: unknown; stale?: unknown; staleReason?: unknown; suggestions?: unknown; unavailable?: unknown; error?: unknown };
  try {
    parsed = JSON.parse(out);
  } catch {
    return { success: false, error: "doc_nodes: CLI did not return valid JSON" };
  }
  // The CLI surfaces an unavailable index (missing/torn) as { unavailable:true, error }.
  // That is a real fault (not a miss) → fail-soft error so the caller can distinguish
  // "index broken" from "no node documents this doc".
  if (parsed.unavailable) {
    return { success: false, error: `doc_nodes: ${typeof parsed.error === "string" ? parsed.error : "vault-backlinks index unavailable"}` };
  }
  const resolvedKey = typeof parsed.key === "string" ? parsed.key : key;
  const stale = parsed.stale === true;
  const staleReason = typeof parsed.staleReason === "string" ? parsed.staleReason : null;
  if (!parsed.found) {
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s): s is string => typeof s === "string")
      : [];
    return { success: true, key: resolvedKey, nodeIds: [], total: 0, truncated: false, stale, staleReason, suggestions };
  }
  const nodeIds = Array.isArray(parsed.nodeIds)
    ? parsed.nodeIds.filter((s): s is string => typeof s === "string")
    : [];
  const total = typeof parsed.total === "number" && Number.isFinite(parsed.total) ? parsed.total : nodeIds.length;
  return {
    success: true,
    key: resolvedKey,
    nodeIds,
    total,
    truncated: parsed.truncated === true || total > nodeIds.length,
    stale,
    staleReason,
  };
}
