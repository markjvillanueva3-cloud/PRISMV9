import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { WireEdmResultsPage } from '../pages/WireEdmResultsPage';
import type { MachineWorkspaceContext } from '../features/machine-workspace/MachineWorkspaceState';

const WIRE_WORKSPACE_CONTEXT: MachineWorkspaceContext = {
  mode: 'wire_edm',
  machineLabel: 'Sodick ALN600G',
  machineId: 'WEDM-01',
  machineManufacturer: 'Sodick',
  machineKinematics: 'Wire EDM',
  controllerId: 'sodick',
  controllerLabel: 'Sodick LN2W',
  materialLabel: 'Tool Steel',
  materialGroup: 'steel',
  stockDiameterMm: 0,
  stockLengthMm: 80,
  stockThicknessMm: 24,
  targetRaUm: 1.1,
  holderStyle: 'fine-wire',
  programReleasePath: '/program-release?source=wire-edm-upload&machineId=WEDM-01',
  selectorAuthorityNote: 'Sodick ALN600G is the canonical JM Die wire EDM registry entry.',
  programmingAuthority: {
    badge: 'JM Die curated programming',
    summary: 'JM Die curated wire packages are active for this routed posture.',
    posture: 'curated-service',
    note: 'JM Die curated wire packages keep this results view aligned with the routed machine registry while Program Release parity converges.',
    environmentLabel: 'Cimatron',
    licenseLabel: 'Taper + skim',
    toolpathLabel: 'Wire Profile',
  },
};

function WizardStateProbe() {
  const location = useLocation();
  const state = (location.state as { workspaceContext?: MachineWorkspaceContext } | null) ?? null;
  return <div>{state?.workspaceContext?.machineLabel ?? 'missing-context'}</div>;
}

function SetupSheetStateProbe() {
  const location = useLocation();
  const state = (location.state as { workspaceContext?: MachineWorkspaceContext; partNumber?: string } | null) ?? null;
  return <div>{`${state?.workspaceContext?.machineLabel ?? 'missing-context'}|${state?.partNumber ?? 'missing-part'}`}</div>;
}

function ProveOutStateProbe() {
  const location = useLocation();
  const state = (location.state as { workspaceContext?: MachineWorkspaceContext; partNumber?: string; controller?: string } | null) ?? null;
  return <div>{`${state?.workspaceContext?.machineLabel ?? 'missing-context'}|${state?.partNumber ?? 'missing-part'}|${state?.controller ?? 'missing-controller'}`}</div>;
}

function OptimizationStateProbe() {
  const location = useLocation();
  const state = (location.state as {
    workspaceContext?: MachineWorkspaceContext;
    sourceLabel?: string;
    controller?: string;
    materialName?: string;
  } | null) ?? null;
  return <div>{`${state?.workspaceContext?.machineLabel ?? 'missing-context'}|${state?.sourceLabel ?? 'missing-source'}|${state?.controller ?? 'missing-controller'}|${state?.materialName ?? 'missing-material'}`}</div>;
}

function CycleTimeStateProbe() {
  const location = useLocation();
  const state = (location.state as {
    workspaceContext?: MachineWorkspaceContext;
    sourceLabel?: string;
    controller?: string;
  } | null) ?? null;
  return <div>{`${state?.workspaceContext?.machineLabel ?? 'missing-context'}|${state?.sourceLabel ?? 'missing-source'}|${state?.controller ?? 'missing-controller'}`}</div>;
}

function FeatureStateProbe() {
  const location = useLocation();
  const state = (location.state as {
    workspaceContext?: MachineWorkspaceContext;
    sourceLabel?: string;
    materialName?: string;
  } | null) ?? null;
  return <div>{`${state?.workspaceContext?.machineLabel ?? 'missing-context'}|${state?.sourceLabel ?? 'missing-source'}|${state?.materialName ?? 'missing-material'}`}</div>;
}

function ToolOptimizationStateProbe() {
  const location = useLocation();
  const state = (location.state as {
    workspaceContext?: MachineWorkspaceContext;
    sourceLabel?: string;
    operations?: unknown[];
    tools?: unknown[];
  } | null) ?? null;
  return <div>{`${state?.workspaceContext?.machineLabel ?? 'missing-context'}|${state?.sourceLabel ?? 'missing-source'}|${state?.operations?.length ?? 0}|${state?.tools?.length ?? 0}`}</div>;
}

