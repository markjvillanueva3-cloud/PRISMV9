# TOKEN-SAVINGS/U-CHAT-TOKEN-AUTH-CONTRADICTION — [MAIN-FORCE] [TOKEN-SAVINGS]/U-CHAT-TOKEN-AUTH-CONTRADICTION (slot:alpha): byte-estimate critical can't actuate /compact when authoritative usage contradicts it (AW-1)

**Commit:** `17eb3a1acf9d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T19:27:54-05:00
**Tags:** token-savings, u-chat-token-auth-contradiction, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS]/U-CHAT-TOKEN-AUTH-CONTRADICTION (slot:alpha): byte-estimate critical can't actuate /compact when authoritative usage contradicts it (AW-1)

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS]/U-CHAT-TOKEN-AUTH-CONTRADICTION (slot:alpha): byte-estimate critical can't actuate /compact when authoritative usage contradicts it (AW-1)

Observed first-hand + repeatedly THIS session: zulu-advisory-inject emitted
'pressure=critical ~1004K -> /compact recommended' while slot-context-bundle
(same chat) emitted 'token-zone-green / noop'. The model got contradictory
readings of its own context every turn -> wasted attention + false-/compact risk.

Root cause: readChatPressure (chat-token-watch.mjs, the shared lib feeding
zulu-advisory / zulu-orchestrator-sweep / token-awareness) is sidecar-first but
falls back to the byte-estimate when the authoritative per-turn-usage sidecar is
>180s stale (routine on long agent/scrutiny turns). The byte-estimate over-reports
(transcript bloat); a value in [940K critAt, 1.1M suspect] classifies 'critical' --
above the hard floor, below the existing >1.1M SUSPECT downgrade. So a phantom
critical actuates while the authoritative signal says green.

Fix: AUTHORITATIVE-CONTRADICTION guard. In the byte-estimate path, a 'critical'
that is NOT already suspect re-reads the LAST-KNOWN authoritative sidecar with a
wider 30min CONTRADICTION_TTL_MS; if it exists AND was clean/warn, downgrade to
'warn' (+contradictedBy). Downgrades ONLY on active contradiction -> ZERO
missed-critical risk (absent authoritative, or an authoritative-critical, leaves
the byte-est critical untouched). Safe because a stale sidecar = a frozen tool-gap
(context can't grow green->critical without a prompt refreshing the sidecar).
Shared lib -> zulu-advisory + zulu-orchestrator + token-awareness all fixed at
once. Knob PRISM_CHAT_TOKEN_CONTRADICTION_DISABLE=1. +5 R9 tests (47/47):
downgrade-on-green, stays-critical-on-{absent,RED-corroborate,ancient-green}, knob-off.
Mem [[reference_context_awareness_improvements_2026_06_21]] AW-1.
```

## Files touched (3)
- scripts/lib/chat-token-watch.mjs      | 34 ++++++++++++++++++++++++++++++++++
- scripts/lib/chat-token-watch.test.mjs | 64 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 98 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 17eb3a1acf9d`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._