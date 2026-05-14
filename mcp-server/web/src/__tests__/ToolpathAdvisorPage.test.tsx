import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { PROGRAMMING_ENVIRONMENTS } from '../data/calculatorWorkspace';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import { ToolpathAdvisorPage } from '../pages/ToolpathAdvisorPage';

vi.mock('../api/calculatorData', () => ({
  fetchProgrammingCatalogState: vi.fn(async (mode?: 'mill' | 'lathe') => ({
    items: PROGRAMMING_ENVIRONMENTS.filter((item) => item.mode === (mode ?? 'mill')),
    source: 'fallback',
    liveCount: 0,
    fallbackCount: PROGRAMMING_ENVIRONMENTS.filter((item) => item.mode === (mode ?? 'mill')).length,
    note: 'JM Die seeded programming is active for this posture.',
    sampled: false,
  })),
}));

vi.mock('../components/SafetyBadge', () => ({
  SafetyBadge: ({ score }: { score: number }) => (
    <span data-testid="safety-badge">{(score * 100).toFixed(0)}%</span>
  ),
}));

function renderPage(initialEntry = '/toolpath') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <OperatingSystemProvider services={fixtureOperatingSystemServices}>
        <ToolpathAdvisorPage />
      </OperatingSystemProvider>
    </MemoryRouter>,
  );
}

describe('ToolpathAdvisorPage', () => {
  it('renders the advisor heading and setup controls', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Toolpath Advisor' })).toBeDefined();
    expect(screen.getByLabelText('Feature Type')).toBeDefined();
    expect(screen.getByLabelText('Material Family')).toBeDefined();
    expect(screen.getByLabelText('Machine Axes')).toBeDefined();
    expect(screen.getByLabelText('Planning Priority')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Get Strategies' })).toBeDefined();
  });

  it('shows ranked strategies for the default pocket setup', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Get Strategies' }));

    expect(screen.getByText('#1 Recommended')).toBeDefined();
    expect(screen.getByText('Adaptive Clearing')).toBeDefined();
    expect(screen.getAllByText('Trochoidal Milling').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Contour-Parallel')).toBeDefined();
  });

  it('re-ranks contour strategies when finish quality is prioritized', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Feature Type'), {
      target: { value: 'contour' },
    });
    fireEvent.change(screen.getByLabelText('Planning Priority'), {
      target: { value: 'surface_finish' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Get Strategies' }));

    const recommendedCard = screen.getAllByText('#1 Recommended')[0].closest('article');
    expect(recommendedCard?.textContent).toContain('High-Speed Contouring');
  });

  it('surfaces single-point threading when the machine posture is lathe', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Feature Type'), {
      target: { value: 'threading' },
    });
    fireEvent.change(screen.getByLabelText('Machine Axes'), {
      target: { value: 'lathe' },
    });
    fireEvent.change(screen.getByLabelText('Planning Priority'), {
      target: { value: 'tool_life' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Get Strategies' }));

    const recommendedCard = screen.getAllByText('#1 Recommended')[0].closest('article');
    expect(recommendedCard?.textContent).toContain('Single-Point Threading');
  });

  it('shows the shared release spine for the active machine and material posture', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Machine Axes'), {
      target: { value: 'lathe' },
    });
    fireEvent.change(screen.getByLabelText('Material Family'), {
      target: { value: 'stainless' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Get Strategies' }));

    expect(screen.getByText(/Shared release spine for this strategy posture/i)).toBeDefined();
    expect(screen.getAllByText(/Haas ST-20Y/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/17-4 round bar/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows the shared programming posture for the selected machine axis', async () => {
    renderPage();

    expect(await screen.findByText('Programming posture')).toBeDefined();
    expect(await screen.findByText(/Cimatron/i)).toBeDefined();

    fireEvent.change(screen.getByLabelText('Machine Axes'), {
      target: { value: 'lathe' },
    });

    expect(await screen.findByText(/Fusion 360/i)).toBeDefined();
    expect(screen.getByText((content) => content.includes('JM Die seeded packages'))).toBeDefined();
  });

  it('hydrates exact release selectors from a routed print-to-cnc handoff', async () => {
    renderPage('/toolpath?source=print-to-cnc&machineId=st20-turn&machineFamilyId=lathe&machineManufacturer=haas&partClassId=turned-shaft&toolholderId=capto-turn&toolingPackageId=steel-balanced&fixtureId=softjaw-collet&stockId=174-round&cadSourceId=fusion-master');

    await waitFor(() => {
      expect((screen.getByLabelText('Machine Axes') as HTMLSelectElement).value).toBe('lathe');
    });

    expect((screen.getByLabelText('Material Family') as HTMLSelectElement).value).toBe('stainless');
    expect(screen.getByText(/Route authority pinned Haas ST-20Y for this release/i)).toBeDefined();
    expect(screen.getByText(/Routed release spine for this strategy posture: Haas ST-20Y \/ Capto C6 turn\/mill holder \/ Balanced steel package \/ 17-4 round bar\./i)).toBeDefined();
  });

  it('fails closed for routed wire edm release packets', async () => {
    renderPage('/toolpath?source=print-to-cnc&machineId=aln600g-wire&machineFamilyId=wire-edm&machineManufacturer=sodick&partClassId=fixture-plate&toolholderId=shrinkfit-short&toolingPackageId=steel-balanced&fixtureId=modular-plate&stockId=d2-plate&cadSourceId=neutral-compare');

    expect(await screen.findByText(/Toolpath Advisor is not yet wired for the routed Wire EDM posture/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Toolpath Advisor unavailable for this routed posture' })).toBeDisabled();
  });
});
