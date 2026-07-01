---
title: Decision — the "improve AI systems across all galaxies" /goal IS its deterministic gate
type: decision
tags: [goal, loss-function, ai-systems, synergy, decision, slot-zulu]
slot: zulu
status: binding
created: 2026-06-11
---

# Decision: the recurring AI-systems-synergy /goal is operationally DEFINED by its gate

## Context
The /goal — *"improve ai systems, deep learning, deep reasoning, nn, gnn, lora, cag + rag + hybrids across all galaxies and domains and ensure they're all synergized with obsidian vault, hermes, psn, prism awareness of each galaxy, claude.md of each galaxy, souls.md of each galaxy, memories and wikis across all galaxies"* — has been re-fired many times (charlie, alpha, tango, zulu). The goal-keeper correctly observed it is **unbounded prose with no inherent deterministic stop criterion**: "ensure" and "synergized" are subjective re-judging targets, so the keeper can loop forever. The goal-design doctrine ([[agent-loop-design-rules]], [[feedback_goal_needs_loss_function]]) names this the "slop machine" failure mode.

## Decision (binding, authoritative for this and every future firing)
**The prose goal above IS DEFINED AS SATISFIED IF AND ONLY IF `node scripts/ai-systems-synergy-goal-gate.mjs` returns exit 0** (`runGateFromDisk().pass === true`).

This is the explicit pre-commitment that converts the prose to a loss function (R5: a deterministic check answers done/not-done, not an LLM re-judging prose). Every ambiguous clause is bound to a deterministic leg:

| Prose clause | Bound to |
|---|---|
| improve ai systems / nn·gnn·lora·cag+rag·deep-* | LEG-C (GNN deploy-ready-selective, AUROC≥0.78 + a selective τ clearing brier+macroF1) + LEG-B (LoRA data-complete) + LEG-D (CAG cold-anchor coverage ≥95% — U-CAG-LEG-D 2026-06-11) + the per-galaxy reasoning-bridge LEG-A audits |
| ensure all synergized w/ vault·awareness·CLAUDE·SOUL·MEMORY·wiki across all galaxies | LEG-A: `AI-SYNERGY-AUDIT` gaps==0 AND N/N score≥1 (the audit scores exactly those surfaces + the Obsidian synthesis brain per galaxy); on the disk path the audit must also be FRESH ≤`PRISM_AISYN_GATE_MAX_AGE_H` (default 24h — U-LEGA-FRESHNESS 2026-06-12; stale data ≠ pass, same R12 class as missing data). The iff is therefore **time-decaying**: a STALE FAIL means "rerun `scripts/audit-ai-synergy.mjs`", NOT "re-open the goal" |
| utilize new loop knowledge / hermes agentic coding | **METHOD directive, NOT an outcome** — verify-before-build, coordinate-don't-duplicate, route mechanical work locally. A method cannot be a stop-criterion (R12-honest), so it is deliberately NOT a gate leg. |

## Explicitly out of scope (named, not silent — not part of the iff)
GNN **full-coverage** (`NN-EVAL.grade.pass`) = reference-pool growth (data + GPU), owned by india's lifecycle (active loop `8347ba23`). It is reported by the gate as an informational residual, never gated, never claimed done.

## Honesty note (R12)
This binding was authored mid-firing (2026-06-11), not before the work existed — the work was already shipped by charlie/alpha/tango/india/zulu over prior sessions. This decision makes the equivalence **authoritative going forward** so the prose is no longer ambiguous for any future re-fire: run the gate, read exit code. It does not retroactively claim a pre-commitment that did not exist; it establishes one.

## Status as of 2026-06-12
`L = A ∧ B ∧ C ∧ D = PASS` (exit 0, audit regenerated fresh same-day): LEG-A 34/34 gaps=0 (fresh) · LEG-B 1219 rows / 34 galaxies trainingReady · LEG-C auroc=0.8084, 5 selective τ clear both gates (best τ=0.5, cov 46.8%, brier 0.101, macroF1 0.587) · LEG-D CAG coverage 100% over 500 sessions. Gate: `scripts/ai-systems-synergy-goal-gate.mjs` (LEG-A freshness enforced on the disk path, observable as `fresh=X.Xh<=24h` in the PASS detail). Named residuals: GNN full-coverage (india ref-pool growth) · LEG-B/C artifact staleness unguarded pending operator-named ceilings (follow-up U-LEGBC-FRESHNESS). Evidence: [[reference_deep_ai_pipeline_allgalaxy_evidence_2026_06_11]].

_(Superseded — status as of 2026-06-11: `L = A ∧ B ∧ C = PASS`, LEG-B 1138 rows, 16/16 tests; pre-LEG-D, pre-freshness.)_
