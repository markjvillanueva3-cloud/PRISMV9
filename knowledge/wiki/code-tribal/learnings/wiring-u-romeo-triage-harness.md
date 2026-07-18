# WIRING/U-ROMEO-TRIAGE-HARNESS — [MAIN] [MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-HARNESS (slot:romeo): autonomous wiring-triage harness + ranked queue + cron

**Commit:** `86ebbf15f5ac` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T20:28:13-05:00
**Tags:** wiring, u-romeo-triage-harness, auto-distilled

## Subject
[MAIN] [MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-HARNESS (slot:romeo): autonomous wiring-triage harness + ranked queue + cron

## Body
```
[MAIN] [MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-HARNESS (slot:romeo): autonomous wiring-triage harness + ranked queue + cron

The romeo (wiring-specialist) autonomous-loop harness the operator asked for
("harnessed loops and crons to complete tasks autonomously").

scripts/romeo-wiring-triage.mjs turns the raw UNWIRED-ENGINE-AUDIT (54 unwired
engines on MAIN) into a TRUSTWORTHY ROI-ranked queue by adding two gates the raw
audit lacks:
  1. singleton-constructability -- reads each engine source; a DI engine
     (required ctor args, no `export const x = new X()` singleton) is NOT a clean
     wire (romeo refuses wiring-an-engine-that-throws-on-every-call) -> NEEDS-REVIEW.
  2. dispatcher-existence -- a suggested dispatcher with no dispatcher file
     (e.g. prism_academy) is blocked on the owner slot to create it -> NEEDS-REVIEW.
Plus internal-layer detection (Adapter/Bridge/Client/Test/Shim, incl. the
`+Engine` wrapped form) -> WIRE-EXEMPT, and AI/owner-internal (Hermes/Grok/
neural/lora) -> CROSS-DOMAIN (owner decides; romeo refuses cross-domain wiring
w/o justification).

Live partition: 54 -> 21 WIREABLE / 5 cross-domain / 23 WIRE-EXEMPT / 5 review.
The WIREABLE set is the pick-list `/checkin-romeo /loop` consumes; #1 verified-
clean = CounterfactualMillEngine -> prism_mill (zero-arg singleton, dispatcher
exists). Deterministic core (R5); `--ollama` adds a per-candidate wiring hint via
the local model (token-heavy work off the Claude context).

VERIFY:
- node scripts/romeo-wiring-triage.mjs -> writes state/shared/ROMEO-WIRING-QUEUE.md.
- node --test scripts/romeo-wiring-triage.test.mjs -> 7/7 (partition completeness +
  Bridge-is-exempt + DI-is-review + missing-dispatcher-is-review + clean-singleton-
  is-wireable -- fails loud if classification drifts). execPath spawn (not bare
  "node" -- Windows ENOENT). Audit MUST come from MAIN, not stale slot/romeo
  ([[feedback_romeo_check_main_not_slot_for_dormancy]]).
```

## Files touched (4)
- scripts/romeo-wiring-triage.mjs      | 214 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/romeo-wiring-triage.test.mjs |  80 +++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/ROMEO-WIRING-QUEUE.md   |  75 ++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 369 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 86ebbf15f5ac`
- Milestone envelope: `mcp-server/data/milestones/WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._