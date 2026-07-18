---
type: "chat-session"
source: "claude-code-cli"
session_id: "31b302a2-1334-4b15-87f3-6aa6d7d85dfa"
title: "Third independent review (arm C) of PRISM commit `43c5a7cbf3` (repo H:/prism), w"
date: "2026-06-22"
first_ts: "2026-06-22T12:31:08.561Z"
last_ts: "2026-06-22T12:38:00.889Z"
cwd: "H:\\prism"
messages: 72
user_msgs: 26
assistant_msgs: 46
raw_file: "H:/.claude/projects/H--prism/31b302a2-1334-4b15-87f3-6aa6d7d85dfa/subagents/agent-aaf3a0cbd4ce867f4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Third independent review (arm C) of PRISM commit `43c5a7cbf3` (repo H:/prism), w

> **claude-code-cli** | 2026-06-22 | 72 msgs (26 user / 46 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/31b302a2-1334-4b15-87f3-6aa6d7d85dfa/subagents/agent-aaf3a0cbd4ce867f4.jsonl`

## Transcript

### User | 2026-06-22T12:31:08.561Z

Third independent review (arm C) of PRISM commit `43c5a7cbf3` (repo H:/prism), weighted toward SILENT BREAKAGE, REGRESSION RISK, I/O safety, and INTEGRATION COUPLING. Do NOT assume arms A/B caught everything. Read the diff: `cd H:/prism && git show 43c5a7cbf3`.

UNIT: U-PSN-INCREMENTAL-AGGREGATE — rewires the Stop hook stop-psn-savings-aggregate.mjs from a full per-run re-parse to an offset-checkpoint incremental aggregation in scripts/lib/psn-savings-aggregate.mjs.

Investigate specifically:
1. CONSUMER REGRESSION: the OUTPUT json (state/shared/dashboards/psn-savings-aggregate.json) is read by session-start-savings-headline.mjs, combo-efficiency-baseline.mjs, token-awareness-snapshot.mjs, stop-token-savings-summary.mjs. Confirm the new schema (1.1.0 + `_checkpoint`) keeps `totals` + `byLedger` shape so NO consumer breaks. Check whether any consumer gates on schemaVersion. (grep the consumers.)
2. STALE-CHECKPOINT HAZARD: if the OUTPUT json is hand-edited, partially written, or a ledger is rotated+regrown past the old offset WITHIN one throttle window — what happens? Is any failure silent + wrong (double-count / undercount), and is it disclosed (R12)?
3. The fd-based readers (openSync/readSync/closeSync): fd leak on the throw path? `Buffer.allocUnsafe` partial-read handling (`subarray(0,r)`)? Concurrency with a live appender mid-read?
4. Does `incrementalAggregate` mutate the caller's `prevByLedger`/`checkpoint` inputs? (It must not corrupt the prior OUTPUT object.)
5. Any path where the hook now throws/hangs and breaks Stop where the old code passed.

Verify against the live code; cite file:line. Grade PASS or FAIL with P0/P1/P2 findings. Be concise.

### Assistant | 2026-06-22T12:31:14.781Z

I'll investigate this commit thoroughly. Let me start by reading the diff and the relevant files.

### Assistant | 2026-06-22T12:31:15.135Z

[tool_use: Bash]

### User | 2026-06-22T12:31:15.726Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-22T12:31:19.298Z

I'll work from the cached result but I need the actual diff content. Let me read the key files directly.

### Assistant | 2026-06-22T12:31:19.721Z

[tool_use: Bash]

### User | 2026-06-22T12:31:24.336Z

[tool_result] commit 43c5a7cbf35fe91aebacb76bb7a8e90cb18abd71
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 07:30:08 2026 -0500

    [MAIN-FORCE] [TOKEN-SAVINGS]/U-PSN-INCREMENTAL-AGGREGATE (slot:alpha): offset-checkpoint incremental PSN savings aggregation -- parse only appended bytes, retire the 64MB per-run re-parse
    
    The deferred follow-up to U-PSN-AGGREGATE-TAILREAD-
... [+1572 chars truncated]

### Assistant | 2026-06-22T12:31:27.172Z

Let me read the core library file and the hook, plus check the consumers in parallel.

### Assistant | 2026-06-22T12:31:28.032Z

[tool_use: Read]

### User | 2026-06-22T12:31:29.044Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\psn-savings-aggregate.mjs' was already read 21s ago in this session and is unchanged (mtime 1782131239103). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T12:31:32.365Z

The guard says it's already in context, but I don't actually see it. Let me bypass via git show of the file at that commit to get the exact post-commit content.

### Assistant | 2026-06-22T12:31:33.145Z

[tool_use: Bash]

### User | 2026-06-22T12:31:38.429Z

[tool_result] // scripts/lib/psn-savings-aggregate.mjs
// -------------------------------------
// PSN-SAVINGS-AGGREGATE/U-PSA01 (2026-05-24, slot:alpha)
//
// Unifies the 6 token-savings telemetry sidecars shipped this session into
// one PSN-friendly daily summary. Pure-function aggregator; the Stop hook
// calling this owns file I/O.
//
// Tracked ledgers:
//   1. rtk-savings-ledger.jsonl                  → 
... [+13125 chars truncated]

### Assistant | 2026-06-22T12:31:41.440Z

Now the hook. Let me read it and the consumers in parallel.

### Assistant | 2026-06-22T12:31:42.157Z

[tool_use: Read]

### User | 2026-06-22T12:31:43.308Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\stop-psn-savings-aggregate.mjs' was already read 29s ago in this session and is unchanged (mtime 1782130963402). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-06-22T12:31:47.544Z

The read-once guard is blocking but the content is not actually in my context (this is a fresh agent session). Let me disable the cache for this read.

### Assistant | 2026-06-22T12:31:49.160Z

[tool_use: Bash]

### User | 2026-06-22T12:31:59.544Z

[tool_result] #!/usr/bin/env node
// tier: T3
/**
 * stop-psn-savings-aggregate.mjs — Stop hook
 *
 * PSN-SAVINGS-AGGREGATE/U-PSA01 (2026-05-24, slot:alpha)
 *
 * Reads the 6 token-savings telemetry sidecars and writes a unified daily
 * summary to state/shared/dashboards/psn-savings-aggregate.json. Master-index
 * nightly regen picks it up so future prompts see the cumulative figure.
 *
 * Throttled 1/hour glo
... [+6571 chars truncated]

### Assistant | 2026-06-22T12:32:02.349Z

Now let me examine the consumers. Let me check what each reads from the OUTPUT json and whether any gates on schemaVersion.

### Assistant | 2026-06-22T12:32:03.671Z

[tool_use: Bash]

### User | 2026-06-22T12:33:26.613Z

[tool_result] === session-start-savings-headline ===
./.claude/hooks/session-start-savings-headline.mjs
=== combo-efficiency-baseline ===
./scripts/combo-efficiency-baseline.mjs
=== token-awareness-snapshot ===
./scripts/token-awareness-snapshot.mjs
=== stop-token-savings-summary ===
./.claude/hooks/stop-token-savings-summary.mjs

### Assistant | 2026-06-22T12:33:30.081Z

[tool_use: Bash]

### User | 2026-06-22T12:33:50.435Z

[tool_result] === consumers reading psn-savings-aggregate.json ===
./.claude/hooks/session-start-savings-headline.mjs:8: * Producer→consumer closure: stop-psn-savings-aggregate writes a unified
./.claude/hooks/session-start-savings-headline.mjs:24:const AGGREGATE = "H:/prism/state/shared/dashboards/psn-savings-aggregate.json";
./.claude/hooks/session-start-savings-headline.mjs:120:  lines.push(`_Source: \`state
... [+724 chars truncated]

### Assistant | 2026-06-22T12:33:53.405Z

Now let me look at exactly how each consumer reads `totals` / `byLedger` / `schemaVersion`.

### Assistant | 2026-06-22T12:33:55.088Z

[tool_use: Bash]

### User | 2026-06-22T12:34:01.803Z

[tool_result] === session-start-savings-headline.mjs (reads) ===
15: *   - formatLedgerBreakdown(byLedger) → string  (per-ledger compact breakdown)
24:const AGGREGATE = "H:/prism/state/shared/dashboards/psn-savings-aggregate.json";
43: * Pure: render a per-ledger breakdown line from the byLedger map.
51:export function formatLedgerBreakdown(byLedger) {
52:  if (!byLedger || typeof byLedger !== "object") return 
... [+1037 chars truncated]

### Assistant | 2026-06-22T12:34:04.885Z

The headline consumer reads `totals.{hits,nudges,savedTokens,ledgersWithData}` and `byLedger` per-ledger `{lines,nudges,hits,misses,savedTokens}` — no schemaVersion gate. The new schema preserves all of these. Let me check the other three.

### Assistant | 2026-06-22T12:34:06.266Z

[tool_use: Bash]

### User | 2026-06-22T12:34:11.271Z

[tool_result] === combo-efficiency-baseline.mjs psn reads ===
15: *   • PSN combo       — cross-substrate nudge/hit totals (umbrella metric)
18: *   state/shared/dashboards/psn-savings-aggregate.json
25: *   state/shared/dashboards/combo-efficiency-baseline.json (schemaVersion 1.0.0)
42: *   classifyComboUmbrella(psn)
44: *   buildBaseline({psn, route, link, ollama, awareness})
230: * Combo umbrella metric — cr
... [+930 chars truncated]

### Assistant | 2026-06-22T12:34:13.987Z

combo-efficiency reads only `psn.totals.{nudges,hits,savedTokens}` — no schemaVersion gate, all preserved. Now the last two.

### Assistant | 2026-06-22T12:34:14.951Z

[tool_use: Bash]

### User | 2026-06-22T12:34:19.588Z

[tool_result] === token-awareness-snapshot.mjs psn reads ===

  // engines (domain-true count → sharedFirst so a stale worktree reports the full set)
  const engines = cd("mcp-server/src/engines", TOKEN_ENGINE_RE, { sharedFirst: true });
  const aiRouter =
    !!resolveExisting("mcp-server/src/engines/AISystemRouterEngine.ts") ||
    !!resolveExisting("mcp-server/src/engines/AiSystemRouterEngine.ts");

  // liv
... [+1042 chars truncated]

### Assistant | 2026-06-22T12:34:23.316Z

[tool_use: Bash]

### User | 2026-06-22T12:34:27.198Z

[tool_result] === token-awareness-snapshot psn field access ===
336:  const psnData = inp.psn.ok ? inp.psn.data : null;
=== stop-token-savings-summary reads psn-savings-aggregate? ===
12: * Distinct from `stop-psn-savings-aggregate` (writes aggregate JSON daily).

### Assistant | 2026-06-22T12:34:30.702Z

`stop-token-savings-summary` only mentions the aggregate in a comment — it does NOT read the OUTPUT json (it has its own sources). Let me confirm token-awareness-snapshot's use of `psnData`.

### Assistant | 2026-06-22T12:34:31.286Z

[tool_use: Bash]

### User | 2026-06-22T12:34:35.858Z

[tool_result] === psnData usage ===
    inp.aiRouter ? "AISystemRouterEngine present" : "router engine not found in this tree",
    inp.aiRouter ? "" : "verify aiSystemRouterEngine.route() knows token domain",
  );

  // live token-economy metrics
  const ratio = ollamaRatio(inp.ollama);
  const psnData = inp.psn.ok ? inp.psn.data : null;
  const metrics = {
    ollamaOffloadRatio: ratio,
    psnSavings: (() =>
... [+846 chars truncated]

### Assistant | 2026-06-22T12:34:41.398Z

All four consumers confirmed: they read `totals.{hits,nudges,savedTokens,ledgersWithData}` and `byLedger.<name>.{lines,nudges,hits,misses,savedTokens}`. None gate on `schemaVersion`. The new schema 1.1.0 preserves `totals` + `byLedger` exactly. The only additions are `_meta` and `_checkpoint` (additive, ignored by consumers).

Now let me investigate the stale-checkpoint hazards and the throttle interaction. Let me check the actual live output and the prune hook (`stop-ledger-prune`).

### Assistant | 2026-06-22T12:34:43.258Z

[tool_use: Bash]

### User | 2026-06-22T12:35:22.507Z

[tool_result] === live output (head) ===
{
  "schemaVersion": "1.1.0",
  "_meta": {
    "lastRunAt": 1782131281108,
    "generatedBy": "stop-psn-savings-aggregate.mjs",
    "mode": "incremental"
  },
  "totals": {
    "nudges": 4629,
    "hits": 1703,
    "misses": 15496,
    "savedTokens": 565400,
    "ledgersWithData": 6
  },
  "byLedger": {
    "rtk-savings-ledger": {
      "lines": 6894,
      "nudges": 0,

... [+1030 chars truncated]

### Assistant | 2026-06-22T12:35:27.737Z

The live output confirms `byLedger` includes `injection-dedup-cache` which is folded by `applyDedupCache` but the `_checkpoint` only contains the SOURCES ids (not `injection-dedup-cache`). That's fine — the dedup cache is re-read fully each time. Now let me examine the critical stale-checkpoint hazard: the prune hook behavior, and what happens when a ledger is pruned then regrown within one throttle window.

### Assistant | 2026-06-22T12:35:27.883Z

[tool_use: Read]

### User | 2026-06-22T12:35:28.829Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\stop-ledger-prune.mjs' was already read 78s ago in this session and is unchanged (mtime 1779642623773). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T12:35:32.738Z

[tool_use: Bash]

### User | 2026-06-22T12:35:36.556Z

[tool_result] 4: * stop-ledger-prune.mjs — Stop hook
9: * the size cap, drop the head and retain the tail. Runs on Stop; throttled
12: * Pure-function logic lives in scripts/lib/jsonl-tail-prune.mjs. This hook
16: *   - rtk-savings-ledger.jsonl
17: *   - prompt-rewrites.jsonl
27:import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from "node:fs";
29:import { pruneTail, DEFAULT_SIZE_CAP_BYTES,
... [+822 chars truncated]

### Assistant | 2026-06-22T12:35:41.122Z

The prune hook truncates `rtk-savings-ledger.jsonl` and `prompt-rewrites.jsonl` (drop head, retain tail). This is exactly the shrink case the incremental aggregator handles via `shrunk` re-baseline. Let me verify the shrink detection logic carefully against the prune behavior, and examine the critical race scenario.

Let me now check `jsonl-tail-prune` to confirm it produces a smaller file (so `size < cp.size` triggers re-baseline).

### Assistant | 2026-06-22T12:35:41.871Z

[tool_use: Bash]

### User | 2026-06-22T12:35:46.558Z

[tool_result] 7:// threshold, drop the head and retain the tail.
18: * whether to prune and return {pruned: bool, newText, droppedBytes, droppedLines, retainedBytes, retainedLines}.
21: * (so we never split a JSON line mid-record) and returns everything after it.
23:export function pruneTail(text, sizeCapBytes = DEFAULT_SIZE_CAP_BYTES, retainBytes = DEFAULT_RETAIN_BYTES) {
25:    return { pruned: false, newText
... [+893 chars truncated]

### Assistant | 2026-06-22T12:35:53.294Z

The prune drops the head and keeps the tail, so the file gets smaller — `size < cp.size` triggers the `shrunk` re-baseline. Good. Now the critical hazard analysis. Let me trace the prune-then-regrow-within-throttle scenario precisely.

Key facts:
- `stop-psn-savings-aggregate` is throttled 1/hour.
- `stop-ledger-prune` is also throttled (separate file `.ledger-prune-last.json`).
- The aggregator's checkpoint only updates when the aggregator actually runs (not throttled).

The dangerous scenario: prune fires (drops head of rtk-savings, shrinking it), then it regrows past the OLD `cp.size` before the aggregator next runs. Let me verify the detection covers this. The detection uses BOTH `shrunk` (size < cp.size) AND `rotated` (head prefix changed). Let me reason about a regrow that lands exactly at/above old size but with a different head.

### Assistant | 2026-06-22T12:35:55.204Z

[tool_use: Bash]

### User | 2026-06-22T12:35:59.765Z

[tool_result] 13:export const DEFAULT_SIZE_CAP_BYTES = 5 * 1024 * 1024; // 5 MB ceiling
14:export const DEFAULT_RETAIN_BYTES = 1 * 1024 * 1024;   // keep last 1 MB
23:export function pruneTail(text, sizeCapBytes = DEFAULT_SIZE_CAP_BYTES, retainBytes = DEFAULT_RETAIN_BYTES) {
24:  if (typeof text !== "string") {
27:  const len = text.length;
28:  if (len <= sizeCapBytes) {
---
13:export const DEFAULT_SIZE_CAP_BY
... [+114 chars truncated]

### Assistant | 2026-06-22T12:36:12.230Z

Now I have the key numbers. Prune drops a 5MB+ file down to ~1MB. For a regrow to defeat BOTH guards within one throttle window (1 hour), the file would have to regrow from ~1MB back past ~5MB+ AND the head prefix (first 128 bytes) would have to match the old head. After a prune the head is entirely new content (the tail that became the new head), so `head.startsWith(cp.head)` will be false — `rotated` fires. So even if size somehow exceeds old size, the front-rewrite guard catches it. This is robust. Let me now examine the more subtle hazards: the partial/hand-edited output, the fd path, and mutation.

Let me check the test file to understand validated invariants and look for any gap.

### Assistant | 2026-06-22T12:36:13.959Z

[tool_use: Bash]

### User | 2026-06-22T12:36:18.432Z

[tool_result] 30:test("aggregateSavings: empty input → zero totals", () => {
39:test("aggregateSavings: rtk-style hits + misses counted", () => {
52:test("aggregateSavings: multi-style nudges counted via nudge:true", () => {
63:test("aggregateSavings: multiple ledgers compose", () => {
73:test("aggregateSavings: malformed lines silent-skipped", () => {
80:test("aggregateSavings: injection-dedup cache counts as 
... [+4107 chars truncated]

### Assistant | 2026-06-22T12:36:22.151Z

Strong test coverage including the adversarial grow-with-front-rewrite case. Let me now run the tests to confirm they pass on the live code, then probe the specific hazards I want to confirm with the actual code behavior.

### Assistant | 2026-06-22T12:36:22.949Z

[tool_use: Bash]

### User | 2026-06-22T12:36:27.272Z

[tool_result]   ...
# Subtest: incrementalAggregate: missing/empty ledgers produce empty stats + zero offset
ok 26 - incrementalAggregate: missing/empty ledgers produce empty stats + zero offset
  ---
  duration_ms: 0.0784
  ...
1..26
# tests 26
# suites 0
# pass 26
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 15.6719

### Assistant | 2026-06-22T12:36:30.765Z

[tool_use: Bash]

### User | 2026-06-22T12:36:35.256Z

[tool_result]   ---
  duration_ms: 3.0875
  ...
1..9
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 96.7237

### Assistant | 2026-06-22T12:36:41.997Z

35/35 pass on live code. Now let me dig into the specific hazards the task flagged. 

**Hazard analysis #2 — stale/hand-edited/partial OUTPUT json:**

The hook reads `existing = readJsonSafe(OUTPUT) || {}`. If the OUTPUT is corrupt/partial, `readJsonSafe` returns null → `existing = {}` → `_checkpoint` is `{}`, `byLedger` is `{}` → `prevByLedger` empty → every ledger does a full re-baseline (cold start). That's safe (correct full parse, just costlier once).

But there's a subtler case: what if OUTPUT is VALID JSON but has a checkpoint whose `offset`/`size` are larger than the current file (hand-edited, or a stale checkpoint vs a freshly-truncated file that happens to land at same head)? Let me trace `size === prevOffset` vs `size < prevOffset` paths.

### Assistant | 2026-06-22T12:36:51.259Z

[tool_use: Bash]

### User | 2026-06-22T12:36:55.140Z

[tool_result] Exit code 1
node:internal/modules/esm/load:217
    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(parsed, schemes);
          ^

Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'h:'
    at throwIfUnsupportedURLScheme (node:internal/modules/esm/lo
... [+511 chars truncated]

### Assistant | 2026-06-22T12:36:58.900Z

Need a relative import. Let me write the probe into the repo's scripts dir with a relative import.

### Assistant | 2026-06-22T12:37:05.160Z

[tool_use: Bash]

### User | 2026-06-22T12:37:11.633Z

[tool_result] size= 62 poisoned offset=9999 (offset > size)
byLedger.nav= {"lines":2,"nudges":0,"hits":2,"misses":0,"savedTokens":20}  (full re-parse would be hits:2,saved:20)
checkpoint.nav= {"offset":9999,"size":62,"head":"{\"kind\":\"hit\",\"est_tokens\":10}\n{\"kind\":\"hit\",\"est_tokens\":10}\n"}
branch: size>prevOffset? false  size===prevOffset? false  => fell to UNCHANGED (carry prev)

### Assistant | 2026-06-22T12:37:26.261Z

This confirms an edge: when `offset > size` but `size >= cp.size` and head matches, it falls to the UNCHANGED branch and carries prior stats. In my probe the carried value happened to equal the full parse (because prev was consistent). The poisoned offset (9999) is preserved. This is a hand-edit-only scenario, not a natural one — the aggregator itself never writes offset > size. So it's not a regression of natural operation. The "size === prevOffset" being false means it doesn't even re-read; it carries `prev` which is consistent with the file in any natural run. Acceptable.

Now the more important real-world hazard: **a ledger that is appended to BETWEEN the statSize call and the readRange call by a live appender** (concurrency). And the `readRangeOf` short-read handling. Let me trace this carefully.

In `incrementalAggregate` delta path: `size = statSize(name)` is captured first. Then `readRange(name, prevOffset, size)`. If between these the file grew, the new bytes past `size` are simply not read (correct — they're picked up next run). If the file is mid-append (a partial line at the end within [prevOffset, size]), `sliceCompleteLines` defers it. Good. 

But what about `readRangeOf` returning a SHORT read (`r < len`)? It does `b.subarray(0, r)` — correct. Let me check: could `readSync` short-read in the middle and lose bytes? On a regular file readSync reads up to len or EOF; a single readSync may return fewer bytes than requested even on regular files in rare cases. The `subarray(0,r)` truncates to what was read, and `sliceCompleteLines` only consumes up to the last newline in that buffer, advancing offset accordingly. Next run picks up the rest. Safe — no data loss, no double count.

Let me verify the fd leak path and the `readHeadOf` when file vanishes between statSize and open.

### Assistant | 2026-06-22T12:37:32.923Z

[tool_use: Bash]

### User | 2026-06-22T12:37:36.685Z

[tool_result] statSizeOf(missing)= null
readHeadOf(missing)= ""
readRangeOf(missing) len= 0 isBuffer= true
zero-len range len= 0
inverted range len= 0

### Assistant | 2026-06-22T12:37:44.297Z

All fail-soft paths return safe empty values. The fd is closed in `finally` (covers throw path — no fd leak). 

**Hazard #4 — mutation of caller's inputs:** `incrementalAggregate` builds fresh `byLedger` and `newCheckpoint` objects. The only place it could leak a reference is the UNCHANGED branch: `byLedger[name] = prev;` — this assigns the SAME object reference from `prevByLedger[name]` into the new `byLedger`. And `applyDedupCache(byLedger, totals, ...)` then mutates `byLedger` only by ADDING `byLedger["injection-dedup-cache"]` — it does NOT mutate existing entries. And `foldStats` returns a fresh object. So `prev` objects are aliased but never mutated. Let me verify the aliasing doesn't corrupt the prior output object across runs (the hook re-reads OUTPUT fresh each run via `readJsonSafe`, so a new object graph each time — no persistent aliasing).

Let me confirm `applyDedupCache` never mutates a carried-over `prev` stats object.

### Assistant | 2026-06-22T12:37:55.366Z

[tool_use: Bash]

### User | 2026-06-22T12:38:00.889Z

[tool_result] r1.byLedger MUTATED by r2? no
r1.checkpoint MUTATED by r2? no
r2 dedup folded? {"lines":2,"nudges":0,"hits":2,"misses":0,"savedTokens":0}
r2 totals.hits= 3 (nav 1 + dedup 2 = 3 expected)
