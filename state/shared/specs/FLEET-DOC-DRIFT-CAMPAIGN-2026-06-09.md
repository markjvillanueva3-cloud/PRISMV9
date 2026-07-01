# Fleet Doc-Drift Campaign — papa-owned (operator directive 2026-06-09)

> **Owner:** slot **papa** (operator: "making your chat slot responsible for all the system wide, fleet wide, galaxy wide updates. utilize ollama when viable.").
> **Mission:** eliminate documentation/config drift fleet-wide for (a) host specs, (b) the new Ollama LLM roster + how/when, (c) /system-viz upgrades — across CLAUDE.md (root + galaxy), memories, wikis, GSD, settings, hooks, scripts, skills, and ALL slash-commands + pipelines.
> **Reality:** multi-file, multi-category, **multi-/compact** marathon. This doc is the durable backbone — resume from here every session. Source of truth for facts: `CANONICAL-HOST-FACTS-2026-06-09.md`.

## VERIFIED replacement ladder (THE key asset — every fix cites this, never guesses)

Installed Ollama roster (live `ollama /api/tags`, 2026-06-09): `gpt-oss:120b`(65GB), `gpt-oss:20b`(14GB), `qwen2.5-coder:32b`(20GB), `qwen2.5-coder:1.5b`(1GB), 5 VLMs (`qwen3-vl:8b-instruct`,`qwen3-vl:8b`,`qwen2.5vl:7b`,`llama3.2-vision:11b`,`moondream:1.8b`), `nomic-embed-text`.

