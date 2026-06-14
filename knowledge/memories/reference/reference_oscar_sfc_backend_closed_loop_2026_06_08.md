---
name: reference_oscar_sfc_backend_closed_loop_2026_06_08
description: "Oscar SFC back-end hardening session — EPERM ledger leak, 7 orphaned-in-git engines rescued, live-caught consensus-pollution bug, closed-loop SFC↔HSMAdvisor↔GWizard validated"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.248Z
aliases: reference_oscar_sfc_backend_closed_loop_2026_06_08
---


# Oscar SFC back-end + closed-loop session (2026-06-08, slot:oscar)

Operator directive: "fix anything and everything back end first, wire unwired things, synergize the full back end, then go back to closed-loop testing between PRISM SFC, HSMAdvisor and GWizard." Executed in dependency order. Four findings, all live-caught or integrity-real:

## 1. OutcomeCaptureBus EPERM data-spine leak (P0) — commit `5ae481f748`
`OutcomeCaptureBusEngine.atomicAppend` did read-whole-90MB → write-tmp → `renameSync` on EVERY single-line append to `state/outcomes/speed_feed.jsonl`. The rename raced concurrent fleet readers on Windows (`ERROR_SHARING_VIOLATION` → EPERM): (a) silently dropped the outcome capture, (b) orphaned the tmp → **11,995 dead `.tmp` files** (151MB) accumulated. The ledger the closed-loop calibration depends on was dropping writes. Fix: common path (<64KB line) → `fs.appendFileSync` O_APPEND (kernel-atomic at line granularity across fleet) + bounded 2/4/8ms retry on EPERM/EBUSY/EAGAIN/EMFILE; oversize fallback keeps tmp+rename but guarantees cleanup on every failure branch. O(file²)→O(line). Swept the 11,995 orphans. **Lesson:** read-rewrite-rename is the wrong pattern for an append-only log under multi-writer contention — O_APPEND is atomic for sub-64KB writes. Same class as juliett's 16GB tmp-orphan leak.

## 2. SEVEN SpeedFeed* engines were untracked in git — commit `a2dbfa76e1`
`SpeedFeedTriComparatorEngine`, `SpeedFeedExhaustiveCombinationEngine`, `SpeedFeedDownstreamSubscriberEngine`, `SpeedFeedBaselineComparatorEngine`, `SpeedFeedPropagationBridgeEngine`, `SpeedFeedOutcomeFeedbackBridgeEngine`, `SpeedFeedPSNDecisionPriorEngine` existed ONLY in the working tree (`git log -- <file>` empty — never committed). The U-OSC-WIRE-TRIVENDOR dispatcher commit wired 3 of them, so calcDispatcher referenced engines absent from git — a fresh clone would fail to build. Swallowed by shared-tree contention across prior sessions ([[reference_h8_misattribution_2026_05_20|H8 misattribution]]/orphan class). Rescued all 7 (deps all tracked → self-contained). **Lesson:** after wiring an engine, verify `git ls-files --error-unmatch <engine>` — a wired-but-untracked engine is a latent build break. Shared-tree (`cad-fusion-live-ms0`) commits get partially absorbed; verify the engine itself is tracked, not just the dispatcher edit.

## 3. Consensus folded misaligned advisories — live-caught (R12) — commit `a2dbfa76e1`
`SpeedFeedTriComparatorEngine.consensusOf` filtered externals on `available` but NOT `aligned`. A single HSMAdvisor open `<Cut>` (634 m/min, wrong tool, unverifiable material) flagged `aligned:false` was folded into the consensus median for EVERY material → titanium consensus = 345 m/min (impossible), making PRISM's correct ~42 look wrong. Fix: prefer aligned externals; exclude `aligned:false` from consensus WHEN an aligned external exists, fall back to include-but-flag when it's the only signal (preserves original contract; existing single-external test stays green). Consensus is verdict-only (never reaches cutting rec — physics-reviewer confirmed); fix moves it in the SAFE direction. **Lesson:** an opinion explicitly flagged unverifiable must not silently set the consensus it's compared against.

