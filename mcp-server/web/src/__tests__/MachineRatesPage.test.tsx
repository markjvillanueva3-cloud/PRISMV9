// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MachineRatesPage } from '../pages/MachineRatesPage';
import { machineRateCompare, machineRateEffective, machineRateList } from '../api/client';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    machineRateCompare: vi.fn(),
    machineRateEffective: vi.fn(),
    machineRateList: vi.fn(),
  };
});

const mockMachineRateCompare = vi.mocked(machineRateCompare);
const mockMachineRateEffective = vi.mocked(machineRateEffective);
const mockMachineRateList = vi.mocked(machineRateList);

function renderPage(
  initialEntries = ['/machine-rates?source=quote-builder&focusType=packet&focusId=PKT-200&focusPacketId=PKT-200&machineId=VF2'],
) {
  return render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={initialEntries}>
        <MachineRatesPage />
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

beforeEach(() => {
  cleanup();
  mockMachineRateCompare.mockReset();
  mockMachineRateEffective.mockReset();
  mockMachineRateList.mockReset();

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
        {
          machine_id: 'UMC750',
          machine_name: 'Haas UMC-750',
          type: '5-axis',
          hourly_rate: 105,
          setup_rate: 135,
          overhead_rate: 28,
          effective_rate: 133,
        },
      ],
    },
  } as any);
  mockMachineRateCompare.mockResolvedValue({
    result: {
      machines: [
        { id: 'VF2', name: 'Haas VF-2', hourly_rate: 85, setup_multiplier: 1.1, annual_cost: 210000 },
        { id: 'UMC750', name: 'Haas UMC-750', hourly_rate: 105, setup_multiplier: 1.22, annual_cost: 260000 },
      ],
      cheapest: 'VF2',
      most_productive: 'UMC750',
    },
  } as any);
  mockMachineRateEffective.mockResolvedValue({
    result: {
      machine_id: 'VF2',
      oee_level: 'poor',
      effective_rate_hr: 131.75,
    },
  } as any);
});

describe('MachineRatesPage', () => {
  it('renders structured compare/effective lanes and preserves workflow continuity', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Machine Rates' })).toBeDefined();
    expect(screen.getAllByText('Haas VF-2').length).toBeGreaterThan(0);
    expect(screen.getByText(/Mounted ERP machine-rate library/i)).toBeDefined();
    expect(screen.getByText(/Registry-backed machine list/i)).toBeDefined();

    fireEvent.click(screen.getAllByRole('button', { name: 'Compare Machines' })[0]);
    const umcSelectionButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('Haas UMC-750'));
    expect(umcSelectionButton).toBeDefined();
    fireEvent.click(umcSelectionButton!);
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));

    await waitFor(() => {
      expect(screen.getByText('Cheapest')).toBeDefined();
      expect(screen.getByText('Most productive')).toBeDefined();
      expect(screen.getAllByText('Haas UMC-750').length).toBeGreaterThan(0);
      expect(screen.getByText('1.22x')).toBeDefined();
      expect(screen.getByText(/Registry-backed multi-select \(2\)/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Effective Rate' }));
    fireEvent.change(screen.getByLabelText('OEE posture'), { target: { value: 'poor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

    await waitFor(() => {
      expect(mockMachineRateEffective).toHaveBeenCalledWith({
        machine_id: 'VF2',
        oee_level: 'poor',
      });
      expect(screen.getByText('Effective / hr')).toBeDefined();
      expect(screen.getByText('$131.75')).toBeDefined();
      expect(screen.getAllByText('Poor').length).toBeGreaterThan(0);
      expect(screen.getByText(/Registry-backed machine selector/i)).toBeDefined();
    });

    const quoteBuilderLink = screen.getByRole('link', { name: /Open Quote Builder/i });
    const printToCncLink = screen.getByRole('link', { name: /Open Print to CNC/i });

    const quoteBuilderUrl = new URL(quoteBuilderLink.getAttribute('href')!, 'https://prism.local');
    const printToCncUrl = new URL(printToCncLink.getAttribute('href')!, 'https://prism.local');

    expect(quoteBuilderUrl.pathname).toBe('/quote-builder');
    expect(quoteBuilderUrl.searchParams.get('originSource')).toBe('quote-builder');
    expect(quoteBuilderUrl.searchParams.get('source')).toBe('machine-rates');
    expect(quoteBuilderUrl.searchParams.get('focusPacketId')).toBe('PKT-200');
    expect(quoteBuilderUrl.searchParams.get('machineId')).toBe('VF2');
    expect(quoteBuilderUrl.searchParams.get('machineFamilyId')).toBe('mill');
    expect(quoteBuilderUrl.searchParams.get('oeeLevel')).toBe('poor');

    expect(printToCncUrl.pathname).toBe('/print-to-cnc');
    expect(printToCncUrl.searchParams.get('originSource')).toBe('quote-builder');
    expect(printToCncUrl.searchParams.get('source')).toBe('machine-rates');
    expect(printToCncUrl.searchParams.get('focusPacketId')).toBe('PKT-200');
    expect(printToCncUrl.searchParams.get('machineId')).toBe('vf2-3x');
    expect(printToCncUrl.searchParams.get('machineFamilyId')).toBe('3-axis');
    expect(printToCncUrl.searchParams.get('machineManufacturer')).toBe('haas');
    expect(printToCncUrl.searchParams.get('oeeLevel')).toBe('poor');
  });
});
