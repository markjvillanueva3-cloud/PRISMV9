# Bridge shim emit log (Stage 4)

**Last run:** 2026-05-25T04:07:41.486Z
**Edges emitted this run:** 10
**Skipped (already in JSONL):** 0
**Skipped (no shim viable — preESM or same shape):** 0
**Cumulative shim edges in JSONL:** 97

## Emitted this run

| shim kind | from cohort → to cohort | score | engines covered |
|---|---|---:|---:|
| nodenext-path | esm-js (current — NodeNext convention) → esm-plain (pre-NodeNext .js suffix) | 0.584 | 1872 |
| nodenext-path | esm-plain (pre-NodeNext .js suffix) → esm-js (current — NodeNext convention) | 0.584 | 1872 |
| nodenext-path | esm-plain (pre-NodeNext .js suffix) → mtime-q2 (no header signals) | 0.553 | 788 |
| nodenext-path | mtime-q2 (no header signals) → esm-plain (pre-NodeNext .js suffix) | 0.553 | 788 |
| nodenext-path | esm-plain (pre-NodeNext .js suffix) → mtime-q3 (no header signals) | 0.595 | 783 |
| nodenext-path | mtime-q3 (no header signals) → esm-plain (pre-NodeNext .js suffix) | 0.595 | 783 |
| nodenext-path | esm-plain (pre-NodeNext .js suffix) → mtime-q4 (no header signals) | 0.58 | 676 |
| nodenext-path | mtime-q4 (no header signals) → esm-plain (pre-NodeNext .js suffix) | 0.58 | 676 |
| nodenext-path | mtime-q3 (no header signals) → mtime-q4 (no header signals) | 0.787 | 507 |
| nodenext-path | mtime-q4 (no header signals) → mtime-q3 (no header signals) | 0.787 | 507 |

## What these edges represent

Each line in `state\shared\system-viz\staging\bridge-edges-auto.jsonl` whose `kind:"cohort-shim-bridge"` represents a synthetic adapter-shim edge between two cohort anchor nodes. On the next `/system-viz` regen, the edge surfaces in the 3D viewer as a navigable bridge between the two cohort groups.

> **R12 honesty:** every edge carries `synthesized:true` + `provenance:bridge-shim-emit.mjs` + `mustHumanVerify:true`. These are PROGRAMMATIC SHIM SUGGESTIONS derived from COHORT-COMPAT-MATRIX scores — they are NOT validated wirings of specific engine APIs (those need Stage 3's `buildShapeCoerceShim()` filled with a real `methodMap`). Operator MUST inspect before promoting to production.

## Re-run

```bash
node H:/prism/scripts/bridge-shim-emit.mjs              # apply top-10 (idempotent)
node H:/prism/scripts/bridge-shim-emit.mjs --dry-run    # preview only
node H:/prism/scripts/bridge-shim-emit.mjs --top 25     # apply top-25
```