---
name: reference-galaxy-transcript-mine-2026-06-09
description: "Generalized transcript->galaxy miner: scripts/mine-galaxy-transcripts.mjs + lib/galaxy-mining-registry.mjs Ollama-mine session transcripts into per-galaxy vault memos for all 34 galaxies (was 2 hand-cloned per-domain miners). 33/34 galaxies have mineable transcripts. Proven end-to-end on speed-feed. Compounding into brains REQUIRES sidecar rebuild + synthesis-refresh after mining (not automatic)."
type: reference
galaxy: knowledge-conversion
source: prism-memory
synced: 2026-06-27T20:30:46.587Z
aliases: reference_galaxy_transcript_mine_2026_06_09
---


2026-06-09 (slot:kilo, DESKTOP-N7MI1VB). Operator /goal: "utilize ollama to read through all session transcripts ... populate corresponding domains and galaxies with data and knowledge (memories, wiki, tribal, claude.md, gsd, prism awareness) so they have full current context on what they're building, what's left, how, what tools to use. goal clear: every galaxy/domain accounted for."

## What was built (R8: extend, don't fork)
The fleet had TWO hand-cloned per-domain transcript miners (`mine-hotel-transcripts.mjs`, `mine-india-transcripts.mjs`). Cloning 32 more = 32 forks that drift. Instead generalized into ONE registry-driven miner:
- **`scripts/lib/galaxy-mining-registry.mjs`** — maps each of the 34 galaxies to `{slots[], topic RegExp, vocab}`. `classifyHandoff(filename)` parses a HANDOFF filename -> `{id, topic, galaxies[], mineable}`. Handles 4 id-schemes (short 8-hex, long full-UUID, `Agent@HOST_<uuid>`, slot-keyed) + `.archive.<date>` suffix. Grounded in CHAT-SLOT-DOMAINS.md + the engine subdir roster.
- **`scripts/mine-galaxy-transcripts.mjs`** — the proven india/hotel pipeline (stream JSONL spine -> Ollama MAP/REDUCE per session, RESUMABLE -> cross-session SYNTHESIS via gpt-oss:120b -> per-galaxy vault memo) run once PER GALAXY, prompts specialized by the registry `vocab`. Output: `knowledge/memories/reference/reference_<galaxy>_transcript_synthesis.md` with the goal's named sections (What it's building / Shipped / What's still to build / How / Tools to use).
- **`scripts/mine-galaxy-transcripts.test.mjs`** — 22 tests (registry completeness, 4-scheme classification, honest 4-bucket accounting, shrink-guard, limiter, preSince split).

## Live-validated (R15 step 3)
- Dry-run across the real corpus: **2,097 topic-bearing handoffs | 310 no-galaxy | 104 classify-only (slot-keyed) | 0 excluded-by-SINCE | 474 transcript genuinely gone | 33/34 galaxies have >=1 mineable transcript**. Only `dormant-data`=0, and that is CORRECT (its owning slot `victor` is UNASSIGNED per CHAT-SLOT-DOMAINS.md) -- surfaced loudly by the ZERO-COVERAGE summary line, not a silent hole.
- Foreground proof: mined `speed-feed --limit 2` -> a real 12KB vault memo, all 5 sections, slug-tagged, 0 CR.

## THE integration finding (R12 -- the handoff is NOT automatic)
A freshly-written vault memo is INVISIBLE to `galaxy-synthesis-refresh.mjs` until the recall sidecars are rebuilt: its staleness check clusters on embedding-recall topK; a memo absent from the index never changes the cluster hash -> the galaxy reads `fresh` and the memo is never compounded into `<galaxy>/MEMORY.md`. PROVEN: after writing the speed-feed memo, synthesis-refresh read `{fresh:34}` (compounded nothing); only after `build-memory-index-sidecar.mjs` + `build-memory-embeddings-sidecar.mjs --resume` did the memo enter the cluster (`mined memo IN cluster: true`), making the galaxy stale -> compoundable. The reviewer-flagged doc-comment overstatement (frontmatter is NOT the routing key -- the galaxy SLUG IN THE FILENAME is) was corrected. The miner's DONE message now names the REQUIRED 3-step post-run sequence.

## Scrutiny (per-file 2-arm gate)
Both reviewers PASS, 0 P0/P1 in code-correctness. silent-failure-hunter surfaced 4 goal-critical P1 honesty findings, all FIXED + regression-tested: (A) doc-comment overstated the synthesis-refresh mechanism; (B) DONE summary didn't roll up zero-coverage galaxies; (C) `noTranscript` conflated pre-SINCE (re-includable) with genuinely-gone -> split into `preSince`/`missingFile`; (D) `empty`-status digests inflated `coverage_sessions` -> excluded.

## What actually ran (R12 -- honest outcome, not the plan)
**4 galaxies genuinely populated** with real complete memos (all sections, 0 CR, coverage frontmatter): `cam` (8.3KB, cov=2), `mill` (9KB, cov=3), `speed-feed` (12KB, cov=2), `ai-training`/india (prior session). Proven memo->cluster->compoundable on speed-feed.

**TWO hard environmental constraints blocked full in-session population (R12 -- the reason --all cannot run as a bg job here):**
1. **The fleet-reaper kills it.** A `--all --limit 3` background run was REAPED mid-`mill` (the Stop-hook fleet-reaper sweeps long detached node procs under load -- the exact R14 hazard). Resumable digests survived (a re-run skips them) but the synthesis never completed. The harness also auto-backgrounds any long foreground run, re-exposing it to the reaper. A subsequent loop's `cad` proc STALLED under GPU contention (CPU 0.59, no progress) and was R14-reaped.
2. **The compound re-embed is flaky under GPU contention.** `build-memory-embeddings-sidecar.mjs --resume` needs `nomic-embed-text` (IS pulled), but with the 64GB gpt-oss:120b resident the embed model couldn't reliably load -> the new cam/mill memos are in the BM25 index (rebuilt, 13,419 records) but not yet the dense topK cluster. speed-feed made it in when the GPU was freer.

**FULL population = OPERATOR-PROTECTED foreground run (not a bg/detached job):**
```
# In a foreground shell the reaper won't sweep, ideally with the 120b unloaded:
node scripts/mine-galaxy-transcripts.mjs --all          # or per-galaxy batches; resumable
node scripts/build-memory-index-sidecar.mjs             # step 1
node scripts/build-memory-embeddings-sidecar.mjs --resume  # step 2 (needs GPU headroom for nomic-embed-text)
node scripts/galaxy-synthesis-refresh.mjs               # step 3 -> compounds into <galaxy>/MEMORY.md
```
Then 33/34 galaxies carry current build-context (dormant-data structurally empty -- victor slot unassigned). goal-clear = the dry-run's 33/34 + the 4 proven + the operator sweep.

See [[reference_india_transcript_mine_2026_06_09]] (the per-domain precedent generalized), [[reference_obsidian_fully_operational_2026_06_09]] (recall infra this feeds), [[feedback_utilize_ollama_for_efficiency]] (the standing Ollama-offload directive), [[feedback_agent_fanout_gate_on_fleet_load]] (why --all is operator-gated not auto-fired).
