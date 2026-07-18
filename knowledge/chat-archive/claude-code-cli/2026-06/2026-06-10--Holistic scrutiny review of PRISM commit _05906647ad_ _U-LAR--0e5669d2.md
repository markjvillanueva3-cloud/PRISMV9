---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Holistic scrutiny review of PRISM commit `05906647ad` (U-LARGE-READ-DECAY-WIRE) "
date: "2026-06-10"
first_ts: "2026-06-10T16:42:23.439Z"
last_ts: "2026-06-10T16:45:30.184Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 12
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a6bfb0fa04581593a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Holistic scrutiny review of PRISM commit `05906647ad` (U-LARGE-READ-DECAY-WIRE) 

> **claude-code-cli** | 2026-06-10 | 34 msgs (12 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a6bfb0fa04581593a.jsonl`

## Transcript

### User | 2026-06-10T16:42:23.439Z

Holistic scrutiny review of PRISM commit `05906647ad` (U-LARGE-READ-DECAY-WIRE) on branch cad-fusion-live-ms0. Read these two files end-to-end:
- `H:/prism/.claude/hooks/large-read-digest-advisory.mjs`
- `H:/prism/.claude/hooks/large-read-digest-advisory.test.mjs`

The change wires `decayDecision` (from `scripts/lib/advisory-decay.mjs`) into the hook's `main()`: after `bumpStats()`, it calls `decayDecision(HOOK_KEY, {statsPath: STATS_PATH})` and if `!decay.fire` suppresses the advisory (emits `{continue:true}` with no additionalContext). This mutes a proven-noise offload advisory (live: 122 suggested / 0 offloaded). STATS_PATH was made env-overridable (`PRISM_LARGE_READ_DIGEST_STATS_PATH`) so bump-path == decay-read-path and the test can point both at a fixture. 3 new subprocess tests (muted / insufficient-fires-failsafe / probe-fires).

Verify: (1) the gate is placed after bumpStats + before emit; (2) it fails SAFE — decayDecision returns fire:true on unreadable/no-telemetry/disabled, so the hook never goes silent on error; (3) every code path still emits `continue:true` (PreToolUse must never block Read); (4) the 3 tests use concrete fail-on-revert assertions; (5) it's a faithful clone of the ollama-route-pretooluse decay pattern (you may read `H:/prism/.claude/hooks/ollama-route-pretooluse.mjs` lines 520-535 to compare). Run the test if useful: `node --test H:/prism/.claude/hooks/large-read-digest-advisory.test.mjs`.

Return **PASS** or **FAIL** with any P0/P1 findings. Be concise.

### Assistant | 2026-06-10T16:42:29.585Z

I'll review the commit and the two target files end-to-end, plus the reference pattern.

### Assistant | 2026-06-10T16:42:32.176Z

[tool_use: Bash]

### User | 2026-06-10T16:42:37.635Z

[tool_result] commit 05906647ad84382b4b0b1c43f3ba0d09abe95eac
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 10 11:26:00 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-LARGE-READ-DECAY-WIRE (slot:sierra): wire advisory-decay into large-read-digest-advisory so a proven-noise offload nudge stops flooding context
    
    The hook's own header has promised since shi
... [+1843 chars truncated]

### Assistant | 2026-06-10T16:42:45.320Z

Let me read the target files and the reference pattern.

### Assistant | 2026-06-10T16:42:45.804Z

[tool_use: Read]

### User | 2026-06-10T16:42:46.906Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\large-read-digest-advisory.mjs' was already read 10m ago in this session and is unchanged (mtime 1781108503506). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-06-10T16:42:54.096Z

The file appears to be cached but I don't actually have it in context (this is a fresh session). Let me read with explicit cache bypass.

### Assistant | 2026-06-10T16:42:54.097Z

[tool_use: Bash]

### User | 2026-06-10T16:43:05.645Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
#!/usr/bin/env node
// tier: T3
// large-read-digest-advisory.mjs -- PreToolUse:Read advisory hook
//
// When Claude is about to Read a LARGE source file (>600 lines by default), inject an
// advisory pointing at scripts/ollama-file-digest.mjs -- the verified line-anchored
// digest (commit 1175a6f26b): a local-Ollama dige
... [+10106 chars truncated]

### Assistant | 2026-06-10T16:43:08.924Z

Let me see the rest of the file (the CLI entry guard tail) and then the test file.

### Assistant | 2026-06-10T16:43:10.114Z

[tool_use: Bash]

### User | 2026-06-10T16:43:23.606Z

[tool_result]   const decay = decayDecision(HOOK_KEY, { statsPath: STATS_PATH });
  if (!decay.fire) {
    if (verbose) process.stderr.write(`large-read-digest-advisory: muted ${classification.base} (decay ${decay.status}, take=${decay.takeRate})\n`);
    emit({ continue: true });
    return 0;
  }
  if (verbose) process.stderr.write(`large-read-digest-advisory: advise on ${classification.base} (${lineCount} li
... [+590 chars truncated]

### Assistant | 2026-06-10T16:43:28.156Z

Now the test file and the reference pattern.

### Assistant | 2026-06-10T16:43:28.508Z

[tool_use: Read]

### User | 2026-06-10T16:43:30.069Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\large-read-digest-advisory.test.mjs' was already read 11m ago in this session and is unchanged (mtime 1781108597816). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### Assistant | 2026-06-10T16:43:36.303Z

[tool_use: Bash]

### User | 2026-06-10T16:43:57.945Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
// large-read-digest-advisory.test.mjs
// U-VERIFIED-OFFLOAD-LARGEREAD-HOOK (2026-06-09, slot:alpha): the read-advisory must
// (1) classify ONLY large non-wiki source files as candidates, (2) skip wiki/noise/
// data/below-threshold, (3) emit a suggestion that names the file-digest CLI + the
// path. Pure-function tests, 
... [+7558 chars truncated]

### Assistant | 2026-06-10T16:44:02.089Z

Now let me read the decay library to verify the fail-safe and probe semantics, and the reference pattern.

### Assistant | 2026-06-10T16:44:03.607Z

[tool_use: Bash]

### User | 2026-06-10T16:44:10.050Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
// scripts/lib/advisory-decay.mjs
// U-ADVISORY-DECAY (2026-06-09, slot:alpha): the missing ACTUATOR on advisory
// take-rate. mcp-route-takeup / ollama-offload-stats MEASURE per-hook conversion
// but nothing ACTS on it -- so a proven-zero-conversion advisory keeps spending
// context tokens on a nudge nobody takes. This 
... [+8108 chars truncated]

### Assistant | 2026-06-10T16:44:16.555Z

Now let me check the reference pattern in ollama-route-pretooluse.mjs (lines 520-535) to verify the clone fidelity.

### Assistant | 2026-06-10T16:44:17.925Z

[tool_use: Bash]

### User | 2026-06-10T16:44:23.888Z

[tool_result]     res = await runRoute({ stdin });
  } catch {
    return emit({ continue: true });
  }

  if (res.action === "pass") return emit({ continue: true });

  telemetry(process.env, {
    event: res.action,
    kind: res.kind,
    sizeKB: res.sizeKB,
    file: stdin?.tool_input?.file_path ?? null,
    session: stdin?.session_id ?? null,
  });

  if (res.action === "suggest") {
    // advisory-decay g
... [+1286 chars truncated]

### Assistant | 2026-06-10T16:44:28.754Z

Now let me run the tests to confirm they pass, and verify the probe math against the decay library's actual semantics.

### Assistant | 2026-06-10T16:44:29.190Z

[tool_use: Bash]

### User | 2026-06-10T16:44:35.498Z

[tool_result]   ...
# Subtest: decay-gate: PROVEN-NOISE (>=50 injections, 0% conversion, off-probe) MUTES the advisory
ok 13 - decay-gate: PROVEN-NOISE (>=50 injections, 0% conversion, off-probe) MUTES the advisory
  ---
  duration_ms: 72.4943
  ...
# Subtest: decay-gate: INSUFFICIENT telemetry (<50 injections) still FIRES (fail-safe)
ok 14 - decay-gate: INSUFFICIENT telemetry (<50 injections) still FIRES (fail
... [+403 chars truncated]

### Assistant | 2026-06-10T16:44:47.335Z

All 15 pass. Now let me verify the probe-math claims in the tests are actually correct against the decay library's `classify` + `decayDecision`, since the comments make specific arithmetic claims (seed 52→53, 59→60). The key question: does `bumpStats()` increment `suggested` before the decay read uses `c.injected = suggested`?

Let me trace the arithmetic precisely:
- `classify` uses `injected = suggested`. Probe fires when `injected % probeInterval === 0` (probeInterval=20).
- Test "PROVEN-NOISE off-probe": seed `suggested:52` → bumpStats → `suggested:53` → injected=53. 53 % 20 = 13 ≠ 0 → muted. ✓ (test asserts no additionalContext)
- Test "probe-fire": seed `suggested:59` → bumpStats → 60 → 60 % 20 = 0 → probe fires. ✓
- Test "insufficient": seed `suggested:5` → bumpStats → 6 < 50 → status `insufficient` → fire:true. ✓

The arithmetic is internally consistent and the tests confirm it live. Let me also verify the live validation claim and that `PRISM_ADVISORY_DECAY_DISABLE: ""` in the test env doesn't accidentally disable (the lib checks `=== "1"`).

### Assistant | 2026-06-10T16:44:51.319Z

[tool_use: Bash]

### User | 2026-06-10T16:44:55.968Z

[tool_result] LIVE large-read-digest-advisory: {"fire":true,"muted":true,"probe":true,"status":"noise","takeRate":0,"reason":"noise-probe-fire"}
empty-string disable -> status: noise (should NOT be disabled)

### Assistant | 2026-06-10T16:45:02.012Z

The live read confirms `status: noise, muted: true, takeRate: 0` — the wiring correctly identifies this as proven noise. (The current live snapshot lands on a probe interval, so `fire:true, probe:true` at this instant — which is exactly the self-revival behavior, not a defect; it mutes on the other 19/20 reads.) Empty-string disable knob correctly does not disable.

Now let me verify the two ordering invariants from the prompt: (1) gate after `bumpStats()` + before emit, (2) every code path emits `continue:true`. Let me grep all emit sites in main().

### Assistant | 2026-06-10T16:45:03.159Z

[tool_use: Grep]

### User | 2026-06-10T16:45:05.519Z

[tool_result] 35:import { decayDecision } from "../../scripts/lib/advisory-decay.mjs"; // U-LARGE-READ-DECAY-WIRE: mute proven-noise advisories (R15 clone of ollama-route-pretooluse)
39:// env-overridable so the decay-gate integration is hermetically testable; bumpStats()
96:function bumpStats() {
134:  if (process.env.PRISM_LARGE_READ_DIGEST_DISABLE === "1") { emit({ continue: true, suppressOutput: true }); re
... [+1213 chars truncated]

### Assistant | 2026-06-10T16:45:30.184Z

The grep confirms the full structure. Verification complete on all five points:

1. **Gate placement** — `bumpStats()` at line 174, `decayDecision` at line 186, advisory emit at line 194. Gate is after bump, before emit. ✓
2. **Fail-safe** — `decayDecision` returns `fire:true` for `disabled`/`no-stats`/`no-telemetry`/`unmeasurable`/`insufficient`/`healthy`; only confirmed `noise` (off-probe) returns `fire:false`. The `!decay.fire` branch only triggers on proven noise. ✓
3. **Never blocks Read** — every `emit()` in main() (and the fatal catch at line 202) emits `{continue:true}`; no `permissionDecision:"deny"` anywhere. The decay-mute branch emits `{continue:true}` with no `additionalContext`. ✓
4. **Concrete fail-on-revert tests** — all three subprocess tests assert specific observable behavior with arithmetic-anchored fixtures. ✓
5. **Faithful clone** — same shape as `ollama-route-pretooluse.mjs:520-535` (bump-before-gate, `decayDecision` on own stats path, `if (!decay.fire) emit continue:true`, conversion path never gated). ✓

---

## PASS

**Commit `05906647ad` (U-LARGE-READ-DECAY-WIRE) — PASS. No P0/P1 findings.**

All five verification points hold, validated live + with 15/15 passing tests.

**Verified:**
1. **Gate placement** — `bumpStats()` (`large-read-digest-advisory.mjs:174`) → `decayDecision(HOOK_KEY, {statsPath: STATS_PATH})` (:186) → advisory emit (:194). After bump, before emit, as designed. The bump-before-read ordering correctly advances the probe counter so `injected = suggested + 1` even on a muted run (drives self-revival).
2. **Fails SAFE** — `advisory-decay.mjs` returns `fire:true` for every non-`noise` classification (`disabled`/`no-stats`/`no-telemetry`/`unmeasurable`/`insufficient`/`healthy`); only confirmed off-probe `noise` mutes. The `null`-coercion trap is explicitly guarded (`typeof s.offloaded === "number"` — `Number(null)===0` cannot manufacture a false mute). Hook never goes silent on stats error.
3. **Never blocks Read** — all 8 earl
... [+2201 chars truncated]
