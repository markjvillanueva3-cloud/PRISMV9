---
type: "chat-session"
source: "claude-code-cli"
session_id: "a8fd9985-f18b-4970-9bec-acc786298869"
title: "Review H:/prism/scripts/lib/fleet-reaper-stuck-hunters.mjs end-to-end. This is a"
date: "2026-05-21"
first_ts: "2026-05-21T18:12:02.297Z"
last_ts: "2026-05-21T18:13:38.405Z"
cwd: "H:\\prism-slot-golf"
messages: 4
user_msgs: 2
assistant_msgs: 2
raw_file: "H:/.claude/projects/H--prism-slot-golf/a8fd9985-f18b-4970-9bec-acc786298869/subagents/agent-ac6694f77efd0bc11.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Review H:/prism/scripts/lib/fleet-reaper-stuck-hunters.mjs end-to-end. This is a

> **claude-code-cli** | 2026-05-21 | 4 msgs (2 user / 2 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/a8fd9985-f18b-4970-9bec-acc786298869/subagents/agent-ac6694f77efd0bc11.jsonl`

## Transcript

### User | 2026-05-21T18:12:02.297Z

Review H:/prism/scripts/lib/fleet-reaper-stuck-hunters.mjs end-to-end. This is a new pure-core library for the PRISM fleet-reaper to detect stuck/orphan bash shells, fsmonitor daemon orphans, and stale chat-slots PID entries.

Context:
- It will be wired into scripts/fleet-reaper-sweep.mjs runSweep as a strictly-additive hunting step
- The procs array shape is normalized by .claude/helpers/process-slot-map.mjs: `{pid, ppid, name, cmd, createdMs, rssBytes}`
- The caller passes a JS Set of currently-live PIDs as `livePidSet`
- chat-slots.json shape: `{slots: [{slot, status, state: {chatId, pid, lastHeartbeat, ...}}, ...]}`
- Default thresholds: bashes >5min stuck, fsmonitor >2hr stale, 60s orphan grace window
- The hunters return descriptor arrays — the SWEEP owns the kill side-effect

Grade PASS/FAIL with focus on:
1. **Correctness of the kill criteria** — could any rule reap a legit hook bash in flight? An active claude.exe child mid-call? A fresh fsmonitor that just started?
2. **Input defenses** — does each function correctly handle empty procs / null livePidSet / corrupted entries / missing createdMs / negative ages / NaN thresholds?
3. **Bounds** — are the MIN/MAX clamps sane? Could a hostile/malformed env value make this scorched earth?
4. **Cross-fork rule** — does findStaleSlotPidEntries correctly stay advisory only (no in-place reclaim — that's chat-slots.mjs's job)?
5. **Detection patterns** — is the fsmonitor regex `/fsmonitor[-_]?-?daemon/i` correct? Could it false-match? Should `bash.exe` name check be case-insensitive?

Report P0/P1 issues only with file:line refs. Be concise — 200 words max. Verdict: PASS / FAIL.

### Assistant | 2026-05-21T18:12:51.747Z

[tool_use: Read]

### User | 2026-05-21T18:13:19.680Z

[tool_result] 1	/**
2	 * Stuck-process hunters for fleet-reaper-sweep.mjs.
3	 *
4	 * Catches what the regular reap loop misses by design:
5	 *   (1) bash.exe shells from hook chains that never finished — claude.exe
6	 *       parent stayed alive, so the slot-aware reaper leaves them. Claude
7	 *       hook chains finish in 1–3 s; anything older than ~5 min is wedged.
8	 *       Real-world finding (slot:golf, 20
... [+9302 chars truncated]

### Assistant | 2026-05-21T18:13:38.405Z

## Code Quality Analysis Report — fleet-reaper-stuck-hunters.mjs

### Critical Issues

**P0 — None.** Kill criteria are sound: bash-only name check, MIN clamps prevent scorched-earth (60s/300s/5s floors), `age == null` skips uncreatedMs entries, advisory-only slot returns, `Math.max(0, ...)` guards negative ages from clock skew.

### P1 Issues

1. **Case-sensitive `bash.exe` match** (`fleet-reaper-stuck-hunters.mjs:95, 142`) — `p.name !== "bash.exe"` and `p.name !== "git.exe"` will miss Windows variants seen as `Bash.exe`/`BASH.EXE` from some shell wrappers (Git for Windows installer can produce mixed case). The fsmonitor regex is `/i` but the gating name check is not. Recommend `String(p.name).toLowerCase() === "bash.exe"` for symmetry with the regex.

2. **Live-parent check trusts caller's `ppid` accuracy** (`fleet-reaper-stuck-hunters.mjs:98`) — if `process-slot-map.mjs` ever returns a recycled PPID (PID reuse on Windows is real, though slow), a stuck bash whose original claude.exe died but whose PPID was reused by an unrelated live process would fall into the `parentLive && age >= threshold` branch and still get reaped correctly — but logged with misleading "parent-claude-still-alive" reason. Non-fatal; consider verifying parent name is `claude.exe` before claiming so in the reason string.

3. **`opts.now` not clamped** (`fleet-reaper-stuck-hunters.mjs:84, 135`) — `Number.isFinite(opts.now)` accepts negative values; combined with `Math.max(0, ...)` in `ageSec()` this is safe, but a test passing `now: -1` would silently produce age=0 for all procs. Minor — tests only.

### Positive

- Defense-in-depth: `Array.isArray`, `!p` guards, `typeof livePidSet.has === "function"`, schema-shape validation on slotsData.
- Clamps are well-chosen (60s floor is exactly the hook-chain ceiling).
- Advisory-only slot reclaim correctly defers to chat-slots.mjs per conflict-fork rule.
- Pure-core; zero I/O; caller owns kill side-effect.
- `cmd.slice(0, 200)` bounds log-line bloat.


... [+79 chars truncated]
