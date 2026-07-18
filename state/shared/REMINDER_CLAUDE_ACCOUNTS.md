# Claude Multi-Account Switching

This system is now built with:

Backend:
- CLAUDE_ACCOUNT_POOL.json (6 accounts)
- ClaudeAccountRouter.py
- claudeAccountDispatcher.ts (MCP actions)
- Registered in main MCP server

Frontend:
- ClaudeAccountsSettings.tsx (full settings page)
- ClaudeAccountManager.tsx (modal)
- ClaudeAccountIndicator.tsx (status bar)
- Command palette entries (conceptual)

Usage:
- Call prism_auth.* actions via /mcp
- Use the settings page to manage accounts
- Rotate accounts when hitting rate limits

Next recommended:
- Wire actual API key switching in the model layer
- Add auto-rotation on rate limit errors
- Add current account to StatusBar
