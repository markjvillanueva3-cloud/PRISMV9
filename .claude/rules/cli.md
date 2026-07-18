---
paths:
  - "**/src/cli/**/*.ts"
---

# CLI Conventions

- Uses Commander.js for command definitions
- 4 output formats: json, table, csv, compact
- Use formatters.ts for output formatting
- Support stdin piping and TTY detection
- Config stored in ~/.prism/config.json
- Keep CLI bundle size minimal — lazy load engines
- Exit codes: 0=success, 1=error, 2=validation failure
