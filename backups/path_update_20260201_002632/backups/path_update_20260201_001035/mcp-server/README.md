# PRISM MCP Server
## Manufacturing Intelligence Platform

PRISM MCP Server provides Claude with access to comprehensive manufacturing databases, physics calculations, and AI agent orchestration for CNC machining operations.

⚠️ **SAFETY CRITICAL**: This system supports CNC machine operation where incorrect data can cause equipment damage, tool breakage, or operator injury. All calculations are starting recommendations that must be verified against machine capabilities.

---

## Features

### Data Access (15 tools)
- **Materials Database**: 1,047+ materials × 127 parameters (Kienzle, Taylor, Johnson-Cook)
- **Machines Database**: 824+ CNC machines × 4 data layers
- **Controller Alarms**: 2,500+ alarms across 12 controller families
- **Cutting Tools**: Tool geometry, materials, coatings, cutting data
- **Fixtures/Workholding**: Clamping systems and workholding data

### Manufacturing Calculations (12 tools)
- **Speed & Feed**: Optimal cutting parameters with physics-based optimization
- **Kienzle Cutting Force**: Main, feed, and passive force prediction
- **Taylor Tool Life**: Tool wear and replacement timing
- **Formula Library**: 109+ formulas across 20 domains

### Agent Orchestration (10 tools)
- **64 AI Agents**: Specialized for materials, machines, code, safety
- **Swarm Patterns**: 8 coordination patterns for parallel execution
- **Ralph Loops**: Iterative validation with quality convergence

### Knowledge Access (10 tools)
- **135+ Skills**: Controller programming, materials science, CAD/CAM
- **950+ Modules**: Extracted from PRISM v8.89 monolith
- **Knowledge Bases**: Algorithms, manufacturing, AI patterns

### Session Management (10 tools)
- **State Persistence**: CURRENT_STATE.json tracking
- **Checkpoints**: Progress saving every 5-8 items
- **Memory**: Key-value storage surviving context compaction
- **Handoffs**: Clean session transitions

---

## Installation

```bash
# Clone and install
cd C:\PRISM\mcp-server
npm install

# Build TypeScript
npm run build

# Run in development
npm run dev

# Run in production
npm start
```

## Configuration

Create `.env` file:
```env
LOG_LEVEL=info
TRANSPORT=stdio
PORT=3000
```

### MCP Client Configuration

Add to your MCP client configuration:

