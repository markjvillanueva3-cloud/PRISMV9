---
name: reference_octopus_include_codex_2026_06_10
description: "MultiModelConsensusEngine gained an includeCodex flag (default true, back-compat) so local-only octopus callers can drop the codex voice cleanly instead of the PRISM_CODEX_BIN sentinel-bin hack. The engine called codex UNCONDITIONALLY (no flag, unlike includeGrok/Gemini/Claude) -> every local-only run recorded a phantom {id:openai,failed:spawn-enoent} voice. HIGHER-IMPACT: consensus-queue-drain (fires every Stop fleet-wide) set includeClaude:false but could not disable codex -> REAL ChatGPT spend per drained entry on any host with the codex CLI. Fixed: engine flag + adopted in runner + drain; also added the drain's missing isDirect guard (import was running a live drain). Commit d1fafa2e1f on cad-fusion-live-ms0. FOLLOW-UP: runner LOCAL_ONLY_PANEL gpt-oss:120b+qwen2.5-coder:32b=102GB>96GB can't co-reside -> seats only 1 voice (drain already fixed this with coder:32b+gpt-oss:20b=50GB)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.669Z
aliases: reference_octopus_include_codex_2026_06_10
---


# Octopus includeCodex flag + local-only callers (slot:bravo, 2026-06-10)

