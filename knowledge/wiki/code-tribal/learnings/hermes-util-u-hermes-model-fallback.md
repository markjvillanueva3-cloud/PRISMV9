# HERMES-UTIL/U-HERMES-MODEL-FALLBACK — [MAIN-FORCE] [HERMES-UTIL]/U-HERMES-MODEL-FALLBACK (slot:zulu): improve hermes offload utilization -- when the proxy serves chat but /v1/models lists nothing (live-observed: empty listing while bravo profile serves grok-4.3), resolveModel returned null and the WHOLE hermes lane was abandoned to ollama. Add FALLBACK_HERMES_MODEL (env PRISM_HERMES_FALLBACK_MODEL, default grok-4.3) + pure pickModel({explicit,listed,fallback})->{model,source} wired into both call sites; a chat is now ATTEMPTED with the configured model + an R12 stderr note when fallback fires. Safety net UNCHANGED: a truly-down proxy network-fails into the same shouldFallback->ollama degrade. Cost note: a non-listing-but-up proxy now incurs a paid grok attempt (intended per 'utilize hermes'; opt-out PRISM_HERMES_FALLBACK_MODEL= empty, documented). +6 pickModel tests (63/63); 2-arm scrutiny PASS (P2 DRY note-dedup deferred, non-load-bearing).

**Commit:** `fe1028f72d90` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T11:29:45-05:00
**Tags:** hermes-util, u-hermes-model-fallback, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-MODEL-FALLBACK (slot:zulu): improve hermes offload utilization -- when the proxy serves chat but /v1/models lists nothing (live-observed: empty listing while bravo profile serves grok-4.3), resolveModel returned null and the WHOLE hermes lane was abandoned to ollama. Add FALLBACK_HERMES_MODEL (env PRISM_HERMES_FALLBACK_MODEL, default grok-4.3) + pure pickModel({explicit,listed,fallback})->{model,source} wired into both call sites; a chat is now ATTEMPTED with the configured model + an R12 stderr note when fallback fires. Safety net UNCHANGED: a truly-down proxy network-fails into the same shouldFallback->ollama degrade. Cost note: a non-listing-but-up proxy now incurs a paid grok attempt (intended per 'utilize hermes'; opt-out PRISM_HERMES_FALLBACK_MODEL= empty, documented). +6 pickModel tests (63/63); 2-arm scrutiny PASS (P2 DRY note-dedup deferred, non-load-bearing).

## Body
```
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-MODEL-FALLBACK (slot:zulu): improve hermes offload utilization -- when the proxy serves chat but /v1/models lists nothing (live-observed: empty listing while bravo profile serves grok-4.3), resolveModel returned null and the WHOLE hermes lane was abandoned to ollama. Add FALLBACK_HERMES_MODEL (env PRISM_HERMES_FALLBACK_MODEL, default grok-4.3) + pure pickModel({explicit,listed,fallback})->{model,source} wired into both call sites; a chat is now ATTEMPTED with the configured model + an R12 stderr note when fallback fires. Safety net UNCHANGED: a truly-down proxy network-fails into the same shouldFallback->ollama degrade. Cost note: a non-listing-but-up proxy now incurs a paid grok attempt (intended per 'utilize hermes'; opt-out PRISM_HERMES_FALLBACK_MODEL= empty, documented). +6 pickModel tests (63/63); 2-arm scrutiny PASS (P2 DRY note-dedup deferred, non-load-bearing).
```

## Files touched (3)
- scripts/ask-hermes.mjs      | 46 ++++++++++++++++++++++++++++++++++++++++++++--
- scripts/ask-hermes.test.mjs | 39 +++++++++++++++++++++++++++++++++++++++
- 2 files changed, 83 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- TIL]/U-HERMES-MODEL-FALLBACK (slot:zulu): improve hermes offload utilization -- when the proxy serves chat but /v1/models lists nothing (live-observed: empty listing while bravo profile serves grok-4.3), resolveModel returned null and the WHOLE hermes lane was abandoned to ollama. Add FALLBACK_HERMES_MODEL (env PRISM_HERMES_FALLBACK_MODEL, default grok-4.3) + pure pickModel({explicit,listed,fallback}
- note: a non-listing-but-up proxy now incurs a paid grok attempt (intended per 'utilize hermes'; opt-out PRISM_HERMES_FALLBACK_MODEL= empty, documented). +6 pickModel tests (63/63); 2-arm scrutiny PASS (P2 DRY note-dedup deferred, non-load-bearing).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fe1028f72d90`
- Milestone envelope: `mcp-server/data/milestones/HERMES-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._