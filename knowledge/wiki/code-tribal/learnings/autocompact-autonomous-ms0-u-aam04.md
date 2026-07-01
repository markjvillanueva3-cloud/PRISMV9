# AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM04 — [MAIN] [AUTOCOMPACT-AUTONOMOUS-MS0]/U-AAM04: harness wiring auditor — catches Gap-3-revert + precompact-unwired bug class

**Commit:** `76a24cc380ef` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T20:49:45-05:00
**Tags:** autocompact-autonomous-ms0, u-aam04, auto-distilled

## Subject
[MAIN] [AUTOCOMPACT-AUTONOMOUS-MS0]/U-AAM04: harness wiring auditor — catches Gap-3-revert + precompact-unwired bug class

## Body
```
[MAIN] [AUTOCOMPACT-AUTONOMOUS-MS0]/U-AAM04: harness wiring auditor — catches Gap-3-revert + precompact-unwired bug class

Forge response to user directive: improve dev pipelines + slash commands + hook usage + node-to-node coordination + autonomous loop reliability via a single high-leverage tool.

THE BUG CLASS: Twice this session-cluster we shipped hooks where the .mjs FILE was correct but the WIRING was silently reverted or never landed.
  1. Gap 3 in session-start-auto-resume.mjs reverted by peer/linter (handoff said "shipped + wired" — wasn't)
  2. precompact-release-slot.mjs file on disk 18+ hours unwired (prior session claimed wired — wasn't)
Both took manual inspection to find. The fleet has 549+ hook files; 363 (66%) are orphans; 14 settings entries are dangling refs to deleted files.

THE FIX: scripts/harness-wiring-audit.mjs — bundle-aware, mirror-aware, dangling-aware:
  * findHooksOnDisk(root) — walks .claude/hooks/**.mjs (excludes __tests__/, helpers/, _smoke-* internals)
  * parseSettingsWiring(text) — extracts hook basenames from C: + H: settings.json
    via /\.claude[\\/]+hooks[\\/]+([\w./\\-]+\.mjs)/g
    (tolerates / and \\ JSON-escape; subdir-strip normalizes basename)
  * parseBundleChildren(dir) — walks bundles/*.mjs source, unions \${HOOK_BASE}/foo.mjs
    references into wiredSet. Closes the 2026-05-14 bundle-blindness regression
    (high-value-additions-rank.mjs v1 had 12.7pp false-positive on orphan rate)
  * computeAudit(input) — pure function returning orphans + dangling + mirrorDrift
    + sorted lists + severity tag (ok/warn/critical) — severity = critical on
    C:↔H: byte-inequal, warn on orphan rate ≥30% or dangling ≥1
  * formatMarkdown(audit) — top-20 orphan digest + overflow note, mirror-drift
    triage step pointing at scripts/mirror-c-to-h-audit.mjs

WIRED:
  * /wiring-audit skill (.claude/commands/wiring-audit.md — ON DISK, gitignored
    per existing skill convention; live + invocable)
  * Stop hook .claude/hooks/stop-wiring-audit-suggest.mjs T3 advisory wired
    in C:/Users/wompu/.claude/settings.json Stop[8] after post-ship-distill
    per the [[reference_stop_advisory_wiring_cluster_2026_05_15]] doctrine
    (cluster pattern: session-end-peer-share → post-ship-distill → THIS →
    stop-cross-tree-collision-advisory → ...). 4h stamp throttle, fail-soft
    (never blocks Stop), reads cached HOOK_WIRING_AUDIT.json (<24h), emits
    1-line additionalContext only on severity != ok. Knobs:
    PRISM_WIRING_AUDIT_SUGGEST_{DISABLE,VERBOSE,THROTTLE_MS}
  * c-to-h-mirror replicated settings to H:/.claude/settings.json byte-identical

TESTS: .claude/hooks/__tests__/_smoke-wiring-audit.mjs — 24/24 PASS via
plain node:assert (node --test still silent-exits on this Windows env, per
sibling [[reference_autocompact_autonomous_aam01_gap3_aam02_2026_05_16]]).
Coverage: happy + 3+ failure modes + adversarial inputs (empty/null/non-string,
nonexistent paths, deep nesting, similar-named non-matches) + variability
floor (5 cases for findHooksOnDisk, 5 for parseSettingsWiring, 3 for
parseBundleChildren, 7 for computeAudit, 4 for formatMarkdown).

Real bug caught by tests: regex separator [\\/] (one slash) failed on
JSON-escaped Windows paths \\hooks (two backslashes). Fixed to [\\/]+
in source, NOT weakened in test (Karpathy R9).

LIVE AUDIT RESULT on real codebase: 551 on-disk · 199 wired (108 settings +
90 bundle) · 364 orphans (66.1%) · 14 dangling · mirror OK. Reports landed
at state/shared/HOOK_WIRING_AUDIT.{json,md}. Severity: 🟡 WARN — orphan rate
and dangling count both above threshold. Future operator action: triage the
14 dangling refs (settings pointing to deleted files) FIRST — those are bugs
waiting to happen. Then sweep through top-20 orphans (likely a mix of
deliberate libraries that need to move to helpers/ + truly dead hook files
that should be deleted).

CLOSES: AUTOCOMPACT-AUTONOMOUS-MS0 follow-up surface — the auditor would
have caught the Gap 3 revert + precompact-release-slot unwired-status the
moment they landed, not via tribal-knowledge handoff diffing.

PIPELINE INTEGRATION (for /checkin and /loop):
  - /checkin can run `node H:/prism/scripts/harness-wiring-audit.mjs --quiet`
    silently and surface the cached one-line summary
  - Stop hook fires once per 4h to nudge if drift accumulated
  - /precompact + /handoff have a natural reason to fire this check
  - cron candidate: every 6h to keep cached report fresh

Slot bravo (claude-549c9f4f, kilo-fallback). /wiring-audit skill auto-
registered in skill index post-Write (verified in session skill listing).
```

## Files touched (3)
- .claude/hooks/__tests__/_smoke-wiring-audit.mjs | 279 ++++++++++++++++++++++++
- .claude/hooks/stop-wiring-audit-suggest.mjs     | 104 +++++++++
- 2 files changed, 383 insertions(+)

## Lessons surfaced in commit body
- till
- till → THIS →
- till silent-exits on this Windows env, per

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 76a24cc380ef`
- Milestone envelope: `mcp-server/data/milestones/AUTOCOMPACT-AUTONOMOUS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._