## The gap (content-verified via octopus-runs.jsonl, not asserted)
`MultiModelConsensusEngine.ask()` called codex UNCONDITIONALLY -- `available.push("openai")`
(line 452) + `calls.push(...callCodex...)` (line 568) with NO `includeCodex` guard, unlike
`includeClaude`/`includeGrok`/`includeGemini` (all `input.includeX !== false`). Consequence:
every local-only octopus run recorded a phantom `{id:"openai", verdict:"failed:spawn-enoent",
dissent:"gpt-5.5: ... spawn prism-octopus-local-only-no-codex-DO-NOT-INSTALL ENOENT"}` voice,
because the ONLY way to neutralize codex without engine edits was pointing `PRISM_CODEX_BIN`
at a sentinel binary (octopus-first-live-record's hack). It dragged consensus toward 1 voice.

## Higher-impact second caller (the real find)
`.claude/scripts/consensus-queue-drain.mjs` fires on EVERY Stop across the ~10-session fleet.
Its whole stated purpose (RATE-LIMIT-FIX, 2026-06-09) was "LOCAL-ONLY by default... NO Anthropic
limit." But `buildDrainVoiceBound()` set `includeClaude:false` + could NOT disable codex ->
the engine still spawned the codex CLI on every drained entry. On THIS host codex="missing"
(ENOENT, harmless), but on ANY host with the codex CLI installed/authed that is a REAL
ChatGPT-subscription call per drained prompt fleet-wide -- the exact rate-limit amplifier the
drain claimed to eliminate. The drain's local-only guarantee was incomplete until includeCodex.

## The fix (commit d1fafa2e1f, R11-consistent, back-compat)
- Engine: `includeCodex?:boolean` (default true). `const includeCodex = input.includeCodex !== false;`
  guards both the openai pool-push and the codex call. Mirrors the existing include* pattern.
- Runner (octopus-first-live-record): `includeCodex:false` in buildLocalOnlyAskOverrides (clean
  disable; PRISM_CODEX_BIN sentinel kept as defense-in-depth).
- Drain (consensus-queue-drain): `includeCodex:false` in buildDrainVoiceBound. ALSO added the
  MISSING `isDirect` main guard -- `main()` was called unconditionally at top level, so importing
  the module (e.g. for a test) ran a LIVE drain as a side effect (I accidentally drained 3 entries
  verifying the change). Now mirrors the runner's isDirect guard -> import-safe + testable.

## Verification
- WIRE: flows dispatchOctopus askOverrides -> ask(). TEST: +2 engine tests (codex skipped when
  false + codex fires by default), +1 runner assertion, +new drain test (3 cases); 37/37 engine,
  17/17 runner, 3/3 drain. VALIDATE (live local-only run): new octopus-runs.jsonl entry =
  `[{id:ollama,verdict:answered}]` with real consensus answer "Trochoidal milling..." -- codex
  voice ABSENT (was failed:spawn-enoent in every prior run). dist rebuilt (build:incremental);
  my files tsc-clean (14 pre-existing tsc errors live in unrelated cad/algorithms files).

## SHIPPED the co-resident panel fix (4fdf30e8f5 + header docfix 801237de5c)
The runner's `LOCAL_ONLY_PANEL = [gpt-oss:120b(65GB), qwen2.5-coder:32b(37GB)]` = 102GB > 96GB
Blackwell VRAM -> can't co-reside -> `resolveDiverseOllamaPanel` (MultiModelConsensusEngine:403,
intersects the panel with the cap-probe's free-VRAM runnable set) drops the 120b -> SINGLE voice
(live: voiceCount:1, never met requireMinVoices:2 -> the 2-voice proof was dormant). FIXED: adopted
the drain's proven co-resident diverse pair `qwen2.5-coder:32b(37GB)+gpt-oss:20b(13GB)=50GB < 96GB`
(two distinct families). LIVE-VALIDATED: same run -> voiceCount:2, successCount:2, meetsFloor:true,
ok:true. 17/17 runner tests. Header docfix (801237de5c) closed a 3-of-3 arm-B P1 (the header still
claimed "no includeCodex flag" + the old panel -- R12 doc-rot).
CAVEAT (reviewer C, honest -- NOT overclaim): the 2-voice result rests on TRANSIENT VRAM
co-residency. Even the 50GB pair can regress to 1 voice under VRAM pressure (the drain's
U-CONSENSUS-DRAIN-PANEL-FIX wiki recorded exactly that once). The fix proves 2-voice CAN seat
(was structurally impossible at 102GB); a hard guarantee would need a prewarm-both-then-probe
step or a runnable-set telemetry assertion -- a genuine follow-up, not closed by this unit.

## Voice-id diagnosability + vendor-norm (1b7bce6a91 + ea45b16481)
- **1b7bce6a91 U-OCTOPUS-VOICE-ID-DIAG**: the ledger collapsed both diverse-panel local voices to
  id:"ollama" -> a dropped voice (the transient-co-residency caveat) was UNdiagnosable. mapConsensusToLedger
  (octopus-dispatch.mjs) now tags ollama voices `ollama:<model>` (single-model vendors stay bare; the
  cluster signature is verdict-pattern based, NOT id-based, so comparability is unaffected). Live: ledger
  shows [ollama:qwen2.5-coder:32b, ollama:gpt-oss:20b]. This is the HONEST/non-speculative answer to the
  2-voice caveat (R9): make a regression OBSERVABLE rather than build a prewarm coordination for an
  UNREPRODUCED edge case.
- **ea45b16481 U-VOICE-STATS-VENDOR-NORM**: closed the P3 coupling 2 reviewers flagged -- per-model ledger
  ids made computeVoiceStats (octopus-record-lib.mjs) bucket ollama reliability PER-MODEL, so HOC04
  proposeVoiceWeightAdjustments emitted per-model voiceIds that don't map to the vendor-keyed
  octopus-setup.mjs. FIX (R7): computeVoiceStats normalizes `ollama:<model>`->`ollama` for its byId
  aggregation ONLY (ledger keeps per-model). HOC04 stays vendor-level, byte-identical to pre-diag.

## EXHAUSTIVE in-lane discovery (slot:bravo, 2026-06-10) -- clean lane is DONE this session
7 commits shipped (CHO02 x2 + includeCodex + co-resident-panel + header-docfix + voice-id-diag + vendor-norm),
all 3-of-3 scrutiny PASS + LF-clean + live-validated. Octopus local-only consensus is now CLEAN (no phantom
codex) + RELIABLE-2-voice (co-resident pair) + DIAGNOSABLE (per-model ids) + HOC04-consistent (vendor-norm).
Tool-backed discovery confirms the CLEAN, VERIFIED, in-lane dormant-feature lane is EXHAUSTED:
- bravo-lane unwired ENGINES: ZERO (the 89 fleet-wide unwired all belong to other galaxies -> staying in lane)
- bravo-lane unwired HOOKS: 2 (orchestrator-advisory, stop-dream-queue-surface) both source-blocked dead-on-arrival
- bravo-lane SCRIPTS: all intentional CLIs / one-shots (not dormant)
- octopus dispatcher ACTIONS: ask + rankTrajectories both exposed (aiReasoningDispatcher) -> not dormant
REMAINING (all gated, NOT clean single-units): dream-cycle + orchestrator-advisory
(source-blocked, need cross-lane error-capture/producer infra); HOC04 per-model-vs-vendor weight tuning
(design call, resolved as vendor-level for now).

## UPDATE: 2-voice prewarm hard-guarantee SHIPPED (2c992e40c2, 8th commit) -- supersedes the "deferred/speculative" note above
After the operator's persistent /goal gate (explicit "reach YELLOW" demand + 3x re-issue), reconciled R9
(don't build speculative) with R13 (comprehensive route): the failure MECHANISM is VERIFIED (the probe's
free-VRAM gate at resolveDiverseOllamaPanel demonstrably drops models), so hardening it is comprehensive,
not speculative. Shipped: engine additive `forceProbe` flag (default false, back-compat -> probe({force})
bypasses the 5-min cache) + runner `prewarmPanel(models)` (loads each panel model resident, SEQUENTIAL
[single GPU serializes loads], fail-soft via callOllamaOnce) + runLive prewarms on a real live dispatch
(skipped dry/injected-dispatch) then dispatches forceProbe:true. 39/39 engine + 20/20 runner; live: prewarm
both -> forceProbe -> voiceCount:2. 3-of-3 scrutiny PASS. P2 deferred (logged in handoff): runLive
prewarm-guard branch has no direct spy test; prewarmPanel drops the callOllamaOnce error string.
NET: octopus local-only consensus is now clean + RELIABLE-2-voice (guaranteed, not co-resident-lucky) +
diagnosable + HOC04-consistent. 8 commits this session, all 3-of-3 scrutiny PASS.

Related: [[reference_consensus_drain_local_2026_06_09]] -- [[reference_consensus_drain_scaling_2026_06_09]] --
[[reference_bravo_unwired_hooks_audit_2026_06_10]] (the audit that led here after the dream-cycle/orchestrator-advisory pipelines were verified source-blocked).
