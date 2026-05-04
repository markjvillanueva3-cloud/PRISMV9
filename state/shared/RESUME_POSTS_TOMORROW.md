# RESUME — "continue post processor work" (NEXT SESSION'S START)

**Trigger phrase:** `continue post processor work`
**Written:** 2026-05-04 13:00 UTC by claude-04c0e75c
**For:** the next post-processor chat (any session ID)
**Companion:** `RESUME_POSTS.md` (full PPG history) · this file is the focused next-action brief.

---

## DO THIS FIRST (30-second orientation)

```bash
# 1. Confirm work/cam-exhaust-ms0 has the U-PPGM17* trio committed
git -C H:/prism log --oneline | head -10 | grep -E "PPGM17[abc]|PPGM17a"

# 2. Check if peer claim on camDispatcher.ts has released
node H:/prism/.claude/helpers/agent-coordination.mjs read-active-claims | grep camDispatcher

# 3. Verify PPG suite still green
cd H:/prism/mcp-server && node H:/prism/node_modules/vitest/vitest.mjs run \
  src/__tests__/sealWEDMMasterPostOutput.test.ts \
  src/__tests__/postPhysicsSidecarSchema.WEDM.test.ts \
  src/__tests__/PostPhysicsSidecarBlockAnnotations.test.ts \
  src/__tests__/MitsubishiMV1200RWireEDMMasterPostEngine.SidecarIntegration.test.ts \
  src/__tests__/MitsubishiMV1200RWireEDMMasterPostEngine.test.ts \
  src/__tests__/integration/MasterPostMitsubishiMV1200R.integration.test.ts \
  src/__tests__/routes/ppg-master-routes.test.ts \
  src/__tests__/verifyWEDMBlockAnnotations.test.ts
# Expect: 229/229 GREEN.
```

---

## WHAT JUST SHIPPED (2026-05-04 session by claude-04c0e75c)

Three PPG units landed on `work/cam-exhaust-ms0`:

| Commit       | Unit                                              |
|--------------|---------------------------------------------------|
| `018517bb5`  | U-PPGM17a — WEDM seal helper foundation (cherry-picked from `work/wedm-seal` fork; fork retired) |
| `14c4ffb2b`  | U-PPGM17b — `verifyWEDMBlockAnnotations()` tier-aware physics gate (28 tests; PASS_DEFAULTS / E_PACK_TABLE consistency check) |
| `334d9b82c`  | U-PPGM17c — Mitsubishi confidence/safety_margin derivation (3 tests; replaces hardcoded 0.85 / 1.0) |

Test totals: **229/229 GREEN** across 8-file PPG suite. Reviewer agent (subagent_type=reviewer) returned PASS on U-PPGM17b with one cosmetic observation (Object.prototype.toString vs Array.isArray at verifyWEDMBlockAnnotations.ts:238 — non-blocking).

---

## NEXT ACTIONS (priority order)

### Priority 1 — Wire `verify_tier` through camDispatcher.ts (`U-PPGM17d`, was U-PPGM17c in prior brief)

**WHY:** U-PPGM17b ships the `verify_tier` parameter on `sealWEDMMasterPostOutput()` but the dispatcher cases (`master_post_mitsubishi_mv1200r` ~line 5577 and `master_post_by_machine` MITSUBISHI branch ~line 5649) currently DO NOT pass `verify_tier` through. The peer claude-6f69688f had an active edit-claim on `camDispatcher.ts` for U-CAM-HM-MEDMAT-WIRE-01 which blocked the wiring.

