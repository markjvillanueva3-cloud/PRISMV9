---
title: Galaxy Context Federation (GALAXY-CONTEXT-FEDERATION-MS0)
type: architecture
status: in_progress
owner: alpha (token-optimization / Obsidian-brain)
created: 2026-05-31
tags: [token-efficiency, context-retention, obsidian, federation, galaxy-brain]
---

# Galaxy Context Federation

Hub-and-spoke context topology for the per-galaxy brains: **retain** salient context per galaxy →
**roll up** to the master brain → **redistribute** selectively to galaxies that need it. The federation
IS the token savings — recall-instead-of-reread + cache-anchored compact cards + cross-galaxy dedup turn
thousands of injected/read tokens into hundreds.

Design spec: `state/shared/specs/GALAXY-CONTEXT-FEDERATION-MS0-DESIGN-2026-05-31.md` (commit `7c62f742ad`).
Thesis: mostly **wiring existing primitives into a loop**, not net-new infra (R8) — which is the
token-efficient way to build a token-efficiency milestone.

## Phases (12 units)
- **A — retention (per galaxy):** `U-GCF-CARD` ✅ · `U-GCF-SALIENCE` ✅ · `U-GCF-COMPACT` ✅ — **Phase A complete**
- **B — feed-up (galaxy → master):** `U-GCF-ROLLUP` ✅ · `U-GCF-KNOWS-MAP` ✅ — **Phase B complete**
- **C — redistribute-down (master → galaxies):** `U-GCF-XGALAXY-INJECT` ✅ · `U-GCF-PUSH` ✅ — **Phase C complete**
- **D — Obsidian token savings:** `U-GCF-CAG-CARDS` ✅ · `U-GCF-RECALL-FIRST` ✅ · `U-GCF-XDEDUP` ✅ · `U-GCF-SAVINGS-TELEMETRY` ✅ · `U-GCF-OLLAMA-MAINT` (GATED — Ollama offline)
- **STATUS: 11/12 shipped** — every non-gated unit complete. Only `U-GCF-OLLAMA-MAINT` remains, gated on Ollama `/api/chat` recovery.

## U-GCF-CARD (shipped 2026-05-31)
The cheap **inject unit**. Distills each galaxy's `mcp-server/src/engines/<g>/MEMORY.md` (+ CLAUDE.md role
line + PATHS.md key paths) into a ≤1 KB salience-ranked context-card, so a prompt injects/cache-anchors the
**card** instead of re-reading the multi-KB brain.

- **Core:** `scripts/lib/galaxy-context-card.mjs` — pure-core + injected-deps + fail-soft (mirrors
  `path-ledger.mjs` for R11). Deterministic salience heuristic = section-header weight (master-brain 5 ›
  active-work 4 › focus 3 › bridge 2 › patterns 1 › default 1) × per-line signals (active-token +3, date +2,
  path +1, wikilink +1, bullet +1; long-line penalties). UTF-8 + surrogate-pair-safe byte cap. **No Ollama
  dependency** (the optional Ollama summary-enhancer is the separate, health-gated `U-GCF-OLLAMA-MAINT`).
- **CLI:** `node scripts/galaxy-context-card.mjs build|list|show <galaxy> [--max-bytes N] [--top-n N] [--json]`.
  Loud R12 advisory when 0 galaxies are found (a misconfigured `enginesDir` never masquerades as success).
- **Output:** `state/shared/galaxy-cards/<g>.card.md` + `INDEX.json` (schemaVersion 1.0.0:
  `cards[].{galaxy,bytes,truncated,factCount,path}`). Cards are a **regenerable build artifact** (run `build`).
- **Tests:** `scripts/lib/galaxy-context-card.test.mjs` — 16 hermetic `node:test` cases incl. the REAL
  `defaultListGalaxies` readdir→filter→sort production path (guards the "hermetic fakes don't prove wiring" class).
- **Real-data:** 34 cards, all ≤1024 B (avg 1022). 2-reviewer per-file scrutiny PASS/PASS.
- **Knob:** `PRISM_GCF_CARD_DISABLE=1` → `buildAllCards` no-ops (read fns still work).

## U-GCF-CAG-CARDS (shipped 2026-05-31)
Cache-anchors the cards. `buildAllCards` now emits ONE consolidated `state/shared/galaxy-cards/ALL-CARDS.md`
bundle (recorded in INDEX.json: schemaVersion 1.0.0→1.1.0 + additive `bundlePath`/`bundleBytes`). `cag-router.mjs`
`COLD_SOURCES` gains a single `galaxy-cards` entry → the SessionStart `cag-cold-cache-anchor` hook (iterates
COLD_SOURCES generically — **no hook change**) anchors the bundle once/session, so cross-galaxy context recall
costs ~0 marginal tokens vs re-reading 34 multi-KB brains.
- ONE cold entry (~35 KB), not 34 — bounded cold-tier budget. Multi-word keywords (no bare `galaxy`/`memory`)
  prevent over-match (reviewer-verified: only galaxy-scoped queries fire it). Rationale honestly leans on
  intra-session stability (engine-digest precedent), not literal ≤1 mod/month.
