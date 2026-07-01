---
type: "chat-session"
source: "claude-code-cli"
session_id: "eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf"
title: "Review `H:/prism/scripts/lib/zebra-context-bundle.test.mjs` (just created, ~280 "
date: "2026-05-21"
first_ts: "2026-05-21T16:38:06.592Z"
last_ts: "2026-05-21T16:38:58.049Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a293ce7413dd937f7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review `H:/prism/scripts/lib/zebra-context-bundle.test.mjs` (just created, ~280 

> **claude-code-cli** | 2026-05-21 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a293ce7413dd937f7.jsonl`

## Transcript

### User | 2026-05-21T16:38:06.592Z

Review `H:/prism/scripts/lib/zebra-context-bundle.test.mjs` (just created, ~280 lines, 26 tests across 9 suites) as part of ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 per the CLAUDE.md per-file scrutiny gate. The unit-under-test is `H:/prism/scripts/lib/zebra-context-bundle.mjs` (CLAUDE-BRIEF + PRISM-BUILD-VISION reader with mtime-keyed cache, pure-core + injected reader pattern).

Spec acceptance criteria from `H:/prism/state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.md` §7 requires tests to pin: **fail-soft + cache-hit + ttl-expiry + stale-mark behavior + real-data E2E** (per MS1 P0 lesson: "pure-core+injected-readers MUST ship a real-data E2E"). Tests currently 26/26 PASS.

Read the whole test file end-to-end. Verify:
1. **Coverage completeness** — every lib export covered? (`defaultReader`, `loadBrief`, `loadVision`, `loadBriefAndVision`, `invalidateContextCache`, `getCacheSnapshot`, `DEFAULT_BRIEF_PATH`, `DEFAULT_VISION_PATH`)
2. **Acceptance-criteria coverage** — fail-soft (missing/disabled/no-path), cache-hit (source:"cache" + reader.calls assertion), TTL-expiry (re-read after TTL gap), stale-mark (age > staleHrs*3600), real-data E2E (actual disk files load).
3. **Edge cases pinned** — mtime in future (clock drift clamp), empty file (zero-byte valid), ttlMs:0 (skip cache), failed-read NOT cached, path normalization (mixed separator → same cache entry).
4. **Test integrity (R9)** — does every assertion verify *intent* not just *behavior*? Can each assertion fail when the business logic genuinely breaks? Any `expect().toBeDefined()` / `toBeTruthy()` / `.skip` smell?
5. **Hermeticity** — `beforeEach(invalidateContextCache + delete env)` properly isolates? Module-level `_cache` state can't leak between tests?
6. **Real-data E2E robustness** — handles both file-exists and file-missing cases on this checkout? Won't spuriously fail when files are absent in a fresh tree?
7. **R12 fail-loud** — does the test pin the explicit-empty-string-path → reason:"no-path" behavior (the bug I
... [+316 chars truncated]

### Assistant | 2026-05-21T16:38:30.182Z

I'll read the test file and verify it against the acceptance criteria.

### Assistant | 2026-05-21T16:38:30.206Z

[tool_use: Read]

### User | 2026-05-21T16:38:39.327Z

[tool_result] 1	// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 — tests for the CLAUDE-BRIEF + BUILD-VISION
2	// reader. Hermetic via injected synthetic reader + node:test + node:assert/strict.
3	//
4	// Acceptance criteria from `state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.md` §7:
5	//   - tests pin fail-soft + cache-hit + ttl-expiry + stale-mark behavior
6	//   - one real-data E2E per the MS1 P0 lesson
7	//     ("pure-co
... [+13833 chars truncated]

### Assistant | 2026-05-21T16:38:58.049Z

# Test Coverage Review — `zebra-context-bundle.test.mjs`

**Unit:** `H:/prism/scripts/lib/zebra-context-bundle.mjs`  
**Test File:** `H:/prism/scripts/lib/zebra-context-bundle.test.mjs`  
**Test Count:** 26 tests across 9 suites  
**Status:** 26/26 PASS

---

## Acceptance Criteria Coverage

✅ **All 6 exports pinned:**
- `defaultReader`, `loadBrief`, `loadVision`, `loadBriefAndVision` — direct suites
- `invalidateContextCache`, `getCacheSnapshot` — dedicated suite
- `DEFAULT_BRIEF_PATH`, `DEFAULT_VISION_PATH` — constant assertions (lines 209, 232)

✅ **MS1 P0 lesson met:** Real-data E2E in lines 307–336 (both files; gracefully handles missing on clean checkout via `fs.existsSync` guards).

✅ **Fail-soft pinned:** 3 suites cover missing, disabled-env, no-path (lines 76–102).

✅ **Cache behavior locked:**
- Cache-hit assertion: `reader.calls.get(p) === 1` after 2nd call (line 153) ✓
- TTL-expiry re-read (line 163) ✓
- Failed-read NOT cached (line 172) ✓
- `ttlMs=0` disables (line 180) ✓
- Path normalization (line 194) ✓

✅ **Edge cases:**
- Clock-drift safety (mtime > now → ageSeconds=0, line 131) ✓
- Zero-byte file valid (line 140) ✓
- Stale-mark threshold (line 123) ✓
- Env knobs (TTL/stale override, lines 285–304) ✓

---

## Issues Found

**P1 — R9 Integrity Gap (line 97–101):**  
`no-path` test conflates two conditions:
1. Empty string `briefPath: ""` 
2. Falsy path (per comment "empty/falsy")

The comment mentions falsy, but the test only pins empty string. **If the lib checks `!briefPath` and a null/undefined path also triggers `no-path`, this test misses that path.** The R12 fix you mentioned (explicit-empty-string behavior) should have its OWN isolated assertion, not lumped with the general falsy block.

**Fix:** Split into 2 tests:
- Test 1: `briefPath: ""` → `reason:"no-path"`
- Test 2: `briefPath: null` / `undefined` → `reason:"no-path"` (if applicable)

**P2 — Hermeticity fragility (line 56):**  
`tmp-zct-${Date.now()}.md` temp file created in `process.cwd
... [+1347 chars truncated]
