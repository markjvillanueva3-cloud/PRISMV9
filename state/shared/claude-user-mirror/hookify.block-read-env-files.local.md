# Hookify Rule: Block reading .env files
type: block
event: PreToolUse
tool: Read

## Pattern
Blocks reading .env files which may contain secrets and waste tokens on credentials.

## Condition
file_path endsWith ".env" OR file_path contains ".env."

## Message
SECURITY + TOKEN SAVE: .env files contain secrets. Never read credentials into context. Use environment variable references instead.
