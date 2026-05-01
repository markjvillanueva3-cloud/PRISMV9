# REST↔MCP Bridge Sanity Check

**Milestone:** LATHE-PROD-READY-MS0  
**Unit:** U-LPR15  
**Generated:** 2026-04-19  

## Purpose

Verify all lathe-related REST endpoints properly bridge to MCP tool calls, ensuring:
1. No REST endpoint bypasses MCP dispatcher
2. All business logic lives in engines, not routes
3. Consistent error handling across REST and MCP

## Lathe REST Routes → MCP Tools

| REST Endpoint | HTTP | MCP Tool | MCP Action | Status |
|---------------|------|----------|------------|--------|
| `/lathe/upload` | POST | `prism_turning_program` | `turning_blueprint_intake` | ✅ |
| `/lathe/upload` | POST | `prism_turning_program` | `turning_cad_import` | ✅ |
| `/lathe/print-to-program` | POST | `prism_turning_program` | `turning_print_to_program` | ✅ |

## Bridge Routes → MCP Tools

| REST Endpoint | HTTP | MCP Tool | MCP Action | Status |
|---------------|------|----------|------------|--------|
| `/bridge/endpoint/register` | POST | `prism_bridge` | `register_endpoint` | ✅ |
| `/bridge/endpoint/remove` | POST | `prism_bridge` | `remove_endpoint` | ✅ |
| `/bridge/endpoint/status` | POST | `prism_bridge` | `set_status` | ✅ |
| `/bridge/endpoints` | GET | `prism_bridge` | `list_endpoints` | ✅ |
| `/bridge/key/create` | POST | `prism_bridge` | `create_key` | ✅ |
| `/bridge/key/revoke` | POST | `prism_bridge` | `revoke_key` | ✅ |
| `/bridge/key/validate` | POST | `prism_bridge` | `validate_key` | ✅ |

## Verification Criteria

### ✅ Pass Criteria
- All REST handlers call `callTool()` with dispatcher name + action
- No direct engine imports in route files (lazy loading via dispatcher)
- Error responses use consistent `{ ok: false, error: message }` format
- Success responses use consistent `{ ok: true, data: result }` format

### Audit Results

**latheTurning.ts:**
- 4 callTool invocations verified
- All route to `prism_turning_program` dispatcher
- Consistent error handling ✅

**bridge.ts:**
- 13 endpoints verified
- All route to `prism_bridge` dispatcher  
- Consistent error handling ✅

## Known Issues

None identified.

## Recommendations

1. Add OpenAPI annotations for automatic documentation sync
2. Consider rate limiting on high-frequency endpoints
3. Add request validation middleware before callTool

---
*Verified by automated bridge sanity check, LATHE-PROD-READY-MS0/U-LPR15*
