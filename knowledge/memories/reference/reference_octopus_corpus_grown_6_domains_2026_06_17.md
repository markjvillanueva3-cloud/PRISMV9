---
name: reference_octopus_corpus_grown_6_domains_2026_06_17
description: Octopus consensus corpus grown 1->6 domains (per-galaxy 2-voice); the full consensus-of cross-substrate edge producer chain + what is staged vs regen-gated
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.668Z
aliases: reference_octopus_corpus_grown_6_domains_2026_06_17
---


# Octopus corpus grown 1->6 domains + consensus-of edge chain (slot:bravo, 2026-06-17)

Overnight AI-learning acceleration. After fixing the consensus drain to real 2-voice (forceProbe;
[[reference_consensus_single_voter_vram_probe_2026_06_17]]) and draining the 56-entry backlog 2-voice,
I grew the PER-GALAXY octopus corpus (PSN-OCTOPUS-FLEET-SYNERGY Wave-3) and STAGED the consensus-of edges.

## The consensus-of cross-substrate edge producer chain (verified end-to-end)
A `consensus-of` edge (`ghost.galaxy.<domain>` -> `ghost.octopus_consensus.<domain>`) needs ALL of:
1. **`state/shared/octopus-outcomes/<domain>.jsonl`** — a real per-galaxy octopus consensus outcome.
   Producer: `node scripts/octopus-first-live-record.mjs --domain <d> --prompt "<consensus Q>" --require-min-voices 2`
   (LOCAL-ONLY, forceProbe+prewarm, 2-voice qwen2.5-coder:32b + gpt-oss:20b; ~3-4min/domain on idle GPU).
2. **`ghost.octopus_consensus.<domain>` node in the MERGED graph** — staged by
   `node scripts/generate-octopus-consensus-features.mjs` (CHEAP, reads the outcomes -> writes
   `state/shared/system-viz/octopus-consensus-augmentation.json`; NO 548MB load). Materializes into the
   merged graph only on the next **regen-viz** (FAST[] + merge-augmentations fold).
3. **the cross-substrate edge** — `node scripts/generate-cross-substrate-edges.mjs` confirms the node
   against the merged graph (node-card oracle) and emits the edge. Also regen-folded.

So it is a 2-regen dance, and **regen-viz is the gated step (~24GB, sierra/cron)**.

## What I did (DONE + staged this session)
- Ran octopus per-galaxy across the manufacturing + adjacent decision galaxies -> `octopus-outcomes/` now
  has **13 domains** (was 1=hermes-zulu): + cad, cam, post-processor, speed-feed, wedm, mill, lathe,
  quoting, business, blueprint-vision (the 11 core), then **+ quality** (a Cpk/SPC-gate decision: hold-for-
  100%-inspection vs continue-under-tightened-SPC) **+ shop-floor** (a hot-job machine-routing decision).
  All real local 2-voice (qwen2.5-coder:32b + gpt-oss:20b, successCount 2; blueprint-vision needed 1 retry
  for a transient single-voice). This is the COMPLETE meaningful set: the remaining infra/meta galaxies
  (fleet-hygiene, wiring, discovery, system-viz, academy, frontend, database-expansion, agent-orchestration,
  etc.) have NO genuine domain consensus DECISION, so forcing octopus onto them would be make-work, not
  corpus growth. 13 is the target, not 34.
- Ran generate-octopus-consensus-features -> **13/13** galaxies, 14 `ghost.octopus_consensus.<domain>` nodes
  staged (regen-folded). The 2 new domains are ALSO immediately consumed (regen-INDEPENDENT) by weekly-
  synthesis + ai-systems-fleet-state + the galaxy-reasoning bridge (all enumerate the feed dir dynamically,
  validated). R15 live-validated: the (now silent-loss-hardened) readers read the live ledger (37 entries)
  + all feeds (0 throws). See [[reference_ai_learning_feeder_silent_loss_audit_2026_06_17]].
