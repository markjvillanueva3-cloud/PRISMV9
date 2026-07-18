---
name: reference_ollama_bridge_exec_visibility_2026_06_20
description: "2026-06-20 slot:alpha -- \"get ollama utilization higher\". Verify-first (NOT a workflow -- fanout-gated + the 6/12 assessment's agents got refuted) found the headline UNDER-reports utilization ~46x. The fix surfaces TRUE off-Claude bridge throughput (~874) vs the reported 19, and attributes ask-hermes savings. Commits 81b75e89a6 + 53923751cd."
type: reference
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:46.671Z
aliases: reference_ollama_bridge_exec_visibility_2026_06_20
---


# Ollama bridge-exec visibility -- utilization was MISMEASURED, not low (2026-06-20, slot:alpha)

**Operator:** "make improvements to ollama offloading, get utilization higher."

**Verify-first finding (read the live code; the workflow was fanout-gated AND the 6/12 assessment's agents got REFUTED for speculating -- so traced it myself).** The offload dashboard reported `offloaded=210` (prompt-classifier DECISIONS) and `executedOffloads=19`, making utilization read ~9-18%. **But the fleet was actually offloading ~874 times.** `ask-hermes` (855 real off-Claude executions to the managed-OAuth proxy / ollama-fallback) writes a CUSTOM `byHook["ask-hermes"]` bucket (bySource/byMode/lastUsed via `tallyUsage`) and **NEVER pushes to `events[]`**, so it was invisible to `totals.offloaded`, `executedOffloads`, and EVERY rate -- and recorded `tokensSaved=0`. The metric computation (`bumpTotals` in `.claude/hooks/lib/ollama-stats.mjs`): `executedOffloads` only counts offload events tagged `mode:"executed"` (= ask-ollama's 18). So the headline was a ~46x under-count.

**Why this matters (R12):** the fake-low number triggered RECURRING wasted "low-utilization" hunts -- the 6/12 assessment (`reference_ollama_utilization_assessment_2026_06_12`) + 2 sessions + a goal-gate (`reference_ollama_offload_rate_healthy_2026_06_10`) all chased a non-problem. Utilization is ALREADY high; it was mismeasured.

**Fix (measurement-honesty; alpha-domain; read-side + conservative estimate; NO routing/safety change):**
- `scripts/ollama-offload-dashboard.mjs` `summarize()`: new `EXECUTION_BRIDGE_HOOKS` set {ask-ollama, ask-hermes, ask-openrouter}; aggregate their `byHook.offloaded` -> `totals.bridgeExecutions` + `totals.bridgeTokensSaved` + `byBridge`; surfaced in human/json/advisory as the TRUE off-Claude utilization (874), distinct from classifier DECISIONS (210). Label is honest: "measured+estimated" (ask-ollama measured, ask-hermes estimated) -- 3-of-3 P1 caught "measured" alone was an R12 lie.
- `scripts/ask-hermes.mjs` `tallyUsage()`: attribute `estimateHermesSaved(input,output)=ceil((len+len)/4)` per OFFLOADED call (3 sites: hermes/hermes/ollama-fallback; the 2 fail sites add 0). `|| 0` add (NOT `| 0`) so cumulative savings exceed 32-bit (regression-tested at 4e9).
- Tests: dashboard 31/31 (+3), ask-hermes 69/69 (+6 incl 32-bit-wrap guard). 3-of-3 PASS (all arms). Live: dashboard now `bridgeExecutions=874` (ask-hermes 855 / ask-ollama 18 / cloud 1).

**Shared-tree hazard hit + resolved:** my first `git commit` (no pathspec) swept 3 PEER-staged files (xray's BlueprintVisionOCREngine + surfaceFinishNormalize) into my commit. Caught it (`git show --stat` = 7 files not 4), `git reset --soft HEAD~1` + pathspec-committed only my 4, left peer's 3 staged. xray then committed them properly (02b56c847f). Lesson: in the shared tree ALWAYS `git commit <explicit paths>` (pathspec), never bare `git commit` -- a peer may have files staged in the shared index. (Sibling of the slot-worktree doctrine + [[feedback_commit_to_slot_worktree]].)

**DEFERRED levers (for MAKE-MORE-offload, not just honest-measure -- next iter):**
1. **Supply/prewarm (highest make-more lever):** resident models are VISION-only (qwen3-vl:32b, qwen2.5vl:7b) -- the cost-router/ask-ollama want qwen2.5-coder:32b/gpt-oss which may be COLD -> cold-load latency discourages the model from following offload directives. Warm the offload model (keep_alive / ollama-prewarm-on-pipeline). LIKELY golf/ops (model pulls).
2. **ask-openrouter savings estimate** (write-side, like ask-hermes -- currently 0).
3. **EXECUTION_BRIDGE_HOOKS drift-guard** (P2): a future ask-* bridge would be silently excluded; add a test scanning scripts/ask-*.mjs.
4. The 210->19 execution gap is mostly the architectural truth (a UserPromptSubmit hook can't execute Ollama -- the model owns execution) + ask-hermes IS the real execution channel (855). Not a bug.
