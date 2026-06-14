---
title: "infra-agi-router-ms2-p0-u01-2026-05-20"
name: infra-agi-router-ms2-p0-u01-2026-05-20
kind: reference
status: promoted
category: reference
domain: knowledge-vault
promoted_from: knowledge/memories/reference/reference_infra_agi_router_ms2_p0_u01_2026_05_20.md
promoted_at: 2026-06-06T04:55:53.524Z
source_refs: 7
---

# INFRA-AGI-ROUTER-MS2 / P0-U01 — DomainAGI contract

**Verified:** 2026-05-20 (commit `76073333d3`, 40/40 vitest PASS, 4-reviewer per-file
gate PASS, 3-of-3 Stop gate PASS × 3).

## What shipped

A single Zod contract — `DomainAGIIntent` + `DomainAGIResult` at schema version
`1.0.0` — that the `ProcessIntelligenceRouterEngine` dispatches across the three
domain AGIs (Mill / Lathe / WireEDM). Single source of truth for the unified
`orchestrate(intent)` surface.

| File | Lines |
|------|-------|
| `mcp-server/src/schemas/domainAGIContract.ts` | ~360 |
| `mcp-server/src/__tests__/domainAGIContract.test.ts` | ~640 |

## Why this is the contract, not just "a schema"

The intent + result shapes are **load-bearing**: U02 (mill adapter), U03 (lathe
adapter), U04 (wedm adapter), and U05 (the router engine itself) all consume
this surface. Drift in this file silently breaks every domain at once. Pinned
to `DOMAIN_AGI_CONTRACT_VERSION = "1.0.0"` via `z.literal()` so a version bump
forces a deliberate migration.

## Load-bearing invariants

1. **Action belongs to named domain.** `superRefine` on the intent narrows the
   z.union of 25 action verbs to the domain-specific subset (10/9/6). Defensive
   `if (!validator) return;` guard keeps the dispatch refactor-safe.
2. **`success=false` ⇒ `error` populated.** Asymmetric `superRefine` on the
   result. The inverse (success=true ⇒ error absent) is NOT enforced — an
   over-defensive caller MAY include `error: undefined`. The inverse test
   pins the absent-case so a future predicate flip goes red.
3. **`consensusRequired` defaults `false`.** Was originally required without
   default (P0 fixed); the JSDoc example `{... constraints: {} }` would have
   been invalid otherwise.
4. **Schema version is a `z.literal("1.0.0")`.** Not a regex, not a min-version.
   A bump-without-migration would fail every prior consumer immediately.
5. **OutcomeEvent re-use is canonical.** `outcomes: z.array(OutcomeEventSchema)`
   imports the existing schema (which is itself versioned `1.0.0 ∪ 1.1.0`).
   Re-declaring the OutcomeEvent shape was an early temptation; doing so would
   have forked the canonical OutcomeBus event shape silently.

## Two silent-pass risks that are pinned

The per-file scrutiny arm B found two test-side silent-pass risks that would
have allowed the schema to break without test failures:

1. **Domain-mismatch test was matching `pathString.match(/action/)`** — would
   still pass on the base z.union's unrelated error noise after deleting the
   superRefine. Now pins
   `issues.find(i => i.path.join('.')==='action' && i.code==='custom')` AND
   asserts both `/not valid for domain 'mill'/` AND `/Valid actions:/` on the
   message.
2. **Inverse `success=true, error=undefined` test was missing entirely** —
   flipping the result superRefine predicate from `(!success && !error)` to
   `(success && !error)` would have silently widened the invariant. The new
   test exercises the absent-case and asserts `parsed.data.error === undefined`.

## CrossProcessAIBridge co-existence

`CrossProcessAIBridge.AIOrchestrateRequest` already exists with opaque
per-domain bodies (`Record<string, unknown>` for `mill_request` / `lathe_request`
/ `wedm_request`). This new contract STRUCTURES those bodies. The two contracts
**co-exist** through U02-U04; U05 explicitly deprecates or wraps the bridge.
The schema JSDoc carries an `@see CrossProcessAIBridge` pointer so future
consumers know the relationship.

## Deferred P1-P2s (file these as follow-up units)

| ID | What | Defer to |
|----|------|----------|
| 1 | z.union noisy-error UX for unknown action | U02 adapter cleanup |
| 2 | `MachineRefSchema.controller` should harvest a controller-catalog enum | U02-U04 + registry |
| 3 | CrossProcessAIBridge deprecation | U05 |
| 4 | `DecisionSchema.dependency: z.enum(['serial','parallel'])` for joint-prob rollup | U05 (router-internal) |
| 5 | DoS hardening — `.max()` caps on free-text + arrays (`notes`, `controller`, `material`, `error.code/message/stage`, `warnings[]`, `decisions[]`) | U02-U04 (internal-router boundary, not a U01 blocker) |
| 6 | `error.code` free-form `z.string()` (should be enum so U05 router can switch-on) | `U-AGI-ROUTER-ERROR-CODE-ENUM` MS3 |
| 7 | Action-enum dispatcher anti-drift test | U02-U04 adapter ship |

## How to add a new action (procedure)

1. Decide WHICH domain owns the verb (mill / lathe / wedm). If two domains both
   accept it, `domainForAction()` will return `null` for that verb — explicit
   `domain` field is the only way the contract resolves the ambiguity.
2. Add the verb to the relevant `z.enum(...)` literal in `domainAGIContract.ts`.
3. Update `actionsForDomain` count test in `domainAGIContract.test.ts` (currently
   pins 10 / 9 / 6).
4. Add a valid-intent test case if the verb has new field requirements;
   otherwise the existing `baseIntent` skeleton covers it.
5. Update the U02 / U03 / U04 adapter so it can synthesize a `DomainAGIResult`
   for the new verb.

## Pointers

- Commit: `76073333d3`
- Wiki: [[domain-agi-contract]]
- Handoff: `state/shared/handoffs/HANDOFF-claude-0ea589c9-charlie-infra-agi-router-ms2.md`
- Milestone: `mcp-server/data/milestones/INFRA-AGI-ROUTER-MS2.json`
- Inbox: `state/shared/RECENT-SHIPMENTS-2026-05-20.md` (CLAUDE.md promotion pending — golf-slot batch)
- Sister: `mcp-server/src/schemas/outcomeEventSchema.ts` (anti-drift target)
- Sister: `mcp-server/src/engines/CrossProcessAIBridge.ts` (the surface this supersedes)

## Sibling memories

- [[reference_3tier_ai_xproc_actual_2026_05_19]] — XPROC tier system is the actual master-orchestration surface today; this contract is the layer above it
- [[feedback_commit_prefix_main_on_shared_tree]] — used `[MAIN]` prefix per shared-tree rule
- [[feedback_parallel_scrutiny_per_file]] — per-file 2-reviewer pattern that caught the 2 P0s + 3 P1s

## Source

Promoted from memory [[reference_infra_agi_router_ms2_p0_u01_2026_05_20]] (referenced 7x across the vault). The memory remains the editable source of truth.
