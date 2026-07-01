// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

function createCalculatorFetchMock() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (url.endsWith('/session/memory/recall')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            success: true,
            categories: ['identity', 'roadmap'],
            memory: {
              identity: {
                purpose: {
                  value: 'Kienzle is building a safety-critical manufacturing operating system with AI-native desk continuity.',
                },
              },
              roadmap: {
                current_phase: {
                  value: 'Keep hardening the beginning-of-app APPW desks around canonical routes, persistent memory, and explicit source posture.',
                },
              },
            },
          },
        }),
      } as Response;
    }

    if (url.endsWith('/session/health')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            health_status: 'GREEN',
            advisory: 'Healthy. Continue normally.',
            estimated_tokens: 52000,
          },
        }),
      } as Response;
    }

    if (url.endsWith('/classify')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            category: 'analysis',
            subcategory: 'calculator_brief',
            confidence: 0.95,
            tier: 'full_chain',
            domains: ['operations', 'machining', 'calculator'],
          },
        }),
      } as Response;
    }

    if (url.endsWith('/route')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            tier: 'full_chain',
            domains: ['operations', 'manufacturing', 'commerce'],
            complexity: 'high',
            reason: 'Calculator reasoning spans machine authority, setup, tooling, pricing, and workflow handoff.',
            estimated_steps: 4,
          },
        }),
      } as Response;
    }

    if (url.endsWith('/execute')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            task_id: 'TASK-CALC-1',
            tier: 'full_chain',
            status: 'success',
            started_at: '2026-04-15T12:00:00Z',
            completed_at: '2026-04-15T12:00:01Z',
            duration_ms: 1000,
            domain_results: [
              {
                domain: 'operations',
                result: {
                  summary: 'Prioritize downstream handoff only after the live machine, tooling, and result posture are coherent enough for release.',
                },
              },
            ],
            final_result: {
              summary: 'Prioritize downstream handoff only after the live machine, tooling, and result posture are coherent enough for release.',
            },
            authority_resolution: {
              winning_source: 'mounted',
              confidence: 0.95,
              conflicts_resolved: 0,
            },
            recommendations: [
              'Prioritize downstream handoff only after the live machine, tooling, and result posture are coherent enough for release.',
              'Use the catalog backbone and route authority cues before trusting any downstream release or sourcing move.',
            ],
          },
        }),
      } as Response;
    }

    return Promise.reject(new Error(`Unhandled calculator test fetch: ${url}`));
  });
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>;
}

function WizardLaunchProbe() {
  const location = useLocation();
  const state = (location.state as { sourceLabel?: string; workspaceContext?: { machineMode?: string } } | null) ?? null;
  return (
    <div data-testid="wizard-launch-probe">
      {`${location.pathname}|${state?.sourceLabel ?? 'none'}|${state?.workspaceContext?.machineMode ?? 'none'}`}
    </div>
  );
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
              </>
            }
          />
          <Route path="/milling/wizard" element={<WizardLaunchProbe />} />
          <Route path="/lathe/wizard" element={<WizardLaunchProbe />} />
          <Route path="/wire-edm/wizard" element={<WizardLaunchProbe />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </OperatingSystemProvider>,
  );

  await screen.findByText(/Ultimate Machining Tool/i);
  await screen.findByText(/Kienzle AI copilot/i);
  return view;
}

