#!/bin/bash
# Anti-Regression Gate (DA-MS4)
# Warns if an edit removes >30% of a file's content

FILE_PATH="${TOOL_INPUT_file_path:-}"
if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then exit 0; fi

BEFORE=$(wc -l < "$FILE_PATH" 2>/dev/null || echo 0)
# This runs pre-edit, so we store the line count for post-edit comparison
echo "$BEFORE" > "/tmp/prism_pre_edit_lines_$(echo "$FILE_PATH" | md5sum | cut -d' ' -f1)" 2>/dev/null
exit 0