**Plan:**
```bash
# 1. Confirm peer claim has released (5min timeout)
node H:/prism/.claude/helpers/agent-coordination.mjs read-active-claims | grep camDispatcher

# 2. If clear: edit camDispatcher.ts to pass verify_tier:
#    - master_post_mitsubishi_mv1200r case (look for `sealWEDM(wedmEngineOutput, {`)
#      Add `verify_tier: p.verify_tier` to the opts object
#    - master_post_by_machine MITSUBISHI branch (look for `sealWEDMRouter(`)
#      Add `verify_tier: (params as any).verify_tier`
#
# 3. Tests in camDispatcher routes test will need to assert the verify
#    field appears on the response when verify_tier is provided. Add
#    ≥2 tests covering pass + hard_block via dispatcher round-trip.
#
# If peer claim still active: fork to H:/prism-ppg-dispatcher-wire on
# work/ppg-dispatcher-wire, do the same edit there, cherry-pick back.
```

### Priority 2 — Tackle pre-existing HurcoV11MillMasterPostEngine sync bugs (`PPG-HARDEN`)

**WHY:** During U-PPGW-AdvancedPost-Wiring (prior session) detected 30/66 pre-existing failures in `HurcoV11MillMasterPostEngine.test.ts`. Symptoms: work-offset, spindle, tool-name emission in the SYNC `generateProgram` path. Async `generateProgramAsync` path is fine.

**Strategy:** triage into ≤5 named sub-failures, fix each with a unit (`U-PPGH01` … `U-PPGH05`), commit independently.

### Priority 3 — Investigate other master post engines for parallel verifier coverage

**WHY:** Now that `verifyWEDMBlockAnnotations()` exists, the same pattern (per-tier physics consistency gate) could apply to:
- Okuma OSP-P*M mill (currently only routes through `sealMasterPostOutput` milling/turning verifier)
- Okuma B250 lathe (same)
- Hurco V11 (same)

Likely lower-priority since the milling/turning verifier already covers their S/F shape — but worth a 30-min sweep to confirm there's no tribal-knowledge-driven emit deviation that the generic verifier misses.

---

## ENVIRONMENT REMINDERS

### vitest path (lives in repo root, not mcp-server)
```bash
cd H:/prism/mcp-server && node H:/prism/node_modules/vitest/vitest.mjs run <file>
```

### tsc path
```bash
cd H:/prism/mcp-server && node H:/prism/node_modules/typescript/bin/tsc --noEmit
```

### Cross-machine git warnings
The H: drive was last used on DESKTOP-N7MI1VB; on MarkV every git command emits:
> warning: safe.directory '%(prefix)\H;C:\Program Files\Git\prism-mill-master' not absolute

This is harmless (a stray `safe.directory` entry from an old config). Don't try to "fix" by editing global gitconfig — pipes still work, status/diff/commit all function.

### Peer-claimed files (refresh on resume)
Sample peer claims observed during 2026-05-04 session:
- `claude-6f69688f` editing `camDispatcher.ts` (U-CAM-HM-MEDMAT-WIRE-01)
- `claude-b93f4e4d` editing `HyperMillJobMonitor.ts` and HyperMill test files
- `claude-9897c938` working on `H:/prism-cad-sw-fidx` worktree (CrossProcessAIBridge / aiReasoningDispatcher)

Re-check `prism_context:read_active_claims` on resume — claims expire after ~5min idle.

---

## KEY FILES (where to look)

| File | Purpose |
|------|---------|
| `mcp-server/src/cps/verifyWEDMBlockAnnotations.ts` | NEW — tier-aware WEDM physics gate |
| `mcp-server/src/cps/verifyBlockAnnotations.ts` | Milling/turning S/F gate (parallel pattern) |
| `mcp-server/src/cps/sealMasterPostOutput.ts` | Both `sealMasterPostOutput()` and `sealWEDMMasterPostOutput()` (now with verify_tier wired for both) |
| `mcp-server/src/engines/MitsubishiMV1200RWireEDMMasterPostEngine.ts` | Now exports PASS_DEFAULTS, E_PACK_TABLE, CONFIDENCE_BY_BASIS, DEFAULT_SAFETY_MARGIN |
| `mcp-server/src/schemas/postPhysicsSidecarSchema.ts` | Schema 1.2.0 — `block_annotations[]` (milling/turning) + `wedm_block_annotations[]` (WEDM) |
| `mcp-server/src/tools/dispatchers/camDispatcher.ts` | master_post_* cases (~5400-5700) — verify_tier wiring DEFERRED to U-PPGM17d |

---

## SUCCESS CRITERIA FOR NEXT SESSION

You're done with one chat-session-worth of post-processor work when:
1. U-PPGM17d (camDispatcher verify_tier wiring) committed with reviewer PASS, OR
2. AT LEAST ONE U-PPGH0* HurcoV11 sync fix committed.
3. RESUME_POSTS_TOMORROW.md refreshed.
4. `/handoff` written for the chat.

That's enough for one session.
