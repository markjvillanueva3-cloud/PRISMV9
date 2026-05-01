# PRISM v7.0.0 — Staged Launch Design

## Vision
Transform PRISM from a physics engine into a multi-platform manufacturing intelligence product targeting ALL machinists — hobbyists through enterprise conglomerates, plus software/tooling/machine builder partners.

## Go-to-Market
- **Delivery:** Multi-platform (Web → Desktop → Mobile → API)
- **Strategy:** Staged launch — ship revenue-generating MVP in 6 weeks, expand biweekly
- **Model:** Freemium with 5 tiers + à la carte post-processors

## Tier Structure

| Feature | Free | Starter $19/mo | Pro $49/mo | Shop $199/mo | Enterprise $999/mo |
|---|---|---|---|---|---|
| Speed/Feed calc | 10/day | Unlimited | Unlimited | Unlimited | Unlimited |
| Tool catalog (86K) | 100 results | Full + filters | Full + inventory | Inventory + wear | Fleet sync |
| Material DB (2,957) | 20 common | Full + all factors | Full + custom | Full + custom | Fleet sync |
| Machine profiles (910) | 5 generic | Full + all factors | Full + 50 custom | Unlimited custom | Fleet + custom |
| Playbook (296 rules) | 5/query | 20/query | Full | Full + custom | Full + org rules |
| Tooling comparison/ROI | None | Basic compare | Full + ROI | Full + purchasing | Fleet analytics |
| Quoting | None | Basic estimate | Physics-backed | Multi-job + learning | Auto-calibrating |
| Program gen (mill) | None | None | 5/day | Unlimited | Unlimited + batch |
| Program gen (turn) | None | None | 5/day | Unlimited | Unlimited + batch |
| Program gen (EDM/laser/WJ) | None | None | None | Unlimited | Unlimited + batch |
| Mill-turn / Swiss | None | None | None | Unlimited | Unlimited |
| Post-processor | None | None | Purchase/subscribe | Purchase/subscribe | All included |
| Simulation | None | None | Basic force | Full physics | Predictive + fleet |
| DFM feedback | None | None | 10 rules | Full 30+ rules | Full + custom |
| Print-to-Program | None | None | None | Full pipeline | Full + API |
| Stochastic/MC | None | None | None | Full | Full + fleet learning |
| Troubleshooting/alarms | None | None | Basic lookup | Full diagnostics | Full + repair guides |
| Parts database | None | None | 50 parts | Unlimited | Unlimited + fleet |
| Setup sheets | None | None | Basic | Full + magazine | Full |
| Cycle time analysis | None | Basic | Full + crush | Full | Full + fleet |
| API access | None | None | None | None | Full REST API |
| Users | 1 | 1 | 1 | 5 | Unlimited + SSO |

### Post-Processor Pricing (per controller, 20 available)
| Model | Price |
|---|---|
| Monthly subscribe | $9/mo per controller |
| Annual subscribe | $79/yr per controller (27% off) |
| Permanent purchase | $199 one-time per controller |
| Bundle: 5 controllers | $799 one-time (20% off) |
| Bundle: All 20 | $2,499 one-time (38% off) |
| Enterprise tier | All included in $999/mo |

## Wave Plan (26 weeks)

### Wave 1: "Calculate & Quote" MVP (Weeks 1-6) — LAUNCH
**Goal:** Revenue-generating product with the world's best speed/feed calculator.

**Infrastructure:**
- Merge two React apps (mcp-server/web 42 pages + web/ 29 pages) into unified platform
- Auth system: JWT with Postgres-backed sessions (not in-memory Maps)
- Stripe integration: subscriptions + one-time post-processor purchases
- Tier gating middleware: check user plan before engine access
- Postgres persistence: users, subscriptions, jobs, tool inventory, settings
- Landing page + marketing site
- Swagger UI at /api/docs
- Basic user docs (getting started, API reference)

**Features:**
- Speed/Feed calculator (hero feature) — full UltimateSpeedFeedEngine + SpeedFeedOrchestrator
- Tool catalog browser with search, filters, comparison, pricing
- Material database with full machining factors
- Machine profile browser (910 machines)
- Playbook advisor (296 rules, 18 CAM systems)
- Tribal knowledge search (3,700+ tips)
- Basic quoting (cycle time + material + tooling cost)
- Post-processor store (browse, subscribe, purchase, download)
- User settings + preferences persistence
- Responsive design (works on tablet/phone via browser)

