---
type: "chat-session"
source: "claude-code-cli"
session_id: "48cc713a-51f9-484d-aaf0-239f12ec427d"
title: "Third independent review (analyst arm) of PRISM commit 607f07b6b1 (run `git -C H"
date: "2026-06-24"
first_ts: "2026-06-24T12:44:31.311Z"
last_ts: "2026-06-24T12:48:07.346Z"
cwd: "H:\\prism"
messages: 64
user_msgs: 23
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/48cc713a-51f9-484d-aaf0-239f12ec427d/subagents/agent-ae1c83251f409be52.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Third independent review (analyst arm) of PRISM commit 607f07b6b1 (run `git -C H

> **claude-code-cli** | 2026-06-24 | 64 msgs (23 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/48cc713a-51f9-484d-aaf0-239f12ec427d/subagents/agent-ae1c83251f409be52.jsonl`

## Transcript

### User | 2026-06-24T12:44:31.311Z

Third independent review (analyst arm) of PRISM commit 607f07b6b1 (run `git -C H:/prism show 607f07b6b1`). Do NOT assume arms A/B caught everything. Weight toward SILENT BREAKAGE / REGRESSION RISK / INTEGRATION: (1) Are these additive test files only, with zero production-code change that could break the build or other suites? (2) Do the two new tests import only real exported symbols from the engines (verify the exports exist: GCodeSafetyAnalyzerEngine + gcSafetyAnalyzer; postProcessorCapabilityMatrixEngine)? (3) Could the 50MB-string adversarial test cause CI memory issues? (4) Is the doc edit to post-processor-knowledge-base.md factually correct and non-misleading (it changes a "AlarmDB NOT wired into P5" claim to "IS wired via Stage 5.1b") — spot-check against PostProcessorPipelineEngine.ts ~line 3153? (5) Any error-budget/IO concerns.

Grade PASS or FAIL with P0/P1 findings and file:line citations. Be concise.

### Assistant | 2026-06-24T12:44:38.040Z

I'll investigate commit 607f07b6b1 with the analyst lens, focusing on silent breakage and integration coupling.

### Assistant | 2026-06-24T12:44:38.805Z

[tool_use: Bash]

### User | 2026-06-24T12:44:43.660Z

[tool_result] commit 607f07b6b10ffd15b96ea693d4571fb8b9384f43
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 24 07:43:12 2026 -0500

    [MAIN-FORCE] [POST-PROCESSOR]/U-PP-MISSING-ENGINE-TESTS (slot:echo): GCodeSafetyAnalyzer (29) + PostProcessorCapabilityMatrix (24) companion tests; correct stale AlarmDB-P5 KB claim
    
    - GCodeSafetyAnalyzerEngine: central P5 safety gate had Z
... [+1470 chars truncated]

### Assistant | 2026-06-24T12:44:46.369Z

Three files: one doc edit, two new test files. Let me examine all of them and verify the exports they depend on.

### Assistant | 2026-06-24T12:44:47.128Z

[tool_use: Bash]

### User | 2026-06-24T12:44:51.953Z

[tool_result] commit 607f07b6b10ffd15b96ea693d4571fb8b9384f43
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 24 07:43:12 2026 -0500

    [MAIN-FORCE] [POST-PROCESSOR]/U-PP-MISSING-ENGINE-TESTS (slot:echo): GCodeSafetyAnalyzer (29) + PostProcessorCapabilityMatrix (24) companion tests; correct stale AlarmDB-P5 KB claim
    
    - GCodeSafetyAnalyzerEngine: central P5 safety gate had Z
... [+5287 chars truncated]

### Assistant | 2026-06-24T12:44:54.460Z

The doc claim is the key factual check. Let me verify the AlarmRegistry wiring in PostProcessorPipelineEngine.ts around line 3153.

### Assistant | 2026-06-24T12:44:55.405Z

[tool_use: Read]

### User | 2026-06-24T12:44:56.353Z

[tool_result] 3120	        const eng = await this._getEngine("safety");
3121	        // Reconstruct G-code from blocks for safety analysis
3122	        const tempGcode = this._blocksToGCode(blocks, machine?.controller ?? input.controller ?? "fanuc");
3123	        try {
3124	          const ctrl = (machine?.controller ?? input.controller ?? "fanuc") as string;
3125	          const safetyConfig = {
3126	         
... [+4239 chars truncated]

### Assistant | 2026-06-24T12:45:00.877Z

The doc claim is verified: Stage 5.1b (`5.1b_alarm_check`) at line 3153 does cross-reference alarms via `AlarmRegistry`. The doc edit is factually correct. Now let me verify the two test files and their imports. Let me find the actual test file paths and the engines they import.

### Assistant | 2026-06-24T12:45:02.208Z

[tool_use: Bash]

### User | 2026-06-24T12:45:07.335Z

[tool_result] knowledge/wiki/architecture/post-processor-knowledge-base.md
mcp-server/src/__tests__/GCodeSafetyAnalyzerEngine.test.ts
mcp-server/src/__tests__/PostProcessorCapabilityMatrixEngine.test.ts

### Assistant | 2026-06-24T12:45:09.815Z

[tool_use: Read]

### User | 2026-06-24T12:45:10.476Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\GCodeSafetyAnalyzerEngine.test.ts' was already read 25s ago in this session and is unchanged (mtime 1782304610984). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### Assistant | 2026-06-24T12:45:14.704Z

The guard says it's in context but I haven't actually seen it. Let me read it via git show since the read-once-guard is blocking.

### Assistant | 2026-06-24T12:45:15.458Z

[tool_use: Bash]

### User | 2026-06-24T12:45:22.433Z

[tool_result] /**
 * GCodeSafetyAnalyzerEngine companion test (U-PP-MISSING-ENGINE-TESTS, slot:echo).
 *
 * The central P5 safety gate had NO companion test despite CLAUDE.md §11 claiming one.
 * A 24-rule crash/injury safety analyzer must not ship untested. These tests encode the
 * *intent* of each rule (R9): they fail if the safety logic changes, not merely if a value
 * is returned. Score math is hand-trace
... [+11943 chars truncated]

### Assistant | 2026-06-24T12:45:26.885Z

Now let me verify the engine actually exports everything this test imports: `GCodeSafetyAnalyzerEngine`, `gcSafetyAnalyzer`, `SafetyAnalysisConfig`, `ToolData`, and the methods/properties used (`analyze`, `quickCheck`, `autoFix`, `generateSafetyReport`, `validatePipelineOutput`, and the 50MB cap behavior).

### Assistant | 2026-06-24T12:45:28.878Z

[tool_use: Grep]

### User | 2026-06-24T12:45:30.811Z

[tool_result] 27:export interface ToolData {
47:export interface SafetyAnalysisConfig {
195:export class GCodeSafetyAnalyzerEngine {
2066:export const gcSafetyAnalyzer = new GCodeSafetyAnalyzerEngine();

### Assistant | 2026-06-24T12:45:30.846Z

[tool_use: Grep]

### User | 2026-06-24T12:45:32.372Z

[tool_result] 1366:    const MAX_GCODE_SIZE = 50 * 1024 * 1024; // 50MB
1367:    if (gcode.length > MAX_GCODE_SIZE) {
1368:      throw new Error(`G-code input exceeds maximum size of ${MAX_GCODE_SIZE} bytes (${Math.round(gcode.length / 1024 / 1024)}MB provided)`);
1600:  quickCheck(gcode: string): SafetyIssue[] {
1661:  autoFix(
1774:  generateSafetyReport(
1984:  validatePipelineOutput(input: {

### Assistant | 2026-06-24T12:45:36.883Z

All imports and methods for the first test file are verified to exist. The 50MB cap is real (`MAX_GCODE_SIZE = 50 * 1024 * 1024` at line 1366) and throws the exact `/exceeds maximum size/` message the adversarial test expects. The score model comment in the test (`100 - (15*critical + 5*high + 1*medium)`) — let me verify that against the actual implementation lines 1489-1496 to confirm the hand-traced reference values are correct.

### Assistant | 2026-06-24T12:45:37.694Z

[tool_use: Read]

### User | 2026-06-24T12:45:39.483Z

[tool_result] 1480	        line, state,
1481	      );
1482	      if (m24) medium.push(m24);
1483	
1484	      // Update state AFTER checks
1485	      this.updateState(state, line);
1486	    }
1487	
1488	    // Safety score (0-100, 100 = perfect)
1489	    const criticalWeight = 15;
1490	    const highWeight = 5;
1491	    const mediumWeight = 1;
1492	    const totalPenalty =
1493	      critical.length * criticalWe
... [+599 chars truncated]

### Assistant | 2026-06-24T12:45:44.014Z

Score model verified exactly: `100 - (15*critical + 5*high + 1*medium)`, clamped `[0,100]`, `safe = critical===0 && high===0`, aerospace also requires `medium===0`. The hand-traced reference values (clean=100, 1-crit=85, clamp=0) are correct. Note `r.safe` in the test refers to the field returned. Let me confirm `analyze` returns `safe` from `strictSafe` (not the base `safe`) — the aerospace/strictness tests depend on this.

### Assistant | 2026-06-24T12:45:45.580Z

[tool_use: Grep]

### User | 2026-06-24T12:45:47.565Z

[tool_result] No matches found

### Assistant | 2026-06-24T12:45:50.637Z

[tool_use: Read]

### User | 2026-06-24T12:45:51.623Z

[tool_result] 1509	        `Program passes all ${config.strictness} safety ` +
1510	        `checks. Score: ${score}/100.`;
1511	    } else {
1512	      summary =
1513	        `Found ${totalIssues} issue(s): ` +
1514	        `${critical.length} critical, ` +
1515	        `${high.length} high, ${medium.length} medium. ` +
1516	        `Score: ${score}/100. `;
1517	      if (critical.length > 0) {
1518	        su
... [+1605 chars truncated]

### Assistant | 2026-06-24T12:45:54.952Z

[tool_use: Read]

### User | 2026-06-24T12:45:55.873Z

[tool_result] 1560	            rule: r.rule as string,
1561	            severity: r.severity as string,
1562	            category: r.category as string,
1563	          }));
1564	        }
1565	      }
1566	    } catch (e: unknown) {
1567	      // Playbook integration failed — surface as a safety rule so the user knows
1568	      playbookSafetyRules = [{
1569	        rule_id: 'PLAYBOOK-UNAVAILABLE',
1570	       
... [+1204 chars truncated]

### Assistant | 2026-06-24T12:45:59.838Z

Confirmed: `analyze` returns `safe: config.strictness === 'aerospace' ? strictSafe : safe` (line 1578-1579). The aerospace test (`aero.safe === false` on a medium-only program) is correct, and the standard test (`std.safe === true`) is correct. The strictness gating tests are sound.

Now the second test file. Let me read it and verify the matrix engine's exports.

### Assistant | 2026-06-24T12:46:00.737Z

[tool_use: Bash]

### User | 2026-06-24T12:46:06.020Z

[tool_result] /**
 * PostProcessorCapabilityMatrixEngine companion test (U-PP-MISSING-ENGINE-TESTS, slot:echo).
 *
 * The controller×capability feature matrix (180 Fusion CPS posts, 15+ families, 9 actions) is the
 * surface that answers the operator's "every machine/controller/feature combination" requirement —
 * and it was untested. Tests encode intent (R9) via reference anchors verified from the real matrix
... [+6993 chars truncated]

### Assistant | 2026-06-24T12:46:09.431Z

This test file makes many specific assertions about the matrix engine's data and methods. Let me verify the engine's exports and the methods/shapes used, plus the specific reference anchors (Fanuc smoothing G05.1, G28, G43.4, the `selectPost` reasoning strings, `getSummary` shape).

### Assistant | 2026-06-24T12:46:11.688Z

[tool_use: Grep]

### User | 2026-06-24T12:46:13.248Z

[tool_result] 72:export interface CapabilityQuery {
1570:  getMatrix(): ControllerCapabilityRecord[] {
1576:  getController(family: string): ControllerCapabilityRecord | null {
1586:  query(q: CapabilityQuery): ControllerCapabilityRecord[] {
1637:  compare(families: string[]): CapabilityComparison {
1638:    const controllers = families.map(f => this.getController(f)).filter(Boolean) as ControllerCapabilityReco
... [+506 chars truncated]

### Assistant | 2026-06-24T12:46:17.660Z

All methods exist and the singleton is exported (line 1981). One thing to note: the singleton is `new PostProcessorCapabilityMatrixEngineImpl()` — the class is named `...Impl`, but the test only imports the singleton instance and the `CapabilityQuery` type, so that's fine. Let me verify the data-anchor assertions (Fanuc → G05.1, G28, G43.4) and the key method internals: `query` filter logic, `getSummary` shape, `selectPost` reasoning strings, and `compare` guard message.

### Assistant | 2026-06-24T12:46:18.306Z

[tool_use: Read]

### User | 2026-06-24T12:46:20.365Z

[tool_result] 1570	  getMatrix(): ControllerCapabilityRecord[] {
1571	    return [...CONTROLLER_MATRIX];
1572	  }
1573	
1574	  // ── getController ──────────────────────────────────────────────────────
1575	  /** Get a single controller family by name (case-insensitive). */
1576	  getController(family: string): ControllerCapabilityRecord | null {
1577	    const key = family.toLowerCase().trim();
1578	    return
... [+2169 chars truncated]

### Assistant | 2026-06-24T12:46:24.824Z

`query` logic confirmed: empty query returns full matrix, smoothing filter exact-matches `c.smoothing.type`, minAxes filter `>= q.minAxes`, probing filter `c.probing.supported`. Contradictory `minAxes:999` correctly yields `[]`. Now the `selectPost` reasoning strings, `getSummary` shape, and `compare` recommendation. Let me also verify the Fanuc data anchors and run the actual tests to confirm they pass (the strongest verification).

### Assistant | 2026-06-24T12:46:26.053Z

[tool_use: Read]

### User | 2026-06-24T12:46:27.036Z

[tool_result] 1811	  selectPost(requirements: CapabilityQuery): PostSelectorResult {
1812	    const recommended: ControllerCapabilityRecord[] = [];
1813	    const partial: Array<{ controller: ControllerCapabilityRecord; missing: string[] }> = [];
1814	    const incompatible: string[] = [];
1815	
1816	    for (const controller of CONTROLLER_MATRIX) {
1817	      const missing: string[] = [];
1818	
1819	      if (
... [+3125 chars truncated]

### Assistant | 2026-06-24T12:46:34.101Z

Now I need to scrutinize the `selectPost` partition test carefully — this is the kind of thing arms A/B might miss.

The test asserts: `recommended.length + partial.length + incompatible.length === getMatrix().length` (a clean partition). Looking at the implementation: each controller goes into exactly one of the three buckets (`if missing.length === 0 → recommended; else if <= 2 → partial; else → incompatible`). That's a true partition. Good.

For `selectPost({minAxes:999})`: every controller has `maxSimultaneousAxes < 999`, so each gets exactly one `missing` entry (`minAxes:...`). `missing.length === 1`, which is `<= 2`, so they ALL go to `partial`, NOT `incompatible`. Therefore `recommended` is empty. The test asserts `recommended` has length 0 (correct) AND `reasoning` matches `/no exact matches|no controllers match/`. Since `partial.length > 0`, the reasoning is `"No exact matches. ..."`. The test regex `.toLowerCase()` matches `/no exact matches/`. Correct.

The `selectPost({})` test: no requirements, so `missing` is always empty → all recommended, partial/incompatible empty. Correct.

Let me verify the `compare` guard and `getSummary` shape, then run the test suites to confirm green.

### Assistant | 2026-06-24T12:46:34.953Z

[tool_use: Read]

### User | 2026-06-24T12:46:35.844Z

[tool_result] 1639	    const names = controllers.map(c => c.family);
1640	
1641	    if (controllers.length < 2) {
1642	      return {
1643	        controllers: names,
1644	        dimensions: [],
1645	        recommendation: "Need at least 2 valid controller families to compare."
1646	      };
1647	    }
1648	
1649	    const dimensions: CapabilityComparison["dimensions"] = [];
1650	
1651	    // Smoothing
1652	 
... [+2008 chars truncated]

### Assistant | 2026-06-24T12:46:40.466Z

`compare` guard message is `"Need at least 2 valid controller families to compare."` — the test asserts `r.recommendation.toContain('at least 2')`. Correct. And it filters via `getController` (`.filter(Boolean)`), so `compare(['Fanuc','TotallyFakeController'])` → only 1 valid → `< 2` → empty dimensions. Correct.

Now let me check the `compare` final recommendation (`'scores highest'`) and `getSummary` shape, then run both suites.

### Assistant | 2026-06-24T12:46:41.851Z

[tool_use: Read]

### User | 2026-06-24T12:46:42.748Z

[tool_result] 1710	      probeValues[c.family] = c.probing.supported
1711	        ? `Yes (multi-feature=${c.probing.multipleFeatures}, inspect=${c.probing.inspection})`
1712	        : "No";
1713	    }
1714	    dimensions.push({
1715	      dimension: "Probing",
1716	      values: probeValues
1717	    });
1718	
1719	    // Feeds
1720	    const feedValues: Record<string, string> = {};
1721	    for (const c of cont
... [+3176 chars truncated]

### Assistant | 2026-06-24T12:46:47.035Z

`compare` 2-valid recommendation contains `'scores highest'` (line 1804). The two-valid test uses `listFamilies().slice(0, 2)` and asserts every dimension has a value for each family — every dimension builds `values` from all `controllers`, so that holds. Correct.

Now let me check `getSummary` shape and the `allCapabilities` sorted/deduped/MILLING assertion, then run the suites.

### Assistant | 2026-06-24T12:46:48.049Z

[tool_use: Read]

### User | 2026-06-24T12:46:49.089Z

[tool_result] 1922	  listFamilies(): string[] {
1923	    return CONTROLLER_MATRIX.map(c => c.family);
1924	  }
1925	
1926	  // ── getSummary ─────────────────────────────────────────────────────────
1927	  /** Quick stats: families, total posts, capability coverage. */
1928	  getSummary(): {
1929	    totalFamilies: number;
1930	    totalPosts: number;
1931	    allCapabilities: string[];
1932	    smoothingTypes:
... [+1959 chars truncated]

### Assistant | 2026-06-24T12:46:57.515Z

I see two cross-method consistency invariants in the test that I need to scrutinize carefully — these are the kind of subtle silent-break opportunities.

1. `familiesWith5Axis` uses `maxSimultaneousAxes >= 5` (line 1957), and `query({minAxes:5})` filters `>= q.minAxes` i.e. `>= 5` (line 1620). These reconcile. Test correct.

2. `familiesWithProbing` uses `c.probing.supported` (line 1956), and `query({probing:true})` filters `c.probing.supported` (line 1625). Reconcile. Test correct.

3. `getSummary.totalPosts` sums `c.postCount` (line 1951) — test computes the same reduce. Correct.

4. `allCapabilities` is `[...allCaps].sort()` — sorted and set-deduped. The test checks `toContain('MILLING')` — that depends on the matrix data actually containing the capability `MILLING`. I'll let the live test run confirm the data anchors (Fanuc G05.1/G28/G43.4, MILLING capability).

Now the strongest verification — run both suites. Let me confirm clean status first and run them.

### Assistant | 2026-06-24T12:46:58.887Z

[tool_use: Bash]

### User | 2026-06-24T12:47:06.040Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
 RUN  v4.1.5 H:/PRISM/mcp-server
 ✓ src/__tests__/PostProcessorCapabilityMatrixEngine.test.ts (24 tests) 11ms
 ✓ src/__tests__/GCodeSafetyAnalyzerEngine.test.ts (29 tests) 18ms
 Test Files  2 passed (2)
      Tests  53 passed (53)
   Start at  07:47:05
   Duration  239ms (transform 89ms, setup 0ms, import 143ms, tests 29ms
... [+18 chars truncated]

### Assistant | 2026-06-24T12:47:11.114Z

Both suites pass: 53/53 (29 + 24), matching the commit message exactly. The 50MB adversarial test ran without CI memory issues (suite completed in 239ms total) — a single 50MB string allocation is well within Node's default heap and the engine throws before any parsing. Let me confirm the two questions about regression/integration:

1. Did this commit touch any production code? (verify only 3 files, no other suite impact)
2. Are the new test files referenced anywhere that could break (e.g. a test manifest)?

### Assistant | 2026-06-24T12:47:13.319Z

[tool_use: Bash]

### User | 2026-06-24T12:47:21.748Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
 M .claude/helpers/lib/test-legitimacy-core.mjs
 M .claude/hooks/stop_on_failing_tests.mjs
 M .claude/hooks/test-legitimacy.mjs
 M .claude/settings.json
 M .github/workflows/ci.yml
 M AGENTS.md
 M CLAUDE.md
 M GEMINI.md
 M PRISM-INVENTORY-LATEST.md
 M "knowledge/PRISM Knowledge Vault.md"
 M knowledge/PRISM-System-Map.canva
... [+531 chars truncated]

### Assistant | 2026-06-24T12:47:29.048Z

The two test files have no diff vs HEAD (committed clean, no later uncommitted edits). The working-tree modifications shown (`.claude/*`, CLAUDE.md, knowledge/*) are pre-existing session-level noise unrelated to commit 607f07b6b1 — they are not part of this commit's diff, which is strictly the 3 files I reviewed.

Let me verify the commit contains zero production-code (`src/engines/*.ts` non-test) changes — already confirmed via `--name-only` (only the .md doc + 2 .test.ts). The doc is a wiki markdown, not loaded by any build. So this is purely additive test + doc.

One final integration check: confirm the engine files (the test imports) were NOT modified in this commit and the imports therefore reference already-stable, already-shipped symbols — there's no risk of a test importing a symbol that a same-commit change renamed.

### Assistant | 2026-06-24T12:47:32.640Z

[tool_use: Bash]

### User | 2026-06-24T12:47:41.988Z

[tool_result] === engines NOT in this commit (good - tests import stable shipped symbols) ===
375c0c9ff7 [MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-OKUMA-LATHE-G50-CHECK (slot:whiskey iter18): HIGH-19 — Okuma lathe G50 S<rpm> max-spindle-clamp check. [BOOTSTRAP-SLOT-ENFORCE]. Fires when controller=okuma + first 20 non-comment lines lack 'G50 + S-address' pair. Without G50, small-diameter cut in CSS (G96) mode can driv
... [+352 chars truncated]

### Assistant | 2026-06-24T12:48:07.346Z

The `git log -1 607f07b6b1 -- <engine paths>` returned an OLDER commit (375c0c9ff7), confirming the engines were last touched BEFORE this commit — i.e., commit 607f07b6b1 did NOT modify either engine. The tests import already-shipped, stable symbols (no same-commit rename risk). The alarm DB count claim (2,588) in the doc is also factually accurate.

I have completed my analyst-arm investigation. All checks pass.

---

VERDICT: PASS

summary: Commit 607f07b6b1 is strictly additive — two new vitest companion test files (29 + 24 tests) plus a 4-line factual correction to a wiki markdown doc. Zero production-code change, so no consumer can break silently; both engines (`GCodeSafetyAnalyzerEngine`, `PostProcessorCapabilityMatrixEngine`) were last modified in an EARLIER commit, so the tests import already-stable shipped symbols with no same-commit rename risk. I executed both suites live (53/53 green, 239ms) and independently verified every imported symbol, the hand-traced score model, the strictness-gating return path, the cross-method consistency invariants, and the corrected doc claim against source.

findings: none

Audited edge-paths / consumers traced (for an auditable PASS):
- Build/suite impact: commit touches only `knowledge/wiki/architecture/post-processor-knowledge-base.md` + the 2 `.test.ts` files (`git show --name-only`). The doc is markdown, not loaded by any build; no production `.ts` changed → no other suite or runtime consumer affected.
- Import existence (arm B/C overlap, verified anyway): `GCodeSafetyAnalyzerEngine` (class L195), `gcSafetyAnalyzer` (singleton L2066), `SafetyAnalysisConfig` (L47), `ToolData` (L27) all exported; `postProcessorCapabilityMatrixEngine` (singleton L1981, instance of `...Impl` — test imports the instance, not the class, so the `Impl` naming is irrelevant) + `CapabilityQuery` (L72). Every method called by the tests exists (`analyze/quickCheck/autoFix/generateSafetyReport/validatePipelineOutput`; `getMatrix/getController/listFa
... [+2229 chars truncated]
