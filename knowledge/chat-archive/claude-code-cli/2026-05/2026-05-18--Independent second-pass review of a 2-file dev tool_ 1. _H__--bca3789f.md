---
type: "chat-session"
source: "claude-code-cli"
session_id: "bca3789f-eb42-411b-ab21-ca10664f9aec"
title: "Independent second-pass review of a 2-file dev tool: 1. `H:/prism/scripts/unit-k"
date: "2026-05-18"
first_ts: "2026-05-18T16:52:19.466Z"
last_ts: "2026-05-18T16:54:25.915Z"
cwd: "H:\\prism"
messages: 31
user_msgs: 14
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/bca3789f-eb42-411b-ab21-ca10664f9aec/subagents/agent-a674b2dd7c5aa8e37.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Independent second-pass review of a 2-file dev tool: 1. `H:/prism/scripts/unit-k

> **claude-code-cli** | 2026-05-18 | 31 msgs (14 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/bca3789f-eb42-411b-ab21-ca10664f9aec/subagents/agent-a674b2dd7c5aa8e37.jsonl`

## Transcript

### User | 2026-05-18T16:52:19.466Z

Independent second-pass review of a 2-file dev tool:
1. `H:/prism/scripts/unit-knowledge-pack.mjs` — composes a per-unit Obsidian+Ollama+wiki+tribal+git knowledge pack so each chat slot has knowledge dedicated to its current unit
2. `H:/prism/scripts/unit-knowledge-pack.test.mjs` — 30/30 PASS

Read both files end-to-end. You are weighted to catch what a content-specialist might miss:

- **Duplicate work / hidden coupling**: does this duplicate existing PRISM infrastructure? Grep for existing per-unit context tools. Likely candidates to check:
  - `scripts/lib/master-index-search-lib.mjs` (which this composes)
  - `.claude/hooks/pick-prefresh-inject.mjs`
  - `.claude/hooks/goal-prereq-inject.mjs`
  - any existing "knowledge-pack" / "unit-context" / "task-pack" script
  If similar infra exists, this should compose with it instead of duplicate.

- **Test coverage classes** — does the test suite cover: (a) every exported pure fn, (b) malformed input rejection, (c) fail-soft on missing files, (d) real-data E2E, (e) markdown render fidelity? Is any class missing?

- **Stub assertions / weak tests** — any `.toBeDefined()`, `.toBeTruthy()` style? (node:test uses `assert.*` — check for `assert.ok(x)` where `x` could be `undefined` and still pass.)

- **Security / shell injection** — `gitCommitsForMilestone` passes `milestone` into a `git log --grep --fixed-strings` call via spawnSync arg array. Is this injection-safe? Are there any other shell-out points?

- **Path safety** — `writePack` writes to `state/shared/unit-knowledge-packs/<unit-id>.md` with the unitId sanitized via regex. Is the regex defense-in-depth or could a `../` traversal slip through? The pattern is `/[^A-Za-z0-9_\-]/g` → `_`.

- **Naming conventions** — `unit-knowledge-pack.mjs` is kebab + dot-mjs (PRISM convention). Function names are camelCase. Schema-version on output? (the markdown carries `generatedAt:` but no schemaVersion.)

- **R12 fail-loud**: when search impls throw, warnings carry the error messa
... [+237 chars truncated]

### Assistant | 2026-05-18T16:52:31.797Z

I'll read both files end-to-end and check for the categories listed.

### Assistant | 2026-05-18T16:52:32.196Z

[tool_use: Read]

### Assistant | 2026-05-18T16:52:32.433Z

[tool_use: Read]

### User | 2026-05-18T16:52:38.169Z

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

### User | 2026-05-18T16:52:38.441Z

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

### Assistant | 2026-05-18T16:52:41.985Z

Now let me check for duplicate work / existing per-unit context infrastructure.

### Assistant | 2026-05-18T16:52:42.525Z

[tool_use: Read]

### Assistant | 2026-05-18T16:52:43.449Z

[tool_use: Read]

### Assistant | 2026-05-18T16:52:44.145Z

[tool_use: Glob]

### Assistant | 2026-05-18T16:52:44.497Z

[tool_use: Glob]

### Assistant | 2026-05-18T16:52:44.947Z

[tool_use: Glob]

### Assistant | 2026-05-18T16:52:45.233Z

[tool_use: Glob]

### User | 2026-05-18T16:52:46.530Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * pick-prefresh-inject.mjs — UserPromptSubmit hook for /pick-unit /pick-task /checkin.
5	 *
6	 * Surfaces freshness state BEFORE the chat picks a unit:
7	 *   - MILESTONE_PROGRESS mtime (warn if >30 min stale — regen suggested)
8	 *   - BUILD_STATE mtime + headline counts (so picker knows current wired/unwired)
9	 *   - CLOSE-OUT-CANDIDATES mtime + coun
... [+23858 chars truncated]

