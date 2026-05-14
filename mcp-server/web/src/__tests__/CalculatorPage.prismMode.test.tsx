// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import type { InventoryOperationsWorkspace, OperatingSystemServices } from '../features/operating-system/contracts';

let CalculatorPageInner: React.FC;

const STRONG_CRIB_WORKSPACE: InventoryOperationsWorkspace = {
  summary: 'Tool crib is already staged for VF-2SS face-milling work.',
  shellNote: 'Live crib coverage is current for shell-arbor face-milling packages.',
  documentTemplates: [],
  receivingQueue: [],
  departmentRoutes: [],
  checkoutQueue: [
    {
      id: 'face-mill-crib',
      toolId: 'face-mill',
      label: '3 in face mill',
      category: 'Milling cutter',
      location: 'Tool crib A-04',
      priceLabel: '$310',
      status: 'ready',
      note: 'CAT40 shell mill arbor staged for Haas VF-2SS work.',
    },
  ],
  usagePulses: [
    {
      id: 'vf2-face',
      label: 'Face mill active on 4140 plate',
      machine: 'Haas VF-2SS',
      operator: 'Avery Stone',
      state: 'In cycle',
      indexedEdges: 1,
      maxEdges: 6,
      costPerPart: '$0.82 / part',
      nextAction: 'Keep CAT40 shell mill arbor staged at the machine.',
    },
  ],
  formulaNotes: [],
};

function renderCalculator(services: OperatingSystemServices) {
  return render(
    <OperatingSystemProvider services={services}>
      <MemoryRouter initialEntries={['/calculator']}>
        <Routes>
          <Route path="/calculator" element={<CalculatorPageInner />} />
        </Routes>
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

beforeAll(async () => {
  const mod = await import('../pages/CalculatorPage');
  CalculatorPageInner = mod.CalculatorPage;
}, 30000);

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('calculator prism test fallback')));
});

describe('CalculatorPage PRISM mode', () => {
  it('can auto-apply a crib-first setup and open the shared purchase modal', async () => {
    const services: OperatingSystemServices = {
      ...fixtureOperatingSystemServices,
      getInventoryOperationsWorkspace: async () => STRONG_CRIB_WORKSPACE,
    };

    await act(async () => {
      renderCalculator(services);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open prism engine/i }));
    });

    await screen.findAllByText(/strong live crib coverage/i);

    const setupSourceSelect = screen.getByRole('combobox', { name: /setup source/i }) as HTMLSelectElement;
    expect(setupSourceSelect.value).toBe('recommended');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /enable prism auto-apply/i }));
    });

    await waitFor(() => {
      expect((screen.getByRole('combobox', { name: /setup source/i }) as HTMLSelectElement).value).toBe('shop-crib');
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /open prism purchase option/i })[0]!);
    });

    expect(screen.getAllByRole('dialog').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /close purchase options/i })).toBeDefined();
  });

  it('switches the acquisition cards to the live ROI engine when tool-roi is available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/speed-feed/tool-roi')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                result: {
                  crib_recommendation: null,
                  budget_recommendation: {
                    tool: { id: 'b', name: 'Economy finisher', diameter_mm: 12.7, material: 'carbide', coating: 'TiN', price: 95 },
                    cost_per_part: { value: 4.1, unit: '$/part', uncertainty: 0.04, source: 'budget' },
                    rationale: 'Lowest upfront cost.',
                  },
                  standard_recommendation: {
                    tool: { id: 's', name: 'Balanced finisher', diameter_mm: 12.7, material: 'carbide', coating: 'AlTiN', price: 175 },
                    cost_per_part: { value: 3.4, unit: '$/part', uncertainty: 0.03, source: 'standard' },
                    rationale: 'Balanced production path.',
                  },
                  premium_recommendation: {
                    tool: { id: 'p', name: 'Premium 5-axis finisher', diameter_mm: 12.7, material: 'carbide', coating: 'nACRo', price: 315 },
                    cost_per_part: { value: 2.8, unit: '$/part', uncertainty: 0.02, source: 'premium' },
                    rationale: 'Best finish confidence.',
                  },
                  roi_vs_current: {
                    savings_per_part: { value: 1.6, unit: '$/part', uncertainty: 0.02, source: 'compare' },
                    roi_parts: { value: 210, unit: 'parts', uncertainty: 1, source: 'compare' },
                    payback_description: 'Fast payback.',
                  },
                  total_cost_breakdown: {
                    current_total_per_part: { value: 4.7, unit: '$/part', uncertainty: 0.03, source: 'current' },
                    best_total_per_part: { value: 2.8, unit: '$/part', uncertainty: 0.02, source: 'best' },
                    annual_savings: { value: 9600, unit: '$/year', uncertainty: 100, source: 'annual' },
                  },
                  warnings: ['Premium tier offsets price with tool life.'],
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return Promise.reject(new Error('calculator prism test fallback'));
      }),
    );

    await act(async () => {
      renderCalculator(fixtureOperatingSystemServices);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open prism engine/i }));
    });

    expect((await screen.findAllByText(/roi engine live/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/live roi engine compared the current tool/i)).toBeDefined();
    expect(screen.getByText(/premium tier offsets price with tool life/i)).toBeDefined();
  });
});
