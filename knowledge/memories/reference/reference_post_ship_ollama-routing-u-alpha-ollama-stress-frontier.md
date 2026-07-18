---
name: reference_post_ship_ollama-routing-u-alpha-ollama-stress-frontier
description: Auto-distilled learnings from shipping OLLAMA-ROUTING/U-ALPHA-OLLAMA-STRESS-FRONTIER (commit 69b31cbfb). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.961Z
aliases: reference_post_ship_ollama-routing-u-alpha-ollama-stress-frontier
---


# OLLAMA-ROUTING/U-ALPHA-OLLAMA-STRESS-FRONTIER

[MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-STRESS-FRONTIER (slot:alpha): operator-authorized fleet-idle GPU stress test -- the empirical 'hardest task each LLM can do before diminishing returns'. Ran the 6 graded batteries (36 tasks: reasoning/longcontext/jsonschema/mfgdomain/instruction/codegen) across all 9 installed models per-model (single-model invocations -- the multi-model harness hangs on one model + writes all-or-nothing). New scripts/stress-frontier-report.mjs merges the per-model JSONs into the capability frontier (cheapest-model@100% per task + per-model ceiling), with a LOAD-FAILED guard that excludes an all-0% model (a 65GB model that never fit VRAM) from poisoning the frontier -- 8/8 R9 tests. KEY MEASURED FINDINGS (state/shared/ollama-stress-frontier.md): (1) qwen3-coder:30b is the most capable mechanical model 27/36 @100%, BEATING qwen2.5-coder:32b 26/36 AND cheaper -- RESOLVES the prior 'unverified code-comment claim' with data; (2) the cheap coder ladder dominates mechanical: 1.5b(1GB) does all 6 codegen + most JSON @100%, 7b 22/36 = the offload sweet spot; (3) deepseek-r1 reasoners score 0/36 on mechanical exact-match (they emit <think> chains) -- correctly isolated to the deep-reasoning tier, never mechanical; (4) gpt-oss:120b is WEAK for mechanical 7/36 -- its 65GB is wasted on mechanical, reserve for synthesis; (5) NONE-local tasks (iso-insert-grade/tap-drill-size/spindle-rpm-formula) route to Claude+RAG -- domain-knowledge gaps the local models lack. Also regenerated the canonical 9-model ollama-capability-matrix.json (was a stale 3-model matrix) so the cheapest-select policy (c243f01414) now validates on real data: extract->1.5b, format->7b, classify->14b live. cost-router comment-only edit converts the qwen3-coder:30b>32b claim to a cited measurement + documents r1's mechanical-deadness. cost-router 61/61, no behavior change. Validates the routing graph is SOUND (R12 honest: a verification, not a fix). Closes the operator's stress-test ask.

**Shipped:** 2026-06-25T11:18:29-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[ollama-routing-u-alpha-ollama-stress-frontier]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._