// @vitest-environment jsdom
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MessagesPage } from '../pages/MessagesPage';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import { clearShellSession, persistAdminShellSession, persistEmployeeShellSession } from '../features/operating-system/shellSession';

const fetchMock = vi.fn();

function renderMessages(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/jobs" element={<div>Admin jobs target</div>} />
        <Route path="/employee/messages" element={<MessagesPage />} />
        <Route path="/employee/jobs" element={<div>Employee jobs target</div>} />
        <Route path="/employee/quality" element={<div>Employee quality target</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MessagesPage', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    clearShellSession();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

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
                    value: 'Safety-critical CNC manufacturing control system.',
                  },
                },
                roadmap: {
                  current_phase: {
                    value: 'Finish the active backend and frontend delivery tranche before opening a new expansion pass.',
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
              estimated_tokens: 50000,
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
              subcategory: 'messages_brief',
              confidence: 0.93,
              tier: 'multi_domain',
              domains: ['messages', 'operations'],
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
              domains: ['messages', 'operations', 'commercial'],
              complexity: 'high',
              reason: 'Inbox continuity spans selected thread risk, linked records, and shop-hot follow-up.',
              estimated_steps: 3,
            },
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            task_id: 'TASK-MSG-1',
            tier: 'full_chain',
            status: 'success',
            started_at: '2026-04-15T12:00:00Z',
            completed_at: '2026-04-15T12:00:01Z',
            duration_ms: 1000,
            domain_results: [
              {
                domain: 'messages',
                result: {
                  summary: 'Answer the customer shipment thread before opening lower-priority inbox follow-up.',
                },
              },
            ],
            final_result: {
              summary: 'Answer the customer shipment thread before opening lower-priority inbox follow-up.',
            },
            authority_resolution: {
              winning_source: 'mounted',
              confidence: 0.95,
              conflicts_resolved: 0,
            },
            recommendations: [
              'Answer the customer shipment thread before opening lower-priority inbox follow-up.',
              'Keep the linked job and release records attached while the inbox routes the next action.',
            ],
          },
        }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('renders the shared admin inbox with the linked mailbox context', async () => {
    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

    renderMessages('/messages');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Messages' })).toBeDefined();
    });

    expect(screen.getByText('Mailbox convergence')).toBeDefined();
    expect(screen.getByText('olivia.reyes@orchidprecision.com')).toBeDefined();
    expect(screen.getAllByText('Customer pull-in on JOB-4821 shipment').length).toBeGreaterThan(0);
    expect(screen.getByText('Reply by email')).toBeDefined();
  });

  it('keeps the Kienzle AI copilot built into the messages desk with persistent memory context', async () => {
    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

    renderMessages('/messages');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Messages' })).toBeDefined();
      expect(screen.getByText(/Kienzle AI copilot/i)).toBeDefined();
      expect(screen.getByText(/Persistent Kienzle memory/i)).toBeDefined();
      expect(screen.getByText(/Safety-critical CNC manufacturing control system\./i)).toBeDefined();
      expect(screen.getByText(/Mounted messages workspace/i)).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Refresh AI brief/i })).toBeDefined();
    await waitFor(() =>
      expect(screen.getAllByText(/Answer the customer shipment thread before opening lower-priority inbox follow-up\./i).length).toBeGreaterThan(0),
    );
  });

  it('keeps employee messages linked to employee-shell records', async () => {
    persistEmployeeShellSession('machinist', {
      id: 'login-machinist',
      displayName: 'Avery Stone',
      email: 'avery.stone@orchidprecision.com',
    });

    renderMessages('/employee/messages?profile=machinist');

    await waitFor(() => {
      expect(screen.getByText('avery.stone@orchidprecision.com')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Witness dimension after hold release/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Witness dimension after hold release').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole('link', { name: /Titanium impeller roughing package/i })[0]);

    await waitFor(() => {
      expect(screen.getByText('Employee jobs target')).toBeDefined();
    });
  });

  it('shows upstream source context when launched from purchase orders', async () => {
    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

    renderMessages('/messages?source=purchase-orders&recordType=PO&recordId=PO-44&note=Confirm%20dock%20date');

    await waitFor(() => {
      expect(screen.getByText(/Purchase Orders opened Messages with follow-up context/i)).toBeDefined();
    });

    expect(screen.getAllByText(/Record:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PO PO-44/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Confirm dock date/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Thread:/i).length).toBeGreaterThan(0);

    const jobsLink = screen.getAllByRole('link', { name: /Open Jobs follow-up/i })[0];
    const printLink = screen.getAllByRole('link', { name: /Open Print to CNC/i })[0];
    expect(jobsLink.getAttribute('href')).toContain('/jobs?');
    expect(jobsLink.getAttribute('href')).toContain('originSource=purchase-orders');
    expect(jobsLink.getAttribute('href')).toContain('source=messages');
    expect(jobsLink.getAttribute('href')).toContain('recordType=PO');
    expect(printLink.getAttribute('href')).toContain('/print-to-cnc?');
    expect(printLink.getAttribute('href')).toContain('originSource=purchase-orders');
    expect(printLink.getAttribute('href')).toContain('source=messages');
  });

  it('preserves customer context in workflow follow-up links without forcing the customer id into job focus', async () => {
    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

    renderMessages(
      '/messages?source=customers&recordType=Customer&recordId=CUST-001&customer=Acme%20Aerospace&note=Carry%20RFQ%20context',
    );

    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Messages with follow-up context/i)).toBeDefined();
    });

    const jobsLink = screen.getAllByRole('link', { name: /Open Jobs follow-up/i })[0];
    const printLink = screen.getAllByRole('link', { name: /Open Print to CNC/i })[0];

    expect(jobsLink.getAttribute('href')).toContain('/jobs?');
    expect(jobsLink.getAttribute('href')).toContain('originSource=customers');
    expect(jobsLink.getAttribute('href')).toContain('source=messages');
    expect(jobsLink.getAttribute('href')).toContain('recordType=Customer');
    expect(jobsLink.getAttribute('href')).toContain('recordId=CUST-001');
    expect(jobsLink.getAttribute('href')).toContain('customer=Acme+Aerospace');
    expect(jobsLink.getAttribute('href')).toContain('note=Carry+RFQ+context');
    expect(jobsLink.getAttribute('href')).toContain('thread=');
    expect(jobsLink.getAttribute('href')).not.toContain('focusId=CUST-001');

    expect(printLink.getAttribute('href')).toContain('/print-to-cnc?');
    expect(printLink.getAttribute('href')).toContain('originSource=customers');
    expect(printLink.getAttribute('href')).toContain('source=messages');
    expect(printLink.getAttribute('href')).toContain('recordType=Customer');
    expect(printLink.getAttribute('href')).toContain('recordId=CUST-001');
    expect(printLink.getAttribute('href')).toContain('customer=Acme+Aerospace');
    expect(printLink.getAttribute('href')).toContain('note=Carry+RFQ+context');
    expect(printLink.getAttribute('href')).toContain('thread=');
  });

  it('shows launcher context separately from upstream commercial origin when both are present', async () => {
    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

    renderMessages(
      '/messages?source=quote-builder&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&note=Carry%20RFQ%20context',
    );

    await waitFor(() => {
      expect(screen.getByText(/Quote Builder opened Messages with follow-up context/i)).toBeDefined();
    });

    expect(screen.getByText(/Upstream commercial origin:/i)).toBeDefined();
    expect(screen.getAllByText(/Customers & CRM/i).length).toBeGreaterThan(0);

    const jobsLink = screen.getByRole('link', { name: /Open Jobs follow-up/i });
    expect(jobsLink.getAttribute('href')).toContain('source=messages');
    expect(jobsLink.getAttribute('href')).toContain('originSource=customers');
  });

  it('shows record, customer, and thread details when execution desks open messages', async () => {
    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

    renderMessages(
      '/messages?source=shop-floor-clock&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&originThreadId=thread-rfq&recordType=Customer&recordId=CUST-001&customer=Acme%20Aerospace&thread=thread-rfq&note=Carry%20customer%20list%20context%20into%20internal%20pricing%20review%20for%20Acme%20Aerospace.',
    );

    await waitFor(() => {
      expect(screen.getByText(/Shop Floor Clock opened Messages with follow-up context/i)).toBeDefined();
    });

    expect(screen.getAllByText(/Record:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Customer:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Thread:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Origin thread:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Customers & CRM/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Acme Aerospace/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/thread-admin-hot-job/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/thread-rfq/i).length).toBeGreaterThan(0);
  });

  it('updates the shop-hot follow-up lane when a hot job is raised while messages stays open', async () => {
    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

    renderMessages('/messages');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Messages' })).toBeDefined();
    });

    expect(screen.getByText(/No shop-wide hot jobs are active right now\./)).toBeDefined();

    await act(async () => {
      await fixtureOperatingSystemServices.setJobHot({
        jobId: 'JOB-HOT-88',
        partNumber: 'FIRE-88',
        customer: 'Atlas Medical',
        dueDate: '2026-04-04',
        note: 'Management flagged this packet hot while the inbox stayed open.',
        setBy: 'Management',
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(screen.getByText('FIRE-88')).toBeDefined();
      expect(
        screen.getAllByText(/Management flagged this packet hot while the inbox stayed open\./).length,
      ).toBeGreaterThan(0);
      expect(screen.getByText('1 shop hot')).toBeDefined();
    });
  });

  it('opens a staged action workspace when Reply by email is clicked', async () => {
    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

    renderMessages('/messages');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Messages' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reply by email' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Reply by email workspace/i })).toBeDefined();
    });

    const draft = await screen.findByRole('textbox', { name: /Reply by email draft/i }) as HTMLTextAreaElement;
    expect(draft.value).toContain('Customer pull-in on JOB-4821 shipment');
    expect(draft.value).toContain('JOB-4821');
    expect(screen.getByText('Action workspace')).toBeDefined();
    expect(screen.getByText('Linked records')).toBeDefined();
  });

  it('opens an employee staged action workspace and preserves linked job follow-up', async () => {
    persistEmployeeShellSession('machinist', {
      id: 'login-machinist',
      displayName: 'Avery Stone',
      email: 'avery.stone@orchidprecision.com',
    });

    renderMessages('/employee/messages?profile=machinist');

    await waitFor(() => {
      expect(screen.getByText('avery.stone@orchidprecision.com')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open linked record' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Open linked record workspace/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('link', { name: /Open linked job/i }));

    await waitFor(() => {
      expect(screen.getByText('Employee jobs target')).toBeDefined();
    });
  });

  it('keeps launcher and origin follow-up links intact while an action is staged', async () => {
    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

    renderMessages(
      '/messages?source=customers&recordType=Customer&recordId=CUST-001&customer=Acme%20Aerospace&note=Carry%20RFQ%20context',
    );

    await waitFor(() => {
      expect(screen.getByText(/Customers & CRM opened Messages with follow-up context/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reply by email' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Reply by email workspace/i })).toBeDefined();
    });

    const jobsLink = screen.getByRole('link', { name: /Open Jobs follow-up/i });
    const printLinks = screen.getAllByRole('link', { name: /Open Print to CNC/i });

    expect(jobsLink.getAttribute('href')).toContain('source=messages');
    expect(jobsLink.getAttribute('href')).toContain('originSource=customers');
    printLinks.forEach((link) => {
      expect(link.getAttribute('href')).toContain('source=messages');
      expect(link.getAttribute('href')).toContain('originSource=customers');
    });
  });

  it('preserves upstream release authority in print-to-cnc follow-up links', async () => {
    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

    renderMessages(
      '/messages?source=jobs-desk&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&recordType=Job&recordId=JOB-4821&focusType=job&focusId=JOB-4821&focusJobId=JOB-4821&machineId=vf2-3x&machineFamilyId=3-axis&machineManufacturer=haas&partClassId=prismatic-bracket&cadSourceId=fusion-master',
    );

    await waitFor(() => {
      expect(screen.getByText(/Jobs desk opened Messages with follow-up context/i)).toBeDefined();
    });

    const workflowPrintLink = screen.getAllByRole('link', { name: /Open Print to CNC/i })[0];
    expect(workflowPrintLink.getAttribute('href')).toContain('source=messages');
    expect(workflowPrintLink.getAttribute('href')).toContain('originSource=customers');
    expect(workflowPrintLink.getAttribute('href')).toContain('machineId=vf2-3x');
    expect(workflowPrintLink.getAttribute('href')).toContain('machineFamilyId=3-axis');
    expect(workflowPrintLink.getAttribute('href')).toContain('machineManufacturer=haas');
    expect(workflowPrintLink.getAttribute('href')).toContain('partClassId=prismatic-bracket');
    expect(workflowPrintLink.getAttribute('href')).toContain('cadSourceId=fusion-master');

    fireEvent.click(screen.getByRole('button', { name: 'Reply by email' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Reply by email workspace/i })).toBeDefined();
    });

    const stagedPrintLinks = screen.getAllByRole('link', { name: /Open Print to CNC/i });
    stagedPrintLinks.forEach((link) => {
      expect(link.getAttribute('href')).toContain('source=messages');
      expect(link.getAttribute('href')).toContain('machineId=vf2-3x');
      expect(link.getAttribute('href')).toContain('machineFamilyId=3-axis');
      expect(link.getAttribute('href')).toContain('machineManufacturer=haas');
      expect(link.getAttribute('href')).toContain('partClassId=prismatic-bracket');
      expect(link.getAttribute('href')).toContain('cadSourceId=fusion-master');
    });
  });

  it('preserves upstream packet focus across workflow and staged follow-up links', async () => {
    persistAdminShellSession({
      id: 'login-ops-manager',
      displayName: 'Olivia Reyes',
      email: 'olivia.reyes@orchidprecision.com',
    });

    renderMessages(
      '/messages?source=inventory-desk&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&focusType=packet&focusId=PKT-300&focusPacketId=PKT-300&machineId=vf2-3x&machineFamilyId=3-axis&partClassId=impeller-finish',
    );

    await waitFor(() => {
      expect(screen.getByText(/Inventory desk opened Messages with follow-up context/i)).toBeDefined();
    });

    const workflowJobsLink = screen.getAllByRole('link', { name: /Open Jobs follow-up/i })[0];
    const workflowPrintLink = screen.getAllByRole('link', { name: /Open Print to CNC/i })[0];
    const workflowJobsUrl = new URL(workflowJobsLink.getAttribute('href')!, 'https://kienzle.local');
    const workflowPrintUrl = new URL(workflowPrintLink.getAttribute('href')!, 'https://kienzle.local');

    expect(workflowJobsUrl.pathname).toBe('/jobs');
    expect(workflowJobsUrl.searchParams.get('originSource')).toBe('customers');
    expect(workflowJobsUrl.searchParams.get('source')).toBe('messages');
    expect(workflowJobsUrl.searchParams.get('focusType')).toBe('packet');
    expect(workflowJobsUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(workflowJobsUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(workflowJobsUrl.searchParams.get('focusJobId')).toBeNull();

    expect(workflowPrintUrl.pathname).toBe('/print-to-cnc');
    expect(workflowPrintUrl.searchParams.get('originSource')).toBe('customers');
    expect(workflowPrintUrl.searchParams.get('source')).toBe('messages');
    expect(workflowPrintUrl.searchParams.get('focusType')).toBe('packet');
    expect(workflowPrintUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(workflowPrintUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(workflowPrintUrl.searchParams.get('focusJobId')).toBeNull();
    expect(workflowPrintUrl.searchParams.get('machineId')).toBe('vf2-3x');
    expect(workflowPrintUrl.searchParams.get('machineFamilyId')).toBe('3-axis');
    expect(workflowPrintUrl.searchParams.get('partClassId')).toBe('impeller-finish');

    fireEvent.click(screen.getByRole('button', { name: 'Reply by email' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Reply by email workspace/i })).toBeDefined();
    });

    const stagedJobsLink = screen.getByRole('link', { name: /Open Jobs follow-up/i });
    const stagedPrintLink = screen.getAllByRole('link', { name: /Open Print to CNC/i }).find((link) =>
      link.getAttribute('href')?.includes('/print-to-cnc?'),
    );

    expect(stagedPrintLink).toBeDefined();

    const stagedJobsUrl = new URL(stagedJobsLink.getAttribute('href')!, 'https://kienzle.local');
    const stagedPrintUrl = new URL(stagedPrintLink!.getAttribute('href')!, 'https://kienzle.local');

    expect(stagedJobsUrl.pathname).toBe('/jobs');
    expect(stagedJobsUrl.searchParams.get('originSource')).toBe('customers');
    expect(stagedJobsUrl.searchParams.get('source')).toBe('messages');
    expect(stagedJobsUrl.searchParams.get('focusType')).toBe('packet');
    expect(stagedJobsUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(stagedJobsUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(stagedJobsUrl.searchParams.get('focusJobId')).toBeNull();

    expect(stagedPrintUrl.pathname).toBe('/print-to-cnc');
    expect(stagedPrintUrl.searchParams.get('originSource')).toBe('customers');
    expect(stagedPrintUrl.searchParams.get('source')).toBe('messages');
    expect(stagedPrintUrl.searchParams.get('focusType')).toBe('packet');
    expect(stagedPrintUrl.searchParams.get('focusId')).toBe('PKT-300');
    expect(stagedPrintUrl.searchParams.get('focusPacketId')).toBe('PKT-300');
    expect(stagedPrintUrl.searchParams.get('focusJobId')).toBeNull();
    expect(stagedPrintUrl.searchParams.get('machineId')).toBe('vf2-3x');
    expect(stagedPrintUrl.searchParams.get('machineFamilyId')).toBe('3-axis');
    expect(stagedPrintUrl.searchParams.get('partClassId')).toBe('impeller-finish');
  });
});
