// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomersPage } from '../pages/CustomersPage';
import { QuoteBuilderPage } from '../pages/QuoteBuilderPage';
import { ProgramReleasePage } from '../pages/ProgramReleasePage';
import { JobsPage } from '../pages/JobsPage';
import { MessagesPage } from '../pages/MessagesPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { CaptureOpsPage } from '../pages/CaptureOpsPage';
import { OrderTrackingPage } from '../pages/OrderTrackingPage';
import { InventoryPage } from '../pages/InventoryPage';
import { PurchasingPage } from '../pages/PurchasingPage';
import { ShopFloorClockPage } from '../pages/ShopFloorClockPage';
import { QualityManagementPage } from '../pages/QualityManagementPage';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import { clearShellSession, persistAdminShellSession } from '../features/operating-system/shellSession';
import {
  customerList,
  jobDashboard,
  orderList,
  listEmployees,
  qualityCalibrationDashboard,
  qualityFAIList,
  qualityKPIs,
  qualityNCRList,
  quoteCompareMaterials,
  quoteEstimate,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    customerList: vi.fn(),
    quoteEstimate: vi.fn(),
    quoteCompareMaterials: vi.fn(),
    jobDashboard: vi.fn(),
    orderList: vi.fn(),
    listEmployees: vi.fn(),
    qualityKPIs: vi.fn(),
    qualityCalibrationDashboard: vi.fn(),
    qualityNCRList: vi.fn(),
    qualityFAIList: vi.fn(),
  };
});

const mockCustomerList = vi.mocked(customerList);
const mockQuoteEstimate = vi.mocked(quoteEstimate);
const mockQuoteCompareMaterials = vi.mocked(quoteCompareMaterials);
const mockJobDashboard = vi.mocked(jobDashboard);
const mockOrderList = vi.mocked(orderList);
const mockListEmployees = vi.mocked(listEmployees);
const mockQualityKpis = vi.mocked(qualityKPIs);
const mockQualityCalibrationDashboard = vi.mocked(qualityCalibrationDashboard);
const mockQualityNcrList = vi.mocked(qualityNCRList);
const mockQualityFaiList = vi.mocked(qualityFAIList);

function renderWorkflowPage(page: React.ReactElement, initialEntry: string) {
  return render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={[initialEntry]}>{page}</MemoryRouter>
    </OperatingSystemProvider>,
  );
}

