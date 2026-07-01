# Pass 3 prompt template — KNOWLEDGE-ENRICH-MS0 verify + bugs/errors

You are Agent {N} of 5 doing Pass 3 verification + bugs/errors-to-avoid enrichment for PRISM roadmap units.

## TASK
Read `H:/prism/state/shared/dashboards/ke-pass3-resume-slice-{N}.json` — ~{COUNT} units. Each carries unitId, title, acceptanceCriteria, relatedSubsystems, Pass 1 evidence, **and Pass 2 evidence** (addArchWiki, addSeWiki, systemImpact, csDepth). Emit Pass 3 enrichment per unit. Write to `H:/prism/state/shared/dashboards/ke-pass3-resume-agent-{N}.json`.

## OUTPUT SCHEMA (object keyed by unitId)
```json
{
  "<MILESTONE>::<UNIT_ID>": {
    "verifiedWiki": [ "knowledge/wiki/architecture/..." ],
    "removedHallucinations": [ "path that did NOT exist on disk" ],
    "topRecommendation": "Read X first — covers Y.",
    "readingOrder": [ "path1", "path2", ... ],
    "csCoreGap": "<the SINGLE most important bug/error/issue to avoid OR empty string if none>"
  }
}
```

## METHOD per unit

1. **Verify wikis exist on disk.** For every path in Pass 1's `archWiki` + Pass 2's `addArchWiki`, use the Glob tool to confirm the file exists.
   - All paths that ARE on disk → `verifiedWiki` (deduplicated)
   - Paths that are NOT on disk → `removedHallucinations` (just the path string)
   - If Glob shows a CLOSE match (e.g., the directory exists but the leaf file doesn't), prefer the directory path or the dispatcher-level wiki in `verifiedWiki`.

2. **topRecommendation**: ONE sentence naming the FIRST wiki to read and why. Format: `"Read <path> first — <why>."` Pick the wiki most likely to prevent a regression on this specific unit. Use a real verifiedWiki path.

3. **readingOrder**: 3-6 verifiedWiki paths in the order a fresh chat should consume them (most-load-bearing first). Drop hallucinations. Empty array OK only if `verifiedWiki` is empty.

4. **csCoreGap**: The SINGLE highest-leverage bug/error/issue to avoid when shipping this unit. Examples:
   - "Concurrent writers to the JSON sidecar — use atomic tmp+rename + lockfile."
   - "Stale cache after schema bump — invalidate by including schemaVersion in the cache key."
   - "Voxel grid memory blow-up at high resolution — O(n³); cap or switch to sparse octree."
   - "Cycle in reasoning-chain DAG → unbounded recursion; visited-set + depth cap."
   - "" (empty string if there is no clear single gap)
   Be concrete; name the bug class. Never write generic advice ("test thoroughly"). Skip if the unit is documentation-only or close-out — empty string is correct.

## PRISM CONTEXT
PRISM = manufacturing intel: blueprint/CAD → physics-optimized CNC G-code. ~3274 engines, ~50 prism_* MCP dispatchers, ~600 hooks, 13-chat-slot fleet, state/shared/ JSON sidecars, knowledge/wiki/{architecture,software-engineering,...} + knowledge/memories/{feedback,reference}.

## OUTPUT
Single Write at end to `H:/prism/state/shared/dashboards/ke-pass3-resume-agent-{N}.json` (pretty, indent=1). Return <200-word summary: units processed, hallucination count, top csCoreGap classes you saw.

Work through every unit; do not skip. If both Pass 1 and Pass 2 wiki lists are empty (envelopeResolved=false unit), emit: verifiedWiki=[], removedHallucinations=[], topRecommendation="Resolve envelope first — unit has no milestone-envelope record.", readingOrder=[], csCoreGap="Unit has no envelope; treat as close-out audit candidate before building.".
