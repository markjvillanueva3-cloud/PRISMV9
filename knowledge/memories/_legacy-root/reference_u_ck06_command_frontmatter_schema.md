---
name: reference-u-ck06-command-frontmatter-schema
description: COMMAND-KERNEL-MS0/U-CK06 — canonical YAML frontmatter schema for .claude/commands/*.md skills. Draft 2020-12 with 14 properties (name/description/version/tier/trigger/consumes/produces/composes_with/pipeline_integrations/model/effort/allowed-tools/context/owner/deprecated). Validator scans the live corpus and reports coverage.
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:10.045Z
aliases: reference_u_ck06_command_frontmatter_schema
---


# U-CK06 — Command Frontmatter Schema

Shipped 2026-05-15 by slot alpha (claude-6eac1b66) as the foundation for COMMAND-KERNEL-MS0 (29-unit milestone).

## Files

- `.claude/schemas/command-frontmatter.schema.json` — Draft 2020-12 schema. 14 properties, 2 required (`name` + `description`). `additionalProperties: true` so legacy skills validate; richness comes from progressively populated optional fields.
- `scripts/validate-command-frontmatter.mjs` — Node validator. No external deps (in-process YAML parser + Draft 2020-12 subset: type / required / pattern / enum / minLength / maxLength / minimum / maximum / minItems / uniqueItems / format:date / additionalProperties:false / oneOf / array items). Exit codes 0/1/2.

## Schema highlights

- **`name`** — kebab-case slug, optional one-level namespace (e.g. `sparc:ask`). `^[a-z][a-z0-9-]*(:[a-z0-9-]+)?$`.
- **`tier`** — `T0..T5` aligned with hook tiers. T0 = critical (blocks Stop), T2 = inject, T4 = telemetry.
- **`consumes` / `produces`** — dependency-graph inputs/outputs. Files, dispatcher actions, env vars.
- **`composes_with`** — other slash-commands orchestrated internally. Read by U-CK25 `/pipeline` for static dependency analysis.
- **`pipeline_integrations`** — registers participation in named pipelines (forge / forge-audit / rgs / roadmap / close-out / session-cycle). Read by U-CK14 + U-CK16.
- **`deprecated`** — boolean OR `{since, replacement, remove_after}` object.

## Baseline measured today

```
Scanned: 167
Valid:   33  (19.8 %)
Invalid: 132
Missing frontmatter: 2

Field coverage:
  name                     50
  description              68
  version                   8
  tier                      0
  trigger                   7
  consumes                  0
  produces                  0
  composes_with             0
  pipeline_integrations    11
  model                    25
  effort                   26
  allowed_tools            33
  context                  11
```

## Unblocks

- **U-CK07** — `command-migrate.mjs` codemod (now has a target schema to compile against)
- **U-CK08** — Migrate the command corpus: 132 skills need `name` + `description`, 167 need `tier`, ~150 need `consumes`/`produces`
- **U-CK15** — Populate `consumes` / `produces` / `composes_with` across migrated commands
- **U-CK16** — Extend `skill-auto-trigger.mjs` to be pipeline-aware (reads `pipeline_integrations`)

## Related

- [[reference_u_vault01_knowledge_vault_schema]] — defines commands as 1 of 5 vault namespaces
- [[reference_session_continuity_stack_2026_05_15]] — first canonical example of "touch all 4 surfaces" (this entry continues the pattern)


## Related
[[skills/schemas|/schemas]] • [[skills/command-frontmatter|/command-frontmatter]] • [[skills/validate-command-frontmatter|/validate-command-frontmatter]] • [[skills/outputs|/outputs]] • [[skills/pipeline|/pipeline]]