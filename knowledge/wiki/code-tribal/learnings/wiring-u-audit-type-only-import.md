# WIRING/U-AUDIT-TYPE-ONLY-IMPORT — [MAIN-FORCE] [WIRING]/U-AUDIT-TYPE-ONLY-IMPORT (slot:romeo): unwired audit ignores TS type-only imports -> unmasks 8 engines hidden behind import-type

**Commit:** `24958823de8b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T13:15:34-05:00
**Tags:** wiring, u-audit-type-only-import, auto-distilled

## Subject
[MAIN-FORCE] [WIRING]/U-AUDIT-TYPE-ONLY-IMPORT (slot:romeo): unwired audit ignores TS type-only imports -> unmasks 8 engines hidden behind import-type

## Body
```
[MAIN-FORCE] [WIRING]/U-AUDIT-TYPE-ONLY-IMPORT (slot:romeo): unwired audit ignores TS type-only imports -> unmasks 8 engines hidden behind import-type

A 'import type { X } from "...Engine.js"' is erased at runtime, so counting it as wiring MASKS a genuinely-unwired engine -- a false-NEGATIVE that hides real capability gaps (the inverse of romeo's mission). engineReferencedInConsumer Form-1 now excludes a leading 'import type'/'import type{' via a negative lookahead; an inline 'import { type X }' value statement still matches (conservative -- only a leading import-type is excluded). +3 tests (value import wires; type-only excluded; inline-type kept). LIVE VALIDATION: UNWIRED 0->8 -- AuthEngineV7, RegressionBaselineEngine, PreMOUKickoffChecklistEngine, SwissChannelFileEmitterEngine, IEngine (interface), WEDMKalmanFusionEngine, WEDMMachineStateEngine, PipelineIRExecutorEngine -- all spot-verified type-only-referenced (no value import wrongly excluded), now correctly visible for DOMAIN-OWNER triage (romeo surfaces, owners wire/exempt -- no cross-domain edit). audit tests 47/47.
```

## Files touched (3)
- scripts/audit-unwired-engines.mjs      |  6 +++++-
- scripts/audit-unwired-engines.test.mjs | 15 +++++++++++++++
- 2 files changed, 20 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till matches (conservative -- only a leading import-type is excluded). +3 tests (value import wires; type-only excluded; inline-type kept). LIVE VALIDATION: UNWIRED 0->8 -- AuthEngineV7, RegressionBaselineEngine, PreMOUKickoffChecklistEngine, SwissChannelFileEmitterEngine, IEngine (interface), WEDMKalmanFusionEngine, WEDMMachineStateEngine, PipelineIRExecutorEngine -- all spot-verified type-only-refe
- wrongly excluded), now correctly visible for DOMAIN-OWNER triage (romeo surfaces, owners wire/exempt -- no cross-domain edit). audit tests 47/47.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 24958823de8b`
- Milestone envelope: `mcp-server/data/milestones/WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._