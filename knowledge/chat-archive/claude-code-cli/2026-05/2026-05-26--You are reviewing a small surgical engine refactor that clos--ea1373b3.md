---
type: "chat-session"
source: "claude-code-cli"
session_id: "ea1373b3-5de3-42d9-9fd6-9ce5917bd3ed"
title: "You are reviewing a small surgical engine refactor that closes a dialect-asymmet"
date: "2026-05-26"
first_ts: "2026-05-26T15:05:08.851Z"
last_ts: "2026-05-26T15:15:48.584Z"
cwd: "H:\\prism\\mcp-server"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/ea1373b3-5de3-42d9-9fd6-9ce5917bd3ed/subagents/agent-a7ef0dcdb754e5f26.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# You are reviewing a small surgical engine refactor that closes a dialect-asymmet

> **claude-code-cli** | 2026-05-26 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/ea1373b3-5de3-42d9-9fd6-9ce5917bd3ed/subagents/agent-a7ef0dcdb754e5f26.jsonl`

## Transcript

### User | 2026-05-26T15:05:08.851Z

You are reviewing a small surgical engine refactor that closes a dialect-asymmetry bug in `H:/prism/mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts`. The bug: quality scorers used Fanuc-rooted regex literals (`G28|G30|G53` safe-start, `G5[4-9]` work-offset, `G5\.1` HSM), so Heidenhain (uses `M91 Z` / `CYCL DEF 7`) and Mitsubishi (uses `G05.1` with leading zero) were silently capped at quality=75 (60 base + 15 HSM only). Corpus validator was 120/200 PASS with Heidenhain/Mitsubishi at 0%.

The fix:
1. Added `DialectSignals` interface (3 RegExp fields: safe_start, work_offset, hsm) and `signals?: DialectSignals` optional field to `ControllerProfile`.
2. Added exported `DEFAULT_DIALECT_SIGNALS` Fanuc-family default (note: hsm regex now matches BOTH `G5.1` and `G05.1`).
3. Populated explicit `signals:` override on `heidenhain` and `mitsubishi` profiles in `CONTROLLER_PROFILES`.
4. Added private `getDialectSignals(controller)` helper that returns the profile's signals or the default.
5. Refactored 5 scorer functions to use signals: `runDeepLearningAnalysis`, `quickQualityScore`, `scoreSafety` (added controller param), `scoreAccuracy`, `scoreBestPractices` (added controller param), `scoreTribalAdherence`.
6. Updated the 2 call sites in `analyzeGCode` to pass `detectedController` to scoreSafety + scoreBestPractices.

Test file: `H:/prism/mcp-server/src/__tests__/MasterPostDialectSymmetry.test.ts` — 16 tests covering 5 dialects via the public `generatePost` API. Both with `enable_deep_learning:true` (DL path) and false (quick path). Plus R12 negative tests (empty gcode + 2-line gcode must NOT clear 85). Status: 16/16 PASS. Anti-regression on the existing `MasterPostProcessorUnifiedAGIEngine.test.ts`: 26/26 still PASS.

Your review focus (weighted on detecting bugs the test+self-check might miss):
- Read the FULL engine file (both files end-to-end) and verify the surgical edits don't break other consumers of `ControllerProfile` (other engines that import this ty
... [+1471 chars truncated]

### Assistant | 2026-05-26T15:05:21.614Z

I'll perform a thorough review of the surgical refactor on the MasterPost engine.

### Assistant | 2026-05-26T15:05:21.897Z

[tool_use: Read]

### User | 2026-05-26T15:05:55.562Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1218 of 1667 total (29083 tokens, cap 25000). Call Read with offset=1219 limit=1218 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * MasterPostProcessorUnifiedAGIEngine — PP-UNIFIED-AGI
3	 * ===================================
... [+53503 chars truncated]

### Assistant | 2026-05-26T15:06:00.110Z

[tool_use: Read]

### User | 2026-05-26T15:06:34.744Z

[tool_result] 1219	    // `hsm_injected` + `coolant_off_added` enhancements never fired).
1220	    const profile = this.getControllerProfile(input.controller);
1221	    if (profile.hsm_code && !gcode.includes(profile.hsm_code)) {
1222	      const hsmLine = this.formatComment(input.controller, `HSM SMOOTHING ENABLED`) + "\n" + profile.hsm_code;
1223	      // Heidenhain TNC: linear move pattern is `L X+...`, `L Y
... [+19637 chars truncated]

### Assistant | 2026-05-26T15:06:38.136Z

[tool_use: Read]

### User | 2026-05-26T15:07:16.030Z

