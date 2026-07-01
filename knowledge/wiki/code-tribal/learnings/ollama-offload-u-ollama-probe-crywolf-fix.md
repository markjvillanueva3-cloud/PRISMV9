# OLLAMA-OFFLOAD/U-OLLAMA-PROBE-CRYWOLF-FIX — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OLLAMA-PROBE-CRYWOLF-FIX (slot:zulu): kill BOTH cry-wolf paths in the Stop-hook Ollama liveness arm

**Commit:** `52970dfb3000` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T12:52:10-05:00
**Tags:** ollama-offload, u-ollama-probe-crywolf-fix, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OLLAMA-PROBE-CRYWOLF-FIX (slot:zulu): kill BOTH cry-wolf paths in the Stop-hook Ollama liveness arm

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OLLAMA-PROBE-CRYWOLF-FIX (slot:zulu): kill BOTH cry-wolf paths in the Stop-hook Ollama liveness arm

(1) papa-verified (reference_ollama_probe_crywolf_2026_06_12, handed to a
main-tree chat): probe budget 2500 -> resolveProbeBudget(env knob
PRISM_OLLAMA_PROBE_TIMEOUT_MS, floor 1000, default 8000). /api/tags takes
>2.5s while UP under fleet load; the old 2.5s abort emitted false
'UNREACHABLE (This operation was aborted)' on every Stop. Corrected the
empirically-false '<100ms even mid-generation' header claim.
(2) zulu live-observed: the throttled path re-emitted a CACHED DOWN verdict
un-probed for up to 5 min after recovery (3 false ticks after restarting
'PRISM Ollama Serve'). New resolveCachedOllamaProbe: cached DOWN -> live
re-probe (2.5s budget fits the 4s harness ceiling) + cache refresh;
healthy/absent/unknown -> zero-cost pass-through.
(3) 2-arm scrutiny P1 (both arms converged): the 8s probe ran BEFORE
docker ps/cache/stamp on the cold path -> a 4s harness kill under load
stranded the fleet cold + suppressed the docker advisory. Fixed by
ORDERING: docker verdict + stamp land atomically BEFORE the probe; plus
abort -> UNKNOWN verdict split (busy != down; only a refusal is a
confident DOWN; wedge residual documented as accepted).

17/17 tests (5 new: abort-unknown, cached-DOWN recovery + abort-refresh,
zero-cost path, knob validation -- all R9 invariants). Live E2E: throttled
tick zero-cost silent; forced cold tick caches reachable:true/12-models
with stamp+cache durable before the slow arms.
R12 NOTE: per-file scrutiny round 1 = 2 arms PASS-conditional on the P1;
fixes applied per their exact prescriptions; the round-2 re-verify dispatch
hit the subagent session limit (resets 15:50) -- scheduled for after reset.
P2 follow-up logged: sibling session-consolidate-graph.mjs probes the same
endpoint at 1.5s (below even the disproven 2.5s).
```

## Files touched (3)
- .claude/hooks/docker-service-health-stop.mjs      | 128 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---------------------
- .claude/hooks/docker-service-health-stop.test.mjs |  66 ++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 160 insertions(+), 34 deletions(-)

## Lessons surfaced in commit body
- NOTE: per-file scrutiny round 1 = 2 arms PASS-conditional on the P1;

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 52970dfb3000`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._