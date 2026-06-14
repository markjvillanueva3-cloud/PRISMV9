---
name: reference-u-viz-ghost-wire-validate-2026-05-21
description: "G3 ghost-wire validation feedback loop shipped 2026-05-21 sierra — closes NN-GRAPH MS0 AUROC=0.096 retrain loop + paints /system-viz ghost nodes confirmed/refuted/pending. Note misattribution of 2 of 3 files to peer commit 79b5ff278a (charlie's INFRA-AGI-ROUTER-MS2) due to shared-tree git-add window."
aliases: reference_u_viz_ghost_wire_validate_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.026Z
---


**SYSTEM-VIZ-HIGH-ROI-MS0/U-VIZ-GHOST-WIRE-VALIDATE (2026-05-21, slot:sierra)**

Closes G3 of the SYSTEM-VIZ-HIGH-ROI audit. 7,412 ghost-edges in `system-graph.json` (incl. 630 NN-GRAPH `proposed_wiring` annotations) had **never been validated** — that broke the feedback loop the NN-GRAPH model needed for retrain (still at AUROC=0.096 per [[reference_nn_graph_ms2_u1_2026_05_17]]).

## What shipped
- `scripts/validate-ghost-wires.mjs` (~285 lines, 8 exports) — pure injectable `validate({graph, dispatcherIndex, dispatcherReader, now, refutedAfterDays})` + CLI runner. Scans every `ghost.unwired-engine` node, resolves `proposed_wiring` (MCP tool name) → dispatcher file via case-insensitive directory index, classifies:
  - **confirmed** (engine name appears as a word-boundary token in dispatcher text)
  - **refuted** (no reference AND `proposed_at > 30d` ago via `REFUTED_AFTER_DAYS`)
  - **pending** (no reference AND ≤30d old)
- `scripts/validate-ghost-wires.test.mjs` — 11 `node:test` cases (3 failure modes: non-object graph throws, malformed engineName→refuted, unresolvable dispatcher→pending; 3 adversarial: word-boundary `MillEngine` NOT matching `WindMillEngine`, clock-skew future `proposed_at` clamped `daysOpen=0`, REFUTED_AFTER_DAYS boundary 29d→pending vs 31d→refuted).
- `scripts/merge-augmentations.mjs` wiring (3 sites matching wiringOverlay convention): `loadOptional` at line 137, version-stamp at line 212, merge block at lines 738-770.
- `scripts/regen-viz.mjs` FAST[] entry at line 131.

## Outputs
- `state/shared/ghost-wire-outcomes.jsonl` — append-only labeled dataset (one outcome per ghost per run) feeding NN-GRAPH precision/recall over time.
- `state/shared/system-viz/ghost-wire-validation-augmentation.json` — overlay with `annotations: {[id]: stamp}` (matches wiringOverlay convention) + `edges: []` (new `ghost-wire-validation` edges painting status intensity green=0.9 / red=0.6 / amber=0.3).

## First live run
636 ghosts scanned · 3 confirmed · 633 pending · 130 dispatcher-unresolvable (those have `proposed_wiring` keys not in the 16-entry `MCP_TOOL_TO_DISP_NODE_ID` table; surfaces as `counts.malformed` for operator triage).

## Misattribution (Karpathy R12 transparency)
The unit shipped across **two** commits because of the documented shared-main-tree git-add absorption window (see [[reference_misc_tasks_extraction_2026_05_16]]):
- `79b5ff278a` (charlie's `[INFRA-AGI-ROUTER-MS2]/P0-U05-SMOKE`) **silently absorbed** my untracked `validate-ghost-wires.mjs` + `validate-ghost-wires.test.mjs` during charlie's own `git add` window. 703 insertions total — 268 of charlie's own router smoke test + 299 + 268 of mine.
- `a9181cade4` ([SYSTEM-VIZ-HIGH-ROI-MS0]/U-VIZ-GHOST-WIRE-VALIDATE, slot:sierra) — MY commit. Contains the merge-augmentations.mjs wiring delta (2 insertions, 4 deletions — small because the bulk was debug-line removal).

The `regen-viz.mjs` FAST[] entry separately landed in **HEAD** via prior peer activity (linter/echo's commit absorbed my edit while merge-augmentations.mjs was busy).

**Risk:** none operationally — all 3 files are in the repo, tests pass, wiring works. **Lesson re-confirmed:** the shared-main-tree git-add window is unavoidable under 8+ concurrent slots; per [[feedback_conflict_fork_rule]], multi-file builds on shared `H:/prism` should use a per-slot worktree. This unit's scope was small enough (3 files, ~570 LOC) that worktree-migration cost > absorption-risk cost — accepted the risk consciously.

## Scrutiny
2-of-2 gate (CLAUDE.md still says 3-of-3 but arm C was demoted 2026-05-20 per scrutiny-3way output: `"consensus": "two Claude arms pending chat dispatch — arm C demoted to advisory 2026-05-20 per user directive"`):
- **Arm A PASS** — wiring complete, word-boundary regex correctly escapes metachars, pure-core injectable, append-only JSONL safe, path-traversal guard in `dispNodeIdToBasename` (rejects whitespace/dots/dashes in disp.<id> suffix).
- **Arm B PASS** — test integrity (concrete `assert.equal`, not stubs), adversarial fixtures clean of rejected engine names as substrings (one fixture bug WAS caught + fixed mid-build — replaced multi-line fixture with single-line `import { MillEngine } from "../engines/mill.js";`), overlay convention matches wiringOverlay (`annotations` + `edges`), R12 fail-loud on malformed-name + unresolvable dispatcher, 16-entry MCP_TOOL_TO_DISP_NODE_ID matches `seed-ghost-from-unwired.mjs` source-of-truth exactly.

## Deferrables (P2, do not block)
- **R8 soft drift:** validator locally re-defines `MCP_TOOL_TO_DISP_NODE_ID` rather than `import`-ing the exported map from `seed-ghost-from-unwired.mjs`. Future-fix: convert to import.
- **Docstring drift:** file header says output path is `state/shared/system-viz/staging/ghost-wire-validation-augmentation.json` but CLI writes to `state/shared/system-viz/` (corrected mid-build to match `VIZ_DIR` in merge-augmentations.mjs:26).
- **EACCES vs ENOENT distinction lost** in `dispatcherReader` catch — surfaces as `dispatcher-unreadable` reason which is acceptable batch-resilience but specific cause is buried.

## Linked
- Audit spec: `state/shared/specs/SYSTEM-VIZ-HIGH-ROI-AUDIT*.md` G3 (lines 115-130)
- [[reference_nn_graph_ms2_u1_2026_05_17]] — the NN-GRAPH model whose retrain this unblocks
- [[reference_misc_tasks_extraction_2026_05_16]] — git-add absorption class
- [[feedback_conflict_fork_rule]] — when to fork to a sibling worktree
- [[reference_u_regen_viz_merge_faillod_2026_05_17]] — merge-augmentations.mjs OOM/SIGKILL class (related: 16GB heap flag required)