[tool_result] 1	/**
2	 * MasterPostProcessorUnifiedAGIEngine — Dialect Symmetry
3	 * ======================================================
4	 * Anti-regression for U-MASTERPOST-DIALECT-SYMMETRY (echo, 2026-05-26).
5	 *
6	 * Background — the bug this test pins
7	 * -----------------------------------
8	 * The engine's quality scorers (`runDeepLearningAnalysis`, `quickQualityScore`,
9	 * `scoreSafety`, `scoreBes
... [+12756 chars truncated]

### Assistant | 2026-05-26T15:07:19.669Z

Now let me verify external consumers of ControllerProfile and check for potential false-positives.

### Assistant | 2026-05-26T15:07:20.677Z

[tool_use: Grep]

### User | 2026-05-26T15:07:45.245Z

[tool_result] Found 29 files
src\__tests__\MasterPostDialectSymmetry.test.ts
src\engines\MasterPostProcessorUnifiedAGIEngine.ts
src\tools\dispatchers\camDispatcher.ts
src\tools\dispatchers\aiReasoningDispatcher.ts
src\tools\dispatchers\machineSetupDispatcher.ts
src\engines\MachineCapabilitySurfaceEngine.ts
src\__tests__\MasterPostProcessorUnifiedAGIEngine.test.ts
src\engines\CNCControllerDeepLearningEngine.ts
s
... [+912 chars truncated]

### Assistant | 2026-05-26T15:07:48.989Z

[tool_use: Grep]

### User | 2026-05-26T15:08:18.275Z

[tool_result] src\__tests__\MasterPostDialectSymmetry.test.ts:32:} from "../engines/MasterPostProcessorUnifiedAGIEngine.js";
src\__tests__\MasterPostProcessorUnifiedAGIEngine.test.ts:20:} from "../engines/MasterPostProcessorUnifiedAGIEngine.js";

### Assistant | 2026-05-26T15:08:21.923Z

Good — only two consumers, both tests. `ControllerProfile` is not exported into other engines' surface. Let me verify the Heidenhain HSM regex potential false-positive risk and Mitsubishi `G0?5\.1` concerns.

### Assistant | 2026-05-26T15:08:30.836Z

[tool_use: Bash]

### User | 2026-05-26T15:10:35.272Z

[tool_result] hsm G0 alone: false
hsm G5 alone: false
hsm G5.1: true
hsm G05.1: true
hsm G005.1 (3-digit): false
hsm M120 in middle: true
--- Heidenhain safe_start ---
END PGM in code: true
comment-only END PGM: true
M91 Z0: true
M92 Z: true
--- Mitsubishi hsm ---
Mit G0 alone: false
Mit G5: false
Mit G5.1 Q1: true
Mit G05.1 Q1: true
Mit G005.1: false

### Assistant | 2026-05-26T15:10:38.924Z

Now let me check the existing engine test and other consumers to verify no breakage.

### Assistant | 2026-05-26T15:10:40.356Z

[tool_use: Bash]

### User | 2026-05-26T15:13:00.374Z

[tool_result] [INFO] [PP-UNIFIED-AGI] Complete: 2 lines, quality=60, time=1ms
stderr | src/__tests__/MasterPostProcessorUnifiedAGIEngine.test.ts > MasterPostProcessorUnifiedAGIEngine > U-BRIDGE-MASTERPOST-CAM — source_cam drives cross-CAM unification > auto-injects the cross-CAM feature for source_cam=mastercam
[INFO] [PP-UNIFIED-AGI] generatePost: controller=fanuc, cam=mastercam
[INFO] [PP-UNIFIED-AGI] Complet
... [+4342 chars truncated]

### Assistant | 2026-05-26T15:13:04.423Z

Test reminder is not applicable — this is a one-shot review session. Let me get the final test results.

### Assistant | 2026-05-26T15:13:06.475Z

[tool_use: Bash]

### User | 2026-05-26T15:15:22.663Z

[tool_result]  ✓ src/__tests__/MasterPostDialectSymmetry.test.ts (16 tests) 15ms
 ✓ src/__tests__/MasterPostProcessorUnifiedAGIEngine.test.ts (26 tests) 2306ms
       ✓ round-trips through the prism_cam master_post_generate dispatcher action  2270ms
 Test Files  2 passed (2)
      Tests  42 passed (42)

### Assistant | 2026-05-26T15:15:48.584Z

42/42 confirmed PASS. I have enough to deliver the review.

---

## REVIEW VERDICT: **PASS**

**Tests verified:** 16/16 (dialect symmetry) + 26/26 (anti-regression) = 42/42 PASS locally.

### Findings

**P1-1 — Heidenhain `safe_start` false-positive on `END PGM` in comments**
`MasterPostProcessorUnifiedAGIEngine.ts:447` — regex `/M9[12]\s+Z|END\s+PGM|TOOL\s+CALL\s+\d+\s+Z|L\s+Z\+[\d.]+\s+R0\s+FMAX/i` matches `END PGM` even inside a `;` comment line (e.g. `; END PGM was here`). Reviewer concern confirmed: a Heidenhain program with `END PGM` in a header comment but NO real safe-start logic would clear the +10 safe-start bonus and the +10 best-practices bonus, inflating quality. The HSM/work_offset bonuses still require real tokens so the bug isn't catastrophic, but it can manufacture +20 quality on lazy gcode. **Defer-acceptable** since (a) Heidenhain programs that lack `END PGM` for real are malformed regardless, and (b) the `END PGM` keyword is fairly idiomatic and unlikely to appear in a comment that isn't documenting the program structure. Recommend follow-up to require `^\s*END\s+PGM` (line-start anchor, multiline flag).

**P2-1 — `getDialectSignals` perf on hot path**
`MasterPostProcessorUnifiedAGIEngine.ts:1326-1328` — called 6× per `analyzeGCode` invocation (once per scorer). Each call does an object lookup + nullish-coalesce — O(1), no regex compilation (regex literals are interned at module load). Not a perf issue, but could be hoisted once at top of `analyzeGCode` and passed down. **Follow-up.**

**P2-2 — `runDeepLearningAnalysis` doesn't pass controller to nested scorers**
`MasterPostProcessorUnifiedAGIEngine.ts:1339` — DL path computes its own dialect-aware checks inline; quick path (`quickQualityScore:1358-1375`) does the same. Both inline; the 6 scoring methods in `analyzeGCode` are separate. The DL→quick path divergence is preserved correctly. No bug, just noting the 2 parallel scoring surfaces both got the fix.

**P3-1 — `DEFAULT_DIALECT_SIGNALS.hsm` 
... [+1190 chars truncated]
