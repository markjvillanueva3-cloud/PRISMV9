---
type: "chat-session"
source: "claude-code-cli"
session_id: "14b038a1-b568-490a-8f31-fb7e113a621b"
title: "Audit this test file for REAL coverage quality (not execution) and grade PASS/FA"
date: "2026-06-18"
first_ts: "2026-06-18T19:08:50.301Z"
last_ts: "2026-06-18T19:09:39.429Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/14b038a1-b568-490a-8f31-fb7e113a621b/subagents/agent-accf63e03ec32d934.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Audit this test file for REAL coverage quality (not execution) and grade PASS/FA

> **claude-code-cli** | 2026-06-18 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/14b038a1-b568-490a-8f31-fb7e113a621b/subagents/agent-accf63e03ec32d934.jsonl`

## Transcript

### User | 2026-06-18T19:08:50.301Z

Audit this test file for REAL coverage quality (not execution) and grade PASS/FAIL with file:line:

TEST FILE: H:/prism/.claude/hooks/__tests__/stale-slot-cron-advisory.test.mjs
UNDER TEST: H:/prism/.claude/hooks/stale-slot-cron-advisory.mjs (exports parseTargetSlot, findStaleSlotCrons, renderAdvisory)

Verify:
- Asserts are real reference-value / behavioral checks, NOT toBeDefined-style stubs. Each test must FAIL if the business logic regresses (R9 — tests verify intent).
- Coverage includes: happy path + >=3 failure modes + >=2 adversarial inputs, for the detector.
- The CENTRAL regression is encoded: the real bug (a `/startup-papa` cron targeting a NULL papa slot, created by a session that rebound to alpha) is flagged with a CronDelete command; AND the live 5-cron fleet (all targeting claimed slots) flags ZERO (no false positive).
- Safety-critical cases present: low-confidence target yields NO destructive command; empty/missing chat-slots yields [] (no mass false-positive); one-shot (recurring:false) skipped; creator-rebound force-steal case; creator-owns-same-slot not flagged; whole-word boundary (alphabet != alpha).
- No accidental .skip / .only. Tests are hermetic.
Flag any missing failure-mode or any assertion that would pass even with broken logic. End with PASS or FAIL.

### Assistant | 2026-06-18T19:08:53.058Z

I'll audit this test file for real coverage quality per R9 (tests verify intent, not just behavior). Let me first examine both files.

### Assistant | 2026-06-18T19:08:53.547Z

[tool_use: Read]

### Assistant | 2026-06-18T19:08:53.586Z

[tool_use: Read]

### User | 2026-06-18T19:08:55.271Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\stale-slot-cron-advisory.mjs' was already read 12s ago in this session and is unchanged (mtime 1781809694679). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T19:09:01.576Z

[tool_result] 1	// SESSION-CONTINUITY-FIX/U-STALE-SLOT-CRON-ADVISORY (2026-06-18, slot:alpha)
2	// Tests for the stale slot-loop cron detector. Encodes the REAL "keep checking
3	// back into papa" bug (cron 1b150d99 /startup-papa created by 14b038a1 after it
4	// rebound to alpha) and the live 5-cron fleet as a no-false-positive regression.
5	//
6	// Run: node H:/prism/.claude/hooks/__tests__/stale-slot-cron-ad
... [+12284 chars truncated]

### Assistant | 2026-06-18T19:09:03.840Z

I'll audit this test file per R9 (tests verify intent, not behavior). Let me check the implementation file since I can't re-read it.

### Assistant | 2026-06-18T19:09:04.928Z

[tool_use: Grep]

### Assistant | 2026-06-18T19:09:05.690Z

[tool_use: Grep]

### User | 2026-06-18T19:09:10.205Z

[tool_result] 84- * bare names -- never guess).
85- * @param {string} prompt
86- * @param {Set<string>} [slotSet]
87- * @returns {{slot:string, confidence:"high"|"low"}|null}
88- */
89:export function parseTargetSlot(prompt, slotSet = SLOT_SET) {
90-  if (!prompt || typeof prompt !== "string") return null;
91-
92-  \ high-confidence 1: the actuating slash command `/startup-<slot>`
93-  const m1 = prompt.match(/
... [+2122 chars truncated]

### User | 2026-06-18T19:09:10.356Z

[tool_result] No matches found

### Assistant | 2026-06-18T19:09:12.146Z

Now let me check the core logic to verify the tests encode real behavioral regression.

### Assistant | 2026-06-18T19:09:12.793Z

[tool_use: Read]

### Assistant | 2026-06-18T19:09:13.064Z

[tool_use: Read]

### User | 2026-06-18T19:09:14.123Z

[tool_result] 88	 */
89	export function parseTargetSlot(prompt, slotSet = SLOT_SET) {
90	  if (!prompt || typeof prompt !== "string") return null;
91	
92	  // high-confidence 1: the actuating slash command `/startup-<slot>`
93	  const m1 = prompt.match(/\/startup-([a-z]+)\b/i);
94	  if (m1 && slotSet.has(m1[1].toLowerCase())) {
95	    return { slot: m1[1].toLowerCase(), confidence: "high" };
96	  }
97	
98	  // 
... [+4445 chars truncated]

### User | 2026-06-18T19:09:14.611Z

[tool_result] 127	export function findStaleSlotCrons(tasks, chatSlots, opts = {}) {
128	  const slotSet = opts.slotSet || SLOT_SET;
129	  const canon = opts.canonicalChatId || canonicalChatId;
130	  const out = [];
131	  if (!Array.isArray(tasks)) return out;
132	
133	  const slots = (chatSlots && chatSlots.slots) || {};
134	
135	  // GROUND-TRUTH GUARD: if chat-slots is missing/unreadable/empty we have NO
136	
... [+4143 chars truncated]

### Assistant | 2026-06-18T19:09:39.429Z

Perfect. Now I have both the test file and the implementation. Let me audit against R9 and the spec.

## AUDIT SUMMARY

**TEST FILE:** `H:/prism/.claude/hooks/__tests__/stale-slot-cron-advisory.test.mjs`

**UNDER TEST:** `H:/prism/.claude/hooks/stale-slot-cron-advisory.mjs`

### REAL REGRESSION ENCODING (R9)

The test suite **ENCODES THE ACTUAL BUG** in the first `findStaleSlotCrons` test (lines 89-102):
- **Real bug:** Session `14b038a1` created a `/startup-papa` cron, then rebound to alpha. Papa slot went unclaimed. The cron persists, fires, force-claims papa.
- **Test assertion** (lines 96-101): The papa cron **MUST be flagged** with `reason="target-slot-unclaimed"` AND `command="CronDelete 1b150d99"` (high-confidence).
- **Failure mode:** If the logic skipped unclaimed targets, this test would FAIL ✓
- **Failure mode:** If the logic generated `command=null` for high-confidence, this test would FAIL ✓

### COVERAGE AUDIT

**1. HAPPY PATH + REAL-WORLD VALIDATION**
- Line 106-122: Live 5-cron fleet (all claimed slots) → flags ZERO ✓
  - Regression: If logic broke on any of these real formats, assertion fails
- Line 124-134: Creator session-rotation case (alpha→alpha across `/compact`) → NOT flagged ✓
  - Regression: If logic wrongly flagged a legitimately-serving cron, test fails

**2. THREE FAILURE MODES (Requirement met: >=3)**

| Mode | Test | Assertion | Regression Path |
|------|------|-----------|-----------------|
| **target-slot-unclaimed** | Lines 89-102 | `reason="target-slot-unclaimed"`, `command="CronDelete..."` | If logic fails to detect NULL papa, test fails |
| **creator-rebound (force-steal)** | Lines 138-154 | creator in alpha, cron targets papa (peer-held) → flagged `reason="creator-rebound"` | If logic fails to detect slot-rebind, test fails |
| **creator owns same slot** | Lines 156-163 | creator=papa, cron targets papa → NOT flagged (0 findings) | If logic wrongly flag self-target, test fails |

**3. TWO ADVERSARIAL INPUTS (Requirement met: >=2
... [+5433 chars truncated]
