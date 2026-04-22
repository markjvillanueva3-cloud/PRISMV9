#!/bin/bash
# pretooluse-token-saver.sh — Intercepts large Read/Glob calls
# Suggests targeted alternatives to reduce token consumption.
# Wired as PreToolUse hook for Read and Glob tools.

# Read stdin into a variable (Windows-compatible — no /dev/stdin)
INPUT=$(cat)

# Parse tool info using Node with stdin passed via echo
PARSED=$(echo "$INPUT" | node -e "
  let buf = '';
  process.stdin.on('data', c => buf += c);
  process.stdin.on('end', () => {
    try {
      const d = JSON.parse(buf);
      const p = d.tool_input || {};
      console.log(JSON.stringify({
        tool: d.tool_name || '',
        file_path: p.file_path || '',
        has_limit: p.limit ? true : false,
        pattern: p.pattern || '',
        path: p.path || ''
      }));
    } catch(e) { console.log('{}'); }
  });
" 2>/dev/null)

TOOL=$(echo "$PARSED" | node -e "let b='';process.stdin.on('data',c=>b+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(b).tool||'')}catch(e){console.log('')}});" 2>/dev/null)

if [ "$TOOL" = "Read" ]; then
  FILE_PATH=$(echo "$PARSED" | node -e "let b='';process.stdin.on('data',c=>b+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(b).file_path||'')}catch(e){console.log('')}});" 2>/dev/null)
  HAS_LIMIT=$(echo "$PARSED" | node -e "let b='';process.stdin.on('data',c=>b+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(b).has_limit?'yes':'no')}catch(e){console.log('no')}});" 2>/dev/null)

  # Skip targeted reads (already have offset+limit)
  if [ "$HAS_LIMIT" = "yes" ]; then
    echo '{"continue": true}'
    exit 0
  fi

  # Check file size — warn on files >500 lines
  if [ -f "$FILE_PATH" ]; then
    LINES=$(wc -l < "$FILE_PATH" 2>/dev/null || echo 0)
    LINES=$(echo "$LINES" | tr -d ' ')
    if [ "$LINES" -gt 500 ] 2>/dev/null; then
      echo "{\"additionalContext\": \"TOKEN SAVER: $FILE_PATH is $LINES lines. Consider using offset+limit to read only the section you need, or use Grep to find specific content first.\"}"
      exit 0
    fi
  fi
fi

if [ "$TOOL" = "Glob" ]; then
  PATTERN=$(echo "$PARSED" | node -e "let b='';process.stdin.on('data',c=>b+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(b).pattern||'')}catch(e){console.log('')}});" 2>/dev/null)
  SEARCH_PATH=$(echo "$PARSED" | node -e "let b='';process.stdin.on('data',c=>b+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(b).path||'')}catch(e){console.log('')}});" 2>/dev/null)

  # Warn on very broad glob patterns at repo root
  if [ -z "$SEARCH_PATH" ] || [ "$SEARCH_PATH" = "H:/prism" ] || [ "$SEARCH_PATH" = "H:\\prism" ]; then
    case "$PATTERN" in
      "**/*"|"**/*.ts"|"**/*.js"|"*")
        echo "{\"additionalContext\": \"TOKEN SAVER: Broad glob '$PATTERN' at repo root may return 1000+ results. Consider: (1) Navigate with ENGINE_DIGEST.md or DISPATCHER_DIGEST.md first, (2) Use a more specific path like H:/prism/mcp-server/src/engines/, (3) Use Grep for content search instead.\"}"
        exit 0
        ;;
    esac
  fi
fi

echo '{"continue": true}'
