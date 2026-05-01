// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Layout } from '../components/Layout';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import { FIXTURE_RESULTS } from '../features/operating-system/shellFixtures';
import {
  SHELL_SAVED_VIEWS_EVENT,
  SHELL_SAVED_VIEWS_KEY,
} from '../features/operating-system/shellSavedViewsState';

function renderLayout(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<div>Dashboard content</div>} />
          <Route path="/calculator" element={<div>Calculator content</div>} />
          <Route path="/toolpath" element={<div>Toolpath content</div>} />
        <Route path="/what-if" element={<div>What-if content</div>} />
        <Route path="/ppg" element={<div>PPG content</div>} />
        <Route path="/messages" element={<div>Messages content</div>} />
        <Route path="/quality" element={<div>Quality content</div>} />
          <Route path="/jobs" element={<div>Jobs content</div>} />
          <Route path="/quote-builder" element={<div>Quote Builder content</div>} />
          <Route path="/customers" element={<div>Customers content</div>} />
          <Route path="/purchase-orders" element={<div>Purchase Orders content</div>} />
          <Route path="/orders" element={<div>Orders content</div>} />
          <Route path="/intelligence" element={<div>Intelligence content</div>} />
          <Route path="/learning" element={<div>Learning content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderLayoutWithServices(initialEntry: string, services = fixtureOperatingSystemServices) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <OperatingSystemProvider services={services}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<div>Dashboard content</div>} />
            <Route path="/calculator" element={<div>Calculator content</div>} />
            <Route path="/toolpath" element={<div>Toolpath content</div>} />
            <Route path="/what-if" element={<div>What-if content</div>} />
            <Route path="/ppg" element={<div>PPG content</div>} />
            <Route path="/messages" element={<div>Messages content</div>} />
            <Route path="/quality" element={<div>Quality content</div>} />
            <Route path="/jobs" element={<div>Jobs content</div>} />
            <Route path="/quote-builder" element={<div>Quote Builder content</div>} />
            <Route path="/customers" element={<div>Customers content</div>} />
            <Route path="/purchase-orders" element={<div>Purchase Orders content</div>} />
            <Route path="/orders" element={<div>Orders content</div>} />
            <Route path="/intelligence" element={<div>Intelligence content</div>} />
            <Route path="/learning" element={<div>Learning content</div>} />
          </Route>
        </Routes>
      </OperatingSystemProvider>
    </MemoryRouter>,
  );
}

function expandDesktopRailIfCollapsed() {
  const toggle = screen.queryByTestId('desktop-header-rail-toggle');
  if (toggle?.textContent?.includes('Show rail')) {
    fireEvent.click(toggle);
  }
}

