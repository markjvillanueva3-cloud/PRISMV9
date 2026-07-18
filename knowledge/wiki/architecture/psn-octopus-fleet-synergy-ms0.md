---
node_type: architecture
title: PSN-OCTOPUS-FLEET-SYNERGY-MS0 — fleet-wide PSN/Obsidian/octopus synergy
status: build-once-layer-shipped
slot: bravo
created: 2026-05-31
related:
  - psn-definition
  - zulu-obsidian-live
  - weekly-synthesis
  - obsidian-memory-feed-hook
  - session-continuity-stack
---

# PSN-OCTOPUS-FLEET-SYNERGY-MS0

Lights up the PRISM master-brain stack — **Obsidian brain + the 11-leg PSN + system-viz +
the octopus (multi-model consensus) loop** — across **all 34 galaxies** from a small set of
**build-once-fleet-wide** units, rather than 34× per-galaxy re-implementations.

Origin: two adversarial-verify Workflows assessed how PRISM exploits the stack —
`state/shared/specs/PSN-OBSIDIAN-OCTOPUS-SYNERGY-ASSESSMENT-2026-05-31.md` (hermes-zulu galaxy)
and `state/shared/specs/PSN-SYNERGY-FLEET-ROADMAP-2026-05-31.md` (all 33 others). The verify
lens corrected **4 false premises** — see [[reference_psn_octopus_fleet_synergy_2026_05_31]].

## Keystone insight

The octopus had **never run for real** — the consensus ledger was a 522-byte stub
(`consensus:'stub-not-yet-merged'`, `psnExemplars:null`). Every downstream surface
(coverage dial, ghost-roost, weekly-synthesis) was therefore measuring *nothing*. Building
consumers before the producer is an R13 violation, so the dependency order is producer-first:
**de-stub the octopus → feed it a real PSN corpus → only then wire the consumers.**

## The 6 canonical synergy patterns (reusable lens for any galaxy)

| Pattern | What | Scope |
|---|---|---|
| **P1** | octopus reads the domain's PSN legs (wiki/memories/tribal/skills/graph) as RAG | per-galaxy (corpus tuning) |
| **P2** | live Obsidian vault → each chat's slot-context bundle | **build-once** |
| **P3** | galaxy `MEMORY.md` index → Obsidian graph mirror | **build-once** |
| **P4** | domain ledger → system-viz ghost-roost | per-galaxy (real emitters only) |
| **P5** | octopus/outcome ledger → weekly reflective synthesis | per-galaxy (+ build-once loader) |
| **P6** | N/11 PSN-leg coverage dial | **build-once** |

Only the **4–5 TEXT-retrieval legs** (Wiki, Memories, Tribal, Skills, +Graph) are real RAG
targets. NN/GNN, PRISM-AI, PRISM-OS, Algorithms, Formulas have no text-retrieval surface —
the octopus loader does **not** over-promise "reads all 11 legs."

## Build-once layer — SHIPPED (branch `cad-fusion-live-ms0`)

| Unit | SHA | Delivers |
|---|---|---|
| **U-FLEET-P0-P1** | `5cb68aaad3` | octopus corpus loader (5 PSN text legs, fail-soft, budget-capped) + real `MultiModelConsensusEngine.ask()` dispatch; **ledger de-stubbed 522B→9244B** |
| **U-FLEET-P2-LIVEBRAIN-SLOTCTX** | `d289d53006` | `fetchLiveBrain()` over the :3100 `obsidian_search` bridge → one "live brain:" line in every chat's slot-context (gated `PRISM_OBSIDIAN_LIVE=1`) |
| **U-FLEET-P3-GALAXY-MEMORY-OBSIDIAN-MIRROR** | `7fdacfc76b` | `syncGalaxyMemories()` mirrors 34 galaxy `MEMORY.md` indexes into the Obsidian graph (gated `GALAXY_INDEX_MIRROR_ENABLE`) |
| **U-FLEET-P5-WEEKLY-SYNTHESIS-OCTOPUS-LOADER** | `65059681d5` | octopus ledger → `WeeklySynthesisEngine` reflective memory (gated `PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1`) |
| **U-FLEET-P6-PSN-LEG-COVERAGE-DIAL** | `94bb94d022` | always-on N/11 PSN-leg coverage gauge derived from `LOADER_LEG_SET` + ledger `psnExemplars` |

## Security hardening (caught by the per-file scrutiny gate)

The foundation scrutiny pass caught two real bugs **before** they reached the shared branch:

- **P0 data-leak** — the loader read private `C:` auto-memory and would have sent it
  unredacted to external voices (gemini/grok) + persisted it raw to the shared ledger.
  Fix: private-memory root gated behind `PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY=1` (default OFF),
  and a shared `scripts/lib/redact-secrets.mjs` masks every snippet (Bearer/AIza/sk-/xai-/ghp_/
  JWT/`api_key=`/long-hex + leaking frontmatter keys) before it crosses any trust boundary.
