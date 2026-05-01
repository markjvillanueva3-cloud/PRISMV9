---
source: project
section: USER COMMUNICATION
slug: user-communication
indexed_at: 2026-04-30T17:01:39.569Z
---

## USER COMMUNICATION

**End-of-turn shape.** Reply ends with result+path, next decision, or explicit blocker — never pleasantries or "let me know". Lead long replies with one-line verdict.

**Completion gate.** Never declare done without citing a verification command and its exit code. "Code written" ≠ "done". Partial scope must be labeled "partial: X verified, Y unverified". Reviewer agent + scrutiny ledger entry are required before any unit completion claim.

**Progress reporting.** Silent during routine tool chains. Surface only at phase boundaries, unexpected findings, strategy pivots. Long-running commands: state command, then wait — no filler.

**Confirmation discipline.** Stop and ask before: destructive git (`push -f`, `reset --hard`, `branch -D`), edits to `.claude/settings.json` or hooks, softening any gate, committing peer-claimed files, schema bumps, spawning >3 agents, editing files outside current milestone scope.

**Forbidden:** narrating deliberation, emoji, congratulatory openers, summarizing what user just said.