describe('Layout', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the current page in recent workspaces', () => {
    renderLayout('/ppg');
    expandDesktopRailIfCollapsed();

    expect(screen.getByText('Recent workspaces')).toBeDefined();
    expect(screen.getAllByRole('link', { name: 'Calculator / Post Processor' }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows the messages workspace in the left rail', () => {
    renderLayout('/messages');

    expect(screen.getAllByRole('link', { name: 'Messages' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Messages content')).toBeDefined();
  });

  it('groups calculator-related pages together in the left rail', () => {
    renderLayout('/calculator');
    expandDesktopRailIfCollapsed();

    expect(screen.getAllByText('Calculator').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: 'Studio' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: 'Toolpath Advisor' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: 'What-If Analysis' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: 'Post Processor' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Calculator \/ Studio/).length).toBeGreaterThanOrEqual(1);
  });

  it('keeps the calculator group open when a companion page is active', () => {
    renderLayout('/toolpath');
    expandDesktopRailIfCollapsed();

    expect(screen.getAllByRole('link', { name: 'Toolpath Advisor' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Calculator \/ Toolpath Advisor/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows the post processor workspace inside the calculator group', () => {
    renderLayout('/ppg');
    expandDesktopRailIfCollapsed();

    expect(screen.getAllByRole('link', { name: 'Post Processor' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Calculator \/ Post Processor/).length).toBeGreaterThanOrEqual(1);
  });

  it('pins the current workspace into the left rail', () => {
    renderLayout('/ppg');
    expandDesktopRailIfCollapsed();

    fireEvent.click(screen.getByRole('button', { name: 'Pin current workspace' }));

    expect(screen.getByText('Pinned workspaces')).toBeDefined();
    expect(screen.getAllByRole('link', { name: 'Calculator / Post Processor' }).length).toBeGreaterThanOrEqual(1);
  });

  it('filters the left rail when searching for a workspace', () => {
    renderLayout('/calculator');
    expandDesktopRailIfCollapsed();

    fireEvent.change(screen.getByLabelText('Filter workspace catalog'), {
      target: { value: 'quality' },
    });

    const desktopNav = screen.getByTestId('desktop-nav');
    expect(within(desktopNav).getAllByRole('link', { name: 'Quality' }).length).toBeGreaterThanOrEqual(1);
    expect(within(desktopNav).queryAllByRole('link', { name: 'Job Planner' }).length).toBe(0);
  });

  it('keeps grouped calculator matches visible while searching', () => {
    renderLayout('/calculator');
    expandDesktopRailIfCollapsed();

    fireEvent.change(screen.getByLabelText('Filter workspace catalog'), {
      target: { value: 'post' },
    });

    const desktopNav = screen.getByTestId('desktop-nav');
    expect(within(desktopNav).getAllByRole('link', { name: 'Post Processor' }).length).toBeGreaterThanOrEqual(1);
    expect(within(desktopNav).queryAllByRole('link', { name: 'Toolpath Advisor' }).length).toBe(0);
  });

  it('surfaces the intelligence workspace through the shell catalog', () => {
    renderLayout('/intelligence');
    expandDesktopRailIfCollapsed();

    fireEvent.change(screen.getByLabelText('Filter workspace catalog'), {
      target: { value: 'intelligence' },
    });

    const desktopNav = screen.getByTestId('desktop-nav');
    expect(within(desktopNav).getAllByRole('link', { name: 'PRISM Intelligence' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Intelligence content')).toBeDefined();
  });

  it('uses explicit collapse controls for left-rail section headers', () => {
    renderLayout('/calculator');
    expandDesktopRailIfCollapsed();

    const desktopNav = screen.getByTestId('desktop-nav');

    expect(screen.getByRole('button', { name: 'Collapse Machining' })).toBeDefined();
    expect(within(desktopNav).getAllByRole('link', { name: 'Studio' }).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Machining' }));

    expect(screen.getByRole('button', { name: 'Expand Machining' })).toBeDefined();
    expect(within(desktopNav).queryAllByRole('link', { name: 'Studio' }).length).toBe(0);
  });

  it('keeps the desktop rail and content area on independent scroll regions', () => {
    renderLayout('/jobs');

    const desktopShell = screen.getByTestId('desktop-shell');
    const desktopNavShell = screen.getByTestId('desktop-nav-shell');
    const desktopNav = screen.getByTestId('desktop-nav');
    const railScrollRegion = within(desktopNav).getByRole('navigation');
    const mainScrollRegion = screen.getByTestId('main-scroll-region');

    expect(desktopShell.className).toContain('lg:min-h-0');
    expect(desktopShell.className).toContain('lg:overflow-hidden');
    expect(desktopShell.className).toContain('lg:flex-1');
    expect(desktopNavShell.className).toContain('lg:w-[288px]');
    expect(desktopNav.className).toContain('lg:h-full');
    expect(desktopNav.className).toContain('lg:overflow-hidden');
    expect(railScrollRegion.className).toContain('min-h-0');
    expect(railScrollRegion.className).toContain('overflow-y-auto');
    expect(mainScrollRegion.className).toContain('lg:flex-1');
    expect(mainScrollRegion.className).toContain('lg:overflow-y-auto');
  });

  it('collapses the desktop sidebar into a left-edge reopen ghost trigger', () => {
    renderLayout('/jobs');

    expect(screen.getByTestId('desktop-header-rail-toggle')).toBeDefined();
    expect(screen.getByTestId('sidebar-collapse-trigger')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    const desktopNavShell = screen.getByTestId('desktop-nav-shell');
    const desktopNav = screen.getByTestId('desktop-nav');
    const reopenTrigger = screen.getByTestId('sidebar-reopen-trigger');
    const persistedState = JSON.parse(window.localStorage.getItem('prism_nav_state_v1') ?? '{}');

    expect(desktopNavShell.className).toContain('lg:w-0');
    expect(desktopNav.className).toContain('lg:-translate-x-full');
    expect(reopenTrigger.className).toContain('opacity-90');
    expect(persistedState.desktopSidebarCollapsed).toBe(true);
    expect(screen.getByRole('button', { name: 'Open sidebar' })).toBeDefined();
  });

  it('toggles the rail from the desktop header fallback control', () => {
    renderLayout('/jobs');

    fireEvent.click(screen.getByTestId('desktop-header-rail-toggle'));

    expect(screen.getByTestId('desktop-nav-shell').className).toContain('lg:w-0');
    expect(screen.getByTestId('desktop-header-rail-toggle').textContent).toContain('Show rail');
  });

  it('defaults calculator workspaces into a focused full-width layout', () => {
    renderLayout('/calculator');

    expect(screen.getByTestId('desktop-nav-shell').className).toContain('lg:w-0');
    expect(screen.getByTestId('desktop-header-rail-toggle').textContent).toContain('Show rail');
    expect(screen.queryByTestId('sidebar-reopen-trigger')).toBeNull();
  });

  it('reopens the desktop sidebar from the ghost trigger', () => {
    renderLayout('/jobs');

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open sidebar' }));

    const persistedState = JSON.parse(window.localStorage.getItem('prism_nav_state_v1') ?? '{}');

    expect(screen.getByTestId('desktop-nav-shell').className).toContain('lg:w-[288px]');
    expect(screen.queryByTestId('sidebar-reopen-trigger')).toBeNull();
    expect(persistedState.desktopSidebarCollapsed).toBe(false);
    expect(screen.getByTestId('sidebar-collapse-trigger')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeDefined();
  });

  it('opens global search from the keyboard and navigates to a matching record', async () => {
    renderLayout('/calculator');

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Global search' })).toBeDefined();

    fireEvent.change(screen.getByLabelText('Global search query'), {
      target: { value: 'impeller' },
    });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Titanium impeller roughing package/i }).length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Titanium impeller roughing package/i })[0]);

    expect(screen.getByText('Jobs content')).toBeDefined();
    expect(screen.getAllByText('Titanium impeller roughing package').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Recent records')).toBeDefined();
  });

  it('pins the focused record in the shell', () => {
    renderLayout('/jobs?focusId=JOB-4821&focusType=job');

    fireEvent.click(screen.getByRole('button', { name: 'Pin focused record' }));

    expect(screen.getByText('Pinned records')).toBeDefined();
    expect(screen.getAllByText('Titanium impeller roughing package').length).toBeGreaterThanOrEqual(1);
  });

  it('hydrates shell record rails from the provider-backed shell record state', async () => {
    const services = {
      ...fixtureOperatingSystemServices,
      async getShellRecordState() {
        return {
          pinnedRecords: [FIXTURE_RESULTS[6]],
          recentRecords: [FIXTURE_RESULTS[3]],
        };
      },
    };

    renderLayoutWithServices('/jobs', services);

    await waitFor(() => {
      expect(screen.getAllByText('5-axis manifold setup candidate').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Apex Aerospace portal visibility lane').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('saves and deletes the current workspace view through the shell rail', async () => {
    renderLayoutWithServices('/ppg');

    fireEvent.click(screen.getAllByRole('button', { name: 'Save current view' })[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Saved views').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('button', { name: 'Refresh saved view' }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('button', { name: 'Delete saved view' }).length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete saved view' })[0]);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Save current view' }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('hydrates saved views from the provider-backed workspace view state', async () => {
    const services = {
      ...fixtureOperatingSystemServices,
      async getShellSavedViews() {
        return [
          {
            id: 'view-1',
            userId: 'shell-default',
            name: 'Planner queue',
            entityType: 'workspace',
            to: '/jobs?focusId=JOB-4821&focusType=job',
            isDefault: true,
            updatedAt: '2026-03-30T12:00:00Z',
          },
        ];
      },
    };

    renderLayoutWithServices('/jobs', services);

    await waitFor(() => {
      expect(screen.getAllByText('Saved views').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('button', { name: 'Planner queue' }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('refreshes a saved view without clobbering its custom name', async () => {
    let capturedUpdateInvoked = false;
    let capturedUpdateName: string | undefined = 'sentinel';
    const services = {
      ...fixtureOperatingSystemServices,
      async getShellSavedViews() {
        return [
          {
            id: 'view-1',
            userId: 'shell-default',
            name: 'Planner queue',
            entityType: 'workspace',
            to: '/jobs?focusId=JOB-4821&focusType=job',
            isDefault: false,
            updatedAt: '2026-03-30T12:00:00Z',
          },
        ];
      },
      async updateShellSavedView(input: { viewId: string; name?: string; to?: string; isDefault?: boolean }) {
        capturedUpdateInvoked = true;
        capturedUpdateName = input.name;
        return [
          {
            id: 'view-1',
            userId: 'shell-default',
            name: 'Planner queue',
            entityType: 'workspace',
            to: input.to ?? '/jobs?focusId=JOB-4821&focusType=job',
            isDefault: false,
            updatedAt: '2026-03-30T12:05:00Z',
          },
        ];
      },
    };

    renderLayoutWithServices('/jobs?focusId=JOB-4821&focusType=job', services);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Planner queue' }).length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Refresh saved view' })[0]);

    await waitFor(() => {
      expect(capturedUpdateInvoked).toBe(true);
    });

    expect(capturedUpdateName).toBeUndefined();
    expect(screen.getAllByRole('button', { name: 'Planner queue' }).length).toBeGreaterThanOrEqual(1);
  });

  it('refreshes saved-view chips when another surface updates local fallback state', async () => {
    renderLayoutWithServices('/jobs');

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Save current view' }).length).toBeGreaterThanOrEqual(1);
    });

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(SHELL_SAVED_VIEWS_EVENT, {
          detail: [
            {
              id: 'view-1',
              userId: 'shell-default',
              name: 'Planner queue',
              entityType: 'workspace',
              to: '/jobs?focusId=JOB-4821&focusType=job',
              isDefault: true,
              updatedAt: '2026-03-30T12:00:00Z',
            },
          ],
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Planner queue' }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('refreshes saved-view chips when another tab updates local fallback state', async () => {
    renderLayoutWithServices('/jobs');

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SHELL_SAVED_VIEWS_KEY,
      }),
    );

    window.localStorage.setItem(
      SHELL_SAVED_VIEWS_KEY,
      JSON.stringify([
        {
          id: 'view-2',
          userId: 'shell-default',
          name: 'Estimator board',
          entityType: 'workspace',
          to: '/quote-builder?focusId=RFQ-12&focusType=rfq',
          isDefault: false,
          updatedAt: '2026-03-30T12:10:00Z',
        },
      ]),
    );

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SHELL_SAVED_VIEWS_KEY,
      }),
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Estimator board' }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('falls back to local saved views when provider refresh fails during a storage sync', async () => {
    const services = {
      ...fixtureOperatingSystemServices,
      async getShellSavedViews() {
        throw new Error('provider unavailable');
      },
    };

    renderLayoutWithServices('/jobs', services);

    window.localStorage.setItem(
      SHELL_SAVED_VIEWS_KEY,
      JSON.stringify([
        {
          id: 'view-3',
          userId: 'shell-default',
          name: 'Fallback planner queue',
          entityType: 'workspace',
          to: '/jobs?focusId=JOB-4821&focusType=job',
          isDefault: false,
          updatedAt: '2026-03-30T12:15:00Z',
        },
      ]),
    );

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: SHELL_SAVED_VIEWS_KEY,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Fallback planner queue' }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows site-wide unit, tier, and add-on controls in the shell header', async () => {
    renderLayout('/jobs');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tier features' })).toBeDefined();
    });

    expect(screen.getByText('Operating-system convergence')).toBeDefined();
    expect(screen.getByText(/surface/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Unit system metric' }));
    expect(screen.getByRole('button', { name: 'Unit system metric' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Tier features' }));
    expect(screen.getByRole('dialog', { name: 'Tier features' })).toBeDefined();
    expect(screen.getByText('Tier features and pricing')).toBeDefined();
    expect(screen.getByText('Free')).toBeDefined();
    expect(screen.getByText('Starter')).toBeDefined();
    expect(screen.getByText('$0 / month')).toBeDefined();
    expect(screen.getByText('$149 / month · 1 site')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Close shell commerce modal' }));

    fireEvent.click(screen.getByRole('button', { name: 'Add-on features' }));
    expect(screen.getByRole('dialog', { name: 'Add-on features' })).toBeDefined();
    expect(screen.getByText('Add-on features and sourcing')).toBeDefined();
  });

  it('surfaces shell bootstrap degradation without blanking the layout and allows retry', async () => {
    let attempts = 0;
    const services = {
      ...fixtureOperatingSystemServices,
      async getShellBootstrap() {
        attempts += 1;
        throw new Error('shell bootstrap offline');
      },
    };

    renderLayoutWithServices('/jobs', services);

    await waitFor(() => {
      expect(screen.getByText('Shell bootstrap degraded')).toBeDefined();
      expect(screen.getByText('shell bootstrap offline')).toBeDefined();
      expect(screen.getByText(/falling back to locally persisted state/i)).toBeDefined();
    });

    expect(screen.getByText('Jobs content')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Retry shell bootstrap' }));

    await waitFor(() => {
      expect(attempts).toBeGreaterThanOrEqual(2);
    });
  });
});
