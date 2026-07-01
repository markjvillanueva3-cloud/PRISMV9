---
title: PSN synergy collector — obsidian + tribal measurement blind-spots (MS2)
type: lesson
domain: dev-infra
created: 2026-06-02
by: claude-d5f2ac5e (slot:alpha)
tags: [psn, synergy, obsidian, tribal, measurement-bug, fail-loud]
---

# PSN synergy collector — obsidian + tribal blind-spots (MS2)

`scripts/psn-synergy-collect.mjs` is the production feeder that reads the 11 PSN legs from
disk and emits the live `PSNLegInventory[]` consumed by `PSNSynergyInspectorEngine`
(`prism_intelligence:psn_synergy_inspect`). The inspector is a *pure* function — it can only
be as correct as the inventory fed to it. Two feeder blind-spots made the synergy math lie.

## Bug 1 — the Obsidian node looked isolated but wasn't

The collector counted `obsidian_brain → {wiki, engines, memories}` only. It scored **zero**
edges to `tribal, system_viz, prism_ai, nn_gnn, prism_os, algorithms, formulas` even though
those bridges are live in production (memory→tribal capture, octopus→obsidian persistence,
memory→GNN node-embedding bridge, `obsidian_viz_*` into system-viz). So the inspector flagged
the Obsidian leg as the *most-isolated* node — a pure measurement artifact.

**Fix:** `scanObsidianOutEdges()` — a single bounded pass over memory-file heads tallying
real subsystem-mention patterns (same heuristic style as the MS1 system_viz/prism_os/prism_ai
expansion). Obsidian `coverage_pct` 40% → 100%, out-peers 3 → 10.

## Bug 2 — tribal leg counted 0 (wrong path + whole-file parse)

`collectTribalLeg()` read `mcp-server/data/state/tribal-embed-index.json` (nonexistent). The
real index is `state/shared/tribal-embed-index.json` (~530 MB, `{…, entries:[…]}`). It also
`JSON.parse`d the whole file (OOM risk) and counted `Object.keys` (≈5) instead of
`entries.length`.

**Fix:** candidate-path list + `countNeedleStreaming()` — a 1 MiB chunked scan of the
per-entry `"embedding":[` delimiter that never holds the blob in RAM (boundary-overlap of
`needle.length-1` chars catches split delimiters without double-counting). tribal node_count
0 → 33049; total PSN nodes 40556 → 73605.

## Lessons

1. **A pure meta-engine inherits its feeder's blind spots.** When a synergy/coverage metric
   says a node is isolated, suspect the *collector* before the architecture. (Mirror of the
   GNN `embeddingHitCount=0` bridge gap.)
2. **Never `JSON.parse` an embed index.** They reach hundreds of MB. Stream a per-entry
   delimiter; reuse the bounded-head pattern already in this file for `system-graph.json`.
3. **Don't inflate edges to look synergized (R12).** The first `formulas` pattern matched the
   english word "formula" (89k hits). Tightened to path/wiki refs — an *honest* small/zero
   edge beats a vanity metric; a real gap the inspector flags is a feature, not a bug.
4. **Density-band ≠ connectivity.** `under_wired` uses `refs/(count_a×count_b)`; at thousands-
   of-nodes scale everything sits below the 0.001 floor, so ROI bands are near-useless there.
   `coverage_pct` (does this leg touch its peers at all) is the trustworthy signal.

## Follow-on (PSN-SYNERGY-INSPECT-MS1, commits 1be4e99e06 + cdff2006ca)

5. **A scale-broken absolute threshold makes a metric lie in the OTHER direction.** The
   inspector's `under_wired_score` compared absolute `density = refs/(count_a·count_b)` to a
   fixed `densityFloor=0.001`. At thousands-of-nodes scale density is always ≪ 0.001, so
   *every* non-empty pair scored ~1 → P0, and adding real edges across this session NEVER
   reduced the P0 count (held at 37). Fix = the scale-invariant ranking the schema already
   documented: rank connected pairs by density quantile into [0,0.84]; reserve 1.0/P0 for
   genuinely zero-ref pairs only. Effect: p0 37→19, all zero-ref (actionable), with a real
   gradient. Lesson: an absolute numeric threshold on a scale-dependent quantity is a latent
   lie — prefer rank/quantile when the population scale varies.
