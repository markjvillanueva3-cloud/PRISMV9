---
name: reference_viz_aug_stale_rewire_2026_06_22
description: "system-viz STALE-ORPHAN augmentation fix (8->4) -- generator-not-in-FAST[] folds 44-day-old data forever; 2 generators found BROKEN on V8 512MiB string cap"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.252Z
aliases: reference_viz_aug_stale_rewire_2026_06_22
---


**system-viz STALE-ORPHAN augmentations — the freshness sibling of the dual-registration bug** (slot:sierra, U-VIZ-AUG-STALE-REWIRE, commit `10d7942143`, 2026-06-22).

## The bug class
`regen-viz.mjs` runs a `FAST[]` array of generators (each writes a `*-augmentation.json`), then `merge-augmentations.mjs` `loadOptional()`-reads each + folds it into the 781MB `system-graph.json`. If an augmentation's **splice exists but its generator is NOT in FAST[]**, merge folds the FROZEN on-disk file every regen forever — the graph shows GREEN (= re-merge recency, NOT data freshness). `audit-augmentation-freshness.mjs` flagged **8** augs ~44 days (1051-1070h) stale. This is the FRESHNESS axis sibling of the structural dual-registration bug ([[reference_viz_dual_registration_audit_2026_06_22]]); the dual-reg auditor checks both-or-neither *structure*, NOT freshness.

## Fix (classified all 8 via a 9-agent workflow, every claim verified by RUNNING each generator — R15)
- **REWIRE-FAST (3, added to FAST[], validated cheap):** `merge-file-coverage-v2.mjs` (159ms), `build-novelty-catalog.mjs` (322ms), `heuristic-classifier.mjs` (557ms). FAST[] is SEQUENTIAL (`for...of` + spawnSync), so `merge-file-coverage-v2` placed BEFORE `heuristic-classifier` (its input `file-coverage-v2-augmentation.json`).
- **REWIRE-HEAVY (1, added to HEAVY[]):** `h-drive-skipped-census.mjs` — exit 0 in 65s, FS-walk no graph load, correct for `--full` only (HEAVY[] = the `wantFull ? [...FAST,...HEAVY] : FAST` array).
- **KEEP-AS-IS (1):** `engine-spotlight.json` — hand-curated STATIC catalog, NO generator by design; commented so the freshness "stale" is understood.
- **DEFERRED-BROKEN (2) -> FIXED in `b26a827e65` (U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX, iter-12):** `augment-graph-with-awareness.mjs` + `build-business-value-map.mjs` were **BROKEN** on the 781MB graph — `JSON.parse(fs.readFileSync(graph,"utf8"))` hit V8's 512MiB string cap (`Cannot create a string longer than 0x1fffffe8`, exit 1), so nobody could regenerate them since the graph crossed ~512MiB (= why 44 days stale). FIX: migrated the graph read ONLY to `readGraphStreaming` (Buffer-stream parser, `scripts/lib/graph-io.mjs` — the same reader merge uses), then HEAVY[]-wired both (--full only; full-graph loaders). Validated: awareness exit 0 in 11s (351,265 nodes), business-value exit 0 in 12s. STALE-ORPHAN 4->2. Corroborated by [[reference_regen_viz_string_length_2026_05_23]] (papa, May). Lesson stands: a generator that loads `system-graph.json` MUST use `readGraphStreaming`, NEVER `JSON.parse(readFileSync utf8)`.
- **OPERATOR-GATED (1):** `h-drive-exhaustive-audit.ps1` — PowerShell+VSS, needs elevation; the node-only HEAVY runner can't host it. Elevated scheduled task (install-fleet-reaper-task.ps1 SYSTEM pattern).

## Proven (numbers)
STALE-ORPHAN **8->4**, fresh 103->107; dual-reg audit FAST 101->104 / HEAVY 2->3 with **0 crashRisks / 0 silentDiscards**. New test `regen-viz-fast-order.test.mjs` (4/4): asserts the 3 FAST-registered, the B2->B3 order, AND the 2 broken stay UNWIRED until migrated. 3-of-3 PASS.

## Systemic follow-ups SHIPPED (iters 13-14, R16 fit-the-whole)
- **iter-13 `U-VIZ-FRESHNESS-POSTFLIGHT` (`b18c821af9`):** regen-viz now runs a post-merge freshness POSTFLIGHT (symmetric to the dual-reg preflight) that warns LOUD when the merge just folded a stale-orphan -- so the REGEN ITSELF reports it (previously staleness only surfaced via the per-prompt `sierra-graph-health` hook, which misses cron/other-slot/manual regens). Reuses the augmentation-freshness lib. Knob `PRISM_VIZ_FRESHNESS_POSTFLIGHT=0`. ALSO fixed a latent bug I introduced in iters 11-12: HEAVY[]-wired generators must be added to `SLOW_CADENCE` (augmentation-freshness.mjs) or they false-alarm as stale-orphan at 7d -- reconciled the 3 new entries; the file's drift-guard test was RED since iter-11 (I missed running it) -- fixed + its fragile `/const HEAVY = \[([\s\S]*?)\]/` regex (truncates on a `FAST[]` token in a comment) swapped for the robust `parseGeneratorArray`.
- **iter-14 `U-VIZ-FRESHNESS-HARDEN` (`e7f12c4ef6`):** closed 2 scrutiny P2s -- (1) `freshnessThresholdsFromEnv(env)` single-source so the postflight + audit classify with identical PRISM_AUG_*_HR thresholds (were divergent); (2) rewrote `extractArrayBody` (dual-reg lib) as a string/comment-aware state machine -- the old raw `[`/`]` count mis-terminated on an UNBALANCED comment bracket (same class as the drift-guard regex + the zulu parseShipped prose-miscount).

## Lessons
- A generator that loads `system-graph.json` MUST use `readGraphStreaming` (Buffer parser), never `JSON.parse(readFileSync utf8)` -- the graph is past the V8 512MiB string cap.
- Adding to `regen-viz` HEAVY[] requires a paired `SLOW_CADENCE` entry in augmentation-freshness.mjs (else 7d false-alarm) -- the drift-guard test enforces it; RUN it after any HEAVY[] change.
- A regex/bracket-count over source that includes comments/strings is a recurring landmine (drift-guard regex, extractArrayBody, zulu parseShipped) -- strip comments / skip string+comment regions before structural parsing.
- Fanout-gate override: put `[SCOPED]` (or `--force-fanout`) in the **top-level `description` param** of the Workflow/Agent tool call -- the hook reads `ti.description`, NOT `meta.description` inside a workflow script.
