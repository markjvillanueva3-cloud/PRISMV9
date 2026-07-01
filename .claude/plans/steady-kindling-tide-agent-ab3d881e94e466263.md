# Plan-Scrutiny Arm D — Hostile Risk Review of `NN-GRAPH-MS0`

## Verdict

**SHIP-RISK: HIGH.** Confidence the plan ships by Sunday EOD without ≥ 1 forced scope cut: **~35%.** The plan is architecturally sound but operationally optimistic. Three load-bearing claims are unverified-or-false against current code; the risk register omits 6 plausible failure modes; and the 30h wall-clock estimate is missing peer-claim contention overhead. The hybrid-floor design IS the right insurance — the question is whether U4's quality gate honestly fails-open vs. half-ships.

## Findings

### P0 — RECURSIVE-SELF-IMPROVEMENT CLAIM IS PARTIALLY FALSE

The plan's load-bearing rhetorical claim (U7 final paragraph, ops note bullet 3, Verification step 11): "the new engines + scripts + docs ARE NEW NODES in `system-graph.json` … the system reasons about itself."

**Code reality** (`scripts/generate-system-viz.mjs` line 87): engine counts are scraped from `PRISM-INVENTORY-LATEST.md` regex (`Engines.*\d+`) and bucketed into named-domain L5 clusters. **There is no `.ts` walk that materializes a per-engine node.** The two new engines (Node2VecGraphEmbedderEngine + GraphSAGELinkPredictorEngine) will increment the engine count, possibly join an existing domain bucket, but will NOT appear as discrete `engine.Node2VecGraphEmbedderEngine` nodes the GNN can train against.

Per-file L12 nodes ARE materialized by `expand-system-viz-l12-files.mjs` — so the engine *files* appear as fs-nodes, but their semantic identity (class name → dispatcher predictions) is what the GNN needs, and that requires a different ingest path.

**Fix:** Add `U-NNG-RECURSIVE-INGEST` (or fold into U7) — pure-export `scripts/lib/engine-node-extractor.mjs` that walks `mcp-server/src/engines/*.ts`, emits `{nodeId: "engine.{ClassName}", kind, label, info}` per engine. Wire into `generate-system-viz.mjs` between L5 (domain buckets) and L6 (cores). Test: post-ship `system-graph.json` MUST contain a node with `id === "engine.GraphSAGELinkPredictorEngine"`. Without this, Verification step 11's "recursive property check" CANNOT pass — the GNN smoke-test queries an engine name the graph doesn't know about.

### P0 — U4 SUBPROCESS-KILL CHECKPOINT CORRUPTION UNCOVERED

U4 ships JSON checkpoints every 5 epochs (`graphsage-ep{N}.json`). Plan claims "atomic checkpointing" as a pattern reference from `CrossProcessNeuralLearningEngine`. **But the plan never specifies which atomic-write primitive U4's training script uses.** If `train-graphsage-link.mjs` uses naked `fs.writeFileSync`, a fleet-reaper kill during the write (likely under memory pressure per [[reference_fleet_reaper_ms1]] Layer-1 soft-relief) leaves a truncated checkpoint that explodes load on retry.

**Fix:** U4 acceptance criteria MUST include: "training script uses `safeWriteSync(checkpointPath, json)` from `mcp-server/src/utils/atomicWrite.ts` (or vendored equivalent for `.mjs` scripts) — write-to-temp + fsync + rename." Add test case: "checkpoint write interrupted by SIGTERM mid-write → either pre-write state OR post-write state, never partial JSON." This is the difference between a 12h training run that survives a Sunday-3am OS update and one that costs the milestone.

### P0 — GOAL-GATE STALENESS WINDOW INCOMPATIBLE WITH 30H BUILD

Per `H:/prism/.claude/hooks/goal-complete-gate.mjs` line 51: `PRISM_GOAL_GATE_STALE_HRS` defaults to **2 hours**. The plan's Sunday-EOD close-out flow says "alpha runs `/close-out-audit` + `/goal`" — but if `/close-out-audit` produces CLOSE-OUT-CANDIDATES.json on Sunday 4pm and `/goal` is hit at 7pm (close-out hand work + scrutiny gates), the 2h staleness gate **HARD BLOCKS** the milestone-finish.

