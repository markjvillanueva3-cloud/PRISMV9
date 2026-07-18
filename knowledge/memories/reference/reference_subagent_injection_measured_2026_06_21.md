---
name: reference_subagent_injection_measured_2026_06_21
description: "Per-subagent (Task/Agent-spawn) injection ceiling is now MEASURED at 3.65KB (commit cf40d23901) -- the galaxy CLAUDE.md section-12 '200K anchor tokens injected into every subagent' thread is a verified non-problem. New instrument scripts/measure-subagent-injection.mjs. Also surfaced: agent-rules-inject is Task-name-gated (dead for the Agent tool) but HARMLESS (subagent-start-context SubagentStart covers it)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.212Z
aliases: reference_subagent_injection_measured_2026_06_21
---


# Subagent (Task/Agent-spawn) injection ceiling MEASURED -- section-12 is a non-problem (2026-06-21, slot:alpha)

Commit `cf40d23901` (+ P2 comment fix `0693e28ef0`). Built the missing instrument that closes the unmeasured spawn-time injection path; verify-first per [[feedback_measure_injection_before_dedup_fix]].

**The instrument:** `scripts/measure-subagent-injection.mjs` (15/15 tests). `audit-injection-surface.mjs` censuses SessionStart + UserPromptSubmit, but the PER-SUBAGENT (Task/Agent-spawn) injection path was measured by NOTHING -- the existing byte-probe feeds a `{prompt}` stdin so a PreToolUse hook gated on `tool_name==="Task"` emits 0 under it. The new tool enumerates ONLY Task/Agent-matched PreToolUse context-emitters (EXCLUDES catch-all `.*` groups so it never runs destructive guards like node-process-janitor), probes each with a real spawn stdin under BOTH tool names, sums `additionalContext`-only bytes (subagent-visible; NOT systemMessage). Reuses the pure path helpers from `audit-injection-surface.mjs` (no shared-lib change). CLI: `node scripts/measure-subagent-injection.mjs [--json|--list|--cap N]`.

**LIVE RESULT:** ceiling = **3,739 B (3.65 KB)**, far under the 8KB soft cap. The galaxy CLAUDE.md section-12 / section-5#6 claim that ">200K anchor tokens injected into every Task/Workflow subagent" is a **MEASURED non-problem** -- both named injectors are tightly capped (`cag-cold-cache-anchor` 4096B SessionStart summary, NOT the 200K doctrine text; `agent-rules-inject` MAX_CHARS=3500). Do NOT build a "gate SessionStart off for subagents" fix -- the caps already prevent overflow.

**Surfaced finding (instrument working as designed) -- `agent-rules-inject` is name-gated + DEAD for the current tool, but HARMLESS:** it emits 3739B under `tool_name="Task"` and **0B under "Agent"** (matcher `^Task$` + internal `=== "Task"` gate). This harness's subagent tool is named **Agent**, so agent-rules-inject does not fire for it. NOT a drift gap: `subagent-start-context.mjs` (SubagentStart event, wired in settings.json) injects the full spawned-agent context bundle (`buildSpawnedAgentAdditionalContext`) into every subagent. So agent-rules-inject is a **legacy-redundant cleanup candidate** (PreToolUse:Task path superseded by the SubagentStart path), not a bug to fix.

**Also closed this session (measured non-problems, recorded in `state/shared/specs/CONTEXT-AWARENESS-OBSIDIAN-IMPROVEMENTS-2026-06-21.md`):** CU-1 (STABLE_SESSION_TTL_MS dedup class) + CU-1b (synergy-definition-inject dedup) -- `audit-injection-surface.mjs --bytes` showed the per-turn injection surface already comprehensively optimized (0 knobless context-injectors, synergy-definition keyword-gated to ~0B steady-state). The remaining real token levers are base-context (CAG cold-anchor caches it) + free-model offload, NOT per-turn/per-subagent injection dedup (DONE).

**Meta:** 4 alpha injection "open threads" investigated this session; all 4 were non-problems-or-stale (CU-1, CU-1b, section-12 overflow, agent-rules-inject drift). Strong signal that alpha's injection lane is well-optimized + the galaxy-doc open-threads are partly stale. Sibling of [[feedback_measure_injection_before_dedup_fix]] + [[reference_context_awareness_improvements_2026_06_21]]. The companion AW-1 fix (false-critical /compact) shipped `17eb3a1acf`.
