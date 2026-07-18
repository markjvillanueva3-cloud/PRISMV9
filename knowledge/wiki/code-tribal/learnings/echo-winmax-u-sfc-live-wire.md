# ECHO-WINMAX/U-SFC-LIVE-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-SFC-LIVE-WIRE: wire the conformance verifier into the live SFC node (prism_calc:speed_feed)

**Commit:** `933a778a5468` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T12:33:46-05:00
**Tags:** echo-winmax, u-sfc-live-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-SFC-LIVE-WIRE: wire the conformance verifier into the live SFC node (prism_calc:speed_feed)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-SFC-LIVE-WIRE: wire the conformance verifier into the live SFC node (prism_calc:speed_feed)

Operator directive: "wire into sfc node, posts need it anyways." The conformance verifier now
recomputes feeds/speeds via the LIVE SFC (prism_calc:speed_feed over the :3100 HTTP bridge) and
compares the post's emitted S to it — breaking the circularity of the static spec-rpm check
(the spec generated the NC, so it trivially matched). This is the real "100% correct relative to
the math our SFC should be generating" leg.

- post-nc-conformance.mjs: sfcRecompute() (inch->mm conversion — SFC is metric-native; a 2.0 is
  read as 2mm) + liveSfcLeg() (per-tool NC-rpm vs SFC-rpm within ±tolerance, default 20%) +
  operationFor() (tool type -> SFC operation). CLI --live flag. Fail-soft if MCP down/gate-blocked.
- prism-base-job.mjs: + MACHINE (Hurco VMX42SRTi, spindle.max_rpm 12000 / power 18kW) — the SFC's
  pre-machine-completeness-gate REQUIRES spindle limits, and the post needs the same machine
  context, so it lives in the single source of truth.
- post-nc-conformance.test.mjs: +3 operationFor cases.

LIVE FINDING (the wiring's whole point): static check passes 15/15, but the live SFC reveals the
job's mill speeds DRIFT 2-4x above the SFC's physics recommendation — SFC computes ~120 m/min
(~394 SFM) for P-steel carbide (752/3008/4010 rpm, scaling inversely with dia); the job emits
240-480 m/min. T1 2" face mill at S3000 (~1570 SFM) is genuinely too fast for steel. The closed
loop can now catch + correct this. (Caveat R12: T4 drill comparison needs operation-path
verification — 6015 rpm/1-4" drill = ~393 SFM is mill-style, too fast for drilling.)
```

## Files touched (4)
- scripts/lib/prism-base-job.mjs       | 11 +++++++++++
- scripts/post-nc-conformance.mjs      | 84 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- scripts/post-nc-conformance.test.mjs | 14 +++++++++++++-
- 3 files changed, 106 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 933a778a5468`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._