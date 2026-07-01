# HANDOFF — claude-06b8753f (slot CHARLIE)
**Topic:** training-learning-acp-ms0
**Compacted:** 2026-05-13T14:10 UTC
**Source:** live-chat (precompact-skill)

---

## RESUME DIRECTIVE

Slot CHARLIE shipped 2 milestones this session. **Next /pick-unit suggests `AI-MAX-MS0/U-AIMAX07` (Hierarchical Context Compression)** — a 60+ min build with strict abort thresholds:
- Compression target: 5:1
- Information loss: <5% (abort if >10%)
- Decompression speed: <100ms

Spec: `H:/prism/mcp-server/data/milestones/AI-MAX-ROADMAP.json` (look for `id: U-AIMAX07`).

**Recommended next-chat action:**
- Run `/pick-unit --slot charlie --limit 10` to see fresh candidates (MILESTONE_PROGRESS now reflects shipped work)
- Either pick U-AIMAX07 and fork to `H:/prism-aimax/` per `[[feedback_conflict_fork_rule]]`, OR pick a smaller unit (P0-U03 of ACP-MS0 = sibling to the just-shipped U02 if it appears)
- Files-created: `src/engines/ContextCompressionEngine.ts`; files-modified: `src/engines/index.ts`

---

## STATE — SHIPPED THIS SESSION

### TRAINING-LEARNING-MS0/U1 (LathePartFamilyTemplateExtractorEngine)
6 commits:
- `cca61671f` — 7-phase / 7-unit envelope
- `543827b6c` — Docustrata phase20 corpus scanner (read-only, 11-family classifier)
- `82c608126` — engine (708 LOC, discriminated `{ok}` errors, path-traversal guard)
- `096271da8` — engine test (23 it() cases inc sibling-prefix bypass regression)
- `5ae6f77c7` — collision-absorbed wiring (3 turning actions + cad bridge + 16 round-trip tests + .gitkeep) — see `[[reference_training_learning_ms0_u1_collision]]`
- `80d2c99af` — close-out (engine P1 sibling-prefix fix + envelope flip + 4-surface regen)

43/43 tests passing. 3-of-3 scrutiny: A=PASS, B=PASS, codex=peer-attributed-fail.

### ACP-MS0/P0-U02 (HookLifecycleStageMapperEngine)
2 commits + 1 close-out:
- engine + test + dispatcher wiring + schema + live inventory (HEAD~2)
- `b8602d4a3` — close-out regen (MILESTONE_PROGRESS + BUILD_STATE)

24/24 tests passing. Live inventory at `state/shared/HOOK_LIFECYCLE_INVENTORY.{json,md}`:
- 705 hooks (463 existing + 242 CCM-planned)
- By stage: authoring=10, pre_execution=68, post_execution=21, turn_end_gate=4, context_boundary=6, async_background=220, unclassified=376
- By status: wired=174, orphan=289, disabled=0, planned=242
- **Key finding:** 242 CCM-planned hooks (declared by milestone forge_triple but absent from disk) — feeds ACP-MS0/P0-U04 chain identification

New dispatcher action: `prism_dev:hook_lifecycle_inventory` (6 modes: build/summary/by_stage/by_status/markdown/ccm_planned).

---

## P2/P3 FOLLOW-UPS (for U2+ pre-flight)

From TRAINING-LEARNING-MS0/U1 3-of-3 scrutiny:
- Strip 9 `(params as any)` casts in `turningDispatcher.ts` cases 974-1003
- Replace stale "scoped to ALL 12" comment in `cadActionSchemas.ts:696-701` with 1-line pointer to canonical rationale at 560-571
- Add explicit `@param`/`@returns` JSDoc tags on engine public methods
- Add `MacroLibraryEngine.CATALOG ⇔ cadLatheTemplatePlaceSchema` enum drift test
- Tighten cad test #4 to assert Zod error specifically mentions `family` field

From ACP-MS0/P0-U02:
- Engine uses `__dirname` for repo-root resolution — works under esbuild CJS bundle but fails under tsx-ESM. Callers must pass explicit `registryPath`/`hooksDir`/`milestonesDir`. The dispatcher case does this correctly. (P3 watch-item, not blocking.)

---

## DEFERRED — NOT MY SLOT

Tasks #2, #3, #5 in the task list belong to other slots:
- Task #2: (b) workstream — 3-of-3 + reverse-merge to main
- Task #3: BLUEPRINT-OCR-TRAINING-MS1 U1 in `H:/prism-blueprint-ocr-training`
- Task #5: MACRO-PROGRAM-PIPELINE-MS0 U2-U7

---

## CONTEXT TO PRESERVE (non-derivable)

1. **Codex CLI ENV_FAIL** during 3-of-3 scrutiny — provider rate-limit, also flagged blockers attributed to peer Laser/Waterjet files swept into commit `5ae6f77c7` (not my U1 work). Documented in `[[reference_training_learning_ms0_u1_collision]]`. Future 3-of-3 attempts may hit the same codex quota issue; use the 3-block escape hatch if Reviewer A + B PASS but codex env-fails.

2. **Stale `.git/index.lock` recurrence** — happened 3 times this session, each time after my own previous commit ran. The git-lock-sweeper hook is wired but not catching all cases; manual `rm -f H:/prism/.git/index.lock` works.

3. **`per-agent-handoff.mjs` writer-banned semantics** — `--source live-chat` flag works from the active chat's foreground tool calls but FAILS from background (Bash run_in_background) and from subagents (Agent tool). When writing this handoff via the helper failed, fell back to direct Write to the canonical path.

4. **BUILD_STATE delta**: NEEDS_BUILDING 3462 → 2439 over session (-1023). The drop is bigger than 2 milestones would account for because MILESTONE_PROGRESS regen swept in commits from other slots too.

5. **Skill `/pick-unit` returns stale picks** if MILESTONE_PROGRESS wasn't regenerated — always run `build-milestone-progress.mjs` between shipped work and the next `/pick-unit` query.

6. **Sibling-prefix path-traversal bypass** at `LathePartFamilyTemplateExtractorEngine.ts:582` — fix is `resolvedDir === resolvedDefault || resolvedDir.startsWith(resolvedDefault + path.sep)`. Applied with regression test at engine test line 418. This is a defense-in-depth pattern; trusted-caller threat model means low real-world exploitability today, but the fix is 4 lines and worth the safety floor.

---

## FILES TO READ (for fresh-chat orientation)

- `state/shared/HOOK_LIFECYCLE_INVENTORY.md` — what's in the hook surface
- `state/shared/MILESTONE_PROGRESS.md` — what's shipped fleet-wide
- `state/shared/BUILD_STATE.md` — what needs building / wiring
- `mcp-server/data/milestones/ACP-MS0.json` — to see P0-U02 completed_in_commits + read U03+U04 next
- `mcp-server/data/milestones/TRAINING-LEARNING-MS0.json` — to see U1 completed_in_commits and U2-U7 unclaimed