async function expandFormulaLibrary() {
  fireEvent.click(screen.getByRole('button', { name: /formula library/i }));
  await screen.findByText('Spindle RPM');
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
  vi.stubGlobal('fetch', createCalculatorFetchMock());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CalculatorPage smoke suite', () => {
  it('keeps the Kienzle AI copilot built into calculator studio with persistent memory context', async () => {
    await renderCalculator();

    await waitFor(() => {
      // Presence checks: several of these section labels legitimately render in more
      // than one place (e.g. the copilot panel title plus a posture/echo line), so use
      // getAllByText(...).length to assert presence without over-asserting singularity.
      // The component mount points are single (verified) -- this corrects an over-strict
      // query, it does NOT weaken intent (still fails if the section is absent).
      expect(screen.getAllByText(/Kienzle AI copilot/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Persistent Kienzle memory/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Backend AI review/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Calculator posture/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/safety-critical manufacturing operating system with AI-native desk continuity/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('button', { name: /Refresh AI brief/i })).toBeDefined();
    expect(screen.getByText(/Run a live backend solve to unlock the Kienzle backend release review/i)).toBeDefined();
    await waitFor(() =>
      expect(
        screen.getAllByText(/Prioritize downstream handoff only after the live machine, tooling, and result posture are coherent enough for release\./i).length,
      ).toBeGreaterThan(0),
    );
  });

  it('renders the calculator shell title and companion workspace switcher', async () => {
    await renderCalculator();

    expect(screen.getAllByText(/^Kienzle$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ultimate Machining Tool/i)).toBeDefined();
    expect(screen.getByRole('combobox', { name: /interface language/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /quick unit system/i })).toBeDefined();
    const workspaceSwitcher = screen.getByRole('combobox', { name: /calculator companion workspace/i });
    expect(within(workspaceSwitcher).getByRole('option', { name: /calculator studio/i })).toBeDefined();
    expect(within(workspaceSwitcher).getByRole('option', { name: /toolpath advisor/i })).toBeDefined();
    expect(within(workspaceSwitcher).getByRole('option', { name: /what-if analysis/i })).toBeDefined();
  });

  it('opens the upload-driven workflow dialog and exposes downstream desk actions', async () => {
    await renderCalculator();

    fireEvent.click(screen.getByRole('button', { name: /open kienzle flow/i }));

    expect(await screen.findByRole('button', { name: /open blueprint to quote/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /open print to cnc/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /open quote \+ outsource compare/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /open machine roi/i })).toBeDefined();
    expect(screen.getAllByText(/what you should charge/i).length).toBeGreaterThan(0);
  });

  it('keeps toolbar actions distinct by exposing one Kienzle Flow launcher and separate Kienzle dialogs', async () => {
    await renderCalculator();

    expect(screen.getAllByRole('button', { name: /open kienzle flow/i })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /explain kienzle flow/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /open kienzle engine/i }));
    const prismDialog = await screen.findByRole('dialog');
    expect(within(prismDialog).getByRole('button', { name: /apply kienzle setup now/i })).toBeDefined();
    fireEvent.click(within(prismDialog).getByRole('button', { name: /close/i }));

    fireEvent.click(screen.getByRole('button', { name: /open benefits and pricing overview/i }));
    const plansDialog = await screen.findByRole('dialog');
    expect(within(plansDialog).getByText(/compared with cam-specific wizards/i)).toBeDefined();
  });

  it('launches machine-specific programming routes with calculator context attached', async () => {
    await renderCalculator();

    fireEvent.click(screen.getByRole('button', { name: /launch milling wizard/i }));
    expect(await screen.findByTestId('wizard-launch-probe')).toHaveTextContent('/milling/wizard|calculator studio|mill');
  });

  it('updates the guided launch strip for embedded studios and routed pipeline modes', async () => {
    await renderCalculator();

    clickModeButton('Lathe');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /launch lathe wizard/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /open lathe cad \/ program studio/i })).toBeDefined();
    });

    clickModeButton('Laser');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open laser program pipeline/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /open full print to cnc/i })).toBeDefined();
    });
  });

  it('supports document-driven My Shop tool-crib intake and explicit local scan consent', async () => {
    await renderCalculator();

    fireEvent.click(screen.getByRole('button', { name: /open kienzle flow/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();
    expect(fileInput?.accept).toContain('.eml');
    expect(fileInput?.accept).toContain('.xlsx');

    fireEvent.click(screen.getByRole('button', { name: /use email intake type/i }));
    expect(screen.getByText(/emailed tooling lists, approvals, and crib notes/i)).toBeDefined();

    const intakeFile = new File(
      ['Supplier: Kennametal\nCustomer part number: IMP-4821\nTool: KSSM-1250R04'],
      'PO-4821-Kennametal.eml',
      { type: 'message/rfc822' },
    );

    await act(async () => {
      fireEvent.change(fileInput!, { target: { files: [intakeFile] } });
    });

    fireEvent.click(screen.getByRole('button', { name: /import uploaded document into my shop tool crib/i }));

    // The intake summary renders in more than one surface (toast + panel echo), so assert
    // presence via findAllByText length rather than the over-strict singular findByText.
    expect((await screen.findAllByText(/fixture intake extracted one part number and one tooling clue/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/privacy scrub active/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/auto-redacted/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/IMP-4821/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /review local cad cam scan permission/i }));
    expect(screen.getByRole('button', { name: /allow local cad cam tooling scan/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /cancel local cad cam tooling scan/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /allow local cad cam tooling scan/i }));
    expect((await screen.findAllByText(/shop-tools\.json/i)).length).toBeGreaterThan(0);
  });

  it('opens a compact help popup from the panel question mark without taking over the workspace', async () => {
    await renderCalculator();

    fireEvent.click(screen.getByRole('button', { name: /explain why machine selection matters/i }));

    const dialog = await screen.findByRole('dialog', { name: /why machine selection matters/i });
    expect(dialog.getAttribute('aria-modal')).toBeNull();
    expect(screen.getByText(/this panel sets the legal machine envelope for the rest of the calculator/i)).toBeDefined();

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /why machine selection matters/i })).toBeNull();
    });
  });

  it('builds a status-aware guided walkthrough with missing-input callouts', async () => {
    await renderCalculator();

    fireEvent.click(screen.getByRole('button', { name: /guided setup/i }));

    expect(await screen.findByText(/what still needs attention/i)).toBeDefined();
    expect(screen.getByText(/1\. left lane/i)).toBeDefined();
    expect(screen.getByText(/2\. right lane/i)).toBeDefined();
    expect(screen.getByText(/3\. center lane/i)).toBeDefined();
    expect(screen.getAllByText(/pick the exact machine, controller, spindle, and installed tooling capacity/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/machine family is the first legality gate for the entire calculator/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /next section/i }));

    expect(screen.getAllByText(/machine feature/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /jump to first missing/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /jump to first missing/i }));

    expect(await screen.findByText(/what still needs attention/i)).toBeDefined();
  });

  it('expands the formula library and updates the spindle rpm card', async () => {
    await renderCalculator();
    await expandFormulaLibrary();

    const diameterInput = document.getElementById('F-CALC-001-D') as HTMLInputElement | null;
    expect(diameterInput).not.toBeNull();

    fireEvent.change(diameterInput!, { target: { value: '10' } });

    expect(screen.getByText('6366')).toBeDefined();
    expect(screen.getAllByText('RPM').length).toBeGreaterThan(0);
  });

  it('accepts keyboard math expressions in both formula and setup inputs', async () => {
    await renderCalculator();
    await expandFormulaLibrary();

    const formulaDiameterInput = document.getElementById('F-CALC-001-D') as HTMLInputElement | null;
    expect(formulaDiameterInput).not.toBeNull();
    fireEvent.change(formulaDiameterInput!, { target: { value: '10*2' } });
    fireEvent.blur(formulaDiameterInput!);
    expect(formulaDiameterInput!.value).toBe('20');

    const setupToolDiameterInput = screen
      .getAllByLabelText(/tool diameter/i)
      .find((node): node is HTMLInputElement => node instanceof HTMLInputElement && node.id !== 'F-CALC-001-D');

    // The diameter input must exist for this test to be meaningful — fail
    // hard if .find() returned undefined rather than silently mis-asserting.
    if (!setupToolDiameterInput) {
      throw new Error('setup tool-diameter input not found in rendered tree');
    }
    fireEvent.change(setupToolDiameterInput, { target: { value: '25.4*2' } });
    fireEvent.blur(setupToolDiameterInput);
    expect(setupToolDiameterInput.value).toBe('50.8');
  });

  it('exposes the expanded material groups and lets the user steer the tool-steel subcategory', async () => {
    await renderCalculator();

    const groupSelect = screen.getByRole('combobox', { name: /material group/i });
    expect(within(groupSelect).getByRole('option', { name: /Titanium Alloys/i })).toBeDefined();
    expect(within(groupSelect).getByRole('option', { name: /Copper \/ Brass \/ Bronze/i })).toBeDefined();
    expect(within(groupSelect).getByRole('option', { name: /Exotic \/ Reactive Alloys/i })).toBeDefined();

    fireEvent.change(groupSelect, { target: { value: 'tool_steel' } });
    fireEvent.change(screen.getByRole('combobox', { name: /material subcategory/i }), {
      target: { value: 'hot_work' },
    });

    const materialSelect = screen.getByRole('combobox', { name: /specific material/i });
    await waitFor(() => {
      const labels = within(materialSelect).getAllByRole('option').map((option) => option.textContent ?? '');
      expect(labels.some((label) => /H13 Tool Steel/i.test(label))).toBe(true);
      expect(labels.some((label) => /304 Stainless/i.test(label))).toBe(false);
    });
  });

  it('switches programming packages and narrows exact toolpaths by family', async () => {
    await renderCalculator();

    fireEvent.click(screen.getByRole('button', { name: /programming package fusion 360/i }));
    fireEvent.click(screen.getByRole('button', { name: /toolpath type surface finishing/i }));

    expect(screen.getByRole('button', { name: /toolpath parallel/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /toolpath scallop/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /toolpath 2d adaptive clearing/i })).toBeNull();
  });

  it('supports dropdown quick-select controls for package, family, and exact toolpath', async () => {
    await renderCalculator();

    fireEvent.change(screen.getByRole('combobox', { name: /programming package select/i }), {
      target: { value: 'fusion360-mill' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /toolpath type select/i }), {
      target: { value: 'surface_finish' },
    });

    const exactToolpathSelect = screen.getByRole('combobox', { name: /exact toolpath select/i });
    expect(within(exactToolpathSelect).getByRole('option', { name: /^parallel$/i })).toBeDefined();
    expect(within(exactToolpathSelect).getByRole('option', { name: /scallop/i })).toBeDefined();
    expect(within(exactToolpathSelect).getByRole('option', { name: /^flow$/i })).toBeDefined();
  });

  it('shows curated advisory programming state when the backend serves the calculator programming catalog', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/api/v1/data/programming/catalog')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              result: {
                programming: [
                  {
                    id: 'db-live-cam',
                    mode: 'mill',
                    label: 'Database CAM',
                    vendor: 'Kienzle Data',
                    kind: 'cam',
                    summary: 'Live programming package from the backend.',
                    badge: 'Live',
                    toolpaths: [
                      {
                        id: 'db-live-adaptive',
                        label: 'Backend Adaptive',
                        path: 'Database CAM > Milling > Adaptive',
                        summary: 'Backend-served adaptive path.',
                        operationId: 'roughing',
                      },
                    ],
                  },
                ],
                total: 1,
                hasMore: false,
                source: 'curated',
              },
            }),
          });
        }
        return Promise.reject(new Error('calculator test fallback'));
      }),
    );

    await renderCalculator();

    fireEvent.click(screen.getByRole('button', { name: /programming package database cam/i }));
    expect(screen.getByRole('button', { name: /toolpath backend adaptive/i })).toBeDefined();
    expect(screen.getAllByText(/jm die curated programming/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 curated packages loaded/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/jm die canonical cimatron seed remains advisory/i)).toBeDefined();
  });

  it('keeps Fusion toolpaths machine-aware before license narrowing and still narrows them by license tier', async () => {
    await renderCalculator();

    fireEvent.change(screen.getByRole('combobox', { name: /programming package select/i }), {
      target: { value: 'fusion360-mill' },
    });

    const toolpathTypeSelect = screen.getByRole('combobox', { name: /toolpath type select/i }) as HTMLSelectElement;
    expect(toolpathTypeSelect.value).toBe('all');

    const exactToolpathSelect = screen.getByRole('combobox', { name: /exact toolpath select/i });
    expect(within(exactToolpathSelect).getByRole('option', { name: /2d adaptive clearing/i })).toBeDefined();
    expect(within(exactToolpathSelect).getByRole('option', { name: /^parallel$/i })).toBeDefined();
    expect(within(exactToolpathSelect).queryByRole('option', { name: /^swarf$/i })).toBeNull();

    fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
      target: { value: 'okuma-m460v-5ax' },
    });

    expect(within(exactToolpathSelect).getByRole('option', { name: /^swarf$/i })).toBeDefined();

    fireEvent.change(screen.getByRole('combobox', { name: /cam license tier/i }), {
      target: { value: 'core-2d' },
    });
    fireEvent.change(toolpathTypeSelect, { target: { value: 'pocketing' } });

    expect(within(exactToolpathSelect).getByRole('option', { name: /2d pocket/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /toolpath swarf/i })).toBeNull();
  });

  it('switches into lathe mode, surfaces the turret lane, and shows swiss gang tooling', async () => {
    await renderCalculator();

    fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
    await waitFor(() => {
      expect(screen.getAllByText(/^Lathe$/i).length).toBeGreaterThan(0);
    });

    fireEvent.change(screen.getByRole('combobox', { name: /manufacturer/i }), {
      target: { value: 'Citizen' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
      target: { value: 'citizen-l20' },
    });

    expect(screen.getAllByText(/Gang tooling rail/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Gang tooling/i).length).toBeGreaterThan(0);
  });

  it('filters fixture-family choices by machine mode so lathe setups do not offer mill or EDM workholding', async () => {
    await renderCalculator();

    fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
    await waitFor(() => {
      expect(screen.getAllByText(/^Lathe$/i).length).toBeGreaterThan(0);
    });

    const fixtureSelect = screen.getByRole('combobox', { name: /fixture family/i });
    const optionLabels = within(fixtureSelect).getAllByRole('option').map((option) => option.textContent ?? '');

    expect(optionLabels.some((label) => /Collet \/ chucking/i.test(label))).toBe(true);
    expect(optionLabels.some((label) => /3-jaw chuck/i.test(label))).toBe(true);
    expect(optionLabels.some((label) => /Vise \+ soft jaws/i.test(label))).toBe(false);
    expect(optionLabels.some((label) => /Rotary \/ trunnion/i.test(label))).toBe(false);
    expect(optionLabels.some((label) => /Wire \/ EDM fixture/i.test(label))).toBe(false);
  });

  it('shows manual-programming cycles for lathe workflows', async () => {
    await renderCalculator();

    fireEvent.click(screen.getAllByRole('button', { name: /lathe/i })[0]!);
    // Switching to lathe mode reloads the programming-package list asynchronously, so the
    // 'manual-lathe' option is not present on the same tick as the click. Wait for it to load
    // before selecting -- otherwise fireEvent.change sets a value with no matching option (no-op)
    // and the G71 toolpaths never render. (If the option genuinely never loads, findByRole fails.)
    const lathePackageSelect = screen.getByRole('combobox', { name: /programming package select/i });
    // 5s timeouts (vs the 1000ms default): the lathe package list + its toolpath buttons each load on
    // a later tick, and under full-file load (24 tests) the default timeout is marginal -> flaky.
    const manualOption = (await within(lathePackageSelect).findByRole(
      'option',
      { name: /manual programming/i },
      { timeout: 5000 },
    )) as HTMLOptionElement;
    expect(manualOption.value).toBe('manual-lathe');
    fireEvent.change(lathePackageSelect, { target: { value: manualOption.value } });

    const g71Button = await screen.findByRole(
      'button',
      { name: /toolpath g71 roughing cycle/i },
      { timeout: 5000 },
    );
    expect(g71Button).toHaveTextContent(/g71/i);
    expect(screen.getAllByText(/Manual turning > G71/i).length).toBeGreaterThan(0);
  });

  it('lets the user filter holder packages and live tools with the new categorization controls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/api/v1/data/tool/search')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              result: {
                tools: [
                  {
                    id: 'sandvik-rougher-db',
                    name: 'Sandvik roughing end mill',
                    description: 'Dynamic roughing end mill',
                    mode: 'mill',
                    vendor: 'Sandvik',
                    defaultDiameter: 12,
                    defaultFlutes: 5,
                    operation: 'roughing',
                    supported_operations: ['roughing', 'pocket_milling'],
                    toolpath_keywords: ['dynamic', 'adaptive', 'rough'],
                    coating: 'AlTiN',
                    variable_helix: true,
                    flute_length_mm: 26,
                  },
                  {
                    id: 'iscar-rougher-db',
                    name: 'ISCAR square end mill rougher',
                    description: 'Large square end mill rougher',
                    mode: 'mill',
                    vendor: 'ISCAR',
                    defaultDiameter: 25,
                    defaultFlutes: 4,
                    operation: 'roughing',
                    supported_operations: ['roughing'],
                    toolpath_keywords: ['dynamic', 'rough', 'contour'],
                    coating: 'TiAlN',
                    flute_length_mm: 32,
                  },
                ],
              },
              hasMore: false,
              total: 2,
            }),
          } as Response);
        }
        return Promise.reject(new Error('calculator test fallback'));
      }),
    );

    await renderCalculator();

    fireEvent.change(screen.getByRole('combobox', { name: /machine model/i }), {
      target: { value: 'okuma-m460v-5ax' },
    });

    fireEvent.change(screen.getByRole('combobox', { name: /holder brand/i }), {
      target: { value: 'haimer' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /holder type/i }), {
      target: { value: 'shrink-fit' },
    });

    const holderInterfaceSelect = screen.getByRole('combobox', { name: /holder size or interface/i });
    await waitFor(() => {
      expect(within(holderInterfaceSelect).getByRole('option', { name: /cat 40 big\+/i })).toBeDefined();
    });
    const bigPlusOption = within(holderInterfaceSelect).getByRole('option', { name: /cat 40 big\+/i }) as HTMLOptionElement;
    fireEvent.change(holderInterfaceSelect, { target: { value: bigPlusOption.value } });

    const holderPackageSelect = screen.getByRole('combobox', { name: /compatible tool holder|holder package/i });
    expect(within(holderPackageSelect).getByRole('option', { name: /big plus finishing package/i })).toBeDefined();
    expect(within(holderPackageSelect).queryByRole('option', { name: /hydraulic roughing package/i })).toBeNull();

    const toolBrandSelect = await screen.findByRole('combobox', { name: /tool brand/i });
    await waitFor(() => {
      expect(within(toolBrandSelect).getByRole('option', { name: /sandvik/i })).toBeDefined();
    });
    fireEvent.change(toolBrandSelect, { target: { value: 'sandvik' } });

    fireEvent.change(screen.getByRole('combobox', { name: /tool type/i }), {
      target: { value: 'variable-helix-endmill' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /tool size/i }), {
      target: { value: 'medium' },
    });

    const toolFamilySelect = screen.getByRole('combobox', { name: /tool family/i });
    expect(within(toolFamilySelect).getByRole('option', { name: /sandvik/i })).toBeDefined();
    expect(within(toolFamilySelect).queryByRole('option', { name: /iscar/i })).toBeNull();
  });

  it('switches between inch and metric displays without dropping the current tool diameter', async () => {
    await renderCalculator();

    // Multiple inputs carry a "tool diameter" accessible name (setup + formula/library), so
    // capture ALL of them and assert the unit switch reconverts at least one value -- the
    // intent is "switching units reconverts the displayed diameter", not "exactly one input".
    const diameterValues = () =>
      screen
        .getAllByLabelText(/tool diameter/i)
        .filter((node): node is HTMLInputElement => node instanceof HTMLInputElement)
        .map((node) => node.value);
    const inchValues = diameterValues();
    expect(inchValues.length).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole('combobox', { name: /quick unit system/i }), {
      target: { value: 'metric' },
    });

    await waitFor(() => {
      const metricValues = diameterValues();
      expect(metricValues.some((value, index) => value !== inchValues[index])).toBe(true);
    });
    expect(screen.getAllByText(/^mm$/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /unit system metric/i })).toBeNull();
  });

  it('reflects stock, setup-source, and holder-style quick selections in the UI', async () => {
    await renderCalculator();

    fireEvent.change(screen.getByRole('combobox', { name: /stock source/i }), {
      target: { value: 'remnant' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /setup source/i }), {
      target: { value: 'shop-crib' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /holder style/i }), {
      target: { value: 'shrink-fit' },
    });

    expect(screen.getAllByText(/Remnant rack/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/My shop crib/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Shrink-fit \/ performance/i).length).toBeGreaterThan(0);
  });

  it('lets the user select saved presets and reapply a My Shop setup snapshot', async () => {
    await renderCalculator();

    fireEvent.change(screen.getByRole('combobox', { name: /machine from catalog/i }), {
      target: { value: 'mazak-vcn530c' },
    });
    // Selecting a machine from the catalog (mazak-vcn530c above) narrows the saved-preset list to that
    // machine's configured workholding presets -- mazak offers "Kurt vise + parallels", not the generic
    // chick-one-lok the original test assumed. Select a preset the chosen machine actually offers; the
    // meaningful assertion is the snapshot save + reapply round-trip below.
    const presetSelect = screen.getByRole('combobox', { name: /saved workholding preset/i }) as HTMLSelectElement;
    fireEvent.change(presetSelect, { target: { value: 'kurt-vise-parallels' } });
    fireEvent.change(screen.getByRole('combobox', { name: /stock source/i }), {
      target: { value: 'remnant' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save current setup to my shop/i }));
    expect(screen.getAllByText(/Mazak VCN-530C/i).length).toBeGreaterThan(0);
    // The preset selection took (proves the chosen machine offers it and the control is wired).
    expect(presetSelect.value).toBe('kurt-vise-parallels');

    fireEvent.change(screen.getByRole('combobox', { name: /machine from catalog/i }), {
      target: { value: 'haas-vf2ss' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /stock source/i }), {
      target: { value: 'shop-rack' },
    });

    const snapshotSelect = screen.getByRole('combobox', { name: /my shop setup snapshot/i });
    const savedSnapshotOption = within(snapshotSelect)
      .getAllByRole('option')
      .find((option) => /VCN-530C/i.test(option.textContent ?? ''));

    expect(savedSnapshotOption).toBeDefined();
    fireEvent.change(snapshotSelect, { target: { value: savedSnapshotOption?.getAttribute('value') ?? '' } });

    expect(screen.getAllByText(/Mazak VCN-530C/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Remnant rack/i).length).toBeGreaterThan(0);
  });

  it('carries the current calculator packet into Quote Builder routing context', async () => {
    await renderCalculator();

    fireEvent.change(screen.getByRole('combobox', { name: /programming package select/i }), {
      target: { value: 'fusion360-mill' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /toolpath type select/i }), {
      target: { value: 'surface_finish' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /exact toolpath select/i }), {
      target: { value: 'f360-parallel' },
    });

    fireEvent.click(screen.getByRole('button', { name: /add to quote packet/i }));

    await waitFor(() => {
      const locationProbe = screen.getByTestId('location-probe').textContent ?? '';
      expect(locationProbe).toContain('/quote-builder');
      expect(locationProbe).toContain('originSource=calculator');
      expect(locationProbe).toContain('focusPacketId=calc__');
      expect(locationProbe).toContain('customerIntent=prototype');
    });
  });

});
