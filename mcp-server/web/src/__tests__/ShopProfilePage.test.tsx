import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PROGRAMMING_ENVIRONMENTS } from '../data/calculatorWorkspace';
import { ShopProfilePage } from '../pages/ShopProfilePage';

vi.mock('../api/calculatorData', () => ({
  fetchProgrammingCatalogState: vi.fn(async (mode?: 'mill' | 'lathe' | 'wire_edm' | 'edm') => {
    const items = PROGRAMMING_ENVIRONMENTS.filter((item) => item.mode === (mode ?? 'mill'));
    return {
      items,
      source: 'fallback',
      liveCount: 0,
      fallbackCount: items.length,
      note: 'JM Die seeded programming is active for this posture.',
      sampled: false,
    };
  }),
}));

vi.mock('../api/shopProfile', () => ({
  fetchActiveShopProfile: vi.fn(async () => ({
    id: 'jm-die',
    name: 'JM Die',
    company_profile: {
      legal_name: 'JM Die',
      short_code: 'JMD',
      domain: 'jm-die.local',
      industry: 'Tool and die',
      specialization: 'Die build, electrode prep, and precision machining',
      region: 'Midwest',
      timezone: 'America/Chicago',
      file_archive_path: 'H:\\PRISM\\JM DIE',
      canonical_test_shop: true,
      development_role: 'Canonical PRISM rollout shop',
      cad_systems: ['Cimatron', 'SolidWorks'],
      cam_systems: ['Cimatron', 'Fusion 360', 'PEPS'],
    },
    source_roots: {
      company_root: 'H:\\PRISM\\JM DIE',
      programs_root: 'H:\\PRISM\\JM DIE\\Programs',
      employee_database_root: 'H:\\PRISM\\JM DIE\\Employees',
      machines_root: 'H:\\PRISM\\JM DIE\\Machines',
      controllers_root: 'H:\\PRISM\\JM DIE\\Controllers',
      tool_holders_root: 'H:\\PRISM\\JM DIE\\Tool Holders',
      tooling_root: 'H:\\PRISM\\JM DIE\\Tooling',
      materials_root: 'H:\\PRISM\\JM DIE\\Materials',
      prints_root: 'H:\\PRISM\\JM DIE\\Prints',
    },
    seed_domains: [
      {
        id: 'programs',
        label: 'Programs',
        status: 'in_progress',
        note: 'Canonical JM Die programs are being staged.',
        source_path: 'H:\\PRISM\\JM DIE\\Programs',
      },
    ],
    rates: {
      labor_per_hr: 85,
      overhead_per_hr: 40,
      admin_per_hr: 25,
      setup_per_hr: 95,
      programming_per_hr: 110,
      inspection_per_hr: 70,
    },
    machines: [],
    overhead_pct: 20,
    material_markup_pct: 15,
    tooling_cost_per_op: 30,
    material_cost_per_part_default: 10,
    admin_burden_pct: 8,
  })),
  fetchShopMachineControllerRegistry: vi.fn(async () => []),
  fetchShopMachineSeedSummary: vi.fn(async () => ({
    shop_id: 'jm-die',
    machine_count: 0,
    mapped_controller_count: 0,
    unmapped_machine_count: 0,
    program_release_ready_machine_count: 0,
    machine_source_root: 'H:\\PRISM\\JM DIE\\Machines',
    controller_source_root: 'H:\\PRISM\\JM DIE\\Controllers',
  })),
  fetchShopSelectorResourceSummary: vi.fn(async () => ({
    shop_id: 'jm-die',
    toolholder_count: 0,
    tooling_package_count: 0,
    stock_profile_count: 0,
    live_tool_count: 0,
    live_holder_count: 0,
    tooling_categories: [],
    tool_holders_root: 'H:\\PRISM\\JM DIE\\Tool Holders',
    tooling_root: 'H:\\PRISM\\JM DIE\\Tooling',
    materials_root: 'H:\\PRISM\\JM DIE\\Materials',
    tool_holders_root_present: false,
    tooling_root_present: false,
    materials_root_present: false,
  })),
  addShopMachine: vi.fn(),
  removeShopMachine: vi.fn(),
  updateActiveShopProfile: vi.fn(),
  updateShopMachine: vi.fn(),
}));

