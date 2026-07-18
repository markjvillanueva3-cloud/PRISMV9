# TOKEN-SAVINGS/U-OLLAMA-OFFLOAD-SUCCESS-RATE — [MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-OFFLOAD-SUCCESS-RATE (slot:alpha): make the offload success rate REAL -- ask-ollama recorded only successes (faking 100%)

**Commit:** `11743cf4415f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T22:20:01-05:00
**Tags:** token-savings, u-ollama-offload-success-rate, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-OFFLOAD-SUCCESS-RATE (slot:alpha): make the offload success rate REAL -- ask-ollama recorded only successes (faking 100%)

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-OFFLOAD-SUCCESS-RATE (slot:alpha): make the offload success rate REAL -- ask-ollama recorded only successes (faking 100%)

ROOT CAUSE: ask-ollama main() recorded an executed-offload event ONLY on exitCode 0
(recordExecution). Every failure (Ollama down / timeout / non-200 / bad output -> exitCode 3)
recorded NOTHING -> the dashboard's "ask-ollama 18/18 offloaded, 0 kept" was a 100%-success
ILLUSION that hid every failed offload (work silently fell back to Claude, uncounted). The
offload SUCCESS RATE was unmeasurable.

FIX (measurement-honesty; alpha-domain; no routing/safety change):
- ask-ollama recordFailure(): a failed offload attempt (exitCode != 0, model-offload modes --
  NOT local viz/rerank) records decision:"keep" + extras.mode:"failed", symmetric with
  recordExecution's scope so numerator/denominator stay consistent. Fail-soft + same
  PRISM_ASK_OLLAMA_TELEMETRY=0 kill switch.
- dashboard summarize(): per-bridge attempts/failures/successRate=offloaded/attempts + fleet
  bridgeSuccessRate; advisory flags a DEGRADED bridge (<90% with >=5 attempts) so an
  Ollama-down / cold-model / timeout regression surfaces instead of hiding as 100%.

VALIDATE (live): "Offload SUCCESS RATE (bridges, lifetime): 99.8% (875/877) -- healthy";
ask-hermes 99.8% (2 failed) now visible. Tests: dashboard 35/35 (+4), ask-ollama 48/48 (+2
incl adversarial knob/no-mode/import-fail).
```

## Files touched (5)
- scripts/__tests__/ollama-offload-dashboard.test.mjs | 39 +++++++++++++++++++++++++++++++++++++++
- scripts/ask-ollama.mjs                              | 32 ++++++++++++++++++++++++++++++++
- scripts/ask-ollama.test.mjs                         | 40 +++++++++++++++++++++++++++++++++++++++-
- scripts/ollama-offload-dashboard.mjs                | 47 +++++++++++++++++++++++++++++++++++++++++++++--
- 4 files changed, 155 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 11743cf4415f`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._