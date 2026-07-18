---
name: reference_ollama_vision_single_source_2026_06_09
description: "Alpha's config+cleanup slice of the OLLAMA-AUTORUN model-default optimization (operator 'coordinate with bravo' + AskUserQuestion split). Single-sourced the OCR multi-VLM ensemble roster into VISION_FAMILY_LEADERS (scripts/lib/vision-model-select.mjs) -- was a duplicated literal in vision-ensemble-extract.mjs + blueprint-ocr-training-loop.mjs + a 3rd hardcode in batch-ollama-vision-extract.mjs. ALSO resolved a 5-day dangling dep: vision-model-select.mjs + .test.mjs (xray U-XRAY-VISION-PROFILE) were UNTRACKED since 7a1aea6723 yet imported by the TRACKED consumers. Pre-staged inert settings flag PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1. Commit e80e6e3a41, 3-of-3 PASS."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.683Z
aliases: reference_ollama_vision_single_source_2026_06_09
---


# Ollama vision-model single-source + xray dangling-dep fix (2026-06-09, slot:alpha)

Commit `e80e6e3a41`, unit `U-OLLAMA-VISION-SINGLE-SOURCE`. Alpha's slice of the
operator's Ollama-efficiency pivot ("utilize ollama / make all defaults the highest
most optimized LLM per task / coordinate with bravo").

## The alpha/bravo split (operator AskUserQuestion)
Discovery found bravo OWNS the comprehensive model-default plan
`OLLAMA-AUTORUN-BUILDLOOP-PLAN-2026-06-09.md` (U1-U7), incl. the VRAM-correct nuance
(gpt-oss:120b 66GB + qwen2.5-coder:32b 37GB = 103GB CANNOT co-reside in 96GB -> 120b
pinned, 32b on-demand LRU swap). Operator chose: **alpha = config + cleanup; bravo =
engine routing (U3-U7)**. Coordinated via AGENT_CHAT note. Alpha did NOT touch
ModelRoutingEngine.ts / ask-ollama.mjs DEFAULT_MODEL / OllamaHookBridgeEngine
(bravo's in-flight surface -- R7 collision avoided).

## What shipped (cleanup)
- `scripts/lib/vision-model-select.mjs`: NEW export `VISION_FAMILY_LEADERS =
  Object.freeze([DEFAULT_VISION_MODEL, "qwen2.5vl:7b", "llama3.2-vision:11b"])` beside
  the existing `BIG_VISION_PREFERENCE`. This is the OCR multi-VLM ENSEMBLE roster
  (distinct from the single-host upgrade ladder) -- single source of truth.
- `vision-ensemble-extract.mjs` + `blueprint-ocr-training-loop.mjs`: consumed it
  (`const FAMILY_LEADERS = VISION_FAMILY_LEADERS`); removed the now-orphaned
  `ollama-vision-extract-lib.mjs` import (DEFAULT_VISION_MODEL was used ONLY inside the
  old literal in each).
- `batch-ollama-vision-extract.mjs`: imports `DEFAULT_VISION_MODEL` instead of the
  hardcoded `"qwen3-vl:8b-instruct"` string (keeps `PRISM_VISION_MODEL` env override).
- +2 drift-guard tests (deepEqual to concrete array + frozen + JSON-safe). 175 lib-suite
  + 49 selector tests pass. Live node assertion proved the roster is BYTE-IDENTICAL to
  the 3 old literals (zero behavior change).

## The latent bug found (R12 fail-loud, the real catch)
`vision-model-select.mjs` + `vision-model-select.test.mjs` (xray's U-XRAY-VISION-PROFILE)
were **UNTRACKED in git since the 2026-06-04 ship `7a1aea6723`** -- yet the TRACKED
ensemble consumers had imported from them for 5 days. A fresh clone was broken at runtime
(import of a non-existent module). Committed both (authorship: xray, noted in commit body)
to make the repo coherent. Lesson: when a refactor touches imports, `git status --short`
the lib -- a `??` on a file your tracked code imports is a dangling-dep bug, not noise.

## settings flag (config, separate from the commit)
`PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1` pre-staged in `H:/.claude/settings.json` (canonical;
mirrored from C:). VERIFIED INERT: 0 consumers in scripts/ + mcp-server/src/ + .claude/hooks/
(bravo's plan builds the autoexec branch in U5). Activates when bravo's U5 lands -- zero
runtime blast radius today. Lives outside the H:/prism repo so NOT in commit e80e6e3a41.

## Deferred (handoff)
- P2: xray's `vision-model-select.mjs` carries pre-existing em-dash/arrow comments; a future
  full-file Write would trip ascii-guard (diff-aware, so surgical Edits are fine). git-add
  legitimately bypassed the PreToolUse guard. Not introduced by this commit.
- Bravo's U2 in their plan also lists this flag -- since alpha pre-staged it (coordinated),
  bravo's U2 is now a no-op; bravo's U5 test (offload >=30% WITH the flag) should account for
  it already being set.

Pairs with [[reference_xray_vlm_ensemble_ocr_2026_06_04]] (the consumers) and bravo's
OLLAMA-AUTORUN-BUILDLOOP plan (the engine-routing half).
