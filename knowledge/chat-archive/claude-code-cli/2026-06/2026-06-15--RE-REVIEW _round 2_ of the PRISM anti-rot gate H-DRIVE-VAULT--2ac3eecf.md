---
type: "chat-session"
source: "claude-code-cli"
session_id: "2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde"
title: "RE-REVIEW (round 2) of the PRISM anti-rot gate H-DRIVE-VAULT-SYNERGY/U-8 after a"
date: "2026-06-15"
first_ts: "2026-06-15T09:32:57.127Z"
last_ts: "2026-06-15T09:34:19.902Z"
cwd: "H:\\prism-slot-papa"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-papa/2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde/subagents/agent-a8eba3072b47efaa4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:06"
---

# RE-REVIEW (round 2) of the PRISM anti-rot gate H-DRIVE-VAULT-SYNERGY/U-8 after a

> **claude-code-cli** | 2026-06-15 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism-slot-papa
> Raw: `H:/.claude/projects/H--prism-slot-papa/2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde/subagents/agent-a8eba3072b47efaa4.jsonl`

## Transcript

### User | 2026-06-15T09:32:57.127Z

RE-REVIEW (round 2) of the PRISM anti-rot gate H-DRIVE-VAULT-SYNERGY/U-8 after a prior reviewer FAILed it on 3 P1s. Read BOTH files END-TO-END (absolute shared-tree paths; session cwd is a stale slot worktree):

1. H:\prism\scripts\h-drive-coverage-gate.mjs
2. H:\prism\scripts\h-drive-coverage-gate.test.mjs

The 3 prior-FAIL P1s and their fixes to VERIFY:
- P1#1 (false-negative: PRISM_FLOW, a standalone product with no .git, was mis-classified worktree-clone by the name-only classifier and silently swallowed): FIX = findUncoveredDomains now takes an injectable `isWorktreeClone(name)` predicate (default `makeGitCloneCheck(root)` checks for a real `.git`). A dir classified "worktree-clone" by NAME is only skipped if it has a real `.git`; otherwise it goes to a NEW advisory `suspectClones` bucket (surfaced, NOT gating `ok` -- because 5 of the 6 such dirs are prism-derived debris that must not cry wolf). Live run now prints a NOTE listing all 6 (incl. PRISM_FLOW). VERIFY: is this logic correct? Does suspectClones correctly NOT gate ok? Is a real clone (has .git) still skipped? Is a clone-by-name-without-.git that IS already in the map correctly NOT flagged?
- P1#2 (docstring overclaimed a Stop-hook surface that does not exist): FIX = docstring now states the Stop surface is DEFERRED + documents the suspectClones limitation. VERIFY honesty.
- P1#3 (main()/exit-codes untested): FIX = 3 new subprocess (spawnSync) tests assert exit 0/1/2 in text + --json modes. VERIFY they genuinely exercise the CLI exit contract.
- Also A-P2 from round 1: entrypoint `__isCli` guard is now case-insensitive (Windows path safety). VERIFY.

Confirm: 17/17 tests pass, ASCII-only, no stubs, no weakened assertions, fail-soft IO, the pure detector still never throws on null/malformed input, and the new suspectClones path has real test coverage. Flag any NEW P0/P1/P2 the fixes introduced. Concrete file:line. Explicit PASS/FAIL.

### Assistant | 2026-06-15T09:33:06.054Z

I'll review both files end-to-end with the absolute shared-tree paths.

### Assistant | 2026-06-15T09:33:06.508Z

[tool_use: Read]

### Assistant | 2026-06-15T09:33:06.668Z

[tool_use: Read]

### User | 2026-06-15T09:33:07.844Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * H-DRIVE-VAULT-SYNERGY / U-8 -- coverage anti-rot gate.
4	 *
5	 * The U-1 indexer (`h-drive-to-vault.mjs`) categorizes every substantive H:/ top-level folder
6	 * into the Obsidian 2nd brain and writes `state/shared/H-DRIVE-COVERAGE.json`. That map ROTS the
7	 * instant a NEW top-level folder lands on the drive between reindexes -- the brain silently goes
8	 * incom
... [+9915 chars truncated]

