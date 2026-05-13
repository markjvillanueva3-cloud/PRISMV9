# Commit-scope collision — close-out automation 2026-05-13

> Source of truth for "where did the close-out audit files actually land?"
> Filed by slot BRAVO claude-de9949da after Reviewer B (3-of-3 scrutiny) flagged
> commit-message-vs-actual-diff mismatch on `5beb4791c`.

## The collision

Three commits landed during this session that together ship the close-out audit
system + 2 COORD-MS0 unit close-outs. Due to multi-chat staging races in the
shared `H:/prism` main tree, files were swept into peer commits with unrelated
subject lines:

| Commit | Subject | Files swept in (mine) | Actual scope of subject |
|--------|---------|----------------------|--------------------------|
| `b12074821` | `[TRAINING-LEARNING-MS0]/U-TL-U2-CLOSEOUT: mark U2 completed in envelope` | `mcp-server/data/milestones/COORD-MS0.json` (U-COORD03 + U-COORD10 status flips with ship_notes from claude-de9949da AND U-COORD04 from peer claude-7faa1248) | TRAINING-LEARNING-MS0 close-out — completely different milestone |
| `8b2df4a62` | `[AUTO-LEARNING-LOOP-MS0]/U-ALL01: ReputableSourceMonitorEngine + CLI + cron + dispatcher (34 tests)` | `scripts/audit-close-out-candidates.mjs` (463 LOC), `state/shared/CLOSE-OUT-CANDIDATES.{json,md}` (4220+61 lines), `state/shared/MILESTONE_PROGRESS.{json,md}` regen, partial `BUILD_STATE.{json,md}` regen | AUTO-LEARNING-LOOP-MS0/U-ALL01 — different milestone, peer chat charlie/claude-2e39dd7e's actual scope |
| `5beb4791c` | `[MAIN] [COORD-MS0]/U-COORD03+U-COORD10 + close-out automation: audit script + skill + hook + wiki + doctrine` | `.claude/commands/close-out-audit.md`, `.claude/hooks/close-out-audit-suggest.mjs`, `knowledge/wiki/architecture/close-out-audit.md`, `CLAUDE.md` (+14 lines §CLOSE-OUT AUTOMATION), `BUILD_STATE.{json,md}` (timestamp-only) | MY commit; subject claims more files than the diff contains |

## What this means

- **All work IS shipped**: the audit script, reports, envelope flips, automation
  surfaces, doctrine, and unit close-outs are all in git. None of it is missing.
- **Commit messages are misleading**: a future auditor running
  `git log -p -- scripts/audit-close-out-candidates.mjs` lands on a commit whose
  message says "ReputableSourceMonitorEngine" with no mention of the audit. Same
  for `git log -p -- mcp-server/data/milestones/COORD-MS0.json` — lands on a
  TRAINING-LEARNING commit.
- **Reviewer B's FAIL is valid** for commit hygiene (`R12 — Fail loud`,
  `feedback_roadmap_close_out`). The functional work is correct (Reviewer A PASS,
  Codex PASS).

## Lesson + standing rule update

`feedback_conflict_fork_rule.md` — Standing rule: **close-out work that touches
state surfaces (envelope JSON + state/shared/*.{json,md}) in an active
multi-chat session MUST fork to its own worktree** to avoid this collision.

Pattern: `git worktree add ../prism-closeout-<MS> -b work/closeout-<MS>` →
do all envelope + regen work there → `git push` from the worktree → main-tree
chats see your commits with intact subjects.

This session's first close-out (U-COORD07, commit `f93336514`) succeeded because
no peer chats were active. This session's second wave hit collisions because 2
peer chats committed concurrently.

## How to read git log around this session

If you're auditing what shipped under "close-out automation":
1. Look at this file's links for the canonical commit list.
2. The `5beb4791c` commit message describes the FULL system; the actual files
   live in the 3 commits listed above.
3. Confirmation: `node H:/prism/scripts/audit-close-out-candidates.mjs --help`
   should resolve (script exists). The skill `/close-out-audit` should be
   present in the skill listing. CLOSE-OUT-CANDIDATES.json should exist.

## Related artifacts

- Memory: `feedback_auto_close_out.md` (the standing rule)
- Memory: `feedback_conflict_fork_rule.md` (the fork-when-collision rule)
- Wiki: `knowledge/wiki/architecture/close-out-audit.md`
- Doctrine: `H:/prism/CLAUDE.md` §CLOSE-OUT AUTOMATION
- Scrutiny ledger: `mcp-server/data/state/SCRUTINY_LEDGER.json` (this session's marks)
