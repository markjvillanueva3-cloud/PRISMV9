---
name: reference_u_link_audit_viz_roost_2026_05_21
description: "U-LINK-AUDIT-VIZ-ROOST (echo /goal synergy iter 6) — /system-viz roost completes the iter-4 producer + iter-5 consumer pair; broken-link aggregation by link not (link,from) fixes stale-node accumulation; reverse-misattribution commit lesson"
aliases: reference_u_link_audit_viz_roost_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.238Z
---


**Iter 6 of the /goal synergize loop in echo slot (2026-05-21, session 88b0032d).** Closes the visual surface for the iter-4 producer + iter-5 consumer pair: every weekly run of `scripts/knowledge-link-audit.mjs` now feeds into `/system-viz` as a ghost roost (`ghost.link_audit_integrity`) under `ghost.planned_features`, plus one `broken-link` child per top-N unique broken `[[name]]` target. Shipped:

- `scripts/generate-link-audit-features.mjs` (174 LOC) — pure generator + I/O shell
- `scripts/generate-link-audit-features.test.mjs` (246 LOC, 18/18 PASS incl real-data E2E against the live 680KB producer artifact)
- `scripts/regen-viz.mjs` — registered in `FAST[]` between `misc-tasks-features` and `consolidate-roadmaps`
- `scripts/merge-augmentations.mjs` — 3 splice points (loadOptional, versions, merge cluster) mirroring the canonical bridge-synergy/priority-queue/misc-tasks pattern

First real generator run: **1 roost + 50 unique-link children**, aggregated from 4136 raw broken entries across 24,795 markdown files (0 skipped post-aggregation). Cap = 200 hard-ceiling; default = 50.

**Real content landed in commit `ed95884a3c` (corrective).** The preceding `b65187d687` shipped under MY commit message but contained a peer's stale `state/shared/specs/ZULU-OMNISCIENT-MS0-PLAN.md` due to the unstage-guard auto-staging a foreign workspace file during peer churn. See "Reverse-misattribution" below.

## Per-file 2-of-2 scrutiny — cross-validated 3 P1s

Both Reviewer A (`code-analyzer`) and Reviewer B (`reviewer`) independently flagged the same 3 P1s, plus B caught 1 more that A missed:

**P1-1 (B) — Stale-node accumulation.** Original `brokenLinkNodeId(link, from)` hashed BOTH the link AND the source-file path. When a wiki entry is renamed (changes `from`), the same broken `[[link]]` produces a NEW node id while the old one orphans forever. At 4136 × weekly × renames, multi-thousand stale ghosts would accumulate over months. **Fix:** the broken-link identity is now the LINK ONLY. `brokenLinkNodeId(link)` takes one arg. Multiple source files referencing the same broken link aggregate into ONE node whose `info` lists up to MAX_SOURCES_PER_NODE=5 sources. The merge-augmentations dedupe still works correctly because the id is stable across regens.

**P1-2 (B) — Unicode-only link collision.** `[[αβγ]]` and `[[δεζ]]` both normalize to `linkPart="x"` after the ASCII-only regex. Pre-fix, the `from_hash` accidentally disambiguated them; now that we don't use `from`, distinct unicode-only links must still get distinct ids. **Fix:** the FNV-1a suffix is now computed over the ORIGINAL link string (not the normalized `linkPart`). Two distinct unicode-only links still produce distinct ids via the FNV-of-original suffix.

**P2-4 (B) — Literal `[[link]]` in graph labels.** The audit producer scans markdown files for `[[name]]` tokens. If `/system-viz` is ever rendered back to markdown for any export path, the literal wikilink labels would re-pollute the next audit, inflating broken-link counts with synthetic graph-node entries. **Fix:** labels now use `BROKEN: <link>` prefix; roost `info` describes the producer as "wiki-style tokens" rather than `[[name]]` syntax. Anti-regression test pins this.

**P2-5 (B) — Empty-env=0 footgun.** `PRISM_LINK_AUDIT_VIZ_TOPN=` (no value) → `Number("")=0` → `Number.isFinite(0)=true` → silent zero children. Same env=0 class as the iter-5 P1-1. **Fix:** explicit `process.env.X !== undefined && envStr !== ""` guard before `Number()`.

Reviewer A also flagged P2-1/P2-2 (negative env, fractional env) but both are convention-conforming with the canonical sibling and defer-OK.

## Reverse-misattribution (NEW failure mode this iter)

Commit `b65187d687` landed with MY commit message but **peer's stale `state/shared/specs/ZULU-OMNISCIENT-MS0-PLAN.md`** as the only file. Reconstruction: under heavy fleet contention (16+ concurrent chats), the `git-add-lane-guard` Stop hook saw a foreign file staged in my workspace (peer's residue from a prior pending claim that never reached commit), auto-unstaged 3 of MY files ("⚠ failed to unstage 3 (left staged — guard may still block)"), and let the peer's file through. `git commit` then ran against the wrong staged set.

**Lesson (NEW class, distinct from iter-4):** iter-4 was "my files swept into peer commit message" (forward-misattribution). Iter-6 is "peer's file swept into my commit message" (reverse-misattribution). Both are shared-tree git-add-window race conditions, but reverse is worse because the commit message LOOKS correct so audit-by-banner won't catch it. **Always verify with `git show --stat <sha>` after commit success** — banner matching content is not a given under multi-chat contention.

Recovery: per CLAUDE.md "always new commits, never amend", shipped a corrective `ed95884a3c` carrying the actual iter-6 content. Both commits are on HEAD; the preceding `b65187d687` is harmless (peer's plan file landed under my banner — a curiosity, not a regression).

## What this completes

**7 of 8** /goal synergize surfaces actively flowing data via the Stop-hook + SessionStart + system-viz substrate:
1. **handoff-prune** (iter 0, `7fcbe2f720`)
2. **zulu-awareness producer** (iter 1, `4e7d2be81b`)
3. **capability-map consumer** (iter 2, `896c63847f`)
4. **knowledge-link-audit producer** (iter 4, `9416042d56` misattributed to kilo)
5. **knowledge-link-audit consumer** (iter 5, `f4f6ca4bc7` clean)
6. **knowledge-link-audit VIZ roost** (iter 6, `ed95884a3c` corrective after `b65187d687` reverse-misattribution)

Producer → consumer → visual surface = the canonical 3-tier loop for a self-operating substrate. The iter-4/5/6 trio is the template for future surfaces.

Remaining iters 7-20: NN/GNN feedback consumer (avoid lane `claude-dbba2d72`), prism-ai ↔ obsidian-brain cross-feed, wiki ⇄ tribal cross-reference completeness. Avoid ZULU-HERMES-GAPS orchestrator sweep.

## Apply-in-future

- **Aggregate identity at the LINK not the (LINK, SOURCE) pair** when sources are interchangeable evidence. Adding `from_hash` to a node id is a stale-accumulation trap when the source field can rename. Same shape: any (key, evidence) pair where the key is the identity.
- **Verify with `git show --stat <sha>` after every commit success** — reverse-misattribution is invisible to a banner-only audit. Five seconds of verification beats a multi-week debugging session.
- **Cross-reviewer same-finding is the strong signal** the 2-of-2 doctrine is designed to surface. Three independent P1s caught in this iter prove the doctrine is load-bearing.
- **Producer / Consumer / Viz triplet** is the canonical pattern for a self-operating ecosystem surface. Single-tier (just producer) accumulates silent drift; two-tier (producer + consumer) surfaces in text but not visual; three-tier (producer + consumer + viz) is the minimum for "the operator can see it without typing a query".
