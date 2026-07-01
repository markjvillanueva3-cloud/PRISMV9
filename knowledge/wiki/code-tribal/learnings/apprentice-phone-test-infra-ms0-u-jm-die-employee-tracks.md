# APPRENTICE-PHONE-TEST-INFRA-MS0/U-JM-DIE-EMPLOYEE-TRACKS — [MAIN] [APPRENTICE-PHONE-TEST-INFRA-MS0]/U-JM-DIE-EMPLOYEE-TRACKS: per-employee curriculum tracks (Mark/Chris/Justin) + 3-employee dev-seed picker.

**Commit:** `b644804e48b7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T14:29:45-05:00
**Tags:** apprentice-phone-test-infra-ms0, u-jm-die-employee-tracks, auto-distilled

## Subject
[MAIN] [APPRENTICE-PHONE-TEST-INFRA-MS0]/U-JM-DIE-EMPLOYEE-TRACKS: per-employee curriculum tracks (Mark/Chris/Justin) + 3-employee dev-seed picker.

## Body
```
[MAIN] [APPRENTICE-PHONE-TEST-INFRA-MS0]/U-JM-DIE-EMPLOYEE-TRACKS: per-employee curriculum tracks (Mark/Chris/Justin) + 3-employee dev-seed picker.

Per operator directive 2026-05-27 (lima session 92ef25c0): named real JM Die personnel
with role + machine stack:
  - Mark    = CNC mill manager + designated engineer (programs all mills/lathes,
              quoting, purchasing, scheduling)
  - Chris   = CAM programmer 5 yrs (Haas VF-2 + Hurco + Okuma 5-axis)
  - Justin  = apprentice — Excel macros for electrodes, Fusion CAM templates for
              Roku-Roku, Haas OM2 engraving, Mitsubishi EA12S sinker on GF+ robot

Closes the gap: single generic "apprentice" dev-seed → three role-targeted profiles
each with a curriculum track matched to their actual job.

Two assets:

1. mcp-server/web/src/data/employee-tracks.ts
   - JM_DIE_EMPLOYEES record with the 3 canonical profiles (full AuthEmployee shape)
   - EMPLOYEE_TRACKS record with rationale + course_ids[] + expected_hours per role
   - Justin track (70h): foundations (0a-0c, 1-3) → his exact daily work (14
     electrodes / 15 sinker / 16 robot / 46 fleet-EDM / 45 fleet-mills) → chip
     control + chatter + Excel + alarm handling
   - Chris track (90h): skip foundations → tooling encyclopedias (56/57/50/51) →
     his machines (44 lathes / 45 mills / 55 5-axis) → advanced CAM (28/53/32/30/
     58) → quality (60 chip, 29 wear)
   - Mark track (110h): business ops (35-40) → engineering validation (52/54/43/9)
     → operational excellence (47/41/42) → purchasing/scheduling refs (50/51/49/
     48/31)
   - makeSeedPayload(role) exports the canonical AuthContext-compatible payload
     so dev-seed page + backend both build the same shape

2. mcp-server/web/public/dev-seed-apprentice.html (REWRITE)
   - Three role cards: Justin (apprentice), Chris (programmer), Mark (manager)
   - Each card shows the role + machines + signature workflow
   - Tap card → preview payload → tap "Seed as <name>" → write localStorage +
     redirect to /academy
   - Backward-compat hidden button labeled "Seed apprentice" preserves the
     Playwright smoke spec (seeds Justin by default — matching prior behavior)
   - Safe DOM API throughout (no innerHTML — security-reminder gate honored)
   - Each card has 88px tap target (mobile-safe)
   - Clearance shown on each card so the seeded session matches role expectation

Citation discipline (lima soul):
  - Every track ordering choice cites the employee's named responsibilities
  - Rationale strings explain WHY a course is included (or skipped) for each role
  - No course included by inertia — Mark skips course-2 speed/feed (he already
    knows it) and Chris skips course-1 print reading (5 yrs experience)

R12 honest-stop scope:
  ✓ 3 role-targeted curriculum tracks shipped
  ✓ 3-employee picker on the dev-seed page
  ✓ Backward-compat preserves the Playwright smoke spec
  ✗ Track filtering on the Academy page itself — current /academy shows ALL 60
    courses regardless of clearance. Following the tracks is operator-driven
    today; an in-app "Your Track" filter is a follow-up unit (U-ACADEMY-TRACK-UI).
  ✗ Track progress aggregation per employee — each course's progress lives in
    localStorage today; cross-course "you finished 7 of 16 on your track" UI is
    a follow-up unit.
  ✗ Real ERP records for Mark/Chris/Justin — still dev-seed only.

Next units the apprentice + Chris + Mark unblock:
  - U-ACADEMY-TRACK-UI: filter Academy catalog by EMPLOYEE_TRACKS[currentRole]
  - U-TRACK-PROGRESS: aggregate course progress per employee track
  - U-CHRIS-FIRST-WEEK: Chris walks his Phase 1 (tooling encyclopedias), reports back
  - U-JUSTIN-FIRST-WEEK: Justin walks his foundations → electrodes/sinker arc
```

## Files touched (3)
- mcp-server/web/public/dev-seed-apprentice.html | 168 ++++++++++++++++----
- mcp-server/web/src/data/employee-tracks.ts     | 212 +++++++++++++++++++++++++
- 2 files changed, 350 insertions(+), 30 deletions(-)

## Lessons surfaced in commit body
- till dev-seed only.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b644804e48b7`
- Milestone envelope: `mcp-server/data/milestones/APPRENTICE-PHONE-TEST-INFRA-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._