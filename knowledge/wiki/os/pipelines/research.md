---
title: PRISM pipeline — /research <token-or-unit> pre-build research orchestrator
slug: research
kind: pipeline
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK18
author: claude-2d30710b (slot hotel, /loop command-kernel)
trigger: command
composed_of: [master-index-query, memory-semantic-search, /wiki-query, slot-task-claim, MILESTONE_PROGRESS, duplication-guard]
stages:
  - resolve-input          # decide UNIT vs TOKEN branch
  - already-shipped-check  # UNIT only — MILESTONE_PROGRESS + git-log subtract
  - peer-claim-check       # UNIT only — surface conflicting slot claims
  - prior-art              # master-index + wiki + memory + spec scan (both modes)
  - duplicate-guard        # TOKEN only — surface near-matches before any new asset
  - sibling-units          # UNIT only — other pending units in same phase
  - emit-brief             # markdown brief inline OR --out file
consumes:
  - mcp-server/data/milestones/<MILESTONE>.json
  - state/shared/MILESTONE_PROGRESS.json
  - state/shared/slot-task-claims.json
  - state/shared/system-viz/system-graph.json
  - knowledge/wiki/index.md
produces:
  - research-brief.md
downgrade:
  mode: silent-degrade
  fallback_to: brief-without-deep-recall
telemetry:
  ledger: state/shared/pipeline-telemetry.jsonl
  fields: [fire_ts, chain_id, step_id, token_cost, latency_ms, outcome, session_id, slot]
---

# `/research` — Pre-Build Research Orchestrator (U-CK18)

The **pre-build** surface of the command kernel. `/session-cycle` (U-CK17)
calls this between *pick* and *build* so every unit ships with a research
brief instead of a re-derived guess. Composes existing surfaces — does
NOT add new search engines (R8: read before you write — this skill IS the
read step).

## Two input branches

### Branch A — UNIT (`<MILESTONE>::U-XX`)

Triggered when input matches `^[A-Z][A-Z0-9-]+::U-[A-Z0-9]+$`. The
brief grounds the build in roadmap reality before any code is written.

| Step | Stage | What |
|------|-------|------|
| 1 | resolve-input | Parse `<MILESTONE>::<U-ID>` → load envelope `mcp-server/data/milestones/<MILESTONE>.json`. Find the unit; extract `title`, `description`, `phase`, `acceptance_criteria`, `dependencies`, `tools`, `deliverables`. |
| 2 | already-shipped-check | Read `MILESTONE_PROGRESS.json`. If this unit's id is in any phase's `shipped[]` array → STOP. Return `verdict: close-out-debt`. The unit was already built; only an envelope flip + close-out audit remain. This is the WIRE-UNWIRED-MS0 lesson (verify before build) — non-negotiable. |
| 3 | peer-claim-check | `node H:/prism/.claude/helpers/slot-task-claim.mjs list` → surface any active claim on this unit. If owned by another slot → STOP. Return `verdict: peer-claimed`, names the slot + chatId. Do not race-build. |
| 4 | prior-art | `prism_session:master_index_query` with unit title + key nouns → top-5 graph hits. `/wiki-query` with same → top-3 wiki. `prism_memory:semantic_search` → top-3 memory. `git log --all --oneline --grep="<U-XX>"` → prior commits. `ls state/shared/specs/<MILESTONE>-*<U-XX>*` → existing spec docs. |
| 5 | sibling-units | List other units in same phase that are still pending. If this unit blocks others, take them in order. |
| 6 | emit-brief | Markdown brief — either inline (default) or to `--out <path>`. See §Output below. |

### Branch B — TOKEN (any free string)

Triggered when input does NOT match the unit pattern. The brief
surfaces existing prior art so the operator stops re-deriving.

| Step | Stage | What |
|------|-------|------|
| 1 | resolve-input | Treat raw input as a search token. |
| 2 | prior-art | `prism_session:master_index_query` → top-10 graph hits ranked by kind (engine > dispatcher > skill > wiki). `/wiki-query` → top-3. `prism_memory:semantic_search` → top-3. |
| 3 | duplicate-guard | If token looks like a proposed-new-asset name (no exact engine match but ≥2 near-matches), call `duplicationGuardEngine.checkBeforeCreating()` semantics → surface every near-match with similarity score. Adopted from the standing duplication-hard-block discipline. |
| 4 | tribal-overlay | Top-3 tribal hits gated on the token's inferred domain (mill/lathe/wedm/cad/cam). |
| 5 | emit-brief | Same output shape — minus the unit-specific sections. |

