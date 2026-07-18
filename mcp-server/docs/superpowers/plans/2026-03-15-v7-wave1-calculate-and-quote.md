# PRISM v7.0.0 Wave 1: "Calculate & Quote" MVP — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a revenue-generating manufacturing intelligence web app with the world's best speed/feed calculator, tool catalog, quoting, playbook, and post-processor store — gated by 5 pricing tiers with Stripe billing.

**Architecture:** Merge two existing React apps (web/ with auth + mcp-server/web/ with 55 ERP pages) into a single unified platform. Use web/ as base (Tailwind v4, AuthProvider, LoginPage). Port mcp-server/web pages. Add Stripe subscriptions + one-time purchases. Persist all state to PostgreSQL. Apply MIT-informed design principles: progressive disclosure, information hierarchy, responsive-first, WCAG 2.1 AA accessibility.

**Tech Stack:** React 19, Vite 7, Tailwind v4, Recharts 3, Monaco Editor, Three.js, Express 5, PostgreSQL (pg), Stripe SDK, jose (JWT), Vitest, Playwright.

---

## Chunk 0: MIT 6.005 Software Principles Extraction

### Task 0: Extract MIT 6.005 coding standards into reference doc

**Files:**
- Source: `C:/PRISM_ARCHIVE_2026-02-01/RESOURCES/MIT COURSES/MIT COURSES 5/FULL FILES/6.005-spring-2016/`
- Create: `C:/prism/mcp-server/docs/PRISM_SOFTWARE_PRINCIPLES.md`

- [ ] **Step 1: Read MIT 6.005 readings and extract actionable principles**

Read the 27 readings from the 6.005 course syllabus/readings pages. Extract concrete, enforceable coding standards — not abstract theory.

- [ ] **Step 2: Write PRISM_SOFTWARE_PRINCIPLES.md**

Organize into sections that map to v7 work:

```markdown
# PRISM Software Principles (derived from MIT 6.005 + industry practice)

## 1. Testing (6.005 Reading 3)
- Test-first: write failing test before implementation
- Partition input space: boundary values, empty/null, typical, edge cases
- Every public method has at least one test
- Regression: never delete a passing test

## 2. Code Review Standards (6.005 Reading 4)
- DRY: extract shared logic into utilities, never copy-paste
- Fail fast: validate inputs at function entry, throw on invalid
- No magic numbers: constants with descriptive names
- One purpose per variable: never reuse variable for different meaning
- Good names: verb for functions, noun for variables, descriptive > short

## 3. Specifications & API Design (6.005 Readings 6-7)
- Every API endpoint has preconditions (input schema) and postconditions (response shape)
- Zod schema = precondition contract
- Return types = postcondition contract
- Prefer stronger specs (tighter postconditions)
- Document what changes (mutations) vs what is returned

## 4. Immutability & State (6.005 Reading 9)
- React state: never mutate, always return new objects
- Engine computation: pure functions, no side effects
- Database: append-only audit log, soft deletes preferred

## 5. Abstract Data Types & Interfaces (6.005 Readings 12-14)
- Every engine exposes a typed interface, not raw objects
- Rep invariants: document what must always be true about internal state
- Abstraction functions: document mapping from internal rep to abstract value
- Prefer interfaces over concrete classes for consumer-facing APIs

## 6. Client/Server Design (6.005 Reading 21)
- Wire protocol = JSON over HTTP REST
- Client never assumes server state — stateless requests
- Error responses follow standard envelope: { error: { status, message, code } }
- Auth token in Authorization header, not query params

## 7. GUI Architecture (6.005 Reading 24)
- Strict frontend/backend separation — no business logic in React components
- View tree: components compose, don't inherit
- Input handling: controlled components, form state in React
- Background processing: Web Workers or async for heavy computation

## 8. Concurrency & Real-time (6.005 Readings 19-23)
- WebSocket for push, REST for request/response
- Thread safety via message passing (not shared mutable state)
- Locks only when message passing insufficient
- Always handle connection drop/reconnect gracefully

## 9. Functional Patterns (6.005 Reading 25)
- Prefer map/filter/reduce over imperative loops for data transforms
- Pure functions: same input → same output, no side effects
- Compose small functions into pipelines
```

