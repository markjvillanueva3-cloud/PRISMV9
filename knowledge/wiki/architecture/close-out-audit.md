---
name: close-out-audit
type: architecture
layer: automation
created: 2026-05-13
boost_keywords: [close out, close-out audit, envelope drift, silent close-out debt, shipped but pending, stale milestone]
description: Cross-envelope auditor that detects silent close-out debt — units whose deliverable artifacts exist on disk but whose envelope status is still pending. Advisory only.
links:
  - script: scripts/audit-close-out-candidates.mjs
  - skill: .claude/commands/close-out-audit.md
  - hook: .claude/hooks/close-out-audit-suggest.mjs
  - memory: feedback_auto_close_out
  - doctrine: CLAUDE.md §CLOSE-OUT AUTOMATION
  - reports: state/shared/CLOSE-OUT-CANDIDATES.json, state/shared/CLOSE-OUT-CANDIDATES.md
  - companion: feedback_roadmap_close_out, feedback_always_close_out, reference_master_index_surface, reference_build_state_surface
---

# Close-Out Audit System

## Problem

PRISM has 670+ milestone envelopes under `mcp-server/data/milestones/`. The 2026-05-12 history-strip left 668 of them untracked + reset most unit statuses to `pending` even though the deliverable artifacts (engines, hooks, skills, dispatchers) ship in the repo. Result: `MILESTONE_PROGRESS.json` reports false "in progress" + `BUILD_STATE.json` falsely classifies shipped units as pending + `roadmap-index.json` drifts vs the envelopes.

This is **silent close-out debt** — work that's done but the bookkeeping doesn't know it.

## Solution

Single-pass scanner that reads every envelope, walks each pending unit's `deliverables[]`, and checks filesystem presence. Outputs a triaged candidate list with confidence scoring. Operator (or another chat) reviews each candidate, verifies the artifact really satisfies the spec, and runs the standard close-out flow.

## Architecture

```
┌─────────────────────────────────┐
│ mcp-server/data/milestones/*    │  670 envelopes
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ audit-close-out-candidates.mjs  │  scans all envelopes
│ — extractPathTokens (4 regexes) │  parses deliverable strings
│ — resolveToken (recursive walk) │  finds files across 25+ search roots
│ — hasResidualAbstract            │  flags "file+abstract" hybrids
│ — scoreUnit (confidence calc)   │  resolved/hybrid/abstract/missing
└──────────────┬──────────────────┘
               ▼
┌──────────────────────────────────────┐
│ state/shared/CLOSE-OUT-CANDIDATES.*  │  ADVISORY output
│ — JSON: schemaVersion 1.0.0          │  carries advisoryOnly: true
│ — MD: human-readable triage table    │  + caveat string
└──────────────┬───────────────────────┘
               ▼
       ┌───────┴────────┐
       ▼                ▼
 /close-out-audit  Stop hook
 skill (manual)    advisory
       │                │
       └───────┬────────┘
               ▼
        Human verifies
               ▼
   Standard close-out flow:
   envelope edit → regen → commit → 3-of-3
```

## Confidence model

For each pending unit, every entry in `deliverables[]` is classified:

| Classification | Definition | Credit |
|----------------|------------|--------|
| **resolved** | Path token extracted + resolved + no abstract residual | +1.0 |
| **hybrid** | Path resolves BUT residual string carries abstract intent (e.g. `"foo.ts AND tests"`) | +0.5 |
| **abstract** | No path token; deliverable is conceptual (e.g. `"Integration"`) | excluded from denominator |
| **missing** | Path token extracted but file doesn't exist | +0 |

`confidence = resolvedCredit / verifiable` where `verifiable = total - abstractCount`.

If `verifiable === 0` (all-abstract unit), confidence is forced to 0 (unit is silently dropped, not flagged with NaN).

Default surface threshold: **0.75** — chosen so a 1-of-2 verifiable unit (0.5) doesn't surface but a 3-of-4 (0.75) does. Conservative by intent.

## Path token extraction

Four regexes run with `g` flag against each deliverable string:

| Regex | Matches | Example |
|-------|---------|---------|
| absRe | Absolute paths | `H:/.claude/commands/sessions.md`, `/etc/foo.conf` |
| relRe | PRISM-root-relative | `src/engines/Foo.ts`, `scripts/build.mjs` |
| bareRe | PascalCase bare filename | `CrossSessionOrchestratorEngine.ts` |
| hookRe | lowercase bare filename | `cross-session-orchestrator.mjs` |

