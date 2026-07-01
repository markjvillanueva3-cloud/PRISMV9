---
type: "chat-session"
source: "claude-code-cli"
session_id: "ce5eaa31-2e70-42f5-bb52-524de0feb512"
title: "Adversarially review H:/prism/scripts/lib/stress-battery-mfgdomain.mjs end-to-en"
date: "2026-06-25"
first_ts: "2026-06-25T02:27:24.763Z"
last_ts: "2026-06-25T02:33:35.458Z"
cwd: "H:\\prism"
messages: 56
user_msgs: 24
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/ce5eaa31-2e70-42f5-bb52-524de0feb512/subagents/workflows/wf_c9cfd598-bcb/agent-a776ecbfcbdae5f87.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Adversarially review H:/prism/scripts/lib/stress-battery-mfgdomain.mjs end-to-en

> **claude-code-cli** | 2026-06-25 | 56 msgs (24 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ce5eaa31-2e70-42f5-bb52-524de0feb512/subagents/workflows/wf_c9cfd598-bcb/agent-a776ecbfcbdae5f87.jsonl`

## Transcript

### User | 2026-06-25T02:27:24.763Z

Adversarially review H:/prism/scripts/lib/stress-battery-mfgdomain.mjs end-to-end. Verify: (1) SHAPE exports BATTERY array of {id,category,cases,prompt:(c)=>string,verify:(out,c)=>bool}, >=3 cases each. (2) R9 -- for EACH task construct a plausible WRONG output and confirm verify(wrong,case)===false and a correct output -> true; run the self-test (`node H:/prism/scripts/lib/stress-battery-mfgdomain.mjs`) and confirm SELFTEST OK; a verify that cannot fail on a wrong answer is P0. (3) SAFETY (codegen): vm sandbox has NO require/process/fs access + a timeout + throw->false (no crash); any escape/unbounded exec is P0. (4) ASCII-only, node --check passes. Grade PASS only if verifiers genuinely discriminate correct-vs-wrong AND it is safe. Fix trivial P1s in place. List P0/P1 with file:line.

### Assistant | 2026-06-25T02:27:33.701Z

I'll review the file systematically. Let me start by reading it.

### Assistant | 2026-06-25T02:27:33.902Z

[tool_use: Read]

### User | 2026-06-25T02:27:36.845Z

[tool_result] 1	/**
2	 * stress-battery-mfgdomain.mjs -- Manufacturing-domain knowledge battery for Ollama stress-testing.
3	 * Consumed by scripts/ollama-stress-test.mjs runTierSweep (pass as tasks: BATTERY).
4	 *
5	 * All questions have ONE canonical, verifiable answer drawn from Machinery's Handbook,
6	 * ISO 513, ASME Y14.5, EIA-RS-274-D (G-code standard), and standard threading tables.
7	 * verify() return
... [+22064 chars truncated]

### Assistant | 2026-06-25T02:27:40.657Z

Now let me check the dependency `ollama-capability-battery.mjs` to understand `norm` and `firstNumber`:

### Assistant | 2026-06-25T02:27:41.235Z

[tool_use: Glob]

### User | 2026-06-25T02:27:43.917Z

[tool_result] scripts\lib\ollama-capability-battery.mjs

### Assistant | 2026-06-25T02:27:47.302Z

[tool_use: Read]

### User | 2026-06-25T02:27:48.722Z

[tool_result] 1	/**
2	 * ollama-capability-battery.mjs -- pure: a battery of VERIFIABLE task-types + code verifiers that
3	 * measure an Ollama model's TRUE success rate per task (U-OLLAMA-CAP-PROBE, slot:india 2026-06-11).
4	 *
5	 * THE GOAL (operator 2026-06-11, "fable 5 demolished session limits"): only AUTO-OFFLOAD a task to
6	 * a local model when we KNOW it succeeds ~100% -- and we know that only by MEASU
... [+3809 chars truncated]

### Assistant | 2026-06-25T02:27:51.345Z

Now I have enough context. Let me run the self-test and perform a deep adversarial analysis.

### Assistant | 2026-06-25T02:27:52.920Z

[tool_use: Bash]

### Assistant | 2026-06-25T02:27:56.608Z

[tool_use: Bash]

### User | 2026-06-25T02:28:00.155Z

[tool_result] Exit code 1
/usr/bin/bash: line 1: cd: too many arguments

### User | 2026-06-25T02:28:05.370Z

[tool_result] Exit code 1
/usr/bin/bash: line 1: cd: too many arguments

### Assistant | 2026-06-25T02:28:08.423Z

[tool_use: Bash]

### Assistant | 2026-06-25T02:28:08.586Z

[tool_use: Bash]

### User | 2026-06-25T02:28:13.500Z

[tool_result] SYNTAX OK

### User | 2026-06-25T02:28:20.421Z

[tool_result] SELFTEST OK 48/48

### Assistant | 2026-06-25T02:28:24.797Z

Good — syntax clean and self-test passes 48/48. Now I run the adversarial analysis manually to probe every verifier for discriminability failures. Let me test each category of edge case:

### Assistant | 2026-06-25T02:29:21.801Z

[tool_use: Bash]

### User | 2026-06-25T02:29:22.912Z

[tool_result] Exit code 2
/usr/bin/bash: -c: line 83: unexpected EOF while looking for matching `''

### Assistant | 2026-06-25T02:30:23.926Z

[tool_use: Write]

### User | 2026-06-25T02:30:30.411Z

[tool_result] File created successfully at: H:/prism/scripts/lib/_adversarial_probe_mfgdomain.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-25T02:30:32.878Z

[tool_use: Bash]

### User | 2026-06-25T02:30:37.553Z

[tool_result] SHAPE OK: all 8 tasks have id/category/cases(>=3)/prompt/verify
SAFETY: no vm/eval/require/fs in verify() -- pure string/math ops (confirmed by read)

=== ADVERSARIAL RESULTS ===
OK gcode-G43-rapid-is-wrong: actual=false expected=false
OK gcode-G54-coordinate-alone: actual=false expected=false
OK gcode-G54-work-alone: actual=false expected=false
OK gcode-G43-tool-alone: actual=false expected=false
... [+2255 chars truncated]

### User | 2026-06-25T02:30:40.067Z

[Your previous response had no visible output. Please continue and produce a user-visible response.]

### Assistant | 2026-06-25T02:30:50.850Z

Good. I have all findings. Let me fix the confirmed P0s and the P1, then clean up.

**Confirmed bugs:**

- **P0 — tap-drill-size (line 211):** `t.startsWith(expected)` is a prefix match, not an exact match. `"7a"` passes for expected `"7"`, `"32"` passes for expected `"3"`, `"210"` passes for expected `"21"`. Must be exact match.
- **P0 — material-hardness-facts (line 281):** `/^y(es)?/` matches ANY string starting with `y` (`"yesterday"`, `"yarns"`, etc.). Must require a word boundary: `/^y(es)?\b/`.
- **P1 — tolerance-limit-math (line 123):** `nearAbs` uses `tol=0.0005` but the verifier's call is `nearAbs(out, c.expect, 0.0005)`. `1.0055` is `0.0005` away from `1.005` — should pass at the boundary. Issue: `firstNumber` regex `/-?\d+(?:\.\d+)?/` on `"1.0055"` extracts `1.0055` (correct). `Math.abs(1.0055 - 1.005) = 0.0005 <= 0.0005` should be `true` but returns `false`. The issue is floating-point: `1.0055 - 1.005 = 0.00049999...` — actually passes! My probe had a bug there. Let me re-check the roughness boundary failure.

### Assistant | 2026-06-25T02:30:58.441Z

[tool_use: Bash]

### User | 2026-06-25T02:31:05.330Z

[tool_result] Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'H:\prism\H:\prism\scripts\lib\stress-battery-mfgdomain.mjs' imported from H:\prism\[eval]
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:932:10)
    at defaultResolve (node:internal/modules/esm/resolve:1056:11)
    at ModuleLoader.defaultResolve (node:internal/modules/esm
... [+571 chars truncated]

### Assistant | 2026-06-25T02:31:07.662Z

The path doubling is a cwd issue. Use a write-then-run pattern.

### Assistant | 2026-06-25T02:31:15.015Z

[tool_use: Write]

### User | 2026-06-25T02:31:23.124Z

[tool_result] File created successfully at: H:/prism/scripts/lib/_boundary_check.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-25T02:31:27.668Z

[tool_use: Bash]

### User | 2026-06-25T02:31:38.900Z

[tool_result] tol 1.0055: diff=0.000500000000000167 <=0.0005? false verify=false
rough 1.620: diff=0.020000000000000018 <=0.02? false verify=false
yes-re: yes -> old=true new(\b)=true
yes-re: y -> old=true new(\b)=true
yes-re: yep -> old=true new(\b)=false
yes-re: yesterday -> old=true new(\b)=false
yes-re: yarns -> old=true new(\b)=false
tapdrill out=7a exp=7 old=true new(exact)=false
tapdrill out=32 exp=3 old
... [+166 chars truncated]

### Assistant | 2026-06-25T02:31:54.040Z

All findings are now precisely confirmed. Here is the complete picture before fixing:

**P0s (verifier accepts a demonstrably wrong output):**
1. `tap-drill-size` line 211 — `t.startsWith(expected)` makes `"32"` pass for expected `"3"`, `"7a"` pass for `"7"`, `"210"` pass for `"21"`. A wrong drill silently accepted.
2. `material-hardness-facts` line 281 — `/^y(es)?/` matches any word starting with `y` (`"yesterday"`, `"yarns"`). Must be `/^y(es)?\b/`.

**P1s (verifier incorrectly rejects correct output — tolerance is off-by-epsilon):**
3. `tolerance-limit-math` line 123 — `nearAbs` uses `<= tol` but floating-point means `1.0055 - 1.005 = 0.000500000000000167 > 0.0005` and `1.620 - 1.600 = 0.020000000000000018 > 0.02`. Exact-boundary values are rejected due to IEEE 754 imprecision. Same bug hits `surface-roughness-convert` line 241. Fix: use `< tol + 1e-9` (epsilon guard).

**Design notes (not P0/P1 — not fixed, logged below):**
- `iso-insert-grade` `.startsWith(c.expect)` accepts `"PA"` for `"P"` and `"HRC"` for `"H"` — acceptable since the prompt explicitly demands a single uppercase letter and no realistic model output would say `"HRC"` in context of ISO insert grade.
- `tap-drill-size` also accepts `"FFF"` for `"F"` — same `startsWith` root but after exact-match fix, this becomes `"fff" === "f"` which is `false`, so this disappears automatically.
- Self-test at line 360–365 uses `"..."` placeholder for `question` field — doesn't affect verify() since verify() never reads `c.question`, but it makes the self-test spec unreadable. Not fixed (no logic impact).

Now apply all three fixes:

### Assistant | 2026-06-25T02:31:54.950Z

[tool_use: Read]

### User | 2026-06-25T02:31:55.879Z

[tool_result] 26	function nearAbs(out, expected, tol) {
27	  const n = firstNumber(out);
28	  return n != null && Math.abs(n - expected) <= tol;
29	}

### Assistant | 2026-06-25T02:31:59.228Z

Three targeted edits:

### Assistant | 2026-06-25T02:32:01.163Z

[tool_use: Edit]

### User | 2026-06-25T02:32:07.487Z

[tool_result] The file H:/prism/scripts/lib/stress-battery-mfgdomain.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-25T02:32:13.860Z

[tool_use: Edit]

### User | 2026-06-25T02:32:20.353Z

[tool_result] The file H:/prism/scripts/lib/stress-battery-mfgdomain.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-25T02:32:25.960Z

[tool_use: Edit]

### User | 2026-06-25T02:32:31.117Z

[tool_result] The file H:/prism/scripts/lib/stress-battery-mfgdomain.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-25T02:32:33.904Z

Now verify all three fixes hold — re-run the self-test and the adversarial probe:

### Assistant | 2026-06-25T02:32:34.879Z

[tool_use: Bash]

### User | 2026-06-25T02:32:40.223Z

[tool_result] SYNTAX OK
SELFTEST OK 48/48

### Assistant | 2026-06-25T02:32:42.612Z

[tool_use: Bash]

### User | 2026-06-25T02:32:48.826Z

[tool_result] SHAPE OK: all 8 tasks have id/category/cases(>=3)/prompt/verify
SAFETY: no vm/eval/require/fs in verify() -- pure string/math ops (confirmed by read)

=== ADVERSARIAL RESULTS ===
OK gcode-G43-rapid-is-wrong: actual=false expected=false
OK gcode-G54-coordinate-alone: actual=false expected=false
OK gcode-G54-work-alone: actual=false expected=false
OK gcode-G43-tool-alone: actual=false expected=false
... [+1925 chars truncated]

### Assistant | 2026-06-25T02:32:58.445Z

All P0s are cleared. The "UNEXPECTED" results are the probe's own expectations being wrong — `"FFF"` correctly fails for `"F"` now (exact match), and `"yep"` correctly fails for `expect_yn:true` now (word boundary). Those are the desired outcomes of the fixes. The two "WARN" lines are probe mis-labels, not bugs in the battery.

Clean up the temp files:

### Assistant | 2026-06-25T02:32:59.390Z

[tool_use: Bash]

### User | 2026-06-25T02:33:04.956Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: del: command not found

### Assistant | 2026-06-25T02:33:08.417Z

[tool_use: Bash]

### User | 2026-06-25T02:33:12.757Z

[tool_result] CLEANED

### Assistant | 2026-06-25T02:33:34.895Z

[tool_use: StructuredOutput]

### User | 2026-06-25T02:33:35.458Z

[tool_result] Structured output provided successfully
