---
name: reference_alpha_offload_stats_bump_dedup_2026_06_24
description: "U-OFFLOAD-STATS-BUMP-DEDUP -- one shared atomic-RMW envelope (scripts/lib/offload-stats-bump.mjs) consolidated 4 byte-identical offload-stats writers (slot:alpha, 2026-06-24, commit 7d6f314990)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.470Z
aliases: reference_alpha_offload_stats_bump_dedup_2026_06_24
---


**U-OFFLOAD-STATS-BUMP-DEDUP** (slot:alpha, 2026-06-24, commit `7d6f314990`, branch cad-fusion-live-ms0).

The 5 hardening units this session lit + made-measurable the ollama/hermes offload substrate but left FOUR byte-identical copies of the fail-safe atomic-RMW stats-write envelope (existsSync-guard -> parse-in-try/catch -> typeof-guard -> mutate-in-place -> lastUpdated -> `${path}.${pid}.${ts}.tmp` + renameSync -> never-throw). A drift in any copy silently mislabels utilization telemetry (the class the ask-hermes ~46x under-count fix uncovered).

**Extracted** `scripts/lib/offload-stats-bump.mjs`:
- `atomicOffloadStatsRMW(statsPath, mutate)` -- the shared envelope; runs caller's `mutate(stats)` in place; a throwing mutate is caught by the OUTER try so the partial in-memory mutation is discarded (no write) and returns false. Faithful to all 4 originals.
- `ensureOffloadBucket(stats, key, {withByMode})` -- falsy-only re-init `{fired,offloaded,kept,suggested,tokensSaved}` (+byMode); an EXISTING bucket is never reset (accumulation preserved).
- `clampSaved(x)` -- `Math.max(0, Math.round(Number(x)||0))`.

**Migrated 4 writers to thin wrappers** (each keeps its OWN mutate -- R7 surface-don't-fork): `recordUsage` (ask-hermes.mjs, the original, void), `recordTieredUsage` (verified-offload-tiered.mjs), `recordFileDigestOffload` (ollama-file-digest.mjs), `recordLocalOffload` (ollama-offload.mjs). Each migrated file's `node:fs` import was trimmed to only still-used symbols (ask-hermes + verified-offload-tiered dropped node:fs entirely; ollama-file-digest + ollama-offload kept `{readFileSync, statSync}`).

**Proof:** 150 tests green (12 new + 21+20+28+69 unchanged = behavior-preserving). Per-file 2-arm scrutiny PASS -- arm B empirically confirmed the new test catches a write-before-mutate regression (injected -> 1 fail). +258/-85 net lines.

**SCOPE (honest, R12):** the pre-edit FOLLOW-UP comment named "~5 copies" incl `updateOffloadStats` (`.claude/hooks/ollama-route-pretooluse.mjs`) + a `bumpStats` family (5 hook files). Both reviewers confirmed those are NOT byte-identical -- decision-branching + decay-gate-coupled, different bucket keys -- so they are a SEPARATE follow-up unit, not a silently-dropped dup. The shared envelope CAN still serve them (atomic part shared, decision logic in the mutate closure).

**R15 APPLY-TO-ALL SHIPPED** as `U-ADVISORY-BUMPSTATS-DEDUP` (commit `1f927b3c1b`): the 4 advisory-hook `bumpStats` (large-read-digest / nav-rerank / wiki-read-offload / ollama-nav-enforce) ARE byte-identical never-create envelopes (only the mutate differs: fired++/suggested++/silentSuggestions++) -> migrated to `atomicOffloadStatsRMW` + `ensureOffloadBucket` via `../../scripts/lib/offload-stats-bump.mjs` (proven cross-tree import, 30 hooks already use it). 66 hook tests green (15+23+20+8). `updateOffloadStats` (ollama-route-pretooluse) stays EXCLUDED -- it `mkdirSync`-CREATES the file, a contract the never-create envelope must not adopt. Net: 8 of 9 offload-stats writers now on ONE tested envelope; the 9th honestly excluded. Gotcha caught live: a partial-function Edit (anchoring mid-body) left a dangling `try {` -> SyntaxError, caught by the hook test gate + fixed -- always replace the WHOLE function when swapping a try/catch body for an arrow-callback.

**Lesson:** a fail-safe atomic-RMW envelope replicated across N writers is a real correctness hazard (one drift mislabels telemetry); extract the ENVELOPE, keep each caller's mutate inline, and prove behavior-preservation by re-running every migrated caller's EXISTING suite (stronger than agent review for a refactor). Related: [[reference_alpha_hermes_verified_tier_2026_06_24]].

## Follow-on units this session (3 + 4)

- **U-OFFLOAD-STATS-BUMP-WIKI** (`6c2b3c8476`): the post-ship auto-distiller wrote a THIN STUB wiki entry (commit subject x3 + file list, placeholder verification). Enriched it into a reusable-asset doc (envelope API + adoption pattern + the never-create-vs-mkdirSync-create contract + the partial-function-edit lesson) so the fleet ADOPTS the envelope instead of re-forking. Lesson: auto-distilled wiki entries are stubs -- READ + enrich them (R12 existence != content).
- **U-OFFLOAD-STATS-BUMP-HARDEN** (`152586c025`): +2 adversarial tests pinning `ensureOffloadBucket`'s corrupt-non-object-`byHook` recovery (the documented hardening vs the advisory originals' falsy-only `j.byHook = j.byHook || {}`) + the full RMW round-trip preserving unrelated top-level fields on recovery. 14/14. Closed the R16 gap.

