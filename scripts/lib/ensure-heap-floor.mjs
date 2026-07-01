/**
 * ensure-heap-floor.mjs — guarantee a minimum V8 old-space heap for child spawns.
 *
 * THE BUG IT FIXES (2026-06-09, confirmed via a live MCP outage). The MCP server
 * OOMs on boot — `FATAL ERROR: Reached heap limit Allocation failed` — because it
 * loads 4000+ tribal tips + registries + graph during its ~40-50s cold boot, far
 * exceeding the **384MB** `--max-old-space-size` cap that `portable-node` sets
 * (PRISM_HOOK_HEAP_MB default, fleet commit-budgeting). A child spawn INHERITS
 * that cap via `process.env.NODE_OPTIONS`, so any MCP spawn launched from a capped
 * context (e.g. `singleton-service-guard --fix` run through the node shim) crashes
 * the server on boot. The supervisor (mcp-server-supervisor.mjs) already floored
 * its spawn heap to 4096MB; the daemon helper (mcp-server-daemon.mjs) did NOT —
 * the two spawn paths diverged. This shared floor unifies them (06-04 plan FIX-7).
 *
 * Proven: a manual boot with `--max-old-space-size=4096` brought :3100 up in ~3s
 * where the inherited-384 spawn OOMed.
 */

/**
 * Return a NODE_OPTIONS string guaranteeing AT LEAST `floorMb` of old-space heap,
 * preserving any other flags. Pure.
 *   - existing size >= floor  → return verbatim (respect a deliberately-larger heap).
 *   - existing size < floor   → strip the too-small `--max-old-space-size` and set floor.
 *   - no size set             → append `--max-old-space-size=floor`.
 *
 * @param {string} nodeOptions  current NODE_OPTIONS (e.g. process.env.NODE_OPTIONS)
 * @param {number} floorMb      minimum heap in MB (default 4096 — matches the supervisor)
 * @returns {string}
 */
export function ensureHeapFloor(nodeOptions = "", floorMb = 4096) {
  const cur = String(nodeOptions == null ? "" : nodeOptions);
  const floor = Number.isFinite(floorMb) && floorMb > 0 ? Math.floor(floorMb) : 4096;
  const m = cur.match(/--max-old-space-size=(\d+)/);
  const existing = m ? parseInt(m[1], 10) : 0;
  if (existing >= floor) return cur;
  const base = cur.replace(/--max-old-space-size=\d+/g, "").replace(/\s+/g, " ").trim();
  return (base ? base + " " : "") + `--max-old-space-size=${floor}`;
}
