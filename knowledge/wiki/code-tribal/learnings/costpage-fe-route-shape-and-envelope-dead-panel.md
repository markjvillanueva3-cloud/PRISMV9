---
title: CostEstimatorPage dead-panel -- FE↔route shape mismatch + {result} envelope (two compounding bugs)
kind: learning
domain: quoting
severity: P1-dead-panel
unit: QUOTING/U-COSTPAGE-SHAPE
slot: charlie
date: 2026-06-24
commit: 940599eebe + 1398a57b85
tags: [frontend, dead-panel, envelope, shape-adapter, unwrap, redaction, anon, R8, R12, R16]
---

# CostEstimatorPage dead-panel: FE↔route shape mismatch + the {result} envelope

`web/src/pages/CostEstimatorPage.tsx` was **dead for every caller** -- two compounding bugs, each
sufficient on its own to crash the page. Surfaced as a "P2, deferred, degrades gracefully" note from a
prior scrutiny arm; on actually reading the chain end-to-end (R8) it was a hard crash, not graceful.

## Bug 1 -- FE↔route SHAPE mismatch

`prism_intelligence:process_cost` (`IntelligenceEngine.processCost`, IntelligenceEngine.ts:1104-1119)
emits `total_cost_per_part`, `machine_cost`, `tool_cost_per_part`, `setup_cost_per_part`, a per-OPERATION
`breakdown` ARRAY, `batch_size`, `inputs.machine_rate_per_hour`. But the page derefs
`result.per_part_cost.toFixed(2)`, `result.total_cost`, `Object.entries(result.breakdown)`. The shapes
NEVER matched -> `result.per_part_cost` is `undefined` -> `undefined.toFixed()` THROWS. The breakdown is
also an array where the page expects a category map.

## Bug 2 -- the {result} ENVELOPE mismatch

The route returns `res.json({ result: safe })` (wrapped), but the FE `post<T>` helper did
`return (await res.json()) as T` -- the WHOLE body, **no `.result` unwrap**. So even with the shape
fixed, the page would receive `{ result: {...} }` and read `res.per_part_cost` = `undefined`. This is the
SAME `{result}`-envelope dead-panel class as [[quoting-dead-panel-unwrap-fix]] (2026-06-23) -- but
**INVERTED**: there the FE read `.result` on a bare body; here the route WRAPS and the client doesn't
unwrap. A galaxy hits this class from BOTH directions; always confirm the wire shape end-to-end.

## The fix (R8 reuse + R16 close-the-gap; commits 940599eebe + 1398a57b85)

1. **Route shape adapter** (`routes/cost.ts`): pure `adaptCostEstimate(result)` maps process_cost -> the
   FE `CostEstimate`: `per_part_cost <- total_cost_per_part`, `total_cost <- total_cost_per_part *
   batch_size`, `breakdown <- {machine, tooling, setup}` -- only the THREE components the engine actually
   computes. The engine produces NO material/labor/overhead split, so the adapter does NOT fabricate those
   keys (R12 -- never invent numbers the engine didn't compute).
2. **Compose order** -- the `/estimate` handler runs **redact-if-anon FIRST, adapt SECOND**. For an anon
   caller `redactInternalMarginFields` strips `total_cost_per_part` etc., so `adaptCostEstimate` sees no
   per-part number (`typeof perPart !== "number"`) and passes through -- it never re-fabricates a cost key
   from absent data. Secure empty, no leak. Authed -> no redaction -> full FE shape. (The envelope class
   here is the DIRECT redactor, not redactThroughEnvelope: prism_intelligence returns `content[]` which
   `callTool` (index.ts:887) JSON-parses to a real object -- see
   [[cost-route-anon-cost-basis-redaction]].)
3. **FE envelope unwrap** (`web/src/api/cost.ts`): `unwrapResult(body) = body.result ?? body` (guarded:
   only peels a plain object carrying `result`, identity on array/primitive/null, single-level). Wired
   into `post`/`get`. `CostEstimate.breakdown` loosened from a 5-key literal to `Record<string, number>`
   -- the old type was interface drift (the engine emits 3 keys; the page renders `Object.entries`,
   key-agnostic). The 501 error routes (`/compare`, `/history`) throw on `!res.ok` BEFORE the unwrap, and
   `/aggregate` is bare -> the `?? body` fallback keeps it working.
4. **Page anon-graceful guard** (`CostEstimatorPage.tsx`, the R16 gap-close that the first pass left): a
   `hasCost = typeof result?.per_part_cost === "number"` guard. The toast deref is guarded (was an
   unconditional `.toFixed()` crash) -> "Sign in to view shop cost"; the badge + cost cards are gated on
   `hasCost`; a new "Cost Hidden" card renders for the `result && !hasCost` (anon/redacted) case. The page
   sends no auth token (always anon) so it shows the sign-in state; FE auth-header wiring is a quebec
   follow-up. Secure-AND-graceful, not secure-by-crash.

## Validation

- 8 route adapter tests (reference values 42.5 / 1062.5 / {machine:18.3, tooling:6.4, setup:9.1}; anon
  redact-then-adapt no-leak; 5 adversarial: missing batch, already-redacted, non-numeric, null, partial).
- 8 FE unwrap tests (peel / identity / over-peel guard / round-trip on the REAL wrapped wire / graceful
  bare fallback / negative control proving the pre-fix undefined / error path).
- 1 stale authed-breakdown assertion CORRECTED to the new FE-category-map contract (tightened, not
  weakened). 36/36 route+FE green; sibling redaction/contract suites 32/32 no-regression; tsc clean.
- **3-of-3 CLEARED** (blockCount 0). Arm A traced the security path through the real callTool peeler +
  engine shape (no anon leak). Arm B confirmed redact-then-adapt leak-safe + the unwrap no over-peel +
  the corrected assertion tightened. Arm C traced the blast radius (type-widen breaks 0 consumers) and
  caught a real P2: the batch-clamp is DEAD on the wire because process_cost pre-clamps
  `batch_size = Math.max(1, ...)` at IntelligenceEngine.ts:1052 -> corrected the comment + commit framing.

## Lessons

1. **A "deferred P2, degrades gracefully" note is a hypothesis, not a fact -- read the chain end-to-end.**
   The page was a hard crash, not a graceful degrade; the original note never traced `undefined.toFixed()`.
2. **The {result}-envelope dead-panel class hits a galaxy from BOTH directions** -- FE-reads-`.result`-on-
   bare-body (2026-06-23) AND route-wraps-but-client-doesn't-unwrap (this fix). Always confirm the EXACT
   wire shape on both ends; mock the REAL wrapped body in the test, not a convenient bare one (R9).
3. **A shape adapter must map ONLY what the engine computes** -- the FE's 5-key breakdown was aspirational;
   the engine produces 3. Fabricating material/labor/overhead would be inventing numbers (R12). Loosen the
   over-specific type to match reality instead.
4. **Compose redaction BEFORE the shape adapter** so an anon caller's stripped result passes through the
   adapter untouched -- adapt-then-redact would briefly materialize FE cost keys the redactor must then
   re-strip (a wider, more fragile surface).
5. **Close the gap, don't defer it (R16)** -- the page presence-guard was a 3-line completion that made
   the unit secure-AND-graceful; deferring it to "quebec" would have left a crash on the anon path.

## See also
- [[cost-route-anon-cost-basis-redaction]] -- the anon redaction this composes with (the redact-first half)
- [[quoting-dead-panel-unwrap-fix]] -- the same envelope class, inverted direction (2026-06-23)
- [[reference_charlie_costpage_shape_2026_06_24]] (memory)
