# mit-curriculum session 7efaddb4 (2026-06-16, 73MB, spine 386KB, 5 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Phase anchors: 14 Phase‑2, 13 Phase‑3 (completed 14/14), 14 Phase‑4 “deep” anchors (12 via 14‑agent workflow, 2 manual).  
- Commit `FLEET‑OPTIMAL‑SETUP‑2026‑06‑13.md`, `FLEET‑PHASE4‑DISPATCH‑2026‑06‑13.md`, `FLEET‑KNOWLEDGE‑MAX‑Phase4‑REPORT`.  
- Hand-off file `HANDOFF‑claude‑7efaddb4‑knowledge‑max.md`.  
- Ledger & iteration scripts: `U-ZKM-ITERATE`, `U-ZKM-ITERATE-FIX`, `U-ZKM-ITERATE-HARDEN`, `U-ZKM-PASS1`.  
- Wave commits: W1 (`cam/ai‑training/cad`), W2 (`business/blueprint‑vision/agent‑orchestration/backend‑helper`), W3 (`academy/bug‑hunting/cad‑fusion‑live/quality/shop‑floor`), W4 (5 physics galaxies), W5 (`quoting/frontend‑app/database‑expansion/system‑viz/compliance‑safety`).  
- Verification commits: `U‑ZKM‑VERIFY‑W5`, `U‑ZKM‑VERIFY‑W6`, `U‑ZKM‑VERIFY‑W7`, `U‑ZKM‑VERIFY‑W8` → 34/34 verified.  
- Auto‑account‑switch feature `U‑ACCT‑SWITCH‑AUTOFIRE`.  
- Hermes credential‑pool reference file `reference_hermes_app_launch_fix_cred_pool_2026_06_12.md`.  
- Capability engines: `U‑ZULU‑CAP-*` (3 files).  
- Build‑loop core: `zulu-build-queue.mjs`, `zulu-build-loop.mjs`, `install-zulu-build-loop-cron.ps1`.  
- Consumer hook for bravo (`c0d80795b6`) and INCR4 consumer hook (`856e8ad93a`).  
- Engines C4–C8 commits: `c907480111`, `857d35fa41` (Delegation), `cc07ad8238` (AdaptiveBackPressure), `96f528bc81` (CapabilityRegistry), `269e4956e1` (Attestation), `1602f254ba` (SoulEvolutionAdvisor).  
- Regex fix `775a0f8287`; wiki entry `439532e7aa`.  
- Milestone envelope `bd4c358a3f`.  
- Hermes automation routine plan files: `U-HB-ROUTINE-PLAN`, `U-HB-ROUTINE-PLAN-GUARD`, `U-HB-B1-SCRUTINY`.  
- Documentation addendum to `HERMES-APP-INCORPORATION-PLAN`.

**DECISIONS**  
- Phase‑1 mining durable via reaper‑immune task `install-galaxy-mine-task.ps1`.  
- Hermes bridge per‑galaxy planner; plans tempered by R12 before anchors.  
- Loop harness `loop-state.mjs` with force‑continue until target reached.  
- Ultrafast “yolo” mode: parallel agents, fallback ladder Ollama → Sonnet → Opus.  
- Two‑stage workflow: 14 sonnet research → 14 opus verify → synthesis; GPU serialization bottleneck noted.  
- Two‑tier architecture: Hermes cron tier (drafts + lock‑safe ledger) + WebFetch Workflow tier (verified anchors).  
- Deterministic loss function saturates at ≥10 iters or hard ceiling 30.  
- Field‑fence hints per galaxy to avoid mis‑domaining; physics fence flag `physicsSafe:true`.  
- Cron count increased from 5→12→18; lockfile guard (`O_EXCL`, stale reclaim) for cron vs manual `--record` serialization.  
- Rate‑limit handling: Anthropic API → smaller waves ≤4 agents; switch to 5–12–18 cron bursts.  
- Auto‑account‑switch at 90 % session limit via `PRISM_5H_WEIGHTED_TOKEN_TRIGGER`.  
- Hermes app round‑robin strategy, PRISM MCP wired; no manual restart needed.  
- Capability engines built with ultracode parallel agents + dedup → serial integration to avoid merge conflicts.  
- Build loop: queue core + driver + cron; consumer hook injects next unit into bravo via chat‑bus.

**OPERATOR DIRECTIVES**  
- `/goal`: populate all 14 galaxies to world‑leading depth, exhaust internal data then external deep research.  
- `/yolo-mode autonomously`: run without prompts.  
- Loop each galaxy one by one in harnessed loops; use Hermes bridge planner.  
- Master slot produce entire fleet’s engine/settings/setup configuration per chat‑slot domain.  
- New stop‑hook: loop 20 min with yolo mode, iterate every galaxy ≥10× until no reputable sources remain.  
- `/checkin-zulu`: resume previous work, handle all galaxy work for other slots.  
- Continue in `/yolo-mode` with ultracode on.  
- Self‑compact instruction: trigger `/self‑compact` when milestone reached.  
- Build for bravo (Hermes‑zulu capability queue C4–C8).  
- Finish full Bridge of Claude CLI ↔ Hermes CLI; both CLIs need updating and config/context wiring.  
- Add new bridge capability.

