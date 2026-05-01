import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinancialAnalysisPage } from '../pages/FinancialAnalysisPage';
import {
  financialBreakeven,
  financialIRR,
  financialMachineInvestment,
  financialNPV,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    financialNPV: vi.fn(),
    financialIRR: vi.fn(),
    financialMachineInvestment: vi.fn(),
    financialBreakeven: vi.fn(),
  };
});

const mockFinancialNPV = vi.mocked(financialNPV);
const mockFinancialIRR = vi.mocked(financialIRR);
const mockFinancialMachineInvestment = vi.mocked(financialMachineInvestment);
const mockFinancialBreakeven = vi.mocked(financialBreakeven);

beforeEach(() => {
  mockFinancialNPV.mockReset();
  mockFinancialIRR.mockReset();
  mockFinancialMachineInvestment.mockReset();
  mockFinancialBreakeven.mockReset();
});

function renderPage(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <FinancialAnalysisPage />
    </MemoryRouter>,
  );
}

describe('FinancialAnalysisPage', () => {
  it('renders the finance workspace shell', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Financial Analysis' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Calculate NPV/i })).toBeDefined();
  });

  it('runs the NPV lane and renders the decision surface', async () => {
    mockFinancialNPV.mockResolvedValue({
      result: {
        npv: 32500,
        payback_years: 3.4,
        profitability_index: 1.22,
      },
    } as any);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Calculate NPV/i }));

    await waitFor(() => {
      expect(mockFinancialNPV).toHaveBeenCalled();
      expect(screen.getByText('$32,500')).toBeDefined();
      expect(screen.getByText('Accept')).toBeDefined();
    });
  });

  it('switches to machine ROI and records the result summary', async () => {
    mockFinancialMachineInvestment.mockResolvedValue({
      result: {
        npv: 88000,
        irr: 0.19,
        payback_years: 2.8,
        roi: 0.34,
        recommendation: 'INVEST',
      },
    } as any);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Machine ROI/i }));
    fireEvent.click(screen.getByRole('button', { name: /Analyze investment/i }));

    await waitFor(() => {
      expect(mockFinancialMachineInvestment).toHaveBeenCalled();
      expect(screen.getByText('INVEST')).toBeDefined();
      expect(screen.getByText('2.8 yrs')).toBeDefined();
    });
  });

  it('runs the breakeven lane', async () => {
    mockFinancialBreakeven.mockResolvedValue({
      result: {
        breakeven_units: 769.23,
        contribution_margin_per_unit: 65,
        breakeven_revenue: 115385,
      },
    } as any);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Breakeven/i }));
    fireEvent.click(screen.getByRole('button', { name: /Calculate breakeven/i }));

    await waitFor(() => {
      expect(mockFinancialBreakeven).toHaveBeenCalled();
      expect(screen.getByText('769')).toBeDefined();
      expect(screen.getAllByText('$65.00').length).toBeGreaterThan(0);
    });
  });

  it('preserves ledger context through finance handoff links', async () => {
    renderPage([
      '/financial-analysis?source=general-ledger&originSource=customers&originType=Customer&recordType=Customer&originId=CUST-001&recordId=CUST-001&originCustomer=Acme+Aerospace&customer=Acme+Aerospace&focusType=job&focusId=JOB-001&focusJobId=JOB-001&invoiceId=INV-001',
    ]);

    expect(screen.getByText(/General Ledger opened Financial Analysis with finance context/i)).toBeDefined();
    expect(screen.getByText(/Upstream finance origin:/i)).toBeDefined();

    const ledgerHref = screen.getByRole('link', { name: /Return to General Ledger/i }).getAttribute('href') ?? '';
    expect(ledgerHref).toContain('/general-ledger?');
    expect(ledgerHref).toContain('source=financial-analysis');
    expect(ledgerHref).toContain('originSource=customers');

    const invoicesHref = screen.getByRole('link', { name: /Return to Invoices/i }).getAttribute('href') ?? '';
    expect(invoicesHref).toContain('/invoices?');
    expect(invoicesHref).toContain('source=financial-analysis');
    expect(invoicesHref).toContain('originSource=customers');
  });
});
