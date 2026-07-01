# TOKEN-TELEMETRY-WIRE/U-CTXPRELOAD-GIT-INJECTION-FIX — [MAIN-FORCE] [TOKEN-TELEMETRY-WIRE]/U-CTXPRELOAD-GIT-INJECTION-FIX (slot:alpha): close command-injection in wired context_delta_boot + ENOBUFS hardening

**Commit:** `e7da2020f131` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T15:26:25-05:00
**Tags:** token-telemetry-wire, u-ctxpreload-git-injection-fix, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-TELEMETRY-WIRE]/U-CTXPRELOAD-GIT-INJECTION-FIX (slot:alpha): close command-injection in wired context_delta_boot + ENOBUFS hardening

## Body
```
[MAIN-FORCE] [TOKEN-TELEMETRY-WIRE]/U-CTXPRELOAD-GIT-INJECTION-FIX (slot:alpha): close command-injection in wired context_delta_boot + ENOBUFS hardening

Security (proven): the wired prism_session:context_delta_boot action passes a caller-supplied
since_commit (params.since_commit||params.commit) to ContextPreloaderEngine.getDeltaBoot, which
ran a shell git-diff with the ref string-interpolated. A malicious since_commit like
'HEAD; <cmd> #' is shell-executed -- empirically confirmed: the old path created a sentinel file
via an embedded echo, and would have returned a real delta instead of the safe fallback.

Fix: convert all 6 git spawns in ContextPreloaderEngine (gitInfo x4 + getDeltaBoot x2) from the
shell sync-exec helper to execFileSync(GIT_BIN, [args]) via a local gitText() helper -- shell-free
(refs are argv, never shell tokens), bounded 64MB maxBuffer (no ENOBUFS on a big status/diff),
GIT_BIN resolves an absolute git path (PRISM_GIT_BIN env -> Git-for-Windows default -> 'git') so
execFileSync resolves git on Windows. Same hardening class as U-DIFFTOKEN-MAXBUFFER-FALLBACK.

Test: adversarial security test -- a malicious since_commit with an embedded echo must NOT create
a sentinel file (no shell) AND must return 'Unable to compute delta' (git rejects the bad ref);
a shell would have SUCCEEDED on the 'git diff --stat HEAD' prefix, so the assertion is a real
discriminator. 10/10 context-preloader tests, tsc clean in-scope. Sibling follow-ups (noted):
SessionReplayEngine has the same maxBuffer-less class (static refs, no injection); the GIT_BIN
resolver is now duplicated with DiffTokenEstimatorEngine -> extract a shared util/gitText.
```

## Files touched (3)
- mcp-server/src/__tests__/context-preloader-engine.test.ts | 22 +++++++++++++++++++
- mcp-server/src/engines/ContextPreloaderEngine.ts          | 44 +++++++++++++++++++++++++++----------
- 2 files changed, 55 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- til/gitText.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e7da2020f131`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-TELEMETRY-WIRE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._