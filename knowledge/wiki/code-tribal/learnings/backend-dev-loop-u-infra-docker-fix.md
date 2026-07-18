# BACKEND-DEV-LOOP/U-INFRA-DOCKER-FIX — [MAIN] [BACKEND-DEV-LOOP]/U-INFRA-DOCKER-FIX: launcher autopilot — port-conflict skip + Dockerfile target rename + entrypoint guard

**Commit:** `c55b68b8ea49` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T14:26:58-05:00
**Tags:** backend-dev-loop, u-infra-docker-fix, auto-distilled

## Subject
[MAIN] [BACKEND-DEV-LOOP]/U-INFRA-DOCKER-FIX: launcher autopilot — port-conflict skip + Dockerfile target rename + entrypoint guard

## Body
```
[MAIN] [BACKEND-DEV-LOOP]/U-INFRA-DOCKER-FIX: launcher autopilot — port-conflict skip + Dockerfile target rename + entrypoint guard

Three fixes that together restore one-shot stack-up via the launcher.

(1) docker-compose.yml `target: production` → `target: runtime`. The
Dockerfile defines stages `builder` and `runtime` only — there is no
`production` stage. Every compose-up that touched prism-server (or any
service in its depends_on chain) failed with
"target stage 'production' could not be found". Confirmed by reading
both byte-identical Dockerfiles (root + mcp-server/, CI-enforced).

(2) ollama-docker-launcher.mjs — port-conflict pre-filter. A host-native
process holding 5432 (native PostgreSQL) used to abort the entire
compose-up with an EACCES bind error, killing prometheus and every
sibling service. New pure helper `filterServicesByPortConflicts(services,
portMap, probeImpl)` returns `{kept, skipped}`; conflicted services are
skipped with a loud `log("warn", ...)` advisory while siblings still
launch. R12 fail-loud: a probe that THROWS keeps the service rather than
silently dropping. New exit code 4 = `all-services-port-conflicted`.

(3) ollama-docker-launcher.mjs — entrypoint guard. `main().catch(...)`
was unconditional at top-level. Any `import` of the module — including
the test file — triggered a real Docker launch + `process.exit(N)`.
The reported "17/17 PASS" was empirically false: 11 tests ran, 1 failed
(exit 4), 6 LIVE tests never executed. Caught by per-file scrutiny
Arm A P0. Now guarded by canonical Windows-aware
`SELF_URL === ARGV1_URL` check. Post-fix: 17/17 PASS in 1.4s (was 45s
because Docker was actually launching during the test run).

Also caught by Arm A P2-7: `SERVICE_PORTS["prism-server"]` was 3100 but
docker-compose publishes 3000:3000 — wrong port pinned. Corrected to
3000 + test assertion updated.

17 hermetic + LIVE tests in mcp-server/scripts/ollama-docker-launcher
.test.mjs: SERVICE_PORTS invariants (frozen, complete, pinned values),
filterServicesByPortConflicts every path (no conflict / postgres-only /
all conflicted / unknown service pass-through / probe-throws keeps with
advisory / empty / order preserved / probe-is-awaited race oracle),
parseArgs unchanged-behavior, probeHostPort LIVE (bind ephemeral port +
probe true, close + probe false, reserved port respects timeout).

Per-file scrutiny: Arm A (code-analyzer) FAIL→FIX→PASS. Arm B (reviewer)
rate-limited; Arm A's three P0/P1 findings fully addressed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- docker-compose.yml                                 |   8 +-
- mcp-server/scripts/ollama-docker-launcher.mjs      | 133 +++++++++++-
- mcp-server/scripts/ollama-docker-launcher.test.mjs | 223 +++++++++++++++++++++
- 3 files changed, 356 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- till
- wrong port pinned. Corrected to

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c55b68b8ea49`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEV-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._