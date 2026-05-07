#!/bin/bash
# rollback-ecc.sh — Emergency rollback for ECC integration changes
# Restores settings.json from pre-ECC backup
#
# Usage: bash /h/prism/.claude/helpers/rollback-ecc.sh

BACKUP="/h/prism/.claude/settings.json.pre-ecc-backup"
TARGET="/h/prism/.claude/settings.json"

if [ ! -f "$BACKUP" ]; then
  echo "ERROR: Backup file not found at $BACKUP"
  echo "Cannot rollback — no backup exists."
  exit 1
fi

echo "Rolling back settings.json to pre-ECC state..."
cp "$BACKUP" "$TARGET"

# Validate the restored JSON
if node -e "JSON.parse(require('fs').readFileSync('$TARGET','utf8')); console.log('JSON valid')" 2>/dev/null; then
  echo "Rollback successful. settings.json restored and valid."
  echo "Restart your Claude Code session to apply."
else
  echo "WARNING: Restored file has JSON errors. Manual inspection needed."
  exit 1
fi
