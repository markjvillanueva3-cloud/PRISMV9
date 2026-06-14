# Bridge auto-wire log

**Last run:** 2026-05-25T00:22:57.587Z
**Edges emitted this run:** 87
**Cross-LEVEL edges:** 30 (top 30 candidates from META)
**Domain-internal hub edges:** 27 (top 30 candidates)
**Cross-DOMAIN edges (META synthetic anchors):** 30 (top 30 candidates)
**Cumulative edges in JSONL:** 87

## What these edges represent

Each line in `state\shared\system-viz\staging\bridge-edges-auto.jsonl` is a synthetic edge bridging two synthetic anchor nodes (`<layer>.<domain>._bridge_anchor` / `._hub_anchor`). On the next `/system-viz` regen, these edges land in the live graph and surface as cross-domain / cross-level / domain-hub bridge candidates ready for operator inspection.

> **R12 honesty:** every edge carries `synthesized:true` + `provenance:bridge-auto-wire.mjs` + `mustHumanVerify:true`. These are PROGRAMMATIC SUGGESTIONS deterministically derived from PRISM-BRIDGE-GRAPH leverage scores — they are NOT validated wirings of specific engine APIs (those are iter24-26's job). Operator MUST inspect before promoting to production.

## Re-run

```bash
node H:/prism/scripts/bridge-auto-wire.mjs              # apply (idempotent)
node H:/prism/scripts/bridge-auto-wire.mjs --dry-run    # preview only
node H:/prism/scripts/bridge-auto-wire.mjs --top 50     # top-50 of each category
```

## Compounding-gains property

Per forge-audit-v2 §6A: this script is the AUTO-wire counterpart to iter23's `bridge-graph-builder.mjs`. The builder identifies bridges; the auto-wirer ships them deterministically at the graph layer. Together they make exhaustive bridging a 2-script operation instead of 60 individual code units.