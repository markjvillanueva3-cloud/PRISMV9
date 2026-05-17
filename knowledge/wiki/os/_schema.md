---
title: PRISM wiki/os/ — Vault-as-OS Entity Frontmatter Schema
kind: architecture
status: shipped
date: 2026-05-17
unit: U-CK04
milestone: COMMAND-KERNEL-MS0
extends: U-VAULT01
author: claude-41db1b82 (slot india)
---

# wiki/os/ — Vault-as-OS Entity Schema

The COMMAND-KERNEL-MS0 doctrine treats the vault as a tiny operating
system: **commands** are programs, **pipelines** are scheduled jobs,
**processes** are running chats, **runqueue** is the work backlog,
**sessions** are persistent identities, and **syscalls** are the kernel
ABI (`.claude/kernel/psk.mjs` resolves them). This schema EXTENDS
U-VAULT01's 5-namespace vault schema to add a 6th *sub-namespace* under
`wiki/`: `wiki/os/`.

`wiki/os/` is NOT a 6th vault namespace at the U-VAULT01 level. It is a
**structured sub-namespace under wiki/** that captures the OS abstraction
as compounding architecture knowledge. The 5 top-level namespaces from
U-VAULT01 (`memory`, `wiki`, `commands`, `handoffs`, `specs`) are
unchanged. `wiki/os/` lives under `wiki/` and follows the existing wiki
regen pipeline.

## The 6 entity kinds under `wiki/os/`

| Sub-namespace | Path | Entity kind | What it captures |
|---|---|---|---|
| **commands** | `wiki/os/commands/<slug>.md` | A program the user can invoke (mirrors `.claude/commands/*.md` slash-commands; the wiki entry is the **architecture**, the source `.md` is the **executable spec**). |
| **pipelines** | `wiki/os/pipelines/<slug>.md` | A scheduled / recurring job (cron-triggered, /loop, /schedule, hook-chained workflows). |
| **processes** | `wiki/os/processes/<slug>.md` | A running chat session — slot identity, terminal-pin, lifecycle (compact → resume), per-slot doctrine. |
| **runqueue** | `wiki/os/runqueue/<slug>.md` | The work backlog — priority-queue surfaces, pick-unit logic, claim arbitration, /forge queue. |
| **sessions** | `wiki/os/sessions/<slug>.md` | Persistent identity across compacts — stable-session-id, terminal-window pin, slot-task-claim, handoff anchoring. |
| **syscalls** | `wiki/os/syscalls/<slug>.md` | The kernel ABI — `psk` syscalls (whoami / position / manifest / handoff / checkin / pick / etc.). Each syscall gets one entity. |

## Required frontmatter (every `wiki/os/<kind>/<slug>.md`)

```yaml
---
title: <Human-readable title>
slug: <kebab-case-stable-id>            # MUST match filename basename
kind: command | pipeline | process | runqueue | session | syscall
status: shipped | in_progress | proposed | deferred | retired
date: <YYYY-MM-DD>                      # last meaningful update
milestone: <MS-ID or null>              # primary owning milestone
unit: <U-XX or null>                    # primary owning unit
author: <chat-id> (slot <name>)         # last live-chat author
---
```

## Optional frontmatter (kind-aware)

| Kind | Optional fields |
|------|-----------------|
| `command` | `mirrors_skill: .claude/commands/<slug>.md` · `triggers: [<keyword>, ...]` · `dispatcher_actions: [<dispatcher:action>, ...]` |
| `pipeline` | `trigger: cron | manual | hook | event` · `cron: <expression>` · `composed_of: [<wiki-os-slug>, ...]` |
| `process` | `slot: <nato>` · `pin: <terminal-window-id>` · `lifecycle: [<compact-resume-flow>]` |
| `runqueue` | `source: priority-queue | atomic-roadmap | misc-tasks` · `filter: <criteria>` |
| `session` | `id_anchor: stable-session-id | terminal-window-id | host` · `survives: [compact, restart, ...]` |
| `syscall` | `kernel_handler: <symbol>` · `params_schema: <inline-zod-summary>` · `composes: [<other-syscall>, ...]` |

## Cross-namespace linking

- Wiki cross-links via `[[wiki-slug]]` (existing wiki convention).
- Memory cross-links via `[[memory-slug]]` resolved against
  `C:/Users/<u>/.claude/projects/H--PRISM/memory/`.
- `mirrors_skill: <path>` is the canonical link from a wiki/os/commands
  entry to the executable .md skill — keeps the wiki entry an
  architecture record while the .md remains the spec/runbook.

## Validation

Every entity under `wiki/os/` is validated by the existing wiki-lint
pipeline (`/wiki-lint` skill). Frontmatter MUST parse as YAML and MUST
include the **required** keys above. Kind-aware optional keys are
not enforced (operator choice).

CK06's `command-frontmatter.schema.json` is the JSON Schema layer for
`commands/` skill files; it is NOT identical to this wiki/os/ schema.
This schema is for **wiki architecture entries**; CK06's schema is for
**executable command files**. Both can coexist — the
wiki/os/commands/<slug>.md entry links to the .claude/commands/<slug>.md
file via `mirrors_skill:`.

## Promotion path

Same as U-VAULT01: fleeting (chat) → memory (cross-session) → wiki
(project-lifetime) → CLAUDE.md pointer (when milestone-worthy). For
wiki/os/ entities specifically:

1. New command / pipeline / syscall ships in `.claude/` or
   `mcp-server/` source.
2. Author writes the `wiki/os/<kind>/<slug>.md` entry (this schema).
3. CK05 generator (planned) keeps JSON registries (e.g.
   `state/shared/COMMANDS-REGISTRY.json`) as mirrors of the os/
   entities — single source of truth is the markdown, registries are
   computed downstream.

## Re-run

```bash
# Lint a single entry:
node scripts/wiki-lint.mjs knowledge/wiki/os/commands/<slug>.md

# Lint all os/ entries:
node scripts/wiki-lint.mjs knowledge/wiki/os/
```

## See also

- [[knowledge-vault-schema]] — U-VAULT01 (parent schema this extends)
- [[u-ck06-command-frontmatter-schema]] — CK06 JSON Schema for skill files
- [[checkin]] — the canonical command-kernel entry surface
