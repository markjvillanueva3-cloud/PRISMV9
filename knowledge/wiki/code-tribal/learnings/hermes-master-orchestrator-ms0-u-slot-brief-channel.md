# HERMES-MASTER-ORCHESTRATOR-MS0/U-SLOT-BRIEF-CHANNEL — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MASTER-ORCHESTRATOR-MS0]/U-SLOT-BRIEF-CHANNEL (slot:bravo): targeted orchestrator→slot brief channel — the keystone for Hermes-as-ZULU-master

**Commit:** `97cf13fee44b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T19:37:34-05:00
**Tags:** hermes-master-orchestrator-ms0, u-slot-brief-channel, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MASTER-ORCHESTRATOR-MS0]/U-SLOT-BRIEF-CHANNEL (slot:bravo): targeted orchestrator→slot brief channel — the keystone for Hermes-as-ZULU-master

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MASTER-ORCHESTRATOR-MS0]/U-SLOT-BRIEF-CHANNEL (slot:bravo): targeted orchestrator→slot brief channel — the keystone for Hermes-as-ZULU-master

slot-brief-inject.mjs (UserPromptSubmit): the Hermes app is a slot-LESS ZULU master orchestrator running as a SEPARATE process — it cannot inject into a Claude slot's context. This is the missing channel: the orchestrator (or any chat issuing a cross-slot directive) writes state/shared/slot-briefs/<slot>.md; this hook surfaces it into THAT slot's next prompt and CONSUMES it (atomic rename → _delivered/<slot>-<intMtimeMs>-<hash>.md, consume-once + audit).

Distinct from siblings: slot-soul-inject = PERSISTENT personality (every prompt); chat-bus = BROADCAST; this = TARGETED + consume-once. Mirrors slot-soul-inject's slot resolution; exports pure helpers (resolveSlot/briefHash/formatStamp/truncateBrief/buildBriefBlock) behind an invokedAsScript guard so tests import cleanly. Never-throw UserPromptSubmit contract (every path → {continue:true}). At-most-once delivery (archive-before-emit); orchestrator confirms pickup via bus/commit-log. Knobs: PRISM_SLOT_BRIEF_INJECT_{DISABLE,VERBOSE}.

Hardening (scrutiny arm-B P1): slot keys become filename components — resolveSlot now rejects non-/^[a-z]+$/ keys (path-traversal defense if chat-slots.json is ever corrupted/hand-edited).

Lane: state/shared/slot-briefs/{README.md,.gitignore} — transient <slot>.md + _delivered/ git-ignored, only README tracked. Wired into UserPromptSubmit after slot-soul-inject (machine-local settings.json, C:+H: verified). 21/21 tests (pure-fn + spawn-based consume-once integration). Per-file scrutiny 2-arm PASS (A: no P0/P1; B: PASS + the P1 now fixed).
```

## Files touched (5)
- .claude/hooks/__tests__/slot-brief-inject.test.mjs | 184 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/slot-brief-inject.mjs                | 143 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/slot-briefs/.gitignore                |   6 +++++
- state/shared/slot-briefs/README.md                 |  37 ++++++++++++++++++++++++++
- 4 files changed, 370 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 97cf13fee44b`
- Milestone envelope: `mcp-server/data/milestones/HERMES-MASTER-ORCHESTRATOR-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._