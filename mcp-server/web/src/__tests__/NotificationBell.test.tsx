import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationBell } from '../components/NotificationBell';
import { ApiError, notifyGetInApp, notifyMarkRead } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    notifyGetInApp: vi.fn(),
    notifyMarkRead: vi.fn(),
  };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockNotifyGetInApp = vi.mocked(notifyGetInApp);
const mockNotifyMarkRead = vi.mocked(notifyMarkRead);
const mockUseAuth = vi.mocked(useAuth);

const mountedNotifications = [
  {
    id: 'note-1',
    type: 'alert' as const,
    subject: 'Wire job awaiting review',
    body: 'A routed wire program needs confirmation.',
    created_at: '2026-04-14T16:00:00.000Z',
    read: false,
  },
  {
    id: 'note-2',
    type: 'info' as const,
    subject: 'Lathe packet released',
    body: 'Lathe packet release completed successfully.',
    created_at: '2026-04-14T15:30:00.000Z',
    read: false,
  },
];

describe('NotificationBell', () => {
  beforeEach(() => {
    mockNotifyGetInApp.mockReset();
    mockNotifyMarkRead.mockReset();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      token: 'token',
      userId: 'auth-1',
      employee: {
        id: 'EMP-1',
        first_name: 'Mark',
        last_name: 'V',
        department: 'Engineering',
        role: 'Lead',
        clearance_level: 'lead',
      },
      clearance_level: 'lead',
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      displayName: 'Mark V',
    });
  });

  it('renders mounted notifications from the shared client contract', async () => {
    mockNotifyGetInApp.mockResolvedValue({ result: mountedNotifications } as any);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockNotifyGetInApp).toHaveBeenCalledWith('EMP-1');
    });

    expect(screen.getByRole('button', { name: /notifications \(2 unread\)/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /notifications \(2 unread\)/i }));

    expect(await screen.findByText('Wire job awaiting review')).toBeDefined();
    expect(screen.getByText('Lathe packet released')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Mark All Read' })).toBeDefined();
  });

  it('marks a single mounted notification read through the shared client contract', async () => {
    mockNotifyGetInApp.mockResolvedValue({ result: mountedNotifications } as any);
    mockNotifyMarkRead.mockResolvedValue({ result: { ok: true } } as any);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockNotifyGetInApp).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /notifications \(2 unread\)/i }));
    fireEvent.click(await screen.findByRole('button', { name: /wire job awaiting review/i }));

    await waitFor(() => {
      expect(mockNotifyMarkRead).toHaveBeenCalledWith('EMP-1', 'note-1');
    });

    expect(screen.getByRole('button', { name: /notifications \(1 unread\)/i })).toBeDefined();
  });

  it('marks all mounted notifications read through the shared client contract', async () => {
    mockNotifyGetInApp.mockResolvedValue({ result: mountedNotifications } as any);
    mockNotifyMarkRead.mockResolvedValue({ result: { ok: true } } as any);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockNotifyGetInApp).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /notifications \(2 unread\)/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mark All Read' }));

    await waitFor(() => {
      expect(mockNotifyMarkRead).toHaveBeenCalledTimes(2);
    });

    expect(mockNotifyMarkRead).toHaveBeenCalledWith('EMP-1', 'note-1');
    expect(mockNotifyMarkRead).toHaveBeenCalledWith('EMP-1', 'note-2');
    expect(screen.getByRole('button', { name: /notifications/i })).toBeDefined();
  });

  it('shows explicit unavailable posture when the live notification feed fails', async () => {
    mockNotifyGetInApp.mockRejectedValue(new ApiError(503, 'Notification feed offline'));

    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockNotifyGetInApp).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(await screen.findByText('Notifications unavailable')).toBeDefined();
    expect(screen.getByText('Notification feed offline')).toBeDefined();
  });
});
