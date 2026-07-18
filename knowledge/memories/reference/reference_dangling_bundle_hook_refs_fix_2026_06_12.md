---
name: reference_dangling_bundle_hook_refs_fix_2026_06_12
description: 2026-06-12 slot:alpha fixed the user-reported "Cannot find module 'linear-roadmap-sync.mjs'" error firing in chats. ROOT CAUSE: disabled hooks (moved to _disabled/, settings.json refs removed) were left REFERENCED in hook bundle SUB_HOOKS lists; the bundle runner does NOT fail-soft on a missing sub-hook path so a raw Node MODULE_NOT_FOUND surfaced every SessionStart/Stop/edit. Removed 3 dangling refs across 3 bundles + shipped a permanent regression guard test that immediately caught a 3rd ref the targeted scan missed.
type: reference
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:46.535Z
aliases: reference_dangling_bundle_hook_refs_fix_2026_06_12
---


# Dangling bundle hook refs -> "Cannot find module" (fixed 2026-06-12, slot:alpha)

**User report:** `Error: Cannot find module 'H:\prism\.claude\hooks\linear-roadmap-sync.mjs'` firing in chats.

**Root cause.** When a hook is disabled (`[[feedback_never_delete_only_disable]]`: move the `.mjs` to `.claude/hooks/_disabled/` + remove its `settings.json` entry), its entry must ALSO be removed from any hook **bundle** `SUB_HOOKS` list (`bundles/*.mjs`). `linear-roadmap-sync.mjs` + `supabase-state-sync.mjs` had their settings.json refs cleaned (2026-06-08) + were added to `stop_on_hook_unregistration.mjs`'s `INTENTIONALLY_DISABLED` set — BUT their `{ path: \`${HOOK_BASE}/...mjs\` }` SUB_HOOKS entries were left in `sessionstart-bundle.mjs` + `stop-bundle.mjs`. The bundle runner (`lib/hook-runner.mjs`) does NOT fail-soft on a missing sub-hook path, so a raw Node `MODULE_NOT_FOUND` surfaced on every SessionStart/Stop.

**Fix (slot/alpha `3fac0c45bd` + [MAIN-FORCE] `443d281937`).** Removed 3 dangling refs:
- `sessionstart-bundle.mjs`: linear-roadmap-sync, supabase-state-sync
- `stop-bundle.mjs`: linear-roadmap-sync, supabase-state-sync
- `posttool-edit-bundle.mjs`: **token-economy-hook.mjs** (a hook that was never committed anywhere — pure dangling ref)
+ added `token-economy-hook.mjs` to `INTENTIONALLY_DISABLED`. Tooling: `scripts/fix-dangling-bundle-hooks.mjs` (idempotent raw-FS, scans ALL bundles, node --check + rollback). VERIFIED: bundles execute end-to-end with 0 MODULE_NOT_FOUND; 0 dangling refs fleet-wide.

**THE LESSON / permanent guard.** This class recurred >=2x (U-AAM04-FIX3 + now). Shipped `scripts/__tests__/bundle-hook-refs-exist.test.mjs` (10/10): asserts NO bundle references a `${HOOK_BASE}/*.mjs` missing from the active hooks dir. **The guard IMMEDIATELY caught the 3rd dangling ref (token-economy-hook) that my targeted 2-bundle scan missed** — the value of a comprehensive guard over a targeted fix. Two doctrines reinforced: (1) disabling a hook = remove it from settings.json AND every bundle, in one move; (2) when fixing one instance of an error class, scan the WHOLE class (all bundles), don't just patch the reported file.

**Bonus:** the [MAIN-FORCE] commit was blocked by a 203s STALE `.git/index.lock` (orphan from a crashed peer git process, 5 live git.exe under shared-tree contention). Resolved safely via `.claude/helpers/git-commit-mutex.mjs commit` (atomic-rename stale reclaim, DEFAULT_STALE_MS=120000) -- NOT a manual `rm` (which could corrupt a live peer). The mutex is the canonical tool for shared-tree commits under contention. Sister: [[reference_worktree_route_empty_token_bug_2026_06_12]] (also a fleet-infra fix this session).