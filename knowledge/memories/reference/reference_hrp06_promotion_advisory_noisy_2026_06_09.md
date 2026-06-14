---
name: reference_hrp06_promotion_advisory_noisy_2026_06_09
description: "The U-HRP06 'Memory→wiki promotion suggestions' Stop advisory is NOISY — it re-suggests memories that ALREADY have a dedicated wiki entry, because its reranker only sees the ~17.1%-embedded wiki corpus; un-embedded dedicated entries are invisible, so it shows tangential 'nearest wiki' matches and the memory looks orphaned. Don't blind-promote its candidates: absence-check the wiki dir by name/title FIRST. Verified: it suggested reference_zulu_awareness_ms0 though knowledge/wiki/architecture/zulu-awareness-pipeline.md already exists."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.148Z
aliases: reference_hrp06_promotion_advisory_noisy_2026_06_09
---


**2026-06-09 (slot golf, synergy /goal — [[feedback_golf_owns_reaper|fleet-hygiene]]; memory→wiki promotion cadence).**

**FINDING — the U-HRP06 "💡 Memory→wiki promotion suggestions" Stop advisory is NOISY.** It surfaces ~25 candidate memories every Stop with a "Nearest wiki (rerank)" list and "consider merging / promoting (Advisory only)." But a meaningful fraction of its candidates **already have a dedicated wiki entry** — so promoting them blindly creates a DUPLICATE (R8 dup-block). The same xray/zulu/youtube candidates re-appear on every single fire, which is the tell.

**ROOT CAUSE (verified):** the advisory's reranker scores each memory against the **embedded** wiki corpus only. Per the SessionStart Wiki↔Tribal coverage banner, only **17.1%** of wiki files are tribal-embedded (32,630 of 39,345 lack embedding). So a memory's OWN dedicated wiki entry, if it is among the 82.9% un-embedded, is **invisible to the reranker** → it returns tangential "nearest" entries (e.g. `awareness-readiness` @0.62) instead of the real one → the memory looks orphaned when it is not.

**PROOF:** the advisory suggested promoting `reference_zulu_awareness_ms0_2026_05_20` with nearest wiki `brain-recall-synergy-ms0`/`awareness-readiness` (~0.62) — but `knowledge/wiki/architecture/zulu-awareness-pipeline.md` **already exists** (it is even listed in that memory's own "What shipped" table). The reranker never surfaced it.

**HOW TO USE THE ADVISORY CORRECTLY (until fixed):** before promoting any U-HRP06 candidate, **absence-check the wiki directory by name/topic** — `ls knowledge/wiki/*/<topic>*.md` (and check the memory body for a "Wiki entry" row). Only promote if genuinely absent. The `reference_tribal_by_domain_inject` → `knowledge/wiki/architecture/tribal-by-domain-inject.md` promotion this session (commit U-WIKI-PROMOTE-TRIBAL-DOMAIN-INJECT) passed that check (no prior entry); `zulu-awareness` failed it (already covered) and was correctly skipped.

**THE REAL FIX (golf-lane unit for a fresh chat, NOT done here — budget):** two options, do the cheap one first —
1. **Cheap:** make the U-HRP06 generator absence-check each candidate against the wiki dir (by slug/title match) and DROP already-covered ones from the suggestion list. Makes every future advisory accurate regardless of embedding coverage.
2. **Root:** raise wiki tribal-embedding coverage from 17.1% toward 100% (re-embed the wiki corpus) so the reranker can see all entries — but that is a long batch job + touches the tribal-embed-index that is itself mid-rebuild ([[reference_tribal_index_v8_string_cap_2026_06_08]]).

**READY FIX (designed + verified, NOT applied — the file is slot:alpha's active surface).** The generator is `.claude/hooks/stop-memory-to-wiki-suggest.mjs`. I did NOT edit it: alpha committed `60805c36c6` (U-OBS-MEMWIKI-RERANK, OBSIDIAN-VAULT-SYNERGY) to it at 02:52 and it was modified again (uncommitted) at 03:12 — alpha's active file, golf must not collide (lane discipline / never-commit-peer-claimed). **For alpha (or whoever owns it next) — purely ADDITIVE, does not touch the nomic-rerank block:**

1. Add two pure exports after `extractMemorySummary`:
   - `memorySlugTokens(name)` — strip `^(reference|feedback|project)[_-]` + trailing `[_-]\d{4}[_-]\d{2}[_-]\d{2}$`, split on `[^a-z0-9]+`, keep tokens len≥3 that aren't pure-numeric / `^ms\d+$` / `^v\d+$` / a small stop-set `{the,and,for,with,via,fix,wire,wired,2026,2025}`. Returns a Set.
   - `memoryHasExistingWikiEntry(memoryName, wikiTitles, minSharedTokens=2)` — `memToks = memorySlugTokens(memoryName)`; if `memToks.size < minSharedTokens` return false; for each wiki title, count shared distinctive tokens (via `memorySlugTokens(title)`), return true on ≥minSharedTokens.
2. In `suggestWikiPromotions`, add param `coveredMinTokens = 2`; at the TOP of the `for (const mem of newMemories)` loop: `if (coveredMinTokens > 0 && memoryHasExistingWikiEntry(mem.name, wikiTitles, coveredMinTokens)) continue;` (`wikiTitles` is already computed at line ~123).
3. In `main`, read `const coveredMinTokens = Number(process.env.PRISM_MEM_TO_WIKI_COVERED_MIN_TOKENS ?? 2)` and pass it to `suggestWikiPromotions`.

**Verified against the 2 live cases:** `reference_zulu_awareness_ms0` → memToks {zulu,awareness} (ms0 excluded) shares 2 with wiki `zulu-awareness-pipeline` {zulu,awareness,pipeline} ⇒ SKIPPED (correct — already covered). `reference_tribal_by_domain_inject` at promo time → memToks {tribal,domain,inject}, no wiki shared ≥2 ⇒ SUGGESTED (correct — was a real orphan); after its promotion the new `tribal-by-domain-inject` entry shares 3 ⇒ future-SKIPPED. Conservative threshold (2 distinctive tokens) avoids over-suppressing genuine orphans (R12 — the advisory's value is surfacing orphans). Add a `node:test` for both helpers + a suggestWikiPromotions skip case.

Related: [[feedback_always_update_wiki_on_bug_finding]], [[reference_tribal_index_v8_string_cap_2026_06_08]], [[feedback_conflict_fork_rule]].
