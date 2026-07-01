---
name: gptoss-harmony-synergy-bug-golf-2026-06-08
description: gpt-oss:120b pull FINISHED 2026-06-08 (fixed a parse-error that blocked the resilient-pull script). Finishing it ACTIVATED a latent harmony-format synergy bug — consumers reading .response from a reasoning model get empty unless num_predict is raised. Both fixed + live-validated. Commit c593b096fb.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.600Z
aliases: reference_gptoss_harmony_synergy_bug_golf_2026_06_08
---


2026-06-08 (slot golf, /goal "finish pulling ollama models + synergize"). Builds on [[gptoss-pull-synergy-golf-2026-06-04]].

**Bug 1 — pull blocker (root cause of the stall):** `scripts/ollama-resilient-pull.ps1` had 12 em-dashes (UTF-8 `e2 80 94`) that made the `.ps1` FAIL TO PARSE under Windows PowerShell 5.1 (cp1252 read → "Unexpected token"). The resilient pull never executed, so gpt-oss:120b sat frozen (log showed 2.2 MB/s / stale, NOT actually downloading). Same cp1252-charmap corruption class as the hookify-frontmatter bug fixed earlier the same session. Fix: em-dash → ASCII hyphen (file now parses 0 errors). Relaunched detached → resumed the preserved 96% partial blob (62.3GB on `H:/Tools/ollama/models`, 2TB free) at 94 MB/s → **INSTALLED**.

**Bug 2 — harmony-format synergy bug ACTIVATED by finishing the pull (a CLASS):** the cost-router (`ollama-cost-router.mjs` best tier, install-gated) correctly selects `gpt-oss:120b` for `search_synthesis` on `home_blackwell` once installed. BUT gpt-oss is a REASONING model (OpenAI harmony format) that emits a `thinking` channel BEFORE the final `response`. `ask-ollama.mjs callOllama()` sent NO `num_predict` (Ollama default = 128 tokens) and read ONLY `json.response` → the 128 tokens were consumed by the `thinking` channel → `response` came back EMPTY, `done_reason:"length"` → `ok:false "empty response"`. **Dormant before** (router fell back to qwen2.5-coder:32b, non-reasoning, which fills `.response`); finishing the pull is what selected 120b and exposed it. Verified: @128 → empty; @1024 → `done_reason:"stop"`, real 262-char answer. Fix: `DEFAULT_NUM_PREDICT=1024` (a CAP not a target — short-answer models still stop naturally) + honest R12 truncation diagnosis (thinking-filled + done_reason=length → name the cause + the budget to raise). 10/10 tests (5 new).

**CLASS implication (uniform bug-hunting "find the other N-1"):** ANY consumer that does `ollama /api/generate` + reads `.response` with a small/default `num_predict` will silently get empty output the moment it routes to a reasoning model (gpt-oss:20b/:120b). `ask-ollama.callOllama` is fixed; audit other direct `/api/generate` callers (`ollama-task-offloader`, `multi-provider-router`, vision-extract) for the same `.response`-only + low-budget pattern before they route to gpt-oss.

**Synergy NOT rebuilt (R8):** routing was already correct — `detectHostClass()=home_blackwell` → `resolveSynthesisModel(search_synthesis)` → `{model:"gpt-oss:120b", source:"blackwell-best", tier:"best"}`. GPU smoke 114 tok/s. The consumer read-path was the only break. Commit c593b096fb (+ hook-error cleanup 13017de764).
