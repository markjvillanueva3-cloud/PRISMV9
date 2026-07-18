# Real shop tool-list ingestion template

Operator: fill out per-customer + per-job tool inventory data here so the wizard's
`bridge.resolve()` can return real customer-specific data instead of synthetic fixtures.

## File location

Per-customer JSON file: `mcp-server/data/shop-tool-lists/<customer>.json`

Example: `mcp-server/data/shop-tool-lists/ALCOA.json`

## Schema

```json
{
  "schemaVersion": "1.0.0",
  "customer": "ALCOA",
  "last_updated": "2026-05-27",
  "operator_confirmed_by": "<initials>",
  "jobs": {
    "JOB-2025-PART-A": {
      "T0101": {
        "insertAnsi": "CNMG-432-PR",
        "geometry": "C",
        "noseRadiusMm": 0.8,
        "vendor": "Kennametal",
        "grade": "KCM35",
        "coating": "PVD-TiAlN",
        "lifeMinutesAtTargetVc": 18,
        "suggestedVcSfm": [350, 420],
        "suggestedFzIpr": [0.008, 0.014],
        "isoGroupFit": ["P-30"],
        "substitutionOptions": ["SECO TP2500", "Sandvik 4325"]
      },
      "T0202": "..."
    },
    "*": {
      "comment": "Customer-level fallback used when no job-specific match. Lowest-confidence path.",
      "T0101": "..."
    }
  }
}
```

## Important constraints

1. **T-number format**: Use Fanuc 4-digit form `T0101` as canonical keys. The bridge's iter151 normalizer maps Mazak 6-digit `T010101` → `T0101` automatically.
2. **insertAnsi**: Required. Format `<geometry><type>-<size>-<chipbreaker>` per ISO 1832. Example: `CNMG-432-PR`.
3. **isoGroupFit**: Must include at least one sub-group like `P-30`, `M-25`, `H-30`, etc.
4. **suggestedVcSfm / suggestedFzIpr**: 2-element [min, max] ranges. Single values rejected.
5. **substitutionOptions**: Optional but recommended. Vendor alternates when primary out of stock.

## How the wizard uses this

1. Operator drops `ALCOA.json` into `mcp-server/data/shop-tool-lists/`
2. Wizard loader (TODO: future implementation) reads + merges per-customer into bridge layer1
3. `bridge.resolve({customer: "ALCOA", toolNumber: "T010101", jobId: "JOB-2025-PART-A"})` returns the documented insert
4. Wizard's `validateTools()` cross-checks real .MIN programs against this inventory

## Validation rules (operator self-check)

Before committing a new tool-list JSON, verify:
- [ ] All `T<NN>` keys uppercase
- [ ] All `insertAnsi` codes parse against ANSI 1832 regex `[CWDSTV][A-Z][A-Z][A-Z]-\d{3,4}(-\w+)?`
- [ ] `suggestedVcSfm` and `suggestedFzIpr` arrays have exactly 2 elements
- [ ] `isoGroupFit` is non-empty
- [ ] `lifeMinutesAtTargetVc` is a finite positive number
- [ ] No duplicate T-number entries within the same job

## Priority customers (highest-leverage to populate first)

Per iter167 memory + iter161 JM-Die fleet sampling:
1. **ALCOA** — most-sampled customer (sampling: 3 A-versions + 3 B-versions = 6 programs in iter163 batch)
2. **ITW** — second-sampled (1 A-version)
3. **ACME** — has source-folder A/B pairs (iter165 finding)
4. **AGRATI** — has REV-A pattern (iter167 finding)
5. Remaining JM-Die customers per `JM DIE/CNC LATHE/` folder enumeration

## Related

- `[[reference_whiskey_session_final_iter167_2026_05_27]]` — session-final state
- `[[reference_shop_tool_library_bridge_design_2026_05_27]]` — bridge design
- `scripts/lib/lathe-shop-tool-library-bridge.mjs` — bridge implementation
- `scripts/lib/__real-data-batch.mjs` — synthetic `SHOP_INVENTORY` fixture this template replaces
