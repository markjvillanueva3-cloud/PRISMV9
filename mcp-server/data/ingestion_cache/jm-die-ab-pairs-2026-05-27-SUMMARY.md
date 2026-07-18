# JM-Die archive A/B-pair full scan — 2026-05-27 (iter202)

## Run command
`node scripts/scan-jm-die-ab-pairs.mjs`
(Defaults: scan-root=`H:/PRISM/JM DIE/CNC LATHE`, output=`mcp-server/data/ingestion_cache/jm-die-ab-pairs-2026-05-27.jsonl`)

## Result (post iter203 customer-rootfile fix)

- **14,475 A/B pairs paired**
- **265 unpaired singletons**
- **118 clean customers** (down from 195 with iter203 customer-rootfile-fix removing part-name misclassifications)
- **Output**: `jm-die-ab-pairs-2026-05-27.jsonl` (~4.2MB, gitignored as build artifact)

### Iter203 fix impact
- Customers: 195 → 118 (-77 misclassified part-name keys correctly merged)
- Pairs: 14471 → 14475 (+4 — some misclassified files now pair properly under UNKNOWN)
- Unpaired: 273 → 265 (-8 — same cause)

## Comparison vs iter197 template estimate
- Estimated: 1,000–3,000 pairs
- Actual: 14,471 pairs (5–15× higher)
- Driver: each source `.MIN` × 7 Okuma model variants → 7 B-version candidates per source

## Known issues
1. Some "customer-key" entries are part-name-shaped (e.g. `THREAD GAGE-2-34-8-B.MIN`) — caused by `parsePath` customer-extraction fallback for files at non-standard depths (e.g. files directly under `CNC LATHE/` without a customer subfolder, or files in unusual subfolder structures)
2. Multi-B-variant case: pairAB picks "first B" per part; the other 6 B-variants are dropped. Future work: emit all B-variants as alternates.

## Reproduce
```bash
cd H:/prism-slot-whiskey
node scripts/scan-jm-die-ab-pairs.mjs
```
Runtime: ~90–100s for full archive.

## Next-session usage

The JSONL pair records feed:
1. **Δ-score computation** — run Stage 4 REASON on A, compare to B-version actual contents
2. **Wizard training-signal extraction** — what levers did the v2.0.0 upgrade actually engage?
3. **AB-pair-aware quality scoring** — score programs against their paired B-version as a baseline

Per [[feedback_jm_die_b_versions_are_ai_not_human_upgrade]]: B-versions are NOT human-expert programs; they are prior-PRISM-AI output. The Δ-signal is "what the prior wizard chose" — useful but not gold standard.

## Related
- `scripts/scan-jm-die-ab-pairs.mjs` — runner (iter200)
- `scripts/lib/lathe-ab-version-locator.mjs` — pure helpers + iter200 PRISM_UPGRADED fix
- `mcp-server/data/ingestion_cache/AB-LOCATOR-SCAN-RUNNER-TEMPLATE.md` — iter197 template that drove this implementation
- `[[reference_jm_die_is_okuma_heavy_implications_2026_05_27]]` — explains why each source has 7 B-versions