### User | 2026-06-15T09:33:08.003Z

[tool_result] 1	/**
2	 * H-DRIVE-VAULT-SYNERGY / U-8 -- coverage anti-rot gate tests.
3	 *
4	 * Covers the pure detector (findUncoveredDomains) hermetically with an injected classify, plus
5	 * real-fs oracles for readLiveTopLevel/loadCoverage, plus a real-data integration test that loads
6	 * the actual H-DRIVE-COVERAGE.json and scans the live H:/ root (the "hermetic fakes do not prove
7	 * production wiring" 
... [+11430 chars truncated]

### Assistant | 2026-06-15T09:33:11.582Z

Both files are read. Let me verify the dependency contract — the real `classifyTopLevel` taxonomy — since the integration test and the suspectClones logic both depend on its exact return shape, and let me run the test suite to confirm the 17/17 claim.

### Assistant | 2026-06-15T09:33:12.064Z

[tool_use: Read]

### User | 2026-06-15T09:33:12.518Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\h-drive-taxonomy.mjs' was already read 16m ago in this session and is unchanged (mtime 1781453576857). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-15T09:33:12.880Z

[tool_use: Bash]

### User | 2026-06-15T09:33:14.838Z

[tool_result]   ...
# Subtest: readLiveTopLevel returns only dir names; null on a bad root
ok 12 - readLiveTopLevel returns only dir names; null on a bad root
  ---
  duration_ms: 1.9741
  ...
# Subtest: loadCoverage: valid JSON parses; corrupt/missing -> null
ok 13 - loadCoverage: valid JSON parses; corrupt/missing -> null
  ---
  duration_ms: 1.0985
  ...
# Subtest: integration: real H-DRIVE-COVERAGE.json + l
... [+959 chars truncated]

### Assistant | 2026-06-15T09:33:19.037Z

17/17 pass confirmed. The taxonomy file is already in my context from earlier this session. Let me verify the exact contract of `classifyTopLevel` — specifically the PRISM_FLOW classification claim and the return shape — since the suspectClones logic and the integration test both bind to it.

### Assistant | 2026-06-15T09:33:20.657Z

[tool_use: Grep]

### User | 2026-06-15T09:33:21.658Z

[tool_result] 7: * worktree-clone / knowledge-asset / infra-tool / skip-junk). No fs access, no
60:/** Known PRISM galaxy slugs (from mcp-server/src/engines/<galaxy>/). */
89: * @param {string} name bare dir name (e.g. "prism", "prism-slot-papa", ".cache")
90: * @returns {{class: string, skip: boolean, dedupeTo?: string}}
92:export function classifyTopLevel(name) {
95:  if (!n) return { class: "skip-junk", skip
... [+921 chars truncated]

### Assistant | 2026-06-15T09:33:44.379Z

The taxonomy contract is confirmed:

- Line 90: return shape is exactly `{class: string, skip: boolean, dedupeTo?: string}` — matches the JSDoc in the gate and the `fakeClassify` shape.
- Line 103: `/^prism[-_.]/.test(low)` → `worktree-clone`. The underscore `_` is in the char class, so `PRISM_FLOW` (low=`prism_flow`) matches → classified `worktree-clone`. This confirms the P1#1 premise: PRISM_FLOW genuinely IS mis-classified by name, validating the entire suspectClones fix.
- Line 101: `prism` → `canonical-repo` (skip:false), so the canonical repo is never a clone and never deduped — correct.

Now let me verify each fix against the code.

**P1#1 — suspectClones logic (gate lines 73-119):**

Tracing `findUncoveredDomains` for a `worktree-clone`-classified name (lines 92-98):
- `isWorktreeClone(name)` true (real `.git`) → `continue` (skipped/deduped). Correct — real clone still skipped.
- `isWorktreeClone(name)` false AND `!coveredTop.has(low)` → pushed to `suspectClones`. Correct — surfaced not swallowed.
- `isWorktreeClone(name)` false BUT `coveredTop.has(low)` (already mapped) → falls through to `continue` at line 97 without pushing. Correct — a mapped clone-by-name-without-.git is NOT flagged (test line 76-80 proves this).
- `ok` is computed solely from `uncovered.length` (line 112); `suspectClones` and `staleCovered` are excluded. Correct — suspectClones does NOT gate.

All four sub-questions answered YES. The logic is correct.

**P1#2 — docstring honesty (lines 18-27):** Line 19 explicitly says the Stop surface "is DEFERRED". Lines 22-27 document the suspectClones name-only-classifier limitation with the PRISM_FLOW example. Honest. No overclaim remains.

**P1#3 — CLI exit-code subprocess tests (test lines 168-221):** Three new `spawnSync(process.execPath, [GATE, ...])` tests genuinely invoke the real CLI binary as a child process and assert `.status` against the contract: exit 0 (clean), 1 (drift, text + --json), 2 (bad-coverage + bad-root, text + --json). They
... [+1221 chars truncated]

### Assistant | 2026-06-15T09:33:45.581Z

[tool_use: Bash]

### User | 2026-06-15T09:33:47.531Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
ASCII-CLEAN: both files

### Assistant | 2026-06-15T09:33:52.789Z

The `LC_ALL=C` defeats `-P`. Let me redo the ASCII check correctly without forcing the C locale on the PCRE engine.

### Assistant | 2026-06-15T09:33:54.270Z

[tool_use: Bash]

### User | 2026-06-15T09:33:56.080Z

[tool_result] ASCII-CLEAN: both files

### Assistant | 2026-06-15T09:34:19.902Z

ASCII-clean confirmed for both files.

I have everything needed to render a verdict. All three prior-FAIL P1s are correctly fixed, the A-P2 case-insensitivity fix is in place, the dependency contract (`classifyTopLevel`) is verified to match, and 17/17 tests pass with genuine subprocess exit-contract coverage and a real-data integration test.

---

VERDICT: PASS

summary: All three prior-FAIL P1s are genuinely fixed and the round-1 A-P2 is resolved. The suspectClones logic is correct on all four sub-paths (real clone skipped, no-.git-unmapped surfaced, no-.git-mapped not flagged, advisory-not-gating); the docstring honestly declares the Stop surface DEFERRED and documents the name-only-classifier limitation; the 3 new subprocess tests exercise the real CLI exit contract end-to-end. 17/17 pass, ASCII-clean, fail-soft IO throughout, the pure detector cannot throw on null/malformed input. No new P0/P1 introduced.

findings:
  - [VERIFIED P1#1] `H:\prism\scripts\h-drive-coverage-gate.mjs:92-98` -- worktree-clone branch: real `.git` (`isWorktreeClone` true) -> `continue` deduped (proven by test:58-65 `cloneAlways`); no-`.git` + unmapped -> `suspectClones` (test:67-74); no-`.git` + already-mapped -> falls through `continue` at :97 without push (test:76-80). `ok` derives only from `uncovered.length` at :112, so suspectClones is non-gating (test:70 asserts `ok=true` with a populated suspectClones). Dependency contract confirmed: taxonomy `:103` `/^prism[-_.]/` matches `prism_flow` -> the PRISM_FLOW false-negative premise is real and now closed.
  - [VERIFIED P1#2] `H:\prism\scripts\h-drive-coverage-gate.mjs:18-27` -- docstring states the Stop surface "is DEFERRED" (:19) and documents the suspectClones name-only-classifier limitation with the PRISM_FLOW example (:22-27). No phantom-surface overclaim remains.
  - [VERIFIED P1#3] `H:\prism\scripts\h-drive-coverage-gate.test.mjs:168-221` -- 3 `spawnSync(process.execPath,[GATE,...])` tests assert real `.status` for exit 0/1/2 ac
... [+1898 chars truncated]
