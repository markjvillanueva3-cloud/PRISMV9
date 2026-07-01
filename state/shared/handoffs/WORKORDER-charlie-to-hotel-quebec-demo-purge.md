# Work Order: OS-shell demo-string purge -> JM-real (charlie -> hotel + quebec)

> **From:** slot charlie (quoting) · **To:** hotel (employee/HR/ERP/business) + quebec (frontend web+phone)
> **Date:** 2026-06-23 · **Branch:** cad-fusion-live-ms0
> **Why charlie isn't doing it:** these are OS-shell fixtures (jobs desk / messages / shop-clock / shell
> nav) -- hotel + quebec galaxy, NOT quoting. charlie's soul escalation path is `defer-work-order-to-hotel`.
> The operator directive "take out placeholders especially for demo company, replace with JM Die" applies
> fleet-wide; charlie already cleared the QUOTING lane (the quoting pages have ZERO demo-company strings --
> they pull real data via the live API). This work order hands the remaining OS-shell surface to its owners.

## Scope: 3 files, ~70 demo-string occurrences (full enumeration, R12 "all means all")

| File | Owner | Demo strings (count) |
|------|-------|----------------------|
| `mcp-server/web/src/features/operating-system/shellFixtures.ts` | quebec | JOB-4821 (22), NCR-221 (9), ORD-5124 (4), MC-04 (1) |
| `mcp-server/web/src/features/operating-system/messageFixtures.ts` | hotel/quebec | JOB-4821 (12), PO-7789 (4), NCR-221 (4), ORD-5124 (3), Archer Precision (1), MC-04 (1) |
| `mcp-server/web/src/components/shell/shellCatalog.ts` | quebec | Apex Aerospace (2), Archer Precision (1), + 1 each: QUO-1933, PO-7789, ORD-5124, NCR-221, JOB-4821, INV-4408, CUS-104 |

These are the FIXTURE FALLBACK render (shown when the backend OS data path is empty), not hardcoded UI.
They are demo-company strings -- "Apex Aerospace" / "Archer Precision" are fictional; the IDs are fake.

## Recommended replacement mapping (JM-real)

**Customers (display names)** -- use real JM customers from `blueprintRedaction.CORE_CUSTOMER_NAMES`
(the canonical JM customer set) -- pick any, suggested:
- `Apex Aerospace` -> `Continental Midland` (real JM fastener customer)
- `Archer Precision` -> `Holo-Krome` (real JM customer)
- (other real JM customers available: ALCOA, ITW, Optimas, SFS, Fastenal)

> NOTE: the file-inventory customer keys in `state/shared/databases/jm-customers.jsonl` (e.g.
> `AAAMECONINGPIN`, `AALLE`) are folder-derived, NOT display names -- do NOT surface those raw in the UI.
> Use the CORE_CUSTOMER_NAMES display set above.

**Record IDs** -- rebrand to a JM-plausible scheme (the IDs are cosmetic fixture data; any consistent
JM-style scheme works). Suggested -- keep the prefix convention, swap the numbers to look JM-internal:
- `JOB-4821` -> a real-looking JM job no. (or pull from `state/shared/quoting/jm-sold-orders.json` records)
- `PO-7789`, `INV-4408`, `ORD-5124`, `NCR-221`, `CUS-104`, `QUO-1933`, `MC-04` -> JM-scheme equivalents

**Better (optional, larger lift):** wire the OS-shell to render REAL JM data from the live provider
(`liveProvider.ts` already imports real API clients: `listEmployees`, `poList`, `docList`) instead of the
fixture fallback -- then the demo strings never render because real records replace them. That is the
"populate the backend OS data path" fix the original assessment (QUOTING-FRONTEND-READINESS-DETERMINATION-
2026-06-22) flagged. charlie did this for the QUOTING lane; the OS-shell is hotel/quebec's equivalent.

## Verification (when done)

```bash
grep -rn -E "Apex Aerospace|Archer Precision|PO-7789|INV-4408|CUS-104|JOB-4821|ORD-5124|NCR-221|QUO-1933|MC-04" \
  mcp-server/web/src/features/operating-system/ mcp-server/web/src/components/shell/
# expect: 0 matches (or only JM-real strings)
```
Also: `__tests__/erp-pages.test.tsx` + `Layout.test.tsx` + `liveProvider.test.ts` carry demo strings
(`Acme Corp`, `Northwind`) -- those are TEST fixtures; update them in lockstep so the assertions match
the new JM-real fixture data (otherwise the rebrand breaks the test expectations).

## charlie's lane (already done, for reference)
Quoting pages: 0 demo-company strings (verified live). The only quoting "placeholder" is an input
format-hint `placeholder="QUO-1933"` in QuoteFollowUpPage.tsx:778 -- that is a UX affordance (shows the
quote-ID shape to type), NOT displayed demo data; left as-is intentionally.
