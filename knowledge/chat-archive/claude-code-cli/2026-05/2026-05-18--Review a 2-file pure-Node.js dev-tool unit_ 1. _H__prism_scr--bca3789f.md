---
type: "chat-session"
source: "claude-code-cli"
session_id: "bca3789f-eb42-411b-ab21-ca10664f9aec"
title: "Review a 2-file pure-Node.js dev-tool unit: 1. `H:/prism/scripts/unit-knowledge-"
date: "2026-05-18"
first_ts: "2026-05-18T16:52:13.504Z"
last_ts: "2026-05-18T16:53:24.438Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/bca3789f-eb42-411b-ab21-ca10664f9aec/subagents/agent-a71fe55ba28483811.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review a 2-file pure-Node.js dev-tool unit: 1. `H:/prism/scripts/unit-knowledge-

> **claude-code-cli** | 2026-05-18 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/bca3789f-eb42-411b-ab21-ca10664f9aec/subagents/agent-a71fe55ba28483811.jsonl`

## Transcript

### User | 2026-05-18T16:52:13.504Z

Review a 2-file pure-Node.js dev-tool unit:
1. `H:/prism/scripts/unit-knowledge-pack.mjs` — composes a per-unit knowledge pack (roadmap context + master-index hits + tribal tips + git-log + Ollama bridge preheat prompt) so a chat slot has all relevant Obsidian/wiki/Ollama knowledge for the unit it's working on
2. `H:/prism/scripts/unit-knowledge-pack.test.mjs` — node:test suite (30 tests, currently 30/30 PASS)

Closes operator directive 2026-05-18 charlie: "expand ollama and obsidian utilization for the purpose of developing with all relevant knowledge dedicated to the specific task and unit that a chat slot would work on in their respective task queues".

Architecture: pure decision functions (`parseArgs`, `lookupUnit`, `buildQueryTokens`, `inferDomain`, `composePack`, `renderPackMarkdown`) + injected readers (`readImpl`, `spawnImpl`, `searchImpl`, `tribalImpl`). Reuses `scripts/lib/master-index-search-lib.mjs` (runMasterIndexSearch + runTribalSearch). CLI emits markdown to stdout AND writes to `state/shared/unit-knowledge-packs/<unit-id>.md`.

Read each file END-TO-END. Focus on:

1. **Correctness of the search composition** — does `composePack` correctly propagate the inferred `domain` to `tribalImpl`? Does it gracefully degrade if the unit isn't in ROADMAP-CONSOLIDATED.json? Does it swallow thrown errors from search impls and surface them as warnings (R12 fail-loud as advisory, not crash)?

2. **CLI parser fidelity** — `parseArgs` clamps `--k` to [1,40], `--tribal-k` to [0,20], `--git-n` to [0,200]. After a recent fix it uses `Number.isFinite(n) ? n : default` (NOT `parseInt(...) || default` which previously swallowed 0). Verify the fix is structurally correct and that all 3 numeric flags use the same idiom.

3. **Real-data E2E test integrity** — the test at the bottom calls the real `composePack("U-BRIDGE-WIRE-ELECTRODE")` and asserts ≥1 hit OR ≥1 warning. Is this a legitimate fail-soft assertion or is it too loose? (The defense: it would only return zero of bo
... [+785 chars truncated]

### Assistant | 2026-05-18T16:52:32.343Z

I'll review both files end-to-end.

### Assistant | 2026-05-18T16:52:32.710Z

[tool_use: Read]

### User | 2026-05-18T16:52:38.359Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * unit-knowledge-pack.mjs — per-unit knowledge surfacing for a chat slot
4	 *
5	 * BACKEND-DEV-LOOP / OLLAMA-EXPAND-MS0 follow-on.
6	 *
7	 * Closes the gap behind the operator directive 2026-05-18 charlie:
8	 *   "expand ollama and obsidian utilization for the purpose of developing
9	 *    with all relevant knowledge dedicated to the specific task and unit
10	 *    t
... [+12504 chars truncated]

### Assistant | 2026-05-18T16:52:41.096Z

[tool_use: Read]

### User | 2026-05-18T16:52:43.761Z

[tool_result] 1	/**
2	 * unit-knowledge-pack.test.mjs — hermetic + real-data tests for the per-unit
3	 * knowledge-pack composer.
4	 *
5	 * Coverage:
6	 *   - parseArgs: positional unit-id, --slot, --json, --no-write, numeric flags clamped
7	 *   - resolveSlotToUnit: present claim, missing slot, missing file
8	 *   - lookupUnit: pending_units hit, bridge_units hit, MILESTONE::U-ID composite,
9	 *               
... [+12785 chars truncated]

### Assistant | 2026-05-18T16:53:24.438Z

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 8/10
- Files Analyzed: 2
- P0/P1 Issues: 0
- P2/P3 Advisories: 5

### Review Against Stated Criteria

**1. Search composition correctness — PASS**
- `composePack` correctly propagates `domain` to `tribalImpl` via `{ k: tribalK, domain: domain ?? undefined }` (line 262). Verified by test "infers domain... and passes it to tribal search" (line 176-189) which captures the param via closure.
- Graceful degradation on missing roadmap: `lookupUnit` returns `null` on JSON parse failure or unknown id; `composePack` then proceeds with `unit=null`, surfaces warning, and uses bare unitId for token derivation (line 247).
- Search throws are caught and surfaced as warnings (lines 254-256, 264-266) — R12 fail-loud-as-advisory contract held; verified by test "swallows a thrown search and surfaces a warning".

**2. CLI parser fidelity — PASS**
- `Number.isFinite(n) ? n : default` idiom applied uniformly across `--k` (line 65), `--tribal-k` (line 69), `--git-n` (line 73). Fix is structurally correct in all three places.
- Test coverage for `--k` (0→1, 999→40, 5→5) and `--git-n` (-10→0, 9999→200, 50→50). The fix structurally enables value `0` to pass through for `--git-n` and `--tribal-k` (clamped to floor 0, not coerced to default).
- **P3 advisory**: `--tribal-k 0` clamp path is not explicitly tested (only `--k` and `--git-n` get clamp tests). Verified the code is correct by inspection; an explicit test would close the gap.

**3. Real-data E2E test integrity — PASS (legitimate fail-soft)**
- The assertion `totalSignal >= 1` is defensible. The composer is engineered to always emit ≥1 signal: either real hits from `runMasterIndexSearch`, OR a warning from the catch block (line 254-256), OR a warning from `lookupUnit` failure (line 245). The only path to `totalSignal === 0` is if BOTH the search succeeds silently with zero hits AND the unit IS found in the roadmap AND the query is non-empty — which would itself be a
... [+4226 chars truncated]
