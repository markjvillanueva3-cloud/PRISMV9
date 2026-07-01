---
type: "chat-session"
source: "claude-code-cli"
session_id: "2081f435-92ef-4cfc-b986-d43d968e9d65"
title: "Content-specialist review of an additive change to a CLI query adapter. Read the"
date: "2026-05-15"
first_ts: "2026-05-15T01:50:23.614Z"
last_ts: "2026-05-15T01:50:58.188Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/2081f435-92ef-4cfc-b986-d43d968e9d65/subagents/agent-ab68b2857f8ef3a96.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Content-specialist review of an additive change to a CLI query adapter. Read the

> **claude-code-cli** | 2026-05-15 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2081f435-92ef-4cfc-b986-d43d968e9d65/subagents/agent-ab68b2857f8ef3a96.jsonl`

## Transcript

### User | 2026-05-15T01:50:23.614Z

Content-specialist review of an additive change to a CLI query adapter. Read the WHOLE file end-to-end: H:\prism\scripts\system-viz-query.mjs

THE CHANGE (3 edits, all additive):
1. Docblock: added a `worktrees` usage line.
2. The `!cmd` usage-error string: added `worktrees` to the command list.
3. Added an `else if (cmd === "worktrees") {...}` block (~58 lines) before the `else if (cmd === "build-order")` block. It reads `G.nodes` filtered to `layer === "L9" && subgroup === "worktrees" && id !== "wt.root"`, groups them into `byVerdict` buckets (MERGE/PRUNE/INVESTIGATE/KEEP, unknown verdicts → INVESTIGATE), prints a human table sorted by ahead-count desc, and emits structured JSON via the existing `out(human, machine)` helper. Reads `G.meta.worktrees` for the summary line.

CONTEXT: the upstream `generate-system-viz.mjs` (already shipped + scrutiny-passed) emits these L9 `worktrees`-subgroup nodes with fields: `verdict, branch, ahead, behind, worktreePath, lastCommitIso, dirtyCount, locked, detached, owner:{slot,alive}, reasons[]`, plus `wt.root` hub. `G.meta.worktrees = {total, KEEP, MERGE, PRUNE, INVESTIGATE, base, generatedAt}`.

SMOKE-VERIFIED: `node --check` passes; `node scripts/system-viz-query.mjs worktrees` prints 51 trees grouped by verdict; `--json` emits `{summary, count:51, worktrees:[...]}` with full per-tree schema.

FOCUS:
- CORRECTNESS: trace every path. Does it handle: graph with NO worktree nodes (old graph)? `G.meta.worktrees` undefined (old graph)? a node with `verdict` missing or an unexpected value? `n.label` without a `\n`? `n.ahead`/`n.behind`/`n.dirtyCount` null? `n.owner` null vs `{slot,alive}`? Empty `reasons`?
- CONSISTENCY with the file's other command blocks (headline, roadmap-candidates, blast-radius, dispatcher-summary, coverage-by-domain, find, build-order): does the new block follow the same `out(human, machine)` pattern, the same human/JSON split, the same error/exit conventions? Does it read `G` the same way?
- The field `n.workt
... [+526 chars truncated]

### Assistant | 2026-05-15T01:50:29.140Z

I'll read the file end-to-end to review this change.

### Assistant | 2026-05-15T01:50:29.978Z

[tool_use: Read]

### User | 2026-05-15T01:50:31.908Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-query — programmatic adapter for the live system graph.
4	 *
5	 * Lets rgs / forge / roadmap tools consume system-graph.json without
6	 * embedding parsing logic. Read-only.
7	 *
8	 * Usage:
9	 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
10	 *   node scripts/system-viz-query.mjs blast-radius <nodeId>    # do
... [+12564 chars truncated]

### Assistant | 2026-05-15T01:50:58.188Z

VERDICT: PASS

The `worktrees` block is correct, defensive, and consistent with the file's existing command blocks. I traced every path against the FOCUS criteria.

Correctness trace:
- **Old graph, no worktree nodes**: `G.nodes.filter(...)` → `[]`. `byVerdict` stays all-empty, every `for (const v of KNOWN_VERDICTS)` iteration hits `continue`, the `wts.length === 0` branch prints the regenerate hint. JSON emits `count:0, worktrees:[]`. No crash.
- **`G.meta.worktrees` undefined (old graph)**: guarded by `(G.meta && G.meta.worktrees)` → `summary = null`; the `else` branch prints the predates-mapping hint. `G.meta` itself is assumed truthy here — consistent with `headline`/`roadmap-candidates` which dereference `G.meta.headline` unguarded, and `build-order` uses `G.meta?.roadmap`. Acceptable per file convention (any real graph has `meta`).
- **`verdict` missing or unexpected**: `KNOWN_VERDICTS.includes(n.verdict)` is `false` → bucketed into `INVESTIGATE` in both the human grouping and the JSON `verdict` field. Surfaces, never dropped. Correct.
- **`n.label` without `\n`**: `r.label.split("\n")[0]` returns the whole string; `r.label ? ... : r.id` handles missing label. Fine.
- **`n.ahead`/`n.behind`/`n.dirtyCount` null**: human uses `?? "?"` (ahead/behind) and `r.dirtyCount ?` truthy-guard (null→omitted); JSON uses `?? null`. No NaN.
- **`n.owner` null vs `{slot,alive}`**: human guards `r.owner && r.owner.alive`; JSON `n.owner ?? null` passes through verbatim. Fine.
- **Empty `reasons`**: `Array.isArray(n.reasons) ? n.reasons : []` — not rendered in human output (acceptable, it's a summary table), preserved in JSON. No crash.
- **Sort comparator `(b.ahead ?? -1) - (a.ahead ?? -1)`**: with null ahead → `-1`, numeric subtraction, no NaN. Null trees sort last (desc). Correct.
- **`wt.root` exclusion**: `n.id !== "wt.root"` in the filter excludes it from both `wts` (listing) and `wts.length` (count). Correct.
- **`worktreePath` → `path` mapping**: the CONTEXT explicitly st
... [+1769 chars truncated]
