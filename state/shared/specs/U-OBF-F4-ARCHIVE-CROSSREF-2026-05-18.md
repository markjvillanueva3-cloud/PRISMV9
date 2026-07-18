# U-OBF-F4-ARCHIVE-CROSSREF — Hook archive cross-reference (2026-05-18)

**Source audit:** H:\prism\state\shared\specs\U-OBF-F4-HOOK-FIRE-AUDIT-2026-05-18.json
**Audit baseline:** 2026-05-18T20:27:52.105Z
**Audit ledger window:** 435.9437075h

## Headline

| Metric | Count |
|---|---|
| Unwired-on-disk candidates (input) | 380 |
| **Safe to archive** (zero external refs) | **0** |
| Referenced elsewhere (keep active) | 380 |

## Risk-class histogram (referenced-elsewhere bucket)

- **doctrine-reference**: 17
- **bundle-reference**: 69
- **skill-reference**: 21
- **hook-reference**: 273

## Safe-to-archive — top 25

These have zero references outside their own source file. Archive-safe pending operator review.


## Referenced-elsewhere — top 25

These are referenced by skills, docs, bundles, or scripts. KEEP wired pending per-hook source review.

- `_envelope` (10 refs, class=hook-reference)
  - `.claude/hooks/hook-tier-validator.mjs:14` — `* Skips: _envelope.mjs (wrapper, no tier of its own), 'lib/*' (helper modules),`
  - `scripts/audit-hook-wiring.test.mjs:89` — `orphan: { id: "_envelope", file: ".claude/hooks/_envelope.mjs", tier: "T3", issues: [] },`
  - ... (+8 more in JSON artifact)
- `agent-boundary-guard` (3 refs, class=bundle-reference)
  - `.claude/hooks/bundles/edit-bundle.mjs:58` — `{ path: '${HOOK_BASE}/agent-boundary-guard.mjs',           timeout: 2000, cacheable: false },`
  - `knowledge/wiki/architecture/hooks/runtime/agent-boundary-guard.md:6` — `source_path: H:/prism/.claude/hooks/agent-boundary-guard.mjs`
  - ... (+1 more in JSON artifact)
- `agent-registry-load` (2 refs, class=hook-reference)
  - `knowledge/wiki/architecture/hooks/runtime/agent-registry-load.md:6` — `source_path: H:/prism/.claude/hooks/agent-registry-load.mjs`
  - `knowledge/wiki/architecture/hooks/runtime/agent-registry-load.md:17` — `**Source:** runtime  ·  **File:** 'H:/prism/.claude/hooks/agent-registry-load.mjs'`
- `agent-util-log` (2 refs, class=hook-reference)
  - `knowledge/wiki/architecture/hooks/runtime/agent-util-log.md:6` — `source_path: H:/prism/.claude/hooks/agent-util-log.mjs`
  - `knowledge/wiki/architecture/hooks/runtime/agent-util-log.md:17` — `**Source:** runtime  ·  **File:** 'H:/prism/.claude/hooks/agent-util-log.mjs'`
- `agent-watchdog` (3 refs, class=hook-reference)
  - `knowledge/wiki/architecture/hooks/runtime/agent-watchdog.md:6` — `source_path: H:/PRISM/.claude/hooks/agent-watchdog.mjs`
  - `knowledge/wiki/architecture/hooks/runtime/agent-watchdog.md:17` — `**Source:** runtime  ·  **File:** 'H:/PRISM/.claude/hooks/agent-watchdog.mjs'`
  - ... (+1 more in JSON artifact)
- `aggressive-killer-stop` (2 refs, class=hook-reference)
  - `knowledge/wiki/architecture/hooks/runtime/aggressive-killer-stop.md:6` — `source_path: H:/prism/.claude/hooks/aggressive-killer-stop.mjs`
  - `knowledge/wiki/architecture/hooks/runtime/aggressive-killer-stop.md:17` — `**Source:** runtime  ·  **File:** 'H:/prism/.claude/hooks/aggressive-killer-stop.mjs'`
- `agi-safety-envelope-guard` (2 refs, class=hook-reference)
  - `knowledge/wiki/architecture/hooks/runtime/agi-safety-envelope-guard.md:6` — `source_path: H:/prism/.claude/hooks/agi-safety-envelope-guard.mjs`
  - `knowledge/wiki/architecture/hooks/runtime/agi-safety-envelope-guard.md:17` — `**Source:** runtime  ·  **File:** 'H:/prism/.claude/hooks/agi-safety-envelope-guard.mjs'`
