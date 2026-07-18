---
title: U-CK06 ↔ U-VAULT04 Cross-Trigger Registry Reconciliation
slug: command-schema-reconciliation
kind: command
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK06
extends: U-VAULT04
author: claude-41db1b82 (slot india)
---

# U-CK06 ↔ U-VAULT04 Reconciliation

This document records how U-CK06's canonical command frontmatter schema
**absorbs** U-VAULT04's "Skill ↔ wiki cross-trigger registry" into a
single source of truth. The reconciliation decision and its rationale
are pinned here so future regen passes don't re-fork the two registries.

## The two-registry problem (pre-reconciliation)

Before U-CK06 + U-VAULT04 landed, PRISM had two parallel surfaces
specifying when skills should auto-suggest or auto-inject:

| Surface | Where | What it specifies | Owned by |
|---------|-------|-------------------|----------|
| Per-skill `trigger` block | `.claude/commands/*.md` frontmatter | Skill auto-suggest keywords + hook events | Skill author |
| Cross-trigger registry | `state/shared/cross-trigger-registry.*` (proposed by U-VAULT04) | Skill ↔ wiki-entry pairing for wiki-recall on prompt | Vault maintenance |

Two registries means two places to drift. The U-CK06 RFC ("REUSE U-SKU06
+ RECONCILE with U-VAULT04 — one registry, not two") chose absorption.

## Reconciliation decision

**The canonical command frontmatter schema is the single registry.**
U-VAULT04's cross-trigger pairing is expressed through three schema fields:

| U-VAULT04 concept | U-CK06 schema field | Semantics |
|-------------------|---------------------|-----------|
| Skill autosuggest keywords | `trigger.autoSuggest.keywords` (array) | BM25-matched against user prompt by `skill-auto-trigger.mjs`. |
| Wiki-entry pairing | `consumes` (array of `wiki/<path>` items) | The skill declares which wiki entries it reads; `wiki-precheck-inject` hook surfaces them on prompt-match. |
| Cross-trigger event hooks | `trigger.events` (UserPromptSubmit / SubagentStart / etc.) | Declares which hook events MAY auto-invoke the skill. Harness wiring stays separate (settings.json is authoritative). |
| Cross-trigger pipeline membership | `pipeline_integrations[]` | Skill registers as a phase participant in named pipelines. |

There is **no separate `cross-trigger-registry.json` file**. Anything
U-VAULT04 needs to know about a skill's cross-trigger contract reads
the skill's own frontmatter via the unified schema.

## Implementation contract

| Consumer | Reads | Action |
|----------|-------|--------|
| `skill-auto-trigger.mjs` (UserPromptSubmit hook) | `trigger.autoSuggest.keywords` + `trigger.autoSuggest.minScore` | Surface top-K skill suggestions on prompt match. |
| `wiki-precheck-inject.mjs` (UserPromptSubmit hook) | `consumes` items matching `wiki/*` | Surface paired wiki entries on prompt match. |
| `master-index-precheck-inject.mjs` (UserPromptSubmit hook) | independent BM25 over the system graph | Continues using its own index (not skill frontmatter). |
| `/pipeline` (U-CK25 — planned) | `pipeline_integrations[]` + `composes_with` | Static dependency analysis + phase-membership query. |
| `prism_session:master_index_query` | the unified skill registry | Returns skill metadata as a single coherent record. |

## What U-VAULT04 still owns

The reconciliation does NOT eliminate U-VAULT04 — only the *registry*
duplication. U-VAULT04 retains ownership of:

- **The promotion-path doctrine** (fleeting → memory → wiki → CLAUDE.md
  pointer; see [[knowledge-vault-schema]]).
- **The 5-namespace boundary** (memory / wiki / commands / handoffs /
  specs); U-CK06 lives strictly inside `commands` + `wiki/os/commands`.
- **Cross-namespace linking conventions** (`[[wiki-slug]]`, `[[memory-slug]]`).

What changed: U-VAULT04's planned `state/shared/cross-trigger-registry.*`
file is **not built**. The data it would carry is computed at read-time
from skill frontmatter via `skill-auto-trigger.mjs` + `wiki-precheck-inject.mjs`.

## Migration path for legacy skills

Pre-U-CK06 skills typically have:

```yaml
---
name: skill-name
description: ...
allowed-tools: [Read, Edit]
---
```

The U-CK08 corpus migration progressively enriches these with:
- `version`: starts at `1.0.0`
- `tier`: defaults to `T4` (telemetry/advisory)
- `trigger.autoSuggest.keywords`: extracted from `description` + skill body
- `consumes` / `produces`: extracted from skill body (heuristic;
  human-verified at U-CK11 scrutiny pass)

**Backward-compat is load-bearing:** the JSON Schema's `required` set is
`["name", "description"]` only. Every legacy skill validates today.
Enrichment is additive over time.

## Mirror-gen impact (U-CK05)

U-CK05 (deferred — fleet-impact risk) would have generators read these
frontmatters to compute:
- `state/shared/SLASH_COMMAND_REGISTRY.json` — flattened skill metadata
- `state/shared/chat-slots.json` — separately owned (NOT in scope of U-CK06 reconciliation)
- `state/shared/atomic-roadmap.json` — separately owned (NOT in scope)

When U-CK05 lands, only `SLASH_COMMAND_REGISTRY.json` becomes a mirror
of the U-CK06 frontmatter set. `chat-slots.json` and `atomic-roadmap.json`
stay as live-runtime state files (per U-CK05 fleet-impact concern).

## See also

- [[_command-schema]] — U-CK06 canonical schema (narrative form)
- [[knowledge-vault-schema]] — U-VAULT01 5-namespace doctrine
- [[_schema]] — wiki/os/ entity schema
- `.claude/schemas/command-frontmatter.schema.json` — machine schema
- `.claude/hooks/skill-auto-trigger.mjs` — autosuggest consumer
- `.claude/hooks/wiki-precheck-inject.mjs` — wiki-pairing consumer
