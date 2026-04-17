---
name: suggest-lsp-over-grep
enabled: true
event: all
tool_matcher: Grep
action: warn
conditions:
  - field: pattern
    operator: regex_match
    pattern: "^(class |function |interface |type |enum |const |export (class|function|interface|type|const|enum) |def |async function )|^[a-z][a-zA-Z]+[A-Z][a-zA-Z]*$|^[A-Z][a-z]+[A-Z][a-zA-Z]*$"
---

**Consider using Serena LSP tools instead of Grep for symbol lookup.**

Your search pattern looks like a code symbol name. LSP-based tools are faster and more precise:
- `find_symbol` — locate class/function/method by name path
- `find_referencing_symbols` — find all callers/usages of a symbol
- `get_symbols_overview` — get file structure without reading content

Grep remains appropriate for: regex patterns, non-code files (JSON/YAML/MD), string/comment search, and fuzzy discovery when symbol name is unknown.
