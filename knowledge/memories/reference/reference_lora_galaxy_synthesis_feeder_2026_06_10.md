---
name: reference-lora-galaxy-synthesis-feeder-2026-06-10
description: "Obsidian per-galaxy synthesis brains -> LoRA training signal across all 34 galaxies. Extended vault-to-lora-dataset.mjs with a --source galaxy mode (512 advisory-tagged Alpaca pairs from knowledge/memories/patterns/*_synthesis.md) + wired both vault datasets into the fleet-training corpus manifest (closed a producer orphan). Commits eb262e5675 + ad120bdf8a."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.648Z
aliases: reference_lora_galaxy_synthesis_feeder_2026_06_10
---


2026-06-10 (slot:india, /goal apply-AI-systems-across-all-galaxies). The per-galaxy
compounded synthesis brains (`knowledge/memories/patterns/<galaxy>_synthesis.md`, 35
files = 34 galaxies + `_meta`; each has 3 canonical sections: Recurring patterns /
Key decisions & rules / Open threads, auto-distilled by galaxy-reflection-synthesis.mjs
via gpt-oss:120b) were a DORMANT training signal -- kilo's `vault-to-lora-dataset.mjs`
(OBSIDIAN-AI-SYNERGY, 2026-06-09) read only global `feedback/*.md`, never the per-galaxy
brains.

**What shipped (commit eb262e5675):** extended `scripts/vault-to-lora-dataset.mjs` with
a second source behind `--source galaxy`. New exported fns: `parseSynthesisSections`
(state-machine: track `## <canonical>` heading, collect `^[-*] ` bullets, append wrapped
continuation lines, flush at heading/bullet/blank/EOF), `bulletTopicAndRest`
(pure-ASCII `^\*\*(.+?)\*\*` extracts the bold lead term; `rest` unused downstream so the
regex never needs the unicode separator -- this is how I dodged the ascii-guard block on
en/em dash in a regex char class), `buildExamplesFromSynthesis` (one galaxy-tagged Alpaca
pair per bullet >= 40 chars; `output` = full bullet, advisory provenance encoded in
`input`: "PRISM <galaxy> domain synthesis (advisory, verify against source) -- <section>"),
`galaxyFromSynthesisFile` (excludes `_meta_synthesis.md`), `collectGalaxySynthesisExamples`.
`main()` became a dispatcher -> `mainFeedback` (original body verbatim, byte-identical) /
`mainGalaxy`. Galaxy pairs write to a SEPARATE file
`state/shared/lora/vault-galaxy-synthesis-dataset.jsonl` and a clobber-guard
(`opts.outPath === DEFAULT_OUT ? DEFAULT_SYNTH_OUT : opts.outPath`) means a bare `--out`
can NEVER overwrite the verified-feedback dataset (proven: feedback file byte-untouched).
The two signals are kept distinct by trust level (R7): verified hand-authored doctrine vs
LLM-distilled advisory synthesis -- never merged.

**LIVE:** 34 galaxies -> 512 pairs (214 recurring / 123 decisions / 175 open-threads),
avg output ~205 chars. The pair count drifts run-to-run (saw 521 -> 512 seconds apart)
because the Brain Refresh process rewrites the synthesis files concurrently -- snapshot
semantics hold (per-file single `readFileSync`, atomic refresher rename, never a torn read).
31/31 tests (20 existing feedback unchanged + 11 new: happy + 3 failure + 2 adversarial +
live-vault R15 validation + cross-source isolation).

**Wiring (commit ad120bdf8a, R15 step-1, closed 3-of-3 arm-B P1):** the producer was an
ORPHAN -- nothing read `state/shared/lora/*.jsonl` (the 2026-06-09 feedback dataset shipped
with the same gap). Registered BOTH `vault-feedback-lora` + `vault-galaxy-synthesis-lora`
as `kind:'lora-training-jsonl'` SOURCES in `scripts/build-fleet-training-corpus-inventory.mjs`
(the manifest a trainer reads). LIVE: totalSources 8 -> 10, present 9/10, both ids in the
written `state/shared/training/fleet-training-corpus-inventory.json`. Gitignored data ->
`statPath()` degrades to missing on a fresh checkout.

**Deferred (logged, NOT blocking -- the 3-of-3 cleared A+B+C PASS):**
- P2 (reviewer C): no write-side test for the clobber-guard (the single most safety-critical
  line, `mainGalaxy` ~:392). Fast-follow: export `DEFAULT_OUT`/`DEFAULT_SYNTH_OUT` + a
  `resolveGalaxyOutPath()` helper, unit-test the redirect hermetically. Small, same file.
- P2 (reviewer C, informational): `--source galaxy --out <explicit-feedback-path>` bypasses
  the guard (explicit operator override; acceptable, same as the feedback path).
- P1-2 (reviewer B, non-blocking): the 2 live-vault tests are non-hermetic (read the real
  vault dirs) -- they'd red on a sparse CI checkout; pre-existing pattern (the feedback live
  test does the same). Could gate behind `PRISM_VAULT_LIVE_TESTS` if it ever runs vault-less.

