---
name: reference_ollama_utilization_assessment_2026_06_12
description: 2026-06-12 slot:alpha Ollama-utilization assessment (4-agent workflow w3fe3pi69). Verdict NOT MAXED but the raw 10.2% offload rate OVERSTATES the gap — ~103/114 keeps are legitimately non-offloadable orchestration; the classifier works correctly. Real gap is DEMAND-routing (GPU idle at 1%, supply fine), one dead config-gated hook (ollama-route-pretooluse 118f/0off), an 18% model directive-compliance rate, and 2 measurement bugs under-reporting the true rate.
type: reference
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:46.683Z
aliases: reference_ollama_utilization_assessment_2026_06_12
---


# Ollama utilization assessment (2026-06-12, slot:alpha)

**Verdict: NOT maxed — real room, but smaller than the raw 10.2% implies.** Workflow `w3fe3pi69` (4 sonnet agents, 502K tok).

**Live state:** offload rate 10.2% (13/127, target >=30%); Ollama daemon UP, 12 models, gpt-oss:120b resident (64GB/96GB); **GPU at 1% utilization** = resident-but-idle.

**Honest nuance (agents corrected the raw-rate scare):** of 114 keeps, ~103 are legitimately non-offloadable ORCHESTRATION (/goal /checkin /loop /startup) + ~5 operator-directive + ~4 unknown-but-non-offloadable. Only ~0-2 genuinely-offloadable tasks were missed -> **the classifier is working correctly** (the 2026-05-16 cat-fix `2bbf12654` held). A low % in a dev/orchestration session is partly STRUCTURAL. **Supply is not the bottleneck; DEMAND-routing is** (GPU idle because eligible work never gets routed there).

**CORRECTION (2026-06-12, verify-first REFUTED the agents' #1 lever — R12).** Read `H:/prism/.claude/hooks/ollama-route-pretooluse.mjs` (556L) + settings.json: BOTH knobs are ALREADY SET (`PRISM_OLLAMA_ROUTE_AUTO=1` settings.json:15, `PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1` :14). The hook is ALREADY in auto-mode. The "118 fires / 0 offloads" is NOT a dead hook — it is **correct safe-by-construction behavior**: the hook only auto-summarizes a narrow `GIST_SAFE` allowlist (`.log/.txt/.out` + logs/archive/dump paths; BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-AUTO-ROUTE-ALLOWLIST 2026-06-03) and REFUSES to substitute a lossy summary for a source/state Read (`.ts/.mjs/.json/.md`) because the model needs exact content. This session's Reads were all source/state -> 0 offloads is RIGHT. **The sonnet agents overstated "+8-12pp dead-hook activation" — they did not trace the live knob state or the GIST_SAFE safety allowlist.** LESSON: agent-recommended "flip a knob" levers MUST be verify-first against live config + the hook body before reporting to operator (the agents' own "verify before flipping" caveat caught it). The genuinely-buildable route-pretooluse improvement is a SAFETY-DELICATE GIST_SAFE allowlist expansion (which file patterns are truly gist-only) — NOT a blanket activation, and not to be rushed (over-broadening = substituting summaries where exact content matters = silent corruption, the inverse R12 trap).

**Ranked levers (REVISED after verify; the route-pretooluse "activation" levers are STRUCK):**
TIER-1 (the SAFE, genuinely-open ones):
3. **Fix `tokensSaved:0` schema-read bug** — real field is `estimatedTokensSaved` (=14779). Trivial; un-masks savings. Same schema-blindness class as PSN-aggregate #11 + 2026-05-17 regression.
4. **Wire `ollama-auto-router.mjs` telemetry into `recordOllamaEvent`** — it offloads inline but never records -> dashboard UNDER-reports; true rate likely > 10.2%. +2-5pp visibility.
TIER-2 (broaden coverage): 5. add missing OFFLOADABLE_PATTERNS (diff_summary/error_triage/docstring/classification/lint/code_search — in CLAUDE.md doctrine, absent from classifyPrompt) +3-6pp. 6. preload qwen2.5-coder:32b alongside gpt-oss:120b (96GB has room) — offload latency. 7. **wire nomic-embed-text into live hybrid-search** — connects to GRAPH-UTILIZATION rec #1 (local-vector leg); 54K embeddings + nomic on the idle GPU = free local vector search.
TIER-3 (behavioral): 8. **directive take-rate is 18%** (2 executed / 11 injected) — the MODEL ignores the offload directives 82% of the time (alpha soul says "ollama-offload-before-claude"). Fix = model compliance OR imperative SubAgent dispatch for SAFE_AUTOEXEC.
Cleanup: archive ~11 dead-on-disk ollama hooks (SessionStart overhead); `large-read-digest-advisory` 255 fires/0 offload = pure noise.

**The one-liner:** Ollama is up, GPU idle, models warm — the gap is a config-gated dead hook on the biggest token surface (large Reads) + the model under-following offload nudges + 2 measurement bugs. Build-ready; mostly flips/wiring of existing assets. Reconciles [[reference_blackwell_ollama_utilization_optimize_2026_06_03]] + [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]] + [[reference_offloader_cat_fix_2026_05_16]]. mustHumanVerify each knob before flipping.
