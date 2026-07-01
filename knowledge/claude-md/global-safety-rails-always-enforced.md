---
source: global
section: SAFETY RAILS (ALWAYS ENFORCED)
slug: safety-rails-always-enforced
indexed_at: 2026-06-23T02:05:18.102Z
---

## SAFETY RAILS (ALWAYS ENFORCED)

- **UNITS FIRST — resolve inch vs mm from the SOURCE before ANY geometry/tool/holder/feed/stock/program work.** Never assume; a units mismatch is a **25.4× scale error** (kilo built a part in metric while it was in inches → tool + holder 25.4× too big). Sources: NC `G20`/`G21`, STEP `CONVERSION_BASED_UNIT 0.0254`(inch)/`SI_UNIT(.MILLI.,.METRE.)`(mm), CAD/CAM setup unit, tool-library `"unit"` field, print title block. Unknown/ambiguous → **STOP and verify**. JM Die convention is INCH — still verify per part. Guard: `scripts/lib/units-guard.mjs` (`requireUnits` throws if unknown, `assertUnitsMatch` throws on mismatch, `scaleAnomaly` flags the mislabel). → [[feedback_check_units_first]]
- **NEVER inline physics constants** — import from `src/physics/constants.ts` (canonical values live there only; do not duplicate in docs)
- **NEVER create stub engines** — hook blocks placeholder returns
- **Run affected tests** after engine modifications
- **Check ENGINE_DIGEST.md** before creating new engines

---
