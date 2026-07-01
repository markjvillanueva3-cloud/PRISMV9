---
type: "chat-session"
source: "claude-code-cli"
session_id: "e91338dc-6a34-4db2-9d78-8cb86d5548d3"
title: "Independent second-pass review of the test file `H:/prism/scripts/build-brief.te"
date: "2026-05-19"
first_ts: "2026-05-19T03:18:41.507Z"
last_ts: "2026-05-19T03:23:12.560Z"
cwd: "H:\\prism"
messages: 51
user_msgs: 18
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism/e91338dc-6a34-4db2-9d78-8cb86d5548d3/subagents/agent-a9eb66f880b0a51b1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Independent second-pass review of the test file `H:/prism/scripts/build-brief.te

> **claude-code-cli** | 2026-05-19 | 51 msgs (18 user / 33 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e91338dc-6a34-4db2-9d78-8cb86d5548d3/subagents/agent-a9eb66f880b0a51b1.jsonl`

## Transcript

### User | 2026-05-19T03:18:41.507Z

Independent second-pass review of the test file `H:/prism/scripts/build-brief.test.mjs` (read the WHOLE file end-to-end; also read `H:/prism/scripts/build-brief.mjs` which it tests). Do NOT assume a first reviewer caught everything.

This is a `node:test` suite. Weight your review toward what a coverage-focused reviewer is likely to MISS:
1. Test CORRECTNESS — would any assertion pass for the WRONG reason? e.g. a regex/`includes` assertion so loose it can't actually fail; an expected value that is itself wrong; a fuzz test whose random inputs never actually exercise the branch it claims to.
2. The `searchWikiLeaves` IDF test — verify the math: it claims a rare token (`chatter`, 1 doc) must outrank a common one (`milling`, 60 docs). Confirm the test's expected `#1` result is actually what correct IDF scoring produces, and that the test would FAIL if IDF weighting were removed (i.e. it pins the real behavior, not an accident).
3. The `excerptBody` fuzz — `maxChars` ranges 140..2340. Confirm this exercises BOTH the plain-clip branch (maxChars below the marker threshold ~137) and the sectioned branch. Does 140 actually hit the plain-clip path? If the fuzz never hits one branch, that's a coverage gap.
4. Determinism / flakiness — the fuzz uses `Math.random()` with no seed; the E2E tests assert against live repo data (`wikiContext.length > 0` for "fleet reaper"). Are these acceptably stable, or genuinely flaky? Is the property being fuzzed a true invariant (can't flake) vs a value that could?
5. Resource hygiene — tmpdir cleanup, subprocess timeout, no leaked files.
6. Any exported function of build-brief.mjs that is under-tested or whose FAILURE mode is untested.
7. Convention conformance with other PRISM `*.test.mjs` node:test suites.

You may run `node --test scripts/build-brief.test.mjs` from `H:/prism`. Report P0/P1/P2/P3 findings and end with `VERDICT: PASS` or `VERDICT: FAIL` (FAIL if any P0/P1).

### Assistant | 2026-05-19T03:18:48.911Z

I'll review the test file and its subject thoroughly.

### Assistant | 2026-05-19T03:18:49.781Z

[tool_use: Read]

### Assistant | 2026-05-19T03:18:49.784Z

[tool_use: Read]

### User | 2026-05-19T03:18:52.749Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-brief.mjs' was already read 10m ago in this session and is unchanged (mtime 1779160081007). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T03:18:52.758Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-brief.test.mjs' was already read 14s ago in this session and is unchanged (mtime 1779160655156). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-19T03:18:55.441Z

The read-once-guard says these files are in my context, but I don't actually have them in this conversation's visible context. Let me disable the cache to read them fresh.

### Assistant | 2026-05-19T03:18:56.539Z

[tool_use: Bash]

### Assistant | 2026-05-19T03:18:56.836Z

[tool_use: Bash]

### User | 2026-05-19T03:18:59.872Z

[tool_result] /**
 * build-brief.test.mjs — node:test suite for build-brief.mjs
 *
 * Run: node --test scripts/build-brief.test.mjs
 *
 * Real-value assertions only. Unit tests are hermetic (every external read
 * injected); two E2E tests exercise the real repo so the "pure core +
 * injected readers" design is proven against production wiring, not just
 * fakes. A property fuzz pins the excerptBody budget inva
... [+15779 chars truncated]

### User | 2026-05-19T03:19:04.089Z

[tool_result] <persisted-output>
Output too large (32.7KB). Full output saved to: C:\Users\wompu\.claude\projects\h--PRISM\e91338dc-6a34-4db2-9d78-8cb86d5548d3\tool-results\bj3bqb54y.txt

Preview (first 2KB):
#!/usr/bin/env node
/**
 * build-brief.mjs — deep pre-build knowledge brief for a unit or topic
 *
 * HIGH-ROI knowledge-injection skill (slot juliett, 2026-05-19).
 *
 * The gap this closes: PRISM's exist
... [+1813 chars truncated]

### Assistant | 2026-05-19T03:19:07.249Z

Let me read the full subject file.

### Assistant | 2026-05-19T03:19:08.020Z

[tool_use: Read]

### User | 2026-05-19T03:19:12.656Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-brief.mjs — deep pre-build knowledge brief for a unit or topic
4	 *
5	 * HIGH-ROI knowledge-injection skill (slot juliett, 2026-05-19).
6	 *
7	 * The gap this closes: PRISM's existing injection surfaces are all SHALLOW.
8	 * master-index-precheck-inject gives ~5 node *names*; wiki-precheck gives 3
9	 * entry *titles*; unit-knowledge-pack lists *pointers*. Not
... [+36136 chars truncated]

### Assistant | 2026-05-19T03:19:15.580Z

Now I have both files. Let me run the test suite and verify key claims.

### Assistant | 2026-05-19T03:19:16.051Z

[tool_use: Bash]

### User | 2026-05-19T03:19:28.265Z

[tool_result]   ...
# Subtest: composeBrief — topic mode assembles every section from injected deps
ok 26 - composeBrief — topic mode assembles every section from injected deps
  ---
  duration_ms: 1.2365
  ...
# Subtest: composeBrief — a throwing searchImpl degrades to a warning, never throws
ok 27 - composeBrief — a throwing searchImpl degrades to a warning, never throws
  ---
  duration_ms: 0.6197
  ...
# Su
... [+792 chars truncated]

### Assistant | 2026-05-19T03:19:32.033Z

All 31 tests pass. Now let me verify the specific concerns raised. First, the IDF test math — let me verify what correct IDF scoring actually produces.

### Assistant | 2026-05-19T03:19:38.232Z

[tool_use: Bash]

### User | 2026-05-19T03:19:40.798Z

[tool_result] Top hits:
  chatter-stability  type=architecture  score=16.6275
  milling-thing-0  type=action  score=3.0488
  milling-thing-1  type=action  score=3.0488
  milling-thing-2  type=action  score=3.0488
  milling-thing-3  type=action  score=3.0488

idf(chatter)=4.4340  idf(milling)=1.0163
expected chatter-stability=16.6275  milling-thing=3.0488

### Assistant | 2026-05-19T03:19:44.389Z

The IDF test math checks out. Now let me check whether the test would FAIL if IDF weighting were removed — this is the crucial "pins real behavior, not accident" question.

### Assistant | 2026-05-19T03:19:51.287Z

[tool_use: Bash]

### User | 2026-05-19T03:19:57.149Z

[tool_result] WITHOUT IDF top hits:
  chatter-stability  type=architecture  score=3.7500
  milling-thing-0  type=action  score=3.0000
  milling-thing-1  type=action  score=3.0000
  milling-thing-2  type=action  score=3.0000
  milling-thing-3  type=action  score=3.0000

#1 without IDF = chatter-stability
TEST WOULD STILL PASS without IDF — does NOT pin IDF (accident risk)

### Assistant | 2026-05-19T03:20:02.558Z

Important finding. The IDF test does **not** strictly pin IDF — even with IDF removed, `chatter-stability` still ranks #1 (score 3.75 vs 3.00) purely because the `architecture` type's 1.25× meaty multiplier (3 × 1.25 = 3.75) edges out the plain `action` score of 3.00. The test passes for a partially-wrong reason. Let me check what happens if BOTH IDF and the meaty multiplier are removed, and probe the excerptBody fuzz branch coverage.

### Assistant | 2026-05-19T03:20:07.116Z

[tool_use: Bash]

### User | 2026-05-19T03:20:12.798Z

[tool_result] PLAIN (no IDF, no meaty): #1 = milling-thing-0 score 3 (ties with milling at 3 )
Sort is stable in V8 — chatter-stability is LAST entry, would sort after the 60 milling ties => #1 would be a milling-thing

### Assistant | 2026-05-19T03:20:19.914Z

So the test catches a regression that removes *both* IDF and the meaty multiplier, but it does **not** isolate IDF — removing IDF alone leaves the test green. Now let me verify the excerptBody fuzz branch coverage — the critical concern about whether `maxChars=140` hits the plain-clip branch.

### Assistant | 2026-05-19T03:20:23.971Z

[tool_use: Bash]

### User | 2026-05-19T03:20:28.570Z

[tool_result] TRUNC_MARKER.length = 57
plain-clip branch taken when maxChars <= 137

Fuzz maxChars range: [140, 2339]
Fuzz MINIMUM maxChars = 140
140 <= 137 ?  => NO — plain-clip branch NEVER exercised by fuzz

plain-clip branch (137) is BELOW the fuzz floor (140) — NEVER hit

### Assistant | 2026-05-19T03:20:32.466Z

Confirmed coverage gap. The fuzz floor is 140, the plain-clip branch triggers at `maxChars <= 137`. The fuzz **never** hits the plain-clip branch — it's off by 3. However, the *dedicated* test `excerptBody — tiny maxChars below the marker threshold plain-clips within budget` uses `maxChars=100`, which does hit it. Let me verify that and check whether the fuzz inputs actually exercise the sectioned branch meaningfully.

### Assistant | 2026-05-19T03:20:44.106Z

[tool_use: Bash]

### User | 2026-05-19T03:20:47.377Z

[tool_result] Dedicated test maxChars=100 -> output length 99 (<=100: true )

Max possible body length ~ 8639
So sectioned branch IS reachable, but depends on random draws.

Over 5000 fuzz draws:
  short-return (body<=maxChars): 1007 20.1%
  plain-clip (maxChars<=137)   : 0
  sectioned branch             : 3993 79.9%

### Assistant | 2026-05-19T03:20:53.134Z

The fuzz exercises the sectioned branch ~80% and short-return ~20%, but the plain-clip branch is **0%** — the dedicated test at `maxChars=100` covers it instead, so it's not a true gap, just a slight misdescription. The fuzz docstring claims "200 inputs" pin the budget invariant; that's accurate for the sectioned/short branches. Let me now check the fuzz invariant strength — does the `ex.length <= maxChars` assertion actually exercise the truncation marker path, and could the property ever flake?

### Assistant | 2026-05-19T03:21:01.262Z

[tool_use: Bash]

### User | 2026-05-19T03:21:05.938Z

[tool_result] 50000 adversarial draws — invariant violations: 0
TRUE invariant — cannot flake
truncation marker emitted in 1418 /2000 draws

### Assistant | 2026-05-19T03:21:11.505Z

The fuzz invariant is genuine — `ex.length <= maxChars` is a true structural invariant that cannot flake, and the marker path is exercised ~70% of draws. Now let me check the E2E tests' stability and a few looser assertions.

### Assistant | 2026-05-19T03:21:13.135Z

[tool_use: Bash]

### User | 2026-05-19T03:21:20.355Z

[tool_result] leaf-index entries: 28520
entries matching reaper: 40
   alpha-slot-reaper-guardian | Alpha-Slot Reaper Guardian — the alpha chat owns the fleet reaper | type=architecture
   fleet-reaper | Fleet Reaper — slot-aware orphan-process reaper | type=architecture
   alpha-slot-reaper-guardian~2 | Hook — alpha-slot-reaper-guardian | type=hook
   fleet-reaper-stop | Hook — fleet-reaper-stop | type=hook
  
... [+631 chars truncated]

### Assistant | 2026-05-19T03:21:24.965Z

The E2E test for "fleet reaper" is well-grounded — 40 leaf-index entries match "reaper" including multiple `architecture`-type bodies. The E2E test is acceptably stable: it asserts against a heavily-documented topic in this repo, not a marginal one. Let me check a couple of the looser assertions and resource hygiene.

### Assistant | 2026-05-19T03:21:34.022Z

[tool_use: Bash]

### User | 2026-05-19T03:21:42.162Z

[tool_result] tokenScore(aaaa,[aa]) = 2 (non-overlapping: expect 2)
scanRegressions strips bullet: "2026-05-01 | **chatter fix in "
normalizeSlug([[a/b]]) = "b"
normalizeSlug(UPPER.MD) = "UPPER"

### Assistant | 2026-05-19T03:21:45.888Z

Now let me check which exported functions are tested vs untested, and resource hygiene of the E2E subprocess test.

### Assistant | 2026-05-19T03:21:48.280Z

[tool_use: Bash]

### User | 2026-05-19T03:21:53.830Z

[tool_result] Exported functions/consts: MEMORY_TYPES, _resetLeafCacheForTests, collectBodies, collectMemoryNames, collectWikiNames, composeBrief, enrichTribalText, excerptBody, loadWikiLeafIndex, main, normalizeSlug, parseArgs, renderBriefMarkdown, resolveMemoryFile, scanRegressions, searchWikiLeaves, stripFrontmatter, tokenScore, writeBrief
---
Functions referenced in test imports:

  parseArgs,
  stripFrontm
... [+406 chars truncated]

### Assistant | 2026-05-19T03:21:57.872Z

`main()` is exported but not directly imported — it's only exercised via the E2E subprocess test. `MEMORY_TYPES` const isn't asserted. Let me check a few specific failure-mode gaps and verify the writeBrief test's path-separator assertion on Windows.

### Assistant | 2026-05-19T03:22:08.241Z

[tool_use: Bash]

### User | 2026-05-19T03:22:22.632Z

[tool_result] path.sep on this platform = "\\"
unresolvable id -> mode: topic (expect topic)
parseArgs([--slot]) slot = null (undefined-arg edge, untested)
parseArgs([--json]) target = null (expect null)

### Assistant | 2026-05-19T03:22:26.062Z

I have enough to complete the review. Let me do one final check on the `composeBrief` unit-mode path — the biggest untested area — and the `loadWikiLeafIndex` cache state-leak concern.

### Assistant | 2026-05-19T03:22:28.285Z

[tool_use: Bash]

### User | 2026-05-19T03:22:37.165Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'lookupUnit\|gitCommitsForMilestone\|resolveSlotToUnit\|mode === "unit"\|mode: "unit"'
--- test count for composeBrief ---
31
--- does any test exercise commits[] / unit-mode rendering? ---
322:    commits: [], masterHits: [], missingWiki: [], missingMemory: [], warnings: [],
338:      wi
... [+75 chars truncated]

### Assistant | 2026-05-19T03:23:12.560Z

Confirmed: no test exercises the `mode === "unit"` path. `commits[]` only appears as an empty array fed into `renderBriefMarkdown` directly (line 322 is the `renderBriefMarkdown` test), never as output of `composeBrief` in unit mode. The entire unit-resolution branch (`lookupUnit` resolving true → `buildQueryTokens` → `gitCommitsForMilestone` → `## 📜 Prior commits in milestone` rendering) is untested.

I have completed the independent second-pass review.

---

## Review: `H:/prism/scripts/build-brief.test.mjs`

All 31 tests pass (`node --test`, 5.0s). The suite is well-structured, hermetic for units, has two real-repo E2E tests, and the imports/conventions conform to other PRISM `node:test` suites. The fuzz invariant and resource hygiene are sound. However, two correctness/coverage issues warrant attention.

### P1 — The IDF test does NOT isolate IDF; a regression that removes IDF alone stays green

`searchWikiLeaves — IDF: a rare discriminating token outranks a common one` claims to pin IDF weighting. I verified the math: the expected `#1` (`chatter-stability`, score 16.6275) is exactly what correct IDF scoring produces. **But the test passes for a partially-wrong reason.** I re-ran the scorer with IDF removed (idf=1 for every token):

- With IDF removed: `chatter-stability` still ranks #1 — score **3.75** vs `milling-thing` **3.00**. The win comes entirely from the `architecture` type's `LEAF_MEATY_MULT` (1.25): `3 × 1.25 = 3.75 > 3.00`.
- The test only fails if **both** IDF *and* the meaty multiplier are removed.

So a real regression — someone deletes the `idf` Map and multiplies by raw weights — would leave this test green. The test's own docstring and the assertion message (`"the rare 'chatter' token must rank #1"`) assert it pins IDF; it does not. To genuinely pin IDF, either give the `chatter` entry a non-meaty type (e.g. `action`, same as the milling docs) so the *only* differentiator is IDF, or add a second assertion on the numeric `score` ratio (`hits[0].
... [+3875 chars truncated]
