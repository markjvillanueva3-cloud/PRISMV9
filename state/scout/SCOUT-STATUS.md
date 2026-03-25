# Scout Status -- 2026-03-24

## Pipeline
- Sources Checked: github, smithery, glama, pulsemcp, anthropic-changelog, npm, arxiv, web
- Total Findings: 52
- High Relevance: 18
- Already Have: 8
- Queued for Integration: 18

## Immediate Queue: 10 items
| # | Name | Type | Effort | Est. Time |
|---|------|------|--------|-----------|
| SCOUT-3 | Taskmaster AI | plugin | S | 1 hr |
| SCOUT-4 | Agent Teams (TeammateTool) | claude_feature | S | 30 min |
| SCOUT-9 | 3D CAD Batch Converter | mcp_server | S | 1 hr |
| SCOUT-10 | TS Refactoring MCP (ts-morph) | mcp_server | S | 30 min |
| SCOUT-12 | ccusage + claude_telemetry | cli_tool | S | 15 min |
| SCOUT-14 | Skills 2.0 Frontmatter | claude_feature | S | 15 min |
| SCOUT-15 | LangChain MCP Adapters | library | S | 1 hr |
| SCOUT-16 | CQAsk (Conversational CadQuery) | tool | S | 1 hr |
| SCOUT-17 | PostCompact Hook + autoMemoryDir | claude_feature | S | 30 min |
| SCOUT-18 | Prometheus + Grafana MCP | mcp_server | S | 2 hr |

## Short-term Queue: 7 items
| # | Name | Type | Effort | Phase Alignment |
|---|------|------|--------|-----------------|
| SCOUT-1 | CAD-Coder (VLM CadQuery) | ai_tool | M | CAD / Blueprint OCR |
| SCOUT-2 | OPC-UA MCP Server | mcp_server | M | Machine Sync / 0-D-ARCH |
| SCOUT-5 | node-opcua (TS OPC UA) | library | M | Machine Sync |
| SCOUT-6 | MTConnect + TrakHound | standard_tool | M | Machine Sync / Validation |
| SCOUT-7 | Text-to-CadQuery | ai_tool | M | CAD Engine |
| SCOUT-11 | OpenTelemetry MCP (Traceloop) | mcp_server | M | Performance / Observability |
| SCOUT-13 | Odoo ERP MCP Server | mcp_server | M | 2-ERP / QuoteToShip |

## Medium-term Queue: 1 item
| # | Name | Type | Effort | Phase Alignment |
|---|------|------|--------|-----------------|
| SCOUT-8 | Dynamics 365 ERP MCP | mcp_server | L | 2-ERP / QuoteToShip |

## Completion Tracking
- Integrated: 0 / 18
- In Progress: 0 / 18
- Queued: 18 / 18
- Blocked: 0 / 18

## Key Dependency Chains
- Machine Sync: SCOUT-18 -> SCOUT-2 -> SCOUT-5 -> SCOUT-6
- CAD Engine: SCOUT-9 -> SCOUT-16 -> SCOUT-1 + SCOUT-7
- ERP: SCOUT-13 (Odoo PoC) -> SCOUT-8 (D365 prod)
- Dev Tooling: SCOUT-14 -> SCOUT-17 -> SCOUT-4 -> SCOUT-3

## Dates
- Last Scan: 2026-03-24
- Next Scan: 2026-03-31
- Plan Generated: 2026-03-24
- Plan File: state/scout/SCOUT-ROADMAP-ENTRIES.md
