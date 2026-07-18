---
name: reference_sierra_tribal_promoter_r15_void_2026_06_16
description: "Overnight loop tick (2026-06-16): the R15 apply-to-all hypothesis -- 'promote-tribal-to-wiki.mjs has the same junk-promotion gap as promote-memory-to-wiki.mjs, wire the 4-class nonPromotableReason into it' -- is VOID. Verified: the tribal corpus (knowledge/tribal/, 3920 tips) carries ZERO of the 4 memory-junk signals (node_kind 0, run_log 0, deadbeef 0, advisoryOnly 0, mustHumanVerify 0 files). Tribal tips have a different schema (id/title/source/confidence/category/tags) and the promoter gates on confidence>=90 -- an appropriate, different gate. Wiring nonPromotableReason there would be pure dead code. The committable vault-ops build queue is genuinely EXHAUSTED. Do NOT re-investigate this."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.201Z
aliases: reference_sierra_tribal_promoter_r15_void_2026_06_16
---


# Tribal-promoter R15 unit is VOID; vault-ops queue exhausted (2026-06-16, slot:sierra, overnight loop)

The overnight cron loop's primary unit was an R15 "apply-to-all" hypothesis: since
`promote-memory-to-wiki.mjs` got a 4-class `nonPromotableReason` junk filter
(node-pointer / unverified-advisory / run-log / test-fixture), the sibling
`promote-tribal-to-wiki.mjs` (which had NO junk filter) supposedly had the same gap.

## VERIFIED VOID (verify-then-build, R12)
- `promote-tribal-to-wiki.mjs` reads `knowledge/tribal/*.md` (3920 tips), target
  `knowledge/wiki/code-tribal/`, gate = `shouldPromote(fm) => confidence >= 90`.
- Tribal frontmatter schema is ENTIRELY different from memory: `id, title, source,
  confidence(0-100), category, tags, _source, indexed_at`. No `node_kind`, no `run_log`,
  no `provenance.sessionId`, no `advisoryOnly`/`mustHumanVerify`.
- `grep` of the full 3920-tip corpus for all 4 junk signals: **0 files each.** The memory
  junk classes are memory-schema-specific and CANNOT fire on tribal data.
- Therefore wiring `nonPromotableReason` into the tribal promoter = pure DEAD CODE, and
  extracting a shared lib for a single real consumer (the memory promoter) is pointless.
  Per the directive "add ONLY relevant filtering" -> NOT BUILT.

## State: committable vault-ops build queue EXHAUSTED
- Memory promote-gate: 4-class hardened + clean (54->5 genuine; 5 promoted to wiki on-disk).
- Tribal promoter: NOT vulnerable (different schema + confidence>=90 gate). R15 void.
- inbox/mistakes daily writer: dirs are EMPTY (0 files) -> nothing to process.
- DailyFlashReport email stub: out of sierra's lane + needs SMTP/credentials/unseen lib.
- dreams-hub ref de-inflation: debatable POLICY change (would reduce genuine promotions;
  current candidates have 0 dream refs) -- not a clear win, dropped.
- Maintenance (this tick): memory promoter dry-run WOULD PROMOTE=0, 0 junk -> vault current.

## Loop disposition
Switched the overnight loop from the 30-min R15-build cron to a lighter ~3h
maintenance-only cron: re-check the memory promote gate; --apply genuine new candidates
as they age in (freeze-safe; gate clean); harden if a NEW junk class appears; else report
clean. Do NOT re-attempt the tribal R15 unit (void). Sibling:
[[reference_sierra_vault_promote_gate_4class_2026_06_16]].
