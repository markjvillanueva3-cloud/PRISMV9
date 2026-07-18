---
name: fleet-doc-drift-campaign-runtime-already-blackwell-migrated-drift-is-doc-only
description: "papa's fleet-wide doc-drift campaign (2026-06-09). KEY FINDING — the 2026-06-04 BLACKWELL-MODEL-UPGRADE already migrated EVERY Ollama runtime default; the \"drift\" operators see is purely stale doc/comment/doctrine text naming retired :3b/:7b/:14b/deepseek-r1:14b. Verify the canonical runtime FIRST, then align doc->code."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.555Z
aliases: reference_doc_drift_campaign_2026_06_09
---


**Fleet doc-drift campaign** (slot papa, 2026-06-09). Operator: *"update everything on new pc specs, new ollama llms how/when, /system-viz upgrades... claude.md/memories/wikis across all galaxies, gsd, skills, scripts, hooks, ALL slash commands and pipelines."* Papa owns it fleet-wide.

**KEY FINDING (the whole campaign's premise):** the `BLACKWELL-MODEL-UPGRADE` (2026-06-04) ALREADY migrated **every Ollama runtime default** to the Blackwell roster. Verified live, not assumed:
- `aiReasoningDispatcher.ts:3180-3256` two_pass=1.5b/32b, cascade=1.5b/gpt-oss:20b/32b
- `prompt-rewriter-ollama.mjs:84`=32b, `memory-mirror-to-vault.mjs:181`=32b, `checkin-recall.mjs:47`=32b, `fleet-reaper-host-presets.mjs`=32b
- `MultiModelConsensusEngine.ts:245` DEFAULT_OLLAMA_MODEL=gpt-oss:120b; `ollama-task-offloader.mjs` already category-router (not the old hardcoded list)
- galaxy synthesis (`galaxy-{meta,reflection}-synthesis`, `galaxy-synthesis-refresh`) already use `resolveSynthesisModel` (host-aware -> 32b) with DEFAULT_MODEL=32b fallback.

So the campaign is **DOC/COMMENT/DOCTRINE drift ONLY — zero behavior change.** Aligning doc->code is SAFE (the inverse of the usual "fixing the doc alone makes it lie about code" risk — here the code is right, the doc is wrong).

**Methodology (reusable for any model/spec drift):**
1. **Verify the canonical runtime FIRST** — it's almost always already correct. Don't blind find/replace.
2. **EXCLUDE from fixes (these are CORRECT history — rewriting falsifies it):** historical `reference_*` memories, test fixtures, retirement comments ("retired 2026-06-04 / rm`d / legacy"), `-synthesized from N memories` provenance stamps (self-heal on next synth run), `.bak*`, `commands-archive/`, `knowledge_store/` corpus.
3. **FIX targets = LIVE config/doctrine only** that tells a future reader/operator what to use NOW.
4. **Canonical roster:** qwen2.5-coder:32b (heavy/default) / :1.5b (trivial) / gpt-oss:120b (deep) / gpt-oss:20b (mid) / 5 VLMs / nomic-embed-text. Retired: :3b/:7b/:14b/deepseek-r1:14b. Replacement ladder + how/when: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md`.

**Commits:** S1 `f9c36c3707` (schema .describe()), S2-S4 `fdffa6669b` (CLAUDE.md + 4 hooks + 2 cmds + 4 memories), S3-engine `02d682b4aa`. Backbone: `state/shared/specs/FLEET-DOC-DRIFT-CAMPAIGN-2026-06-09.md`. S6-S9 swept by workflow `doc-drift-sweep`.

Related: [[reference_canonical_host_facts_2026_06_09]] · [[feedback_ollama_token_routing]] · [[feedback_auto_fix_and_blackwell_fleet_enforced]] · [[reference_blackwell_model_retirement_2026_06_04]]
