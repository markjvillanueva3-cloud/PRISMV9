---
title: Duplication-Guard Discipline — the create-time anti-dup gate
date: 2026-05-29
agent: claude-2c3adfc7
slot: tango
milestone: PER-SLOT-GALAXY-BUILDOUT
tags: [discovery, duplication, dedup, guard, create-time, anti-regression]
boost_keywords: [duplication guard, mustCheckBeforeCreating, mustNotReExtract, dedup, dup_guard_check, asset registry, extraction log]
links:
  - "[[architecture/master-index-surface]]"
  - "[[lessons/orphan-rescue-class]]"
  - "[[feedback_tango_dedup_audit_tooling]]"
  - "[[reference_tango_discovery_engine_map_2026_05_29]]"
---

# Duplication-Guard Discipline

The single highest-leverage hygiene in PRISM: prevent a duplicate from ever being created. Every prevented re-creation saves a milestone of refactor pain. Owned by slot:tango (discovery galaxy).

## The gate

`mcp-server/src/engines/DuplicationGuardEngine.ts` exposes two **throwing** methods (warn-only is a bug):

```typescript
import { duplicationGuardEngine } from "mcp-server/src/engines/DuplicationGuardEngine.js";
const check = duplicationGuardEngine.checkBeforeCreating({
  assetType: "engine", proposedName: "MyEngine",
  keywords: ["cutting","force"], description: "…"
});
if (!check.shouldProceed) { /* USE existing: check.matches[0] */ }
```

- `mustCheckBeforeCreating()` — THROWS on a name/keyword collision with an existing asset.
- `mustNotReExtract()` — THROWS on re-extraction of a vendor source already in `extraction-log.json`.

## Sources of truth

- `mcp-server/data/state/cross-session-asset-registry.json` — fleet-wide creation log.
- `mcp-server/data/state/extraction-log.json` — already-extracted vendor sources (Mastercam, hyperMILL, Okuma, Fanuc, Haas, Titans…).
- `mcp-server/data/docs/ENGINE_DIGEST.md` — 1-line-per-engine; check BEFORE creating.

## The enforcement stack

| Layer | Hook | Tier |
|-------|------|------|
| Exact-dup Write block | `duplication-hard-block.mjs` | T0 HARD BLOCK |
| Pre-Write similar-asset surface | `dedup-auto-invoke.mjs` | T1 |
| Master-index pre-create search | `master-index-search-gate.mjs` | T1 |
| Create-intent → self-awareness | `build-create-detector.mjs` | T1 |

Dispatcher surface (when MCP up): `prism_guard:dup_guard_check` / `dup_guard_summary`; `prism_dev:dedup_might_contain` / `dedup_is_definitely_new` (Bloom negative-dedup). MCP-down fallback: `node .claude/helpers/duplication-guard.mjs`.

## Discipline extends to tooling

The rule is not just for engines. Before writing a new audit/discovery **script**, dedup the tooling — `Glob scripts/audit-*.mjs` + `node scripts/dev-tool-conflict-detector.mjs`. N tools measuring one metric slightly differently is its own drift class. See [[feedback_tango_dedup_audit_tooling]].

## Anti-patterns (tango refuses)

- Warning instead of throwing on a duplicate.
- Bypassing `extraction-log.json` (re-extracting a paid-for vendor source = thousands of dup engines).
- Creating a new audit tool when an existing one covers the case.