**Fix:** Either (a) add to Sunday close-out runbook: "regenerate CLOSE-OUT-CANDIDATES immediately before `/goal`," or (b) set `PRISM_GOAL_GATE_STALE_HRS=6` for the alpha chat's session env. Plan currently makes the user discover this at the worst possible moment.

### P1 — RISK REGISTER OMITS 6 PLAUSIBLE FAILURE MODES

The 8-risk register is good but incomplete. Missing:

1. **Peer milestone-name collision** — no claim mechanism for `NN-GRAPH-MS0`. Another chat could open `NN-GRAPHSAGE-MS0` in parallel. Plan needs: alpha writes `mcp-server/data/milestones/NN-GRAPH-MS0.json` as `status:in_progress` BEFORE any peer claims a unit.

2. **c-to-h-mirror silent revert** — per [[reference_settings_wiring_drift_2026_05_16]], settings.json wiring HAS reverted between sessions. If U3/U4 add dispatcher actions and the mirror skips one settings.json file mid-weekend, half the fleet runs with stale schemas. Plan needs: every harness-touching unit close-out includes the `node -e` grep-check from CLAUDE.md regressions §2026-05-16. Currently absent.

3. **`_node-embeddings.jsonl` disk usage** — 372k nodes × 768 dims × 1 byte (int8) + JSON overhead ≈ 350-500 MB. **Not 3GB as I initially worried** — int8 + jsonl makes it small. But it IS gitignored (good) and sister-to wiki embeddings. Honest: low risk, just want the math documented.

4. **Vitest harness blocked** — per [[reference_fleet_reaper_ms1]] + [[reference_ollama_cost_routing]], vitest is currently broken; ledger MS uses `node --test`. U3/U4 plan tests as `*.test.ts` (vitest-style). **Will not run.** Plan needs: rewrite U3/U4/U5/U6 test plans as `node --test` OR commit to fixing vitest as part of U1.

5. **GNN AUROC=0.78 false-positive** — plan says "ship with raised `PRISM_NNG_MIN_CONF=0.9`." But the eval harness only confirms the GNN is GOOD on the held-out 200, not that the calibration is right. At AUROC=0.78, sigmoid-0.9 outputs could fire on patterns the held-out set didn't probe — silently corrupting the wiring inference. Mitigation needs Brier-per-bucket gate, not just headline Brier.

6. **/compact mid-U4-training** — the plan ships 8-12h training in echo's chat. If echo hits autocompact at 95%, the post-compact RESUME directive needs to know: "training was at epoch N, GPU lock still held, checkpoint at `graphsage-ep{N}.json`, resume with `--from-checkpoint`." Per [[reference_autocompact_autonomous_ms0_2026_05_15]], precompact-hook auto-synthesizes RESUME via `generateSmartResume()` — but that function reads commits, not training state. The RESUME for a stalled-mid-training chat will be useless.

### P1 — CLAUDE.md HOOK COMPLIANCE: GOLF ALLOWLIST DENIES U7 PATHS

U7 (golf slot, hygiene) must write **4 new wiki entries + 4 new memory entries + MEMORY.md edits + roadmap envelope + roadmap-index.json + chat-bus.** Checked `H:/prism/.claude/hooks/golf-slot-write-allowlist.mjs` `FALLBACK_ALLOW`:

- `knowledge/wiki/architecture/*.md` — **NOT in allowlist.** Will be blocked.
- `knowledge/memories/*.md` — **NOT in allowlist.**
- `mcp-server/data/milestones/NN-GRAPH-MS0.json` — **NOT in allowlist.**
- `mcp-server/data/roadmap-index.json` — **NOT in allowlist.**
- `MEMORY.md` — **NOT in allowlist.**
- `state/shared/AGENT_CHAT.jsonl` — IN allowlist. Good.

