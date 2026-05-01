#!/bin/bash
# Sync Claude Code user-level settings to the current machine.
# Run this once when you plug the H: drive into a new PC.
#
# Usage: bash H:/prism/sync-user-settings.sh
#        (or from Git Bash: bash /h/prism/sync-user-settings.sh)

set -e

# Detect user home
if [ -z "$HOME" ]; then
  echo "ERROR: \$HOME not set"
  exit 1
fi

TARGET="$HOME/.claude/settings.json"
SOURCE="H:/prism/.claude/hooks/portable-user-settings.json"

if [ ! -f "$SOURCE" ]; then
  echo "ERROR: Source settings not found at $SOURCE"
  exit 1
fi

# Backup existing settings if present
if [ -f "$TARGET" ]; then
  cp "$TARGET" "$TARGET.bak.$(date +%Y%m%d%H%M%S)"
  echo "Backed up existing settings to $TARGET.bak.*"
fi

# Ensure target directory exists
mkdir -p "$(dirname "$TARGET")"

# Copy the portable settings
cp "$SOURCE" "$TARGET"
echo "Synced user settings to $TARGET"
echo "All hook paths point to H:/prism/.claude/hooks/lib/ (portable)"
echo "Python command uses bare 'python' (must be in PATH)"
