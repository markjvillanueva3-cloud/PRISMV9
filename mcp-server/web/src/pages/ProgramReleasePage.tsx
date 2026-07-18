import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchProgrammingCatalogState } from '../api/calculatorData';
import { attachPacketFile, listPacketAttachments, uploadPacketFile, type FileAttachmentRecord } from '../api/parts';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { PurchaseRecommendationModal } from '../components/shell/PurchaseRecommendationModal';
import type { MachineWorkspaceProgrammingAuthority } from '../features/machine-workspace/MachineWorkspaceState';
import {
  buildMachineWorkspaceProgrammingAuthority,
  inferProgrammingModeFromMachineSignature,
} from '../features/machine-workspace/routeProgrammingAuthority';
import {
  findProgramReleaseCadSourceId,
  readProgramReleaseRouteSelection,
  resolveProgramReleaseSelectorState,
  resolveToolpathAdvisorRouteAuthority,
} from '../features/machine-workspace/selectorAuthorityContract';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import type {
  ProgramReleaseCatalog,
  ProgramReleaseSavedMachineProfile,
  ProgramReleaseWorkspace,
  PurchaseRecommendation,
} from '../features/operating-system/contracts';
import { useShellCommerceSelection } from '../features/operating-system/shellCommerceState';
import { buildCapturePath } from '../utils/captureRoute';
import { buildShopFloorPath } from '../utils/shopFloorRoute';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

type IntakeMode = 'dropbox' | 'design';
type ReviewTab = 'gates' | 'dfm' | 'compare';

type DroppedArtifact = {
  id: string;
  name: string;
  extension: string;
  family: string;
};

type LivePacketArtifact = {
  id: string;
  fileId: string;
  name: string;
  extension: string;
  family: string;
  status: 'stored' | 'attached';
  detail: string;
};

const UNIVERSAL_FILE_FAMILIES = [
  {
    title: 'Drawings and prints',
    items: ['PDF', 'TIFF', 'PNG', 'JPG', 'DWG', 'DXF'],
  },
  {
    title: 'Neutral CAD',
    items: ['STEP', 'STP', 'IGES', 'IGS', 'Parasolid X_T / X_B', 'SAT'],
  },
  {
    title: 'Native CAD',
    items: ['SLDPRT / SLDASM', 'IPT / IAM', 'F3D / F3Z', 'CATPART', '3DM', 'SKP'],
  },
  {
    title: 'Shop packet extras',
    items: ['CSV', 'XLSX', 'TXT', 'ZIP', 'Inspection certs', 'Photos / scans'],
  },
] as const;

const PRISM_DESIGN_PATHS = [
  {
    title: 'Simple prismatic design',
    detail: 'Start from envelope, datums, and feature intent inside Kienzle before exporting or comparing.',
  },
  {
    title: 'Fixture and setup concept',
    detail: 'Capture workholding, stock, and datum posture before the CAM package is locked.',
  },
  {
    title: 'Assembly compare packet',
    detail: 'Stage multiple mating parts, collision checkpoints, and machine-area review posture.',
  },
] as const;

const PROGRAM_RELEASE_DEFAULT_USER_ID = 'shell-default';

function detectFamily(extension: string) {
  const normalized = extension.toLowerCase();
  if (['pdf', 'dwg', 'dxf', 'tif', 'tiff', 'png', 'jpg', 'jpeg', 'webp'].includes(normalized)) {
    return 'Drawing / print';
  }
  if (['step', 'stp', 'iges', 'igs', 'x_t', 'x_b', 'sat', 'sab'].includes(normalized)) {
    return 'Neutral CAD';
  }
  if (['sldprt', 'sldasm', 'ipt', 'iam', 'f3d', 'f3z', 'catpart', 'catproduct', '3dm', 'skp', 'stl', 'obj'].includes(normalized)) {
    return 'Native CAD';
  }
  if (['csv', 'xlsx', 'xls', 'txt', 'zip', 'rar', '7z'].includes(normalized)) {
    return 'Packet / business file';
  }
  return 'Any file / manual review';
}

