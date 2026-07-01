---
name: hook-lifecycle-anatomy
category: code-tribal
domain: backend-dev
tags: [hook, lifecycle, user-prompt-submit, pre-tool-use, post-tool-use, stop-hook, session-start, claude-code, ai-development]
last_updated: 2026-05-18
---

# Hook Lifecycle Anatomy — when each PRISM hook fires

Claude Code fires hooks at six lifecycle points. Confusing the points is one of the most common new-hook bugs in PRISM. The anatomy is load-bearing for hook authoring.

## The six lifecycle points

| Event | When | Can BLOCK? | Used for |
|-------|------|-----------|----------|
| `SessionStart` | First message of a new chat session | NO — informational only | Inject CLAUDE-BRIEF, awareness snapshot, build-state, slot binding |
| `UserPromptSubmit` | User submits a prompt (text or `/skill`) | YES — can prepend context or reject | Inject wiki precheck, master-index hits, tribal precontext, dedup guards |
| `PreToolUse:<ToolName>` | Before a tool is invoked | YES — can deny or modify args | File-claim guards, duplication-block, hook-creation-gate, encoding-guard |
| `PostToolUse:<ToolName>` | After a tool result | NO — informational only | Record edit, refresh state, log telemetry, suggest next action |
| `Stop` | Chat is about to stop (user-accepted or auto) | YES — can block stop until condition holds | Scrutiny gate, /goal condition, regression bundle, close-out advisory |
| `PreCompact` | Before `/compact` runs | NO — write-side only | Auto-write handoff (the 2026-05-15 lima rail) |

## Hook tier convention (T0..T4)

PRISM tags hooks by tier:

| Tier | Purpose | Latency budget |
|------|---------|----------------|
| T0 | Hard blocker (security, safety, deny-list) | ≤ 100 ms |
| T1 | Soft gate (advisory block with bypass) | ≤ 500 ms |
| T2 | Injector (adds context, never blocks) | ≤ 1500 ms |
| T3 | Observer / advisory (telemetry, soft hint) | ≤ 3000 ms |
| T4 | Async (background work, never blocks the user) | n/a — detached |

The `hook-tier-validator` PreToolUse hook flags new hooks missing `// tier: T#` frontmatter.

## Anatomy of a UserPromptSubmit injector

```js
#!/usr/bin/env node
// tier: T2
// my-inject-hook.mjs — UserPromptSubmit T2 — short description

import { readFileSync } from "node:fs";

function approve(extra = {}) {
  process.stdout.write(JSON.stringify({ continue: true, ...extra }));
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf8");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function main() {
  if (process.env.MY_HOOK_DISABLE === "1") return approve();
  const input = readStdin();
  if (!input || !input.prompt) return approve();
  // … decide what to inject …
  const additionalContext = "## my injection\n…";
  approve({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } });
}

main();
```

Key contract points:
- **`continue: true`** in the JSON output — never block on injectors.
- **`hookSpecificOutput.additionalContext`** is appended to the prompt for Claude.
- **`hookSpecificOutput.hookEventName`** must match the event name.
- **Fail-soft** — if anything goes wrong, emit `{continue:true}` and exit.

## Anatomy of a PreToolUse gate (T0 blocker)

```js
function blockWith(message) {
  process.stdout.write(JSON.stringify({
    decision: "block",
    reason: message,
  }));
}

// Block on hostile input
if (matchesHostilePayload(input)) return blockWith("rejected: hostile input");
return approve();
```

**Critical R12 rule for PreToolUse blockers:** ALWAYS exit 0 with JSON `decision:"block"`, NEVER `process.exit(2)` to signal block. On Windows, pipe truncation can silently bypass a non-zero exit. The 2026-05-18 TASK-FRESHNESS-GATE-MS0 lesson:

> A bundled sub-hook MUST exit-0 (block via stdout JSON only — exit-2 = Windows pipe-trunc silent-bypass).

## Anatomy of a Stop hook gate

Stop hooks block session completion until a condition holds. The `scrutinize-before-stop.mjs` Stop hook is the canonical example:

```js
function main() {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  const ledger = readLedger(sessionId);
  if (!ledger.cleared) {
    process.stdout.write(JSON.stringify({
      decision: "block",
      reason: "scrutiny gate: 3-of-3 PASS not yet recorded — run scrutiny-3way.mjs"
    }));
    return;
  }
  process.stdout.write(JSON.stringify({ continue: true }));
}
```

Stop blockers MUST eventually clear or the session is unstoppable. The 3-of-3 gate has a 3-attempt escape hatch + operator bypass envs.

## Hook chains + ordering

Hooks at the same event run in `settings.json` array order. The order is LOAD-BEARING for some chains:

- `session-id-pin` MUST run before `slot-bind-enforce` (slot-bind reads the pinned sid).
- `token-budget-gate` runs early to short-circuit work-spawn under pressure.
- `tribal-by-domain-inject` runs LATE so it can read the session id resolved earlier.

Reordering produces silent-degrade bugs. The 2026-05-18 hotel U-SLOT-BIND-ENFORCE wired itself AFTER `session-id-pin` specifically for this reason.

## The MINIMAL_ALLOWLIST escape

Some hooks (like `scrutinize-before-stop`) live in `MINIMAL_ALLOWLIST` so `PRISM_HOOK_PROFILE` cannot disable them. This is the rail against operators silently turning off the scrutiny gate.

## Telemetry — log to stderr or a JSONL file, NEVER stdout

stdout is the hook's response channel. Logging to stdout corrupts the JSON envelope. Standard pattern:

```js
import { appendFileSync } from "node:fs";

function tele(decision, extra) {
  try {
    appendFileSync(
      "mcp-server/data/state/hook-fire-counts.jsonl",
      JSON.stringify({ ts: new Date().toISOString(), hook: "my-hook", decision, ...extra }) + "\n",
      "utf8",
    );
  } catch { /* fail-safe */ }
}
```

## Hook tier validation tests

Every new hook with logic should ship a hermetic test against its `extractPrompt` / decision functions. The hook-creation-gate PreToolUse hook flags new hooks with exports but no `*.test.mjs` sibling.

## Related

- [[karpathy-12-rule-discipline]] — R12 (fail loud) for hook decisions
- [[fail-loud-r12-patterns]] — write to telemetry, never silently swallow
- [[multi-chat-coordination]] — PreToolUse:Edit file-claim guard
- CLAUDE.md §"HOOK ENFORCEMENT GATES" — the 25+ hard-block hooks
- CLAUDE.md §"HOOK-SYNERGY-MS0" — async dispatcher, fast-lane matcher
