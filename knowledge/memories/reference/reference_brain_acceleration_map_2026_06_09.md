---
name: reference_brain_acceleration_map_2026_06_09
description: "Evidence-grounded ranked map of PRISM brain/Obsidian-OS acceleration opportunities (recall, token-economy, context, value) with lane routing; root fix = register the unwired PRISM Brain Refresh task"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.482Z
aliases: reference_brain_acceleration_map_2026_06_09
---


**Finding (slot:papa, 2026-06-09):** operator /goal "accelerate obsidian-os / brain intelligence + context + value + token-saving." Ranked, lane-routed opportunity map at `state/shared/specs/BRAIN-ACCELERATION-OPPORTUNITIES-2026-06-09.md`. Grounded in THIS session's live hook metrics + file verification (R12) — NOT a subagent fan-out (a 5-Claude-agent workflow `wf_07062fe6-3e9` FAILED on the session API limit, ~799K tokens wasted → reapplied [[feedback_workflow_concurrency_and_local_routing_2026_06_08]]: ≤3-4 agents + route mechanical/audit to local Ollama).

**Root fix (gates 3+ items) — R0:** the `PRISM Brain Refresh` scheduled task is UNREGISTERED on this host, yet the refresh pipelines (galaxy-synth + sidecar rebuilds) ARE wired as `brain-refresh.mjs` stage 6 + the installer exists. So embeddings-sidecar / master-index-sidecar / galaxy-syntheses rot between manual runs. This is the SAME "#1 weakness = UNWIRED REFRESH PIPELINES" meta-finding as [[reference_alpha_brain_refresh_ms0_2026_05_30]], re-confirmed live. Fix = ELEVATED `install-brain-refresh-task.ps1 -RunNow` (golf/operator; papa has no elevated shell). See [[reference_brain_refresh_task_unregistered_2026_06_09]].

**Top levers (live numbers):** route-suggest take-rate 0.4% (38/9966 vs 30% target) + Ollama offload 8% (advisory-not-enforced) = biggest token gap (alpha, CONTENDED w/ peer 928a8226 ollama-roster); wiki↔tribal coverage 17.1% (32,630/39,345 unembedded → brain can't recall 83% of its wiki; alpha/GPU); embeddings + master-index sidecars stale (recall/search degrade; root=R0).

**CORRECTED stale framing (R12):** tribal-embed-index.json is **159.9 MB, 352 MB headroom** under the 512 MB V8 cap — NOT frozen (the "537MB" framing was pre the 2026-06-08 restore-to-4162-baseline). So write-side **sharding (F1) is the one clean papa-lane BUILD but is FUTURE-PROOFING, not urgent** — build it ahead of wiki re-embedding (I3) so the regrowth never hits the write-cap; don't rush it under session-limit pressure. Reader `load-tribal-index.mjs` is already cap-safe; only the writer needs shards.

**Lane routing:** R0→golf/operator · T1/T2/T3/I1/I3→alpha · I2→sierra · I4→india · V2→india/bravo · F1→papa. These are cross-cutting infra → accelerating recall/context/token serves EVERY galaxy at once.
