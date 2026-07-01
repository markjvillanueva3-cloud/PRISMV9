---
type: "chat-session"
source: "claude-code-cli"
session_id: "da9aacf5-7d0a-4de6-899e-d8a50c78583a"
title: "Independent second-pass review of TWO files. Grade PASS/FAIL, flag P0/P1 with fi"
date: "2026-05-30"
first_ts: "2026-05-30T15:23:51.177Z"
last_ts: "2026-05-30T15:29:11.335Z"
cwd: "H:\\prism-slot-alpha"
messages: 67
user_msgs: 25
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-acf8bee86cd31c2b1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:36"
---

# Independent second-pass review of TWO files. Grade PASS/FAIL, flag P0/P1 with fi

> **claude-code-cli** | 2026-05-30 | 67 msgs (25 user / 42 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-acf8bee86cd31c2b1.jsonl`

## Transcript

### User | 2026-05-30T15:23:51.177Z

Independent second-pass review of TWO files. Grade PASS/FAIL, flag P0/P1 with file:line. Weight toward integration + correctness traps a line-by-line code reviewer might MISS — do NOT assume the other reviewer caught everything.

FILES (read both fully):
- H:/prism/scripts/brain-refresh.mjs
- H:/prism/scripts/brain-refresh.test.mjs

WHAT IT IS: a consolidated brain-refresh orchestrator that sequentially runs 5 EXISTING subprocess scripts to refresh PRISM's "brain" (memory recall sidecars, galaxy syntheses, wiki-tribal embeddings, system-viz graph). It will be Stop-hook + scheduled-task wired across a ~13-26 chat fleet. The win it delivers: 5 working-but-UNWIRED refresh pipelines currently rot because they need a human to run them.

VERIFY (focus on what static script-review misses):
1. **Do the 5 wired subprocess invocations match the REAL contracts of the target scripts?** Independently check each target exists + its actual CLI:
   - H:/prism/scripts/build-memory-index-sidecar.mjs  (run with no args — correct?)
   - H:/prism/scripts/build-memory-embeddings-sidecar.mjs  (--resume — is that a real flag?)
   - H:/prism/scripts/galaxy-synthesis-refresh.mjs  (no args = detect+regen+cascade; does it REALLY exit 3 when Ollama generation is down? grep its exit codes)
   - H:/prism/scripts/embed-all-wiki.mjs  (--apply — real flag? does it need other prerequisites like a leaf-index first?)
   - H:/prism/scripts/regen-viz.mjs  (heavy; any args needed?)
   If a flag/arg/exit-code assumption is wrong, that's a P0/P1 — the orchestrator would silently mis-run or mis-classify a real pipeline.
2. **AMP2 double-work / sidecar-overlap**: galaxy-synthesis-refresh.mjs internally rebuilds the memory index+embeddings sidecars as part of its cascade. The orchestrator ALSO runs mem-index + mem-embed standalone BEFORE it. Is the ordering safe (sequential, idempotent --resume)? Any scenario where this corrupts or wastefully double-embeds? Is running them in this order vs after AMP2 a real pr
... [+1003 chars truncated]

### Assistant | 2026-05-30T15:24:01.800Z

I'll review both files thoroughly, focusing on integration correctness traps. Let me start by reading the orchestrator and its test, then verify each of the 5 target script contracts independently.

### Assistant | 2026-05-30T15:24:02.259Z

[tool_use: Read]

### Assistant | 2026-05-30T15:24:02.414Z

[tool_use: Read]

### User | 2026-05-30T15:24:04.566Z

[tool_result] read-once-guard: 'H:\prism\scripts\brain-refresh.mjs' was already read 17s ago in this session and is unchanged (mtime 1780154568621). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-30T15:24:04.738Z

[tool_result] read-once-guard: 'H:\prism\scripts\brain-refresh.test.mjs' was already read 17s ago in this session and is unchanged (mtime 1780154359018). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-30T15:24:07.149Z

The read-once guard says these files are already in my context, but I don't actually see their content — this is a fresh review task. Let me disable the cache and read them.

### Assistant | 2026-05-30T15:24:08.108Z

[tool_use: Bash]

### User | 2026-05-30T15:24:17.177Z

[tool_result] #!/usr/bin/env node
// brain-refresh.mjs — consolidated PRISM-brain refresh orchestrator (OBSIDIAN-BRAIN / BRAIN-REFRESH-MS0)
//
// The 2026-05-30 8-agent brain-upgrade sweep (state/shared/specs/PRISM-BRAIN-UPGRADES-2026-05-30.*)
// found the brain's #1 systemic weakness: FIVE independently-built, tested, working refresh pipelines
// all depend on a HUMAN to run them, so each silently rots between
... [+15895 chars truncated]

### Assistant | 2026-05-30T15:24:20.556Z

I have the orchestrator. Now let me read the test file and verify the 5 target scripts' real contracts.

### Assistant | 2026-05-30T15:24:20.561Z

[tool_use: Read]

### User | 2026-05-30T15:24:22.892Z

[tool_result] read-once-guard: 'H:\prism\scripts\brain-refresh.test.mjs' was already read 35s ago in this session and is unchanged (mtime 1780154359018). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-30T15:24:28.162Z

[tool_use: Bash]

### User | 2026-05-30T15:24:34.977Z

[tool_result] // Tests for brain-refresh.mjs (BRAIN-REFRESH-MS0 — consolidated brain-refresh orchestrator).
// Hermetic: pure fns tested directly; orchestrate()/executeRefresh() driven with injected deps
// (the main()-seam oracle that pins lock→throttle→probe→run→stamp ordering + the sidecar-write
// serialization invariant). No real fs/subprocess/Ollama touched.

import { describe, it } from "node:test";
impo
... [+10558 chars truncated]

### Assistant | 2026-05-30T15:24:38.308Z

Now I have both files. Let me independently verify the 5 target script contracts. I'll check existence and CLI/exit-code reality of each.

### Assistant | 2026-05-30T15:24:39.439Z

[tool_use: Bash]

### User | 2026-05-30T15:24:45.659Z

[tool_result] EXISTS: build-memory-index-sidecar.mjs
EXISTS: build-memory-embeddings-sidecar.mjs
EXISTS: galaxy-synthesis-refresh.mjs
EXISTS: embed-all-wiki.mjs
EXISTS: regen-viz.mjs

### Assistant | 2026-05-30T15:24:52.190Z

All 5 exist. Now verify each contract precisely. Let me check the CLI/arg/exit-code behavior of each target script.

### Assistant | 2026-05-30T15:24:54.119Z

[tool_use: Grep]

### Assistant | 2026-05-30T15:24:54.450Z

[tool_use: Grep]

### User | 2026-05-30T15:24:57.704Z

[tool_result] 14:// ~10.9k embeds take a few minutes; --resume skips already-embedded keys so a
19://   node scripts/build-memory-embeddings-sidecar.mjs --resume       # continue
50:    else if (k === "--resume") a.resume = true;
124:  const args = parseArgs(process.argv.slice(2));
129:    process.exit(1);
134:    process.exit(1);
142:    process.exit(1);
190:      + "  Wrote a .partial — fix ollama and re-run 
... [+113 chars truncated]

### User | 2026-05-30T15:24:58.388Z

[tool_result] 5: * Batch driver over embed-wiki-into-tribal-index.mjs: recursively enumerates
6: * every `knowledge/wiki/**\/*.md` and embeds it into `tribal-embed-index.json`
18: * nomic produces meaningless scores AND trips embed-wiki's index-`dim`
24: * The index is keyed by entry `id`; `planAppend()` skips already-present ids,
32: * Like its parent script, the index read-modify-write is NOT locked. This is

... [+1169 chars truncated]

### Assistant | 2026-05-30T15:25:02.535Z

Confirmed: `--resume` is real for mem-embed; `--apply` is real for embed-all-wiki. But I found a critical detail on embed-all-wiki: **line 190 `if (!fs.existsSync(INDEX_PATH)) out({...}, 2)` — it exits 2 if the index doesn't exist (prerequisite)**. Let me verify that prerequisite path and the galaxy-synth exit codes (the AMP2 exit-3 contract is load-bearing).

### Assistant | 2026-05-30T15:25:04.429Z

[tool_use: Grep]

### Assistant | 2026-05-30T15:25:05.204Z

[tool_use: Bash]

### User | 2026-05-30T15:25:08.389Z

[tool_result] 5:// ALL 34 galaxies every run (~20 min of generation). This is the SURGICAL tool:
14:// generation is wedged) and compares hashes. Changed → STALE → regenerate.
15:// So staleness is ALWAYS detectable; only the regen needs generation (and if it's
16:// down, the stale set is reported + deferred, never silently skipped).
18:// Cascade (P1 — Reviewer-B): when ≥1 L1 synthesis is regenerated, the sid
... [+2684 chars truncated]

### User | 2026-05-30T15:25:10.503Z

[tool_result] 6: * every `knowledge/wiki/**\/*.md` and embeds it into `tribal-embed-index.json`

### Assistant | 2026-05-30T15:25:15.025Z

galaxy-synth exit-3 contract is **confirmed real** (line 202: `process.exit(3)` when ollama generation down; line 209 exit 1 when mostly-failed; line 173 exit 1 when no galaxies). Now let me find embed-all-wiki's INDEX_PATH (the prerequisite that exits 2), and check mem-index args + whether galaxy-synth rebuilds the sidecars (AMP2 double-work question).

### Assistant | 2026-05-30T15:25:15.876Z

[tool_use: Grep]

### Assistant | 2026-05-30T15:25:18.191Z

[tool_use: Grep]

### Assistant | 2026-05-30T15:25:18.847Z

[tool_use: Grep]

### User | 2026-05-30T15:25:19.287Z

[tool_result] 6: * every `knowledge/wiki/**\/*.md` and embeds it into `tribal-embed-index.json`
59:  INDEX_PATH, flattenBody, buildEntry, embedText, planAppend, spliceEntries,
190:  if (!fs.existsSync(INDEX_PATH)) out({ ok: false, error: `index not found: ${INDEX_PATH}` }, 2);
196:  const idx = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
214:  const BLURB_CACHE_PATH = INDEX_PATH.replace(/(\.json)?$/, ".blu
... [+59 chars truncated]

### User | 2026-05-30T15:25:22.560Z

[tool_result] 18:// Cascade (P1 — Reviewer-B): when ≥1 L1 synthesis is regenerated, the sidecars
22:// regen → strip changed synthesis vectors → rebuild index sidecar → rebuild
32:import { execFileSync } from "node:child_process";
54:const BUILD_INDEX_SIDECAR = "H:/prism/scripts/build-memory-index-sidecar.mjs";
55:const BUILD_EMB_SIDECAR = "H:/prism/scripts/build-memory-embeddings-sidecar.mjs";
56:const EMB_SID
... [+1372 chars truncated]

### User | 2026-05-30T15:25:23.234Z

[tool_result] 280:  const args = process.argv.slice(2);
329:    const argv = process.argv[1] || "";
340:    process.exit(1);

### Assistant | 2026-05-30T15:25:27.961Z

Several critical findings emerging. Let me confirm:

1. **embed-all-wiki INDEX_PATH** is `tribal-embed-index.json` (the shared tribal index) — it exits 2 if that doesn't exist. The orchestrator treats exit 2 as `failed`. Is the index a guaranteed prerequisite? Let me check.
2. **galaxy-synth's cascade rebuilds BOTH sidecars** (lines 152-154: strip → index → embed) — confirming AMP2 double-work concern.

Let me check the mem-index/mem-embed argv handling more closely, and whether the tribal-embed-index exists (the prerequisite for wiki-tribal).

### Assistant | 2026-05-30T15:25:29.763Z

[tool_use: Bash]

### Assistant | 2026-05-30T15:25:31.004Z

[tool_use: Bash]

### User | 2026-05-30T15:25:37.302Z

[tool_result]   renameImpl(tmpPath, outPath);
  return outPath;
}

function main() {
  const args = process.argv.slice(2);
  const wantsJson = args.includes("--json");
  const dryRun = args.includes("--dry-run");

  const start = Date.now();
  const sidecar = buildSidecar({});
  const elapsedMs = Date.now() - start;

  if (dryRun) {
    if (wantsJson) {
      process.stdout.write(JSON.stringify({
        dryRun
... [+1486 chars truncated]

### User | 2026-05-30T15:25:43.891Z

[tool_result] -rw-r--r-- 1 wompu 197611 401586174 May 29 23:50 state/shared/tribal-embed-index.json
/usr/bin/ls: cannot access 'knowledge/wiki/tribal-embed-index.json': No such file or directory
---grep INDEX_PATH def in embed-wiki-into-tribal-index.mjs---
8: * `state/shared/tribal-embed-index.json` so they become reachable by the
18: * pattern is: write tribal wiki → embed into tribal-embed-index → commit
93: 
... [+571 chars truncated]

### Assistant | 2026-05-30T15:25:55.116Z

Key confirmations:
- **mem-index** (`build-memory-index-sidecar.mjs`): no-args is correct — it builds unconditionally, exits 0 on success / 1 on throw. `--dry-run` returns without writing. The orchestrator runs it with `args: []` ✓ correct.
- **embed-all-wiki INDEX_PATH** = `state/shared/tribal-embed-index.json` which **exists (383MB)**. So the prerequisite is satisfied in practice. But it's a real dependency — exit 2 if absent. The orchestrator maps exit 2 → `failed` (correct fail-loud behavior, but worth noting it's a prerequisite, not a bug).

Now let me verify the **`--resume` flag semantics** on mem-embed (does it write a `.partial` and exit 1 on ollama outage — meaning the orchestrator should defer, not fail?), and check regen-viz args + whether it's safe with no args.

### Assistant | 2026-05-30T15:25:55.901Z

[tool_use: Bash]

### User | 2026-05-30T15:26:02.548Z

[tool_result]   else renameSync(tmp, `${outPath}.partial`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(args.inPath)) {
    process.stderr.write(`[build-memory-embeddings] input sidecar missing: ${args.inPath}\n`
      + "Run: node scripts/build-memory-index-sidecar.mjs first.\n");
    process.exit(1);
  }
  const inSc = JSON.parse(readFileSync(args.inPath, "ut
... [+4229 chars truncated]

### Assistant | 2026-05-30T15:26:10.610Z

This is a **major finding**. mem-embed (`build-memory-embeddings-sidecar.mjs`):
- On **ollama preflight failure → `process.exit(1)`** (line 142), NOT exit 3.
- On too-many-embed-failures → `process.exit(1)` (line 192).

The orchestrator's `stepGate` defers mem-embed when `health.embeddings === false`, so it normally won't even run mem-embed if the orchestrator's own embeddings probe fails. **BUT** there's a race/gap: the orchestrator probes embeddings once up front. If embeddings probe passes but ollama then flaps during the (up to 600s) embed run, mem-embed exits 1 → orchestrator classifies `failed` → **exit 1 (hard fail)**, not deferred. Same for wiki-tribal. This is an ollama-transient being mis-classified as a hard failure — but it's arguably acceptable fail-loud behavior. Let me note it as P2/P1 borderline.

Now let me check regen-viz args (no-args safety) and confirm the `--with-context` consideration for embed-all-wiki plus check regen-viz exit codes (the merge-fail exits 2/3 per the CLAUDE.md regression).

### Assistant | 2026-05-30T15:26:12.150Z

[tool_use: Bash]

### User | 2026-05-30T15:26:18.062Z

[tool_result] 18: *   node scripts/regen-viz.mjs --full     # also regen the heavy fs-deep + L11
29:  decideMergePostState,
85:if (process.argv.includes("--drift-gate-only")) {
86:  const fail = runDriftGate({ regenerate: !process.argv.includes("--no-detect") });
87:  process.exit(fail ? 1 : 0);
90:const FAST = [
130:  "generate-quoting-pipeline-features.mjs",  // U-VIZ-FAST-REGISTER (sierra 2026-05-29) — was o
... [+1255 chars truncated]

### Assistant | 2026-05-30T15:26:23.623Z

regen-viz findings:
- No-args runs `FAST` only (not `--full`) — that's the lighter path. The orchestrator runs `args: []` ✓ correct for a "floor."
- But regen-viz has **multiple non-zero exit codes**: `EXIT_GRAPH_WRITE_LOCK_SKIP` (line 258), `guard.exitCode` from `decideMergePostState` (line 283, which per CLAUDE.md is exit 2 merge-fail / exit 3 silent-no-op), and line 424 exit 1 on failed. The orchestrator's `statusFromRun` for regen-viz (no `exit3` marker) maps **any nonzero → failed**. Let me confirm what `EXIT_GRAPH_WRITE_LOCK_SKIP` is — if it's a benign "another writer holds the lock, skip" that should NOT be a hard-fail.

### Assistant | 2026-05-30T15:26:25.523Z

[tool_use: Bash]

### User | 2026-05-30T15:26:36.464Z

[tool_result] scripts/regen-viz.mjs:36:  EXIT_GRAPH_WRITE_LOCK_SKIP,
scripts/regen-viz.mjs:258:  process.exit(EXIT_GRAPH_WRITE_LOCK_SKIP);
scripts/lib/system-graph-write-lock.mjs:86:export const EXIT_GRAPH_WRITE_LOCK_SKIP = 4;
--- decideMergePostState exit codes ---
27:export const EXIT_OK = 0;
28:export const EXIT_MERGE_FAILED = 2;
29:export const EXIT_MERGE_NO_OP = 3;
37: * Decide whether the orchestrator sho
... [+347 chars truncated]

### Assistant | 2026-05-30T15:26:45.454Z

This confirms a **second significant finding**. regen-viz exit codes:
- **Exit 4** = `EXIT_GRAPH_WRITE_LOCK_SKIP` — another writer holds the graph lock, regen-viz **benignly skips** (this is the *expected* concurrent-fleet behavior, exactly analogous to brain-refresh's own "skipped-locked").
- **Exit 3** = `EXIT_MERGE_NO_OP` — silent-no-op guard tripped.
- **Exit 2** = `EXIT_MERGE_FAILED` — real merge failure.
- **Exit 1** = generic failure.

The orchestrator maps regen-viz (`heavy`, no `exit3` marker) **any nonzero → `failed` → orchestrator exit 1**. So when regen-viz benignly skips because another fleet member holds the system-graph write lock (exit 4) — a **routine, expected** event in a 13-26 chat fleet — brain-refresh reports a **hard failure (exit 1)**. As a Stop hook that's wired fleet-wide, this will produce frequent false-failure noise. This is a real P1 misclassification.

Let me verify the throttle/stamp interaction with `--with-viz` (regen-viz only runs with the flag, so default Stop-hook runs won't hit it — does that lower the severity?) and double-check the AMP2 ordering question by confirming what galaxy-synth's strip/index/embed does to the standalone-built sidecars.

### Assistant | 2026-05-30T15:26:46.285Z

[tool_use: Bash]

### User | 2026-05-30T15:26:56.818Z

[tool_result] // Drop the regenerated galaxies' synthesis vectors from the embeddings sidecar so
// the subsequent `--resume` RE-embeds them with fresh content (`--resume` skips by
// KEY, so without the strip a changed synthesis keeps its STALE vector). Atomic.
export function stripEmbeddingVectors(galaxies, embPath = EMB_SIDECAR_PATH, { readFileImpl = readFileSync, writeFileImpl = writeFileSync, renameImpl = 
... [+3745 chars truncated]

### Assistant | 2026-05-30T15:27:06.993Z

Now I fully understand the AMP2 double-work picture. Let me analyze the ordering carefully:

**AMP2 double-work analysis:** The orchestrator runs `mem-index` → `mem-embed --resume` → `galaxy-synth`. Inside galaxy-synth's cascade (only when `regenerated > 0`): `stripEmbeddingVectors(done)` → `BUILD_INDEX_SIDECAR` → `BUILD_EMB_SIDECAR --resume`.

So the orchestrator builds the index+embeddings sidecars **standalone first**, then galaxy-synth rebuilds them **again** (if any galaxy regenerated). This is:
- **Wasteful but not corrupting** — all writes are atomic (tmp+rename), `--resume` is key-idempotent, the strip is targeted. The standalone mem-index/mem-embed before galaxy-synth produce fresh sidecars; galaxy-synth then strips the regenerated galaxies' vectors and re-embeds only those keys. No corruption, sequential, idempotent. The double-index-build is full redundant work (~the mem-index cost twice + a partial re-embed), but galaxy-synth only re-runs them when it actually regenerated content, which is the rare path.
- **Ordering is correct**: running mem-index/mem-embed *before* galaxy-synth means galaxy-synth's strip+resume operates on an already-fresh sidecar. Running them *after* would be equally valid. No safety problem. The waste is the only cost, and it's bounded.

Let me run the test suite to confirm it passes, then verify the live `--dry-run` entry point works (the "hermetic fakes don't prove wiring" check).

### Assistant | 2026-05-30T15:27:07.529Z

[tool_use: Bash]

### User | 2026-05-30T15:27:14.086Z

[tool_result]     # Subtest: --heavy is an alias for --with-viz
    ok 2 - --heavy is an alias for --with-viz
      ---
      duration_ms: 0.196
      ...
    # Subtest: defaults are all off / null
    ok 3 - defaults are all off / null
      ---
      duration_ms: 0.0813
      ...
    1..3
ok 8 - parseArgs
  ---
  duration_ms: 0.5665
  type: 'suite'
  ...
1..8
# tests 37
# suites 8
# pass 37
# fail 0
# cancell
... [+48 chars truncated]

### Assistant | 2026-05-30T15:27:18.402Z

37/37 pass. Now the critical "hermetic fakes don't prove wiring" check — run the real `--dry-run` entry point against production (this is the path the user noted caught one entry-point bug already).

### Assistant | 2026-05-30T15:27:19.261Z

[tool_use: Bash]

### User | 2026-05-30T15:27:26.347Z

[tool_result] {
  "dryRun": true,
  "health": {
    "daemon": true,
    "generate": true,
    "embeddings": true
  },
  "plannedSteps": [
    {
      "id": "mem-index",
      "requires": "none",
      "willRun": true
    },
    {
      "id": "mem-embed",
      "requires": "embeddings",
      "willRun": true
    },
    {
      "id": "galaxy-synth",
      "requires": "generate",
      "willRun": true
    },
    {
... [+101 chars truncated]

### Assistant | 2026-05-30T15:27:31.934Z

The real entry point works — `isMain` guard fires, probe runs against live Ollama (daemon/generate/embeddings all up), dependency forward-sim is correct (mem-embed willRun:true because mem-index would succeed). This proves the production wiring path.

Now let me verify two more correctness traps: (1) the `--only` + `--dry-run` doesn't accidentally include regen-viz, and (2) test whether `--only regen-viz --with-viz --force` actually invokes regen-viz to confirm the heavy-step real subprocess path isn't broken. Let me also confirm there's no real-subprocess integration test (the gap).

### Assistant | 2026-05-30T15:27:34.349Z

[tool_use: Bash]

### User | 2026-05-30T15:27:41.142Z

[tool_result] === test: --only with bad id (typo) silently runs nothing? ===
  "plannedSteps": []
=== grep test file for any real-subprocess / realRunStep / execFileSync coverage ===
1

### Assistant | 2026-05-30T15:27:49.887Z

Two more findings:

1. **`--only nonexistent-step` → `plannedSteps: []`** → silently runs nothing → orchestrator returns exit 0 "ran" with empty results. A typo'd `--only` ID is silently swallowed (no warning, no nonzero exit). Minor (P2) — operator footgun, but `--only` is an operator-supervised flag.

2. **Test coverage of real I/O paths: only 1 grep hit** (the `--dry-run` string in a comment/parseArgs test). Confirmed: **none of `realRunStep`, `realProbeOllama`, `realAcquireLock`, `realReleaseLock` are exercised by any test.** The lock-reclaim logic (the race-safe rename-aside, stale-PID detection, the `retried` recursion) — the most subtle correctness code in the file — is **entirely untested**. The orchestrate() oracle injects fake `acquireLock`/`releaseLock`. This is exactly the "hermetic fakes don't prove production wiring" class the user flagged. The live `--dry-run` I just ran covers probe+plan+isMain, but **not** the lock-reclaim path or `realRunStep`'s exit-code surfacing.

Let me verify the lock-reclaim logic by direct reasoning against one concurrency edge, and check the `pidAlive` EPERM semantics + the `parseArgs` `--only` at end-of-argv edge.

### Assistant | 2026-05-30T15:27:54.718Z

[tool_use: Bash]

### User | 2026-05-30T15:28:04.396Z

[tool_result] --only no-value: []
--only empty: []
regen-viz exit4 (lock-skip) => failed
regen-viz exit3 (merge-no-op) => failed
regen-viz exit2 (merge-fail) => failed
only deferred-ollama => {"exitCode":3,"verdict":"deferred"}

### Assistant | 2026-05-30T15:28:11.186Z

This **confirms the P1**: `regen-viz` exit 4 (benign lock-skip), exit 3 (merge-no-op), and exit 2 (merge-fail) are **all classified `failed`** → orchestrator exit 1. The benign lock-skip (exit 4) is the routine fleet-concurrency case that will cause false hard-failures.

Also confirmed: `--only` at end-of-argv → `[]` (empty array, which `planSteps` treats as "no filter" → runs ALL non-heavy steps). Wait — let me verify that interaction, because `parseArgs(["--only"])` returns `only: []`, and `planSteps({only: []})` → the `onlySet` is `null` (since `only.length` is 0) → **runs everything**. So `--only` with no value silently runs the full set instead of erroring. Minor footgun (P2).

Let me do a final check on the `--dry-run` health-probe blocking concern (fail-soft contract #4) and confirm `curlOk` can't hang the Stop hook, plus check how the orchestrator is intended to be spawned (detached?).

### Assistant | 2026-05-30T15:28:14.392Z

[tool_use: Bash]

### User | 2026-05-30T15:28:21.172Z

[tool_result] === Is there a Stop hook / scheduled task wiring for brain-refresh yet? ===
=== curl timeout knobs in probe ===
49:  { id: "mem-index", label: "memory BM25 index sidecar", script: "build-memory-index-sidecar.mjs", args: [], requires: "none", dependsOn: null, timeoutMs: 180_000 },
50:  { id: "mem-embed", label: "memory dense embeddings sidecar", script: "build-memory-embeddings-sidecar.mjs", args: 
... [+1343 chars truncated]

### Assistant | 2026-05-30T15:29:11.335Z

**Fail-soft contract analysis (#4):**
- `curlOk` has dual timeouts: curl's own `-m 3`/`-m 8` AND execFileSync `timeout` (5000/10000ms). Both bounded — probe can't hang. Good.
- `realRunStep` uses `execFileSync` with per-step `timeoutMs` (max 1.8M ms = 30 min). On timeout, `e.signal` is set → mapped to exit 124 → `failed`. Bounded, won't hang indefinitely. Good.
- **BUT a Stop-hook concern**: the total *synchronous* wall-time of a full run is the sum of step timeouts. If brain-refresh is spawned **detached** by the Stop hook (fire-and-forget, like fleet-reaper-stop.mjs), this is fine. If it's invoked **synchronously inside** the Stop hook, a worst-case run (mem-embed 600s + galaxy-synth 1200s = 30 min) would block the chat's Stop catastrophically. The wiring isn't built yet (grep found nothing) — **the detached-spawn requirement must be enforced by the Stop hook wiring**, and that's the load-bearing safety property. This needs to be called out for the (not-yet-written) wiring unit. Within this file's scope, the orchestrator itself is fail-soft and bounded.

I have enough evidence. Let me compile the verdict.

---

## REVIEW VERDICT: PASS (with 1 P1 + several P2)

Both files are correct, well-structured, and the orchestrator's production entry-point is live-verified working (`--dry-run` exit 0, real Ollama probe, correct dependency forward-sim). 37/37 tests pass. The 5 subprocess contracts are mostly right. One real misclassification bug (P1) and a notable test gap.

### Contract verification (independently grepped each target)
| Step | Invocation | Real contract | Verdict |
|------|-----------|---------------|---------|
| mem-index | `build-memory-index-sidecar.mjs` (no args) | builds unconditionally, exit 0/1 | ✅ correct |
| mem-embed | `--resume` | real flag (`brain-refresh.mjs:50`→ confirmed `build-memory-embeddings-sidecar.mjs:50`); **exits 1 (not 3) on ollama preflight fail / >MAX_FAIL_FRACTION** | ✅ flag correct; see P2-A |
| galaxy-synth | no args | detect+reg
... [+6272 chars truncated]
