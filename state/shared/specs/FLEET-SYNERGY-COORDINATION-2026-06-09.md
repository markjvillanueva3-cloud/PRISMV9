# FLEET-SYNERGY COORDINATION PLAN — 2026-06-09 (slot:bravo)

> Produced by the `fleet-synergy-coordination` ultracode Workflow (6 PSN substrate assessors → adversarial verifiers → synthesis). 2 of 6 assessors (systemviz, federation) hit transient API rate-limits and were dropped; synthesis ran on the 4 survivors. **4 already-built false gaps were dropped by the adversarial verify stage** (the skepticism worked). Every "CREATE/EDIT" below is a TO-BE-BUILT target — nothing was created by the workflow.

## Bravo-verified premises (post-synthesis, 2026-06-09)
- **#1 octopus live runner** — `scripts/octopus-with-hermes-rag.mjs:80` `LIVE_DISPATCH` off by default; lines 168/219 are an explicit staging-stub ("set `PRISM_OCTOPUS_LIVE_DISPATCH=1` to go live"). NOTE: `state/shared/octopus-outcomes/` DOES exist (plan said it didn't) — verify it is actually fed before scoping a runner.
- **#3 federation typed-edge layer** — `scripts/lib/galaxy-knows-map.mjs` has 0 refs to the typed edges (pure TF-IDF); `state/shared/system-viz/cross-substrate-edges-augmentation.json` exists with 165 live `owned-by-slot` edges. REAL, clean, independent of #1.
- **#2 unblock** — `MultiModelConsensusEngine` default panel `["gpt-oss:120b","gemma4:31b","qwen2.5-coder:32b"]` (`:91`); the "needs a 2nd model" deferral premise is dead. CAVEAT: `gemma4:31b` is NOT on the canonical resident roster (CANONICAL-HOST-FACTS-2026-06-09) — handle/replace before relying.

## Dependency-ordered plan (R13: verifiable producer before consumer)

| # | Bucket | Item | Gate |
|---|--------|------|------|
| 1 | BRAVO-SOLO | **Live the octopus producer (keystone)** — `octopus-with-hermes-rag.mjs` LIVE_DISPATCH off; downstream (WeeklySynthesis + viz roost + `consensus-of` emitter) read a fail-soft empty feed. | blocks 2,6 |
| 2 | BRAVO + india/sierra | **`consensus-of` edge emitter** — add branch to `generate-cross-substrate-edges.mjs` once #1 produces a real ledger. | gated on #1 |
| 3 | BRAVO + sierra | **Feed typed edges into the federation router** — `galaxy-knows-map.mjs` blind to the 165 `owned-by-slot` edges. | independent |
| 4 | BRAVO-SOLO | chat-bus author-class filter — `SKIP_AUTHORS` in `chat-bus-inject.mjs` `readUnreadMessages()`. | low pri |
| 5 | BRAVO + papa | slot-task-claim adoption audit — confirm `/pick-unit --slot` passes `--chatId` + Step-12 heartbeats. | audit |
| 6 | OTHER-LANE: alpha | Wiki→tribal embed 17% (PSN leg #5 recall-blind) — first action is the V8 512MB write-side shard fix. | alpha |
| 7 | OTHER-LANE: alpha/golf | Coverage-denominator cry-wolf — split `walkMd` curated/corpus in `wiki-tribal-cross-ref-audit.mjs`. | alpha/golf |
| 8 | OTHER-LANE: papa/golf | Knowledge-leg-wiring audit — assert all 4 injectors co-wired in BOTH settings files; extend `hook-health-check.mjs`. | papa/golf |
| 9 | OTHER-LANE: tango/india | Cross-galaxy capability forks (11 LoRACadence clones) — `/dedup` cluster scan FIRST (some carry real per-domain physics). | tango |
| 10 | OPERATOR-GATED | Ollama offload ~6% — route reasoning sub-tasks not the prompt; fleet-wide behavioral change. | operator |

## Execution note
Bravo is taking **#3 first** (clean, independent, no LLM spend, pure-function testable) then investigating + building **#1** (the keystone). Items 6–10 are NOT bravo's to ship — surfaced here so their owning slots can pick them up.
