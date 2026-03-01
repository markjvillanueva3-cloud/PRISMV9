# PRISM Web Frontend

Manufacturing intelligence web application built with React 19, TypeScript, Tailwind CSS 4, and Vite 7.

## Prerequisites

- Node.js 22+
- npm 10+
- PRISM MCP Server running on `localhost:3000` (for API calls)

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (port 5173, proxies /api to MCP server)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Serve production build locally |
| `npm run lint` | ESLint check |
| `npm run e2e` | Run Playwright E2E tests (headless) |
| `npm run e2e:headed` | Run Playwright E2E tests (visible browser) |

## Architecture

### Component Tree

```
App
 └─ AppShell (sidebar nav + header + ErrorBoundary + OfflineBanner)
     └─ Routes
         └─ /sfc → SfcCalculatorPage (lazy-loaded)
              ├─ SmartMaterialSelector  (7 ISO groups, search + filter)
              ├─ OperationSelector      (milling, turning, drilling, etc.)
              ├─ SmartToolSelector      (filtered by operation)
              ├─ SmartMachineSelector   (filtered by compatibility)
              ├─ ParameterPanel         (tool_diameter, teeth, depth, width, coolant)
              ├─ CompatibilityValidator (material-tool-machine cross-check)
              ├─ ResultsDisplay         (speed, feed, force, power, safety)
              ├─ AdvancedCharts         (Recharts visualizations)
              ├─ ComparisonView         (side-by-side result comparison)
              ├─ CalculationHistory     (localStorage-persisted history)
              └─ PresetManager          (save/load parameter presets)
```

### State Flow

```
User Input → SfcCalculatorPage (local state)
  → useSfcCalculate() hook
    → sfcApi.calculate() (POST /api/v1/sfc/calculate)
      → MCP Server prism_calc dispatcher
        → ManufacturingCalculations engine
  → ResultsDisplay + AdvancedCharts (render response)
  → ComparisonView (localStorage snapshots)
```

- **State management**: React useState + custom hooks (no external state library)
- **API layer**: `src/api/client.ts` — fetch wrapper with 15s timeout, AbortController, typed errors
- **Hooks**: `src/hooks/useSfc.ts` — `useApiCall` generic with loading/error/abort states
- **Persistence**: localStorage for comparison snapshots and calculation history

### API Integration

All API calls go through `/api/v1/sfc/*` endpoints, proxied to the MCP server:

| Endpoint | Dispatcher Action | Engine |
|----------|------------------|--------|
| `/calculate` | `speed_feed` | ManufacturingCalculations |
| `/cycle-time` | `cycle_time` | ManufacturingCalculations |
| `/engagement` | `cutting_force` | ManufacturingCalculations |
| `/deflection` | `tool_deflection` | AdvancedCalculations |
| `/power-torque` | `power_torque` | ManufacturingCalculations |
| `/surface-finish` | `surface_finish` | ManufacturingCalculations |
| `/tool-life` | `tool_life` | ManufacturingCalculations |

### Key Directories

```
web/
├── e2e/                    # Playwright E2E tests
├── src/
│   ├── api/                # API client + SFC endpoint wrappers
│   ├── components/
│   │   ├── layout/         # AppShell (sidebar + header)
│   │   ├── sfc/            # SFC Calculator components (13 files)
│   │   └── ui/             # Reusable UI primitives (Button, Card, Input, etc.)
│   ├── data/               # Static data (materials, operations, tools, machines)
│   ├── hooks/              # Custom React hooks (useSfc)
│   ├── pages/              # Page-level components
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utilities (PDF report generation)
├── Dockerfile              # Multi-stage: node build → nginx serve
├── nginx.conf              # SPA fallback + API proxy + security headers
├── playwright.config.ts    # Playwright config (Chromium headless)
└── vite.config.ts          # Vite config (proxy, chunk splitting)
```

## Testing

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time)
npx playwright install --with-deps chromium

# Run tests
npm run e2e

# Run with visible browser
npm run e2e:headed
```

11 E2E tests cover the SFC calculator flow: material selection, operation selection, parameter entry, calculation, tab navigation, presets, and keyboard accessibility.

## Deployment

### Docker

```bash
# Build and run with Docker Compose
docker compose up --build

# Frontend: http://localhost:8080
# API: http://localhost:3000
```

The frontend Dockerfile uses a multi-stage build (node 22 → nginx alpine) and runs as non-root user. The nginx config handles SPA routing fallback and proxies `/api` to the MCP server.

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3000` | MCP server URL |
| `VITE_WS_URL` | `ws://localhost:3000` | WebSocket URL |
| `VITE_ENABLE_PPG` | `false` | Enable Post Processor Generator |
| `VITE_ENABLE_LEARNING` | `false` | Enable Learning module |
| `VITE_ENABLE_ERP` | `false` | Enable ERP module |
| `VITE_ENABLE_VIEWER` | `false` | Enable 3D Viewer |

### CI/CD

GitHub Actions workflow (`.github/workflows/web.yml`) runs on pushes to `web/`:
1. Install dependencies
2. Lint
3. TypeScript check + build
4. Install Playwright browsers (cached)
5. Run E2E tests
6. Upload test report artifact

## Accessibility

- Skip-to-content link for keyboard navigation
- ARIA landmarks (navigation, main)
- `prefers-reduced-motion` CSS support
- Focus-visible outlines on interactive elements
- All SVG icons marked `aria-hidden="true"`

## Performance

- **Code splitting**: SfcCalculatorPage lazy-loaded via `React.lazy`
- **Chunk splitting**: react, recharts, jspdf in separate chunks (all < 400KB)
- **AbortController**: In-flight requests cancelled on new calculation
- **Offline detection**: Banner with auto-reconnect
