# quoting session ee95c8df (2026-05-15, 0.6MB, spine 5KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- None reported in this slice.

**DECISIONS**  
- `/checkin` is the primary slot‑claiming and drift‑resolution tool for PRISM chats.  
- It automatically derives a topic from the most recent commit’s `[SCOPE-MS#]` tag unless overridden with `--topic`.  
- Slot claims are protected by a 30 s recency guard; `--force --confirmRecent` can override it when a slot is truly dead.  
- The golf slot (`--golf`) is dedicated to hygiene tasks and has a strict write‑allowlist (see list of allowed paths).  
- Roadmap flags (`--roadmap devtools`, `--roadmap revenue`) lock the chat into a specific roadmap track and claim an alpha–foxtrot work slot.

**OPERATOR DIRECTIVES**  
- “fix this & : The term 'C:\Users\wompu\AppData\Roaming\npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe' is not recognized … then continue”

**FINDINGS/BUGS**  
- Assistant returned `API Error: 500 Internal server error` twice; likely a transient server issue.  
- Local PowerShell script failed to locate `claude.exe`; path typo or missing installation.  

**DOMAIN SPECIFICS**  
- `/checkin` reads `H:\last.md`, invokes `/system-viz + obsidian + tribal Knowledge`, and loops until all tasks in the current unit are complete (`/goal`).  
- Slot naming convention: `<slot>-<topic>` (e.g., `alpha-git-tree-work`).  
- Golf slot write‑allowlist includes dashboards, ledger JSONLs, report files, shared state directories, and specific config files; any other path is blocked by the pre‑tool hook.  

**TOOLS USED**  
- PRISM command `/checkin` (with its various flags).  
- `/compact` to refresh slot heartbeat.  
- Hooks: `golf-slot-write-allowlist.mjs`, `U-CLEANUP-A5`.  
- System utilities: `/system-viz`, Obsidian, tribal Knowledge integration.  

**OPEN THREADS**  
- Resolve the PowerShell path error for `claude.exe` (verify installation or correct script).  
- Investigate and retry the 500 API errors; monitor status.claude.com.  
- Confirm that slot claims are correctly derived from commit tags in a multi‑chat environment to avoid scope bleed.
