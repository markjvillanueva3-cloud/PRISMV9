#!/bin/bash
# prism-scan.sh — Count pattern occurrences in PRISM source code
# Usage: prism-scan.sh <pattern> [scope]
# Scope: all (default), src, tests, engines, tools, hooks
# Saves: ~2K tokens vs raw grep chains
#
# Examples:
#   prism-scan.sh "as any"          → count in all src/
#   prism-scan.sh "as any" tests    → count in tests only
#   prism-scan.sh "TODO" engines    → count TODOs in engines
#   prism-scan.sh "as any" detail   → per-file breakdown

cd /c/PRISM/mcp-server || exit 1

PATTERN="${1:?Usage: prism-scan.sh <pattern> [scope|detail]}"
SCOPE="${2:-all}"

case "$SCOPE" in
  all)
    echo -n "Total: " && grep -r "$PATTERN" src/ --include="*.ts" 2>/dev/null | wc -l
    echo -n "Production: " && grep -r "$PATTERN" src/ --include="*.ts" --exclude-dir=__tests__ 2>/dev/null | wc -l
    echo -n "Tests: " && grep -r "$PATTERN" src/__tests__/ --include="*.ts" 2>/dev/null | wc -l
    echo -n "Code (non-comment): " && grep -rn "$PATTERN" src/ --include="*.ts" 2>/dev/null | grep -v "//.*$PATTERN" | grep -v "\*.*$PATTERN" | grep -v "\.d\.ts:" | wc -l
    ;;
  src|production)
    grep -r "$PATTERN" src/ --include="*.ts" --exclude-dir=__tests__ 2>/dev/null | wc -l
    ;;
  tests)
    grep -r "$PATTERN" src/__tests__/ --include="*.ts" 2>/dev/null | wc -l
    ;;
  engines)
    grep -r "$PATTERN" src/engines/ --include="*.ts" 2>/dev/null | wc -l
    ;;
  tools)
    grep -r "$PATTERN" src/tools/ --include="*.ts" 2>/dev/null | wc -l
    ;;
  hooks)
    grep -r "$PATTERN" src/hooks/ --include="*.ts" 2>/dev/null | wc -l
    ;;
  detail)
    grep -r "$PATTERN" src/ --include="*.ts" -c 2>/dev/null | grep -v ":0$" | sort -t: -k2 -nr | head -30
    ;;
  *)
    echo "Unknown scope: $SCOPE (use: all, src, tests, engines, tools, hooks, detail)" && exit 1
    ;;
esac
