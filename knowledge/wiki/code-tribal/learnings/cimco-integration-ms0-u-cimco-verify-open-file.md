# CIMCO-INTEGRATION-MS0/U-CIMCO-VERIFY-OPEN-FILE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-VERIFY-OPEN-FILE (slot:echo): blind-safe External-Command post verifier — the FILE-channel proof loop made runnable

**Commit:** `b81369b3c32d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T08:47:49-05:00
**Tags:** cimco-integration-ms0, u-cimco-verify-open-file, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-VERIFY-OPEN-FILE (slot:echo): blind-safe External-Command post verifier — the FILE-channel proof loop made runnable

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-VERIFY-OPEN-FILE (slot:echo): blind-safe External-Command post verifier — the FILE-channel proof loop made runnable

The runnable half of the blind-safe proof arm the launch-surface integrationHook describes:
register scripts/cimco-verify-open-file.mjs as CIMCO Edit "External Command 1" (Editor Setup >
External Commands). CIMCO passes the open NC ($FILEPATH); PRISM runs the offline arms and writes
a verdict to $OUTFILE — a pure FILE-channel loop, NO UIA, NO live license (the nav-planner's
external-cmd arm). Composes the already-built offline arms (R8 reuse, no dup):
  - dialectLint (cimco-dialect-allowlist.mjs) — the post's G/M vocabulary vs the codes JM actually
    used in its goldens for that dialect (a foreign code = a post the machine may never have run)
  - byte-equivalence (nc-dialect-masks.roundTrip) vs an operator golden, classified
    byte-identical | volatile-header-only | semantic-drift (header churn vs real divergence)

FAIL-CLOSED (R12): clearance (cleared:true) is EARNED only by a golden byte-equivalence pass with
no failures and no foreign-code warn. An empty NC, a missing golden, a semantic-drift, or an
unknown dialect never reads cleared. A clean dialect lint alone is necessary-not-sufficient. HONEST
coverage: this is the static + byte-equivalence verdict; it does NOT and cannot produce the CIMCO
Machine-Simulation collision/gouge verdict (UIA + live license, SPINE-2) — disclosed on every
render. Exit codes 0=cleared / 1=not-cleared / 2=FAIL / 3=error so a caller can gate on it.

13/13 node:test green (temp-dir fixtures + injected synthetic allowlists for deterministic lint
coverage). Per-file 2-reviewer scrutiny PASS, 0 P0/P1; arm-B P2 fixed (dialectLint override keyed
on `family` not `dialect` — was a silent no-op) + unknown-dialect byte-identity clearance pinned
with a regression test.

Iteration 2 of the CIMCO blind-nav proveout loop (iter1 = U-CIMCO-NAV-PLANNER d92b58cd21). Next:
TS port + prism_cimco:cimco_nav_plan/cimco_verify_post dispatcher actions; native sim-machine roster.
```

## Files touched (3)
- scripts/cimco-verify-open-file.mjs      | 217 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/cimco-verify-open-file.test.mjs | 150 +++++++++++++++++++++++++++++++++++++
- 2 files changed, 367 insertions(+)

## Lessons surfaced in commit body
- tile-header-only | semantic-drift (header churn vs real divergence)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b81369b3c32d`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._