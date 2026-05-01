# autoPreCompactionDump fires at >=55% pressure, not waiting for 70%
Type: decision | Phase: DA | MS: MS1
Date: 2026-02-17 | Confidence: verified
Tags: compaction, cadence, state_preservation, DA-MS1

Gap between 55-70% had no proactive state preservation. Now writes CURRENT_POSITION.md + COMPACTION_SNAPSHOT.md at 55%. Wired into autoHookWrapper.ts pressure block.