- `ai-auto-command-router` (3 refs, class=hook-reference)
  - `.claude/hooks/capability-reminder.mjs:10` — `* Complements ai-auto-command-router.mjs (which suggests slash commands) by`
  - `knowledge/wiki/architecture/hooks/runtime/ai-auto-command-router.md:6` — `source_path: H:/prism/.claude/hooks/ai-auto-command-router.mjs`
  - ... (+1 more in JSON artifact)
- `ai-duplication-guard` (3 refs, class=hook-reference)
  - `.claude/hooks/hook-creation-gate.mjs:15` — `*   - the existing 'ai-duplication-guard.mjs' + 'duplication-hard-block.mjs' already`
  - `knowledge/wiki/architecture/hooks/runtime/ai-duplication-guard.md:6` — `source_path: H:/prism/.claude/hooks/ai-duplication-guard.mjs`
  - ... (+1 more in JSON artifact)
- `ai-feature-recommend` (8 refs, class=doctrine-reference)
  - `.claude/hooks/fix-stdin-pattern.mjs:24` — `'ai-feature-recommend.mjs',`
  - `.claude/hooks/ollama-unified-semantic-router.mjs:32` — `'ai_features',      // ai-feature-recommend.mjs`
  - ... (+6 more in JSON artifact)
- `ai-reasoning-inject` (3 refs, class=bundle-reference)
  - `.claude/hooks/bundles/edit-bundle.mjs:57` — `{ path: '${HOOK_BASE}/ai-reasoning-inject.mjs',            timeout: 2000, cacheable: false },`
  - `knowledge/wiki/architecture/hooks/runtime/ai-reasoning-inject.md:6` — `source_path: H:/prism/.claude/hooks/ai-reasoning-inject.mjs`
  - ... (+1 more in JSON artifact)
- `ai-session-sync` (2 refs, class=hook-reference)
  - `knowledge/wiki/architecture/hooks/runtime/ai-session-sync.md:6` — `source_path: H:/prism/.claude/hooks/ai-session-sync.mjs`
  - `knowledge/wiki/architecture/hooks/runtime/ai-session-sync.md:17` — `**Source:** runtime  ·  **File:** 'H:/prism/.claude/hooks/ai-session-sync.mjs'`
- `ai-system-activate` (2 refs, class=hook-reference)
  - `knowledge/wiki/architecture/hooks/runtime/ai-system-activate.md:6` — `source_path: H:/prism/.claude/hooks/ai-system-activate.mjs`
  - `knowledge/wiki/architecture/hooks/runtime/ai-system-activate.md:17` — `**Source:** runtime  ·  **File:** 'H:/prism/.claude/hooks/ai-system-activate.mjs'`
- `allow-superseding` (2 refs, class=hook-reference)
  - `knowledge/wiki/architecture/hooks/runtime/allow-superseding.md:6` — `source_path: H:/prism/.claude/hooks/allow-superseding.mjs`
  - `knowledge/wiki/architecture/hooks/runtime/allow-superseding.md:17` — `**Source:** runtime  ·  **File:** 'H:/prism/.claude/hooks/allow-superseding.mjs'`
- `alpha-slot-reaper-guardian` (13 refs, class=doctrine-reference)
  - `.claude/commands/checkin-alpha.md:10` — `> **Doctrine shift 2026-05-16:** alpha no longer owns the fleet-reaper. Ownership moved to **golf** to unify fleet-hygiene under one slot (golf already hosts...`
  - `.claude/commands/fleet-reaper.md:69` — `> 'alpha-slot-reaper-guardian.mjs' file is preserved on disk per`
  - ... (+11 more in JSON artifact)
- `anti-pattern-detector` (4 refs, class=bundle-reference)
  - `.claude/hooks/bundles/edit-bundle.mjs:48` — `{ path: '${HOOK_BASE}/anti-pattern-detector.mjs',          timeout: 2000, cacheable: false },`
  - `knowledge/wiki/architecture/hooks/runtime/anti-pattern-detector.md:6` — `source_path: H:/prism/.claude/hooks/anti-pattern-detector.mjs`
  - ... (+2 more in JSON artifact)
- `anti-regression-auto-sweep` (3 refs, class=hook-reference)
  - `knowledge/wiki/architecture/hooks/runtime/anti-regression-auto-sweep.md:6` — `source_path: H:/prism/.claude/hooks/anti-regression-auto-sweep.mjs`
  - `knowledge/wiki/architecture/hooks/runtime/anti-regression-auto-sweep.md:17` — `**Source:** runtime  ·  **File:** 'H:/prism/.claude/hooks/anti-regression-auto-sweep.mjs'`
  - ... (+1 more in JSON artifact)
