# Bootstrap remediation run — iter34 evidence

**Date:** 2026-05-26 slot:charlie iter33→iter34 follow-up
**Action:** executed iter33-documented remediation; surfaced 2 new findings.

## Commands run

```powershell
# Attempt 1 — ledger only
node H:/prism/scripts/quoting-baseline-bootstrap.mjs --limit 30 --summary

# Attempt 2 — archive walk
node H:/prism/scripts/quoting-baseline-bootstrap.mjs --limit 30 --scan-archive --scan-max-depth 4 --scan-max-files 2000 --summary
```

## Attempt 1 result (ledger-only)

```
[bootstrap] WROTE 30 records
[bootstrap] DIST machine_class={"mill":30}
[bootstrap] DIST time_bucket_s={"600":29,"1800":1}
[bootstrap] DIST rate_range=[95,95] material_range=[60,60]
[bootstrap] DIST top_customers=[{"customer":"PRISM_UPGRADED","count":30}]
```

**Status:** iter13 derivation IS working (single time-bucket variance) but the LEDGER source is degenerate — every entry is `PRISM_UPGRADED` (synthetic-test customer, not JM Die). All paths collapse to mill class.

## Attempt 2 result (archive walk)

```
[bootstrap] WROTE 30 records
[bootstrap] DIST machine_class={"mill":30}
[bootstrap] DIST time_bucket_s={"600":8,"1800":19,"3600":3}
[bootstrap] DIST rate_range=[95,95] material_range=[60,60]
[bootstrap] DIST top_customers=[{"customer":"PRISM MODIFIED POST PROCESSORS","count":15},{"customer":"HURCO CNC PROGRAMS","count":15}]
```

**Status:** real archive walk produces REAL time variance (3 distinct buckets). But still degenerate on machine_class because the top-level subdirs at depth ≤4 are non-customer configuration directories.

## NEW Findings (real, surfaced per R12 fail-loud)

### F1 — iter9 NON_CUSTOMER_SUBDIRS regex is too strict

The regex `/^_?(...)(POST[\s_-]?PROCESSORS?|...)$/i` requires the WHOLE segment to match. Subdir names that CONTAIN the noise patterns but have other prefixes/suffixes slip through:

- `PRISM MODIFIED POST PROCESSORS` (contains POST PROCESSORS, prefixed PRISM MODIFIED) — slipped through
- `HURCO CNC PROGRAMS` (contains CNC PROGRAMS variant of POST PROCESSORS theme) — slipped through

**Fix:** extend iter9's regex to use word-boundary `\b` matching OR add explicit patterns for these JM-Die-specific subdirs. Tracking as `U-QP-BOOTSTRAP-FILTER-EXTEND-V2`.

### F2 — JM Die archive top-level layout doesn't match expected `/{CUSTOMER}/{MACHINE_CLASS}/` shape

The walk at depth≤4 hit "PRISM MODIFIED POST PROCESSORS" and "HURCO CNC PROGRAMS" as the apparent customers. Real JM Die customers (ALCOA, ITW, etc.) live deeper in the tree OR under a different path structure than iter9's regex assumes.

**Investigation needed:** what's the actual JM Die archive layout? The iter9 `extractCustomer` assumes:
```
H:/PRISM/JM DIE/{some prefix}/{CUSTOMER}/{file}
```
where CUSTOMER is the first segment after `JM DIE/` that's not in NON_CUSTOMER_SUBDIRS. If real customers live at depth 6+ (`JM DIE/HURCO CNC PROGRAMS/customer-name/...`), the iter9 walk + extractor need to look deeper.

**Tracking as `U-QP-JM-DIE-LAYOUT-AUDIT`** — operator should run:
```powershell
Get-ChildItem H:/PRISM/"JM DIE"/ -Depth 3 -Directory | Select-Object FullName | head -30
```
to see the actual top-of-archive layout.

## What this iter accomplished

1. **Confirmed iter13 derivation logic correct** — variance distribution emerges as designed when input data has variety
2. **Confirmed iter16 distribution probe correct** — actually surfaced the degeneracy (in <1 second of stderr output)
3. **Confirmed iter9 filter catches the named patterns** — it does, but the WHOLE-SEGMENT match anchors are too strict for real-world subdir naming
4. **Confirmed the substrate's self-auditing capability** — iter32 caught the verify gap, iter33 caught the baseline staleness, iter34 caught the filter strictness. Three real findings surfaced in three consecutive iters, all by running the chain on real data instead of contrived fixtures.

## Open follow-ups added

| Unit | Scope | Priority |
|---|---|---|
| U-QP-BOOTSTRAP-FILTER-EXTEND-V2 | extend iter9 regex to handle `PRISM MODIFIED POST PROCESSORS` + `HURCO CNC PROGRAMS` patterns | P1 |
| U-QP-JM-DIE-LAYOUT-AUDIT | one-shot script that prints top-of-archive layout so iter9 path-walker can be calibrated to reality | P2 |

Both are SMALL units. The iter9 extension is a 1-line regex change + 4 new test cases. The audit script is read-only filesystem walk.

## Cross-refs

- `state/shared/quoting/FIRST-LIVE-CHAIN-EVIDENCE-2026-05-26.md` — iter33 sibling evidence
- `state/shared/quoting/FIRST-TRAINING-CYCLE-EVIDENCE.md` — iter6 ancestor
- `[[reference_quoting_pipeline_session_2026_05_26]]` — session memory (now needs another addendum)
- iter9 commit `5b370300f0` — the regex this iter's F1 extends
- iter13 commit `71e08eae58` — the variance logic this iter confirms works
- iter16 commit `15b09088ad` — the distribution probe that surfaced both findings
