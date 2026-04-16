# PRISM Web Dashboard

React/Vite frontend for the PRISM Manufacturing Intelligence Platform.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server on port 3100 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |
| `npm run test:e2e:headed` | Run E2E tests with visible browser |
| `npm run test:e2e:debug` | Debug E2E tests |

## Project Structure

```
web/
├── e2e/                    # Playwright E2E tests
│   ├── accessibility.spec.ts
│   ├── error-handling.spec.ts
│   ├── navigation.spec.ts
│   ├── performance.spec.ts
│   ├── sfc-calculator.spec.ts
│   ├── visual-consistency.spec.ts
│   └── wire-edm.spec.ts
├── public/                 # Static assets
├── src/
│   ├── api/               # API clients
│   ├── components/        # React components
│   │   ├── calculator/   # Calculator components
│   │   ├── learning/     # Learning components
│   │   ├── ppg/          # Post processor generator
│   │   ├── sfc/          # Speed/Feed Calculator
│   │   ├── shell/        # Shell/commerce components
│   │   ├── ui/           # UI primitives
│   │   ├── viewer/       # 3D viewer components
│   │   └── wedm-studio/  # Wire EDM studio
│   ├── contexts/          # React contexts
│   ├── data/              # Static data/catalogs
│   ├── features/          # Feature modules
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utility libraries
│   ├── pages/             # Page components
│   ├── styles/            # Design system
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── deploy.config.ts       # Deployment configuration
├── docker-compose.yml     # Docker compose for production
├── Dockerfile             # Production Docker image
├── nginx.conf             # Nginx configuration
├── playwright.config.ts   # Playwright configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── vite.config.ts         # Vite configuration
└── LAUNCH_CHECKLIST.md    # Pre-launch verification
```

## Key Features

### Speed & Feed Calculator
Full-featured cutting parameter calculator with:
- Material selection with ISO group classification
- Machine capability matching
- Tool selection with holder packages
- Physics-based speed/feed calculation
- Monte Carlo uncertainty quantification
- G-code program generation

### Wire EDM Studio
6-step wizard for Wire EDM programming:
1. **Import** — DXF/photo to contour
2. **Review** — Validate geometry
3. **WCS** — Set origin and start holes
4. **Toolpath** — Generate profiles
5. **Optimize** — Multipass planning
6. **Program** — G-code export

### Additional Pages
- Job tracking and scheduling
- Quote builder and analytics
- Inventory management
- Quality management
- Shop floor live dashboard
- Employee directory
- Machine rates configuration
- And 100+ more pages...

## Design System

The app follows the "Calculator Studio" design language:
- **Dark theme** with glow accents
- **LED sweep** spectrum effects
- **Status colors**: cyan (info), violet (pending), emerald (success), amber (warning), red (error)

See `src/styles/design-system.ts` for tokens and utilities.

## Testing

### Unit Tests
```bash
npm run test        # Run vitest
```

### E2E Tests
```bash
npm run test:e2e           # Headless
npm run test:e2e:headed    # With browser
npm run test:e2e:ui        # Interactive UI
```

### Accessibility
Tests use @axe-core/playwright for WCAG 2.1 AA compliance.

### Performance
Tests verify Web Vitals (LCP, FID, CLS, FCP).

## Deployment

### Docker
```bash
# Build image
docker build -t prism-web .

# Run container
docker run -p 80:80 prism-web
```

### Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f web

# Stop
docker-compose down
```

### Environment Variables
Copy `.env.example` to `.env` and configure:
- `VITE_API_BASE_URL` — Backend API URL
- `VITE_WS_URL` — WebSocket URL
- See `.env.example` for full list

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

## Contributing

1. Follow the design system for consistency
2. Add E2E tests for new features
3. Ensure accessibility compliance
4. Run `npm run build` before committing

## License

Proprietary — JM Die Company
