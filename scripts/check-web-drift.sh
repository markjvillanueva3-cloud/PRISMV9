#!/bin/bash
# LATHE-PROD-READY-MS0/U-LPR13: Zero-drift CI check for /web/ legacy mirror
#
# The root /web/ directory is a legacy mirror of mcp-server/web/.
# This script detects drift between them and will eventually enforce
# that all development happens in mcp-server/web/ only.
#
# Usage: ./scripts/check-web-drift.sh [--strict]
#   --strict: Fail on ANY drift (for CI enforcement)
#   default:  Report drift but don't fail (transition period)

set -e

LEGACY_WEB="web/src"
CANONICAL_WEB="mcp-server/web/src"
STRICT_MODE=false

if [[ "$1" == "--strict" ]]; then
  STRICT_MODE=true
fi

echo "=== Web Directory Drift Check ==="
echo "Legacy:    $LEGACY_WEB"
echo "Canonical: $CANONICAL_WEB"
echo ""

# Count files in each
LEGACY_COUNT=$(find "$LEGACY_WEB" -type f -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
CANONICAL_COUNT=$(find "$CANONICAL_WEB" -type f -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)

echo "File counts:"
echo "  Legacy:    $LEGACY_COUNT files"
echo "  Canonical: $CANONICAL_COUNT files"
echo ""

# Find files only in canonical (expected - new development)
ONLY_CANONICAL=$(diff -rq "$LEGACY_WEB" "$CANONICAL_WEB" 2>/dev/null | grep "Only in $CANONICAL_WEB" | wc -l)

# Find files only in legacy (unexpected - should be migrated or deleted)
ONLY_LEGACY=$(diff -rq "$LEGACY_WEB" "$CANONICAL_WEB" 2>/dev/null | grep "Only in $LEGACY_WEB" | wc -l)

# Find files that differ
DIFFER=$(diff -rq "$LEGACY_WEB" "$CANONICAL_WEB" 2>/dev/null | grep "differ$" | wc -l)

echo "Drift summary:"
echo "  Only in canonical (OK): $ONLY_CANONICAL"
echo "  Only in legacy (MIGRATE): $ONLY_LEGACY"
echo "  Files differ (SYNC): $DIFFER"
echo ""

if [[ $ONLY_LEGACY -gt 0 || $DIFFER -gt 0 ]]; then
  echo "⚠️  DRIFT DETECTED"
  echo ""
  echo "Files only in legacy (need migration or deletion):"
  diff -rq "$LEGACY_WEB" "$CANONICAL_WEB" 2>/dev/null | grep "Only in $LEGACY_WEB" | head -20
  echo ""
  echo "Files that differ (need sync):"
  diff -rq "$LEGACY_WEB" "$CANONICAL_WEB" 2>/dev/null | grep "differ$" | head -20

  if $STRICT_MODE; then
    echo ""
    echo "❌ STRICT MODE: Failing due to drift"
    exit 1
  fi
else
  echo "✅ No drift from legacy to canonical"
fi

echo ""
echo "=== Drift Check Complete ==="
