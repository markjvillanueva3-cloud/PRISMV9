---
chat_id: claude-641d292f
slot: mike
topic: mike-cad-fusion-live-ms0
branch: cad-fusion-live-ms0
source: live-chat
written_at: 2026-05-20
unit_focus: COMMAND-KERNEL-MS0 close-out sweep
---

## RESUME

Pick up U-CK11 — per-category scrutiny pass over the migrated command corpus. Deliverable: `state/shared/U-CK11-scrutiny-verdicts.md`. Envelope spec at `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` (search `"id": "U-CK11"`). Exit conditions: each of the 13 categories passes a 2-reviewer scrutiny pass; all P0/P1 findings fixed; P2/P3 deferrables logged in the verdicts file. This is the LAST pending COMMAND-KERNEL-MS0 unit — closing it takes the milestone to 29/29. Heavy unit (13 categories × 2 reviewer agents = 26 subagent dispatches) — needs a fresh-budget session.

## STATE — Session 641d292f outcome

**Shipped this session (mike, /loop iter 1-2):**

1. **U-CK03** (commit `082b821088`) — ship `psk-syscalls.test.ts` + fix shebang regression.
   - Root cause: `#!/usr/bin/env node` shebang in `.claude/kernel/psk.mjs` broke Vitest 4's `vm.Script` module evaluator with `SyntaxError: Invalid or unexpected token`. Silently broke ALL 3 psk tests (CK01/02/03) since the Vitest 3→4 bump — 0 of 93 tests had been running.
   - Fixes: removed shebang from psk.mjs + NB comment blocks re-add; `psk-syscalls.test.ts` now imports psk via `pathToFileURL(PSK_PATH).href` inside `beforeAll` (top-level await + hand-built `file://` URL both fail under Vitest 4); `psk.test.ts` 3 stale assertions fixed (U-CK01 placeholder shapes → U-CK02 `{counts, top, origin}` contract).
   - Verified: `psk.test.ts` 24/24, `psk-whoami.test.ts` pass, `psk-syscalls.test.ts` 42/42.

2. **U-CK22** — already shipped (wiki mirror in HEAD, no spec drift). The `.claude/commands/diagnose-fix.md` skill file is gitignored per-machine (intentional doctrine: `.gitignore` excludes `.claude/commands/` by default; 41 files force-added selectively; pipeline-command canonical cross-machine artifact is the wiki mirror at `knowledge/wiki/os/pipelines/<name>.md`). No commit needed for close-out.

3. **U-CK23** — wiki mirror `--max-iter` default 10 → 3 aligned to envelope spec ("<=3 iteration loop then ship"). Commit landed but may have peer-absorbed (74 ins / 3 del / 3 files vs my single-line pathspec) — same shared-tree absorption risk per `[[reference_git_commit_pathspec_2026_05_20]]`. Next session: `git show --stat HEAD~..HEAD` to verify the wiki edit landed and which peer files came along.

**COMMAND-KERNEL-MS0: 28/29 shipped** (was 25/29 at session start; +U-CK03 net +1 + 2 silent-drift close-outs net 0; +U-CK11 pending). All 3 psk test files green (was 0/93 running before).

## CONTEXT TO PRESERVE — discoveries from this session

1. **Vitest 4 + `vm.Script` rejects shebangs.** Node strips `#!` natively from `.mjs` modules; Vitest 4's `VitestModuleEvaluator._runInlinedModule` does NOT. ANY future `.mjs` deliverable that lands under vitest must NOT lead with a shebang. The NB comment in psk.mjs lines 4-9 prevents re-add. This is a Vitest-4-migration class bug that may have hit other `.mjs` modules silently.

2. **`.gitignore` excludes `.claude/commands/` by default.** 41 files force-added selectively (slot wrappers, awareness-snapshot, big-blob-hunt, etc.). Pipeline-command skills (diagnose-fix, program-perfect, learn-pipeline, etc.) are NOT in the 41 — they live per-machine via c-to-h-mirror. The CROSS-MACHINE CANONICAL for pipeline commands is the wiki mirror at `knowledge/wiki/os/pipelines/<name>.md`. Edits to gitignored skill files do NOT propagate via git.

3. **U-CK01's psk.test.ts had stale assertions vs U-CK02's whoami/manifest rewrite** — hidden by the shebang bug for ~weeks. Fixed in commit `082b821088`. U-CK02 changed whoami → no `shell_only`; manifest → `{counts,top,origin}` (was `{shell_only, sources, available}`). Any future post-U-CK02 work on whoami/manifest should reference psk.test.ts:110-143 and 322-336 as the current contract assertions.

## DEFERRED — U-CK11 prep

- Verify the previous U-CK23 commit's true file list (peer-absorption risk): `git log -1 --stat HEAD~..HEAD` for the wiki commit.
- U-CK11 envelope: `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` lines ~1218-1280. Dependencies: U-CK08/09/10 — all shipped. Tools: `.claude/scripts/scrutiny-3way.mjs`. The 13 categories of the migrated command corpus need identification first (re-read U-CK08's commit + the migrated commands tree).
- Mike queue remaining beyond U-CK11: ~60 spec-less golf-migrated database data-ingests (`pending-generator`/`pending-prose-extr`, `domain: database`, `migrated_from: golf`) — these need RGS spec-gen first OR migration back to golf's database lane. Plus large infra units (U-DOCKER-HOOK-BROKER, U-OE-L3) — each needs its own dedicated session.