## Output

```markdown
# Research Brief: <input>
**Mode:** UNIT | TOKEN  ·  **Depth:** quick | standard | deep  ·  **Generated:** <ISO ts>
**Verdict:** build-needed | close-out-debt | peer-claimed | already-deep-known | green-field

## Envelope status (UNIT mode only)
- Milestone: ...
- Phase: ...
- Status: pending | in_progress | shipped-not-closed-out | complete
- Peer claims: [slot/chatId/age]
- Acceptance criteria: [...]
- Dependencies: [...]
- Deliverables: [path/type]

## Already-shipped check (UNIT mode only)
- MILESTONE_PROGRESS shipped[]: <list>
- Git log matches: <commits referencing U-XX>
- **VERDICT: close-out-debt | build-needed**

## Prior art
- Top-N master-index hits (kind/name/wired/path)
- Top-N wiki pages (slug + 1-line abstract)
- Top-N memory entries (filename + tag)
- Top-N spec docs (path + 1-line abstract)
- Duplicate-guard near-matches (token mode only)

## Sibling units (UNIT mode)
- Other pending units in same phase (do them in order if they block)

## Build recommendation
- Files to create / modify (from prior art hits)
- Surfaces to wire (dispatcher action)
- Tests to add (existing __tests__/ file)
- One-paragraph approach drawn from prior art
```

## Depth tuning

| Depth | Master-index top-K | Wiki top-K | Memory top-K | Git scan | Spec scan |
|-------|--------------------|------------|--------------|----------|-----------|
| quick | 3                  | 1          | 1            | no       | no        |
| standard (default) | 5         | 3          | 3            | yes      | yes       |
| deep  | 15                 | 8          | 8            | full milestone | adjacent specs |

## Knobs

- `PRISM_RESEARCH_OUT_DIR` — default output dir if `--out` omitted (defaults to `state/shared/research-briefs/`).
- `PRISM_RESEARCH_DEPTH` — override default `standard`.
- `PRISM_RESEARCH_DISABLE_WIKI=1` — skip wiki recall (offline mode → emits a `wiki:disabled` provenance tag).
- `PRISM_RESEARCH_DISABLE_MEMORY=1` — skip memory recall.

## Karpathy discipline pins

- **R8 — read before you write.** This skill IS the read step. Do not skip.
- **R10 — checkpoint.** The brief's `verdict:` field is the checkpoint — restate before continuing.
- **R12 — fail loud.** If wiki returns 0 hits, the brief says `wiki: no-hits`. If git-log returns 0 matches, the brief says `git: no-prior-commits`. Never invent.
- **WIRE-UNWIRED-MS0 / silent close-out debt.** The already-shipped check is mandatory in UNIT mode. ~96% of "unwired" engines are actually shipped + un-closed.
- **Duplication-guard.** TOKEN mode surfaces near-matches as a courtesy mirror of `duplicationGuardEngine.mustCheckBeforeCreating()` — but the THROW-on-dup discipline at engine-creation time is still enforced by the original guard.

## Pipeline integration

- `/session-cycle` (U-CK17) → calls `/research` between *pick* and *build*.
- `/pipeline research <args>` (U-CK25) → routes here.
- `pick-prefresh-inject.mjs` UserPromptSubmit hook → links to this surface on `/pick-unit`.

## Surfaces

- `.claude/commands/research.md` — operator-facing skill spec (gitignored on disk; this wiki entry is the committed mirror per U-CK05 "Generated-mirror generators" pattern)
- `knowledge/wiki/os/pipelines/research.md` — this file (pipeline registry entry)
- `state/shared/research-briefs/<unit-or-token>-<ts>.md` — emitted brief (when `--out` supplied)

## Related

- [[loop]] — sister pipeline (drives the autonomous /loop that calls research per iter)
- [[knowledge-injection]] — sister pipeline (research findings feed knowledge ingest)
- [[goal-complete]] — sister pipeline (Stop-hook close-out gate that research's `close-out-debt` verdict surfaces against)
- [[pick]] — kernel syscall (U-CK03) that hands off to research
- [[session-cycle]] — composed-of caller (U-CK17)

## See also

- `.claude/schemas/pipeline-frontmatter.schema.json` — schema this entry conforms to
- `scripts/validate-pipeline-registry.mjs` — validator
- `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` U-CK18 — the unit envelope
- `state/shared/MILESTONE_PROGRESS.json` — already-shipped check source
- `state/shared/slot-task-claims.json` — peer-claim check source
