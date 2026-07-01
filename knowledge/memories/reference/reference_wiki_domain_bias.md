---
name: reference-wiki-domain-bias
description: "Bias wiki-precheck-inject's BM25 ranking toward the active chat-slot's milestone domain so a chat on SYSTEM-VIZ-BRAIN-MS0 sees system-viz wiki entries ranked above generic matches."
aliases: reference_wiki_domain_bias
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.264Z
---


# wiki-domain-bias — milestone-domain ranking boost

User directive (SYSTEM-VIZ-BRAIN-MS0): the `wiki-precheck-inject` UserPromptSubmit injector finds top-K matches via BM25 over `knowledge/wiki/index.md` + `_leaf-index.jsonl`. Without domain context, a chat working on SYSTEM-VIZ-BRAIN-MS0 sees the SAME top-K as a chat working on lathe physics. This unit biases the ranking toward the active milestone.

## Files

- `.claude/helpers/wiki-domain-bias.mjs` (3 exports: `getDomainTokens({chatId})`, `domainBoostFor(entry, domainTokens)`, `chatIdFromInput(input)`)
- `.claude/hooks/wiki-precheck-inject.mjs` (import + 12-line surgical insert after candidate collection, before sort)

## Domain token resolution (priority order)

1. **Active slot** in `state/shared/chat-slots.json` matching `chatId` → tokens from `topic` + `branch` (stripped of `work/` prefix)
2. **CURRENT_POSITION.md** H1 (milestone heading) → merged in
3. **NO cross-contamination**: if `chatId` is provided but no slot matches, returns `[]` (does NOT fall back to a peer slot's domain — silent peer-domain leak is worse than no bias)

Tokens are decamel'd then split on non-alphanumeric, filtered against a stopword list (`ms0..ms9`, `prism`, `work`, `the`, `live`, `main`, etc., 3+ char minimum).

## Boost formula (capped to preserve curated tier)

- `BOOST_PER_HIT = 1.5` for each unique domain token in `entry.toks`
- `BOOST_PATH_WEIGHT = 0.5` for matches only on `entry.source` / `entry.category` (not double-counted with `entry.toks`)
- `MAX_DOMAIN_BOOST = 4.5` hard cap — keeps domain bias BELOW the curated `boost_keywords` tier (`BOOST_BASE_SCORE=12` in wiki-precheck-inject) so a deliberate hand-curation always beats coincidental domain overlap

## Knobs

- `PRISM_WIKI_DOMAIN_BIAS_DISABLE=1` — returns `[]` from `getDomainTokens` → zero boost applied
- `PRISM_CHAT_SLOTS_FILE` / `PRISM_CURRENT_POSITION` — path overrides for hermetic tests

## Tests

`wiki-domain-bias.test.mjs` — 26 hermetic node:test cases (fixtures in tmpdir, env-overrides redirect helpers). All pass. Covers: tokenize edge cases (hyphens, camelCase, paths, extensions), malformed slot files, null entries, empty domains, MAX_DOMAIN_BOOST cap, cross-contamination safety, stopword filtering.

Uses plain `node:test` because the vitest harness for `.claude/helpers/` has a pre-existing transform bug (same pattern as [[reference_fleet_reaper|fleet-reaper]].test.mjs).

## Related

- [[reference_master_index_surface]] — parallel UserPromptSubmit precheck (master-index-precheck-inject)
- [[reference_awareness_stack]] — broader search-first context
- [[feedback_system_viz_first_audit]] — sister doctrine ([[reference_viz_first_redirect_glob]] enforces it at tool level)
- [[reference_viz_first_redirect_glob]] — same milestone, complementary surface (PreToolUse instead of UserPromptSubmit)
