// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProgramReleasePage } from '../pages/ProgramReleasePage';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import type { OperatingSystemServices } from '../features/operating-system/contracts';

function renderPage(
  initialEntry = '/print-to-cnc',
  services: OperatingSystemServices = fixtureOperatingSystemServices,
) {
  return render(
    <OperatingSystemProvider services={services}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ProgramReleasePage />
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

describe('ProgramReleasePage', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the universal print-to-cnc workspace', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Print to CNC')).toBeDefined();
      expect(screen.getByText(/Drop prints, CAD, scans, certs, spreadsheets, or setup notes/i)).toBeDefined();
      expect(screen.getByText('Order of operations and setup sheet')).toBeDefined();
    });

    expect(screen.getByText('Release convergence')).toBeDefined();
    expect(screen.getByText(/2 staged surfaces still depend on provider seams/i)).toBeDefined();
    expect(screen.getByText(/Print to CNC: Staged seam/i)).toBeDefined();
    expect(screen.getByText(/Commerce: Staged seam/i)).toBeDefined();
  });

  it('stages uploaded files regardless of file family', async () => {
    renderPage();

    await screen.findByText('Print to CNC');

    const input = screen.getByLabelText('Universal intake file picker') as HTMLInputElement;
    const files = [
      new File(['solid'], 'bracket.step', { type: 'application/octet-stream' }),
      new File(['drawing'], 'setup-notes.pdf', { type: 'application/pdf' }),
    ];

    fireEvent.change(input, { target: { files } });

    expect(screen.getByText('bracket.step')).toBeDefined();
    expect(screen.getByText('setup-notes.pdf')).toBeDefined();
    expect(screen.getAllByText(/2 files staged/i).length).toBeGreaterThan(0);
  });

  it('syncs staged files into live storage when no canonical attachment target exists yet', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        file_id: 'file-live-1',
        version: 1,
        sha256: 'a'.repeat(64),
        size_bytes: 128,
        deduplicated: false,
        storage_backend: 'local',
        mime_type: 'application/pdf',
        original_name: 'setup-notes.pdf',
      }),
    } as Response);

    renderPage();

    await screen.findByText('Print to CNC');

    fireEvent.change(screen.getByLabelText('Universal intake file picker'), {
      target: {
        files: [new File(['drawing'], 'setup-notes.pdf', { type: 'application/pdf' })],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sync staged files to live packet' }));

    expect(await screen.findByText(/1 staged file synced to live storage/i)).toBeDefined();
    expect(screen.getByText('Live packet ledger')).toBeDefined();
    expect(screen.getByText('Stored live')).toBeDefined();
  });

  it('attaches synced files to quote context when the release desk has a canonical upstream record', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          file_id: 'file-quote-1',
          version: 1,
          sha256: 'b'.repeat(64),
          size_bytes: 512,
          deduplicated: false,
          storage_backend: 'local',
          mime_type: 'model/step',
          original_name: 'bracket.step',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'attachment-1',
          file_id: 'file-quote-1',
          entity_type: 'quote',
          entity_id: 'QUOTE-900',
          attachment_type: 'cad_model',
          created_at: '2026-03-29T00:00:00.000Z',
          file: {
            id: 'file-quote-1',
            original_name: 'bracket.step',
            mime_type: 'model/step',
            version: 1,
          },
        }),
      } as Response);

    renderPage('/print-to-cnc?source=quote-builder&recordType=Quote&recordId=QUOTE-900');

    await screen.findByText('Print to CNC');

    fireEvent.change(screen.getByLabelText('Universal intake file picker'), {
      target: {
        files: [new File(['solid'], 'bracket.step', { type: 'application/octet-stream' })],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sync staged files to live packet' }));

    expect(await screen.findByText('1 staged file synced and attached to quote QUOTE-900.')).toBeDefined();
    expect(screen.getByText('Attached live')).toBeDefined();
    expect(screen.getByText('Attached to quote QUOTE-900')).toBeDefined();
  });

  it('switches into the PRISM design mode', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Print to CNC')).toBeDefined();
    }, { timeout: 5000 });

    fireEvent.click(screen.getAllByRole('button', { name: 'Design in PRISM' })[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Valve body rev C')).toBeDefined();
      expect(screen.getByText('Simple prismatic design')).toBeDefined();
      expect(screen.getByText(/structured design brief now/i)).toBeDefined();
    }, { timeout: 5000 });
  });

  it('shows the DFM and GD&T review lane', async () => {
    renderPage();

    await screen.findByText('Print to CNC');

    fireEvent.click(screen.getByRole('button', { name: /DFM \+ GD&T/i }));

    expect(screen.getByText('DFM findings')).toBeDefined();
    expect(screen.getByText(/Datum and GD&T focus/i)).toBeDefined();
    expect(screen.getByText(/Datum chain should be frozen before proving the setup sheet/i)).toBeDefined();
  });

  it('shows the digital source comparison lane', async () => {
    renderPage();

    await screen.findByText('Print to CNC');

    fireEvent.click(screen.getByRole('button', { name: 'Source compare' }));

    expect(screen.getAllByText('Fusion 360 master').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recommended route').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Simulation trust/i).length).toBeGreaterThan(0);
  });

  it('shows job-improvement purchase recommendations and opens distributor options', async () => {
    renderPage();

    await screen.findByText('Buy to improve this release');
    await waitFor(() => {
      expect(screen.getByText('Zero-point modular fixture plate')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Buy Zero-point modular fixture plate/i }));

    expect(await screen.findByRole('dialog', { name: /Zero-point modular fixture plate purchase options/i })).toBeDefined();
    expect(screen.getAllByText(/MSC Industrial/i).length).toBeGreaterThan(0);
  });

  it('deep-links Capture Ops with print-to-cnc context', async () => {
    renderPage();

    const link = await screen.findByRole('link', { name: 'Open Capture Ops' });

    expect(link.getAttribute('href')).toContain('/capture?');
    expect(link.getAttribute('href')).toContain('source=print-to-cnc');
    expect(link.getAttribute('href')).toContain('target=job');
  });

  it('deep-links Shop Floor Clock with print-to-cnc context', async () => {
    renderPage();

    const link = await screen.findByRole('link', { name: 'Open Shop Floor prove-out' });

    expect(link.getAttribute('href')).toContain('/shop-clock?');
    expect(link.getAttribute('href')).toContain('source=print-to-cnc');
    expect(link.getAttribute('href')).toContain('department=Job+setup');
    expect(link.getAttribute('href')).toContain('machine=');
  });

  it('keeps print-to-cnc as the launcher while preserving upstream quote provenance in downstream handoffs', async () => {
    renderPage(
      '/print-to-cnc?source=print-to-cnc&originSource=quote-builder&originType=Quote&originId=QUOTE-900&customer=Acme%20Aerospace&note=Carry%20quote%20context&focusType=quote&focusId=QUOTE-900&focusQuoteId=QUOTE-900&focusPacketId=pkt__fixture__vf2&packetId=pkt__fixture__vf2&partClassId=prismatic-bracket',
    );

    await waitFor(() => {
      expect(screen.getByText(/opened Print to CNC with follow-up context/i)).toBeDefined();
    });

    expect(screen.getAllByText((_, element) => element?.textContent?.includes('Print to CNC') ?? false).length).toBeGreaterThan(0);
    expect(screen.getByText(/Upstream commercial origin:/i)).toBeDefined();
    expect(screen.getAllByText('Quote Builder').length).toBeGreaterThan(0);

    const captureLink = screen.getByRole('link', { name: 'Open Capture Ops' });
    const shopFloorLink = screen.getByRole('link', { name: 'Open Shop Floor prove-out' });

    expect(captureLink.getAttribute('href')).toContain('/capture?');
    expect(captureLink.getAttribute('href')).toContain('source=print-to-cnc');
    expect(captureLink.getAttribute('href')).toContain('originSource=quote-builder');
    expect(captureLink.getAttribute('href')).toContain('originType=Quote');
    expect(captureLink.getAttribute('href')).toContain('originId=QUOTE-900');
    expect(shopFloorLink.getAttribute('href')).toContain('/shop-clock?');
    expect(shopFloorLink.getAttribute('href')).toContain('source=print-to-cnc');
    expect(shopFloorLink.getAttribute('href')).toContain('originSource=quote-builder');
    expect(shopFloorLink.getAttribute('href')).toContain('originType=Quote');
    expect(shopFloorLink.getAttribute('href')).toContain('originId=QUOTE-900');
  });

  it('preserves upstream message context and keeps the release handoff links visible', async () => {
    renderPage('/print-to-cnc?source=messages&recordType=Job&recordId=JOB-77&focusType=job&focusJobId=JOB-77&customer=Orbit%20Aero&note=Release%20approved');

    await waitFor(() => {
      expect(screen.getByText(/Messages opened Print to CNC with follow-up context/i)).toBeDefined();
    });

    expect(screen.getByText('Messages opened Print to CNC with follow-up context for Job JOB-77 (Orbit Aero) · Release approved')).toBeDefined();
    expect(screen.getByText(/Release approved/i)).toBeDefined();

    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });
    const jobsLink = screen.getByRole('link', { name: /Open Jobs follow-up/i });
    expect(messagesLink.getAttribute('href')).toContain('/messages?');
    expect(messagesLink.getAttribute('href')).toContain('originSource=messages');
    expect(messagesLink.getAttribute('href')).toContain('originType=Job');
    expect(messagesLink.getAttribute('href')).toContain('originId=JOB-77');
    expect(messagesLink.getAttribute('href')).toContain('source=print-to-cnc');
    expect(jobsLink.getAttribute('href')).toContain('/jobs?');
    expect(jobsLink.getAttribute('href')).toContain('originSource=messages');
    expect(jobsLink.getAttribute('href')).toContain('originType=Job');
    expect(jobsLink.getAttribute('href')).toContain('originId=JOB-77');
    expect(jobsLink.getAttribute('href')).toContain('source=print-to-cnc');
    expect(jobsLink.getAttribute('href')).toContain('focusType=job');
    expect(jobsLink.getAttribute('href')).toContain('focusJobId=JOB-77');
  });

  it('shows customer intake context when messages opens the release desk', async () => {
    renderPage('/print-to-cnc?source=messages&recordType=Customer&recordId=CUST-001&thread=thread-rfq&customer=Acme%20Aerospace&note=Carry%20RFQ%20context');

    await waitFor(() => {
      expect(screen.getByText(/Messages opened Print to CNC with follow-up context/i)).toBeDefined();
    });

    expect(screen.getByText('Messages opened Print to CNC with follow-up context for Customer CUST-001 (Acme Aerospace) · Carry RFQ context')).toBeDefined();
    expect(screen.getByText('Store staged files in backend file storage and attach them directly to customer CUST-001.')).toBeDefined();

    const messagesLink = screen.getByRole('link', { name: /Open Messages follow-up/i });
    const jobsLink = screen.getByRole('link', { name: /Open Jobs follow-up/i });
    expect(messagesLink.getAttribute('href')).toContain('thread=thread-rfq');
    expect(messagesLink.getAttribute('href')).toContain('originSource=messages');
    expect(messagesLink.getAttribute('href')).toContain('originType=Customer');
    expect(messagesLink.getAttribute('href')).toContain('originId=CUST-001');
    expect(messagesLink.getAttribute('href')).toContain('source=print-to-cnc');
    expect(jobsLink.getAttribute('href')).toContain('/jobs?');
    expect(jobsLink.getAttribute('href')).toContain('source=print-to-cnc');
    expect(jobsLink.getAttribute('href')).toContain('recordType=Customer');
    expect(jobsLink.getAttribute('href')).toContain('recordId=CUST-001');
    expect(jobsLink.getAttribute('href')).toContain('originSource=messages');
    expect(jobsLink.getAttribute('href')).toContain('originType=Customer');
    expect(jobsLink.getAttribute('href')).toContain('originId=CUST-001');
    expect(jobsLink.getAttribute('href')).toContain('customer=Acme+Aerospace');
    expect(jobsLink.getAttribute('href')).toContain('thread=thread-rfq');
    expect(jobsLink.getAttribute('href')).not.toContain('focusType=');
    expect(jobsLink.getAttribute('href')).not.toContain('focusJobId=');
  });

  it('returns jobs with focus only when the release packet actually has a job id', async () => {
    renderPage('/print-to-cnc?source=messages&recordType=Quote&recordId=QUOTE-77&partClassId=turned-shaft&customer=Orbit%20Aero&note=Draft%20release');

    await waitFor(() => {
      expect(screen.getByText(/Messages opened Print to CNC with follow-up context/i)).toBeDefined();
    });

    const jobsLink = screen.getByRole('link', { name: /Open Jobs follow-up/i });
    expect(jobsLink.getAttribute('href')).toContain('/jobs?');
    expect(jobsLink.getAttribute('href')).toContain('originSource=messages');
    expect(jobsLink.getAttribute('href')).toContain('originType=Quote');
    expect(jobsLink.getAttribute('href')).toContain('originId=QUOTE-77');
    expect(jobsLink.getAttribute('href')).not.toContain('focusType=');
    expect(jobsLink.getAttribute('href')).not.toContain('focusJobId=');
  });

  it('honors release selections coming from the quote desk link', async () => {
    renderPage(
      '/print-to-cnc?partClassId=turned-shaft&machineId=st20-turn&toolholderId=capto-turn&toolingPackageId=steel-balanced&fixtureId=softjaw-collet&stockId=174-round&cadSourceId=fusion-master',
    );

    await screen.findByText('Print to CNC');

    expect((screen.getByLabelText('Part class') as HTMLSelectElement).value).toBe('turned-shaft');
    expect((screen.getByLabelText('Machine') as HTMLSelectElement).value).toBe('st20-turn');
    expect((screen.getByLabelText('CAD source') as HTMLSelectElement).value).toBe('fusion-master');
    expect(screen.getAllByText('Haas ST-20Y').length).toBeGreaterThan(0);
  });

  it('uses a saved machine profile default when the route does not force a machine', async () => {
    const services: OperatingSystemServices = {
      ...fixtureOperatingSystemServices,
      getProgramReleaseDefaultMachineProfile: vi.fn().mockResolvedValue({
        profileId: 'profile-st20-default',
        userId: 'shell-default',
        workspaceId: 'program-release',
        displayName: 'Turning cell default',
        machineId: 'st20-turn',
        machineLabel: 'Haas ST-20Y',
        selectedControllerId: 'haas_ngc',
        selectedSpindlePackageId: 'a2_6_4000',
        enabledCoolantStrategyIds: ['flood'],
        canDriveProgramRelease: true,
      }),
    };

    renderPage('/print-to-cnc?partClassId=turned-shaft', services);

    await screen.findByText('Saved machine profile');

    expect((screen.getByLabelText('Machine') as HTMLSelectElement).value).toBe('st20-turn');
    expect(screen.getByText(/Turning cell default · Haas ST-20Y/i)).toBeDefined();
    expect(screen.getByText(/This saved machine default is being used/i)).toBeDefined();
  });

  it('lets an incoming route machine override the saved machine profile default', async () => {
    const services: OperatingSystemServices = {
      ...fixtureOperatingSystemServices,
      getProgramReleaseDefaultMachineProfile: vi.fn().mockResolvedValue({
        profileId: 'profile-st20-default',
        userId: 'shell-default',
        workspaceId: 'program-release',
        displayName: 'Turning cell default',
        machineId: 'st20-turn',
        machineLabel: 'Haas ST-20Y',
        selectedControllerId: 'haas_ngc',
        selectedSpindlePackageId: 'a2_6_4000',
        enabledCoolantStrategyIds: ['flood'],
        canDriveProgramRelease: true,
      }),
    };

    renderPage('/print-to-cnc?machineId=umc-5x', services);

    await screen.findByText('Saved machine profile');

    expect((screen.getByLabelText('Machine') as HTMLSelectElement).value).toBe('umc-5x');
    expect(screen.getByText(/overriding the saved default for this session/i)).toBeDefined();
  });

  it('saves the current machine as the default program-release machine profile', async () => {
    const saveProgramReleaseMachineProfile = vi.fn().mockResolvedValue({
      profileId: 'profile-umc-5x-default',
      userId: 'shell-default',
      workspaceId: 'program-release',
      displayName: 'Haas UMC-750 Program Release default',
      machineId: 'umc-5x',
      machineLabel: 'Haas UMC-750',
      selectedControllerId: 'haas-ngc',
      selectedSpindlePackageId: 'inline-15k',
      enabledCoolantStrategyIds: ['flood'],
      canDriveProgramRelease: true,
    });

    const services: OperatingSystemServices = {
      ...fixtureOperatingSystemServices,
      getProgramReleaseDefaultMachineProfile: vi.fn().mockResolvedValue(null),
      saveProgramReleaseMachineProfile,
    };

    renderPage('/print-to-cnc?machineId=umc-5x', services);

    await screen.findByText('Machine profile memory');

    fireEvent.click(screen.getByRole('button', { name: 'Save current machine as default' }));

    await waitFor(() => {
      expect(saveProgramReleaseMachineProfile).toHaveBeenCalledWith({
        userId: 'shell-default',
        workspaceId: 'program-release',
        machineId: 'umc-5x',
        displayName: 'Haas UMC-750 Program Release default',
        makeDefault: true,
      });
    });

    expect(await screen.findByText('Saved Haas UMC-750 as the default Program Release machine profile.')).toBeDefined();
    expect(screen.getByText(/Haas UMC-750 Program Release default · Haas UMC-750/i)).toBeDefined();
  });

  it('does not send quote or packet focus back into Jobs when the release desk was opened from a quote', async () => {
    renderPage(
      '/print-to-cnc?source=quote-builder&recordType=Quote&recordId=QUOTE-900&customer=Acme%20Aerospace&note=Carry%20quote%20context&focusType=quote&focusId=QUOTE-900&focusQuoteId=QUOTE-900&focusPacketId=pkt__fixture__vf2&packetId=pkt__fixture__vf2&partClassId=prismatic-bracket',
    );

    await waitFor(() => {
      expect(screen.getByText(/Quote Builder opened Print to CNC with follow-up context/i)).toBeDefined();
    });

    const jobsLink = screen.getByRole('link', { name: /Open Jobs follow-up/i });
    expect(jobsLink.getAttribute('href')).toContain('/jobs?');
    expect(jobsLink.getAttribute('href')).toContain('originSource=quote-builder');
    expect(jobsLink.getAttribute('href')).not.toContain('focusType=quote');
    expect(jobsLink.getAttribute('href')).not.toContain('focusQuoteId=QUOTE-900');
    expect(jobsLink.getAttribute('href')).not.toContain('focusPacketId=pkt__fixture__vf2');
  });

  it('shows launcher context separately from upstream commercial origin when both are present', async () => {
    renderPage(
      '/print-to-cnc?source=messages&originSource=customers&originType=Customer&originId=CUST-001&originCustomer=Acme%20Aerospace&thread=thread-rfq&note=Carry%20RFQ%20context',
    );

    await waitFor(() => {
      expect(screen.getByText(/Messages opened Print to CNC with follow-up context/i)).toBeDefined();
    });

    expect(screen.getByText(/Upstream commercial origin:/i)).toBeDefined();
    expect(screen.getByText(/Customers & CRM/i)).toBeDefined();

    const jobsLink = screen.getByRole('link', { name: /Open Jobs follow-up/i });
    expect(jobsLink.getAttribute('href')).toContain('source=print-to-cnc');
    expect(jobsLink.getAttribute('href')).toContain('originSource=customers');
  });
});