- Re-ran generate-cross-substrate-edges (still shows consensus-of=1 PRE-regen because the 10 new
  consensus NODES are not in the merged graph until a regen folds the augmentation -- expected).

## CONSUMPTION ACTIVATED (R15-VALIDATE, same session) -- the corpus was reaching a DORMANT consumer
Validated (not assumed) that the grown corpus actually FEEDS a learning consumer. Two consumers read
`octopus-outcomes/`: `octopus-consumption-bridge.mjs` + `octopus-weekly-synthesis-loader.mjs`. Both
enumerate domains DYNAMICALLY (`listOutcomeDomains()` = readdir + SAFE_DOMAIN_RE, NO hardcoded list),
so they auto-pick-up all 11 grown domains -- the corpus growth is genuinely visible, not silently
dropped by a stale subset (the positive validation).

BUT the weekly-synthesis consumption was WIRED-BUT-DORMANT: `WeeklySynthesisEngine.ts:494` applies
`composeOctopusLoader(baseLoader, {outcomesDir})`, but the composer returns the base loader UNCHANGED
unless `PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1` -- and that knob was UNSET everywhere real (only the loader
lib + transcripts referenced it). So the 11-domain corpus did NOT reach the reflective retro: built,
wired, switched off.

FIX (this session, SAFE unattended): set `PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1` in settings.json (C:->H:
mirrored). PROVEN live: knob=1 -> loader composed (3 sources: base + global ledger brief + per-domain
rollup); knob unset -> base passthrough (default-off confirmed); the per-domain rollup folds ALL 11
galaxies' real 2-voice outcomes into the weekly retro. This activates the MCP/dispatcher generation path
(`prism_memory:weekly_synthesis_get` -> `runWeekly()`, which runs in the settings-env-inheriting MCP
server) -- effective on the NEXT MCP launch (the live server keeps its start-time env).

DAYTIME FOLLOW-UP (NOT unattended-safe): the RECURRING path is a Task-Scheduler cron
(`scripts/cron/weekly-synthesis-cron.ps1`, Sunday 8:10pm) whose process does NOT inherit settings.json
env. To activate octopus consumption there, re-register the task with the knob baked into its argument
(`& '$NodeExe' '$TsxCli' '$EngineSrc' --run` -> prepend `$env:PRISM_WEEKLY_SYNTHESIS_OCTOPUS='1'; `) via
`! pwsh -File scripts/cron/weekly-synthesis-cron.ps1`. A scheduled-task re-register is a system mutation
left for an attended/daytime context (operator asleep). Lesson: WIRED != ENABLED -- a default-off knob +
a scheduled-task env gap can leave a fully-built consumption loop silently dormant; verify the env
actually REACHES the consumer (settings.json reaches hooks+MCP+Bash subprocs, NOT Task-Scheduler crons).

## PSN-OCTOPUS-FLEET-SYNERGY knob audit (same session) -- found a 2nd dormant path, enabled it
Applied the same "wired!=enabled" lens to the whole PSN-OCTOPUS-FLEET-SYNERGY-MS0 knob surface
(grep settings.json for each P1-P6 knob):
- **P2 `PRISM_OBSIDIAN_LIVE`** = SET (live brain -> slot context: ENABLED). ok.
- **P5 `PRISM_WEEKLY_SYNTHESIS_OCTOPUS`** = SET (enabled this session, above).
- **P3 `PRISM_GALAXY_MEMORY_OBSIDIAN_MIRROR`** = WAS unset (DORMANT). ENABLED this session.
  It mirrors the 34 `engines/<galaxy>/MEMORY.md` per-domain brain INDEX files into the Obsidian vault
  at `memories/galaxies/<galaxy>/MEMORY.md` (a DISTINCT filename -> CANNOT clobber the ~141 routed
  feedback_*/reference_* copies; concurrency-locked; default-off-for-ship-safety; fail-soft). Runs via
  the Stop hooks (`stop-obsidian-memory-{extract,feed}.mjs`), which DO inherit settings.json env (unlike
  the weekly-synthesis Task-Scheduler cron) -> takes effect on the next Stop. VALIDATED via its test
  `scripts/obsidian-memory-sync.galaxy-mirror.test.mjs` 15/15 (idempotent across runs, MEMORY.md
  survives, routed-file filter selective-not-blanket). High value: the 34 per-domain brain indexes
  become visible to Obsidian's graph + bridge-v2 backlinks + CAG (the master brain).
