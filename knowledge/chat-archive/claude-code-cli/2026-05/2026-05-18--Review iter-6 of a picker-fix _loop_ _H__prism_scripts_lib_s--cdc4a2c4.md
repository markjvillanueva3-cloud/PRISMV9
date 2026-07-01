---
type: "chat-session"
source: "claude-code-cli"
session_id: "cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81"
title: "Review iter-6 of a picker-fix /loop: `H:/prism/scripts/lib/shipped-units-source-"
date: "2026-05-18"
first_ts: "2026-05-18T01:21:31.055Z"
last_ts: "2026-05-18T01:22:02.158Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-a319ea61ad5df9d7b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Review iter-6 of a picker-fix /loop: `H:/prism/scripts/lib/shipped-units-source-

> **claude-code-cli** | 2026-05-18 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/cdc4a2c4-eeb5-4533-9a1e-da4d27dadc81/subagents/agent-a319ea61ad5df9d7b.jsonl`

## Transcript

### User | 2026-05-18T01:21:31.055Z

Review iter-6 of a picker-fix /loop: `H:/prism/scripts/lib/shipped-units-source-of-truth.mjs` + its test `H:/prism/scripts/lib/shipped-units-source-of-truth.test.mjs`.

Context: iters 1-5 built a shipped-units SSOT (git-inferred ∪ envelope-status) that two pickers route through. Iter 6 closes a NEW blind spot: `U-BRIDGE-*` units live in `ROADMAP-CONSOLIDATED.bridge_units`, NOT in any milestone envelope, so sources (a)+(b) structurally can't mark them shipped. The picker re-served `U-BRIDGE-SFC-ESPRIT` infinitely after it shipped in commit 76dc1b53cb (subject `[CAM-EXHAUST-MS0]/U-BRIDGE-SFC-ESPRIT+SOLIDCAM`). Iter 6 adds source (c): `readShippedFromBridgeCommits()` — bounded `git log --format=%s -n 800` via execFileSync, regex-extracts `U-BRIDGE-*` tokens, `expandBridgeToken()` recovers compound `A+B` → both sibling ids. Unioned into `buildShippedIdsUnion` (production/default-paths path only; cache key extended with HEAD sha). 65/65 picker-stack tests pass.

Verify:
1. **Compound expansion correctness** — `expandBridgeToken("U-BRIDGE-SFC-ESPRIT+SOLIDCAM")` must yield `U-BRIDGE-SFC-ESPRIT` + `U-BRIDGE-SFC-SOLIDCAM`. Trace the prefix-reconstruction (`lead.slice(0, lead.lastIndexOf("-")+1)`). Is it correct for `U-BRIDGE-SFC-ESPRIT+SOLIDCAM+POWERMILL`? For a lead with no `-`? For `+` with no suffix?
2. **Security** — execFileSync with array args (no shell). repoRoot is a path, maxCommits coerced via String(). Any injection surface? Is `git log` output bounded (maxBuffer 8MB, timeout 15s, -n 800)? What if a malicious commit subject contains a regex-bomb or 10MB line?
3. **Cache correctness** — cache key now `(progMtime, envMtime, headSha)`. Is headSha read on every call (cheap `git rev-parse HEAD`)? Does a new commit correctly invalidate? Does the bridge source ONLY run on default-paths (production), never custom-paths (hermetic)? Confirm `describeShippedSources` and `buildShippedIdsUnion` both gate bridge-reading on the hermetic boundary so existing exact-count hermetic 
... [+692 chars truncated]

### Assistant | 2026-05-18T01:21:36.037Z

I'll review both files.

### Assistant | 2026-05-18T01:21:36.903Z

[tool_use: Read]

### Assistant | 2026-05-18T01:21:37.199Z

[tool_use: Read]

### User | 2026-05-18T01:21:38.806Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/shipped-units-source-of-truth.mjs
3	//
4	// Canonical set of unit-ids that should be SKIPPED by any /pick-unit picker.
5	//
6	// Two sources, unioned (a unit is "shipped" if EITHER source agrees):
7	//   (a) MILESTONE_PROGRESS.json — git-inferred (commit subject matches
8	//       [MILESTONE]/U-ID), authoritative for "git actually reflects this".
9	//   (b) m
... [+14112 chars truncated]

### User | 2026-05-18T01:21:39.266Z

[tool_result] 1	#!/usr/bin/env node
2	// Tests for shipped-units-source-of-truth.mjs
3	//
4	// Hermetic — writes a temp progress.json + temp envelopes dir, never touches
5	// the real repo data. Real-data sanity smoke at the end against the live repo.
6	
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	import fs from "node:fs";
10	import path from "node:path";
11	import os from "
... [+23277 chars truncated]

### Assistant | 2026-05-18T01:22:02.158Z

I have both files. Reviewing iter-6's bridge-commit source against the 6 verification axes.

## Code Quality Analysis Report — iter-6 bridge-commit source

### Verdict: **PASS** (no P0/P1; 2 P2)

**1. Compound expansion — CORRECT.** `expandBridgeToken("U-BRIDGE-SFC-ESPRIT+SOLIDCAM")` → lead=`U-BRIDGE-SFC-ESPRIT`, prefix=`lead.slice(0,18)`=`U-BRIDGE-SFC-`, suffix `SOLIDCAM` → `U-BRIDGE-SFC-SOLIDCAM`. ✔ Multi-suffix `A+B+C`: split on `+` after first `+`, each non-empty suffix reuses same prefix → all three siblings (test L400 confirms). ✔ No-`-` lead (`UBRIDGE+X`): `lastIndexOf("-")` = -1, `+1` = 0, prefix=`""`, yields bare `UBRIDGE`+`X` (test L415). ✔ Trailing `+` (`ESPRIT+`): `split("+")` → `["","..."]`... actually `t.slice(plusIdx+1)`=`""`, split → `[""]`, `if(suf)` skips → only lead (test L419). ✔ All edge cases handled.

**2. Security — SOLID.** `execFileSync` array args, no shell → no injection. `String(maxCommits)` coerces. Bounded: `-n 800`, `timeout:15000`, `maxBuffer:8MB`, `stdio` stderr ignored. Regex-bomb resistance: `BRIDGE_ID_RE` is linear (no nested quantifiers / catastrophic backtracking — bounded char classes with `*`), safe on a 10MB line. A >8MB log throws → caught → empty Set (fail-safe, never throws). ✔

**3. Cache — CORRECT.** `headShaSafe()` runs every default-path call (`git rev-parse HEAD`, 5s timeout) → new commit changes sha → key `(progMtime,envMtime,headSha)` mismatch → re-read. ✔ Bridge source gated `useCache` branch only (L236); custom-path branch (L246-248) omits it; `describeShippedSources` mirrors via `hermetic` flag (L274,277). Hermetic exact-count tests stay stable (test L495-508 pins this). ✔

**4. Over-broadening — ACCEPTABLE, P2.** `/U-BRIDGE-.../i` matches `"revert U-BRIDGE-X"` / `"WIP U-BRIDGE-Y (not done)"` → false-positive ship. No `^[SCOPE]/U-ID` anchor (unlike source (a)). Risk asymmetry favors current design: false-positive = one unit not re-served (recoverable manually); false-negative = the infinite-re-serve bug returnin
... [+983 chars truncated]
