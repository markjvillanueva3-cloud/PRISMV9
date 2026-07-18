---
name: reference_post_ship_hurco-vm30i-full-psn-ms0-u-hurco-roundtrip-tsx-runtime
description: Auto-distilled learnings from shipping HURCO-VM30I-FULL-PSN-MS0/U-HURCO-ROUNDTRIP-TSX-RUNTIME (commit 79686376c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.906Z
aliases: reference_post_ship_hurco-vm30i-full-psn-ms0-u-hurco-roundtrip-tsx-runtime
---


# HURCO-VM30I-FULL-PSN-MS0/U-HURCO-ROUNDTRIP-TSX-RUNTIME

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-ROUNDTRIP-TSX-RUNTIME (slot:echo iter10 2026-05-24): tsx-runtime variant of roundtrip harness. Spawns npx tsx to import src/.ts directly, bypassing the stale dist/engines/*.js (lags days behind source on this PC due to tsc cycle time + peer-slot CPU contention). KNOWN-ISSUE: Windows shell:true child_process invocation eats the inline tsx -e payload, returns exit 255 with no output. Engine logic + parser are sound (verified separately via npx tsx -e quickcheck). Next iter U-HURCO-ROUNDTRIP-TSX-SIDECAR will switch to sidecar .ts file + node --import=tsx invocation to bypass the quoting trap. Until then operator can run V11 emit directly via the 6 pre-shipped state/shared/hurco-winmax-proveout/parts/P1-P6-*.hnc files in WinMax.

**Shipped:** 2026-05-24T22:33:43-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[hurco-vm30i-full-psn-ms0-u-hurco-roundtrip-tsx-runtime]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._