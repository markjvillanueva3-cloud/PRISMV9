# Asset Value Review — Deletion Backlog

**Generated:** 2026-04-30 by `claude-72bb539a` (scout: 3 parallel agents, ~5 min each)
**Scope:** Full hook + skill + helper inventory across PRISM
**Status:** Planning artifact — actual deletions deferred to follow-up sessions

## Inventory at scout time

| Asset type | Total | Registered | Unregistered | DELETE candidates | CONSOLIDATE candidates |
|---|---|---|---|---|---|
| Hooks | 388-426 (incl. subdirs) | 213 | 209 | 30 (8 HIGH + 22 MED) | 10 groups |
| Skills | 502 (149 project + 353 global) | n/a | 86 same-name dupes | 8 HIGH | 5+ domain pairs |
| Helpers | 158 | n/a | 58 RefCount=0 | 58 HIGH + 32 MED | n/a |
| **Total** | **~1,048** | — | — | **~96 HIGH-confidence DELETE** | **15+ groups** |

## Backlog process

For each candidate:
1. Verify scout findings (registrations may have changed since scout)
2. Check git tracking status (`git ls-files`)
3. Read first ~20 lines to confirm orphan/stub status
4. Check for dynamic-name imports (e.g. `await import(\`./hooks/${name}\`)`) — scout used grep, may miss these
5. Delete via `git rm` if tracked, `rm` if untracked
6. Commit individually or in small batches (group by category)
7. Verify session still works (run a test Edit, ensure no MODULE_NOT_FOUND)

---

## Tier A — Highest-confidence DELETE (no risk of breaking anything)

### A1. Test scaffolding files (4 hooks)
- `hooks/_test-pattern.mjs`
- `hooks/__tests__/hook-test.mjs`
- `hooks/__tests__/concurrency-test.mjs`
- `hooks/lib/action-triple-sync.test.mjs`
- `hooks/lib/bootstrap-mode.test.mjs`
- `helpers/error-learn-store.test.mjs`
- `helpers/scrutiny-ledger.test.mjs`

**Verdict:** DELETE. These are hook-style files but are actually test fixtures. Zero registrations. Move to a proper `__tests__/` if the tests are still useful, otherwise delete.

### A2. Hollow skills (3 skills) — RECLASSIFIED 2026-04-30, DO NOT DELETE
- ❌ `H:/.claude/commands/audit-task.md` — VERIFIED: 163L, 129 non-blank. Comprehensive audit-mode skill for PRISM completed tasks. **KEEP.**
- ❌ `H:/.claude/commands/pick-task.md` — VERIFIED: 157L, 113 non-blank. Task claiming via TaskClaimService for multi-Claude coordination. **KEEP.**
- ❌ `H:/.claude/commands/scripts.md` — VERIFIED: 135L, 117 non-blank. Python script manager for PRISM scripts/. **KEEP.**

**Lesson:** scout looked for YAML frontmatter (`---` block at top) and called files "hollow" if missing. These skills jump straight into instructions without frontmatter — that's a style choice, not absence of content. Future skill-deletion candidates need different validation: line count + content quality, not frontmatter presence.

**Tier A2 effectively empty** after verification. Move to A3 (helper sweep) for the next batch.

### A3. Helpers with RefCount=0 (58 confirmed orphans)
Top 30 (full list of 58 in scout report — re-grep to verify before each delete):
- `advisor-session-log.mjs`
- `agent-index-injector.mjs`
- `ai-self-awareness-inject.mjs`
- `ai-system-activation.mjs`
- `auto-resume-injector.mjs`
- `capability-manifest-inject.mjs`
- `chat-bus-reap.mjs`
- `claim-track.mjs`
- `codex-command-awareness.mjs`
- `codex-parity-audit.mjs`
- `command-awareness-inject.mjs`
- `context-aware-inject.mjs`
- `coordination-summary-generator.mjs`
- `coordination-sync.mjs`
- `cross-session-work-aware.mjs`
- `dedup-detect.mjs`
- `dispatcher-schema-hint.mjs`
- `domain-gap-audit-mill-master.mjs`
- `duplication-guard-hook.mjs`
- `edit-context-enricher.mjs`
- `engine-write-guard.mjs`
- `fix-all-hook-schemas.mjs`
- `fix-sync-main-catch.mjs`
- `hook-response-lint.mjs`
- `hook-safety-audit.mjs`
- `knowledge-augmented-reasoning-v2.mjs`
- `knowledge-augmented-reasoning-v3.mjs`
- `macro-expander.mjs`
- `mcp-http-bridge.mjs`
- `migrate-to-h-drive.mjs`

Plus 28 more (see scout report).

