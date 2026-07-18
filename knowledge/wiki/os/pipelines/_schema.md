---
title: PRISM pipeline registry — frontmatter schema + ACP-MS0A coverage
slug: pipelines-schema
kind: doc
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK12
author: claude-c0f06dee (slot charlie, /loop command-kernel)
---

# Pipeline Registry Schema (U-CK12)

The PRISM pipeline registry lives at `knowledge/wiki/os/pipelines/*.md` and
publishes the kernel-level automation chains the operator + the harness +
the U-CK13 executor + the U-CK14 frontmatter-wiring + the U-CK25
`/pipeline` meta-command all read. Every entry's YAML frontmatter
conforms to **[`.claude/schemas/pipeline-frontmatter.schema.json`](../../../../.claude/schemas/pipeline-frontmatter.schema.json)**
(JSON Schema Draft 2020-12). A registry-wide validator script —
[`scripts/validate-pipeline-registry.mjs`](../../../../scripts/validate-pipeline-registry.mjs) — enforces it.

## How U-CK12 picked its disposition

The unit spec is `disposition: R` (REUSE) with `disposition_conditional`:

> **REUSE** if `ACP-MS0A.status === 'complete'` at unit-claim time; else **EXTEND**
> and contribute the schema back to ACP-MS1.

At U-CK12 claim time `ACP-MS0A.json:10` carries `"status": "not_started"`
(0/5 P0 units shipped). So this unit is on the **EXTEND** path — it
BUILDS the automation-chain schema and contributes it back. The
contribution surface is §contribution-back below.

## Required vs optional fields

