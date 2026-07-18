---
title: Parallel-Hermes knowledge enrichment -- the reusable method
layer: lessons
tags: [hermes, knowledge-enrichment, grok, tribal-ingestion, r12-verification, orchestration, zulu]
created: 2026-06-29
by: slot:zulu
status: durable
related:
  - HERMES-KNOWLEDGE-ENRICHMENT-PRIMARY-DOMAINS-2026-06-29.md
  - HERMES-KNOWLEDGE-ENRICHMENT-WAVE2-2026-06-29.md
---

# Parallel-Hermes knowledge enrichment -- the reusable method

How to enrich PRISM's per-domain knowledge system with external authoritative knowledge using the Hermes/Grok lane, safely. Distilled from the 2026-06-29 campaign (84 cited items across mill/lathe/wedm/cam/post/cad, commits `d2531c3ba8` wave-2 + `ffa0e0a55f` staging). The VALUE here is the method, not the items (items live in the two specs above).

## When to use
Operator asks to "improve the domains with maximum knowledge" / "utilize parallel hermes agents." The Hermes proxy gives a STRONG cloud-reasoning lane (xAI Grok) that runs OUTSIDE Claude's context window and is free -- ideal for breadth research a domain specialist then verifies.

## The method (5 steps)

1. **Verify the lane FIRST.** `mcp__hermes__hermes_status` -> require `authenticated:true`. `ask-hermes` silently falls back to Ollama if the proxy is dark, so a dark lane yields weaker results with no error. Never route real work on an unverified lane. [[reference_hermes_live_utilized_2026_06_29]]

2. **Fan out 1 agent per domain, in parallel, via direct `mcp__hermes__hermes_ask`** (NOT Claude subagents -- the fanout-gate blocks Claude-subagent Workflows on cost; direct Hermes calls have no gate and stay out-of-context). Model `grok-4.20-0309-reasoning`. Ask for cited, NON-OBVIOUS items with: rule + concrete formula/numeric-threshold + worked micro-example + EXACT source/page + a safety flag.

3. **DIVERGE on later waves.** Give wave N the titles wave N-1 already produced and instruct "do NOT repeat these; go deeper." Wave 1 = high-level rules; wave 2 = numeric thresholds + worked examples + page cites. Prevents the duplication a naive re-ask produces.

