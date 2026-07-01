# HERMES-UTIL/U-HERMES-VERIFIED-TIER-WIRE — [MAIN-FORCE] [HERMES-UTIL]/U-HERMES-VERIFIED-TIER-WIRE (slot:alpha): wire tiered verified-offload into the canonical ollama-offload.mjs CLI (classify-strong + digest-strong) + fix makeHermesRunner missing-model. R15 wire: offloadClassifyStrong/offloadDigestStrong reuse the byte-identical classify/digest prompts+verifiers+safe-floor of their non-strong siblings, routing Hermes-strong -> Ollama -> same fallback. Live validation FOUND + FIXED a real bug: makeHermesRunner sent model:undefined when the CLI omitted --hermes-model -> proxy rejected -> strong tier silently descended; now defaults to PRISM_HERMES_MODEL || grok-4.3. LIVE post-fix: classify-strong CLI returned source=hermes value=lathe verified tier=strong. 24/24 offload + 20/20 tiered tests; 2-arm scrutiny BOTH PASS (mutation-tested, 0 P0/P1/P2).

**Commit:** `a6a6243a2a0c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T12:04:58-05:00
**Tags:** hermes-util, u-hermes-verified-tier-wire, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-VERIFIED-TIER-WIRE (slot:alpha): wire tiered verified-offload into the canonical ollama-offload.mjs CLI (classify-strong + digest-strong) + fix makeHermesRunner missing-model. R15 wire: offloadClassifyStrong/offloadDigestStrong reuse the byte-identical classify/digest prompts+verifiers+safe-floor of their non-strong siblings, routing Hermes-strong -> Ollama -> same fallback. Live validation FOUND + FIXED a real bug: makeHermesRunner sent model:undefined when the CLI omitted --hermes-model -> proxy rejected -> strong tier silently descended; now defaults to PRISM_HERMES_MODEL || grok-4.3. LIVE post-fix: classify-strong CLI returned source=hermes value=lathe verified tier=strong. 24/24 offload + 20/20 tiered tests; 2-arm scrutiny BOTH PASS (mutation-tested, 0 P0/P1/P2).

## Body
```
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-VERIFIED-TIER-WIRE (slot:alpha): wire tiered verified-offload into the canonical ollama-offload.mjs CLI (classify-strong + digest-strong) + fix makeHermesRunner missing-model. R15 wire: offloadClassifyStrong/offloadDigestStrong reuse the byte-identical classify/digest prompts+verifiers+safe-floor of their non-strong siblings, routing Hermes-strong -> Ollama -> same fallback. Live validation FOUND + FIXED a real bug: makeHermesRunner sent model:undefined when the CLI omitted --hermes-model -> proxy rejected -> strong tier silently descended; now defaults to PRISM_HERMES_MODEL || grok-4.3. LIVE post-fix: classify-strong CLI returned source=hermes value=lathe verified tier=strong. 24/24 offload + 20/20 tiered tests; 2-arm scrutiny BOTH PASS (mutation-tested, 0 P0/P1/P2).
```

## Files touched (5)
- scripts/lib/verified-offload-tiered.mjs      |  9 ++++++++-
- scripts/lib/verified-offload-tiered.test.mjs |  8 ++++++++
- scripts/ollama-offload.mjs                   | 73 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- scripts/ollama-offload.test.mjs              | 91 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 4 files changed, 178 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- TIL]/U-HERMES-VERIFIED-TIER-WIRE (slot:alpha): wire tiered verified-offload into the canonical ollama-offload.mjs CLI (classify-strong + digest-strong) + fix makeHermesRunner missing-model. R15 wire: offloadClassifyStrong/offloadDigestStrong reuse the byte-identical classify/digest prompts+verifiers+safe-floor of their non-strong siblings, routing Hermes-strong -> Ollama -> same fallback. Live valida

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a6a6243a2a0c`
- Milestone envelope: `mcp-server/data/milestones/HERMES-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._