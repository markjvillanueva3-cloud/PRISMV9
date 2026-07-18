# Pending Commits

## U-LTH13 + U-LTH14 — COMMITTED
**Commit:** fd2cf983e (bundled in PP-AGI-S0/U-S0-01+02+10+11)
**Date:** 2026-04-17T14:56:00Z

Files from both units were picked up by PP-AGI-S0's broad git add and committed together.

---

## (Archive) U-LTH13 (Committed)
**Session:** Claude-Opus (this session)
**Timestamp:** 2026-04-17T14:15:00Z

### Files to stage:
```
mcp-server/src/engines/LatheSpeedFeedCalculatorFacadeEngine.ts
mcp-server/src/physics/constants.ts
mcp-server/src/__tests__/lathe-speed-feed-regression.test.ts
state/shared/LATHE-MASTER-HANDOFF.md
```

### Commit message:
```
LATHE-MASTER/U-LTH13: Speed/feed regression suite — 200 golden cases

- lathe-speed-feed-regression.test.ts: 200 cases from Sandvik/Kennametal/ISO 3685
- Coverage: ISO P(50), M(40), K(25), N(35), S(30), H(20)
- Accuracy: 191/204 tests pass (93.6%), 5 cases drift >10% (2.5% — within 5% budget)
- Calibrated LatheSpeedFeedCalculatorFacadeEngine: operation factors, ISO group feed adjustments
- Calibrated constants.ts: hardened_steel (115/150), cast_iron (220/280) vc_base

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Verification:
```bash
cd H:/PRISM/mcp-server
npx vitest run LatheSpeedFeed         # 144 pass
npx vitest run lathe-speed-feed-regression  # 191/204 pass
npm run build:fast                    # OK
```

---

## U-LTH14 (Ready to Commit)
**Session:** Claude-Opus (this session)
**Timestamp:** 2026-04-17T14:52:00Z

### Files to stage:
```
mcp-server/src/hooks/LatheSpeedFeedGuardHook.ts
mcp-server/src/schemas/latheSpeedFeedActionSchemas.ts
mcp-server/src/tools/dispatchers/camDispatcher.ts
mcp-server/src/__tests__/hooks/LatheSpeedFeedGuardHook.test.ts
mcp-server/src/__tests__/camDispatcher-LatheSpeedFeed.test.ts
mcp-server/data/milestones/LATHE-MASTER.json
state/shared/LATHE-MASTER-HANDOFF.md
```

### Commit message:
```
LATHE-MASTER/U-LTH14: Forge-Triple — hook + action + skill

- LatheSpeedFeedGuardHook.ts: speed-feed-out-of-band-guard safety hook
  - Validates Vc, feed, DOC, RPM against ISO group ranges
  - Power capacity check (90% limit)
  - Surface finish validation for finishing ops
  - Safety score 0-1, adjusted recommendations
- lathe_sf_full action: Full orchestration of 5 engines + guard hook
- auto-speed-feed-lathe.md skill: /auto-speed-feed-lathe command
- 30 hook tests + 26 dispatcher tests = 56 new tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Verification:
```bash
cd H:/PRISM/mcp-server
npx vitest run LatheSpeedFeedGuardHook        # 30 pass
npx vitest run camDispatcher-LatheSpeedFeed   # 26 pass
npm run build:fast                            # OK
```
