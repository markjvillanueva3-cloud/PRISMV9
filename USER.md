# USER.md — PRISM operator preferences (Hermes-pattern, ~1.5 KB cap)

> **Companion to `CLAUDE.md`.** CLAUDE.md = project doctrine + canonical sources. USER.md = the operator's working preferences + role + escalation paths. Both auto-load every session per [[reference_hermes_dreaming_and_webwright_2026_05_26]] (KSimback's Hermes Memory Guidebook). Hermes default cap is 1.4 KB; PRISM cap is **2 KB** — anything longer goes in `knowledge/wiki/` and links back here.

## Identity

- **Operator:** Mark Villanueva (`markjvillanueva3@gmail.com`)
- **Role:** PRISM platform owner. Domain: manufacturing intelligence (mill / lathe / wire-EDM / multiaxis), JM Die Company test shop, print-to-program pipelines.
- **Mode:** YOLO autonomous, auto-commit per unit, 26-chat NATO slot fleet, fix-known-failures discipline.

## Working preferences

- **Tone:** physics-first, rigorous about units (kc in MPa, fz in mm/tooth, etc.). Brief direct answers > long explanations.
- **Output:** no emojis unless I ask. No trailing summaries — diff speaks for itself. No filler ("Great!", "I'll now…"). Prose over bullet-walls when explaining a decision; bullets when listing options or scoring.
- **Code:** Karpathy R1-R12 doctrine; no stubs, no inline physics constants, no toBeDefined() tests. Match surrounding conventions over personal taste.
- **Commits:** `[SCOPE]/U-ID: title` format, `[MAIN]` prefix on shared tree, slot-name in body, fail-loud commit messages naming what shipped + what's verified + what's still open.

## Escalation paths

- **Physics / safety / Kienzle / Taylor / S(x):** route to `physics-reviewer` subagent BEFORE editing; verify against `mcp-server/src/physics/constants.ts`. Soul-refuses: inline-physics-constants, stub-engines, softening-safety-thresholds.
- **Known infra failures:** per [[feedback_bravo_golf_papa_quebec_fix_known_failures]], if I'm in slot bravo/golf/papa/quebec, FIX it in-session — don't just record.
- **Multi-chat conflict:** fork to slot worktree (`H:/prism-slot-<nato>` on `slot/<nato>`); shared-tree commits get peer-absorbed.

## Standing rules I'll always re-state

- Run RTK prefix on bash. Parallelize independent tool calls. Glob/Grep > shell find/grep. Read with offset/limit on large files.
- Check `ENGINE_DIGEST.md` + `duplicationGuardEngine` before creating any new engine.
- 3-of-3 scrutiny gate at Stop for any committed diff. Per-file scrutiny gate during multi-file builds.
- Per-chat handoff via `per-agent-handoff.mjs`, NEVER write to legacy singular `state/HANDOFF.md`.
- `/checkin <slot>` args ARE the primary work order — slot-claim is minimal silent preamble.

## What never to do

- Public-publish anything from `H:/prism/*` (HARD rule — internal-only).
- `git stash` / `pop` in `H:/prism` shared tree (clobbers peers).
- `ScheduleWakeup` inside a `/loop` (cache cost > round-trip value).
- Weaken a safety threshold or `.skip` a failing test to make CI green.

## See also

- `CLAUDE.md` (project doctrine — auto-loaded every session)
- `H:/.claude/CLAUDE.md` (user global — auto-loaded every session)
- `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` (auto-memory index, ≤22 KB ceiling, ≤12 KB after U-MWO02)
- `state/shared/MEMORY-RECENT.md` (the 67-entry chronological list moved out of MEMORY.md)
- `state/shared/specs/MEMORY-WIKI-OPTIMIZATION-2026-05-26.md` (U-MWO03 spec)