| Stale model (NOT installed) | Canonical replacement | Source of decision |
|---|---|---|
| `qwen2.5-coder:7b` (the doc'd fleet offload default) | `qwen2.5-coder:32b` (heavy code) / `qwen2.5-coder:1.5b` (trivial) | `ModelRoutingEngine.ts:341` (BLACKWELL retirement note) |
| `qwen2.5-coder:3b` (cascade cheap) | `qwen2.5-coder:1.5b` | nearest installed tiny coder |
| `qwen2.5-coder:14b` (cascade strong) | `gpt-oss:120b` (deep) or `qwen2.5-coder:32b` (code) | roster + ModelRoutingEngine |
| deep reasoning / synthesis | `gpt-oss:120b` (fits 96GB VRAM) | the Blackwell unlock |
| mid reasoning / triage | `gpt-oss:20b` | roster |
| embeddings | `nomic-embed-text` (unchanged) | canonical |

## METHODOLOGY (verify-before-replace — most "drift" is NOT actionable)

A naive fleet-wide find/replace of a stale model string would **corrupt** these — EXCLUDE them:
- **Corpus artifacts** (`cad-engine/knowledge_store/doc-*.json`, ~50 files) — record the historical extraction model; leave.
- **Test fixtures** (`*.test.ts/.mjs` using the model id as a literal) — fixture data; leave.
- **Historical comments** (`ModelRoutingEngine.ts:340`, `ConnectionFinderEngine.test.ts:737` — "RETIRED 2026-06-04 ... ollama rm'd") — correct; leave.
- **Synthesis-provenance stamps** (galaxy `MEMORY.md` "qwen2.5-coder:7b-synthesized from N memories") — auto-generated header; fix at the GENERATOR, not per-file.
- **`.bak-*`, `commands-archive/`, `.scratch/`** — not live.

**Fix targets = LIVE config/doctrine only.** And: **runtime fallback + its `.describe()`/doc text must be fixed TOGETHER** — fixing the doc alone makes it lie about the code's actual default (R12).

## Slice inventory (status: [ ] todo / [~] partial / [x] done)

| # | Slice | Scope | Ollama-offload? | Status |
|---|---|---|---|---|
| S0 | Canonical facts | `CANONICAL-HOST-FACTS-2026-06-09.md` + memory | — | [x] done (commit U-CANONICAL-HOST-FACTS) |
| S1 | Ollama cascade/two_pass model defaults | `aiReasoningActionSchemas.ts:2758/2762/2801/2804/2807` (3b/7b/14b ladder) + the consuming `TwoPassEngine`/`CascadeFallbackChainEngine` runtime fallbacks (fix together) | classify w/ 32b | [~] FOUND, not yet fixed (needs runtime-fallback read) |
| S2 | Global + project CLAUDE.md Ollama section | `~/.claude/CLAUDE.md` + `H:/prism/CLAUDE.md` "qwen2.5-coder:7b" offload default → 32b/1.5b + add gpt-oss:120b + 5-VLM ensemble | draft w/ 32b, verify | [ ] |
| S3 | Ollama offload hooks/engine | `.claude/hooks/{ollama-cost-router,prompt-rewriter-ollama,posttool-ollama-rewriter-corpus,...}.mjs` (9) + `OllamaHookBridgeEngine` + `IdeaBlockGovernanceEngine.ts:12` — live model defaults only | per-file judge | [ ] |
| S4 | /ollama-* skills + token-routing doctrine | `.claude/commands/ollama-*` + `feedback_ollama_token_routing` memory | draft w/ 32b | [ ] |
| S5 | Galaxy synthesis-provenance generator | the emitter of "qwen2.5-coder:7b-synthesized" MEMORY.md headers (one fix → all 34) | — | [ ] |
| S6 | /system-viz upgrades capture | track what sierra upgraded (recent commits/memories) → propagate to memories/wikis | summarize commits w/ 120b | [ ] (partly sierra's lane) |
| S7 | Galaxy CLAUDE.md/memories/wikis | spec+ollama refresh × 34 galaxies (most already accurate per S0 — point at canonical, don't re-state) | bulk draft w/ 120b | [ ] |
| S8 | Slash commands + pipelines | ~440 skills/pipelines referencing stale specs/models | bulk classify+draft w/ 120b/32b | [ ] (the big one) |
| S9 | GSD docs | `knowledge/gsd/` spec/model refs | draft w/ 32b | [ ] |

## Ollama-offload execution plan (operator: "utilize ollama when viable")
- **Classification/scan** (which files are live-config vs noise): `qwen2.5-coder:32b` via `scripts/ask-ollama.mjs` or a batch script.
- **Prose drafting** (CLAUDE.md/wiki/memory sections for the new roster): `gpt-oss:120b` (deep) drafts → **papa verifies + commits** (never ship an unverified Ollama edit into canonical docs — R12).
- **Mechanical replacements** (verified stale→canonical literal swaps in live config): deterministic edit, no LLM.
- Papa stays the conductor + verifier; Ollama does the bulk reading/drafting to keep papa's context lean.

## Resume protocol (every session)
1. Read this file + `CANONICAL-HOST-FACTS-2026-06-09.md`.
2. Pick the lowest-numbered `[ ]`/`[~]` slice.
3. Apply the methodology (exclude noise; fix runtime+doc together; cite the ladder).
4. Verify (build/test for code; re-read for docs) → commit `[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOC-DRIFT]/U-<slice>` → tick the box here.


## Progress log (papa session 2026-06-09)
- **S1** DONE f9c36c3707 — runtime ALREADY Blackwell-correct (2026-06-04); doc-only .describe() fix (5 lines).
- **S2** DONE fdffa6669b — global C: + project H:/prism/.claude/CLAUDE.md + 2 vault claude-md mirrors. Galaxy CLAUDE.md = S7.
- **S3** DONE fdffa6669b + 02d682b4aa — EVERY ollama runtime default already 32b; fixed 4 hook comments + 2 engine comments; rest = retirement provenance (left).
- **S4** DONE fdffa6669b — /ollama-* skills already clean; updated feedback_ollama_token_routing + reference_local_llm_routing (doubly-stale 7b->14b->retired) + feedback_obsidian + project_my_hooks; C: auto-memory sources synced H->C.
- **KEY FINDING:** the 2026-06-04 BLACKWELL-MODEL-UPGRADE already migrated ALL runtime/code. This entire campaign is DOC/COMMENT/DOCTRINE drift only — ZERO behavior change. Aligning doc->code is safe (inverse of the usual risk).
- **S5-S9** remaining: launching exhaustive discovery+classify workflow for galaxy docs (x34) + slash commands (x440) + gsd + host-spec drift.
