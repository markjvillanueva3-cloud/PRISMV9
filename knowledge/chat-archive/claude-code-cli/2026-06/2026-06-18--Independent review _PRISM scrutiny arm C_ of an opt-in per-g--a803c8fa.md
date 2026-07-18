---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Independent review (PRISM scrutiny arm C) of an opt-in per-galaxy cap added to t"
date: "2026-06-18"
first_ts: "2026-06-18T19:22:19.123Z"
last_ts: "2026-06-18T19:24:25.303Z"
cwd: "H:\\prism-slot-india"
messages: 27
user_msgs: 10
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-ac3df0d28b42cd050.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Independent review (PRISM scrutiny arm C) of an opt-in per-galaxy cap added to t

> **claude-code-cli** | 2026-06-18 | 27 msgs (10 user / 17 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-ac3df0d28b42cd050.jsonl`

## Transcript

### User | 2026-06-18T19:22:19.123Z

Independent review (PRISM scrutiny arm C) of an opt-in per-galaxy cap added to the FLEET-SHARED LoRA corpus assembler (slot:india, U-LORA-CORPUS-GALAXY-CAP, commit f02a7a3582). Read END TO END:

1. H:/prism/scripts/assemble-fleet-lora-corpus.mjs (search "capPerGalaxy" + "capRowsPerGalaxy" + "cap-per-galaxy")
2. H:/prism/scripts/assemble-fleet-lora-corpus.test.mjs (31 tests, the new ones near the end about capRowsPerGalaxy + "assembleCorpus threads capPerGalaxy")

CONTEXT: The lathe archive populated the corpus to 54% lathe-dominated. This adds an OPT-IN `--cap-per-galaxy=N` (and an `assembleCorpus(inventory, {capPerGalaxy})` option) that caps each galaxy-tagged row group at N, leaving untagged/cross-cutting rows uncapped. DEFAULT is 0 = OFF = no behavior change. The pure `capRowsPerGalaxy(rows, cap)` returns {rows, dropped}.

WEIGHTED REVIEW (weight toward: this is fleet-shared infra consumed by everyone's training, and it has a clobber-guard history):
- ZERO-BEHAVIOR-CHANGE-WHEN-OFF: confirm that with capPerGalaxy=0 (the default), the output rows + all summary stats (totalRows, byGalaxy, verifiedRows, advisoryRows, trainingReady) are IDENTICAL to before this change. Is the default path truly untouched?
- STATS CONSISTENCY: when the cap IS set, are ALL returned stats (totalRows, byGalaxy, advisoryRows, verifiedRows, trainingReady, rows) computed on the CAPPED set so what's reported == what's written? Any stat still computed on the uncapped `rows`?
- CLOBBER-GUARD INTERACTION: the assembler has assertNoClobber (refuses >50% shrink). Does the cap (which intentionally shrinks) interact badly with it — e.g. could a legit capped write be falsely blocked, or does the cap bypass a guard it shouldn't? Trace main()'s write path.
- capRowsPerGalaxy correctness: order preservation, untagged passthrough, cap<=0/non-finite/Infinity no-op, dropped count accuracy. Any off-by-one?
- TEST INTEGRITY (R9): do the 4 new tests actually pin the behavior (cap, untagged-passthrough, no-op-
... [+223 chars truncated]

### Assistant | 2026-06-18T19:22:23.252Z

I'll review the LoRA corpus assembler changes end to end. Let me start by reading both files.

### Assistant | 2026-06-18T19:22:23.786Z

[tool_use: Read]

### Assistant | 2026-06-18T19:22:23.889Z

[tool_use: Read]

### User | 2026-06-18T19:22:25.786Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * assemble-fleet-lora-corpus.mjs -- the MANIFEST CONSUMER (U-LORA-CORPUS-ASSEMBLE,
4	 * slot:india 2026-06-10).
5	 *
6	 * THE DORMANCY THIS CLOSES: the vault -> LoRA chain dead-ended at the manifest.
7	 * scripts/vault-to-lora-dataset.mjs PRODUCES Alpaca-triple datasets and
8	 * build-fleet-training-corpus-inventory.mjs REGISTERS them as
9	 * kind:'lora-training-json
... [+16399 chars truncated]

### User | 2026-06-18T19:22:26.134Z

[tool_result] 1	/**
2	 * assemble-fleet-lora-corpus.test.mjs -- unit tests for the manifest-consuming
3	 * fleet LoRA corpus assembler (U-LORA-CORPUS-ASSEMBLE, slot:india 2026-06-10).
4	 *
5	 * R9: every test encodes WHY, with real reference values. Pure functions are
6	 * tested hermetically (injected readImpl, no disk). Covers happy path + >=3
7	 * failure modes + >=2 adversarial + a live-inventory scan (R15 
... [+20520 chars truncated]

### Assistant | 2026-06-18T19:22:30.403Z

Both files read end to end. Now let me verify the key claims by tracing the dependencies. Let me check `deriveGalaxy` (used in the assembly path) and the git diff to confirm exactly what changed.

### Assistant | 2026-06-18T19:22:31.838Z

[tool_use: Bash]

### Assistant | 2026-06-18T19:22:32.608Z

[tool_use: Bash]

### User | 2026-06-18T19:22:36.664Z

[tool_result] commit f02a7a3582464c24c6bedb356dfd8b041f25f071
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 14:21:55 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-CORPUS-GALAXY-CAP (slot:india): opt-in --cap-per-galaxy in the fleet corpus assembler -- stops one galaxy dominating the fine-tune (lathe hit 54%; cap=300 -> 17%, balanced across 34). capRowsPerGalaxy pure+expo
... [+331 chars truncated]

### User | 2026-06-18T19:22:41.135Z

[tool_result] commit f02a7a3582464c24c6bedb356dfd8b041f25f071
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 14:21:55 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-CORPUS-GALAXY-CAP (slot:india): opt-in --cap-per-galaxy in the fleet corpus assembler -- stops one galaxy dominating the fine-tune (lathe hit 54%; cap=300 -> 17%, balanced across 34). capRowsPerGalaxy pure+expo
... [+5606 chars truncated]

### Assistant | 2026-06-18T19:22:45.023Z

The diff is clean and matches what's in the working tree. Now let me verify the test suite passes and that the per-source `bySource[].added` stat is NOT recomputed against the capped set (a potential stats-inconsistency I want to confirm). Let me also run the tests to verify R9 integrity.

### Assistant | 2026-06-18T19:22:45.686Z

[tool_use: Bash]

### User | 2026-06-18T19:22:50.868Z

[tool_result]   ...
# Subtest: capRowsPerGalaxy: untagged/cross-cutting rows are NEVER capped
ok 29 - capRowsPerGalaxy: untagged/cross-cutting rows are NEVER capped
  ---
  duration_ms: 0.064
  ...
# Subtest: capRowsPerGalaxy: cap<=0 or non-finite is a no-op (default OFF -> zero behavior change)
ok 30 - capRowsPerGalaxy: cap<=0 or non-finite is a no-op (default OFF -> zero behavior change)
  ---
  duration_ms: 
... [+314 chars truncated]

### Assistant | 2026-06-18T19:22:54.898Z

All 31 tests pass. Now let me verify two specific concerns: (1) is the test's "capped stats match written set" actually adversarial enough to catch a regression where a stat is computed on uncapped `rows`, and (2) confirm the `deriveGalaxy` behavior doesn't introduce any surprise.

Let me reason through the precise concern about `bySource` and `verifiedRows`/`advisoryRows` when the cap drops rows.

### Assistant | 2026-06-18T19:23:07.036Z

[tool_use: Bash]

### User | 2026-06-18T19:23:11.759Z

[tool_result] Exit code 1
node:internal/modules/run_main:122
    triggerUncaughtException(
    ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\scripts\assemble-fleet-lora-corpus.mjs' imported from C:\Users\wompu\AppData\Local\Temp\cap-edge-test.mjs
Did you mean to import "../../../../../../H:/prism/scripts/assemble-fleet-lora-corpus.mjs"?
    at finalizeResolution (n
... [+697 chars truncated]

### Assistant | 2026-06-18T19:23:14.752Z

Relative import resolved against the temp dir. Let me use an absolute file URL import.

### Assistant | 2026-06-18T19:23:25.269Z

[tool_use: Bash]

### User | 2026-06-18T19:23:29.858Z

[tool_result] EDGE1 totalRows 2 advisoryRows 2 verifiedRows 0 bySource.s.added(pre-cap) 3 rows.length 2
EDGE2 totalRows 2 verifiedRows 2 advisoryRows 0 cappedDropped 3 byGalaxy {"mill":2} sum==total true
EDGE3 kept 4 dropped 2 (expect kept 4, dropped 2)
EDGE4 off returns same array ref: true dropped 0

### Assistant | 2026-06-18T19:23:37.680Z

My edge probes confirm the core logic is correct:

- **EDGE1**: cap=2 drops 1 advisory row. `advisoryRows=2, verifiedRows=0, totalRows=2` all reflect the CAPPED set. The headline stats are correct.
- **EDGE2**: mixed verified+advisory; cap keeps the first 2 (both verified, source order), drops 3. `verifiedRows+advisoryRows == totalRows`. Consistent.
- **EDGE3**: untagged passthrough + multi-galaxy cap, no off-by-one.
- **EDGE4**: default OFF returns the same array reference, zero copy/mutation.

I've also confirmed one stat IS computed pre-cap: `bySource[].added` (and `bySource[].rows/duplicates`). EDGE1 shows `bySource.s.added = 3` while only 2 rows were written. Let me assess whether that is a real consistency defect or acceptable, and trace the `duplicates`/`invalid` top-level stats which are also pre-cap by construction.

Let me verify the exact semantics intended and whether `main()`'s console output or stats sidecar surfaces `bySource.added` in a way that misleads.

### Assistant | 2026-06-18T19:23:38.413Z

[tool_use: Read]

### User | 2026-06-18T19:23:39.444Z

[tool_result] 302	  if (opts.json) {
303	    const { rows, ...summary } = result;
304	    console.log(JSON.stringify(summary, null, 2));
305	  } else {
306	    console.log(`Sources: ${result.sources} | combined rows: ${result.totalRows} (verified ${result.verifiedRows} / advisory ${result.advisoryRows}) | dedup-dropped: ${result.duplicates} | invalid-skipped: ${result.invalid}`);
307	    console.log(`training_r
... [+1245 chars truncated]

### Assistant | 2026-06-18T19:23:43.928Z

Now let me trace the clobber-guard interaction precisely — the highest-weighted concern given the clobber-guard history. The write path is `assertNoClobber(opts.outPath, result.rows.length)` then `writeJsonlAtomic(opts.outPath, result.rows)`. Both use the capped `result.rows`, so they are consistent. The question is whether a *legit* capped write could be falsely blocked.

### Assistant | 2026-06-18T19:23:50.389Z

[tool_use: Bash]

### User | 2026-06-18T19:23:55.489Z

[tool_result] cap300->1800 over 3126: PASSES (correct)
aggressive cap -> 1200 over 3126: BLOCKED (would need PRISM_LORA_ALLOW_SHRINK=1) -> REFUSING to write 1200 rows over the existing 3126

### Assistant | 2026-06-18T19:24:25.303Z

This confirms the clobber-guard interaction. Now I have everything needed to render the verdict. Let me consolidate the findings.

**Trace summary of consumers / edge-paths:**

1. **`assembleCorpus` callers**: only `main()` (line 300) threads `capPerGalaxy: opts.capPerGalaxy`. The test suite calls it both with and without the option. No other consumer in the repo passes the new option, so the default-OFF guarantee covers every existing caller.

2. **Zero-behavior-change-when-OFF (verified)**: With `capPerGalaxy=0` (the default), line 200 takes the `else` branch `{ rows, dropped: 0 }` — `finalRows === rows` (same array reference, EDGE4). `totalRows`, `advisoryRows`, `byGalaxy`, `verifiedRows`, `trainingReady` are then all computed exactly as before the diff (confirmed against the `git show`: the only line-level change in the OFF path is the variable rename `rows`→`finalRows` which is identity-equal). Two new keys appear in the result: `cappedPerGalaxy: null` and `cappedDropped: 0` — purely additive, do not alter any prior stat or the written rows. The default path is genuinely untouched.

3. **Stats consistency when cap IS set (verified)**: `totalRows`, `advisoryRows`, `verifiedRows`, `byGalaxy`, `galaxiesCovered`, `trainingReady`, and `rows` are all derived from `finalRows` (the capped set). EDGE1/EDGE2 confirm `verifiedRows + advisoryRows == totalRows` and `byGalaxy` reflects the capped counts. What is written (`result.rows`) equals what is reported in the headline stats.

4. **Clobber-guard interaction (verified)**: `main()` calls `assertNoClobber(opts.outPath, result.rows.length)` then `writeJsonlAtomic(opts.outPath, result.rows)` — both on the *capped* count, so the guard checks the same number it writes (no bypass). A normal cap (e.g. 300 → 17%/~1800 of 3126) passes the >50% threshold. An *aggressive* cap that legitimately shrinks >50% is blocked and requires `PRISM_LORA_ALLOW_SHRINK=1` — this is the guard behaving as designed (an intentional shrink is exactly 
... [+3639 chars truncated]
