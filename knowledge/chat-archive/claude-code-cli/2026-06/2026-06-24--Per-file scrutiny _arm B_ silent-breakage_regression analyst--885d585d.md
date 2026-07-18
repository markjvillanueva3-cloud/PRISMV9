---
type: "chat-session"
source: "claude-code-cli"
session_id: "885d585d-959c-404a-8eef-a5542d5006dd"
title: "Per-file scrutiny (arm B, silent-breakage/regression analyst) of an uncommitted "
date: "2026-06-24"
first_ts: "2026-06-24T20:39:42.580Z"
last_ts: "2026-06-24T20:44:12.773Z"
cwd: "H:\\prism"
messages: 62
user_msgs: 21
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-a9dfa5118170fa268.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Per-file scrutiny (arm B, silent-breakage/regression analyst) of an uncommitted 

> **claude-code-cli** | 2026-06-24 | 62 msgs (21 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-a9dfa5118170fa268.jsonl`

## Transcript

### User | 2026-06-24T20:39:42.580Z

Per-file scrutiny (arm B, silent-breakage/regression analyst) of an uncommitted change to a LIVE gate on branch cad-fusion-live-ms0 (slot:alpha). Do NOT assume arm A caught everything. Read-only. Grade PASS/FAIL with file:line.

The change: `scripts/lib/advisory-decay.mjs` `decayDecision` now, in its noise branch, calls `crossBucketTakeRate(stats, hookKey)` and FIRES (un-mutes) if the cross-bucket take-rate is `measured` AND `>= opts.maxTakeRate` (status "healthy-xbucket"); else mutes as before with an additive `crossBucketTakeRate` field. `decayDecision` is wired into 4 live PreToolUse advisory hooks. See `git -C H:/prism diff -- scripts/lib/advisory-decay.mjs scripts/lib/advisory-decay.test.mjs`.

Weight toward silent breakage / regression:
1. REGRESSION: do the 18 ORIGINAL decayDecision/classify/decayReport tests still pass unchanged? (The change must not alter any non-mapped or own-bucket-healthy verdict.) Run `node scripts/lib/advisory-decay.test.mjs` and confirm 31/31.
2. PERF/SAFETY in a hot PreToolUse path: crossBucketTakeRate now runs on every noise-classified decayDecision call. Is it pure, bounded, non-throwing? Any added I/O? (It reads only the already-loaded `stats` object -- confirm no extra file read.)
3. EDGE: what if `stats.byHook[hookKey]` is the conversion bucket of ANOTHER advisory, or a hook is both an advisory AND an execution bucket? Any double-counting or self-reference hazard in CONVERSION_BUCKET_MAP?
4. The new status string "healthy-xbucket" -- does any consumer switch/branch on exact status values (decayReport rank map, the report CLI icon map) and silently mishandle the new value? Check advisory-decay-report.mjs `icon[r.status]` + the rank map.
5. Could `opts.maxTakeRate` ever be NaN/undefined such that `>= maxTakeRate` misbehaves? (resolveOpts guards it -- confirm.)
6. Any way the override masks a genuinely-noisy advisory that SHOULD be muted (over-firing leak)? Weigh against the lib's fail-safe-to-fire design.

Report P0/P1 first. End 
... [+37 chars truncated]

### Assistant | 2026-06-24T20:39:45.921Z

I'll analyze this change to the live advisory-decay gate. Let me start by reading the diff and the relevant files.

### Assistant | 2026-06-24T20:39:46.673Z

[tool_use: Bash]

### User | 2026-06-24T20:39:47.960Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-24T20:39:50.893Z

Let me read the actual files directly instead.

### Assistant | 2026-06-24T20:39:50.895Z

[tool_use: Read]

### User | 2026-06-24T20:40:02.751Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\advisory-decay.mjs' was already read 17s ago in this session and is unchanged (mtime 1782333503569). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-24T20:40:05.637Z

The harness indicates these were already read in session. Let me get the actual diff to see precisely what changed, using a focused approach.

### Assistant | 2026-06-24T20:40:06.535Z

[tool_use: Bash]

### User | 2026-06-24T20:40:14.242Z

[tool_result]  scripts/lib/advisory-decay.mjs      | 15 ++++++++++++-
 scripts/lib/advisory-decay.test.mjs | 42 +++++++++++++++++++++++++++++++++++++
 2 files changed, 56 insertions(+), 1 deletion(-)

### Assistant | 2026-06-24T20:40:17.188Z

The read-once-guard says content is in context, but I want to verify the exact current state. Let me read the file fresh with the cache disabled to be sure I'm reviewing the actual on-disk code.

### Assistant | 2026-06-24T20:40:17.882Z

[tool_use: Bash]

### User | 2026-06-24T20:40:23.438Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
scripts/lib/advisory-decay.mjs | 15 ++++++++++++++-
 1 file changed, 14 insertions(+), 1 deletion(-)

--- Changes ---

scripts/lib/advisory-decay.mjs
  @@ -202,7 +202,19 @@ export function decayDecision(hookKey, {
  -  // confirmed noise -> mute, but keep an epsilon probe alive for self-revival
  +  // confirmed noise by t
... [+1321 chars truncated]

### Assistant | 2026-06-24T20:40:26.418Z

Now let me read the full advisory-decay.mjs to understand `crossBucketTakeRate`, `CONVERSION_BUCKET_MAP`, `resolveOpts`, and the early-return logic.

### Assistant | 2026-06-24T20:40:26.606Z

[tool_use: Read]

### User | 2026-06-24T20:40:27.624Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\advisory-decay.mjs' was already read 43s ago in this session and is unchanged (mtime 1782333503569). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-24T20:40:32.864Z

The guard insists the file is already in my context, but I need to actually see it since this is the start of my analysis. Let me use Grep to extract the key functions.

### Assistant | 2026-06-24T20:40:33.462Z

[tool_use: Bash]

### User | 2026-06-24T20:40:37.755Z

[tool_result] // scripts/lib/advisory-decay.mjs
// U-ADVISORY-DECAY (2026-06-09, slot:alpha): the missing ACTUATOR on advisory
// take-rate. mcp-route-takeup / ollama-offload-stats MEASURE per-hook conversion
// but nothing ACTS on it -- so a proven-zero-conversion advisory keeps spending
// context tokens on a nudge nobody takes. This gates that, fleet-wide.
//
// THE METRIC (R8-corrected 2026-06-09 -- a fabri
... [+12677 chars truncated]

### Assistant | 2026-06-24T20:40:40.762Z

Now I have the full source. Let me run the test suite to confirm the regression claim (31/31), and examine the consumers of the status field.

### Assistant | 2026-06-24T20:40:41.299Z

[tool_use: Bash]

### User | 2026-06-24T20:40:46.521Z

[tool_result]   ...
# Subtest: decayDecision: the override is FAIL-SAFE -- only lifts a mute, never adds one (own-healthy stays healthy)
ok 30 - decayDecision: the override is FAIL-SAFE -- only lifts a mute, never adds one (own-healthy stays healthy)
  ---
  duration_ms: 0.1138
  ...
# Subtest: DEFAULTS are the documented calibration (50 injections / 5% / probe 20)
ok 31 - DEFAULTS are the documented calibratio
... [+171 chars truncated]

### Assistant | 2026-06-24T20:40:48.964Z

31/31 pass. Now let me find all consumers of `decayDecision`, `decayReport`, and the status field to check for the new `"healthy-xbucket"` status handling.

### Assistant | 2026-06-24T20:40:49.848Z

[tool_use: Grep]

### User | 2026-06-24T20:40:57.396Z

[tool_result] Found 76 files
state\shared\dashboards\injection-dedup-cache.json
mcp-server\data\state\session-file-ownership.json
state\HANDOFF.md
scripts\lib\advisory-decay.test.mjs
scripts\lib\advisory-decay.mjs
knowledge\memories\reference\reference_zulu_substrate_synergy_audit_2026_06_24.md
knowledge\memories\reference\reference_synergy_roi_verified_2026_06_14.md
knowledge\memories\reference\reference_skill
... [+4520 chars truncated]

### Assistant | 2026-06-24T20:41:01.345Z

The 4 live PreToolUse hooks are: `wiki-read-offload-advisory.mjs`, `large-read-digest-advisory.mjs`, `ollama-nav-enforce-inject.mjs`, `nav-rerank-advisory.mjs`. Let me check how each consumes `decayDecision`'s return — specifically whether any branch on the exact `status` string. Also let me check the report CLI's `icon[r.status]` and rank map.

### Assistant | 2026-06-24T20:41:03.317Z

[tool_use: Bash]

### User | 2026-06-24T20:41:08.474Z

[tool_result] .claude/hooks/large-read-digest-advisory.mjs:36:import { decayDecision } from "../../scripts/lib/advisory-decay.mjs"; // U-LARGE-READ-DECAY-WIRE: mute proven-noise advisories (R15 clone of ollama-route-pretooluse)
.claude/hooks/large-read-digest-advisory.mjs:100:    h.fired = (h.fired | 0) + 1;
.claude/hooks/large-read-digest-advisory.mjs:159:    if (verbose) process.stderr.write(`large-read-diges
... [+2693 chars truncated]

### Assistant | 2026-06-24T20:41:13.924Z

All 4 hooks consume `decayDecision` identically: they branch only on `!decay.fire` (the boolean), and use `decay.status`/`decay.reason`/`decay.takeRate` only in verbose stderr string interpolation. None switch on the exact status string. The new `"healthy-xbucket"` status always comes with `fire:true`, so these consumers see `decay.fire === true` and behave exactly as the `"healthy"` path — no silent break. 

Now let me check the report CLI for the `icon[r.status]` map and rank map.

### Assistant | 2026-06-24T20:41:13.984Z

[tool_use: Read]

### User | 2026-06-24T20:41:18.305Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/advisory-decay-report.mjs
3	// U-ADVISORY-DECAY (2026-06-09, slot:alpha): observability for the advisory-decay
4	// gate. Prints, per advisory hook, the CORRECT conversion metric (taken/INJECTED,
5	// not taken/fired) and the decay classification:
6	//   noise        -- >= 50 injections at < 5% conversion. MUTED *only if the hook
7	//                   self-gates
... [+3890 chars truncated]

### Assistant | 2026-06-24T20:41:25.117Z

Important finding here. The report CLI (`advisory-decay-report.mjs`) consumes `decayReport()`, NOT `decayDecision()`. The `"healthy-xbucket"` status is **only ever produced by `decayDecision`** — `decayReport` still emits the original 4 statuses (`noise`/`unmeasurable`/`insufficient`/`healthy`) from `classify()`. So:
- `icon[r.status]` map at line 39 — never sees `"healthy-xbucket"` (only `decayReport` rows feed it). No silent mishandling.
- The rank map in `decayReport` (`{ noise:0, unmeasurable:1, insufficient:2, healthy:3 }`) — also never sees `"healthy-xbucket"`. No `undefined` sort hazard introduced by this change.

So the new status string is confined to `decayDecision`'s return, which the 4 hooks only read via the `.fire` boolean. Let me verify there is no OTHER consumer of `decayDecision` that switches on status (e.g. tests or a dashboard), and check the `route-suggest-decay` sibling which appeared in the grep.

### Assistant | 2026-06-24T20:41:27.842Z

[tool_use: Bash]

### User | 2026-06-24T20:41:33.777Z

[tool_result] ---grep done---

### Assistant | 2026-06-24T20:41:39.133Z

No consumer switches on the status string. Now let me address the remaining points: the CONVERSION_BUCKET_MAP self-reference/double-counting hazard (point 3), the maxTakeRate NaN guard (point 5), and verify the conversion buckets named in the map are not themselves advisory hooks that self-gate (the self-reference hazard). Let me check what `ollama-file-digest`, `ollama-nav-rerank`, `ollama-prism-bridge` are and whether any of them is a `HOOK_KEY` that calls `decayDecision`.

### Assistant | 2026-06-24T20:41:41.454Z

[tool_use: Bash]

### User | 2026-06-24T20:41:48.136Z

[tool_result] [rtk] WARNING: untrusted project filters (.rtk/filters.toml)
[rtk] Filters NOT applied. Run `rtk trust` to review and enable.
.claude/hooks/large-read-digest-advisory.mjs:39:export const HOOK_KEY = "large-read-digest-advisory";
.claude/hooks/nav-rerank-advisory.mjs:39:export const HOOK_KEY = "nav-rerank-advisory";
.claude/hooks/ollama-nav-enforce-inject.mjs:51:export const HOOK_KEY = "ollama-nav-e
... [+187 chars truncated]

### Assistant | 2026-06-24T20:41:53.531Z

Critical mismatch surfaced. Let me look carefully:

- `ollama-nav-enforce-inject.mjs` has `HOOK_KEY = "ollama-nav-enforce"` (NOT `"ollama-nav-enforce-inject"`).
- But `CONVERSION_BUCKET_MAP` key is `"ollama-nav-enforce-inject"`.

This means the map key for the nav-enforce hook **does not match the actual HOOK_KEY** that hook passes to `decayDecision`. Let me verify the exact HOOK_KEY each hook passes and reconcile against the map keys. The map keys are:
- `"large-read-digest-advisory"` → matches HOOK_KEY `"large-read-digest-advisory"` ✓
- `"nav-rerank-advisory"` → matches HOOK_KEY `"nav-rerank-advisory"` ✓
- `"ollama-nav-enforce-inject"` → HOOK_KEY is `"ollama-nav-enforce"` ✗ MISMATCH

Let me confirm by reading the exact decayDecision call sites and HOOK_KEY definitions in the nav-enforce hook.

### Assistant | 2026-06-24T20:41:54.398Z

[tool_use: Read]

### User | 2026-06-24T20:41:55.611Z

[tool_result] 45	
46	import { atomicOffloadStatsRMW, ensureOffloadBucket } from "../../scripts/lib/offload-stats-bump.mjs";
47	import { fileURLToPath } from "node:url";
48	import { seenThisSession, markSeenThisSession } from "../../scripts/lib/session-once-gate.mjs";
49	import { decayDecision } from "../../scripts/lib/advisory-decay.mjs";
50	
51	export const HOOK_KEY = "ollama-nav-enforce";
52	export const STAT
... [+523 chars truncated]

### Assistant | 2026-06-24T20:42:03.976Z

Confirmed: `ollama-nav-enforce-inject.mjs:51` has `HOOK_KEY = "ollama-nav-enforce"`, but `CONVERSION_BUCKET_MAP` keys it as `"ollama-nav-enforce-inject"`. This is a key mismatch. Let me trace the consequence precisely. The hook calls `decayDecision("ollama-nav-enforce", ...)`. Inside, `crossBucketTakeRate(stats, "ollama-nav-enforce")` looks up `map["ollama-nav-enforce"]` → `undefined` (because the map key is `"ollama-nav-enforce-inject"`). So `conversionKey = null` → returns `status: "unmeasured"` → the override never fires for this hook → it falls through to mute-as-before.

This is NOT a silent break of existing behavior (it's fail-safe: the override is simply dead for nav-enforce), but it IS a latent defect: the cross-bucket un-mute the unit intends to provide will **never** apply to `ollama-nav-enforce`, even when its driven `ollama-prism-bridge` bucket genuinely converts. Let me verify whether the `ollama-nav-enforce` bucket is even at risk of being muted (i.e., is it classified noise?), and confirm the live stats to ground the severity. Let me also confirm there's no second key written under `"ollama-nav-enforce-inject"`.

### Assistant | 2026-06-24T20:42:07.503Z

[tool_use: Bash]

### User | 2026-06-24T20:42:13.262Z

[tool_result] ollama-nav-enforce "<<MISSING>>"
ollama-nav-enforce-inject "<<MISSING>>"
ollama-prism-bridge "<<MISSING>>"
large-read-digest-advisory {"fired":120,"offloaded":0,"kept":0,"suggested":120,"tokensSaved":0}
ollama-file-digest {"fired":1,"offloaded":1,"kept":0,"suggested":0,"tokensSaved":2343}
nav-rerank-advisory "<<MISSING>>"
ollama-nav-rerank "<<MISSING>>"
wiki-read-offload-advisory "<<MISSING>>"

### Assistant | 2026-06-24T20:42:23.725Z

This is very informative. Let me analyze the live data against the override logic:

1. **`ollama-nav-enforce` bucket is MISSING** → `decayDecision` returns early at the `if (!stat)` guard (`no-telemetry` → fire). So the key-mismatch is currently dormant (the hook never even reaches the noise branch today). But it's a latent correctness bug: once that bucket accumulates noise telemetry, the cross-bucket override will silently never apply due to the key mismatch.

2. **`large-read-digest-advisory`**: `suggested:120, offloaded:0` → own-bucket take-rate 0/120 = 0% < 5% AND injected 120 ≥ 50 → classified **noise**. The override then runs `crossBucketTakeRate(stats, "large-read-digest-advisory")` → map → `"ollama-file-digest"` → `convStat = {fired:1, offloaded:1, suggested:0}`. `hasConv` = true (offloaded:1 is finite). `injected` = advStat.suggested = 120 > 0. So `status:"measured"`, `takeRate = 1/120 = 0.0083` (0.83%) < 0.05 → override does NOT fire → mutes as before. Correct, no behavior change. Good — this is the live-validated case.

Let me verify the override math on `large-read-digest-advisory` is exactly what the code does, and double check the `injected <= 0` edge in crossBucketTakeRate plus check whether `ollama-file-digest.offloaded` could ever exceed the advisory's suggested (takeRate > 1) producing a spurious un-mute.

### Assistant | 2026-06-24T20:42:32.020Z

[tool_use: Bash]

### User | 2026-06-24T20:42:36.575Z

[tool_result] large-read-digest LIVE decision: {"fire":true,"muted":true,"probe":true,"status":"noise","takeRate":0,"crossBucketTakeRate":0.008333333333333333,"reason":"noise-probe-fire"}
xbucket: {"injected":120,"taken":1,"takeRate":0.008333333333333333,"conversionKey":"ollama-file-digest","status":"measured"}
nav-enforce w/ converting bridge (EXPECT healthy-xbucket if map worked): {"fire":true,"muted":true,"p
... [+370 chars truncated]

### Assistant | 2026-06-24T20:42:47.633Z

The key-mismatch is now empirically proven:

- With a converting bridge bucket (`ollama-prism-bridge` at 100% conversion), `decayDecision("ollama-nav-enforce", ...)` returns `muted:true` (`crossBucketTakeRate:null`) — the override is **dead** for this hook because `map["ollama-nav-enforce"]` is undefined.
- The same data **under the map's key** `"ollama-nav-enforce-inject"` correctly resolves to `takeRate:0.25` `measured` — proving the map ENTRY is functionally correct but the KEY does not match the live HOOK_KEY the hook passes.

So `ollama-nav-enforce` will get the override *never*, even when its driven execution bucket genuinely converts. This is a P1: the unit's core purpose (cross-bucket un-mute) is silently non-functional for one of its three mapped hooks. It is fail-safe in direction (it only fails to *un-mute*, never wrongly un-mutes), but it defeats the feature for that hook and is a silent correctness defect (no test catches the mismatch because the tests use synthetic keys that match).

Now let me address the remaining points and the takeRate>1 / self-reference concerns. Let me confirm the other two map keys (`nav-rerank-advisory`, `large-read-digest-advisory`) DO match their HOOK_KEYs (they do from the grep above), and check whether any conversion bucket is itself a gated advisory (self-reference / double-mute). The conversion buckets are `ollama-file-digest`, `ollama-nav-rerank`, `ollama-prism-bridge` — none of these is a HOOK_KEY in the 4 gated hooks (those are `large-read-digest-advisory`, `nav-rerank-advisory`, `ollama-nav-enforce`, `wiki-read-offload-advisory`). So no conversion bucket self-gates → no self-reference / double-count hazard. Let me confirm `ollama-file-digest` / `ollama-nav-rerank` are execution scripts not gated hooks.

### Assistant | 2026-06-24T20:42:50.392Z

[tool_use: Bash]

### User | 2026-06-24T20:42:55.504Z

[tool_result] .claude/hooks/grep-index-first.mjs
.claude/hooks/large-read-digest-advisory.mjs
.claude/hooks/nav-rerank-advisory.mjs
.claude/hooks/nav-rerank-advisory.test.mjs
.claude/hooks/ollama-nav-enforce-inject.mjs
.claude/hooks/ollama-route-pretooluse.mjs
.claude/hooks/wiki-read-offload-advisory.mjs
scripts/advisory-decay-report.mjs
scripts/lib/advisory-decay.mjs
scripts/lib/advisory-decay.test.mjs
=== are
... [+112 chars truncated]

### Assistant | 2026-06-24T20:42:59.753Z

There are TWO additional `decayDecision` callers I hadn't accounted for: `grep-index-first.mjs` and `ollama-route-pretooluse.mjs`. The user's prompt said "wired into 4 live PreToolUse advisory hooks" but there are 6 callers total. Let me verify these two also only branch on `.fire` and don't switch on the new status, and confirm their HOOK_KEYs are NOT in the conversion bucket map (no self-reference). None of the conversion buckets self-gate (confirmed empty above). Let me check the two extra callers.

### Assistant | 2026-06-24T20:43:01.381Z

[tool_use: Bash]

### User | 2026-06-24T20:43:05.848Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
6 matches in 2 files:

.claude/hooks/grep-index-first.mjs:30:import { decayDecision } from '../../scripts/lib/advisory-decay.mjs'; // U-GR...
.claude/hooks/grep-index-first.mjs:539:const decay = decayDecision('grep-index-first'
... [+401 chars truncated]

### Assistant | 2026-06-24T20:43:17.142Z

Both extra callers (`grep-index-first` HOOK_KEY `'grep-index-first'`, `ollama-route-pretooluse` HOOK_KEY `"ollama-route-pretooluse"`) also branch only on `!decay.fire`. Neither HOOK_KEY is in `CONVERSION_BUCKET_MAP`, so `crossBucketTakeRate` returns `unmeasured` for them → no behavior change. All 6 consumers are confirmed `.fire`-boolean-only. The new `"healthy-xbucket"` status and `crossBucketTakeRate` field are additive and ignored by every consumer.

Now let me verify the remaining points quickly:
- **Point 5 (maxTakeRate NaN)**: `resolveOpts` uses `num(v,d)` which returns the default `0.05` if `Number(v)` is not finite. So `opts.maxTakeRate` is always a finite number; `x.takeRate >= opts.maxTakeRate` is safe. The override also gates on `x.status === "measured"` first, which guarantees `x.takeRate` is a finite number (computed `taken/injected` with `injected > 0`). No NaN comparison hazard. Confirmed in source.
- **Point 6 (over-firing leak)**: The override only fires when `x.status === "measured"` (real `offloaded` in the conversion bucket, real `suggested > 0` in the advisory bucket) AND `takeRate >= maxTakeRate`. It cannot fire on absent/junk signal. The takeRate could theoretically exceed 1 if `conversionBucket.offloaded > advisoryBucket.suggested` (cross-bucket counters not guaranteed coupled), which would un-mute — but un-muting toward MORE output is the lib's documented fail-safe direction, not a regression. Acceptable.

Let me do a final check: confirm the new test cases actually exercise the override paths (so the 13 new asserts aren't stubs), and confirm the FAIL-SAFE test (test 30) genuinely proves own-healthy stays healthy.

### Assistant | 2026-06-24T20:43:18.483Z

[tool_use: Bash]

### User | 2026-06-24T20:43:24.098Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
118 matches in 22 files:

170:0:() => "not json" }), []);
183:0:reads the TRUE conversion from the mapped execution bucket, not the advisory'...
197:0:a hook with NO map entry -> unmeasured (never a manufactured number)", () =>
... [+2205 chars truncated]

### Assistant | 2026-06-24T20:43:32.401Z

The new tests are real R9-grade asserts: line 253 tests own-noise + cross ≥ bar → un-mutes (`healthy-xbucket`), line 264 tests own-noise + cross below bar → still muted, line 271 tests mapped-but-absent-conversion-bucket → still muted, plus crossBucketTakeRate edge tests (no-map→unmeasured, junk offloaded→unmeasured, 0-injected→no divide-by-zero, garbage stats→never throws). The override paths are genuinely exercised.

However, the tests use synthetic keys that happen to MATCH the map entries (`"nav-rerank-advisory"`, `"large-read-digest-advisory"`) — so no test validates that the LIVE HOOK_KEY each hook passes actually equals its map key. That's exactly why the `ollama-nav-enforce` vs `ollama-nav-enforce-inject` mismatch slipped through. This is the integration-coupling gap (dispatcher key drifted from map key).

I have everything I need. Let me confirm the live state of the nav-enforce hook one more time — whether the bucket name written by its own bump is `ollama-nav-enforce` (HOOK_KEY) to be certain the map should be keyed to the HOOK_KEY, not the filename.

### Assistant | 2026-06-24T20:43:34.892Z

[tool_use: Bash]

### User | 2026-06-24T20:43:39.206Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
/usr/bin/grep: Unmatched [, [^, [:, [., or [=
0 matches for 'ensureOffloadBucket\|atomicOffloadStatsRMW\|byHook\[\|HOOK_KEY\|\.suggested\|bump\|offloadBucket'

### Assistant | 2026-06-24T20:43:43.154Z

The bracket broke the regex. Let me use the Grep tool instead.

### Assistant | 2026-06-24T20:43:44.510Z

[tool_use: Grep]

### User | 2026-06-24T20:43:45.979Z

[tool_result] 30:// tracked under offload-stats byHook["ollama-nav-enforce"].suggested so the
46:import { atomicOffloadStatsRMW, ensureOffloadBucket } from "../../scripts/lib/offload-stats-bump.mjs";
51:export const HOOK_KEY = "ollama-nav-enforce";
162:// ---- side-effect: bump offload-stats byHook.<key>.suggested (atomic) ----
167:  atomicOffloadStatsRMW(STATS_PATH, (j) => {
168:    const h = ensureOffloadBuck
... [+215 chars truncated]

### Assistant | 2026-06-24T20:44:12.773Z

Definitively confirmed. Line 30 of the hook itself documents: telemetry is "tracked under offload-stats byHook[\"ollama-nav-enforce\"].suggested", and line 168 bumps `ensureOffloadBucket(j, HOOK_KEY)` where `HOOK_KEY = "ollama-nav-enforce"`. So the advisory's `suggested` count lands under bucket key `"ollama-nav-enforce"`.

But `CONVERSION_BUCKET_MAP` is keyed `"ollama-nav-enforce-inject"` (the filename, not the HOOK_KEY). Therefore `crossBucketTakeRate(stats, "ollama-nav-enforce")` does a `map["ollama-nav-enforce"]` lookup → `undefined` → the cross-bucket override is permanently dead for this hook. The map entry's value (`"ollama-prism-bridge"`) is correct; only the KEY is wrong — it must be `"ollama-nav-enforce"` to match the live HOOK_KEY/bucket name.

I have completed the analysis. Summary of findings.

---

VERDICT: FAIL

summary: The change is fail-safe in DIRECTION — every one of the 6 `decayDecision` consumers (the 4 named hooks plus `grep-index-first` and `ollama-route-pretooluse`) branches only on the `.fire` boolean and uses `.status`/`.takeRate`/`.reason` only in verbose stderr strings, so the new `"healthy-xbucket"` status and additive `crossBucketTakeRate` field cannot silently break any consumer; `crossBucketTakeRate` is pure, bounded, non-throwing, and reads only the already-loaded `stats` object (no extra I/O); 31/31 tests pass including the 18 originals unchanged. BUT one of the three `CONVERSION_BUCKET_MAP` keys is wrong, so the override — the entire point of this unit — is permanently non-functional for `ollama-nav-enforce`, and no test catches it because the tests use synthetic keys that already match the map.

findings:
- [P1] `scripts/lib/advisory-decay.mjs:160` (`CONVERSION_BUCKET_MAP`) -- map key `"ollama-nav-enforce-inject"` does NOT match the live HOOK_KEY/bucket name `"ollama-nav-enforce"` that `.claude/hooks/ollama-nav-enforce-inject.mjs:51` passes to `decayDecision` and bumps telemetry under (hook line 30 + 168 confirm bucket `"ollama-n
... [+2969 chars truncated]
