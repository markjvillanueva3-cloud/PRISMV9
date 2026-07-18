---
name: reference_hotel_false_wire_guard_2026_06_09
description: "Hotel false-wire regression guard (17 allowlisted prism_business actions round-tripped through the REAL dispatcher) + the scrutiny lesson - a placeholder-detector regex MUST match the REAL production string, not a fabricated one (the meta-test was a false proof until arm-B caught it)."
type: reference
slot: hotel
galaxy: business
source: prism-memory
synced: 2026-06-27T20:30:46.610Z
aliases: reference_hotel_false_wire_guard_2026_06_09
---


# Hotel false-wire regression guard + the false-proof lesson (2026-06-09, slot:hotel)

**Commits:** `6b9ed8520d` (guard) + scrutiny-fix follow-up on `cad-fusion-live-ms0`.
**File:** `mcp-server/src/__tests__/businessDispatcher.false-wire-regression-guard.test.ts` (20/20, 3-of-3 PASS).

## What it guards
The BUSINESS-CLEANUP arc fixed **341 false-wires** (prism_business actions in the enum but routed to a
placeholder/echo instead of a real engine). ZERO standing test guarded that fix. This guard round-trips
all 17 actions in `BUSINESS_DISPATCH_ALLOWLIST` through the **REAL** dispatcher (`registerBusinessDispatcher`
-> prism_business switch -> lazy engine import -> result) and asserts each returns real engine output.

**Why a new file (not businessDispatchRoute.test.ts):** the existing route test MOCKS `callTool` -> it proves
the deny-by-default security GATE works but CANNOT see real engine output, so it can't catch a false-wire
BEHIND the gate. Complementary: route test = gate; this = the wires behind it. (Harness cloned from
`businessDispatcher.payroll-filing-wire.test.ts` -- the createServer/call real-dispatcher pattern.)

## THE LESSON (scrutiny arm-B P0 -- the reusable one)
My first version's `isPlaceholder` detector regex was `unknown\s+(?:action|tool|command)`. The dispatcher's
REAL default-case envelope is `{ error: "Unknown business action: ${action}" }` (`businessDispatcher.ts`
top-level `default:`) -- **"business" sits between "unknown" and "action", so the regex did NOT match.** A
deleted allowlisted `case` (the #1 false-wire regression) would fall to `default` and the guard would stay
**GREEN**. WORSE: my R9 "red-on-restub" meta-test fed the detector a *fabricated* lowercase `"unknown action:
vendor_rank"` (which DID match) -- so the proof passed against a string production never emits. **A detector
meta-test that asserts a fabricated string is a FALSE PROOF.** Fix: broadened regex to `unknown\s+(?:\w+\s+)
{0,2}(?:action|tool|command)` + `not[\s_-]?callable` (the live `?? {note:"method not callable"}` idiom at
`businessDispatcher.ts:5813/5819/5825`), and rewrote the meta-test to assert the REAL dispatcher strings.

**Generalizable:** when a guard/detector keys on a production string, the test MUST exercise the LITERAL
string the code emits (grep it), never a hand-typed approximation. Pairs with [[feedback_verify_actual_contract_not_proxy]].

## Gotchas verified
- `marketplace_lead_get` -> `getLead(supplierId)` (leads keyed by supplierId, NOT lead id). My probe was wrong
  (`{id}`), not a bug. Seeded one lead via `MarketplaceSeedingEngine.seedFromHints` so the guard exercises the
  data path (a re-stub returning null then fails). `__resetForTests()` in afterAll; safe under vitest isolate:true.
- Real validation errors (`{success:false, error}`) and empty query results (`[]`) are accepted as REAL wires
  (engine ran). Only null/undefined, stub markers, param-echo, and empty success flags are flagged.

Related: [[reference_hotel_payroll_filing_wire_2026_06_09]] (R15 wire) - [[feedback_wire_test_validate_all_galaxies]] (R15) - [[feedback_verify_actual_contract_not_proxy]].
