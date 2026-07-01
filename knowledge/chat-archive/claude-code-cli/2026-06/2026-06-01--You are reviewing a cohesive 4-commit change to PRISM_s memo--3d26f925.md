---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "You are reviewing a cohesive 4-commit change to PRISM's memory-recall pipeline ("
date: "2026-06-01"
first_ts: "2026-06-01T14:22:40.597Z"
last_ts: "2026-06-01T14:27:59.142Z"
cwd: "H:\\prism-slot-golf"
messages: 57
user_msgs: 23
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-aa9fe0ed7ff80445e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# You are reviewing a cohesive 4-commit change to PRISM's memory-recall pipeline (

> **claude-code-cli** | 2026-06-01 | 57 msgs (23 user / 34 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-aa9fe0ed7ff80445e.jsonl`

## Transcript

### User | 2026-06-01T14:22:40.597Z

You are reviewing a cohesive 4-commit change to PRISM's memory-recall pipeline (slot:golf, 2026-06-01). Read each file END-TO-END and report ONLY P0 (breaks/regresses/incorrect) and P1 (significant) findings, then grade PASS or FAIL. Be adversarial — try to find real bugs.

CONTEXT: the per-prompt memory recall injector (`memory-index-precheck-inject.mjs`) is currently DISABLED fleet-wide via `PRISM_MEMORY_INDEX_INJECT=0` in settings.json — this is KNOWN and intentional (an operator decision to re-enable is pending). Do NOT flag "the hook is disabled" as a bug. Focus on: is the CODE correct, safe, and regression-free for when it IS enabled, and for the other consumers (the sidecar build, brain_recall).

FILES (read fully, absolute paths):
1. H:/prism/scripts/lib/memory-index-search-lib.mjs — added: isSupersededMemory()/SUPERSEDED_DECL_RE/supersededExclusionEnabled(); domainBoost()/DEFAULT_DOMAIN_BOOST; and in runMemoryIndexSearch() the excludeSuperseded live-scan skip + boostDomain/boostWeight additive boost (applied in BOTH the sidecar-records path and the live-scan path).
2. H:/prism/scripts/build-memory-index-sidecar.mjs — added excludeSuperseded filter in buildSidecar's vault-namespace loop (NOT the galaxy-brain loop) + supersededSkipped counter.
3. H:/prism/.claude/hooks/memory-index-precheck-inject.mjs — added resolveBoostDomain() (reads PRISM_BOOT_SLOT → galaxyForSlot), the throttle gate (shouldThrottleInject), and passes boostDomain to runMemoryIndexSearch.
4. H:/prism/scripts/lib/inject-throttle.mjs — per-session same-prompt throttle (pure decideThrottle + per-session-file I/O, fail-open).
5. H:/prism/scripts/memory-recall-lint.mjs — per-galaxy recall-readiness analyzer + dashboard generator.

DESIGN INVARIANTS TO VERIFY (flag any violation as P0/P1):
- Supersession detector is CASE-SENSITIVE and matches ONLY the canonical declaration `[SUPERSEDED` or `> **SUPERSEDED` — must NOT match present-tense "SUPERSEDES" (the superseder, which must stay) or lowercase
... [+1058 chars truncated]

### Assistant | 2026-06-01T14:22:55.102Z

I'll review these 4 commits to the memory-recall pipeline. Let me read all 5 files end-to-end.

### Assistant | 2026-06-01T14:22:56.061Z

[tool_use: Read]

### Assistant | 2026-06-01T14:22:56.541Z

[tool_use: Read]

### Assistant | 2026-06-01T14:22:57.116Z

[tool_use: Read]

### Assistant | 2026-06-01T14:22:57.495Z

[tool_use: Read]

### Assistant | 2026-06-01T14:22:57.721Z

[tool_use: Read]

### User | 2026-06-01T14:23:16.534Z

[tool_result] 1	#!/usr/bin/env node
2	// Pure-core search over the Obsidian memory vault for free-floating memories
3	// not pre-joined to system-graph.json nodes.
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: master-index-search-lib only finds
6	// memories that some system-graph node has linked via knowledge.memoryEntries[].
7	// The ~492 memory .md files in H:/prism/knowledge/memories/{feedback,refere
... [+36978 chars truncated]

### User | 2026-06-01T14:23:17.643Z

[tool_result] 1	#!/usr/bin/env node
2	// U-MEMORY-INDEX-SIDECAR — pre-build the memory-vault sidecar so the H7
3	// UserPromptSubmit hook (memory-index-precheck-inject.mjs) can hit a
4	// pre-parsed JSON instead of cold-scanning the ~492-file vault every prompt
5	// (measured at ~8.7 s — exceeded the 5 s UPS timeout, so H7 shipped UNWIRED).
6	//
7	// Reads:  H:/prism/knowledge/memories/{feedback,reference,proje
... [+15789 chars truncated]

### User | 2026-06-01T14:23:19.412Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// memory-index-precheck-inject.mjs — UserPromptSubmit injector (T2, advisory).
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: surfaces top-K direct hits over
6	// the Obsidian memory vault (~492 files at audit time) when a user prompt
7	// has 2+ content tokens. Closes the gap left by master-index-precheck-inject
8	// (system-graph node search; only fin
... [+4954 chars truncated]

### User | 2026-06-01T14:23:20.329Z

[tool_result] 1	// scripts/lib/inject-throttle.mjs
2	// MEMORY-RECALL-THROTTLE (2026-06-01 slot:golf): per-session same-prompt throttle
3	// for UserPromptSubmit injectors. memory-index-precheck-inject's doc comment
4	// promised a "per-session prompt-hash throttle (60s) to avoid context-burn on
5	// /loop ticks" but main() never implemented it (a doc-vs-code lie, R12). /loop
6	// re-submits the SAME prompt eac
... [+3819 chars truncated]

### User | 2026-06-01T14:23:21.799Z

[tool_result] 1	#!/usr/bin/env node
2	// memory-recall-lint.mjs — MEMORY-GEN-COVERAGE (2026-06-01 slot:golf)
3	//
4	// The GENERATION-side companion to the invocation units U-MRS-EXCLUDE (supersession
5	// exclusion) + U-MRDB-WIRE (per-galaxy domain boost): a per-galaxy recall-READINESS
6	// scorecard. It answers "does each galaxy keep its primary domain context?" by
7	// scoring every galaxy's brain record (th
... [+8539 chars truncated]

### Assistant | 2026-06-01T14:23:29.153Z

Now let me verify the dependencies referenced — `slot-galaxy-map.mjs` (used for `galaxyForSlot` and `SLOT_GALAXY_MAP`) and how `brain_recall` consumes `runMemoryIndexSearch`, plus the `description`-form superseded marker convention to validate the regex.

### Assistant | 2026-06-01T14:23:29.592Z

[tool_use: Read]

### Assistant | 2026-06-01T14:23:30.853Z

[tool_use: Grep]

### Assistant | 2026-06-01T14:23:31.955Z

[tool_use: Grep]

### User | 2026-06-01T14:23:43.702Z

[tool_result] 1	// scripts/lib/slot-galaxy-map.mjs
2	// SINGLE SOURCE OF TRUTH for slot -> galaxy mapping (GALAXY-KIT-MS0, slot:bravo 2026-05-29).
3	//
4	// Was TRIPLICATED across:
5	//   .claude/hooks/slot-context-bundle-inject.mjs
6	//   scripts/generate-per-slot-skill-wrappers.mjs
7	//   scripts/generate-per-slot-galaxy-buildout-files.mjs
8	// with no shared import. The drift already caused two real bugs:
9	
... [+2436 chars truncated]

### User | 2026-06-01T14:23:44.280Z

[tool_result] H:\prism\knowledge\memories\MEMORY-ARCHIVE.md:72:- [GOLF owns reaper (SUPERSEDES alpha)](feedback_golf_owns_reaper.md) — 2026-05-16 golf. golf-slot-reaper-guardian.mjs wired; alpha unwired+preserved. PRISM_GOLF_GUARDIAN_DISABLE knob. Smoke-tested.
H:\prism\knowledge\memories\feedback\feedback_alpha_owns_reaper.md:3:description: "[SUPERSEDED 2026-05-16 → [[feedback_golf_owns_reaper]]] The chat slot
... [+3468 chars truncated]

### User | 2026-06-01T14:24:04.928Z

[tool_result] Found 1 file
.claude\hooks\memory-index-precheck-inject.mjs

### Assistant | 2026-06-01T14:24:09.177Z

The grep confirms the live vault data. Let me verify a few critical details: the actual body-blockquote form of a superseded marker (to confirm the regex's second branch matches real data), and how `brain_recall` / other consumers call `runMemoryIndexSearch`.

### Assistant | 2026-06-01T14:24:12.078Z

[tool_use: Bash]

### Assistant | 2026-06-01T14:24:12.952Z

[tool_use: Read]

### User | 2026-06-01T14:24:22.992Z

[tool_result] 1	---
2	name: feedback_alpha_owns_reaper
3	description: "[SUPERSEDED 2026-05-16 → [[feedback_golf_owns_reaper]]] The chat slotted into `alpha` USED TO own the fleet reaper; ownership moved to golf to unify fleet-hygiene under one slot."
4	aliases: feedback_alpha_owns_reaper
5	type: feedback
6	source: prism-memory
7	synced: 2026-06-01T14:20:08.804Z
8	---
9	
10	
11	> **SUPERSEDED 2026-05-16 — see [[
... [+3443 chars truncated]

### User | 2026-06-01T14:24:24.763Z

[tool_result] ---TESTS---

### Assistant | 2026-06-01T14:24:29.432Z

This is the canonical superseded example and confirms both marker forms in real data. The grep for `runMemoryIndexSearch` callers returned no `.ts`/`.js` results other than the hook — let me check `.mjs` files specifically (the prior search used `--type js --type ts`, which excludes `.mjs`), plus the `brain_recall` skill and any test coverage for these new functions.

### Assistant | 2026-06-01T14:24:31.542Z

[tool_use: Bash]

### Assistant | 2026-06-01T14:24:34.038Z

[tool_use: Bash]

### User | 2026-06-01T14:24:43.204Z

[tool_result] === test files touching new funcs ===
=== any inject-throttle test ===
scripts/lib/bg-app-throttle.mjs  8.8K
scripts/lib/inject-throttle.mjs  3.9K
scripts/lib/inject-throttle.test.mjs  4.5K
detector-bandit-tune.test.mjs  12.7K
rtk-fraction-tune.test.mjs  8.6K
system-viz-find-cache.test.mjs  14.9K
token-awareness-state.test.mjs  13.6K
token-savings-router-table.test.mjs  7.8K
transcript-token-count
... [+144 chars truncated]

### User | 2026-06-01T14:24:45.376Z

[tool_result] === runMemoryIndexSearch callers (.mjs) ===
grep: unknown option -- g
Usage: grep [OPTION]... PATTERN [FILE]...
Try 'grep --help' for more information.

=== brain_recall / brain-recall references ===
grep: unknown option -- g
Usage: grep [OPTION]... PATTERN [FILE]...
Try 'grep --help' for more information.

### Assistant | 2026-06-01T14:24:54.411Z

The `rg` calls got mangled because `rtk` rewrote them into raw `grep`. Let me use the Grep tool directly instead.

### Assistant | 2026-06-01T14:24:55.348Z

[tool_use: Grep]

### Assistant | 2026-06-01T14:24:56.540Z

[tool_use: Grep]

### User | 2026-06-01T14:25:00.808Z

[tool_result] scripts\build-memory-index-sidecar.test.mjs:15:  runMemoryIndexSearch,
scripts\build-memory-index-sidecar.test.mjs:363:describe("runMemoryIndexSearch with sidecar fast-path", () => {
scripts\build-memory-index-sidecar.test.mjs:376:    const { tokens, hits, source } = runMemoryIndexSearch("cutting tools query", {
scripts\build-memory-index-sidecar.test.mjs:405:    const { source, hits } = runMemory
... [+2396 chars truncated]

### User | 2026-06-01T14:25:28.854Z

[tool_result] Found 5 files
scripts\lib\memory-index-search-lib.test.mjs
scripts\lib\memory-index-search-lib.mjs
scripts\generate-scripts-lib-atomic.mjs
scripts\build-memory-index-sidecar.test.mjs
scripts\build-memory-index-sidecar.mjs

### Assistant | 2026-06-01T14:25:35.781Z

Important finding: line 77 of the hook shows `runMemoryIndexSearch(prompt, { topK: TOP_K })` WITHOUT `boostDomain` — but line 105 in my read showed it WITH `boostDomain`. The grep is hitting a stale index/cached version; the file I Read (authoritative, line 105) has `boostDomain`. Let me confirm there's no duplicate call site and verify the existing test file matches the new signatures. Let me check the throttle test and the lib test for coverage of the new functions.

### Assistant | 2026-06-01T14:25:36.040Z

[tool_use: Read]

### Assistant | 2026-06-01T14:25:38.062Z

[tool_use: Grep]

### User | 2026-06-01T14:25:42.137Z

[tool_result] 1	// Tests for inject-throttle.mjs — per-session same-prompt throttle.
2	import { describe, it } from "node:test";
3	import { strict as assert } from "node:assert";
4	
5	import {
6	  promptHash, safeSessionId, decideThrottle, statePathFor,
7	  loadPrev, savePrev, shouldThrottleInject, DEFAULT_THROTTLE_MS,
8	} from "./inject-throttle.mjs";
9	
10	describe("promptHash", () => {
11	  it("is determinis
... [+4578 chars truncated]

### User | 2026-06-01T14:25:44.354Z

[tool_result] No matches found

### Assistant | 2026-06-01T14:25:54.006Z

Significant finding: the existing `memory-index-search-lib.test.mjs` has ZERO coverage of the four new exported functions (`isSupersededMemory`, `domainBoost`, `supersededExclusionEnabled`, `SUPERSEDED_DECL_RE`) and zero coverage of the `excludeSuperseded`/`boostDomain` paths in `runMemoryIndexSearch`. Let me check the sidecar test file for whether it covers the new supersession-skip behavior, and confirm the `STOPWORDS` set's interaction with the regex (the word "memory" is a stopword — relevant to recall). Let me also verify whether the `> **SUPERSEDED` blockquote form would match given that the body passed to `isSupersededMemory` in the live-scan path is the FULL file body (frontmatter included).

### Assistant | 2026-06-01T14:25:55.421Z

[tool_use: Read]

### Assistant | 2026-06-01T14:25:56.423Z

[tool_use: Grep]

### User | 2026-06-01T14:26:01.791Z

[tool_result] 1	// Tests for build-memory-index-sidecar.mjs builder + the lib's tryLoadMemorySidecar
2	// fast-path. Hermetic via injected fs implementations + a tmpdir for the lib
3	// stale-gate end-to-end test.
4	
5	import { describe, it } from "node:test";
6	import { strict as assert } from "node:assert";
7	import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
8	
... [+1905 chars truncated]

### User | 2026-06-01T14:26:03.483Z

[tool_result] 16:  isSupersededMemory,
17:  SUPERSEDED_DECL_RE,
18:  domainBoost,
792:// MEMORY-RECALL-SUPERSEDE (2026-06-01 slot:golf) — formally-superseded memories
796:const SUPERSEDED_DESC_FORM = `---
798:description: "[SUPERSEDED 2026-05-16 → [[golf-owns-reaper]]] The alpha slot USED TO own the fleet reaper."
803:> **SUPERSEDED 2026-05-16 — see [[golf-owns-reaper]].** The golf slot now owns the fleet reape
... [+2478 chars truncated]

### Assistant | 2026-06-01T14:26:07.550Z

The new test coverage IS in `build-memory-index-sidecar.test.mjs` (not the lib test file). My earlier finding about missing coverage was wrong. Let me read the full test block (lines 790-1000) to verify it covers the key invariants, including the live-scan path and the relevance-gate ordering.

### Assistant | 2026-06-01T14:26:08.101Z

[tool_use: Read]

### User | 2026-06-01T14:26:17.516Z

[tool_result] 790	});
791	
792	// MEMORY-RECALL-SUPERSEDE (2026-06-01 slot:golf) — formally-superseded memories
793	// are excluded from the recall corpus so no galaxy surfaces stale doctrine as
794	// current. Fixtures mirror the EXACT corpus syntax (verified against the live
795	// vault). The negative controls are the real false-positive traps.
796	const SUPERSEDED_DESC_FORM = `---
797	name: alpha-owns-reape
... [+8508 chars truncated]

### Assistant | 2026-06-01T14:26:23.223Z

Test coverage is thorough and directly verifies all the stated invariants, including the live-scan path, the relevance-gate ordering, the additive-not-suppressing property, and all the supersession negative controls.

Now let me run the test suite to confirm everything passes, and verify the one nuance I want to confirm: in the live-scan path, `isSupersededMemory(body)` is called with the FULL file body (including frontmatter), so the description-form `[SUPERSEDED` inside the YAML frontmatter must match. Let me confirm the suite passes.

### Assistant | 2026-06-01T14:26:24.171Z

[tool_use: Bash]

### User | 2026-06-01T14:26:28.622Z

[tool_result]   ...
# Subtest: scoreMemoryRecord: missing aliases field (legacy sidecar record) → no crash, no W_ALIAS contribution
ok 63 - scoreMemoryRecord: missing aliases field (legacy sidecar record) → no crash, no W_ALIAS contribution
  ---
  duration_ms: 0.1361
  ...
# Subtest: scoreMemoryRecord: aliases as non-array (defensive) → ignored, no crash
ok 64 - scoreMemoryRecord: aliases as non-array (defensi
... [+376 chars truncated]

### Assistant | 2026-06-01T14:26:35.207Z

All 113 tests pass across the three suites. Now let me do my adversarial analysis of the design invariants. A few specific things I want to scrutinize carefully:

1. The hybrid (RRF) path carrying the boost — does the boost survive the RRF fusion?
2. The supersession exclusion in the *galaxy-brain* path.
3. The throttle `savePrev` failure interaction with fail-open.

Let me re-examine the hybrid path closely. In `runMemoryIndexSearch` sidecar branch: `scoredSc` carries the boosted score (line 679), then `tryHybridFuse({ query, bm25Ranked: scoredSc, ... })`. Inside `tryHybridFuse`, `bm25Keys = bm25Ranked.map(recordKey)` — it only uses the *order* of `scoredSc`, not the scores. So the boost re-orders `scoredSc`, which becomes the BM25 ranking fed into RRF. Let me trace whether the boost is actually load-bearing through RRF.

### Assistant | 2026-06-01T14:26:36.311Z

[tool_use: Read]

### User | 2026-06-01T14:26:52.162Z

[tool_result] 360	describe("extractGalaxyDomainText (A3-enrichment)", () => {
361	  it("captures domain vocabulary (heading text + filename-heuristic + fenced rules), not the H1", () => {
362	    const t = extractGalaxyDomainText(CASCADE_STUB_BRAIN);
363	    assert.match(t, /Filename heuristic: lathe, turning, css, g96/);
364	    assert.match(t, /Candidate lathe-domain memories/);    // H2 heading text kept
365
... [+3537 chars truncated]

### Assistant | 2026-06-01T14:27:05.553Z

Now I have a complete picture. Let me trace through the RRF-boost interaction analytically, which is the subtlest invariant, and reason about edge cases. My analysis is complete. Let me consolidate the findings.

Key analytical points I've verified:

**RRF boost interaction (the subtle one):** In the sidecar branch, the boost is applied to `scoredSc[].score`, which determines `scoredSc`'s sort order. `tryHybridFuse` then does `bm25Keys = scoredSc.map(recordKey)` — using only the *rank order*, not the scores. So the boost DOES carry into RRF: a boosted brain that moves up in `scoredSc` gets a better `bm25` rank → better `1/(k+rank+1)` contribution → higher RRF. The boost is preserved through the hybrid path, but **its magnitude is rank-quantized** (RRF only sees position, not score delta). This is acceptable behavior (RRF is rank-based by design), and the comment claims "the hybrid (RRF) path correctly carrying the boost" — it does. No bug.

**Relevance-gate in hybrid:** Records with `base <= 0` are `continue`d before being pushed to `scoredSc` AND before being added to... wait — they're skipped from `scoredSc` but `byKey.set()` happens for ALL records (line 676, before the gate). So a zero-BM25 brain is in `byKey` but not `scoredSc`. Could the dense arm resurrect it? Yes — if the brain has high cosine similarity it appears in `denseKeys`, gets fused, and hydrates from `byKey`. But that's the *dense* arm surfacing it on semantic merit, NOT the domain boost. The domain boost only touches `scoredSc`. So invariant (b) "a zero-match brain is never injected *by the boost*" holds. Confirmed.

Let me verify one more potential issue — the throttle's behavior when `savePrev` fails (disk error) under a persistent loop, and whether the galaxy-brain supersession gap is real.

### Assistant | 2026-06-01T14:27:06.540Z

[tool_use: Read]

### User | 2026-06-01T14:27:17.957Z

[tool_result] 430	    });
431	    assert.equal(records.length, 1);
432	    // The DOMAIN signal ("turning") is now in opening — the whole point of the enrichment.
433	    assert.match(records[0].opening, /turning/);
434	    assert.doesNotMatch(records[0].opening, /per-domain memory cascade index/);
435	    // description still carries the H1 (galaxy name signal preserved).
436	    assert.match(records[0].descri
... [+1716 chars truncated]

### Assistant | 2026-06-01T14:27:59.142Z

I have everything I need. Let me write up the review.

## Code Quality Analysis Report — memory-recall pipeline (slot:golf, 2026-06-01)

I read all 5 files end-to-end, the dependency `slot-galaxy-map.mjs`, the canonical live superseded fixture (`feedback_alpha_owns_reaper.md`), the test suites, and ran all 113 tests (pass 113 / fail 0). I traced the boost through both scoring loops AND the RRF hybrid path.

### Verification of each stated invariant

**Supersession detector (case-sensitive, canonical-only):** `SUPERSEDED_DECL_RE = /\[SUPERSEDED\b|(?:^|\n)\s*>\s*\*\*SUPERSEDED\b/` is correct.
- Branch 1 `\[SUPERSEDED\b` matches the description form `[SUPERSEDED 2026-05-16 → [[…]]]` (verified against live `feedback_alpha_owns_reaper.md:3`).
- Branch 2 matches the body blockquote `> **SUPERSEDED …` at line start (live `feedback_alpha_owns_reaper.md:11`).
- Case-sensitivity is load-bearing: no `i` flag, so `SUPERSEDES` (present-tense superseder) and lowercase topical `superseded` correctly DON'T match. The `\b` after `SUPERSEDED` prevents `SUPERSEDES` from matching branch 1 (`[SUPERSEDED` requires a literal `[` immediately before, which `SUPERSEDES` never has; and `SUPERSEDES` has `S` after `SUPERSEDED`, but `\b` between `D` and `E`? No — `D`→`E` is word-to-word so `\b` fails. Correct). All 6 negative/positive controls in the test pass.
- No ReDoS: both alternatives are linear, no nested quantifiers, no catastrophic backtracking. The live-scan also reads only up to `maxBodyBytes+512` per file with a total-bytes cap. Safe.

**Domain boost — additive / relevance-gated / opt-in / brain-only:** Verified in BOTH loops.
- Sidecar loop (679) and live loop (712): identical pattern `if (base <= 0) continue;` BEFORE `score = base + domainBoost(...)`. Relevance-gate is correctly upstream of the boost.
- `domainBoost` (235-238) returns nonzero ONLY when `rec.namespace === "galaxies" && rec.name === boostDomain`, else `0` — never negative. Additive, brain-only confirmed.
- Opt-in: `b
... [+4564 chars truncated]