- **P1 ledger race** — read-modify-write-rename lost updates under concurrent appends.
  Fix: `fs.appendFileSync(..., {flag:"a"})` (O_APPEND) — 200 concurrent appends → 200 persisted.

Later waves caught a **P3 idempotence bug** (mirror quarantined its own `MEMORY.md` — fixed by
excluding it from `reconcileGalaxies`) and a **P5 residual leak** (raw prompt/verdict persisted —
fixed by extending redaction to those fields). 58+ tests across the layer, every unit 2× scrutiny PASS.

## Knobs

`PRISM_OCTOPUS_LIVE_DISPATCH=1` (fire real fan-out) · `PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY=1`
(default OFF) · `PRISM_OBSIDIAN_LIVE=1` (P2 live-brain read) · `GALAXY_INDEX_MIRROR_ENABLE`
(P3 mirror) · `PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1` (P5 loader) · `PRISM_PSN_LEG_STATE_INJECT_DISABLE=1`
(P6 gauge off).

## Wave 3 — SHIPPED (2026-05-31, slot:bravo)

- **Leg-starvation fix** (`a6e4f165a8`) — fs legs run before the slow index stage; octopus stopped
  starving to 1/5 legs. +`PRISM_OCTOPUS_SKIP_INDEX_LEGS` escape hatch. See
  [[reference_octopus_loader_leg_starvation_bug_2026_05_31]].
- **Latency-sidecar (#3)** — regenerated the stale master-index sidecar (`build-graph-index.mjs` →
  302K nodes, 152.8MB, `errors:[]`); cleared the fleet-wide stale-sidecar warning. (Cold-call latency
  is dominated by the 152.8MB index load — the skip-knob / a warm long-running octopus process is the
  sub-second path.)
- **P1 domain-aware corpus** (`e9babd115d`) — `opts.domain` appends a `<domain>_corpus` fs leg from
  `DOMAIN_CORPUS_ROOTS` (5 deep-corpus domains: wedm/speed-feed/cam/cad/post-processor); live in
  production via slot→domain derivation in `octopus-with-hermes-rag.mjs`. **Uncovered + fixed a latent
  bug:** the fs-leg prefilter was `.md`-ONLY, silently capping the entire octopus RAG to markdown —
  replaced with a `TEXT_LEG_EXTENSIONS` allowlist + a `looksBinaryBody` content sniff (blocks
  binary-in-text-extension mojibake reaching an external voice). 29 tests, 2× scrutiny.
  See [[reference_octopus_domain_aware_corpus_2026_05_31]].

## Consumption half — "corpus availability ≠ consumption" (U-FLEET-CONSUME, `784b62224c`, 2026-06-01)

The corpus-availability layer above made the octopus *read* every galaxy's PSN corpus, but its
consensus output flowed only to the run-ledger — **nothing flowed back into a galaxy's learning
loop**. The wiring was one-directional/dormant (the Stop-hook critique). This unit ships the
**producer→feed half** of the back-channel:

- `scripts/lib/octopus-consumption-bridge.mjs` — each REAL consensus becomes a per-galaxy OUTCOME
  record (`kind="octopus_consensus"`, schemaVersion 1.0.0) on `state/shared/octopus-outcomes/<domain>.jsonl`.
  `consensusToOutcome` (pure map, null when unpublishable) · `publishConsensusOutcome` (O_APPEND,
  fail-soft, never throws) · `readConsensusOutcomes` (bounded tail read, kind-filtered).
- `octopus-with-hermes-rag.mjs` wires it: publish gated on `dispatched && ok && domain` (no stub /
  unavailable / single-claude leak), threads the dispatch result's SIBLING `voices` + `successCount`.
- Security: verdict+summary `redactSecrets` (incl home-path) before egress; `SAFE_DOMAIN_RE` traversal
  guard in both `consensusToOutcome` + `feedPathFor`. 13 node:test, 2-of-2 scrutiny PASS.

**Bug found + fixed (P0, sibling-voices trap):** `mapConsensusToLedger` returns
`{ voices, consensus:{...}, ok, successCount }` — `voices`/`successCount` are **SIBLINGS** of
`consensus`; the consensus object carries no voices. The first cut read `consensus.voices` (always
undefined in production) → every outcome silently carried `voiceCount:0`, and the unit test only
"passed" because it fed a fictional self-contained shape with voices inside it (an R9 failure: the
test could not fail when the logic was broken). Fixed by reading `opts.voices` (the real sibling,
threaded by the orchestrator) + a **real-seam regression test** that drives actual
`mapConsensusToLedger` output through publish→read and asserts `voiceCount===3` (empirically FAILS
on the reverted code — verified by temporary revert). Also dropped an unsound
`unanimous = dissent_items.length===0` field (dissent_items packs failure reasons + a recommendation
tag, not a clean disagreement metric — `confidence` is the sound signal; raw count now `dissentItemCount`,
labeled noisy). See [[reference_octopus_consumption_substrate_2026_06_01]] ·
[[feedback_verify_actual_contract_not_proxy]].

