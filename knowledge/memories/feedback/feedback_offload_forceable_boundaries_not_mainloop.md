---
name: feedback_offload_forceable_boundaries_not_mainloop
description: "Hook enforcement can only act at TOOL boundaries; the main loop's own reads/derivations/skill-invokes cannot be hook-forced. Smart-offload + vault-usage wins live at forceable boundaries (Workflow fan-out, subagent tier, Stop), or by restructuring work to FLOW THROUGH them -- never by adding more advisory main-loop injectors."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.437Z
aliases: feedback_offload_forceable_boundaries_not_mainloop
---


When the goal is "smart offloading of easy tasks to Ollama/cheaper tiers instead of wasting Opus tokens" or "auto-enforced fuller use of the Obsidian vault / auto-invoke skills+loops", the buildable surface is NARROW and specific. Verified across the 4-pillar build (2026-06-13, slot:echo):

**What a hook CAN force (build here):**
- **PreToolUse deny** on the Agent/Workflow/Task tool -- e.g. `subagent-model-enforce` DENIES mechanical->opus/fable subagents; `agent-fanout-pressure-gate` (U-FANOUT-MECH-ENFORCE, commit 54a7183de0) DENIES all-mechanical Workflow `agent()` fan-outs and points to `scripts/lib/ollama-fanout.mjs`. The classifier is `routeClaudeTier({task})` from `claude-tier-router.mjs` (reuse it, do not re-roll a mechanical-vs-judgment heuristic).
- **PreToolUse deny/redirect** on Read/Write/Edit -- e.g. `duplication-hard-block` queries the index before asset creation; `wiki-read-offload-advisory` nudges big-wiki reads to Obsidian.
- **Stop gates** -- block/append at session end (scrutiny, handoff, `stop-force-loop-continue` RESUME_LOOP revive, the 8 wired vault/memory/wiki feeders).

**What a hook CANNOT force (do NOT build advisory clones here):**
- The MAIN LOOP's own behavior: reading a file, deriving an answer, invoking a `/skill`, or reading the vault before answering. A UserPromptSubmit hook can INJECT a mandatory-sounding directive (`skill-auto-trigger`'s "SKILL AUTO-INVOKE" block, tribal-rerank, master-index, the ~5 vault read-injectors) but the harness does not let a hook compel the main model to act on it. These stay advisory by construction. The ~11% Ollama offload rate and "vault underused" are this limit -- NOT a missing hook.

**Therefore the real levers are:**
1. HARDEN the forceable boundaries (done for Workflow fan-out; subagent tier already gated).
2. RESTRUCTURE work to FLOW THROUGH those boundaries -- i.e. agentic behavior: delegate mechanical/search/summarize work to gated subagents (`model:'sonnet'`) or `ollama-fanout`/`ask-ollama` instead of doing it in main context. This is a DOCTRINE/habit change, not a hook. [[feedback_ollama_fallback_sonnet_agents]] + [[feedback_auto_route_mechanical_fanout_to_ollama]] already codify it.

**Why:** I burned an investigation re-checking a "force the main loop" idea and a stale "not-fixed" CLAUDE.md note before confirming both the loop-continuation fix AND the vault write-side were already shipped. The vault write-side has 21 hooks (8 wired Stop) -- another write-after-learn enforcer is a guaranteed R8 dedup violation.

**How to apply:** Before building any "make Claude use X / offload Y" enforcement: (1) ask "is the target a TOOL call or the main loop's own cognition?" -- if main-loop cognition, it is NOT hook-forceable, stop. (2) `grep .claude/hooks/stop-*.mjs` + settings.json for existing coverage -- the vault/memory/wiki write path is saturated. (3) The win is almost always at the Agent/Workflow/subagent boundary or in restructuring work to delegate there. Pairs with [[feedback_ultracode_fanout_local_gpu_not_claude]].
