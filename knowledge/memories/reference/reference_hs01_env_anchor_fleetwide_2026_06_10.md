---
name: reference_hs01_env_anchor_fleetwide_2026_06_10
description: HS-01 fixed fleet-wide via CLAUDE_CODE_SESSION_ID env anchor in stable-session-id.mjs — bare callers no longer miskey handoffs to a peer chat; auto-session-start now reliable.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.613Z
aliases: reference_hs01_env_anchor_fleetwide_2026_06_10
---


# HS-01 fleet-wide fix — CLAUDE_CODE_SESSION_ID env anchor (commit e81dec5cba, slot:alpha 2026-06-10)

**The bug (auto-session-start broken in production):** the `STABLE=$(node stable-session-id.mjs)` pattern in `/precompact`, `/handoff`, and the 78 per-slot wrappers passes NO CLI arg and has NO stdin. So `getStableIdentifier()` fell through to the PID-pin heuristic (anchor 2), which — with N concurrent chats sharing one project cwd — returned a **PEER** chat's id (confirmed live: `claude-c48a1aff` for session `db273e77`). The handoff was then written/read under the wrong key, so the next session's auto-resume could not find it. Auto-session-start was silently DEAD exactly when the fleet was busy (the worst time).

**Why the env anchor is the right fix (not 24 caller edits):**
- The Claude Code harness exports `CLAUDE_CODE_SESSION_ID` into EVERY tool subprocess's environment, scoped to THIS chat's process.
- Subprocess env inheritance is strictly **downward** (parent->child). No process is ever the child of two different Claude sessions, so a per-process env var **cannot** carry a peer's id — unlike the shared PID-pin file / cwd cache, which leak horizontally.
- This isolation invariant is already load-bearing elsewhere: `compact-counter.mjs:14-22` uses `CLAUDE_CODE_SESSION_ID` specifically to keep concurrent chats' compaction counters separate. The fix conforms to an existing convention (R11), it does not invent one.
- One new function `readEnvSessionId()` + one anchor (1.5) in the single shared helper, ranked ABOVE the PID-pin (below explicit-arg/stdin), fixes every bare caller + hook + wrapper at once — **fleet-wide the instant it commits**, zero caller edits. This is what makes "apply to full fleet" satisfiable: one file all 26 slots already call, not a 24-caller × 26-slot rollout.

**Pre-existing bug it exposed:** the old env anchor (3) read `process.env.CLAUDE_SESSION_ID` — the WRONG var name (always UNSET). The harness sets `CLAUDE_CODE_SESSION_ID`. Anchor 1.5 reads the correct one.

**Fail-soft:** a non-Claude process (scheduled-task cron) has no such var -> `readEnvSessionId()` returns null -> falls through to the existing heuristics, unchanged. Value is regex-restricted to `[0-9a-f-]`, sliced <=36, lands only in a `claude-<8hex>` filename (no path-traversal/injection); `deriveTerminalFromIdentifier`'s `[0-9a-f]{8}` is a second gate.

**Live proof:** bare `node .claude/helpers/stable-session-id.mjs` (no arg, no stdin) -> `claude-db273e77` (was a peer); `per-agent-handoff read` via the bare pattern -> `matchedBy:same-instance-newest`. 10/10 tests (6 arg-anchor `7dec157db0` + 4 env-anchor). 3-of-3 scrutiny PASS (all arms stress-tested the per-process-isolation claim, no P0/P1).

**Anchor precedence (final):** (0) explicit `--session-id` arg -> (1) stdin session_id (hook path) -> (1.5) `CLAUDE_CODE_SESSION_ID` env (bare-caller fix) -> (2) PID-pin heuristic -> (3) legacy `CLAUDE_SESSION_ID` manual override -> (4) transcript -> refuse-on-ambiguous.

Lesson: a per-process env var the harness sets is a more robust multi-chat anchor than any shared-file PID/cwd heuristic; fix the shared substrate, don't edit N call sites (R7/R8). Pairs with [[reference_task_boundary_compact_nudge_2026_06_10]] (the sibling `stop-force-loop-continue.mjs::findHandoff` full-uuid bug, flagged but not yet fixed).
