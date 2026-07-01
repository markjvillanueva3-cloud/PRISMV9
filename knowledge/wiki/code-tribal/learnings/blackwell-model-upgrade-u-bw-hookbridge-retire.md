# BLACKWELL-MODEL-UPGRADE/U-BW-HOOKBRIDGE-RETIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-HOOKBRIDGE-RETIRE (slot:alpha): OllamaHookBridgeEngine defaultModel + all 7 modelOverrides pointed at DELETED qwen2.5-coder:7b/14b (live regression the retirement created — every hook using the bridge silently got a dead model). Re-pointed to kept 32b floor; stale 4080-era comment corrected; gpt-oss:20b noted as future speed re-point. Type-trivial string swaps. Remaining .ts stale-tag surface (AISystemRouterEngine enum + ~17 others) handoff-queued for U1b.

**Commit:** `0615b476d54c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T13:17:28-05:00
**Tags:** blackwell-model-upgrade, u-bw-hookbridge-retire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-HOOKBRIDGE-RETIRE (slot:alpha): OllamaHookBridgeEngine defaultModel + all 7 modelOverrides pointed at DELETED qwen2.5-coder:7b/14b (live regression the retirement created — every hook using the bridge silently got a dead model). Re-pointed to kept 32b floor; stale 4080-era comment corrected; gpt-oss:20b noted as future speed re-point. Type-trivial string swaps. Remaining .ts stale-tag surface (AISystemRouterEngine enum + ~17 others) handoff-queued for U1b.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-HOOKBRIDGE-RETIRE (slot:alpha): OllamaHookBridgeEngine defaultModel + all 7 modelOverrides pointed at DELETED qwen2.5-coder:7b/14b (live regression the retirement created — every hook using the bridge silently got a dead model). Re-pointed to kept 32b floor; stale 4080-era comment corrected; gpt-oss:20b noted as future speed re-point. Type-trivial string swaps. Remaining .ts stale-tag surface (AISystemRouterEngine enum + ~17 others) handoff-queued for U1b.
```

## Files touched (2)
- mcp-server/src/engines/OllamaHookBridgeEngine.ts | 32 +++++++++++++++++---------------
- 1 file changed, 17 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0615b476d54c`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-MODEL-UPGRADE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._