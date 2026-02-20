# DC edit_block fails on files with UTF-8 multi-byte chars (arrows, dashes)
Type: error_fix | Phase: DA | MS: MS7
Date: 2026-02-17 | Confidence: verified
Tags: desktop_commander, encoding, workaround

PRISM_RECOVERY_CARD.md has encoded arrows that cause 98% similarity match but not exact. Workaround: use PowerShell script with line-number replacement instead of edit_block for files with special chars.