Tokens are deduped (case-insensitive) so the same path matched by two regexes doesn't double-count.

## Resolution

For each token:
- **Absolute**: `fs.existsSync` direct
- **Repo-relative**: `path.join(REPO, token)` + `existsSync`
- **Bare filename**: walk each of 25+ `SEARCH_ROOTS` (with bounded recursion depth 2, `node_modules/.git/.cache*` excluded). Cached per-root for single-run efficiency. Returns first match in SEARCH_ROOTS order.

## Determinism

The audit is designed for diff-friendly commits:
- `readdirSync` results are `.sort()`-ed → stable envelope order
- `--frozen-time` / `PRISM_AUDIT_FROZEN_TIME` env var → stable timestamp
- Token dedup, deliverable iteration in JSON-array order → stable evidence order
- Search-root cached walks → deterministic first-match

Two identical runs (same git tree + same frozen-time) produce byte-identical JSON output.

## Safety properties

| Property | Guarantee |
|----------|-----------|
| **Read-only** | Only writes `state/shared/CLOSE-OUT-CANDIDATES.{json,md}`. Never touches envelopes. |
| **Advisory** | JSON output carries `advisoryOnly: true` + `mustHumanVerify: true` + `caveat` |
| **Exit 0** | Wrapped in try/catch — always exits 0 even on unhandled exception (errors go to stderr) |
| **Under-detect bias** | Default 0.75 threshold + hybrid down-credit + abstract exclusion → preferring false-negatives over false-positives |
| **Concurrent-safe** | All envelope reads in try/catch; partial JSON crashes are caught and milestone is skipped (recorded as `parseError`) |
| **Cross-platform** | Path normalization throughout; Windows `H:/` paths normalize to forward slashes |

## Usage paths

| Surface | Invocation |
|---------|-----------|
| Direct CLI | `node H:/prism/scripts/audit-close-out-candidates.mjs` |
| Skill | `/close-out-audit` (description triggers on close-out keywords) |
| Hook | `.claude/hooks/close-out-audit-suggest.mjs` (UserPromptSubmit T2, advisory inject) |
| Memory recall | `feedback_auto_close_out.md` (matched by relevant-edit hook) |
| CLAUDE.md | `§CLOSE-OUT AUTOMATION` doctrine section |
| Reports | `state/shared/CLOSE-OUT-CANDIDATES.{json,md}` |

## When this fires automatically

1. **UserPromptSubmit** keywords: `close out`, `envelope drift`, `stale milestones`, `shipped but pending`, `what's done`, `audit close-outs`
2. **/checkin** — drift count > 0 surfaces a one-line nudge
3. **/pick-unit** — if user is about to start a new unit, audit suggests reviewing siblings in same milestone first
4. **/close-out** — when explicitly closing a milestone, always run audit on remaining units

## Cron (optional)

Can be wired as a nightly cron via the existing PRISM scheduled-tasks system:
```bash
node H:/prism/scripts/audit-close-out-candidates.mjs --frozen-time "$(date -u +%Y-%m-%dT00:00:00Z)"
```
Run once per day → updates the candidates report → operator triages each morning. Not wired by default (manual invocation preserves the advisory boundary).

## Origin

OBSIDIAN-PRISM-OS-MS0 follow-up + user directive 2026-05-13. Slot BRAVO claude-de9949da. Demonstrated by closing U-COORD03 + U-COORD10 in `COORD-MS0` (companion to U-COORD07 from same session).

Audit script reviewed via per-file scrutiny (P0 + P1 blockers fixed):
- Default min-confidence raised 0.5 → 0.75
- Hybrid deliverable detection added (file + abstract residual → half-credit)
- `readdirSync` sorted for determinism
- `--frozen-time` flag added
- `advisoryOnly` + `caveat` added to JSON output
- Status alias expansion (`merged|done|landed|closed`)
- Bounded recursive search (depth 2) for bare filenames
- Cross-platform path normalization fixed
- `try/catch` around `main()` for exit-0 guarantee

## Related wiki entries

- [[reference_master_index_surface]] — `/master-index` for cross-system search before audit
- [[reference_build_state_surface]] — `BUILD_STATE.md` for built-vs-pending awareness
- [[reference_awareness_stack]] — full awareness surface (master-index + utilization + snapshot + orphan-inventory)
- [[feedback_roadmap_close_out]] — the 4-surface close-out protocol
- [[feedback_always_close_out]] — finish every facet before reporting done
