# HANDOFF — CONTINUE POST WORK
Created: 2026-05-06 (work PC, MARKV) — pickup any PC, any chat
Trigger phrase: **"continue post work"**
Crashed chat: `claude-093e69ac` (PPGMU flag-sweep) — last write 2026-05-06T19:42Z
Stable per-agent handoff: `state/shared/handoffs/HANDOFF-claude-093e69ac-ppgmu-flag-sweep.md`

---

## TL;DR — pick this up exactly here
**Worktree:** `H:/prism-ppgh05`  **Branch:** `work/ppgh05`
**Track:** `[CAM-EXHAUST-MS0]` — Multus PRISM-flag verifier sweep
**Last unit shipped:** `U-PPGMU13 CornerDecel` (commit `74f646818`)
**Next unit:** `U-PPGMU14 ToolBreakDetect`, then `U-PPGMU15 StabilityHints`
**Engine version:** `0.8.0-ppgmu13-cornerdecel`
**Branch state:** 23 commits ahead of `origin/work/ppgh05` — push is safe; all 6 most-recent commits scrutinized.

---

## What was just shipped (this session, in order)
1. `6ab9e1402` U-PPGMU11 ThermalComp accumulator verifier
2. `a95f40224` U-PPGMU12 SpindleWarmup block verifier
3. `ed5393cf2` U-PPGMU12-FIX1
4. `98c1bc757` U-PPGMU12-FIX2 (Codex 3-way scrutiny blockers)
5. `eecae683a` U-PPGMU12-FIX3 (`!end_comment_seen` guard on M5 + regression)
6. `74f646818` U-PPGMU13 CornerDecel G09 emission verifier

All 6 carry an Opus PASS in the scrutiny ledger. U-PPGMU13 had two **false-positive** Codex blockers (constants-policy claim and `toHaveLength` misclassification) — see ledger notes; do not relitigate.

## Test posture
- Multus engine suite: **178/178 + 1 skipped**
- Multus + dispatcher full sweep: **241/241 + 1 skipped** (was 196 at session start)
- `tsc --noEmit`: PPGMU surface clean. Pre-existing errors in `shopDispatcher` / `telemetryDispatcher` / `tenantDispatcher` are **unrelated** — tracked under SYNC-FIX `376d56472`. Do not chase them inside this milestone.

## Resume command sequence (home PC)
```bash
# 1. Make sure you're on the right tree
cd /h/prism-ppgh05
git status
git log --oneline -8                # confirm 74f646818 on top

# 2. Push the 23 unpushed commits (safe — all scrutinized)
rtk git push origin work/ppgh05

# 3. Verify the engine still loads
cd /h/prism-ppgh05/mcp-server
rtk npm run build:fast              # MUST PASS
rtk npx vitest run src/__tests__/OkumaMultus*    # 178/178 + 1 skip

# 4. Read the per-chat handoff for finer details
node H:/prism/.claude/helpers/per-agent-handoff.mjs read --terminal claude-093e69ac
```

## Next unit — U-PPGMU14 ToolBreakDetect (pattern to follow)
**Key discovery from U-PPGMU13 — same archaeology applies here:**
> `shouldAddCornerDecel` was defined at v5.2.7 lines 2308–2313 but **never called**. The verifier surfaces this gap via the `predicate_defined_but_unwired` flag.

For U-PPGMU14, the analogue is `writePRISMToolBreakSetup` at **line 2278** of the Multus engine. Likely the same archaeology will apply — predicate exists but is unwired. Mirror the U-PPGMU13 pattern:
1. Walk the engine for `writePRISMToolBreakSetup` references.
2. If unwired, write a verifier that emits `predicate_defined_but_unwired` and a regression test that fails until it is called from the post body.
3. Bump engine to `0.8.0-ppgmu14-toolbreak`.
4. Commit `[CAM-EXHAUST-MS0]/U-PPGMU14: Multus tool-break-detect verifier`.
5. Run 3-way scrutiny (`node .claude/scripts/scrutiny-3way.mjs --target HEAD`) + Opus reviewer agent.

After that, U-PPGMU15 `StabilityHints`. List of remaining flag predicates lives at the top of the engine file — grep for `shouldAdd*` / `writePRISM*` to enumerate.

## Stale chat-bus claims to release
The crashed chat left active claims on these files (other chats will be blocked from editing):
- `h:/prism-ppgh05/mcp-server/src/schemas/camActionSchemas.ts`
- `h:/prism-ppgh05/mcp-server/src/tools/dispatchers/camDispatcher.ts`
- `h:/prism-ppgh05/mcp-server/src/__tests__/OkumaMultusB250IIMillTurnMasterPostEngine.CornerDecelCrossCheck.test.ts`
- `h:/prism-ppgh05/mcp-server/src/__tests__/camDispatcher.MultusCornerDecel.test.ts`

On resume, run `/reap-zombies` (or `prism_context:reap_stale_claims`) before first edit so file-claim-guard doesn't refuse you.

## Doctrine reminders for post work (do not violate)
- **PRISM enhanced posts (.cps):** always start from the certified Autodesk base in `resources/FUSION BASIC POSTS/` — never write from scratch. Okuma OSP uses `G56` for tool length comp (NOT `G43`). See memory `feedback_post_development`.
- **H: drive is portable** between work PC and home PC — no PC-specific path fixes (memory `feedback_h_drive_portable`).
- **Lane discipline:** stay in the `H:/prism-ppgh05` worktree for PP work. Do NOT commit PP changes from `H:/prism` (the main worktree is on a different milestone, `cad-fusion-live-ms0`).
- **Constants:** never inline Kienzle/Taylor — import from `mcp-server/src/physics/constants.ts`.

## If you're unsure where you are
1. `git -C H:/prism-ppgh05 log --oneline -5` — top should be `74f646818`.
2. `cat H:/prism/state/shared/handoffs/HANDOFF-claude-093e69ac-ppgmu-flag-sweep.md` — finer-grained STATE/RESUME.
3. `cat mcp-server/data/state/SCRUTINY_LEDGER.json | jq '.[].sessionId' | tail -10` — confirm 6 PPGMU entries cleared.

— end —
