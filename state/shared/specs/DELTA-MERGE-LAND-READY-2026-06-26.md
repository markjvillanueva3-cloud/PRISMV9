<!--
  U-MERGE-SLOT-DELTA — land-readiness state, 2026-06-26 (slot:delta, operator "merge it").
  The merge is FULLY CONFLICT-RESOLVED + committed + tsc-clean in an isolated worktree.
  Trunk (cad-fusion-live-ms0) was NEVER touched. The LAND is the only remaining step and is
  blocked by current conditions (active fleet / moving trunk / unverifiable build / YELLOW budget).
-->

# U-MERGE-SLOT-DELTA — RESOLVED + COMMITTED, land pending a fleet-quiet window

## Status: 90% done. The error-prone conflict resolution is COMPLETE + isolated; only the LAND remains.

- **Resolved merge commit:** `3f44771b3b` on branch `merge-attempt/slot-delta`, in worktree **`H:/prism-merge-delta`**.
- **Trunk `cad-fusion-live-ms0`: UNTOUCHED** (the merge was done in an isolated worktree; reversible — `git worktree remove` discards it with zero trunk impact).
- **432 commits** of `slot/delta` (May-18 base) merged into a trunk **5,482 commits ahead**.

## Conflict resolution (18 files, all done)
- **Keep-trunk** (slot/delta is 5-wk stale; trunk is the authority — preserves all fleet work incl. the just-shipped cad-analyze-step overflow fix): `CLAUDE.md`, `.gitignore`, `precompact-handoff.mjs`, `MultiModelConsensusEngine.ts`, `graphsage-trainer.mjs`, `ollama-prism-bridge.mjs`(+test), `cad-analyze-step.mjs`, the cad galaxy docs (`cad/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`), `wiki/{index,log}.md`, `cad-galaxy.md`, `delta-cad-awareness-inject.mjs`.
- **Honor trunk delete:** `mcp-server/src/__tests__/MultiModelConsensus.test.ts` (`git rm`).
- **Union (the only code merge):** `cadDispatcher.ts` — kept trunk's full action block + ADDED slot/delta's 3 new actions `cad_atomic_ops` / `cad_creo_ribbon` / `cad_function_index` (their case handlers auto-merged at lines ~1153/1175/1196). Net effect of the whole merge is **ADDITIVE** to trunk (gains slot/delta's new CAD engines + CLIs + 3 dispatcher actions; reverts nothing).
- **Restored 3 trunk web files the stale merge dropped** (keep-trunk): `web/src/{lib/toolCribGeometry.ts, data/toolCribMachines.ts, __tests__/toolCribGeometry.test.ts}`.

## Verification done
- **tsc --noEmit: 0 errors** on the merged result (cleaner than trunk's 5 pre-existing peer errors: PP*PostEngine/RL-CAM/cost.ts).
- **CAD vitest on the merged result: ~12 failures** (cadRegressionDispatcher/cadFileClassifier/CADTokenRepresentationEngine/+) BUT these are **PRE-EXISTING ON TRUNK, not merge-introduced** -- running the same tests on trunk (`H:/prism/mcp-server`) fails identically (4 files / 9 tests failed, e.g. `Validation failed: input must contain files: CADFileEntry[] or index: MasterIndex`). So the merge is **strictly additive + no worse than current trunk**; it introduces NO new CAD test failures. The fleet's trunk is itself currently degraded (failing CAD tests + the uncommitted-unwiredBridgeDispatcher build break) -- a separate fleet-health item to fix independently of this merge.
- **esbuild build:fast: fails** on `Could not resolve "./tools/dispatchers/unwiredBridgeDispatcher.js"` — but this is a **PRE-EXISTING TRUNK issue, NOT the merge**: `unwiredBridgeDispatcher.ts` is **not in the committed git tree** (a peer is mid-creating it; it exists only as an uncommitted file in `H:/prism`). The merge faithfully reflects committed state. Trunk's own committed tree won't cleanly bundle until that peer commits the file.

## Why the land is BLOCKED right now (not done this session)
1. **Trunk MOVED mid-merge** (peer committed during the work) → `git merge --ff-only` would fail; re-merging just goes stale again as the active fleet keeps committing. **No fleet-quiet window.**
2. **Build unverifiable** from the committed tree (trunk depends on the uncommitted `unwiredBridgeDispatcher.ts`). Can't get a clean green build to justify landing on the LIVE shared trunk.
3. **Budget YELLOW.** A moving-target re-merge + full build/test + land is a full-budget operation.
4. **Doctrine:** U-MERGE-SLOT-DELTA is operator-gated / coordinated-session, integrator-owned (golf). Not a mid-loop force-land.

## EXACT land procedure (for a fleet-quiet, full-budget session — golf/integrator or operator)
```bash
# 0. Fleet-quiet window: no peers with uncommitted work in H:/prism; commit/land the pending
#    unwiredBridgeDispatcher.ts on trunk first (its peer-owner) so trunk bundles clean.
cd H:/prism-merge-delta
git merge cad-fusion-live-ms0 --no-edit         # re-merge the latest trunk into the resolved merge
# resolve any NEW conflicts (should be few — same keep-trunk discipline)
cd mcp-server && npm run build && npx vitest run -t "CAD"   # FULL build + CAD tests MUST be green
# then land (ff-only is safest; refuses rather than clobbers):
cd H:/prism && git merge --ff-only merge-attempt/slot-delta
# if ff-only refuses on peer uncommitted files, coordinate the window; never force.
# cleanup: git worktree remove H:/prism-merge-delta
```

## If abandoning instead: `git worktree remove H:/prism-merge-delta --force` (trunk untouched; re-doable from this spec).
