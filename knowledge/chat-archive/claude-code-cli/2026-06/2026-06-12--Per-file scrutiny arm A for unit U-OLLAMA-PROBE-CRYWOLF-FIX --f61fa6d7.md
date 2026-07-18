---
type: "chat-session"
source: "claude-code-cli"
session_id: "f61fa6d7-ca17-4439-b131-ead206c9010a"
title: "Per-file scrutiny arm A for unit U-OLLAMA-PROBE-CRYWOLF-FIX (slot:zulu, main tre"
date: "2026-06-12"
first_ts: "2026-06-12T17:27:42.330Z"
last_ts: "2026-06-12T17:31:27.360Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 6
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/f61fa6d7-ca17-4439-b131-ead206c9010a/subagents/agent-a2a66e8a77ba5625b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Per-file scrutiny arm A for unit U-OLLAMA-PROBE-CRYWOLF-FIX (slot:zulu, main tre

> **claude-code-cli** | 2026-06-12 | 12 msgs (6 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f61fa6d7-ca17-4439-b131-ead206c9010a/subagents/agent-a2a66e8a77ba5625b.jsonl`

## Transcript

### User | 2026-06-12T17:27:42.330Z

Per-file scrutiny arm A for unit U-OLLAMA-PROBE-CRYWOLF-FIX (slot:zulu, main tree H:/prism). Read both files END-TO-END and the diff (`git -C H:/prism diff .claude/hooks/docker-service-health-stop.mjs .claude/hooks/docker-service-health-stop.test.mjs`).

The unit fixes two coupled cry-wolf defects in the Stop-hook Ollama liveness arm:
1. (papa-verified, [[reference_ollama_probe_crywolf_2026_06_12]]) OLLAMA_PROBE_TIMEOUT_MS 2500 -> `Number(process.env.PRISM_OLLAMA_PROBE_TIMEOUT_MS) || 8000` + corrected the empirically-false "<100ms even mid-generation" comment. Under fleet load /api/tags takes >2.5s while UP; a down daemon refuses instantly, so 8s distinguishes down-vs-busy.
2. (zulu, live-observed) The throttled path re-emitted a CACHED DOWN verdict un-probed for up to 5 min after recovery. New exported `resolveCachedOllamaProbe(cached, probeImpl)`: cached DOWN -> live re-probe + cache refresh; healthy/absent/unknown -> pass-through zero-cost. Wired into main()'s throttled branch.

Verify (P0/P1 with file:line, then PASS/FAIL):
- Knob edge cases: `PRISM_OLLAMA_PROBE_TIMEOUT_MS` unset/empty/garbage -> NaN||8000 = 8000 (confirm `Number("")` -> 0 -> ||8000 OK; `Number("abc")` -> NaN -> ||8000 OK; "0" -> 0 -> 8000, acceptable?).
- Throttled-path semantics: cached null vs cached-with-no-ollamaProbe vs reachable:undefined all skip the re-probe (no cry-wolf inversion); `writeCache(cacheFile, {...cached, ollamaProbe: probe})` — confirm spreading cached keeps the OLD ts (writeCache puts ts FIRST so the spread overrides) and that this is the intended semantics (docker summary is genuinely old; the 30-min freshness window must not be extended by an ollama-only refresh).
- Hook contract: always {continue:true}, never throws on the new path; the 4s settings timeout interaction — if the re-probe runs long (busy daemon) and the harness kills the hook, confirm no torn cache (writeCache is atomic tmp+rename and only runs AFTER the probe resolves).
- Tests: run `cd H:/prism && node -
... [+139 chars truncated]

### Assistant | 2026-06-12T17:27:51.516Z

[tool_use: Read]

### Assistant | 2026-06-12T17:27:52.009Z

[tool_use: Read]

### Assistant | 2026-06-12T17:27:53.213Z

[tool_use: Bash]

### User | 2026-06-12T17:27:53.806Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * docker-service-health-stop.mjs — Stop-hook arm of the Docker-service health
5	 * guard (scripts/docker-service-health-check.mjs).
6	 *
7	 * THE GAP. The local compute stack's named services (qdrant/postgres/
8	 * prometheus/grafana) can silently go DOWN — Qdrant alone did it 3× (2026-05-24,
9	 * -05-28, -06-08), each time degrading semantic vector sea
... [+13664 chars truncated]

### User | 2026-06-12T17:27:54.544Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Hermetic suite for docker-service-health-stop.mjs.
4	 * Tests the pure advisory builder + the always-{continue:true} hook contract
5	 * (the hook must NEVER block Stop, even with no Docker / a downed stack).
6	 */
7	import test from "node:test";
8	import assert from "node:assert/strict";
9	import { execFileSync } from "node:child_process";
10	import path from "node
... [+7590 chars truncated]

### User | 2026-06-12T17:27:59.740Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
.claude/hooks/docker-service-health-stop.mjs      | 38 +++++++++++++++++++----
 .claude/hooks/docker-service-health-stop.test.mjs | 37 +++++++++++++++++++++-
 2 files changed, 68 insertions(+), 7 deletions(-)

--- Changes ---

.claude/hooks/docker-service-health-stop.mjs
  @@ -38,13 +38,17 @@ const STOP_THROTTLE_MS = 5 * 6
... [+6859 chars truncated]

### Assistant | 2026-06-12T17:29:16.356Z

[tool_use: Bash]

### Assistant | 2026-06-12T17:29:17.355Z

[tool_use: Grep]

### User | 2026-06-12T17:29:25.027Z

[tool_result]   ...
# Subtest: resolveCachedOllamaProbe: healthy / absent / never-ran cache NEVER re-probes (zero-cost common path)
ok 13 - resolveCachedOllamaProbe: healthy / absent / never-ran cache NEVER re-probes (zero-cost common path)
  ---
  duration_ms: 0.0654
  ...
# Subtest: hook contract: piping a Stop event ALWAYS yields {continue:true} (never blocks)
ok 14 - hook contract: piping a Stop event ALWAY
... [+179 chars truncated]

### User | 2026-06-12T17:29:26.990Z

[tool_result] 798-          },
799-          {
800-            "type": "command",
801:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/docker-service-health-stop.mjs",
802-            "timeout": 4000
803-          },
804-          {

### Assistant | 2026-06-12T17:31:27.360Z

All verification items completed: both files read end-to-end, diff reviewed, tests run live, and the actual settings.json wiring confirmed. (Note: the PostToolUse "test_timeout" triage injection was a false positive — the suite passed 14/14 in 133ms; verified from the TAP summary directly.)

## Code Quality Analysis Report — U-OLLAMA-PROBE-CRYWOLF-FIX (arm A)

### Summary
- Files analyzed: 2 (`H:\prism\.claude\hooks\docker-service-health-stop.mjs`, `H:\prism\.claude\hooks\docker-service-health-stop.test.mjs`)
- Tests: **14/14 PASS** (ran `node --test`, 133ms, 0 fail/0 skip)
- Issues: 1 P1, 3 P2, 1 P3

### Requested verifications — all confirmed

**1. Knob edge cases (`.mjs:51`)** — `Number(undefined)` = NaN → `|| 8000` = 8000; `Number("")` = 0 (falsy) → 8000; `Number("abc")` = NaN → 8000; `"0"` → 0 → 8000. The `"0"` coercion is **acceptable and safe-direction**: a 0ms probe budget would be a guaranteed-abort cry-wolf machine, so falling to the default is correct. See P2-1 below for the values the truthiness check does NOT catch.

**2. Throttled-path semantics (`.mjs:202-207, 219-226`)** — Verified all pass-through cases at line 204: `cached === null` → `cached && cached.ollamaProbe` = null → returns `{probe: null, refreshed: false}`; cached-with-no-`ollamaProbe` → undefined pass-through; `reachable: undefined` → `!== false` → pass-through. Only `reachable === false` re-probes. No cry-wolf inversion; test 3 (`test.mjs:110-122`) pins all three with a call-counter at 0.

`writeCache({...cached, ollamaProbe: probe})` ts semantics confirmed: `writeCache` (`.mjs:98`) puts `ts: new Date().toISOString()` FIRST, then spreads — the cached row's OLD `ts` overrides the fresh one. This is the intended semantics (documented at `.mjs:216-218`): the docker summary genuinely is old, and the 30-min `CACHE_FRESH_MS` window is not extended by an ollama-only refresh. Operationally sound: the 5-min throttle stamp forces a cold tick well inside the 30-min window, so the preserved-old-ts r
... [+5843 chars truncated]
