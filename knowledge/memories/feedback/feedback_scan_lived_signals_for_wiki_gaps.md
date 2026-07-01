---
name: scan-lived-signals-for-wiki-gaps
description: "Before declaring wiki-saturation in a /loop, scan the PreToolUse/PostToolUse warning stream + SessionStart inject blocks + AGENT_CHAT unread items — lived signals reveal doctrine gaps that coverage maps miss."
aliases: feedback_scan_lived_signals_for_wiki_gaps
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.442Z
---


In a /loop session shipping discipline wikis (or any continuous-value /loop), the natural endpoint feels like saturation: "I've covered the obvious cluster; no more high-value gaps." But the saturation feeling is often wrong — it reflects exhausted *brainstorm* coverage, not exhausted *lived* coverage.

**The trap:** scanning by topic name ("do I have a `parallel-tool` wiki? a `commit-conventions` wiki?") finds gaps that are *namable* but misses gaps that are *experienceable*. Many recurring doctrine gaps surface only as **hook warnings, inject blocks, or peer-claim chatter** — undocumented patterns that bite a chat in real time but never get re-derived as "here is a topic I should wiki."

**Lived examples this session (2026-05-18..19, slot lima /loop):**
1. After 14 wikis I called saturation. Next tick I scanned the hook stream and found `html-companion-guard` warnings firing on multiple commits — undocumented despite being on every spec/research commit. Shipped wiki #15.
2. After 15 wikis I called saturation again. Next tick I scanned `## Recent regressions` for atomic-write incidents → found the [[reference_roadmap_index_writer_consolidate_2026_05_19]] 5-writer `.tmp` race + the [[reference_seed_ghost_v8_string_cap]] V8 string cap → those plus my own JSONL/JSON file observations crystallized into wiki #16 (jsonl-ledger-conventions).

Both wiki-15 and wiki-16 came from lived signals, not topic brainstorm.

**Why:** coverage maps cluster by what you THINK to look for. Lived signals are what the system actually keeps telling you to look at — they're filtered for recurrence by the hook/warning infrastructure already.

**How to apply (per /loop tick, before declaring no-deliverable):**

1. **Scan the PreToolUse + PostToolUse stream this session** — every hook-emitted warning is a doctrine signal: a thing the system thinks chats keep getting wrong. Examples in PRISM: `html-companion-guard`, `git-add-lane-guard`, `duplication-hard-block`, `ollama-pipeline-injector`, `recall-counter-write`. If any has fired ≥2 times this session and isn't a consolidated wiki, that's a candidate.

2. **Scan the SessionStart inject blocks** — `## 🧭 PRISM Awareness`, `## 🧭 BUILD_STATE`, `## 🔗 Chat Bus`, `─── /loop awareness ───`. Each block names a system surface. If a surface mentioned there has no consolidated discipline wiki, candidate.

3. **Scan `## Recent regressions` in CLAUDE.md** — these are auto-promoted bug-finding entries. If 2+ recent entries form a pattern (same root cause class, same fix shape), that's a wiki-shaped gap.

4. **Scan AGENT_CHAT unread items** — peer chats often surface issues in the bus that haven't reached the wiki yet. Particularly fleet-wide patterns ("everyone keeps hitting X").

5. **Scan your own commit-stream this session** — fixes you made, warnings you got, retries you needed. If you adjusted approach 3+ times in similar ways, that's a recurring pattern worth doctrine.

If any of these scans surfaces a gap AND the topic is stable enough to wiki (NOT in active flux like a fresh-MS migration), write it. Otherwise the no-deliverable call from [[autonomous-loop-drift-discipline]] is valid.

**The complement** — when NOT to write a wiki:

- Topic is mid-migration (its current shape will be wrong in a week)
- Topic is genuinely one-incident-only (memory, not wiki)
- Topic exists as a memory + the memory captures everything (don't promote prematurely)
- The lived signal is one-time noise (e.g. a watchdog SLOW warning on one Bash) not a recurring pattern

**Related:** [[autonomous-loop-drift-discipline]] (when to call no-deliverable), [[wiki-automation-discipline]] (what happens after you ship a wiki), [[obsidian-vault-flow]] (memory vs wiki decision).
