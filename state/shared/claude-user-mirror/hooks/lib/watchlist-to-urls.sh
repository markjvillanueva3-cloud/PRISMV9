#!/bin/bash
# watchlist-to-urls.sh — Search YouTube for watchlist items and save URLs
# Usage: bash watchlist-to-urls.sh <category> [max-results-per-item]
# Requires: yt-dlp for search
# Output: url-list files ready for video-watchlist-batch.sh

set -euo pipefail

PYTHON="C:/Users/Admin.DIGITALSTORM-PC/AppData/Local/Programs/Python/Python312/python.exe"
YTDLP="$PYTHON -m yt_dlp"
CATEGORY="${1:?Usage: watchlist-to-urls.sh <search-terms-file|category-keyword>}"
MAX_PER="${2:-1}"
WATCHLIST="C:/PRISM/mcp-server/data/docs/VIDEO_WATCHLIST.md"
OUT_DIR="C:/PRISM/mcp-server/data/video-learned/url-lists"

mkdir -p "$OUT_DIR"

# If argument is a file, use it directly as search terms
if [[ -f "$CATEGORY" ]]; then
    TERMS_FILE="$CATEGORY"
    OUT_FILE="$OUT_DIR/custom-urls.txt"
else
    # Extract search terms from watchlist by category keyword
    TERMS_FILE=$(mktemp)
    # Get lines starting with "- [ ]" that contain the keyword
    grep -i "- \[ \].*$CATEGORY" "$WATCHLIST" 2>/dev/null | \
        sed 's/^- \[ \] //' | \
        sed 's/ — .*$//' | \
        sed 's/ (.*$//' | \
        head -20 > "$TERMS_FILE"
    OUT_FILE="$OUT_DIR/${CATEGORY}-urls.txt"
fi

if [[ ! -s "$TERMS_FILE" ]]; then
    echo "No search terms found for: $CATEGORY"
    exit 1
fi

echo "# YouTube URLs for: $CATEGORY" > "$OUT_FILE"
echo "# Generated: $(date -Iseconds)" >> "$OUT_FILE"
echo "" >> "$OUT_FILE"

COUNT=0
while IFS= read -r term || [[ -n "$term" ]]; do
    [[ -z "$term" || "$term" == \#* ]] && continue
    COUNT=$((COUNT + 1))

    echo "[SEARCH] $term"

    # Use yt-dlp to search YouTube and get top result URL
    URL=$($YTDLP "ytsearch${MAX_PER}:$term machining CNC" \
        --get-id --skip-download 2>/dev/null | head -1)

    if [[ -n "$URL" ]]; then
        echo "# $term" >> "$OUT_FILE"
        echo "https://www.youtube.com/watch?v=$URL" >> "$OUT_FILE"
        echo "[OK]    → https://www.youtube.com/watch?v=$URL"
    else
        echo "# $term — NOT FOUND" >> "$OUT_FILE"
        echo "[MISS]  → no results"
    fi

    sleep 1
done < "$TERMS_FILE"

# Clean up temp file if we created one
[[ "$TERMS_FILE" != "$CATEGORY" ]] && rm -f "$TERMS_FILE"

echo ""
echo "========================================="
echo "URL SEARCH COMPLETE"
echo "Terms searched: $COUNT"
echo "Output: $OUT_FILE"
echo "========================================="
echo ""
echo "Next: bash ~/.claude/hooks/lib/video-watchlist-batch.sh $OUT_FILE"
