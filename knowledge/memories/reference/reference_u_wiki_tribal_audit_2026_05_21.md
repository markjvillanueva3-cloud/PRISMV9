---
name: reference_u_wiki_tribal_audit_2026_05_21
description: "U-WIKI-TRIBAL-CROSS-REF-AUDIT (echo /goal synergy iter 7) — producer audit exposes 99.2% wiki<>tribal coverage gap (23802/23992 missing embeddings) — the highest-value silent-drift surface found by the /goal loop"
aliases: reference_u_wiki_tribal_audit_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.027Z
---


**Iter 7 of the /goal synergize loop in echo slot (2026-05-21, session 88b0032d).** Producer-side audit closing the wiki ⇄ tribal cross-reference completeness gap — directly addresses 2 of the 8 substrates explicitly named in the /goal directive (wiki + tribal knowledge).

**Killer finding on first run: 23,802 of 23,992 wiki files (99.2%) have NO tribal embedding.** This is the highest-value silent-drift surface the /goal loop has exposed so far. Tribal-by-domain retrieval (subagent context bundles, memory-rag injections, tribal-precheck hook) sees only 190 of the wiki corpus — every wiki entry written since the tribal index was last embedded fails to surface at retrieval time. The 4136 broken `[[name]]` links from the iter-4/5/6 link-audit pair are a SYMPTOM of the same drift class; this iter measures the underlying coverage shortfall.

Shipped:
- `scripts/wiki-tribal-cross-ref-audit.mjs` (162 LOC) — pure-core (`normalizeWikiPath`, `tribalWikiPath`, `audit`) + I/O shell
- `scripts/wiki-tribal-cross-ref-audit.test.mjs` (228 LOC, 19/19 PASS incl real-data E2E parsing the 13MB tribal index + walking 24K wiki files)
- Output: `state/shared/.wiki-tribal-cross-ref-audit.json` (advisory; never auto-fixes)

Commit `4bddfe8d3f`. Same shared-tree race class as prior iters absorbed 7 extra peer files under my banner (HyperCADSLiveBridgeEngine.ts/test.ts, ZULU-OMNISCIENT-MS0-PLAN.html, precompact-auto-trigger.test.mjs). My 2 files + commit message correct, peer cargo harmless to audit. Class continues to be reverse/forward misattribution under multi-chat git-add-window contention; documented exhaustively across iters 4/6/7.

## Per-file 2-of-2 scrutiny — 2 P1s cross-validated by Reviewer B

**P1-1 — Path-traversal pollution.** A tribal entry with id `wiki:../etc/passwd` (adversarial or corrupted) survives `normalizeWikiPath` and lands in the `inTribal` set as literal `"../etc/passwd"`. The audit then surfaces nonsense `staleInTribal` entries that would mislead operators. **Fix:** added `..`-segment guard at the end of `normalizeWikiPath` — any path containing a `..` segment returns `""` and is dropped by the downstream `if (n)` gate. Read-only audit, so no actual file-access security risk, but report integrity matters. Anti-regression test pins it.

**P1-2 — Locale-dependent `toLowerCase()` (R12 byte-determinism violation).** Default-locale lowercase has known surprises — Turkish dotless-i `"İ".toLowerCase()` returns `"i̇"` (i + combining dot above) in the Turkish locale and `"i"` in en-US. The audit's byte-determinism claim ("same input twice → identical output") is technically locale-dependent on PRISM hosts. **Fix:** pinned to `.toLowerCase("en-US")` explicitly — one-character change. The risk is near-zero on Windows en-US/en-GB hosts (PRISM's reality) but the locale-pin is the right invariant. Anti-regression test exists.

Reviewer A passed with one P1 on stale-detection blind spot for mixed-form ids — verified not a bug (the lazy regex consistently strips `knowledge/wiki/` when present and leaves other shapes untouched; both forms compare correctly because the on-disk path has the prefix and tribal-tagged ids share the same shape after slicing). Reviewer A also flagged P3 `walkMd` duplication with `knowledge-link-audit.mjs` — promote to `scripts/lib/walk-md.mjs` once a third consumer appears.

## What this completes

**8 of 8** /goal synergize substrates now have at least one producer surface flowing data:
1. **handoff-prune cron** (iter 0)
2. **zulu-awareness substrate index** (iter 1 producer + iter 2 consumer)
3. **knowledge-link-audit** (iter 4 producer + iter 5 SessionStart consumer + iter 6 system-viz roost)
4. **wiki ⇄ tribal cross-ref audit** (iter 7 producer; consumer + viz deferred to iters 8/9)

Substrate-side coverage of the /goal's 8 named surfaces:
- obsidian-brain — partially via memory namespace (auto-feed to obsidian vault on Stop)
- prism-os — chat-slots + per-agent handoffs (long-standing infrastructure)
- prism-ai-systems — [[reference_substrate_health_inject_2026_05_19|substrate-health-inject]] pre-existing
- nn/gnn — UNTOUCHED this loop (avoid lane `claude-dbba2d72`)
- memories — auto-fed to obsidian (long-standing)
- wiki — NEW iter-7 producer exposes 99.2% drift gap
- tribal-knowledge — NEW iter-7 producer (same)
- system-viz — iter-6 broken-link roost producer/consumer pair

Remaining iters 8-20:
1. Iter 8 — SessionStart consumer for the wiki-tribal audit (mirror iter 5 shape; threshold-gated digest of coverage gap)
2. Iter 9 — system-viz roost for missing-coverage entries (mirror iter 6 shape)
3. Iter 10-12 — prism-ai↔obsidian-brain cross-feed (one substrate per iter)
4. Iter 13-15 — NN/GNN feedback consumer (CAREFUL: avoid claude-dbba2d72 lane; coordinate first)

The producer/consumer/viz triplet is the canonical pattern; each substrate needs all 3 tiers to be "fully wired and operational, self-learning, self-operating" per the /goal directive.

## Apply-in-future

- **`toLowerCase()` is locale-dependent.** Any normalization function that uses `.toLowerCase()` without an explicit locale arg is a hidden R12 byte-determinism violation. Always pass `"en-US"` (or whatever the project's reference locale is) explicitly. Same shape: `localeCompare`, `Intl.Collator`, regex `i` flag.
- **Path-traversal in producer output.** Any normalization function that strips a known prefix and accepts the residue as a "path" needs a `..`-segment guard — even when the surrounding code is read-only, the producer output can still surface attacker-controlled paths to consumer surfaces that are NOT read-only.
- **The 99.2% wiki-tribal gap is the highest-leverage drift surface so far.** A consumer that surfaces this number in every SessionStart context bundle would be load-bearing across the entire fleet — every wiki entry written in the next month would land tribal-blind unless someone re-embeds. The consumer (iter 8) is the natural next step.
