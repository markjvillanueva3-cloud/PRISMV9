# HOTEL-FORGE-ROADMAP/U-HOTEL-ROADMAP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-FORGE-ROADMAP]/U-HOTEL-ROADMAP (slot:hotel): dependency-ordered forge roadmap to finalize the ERP slot (Ollama-mined + ultracode-synthesized)

**Commit:** `099e6b92bd55` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T12:54:35-05:00
**Tags:** hotel-forge-roadmap, u-hotel-roadmap, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-FORGE-ROADMAP]/U-HOTEL-ROADMAP (slot:hotel): dependency-ordered forge roadmap to finalize the ERP slot (Ollama-mined + ultracode-synthesized)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-FORGE-ROADMAP]/U-HOTEL-ROADMAP (slot:hotel): dependency-ordered forge roadmap to finalize the ERP slot (Ollama-mined + ultracode-synthesized)

Operator asked: use Ollama to brainstorm a planned forge roadmap to finalize hotel, else ultracode.
Did BOTH per their split: Ollama mined the 19-session open-threads ($0), the ultracode Workflow
(wf_2bfa0b6b-9b0, 8 agents) did the high-end strategic synthesis. Rate-limiting (account swap
mid-run; resumed via resumeFromRunId) left only the adversarial lens populated, so the synthesis
architect RE-VERIFIED every claim against live code.

KEY OUTCOME: the raw gather roadmap was ~60% FALSE GAPS. Live-code verification (incl. my own
independent re-check) found 6 "blockers" are already shipped -- notably routes/business.ts EXISTS
(mounted index.ts:142-144, deny-by-default allowlist), correcting an earlier hotel claim that the
/api/v1/business/dispatch route was a 404 (true 2026-05-27, shipped 2026-05-31 U-VNET-ROUTE).

TRUE remaining hotel-finalization surface = 3 real builds (U-HOTEL-PORTAL-PERSISTENCE: 4
CustomerPortalEngine in-memory Maps -> juliett WAL store; U-HOTEL-ALLOWLIST-WRITE-REVIEW: open core
manager-writes behind per-action auth, keep ~120 financial-writes 403; U-HOTEL-FALSE-WIRE-REGRESSION-
GUARD: standing test vs the 341-false-wire bug class) + 1 verify (realtime) + 2 file/tag (Q2S DFM
bug -> charlie/quoting, NOT hotel-owned; mobile engines WIRE-EXEMPT). First unit = P0-VERIFY-SHIPPED
(curl+grep, minutes, prevents rebuilding live code). Planning doc only; no code/engine/financial logic.
```

## Files touched (2)
- state/shared/specs/HOTEL-FORGE-ROADMAP-2026-06-09.md | 94 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 94 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 099e6b92bd55`
- Milestone envelope: `mcp-server/data/milestones/HOTEL-FORGE-ROADMAP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._