**For stdio transport:**
```json
{
  "mcpServers": {
    "prism": {
      "command": "node",
      "args": ["C:/PRISM/mcp-server/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**For HTTP transport:**
```json
{
  "mcpServers": {
    "prism": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

---

## Project Structure

```
C:\PRISM\mcp-server\
├── src/
│   ├── index.ts              # Main entry point
│   ├── constants.ts          # Configuration and enums
│   ├── types.ts              # TypeScript interfaces
│   ├── schemas.ts            # Zod validation schemas
│   │
│   ├── tools/
│   │   ├── index.ts          # Tool exports
│   │   ├── dataAccess.ts     # Material, machine, alarm tools
│   │   ├── calculations.ts   # Physics calculations
│   │   ├── agents.ts         # Agent orchestration
│   │   ├── knowledge.ts      # Skills and modules
│   │   └── state.ts          # Session management
│   │
│   ├── services/
│   │   ├── index.ts          # Service exports
│   │   └── dataLoader.ts     # Database loading and caching
│   │
│   ├── registries/
│   │   ├── index.ts          # Registry exports
│   │   └── base.ts           # Base registry class
│   │
│   └── utils/
│       ├── index.ts          # Utility exports
│       ├── logger.ts         # Winston logging
│       ├── errors.ts         # Error handling
│       ├── files.ts          # File operations
│       └── formatters.ts     # Response formatting
│
├── schemas/                   # JSON Schema definitions
│   ├── material-schema.json
│   ├── machine-schema.json
│   └── ...
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Tool Reference

### Data Access Tools

| Tool | Description |
|------|-------------|
| `prism_material_get` | Get material by ID or name |
| `prism_material_search` | Search materials with filters |
| `prism_material_compare` | Compare 2-5 materials |
| `prism_machine_get` | Get machine specifications |
| `prism_machine_search` | Search machines by criteria |
| `prism_alarm_decode` | Decode controller alarm code |
| `prism_alarm_search` | Search alarms by keyword |

### Calculation Tools

| Tool | Description |
|------|-------------|
| `prism_speed_feed` | Calculate optimal cutting parameters |
| `prism_cutting_force` | Kienzle cutting force model |
| `prism_tool_life` | Taylor tool life estimation |
| `prism_formula_calc` | Execute physics formula |

### Agent Tools

| Tool | Description |
|------|-------------|
| `prism_agent_list` | List available agents |
| `prism_agent_invoke` | Invoke single agent |
| `prism_agent_swarm` | Execute agent swarm pattern |
| `prism_ralph_loop` | Iterative validation loop |

### Knowledge Tools

| Tool | Description |
|------|-------------|
| `prism_skill_list` | List available skills |
| `prism_skill_load` | Load skill content |
| `prism_skill_search` | Search within skills |
| `prism_module_list` | List extracted modules |
| `prism_module_load` | Load module source |

### State Tools

| Tool | Description |
|------|-------------|
| `prism_state_load` | Load session state |
| `prism_state_save` | Save session state |
| `prism_state_checkpoint` | Create progress checkpoint |
| `prism_handoff_prepare` | Prepare session handoff |
| `prism_resume_session` | Resume from saved state |
| `prism_memory_save` | Save to persistent memory |
| `prism_memory_recall` | Recall from memory |

---

## Physics Models

### Kienzle Cutting Force Model
```
Fc = kc1.1 × h^(-mc) × b × corrections
```
- kc1.1: Specific cutting force at 1mm chip thickness (N/mm²)
- mc: Kienzle exponent (typically 0.15-0.40)
- h: Chip thickness (mm)
- b: Width of cut (mm)

### Taylor Tool Life Equation
```
V × T^n = C
T = (C/V)^(1/n)
```
- V: Cutting speed (m/min)
- T: Tool life (minutes)
- n: Taylor exponent (typically 0.1-0.5)
- C: Taylor constant

---

## Data Paths

| Resource | Path |
|----------|------|
| State File | `C:\PRISM REBUILD...\CURRENT_STATE.json` |
| Session Memory | `C:\PRISM\state\SESSION_MEMORY.json` |
| Materials | `C:\PRISM REBUILD...\EXTRACTED\materials\` |
| Machines | `C:\PRISM REBUILD...\EXTRACTED\machines\` |
| Controllers | `C:\PRISM REBUILD...\EXTRACTED\controllers\` |
| Skills | `C:\PRISM\skills-consolidated\` |
| Modules | `C:\PRISM\extracted_modules\` |

---

## Quality Standards

### Master Equation
```
Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L
```
- R: Reasoning quality
- C: Code quality
- P: Process adherence
- S: Safety score (**≥0.70 REQUIRED**)
- L: Learning integration

### Safety Gate
**S(x) ≥ 0.70 is a HARD BLOCK** - outputs with lower safety scores are not allowed.

---

## Development

```bash
# Development mode with watch
npm run dev

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Inspect with MCP inspector
npm run inspector
```

---

## Version History

- **1.0.0** (2026-01-31): Initial release
  - 50+ MCP tools across 5 categories
  - Materials, machines, alarms databases
  - Physics calculations (Kienzle, Taylor)
  - Agent orchestration with swarm patterns
  - Session state management

---

## License

PRISM Manufacturing Intelligence - Proprietary
© 2026 PRISM Development Team

---

**LIVES DEPEND ON CORRECT DATA. NO SHORTCUTS.**
