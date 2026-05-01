# REGISTRY AUDIT — R1 Phase

## CURRENT COUNTS

| Registry | Expected | Knowledge | material_get | Gap | Status |
|---|---|---|---|---|---|
| Materials | 3518+ | 521 | 521 (get works, search works) | 2997 (85%) | PARTIAL - verified subset loaded |
| Machines | 824+ | 402 | TBD | 422 (51%) | PARTIAL |
| Tools | 1944+ | 0 | TBD | 1944 (100%) | NOT LOADED |
| Alarms | 9200+ | 10033 | decode fails (param order fixed in build, needs restart) | EXCEEDS | LOADED but decode path broken |
| Formulas | N/A | 500 | via calc engine | N/A | OPERATIONAL |

## P0 FINDINGS FIXED (R1-MS0)

| Finding | Fix | Status |
|---|---|---|
| #1 Safety validator flat params | validationDispatcher.ts: accept params.material OR flat params | FIXED (needs restart) |
| #2 Thread lookup M10x1.5 | "M10" works. M10x1.5 = redundant notation. findISOMetricThread fallback should match but doesn't in running server | PARTIALLY FIXED |
| #3 Alarm decode param order | dataDispatcher.ts: decode(controller, code) was called as decode(code, controller) | FIXED (needs restart) |
| #4 Compliance listProvisioned | complianceDispatcher.ts: listProvisioned → listTemplates | FIXED (needs restart) |

## DATA QUALITY OBSERVATIONS

- 4140 family: 12 variants, all 127 params, all verified. Kienzle/Taylor/Johnson-Cook complete.
- Material search wildcard "*" returns 0 (search method doesn't support wildcard — use specific queries)
- Thread data: ISO metric coarse+fine loaded (see threadDataISO.ts line 150 log). M10 returns full specs.
- Alarm registry: 10033 entries loaded in knowledge but decode path has code/controller param reversal (fixed in next build)

## ANALYSIS

The 521 loaded materials are high-quality verified data with 127 params each including Kienzle, Taylor, Johnson-Cook coefficients. The 2997 gap represents unverified gen_v5 materials that the ATCS materials-db-verified task was replacing (41.7% complete).

The critical path for R1 is NOT loading more data — it's fixing the data ACCESS paths (alarm decode, safety validator, compliance). These are code fixes, already applied, waiting for server restart.

## RECOMMENDATIONS

1. Restart MCP server to activate fixes #1-#4
2. Re-run P0-MS8 Chain 1 (manufacturing) and Chain 4 (alarm) after restart
3. Continue ATCS materials-db-verified task to increase material count toward 3518
4. Tool registry (0/1944) needs investigation — appears completely empty
5. Machine registry (402/824) is partially loaded — acceptable for R1, full load is R3
