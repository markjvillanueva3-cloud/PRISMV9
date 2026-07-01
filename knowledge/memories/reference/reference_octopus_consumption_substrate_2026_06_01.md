---
name: reference_octopus_consumption_substrate_2026_06_01
description: PSN-OCTOPUS-FLEET-SYNERGY-MS0 U-FLEET-CONSUME (SHIPPED 784b62224c) — octopus consensus → per-galaxy outcome feed (the consumption half, "corpus availability ≠ consumption"). Plus the sibling-voices P0 bug: consensusToOutcome read consensus.voices (never present) so every production outcome carried voiceCount:0.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.668Z
aliases: reference_octopus_consumption_substrate_2026_06_01
---


2026-06-01 (slot:bravo). Closes the Stop-hook critique on PSN-OCTOPUS-FLEET-SYNERGY-MS0:
**"corpus availability ≠ consumption"** — the octopus RAGs every galaxy's corpus (U-FLEET-P5-ALL-GALAXIES)
but its consensus output went ONLY to the run-ledger; nothing flowed BACK into a galaxy's learning loop.
The wiring was one-directional/dormant. SHIPPED `784b62224c` (13 node:test, 2-of-2 scrutiny PASS).

**What shipped — the PRODUCER→FEED half:**
- `scripts/lib/octopus-consumption-bridge.mjs` — turns each REAL octopus consensus into a per-galaxy
  OUTCOME record (`kind="octopus_consensus"`, schemaVersion 1.0.0) on `state/shared/octopus-outcomes/<domain>.jsonl`,
  a feed a galaxy's self-improving AI (MillAGI/LatheAGI/QuotingClosedLoop) can later ingest.
  - `consensusToOutcome(domain, consensus, opts)` — PURE map, null when nothing publishable.
  - `publishConsensusOutcome(...)` — O_APPEND (lost-update-free), fail-soft `{ok,path?,error?}`, NEVER throws
    (a publish failure can't abort an octopus run).
  - `readConsensusOutcomes(domain, opts)` — bounded tail read (MAX_READ_BYTES=1MB), skips unparseable lines,
    kind-filtered, most-recent-last.
  - Security: verdict+summary `redactSecrets` (incl home-path) before egress; `SAFE_DOMAIN_RE` traversal guard
    in BOTH consensusToOutcome + feedPathFor (defense-in-depth).
- `scripts/octopus-with-hermes-rag.mjs` — wires it: publish gated strictly on `dispatched && ok && domain`
  (no stub / dispatch-unavailable / single-claude leak), threads the dispatch result's SIBLING `voices` +
  `successCount`.

**BUG FOUND + FIXED (P0, belongs in `## Recent regressions`) — the sibling-voices trap:**
`mapConsensusToLedger` (`scripts/lib/octopus-dispatch.mjs`) returns `{ voices, consensus:{verdict,confidence,dissent_items}, ok, successCount }`
— **`voices` and `successCount` are SIBLINGS of `consensus`; the consensus object itself carries NO voices.**
The first cut of `consensusToOutcome` read `consensus.voices`, which is ALWAYS undefined in production →
every outcome silently carried `voiceCount:0`. The unit test "passed" only because it fed a FICTIONAL
self-contained consensus shape with voices INSIDE it (R9 failure: the test could not fail when production
logic was broken). **Fix:** read voices from `opts.voices` (the real sibling, threaded by the orchestrator),
`consensus.voices`/`voteBreakdown` only as a direct-caller fallback; added a REAL-SEAM test that drives
actual `mapConsensusToLedger` output through publish→read and asserts `voiceCount===3` — empirically FAILS
on the reverted `consensus.voices` code (verified by temporary revert). Same class as
[[feedback_verify_actual_contract_not_proxy]] (test the real contract, not a proxy shape).

**P1 also fixed:** dropped an `unanimous = (dissent_items.length===0)` field — UNSOUND because
mapConsensusToLedger packs per-voice failure reasons + a recommendation tag into `dissent_items`, so it's
NOT a clean disagreement metric. The sound agreement signal is `confidence`; raw count now exposed as
`dissentItemCount`, comment-labeled NOISY.

**NEXT (the consumption goal is HALF-closed):** the ENGINE-SIDE FOLD — a galaxy's AGI actually READING this
feed into its learning (e.g. MillAGI/LatheAGI EWMA, QuotingClosedLoop) — is the remaining half. It is
SAFETY-SENSITIVE + CROSS-LANE (foxtrot/whiskey/charlie own those CRITICAL physics/learning engines) → needs
physics-review + lane coordination, NOT a unilateral bravo YOLO edit. Logical-order (R13): the lowest-risk
real consumer to wire first is a NON-safety surface (e.g. hermes-zulu agent-orchestration reading fleet
consensus to inform routing — in bravo's lane). Building more read-plumbing that no engine calls would just
reproduce the same "dormant" critique — wire a REAL consumer, don't add another dormant layer.

**CONSUMPTION LOOP CLOSED — U-FLEET-CONSUME-WIRE (SHIPPED `551f15d379`, 2026-06-01):** the producer→feed
half above was live but DORMANT ("nothing reads it" — the Stop-hook critique). Root finding (a real bug,
belongs in `## Recent regressions`): **P5 (`65059681d5`) IMPORTED `composeOctopusLoader` into
`WeeklySynthesisEngine.ts` but NEVER CALLED it** — the constructor used `defaultLoader` directly, so the
octopus→WeeklySynthesis→Obsidian consumption loop has been dormant since P5 (the code comment even CLAIMED
it was wired — an R12 "feature works" lie). Fix (in-lane: bravo's own P5 wiring + own engine; non-safety):
- `WeeklySynthesisEngine` ctor now `this.loader = composeOctopusLoader(opts.loader ?? defaultLoader, {outcomesDir})`.
  Default-OFF (returns base loader unchanged unless `PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1`; injected test loaders
  still wrapped) → byte-identical when the knob is off.
- Bridge: `+ listOutcomeDomains()` (enumerate per-galaxy feeds, SAFE_DOMAIN_RE-guarded) + exported `OUTCOME_BASE`.
- Loader: `+ buildPerDomainConsensusRollup`/`loadPerDomainRollupSource` — reads the per-galaxy feeds
  (`readConsensusOutcomes`) into a per-domain rollup WeeklySource folded into the retro ALONGSIDE the P5
  global-ledger brief. NON-redundant: the feeds are domain-keyed + real-dispatched+ok-consensus-only; the flat
  ledger is neither. Gated on explicit `outcomesDir` so existing ledger-only callers stay byte-identical.
  Verdict re-redacted (defense-in-depth) before reaching `WEEKLY-*.md` → Obsidian.
- Tests: 15 bridge + 7 rollup (incl. an E2E `publishConsensusOutcome`→`composeOctopusLoader` round-trip that
  FAILS if the wiring is severed — genuine R9 lock) + 86 existing P5 loader/engine vitest GREEN. tsc-clean for
  these files (25 pre-existing dispatcher errors are unrelated peer-tree state — the production dist rebuild is
  tree-wide-blocked by them, outside bravo's lane). 2-of-2 scrutiny PASS.
- HONEST scope: this closes the loop via the IN-LANE reflective consumer (WeeklySynthesis→Obsidian). The
  SAFETY-SENSITIVE per-domain *learning* fold (MillAGI/LatheAGI EWMA, QuotingClosedLoop) stays routed to
  foxtrot/whiskey/charlie via AGENT_CHAT — not bravo's to YOLO. The loop is "closed" structurally (producer→
  feed→consumer→retro→Obsidian) and activates under `PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1` + live dispatch; not
  oversold as always-on. P3 deferrables (logged, non-blocking): un-redacted `at` (machine ISO ts, no secret
  path); `MAX_DOMAINS_CEILING=100` alpha-bias only past 100 galaxies (fleet=34).

**SYSTEM-VIZ LEG — U-FLEET-CONSUME-VIZ (SHIPPED `c3a864b613`, 2026-06-01):** the THIRD consumer of the
per-galaxy feeds (after the bridge read-API + the WeeklySynthesis per-domain rollup), closing the goal's
"synergized to system-viz" endpoint. `scripts/generate-octopus-consensus-features.mjs` reads the feeds
(`listOutcomeDomains` + `readConsensusOutcomes`) → a SELF-CONTAINED ghost roost (`ghost.octopus_consensus`
root + one node/galaxy + internal "contains" edges ONLY — no dangling edges into the 576MB graph; root
emitted only when ≥1 galaxy has consensus → no island root). Wired into `regen-viz.mjs` FAST[] + an
additive `merge-augmentations.mjs` splice (milling-tribal dedupe pattern, block-scoped consts, null-safe
no-op when absent → byte-identical). 5 node:test (no-dangling-edge lock + real E2E publish→main→read→assert).
2-of-2 scrutiny PASS. Empty until a live dispatch publishes (producer-gated — honest, not dormant).
- **merge-augmentations.mjs + regen-viz.mjs are sierra's contended lane** — but they were CLEAN (no
  uncommitted peer edit), bravo has precedent (chat-slot-nodes), and the edit is append-only → safe. The
  per-galaxy octopus-outcomes feeds use hand-coded `loadOptional` registration (no staging auto-discovery).
- **EOL-flip caught pre-commit (belongs in `## Recent regressions`):** the Edit tool rewrote
  `regen-viz.mjs` CRLF (439 CRLF, 0 LF) when I added the 1-line FAST entry → `git diff --stat` showed 877
  changed lines. `git diff --ignore-cr-at-eol` collapsed it to the real 1-insertion. Restored to LF
  (`fs.readFileSync(p,'latin1').replace(/\r\n/g,'\n')`) before commit. Same class as the CLAUDE.md
  "edit flipped CRLF; repo convention is LF" regressions. **Lesson: after editing a contended/large file,
  `git diff --stat` BEFORE `git add` — an EOL flip masquerades as a 100s-of-lines diff.**

**GOAL — all 3 named synergy targets now wired** (octopus consensus → per-galaxy feed → 3 consumers):
PSN (corpus RAG fleet-wide, prior waves) · Obsidian (WeeklySynthesis per-domain rollup → reflective memory)
· system-viz (the consensus roost). The only remaining piece is the SAFETY-SENSITIVE per-domain LEARNING
fold (MillAGI/LatheAGI EWMA, QuotingClosedLoop) — cross-lane (foxtrot/whiskey/charlie), routed via AGENT_CHAT.

Wiki: [[psn-octopus-fleet-synergy-ms0]]. Parents: [[reference_octopus_domain_aware_corpus_2026_05_31]] ·
[[reference_psn_octopus_fleet_synergy_2026_05_31]].
