---
type: "chat-session"
source: "claude-code-cli"
session_id: "a8fd9985-f18b-4970-9bec-acc786298869"
title: "Independent second-pass review of H:/prism/scripts/lib/fleet-reaper-stuck-hunter"
date: "2026-05-21"
first_ts: "2026-05-21T18:12:04.135Z"
last_ts: "2026-05-21T18:13:52.317Z"
cwd: "H:\\prism-slot-golf"
messages: 6
user_msgs: 3
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism-slot-golf/a8fd9985-f18b-4970-9bec-acc786298869/subagents/agent-ab34e4cddb5b9fb1e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Independent second-pass review of H:/prism/scripts/lib/fleet-reaper-stuck-hunter

> **claude-code-cli** | 2026-05-21 | 6 msgs (3 user / 3 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/a8fd9985-f18b-4970-9bec-acc786298869/subagents/agent-ab34e4cddb5b9fb1e.jsonl`

## Transcript

### User | 2026-05-21T18:12:04.135Z

Independent second-pass review of H:/prism/scripts/lib/fleet-reaper-stuck-hunters.mjs. Do NOT assume the first reviewer caught everything — focus on what they're LIKELY to miss: integration coupling, security, error budgets, naming, convention conformance, hidden state, and any inlined constants.

This is a new pure-core library — 7 exports, called by scripts/fleet-reaper-sweep.mjs to add three new "hunt" steps to the existing sweep without changing reap-decision flow. Tests not yet written.

Sister modules for convention reference:
- scripts/lib/bg-app-throttle.mjs (similar pure-core pattern)
- scripts/lib/fleet-reaper-crash-watch.mjs (similar pure-core pattern wired into the same sweep)
- .claude/helpers/process-slot-map.mjs (where procs shape originates)
- .claude/helpers/chat-slots.mjs (where reclaim logic lives — must NOT be duplicated here)

Grade PASS/FAIL focusing on:
1. **Convention conformance** — does the export naming, module layout, comment density, error-handling style match the surrounding pure-core libs?
2. **Race conditions / TOCTOU** — the `livePidSet` is a snapshot; could a proc the hunter classifies as "dead parent" be a parent that JUST died but whose children are still mid-cleanup? Is the 60s grace window enough?
3. **Tunability** — should any of the magic numbers (60s grace, regex, name comparison) be tunable?
4. **API completeness** — does `runStuckHunters` cover every operator scenario the sweep will need? Anything missing for a clean caller integration?
5. **Hidden bugs** — anything subtle: off-by-one in age math, wrong field name, missing string-type guard, infinite recursion potential?

Report P0/P1 issues only with file:line refs. 200 words max. Verdict: PASS / FAIL.

### Assistant | 2026-05-21T18:12:50.752Z

[tool_use: Read]

### User | 2026-05-21T18:13:17.330Z

[tool_result] 1	/**
2	 * Stuck-process hunters for fleet-reaper-sweep.mjs.
3	 *
4	 * Catches what the regular reap loop misses by design:
5	 *   (1) bash.exe shells from hook chains that never finished — claude.exe
6	 *       parent stayed alive, so the slot-aware reaper leaves them. Claude
7	 *       hook chains finish in 1–3 s; anything older than ~5 min is wedged.
8	 *       Real-world finding (slot:golf, 20
... [+9302 chars truncated]

### Assistant | 2026-05-21T18:13:21.014Z

[tool_use: Read]

### User | 2026-05-21T18:13:32.170Z

[tool_result] 1	/**
2	 * fleet-reaper-crash-watch.mjs — FLEET-REAPER-MS1 U-FR-CRASH-WATCH
3	 *
4	 * The reaper kills orphan PROCESSES but is BLIND to chat CRASHES — it never
5	 * reconciles "slot X's chat just died" into an actionable signal. When 1-2
6	 * chats keep crashing the operator has no forensic trail (which slot, when,
7	 * at what heartbeat age, under what memory pressure).
8	 *
9	 * This module is t
... [+7437 chars truncated]

### Assistant | 2026-05-21T18:13:52.317Z

**Independent second-pass review — H:/prism/scripts/lib/fleet-reaper-stuck-hunters.mjs**

**Verdict: PASS** (with P1 issues to address before wiring)

**P1 — Convention drift (slot-data shape):** L172-187 `findStaleSlotPidEntries` expects `slotsData.slots` as an **Array** (`Array.isArray` + `s.slot`/`s.state.pid`). Sister module `fleet-reaper-crash-watch.mjs:38-53` treats it as a Record (`Object.entries(map)` keyed by slot, fields at `state.chatId`/`state.lastHeartbeat` directly — no nested `state.pid`). Both can't be right; if `chat-slots.json` is the canonical `{slots:{alpha:{chatId,pid,...}}}` shape used by crash-watch, this hunter returns `[]` always and silently no-ops. **Verify the on-disk shape and align.**

**P1 — TOCTOU on dead-parent classification:** L98-112 — `livePidSet` is a single snapshot; a `claude.exe` that exited 100ms before the snapshot will mark all its in-flight hook bashes as `orphan-bash` at `age >= grace` (60s). On Windows, hook chains can legitimately survive a parent-claude crash for several seconds while finalizing. **Mitigation:** require `age >= max(grace, threshold/5)` for orphan-bash, OR require two consecutive sweeps to agree (snapshot persistence like crash-watch does).

**P1 — Tunability gap:** L95 (`name !== "bash.exe"`) and L145 regex are hardcoded. Process names vary (Git-Bash spawns `bash.exe`, MSYS sometimes `sh.exe`; `git-fsmonitor--daemon.exe` exists on some Git versions). Expose `bashNames`/`fsmonitorRegex` opts so coverage doesn't silently rot on a Git upgrade.

**P0/Other:** None. Naming, clamp-pattern, fail-soft, comment density, no-IO purity, conflict-fork avoidance (L165-167) all conform.

H:/prism/scripts/lib/fleet-reaper-stuck-hunters.mjs:98 · :142 · :172
