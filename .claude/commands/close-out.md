---
name: close-out
description: Close out a completed milestone across every roadmap surface — roadmap-index.json, MILESTONE_PROGRESS, BUILD_STATE, and the chat bus. Use after a milestone envelope is marked completed but the downstream surfaces still report drift.
version: 1.0.0
triggers:
  - "close out"
  - "close-out"
  - "close out milestone"
  - "close out a milestone"
  - "finalize milestone"
  - "finalize the milestone"
  - "mark milestone complete"
  - "update the roadmap"
  - "sync roadmap index"
  - "fix envelope drift"
  - "roadmap drift"
  - "envelope says completed but"
composes_with:
  - "/build-state"
  - "/envelope-sync"
---
# /close-out — One-command milestone close-out across every roadmap surface

The PRISM roadmap has FIVE surfaces that all need to agree before a milestone
is truly "done":

1. **Envelope** — `mcp-server/data/milestones/<MS-ID>.json` (`status: "completed"`).
2. **Roadmap index** — `mcp-server/data/roadmap-index.json` (one entry per milestone, `status: "complete"` canonical).
3. **MILESTONE_PROGRESS** — `state/shared/MILESTONE_PROGRESS.{md,json}` (the git-grounded shipped-vs-claimed delta).
4. **BUILD_STATE** — `state/shared/BUILD_STATE.{md,json}` (auto-injected at SessionStart; flags drift on every chat startup until cleared).
5. **Chat bus** — `state/shared/agent-chat.jsonl` (peer chats learn about the close-out without re-reading JSON).

If you flip only the envelope, the other four drift — that is the bug pattern
named in `feedback_roadmap_close_out` (origin: OCTOPUS-NEURAL-MS0). The
`enforce-roadmap-closeout.mjs` Stop hook detects this exact drift class and
blocks Stop until the index agrees with the envelope.

## When to invoke

- After flipping a milestone envelope from `in_progress` to `completed`.
- When BUILD_STATE injection says `<MS-ID>: claims not_started, real completed_real`.
- When the Stop hook `enforce-roadmap-closeout` blocks with a list of drifted ids.
- When you just merged a milestone branch into `main` and want every audit / dashboard / SessionStart injection to reflect it on the next prompt.

## Arguments

`$ARGUMENTS` is the milestone id (e.g. `OCTOPUS-NEURAL-MS0`).
If empty, the orchestrator's `--auto` flag derives the id from the most recent
`[<SCOPE>]/U-...:` commit subject in `git log`.

## The single command

```bash
node scripts/close-out-milestone.mjs --milestone $ARGUMENTS
```

That orchestrator touches all four downstream surfaces, atomically:

- mutates the index entry in `roadmap-index.json` (preserves `_legacyStatus`, stamps `completed_at`)
- runs `node scripts/build-milestone-progress.mjs` (regenerates `state/shared/MILESTONE_PROGRESS.{md,json}`)
- runs `node scripts/build-state-snapshot.mjs` (regenerates `state/shared/BUILD_STATE.{md,json}`)
- posts a one-line summary to the chat bus via `agent-coordination.mjs post`

Idempotent — re-running on a milestone that is already in-sync is a no-op.

## Useful flags

| Flag | Effect |
|------|--------|
| `--auto` | Derive milestone id from most recent `[SCOPE]/U-…:` commit subject |
| `--no-write` | Preview — print the diff, do not mutate disk |
| `--json` | Machine-readable summary (for CI / dashboards) |
| `--skip-chat-bus` | Do everything except posting to the chat bus |
| `--skip-regen` | Skip the two sub-script regens (advanced — only when running them yourself) |
| `--force` | Allow close-out even when envelope status differs from `completed` |
| `--self-test` | Run the bundled 25-case synthetic fixture suite |

## Example: what perfect output looks like

For a clean close-out on `OCTOPUS-NEURAL-MS0`:

```
close-out: OCTOPUS-NEURAL-MS0
  envelope:        completed 5/5
  roadmap-index:   not_started → complete (5/5)  [_legacyStatus preserved]
  MILESTONE_PROGRESS regen:  ok
  BUILD_STATE regen:         ok
  chat-bus:        posted

OCTOPUS-NEURAL-MS0 closed out — envelope completed 5/5 +roadmap-index +MILESTONE_PROGRESS +BUILD_STATE
```

For an idempotent re-run (already closed out):

```
close-out: OCTOPUS-NEURAL-MS0
  envelope:        completed 5/5
  roadmap-index:   complete (5/5) — no change
  MILESTONE_PROGRESS regen:  ok
  BUILD_STATE regen:         ok
  chat-bus:        posted

OCTOPUS-NEURAL-MS0 closed out — envelope completed 5/5
```

## Enforcement

The Stop hook `H:/prism/.claude/hooks/enforce-roadmap-closeout.mjs` (wired in
`H:/prism/.claude/settings.json` Stop array) scans every Stop event for the
exact drift class — envelope `completed`, index non-`complete`. If any milestone
matches, Stop is blocked with the one-command fix above. The hook auto-passes
after 3 attempts on the same session id, and honors the escape hatch
`PRISM_CLOSEOUT_GATE_BYPASS=1` (logged on use).

## Related

- Rule: `feedback_roadmap_close_out` (2026-05-12 user directive).
- Orchestrator: `H:/prism/scripts/close-out-milestone.mjs`
- Hook:         `H:/prism/.claude/hooks/enforce-roadmap-closeout.mjs`
- Tests:        `H:/prism/mcp-server/src/__tests__/RoadmapCloseOut.test.ts`
- Companion skill `/build-state` — print the BUILD_STATE summary the hook reads.
- Companion skill `/envelope-sync` — fix the reverse drift class (envelope behind index).
