---
name: reference_weekly_synth_resolver_2026_06_09
description: WeeklySynthesisEngine host-aware model + num_predict=-1; gpt-oss /api/generate empty-response was num_predict, not harmony
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.255Z
aliases: reference_weekly_synth_resolver_2026_06_09
---


# Weekly-synthesis host-aware model + 120b num_predict fix (2026-06-09, slot:sierra, OLLAMA-SYNERGY #3)

`mcp-server/src/engines/WeeklySynthesisEngine.ts` `defaultOllamaSummarizer` (the Sunday-cron weekly retro) hardcoded `qwen2.5-coder:32b`. Made it host-aware via the shared `resolveSynthesisModel` (BLACKWELL-TOKEN-SYNERGY-MS0). Commits `b5d249f4f5` (resolver) + `9697a9135a` (num_predict) + `71a818b49c` (doc). 62/62 vitest, 3-of-3 A/B/C PASS (x2 rounds), live-validated.

**Model resolution order:** env pin `PRISM_WEEKLY_SYNTHESIS_OLLAMA_MODEL` (passed as `override`) wins -> route category `search_synthesis` to host 'best' tier -> fail-soft to the 32B `DEFAULT_OLLAMA_MODEL` const. On home_blackwell the resolver returns **gpt-oss:120b** (source=blackwell-best), NOT 32b -- weekly synthesis now uses the strongest viable local model (operator goal), 32B as the floor.

**KEY FINDING (resolves a fleet-wide doubt) -- gpt-oss `/api/generate` empty-`.response` is a num_predict artifact, NOT harmony incompatibility.** The OLLAMA-SYNERGY spec's #8 (prewarm) had live-REJECTED gpt-oss for `/api/generate` ("harmony format returns empty .response"). #2's reconciliation already attributed that to num_predict starvation via `callOllama`. This unit EXTENDS that proof to the raw `/api/generate` path: a live POST to `gpt-oss:120b` with `options.num_predict=-1` + a real synthesis prompt returned an **804-char, 4-of-4-section** retro in **68s** (http 200). So: set `num_predict>=1024` or `-1` for gpt-oss on `/api/generate`; do NOT blanket-reject it. The prewarm empty-response was prewarm's tiny-prompt + low/default num_predict, not harmony.

**Second-order fixes (Karpathy failure-mode pass + reviewer C P2):**
1. `OLLAMA_NUM_PREDICT = -1` (unlimited, bounded by the 180s timeout) threaded into the POST options -- a harmony reasoning preamble could otherwise starve the 4-section retro into empty-`.response`. -1 never truncates (the `hasAllSections` validator + AbortController are the real bounds).
2. `OLLAMA_TIMEOUT_MS` 90s->180s -- 120b is far slower than 32b and this is a non-interactive Sunday cron (68s for a tiny prompt; the real 7x6KB synthesis is much larger).

**Stale-test catch (R12):** `WeeklySynthesis.test.ts` asserted `DEFAULT_OLLAMA_MODEL === "qwen2.5-coder:7b"` but the code was `:32b` since the 2026-06-04 Blackwell migration -- a RED test that `build:fast` (esbuild-only commits) never caught because the full `tsc && vitest` gate isn't run pre-commit on this tree. Fixed to `:32b`.

**Lessons:** (a) the cross-boundary `.ts -> ../../../scripts/lib/*.mjs` import (already used at L64 for the octopus loader) throws TS7016 implicit-any under `strict`/`noImplicitAny`; suppress with `@ts-expect-error` (self-removing) -- the tree's `tsc` step is already red on this pattern, commits land via `build:fast`. (b) ALWAYS live-validate which model a host-aware resolver actually picks (assumed 32b; was 120b) -- R15 "prove with numbers." (c) when a sibling spec note ("X returns empty, rejected") contradicts your enabled path, run the real end-to-end call before claiming it works. See [[reference_ollama_synergy_audit_2026_06_09]], [[reference_memo_extract_fixes_2026_06_09]], [[feedback_utilize_ollama_for_efficiency]].
