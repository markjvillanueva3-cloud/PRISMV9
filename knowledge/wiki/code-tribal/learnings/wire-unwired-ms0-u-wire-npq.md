# WIRE-UNWIRED-MS0/U-WIRE-NPQ — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-NPQ: wire NadcapProcessQualificationEngine into prism_dev (2 read/compute actions, engine-pair test already exists)

**Commit:** `f8fb276f4597` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T09:02:24-05:00
**Tags:** wire-unwired-ms0, u-wire-npq, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-NPQ: wire NadcapProcessQualificationEngine into prism_dev (2 read/compute actions, engine-pair test already exists)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-NPQ: wire NadcapProcessQualificationEngine into prism_dev (2 read/compute actions, engine-pair test already exists)

Wires 2 pure-compute/read aerospace-compliance accessors through
prism_dev:
- npq_qualify     -> qualify(input) — Nadcap AC7xxx audit
- npq_get_stats   -> getStats() — covered process types

Aerospace special-process qualification check (Nadcap = National
Aerospace and Defense Contractors Accreditation Program). Validates
input audit against AC7xxx criteria (heat-treat / chemical-proc /
NDT / surface-enhance / composites / etc.). Returns verdict
(approved | conditional | denied) with severity breakdown
(A=critical / B=major / C=minor) + cert gaps + remediation priority.

No DEFER list: every engine method is pure compute over input.

DoS guards:
- process: z.enum (9 types)
- cycle_months: 1-120 (10yr cap)
- line_items: 0-500
- operator_certs: 0-64
- date strings: 1-32 chars (ISO-8601)

Note: engine-direct test (NadcapProcessQualificationEngine.test.ts)
already exists from L2-P4. This commit adds ONLY the dispatcher
round-trip layer.

Test coverage: 16/16 vitest PASS (dispatcher only — engine pair exists):
- Zod schema validation (3 — enum + line_items cap + cert cap)
- npq_qualify (8 — clean→approved / 1 critical→denied / 3 major→
  conditional / 9-process variability / heat_treat missing cert→
  cert_gap+denied / heat_treat missing tus_date→tus_overdue+denied /
  audit-overdue→denied / routing proof verdict parity)
- npq_get_stats (2 — 9-process count + reference 'AC7' substring /
  all 9 process types present)
- error envelope (3 — missing process / invalid enum / > 500 items)

Verdict ladder verified explicitly per engine line 154-162:
  A>0 OR audit_overdue OR tus_overdue OR cert_gaps>0  -> denied
  ELSE B>2 OR pct<85                                  -> conditional
  ELSE                                                -> approved

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.nadcapProcessQualification.test.ts  | 237 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  31 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  25 ++-
- 3 files changed, 292 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- Note: engine-direct test (NadcapProcessQualificationEngine.test.ts)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f8fb276f4597`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._