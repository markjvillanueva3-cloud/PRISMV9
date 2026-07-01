---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Independent review (arm B of PRISM 3-of-3; read-only; concise PASS/FAIL + P0/P1/"
date: "2026-06-17"
first_ts: "2026-06-17T03:50:20.712Z"
last_ts: "2026-06-17T03:52:22.442Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 16
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-ad6374c9ea46c1f07.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Independent review (arm B of PRISM 3-of-3; read-only; concise PASS/FAIL + P0/P1/

> **claude-code-cli** | 2026-06-17 | 40 msgs (16 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-ad6374c9ea46c1f07.jsonl`

## Transcript

### User | 2026-06-17T03:50:20.712Z

Independent review (arm B of PRISM 3-of-3; read-only; concise PASS/FAIL + P0/P1/P2 + file:line). Do NOT assume arm A caught everything; weight toward test integrity, convention conformance, ASCII-guard, and edge cases.

Committed fix: git-grounded shipped-detection for the zulu build-loop cron. Files:
- H:/prism/scripts/lib/zulu-build-queue.mjs (new parseShippedFromCommits + buildQueueFromTexts git union)
- H:/prism/scripts/lib/zulu-build-queue.test.mjs (7 new tests)
- H:/prism/scripts/zulu-build-loop.mjs (fail-soft execFileSync git log)

Check specifically:
1. ASCII-guard: any non-ASCII (em-dash/smart-quote/emoji) introduced in the .mjs files? (the lib header claims ASCII-only)
2. Test integrity: are the 7 new tests real reference-value assertions (not toBeDefined stubs)? any .skip/.only? Does the "live C1-C8 reality" test actually assert all 8 + size===8?
3. Convention: does parseShippedFromCommits match the existing pure-function style (exported, Set return, no I/O)? Does the driver's execFileSync addition match the file's existing import/error-handling idiom?
4. Regex edge: could `/U-Z(?:BL|ULU-CAP)-((?:C\d+)+)/gi` mis-handle lowercase `u-zbl-c8`, or a commit like `REVERT U-ZBL-C8` (would a reverted unit be falsely counted shipped)? Assess the revert blind-spot severity.
5. Any inlined magic number that should be a const (timeout/maxBuffer)?

Concise verdict PASS/FAIL + file:line for any finding.

### Assistant | 2026-06-17T03:50:23.700Z

I'll review the committed fix. Let me read all three files end-to-end and verify the claims.

### Assistant | 2026-06-17T03:50:24.194Z

[tool_use: Read]

### Assistant | 2026-06-17T03:50:24.646Z

[tool_use: Read]

### User | 2026-06-17T03:50:24.818Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\zulu-build-queue.mjs' was already read 2m ago in this session and is unchanged (mtime 1781648108150). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T03:50:24.879Z

[tool_use: Read]

### User | 2026-06-17T03:50:25.218Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\zulu-build-queue.test.mjs' was already read 2m ago in this session and is unchanged (mtime 1781648227588). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T03:50:25.453Z

[tool_result] read-once-guard: 'H:\prism\scripts\zulu-build-loop.mjs' was already read 2m ago in this session and is unchanged (mtime 1781648172130). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T03:50:29.841Z

The files are already in my context from earlier reads this session. Let me verify a few specifics against the actual code — the exact byte content for non-ASCII, the regex behavior, and confirm the live commit reality.

### Assistant | 2026-06-17T03:50:31.735Z

[tool_use: Bash]

### Assistant | 2026-06-17T03:50:32.967Z

[tool_use: Bash]

### User | 2026-06-17T03:50:43.217Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
EXIT=0

### User | 2026-06-17T03:50:48.032Z

[tool_result] ---REVERTS---
58575a3f46 [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-INFRA-BATCH4B (slot:papa): clean tsc 262->255 (7 cleared, 0 new) -- 4 infra files; RoadmapIntelligence REVERTED (verify FAIL)
b36894cc54 [MAIN-FORCE] [INDIA-WORK-COMPILE]/U-SELECTIVE-PROMOTE-REVERT (slot:india): revert auto-promote -- single-seed 0.808 disproven by a fresh 0.4286 retrain

### Assistant | 2026-06-17T03:50:50.632Z

The grep failed due to locale. Let me retry the ASCII scan with a UTF-8 locale and check the git log without the locale issue.

### Assistant | 2026-06-17T03:50:52.551Z

[tool_use: Bash]

### Assistant | 2026-06-17T03:50:53.344Z

[tool_use: Bash]

### User | 2026-06-17T03:50:57.606Z

[tool_result] GREP_EXIT=1  (1 = no non-ASCII found, 0 = found)

### User | 2026-06-17T03:51:03.231Z

[tool_result] 03b14647a4 [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C5-TRENDGATE-CONTRACT-FIX (slot:zulu): C5 honored its 'single spike never escalates' contract only once the window was full -- a cold slot's 1-2 breaching samples escalated
439532e7aa [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-PARSESHIPPED-LESSON (slot:zulu): wiki + CLAUDE.md regression record for the parseShipped prose-miscount fix (775a0f8287)
775a0f8287 [
... [+1850 chars truncated]

### Assistant | 2026-06-17T03:51:06.729Z

No non-ASCII bytes in any of the three files — the ASCII-guard claim holds. Now let me verify the live commit reality for the C1-C8 test and inspect the exact regex and git-grounding logic. Let me grep the key functions and the test assertions.

### Assistant | 2026-06-17T03:51:09.107Z

[tool_use: Grep]

### Assistant | 2026-06-17T03:51:10.250Z

[tool_use: Grep]

### User | 2026-06-17T03:51:10.549Z

[tool_result] 99- * the parseShipped prose-miscount regression: prove shipped by REALITY, not prose.
100- * Pure over the passed `git log --oneline` text.
101- */
102:export function parseShippedFromCommits(gitLogText) {
103-  const text = String(gitLogText || "");
104-  const shipped = new Set();
105-  // U-ZBL-C<n>  OR  U-ZULU-CAP-C<n>(C<n>)*  -- case-insensitive; capture the C-run then
106-  // split it so a
... [+1007 chars truncated]

### User | 2026-06-17T03:51:11.774Z

[tool_result] 21- * Knobs: PRISM_ZBL_DISABLE=1 (no-op), PRISM_ZBL_OLLAMA_DISABLE=1 (skip digest),
22- *        PRISM_ZBL_OLLAMA_MODEL, PRISM_OLLAMA_URL, PRISM_ROOT.
23- * Exit: 0 ok / 0 drained / 0 disabled (never fails a cron); 2 only on unreadable sources.
24: * ASCII-only. Uses global fetch (Node 22) for Ollama + a read-only fail-soft `git log`
25: * (execFileSync, no shell) for the git-reality shipped signa
... [+3550 chars truncated]

### Assistant | 2026-06-17T03:51:14.940Z

Now let me verify the test file's "live C1-C8 reality" test and confirm the 7 new tests are real assertions with no `.skip`/`.only`. Let me look at the test assertions directly.

### Assistant | 2026-06-17T03:51:17.622Z

[tool_use: Grep]

### User | 2026-06-17T03:51:19.014Z

[tool_result] 3-import {
4-  effortRank, idNum, parseEffort, parseCapabilitySpec, parseShipped,
5:  parseShippedFromCommits, computeQueue, buildQueueFromTexts,
6-} from "./zulu-build-queue.mjs";
7-
8-const EM = String.fromCharCode(0x2014); // em-dash for markdown fixtures (source stays ASCII)
9-
10:test("effortRank orders S<M<L<unknown", () => {
11:  assert.equal(effortRank("S"), 0);
12:  assert.equal(effortRan
... [+8003 chars truncated]

### Assistant | 2026-06-17T03:51:21.836Z

I found a critical issue. Line 89 of the test file contains `\ Regression:` — a backslash instead of `//` for a comment. Let me verify this is actually in the committed file and not a display artifact, and check the test file header for the ASCII claim and whether the test suite actually runs.

### Assistant | 2026-06-17T03:51:23.217Z

[tool_use: Read]

### User | 2026-06-17T03:51:24.442Z

[tool_result] 86	});
87	
88	test("parseShipped ignores inline-prose ids (the 'C8 signal' miscount regression)", () => {
89	  // Regression: a shipped unit's DESCRIPTION mentioning a not-yet-built unit in prose
90	  // (e.g. over_claim is "the C8 signal") falsely marked C8 done -> loop DRAINED early.
91	  // Only bullet-header ids count now.
92	  const brief = [
93	    "## SHIPPED this session",
94	    "- **C7 Z
... [+551 chars truncated]

### Assistant | 2026-06-17T03:51:29.329Z

Line 89 is `// Regression:` — a correct comment. The `\ Regression:` in the Grep output was a rendering artifact of the Grep tool (it mangled the `//` and similar in earlier lines too, e.g. line 44-46 of the loop showed `drifts\goes` and `U-ZBL-C<n> \ U-ZULU-CAP`). The actual files are clean. Let me confirm by running the actual test suite to ground the PASS claim, and verify the regex against the lowercase/revert edge case directly.

### Assistant | 2026-06-17T03:51:30.275Z

[tool_use: Bash]

### Assistant | 2026-06-17T03:51:34.839Z

[tool_use: Bash]

### User | 2026-06-17T03:51:35.318Z

[tool_result]   ...
# Subtest: buildQueueFromTexts unions brief + git shipped sources
ok 18 - buildQueueFromTexts unions brief + git shipped sources
  ---
  duration_ms: 0.0938
  ...
# Subtest: buildQueueFromTexts without gitLogText is the legacy brief-only path (back-compat)
ok 19 - buildQueueFromTexts without gitLogText is the legacy brief-only path (back-compat)
  ---
  duration_ms: 0.5721
  ...
1..19
# test
... [+91 chars truncated]

### User | 2026-06-17T03:51:39.980Z

[tool_result] lowercase u-zbl-c8: ["C8"]
REVERT U-ZBL-C8: ["C8"]
Revert combined: ["C1","C2","C3"]
double-digit U-ZBL-C12: ["C12"]

### Assistant | 2026-06-17T03:51:43.893Z

All 19 tests pass, 0 skipped, 0 failed. The revert blind-spot is confirmed: `REVERT U-ZBL-C8` returns `C8` as shipped. Let me assess the real-world severity by checking whether any zulu unit was ever reverted in the actual log, and verify the `computeQueue` governance-gating behavior so I understand whether a falsely-shipped unit could actually skip a build.

### Assistant | 2026-06-17T03:51:45.773Z

[tool_use: Bash]

### Assistant | 2026-06-17T03:51:46.522Z

[tool_use: Read]

### User | 2026-06-17T03:51:51.976Z

[tool_result] EXIT=1 (1=no revert of a zulu C-unit found in 400 commits)

### User | 2026-06-17T03:51:53.064Z

[tool_result] 110	  return shipped;
111	}
112	
113	/**
114	 * Compute the build queue from candidates + a shipped-id set.
115	 * - done: candidates whose id is in `shipped`.
116	 * - blocked: candidates marked governance/operator-gated (never auto-queued).
117	 * - pending: the rest, ranked effort(S<M<L<unknown) then numeric id.
118	 * Returns { done, pending, blocked, next }. Pure.
119	 */
120	export function 
... [+749 chars truncated]

### Assistant | 2026-06-17T03:52:22.442Z

I have everything I need. Let me finalize the assessment.

**Summary of verification:**

1. **ASCII-guard** — `grep -P '[^\x00-\x7F]'` (UTF-8 locale) returned exit 1 (no matches) on all three `.mjs` files. The test file uses `String.fromCharCode(0x2014)` for em-dash fixtures, keeping the source itself ASCII. The `\ Regression:` / `drifts\goes` strings in earlier Grep output were Grep-tool rendering artifacts; line 89 reads `// Regression:` correctly in the raw Read. **Clean.**

2. **Test integrity** — All 19 tests are real reference-value assertions (`assert.equal`/`assert.deepEqual`/`assert.ok` against concrete ids, sizes, ordering). No `toBeDefined()` stubs, no `.skip`/`.only`. The live C1-C8 test (line 170-185) asserts every id `C1..C8` is detected **and** `assert.equal(s.size, 8)` — so it pins both presence and the exact count. `node --test` ran green: 19 pass / 0 fail / 0 skipped. The 7 new `parseShippedFromCommits`/git-grounding tests cover happy, combined-form, adversarial (empty/null/no-marker/prose), drained-on-drift, union, and back-compat. **Strong.**

3. **Convention** — `parseShippedFromCommits` (line 102) matches the existing pure-function style: exported, returns a `Set`, no I/O, `String(x||"")` guard like the siblings. `buildQueueFromTexts` unions via `parseShipped` + `parseShippedFromCommits` with an optional `opts.gitLogText` (back-compat preserved). The driver's `execFileSync` (loop line 50-56) matches the file's fail-soft idiom — `try/catch { return "" }` mirrors `readSafe` (line 40) and the Ollama/ledger catches; `git log` is read-only, no shell. **Conformant.**

4. **Regex edge** — verified live: lowercase `u-zbl-c8` → `C8` (the `i` flag handles it correctly), double-digit `U-ZBL-C12` → `C12` (the `\d+` is greedy, correct). **Revert blind-spot confirmed**: `REVERT U-ZBL-C8` → `{C8}` and `Revert U-ZULU-CAP-C1C2C3` → `{C1,C2,C3}` — a reverted unit IS falsely counted shipped. Severity assessment below.

5. **Magic numbers** — `timeout: 15000`, `ma
... [+2662 chars truncated]
