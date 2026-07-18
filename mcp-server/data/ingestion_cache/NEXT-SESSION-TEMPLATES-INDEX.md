# Next-session operator-facing templates — index

This directory contains 5 step-by-step templates shipped iter194-iter198 covering all priority work items from the iter167 session-final memo. Operator + next-session chat can pick any to execute autonomously.

## Templates (in priority order)

| # | Template | iter | Description |
|---|----------|------|-------------|
| 1 | [TOOL-LIST-TEMPLATE.md](./TOOL-LIST-TEMPLATE.md) | iter194 | Real shop tool-list JSON schema + per-customer ingestion workflow |
| 2 | [VENDOR-PDF-INGEST-TEMPLATE.md](./VENDOR-PDF-INGEST-TEMPLATE.md) | iter195 | 4-tier manufacturer PDF ingestion pipeline (Sumitomo BNX, Kennametal, etc.) |
| 3 | [MCP-DISPATCHER-ACTION-TEMPLATE.md](./MCP-DISPATCHER-ACTION-TEMPLATE.md) | iter196 | TypeScript skeleton for `prism_lathe:query_vendor_tribal` MCP action |
| 4 | [AB-LOCATOR-SCAN-RUNNER-TEMPLATE.md](./AB-LOCATOR-SCAN-RUNNER-TEMPLATE.md) | iter197 | CLI scan-runner walking `JM DIE/CNC LATHE/**/*.{MIN,nc}` for A/B pairs |
| 5 | [TS-ENGINE-WIRING-TEMPLATE.md](./TS-ENGINE-WIRING-TEMPLATE.md) | iter198 | 3-path integration of `.mjs` engines into TS dispatchers (Path B recommended) |

## How to use

Pick ONE template that matches available resources:
- **Template 1**: requires operator-supplied real customer tool-list data
- **Template 2**: requires operator `wget` of manufacturer catalog PDFs
- **Template 3**: requires `mcp-server/src/tools/dispatchers/prism_lathe.ts` to exist (or be created)
- **Template 4**: can run autonomously today (uses existing iter136 helpers + glob)
- **Template 5**: implementation work, no external dependencies (recommends Path B for first pass)

## Most-autonomous starting point

**Template 4 (AB-locator CLI scan-runner)** is the most autonomously-shippable next step:
- Uses already-tested iter136/165 helpers
- Doesn't require operator data input
- Doesn't require external PDF downloads
- Just composes existing engines + fs.glob
- Output (`jm-die-ab-pairs-<date>.jsonl`) feeds future Δ-score computation

## Session context

Read these BEFORE picking a template:
1. `[[reference_whiskey_session_final_iter167_2026_05_27]]` — overall session-final state
2. `[[reference_whiskey_real_data_validation_pattern_2026_05_27]]` — 12-program validation pattern
3. `[[reference_jm_die_is_okuma_heavy_implications_2026_05_27]]` — JM-fleet dialect implications
4. `[[feedback_jm_die_b_versions_are_ai_not_human_upgrade]]` — B-version provenance correction
5. `scripts/lib/README-whiskey-lathe.md` — engine catalog
6. `mcp-server/data/ingestion_cache/whiskey-lathe-session-iter180.json` — machine-readable summary

## Cron auto-continuation

The whiskey-session cron `4d08d27a` (every 5 min) is configured to keep re-injecting `/goal /yolo-mode` until operator intervention. Next session inherits this cron — no /checkin-whiskey required for the goal to remain active, only for slot-binding.
