# U-QP-DOCUSTRATA-EXTRACTOR-WIRE — Spec

**Status:** SPEC (pre-implementation) · **Authored:** 2026-05-26 slot:charlie · **Target:** iter29+ of the QUOTING-SYNERGY-MS0 milestone

The iter9-28 session shipped a Docustrata-ready training calibration substrate that uses synthetic revenue (iter20 `generateSyntheticRevenueRecords`). This spec defines the swap: replace synth with a real extractor that reads JM Die's historical Docustrata invoices and emits the validator-locked payload shape.

## Scope (THIS unit)

**Build:** one new engine + one bridge script that emits a validator-compliant `docustrata-revenues.json` from the JM Die Docustrata archive. **Wire:** iter21 orchestrator gains a `--source extractor|synth` flag selecting between the new real extractor and the existing iter20 synth.

**NOT in scope:** modifying iter18 bridge, iter19 validator, iter21 orchestrator's external contract, train-cycle, ledger, drift-alert. Those stay pinned by the iter27 sample fixture's contract.

## Inputs the extractor consumes

1. **JM Die archive root:** `H:/PRISM/JM DIE/` — file layout per iter9 customer-extraction rules (path-hint > extension, machine-class subdirs)
2. **Docustrata document archive:** `H:/prism/Docustrata/` — historical invoice PDFs (and any iter foxtrot 2026-05-16 print-reading sidecars per `[[reference_docustrata_pipeline_2026_05_16]]`)
3. **Existing engine to call:** `DocustrataHistoricalPricingTrainerEngine` (mcp-server/src/engines/) — already has invoice-extraction methods; this unit ONLY wires its output to the bridge shape

## Output contract (LOCKED by iter19 + iter27)

Must produce JSON conforming to `state/shared/quoting/docustrata-revenues.sample.json`:

```json
{
  "schema_version": "1.0.0",
  "generated_iso": "<ISO-8601 UTC>",
  "source": "docustrata-historical-pricing-trainer",
  "records": [
    { "customer": "<UPPERCASE>", "part_id": "<string>", "revenue": <number $0.01-$10M> }
  ]
}
```

The iter19 validator's `SUPPORTED_SCHEMA_VERSIONS` Set must accept this. The iter27 sample fixture's 16 contract tests guard the shape — if those drop, this unit shipped the wrong format.

## Files to read BEFORE writing

Critical-path (~30 min budget for context warm):

1. `mcp-server/src/engines/DocustrataHistoricalPricingTrainerEngine.ts` — its current public surface, what `extractInvoiceRecord()` (or similarly-named) returns
2. `scripts/quoting-docustrata-format.mjs` — iter19 validator (`validateDocustrataPayload`)
3. `scripts/quoting-docustrata-bridge.mjs` — iter18 bridge (`buildRevenueKey`, `mergeDocustrataRevenue`)
4. `scripts/quoting-docustrata-pipeline.mjs` — iter21 orchestrator (the integration point)
5. `state/shared/quoting/docustrata-revenues.sample.json` — iter27 canonical reference

## Implementation outline

### Step 1 — extractor adapter (new file)

`scripts/quoting-docustrata-extractor.mjs`:

```js
import { DocustrataHistoricalPricingTrainerEngine } from "../mcp-server/dist/engines/DocustrataHistoricalPricingTrainerEngine.js";
// OR via tsx import if the .ts source must be used

/**
 * Pure-ish function: extracts revenue records from the Docustrata archive
 * and shapes them to the iter19-validated payload format.
 *
 * Returns the SAME shape as iter20 generateSyntheticRevenueRecords so the
 * iter21 orchestrator can swap one for the other transparently.
 */
export async function extractDocustrataRevenueRecords(opts = {}) {
  const engine = new DocustrataHistoricalPricingTrainerEngine();
  const raw = await engine.extractAllInvoices(opts); // <- exact method name from step 1 above
  // Map raw -> { customer, part_id, revenue } records
  const records = [];
  for (const inv of raw) {
    // Customer normalization: uppercase + trim (matches iter18 buildRevenueKey)
    // Part_id normalization: same. Revenue: parse to number, skip if not in REVENUE_BOUNDS.
    // ...
  }
  return { schema_version: "1.0.0", generated_iso: new Date().toISOString(), source: "docustrata-historical-pricing-trainer", records };
}
```

### Step 2 — orchestrator integration

Edit `scripts/quoting-docustrata-pipeline.mjs`:

```js
// Add --source flag to CLI
const SOURCE = val("source", "synth"); // default = back-compat with iter21

// In runDocustrataPipeline(baselineRecords, opts), branch on opts.source:
if (opts.source === "extractor") {
  synth = await extractDocustrataRevenueRecords(opts.extractor ?? {});
} else {
  synth = generateSyntheticRevenueRecords(baselineRecords, opts.synth ?? {});
}
```

