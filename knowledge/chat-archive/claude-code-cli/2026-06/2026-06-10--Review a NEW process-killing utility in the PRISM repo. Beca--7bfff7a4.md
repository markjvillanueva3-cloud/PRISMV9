---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Review a NEW process-killing utility in the PRISM repo. Because it kills GPU mod"
date: "2026-06-10"
first_ts: "2026-06-10T02:05:07.065Z"
last_ts: "2026-06-10T02:06:27.305Z"
cwd: "H:\\prism"
messages: 13
user_msgs: 5
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-a2abdbdf223994636.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review a NEW process-killing utility in the PRISM repo. Because it kills GPU mod

> **claude-code-cli** | 2026-06-10 | 13 msgs (5 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-a2abdbdf223994636.jsonl`

## Transcript

### User | 2026-06-10T02:05:07.065Z

Review a NEW process-killing utility in the PRISM repo. Because it kills GPU model-server processes, the bar is correctness of the "which PID is an orphan" decision + safety defaults. Read BOTH files end-to-end:
- H:/prism/scripts/system-health/reap-llama-server-orphans.mjs
- H:/prism/scripts/__tests__/reap-llama-server-orphans.test.mjs

Context: it reaps leaked Ollama `llama-server.exe` orphans. The real incident: Ollama reloaded a model (spawned a fresh llama-server) but the prior instance serving the SAME `--model <blob>` lingered ~2h holding ~22GB commit. Ollama runs exactly ONE llama-server per loaded model, so two live processes with the identical model blob => the OLDER one is an orphan.

VERIFY (P0/P1 focus):
1. **The decision core `selectLlamaOrphans`** -- can it EVER select a process that is NOT a true orphan? Trace: it groups by model blob, sorts by age ascending (smallest age = newest), keeps sorted[0] (newest), and marks older same-blob processes as orphans IF age >= minOrphanAgeSec. Confirm: (a) a single-instance model is NEVER reaped (group.length<2 continue); (b) the newest of a dup group is NEVER reaped; (c) two same-blob both younger than min-age => none reaped (reload-overlap guard); (d) two DIFFERENT models => none reaped (the real 120b+20b case must be safe). Is "newest age == live" a sound proxy? Could a legitimately-newer-but-idle and older-but-active pair be mis-ordered? (Acceptable: worst case is a one-time reload, documented as fail-soft -- judge whether that's adequately bounded.)
2. **Default safety**: confirm DRY-RUN BY DEFAULT (only --apply kills). Confirm MAX_KILLS cap, the min-age guard default 300s, and that ollama.exe / non-llama-server processes are never touched (the PS filter is Name='llama-server.exe').
3. **`parseLlamaServers`**: junk-input robustness -- does it throw on null/garbage/partial lines? Confirm the .filter drops NaN pid/age and empty model. Does the `pid|age|port|model` split handle a model blob that itself contains
... [+629 chars truncated]

### Assistant | 2026-06-10T02:05:11.284Z

I'll review this process-killing utility. Let me read both files end-to-end.

### Assistant | 2026-06-10T02:05:11.649Z

[tool_use: Read]

### Assistant | 2026-06-10T02:05:11.806Z

[tool_use: Read]

### User | 2026-06-10T02:05:13.465Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * reap-llama-server-orphans.mjs - reap leaked Ollama llama-server.exe orphans.
4	 *
5	 * THE GAP THIS CLOSES (found 2026-06-09, slot:india -- [[reference_llama_server_orphan_reap_2026_06_09]]):
6	 * a critical-memory-pressure Stop gate fired at 97.4% COMMIT charge (not physical RAM). Root cause was
7	 * a leaked llama-server: Ollama reloaded a model (spawned a fresh 
... [+9695 chars truncated]

### User | 2026-06-10T02:05:13.544Z

[tool_result] 1	// reap-llama-server-orphans.test.mjs -- tests the PURE decision core of the llama-server orphan
2	// reaper. This is process-killing logic, so the "which PID is an orphan" decision must be exactly
3	// right: never reap a single-instance model, never reap the newest of a dup group, never reap a
4	// brief reload-overlap. Mirrors the real 2026-06-09 incident (live 20:46 + orphan 18:44, same blob
... [+4850 chars truncated]

### Assistant | 2026-06-10T02:05:20.923Z

Both files read end-to-end. Let me verify my analysis of the decision core's critical paths before reporting.

The key correctness question is path (c) — the reload-overlap guard. Let me trace it carefully:

In `selectLlamaOrphans`, the min-age check at line 113 (`cand.age >= minOrphanAgeSec`) is applied **only to the older candidates** (`sorted.slice(1)`), not to the `live` (newest). So for two same-blob processes where both are younger than min-age:
- sorted by age ascending: `[young1, young2]`
- `live = young1` (kept unconditionally)
- candidate `young2`: checked against min-age. If `young2.age < minOrphanAgeSec` → not added.

So path (c) holds **only because the older one is also below min-age**. The test at line 60 uses ages 5 and 8 — both far below 300. Correct. But note the guard is age-of-the-older-process, not a delta between the two. Let me confirm there's no scenario where this misfires.

### Assistant | 2026-06-10T02:05:21.544Z

[tool_use: Bash]

### User | 2026-06-10T02:05:28.297Z

[tool_result]   ...
# Subtest: selectLlamaOrphans: malformed entries (missing model/pid/age) are skipped, no crash
ok 10 - selectLlamaOrphans: malformed entries (missing model/pid/age) are skipped, no crash
  ---
  duration_ms: 0.356
  ...
# Subtest: selectLlamaOrphans: default min-age (300s) applies when opts omitted
ok 11 - selectLlamaOrphans: default min-age (300s) applies when opts omitted
  ---
  duration_
... [+120 chars truncated]

### Assistant | 2026-06-10T02:05:40.648Z

All 11 tests pass. Let me verify a couple of edge cases in the decision core that the tests don't cover, to confirm whether they're real gaps.

### Assistant | 2026-06-10T02:05:41.276Z

[tool_use: Bash]

### User | 2026-06-10T02:05:45.886Z

[tool_result] TIE (equal age 500/500): [{"pid":200,"live":100}]
NEG min-age -5 (both young): [2]
CLOCK-SKEW (age -100 sorts first as live): [{"pid":2,"live":1}]
PARSE pipe-in-model: [{"pid":123,"age":60,"port":"8080","model":"sha256-a|b|c"}]
ALL-ZERO age: []

### Assistant | 2026-06-10T02:06:27.305Z

These confirm my analysis. Now let me verify the CLI guards prevent the negative/zero min-age path from ever reaching the pure core in production, and check the `--apply` / MAX_KILLS wiring one more time.

The CLI guard at lines 41-45: `Number.isFinite(v) && v > 0 ? v : DEFAULT_MIN_AGE_SEC` — so `--min-age -5` or `--min-age 0` falls back to 300. Good, the negative-min-age path (EDGE 2/3) is unreachable from CLI. The pure core accepts it but the binary never passes it.

I have everything I need.

---

## Code Quality Analysis Report — `reap-llama-server-orphans.mjs`

### Summary
- Files Analyzed: 2 (utility + test)
- Tests: 11/11 pass (verified live)
- Issues Found: 0 P0, 0 P1, 2 P2, 3 P3
- **Grade: PASS**

The decision core is sound. I could not construct any input where a true non-orphan is selected for killing given the production CLI guards. Safety defaults are correct (dry-run default, MAX_KILLS cap, 300s min-age, `Name='llama-server.exe'` filter).

---

### 1. Decision core `selectLlamaOrphans` — sound

All four required invariants hold, traced and live-probed:

- **(a) single-instance never reaped** — `reap-llama-server-orphans.mjs:108` `if (group.length < 2) continue`. Confirmed by test:41.
- **(b) newest of a dup group never reaped** — `sorted[0]` is `live`, and the orphan loop iterates `sorted.slice(1)` only (`:110-112`). The newest is structurally excluded from the candidate set. Confirmed test:49,68.
- **(c) reload-overlap guard (both younger than min-age)** — the older candidate must clear `cand.age >= minOrphanAgeSec` (`:113`). Two same-blob processes both under min-age → the older fails the gate → none reaped. Confirmed test:60. Note the guard keys on the *older process's absolute age*, not the age-delta between the pair — this is actually **more conservative** than a delta would be (a young pair is always spared regardless of spread), so it is safe.
- **(d) two different models never reaped** — separate `byModel` map keys, each `group.length === 1` (`
... [+5215 chars truncated]
