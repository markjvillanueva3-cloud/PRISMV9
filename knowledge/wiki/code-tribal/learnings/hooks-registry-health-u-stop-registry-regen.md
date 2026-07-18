# HOOKS-REGISTRY-HEALTH/U-STOP-REGISTRY-REGEN — [MAIN] [HOOKS-REGISTRY-HEALTH]/U-STOP-REGISTRY-REGEN: STOP_HOOK_REGISTRY generator + auto-regen wiring + doctrine sync

**Commit:** `0bcfc8e168a6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T22:13:36-05:00
**Tags:** hooks-registry-health, u-stop-registry-regen, auto-distilled

## Subject
[MAIN] [HOOKS-REGISTRY-HEALTH]/U-STOP-REGISTRY-REGEN: STOP_HOOK_REGISTRY generator + auto-regen wiring + doctrine sync

## Body
```
[MAIN] [HOOKS-REGISTRY-HEALTH]/U-STOP-REGISTRY-REGEN: STOP_HOOK_REGISTRY generator + auto-regen wiring + doctrine sync

PROBLEM: `stop_on_hook_unregistered.mjs` warned every session that N stop-hooks
were not in `state/shared/STOP_HOOK_REGISTRY.json`. Root cause: the registry was
hand-maintained, last touched 2026-04-22 (24 days stale), and 9 new `stop_on_*.mjs`
hooks shipped since with NO generator to keep it current (verified: grep
STOP_HOOK_REGISTRY scripts/ → 0 matches).

FIX (root-cause, not symptom):
1. NEW `scripts/build-stop-hook-registry.mjs` — deterministic generator. Pure
   exported helpers (inferDescriptionFromName, extractStopHookMeta, scanStopHooks,
   buildRegistry) + CLI modes (regen / --check / --json / --self-test). Atomic
   tmp→rename write, .previous.json backup. Metadata extraction: tier from
   `// tier: T#` (else "Tier N" prose, else 6); severity from intent words
   (HARD BLOCK/BLOCKS→block, auto-release/pass→pass, else warn); description
   from first substantive JSDoc line (drops filename-echo, ===/--- rules, bare
   "Stop Hook:" headers; falls back to title-cased filename inference).
   --self-test: 18 assertions PASS (tier parse incl. out-of-range, severity
   classes, desc extraction incl. "Stop Hook: Title" form, adversarial
   empty/null/no-jsdoc/oversize-cap).
2. Regenerated STOP_HOOK_REGISTRY.json: 35 hooks (block=9 warn=25 pass=1),
   UNREGISTERED 9→0. `stop_on_hook_unregistered.mjs` now returns
   {"result":"pass"} (smoke-verified).
3. `hook-registry-regen.mjs` (PostToolUse:Edit|Write|MultiEdit) now fires BOTH
   build-hook-registry.mjs AND build-stop-hook-registry.mjs detached on any
   `.claude/hooks/**.mjs` or settings.json change — so STOP_HOOK_REGISTRY can
   never silently go stale again. Smoke-verified: hook-land edit emits combined
   regen message; non-hook edit stays silent {"continue":true}.

DOCTRINE SYNC (current-status reflection, same session):
- CLAUDE.md +2 Recent regressions entries (AAM04 auditor internal bugs:
  14→2-real dangling after triage; error-learn hooks 0/6 wired w/ in-flight
  peer-doctrine caveat).
- GSD_QUICK.md: date 2026-04-28→2026-05-16 + status note that lifecycle list
  is aspirational, error-* hooks were unwired, verify via /wiring-audit.

Karpathy: R3 surgical (piggyback existing regen hook, no new trigger infra),
R9 self-test encodes intent not behavior, R11 matched build-hook-registry.mjs
--self-test convention (no redundant external test file), R12 fail-loud
(severity "block" used accurately for hard-blockers vs forcing all to "warn").

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (6)
- .claude/hooks/hook-registry-regen.mjs |  18 ++-
- CLAUDE.md                             |   6 +
- mcp-server/data/docs/gsd/GSD_QUICK.md |   4 +-
- scripts/build-stop-hook-registry.mjs  | 282 ++++++++++++++++++++++++++++++++++
- state/shared/STOP_HOOK_REGISTRY.json  | 278 +++++++++++++++++++++------------
- 5 files changed, 479 insertions(+), 109 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0bcfc8e168a6`
- Milestone envelope: `mcp-server/data/milestones/HOOKS-REGISTRY-HEALTH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._