# UNIT-0020 — Long-Term Data Retention and Digital Thread Completeness — GAP ANALYSIS
_Analyst: india (ai-training soul) · 2026-07-02 · every claim cited file:line, read-verified_

## Existing coverage

**Retention policies with configurable horizons — EXISTS, multi-surface:**
- `mcp-server/src/engines/WetRunRetentionPolicyEngine.ts:1-80` — regime-driven retention windows (ITAR 5y / AS9100 2y / ISO_9001 3y / IATF_16949 15y / FDA_21CFR820 7y / INTERNAL_RND 1y, :41-48), max-window rule for multi-regime artifacts, legal-hold absolute precedence, four-eyes purge workflow (:24-30). Companion test `__tests__/engines/WetRunRetentionPolicyEngine.test.ts` exists (verified in grep results). Wired via `safetyDispatcher.ts` (file matched WetRunRetentionPolicy grep; exact action lines PARTIAL-UNVERIFIED).
- `complianceDispatcher.ts:42,131-147` — `document_retention` action (list/set/check operations; :147 throws on unknown op).
- `devDispatcher.ts:419,2972` — `lre_get_retention_policy` (ledger retention); `__tests__/dispatcher.ledgerRetention.test.ts` exists (grep-verified).
- `mcp-server/src/engines/MemoryGovernanceEngine.ts:1-13` — TTL expiry for stored memories; wired `sessionDispatcher.ts:3387-3406`.
- `mcp-server/src/engines/DocumentControlEngine.ts:22` — "Retention period tracking + due-for-disposition flag" per ISO 9001 §7.5.3(f).
- `mcp-server/src/engines/FDA21CFRPart11Engine.ts` — matched retention grep (PARTIAL-UNVERIFIED body).

**Digital thread auditor — EXISTS AND IS WIRED:**
- `mcp-server/src/engines/DigitalThreadEngine.ts:66-107` (read end-to-end) — `trace()` returns `is_complete`, `coverage_pct` over 5 lifecycle stages (design/cam/setup/machining/inspection :68), broken-link detection (:73-80), change-propagation risk from unlinked leaf nodes (:83-85), weighted `traceability_score` (:88-90), recommendations (:92-96). Wired at `automationDispatcher.ts:20,65-67` as `digital_thread`.

## Real gaps
1. **No unified cross-system retention policy layer** — retention exists per domain (wet-run artifacts, controlled documents, memories, ledgers) but nothing spans ALL PRISM state (`data/state/*.json[l]`, handoffs, transcripts, vendor-catalog-db, scrutiny ledgers). "Configurable horizons" exist only inside each silo.
2. **DigitalThreadEngine is pure-input, not an auditor of real data** — `trace(input)` requires the CALLER to hand it nodes/links (`DigitalThreadInput` :42-46); there is no walker that constructs the thread from actual JM Die artifacts (programs in `JM DIE/`, setup sheets, CMM reports) and audits completeness against the shop's real 24,545-file archive. The "100% coverage target" and "Real JM Die data validation" criteria are therefore unmet.
3. **No archival strategy implementation** — purge scheduling exists (WetRunRetentionPolicyEngine :24-30) but no archive-to-cold-storage move for expired-but-keep artifacts.
4. **prism_memory/prism_context wiring** — retention actions live on compliance/dev/session/automation dispatchers; no prism_memory-native retention action verified.

## Verdict
**extend**

## Recommended next action
Build the missing CONNECTOR, not the engines: a `DigitalThreadWalker` that enumerates a real JM Die part-number's artifacts (program files, revision history, setup docs) from `H:/PRISM/JM DIE/`, constructs `DigitalThreadInput` nodes/links, and feeds the EXISTING `digitalThreadEngine.trace()` — reporting live coverage numbers per part as the validation evidence (R15 item 3). In the same milestone, add a `RetentionPolicyRegistry` that federates the four existing retention surfaces (wet-run regimes, document_retention, lre ledger policy, memory TTL) behind one query action with per-store horizon config, wired to prism_memory; do NOT re-implement any regime math — import from `WetRunRetentionPolicyEngine`'s regime table. Acceptance = a real thread-completeness report for ≥3 JM Die parts with honest coverage percentages, not synthetic inputs.

## ROI
**5/10** — both headline engines exist and are wired; remaining value is the real-data walker + federation layer, which is genuinely useful for JM Die traceability but is integration work over proven components, with meaningful file-walking effort against the 24K-file archive.