## TAKE-RATE CROSS-BUCKET -- measurement slice SHIPPED; decision-wiring still deferred

**SHIPPED `b5fa10a632` (U-ADVISORY-DECAY-XBUCKET):** the MEASUREMENT half -- pure `crossBucketTakeRate` + `CONVERSION_BUCKET_MAP` (large-read-digest->ollama-file-digest, nav-rerank->ollama-nav-rerank, ollama-nav-enforce->ollama-prism-bridge; wiki-read omitted=uninstrumented) + additive `decayReport` fields (`crossBucketTakeRate`/`crossBucketKey`) + an `xtake` CLI column in advisory-decay-report.mjs. `decayDecision`/`classify` UNTOUCHED (observability only; 18 original tests prove the live mute path byte-unchanged). LIVE: large-read-digest 0.0% own-bucket -> 0.8% TRUE cross-bucket (1/118). 26 tests.

**STILL DEFERRED (the DECISION half) -- precise spec:**

`scripts/lib/advisory-decay.mjs` `classify(stat)` computes take-rate = `offloaded/suggested` **within ONE byHook bucket**, and `decayDecision` is wired into 4 advisory hooks (large-read-digest etc.). THE GAP: for a PURE-ADVISORY hook, its OWN bucket's `offloaded` is ALWAYS 0 (an advisory only `suggested++`, never `offloaded++`); the real conversion lands in a DIFFERENT bucket -- e.g. large-read-digest-advisory suggests `ollama-file-digest.mjs`, whose conversions my `recordFileDigestOffload` writes to `byHook["ollama-file-digest"].offloaded`. So the gate judges every pure-advisory on its own always-0 signal -> always classified `noise` after `minInjections`.

FIX = a static advisory->conversion-bucket map (large-read-digest->ollama-file-digest, nav-rerank->ollama-nav-rerank, wiki-read-offload->its route-to-obsidian target, ollama-nav-enforce->ollama-prism-bridge) + `classify`/`decayDecision` read the MAPPED bucket's `offloaded` as the taken-signal when judging an advisory.

WHY DEFERRED (evidence, not hand-waving): (1) touches the VERIFIED-WORKING decay gate (see [[reference_large_read_digest_advisory_muted_working_2026_06_20]]) wired into 4 live hooks -> contract change needs thorough tests + re-validation of every hook's mute status; (2) LOW current value -- for large-read-digest the own-bucket reading (0%) and the true cross-bucket reading (1/70 = 1.4%) BOTH fall under the 5% noise threshold (same verdict); the fix only changes an outcome if some advisory's cross-bucket take-rate crosses 5%, which none currently do; (3) build-it-whole work, unsafe to rush near the 5h hard limit. Build in a fresh window. Sibling deferred: `tallyUsage` local 'ollama' source (low-value latent -- no caller emits source "ollama").
