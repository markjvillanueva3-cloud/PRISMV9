#!/bin/bash
# video-watchlist-batch.sh — Batch download YouTube transcripts locally (ZERO API tokens)
# Usage: bash video-watchlist-batch.sh <url-list-file> [output-dir]
# URL list file: one YouTube URL per line
# Output: one .txt transcript per video in output-dir, plus manifest.json

set -euo pipefail

PYTHON="C:/Users/Admin.DIGITALSTORM-PC/AppData/Local/Programs/Python/Python312/python.exe"
YTDLP="$PYTHON -m yt_dlp"
URL_FILE="${1:?Usage: video-watchlist-batch.sh <url-list-file> [output-dir]}"
OUT_DIR="${2:-C:/PRISM/mcp-server/data/video-learned/transcripts}"

mkdir -p "$OUT_DIR"

MANIFEST="$OUT_DIR/manifest.json"
echo '{"transcripts":[' > "$MANIFEST"
FIRST=true
TOTAL=0
SUCCESS=0
FAIL=0

while IFS= read -r url || [[ -n "$url" ]]; do
    # Skip empty lines and comments
    [[ -z "$url" || "$url" == \#* ]] && continue
    TOTAL=$((TOTAL + 1))

    # Extract video ID for filename
    VID_ID=$(echo "$url" | grep -oP '(?:v=|youtu\.be/|/shorts/)([a-zA-Z0-9_-]{11})' | head -1 | sed 's/.*[=/]//')
    if [[ -z "$VID_ID" ]]; then
        VID_ID="video_${TOTAL}"
    fi

    OUTFILE="$OUT_DIR/${VID_ID}.txt"
    METAFILE="$OUT_DIR/${VID_ID}.meta.json"

    # Skip if already downloaded
    if [[ -f "$OUTFILE" && -s "$OUTFILE" ]]; then
        echo "[SKIP] $VID_ID — already exists"
        if [[ "$FIRST" != true ]]; then echo ',' >> "$MANIFEST"; fi
        FIRST=false
        echo "{\"id\":\"$VID_ID\",\"url\":\"$url\",\"status\":\"cached\",\"file\":\"$OUTFILE\"}" >> "$MANIFEST"
        SUCCESS=$((SUCCESS + 1))
        continue
    fi

    echo "[DOWN] $VID_ID — downloading transcript..."

    # Try auto-generated subtitles first, then manual
    if $YTDLP --write-auto-sub --sub-lang en --skip-download --sub-format vtt \
        -o "$OUT_DIR/${VID_ID}" "$url" 2>/dev/null; then

        # Convert VTT to plain text (strip timestamps, formatting)
        VTT_FILE=$(find "$OUT_DIR" -name "${VID_ID}*.vtt" -o -name "${VID_ID}*.en.vtt" 2>/dev/null | head -1)
        if [[ -n "$VTT_FILE" && -f "$VTT_FILE" ]]; then
            # Strip VTT headers, timestamps, tags, deduplicate lines
            sed '/^WEBVTT/d; /^Kind:/d; /^Language:/d; /^$/d; /^[0-9][0-9]:[0-9]/d; /-->/d; s/<[^>]*>//g' "$VTT_FILE" \
                | awk '!seen[$0]++' > "$OUTFILE"
            rm -f "$VTT_FILE"
            echo "[OK]   $VID_ID — $(wc -l < "$OUTFILE") lines"
            SUCCESS=$((SUCCESS + 1))
        else
            echo "[WARN] $VID_ID — VTT not found, trying fallback..."
            # Fallback: try to get description + info as metadata
            $YTDLP --print title --print description --skip-download "$url" > "$OUTFILE" 2>/dev/null || true
            if [[ -s "$OUTFILE" ]]; then
                SUCCESS=$((SUCCESS + 1))
                echo "[OK]   $VID_ID — metadata only ($(wc -l < "$OUTFILE") lines)"
            else
                FAIL=$((FAIL + 1))
                echo "[FAIL] $VID_ID — no transcript available"
            fi
        fi
    else
        FAIL=$((FAIL + 1))
        echo "[FAIL] $VID_ID — download failed"
    fi

    # Get video metadata (title, channel, duration) — very cheap call
    $YTDLP --print "%(title)s|||%(channel)s|||%(duration)s|||%(view_count)s" \
        --skip-download "$url" 2>/dev/null | head -1 | \
        awk -F'|||' '{printf "{\"title\":\"%s\",\"channel\":\"%s\",\"duration\":%s,\"views\":%s}", $1, $2, $3, $4}' \
        > "$METAFILE" 2>/dev/null || echo '{}' > "$METAFILE"

    # Add to manifest
    if [[ "$FIRST" != true ]]; then echo ',' >> "$MANIFEST"; fi
    FIRST=false
    STATUS=$([[ -s "$OUTFILE" ]] && echo "ok" || echo "failed")
    LINES=$([[ -f "$OUTFILE" ]] && wc -l < "$OUTFILE" || echo 0)
    echo "{\"id\":\"$VID_ID\",\"url\":\"$url\",\"status\":\"$STATUS\",\"file\":\"$OUTFILE\",\"lines\":$LINES}" >> "$MANIFEST"

    # Rate limit: 2 second delay between requests
    sleep 2
done < "$URL_FILE"

echo '],' >> "$MANIFEST"
echo "\"total\":$TOTAL,\"success\":$SUCCESS,\"failed\":$FAIL,\"timestamp\":\"$(date -Iseconds)\"}" >> "$MANIFEST"

echo ""
echo "========================================="
echo "BATCH DOWNLOAD COMPLETE"
echo "Total:   $TOTAL"
echo "Success: $SUCCESS"
echo "Failed:  $FAIL"
echo "Output:  $OUT_DIR"
echo "========================================="
