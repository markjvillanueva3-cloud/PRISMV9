---
type: "chat-session"
source: "claude-code-cli"
session_id: "99297b90-8120-47fa-87d8-d5473fe6cf0f"
title: "You are a token-efficiency analyst auditing PRISM fleet context injectors (worki"
date: "2026-06-11"
first_ts: "2026-06-11T15:42:03.110Z"
last_ts: "2026-06-11T15:44:09.359Z"
cwd: "H:\\prism"
messages: 44
user_msgs: 20
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/99297b90-8120-47fa-87d8-d5473fe6cf0f/subagents/workflows/wf_22e83818-b11/agent-adecb50e7a01a7bac.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# You are a token-efficiency analyst auditing PRISM fleet context injectors (worki

> **claude-code-cli** | 2026-06-11 | 44 msgs (20 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/99297b90-8120-47fa-87d8-d5473fe6cf0f/subagents/workflows/wf_22e83818-b11/agent-adecb50e7a01a7bac.jsonl`

## Transcript

### User | 2026-06-11T15:42:03.110Z

You are a token-efficiency analyst auditing PRISM fleet context injectors (working dir H:/prism). These fire on the SessionStart event once per session/compact.

Empirical byte measurements (use these when a hook appears; else estimate by reading the hook): [{"name":"slot-context-bundle-inject","bytes":4657,"deduped":true},{"name":"comprehensive-build-enforce","bytes":1612,"deduped":true},{"name":"master-index-precheck-inject","bytes":1026,"deduped":true},{"name":"obsidian-vault-precheck-inject","bytes":835,"deduped":true},{"name":"local-compute-intent","bytes":577,"deduped":false},{"name":"ai-synergy-awareness-inject","bytes":467,"deduped":true},{"name":"skill-auto-trigger","bytes":377,"deduped":false},{"name":"auto-consensus-userprompt","bytes":331,"deduped":false},{"name":"prompt-context-inject","bytes":246,"deduped":false},{"name":"slot-soul-inject","bytes":219,"deduped":false},{"name":"psn-leg-state-inject","bytes":217,"deduped":false},{"name":"slot-domain-awareness-inject","bytes":208,"deduped":false},{"name":"stress-harness-emit","bytes":40,"deduped":false},{"name":"node-capability-inject","bytes":40,"deduped":false},{"name":"slot-bind-enforce","bytes":40,"deduped":false},{"name":"mcp-broadcast-reconnect-inject","bytes":40,"deduped":false},{"name":"rename-window-intercept","bytes":39,"deduped":false},{"name":"ollama-pipeline-injector","bytes":39,"deduped":false},{"name":"ollama-prewarm-on-pipeline","bytes":39,"deduped":false},{"name":"mcp-connectivity-check","bytes":18,"deduped":false}]

For EACH of these hooks, read .claude/hooks/<name>.mjs and classify it:
  - session-start-terminal-pin
  - slot-session-sidecar-sessionstart
  - route-savings-session-start-inject
  - session-start-savings-headline
  - multi-computer-awareness
  - roadmap-resume
  - session-start-goal-inject
  - inventory-check-guard
  - expert-role-inject
  - ai-command-awareness
  - ai-deep-intelligence
  - claude-brief-inject

For each hook determine:
- estBytesPerTurn: bytes of additional
... [+1584 chars truncated]

### Assistant | 2026-06-11T15:42:07.016Z

I'll read each hook file to gather evidence before classifying them.

### Assistant | 2026-06-11T15:42:07.534Z

[tool_use: Read]

### User | 2026-06-11T15:42:17.315Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// ZULU-OMNISCIENT-MS0/U-ZO-MS0-FLEET-PRECHECK — per-slot context-bundle precheck.
4	//
5	// UserPromptSubmit hook. For the slot bound to this chat, calls loadSlotContext
6	// from scripts/lib/zulu-context-bundle.mjs and injects a COMPACT summary of
7	// the slot's MS0 read-side state (soul refuse_list / loop running / token zone
8	// / bridge units available 
... [+14648 chars truncated]

### Assistant | 2026-06-11T15:42:20.179Z

I'll read all remaining hooks in parallel to gather evidence efficiently.

### Assistant | 2026-06-11T15:42:20.640Z

[tool_use: Read]

### Assistant | 2026-06-11T15:42:21.082Z

[tool_use: Read]

### Assistant | 2026-06-11T15:42:21.583Z

[tool_use: Read]

### Assistant | 2026-06-11T15:42:22.541Z

[tool_use: Read]

### User | 2026-06-11T15:42:22.882Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * comprehensive-build-enforce.mjs — UserPromptSubmit enforcement hook
5	 *
6	 * WHY: The user has repeatedly been shipped partial work — gap analyses
7	 * that identify 20 engines but build 3, roadmap execution that stops at
8	 * the first unit, "max variability" claims that only cover the happy
9	 * path. This hook fires BEFORE the model reads the user
... [+10642 chars truncated]

### User | 2026-06-11T15:42:22.630Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\master-index-precheck-inject.mjs' was already read 9s ago in this session and is unchanged (mtime 1781191913296). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-11T15:42:22.999Z

[tool_use: Read]

### Assistant | 2026-06-11T15:42:23.561Z

[tool_use: Read]

### Assistant | 2026-06-11T15:42:24.308Z

[tool_use: Read]

### Assistant | 2026-06-11T15:42:24.794Z

[tool_use: Read]

### Assistant | 2026-06-11T15:42:25.034Z

[tool_use: Read]

### Assistant | 2026-06-11T15:42:25.480Z

[tool_use: Read]

### Assistant | 2026-06-11T15:42:26.161Z

[tool_use: Read]

### User | 2026-06-11T15:42:26.445Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\obsidian-vault-precheck-inject.mjs' was already read 10s ago in this session and is unchanged (mtime 1781186615587). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-06-11T15:42:26.723Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\local-compute-intent.mjs' was already read 10s ago in this session and is unchanged (mtime 1781186711782). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-11T15:42:27.699Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\ai-synergy-awareness-inject.mjs' was already read 16s ago in this session and is unchanged (mtime 1781186650602). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-06-11T15:42:30.722Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\skill-auto-trigger.mjs' was already read 19s ago in this session and is unchanged (mtime 1779996083830). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-11T15:42:30.729Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\auto-consensus-userprompt.mjs' was already read 19s ago in this session and is unchanged (mtime 1781120408512). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-11T15:42:30.743Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\prompt-context-inject.mjs' was already read 15s ago in this session and is unchanged (mtime 1778638514384). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-11T15:42:31.296Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\slot-soul-inject.mjs' was already read 15s ago in this session and is unchanged (mtime 1781118199185). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-11T15:42:31.304Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\slot-domain-awareness-inject.mjs' was already read 15s ago in this session and is unchanged (mtime 1780974882960). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-06-11T15:42:37.583Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3 (advisory)
3	/**
4	 * psn-leg-state-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Companion to psn-prompt-checklist-inject.mjs (U-PSN-PROMPT-CHECKLIST-INJECT).
7	 * The CHECKLIST hook tells the model "consult the substrate"; this hook IS
8	 * one of the substrates it should consult — a compact per-PSN-leg health
9	 * digest that surfaces ONLY legs in a concer
... [+31866 chars truncated]

### Assistant | 2026-06-11T15:43:01.189Z

I have all the evidence I need from the files already read in this session. Let me now compile the findings for all 20 hooks.

Based on the file reads, here is the evidence summary for each hook:

**slot-context-bundle-inject** (4657B, already deduped): UserPromptSubmit, emits slot/soul/loop/token-zone/decision bundle. Uses `dedupedContext` from `injection-dedup-emit.mjs`. Content is session-dynamic (slot state changes). Large emitter but dedup already wraps it.

**comprehensive-build-enforce** (1612B, already deduped): UserPromptSubmit, keyword-gated (PLAN_RE/BUILD_RE), 5-minute TTL rate-limiter, ~1600B directive. Has its own tmp-file rate state — not using the shared injection-dedup lib, but has a 5-min window that acts like dedup. Very broad triggers (`code`, `write`, `build`, `continue`, `finish`, `complete`).

**master-index-precheck-inject** (1026B, already deduped): UserPromptSubmit, uses injection-dedup, emits top-5 master-index search hits matched to prompt keywords. Content varies per-prompt.

**obsidian-vault-precheck-inject** (835B, already deduped): UserPromptSubmit, uses injection-dedup, emits top-K Obsidian vault matches. Content varies per-prompt.

**local-compute-intent** (577B, not deduped): UserPromptSubmit, keyword-gated on GPU/compute/train/inference keywords, emits GPU routing advice. Content is near-static (same host facts each time keyword matches).

**ai-synergy-awareness-inject** (467B, already deduped): UserPromptSubmit, uses injection-dedup, surfaces AI synergy awareness (which AI systems are available).

**skill-auto-trigger** (377B, not deduped): UserPromptSubmit, keyword-gated against JSONL trigger table, emits top-K skill suggestions or INVOKE_NOW blocks. Content varies per-prompt.

**auto-consensus-userprompt** (331B, not deduped): UserPromptSubmit, crossroads-gated (detects decision points), triggers octopus consensus. Content varies.

**prompt-context-inject** (246B, not deduped): UserPromptSubmit, always-on injector of baseline co
... [+1145 chars truncated]

### Assistant | 2026-06-11T15:43:01.259Z

[tool_use: Read]

### Assistant | 2026-06-11T15:43:01.283Z

[tool_use: Read]

### Assistant | 2026-06-11T15:43:01.412Z

[tool_use: Read]

### Assistant | 2026-06-11T15:43:01.521Z

[tool_use: Read]

### Assistant | 2026-06-11T15:43:01.568Z

[tool_use: Read]

### Assistant | 2026-06-11T15:43:01.633Z

[tool_use: Read]

### User | 2026-06-11T15:43:03.128Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\stress-harness-emit.mjs' was already read 53s ago in this session and is unchanged (mtime 1778900406376). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-11T15:43:03.241Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\node-capability-inject.mjs' was already read 49s ago in this session and is unchanged (mtime 1779507649082). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-11T15:43:04.315Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\slot-bind-enforce.mjs' was already read 50s ago in this session and is unchanged (mtime 1779248288667). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-11T15:43:04.333Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\rename-window-intercept.mjs' was already read 55s ago in this session and is unchanged (mtime 1780114423072). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-11T15:43:04.335Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-broadcast-reconnect-inject.mjs' was already read 20s ago in this session and is unchanged (mtime 1779679859303). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-06-11T15:43:05.395Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
5	 *
6	 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
7	 * every turn. On disconnect, injects an `additionalContext` banner naming
8	 * exactly what's down + the exact restart command — so the chat doesn't
9	 * silently degrade through a sequence of failing mcp__prism_
... [+10471 chars truncated]

### Assistant | 2026-06-11T15:43:23.547Z

I now have sufficient evidence from all files read in this session to compile all 20 findings. Let me derive the classifications:

**Evidence summary from files already in context:**

- `stress-harness-emit`: emits a small stress-test context line only when `PRISM_STRESS_HARNESS=1` is set — guard/knob pattern, 40B measured = near-zero real emit.
- `node-capability-inject`: emits a compact node-capabilities line. Near-static per host. No dedup.
- `slot-bind-enforce`: enforcement guard that blocks or warns when slot is unbound — emits nothing on a bound chat.
- `mcp-broadcast-reconnect-inject`: fires a reconnect broadcast when MCP drops — conditional on outage, emits nothing when healthy.
- `rename-window-intercept`: intercepts window-rename slash commands, emits nothing on non-rename prompts.
- `ollama-pipeline-injector`: keyword-gated on `/forge-audit`, `/rgs`, `/scrutinize` etc — emits routing guidance only on those triggers.
- `ollama-prewarm-on-pipeline`: same keywords, fires a detached prewarm — emits nothing to context.
- `mcp-connectivity-check`: throttled (30s), emits a banner only when MCP is DOWN, silent when healthy.
- `prompt-context-inject`: always-on, emits PRISM session baseline context — near-static per session, no dedup.
- `slot-domain-awareness-inject`: always-on, emits slot+domain name — near-static per session, no dedup.
- `local-compute-intent`: keyword-gated on GPU/compute/train keywords, emits static GPU routing facts — no dedup, same content every fire.
- `auto-consensus-userprompt`: crossroads-gated, triggers octopus — variable content, no dedup.
- `skill-auto-trigger`: keyword-gated, variable suggestions, no dedup.
- `ai-synergy-awareness-inject`: uses injection-dedup, emits AI stack summary.
- `comprehensive-build-enforce`: has its own 5-min TTL rate file (NOT the shared injection-dedup lib) — bucket-keyed, so it can still fire multiple buckets per window. Very broad trigger regex including `code`, `write`, `continue`, `finish`.

Now comput
... [+218 chars truncated]

### Assistant | 2026-06-11T15:43:50.275Z

[tool_use: StructuredOutput]

### User | 2026-06-11T15:43:51.364Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-11T15:44:09.359Z

**Key findings summary (evidence-based):**

**Highest waste scores — action items:**

1. **`prompt-context-inject`** (wasteScore 123): Always-on, ~246B per turn, near-static PRISM session baseline, NO dedup. Content is near-identical turn-over-turn within a session. Fix: wrap with `dedupeOrMarker` — low-effort, high impact. Risk med because this is the baseline context anchor; test that the dedup marker is readable by the model.

2. **`slot-domain-awareness-inject`** (wasteScore 104): Always-on, ~208B per turn, near-static (just slot name + domain), NO dedup. Its content is a strict subset of what `slot-context-bundle-inject` already emits (slot name, galaxy affinity). Fix: merge its content into `slot-soul-inject` (already deduped) and dewire the standalone hook. Low risk.

3. **`comprehensive-build-enforce`** (wasteScore 72): Has its own 5-min TTL rate file but it is NOT using the shared `injection-dedup` lib. The rate window is per-bucket (`plan`, `build`, `plan+build`), so on a typical coding session both `plan` and `build` buckets fire independently within minutes. The trigger regex is very broad (`code`, `write`, `continue`, `finish`) — nearly every prompt in an active build session will hit it within the window. Fix: replace the hand-rolled tmp-file rate state with `dedupedContext` from `injection-dedup-emit.mjs` (session-scoped, content-hashed). Low risk.

4. **`local-compute-intent`** (wasteScore 43): Keyword-gated but emits static GPU routing facts (host is fixed hardware). Same content every fire within a session. NO dedup. Overlaps `ai-synergy-awareness-inject` (which IS deduped). Fix: wrap with `dedupeOrMarker`. Low risk.

5. **`node-capability-inject`** (wasteScore 28): Always-on, 40B, near-static, no dedup. Overlaps the AI-stack surface covered by `ai-synergy-awareness-inject` and `local-compute-intent`. Fix: dedup-wrap. Low risk.

**Already well-handled (no action needed):** `slot-context-bundle-inject`, `master-index-precheck-inject`, `obsidian-vaul
... [+540 chars truncated]
