---
session: claude-52e77d9e
topic: alpha-hooks-automation-v2
written_at: 2026-05-12T01:04:52.003Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-52e77d9e
status: active
---

# HANDOFF: claude-52e77d9e — ALPHA / HOOKS-AUTOMATION-V2-MS0
Updated: 2026-05-12T01:04:52.003Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-52e77d9e

## STATE
(alpha / HOOKS-AUTOMATION-V2-MS0; U-HKA01 done — 3 commits, 18 tests, Opus PASS, scrutiny ledger not-cleared due to Gemini quota; U-HKA02 next)

## RESUME
HOOKS-AUTOMATION-V2-MS0, main tree (H:/prism, branch cad-fusion-live-ms0). U-HKA01 SHIPPED — 3 commits: 9cdebae79 (wire+harden file-read-cache.mjs hard-deny PreToolUse:Read dedup into read-bundle.mjs + settings.json PreCompact), 0be46a4ab (canonicalPath/realpath normalization of the cache key — Codex review fix — + mirrored PreCompact wiring into repo .claude/settings.json), 31daabd22 (junction-equivalence test). 18 vitest tests pass; E2E verified (hard deny, kill switch PRISM_READ_CACHE=0, slice-aware, PreCompact-clear, path-variant dedup, junction dedup). SCRUTINY: Opus reviewer agent PASS (recorded); Codex's one real blocker (path norm) fixed; Codex round-3 #1 was a misread of 'promises as fs' import (debunked, verified) #2 addressed by test 3d; Gemini ENV_FAIL all rounds (daily quota — resets UTC midnight). Ledger NOT cleared (no clean 3-of-3 obtainable this session) — if needed, re-run: node .claude/scripts/scrutiny-3way.mjs --session-id claude-52e77d9e --target 9cdebae79 (and 0be46a4ab) after UTC midnight. NEXT UNIT: U-HKA02 (T0, defer PreToolUse for autonomous loops) — DEDUP FIRST: read .claude/hooks/autonomous-loop-watchdog.mjs + loop-detector.mjs + token-budget-gate.mjs; likely wire-not-build. decision:'defer' unsupported here — use permissionDecision:'deny'/'ask' + additionalContext. Then U-HKA03..10. Guardrail: don't touch mcp-server/src/tools/dispatchers/hookDispatcher.ts (charlie/claude-fe6af473 owns it).

## CONTEXT

### ⚠️ STARTING A FRESH CHAT FROM THIS HANDOFF
A *newer* handoff from another chat (`claude-f18397fe` / SKILLS-UTILIZATION-MS0, fork worktree `H:/prism-skills-util`) may be the "family-latest" — so a plain `/startup` or `/checkin` could surface the WRONG handoff. In the new chat's FIRST prompt, say explicitly: **"resume from `state/shared/handoffs/HANDOFF-claude-52e77d9e-alpha-hooks-automati.md` — continue HOOKS-AUTOMATION-V2-MS0 in the main tree"** (then `/checkin as alpha and continue work on hooks`).

### START HERE
1. `/checkin as alpha and continue work on hooks`. Slot `alpha` was held by `claude-52e77d9e` (this chat); if it's gone >10min it auto-reclaims, else `node .claude/helpers/chat-slots.mjs claim --chatId <you> --preferSlot alpha --force true` — or just take a free slot; the work is in git, not tied to the slot.
2. Branch `cad-fusion-live-ms0`, **MAIN TREE `H:/prism`** — do NOT fork a worktree for `.claude/hooks/` work (charlie's note: fresh worktrees can't build the branch HEAD; hooks live in the main tree anyway).
3. Milestone spec: `state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-HOOKS-AUTOMATION-V2-MS0-ATOMIZED-2026-05-10.md` (units U-HKA01..U-HKA10). `.claude/hooks/` is alpha's lane (delta/`claude-eebcfc92` explicitly ceded it on the chat bus). Alpha's full lane list: `state/shared/atomic-roadmap-chat-1.md`.

