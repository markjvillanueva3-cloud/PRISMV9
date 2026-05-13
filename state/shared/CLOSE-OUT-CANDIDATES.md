# CLOSE-OUT-CANDIDATES — units that look shipped but envelope says pending

> Generated: 2026-05-13T22:35:51.654Z
> Source: `scripts/audit-close-out-candidates.mjs`
> Filter: min-confidence ≥ 0.75

**Rule:** Advisory only — file presence ≠ spec correctness. Every candidate MUST be human-verified before flipping the envelope. False close-outs corrupt MILESTONE_PROGRESS and BUILD_STATE.

## Summary

- Milestones scanned: 684
- Parse errors (skipped): 1
- Milestones with candidates: 1
- Total candidate units: 4

## Candidates

### CAM-PARITY-AGI-MS0 — CAM System Parity + Post Processor AGI Hardening

| Unit | Title | Confidence | Resolved / Hybrid / Verifiable / Total |
|------|-------|------------|----------------------------------------|
| U-CAMP01 | Mastercam Deep Learning + Material Bridge | 1.00 | 3 / 0 / 3 / 3 |
| U-CAMP13 | CAM AGI Master Orchestrator | 1.00 | 1 / 0 / 1 / 1 |
| U-CAMP14 | Post Processor AGI Unification | 1.00 | 1 / 0 / 1 / 1 |
| U-CAMP15 | Master Post Fine-Tuning System | 1.00 | 1 / 0 / 1 / 1 |

<details><summary>U-CAMP01 evidence</summary>

- ✅ `MastercamDeepLearningEngine.ts` → `H:/prism/mcp-server/src/engines/MastercamDeepLearningEngine.ts`
- ✅ `MastercamMaterialBridgeEngine.ts` → `H:/prism/mcp-server/src/engines/MastercamMaterialBridgeEngine.ts`
- ✅ `MastercamMaterialPhysicsBridge.ts` → `H:/prism/mcp-server/src/engines/MastercamMaterialPhysicsBridge.ts`

</details>

<details><summary>U-CAMP13 evidence</summary>

- ✅ `CAMAGIMasterOrchestratorEngine.ts` → `H:/prism/mcp-server/src/engines/CAMAGIMasterOrchestratorEngine.ts`

</details>

<details><summary>U-CAMP14 evidence</summary>

- ✅ `MasterPostProcessorUnifiedAGIEngine.ts` → `H:/prism/mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts`

</details>

<details><summary>U-CAMP15 evidence</summary>

- ✅ `MasterPostFineTuningEngine.ts` → `H:/prism/mcp-server/src/engines/MasterPostFineTuningEngine.ts`

</details>

## Close-out recipe (per unit)

1. Manually verify each ✅ resolved path actually satisfies the spec intent
   (file existence ≠ correctness — read the file)
2. Edit `mcp-server/data/milestones/<MS>.json` — set unit `status: "complete"`
   with `completed_at`, `completed_by`, and `ship_notes` listing verifications
3. Regen surfaces: `node scripts/build-milestone-progress.mjs && node scripts/build-state-snapshot.mjs`
4. Post chat-bus + commit with `[MS]/U-XXXn: close out ...` message
5. Run 3-of-3 scrutiny via `.claude/scripts/scrutiny-3way.mjs`