#!/bin/bash

echo "=== DISPATCHER WIRING SUMMARY ==="
echo ""

# Count references in each dispatcher
for disp in src/tools/dispatchers/*.ts; do
  dispname=$(basename $disp)
  mill_count=$(grep -o "Mill\|mill\|Speed\|speed\|Cutting\|cutting\|Deflection\|deflection\|Chatter\|chatter\|Surface\|surface\|ToolPath\|toolpath" "$disp" 2>/dev/null | wc -l)
  
  if [ "$mill_count" -gt 20 ]; then
    echo "$dispname: $mill_count milling-related references"
    # Show which engines are imported
    grep -o "from.*\(Mill\|Speed\|Cutting\|Deflection\|Chatter\|Surface\|ToolPath\)[^\"]*" "$disp" 2>/dev/null | sort | uniq | head -5
    echo ""
  fi
done
