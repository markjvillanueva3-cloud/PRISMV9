---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "Build regression-lock-audit for PRISM -- the fleet-wide application of the Opik "
date: "2026-06-10"
first_ts: "2026-06-10T01:12:54.503Z"
last_ts: "2026-06-10T01:12:56.110Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_1f0ad52c-06b/agent-a9f74d2ab55fe00be.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# Build regression-lock-audit for PRISM -- the fleet-wide application of the Opik 

> **claude-code-cli** | 2026-06-10 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_1f0ad52c-06b/agent-a9f74d2ab55fe00be.jsonl`

## Transcript

### User | 2026-06-10T01:12:54.503Z

Build regression-lock-audit for PRISM -- the fleet-wide application of the Opik "self-repairing harness" L3 finding: "every documented failure should become a runnable regression test, so the harness gets harder to break each cycle." Work on the REAL repo at H:/prism. ASCII-only (use -- not em-dash). Fail-safe. R9 real-value tests. Commit NOTHING (the parent integrates).

R8 / DEDUP FIRST (mandatory): before writing, check this does not already exist. Grep/glob for: regression-lock, regression-coverage, regression-audit, recurrence-test, scripts/regression-*.mjs, and check ENGINE_DIGEST.md / the /regression-audit + /r12-audit skills. If a real equivalent EXISTS, STOP and report what it is instead of duplicating. If only partial, extend it. Report your dedup finding explicitly.

THE PROBLEM: PRISM documents regressions richly but does not ENFORCE that each has a recurrence-catching test:
- H:/prism/CLAUDE.md has a "## Recent regressions" section. Each entry looks like:
  "- 2026-06-08 | **<description>** | observed-in: <sha> | root cause: ... | fix: ... | verify: git -C H:/prism show <sha> ..."
  (also a "## Recent regressions" pattern may appear in galaxy CLAUDE.md files under mcp-server/src/engines/*/CLAUDE.md -- check a few).
- Each entry carries a commit SHA (the "observed-in:" or a sha in the verify line). The "fix:" commit is the one that resolved it.
- The GAP: many fixes shipped WITHOUT a companion test that would FAIL if the bug recurred. There is no audit that flags which documented regressions lack a recurrence test.

BUILD (pure-core + injected-reader so it is hermetically testable -- R9):
1. H:/prism/scripts/lib/regression-lock-audit.mjs (PURE CORE):
   - export parseRegressionEntries(markdown) -> [{date, description, sha, raw}] -- robustly extract the date, a short description, and the commit SHA (7-40 hex) from each "## Recent regressions" bullet. Handle entries with multiple shas (take the fix/observed-in sha), entries with no sha (date+desc only, sha
... [+3652 chars truncated]

### Assistant | 2026-06-10T01:12:56.110Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
