---
name: feedback_measure_injection_before_dedup_fix
description: "MEASURE the live injection surface BEFORE 'executing' a token/429 dedup fix -- PRISM's per-turn injectors are ALREADY comprehensively optimized (dedup/throttle/rate-limit/keyword-gate). A 2026-06-17 spec directing 'finish the dedup rollout' was fixing a non-problem; reading the code first overturned 5 stale assumptions."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.434Z
aliases: feedback_measure_injection_before_dedup_fix
---


**Measure the injection surface before "executing" a dedup/429 fix -- it is already optimized (2026-06-18, slot:golf).**

**Why:** Under 429 pressure, the obvious lever looks like "per-turn injection is bloated -> finish the static-once
dedup rollout." A 2026-06-17 assessment (`SYSTEM-APPLY-EFFICIENCY-ASSESSMENT`) asserted exactly that as fix #2/#3.
Running `audit-injection-surface.mjs` THEN reading the live code of every named "heavy" injector overturned the
premise: the per-turn surface is ALREADY comprehensively optimized. Five stale assumptions died on contact with
the code:
- `session-reorient-inject` (2708B, top of the byte-probe) fires ~1-in-15 prompts -- the byte-probe ranks by MAX
  single-fire size, NOT per-turn frequency, so a rarely-firing injector tops the "cut list."
- `slot-domain` / `ai-synergy` / `psn-leg` / `model-tier` / `obsidian-vault-precheck` already route through
  `dedupeOrMarker` / `injection-dedup` (1-line marker on repeat within a 5-min TTL).
- `prompt-route-inject` has a 12-char gate + 5-min-per-class throttle.
- `fleet-work-digest` UPS is keyword-gated (`isFleetQuery`) -> ZERO tokens on steady-state turns.
- `discipline-expert-inject` is 5-min-per-discipline-bucket rate-limited + meta-suppressed + slash-suppressed +
  20-char gated (it does NOT even appear in the measured cut list -- the spec's "dumps into golf every turn" was false).
- `master-index` / `memory-index` prechecks have a 60-s same-prompt throttle (kills the /loop-burst repeat) +
  (master) CAG cold-skip + exact-match collapse.

**How to apply:** Before building ANY injection-dedup / token-reduction fix, run `audit-injection-surface.mjs`
(census + `--bytes`) AND read the target hook's actual code for an existing gate (dedup / throttle / rate-limit /
keyword-gate / once-per-session). Do NOT trust an assessment that ASSUMES bloat -- measure it. The byte-probe's
"top by bytes" overstates per-turn cost (it measures max-fire, not frequency). The real 429 lever is NOT per-turn
injection dedup (that work is essentially DONE) -- it is base-context size (CAG cold-anchor already caches it),
free-model offload of analysis off the rate-limited API, and accepting Anthropic-side capacity limits at 16 chats.
The ONE genuine measured gap (the sole knobless injector `ups-domain-bundle`) was closed in `U-UPS-DOMAIN-KILLSWITCH`
(commit 2688fdde17): audit knobless 1->0. This is the R12/"measure before executing" lesson applied to efficiency
work -- measuring first STOPPED a fix for a non-problem (wasted tokens + risk to a working system). Sibling of
[[feedback_read_full_content_not_titles]] (the spec "sounding done/needed" != reading the code) and
[[feedback_never_claim_absence_without_deep_search]].
