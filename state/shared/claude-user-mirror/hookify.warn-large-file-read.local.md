---
name: warn-large-file-read
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.(log|csv|tsv|xml|sql|dump|bak)$
action: warn
---

**Large file type detected — consider using Grep or offset/limit instead of reading the full file.**

- Use `Grep` to search for specific patterns, or `Read` with `offset`/`limit` for targeted sections
