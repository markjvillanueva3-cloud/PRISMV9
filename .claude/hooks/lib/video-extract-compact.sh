#!/bin/bash
# video-extract-compact.sh — Generate a compact extraction prompt from pre-filtered transcripts
# Produces a single file that Claude can process in ONE read, extracting everything at once
# Usage: bash video-extract-compact.sh <filtered-dir> [batch-size] [output-file]
# This replaces multiple WebSearch+WebFetch+analysis calls with a single Read

set -euo pipefail

FILTERED_DIR="${1:?Usage: video-extract-compact.sh <filtered-dir> [batch-size] [output-file]}"
BATCH_SIZE="${2:-5}"
OUTPUT="${3:-$FILTERED_DIR/batch-extract-input.txt}"

echo "# BATCH EXTRACTION INPUT — $(date -Iseconds)" > "$OUTPUT"
echo "# Process all transcripts below. For each, extract:" >> "$OUTPUT"
echo "# 1. FORMULAS: equation, variables, units, context" >> "$OUTPUT"
echo "# 2. CONSTANTS: name, value, units, material/operation scope" >> "$OUTPUT"
echo "# 3. MODELS: name, type (force/thermal/wear/stability), key equations" >> "$OUTPUT"
echo "# 4. PARAMETERS: Vc/fz/ap/ae recommendations with material+tool context" >> "$OUTPUT"
echo "# 5. TECHNIQUES: strategy name, when to use, key settings" >> "$OUTPUT"
echo "# 6. SAFETY: warnings, limits, failure modes" >> "$OUTPUT"
echo "# Output as compact JSON array — one object per video." >> "$OUTPUT"
echo "" >> "$OUTPUT"

COUNT=0
TOTAL_LINES=0

for filtered in "$FILTERED_DIR"/*.filtered.txt; do
    [[ -f "$filtered" ]] || continue
    [[ $COUNT -ge $BATCH_SIZE ]] && break

    BASENAME=$(basename "$filtered" .filtered.txt)
    LINES=$(wc -l < "$filtered")
    TOTAL_LINES=$((TOTAL_LINES + LINES))
    COUNT=$((COUNT + 1))

    # Read metadata if available
    META_FILE="$FILTERED_DIR/${BASENAME}.meta.json"
    if [[ -f "$META_FILE" ]]; then
        META=$(cat "$META_FILE" 2>/dev/null || echo '{}')
    else
        META="{}"
    fi

    echo "===== VIDEO $COUNT: $BASENAME =====" >> "$OUTPUT"
    echo "META: $META" >> "$OUTPUT"
    cat "$filtered" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo "===== END VIDEO $COUNT =====" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
done

echo "" >> "$OUTPUT"
echo "# BATCH STATS: $COUNT videos, $TOTAL_LINES total lines" >> "$OUTPUT"

# Estimate token cost
EST_TOKENS=$((TOTAL_LINES * 13))  # ~13 tokens per line average

echo ""
echo "========================================="
echo "BATCH INPUT GENERATED"
echo "Videos:     $COUNT"
echo "Lines:      $TOTAL_LINES"
echo "Est tokens: ~${EST_TOKENS} (~\$$(( EST_TOKENS * 15 / 10000 )) at \$15/M input)"
echo "Output:     $OUTPUT"
echo ""
echo "Usage: Claude reads this ONE file and extracts all knowledge in a single pass"
echo "========================================="
