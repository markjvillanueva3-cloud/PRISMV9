import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MachineRatesPage } from '../pages/MachineRatesPage';
import { MaterialPricingPage } from '../pages/MaterialPricingPage';
import { StockOptimizerPage } from '../pages/StockOptimizerPage';
import {
  machineRateCompare,
  machineRateEffective,
  machineRateList,
  materialPriceCompare,
  materialPriceLookup,
  materialSurcharge,
  stockSizeCatalog,
  stockSizeOptimize,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    machineRateCompare: vi.fn(),
    machineRateEffective: vi.fn(),
    machineRateList: vi.fn(),
    materialPriceCompare: vi.fn(),
    materialPriceLookup: vi.fn(),
    materialSurcharge: vi.fn(),
    stockSizeCatalog: vi.fn(),
    stockSizeOptimize: vi.fn(),
  };
});

const mockMachineRateCompare = vi.mocked(machineRateCompare);
const mockMachineRateEffective = vi.mocked(machineRateEffective);
const mockMachineRateList = vi.mocked(machineRateList);
const mockMaterialPriceCompare = vi.mocked(materialPriceCompare);
const mockMaterialPriceLookup = vi.mocked(materialPriceLookup);
const mockMaterialSurcharge = vi.mocked(materialSurcharge);
const mockStockSizeCatalog = vi.mocked(stockSizeCatalog);
const mockStockSizeOptimize = vi.mocked(stockSizeOptimize);

function renderPage(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

beforeEach(() => {
  mockMachineRateCompare.mockReset();
  mockMachineRateEffective.mockReset();
  mockMachineRateList.mockReset();
  mockMaterialPriceCompare.mockReset();
  mockMaterialPriceLookup.mockReset();
  mockMaterialSurcharge.mockReset();
  mockStockSizeCatalog.mockReset();
  mockStockSizeOptimize.mockReset();

  mockStockSizeOptimize.mockResolvedValue({
    result: {
      best: { form: 'plate', size: '125 x 75 x 25', waste_pct: 11.4, cost: 184.2 },
      recommended: [
        { form: 'plate', size: '125 x 75 x 25', material: '6061-T6', waste_pct: 11.4, cost: 184.2 },
        { form: 'flat bar', size: '130 x 80 x 25', material: '6061-T6', waste_pct: 18.7, cost: 191.8 },
      ],
    },
  } as any);
  mockStockSizeCatalog.mockResolvedValue({
    result: {
      round_bars: [25, 32, 38],
      flat_bars: [
        [50, 6],
        [75, 10],
      ],
      plate_thicknesses: [12, 19, 25],
      cost_per_kg: 7.25,
      density_kg_m3: 2710,
    },
  } as any);
  mockMaterialPriceLookup.mockResolvedValue({
    result: {
      material: '6061-T6',
      form: 'bar',
      base_price_kg: 6.4,
      adjusted_price_kg: 6.9,
      region: 'us_midwest',
      surcharges: [{ type: 'fuel', amount: 0.45 }],
      total_per_kg: 7.35,
    },
  } as any);
  mockMaterialPriceCompare.mockResolvedValue({
    result: {
      comparisons: [
        { material: '6061-T6', total_per_kg: 7.35, rank: 1 },
        { material: '7075-T6', total_per_kg: 9.15, rank: 2 },
      ],
    },
  } as any);
  mockMaterialSurcharge.mockResolvedValue({
    result: { material: '6061-T6', surcharge_total: 0.45, factors: ['fuel'] },
  } as any);
  mockMachineRateList.mockResolvedValue({
    result: {
      rates: [
        {
          machine_id: 'VF2',
          machine_name: 'Haas VF-2',
          type: 'mill',
          hourly_rate: 85,
          setup_rate: 110,
          overhead_rate: 22,
          effective_rate: 107,
        },
      ],
    },
  } as any);
  mockMachineRateCompare.mockResolvedValue({
    result: {
      winner: 'VF2',
      savings: 18.4,
    },
  } as any);
  mockMachineRateEffective.mockResolvedValue({
    result: {
      machine_id: 'VF2',
      effective_rate: 114.5,
      job_id: 'JOB-900',
    },
  } as any);
});

afterEach(() => {
  cleanup();
});

describe('manufacturing utility pages', () => {
  it('renders the rebuilt stock optimizer and catalog lane', async () => {
    renderPage(<StockOptimizerPage />);

    expect(screen.getByRole('heading', { name: 'Stock Size Optimizer' })).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: 'Find optimal stock' })[1]);

    await waitFor(() => {
      expect(screen.getAllByText('125 x 75 x 25').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$184.20').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Stock Catalog' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Load catalog' })[1]);

    await waitFor(() => {
      expect(screen.getByText('⌀25')).toBeDefined();
      expect(screen.getByText('12 mm')).toBeDefined();
    });
  });

  it('renders the rebuilt material pricing desk and comparison lane', async () => {
    renderPage(<MaterialPricingPage />);

    expect(screen.getByRole('heading', { name: 'Material Pricing' })).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: 'Lookup price' })[1]);

    await waitFor(() => {
      expect(screen.getByText('$7.35/kg')).toBeDefined();
      expect(screen.getByText('fuel')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Compare Materials' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));

    await waitFor(() => {
      expect(screen.getByText('7075-T6')).toBeDefined();
      expect(screen.getByText('$9.15/kg')).toBeDefined();
    });
  });

  it('renders the rebuilt machine rates desk and effective-rate lane', async () => {
    renderPage(<MachineRatesPage />);

    expect(await screen.findByRole('heading', { name: 'Machine Rates' })).toBeDefined();
    expect(screen.getByText('Haas VF-2')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Compare Machines' }));
    fireEvent.change(screen.getByPlaceholderText('CNC-1, CNC-2, CNC-3'), { target: { value: 'VF2, UMC750' } });
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));

    await waitFor(() => {
      expect(screen.getByText(/"winner": "VF2"/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Effective Rate' }));
    fireEvent.change(screen.getByPlaceholderText('JOB-2026-044'), { target: { value: 'JOB-900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

    await waitFor(() => {
      expect(screen.getByText(/"effective_rate": 114.5/i)).toBeDefined();
    });
  });
});
