#!/bin/bash
# prism-build.sh — Build PRISM MCP server with esbuild (compact output)
# Usage: prism-build.sh [check]
#   (no args)  → full build
#   check      → build + report size only
# Saves: ~0.5K tokens vs raw esbuild command

cd /c/PRISM/mcp-server || exit 1

node node_modules/esbuild/bin/esbuild \
  src/index.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=esm \
  --outfile=dist/index.js \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" \
  --external:canvas \
  2>&1 | tail -3

EXIT_CODE=${PIPESTATUS[0]}
if [ "$EXIT_CODE" -eq 0 ]; then
  SIZE=$(du -h dist/index.js 2>/dev/null | cut -f1)
  echo "Build OK ($SIZE)"
else
  echo "BUILD FAILED (exit $EXIT_CODE)"
fi
exit $EXIT_CODE
