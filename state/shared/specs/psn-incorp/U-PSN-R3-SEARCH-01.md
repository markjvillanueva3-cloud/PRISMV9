# U-PSN-R3-SEARCH-01 — MCTS + LLM (o1-pattern reasoning) prototype

> Auto-generated implementation plan by `scripts/psn-incorp-automate.mjs` from PSN-INCORPORATION-MS0.
> Source spec round: R3. Estimated cost: L. PSN legs touched: 11.
> Slot-soul match: (no domain match — needs operator triage)

## Rationale

AlphaZero pattern; gated on reward model

## Concrete build plan (no stubs allowed per CLAUDE.md §SAFETY)

1. **Pre-flight (mandatory):**
   - Run `duplicationGuardEngine.mustCheckBeforeCreating({assetType:"engine", proposedName, keywords, description})` first.
   - Verify the engine name does NOT exist in `ENGINE_DIGEST.md`.
   - Check `master-index-query` for existing similar capability.

2. **Engine target:**

   - Candidate name: `R3SEARCH01Engine` (verify via dedup before committing).
   - File: `mcp-server/src/engines/<EngineName>.ts`
   - Singleton export pattern: `export const <camelName>Engine = new <EngineName>();`
   - Cost class L → expected size: >800 LOC, 2-6 weeks.

3. **Test target:**

   - File: `mcp-server/src/__tests__/R3SEARCH01Engine.test.ts` (per [[feedback_engine_tests_in_tests_dir]]).
   - Real-behavior tests only (no `toBeDefined()` stubs — hook-rejected per CLAUDE.md §SAFETY).

4. **Dispatcher wiring (engine-wire-to-all-sources doctrine):**

   - Wire to EVERY dispatcher that would naturally consume it (CLAUDE.md §ENGINE WIRING).
   - For DL/ML units: typically `prism_ai` AND `prism_dev` AND a domain-specific dispatcher.
   - For reasoning units: typically `prism_ai` AND `prism_intelligence`.
   - Verify with `stop_on_unwired_assets.mjs` (Stop hook) before committing.

5. **PSN-leg integration per `feedback_psn_definition`:**

   - Leg #11 — must verify integration (see leg map in feedback_psn_definition.md table)

6. **Per-file scrutiny gate (multi-file build):**

   - Dispatch 2 parallel reviewer agents after each file (CLAUDE.md §PER-FILE SCRUTINY GATE).
   - Agent A: content-specialist by file type (physics-review-agent for physics, code-analyzer for utility).
   - Agent B: independent second-pass `reviewer`.

7. **Exit criteria:**

   - Engine produces a non-stub, verifiable output on at least one real input.
   - Tests pass via `npx vitest run mcp-server/src/__tests__/<EngineName>.test.ts`.
   - Build clean: `npm run build` from `mcp-server/`.
   - Dispatcher wired + actionable via `prism_<dispatcher>:<action>`.
   - Wiki entry written to `knowledge/wiki/architecture/<slug>.md`.
   - Memory reference written to `knowledge/memories/reference/reference_<slug>_2026_<date>.md`.
   - 3-of-3 Stop scrutiny ledger entry PASS.

8. **Close-out (4 surfaces per `feedback_roadmap_close_out`):**

   - Envelope `unit_list[].status: pending → complete` + `completed_at` + `closeout_note`.
   - `node scripts/build-milestone-progress.mjs` (regen MILESTONE_PROGRESS).
   - `node scripts/build-state-snapshot.mjs` (regen BUILD_STATE).
   - `node scripts/close-out-milestone.mjs --milestone PSN-INCORPORATION-MS0` (orchestrator).
   - Post commit to `AGENT_CHAT.jsonl`.

## Out-of-scope per R12 fail-loud (named, deferred):

- This unit is L-cost — DO NOT attempt in a single /loop iter. Decompose into phases first.

## Cross-refs

- Source envelope: `mcp-server/data/milestones/PSN-INCORPORATION-MS0.json` (commit 4606d6066a)
- [[feedback_psn_definition]] — 11-leg canonical PSN map
- [[feedback_auto_close_out]] — close-out doctrine
- [[feedback_dont_soften_completeness_gates]] — no stubs
- [[reference_psn_incorporation_ms0_2026_05_23]] — envelope ship reference

_Generated: 2026-05-24T02:35:23.758Z_