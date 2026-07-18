/**
 * WireEdmWizardPage — Wire EDM Planning Wizard
 * U-P2PFS29: DXF upload + geometry parsing integration
 * U-P2PFS30: AI-recommended material dropdown with skim pass suggestions
 * U-P2PFS31: Tribal tip panel filtered by material + thickness
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  solveWireEdmWizard,
  wireEdmParseGeometry,
  tribalSearch,
  wedmSafetyEnvelope,
  wedmAutonomyStatus,
  wedmRulStatus,
  wedmMaintenanceStatus,
  wedmCodePreview,
  wedmApprovalStatus,
  wedmRequestApproval,
  type TribalTip,
  type WedmSafetyEnvelopeStatus,
  type WedmAutonomyStatus,
  type WedmRulStatus,
  type WedmMaintenanceStatus,
  type WedmCodePreviewResult,
  type WedmApprovalStatus,
} from '../api/client';
import { wedmErpApi } from '../api/wedmErp';
import { WorkspaceRecoveryScaffold } from '../components/workspace/WorkspaceRecoveryScaffold';
import { GatedError } from '../components/entitlement';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';
import {
  asRecord,
  errorMessage,
  formatJsonPreview,
  payloadOf,
} from './recovery/recoveryUtils';

// ============================================================================
// MATERIAL CONSTANTS — sourced from wedm-constants.ts and constants.ts
// ============================================================================

interface MaterialOption {
  value: string;
  label: string;
  category: string;
  skimPasses: { standard: number; fine: number };
  rho: number; // Ra reduction factor per skim pass
  notes?: string;
}

/**
 * Material options with AI-recommended skim pass counts based on:
 * - Klocke 2013 §8.3 Ra cascade model: Ra_n = Ra_0 × rho^(n-1)
 * - Standard: Ra ~1.0-1.5 µm target
 * - Fine: Ra ~0.4-0.6 µm target
 */
const MATERIAL_OPTIONS: MaterialOption[] = [
  // Tool Steels (most common at JM Die)
  { value: 'A2 Tool Steel', label: 'A2 Tool Steel', category: 'Tool Steel', skimPasses: { standard: 2, fine: 4 }, rho: 0.55 },
  { value: 'D2 Tool Steel', label: 'D2 Tool Steel', category: 'Tool Steel', skimPasses: { standard: 2, fine: 4 }, rho: 0.55 },
  { value: 'M2 Tool Steel', label: 'M2 Tool Steel', category: 'Tool Steel', skimPasses: { standard: 2, fine: 4 }, rho: 0.55 },
  { value: 'S7 Tool Steel', label: 'S7 Tool Steel', category: 'Tool Steel', skimPasses: { standard: 2, fine: 4 }, rho: 0.55 },
  { value: 'H13 Tool Steel', label: 'H13 Tool Steel', category: 'Tool Steel', skimPasses: { standard: 2, fine: 4 }, rho: 0.55 },
  { value: 'O1 Tool Steel', label: 'O1 Tool Steel', category: 'Tool Steel', skimPasses: { standard: 2, fine: 3 }, rho: 0.55 },
  // Carbon/Alloy Steels
  { value: '1045 Steel', label: '1045 Steel', category: 'Carbon Steel', skimPasses: { standard: 2, fine: 3 }, rho: 0.55 },
  { value: '4140 Steel', label: '4140 Steel', category: 'Alloy Steel', skimPasses: { standard: 2, fine: 3 }, rho: 0.55 },
  { value: '4340 Steel', label: '4340 Steel', category: 'Alloy Steel', skimPasses: { standard: 2, fine: 4 }, rho: 0.55 },
  // Stainless
  { value: '304 Stainless', label: '304 Stainless', category: 'Stainless Steel', skimPasses: { standard: 3, fine: 5 }, rho: 0.60 },
  { value: '316 Stainless', label: '316 Stainless', category: 'Stainless Steel', skimPasses: { standard: 3, fine: 5 }, rho: 0.60 },
  { value: '17-4 PH', label: '17-4 PH', category: 'Stainless Steel', skimPasses: { standard: 3, fine: 5 }, rho: 0.60 },
  // Carbide
  { value: 'Tungsten Carbide', label: 'Tungsten Carbide', category: 'Carbide', skimPasses: { standard: 3, fine: 6 }, rho: 0.65, notes: 'Slow cutting, excellent finish' },
  { value: 'Carbide K20', label: 'Carbide K20', category: 'Carbide', skimPasses: { standard: 3, fine: 5 }, rho: 0.65 },
  // Aluminum
  { value: '6061 Aluminum', label: '6061 Aluminum', category: 'Aluminum', skimPasses: { standard: 1, fine: 2 }, rho: 0.50, notes: 'Fast cutting' },
  { value: '7075 Aluminum', label: '7075 Aluminum', category: 'Aluminum', skimPasses: { standard: 1, fine: 2 }, rho: 0.50 },
  // Copper/Brass
  { value: 'Copper C110', label: 'Copper C110', category: 'Copper', skimPasses: { standard: 2, fine: 3 }, rho: 0.52 },
  { value: 'Brass 360', label: 'Brass 360', category: 'Brass', skimPasses: { standard: 2, fine: 3 }, rho: 0.52 },
  // Superalloys
  { value: 'Inconel 718', label: 'Inconel 718', category: 'Superalloy', skimPasses: { standard: 4, fine: 6 }, rho: 0.68, notes: 'Very slow, high wear' },
  { value: 'Ti-6Al-4V', label: 'Ti-6Al-4V', category: 'Titanium', skimPasses: { standard: 3, fine: 5 }, rho: 0.62 },
  // Graphite (for EDM electrodes)
  { value: 'Graphite', label: 'Graphite', category: 'Graphite', skimPasses: { standard: 1, fine: 2 }, rho: 0.45, notes: 'Electrode material' },
];

const MATERIAL_CATEGORIES = [...new Set(MATERIAL_OPTIONS.map(m => m.category))];

function findMaterialOption(value: string): MaterialOption | undefined {
  return MATERIAL_OPTIONS.find(m => m.value.toLowerCase() === value.toLowerCase());
}

// ============================================================================
// TYPES
// ============================================================================

type WireEdmWizardLocationState = {
  sourceLabel?: string;
  materialName?: string;
  stockThicknessMm?: number;
  notes?: string;
  geometry?: GeometryParseResult;
  workspaceContext?: {
    machineLabel?: string;
    controllerLabel?: string;
    packetId?: string;
    focusId?: string;
  };
};

interface ContourData {
  id: string;
  is_closed: boolean;
  perimeter_mm: number;
  area_mm2?: number;
  corner_count?: number;
  min_radius_mm?: number;
}

interface BoundingBox {
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
}

