---
name: reference-india-post-gaps-2026-05-22
description: india /loop 2026-05-22 — U-JMDIE-POST-GAPS shipped — added gapReport() to JMDiePostProcessorLearningEngine + jmdie_post_gaps action on prism_knowledge; assessed JM Die's 12 enhanced .cps posts and surfaced top high-ROI rollouts
aliases: reference_india_post_gaps_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.619Z
---


# INDIA-POST-GAPS — JM Die post-processor gap analysis shipped (2026-05-22 india /loop)

Session `bde6fa1d`, slot india, /loop iter 3 (was iter 6 of prior task; this is the goal-2 loop after the
post-processor + master-post queue was verified empty in iter 6 of the prior loop). 

User /goal: *"utilize all relevant engines, wiki, tribal knowledge to assess the quality, output, logic,
features and overall value of the current enhanced versions of jm die post processors. can we make further
high roi, revenue making enhancements? | utilize PSN to the max to fill gaps and enhancements"*. PSN ≡ the
PRISM Synergy Network (engines + wiki + tribal + memory + system-viz) — the goal's first clause defines it.

## Assessment finding (iter 1)

Ran `prism_knowledge:jmdie_post_learn` over `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS`. Real REAL parse,
no fabricated data (the engine's own header forbids randomness — explicit contrast with the `Math.random()`
stub `JMDieProgramLearningEngine`).

- **Corpus: 12 enhanced .cps posts**: haas 1 (VF2), hurco 5 (VM30i + master), okuma 5 (M460V-5AX,
  GENOS L400II, LATHE LB3000, MULTUS B250IIW), roku-roku 1.
- **36 learned patterns** (per-family enhancement at conf ≥ 0.5 support).
- **Top fleet-wide adoption (high coverage)**: path_smoothing 12/12, ai_enhanced 10/12,
  chip_thinning_compensation 10/12, aggressiveness_control 10/12, dynamic_depth_feed 9/12.
- **Top fleet-wide gaps (lowest adoption — REVENUE LEVERS)**:
  1. `sidecar_json_export` 1/12 (8%) — the structured-metadata channel that closes PRISM's learning loop on
     every job; rolling to all 12 posts = the #1 high-ROI enhancement (compounding learning, no per-post code).
  2. `physics_data_integration` 1/12 (8%) — PRISM physics-optimized feeds/speeds baked into the post
     (Kienzle/Taylor). Rolling = direct cycle-time + tool-life win = direct revenue.
  3. `spindle_speed_variation` 4/12 (33%) — chatter suppression; cheap rollout.
  4. `imachining_variable_feed` 5/12 (42%) and `load_monitoring` 5/12 (42%) — opportunity.
- **Per-family imbalance**: okuma 0/5 carry `prism_physics_integration` (hurco 5/5 do). Okuma family is the
  largest gap for the physics rollout.

## Built (iter 2)

`U-JMDIE-POST-GAPS` (commit `119c432034`) — added `gapReport()` to `JMDiePostProcessorLearningEngine` +
the `jmdie_post_gaps` action on `prism_knowledge`. Turns the engine's existing learned-pattern data into
the actionable gap surface that did not exist before:

- `postGaps[]` — per-.cps, the family patterns (conf ≥ threshold) the post lacks while siblings carry.
  Single-post families naturally yield empty (math: 1/1 pattern means the lone post already has it).
- `corpusWideGaps[]` — markers <50% adoption; on the real corpus this surfaces the 5 fleet-wide gaps above.
- `recommendations[]` — prioritized human-readable rollouts (corpus-wide first, then per-post).
- `valueScore` — post.enhancementCount / 15 markers, in [0,1].

Pure read over `getCorpus()` — no I/O, no randomness, deterministic sorts. Fail-soft on unreachable corpus
(`profileCount===0` → empty arrays + warning). Empty arrays may be stripped at MCP transport by
responseSlimmer; the dispatcher test handles via `?? []`.

**Files**: engines/JMDiePostProcessorLearningEngine.ts (+ interface + method), tools/dispatchers/knowledgeDispatcher.ts
(enum 6→7 jmdie_post_*), __tests__/JMDiePostProcessorLearningEngine.test.ts (+10 engine cases),
__tests__/knowledgeDispatcher.jmdie-post-wire.test.ts (+2 round-trip cases + regression-guard 6→7).
**Tests**: 51/51 PASS (39 engine + 12 dispatcher). **tsc**: clean on changed files (25 pre-existing errors
elsewhere unchanged). **Scrutiny**: 3-of-3 PASS, 0 blockers (iter 3).

## Reusable findings

1. **Peer-absorption again** — the knowledgeDispatcher diff is +1169 / -1 lines, but my actual add is ~15
   lines. Peer dispatcher work landed in the working tree unstaged and got swept into my `git add`. Same
   shared-tree git-add window pattern as [[reference_iter2_html_adopt_misattribution_2026_05_18]] +
   [[reference_h8_misattribution_2026_05_20]]. The work is correct; the banner is misattributed. The slot-
   worktree migration is the long-term fix.

2. **Engine test file was untracked** — `JMDiePostProcessorLearningEngine.test.ts` (469 pre-existing lines)
   was on disk but never committed (similar to the 4 dropped CADAppCircuitBreaker / etc. test files I
   restored earlier in this session). The U-JMDIE-POST-GAPS commit now tracks it — +629 lines = 469
   pre-existing + 160 my additions. Future close-out audits should expect this to be the file's first commit.

3. **No `train()` on the deep-learning engines** — the 3 AI-TRAINING-FIRST-MS0 post units I confirmed
   non-actionable in iter 6 of the prior loop hold: `CNCControllerDeepLearningEngine` / `PostProcessorDeepLearningEngine`
   / `PostProcessorMetaLearningEngine` embed their knowledge bases, no training infrastructure to feed corpus
   to. The high-ROI work is in the ENHANCED `.cps` posts and their analysis (this commit), not in retraining
   the heuristic engines.

## Next india work (loop iter 3/20 — left running)

The /loop is `running` (not ended). The next high-ROI iteration's natural pick is one of:

- **Sidecar rollout migration** — auto-generate a sidecar_json_export patch for the 11 posts that lack it
  (the corpus has the working pattern in PRISM-Master-Hurco-VM30i.cps; mining it into a `.cps` patch
  generator + applying to the 11 missing posts = the compounding-learning win).
- **Physics-integration rollout for okuma family** — the okuma 5-post sub-corpus has the cleanest gap
  signal (5/5 missing `prism_physics_integration`). A focused patch generator scoped to okuma posts.
- **`/system-viz` integration** — surface `corpusWideGaps[]` + `postGaps[]` as a roost in /system-viz so
  the gap analysis is visible across the fleet, not just queryable.

All three are safety-relevant (modifying actual `.cps` source that drives JM Die's real iron) — require
the per-file scrutiny gate + S(x)≥0.98 shop-floor tier + an operator-approved migration plan.

See [[reference_india_queue_complete_2026_05_22]] · [[reference_india_post_wire_2026_05_22]] ·
[[feedback_ai_training_first_before_revenue]] · [[feedback_high_roi_backend_first_slot_queue]] ·
[[reference_iter2_html_adopt_misattribution_2026_05_18]].
