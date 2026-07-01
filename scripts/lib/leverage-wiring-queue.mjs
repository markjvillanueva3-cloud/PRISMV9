/**
 * leverage-wiring-queue.mjs — pure core for the leverage-ranked wiring queue (slot:sierra, U-VIZ-LEVERAGE-QUEUE 2026-05-29).
 *
 * The highest-leverage system-viz move: rank unwired engine-domains by graph-computed
 * leverage so the fleet wires the highest-impact-per-wire targets FIRST, instead of
 * treating the unwired backlog as flat. Source = architecture-graph.json L5 eng.<domain>
 * nodes, which already carry `unwired`, `coverage_pct`, `suggestedDispatchers`, and
 * `unlocks:{engines,dispatchersGain,downstreamHops,leverageScore}`. OOM-safe (51MB graph,
 * not the 548MB merged graph). Domain-granularity (per-engine needs the merged graph).
 *
 * Pure + deterministic: extractWiringQueue(graph) -> ranked rows. No file IO, no Date.now.
 *
 * Prior art (NOT superseded): scripts/unwired-bridge-rank.mjs ranks unwired engines at
 * PER-ENGINE granularity via a ripgrep fan-in proxy (avoids the graph for OOM reasons). This
 * lib is the complementary DOMAIN-granularity surface reading the graph's pre-computed
 * unlocks.leverageScore. The two "leverage" numbers (fan-in count vs unwired×dg×hops) are
 * different metrics — neither supersedes the other.
 */

/**
 * @param {{nodes?: any[]}} graph parsed architecture-graph.json (or any graph-shaped object)
 * @returns {Array<{domain,id,unwired,coverage_pct,leverageScore,downstreamHops,dispatchersGain,suggestedDispatchers,needsDispatcherInference,scoreSource}>}
 */
export function extractWiringQueue(graph) {
  const nodes = graph && Array.isArray(graph.nodes) ? graph.nodes : [];
  const rows = [];
  for (const n of nodes) {
    if (!n || typeof n.id !== "string" || !n.id.startsWith("eng.")) continue;
    const unwired = Number(n.unwired);
    if (!Number.isFinite(unwired) || unwired <= 0) continue; // only real wiring debt
    const u = n.unlocks && typeof n.unlocks === "object" ? n.unlocks : {};
    const dispatchersGain = Number.isFinite(Number(u.dispatchersGain)) ? Number(u.dispatchersGain) : null;
    const downstreamHops = Number.isFinite(Number(u.downstreamHops)) ? Number(u.downstreamHops) : null;
    let leverageScore = Number(u.leverageScore);
    let scoreSource = "graph";
    // A graph leverageScore of 0 is NOT "zero value" — it is emitted exactly when the graph
    // could not attribute a dispatcher (dispatchersGain:0 / empty suggestedDispatchers), i.e.
    // the needsDispatcherInference case. Treating it as a real score buries the single largest
    // wiring-debt bucket (MiscDomains, 69 engines = 58% of debt) at the bottom — the opposite
    // of the queue's purpose. So route both non-finite AND literal-0 to the derived fallback.
    if (!Number.isFinite(leverageScore) || leverageScore === 0) {
      // Fallback: derive from the components when the graph didn't pre-compute a usable score.
      // leverage ~ unwired count × dispatchers unlocked × downstream reach.
      const dg = dispatchersGain != null ? Math.max(1, dispatchersGain) : 1;
      const dh = downstreamHops != null ? Math.max(1, downstreamHops) : 1;
      leverageScore = unwired * dg * dh;
      scoreSource = "derived";
    }
    const disp = Array.isArray(n.suggestedDispatchers) ? n.suggestedDispatchers.filter((d) => typeof d === "string") : [];
    rows.push({
      domain: typeof n.domain === "string" && n.domain ? n.domain : n.id.replace(/^eng\./, ""),
      id: n.id,
      unwired,
      coverage_pct: Number.isFinite(Number(n.coverage_pct)) ? Number(n.coverage_pct) : null,
      leverageScore,
      downstreamHops,
      dispatchersGain,
      suggestedDispatchers: disp,
      needsDispatcherInference: disp.length === 0, // no suggested target -> needs GNN/sibling-prefix inference
      scoreSource,
    });
  }
  // Deterministic priority order: leverageScore desc, then unwired desc, then domain asc.
  rows.sort(
    (a, b) =>
      b.leverageScore - a.leverageScore ||
      b.unwired - a.unwired ||
      a.domain.localeCompare(b.domain),
  );
  return rows;
}

/** Total unwired engines represented across the queue (sum of per-domain unwired). */
export function queueTotals(rows) {
  const r = Array.isArray(rows) ? rows : [];
  return {
    domains: r.length,
    unwiredEngines: r.reduce((s, x) => s + (Number.isFinite(x.unwired) ? x.unwired : 0), 0),
    needInference: r.filter((x) => x.needsDispatcherInference).length,
  };
}
