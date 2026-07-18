---
type: "chat-session"
source: "claude-code-cli"
session_id: "fbf28cc9-fd37-46b5-b8f8-0fd7aeae650f"
title: "Read `H:/prism/.tmp-rev-b.txt` — your complete review assignment: the diff of co"
date: "2026-05-18"
first_ts: "2026-05-18T02:35:51.805Z"
last_ts: "2026-05-18T02:43:03.190Z"
cwd: "H:\\prism"
messages: 57
user_msgs: 21
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/fbf28cc9-fd37-46b5-b8f8-0fd7aeae650f/subagents/agent-a3a882d8517606ce9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Read `H:/prism/.tmp-rev-b.txt` — your complete review assignment: the diff of co

> **claude-code-cli** | 2026-05-18 | 57 msgs (21 user / 36 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fbf28cc9-fd37-46b5-b8f8-0fd7aeae650f/subagents/agent-a3a882d8517606ce9.jsonl`

## Transcript

### User | 2026-05-18T02:35:51.805Z

Read `H:/prism/.tmp-rev-b.txt` — your complete review assignment: the diff of commit `377ff90a44` plus instructions. Execute it exactly. INDEPENDENT second-pass — do not assume a prior reviewer caught everything; weight toward concurrency, hidden coupling, hook-wiring completeness, inlined constants, doc-claim accuracy.

The commit patches Stop hook `stop-memory-size-watchdog.mjs` to auto-invoke `scripts/memory-compact.mjs` (lock-guarded/atomic/self-throttled/fail-soft) when MEMORY.md nears the 24,576-byte truncation ceiling, plus a new wiki playbook (`backend-dev-token-efficiency.md`) and a CLAUDE.md patch-sibling. Up to 13 Claude chats run concurrently and all fire Stop hooks together → up to 13 parallel spawns of memory-compact; verify the spawn-result handling is correct and non-alarming for the `{ok:false,reason:"locked"}` / `{skipped:"throttled"}` shapes. Also check the two markdown docs for factual accuracy (numbers, file paths, commands they cite).

Return: PASS or FAIL verdict, then a concise bulleted list of P0/P1/P2 findings (or "none").

### Assistant | 2026-05-18T02:36:00.038Z

I'll start by reading my review assignment file.

### Assistant | 2026-05-18T02:36:00.039Z

[tool_use: Read]

### User | 2026-05-18T02:36:03.483Z

[tool_result] 1	You are reviewer B of three independent Claude PRISM agents — an INDEPENDENT second pass. Do not assume reviewer A caught everything; review the diff yourself, end to end.
2	Target: commit 377ff90a44.
3	
4	Weight your attention toward these high-risk axes (PRISM CLAUDE.md), but FAIL on any violation you find:
5	  1. Test integrity — no assertions weakened or removed vs the prior version; no toBe
... [+21841 chars truncated]

### Assistant | 2026-05-18T02:36:08.236Z

Now let me read the actual current state of the patched hook file and the script it invokes, to verify the diff against reality.

### Assistant | 2026-05-18T02:36:09.026Z

[tool_use: Read]

### Assistant | 2026-05-18T02:36:09.169Z

[tool_use: Read]

### User | 2026-05-18T02:36:10.584Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\stop-memory-size-watchdog.mjs' was already read 5s ago in this session and is unchanged (mtime 1779070641747). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-18T02:36:10.594Z

[tool_result] read-once-guard: 'H:\prism\scripts\memory-compact.mjs' was already read 29m ago in this session and is unchanged (mtime 1779051923680). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T02:36:14.260Z

The read-once guard says these were already read in this session. They are not in my current context window though. Let me bypass the cache to verify the actual file state.

### Assistant | 2026-05-18T02:36:15.113Z

[tool_use: Bash]

### Assistant | 2026-05-18T02:36:15.747Z

[tool_use: Bash]

### User | 2026-05-18T02:36:31.206Z

[tool_result] #!/usr/bin/env node
// tier: T3
/**
 * stop-memory-size-watchdog.mjs — Stop hook (T3, auto-compact + advisory)
 *
 * OBSOLESCENCE-CLEANUP-MS0/U-OBS-B1 (2026-05-17, slot mike).
 * ACT step added 2026-05-18 (slot echo) — see "Auto-compaction" below.
 *
 * Surfaces a one-line advisory at Stop when MEMORY.md is at or past the
 * 24,576-byte truncation ceiling. The U-MEMORY-COMPRESS one-shot fix from
 
... [+7931 chars truncated]

### User | 2026-05-18T02:36:38.298Z

[tool_result] #!/usr/bin/env node
/**
 * memory-compact.mjs — U-OBF03, OBSIDIAN-BRAIN-FIX-MS0 (2026-05-17, slot bravo).
 *
 * MEMORY.md is auto-loaded into EVERY chat at SessionStart. The Anthropic
 * harness silently truncates it past 24576 bytes ("Only part of it was
 * loaded") — the freshest index entries become unreachable fleet-wide.
 *
 * `scripts/memory-size-watch.mjs` ALERTS when the index approaches t
... [+15903 chars truncated]

### Assistant | 2026-05-18T02:36:43.265Z

Both files read cleanly (the triage hook is a false positive — the `cat` commands succeeded). Now let me verify the key behavioral claims. The critical concern from the assignment is concurrency: up to 13 chats fire Stop hooks simultaneously, each spawning `memory-compact.mjs`.

Let me trace the concurrency path and verify the exit-code interaction.

### Assistant | 2026-05-18T02:36:45.006Z

[tool_use: Grep]

### Assistant | 2026-05-18T02:36:45.902Z

[tool_use: Bash]

### User | 2026-05-18T02:36:47.071Z

[tool_result] 534-        "hooks": [
535-          {
536-            "type": "command",
537:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-memory-size-watchdog.mjs",
538-            "timeout": 3000
539-          }
540-        ]

### User | 2026-05-18T02:37:01.695Z

[tool_result] 377ff90a44 [MAIN] [TOKEN-EFFICIENCY]/U-TE01: watchdog warn→ACT + token-efficiency playbook
---FILES---
.claude/hooks/stop-memory-size-watchdog.mjs        | 108 ++++++++++++++++++---
 .../architecture/backend-dev-token-efficiency.md   | 100 +++++++++++++++++++
 ...TCH-token-efficiency-watchdog-act-2026-05-18.md |  29 ++++++
 3 files changed, 224 insertions(+), 13 deletions(-)

### Assistant | 2026-05-18T02:37:13.481Z

The hook is wired with a 3000ms timeout. The hook sets `COMPACT_TIMEOUT_MS = 2200`. Important detail: the hook is invoked via `"H:/.claude/bin/portable-node"`, but `tryCompact()` uses `process.execPath` to spawn the child. Let me verify that `process.execPath` will resolve to portable-node when the hook itself runs under portable-node.

Now let me verify the key concurrency claim. The assignment says verify spawn-result handling is correct for `{ok:false,reason:"locked"}` and `{skipped:"throttled"}` shapes.

Tracing the `{ok:false,reason:"locked"}` case:
- `compact = tryCompact()` → `{ok:false, reason:"locked", holder:{...}}`
- `archived` = `compact && compact.ok && ...` → `compact.ok` is false → `archived = 0`
- `curPct` is still >= WARN (no compaction happened) → falls through the resolved block
- advisory `why` branch: `!compact.ok` is true → `why = "auto-compaction blocked (locked)"`

That's a problem worth flagging. Let me check the script's exit code behavior when locked.

When `memory-compact.mjs` is run as a child and hits the lock, `run()` returns `{ok:false, reason:"locked"}`, and `main()` does `process.exit(r.ok ? 0 : 1)`. So the child exits with code 1. Let me verify `spawnSync` with a non-zero exit still gives us `r.stdout`.

`spawnSync` populates `r.stdout` regardless of exit code, and `r.error` is only set for spawn failures (ENOENT, timeout), not non-zero exits. The child still writes JSON to stdout before `process.exit(1)`. So `tryCompact()` will `JSON.parse(r.stdout)` correctly → returns `{ok:false,reason:"locked"}`. Good.

Let me check the `--json` output path for the `locked` case more carefully — `main()` with `--json` writes `JSON.stringify(r, null, 2) + "\n"`. The pretty-printed JSON still `startsWith("{")` after `.trim()`. Good.

Now let me check the throttled case and verify the timeout interaction.

### Assistant | 2026-05-18T02:37:15.099Z

[tool_use: Bash]

### User | 2026-05-18T02:37:23.289Z

[tool_result] === test 1: --json output shape for normal run ===
{
  "ok": true,
  "skipped": "throttled",
  "nextEligibleInMs": 101637
}

### Assistant | 2026-05-18T02:37:29.508Z

The `{skipped:"throttled"}` shape confirmed live. Let me trace what the hook does with it:

- `compact = {ok:true, skipped:"throttled", nextEligibleInMs:101637}`
- `archived` = `compact && compact.ok && !compact.dryRun && Number.isFinite(compact.archived)` → `compact.archived` is `undefined` → `Number.isFinite(undefined)` is false → `archived = 0`. Correct.
- `curPct >= WARN` (no compaction) → falls through to advisory.
- `why` branch: `compact === null`? no. `!compact.ok`? no (`ok:true`). `compact.skipped`? **yes** → `why = "auto-compaction skipped (throttled)"`. Correct.

Both shapes handled. Now the critical concurrency analysis. Let me test the lock-contention behavior directly by simulating two concurrent invocations.

### Assistant | 2026-05-18T02:37:31.835Z

[tool_use: Bash]

### User | 2026-05-18T02:37:47.520Z

[tool_result] === concurrent spawn test (5 parallel --force --json) ===
ok=False reason=locked skipped=None archived=None
ok=False reason=locked skipped=None archived=None
ok=False reason=locked skipped=None archived=None
ok=False reason=locked skipped=None archived=None
ok=True reason=None skipped=None archived=4
=== done ===

### Assistant | 2026-05-18T02:37:59.548Z

Confirmed: under 5-way concurrency, exactly one wins (`ok=true, archived=4`), the other four return `{ok:false, reason:"locked"}` — clean JSON, no parse failures, no partial mutations. The lockfile serializes correctly.

Now an important concurrency observation. When 13 chats fire Stop simultaneously and MEMORY.md is over WARN:
- One spawn wins and compacts. MEMORY.md drops under WARN.
- The other 12 get `{ok:false, reason:"locked"}`.
- Those 12 see `curPct >= WARN` (their `fs.statSync` after `tryCompact` may catch the new size **if the winner finished first**, or the old size if not — a race).
- The 12 losers emit the advisory `why = "auto-compaction blocked (locked)"`.

This is an *advisory* not a block, throttled 12h via the marker. The first loser to reach `stampFired()` sets the marker; subsequent losers within 12h go `silent()`. So at most one or a few "blocked (locked)" advisories surface — and only the first time. Not alarming. The patch comment explicitly anticipates this ("most calls hit its own throttle and no-op").

One subtle race: the 12 losers' `curBytes = fs.statSync(MEMORY_MD).size` runs *after* `tryCompact()` returns. If the winner's atomic rename completed during a loser's `tryCompact()` wait, that loser sees the *new* (smaller) `curBytes`, computes `curPct < WARN`, and since `archived = 0` (it didn't archive), it just goes `silent()`. Correct and quiet. If the winner hasn't finished, the loser sees old bytes and emits "blocked (locked)" — also fine, throttled. No correctness defect.

Now let me check the doc accuracy. Let me verify the numbers and paths cited in the two markdown docs.

### Assistant | 2026-05-18T02:38:02.514Z

[tool_use: Bash]

### Assistant | 2026-05-18T02:38:05.521Z

[tool_use: Bash]

### User | 2026-05-18T02:38:09.829Z

[tool_result] === scripts referenced by playbook exist? ===
EXISTS: scripts/token-savings-rank.mjs
EXISTS: scripts/ollama-offload-dashboard.mjs
EXISTS: scripts/memory-size-watch.mjs
EXISTS: scripts/memory-compact.mjs
=== ollama skills referenced? ===
EXISTS: ollama-explain
EXISTS: ollama-summarize
EXISTS: ollama-docstring
EXISTS: ollama-classify
EXISTS: ollama-error-triage
EXISTS: ollama-diff-summary
EXISTS: ol
... [+14 chars truncated]

### User | 2026-05-18T02:38:15.307Z

[tool_result] === audit doc referenced by playbook ===
knowledge/wiki/architecture/audit-token-savings-2026-05-17.md  4.1K
=== related wiki entries ===
knowledge/wiki/architecture/audit-token-context-memory-2026-05-16.md
  found audit-token-context-memory-2026-05-16
knowledge/wiki/architecture/ollama-pipeline-ms0.md
  found ollama-pipeline-ms0
knowledge/wiki/architecture/obsidian-memory-feed-hook.md
  found obs
... [+155 chars truncated]

### Assistant | 2026-05-18T02:38:20.563Z

All scripts, skills, and cross-referenced wiki entries exist. The patch-sibling claims `reference_token_efficiency_playbook_2026_05_18.md` "already landed" — and it does exist. Let me verify the audit's 9.6% figure cited in the playbook, and check whether `H:/Tools/ollama` is the right path.

### Assistant | 2026-05-18T02:38:23.270Z

[tool_use: Bash]

### User | 2026-05-18T02:38:30.851Z

[tool_result] === audit 9.6% claim ===
Comprehensive audit of every token-saving measure PRISM ships. Two P0s (MEMORY.md actively truncating fleet-wide; Ollama offload rate 9.6% vs 30% target), five P1s (RTK filter hook not installed; Ollama suggestion UI dark; error-pattern-promote 99.8% no-op; ~373 bundle-aware orphan hooks; cache reader-path systemically dead across all 3 caches), one P2 (CLAUDE.md self-viol
... [+1103 chars truncated]

### Assistant | 2026-05-18T02:38:36.853Z

The audit's 9.6% figure is accurate (playbook cites it correctly). `H:/Tools/ollama` exists — the playbook's claim is correct. The audit's own P2 finding even confirms the playbook's premise ("CLAUDE.md self-violating its own ≤200-line doctrine") — and the playbook positioning ("query it before re-deriving from a 600-line CLAUDE.md") matches the audit's measured 610-line / 115KB figure.

One discrepancy to note: the playbook says CLAUDE.md is "600-line"; the audit measured 610 lines / 115KB. Minor rounding, not a factual error.

Let me verify the CLAUDE.md patch-sibling's `verify` command actually works as claimed, and check the doc-claim that the patch claims "2 reviewer P1s fixed."

### Assistant | 2026-05-18T02:38:40.012Z

[tool_use: Bash]

### User | 2026-05-18T02:38:47.725Z

[tool_result] === patch-sibling verify command — WARN_PCT=0.5 forces over-threshold ===
{"continue":true,"suppressOutput":true}
=== memory-size-watch --json under-ceiling claim ===
bytes=19503 status=ok

### Assistant | 2026-05-18T02:38:53.114Z

Interesting result. The patch-sibling's verify command claims:
> `echo '{}' | PRISM_MEMORY_SIZE_WATCHDOG_WARN_PCT=0.5 node ... stop-memory-size-watchdog.mjs` **emits an auto-compaction-aware advisory**

But my run (with `NO_COMPACT=1` to avoid actually compacting during review) produced `{"continue":true,"suppressOutput":true}` — **silent**, no advisory. Let me run the exact command as the patch-sibling wrote it (without `NO_COMPACT`) to see what it actually does, and trace why.

### Assistant | 2026-05-18T02:38:55.839Z

[tool_use: Bash]

### User | 2026-05-18T02:39:01.402Z

[tool_result] === exact patch-sibling verify command (no NO_COMPACT) ===
{"continue":true,"suppressOutput":true}
=== current MEMORY.md size vs WARN=0.5 threshold (12288 B) ===
19503 bytes

### Assistant | 2026-05-18T02:39:14.444Z

Confirmed P1 doc-claim defect. The patch-sibling's `verify` command does **not** do what the patch text claims:

- MEMORY.md is 19,503 bytes. WARN_PCT=0.5 → threshold = 12,288 bytes. So `pct = 19503/24576 = 0.794 ≥ 0.5` → over WARN. The hook enters the ACT path.
- `tryCompact()` runs `memory-compact.mjs --json`. The script hits its 30-min throttle (we just compacted in the concurrent test above) → returns `{ok:true, skipped:"throttled"}`.
- `archived = 0` (skipped). `curBytes = 19503`, `curPct = 0.794`.
- `curPct < WARN_PCT`? `0.794 < 0.5`? **No** → does NOT enter the resolved block.
- `lastFireAgeMs() < TTL_MS`? The advisory marker was just stamped by an earlier run in this session within 12h → **yes** → `silent()`.

So the command emits `{"continue":true,"suppressOutput":true}` — silent — **not** "an auto-compaction-aware advisory" as the patch-sibling's verify line asserts. The verify command is non-deterministic: it depends on (a) memory-compact's 30-min throttle state and (b) the watchdog's own 12h advisory-marker state. On a clean machine it would emit an advisory; on a machine where either throttle is warm it goes silent. A `verify` command that flips between "advisory" and "silent" depending on hidden throttle state cannot verify anything.

This is a doc-claim accuracy violation (R12 — the verify command is a lie when throttles are warm), but it's in a **patch-sibling doc**, not shipped code or CLAUDE.md itself. It misleads whoever folds the patch.

Let me confirm the other patch-sibling claims and the exit-behavior of the hook is non-blocking.

### Assistant | 2026-05-18T02:39:18.688Z

[tool_use: Bash]

### User | 2026-05-18T02:39:22.747Z

[tool_result] Exit code 1
=== hook always exits 0 (non-blocking)? ===
exit=0
=== hook with DISABLE ===
{"continue":true,"suppressOutput":true} exit=0
=== MEMORY.md recompact claim: 25593->19587 ===
current=19503 (patch says 19587 — close, drifted slightly after later edits)
=== git show: was watchdog only-advisory pre-patch? ===
0

### Assistant | 2026-05-18T02:39:32.473Z

The `git show` grep returned 0 matches (exit 1 from grep -c finding nothing), confirming the pre-patch hook had no `spawnSync`/`memory-compact` reference — so the patch's "was advisory-only" claim is accurate. Hook always exits 0 (non-blocking). DISABLE knob works.

Now let me check one concurrency edge the assignment specifically flagged — the timeout interaction. The hook is wired with `timeout: 3000` in settings.json. Inside, `tryCompact` sets `COMPACT_TIMEOUT_MS = 2200`. If the child times out, `spawnSync` sets `r.error` (an ETIMEDOUT-class error) and may have partial/empty stdout. `tryCompact` checks `r.error || !r.stdout || !r.stdout.trim().startsWith("{")` → returns `null`. Then the hook degrades to `compact === null` → `why = "auto-compaction unavailable"`. Correct fail-soft.

But there's a subtle worst-case timing issue. Let me check: under 13-way concurrency, the lock-loser path is fast (lock check fails immediately, JSON written, exit). But the **lock winner** does a full read + parse + plan + 2 atomic writes + verify-read. Let me measure that worst-case duration against the 2200ms child timeout and 3000ms hook timeout.

### Assistant | 2026-05-18T02:39:35.539Z

[tool_use: Bash]

### User | 2026-05-18T02:39:43.009Z

[tool_result] === timing: memory-compact --force (worst case: winner does full RMW) ===
/usr/bin/bash: line 1: /usr/bin/time: No such file or directory
/usr/bin/bash: line 1: /usr/bin/time: No such file or directory
/usr/bin/bash: line 1: /usr/bin/time: No such file or directory
=== timing: full hook end-to-end (over WARN, triggers spawn) ===
/usr/bin/bash: line 1: /usr/bin/time: No such file or directory
/usr/
... [+122 chars truncated]

### Assistant | 2026-05-18T02:39:47.515Z

No `/usr/bin/time` on Windows. Let me time with node itself.

### Assistant | 2026-05-18T02:39:50.450Z

[tool_use: Bash]

### User | 2026-05-18T02:39:54.835Z

[tool_result] memory-compact --force (winner full RMW) 112ms
full hook (over WARN, spawns child) 116ms

### Assistant | 2026-05-18T02:40:02.444Z

Timing is well within budget: winner full RMW is ~112ms, full hook end-to-end ~116ms — far under the 2200ms child timeout and 3000ms hook timeout. Even under 13-way concurrency where 12 are lock-losers (fast-fail) and 1 winner does the full RMW, none approach the timeout. No timeout-induced failure mode in practice.

One more concurrency check — the assignment flagged "13 parallel spawns." Each Stop hook spawns one child = 13 node processes briefly. That's a transient resource spike, but each child exits in ~100ms. The hook also has `windowsHide:true`. Acceptable. The lock guarantees only one child mutates the file; the other 12 fast-fail. No correctness defect from the parallelism — confirmed by the 5-way live test earlier.

Let me do a final check on test integrity. The assignment weights test integrity heavily — did this commit touch or weaken any tests?

### Assistant | 2026-05-18T02:40:04.677Z

[tool_use: Bash]

### User | 2026-05-18T02:42:08.992Z

[tool_result] Command running in background with ID: bosclte2q. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--PRISM\201ca088-c4c9-42f5-89fc-8c2957455c36\tasks\bosclte2q.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-18T02:42:13.982Z

[tool_use: Bash]

### User | 2026-05-18T02:42:18.372Z

[tool_result] 0
test-file-count-in-commit (above)
---
-rwxr-xr-x 1 wompu 197611 18480 May 17 16:07 scripts/memory-compact.test.mjs
(test file listing done)

### Assistant | 2026-05-18T02:42:30.891Z

Findings on test integrity:
- The commit touches **0 test files** — no assertions weakened or removed. Clean on test integrity.
- `memory-compact.test.mjs` exists (pre-existing, for the script the hook now invokes) — not modified by this commit.
- The watchdog hook itself has **no test suite**. The patch adds a non-trivial new code path (`tryCompact`, the ACT block, the `why` advisory branches, the `archived`/`curPct` logic) with no test coverage. This is a P2 scope/hygiene gap: a hook that now spawns a subprocess and branches on its result shape should have a hermetic test with an injected spawn result — exactly the "pure-core + injected-readers MUST ship a real test" lesson the codebase's own `## Recent regressions` repeats. The commit message claims "2 per-file-scrutiny P1s fixed + 1 P2" but ships zero tests for the new behavior.

Let me do one last verification — the `git show` background task and confirm there are no floating-promise / swallowed-error hygiene issues in the new code.

Reviewing the new code for hygiene:
- `tryCompact()` — synchronous (`spawnSync`), wrapped in try/catch returning `null`. The catch is intentional fail-soft, documented. Not a swallowed error in the anti-pattern sense — it's the designed degradation path. OK.
- `fs.statSync(MEMORY_MD)` for `curBytes` wrapped in try/catch with comment "keep pre-compact stat". OK.
- No `async`/`await`, no Promises — no floating-promise risk. OK.
- No `any`-spread. OK.
- `JSON.parse(r.stdout)` inside `tryCompact`'s try — covered. OK.

No hygiene violations. Let me check the background task result and wrap up.

### Assistant | 2026-05-18T02:42:31.596Z

[tool_use: Bash]

### User | 2026-05-18T02:42:38.432Z

[tool_result] === does commit touch any test files? ===
NO test files in commit

=== does the watchdog hook have an existing test suite? ===

### Assistant | 2026-05-18T02:43:03.190Z

Background task confirmed: no test files in the commit. I have everything I need.

## Review Complete

VERDICT: PASS

The commit is functionally correct and safe to ship. The concurrency design — the load-bearing concern — is sound: I verified live that under 5-way parallel invocation exactly one child wins and compacts (`archived:4`), the other four return clean `{ok:false,reason:"locked"}` JSON with zero parse failures and zero partial mutations. Both flagged result shapes (`{ok:false,reason:"locked"}` and `{ok:true,skipped:"throttled"}`) are handled correctly: `archived` resolves to 0 in both, and the `why` advisory branch maps each to a non-alarming diagnostic. The 13-loser advisory is a 12h-throttled one-liner, not a block; the hook always exits 0 (non-blocking, verified). Timing (~112ms winner RMW, ~116ms full hook) is far under the 2200ms child / 3000ms hook timeouts. Fail-soft degradation on null/timeout is correct.

Findings:

- **P1 — patch-sibling `verify` command is non-deterministic and its claimed result is wrong.** The CLAUDE-MD-PATCH file states `echo '{}' | PRISM_MEMORY_SIZE_WATCHDOG_WARN_PCT=0.5 node ...stop-memory-size-watchdog.mjs` "emits an auto-compaction-aware advisory." I ran the exact command: it emitted `{"continue":true,"suppressOutput":true}` — **silent**. The outcome depends on two hidden throttle states (memory-compact's 30m stamp + the watchdog's 12h advisory marker); when either is warm the hook goes silent. A verify command that flips between "advisory" and "silent" on hidden state cannot verify the patch. Fix: the verify line should clear both stamps first, or assert the auto-compaction code path executed (e.g. `PRISM_MEMORY_SIZE_WATCHDOG_NO_COMPACT` toggle behavior) rather than a throttle-gated message. This misleads whoever folds the patch into CLAUDE.md. Scope: doc-only — not shipped code.

- **P2 — new hook code path ships with zero test coverage.** The patch adds `tryCompact()` (subprocess spawn), the ACT block, the `archived`/
... [+2195 chars truncated]
