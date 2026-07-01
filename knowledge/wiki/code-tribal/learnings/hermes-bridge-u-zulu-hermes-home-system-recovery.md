# HERMES-BRIDGE/U-ZULU-HERMES-HOME-SYSTEM-RECOVERY — [MAIN-FORCE] [HERMES-BRIDGE]/U-ZULU-HERMES-HOME-SYSTEM-RECOVERY (slot:zulu): robust Hermes home auto-discovery so the prism_hermes CLI bridge recovers the real user install when the MCP server runs as SYSTEM

**Commit:** `516985c1cdcc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T19:31:17-05:00
**Tags:** hermes-bridge, u-zulu-hermes-home-system-recovery, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-BRIDGE]/U-ZULU-HERMES-HOME-SYSTEM-RECOVERY (slot:zulu): robust Hermes home auto-discovery so the prism_hermes CLI bridge recovers the real user install when the MCP server runs as SYSTEM

## Body
```
[MAIN-FORCE] [HERMES-BRIDGE]/U-ZULU-HERMES-HOME-SYSTEM-RECOVERY (slot:zulu): robust Hermes home auto-discovery so the prism_hermes CLI bridge recovers the real user install when the MCP server runs as SYSTEM

ROOT CAUSE: HermesAutomationBridge.defaultHome() used homedir() -> when the MCP
server process runs as NT AUTHORITY\SYSTEM, homedir() is
C:\WINDOWS\system32\config\systemprofile, which carries NO Hermes install. So
prism_hermes:hermes_status reported exeExists:false / homeExists:false / mock,
even though Hermes is fully installed at C:\Users\wompu\AppData\Local\hermes
(auth.json + config.yaml + bin present, proxy :8645 live + authenticated). The
CLI bridge lane was dark fleet-wide on any SYSTEM-launched MCP server.

FIX (additive, byte-identical in the normal user-run case):
- resolveHermesHome(env, deps): (1) PRISM_HERMES_HOME override wins; (2) homedir
  path if it EXISTS (normal run, unchanged); (3) scan C:\Users\*\AppData\Local\
  hermes for a dir that looks like a real install (config.yaml|auth.json|
  hermes-agent) -- recovers the install under SYSTEM; (4) else the homedir path
  (honest homeExists:false fallback, unchanged).
- userProfileHermesCandidates(): enumerate user profiles, skip Public/Default/
  systemprofile, fail-soft [] on unreadable/POSIX.
- Pure + dependency-injectable -> the SYSTEM-recovery path is unit-testable
  without a real install.

VALIDATE: 37/37 HermesAutomationBridge tests (+13 new incl. the exact SYSTEM
homedir -> real-install recovery case). Live FS check with homedir forced to the
systemprofile resolves to C:\Users\wompu\AppData\Local\hermes (no systemprofile),
correctly skipping a sibling profile with no install markers. Changed files
type-clean (2 pre-existing tsc errors in ReinforcementLearningCAMFeedbackEngine
.ts:302/373 are unrelated -- step() called with 4 args, missing the outcome
object; india-owned, logged not hacked).

NOTE: takes effect for the live prism_hermes dispatcher after the MCP server's
next rebuild+restart (the queried server runs a prior build). Env escape hatch
PRISM_HERMES_HOME documented in resolveHermesHome JSDoc.
```

## Files touched (3)
- mcp-server/src/engines/HermesAutomationBridge.test.ts | 100 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/src/engines/HermesAutomationBridge.ts      |  71 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- 2 files changed, 168 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- NOTE: takes effect for the live prism_hermes dispatcher after the MCP server's

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 516985c1cdcc`
- Milestone envelope: `mcp-server/data/milestones/HERMES-BRIDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._