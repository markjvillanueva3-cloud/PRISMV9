---
title: PRISM Canonical Command Frontmatter Schema
slug: command-schema
kind: command
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK06
extends: U-VAULT04
reuses: U-SKU06
author: claude-41db1b82 (slot india)
---

# Canonical Command Frontmatter Schema (U-CK06)

This is the **narrative form** of the canonical command frontmatter schema
used by every `.claude/commands/*.md` skill in PRISM. The machine-readable
JSON Schema source-of-truth lives at `.claude/schemas/command-frontmatter.schema.json`;
this document explains the design, the field semantics, and the
reconciliation with the sibling registries (U-SKU06 / U-VAULT04).

## Design intent

A single canonical frontmatter schema serves as **the kernel's API contract
for every command**. It is a SUPERSET of U-SKU06's skill-registry schema
(adds composition + pipeline fields) and RECONCILES U-VAULT04's cross-
trigger registry into the same surface (one registry, not two).

Three load-bearing properties:

1. **Backward-compat by design** — only `name` + `description` are required.
   Any existing skill validates today; richer fields land progressively via
   U-CK08 corpus migration.
2. **Composition primitive** — `consumes` / `produces` / `composes_with`
   declare static data-flow + slash-command orchestration edges that the
   future `/pipeline` meta-command (U-CK25) consumes for dependency
   analysis.
3. **Trigger registry unified** — `trigger.autoSuggest` + `trigger.events`
   absorb U-VAULT04's cross-trigger semantics (see reconciliation doc).

## Required fields (2)

| Field | Type | Notes |
|-------|------|-------|
| `name` | string, kebab-case, `^[a-z][a-z0-9-]*(:[a-z0-9-]+)?$`, 1-64 chars | Becomes `/`<name> slash-command. Optional one-level namespace (e.g. `sparc:ask`). |
| `description` | string, ≥16 chars | Single-paragraph hook surfaced in auto-suggest. WHAT + WHEN to use. |

## Optional fields (kernel ABI)

### Identity + versioning

| Field | Type | Purpose |
|-------|------|---------|
| `version` | semver `M.m.p` | Bump major on argument-incompat, minor on additive, patch on doc/bug. |
| `deprecated` | boolean OR `{since,replacement,remove_after}` | Picked up by `/skill-lint`. |
| `owner` | string | Slot or chat owning the skill — routing + ownership audits. |

### Tier + budget

| Field | Type | Purpose |
|-------|------|---------|
| `tier` | T0..T5 | Hook-tier alignment. T0=critical, T1=advisory, T2=inject, T3=nudge, T4=telemetry, T5=experimental. |
| `model` | `opus`/`sonnet`/`haiku`/`auto` | Preferred Claude tier; `auto` → model-router. |
| `effort` | `low`/`medium`/`high`/`max` | Reasoning-depth hint. |
| `context` | `minimal`/`normal`/`extended`/`max` | Context-budget hint. |
| `allowed-tools` | string[] | Tool whitelist; empty = inherit. |

### Trigger (absorbs U-VAULT04 cross-trigger registry)

```yaml
trigger:
  autoSuggest:
    keywords: [...]      # OR
    regex: "..."
    minScore: 0.3
  events: [UserPromptSubmit | PreToolUse | PostToolUse | Stop |
           SessionStart | PreCompact | SubagentStart, ...]
```

- `autoSuggest.keywords` is matched against the user prompt by
  `skill-auto-trigger.mjs`; top-K (default 3) surface as suggestions.
- `autoSuggest.regex` is mutually exclusive with `keywords` — provide one
  or the other.
- `autoSuggest.minScore` controls BM25 threshold (default 0.3).
- `trigger.events` declares hook events that *may* auto-invoke; harness
  wiring stays separate (settings.json is authoritative).

### Composition contract (new — superset of U-SKU06)

| Field | Type | Purpose |
|-------|------|---------|
| `consumes` | string[] | Inputs read: file paths, dispatcher actions, other skills, env vars. |
| `produces` | string[] | Outputs written: file paths, dispatcher actions, persistent state. |
| `composes_with` | string[] of slash-commands | Orchestrated commands (e.g. `/checkin` composes `/handoff`, `/precompact`). |
| `pipeline_integrations` | array of `{pipeline, phase, ordering}` | Registers the skill as a participant in named pipelines (forge, forge-audit, rgs, roadmap, close-out, session-cycle). |

These four fields are the **kernel composition primitive** — `/pipeline`
(U-CK25) consumes them for static dependency analysis. `consumes`+`produces`
forms the data-flow graph; `composes_with` forms the call graph;
`pipeline_integrations` forms the pipeline-phase membership.

## Example — fully-populated frontmatter

```yaml
---
name: pick-build-close
description: Pick a unit, research it, build it, run the per-file scrutiny gate, close it out, write the handoff. End-to-end /loop iteration macro.
version: 1.0.0
tier: T1
trigger:
  autoSuggest:
    keywords: [pick-build-close, pbc, finish-unit, ship-unit]
    minScore: 0.4
  events: []
consumes:
  - state/shared/MILESTONE_PROGRESS.json
  - state/shared/BUILD_STATE.json
  - prism_session:master_index_query
  - /pick-unit
produces:
  - state/shared/handoffs/HANDOFF-*.md
  - git commit
  - state/shared/SCRUTINY_LEDGER.json
composes_with:
  - /pick-unit
  - /scrutinize
  - /close-out
  - /handoff
pipeline_integrations:
  - { pipeline: session-cycle, phase: ship, ordering: during }
model: sonnet
effort: medium
context: normal
owner: india
---
```

## Validation

```bash
# Validate a single skill file:
node scripts/skill-lint.mjs .claude/commands/<name>.md

# Validate the entire corpus (baseline at U-CK06 ship: 33/167 valid; rest
# pass through backward-compat — required-only):
node scripts/skill-lint.mjs .claude/commands/
```

The validator uses the JSON Schema at
`.claude/schemas/command-frontmatter.schema.json` (the
machine-readable source of truth — this document is its narrative form).

## See also

- [[knowledge-vault-schema]] — U-VAULT01 (parent vault schema)
- [[_command-schema-reconciliation]] — U-VAULT04 cross-trigger registry reconciliation
- [[_schema]] — wiki/os/ entity schema (this file lives under that namespace)
- `.claude/schemas/command-frontmatter.schema.json` — machine source of truth