Keep `synth` as the default so existing tests (iter21 14-case suite + iter17 E2E) stay green. Add 4-5 new tests in `quoting-docustrata-pipeline.test.mjs` for the `--source extractor` path, using a mocked extractor or a small fixture.

### Step 3 — emit + persist

When `--source extractor` is used, ALSO write the extracted payload to `state/shared/quoting/docustrata-revenues.json` (the iter18 bridge auto-reads this when present). Future bootstrap → bridge → train-cycle runs without re-extracting.

### Step 4 — tests (the COMPREHENSIVE-BUILD floor)

Minimum coverage per CLAUDE.md §COMPREHENSIVE-BUILD-ENFORCEMENT:

- Happy path: 5-record extractor output → validator → bridge match rate 100%
- 3 failure modes:
  - Engine throws → catch + return empty payload with stderr surface
  - Invoice with missing customer → skip + warning
  - Invoice with non-number revenue → skip + warning
- 2 adversarial:
  - Engine returns null → empty payload
  - Engine returns 10000+ records → bounded by opts.maxRecords (default 5000)
- Variability ≥3: mill / wire-EDM / lathe records across the extracted set
- Wiring verification: iter21 `--source extractor` flag actually routes to the new path, and iter19 validator accepts the output

### Step 5 — wire docs

After ship, update:
- `knowledge/wiki/architecture/quoting-training-pipeline.md` — add iter29 row to commit table, update "Next high-leverage unit" section (it's no longer deferred)
- `state/shared/quoting/PIPELINE-RUNBOOK.md` — note `--source extractor` flag, archive prerequisite ("requires `H:/prism/Docustrata/` populated")
- `[[reference_quoting_pipeline_session_2026_05_26]]` — flip follow-up #1 from "DEFERRED" to a new memory `[[reference_quoting_extractor_wire_<date>]]`

## Risk register

1. **Docustrata engine's extracted-record shape may differ from spec assumption.** Mitigation: Step 1 includes reading the engine first. Cap implementation at "if engine shape is unknown, ship a stub adapter + open follow-up."
2. **PDF extraction quality.** Mitigation: the iter18 bridge's `minRevenue` floor + iter19's `REVENUE_BOUNDS` already reject bogus values. Output reports `unmatched + rejected_below_min` so operator can audit.
3. **Performance — 1000+ invoices.** Mitigation: stream-process rather than load-all-then-shape. Cap output via `opts.maxRecords`.
4. **Customer-name disambiguation.** The iter18 `buildRevenueKey` uppercases + trims. If Docustrata stores "Alcoa Inc." vs JM Die's "ALCOA" subdir, the key won't match → drop into `unmatched`. Mitigation: a customer-alias map in `state/shared/quoting/customer-aliases.json` (NEW small file, owned by ops).
5. **Shared-tree absorption.** Per the iter10 lesson: always `git diff --cached --name-only` before `git add`. Edit bootstrap script in isolation if possible.

## Acceptance criteria

- [ ] `node scripts/quoting-docustrata-pipeline.mjs --source extractor --json` returns `{ok:true, stage:"done", merge.report.matched > 0}` against a non-empty Docustrata archive
- [ ] All iter9-28 tests still pass: `node scripts/quoting-pipeline-verify.mjs --json` reports `ok:true, fail:0`
- [ ] New extractor test file `scripts/quoting-docustrata-extractor.test.mjs` ≥12 tests passing (CBE floor)
- [ ] Wiki + runbook + memory updates land
- [ ] Commit message references this spec by path
- [ ] iter22 follow-up #1 ("U-QP-DOCUSTRATA-EXTRACTOR-WIRE") flipped to DONE in the memory cross-ref

## Estimate

- Read engine + understand its shape: ~30 min context
- Step 1 extractor + Step 2 orchestrator edit: ~45 min
- Step 4 tests: ~30 min
- Step 5 doc updates: ~15 min
- **Total: ~2 hours of focused work** (one fresh chat session, mid-context-window budget)

Skip-conditions: if context warm-up alone exceeds 25% of the chat's window, stop and write a finer pre-implementation spec rather than half-shipping.

## Cross-refs

- [[reference_quoting_pipeline_session_2026_05_26]] — open follow-ups list (this spec closes #1)
- [[reference_docustrata_pipeline_2026_05_16]] — sibling print-reading pipeline (different domain, may share utilities)
- `knowledge/wiki/architecture/quoting-training-pipeline.md` — canonical chain reference
- `state/shared/quoting/PIPELINE-RUNBOOK.md` — operator commands
- `state/shared/quoting/docustrata-revenues.sample.json` — the canonical output shape this extractor must produce
- iter18-21 commits: `3820f1ed4f` (bridge) · `2d4e2cfa3e` (validator) · `d9f727aa06` (synth) · `cb52c38aee` (orchestrator)
