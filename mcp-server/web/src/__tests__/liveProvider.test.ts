import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import { resetHotJobs } from '../features/operating-system/hotJobSignals';
import { liveOperatingSystemServices } from '../features/operating-system/liveProvider';

type MockResponsePayload = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

function makeResponse(payload: MockResponsePayload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => payload,
  };
}

function makeApiResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => payload,
  };
}

describe('liveOperatingSystemServices', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    resetHotJobs();
  });

  afterEach(() => {
    resetHotJobs();
    vi.unstubAllGlobals();
  });

  it('falls back to fixture shell bootstrap when live aggregate payload is empty', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeResponse({
        ok: true,
        data: {
          deskCounts: {
            inbox: 0,
            approvals: 0,
            atRisk: 0,
            liveJobs: 0,
          },
          pinnedEntities: [],
          recentEntities: [],
          shellNote: 'Live but empty',
        },
      }) as Response,
    );

    const bootstrap = await liveOperatingSystemServices.getShellBootstrap();

    expect(bootstrap).toEqual(await fixtureOperatingSystemServices.getShellBootstrap());
  });

  it('maps live employee profiles onto the supported employee-shell aliases', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeResponse({
        ok: true,
        data: [
          {
            id: 'machinist',
            displayName: 'Avery Stone',
            role: 'Machinist',
            department: 'Machining',
            tagline: 'Floor shell',
          },
          {
            id: 'quality',
            displayName: 'Casey Mercer',
            role: 'Quality',
            department: 'Quality',
            tagline: 'Inspection shell',
          },
          {
            id: 'lead',
            displayName: 'Morgan Blake',
            role: 'Lead',
            department: 'Machining',
            tagline: 'Lead shell',
          },
          {
            id: 'manager',
            displayName: 'Riley Ashford',
            role: 'Manager',
            department: 'Management',
            tagline: 'Office shell',
          },
        ],
      }) as Response,
    );

    const profiles = await liveOperatingSystemServices.getEmployeeShellProfiles();

    expect(profiles.map((profile) => profile.id)).toEqual(['machinist', 'inspector', 'planner']);
    expect(profiles.find((profile) => profile.id === 'inspector')?.displayName).toBe('Morgan Hale');
    expect(profiles.find((profile) => profile.id === 'planner')?.displayName).toBe('Jordan Vale');
  });

  it('hydrates email-linked sign-in options from the live employee directory with fixture fallback', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeApiResponse({
        result: {
          employees: [
            {
              id: 'EMP-010',
              first_name: 'Taylor',
              last_name: 'Quinn',
              department: 'Machining',
              role: 'Machinist',
              status: 'active',
              labor_rates: { regular: 28, overtime: 42, double_time: 56 },
              skills: ['5-axis'],
              certifications: [],
              hire_date: '2025-01-15',
              email: 'taylor.quinn@orchidprecision.com',
            },
          ],
        },
      }) as Response,
    );

    const options = await liveOperatingSystemServices.getEmailLoginOptions();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/erp/employees',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(options.some((option) => option.email === 'taylor.quinn@orchidprecision.com')).toBe(true);
    expect(options.find((option) => option.email === 'taylor.quinn@orchidprecision.com')).toMatchObject({
      displayName: 'Taylor Quinn',
      shellKind: 'employee',
      profileId: 'machinist',
      destination: '/employee/messages?profile=machinist',
    });
  });

  it('resolves email-linked sign-in from the live employee directory with trimmed case-insensitive matching', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeApiResponse({
        result: {
          employees: [
            {
              id: 'EMP-011',
              first_name: 'Morgan',
              last_name: 'Hale',
              department: 'Quality',
              role: 'Quality Inspector',
              status: 'active',
              labor_rates: { regular: 32, overtime: 48, double_time: 64 },
              skills: ['FAI'],
              certifications: [],
              hire_date: '2024-11-03',
              email: 'morgan.hale@orchidprecision.com',
            },
          ],
        },
      }) as Response,
    );

    const option = await liveOperatingSystemServices.resolveEmailLogin('  MORGAN.HALE@orchidprecision.com  ');

    expect(option).toMatchObject({
      email: 'morgan.hale@orchidprecision.com',
      shellKind: 'employee',
      profileId: 'inspector',
    });
  });

  it('falls back to fixture email sign-in options when the live employee directory has no recognized mailboxes', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeApiResponse({
        result: {
          employees: [
            {
              id: 'EMP-099',
              first_name: 'Dana',
              last_name: 'Cross',
              department: 'Operations',
              role: 'Operations Analyst',
              status: 'inactive',
              labor_rates: { regular: 30, overtime: 45, double_time: 60 },
              skills: [],
              certifications: [],
              hire_date: '2023-10-01',
            },
          ],
        },
      }) as Response,
    );

    const options = await liveOperatingSystemServices.getEmailLoginOptions();

    expect(options).toEqual(await fixtureOperatingSystemServices.getEmailLoginOptions());
  });

  it('merges live employee-shell desk signals into the current planner shell without regressing route-safe chrome', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeResponse({
        ok: true,
        data: {
          profileId: 'lead',
          employeeId: 'EMP-003',
          displayName: 'Morgan Blake',
          role: 'Lead',
          department: 'Machining',
          subtitle: 'Shift oversight shell',
          homeModules: [],
          navGroups: [],
          accessCards: [],
          shiftPriorities: [],
          attentionItems: [],
          handoffNotes: [],
          restrictedSurfaces: [],
          hotJobs: [
            {
              jobId: 'JOB-HOT-9',
              partNumber: 'HOT-9',
              customer: 'Atlas Medical',
              dueDate: '2026-03-31',
              note: 'Backend hot flag',
              setBy: 'Lead',
              setAt: '2026-03-28T04:00:00Z',
            },
          ],
          deskCounts: {
            inbox: 9,
            approvals: 4,
            atRisk: 3,
            liveJobs: 7,
          },
          pins: [
            {
              id: 'JOB-1',
              title: 'Release blocker',
              type: 'Job',
              status: 'At risk',
              owner: 'Planning',
              detail: 'Backend pin',
              workspaceLabel: 'Jobs',
              workspaceRoute: '/jobs',
              to: '/jobs?focusId=JOB-1&focusType=job',
              keywords: ['job'],
            },
          ],
          recents: [
            {
              id: 'JOB-2',
              title: 'Simulation hold',
              type: 'Job',
              status: 'Watch',
              owner: 'Planning',
              detail: 'Backend recent',
              workspaceLabel: 'Jobs',
              workspaceRoute: '/jobs',
              to: '/jobs?focusId=JOB-2&focusType=job',
              keywords: ['job'],
            },
          ],
          policyNote: 'Live planner shell note.',
        },
      }) as Response,
    );

    const bootstrap = await liveOperatingSystemServices.getEmployeeShellBootstrap('planner');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/operating-system/shell/employee/lead',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(bootstrap.displayName).toBe('Jordan Vale');
    expect(bootstrap.role).toBe('Planner');
    expect(bootstrap.deskCounts.liveJobs).toBe(7);
    expect(bootstrap.hotJobs[0]?.jobId).toBe('JOB-HOT-9');
    expect(bootstrap.pins[0]?.id).toBe('JOB-1');
    expect(bootstrap.homeModules[0]?.title).toBe('Dispatch board');
    expect(bootstrap.policyNote).toContain('Live planner shell note.');
  });

  it('uses the live operating-system search route with fixture fallback', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeResponse({
        ok: true,
        data: [
          {
            id: 'JOB-9001',
            title: 'Live search job',
            type: 'Job',
            status: 'Queued',
            owner: 'Planning',
            detail: 'Returned from backend search',
            workspaceLabel: 'Jobs',
            workspaceRoute: '/jobs',
            to: '/jobs?focusId=JOB-9001&focusType=job',
            keywords: ['job'],
          },
        ],
      }) as Response,
    );

    const results = await liveOperatingSystemServices.search('live search');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/operating-system/search?q=live+search&limit=20',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(results[0]?.id).toBe('JOB-9001');
    expect(results[0]?.workspaceRoute).toBe('/jobs');
  });

  it('hydrates shell record state from the mounted pins and recents routes', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [
            {
              id: 'pin-1',
              user_id: 'shell-default',
              entity_type: 'part',
              entity_id: 'PART-0097',
              title: 'Live part pin',
              pinned_at: '2026-03-29T20:00:00Z',
            },
          ],
        }) as Response,
      )
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [
            {
              id: 'recent-1',
              user_id: 'shell-default',
              entity_type: 'customer',
              entity_id: 'CUS-104',
              title: 'Customer record',
              accessed_at: '2026-03-29T20:02:00Z',
            },
          ],
        }) as Response,
      );

    const state = await liveOperatingSystemServices.getShellRecordState();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/operating-system/pins/shell-default',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/operating-system/recents/shell-default?limit=6',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(state.pinnedRecords[0]).toMatchObject({
      id: 'PART-0097',
      title: 'Live part pin',
      workspaceRoute: '/parts-library',
    });
    expect(state.recentRecords[0]).toMatchObject({
      id: 'CUS-104',
      title: 'Customer record',
      workspaceRoute: '/customers',
    });
  });

  it('syncs shell record pinning and recents through mounted operating-system routes with fixture fallback', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(makeResponse({ ok: true, data: { id: 'pin-1' } }) as Response)
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [
            {
              id: 'pin-1',
              user_id: 'shell-default',
              entity_type: 'job',
              entity_id: 'JOB-4821',
              title: 'Titanium impeller roughing package',
              pinned_at: '2026-03-29T20:05:00Z',
            },
          ],
        }) as Response,
      )
      .mockResolvedValueOnce(makeResponse({ ok: true, data: [] }) as Response)
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [
            {
              id: 'pin-1',
              user_id: 'shell-default',
              entity_type: 'job',
              entity_id: 'JOB-4821',
              title: 'Titanium impeller roughing package',
              pinned_at: '2026-03-29T20:05:00Z',
            },
          ],
        }) as Response,
      )
      .mockResolvedValueOnce(makeResponse({ ok: true, data: { unpinned: true } }) as Response)
      .mockResolvedValueOnce(makeResponse({ ok: true, data: [] }) as Response)
      .mockResolvedValueOnce(makeResponse({ ok: true, data: [] }) as Response)
      .mockResolvedValueOnce(makeResponse({ ok: true, data: { id: 'recent-1' } }) as Response)
      .mockResolvedValueOnce(makeResponse({ ok: true, data: [] }) as Response)
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [
            {
              id: 'recent-1',
              user_id: 'shell-default',
              entity_type: 'job',
              entity_id: 'JOB-4821',
              title: 'Titanium impeller roughing package',
              accessed_at: '2026-03-29T20:07:00Z',
            },
          ],
        }) as Response,
      );

    const pinned = await liveOperatingSystemServices.pinShellRecord(
      fixtureOperatingSystemServices.findRecordByFocus('/jobs', '?focusId=JOB-4821&focusType=job')!,
      [],
    );
    const unpinned = await liveOperatingSystemServices.unpinShellRecord(
      fixtureOperatingSystemServices.findRecordByFocus('/jobs', '?focusId=JOB-4821&focusType=job')!,
      pinned,
    );
    const recents = await liveOperatingSystemServices.recordShellRecordAccess(
      fixtureOperatingSystemServices.findRecordByFocus('/jobs', '?focusId=JOB-4821&focusType=job')!,
      [],
    );

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url === '/api/v1/operating-system/pins'
          && (init as RequestInit | undefined)?.method === 'POST',
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url === '/api/v1/operating-system/pins/pin-1'
          && (init as RequestInit | undefined)?.method === 'DELETE',
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url === '/api/v1/operating-system/recents'
          && (init as RequestInit | undefined)?.method === 'POST',
      ),
    ).toBe(true);
    expect(pinned[0]?.id).toBe('JOB-4821');
    expect(unpinned).toEqual([]);
    expect(recents[0]?.id).toBe('JOB-4821');
  });

  it('hydrates shell saved views from the mounted operating-system view routes', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeResponse({
        ok: true,
        data: [
          {
            id: 'view-1',
            user_id: 'shell-default',
            name: 'Planner queue',
            entity_type: 'workspace',
            filters: {
              path: '/jobs',
              search: '?focusId=JOB-4821&focusType=job',
            },
            is_default: true,
            updated_at: '2026-03-30T12:00:00Z',
          },
        ],
      }) as Response,
    );

    const views = await liveOperatingSystemServices.getShellSavedViews('workspace');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/operating-system/views/shell-default?entity_type=workspace',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(views[0]).toMatchObject({
      id: 'view-1',
      name: 'Planner queue',
      entityType: 'workspace',
      to: '/jobs?focusId=JOB-4821&focusType=job',
      isDefault: true,
    });
  });

  it('syncs shell saved views through mounted operating-system routes with fixture fallback', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(makeResponse({ ok: true, data: { id: 'view-1' } }) as Response)
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [
            {
              id: 'view-1',
              user_id: 'shell-default',
              name: 'Planner queue',
              entity_type: 'workspace',
              filters: {
                path: '/jobs',
                search: '?focusId=JOB-4821&focusType=job',
              },
              is_default: false,
              updated_at: '2026-03-30T12:00:00Z',
            },
          ],
        }) as Response,
      )
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [
            {
              id: 'view-1',
              user_id: 'shell-default',
              name: 'Planner queue',
              entity_type: 'workspace',
              filters: {
                path: '/jobs',
                search: '?focusId=JOB-4821&focusType=job',
              },
              is_default: false,
              updated_at: '2026-03-30T12:00:00Z',
            },
          ],
        }) as Response,
      )
      .mockResolvedValueOnce(makeResponse({ ok: true, data: { id: 'view-1' } }) as Response)
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [
            {
              id: 'view-1',
              user_id: 'shell-default',
              name: 'Planner board',
              entity_type: 'workspace',
              filters: {
                path: '/jobs',
                search: '?focusId=JOB-4821&focusType=job&focusTab=dispatch',
              },
              is_default: true,
              updated_at: '2026-03-30T12:05:00Z',
            },
          ],
        }) as Response,
      )
      .mockResolvedValueOnce(makeResponse({ ok: true, data: { deleted: true } }) as Response)
      .mockResolvedValueOnce(makeResponse({ ok: true, data: [] }) as Response);

    const created = await liveOperatingSystemServices.createShellSavedView({
      name: 'Planner queue',
      entityType: 'workspace',
      to: '/jobs?focusId=JOB-4821&focusType=job',
    });

    const updated = await liveOperatingSystemServices.updateShellSavedView({
      viewId: 'view-1',
      name: 'Planner board',
      to: '/jobs?focusId=JOB-4821&focusType=job&focusTab=dispatch',
      isDefault: true,
    });

    const deleted = await liveOperatingSystemServices.deleteShellSavedView('view-1', 'workspace');

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url === '/api/v1/operating-system/views'
          && (init as RequestInit | undefined)?.method === 'POST',
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url === '/api/v1/operating-system/views'
          && (init as RequestInit | undefined)?.method === 'PUT',
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url === '/api/v1/operating-system/views/view-1'
          && (init as RequestInit | undefined)?.method === 'DELETE',
      ),
    ).toBe(true);
    expect(created[0]?.name).toBe('Planner queue');
    expect(updated[0]?.name).toBe('Planner board');
    expect(updated[0]?.to).toBe('/jobs?focusId=JOB-4821&focusType=job&focusTab=dispatch');
    expect(deleted).toEqual([]);
  });

  it('reloads the updated saved-view collection using the view entity type instead of the workspace default', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [
            {
              id: 'view-tooling-1',
              user_id: 'shell-default',
              name: 'Tooling queue',
              entity_type: 'tooling',
              filters: {
                path: '/inventory',
                search: '?tab=tooling',
              },
              is_default: false,
              updated_at: '2026-03-30T12:00:00Z',
            },
          ],
        }) as Response,
      )
      .mockResolvedValueOnce(makeResponse({ ok: true, data: { id: 'view-tooling-1' } }) as Response)
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [
            {
              id: 'view-tooling-1',
              user_id: 'shell-default',
              name: 'Tooling queue',
              entity_type: 'tooling',
              filters: {
                path: '/inventory',
                search: '?tab=tooling&view=priority',
              },
              is_default: false,
              updated_at: '2026-03-30T12:05:00Z',
            },
          ],
        }) as Response,
      );

    const updated = await liveOperatingSystemServices.updateShellSavedView({
      viewId: 'view-tooling-1',
      to: '/inventory?tab=tooling&view=priority',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/operating-system/views/shell-default',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/operating-system/views/shell-default?entity_type=tooling',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(updated[0]?.entityType).toBe('tooling');
    expect(updated[0]?.to).toBe('/inventory?tab=tooling&view=priority');
  });

  it('hydrates job approvals from the live operating-system route with fixture fallback', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeResponse({
        ok: true,
        data: [
          {
            id: 'JOB-9001-approval',
            label: 'Planner release',
            owner: 'Planning',
            status: 'ready',
            detail: 'Live approval chain',
          },
        ],
      }) as Response,
    );

    const approvals = await liveOperatingSystemServices.buildJobApprovals({
      id: 'JOB-9001',
      customer: 'Acme',
      part_number: 'BRKT-01',
      description: 'Bracket',
      status: 'planned',
      quantity: 12,
      due_date: '2026-04-02',
      priority: 'normal',
      material: '4140',
      estimated_hours: 6,
      actual_hours: 0,
      created_at: '2026-03-29',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/operating-system/jobs/JOB-9001/approvals',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(approvals[0]?.detail).toBe('Live approval chain');
  });

  it('hydrates job packets and intake previews from the live operating-system routes with fixture fallback', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: {
            jobId: 'JOB-9002',
            jobName: 'Live packet',
            customer: 'Orbit Aero',
            partNumber: 'PKT-02',
            quantity: 8,
            dueDate: '2026-04-05',
            material: '17-4',
            priority: 'high',
            qrPayload: 'PRISMJOB|job=JOB-9002',
            stickerLabel: 'JOB-9002 · PKT-02',
            departments: [
              {
                id: 'intake',
                label: 'Intake',
                owner: 'Planning',
                status: 'current',
                note: 'Live intake',
              },
            ],
            operations: [
              {
                id: 'JOB-9002-op10',
                code: 'OP10',
                label: 'Job setup',
                department: 'Job setup',
                estimatedMinutes: 45,
                cycleSeconds: 0,
                quantityTarget: 8,
                note: 'Live packet operation',
              },
            ],
            packetNotes: ['Live packet note'],
          },
        }) as Response,
      )
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: {
            previewJob: {
              id: 'JOB-2026-NEWPAR',
              customer: 'Orbit Aero',
              part_number: 'NEW-PART',
              description: 'New traveler packet',
              status: 'planned',
              quantity: 6,
              due_date: '2026-04-07',
              priority: 'normal',
              material: '4140',
              estimated_hours: 8,
              actual_hours: 0,
              created_at: '2026-03-29',
            },
            packet: {
              jobId: 'JOB-2026-NEWPAR',
              jobName: 'New traveler packet',
              customer: 'Orbit Aero',
              partNumber: 'NEW-PART',
              quantity: 6,
              dueDate: '2026-04-07',
              material: '4140',
              priority: 'normal',
              qrPayload: 'PRISMJOB|job=JOB-2026-NEWPAR',
              stickerLabel: 'JOB-2026-NEWPAR · NEW-PART',
              departments: [
                {
                  id: 'intake',
                  label: 'Intake',
                  owner: 'Planning',
                  status: 'current',
                  note: 'Live intake preview',
                },
              ],
              operations: [
                {
                  id: 'JOB-2026-NEWPAR-op10',
                  code: 'OP10',
                  label: 'CAD work',
                  department: 'CAD work',
                  estimatedMinutes: 35,
                  cycleSeconds: 0,
                  quantityTarget: 6,
                  note: 'Live intake preview op',
                },
              ],
              packetNotes: ['Live preview note'],
            },
          },
        }) as Response,
      );

    const packet = await liveOperatingSystemServices.buildJobPacket({
      id: 'JOB-9002',
      customer: 'Orbit Aero',
      part_number: 'PKT-02',
      description: 'Live packet',
      status: 'planned',
      quantity: 8,
      due_date: '2026-04-05',
      priority: 'high',
      material: '17-4',
      estimated_hours: 5,
      actual_hours: 0,
      created_at: '2026-03-29',
    });
    const preview = await liveOperatingSystemServices.buildJobIntakePreview({
      customer: 'Orbit Aero',
      part_number: 'NEW-PART',
      description: 'New traveler packet',
      quantity: '6',
      material: '4140',
      due_date: '2026-04-07',
      priority: 'normal',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/operating-system/jobs/JOB-9002/packet',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/operating-system/jobs/intake-preview',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(packet.jobId).toBe('JOB-9002');
    expect(preview.packet.jobId).toBe('JOB-2026-NEWPAR');
  });

  it('hydrates hot jobs from the live operating-system route and syncs the staged cache', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeResponse({
        ok: true,
        data: [
          {
            jobId: 'JOB-LIVE-HOT',
            partNumber: 'IMP-700',
            customer: 'Atlas Medical',
            dueDate: '2026-04-01',
            note: 'Backend hot flag',
            setBy: 'Ops lead',
            setAt: '2026-03-29T08:00:00Z',
          },
        ],
      }) as Response,
    );

    const records = await liveOperatingSystemServices.getHotJobs();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/operating-system/hot-jobs',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(records[0]?.jobId).toBe('JOB-LIVE-HOT');
    expect(fixtureOperatingSystemServices.isJobHot('JOB-LIVE-HOT')).toBe(true);
  });

  it('promotes and clears hot jobs through live operating-system routes while keeping staged listeners in sync', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [
            {
              jobId: 'JOB-LIVE-HOT-2',
              partNumber: 'VALVE-22',
              customer: 'Northwind',
              dueDate: '2026-04-03',
              note: 'Escalated by backend',
              setBy: 'Management',
              setAt: '2026-03-29T09:30:00Z',
            },
          ],
        }) as Response,
      )
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [],
        }) as Response,
      );

    const promoted = await liveOperatingSystemServices.setJobHot({
      jobId: 'JOB-LIVE-HOT-2',
      partNumber: 'VALVE-22',
      customer: 'Northwind',
      dueDate: '2026-04-03',
      note: 'Escalated by backend',
      setBy: 'Management',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/operating-system/hot-jobs/set',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          jobId: 'JOB-LIVE-HOT-2',
          partNumber: 'VALVE-22',
          customer: 'Northwind',
          dueDate: '2026-04-03',
          note: 'Escalated by backend',
          setBy: 'Management',
        }),
      }),
    );
    expect(promoted[0]?.jobId).toBe('JOB-LIVE-HOT-2');
    expect(fixtureOperatingSystemServices.isJobHot('JOB-LIVE-HOT-2')).toBe(true);

    const cleared = await liveOperatingSystemServices.clearJobHot('JOB-LIVE-HOT-2');

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/operating-system/hot-jobs/clear',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ jobId: 'JOB-LIVE-HOT-2' }),
      }),
    );
    expect(cleared).toEqual([]);
    expect(fixtureOperatingSystemServices.isJobHot('JOB-LIVE-HOT-2')).toBe(false);
  });

  it('exposes live-provider hot-job helpers without delegating back through the fixture service object', async () => {
    const fetchMock = vi.mocked(fetch);
    const listener = vi.fn();
    const unsubscribe = liveOperatingSystemServices.subscribeHotJobs(listener);

    fetchMock.mockResolvedValue(
      makeResponse({
        ok: true,
        data: [
          {
            jobId: 'JOB-LIVE-HOT-3',
            partNumber: 'SPINDLE-11',
            customer: 'Vector Dynamics',
            dueDate: '2026-04-02',
            note: 'Live provider sync',
            setBy: 'Management',
            setAt: '2026-03-29T10:15:00Z',
          },
        ],
      }) as Response,
    );

    await liveOperatingSystemServices.setJobHot({
      jobId: 'JOB-LIVE-HOT-3',
      partNumber: 'SPINDLE-11',
      customer: 'Vector Dynamics',
      dueDate: '2026-04-02',
      note: 'Live provider sync',
      setBy: 'Management',
    });

    expect(listener).toHaveBeenCalled();
    expect(liveOperatingSystemServices.isJobHot('JOB-LIVE-HOT-3')).toBe(true);

    const ranked = liveOperatingSystemServices.rankJobsForTodo([
      {
        id: 'JOB-NORMAL-1',
        customer: 'Baseline',
        part_number: 'BASE-1',
        description: 'Normal queue',
        status: 'planned',
        quantity: 2,
        due_date: '2026-04-01',
        priority: 'normal',
        material: '6061',
        estimated_hours: 2,
        actual_hours: 0,
        created_at: '2026-03-29',
      },
      {
        id: 'JOB-LIVE-HOT-3',
        customer: 'Vector Dynamics',
        part_number: 'SPINDLE-11',
        description: 'Hot queue',
        status: 'planned',
        quantity: 1,
        due_date: '2026-04-03',
        priority: 'normal',
        material: '17-4',
        estimated_hours: 3,
        actual_hours: 0,
        created_at: '2026-03-29',
      },
    ]);

    expect(ranked[0]?.id).toBe('JOB-LIVE-HOT-3');
    unsubscribe();
  });

  it('hydrates the messages workspace from the live operating-system route with normalized linked-record routes', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeResponse({
        ok: true,
        data: {
          summary: '1 live thread needs release follow-up.',
          identityLabel: 'Jordan Vale',
          activeMailbox: 'planning@orchidprecision.com',
          connectionNote: 'Live thread route available.',
          channels: [
            {
              id: 'planning',
              label: 'Planning',
              detail: 'Dispatch coordination',
              countLabel: '1 thread',
            },
          ],
          threads: [
            {
              id: 'thread-live-1',
              channelId: 'planning',
              subject: 'Release check',
              preview: 'Confirm release packet posture.',
              participantsLabel: 'Planning',
              ownerLabel: 'Planning',
              updatedLabel: '2 min ago',
              source: 'workflow',
              priority: 'watch',
              unreadCount: 1,
              linkedRecordIds: ['PKT-9'],
            },
          ],
          selectedThreadId: 'thread-live-1',
          selectedThreadEntries: [
            {
              id: 'entry-live-1',
              sender: 'Jordan Vale',
              senderRole: 'Planner',
              sentLabel: '2 min ago',
              body: 'Release packet is staged for review.',
              source: 'workflow',
              direction: 'internal',
            },
          ],
          actionLabels: ['Open linked record'],
          linkedRecords: [
            {
              id: 'PKT-9',
              title: 'Release packet',
              type: 'Packet',
              status: 'Watch',
              owner: 'Planning',
              detail: 'Live linked record',
              workspaceLabel: 'Print to CNC',
              workspaceRoute: '/program-release',
              to: '/program-release?focusId=PKT-9&focusType=packet',
              keywords: ['packet'],
            },
          ],
        },
      }) as Response,
    );

    const workspace = await liveOperatingSystemServices.getMessagesWorkspace({
      profileId: 'planner',
      email: 'jordan.vale@orchidprecision.com',
      threadId: 'thread-live-1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/operating-system/messages/workspace',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          profileId: 'planner',
          email: 'jordan.vale@orchidprecision.com',
          threadId: 'thread-live-1',
        }),
      }),
    );
    expect(workspace.linkedRecords[0]?.workspaceRoute).toBe('/print-to-cnc');
    expect(workspace.linkedRecords[0]?.to).toBe('/print-to-cnc?focusId=PKT-9&focusType=packet');
  });

  it('falls back to the staged messages workspace when the live route is unavailable', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValue(new Error('messages route unavailable'));

    const workspace = await liveOperatingSystemServices.getMessagesWorkspace({
      profileId: 'planner',
      threadId: 'thread-planner-hot-job',
    });
    const fallback = await fixtureOperatingSystemServices.getMessagesWorkspace({
      profileId: 'planner',
      threadId: 'thread-planner-hot-job',
    });

    expect(workspace).toEqual(fallback);
  });

  it('hydrates shell commerce billing posture from the live billing status route without replacing the staged catalog', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeApiResponse({
        result: {
          userId: 'usr-1',
          plan: 'pro',
          role: 'engineer',
          prices: {
            starter: {
              monthly_cents: 2900,
              annual_cents: 29000,
              label: 'Starter',
            },
            pro: {
              monthly_cents: 7900,
              annual_cents: 79000,
              label: 'Pro',
            },
            shop: {
              monthly_cents: 19900,
              annual_cents: 199000,
              label: 'Shop',
            },
          },
          timestamp: '2026-03-29T18:15:00Z',
        },
      }) as Response,
    );

    const catalog = await liveOperatingSystemServices.getShellCommerceCatalog();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/billing/status',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(catalog.tiers.some((tier) => tier.id === 'starter')).toBe(true);
    expect(catalog.tiers.some((tier) => tier.id === 'professional')).toBe(true);
    expect(catalog.billingPosture).toMatchObject({
      source: 'live',
      authenticated: true,
      currentPlanId: 'pro',
      mappedTierId: 'standard',
      mappedTierLabel: 'Standard',
      roleLabel: 'engineer',
    });
    expect(catalog.billingPosture.planPrices.some((plan) => plan.planId === 'pro')).toBe(true);
    expect(catalog.shellNote).toContain('Live billing status is connected');
  });

  it('falls back to the staged commerce catalog when live billing status is unavailable', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      makeApiResponse({
        error: 'Authentication required',
      }, 401) as Response,
    );

    const catalog = await liveOperatingSystemServices.getShellCommerceCatalog();
    const fallback = await fixtureOperatingSystemServices.getShellCommerceCatalog();

    expect(catalog).toEqual(fallback);
  });

  it('hydrates inventory intake from live document, PO, and tooling signals with fallback structure', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        makeApiResponse({
          result: {
            documents: [
              {
                id: 'doc-1',
                title: 'Kennametal dock packet',
                status: 'complete',
              },
              {
                id: 'doc-2',
                title: 'Coolant SDS',
                status: 'pending',
              },
            ],
          },
        }) as Response,
      )
      .mockResolvedValueOnce(
        makeApiResponse({
          result: {
            orders: [
              {
                id: 'PO-1001',
                supplier_id: 'kennametal',
                supplier_name: 'Kennametal',
                status: 'approved',
                line_items: [
                  {
                    description: 'CNMG insert pack',
                    quantity: 12,
                    unit_price: 10,
                    total: 120,
                    received_qty: 0,
                  },
                ],
                subtotal: 120,
                tax: 0,
                total: 120,
                created_at: '2026-03-29T09:15:00Z',
              },
            ],
          },
        }) as Response,
      )
      .mockResolvedValueOnce(
        makeApiResponse({
          result: {
            records: [
              {
                id: 'usage-1',
                tool_id: 'INS-CNMG-432',
                tool_name: 'CNMG insert pack',
                job_id: 'JOB-17',
                operation: 'Finish turn',
                usage_minutes: 72.5,
                wear_percent: 81,
                cost: 0.84,
              },
            ],
          },
        }) as Response,
      )
      .mockResolvedValueOnce(
        makeApiResponse({
          result: {
            alerts: [
              {
                tool_id: 'INS-CNMG-432',
                tool_name: 'CNMG insert pack',
                current_qty: 1,
                min_stock: 4,
                reorder_qty: 6,
                estimated_cost: 118,
                urgency: 'high',
              },
            ],
          },
        }) as Response,
      );

    const workspace = await liveOperatingSystemServices.getInventoryOperationsWorkspace();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/doc/list',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/erp/po-list',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/erp/tool-usage',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/v1/erp/tool-reorder-alerts',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(workspace.summary).toContain('Live intake now sees 2 registered documents');
    expect(workspace.receivingQueue[0]?.reference).toBe('PO-1001');
    expect(workspace.receivingQueue[0]?.status).toBe('ready');
    expect(workspace.shellNote).toContain('live-backed with fixture fallback');
    expect(workspace.checkoutQueue[0]?.note).toContain('Live reorder posture');
    expect(workspace.usagePulses[0]?.nextAction).toContain('Live ERP usage shows 72.5 min on JOB-17');
  });

  it('keeps inventory intake hydrated when only part of the live intake surface is available', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        makeApiResponse({
          result: {
            documents: [
              {
                id: 'doc-9',
                title: 'Fixture arrival packet',
                status: 'complete',
              },
            ],
          },
        }) as Response,
      )
      .mockRejectedValueOnce(new Error('po list unavailable'))
      .mockRejectedValueOnce(new Error('tool usage unavailable'))
      .mockResolvedValueOnce(
        makeApiResponse({
          result: {
            alerts: [
              {
                tool_id: 'INS-CNMG-432',
                tool_name: 'CNMG insert pack',
                current_qty: 2,
                min_stock: 4,
                reorder_qty: 6,
                estimated_cost: 118,
                urgency: 'high',
              },
            ],
          },
        }) as Response,
      );

    const workspace = await liveOperatingSystemServices.getInventoryOperationsWorkspace();

    expect(workspace.summary).toContain('1 registered document');
    expect(workspace.receivingQueue[0]?.reference).toBe('PO-4821');
    expect(workspace.checkoutQueue[0]?.note).toContain('Live reorder posture');
    expect(workspace.shellNote).toContain('live-backed with fixture fallback');
  });

  it('hydrates the learning snapshot from live learning routes with fixture fallback for network posture', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: {
            total_hours: 28.5,
            modules_completed: 12,
            modules_total: 40,
            current_streak_days: 7,
            domain_progress: {
              CAD: 42,
              CAM: 55,
              ShopPractice: 63,
              MachineOperation: 38,
            },
            daily_history: [],
            badges: [{ id: 'badge-1', name: 'First Shift', description: '', earned_at: '2026-03-01', icon: 'badge' }],
          },
        }) as Response,
      )
      .mockResolvedValueOnce(
        makeResponse({
          ok: true,
          data: [
            {
              id: 'mod-1',
              title: 'Adaptive setup strategy',
              domain: 'CAM',
              difficulty: 'advanced',
              duration_min: 35,
              prerequisites: [],
              description: 'Tune setups faster.',
              status: 'available',
              completion_pct: 0,
            },
          ],
        }) as Response,
      );

    const snapshot = await liveOperatingSystemServices.getPlatformLearningSnapshot();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/learning/progress',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/learning/recommend',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(snapshot.shopProfile.adaptationScore).toBe('30% live learning coverage');
    expect(snapshot.shopProfile.captures[0]?.label).toBe('Operator progress loop');
    expect(snapshot.shopProfile.improvements[0]?.title).toBe('Promote Adaptive setup strategy');
    expect(snapshot.networkProfile.participatingShops).toBe('24 opt-in shops');
  });

  it('falls back to the fixture learning snapshot when the live learning routes fail', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValue(new Error('learning routes unavailable'));

    const snapshot = await liveOperatingSystemServices.getPlatformLearningSnapshot();
    const fallback = await fixtureOperatingSystemServices.getPlatformLearningSnapshot();

    expect(snapshot).toEqual(fallback);
  });
});
