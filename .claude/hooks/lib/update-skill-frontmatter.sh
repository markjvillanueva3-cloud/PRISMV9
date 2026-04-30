#!/usr/bin/env bash
# CCM-MS3: Wrapper for update-skill-frontmatter.py
# Usage: bash update-skill-frontmatter.sh [--dry-run]
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/common.sh"
"$PYTHON_BIN" "$SCRIPT_DIR/update-skill-frontmatter.py" "$@"
