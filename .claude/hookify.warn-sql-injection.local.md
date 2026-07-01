---
name: warn-sql-injection
enabled: true
event: file
conditions:
  - field: new_text
    operator: regex_match
    pattern: (query\(|execute\(|exec\(|raw\(|rawQuery\(|\.sql\()
  - field: new_text
    operator: regex_match
    pattern: (\$\{|"\s*\+|\+\s*"|'\s*\+|\+\s*'|%s|\.format\(|f".*\{|f'.*\{)
action: warn
---

**Possible SQL injection vulnerability detected!**

String interpolation or concatenation in SQL queries is a critical security risk (OWASP A03:2021).

- Always use parameterized queries instead of string interpolation in SQL
- Prefer ORM methods over raw queries; if raw SQL is needed, use the ORM's parameterized interface
