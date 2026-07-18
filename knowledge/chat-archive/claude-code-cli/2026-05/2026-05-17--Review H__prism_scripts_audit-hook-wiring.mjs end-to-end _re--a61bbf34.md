---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Review H:\\prism\\scripts\\audit-hook-wiring.mjs end-to-end (read the whole file, n"
date: "2026-05-17"
first_ts: "2026-05-17T04:20:51.478Z"
last_ts: "2026-05-17T04:21:27.185Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-ab6679f3a5b51da5d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review H:\prism\scripts\audit-hook-wiring.mjs end-to-end (read the whole file, n

> **claude-code-cli** | 2026-05-17 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-ab6679f3a5b51da5d.jsonl`

## Transcript

### User | 2026-05-17T04:20:51.478Z

Review H:\prism\scripts\audit-hook-wiring.mjs end-to-end (read the whole file, not sections).

CONTEXT: This is a new script shipped against SYSTEM-VIZ-BRAIN-MS0 / U-P0-HOOK-ORPHAN-RECONCILE. Unit spec from envelope:

> Deliverables:
> 1. scripts/audit-hook-wiring.mjs (uses system-viz-query find for each .mjs in .claude/hooks/, classifies wired/orphan/disabled/superseded)
> 2. state/shared/HOOK-ORPHAN-CLASSIFICATION.md dashboard (per-orphan: keep/wire/archive recommendation; never delete per feedback_never_delete_only_disable)
> 3. Wire confirmed-real orphans (target 20 high-value) into settings.json individual entries (NOT bundle, per CLAUDE.md doctrine)

The script COMPOSES two already-shipped detectors instead of re-implementing:
- scripts/hook-orphan-scan.mjs (--json output: orphans[] with id/file/tier/issues, issueCounts, totals)
- scripts/hook-fire-rank.mjs (--json --include-zero: ranked[] with hook/count, zero_fire[], totals)

Deliverable 3 (actually wiring 20 hooks into settings.json) is intentionally deferred to operator review — the script surfaces top-WIRE candidates so operator can sign off. That's a defensible scope decision (settings.json is high-contention shared file).

REVIEW TARGETS (P0/P1 only — surface real bugs, not style):

1. **Classifier correctness** — classifyOrphan() should:
   - ARCHIVE on \.test\.mjs OR ^_ helper prefix OR .bak/.disabled/.archive suffix
   - WIRE only when has tier AND (docCount > 0 OR fires > 0)
   - REVIEW when has tier but zero evidence, OR missing tier
   - KEEP-AS-IS only when wired AND firing (defensive against shape drift)
   - Is the precedence correct? (e.g., a wired-firing hook that happens to be named `_internal.mjs` — does ARCHIVE override KEEP-AS-IS correctly? Should it?)

2. **Doc-evidence collection** — collectDocRefs():
   - Bare substring match against 6 doc sources. Is the MIN_HOOK_ID_LEN=4 gate enough to avoid false positives on common prose words? Sample distinctive hook names: "wiki-precheck-inject",
... [+2907 chars truncated]

### Assistant | 2026-05-17T04:20:58.950Z

I'll review the script end-to-end.

### Assistant | 2026-05-17T04:20:59.446Z

[tool_use: Read]

### User | 2026-05-17T04:21:00.681Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/audit-hook-wiring.mjs
3	//
4	// SYSTEM-VIZ-BRAIN-MS0 / U-P0-HOOK-ORPHAN-RECONCILE
5	//
6	// Composes two already-shipped detectors and emits a per-orphan ACTION PLAN:
7	//   - scripts/hook-orphan-scan.mjs --json     → orphan pool + tier frontmatter
8	//   - scripts/hook-fire-rank.mjs   --json     → empirical fire data (8709-event ledger)
9	//
10	// Per orphan, cl
... [+18123 chars truncated]

### Assistant | 2026-05-17T04:21:27.185Z

## Code Quality Analysis Report — H:\prism\scripts\audit-hook-wiring.mjs

### Verdict: **PASS** (with 2 P2 notes worth recording)

---

### P0/P1 review against the 8 stated targets

**1. Classifier precedence (lines 119-184)** — CORRECT.
ARCHIVE name-pattern checks (test/helper/disabled) run BEFORE the KEEP-AS-IS `wired && fires>0` branch. This is the right call: a file named `foo.test.mjs` that somehow accumulated fire-counts is almost certainly test pollution, not a load-bearing wired hook — archiving overrides the firing signal. The `^_` helper-prefix check matches both `name` and `basename(file)`, defending against id-stripping discrepancy. Backup-suffix regex `\.(bak|disabled|archive)(\b|[.-])` correctly catches `foo.disabled.mjs`, `foo.bak-2026.mjs`. Precedence is operator-defensible.

**2. Doc-evidence false-positive risk (lines 208-224)** — ACCEPTABLE.
`MIN_HOOK_ID_LEN=4` filters trivial substrings. `DOC_SOURCES_REL` is correctly narrow — 5 narrative .md + 1 JSONL skill ledger; **no state JSONs** (session.json, agent-registry-load) included, so the "agent.mjs matches session.json" risk doesn't apply. Hook ids are kebab-case with hyphens (`wiki-precheck-inject`, `error-pattern-promote`), which makes substring collisions in English prose near-zero. The "tier" → "frontier" hypothetical is moot because no hook id is bare `tier`. **P2 (not P0/P1):** a hook id like `agent` or `session` (4 chars, generic) could false-positive — but the orphan pool doesn't contain such names; could harden later with `\b` regex if pool shifts.

**3. Upstream IO + error budgets (lines 228-281)** — SOUND.
60s timeout per upstream is generous for 520-hook disk scan (hook-fire-rank typically <5s). spawnSync uses `process.execPath` (portable-node safe per `feedback_dont_use_bare_node`). UPSTREAM_FAIL throws → main() catches → exit 2. **Hard dependency on both upstreams is the right call** for an advisory tool — partial reports would mis-classify (zero fires looks like "no evidence" → wou
... [+1391 chars truncated]
