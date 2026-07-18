---
name: reference-wizard-closed-loop-training-paths-2026-05-27
description: Honest assessment of whether PRISM lathe wizard has enough to do closed-loop self-training. iter261 R12 retraction collapsed the assumed training signal (A/B pairs are pure annotation pass-through, NOT improvement pairs). This memo captures the operator-question answered iter302 + the 4-path priority order for building real training signal.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.267Z
aliases: reference_wizard_closed_loop_training_paths_2026_05_27
---


# Wizard closed-loop training — 4-path priority

## Status

**Cannot self-train from the JM-Die A/B pair corpus** — but PRISM already has a different closed-loop infrastructure that I missed in the initial answer.

iter261 R12 retraction proved across 20 sampled customers / 338+ scored pairs that v2.0.0 B-versions are **pure annotation pass-through** — body byte-identical to A-source plus stacked machine-target metadata headers. Zero machining-content changes. The iter1-iter261 implicit assumption that "B-version is improved A-version" is empirically false.

## iter303 correction — PRISM ALREADY HAS a closed-loop architecture (different signal)

`PPGSFCClosedLoopOrchestratorEngine` (U-PPG-SFC-14) at `mcp-server/src/engines/PPGSFCClosedLoopOrchestratorEngine.ts` implements a 6-phase closed-loop:

1. **SFC Recommendation** — UltimateSpeedFeed/AutoSpeedFeed proposes RPM/feed/SFM
2. **Outcome Capture** — operator override (recommended_sfm vs actual_sfm + reason)
3. **ContinualLoRA Threshold Check** — accumulates overrides per `(customer-material-machine_id)` key; trigger at **30 experiences**
4. **Adapter Training** — LoRA per customer/material/machine combo (EWC++ for catastrophic-forgetting protection)
5. **Shadow Mode Evaluation** — base Brier vs adapted Brier on next 50 events
6. **Adapter Promotion** — promote if Brier improves above threshold; provenance cites override history

Dispatcher action: `prism_ai:ppg_sfc_closed_loop` (aiReasoningDispatcher.ts line 1326).

### What this means

PRISM's closed-loop training signal is **operator overrides**, NOT A/B pairs. When the SFC recommends SFM=180 and the operator says "actually I ran it at 220" — that delta becomes training signal. After 30 such overrides for a given (customer, material, machine) combo, a LoRA adapter trains; if it improves Brier in shadow mode, it gets promoted.

This is a **CORRECT closed-loop architecture** for the speed/feed domain. It avoids the iter261 trap (no A/B pair training signal needed) and uses real operator-validated outcomes.

### What's MISSING for the architecture to actually train

Per the engine implementation:
- **No operator override history populated** — `overrideHistory: Map<string, OperatorOverride[]>` starts empty per session
- **No adapter persistence** — `adapterRegistry: Map<string, ...>` is in-memory only
- **No real LoRA training backend** — engine orchestrates phases but actual model training is upstream (likely Flow Nexus / Ollama LoRA pipeline)
- **No shadow-mode evaluator wired to real Brier-computing oracle** — current implementation simulates outcomes; needs real next-50-events feed
- **Operator-override capture UI** — operators need a way to submit overrides; no clear path documented

So: framework yes, **training data still missing**. Same root issue, different layer of the stack.

## What's built (the framework)

- 6 P0 wizard engines + ~150 hermetic tests
- 14,475 raw A/B pairs across 118 customers (corpus volume, but delta is metadata only)
- AB-locator + scanner + 3-class `pair_type` classifier (iter257/iter270/iter281)
- iter227 `detectMissingSafetyStateFlags` detector (semantically valid as a code-smell check)
- 14-vendor tribal corpus + 432 indexed videos
- 5-machine VMC fleet + 7-LTH Okuma fleet specs

## What's missing for closed-loop self-improvement

1. **Real delta** — A→B pairs need actual body changes for the wizard to learn what "improved" looks like.
2. **Reward signal** — no measurable quality metric tied to ground truth.
3. **Ground truth** — no published before/after examples or shop-floor cut-outcome data.
4. **B-versions are AI-generated** per [[feedback_jm_die_b_versions_are_ai_not_human_upgrade]] — training on them would be self-referential.

## 4-path training-signal roadmap (ranked by ROI)

### Path 1 — Industry-published before/after corpus (HIGHEST ROI)

