# PRISM — Manufacturing Intelligence Platform

PRISM is a physics-based manufacturing intelligence system for CNC machining operations. It combines a Model Context Protocol (MCP) server, a Python CAD/CAM engine, and a React web frontend into an 11-layer architecture (L0-L10) that covers everything from raw material constants to operator-facing production planning.

**SAFETY CRITICAL**: This system supports live CNC machine operation. Incorrect parameters can cause equipment damage, tool breakage, or operator injury. All outputs are starting recommendations that must be verified against machine capabilities before use.

---

## Architecture

```
L10  Production Planning & ERP Integration
L9   3D Visualization (WebGL / react-three-fiber)
L8   Web UI (React — PPG, Learning, Digital Twin)
L7   Agent Orchestration (64 agents, swarm patterns)
L6   Knowledge Synthesis & Cross-Source Resolution
L5   Quality Feedback & Sensor-Based Learning
L4   CAM Strategy & Operator Feedback Loop
L3   CAD Engine (CadQuery, Python 3.12)
L2   Physics Engines (Kienzle, Taylor, Malkin, etc.)
L1   Registry Layer (Materials, Machines, Tools)
L0   Data Foundation (JSON databases, formulas)
```

Three runtime components:

- **MCP Server** (`mcp-server/`) — TypeScript, exposes 50+ MCP tools to AI clients
- **CAD Engine** (`cad-engine/`) — Python 3.12, physics calculations and CAD/CAM pipelines
- **Web Frontend** (`web/`) — React + Vite, browser-based operator interface

---

## Prerequisites

| Requirement | Minimum Version |
|-------------|----------------|
| Node.js     | 24.x            |
| npm         | 11.x            |
| Python      | 3.12            |
| Docker      | 24.x (optional) |

---

## Quick Start

```bash
# 1. Install Node dependencies (run from repo root or mcp-server/)
cd H:/prism/mcp-server
npm install

# 2. Build TypeScript
npm run build

# 3. Start MCP server in development mode (watch + reload)
npm run dev

# 4. Run the full TypeScript/Vitest test suite
npm test

# 5. Install Python dependencies and run CAD engine tests
cd H:/prism/cad-engine
pip install -r requirements.txt
pytest
```

---

## Project Structure

```
H:/prism/
├── mcp-server/          # TypeScript MCP server
│   ├── src/
│   │   ├── dispatchers/ # 53 action dispatchers
│   │   ├── engines/     # 218 physics/CAM engines
│   │   ├── registries/  # Material, machine, tool registries
│   │   ├── hooks/       # 220 lifecycle hooks
│   │   └── tools/       # MCP tool definitions
│   ├── tests/           # Vitest test suite (~2570 tests)
│   └── data/            # Roadmap, milestones, formulas (~500)
│
├── cad-engine/          # Python CAD/CAM engine
│   ├── src/
│   │   ├── video_ingest/        # CC-MS1: Video ingestion pipeline
│   │   ├── knowledge_extraction/ # CC-MS2/MS3: LLM-based extraction
│   │   ├── cam_strategy/        # CC-MS5: Strategy learning engine
│   │   ├── feedback/            # CC-EXT-MS2: Operator feedback loop
│   │   ├── sensor/              # CC-EXT-MS3: MTConnect/OPC-UA ingestion
│   │   ├── quality/             # CC-EXT-MS4: CMM/inspection feedback
│   │   └── synthesis/           # CC-EXT-MS5: Cross-source synthesis
│   └── tests/           # pytest suite (~1290 tests)
│
├── web/                 # React frontend
│   ├── src/
│   │   ├── components/  # PPG editor, Learning UI, 3D viewer
│   │   └── hooks/       # API client hooks
│   └── tests/           # Vitest + Playwright E2E (~87 tests)
│
├── data/
│   ├── roadmap-index.json       # v5.3.0 milestone index
│   ├── milestones/              # Per-milestone envelope JSON
│   └── docs/PATH_INDEX.md       # Canonical file path index
│
└── docs/                # Architecture documentation
```

---

## Key Subsystems

| Subsystem         | Count | Notes                                        |
|-------------------|-------|----------------------------------------------|
| Dispatchers       | 53    | Action routing layer                         |
| Engines           | 218   | Physics, CAM, quality, intelligence          |
| Algorithms        | 52    | Standalone algorithmic units                 |
| Hooks             | 220   | PreToolUse / PostToolUse lifecycle           |
| Formulas          | 500   | Indexed in FormulaRegistry                   |
| Materials DB      | 1,047+| 127 parameters per entry (Kienzle, Taylor)   |
| Machines DB       | 824+  | 4-layer machine specifications               |
| Controller Alarms | 2,500+| 12 controller families                       |
| CAM Strategies    | 66    | 16 materials x 6 operations (Tungaloy)       |

---

## Testing

```bash
# TypeScript / Vitest (run from mcp-server/)
npm test                  # full suite, ~2570 tests
npm run test:watch        # watch mode

# Python / pytest (run from cad-engine/)
pytest                    # full suite, ~1290 tests
pytest tests/integration/ # integration tests only

# Web / Vitest + Playwright (run from web/)
npm test                  # unit + component tests (~76)
npm run test:e2e          # Playwright E2E tests (11)
```

Test requirements for contributions: all existing tests must pass, new engine code requires corresponding tests before merge.

---

## Safety System

PRISM uses a binary safety gate on every output:

```
S(x) = APPROVED | BLOCKED
```

All outputs pass through 8 foundational safety laws evaluated by the safety stack before being returned to a caller. An output classified BLOCKED is hard-rejected — no partial results are returned. The safety gate covers:

- Dry-run validation for titanium and reactive materials (fire risk)
- MQL fluid unit enforcement
- Critical data integrity checks (feeds, speeds, depths)
- Operator safety boundary enforcement

The Omega quality score includes a mandatory safety component:

```
Omega(x) = 0.25*R + 0.20*C + 0.15*P + 0.30*S + 0.10*L
```

S >= 0.70 is a hard block threshold. Outputs below this score are not released.

---

## MCP Server Configuration

Create `mcp-server/.env`:

```env
LOG_LEVEL=info
TRANSPORT=stdio
PORT=3000
```

Add to your MCP client configuration (stdio transport):

```json
{
  "mcpServers": {
    "prism": {
      "command": "node",
      "args": ["H:/prism/mcp-server/dist/index.js"],
      "env": { "LOG_LEVEL": "info" }
    }
  }
}
```

---

## Docker Deployment

```bash
# Build and start all services
docker compose up --build

# MCP server only
docker compose up mcp-server

# Run tests inside container
docker compose run --rm mcp-server npm test
```

Environment variables are passed through `.env` at the repo root. See `docker-compose.yml` for service definitions and volume mounts.

---

## Contributing

1. Branch from `main`. Use the prefix `feat/`, `fix/`, or `forge/` depending on change type.
2. Run the full test suite before opening a pull request. No regressions permitted.
3. New engine files require: unit tests, dispatcher wiring, and a MASTER_INDEX entry.
4. TypeScript: strict mode, no implicit `any`. Run `npm run lint` before committing.
5. Python: type hints required, black formatting, no bare `except`.
6. Safety-related changes require sign-off from the safety review checklist in `docs/safety-review.md`.

---

## License

PRISM Manufacturing Intelligence — Proprietary
© 2026 PRISM Development Team

---

**LIVES DEPEND ON CORRECT DATA. VERIFY ALL PARAMETERS BEFORE MACHINE USE.**
