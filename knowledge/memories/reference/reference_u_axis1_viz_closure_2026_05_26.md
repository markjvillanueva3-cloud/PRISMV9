---
name: reference-u-axis1-viz-closure-2026-05-26
description: Tango shipped U-AXIS1-VIZ-CLOSURE (ghost.testing_infra roost in /system-viz). Absorbed into 2 peer commits — H8 misattribution count climbs.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.232Z
aliases: reference_u_axis1_viz_closure_2026_05_26
---


# U-AXIS1-VIZ-CLOSURE — testing-infra ghost roost in /system-viz (2026-05-26, slot:tango)

Closed the **Axis 1 (PSN/system-viz wiring)** gap explicitly named in [[reference-tango-testing-infra-2026-05-25]] (HANDOFF-claude-06a24572). The 4 testing-infra engines shipped by U-AXIS2-3-4 (PostProcessorMatrix/SpeedFeedAtScale/DomainWizardPipeline/CADCAMGeneration, 86/86 PASS) now have a first-class PSN surface in `/system-viz` — engine + dispatcher + test-count, all visible together.

## What shipped

- `scripts/generate-testing-infra-features.mjs` (253 LOC) — pure generator; `AXES[]` hard-codes 4 source-of-truth engines with passCount/total/dispatcher/action/adapterStatus.
- `scripts/generate-testing-infra-features.test.mjs` (144 LOC, 17 tests) — covers source-of-truth contract (86/86 hard-code), cold-start emission, idempotent re-emission, Set/Array compat, atomicValues confidence=1.0 invariant.
- `scripts/regen-viz.mjs` FAST[] +1 line (between priority-queue and slot-queue).
- `scripts/merge-augmentations.mjs` +34 lines (loadOptional decl + versions register + splice block consuming `newNodes`/`newEdges` per priorityQueue pattern).

After regen-viz: `ghost.testing_infra` (L8) + 4 `testing-infra-axis` children (L9) + 4 `tests` edges to real `engine.<EngineName>` nodes (orphans non-fatal).

## [[reference_h8_misattribution_2026_05_20|H8 misattribution]] — count climbing

This is at least the **5th documented absorption** in 6 days (3 in single golf 2026-05-24 + h8 from echo 2026-05-20 + Axis 5 absorbed yesterday 2026-05-25 + my 2 today):

- Commit `057136e9a6` (slot:foxtrot, [MILL-PDF-CORPUS-MS0]/U-FOXTROT-LIMA-CROSSOVER) absorbed `generate-testing-infra-features.mjs` + `.test.mjs`.
- Commit `b210018020` (slot:quebec, [UI-UX-IMPROVEMENT-MS0]/U-F7-REACT-SCAN-DEV-OVERLAY) absorbed `regen-viz.mjs` FAST[] entry + `merge-augmentations.mjs` splice.

**Why it happened:** worked in shared `H:/prism` tree (not slot/tango worktree — that branch is divergent and lacks current splice line-numbers). Per [[feedback_commit_to_slot_worktree]] the slot worktrees diverge from `cad-fusion-live-ms0` trunk and re-syncing them mid-iter is high-friction; if a slot worktree is stale, the rational move today is still to work in main with `[MAIN]` prefix (per [[feedback_commit_prefix_main_on_shared_tree]]) and accept absorption risk.

**Pattern reinforced:** the absorption isn't a code-loss bug — `git show 057136e9a6 -- scripts/generate-testing-infra-features.mjs` and `git show b210018020 -- scripts/merge-augmentations.mjs` both confirm the full content shipped. Attribution lost, code intact. The fix path (slot-worktree re-sync via `/checkin <slot> --rebase-on-trunk`) is a tracked but unbuilt remediation.

## Verification (re-runnable)

```bash
# Generator works:
node H:/prism/scripts/generate-testing-infra-features.mjs
# wrote ...testing-infra-augmentation.json · roost:1 · axes:4 · 86/86 (100.0%)

# Tests pass:
cd H:/prism && node --test scripts/generate-testing-infra-features.test.mjs
# tests 17, pass 17, fail 0

# Wiring intact in absorbing commits:
git -C H:/prism show 057136e9a6 -- scripts/generate-testing-infra-features.mjs --stat
git -C H:/prism show b210018020 -- scripts/regen-viz.mjs scripts/merge-augmentations.mjs --stat
```

## Open follow-ups (carried)

1. **Axes 4+5 dispatcher adapter binding** — DomainWizardPipelineTestEngine + CADCAMGenerationTestEngine dispatcher actions are still TS-only echoes. The new roost surfaces this via `adapterStatus='echo-needs-binding'` / `'echo-needs-callback-binding'` — now operator-visible.
2. **PostProcessorNumericDialectEngine** — Axis 2 catches lexical foreign macros, not numeric-precision dialect drift.
3. **Dynamic pass-count parsing** — generator hard-codes 86/86 from ship-time; a future iter could parse vitest output via sidecar.

## Memory anchors

- [[feedback_commit_to_slot_worktree]] — [[reference_h8_misattribution_2026_05_20|H8 misattribution]] doctrine
- [[feedback_commit_prefix_main_on_shared_tree]] — [MAIN] prefix discipline
- [[feedback_parallel_scrutiny_per_file]] — gate that caught the Axis 2 P0 yesterday
- [[feedback_psn_definition]] — Axes 2-5 now wired into PSN-7 Engines + PSN-8 Algorithms via this roost
- prior tango handoff: HANDOFF-claude-06a24572-tango-testing-infra.md