### User | 2026-05-18T16:52:47.139Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * goal-prereq-inject.mjs — UserPromptSubmit hook for /goal awareness.
5	 *
6	 * Complements the existing Stop-hook goal-complete-gate.mjs by surfacing pre-flight
7	 * status BEFORE the user types /goal complete:
8	 *   - CLOSE-OUT-CANDIDATES freshness (Stop gate requires <2h)
9	 *   - sibling-unit status in the same milestone (you said "goal complete" b
... [+11012 chars truncated]

### User | 2026-05-18T16:53:07.619Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-18T16:53:07.625Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-18T16:53:07.627Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-18T16:53:07.629Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-18T16:53:11.561Z

Switching to grep with narrower paths and using existing knowledge of goal-prereq-inject.mjs.

### Assistant | 2026-05-18T16:53:13.133Z

[tool_use: Grep]

### Assistant | 2026-05-18T16:53:14.561Z

[tool_use: Grep]

### Assistant | 2026-05-18T16:53:15.111Z

[tool_use: Read]

### User | 2026-05-18T16:53:21.149Z

[tool_result] 1	/**
2	 * master-index-search-lib.mjs
3	 *
4	 * Shared keyword search over PRISM's two large knowledge corpora:
5	 *
6	 *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
7	 *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
8	 *
9	 *   2. tribal-embed-index.json — every tribal-knowledge tip (title + text +
10	 *      domain). Keyword-only path (s
... [+3559 chars truncated]

### User | 2026-05-18T16:53:22.245Z

[tool_result] Found 2 files
scripts\unit-knowledge-pack.mjs
scripts\unit-knowledge-pack.test.mjs

### User | 2026-05-18T16:53:30.144Z

[tool_result] No files found

### Assistant | 2026-05-18T16:53:34.739Z

[tool_use: Grep]

### Assistant | 2026-05-18T16:53:35.626Z

[tool_use: Grep]

### User | 2026-05-18T16:53:36.993Z

[tool_result] 17: * implementation; both callers import `runMasterIndexSearch` / `runTribalSearch`.
138: * agent lib calls runMasterIndexSearch + runTribalSearch back-to-back).
311:export function runMasterIndexSearch(query, opts = {}) {
454:export function runTribalSearch(query, opts = {}) {

### User | 2026-05-18T16:53:37.760Z

[tool_result] 141:      ["log", `-n${n}`, "--oneline", "--grep", `[${unit.milestone}]`, "--fixed-strings"],

### Assistant | 2026-05-18T16:54:25.915Z

Acknowledged. I have sufficient evidence now — proceeding to the review verdict.

---

## Independent Second-Pass Review — `unit-knowledge-pack.mjs` + `.test.mjs`

**Verdict: PASS-WITH-FINDINGS** (1 P1, several P2 deferrable)

### Duplicate work / hidden coupling

No collision. `pick-prefresh-inject.mjs` (UserPromptSubmit hook) surfaces **freshness/staleness state** (MILESTONE_PROGRESS age, BUILD_STATE headline, claims) — orthogonal to this script. `goal-prereq-inject.mjs` surfaces **pre-`/goal` gate state** — orthogonal. Neither composes a per-unit knowledge bundle. Grep `knowledge-pack|unit-context|task-pack|composePack` in `H:/prism/scripts` returned only the two files under review. Grep in `H:/prism/.claude` returned no hits. **No duplicate infrastructure exists.** This is the first per-unit knowledge composer; correctly delegates BM25 to the existing shared `master-index-search-lib.mjs` (single-implementation rule honored).

### P1 findings

- **P1 — `gitCommitsForMilestone` `--grep` payload + `--fixed-strings` ordering is fragile but NOT a shell-injection.** Line 141: `["log", "-nN", "--oneline", "--grep", \`[${unit.milestone}]\`, "--fixed-strings"]`. Spawned via `spawnSync` arg array — no shell, no injection. **However:** (a) the `[`/`]` chars in `\`[${unit.milestone}]\`` are git-grep regex metacharacters by default; `--fixed-strings` neutralizes them but only because it's present — flag ordering matters for clarity (place `--fixed-strings` directly after `--grep` or before it for readability). (b) `unit.milestone` is **untrusted JSON-file content** (`ROADMAP-CONSOLIDATED.json`) — a milestone string containing newlines/null-byte could yield a corrupted git argv on platforms that surface those through `spawnSync`. Validate `unit.milestone` against `/^[A-Z0-9][A-Z0-9_\-]{0,80}$/` before use, OR drop the `[]` brackets entirely (substring match still works without them). The test suite has zero adversarial milestone tests.

### P2 findings (deferrable)

- **P2 — 
... [+5228 chars truncated]
