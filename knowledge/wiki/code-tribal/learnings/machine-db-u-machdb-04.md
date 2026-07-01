# MACHINE-DB/U-MACHDB-04 — [MAIN-FORCE] [MACHINE-DB]/U-MACHDB-04 (slot:oscar): wire enricher into SFC resolveMachine -- fixes 3 live bugs

**Commit:** `6347cc480f2b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-27T13:13:47-05:00
**Tags:** machine-db, u-machdb-04, auto-distilled

## Subject
[MAIN-FORCE] [MACHINE-DB]/U-MACHDB-04 (slot:oscar): wire enricher into SFC resolveMachine -- fixes 3 live bugs

## Body
```
[MAIN-FORCE] [MACHINE-DB]/U-MACHDB-04 (slot:oscar): wire enricher into SFC resolveMachine -- fixes 3 live bugs

P5 wire: SpeedFeedOrchestrator.resolveMachine's MachineRegistry fallback read raw, un-normalized,
un-enriched fields and had 3 live bugs feeding the speed/feed calculator wrong machine capabilities:
  1. spindle power read from spindle.power_continuous ONLY -> every machine storing power under one of
     the other 6 key variants (power_kW/power_kw/peakHp/continuousHp/power_hp/power) silently resolved
     to the 15 kW default. LIVE: 14 of 1015 machines hit this (e.g. INDEX_G420 resolved 15 kW; real 33).
     Wrong power -> wrong MRR/torque ceiling -> wrong feed recommendation.
  2. guideway hard-coded 'linear' regardless of actual way type.
  3. nat_freq_hz hard-coded 800 (physically wrong -- dominant structural modes are ~40-250 Hz; feeds
     chatter stability). LIVE: 1006 machines now get a real FRF spring-mass nat_freq (INDEX_G420 216 Hz).

Fix: new pure exported registryMachineToCatalog(raw) in machine-enricher.ts routes the raw record
through normalizeMachine (7-key power union, U-MACHDB-02) + enrichMachine (way_type/FRF/accel/jerk,
U-MACHDB-03) and maps to the MACHINE_CATALOG_QUICK entry shape -- power across all variants, guideway
+ rigidity from way_type (substring-matched so canonical 'box_way' AND raw OEM 'box' both work),
nat_freq from the FRF model, plus accel_m_s2/jerk_m_s3 the old fallback never set (effective-feed model
was blind). resolveMachine now delegates in 2 lines (?? catalogMatch preserves prior behavior when the
adapter returns undefined). 6 new adapter tests (variant-key power / nat_freq-not-800 / guideway-from-
way / accel+jerk / no-spindle->undefined / safe-defaults); 29 enricher tests total; engine + enricher
tsc-clean; live-validated 14/14 power-drops fixed + 1006 real nat_freq.
```

## Files touched (4)
- mcp-server/src/__tests__/machine-enricher.test.ts     | 57 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts | 57 ++++++++++++++++++++++++++++++++++++++++-----------------
- mcp-server/src/registries/machine-enricher.ts         | 59 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 155 insertions(+), 18 deletions(-)

## Lessons surfaced in commit body
- wrong machine capabilities:
- Wrong power -> wrong MRR/torque ceiling -> wrong feed recommendation.
- wrong -- dominant structural modes are ~40-250 Hz; feeds

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6347cc480f2b`
- Milestone envelope: `mcp-server/data/milestones/MACHINE-DB.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._