**The golf slot HARD-BLOCKS 5 of the 6 U7 write targets.** Reassign U7 to a work slot (juliett/kilo are described as "spare capacity"), OR explicitly note `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1` for U7's close-out window (logged emergency bypass). The plan's current owner-slot assignment for U7 makes U7 unshippable.

### P2 — TIME-BUDGET HONESTY

30h critical path (U1:4-6h + U2:6-8h + U3:6-8h + U4:8-12h) + U5:3-4h + U6:4-6h + U7:2-3h = 33-47h, NOT 30h. With ~10x per-file scrutiny gate dispatches (≈90 reviewer-agent rounds across 7 units × ~3 files/unit × 2 reviewers + retry), peer-claim contention, and 3-of-3 Stop gates per unit, the **realistic wall-clock is 45-60h.** A weekend has ~50h of operator-available time.

Per [[feedback_no_parallel_agents_high_pressure]] (>90% commit pressure → no parallel agents): U2 (372k Ollama embeds) + U4 (8-12h GPU train) in parallel WILL push the box past 90% commit. The plan does not acknowledge this. Recommend U2 and U4 run sequentially, not parallel.

### P2 — `MS-P5-GNN` ARCHITECTURE OVERLAP

`MS-P5-GNN` (WEDM lattice) is "0/6, not_started." Plan dismisses it as "different domain — pattern reference only." But the message-passing core for GraphSAGE-on-WEDM-graph IS the same primitive as GraphSAGE-on-system-viz-graph. If the plan ships `GraphSAGELinkPredictorEngine` as system-viz-specific, MS-P5-GNN will re-implement the same forward-pass.

**Fix:** Either (a) accept the duplication explicitly + document the contract for future merging, OR (b) factor U4 into `GraphSAGECoreEngine` (graph-agnostic SAGE) + `SystemVizLinkPredictorEngine` (system-viz-specific wiring head). (a) is honest; (b) is the right structural call but adds ~3-4h to U4. Either is better than silent.

### P3 — MS0/MS1 LADDER UNCLEAR

Plan mentions "v0.2 retrain" as a fallback if AUROC stalls. Is v0.2 a new unit in MS0, or implicitly MS1? Operator can't decide whether AUROC-failure path closes MS0 or trips a forced MS1. Suggest: explicitly declare U-NNG-V02-RETRAIN as a NEW unit added to MS0 only if U4's quality gate fails; otherwise MS0 closes at 7 units.

### P3 — U4 SHIP-GATE / U4 SHIP SPLIT

Per "fail loud" doctrine: if AUROC < 0.85, U4 ships a research artifact but the plan's threshold-raise path lets U5+U6 still close. **Suggest splitting U4 → `U4a-train` (mandatory) + `U4b-deploy-gate` (conditional on AUROC ≥ 0.85).** If U4a passes but U4b skips, MS0 closes at 6+1-deferred units instead of muddying the milestone status.

## Recommended Changes Before ExitPlanMode

- Add U-NNG-RECURSIVE-INGEST (or fold into U7) so the recursive claim is actually true
- Specify atomic-write primitive for U4 checkpoints + add SIGTERM-mid-write test
- Note `PRISM_GOAL_GATE_STALE_HRS=6` for alpha's Sunday close-out env
- Add 6 missing risks to register (peer-name collision, c-to-h mirror, vitest blocked, calibration-per-bucket, mid-training /compact RESUME, MS-P5-GNN overlap)
- Reassign U7 OFF golf, OR document `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1` window
- Honest time budget: 45-60h wall-clock, U2+U4 sequential not parallel
- Split U4 into U4a-train + U4b-deploy-gate so AUROC-failure path closes cleanly
- Add grep-check verification step in EVERY harness-touching close-out per CLAUDE.md regressions §2026-05-16

## Confidence

Plan is shippable IF P0s are fixed pre-ExitPlanMode. As-written, ~35% it closes by Sunday EOD without a scope cut to "research artifact" status. With P0/P1 fixes, ~65%.
