---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Independent second-pass review of `H:/prism/scripts/verify-unit-ready.test.mjs` "
date: "2026-05-16"
first_ts: "2026-05-16T00:33:41.593Z"
last_ts: "2026-05-16T00:34:47.421Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a9c4993a31c4c44c7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Independent second-pass review of `H:/prism/scripts/verify-unit-ready.test.mjs` 

> **claude-code-cli** | 2026-05-16 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a9c4993a31c4c44c7.jsonl`

## Transcript

### User | 2026-05-16T00:33:41.593Z

Independent second-pass review of `H:/prism/scripts/verify-unit-ready.test.mjs` (170 LOC, 15 cases). You are arm B of a 2-arm per-file gate — DO NOT assume the test-review-agent (arm A) caught everything.

Weighted on what arm A is unlikely to catch:
- **Coverage gaps**: What behaviors of `verify-unit-ready.mjs` are EXERCISED in the script but NOT tested? Specifically: CLI parsing (`parseArgs`), `loadEnvelopesLazily` (file IO), the JSON output mode, exit codes (`--json` vs not), the `--envelope-dir` knob, the `isMain` CLI gating.
- **Hostile inputs missing from tests**: prototype pollution (`__proto__` in dep strings), unicode-normalization tricks in milestone IDs, very long dep arrays exceeding CYCLE_LIMIT, depends_on containing a self-reference (cycle), depends_on with duplicate entries.
- **Coupling to disk state**: The "real envelope" integration test reads `H:/prism/mcp-server/data/milestones/SYSTEM-VIZ-BRAIN-MS0.json`. If that file later gets `depends_on` populated for U-P3-VERIFY-UNIT-READY, will the test break? Is it correctly tolerant of all 3 reason codes?
- **Test naming**: Do the test titles describe the SPEC being verified, or just what the code does?
- **`assert.deepEqual` vs `assert.equal`**: Are object equality tests using the right one?

Unit spec: "Pre-claim dependency check on /pick-unit — block if depends_on chain unshipped" (SYSTEM-VIZ-BRAIN-MS0/U-P3-VERIFY-UNIT-READY).

Report only P0 / P1 findings. Grade PASS or FAIL. Under 250 words.

### Assistant | 2026-05-16T00:33:52.810Z

I'll review the test file for the unit spec.

### Assistant | 2026-05-16T00:33:53.284Z

[tool_use: Read]

### User | 2026-05-16T00:33:55.467Z

[tool_result] read-once-guard: 'H:\prism\scripts\verify-unit-ready.test.mjs' was already read 17s ago in this session and is unchanged (mtime 1778891543315). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T00:34:03.290Z

[tool_use: Bash]

### User | 2026-05-16T00:34:18.722Z

[tool_result] // SYSTEM-VIZ-BRAIN-MS0/U-P3-VERIFY-UNIT-READY tests.
//
// Uses node:test (the repo's vitest harness is currently broken — see
// [[reference_fleet_reaper_ms1]]). Run:
//   node --test H:/prism/scripts/verify-unit-ready.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  parseDep,
  lookupUnitStatus,
  verifyUnitReady,
} from "
... [+7304 chars truncated]

### Assistant | 2026-05-16T00:34:24.890Z

[tool_use: Bash]

### User | 2026-05-16T00:34:30.396Z

[tool_result] 213 H:/prism/scripts/verify-unit-ready.mjs
23://   node scripts/verify-unit-ready.mjs --milestone <id> --unit <id> [--envelope-dir DIR] [--json]
35:const CYCLE_LIMIT = 64;     // safety against malformed cyclic deps
110:  for (let i = 0; i < depsRaw.length && i < CYCLE_LIMIT; i++) {
148:function loadEnvelopesLazily(envelopeDir, neededIds) {
162:function parseArgs(argv) {
168:    else if (a === "--
... [+620 chars truncated]

### Assistant | 2026-05-16T00:34:47.421Z

I have enough to assess coverage gaps. The script exports `parseDep`, `lookupUnitStatus`, `verifyUnitReady` — and tests cover all three. But significant surface area is **un-exported and untested**: `parseArgs`, `loadEnvelopesLazily`, `cliMain`, exit codes, `--json` mode, `--envelope-dir`, `CYCLE_LIMIT`, and the `isMain` gate.

**Grade: FAIL**

**P0 findings:**

1. **`CYCLE_LIMIT` (line 110) is completely untested.** The script truncates dep iteration at 64 — a load-bearing safety mechanism against malformed cyclic deps. No test asserts what happens with `depends_on` of 65+ entries, a self-reference (`U-CHECK` depending on `U-CHECK`), or a cycle (`U-A→U-B→U-A`). Per the unit spec "block if depends_on chain unshipped", cycle handling IS in-scope. A test with `depends_on: ["U-CHECK"]` could currently infinite-loop or silently pass — neither is asserted.

2. **CLI surface 100% untested.** `parseArgs`, `cliMain`, exit codes (0/2/3), `--json` output shape, `--envelope-dir` knob, missing-args path (line 177-178), and `isMain` Windows-path normalization (line 211, `replace(/\\/g, "/")`) have zero coverage. `/pick-unit` invokes the CLI, not the exported functions — the gate it implements is exercised only through the CLI path.

**P1 findings:**

3. **No prototype-pollution test.** `parseDep("__proto__:U-X", ...)` and a dep array containing `"constructor:U-Y"` should be exercised; `envelopes[milestone]` lookup at line 67 is a direct bracket-access on attacker-controlled input.

4. **No duplicate-dep test.** `depends_on: ["U-DONE", "U-DONE"]` — does the chain de-dup or list twice?

5. **Real-envelope integration test is correctly tolerant of all 3 reason codes (line 165-168 — good), but it reads disk and will break under `--envelope-dir` redirection in CI. Should pass an explicit path argument or skip when file absent.**

6. **`assert.deepEqual(r.missingDeps, [])` (line 73) is correct strict-equal use; other tests correctly use `assert.equal` for primitives.** Naming describe
... [+149 chars truncated]
