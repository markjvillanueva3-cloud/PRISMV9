# HERMES-PARITY/U-HERMES-OLLAMA-PARITY-L3 — [MAIN-FORCE] [HERMES-PARITY]/U-HERMES-OLLAMA-PARITY-L3 (slot:alpha): offload-routing Hermes-parity (verify + principled-decline note)

**Commit:** `3fbb4a7d561e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T14:26:30-05:00
**Tags:** hermes-parity, u-hermes-ollama-parity-l3, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-PARITY]/U-HERMES-OLLAMA-PARITY-L3 (slot:alpha): offload-routing Hermes-parity (verify + principled-decline note)

## Body
```
[MAIN-FORCE] [HERMES-PARITY]/U-HERMES-OLLAMA-PARITY-L3 (slot:alpha): offload-routing Hermes-parity (verify + principled-decline note)

L3 = offload-routing parity. VERIFIED already satisfied in its correct home + documented why
two other routers correctly stay Hermes-free (R7 conflict-resolution, not under-delivery):

1. task-substrate-router.mjs -- ALREADY the Hermes-aware offload router (no change needed):
   dedicated  substrate row gated by shouldUseWorkflow + ask-hermes.mjs surfaced in the
   ollama lane's . LIVE E2E (itemCount:40/openEnded/needsVerification): hermesGated:true,
   hermes lane present, concurrencyCap 16, ask-hermes-in-ollama-lane true.
2. ollama-task-offloader.mjs -- Ollama-down correctly routes to CHEAP Claude (haiku/sonnet) per
   the fleet ladder (Ollama->Sonnet/Haiku->Opus). Inserting PAID Hermes as the default fallback
   would burn Grok money on every mechanical task whenever Ollama hiccups -- the cost anti-pattern.
   Left intentionally Hermes-free.
3. local-llm-task-router.mjs (THIS file) -- a doc NOTE only. Its charter is invariant #3
   IP-STAYS-LOCAL + [[reference_hermes_router_u1_2026_06_04]] 'LOCAL ONLY -- manufacturing IP
   never leaves the box'; a cloud (Hermes) escalation rung would philosophy-fork it (R7/R11).
   The note records the decision so a future chat does not re-open this as a false gap.

Reviewer scrutiny PASS (0 findings): enumerated all 22 *router*.mjs, confirmed no offload-home
that SHOULD route to Hermes was left un-wired (multi-provider-router already refs Hermes as a
rate-limit fallback; effort-tier-router is orthogonal). Both router suites green (20/20 + 9/9).
```

## Files touched (2)
- scripts/lib/local-llm-task-router.mjs | 9 +++++++++
- 1 file changed, 9 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3fbb4a7d561e`
- Milestone envelope: `mcp-server/data/milestones/HERMES-PARITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._