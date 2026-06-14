> **✅ CLOSED 2026-06-02 (slot:alpha).** part(1) DONE commit `fa86095251` (Galaxy Federation now in awareness-snapshot-inject `compact()` DEFAULT summary mode; functional has-federation:true). part(2) (663MB graph RangeError) was ALREADY fixed by `U-GCF-AWARENESS-FAILSOFT` 2026-06-01 (architecture-graph.json fallback; AWARENESS-SNAPSHOT.md now fresh). Both halves resolved.

# PATCH-SIBLING — surface the federation in the awareness SUMMARY inject + fix awareness-broken-on-big-graph

**From:** slot alpha (GALAXY-CONTEXT-FEDERATION-MS0 synergy audit) · **For:** golf (hooks-lane) + sierra (system-viz graph) · **Date:** 2026-06-01

## Context
Alpha wired the galaxy federation into the awareness GENERATOR (`scripts/awareness-snapshot.mjs`, committed U-GCF-WIKI-AWARENESS-WIRE): it now reads `MASTER-DIGEST.json` + `KNOWS-MAP.json` fail-soft and renders a `## Galaxy Federation` section (verified: galaxyCount 34, knowsTokens 767, top-5 by salience). That closes the audited surface (`AWARENESS-SNAPSHOT.md` + `/awareness-snapshot` + the hook's `pointer` inject mode). Two things are OUT of alpha's lane:

## (1) golf / hooks-lane — surface the federation in the DEFAULT `summary` inject mode
`.claude/hooks/awareness-snapshot-inject.mjs` `compact()` uses a fixed `findSection()` whitelist; a new `## Galaxy Federation` heading appears in the full `.md` + `pointer` mode but NOT in the default `summary` mode until the hook lists the heading. Minimal tweak inside `compact(md)`:
```js
const federation = findSection("Galaxy Federation (hub-and-spoke context roll-up)").filter((l) => l.trim().startsWith("-"));
// …push a ≤3-line federation block (galaxyCount + digest pointer + knows-map command) before the closing `_Full report:` line.
```
`.claude/hooks/` is harness-blocked from alpha — apply via a `/checkin-golf` chat (or whoever owns the inject hook).

## (2) sierra / system-viz graph — awareness is BROKEN on the 663 MB graph (R12, P1)
**`scripts/awareness-snapshot.mjs` `safeJson()` does `JSON.parse(readFileSync(system-graph.json,"utf8"))` — the graph is now 663 MB > V8's 536 MB (`0x1fffffe8`) string limit → `RangeError` → `graph=null` → `buildSnapshot` bails at the graph guard.** `AWARENESS-SNAPSHOT.md` is **8 days stale (mtime 2026-05-24)** — the entire PRISM-awareness surface (the SessionStart warmup banner) has been silently frozen fleet-wide since the graph crossed the limit. The federation section (and everything after the graph guard) never renders.
- **Fix (sierra's domain):** make the graph read streaming/bounded — e.g. `stream-json`, a targeted node/edge extractor, or read the smaller `architecture-graph.json` (the ~20K-node generate-system-viz product) for the utilization counts. Until then awareness is degraded regardless of the federation wiring.
- **Verify:** `node -e "require('fs').readFileSync('state/shared/system-viz/system-graph.json','utf8')"` throws RangeError today; `node scripts/awareness-snapshot.mjs` then writes an `{error}` snapshot, not a full one.

## Honest status
Federation→awareness GENERATOR wiring: shipped + derive-verified. It renders the moment sierra makes the graph-read survive 663 MB. The summary-inject visibility needs golf's hook tweak. Neither is alpha-lane.