function PostProcessorStateProbe() {
  const location = useLocation();
  const state = (location.state as {
    workspaceContext?: MachineWorkspaceContext;
    sourceLabel?: string;
    unsupportedReason?: string;
  } | null) ?? null;
  return <div>{`${state?.workspaceContext?.machineLabel ?? 'missing-context'}|${state?.sourceLabel ?? 'missing-source'}|${state?.unsupportedReason ? 'unsupported' : 'supported'}`}</div>;
}

function ProgramReleaseQueryProbe() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  return (
    <div>
      {[
        params.get('source') ?? 'missing-source',
        params.get('recordType') ?? 'missing-record-type',
        params.get('recordId') ?? 'missing-record-id',
        params.get('partClassId') ?? 'missing-part-class',
        params.get('machineId') ?? 'missing-machine',
        params.get('machineFamilyId') ?? 'missing-family',
        params.get('machineManufacturer') ?? 'missing-manufacturer',
        params.get('stockId') ?? 'missing-stock',
        params.get('cadSourceId') ?? 'missing-cad-source',
        params.get('focusPacketId') ?? 'missing-packet',
      ].join('|')}
    </div>
  );
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/wire-edm/results',
          state: {
            fileName: 'profile.dxf',
            fileRoute: 'dxf',
            material: 'D2',
            thickness: 25,
            qualityTier: 'precision',
            machinePreference: 'sodick',
            studioMode: false,
            workspaceContext: WIRE_WORKSPACE_CONTEXT,
          },
        },
      ]}
    >
      <Routes>
        <Route path="/wire-edm/results" element={<WireEdmResultsPage />} />
        <Route path="/wire-edm/wizard" element={<WizardStateProbe />} />
        <Route path="/setup-sheet" element={<SetupSheetStateProbe />} />
        <Route path="/prove-out" element={<ProveOutStateProbe />} />
        <Route path="/optimize" element={<OptimizationStateProbe />} />
        <Route path="/cycle-time" element={<CycleTimeStateProbe />} />
        <Route path="/features" element={<FeatureStateProbe />} />
        <Route path="/tool-optimization" element={<ToolOptimizationStateProbe />} />
        <Route path="/ppg" element={<PostProcessorStateProbe />} />
        <Route path="/print-to-cnc" element={<ProgramReleaseQueryProbe />} />
        <Route path="/wire-edm" element={<div>Wire Upload</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WireEdmResultsPage', () => {
  it('surfaces shared routed wire authority and preserves it on rerun', () => {
    renderPage();

    expect(screen.getByText('Shared routed wire authority')).toBeDefined();
    expect(screen.getAllByText(/Sodick ALN600G/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Cimatron/i).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Dimensions & Re-Run' }));

    expect(screen.getByText('Sodick ALN600G')).toBeDefined();
  });

  it('launches setup-sheet generation with the routed JM Die context intact', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Open Setup Sheet Generator' }));

    expect(screen.getByText('Sodick ALN600G|profile')).toBeDefined();
  });

  it('launches prove-out workflow with the routed JM Die context intact', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Open Prove-Out Workflow' }));

    expect(screen.getByText('Sodick ALN600G|profile|sodick')).toBeDefined();
  });

  it('launches print-to-cnc release with the routed JM Die selector packet intact', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Open Print to CNC Release' }));

    expect(screen.getByText('wire-edm-results|Wire EDM Result|profile|fixture-plate|aln600g-wire|wire-edm|sodick|d2-plate|neutral-compare|pkt__wire_edm__profile')).toBeDefined();
  });

  it('launches optimization report with the routed JM Die context intact', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Open Optimization Report' }));

    expect(screen.getByText('Sodick ALN600G|wire edm results|sodick|D2')).toBeDefined();
  });

  it('launches cycle time estimation with the routed JM Die context intact', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Open Cycle Time Estimator' }));

    expect(screen.getByText('Sodick ALN600G|wire edm results|sodick')).toBeDefined();
  });

  it('launches feature auto-selection with the routed JM Die context intact', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Open Feature Auto-Selection' }));

    expect(screen.getByText('Sodick ALN600G|wire edm results|D2')).toBeDefined();
  });

  it('launches tool optimization with the routed JM Die context intact', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Open Tool Optimization' }));

    expect(screen.getByText('Sodick ALN600G|wire edm results|0|0')).toBeDefined();
  });

  it('launches post processor generation with the routed JM Die context intact', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Open Post Processor Generator' }));

    expect(screen.getByText('Sodick ALN600G|wire edm results|unsupported')).toBeDefined();
  });
});
