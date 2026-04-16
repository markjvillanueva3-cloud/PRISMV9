# Claude/Codex Spawned Agent Directive

## Status

Active until the user explicitly replaces it.

## Purpose

This is the canonical shared rule for spawned agents in PRISM.

Spawned agents should inherit the same shared operating context as their parent session instead of acting like blank, isolated terminals.

## Shared Bundle

The spawned-agent awareness bundle should include:

- current position
- handoff current task and resume cue
- SVI / Psi / coverage-alert state
- roadmap collaboration mode and gate status
- coordination/workboard awareness
- MCP-development preference rule
- search/index-first rule
- command-bridge awareness

## Shared Helper

The canonical shared helper is:

- `H:/prism/scripts/agents/emit-spawned-agent-context.mjs`

Its shared logic lives in:

- `H:/prism/scripts/agents/spawned-agent-context-lib.mjs`

## Runtime Rule

- Claude subagents should receive this bundle automatically through the `SubagentStart` hook.
- Codex spawned agents should receive the same bundle automatically through Codex’s global spawn-agent rule and the `prism-spawn-awareness` skill.
- When possible, preserve both parent `family` and parent `instance` in the spawned-agent context so concurrent terminals remain distinguishable.

## Codex Rule

When Codex is operating in PRISM and is about to call `spawn_agent`:

1. use the `prism-spawn-awareness` skill
2. read or generate the shared bundle from `emit-spawned-agent-context.mjs`
3. include that bundle in the spawned agent’s initial prompt
4. prefer `fork_context: true` unless there is a specific reason not to

## Coordination Rule

Spawned agents should still respect lane ownership:

- Claude remains backend-first unless the user changes ownership.
- Codex remains frontend-first unless the user changes ownership.

Spawned agents should leave coordination traces when their work affects shared plans, contracts, or expectations.
