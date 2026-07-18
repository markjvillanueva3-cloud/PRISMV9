# HOTEL/U-HOTEL-OSHA-DASHBOARD — [MAIN-FORCE] [HOTEL]/U-HOTEL-OSHA-DASHBOARD (slot:hotel): bring the dead OSHACompliancePage to life -- wire the unwired OSHAComplianceEngine incident store + all-records training list + 5 /erp routes

**Commit:** `3213b0f0deb5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T18:11:31-05:00
**Tags:** hotel, u-hotel-osha-dashboard, auto-distilled

## Subject
[MAIN-FORCE] [HOTEL]/U-HOTEL-OSHA-DASHBOARD (slot:hotel): bring the dead OSHACompliancePage to life -- wire the unwired OSHAComplianceEngine incident store + all-records training list + 5 /erp routes

## Body
```
[MAIN-FORCE] [HOTEL]/U-HOTEL-OSHA-DASHBOARD (slot:hotel): bring the dead OSHACompliancePage to life -- wire the unwired OSHAComplianceEngine incident store + all-records training list + 5 /erp routes

Gap #5 of HOTEL-ERP-FRONTEND-WIRING-SPEC. OSHACompliancePage called oshaIncidents()/
osha300LogFeed()/oshaSafetyTraining()/oshaPpeRecords()/oshaNearMiss() but the backing
/erp routes were missing AND the OSHAComplianceEngine incident STORE (distinct from the
OSHA300LogEngine recordability CALC engine) was wired to no dispatcher -> the whole desk
was dead.

- OSHAComplianceEngine: + listAllPPE() (unfiltered sibling of listPPEByEmployee, decorated
  with needs_replacement, for the PPE panel).
- SafetyTrainingRecordEngine: + listAllRecords() (unfiltered sibling of
  getEmployeeComplianceReport, decorated with live status + course_name=topic_id). This
  commit also brings the previously-UNTRACKED engine + its test onto the branch for the
  first time (the safety_training_* actions referenced it while it was dark).
- businessDispatcher: 5 actions -- osha_incidents/osha_300_log/osha_ppe_records/
  osha_near_miss/safety_training_list_all. Each list case JOINS employee_name (composed
  first_name + last_name via EmployeeEngine, since the records only key employee_id) so the
  FE cards show real names; near_miss = createIncident({injury_type:"near_miss",first_aid,
  0 days}) -> recordable=false (correct); osha_incidents emits recordable + status as
  STRINGS ("true"/"false" drives the page recordable metric via firstText().includes("true");
  "recordable"/"non-recordable" drives the card label) -- the FE firstText helper is
  string-only, so a bare boolean rendered a dead "Status unavailable" card + a 0 metric.
- erp.ts: 5 routes via rfqRoute (unwraps the prism_business {type,text} slimResponse
  envelope; bare-array + {records} + {success,data} shapes all surface correctly).
  verifyToken (matches the sibling safety/HR analytics tier).
- Tests: OSHAComplianceEngine.test.ts (9 -- createIncident recordable rule, near-miss
  recordable=false, listIncidents/300-log filters, listAllPPE needs_replacement) +
  SafetyTrainingRecordEngine.test.ts listAllRecords block (5) + erp-rfq-routes.test.ts
  (5 route round-trips incl. the recordable-string metric contract, R9 production env()).

3-of-3 PASS (A+B+C; arm C caught the recordable boolean->string FE-contract gap across
two rounds, now fully fixed). 51/51 tests, tsc 0 (my files), build:fast Done, false-wire
guard 20/20.
```

## Files touched (8)
- mcp-server/src/__tests__/OSHAComplianceEngine.test.ts       | 136 +++++++++++++++++++++++++++++
- mcp-server/src/__tests__/SafetyTrainingRecordEngine.test.ts | 234 +++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/erp-rfq-routes.test.ts             |  96 ++++++++++++++++++++
- mcp-server/src/engines/OSHAComplianceEngine.ts              |  12 +++
- mcp-server/src/engines/SafetyTrainingRecordEngine.ts        | 245 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/erp.ts                                |  15 ++++
- mcp-server/src/tools/dispatchers/businessDispatcher.ts      |  98 +++++++++++++++++++++
- 7 files changed, 836 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3213b0f0deb5`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._