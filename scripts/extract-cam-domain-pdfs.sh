#!/usr/bin/env bash
# extract-cam-domain-pdfs.sh — batch pdftotext extraction for echo's domain (CAM + post).
#
# Reads H:/PRISM/JM DIE/TRIBAL + WIKI/ and extracts every PDF whose classifier
# domain is post|cam|mill|wire OR whose tags include "tooling". Outputs to
# state/shared/pdf-extracts/jm-die-tribal-wiki/<safe-name>.txt — one .txt
# per PDF, layout-preserved.
#
# Skips: lathe (whiskey), cad (delta), reference except CAM-relevant.
#
# @milestone POST-PDF-NODE-MS0/U-JM-CAM-DOMAIN-EXTRACT
# @slot echo · @iter 9 · @date 2026-05-26

set -uo pipefail

CORPUS="H:/PRISM/JM DIE/TRIBAL + WIKI"
OUT_DIR="H:/prism/state/shared/pdf-extracts/jm-die-tribal-wiki"
mkdir -p "$OUT_DIR"

# Skip these (other-slot domains)
SKIP_REGEX='^(CNC Lathe|CS50|David Planchard|Mazak EIA - Programming Manula for Mazatrol Matrix\.pdf$|Mazak Mazatrol Programing Manual for Mazatrol Matrix\.pdf$|Mazak Programming Manual for Mazatrol Matrix 3D\.pdf$|MECHANICAL ENGINEERS HANDBOOK|OSP-P200L-Macturn-Multus|Programming Manual Fundamentals|Using IF and GOTO For a Poor|InventorCAM2024_Turning|CNC Lathe Programming for Turning|FUSION CAD|Fundamentals3DDesign|The Beginner.s Guide to GD)'

extracted=0
skipped=0
failed=0

for pdf in "$CORPUS"/*.pdf; do
  [ -f "$pdf" ] || continue
  base=$(basename "$pdf" .pdf)
  if echo "$base" | grep -qE "$SKIP_REGEX"; then
    skipped=$((skipped+1))
    continue
  fi
  # safe filename: lowercase, alnum + dash
  safe=$(echo "$base" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | tr -s '-' | sed 's/^-//;s/-$//')
  out="$OUT_DIR/$safe.txt"
  if [ -f "$out" ] && [ "$out" -nt "$pdf" ]; then
    echo "[skip-cached] $base"
    continue
  fi
  echo "[extract] $base → $safe.txt"
  if pdftotext -layout "$pdf" "$out" 2>/dev/null; then
    extracted=$((extracted+1))
  else
    failed=$((failed+1))
    echo "[FAIL] $base"
  fi
done

echo ""
echo "=== DONE ==="
echo "extracted: $extracted"
echo "skipped:   $skipped (other-slot domains)"
echo "failed:    $failed"
echo "output:    $OUT_DIR"
ls -la "$OUT_DIR" | tail -5
