# HURCO-VM30I-FULL-PSN-MS0/U-HURCO-ROUNDTRIP-TSX-RUNTIME — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-ROUNDTRIP-TSX-RUNTIME (slot:echo iter10 2026-05-24): tsx-runtime variant of roundtrip harness. Spawns npx tsx to import src/.ts directly, bypassing the stale dist/engines/*.js (lags days behind source on this PC due to tsc cycle time + peer-slot CPU contention). KNOWN-ISSUE: Windows shell:true child_process invocation eats the inline tsx -e payload, returns exit 255 with no output. Engine logic + parser are sound (verified separately via npx tsx -e quickcheck). Next iter U-HURCO-ROUNDTRIP-TSX-SIDECAR will switch to sidecar .ts file + node --import=tsx invocation to bypass the quoting trap. Until then operator can run V11 emit directly via the 6 pre-shipped state/shared/hurco-winmax-proveout/parts/P1-P6-*.hnc files in WinMax.

**Commit:** `79686376c62c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T22:33:43-05:00
**Tags:** hurco-vm30i-full-psn-ms0, u-hurco-roundtrip-tsx-runtime, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-ROUNDTRIP-TSX-RUNTIME (slot:echo iter10 2026-05-24): tsx-runtime variant of roundtrip harness. Spawns npx tsx to import src/.ts directly, bypassing the stale dist/engines/*.js (lags days behind source on this PC due to tsc cycle time + peer-slot CPU contention). KNOWN-ISSUE: Windows shell:true child_process invocation eats the inline tsx -e payload, returns exit 255 with no output. Engine logic + parser are sound (verified separately via npx tsx -e quickcheck). Next iter U-HURCO-ROUNDTRIP-TSX-SIDECAR will switch to sidecar .ts file + node --import=tsx invocation to bypass the quoting trap. Until then operator can run V11 emit directly via the 6 pre-shipped state/shared/hurco-winmax-proveout/parts/P1-P6-*.hnc files in WinMax.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-ROUNDTRIP-TSX-RUNTIME (slot:echo iter10 2026-05-24): tsx-runtime variant of roundtrip harness. Spawns npx tsx to import src/.ts directly, bypassing the stale dist/engines/*.js (lags days behind source on this PC due to tsc cycle time + peer-slot CPU contention). KNOWN-ISSUE: Windows shell:true child_process invocation eats the inline tsx -e payload, returns exit 255 with no output. Engine logic + parser are sound (verified separately via npx tsx -e quickcheck). Next iter U-HURCO-ROUNDTRIP-TSX-SIDECAR will switch to sidecar .ts file + node --import=tsx invocation to bypass the quoting trap. Until then operator can run V11 emit directly via the 6 pre-shipped state/shared/hurco-winmax-proveout/parts/P1-P6-*.hnc files in WinMax.
```

## Files touched (2)
- scripts/hurco-jmdie-roundtrip-tsx.mjs | 283 ++++++++++++++++++++++++++++++++++
- 1 file changed, 283 insertions(+)

## Lessons surfaced in commit body
- til then operator can run V11 emit directly via the 6 pre-shipped state/shared/hurco-winmax-proveout/parts/P1-P6-*.hnc files in WinMax.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 79686376c62c`
- Milestone envelope: `mcp-server/data/milestones/HURCO-VM30I-FULL-PSN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._