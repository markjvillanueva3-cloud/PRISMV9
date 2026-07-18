# HERMES-UTIL/U-HERMES-TIER-OLLAMA-TIMEOUT-KNOB — [MAIN-FORCE] [HERMES-UTIL]/U-HERMES-TIER-OLLAMA-TIMEOUT-KNOB (slot:alpha): env-knob + NaN-harden the verified-offload Ollama-tier timeout

**Commit:** `119a1c557d3c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T13:16:47-05:00
**Tags:** hermes-util, u-hermes-tier-ollama-timeout-knob, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-TIER-OLLAMA-TIMEOUT-KNOB (slot:alpha): env-knob + NaN-harden the verified-offload Ollama-tier timeout

## Body
```
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-TIER-OLLAMA-TIMEOUT-KNOB (slot:alpha): env-knob + NaN-harden the verified-offload Ollama-tier timeout

makeOllamaRunner hardcoded timeoutMs:30000 (no env knob) while the Hermes tier used DEFAULT_TIMEOUT_MS (PRISM_TIERED_OFFLOAD_TIMEOUT_MS). The sibling ollama-route summarize timeout had to be bumped 9s->30s IN CODE under GPU load (2026-06-10 zulu); a knob lets ops raise the local tier under load with no code change. Adds DEFAULT_OLLAMA_TIMEOUT_MS (PRISM_TIERED_OLLAMA_TIMEOUT_MS||30000), exported for a hermetic test. Both tier constants now use Number(X)||default -- NaN-safe: a non-numeric env value falls through to the default instead of NaN (2-arm scrutiny P2). +1 R9 forwarding/default test. tiered 21/21, consumer 24/24, both parse; 2-arm scrutiny BOTH PASS.
```

## Files touched (3)
- scripts/lib/verified-offload-tiered.mjs      |  9 +++++++--
- scripts/lib/verified-offload-tiered.test.mjs | 18 ++++++++++++++++++
- 2 files changed, 25 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- TIL]/U-HERMES-TIER-OLLAMA-TIMEOUT-KNOB (slot:alpha): env-knob + NaN-harden the verified-offload Ollama-tier timeout

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 119a1c557d3c`
- Milestone envelope: `mcp-server/data/milestones/HERMES-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._