Required at the root: **`title`, `slug`, `kind`, `status`, `date`**. Everything
else is optional — but most pipelines should carry at least one of
`composed_of`, `composes`, or `stages` (see §load-bearing-warning below).

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `title` | string (4-160) | ✓ | Human-readable name shown in wiki UIs. |
| `slug` | string, kebab-case, optional `namespace:slug` | ✓ | Stable id — matches filename; becomes the chain-id in the executor. |
| `kind` | enum-of-one `["pipeline"]` | ✓ | Discriminator. (Uses `enum:[...]` not `const:` — the CK06-derived validator subset doesn't implement `const`; an `enum` of one element is the semantic equivalent.) |
| `status` | enum: `draft \| shipped \| deprecated \| experimental` | ✓ | Lifecycle stage. |
| `date` | ISO date (YYYY-MM-DD) | ✓ | Authored/last-revised date. |
| `milestone` | string `^[A-Z][A-Z0-9-]+$` | optional | Roadmap milestone for cross-ref with `build-milestone-progress`. |
| `unit` | string | optional | Unit id(s) (e.g. `U-KIP01 + U-KIP02`). |
| `author` | string | optional | Authoring chat / slot. Diagnostic only. |
| `trigger` | string (enum) OR object (kind + cron/events/command) | optional | ACP-MS0A P0-U02 — event-to-chain + command-to-chain mapping. |
| `composed_of` | string[] unique, min 1 | optional ✱ | Ordered list of stages/commands/engines orchestrated. **Canonical name.** |
| `composes` | string[] unique, min 1 | optional ✱ | **DEPRECATED** alias for `composed_of`. Kept for back-compat with the 3 pre-U-CK12 seed entries; new entries SHOULD use `composed_of`. |
| `stages` | string[] unique, min 1 | optional ✱ | Logical phase labels (e.g. `[extract,route,plan,inject]`) where `composed_of` lists the TOOLS. Both MAY be present. |
| `token_budget` | object: `tier`, `max_tokens`, `enforcement` | optional | ACP-MS0A P0-U05 — per-chain token budget + enforcement contract. |
| `downgrade` | object: `mode`, `fallback_to` | optional | ACP-MS0A P0-U03 — downgrade / fail-closed behavior. |
| `telemetry` | object: `ledger`, `fields` | optional | ACP-MS0A P0-U04 — telemetry event schema. |
| `consumes` | string[] unique | optional | Upstream inputs. Mirrors command-frontmatter `consumes`. |
| `produces` | string[] unique | optional | Outputs. Mirrors command-frontmatter `produces`. |
| `replacement` | string (slug) | optional | Successor slug when `status: deprecated`. |

✱ See §load-bearing-warning.

## §ACP-MS0A coverage matrix

The 5 ACP-MS0A P0 units map onto the schema like this — every concrete
field path is reachable + meaningful + tested:

| ACP-MS0A unit | Schema field path | Coverage |
|--------------|-------------------|----------|
| **P0-U01** — chain-id + steps + triggers + token-budget JSON schema | `slug` (chain-id) · `composed_of`/`composes`/`stages` (steps) · `trigger` (triggers) · `token_budget` | full |
| **P0-U02** — event-to-chain + command-to-chain mappings | `trigger.events[]` (hook→chain) · `trigger.command` (command→chain) | full |
| **P0-U03** — downgrade / fail-closed behavior per tier (silent degrade / user prompt / hard stop) | `downgrade.mode` (3-value enum) · `downgrade.fallback_to` | full |
| **P0-U04** — telemetry event schema (fire ts, chain-id, step-id, token cost, latency, outcome) | `telemetry.fields[]` (8-value enum incl. all 5 spec fields + `session_id`/`slot`) · `telemetry.ledger` | full |
| **P0-U05** — per-chain token budgets (entry-router <500, coding <2K, product-autopilot <5K) + enforcement | `token_budget.tier` (4-value enum naming the 3 tiers + `custom`) · `token_budget.max_tokens` · `token_budget.enforcement` (3-mode enum: `soft-warn`/`hard-stop`/`downgrade-model`) | full |

Per-tier defaults are documented in the schema description; the
`validate-pipeline-registry.mjs` validator emits a `tier-budget-mismatch`
advisory warning when `tier` and `max_tokens` disagree (e.g. tier
`entry-router` with `max_tokens: 800` > the 500-token ceiling). Schema-
level enforcement would need `if/then/else` (not in the validator
subset); the warning layer is the operational pin.

## §load-bearing-warning — `missing-steps-field`

`composed_of` / `composes` / `stages` are ALL optional at the schema
root. This is **intentional** — a pure-trigger pipeline whose body runs
entirely inside a single hook script may legitimately register without
an orchestration list.

Schema-level enforcement of "at least one MUST be present" would need
`anyOf` (not implemented by the CK06-derived validator subset) or a
top-level `oneOf` over the three fields (which would FALSELY reject
[knowledge-injection.md](knowledge-injection.md) because it carries BOTH
`composes` AND `stages` — two branches match → `oneOf` requires exactly
one → fail).

The `validate-pipeline-registry.mjs` validator fills the gap with an
ADVISORY warning. Every entry that lacks all three of `composed_of`,
`composes`, AND `stages` (or all three are empty arrays) produces:

```
{ "code": "missing-steps-field",
  "message": "no composed_of / composes / stages — pipeline has no orchestration list. Intentional only for pure-trigger pipelines (hook-only)." }
```

Warnings are advisory by default (exit code 0) and become errors under
`--strict-warnings` (exit code 1) for CI.

## §contribution-back to ACP-MS0A / ACP-MS1

`ACP-MS0A.status === "not_started"` at U-CK12 claim time → this unit
took the EXTEND path. The schema published here SHOULD be adopted
verbatim by ACP — either:

1. **Promote to ACP-MS0A P0**: when ACP-MS0A re-opens, treat the 5 P0
   units as already-shipped (this unit covered each) and graft this
   schema into the ACP envelope. Mark P0-U01..P0-U05 as
   `status: complete-by-extension` with a `via: COMMAND-KERNEL-MS0/U-CK12`
   pointer in each unit's `ship_record`.

2. **Adopt into ACP-MS1**: if ACP-MS1's roadmap calls for a separate
   schema build, point that work at this file rather than re-building.
   Net delta = whatever ACP-MS1's domain-specific fields need *beyond*
   the 18 fields here (`x-ext-acp1: { ... }` is an acceptable seam).

Either way, the schema's `$id` (`https://prism/schemas/pipeline-frontmatter.schema.json`)
is stable. The `x-rationale.contribution_back` block in the schema
itself names this file as the contribution-back surface.

The U-CK13 pipeline executor consumes this schema as its contract;
when ACP adopts it, U-CK13 stays unchanged (the import path is the same
file).

## §validator-subset-limits (honest)

The CK06-derived validator implements: `type`, `enum`, `required`,
`pattern`, `minLength`, `maxLength`, `minimum`, `maximum`, `format:date`,
`additionalProperties:false`, `oneOf`, `items`, `minItems`,
`uniqueItems`.

It does **NOT** implement: `const`, `anyOf`, `allOf`, `if/then/else`,
`dependentSchemas`, `dependentRequired`, `$ref`, `maxItems`,
`propertyNames`, `patternProperties`, `format-assertion vocabulary`.

Semantic constraints the schema **cannot structurally enforce** —
delegated to the validator's warning layer + the U-CK13 runtime
executor:

| Constraint | Surface |
|-----------|---------|
| `tier` ↔ `max_tokens` ceiling coherence | `tier-budget-mismatch` warning + U-CK13 enforces at runtime |
| `status: deprecated` ↔ `replacement` presence | `deprecated-without-replacement` warning |
| `trigger.kind` ↔ payload-shape coherence (e.g. `kind:cron` should carry `cron:`, not `events:`) | U-CK13 runtime |
| at least one of `composed_of`/`composes`/`stages` | `missing-steps-field` warning (this is the load-bearing one) |

Listing these honestly here means a future schema-validator upgrade
(e.g. adopting Ajv to gain `anyOf`/conditionals) has a clean punch
list.

## §running the validator

```bash
# JSON report (default)
node scripts/validate-pipeline-registry.mjs

# Human-readable summary
node scripts/validate-pipeline-registry.mjs --human

# Treat missing-frontmatter as an error (exit 1)
node scripts/validate-pipeline-registry.mjs --strict

# Treat ANY advisory warning as an error (exit 1) — CI-friendly
node scripts/validate-pipeline-registry.mjs --strict-warnings

# Always exit 0 (advisory mode — for dashboards)
node scripts/validate-pipeline-registry.mjs --report-only

# Override scan dir / schema path (testing / forks)
node scripts/validate-pipeline-registry.mjs --dir /custom --schema /custom.json
```

Exit codes: **0** = all valid (or `--report-only`); **1** = at least one
invalid (or `--strict*` triggered); **2** = setup / IO error (schema
unreadable).

## §the 3 seed entries

Authored before U-CK12 (slot india, 2026-05-17); validate cleanly
against this schema as of U-CK12 ship:

| Slug | File | Why it's interesting |
|------|------|----------------------|
| `loop` | [loop.md](loop.md) | The two-mode (cron + dynamic) autonomous-iteration pipeline that drove this entire close-out wave. `trigger: cron`. |
| `goal-complete` | [goal-complete.md](goal-complete.md) | `/goal complete` Stop-hook gate — the ceremonial-end pattern. `trigger: hook`. |
| `knowledge-injection` | [knowledge-injection.md](knowledge-injection.md) | KIP — closed-loop knowledge → node. Uses the deprecated `composes` alias + `stages` together — exercises the back-compat path. |

The real-data E2E test in `scripts/__tests__/validate-pipeline-registry.test.mjs`
is the fail-on-revert oracle for these three entries (per the
RGS-TOOL-MS1 lesson: a "pure core + injected readers" design MUST ship
≥1 real-data E2E test).

## Related

- [[knowledge-vault-schema]] — the 5-namespace vault doctrine this entry
  lives inside
- [[knowledge-injection]] — sister pipeline (KIP)
- [[loop]] — sister pipeline (autonomous-iteration)
- [[goal-complete]] — sister pipeline (Stop-hook ceremony gate)
- `knowledge/wiki/os/_command-schema.md` — the U-CK06 command schema
  (sibling pattern this schema mirrors)

## See also

- `.claude/schemas/pipeline-frontmatter.schema.json` — the actual JSON
  Schema (Draft 2020-12)
- `scripts/validate-pipeline-registry.mjs` — the validator
- `scripts/__tests__/validate-pipeline-registry.test.mjs` — the
  45-case test suite (incl. the real-data E2E oracle)
- `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` U-CK12 — the unit envelope
- `mcp-server/data/milestones/ACP-MS0A.json` — the upstream
  automation-chain milestone (`not_started` at U-CK12 claim time → this
  unit took the EXTEND path)