describe('ShopProfilePage', () => {
  it('surfaces JM Die programming authority snapshots for the canonical shop profile', async () => {
    render(
      <MemoryRouter initialEntries={['/shop']}>
        <ShopProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Programming authority' })).toBeDefined();
    expect(await screen.findByText('Mill programming')).toBeDefined();
    expect((await screen.findAllByText(/Cimatron/i)).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText(/Fusion 360/i)).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText((content) => content.includes('H:\\PRISM\\JM DIE\\Programs'))).length).toBeGreaterThanOrEqual(1);
  });

  it('launches routed Print to CNC and Toolpath continuity from supported JM Die programming cards', async () => {
    render(
      <MemoryRouter initialEntries={['/shop?profile=jm-die']}>
        <ShopProfilePage />
      </MemoryRouter>,
    );

    const millCard = await screen.findByRole('region', { name: 'Mill programming' });
    const latheCard = await screen.findByRole('region', { name: 'Lathe programming' });

    const millReleaseLink = within(millCard).getByRole('link', { name: 'Open Print to CNC' });
    const millToolpathLink = within(millCard).getByRole('link', { name: 'Open Toolpath Advisor' });
    expect(millReleaseLink.getAttribute('href')).toContain('/print-to-cnc?');
    expect(millReleaseLink.getAttribute('href')).toContain('source=shop');
    expect(millReleaseLink.getAttribute('href')).toContain('machineId=vf2-3x');
    expect(millReleaseLink.getAttribute('href')).toContain('partClassId=prismatic-bracket');
    expect(millToolpathLink.getAttribute('href')).toContain('/toolpath?');
    expect(millToolpathLink.getAttribute('href')).toContain('machineId=vf2-3x');
    expect(within(millCard).getByText(/shared 3-axis JM Die release spine/i)).toBeDefined();

    const latheReleaseLink = within(latheCard).getByRole('link', { name: 'Open Print to CNC' });
    const latheToolpathLink = within(latheCard).getByRole('link', { name: 'Open Toolpath Advisor' });
    expect(latheReleaseLink.getAttribute('href')).toContain('/print-to-cnc?');
    expect(latheReleaseLink.getAttribute('href')).toContain('machineId=st20-turn');
    expect(latheReleaseLink.getAttribute('href')).toContain('toolholderId=capto-turn');
    expect(latheToolpathLink.getAttribute('href')).toContain('/toolpath?');
    expect(latheToolpathLink.getAttribute('href')).toContain('stockId=174-round');
    expect(within(latheCard).getByText(/canonical JM Die turning release packet/i)).toBeDefined();
  });

  it('keeps EDM continuity honest when routed toolpath or release packets are not available', async () => {
    render(
      <MemoryRouter initialEntries={['/shop?profile=jm-die']}>
        <ShopProfilePage />
      </MemoryRouter>,
    );

    const wireCard = await screen.findByRole('region', { name: 'Wire EDM programming' });
    const sinkerCard = await screen.findByRole('region', { name: 'Sinker EDM programming' });

    const wireReleaseLink = within(wireCard).getByRole('link', { name: 'Open Print to CNC' });
    expect(wireReleaseLink.getAttribute('href')).toContain('/print-to-cnc?');
    expect(wireReleaseLink.getAttribute('href')).toContain('machineId=aln600g-wire');
    expect(within(wireCard).queryByRole('link', { name: 'Open Toolpath Advisor' })).toBeNull();
    expect(within(wireCard).getByText(/Toolpath Advisor is not yet wired for the routed Wire EDM posture/i)).toBeDefined();

    expect(within(sinkerCard).queryByRole('link', { name: 'Open Print to CNC' })).toBeNull();
    expect(within(sinkerCard).queryByRole('link', { name: 'Open Toolpath Advisor' })).toBeNull();
    expect(within(sinkerCard).getByText(/pending a canonical sinker machine row/i)).toBeDefined();
    expect(within(sinkerCard).getByText(/Toolpath Advisor stays unavailable for sinker EDM/i)).toBeDefined();
  });
});
