---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "You are scrutiny reviewer A (holistic) for PRISM commit `36105372ec` on branch c"
date: "2026-06-09"
first_ts: "2026-06-09T18:44:30.046Z"
last_ts: "2026-06-09T18:45:30.770Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-a5a4a21409080603b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# You are scrutiny reviewer A (holistic) for PRISM commit `36105372ec` on branch c

> **claude-code-cli** | 2026-06-09 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-a5a4a21409080603b.jsonl`

## Transcript

### User | 2026-06-09T18:44:30.046Z

You are scrutiny reviewer A (holistic) for PRISM commit `36105372ec` on branch cad-fusion-live-ms0. Review these two NEW files end-to-end:

1. H:/prism/.claude/hooks/ollama-nav-enforce-inject.mjs
2. H:/prism/.claude/hooks/__tests__/ollama-nav-enforce-inject.test.mjs

CONTEXT / INTENT: This is a UserPromptSubmit advisory hook. The operator directive is "enforce using ollama for searches/reads/navigating the codebase, with no loss of quality." PRISM already has scripts/ollama-prism-bridge.mjs (a local-LLM agentic harness with 7 read-only tools that answers multi-step codebase questions at ~0 Claude tokens) and an /ollama-bridge skill, but they are DORMANT (route take-rate ~0.4%). This hook auto-surfaces the bridge: it fires ONLY when a prompt contains BOTH a nav-verb (where is / how does / what wires / which files / trace / locate / navigate) AND a codebase-noun (engine/dispatcher/hook/file/...), injecting a ready-to-run `node scripts/ollama-prism-bridge.mjs "<question>"` command. It is ADVISORY (never blocks) to honor "no quality loss", dedups per-session-per-question via scripts/lib/session-once-gate.mjs, and bumps byHook[ollama-nav-enforce].suggested in mcp-server/data/state/ollama-offload-stats.json. It is cloned from the proven sibling .claude/hooks/wiki-read-offload-advisory.mjs.

ALREADY VERIFIED by the author (you may trust but spot-check): 8/8 unit tests pass; live end-to-end shows nav-question->inject, duplicate->dedup-suppressed, domain-question("how does a lathe work")->no-fire, disable-knob->suppress, and exactly 1 telemetry bump across 4 invocations.

Your holistic lens: correctness of the intent gate (false positives that would fire on a domain/non-codebase question = quality-loss risk the directive forbids; false negatives that miss real nav questions), the fail-safe behavior (must never break a prompt), the session-once dedup correctness, integration with session-once-gate and the offload-stats schema, and conformance to the wiki-read-offload-advisory
... [+276 chars truncated]

### Assistant | 2026-06-09T18:44:37.275Z

I'll review both files end-to-end. Let me read them in full.

### Assistant | 2026-06-09T18:44:37.835Z

[tool_use: Read]

### Assistant | 2026-06-09T18:44:38.446Z

[tool_use: Read]

### User | 2026-06-09T18:44:43.279Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// ollama-nav-enforce-inject.mjs -- UserPromptSubmit advisory hook
4	//
5	// The directive (operator 2026-06-09): "enforce using ollama for searches,
6	// reads, navigating the codebase ... assuming we get no loss of quality."
7	//
8	// PRISM already HAS the capability -- scripts/ollama-prism-bridge.mjs is an
9	// agentic harness that lets a LOCAL Ollama model
... [+11793 chars truncated]

### User | 2026-06-09T18:44:43.515Z

[tool_result] 1	// .claude/hooks/__tests__/ollama-nav-enforce-inject.test.mjs
2	// U-OLLAMA-NAV-ENFORCE (2026-06-09, slot:alpha): the dormant ollama-prism-bridge
3	// (local-LLM codebase navigation, ~0 Claude tokens) must auto-surface on a
4	// HIGH-CONFIDENCE nav question -- a nav-verb AND a codebase-noun -- and must NOT
5	// fire on a manufacturing-domain question, a slash-command, a long directive
6	// paste
... [+6220 chars truncated]

### Assistant | 2026-06-09T18:44:54.258Z

Now let me verify the two key dependencies the hook relies on: the `session-once-gate.mjs` API and the sibling pattern it claims to mirror.

### Assistant | 2026-06-09T18:44:55.237Z

[tool_use: Read]

### Assistant | 2026-06-09T18:44:55.399Z

[tool_use: Read]

### User | 2026-06-09T18:44:56.432Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\session-once-gate.mjs' was already read 15m ago in this session and is unchanged (mtime 1781011839836). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T18:44:56.472Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\wiki-read-offload-advisory.mjs' was already read 17m ago in this session and is unchanged (mtime 1779297180636). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-06-09T18:45:01.745Z

Both dependencies were already read in this session (I'm reviewer A, and the harness confirms I have them in context). Let me confirm the exact `session-once-gate` signatures and the offload-stats schema since correctness of the dedup and telemetry integration are load-bearing for my holistic lens.

### Assistant | 2026-06-09T18:45:03.005Z

[tool_use: Grep]

### Assistant | 2026-06-09T18:45:04.094Z

[tool_use: Grep]

### User | 2026-06-09T18:45:06.191Z

[tool_result] 46:export function seenThisSession(rateFile, sessionId, key, windowMs = DEFAULT_WINDOW_MS) {
47-  if (!sessionId || !key) return false;
48-  const state = loadSeen(rateFile);
49-  const last = state[`${sessionId}:${key}`];
50-  return typeof last === "number" && (Date.now() - last) < windowMs;
51-}
52-
53-/**
54- * Record (sessionId, key) as seen now, and prune entries older than 2×window so
55- *
... [+511 chars truncated]

### User | 2026-06-09T18:45:06.921Z

[tool_result] 13:// the next turn. Tracked under offload-stats `byHook.wiki-read-offload-advisory.suggested`
86:// ---- side-effect: bump offload-stats `byHook.<key>.suggested` ----
90:function bumpStats() {
97:    j.byHook = j.byHook || {};
98:    j.byHook[HOOK_KEY] = j.byHook[HOOK_KEY] || { fired: 0, offloaded: 0, kept: 0, suggested: 0, tokensSaved: 0 };
99:    const h = j.byHook[HOOK_KEY];
101:    h.suggeste
... [+190 chars truncated]

### Assistant | 2026-06-09T18:45:30.770Z

I have verified everything needed. The `session-once-gate` signatures match exactly (`seenThisSession(rateFile, sessionId, key)` returns false on empty inputs → fail-soft fire; `markSeenThisSession` prunes). The `bumpStats` is a byte-faithful clone of the sibling's schema (`byHook[key]={fired,offloaded,kept,suggested,tokensSaved}` + `silentSuggestions` + `lastUpdated`), and adds the atomic temp+rename the sibling lacks (an improvement, not a regression).

Holistic assessment:

**Intent gate (precision/recall):** The verb-AND-noun design is correct and conservative. False-positive risk is well-controlled — "how does a lathe work" correctly fails (`no-codebase-noun`), and the `ALREADY_ROUTING_RE` + slash-command + `MAX_PROMPT_CHARS` guards block the self-trigger hazard from the operator's own `/goal` text. One minor false-positive vector: `CODEBASE_NOUN_RE` includes generic words `files?`/`functions?`/`routes?`/`class(es)?`, so "where are the files for the customer order" could fire — but since this is advisory-only (never blocks, suppresses after one inject), this is acceptable noise, not a quality-loss event. Recall is reasonable for the named verbs.

**Fail-safe behavior:** Verified clean end-to-end. Every failure path emits `{continue:true}` — disable-knob (L194), JSON parse failure (L202), classification miss (L210), dedup hit (L219), and the top-level `.catch` (L241). `bumpStats` swallows all I/O errors. `readStdin` has a 750ms timeout and 256KB cap. No path can break a prompt. No silent failures that matter — the only swallowed errors are telemetry, which is correctly best-effort.

**Dedup correctness:** `navQuestionKey` is djb2 over normalized-lowercased text, namespaced `nav:`; normalization-insensitive (case+whitespace) so re-asks dedup, distinct questions still fire. Missing `session_id` degrades to "not seen" → fires (fail-open, correct for an advisory). Order is correct: classify → dedup-check → mark → bump → emit, so a deduped re-ask does NOT double-bump
... [+1716 chars truncated]
