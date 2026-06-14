---
name: reference-extraction-iter19-20-2026-05-24
description: U-EXTRACT-TSNE (iter19) + U-EXTRACT-PARTICLE-FILTER (iter20) shipped on slot/golf in golf worktree — vindicates the slot-worktree commit pattern when shared-tree index.lock is held by a hung peer git process.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.108Z
aliases: reference_extraction_iter19_20_2026_05_24
---


# Extraction iter 19-20 (slot:golf, 2026-05-24)

Two clean ships closing the cluster algorithm trio + adding the canonical state-estimation primitive.

## What shipped

| Iter | Unit | Commit | LOC | Tests |
|------|------|--------|-----|-------|
| 19 | U-EXTRACT-TSNE | `a7af97718b` on slot/golf | 460 ins | 16/16 PASS |
| 20 | U-EXTRACT-PARTICLE-FILTER | `7cef63a7db` on slot/golf | 454 ins | 17/17 PASS |

Both extracted from `extracted_modules/ai_ml_engines/` source files:
- **iter 19**: `PRISM_CLUSTERING_ENHANCED.js` (t-SNE portion only — closes the DBSCAN/K-Medoids/t-SNE trio started in iter 17/18).
- **iter 20**: `PRISM_PARTICLE_FILTER.js` (core SMC; manufacturing-specific `createToolWearFilter` deferred as engine concern).

## Slot-worktree commit pattern that worked

Shared `H:/prism` tree had a hung `git.exe` PID 57228 holding `.git/index.lock` for 4+ minutes — peer chat crashed mid-commit. Five retry loops failed.

**Resolution per [[feedback_commit_to_slot_worktree]]:**
1. `cp` files from `H:/prism/...` to `H:/prism-slot-golf/...`
2. `git -C H:/prism-slot-golf add ... && commit -m "[golf] ..."` — used `-C` flag because the worktree-commit-route hook evaluates cwd before the bash `cd` runs.
3. The `[golf]` subject prefix (lowercase) satisfies the routing hook's "matching worktree" check (golf branch = `slot/golf`).

Both commits landed cleanly on `slot/golf` — no peer absorption, full attribution preserved. Will merge to `cad-fusion-live-ms0` via the slot-integrator on next golf-integration pass.

## Why these were high-ROI picks

- **t-SNE**: closes a trio (DBSCAN clustering + K-Medoids clustering + t-SNE visualization), all three siblings in the source file. Standard dimensionality-reduction primitive for the future PRISM visualization engines (parts library exploration, customer clustering, defect-pattern visualization).
- **Particle Filter**: canonical state-estimation primitive (MIT 16.410 lecture). High leverage for the planned tool-wear tracking, cutting-force estimation, and process-state-monitoring engines that depend on it. Pure SMC stays domain-agnostic.

## Karpathy R12 discipline upheld

Both extractions throw on bad input rather than silent-coerce — t-SNE rejects `perplexity >= n`, ragged dims, non-finite coords; particle filter rejects negative/NaN measurement weights, missing models. No `toBeDefined()` weak asserts — every test verifies a numerical invariant or convergence target.

## Pending / next pickup candidates

From `state/shared/EXTRACTION-STUB-CLASSIFIER.json` (62 remaining substantial):
- `PRISM_HYPEROPT_COMPLETE.js` (11.7K) — Bayesian hyperparameter optimization
- `PRISM_INTERIOR_POINT_ENGINE.js` (13.0K) — interior-point LP/QP solver
- `PRISM_COMBINATORIAL.js` (10.2K) — combinatorial optimization (genetic/simulated annealing)
- `PRISM_ATTENTION_ADVANCED.js` (9.8K) — attention mechanisms (multi-head, sparse)
- `PRISM_FEATURE_INTERACTION.js` (7.1K) — feature crossing/interaction terms

Monte Carlo was the obvious next pick — **skipped** because 4 engines + `alg-montecarlo` already exist in the system-graph (duplication guard).

## Reaper status this session

All 7 PRISM hygiene scheduled tasks confirmed `Ready` + fired in concert. Home preset applied (8 keys: qwen2.5-coder:14b prewarm, 10m keep-alive, 2 GB GPU floor, 90% pressure floor, 95% critical, 256 MB ballast, 0.15 hint-delta). Coordinator pre-warmed model + wrote routing hint. Lightweight JSONL-tail monitor armed (background grep tail). 8 chat crashes recorded to postmortem ledger; 15 stale slot claims noted.