**Tech:**
- React 19 + Vite + Tailwind v4 + Recharts
- Express v5 backend (existing)
- PostgreSQL (via existing schema.sql + pg pool)
- Stripe SDK
- Deploy: Docker + docker-compose (existing) with Postgres added

### Wave 2: "Generate Programs" (Weeks 7-10)
- Milling program generator UX (feature input → G-code output)
- Turning program generator UX (profile input → G-code)
- Print-to-Program wizard (upload print → extract features → generate)
- Setup sheet generation + PDF export
- Cycle time analysis dashboard + optimization suggestions
- G-code editor (Monaco) with syntax highlighting
- Program history / versioning

### Wave 3: "Non-Traditional Processes" (Weeks 11-14)
- Wire EDM program generator (full UX: profile → skim passes → G-code)
- Sinker EDM program generator (electrode design → burn sequence → G-code)
- Laser program generator (cut/mark/weld/drill → G-code)
- Waterjet program generator (profile → nesting → cut order → G-code)
- Sheet nesting optimizer for laser/waterjet
- DXF/SVG import for 2D profiles
- Multi-process router (auto-detect best process for feature)

### Wave 4: "Shop Floor Intelligence" (Weeks 15-18)
- Alarm code database + search (all major controllers)
- Machine troubleshooting wizard (symptom → diagnosis → fix)
- Machine repair/maintenance guides
- Parts database / job library with reuse
- Tool inventory management + wear tracking + reorder alerts
- Magazine layout optimizer
- Cost analysis dashboard (tooling spend, cost-per-part trends)
- Tooling comparison/purchasing advisor with ROI

### Wave 5: "Desktop & Mobile" (Weeks 19-22)
- Tauri desktop app (wraps web app, offline-capable)
- Local physics computation (no cloud dependency)
- PWA manifest for mobile install
- React Native mobile app (iOS + Android)
- Voice query ("What speed should I run 6061 with a half inch endmill?")
- Camera blueprint capture (phone → Print-to-Program)
- Offline mode with sync

### Wave 6: "Enterprise & API" (Weeks 23-26)
- Fleet analytics dashboard (multi-machine, multi-site)
- Self-learning from production data (fleet-wide Bayesian calibration)
- REST API with SDK (TypeScript, Python)
- API usage metering + billing
- SSO/SAML authentication
- OEM/Partner tier (custom pricing, white-label option)
- Kubernetes deployment manifests
- Full documentation site (VitePress)

## Architecture Decisions

### Web App Merge Strategy
The two apps share React 19 + Vite + Tailwind but diverge on:
- mcp-server/web: Three.js 3D viewer, Recharts, 42 ERP-focused pages
- web/: Monaco editor, Playwright E2E, 29 engineering-focused pages

**Decision:** Use web/ as the base (newer Tailwind v4, has E2E tests, has auth/login), port the 42 mcp-server/web pages into it. Deduplicate shared components. Keep Three.js for 3D viewer, keep Monaco for G-code editor.

### Database
**Decision:** PostgreSQL as primary. Extend existing schema.sql with: subscriptions, post_processor_purchases, parts, tool_inventory, machine_configs, alarm_codes, programs, program_versions. Keep in-memory caches for hot data (CacheEngine already exists).

### Authentication
**Decision:** Replace custom token Maps with proper JWT (jose library) + Postgres session storage. Add refresh token rotation. Keep RBAC system. Add Stripe customer_id to user record.

### Payment
**Decision:** Stripe Checkout for subscriptions. Stripe Payment Links for one-time post purchases. Webhook handler for subscription lifecycle events.

### Deployment
**Decision:** Docker Compose for v7.0 (Postgres + app + Prometheus + Grafana). Kubernetes for v7.1+ when horizontal scaling needed.

## Success Metrics
- Wave 1 launch: 1,000 free signups in first month
- Month 2: 50 paid conversions (5% of free)
- Month 3: $5,000 MRR (mix of Starter/Pro + post purchases)
- Month 6: $20,000 MRR, 100 paying customers
- Month 12: $50,000 MRR, desktop app shipped, mobile in beta

## Risks
1. **Web app merge complexity** — two apps with different component libraries. Mitigate: port pages incrementally, not big-bang.
2. **Post-processor pricing resistance** — machinists expect free posts. Mitigate: include generic post for free, charge for controller-specific optimization.
3. **Enterprise sales cycle** — 6-12 months. Mitigate: start conversations in Wave 1, don't depend on enterprise revenue until Wave 6.
4. **Physics accuracy complaints** — if S/F recommendations cause crashes/broken tools. Mitigate: conservative defaults, always show confidence intervals, disclaimer.
