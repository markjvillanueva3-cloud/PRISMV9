---
name: reference_scrutiny_gate_sessionid_keying_mismatch_2026_06_16
description: scrutinize-before-stop gate keys the ledger on the FULL harness uuid, but slot-bind + most chat calls use the SHORT claude-<8hex> id -- marking the 3-of-3 under the short key leaves the gate re-blocking under the full uuid (slot:oscar, 2026-06-16)
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:47.150Z
aliases: reference_scrutiny_gate_sessionid_keying_mismatch_2026_06_16
---


# Scrutiny gate session-id keying mismatch (short chatId vs full uuid)

**Symptom (live, 2026-06-16 slot:oscar):** completed a real 3-of-3 review (arms A/B/C all PASS on the
U-FT-CRON commits) and recorded it via `scrutiny-3way.mjs --mark-* --session-id claude-3441c192`
(the SHORT id the slot-bind-enforce hook + chat-slots/handoff/slot-task-claim calls all use). The
`scrutinize-before-stop` Stop gate then KEPT FIRING ("3-of-3 required, Attempt 1/3") for the SAME
session.

**Root cause:** the Stop gate looks up the ledger by the **full harness session_id**
(`3441c192-7f7a-4e0b-8bf4-5b5a9b1eb28e`), but the marks landed under the **short** key
`claude-3441c192`. Two ledger entries, two keys -> the gate's full-uuid lookup never finds the
short-key PASS, so it re-blocks. Verified: `SCRUTINY_LEDGER.json` had `"sessionId":"claude-3441c192"`
with all three reviewed=true, while the gate quoted `3441c192-7f7a-4e0b-8bf4-5b5a9b1eb28e`.

**Workaround (what cleared it):** re-mark the three arms under the FULL uuid:
`node .claude/scripts/scrutiny-3way.mjs --mark-opus|--mark-claude|--mark-analyst pass --session-id <FULL-UUID>`.

**The trap:** slot-bind-enforce explicitly says "use claude-<8hex> for all chat-slots / slot-task-claim
/ handoff calls this session" -- so a chat NATURALLY marks the scrutiny ledger with the short id too,
which is exactly the id the gate does NOT read. Same class as the documented HS-01 env-anchor keying
bug ([[reference_hs01_env_anchor_fleetwide_2026_06_10]]).

**Proper fix (fleet-infra, NOT applied unilaterally overnight -- modifying the shared Stop gate is
golf/operator territory):** normalize the session-id at BOTH the mark and the gate-lookup -- accept
either form by canonicalizing to one (e.g. derive the short 8-hex from a full uuid, or look up under
both). A small key-normalization in `scrutiny-3way.mjs` (mark) + `scrutinize-before-stop.mjs` (lookup)
would end the re-block. Until then: mark under the FULL uuid the gate prints in its block message.

**Overnight-loop impact:** every Stop re-blocks until marked under the full uuid -- friction for any
autonomous /loop. The full-uuid mark is the per-Stop workaround.
