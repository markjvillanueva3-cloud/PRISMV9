---
title: DOMAIN-SOUL-AGENTS — 24 spawnable domain-expert agents (26 souls, november/yankee unmapped) + hybrid Claude/Hermes/Ollama lane
tags: [agents, souls, hermes, multi-domain, charlie, orchestration]
slot: charlie
status: built
created: 2026-06-30
---

# DOMAIN-SOUL-AGENTS — each chat-slot domain is a spawnable agent

## The idea

Operator directive 2026-06-30: *"can we make each chat slot domain an agent soul?"* + *"incorporate hermes agent capabilities as a hybrid agent"* + *"if a task involves ANY data from their domain spawn the agent (review/audit/build)."*

The fleet had 26 chat-slot **souls** (`state/shared/slot-souls/<slot>.md` — persona, `domain_filter` regex, `refuse_list`) but only generic *function-role* reviewer agents (code-analyzer, reviewer). There was no way to spawn a "quoting expert" or "ERP expert." This turns each domain soul into a real, dispatchable `subagent_type`.

## What exists (commit `bc328a1e7f`)

**24 spawnable domain-expert agents** `<slot>-<domain>`: `charlie-quoting`, `hotel-business`, `delta-cad`, `india-ai-training`, `foxtrot-mill`, `whiskey-lathe`, `mike-wedm`, `kilo-cam`, `xray-blueprint-vision`, `echo-post-processor`, `oscar-speed-feed`, `sierra-system-viz`, … (november/yankee unmapped; zebra = zulu alias). Each carries that soul's **persona + refuse-list (verbatim) + galaxy CLAUDE/MEMORY/PATHS knowledge pointers**, with full build/work tools (Read/Grep/Glob/Bash/Write/Edit).

## Architecture (composes existing engines — R8)

| Unit | File | Role |
|---|---|---|
| U1 | `mcp-server/src/engines/DomainSoulAgentRenderEngine.ts` | pure `renderAgent(soul, galaxyMeta) -> agent .md` (13 tests) |
| U2 | `scripts/generate-domain-soul-agents.mts` | tsx generator, idempotent SHA-skip, reuses canonical `SLOT_GALAXY_MAP`; emits to `.claude/agents/` (gitignored — the GENERATOR is the committed source of truth) |
| U3 | `mcp-server/src/engines/HybridAgentDispatchEngine.ts` | the **hybrid lane** selector (15 tests) |
| U4 | `prism_session:domain_soul_agent_route` + `.claude/hooks/domain-soul-agent-suggest.mjs` | route task→agent+lane; UserPromptSubmit auto-suggest (10 round-trip tests) |

## The hybrid lane (HybridAgentDispatchEngine)

The same agent persona runs as a Claude subagent OR through the free Hermes/Ollama parallel lane:
- **Free Hermes/Ollama lane** ONLY for fan-out (≥2 agents) review/audit/research/plan/draft work.
- **ALWAYS the trusted Claude lane** for `safety_write` (engine/safety/program emit) and single-agent work.
- **Degrades gracefully** `hermes → ollama → claude` when the proxy is dark (Hermes is an opt-in accelerator, never a hard dependency).

## Usage

- Spawn directly: Agent tool with `subagent_type: "charlie-quoting"` (or any `<slot>-<domain>`).
- Route a task to its agent + lane: `prism_session:domain_soul_agent_route { task_text, task_kind, hermes_healthy, parallelism }`.
- The `domain-soul-agent-suggest.mjs` UserPromptSubmit hook surfaces the right agent when a prompt touches a domain.
- Refresh after editing a soul: `node mcp-server/node_modules/.bin/tsx scripts/generate-domain-soul-agents.mts`.

## Lessons (3-of-3 scrutiny caught 4 real P1s)

1. `firstHeadline` read SOUL.md **frontmatter** → garbled `description: "...galaxy: quoting..."`. Fix: skip the `---…---` block + bare `key: value` lines.
2. The hook emitted `<slot>-<slot>` for the unmapped november/yankee (both `domain_filter: any`). Fix: skip slots not in `SLOT_GALAXY_MAP` (mirror the dispatcher).
3. A stale comment claimed a "static fallback" that didn't exist → an import failure would emit `charlie-charlie` fleet-wide. Fix: correct + skip-when-null.
4. **bare `node …mts` was a SILENT NO-OP** (Node 24 type-strips the .mts but silently fails the cross-file `.ts` import, exit 0 no output → cron hazard). Fix: the reexec guard tries platform tsx variants with `shell:true` and FAILS LOUD (exit 2) if it can't reexec.

## Related

[[feedback_multi_domain_fleet_policy]] (the policy this serves) · `SoulSubagentRouterEngine` (the `preferred_subagent_type` router this complements) · `HermesAutonomousDriveRunnerEngine` (the parallel executor the hybrid lane feeds). Memory: [[reference_domain_soul_agents_2026_06_30]].
