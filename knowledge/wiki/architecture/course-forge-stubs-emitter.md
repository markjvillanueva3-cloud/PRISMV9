---
title: COURSE-FORGE-STUBS emitter — Lane C operator-action layer
slug: course-forge-stubs-emitter
kind: architecture
status: shipped
date: 2026-05-17
milestone: KNOWLEDGE-CONVERSION-MS0
unit: U-COURSE-FORGE-PROPOSALS + U-COURSE-FORGE-STUBS-EMITTER + U-COURSE-FORGE-STUBS-EMITTER-TESTS
author: claude-41db1b82 (slot india)
related: [[knowledge-conversion-ms0]]
---

# COURSE-FORGE-STUBS Emitter

The Lane C **operator-action** layer of KNOWLEDGE-CONVERSION-MS0. Bridges the gap between an advisory routing ledger (69 FORGE-QUEUE items the router can't auto-build) and the operator's `/forge-triple` ceremony (which needs a concrete proposal per asset).

## Problem

After KNOWLEDGE-CONVERSION-MS0/U-KC-D1 shipped, `COURSE-DATA-ROUTING-LEDGER.json` had 69 FORGE-QUEUE entries — each a `{kind, name, courseId, mfgRelevance, domains}` tuple. To `/forge-triple` any of them, an operator had to (a) pick which, (b) propose a PRISM file path, (c) grep for existing similar engines/algorithms, (d) decide on a dispatcher action, (e) check whether the name was a first-party stack collision. Sixty-nine times. The router did the routing but not the prep.

## Solution — two surfaces

### 1. Hand-curated `state/shared/specs/COURSE-FORGE-PROPOSALS.md` (commit `dea7274d23`)

P1-P10 stubs for the highest-mfg-relevance (0.80) FORGE-QUEUE items. Each entry carries:

- **proposed_path** — concrete PRISM landing (`mcp-server/src/algorithms/OperatorSplittingMethod.ts` etc.)
- **dispatcher_action** — `<dispatcher>:<action>` to add
- **dedup_preflight** — grep findings against `mcp-server/src/**` (CLEAR / REVIEW / DUP-RISK)
- **physics_gate** — `required` for formulas (constants ALWAYS in `src/physics/constants.ts`, never inline)
- **deliverables** — the expected `/forge-triple` artifact set
- **action** — explicit reject (P8 cam-path-opt, P9 solidworks duplicate first-party stack) or consolidation (P4+P5 lean → one engine) or proceed

### 2. Bulk emitter `scripts/course-data-router.mjs --emit forge-stubs` (commit `5d5c363f0e`)

CLI extension that auto-generates `state/shared/specs/COURSE-FORGE-STUBS.md` for the long tail. Same per-stub shape as P1-P10 but auto-derived:

```bash
node scripts/course-data-router.mjs --emit forge-stubs --min-relevance 0.6
# → 62 stubs surfaced
node scripts/course-data-router.mjs --emit forge-stubs --min-relevance 0.8
# → top-tier only
```

**Kind-aware path proposal:**

| kind | proposed_path |
|------|---------------|
| algorithm | `mcp-server/src/algorithms/<PascalCase>.ts` |
| engine | `mcp-server/src/engines/<PascalCase>Engine.ts` |
| formula | `mcp-server/src/physics/constants.ts + prism_calc:<action>` |

**REJECT auto-flag** for tier-1 CAM bridges (`mastercam`, `hypermill`, `esprit`, `fusion360`, `inventor`, `solidworks`, `cam-path-optimization`, `toolpath-optimization`) — these are first-party PRISM stack; course-derived re-build would be regression. Stub still emitted with `action: REJECT (reclassify TRIBAL-SHIPPED)` so the operator sees and ratifies the decision.

**Dedup-preflight** — name-similarity grep against the LIVE `mcp-server/src/algorithms/` + `mcp-server/src/engines/` inventory. If the PascalCase of the candidate name (or its 1-char-shortened prefix) hits any inventory file, surface as `REVIEW`. Pure-novel names → `CLEAR`.

### 3. Test suite `scripts/course-data-router.cli.test.mjs` (commit `6ae5399608`)

13-case `node:test` (scripts/ infra) hermetic CLI suite spawning the live binary via `spawnSync(process.execPath, ...)` with a temp-dir candidate fixture. Coverage:

- happy path: file emission, JSON mode, dry-run
- filter behavior: `--min-relevance 0.8` correctly filters 0.5 + 0.7 items
- kind-aware: PascalCase paths for each of the 3 path templates
- REJECT auto-flag: solidworks → REJECT + 'first-party PRISM stack' verbiage
- physics_gate=required for formula kind
- adversarial: unknown `--emit` value, out-of-range `--min-relevance`, non-numeric
- regression guard: default mode (no `--emit`) still produces ledger JSON+MD

**Schema-read-first lesson captured:** initial fixture used the OUTPUT decisions[] shape (post-routed) instead of the INPUT candidateAssets[] shape. 9/13 tests failed with a single common error (`candidate.candidateAssets must be array` from the router lib's R12 validator). Diagnosed via spawnSync stderr capture in a 10-line debug script. Fix: rewrote fixture using the actual input schema (`schemaVersion`, `nodeId`, `candidateAssets[]`, `prismDomains[]`, `mfgRelevance` etc.).

## Hard gates that DO NOT auto-clear

- `duplicationGuardEngine.mustCheckBeforeCreating()` THROWS on duplicate at /forge time — every entry below MUST pass that check.
- Formula stubs: `physics-reviewer` agent PASS required; constants land in `src/physics/constants.ts` only (NEVER inline).
- Tier-1 CAM bridge names auto-REJECT (whitelisted in `REJECTED_NAMES`).
- Course-derived intent is the IDEA source. PRISM convention + JM Die data is the VALIDATION source.

## Files

| Surface | Purpose |
|---------|---------|
| `state/shared/specs/COURSE-FORGE-PROPOSALS.md` | hand-curated P1-P10 with full deliverable specs |
| `state/shared/specs/COURSE-FORGE-PROPOSALS.html` | HTML twin (auto-rendered by `scripts/md-to-html.mjs`) |
| `state/shared/specs/COURSE-FORGE-STUBS.md` | auto-emitted bulk bundle (long tail) |
| `state/shared/specs/COURSE-FORGE-STUBS.html` | HTML twin |
| `scripts/course-data-router.mjs` | CLI runner, now with `--emit forge-stubs` mode |
| `scripts/course-data-router.cli.test.mjs` | 13-case CLI test suite |
| `scripts/lib/course-data-router-lib.mjs` | pure-core routing lib (unchanged this milestone) |

## See also

- [[knowledge-conversion-ms0]] — parent milestone
- `state/shared/specs/COURSE-DATA-ROUTING-PIPELINE.md` — 3-lane policy doctrine
- `mcp-server/src/engines/DuplicationGuardEngine.ts` — pre-create gate
- `mcp-server/src/physics/constants.ts` — canonical formula-constant surface
- `.claude/commands/forge-triple.md` — the operator-facing forge skill