**Verdict:** DELETE. Zero references across hooks/skills/helpers/settings. Re-run grep before each delete.

### A4. Deprecated hooks subfolder (10 hooks)
- `hooks/.deprecated/*` — already in a "deprecated" folder, ready for removal.

**Verdict:** DELETE entire subdirectory. Its purpose is precisely to stage hooks for deletion.

---

## Tier B — Medium-confidence DELETE (verify before removing)

### B1. Telemetry-only "surface" hooks (3)
- `cad-coverage-surface.mjs`
- `cad-unknown-ext-surface.mjs`
- `capability-manifest-surface.mjs`

**Verdict:** DELETE if telemetry data is captured by other systems. CONSOLIDATE if a single inventory hook can replace them.

### B2. Superseded variants
- `goal-stack-init.mjs` + `goal-stack-inject.mjs` (replaced by `session-start-goal-inject`)
- `claude-md-mirror.mjs` (replaced by `c-to-h-mirror`)
- `awareness-floor.mjs` (replaced by `awareness-bootstrap`)
- `copilot-dedup-hook.mjs` (lib variant, replaced by `ai-duplication-guard`)
- `build-guard-hook.mjs` (lib variant, replaced by `duplication-hard-block`)
- `embedding-cache-guard.mjs` (overlaps `file-read-cache`)

**Verdict:** DELETE after verifying the replacement covers the same logic.

### B3. Helpers with RefCount=1 (32 candidates)
For each: confirm the single caller is still active. If the caller is also dead/orphan, delete both.

---

## Tier C — Domain consolidation (high-value but bigger scope)

### C1. WEDM same-name dupes (project + global)
- `wedm-batch.md` exists in both
- `wedm-cite.md` exists in both
- `wedm-program.md` exists in both

**Action:** diff each pair. If identical, keep one (prefer global for portability). If different, merge into one with feature-flagged behavior.

### C2. Lathe umbrella vs. individual skills
- `lathe-ai.md` (global umbrella) appears to shadow 12 `lathe-*.md` skills

**Action:** decide whether umbrella replaces individuals OR individuals are the canonical surface and umbrella is documentation.

### C3. Per-domain harden/learn/optimize/studio/validate quintets (welder, grinder, sinker, mill)
Each domain has a 5-skill set duplicated in project + global. ~25 skills total.

**Action:** verify same-name dupes are actually identical (likely they are — symlinks or copies). Pick one location.

---

## Tier D — Requires deeper analysis (DO NOT auto-delete)

### D1. Registered stubs (3 hooks)
- `stop_close_prism_nodes.mjs` (now superseded by `bash-orphan-cleaner` from prior commit)
- `pre-write-roadmap-home.mjs`
- `stop_on_non_h_roadmap.mjs`

These are registered in `H:/.claude/settings.json` (user-global). Removing the file without removing the registration causes MODULE_NOT_FOUND. Coordinate both.

**Action:** generate diff for user-global settings.json; user applies manually after review.

### D2. Other Tier 3 stubs already deleted this session
- ✅ `session_start_tier1_bolster.mjs` — deleted in commit 5850e5826
- ✅ `claude-flow-health.mjs` — deleted in commit 5850e5826

---

## Workflow recommendation

Each follow-up session: pick ONE tier, verify, delete in small batch, commit. **Don't try to clear everything in one session.**

Suggested order:
1. **Session 1**: Tier A1 (test files) + A2 (hollow skills) — ~10 deletions, low risk, builds confidence
2. **Session 2**: Tier A4 (deprecated subfolder) — bulk removal, simple
3. **Session 3**: Tier A3 (helpers RefCount=0) — 58 deletions, biggest win
4. **Session 4**: Tier B1+B2 (superseded hooks) — verify replacement coverage
5. **Session 5**: Tier B3 (helpers RefCount=1) — case-by-case
6. **Session 6**: Tier C — domain consolidation, requires diffing pairs
7. **Session 7**: Tier D — requires user-global settings.json edits, more careful

Total estimated effort: 6-10 sessions of focused cleanup work for ~96+ deletions.

## Cross-session safety

After EACH deletion batch:
1. Run `git status` to verify no unintended changes
2. Trigger one Edit on a non-critical file to verify hook chain intact
3. Run `npx tsc --noEmit` in mcp-server (~3s) to verify nothing imports a deleted file
4. Commit with `[MAIN] tier-XX-cleanup: ...` message documenting what was removed

## Files referenced

- Scout reports synthesized into this backlog
- Tier 3 stub deletion (this session): commit `5850e5826`
- Critical hook fix (this session): commit `f0d64558c`
- Session-id unification (this session): commit `725bb2ff7`
