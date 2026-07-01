---
type: "chat-session"
source: "claude-code-cli"
session_id: "93351de7-9846-43b7-a9a7-d6bd1f9b2abc"
title: "Re-verify two corrected docs against GROUND TRUTH. A prior reviewer FAILed them "
date: "2026-05-18"
first_ts: "2026-05-18T01:17:24.067Z"
last_ts: "2026-05-18T01:18:08.268Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-aa2d7b031e424dff5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Re-verify two corrected docs against GROUND TRUTH. A prior reviewer FAILed them 

> **claude-code-cli** | 2026-05-18 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-aa2d7b031e424dff5.jsonl`

## Transcript

### User | 2026-05-18T01:17:24.067Z

Re-verify two corrected docs against GROUND TRUTH. A prior reviewer FAILed them claiming `.claude/hooks/bash-bundle.mjs` doesn't exist and the gate is unwired — that was a non-recursive-grep error. Confirm the truth yourself FIRST:

Run these and report what they return:
- `ls H:/prism/.claude/hooks/bundles/bash-bundle.mjs`
- `grep -n task-freshness-gate H:/prism/.claude/hooks/bundles/bash-bundle.mjs`
- `grep -n "bundles/bash-bundle" H:/.claude/settings.json`

(Expected: file exists; line 21 wires task-freshness-gate.mjs; settings.json ~line 640 wires the bundle. The gate IS wired — via the bundle in the `bundles/` subdir, which a `.claude/hooks/*.mjs` non-recursive grep misses.)

Then review the corrected docs for accuracy now that they state the full path:
- H:/prism/state/shared/dashboards/patches/CLAUDE-MD-PATCH-r13-task-freshness.md
- H:/prism/knowledge/wiki/architecture/task-freshness-gate.md

Verify the P1 fixes landed:
1. Both docs now say `.claude/hooks/bundles/bash-bundle.mjs` (full path, not bare `bash-bundle.mjs`) + include a `grep -n task-freshness-gate H:/prism/.claude/hooks/bundles/bash-bundle.mjs` verify command + note the bundle is settings.json-wired (~line 640) so there's no per-hook settings entry. Accurate vs ground truth?
2. The patch's typo'd path `.claude/helpers/../hooks/task-freshness-gate.mjs` is now `.claude/hooks/task-freshness-gate.mjs`.
3. Wiki has an "## Operator notes" section covering: `--ack-stale` is a synthetic token slot-task-claim.mjs ignores (safe to append); fail-open ≠ fresh (missing block doesn't prove fresh); own-claim-skip; kill switch. Are these accurate vs the hook code H:/prism/.claude/hooks/task-freshness-gate.mjs?
4. Test header in scripts/__tests__/task-freshness.test.mjs now says "2 real-data E2E" (was "1") — does it match the actual 2 real-data E2E test() blocks (completed-unit + non-existent-unit)? Does the doc "2" now agree with the code?
5. Patch splice instructions are now grep-anchored (R12-bullet anchor, `##
... [+260 chars truncated]

### Assistant | 2026-05-18T01:17:28.889Z

I'll verify ground truth first, then review the corrected docs.

### Assistant | 2026-05-18T01:17:31.051Z

[tool_use: Bash]

### Assistant | 2026-05-18T01:17:32.574Z

[tool_use: Bash]

### User | 2026-05-18T01:17:37.347Z

[tool_result] -rwxr-xr-x 1 wompu 197611 2931 May 17 19:56 H:/prism/.claude/hooks/bundles/bash-bundle.mjs*
---
21:  { path: `${HOOK_BASE}/task-freshness-gate.mjs`,            timeout: 5000 },
---
640:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/bundles/bash-bundle.mjs",

### User | 2026-05-18T01:17:39.722Z

[tool_result] H:/prism/.claude/hooks/task-freshness-gate.mjs  13.4K
---TESTHDR---
// task-freshness.test.mjs — TASK-FRESHNESS-GATE-MS0/U-TFG01
//
// Hermetic suite (injected readers) + 2 real-data E2E (completed-unit →
// already-shipped; non-existent unit → fail-open). Per the
// RGS-TOOL-AUTOINVOKE-MS1 lesson: a pure-core + injected-readers design MUST
// ship a real-data E2E — hermetic fakes do not prove pro
... [+3242 chars truncated]

### Assistant | 2026-05-18T01:17:41.780Z

Ground truth confirmed. Now reviewing the corrected docs.

### Assistant | 2026-05-18T01:17:42.532Z

[tool_use: Read]

### Assistant | 2026-05-18T01:17:43.576Z

[tool_use: Read]

### Assistant | 2026-05-18T01:17:43.688Z

[tool_use: Read]

### User | 2026-05-18T01:17:44.782Z

[tool_result] 1	# CLAUDE-MD PATCH — R13 task-freshness doctrine + TASK-FRESHNESS-GATE-MS0
2	
3	**Why a patch-sibling:** `CLAUDE.md` is peer-claimed by bravo (OBSIDIAN-BRAIN-FIX-MS0/U-OBF-F1+F2 drain, chat-bus 2026-05-17T21:28Z). Per the PATCH-SIBLING convention (JULIETT-12CHAT-ALLOCATION-MS0), foxtrot writes the intended CLAUDE.md delta here; the lock-holder (or a later foxtrot pass) splices it into the live fi
... [+5142 chars truncated]

### User | 2026-05-18T01:17:44.928Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\task-freshness-gate.mjs' was already read 4m ago in this session and is unchanged (mtime 1779066492402). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-18T01:17:45.338Z

[tool_result] 1	---
2	name: task-freshness-gate
3	type: architecture
4	domain: fleet-discipline
5	created: 2026-05-18
6	slot: foxtrot
7	tags: [pretooluse-hook, doctrine-r13, slot-task-claim, staleness, bash-bundle, fail-open]
8	---
9	
10	# TASK-FRESHNESS-GATE-MS0 — R13 enforcement
11	
12	## Why
13	
14	A task's ground truth is its generation timestamp. PRISM gated this for only two
15	narrow surfaces before (goa
... [+8032 chars truncated]

### Assistant | 2026-05-18T01:17:47.992Z

I have the docs. Let me verify the operator notes against the actual hook code.

### Assistant | 2026-05-18T01:17:49.681Z

[tool_use: Grep]

### User | 2026-05-18T01:17:50.498Z

[tool_result] 13:// empty/no-op → allow. NEVER throws — fail-open is the law (R12: surface
16:// Clear a stale block: re-run the claim with the `--ack-stale` token after a
18:// one-shot `PRISM_TASK_FRESHNESS_BYPASS=1` (audited to JSONL). Either writes a
21:// Knobs: PRISM_TASK_FRESHNESS_GATE_DISABLE=1 (full off) ·
22://   PRISM_TASK_FRESHNESS_BYPASS=1 (one-shot, logged) ·
38:// re-claims (--phase with an exist
... [+1785 chars truncated]

### Assistant | 2026-05-18T01:17:51.096Z

[tool_use: Grep]

### User | 2026-05-18T01:17:52.808Z

[tool_result] 3:// Hermetic suite (injected readers) + 2 real-data E2E (completed-unit →
4:// already-shipped; non-existent unit → fail-open). Per the
6:// ship a real-data E2E — hermetic fakes do not prove production wiring.
65:  const mp = path.join("H:/prism/mcp-server/data/milestones", "FEATURE-GAP-AUDIT-MS0.json");
66:  const ap = path.resolve("H:/prism/state/shared/specs/FEATURE-GAP-AUDIT-2026-05-17.md");
... [+1027 chars truncated]

### Assistant | 2026-05-18T01:18:08.268Z

All claims verified against ground truth and hook code.

## Verdict: **PASS**

### Ground truth (confirmed myself)
- `H:/prism/.claude/hooks/bundles/bash-bundle.mjs` **exists** (2931 bytes, executable).
- Line **21** wires `${HOOK_BASE}/task-freshness-gate.mjs` (timeout 5000).
- `H:/.claude/settings.json` line **640** wires `bundles/bash-bundle.mjs` under the Bash matcher.
- The prior reviewer's FAIL was a non-recursive-grep artifact. Gate **IS wired**.

### P1 fix verification
1. **Full path + verify cmd + bundle-wired note** — PASS. Both docs use `.claude/hooks/bundles/bash-bundle.mjs`, include the exact `grep -n task-freshness-gate H:/prism/.claude/hooks/bundles/bash-bundle.mjs` verify command, and state "no per-hook settings.json entry / ~line 640". Wiki even adds the explicit anti-footgun note about non-recursive grep.
2. **Patch typo path** — PASS. R13 bullet (line 13) reads `.claude/hooks/task-freshness-gate.mjs`. The bad `helpers/../hooks/` form is gone.
3. **Operator notes accuracy** — PASS, all four points match hook code:
   - `--ack-stale` synthetic token: hook line 221 `flag(cmd,"ack-stale")`; slot-task-claim ignores unknown args — correct.
   - Fail-open ≠ fresh: hook lines 157/168/174/254/308 (`emit({})` on disable/unparseable/error/throw) — correct.
   - Own-claim-skip: hook line 219 `ownsActiveClaim(chatId,unitId) → emit({})` — correct.
   - Kill switch: line 157 `PRISM_TASK_FRESHNESS_GATE_DISABLE`; bypass line 222 — correct.
4. **Test header "2 real-data E2E"** — PASS. Header line 3-4 says "2 real-data E2E". Code has exactly two real-data `test()` blocks: line 457 (completed-unit → already-shipped, against live `FEATURE-GAP-AUDIT-MS0.json`) and line 478 (non-existent → fail-open). Wiki (line 98) and patch (line 21) both say "2". Agreement confirmed.
5. **Grep-anchored splice** — PASS. Patch lines 32-35: PATCH 1 anchors on `## CLAUDE.md RULES 5–12` + `**R12 — Fail loud.**`; PATCH 2 explicitly grep `^## Recent regressions` and warns against the mtime
... [+348 chars truncated]