### Loop closed in-lane — U-FLEET-CONSUME-WIRE (`551f15d379`, 2026-06-01)

The feed was live but DORMANT ("nothing reads it"). **Root finding (bug):** P5 (`65059681d5`)
*imported* `composeOctopusLoader` into `WeeklySynthesisEngine` but **never called it** — the
constructor used `defaultLoader` directly, so the octopus→WeeklySynthesis→Obsidian loop was dormant
since P5 (the comment even claimed it was wired — an R12 violation). Fix (in-lane, non-safety):
- `WeeklySynthesisEngine` ctor now applies `composeOctopusLoader(base, {outcomesDir})` — default-OFF
  (byte-identical unless `PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1`; injected loaders still wrapped).
- Bridge `+ listOutcomeDomains()` + exported `OUTCOME_BASE`; loader `+ buildPerDomainConsensusRollup`
  reads the per-galaxy feeds into a per-domain rollup WeeklySource folded into the retro alongside the
  P5 ledger brief. NON-redundant (feeds are domain-keyed + real-consensus-only; the ledger is neither).
  Verdict re-redacted before reaching `WEEKLY-*.md` → Obsidian.
- 15 bridge + 7 rollup (incl. an E2E publish→compose round-trip that fails if the wiring is severed —
  R9 lock) + 86 existing P5 vitest GREEN; 2-of-2 scrutiny PASS. See
  [[reference_octopus_consumption_substrate_2026_06_01]].

### system-viz leg — U-FLEET-CONSUME-VIZ (`c3a864b613`, 2026-06-01)

The THIRD consumer of the per-galaxy feeds (after the bridge read-API + the WeeklySynthesis rollup),
closing the goal's **"synergized to system-viz"** endpoint. `generate-octopus-consensus-features.mjs`
reads the feeds → a self-contained `ghost.octopus_consensus` roost (root + one node/galaxy + internal
"contains" edges only — **no dangling edges** into the 576MB graph; root emitted only when ≥1 galaxy has
consensus). Wired into `regen-viz.mjs` FAST[] + an **additive** `merge-augmentations.mjs` splice
(milling-tribal dedupe pattern, block-scoped consts, null-safe no-op when absent → byte-identical). 5
node:test (no-dangling-edge lock + real E2E publish→main→read→assert); 2-of-2 scrutiny PASS. Empty until
a live dispatch publishes — producer-gated, honest. (`merge-augmentations.mjs`/`regen-viz.mjs` are
sierra's contended lane but were clean + the edit is append-only; bravo has precedent — chat-slot-nodes.)
**Regression caught pre-commit:** the Edit tool flipped `regen-viz.mjs` to CRLF (877-line phantom diff);
restored to LF before commit — `git diff --stat` before `git add` on large/contended files.

**All 3 named synergy targets now wired** (octopus consensus → per-galaxy feed → 3 consumers): **PSN**
(corpus RAG fleet-wide) · **Obsidian** (WeeklySynthesis per-domain rollup → reflective memory) ·
**system-viz** (the consensus roost). See [[reference_octopus_consumption_substrate_2026_06_01]].

**Remaining: the SAFETY-SENSITIVE per-domain learning fold** — a galaxy's AGI folding the verdict into
its *learning* (MillAGI/LatheAGI EWMA, QuotingClosedLoop) is CROSS-LANE (foxtrot/whiskey/charlie own
those CRITICAL engines) → physics-review + lane coordination, routed via AGENT_CHAT, not a unilateral
edit. The reflective + visibility consumption loops (above) are closed; the domain-learning fold is the owning slots'.

## Remaining (Wave 3 — lower-leverage tail)

- **P4 ledger-roost for fleet-hygiene** — the only ledger-emitting galaxy still lacking a
  `generate-*-features.mjs` ghost-roost generator (`fleet-reaper.log` exists; hermes-zulu +
  database-expansion already have generators).
- **P5 verify-links** (lathe/mill/quoting already cloned india's self-improving AI) — *verify*, don't
  rebuild. The Phase B P5 enumeration arm returned 0 (schema-invalid/errored) — needs a focused re-run.
- **P2 hardening** — `looksBinaryBody` could add a printable-ratio check for coincidentally-valid
  multibyte-UTF-8 garbage (non-blocking; readable Unicode, not the control-char egress class).

These are thin and lower-leverage than the build-once layer; the 6 patterns above are the lens.
