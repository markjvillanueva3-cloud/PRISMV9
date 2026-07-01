---
name: reference-vault-to-ai-feeders-2026-06-09
description: "Obsidian vault -> PRISM AI systems: built a vault->GNN reference-pool feeder (vault-to-gnn-refpool.mjs, +4 confirmed wirings) and a vault->LoRA training-pair extractor (vault-to-lora-dataset.mjs, 245/247 feedback memories -> Alpaca triples). Distinct doctrine signal from india's DB/program-driven builders. Also fixed the >512MB graph read/write bug in seed-ghost-from-unwired.mjs (--apply now works)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.251Z
aliases: reference_vault_to_ai_feeders_2026_06_09
---


2026-06-09 (slot:kilo, DESKTOP-N7MI1VB). Operator: "can we utilize obsidian for the prism ai systems: lora, nn, gnn, cag, rag, etc...?" -> after a lean-ultracode survey (no `agentType` overrides — the full-tool-payload OOM lesson), built the two NON-OVERLAPPING gaps. RAG+CAG already consume the vault (memory-rag-inject + cag-router); NN is research-blocked on the ref-pool; the real gaps were the GNN ref-pool feed and a LoRA doctrine corpus.

**1. vault->GNN reference-pool feeder** (`scripts/vault-to-gnn-refpool.mjs` + `.test.mjs`, 9/9).
Extracts CONFIRMED engine->dispatcher wirings from `knowledge/memories/{reference,feedback}/*.md` (patterns: "wired into/to", "bound to", "registered in"; excludes speculative via `SPECULATIVE_RE`). `CONFIRMED_CONFIDENCE=0.85`. Emits `ghost.vault-wired.<Engine>` nodes (distinct id namespace from the main seeder's `ghost.unwired-engine`). The GNN tier-5 deploy gate (`nn-graph-eval.buildHoldout`) needs >=2 high-conf `ghost.unwired-engine` ref ghosts with `isValidDispatcher(proposed_wiring)` + `confidence>=0.8`; this feeds vault-sourced ones. Applied to the live 642MB graph: **125 -> 129 high-conf refs (+4 vault-sourced)** — modest but correct.
- `DISPATCHER_RE=/^prism_[a-z0-9_]+$/` is SHAPE-not-existence (a test that assumed `prism_notarealdispatcher` is rejected was wrong; fixed to assert malformed-SHAPE rejection: `prism_BadCaps`, `notprism_dev`).

**2. vault->LoRA training-pair extractor** (`scripts/vault-to-lora-dataset.mjs` + `.test.mjs`, 19/19) — the LoRA half.
Turns `feedback`-type memories into Alpaca instruction-tuning triples `{instruction, input, output}` — the SAME schema as `LatheLoRADatasetBuilderEngine.ts:36 interface LoRAExample`, so the pairs drop into the existing training pipeline. Each note: `description` -> `input`, body (Why + How-to-apply) -> `output`, synthesized question from the slug -> `instruction`. **Live: 245 of 247 feedback memories -> pairs** (2 skipped as thin <120-char smoke stubs), avg output 2165 chars. Written to `state/shared/lora/vault-feedback-dataset.jsonl` (245 valid 3-key triples, 0 `_source` leak). This is a **DISTINCT training signal** — DOCTRINE/convention pairs from the vault, a source the ~95 DB/program-driven LoRA builders (india's stack) never read. Clone-compatible, not a fork.

**3. The bigger fix found along the way — >512MB graph I/O bug.** `seed-ghost-from-unwired.mjs` (the MAIN ref-pool seeder, not just my feeder) used `JSON.parse(readFileSync(...,"utf8"))` + `atomicWrite(JSON.stringify(g))` on the 642MB `system-graph.json` -> both throw `ERR_STRING_TOO_LONG` (V8 max-string-length ~512MB / `0x1fffffe8`). So `--apply`/`--revert` were BROKEN. FIX: migrated both to streaming I/O via `scripts/lib/graph-io.mjs` (`readGraphStreaming` Buffer-walk + new `writeGraphStreamingAtomic` = per-element stream to `.tmp-<pid>` then `renameSync` with EBUSY retry). PROVED `--apply` now works (graph nodes=302538). Same V8-cap class as the tribal-index `0x1fffffe8` regressions (2026-06-08). 37/37 seeder tests.

**Scrutiny (per-file 2-arm gate) caught + I fixed 2 real P1s on the LoRA extractor (R12 — these were silent data-quality defects, not cosmetics):**
- **CRLF `\r` leaked into 53/245 `output` fields** (2,260 stray CR, JSON-escaped as `\r` the model would learn as signal). Fixed: `splitFrontmatter` CRLF-normalizes the body to LF before length-check + emission. Re-validated: **0 escaped CR** in the rewritten JSONL.
- **`.md` extension could leak into the instruction** via the filename-fallback path (`instructionFromName` didn't re-strip `.md`). Fixed in the fn so it's correct regardless of caller.
- Also fixed `frontmatterField`'s `^\s*...\s*$` regex (the `\s` ate newlines -> nested-`metadata:` `type:` never matched the gate, AND a blank `description:` stole the next line as `input`). Changed to `[ \t]` non-newline classes + non-greedy bare branch. 4 regression tests added.

**Coordination:** did NOT touch india's in-flight `scripts/mine-india-transcripts.mjs` (operator-accepted overlap, kept to DISTINCT files). Posted intent + close-out to `state/shared/AGENT_CHAT.jsonl`. The miner GROWS the feedback corpus; this extractor TRAINS on it — they compose.

See [[reference_obsidian_fully_operational_2026_06_09]] (sister gap-fill session — recall/cron/mirror), [[reference_india_lora_stack_inventory_2026_05_28]] (the DB-driven LoRA stack this complements), [[reference_gnn_selective_deploy_2026_06_06]] (GNN tier-5 deploy gate the ref-pool feeds), [[reference_tribal_index_v8_string_cap_2026_06_08]] (the same >512MB V8-cap class).