### DONE THIS SESSION — /checkin + U-HKA01 (3 commits on cad-fusion-live-ms0)
- `9cdebae79` — wired + hardened `.claude/hooks/file-read-cache.mjs` (a hard-deny PreToolUse:Read dedup hook that already existed as an untracked ORPHAN) into `.claude/hooks/bundles/read-bundle.mjs` `READ_HOOKS` + the `settings.json` PreCompact group. (Spec said "create read-once-guard.mjs"; `file-read-cache.mjs` already did it → wired, not duplicated, per the dedup mandate.) Hardening: EXEMPT_PATTERNS (handoffs / settings.json / MEMORY.md / CLAUDE.md / anything under `/state/` / `*.jsonl` / `*.log` are never hard-denied), directory skip, image/PDF skip, `MAX_ENTRIES=400` LRU cap (was unbounded), TTL 2h→30min, `PRISM_READ_CACHE=0` kill switch, `PRISM_READ_CACHE_DIR/_TTL_MS/_MAX` env overrides, atomic-rename writes, `main()` gated behind an invoked-directly check (import-safe), helpers exported (`isExempt`, `cacheKey`, `canonicalPath`, `pruneCache`, `decideRead`, `clearSession`, `loadCache`, `saveCache`).
- `0be46a4ab` — `canonicalPath()` (fs.realpath → path.resolve fallback → lowercase on win32) normalizes the cache key so `H:/PRISM/x` vs `H:/prism/x` vs `H:\prism\x` vs `./..`-laden paths vs symlink/junction all dedup to ONE key (Codex review fix). Also mirrored the PreCompact wiring into the repo-tracked `H:/prism/.claude/settings.json`.
- `31daabd22` — junction-equivalence test (Codex review #2; junction-creation needs no admin on Windows, falls through if unsupported).
- Tests: `.claude/hooks/__tests__/file-read-cache.test.mjs` — **18 vitest cases, all pass**. Run: `cd H:/prism && node mcp-server/node_modules/vitest/vitest.mjs run --config .claude/helpers/vitest.config.mjs .claude/hooks/__tests__/file-read-cache.test.mjs` (`rtk vitest run --config ...` works too, but rtk's vitest summary glitched to "PASS (0) FAIL (0)" once — the raw command is authoritative).
- E2E verified through the wired bundle: 2nd identical Read of an unchanged file → `{continue:false}` + `permissionDecision:"deny"`; `PRISM_READ_CACHE=0` → allowed; a different offset/limit slice → allowed; a PreCompact event → that session's cache cleared (telemetry `precompact-clear`); path-variant (`H:/PRISM/./package.json`) + junction reads → deduped.
- Telemetry: `H:/prism/.claude/cache/hook-telemetry.jsonl` gets `{hook:"file-read-cache", event:"miss-recorded"|"deny"|"precompact-clear", ...}`.

### SCRUTINY GATE — ledger NOT cleared (environmental, not code)
Ledger: `mcp-server/data/state/SCRUTINY_LEDGER.json`, session id `claude-52e77d9e`. Current entry: `opusReviewed:true / opusVerdict:pass`, `agentReviewed:true`, `codexReviewed:false / codexVerdict:fail` (STALE — that fail is round-2's path-norm blocker, fixed in `0be46a4ab`; the codex re-runs since then were a misread (round 3) then an ENV_FAIL (round 4)), `geminiVerdict:fail` (ENV_FAIL every round — daily quota, resets UTC midnight), `cleared:false`, `blockCount:0`.
- **Opus reviewer agent → PASS** — thorough: traced every fail-open path (kill switch, garbled stdin, missing file, corrupt cache, invokedDirectly guard), the deny-gating (exact session/mtime/slice key + 30min TTL + PreCompact-clear + kill switch), 6-chat concurrency (atomic writes, session-scoped keys), and test quality (concrete intent assertions, no `toBeDefined()` stubs).
- **Codex** → round 1/2 found ONE real blocker (cache key used the raw `file_path`, not a normalized path) → FIXED in `0be46a4ab`. Round 3 #1 ("`fs.realpath` is the callback API → always falls back to path.resolve") was a MISREAD of `import { promises as fs }` — verified `fs/promises.realpath` returns a Promise and `canonicalPath` resolves junctions end-to-end; #2 ("the new test only covers lexical normalization, not symlink/junction") addressed by test 3d. Round 4 Codex ENV_FAIL'd (transport / Notion-MCP-auth noise).
- **Gemini** → ENV_FAIL every round (daily quota; resets UTC midnight) — no substantive review obtainable.
- → A clean 3-of-3 was NOT obtainable this session. To refresh it in a fresh chat after UTC midnight: `node .claude/scripts/scrutiny-3way.mjs --session-id claude-52e77d9e --target 9cdebae79` then `--target 0be46a4ab` (the script only takes single-commit `--target`, not ranges), then `node .claude/scripts/scrutiny-3way.mjs --mark-opus pass --session-id claude-52e77d9e --notes "<...>"` (Opus already PASSed; you can re-affirm). Otherwise the Stop-hook escape hatch (3 block attempts → auto-pass) covers it — the code is verified by the 18 tests + the E2E checks + the Opus PASS; the gap is purely the Gemini quota.

### NEXT UNIT — U-HKA02 (T0, "defer PreToolUse decision for autonomous loops")
- Spec micro-step: `.claude/hooks/autonomous-loop-defer.mjs` — PreToolUse, track tool-fire-rate per session, if >50 fires in 5min → defer/cooldown. verifies_via: integration (mock 1000-iter loop → fires at iter ~50).
- **DEDUP FIRST (mandatory)**: `autonomous-loop-watchdog.mjs`, `loop-detector.mjs`, `token-budget-gate.mjs`, `node-process-janitor.mjs`, `cognitive-budget-allocator.mjs` already exist in `.claude/hooks/`. Read them — U-HKA02 is almost certainly a wire-not-build job like U-HKA01 (this milestone is full of already-built-but-orphaned hooks; the roadmap shows all 10 units as `[?]` because it doesn't track what's on disk).
- **`decision:"defer"` is NOT supported in this harness** (no hook uses it; standard CC PreToolUse output is `permissionDecision: allow|deny|ask`, and `hook_event_name: PreToolUse` in `hookSpecificOutput`). Implement the throttle as `permissionDecision:"deny"` (hard) or `"ask"` at a high threshold + `additionalContext` nudge below it. Note: `bundles/lib/hook-runner.mjs runBundle` propagates any sub-hook's `permissionDecision:"deny"` → so wiring into a bundle works.
- Then U-HKA03..U-HKA10 (most are T1; see the atomized spec for the per-unit micro-steps).

### GUARDRAILS — other chats' lanes (`file-claim-guard` PreToolUse HARD-BLOCKS edits to these)
- `mcp-server/src/tools/dispatchers/hookDispatcher.ts` — owned by charlie/`claude-fe6af473` (HOOK-MANIFEST-DAG-MS26 P0-U01/U02, uncommitted WIP). DON'T TOUCH. HOOK-MANIFEST-DAG-MS26 is charlie's milestone, not alpha's — don't pick up its units even though they're "hook" units.
- `.claude/scripts/verify-hook-refs.mjs` — owned by `claude-ac4ef13f` (uncommitted WIP). Don't touch.
- `.claude/hooks/auto-lint-post-edit.mjs` — owned by `claude-671e2b1f` (uncommitted WIP). Don't touch.
- `mcp-server/src/engines/LLMEngine.ts` — 2 uncommitted lines, no owner — pre-existing, not ours, leave it.
- Other active chats seen this session: `claude-f18397fe` (SKILLS-UTILIZATION-MS0, worktree `H:/prism-skills-util`), `claude-eebcfc92` (COST-CASCADE-MS0, worktree `H:/prism-cost-cascade` — deferred U-TOKEN-BUDGET-GUARD to alpha since it touches `.claude/hooks/`). Stay out of `mcp-server/src/engines/*` + `devDispatcher.ts` + `AISystemRouterEngine.ts` if those chats are live (delta's touch surface).

### REPO / SETTINGS STATE
- Branch `cad-fusion-live-ms0`, ~59 commits ahead of origin (push pending — git-sync-stop handles). Working tree carries ~7245 pre-existing uncommitted changes (~99% auto-generated state files — NOT ours; NEVER `git add .` — add explicit paths only). Our 4 files (`file-read-cache.mjs`, `bundles/read-bundle.mjs`, `__tests__/file-read-cache.test.mjs`, `.claude/settings.json`) are all committed.
- settings.json: U-HKA01 added one `file-read-cache.mjs` entry to the **PreCompact** group — applied to `C:/Users/wompu/.claude/settings.json` (canonical — edit ONLY here; `c-to-h-mirror` hook replicates C:→H: on save), auto-mirrored to `H:/.claude/settings.json`, and also added to `H:/prism/.claude/settings.json` (repo-tracked copy). All three consistent. A fresh chat starting "with updated settings" is fine — nothing to undo. If another chat changed settings.json since, `settings-mirror-guard` (SessionStart) + `c-to-h-mirror` keep the copies aligned — just `/checkin` and proceed.

### KEY COMMANDS
- Run the U-HKA01 tests: `cd H:/prism && node mcp-server/node_modules/vitest/vitest.mjs run --config .claude/helpers/vitest.config.mjs .claude/hooks/__tests__/file-read-cache.test.mjs`
- Inspect the read-cache live: `node scripts/ollama-offload-dashboard.mjs` won't help — instead `cat H:/prism/.claude/cache/file-read-cache.json` and `tail H:/prism/.claude/cache/hook-telemetry.jsonl | grep file-read-cache`
- Disable the read-dedup hook if it ever misbehaves: `PRISM_READ_CACHE=0` in env (or remove `file-read-cache.mjs` from `bundles/read-bundle.mjs` READ_HOOKS).
- Fleet status: `node scripts/fleet-status.mjs` · chat bus: `node .claude/helpers/agent-coordination.mjs`
