---
name: tribal-index-keyscheme-clobber-2026-05-22
description: "RAG-UPGRADE-MS0/U-RAG-1 root-cause CORRECTED 2026-05-22 (bravo): not structurally blocked — single-function audit blind spot. Fix shipped at commit e07edcbf76 (coverage 0.8%->97.2%)."
aliases: reference_tribal_index_keyscheme_clobber_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.979Z
---


# tribal-embed-index.json — U-RAG-1 was a measurement bug, not a structural block (2026-05-22)

## CORRECTION (2026-05-22, slot bravo, session continuation)

The prior version of this memory said U-RAG-1 was **structurally blocked** on
an "operator design call" to unify the index id scheme. **That was wrong.**
The real bug was a one-function blind spot in
`scripts/wiki-tribal-cross-ref-audit.mjs:tribalWikiPath()`.

## What was actually true

`tribal-embed-index.json` (369 MB, ~24,286 entries) holds wiki embeddings
under TWO live id schemes:
- `wiki:knowledge/wiki/<rel>` — 190 entries from a small native batch.
- `external:H:\...\knowledge\wiki\<abs>` — **23,581 entries** from the
  canonical wiki embedder `embed-wiki-into-tribal-index.mjs` (whose
  `makeId()` is hardcoded to `"external:" + winPath`). Plus a separate class
  of `external:` ids that point at non-wiki paths (memories, knowledge_store).

The audit's `tribalWikiPath()` only recognized `wiki:` ids → reported 0.8%
coverage. But the wiki corpus was already **97.2% embedded** under the
`external:` scheme, and those entries are fully retrievable
(`tribal-rerank.mjs` ranks on embedding/text/domain and never reads
`id`/`source` — verified by direct grep returning zero `source` references).
The "0.8%" was a pure audit artifact, not a real retrieval gap.

The pre-compaction session ran `embed-all-wiki.mjs` to done:13000 — that
run produced 13K MORE `external:` entries (all clobbered by a peer, but
even if they hadn't, the audit still wouldn't have counted them because
they were `external:`-keyed). The clobber existed but was a red herring;
the binding bug was the audit's id-scheme blindness.

## What I almost did wrong

The first instinct (and my own initial fix attempt this session) was to
rewrite `embed-all-wiki.mjs` to emit `wiki:`-schemed entries + a clobber-safe
self-healing flush, then re-embed the corpus. **That would have been a
corpus-doubling regression** — ~24K duplicate embeddings of the same wiki
content, polluting the rerank corpus + ~40 min of wasted Ollama compute.
The first per-file scrutiny reviewer (`code-analyzer`) caught it — flagged
that 23,581 `external:` entries already pointed at wiki paths, making the
re-embed a corpus-doubling regression. My own backslash-proof scheme scan
empirically confirmed it (RTK had mangled `\\` → `\` in my earlier id-only
scan, false-negating the regex; the corrected scan with
`String.fromCharCode(92)` showed the truth). The driver rewrite was
reverted (`git checkout -- scripts/embed-all-wiki.mjs`) and the real fix
landed in the audit.

## The fix shipped — commit `e07edcbf76`

`scripts/wiki-tribal-cross-ref-audit.mjs` — `tribalWikiPath()` gained a
guarded third branch: any entry whose `id` or `path` matches the
path-segment regex `(^|/)knowledge/wiki/` is counted, with
`normalizeWikiPath` doing the coordinate mapping. The `..`-traversal guard
is preserved through the chain. `SCHEMA_VERSION` 1.0.0→1.1.0. 7 new
`tribalWikiPath` test cases + 1 audit-level mixed-scheme test + 1 corrected
E2E invariant (the old `round(coverage*N) === wikiFiles-missing` was
off-by-one at realistic coverage because `coverage` is 4dp-rounded and the
×24K multiply amplifies the rounding to ±1; replaced with the exact
algebraic invariant). 26/26 tests pass. Per-file scrutiny PASS. 3-of-3 Stop
scrutiny PASS.

## Live coverage

97.2% at commit time. By session end ~72% — the corpus grew ~8K files during
the session via peer activity. The fix is correct (it eliminates the blind
spot) and the gap is now genuinely operator-visible (the two consumers
`wiki-tribal-coverage-inject.mjs` and `goal-synergy-status.mjs` gate at
`(1-coverage) >= 0.10` so they fire at the real gap, not the false 99.2%
gap). A periodic embed-pass keeps coverage ≥95% — the canonical
`embed-wiki-into-tribal-index.mjs` keys `external:` consistent with the
corrected audit.

## Lessons

1. **Audit blind spots can look like infrastructure problems.** Before
   escalating "structurally blocked / needs operator decision," verify the
   measurement instrument actually measures what it claims.
2. **Per-file scrutiny saved a ~24K-entry corpus-doubling regression.** The
   first reviewer on the wrong driver rewrite flagged the
   `external:`-already-exists reality before any commit — the gate worked.
3. **Memory ≠ truth.** The earlier memory's body literally diagnosed the
   bug correctly ("the audit only recognizes wiki:... that is true of that
   scheme but false of the corpus — many wiki files are embedded under
   external: and the audit cannot see them") and then escalated to
   "operator decision." The right next move was a 1-function fix, not an
   escalation. Verify before committing to the wrong path.
4. **RTK mangles backslash regex in single-quoted bash.** Use
   `String.fromCharCode(92)` for backslash-sensitive scans in bash `-e`
   — `\\` survives but `[\\/]` is collapsed.

## See also
- Commit `e07edcbf76` — the fix.
- Commit `6df057e098` — earlier U-RAG-2 first hook wiring (lexical rerank).
- Spec: `state/shared/specs/RAG-UPGRADE-MS0.md`.
- [[reference_u_wiki_tribal_audit_2026_05_21]] — original audit (echo iter 7).