- **`PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY`** = unset, CORRECTLY OFF (security: private C: memory; left
  OFF -- operator asleep, never enable a private-data path unattended).
Lesson reinforced: a milestone that ships several default-off knobs leaves a synergy SURFACE that may be
mostly dormant; audit every knob (set vs unset) and safely enable the read/non-clobbering ones (defer the
write-risky / cron-env / private ones). Two of bravo's own P5/P3 consumption paths were dormant.

## BROADER AI-learning-substrate knob audit (same session) -- default-off != safe-to-flip
Extended the audit to ALL default-off AI-learning/synergy env gates in scripts/ + scripts/lib/ (grep
`process.env.PRISM_* === "1"`, cross-ref settings.json). Findings:
- The `*_DISABLE` knobs (brain-refresh, memory-route, gcf-xgalaxy, memory-hybrid, index-sidecar,
  obsidian-revival, octopus-corpora, path-embed, rag-hyde, rag-llm-rerank, subagent-galaxy-pack,
  dream-dry-run) are all UNSET = their features are ON by default. Healthy -- do NOT set them (setting=1
  DISABLES the feature). The substrate is mostly LIVE, not dormant.
- 7 dormant FEATURE-enable knobs remain, and NONE are safe to flip unattended (R8 per-knob read proved it):
  `PRISM_GALAXY_BRIDGE_LORA_EMIT` + `PRISM_NNG_DIRECT_EMBED` = india (LoRA/GNN cross-domain);
  `PRISM_DREAM_LLM_SYNTH` + `PRISM_WEEKLY_LLM_SYNTH` + `PRISM_GALAXY_BRIDGE_DEEP` = gate heavy LLM/deep
  work (cost, default-off on purpose); `PRISM_OCTOPUS_LIVE_DISPATCH` = fires REAL 5-voice fan-out incl
  EXTERNAL voices (Grok/Gemini) if keys present -> LLM cost + EXTERNAL DATA EGRESS, MUST stay off
  unattended (the corpus runner sets it LOCALLY + clears external keys -- the safe path); `PRISM_OBSIDIAN_
  LIVE_ENABLE` = unclear vs the already-set `PRISM_OBSIDIAN_LIVE`, don't assume.
META-LESSON: "wired!=enabled" has a LIMIT -- default-off is sometimes ship-safety (safe to flip after
validation: P5/P3) and sometimes a deliberate gate (cost / external-egress / cross-domain / behavior).
Read each before flipping; only the read/non-clobber/local ones are unattended-safe. The 2 safe ones
were bravo's own.

## Remaining (NOT bravo / gated) -> the follow-up
The manufacturing-decision octopus corpus is COMPLETE (11 domains, all staged). The ONLY remaining step
to MATERIALIZE the edges: on the next **regen-viz** (sierra-owned, 24GB-gated, or its cron), the staged
augmentations fold -> a subsequent generate-cross-substrate-edges run materializes **consensus-of 1->11**.
The per-galaxy octopus producer is PROVEN; the bottleneck to materialized EDGES is the gated regen, not
the producer. (Infra/meta galaxies are intentionally excluded -- no domain consensus decision.) Corpus
growth ALSO feeds, regen-INDEPENDENT: weekly-synthesis, ai-systems-fleet-state, audit-ai-synergy, the
galaxy-reasoning-bridge (CAG). Wiki: [[consensus-drain-hardening-race-exit-voice]].