6. **`import()` of a bare Windows absolute path silently fails.** `await import("H:/…")`
   throws `ERR_UNSUPPORTED_ESM_URL_SCHEME` (ESM reads `H:` as a URL scheme). When wrapped in
   `.catch(()=>null)` + a fallback, the fallback runs *every time* on Windows and you never
   notice. Always `pathToFileURL(absPath).href` for dynamic import of absolute paths. And
   never keep a second copy of an algorithm as a "zero-build fallback" — it drifts (R8);
   hard-fail instead.

## PSN-SYNERGY-COLLECT-MS3 + gap-audit (2026-06-03, slot:alpha)

The same blind-spot class, one rung deeper, plus the honest-measurement payoff.

7. **A multi-file leg's honest connectivity weight is per-file PRESENCE, not raw mention count.** The five remaining single-peer legs (algorithms/formulas/nn_gnn/prism_os/prism_ai) each hardcoded one `engines` edge. Recovering their real out-edges surfaced three *new* inflation modes raw counting hides: (a) overlapping regex alternatives double/triple-count one token (`state/shared/system-viz/system-graph.json` matches `system-viz` AND `system-graph`; `from "../engines/FooEngine"` matches the Engine-name twice + the `/engines/` path), (b) an auto-gen template line multiplied by file count, (c) a verbose file dominating. `countPatternsInFiles(..., {perFile:true})` — each file contributes ≤1 per peer — is immune to all three. Default stays raw so shipped callers are byte-unchanged.

8. **Graph-node MEMBERSHIP is an INBOUND edge, not outbound.** Every auto-gen formula/algorithm stub carries `- Live graph: state/shared/system-viz/system-graph.json` — the generator recording "this doc IS a node in the graph." Counting it as formulas→system_viz saturated the edge at file-count (the R12 vanity that FAILed the first commit). It's system-viz→formula, so strip it from the *outbound* tally → formulas→system_viz honestly drops to ~0 (formula docs don't conceptually reference the viz subsystem). An honest gap beats a vanity edge.

9. **A leg of `*Engine` files must not self-count its own class as an engines edge.** nn_gnn's files ARE engines, so the detector matched each file's own class declaration → ~18% self-inflation. `dropSelfName` strips the basename token before matching. nn_gnn→engines 82→67.

10. **The 3-of-3 gate earns its keep on YOUR OWN rationalizations.** Arm-A FAILed the first MS3 commit for exactly the vanity (#7/#8) the commit message *claimed* to have fixed — a defense I'd written in. Fix: implement the reviewers' deferred recommendations as subtractive follow-ups. Don't argue with a correct FAIL.

11. **Honest measurement is the prerequisite for bridge work, not a detour.** Once the metric stopped lying, a 6-axis Workflow enumerated the *real* gaps: 9 bridges (2 keystones — octopus `consensus_recall` flips the brain write-only→compounding; algorithms→nn_gnn/prism_ai citation collapses 3/4 real zero-ref pairs), 4 conflicts, 4 inefficiencies, **6 honest non-gaps** (pure-math primitives + the OS-routes-via-dispatchers layer genuinely don't cross-reference — building them = fabricated wiring). Spec: `state/shared/specs/PSN-SYNERGY-GAP-AUDIT-2026-06-03.md`. Bridge#7 (leg→ownerSlot) auto-routes a leg-health regression to its fixing slot.

12. **Shared-tree lane trap:** `git add <my-paths>` still commits whatever was ALREADY staged — a peer's pre-staged files get absorbed into your commit (attribution loss). `git reset -q` to clear the index BEFORE staging only your paths. (Caught one absorbing 5 of charlie's quoting files; undone via guarded `reset --soft`.)

Lineage: [[reference_psn_synergy_collect_ms0_2026_05_23]] · [[reference_psn_synergy_collect_ms3_2026_06_03]] · [[feedback_psn_definition]] · [[gnn-node-embedding-bridge]] · [[feedback_commit_to_slot_worktree]]
