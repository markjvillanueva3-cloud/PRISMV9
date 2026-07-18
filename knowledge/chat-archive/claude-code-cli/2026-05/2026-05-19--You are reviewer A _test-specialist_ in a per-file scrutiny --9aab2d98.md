---
type: "chat-session"
source: "claude-code-cli"
session_id: "9aab2d98-78ae-4a9b-9dd7-d941b46c3453"
title: "You are reviewer A (test-specialist) in a per-file scrutiny gate for PRISM unit "
date: "2026-05-19"
first_ts: "2026-05-19T17:34:15.419Z"
last_ts: "2026-05-19T17:38:06.275Z"
cwd: "H:\\prism\\mcp-server"
messages: 26
user_msgs: 9
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/9aab2d98-78ae-4a9b-9dd7-d941b46c3453/subagents/agent-ab680ead6897b7ecf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# You are reviewer A (test-specialist) in a per-file scrutiny gate for PRISM unit 

> **claude-code-cli** | 2026-05-19 | 26 msgs (9 user / 17 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/9aab2d98-78ae-4a9b-9dd7-d941b46c3453/subagents/agent-ab680ead6897b7ecf.jsonl`

## Transcript

### User | 2026-05-19T17:34:15.419Z

You are reviewer A (test-specialist) in a per-file scrutiny gate for PRISM unit U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP3-4.

FILE TO REVIEW (read end-to-end): `H:/prism/mcp-server/src/__tests__/CNCControllerDeepLearningEngine.learned.test.ts`

CONTEXT: This commit adds the consumer half of an AI-training pipeline. `CNCControllerDeepLearningEngine` (in `src/engines/CNCControllerDeepLearningEngine.ts`) gained:
- `ingestLearnedPatterns(jsonPath)` — reads + validates a learned-patterns JSON ledger (corpus-mined CNC controller patterns), filters to known ControllerFamily values, stores them. Throws on bad input. Validates `schemaVersion` against an allowlist `["1.0.0","1.0.0-DRAFT-no-consumer"]`.
- `getLearnedPatternStats()` — read-only snapshot.
- augmented `recommendMacro(operation, controller)` — falls back to a corpus-synthesized MacroPattern when no built-in pattern matches.
- augmented `generateMacro()` — seeds the okuma_osp template with learned V-variables.
- 2 new dispatcher actions: `controller_ingest_learned`, `controller_recommend_macro`, reachable through `executeAIReasoningAction(action, params)`.

The test file is the verification artifact. The full suite currently passes 34/34 (`./node_modules/.bin/vitest run`).

REVIEW CRITERIA — flag P0 (test is wrong / proves nothing) and P1 (real gap):
- Karpathy R9: does each test verify INTENT, not just behavior? Would a test FAIL if the engine logic regressed? Flag any assertion that a hardcoded/stub implementation would still pass (`toBeDefined()` stubs, tautologies).
- The "held-out inference" claim: the unit's acceptance is "engine produces a non-stub inference on a held-out JM-Die sample". Does the test actually PROVE the recommendation is non-stub and traces to the corpus (real tool numbers, real operations, real V-variables) — not a fabricated constant? Does it prove the engine could NOT answer the query before ingestion?
- Coverage floor: happy path + ≥3 failure modes + ≥2 adversarial inputs. Count them. Are t
... [+1267 chars truncated]

### Assistant | 2026-05-19T17:34:25.194Z

I'll review this test file end-to-end, checking R9 (test verifies intent, not just behavior), the "held-out inference" proof, coverage, and pipeline integrity.

### Assistant | 2026-05-19T17:34:25.316Z

[tool_use: Read]

### User | 2026-05-19T17:34:39.906Z

[tool_result] 1	/**
2	 * CNCControllerDeepLearningEngine — learned-pattern consumer tests.
3	 *
4	 * AI-TRAINING-FIRST-MS0 / U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP3-4 (slot:india).
5	 *
6	 * Verifies Step 3 (ingestLearnedPatterns) + Step 4 (held-out non-stub inference):
7	 *  - the engine ingests the corpus ledger emitted by
8	 *    scripts/train-cnc-controller-from-corpus.mjs (Steps 1-2);
9	 *  - after ingestio
... [+24134 chars truncated]

### Assistant | 2026-05-19T17:34:45.484Z

Now let me check the engine implementation to verify the test coverage is meaningful:

### Assistant | 2026-05-19T17:34:46.062Z

[tool_use: Read]

### User | 2026-05-19T17:35:01.679Z

[tool_result] 1	/**
2	 * CNCControllerDeepLearningEngine — Deep AI Intelligence for CNC Controllers
3	 *
4	 * Extracts controller-specific knowledge from:
5	 * - H:/prism/Resources/WinMax Mill CUTTER COMPENSATION.pdf
6	 * - H:/prism/Resources/WinMax Mill RECOVERY AND RESTART.pdf
7	 * - Post processor documentation
8	 * - JM Die controller inventory (7 Okuma, 1 Haas, 2 Hurco, 3 Mitsubishi)
9	 *
10	 * Provides de
... [+6148 chars truncated]

### Assistant | 2026-05-19T17:35:05.544Z

Let me continue reading the engine to see the ingestLearnedPatterns implementation:

### Assistant | 2026-05-19T17:35:05.974Z

[tool_use: Read]

### User | 2026-05-19T17:35:18.452Z

[tool_result] 200	    max_axes: 5,
201	    max_rpm: 6000,
202	    max_feedrate: 30000,
203	    memory_mb: 256,
204	    year_introduced: 2010,
205	  },
206	  haas_ngc: {
207	    family: "haas_ngc",
208	    model: "NGC",
209	    capabilities: ["iso_gcode", "macro_b", "cutter_comp", "probing", "high_speed_mode", "look_ahead"],
210	    gcode_dialect: "fanuc",
211	    macro_syntax: "Macro B",
212	    max_axes: 5,
21
... [+15875 chars truncated]

### Assistant | 2026-05-19T17:35:23.692Z

Let me find the ingestLearnedPatterns implementation:

### Assistant | 2026-05-19T17:35:23.925Z

[tool_use: Grep]

### User | 2026-05-19T17:35:39.353Z

[tool_result] 126-
127-/** One learned macro label idiom (`NAT1 G81`). */
128-export interface LearnedMacroLabel {
129-  controller: ControllerFamily;
130-  label: string;
131-  following_token: string;
132-  source_files: string[];
133-  frequency: number;
134-}
135-
136-/** In-memory aggregate of learned controller patterns after ingestion. */
137-export interface LearnedControllerPatterns {
138-  schemaVersi
... [+10151 chars truncated]

### Assistant | 2026-05-19T17:35:42.758Z

Now let me check for synthesizeLearnedMacro and the dispatcher setup:

### Assistant | 2026-05-19T17:35:42.760Z

[tool_use: Grep]

### User | 2026-05-19T17:35:59.471Z

[tool_result] 641-   * Search order: (1) built-in MACRO_PATTERNS, then (2) a pattern synthesized
642-   * from the learned corpus (if {@link ingestLearnedPatterns} has been called).
643-   * The learned fallback lets the engine answer operations the three built-in
644-   * patterns never covered (turning, drilling, boring, ...).
645-   *
646-   * @param operation - operation keyword(s), e.g. "turning", "spot dr
... [+2541 chars truncated]

### Assistant | 2026-05-19T17:36:03.056Z

Good. Now let me check what the actual test is verifying more carefully. Let me look at the test file for the key assertion about "held-out inference":

### Assistant | 2026-05-19T17:36:03.057Z

[tool_use: Read]

### User | 2026-05-19T17:36:32.388Z

[tool_result] 335	  it("synthesizes a non-stub macro from the corpus for that same operation (post-ingest)", () => {
336	    const eng = new CNCControllerDeepLearningEngine();
337	    eng.ingestLearnedPatterns(writeTmp(makeLedger()));
338	    const macro = eng.recommendMacro("turning", "okuma_osp");
339	    expect(macro).not.toBeNull();
340	    expect(macro!.controller).toBe("okuma_osp");
341	    expect(macro!.
... [+4418 chars truncated]

### Assistant | 2026-05-19T17:36:41.155Z

Now let me verify what the engine's synthesizeLearnedMacro actually produces to see if the test assertions are valid:

### Assistant | 2026-05-19T17:36:42.074Z

[tool_use: Grep]

### User | 2026-05-19T17:36:57.662Z

[tool_result] No matches found

### Assistant | 2026-05-19T17:36:58.987Z

Let me read the full synthesizeLearnedMacro method:

### Assistant | 2026-05-19T17:36:59.755Z

[tool_use: Read]

### User | 2026-05-19T17:37:21.880Z

[tool_result] 950	
951	  /**
952	   * Synthesize a MacroPattern from the ingested corpus for an operation the
953	   * built-in MACRO_PATTERNS do not cover. Returns null when no corpus has been
954	   * ingested or no learned tool-slot convention matches the operation.
955	   */
956	  private synthesizeLearnedMacro(
957	    operation: string,
958	    controller: ControllerFamily,
959	  ): MacroPattern | null {

... [+6200 chars truncated]

### Assistant | 2026-05-19T17:38:06.275Z

Perfect. Now I have a complete picture. Let me analyze the test file systematically.

## REVIEW FINDINGS

### R9 Verification — Test Intent vs Behavior

**Line 335-348: "synthesizes a non-stub macro from the corpus"**

This test is **LOAD-BEARING** and correctly tests R9. The assertions on lines 343-346 verify REAL corpus data appears in the output:
- `toContain("T010101")` — the real tool number from the makeLedger fixture
- `toContain("OD ROUGH TURNING")` — the real operation name
- `toContain("VC100")` — the real V-variable name from the fixture
- `toContain("NAT1 G81")` — the real macro label from the fixture

Reading the engine code (lines 987-1001), `synthesizeLearnedMacro` builds the `code_template` as `"\n" + lines.join("\n") + "\n"` where `lines` includes:
```
${v.name} = ${v.expression} (${v.description})
${m.label} ${m.following_token}
T${topSlot.tool_number}
```

So if the corpus is NOT ingested, `synthesizeLearnedMacro` returns `null` (line 960), and `recommendMacro` would also return `null`. This test **WOULD FAIL** if the ingest logic was stubbed. ✓ R9 intent-verification holds.

---

### Coverage Audit

**Happy Path (ingestLearnedPatterns):** ✓
- Line 121-131: valid ledger ingestion + accurate counts
- Line 133-142: getLearnedPatternStats reflects state transitions
- Line 144-161: second ingest replaces (not appends)

**Failure Modes:** ✓ 6 tests, each with specific error message assertions
- Line 169-172: empty/whitespace path → `/non-empty string/`
- Line 175-179: missing file → `/cannot read learned-patterns file/`
- Line 182-186: invalid JSON → `/is not valid JSON/`
- Line 189-196: root is not object → `/did not parse to a JSON object/`
- Line 199-205: missing ledger key → `/has no "ledger" object/`
- Line 208-214: missing required arrays → `/missing one of the required arrays/`

**Adversarial Inputs:** ✓ 7 tests
- Line 217-224: state rollback on thrown ingest (fail-safe)
- Line 232-244: schemaVersion handshake + future version rejection
- Line 2
... [+7654 chars truncated]
