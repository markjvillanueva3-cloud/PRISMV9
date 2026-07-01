---
type: "chat-session"
source: "claude-code-cli"
session_id: "df944902-c90f-484b-86ea-6b35b3c9143f"
title: "Independent second-pass review of `H:/prism/.claude/hooks/skill-auto-trigger.mjs"
date: "2026-05-18"
first_ts: "2026-05-18T22:56:44.708Z"
last_ts: "2026-05-18T23:00:52.993Z"
cwd: "H:\\prism"
messages: 53
user_msgs: 21
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/df944902-c90f-484b-86ea-6b35b3c9143f/subagents/agent-a6b72e6b0e86c16e9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Independent second-pass review of `H:/prism/.claude/hooks/skill-auto-trigger.mjs

> **claude-code-cli** | 2026-05-18 | 53 msgs (21 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/df944902-c90f-484b-86ea-6b35b3c9143f/subagents/agent-a6b72e6b0e86c16e9.jsonl`

## Transcript

### User | 2026-05-18T22:56:44.708Z

Independent second-pass review of `H:/prism/.claude/hooks/skill-auto-trigger.mjs` for COMMAND-KERNEL-MS0/U-CK16. Companion test: `H:/prism/.claude/hooks/__tests__/skill-auto-trigger-pipeline.test.mjs` (35/35 PASS).

CONTEXT: this hook is wired into `C:/Users/wompu/.claude/settings.json` (auto-mirrored to H:/.claude/settings.json) on THREE hook events: UserPromptSubmit (existing), PostToolUse (NEW), Stop (NEW). All three matchers point at the same hook script. The hook self-gates on `payload.hook_event_name`.

DO NOT assume the companion code-analyzer reviewer caught everything. Weighted toward what they're unlikely to flag:

1. **Integration with already-wired hooks** — is the hook polite about settings.json's existing chain? At Stop it sits AFTER `goal-complete-gate.mjs`, `scrutinize-before-stop.mjs`, `enforce-handoff-topic.mjs`. At PostToolUse it sits as a third entry in the `""` matcher block. Could it interfere with later hooks (e.g. by emitting non-{continue:true} JSON that confuses the harness)?

2. **Hidden coupling** — `readPipelines()` reads `knowledge/wiki/os/pipelines/*.md`. If a peer chat regenerates that directory mid-fire, do we error out cleanly?

3. **Error budget completeness** — every try/catch in the file: do they all fail-soft (emit `{continue:true}`)? Are there any unhandled-promise-rejection paths?

4. **Naming / convention conformance** — match PRISM hook style (compare to `.claude/hooks/master-index-precheck-inject.mjs` if relevant)?

5. **Inlined constants** — any magic numbers in the code (NOT in named-const declarations)? CLAUDE.md doctrine: lift to constants.

6. **Stub assertions in the test file** — verify NO `toBeDefined()`-style trivia. Each test must encode WHY behavior matters (R9).

7. **Suggest-only invariant** — confirm NO path emits `{block:true}`, `{continue:false}`, `{decision:"block"}`, or exit code 2.

8. **Back-compat** — UserPromptSubmit prompts without /commands should produce IDENTICAL output to the pre-U-CK16 hook for t
... [+678 chars truncated]

### Assistant | 2026-05-18T22:56:53.390Z

I'll conduct an independent second-pass review of the hook and its test file. Let me start by reading the relevant files.

### Assistant | 2026-05-18T22:56:54.033Z

[tool_use: Read]

### Assistant | 2026-05-18T22:56:54.490Z

[tool_use: Read]

### User | 2026-05-18T22:56:55.324Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\skill-auto-trigger.mjs' was already read 15s ago in this session and is unchanged (mtime 1779144588275). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-18T22:56:58.851Z

[tool_result] 1	// COMMAND-KERNEL-MS0/U-CK16 — skill-auto-trigger.mjs pipeline-aware extension.
2	//
3	// 28 cases across the 5 exported pure functions + 4 subprocess oracles
4	// (UserPromptSubmit, PostToolUse, Stop, unknown-event). Hermetic: every
5	// test points the hook at tmpdir fixtures via env knobs.
6	//
7	// Run: node --test H:/prism/.claude/hooks/__tests__/skill-auto-trigger-pipeline.test.mjs
8	
9	im
... [+16210 chars truncated]

### Assistant | 2026-05-18T22:57:01.358Z