- [ ] **Step 3: Also extract relevant principles from other MIT courses**

Add sections for:
- **Algorithm Efficiency (6.046J)**: "For collections >1K items (tool catalog 86K, materials 2,957), use indexed search/filter, not linear scan. Paginate results. Debounce search inputs."
- **3D Graphics (6.837)**: "Camera transforms, frustum culling, LOD for Three.js viewer. Don't render what's not visible."
- **Knowledge-Based Systems (6.871)**: "Rule engines for troubleshooting: forward-chain from symptoms to diagnosis. Confidence-weighted rules."

- [ ] **Step 4: Commit**

```bash
cd C:/prism/mcp-server && git add docs/PRISM_SOFTWARE_PRINCIPLES.md
git commit -m "docs: PRISM Software Principles extracted from MIT 6.005 + CS courses"
```

---

## Chunk 1: Foundation — Dependencies, Database, Auth Hardening

### Task 1: Add production dependencies to mcp-server

**Files:**
- Modify: `C:/prism/mcp-server/package.json`

- [ ] **Step 1: Install pg, stripe, jose, bcrypt**

```bash
cd C:/prism/mcp-server && npm install pg stripe jose bcrypt
```

- [ ] **Step 2: Install dev types**

```bash
cd C:/prism/mcp-server && npm install -D @types/pg @types/bcrypt
```

- [ ] **Step 3: Verify package.json has all 4 new deps**

Run: `cat C:/prism/mcp-server/package.json | grep -E "pg|stripe|jose|bcrypt"`
Expected: All 4 listed under `dependencies`

- [ ] **Step 4: Commit**

```bash
cd C:/prism/mcp-server && git add package.json package-lock.json
git commit -m "deps: add pg, stripe, jose, bcrypt for v7 auth+billing"
```

---

### Task 2: Extend PostgreSQL schema for subscriptions + purchases

**Files:**
- Modify: `C:/prism/mcp-server/src/db/schema.sql`

- [ ] **Step 1: Write the migration SQL**

Add after existing tables:

```sql
-- v7: Subscriptions & Billing
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('free','starter','pro','shop','enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','canceled','trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_customer_id);

CREATE TABLE IF NOT EXISTS post_processor_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  controller TEXT NOT NULL,
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('monthly','annual','permanent')),
  stripe_payment_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pp_purchases_user ON post_processor_purchases(user_id);

CREATE TABLE IF NOT EXISTS usage_tracking (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  count INT NOT NULL DEFAULT 1,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, action, date)
);
CREATE INDEX idx_usage_user_date ON usage_tracking(user_id, date);

-- v7: Parts & Programs
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  process TEXT NOT NULL,
  controller TEXT,
  gcode TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_programs_user ON programs(user_id);
```

- [ ] **Step 2: Verify SQL syntax is valid**

Run: `cd C:/prism/mcp-server && node -e "const fs=require('fs'); const sql=fs.readFileSync('src/db/schema.sql','utf8'); console.log('Schema length:', sql.length, 'bytes')"`

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.sql
git commit -m "db: add subscriptions, purchases, usage, programs tables for v7"
```

---

### Task 3: Harden AuthEngine with jose JWT + bcrypt

**Files:**
- Create: `C:/prism/mcp-server/src/engines/AuthEngineV7.ts`
- Modify: `C:/prism/mcp-server/src/middleware/auth.ts`

- [ ] **Step 1: Write failing test**

Create `C:/prism/mcp-server/src/__tests__/auth-v7.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { AuthEngineV7 } from "../engines/AuthEngineV7.js";

