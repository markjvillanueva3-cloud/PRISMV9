---
name: reference_link_audit_phantom_filter_2026_06_09
description: "Vault-value win (R4-C1 from ultracode discovery w3qho9bc3): knowledge-link-audit counted path/glob fragments ([[src/foo.ts]], [[scripts/*.mjs]]) as broken wikilinks — 1448-1456 false positives (15.5% of the broken count). Added pure isPhantomLinkTarget (glob char OR /-path whose first segment is a repo dir) skipped before the tally with a transparent linksSkippedPhantom stat. Requires BOTH slash AND a repo-prefix so intentional [[galaxy/mill]] / [[dispatchers/x]] links are PRESERVED (130 real slash-links verified kept). 3-of-3 PASS (arm C self-verified, agent rate-limited). 14/14 tests."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.199Z
aliases: reference_link_audit_phantom_filter_2026_06_09
---


# knowledge-link-audit phantom filter (2026-06-09, slot:alpha)

Commit `134895d848` (U-OBS-LINK-AUDIT-PHANTOM-FILTER). R4-C1 — the 3rd verified survivor
from the ultracode discovery Workflow `w3qho9bc3`. R1-C1, R1-C2, R4-C1 now all SHIPPED;
remaining queue: R2-C1 (memory-index-search-lib:293 fallback blind to galaxy brains),
R3-C1 (embed 284 vault-only memos). Full queue: [[reference_session_once_gate_lib_2026_06_09]].

## The bug
`scripts/knowledge-link-audit.mjs` `extractLinks` captured ANY `[[...]]` content; `normalizeName`
then last-segmented path/glob fragments (`[[src/foo.ts]]` → "foo.ts", `[[scripts/*.mjs]]`) into
phantom keys counted as BROKEN. ~1448-1456 false positives = 15.5% of the broken count — polluting
the system-viz `ghost.link_audit_integrity` roost, the inject hook, and the broken-link stub generator.

## The fix
Pure `isPhantomLinkTarget(rawName)`: glob char (`*`/`?`) OR a `/`-containing target whose FIRST
segment is a repo dir (skills/src/state/scripts/knowledge/mcp-server). Skipped in `auditLinks`
BEFORE `total++`, counted separately as `linksSkippedPhantom` (transparent, R12). LIVE: 1456
phantoms skipped, broken 9342→7886, 0 phantoms leaked, invariant resolved+broken==total holds.

## THE LESSONS
1. **Filter at the AUDIT layer, not the tokenizer.** `extractLinks` stays a faithful `[[...]]`
   tokenizer (the existing test asserts it keeps `skills/foxtrot`); the SEMANTIC "is this a real
   link?" decision belongs in `auditLinks`. Filtering in extractLinks would have broken that contract.
2. **Require BOTH slash AND a repo-prefix to avoid OVER-FILTER (false-negatives).** A predicate that
   just matched "starts with knowledge" would hide real links. Requiring `/` + a known repo first-segment
   means intentional namespaced links are preserved — reviewer A empirically verified 130 real
   slash-links (`dispatchers/*`, `engines/*`, `galaxy/mill`) flow through as real, only the repo-path
   fragments are dropped. Over-filtering an advisory audit = silently HIDING a real broken link (worse
   than a false positive). Verify the no-over-filter direction explicitly (R8/R12).
3. **Transparent drop, not silent** — a `linksSkippedPhantom` stat surfaces exactly how many were
   filtered, so the reduction is auditable, never a silent count change.
