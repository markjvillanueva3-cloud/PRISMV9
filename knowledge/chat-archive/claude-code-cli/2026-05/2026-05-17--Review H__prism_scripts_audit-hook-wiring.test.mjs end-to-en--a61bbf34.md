---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Review H:\\prism\\scripts\\audit-hook-wiring.test.mjs end-to-end. CONTEXT: 39-case "
date: "2026-05-17"
first_ts: "2026-05-17T04:24:27.042Z"
last_ts: "2026-05-17T04:24:49.004Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a59c02ab506b7e868.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review H:\prism\scripts\audit-hook-wiring.test.mjs end-to-end. CONTEXT: 39-case 

> **claude-code-cli** | 2026-05-17 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a59c02ab506b7e868.jsonl`

## Transcript

### User | 2026-05-17T04:24:27.042Z

Review H:\prism\scripts\audit-hook-wiring.test.mjs end-to-end.

CONTEXT: 39-case test suite for H:\prism\scripts\audit-hook-wiring.mjs (just shipped, SYSTEM-VIZ-BRAIN-MS0/U-P0-HOOK-ORPHAN-RECONCILE). Suite uses `node --test` (not vitest — vitest is broken in this repo per pre-existing infra bug). 39/39 PASS confirmed via spawn.

The SUT exports 12 functions: parseArgs, classifyOrphan, rankAll, collectDocRefs, readDocTexts, readUpstream, buildReport, renderMarkdown, determineExitCode, writeArtifacts, main, ACTIONS.

REVIEW TARGETS:

1. **Real-value vs toBeDefined() assertions** — CLAUDE.md hook-stack rejects `toBeDefined()` stubs. Confirm every assert uses concrete values: `assert.equal(c.score, 32)` (formula result), `assert.deepEqual(...)` (full shape), `assert.match(md, /regex/)` (content). Flag any assertion that just checks "value exists" without asserting WHAT it is.

2. **Coverage floor: happy + ≥3 failure modes + ≥2 adversarial inputs** —
   - Happy path: ✓ (default classification, full pipeline buildReport, REAL-DATA E2E)
   - Failure modes: missing flags, unknown flag, schema drift (sections instead of orphans), upstreamEmpty
   - Adversarial: empty docs, missing-text doc, short-id filter
   - Are 3 failure modes + 2 adversarial covered?

3. **Variability floor: ≥3 spanning configurations** — The classifier has 4 actions (WIRE/ARCHIVE/REVIEW/KEEP) and 5 tier weights (T0..T4). Are at least 3 configurations exercised (different tiers, different evidence combinations)?

4. **Pure-core vs CLI vs real-data E2E split** —
   - Pure-core tests on classifyOrphan / rankAll / collectDocRefs / buildReport — hermetic, no I/O.
   - CLI smoke via spawnSync — exercises argv parsing + exit codes + stdout/stderr surface.
   - Real-data E2E — calls live upstream scripts via spawn, verifies non-empty/valid JSON. Required by RGS-MS1 lesson "pure-core MUST ship one real-data E2E test."
   Confirm all three layers present.

5. **Hostile-input / hermetic tests** —
   - Are temp di
... [+1428 chars truncated]

### Assistant | 2026-05-17T04:24:32.314Z

I'll review the test suite end-to-end, checking the test file against CLAUDE.md enforcement rules and the 10 criteria you specified.

### Assistant | 2026-05-17T04:24:32.654Z

[tool_use: Read]

### User | 2026-05-17T04:24:33.773Z

[tool_result] 1	// scripts/audit-hook-wiring.test.mjs
2	
3	import { test, describe } from "node:test";
4	import { strict as assert } from "node:assert";
5	import { mkdtempSync, readFileSync, existsSync } from "node:fs";
6	import { tmpdir } from "node:os";
7	import { join, resolve, dirname } from "node:path";
8	import { spawnSync } from "node:child_process";
9	import { fileURLToPath } from "node:url";
10	
11	imp
... [+18161 chars truncated]

### Assistant | 2026-05-17T04:24:49.004Z

## PASS — Comprehensive Coverage

**Summary:** The 39-case test suite (lines 1–467) comprehensively validates the SUT across all 10 criteria. Coverage is strong; no P0 or P1 gaps detected.

### Criterion-by-Criterion Verification

**1. Real-value assertions (CLAUDE.md hook-reject rule):**
PASS. Every assertion uses concrete values:
- Lines 33–36: `assert.equal(o.json, false)` (not `toBeDefined()`)
- Lines 121–124: Score formula `32` (T2+2docs+0fires = 3×10+2+0), directly asserted
- Lines 192, 201, 210: Ranked order via `deepEqual([...ids])` (full shape, not existence check)
- Lines 230–232: Document reference counts `2`, `1`, `0` (not "exists")

**2. Coverage floor (happy + ≥3 failures + ≥2 adversarial):**
PASS.
- Happy: Lines 387–400 (real hook → exit 1, WIRE candidate, valid JSON)
- Failures: (line 69) unknown flag throws, (line 309) schema-drift (sections instead of orphans), (line 402) upstreamEmpty triggers exit 2
- Adversarial: (line 235) MIN_HOOK_ID_LEN filters short IDs, (line 249) missing-text doc tolerated

**3. ≥3 configurations spanning variability:**
PASS.
- Lines 115–125: T2 + doc evidence → WIRE
- Lines 127–136: T1 + fires → WIRE (different evidence path)
- Lines 160–169: T2 tier but zero evidence → REVIEW (configuration mismatch)
- Lines 171–178: Wired + firing → KEEP-AS-IS (defensive state)

**4. Pure-core / CLI / real-data E2E split:**
PASS.
- Pure-core: Lines 30–257 (classifyOrphan, rankAll, collectDocRefs, buildReport — all hermetic, no I/O)
- CLI smoke: Lines 417–434 (spawnSync argv parsing, exit codes, help banner)
- Real-data E2E: Lines 436–465 (invokes LIVE upstream scripts, verifies non-empty JSON, writes artifacts to temp dirs, validates schema)

**5. Hermetic / hostile-input robustness:**
PASS.
- Lines 388–389, 437–438: `mkdtempSync` for output (no pollution of state/shared/)
- Line 26: `--frozen-time` ensures determinism
- Lines 386–413: Injected readers (no spawn calls in main-test layer); CLI-test delegates to spawn
- Lines 249–256: Nul
... [+1525 chars truncated]
