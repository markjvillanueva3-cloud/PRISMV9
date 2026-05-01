# Cross-Tree Reference Protocol

For future PRISM audits and build work, do not treat `C:\PRISM\mcp-server` as the only source of truth.

Mandatory reference roots:
- `C:\PRISM`
- `C:\PRISM_ARCHIVE_2026-02-01`

Minimum lookup order for engine-capability audits:
1. Active backend: `C:\PRISM\mcp-server\src`
2. Active extracted modules: `C:\PRISM\extracted_modules`, `C:\PRISM\extracted`
3. Archive master/extracted content under `C:\PRISM_ARCHIVE_2026-02-01`
4. Existing audit outputs in `C:\PRISM\audits`

Required rule:
- Before concluding an engine or capability is missing, search both trees and the extracted modules.

Reusable inventory helper:
- `C:\PRISM\scripts\audit\cross_tree_reference_inventory.py`

Expected output:
- `C:\PRISM\audits\cross_tree_reference_inventory.json`

Why this exists:
- The active TypeScript backend does not always contain every engine name or historical implementation.
- Some capabilities exist only as bridges, extracted modules, or archived implementations.
- Audits that only inspect `mcp-server/src` can incorrectly conclude that a capability was never built.
