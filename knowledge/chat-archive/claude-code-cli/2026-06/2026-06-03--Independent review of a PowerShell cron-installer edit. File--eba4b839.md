---
type: "chat-session"
source: "claude-code-cli"
session_id: "eba4b839-de67-42ff-bc0e-3836c8de27d5"
title: "Independent review of a PowerShell cron-installer edit. File: H:/prism/scripts/i"
date: "2026-06-03"
first_ts: "2026-06-03T01:15:08.423Z"
last_ts: "2026-06-03T01:18:37.828Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 6
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/eba4b839-de67-42ff-bc0e-3836c8de27d5/subagents/agent-ac45015755c90e623.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Independent review of a PowerShell cron-installer edit. File: H:/prism/scripts/i

> **claude-code-cli** | 2026-06-03 | 17 msgs (6 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eba4b839-de67-42ff-bc0e-3836c8de27d5/subagents/agent-ac45015755c90e623.jsonl`

## Transcript

### User | 2026-06-03T01:15:08.423Z

Independent review of a PowerShell cron-installer edit. File: H:/prism/scripts/install-quoting-pipeline-cron.ps1. Read it end-to-end.

The nightly wrapper's quoting-train-cycle Stage2 was changed from training on `$BaselineMerged` (baseline-records-with-synth.json, 69 synth records) to `--baseline $BaselineReal --fallback-corpus $BaselineFallback` where $BaselineReal=baseline-records-corpus-with-real.json (47,905 real records) and $BaselineFallback=the old synth merge.

Weight your review toward what's easy to MISS in a generated-script change: (1) Does the here-string correctly produce a runnable wrapper? Trace the backtick escaping — `` `$BaselineReal `` must end up as a literal `$BaselineReal` assignment IN the generated wrapper, and `$PrismRoot`/`$Stage2`/`$NodeExe`/`$TsxBin` must expand at GENERATION time. (2) Are both the tsx-branch and node-branch Stage2 lines consistent? (3) Could the new `--fallback-corpus $BaselineFallback` argument ever be passed an empty/undefined value (e.g. if the synth file path var is unset)? (4) Does anything else in the script still reference the removed $BaselineMerged variable (grep mentally)? (5) Path correctness — both files live under state/shared/quoting/.

Also sanity-check the broader script for any OTHER place that should have been updated in tandem (e.g. a Test-Path guard listing required files, a DryRun echo, a docstring).

Report P0/P1/P2 with line numbers + grade PASS/FAIL. Concise — real findings only.

### Assistant | 2026-06-03T01:15:20.371Z

I'll read the file end-to-end first.

### Assistant | 2026-06-03T01:15:20.765Z

[tool_use: Read]

### User | 2026-06-03T01:15:23.517Z

[tool_result] read-once-guard: 'H:\prism\scripts\install-quoting-pipeline-cron.ps1' was already read 4s ago in this session and is unchanged (mtime 1780448950232). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-03T01:15:26.256Z

The guard says it was already read, but I don't actually have the content in my context. Let me bypass the cache to get the content.

### Assistant | 2026-06-03T01:15:27.359Z

[tool_use: Bash]

### User | 2026-06-03T01:15:49.135Z

[tool_result] <#
.SYNOPSIS
    Register a Windows Scheduled Task that runs the quoting calibration pipeline nightly.

.DESCRIPTION
    iter26 — operator-facing installer for the iter9-25 quoting calibration chain.
    Registers "PRISM Quoting Pipeline" task that runs the full 4-stage chain
    (bootstrap -> docustrata-overlay -> train-cycle -> drift-alert) at the
    configured time, captures stdout/stderr to a
... [+6652 chars truncated]

### Assistant | 2026-06-03T01:15:52.263Z

I have the full content. Now let me verify a few facts the trace depends on: the actual filenames under state/shared/quoting/, and whether $BaselineMerged appears anywhere.

### Assistant | 2026-06-03T01:15:55.205Z

[tool_use: Bash]

### User | 2026-06-03T01:16:37.419Z

[tool_result] === grep BaselineMerged in installer ===
107:`$BaselineReal = '$PrismRoot\state\shared\quoting\baseline-records-corpus-with-real.json'
108:`$BaselineFallback = '$PrismRoot\state\shared\quoting\baseline-records-with-synth.json'
119:    & '$TsxBin' '$Stage2' --json --feed-psn --baseline `$BaselineReal --fallback-corpus `$BaselineFallback *>> `$LogFile
121:    & '$NodeExe' '$Stage2' --json --feed-psn
... [+4282 chars truncated]

### Assistant | 2026-06-03T01:16:42.594Z

The train-cycle confirms `--fallback-corpus` is a real, supported flag (`fallbackOverride = val("fallback-corpus", null)` at line 121). Now let me confirm the backtick-escaping trace by checking exactly which `$`-vars are escaped vs unescaped in the here-string, and verify the resolver's behavior when fallback path is provided. Let me also check whether there's a Test-Path guard or DryRun echo that should list the baseline files.

### Assistant | 2026-06-03T01:16:45.995Z

[tool_use: Bash]

### User | 2026-06-03T01:17:07.602Z

[tool_result] === how resolveTrainableBaseline uses fallbackOverride (empty/undefined safety) ===
H:/prism/scripts/quoting-train-cycle.mjs:121:const fallbackOverride = val("fallback-corpus", null);
H:/prism/scripts/quoting-train-cycle.mjs:126://   • --fallback-corpus <path>           → fall back to that path if configured refused
H:/prism/scripts/quoting-train-cycle.mjs:132:else if (fallbackOverride) fallbackLi
... [+4122 chars truncated]

### Assistant | 2026-06-03T01:17:42.275Z

I now have everything needed for a complete trace. Let me verify the one remaining subtle point: the explicit-baseline path. When `--baseline $BaselineReal` is passed explicitly, the comment at line 128 says "explicit --baseline, no override → strict (honor the named baseline; guard-refuse → exit 2)". But here BOTH `--baseline` AND `--fallback-corpus` are passed. Let me check that branch logic precisely.

### Assistant | 2026-06-03T01:17:43.145Z

[tool_use: Bash]

### User | 2026-06-03T01:18:07.858Z

[tool_result] const DEFAULT_BASELINE = "state/shared/quoting/baseline-records.json";
const explicitBaseline = ARGS.includes("--baseline");
const configuredBaseline = val("baseline", DEFAULT_BASELINE);
const noWrite = flag("no-write");
const feedPsn = flag("feed-psn");
const jsonOut = flag("json");
const forceDegenerate = flag("force-degenerate");
const fallbackOverride = val("fallback-corpus", null);

// U-QP-B
... [+4452 chars truncated]

### Assistant | 2026-06-03T01:18:37.828Z

I now have complete verification of every claim the review hinges on. Let me compile the findings.

## Independent Review — install-quoting-pipeline-cron.ps1 Stage2 baseline change

### Trace results (all verified against live files)

**(1) Backtick escaping — CORRECT.** The here-string is `@"..."@` (double-quoted, interpolating). Tracing each token:
- `` `$BaselineReal `` / `` `$BaselineFallback `` (lines 107-108) → backtick-escaped, so they emit literally as `$BaselineReal`/`$BaselineFallback` **assignments in the generated wrapper**. ✓
- The RHS `'$PrismRoot\state\shared\quoting\...'` expands `$PrismRoot` at **generation time** → bakes the absolute path `H:\prism\state\...` into the wrapper. ✓
- `$Stage2`, `$NodeExe`, `$TsxBin` in the `& '...'` invocations (lines 119, 121) are **unescaped** → expand at generation time to absolute paths. ✓
- In the Stage2 args, `` `$BaselineReal `` / `` `$BaselineFallback `` are backtick-escaped → emit as literal `$BaselineReal`/`$BaselineFallback` references that resolve at **wrapper-run time** against the lines-107-108 assignments. ✓

The generation-time-vs-runtime split is exactly right: paths are baked in, variable *names* survive to the wrapper.

**(2) tsx-branch vs node-branch — CONSISTENT.** Lines 119 and 121 are byte-identical in their flag set: `--json --feed-psn --baseline \`$BaselineReal --fallback-corpus \`$BaselineFallback`. Only the executable (`$TsxBin` vs `$NodeExe`) differs, which is correct. ✓

**(3) Empty/undefined fallback arg — SAFE, no P0.** `$BaselineFallback` is unconditionally assigned a literal string on line 108; there is no code path where it is unset. Even hypothetically, the consumer (`quoting-train-cycle.mjs:121` `val("fallback-corpus", null)` → line 132 `else if (fallbackOverride) fallbackList = [fallbackOverride]`) treats a falsy value as "no override," and a non-existent path is re-validated by the poison-guard and simply skipped. No silent-poison risk. ✓

**(4) Removed `$BaselineMerged` — fully g
... [+3212 chars truncated]
