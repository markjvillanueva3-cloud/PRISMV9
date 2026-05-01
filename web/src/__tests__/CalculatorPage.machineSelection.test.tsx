// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import type { OperatingSystemServices } from '../features/operating-system/contracts';
import { MACHINE_CATALOG } from '../data/calculatorWorkspace';

let CalculatorPageInner: React.FC;

function renderCalculator(services: OperatingSystemServices = fixtureOperatingSystemServices) {
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
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('calculator test fallback')));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CalculatorPage machine selection', () => {
  it('starts in an unfiltered mill browse state instead of a hard-coded two-brand slice', async () => {
    await act(async () => {
      renderCalculator();
    });

    const machineTypeSelect = screen.getByRole('combobox', { name: /machine type/i }) as HTMLSelectElement;
    const manufacturerSelect = screen.getByRole('combobox', { name: /manufacturer/i });

    expect(machineTypeSelect.value).toBe('all');
    expect(within(manufacturerSelect).getByRole('option', { name: /all manufacturers/i })).toBeDefined();
    expect(within(manufacturerSelect).getByRole('option', { name: 'Haas' })).toBeDefined();
    expect(within(manufacturerSelect).getByRole('option', { name: 'Hurco' })).toBeDefined();
    expect(within(manufacturerSelect).getByRole('option', { name: 'Mazak' })).toBeDefined();
    expect(within(manufacturerSelect).getByRole('option', { name: 'Okuma' })).toBeDefined();
    expect(within(manufacturerSelect).getByRole('option', { name: 'Makino' })).toBeDefined();
  });

  it('shows the top-level backend wiring strip for machines, materials, programming, tooling, and holders', async () => {
    await act(async () => {
      renderCalculator();
    });

    const backboneStatus = screen.getByLabelText(/calculator data backbone status/i);
    expect(backboneStatus).toBeDefined();
    expect(within(backboneStatus).getByText('Machines')).toBeDefined();
    expect(within(backboneStatus).getByText('Materials')).toBeDefined();
    expect(within(backboneStatus).getByText('Programming')).toBeDefined();
    expect(within(backboneStatus).getByText('Tooling')).toBeDefined();
    expect(within(backboneStatus).getByText('Holders')).toBeDefined();
  });

  it('keeps manufacturer filtering logical and exposes the matching machine models', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine type/i }), {
        target: { value: 'mill_vertical_5' },
      });
    });

    const manufacturerSelect = screen.getByRole('combobox', { name: /manufacturer/i });
    const machineModelSelect = screen.getByRole('combobox', { name: /machine model/i });

    expect(within(manufacturerSelect).getByRole('option', { name: /all manufacturers/i })).toBeDefined();
    expect(within(manufacturerSelect).getByRole('option', { name: 'Hurco' })).toBeDefined();
    expect(within(manufacturerSelect).getByRole('option', { name: 'Okuma' })).toBeDefined();
    expect(within(machineModelSelect).getByRole('option', { name: /GENOS M460V-5AX/i })).toBeDefined();
    expect(within(machineModelSelect).getByRole('option', { name: /VC500i/i })).toBeDefined();
    expect(within(machineModelSelect).queryByRole('option', { name: /VF-2SS/i })).toBeNull();
  });

  it('updates controller and spindle selections when a specific machine is chosen', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'okuma-m460v-5ax' },
      });
    });

    const controllerSelect = screen.getByRole('combobox', { name: /^controller$/i }) as HTMLSelectElement;
    const spindleSelect = screen.getByRole('combobox', { name: /spindle package/i }) as HTMLSelectElement;

    expect(controllerSelect.value).toBe('osp-p300ma-h');
    expect(spindleSelect.value).toBe('m460v-5ax-main');
    expect(within(controllerSelect).getByRole('option', { name: /Okuma OSP-P300MA-H/i })).toBeDefined();
    expect(within(spindleSelect).getByRole('option', { name: /15,000 RPM CAT 40 Big\+/i })).toBeDefined();
  });

  it('exposes representative lathe brands once lathe mode is active', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
    });

    const manufacturerSelect = screen.getByRole('combobox', { name: /manufacturer/i });

    expect(within(manufacturerSelect).getByRole('option', { name: 'Haas' })).toBeDefined();
    expect(within(manufacturerSelect).getByRole('option', { name: 'Hurco' })).toBeDefined();
    expect(within(manufacturerSelect).getByRole('option', { name: 'Okuma' })).toBeDefined();
    expect(within(manufacturerSelect).getByRole('option', { name: 'DN Solutions' })).toBeDefined();
    expect(within(manufacturerSelect).getByRole('option', { name: 'Citizen' })).toBeDefined();
    expect(within(manufacturerSelect).getByRole('option', { name: 'Nakamura-Tome' })).toBeDefined();
  });

  it('surfaces the Hurco TM10i package with a populated turning configuration', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'hurco-tm10i' },
      });
    });

    const controllerSelect = screen.getByRole('combobox', { name: /^controller$/i }) as HTMLSelectElement;
    const spindleSelect = screen.getByRole('combobox', { name: /spindle package/i }) as HTMLSelectElement;
    const holderPackageSelect = screen.getByRole('combobox', { name: /holder package|compatible tool holder/i });

    expect(controllerSelect.value).toBe('hurco-winmax-turn');
    expect(spindleSelect.value).toBe('tm10i-main-spindle');
    expect(within(controllerSelect).getByRole('option', { name: /Hurco WinMax/i })).toBeDefined();
    expect(within(spindleSelect).getByRole('option', { name: /4,000 RPM chucking spindle/i })).toBeDefined();
    expect(within(holderPackageSelect).getByRole('option', { name: /VDI turning package/i })).toBeDefined();
  });

  it('surfaces the DN Solutions VTL package with a populated turning configuration', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'dnsolutions-puma-v8300' },
      });
    });

    const controllerSelect = screen.getByRole('combobox', { name: /^controller$/i }) as HTMLSelectElement;
    const spindleSelect = screen.getByRole('combobox', { name: /spindle package/i }) as HTMLSelectElement;
    const holderPackageSelect = screen.getByRole('combobox', { name: /holder package|compatible tool holder/i });

    expect(controllerSelect.value).toBe('fanuc-i-plus-vtl');
    expect(spindleSelect.value).toBe('puma-v8300-main');
    expect(within(controllerSelect).getByRole('option', { name: /FANUC i Plus/i })).toBeDefined();
    expect(within(spindleSelect).getByRole('option', { name: /heavy-duty chuck spindle/i })).toBeDefined();
    expect(within(holderPackageSelect).getByRole('option', { name: /VDI turning package/i })).toBeDefined();
  });

  it('preserves an explicit machine pick even after machine type and manufacturer filters rerender', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine from catalog/i }), {
        target: { value: 'makino-a61nx' },
      });
    });

    await waitFor(() => {
      expect((screen.getByRole('combobox', { name: /machine type/i }) as HTMLSelectElement).value).toBe('mill_horizontal_4');
      expect((screen.getByRole('combobox', { name: /manufacturer/i }) as HTMLSelectElement).value).toBe('Makino');
      expect((screen.getByRole('combobox', { name: /machine model/i }) as HTMLSelectElement).value).toBe('makino-a61nx');
    });
  });

  it('shows the M460V-5AX control packages and expanded coolant strategies in the machine selection module', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'okuma-m460v-5ax' },
      });
    });

    expect(screen.getByRole('button', { name: /controller capability CAS collision avoidance/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /controller capability High-speed machining mode/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /machine coolant Through-air/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /machine coolant Air blast/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /tool magazine capacity 30/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /tool magazine capacity 48/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /tool magazine capacity 48/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /tool magazine capacity 60/i })).toBeDefined();
  });

  it('rebases workholding and machine features when switching between 5-axis, horizontal, and standard vertical mills', async () => {
    await act(async () => {
      renderCalculator();
    });

    const machineModelSelect = screen.getByRole('combobox', { name: /machine model/i });
    const workholdingPresetSelect = screen.getByRole('combobox', { name: /saved workholding preset/i }) as HTMLSelectElement;
    const rotaryFeatureButton = screen.getByRole('button', { name: /machine feature rotary \/ trunnion/i });

    await act(async () => {
      fireEvent.change(machineModelSelect, { target: { value: 'okuma-m460v-5ax' } });
    });

    expect(rotaryFeatureButton).toHaveAttribute('aria-pressed', 'true');
    expect(workholdingPresetSelect.value).toBe('haas-trt-package');

    await act(async () => {
      fireEvent.change(machineModelSelect, { target: { value: 'makino-a61nx' } });
    });

    expect(rotaryFeatureButton).toHaveAttribute('aria-pressed', 'false');
    expect(workholdingPresetSelect.value).toBe('chick-one-lok');

    await act(async () => {
      fireEvent.change(machineModelSelect, { target: { value: 'haas-vf2ss' } });
    });

    expect(rotaryFeatureButton).toHaveAttribute('aria-pressed', 'false');
    expect(workholdingPresetSelect.value).toBe('kurt-vise-parallels');
  });

  it('lets the user pick or type the installed tool magazine capacity for the active machine', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'okuma-m460v-5ax' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /tool magazine capacity 60/i }));
    });

    expect(screen.getAllByText(/60-tool crib/i).length).toBeGreaterThan(0);

    const customInstalledCountInput = screen
      .getAllByLabelText(/tool magazine capacity/i)
      .find((node): node is HTMLInputElement => node instanceof HTMLInputElement);

    expect(customInstalledCountInput).toBeDefined();

    await act(async () => {
      fireEvent.change(customInstalledCountInput!, {
        target: { value: '48+24' },
      });
      fireEvent.keyDown(customInstalledCountInput!, { key: 'Enter', code: 'Enter' });
    });

    expect(screen.getAllByText(/72-tool crib/i).length).toBeGreaterThan(0);
    expect(customInstalledCountInput!.value).toBe('72');
  });

  it('filters mill holder packages by spindle connection type so Big Plus and HSK machines do not share the same holder menu', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'okuma-m460v-5ax' },
      });
    });

    const holderPackageSelect = screen.getByRole('combobox', { name: /holder package|compatible tool holder/i });
    expect(within(holderPackageSelect).getByRole('option', { name: /Hydraulic roughing package/i })).toBeDefined();
    expect(within(holderPackageSelect).queryByRole('option', { name: /HSK-A63 powRgrip package/i })).toBeNull();

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'makino-a61nx' },
      });
    });

    expect(within(holderPackageSelect).getByRole('option', { name: /HSK-A63 powRgrip package/i })).toBeDefined();
    expect(within(holderPackageSelect).queryByRole('option', { name: /Big Plus finishing package/i })).toBeNull();
  });

  it('re-bases the holder package when the mill toolpath changes into a drill or finish flow', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'okuma-m460v-5ax' },
      });
    });

    const holderPackageSelect = screen.getByRole('combobox', { name: /holder package|compatible tool holder/i }) as HTMLSelectElement;
    expect(holderPackageSelect.value).toBe('haimer-hydraulic-rough');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /toolpath drill/i }));
    });

    await waitFor(() => {
      expect(holderPackageSelect.value).toBe('haimer-bigplus-finishing');
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /toolpath surface finish parallel/i }));
    });

    await waitFor(() => {
      expect(holderPackageSelect.value).toBe('haimer-bigplus-finishing');
    });
  });

  it('switches the holder selector into live database mode when compatible holder rows are returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/api/v1/data/holder/catalog')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              result: {
                holders: [
                  {
                    id: 'haimer-cat40-power-mini',
                    label: 'Haimer Power Mini',
                    detail: 'CAT40 Big Plus · Shrink fit · Through coolant',
                    mode: 'mill',
                    brandId: 'haimer',
                    brandLabel: 'Haimer',
                    holderStyleIds: ['machine-standard', 'shrink-fit'],
                    holderStyleId: 'shrink-fit',
                    holderType: 'SHRINK_FIT',
                    spindleInterface: 'CAT40 Big Plus',
                    compatibleLayoutKinds: ['magazine'],
                    compatibleSpindleConnectionTypeIds: ['cat40-big-plus', 'cat40'],
                    source: 'database',
                  },
                ],
              },
            }),
          } as Response);
        }
        return Promise.reject(new Error('calculator test fallback'));
      }),
    );

    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'okuma-m460v-5ax' },
      });
    });

    const holderSelect = await screen.findByRole('combobox', { name: /compatible tool holder/i });
    expect(holderSelect).toBeDefined();
    expect(screen.getAllByText(/Live holder database/i).length).toBeGreaterThan(0);
  });

  it('filters lathe holder packages by turret topology so twin-turret and milling-head packages only show where supported', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
    });

    const holderPackageSelect = screen.getByRole('combobox', { name: /holder package|compatible tool holder/i });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'nakamura-wt150ii' },
      });
    });

    expect(within(holderPackageSelect).getByRole('option', { name: /Twin-turret VDI30 package/i })).toBeDefined();
    expect(within(holderPackageSelect).queryByRole('option', { name: /CAPTO C6 B-axis milling-head package/i })).toBeNull();

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'okuma-multus-u3000' },
      });
    });

    expect(within(holderPackageSelect).getByRole('option', { name: /CAPTO C6 B-axis milling-head package/i })).toBeDefined();
    expect(within(holderPackageSelect).queryByRole('option', { name: /Twin-turret VDI30 package/i })).toBeNull();
    expect(screen.getAllByText(/B-axis milling head/i).length).toBeGreaterThan(0);
  });

  it('surfaces the generic BMT turning fallback package for single-turret BMT lathes', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'haas-st20y' },
      });
    });

    const holderPackageSelect = screen.getByRole('combobox', { name: /holder package|compatible tool holder/i });
    expect(within(holderPackageSelect).getByRole('option', { name: /BMT turning package/i })).toBeDefined();
  });

  it('keeps the heavy-turning fallback holder package available for VDI80 lathes like the DN PUMA 700LM', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/api/v1/data/machine/search')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              result: {
                machines: [
                  {
                    id: 'DN_PUMA_700LM',
                    name: 'DN Solutions Puma 700LM',
                    manufacturer: 'DN Solutions',
                    type: 'turning_center',
                    spindle: {
                      max_rpm: 4500,
                      spindle_nose: 'A2-20',
                    },
                    controller: {
                      brand: 'Fanuc',
                      model: '31i-B',
                      type: 'Fanuc 31i-B',
                    },
                    turret: {
                      stations: 12,
                      type: 'VDI80',
                    },
                    liveTools: true,
                  },
                ],
                total: 1,
                hasMore: false,
              },
            }),
          } as Response);
        }
        if (url.includes('/api/v1/data/holder/catalog')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              result: {
                holders: [],
              },
            }),
          } as Response);
        }
        return Promise.reject(new Error('calculator test fallback'));
      }),
    );

    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'DN_PUMA_700LM' },
      });
    });

    const holderPackageSelect = screen.getByRole('combobox', { name: /holder package|compatible tool holder/i });
    expect(within(holderPackageSelect).getByRole('option', { name: /VDI turning package/i })).toBeDefined();
  });

  it('keeps the Citizen swiss holder fallback populated after switching from a mill machine into the lathe catalog', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'okuma-m460v-5ax' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
    });

    await waitFor(() => {
      expect((screen.getByRole('combobox', { name: /machine model/i }) as HTMLSelectElement).value).toBe('citizen-l20');
    });

    const holderBrandSelect = screen.getByRole('combobox', { name: /holder brand/i }) as HTMLSelectElement;
    const holderTypeSelect = screen.getByRole('combobox', { name: /holder type/i }) as HTMLSelectElement;
    const holderInterfaceSelect = screen.getByRole('combobox', { name: /holder size or interface/i }) as HTMLSelectElement;
    const holderPackageSelect = screen.getByRole('combobox', { name: /holder package|compatible tool holder/i });
    const holderStyleSelect = screen.getByRole('combobox', { name: /holder style/i }) as HTMLSelectElement;

    expect(holderBrandSelect.value).toBe('all');
    expect(holderTypeSelect.value).toBe('all');
    expect(holderInterfaceSelect.value).toBe('all');
    expect(holderStyleSelect.value).toBe('machine-standard');
    expect(within(holderPackageSelect).getByRole('option', { name: /Swiss gang package/i })).toBeDefined();
    expect(screen.getAllByText(/Fallback holder library/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Gang tooling/i).length).toBeGreaterThan(0);
  });

  it('keeps controller, spindle, coolant, and holder selectors populated across every mill and lathe machine package', async () => {
    const millMachines = MACHINE_CATALOG.filter((machine) => machine.mode === 'mill');
    const latheMachines = MACHINE_CATALOG.filter((machine) => machine.mode === 'lathe');
    const assertMachine = async (machineId: string, mode: 'mill' | 'lathe') => {
      const view = renderCalculator();

      if (mode === 'lathe') {
        await act(async () => {
          fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
        });
      }

      await act(async () => {
        fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
          target: { value: machineId },
        });
      });

      await waitFor(() => {
        expect((screen.getByRole('combobox', { name: /machine model/i }) as HTMLSelectElement).value).toBe(machineId);
      });

      const controllerSelect = screen.getByRole('combobox', { name: /^controller$/i });
      const spindleSelect = screen.getByRole('combobox', { name: /spindle package|process package/i });
      const holderSelect = screen.getByRole('combobox', { name: /holder package|compatible tool holder/i });

      expect(within(controllerSelect).getAllByRole('option').length).toBeGreaterThan(0);
      expect(within(spindleSelect).getAllByRole('option').length).toBeGreaterThan(0);
      expect(within(holderSelect).getAllByRole('option').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /machine coolant/i }).length).toBeGreaterThan(0);

      view.unmount();
    };

    for (const machine of millMachines) {
      await assertMachine(machine.id, 'mill');
    }

    for (const machine of latheMachines) {
      await assertMachine(machine.id, 'lathe');
    }
  }, 180000);

  it('restores a saved calculator machine default into the machine selection module', async () => {
    const services: OperatingSystemServices = {
      ...fixtureOperatingSystemServices,
      getCalculatorDefaultMachineProfile: async () => ({
        profileId: 'calculator-default-okuma',
        userId: 'calculator-default',
        workspaceId: 'calculator',
        displayName: 'Shop Okuma M460 calculator default',
        machineMode: 'mill',
        machineId: 'okuma-m460v-5ax',
        machineLabel: 'GENOS M460V-5AX',
        selectedControllerId: 'osp-p300ma-h',
        selectedSpindlePackageId: 'm460v-5ax-main',
        toolingStationCountOverride: 48,
        enabledCoolantStrategyIds: ['flood', 'tsc', 'through_air', 'air'],
        enabledControllerFeatureIds: ['okuma-cas', 'okuma-hsm'],
        canDriveCalculatorSelections: true,
      }),
    };

    await act(async () => {
      renderCalculator(services);
    });

    await waitFor(() => {
      expect((screen.getByRole('combobox', { name: /machine model/i }) as HTMLSelectElement).value).toBe('okuma-m460v-5ax');
    });

    expect((screen.getByRole('combobox', { name: /^controller$/i }) as HTMLSelectElement).value).toBe('osp-p300ma-h');
    expect((screen.getByRole('combobox', { name: /spindle package/i }) as HTMLSelectElement).value).toBe('m460v-5ax-main');
    expect(screen.getByRole('button', { name: /controller capability CAS collision avoidance/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /controller capability High-speed machining mode/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /machine coolant Through-air/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /machine coolant Air blast/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText(/48-tool crib/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Calculator machine default/i)).toBeDefined();
    expect(screen.getAllByText(/GENOS M460V-5AX/i).length).toBeGreaterThan(0);
  });

  it('saves the current resolved machine package as the calculator default', async () => {
    const saveCalculatorMachineProfile = vi.fn(
      async (input: Parameters<NonNullable<OperatingSystemServices['saveCalculatorMachineProfile']>>[0]) => ({
        profileId: 'calculator-default-okuma',
        userId: input.userId,
        workspaceId: input.workspaceId,
        displayName: input.displayName ?? 'Shop Okuma M460 calculator default',
        machineMode: input.selection.machineMode,
        machineId: input.selection.machine.id,
        machineLabel: input.selection.machine.model,
        selectedControllerId: input.selection.selectedControllerId,
        selectedSpindlePackageId: input.selection.selectedSpindlePackageId,
        toolingStationCountOverride: input.selection.toolingStationCountOverride,
        enabledCoolantStrategyIds: input.selection.enabledCoolantStrategyIds,
        enabledControllerFeatureIds: input.selection.enabledControllerFeatureIds,
        canDriveCalculatorSelections: true,
      }),
    );

    const services: OperatingSystemServices = {
      ...fixtureOperatingSystemServices,
      saveCalculatorMachineProfile,
    };

    await act(async () => {
      renderCalculator(services);
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'okuma-m460v-5ax' },
      });
    });

    const toolingCapacityInput = screen
      .getAllByLabelText(/tool magazine capacity/i)
      .find((node): node is HTMLInputElement => node instanceof HTMLInputElement);

    expect(toolingCapacityInput).toBeDefined();

    await act(async () => {
      fireEvent.change(toolingCapacityInput!, {
        target: { value: '48+24' },
      });
      fireEvent.keyDown(toolingCapacityInput!, { key: 'Enter', code: 'Enter' });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save current machine as default/i }));
    });

    await waitFor(() => {
      expect(saveCalculatorMachineProfile).toHaveBeenCalledTimes(1);
    });

    const savedSelection = saveCalculatorMachineProfile.mock.calls[0][0].selection;
    expect(savedSelection.machine.id).toBe('okuma-m460v-5ax');
    expect(savedSelection.selectedControllerId).toBe('osp-p300ma-h');
    expect(savedSelection.selectedSpindlePackageId).toBe('m460v-5ax-main');
    expect(savedSelection.toolingStationCountOverride).toBe(72);
    expect(savedSelection.enabledCoolantStrategyIds).toEqual(expect.arrayContaining(['flood', 'tsc', 'through_air', 'air']));
    expect(savedSelection.enabledControllerFeatureIds).toEqual(expect.arrayContaining(['okuma-cas', 'okuma-hsm']));
    expect(screen.getByText(/Saved GENOS M460V-5AX as the default calculator machine profile/i)).toBeDefined();
  });

  it('does not surface live-tool milling paths on a conventional lathe without live-tool capability', async () => {
    await act(async () => {
      renderCalculator();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
        target: { value: 'dnsolutions-puma-v8300' },
      });
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /programming package select/i }), {
        target: { value: 'esprit-lathe' },
      });
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /cam license tier/i }), {
        target: { value: 'live-tooling' },
      });
    });

    const exactToolpathSelect = screen.getByRole('combobox', { name: /exact toolpath select/i });
    expect(within(exactToolpathSelect).queryByRole('option', { name: /live-tool milling/i })).toBeNull();
    expect(within(exactToolpathSelect).queryByRole('option', { name: /mill-turn live milling/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /toolpath live-tool milling/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /toolpath mill-turn live milling/i })).toBeNull();
  });
});
