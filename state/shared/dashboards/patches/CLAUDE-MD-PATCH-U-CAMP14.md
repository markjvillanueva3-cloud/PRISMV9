# CLAUDE.md patch sibling — U-CAMP14 close-out

**Surface:** `H:/prism/CLAUDE.md` (peer-claimed by claude-88486e9e, claude-md-collapse work)
**Written by:** claude-374fe00e (india slot) — 2026-05-17T22:35:00Z
**Reason for patch-sibling:** Peer-locked surface per the JULIETT-12CHAT-ALLOCATION-MS0 PATCH-SIBLING convention. Apply when collapse work clears.

## Append to `## Recent regressions` section

```
- 2026-05-17 | **calculateTotalConfidence NaN in MasterPostProcessorUnifiedAGIEngine — `(1/inv.invocation_time_ms || 0.01)` evaluated to Infinity when invocation_time_ms===0 (orchestrator entry-point), making weighted-sum/total-weight = NaN.** Every PP-UNIFIED-AGI call silently shipped `total_confidence: NaN` since the engine was first shipped under CAM-PARITY-AGI-MS0/U-CAMP14. Caught by R12 fail-loud `provenance.total_confidence` assertion in the U-CAMP14 close-out test (`expect(p.total_confidence).toBeGreaterThanOrEqual(0)` — NaN fails both numeric comparisons). | fix: `safeWeight(t) => t > 0 ? 1/t : 0.01` helper. | observed-in: this session (U-CAMP14 close-out commit). | verify: `cd H:/prism/mcp-server && npx vitest run src/__tests__/MasterPostProcessorUnifiedAGIEngine.test.ts` → 15/15 PASS; before fix → 14 PASS / 1 FAIL on `total_confidence` NaN.

- 2026-05-17 | **close out U-CAMP14 (Post Processor AGI Unification) — engine shipped without test file** | observed-in: this session | fix: 15-case test + NaN bug fix. CLOSE-OUT-CANDIDATES fleet-wide is now 0. | verify: `node H:/prism/scripts/audit-close-out-candidates.mjs` → 0 candidates.
```

## Apply protocol

After the collapse work commits and CLAUDE.md is released:
1. `git pull` or rebase onto the collapse commit
2. Append the two bullets above to the `## Recent regressions` section (top of the regression list, newest-first ordering)
3. Commit with subject `[CAM-PARITY-AGI-MS0]/U-CAMP14: append regression bullets from patch sibling`
4. Delete this patch file
