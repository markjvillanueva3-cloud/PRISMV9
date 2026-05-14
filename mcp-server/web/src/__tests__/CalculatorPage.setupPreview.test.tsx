// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

function renderCalculator() {
  return render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={['/calculator']}>
        <CalculatorPageInner />
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

let CalculatorPageInner: React.FC;

beforeAll(async () => {
  const mod = await import('../pages/CalculatorPage');
  CalculatorPageInner = mod.CalculatorPage;
}, 30000);

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('calculator test fallback')));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CalculatorPage setup preview', () => {
  it('renders the setup preview module and exposes the WebGL fallback copy in tests', async () => {
    renderCalculator();

    expect(await screen.findByRole('heading', { name: /3d setup preview/i })).toBeDefined();
    await waitFor(() => {
      expect(screen.queryByText(/Loading setup preview/i)).toBeNull();
    });
    expect(await screen.findByText(/3D preview is ready when WebGL is available/i)).toBeDefined();
    expect(await screen.findByText(/Spindle, holder, and tooling stack preview/i)).toBeDefined();
  });
});