**FINDINGS/BUGS**  
- Bash fork‑bomb (~370 `bash.exe`) resolved by killing workflow.  
- Node exit‑255 during mining/workflow – async CLI quirk, not crash.  
- API rate limiting on Hermes/Ollama serialized GPU calls; stalled at business/academy agents.  
- P0 provenance bug: `depositAnchor` hard‑coded “Hermes” when Ollama fallback used → fixed via `--json` source field.  
- Lost‑update race between cron and manual `--record`; solved with lockfile guard (`lockedUpdate`).  
- Node‑path issue (`execFileSync("node")`) replaced with `process.execPath`.  
- Fork‑storm breaker prevented large concurrent bursts; resolved by draining storm.  
- Cron start time mis‑scheduled (next fire 24 h out); corrected to current hour.  
- Anthropic rate‑limit → smaller waves ≤4 agents.  
- C2 engine round‑trip test failed due missing dispatcher wiring – fixed with enum/case.  
- C3 round‑trip tests had obsolete env gate – removed.  
- Ollama 503 errors from GPU saturation; loop degrades gracefully.  
- Bridge‑B safety bugs: caller‑overridable `–MaxSlots`, missing cumulative bound, boot‑window dup race, silent success.  
- Arm B new edge P1s: TOCTOU race + fail‑open on corrupt slots.  
- MCP bridge down caused agent spawn block; environment degraded (API 529 overload).  
- Backticks in command templates triggered shell substitution → fixed with safe quoting.

**DOMAIN SPECIFICS**  
- Galaxy list & anchor focus per phase (cad, cam, lathe, post‑processor, mill, ai‑training, blueprint‑vision, quoting, business, academy, backend‑helper, wiring, discovery).  
- Ledger lib (`galaxy-knowledge-ledger.mjs`): `initLedger`, `isSaturated`, `recordIteration`, `nextGalaxies`, `fleetDone`, `summary`, `withLock`, `lockedUpdate`.  
- Hermes bridge (`ask-hermes.mjs`): `--json` output `{source,content}`, `--no-fallback` exit 3.  
- Cron task: `PRISM Galaxy Knowledge Iterate` (Task Scheduler).  
- WebFetch tier scripts: `galaxy-deepen-foundations.mjs`, `register-foundations-in-wiki-index.mjs`.  
- Physics fence logic flag `physicsSafe:true`; grep on final markdown.  
- Field‑fence hints stored in galaxy descriptors (`{hint:"software/AI", domain:"code"}`).  
- Build loop components: `zulu-build-queue.mjs`, `zulu-build-loop.mjs`, cron install script, consumer hook.  
- SessionDispatcher.ts & hermesDispatcher.ts actions: `delegation_grant/revoke/status`, `backpressure_record_sample/assess/status`, `capability_registry_snapshot/attest`, `attestation_*`.  
- Engines: `ZuluWaveSchedulerEngine`, `ZuluTaskContinuityEngine`, `ZuluFleetHealthSynthesisEngine`, C4–C8 engines.  
- Paths: `H:/prism/...`, `C:/Users/wompu/.claude/projects/H--prism/memory/reference_hermes_open_source_routine_plan_2026_06_16.md`.  
- Slots: `zulu` (orchestrator), `bravo` (Hermes‑zulu builder).

**TOOLS USED**  
- Slot helpers: `slot-bind-enforce.mjs`, `chat-slots.mjs`.  
- Mining & synthesis: `mine-galaxy-transcripts.mjs`, `galaxy-synthesis-refresh.mjs`.  
- Scheduled task installer: `install-galaxy-mine-task.ps1`.  
- Planner: `ask-hermes.mjs`.  
- Loop harness: `loop-state.mjs`.  
- Handoff: `per-agent-handoff.mjs`.  
- Local LLMs: Ollama (`qwen2.5vl`, `qwen2.5-coder`), Sonnet, Opus.  
- Ultracode workflow agents (sonnet/ollama) with vitest tests.  
- Windows Task Scheduler scripts; lockfile via `O_EXCL`.  
- esbuild, tsc, vitest for build & test.  
- PRISM scripts: `galaxy-knowledge-ledger.mjs`, `ask-hermes.mjs`, `galaxy-knowledge-iterate.mjs`.  
- Git with `[MAIN‑FORCE]` guard and lock handling.

**OPEN THREADS**  
- Finalize cross‑galaxy shared substrates (machine kinematics, GD&T graph, UQ spine, cost accounting core).  
- Apply `FLEET‑OPTIMAL‑SETUP` spec to all 26 slots.  
- Resolve GPU serialization bottleneck for future 14‑agent workflows (multi‑GPU or async batching).  
- Implement new stop‑hook: loop every galaxy ≥10× auto‑clear when no reputable sources remain; monitor source exhaustion.  
- Verify zombie reaper status remains enabled.  
- Complete remaining waves (6–7) to cover all 34 galaxies at ≥10× iterations.  
- Verify final saturation state after cron reaches hard ceiling or source‑exhaustion.  
- Ensure handoff survives auto‑compact and post‑compact resumption.  
- Monitor for physics fence leaks in future waves.  
- Monitor rate‑limit handling for WebFetch tier.  
- Operator‑gated version bump of Hermes CLI & CC CLI (pull 312 commits, update `auth.json`).  
- Update CLI configs/context to wire bridge after version bump.  
- Implement new bridge capability.  
- Bridge B formal 3‑of‑3 pending (API overload; retry after recovery).  
- Live round‑trip of Bridge A with MCP client blocked (MCP down).  
- Integrate milestone envelope `HERMES‑BRIDGE-MS0.json` into workflow.
