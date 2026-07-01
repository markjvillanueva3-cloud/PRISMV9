---
type: "chat-session"
source: "claude-code-cli"
session_id: "930f37b5-d5cf-4924-8d86-d7713730da3d"
title: "Independent review of U-CSFH-11-CALIB-PERSIST (durable SFC L1 calibration persis"
date: "2026-06-12"
first_ts: "2026-06-12T04:00:21.660Z"
last_ts: "2026-06-12T04:02:02.720Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a7c98b7024eb594bc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Independent review of U-CSFH-11-CALIB-PERSIST (durable SFC L1 calibration persis

> **claude-code-cli** | 2026-06-12 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a7c98b7024eb594bc.jsonl`

## Transcript

### User | 2026-06-12T04:00:21.660Z

Independent review of U-CSFH-11-CALIB-PERSIST (durable SFC L1 calibration persistence). Weight on: the fail-soft contract, security/safety of the file I/O, whether the existing learning behavior is preserved, integration with the feedback path, and test integrity.

Files:
- Engine diff: `command git -C H:/prism-slot-oscar --no-pager diff -- mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts`
- Test (read fully): H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\calib-persist.test.ts
- Atomic write helper (verify the contract): H:\prism-slot-oscar\mcp-server\src\utils\atomicWrite.ts (safeWriteSync)

Context: the SelfLearningSystem learns calibration multipliers (speed/feed/tool_life/surface_finish, range [0.5,2.0]) from shop-floor feedback. U-CSFH-11 persists them to data/state/sfc-calib-factors.json (atomic tmp+rename), loads on construct, sanitizes on load. The path is env-overridable (PRISM_SFC_CALIB_STATE_PATH). This is the prerequisite for the keystone U-OSC9-CALIB-APPLY-WIRE which multiplies CANONICAL PHYSICS by these factors -- so a corrupt persisted factor must NOT survive into the apply step. Already verified (tsx): all paths pass; tsc clean.

Verify and decide:
- Safety: the loaded factors feed (in the next unit) a multiply on canonical cutting-physics. Is the load-side sanitize (clamp to [0.5,2.0], non-finite->fallback) a SUFFICIENT guard so a hand-edited/corrupt/adversarial state file cannot inject a dangerous multiplier (e.g. 999x speed, negative, NaN, Infinity) into the physics? Trace: does EVERY loaded factor (global AND segment) pass through sanitizeFactor?
- Fail-soft: confirm load()/persist() swallow ALL errors and never propagate. Is recordFeedback still correct if persist throws internally (it's caught)? Does a load failure leave the engine in a valid default state?
- Behavior preservation: does the edit change ANY existing output of recordFeedback / getCalibrationFactors / applyWindow beyond adding persistence? (The 401-gauntlet + existing SFC 
... [+1438 chars truncated]

### Assistant | 2026-06-12T04:00:24.646Z

I'll review the files systematically. Let me read them all first.

### Assistant | 2026-06-12T04:00:25.576Z

[tool_use: Bash]

### Assistant | 2026-06-12T04:00:26.043Z

[tool_use: Read]

### Assistant | 2026-06-12T04:00:26.085Z

[tool_use: Read]

### User | 2026-06-12T04:00:31.950Z

[tool_result] diff --git a/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts b/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts
index d23bea91f2..da4b2beabd 100644
--- a/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts
+++ b/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts
@@ -61,6 +61,10 @@ import {
 // discarded before the AI-ladder sink." This import + the captureRecommendation
 // method 
... [+4876 chars truncated]

### User | 2026-06-12T04:00:32.551Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\utils\atomicWrite.ts' was already read 11m ago in this session and is unchanged (mtime 1779249454500). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-06-12T04:00:32.829Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\calib-persist.test.ts' was already read 15s ago in this session and is unchanged (mtime 1781236721047). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: 
... [+19 chars truncated]

### Assistant | 2026-06-12T04:00:35.464Z

The read-once guard tells me the test and atomicWrite files are already in context from a prior read. Let me retrieve their content via grep since I can't re-read them directly.

### Assistant | 2026-06-12T04:00:36.486Z

[tool_use: Grep]

### Assistant | 2026-06-12T04:00:37.247Z

[tool_use: Grep]

### User | 2026-06-12T04:00:38.978Z

[tool_result] 1:/**
2: * Tests for L1 calibration persistence (U-CSFH-11-CALIB-PERSIST).
3: *
4: * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-11.
5: *
6: * The SelfLearningSystem learned `globalFactors`/`segmentFactors` from shop-floor
7: * feedback but they were IN-MEMORY ZEROED on every restart -- so the calibration
8: * loop could never compound across sessions. U-CSFH-11 adds fail-soft load-on-
9: * construc
... [+5647 chars truncated]

### User | 2026-06-12T04:00:39.373Z

[tool_result] 1:/**
2: * atomicWrite — async atomic file writer for JSON state files.
3: *
4: * Writes to <path>.tmp then renames to <path>. NTFS rename within same
5: * volume is atomic, avoiding truncate-then-write race conditions.
6: *
7: * Unlike atomicSessionWrite.atomicWriteJson (sync, takes object), this:
8: * - Is async (returns Promise)
9: * - Takes pre-stringified content (caller controls formatting)

... [+1852 chars truncated]

### Assistant | 2026-06-12T04:00:41.573Z

Now let me also check for the `composeSegmentKey` export and the `getCalibrationFactors` signature to understand the full contract around factor retrieval:

### Assistant | 2026-06-12T04:00:43.410Z

[tool_use: Grep]

### Assistant | 2026-06-12T04:00:44.338Z

[tool_use: Grep]

### User | 2026-06-12T04:00:45.085Z

[tool_result] 450:export function composeSegmentKey(ctx: { material?: string; toolMaterial?: string; regime?: string } | undefined): string {
520:  private globalFactors: Record<string, number> = {
526:  private segmentFactors: Map<string, Record<string, number>> = new Map();
576:        globalFactors: this.globalFactors,
577:        segmentFactors: [...this.segmentFactors.entries()],
628:  getCalibrationFactor
... [+657 chars truncated]

### User | 2026-06-12T04:00:46.108Z

[tool_result] 83:const SEG_FACTOR_MIN = 0.5;
84:const SEG_FACTOR_MAX = 2.0;
88:const CALIB_HISTORY_CAP = 200; // persist only the last N feedback entries (keeps the last-20 learning window warm)
95:  return typeof v === "number" && Number.isFinite(v) ? Math.min(SEG_FACTOR_MAX, Math.max(SEG_FACTOR_MIN, v)) : fallback;
593:    this.applyWindow(this.globalFactors, this.feedbackHistory);
602:      const segHistory 
... [+422 chars truncated]

### Assistant | 2026-06-12T04:00:49.160Z

Now let me check the `getCalibrationFactors` implementation on `SelfLearningSystem` and the `globalFactors` initial values to verify the full sanitization trace:

### Assistant | 2026-06-12T04:00:50.422Z

[tool_use: Grep]

### User | 2026-06-12T04:00:54.258Z

[tool_result] 516-class SelfLearningSystem {
517-  private feedbackHistory: FeedbackEntry[] = [];
518-  // U-OSC9-SEGMENTED-CALIBRATION: globalFactors (was calibrationFactors) is the fallback bucket;
519-  // segmentFactors holds per-(iso|tool|regime) factors, lazily seeded from global on first feedback.
520:  private globalFactors: Record<string, number> = {
521:    speed: 1.0,
522:    feed: 1.0,
523-    tool_
... [+4167 chars truncated]

### Assistant | 2026-06-12T04:02:02.720Z

I now have everything I need to render a complete verdict. Here is the full analysis.

---

## Review: U-CSFH-11-CALIB-PERSIST

### 1. Safety — Sanitization Coverage

**Global factors.** The load loop iterates over `Object.keys(this.globalFactors)` — the four keys that exist at construction time (`speed`, `feed`, `tool_life`, `surface_finish`). Every value pulled from the raw JSON is routed through `sanitizeFactor` before being assigned back into the live struct. There is no path that assigns a raw parsed value directly.

**Segment factors.** The inner loop also iterates `Object.keys(this.globalFactors)` as the key set, calling `sanitizeFactor` on each value with fallback `1.0`. A segment entry whose key is not one of the four canonical keys is silently ignored — correct, because the learner only reads back the four it wrote.

**Apply-side secondary guard.** Every call site that consumes a factor wraps it in `Number.isFinite(calibration.X) && calibration.X > 0 ? calibration.X : 1.0`. This is a secondary belt-and-suspenders check. After sanitizeFactor, a factor is guaranteed to be a finite number in `[0.5, 2.0]`, so the secondary guard is redundant but harmless and safe. A value of `0.5` does pass `> 0`, which is correct — the minimum valid multiplier is `0.5`, not `0`.

**Adversarial inputs.** `999` clamps to `2.0`, `-5` clamps to `0.5`, `NaN` serializes to `null` in JSON (JS `JSON.stringify(NaN) === "null"`), and `null` fails the `typeof v === "number"` check, falling back to the provided default. `Infinity` and `-Infinity` fail `Number.isFinite`. All injection vectors are closed.

**Conclusion:** sanitization is sufficient. No loaded value — global or segment — can survive into the physics multiply path with a value outside `[0.5, 2.0]`.

---

### 2. Fail-Soft Contract

**`load()`.** Wrapped in a single `try/catch` that swallows everything. An early `return` on missing file or unknown schema leaves all four `globalFactors` at their initializer value of `1.0` and `
... [+9253 chars truncated]