## 4. Closed-loop SFC↔HSMAdvisor↔GWizard — VALIDATED on live data
Driver `mcp-server/scripts/sfc-closed-loop-compare.mjs` (run: `npx tsx`). Live result across P/N/M/S/K/H:
- **PRISM physics: 6/6, correct per-ISO Vc** (P 154 · N 226 · M 106 · S/Ti 41.6 · K 170 · H/D2 42.8 m/min), trends conservative vs baseline (safe direction).
- **G-Wizard: 0/6 — the operator crib is GEOMETRY-ONLY.** 0 of 41,210 toolcrib.csv rows carry a real sfm (all NaN). G-Wizard computes speeds on-demand in its UI, doesn't persist them. Correct abstention, NOT a bug. To compare, operator must enter proven sfm OR we pick a crib tool with sfm (none have it). Supersedes the prior "unpopulated, 3 tools" note — crib is now 41,210 geometry rows incl. a PRISM tab.
- **HSMAdvisor: 1 open `<Cut>`, correctly flagged not-aligned** for 5/6 cells (publishes only the currently-open cut; not queryable per-material).
**Takeaway:** PRISM's physics stands alone correctly; the live vendor crosscheck is DATA-LIMITED (vendors are crib tools without queryable material models — exactly as the engine's honest header documents). The closed loop works mechanically and the comparison is now valid (consensus = aligned baseline).

Wiring: 3 engines → `prism_calc` (`speed_feed_tri_compare`, `speed_feed_exhaustive_sweep`, `speed_feed_downstream_packs`), 16 round-trip tests (commit `86f0e3fe0c`). The round-trips caught 2 contract mismatches (vc nested under `SystemOpinion.axes`; downstream getters snapshot-keyed not zero-arg) — R15 round-trip-through-dispatcher value.

## 5. G-Wizard alignment symmetry (P3 follow-up) — commit `43e1b8e449`
Closed the physics-review P3: only HSMAdvisor was tool-diameter-alignment-checked in the tri-comparator; a misaligned G-Wizard crib tool would pollute consensus the same way. `gwizardSystem` now mirrors `hsmAdvisorSystem` (flag `aligned=false` on >tolerance diameter mismatch; the consensus-prefer-aligned filter auto-excludes it). **Contract bug caught mid-build:** the resolved diameter is at `prep.orchestrator_input.tooling.tool_diameter_mm` (NESTED under tooling), not top-level — first draft read `undefined` and wrongly flagged a matching 12.7mm tool as misaligned. **Lesson:** verify the actual nested path of a bridge's output before reading it (3rd contract-mismatch this session — vc under `.axes`, downstream getters snapshot-keyed, now diameter under `.tooling`). 8/8 tri-comparator + 24/24 SFC.

## 6. SHARED-TREE COMMIT ABSORPTION (lane-discipline, observed `43e1b8e449`)
`git add <my 2 specific files> && git commit` on the shared `cad-fusion-live-ms0` tree **swept in 4 peer-staged files already in the index** (`OllamaTaskOffloaderEngine.ts`, `index.ts`, `fleet-task-health-watch.mjs`+test — none touched by me this session). No work lost (same git author for the fleet), but my SFC commit subject now mislabels 4 peer files — the exact [[reference_h8_misattribution_2026_05_20|H8 misattribution]] the slot-worktree model prevents. **Lesson:** on the shared tree, `git add <specific>` does NOT isolate your commit — anything already staged in the shared index rides along. Either (a) `git stash` peer changes first, (b) commit from a real slot worktree (`H:/prism-slot-oscar`), or (c) accept + note in handoff. The slot-bind also drifted oscar→juliett twice this session (re-claimed via `chat-slots.mjs claim --force`); main-tree-write-block fired once. [[feedback_commit_to_slot_worktree]].

Related: [[reference_sfc_speed_feed_bugs_2026_05_31]] · [[reference_oscar_speedfeed_material_blind_diagnosis_2026_06_01]] (NOTE: that "same Vc for every material" bug is in `prism_calc:speed_feed`, a DIFFERENT path — the tri-comparator's PRISM column IS correctly material-differentiated, verified live this session). · [[feedback_commit_to_slot_worktree]] (shared-tree absorption).
