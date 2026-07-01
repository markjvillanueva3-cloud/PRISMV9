---
name: reference_memo_extract_fixes_2026_06_09
description: stop-obsidian-memory-extract.mjs (PSN leg
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.655Z
aliases: reference_memo_extract_fixes_2026_06_09
---


# Obsidian memo-extractor: 3 fixed defects (2026-06-09, slot:sierra, OLLAMA-SYNERGY)

`.claude/hooks/stop-obsidian-memory-extract.mjs` is the Stop hook that Ollama-extracts session learnings into the Obsidian vault (PSN leg #1, the persistent brain). It had three defects starving it across the 26-chat fleet. Commits `f1b69db664` (throttle+transcript+security) + `1ecf50b6be` (user-type). 23/23 tests, 3-of-3 scrutiny PASS, live-validated.

1. **FLEET-GLOBAL THROTTLE** — one shared `RATE_FILE` (`.claude/cache/obsidian-extract-last.json`) + a 5-min `MIN_INTERVAL_MS`. `checkRateLimit`/`recordRate` read/wrote that ONE file, so when ANY of the 26 chats extracted, ALL 26 were rate-limited for 5 min -> the memo creator almost never fired for most chats. **Fix:** per-session rate files under `RATE_DIR` keyed by `sessionRateFile(session_id)` + `pruneStaleRateFiles` (24h TTL). The `PER-SESSION ISOLATION` test fails if reverted to fleet-global.

2. **WRONG TRANSCRIPT + never reads stdin** — `getLatestTranscript` used `readFileSync(path).length` (file SIZE) as a recency proxy, then picked the LARGEST `.jsonl` fleet-wide (not this session); and `main()` never read the Stop-hook stdin payload. **Fix:** read the stdin payload (canonical `readFileSync(0)` pattern, mirrors `session-consolidate-graph.mjs:43`), `resolveTranscript(transcript_path)` prefers the explicit path; fallback `getLatestTranscript` fixed to `statSync().mtimeMs` (real recency, no full read).

3. **USER TURNS DROPPED** — `extractMessagesFromTranscript` keyed user turns on `entry.type === "human"`, but live Claude Code transcripts emit `type:"user"` (verified histogram `{user:6, assistant:9, human:0}`). Every user turn was silently dropped -> the extractor LLM saw one-sided (assistant-only) context. **Fix:** accept `"user"` OR `"human"` + handle array-or-string content (text parts only, like the assistant branch).

**Bonus (auto-fix-inline):** `queryOllama` built a shell command by interpolating the JSON request body into a curl string handed to execSync, embedding attacker-influenceable transcript content behind fragile single-quote escaping (command-injection risk) + targeted `localhost` (Node resolves to IPv6 ::1 vs IPv4 ollama.exe). Swapped to the canonical `callOllama` helper (Node fetch -> 127.0.0.1, no shell, `EXTRACT_TIMEOUT_MS=15000` so a Stop hook can't hang). Also `isMain` guard + exported helpers for tests + dropped 3 unused `const file = writeMemory()`.

**Lessons:** (a) a fleet-global throttle/rate-file on a per-chat side effect starves it across the fleet — key throttles by session. (b) file SIZE is never a recency proxy — use mtime, and prefer the Stop-hook stdin `transcript_path`. (c) live Claude Code transcript entries are `type:"user"`/`"assistant"` (NOT `"human"`). (d) never interpolate untrusted content into a shell string for execSync; use the fetch-based `callOllama`. See [[reference_ollama_synergy_audit_2026_06_09]], [[reference_ollama_hooks_localhost_ipv6_bug_2026_05_30]].
