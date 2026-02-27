# Style & Conventions

## Naming
- Files: camelCase (e.g., `calcDispatcher.ts`, `SpeedFeedEngine.ts`)
- Functions: camelCase (e.g., `registerCalcDispatcher`, `handleCollisionTool`)
- Types/Interfaces: PascalCase (e.g., `ResponseLevel`, `SmokeResult`)
- Constants: UPPER_SNAKE (e.g., `SERVER_NAME`, `COLLISION_ACTIONS`)

## Patterns
- Dispatcher pattern: `export function register*Dispatcher(server: any): void`
- Each dispatcher registers ONE tool with z.enum of actions
- Error handling: try/catch with JSON error response in MCP content format
- Response format: `{ content: [{ type: "text", text: JSON.stringify(result) }] }`

## Imports
- ESM (.js extensions in imports)
- Zod for validation
- Dynamic imports with try/catch for optional modules