interface GeometryParseResult {
  contours: ContourData[];
  bounding_box: BoundingBox;
  total_perimeter_mm: number;
  total_area_mm2?: number;
  detected_features?: string[];
  warnings?: string[];
}

function formatWizardThickness(value: number | undefined, fallback: string) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : fallback;
}

export function WireEdmWizardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const launchState = (location.state as WireEdmWizardLocationState | null) ?? null;
  const launchMachineLabel = launchState?.workspaceContext?.machineLabel;
  const launchControllerLabel = launchState?.workspaceContext?.controllerLabel;

  // Form state
  const [material, setMaterial] = useState(() => launchState?.materialName ?? 'A2 Tool Steel');
  const [thickness, setThickness] = useState(() => formatWizardThickness(launchState?.stockThicknessMm, '2.5'));
  const [quantity, setQuantity] = useState('1');
  const [tolerance, setTolerance] = useState('0.0005');
  const [notes, setNotes] = useState(() => {
    const seededNotes = [launchState?.notes];
    if (launchMachineLabel) seededNotes.push(`Launch machine: ${launchMachineLabel}.`);
    if (launchControllerLabel) seededNotes.push(`Controller: ${launchControllerLabel}.`);
    return seededNotes.filter(Boolean).join(' ');
  });

  // DXF upload state
  const [dxfFile, setDxfFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [geometry, setGeometry] = useState<GeometryParseResult | null>(
    () => launchState?.geometry ?? null
  );
  const [parseError, setParseError] = useState<string | null>(null);

  // Solve state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateError, setGateError] = useState<unknown>(null);
  const [solution, setSolution] = useState<Record<string, unknown> | null>(null);

  // Tribal tips state (U-P2PFS31)
  const [tribalTips, setTribalTips] = useState<TribalTip[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);

  // Safety envelope + autonomy state (U-P2PFS32)
  const [safetyStatus, setSafetyStatus] = useState<WedmSafetyEnvelopeStatus | null>(null);
  const [autonomyStatus, setAutonomyStatus] = useState<WedmAutonomyStatus | null>(null);

  // RUL + maintenance state (U-P2PFS33)
  const [rulStatus, setRulStatus] = useState<WedmRulStatus | null>(null);
  const [maintenanceStatus, setMaintenanceStatus] = useState<WedmMaintenanceStatus | null>(null);

  // Controller code preview state (U-P2PFS34)
  const [codePreview, setCodePreview] = useState<WedmCodePreviewResult | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  // ERP state (U-P2PFS35)
  interface QuantityBreak {
    quantity: number;
    unit_price: number;
    total_price: number;
    savings_pct_vs_qty1: number;
  }
  const [quantityBreaks, setQuantityBreaks] = useState<QuantityBreak[]>([]);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [jobLoading, setJobLoading] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [erpError, setErpError] = useState<string | null>(null);

  // Operator approval state (U-P2PFS36)
  const [approvalStatus, setApprovalStatus] = useState<WedmApprovalStatus | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);

  // --------------------------------------------------------------------------
  // Safety Envelope + Autonomy + RUL + Maintenance Loading (U-P2PFS32, U-P2PFS33)
  // --------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadLiveStatus() {
      try {
        const [safetyResult, autonomyResult, rulResult, maintenanceResult] = await Promise.all([
          wedmSafetyEnvelope(),
          wedmAutonomyStatus(),
          wedmRulStatus(),
          wedmMaintenanceStatus(),
        ]);
        if (!cancelled) {
          setSafetyStatus(safetyResult.data ?? null);
          setAutonomyStatus(autonomyResult.data ?? null);
          setRulStatus(rulResult.data ?? null);
          setMaintenanceStatus(maintenanceResult.data ?? null);
        }
      } catch {
        // Silent fail — indicators show "loading" state
      }
    }

    void loadLiveStatus();
    // Refresh every 30 seconds
    const interval = setInterval(() => void loadLiveStatus(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // --------------------------------------------------------------------------
  // Tribal Tip Loading (U-P2PFS31)
  // --------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadTips() {
      setTipsLoading(true);
      try {
        const thicknessNum = parseFloat(thickness);
        const result = await tribalSearch({
          material,
          operation: 'wedm',
          query: !isNaN(thicknessNum) && thicknessNum > 50 ? 'thick section' : undefined,
          limit: 5,
        });
        if (!cancelled) {
          setTribalTips(result.tips);
        }
      } catch {
        if (!cancelled) {
          setTribalTips([]);
        }
      } finally {
        if (!cancelled) {
          setTipsLoading(false);
        }
      }
    }

    void loadTips();
    return () => { cancelled = true; };
  }, [material, thickness]);

  // --------------------------------------------------------------------------
  // Code Preview Loading (U-P2PFS34)
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!solution) {
      setCodePreview(null);
      return;
    }

    let cancelled = false;

    async function loadCodePreview() {
      setCodeLoading(true);
      try {
        const result = await wedmCodePreview({
          material,
          thickness_mm: Number(thickness) || 2.5,
          cutting_speed_mm_min: (solution as Record<string, unknown>).cutting_speed_mm_min as number,
          peak_current_A: (solution as Record<string, unknown>).peak_current_A as number,
          pulse_on_us: (solution as Record<string, unknown>).pulse_on_us as number,
          pulse_off_us: (solution as Record<string, unknown>).pulse_off_us as number,
          wire_tension_N: (solution as Record<string, unknown>).wire_tension_N as number,
          servo_voltage_V: (solution as Record<string, unknown>).servo_voltage_V as number,
          passes: (solution as Record<string, unknown>).passes as Array<{ type: string; offset_mm: number }>,
        });
        if (!cancelled && result.data) {
          setCodePreview(result.data);
        }
      } catch {
        if (!cancelled) {
          setCodePreview(null);
        }
      } finally {
        if (!cancelled) {
          setCodeLoading(false);
        }
      }
    }

    void loadCodePreview();
    return () => { cancelled = true; };
  }, [solution, material, thickness]);

  // --------------------------------------------------------------------------
  // ERP Handlers (U-P2PFS35)
  // --------------------------------------------------------------------------

  const handleCreateQuote = useCallback(async () => {
    if (!solution || !geometry) return;

    setQuoteLoading(true);
    setErpError(null);
    try {
      // Get estimate
      const estimateResult = await wedmErpApi.estimate({
        material,
        perimeter_mm: geometry.total_perimeter_mm,
        thickness_mm: Number(thickness) || 2.5,
        pass_count: ((solution as Record<string, unknown>).passes as unknown[])?.length || 3,
        quantity: Number(quantity) || 1,
      });

      if (!estimateResult.ok || !estimateResult.data) {
        setErpError(estimateResult.error || 'Failed to create estimate');
        return;
      }

      // Get quantity breaks
      const breaksResult = await wedmErpApi.quantityBreaks({
        cost_estimate: estimateResult.data.cost_estimate,
        quantities: [1, 5, 10, 25, 50, 100],
      });

      if (breaksResult.ok && breaksResult.data?.quantity_breaks) {
        setQuantityBreaks(breaksResult.data.quantity_breaks);
      }
    } catch (err) {
      setErpError(err instanceof Error ? err.message : 'Quote creation failed');
    } finally {
      setQuoteLoading(false);
    }
  }, [solution, geometry, material, thickness, quantity]);

  const handlePushToJob = useCallback(async () => {
    if (!solution) return;

    setJobLoading(true);
    setErpError(null);
    try {
      const result = await wedmErpApi.jobCreate({
        program_result: solution,
        options: {
          material,
          thickness_mm: Number(thickness) || 2.5,
          quantity: Number(quantity) || 1,
          geometry_perimeter_mm: geometry?.total_perimeter_mm,
        },
      });

      if (result.ok && result.data?.job?.jobId) {
        setCreatedJobId(result.data.job.jobId);
      } else {
        setErpError(result.error || 'Failed to create job');
      }
    } catch (err) {
      setErpError(err instanceof Error ? err.message : 'Job creation failed');
    } finally {
      setJobLoading(false);
    }
  }, [solution, material, thickness, quantity, geometry]);

  // --------------------------------------------------------------------------
  // Approval Handlers (U-P2PFS36)
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!solution) return;
    let cancelled = false;

    async function checkApproval() {
      try {
        const result = await wedmApprovalStatus();
        // PrismResponse uses `.result` not `.data` (see api/types.ts:7).
        if (!cancelled && result.result) {
          setApprovalStatus(result.result);
        }
      } catch {
        // Default to requiring approval — shape matches WedmApprovalStatus + extras
        // (approved/requires_approval are extra fields per the [key: string]: unknown signature).
        if (!cancelled) {
          setApprovalStatus({ status: 'pending', approved: false, requires_approval: true });
        }
      }
    }

    void checkApproval();
    return () => { cancelled = true; };
  }, [solution]);

  const handleRequestApproval = useCallback(async () => {
    setApprovalLoading(true);
    try {
      const result = await wedmRequestApproval({
        reason: `Wire EDM job for ${material}, ${thickness}mm thickness`,
      });
      // PrismResponse uses `.result` not `.data` (see api/types.ts:7).
      if (result.result) {
        setApprovalStatus(result.result);
      }
    } catch {
      setErpError('Failed to request approval');
    } finally {
      setApprovalLoading(false);
    }
  }, [material, thickness]);

  const handleOpenInStudio = useCallback(() => {
    navigate('/wire-edm/studio', {
      state: {
        fromWizard: true,
        material,
        thickness_mm: Number(thickness) || 2.5,
        quantity: Number(quantity) || 1,
        tolerance,
        geometry,
        solution,
        codePreview,
        safetyStatus,
        autonomyStatus,
      },
    });
  }, [navigate, material, thickness, quantity, tolerance, geometry, solution, codePreview, safetyStatus, autonomyStatus]);

  // --------------------------------------------------------------------------
  // DXF Upload Handlers
  // --------------------------------------------------------------------------

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      void handleFile(files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      void handleFile(files[0]);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const validExtensions = ['.dxf', '.dwg', '.svg'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(ext)) {
      setParseError(`Invalid file type: ${ext}. Supported: DXF, DWG, SVG`);
      return;
    }

    setDxfFile(file);
    setParseError(null);
    setParsing(true);

    try {
      const fileContent = await file.text();
      const response = await wireEdmParseGeometry({
        file_name: file.name,
        file_data: btoa(fileContent),
        content: fileContent,
      });

      // Double-cast: wireEdmParseGeometry returns Record<string, unknown> at the type
       // level (until U-WEDM-PARSE-GEOM-TYPING tightens the API contract); shape is
       // verified by runtime guards in the geometry consumers.
      const parsed = response as unknown as GeometryParseResult;
      setGeometry(parsed);
    } catch (err) {
      setParseError(errorMessage(err, 'Failed to parse geometry'));
      setGeometry(null);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleClearGeometry = useCallback(() => {
    setDxfFile(null);
    setGeometry(null);
    setParseError(null);
  }, []);

  // --------------------------------------------------------------------------
  // Solve Handler
  // --------------------------------------------------------------------------

  async function handleSolve() {
    setLoading(true);
    setError(null);
    setGateError(null);
    try {
      const response = await solveWireEdmWizard({
        material,
        thickness: Number(thickness) || 0,
        quantity: Number(quantity) || 1,
        tolerance,
        notes: notes.trim() || undefined,
        geometry: geometry ?? undefined,
      });
      setSolution(asRecord(payloadOf(response)) ?? asRecord(response));
    } catch (issue) {
      setSolution(null);
      setGateError(issue);
      setError(errorMessage(issue, 'Unable to solve the Wire EDM wizard request.'));
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------------------------------
  // Metrics and AI Context
  // --------------------------------------------------------------------------

  const metrics = useMemo(() => ([
    {
      label: 'Material',
      value: material,
      hint: launchMachineLabel ? `Current wizard setup · ${launchMachineLabel}` : 'Current wizard setup',
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      label: 'Geometry',
      value: geometry ? `${geometry.contours.length} contours` : dxfFile ? 'Parsing...' : 'None',
      hint: geometry ? `${geometry.total_perimeter_mm.toFixed(1)}mm perimeter` : 'Upload DXF/DWG',
      accent: 'from-violet-400/22 via-violet-300/10 to-transparent',
    },
    {
      label: 'Result Keys',
      value: String(solution ? Object.keys(solution).length : 0),
      hint: loading ? 'Solver running' : 'Mounted wizard output',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
  ]), [dxfFile, geometry, loading, launchMachineLabel, material, solution]);

  const aiContext = useMemo(() => ({
    workspace: 'wire-edm-wizard',
    appw_stage: 'APPW-MS0 machining calculation',
    launch_source: launchState?.sourceLabel ?? '',
    material,
    thickness: Number(thickness) || 0,
    quantity: Number(quantity) || 1,
    tolerance,
    notes,
    geometry,
    launch_machine: launchMachineLabel ?? '',
    launch_controller: launchControllerLabel ?? '',
    launch_packet_id: launchState?.workspaceContext?.packetId ?? '',
    launch_focus_id: launchState?.workspaceContext?.focusId ?? '',
    solution,
  }), [geometry, launchControllerLabel, launchMachineLabel, launchState?.sourceLabel, launchState?.workspaceContext?.focusId, launchState?.workspaceContext?.packetId, material, notes, quantity, solution, thickness, tolerance]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <WorkspaceRecoveryScaffold
      eyebrow="Wire EDM planning"
      title="Wire EDM Wizard"
      description="Upload a DXF/DWG file for AI geometry analysis, configure material and thickness, then solve for optimal cutting parameters."
      surfaces={['jobDesk']}
      metrics={metrics}
      aiSummary="Kienzle AI can explain the wizard output, flag missing assumptions, and tell the programmer what to verify before cutting."
      aiContext={aiContext}
      suggestions={[
        {
          id: 'wizard-summary',
          label: 'Explain the wizard result',
          query: 'Explain the current Wire EDM wizard result in plain language and tell the programmer what to verify next.',
        },
        {
          id: 'wizard-risk',
          label: 'Find setup risk',
          query: 'What setup or process risk is still hidden in the current Wire EDM wizard configuration?',
        },
        {
          id: 'geometry-analysis',
          label: 'Analyze geometry',
          query: 'Analyze the uploaded geometry and identify any challenging features for wire EDM (sharp corners, thin walls, undercuts).',
        },
      ]}
    >
      {/* Safety + Autonomy Status Bar (U-P2PFS32) */}
      <WedmStatusBar safetyStatus={safetyStatus} autonomyStatus={autonomyStatus} />

      {/* RUL + Maintenance Panel (U-P2PFS33) */}
      <WedmRulMaintenancePanel rulStatus={rulStatus} maintenanceStatus={maintenanceStatus} />

      {/* DXF Upload Zone */}
      <PanelCard title="Geometry upload" subtitle="Drag and drop a DXF, DWG, or SVG file for AI geometry analysis">
        <div
          data-testid="dxf-drop-zone"
          className={`
            relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center
            rounded-2xl border-2 border-dashed transition-all
            ${dragActive
              ? 'border-cyan-400 bg-cyan-400/10'
              : geometry
                ? 'border-emerald-400/40 bg-emerald-400/5'
                : 'border-white/20 bg-slate-950/50 hover:border-cyan-300/40 hover:bg-slate-900/60'
            }
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !geometry && document.getElementById('dxf-input')?.click()}
        >
          <input
            id="dxf-input"
            data-testid="dxf-file-input"
            type="file"
            accept=".dxf,.dwg,.svg"
            onChange={handleFileInput}
            className="hidden"
          />

          {parsing ? (
            <div className="text-center">
              <div className="mb-2 text-2xl">
                <span className="inline-block animate-spin">&#9881;</span>
              </div>
              <p className="text-sm text-slate-400">Parsing geometry...</p>
            </div>
          ) : geometry ? (
            <div className="w-full px-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">&#10003;</span>
                  <span className="font-medium text-slate-200">{dxfFile?.name ?? 'Geometry loaded'}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClearGeometry(); }}
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  Clear
                </button>
              </div>
              <GeometrySummary geometry={geometry} />
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-2 text-3xl text-slate-500">&#128194;</div>
              <p className="text-sm font-medium text-slate-300">Drop DXF/DWG/SVG here</p>
              <p className="mt-1 text-xs text-slate-500">or click to browse</p>
            </div>
          )}
        </div>

        {parseError && (
          <div className="mt-3 rounded-xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-2 text-sm text-rose-100">
            {parseError}
          </div>
        )}
      </PanelCard>

      {/* Wizard Inputs */}
      <PanelCard title="Wizard inputs" subtitle="Configure material and process parameters">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Material">
            <Select
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
              data-testid="material-select"
            >
              {MATERIAL_CATEGORIES.map(category => (
                <optgroup key={category} label={category}>
                  {MATERIAL_OPTIONS.filter(m => m.category === category).map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.skimPasses.standard}-{opt.skimPasses.fine} skim)
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Thickness (mm)">
            <Input value={thickness} onChange={(event) => setThickness(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Quantity">
            <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Tolerance (in)">
            <Input value={tolerance} onChange={(event) => setTolerance(event.target.value)} />
          </Field>
        </div>

        {/* AI Skim Pass Recommendation */}
        <SkimPassRecommendation material={material} tolerance={tolerance} />

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-[100px] w-full rounded-[22px] border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
            placeholder="Optional setup notes, part features, or cut-sequence constraints."
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <ActionButton onClick={() => void handleSolve()} disabled={loading}>
            {loading ? 'Solving...' : 'Solve wizard'}
          </ActionButton>
          {solution && (
            <ActionButton
              onClick={() => navigate('/wire-edm/results', { state: { solution, material, thickness, geometry } })}
              tone="cyan"
            >
              View Results &rarr;
            </ActionButton>
          )}
          <StatusPill label={loading ? 'Working' : parsing ? 'Parsing' : 'Ready'} tone={loading || parsing ? 'amber' : 'emerald'} />
        </div>

        {error ? (
          <GatedError error={gateError} feature='wizard.wedm' fallback={
            <div className="mt-4 rounded-2xl border border-rose-300/18 bg-rose-300/[0.08] px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          } />
        ) : null}
      </PanelCard>

      {/* Tribal Tips Panel (U-P2PFS31) */}
      <WedmTribalTipCard tips={tribalTips} loading={tipsLoading} material={material} />

      {/* Controller Code Preview (U-P2PFS34) */}
      {(solution || codeLoading) && (
        <WedmControllerCodePreview preview={codePreview} loading={codeLoading} />
      )}

      {/* Approval Gate + ERP CTAs (U-P2PFS35, U-P2PFS36) */}
      {solution && geometry && (
        <WedmApprovalErpPanel
          onCreateQuote={handleCreateQuote}
          onPushToJob={handlePushToJob}
          onRequestApproval={handleRequestApproval}
          onOpenInStudio={handleOpenInStudio}
          quantityBreaks={quantityBreaks}
          quoteLoading={quoteLoading}
          jobLoading={jobLoading}
          approvalLoading={approvalLoading}
          createdJobId={createdJobId}
          approvalStatus={approvalStatus}
          error={erpError}
        />
      )}

      {/* Wizard Output */}
      <PanelCard title="Wizard output" subtitle="Latest mounted solve result.">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
          {solution ? formatJsonPreview(solution) : 'No Wire EDM wizard result is currently mounted.'}
        </div>
      </PanelCard>
    </WorkspaceRecoveryScaffold>
  );
}

// ============================================================================
// GeometrySummary Component
// ============================================================================

interface GeometrySummaryProps {
  geometry: GeometryParseResult;
}

function GeometrySummary({ geometry }: GeometrySummaryProps) {
  const boundingWidth = geometry.bounding_box.max_x - geometry.bounding_box.min_x;
  const boundingHeight = geometry.bounding_box.max_y - geometry.bounding_box.min_y;
  const closedContours = geometry.contours.filter(c => c.is_closed).length;
  const openContours = geometry.contours.length - closedContours;

  return (
    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4" data-testid="geometry-summary">
      <div className="rounded-lg bg-slate-800/50 p-2">
        <div className="text-xs text-slate-500">Contours</div>
        <div className="font-medium text-slate-200">{geometry.contours.length}</div>
        <div className="text-xs text-slate-500">
          {closedContours} closed, {openContours} open
        </div>
      </div>
      <div className="rounded-lg bg-slate-800/50 p-2">
        <div className="text-xs text-slate-500">Perimeter</div>
        <div className="font-medium text-slate-200">{geometry.total_perimeter_mm.toFixed(1)} mm</div>
      </div>
      <div className="rounded-lg bg-slate-800/50 p-2">
        <div className="text-xs text-slate-500">Bounding Box</div>
        <div className="font-medium text-slate-200">{boundingWidth.toFixed(1)} &times; {boundingHeight.toFixed(1)} mm</div>
      </div>
      {geometry.total_area_mm2 && (
        <div className="rounded-lg bg-slate-800/50 p-2">
          <div className="text-xs text-slate-500">Area</div>
          <div className="font-medium text-slate-200">{geometry.total_area_mm2.toFixed(1)} mm&sup2;</div>
        </div>
      )}
      {geometry.detected_features && geometry.detected_features.length > 0 && (
        <div className="col-span-2 rounded-lg bg-slate-800/50 p-2 md:col-span-4">
          <div className="text-xs text-slate-500">Detected Features</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {geometry.detected_features.map((feature, i) => (
              <span key={i} className="rounded bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-300">
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}
      {geometry.warnings && geometry.warnings.length > 0 && (
        <div className="col-span-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-2 md:col-span-4">
          <div className="text-xs text-amber-400">Warnings</div>
          <ul className="mt-1 text-xs text-amber-200">
            {geometry.warnings.map((warning, i) => (
              <li key={i}>&#9888; {warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SkimPassRecommendation Component (U-P2PFS30)
// ============================================================================

interface SkimPassRecommendationProps {
  material: string;
  tolerance: string;
}

function SkimPassRecommendation({ material, tolerance }: SkimPassRecommendationProps) {
  const matOption = findMaterialOption(material);
  if (!matOption) return null;

  const tolNum = parseFloat(tolerance);
  const isFine = !isNaN(tolNum) && tolNum <= 0.0005;
  const recommendedPasses = isFine ? matOption.skimPasses.fine : matOption.skimPasses.standard;
  const targetRa = isFine ? '0.4-0.6' : '1.0-1.5';

  // Calculate expected Ra after each pass using cascade model
  const roughRa = 3.2; // Typical rough cut Ra in µm
  const passes = Array.from({ length: recommendedPasses }, (_, i) => {
    const passNum = i + 1;
    const expectedRa = roughRa * Math.pow(matOption.rho, passNum);
    return { passNum, expectedRa };
  });

  return (
    <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3" data-testid="skim-pass-recommendation">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-cyan-400">&#9881;</span>
        <span className="text-sm font-medium text-slate-200">AI Skim Pass Recommendation</span>
        <span className={`ml-auto rounded px-2 py-0.5 text-xs ${isFine ? 'bg-violet-400/20 text-violet-300' : 'bg-emerald-400/20 text-emerald-300'}`}>
          {isFine ? 'Fine Finish' : 'Standard Finish'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <div className="rounded-lg bg-slate-800/50 p-2">
          <div className="text-xs text-slate-500">Recommended Passes</div>
          <div className="text-lg font-bold text-cyan-300">{recommendedPasses}</div>
          <div className="text-xs text-slate-500">(1 rough + {recommendedPasses} skim)</div>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-2">
          <div className="text-xs text-slate-500">Target Ra</div>
          <div className="font-medium text-slate-200">{targetRa} µm</div>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-2">
          <div className="text-xs text-slate-500">Decay Factor (ρ)</div>
          <div className="font-medium text-slate-200">{matOption.rho}</div>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-2">
          <div className="text-xs text-slate-500">Expected Final Ra</div>
          <div className="font-medium text-emerald-300">{passes[passes.length - 1]?.expectedRa.toFixed(2) ?? '—'} µm</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {passes.map(p => (
          <span key={p.passNum} className="rounded bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300">
            Skim {p.passNum}: ~{p.expectedRa.toFixed(2)} µm
          </span>
        ))}
      </div>
      {matOption.notes && (
        <div className="mt-2 text-xs text-slate-400">
          <span className="text-amber-400">Note:</span> {matOption.notes}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WedmTribalTipCard Component (U-P2PFS31)
// ============================================================================

interface WedmTribalTipCardProps {
  tips: TribalTip[];
  loading: boolean;
  material: string;
}

function WedmTribalTipCard({ tips, loading, material }: WedmTribalTipCardProps) {
  if (loading) {
    return (
      <PanelCard title="Tribal Knowledge" subtitle="Loading shop floor wisdom...">
        <div className="flex items-center gap-2 text-sm text-slate-400" data-testid="tribal-tips-loading">
          <span className="inline-block animate-spin">&#9881;</span>
          <span>Searching tribal knowledge for {material}...</span>
        </div>
      </PanelCard>
    );
  }

  if (tips.length === 0) {
    return (
      <PanelCard title="Tribal Knowledge" subtitle="Shop floor wisdom for Wire EDM">
        <div className="text-sm text-slate-500" data-testid="tribal-tips-empty">
          No tribal tips found for {material}. Tips will appear as the knowledge base grows.
        </div>
      </PanelCard>
    );
  }

  return (
    <PanelCard title="Tribal Knowledge" subtitle={`${tips.length} tips for ${material}`}>
      <div className="space-y-3" data-testid="tribal-tips-list">
        {tips.map((tip, i) => (
          <div
            key={tip.id || i}
            className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3"
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium text-amber-200">{tip.title}</h4>
              {tip.confidence !== undefined && (
                <span className="shrink-0 rounded bg-amber-400/20 px-1.5 py-0.5 text-xs text-amber-300">
                  {Math.round(tip.confidence * 100)}%
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300">{tip.body}</p>
            {(tip.source || tip.category) && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                {tip.source && <span>Source: {tip.source}</span>}
                {tip.category && (
                  <span className="rounded bg-slate-700/50 px-1.5 py-0.5">{tip.category}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

// ============================================================================
// WedmStatusBar Component (U-P2PFS32)
// ============================================================================

interface WedmStatusBarProps {
  safetyStatus: WedmSafetyEnvelopeStatus | null;
  autonomyStatus: WedmAutonomyStatus | null;
}

function WedmStatusBar({ safetyStatus, autonomyStatus }: WedmStatusBarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-3"
      data-testid="wedm-status-bar"
    >
      <WedmSafetyBadge status={safetyStatus} />
      <div className="h-6 w-px bg-white/10" />
      <WedmAutonomyIndicator status={autonomyStatus} />
    </div>
  );
}

// ============================================================================
// WedmSafetyBadge Component (U-P2PFS32)
// ============================================================================

interface WedmSafetyBadgeProps {
  status: WedmSafetyEnvelopeStatus | null;
}

function WedmSafetyBadge({ status }: WedmSafetyBadgeProps) {
  if (!status) {
    return (
      <div className="flex items-center gap-2" data-testid="safety-badge-loading">
        <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-slate-500" />
        <span className="text-xs text-slate-500">Loading safety...</span>
      </div>
    );
  }

  const levelConfig = {
    safe: { color: 'emerald', icon: '&#10003;', label: 'Safe' },
    warning: { color: 'amber', icon: '&#9888;', label: 'Warning' },
    critical: { color: 'rose', icon: '&#10060;', label: 'Critical' },
  }[status.level];

  const scorePercent = Math.round(status.score * 100);

  return (
    <div className="flex items-center gap-3" data-testid="safety-badge">
      {/* Safety Score Circle */}
      <div className="relative flex h-10 w-10 items-center justify-center">
        <svg className="absolute h-10 w-10 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-slate-700"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${status.score * 100} 100`}
            strokeLinecap="round"
            className={`text-${levelConfig.color}-400`}
          />
        </svg>
        <span className={`text-xs font-bold text-${levelConfig.color}-400`}>{scorePercent}</span>
      </div>

      {/* Safety Info */}
      <div>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full bg-${levelConfig.color}-400`}
            dangerouslySetInnerHTML={{ __html: '' }}
          />
          <span className={`text-sm font-medium text-${levelConfig.color}-300`}>
            S(x) {levelConfig.label}
          </span>
        </div>
        {status.violations && status.violations.length > 0 && (
          <div className="text-xs text-rose-300">
            {status.violations.length} violation{status.violations.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// WedmAutonomyIndicator Component (U-P2PFS32)
// ============================================================================

interface WedmAutonomyIndicatorProps {
  status: WedmAutonomyStatus | null;
}

const AUTONOMY_LEVELS = [
  { level: 0, label: 'L0 Manual', color: 'slate', description: 'Human executes all' },
  { level: 1, label: 'L1 Assisted', color: 'cyan', description: 'AI suggests' },
  { level: 2, label: 'L2 Partial', color: 'emerald', description: 'AI executes some' },
  { level: 3, label: 'L3 Conditional', color: 'violet', description: 'AI executes most' },
  { level: 4, label: 'L4 High', color: 'amber', description: 'Human monitors' },
  { level: 5, label: 'L5 Full', color: 'rose', description: 'Full autonomy' },
];

function WedmAutonomyIndicator({ status }: WedmAutonomyIndicatorProps) {
  if (!status) {
    return (
      <div className="flex items-center gap-2" data-testid="autonomy-indicator-loading">
        <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-slate-500" />
        <span className="text-xs text-slate-500">Loading autonomy...</span>
      </div>
    );
  }

  const levelInfo = AUTONOMY_LEVELS[status.level] ?? AUTONOMY_LEVELS[0];

  return (
    <div className="flex items-center gap-3" data-testid="autonomy-indicator">
      {/* Level Indicator Strip */}
      <div className="flex gap-0.5">
        {AUTONOMY_LEVELS.map((lvl) => (
          <div
            key={lvl.level}
            className={`h-6 w-1.5 rounded-full transition-all ${
              lvl.level <= status.level
                ? `bg-${levelInfo.color}-400`
                : 'bg-slate-700'
            }`}
            title={lvl.label}
          />
        ))}
      </div>

      {/* Level Info */}
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-medium text-${levelInfo.color}-300`}>
            {status.level_label || levelInfo.label}
          </span>
          {status.can_promote && (
            <span className="rounded bg-emerald-400/20 px-1 py-0.5 text-[10px] text-emerald-300">
              &#8593; Ready
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500">{levelInfo.description}</div>
      </div>

      {/* Confidence -- optional: the autonomy snapshot has no confidence field yet (render
          "--" honestly rather than NaN%). */}
      <div className="ml-2 flex flex-col items-end">
        <span className="text-xs text-slate-400">Confidence</span>
        <span className={`text-sm font-medium text-${levelInfo.color}-300`}>
          {status.confidence !== undefined ? `${Math.round(status.confidence * 100)}%` : '--'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// WedmRulMaintenancePanel Component (U-P2PFS33)
// ============================================================================

interface WedmRulMaintenancePanelProps {
  rulStatus: WedmRulStatus | null;
  maintenanceStatus: WedmMaintenanceStatus | null;
}

function WedmRulMaintenancePanel({ rulStatus, maintenanceStatus }: WedmRulMaintenancePanelProps) {
  return (
    <div
      className="grid gap-4 lg:grid-cols-2"
      data-testid="rul-maintenance-panel"
    >
      <WedmRulGauge status={rulStatus} />
      <WedmMaintenanceAdvisory status={maintenanceStatus} />
    </div>
  );
}

// ============================================================================
// WedmRulGauge Component (U-P2PFS33)
// ============================================================================

interface WedmRulGaugeProps {
  status: WedmRulStatus | null;
}

function WedmRulGauge({ status }: WedmRulGaugeProps) {
  if (!status) {
    return (
      <div
        className="rounded-2xl border border-white/8 bg-slate-950/60 p-4"
        data-testid="rul-gauge-loading"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-slate-500" />
          <span className="text-sm text-slate-500">Loading RUL data...</span>
        </div>
      </div>
    );
  }

  // U-WEDM-LIVE-ROUTES: render the components the degradation model ACTUALLY tracks
  // (generic list -- the old wire_spool/guide/power_feed literals matched no engine).
  // hours_remaining === null means "not aging" (no live usage-rate telemetry yet).
  const bandCondition: Record<string, string> = {
    imminent: 'replace',
    soon: 'worn',
    planned: 'fair',
    healthy: 'good',
  };
  // Defensive ?? [] only: /wedm-live/rul is a plain res.json route (NO slimResponse -- that
  // slimming applies to prism_edm dispatcher payloads, not this wire), so components always
  // arrives; the guard just ensures a malformed body renders an empty panel, never a crash.
  // If this route is ever moved behind slimResponse, hours_remaining:null would be stripped
  // too and the !== null check below would need to become != null.
  const components = (status.components ?? []).map((c) => ({
    label: c.label,
    pct: c.rul_pct,
    detail: c.hours_remaining !== null ? `${c.hours_remaining.toFixed(0)}h remaining` : 'not aging (no usage feed)',
    subDetail: undefined as string | undefined,
    condition: bandCondition[c.band] as 'good' | 'fair' | 'worn' | 'replace' | undefined,
  }));

  return (
    <div
      className="rounded-2xl border border-white/8 bg-slate-950/60 p-4"
      data-testid="rul-gauge"
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-300">
        Remaining Useful Life (RUL)
      </h3>
      <div className="space-y-3">
        {components.map((comp) => {
          const color = comp.pct >= 50 ? 'emerald' : comp.pct >= 25 ? 'amber' : 'rose';
          const conditionColor = {
            good: 'emerald',
            fair: 'cyan',
            worn: 'amber',
            replace: 'rose',
          }[comp.condition ?? 'good'];

          return (
            <div key={comp.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{comp.label}</span>
                <div className="flex items-center gap-2">
                  {comp.condition && (
                    <span className={`rounded bg-${conditionColor}-400/20 px-1.5 py-0.5 text-${conditionColor}-300`}>
                      {comp.condition}
                    </span>
                  )}
                  <span className={`font-medium text-${color}-400`}>{comp.pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                <div
                  className={`h-full bg-${color}-400 transition-all`}
                  style={{ width: `${Math.min(100, Math.max(0, comp.pct))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{comp.detail}</span>
                {comp.subDetail && <span>{comp.subDetail}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// WedmMaintenanceAdvisory Component (U-P2PFS33)
// ============================================================================

interface WedmMaintenanceAdvisoryProps {
  status: WedmMaintenanceStatus | null;
}

function WedmMaintenanceAdvisory({ status }: WedmMaintenanceAdvisoryProps) {
  if (!status) {
    return (
      <div
        className="rounded-2xl border border-white/8 bg-slate-950/60 p-4"
        data-testid="maintenance-advisory-loading"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-slate-500" />
          <span className="text-sm text-slate-500">Loading maintenance data...</span>
        </div>
      </div>
    );
  }

  const priorityConfig = {
    low: { color: 'slate', icon: '○' },
    medium: { color: 'cyan', icon: '◐' },
    high: { color: 'amber', icon: '◉' },
    critical: { color: 'rose', icon: '●' },
  };

  const typeConfig = {
    scheduled: { label: 'Scheduled', color: 'slate' },
    predictive: { label: 'Predictive', color: 'violet' },
    overdue: { label: 'Overdue', color: 'rose' },
  };

  return (
    <div
      className="rounded-2xl border border-white/8 bg-slate-950/60 p-4"
      data-testid="maintenance-advisory"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">Maintenance Advisory</h3>
        {status.overdue_count > 0 && (
          <span className="rounded bg-rose-400/20 px-2 py-0.5 text-xs text-rose-300">
            {status.overdue_count} overdue
          </span>
        )}
      </div>

      {status.items.length === 0 ? (
        <div className="py-4 text-center text-sm text-slate-500">
          No upcoming maintenance items
        </div>
      ) : (
        <div className="space-y-2">
          {status.items.slice(0, 4).map((item) => {
            const priority = priorityConfig[item.priority];
            const type = typeConfig[item.type];
            const dueDate = new Date(item.due_date);
            const isOverdue = dueDate < new Date();

            return (
              <div
                key={item.id}
                className={`rounded-xl border px-3 py-2 ${
                  isOverdue
                    ? 'border-rose-400/30 bg-rose-400/5'
                    : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-${priority.color}-400`}>{priority.icon}</span>
                    <span className="text-sm text-slate-200">{item.component}</span>
                  </div>
                  <span className={`shrink-0 rounded bg-${type.color}-400/20 px-1.5 py-0.5 text-[10px] text-${type.color}-300`}>
                    {type.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                  <span>Due: {dueDate.toLocaleDateString()}</span>
                  {item.estimated_downtime_min && (
                    <span>~{item.estimated_downtime_min}min downtime</span>
                  )}
                </div>
              </div>
            );
          })}
          {status.items.length > 4 && (
            <div className="pt-1 text-center text-xs text-slate-500">
              +{status.items.length - 4} more items
            </div>
          )}
        </div>
      )}

      {status.next_scheduled && (
        <div className="mt-3 border-t border-white/5 pt-2 text-xs text-slate-500">
          Next scheduled: {new Date(status.next_scheduled).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WedmControllerCodePreview Component (U-P2PFS34)
// ============================================================================

interface WedmControllerCodePreviewProps {
  preview: WedmCodePreviewResult | null;
  loading: boolean;
}

function WedmControllerCodePreview({ preview, loading }: WedmControllerCodePreviewProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!preview?.program) return;
    try {
      await navigator.clipboard.writeText(preview.program);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some environments
    }
  }, [preview?.program]);

  if (loading) {
    return (
      <PanelCard title="Controller Code Preview" subtitle="Generating Mitsubishi NC code...">
        <div className="flex items-center gap-2 text-sm text-slate-400" data-testid="code-preview-loading">
          <span className="inline-block animate-spin">&#9881;</span>
          <span>Generating program for controller...</span>
        </div>
      </PanelCard>
    );
  }

  if (!preview) {
    return null;
  }

  return (
    <PanelCard
      title="Controller Code Preview"
      subtitle={`Mitsubishi WEDM • ${preview.line_count} lines • ~${preview.estimated_time_min.toFixed(1)} min`}
    >
      <div data-testid="code-preview-panel">
        {/* Header with controls */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Register display */}
            <div className="flex gap-2" data-testid="register-display">
              <span className="rounded bg-cyan-400/20 px-2 py-0.5 text-xs font-mono text-cyan-300">
                E{preview.registers.E}
              </span>
              <span className="rounded bg-violet-400/20 px-2 py-0.5 text-xs font-mono text-violet-300">
                C{preview.registers.C}
              </span>
              <span className="rounded bg-emerald-400/20 px-2 py-0.5 text-xs font-mono text-emerald-300">
                T{preview.registers.T}
              </span>
              <span className="rounded bg-amber-400/20 px-2 py-0.5 text-xs font-mono text-amber-300">
                H{preview.registers.H}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg bg-slate-700/50 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 transition"
              data-testid="copy-button"
            >
              {copied ? (
                <>
                  <span className="text-emerald-400">&#10003;</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <span>&#128203;</span>
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center gap-1 rounded-lg bg-slate-700/50 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 transition"
              data-testid="collapse-button"
            >
              <span>{collapsed ? '&#9660;' : '&#9650;'}</span>
              <span>{collapsed ? 'Expand' : 'Collapse'}</span>
            </button>
          </div>
        </div>

        {/* Code display */}
        {!collapsed && (
          <div
            className="max-h-[400px] overflow-auto rounded-xl border border-white/8 bg-slate-950 p-4 font-mono text-xs"
            data-testid="code-display"
          >
            <pre className="whitespace-pre-wrap">
              {preview.program.split('\n').map((line, i) => (
                <CodeLine key={i} line={line} lineNumber={i + 1} />
              ))}
            </pre>
          </div>
        )}
      </div>
    </PanelCard>
  );
}

// ============================================================================
// WedmApprovalErpPanel Component (U-P2PFS35, U-P2PFS36)
// ============================================================================

interface WedmApprovalErpPanelProps {
  onCreateQuote: () => void;
  onPushToJob: () => void;
  onRequestApproval: () => void;
  onOpenInStudio: () => void;
  quantityBreaks: Array<{
    quantity: number;
    unit_price: number;
    total_price: number;
    savings_pct_vs_qty1: number;
  }>;
  quoteLoading: boolean;
  jobLoading: boolean;
  approvalLoading: boolean;
  createdJobId: string | null;
  approvalStatus: WedmApprovalStatus | null;
  error: string | null;
}

function WedmApprovalErpPanel({
  onCreateQuote,
  onPushToJob,
  onRequestApproval,
  onOpenInStudio,
  quantityBreaks,
  quoteLoading,
  jobLoading,
  approvalLoading,
  createdJobId,
  approvalStatus,
  error,
}: WedmApprovalErpPanelProps) {
  const navigate = useNavigate();
  const isApproved = approvalStatus?.approved === true;
  const requiresApproval = approvalStatus?.requires_approval !== false;

  return (
    <PanelCard title="ERP Integration" subtitle="Create quotes and push jobs to shop floor">
      <div data-testid="erp-panel">
        {/* Open in Studio Button */}
        <div className="flex flex-wrap gap-3 mb-4">
          <ActionButton onClick={onOpenInStudio} tone="violet" data-testid="open-studio-button">
            &#128295; Open in Studio
          </ActionButton>
        </div>

        {/* Approval Gate (U-P2PFS36) */}
        {requiresApproval && !isApproved && (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3" data-testid="approval-gate">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">&#128274;</span>
                  <span className="text-sm font-medium text-amber-200">Operator Approval Required</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  ERP actions require operator approval before proceeding.
                </p>
              </div>
              <ActionButton
                onClick={onRequestApproval}
                disabled={approvalLoading}
                tone="amber"
              >
                {approvalLoading ? 'Requesting...' : 'Request Approval'}
              </ActionButton>
            </div>
          </div>
        )}

        {/* Approval Confirmed Badge */}
        {isApproved && (
          <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-2" data-testid="approval-confirmed">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span>
              <span className="text-sm text-emerald-200">Approved by {approvalStatus?.approver ?? 'operator'}</span>
              {approvalStatus?.approved_at && (
                <span className="text-xs text-slate-500">
                  at {new Date(approvalStatus.approved_at).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ERP Action Buttons — Only visible when approved */}
        {(!requiresApproval || isApproved) && (
          <div className="flex flex-wrap gap-3 mb-4" data-testid="erp-actions">
            <ActionButton
              onClick={onCreateQuote}
              disabled={quoteLoading || jobLoading}
              tone="cyan"
            >
              {quoteLoading ? (
                <>
                  <span className="inline-block animate-spin mr-1">&#9881;</span>
                  Creating Quote...
                </>
              ) : (
                <>&#128200; Create Quote</>
              )}
            </ActionButton>

            <ActionButton
              onClick={onPushToJob}
              disabled={quoteLoading || jobLoading || !!createdJobId}
              tone="emerald"
            >
              {jobLoading ? (
                <>
                  <span className="inline-block animate-spin mr-1">&#9881;</span>
                  Creating Job...
                </>
              ) : createdJobId ? (
                <>&#10003; Job Created</>
              ) : (
                <>&#128736; Push to Job</>
              )}
            </ActionButton>

            {createdJobId && (
              <ActionButton
                onClick={() => navigate(`/wedm-erp/jobs/${createdJobId}`)}
                tone="violet"
              >
                View Job &rarr;
              </ActionButton>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/5 px-4 py-2 text-sm text-rose-300" data-testid="erp-error">
            {error}
          </div>
        )}

        {/* Quantity Breaks Table */}
        {quantityBreaks.length > 0 && (
          <div data-testid="quantity-breaks-table">
            <h4 className="mb-2 text-sm font-medium text-slate-300">Quantity Pricing</h4>
            <div className="overflow-x-auto rounded-xl border border-white/8 bg-slate-950/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Unit Price</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Total</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {quantityBreaks.map((br) => (
                    <tr key={br.quantity} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-2 text-slate-200">{br.quantity}</td>
                      <td className="px-3 py-2 text-right text-slate-300">${br.unit_price.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-emerald-300">${br.total_price.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        {br.savings_pct_vs_qty1 > 0 ? (
                          <span className="text-cyan-300">-{br.savings_pct_vs_qty1.toFixed(1)}%</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Created Job Info */}
        {createdJobId && (
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3" data-testid="created-job-info">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span>
              <span className="text-sm text-emerald-200">Job created successfully</span>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Job ID: <span className="font-mono text-slate-300">{createdJobId}</span>
            </div>
          </div>
        )}
      </div>
    </PanelCard>
  );
}

// Syntax highlighting for Mitsubishi WEDM G-code
function CodeLine({ line, lineNumber }: { line: string; lineNumber: number }) {
  const highlightedLine = useMemo(() => {
    // Comments (start with ; or parentheses)
    if (line.trim().startsWith(';') || line.trim().startsWith('(')) {
      return <span className="text-slate-500">{line}</span>;
    }

    // Highlight different code elements
    return line.split(/(\s+)/).map((token, i) => {
      // G codes
      if (/^G\d+/i.test(token)) {
        return <span key={i} className="text-cyan-400">{token}</span>;
      }
      // M codes
      if (/^M\d+/i.test(token)) {
        return <span key={i} className="text-rose-400">{token}</span>;
      }
      // E register (power settings)
      if (/^E\d+/i.test(token)) {
        return <span key={i} className="text-cyan-300">{token}</span>;
      }
      // C register (capacitor)
      if (/^C\d+/i.test(token)) {
        return <span key={i} className="text-violet-300">{token}</span>;
      }
      // T register (off time)
      if (/^T\d+/i.test(token)) {
        return <span key={i} className="text-emerald-300">{token}</span>;
      }
      // H register (on time)
      if (/^H\d+/i.test(token)) {
        return <span key={i} className="text-amber-300">{token}</span>;
      }
      // S (servo) and F (feed)
      if (/^[SF]\d+/i.test(token)) {
        return <span key={i} className="text-emerald-400">{token}</span>;
      }
      // X, Y, Z coordinates
      if (/^[XYZIJ][-+]?\d*\.?\d+/i.test(token)) {
        return <span key={i} className="text-amber-300">{token}</span>;
      }
      // O program numbers
      if (/^O\d+/i.test(token)) {
        return <span key={i} className="text-violet-400 font-bold">{token}</span>;
      }
      // N line numbers
      if (/^N\d+/i.test(token)) {
        return <span key={i} className="text-slate-600">{token}</span>;
      }
      return <span key={i} className="text-slate-300">{token}</span>;
    });
  }, [line]);

  return (
    <div className="flex">
      <span className="mr-4 w-8 text-right text-slate-600 select-none">{lineNumber}</span>
      <span>{highlightedLine}</span>
    </div>
  );
}

export default WireEdmWizardPage;
