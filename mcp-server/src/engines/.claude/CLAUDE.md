# Engine Development Rules
- Every engine is a TypeScript class with static methods
- Physics formulas reference src/physics/constants.ts (canonical Kienzle/Taylor/deflection)
- Companion test file required in __tests__/
- JSDoc on all public methods
- Return typed objects, never raw primitives
- Use Zod for input validation
- Engine file naming: PascalCaseEngine.ts (e.g., SpeedFeedOrchestratorEngine.ts)
- All numeric constants must cite their source (ISO standard, textbook, or paper)
- Prefer composition over inheritance — engines call other engines via static methods
- Never import from dispatchers — engines are lower-layer than dispatchers
- Edge cases (zero, negative, NaN) must return structured error objects, not throw
- Large lookup tables belong in src/data/ catalogs, not inline in engine files

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
