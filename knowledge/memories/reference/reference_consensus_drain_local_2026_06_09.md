---
name: reference_consensus_drain_local_2026_06_09
description: "Dormant-feature activation done right: the auto-consensus queue (50 queued/4 processed/10h) drained via engine.ask() DEFAULTS = Claude+Codex voices -> hidden fleet rate-limit amplifier. Fixed to LOCAL-ONLY default (gpt-oss:120b+qwen-32b), Claude opt-in via PRISM_CONSENSUS_DRAIN_INCLUDE_CLAUDE=1."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.529Z
aliases: reference_consensus_drain_local_2026_06_09
---


# Consensus-queue drain -> local-only (slot:bravo, 2026-06-09, U-CONSENSUS-DRAIN-LOCAL)

## The find (overnight autonomous /yolo, direct-tool investigation -- no Claude workflow, API was rate-limited)
`.claude/hooks/auto-consensus-userprompt.mjs` queues EVERY prompt for async consensus ("Consensus queued... to drain: consensus-queue-drain.mjs"). The drain (`.claude/scripts/consensus-queue-drain.mjs`, wired into `stop-consensus-drain.mjs`, present in all 3 settings.json) called `engine.ask({prompt, taskType, sourceSession, timeoutMs, persist})` with NO voice bound -> MultiModelConsensusEngine DEFAULTS = includeClaude:true + the always-on codex voice + ollama. So every drained entry made a real Claude + Codex API call. Across ~10 concurrent fleet sessions each queuing every prompt, that is a HIDDEN amplifier of the org-wide rate limit (the "Server is temporarily limiting requests" class -- [[reference_ollama_fanout_ratelimit_fix_2026_06_09]]). Also UNDER-draining: 50 queued / only 4 processed over 10h (oldest 16:25 -> newest 02:45; max 3/Stop while every prompt adds one).

## The fix (R7 safe-default, richer-path opt-in)
Added `buildDrainVoiceBound()`: returns the LOCAL-ONLY bound `{includeClaude:false, includeGrok:false, includeGemini:false, diverseLocalPanel:true, diverseLocalModels:["gpt-oss:120b","qwen2.5-coder:32b"]}` by default, or `{}` (engine defaults, Claude+Codex) when `PRISM_CONSENSUS_DRAIN_INCLUDE_CLAUDE=1`. Spread into the `ask()` call. Mirrors `octopus-first-live-record.mjs`'s voice bound. Two strong resident models = genuine 2-voice consensus at $0, no Anthropic limit.

## Live-validated (RATE-LIMIT FIX: solid) + R12 correction (voice count: single, not 2)
`node consensus-queue-drain.mjs` post-fix: every processed entry records LOCAL voters only (`consensus_voters:["qwen2.5-coder:32b"]`), no Claude/Codex, `drain_ok:true`, completed with NO rate-limit error during the active throttle. 10 backlog entries drained on the GPU (50->38). THE RATE-LIMIT FIX (no Claude API spend) IS PROVEN.

**R12 correction (U-CONSENSUS-DRAIN-PANEL-FIX):** I first claimed "genuine 2-voice consensus" -- WRONG, it is SINGLE-voice. (1) The original panel [gpt-oss:120b, qwen2.5-coder:32b] = 65GB+37GB = 102GB > 96GB VRAM -> can't co-reside -> resolveDiverseOllamaPanel drops the 120b. (2) Corrected to co-resident [qwen2.5-coder:32b (37GB), gpt-oss:20b (13GB)] = 50GB -- but STILL single-voter: the engine's `resolveDiverseOllamaPanel` (MultiModelConsensusEngine ~line 520) does not seat gpt-oss:20b alongside the resident qwen-32b (likely a conservative free-VRAM runnable-check). NOT a cold-start artifact -- a deeper engine-resolver issue, flagged for follow-up (india/sierra or a dedicated bravo unit), NOT chased overnight (loop-discipline: cap anomaly chase). A single strong local voice (qwen-32b) is still a valid $0 no-rate-limit consensus signal -- just not multi-voice yet. LESSON: live-validate the COUNT, not just the absence of Claude; "2-voice" is a VRAM-co-residency claim that must be checked against the 96GB ceiling ([[reference_ollama_localhost_ipv6_2026_06_09]] sibling: the U9 ollama-coresidency lib exists for exactly this).

## Reusable pattern (dormant-feature activation, the RIGHT way)
A "dormant feature" that, when naively activated, makes the system WORSE (here: more Claude API load during a rate limit) must be activated in its SAFE form, not its default form. The fix both (a) lights up the dormant queue AND (b) removes a rate-limit amplifier -- net-negative-to-net-positive. Always check what a dormant feature COSTS when activated before flipping it on. Pairs with [[feedback_workflow_concurrency_and_local_routing_2026_06_08]] (route mechanical/fleet-volume work to local, reserve Claude for judgment).