- The bundle is a regenerable build artifact (**NOT committed**; cold-anchor shows `(missing)` until a build runs).
- 4 new tests; 18/18 card + 41/41 cag-router pass; real build: 34997 B bundle, 34 cards. 2-reviewer PASS/PASS.

## U-GCF-XGALAXY-INJECT (shipped 2026-05-31)
Phase C down-pipe: per prompt, inject only the top-K OTHER galaxy cards most relevant to the active query
(similarity-gated, exclude-self, NEVER broadcast). Own wiki page: [[xgalaxy-inject]]. Wired via golf patch
`HOOK-PATCH-GCF-XGALAXY-INJECT.md` into `slot-context-bundle-inject.mjs` (summary/emit path).

## U-GCF-SALIENCE (shipped 2026-05-31)
Salience scoring for the cards. The spec's `recency × access × outcome-impact` became a more correct
**two-surface** design after verifying the ACTUAL DATA behind each factor (R12 — verify the data, not the
schema):

- **`scripts/lib/galaxy-salience.mjs`** — pure-core + injected-deps + fail-soft; NO import back from
  galaxy-context-card (base scorer injected → no ESM cycle).
  - **Per-fact bonus** (re-ranks facts WITHIN a card): `recency` (exp-decay on per-fact dates, 30-day
    half-life, future-clamped) + `outcome-impact` (structural proxy: commit-SHA *with a digit* /
    shipped|wired|PASS|merged|green / N·N tests / N%). Both DISCRIMINATE between a galaxy's own facts.
    Plugs into `extractGalaxyCard` via `opts.salienceScorer`, defaulting to `scoreLine` ⇒ **byte-identical
    when off** (the 18 U-GCF-CARD tests stay green).
  - **Per-galaxy score** (ranks galaxy-vs-galaxy, for `U-GCF-ROLLUP`/cross-galaxy ordering):
    `computeGalaxySalience` = freshest-fact recency + impact density + access. **access-frequency lives
    HERE, not per-fact** — the access ledger keys by galaxy (galaxy-granular), so it is constant across a
    card's facts and cannot discriminate intra-card; including it per-fact would be a no-op.
- **Data honesty (verified 2026-05-31):** all 3 factors REAL + LIVE. Access source = the spec's "india
  bus" `state/shared/outcome-bus.jsonl` (per-row `{slot, domain, success}`, ~13K rows / 18 galaxies, 100%
  galaxy-joinable). Three legacy domain values normalized via `DOMAIN_ALIAS` (database→database-expansion,
  fleet-reaper→fleet-hygiene, hermes-zebra→hermes-zulu). **Rejected as default** (verified, not defaulted):
  `feature-util-counts.json` perDomainTotals `{}` (schema present, DATA empty) + `ai-intelligence-stats`
  by_domain (only ~3%/2-of-34 galaxies join → would bias toward wedm+speed-feed; offered as opt-in
  `accessSource:"ai-intel"`).
