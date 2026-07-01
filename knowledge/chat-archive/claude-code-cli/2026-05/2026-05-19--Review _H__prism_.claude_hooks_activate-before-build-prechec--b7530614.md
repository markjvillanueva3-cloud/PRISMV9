---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "Review `H:/prism/.claude/hooks/activate-before-build-precheck.test.mjs` (the tes"
date: "2026-05-19"
first_ts: "2026-05-19T04:36:23.213Z"
last_ts: "2026-05-19T04:37:33.253Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-ae7e67e2e44d10683.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review `H:/prism/.claude/hooks/activate-before-build-precheck.test.mjs` (the tes

> **claude-code-cli** | 2026-05-19 | 16 msgs (6 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-ae7e67e2e44d10683.jsonl`

## Transcript

### User | 2026-05-19T04:36:23.213Z

Review `H:/prism/.claude/hooks/activate-before-build-precheck.test.mjs` (the test file for `activate-before-build-precheck.mjs`).

44/44 tests currently pass via `node --test`. Grade the test SUITE: is it sufficient to catch regressions, or are there silent gaps where the assertions don't exercise the production behavior?

Required coverage (from spec `H:/prism/state/shared/specs/UNITS/U-ACTIVATE-BEFORE-BUILD-PRECHECK.md` §Test plan):
- New engine path → emits hits when similar existing assets
- Test file path (.test.ts) → does NOT emit (path filter)
- Empty graph / no hits → silent suppress
- Knob disabled → no output, no search call
- Timeout simulation → silent timeout, never blocks
- Real-data smoke: simulate `Write src/engines/DuplicationGuardEngine.ts` (exists) → emits ≥1 hit

Verify:
1. **No stub assertions** — every `assert.equal` / `assert.match` checks a REAL value, not `toBeDefined()` or similar weak claims (Karpathy R9: tests verify intent).
2. **Variability floor** — ≥3 spanning configs per material/dialect/machine domain. For this hook the variability axes are: asset-kind (engine/hook/skill), path-style (Windows backslashes vs forward-slash), env-knob (default/set/clamped/invalid).
3. **Adversarial / boundary inputs** — null, undefined, empty string, NaN, oversize, malformed JSON, non-array hits.
4. **Failure modes** — search throws, search returns wrong shape, search returns hits as non-array.
5. **CLI subprocess oracle** — does the test exercise the REAL script via spawnSync (not just import the pure core)? The CLAUDE.md lesson [[reference_slot_bind_enforce_2026_05_18]] specifically requires this.
6. **Variability floor** for path types — at minimum: forward-slash, backslash, drive-letter prefix, posix prefix.
7. **No flaky tests** — every assertion is deterministic, no timing-sensitive waits, no shared state between tests.

Grade PASS or FAIL with P0/P1/P2/P3 findings. Cite test:line. If FAIL, list every P0/P1 with concrete fix. Be strict — these te
... [+28 chars truncated]

### Assistant | 2026-05-19T04:36:31.233Z

I'll review the test suite for `activate-before-build-precheck.test.mjs` against the spec requirements and test quality standards.

### Assistant | 2026-05-19T04:36:31.462Z

[tool_use: Read]

### Assistant | 2026-05-19T04:36:31.621Z

[tool_use: Read]

### User | 2026-05-19T04:36:43.012Z

[tool_result] 1	---
2	unit_id: U-ACTIVATE-BEFORE-BUILD-PRECHECK
3	milestone: JULIETT-12CHAT-ALLOCATION-MS0
4	owner_slot: alpha
5	wave: W1
6	cost: S
7	status: pending
8	peer_claims_check_at: 2026-05-17T00:00:00Z
9	tool_plan_ref: pending-rgs-build
10	depends_on: []
11	unblocks: [12-chat-parallel-W2-W4-without-duplicate-builds]
12	roi_score: 8.0
13	generated_at: 2026-05-17
14	generator_version: hand-written-v1
15	
... [+5168 chars truncated]

### User | 2026-05-19T04:36:43.696Z

[tool_result] 1	// activate-before-build-precheck.test.mjs — node:test suite
2	//
3	// U-ACTIVATE-BEFORE-BUILD-PRECHECK (JULIETT-12CHAT-ALLOCATION-MS0)
4	//
5	// Covers the pure-core (classifyPath, buildQuery, renderBlock, clampedTopK,
6	// searchWithTimeout, decide) PLUS a real-subprocess CLI smoke that proves the
7	// stdin→stdout wiring + script-guard work in the published artifact (per the
8	// "pure core +
... [+15537 chars truncated]

### Assistant | 2026-05-19T04:36:45.634Z

Now let me check the actual hook implementation to understand what the tests should be covering:

### Assistant | 2026-05-19T04:36:45.776Z

[tool_use: Read]

### User | 2026-05-19T04:36:47.857Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\activate-before-build-precheck.mjs' was already read 36s ago in this session and is unchanged (mtime 1779164653409). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-05-19T04:36:49.487Z

The hook was already read. Let me search for the actual implementation to verify what's being tested:

### Assistant | 2026-05-19T04:36:50.387Z

[tool_use: Grep]

### User | 2026-05-19T04:36:52.047Z

[tool_result] 59:export function classifyPath(filePath) {
87:export function buildQuery(name) {
108:export function renderBlock(assetKind, assetName, hits) {
145:export function clampedTopK() {
172:export async function searchWithTimeout(runSearch, query, opts, timeoutMs) {
210:export async function decide(payload, runSearchAsync) {

### Assistant | 2026-05-19T04:36:53.434Z

Now let me view the actual hook implementation to understand the test coverage in detail:

### Assistant | 2026-05-19T04:36:54.218Z

[tool_use: Grep]

### User | 2026-05-19T04:36:57.357Z

[tool_result] 56- * @param {string} filePath
57- * @returns {{kind:"engine"|"hook"|"skill", name:string}|null}
58- */
59:export function classifyPath(filePath) {
60-  if (typeof filePath !== "string" || !filePath) return null;
61-  const norm = filePath.replace(/\\/g, "/");
62-  \ Strip drive prefix variations (H:/prism/, /h/prism/, .) — patterns match
--
84- * @param {string} name
85- * @returns {string}
86- *
... [+1815 chars truncated]

### Assistant | 2026-05-19T04:37:33.253Z

Perfect. Now I have enough context. Let me analyze the test suite comprehensively against the spec requirements and test quality standards.

## Test Suite Review: `activate-before-build-precheck.test.mjs`

**Grade: FAIL (2 P0, 1 P1, 1 P2)**

---

### P0 Findings

#### **P0-1: Real-Data Smoke Test Missing — Spec §Test plan requirement not met**  
**Line:** 366-end (no test)  
**Issue:** The spec explicitly requires:  
> Real-data smoke: simulate `Write src/engines/DuplicationGuardEngine.ts` (exists) → emits ≥1 hit

**Current state:** The test suite has:
- Lines 261-264: test that existing file is suppressed (HOOK_PATH exists) ✓
- Lines 272-280: test that non-existing file with hits injects context ✓  
- **MISSING:** A real-data test simulating an actual existing engine like `DuplicationGuardEngine` which SHOULD return ≥1 hit because that engine genuinely exists in the codebase

The closest test (line 272-280) uses a fabricated path `UniqueAbcNewEngine.ts` with a stub search. That doesn't verify the hook works against real data. The spec requires proving the hook finds actual sibling engines.

**Fix:** Add a real-data CLI subprocess test:
```javascript
it("real-data: DuplicationGuardEngine.ts → emits hits (engine exists)", () => {
  const enginePath = "H:/prism/mcp-server/src/engines/DuplicationGuardEngine.ts";
  const payload = JSON.stringify({ tool: "Write", input: { file_path: "H:/prism/mcp-server/src/engines/NewDuplicationGuardVariantEngine.ts" } });
  const r = spawnSync(process.execPath, [HOOK_PATH], { input: payload, encoding: "utf8", timeout: 10000 });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  // When a new *GuardEngine is created, master-index should find DuplicationGuardEngine (or similar Guard engines)
  assert.equal(out.continue, true, "should allow the write");
  // Real data: could be either injected (hits found) or suppressed (no master-index data available)
  // but the subprocess must NOT crash (exit 0 is the floor requirement
... [+8905 chars truncated]
