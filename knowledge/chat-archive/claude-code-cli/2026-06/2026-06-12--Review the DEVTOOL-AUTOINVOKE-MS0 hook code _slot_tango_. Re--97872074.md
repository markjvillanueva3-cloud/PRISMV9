---
type: "chat-session"
source: "claude-code-cli"
session_id: "97872074-49d2-49e4-8faa-3e7fbb4fbadf"
title: "Review the DEVTOOL-AUTOINVOKE-MS0 hook code (slot:tango). Reviewer ARM C — weigh"
date: "2026-06-12"
first_ts: "2026-06-12T17:01:42.974Z"
last_ts: "2026-06-12T17:13:53.427Z"
cwd: "H:\\prism-slot-tango"
messages: 85
user_msgs: 33
assistant_msgs: 52
raw_file: "H:/.claude/projects/H--prism-slot-tango/97872074-49d2-49e4-8faa-3e7fbb4fbadf/subagents/agent-a8219a1820eeb4e38.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:13"
---

# Review the DEVTOOL-AUTOINVOKE-MS0 hook code (slot:tango). Reviewer ARM C — weigh

> **claude-code-cli** | 2026-06-12 | 85 msgs (33 user / 52 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/97872074-49d2-49e4-8faa-3e7fbb4fbadf/subagents/agent-a8219a1820eeb4e38.jsonl`

## Transcript

### User | 2026-06-12T17:01:42.974Z

Review the DEVTOOL-AUTOINVOKE-MS0 hook code (slot:tango). Reviewer ARM C — weighted to silent breakage, I/O safety, error-budget completeness. Do NOT assume arms A/B caught everything.

The CODE (markdown spec/command bodies are out of scope):
1. H:/prism/.claude/hooks/ollama-pipeline-injector.mjs (U1: "forge-build" trigger + route)
2. H:/prism/.claude/hooks/ollama-prewarm-on-pipeline.mjs (U1: 5 forge-* prewarm keys)
3. H:/prism/.claude/hooks/task-start-substrate-inject.mjs (U3: Path B planning branch; the PLAN_TRIGGER_RE regex was just widened to `pick-(unit|dev|task|build-close)`)
4. H:/prism/.claude/hooks/__tests__/task-start-substrate-inject.test.mjs

These are WIRED hooks firing on the fleet's hot path (ollama-pipeline-injector + task-start-substrate-inject fire on every UserPromptSubmit). Hunt for:
1. **Silent breakage of the live hook chain**: do the additive changes change ANY existing output/exit path? Could the forge-build trigger or Path B ever throw / hang / emit malformed JSON that breaks the UserPromptSubmit hook contract? Run `cd /h/prism && node --check` on all 3 + `node --test .claude/hooks/__tests__/task-start-substrate-inject.test.mjs` (expect 12/12).
2. **I/O safety**: task-start-substrate-inject reads stdin + a loop-state file by session_id. Confirm safeSid() is still injection-safe and the hook ALWAYS exits 0 (advisory, never blocks a prompt) on every path incl. the new Path B.
3. **prewarm side-effects**: ollama-prewarm spawns a detached curl to warm a model. Confirm the 5 new forge-* keys don't change the cooldown/stamp logic or cause a prewarm storm.
4. **Regex safety**: the widened PLAN_TRIGGER_RE — ReDoS-safe? Any catastrophic backtracking?
5. Anything arms A/B might have missed about how these fire together under a real prompt.

Run commands as needed. Report P0/P1/P2 with file:line. END with "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-06-12T17:01:47.779Z

I'll review the DEVTOOL-AUTOINVOKE-MS0 hook code as Reviewer ARM C, weighted to silent breakage, I/O safety, and error-budget completeness. Let me start by reading all the target files and running the verification commands.

### Assistant | 2026-06-12T17:01:48.194Z

[tool_use: Read]

### Assistant | 2026-06-12T17:01:48.676Z

[tool_use: Read]

### Assistant | 2026-06-12T17:01:49.615Z

[tool_use: Read]

### Assistant | 2026-06-12T17:01:49.712Z

[tool_use: Read]

### User | 2026-06-12T17:01:52.540Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\ollama-pipeline-injector.mjs' was already read 10m ago in this session and is unchanged (mtime 1781276230120). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-12T17:01:52.743Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\ollama-prewarm-on-pipeline.mjs' was already read 10m ago in this session and is unchanged (mtime 1781276230128). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-06-12T17:01:52.993Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\__tests__\task-start-substrate-inject.test.mjs' was already read 10m ago in this session and is unchanged (mtime 1781282190961). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: P
... [+18 chars truncated]

### User | 2026-06-12T17:01:53.561Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * task-start-substrate-inject.mjs -- RGS-PLANNING-LOOP-BRIDGE-MS0/U7 (2026-06-11, slot:tango)
5	 *
6	 * UserPromptSubmit / SubagentStart injector. When a /loop is ACTIVE for this
7	 * session, surface the U2 substrate-routing plan (Ollama / Obsidian / Hermes /
8	 * Master-graph / PSN -- when/how/max-out) for the loop's current task, so each
9	 * iterati
... [+4763 chars truncated]

### Assistant | 2026-06-12T17:01:56.697Z

The read-once guard says the other 3 files are already in my context from 10m ago, but I don't actually have that content visible in this fresh session turn. Let me re-read them with the cache disabled and run the verification commands.

### Assistant | 2026-06-12T17:01:57.645Z

[tool_use: Bash]

### Assistant | 2026-06-12T17:01:58.605Z

[tool_use: Bash]

### Assistant | 2026-06-12T17:01:59.228Z

[tool_use: Bash]

### User | 2026-06-12T17:02:27.984Z

[tool_result] #!/usr/bin/env node
// tier: T2
/**
 * ollama-pipeline-injector.mjs — UserPromptSubmit hook
 *
 * Fires when the user invokes /forge, /forge-audit, /rgs, /scrutinize, /dedup,
 * /precompact, /handoff or any pipeline that historically did NOT route work
 * to Ollama even though the local models were loaded and idle.
 *
 * Injects an additionalContext block listing CONCRETE Ollama+Docker routes
 * t
... [+15217 chars truncated]

### User | 2026-06-12T17:02:39.060Z

[tool_result] // Tests for task-start-substrate-inject.mjs (U7). Real values; fail on real
// regression (R9). Drives the hook as a subprocess with a real temp loop-state.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HOOK
... [+5000 chars truncated]

### User | 2026-06-12T17:02:39.369Z

[tool_result] #!/usr/bin/env node
// tier: T3
/**
 * ollama-prewarm-on-pipeline.mjs — UserPromptSubmit hook
 *
 * When a pipeline trigger fires (/forge*, /rgs, /scrutinize, /dedup,
 * /deep-search, /pdf-learn, /close-out-audit, /precompact) AND the
 * required Ollama model is NOT yet warm in VRAM, fire a tiny
 * background /api/generate request to pre-load it. Returns instantly;
 * the model warms while Claude 
... [+5515 chars truncated]

### Assistant | 2026-06-12T17:02:42.389Z

Now let me run the verification commands: `node --check` on all 3 source files and the test suite.

### Assistant | 2026-06-12T17:02:44.730Z

[tool_use: Bash]

### Assistant | 2026-06-12T17:02:45.423Z

[tool_use: Bash]

### User | 2026-06-12T17:02:58.156Z

[tool_result] === check 1: ollama-pipeline-injector ===
OK1
=== check 2: ollama-prewarm-on-pipeline ===
OK2
=== check 3: task-start-substrate-inject ===
OK3

### User | 2026-06-12T17:03:11.024Z

[tool_result]   ...
# Subtest: ended loop (status != running) -> no-op
ok 9 - ended loop (status != running) -> no-op
  ---
  duration_ms: 46.8075
  ...
# Subtest: PRISM_SUBSTRATE_INJECT=0 disables the hook entirely
ok 10 - PRISM_SUBSTRATE_INJECT=0 disables the hook entirely
  ---
  duration_ms: 51.1067
  ...
# Subtest: missing session_id -> no-op (never crashes)
ok 11 - missing session_id -> no-op (never crash
... [+340 chars truncated]

### Assistant | 2026-06-12T17:03:15.090Z

All 3 files pass `node --check` and the test suite is 12/12 PASS. Now let me dig into the behavioral correctness of each concern. First, the regex safety analysis (ReDoS) on the new/widened regexes, and the dependency `routeTask`.

### Assistant | 2026-06-12T17:03:30.299Z

[tool_use: Bash]

### User | 2026-06-12T17:03:40.850Z

[tool_result] PLAN pathological /pick-: 0.0134 ms/call  (len=50006)
PLAN pathological /rgs: 0.0142 ms/call  (len=50004)
PLAN many slashes: 0.0108 ms/call  (len=50001)
PLAN /propose-goal junk: 0.0114 ms/call  (len=50012)
PLAN normal: 0.0000 ms/call  (len=23)
forge-build pathological: 0.0817 ms/call  (len=300007)
forge-build normal: 0.0000 ms/call  (len=18)
prewarm pathological /forge-: 0.0031 ms/call  (len=50007
... [+106 chars truncated]

### Assistant | 2026-06-12T17:03:47.421Z

Regexes are all linear — no catastrophic backtracking even on 50K-300K char pathological inputs (worst case 0.1ms/call). These are simple anchored alternations of literals; no nested quantifiers. ReDoS-safe.

Now let me verify the critical I/O-safety claim: that Path B (and the planning branch) ALWAYS exits 0, and that `routeTask` cannot throw/hang in a way the try/catch misses. Let me check the `routeTask` dependency and exercise the hook with adversarial payloads.

### Assistant | 2026-06-12T17:03:48.836Z

[tool_use: Bash]

### Assistant | 2026-06-12T17:03:49.896Z

[tool_use: Bash]

### User | 2026-06-12T17:03:54.443Z

[tool_result] === routeTask signature + throw surface ===
// RGS-PLANNING-LOOP-BRIDGE-MS0/U2 (2026-06-11, slot:tango)
// Per-task substrate-routing matrix: given a task + phase + context, decide the
// PRIMARY executor and emit the 5-substrate plan (Ollama / Obsidian / Hermes /
// Master-graph / PSN) with when/how/max-out for each. The "max out their
// capabilities" answer (U-SPEC-V2 section 4), made determini
... [+3161 chars truncated]

### User | 2026-06-12T17:03:55.166Z

[tool_result] 37:export function routeTask(taskType, phase, ctx = {}) {

### Assistant | 2026-06-12T17:03:59.991Z

`routeTask` and its transitive deps (`forge-route.mjs`, `hermes-workflow-planner.mjs`) contain no `throw`, no `process.exit`, no blocking I/O (`readFileSync`/`spawnSync`/`execSync`), and no `while(true)` infinite loops. It's pure compute. Even so, the hook wraps the `routeTask` calls in try/catch → `process.exit(0)`, so any unexpected throw is contained.

Now let me verify the I/O-safety claims empirically: adversarial payloads to task-start-substrate-inject (malformed JSON, non-string prompt, injection chars in session_id, huge prompt) and confirm exit 0 + no stdout-corruption on every path.

### Assistant | 2026-06-12T17:04:05.786Z

[tool_use: Bash]

### User | 2026-06-12T17:04:07.647Z

[tool_result] The argument 'args[1]' must be a string without null bytes. Received "source /c/Users/wompu/.claude/shell-snapshots/snapshot-bash-1781271468167-64qp0t.sh 2>/dev/null || true && export TEMP='C:\Users\wompu\AppData\Local\Temp' TMP='C:\Users\wompu\AppData\Local\Temp' && shopt -u extglob 2>/dev/null || true && eval 'cd /h/prism && H=\"$PWD/.claude/hooks/task-start-substrate-inject.mjs\"
runp() { local
... [+1307 chars truncated]

### Assistant | 2026-06-12T17:04:10.223Z

The shell got tangled by my nested quoting. Let me use a cleaner approach with a Node-based harness file to drive the hook with adversarial payloads.

### Assistant | 2026-06-12T17:04:19.154Z

[tool_use: Bash]

### User | 2026-06-12T17:05:25.504Z

[tool_result] Exit code 255

### Assistant | 2026-06-12T17:05:28.028Z

[tool_use: Bash]

### User | 2026-06-12T17:06:10.106Z

[tool_result] node:internal/modules/cjs/loader:1252
  throw err;
  ^

Error: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\adv_test.mjs'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1249:15)
    at Function._load (node:internal/modules/cjs/loader:1075:27)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loade
... [+231 chars truncated]

### Assistant | 2026-06-12T17:06:15.060Z

The `/tmp` path is being resolved against the Windows temp dir by the bash-to-Windows path translation. Let me write the harness into the repo tree instead.

### Assistant | 2026-06-12T17:06:25.506Z

[tool_use: Bash]

### system

... [5 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-12T17:07:23.627Z

[tool_use: Write]

### User | 2026-06-12T17:07:32.138Z

[tool_result] File created successfully at: H:/prism/safesid_tmp.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-12T17:07:36.498Z

[tool_use: Bash]

### User | 2026-06-12T17:08:04.123Z

[tool_result] in="../../../../etc/passwd" -> sid="____________etc_passwd" escapes_dir=false
in="a/b c" -> sid="a_b_c" escapes_dir=false
in="..\\..\\windows" -> sid="______windows" escapes_dir=false
in="x y" -> sid="x_y" escapes_dir=false
in="%2e%2e%2f" -> sid="_2e_2e_2f" escapes_dir=false
in="con" -> sid="con" escapes_dir=false
in="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
... [+751 chars truncated]

### Assistant | 2026-06-12T17:08:10.919Z

`safeSid` is bulletproof: `[^A-Za-z0-9_-]` whitelist strips every path separator, dot, percent-encoding, command-substitution char, and backtick; the 64-char cap bounds length; the `|| "global"` fallback handles empty/null. **No input escapes LOOP_DIR** — confirmed for all 12 traversal/injection cases. The `safeSid` was unchanged by U3 (only `PLAN_TRIGGER_RE` widened), and remains injection-safe.

Now let me verify the prewarm side-effects concern (concern #3): confirm the 5 new `forge-*` keys don't alter cooldown/stamp logic or cause a prewarm storm. The key risk is `forge-engines`/`forge-tests`/etc. all map to the same model (`qwen2.5-coder:32b`), and cooldown is **per-model** — so let me confirm a chat firing several forge-* commands won't re-warm repeatedly.

### Assistant | 2026-06-12T17:08:22.754Z

[tool_use: Bash]

### User | 2026-06-12T17:08:44.665Z

[tool_result] distinct models (=stamp files): [ 'qwen2.5-coder:32b', 'nomic-embed-text' ]
  /forge-engines -> model=qwen2.5-coder:32b stampKey=qwen2.5-coder_32b
  /forge-tests -> model=qwen2.5-coder:32b stampKey=qwen2.5-coder_32b
  /forge-schema -> model=qwen2.5-coder:32b stampKey=qwen2.5-coder_32b
  /forge-skills -> model=qwen2.5-coder:32b stampKey=qwen2.5-coder_32b
  /forge-wiring -> model=qwen2.5-coder:32b s
... [+510 chars truncated]

### Assistant | 2026-06-12T17:08:49.196Z

Interesting — `matchTrigger` returned `null` for ALL prompts in my standalone probe, including `/forge-engines`. That's because in my probe the alternation order has `forge-engines` etc. but JS regex `RegExp` from a joined string... let me investigate. The probe matched null even for `/forge-audit` which is the FIRST key. This suggests a real ordering/word-boundary subtlety. Let me check what's happening — this could be a real bug, OR a probe artifact. Let me test the ACTUAL hook directly rather than my reconstruction.

### Assistant | 2026-06-12T17:08:58.196Z

[tool_use: Bash]

### User | 2026-06-12T17:09:07.079Z

[tool_result] RE source: \/(forge-audit|forge2|forge-triple|rgs|rgs2|rgs-sync|scrutinize|scrutiny-3way|dedup|precom ...
  "/forge-engines now" -> null
  "/forge-tests" -> null
  "/forge-audit" -> null
  "/rgs build" -> null
  "/dedup" -> null
  "/forge-engineering" -> null
  "not a cmd" -> null

### Assistant | 2026-06-12T17:09:12.401Z

Even `/forge-audit` and `/rgs build` return `null` from the re-derived regex — but those are PRE-EXISTING keys that the hook has matched in production for weeks. Something is wrong with how my probe builds the regex from a template literal in a heredoc. The `\\b` is being interpreted oddly. Let me check what `TRIGGER_RE.source` actually contains at the boundary — the `\\b` may have collapsed. Let me inspect the exact byte content and also import the regex behavior in a non-heredoc way.

### Assistant | 2026-06-12T17:09:15.803Z

[tool_use: Write]

### User | 2026-06-12T17:09:25.471Z

[tool_result] File created successfully at: H:/prism/prewarm_re_probe.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-12T17:09:29.762Z

[tool_use: Bash]

### User | 2026-06-12T17:09:41.286Z

[tool_result] source = \/(forge-audit|forge2|forge-triple|rgs|rgs2|rgs-sync|scrutinize|scrutiny-3way|dedup|precompact|deep-search|pdf-learn|video-learn|close-out-audit|forge-engines|forge-tests|forge-schema|forge-skills|forge-wiring)\b
last 6 chars of source = "ing)\\b"
  "/forge-engines now" -> forge-engines
  "/forge-tests" -> forge-tests
  "/forge-audit" -> forge-audit
  "/rgs build" -> rgs
  "/dedup" -> ded
... [+33 chars truncated]

### Assistant | 2026-06-12T17:09:48.234Z

Confirmed — it was a **heredoc escaping artifact** (the `\\b` in the bash heredoc was being mangled, so my earlier probes used a broken regex). With the regex built from a real `.mjs` file, matching works perfectly:

- `/forge-engines now` → `forge-engines` ✓
- `/forge-tests` → `forge-tests` ✓
- `/forge-audit` → `forge-audit` ✓ (pre-existing, still works)
- `/forge-engineering` → `null` ✓ (`\b` word-boundary correctly rejects the superstring)

So the 5 new forge-* keys match correctly and the `\b` boundary is intact. Now the critical prewarm-storm question: all 5 new keys map to the SAME model (`qwen2.5-coder:32b`), and there are only 2 distinct models → 2 stamp files. The cooldown is keyed by model. Let me trace the exact ordering of `inCooldown` / `ollamaUp` / `loadWarmModels` / `stampCooldown` / `warmModel` to confirm no storm and that the new keys touch nothing.

### Assistant | 2026-06-12T17:09:50.917Z

[tool_use: Bash]

### User | 2026-06-12T17:10:26.912Z

[tool_result] 923880ffb7 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DEVTOOL-AUTOINVOKE-MS0]/U3: task-start-substrate-inject Path B -- planning-command branch (/checkin /goal /propose-goal /rgs /pick-* /plan-build /smart) fires substrate matrix when no active loop. One mechanism = planning dev-situation universally. 12/12 tests (4 new), no regression. Knob PRISM_SUBSTRATE_INJECT_PLAN=0. + U2/P9 goal-ship-report REJECTED (
... [+2290 chars truncated]

### Assistant | 2026-06-12T17:10:31.633Z

Now I can see the exact U3 change to `PLAN_TRIGGER_RE`. The widening went from `pick-unit|pick-dev` to `pick-(unit|dev|task|build-close)`. Let me see the rest of the diff (the U1 prewarm + injector changes) and verify the regex semantics are equivalent + correct for the new alternatives.

### Assistant | 2026-06-12T17:10:33.325Z

[tool_use: Bash]

### User | 2026-06-12T17:10:41.786Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-12T17:10:46.080Z

[tool_use: Bash]

### User | 2026-06-12T17:10:57.451Z

[tool_result] === prewarm diff ===
diff --git a/.claude/hooks/ollama-prewarm-on-pipeline.mjs b/.claude/hooks/ollama-prewarm-on-pipeline.mjs
index eedf6f84d9..8e75a0ce0b 100644
--- a/.claude/hooks/ollama-prewarm-on-pipeline.mjs
+++ b/.claude/hooks/ollama-prewarm-on-pipeline.mjs
@@ -50,6 +50,11 @@ const PIPELINE_MODELS = {
   "pdf-learn": "qwen2.5-coder:32b",
   "video-learn": "qwen2.5-coder:32b",
   "close-out-a
... [+2149 chars truncated]

### Assistant | 2026-06-12T17:11:03.654Z

I now have the complete change surface. All three changes are purely additive: 5 model-map entries, 1 trigger+route in injector, 1 regex widening. Let me run the final cross-cutting verification: the two key correctness checks — (a) the injector's `forge-build` trigger ordering doesn't shadow `forge7` (both could match `/forge-...`), and (b) the new `pick-task`/`pick-build-close` plan alternatives actually match. Then confirm no prewarm-storm by tracing the cooldown gate once more.

### Assistant | 2026-06-12T17:11:11.513Z

[tool_use: Write]

### User | 2026-06-12T17:11:24.291Z

[tool_result] File created successfully at: H:/prism/final_probe.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-12T17:11:27.027Z

[tool_use: Bash]

### User | 2026-06-12T17:11:35.960Z

[tool_result] == injector pipeline trigger matching ==
  /forge-engines         -> forge-build
  /forge-tests           -> forge-build
  /forge-schema          -> forge-build
  /forge-skills          -> forge-build
  /forge-wiring          -> forge-build
  /forge-audit           -> forge-audit
  /forge7                -> forge7
  /forge-triple          -> forge-triple
  /forge-engineering     -> null
  /forge-h
... [+653 chars truncated]

### Assistant | 2026-06-12T17:11:47.573Z

All matching is correct. Key findings from this final probe:

**(a) Injector trigger ordering — no collision:** `forge-build` matches only the 5 specific suffixes (`engines/tests/schema/skills/wiring`); `/forge-audit`, `/forge7`, `/forge-triple`, `/forge-hooks`, `/forge5` all still route to their pre-existing keys (first-match-wins, and the alternations are disjoint). `/forge-engineering` correctly rejects (word boundary). **The additive `forge-build` entry does not shadow or get shadowed by any existing trigger.**

**(b) Widened PLAN_TRIGGER_RE — correct:** All 6 plan commands match including the 2 new alternatives `pick-task` and `pick-build-close`. The nested group `pick-(unit|dev|task|build-close)` correctly captures into the OUTER group `m[1]` (the `String.match` `m[1]` refers to group 1 = the outer `(...)`, which spans the whole `pick-...` token). `/pick-banana`, `/picking`, `/goalkeeper` correctly reject. 

One subtle but harmless observation worth noting: the regex has TWO capture groups now (the outer alternation `(...)` = group 1, and the inner `pick-(...)` = group 2). `planCommand` uses `m[1]` which is correct — it gets the full token (`pick-build-close`), not the inner fragment. This is correct and the test suite confirms it.

Now let me verify the prewarm cooldown gate truly prevents a storm (the new keys share the qwen stamp file) and do a final confirmation that the prewarm hook always exits cleanly even when curl is missing/hangs. Let me check the cooldown logic ordering once more and confirm the stamp directory is the shared one.

### Assistant | 2026-06-12T17:11:50.522Z

[tool_use: Bash]

### User | 2026-06-12T17:11:58.471Z

[tool_result] === stamp dir contents (shared per-model) ===
total 1796
drwxr-xr-x 1 wompu 197611  0 Jun  9 13:46 ./
drwxr-xr-x 1 wompu 197611  0 Jun 12 12:11 ../
-rw-r--r-- 1 wompu 197611 24 Jun 12 07:25 nomic-embed-text.iso
-rw-r--r-- 1 wompu 197611 24 May 30 21:44 qwen2.5-coder_14b.iso
-rw-r--r-- 1 wompu 197611 24 Jun 12 09:35 qwen2.5-coder_32b.iso
-rw-r--r-- 1 wompu 197611 24 Jun  2 15:39 qwen2.5-coder_7b.is
... [+534 chars truncated]

### Assistant | 2026-06-12T17:12:06.665Z

This confirms the prewarm-storm question definitively:

- The stamp dir already contains `qwen2.5-coder_32b.iso` (mtime today 09:35). The 5 new forge-* keys ALL map to `qwen2.5-coder:32b` → they share that ONE stamp file.
- **Gate ordering:** `inCooldown(model)` is checked FIRST (line 161), BEFORE `ollamaUp()` (166) and `warmModel()` (180). So once qwen is warmed once (by ANY of the 19 triggers), the 10-min cooldown stamp blocks every subsequent forge-* / rgs / scrutinize / etc. warm. A chat firing `/forge-engines` then `/forge-tests` then `/forge-wiring` in sequence will warm at most ONCE per 10 min. **No prewarm storm** — the new keys add zero new warm pressure beyond the already-existing qwen cooldown.

I have now verified every concern. Let me run one final consolidated confirmation of the full live hook chain (both injector + prewarm + substrate-inject firing together on a single real `/goal` and `/forge-engines` prompt) to confirm no interaction breaks the UserPromptSubmit contract, then clean up.

### Assistant | 2026-06-12T17:12:13.803Z

[tool_use: Write]

### User | 2026-06-12T17:12:27.795Z

[tool_result] File created successfully at: H:/prism/chain_probe.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-12T17:12:32.003Z

[tool_use: Bash]

### User | 2026-06-12T17:12:45.965Z

[tool_result] PROMPT "/goal improve the system"
  [injector] status=0 signal=- json_ok=true contractOk=true stderr=-
  [prewarm] status=0 signal=- json_ok=true contractOk=true stderr=-
  [substrate] status=0 signal=- json_ok=true contractOk=true stderr=-
PROMPT "/forge-engines now"
  [injector] status=0 signal=- json_ok=true contractOk=true stderr=-
  [prewarm] status=0 signal=- json_ok=true contractOk=true std
... [+552 chars truncated]

### Assistant | 2026-06-12T17:12:50.438Z

All three hooks fire together cleanly across `/goal`, `/forge-engines`, `/pick-build-close`, and a non-command prompt: **every path is status=0, no signal, valid JSON, contract-conformant, no stderr.** Let me confirm I left no temp files behind in the repo (R14 hygiene).

### Assistant | 2026-06-12T17:12:52.753Z

[tool_use: Bash]

### User | 2026-06-12T17:13:26.990Z

[tool_result] ?? .claude/helpers/_probe.test.mjs
?? mcp-server/scripts/_mcam-tooldb-probe.mjs
?? mcp-server/scripts/_tmp_machine_audit.mjs
?? scripts/_sfc-probe.mjs
?? scripts/_tmp_tb_review.mjs
?? scripts/_turning-probe.mjs
?? scripts/ollama-octopus-combo-probe.mjs
?? scripts/probe-dormant-posts.mjs
?? state/shared/tmp-count-v2.mjs
?? temp-tb-probe.mjs

### Assistant | 2026-06-12T17:13:53.427Z

None of those are mine — they're pre-existing untracked files from other slots/sessions (different names: `_mcam-tooldb-probe`, `_sfc-probe`, `_turning-probe`, etc.). My review temp files (`safesid_tmp.mjs`, `prewarm_re_probe.mjs`, `final_probe.mjs`, `chain_probe.mjs`, `adv_test_tmp.mjs`) were all `rm -f`'d in their respective commands and don't appear in the list. My tree is clean.

I have completed a thorough Arm-C review. Here is my verdict.

---

## Reviewer ARM C — DEVTOOL-AUTOINVOKE-MS0 (silent breakage / I/O safety / error-budget)

**Scope reviewed:** `ollama-pipeline-injector.mjs` (U1 forge-build trigger+route), `ollama-prewarm-on-pipeline.mjs` (U1 5 forge-* keys), `task-start-substrate-inject.mjs` (U3 Path B + widened `PLAN_TRIGGER_RE`), and the test suite.

**Verification run (all green):**
- `node --check` — all 3 source files OK.
- `node --test task-start-substrate-inject.test.mjs` → **12/12 pass** (matches expected).
- Git diff isolated the exact change surface: 3 purely additive edits (5 model-map entries, 1 injector trigger+route, 1 regex widening `pick-unit|pick-dev` → `pick-(unit|dev|task|build-close)`).

### Concern-by-concern findings

**1. Silent breakage of the live hook chain — NONE.** The changes are strictly additive. The injector `forge-build` trigger is disjoint from all existing triggers (verified: `/forge-audit`→forge-audit, `/forge7`→forge7, `/forge-triple`→forge-triple, `/forge-hooks`→forge7 all unchanged; first-match-wins ordering preserved). `/forge-engineering` correctly rejects via `\b`. No existing output/exit path altered. Full 3-hook chain probe under real prompts (`/goal`, `/forge-engines`, `/pick-build-close`, non-command): every hook **status=0, valid JSON, contract-conformant (`continue:true` / `hookSpecificOutput`), no stderr, no signal.**

**2. I/O safety — PASS.** 12 adversarial payloads to `task-start-substrate-inject` (malformed JSON, non-string/object/array prompt, null session_id, 1MB prompt, backtick+newline injection
... [+2669 chars truncated]
