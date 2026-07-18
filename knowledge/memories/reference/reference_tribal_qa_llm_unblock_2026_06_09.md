---
name: reference_tribal_qa_llm_unblock_2026_06_09
description: "U-TRIBAL-QA-LLM-UNBLOCK (sierra 2026-06-09, commit 6fb278a2ee): unblocked LLM Q-A in distill-tribal.mjs (was heuristic-only on a dead 'Ollama not loaded 2026-05-08' premise). OLLAMA-SYNERGY backlog #2. LIVE: gpt-oss:120b is the blackwell-best synthesis model and produces clean Q-A through callOllama (RECONCILES the prior gpt-oss empty-response rejection)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.228Z
aliases: reference_tribal_qa_llm_unblock_2026_06_09
---


**U-TRIBAL-QA-LLM-UNBLOCK** (slot:sierra, 2026-06-09, commit `6fb278a2ee`, cross-chat permission). OLLAMA-SYNERGY backlog #2 ([[reference_ollama_synergy_audit_2026_06_09]]) -- the "tribal knowledge creation" surface the operator goal names.

## What
`scripts/distill-tribal.mjs` (Akshay/Iternal IdeaBlock distiller: TF-IDF-cluster near-dup tribal tips -> one canonical Question/Answer block each) derived the retrieval **Question** heuristically ("How do I {first 10 words}?") on a stale premise -- header + audit literally said *"Ollama models not loaded as of 2026-05-08"*. That premise is dead (daemon serves 10 models). Wired a real LLM Q-A synthesis path.

## How (R8 reuse, R5 split)
- CLUSTERING stays deterministic TF-IDF (no LLM) -- a pure transform answers it (R5).
- Q-A SYNTHESIS reuses the CANONICAL infra (no forked call path): `callOllama` from `scripts/ask-ollama.mjs` + `resolveSynthesisModel`+`fetchInstalledModels` from `scripts/lib/host-aware-synthesis-model.mjs`.
- ollama-up GATE: ONE `fetchInstalledModels` probe up front (avoids N per-cluster timeouts when down), reused as resolveSynthesisModel's `available` set. up -> `llm:<model>`; down / `--no-llm` -> `heuristic-no-llm`.
- per-cluster FAIL-SOFT: model `{ok:false}` OR unusable text (`sanitizeQuestion`->null) -> heuristic question, method `heuristic-fallback`, never aborts the run. Output never regresses, only improves when Ollama is up.
- model = host-aware STRONGEST viable (resolveSynthesisModel best tier); `--model` / `PRISM_DISTILL_TRIBAL_MODEL` override.
- import-safe: arg-parse + `main()` behind an `isMain` guard (`pathToFileURL(process.argv[1]).href===import.meta.url`) so tests import without triggering a `canonical/` wipe; `indexPath`/`outputDir`/`callImpl`/`fetchModelsFn`/`resolveModelFn` injectable.
- audit schemaVersion 1->2: `qaModel` + `qaCounts{llm,heuristicFallback,heuristic}` + honest `qaExtractionMethod`; per-block frontmatter `qa_via:`. (No downstream consumer reads `_DISTILL_LOG.json` -- grepped; `stop-tribal-distill-suggest.mjs` reads a different jsonl.)

## R12 reconciliation (the important finding -- supersedes prior gpt-oss rejection)
LIVE validation (real corpus sample, real daemon, tmp output -- never touched the live `canonical/`): the daemon resolved **`gpt-oss:120b` as `blackwell-best/best`** for `search_synthesis` (NOT qwen2.5-coder:32b as the resolver's own comment guessed), and it produced **7/7 clean retrieval questions** through `callOllama`, 0 heuristic-fallback (e.g. "How do I set up cutter radius compensation for open and closed contour milling in hyperMILL?"). This **reconciles** the [[reference_viz_wiki_narrative_2026_06_09]] + [[reference_ollama_prewarm_wire_2026_06_09]] gpt-oss rejection: the empty `.response` was **num_predict starvation** (128 default starves the harmony `thinking` channel before `response`) and/or the `generateBlurb` 30s-timeout cold-load -- NOT a fundamental harmony incompatibility. Through `callOllama` (num_predict 1024 cap + 180s timeout) gpt-oss:120b is fully viable and IS the host's strongest synthesis model -- exactly the goal's "strongest possible viable." Set `QA_NUM_PREDICT` default 1024 for reasoning-model headroom. **Do NOT re-reject gpt-oss for /api/generate text -- size num_predict (>=1024) for the thinking channel.**

## Validated
19/19 tests (clustering intent, prompt build, sanitize adversarial incl instruction-echo, LLM gate, per-cluster fail-soft mixed counts, parseArgs+env, render mutation-verified non-tautological, main() tmpdir round-trip up/down/--no-llm/dry-run). Live gpt-oss:120b 7/7. 3-of-3 A/B/C all PASS (0 P0/P1; P3 notes: sanitizeQuestion `/begin with how/` over-match + pre-existing `process.exit` in main index-load -- both fail-soft, deferred).

## Activation
On by default WHEN Ollama is up (heuristic is now the fallback, not the ceiling). `node scripts/distill-tribal.mjs` -> LLM Q-A; `--no-llm` forces heuristic; `--dry-run` never contacts Ollama. Re-distilling the full corpus is ~70K Claude-tok saved vs doing Q-A in-context.
