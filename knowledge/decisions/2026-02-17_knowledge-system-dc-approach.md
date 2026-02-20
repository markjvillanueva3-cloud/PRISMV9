# Knowledge extraction uses DC-based PowerShell script, not MCP server action
Type: decision | Phase: DA | MS: MS7
Date: 2026-02-17 | Confidence: verified
Tags: knowledge_system, extract_knowledge, DA-MS7

extract_knowledge.ps1 at C:\PRISM\knowledge\ takes entries JSON, writes individual .md files per type dir, updates SESSION_KNOWLEDGE_INDEX.json. Chose DC/PS1 over MCP action to avoid rebuild requirement. Works now.
