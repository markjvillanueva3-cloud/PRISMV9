// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

let CalculatorPageInner: React.FC;

function renderCalculator() {
  return render(
    <MemoryRouter initialEntries={['/calculator']}>
      <Routes>
        <Route path="/calculator" element={<CalculatorPageInner />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeAll(async () => {
  const mod = await import('../pages/CalculatorPage');
  CalculatorPageInner = mod.CalculatorPage;
}, 30000);

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('calculator finish view fallback')));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CalculatorPage finish atlas view', () => {
  it('auto-calculates the Ra target from the active setup and flips to manual when the user forces a preset', async () => {
    await act(async () => {
      renderCalculator();
    });

    const slider = screen.getByRole('slider', { name: /desired ra finish/i }) as HTMLInputElement;
    const roughingRa = Number(slider.value);

    expect(screen.getByRole('button', { name: /finish target mode auto/i }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/auto-calculated surface finish/i)).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /toolpath surface finish parallel/i }));
    });

    const finishingRa = Number((screen.getByRole('slider', { name: /desired ra finish/i }) as HTMLInputElement).value);
    expect(finishingRa).toBeLessThan(roughingRa);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /finish preset precision finish/i }));
    });

    expect(screen.getByRole('button', { name: /finish target mode manual/i }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/manual surface finish target/i)).toBeDefined();
  });

  it('shows comparator, process lay, and material character in the generated finish view', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /toolpath surface finish parallel/i }));
    });

    expect(screen.getByText(/generated finish view/i)).toBeDefined();
    expect(screen.getByText(/comparator-style visual expectation/i)).toBeDefined();
    expect(screen.getByText(/atlas model only/i)).toBeDefined();
    expect(screen.getAllByText(/comparator:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/process lay:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/material character:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/requested finish/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/predicted finish with current stack/i).length).toBeGreaterThan(0);
  });

  it('moves the key cut inputs beside the finish view and lets DOC and LOC optimize from the active setup', async () => {
    await act(async () => {
      renderCalculator();
    });

    expect(screen.getByText(/adaptive cut input block/i)).toBeDefined();
    // Presence check: "tool extension from holder" is labeled in more than one lane (setup + finish-view
    // echo), so assert via getAllByLabelText length -- corrects an over-strict singular query, not weaker.
    expect(screen.getAllByLabelText(/tool extension from holder/i).length).toBeGreaterThan(0);
    // "loc / flute length" is labeled in more than one lane (setup + finish-view echo); capture ALL and
    // assert the optimize action changes at least one value (the real intent), rather than a singular
    // query that throws on multiple matches. Still fails if optimize stops changing the LOC.
    const locInputs = () =>
      screen
        .getAllByLabelText(/loc \/ flute length/i)
        .filter((node): node is HTMLInputElement => node instanceof HTMLInputElement);
    expect(locInputs().length).toBeGreaterThan(0);

    const docInput = screen.getByLabelText(/^DOC$/i) as HTMLInputElement;
    const startingDoc = docInput.value;
    const startingLocs = locInputs().map((node) => node.value);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /optimize doc/i }));
      fireEvent.click(screen.getByRole('button', { name: /optimize loc/i }));
    });

    expect(docInput.value).not.toBe(startingDoc);
    expect(locInputs().some((node, index) => node.value !== startingLocs[index])).toBe(true);
    expect(screen.getAllByText(/tool extension/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/loc posture/i).length).toBeGreaterThan(0);
  });

  it('blocks release in cutting results when the live solve returns critical safety signals', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/speed-feed/orchestrate')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                result: {
                  value: {
                    spindle_rpm: 3100,
                    cutting_speed_mpm: 118,
                    feed_rate_mmmin: 420,
                    feed_per_tooth_mm: 0.032,
                    power_kw: 6.8,
                    torque_Nm: 24.2,
                    mrr_cm3min: 58,
                    tool_life_min: 18,
                    surface_finish_Ra_um: 2.4,
                    axial_depth_mm: 1.6,
                    radial_depth_mm: 4.2,
                    overall_confidence: 0.41,
                    playbook_warnings: ['Spindle overload risk on current setup'],
                    limiting_factors: [{ parameter: 'power', constraint: 'Limit exceeded' }],
                    safety_checks: [{ name: 'Spindle load', message: 'Critical overload predicted' }],
                    formulas_used: ['Kienzle force model'],
                    engines_called: ['SpeedFeedOrchestratorEngine'],
                    resolved_machine: { name: { value: 'Okuma GENOS M460V-5AX' } },
                    resolved_cam_strategy: { strategy_name: { value: 'Adaptive roughing' } },
                  },
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return Promise.reject(new Error('calculator finish view fallback'));
      }),
    );

    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run kienzle calculation/i }));
    });

    expect((await screen.findAllByText(/do not run as-is/i)).length).toBeGreaterThan(0);
    // Presence check: the blocking-safety banner renders in more than one surface (results header +
    // release-gate notice), so assert via getAllByText length (matches the sibling asserts here).
    expect(screen.getAllByText(/blocking safety signals were returned for this cut/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/full kienzle solve/i).length).toBeGreaterThan(0);
  });

  it('shows a live surface-finish value derived from cutting parameters when the solve omits Ra directly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/speed-feed/orchestrate')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                result: {
                  value: {
                    spindle_rpm: 12000,
                    cutting_speed_mpm: 280,
                    feed_rate_mmmin: 760,
                    feed_per_tooth_mm: 0.032,
                    power_kw: 4.1,
                    torque_Nm: 3.3,
                    mrr_cm3min: 18,
                    tool_life_min: 42,
                    axial_depth_mm: 0.2,
                    radial_depth_mm: 0.25,
                    overall_confidence: 0.84,
                    playbook_warnings: [],
                    limiting_factors: [],
                    safety_checks: [],
                    formulas_used: ['Surface finish live cut estimator'],
                    engines_called: ['SpeedFeedOrchestratorEngine'],
                    resolved_machine: { name: { value: 'Okuma GENOS M460V-5AX' } },
                    resolved_cam_strategy: { strategy_name: { value: 'Surface Finish Parallel' } },
                  },
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return Promise.reject(new Error('calculator finish view fallback'));
      }),
    );

    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /toolpath surface finish parallel/i }));
      fireEvent.click(screen.getByRole('button', { name: /run kienzle calculation/i }));
    });

    expect(await screen.findByText(/live cut driven/i)).toBeDefined();
    expect(screen.getByText(/target vs live result/i)).toBeDefined();
    expect(screen.queryByText(/live awaiting solve/i)).toBeNull();
    expect(screen.getByText(/live\s+[0-9]/i)).toBeDefined();
  });

  it('ignores stale solve responses after the user switches machine modes mid-request', async () => {
    let resolveOrchestrate: (() => void) | null = null;

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/speed-feed/orchestrate')) {
          return new Promise<Response>((resolve) => {
            resolveOrchestrate = () => {
              resolve(
                new Response(
                  JSON.stringify({
                    result: {
                      value: {
                        spindle_rpm: 1850,
                        cutting_speed_mpm: 142,
                        feed_rate_mmmin: 280,
                        feed_per_tooth_mm: 0.018,
                        power_kw: 3.1,
                        torque_Nm: 41,
                        mrr_cm3min: 22,
                        tool_life_min: 30,
                        surface_finish_Ra_um: 3.6,
                        axial_depth_mm: 2.4,
                        radial_depth_mm: 0.6,
                        overall_confidence: 0.72,
                        playbook_warnings: [],
                        limiting_factors: [],
                        safety_checks: [],
                        formulas_used: ['Lathe roughing model'],
                        engines_called: ['SpeedFeedOrchestratorEngine'],
                        resolved_machine: { name: { value: 'CINCOM A20-VII' } },
                        resolved_cam_strategy: { strategy_name: { value: 'LATHE ROUGH' } },
                      },
                    },
                  }),
                  { status: 200, headers: { 'Content-Type': 'application/json' } },
                ),
              );
            };
          });
        }
        return Promise.reject(new Error('calculator finish view fallback'));
      }),
    );

    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run kienzle calculation/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /mill/i })[0]!);
    });

    await act(async () => {
      resolveOrchestrate?.();
    });

    await waitFor(() => {
      expect(screen.queryByText(/CINCOM A20-VII/i)).toBeNull();
      expect(screen.queryByText(/LATHE ROUGH/i)).toBeNull();
    });

    expect(screen.getAllByText(/awaiting validated solve/i).length).toBeGreaterThan(0);
  });
});
