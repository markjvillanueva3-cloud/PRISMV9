---
name: reference_prompt_rewriter_dead_and_loopdirective_skip_2026_06_19
description: "PSN \"rewriter\" leg (prompt-rewriter-ollama.mjs) is 100% dead via no-model (only embed/vision models warm + LOADED_MODEL_ONLY=1); 0 hits/356 misses is HONEST not mis-measured. Next unit = skip system/operator loop-directives before the Ollama round-trip."
type: reference
slot: alpha
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:47.123Z
aliases: reference_prompt_rewriter_dead_and_loopdirective_skip_2026_06_19
---


> **Lineage:** UPDATE of [[reference_prompt_rewriter_fix_2026_05_24]] (alpha already found the rewriter 100%-skipping on 2026-05-24: then 106 ollama-offline + 94 timeout). This 2026-06-19 pass confirms it's STILL dead but the current dominant cause shifted to `no-model` (no warm text model), and adds the loop-directive-skip unit below. Not a rediscovery — a recurrence + new fix.

**Finding (slot:alpha, verified 2026-06-19 from `state/shared/dashboards/psn-savings-aggregate.json` + `.claude/cache/prompt-rewrites.jsonl`):** the PSN savings headline's `rewriter 0h/356m=0.0k` is **HONEST, not a measurement bug.** Every `prompt-rewrites.jsonl` line is `"rewrite":null` with `skip_reason:"timeout"` (8007ms Ollama abort) or `"no-model"`. Recent lines are all `no-model`: `prompt-rewriter-ollama.mjs` runs `LOADED_MODEL_ONLY=1` (default) + `pickModel()` over the MODEL_PREFERENCE text models, but the only warm Ollama models are embed/vision (`nomic-embed-text`, `qwen3-vl:8b`, `qwen2.5vl:7b`) — no text-gen model loaded → `pickModel` returns null → no-model skip. So the rewriter (PSN leg "rewriter") is effectively **dead** whenever a text model isn't warm. (NOT alpha-fixable as code — it's an Ollama model-availability/config state; a warm `qwen2.5-coder:32b`/`gpt-oss` would revive it.)

**STATUS: SHIPPED 2026-06-19 (slot:alpha)** — commits `6a7b572eae` (U-REWRITER-SKIP-LOOP-DIRECTIVES) + `631e273cd2` (U-REWRITER-SKIP-DIRECTIVE-TIGHTEN). `LOOP_DIRECTIVE_RE` + `DIRECTIVE_SCAN_CHARS=1024`-slice skip (skip_reason "system-directive") in `prompt-rewriter-ollama.mjs`; test `prompt-rewriter-system-directive.test.mjs` 9/9; throttle 4/4 no regression; per-file 2-arm + 3-of-3 all PASS. **Lessons:** (1) an over-broad regex alternation false-positives — `BUILD\s+LOOP` was redundant (every real directive carries `AUTONOMOUS BUILD`/`operator-armed`) so it was dropped per scrutiny arm-C; drop redundant alternatives. (2) two `[^\]]*` quantifiers around a keyword alternation backtrack O(n^2) on a long no-close-bracket paste — bound the regex input (slice) on any regex run over arbitrary prompt text. (3) the rewriter only injects `additionalContext` (raw prompt always reaches the model), so a skip can NEVER break a prompt — worst case is a missed optional injection.

**Original spec (now SHIPPED, kept for provenance):**
- **What:** `prompt-rewriter-ollama.mjs` does NOT skip operator/system AUTONOMOUS-LOOP directives (e.g. `[AUTONOMOUS BUILD LOOP — ...]`, `[ZULU AUTONOMOUS BUILD LOOP ...]`). It only opt-outs on explicit `[RAW]`/`[SKIP-REWRITE]`/`[NO-REWRITE]` tags (`OPTOUT_RE`, line 91). These directives are submitted EVERY loop tick across the fleet.
- **Why:** when the rewriter IS healthy (text model warm), it spends an ~8s Ollama round-trip "compressing intent" of system loop-directives that should never be compressed (lossy restatement of operator rails injected as `additionalContext` ahead of the raw prompt). The raw prompt still reaches the model (additive, line 14 — so low safety risk), but the round-trip is wasted. Same class as alpha's same-prompt throttle (2026-06-11, line ~300).
- **Fix:** add a `LOOP_DIRECTIVE_RE` skip right after the `OPTOUT_RE` block (~line 280): match a leading `[<UPPER WORDS> LOOP` / `AUTONOMOUS BUILD LOOP` / `operator-armed` directive shape; on match `writeLog({...skip_reason:"system-directive"})` + `exit(0)` before `pickModel`. Keep it tight (anchored, leading-bracket) so a normal user prompt mentioning "loop" is NOT skipped.
- **Test:** match the existing SUBPROCESS test convention (`__tests__/prompt-rewriter-throttle.test.mjs`) — pipe a loop-directive payload → assert exit 0 + log line `skip_reason:"system-directive"` + NO Ollama call; pipe a normal prompt → assert NOT skipped by this guard. The hook is an IIFE (no exported predicate); either subprocess-test or extract `isSystemDirective(raw)` into a small lib + entry-guard the IIFE.
- **Blast radius:** UserPromptSubmit, fires on EVERY prompt for all 26 slots — test thoroughly + 2-arm scrutiny before commit. Related: [[reference_vault_ambiguous_links_deliberate_residual_2026_06_19]] (same session). Sibling rule: [[feedback_ollama_fallback_sonnet_agents]].
