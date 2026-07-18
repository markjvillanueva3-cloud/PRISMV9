---
session: claude-a803c8fa
topic: india-refpool
slot: india
written_at: 2026-06-17T20:00:22.961Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-a803c8fa
status: active
---

# HANDOFF: claude-a803c8fa
Updated: 2026-06-17T20:00:22.961Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-a803c8fa

## STATE
Ref-pool model lever. The 2 existing feeders (outcome 139 + vault 16) are SATURATED (dry-run confirmed 0 net-new). Built 3rd feeder scripts/wired-engines-to-refpool.mjs (+test 7/7) mining codebase engine-to-dispatcher wirings via buildEngineDispatcherMap: dry-run 3206 single-dispatcher ground-truth labels (confidence 1.0), 409 multi-dispatcher excluded (R12). ~20x growth. Committed dry-run-SAFE + NOT applied (a 20x ghost injection into the shared 542MB graph needs blast-radius verification first). Eval buildHoldout consumes it namespace-agnostically + dedups by label. Memory: reference_gnn_codebase_wired_refpool_2026_06_18.md + reference_gnn_tier5_degenerate_2026_06_17.md. ENV: new files stage via update-index plumbing (porcelain staging lane-blocked); slot-india worktree STALE so commit to the shared branch where deps live; lifecycle needs 8GB heap; MCP-enforce eats 1 call per 3min.

## RESUME
6 commits this 'do everything' turn (all tested + 2-arm scrutiny PASS): NN-EVAL hardening trilogy + observability [9db8c6eace MODE-GUARD, e80f585eb8 DEFERRED-FENCE, b3aaad542f ATOMIC-WRITE, 324d09c661 STATUS-DEPLOYED-METRIC] + the ref-pool LEVER [859554a148 CODEBASE-WIRED-REFPOOL]. rsLoRA r=32 VERIFIED complete (315MB adapter, globalStep 400, 2026-06-15 -- task was stale). Full GNN force retrain re-measured: gate correctly held (model-mode 0.3512 not-promoted), deployed direct-embed HELD at 0.789/27.4 pct deploy-ready-selective across the retrain (durability arc e2e-validated). NEXT (gated, supervised): U-GNN-CODEBASE-WIRED-APPLY -- verify blast-radius (roosts/orphan/classifier), then apply 3206 codebase-wired refs (20x pool growth), refresh embeddings, measure direct-embed, KEEP if at-or-above 0.789 else revert, then wire stage 1c. Re-enter: /startup-india /loop [10m] /goal.

## CONTEXT