describe('workflow continuity chain', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    clearShellSession();
    vi.clearAllMocks();

    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

    mockCustomerList.mockResolvedValue({
      result: {
        customers: [
          {
            id: 'CUST-001',
            company: 'Acme Aerospace',
            contact_name: 'Jane Doe',
            pricing_tier: 'preferred',
            status: 'active',
            credit_limit: 50000,
            current_balance: 12000,
            email: 'jane@acme.test',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'customer-list', uncertainty: 0.05 },
    } as any);

    // estimate-flow fix (2026-06-23): /quote/estimate returns the MCP content envelope
    // { result: { type:"text", text } } wrapping the engine's NESTED QuoteEstimateResult. The page
    // unwraps + adaptQuoteEstimate maps nested->flat. Mock the real shape (a flat { result } was the
    // dead-panel/estimate trap) so adapt re-derives unit 8.15 / total 815 / cycle 5.8 / confidence 0.87.
    mockQuoteEstimate.mockResolvedValue({
      result: {
        type: 'text',
        text: JSON.stringify({
          quote_id: 'QE26-WC',
          quantity: 100,
          costs: {
            material: { total: 120 },
            machining: { total: 380, cycle_time_min: 5.8 },
            setup: { total: 95 },
            tooling: { total: 40 },
            overhead: { total: 70 },
            total_cost: 705,
          },
          pricing: { unit_price: 8.15, total_price: 815, margin_pct: 13.5, below_margin_floor: false, margin_floor_pct: 20 },
          confidence_score: 87,
          price_breaks: [
            { qty: 25, unit_price: 11.4, total: 285, lead_days: 7 },
            { qty: 100, unit_price: 8.15, total: 815, lead_days: 10 },
          ],
        }),
      },
    } as any);

    // /quote/compare-materials returns the same envelope wrapping the engine's bare array.
    mockQuoteCompareMaterials.mockResolvedValue({
      result: {
        type: 'text',
        text: JSON.stringify([
          { material: '6061-T6', unit_price: 8.15, total: 815, cycle_time_min: 5.8, tool_life_factor: 1.1 },
          { material: '7075-T6', unit_price: 8.75, total: 875, cycle_time_min: 5.4, tool_life_factor: 0.96 },
        ]),
      },
    } as any);

    mockJobDashboard.mockResolvedValue({
      result: {
        total_active: 1,
        on_schedule: 1,
        at_risk: 0,
        overdue: 0,
        revenue_pipeline: 4000,
        jobs: [
          {
            id: 'JOB-001',
            customer: 'Acme Aerospace',
            part_number: 'BRKT-01',
            status: 'planned',
            due_date: '2026-04-01',
            quantity: 50,
            description: 'Bracket',
            priority: 'normal',
            material: '4140',
            estimated_hours: 8,
            actual_hours: 1,
            created_at: '2026-03-25',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'job-dashboard', uncertainty: 0.05 },
    } as any);

    mockOrderList.mockResolvedValue({
      result: {
        orders: [
          {
            id: 'WO-001',
            job_id: 'JOB-001',
            status: 'in_progress',
            machine: 'VF-2SS',
            est_hours: 5,
            actual_hours: 2,
            quantity: 24,
            part_number: 'BRKT-01',
            notes: 'Traveler released from Jobs',
          },
        ],
      },
    } as any);

    mockListEmployees.mockResolvedValue({
      result: {
        employees: [
          {
            id: 'EMP-001',
            first_name: 'Avery',
            last_name: 'Stone',
            department: 'Machining',
            role: 'Machinist',
            status: 'active',
            labor_rates: { regular: 32, overtime: 48, double_time: 64 },
            skills: ['Setup', 'Production'],
            certifications: [],
            hire_date: '2024-01-01',
          },
        ],
      },
      safety: { score: 0.95, warnings: [] },
      meta: { formula_used: 'employees', uncertainty: 0.05 },
    } as any);

    mockQualityKpis.mockResolvedValue({
      result: {
        first_pass_yield: 97.2,
        scrap_rate: 1.1,
        ncr_count: 2,
        calibration_compliance: 98.5,
        fai_count: 11,
      },
    } as any);

    mockQualityCalibrationDashboard.mockResolvedValue({
      result: { calibrations: [] },
    } as any);

    mockQualityNcrList.mockResolvedValue({
      result: { ncrs: [] },
    } as any);

    mockQualityFaiList.mockResolvedValue({
      result: {
        fais: [
          {
            id: 'FAI-10',
            part_number: 'MANIFOLD-7',
            job_id: 'JOB-77',
            inspector: 'QA-01',
            date: '2026-03-27',
            characteristics: [{ id: 'c1' }],
            overall_pass: true,
          },
        ],
      },
    } as any);
  });

  it('keeps customer provenance and operational focus intact across customer, quote, release, jobs, and messages desks', async () => {
    const customerRender = renderWorkflowPage(<CustomersPage />, '/customers');

    await waitFor(() => {
      expect(screen.getAllByText('Acme Aerospace').length).toBeGreaterThan(0);
    });

    const quoteHref = screen.getByRole('link', { name: 'Open Quote Builder' }).getAttribute('href');
    expect(quoteHref).toContain('/quote-builder?');
    expect(quoteHref).toContain('originSource=customers');
    customerRender.unmount();

    const quoteRender = renderWorkflowPage(<QuoteBuilderPage />, quoteHref ?? '/quote-builder');

    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Quote Builder with context/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText('Generate Kienzle Price Strategy'));

    await waitFor(() => {
      expect(screen.getAllByText('Kienzle shop best price').length).toBeGreaterThan(0);
    });

    const releaseLink = await screen.findByRole('link', { name: /Open matched Print to CNC packet/i });
    const releaseHref = releaseLink.getAttribute('href') ?? '';
    expect(releaseHref).toContain('originSource=customers');
    expect(releaseHref).toContain('focusType=quote');
    quoteRender.unmount();

    const releaseRender = renderWorkflowPage(<ProgramReleasePage />, releaseHref ?? '/print-to-cnc');

    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Print to CNC with follow-up context/i)).toBeDefined();
    });

    const jobsHref = screen.getByRole('link', { name: /Open Jobs follow-up/i }).getAttribute('href');
    expect(jobsHref).toContain('/jobs?');
    expect(jobsHref).toContain('originSource=customers');
    expect(jobsHref).not.toContain('focusType=quote');
    releaseRender.unmount();

    const jobsRender = renderWorkflowPage(<JobsPage />, jobsHref ?? '/jobs');

    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Jobs with context/i)).toBeDefined();
    });

    const messagesHref = screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href');
    expect(messagesHref).toContain('/messages?');
    expect(messagesHref).toContain('originSource=customers');
    expect(messagesHref).toContain('focusType=job');
    expect(messagesHref).toContain('focusJobId=JOB-001');
    jobsRender.unmount();

    renderWorkflowPage(<MessagesPage />, messagesHref ?? '/messages');

    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Messages with follow-up context/i)).toBeDefined();
    });

    const jobsReturnHref = screen.getByRole('link', { name: /Open Jobs follow-up/i }).getAttribute('href');
    expect(jobsReturnHref).toContain('originSource=customers');
    expect(jobsReturnHref).toContain('focusType=job');
    expect(jobsReturnHref).toContain('focusJobId=JOB-001');
  });

  it('preserves customer provenance through release, capture, and shop-floor execution desks', async () => {
    const customerRender = renderWorkflowPage(<CustomersPage />, '/customers');

    await waitFor(() => {
      expect(screen.getAllByText('Acme Aerospace').length).toBeGreaterThan(0);
    });

    const quoteHref = screen.getByRole('link', { name: 'Open Quote Builder' }).getAttribute('href');
    customerRender.unmount();

    const quoteRender = renderWorkflowPage(<QuoteBuilderPage />, quoteHref ?? '/quote-builder');
    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Quote Builder with context/i)).toBeDefined();
    });
    fireEvent.click(screen.getByText('Generate Kienzle Price Strategy'));

    const releaseLink = await screen.findByRole('link', { name: /Open matched Print to CNC packet/i });
    const releaseHref = releaseLink.getAttribute('href') ?? '';
    quoteRender.unmount();

    const releaseRender = renderWorkflowPage(<ProgramReleasePage />, releaseHref || '/print-to-cnc');
    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Print to CNC with follow-up context/i)).toBeDefined();
    });

    const captureHref = screen.getByRole('link', { name: /Open Capture Ops/i }).getAttribute('href') ?? '';
    expect(captureHref).toContain('originSource=customers');
    expect(captureHref).toContain('originType=Customer');
    releaseRender.unmount();

    const captureRender = renderWorkflowPage(<CaptureOpsPage />, captureHref || '/capture');
    await waitFor(() => {
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
      expect(screen.getByText(/Record:/)).toBeDefined();
      expect(screen.getByText(/Customer:/)).toBeDefined();
    });

    const shopFloorHref = screen.getByRole('link', { name: /Return to shop-floor clock/i }).getAttribute('href') ?? '';
    expect(shopFloorHref).toContain('originSource=customers');
    expect(shopFloorHref).toContain('originType=Customer');
    captureRender.unmount();

    renderWorkflowPage(<ShopFloorClockPage />, shopFloorHref || '/shop-clock');

    await waitFor(() => {
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
      expect(screen.getByText(/Record:/)).toBeDefined();
      expect(screen.getByText(/Customer:/)).toBeDefined();
    });
  });

  it('returns from execution desks back into messages with launcher and commercial provenance intact', async () => {
    const customerRender = renderWorkflowPage(<CustomersPage />, '/customers');

    await waitFor(() => {
      expect(screen.getAllByText('Acme Aerospace').length).toBeGreaterThan(0);
    });

    const quoteHref = screen.getByRole('link', { name: 'Open Quote Builder' }).getAttribute('href');
    customerRender.unmount();

    const quoteRender = renderWorkflowPage(<QuoteBuilderPage />, quoteHref ?? '/quote-builder');
    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Quote Builder with context/i)).toBeDefined();
    });
    fireEvent.click(screen.getByText('Generate Kienzle Price Strategy'));

    const releaseHref = (await screen.findByRole('link', { name: /Open matched Print to CNC packet/i })).getAttribute('href') ?? '';
    quoteRender.unmount();

    const releaseRender = renderWorkflowPage(<ProgramReleasePage />, releaseHref || '/print-to-cnc');
    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Print to CNC with follow-up context/i)).toBeDefined();
    });

    const shopFloorHref = screen.getByRole('link', { name: /Open Shop Floor prove-out/i }).getAttribute('href') ?? '';
    expect(shopFloorHref).toContain('originSource=customers');
    releaseRender.unmount();

    const shopFloorRender = renderWorkflowPage(<ShopFloorClockPage />, shopFloorHref || '/shop-clock');
    await waitFor(() => {
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
      // "Print to CNC" provenance now appears in BOTH the launcher link AND the AI-reasoning summary
      // (the estimate renders more context after the estimate-flow fix), so assert presence via
      // getAllByText rather than getByText (which throws on multiple matches). Same intent: the
      // launched-from provenance is on the desk.
      expect(screen.getAllByText(/Print to CNC/).length).toBeGreaterThan(0);
    });

    const messagesHref = screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '';
    expect(messagesHref).toContain('/messages?');
    expect(messagesHref).toContain('source=shop-floor-clock');
    expect(messagesHref).toContain('originSource=customers');
    // This is a QUOTE provenance chain (Quote Builder -> release packet -> shop floor -> messages),
    // so NO job exists yet -- the flow carries focusType=quote + focusQuoteId, NOT focusJobId. The
    // prior `focusJobId=` assertion was stale: it was never reachable (the test crashed earlier on a
    // getByText ambiguity), and a job-less quote flow structurally cannot emit focusJobId (workflowRoute
    // sets focusJobId only `if (focus.jobId)`). Assert the focus provenance the quote flow actually
    // propagates (estimate-flow fix, 2026-06-23 -- live-probed href: focusType=quote&focusQuoteId=...).
    expect(messagesHref).toContain('focusType=quote');
    expect(messagesHref).toContain('focusQuoteId=');
    shopFloorRender.unmount();

    renderWorkflowPage(<MessagesPage />, messagesHref || '/messages');

    await waitFor(() => {
      expect(screen.getByText(/Shop Floor Clock opened Messages with follow-up context/i)).toBeDefined();
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
      expect(screen.getByText(/Record:/)).toBeDefined();
      expect(screen.getByText(/Customer:/)).toBeDefined();
    });
  });

  it('preserves customer provenance when quote strategy branches into purchasing follow-up', async () => {
    const customerRender = renderWorkflowPage(<CustomersPage />, '/customers');

    await waitFor(() => {
      expect(screen.getAllByText('Acme Aerospace').length).toBeGreaterThan(0);
    });

    const quoteHref = screen.getByRole('link', { name: 'Open Quote Builder' }).getAttribute('href');
    customerRender.unmount();

    const quoteRender = renderWorkflowPage(<QuoteBuilderPage />, quoteHref ?? '/quote-builder');
    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Quote Builder with context/i)).toBeDefined();
    });
    fireEvent.click(screen.getByText('Generate Kienzle Price Strategy'));

    const purchasingHref = (await screen.findByRole('link', { name: /Open sourcing posture/i })).getAttribute('href') ?? '';
    expect(purchasingHref).toContain('/purchasing?');
    expect(purchasingHref).toContain('source=quote-builder');
    expect(purchasingHref).toContain('originSource=customers');
    quoteRender.unmount();

    const purchasingRender = renderWorkflowPage(<PurchasingPage />, purchasingHref || '/purchasing');
    await waitFor(() => {
      expect(screen.getByText(/Quote Builder opened Purchasing with sourcing context/i)).toBeDefined();
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
    });

    const messagesHref = screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '';
    expect(messagesHref).toContain('/messages?');
    expect(messagesHref).toContain('source=purchasing');
    expect(messagesHref).toContain('originSource=customers');
    purchasingRender.unmount();

    renderWorkflowPage(<MessagesPage />, messagesHref || '/messages');

    await waitFor(() => {
      expect(screen.getByText(/Purchasing opened Messages with follow-up context/i)).toBeDefined();
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
    });
  });

  it('keeps sourcing and receiving provenance intact across purchasing, inventory, shop floor, and messages desks', async () => {
    const customerRender = renderWorkflowPage(<CustomersPage />, '/customers');

    await waitFor(() => {
      expect(screen.getAllByText('Acme Aerospace').length).toBeGreaterThan(0);
    });

    const quoteHref = screen.getByRole('link', { name: 'Open Quote Builder' }).getAttribute('href');
    customerRender.unmount();

    const quoteRender = renderWorkflowPage(<QuoteBuilderPage />, quoteHref ?? '/quote-builder');
    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Quote Builder with context/i)).toBeDefined();
    });
    fireEvent.click(screen.getByText('Generate Kienzle Price Strategy'));

    const purchasingHref = (await screen.findByRole('link', { name: /Open sourcing posture/i })).getAttribute('href') ?? '';
    expect(purchasingHref).toContain('/purchasing?');
    expect(purchasingHref).toContain('source=quote-builder');
    expect(purchasingHref).toContain('originSource=customers');
    quoteRender.unmount();

    const purchasingRender = renderWorkflowPage(<PurchasingPage />, purchasingHref || '/purchasing');
    await waitFor(() => {
      expect(screen.getByText(/Quote Builder opened Purchasing with sourcing context/i)).toBeDefined();
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
    });

    const inventoryHref = screen.getByRole('link', { name: /Open Inventory intake/i }).getAttribute('href') ?? '';
    expect(inventoryHref).toContain('/inventory?');
    expect(inventoryHref).toContain('source=purchasing');
    expect(inventoryHref).toContain('originSource=customers');
    purchasingRender.unmount();

    const inventoryRender = renderWorkflowPage(<InventoryPage />, inventoryHref || '/inventory');
    await waitFor(() => {
      expect(screen.getByText(/Upstream commercial origin:/i)).toBeDefined();
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
    });

    const shopFloorHref = screen.getByRole('link', { name: /Open Shop Floor follow-up/i }).getAttribute('href') ?? '';
    expect(shopFloorHref).toContain('/shop-clock?');
    expect(shopFloorHref).toContain('source=inventory-desk');
    expect(shopFloorHref).toContain('originSource=customers');
    inventoryRender.unmount();

    const shopFloorRender = renderWorkflowPage(<ShopFloorClockPage />, shopFloorHref || '/shop-clock');
    await waitFor(() => {
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
      expect(screen.getByText(/Record:/)).toBeDefined();
    });

    const messagesHref = screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '';
    expect(messagesHref).toContain('/messages?');
    expect(messagesHref).toContain('source=shop-floor-clock');
    expect(messagesHref).toContain('originSource=customers');
    shopFloorRender.unmount();

    renderWorkflowPage(<MessagesPage />, messagesHref || '/messages');

    await waitFor(() => {
      expect(screen.getByText(/Shop Floor Clock opened Messages with follow-up context/i)).toBeDefined();
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
    });
  });

  it('keeps sourcing and receiving provenance intact when inventory opens messages directly', async () => {
    const customerRender = renderWorkflowPage(<CustomersPage />, '/customers');

    await waitFor(() => {
      expect(screen.getAllByText('Acme Aerospace').length).toBeGreaterThan(0);
    });

    const quoteHref = screen.getByRole('link', { name: 'Open Quote Builder' }).getAttribute('href');
    customerRender.unmount();

    const quoteRender = renderWorkflowPage(<QuoteBuilderPage />, quoteHref ?? '/quote-builder');
    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Quote Builder with context/i)).toBeDefined();
    });
    fireEvent.click(screen.getByText('Generate Kienzle Price Strategy'));

    const purchasingHref = (await screen.findByRole('link', { name: /Open sourcing posture/i })).getAttribute('href') ?? '';
    expect(purchasingHref).toContain('/purchasing?');
    expect(purchasingHref).toContain('source=quote-builder');
    expect(purchasingHref).toContain('originSource=customers');
    quoteRender.unmount();

    const purchasingRender = renderWorkflowPage(<PurchasingPage />, purchasingHref || '/purchasing');
    await waitFor(() => {
      expect(screen.getByText(/Quote Builder opened Purchasing with sourcing context/i)).toBeDefined();
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
    });

    const inventoryHref = screen.getByRole('link', { name: /Open Inventory intake/i }).getAttribute('href') ?? '';
    expect(inventoryHref).toContain('/inventory?');
    expect(inventoryHref).toContain('source=purchasing');
    expect(inventoryHref).toContain('originSource=customers');
    purchasingRender.unmount();

    const inventoryRender = renderWorkflowPage(<InventoryPage />, inventoryHref || '/inventory');
    await waitFor(() => {
      expect(screen.getByText(/Upstream commercial origin:/i)).toBeDefined();
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
    });

    const messagesHref = screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '';
    expect(messagesHref).toContain('/messages?');
    expect(messagesHref).toContain('source=inventory-desk');
    expect(messagesHref).toContain('originSource=customers');
    expect(messagesHref).toContain('focusType=inventory');
    inventoryRender.unmount();

    renderWorkflowPage(<MessagesPage />, messagesHref || '/messages');

    await waitFor(() => {
      expect(screen.getByText(/Inventory desk opened Messages with follow-up context/i)).toBeDefined();
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
      expect(screen.getByText(/Focus:/)).toBeDefined();
    });
  });

  it('preserves customer provenance when quote strategy branches into quality management and back to messages', async () => {
    const customerRender = renderWorkflowPage(<CustomersPage />, '/customers');

    await waitFor(() => {
      expect(screen.getAllByText('Acme Aerospace').length).toBeGreaterThan(0);
    });

    const quoteHref = screen.getByRole('link', { name: 'Open Quote Builder' }).getAttribute('href');
    customerRender.unmount();

    const quoteRender = renderWorkflowPage(<QuoteBuilderPage />, quoteHref ?? '/quote-builder');
    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Quote Builder with context/i)).toBeDefined();
    });
    fireEvent.click(screen.getByText('Generate Kienzle Price Strategy'));

    const qualityHref = (await screen.findByRole('link', { name: 'Open quality handoff' })).getAttribute('href') ?? '';
    expect(qualityHref).toContain('/quality?');
    expect(qualityHref).toContain('source=quote-builder');
    expect(qualityHref).toContain('originSource=customers');
    expect(qualityHref).toContain('focusType=quote');
    quoteRender.unmount();

    const qualityRender = renderWorkflowPage(<QualityManagementPage />, qualityHref || '/quality');
    await waitFor(() => {
      expect(screen.getByText(/Quote Builder opened Quality Management with workflow context/i)).toBeDefined();
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
    });

    const messagesHref = screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '';
    expect(messagesHref).toContain('/messages?');
    expect(messagesHref).toContain('source=quality-management');
    expect(messagesHref).toContain('originSource=customers');
    expect(messagesHref).toContain('focusType=quote');
    qualityRender.unmount();

    renderWorkflowPage(<MessagesPage />, messagesHref || '/messages');

    await waitFor(() => {
      expect(screen.getByText(/Quality Management opened Messages with follow-up context/i)).toBeDefined();
      expect(screen.getAllByText('Customers & CRM').length).toBeGreaterThan(0);
      expect(screen.getByText(/Focus:/)).toBeDefined();
    });
  });

  it('keeps order provenance intact across Order Tracking, Jobs, Invoices, and Messages desks', async () => {
    const orderTrackingRender = renderWorkflowPage(
      <OrderTrackingPage />,
      '/order-tracking?source=jobs&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme+Aerospace&originRecordType=Job&originRecordId=JOB-001&recordType=Job&recordId=JOB-001&focusType=job&focusId=JOB-001&focusJobId=JOB-001&jobId=JOB-001',
    );

    await waitFor(() => {
      expect(screen.getByText(/Jobs opened Order Tracking with execution context/i)).toBeDefined();
      expect(screen.getByText(/Upstream order origin:/i)).toBeDefined();
    });

    const jobsHref = screen.getByRole('link', { name: /Open Jobs follow-up/i }).getAttribute('href') ?? '';
    expect(jobsHref).toContain('/jobs?');
    expect(jobsHref).toContain('source=order-tracking');
    expect(jobsHref).toContain('originSource=customers');
    expect(jobsHref).toContain('focusJobId=JOB-001');

    const invoicesHref = screen.getByRole('link', { name: /Open Invoices follow-up/i }).getAttribute('href') ?? '';
    expect(invoicesHref).toContain('/invoices?');
    expect(invoicesHref).toContain('source=order-tracking');
    expect(invoicesHref).toContain('originSource=customers');
    expect(invoicesHref).toContain('focusJobId=JOB-001');

    const orderTrackingMessagesHref = screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '';
    expect(orderTrackingMessagesHref).toContain('/messages?');
    expect(orderTrackingMessagesHref).toContain('source=order-tracking');
    expect(orderTrackingMessagesHref).toContain('originSource=customers');
    expect(orderTrackingMessagesHref).toContain('focusJobId=JOB-001');
    orderTrackingRender.unmount();

    const jobsRender = renderWorkflowPage(<JobsPage />, jobsHref || '/jobs');
    await waitFor(() => {
      expect(screen.getByText(/opened Jobs with context/i)).toBeDefined();
      expect(screen.getAllByText(/Customers & CRM/).length).toBeGreaterThan(0);
    });

    const jobsMessagesHref = screen.getByRole('link', { name: /Open Messages follow-up/i }).getAttribute('href') ?? '';
    expect(jobsMessagesHref).toContain('/messages?');
    expect(jobsMessagesHref).toContain('originSource=customers');
    expect(jobsMessagesHref).toContain('focusType=job');
    jobsRender.unmount();

    renderWorkflowPage(<MessagesPage />, jobsMessagesHref || orderTrackingMessagesHref || '/messages');
    await waitFor(() => {
      expect(screen.getByText(/opened Messages with follow-up context/i)).toBeDefined();
      expect(screen.getAllByText(/Customers & CRM/).length).toBeGreaterThan(0);
    });

    cleanup();

    renderWorkflowPage(<InvoicesPage />, invoicesHref || '/invoices');
    await waitFor(() => {
      expect(screen.getByText(/opened Invoices with billing context/i)).toBeDefined();
      expect(screen.getAllByText(/Customers & CRM/).length).toBeGreaterThan(0);
    });

    const ledgerHref = screen.getByRole('link', { name: /Open General Ledger follow-up/i }).getAttribute('href') ?? '';
    expect(ledgerHref).toContain('/general-ledger?');
    expect(ledgerHref).toContain('originSource=customers');
    expect(ledgerHref).toContain('jobId=JOB-001');
  });
});
