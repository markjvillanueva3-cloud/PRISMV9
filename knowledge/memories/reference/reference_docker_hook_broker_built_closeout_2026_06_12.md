---
name: reference_docker_hook_broker_built_closeout_2026_06_12
description: U-DOCKER-HOOK-BROKER is BUILT (server+Dockerfile+installer+RPC-shim+classifier+migration+consumer+16/16 tests) but priority-queue surfaces it as p0 pending — close-out debt, not a build task; Docker-blocked for validation only
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.554Z
aliases: reference_docker_hook_broker_built_closeout_2026_06_12
---


**U-DOCKER-HOOK-BROKER (OBSIDIAN-INTELLIGENCE-MS3) is ALREADY BUILT** — verified 2026-06-12 slot:tango when the priority queue surfaced it as the #1 backend-dev p0 "pending" pick.

**Evidence it's built (do NOT rebuild — tango dedup law):**
- `scripts/docker/prism-hooks-broker-server.mjs` (199 lines, real: createServer/listen/exec, 9 key matches)
- `scripts/docker/prism-hooks-broker.Dockerfile` + `scripts/install-prism-hooks-container.ps1` (installer)
- `scripts/classify-hooks-for-broker.mjs` + `.test.mjs` (16/16 PASS) + `scripts/lib/hook-broker-classifier.mjs` + test
- `.claude/hooks/_rpc-shim.mjs` + test (the RPC shim hooks use to call the broker) + `scripts/migrate-hooks-to-rpc.mjs` (migration tool)
- Consumer: `.claude/hooks/cross-session-orchestrator.mjs` references the broker
- Spec: `state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.html` (dated 2026-05-09)
- The unit is NOT in the OBSIDIAN-INTELLIGENCE-MS3.json envelope units (queue surfaces it from a prose roadmap).

**Remaining = validation only, BLOCKED on Docker (DOWN this session).** Live container build/warm-pool validation needs `docker info` to succeed. NOT a code gap.

**Broader finding (the real value): the priority queue is heavily polluted with shipped-but-pending work.** This session alone, 5 of ~14 surfaced "gaps/units" were already built/redundant (the DEVTOOL-AUTOINVOKE assessment: P3, U2/P9, U4/P6, U5/P8 — see [[reference_devtool_autoinvoke_ms0_2026_06_12]] — plus this). The fix is a close-out audit pass (tango's domain): `node scripts/audit-close-out-candidates.mjs` + `scripts/close-out-milestone.mjs` to flip envelope/MILESTONE_PROGRESS status, NOT blind rebuilds. **When picking from the queue: verify-on-disk BEFORE building — "pending" status is not proof of unbuilt.** See [[feedback_never_claim_absence_without_deep_search]] (the inverse: never claim PRESENCE-of-gap without checking the build is actually absent).
