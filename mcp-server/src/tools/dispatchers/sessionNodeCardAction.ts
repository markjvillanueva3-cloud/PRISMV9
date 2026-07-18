/**
 * sessionNodeCardAction.ts — the `prism_session:node_card` action body, extracted
 * for dep-injected testing (mirrors sessionHybridSearchAction.ts).
 *
 * Native MCP surface for the token-cheap node-card read-by-id
 * (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-DISPATCHER, slot:sierra). It delegates to
 * the single-source CLI (`scripts/system-viz-query.mjs node-card <ids> --json`)
 * which seeks the offset index — so there is NO fork of the `.mjs` reader and NO
 * 644MB graph load. The CLI emits a bare object for one id and an array for many;
 * this normalizes both. Pure given its injected `runCli` dep (the dispatcher case
 * supplies the real execFileSync-backed runner — argv array, no shell; tests
 * supply a spy).
 */

export interface NodeCardCliDeps {
  /** Run the node-card CLI for the given ids and return its raw `--json` stdout. */
  runCli: (ids: string[]) => string;
}

export interface NodeCardActionResult {
  success: boolean;
  cards?: unknown[];
  count?: number;
  misses?: string[];
  source?: string | null;
  error?: string;
}

/**
 * Upper bound on ids per call — a CALLER-SIDE cap that bounds a pathological
 * batch + the spawned CLI's argv length (the CLI/reader itself is unbounded).
 */
export const MAX_NODE_CARD_IDS = 50;

/**
 * Normalize `params.id` (string) / `params.ids` (string[]) into a clean, deduped,
 * order-preserving, bounded id list. Non-string entries are dropped; blanks
 * trimmed out.
 */
export function normalizeIds(params: Record<string, unknown>): string[] {
  const raw: unknown[] = Array.isArray(params.ids)
    ? params.ids
    : (params.id != null ? [params.id] : []);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const t = x.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_NODE_CARD_IDS) break;
  }
  return out;
}

/**
 * Run the node_card action: resolve ids → seek cards via the injected CLI runner
 * → normalize the bare-object / array CLI shapes → report cards + misses + source.
 * Fail-soft: every failure (no ids, runner throw, non-JSON output) returns a
 * `{ success: false, error }` result rather than throwing, so the dispatcher
 * never 500s on a token-cheap read.
 */
export function runNodeCardAction(
  params: Record<string, unknown>,
  deps: NodeCardCliDeps,
): NodeCardActionResult {
  const ids = normalizeIds(params);
  if (ids.length === 0) {
    return { success: false, error: "node_card requires params.id (string) or params.ids (string[])" };
  }
  let out: string;
  try {
    out = deps.runCli(ids);
  } catch (e) {
    return { success: false, error: `node_card seek failed: ${String((e as { message?: unknown })?.message ?? e).slice(0, 300)}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(out);
  } catch {
    return { success: false, error: "node_card: CLI did not return valid JSON" };
  }
  const rows: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
  const cards = rows
    .filter((r): r is { card: { id?: string } } => !!r && typeof r === "object" && "card" in r && !!(r as { card?: unknown }).card)
    .map((r) => r.card);
  const found = new Set(cards.map((c) => (c as { id?: string })?.id));
  const misses = ids.filter((id) => !found.has(id));
  const sourceRow = rows.find((r) => !!r && typeof r === "object" && "source" in r) as { source?: unknown } | undefined;
  const source = (typeof sourceRow?.source === "string" ? sourceRow.source : null);
  return { success: true, cards, count: cards.length, misses, source };
}