function toArtifacts(files: FileList | null): DroppedArtifact[] {
  if (!files) {
    return [];
  }

  return Array.from(files).map((file, index) => {
    const nameSegments = file.name.split('.');
    const extension = file.name.includes('.') && nameSegments.length > 1 ? nameSegments[nameSegments.length - 1] ?? '' : '';
    return {
      id: `${file.name}-${index}`,
      name: file.name,
      extension: extension || 'none',
      family: detectFamily(extension),
    };
  });
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function inferAttachmentType(family: string) {
  if (family === 'Drawing / print') {
    return 'drawing';
  }
  if (family === 'Neutral CAD' || family === 'Native CAD') {
    return 'cad_model';
  }
  if (family === 'Packet / business file') {
    return 'documentation';
  }
  return 'general';
}

function toLivePacketArtifactFromAttachment(attachment: FileAttachmentRecord): LivePacketArtifact {
  const extension = attachment.file.original_name.includes('.')
    ? attachment.file.original_name.split('.').pop() ?? 'file'
    : 'file';

  return {
    id: attachment.id,
    fileId: attachment.file_id,
    name: attachment.file.original_name,
    extension,
    family: attachment.attachment_type.replace(/_/g, ' '),
    status: 'attached',
    detail: `Attached to ${attachment.entity_type} ${attachment.entity_id}`,
  };
}

function mergeLivePacketArtifacts(current: LivePacketArtifact[], next: LivePacketArtifact[]) {
  const byFileId = new Map(current.map((artifact) => [artifact.fileId, artifact]));
  next.forEach((artifact) => {
    byFileId.set(artifact.fileId, artifact);
  });
  return [...byFileId.values()];
}

function statusTone(status: 'ready' | 'review' | 'blocked') {
  if (status === 'ready') return 'emerald' as const;
  if (status === 'blocked') return 'rose' as const;
  return 'amber' as const;
}

function findingTone(severity: 'info' | 'watch' | 'critical') {
  if (severity === 'critical') return 'rose' as const;
  if (severity === 'watch') return 'amber' as const;
  return 'sky' as const;
}

function sourceTone(status: 'preferred' | 'fallback' | 'compare') {
  if (status === 'preferred') return 'emerald' as const;
  if (status === 'compare') return 'amber' as const;
  return 'rose' as const;
}

function programmingAuthorityTone(posture: MachineWorkspaceProgrammingAuthority['posture']) {
  if (posture === 'live') return 'emerald' as const;
  if (posture === 'hybrid') return 'sky' as const;
  if (posture === 'curated-service') return 'violet' as const;
  if (posture === 'fallback') return 'amber' as const;
  return 'slate' as const;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ProgramReleasePage() {
  const operatingSystem = useOperatingSystem();
  const location = useLocation();
  const { selection } = useShellCommerceSelection();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeSelection = useMemo(() => readProgramReleaseRouteSelection(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const launcherSource = routeParams.get('source') || '';
  const upstreamSource = routeContext.origin.source;
  const sourceContext = launcherSource || upstreamSource;
  const upstreamCommercialSource = upstreamSource && upstreamSource !== sourceContext ? upstreamSource : '';
  const upstreamRecordType = routeContext.origin.recordType;
  const upstreamRecordId = routeContext.origin.recordId;
  const upstreamThreadId = routeContext.origin.threadId;
  const upstreamCustomer = routeContext.origin.customer;
  const upstreamNote = routeContext.origin.note;
  const sourceContextLabel = useMemo(() => formatWorkflowSourceLabel(sourceContext), [sourceContext]);
  const upstreamSourceLabel = useMemo(() => formatWorkflowSourceLabel(upstreamCommercialSource), [upstreamCommercialSource]);
  const upstreamRecordLabel = useMemo(() => {
    if (!upstreamRecordType && !upstreamRecordId) {
      return '';
    }

    if (upstreamRecordType && upstreamRecordId) {
      return `${upstreamRecordType} ${upstreamRecordId}`;
    }

    return upstreamRecordType || upstreamRecordId;
  }, [upstreamRecordId, upstreamRecordType]);
  const upstreamContextSummary = useMemo(() => {
    if (!sourceContext) {
      return '';
    }

    const referenceBits = [upstreamRecordLabel, upstreamCustomer ? `(${upstreamCustomer})` : ''].filter(Boolean).join(' ');
    const reference = referenceBits || 'the upstream record';
    return `${sourceContextLabel || 'Upstream workspace'} opened Print to CNC with follow-up context for ${reference}${upstreamNote ? ` · ${upstreamNote}` : ''}`;
  }, [sourceContext, sourceContextLabel, upstreamCustomer, upstreamNote, upstreamRecordLabel]);
  const releaseFocus = useMemo(() => {
    const routePacketId = routeContext.focus.packetId || routeParams.get('packetId') || '';
    const focusId =
      routeContext.focus.type === 'job'
        ? routeContext.focus.jobId || routeContext.focus.id
        : routeContext.focus.type === 'packet'
          ? routePacketId || routeContext.focus.id
          : routeContext.focus.type === 'quote'
            ? routeContext.focus.quoteId || routeContext.focus.id
            : routeContext.focus.id || routeContext.focus.jobId || routePacketId;
    if (focusId || routePacketId || routeParams.get('partClassId')) {
      return {
        type: routeContext.focus.type || (routeContext.focus.jobId ? 'job' : routePacketId ? 'packet' : 'packet'),
        id: focusId || routePacketId || routeParams.get('partClassId') || '',
        jobId: routeContext.focus.jobId,
        quoteId: routeContext.focus.quoteId,
        packetId: routePacketId || routeParams.get('partClassId') || '',
      };
    }
    return undefined;
  }, [routeContext.focus.id, routeContext.focus.jobId, routeContext.focus.packetId, routeContext.focus.quoteId, routeContext.focus.type, routeParams]);
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: 'print-to-cnc',
            recordType: 'Release',
            recordId: releaseFocus?.packetId || routeParams.get('partClassId') || 'release',
            customer: upstreamCustomer,
            note: upstreamNote || 'Carry matched release packet context into downstream follow-up.',
            threadId: upstreamThreadId,
          },
    [releaseFocus?.packetId, routeContext.origin, routeParams, upstreamCustomer, upstreamNote, upstreamThreadId],
  );
  const upstreamMessagesPath = useMemo(
    () => buildWorkflowPath('/messages', location.search, { origin: effectiveOrigin, focus: releaseFocus, extras: { source: 'print-to-cnc' } }),
    [effectiveOrigin, location.search, releaseFocus],
  );
  const jobsReturnFocus = useMemo(
    () =>
      releaseFocus?.jobId
        ? {
            type: 'job',
            id: releaseFocus.jobId,
            jobId: releaseFocus.jobId,
          }
        : upstreamRecordType === 'Job' && upstreamRecordId
          ? {
              type: 'job',
              id: upstreamRecordId,
              jobId: upstreamRecordId,
            }
        : undefined,
    [releaseFocus?.jobId, upstreamRecordId, upstreamRecordType],
  );
  const upstreamJobsPath = useMemo(
    () => buildWorkflowPath('/jobs', location.search, { origin: effectiveOrigin, focus: jobsReturnFocus, extras: { source: 'print-to-cnc' } }),
    [effectiveOrigin, jobsReturnFocus, location.search],
  );

  const [intakeMode, setIntakeMode] = useState<IntakeMode>('dropbox');
  const [reviewTab, setReviewTab] = useState<ReviewTab>('gates');
  const [catalog, setCatalog] = useState<ProgramReleaseCatalog | null>(null);
  const [workspace, setWorkspace] = useState<ProgramReleaseWorkspace | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [catalogReloadKey, setCatalogReloadKey] = useState(0);
  const [workspaceReloadKey, setWorkspaceReloadKey] = useState(0);
  const [defaultMachineProfile, setDefaultMachineProfile] = useState<ProgramReleaseSavedMachineProfile | null>(null);
  const [programmingAuthority, setProgrammingAuthority] = useState<MachineWorkspaceProgrammingAuthority | null>(null);
  const [partClassId, setPartClassId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [toolholderId, setToolholderId] = useState('');
  const [toolingPackageId, setToolingPackageId] = useState('');
  const [fixtureId, setFixtureId] = useState('');
  const [stockId, setStockId] = useState('');
  const [cadSourceId, setCadSourceId] = useState('');
  const [chuckJawConfig, setChuckJawConfig] = useState<'soft' | 'hard' | 'collet' | 'custom'>('soft');
  const [tailstockQuill, setTailstockQuill] = useState<'extended' | 'retracted' | 'not_used'>('not_used');
  const [barPullEnabled, setBarPullEnabled] = useState(false);
  const [liveToolState, setLiveToolState] = useState<'active' | 'inactive' | 'not_equipped'>('not_equipped');
  const [droppedArtifacts, setDroppedArtifacts] = useState<DroppedArtifact[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [livePacketArtifacts, setLivePacketArtifacts] = useState<LivePacketArtifact[]>([]);
  const [packetSyncLoading, setPacketSyncLoading] = useState(false);
  const [packetSyncError, setPacketSyncError] = useState<string | null>(null);
  const [packetSyncSummary, setPacketSyncSummary] = useState<string | null>(null);
  const [machineProfileSaveLoading, setMachineProfileSaveLoading] = useState(false);
  const [machineProfileSaveError, setMachineProfileSaveError] = useState<string | null>(null);
  const [machineProfileSaveSummary, setMachineProfileSaveSummary] = useState<string | null>(null);
  const [purchaseRecommendations, setPurchaseRecommendations] = useState<PurchaseRecommendation[]>([]);
  const [purchaseTarget, setPurchaseTarget] = useState<PurchaseRecommendation | null>(null);
  const [designBrief, setDesignBrief] = useState({
    partName: 'Valve body rev C',
    envelope: '8.0 x 5.0 x 1.25 in',
    features: 'Cross-drills, seal faces, side ports, fixture datums',
    tolerance: 'Seal faces + port locations must stay compare-ready for simulation and quoting.',
  });
  const selectorAuthority = useMemo(() => {
    if (!catalog) {
      return null;
    }

    return resolveProgramReleaseSelectorState({
      catalog,
      routeSelection,
      savedMachineProfile: defaultMachineProfile,
      current: {
        partClassId,
        machineId,
        toolholderId,
        toolingPackageId,
        fixtureId,
        stockId,
        cadSourceId,
      },
    });
  }, [
    cadSourceId,
    catalog,
    defaultMachineProfile,
    fixtureId,
    machineId,
    partClassId,
    routeSelection,
    stockId,
    toolingPackageId,
    toolholderId,
  ]);
  const toolpathRouteSelection = useMemo(
    () => ({
      partClassId,
      machineId,
      machineFamilyId: workspace?.selectedMachine.familyId ?? routeSelection.machineFamilyId ?? null,
      machineManufacturer:
        workspace?.selectedMachine.manufacturerId
        ?? workspace?.selectedMachine.manufacturer
        ?? routeSelection.machineManufacturer
        ?? null,
      toolholderId,
      toolingPackageId,
      fixtureId,
      stockId,
      cadSourceId,
    }),
    [
      cadSourceId,
      fixtureId,
      machineId,
      partClassId,
      routeSelection.machineFamilyId,
      routeSelection.machineManufacturer,
      stockId,
      toolholderId,
      toolingPackageId,
      workspace?.selectedMachine.familyId,
      workspace?.selectedMachine.manufacturer,
      workspace?.selectedMachine.manufacturerId,
    ],
  );
  const toolpathRouteAuthority = useMemo(
    () => (catalog ? resolveToolpathAdvisorRouteAuthority(catalog, toolpathRouteSelection) : null),
    [catalog, toolpathRouteSelection],
  );
  const programmingMode = useMemo(
    () =>
      inferProgrammingModeFromMachineSignature({
        machineFamilyId: routeSelection.machineFamilyId ?? undefined,
        machineLabel: workspace?.selectedMachine.label,
        machineKinematics: workspace?.selectedMachine.kinematics,
        controllerLabel: workspace?.selectedMachine.controller,
      }),
    [
      routeSelection.machineFamilyId,
      workspace?.selectedMachine.controller,
      workspace?.selectedMachine.kinematics,
      workspace?.selectedMachine.label,
    ],
  );
  const capturePath = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: 'print-to-cnc',
        target: 'job',
        job: designBrief.partName,
        department: 'Programming',
        machine: workspace?.selectedMachine.label ?? '',
        note: 'Capture prove-out video, setup photos, print snapshots, and release evidence for this program packet.',
        origin: effectiveOrigin,
        focus: releaseFocus ?? { type: 'packet', id: designBrief.partName, packetId: designBrief.partName },
      }),
    [designBrief.partName, effectiveOrigin, location.pathname, location.search, releaseFocus, workspace?.selectedMachine.label],
  );
  const shopFloorPath = useMemo(
    () =>
      buildShopFloorPath(location.pathname, location.search, {
        source: 'print-to-cnc',
        job: designBrief.partName,
        department: 'Job setup',
        operation: workspace?.operationPlan[0]?.title ?? 'Setup prove-out',
        machine: workspace?.selectedMachine.label ?? '',
        note: 'Start prove-out, setup confirmation, and actual-vs-standard capture from this release packet.',
        origin: effectiveOrigin,
        focus: releaseFocus ?? { type: 'packet', id: designBrief.partName, packetId: designBrief.partName },
      }),
    [designBrief.partName, effectiveOrigin, location.pathname, location.search, releaseFocus, workspace?.operationPlan, workspace?.selectedMachine.label],
  );
  const toolpathAdvisorPath = useMemo(
    () =>
      buildWorkflowPath('/toolpath', location.search, {
        origin: effectiveOrigin,
        focus: releaseFocus,
        extras: {
          source: 'print-to-cnc',
          partClassId,
          machineId,
          machineFamilyId: toolpathRouteSelection.machineFamilyId,
          machineManufacturer: toolpathRouteSelection.machineManufacturer,
          toolholderId,
          toolingPackageId,
          fixtureId,
          stockId,
          cadSourceId,
        },
      }),
    [
      cadSourceId,
      effectiveOrigin,
      fixtureId,
      location.search,
      machineId,
      partClassId,
      releaseFocus,
      stockId,
      toolholderId,
      toolingPackageId,
      toolpathRouteSelection.machineFamilyId,
      toolpathRouteSelection.machineManufacturer,
    ],
  );
  useEffect(() => {
    const fallbackAuthority = buildMachineWorkspaceProgrammingAuthority({
      mode: programmingMode,
      machineFamilyId: routeSelection.machineFamilyId ?? undefined,
      machineLabel: workspace?.selectedMachine.label,
      machineKinematics: workspace?.selectedMachine.kinematics,
      controllerLabel: workspace?.selectedMachine.controller,
    });
    setProgrammingAuthority(fallbackAuthority ?? null);

    if (!programmingMode || !workspace) {
      return undefined;
    }

    let active = true;

    fetchProgrammingCatalogState(programmingMode)
      .then((programmingCatalogState) => {
        if (!active) {
          return;
        }

        setProgrammingAuthority(
          buildMachineWorkspaceProgrammingAuthority({
            mode: programmingMode,
            machineFamilyId: routeSelection.machineFamilyId ?? undefined,
            machineLabel: workspace.selectedMachine.label,
            machineKinematics: workspace.selectedMachine.kinematics,
            controllerLabel: workspace.selectedMachine.controller,
            programmingCatalogState,
          }) ?? fallbackAuthority ?? null,
        );
      })
      .catch(() => {
        if (active) {
          setProgrammingAuthority(fallbackAuthority ?? null);
        }
      });

    return () => {
      active = false;
    };
  }, [
    programmingMode,
    routeSelection.machineFamilyId,
    workspace,
    workspace?.selectedMachine.controller,
    workspace?.selectedMachine.kinematics,
    workspace?.selectedMachine.label,
  ]);
  const packetAttachmentTarget = useMemo(() => {
    const focusJobId = releaseFocus?.jobId || routeContext.focus.jobId;
    if (focusJobId) {
      return { entityType: 'job', entityId: focusJobId, label: `job ${focusJobId}` };
    }

    if (routeContext.focus.type === 'quote' && (routeContext.focus.quoteId || routeContext.focus.id)) {
      const quoteId = routeContext.focus.quoteId || routeContext.focus.id;
      return { entityType: 'quote', entityId: quoteId, label: `quote ${quoteId}` };
    }

    if ((upstreamRecordType === 'Quote' || upstreamRecordType === 'Job' || upstreamRecordType === 'Customer') && upstreamRecordId) {
      return {
        entityType: upstreamRecordType.toLowerCase(),
        entityId: upstreamRecordId,
        label: `${upstreamRecordType.toLowerCase()} ${upstreamRecordId}`,
      };
    }

    return null;
  }, [releaseFocus?.jobId, routeContext.focus.id, routeContext.focus.jobId, routeContext.focus.quoteId, routeContext.focus.type, upstreamRecordId, upstreamRecordType]);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError(null);

    operatingSystem
      .getProgramReleaseCatalog()
      .then(async (nextCatalog) => {
        if (!active) {
          return;
        }

        const savedMachineProfile = operatingSystem.getProgramReleaseDefaultMachineProfile
          ? await operatingSystem.getProgramReleaseDefaultMachineProfile({
            userId: PROGRAM_RELEASE_DEFAULT_USER_ID,
            workspaceId: 'program-release',
          })
          : null;
        if (!active) {
          return;
        }

        const machineSearch = operatingSystem.searchProgramReleaseMachines
          ? await operatingSystem.searchProgramReleaseMachines({
            manufacturer: routeSelection.machineManufacturer ?? undefined,
            familyId: routeSelection.machineFamilyId ?? undefined,
            limit: 500,
          })
          : null;
        if (!active) {
          return;
        }
        let mergedCatalog = machineSearch?.machines.length
          ? { ...nextCatalog, machines: machineSearch.machines }
          : nextCatalog;
        const preferredMachineId = routeSelection.machineId ?? savedMachineProfile?.machineId ?? null;
        if (
          preferredMachineId
          && operatingSystem.getProgramReleaseMachine
          && !mergedCatalog.machines.some((item) => item.id === preferredMachineId)
        ) {
          const routedMachine = await operatingSystem.getProgramReleaseMachine(preferredMachineId);
          if (!active) {
            return;
          }
          if (routedMachine) {
            mergedCatalog = {
              ...mergedCatalog,
              machines: [
                routedMachine,
                ...mergedCatalog.machines.filter((machine) => machine.id !== routedMachine.id),
              ],
            };
          }
        }
        const selectorState = resolveProgramReleaseSelectorState({
          catalog: mergedCatalog,
          routeSelection,
          savedMachineProfile,
          current: {
            partClassId,
            machineId,
            toolholderId,
            toolingPackageId,
            fixtureId,
            stockId,
            cadSourceId,
          },
        });
        setDefaultMachineProfile(savedMachineProfile);
        setCatalog(mergedCatalog);
        setPartClassId(selectorState.partClassId);
        setMachineId(selectorState.machineId);
        setToolholderId(selectorState.toolholderId);
        setToolingPackageId(selectorState.toolingPackageId);
        setFixtureId(selectorState.fixtureId);
        setStockId(selectorState.stockId);
        setCadSourceId(selectorState.cadSourceId);
      })
      .catch((error) => {
        if (active) {
          setDefaultMachineProfile(null);
          setCatalog(null);
          setCatalogError(getErrorMessage(error, 'Program release catalog unavailable right now.'));
        }
      })
      .finally(() => {
        if (active) {
          setCatalogLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [catalogReloadKey, operatingSystem, routeSelection]);

  useEffect(() => {
    if (!catalog || !partClassId || !machineId || !toolholderId || !toolingPackageId || !fixtureId || !stockId || !cadSourceId) {
      setWorkspace(null);
      return;
    }

    let active = true;
    setWorkspaceLoading(true);
    setWorkspaceError(null);

    operatingSystem
      .buildProgramReleaseWorkspace({
        partClassId,
        machineId,
        toolholderId,
        toolingPackageId,
        fixtureId,
        stockId,
        cadSourceId,
      })
      .then((nextWorkspace) => {
        if (active) {
          setWorkspace(nextWorkspace);
        }
      })
      .catch((error) => {
        if (active) {
          setWorkspace(null);
          setWorkspaceError(getErrorMessage(error, 'Program release workspace unavailable right now.'));
        }
      })
      .finally(() => {
        if (active) {
          setWorkspaceLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [cadSourceId, fixtureId, machineId, operatingSystem, partClassId, stockId, toolholderId, toolingPackageId, workspaceReloadKey, catalog]);

  useEffect(() => {
    let active = true;

    if (!packetAttachmentTarget) {
      setLivePacketArtifacts([]);
      return () => {
        active = false;
      };
    }

    listPacketAttachments({
      entity_type: packetAttachmentTarget.entityType,
      entity_id: packetAttachmentTarget.entityId,
    })
      .then((attachments) => {
        if (active) {
          setLivePacketArtifacts(attachments.map(toLivePacketArtifactFromAttachment));
        }
      })
      .catch(() => {
        if (active) {
          setLivePacketArtifacts([]);
        }
      });

    return () => {
      active = false;
    };
  }, [packetAttachmentTarget]);

  function applyFiles(files: FileList | null) {
    const nextArtifacts = toArtifacts(files);
    setStagedFiles(files ? Array.from(files) : []);
    setPacketSyncError(null);
    setPacketSyncSummary(null);
    if (nextArtifacts.length > 0) {
      setDroppedArtifacts(nextArtifacts);
      const compareSourceId = findProgramReleaseCadSourceId(catalog, 'compare');
      if (compareSourceId && cadSourceId !== compareSourceId && nextArtifacts.some((artifact) => artifact.family !== 'Packet / business file')) {
        setCadSourceId(compareSourceId);
      }
    }
  }

  async function handlePacketSync() {
    if (stagedFiles.length === 0 || packetSyncLoading) {
      return;
    }

    setPacketSyncLoading(true);
    setPacketSyncError(null);
    setPacketSyncSummary(null);

    try {
      const syncedArtifacts: LivePacketArtifact[] = [];

      for (const file of stagedFiles) {
        const extension = file.name.includes('.') ? file.name.split('.').pop() ?? 'file' : 'file';
        const family = detectFamily(extension);
        const uploaded = await uploadPacketFile({
          content: await fileToBase64(file),
          original_name: file.name,
        });

        if (packetAttachmentTarget) {
          const attachment = await attachPacketFile({
            file_id: uploaded.file_id,
            entity_type: packetAttachmentTarget.entityType,
            entity_id: packetAttachmentTarget.entityId,
            attachment_type: inferAttachmentType(family),
            notes: `Release intake synced from Print to CNC (${sourceContext || 'manual release desk'})`,
          });
          syncedArtifacts.push(toLivePacketArtifactFromAttachment(attachment));
        } else {
          syncedArtifacts.push({
            id: uploaded.file_id,
            fileId: uploaded.file_id,
            name: uploaded.original_name,
            extension,
            family,
            status: 'stored',
            detail: 'Stored live with no canonical attachment target yet',
          });
        }
      }

      setLivePacketArtifacts((current) => mergeLivePacketArtifacts(current, syncedArtifacts));
      setPacketSyncSummary(
        packetAttachmentTarget
          ? `${syncedArtifacts.length} staged file${syncedArtifacts.length === 1 ? '' : 's'} synced and attached to ${packetAttachmentTarget.label}.`
          : `${syncedArtifacts.length} staged file${syncedArtifacts.length === 1 ? '' : 's'} synced to live storage. Open the release desk from a quote, job, or customer record to auto-attach them next time.`,
      );
    } catch (error) {
      setPacketSyncError(getErrorMessage(error, 'Live packet sync is unavailable right now. Staged intake remains available locally.'));
    } finally {
      setPacketSyncLoading(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    applyFiles(event.target.files);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    applyFiles(event.dataTransfer.files);
  }

  async function handleSaveMachineProfile() {
    if (!machineId || machineProfileSaveLoading || !operatingSystem.saveProgramReleaseMachineProfile) {
      return;
    }

    setMachineProfileSaveLoading(true);
    setMachineProfileSaveError(null);
    setMachineProfileSaveSummary(null);

    try {
      const savedProfile = await operatingSystem.saveProgramReleaseMachineProfile({
        userId: PROGRAM_RELEASE_DEFAULT_USER_ID,
        workspaceId: 'program-release',
        machineId,
        displayName: `${workspace?.selectedMachine.label ?? 'Machine'} Program Release default`,
        makeDefault: true,
      });

      if (!savedProfile) {
        throw new Error('Program Release did not return a saved machine profile.');
      }

      setDefaultMachineProfile(savedProfile);
      setMachineProfileSaveSummary(
        `Saved ${savedProfile.machineLabel} as the default Program Release machine profile.`,
      );
    } catch (error) {
      setMachineProfileSaveError(
        getErrorMessage(error, 'Could not save the current machine as the Program Release default.'),
      );
    } finally {
      setMachineProfileSaveLoading(false);
    }
  }

  const stagedArtifactSummary =
    droppedArtifacts.length > 0
      ? `${droppedArtifacts.length} files staged across ${new Set(droppedArtifacts.map((artifact) => artifact.family)).size} families`
      : 'Any file type accepted';

  const canSaveMachineProfile = Boolean(operatingSystem.saveProgramReleaseMachineProfile);
  const saveMachineProfileActionLabel =
    defaultMachineProfile?.machineId === machineId
      ? 'Refresh saved machine default'
      : 'Save current machine as default';

  useEffect(() => {
    if (!partClassId || !machineId || !toolholderId || !toolingPackageId || !fixtureId || !stockId || !cadSourceId) {
      setPurchaseRecommendations([]);
      return;
    }

    let active = true;
    operatingSystem
      .getProgramPurchaseRecommendations({
        partClassId,
        machineId,
        toolholderId,
        toolingPackageId,
        fixtureId,
        stockId,
        cadSourceId,
        selection,
      })
      .then((recommendations) => {
        if (active) {
          setPurchaseRecommendations(recommendations);
        }
      })
      .catch(() => {
        if (active) {
          setPurchaseRecommendations([]);
        }
      });

    return () => {
      active = false;
    };
  }, [cadSourceId, fixtureId, machineId, operatingSystem, partClassId, selection, stockId, toolholderId, toolingPackageId]);

  if (!catalog && catalogLoading) {
    return <LoadingState label="Syncing program release catalog..." />;
  }

  if (!catalog) {
    return <ErrorState message={catalogError ?? 'Program release catalog unavailable right now.'} onRetry={() => setCatalogReloadKey((current) => current + 1)} />;
  }

  if (!workspace && workspaceLoading) {
    return <LoadingState label="Building live program release workspace..." />;
  }

  if (!workspace) {
    return <ErrorState message={workspaceError ?? 'Program release workspace unavailable right now.'} onRetry={() => setWorkspaceReloadKey((current) => current + 1)} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Universal intake to release"
        title="Print to CNC"
        description="Use one desk for print intake, CAD/CAM source selection, setup-release planning, and quote posture. Drop any file type, compare CAD sources, or start the design brief inside Kienzle before the final programming packet is released."
        metrics={
          <>
            {workspace.metrics.map((metric) => (
              <SummaryTile key={metric.id} label={metric.label} value={metric.value} hint={metric.hint} accent={metric.accent} />
            ))}
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              This is the frontend anchor for the full drawing or CAD flow: intake, program posture, setup sheet, collision and simulation gates, and quote visibility all stay together instead of scattering across separate pages.
            </div>
            {sourceContext ? (
              <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
                <div className="font-semibold">{upstreamContextSummary}</div>
                {upstreamSourceLabel ? (
                  <div className="mt-2 text-slate-200">
                    Upstream commercial origin: <span className="font-semibold text-slate-50">{upstreamSourceLabel}</span>.
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={upstreamMessagesPath}
                    className="inline-flex items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-200/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-50 transition hover:border-cyan-200/36 hover:bg-cyan-200/18"
                  >
                    Open Messages follow-up
                  </Link>
                  <Link
                    to={upstreamJobsPath}
                    className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:border-white/24 hover:bg-white/[0.08]"
                  >
                    Open Jobs follow-up
                  </Link>
                </div>
              </div>
            ) : null}
            <div className="grid gap-3">
              <ActionButton onClick={() => setIntakeMode('dropbox')}>Stage universal intake</ActionButton>
              <ActionButton
                tone="emerald"
                onClick={() => {
                  setIntakeMode('design');
                  setCadSourceId((current) => findProgramReleaseCadSourceId(catalog, 'prism') || current);
                }}
              >
                Design in Kienzle
              </ActionButton>
              <Link
                to={capturePath}
                className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.12] px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.18]"
              >
                Open Capture Ops
              </Link>
              <Link
                to={shopFloorPath}
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.12] px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:border-emerald-300/32 hover:bg-emerald-300/[0.18]"
              >
                Open Shop Floor prove-out
              </Link>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current intake posture</div>
              <div className="mt-2 font-semibold text-slate-100">{stagedArtifactSummary}</div>
              <div className="mt-2 text-slate-400">Primary digital source: {workspace.selectedCadSource.label}</div>
            </div>
          </div>
        }
      />

      <SurfaceStatusNotice
        title="Release convergence"
        surfaces={['programRelease', 'commerce']}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          <PanelCard title="Universal intake" subtitle="Accept the job packet first, then decide whether this release should trust Fusion, neutral CAD, or a Kienzle-native design brief.">
            <div className="flex flex-wrap gap-2">
              <TabButton active={intakeMode === 'dropbox'} onClick={() => setIntakeMode('dropbox')}>
                Universal dropbox
              </TabButton>
              <TabButton
                active={intakeMode === 'design'}
                onClick={() => {
                  setIntakeMode('design');
                  setCadSourceId((current) => findProgramReleaseCadSourceId(catalog, 'prism') || current);
                }}
              >
                Design in Kienzle
              </TabButton>
            </div>

            {intakeMode === 'dropbox' ? (
              <div className="mt-5 space-y-5">
                <label
                  className="block cursor-pointer rounded-[28px] border border-dashed border-cyan-300/28 bg-cyan-300/[0.04] px-6 py-8 transition hover:border-cyan-300/42 hover:bg-cyan-300/[0.08]"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    multiple
                    aria-label="Universal intake file picker"
                    className="sr-only"
                    onChange={handleInputChange}
                  />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">Drop any file type</div>
                  <div className="mt-3 text-2xl font-semibold text-slate-50">
                    Drop prints, CAD, scans, certs, spreadsheets, or setup notes
                  </div>
                  <div className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                    This intake is intentionally broad. The frontend accepts any file type now so the job packet can be staged immediately, while live file storage can already capture and attach those artifacts when the release desk has canonical quote, job, or customer context.
                  </div>
                  <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-slate-100">
                    Browse files
                  </div>
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  {UNIVERSAL_FILE_FAMILIES.map((family) => (
                    <div key={family.title} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{family.title}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {family.items.map((item) => (
                          <span key={item} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Staged artifacts</div>
                      <div className="mt-2 text-sm text-slate-400">Every staged file stays visible so intake never blocks on extension support.</div>
                    </div>
                    <StatusPill label={stagedArtifactSummary} tone={droppedArtifacts.length > 0 ? 'emerald' : 'slate'} />
                  </div>
                  <div className="mt-4 space-y-3">
                    {droppedArtifacts.length > 0 ? (
                      droppedArtifacts.map((artifact) => (
                        <div key={artifact.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-slate-950/60 px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-100">{artifact.name}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{artifact.family}</div>
                          </div>
                          <StatusPill label={`.${artifact.extension}`} tone="sky" />
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[20px] border border-dashed border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
                        No files staged yet. The desk is ready for prints, CAD, certs, spreadsheets, photos, and any other job packet files.
                      </div>
                    )}
                  </div>
                  <div className="mt-4 rounded-[20px] border border-cyan-300/14 bg-cyan-300/[0.06] px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-2xl">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">Live packet sync</div>
                        <div className="mt-2 text-sm text-slate-200">
                          {packetAttachmentTarget
                            ? `Store staged files in backend file storage and attach them directly to ${packetAttachmentTarget.label}.`
                            : 'Store staged files in backend file storage now. Open the release desk from a quote, job, or customer record to auto-attach them to a canonical entity.'}
                        </div>
                        {packetSyncSummary ? <div className="mt-2 text-sm text-emerald-300">{packetSyncSummary}</div> : null}
                        {packetSyncError ? <div className="mt-2 text-sm text-rose-300">{packetSyncError}</div> : null}
                      </div>
                      <ActionButton disabled={droppedArtifacts.length === 0 || packetSyncLoading} onClick={handlePacketSync}>
                        {packetSyncLoading ? 'Syncing live packet...' : 'Sync staged files to live packet'}
                      </ActionButton>
                    </div>
                  </div>
                  {livePacketArtifacts.length > 0 ? (
                    <div className="mt-4 rounded-[20px] border border-white/8 bg-slate-950/50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Live packet ledger</div>
                          <div className="mt-2 text-sm text-slate-400">Persisted file storage and attachment state for the current release context.</div>
                        </div>
                        <StatusPill label={`${livePacketArtifacts.length} live file${livePacketArtifacts.length === 1 ? '' : 's'}`} tone="sky" />
                      </div>
                      <div className="mt-4 space-y-3">
                        {livePacketArtifacts.map((artifact) => (
                          <div key={artifact.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-100">{artifact.name}</div>
                              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{artifact.detail}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusPill label={`.${artifact.extension}`} tone="slate" />
                              <StatusPill label={artifact.status === 'attached' ? 'Attached live' : 'Stored live'} tone={artifact.status === 'attached' ? 'emerald' : 'sky'} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[22px] border border-cyan-300/16 bg-cyan-300/10 px-4 py-4 text-sm leading-6 text-cyan-50">
                  Need setup photos, print snapshots, machine-floor mapping, or sound and video evidence for prove-out? Capture Ops keeps that media flowing into the same release packet posture instead of losing it in separate tools.
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Part / concept name">
                    <Input
                      value={designBrief.partName}
                      onChange={(event) => setDesignBrief((current) => ({ ...current, partName: event.target.value }))}
                    />
                  </Field>
                  <Field label="Envelope">
                    <Input
                      value={designBrief.envelope}
                      onChange={(event) => setDesignBrief((current) => ({ ...current, envelope: event.target.value }))}
                    />
                  </Field>
                  <Field label="Feature intent">
                    <Input
                      value={designBrief.features}
                      onChange={(event) => setDesignBrief((current) => ({ ...current, features: event.target.value }))}
                    />
                  </Field>
                  <Field label="Tolerance / simulation note">
                    <Input
                      value={designBrief.tolerance}
                      onChange={(event) => setDesignBrief((current) => ({ ...current, tolerance: event.target.value }))}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {PRISM_DESIGN_PATHS.map((path) => (
                    <div key={path.title} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="text-sm font-semibold text-slate-100">{path.title}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">{path.detail}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[22px] border border-emerald-300/14 bg-emerald-300/[0.06] px-4 py-4 text-sm leading-6 text-emerald-50">
                  Kienzle-native design entry is live as a structured design brief now. The next backend handoff should turn this into revision-aware geometry generation, compare passes, and simulation packets without changing the page contract.
                </div>
              </div>
            )}
          </PanelCard>

          <PanelCard title="Release plan" subtitle="Keep machine, holder, tooling, fixture, stock, and digital-source assumptions visible before the program is trusted.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Part class">
                <Select aria-label="Part class" value={partClassId} onChange={(event) => setPartClassId(event.target.value)}>
                  {catalog.partClasses.map((partClass) => (
                    <option key={partClass.id} value={partClass.id}>{partClass.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Machine">
                <Select aria-label="Machine" value={machineId} onChange={(event) => setMachineId(event.target.value)}>
                  {catalog.machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>{machine.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="CAD source">
                <Select aria-label="CAD source" value={cadSourceId} onChange={(event) => setCadSourceId(event.target.value)}>
                  {catalog.cadSources.map((source) => (
                    <option key={source.id} value={source.id}>{source.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Tool holder">
                <Select aria-label="Tool holder" value={toolholderId} onChange={(event) => setToolholderId(event.target.value)}>
                  {catalog.toolholders.map((holder) => (
                    <option key={holder.id} value={holder.id}>{holder.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Tooling package">
                <Select aria-label="Tooling package" value={toolingPackageId} onChange={(event) => setToolingPackageId(event.target.value)}>
                  {catalog.toolingPackages.map((toolingPackage) => (
                    <option key={toolingPackage.id} value={toolingPackage.id}>{toolingPackage.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Fixture / workholding">
                <Select aria-label="Fixture / workholding" value={fixtureId} onChange={(event) => setFixtureId(event.target.value)}>
                  {catalog.fixtures.map((fixture) => (
                    <option key={fixture.id} value={fixture.id}>{fixture.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Stock">
                <Select aria-label="Stock" value={stockId} onChange={(event) => setStockId(event.target.value)}>
                  {catalog.stockProfiles.map((stock) => (
                    <option key={stock.id} value={stock.id}>{stock.label}</option>
                  ))}
                </Select>
              </Field>
            </div>

            {programmingMode === 'lathe' && (
              <div className="mt-5 rounded-[22px] border border-amber-300/14 bg-amber-300/[0.05] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100 mb-3">Lathe setup parameters</div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Chuck jaw config">
                    <Select aria-label="Chuck jaw config" value={chuckJawConfig} onChange={(event) => setChuckJawConfig(event.target.value as typeof chuckJawConfig)}>
                      <option value="soft">Soft jaws</option>
                      <option value="hard">Hard jaws</option>
                      <option value="collet">Collet</option>
                      <option value="custom">Custom fixture</option>
                    </Select>
                  </Field>
                  <Field label="Tailstock quill">
                    <Select aria-label="Tailstock quill" value={tailstockQuill} onChange={(event) => setTailstockQuill(event.target.value as typeof tailstockQuill)}>
                      <option value="not_used">Not used</option>
                      <option value="extended">Extended (live center)</option>
                      <option value="retracted">Retracted</option>
                    </Select>
                  </Field>
                  <Field label="Bar pull">
                    <Select aria-label="Bar pull" value={barPullEnabled ? 'enabled' : 'disabled'} onChange={(event) => setBarPullEnabled(event.target.value === 'enabled')}>
                      <option value="disabled">Disabled</option>
                      <option value="enabled">Enabled (bar feeder)</option>
                    </Select>
                  </Field>
                  <Field label="Live tooling">
                    <Select aria-label="Live tooling" value={liveToolState} onChange={(event) => setLiveToolState(event.target.value as typeof liveToolState)}>
                      <option value="not_equipped">Not equipped</option>
                      <option value="inactive">Equipped - inactive</option>
                      <option value="active">Active (milling/drilling)</option>
                    </Select>
                  </Field>
                </div>
              </div>
            )}

            {selectorAuthority ? (
              <div className="mt-5 rounded-[22px] border border-emerald-300/14 bg-emerald-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-300">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">Selector authority</div>
                <div className="mt-2">{selectorAuthority.authorityNote}</div>
              </div>
            ) : null}

            {programmingAuthority ? (
              <div className="mt-5 rounded-[22px] border border-violet-300/14 bg-violet-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-300">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100">Programming authority</div>
                  <StatusPill label={programmingAuthority.badge} tone={programmingAuthorityTone(programmingAuthority.posture)} />
                </div>
                <div className="mt-2">{programmingAuthority.note}</div>
              </div>
            ) : null}

            {defaultMachineProfile ? (
              <div className="mt-5 rounded-[22px] border border-cyan-300/16 bg-cyan-300/[0.06] px-4 py-4 text-sm leading-6 text-slate-300">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">Saved machine profile</div>
                <div className="mt-2 font-semibold text-slate-100">
                  {defaultMachineProfile.displayName} · {defaultMachineProfile.machineLabel}
                </div>
                <div className="mt-2 text-slate-400">
                  Preferred controller {defaultMachineProfile.selectedControllerId} · spindle {defaultMachineProfile.selectedSpindlePackageId}
                </div>
                {!routeSelection.machineId ? (
                  <div className="mt-3 text-cyan-50">
                    This saved machine default is being used because the incoming route did not force a machine selection.
                  </div>
                ) : (
                  <div className="mt-3 text-slate-400">
                    A route-specific machine selection is overriding the saved default for this session.
                  </div>
                )}
              </div>
            ) : null}

            {canSaveMachineProfile ? (
              <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-2xl">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Machine profile memory</div>
                    <div className="mt-2 text-slate-200">
                      Save the current machine selection as the default Program Release machine so future sessions and downstream handoffs start from the same canonical package.
                    </div>
                    {machineProfileSaveSummary ? <div className="mt-2 text-emerald-300">{machineProfileSaveSummary}</div> : null}
                    {machineProfileSaveError ? <div className="mt-2 text-rose-300">{machineProfileSaveError}</div> : null}
                  </div>
                  <ActionButton disabled={machineProfileSaveLoading} onClick={handleSaveMachineProfile}>
                    {machineProfileSaveLoading ? 'Saving machine default...' : saveMachineProfileActionLabel}
                  </ActionButton>
                </div>
              </div>
            ) : null}

            <div className={`mt-5 grid gap-3 ${programmingAuthority ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Machine posture</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{workspace.selectedMachine.label}</div>
                <div className="mt-2 text-sm text-slate-400">{workspace.selectedMachine.kinematics} · {workspace.selectedMachine.controller}</div>
                <div className="mt-3 text-sm leading-6 text-slate-300">{workspace.selectedMachine.strength}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Digital source posture</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="text-lg font-semibold text-slate-50">{workspace.selectedCadSource.label}</div>
                  <StatusPill label={workspace.selectedCadSource.status} tone={workspace.selectedCadSource.status === 'preferred' ? 'emerald' : workspace.selectedCadSource.status === 'compare' ? 'amber' : 'rose'} />
                </div>
                <div className="mt-2 text-sm text-slate-400">{workspace.selectedCadSource.simulationReadiness}</div>
                <div className="mt-3 text-sm leading-6 text-slate-300">{workspace.selectedCadSource.note}</div>
              </div>
              {programmingAuthority ? (
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Programming posture</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="text-lg font-semibold text-slate-50">
                      {programmingAuthority.environmentLabel ?? programmingAuthority.badge}
                    </div>
                    <StatusPill label={programmingAuthority.posture} tone={programmingAuthorityTone(programmingAuthority.posture)} />
                  </div>
                  <div className="mt-2 text-sm text-slate-400">{programmingAuthority.summary}</div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">
                    {[programmingAuthority.licenseLabel, programmingAuthority.toolpathLabel ?? programmingAuthority.toolpathTypeLabel]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
              ) : null}
            </div>

            {toolpathRouteAuthority?.unsupportedReason ? (
              <div className="mt-4 rounded-[22px] border border-amber-300/14 bg-amber-300/[0.05] px-4 py-4 text-sm leading-6 text-amber-50">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">Toolpath Advisor</div>
                <div className="mt-2">{toolpathRouteAuthority.unsupportedReason}</div>
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border border-cyan-300/14 bg-cyan-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-300">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-2xl">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">Toolpath Advisor</div>
                    <div className="mt-2 text-slate-200">
                      Carry this exact release spine into Toolpath Advisor so machine, holder, tooling, and stock posture stay aligned while strategies are compared.
                    </div>
                    {toolpathRouteAuthority ? (
                      <div className="mt-2 text-slate-400">{toolpathRouteAuthority.releaseContext.authorityNote}</div>
                    ) : null}
                  </div>
                  <Link
                    to={toolpathAdvisorPath}
                    className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.12] px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.18]"
                  >
                    Open Toolpath Advisor
                  </Link>
                </div>
              </div>
            )}
          </PanelCard>

          <PanelCard title="Order of operations and setup sheet" subtitle="Release posture should read like a programmer and setup person can act on it immediately.">
            <div className="space-y-4">
              {workspace.operationPlan.map((operation) => (
                <div key={operation.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{operation.code}</div>
                      <div className="mt-2 text-lg font-semibold text-slate-50">{operation.title}</div>
                      <div className="mt-1 text-sm text-slate-400">{operation.strategy} · {operation.machineMode}</div>
                    </div>
                    <StatusPill label={`${operation.cycleMinutes.toFixed(0)} min`} tone="sky" />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[20px] border border-white/8 bg-slate-950/50 px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tooling</div>
                      <div className="mt-2 text-sm text-slate-200">{workspace.selectedToolingPackage.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{workspace.selectedToolholder.label}</div>
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-slate-950/50 px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Speeds and feeds</div>
                      <div className="mt-2 text-sm text-slate-200">{operation.spindleRpm.toLocaleString()} rpm</div>
                      <div className="mt-1 text-xs text-slate-500">{operation.feedRate} · {operation.doc} · {operation.stepOver}</div>
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-slate-950/50 px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Verification posture</div>
                      <div className="mt-2 text-sm text-slate-200">{operation.rapidPosture}</div>
                      <div className="mt-1 text-xs text-slate-500">{operation.collisionPosture}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {workspace.setupSheet.map((section) => (
                <div key={section.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-sm font-semibold text-slate-100">{section.title}</div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard
            title="Release review"
            subtitle="Use one review deck for simulation gates, DFM/GD&T posture, and digital-source comparison before the program packet is trusted."
          >
            <div className="flex flex-wrap gap-2">
              <TabButton active={reviewTab === 'gates'} onClick={() => setReviewTab('gates')}>
                Simulation gates
              </TabButton>
              <TabButton active={reviewTab === 'dfm'} onClick={() => setReviewTab('dfm')}>
                DFM + GD&amp;T
              </TabButton>
              <TabButton active={reviewTab === 'compare'} onClick={() => setReviewTab('compare')}>
                Source compare
              </TabButton>
            </div>

            <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review summary</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">{workspace.reviewSummary}</div>
            </div>

            {reviewTab === 'gates' ? (
              <div className="mt-5 space-y-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Collision review</div>
                  <div className="mt-3 space-y-3">
                    {workspace.collisionChecks.map((check) => (
                      <div key={check.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-100">{check.label}</div>
                          <StatusPill label={check.status} tone={statusTone(check.status)} />
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">{check.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Simulation and release review</div>
                  <div className="mt-3 space-y-3">
                    {workspace.simulationChecks.map((check) => (
                      <div key={check.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-100">{check.label}</div>
                          <StatusPill label={check.status} tone={statusTone(check.status)} />
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">{check.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-slate-950/60 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Program preview</div>
                  <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{workspace.programPreview}</pre>
                </div>
              </div>
            ) : null}

            {reviewTab === 'dfm' ? (
              <div className="mt-5 space-y-5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">DFM findings</div>
                  <div className="mt-3 space-y-3">
                    {workspace.dfmFindings.map((finding) => (
                      <div key={finding.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-100">{finding.title}</div>
                            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {finding.area} · {finding.source}
                            </div>
                          </div>
                          <StatusPill label={finding.severity} tone={findingTone(finding.severity)} />
                        </div>
                        <div className="mt-3 text-sm leading-6 text-slate-300">{finding.detail}</div>
                        <div className="mt-3 rounded-[18px] border border-white/8 bg-slate-950/50 px-3 py-3 text-sm leading-6 text-slate-400">
                          <span className="font-semibold text-slate-200">Action:</span> {finding.action}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Datum and GD&amp;T focus</div>
                  <div className="mt-3 space-y-3">
                    {workspace.gdtFocuses.map((focus) => (
                      <div key={focus.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-100">{focus.label}</div>
                            <div className="mt-2 text-sm leading-6 text-slate-300">{focus.requirement}</div>
                          </div>
                          <div className="text-right">
                            <StatusPill label={focus.status} tone={statusTone(focus.status)} />
                            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{focus.owner}</div>
                          </div>
                        </div>
                        <div className="mt-3 text-sm leading-6 text-slate-400">{focus.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {reviewTab === 'compare' ? (
              <div className="mt-5 space-y-4">
                {workspace.sourceComparisons.map((source) => (
                  <div key={source.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-slate-100">{source.label}</div>
                          {source.recommended ? <StatusPill label="Recommended route" tone="emerald" /> : null}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">{source.note}</div>
                      </div>
                      <StatusPill label={source.status} tone={sourceTone(source.status)} />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[18px] border border-white/8 bg-slate-950/50 px-3 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Geometry trust</div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{source.geometryTrust}</div>
                      </div>
                      <div className="rounded-[18px] border border-white/8 bg-slate-950/50 px-3 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Setup generation</div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{source.setupGeneration}</div>
                      </div>
                      <div className="rounded-[18px] border border-white/8 bg-slate-950/50 px-3 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Simulation trust</div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{source.simulationTrust}</div>
                      </div>
                      <div className="rounded-[18px] border border-white/8 bg-slate-950/50 px-3 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Release posture</div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{source.releasePosture}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </PanelCard>

          <PanelCard title="Quote and handoff posture" subtitle="Keep commercial impact and release actions visible while the backend live contracts are still landing.">
            <div className="space-y-3">
              {workspace.quoteLines.map((line) => (
                <div key={line.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{line.label}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-400">{line.detail}</div>
                    </div>
                    <StatusPill label={line.value} tone={line.tone} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Quote summary</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">{workspace.quotingSummary}</div>
            </div>

            <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Integration notes</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                {workspace.integrationNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>

            <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Release actions</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                {workspace.handoffActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>

            {workspace.alerts.length > 0 ? (
              <div className="mt-5 rounded-[22px] border border-amber-300/16 bg-amber-300/[0.08] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-50">Review alerts</div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-100">
                  {workspace.alerts.map((alert) => (
                    <li key={alert}>{alert}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </PanelCard>

          <PanelCard title="Buy to improve this release" subtitle="Recommended tooling, fixturing, coolant, and stock-support buys should stay one click away from the release desk with ROI and distributor context.">
            <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] px-4 py-4 text-sm leading-6 text-slate-300">
              Current sourcing posture: <span className="font-semibold text-slate-100">{selection.unitSystem === 'inch' ? 'Inch-first' : 'Metric-first'}</span>{' '}
              values, <span className="font-semibold text-slate-100">{selection.regionId.replace(/-/g, ' ')}</span> local distributor bias, and{' '}
              <span className="font-semibold text-slate-100">{selection.addOnIds.length}</span> active add-on{selection.addOnIds.length === 1 ? '' : 's'}.
            </div>

            <div className="mt-5 space-y-3">
              {purchaseRecommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{recommendation.title}</div>
                      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{recommendation.category}</div>
                    </div>
                    <StatusPill label={recommendation.roiStrength} tone="emerald" />
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">{recommendation.detail}</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-white/8 bg-slate-950/50 px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Estimated price</div>
                      <div className="mt-2 text-sm font-semibold text-slate-100">{recommendation.estimatedPrice}</div>
                    </div>
                    <div className="rounded-[18px] border border-white/8 bg-slate-950/50 px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Payback</div>
                      <div className="mt-2 text-sm font-semibold text-slate-100">{recommendation.payback}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-400">{recommendation.whyNow}</div>
                  <button
                    type="button"
                    onClick={() => setPurchaseTarget(recommendation)}
                    className="mt-4 inline-flex rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    Buy {recommendation.title}
                  </button>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>

      <PurchaseRecommendationModal recommendation={purchaseTarget} onClose={() => setPurchaseTarget(null)} />
    </div>
  );
}
