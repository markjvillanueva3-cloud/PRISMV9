// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ShellGatewayPage } from '../pages/ShellGatewayPage';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import type { OperatingSystemServices } from '../features/operating-system/contracts';
import {
  clearShellSession,
  loadShellSession,
  persistEmployeeShellSession,
} from '../features/operating-system/shellSession';

function renderGateway(initialEntry = '/signin', services?: OperatingSystemServices) {
  return render(
    <OperatingSystemProvider services={services}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={<ShellGatewayPage />} />
          <Route path="/signin" element={<ShellGatewayPage />} />
          <Route path="/employee" element={<div>Employee shell target</div>} />
          <Route path="/employee/messages" element={<div>Employee messages target</div>} />
          <Route path="/dashboard" element={<div>Admin workspace target</div>} />
          <Route path="/messages" element={<div>Admin messages target</div>} />
        </Routes>
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

describe('ShellGatewayPage', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    clearShellSession();
  });

  it('renders role-aware sign-in options when no shell session exists', async () => {
    renderGateway('/signin');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Choose Your Workspace' })).toBeDefined();
    });

    expect(screen.getByText('Identity and inbox status')).toBeDefined();
    expect(screen.getByRole('button', { name: /Enter Avery Stone shell/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Enter Jordan Vale shell/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Open full operations workspace/i })).toBeDefined();
  });

  it('redirects the remembered employee shell from the root route', async () => {
    persistEmployeeShellSession('planner');

    renderGateway('/');

    await waitFor(() => {
      expect(screen.getByText('Employee shell target')).toBeDefined();
    });
  });

  it('opens the admin workspace and stores that shell choice', async () => {
    renderGateway('/signin');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open full operations workspace/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Open full operations workspace/i }));

    await waitFor(() => {
      expect(screen.getByText('Admin workspace target')).toBeDefined();
    });

    expect(loadShellSession()?.kind).toBe('admin');
  });

  it('resolves a recognized email into the messages workspace and stores the identity', async () => {
    renderGateway('/signin');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Continue with email/i })).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText('name@shop.com'), {
      target: { value: '  AVERY.STONE@orchidprecision.com  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue with email/i }));

    await waitFor(() => {
      expect(screen.getByText('Employee messages target')).toBeDefined();
    });

    expect(loadShellSession()).toMatchObject({
      kind: 'employee',
      profileId: 'machinist',
      email: 'avery.stone@orchidprecision.com',
      identityLabel: 'Avery Stone',
    });
  });

  it('still renders email-linked sign-in when employee profiles fail but mailbox options load', async () => {
    const services: OperatingSystemServices = {
      ...fixtureOperatingSystemServices,
      async getEmployeeShellProfiles() {
        throw new Error('employee profiles unavailable');
      },
    };

    renderGateway('/signin', services);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Choose Your Workspace' })).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Continue with email/i })).toBeDefined();
    expect(screen.getByText('Recognized mailboxes')).toBeDefined();
    expect(screen.queryByText(/employee profiles unavailable/i)).toBeNull();
  });
});
