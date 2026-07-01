---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "Review TWO files end-to-end for correctness, edge cases, and silent-failure risk"
date: "2026-06-09"
first_ts: "2026-06-09T20:53:33.873Z"
last_ts: "2026-06-09T20:57:07.196Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 12
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-ab54ce8586dc370c8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# Review TWO files end-to-end for correctness, edge cases, and silent-failure risk

> **claude-code-cli** | 2026-06-09 | 33 msgs (12 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-ab54ce8586dc370c8.jsonl`

## Transcript

### User | 2026-06-09T20:53:33.873Z

Review TWO files end-to-end for correctness, edge cases, and silent-failure risk. Grade PASS/FAIL and flag every P0/P1.

FILES (read both fully):
- H:/prism/scripts/lib/advisory-decay.mjs  (pure lib + stats reader)
- H:/prism/scripts/lib/advisory-decay.test.mjs  (node:test, 17 cases)

CONTEXT / CONTRACT this must satisfy:
- It is an "advisory-decay gate": for advisory hooks that emit additionalContext (a token cost), it decides whether the hook should FIRE (emit) or be MUTED, based on per-hook conversion telemetry in mcp-server/data/state/ollama-offload-stats.json `byHook[key] = {fired, suggested, offloaded?, kept?}`.
- THE METRIC (critical): conversion = taken/INJECTED = offloaded/suggested, NOT offloaded/fired. `suggested` is the count of advisories actually injected (the token tax); `fired` includes free silent passes. Verify the code uses `suggested` as the injection denominator and `offloaded` as taken.
- UNMEASURABLE guard: a hook whose byHook slot has NO `offloaded` key (e.g. grep-index-first = {fired,suggested}) must be classified `unmeasurable` and NEVER muted (muting on an absent signal is a false mute). Verify key-PRESENCE (hasOwnProperty), not truthiness, distinguishes "real 0" from "absent".
- Statuses: 'healthy' | 'noise' | 'insufficient' | 'unmeasurable'. Only `noise` (>= minInjections AND takeRate < maxTakeRate) mutes.
- SELF-REVIVAL: even when muted, an epsilon probe (injected % probeInterval === 0) must still FIRE so the sample stays alive and a recovered rate lifts the mute. Verify a permanent blind mute is impossible.
- FAIL-SAFE: disabled / no-stats / no-telemetry / unmeasurable / insufficient / healthy all -> fire:true. Only confirmed noise off the probe tick suppresses. Verify NOTHING can over-suppress on uncertainty.
- Knobs via env: PRISM_ADVISORY_DECAY_DISABLE / _MIN_INJ / _MAX_TAKE / _PROBE. Verify probeInterval is clamped >=1 (modulo-by-0 / never-probe lock).
- ASCII-only source (no em-dash; the repo uses `--`).

Specifically check:
1. Do
... [+874 chars truncated]

### Assistant | 2026-06-09T20:53:50.378Z

I'll review both files end-to-end. Let me read them fully.

### Assistant | 2026-06-09T20:53:51.085Z

[tool_use: Read]

### Assistant | 2026-06-09T20:53:51.109Z

[tool_use: Read]

### User | 2026-06-09T20:53:52.956Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\advisory-decay.mjs' was already read 8s ago in this session and is unchanged (mtime 1781038158509). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T20:53:53.098Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\advisory-decay.test.mjs' was already read 8s ago in this session and is unchanged (mtime 1781038344212). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-09T20:53:59.579Z

Both files are already in my context from the read-once guard. Let me analyze them thoroughly against the contract. Let me verify the live byHook snapshot the tests reference is real, since R9 compliance depends on it.

### Assistant | 2026-06-09T20:54:01.859Z

[tool_use: Bash]

### User | 2026-06-09T20:54:09.489Z

[tool_result] total byHook keys: 5
grep-index-first {"fired":838,"suggested":147}
tribal-by-domain-inject "ABSENT"
wiki-precheck-inject "ABSENT"
chat-bus-inject "ABSENT"

### Assistant | 2026-06-09T20:54:15.663Z

The live snapshot exists. `grep-index-first` is the real unmeasurable example (has `fired`+`suggested`, no `offloaded`). Let me see the full byHook to understand what reference values the tests can rely on.

### Assistant | 2026-06-09T20:54:16.676Z

[tool_use: Bash]

### User | 2026-06-09T20:54:25.053Z

[tool_result] ollama-task-offloader {"fired":220,"offloaded":12,"kept":186,"suggested":22,"tokensSaved":25211}
grep-index-first {"fired":839,"suggested":147}
ollama-route-pretooluse {"fired":2413,"offloaded":2,"kept":2398,"suggested":13,"tokensSaved":34500}
fleet-reaper-coordinator {"fired":99,"offloaded":0,"kept":0,"suggested":99,"tokensSaved":0}
ollama-nav-enforce {"fired":3,"offloaded":0,"kept":0,"suggested"
... [+19 chars truncated]

### Assistant | 2026-06-09T20:54:29.989Z

Now I have the live reference values. Let me re-read the two files carefully from my context. Let me re-examine specific lines by reading them again (the guard says they are in context, but I want to confirm exact line numbers for my findings). Let me grep for the key logic.

### Assistant | 2026-06-09T20:54:30.292Z

[tool_use: Bash]

### User | 2026-06-09T20:54:39.904Z

[tool_result]   ...
# Subtest: decayReport: empty/unreadable stats -> []
ok 16 - decayReport: empty/unreadable stats -> []
  ---
  duration_ms: 0.8888
  ...
# Subtest: DEFAULTS are the documented calibration (50 injections / 5% / probe 20)
ok 17 - DEFAULTS are the documented calibration (50 injections / 5% / probe 20)
  ---
  duration_ms: 0.1249
  ...
1..17
# tests 17
# suites 0
# pass 17
# fail 0
# cancelled 0
... [+42 chars truncated]

### Assistant | 2026-06-09T20:54:46.102Z

17/17 pass. Now let me read both files precisely to cite exact line numbers. The read-once guard blocks re-reading, so let me use Grep with line numbers to anchor my findings on the actual source.

### Assistant | 2026-06-09T20:54:47.325Z

[tool_use: Grep]

### User | 2026-06-09T20:54:48.241Z

[tool_result] 1:// scripts/lib/advisory-decay.mjs
2:// U-ADVISORY-DECAY (2026-06-09, slot:alpha): the missing ACTUATOR on advisory
3:// take-rate. mcp-route-takeup / ollama-offload-stats MEASURE per-hook conversion
4:// but nothing ACTS on it -- so a proven-zero-conversion advisory keeps spending
5:// context tokens on a nudge nobody takes. This gates that, fleet-wide.
6://
7:// THE METRIC (R8-corrected 2026-06
... [+8111 chars truncated]

### Assistant | 2026-06-09T20:54:54.100Z

Now let me read the test file precisely with line numbers.

### Assistant | 2026-06-09T20:54:55.386Z

[tool_use: Grep]

### User | 2026-06-09T20:54:58.058Z

[tool_result] 1:// scripts/lib/advisory-decay.test.mjs
2:// U-ADVISORY-DECAY (2026-06-09, slot:alpha): the decay gate must (1) measure
3:// conversion as taken/INJECTED not taken/fired, (2) NEVER mute a hook with no
4:// taken-signal (the false-mute trap), (3) protect real converters, (4) only mute
5:// confirmed noise, (5) keep an epsilon probe alive when muted, (6) fail-safe to
6:// FIRE on any uncertainty. F
... [+8450 chars truncated]

### Assistant | 2026-06-09T20:55:03.249Z

I now have both files fully anchored with line numbers. Let me work through every contract requirement and the 6 specific checks adversarially.

Let me verify the critical fail-safe direction concerns with targeted reasoning about edge inputs. First, a couple of adversarial probes I want to confirm against the actual code behavior.

### Assistant | 2026-06-09T20:55:23.974Z

[tool_use: Bash]

### User | 2026-06-09T20:55:36.589Z

[tool_result] ADV1 negative suggested: {"injected":-5,"taken":0,"takeRate":null,"hasTakenSignal":true,"status":"insufficient"}
ADV2 NaN suggested: {"injected":0,"taken":1,"takeRate":null,"hasTakenSignal":true,"status":"insufficient"}
ADV3 offloaded:null: {"injected":100,"taken":0,"takeRate":0,"hasTakenSignal":true,"status":"noise"}
ADV4 offloaded>suggested: {"injected":100,"taken":200,"takeRate":2,"hasTakenSign
... [+438 chars truncated]

### Assistant | 2026-06-09T20:55:42.429Z

Important findings confirmed. Let me probe the negative-injected case more closely since it touches the fail-safe direction, plus confirm the `injected` coercion edge (ADV1 shows `injected: -5` survives, which is a benign but real coercion quirk).

### Assistant | 2026-06-09T20:55:48.259Z

[tool_use: Bash]

### User | 2026-06-09T20:55:55.930Z

[tool_result] big 0-conv: noise

### Assistant | 2026-06-09T20:56:03.457Z

I have everything I need. Let me also confirm the documented DEFAULTS match the comment (50/5%/20) and the ASCII-only requirement, then close out the review task.

### Assistant | 2026-06-09T20:56:05.848Z

[tool_use: Bash]

### User | 2026-06-09T20:56:10.851Z

[tool_result] scripts/lib/advisory-decay.mjs non-ASCII: none
scripts/lib/advisory-decay.test.mjs non-ASCII: none

### Assistant | 2026-06-09T20:56:19.331Z

[tool_use: TaskUpdate]

### User | 2026-06-09T20:56:19.895Z

[tool_result] Updated task #32 status

### Assistant | 2026-06-09T20:57:07.196Z

Both files reviewed end-to-end against the contract, with adversarial edge-probes run live against the actual code. The suite passes 17/17 and the source is ASCII-clean.

## Code Quality Analysis Report

### Verdict: PASS

`advisory-decay.mjs` is correct on every load-bearing safety property. The metric is right (taken/INJECTED), the unmeasurable guard uses key-presence not truthiness, the fail-safe direction is sound (nothing over-suppresses on uncertainty), self-revival is provably unmistakable, and the probe interval is clamped. Tests assert real live reference values and would break under a metric regression. Findings below are all P2 (one is a minor R9-fidelity nit on a test fixture). No P0/P1.

---

### Contract verification (all satisfied)

**1. classify() take-rate / no divide-by-zero** — Correct. `advisory-decay.mjs:87` `injected = Number(s.suggested) || 0`; `:99` the insufficient branch guards `injected > 0 ? taken/injected : null` so injected=0 yields `takeRate:null`, never `0/0=NaN`. The noise branch at `:101` is only reached after `injected >= minInjections` (≥50 > 0), so `taken/injected` there can never divide by zero. Verified live: `classify({offloaded:0,suggested:0})` → no NaN.

**2. Boundaries** — Both correct and conservative:
- takeRate exactly == maxTakeRate → `:107` `takeRate < maxTakeRate` is strict `<`, so 5/100=0.05 → `healthy` (fires). Test `:60-64` locks this (5/100 healthy, 4/100 noise).
- injected exactly == minInjections → `:98` `injected < minInjections` is strict `<`, so 50 injections is "enough" → judged. Test `:66-68` locks it (50→noise, 49→insufficient).

**3. Can decayDecision return fire:false on anything but confirmed-noise-off-probe?** — No. Proven by exhaustion of every return:
- `:138` disabled → `fire:true`
- `:143` no-stats → `fire:true`
- `:147` no-telemetry → `fire:true`
- `:152` healthy/insufficient/unmeasurable (`c.status !== "noise"`) → `fire:true`
- `:157` noise → `fire: probe`, the ONLY path that can be false, and on
... [+5233 chars truncated]
