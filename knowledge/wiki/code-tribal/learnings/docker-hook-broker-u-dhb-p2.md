# DOCKER-HOOK-BROKER/U-DHB-P2 — [MAIN] [DOCKER-HOOK-BROKER]/U-DHB-P2 (slot:hotel): broker HTTP server framework with route serving + hot-reload + safety guards

**Commit:** `2cc3ae56afa7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T19:30:20-05:00
**Tags:** docker-hook-broker, u-dhb-p2, auto-distilled

## Subject
[MAIN] [DOCKER-HOOK-BROKER]/U-DHB-P2 (slot:hotel): broker HTTP server framework with route serving + hot-reload + safety guards

## Body
```
[MAIN] [DOCKER-HOOK-BROKER]/U-DHB-P2 (slot:hotel): broker HTTP server framework with route serving + hot-reload + safety guards

Tier-1 broker daemon — reads HOOK-BROKER-COMPAT-REPORT.json (from U-DHB-P1),
dynamic-imports the 78 module-safe hooks, holds them warm, serves them via
HTTP. Standalone — no Dockerfile yet (that's P3).

Files:
  docker/hook-broker/server.mjs        (~340 LOC, 9 exports)
  docker/hook-broker/server.test.mjs   (~430 LOC, 20 hermetic tests, all pass)

Routes:
  GET  /healthz       — ready/loaded/failed status
  GET  /loaded        — list of cached hooks
  POST /reload        — re-import every hook (picks up edits via per-file
                        cache-busting URL tag)
  POST /hook/:name    — invoke a cached handler with stdin payload

Standalone launch:
  node docker/hook-broker/server.mjs            # port 9876
  node docker/hook-broker/server.mjs --port N
  PRISM_BROKER_PORT=N node docker/hook-broker/server.mjs

Per-file scrutiny gate dispatched 2 parallel agents:
  Reviewer A (code-analyzer): PASS with 1 P1 + 4 P2s
  Reviewer B (reviewer):      FAIL — 1 P0 + 4 P1s

All P0 + P1 findings fixed before commit:
  P0   (B): module-state race in loadHooks — `loaded.clear()` then
            re-populate left a window where concurrent /hook/:name got
            spurious 404s. Fix: build new Map locally, swap-assign at end.
  P1-A (A+B): cache-bust collision — `?t=${now}` captured once outside the
              loop; same-ms reloads produced identical URLs. Fix: per-file
              counter + crypto.randomBytes suffix.
  P1-B (B): path-injection — `includes("/") || includes("..")` missed
            backslash, null byte, control chars, empty, overlong. Fix:
            strict allowlist regex /^[a-z][a-z0-9._-]{0,127}$/i + 5 new
            negative tests (backslash / nullbyte / empty / 129-char /
            leading-digit).
  P1-C (B): handler-timeout timer leaked on race-win-by-handler — pending
            Timeout accumulated under load. Fix: pre-declare `timer = null`,
            always clearTimeout in `finally`, new active-handles regression
            test.
  P1-D (B): ready flag never reset on /reload — /healthz reported
            ready:true with loaded:0 during reload. Fix: ready=false at
            top of loadHooks.
  P2   (A): readBody body-cap leaked chunks via late `data` events after
            the cap fired. Fix: `rejected` flag with early-return.
  P2   (A): dead `t0` variable — removed.

Conservative-by-design:
  - body cap: 1 MB hard limit, rejected with 413 OR ECONNRESET (broker
    calls req.destroy() to stop the upload — test accepts either signal)
  - handler timeout: 10s hard limit
  - hook name: allowlist regex, defense-in-depth (Map lookup is the actual
    safety boundary — nothing escapes to fs)
  - failure isolation: one bad hook (no default / non-callable / syntax
    error) recorded + skipped; broker continues serving the rest

Closes U-DHB-P2 (broker server framework).
Remaining: U-DHB-P3 (Dockerfile + compose stanza),
          U-DHB-P4 (.claude/hooks/_rpc-shim.mjs migration shim),
          U-DHB-P5 (scripts/migrate-hooks-to-rpc.mjs).
```

## Files touched (3)
- docker/hook-broker/server.mjs      | 349 ++++++++++++++++++++++++++++++++
- docker/hook-broker/server.test.mjs | 400 +++++++++++++++++++++++++++++++++++++
- 2 files changed, 749 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2cc3ae56afa7`
- Milestone envelope: `mcp-server/data/milestones/DOCKER-HOOK-BROKER.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._