I have the test file. Let me now read the hook source itself.

### Assistant | 2026-05-18T22:57:02.009Z

[tool_use: Read]

### User | 2026-05-18T22:57:03.593Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\skill-auto-trigger.mjs' was already read 24s ago in this session and is unchanged (mtime 1779144588275). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T22:57:08.968Z

The guard says it's in context, but I don't actually see the hook source in my context — only the test file. Let me read with an offset to bypass.

### Assistant | 2026-05-18T22:57:09.745Z

[tool_use: Read]

### User | 2026-05-18T22:57:11.150Z

[tool_result] 0	#!/usr/bin/env node
1	// tier: T2
2	/**
3	 * skill-auto-trigger.mjs — pipeline-aware multi-event suggester.
4	 *
5	 * History:
6	 *   - DEV-VELOCITY-AUTOTRIGGER-MS0 (Phase D.2): UserPromptSubmit-only,
7	 *     skill-trigger jsonl matching, suggest-only.
8	 *   - COMMAND-KERNEL-MS0/U-CK16: extended to fire on PostToolUse + Stop
9	 *     in addition to UserPromptSubmit, AND to suggest pipelines (f
... [+24264 chars truncated]

### Assistant | 2026-05-18T22:57:13.850Z

Now let me check settings.json for the new hook wiring and the master-index-precheck-inject.mjs for convention comparison.

### Assistant | 2026-05-18T22:57:15.395Z

[tool_use: Grep]

### Assistant | 2026-05-18T22:57:16.254Z

[tool_use: Read]

### User | 2026-05-18T22:57:17.733Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+5007 chars truncated]

### User | 2026-05-18T22:57:17.824Z

[tool_result] 534-          },
535-          {
536-            "type": "command",
537:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/skill-auto-trigger.mjs",
538-            "timeout": 1500
539-          }
540-        ]
541-      },
542-      {
--
798-          },
799-          {
800-            "type": "command",
801:            "command": "\"H:/.claude/bin/portable-node\" H:/p
... [+524 chars truncated]

### Assistant | 2026-05-18T22:57:22.814Z

Now let me check a few more things: the actual surrounding settings.json structure, the pipelines directory, and a sibling hook for convention.

### Assistant | 2026-05-18T22:57:26.318Z

[tool_use: Bash]

### Assistant | 2026-05-18T22:57:29.827Z

[tool_use: Bash]

### Assistant | 2026-05-18T22:57:30.717Z

[tool_use: Bash]

### User | 2026-05-18T22:57:31.761Z

[tool_result] UserPromptSubmit — block#0 matcher="" hook#3 timeout=1500
PostToolUse — block#0 matcher="" hook#2 timeout=1500
Stop — block#0 matcher="" hook#45 timeout=1500

### User | 2026-05-18T22:57:36.788Z

[tool_result] Stop[0].hooks[0] matcher="" goal-complete-gate.mjs
Stop[0].hooks[1] matcher="" scrutinize-before-stop.mjs
Stop[0].hooks[2] matcher="" macro-bulk-emit-guard.mjs
Stop[0].hooks[3] matcher="" stop-force-handoff.mjs
Stop[0].hooks[4] matcher="" stop-force-loop-continue.mjs
Stop[0].hooks[5] matcher="" stress-harness-emit.mjs
Stop[0].hooks[6] matcher="" stop-auto-wire.mjs
Stop[0].hooks[7] matcher="" stop-
... [+1787 chars truncated]

### User | 2026-05-18T22:57:41.524Z

[tool_result] .gitkeep  0B
_schema.md  11.6K
diagnose-fix.html  14.8K
diagnose-fix.md  5.4K
forge-supervised.html  14.1K
forge-supervised.md  5.0K
goal-complete.md  6.0K
knowledge-injection.md  7.8K
learn-pipeline.html  14.4K
learn-pipeline.md  5.4K
loop.md  7.7K
pipeline.html  15.9K
pipeline.md  6.0K
program-perfect.html  14.9K
program-perfect.md  5.4K
research.html  19.1K
research.md  8.3K
scrutiny-gate.html 
... [+134 chars truncated]

### Assistant | 2026-05-18T22:57:44.727Z

Let me verify the rest of the Stop chain layout and a real pipeline frontmatter to check edge cases.

### Assistant | 2026-05-18T22:57:50.169Z

[tool_use: Bash]

### Assistant | 2026-05-18T22:57:51.088Z

[tool_use: Bash]

### User | 2026-05-18T22:57:56.099Z

[tool_result] Stop[0].hooks[40] "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/stop_c
Stop[0].hooks[41] fleet-reaper-stop.mjs
Stop[0].hooks[42] fleet-task-health-stop.mjs
Stop[0].hooks[43] wiki-propagation-watchdog-stop.mjs
Stop[0].hooks[44] enforce-handoff-topic.mjs
Stop[0].hooks[45] skill-auto-trigger.mjs
---
PostToolUse[0].hooks[0] matcher="" precompact-auto-trigger.mjs
PostToolUse[0].hooks[1] matcher
... [+1314 chars truncated]

### User | 2026-05-18T22:58:02.306Z

[tool_result] ==> H:/prism/knowledge/wiki/os/pipelines/loop.md <==
---
title: PRISM pipeline — /loop autonomous iteration
slug: loop
kind: pipeline
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK04-extension
author: claude-41db1b82 (slot india)
trigger: cron
composed_of: [/checkin, /pick-unit, scrutinize, close-out, /handoff]
---

# `/loop` — Autonomous Iteration Pipeline

`/loop` is P
... [+2274 chars truncated]

### Assistant | 2026-05-18T22:58:05.537Z

I now have enough information for the review. Let me complete the analysis.

### Assistant | 2026-05-18T22:58:08.994Z

[tool_use: Bash]

### User | 2026-05-18T22:58:12.970Z

[tool_result] Exit code 1
node:internal/modules/esm/load:217
    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(parsed, schemes);
          ^

Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'h:'
    at throwIfUnsupportedURLScheme (node:internal/modules/esm/lo
... [+599 chars truncated]

### Assistant | 2026-05-18T22:58:14.336Z

[tool_use: Bash]

### User | 2026-05-18T22:58:14.337Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(node -e "
// Verify a key edge case: kno…) errored</tool_use_error>

### Assistant | 2026-05-18T22:58:22.151Z

[tool_use: Bash]

### User | 2026-05-18T22:58:29.073Z

[tool_result] {"slug":"diagnose-fix","triggerKind":"command","triggerCmd":"/diagnose-fix","events":[],"composed3":["/forge-debug","error-pattern-memory-lookup","regression-hunter-agent"]}
{"slug":"forge-supervised","triggerKind":"command","triggerCmd":"/forge-supervised","events":[],"composed3":["duplication-guard-preflight","/research","/forge-triple"]}
{"slug":"goal-complete","triggerKind":"hook","triggerCmd"
... [+1607 chars truncated]

### Assistant | 2026-05-18T22:58:35.114Z

Good — the `Bash`-substring concern is *not* a live bug today: no real pipeline lists literal `"Bash"` in `composed_of`, so `matchPipelinesForTool('Bash', { command: 'echo' })` returns `[]`. But the test fixture in the test file *does* construct that case artificially — it's a latent design hazard I'll flag as P2. Also, **`/loop`** has `triggerKind:"cron"` and `triggerCommand:null`, which means `matchPipelinesForPrompt` will NOT surface `/loop` against a prompt like `/loop continue`. Critical bug for the live registry — let me verify against the test claims.

### Assistant | 2026-05-18T22:58:41.121Z

[tool_use: Bash]

### Assistant | 2026-05-18T22:58:43.344Z

[tool_use: Bash]

### User | 2026-05-18T22:58:50.579Z

[tool_result] Test claim: "/loop" in prompt suggests loop pipeline
Result: []
--- subprocess test ---

### User | 2026-05-18T22:58:55.362Z

[tool_result] 0
---trigger lines with /loop or loop---

### Assistant | 2026-05-18T22:59:00.592Z

**This is the load-bearing bug** — `loop` pipeline has `trigger: cron` (not `command`), so `triggerCommand` remains `null` → it never matches a prompt mention. The `goal-complete` pipeline has `trigger: hook`, also `null` triggerCommand. The `/loop` subprocess test passes because `/loop continue` happens to *not* trigger any skill, returning `additionalContext` undefined — and the test's OR-clause is wrapped in `if (out.hookSpecificOutput)`, which short-circuits to "skip the assertion." Let me confirm.

### Assistant | 2026-05-18T22:59:03.955Z

[tool_use: Bash]

### User | 2026-05-18T22:59:08.958Z

[tool_result] status: 0
stdout: {"continue":true}
stderr:

### Assistant | 2026-05-18T22:59:14.659Z

**Confirmed: P0 false-green.** The hook returns `{continue:true}` with no `hookSpecificOutput` for `prompt: "/loop continue task queue"`. The test at lines 334-344 wraps its assertion in `if (out.hookSpecificOutput)` — that branch is never entered, so the assertion is *never executed*, and the test passes regardless. The pipeline-on-prompt arm is BROKEN against the live registry today (none of the cron/hook-triggered pipelines surface on a prompt mention because `triggerCommand` only auto-derives for `triggerKind === "command"`).

Let me also check the Stop subprocess test claim against live data.

### Assistant | 2026-05-18T22:59:19.507Z

[tool_use: Bash]

### User | 2026-05-18T22:59:27.971Z

[tool_result] Stop status: 0 stdout: {"continue":true,"suppressOutput":true,"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"⚙ Pipeline auto-trigger (Stop) — top-1 session-end pipeline:\n  ⚙ pipeline /goal-complete   (ho
PostToolUse status: 0 stdout: {"continue":true}

### Assistant | 2026-05-18T22:59:32.317Z

Good — Stop arm works (catches `goal-complete` via the `-gate` heuristic). PostToolUse returns `{continue:true}` with no context — same false-green pattern (the test's `if (out.hookSpecificOutput)` short-circuit hides the no-match case). Let me check one more concern — the `RECENT_WINDOW = 3` is unused.

### Assistant | 2026-05-18T22:59:33.402Z

[tool_use: Bash]

### Assistant | 2026-05-18T22:59:34.188Z

[tool_use: Bash]

### User | 2026-05-18T22:59:39.378Z

[tool_result] 70:const RECENT_WINDOW = 3;
71:const RECENT_CAP = 5;
72:const RECENT_CAP_TOTAL = RECENT_CAP * 3;     // 3 event classes
368:  const slice = sameEvent.slice(-RECENT_WINDOW);
377:  if (rec.entries.length > RECENT_CAP_TOTAL) rec.entries = rec.entries.slice(-RECENT_CAP_TOTAL);

### User | 2026-05-18T22:59:46.965Z

[tool_result] cleanup done

### Assistant | 2026-05-18T23:00:52.993Z

Constants are used. Time to deliver the verdict.

---

# Independent Second-Pass Review — `skill-auto-trigger.mjs` (U-CK16)

**Verdict: FAIL** — one P0 false-green test, one P1 live-registry mismatch causing the headline UserPromptSubmit-pipeline arm to surface zero matches against today's registry, plus three P2 hardening items.

---

## P0 — Test asserts behavior that is never reached (false-green)

**File:** `H:/prism/.claude/hooks/__tests__/skill-auto-trigger-pipeline.test.mjs:333-344`

The "subprocess — UserPromptSubmit with `/loop` suggests pipeline" test wraps its substantive assertion in `if (out.hookSpecificOutput)`. The live hook returns bare `{"continue":true}` for input `prompt: "/loop continue task queue"` (verified by direct subprocess invocation — see Bash transcript above), because:

1. `_skill-triggers.jsonl` has no `name:"loop"` entry → no skill match.
2. `/loop` pipeline frontmatter has `trigger: cron` → `triggerKind === "cron"` → `triggerCommand` stays `null` (the auto-derive on `readPipelines` lines 265-267 only fires for `triggerKind === "command"`) → `matchPipelinesForPrompt` skips it via the `if (!p.triggerCommand) continue` guard on line 300.

Net: the `out.hookSpecificOutput` branch is never entered, the `assert.ok` inside is never executed, and the test passes for the wrong reason. The same false-green pattern hides in the **`subprocess — PostToolUse with Bash`** test (lines 346-356, `// May or may not have matches`) and **`subprocess — Stop event`** test (lines 358-369, also guarded). Only the Stop case actually surfaces context against the live registry (via `goal-complete`).

R9 violation: a test that passes whether the suggester fires or not encodes no intent. R12 violation: the failure is silent.

**Fix:** assert unconditionally for at least the `/loop` and Stop subprocess cases, since both are reproducible against today's registry once P1 below is also fixed.

---

## P1 — UserPromptSubmit pipeline arm dead against live registry

**F
... [+8057 chars truncated]