**iter 2 (4f4db8a7fb, U-LORA-GALAXY-SYNTHESIS-GUARD-TEST):** closed the iter-1
3-of-3's two P2s -- extracted+exported `resolveGalaxyOutPath(outPath)` (canonical
`path.resolve` compare, so an ALIASED path that resolves to the feedback file is
also redirected, not just the exact string), exported DEFAULT_OUT/DEFAULT_SYNTH_OUT,
+4 hermetic guard tests (35/35). The alias test FAILS under the old `=== DEFAULT_OUT`
guard, proving the hardening (R9).

**iter 3 (85614c3894, U-LORA-CORPUS-ASSEMBLE):** closed the real DORMANCY found in
reconnaissance -- the chain vault -> datasets -> `fleet-training-corpus-inventory.json`
DEAD-ENDED (grep proved nothing consumed the manifest to assemble a training set).
`scripts/assemble-fleet-lora-corpus.mjs` is that consumer: reads the manifest, unions
every PRESENT `kind:'lora-training-jsonl'` source into ONE deduped (global, NUL-keyed),
trust-weighted, staged corpus -> `state/shared/lora/fleet-lora-combined.jsonl` + stats
sidecar. Advisory/synthesis @0.5, verified @1.0; each row carries {weight,source,advisory}
(R7 -- never blended). `training_ready` at a >=1000 row floor (mirrors export-ledger-lora's
staging contract; the GPU fine-tune is the explicit downstream operator step). LIVE: 2
present sources -> 746 rows (245 verified + 501 advisory), 0 dup/invalid, training_ready
false (cam-master missing on this host; present would clear it). 13/13 hermetic tests.
**Composes (not duplicates) the existing `scripts/lora-dataset-builder.mjs`
(U-LORA-MASTER-CORPUS-TRAINER) -- it reads ONE jsonl -> stratified train/val split; the
assembler produces that one jsonl. So the FULL chain is now live: vault -> dataset
(--source feedback|galaxy) -> manifest -> assembler -> combined corpus -> splitter ->
(operator GPU fine-tune).**

**iters 4-5 (same session) -- closed every deferred finding + added per-galaxy slicing:**
- 7d3879f21b U-LORA-ASSEMBLE-HARDEN: explicit `advisory:true/false` manifest field is now
  AUTHORITATIVE in sourceWeight (closes C-P2 -- free-text description no longer down-weights;
  fallback heuristic narrowed to the controlled id); `deriveStatsPath` so the stats sidecar
  follows a custom `--out` (closes A-P1). 16/16.
- cd9f80faf8 U-LORA-PER-GALAXY-TRACK: galaxy carried as a STRUCTURED field through dataset ->
  assembler -> combined corpus (+ byGalaxy/galaxiesCovered). PAYOFF (zero new splitter code):
  the existing `lora-dataset-builder.mjs --track-field galaxy` now yields per-galaxy train/val
  splits -> per-galaxy LoRA adapters (the self-owned per-domain AI-stack doctrine). LIVE PROVEN:
  groupByTrack(combined, galaxy) = 35 tracks (34 galaxies + _unclassified=245 cross-cutting
  feedback). Feedback rows carry NO galaxy by design (shared track). 18/18, full 3-of-3 PASS.
- 99439c85f6 U-LORA-ROWKEY-NUL-FIX: rowKey's dedup separator was a literal NUL byte (U+0000) ->
  the .mjs was git-BINARY (no reviewable diffs; flagged by 2 reviewers). Replaced with
  collision-PROOF pure-ASCII `JSON.stringify([instruction,output])`. Committed blob now 0 NUL.
  LESSON: a stray NUL in source turns the file git-binary even though node parses it + tests
  pass -- check `git diff --numstat` shows line counts not `-  -`.
- STILL DEFERRED (judged not worth a unit): P3 MIN_TRAINING_ROWS=1000 DRY vs export-ledger-lora
  (independent staging artifacts -- sharing would couple them); P3 V8 512MB cap latent (<1MB sources).
  OPERATOR NOTE (rev C): groupByTrack PARTITIONS, so per-galaxy adapters do NOT include the shared
  feedback doctrine (it trains as its own _unclassified adapter) -- if each galaxy adapter should
  also see cross-cutting doctrine, that needs a separate merge/duplicate step.

FULL CHAIN now live+hardened across all 34 galaxies: vault -> vault-to-lora-dataset
(--source feedback|galaxy) -> manifest -> assemble-fleet-lora-corpus (746 rows, weighted, deduped,
galaxy-tagged) -> lora-dataset-builder (--track-field galaxy) -> per-galaxy adapters -> operator GPU fine-tune.

See [[reference_vault_to_ai_feeders_2026_06_09]] (kilo's base + the GNN ref-pool feeder),
[[reference_india_lora_stack_inventory_2026_05_28]] (the ~95 DB-driven LoRA engines this
doctrine/synthesis corpus complements), [[feedback_multiseed_before_auroc_claim]].
