# BACKEND-DEV-LOOP/U-H1 — [LIMA] [BACKEND-DEV-LOOP]/U-H1.0-BUNDLE-AWARE: bundle-member detection + known-orphan codification [iter18]

**Commit:** `db3cd391d881` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T18:16:39-05:00
**Tags:** backend-dev-loop, u-h1, auto-distilled

## Subject
[LIMA] [BACKEND-DEV-LOOP]/U-H1.0-BUNDLE-AWARE: bundle-member detection + known-orphan codification [iter18]

## Body
```
[LIMA] [BACKEND-DEV-LOOP]/U-H1.0-BUNDLE-AWARE: bundle-member detection + known-orphan codification [iter18]

iter17 surfaced 392 disk-unwired hooks fleet-wide — but most are not orphans, they're BUNDLE MEMBERS invoked by parent bundles (sessionstart-bundle.mjs, stop-bundle.mjs, bash-bundle.mjs, etc.). iter18 teaches the verifier about bundle composition + codifies the doctrine-mandated intentional orphans.

CHANGES

scripts/verify-hook-refs.mjs:
- New pure exported `collectBundleMembers(bundleSources)`: scans bundle source strings for `${HOOK_BASE}/<name>.mjs` template-literal refs (and relative imports), returns a Set<basename> of hooks reachable via a parent bundle. The lib/hook-runner.mjs plumbing helper is excluded (it backs the bundle's own logic, not a Stop arm).
- `findUnwiredDiskHooks(diskFiles, wiredAbsSet, bundleMembers)` extended with optional 3rd param. Back-compat: 3rd arg defaults to empty Set (existing call sites untouched).
- `KNOWN_DISK_ONLY` populated with `alpha-slot-reaper-guardian.mjs` (per CLAUDE.md §FLEET-REAPER-MS1 + memory [[feedback_golf_owns_reaper]] — alpha→golf doctrine move 2026-05-16; the alpha guardian was UNWIRED but preserved on disk so the move is reversible).
- `main()` reads every bundle source via listMjsFiles(.claude/hooks/bundles) + safeReadText, passes the collected member-set into findUnwiredDiskHooks. Counts payload extended with `bundleMembers` + `knownDiskOnly` totals.

scripts/verify-hook-refs.test.mjs:
- 7 new collectBundleMembers cases (non-array/empty, template-literal extract, relative-import extract, exclude hook-runner, dedup, multi-source, ignore-non-string)
- 4 new findUnwiredDiskHooks cases (bundle exclusion, KNOWN_DISK_ONLY exclusion, test/dot/underscore filter, back-compat default empty bundleMembers)
- 24 → 35 cases total. 35/35 PASS.

LIVE IMPACT (this session)

Before iter18:        drift=392 disk-unwired
After iter18:         drift=325 disk-unwired (−67, −17%) — every removed entry was a bundle member or alpha-slot-reaper-guardian.

PLUS surfaced 6 SETTINGS_TO_MISSING_FILE entries (true hard bugs hidden by the 392 noise):
  • `H:/.claude/hooks/stress-harness-emit.mjs` referenced 3× (SessionStart + PreCompact + Stop) — DOES NOT EXIST ON DISK.
  • `H:/.claude/hooks/stop-force-handoff.mjs` — DOES NOT EXIST ON DISK.
  • `H:/.claude/hooks/stop-force-loop-continue.mjs` — DOES NOT EXIST ON DISK.

Those 5 settings entries are silent failures right now: the harness fires the hook, the command exits non-zero with "file not found", and nothing in the toolchain notices. THIS is exactly the SETTINGS_TO_MISSING_FILE drift class iter17 invented the verifier to catch. Iter19+ work: either restore the missing files OR remove the settings entries (operator triage — both options are reversible but mutually exclusive).

R12 honesty: the 325 remaining drift is still mostly disk-unwired orphans (engines built but never wired). Triaging them is mechanical but per-hook ("does this still serve a purpose? if yes, wire it; if no, move to _archive/"). Bulk-archiving is too risky — [[feedback_never_delete_only_disable]] requires per-entry justification. iter18 ships the LENS that makes the triage tractable; the triage itself stays operator-gated.

LESSON

The iter11-14 wiki-watchdog story repeats fractally. iter17 was a single watchdog (verifier) that surfaced a real fleet bug (392 orphans). iter18 was an iter12-style probe-path refinement (bundle awareness) that revealed 67 of those were false-positives AND 6 were graver bugs the noise was hiding. Same pattern: write the watchdog → discover its first reading is mostly noise → fix the probe → real signal surfaces. The faster the writer-without-reader closure loop, the faster the signal.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- scripts/verify-hook-refs.mjs      | 62 +++++++++++++++++++++++++----
- scripts/verify-hook-refs.test.mjs | 82 +++++++++++++++++++++++++++++++++++++++
- 2 files changed, 136 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- till mostly disk-unwired orphans (engines built but never wired). Triaging them is mechanical but per-hook ("does this still serve a purpose? if yes, wire it; if no, move to _archive/"). Bulk-archiving is too risky — [[feedback_never_delete_only_disable]] requires per-entry justification. iter18 ships the LENS that makes the triage tractable; the triage itself stays operator-gated.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show db3cd391d881`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEV-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._