// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';

function renderProtectedRoute(initialEntry: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<div>Login target</div>} />
          <Route
            path="/people"
            element={(
              <ProtectedRoute minClearance="hr_manager">
                <div>People desk</div>
              </ProtectedRoute>
            )}
          />
          <Route
            path="/ledger"
            element={(
              <ProtectedRoute minClearance="admin">
                <div>Ledger desk</div>
              </ProtectedRoute>
            )}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('redirects unauthenticated users to login', async () => {
    renderProtectedRoute('/people');

    await waitFor(() => {
      expect(screen.getByText('Login target')).toBeDefined();
    });
  });

  it('shows an access-restricted state when clearance is insufficient', async () => {
    window.localStorage.setItem('prism-auth-token', JSON.stringify({
      token: 'token-shop-floor',
      userId: 'user-1',
      employee: {
        id: 'EMP-001',
        first_name: 'Avery',
        last_name: 'Stone',
        department: 'Machining',
        role: 'Machinist',
        clearance_level: 'shop_floor',
      },
    }));

    renderProtectedRoute('/people');

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeDefined();
      expect(screen.getByText(/Required: hr_manager or higher/i)).toBeDefined();
    });
  });

  it('renders the protected desk when clearance is sufficient', async () => {
    window.localStorage.setItem('prism-auth-token', JSON.stringify({
      token: 'token-admin',
      userId: 'user-2',
      employee: {
        id: 'EMP-002',
        first_name: 'Jordan',
        last_name: 'Vale',
        department: 'Operations',
        role: 'Manager',
        clearance_level: 'admin',
      },
    }));

    renderProtectedRoute('/ledger');

    await waitFor(() => {
      expect(screen.getByText('Ledger desk')).toBeDefined();
    });
  });
});
