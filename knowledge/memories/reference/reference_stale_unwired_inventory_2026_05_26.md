---
name: stale-unwired-inventory-2026-05-26
description: "state/shared/.wire-unwired-loop-*.json files are stale — fleet has been wiring engines without regenerating the inventory. R8 trap. Always re-run audit-unwired-engines.mjs OR verify against live dispatcher before claiming \"unwired\"."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.211Z
aliases: reference_stale_unwired_inventory_2026_05_26
---


# Stale .wire-unwired-loop-*.json inventory (2026-05-26, slot:victor)

Discovered during WIRE-SAFETY-GATES-MS0/U-VICTOR-SAFETY-GATES: every one of the 13 "unwired" engines in `state/shared/.wire-unwired-loop-safety.json` was already wired into `safetyDispatcher.ts` (lines 888-939). The inventory file is a **stale snapshot** from before recent fleet-wide wiring.

## R8 trap

If a chat picks an "unwired" engine off the inventory list and starts building a new wire, it will:

1. Read the engine source
2. Find a clean export (singleton ready to wire)
3. Edit the dispatcher to add a case + import
4. Discover at commit time the engine ALREADY has a dispatch branch
5. Either silently double-wire (corrupts the dispatcher) OR rage-commit conflicting code

This is exactly the failure mode the **R8 — read before you write** rule exists to prevent. The inventory file masquerades as canonical, so the natural workflow ("read the file → pick a target → wire it") skips the dispatcher-side verification step.

## The actual gap is different

The 13 engines have **half-wire** state:
- ✓ Dispatch handlers exist (safetyDispatcher.ts lines 888-939)
- ✓ Action sets defined (lines 220-232)
- ✓ ALL_ACTIONS spread includes them (lines 502-514)
- ✗ **NO Zod schemas in ACTION_SAFETY_SCHEMAS** (the schemas file)

This violates `H:/.claude/rules/schemas.md` "schemas must match dispatcher z.enum exactly" — schema-less actions silently bypass validation when `validateActionParams` middleware can't find them in the map. The half-wire was the real work to do, not new wiring.

## Standing rule for fleet

Before treating ANY `.wire-unwired-loop-*.json` as authoritative:

1. `rtk grep -l "<EngineName>" mcp-server/src/tools/dispatchers/*.ts` — dispatch-handler check
2. `rtk grep -l "<engineNameSingleton>" mcp-server/src/schemas/*.ts` — schema-side check
3. If found in BOTH: engine is full-wired; skip
4. If found in dispatcher but NOT schemas: **half-wired** — add schema
5. If found in NEITHER: truly unwired — full new wire OK

Regenerate inventory after every wave: `node scripts/audit-unwired-engines.mjs` (rebuilds `.wire-unwired-loop-*.json` from live state). Without a fresh audit, the .json is decoration.

## Commit ddb… (this session)

`[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRE-SAFETY-GATES-MS0]/U-VICTOR-SAFETY-GATES` — closed all 13 half-wires by adding the schemas. 5/5 anti-regression tests pass (`scripts/wire-safety-gates-verify.test.mjs`). The anti-regression suite verifies the action_set ↔ schema 1:1 invariant so future drift is caught at PR time.

## Related

- [[feedback_always_capture_lessons]] — discipline that produced this memory
- [[feedback_r5_thru_r12_doctrine]] — R8 specifically (read-before-write)
- [[wire-unwired-ms0]] — original wiring milestone (predecessor)
- `scripts/audit-unwired-engines.mjs` — the audit tool that should be re-run before each wave
- `H:/.claude/rules/schemas.md` — "schemas must match dispatcher z.enum exactly"
