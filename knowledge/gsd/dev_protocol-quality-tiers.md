---
source: dev_protocol
section: Quality Tiers
slug: quality-tiers
indexed_at: 2026-04-28T02:50:03.667Z
---

## Quality Tiers

### Tier 1 — Quick (no API calls)
`prism_validate:safety` → check S(x)≥0.70.
Use for: routine calculations, data lookups, simple fixes.

### Tier 2 — Standard (1 API call)
`prism_ralph:scrutinize` → single validator pass.
Use for: code changes, feature additions, bug fixes.

### Tier 3 — Deep (4-7 API calls)
`prism_ralph:loop` → SCRUTINIZE → IMPROVE → VALIDATE → ASSESS.
Use for: infrastructure changes, new features, refactors.
Expect: 30-60s, scored findings.

### Tier 4 — Release (Deep + Omega)
`prism_ralph:loop` THEN `prism_omega:compute`.
Use for: production ship, safety-critical paths.
Expect: Ω with component breakdown.
