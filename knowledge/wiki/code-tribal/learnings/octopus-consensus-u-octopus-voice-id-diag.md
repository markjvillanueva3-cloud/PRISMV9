# OCTOPUS-CONSENSUS/U-OCTOPUS-VOICE-ID-DIAG — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OCTOPUS-CONSENSUS]/U-OCTOPUS-VOICE-ID-DIAG (slot:bravo): model-tag ollama voice ids so a dropped local voice is diagnosable

**Commit:** `1b7bce6a91c5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T04:15:30-05:00
**Tags:** octopus-consensus, u-octopus-voice-id-diag, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OCTOPUS-CONSENSUS]/U-OCTOPUS-VOICE-ID-DIAG (slot:bravo): model-tag ollama voice ids so a dropped local voice is diagnosable

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OCTOPUS-CONSENSUS]/U-OCTOPUS-VOICE-ID-DIAG (slot:bravo): model-tag ollama voice ids so a dropped local voice is diagnosable

The octopus ledger collapsed BOTH diverse-panel local voices to id:'ollama' --
so when the VRAM-runnable gate drops one (the transient-co-residency caveat from
U-OCTOPUS-PANEL-CORESIDENT), the ledger showed an indistinguishable single 'ollama'
voice: a 1-voice regression was NOT diagnosable. mapConsensusToLedger now tags the
ollama voice id with its model (ollama:<model>) -- ollama is the only vendor fielding
multiple models; single-model vendors (anthropic/openai/xai/google) keep the bare
vendor id (back-compat). The cluster signature is verdict-pattern based (octopus-record-lib
buildOctopusEntry), NOT id-based, so cross-run comparability is unaffected (verified).

This is the honest, NON-SPECULATIVE half of reviewer-C's caveat: rather than build a
prewarm/force-probe coordination for an UNREPRODUCED edge case (over-engineering per R9),
make the edge case OBSERVABLE if it ever occurs (R12 fail-loud/diagnosability).

WIRE: mapConsensusToLedger feeds octopus-runs.jsonl via every dispatch caller. TEST: +2
(distinct ollama ids + single-vendor back-compat); 13/13 dispatch. VALIDATE (live): new
ledger entry = [ollama:qwen2.5-coder:32b, ollama:gpt-oss:20b] both answered, voiceCount:2.
```

## Files touched (3)
- scripts/lib/octopus-dispatch.mjs      | 10 +++++++++-
- scripts/lib/octopus-dispatch.test.mjs | 37 +++++++++++++++++++++++++++++++++++++
- 2 files changed, 46 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1b7bce6a91c5`
- Milestone envelope: `mcp-server/data/milestones/OCTOPUS-CONSENSUS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._