# PRISM Portable Context — Read This First on Any Machine

## Setup Requirements (per machine, one-time)
1. Node.js installed and `node` on PATH
2. Claude Code CLI: `npm install -g @anthropic-ai/claude-code`
3. Claude Code VS Code extension: `code --install-extension anthropic.claude-code`
4. H: drive mounted with PRISM project at `H:\prism`
5. Build: `cd H:/prism/mcp-server && npm run build`

## How to Resume on Any PC
### Terminal:
```bash
cd H:/prism
claude
# Then say: /startup
```

### VS Code:
1. Open VS Code → File → Open Folder → `H:\prism`
2. Claude Code panel: Ctrl+L
3. Say: "Read H:/prism/state/PORTABLE_CONTEXT.md then /startup"

## Current Session State (2026-04-05)

### Completed This Session:
- **PP-MOAT-MS2** COMPLETE — Learning loop (calibrated constants, coupled ODE, RL formatting, LCA)
- **PP-MOAT-MS4** COMPLETE — PPG UX (file I/O, clipboard, diff viewer, history, lightsaber borders)
- **WEDM-HARDEN-MS0 S6** COMPLETE — Frontend hardening (component decomposition, canvas perf, a11y)
- **PPG-VAR-MS0** COMPLETE — Post Processor Generator product wiring:
  - Generate Post now calls real 38-stage physics pipeline
  - Material picker (2,957 materials, ISO group badges)
  - Tool entry (12 types, 6 materials, diameter, flutes)
  - Auto S/F when material + tool selected (Kienzle physics)
  - Feature toggles drive pipeline stages (HSM→G187, RTCP→G43.4, SSV→G10.6)
  - Controller-specific output (Haas/Fanuc/Siemens/Heidenhain/Mazak)
  - PRISM annotations in output (force/power/life comments)
  - Dual mode (Full PRISM vs Standalone)
  - Post Library pre-configures pipeline from machine profiles
  - 325/325 tests pass, 0 regressions

### What's Next:
- Test with REAL Fusion 360 programs (user's complex multi-operation files)
- Validate post output against real controllers
- PP-REV-MS5/6/7 not yet materialized

### Build: PASS (60.2MB) | Tests: 325/325 PP

## Key Paths (all on H: — portable)
- Project root: H:\prism
- MCP server: H:\prism\mcp-server
- Build: `cd H:/prism/mcp-server && npm run build`
- Tests: `cd H:/prism/mcp-server && npx vitest run`
- Web app: H:\prism\mcp-server\web\src
- State: H:\prism\state
- Milestones: H:\prism\mcp-server\data\milestones
- Handoffs: H:\prism\state\shared\handoffs
