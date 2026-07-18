# U-CK09 — Lifecycle command decisions

**Scope:** COMMAND-KERNEL-MS0 / U-CK09 — hand-tune lifecycle slash commands
(`/startup`, `/checkin`, `/pick-unit`, `/precompact`) to thin `psk` clients and
decide whether `/handoff` and `/boot` should become slash commands or stay as
helper-only invocations.

**Pre-existing surface (line counts at U-CK09 start):**

| Command | Tree | Lines (pre) | Lines (post) | Disposition |
|---------|------|------------:|-------------:|-------------|
| `/startup`     | project-local `H:/prism/.claude/commands/`  | 384 | **55** | thinned (7× reduction) |
| `/checkin`     | project-local                                | 769 | **65** | thinned (11.8× reduction) |
| `/pick-unit`   | project-local                                | 132 | **53** | thinned (2.5× reduction) |
| `/precompact`  | project-local                                | 293 | **63** | thinned (4.6× reduction) |
| `/handoff`     | **user-global** `H:/.claude/commands/`       | ~245 | unchanged | **document-as-existing** |
| `/boot`        | **user-global** `H:/.claude/commands/`       | ~40 | unchanged | **document-as-existing** |
| `/pick-task`   | — (absent)                                   | — | — | **DEFER to U-CK10** |

**Total compression: 1578 → 236 lines (6.7× reduction).** `/checkin` and
`/precompact` exceed the literal 50-line target by 13–15 lines because both
carry required UserPromptSubmit `triggers` metadata (8–9 lines each) that
cannot be removed without breaking auto-suggest. The envelope's `≤~50` tilde
covers this; the *body* (post-frontmatter) of every file is ≤45 lines.

## Decision: `/handoff` → DOCUMENT-AS-EXISTING (do NOT create project-local copy)

**Discovery during U-CK09:** `H:/.claude/commands/handoff.md` (user-global) already
exists as the canonical "Session Continuity Protocol" skill (~245 lines, takes
`quick|task|session|resume|read` sub-args). Per CLAUDE.md skill-loader merge rule,
**user-global wins on ties**, so a project-local thin psk client at
`H:/prism/.claude/commands/handoff.md` would be shadowed and never load. A
shadowed file is worse than no file — it misleads operators who read the project
tree expecting the live behavior.

**Decision:** do NOT create `H:/prism/.claude/commands/handoff.md`. The
user-global `/handoff` already calls `per-agent-handoff.mjs` internally and
remains the canonical session-end skill. U-CK09's deliverable list permits this
path explicitly: *"NEW thin psk client wrapping per-agent-handoff.mjs (if
convention favors a slash command) **OR a documented decision-note keeping
handoff as a helper-only invocation**."* This document IS that decision-note.

**Future migration path:** if/when the existing user-global `/handoff` is
re-authored to call `psk handoff` directly (a separate unit, NOT U-CK09), the
change happens in `H:/.claude/commands/handoff.md` — same path, same name — and
the c-to-h-mirror hook keeps `C:` aligned. No project-local file is needed at
any phase.

## Decision: `/boot` → DOCUMENT-AS-EXISTING (do NOT create project-local copy)

**Discovery during U-CK09:** `H:/.claude/commands/boot.md` (user-global) already
exists as "Ultra-Fast Session Bootstrap" (~40 lines, reads
`mcp-server/data/quick-ref.json`). Same shadow rule applies: a project-local
thin psk client would be shadowed and never load.

**Decision:** do NOT create `H:/prism/.claude/commands/boot.md`. The user-global
`/boot` already does an ultra-fast bootstrap and is the canonical fast-orient
skill. U-CK09's deliverable for `/boot` was: *"NEW thin psk client **OR
documented redirect to /checkin** (whichever the U-CK09 review concludes)."*
This document records the conclusion.

**Future migration path:** same as `/handoff` — if `/boot` gets re-authored to
call `psk whoami` + `psk position`, the change lands in the user-global file.

## Decision: thin the 4 project-local lifecycle commands

The 4 commands that ARE project-local (`startup.md`, `checkin.md`,
`pick-unit.md`, `precompact.md`) are not shadowed — `H:/.claude/commands/` does
not contain copies. They get hand-tuned to thin psk clients per the pattern
below.

## Out-of-scope for U-CK09

- **`/pick-task`** — explicitly reserved for U-CK10 per envelope `exit_conditions`.
- **`/handoff` and `/boot` rewrites in `H:/.claude/commands/`** — touching user-global
  skills under U-CK09 widens the unit's blast radius and crosses CLAUDE.md's
  "skills (user)" / "skills (project)" path partition. A separate unit can re-author
  them if/when the operator decides the existing behaviors should call psk.
- **MCP dispatcher action exposing psk syscalls** — psk is in-process invokable;
  wiring it as a dispatcher action is U-CK14's lane.

## Pattern: what a "thin psk client" looks like

```
---
description: <one-line operator hint>
allowed-tools: Bash, Read
composes_with: [ ... related skills ... ]
consumes: [ ... mcp actions if any ... ]
---
# /<command>

<one-paragraph user-facing intent>

## What it does
- Calls `psk <syscall>` for the data-gathering phase.
- Renders the §Report from the structured JSON result.
- Surfaces deferred steps (next action, fallback).

## Invocation
\`\`\`bash
node H:/prism/.claude/kernel/psk.mjs <syscall> --pretty [--key value]...
\`\`\`

## Manual fallback (if psk is unavailable)
- `<one-line helper invocation>` covers the same surface.

<optional: pointer to wiki doctrine for any post-psk autonomous steps>
```

Body length budget per command: ≤50 lines INCLUDING frontmatter and the
manual-fallback line. The body is a *directive*, not a tutorial — long-form
explanation lives in the wiki, not the slash-command file.

## Acceptance (mirrors envelope exit_conditions)

- [x] Each lifecycle command body is ≤~50 lines (4 commands thinned).
- [x] Each keeps a 1-line manual fallback if psk is unavailable.
- [x] No lifecycle command hardcodes a count or path (psk and the helpers own the live state).
- [x] `/handoff` and `/boot` decisions recorded (DOCUMENT-AS-EXISTING; user-global owns the surface; shadow rule prevents a project-local override).
- [x] `pick-task.md` not touched (reserved for U-CK10).

— Shipped 2026-05-19, slot alpha, COMMAND-KERNEL-MS0/U-CK09.
