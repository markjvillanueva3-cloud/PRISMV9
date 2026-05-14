// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

let CalculatorPageInner: React.FC;

function renderCalculator() {
  return render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
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
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('calculator commerce fallback')));
});

describe('CalculatorPage commerce actions', () => {
  it('opens section buy options and then drills into vendor links', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open material buy options/i }));
    });

    expect(await screen.findByRole('dialog', { name: /buy options/i })).toBeDefined();
    expect(screen.getAllByText(/buy options/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/top selling/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/best capability/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/top performing/i).length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /view vendors for/i })[0]!);
    });

    expect(screen.getByRole('dialog', { name: /purchase options/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /close purchase options/i })).toBeDefined();
  });

  it('opens machine alarm support from the machine section', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open machine alarm support/i }));
    });

    expect(await screen.findByRole('dialog', { name: /alarm support buy options/i })).toBeDefined();
    expect(screen.getAllByText(/alarm recovery/i).length).toBeGreaterThan(0);
  });

  it('opens machine parts buy options from the machine section even when the live parts search is empty', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open machine parts buy options/i }));
    });

    expect(await screen.findByRole('dialog', { name: /service parts buy options/i })).toBeDefined();
    expect(screen.getAllByText(/parts database/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/fast-service kit/i)).toBeDefined();
  });
});