- `api-contract-enforcer` (4 refs, class=bundle-reference)
  - `.claude/hooks/bundles/edit-bundle.mjs:54` — `{ path: '${HOOK_BASE}/api-contract-enforcer.mjs',          timeout: 2000, cacheable: false },`
  - `knowledge/wiki/architecture/hooks/runtime/api-contract-enforcer.md:6` — `source_path: H:/prism/.claude/hooks/api-contract-enforcer.mjs`
  - ... (+2 more in JSON artifact)
- `appdata-junction-guard` (2 refs, class=hook-reference)
  - `knowledge/wiki/architecture/hooks/runtime/appdata-junction-guard.md:6` — `source_path: H:/prism/.claude/hooks/appdata-junction-guard.mjs`
  - `knowledge/wiki/architecture/hooks/runtime/appdata-junction-guard.md:17` — `**Source:** runtime  ·  **File:** 'H:/prism/.claude/hooks/appdata-junction-guard.mjs'`
- `asset-deletion-block` (7 refs, class=bundle-reference)
  - `.claude/hooks/bundles/edit-bundle.mjs:32` — `{ path: '${HOOK_BASE}/asset-deletion-block.mjs',           timeout: 3000 },`
  - `.claude/hooks/fix-stdin-pattern.mjs:25` — `'asset-deletion-block.mjs',`
  - ... (+5 more in JSON artifact)
- `async-pattern-checker` (5 refs, class=hook-reference)
  - `.claude/hooks/unified-local-validation.mjs:11` — `* - async-pattern-checker.mjs (async pattern checks)`
  - `scripts/_archive/closed-milestones/u-d1-thin-edit-hook-chain.mjs:31` — `["async-pattern-checker.mjs",      "redundant — TS strict + tsc --noEmit catch the same patterns. THIS is the hook that OOM'd."],`
  - ... (+3 more in JSON artifact)
- `auto-bug-hunt-after-build` (3 refs, class=hook-reference)
  - `knowledge/wiki/architecture/hooks/runtime/auto-bug-hunt-after-build.md:6` — `source_path: H:/prism/.claude/hooks/auto-bug-hunt-after-build.mjs`
  - `knowledge/wiki/architecture/hooks/runtime/auto-bug-hunt-after-build.md:17` — `**Source:** runtime  ·  **File:** 'H:/prism/.claude/hooks/auto-bug-hunt-after-build.mjs'`
  - ... (+1 more in JSON artifact)
- `auto-consensus-critical-edit` (3 refs, class=bundle-reference)
  - `.claude/hooks/bundles/edit-bundle.mjs:65` — `{ path: '${HOOK_BASE}/auto-consensus-critical-edit.mjs',   timeout: 8000 },`
  - `knowledge/wiki/architecture/hooks/runtime/auto-consensus-critical-edit.md:6` — `source_path: H:/prism/.claude/hooks/auto-consensus-critical-edit.mjs`
  - ... (+1 more in JSON artifact)
- `auto-fork-executor` (5 refs, class=hook-reference)
  - `knowledge/wiki/architecture/hooks/runtime/auto-fork-executor.md:6` — `source_path: H:/prism/.claude/hooks/auto-fork-executor.mjs`
  - `knowledge/wiki/architecture/hooks/runtime/auto-fork-executor.md:17` — `**Source:** runtime  ·  **File:** 'H:/prism/.claude/hooks/auto-fork-executor.mjs'`
  - ... (+3 more in JSON artifact)
- `auto-learn-budget-guard` (3 refs, class=hook-reference)
  - `.claude/hooks/__tests__/auto-learn-budget-guard.test.mjs:23` — `} from "../auto-learn-budget-guard.mjs";`
  - `knowledge/wiki/architecture/hooks/runtime/auto-learn-budget-guard.md:6` — `source_path: H:/prism/.claude/hooks/auto-learn-budget-guard.mjs`
  - ... (+1 more in JSON artifact)
- ... (+355 more in JSON artifact)

## Next step

`U-OBF-F4-ARCHIVE` (queued, operator-gated):

1. Create archive directory `.claude/hooks/_archive/2026-05-18-unwired-orphans/`
2. Iterate the `safe_to_archive` list and emit a git-mv command per entry, source `.claude/hooks/<name>.mjs` to the archive directory. Per [[feedback_never_delete_only_disable]]: move, never delete; git mv preserves history.
3. Verify Grep and Glob no longer surface the archived names.
4. Commit with subject `[SCOPE]/U-OBF-F4-ARCHIVE: archive N unwired-on-disk hooks (zero external refs)`

Advisory only. Per-hook operator review still recommended for any name that overlaps with a planned-but-not-yet-built milestone.
