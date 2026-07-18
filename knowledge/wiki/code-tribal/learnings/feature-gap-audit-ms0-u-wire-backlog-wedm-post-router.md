# FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-WEDM-POST-ROUTER — [MAIN] [FEATURE-GAP-AUDIT-MS0]/U-WIRE-BACKLOG-WEDM-POST-ROUTER (slot:india): wire WEDMPostDialectRouterEngine into prism_edm — master-post over 5 vendor engines (Mitsubishi/Sodick/Makino/Agie/Fanuc) exposing 9 controller dialects via 6 new actions: wedm_post_supported_controllers, wedm_post_dialect_config, wedm_post_select_by_machine, wedm_post_generate, wedm_post_convert, wedm_post_roundtrip. Engine had ZERO dispatcher refs before this commit; the existing 3 router test files (WEDMPostDialectRouterEngine.test.ts, -mcp.test.ts, 5 vendor engine tests — 43/43 PASS) cover the engine surface the new cases call. Closes 6 unwired post-domain engines (1 router + 5 vendors) in a single wire. Per-file scrutiny gate cleared: 2-reviewer round on each file PASS; minor reviewer findings applied (explicit ternary on machine_description, .strict() on zero-arg supported_controllers, .omit(controller) on convert schema to avoid caller surprise, route()-alias-omission comment).

**Commit:** `ed1ff032c786` · **By:** markjvillanueva3-cloud · **At:** 2026-05-21T12:16:54-05:00
**Tags:** feature-gap-audit-ms0, u-wire-backlog-wedm-post-router, auto-distilled

## Subject
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-WIRE-BACKLOG-WEDM-POST-ROUTER (slot:india): wire WEDMPostDialectRouterEngine into prism_edm — master-post over 5 vendor engines (Mitsubishi/Sodick/Makino/Agie/Fanuc) exposing 9 controller dialects via 6 new actions: wedm_post_supported_controllers, wedm_post_dialect_config, wedm_post_select_by_machine, wedm_post_generate, wedm_post_convert, wedm_post_roundtrip. Engine had ZERO dispatcher refs before this commit; the existing 3 router test files (WEDMPostDialectRouterEngine.test.ts, -mcp.test.ts, 5 vendor engine tests — 43/43 PASS) cover the engine surface the new cases call. Closes 6 unwired post-domain engines (1 router + 5 vendors) in a single wire. Per-file scrutiny gate cleared: 2-reviewer round on each file PASS; minor reviewer findings applied (explicit ternary on machine_description, .strict() on zero-arg supported_controllers, .omit(controller) on convert schema to avoid caller surprise, route()-alias-omission comment).

## Body
```
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-WIRE-BACKLOG-WEDM-POST-ROUTER (slot:india): wire WEDMPostDialectRouterEngine into prism_edm — master-post over 5 vendor engines (Mitsubishi/Sodick/Makino/Agie/Fanuc) exposing 9 controller dialects via 6 new actions: wedm_post_supported_controllers, wedm_post_dialect_config, wedm_post_select_by_machine, wedm_post_generate, wedm_post_convert, wedm_post_roundtrip. Engine had ZERO dispatcher refs before this commit; the existing 3 router test files (WEDMPostDialectRouterEngine.test.ts, -mcp.test.ts, 5 vendor engine tests — 43/43 PASS) cover the engine surface the new cases call. Closes 6 unwired post-domain engines (1 router + 5 vendors) in a single wire. Per-file scrutiny gate cleared: 2-reviewer round on each file PASS; minor reviewer findings applied (explicit ternary on machine_description, .strict() on zero-arg supported_controllers, .omit(controller) on convert schema to avoid caller surprise, route()-alias-omission comment).
```

## Files touched (3)
- mcp-server/src/schemas/edmActionSchemas.ts        | 86 +++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/edmDispatcher.ts | 84 ++++++++++++++++++++++
- 2 files changed, 170 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ed1ff032c786`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._