# PATCH-SIBLING — CLAUDE.md back-flow for token-savings audit

> **RESOLVED 2026-05-20 (slot lima, U-LIMA-B1).** The 3 regression entries are now
> archived in `state/shared/CLAUDE-REGRESSIONS-ARCHIVE.md` (§Back-flowed historical
> regressions) — all three findings are resolved-historical. The doctrine portion
> (`scripts/token-savings-rank.mjs` META) is already wiki-captured at
> `knowledge/wiki/architecture/audit-token-savings-2026-05-17.md`. The literal
> CLAUDE.md splice was NOT performed: CLAUDE.md became golf-only after this patch
> was authored (U-OBF-GOLF guard). golf may optionally add a 1-line META pointer
> to the OLLAMA-PIPELINE section, or delete this file — content is fully preserved.

**Author:** claude-77971357 slot lima
**Date:** 2026-05-17
**Reason:** CLAUDE.md is peer-claimed by claude-de04081e (chat-bus shows active edit-lock, 4m left at start of audit). Per JULIETT-12CHAT-ALLOCATION-MS0 patch-sibling convention, dropping the back-flow lines here for whoever splices next.

## To splice into `## Recent regressions` (append at bottom — chronological)

```markdown
- 2026-05-17 | **token-savings layer is mostly write-only across the fleet (2 P0 / 5 P1 audit)** | observed-in: state/shared/specs/AUDIT-TOKEN-SAVINGS-2026-05-17.md | fix: see leverage-ranked action list — start with F2 (MEMORY.md trim, -27B over ceiling) + F3 (Ollama threshold 0.90→0.80) + F1 (rtk init -g). META: `node scripts/token-savings-rank.mjs --json --history` | verify: `node H:/prism/scripts/token-savings-rank.mjs --json | jq .summary` → expect P0 count to drop to 0 after F2+F3 fixes
- 2026-05-17 | **MEMORY.md re-crossed truncation ceiling AGAIN — 24,603B / -27B headroom** (2nd time in 2 days) | fix: U-MEMORY-COMPRESS-V2 needed — the watchdog-only fix (memory-size-watch.mjs as Stop advisory) is insufficient; wire it to actually trigger `/memory-prune` on status=warn instead of just advising | observed-by: claude-77971357 lima /forge-audit-v2 token-savings
- 2026-05-17 | **cache reader-path systemically dead — 0 hits across all 3 caches** (96 file-read keys / 0 hits is the actively-bleeding surface) | fix: trace which hook is supposed to PreToolUse:Read consult `.claude/cache/file-read-cache.json` before re-loading; same anti-pattern as F1 RTK | observed-by: peer-reviewer agent a0310b5d6 (challenged audit, surfaced this as the missed systemic finding) | verify: `node -e "['bash-result-cache','grep-result-cache','file-read-cache'].forEach(n=>{const c=JSON.parse(require('fs').readFileSync('.claude/cache/'+n+'.json','utf8'));console.log(n,Object.keys(c).length,Object.values(c).reduce((a,v)=>a+(v.hits||0),0))})"` → expect at least one cache to have hits > 0
```

## To splice into the doctrine-pointer section (after OLLAMA-PIPELINE-MS0, before the next milestone block)

```markdown
## TOKEN-SAVINGS-AUDIT META (2026-05-17 lima)

Re-runnable META artifact at `scripts/token-savings-rank.mjs` consolidates every PRISM token-saving signal into one JSON + markdown summary. Exits 0=healthy / 1=warn / 2=critical / 3=measurement-error. Appends to `state/shared/token-savings-history.jsonl` for week-over-week drift detection (sibling pattern to synergy-regression-watch + memory-size-watch).

Surfaces measured: Ollama offload ratio, MEMORY.md size, RTK passthrough, hook fire-count + zero-fire population, error-pattern noop ratio, CLAUDE.md byte/line count, token-budget slot-mapping coverage, cache reader-path hit count across all 3 caches. Live invocation: `node scripts/token-savings-rank.mjs --json --history`. Doctrine pattern surfaced by the audit: **writer-without-reader is the dominant token-savings failure mode in PRISM**. Audit doc: [`state/shared/specs/AUDIT-TOKEN-SAVINGS-2026-05-17.md`](state/shared/specs/AUDIT-TOKEN-SAVINGS-2026-05-17.md) · HTML companion next to it · wiki [`knowledge/wiki/architecture/audit-token-savings-2026-05-17.md`](knowledge/wiki/architecture/audit-token-savings-2026-05-17.md). Memory: [[reference_audit_token_savings_2026_05_17]].
```

## Splice mechanics (for the chat that integrates this patch)

1. Wait for the claude-de04081e CLAUDE.md edit-lock to release (currently ~4-9min remaining at the start of this audit; check `prism_context:chat_list_claims` before splicing).
2. Use Edit tool to append the regression lines into the `## Recent regressions` section (preserve existing chronological order — append at end).
3. Use Edit tool to add the new doctrine-pointer section after the existing OLLAMA-PIPELINE-MS0 block.
4. Commit with subject `[MAIN] [TOKEN-SAVINGS-AUDIT]/V1-CLAUDE-MD-SPLICE: patch-sibling integration (audit shipped by lima a0310b5d6 peer-reviewed)`.
5. Delete this patch file after splicing (it's a one-shot, not an artifact).
