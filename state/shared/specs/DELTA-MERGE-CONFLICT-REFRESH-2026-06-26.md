<!--
  Refreshed merge-conflict assessment for U-MERGE-SLOT-DELTA, computed read-only (git merge-base +
  diff intersection, no working-tree touch) on 2026-06-26 by slot:delta. Updates the 16-day-stale
  DELTA-P1-MERGE-PLAYBOOK-2026-06-10.md (19 conflicts) with the CURRENT state (22). De-risks the
  operator-gated merge window. NOT the merge itself (operator-only, fleet-quiet window required).
-->

# U-MERGE-SLOT-DELTA — conflict refresh (2026-06-26)

**Method:** read-only `git merge-base cad-fusion-live-ms0 slot/delta` (= `aa58c8f3eb`) then the intersection of files changed on each side since. No working-tree/merge performed (fully reversible reconnaissance).

## Current state vs the 2026-06-10 playbook
| metric | 2026-06-10 playbook | 2026-06-26 (now) | delta |
|---|---|---|---|
| slot/delta commits ahead | 410 | **432** | +22 |
| trunk commits ahead of base | (n/a) | **5368** | 16 days of fleet churn |
| files changed: trunk / slot | — | 17,218 / 3,974 | — |
| **conflict candidates** | 19 | **22** | **+3** |

**Verdict:** still tractable — the merge grew only modestly (19→22) despite 5,368 trunk commits, and the high-effort files are unchanged from the playbook. The playbook's resolution strategy still applies; this just refreshes the file set.

## The 22 conflict candidates, by resolution strategy
**A. Fleet-infra — UNION-merge (both sides appended; take both):**
- `.claude/settings.json` (hook wiring — careful union, the highest-risk infra file)
- `CLAUDE.md` · `.gitignore` · `knowledge/wiki/index.md` · `knowledge/wiki/log.md` (append-union)

**B. CAD galaxy docs — delta-owned, PREFER slot/delta (or union the newer content):**
- `mcp-server/src/engines/cad/CLAUDE.md` · `MEMORY.md` · `PATHS.md` · `TOOLBELT.md`
- `knowledge/wiki/architecture/cad-galaxy.md` · `.claude/hooks/delta-cad-awareness-inject.mjs`

**C. CAD dispatcher — HIGHEST-EFFORT union (both sides added actions; keep ALL z.enum entries + cases from both):**
- `mcp-server/src/tools/dispatchers/cadDispatcher.ts`

**D. Cross-domain — NOT delta's; coordinate / prefer trunk (these moved on trunk under other slots):**
- `mcp-server/src/engines/MultiModelConsensusEngine.ts` + `MultiModelConsensus.test.ts` (octopus/hermes — sierra/india)
- `mcp-server/src/engines/CreoIntegrationTestSuiteEngine.ts` · `CreoToolkitBridgeEngine.ts` (Creo — CAD-adjacent, verify both)
- `scripts/lib/graphsage-trainer.mjs` (india GNN) · `scripts/ollama-prism-bridge.mjs` + test (ollama infra)
- `mcp-server/data/state/HYPERMILL_SDK_APIS.json` (hypermill — kilo)
- `.claude/helpers/precompact-handoff.mjs` + `precompact-handoff-loop-state.test.mjs` (session continuity — fleet infra)

## Operator action
Schedule the merge in a **fleet-quiet window**: backup-branch trunk → `git merge --no-ff slot/delta` → resolve the 22 above (A union, B prefer-slot, C union-all-actions, D coordinate) → full `npm run build` + `npx vitest run` → commit. Unlocks the smooth-solid emitter + the deep dim-by-dim validator (`cad-analyze-step.mjs`) on trunk = the CAD-gen loop's T2/T3 accuracy test. Companion: `DELTA-P1-MERGE-PLAYBOOK-2026-06-10.md` (per-file detail), `CAD-COMPLETION-ROADMAP-2026-06-26.md`.
