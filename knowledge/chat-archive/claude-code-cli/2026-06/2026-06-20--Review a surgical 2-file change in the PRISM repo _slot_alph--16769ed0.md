---
type: "chat-session"
source: "claude-code-cli"
session_id: "16769ed0-dcdd-41c8-9cc5-58b633f8a1d5"
title: "Review a surgical 2-file change in the PRISM repo (slot:alpha, branch cad-fusion"
date: "2026-06-20"
first_ts: "2026-06-20T02:32:40.039Z"
last_ts: "2026-06-20T02:34:47.742Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 10
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/16769ed0-dcdd-41c8-9cc5-58b633f8a1d5/subagents/agent-abf305d225ab27094.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Review a surgical 2-file change in the PRISM repo (slot:alpha, branch cad-fusion

> **claude-code-cli** | 2026-06-20 | 28 msgs (10 user / 18 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/16769ed0-dcdd-41c8-9cc5-58b633f8a1d5/subagents/agent-abf305d225ab27094.jsonl`

## Transcript

### User | 2026-06-20T02:32:40.039Z

Review a surgical 2-file change in the PRISM repo (slot:alpha, branch cad-fusion-live-ms0). Read each file END TO END. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations.

## What the change does
`.claude/hooks/prompt-rewriter-ollama.mjs` is a UserPromptSubmit hook that injects an Ollama-generated "compressed intent" as `additionalContext` BEFORE the raw prompt (additive — the raw prompt always still reaches the model; the hook `exit(0)`s on every failure path, never blocks/replaces). The change adds a skip so operator/system AUTONOMOUS-LOOP directives (e.g. `[AUTONOMOUS BUILD LOOP — operator-armed ...]`, `[ZULU AUTONOMOUS BUILD LOOP ...]`, `[AUTONOMOUS BUILD + PC-HEALTH MONITOR — golf]`) are NOT sent to Ollama — they re-submit every /loop tick fleet-wide and compressing them is wasted ~8s latency + a lossy restatement of operator rails.

Two changes in the hook:
1. A new constant `LOOP_DIRECTIVE_RE = /^\s*\[[^\]]*\b(?:AUTONOMOUS\s+BUILD|BUILD\s+LOOP|operator-armed)\b[^\]]*\]/i` added right after `OPTOUT_RE` (~line 91).
2. A skip block added right AFTER the existing `OPTOUT_RE.test(raw)` block (~line 281) and BEFORE the too-short/throttle/pickModel logic: `if (LOOP_DIRECTIVE_RE.test(raw)) { dbg(...); writeLog({... skip_reason:"system-directive"}); exit(0); }`.

## Files to review
1. `H:/prism/.claude/hooks/prompt-rewriter-ollama.mjs` — verify: the regex is anchored at start (`^\s*\[`) so a normal prompt mentioning "build loop" mid-sentence is NOT matched; the skip is placed correctly in the skip-chain (after opt-out, before model call); it matches the file's existing convention (dbg + writeLog + exit(0)); no ASCII/parser issues; no regression to the existing opt-out/too-short/throttle/pickModel paths.
2. `H:/prism/.claude/hooks/__tests__/prompt-rewriter-system-directive.test.mjs` — verify the tests are REAL behavioral oracles (not stubs): they assert the 4 directive shapes skip with `skip_system_directive` and do NOT reach the model path, and that a n
... [+900 chars truncated]

### Assistant | 2026-06-20T02:32:42.539Z

I'll review both files end to end. Let me start by reading them.

### Assistant | 2026-06-20T02:32:43.485Z

[tool_use: Read]

### Assistant | 2026-06-20T02:32:43.604Z

[tool_use: Read]

### User | 2026-06-20T02:32:44.632Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * prompt-rewriter-ollama.mjs — UserPromptSubmit hook
5	 * RE-ENABLED: 2026-04-26 (LOCAL-LLM-MS0 U-LLMH03)
6	 *
7	 * WHY: The user's raw prompts are often short, pronoun-heavy, and omit
8	 * the implicit constraints that Claude needs to ship correct work ("just
9	 * do the thing", "continue", "build it", "keep going"). This hook calls
10	 * a local Ollam
... [+18271 chars truncated]

### User | 2026-06-20T02:32:44.786Z

[tool_result] 1	/**
2	 * prompt-rewriter-system-directive.test.mjs -- behavioral oracle for the system/operator
3	 * AUTONOMOUS-LOOP directive skip added to prompt-rewriter-ollama.mjs (slot:alpha 2026-06-19).
4	 *
5	 * Operator loop-directives ([AUTONOMOUS BUILD LOOP ...], [ZULU AUTONOMOUS BUILD LOOP ...], etc.)
6	 * are re-submitted every /loop tick fleet-wide. The rewriter must NOT spend an ~8s Ollama
7	 * ro
... [+4813 chars truncated]

### Assistant | 2026-06-20T02:32:47.652Z

Both files are read end to end. Let me verify a couple of load-bearing claims before grading: the regex behavior against edge cases, and that the test harness assertions match the actual stderr the hook emits.

### Assistant | 2026-06-20T02:32:54.555Z

[tool_use: Bash]

### User | 2026-06-20T02:32:58.518Z

[tool_result] true exp=true | "[AUTONOMOUS BUILD LOOP — operator-armed 2026-06-18, slo"
true exp=true | "[ZULU AUTONOMOUS BUILD LOOP — operator-armed ...] one u"
true exp=true | "[AUTONOMOUS BUILD + PC-HEALTH MONITOR — golf]. STEP 1"
true exp=true | "[AUTONOMOUS BUILD LOOP — sierra, operator-armed 2026-06"
false exp=false | "Please fix the build loop in our CI workflow so it stop"
false exp=false | "[NOTE] plea
... [+521 chars truncated]

### Assistant | 2026-06-20T02:33:02.963Z

Regex behaves as designed on all cases. Two notable points: (1) `[RAW] keep building the autonomous loop work` does NOT match `LOOP_DIRECTIVE_RE` (false), but OPTOUT_RE catches it first anyway — precedence intact. (2) The `[^\]]*` is bounded by `\]`, but it also matches newlines inside the bracket (the `[AUTONOMOUS\nBUILD LOOP]` case returns true) — benign. Now let me verify the actual hook stderr matches what the tests assert, since the test depends on specific stderr markers.

### Assistant | 2026-06-20T02:33:06.777Z

[tool_use: Bash]

### User | 2026-06-20T02:33:11.517Z

[tool_result] === PROMPT: [AUTONOMOUS BUILD LOOP — operator-arme
[prompt-rewriter] skip_system_directive (autonomous-loop / operator directive)
=== PROMPT: Please fix the build loop in CI so it st
[prompt-rewriter] pickModel /api/ps probe failed: fetch failed — falling back to /api/tags
[prompt-rewriter] skip reason=unknown: fetch failed
=== PROMPT: [NOTE] please summarize the speed-feed c
[prompt-rewriter] pic
... [+225 chars truncated]

### Assistant | 2026-06-20T02:33:18.347Z

The live stderr exactly matches the test oracles. Let me verify the test runner actually passes and the assertions would fail if the skip were removed (the critical R9 check). I'll also confirm the placement claim by checking the line ordering once more and confirm there's no `.skip`/`.only` cruft.

### Assistant | 2026-06-20T02:33:19.550Z

[tool_use: Bash]

### User | 2026-06-20T02:33:23.709Z

[tool_result]   ...
# Subtest: a leading bracket tag that is NOT a loop-directive is NOT skipped
ok 6 - a leading bracket tag that is NOT a loop-directive is NOT skipped
  ---
  duration_ms: 66.2212
  ...
# Subtest: an explicit [RAW] opt-out still wins (precedence preserved, not regressed)
ok 7 - an explicit [RAW] opt-out still wins (precedence preserved, not regressed)
  ---
  duration_ms: 44.2717
  ...
1..7
#
... [+95 chars truncated]

### Assistant | 2026-06-20T02:33:27.907Z

All 7 pass, 0 skipped, 0 todo. Now the critical R9 verification: would the negative tests actually FAIL if the skip logic broke? The negative tests assert `pickModel|skip reason=` appears on stderr — which requires the prompt to fall through past the skip block. Let me confirm by checking git history (is this an untracked file or a modified one) and a quick mutation check on the regex.

### Assistant | 2026-06-20T02:33:29.992Z

[tool_use: Bash]

### User | 2026-06-20T02:33:34.882Z

[tool_result]  .claude/hooks/prompt-rewriter-ollama.mjs | 20 ++++++++++++++++++++
 1 file changed, 20 insertions(+)
--- untracked status ---
 M .claude/hooks/__tests__/mcp-bridge-enforce-pretool.test.mjs
 M .claude/hooks/prompt-rewriter-ollama.mjs
?? .claude/hooks/__tests__/big-data-read-enforce.test.mjs
?? .claude/hooks/__tests__/grep-index-first-nim-migrate.test.mjs
?? .claude/hooks/__tests__/orchestrator-adv
... [+347 chars truncated]

### Assistant | 2026-06-20T02:33:37.964Z

The diff confirms exactly the described change: +20 lines, the constant + skip block. The test file is new (untracked). Let me view the actual diff to confirm nothing else changed in the hook, and do the R9 mutation proof (verify a removed/broken skip makes the directive tests fail).

### Assistant | 2026-06-20T02:33:44.472Z

[tool_use: Bash]

### User | 2026-06-20T02:33:50.443Z

[tool_result] diff --git a/.claude/hooks/prompt-rewriter-ollama.mjs b/.claude/hooks/prompt-rewriter-ollama.mjs
index 10cac8f615..bc67ec57ad 100644
--- a/.claude/hooks/prompt-rewriter-ollama.mjs
+++ b/.claude/hooks/prompt-rewriter-ollama.mjs
@@ -89,6 +89,16 @@ const LOG_PATH = LOG_PATH_ENV === "off"
 
 const MIN_VISIBLE_CHARS = 20; // below this → skip (not worth an LLM call)
 const OPTOUT_RE = /\[\s*(?:RAW|SKIP
... [+2706 chars truncated]

### Assistant | 2026-06-20T02:33:56.336Z

R9 mutation proof confirms: breaking the skip regex makes all 4 directive tests FAIL (and the negatives still pass, proving they're not coupled to the skip). The tests are real behavioral oracles. The hook was restored cleanly. The diff is exactly the two described changes and nothing else.

Let me do one final adversarial check — the `[^\]]*` greedy backtracking the task flagged. I want to confirm there's no catastrophic backtracking (ReDoS) risk on a pathological input.

### Assistant | 2026-06-20T02:34:00.472Z

[tool_use: Bash]

### User | 2026-06-20T02:34:07.144Z

[tool_result] no-close-no-kw match=false ms=0.27
kw-repeat-no-close match=false ms=2790.69
ws-then-kw-no-close match=false ms=0.11

### Assistant | 2026-06-20T02:34:11.258Z

Important finding. The `kw-repeat-no-close` pathological input — a leading `[` followed by the keyword phrase repeated ~20,000 times with NO closing `]` — takes **2.79 seconds** to evaluate (vs ~0.1ms for normal input). That is catastrophic backtracking: once `\b(?:...BUILD|BUILD LOOP...)\b` matches deep in the string, the trailing `[^\]]*\]` fails to find a `]`, and the engine backtracks across every prior keyword-match position. Let me confirm the scaling to characterize severity precisely.

### Assistant | 2026-06-20T02:34:13.467Z

[tool_use: Bash]

### User | 2026-06-20T02:34:19.213Z

[tool_result] repeats=2000 ms=25.4
repeats=4000 ms=108.2
repeats=8000 ms=417.9
repeats=16000 ms=1992.8

### Assistant | 2026-06-20T02:34:47.742Z

Confirmed quadratic scaling (2k→25ms, 4k→108ms, 8k→418ms, 16k→2000ms — each doubling ~4x the time, i.e. O(n²)). This is super-linear backtracking, not catastrophic-exponential, but it is a real super-linear blowup on attacker-or-paste-controlled input.

I have everything I need to grade. Let me weigh the severity of this finding in context.

**Context that bounds the severity:**
- The input is `payload.prompt` — operator/user typed (or pasted) text, not a network-untrusted source. A 16k-keyword-repeat prompt (~272KB) is not something an operator types.
- The hook is UserPromptSubmit. It runs once per prompt and is bounded only by Claude Code's own hook timeout (not the hook's `WALL_TIMEOUT_MS`, which only guards the Ollama fetch via AbortController — the regex runs synchronously *before* the AbortController is created at line 324). So a slow regex here is not abortable.
- Worst realistic case: a user pastes a very large prompt that happens to start with `[` and contains many `BUILD`/`AUTONOMOUS BUILD` tokens with no `]`. At a few hundred KB this adds hundreds of ms to multi-seconds of CPU before the prompt is processed — a latency regression on that one prompt, never a broken prompt (the hook still `exit(0)`s, raw prompt still reaches the model).

This is a P2 (deferrable hardening), not a P0/P1: it cannot break prompt handling, only add latency on a pathological/pasted input that an operator would not normally produce. The fix is trivial (anchor the closing bracket differently, e.g. test only the first line or first ~200 chars, or use `\[([^\]]*)\]` captured-once then test the inner text). Everything else in the change is correct.

---

VERDICT: PASS

summary: The 2-file change is correct, surgical, and well-tested. `LOOP_DIRECTIVE_RE` is properly start-anchored (`^\s*\[`) so mid-sentence "build loop" mentions are not skipped, the skip block is placed correctly in the skip-chain (after opt-out, before too-short/throttle/pickModel), and it matches the file's `dbg`+`
... [+3100 chars truncated]