4. **R12-reconcile EVERY formula yourself -- dimensionally AND arithmetically.** This is the load-bearing step. Grok is an LLM: in this campaign the rules + formula STRUCTURES were sound and every source was a real canonical reference (Altintas, Machinery's Handbook, Shaw, Sommer, Guitrau, ASME Y14.5-2018, ISO 10303), BUT ~6 of 84 WORKED-NUMBER examples had arithmetic slips (e.g. ball-nose contact SFM computed 7.7 m/min, Grok wrote 34; helical pitch pi*D*tan(a)=1.25 not 0.40). The GD&T/geometry block had zero errors (facts, not arithmetic). Flag each slip `[ARITH?]` with your recompute: ingest the rule+formula, NOT the bad number.

5. **Stage, never write the live index.** Two outputs: (a) a cited markdown spec (human + machine readable); (b) a machine-ingestable staging file in the canonical capture-tip schema (`state/tribal_captured_tips.json` shape) via `scripts/stage-hermes-knowledge-tips.mjs`, written to `state/shared/staging/`. The shard-safe tribal writer is golf/india-owned -- hand-writing the live sharded index risks the clobber that wiped the brain before [[reference_tribal_shard_read_clobber_2026_06_10]]. Route the staging file to them via the chat bus; embedding is one writer-run.

## Confidence + safety mapping (staging script)
- `[C]` confirms existing doctrine -> confidence 70 (cross-validation of an auto-firing gate)
- `[N]` new/extends -> 55
- `[ARITH?]` worked-number suspect -> 40 + in-body recompute caution
- `safety=yes` -> tag `safety:gate-candidate` + `needs_specialist_confirm`: advisory KNOWLEDGE recall is fine to ingest, but the domain specialist (foxtrot/whiskey/mike/kilo/echo/delta) confirms the THRESHOLD vs the cited page before it drives an auto-fired S(x)/machine-motion gate. Never fire a shop-floor safety gate on LLM assertion alone.

## Why this is safe orchestration (zulu)
zulu RESEARCHES + STAGES + ROUTES; it does not write domain gates or the live brain. The specialists own gate-firing; golf/india own the embed. The campaign produced advisory knowledge + a turnkey artifact, with the irreversible/safety-critical steps left to their owners.

## The engineered harness (supersedes the manual campaign, 2026-06-30)

The manual fan-out above was productized into a durable cron: `scripts/hermes-domain-enrichment-loop.mjs` ("PRISM Hermes Domain Enrichment" scheduled task, hourly). One run = one parallel pass over all 6 domains, each on a ROTATING focus axis, dedup-merged into a per-domain ledger (`state/shared/hermes-enrichment/<domain>.json`), with novelty-stop exhaustion (`< NOVELTY_FLOOR` fresh -> dryStreak++; `DRY_STREAK_MAX` dry runs -> domain EXHAUSTED). It accumulated 91 -> 269+ cited items autonomously. The stack, in dependency order:

1. **No-downtime lanes (per-CALL failover, not per-resolve).** `makeFailoverAsk` tries lanes in order; first non-empty content wins; a dark / health-200-but-404 / timeout / empty lane is skipped. Order: local-grok (:8645) -> local-ollama (:11434, gpt-oss:20b, ALWAYS-up floor) -> cloud-groq/google/openrouter/nvidia (each env-gated on its API key). A `/health` probe does NOT predict call success -- see [[health-probe-does-not-predict-call-success]]. The Ollama floor is why the cron never produces zero even when every cloud/grok lane is dark.
2. **H-drive grounding (input).** `composeGrounding(domain)` injects, into every generation prompt, the densest shop knowledge we have: page-cited PDF facts FIRST (`loadCitedTips` samples `headline:|title:` from `milling-pdf-cited-tips.ts` / `wedm-knowledge-tips.ts` / `controller-knowledge-tips.ts` / `*-cam-tips.ts` / `lathe-physics-science-tips.ts` -- 5/6 domains; cad has none) then `loadGrounding` MEMORY.md domain context (machines/gotchas/gates). This CONSUMES existing miner output (never rebuilds a miner -- india/lima/kilo own those) so generation is PRISM-specific and DIVERGES from what the shop already knows. Knobs: `PRISM_HERMES_ENRICH_GROUND[_CAP|_TOTAL]`, `_CITED_CAP|_N`.
3. **Quality pre-screen (output).** `scoreTip(item)` -> `{score, tier, flags}`: a PURE STRUCTURAL triage (no physics judgment) of the signals that make a tip actionable -- numeric threshold (dominant), unit, citation, specificity. `emitStaging` stamps every staged tip + a `qualitySummary` rollup. Lets specialists hit the weak items first.
4. **Specialist review digest (usability).** `renderDigest`/`emitDigest` -> `state/shared/staging/hermes-enrichment-digest.md`: per-domain, quality-sorted markdown (HIGH inline, LOW collapsed with flags). Refreshed every cron run (wired in `main`). Closes the "usable when needed" half for the verify step.
5. **Broadened extraction (18 axes).** The focus-axis array drives divergence; expanded 12 -> 18 with categories distinct from the originals (chatter/stability DYNAMICS, coolant/chip-evacuation, tool-WEAR-MECHANISMS, in-process probing, automation/lights-out, edge-prep/coating). More distinct axes -> more extraction before exhaustion -> closer to "maximum knowledge."

Boundary unchanged: every tip is `verify:unreviewed-cron` + `needs_specialist_confirm`; specialists verify vs the cited source before any gate fires; golf/india embed via the shard-safe writer; the cron writes ONLY ledgers + staging, never the live tribal index. Commits: `a39e47efd2` (MEMORY grounding) `cb22451f72` (cited grounding) `48a580e2d9` (quality screen) `57eeb41376` (digest + scoring fix) `84a4843955` (18 axes).

## Two bug-class lessons (this build)

- **Score the signal WHEREVER it appears, not just the field you expect.** `scoreTip` first checked only the parsed `formula` field for a number, so tips whose threshold was in the rule/title (the floor model often emits a freeform `Rule -- ... <num>` instead of clean (a)-(e)) were false-flagged `no-number` -> low-tier. Fix: test `title + formula`. Live impact: `{high:131,mid:0,low:65}` -> `{high:146,mid:106,low:17}` -- 60+ usable tips rescued. The digest's FIRST use surfaced this (a review surface earns its keep by exposing the producer's defects).
- **In the shared `H:/prism` tree, commit small + fast -- large uncommitted changes get eaten.** Mid-build, peer git ops (active `[MAIN-FORCE]` commits + a peer `git stash`) reverted my ~80-line digest definitions off disk while leaving the smaller surviving edits, producing an INCONSISTENT file that passed `node --check` + tests (which never run `main()`) but would have crashed the cron with a ReferenceError (`emitDigest` undefined). Caught via an ESM import failure; recovered by re-applying + commit-fast; verified with `git show HEAD:<file> | grep`. Lesson: in a contended shared tree, every uncommitted minute is loss-exposure -- ship in small commits, or use a slot worktree.

## See also
[[reference_hermes_cloud_local_architecture_2026_06_29]] (the two Hermes layers) . [[reference_approach_firing_all_six_domains_complete_2026_06_29]] (the auto-firing gates this knowledge cross-validates) . [[feedback_psn_definition]] (wiki + tribal are PSN retrieval legs = the "pulled automatically" mechanism)
