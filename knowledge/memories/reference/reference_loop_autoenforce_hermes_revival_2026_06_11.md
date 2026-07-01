---
name: loop-autoenforce-hermes-revival-2026-06-11
description: "Operator directive: make /loop AUTO-ENFORCED (not suggested) + improve hermes + command the fleet tonight. Shipped: (1) loop auto-enforce via stop-force-loop-continue block-to-continue (revived a hook that was 100% dead on Windows -- execFileSync('node') ENOENT); (2) revived the zulu/hermes orchestrator sweep -- doubly dead (zebra->zulu import crash + zebraOptIn/zuluOptIn field mismatch = silent end-to-end no-op). Commits c7607e2b74, 5e92dc05f6."
type: reference
galaxy: agent-orchestration
source: prism-memory
synced: 2026-06-27T20:30:46.647Z
aliases: reference_loop_autoenforce_hermes_revival_2026_06_11
---


**Loop auto-enforcement + Hermes orchestrator revival (slot:zulu, 2026-06-11).** Operator: "improve loop utilization (read the loop articles), have it AUTO-ENFORCED instead of just suggested; improve hermes; act as a hermes agent and command the fleet tonight." Grounded in `state/shared/articles/2026-06-10-addy-osmani-loop-engineering.md` ("design loops that prompt your agents"; `/loop` re-runs on cadence, `/goal` runs until a verifiable stop-condition with a SEPARATE model checking done; 3 failure modes: verification-on-you / comprehension-debt / cognitive-surrender).

## 1. Loop auto-enforce (commit c7607e2b74)
`stop-force-loop-continue.mjs` was advisory-only AND **100% dead in production**: `readLoopState` did `execFileSync("node", ...)` which throws ENOENT in the hook spawn env on Windows (bare "node" not resolvable without shell/PATHEXT) -> always returned null -> neither advisory NOR anything fired. Fixed to `process.execPath`. Then added enforcement: `PRISM_FORCE_LOOP_BLOCK=1` (set in settings.json) -> an active /loop (status=running, iter<target) emits `{decision:"block"}` to force in-session continuation (mirrors the /goal keeper). THREE bounds (never spins/burns unbounded): loop target; no-progress stuck-detector (`PRISM_FORCE_LOOP_STUCK_LIMIT=3` -> wedged loop released); context-token ceiling (`PRISM_FORCE_LOOP_TOKEN_CEILING_PCT=90` -> near context limit RELEASE so precompact compacts, loop resumes post-compact). 7/7 tests + live E2E (block / advisory / complete / stuck-release / ceiling-release). 2 reviewers PASS; fixed 2 reviewer P1s (false "failing-tests gates this" comment -- stop_on_failing_tests is NOT wired (0 refs), only scrutinize-before-stop is; + added the token ceiling as the cost backstop).

## 2. Zulu/Hermes orchestrator revival (commit 5e92dc05f6)
Acting as hermes to command the fleet -> the orchestrator sweep was **doubly dead** from the incomplete zebra->zulu rename: (a) `zulu-opt-in.mjs:34` imported the nonexistent `./zebra-orchestrator-lib.mjs` -> ERR_MODULE_NOT_FOUND crashed the whole sweep; (b) `applyOptInToSlotsDoc` WROTE `entry.zebraOptIn` but `pickActionableSlots` (zulu-orchestrator-lib.mjs:67) READS `entry.zuluOptIn` -> opting a slot in wrote a field the sweep never reads -> NO slot ever actionable -> zulu auto-/precompact orchestration dead since the rename. Fixed both (+ 2 broken imports in the test). 26/26 tests; live sweep loads clean. **Lesson: a rename crossing a module boundary (one file writes a field, another reads it) must be completed on BOTH sides -- internally-consistent-but-cross-inconsistent is a silent no-op.**

## 3. Hermes state (assessment-grounded) + off-repo accelerations (operator/elevated-gated)
Hermes is genuinely mature (gateway daemon LIVE, 3 cron jobs ok, local gpt-oss:20b/120b, GEPA-lite, 3-tier memory, MCP-wired to :3100). Top accelerations are mostly OFF-REPO (`C:/Users/wompu/AppData/Local/hermes/`) or operator-gated: activate Curator first pass (`hermes curator run --dry-run`), close GEPA round-2 (review the staged candidate at `state/shared/specs/SKILL-CANDIDATE-GEPA-20260610-prism-vault-loop.md`), per-job model routing, Ollama prewarm before cron, add PRISM orchestration skills + checkpoints. Full assessment: `state/shared/articles/_obsidian-hermes-assess-2026-06-10/{hermes-state,loop-eng-gaps}.md`.

## 4. Commanded the fleet
Posted the overnight HERMES/ZULU FLEET DIRECTIVE to `state/shared/AGENT_CHAT.jsonl` announcing the 3 fleet-wide capabilities + the orchestrator revival, directing slots to run their /loop /goal queues (now auto-enforced).

Related: [[reference_midsession_goal_reanchor_2026_06_11]], [[reference_zulu_orchestrator_ms1_2026_05_22]], [[reference_hs01_env_anchor_fleetwide_2026_06_10]], [[feedback_context_growth_not_a_stop_signal]].
