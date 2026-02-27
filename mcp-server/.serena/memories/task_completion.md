# Task Completion Checklist

When a coding task is completed:
1. Run `npx tsc --noEmit` to verify no TypeScript errors
2. Verify all imports use .js extension (ESM requirement)
3. Ensure error handling follows MCP content format
4. Check that any new dispatchers are imported AND registered in `src/index.ts`
