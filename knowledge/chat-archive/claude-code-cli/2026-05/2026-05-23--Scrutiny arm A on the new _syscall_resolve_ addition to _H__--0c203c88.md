---
type: "chat-session"
source: "claude-code-cli"
session_id: "0c203c88-6d98-44df-931a-5945093269a2"
title: "Scrutiny arm A on the new `syscall_resolve` addition to `H:/prism-slot-echo/.cla"
date: "2026-05-23"
first_ts: "2026-05-23T16:27:42.593Z"
last_ts: "2026-05-23T16:30:09.409Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/0c203c88-6d98-44df-931a-5945093269a2/subagents/agent-a33262bedd6ad4616.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Scrutiny arm A on the new `syscall_resolve` addition to `H:/prism-slot-echo/.cla

> **claude-code-cli** | 2026-05-23 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0c203c88-6d98-44df-931a-5945093269a2/subagents/agent-a33262bedd6ad4616.jsonl`

## Transcript

### User | 2026-05-23T16:27:42.593Z

Scrutiny arm A on the new `syscall_resolve` addition to `H:/prism-slot-echo/.claude/kernel/psk.mjs`.

What changed in this commit:
1. New `RESOLVE_MAPS` frozen constant near the bottom of the file (M and W namespace config — file path + walkRoot)
2. New `syscall_resolve(params)` async function (~120 lines) — forward/reverse/batch resolution against the memory-codes.json + wiki-codes.json maps shipped by U-RCD-01
3. New entry in the `SYSCALLS` table: `resolve: { description, handler: syscall_resolve }`
4. Batch input defensively coerced from JSON-string → array (CLI argv arrives as string)

Unit contract:
- `psk resolve --code M0042` → forward: returns {code, slug, path, exists, namespace}
- `psk resolve --slug feedback/foo` → reverse: tries M then W (or constrained by `--namespace M|W`)
- `psk resolve --batch '["M0001","W00001"]'` → bulk forward
- Tombstoned codes return `{ok:false, tombstoned:true, slug, deletedAt, lastKnownPath, error}`
- Schema-version mismatch returns ok:false with diagnostic
- Missing map file returns ok:false with diagnostic
- Maps are cached per-dispatch (one map load per namespace, regardless of batch size)
- Slug lookup tries as-given first then lowercased (M slugs are lowercased at assignment; W slugs are case-preserved)
- Empty params returns ok:false with usage hint (NOT throw)
- Must obey psk's fail-soft contract: never throws past dispatch()

CLI smoke tests already PASSED for: forward M0001, forward W00001, reverse `feedback/feedback_atcs` (→ M0005), unassigned M9998 (fail-soft with next-available hint), unknown namespace X9999 (fail-soft), batch with 3 codes (M0001+W00001+M9998, okCount=2), empty params.

Your job — flag every P0/P1 issue with file path + line + concrete trigger. Focus areas:
1. Fail-soft contract — does ANY input throw past dispatch()?
2. Schema-version mismatch path (loadMap returns null on parse error AND on schemaVersion check — but my check happens INSIDE resolveOneCode, AFTER loadMap returns the parsed object; 
... [+1193 chars truncated]

### Assistant | 2026-05-23T16:28:23.934Z

I'll read the file end-to-end and analyze the `syscall_resolve` addition.

### Assistant | 2026-05-23T16:28:24.299Z

[tool_use: Read]

### User | 2026-05-23T16:29:35.772Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * psk — PRISM Syscall Kernel (CLI dispatch shell)
4	 *
5	 * COMMAND-KERNEL-MS0 / U-CK01 — thin dispatch shell only. Declares the
6	 * 10-syscall surface every PRISM slash-command, hook, and MCP caller can
7	 * resolve live state through. The actual per-syscall semantics ship in
8	 * follow-on units:
9	 *   - U-CK02 fills whoami / manifest / position
10	 *   - U-CK03 
... [+39448 chars truncated]

### Assistant | 2026-05-23T16:30:09.409Z

## Code Quality Analysis Report — `syscall_resolve` (PSK Kernel)

### Summary
- File: `H:/prism-slot-echo/.claude/kernel/psk.mjs`
- Lines analyzed: 543-698 (resolve addition) + table entry 763-766
- Verdict: **PASS** (with P1 and P2 findings to address)

### Fail-soft contract trace
Confirmed: `syscall_resolve` is wrapped by `failSoft()` at line 812. All internal helpers (`loadMap`, `resolveOneCode`, `resolveOneSlug`) catch their own throws or return structured objects. Handler returns `{ok:false,...}` directly — `failSoft` line 97-100 detects `"ok" in out` and passes through. **No path throws past dispatch().**

### P1 Findings

**P1-1 — Path-traversal via slug input (lines 619-621)**
- File: `psk.mjs:619`
- Trigger: `psk resolve --slug ../../../etc/passwd`
- The slug is joined directly to `walkRoot` via `path.join` without containment check. If a malicious slug were ever present in `map.byCode[code].slug`, the resolved `absPath` could escape `walkRoot`. Reverse lookup is safer because it requires hitting `map.bySlug`, but forward lookup trusts whatever the map file says. Defense: assert `absPath.startsWith(RESOLVE_MAPS[letter].walkRoot + path.sep)` before `fs.existsSync()`. Low likelihood (map is repo-controlled), but the cost of the guard is one line.

**P1-2 — Schema-version check sequencing is correct but error-locked at "1.0.0" string equality (line 609)**
- File: `psk.mjs:609`
- Trigger: bumping `memory-codes.json` to `1.0.1` (semver-compatible) bricks ALL resolves until psk.mjs is patched.
- Recommend: `String(map.schemaVersion).startsWith("1.")` or extract `EXPECTED_SCHEMA_MAJOR = 1`. R11 (match conventions) — verify how U-RCD-01 versions the file going forward.

**P1-3 — Mixed-namespace contamination via newline / whitespace (lines 601-602)**
- File: `psk.mjs:601`
- Trigger: `code = "M0001\n"` — `code[0] === 'M'` passes, digit-regex `/^\d+$/` rejects (good), but `code.length < 2` guard doesn't catch trailing junk. The `digitPart` regex catches it correctly
... [+2379 chars truncated]
