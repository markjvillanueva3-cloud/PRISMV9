#!/bin/bash
# transcript-prefilter.sh — Pre-filter transcripts to extract machining-relevant sections
# Reduces transcript size by 50-80%, saving massive API tokens
# Usage: bash transcript-prefilter.sh <transcript-dir> [output-dir]
# Output: filtered .filtered.txt files with only machining-relevant content

set -euo pipefail

INPUT_DIR="${1:?Usage: transcript-prefilter.sh <transcript-dir> [output-dir]}"
OUTPUT_DIR="${2:-$INPUT_DIR}"

# Machining keywords (case-insensitive grep patterns)
# These capture the content that matters for PRISM engine enrichment
KEYWORDS=(
    # Speed & Feed
    "speed|feed|rpm|sfm|ipm|ipr|chipload|chip.load|chip.thick"
    "surface.feet|meters.per|millimeters.per|inches.per"
    "depth.of.cut|width.of.cut|radial|axial|stepover|step.over|step.down"
    "ap |ae |fz |vc |fn |vf |n |f |Kc|kc1"
    # Forces & Power
    "force|torque|power|horsepower|kilowatt|spindle.load|cutting.press"
    "specific.cutting|tangential|radial.force|thrust"
    # Tool & Material
    "carbide|hss|ceramic|cbn|pcd|diamond|cobalt|coating|tialn|altin"
    "flute|helix|rake|relief|clearance|edge.prep|hone|chamfer"
    "aluminum|steel|stainless|titanium|inconel|cast.iron|copper|brass"
    "hardness|hrc|brinell|rockwell|tensile|yield"
    # Toolpath & Strategy
    "adaptive|trochoidal|dynamic|high.speed|hsm|hsc|hpc"
    "roughing|finishing|semi.finish|rest.material|pencil|scallop"
    "ramp|helix|plunge|engage|retract|lead.in|lead.out"
    "stepover|cusp|surface.finish|Ra|Rz|roughness"
    # G-Code & Post
    "g-code|gcode|g code|G0[0-9]|G[1-9][0-9]|M0[0-9]|M[1-9][0-9]"
    "post.proc|macro|variable|subroutine|canned.cycle"
    "fanuc|siemens|heidenhain|mazak|haas|okuma"
    "tcp|tcpm|rtcp|tilted.work|plane.func|cycle800|traori"
    # Physics & Models
    "taylor|merchant|kienzle|colding|archard|usui"
    "stability.lobe|chatter|vibration|harmonic|natural.freq|modal"
    "deflection|runout|tir|concentricity"
    "temperature|thermal|heat|coolant|mql|cryogenic|flood"
    "wear|flank|crater|notch|built.up.edge|bue|tool.life"
    # Statistics & Quality
    "cpk|capability|control.chart|spc|tolerance|sigma|anova"
    "taguchi|doe|design.of.experiment|response.surface|optimization"
    "regression|correlation|monte.carlo|weibull"
    # CAM
    "hypermill|mastercam|solidcam|fusion.360|siemens.nx|powermill"
    "imachining|volumill|optirough|maxx.machining"
    "5.axis|five.axis|multi.axis|simultaneous|3.2|indexed"
    # Machine
    "spindle|axis|rapid|accel|jerk|servo|ballbar|backlash"
    "pallet|fixture|workholding|vise|clamp|zero.point"
)

# Build combined grep pattern
PATTERN=""
for kw in "${KEYWORDS[@]}"; do
    if [[ -n "$PATTERN" ]]; then
        PATTERN="$PATTERN|$kw"
    else
        PATTERN="$kw"
    fi
done

TOTAL=0
FILTERED=0
SAVED_LINES=0
KEPT_LINES=0

for transcript in "$INPUT_DIR"/*.txt; do
    [[ -f "$transcript" ]] || continue
    [[ "$transcript" == *.filtered.txt ]] && continue
    [[ "$transcript" == *.meta.json ]] && continue

    BASENAME=$(basename "$transcript" .txt)
    OUTFILE="$OUTPUT_DIR/${BASENAME}.filtered.txt"

    # Skip if already filtered
    if [[ -f "$OUTFILE" && "$OUTFILE" -nt "$transcript" ]]; then
        continue
    fi

    TOTAL=$((TOTAL + 1))
    ORIG_LINES=$(wc -l < "$transcript")

    # Extract lines matching machining keywords + 2 lines context
    grep -iE "$PATTERN" -C 2 "$transcript" 2>/dev/null | \
        awk '!seen[$0]++' > "$OUTFILE" || true

    if [[ -s "$OUTFILE" ]]; then
        FILT_LINES=$(wc -l < "$OUTFILE")
        REDUCTION=$(( (ORIG_LINES - FILT_LINES) * 100 / (ORIG_LINES > 0 ? ORIG_LINES : 1) ))
        echo "[FILT] $BASENAME: $ORIG_LINES → $FILT_LINES lines (-${REDUCTION}%)"
        FILTERED=$((FILTERED + 1))
        SAVED_LINES=$((SAVED_LINES + ORIG_LINES - FILT_LINES))
        KEPT_LINES=$((KEPT_LINES + FILT_LINES))
    else
        # If no matches, keep a small summary (first 20 + last 10 lines)
        head -20 "$transcript" > "$OUTFILE"
        echo "..." >> "$OUTFILE"
        tail -10 "$transcript" >> "$OUTFILE"
        echo "[THIN] $BASENAME: $ORIG_LINES → $(wc -l < "$OUTFILE") lines (low relevance)"
        FILTERED=$((FILTERED + 1))
    fi
done

echo ""
echo "========================================="
echo "PRE-FILTER COMPLETE"
echo "Files processed: $TOTAL"
echo "Files filtered:  $FILTERED"
echo "Lines removed:   $SAVED_LINES"
echo "Lines kept:      $KEPT_LINES"
if [[ $SAVED_LINES -gt 0 && $KEPT_LINES -gt 0 ]]; then
    TOTAL_ORIG=$((SAVED_LINES + KEPT_LINES))
    PCT=$((SAVED_LINES * 100 / TOTAL_ORIG))
    # Estimate token savings: ~1.3 tokens per word, ~10 words per line
    SAVED_TOKENS=$((SAVED_LINES * 13))
    SAVED_COST_CENTS=$((SAVED_TOKENS * 15 / 10000))
    echo "Reduction:       ${PCT}%"
    echo "Est. tokens saved: ~${SAVED_TOKENS}K input"
    echo "Est. cost saved:   ~\$${SAVED_COST_CENTS} (at \$15/M input)"
fi
echo "========================================="
