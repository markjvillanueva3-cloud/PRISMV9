Build the PRISM MCP server and verify output:
1. Run `cd mcp-server && node scripts/prebuild-gate.cjs` — must pass before building
2. Run `cd mcp-server && npx esbuild src/index.ts --bundle --platform=node --target=node18 --format=esm --outfile=dist/index.js --analyze 2>&1 | head -30` — capture build size and top modules
3. Run `cd mcp-server && node scripts/verify-build.ps1 2>&1 || true` — post-build verification
4. Report: Build size (WARN if >6.5MB, BLOCK if >8MB), top 5 modules, any errors