**Source**: Sandvik machinability data, Kennametal application notes, Sumitomo case studies, Mitsubishi best-practice guides.

**Why highest**: published by tool manufacturers, validated by their R&D, ground-truth quality. Strong reward signal possible (Sandvik's stated SFM/feed/depth → known good for their inserts on the named material).

**Effort**: operator wget + PDF extraction via lima pypdf canonical extractor per [[feedback_use_lima_pypdf_page_extractor]]. Template at `mcp-server/data/ingestion_cache/VENDOR-PDF-INGEST-TEMPLATE.md` (iter195).

**Blocker**: needs operator-initiated PDF download (no public H drive per CLAUDE.md).

### Path 2 — Real shop tool-list + ERP cut-outcome data (closes the feedback loop)

**Source**: JM-Die shop floor (the test shop already known to the platform). Tool-list CSV + ERP linkage of program→cut→quality measurement.

**Why high**: closes the OUTCOME side of the loop. Currently the wizard's Ω/S(x) safety scores are computed but not validated against actual machining outcomes. Pairing actual cuts with their cut quality (chatter, finish, tool wear, dimensional accuracy) → real reward signal.

**Effort**: operator-actionable via iter194 template. P0 priority in iter228 work-trace.

**Blocker**: needs operator to export JM-Die ERP tool list + cut outcome data.

### Path 3 — Human-revision pairs (small but REAL)

**Source**: ACME `-A`/`-B` filename-sibling pairs (the human-revision pattern iter257 classifies as `pair_type: human_revision`).

**Why medium**: small corpus (~6-9 pairs per customer, scattered) but the deltas are GENUINE human edits — programmer A reviewed the original and made deliberate machining changes.

**Effort**: re-train iter257 filter to INCLUDE these (not exclude); byte-diff each pair to extract edit pattern; cluster by edit type (feed change, tool change, dwell add, etc.).

**Limitation**: corpus may be too small for ML; could feed rule-extraction instead.

### Path 4 — Synthetic perturbation + rules-based scoring (bootstrappable NOW)

**Source**: existing well-formed lathe programs + canonical safety rules (already in iter227 detector + Sandvik/Kennametal/Sumitomo guides).

**Approach**:
1. Take a known-good lathe program.
2. Synthetically perturb (remove G40, drop G80, change feedrate by 5%, swap tool offset, etc.).
3. Score perturbed version against canonical rules → known reward (decreased Ω/S(x)).
4. Train wizard to detect + repair perturbations.

**Why valuable**: NO external data needed. Bootstrap-able with current corpus + current rules. Validates the wizard's repair capability before real-world signal arrives.

**Effort**: ~1 week to build the perturbation generator + rules-based scorer + RL loop. Could ship MS0 in 2-3 ship cycles.

**Limitation**: ground truth is "canonical rules" — only as good as the rules themselves. Won't catch novel improvements.

## Recommended order

1. **NOW (no external dependency)**: Path 4 synthetic perturbation MS0 — proves repair pipeline works.
2. **Operator action #1**: Path 1 Sandvik/Kennametal PDF ingestion — strongest ground truth.
3. **Operator action #2**: Path 2 shop tool-list + ERP outcome data — closes the loop.
4. **Backfill**: Path 3 human-revision corpus — extracts real-edit patterns.

Combined: Path 1+4 gives a partial closed loop (synthetic perturbation + industry ground truth). Path 2 closes the full loop.

## R12 honesty

The wizard's framework is solid. The data foundation is not. Don't claim closed-loop self-improvement until at least one of the 4 paths is shipped end-to-end with measurable reward signal.

## Related

- `[[reference_iter218_alcoa_outlier_retraction_2026_05_27]]` — the R12 retraction that exposed the gap
- `[[reference_whiskey_lathe_complete_asset_map_2026_05_27]]` — what's built (the framework)
- `[[reference_whiskey_session_final_iter228_2026_05_27]]` — operator priority order
- `mcp-server/data/ingestion_cache/TOOL-LIST-TEMPLATE.md` — Path 2 operator template (iter194)
- `mcp-server/data/ingestion_cache/VENDOR-PDF-INGEST-TEMPLATE.md` — Path 1 operator template (iter195)
- `[[feedback_jm_die_b_versions_are_ai_not_human_upgrade]]` — why B-versions can't be training signal
- `[[feedback_use_lima_pypdf_page_extractor]]` — canonical PDF extraction
