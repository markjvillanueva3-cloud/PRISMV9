---
name: reference_post_ship_ai-systems-gnn-u-gnn-nneval-write-durable
description: Auto-distilled learnings from shipping AI-SYSTEMS-GNN/U-GNN-NNEVAL-WRITE-DURABLE (commit 788fdebf0). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.740Z
aliases: reference_post_ship_ai-systems-gnn-u-gnn-nneval-write-durable
---


# AI-SYSTEMS-GNN/U-GNN-NNEVAL-WRITE-DURABLE

[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-NNEVAL-WRITE-DURABLE (slot:india): persist the deployed direct-embed assessment to NN-EVAL.json each retrain -- the P2 last-mile so the PSN-leg-state hook (classifyGnn reads NN-EVAL.json) auto-reflects the deployed state post-retrain (was: only a standalone eval CLI run updated it). Extracted single-sourced writeAssessment() export from the eval CLI inline write (main() refactored, behavior-preserving); lifecycle stage 4b calls it with the RAW direct-embed result, fail-soft + injectable. Tests: eval 76/76 (writeAssessment round-trip + fail-soft), lifecycle 89/89 (+ write-called-with-raw + write-failure-fail-soft). per-file 2-arm scrutiny PASS (0 P0/P1; fixed stale-comment doc-drift; logged 2 P2: bare-CLI writes checkpoint-mode to the same file -> add a mode tag / default CLI to direct-embed; non-atomic 2x writeFileSync -> tmp+rename).

**Shipped:** 2026-06-17T12:07:44-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[ai-systems-gnn-u-gnn-nneval-write-durable]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._