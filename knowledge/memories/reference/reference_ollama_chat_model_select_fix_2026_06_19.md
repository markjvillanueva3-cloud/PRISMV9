---
name: reference_ollama_chat_model_select_fix_2026_06_19
description: "prompt-rewriter pickModel mis-selected Ollama models -- didn't recognize gpt-oss/deepseek (rejected loaded gpt-oss as no-model) AND could return a VISION model (qwen2.5vl matches /qwen/) for /api/chat. Fixed via tested shared helper scripts/lib/ollama-loaded-chat-model.mjs."
type: reference
slot: alpha
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:46.671Z
aliases: reference_ollama_chat_model_select_fix_2026_06_19
---


**SHIPPED 2026-06-19 (slot:alpha), commit `778be5414f`** — `[TOKEN-EFFICIENCY-INJECT]/U-REWRITER-CHATMODEL-SELECT`.

**Bug (found tracing why the rewriter is "100% dead via no-model" — partial root cause):** `prompt-rewriter-ollama.mjs#pickModel` classified loaded Ollama models with an inline regex `/chat|coder|llama|mistral|phi|gemma|qwen/i`. Two defects: (1) it did NOT recognize the `gpt-oss` / `deepseek` text families — so when `gpt-oss:120b` was the warm model on the Blackwell host (it was, live `/api/ps` 2026-06-19), the rewriter rejected it as `no-model` and skipped; (2) it would WRONGLY return a **vision-language** model (`qwen2.5vl`, `qwen3-vl`, `llama3.2-vision` all match `/qwen|llama/`) for an `/api/chat` call → garbage rewrite. The `/api/tags` fallback had the same flaw via a blind `data.models[0]` pick.

**Fix:** new pure tested helper `scripts/lib/ollama-loaded-chat-model.mjs` — `isChatCapable(name)` (recognizes the local text-gen families; `NON_CHAT_RE` excludes `vl`/`vision`/`llava`/`moondream`/`embed`/`nomic`/`rerank`/`bge`, **checked BEFORE** the chat-family match so a vision model whose family token also matches chat is still excluded) + `pickLoadedChatModel(loaded, preference)` (preference-first, then first loaded chat model, else null — never cold-loads). `pickModel` delegates to it for BOTH paths; the inline regex + blind `models[0]` removed.

**Lessons (R12/R9):**
1. **Capability classification must be EXCLUSION-FIRST**: a vision model's family token (`qwen2.5vl` → "qwen", `llama3.2-vision` → "llama") matches the chat allowlist, so test the exclusion (vl/vision/embed) BEFORE the inclusion, else you hand a VLM to `/api/chat`.
2. **Pick from the LOADED chat set, scan ALL — never blind `[0]`**: `ps.models[0]` could be a vision/embed model; iterate and return the first *chat-capable* one.
3. **Allowlist named families, not a broad `chat` wildcard**: a bare `/chat/` token would re-admit a hypothetical `*-chat-vision` model. Under-recognition of an un-installed family is harmless (a skipped optional rewrite; raw prompt always reaches the model); a wrong vision-return is not.

**Validation:** 12 reference-value tests vs the REAL 17-model install set (happy + failure + adversarial: vision-token-leak, scan-past-vision-at-[0], codestral, precedence). LIVE (R15): with `qwen2.5-coder:1.5b` warmed the rewriter logs `using model=qwen2.5-coder:1.5b`; with only vision models loaded it correctly returns null. Per-file 2-arm + 3-of-3 all PASS.

**CAVEAT + ROOT CAUSE (R12, verified 2026-06-19):** this fixes model SELECTION, not full revival. The rewriter still skips most ticks because **no mechanism keeps a coder continuously WARM** in `/api/ps` — the prewarm hook (`.claude/hooks/ollama-prewarm-on-pipeline.mjs`, NOT `scripts/`) warms `qwen2.5-coder:32b` only on specific PIPELINE keywords with `keep_alive=10m`; `ask-ollama` uses 30m on-call; the host cycles vision models through VRAM for OCR. So a coder is warm for the per-prompt rewriter only INCIDENTALLY. The rewriter's comment claiming a "24h keep_alive pin set on session start" was **FALSE** (no 24h/-1 keep_alive exists anywhere; corrected in commit, 2026-06-19). **DECISION (don't re-litigate):** fully reviving the rewriter = a VRAM-warmth choice (keep a small coder resident ~24/7) — **LOW-ROI** given the rewriter's questionable value (0 tokens saved historically, dubious "compressed intent" injection). Recommend DEPRIORITIZING rewriter revival vs other token-efficiency work; the 2 correctness fixes shipped (skip-directives + chatmodel-select) are the genuine value. A warm coder would help ALL Ollama offload (not just the rewriter) — if pursued, do it as a fleet offload-warmth unit, not a rewriter unit. Sibling: [[reference_prompt_rewriter_dead_and_loopdirective_skip_2026_06_19]]. The helper is reusable by other Ollama hooks that need loaded-only chat-model selection (R15 apply-to-all candidate).