describe("AuthEngineV7", () => {
  const auth = new AuthEngineV7("test-secret-key-min-32-characters-long!");

  it("hashPassword and verifyPassword round-trip", async () => {
    const hash = await auth.hashPassword("mypassword");
    expect(hash).not.toBe("mypassword");
    expect(await auth.verifyPassword("mypassword", hash)).toBe(true);
    expect(await auth.verifyPassword("wrong", hash)).toBe(false);
  });

  it("generateToken and verifyToken round-trip", async () => {
    const token = await auth.generateToken({ userId: "u1", role: "engineer", plan: "pro" });
    expect(typeof token).toBe("string");
    const payload = await auth.verifyToken(token);
    expect(payload.userId).toBe("u1");
    expect(payload.role).toBe("engineer");
    expect(payload.plan).toBe("pro");
  });

  it("expired token fails verification", async () => {
    const token = await auth.generateToken({ userId: "u1", role: "viewer", plan: "free" }, "0s");
    await new Promise(r => setTimeout(r, 50));
    await expect(auth.verifyToken(token)).rejects.toThrow();
  });

  it("generateRefreshToken returns different token", async () => {
    const access = await auth.generateToken({ userId: "u1", role: "viewer", plan: "free" });
    const refresh = await auth.generateRefreshToken({ userId: "u1" });
    expect(access).not.toBe(refresh);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/prism/mcp-server && npx vitest run src/__tests__/auth-v7.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement AuthEngineV7**

Create `C:/prism/mcp-server/src/engines/AuthEngineV7.ts` (~200 lines):
- `hashPassword(plain)` — bcrypt hash with salt rounds 12
- `verifyPassword(plain, hash)` — bcrypt compare
- `generateToken(payload, expiresIn?)` — jose SignJWT with HS256, default 1h
- `verifyToken(token)` — jose jwtVerify, return payload
- `generateRefreshToken(payload)` — jose SignJWT, 30d expiry
- `getTierLimits(plan)` — return rate limits per tier

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/prism/mcp-server && npx vitest run src/__tests__/auth-v7.test.ts`
Expected: 4/4 PASS

- [ ] **Step 5: Commit**

```bash
git add src/engines/AuthEngineV7.ts src/__tests__/auth-v7.test.ts
git commit -m "feat(auth): AuthEngineV7 with jose JWT + bcrypt password hashing"
```

---

### Task 4: Tier gating middleware

**Files:**
- Create: `C:/prism/mcp-server/src/middleware/tierGate.ts`

- [ ] **Step 1: Write failing test**

Create `C:/prism/mcp-server/src/__tests__/tier-gate.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { checkTierAccess, TIER_LIMITS } from "../middleware/tierGate.js";

describe("tierGate", () => {
  it("free tier allows speed_feed up to 10/day", () => {
    expect(checkTierAccess("free", "speed_feed", 9)).toEqual({ allowed: true });
    expect(checkTierAccess("free", "speed_feed", 10)).toEqual({ allowed: false, reason: expect.stringContaining("limit") });
  });

  it("starter tier allows unlimited speed_feed", () => {
    expect(checkTierAccess("starter", "speed_feed", 9999)).toEqual({ allowed: true });
  });

  it("free tier blocks program_generate", () => {
    expect(checkTierAccess("free", "program_generate", 0)).toEqual({ allowed: false, reason: expect.stringContaining("upgrade") });
  });

  it("pro tier allows program_generate up to 5/day", () => {
    expect(checkTierAccess("pro", "program_generate", 4)).toEqual({ allowed: true });
    expect(checkTierAccess("pro", "program_generate", 5)).toEqual({ allowed: false, reason: expect.stringContaining("limit") });
  });

  it("enterprise tier allows everything", () => {
    expect(checkTierAccess("enterprise", "program_generate", 99999)).toEqual({ allowed: true });
    expect(checkTierAccess("enterprise", "api_access", 0)).toEqual({ allowed: true });
  });

  it("TIER_LIMITS has all 5 tiers", () => {
    expect(Object.keys(TIER_LIMITS)).toEqual(["free", "starter", "pro", "shop", "enterprise"]);
  });
});
```

- [ ] **Step 2: Run test — expect fail**
- [ ] **Step 3: Implement tierGate.ts** (~150 lines)

Define `TIER_LIMITS` object mapping each tier to feature access rules per the design spec. `checkTierAccess(plan, feature, currentUsage)` returns `{ allowed: boolean, reason?: string }`. Express middleware `requireTier(feature)` that reads `req.user.plan` and `usage_tracking` count.

- [ ] **Step 4: Run test — expect pass**
- [ ] **Step 5: Commit**

```bash
git add src/middleware/tierGate.ts src/__tests__/tier-gate.test.ts
git commit -m "feat(billing): tier gating middleware with 5-tier feature limits"
```

---

### Task 5: Stripe billing engine

**Files:**
- Create: `C:/prism/mcp-server/src/engines/StripeBillingEngine.ts`
- Create: `C:/prism/mcp-server/src/routes/billing.ts`

- [ ] **Step 1: Write failing test**

Create `C:/prism/mcp-server/src/__tests__/stripe-billing.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { StripeBillingEngine } from "../engines/StripeBillingEngine.js";

describe("StripeBillingEngine", () => {
  // Unit tests that don't hit Stripe API (mock mode)
  const billing = new StripeBillingEngine({ testMode: true });

  it("PLAN_PRICES has correct price IDs for all tiers", () => {
    const plans = billing.getPlanPrices();
    expect(plans).toHaveProperty("starter");
    expect(plans).toHaveProperty("pro");
    expect(plans).toHaveProperty("shop");
    expect(plans).toHaveProperty("enterprise");
  });

  it("POST_PROCESSOR_PRICES has subscribe and purchase options", () => {
    const pp = billing.getPostProcessorPrices();
    expect(pp.monthly).toBeDefined();
    expect(pp.annual).toBeDefined();
    expect(pp.permanent).toBeDefined();
    expect(pp.bundle_5).toBeDefined();
    expect(pp.bundle_all).toBeDefined();
  });

  it("calculatePostProcessorPrice returns correct amounts", () => {
    expect(billing.calculatePostProcessorPrice("monthly", 1)).toBe(900); // $9 in cents
    expect(billing.calculatePostProcessorPrice("annual", 1)).toBe(7900);
    expect(billing.calculatePostProcessorPrice("permanent", 1)).toBe(19900);
    expect(billing.calculatePostProcessorPrice("permanent", 5)).toBe(79900); // bundle discount
    expect(billing.calculatePostProcessorPrice("permanent", 20)).toBe(249900); // all bundle
  });
});
```

- [ ] **Step 2: Run test — expect fail**
- [ ] **Step 3: Implement StripeBillingEngine** (~300 lines)

Methods: `createCustomer`, `createSubscription`, `cancelSubscription`, `createPostProcessorCheckout`, `handleWebhook`, `getPlanPrices`, `getPostProcessorPrices`, `calculatePostProcessorPrice`. Test mode returns mock data. Production mode uses Stripe SDK.

- [ ] **Step 4: Implement billing routes** (`src/routes/billing.ts`)

Endpoints: `POST /api/v1/billing/create-checkout`, `POST /api/v1/billing/portal`, `POST /api/v1/billing/webhook`, `GET /api/v1/billing/status`, `POST /api/v1/billing/purchase-post`.

- [ ] **Step 5: Run test — expect pass**
- [ ] **Step 6: Wire billing route into routes/index.ts**
- [ ] **Step 7: Commit**

```bash
git add src/engines/StripeBillingEngine.ts src/routes/billing.ts src/__tests__/stripe-billing.test.ts
git commit -m "feat(billing): Stripe billing engine with subscriptions + post-processor store"
```

---

## Chunk 2: Web App Merge

### Task 6: Set up merged app structure

**Strategy:** Use `C:/prism/web/` as the base. Port pages from `C:/prism/mcp-server/web/` into it. Resolve Tailwind v3→v4 migration for ported pages.

**Files:**
- Modify: `C:/prism/web/package.json` (add Three.js deps)
- Modify: `C:/prism/web/src/App.tsx` (add 55 new routes)

- [ ] **Step 1: Add Three.js dependencies to web/**

```bash
cd C:/prism/web && npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

- [ ] **Step 2: Commit**

```bash
cd C:/prism/web && git add package.json package-lock.json
git commit -m "deps(web): add Three.js for 3D viewer from mcp-server/web merge"
```

---

### Task 7: Port 3D Viewer component

**Files:**
- Create: `C:/prism/web/src/components/viewer/Viewer3D.tsx` (from mcp-server/web)
- Create: `C:/prism/web/src/components/viewer/StockMesh.tsx`
- Create: `C:/prism/web/src/components/viewer/ToolAssembly.tsx`
- Create: `C:/prism/web/src/components/viewer/HeatmapOverlay.tsx`
- Create: `C:/prism/web/src/components/viewer/ToolpathLayer.tsx`
- Create: `C:/prism/web/src/components/viewer/ViewerToolbar.tsx`

- [ ] **Step 1: Copy viewer components**

Copy all 6 files from `C:/prism/mcp-server/web/src/components/viewer/` to `C:/prism/web/src/components/viewer/`. Update any Tailwind v3 classes to v4 equivalents (mostly compatible, but check for `@apply` usage and custom color references).

- [ ] **Step 2: Create ViewerPage in web/**

Create `C:/prism/web/src/pages/ViewerPage.tsx` — port from `mcp-server/web/src/pages/ViewerPage.tsx`, update imports.

- [ ] **Step 3: Test that viewer renders**

Run: `cd C:/prism/web && npm run dev` — navigate to viewer route, confirm 3D canvas renders.

- [ ] **Step 4: Commit**

```bash
cd C:/prism/web && git add src/components/viewer/ src/pages/ViewerPage.tsx
git commit -m "feat(web): port 3D viewer from mcp-server/web"
```

---

### Task 8: Port ERP/Shop pages (batch — 30+ pages)

**Files:**
- Create: 30+ page files in `C:/prism/web/src/pages/`

- [ ] **Step 1: Copy ERP pages from mcp-server/web**

Port these page groups from `C:/prism/mcp-server/web/src/pages/` to `C:/prism/web/src/pages/`:

**ERP/Finance:** DashboardPage, ShopFloorClockPage, TimecardsPage, PayrollPage, InvoicesPage, ProfitabilityPage, ToolingCostPage, PurchaseOrdersPage, GeneralLedgerPage, CapacityPlanningPage

**Quoting:** QuoteBuilderPage, SecondaryOpsPage, QuoteAnalyticsPage, BlueprintQuotePage, SheetMetalQuotePage, AdditiveQuotePage, InjectionMoldPage, StockOptimizerPage, MaterialPricingPage

**Operations:** JobsPage, OrderTrackingPage, EmployeesPage, MachineRatesPage, BatchPlanningPage, DocumentsPage, FinancialAnalysisPage, SchedulingPage, InventoryPage, CustomersPage, HRCompliancePage, ReportsPage, ExportsPage

- [ ] **Step 2: Update Tailwind class references**

Convert any `prism-*` color references from v3 config to v4 CSS custom property equivalents. Most Tailwind utility classes are identical between v3 and v4.

- [ ] **Step 3: Copy shared components needed by ported pages**

From `mcp-server/web/src/components/`: `FormulaCard`, `SafetyBadge`, `ExportButton`, `NotificationCenter`, `CommandPalette`, `Breadcrumbs`, `LoadingState`, `ErrorState`, `charts/` (RadarChart, ProgressRing, BarChart, Sparkline).

- [ ] **Step 4: Commit**

```bash
cd C:/prism/web && git add src/pages/ src/components/
git commit -m "feat(web): port 30+ ERP/shop pages from mcp-server/web"
```

---

### Task 9: Unify App.tsx routing

**Files:**
- Modify: `C:/prism/web/src/App.tsx`

- [ ] **Step 1: Add lazy imports for all new pages**

Add `const ViewerPage = lazy(() => import("./pages/ViewerPage"))` etc. for all 30+ ported pages.

- [ ] **Step 2: Add routes inside AppShell**

Group new routes under the existing `AppShell` layout. Organize sidebar nav into groups matching the design spec:

```
Calculate & Optimize: /sfc, /speed-feed, /toolpath
Generate Programs: /ppg, /cnc-ops, /cam
Simulate & Verify: /viewer, /pipeline, /safety
Quote & Cost: /cost, /quote-builder, /material-pricing, /secondary-ops, ...
Shop Management: /jobs, /scheduling, /inventory, /machine-rates, ...
ERP & Finance: /erp/*, /payroll, /invoices, /general-ledger, ...
Learn: /learning/*
Admin: /admin, /settings, /compliance
```

- [ ] **Step 3: Update AppShell sidebar navigation groups**

Modify `C:/prism/web/src/components/layout/AppShell.tsx` to add new nav groups with icons for the ported pages.

- [ ] **Step 4: Test all routes render without crash**

Run: `cd C:/prism/web && npm run dev` — click through all sidebar links.

- [ ] **Step 5: Commit**

```bash
cd C:/prism/web && git add src/App.tsx src/components/layout/AppShell.tsx
git commit -m "feat(web): unified routing with 80+ pages in grouped sidebar"
```

---

### Task 10: Unify API client with auth token injection

**Files:**
- Modify: `C:/prism/web/src/api/client.ts`
- Create: `C:/prism/web/src/api/erp.ts` (port from mcp-server/web)
- Create: `C:/prism/web/src/api/shop.ts`

- [ ] **Step 1: Create unified API client**

Rewrite `C:/prism/web/src/api/client.ts` to:
- Read JWT from `localStorage` key `prism-auth-token`
- Inject `Authorization: Bearer <token>` on every request
- Base URL: `/api/v1`
- Error handling: parse JSON error body, throw typed errors
- Cover all domains (merge the 890-line mcp-server/web client into domain-specific files)

- [ ] **Step 2: Port ERP API functions**

Create `C:/prism/web/src/api/erp.ts` porting the ERP functions from `mcp-server/web/src/api/client.ts` (shifts, timecards, payroll, invoices, GL, etc.).

- [ ] **Step 3: Test API client sends auth header**

Write test in `C:/prism/web/src/__tests__/api-client.test.ts` verifying token injection.

- [ ] **Step 4: Commit**

```bash
cd C:/prism/web && git add src/api/
git commit -m "feat(web): unified API client with Bearer token injection"
```

---

## Chunk 3: Post-Processor Store & Tier-Gated Features

### Task 11: Post-processor store page

**Files:**
- Create: `C:/prism/web/src/pages/PostProcessorStorePage.tsx`
- Create: `C:/prism/web/src/api/billing.ts`

- [ ] **Step 1: Create billing API client**

```typescript
// C:/prism/web/src/api/billing.ts
export const billingApi = {
  getStatus: () => apiFetch("/billing/status"),
  createCheckout: (plan: string) => apiFetch("/billing/create-checkout", { method: "POST", body: { plan } }),
  createPortal: () => apiFetch("/billing/portal", { method: "POST" }),
  purchasePost: (controller: string, type: string) => apiFetch("/billing/purchase-post", { method: "POST", body: { controller, type } }),
};
```

- [ ] **Step 2: Build PostProcessorStorePage**

Cards for each of 20 controllers showing: name, description, subscribe ($9/mo) or purchase ($199) buttons. Bundle options (5 for $799, all 20 for $2,499). Show "Included" badge for Enterprise users. Show "Active" for already-purchased controllers.

MIT design principles: clear information hierarchy, progressive disclosure (expand controller details on click), accessible color contrast, keyboard navigable cards.

- [ ] **Step 3: Wire route in App.tsx**

Add `/post-processors` route to App.tsx under "Generate Programs" nav group.

- [ ] **Step 4: Commit**

```bash
cd C:/prism/web && git add src/pages/PostProcessorStorePage.tsx src/api/billing.ts
git commit -m "feat(web): post-processor store with subscribe/purchase options"
```

---

### Task 12: Upgrade prompt & usage display

**Files:**
- Create: `C:/prism/web/src/components/billing/UpgradePrompt.tsx`
- Create: `C:/prism/web/src/components/billing/UsageBar.tsx`
- Create: `C:/prism/web/src/components/billing/PricingTable.tsx`

- [ ] **Step 1: Build UpgradePrompt component**

Shows when user hits tier limit. Displays what they need, which tier unlocks it, and a CTA button. Non-intrusive — appears inline, not as a modal.

- [ ] **Step 2: Build UsageBar component**

Shows daily usage: "7/10 calculations used today" with progress bar. Appears in the header for free/starter users.

- [ ] **Step 3: Build PricingTable component**

Full 5-tier comparison table (reusable on landing page and settings page). Responsive — collapses to accordion on mobile.

- [ ] **Step 4: Commit**

```bash
cd C:/prism/web && git add src/components/billing/
git commit -m "feat(web): upgrade prompt, usage bar, pricing table components"
```

---

## Chunk 4: Landing Page & Docs

### Task 13: Marketing landing page

**Files:**
- Create: `C:/prism/web/src/pages/LandingPage.tsx`

- [ ] **Step 1: Build LandingPage**

Sections:
1. **Hero** — "The World's Smartest Speed & Feed Calculator" + CTA "Try Free"
2. **Feature grid** — 6 cards (Calculate, Generate, Simulate, Quote, Troubleshoot, Learn)
3. **Social proof** — "Powered by 2,957 materials, 86,000 tools, 910 machines"
4. **Pricing** — PricingTable component
5. **FAQ** — Accordion
6. **Footer** — Links, copyright

MIT design: F-pattern scanning, clear visual hierarchy, above-the-fold CTA, accessible contrast ratios, semantic HTML.

- [ ] **Step 2: Route unauthenticated users to LandingPage**

Modify App.tsx: if no auth token, show LandingPage at `/`. If authenticated, show dashboard.

- [ ] **Step 3: Commit**

```bash
cd C:/prism/web && git add src/pages/LandingPage.tsx
git commit -m "feat(web): marketing landing page with pricing and CTA"
```

---

### Task 14: Swagger UI for API docs

**Files:**
- Modify: `C:/prism/mcp-server/src/routes/openapi.ts`

- [ ] **Step 1: Install swagger-ui-express**

```bash
cd C:/prism/mcp-server && npm install swagger-ui-express
npm install -D @types/swagger-ui-express
```

- [ ] **Step 2: Serve Swagger UI at /api/docs**

Modify `openapi.ts` to serve `swagger-ui-express` at `/api/docs` using the existing OpenAPI spec.

- [ ] **Step 3: Commit**

```bash
git add src/routes/openapi.ts package.json
git commit -m "feat(api): Swagger UI at /api/docs"
```

---

## Chunk 5: Docker + Deploy + Final Integration

### Task 15: Add PostgreSQL to docker-compose

**Files:**
- Modify: `C:/prism/mcp-server/docker-compose.yml`

- [ ] **Step 1: Add Postgres service**

```yaml
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: prism
      POSTGRES_USER: prism
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-prism-dev-only}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U prism"]
      interval: 10s
      timeout: 5s
      retries: 5
```

Add `DATABASE_URL: postgres://prism:${POSTGRES_PASSWORD:-prism-dev-only}@postgres:5432/prism` to prism-server environment.

Add `postgres_data:` to volumes.

- [ ] **Step 2: Update Dockerfile to build web app**

Add step to build the merged web/ app and copy dist to serve via Express.

- [ ] **Step 3: Test docker-compose up**

```bash
cd C:/prism/mcp-server && docker-compose up -d
# Wait for health checks
docker-compose ps
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml Dockerfile
git commit -m "infra: add PostgreSQL to docker-compose, build web app in Docker"
```

---

### Task 16: Environment configuration

**Files:**
- Create: `C:/prism/mcp-server/.env.example`

- [ ] **Step 1: Create .env.example**

```env
# Database
DATABASE_URL=postgres://prism:prism-dev-only@localhost:5432/prism

# Auth
JWT_SECRET=change-me-to-a-random-64-char-string

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (set after creating products in Stripe dashboard)
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_SHOP=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Post-Processor Stripe Price IDs
STRIPE_PRICE_PP_MONTHLY=price_...
STRIPE_PRICE_PP_ANNUAL=price_...
STRIPE_PRICE_PP_PERMANENT=price_...

# Server
PORT=3000
NODE_ENV=development
```

- [ ] **Step 2: Add .env to .gitignore** (verify it's already there)
- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "config: add .env.example with all v7 environment variables"
```

---

### Task 17: Integration test — full auth + billing flow

**Files:**
- Create: `C:/prism/mcp-server/src/__tests__/v7-integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
import { describe, it, expect } from "vitest";
import { AuthEngineV7 } from "../engines/AuthEngineV7.js";
import { StripeBillingEngine } from "../engines/StripeBillingEngine.js";
import { checkTierAccess } from "../middleware/tierGate.js";

describe("v7 integration: auth → tier → billing", () => {
  const auth = new AuthEngineV7("test-secret-min-32-chars-long-enough!");
  const billing = new StripeBillingEngine({ testMode: true });

  it("free user hits speed_feed limit at 10", async () => {
    const token = await auth.generateToken({ userId: "u1", role: "viewer", plan: "free" });
    const payload = await auth.verifyToken(token);
    expect(checkTierAccess(payload.plan, "speed_feed", 10)).toEqual({ allowed: false, reason: expect.any(String) });
  });

  it("pro user can generate programs up to 5/day", async () => {
    const token = await auth.generateToken({ userId: "u2", role: "engineer", plan: "pro" });
    const payload = await auth.verifyToken(token);
    expect(checkTierAccess(payload.plan, "program_generate", 4)).toEqual({ allowed: true });
  });

  it("post-processor pricing is consistent", () => {
    expect(billing.calculatePostProcessorPrice("permanent", 1)).toBe(19900);
    expect(billing.calculatePostProcessorPrice("permanent", 20)).toBe(249900);
  });
});
```

- [ ] **Step 2: Run all v7 tests**

```bash
cd C:/prism/mcp-server && npx vitest run src/__tests__/auth-v7.test.ts src/__tests__/tier-gate.test.ts src/__tests__/stripe-billing.test.ts src/__tests__/v7-integration.test.ts
```

Expected: All passing

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/v7-integration.test.ts
git commit -m "test: v7 integration test for auth → tier → billing flow"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|---|---|---|
| 1: Foundation | Tasks 1-5 | Dependencies, DB schema, JWT auth, tier gating, Stripe billing |
| 2: Web Merge | Tasks 6-10 | Unified 80+ page React app with auth, 3D viewer, ERP pages |
| 3: Store & Tiers | Tasks 11-12 | Post-processor store, upgrade prompts, pricing table |
| 4: Landing & Docs | Tasks 13-14 | Marketing page, Swagger UI API docs |
| 5: Deploy | Tasks 15-17 | Docker + Postgres, env config, integration tests |

**Total: 17 tasks, ~50 steps, estimated 2-3 days of focused work.**

After Wave 1 ships, Wave 2 (program generators UX) begins immediately.
