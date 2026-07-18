---
title: psk syscall — whoami
slug: whoami
kind: syscall
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK02
author: claude-41db1b82 (slot india)
kernel_handler: syscall_whoami
params_schema: '{ sessionId?: string }'
composes: [stable-session-id.mjs, chat-slots.mjs, git-branch-detect]
---

# `psk whoami` — Resolve Session Identity

Returns the session's identity tuple: `sessionId`, `slot`, `branch`,
`repoRoot`. Cheap and tolerant of every failure path (falls back to
`"unresolved"` rather than throwing). The richer fields (`memoryPath`,
`worktree`, `userClaudeDir`) ship via U-CK02 with runtime path detection
(no hardcoded `wompu` / `Mark Villanueva` literals).

## Kernel handler

`.claude/kernel/psk.mjs::syscall_whoami(params)` — composes three
upstream resolvers into a single coherent identity record.

## Params

| Field | Type | Default | Semantics |
|-------|------|---------|-----------|
| `sessionId` | string (8-hex) | `null` | Caller-supplied session id. When provided, piped into `stable-session-id.mjs` stdin so its stdin-priority resolution path runs. When omitted, the resolver falls through env → PID-walk → cache. |

## Returns

```json
{
  "ok": true,
  "syscall": "whoami",
  "sessionId": "<8-hex | 'unresolved'>",
  "slot": "<nato-name | null>",
  "branch": "<git-branch | null>",
  "repoRoot": "H:/prism",
  "...": "U-CK02 ships memoryPath / worktree / userClaudeDir"
}
```

## Composition

```
syscall_whoami(params)
├─ stable-session-id.mjs (stdin-priority resolver)
│  └─ chain: stdin → env → PID-walk → cache file → 'unresolved'
├─ chat-slots.json (direct read)
│  └─ match by params.sessionId OR just-resolved sessionId
└─ git rev-parse --abbrev-ref HEAD (in REPO_ROOT cwd)
```

## Failure semantics

Every upstream resolver is wrapped in `try/catch` with tolerated failure.
`whoami` NEVER throws — it returns `"unresolved"` / `null` for fields
whose resolvers fail. This is by design: identity resolution must not
block command execution on flaky filesystem / git / process state.

Callers that need certainty (e.g. slot-routing hooks) must assert
`result.slot !== null` themselves before acting.

## Doctrine pins

- **No hardcoded user literals** — U-CK02 spec mandates "paths DETECTED
  at runtime (no hardcoded wompu / Mark Villanueva literals)". The
  resolver chain honors this.
- **Tolerant by design** — fail-loud is the wrong primitive for an
  identity probe. Callers who care escalate; callers who just want a
  hint don't crash.
- **Composable, not monolithic** — each upstream resolver is a separate
  helper that other syscalls / hooks reuse (`stable-session-id.mjs`
  alone is consumed by ~15+ surfaces).

## Related syscalls

| Syscall | Relation |
|---------|----------|
| [[manifest]] | Independent — engine/dispatcher/hook count snapshot. |
| [[position]] | Composes whoami's `repoRoot` + `branch` to compute build/svi/drift snapshot. |
| [[checkin]] | Uses whoami's `sessionId` + `slot` to bind a slot claim. |
| [[handoff]] | Uses whoami's `sessionId` to locate the per-agent handoff file. |
| [[pick]] | Uses whoami's `slot` to filter the priority-queue per-slot lane. |

## Test coverage

`mcp-server/src/__tests__/psk-whoami.test.ts` — envelope-mandated test
file. Load-bearing exit condition (per U-CK02 spec):

> "psk whoami resolves {sessionId, slot, branch, topic, worktree,
> userClaudeDir, memoryPath} with paths DETECTED at runtime (no
> hardcoded wompu / Mark Villanueva literals)"

Real-value assertions only — no `toBeDefined()` / `toBeTruthy()` stubs
(per project test-legitimacy hook).

## Invocation

The `psk` ABI is reached via the kernel dispatcher; no direct shell
binary today. Callers route through:

```js
import { dispatch } from "H:/prism/.claude/kernel/psk.mjs";
const result = await dispatch("whoami", { sessionId: "claude-41db1b82" });
```

## See also

- [[_command-schema]] — canonical command frontmatter schema (U-CK06)
- [[_schema]] — wiki/os/ entity frontmatter schema (U-CK04)
- `.claude/kernel/psk.mjs` — kernel source (syscall registration map)
- `.claude/helpers/stable-session-id.mjs` — primary upstream resolver
- `.claude/helpers/chat-slots.mjs` — secondary upstream resolver
