---
type: "chat-session"
source: "claude-code-cli"
session_id: "3441c192-7f7a-4e0b-8bf4-5b5a9b1eb28e"
title: "You are reviewer B (test-integrity / inlined-constant / wiring weighted) of PRIS"
date: "2026-06-18"
first_ts: "2026-06-18T18:45:43.405Z"
last_ts: "2026-06-18T18:50:18.908Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 65
user_msgs: 25
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism-slot-oscar/3441c192-7f7a-4e0b-8bf4-5b5a9b1eb28e/subagents/agent-a9e83e4c6895e007d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# You are reviewer B (test-integrity / inlined-constant / wiring weighted) of PRIS

> **claude-code-cli** | 2026-06-18 | 65 msgs (25 user / 40 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/3441c192-7f7a-4e0b-8bf4-5b5a9b1eb28e/subagents/agent-a9e83e4c6895e007d.jsonl`

## Transcript

### User | 2026-06-18T18:45:43.405Z

You are reviewer B (test-integrity / inlined-constant / wiring weighted) of PRISM's 3-of-3 gate. Do NOT assume reviewer A caught anything. Review commits 12cd818788..HEAD on slot/oscar in H:\prism-slot-oscar (`git -C H:/prism-slot-oscar log --oneline 12cd818788..HEAD`, then `git -C H:/prism-slot-oscar show` each).

These are SFC closed-loop accuracy + combinatorial-axis-drift-guard commits: e9dffef3a2 (direction-consistency gate in scripts/sfc-catalog-divergence-reason.mjs + base_model_vc_high category + hardened prompt + REASON_LOGIC_VERSION fingerprint salt), 9c8b0fea35 (octopus min-voices -> insufficient_voices), d4998ec585 (additive SUPPORTED_STRATEGIES engine export + drift-guard test src/__tests__/sfc-strategy-drift-guard.test.ts), 0062d0b562 (all-axes drift-guard), e9e06bf741 (doc only).

Focus:
- TEST INTEGRITY (R9): run from H:/prism-slot-oscar/mcp-server with H:/Tools/nodejs/node.exe: `node --test scripts/sfc-catalog-divergence-reason.test.mjs` (expect 31/31) and `node --test scripts/sfc-per-machine-rollup.test.mjs` (expect 6/6). Then via the main-tree tsx `H:/prism/mcp-server/node_modules/.bin/tsx.cmd --test src/__tests__/sfc-strategy-drift-guard.test.ts` (expect 5/5). Report ACTUAL pass counts. Any .skip/.only?
- Do the new tests genuinely FAIL on the bug they guard? Specifically: is there a test reproducing the direction-inversion (an inverted Ollama verdict on a +61% PRISM-high regime must fall back to deterministic, NOT pass through)? Does the drift-guard test actually compare STRATEGIES to the engine's SUPPORTED_STRATEGIES (not a tautology)?
- INLINED CONSTANTS: confirm NO Kienzle/Taylor/material/SLD constant was inlined or changed anywhere in the diff; the engine edit must be ONLY `export const SUPPORTED_STRATEGIES = Object.freeze(Object.keys(STRATEGY_MODS))`.
- Negation-handling hole in directionConsistent: could a genuine wrong-direction recommendation be MASKED by the negation strip (e.g. "do not lower; raise vc")? Reason about the regex bound.


... [+108 chars truncated]

### Assistant | 2026-06-18T18:45:47.102Z

I'll review these commits systematically. Let me start by examining the commit range and the diffs.

### Assistant | 2026-06-18T18:45:47.607Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:45:48.472Z

[tool_use: Bash]

### User | 2026-06-18T18:45:54.482Z

[tool_result] e9e06bf741 [OSCAR-SFC-9AXIS-MS0]/U-OSC-OPEN-THREADS-REFRESH: refresh the SFC context-regain ledger with this session's 7 units + gated next-steps
0062d0b562 [OSCAR-SFC-9AXIS-MS0]/U-OSC-AXIS-DRIFT-GUARD-ALLAXES: extend the drift guard to every combinatorial axis (R16 completion)
d4998ec585 [OSCAR-SFC-9AXIS-MS0]/U-OSC-STRATEGY-DRIFT-GUARD: guard the combinatorial STRATEGIES axis against engine drift
... [+282 chars truncated]

### User | 2026-06-18T18:46:00.780Z

[tool_result] e9e06bf741 [OSCAR-SFC-9AXIS-MS0]/U-OSC-OPEN-THREADS-REFRESH: refresh the SFC context-regain ledger with this session's 7 units + gated next-steps
 state/shared/specs/SFC-OPEN-THREADS-2026-06-10.md | 14 ++++++++++++++
 1 file changed, 14 insertions(+)
0062d0b562 [OSCAR-SFC-9AXIS-MS0]/U-OSC-AXIS-DRIFT-GUARD-ALLAXES: extend the drift guard to every combinatorial axis (R16 completion)
 .../src/__tests
... [+1108 chars truncated]

### Assistant | 2026-06-18T18:46:03.649Z

Let me see the full diffs for the code-changing commits.

### Assistant | 2026-06-18T18:46:04.602Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:46:05.551Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:46:06.735Z

[tool_use: Bash]

### User | 2026-06-18T18:46:08.993Z

[tool_result] commit e9dffef3a2261f263176bff5ab6e9736718d93c0
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 11:15:08 2026 -0500

    [SFC-PER-MACHINE-FULLSPACE]/U-OSC-DIVERGENCE-REASON-DIRECTION: direction-consistent SFC divergence reasoning (gate + prompt + base_model_vc_high)
    
    The closed-loop reasoning generated DIRECTION-INCONSISTENT improvement candidates: for the +5
... [+11452 chars truncated]

### User | 2026-06-18T18:46:19.896Z

[tool_result] commit 9c8b0fea357f15c834567c5e93c7caddb219fa1d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 12:02:29 2026 -0500

    [SFC-PER-MACHINE-FULLSPACE]/U-OSC-OCTOPUS-MIN-VOICES: a 1-voice octopus is not a consensus -> insufficient_voices
    
    After the direction gate (U-OSC-DIVERGENCE-REASON-DIRECTION) excludes panel models that invert or emit no JSON, the local oct
... [+3027 chars truncated]

### User | 2026-06-18T18:46:27.065Z

[tool_result] commit d4998ec585f16813f2f7a6e96f6b15d22710a8e2
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 12:11:27 2026 -0500

    [OSCAR-SFC-9AXIS-MS0]/U-OSC-STRATEGY-DRIFT-GUARD: guard the combinatorial STRATEGIES axis against engine drift
    
    The accuracy sweep enumerates a STRATEGIES axis (src/data/sfc-combinatorial-axes.ts) that hand-copies the strategies the engine 
... [+2628 chars truncated]

### Assistant | 2026-06-18T18:46:29.195Z

Now let me see the test files and the all-axes drift guard commit.

### Assistant | 2026-06-18T18:46:30.769Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:46:32.095Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:46:33.046Z

[tool_use: Bash]

### User | 2026-06-18T18:46:38.493Z

[tool_result] commit 0062d0b56282093aea9cc81b692724e72d5e139b
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 12:17:44 2026 -0500

    [OSCAR-SFC-9AXIS-MS0]/U-OSC-AXIS-DRIFT-GUARD-ALLAXES: extend the drift guard to every combinatorial axis (R16 completion)
    
    The strategy guard (d4998ec585) left the 4 other hand-copied axis arrays (OPERATIONS, CUT_TYPES, TOOL_MATERIALS, COOL
... [+4009 chars truncated]

### User | 2026-06-18T18:46:42.803Z

[tool_result] commit e9dffef3a2261f263176bff5ab6e9736718d93c0
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 11:15:08 2026 -0500

    [SFC-PER-MACHINE-FULLSPACE]/U-OSC-DIVERGENCE-REASON-DIRECTION: direction-consistent SFC divergence reasoning (gate + prompt + base_model_vc_high)
    
    The closed-loop reasoning generated DIRECTION-INCONSISTENT improvement candidates: for the +5
... [+9468 chars truncated]

### User | 2026-06-18T18:46:47.110Z

[tool_result] commit 9c8b0fea357f15c834567c5e93c7caddb219fa1d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 12:02:29 2026 -0500

    [SFC-PER-MACHINE-FULLSPACE]/U-OSC-OCTOPUS-MIN-VOICES: a 1-voice octopus is not a consensus -> insufficient_voices
    
    After the direction gate (U-OSC-DIVERGENCE-REASON-DIRECTION) excludes panel models that invert or emit no JSON, the local oct
... [+2431 chars truncated]

### Assistant | 2026-06-18T18:46:50.138Z

Now let me read the full current state of the key files end-to-end to understand the contracts and verify the negation regex and the strategy guard tautology question.

### Assistant | 2026-06-18T18:46:50.634Z

[tool_use: Read]

### User | 2026-06-18T18:46:51.329Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\scripts\sfc-catalog-divergence-reason.mjs' was already read 9m ago in this session and is unchanged (mtime 1781802026841). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-06-18T18:46:54.326Z

The file content isn't actually in my context — that's a stale cache guard. Let me read it with explicit offset to bypass and see the full octopusConsensus function and how voiceCount is computed.

### Assistant | 2026-06-18T18:46:55.409Z

[tool_use: Bash]

### User | 2026-06-18T18:47:01.676Z

[tool_result]    240	      // Structurally valid -- but reject a DIRECTION-INCONSISTENT verdict (e.g. "raise vc" on an
   241	      // already-above-OEM regime) to the direction-correct deterministic reason. (R12: never emit
   242	      // an improvement candidate that would push the model the WRONG way.)
   243	      if (directionConsistent(parsed, r)) {
   244	        return { ...id, category: parsed.categor
... [+6500 chars truncated]

### Assistant | 2026-06-18T18:47:06.172Z

The error triage hook is a false positive (no test ran). Now let me read the combinatorial axes file to verify the strategy guard is not a tautology, and check the engine's STRATEGY_MODS keys. I also want to verify the negation regex behavior. Let me run the tests as required and inspect the axes module in parallel.

### Assistant | 2026-06-18T18:47:08.694Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:47:09.843Z

[tool_use: Bash]

### User | 2026-06-18T18:47:13.531Z

[tool_result] 29:export type Strategy =
55:export const TOOL_MATERIALS: ToolMaterial[] = ["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"];
58:export const OPERATIONS: Operation[] = [
63:export const CUT_TYPES: CutType[] = ["roughing", "semi_finishing", "finishing"];
66:export const STRATEGIES: Strategy[] = [
71:export const COOLANTS: CoolantType[] = [

### User | 2026-06-18T18:47:18.372Z

[tool_result] 965:  conventional:  { vc_factor: 1.0, fz_factor: 1.0, ap_factor: 1.0, notes: [] },
966:  adaptive:      { vc_factor: 1.4, fz_factor: 1.2, ap_factor: 2.0, ae_override_pct: 10, notes: ["Constant engagement toolpath", "ae=8-12% of Dc", "Full flute depth OK"] },
967:  trochoidal:    { vc_factor: 1.5, fz_factor: 1.3, ap_factor: 2.5, ae_override_pct: 8, notes: ["Trochoidal slotting", "ae=5-10% of Dc", 
... [+707 chars truncated]

### Assistant | 2026-06-18T18:47:22.698Z

Now let me read the axes file STRATEGIES/type definitions in full and the strategy guard test to confirm the comparison is not a tautology, plus run all three test files.

### Assistant | 2026-06-18T18:47:23.762Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:47:24.521Z

[tool_use: Bash]

### User | 2026-06-18T18:47:29.794Z

[tool_result] export type Strategy =
  | "conventional"
  | "adaptive"
  | "trochoidal"
  | "hsm"
  | "hpc"
  | "plunge"
  | "slot";

/**
 * ISO group × representative material × expected Vc reference band on a 12 mm
 * carbide end-mill. Bands from the Sandvik General Turning catalogue (2024),
 * widened ±50% to accommodate the engine's strategy/cut-type modifiers. The
 * inline comments record the catalogue-ty
... [+1712 chars truncated]

### User | 2026-06-18T18:47:35.051Z

[tool_result]      1	/**
     2	 * STRATEGY drift guard (OSCAR-SFC-9AXIS-MS0 / U-OSC-STRATEGY-DRIFT-GUARD).
     3	 *
     4	 * The combinatorial accuracy sweep enumerates a STRATEGIES axis (src/data/sfc-combinatorial-axes.ts)
     5	 * that is a HAND-COPY of the strategies the engine actually applies (STRATEGY_MODS keys, exported as
     6	 * SUPPORTED_STRATEGIES). If the engine gains/loses a strategy and the 
... [+4801 chars truncated]

### Assistant | 2026-06-18T18:47:38.974Z

Now I confirm the strategy guard test #1 is NOT a tautology: it imports `SUPPORTED_STRATEGIES` from the engine (live `Object.keys(STRATEGY_MODS)`) and `STRATEGIES` from the axes data module (an independent hand-copy), and `deepEqual`s them after sort. They come from two genuinely independent sources, so it would fail on real drift. Good.

Now let me run all three test files as required.

### Assistant | 2026-06-18T18:47:40.868Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:47:41.704Z

[tool_use: Bash]

### User | 2026-06-18T18:47:47.246Z

[tool_result]   ...
# Subtest: renderReasoningBrief: octopus not-run -> records the reason, Ollama verdicts stand
ok 29 - renderReasoningBrief: octopus not-run -> records the reason, Ollama verdicts stand
  ---
  duration_ms: 0.0468
  ...
# Subtest: regimesFingerprint: stable when unchanged; EACH prompt field (vc, fz, containment, citations) is independently load-bearing
ok 30 - regimesFingerprint: stable when 
... [+517 chars truncated]

### User | 2026-06-18T18:47:52.405Z

[tool_result]   ...
# Subtest: pushMetric/finalizeMetric: ignore non-finite values; null when empty (adversarial)
ok 5 - pushMetric/finalizeMetric: ignore non-finite values; null when empty (adversarial)
  ---
  duration_ms: 0.1441
  ...
# Subtest: discoverLedgers matches shard + smoke files, ignores others, sorts
ok 6 - discoverLedgers matches shard + smoke files, ignores others, sorts
  ---
  duration_ms: 4.3
... [+110 chars truncated]

### Assistant | 2026-06-18T18:47:54.989Z

Both pass: 31/31 and 6/6, with 0 skipped, 0 todo. Now the strategy drift guard test via tsx.

### Assistant | 2026-06-18T18:47:57.646Z

[tool_use: Bash]

### User | 2026-06-18T18:48:07.426Z

[tool_result]   ...
# Subtest: ALL combinatorial axis arrays are exhaustive against their engine types (drift guard, every axis)
ok 4 - ALL combinatorial axis arrays are exhaustive against their engine types (drift guard, every axis)
  ---
  duration_ms: 0.1333
  ...
# Subtest: SUPPORTED_STRATEGIES is non-empty and frozen (authoritative engine set)
ok 5 - SUPPORTED_STRATEGIES is non-empty and frozen (authoritat
... [+151 chars truncated]

### Assistant | 2026-06-18T18:48:10.976Z

5/5 pass, 0 skipped. All three suites pass at expected counts. Now let me verify no `.skip`/`.only` anywhere and that the test genuinely fails on the bug it guards (R9). I'll do a targeted verification: temporarily mutate `directionConsistent` to be a no-op and confirm the inversion test fails. And I'll search the diff for any inlined physics constants.

### Assistant | 2026-06-18T18:48:13.343Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:48:16.067Z

[tool_use: Bash]

### User | 2026-06-18T18:48:21.370Z

[tool_result] NO .skip/.only/.todo found

### User | 2026-06-18T18:48:28.597Z

[tool_result] NO physics-constant literals in added lines

### Assistant | 2026-06-18T18:48:31.636Z

Now let me verify R9 — that the inversion regression test genuinely fails if the gate is removed. I'll make a temporary in-place mutation (which I will revert) to prove the test is not a tautology.

### Assistant | 2026-06-18T18:48:36.375Z

[tool_use: Bash]

### User | 2026-06-18T18:48:42.018Z

[tool_result] --- running with neutered gate ---
not ok 16 - directionConsistent: PRISM-HIGH must reject the PRISM-below category + raise-vc improvement
not ok 17 - directionConsistent: PRISM-LOW must reject the high-only categories + lower-vc improvement
not ok 19 - reasonRegime: rejects a DIRECTION-INCONSISTENT ollama verdict -> deterministic (reproduces the live ISO-H bug)
# tests 31
# pass 28
# fail 3
--- r
... [+21 chars truncated]

### Assistant | 2026-06-18T18:48:45.854Z

The R9 verification is conclusive: neutering `directionConsistent` to `return true` makes 3 tests fail, including test 19 — the exact live ISO-H +61% inversion regression. The test genuinely fails on the bug it guards. Let me verify the restore was byte-clean and confirm the tests pass again.

### Assistant | 2026-06-18T18:48:47.300Z

[tool_use: Bash]

### User | 2026-06-18T18:48:54.232Z

[tool_result] --- diff (should be empty) ---
=== END (empty diff = clean restore) ===

### Assistant | 2026-06-18T18:48:58.947Z

Clean restore confirmed (empty diff). Now let me reason carefully about the negation-handling hole the prompt flagged — could a genuine wrong-direction recommendation be MASKED by the negation strip? Let me examine the regex bound precisely.

The negation strip regex:
```
/\b(?:do not|don'?t|never|avoid|not)\b[^.;,]{0,14}?(?:raise|raising|increase|...|lower|...|slower)/g
```

Let me test the actual masking risk with concrete adversarial inputs against the live function.

### Assistant | 2026-06-18T18:49:06.380Z

[tool_use: Bash]

### User | 2026-06-18T18:49:11.175Z

[tool_result] false | want false (raise is wrong on high) | high: do not lower; raise vc (genuine WRONG raise after negation)
false | want false | high: do not lower the vc but increase it
false | want false | high: never reduce, instead raise vc significantly
true | want true | high CORRECT: review; do not raise vc
true | want true | high CORRECT: do not auto-raise vc
false | want false (lower is wrong on low)
... [+88 chars truncated]

### Assistant | 2026-06-18T18:49:21.686Z

This is the critical test the prompt asked about, and the regex handles every case correctly. Let me reason about WHY the "do not lower; raise vc" case is NOT masked, to confirm the regex bound is sound:

- The negation strip regex `\b(?:do not|...)\b[^.;,]{0,14}?(?:raise|...|slower)` is non-greedy (`{0,14}?`) and bounded by `[^.;,]` (stops at punctuation).
- For `"do not lower; raise vc"`: the `;` is a hard stop in `[^.;,]`, so the negation match is `"do not lower"` (the strip cannot cross the `;` to consume "raise"). After strip: `" ; raise vc"` → `raisesVc` is still true → correctly returns `false`.
- For `"do not lower the vc but increase it"`: the negation lazily matches `"do not lower"` (first verb encountered), leaving `" the vc but increase it"` → `increase` still detected → `false`.

The non-greedy + first-verb-match behavior is the key: the strip removes only the negated verb closest to the negation word, never a *subsequent* genuine directive verb. A masking hole would require a single negation phrase to consume BOTH a negated verb and a real opposite directive within 14 non-punctuation chars — but the lazy quantifier stops at the first verb, so the real directive survives. The regex bound is sound.

Let me do one final adversarial probe for the edge: a real raise hidden right after a negation within the 14-char window with no intervening verb (e.g., "do not be shy, raise vc").

### Assistant | 2026-06-18T18:49:25.031Z

[tool_use: Bash]

### User | 2026-06-18T18:49:33.529Z

[tool_result] false | high: do not be shy, raise vc (no negated verb, raise within 14ch)
true | high: avoid being timid raise vc (14ch window)
true | high: not conservative raise vc

### Assistant | 2026-06-18T18:49:49.042Z

Here is the subtle hole. Two cases where a genuine wrong-direction "raise vc" on a PRISM-HIGH regime gets MASKED:
- `"avoid being timid raise vc"` → the strip matches `avoid being timid raise` (no comma/period; "raise" is within 14 chars of "avoid"), removing the raise → returns `true` (should be `false`).
- `"not conservative raise vc"` → strip matches `not conservative raise` → masked → `true`.

These are masking holes: a negation word (`avoid`/`not`) precedes a NON-verb adjective phrase, and the genuine directive verb `raise` falls within the 14-char `[^.;,]` window, so the strip eats the real directive. The first case (`"do not be shy, raise vc"`) is saved only because the comma stops the strip.

Now I must weigh severity. Is this a realistic Ollama output, and is it load-bearing for safety? Let me assess:

1. The function's docstring explicitly claims the design is safe-by-construction: "a false reject merely costs Ollama nuance — the deterministic fallback is direction-correct." But this hole is the *opposite* of a false reject — it's a **false ACCEPT** (a wrong-direction verdict passes the gate and propagates as an improvement candidate). The docstring's safety argument does not cover this direction.
2. Mitigating factors: (a) output is ADVISORY/physics-review-gated, never auto-applied to a cut-data table (commit + render confirm "IMPROVEMENT CANDIDATES, never auto-applied"); (b) the hardened prompt now steers the model away from inversions (live: 7/7 kept, 0 direction-violations); (c) the `category` check is independent — on a high regime `base_model_vc_table` is rejected regardless of prose, so the most dangerous live pattern (the actual ISO-H bug used `base_model_vc_table`) is still caught by the category gate even if the improvement-prose gate is fooled.

So the realistic blast radius is narrow: it requires the model to emit a high-direction-consistent *category* (`base_model_vc_high` or `over_speed_risk`) but a *contradicting* improvement phrased as "avo
... [+665 chars truncated]

### Assistant | 2026-06-18T18:49:51.136Z

[tool_use: Bash]

### User | 2026-06-18T18:49:56.946Z

[tool_result] commit e9e06bf741703a2013ba4f3edbf2b3bc488e0498
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 12:19:32 2026 -0500

    [OSCAR-SFC-9AXIS-MS0]/U-OSC-OPEN-THREADS-REFRESH: refresh the SFC context-regain ledger with this session's 7 units + gated next-steps

 state/shared/specs/SFC-OPEN-THREADS-2026-06-10.md | 14 ++++++++++++++
 1 file changed, 14 insertions(+)
=== dif
... [+1604 chars truncated]

### Assistant | 2026-06-18T18:50:18.908Z

Doc-only commit is honest documentation, accurately reflects the shipped units, and the commit body itself flags that formal 3-of-3 on the last 3 commits is still pending (which is exactly what this review fulfills). No code, no constants.

I have completed my review. Let me summarize my findings.

---

VERDICT: PASS

BLOCKER: none

summary: All five commits (e9dffef3a2, 9c8b0fea35, d4998ec585, 0062d0b562, e9e06bf741) are clean for merge. Test integrity is genuine — I ran all three suites (divergence-reason 31/31, per-machine-rollup 6/6, strategy-drift-guard 5/5; 0 skipped/only/todo) and PROVED R9 by neutering `directionConsistent` to `return true`, which failed 3 tests including the exact live ISO-H +61% inversion regression (test 19). No Kienzle/Taylor/material/SLD constant was inlined or altered anywhere in the diff; the engine edit is exactly the additive `export const SUPPORTED_STRATEGIES = Object.freeze(Object.keys(STRATEGY_MODS))`. The strategy guard is not a tautology — it deep-compares the engine's live `Object.keys(STRATEGY_MODS)` against the independent hand-copied axes-module `STRATEGIES`.

findings:
- [P2] `mcp-server/scripts/sfc-catalog-divergence-reason.mjs:175` (negation strip in `directionConsistent`) — the strip `\b(?:do not|don't|never|avoid|not)\b[^.;,]{0,14}?(?:raise|...)` can MASK a genuine wrong-direction directive when a negation word precedes a non-verb adjective phrase and the real verb falls within the 14-char window: `"avoid being timid raise vc"` and `"not conservative raise vc"` on a +61% PRISM-HIGH regime both return `true` (verified live), i.e. a false ACCEPT — the opposite of the docstring's "false reject merely costs nuance" safety claim. Blast radius is narrow: output is advisory/physics-review-gated (never auto-applied to a cut table), the prompt hardening already drove live output to 7/7 direction-consistent, and the independent `category` gate still catches the actual live bug pattern (`base_model_vc_table` on a high regime) reg
... [+1936 chars truncated]
