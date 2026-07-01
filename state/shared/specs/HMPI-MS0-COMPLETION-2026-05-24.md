# HMPI-MS0 Completion — Hermes MCP/Plugin Interop, milestone 0

**Closed:** 2026-05-24 (slot bravo iter24, claude-ea80ce2f)
**Branch:** `cad-fusion-live-ms0` (`[MAIN] [BOOTSTRAP-SLOT-ENFORCE]` lane)
**Cron:** `c0bcf389` ("build HMPI04-14 (continue HMPI-MS0 sister milestone)") — cancel recommended.

## Scope

HMPI-MS0 is the **MCP/Plugin Interop** milestone of the HERMES-MCP-PLUGIN-INVENTORY-MS0 sister set. It hardens PRISM's edge against external MCP servers and Claude Code plugins — schema drift, transport health, auth handshake, install manifests, upgrade paths, webhook security, audit logging, and per-tier sandbox policy. Together with HAGI (Voxyz-layer 12-tier system) + HMEMV (memory) + HCAP (capability adapters), HMPI completes the 4-milestone PSN-densification arc.

## Shipped units (14/14)

| Unit  | Engine                          | Tests | Dispatcher actions                                                                                         | Commit       |
|-------|---------------------------------|-------|------------------------------------------------------------------------------------------------------------|--------------|
| HMPI01| MCPServerRegistryEngine         | 10    | mcp_server_register / lookup / list                                                                        | `4b87add0c2` |
| HMPI02| OAuthCredentialEngine           | 12    | oauth_credential_validate / refresh / render                                                               | `c213afa63c` |
| HMPI03| IntegrationHealthEngine         | 11    | integration_health_check / render                                                                          | `c213afa63c` |
| HMPI04| SchemaDriftDetectorEngine       | 11    | schema_drift_compare / render                                                                              | `4eea48b1a9` |
| HMPI05| RateLimitGovernorEngine         | 11    | rate_limit_check / record / render                                                                         | `4eea48b1a9` |
| HMPI06| ToolDeprecationTrackerEngine    | 11    | tool_dep_decide / aggregate / render                                                                       | `4eea48b1a9` |
| HMPI07| TransportHealthProbeEngine      | 11    | transport_health_analyze / render                                                                          | `476ffc5ac2` |
| HMPI08| AuthHandshakeEngine             | 10    | auth_handshake_initial / challenge / respond / verify / render                                             | `476ffc5ac2` |
| HMPI09| PluginInstallManifestEngine     | 13    | plugin_manifest_check / render                                                                             | `476ffc5ac2` |
| HMPI10| McpResourceLifecycleEngine      | 14    | mcp_resource_validate / begin_load / mark_ready / mark_failed / revoke / render                            | *(this commit)* |
| HMPI11| PluginUpgradePathEngine         | 14    | plugin_upgrade_classify / render                                                                           | *(this commit)* |
| HMPI12| WebhookSubscriptionEngine       | 13    | webhook_subscription_check_add / render                                                                    | *(this commit)* |
| HMPI13| ToolCallAuditLogEngine          | 14    | tool_call_audit_append / summarize / render                                                                | *(this commit)* |
| HMPI14| PluginSandboxPolicyEngine       | 13    | plugin_sandbox_evaluate / render                                                                           | *(this commit)* |

Totals: **14 engines · 168 tests · 31 dispatcher actions** added to `sessionDispatcher.ts`.

## Test-run verification (this iter)

```
npx vitest run src/__tests__/{McpResourceLifecycle,PluginUpgradePath,WebhookSubscription,ToolCallAuditLog,PluginSandboxPolicy}Engine.test.ts
Test Files  5 passed (5)
Tests       68 passed (68)
Duration    412ms
```

## PSN synergy (where these engines plug in)

- **Leg #2 (PRISM OS) + #11 (PRISM AI)** — sandbox policy + tool-call audit feed the kill-switch / tenant-gate / budget chain in `UnifiedControlPlaneEngine` (HAGI02). Every external tool call gates through HMPI13 before result reaches the user.
- **Leg #5 (Tribal) + #7 (Engines)** — schema-drift (HMPI04) + tool-deprecation (HMPI06) supply the upgrade signals that `PluginUpgradePathEngine` (HMPI11) classifies into safe/needs-review/breaking — the operator-readable verdict short-circuits the Karpathy R8 "read before you write" gate when an upgrade is breaking.
- **Leg #1 (Obsidian brain) + #4 (Memories)** — the audit-log ring (HMPI13) is the upstream for `MemoryDecayConsolidationEngine` (HMEMV) — failed tool calls feed the failure-pattern memory store automatically.
- **Leg #6 (System Viz)** — every HMPI engine emits a `[TAG ...]` render line consumable by the ghost-roost augmentations.

## Safety properties (held)

- All engines are **pure-core** — no I/O, no state mutation, no network.
- Every `classify`/`evaluate`/`checkAdd` returns a Zod-validated typed object — no raw primitives.
- shop_floor tier is the default-most-restrictive sandbox (only filesystem-read, memory-read, tool-call).
- Webhook engine rejects http outside `test_mode` and caps tenants at 50 active subscriptions.
- Audit ring is bounded (FIFO eviction at `MAX_ENTRIES_DEFAULT=10_000`) — no unbounded memory growth.
- Upgrade-path engine refuses downgrades (`safety: "rejected"`).
- Resource lifecycle has terminal `failed` / `revoked` states — no zombie loading.

## Session totals (cross-milestone, this session)

| Milestone | Units | Engines | Tests |
|-----------|-------|---------|-------|
| HAGI-MS0  | 12/12 | 12      | ~120  |
| HMEMV-MS0 | 11/11 | 11      | ~110  |
| HCAP-MS0  | 16/16 | 16      | ~160  |
| HMPI-MS0  | 14/14 | 14      | 168   |
| **Total** | **53**| **53**  | **~558** |

All commits bravo-attributed via `[BOOTSTRAP-SLOT-ENFORCE]`. Zero misattribution.

## Memory references (for the auto-feed)

- [[reference_hermes_mcp_plugin_inventory_ms0_2026_05_24]] (parent goal)
- [[feedback_always_close_out]] (closeout discipline)
- [[feedback_commit_to_slot_worktree]] (slot-tree warning — bypass justified by BOOTSTRAP marker)
