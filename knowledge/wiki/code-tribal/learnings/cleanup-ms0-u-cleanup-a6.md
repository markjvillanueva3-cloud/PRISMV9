# CLEANUP-MS0/U-CLEANUP-A6 — [MAIN] [CLEANUP-MS0]/U-CLEANUP-A6: bootstrap-golf.mjs idempotent state seeder

**Commit:** `e84f5f8430c3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T23:14:06-05:00
**Tags:** cleanup-ms0, u-cleanup-a6, auto-distilled

## Subject
[MAIN] [CLEANUP-MS0]/U-CLEANUP-A6: bootstrap-golf.mjs idempotent state seeder

## Body
```
[MAIN] [CLEANUP-MS0]/U-CLEANUP-A6: bootstrap-golf.mjs idempotent state seeder

What ships
  .claude/helpers/bootstrap-golf.mjs        (~330 LOC)
  .claude/helpers/bootstrap-golf.test.mjs   (7 node:test cases, 7/7 PASS)

Behavior
  1. Creates state/shared/.cron-locks/ if missing (golf cron lockfile dir).
  2. Seeds EMPTY SHELLS of three golf JSON state files only when MISSING
     or 0-byte — never clobbers populated content unless --force:
       golf-owned-paths.json  (regen-golf-owned-paths.mjs G11 populates)
       golf-token-budget.json (runtime populates)
       golf-cron-registry.json (U-CLEANUP-E2 populates manually)
     Shell schemas mirror the live canonical forms exactly.
  3. Detects 0-byte coordination.db (aborted H8 SQLite first-touch) and
     unlinks it + WAL/SHM sidecars so the next CoordinationStoreEngine
     caller creates clean. Healthy DBs (>0 bytes) untouched.
  4. Validates the 6 required .gitignore entries are present;
     ADVISORY ONLY — never mutates .gitignore (those entries stable
     since 2026-05-13, peer rewrite is the only legitimate edit path).

CLI
  bootstrap-golf.mjs                default: seed missing, exit 0|3
  bootstrap-golf.mjs --check        probe-only, exit 0|2
  bootstrap-golf.mjs --json         machine-readable
  bootstrap-golf.mjs --force        clobber populated files (emergency)

Exit codes
  0  clean OR seeded missing pieces successfully
  2  --check mode and gaps detected
  3  write attempted but filesystem error
  64 --check and --force both passed (EX_USAGE)

Live verify (this commit)
  --check --json: 6/6 ok, exit 0 (all state already populated by peers).
  node:test suite: 7/7 pass in 222ms.

Design constraints honored
  - Pure node (no PRISM engine imports — H8 SQLite won't resolve from
    .claude/helpers/ per HOOK-SYNERGY-MS0 doctrine).
  - Atomic writes (tmp + renameSync — interrupted writes leave no garbage).
  - --force is the ONLY clobber path; default never overwrites.
  - Loud per Karpathy R12 — every action stamped state+reason; silent
    only when nothing needed doing.
  - Empty-shell allowlistRegex matches NO real paths (covered by test) —
    a populated allowlist must replace it before any path is permitted.

Closes envelope-rumor of mcp-server/data/state/coordination.db (the
spec said this path; canonical truth is state/shared/coordination.db
per CoordinationStoreEngine.ts:51 DEFAULT_DB_PATH — schema-first read,
Karpathy R8).
```

## Files touched (3)
- .claude/helpers/bootstrap-golf.mjs      | 397 ++++++++++++++++++++++++++++++++
- .claude/helpers/bootstrap-golf.test.mjs | 109 +++++++++
- 2 files changed, 506 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e84f5f8430c3`
- Milestone envelope: `mcp-server/data/milestones/CLEANUP-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._