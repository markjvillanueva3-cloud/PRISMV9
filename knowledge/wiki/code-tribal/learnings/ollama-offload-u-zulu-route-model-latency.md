# OLLAMA-OFFLOAD/U-ZULU-ROUTE-MODEL-LATENCY — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ZULU-ROUTE-MODEL-LATENCY (slot:zulu): point the auto-route gist model at the fast trivial tier so reroutes actually complete (0 offloads -> working offloads) + fix 6 pre-existing isGistSafe test drift

**Commit:** `57caa974e77d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T19:45:57-05:00
**Tags:** ollama-offload, u-zulu-route-model-latency, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ZULU-ROUTE-MODEL-LATENCY (slot:zulu): point the auto-route gist model at the fast trivial tier so reroutes actually complete (0 offloads -> working offloads) + fix 6 pre-existing isGistSafe test drift

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ZULU-ROUTE-MODEL-LATENCY (slot:zulu): point the auto-route gist model at the fast trivial tier so reroutes actually complete (0 offloads -> working offloads) + fix 6 pre-existing isGistSafe test drift

ROOT CAUSE (live-diagnosed): auto-route has been ON since 2026-05-22 (sierra) and
the model present, yet byHook.ollama-route-pretooluse showed 593 fired / 0
offloaded. The summary runs INSIDE the Read path under defaultOllamaSummarize's
30s timeout, but the configured model was qwen2.5-coder:32b -- the 32B reasoner
cold-loads SLOWER than 30s, so every reroute timed out -> fail-open -> raw Read
-> the model never warms -> chicken-and-egg -> permanent 0 offloads. The earlier
BLACKWELL re-point to 32b (2026-06-04) fixed model PRESENCE (after the 7b was
deleted) but silently broke LATENCY.

EVIDENCE (live, same 279KB .log via runRoute):
  qwen2.5-coder:32b  -> pass @ 30042ms (timeout, fail-open)   <- the bug
  qwen2.5-coder:7b   -> reroute @ 10770ms (real summary)
  qwen2.5-coder:1.5b -> reroute @ 7825ms cold / 1750ms warm   <- chosen
A log/dump GIST is a TRIVIAL mechanical task; it belongs on the trivial tier.

FIX: ollama-route-config.json model 'qwen2.5-coder:32b' -> 'qwen2.5-coder:1.5b'
(doctrine ':1.5b trivial' kept tier -- survives the 7b-style retirement that
broke this before; in /api/tags). mode/minKb unchanged. Revert path unchanged
(write 'suggest' or PRISM_OLLAMA_ROUTE_AUTO=0). Validated: shipped config (no env
override) now reroutes a real gist-safe log in 1750ms via qwen2.5-coder:1.5b.

REGRESSION GUARD + DRIFT FIX (ollama-route-pretooluse.test.mjs): +1 test pinning
the shipped config to auto-mode + a Read-path-fast model (fails if re-pointed at
a slow reasoner -- the exact churn that broke the offloader twice). Also fixed 6
PRE-EXISTING failures: the isGistSafe gate (BLACKWELL-TOKEN-SYNERGY-MS0) downgrades
exact-value .json to suggest, but 6 reroute-expecting tests still used a .json
fixture -> corrected to a gist-safe .log fixture (intent preserved, no assertion
weakened). 36/36 pass (was 30/36).

NOTE: the deeper hardening (runRoute resolves the model via resolveSynthesisModel
so a future retirement/latency-mismatch never re-breaks this) remains HERMES-
EFFICIENCY-ROUTER U1.
```

## Files touched (3)
- .claude/hooks/ollama-route-pretooluse.test.mjs | 43 +++++++++++++++++++++++++++++++++++++------
- mcp-server/data/state/ollama-route-config.json |  4 ++--
- 2 files changed, 39 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- till used a .json
- NOTE: the deeper hardening (runRoute resolves the model via resolveSynthesisModel

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 57caa974e77d`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._