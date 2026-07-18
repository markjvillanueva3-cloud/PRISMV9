// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>;
}

function StateProbe() {
  const location = useLocation();
  return <div data-testid="state-probe">{JSON.stringify(location.state ?? null)}</div>;
}

let CalculatorPageInner: React.FC;

async function renderCalculator(initialEntries = ['/calculator']) {
  const view = render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route
            path="/calculator"
            element={
              <>
                <CalculatorPageInner />
                <LocationProbe />
                <StateProbe />
              </>
            }
          />
          <Route
            path="*"
            element={
              <>
                <LocationProbe />
                <StateProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </OperatingSystemProvider>,
  );

  await screen.findByText(/Ultimate Machining Tool/i);
  return view;
}

function clickModeButton(label: string) {
  const modeButton = screen
    .getAllByRole('button')
    .find((button) => button.textContent?.trim() === label);

  if (!modeButton) {
    throw new Error(`Could not find mode button: ${label}`);
  }

  fireEvent.click(modeButton);
}

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

describe('CalculatorPage routed continuity', () => {
  it('routes calculator release continuity through the canonical JM Die selector packet', async () => {
    await renderCalculator();

    fireEvent.click(screen.getByRole('button', { name: /open kienzle flow/i }));
    fireEvent.click(screen.getByRole('button', { name: /open print to cnc/i }));

    await waitFor(() => {
      const locationProbe = screen.getByTestId('location-probe').textContent ?? '';
      expect(locationProbe).toContain('/print-to-cnc');
      expect(locationProbe).toContain('originSource=calculator');
      expect(locationProbe).toContain('focusPacketId=calc__');
      expect(locationProbe).toContain('machineId=vf2-3x');
      expect(locationProbe).toContain('machineFamilyId=3-axis');
      expect(locationProbe).toContain('machineManufacturer=haas');
      expect(locationProbe).toContain('partClassId=prismatic-bracket');
      expect(locationProbe).toContain('cadSourceId=fusion-master');
    });
  });

  it('stages Toolpath Advisor from calculator only when the routed posture is supported', async () => {
    await renderCalculator();

    fireEvent.click(screen.getByRole('button', { name: /stage toolpath advisor/i }));

    await waitFor(() => {
      const locationProbe = screen.getByTestId('location-probe').textContent ?? '';
      expect(locationProbe).toContain('/toolpath');
      expect(locationProbe).toContain('originSource=calculator');
      expect(locationProbe).toContain('machineId=vf2-3x');
      expect(locationProbe).toContain('machineFamilyId=3-axis');
    });
  });

  it('keeps the calculator toolpath handoff fail-closed for wire edm', async () => {
    await renderCalculator();

    await act(async () => {
      clickModeButton('Wire EDM');
    });

    await waitFor(() => {
      expect(screen.getAllByText(/^Wire EDM$/i).length).toBeGreaterThan(0);
    });

    expect(screen.queryByRole('button', { name: /stage toolpath advisor/i })).toBeNull();
    // Presence check: the fail-closed Wire EDM notice renders in more than one place (banner + handoff
    // card), so assert via getAllByText length -- corrects an over-strict singular query, not weaker.
    expect(screen.getAllByText(/Toolpath Advisor is not yet wired for the routed Wire EDM posture/i).length).toBeGreaterThan(0);
  });

  it('carries routed JM Die lathe authority into the post workflow from calculator', async () => {
    await renderCalculator();

    await act(async () => {
      clickModeButton('Lathe');
    });

    await waitFor(() => {
      expect(screen.getAllByText(/^Lathe$/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /stage post workflow/i }));

    await waitFor(() => {
      const locationProbe = screen.getByTestId('location-probe').textContent ?? '';
      expect(locationProbe).toContain('/ppg');
      expect(locationProbe).toContain('originSource=calculator');
      expect(locationProbe).toContain('machinePosture=lathe');
      expect(locationProbe).toContain('camSystem=fusion_360');
    });

    const stateProbe = JSON.parse(screen.getByTestId('state-probe').textContent ?? 'null');
    expect(stateProbe?.sourceLabel).toBe('calculator');
    expect(stateProbe?.workspaceContext?.mode).toBe('lathe');
    expect(stateProbe?.workspaceContext?.machineId).toBe('st20-turn');
    expect(stateProbe?.workspaceContext?.machineLabel).toBe('Cincom L20');
    expect(stateProbe?.workspaceContext?.controllerLabel).toContain('Meldas');
    expect(stateProbe?.workspaceContext?.programmingAuthority?.environmentLabel).toBe('Fusion 360');
    expect(stateProbe?.unsupportedReason ?? '').toBe('');
  });

  it('keeps routed EDM post generation fail-closed when calculator stages wire edm post workflow', async () => {
    await renderCalculator();

    await act(async () => {
      clickModeButton('Wire EDM');
    });

    await waitFor(() => {
      expect(screen.getAllByText(/^Wire EDM$/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /stage post workflow/i }));

    await waitFor(() => {
      const locationProbe = screen.getByTestId('location-probe').textContent ?? '';
      expect(locationProbe).toContain('/ppg');
      expect(locationProbe).toContain('originSource=calculator');
      expect(locationProbe).toContain('camSystem=cimatron');
    });

    const stateProbe = JSON.parse(screen.getByTestId('state-probe').textContent ?? 'null');
    expect(stateProbe?.sourceLabel).toBe('calculator');
    expect(stateProbe?.workspaceContext?.mode).toBe('wire_edm');
    expect(stateProbe?.workspaceContext?.machineId).toBe('aln600g-wire');
    expect(stateProbe?.unsupportedReason).toContain('routed wire EDM posture');
  });
});