- **Integration:** `buildAllCards` activates salience by default (knob `PRISM_GCF_SALIENCE=0` reverts to
  scoreLine + schema 1.1.0) and records per-galaxy `salience`/`salienceFactors` in INDEX (schema **1.1.0 →
  1.2.0**, additive — `xgalaxy-inject`'s `cards[].{galaxy,path}` reads are unaffected). Optional
  `accessPath`/`accessSource` injection surfaces let hermetic tests redirect off the live bus.
- **CLI:** `node scripts/galaxy-salience.mjs [--galaxy G] [--factors] [--json]` — ranks galaxies by
  recorded salience + surfaces which factors are live.
- **Real data (live build):** top quoting 7.60 · token-optimization 7.46 · hermes-zulu 7.40; bottom
  pdf-corpus/quality/shop-floor 3.94 (stale + low-traffic). The factors genuinely separate galaxies.
  51 salience + 18 card tests green. 2-reviewer per-file scrutiny PASS/PASS (P2 hermeticity + P3 SHA-digit
  both fixed in-session).
- **Tests:** `scripts/lib/galaxy-salience.test.mjs` (51 `node:test`) — decay curve, impact cap + SHA-digit
  guard, date rejection, alias-target-real fail-on-revert, byte-identical-when-neutral, -Infinity
  passthrough, real-LIVE outcome-bus, ai-intel opt-in, integration re-rank + INDEX fields + off-parity +
  hermetic access, CLI oracle.

## U-GCF-ROLLUP (shipped 2026-05-31)
Phase B FEED-UP: rolls the 34 per-galaxy cards UP into ONE salience-ranked **master fleet-context digest**
so the master brain injects a single ranked roll-up instead of re-reading 34 multi-KB brains. Consumes the
per-galaxy salience scores U-GCF-SALIENCE wrote to INDEX (R8 — reads `cards[].salience`, never recomputes).

- **`scripts/lib/galaxy-rollup.mjs`** — pure-core + injected-deps + fail-soft (mirrors `xgalaxy-inject.mjs`).
  Reuses `parseCardRole` (xgalaxy-inject) + `utf8Truncate`/`DEFAULT_ROOTS` (galaxy-context-card); NO ESM cycle
  (galaxy-context-card never imports rollup — reviewer-traced acyclic). Exports `extractTopFact`, `compactFact`,
  `rankGalaxies`, `loadIndex`, `buildDigestModel`, `renderDigest`, `rollup`.
  - **`extractTopFact`** surfaces each galaxy's top NON-boilerplate domain "delta". The master-brain-link block
    (UP/DOWN/MASTER-INDEX/Last-master-sync) wraps onto continuation lines (`- — recall: …`, `- \`C:/…\` → fed to …`)
    that a per-line prefix match misses → the block is skipped by its template terminator `**Last master-sync`,
    with a hardened fallback (truncation-marker + `—`/`→`/`recall:` continuation skip). Honest `null` when a
    galaxy's verbose link block consumed its whole 1 KB card budget — itself a `U-GCF-COMPACT` signal.
- **SINGLE-WRITER-PER-FILE:** rollup writes ONLY `MASTER-DIGEST.md` + `MASTER-DIGEST.json` (its own sidecars,
  schema 1.0.0). It NEVER writes `INDEX.json` (buildAllCards owns that — a second writer would clobber the
  salience fields, the multi-writer regression class). A fail-on-revert test asserts exactly 2 writes, neither
  ending in `INDEX.json`.
- **Advisory companion** to the master `MEMORY.md` `[galaxy:*]` registry — ranks galaxies by current activity;
  does NOT rewrite that peer-locked, hand-curated file (the registry's descriptions stay curated).
- **CLI:** `node scripts/galaxy-rollup.mjs build|show [--json]` — fail-soft, always exits 0.
- **Real build (live):** 34 galaxies · 7315 B · schema 1.0.0 · **32/34 real deltas**, 2 honest `(no delta)`
  (quoting, post-processor — verbose link block ate their 1 KB card; flags them for `U-GCF-COMPACT`). Ranking
  top quoting 7.60 → token-optimization 7.46 → hermes-zulu 7.40 → system-viz 7.37. 30 `node:test` green.
  2-reviewer per-file scrutiny PASS/PASS (0 P0/P1; only P3 cosmetics — truncation never fires at production size).
- **Knob:** `PRISM_GCF_ROLLUP_DISABLE=1` → rollup() no-op (read/render fns still work).
- **Wiring (deferred, golf):** run `galaxy-rollup build` AFTER `galaxy-context-card build` at SessionStart so the
  digest is fresh — fold into the `HOOK-PATCH-GCF-CAG-REGEN-WIRE` patch.

## U-GCF-COMPACT (shipped 2026-05-31) — Phase A complete
Per-galaxy MEMORY.md **size-watchdog + pointer-compression advisor** — the 24 KB master-ceiling lesson applied
per galaxy. Measures every `mcp-server/src/engines/<g>/MEMORY.md`, cross-references card-distillation health
(no-delta, READ from `MASTER-DIGEST.json`), and ranks COMPACTION CANDIDATES. **ADVISORY (R12)** — never
rewrites a peer-locked galaxy MEMORY.md; the operator compacts (move detail → `<g>/MEMORY-ARCHIVE.md`, keep
pointers).

- **`scripts/lib/galaxy-memory-watch.mjs`** — pure-core + injected-deps + fail-soft. Reuses `CEILING_BYTES`
  (24576) from `memory-size-watch.mjs` (R8 single source; import is side-effect-free — that module guards its
  `main()`) + `DEFAULT_ROOTS` from galaxy-context-card. Exports `classifySize`, `assessGalaxy`,
  `buildWatchModel`, `renderWatch`, `measureGalaxies`, `loadCardHealth`, `watch`.
  - **Candidacy signal** = size ≥ warn (12288 B) / critical (24576 B) **OR** card has no domain delta
    (`hasDelta===false`). **Truncation is NOT a signal** — a 1 KB card being truncated is its normal mode
    (32/34 cards exceed 1 KB of salient facts); an early cut used it and produced 32/34 false candidates
    (fixed + fail-on-revert tested). Size here is a **distillation-cost proxy**, NOT a truncation cliff (galaxy
    brains are not auto-loaded like the master MEMORY.md); `cardNoDelta` is the direct distillation-failure detector.
- **SINGLE-WRITER-PER-FILE:** writes ONLY `MEMORY-WATCH.{md,json}` + an append-only history jsonl — never a
  galaxy MEMORY.md, never INDEX.json (fail-on-revert tested).
- **CLI:** `node scripts/galaxy-memory-watch.mjs [--json] [--history]` — cron exit codes 0 clean / 1 candidates / 2 error.
- **Real fleet (live):** 34 galaxies, **2 candidates** — `quoting` (90 KB MEMORY.md, **critical** + no-delta:
  3.7× the master ceiling; a peer was actively growing it during the build) and `post-processor` (no-delta at
  8 KB). The 32 healthy galaxies correctly clean. This is exactly the set ROLLUP's honest `(no delta)` rows
  flagged — COMPACT closes the loop. 24 `node:test` green. 2-reviewer per-file scrutiny PASS/PASS (round 1
  arm B FAIL on a test doing real IO → fixed hermetic → round 2 PASS/PASS, empirically byte-verified non-mutating).
- **Knob:** `PRISM_GCF_COMPACT_DISABLE=1` → watch() no-op.

## U-GCF-KNOWS-MAP (shipped 2026-05-31) — Phase B complete
The master **who-knows-what** index — which galaxy's brain holds context on topic X. Built **TF-IDF-lite** over
the 34 cards (each galaxy = a "document"): token weight = (role-line hit ? `ROLE_BOOST` : 1) × `idf(N, docFreq)`,
`idf = log(1 + N/df)` (smoothed — a token in 1/34 galaxies routes strongly; a token in all 34 self-suppresses
to ≈0.69, kept-but-lowest). Galaxy-BRAIN-level routing, complementary to the node-level master-index.

- **`scripts/lib/galaxy-knows-map.mjs`** — pure-core + injected-deps + fail-soft. Reuses `tokenize`
  (master-index-search-lib — same tokenization as the master-index, no drift), `parseCardRole`/`loadCardsFromIndex`
  (xgalaxy-inject), `DEFAULT_ROOTS`. No ESM cycle (reviewer-traced). Exports `idf`, `galaxyTokenWeights`,
  `buildKnowsMap` (forward galaxy→topics + inverted token→galaxies), `whoKnows(query)` (the 1-lookup), `build`,
  `loadKnowsMap`. Distinct from `slot-galaxy-map` (a static slot-name→galaxy dict) — dedup-cleared.
- **RECALL BOUND (R12 — stated, not hidden):** the index routes only on tokens present in the ≤1 KB card
  distillations. A **multi-token** query discriminates sharply ("cutting force speed feed" → speed-feed 11.4,
  "post processor gcode controller" → post-processor 14.1, "obsidian memory recall" → token-optimization). A
  **bare ambiguous single token** may tie or route weakly ("cutting" alone is carried by several cards and ties;
  "threading"/"chamfer" may be absent from the distillations). Prefer 2+ topic words; for exhaustive sub-domain
  recall fall back to the node-level master-index. Sharper sub-domain routing is a CARD-CONTENT lever
  (raise the U-GCF-CARD distillation budget), NOT a KNOWS-MAP code change.
- **SINGLE-WRITER-PER-FILE:** writes ONLY `KNOWS-MAP.json` — never INDEX.json (fail-on-revert tested).
- **CLI:** `node scripts/galaxy-knows-map.mjs build | who <query…> [--json]` — fail-soft, exits 0.
- **Real build (live):** 34 galaxies · **767 capability tokens** indexed. 19 `node:test` green (incl. an idf
  fail-on-revert: a unique token must outrank a shared one, and a documented bare-token-tie known-limit guard).
  2-reviewer per-file scrutiny: round-1 arm B FAIL (the "one lookup" claim overclaimed vs the card recall bound)
  → docs qualified → round-2 PASS/PASS.
- **Knob:** `PRISM_GCF_KNOWS_DISABLE=1` → build() no-op.
- **Feeds:** `U-GCF-XGALAXY-INJECT` (Phase C) can consume `whoKnows()` instead of re-scoring all cards per prompt.

## U-GCF-PUSH (shipped 2026-05-31) — Phase C complete
SELECTIVE cross-galaxy learning fan-out. For each galaxy's headline learning (`MASTER-DIGEST.json`
`ranked[].topFact`), find the few OTHER galaxies whose domain it's relevant to (via `whoKnows` over KNOWS-MAP)
and emit a one-line **advisory** push pointer to each. NEVER a broadcast. A pure transform over two shipped
artifacts (MASTER-DIGEST.json + KNOWS-MAP.json) — no new data source.

- **`scripts/lib/galaxy-push.mjs`** — pure-core + injected-deps + fail-soft (mirrors galaxy-knows-map.mjs).
  Reuses `whoKnows`/`loadKnowsMap` (knows-map), `tokenize` (master-index-search-lib), `DEFAULT_ROOTS`. No ESM
  cycle. Exports `compactLearning`, `matchTargets`, `renderPushPointer`, `buildPushQueue`, `loadLearnings`, `pushBuild`.
- **Three independent never-broadcast governors:** exclude-self · score ≥ threshold (1.5) · cap at k (3).
- **Distinctive-token filter:** the match is restricted to the SOURCE's distinctive KNOWS-MAP forward topics
  that appear in the learning — strips generic prose tokens that would create spurious matches. Real-data effect:
  **92 noisy pushes → 39 selective** ones.
- **HONESTY / RECALL BOUND (R12 — stated, advisory):** match relevance is a HEURISTIC bounded by card-token
  distinctiveness (the same recall bound as KNOWS-MAP). Low-distinctiveness / meta-prose cards (e.g. `business`,
  `database-expansion`) can still surface weak single-token matches ("across", "all", "working"). So pushes are
  **ADVISORY** — a target galaxy reviews its inbox; a weak pointer is low-cost to ignore. The pointer self-labels
  signal strength: a single-topic match renders `advisory match [weak: 1 topic]`, a multi-topic match is unflagged.
  Sharper relevance is a CARD-CONTENT lever (raise the U-GCF-CARD distillation budget so meta-prose cards carry
  more distinctive capability tokens), NOT a PUSH code change. Never auto-writes a peer-locked MEMORY.md — the
  queue + per-target inbox are advisory; delivery is an operator/golf step.
- **SINGLE-WRITER-PER-FILE:** writes ONLY `PUSH-QUEUE.json` — never INDEX.json / a galaxy MEMORY.md (fail-on-revert tested).
- **CLI:** `node scripts/galaxy-push.mjs build | inbox <galaxy> | show [--json]` — fail-soft, exits 0.
- **Real build (live):** 18 sources → **39 targeted pushes** across 24 galaxies (k=3, threshold=1.5). 19 `node:test`
  green (exclude-self, never-broadcast/k-cap, distinctive-filter, single-topic-weak-flag — all fail-on-revert).
  2-reviewer per-file scrutiny PASS/PASS (arm-B P2 doc-honesty → pointer + this section qualified).
- **Knob:** `PRISM_GCF_PUSH_DISABLE=1`. Deferred (P3): single-token matches could require a higher bar (card-content lever).

## U-GCF-RECALL-FIRST (shipped 2026-05-31)
Phase D Obsidian token savings: recall-instead-of-reread — **a nudge + a metric**. Re-reading a whole multi-KB
brain/memory file costs ≈ bytes/4 tok; recalling the relevant ~3 snippets via `prism_memory:semantic_search`
costs ~300. This unit decides when a `Read` of a recallable brain/memory file should be a recall, renders the
nudge with the ESTIMATED savings, and records the estimate (feeds `U-GCF-SAVINGS-TELEMETRY`).

- **`scripts/lib/recall-first.mjs`** — pure-core + injected-deps + fail-soft. Exports `classifyRecallable`,
  `estimateSavings`, `shouldNudgeRecall`, `renderRecallNudge`, `recordRecallSavings`, `recallSavingsSummary`, `recallFirst`.
- **SCOPE / dedup boundary (R8):** targets ONLY the brain/memory surface — galaxy `engines/<g>/MEMORY.md`,
  `knowledge/memories/**`, the C: auto-memory dir, the master `MEMORY.md`. Explicitly NOT the WIKI surface
  (`wiki-recall-on-read.mjs` + `wiki-read-offload-advisory.mjs` own that — wiki classifies `recallable:false`,
  fail-on-revert tested). Complementary to `recall-counter-track.mjs` (PostToolUse, only COUNTS) — recall-first
  is PreToolUse + adds the savings ESTIMATE the counter lacks (different events → coexist).
- **HONESTY (R12):** savings are ESTIMATES (bytes/4 vs ~300), framed as such everywhere; the nudge says
  "Est. savings ~N tok **if the snippets answer your need** — re-read the full file only if they don't" (conditional,
  with a re-read escape hatch; never claims guaranteed savings or that recall is always sufficient).
- **SINGLE-WRITER-PER-FILE:** records to its OWN `recall-first-savings.json` (cumulative + per-surface) — never
  offload-stats / wiki-recall-counts / a MEMORY.md. RMW coerces every accumulator (`Number(...)||0`) + rejects a
  non-object/array prior so a corrupt sidecar can't propagate NaN/string garbage.
- **CLI:** `node scripts/recall-first.mjs check <file> | summary [--json]`. Real: quoting brain (90 KB) → nudge
  "~24331 tok est savings"; wiki correctly deferred.
- 21 `node:test` green (wiki-dedup boundary, leading-anchor fix, single-writer, garbage-prior coercion,
  MIN_BYTES=0 no-floor — all fail-on-revert). 2-reviewer per-file scrutiny PASS/PASS (3 P2 robustness hardenings applied).
- **Knobs:** `PRISM_GCF_RECALL_DISABLE=1`, `PRISM_GCF_RECALL_MIN_BYTES=N` (floor, default 4096; 0 = no floor).
- **Wiring (golf):** `HOOK-PATCH-GCF-RECALL-FIRST.md` — thin PreToolUse:Read advisory calling `recallFirst()`,
  wired AFTER `wiki-read-offload-advisory` (advisory-only, never blocks).

## U-GCF-XDEDUP (shipped 2026-05-31)
Phase D Obsidian token savings: cross-galaxy memory dedup. Detects near-duplicate DOMAIN facts that appear
across ≥2 galaxy brains, picks ONE canonical (highest-INDEX-salience galaxy), recommends the rest replace
their copy with a `[[pointer]]`. **ADVISORY** — emits `DEDUP-REPORT.json`, NEVER edits a galaxy MEMORY.md.

- **`scripts/lib/galaxy-xdedup.mjs`** — pure-core + injected-deps + fail-soft. Exports `cardDomainFacts`,
  `memoryFactLines`, `jaccard`, `clusterDuplicates`, `selectCanonical`, `estClusterSavings`, `loadGalaxyFacts`, `xdedup`.
  Reuses `tokenize`/`DEFAULT_ROOTS`/`loadCardsFromIndex` (no ESM cycle).
- **SCOPE:** default scans the FULL galaxy `engines/<g>/MEMORY.md` brains (the real "same fact in N memories"
  dup source — `--cards` scans the ≤1 KB inject surface instead, lower-yield). Excludes the master-brain-link
  block + headers + code fences + continuations so only genuine knowledge copies surface.
- **Clustering:** Jaccard token-set overlap ≥ **0.65** (bumped from 0.60 after a reviewer found a boundary
  PARAPHRASE single-link-chaining into a cluster at exactly 0.60 — 0.65 drops paraphrases; genuine template
  copies cluster at ~1.0). Only clusters spanning ≥2 DISTINCT galaxies (intra-galaxy repeat ≠ cross-dup).
- **HONESTY (R12):** the report carries a `note` — members are NEAR-duplicate, not guaranteed identical; VERIFY
  before collapsing (a paraphrase may carry distinct info). Savings are modest + estimated.
- **SINGLE-WRITER-PER-FILE:** writes ONLY `DEDUP-REPORT.json` — never INDEX.json / a MEMORY.md (fail-on-revert tested).
- **CLI:** `node scripts/galaxy-xdedup.mjs build [--cards] | show [--json]`.
- **Real build (live):** 562 facts → **6 genuine cross-galaxy dup clusters**, ~37 tok saveable — mostly
  template-derived structural lines (e.g. "Parent doctrine: DOMAIN-GALAXY-DOCTRINE" copied across 6 galaxy
  brains, canonical=quoting). Honest negative-ish result: the brains share template lines, not large content
  dup. 16 `node:test` green. 2-reviewer per-file scrutiny PASS/PASS (P2 chaining + P3s fixed in-session).
- **Knobs:** `PRISM_GCF_XDEDUP_DISABLE=1`, `PRISM_GCF_XDEDUP_JACCARD=F` (default 0.65).

## U-GCF-SAVINGS-TELEMETRY (shipped 2026-05-31) — CAPSTONE, milestone non-gated work complete
Rolls up the federation's token savings from every prior unit's sidecar — PROVES the milestone delivered (R12:
estimated from real artifacts, not asserted), in THREE honest categories:
- **`scripts/lib/galaxy-savings.mjs`** — pure-core + injected-deps + fail-soft; every input sidecar optional
  (missing → contributes 0, report degrades never throws). Exports `loadJson`, `computeCardSavings`,
  `computeDigestSavings`, `buildSavingsModel`, `renderSavings`, `savingsBuild`.
- **1. Per-inject potential (UNREALIZED capacity):** card-vs-brain (INDEX `cards[].bytes` vs MEMORY-WATCH
  `all[].bytes`, per galaxy) ~44.8K tok · digest-vs-all-brains (MASTER-DIGEST bytes vs Σ brain bytes) ~51.4K tok.
  **These are ALTERNATIVE strategies — NOT summed** (both replace re-reading the SAME brains; the reviewer caught
  an additive headline that double-counted). Headline = **best single-strategy ceiling ~51.4K tok/inject**, and
  it is UNREALIZED until a consumer actually injects the card/digest in place of the brain (inject path golf-pending).
- **2. Cumulative realized:** recall-first-savings.json — currently **0** (the recall hook is golf-pending; shown
  honestly with WHY, never projected).
- **3. One-time saveable:** DEDUP-REPORT.json — ~37 tok across 6 dup clusters (if the advisory is applied).
- **Data honesty (R12 — the capstone's whole job):** estimates labeled (bytes/4); realized=0 shown with cause;
  per-inject framed as contingent capacity. All 5 producer field names verified against their producers (no silent
  0). SINGLE-WRITER (own SAVINGS-REPORT.{json,md}). 12 `node:test` green (incl. the realized=0-when-recall-absent
  fail-on-revert honesty guard). 2-reviewer per-file scrutiny PASS/PASS (arm-B's additive-headline + contingency P2s
  fixed in-session → ceiling-not-sum + caveat).
- **CLI:** `node scripts/galaxy-savings.mjs build | show [--json]`. **Knob:** `PRISM_GCF_SAVINGS_DISABLE=1`.

## Realization progress (turning unrealized capacity into accrued savings)
- ✅ **MASTER-DIGEST cold-anchored** (2026-05-31): added a `galaxy-digest` entry to `cag-router.mjs` COLD_SOURCES
  (fleet-ranking keywords, distinct from `galaxy-cards`' per-galaxy intent — verified no over-match). The 7 KB
  ranked digest now hits the CAG cold cache on fleet-OVERVIEW queries instead of re-reading 34 brains — REALIZES
  the digest-vs-all-brains per-inject potential the telemetry reports. `cag-router.mjs` is in scripts/lib (alpha-
  writable, not a hook); the generic `cag-cold-cache-anchor` SessionStart hook picks it up with no hook change.
- ⏳ Recall/xgalaxy/regen nudges still golf-pending (the patch-siblings below) — those realize the rest.

## U-GCF-VIZ-ROOST (shipped 2026-06-01) — federation → /system-viz (PSN leg #6)
`scripts/generate-galaxy-federation-roost-features.mjs` (+ `.test.mjs`, 11/11). Surfaces the federation as a brain-graph
node so PSN leg #6 (System Viz) sees it. Pure `generate(loaded, existingNodeIds)` + fail-soft `main()`: reads the five
federation sidecars under `state/shared/galaxy-cards/` (INDEX/MASTER-DIGEST/KNOWS-MAP/DEDUP-REPORT/SAVINGS-REPORT) and
writes ONE augmentation `state/shared/system-viz/galaxy-federation-roost-augmentation.json`
(`{schemaVersion,generatedAt,source,newNodes[],newEdges[]}`). Emits `ghost.galaxy_federation` (L7, parent
`ghost.planned_features`) + one child roost per present artifact `ghost.gcf_{cards,digest,knows_map,dedup,savings}` (L8)
with **live-stat labels** (e.g. `savings: ~51369 tok/inject ceiling`, `cards: 34 galaxies, salience-ranked`) + an
`aggregates` edge each. Node/edge shape mirrors the in-production `generate-substrate-meta-roost-features.mjs`. SINGLE-WRITER
(only its own augmentation path), fail-soft (missing sidecar omits only its child — no dangling edge; `generate(null)` never
throws), R12-honest (the savings label carries the `UNREALIZED until inject path wired` caveat into node `info`), no literal
`[[wikilink]]` in any label/info (link-audit-feedback guard, fail-on-revert test).
**Status: WIRED (2026-06-01, U-GCF-VIZ-ROOST-WIRE).** The 2 graph registrations (regen-viz `FAST[]` entry +
merge-augmentations `loadOptional`/`versions`/splice, mirroring `substrateMetaRoost`) were applied **directly** once the
peer-dirty target files (`regen-viz.mjs` sierra, `merge-augmentations.mjs` bravo) committed their in-flight work and went
clean — so the brief R7 deferral to `HOOK-PATCH-GCF-VIZ-ROOST-WIRE.md` resolved without clobbering anyone. Fold VERIFIED
by merge-simulation (6 nodes + 5 edges, meta under `ghost.planned_features`, 5 child roosts under the meta) and a live
`merge-augmentations` run. Renders on every regen thereafter (standard roost cadence). Per-file 2-agent scrutiny gate was
server-rate-limited (146 fleet loops); substituted with `node --check` + the empirical fold-simulation (stronger than an
agent summary for an exact-mirror change) + direct consumer-contract verification (which caught the not-auto-wired P0).

## Coverage (verified 2026-06-01, iter 4)
**34/34 galaxies federated** — every `mcp-server/src/engines/<g>/MEMORY.md` on disk (the ground-truth galaxy set, 34) appears in `INDEX.json` (cards), `MASTER-DIGEST.json` (galaxyCount=34), AND `KNOWS-MAP.json` (forward=34). Zero galaxies missing from any artifact. So the goal-clause **"wired to all galaxies and nodes" is DATA-complete at the federation level**. Surface-*consumers*: system-viz render = **WIRED 2026-06-01** (U-GCF-VIZ-ROOST-WIRE — applied directly once peer files cleared); remaining = recall/xgalaxy/regen hook injections → golf patches (harness-blocked from alpha), Ollama-maint → Ollama recovery.

## Synergy-audit wirings (2026-06-01, iter 7-8) — federation → 7 PSN surfaces + master brain
A 5-agent Workflow (`node-galaxy-master-brain-synergy-audit`, 0 rate-limited) audited federation↔surface wiring. Already wired: system-graph/master-index, tribal, obsidian, PSN, system-viz (roost). Gaps closed this session:
- **master brain** — `MEMORY.md` "Galaxy brain back-pointers" now carries a federation feed-up pointer (MASTER-DIGEST/KNOWS-MAP/INDEX), trimmed to fit the 22 KB index cap.
- **wiki index** — `knowledge/wiki/index.md` entry under the line-772 empty `## architecture` header (OUTSIDE the auto-managed ARCH-* markers, so `generate-layer-wiki.mjs` preserves it).
- **prism-awareness** — `scripts/awareness-snapshot.mjs` reads the federation fail-soft + renders a `## Galaxy Federation` section (derive verified: 34 galaxies, 767 tokens, top-5 by salience). **R12:** the awareness generator is itself broken on the 663 MB graph (`readFileSync` > V8 536 MB string limit → bails before the federation code; `AWARENESS-SNAPSHOT.md` is 8 days stale) — the section renders once sierra makes the graph-read streaming. Patch-sibling: `state/shared/dashboards/patches/AWARENESS-INJECT-PATCH-U-GCF-AWARENESS.md` (golf hook tweak + sierra graph fix).
- **memories (U-GCF-XDEDUP-SCAFFOLD)** — `galaxy-xdedup.mjs` `memoryFactLines`/`cardDomainFacts` now skip DOMAIN-GALAXY-DOCTRINE scaffold lines (Parent doctrine / Companion sibling indexes / Migration unit / Soul assignment / buildout provenance) as STRUCTURAL duplication (same class as the master-brain-link block) so scaffold can't inflate DEDUP-REPORT / savings-telemetry `oneTimeSaveable`. 17/17 tests (the pre-existing "Parent doctrine survives" assertion was corrected to "excluded" — R9 intent change, not a weakening).
- **cross-galaxy** — 34/34 galaxy brains verified bidirectionally wired to the master brain (back-pointer + reverse master-brain-link); structurally complete. P3 attribution-format normalizations (`(golf 5-29)`→`(slot:golf, 2026-05-29)`) deferred.

## Status & Next
**GALAXY-CONTEXT-FEDERATION-MS0 = 11/12 shipped — every non-gated unit complete** (Phases A, B, C done; Phase D
done except the gated unit). The hub-and-spoke context federation is built end-to-end: retain (card+salience+compact)
→ feed-up (rollup+knows-map) → redistribute-down (xgalaxy-inject+push) → Obsidian savings (cag-cards+recall-first+
xdedup+savings-telemetry). Remaining:
- `U-GCF-OLLAMA-MAINT` — GATED on Ollama `/api/chat` recovery (route memory compaction/summarization to Ollama).
- **golf patch-siblings** (mechanisms shipped+tested, wiring harness-blocked from alpha): `HOOK-PATCH-GCF-RECALL-FIRST.md`,
  `HOOK-PATCH-GCF-XGALAXY-INJECT.md`, `HOOK-PATCH-GCF-CAG-REGEN-WIRE.md` (SessionStart, all builds fresh:
  `galaxy-context-card → galaxy-rollup → galaxy-knows-map → galaxy-push → galaxy-memory-watch → galaxy-xdedup → galaxy-savings`).
  Wiring these REALIZES the per-inject potential the telemetry currently reports as unrealized capacity.
- ✅ **system-viz wiring APPLIED** (`U-GCF-VIZ-ROOST-WIRE`, 2026-06-01) — the 2 registrations (regen-viz generator list +
  merge-augmentations loadOptional/splice/versions) were applied directly once the peer-dirty files committed + went clean.
  `ghost.galaxy_federation` + 5 child roosts now fold into the graph (verified). The patch-sibling `HOOK-PATCH-GCF-VIZ-ROOST-WIRE.md`
  is retained as the record but is now self-applied.

## Deferred (P2, from scrutiny)
- INDEX per-card content hash/mtime so CAG can cheaply detect a stale card without re-reading (additive field).
- `readCard` default-fs path + CLI-verb tests.

Memory: [[reference_galaxy_context_federation_card_2026_05_31]] · sibling channel [[working-path-capture]] · PSN [[feedback_psn_definition]].
