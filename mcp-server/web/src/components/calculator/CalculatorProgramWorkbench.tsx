import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRequestHeaders } from '../../api/client';
import type { MachineWorkspaceContext } from '../../features/machine-workspace/MachineWorkspaceState';
import {
  inferLatheUploadRoute,
  latheUploadFile,
  normalizeTurningController,
  turningProgramGenerate,
  type TurningCadImportResult,
  type TurningIntakeResult,
  type TurningProgramFeature,
  type TurningProgramInput,
  type TurningProgramMaterial,
  type TurningProgramResult,
} from '../../api/latheTurning';
import { fetchJson } from '../../api/requestCore';
import {
  weExportGcode,
  wePhotoToProgram,
  type WedmController,
  type WedmProgramResult,
} from '../../api/wireEdm';
import { WireEdmContour3D } from './WireEdmContour3D';
import { WireEdmContourPicker, type ContourData } from './WireEdmContourPicker';

type PartViewMode = '2d' | '3d';

type LatheDraft = {
  partNumber: string;
  material: TurningProgramMaterial;
  features: TurningProgramFeature[];
  baseInput: Omit<TurningProgramInput, 'features'>;
  warnings: string[];
  ambiguities: string[];
};

type WireSource =
  | { kind: 'dxf'; fileName: string; dxfContent: string }
  | { kind: 'image'; fileName: string; contentBase64: string };

type EdmElectrodeSourceFormat = 'dxf' | 'iges' | 'text' | 'step' | 'pdf' | 'image' | 'unknown';

type EdmElectrodeSource = {
  kind: 'parseable' | 'reference';
  fileName: string;
  format: EdmElectrodeSourceFormat;
  content?: string;
  contentBase64?: string;
};

type EdmElectrodeFeatureOption = {
  id: string;
  label: string;
  detail: string;
};

type EdmElectrodeProgram = {
  partNumber: string;
  electrodeMaterial: string;
  holderPackage: string;
  burnTarget: string;
  electrodeMachine: string;
  macroPath: string;
  legacyProgramPath: string;
  sourceMode: 'draft-nc' | 'macro-packet';
  programText: string;
  lineCount: number;
  setupNotes: string[];
  warnings: string[];
};

type AutoPrintToProgramDraftResult = {
  success?: boolean;
  program_text?: string;
  program_line_count?: number;
  confidence_score?: number;
  warnings?: Array<{ stage?: string; severity?: string; message?: string }>;
};

const EDM_ELECTRODE_MACHINE = {
  brand: 'Roku-Roku',
  model: 'HC 658II',
  controller: 'Fanuc 31i-B5',
  maxSpindleRpm: 30000,
};

const EDM_ELECTRODE_MATERIAL = 'Copper Tungsten';
const EDM_HOLDER_PACKAGE = 'System 3R ER-32';
const EDM_TRILOBE_MACRO_PATH = 'H:\\Automated Program_Corrected 5-25.xlsm';
const DEFAULT_ROKU_REFERENCE_PATH = 'H:\\PRISM\\JM DIE\\ROKU-ROKU';

const EDM_ELECTRODE_FEATURE_OPTIONS: EdmElectrodeFeatureOption[] = [
  {
    id: 'holder-stack',
    label: 'Holder stack',
    detail: 'Keep the System 3R ER-32 interface, pickup datum, and stick-out locked before programming.',
  },
  {
    id: 'trilobe-macro',
    label: 'Trilobe macro',
    detail: 'Carry the offline trilobe macro path into the setup packet so operators can apply the same offset logic every time.',
  },
  {
    id: 'spark-gap',
    label: 'Spark gap and wear',
    detail: 'Document spark-gap undersize and wear allowance so the milling program and burn notes stay paired.',
  },
  {
    id: 'burn-sequence',
    label: 'Burn sequence handoff',
    detail: 'Pass rough, finish, and orbit expectations downstream to the sinker cell with the electrode packet.',
  },
  {
    id: 'legacy-reference',
    label: 'Legacy reference',
    detail: 'Carry the expected H: drive program library path into the packet for prove-out and comparison.',
  },
];

function isTurningIntakeResult(value: unknown): value is TurningIntakeResult {
  return typeof value === 'object'
    && value !== null
    && 'turning_input' in value
    && Array.isArray((value as { features?: unknown }).features);
}

function isTurningCadImportResult(value: unknown): value is TurningCadImportResult {
  return typeof value === 'object'
    && value !== null
    && 'envelope' in value
    && Array.isArray((value as { features?: unknown }).features);
}

function buildTurningMaterial(
  materialName: string,
  materialGroup: string,
): TurningProgramMaterial {
  const group = materialGroup.toLowerCase();
  const iso_group =
    group.includes('stainless') ? 'M'
      : group.includes('cast') ? 'K'
        : group.includes('aluminum') ? 'N'
          : group.includes('nickel') || group.includes('cobalt') || group.includes('superalloy') || group.includes('titanium') ? 'S'
            : group.includes('hardened') || group.includes('tool steel') ? 'H'
              : 'P';
  return {
    material_name: materialName,
    iso_group,
  };
}

function normalizeLatheDraft(params: {
  extractedData: unknown;
  fileName: string;
  materialName: string;
  materialGroup: string;
  stockDiameterMm: number;
  stockLengthMm: number;
  machineLabel?: string;
  machineManufacturer?: string;
  controllerId?: string;
}): LatheDraft {
  const fallbackMaterial = buildTurningMaterial(params.materialName, params.materialGroup);
  const controller = normalizeTurningController(params.controllerId);

  if (isTurningIntakeResult(params.extractedData)) {
    const turningInput = params.extractedData.turning_input;
    const features = params.extractedData.features ?? turningInput.features ?? [];
    return {
      partNumber: turningInput.part_number ?? params.fileName.replace(/\.[^.]+$/, ''),
      material: turningInput.material ?? params.extractedData.material ?? fallbackMaterial,
      features,
      baseInput: {
        ...turningInput,
        part_number: turningInput.part_number ?? params.fileName.replace(/\.[^.]+$/, ''),
        material: turningInput.material ?? params.extractedData.material ?? fallbackMaterial,
        bar_stock_od_mm: turningInput.bar_stock_od_mm || params.stockDiameterMm,
        finished_od_mm: turningInput.finished_od_mm,
        part_length_mm: turningInput.part_length_mm || params.stockLengthMm,
        machine_brand: turningInput.machine_brand ?? params.machineManufacturer,
        machine_model: turningInput.machine_model ?? params.machineLabel,
        controller: turningInput.controller ?? controller,
      },
      warnings: (params.extractedData.warnings ?? []).map((warning) => warning.message),
      ambiguities: (params.extractedData.ambiguities ?? []).map((ambiguity) => ambiguity.message),
    };
  }

  if (isTurningCadImportResult(params.extractedData)) {
    const envelope = params.extractedData.envelope;
    return {
      partNumber: params.fileName.replace(/\.[^.]+$/, ''),
      material: fallbackMaterial,
      features: params.extractedData.features ?? [],
      baseInput: {
        part_number: params.fileName.replace(/\.[^.]+$/, ''),
        material: fallbackMaterial,
        bar_stock_od_mm: params.stockDiameterMm || Math.max(0, envelope.max_od_mm + 2),
        finished_od_mm: envelope.max_od_mm,
        part_length_mm: envelope.total_length_mm || params.stockLengthMm,
        machine_brand: params.machineManufacturer,
        machine_model: params.machineLabel,
        controller,
        optimization_target: 'balanced',
      },
      warnings: params.extractedData.warnings ?? [],
      ambiguities: (params.extractedData.non_axi_features ?? []).map((feature) => feature.description),
    };
  }

  return {
    partNumber: params.fileName.replace(/\.[^.]+$/, ''),
    material: fallbackMaterial,
    features: [],
    baseInput: {
      part_number: params.fileName.replace(/\.[^.]+$/, ''),
      material: fallbackMaterial,
      bar_stock_od_mm: params.stockDiameterMm,
      part_length_mm: params.stockLengthMm,
      machine_brand: params.machineManufacturer,
      machine_model: params.machineLabel,
      controller,
      optimization_target: 'balanced',
    },
    warnings: ['PRISM could not normalize the uploaded turning geometry.'],
    ambiguities: [],
  };
}

function normalizeWedmController(controllerId: string | undefined): WedmController {
  const value = (controllerId ?? '').toLowerCase();
  if (value.includes('fanuc')) return 'fanuc';
  if (value.includes('sodick')) return 'sodick';
  if (value.includes('makino')) return 'makino';
  if (value.includes('mitsubishi')) return 'mitsubishi';
  if (value.includes('agie') || value.includes('charmilles')) return 'agiecharmilles';
  return 'generic';
}

function formatFeatureLabel(feature: TurningProgramFeature) {
  return feature.type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function clampNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fileNameBase(value: string) {
  return value.replace(/\.[^.]+$/, '');
}

function buildWireTypeFromHolder(holderStyle: string) {
  if (holderStyle === 'fine-wire') return 'brass_0.20';
  if (holderStyle === 'taper-package') return 'coated_0.25';
  return 'brass_0.25';
}

function inferEdmElectrodeSourceFormat(fileName: string): EdmElectrodeSourceFormat {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.dxf')) return 'dxf';
  if (lowerName.endsWith('.igs') || lowerName.endsWith('.iges')) return 'iges';
  if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.csv')) return 'text';
  if (lowerName.endsWith('.step') || lowerName.endsWith('.stp')) return 'step';
  if (lowerName.endsWith('.pdf')) return 'pdf';
  if (
    lowerName.endsWith('.png')
    || lowerName.endsWith('.jpg')
    || lowerName.endsWith('.jpeg')
    || lowerName.endsWith('.webp')
  ) {
    return 'image';
  }
  return 'unknown';
}

function isParseableEdmElectrodeSourceFormat(format: EdmElectrodeSourceFormat) {
  return format === 'dxf' || format === 'iges' || format === 'text';
}

function formatEdmElectrodeSourceLabel(format: EdmElectrodeSourceFormat) {
  switch (format) {
    case 'dxf':
      return 'DXF geometry';
    case 'iges':
      return 'IGES geometry';
    case 'text':
      return 'structured text';
    case 'step':
      return 'STEP reference';
    case 'pdf':
      return 'PDF print';
    case 'image':
      return 'scan image';
    default:
      return 'reference file';
  }
}

function buildEdmElectrodeTemplateProgram(params: {
  partNumber: string;
  sparkGapPerSideMm: number;
  wearAllowanceMm: number;
  finishPassCount: number;
  burnTarget: string;
}) {
  const sequence = EDM_ELECTRODE_FEATURE_OPTIONS.map((item) => item.label.toUpperCase()).join(' / ');
  return [
    '%',
    `O7001 (PRISM ELECTRODE PACKET - ${params.partNumber})`,
    `(ELECTRODE MATERIAL: ${EDM_ELECTRODE_MATERIAL.toUpperCase()})`,
    `(HOLDER PACKAGE: ${EDM_HOLDER_PACKAGE.toUpperCase()})`,
    `(ELECTRODE MACHINE: ${EDM_ELECTRODE_MACHINE.brand.toUpperCase()} ${EDM_ELECTRODE_MACHINE.model.toUpperCase()})`,
    `(BURN TARGET: ${params.burnTarget.toUpperCase()})`,
    `(TRILOBE MACRO: ${EDM_TRILOBE_MACRO_PATH})`,
    `(REFERENCE FOLDER: ${DEFAULT_ROKU_REFERENCE_PATH})`,
    `(SPARK GAP PER SIDE: ${params.sparkGapPerSideMm.toFixed(3)} MM)`,
    `(WEAR ALLOWANCE: ${params.wearAllowanceMm.toFixed(3)} MM)`,
    `(FINISH PASSES: ${params.finishPassCount})`,
    `(CHECKLIST: ${sequence})`,
    'G90 G17 G40 G49 G80',
    'G54',
    'T1 M06',
    'S18000 M03',
    'G00 G43 H01 Z50.',
    'M00 (VERIFY SYSTEM 3R ER-32 HOLDER DATUM AND STICK-OUT)',
    'M00 (VERIFY TRILOBE MACRO OFFLINE AGAINST CURRENT OFFSET TABLE)',
    'M00 (CONFIRM SPARK GAP AND WEAR COMP VALUES BEFORE RELEASE)',
    'M30',
    '%',
  ].join('\n');
}

function readFileAsBase64(file: File) {
  return file.arrayBuffer().then((buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  });
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SectionTag({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100">
      {children}
    </span>
  );
}

function SummaryMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs leading-5 text-slate-400">{hint}</div> : null}
    </div>
  );
}

function LatheFeaturePreview2D({
  features,
  selectedFeatureIds,
}: {
  features: TurningProgramFeature[];
  selectedFeatureIds: string[];
}) {
  const maxLength = Math.max(1, ...features.map((feature) => feature.length_mm || 0));
  const maxDiameter = Math.max(
    1,
    ...features.map((feature) => feature.od_mm ?? feature.diameter_mm ?? feature.id_mm ?? 0),
  );
  let cursor = 8;

  return (
    <svg viewBox="0 0 420 160" className="h-full w-full">
      <rect x="0" y="0" width="420" height="160" rx="22" fill="rgba(8,18,31,0.92)" />
      <line x1="18" x2="402" y1="80" y2="80" stroke="rgba(148,163,184,0.35)" strokeDasharray="5 5" />
      {features.map((feature) => {
        const width = Math.max(18, (feature.length_mm / maxLength) * 332);
        const diameter = feature.od_mm ?? feature.diameter_mm ?? feature.id_mm ?? maxDiameter * 0.6;
        const height = Math.max(18, (diameter / maxDiameter) * 96);
        const y = 80 - height / 2;
        const selected = selectedFeatureIds.includes(feature.id);
        const fill = selected ? 'rgba(34,211,238,0.86)' : 'rgba(56,189,248,0.28)';
        const stroke = selected ? 'rgba(165,243,252,0.92)' : 'rgba(125,211,252,0.38)';
        const currentX = cursor;
        cursor += width + 8;
        return (
          <g key={feature.id}>
            <rect x={currentX} y={y} width={width} height={height} rx="10" fill={fill} stroke={stroke} strokeWidth="1.4" />
            {feature.id_mm ? (
              <rect
                x={currentX + 6}
                y={80 - Math.max(8, height * 0.18)}
                width={Math.max(10, width - 12)}
                height={Math.max(16, height * 0.36)}
                rx="8"
                fill="rgba(4,12,23,0.88)"
                stroke="rgba(191,219,254,0.28)"
              />
            ) : null}
            <text x={currentX + width / 2} y={y - 8} textAnchor="middle" fill="rgba(226,232,240,0.88)" fontSize="10">
              {formatFeatureLabel(feature)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LatheFeaturePreview3D({
  features,
  selectedFeatureIds,
}: {
  features: TurningProgramFeature[];
  selectedFeatureIds: string[];
}) {
  const maxLength = Math.max(1, ...features.map((feature) => feature.length_mm || 0));
  const maxDiameter = Math.max(
    1,
    ...features.map((feature) => feature.od_mm ?? feature.diameter_mm ?? feature.id_mm ?? 0),
  );
  let cursor = 18;

  return (
    <svg viewBox="0 0 420 180" className="h-full w-full">
      <rect x="0" y="0" width="420" height="180" rx="24" fill="rgba(8,18,31,0.92)" />
      {features.map((feature) => {
        const width = Math.max(22, (feature.length_mm / maxLength) * 300);
        const diameter = feature.od_mm ?? feature.diameter_mm ?? feature.id_mm ?? maxDiameter * 0.6;
        const height = Math.max(22, (diameter / maxDiameter) * 84);
        const y = 90 - height / 2;
        const selected = selectedFeatureIds.includes(feature.id);
        const currentX = cursor;
        cursor += width + 10;
        return (
          <g key={feature.id}>
            <ellipse
              cx={currentX + width}
              cy={90}
              rx={height * 0.24}
              ry={height / 2}
              fill={selected ? 'rgba(34,211,238,0.42)' : 'rgba(56,189,248,0.18)'}
              stroke={selected ? 'rgba(165,243,252,0.88)' : 'rgba(125,211,252,0.28)'}
            />
            <rect
              x={currentX}
              y={y}
              width={width}
              height={height}
              rx={height / 2}
              fill={selected ? 'rgba(12,74,110,0.95)' : 'rgba(15,23,42,0.95)'}
              stroke={selected ? 'rgba(165,243,252,0.92)' : 'rgba(125,211,252,0.28)'}
            />
            <ellipse
              cx={currentX}
              cy={90}
              rx={height * 0.24}
              ry={height / 2}
              fill={selected ? 'rgba(103,232,249,0.78)' : 'rgba(125,211,252,0.42)'}
              stroke={selected ? 'rgba(224,242,254,0.92)' : 'rgba(191,219,254,0.32)'}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function CalculatorProgramWorkbench({
  mode,
  machineLabel,
  machineId,
  machineManufacturer,
  controllerId,
  materialLabel,
  materialGroup,
  stockDiameterMm,
  stockLengthMm,
  stockThicknessMm,
  targetRaUm,
  holderStyle,
  programReleasePath,
  surfaceLabel = 'shared machine workspace',
  wizardPath,
  wizardState,
  wizardLabel,
}: MachineWorkspaceContext & {
  surfaceLabel?: string;
  wizardPath?: string | null;
  wizardState?: unknown;
  wizardLabel?: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [viewMode, setViewMode] = useState<PartViewMode>('2d');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [latheDraft, setLatheDraft] = useState<LatheDraft | null>(null);
  const [selectedLatheFeatureIds, setSelectedLatheFeatureIds] = useState<string[]>([]);
  const [latheProgram, setLatheProgram] = useState<TurningProgramResult | null>(null);
  const [wireSource, setWireSource] = useState<WireSource | null>(null);
  const [wireContours, setWireContours] = useState<ContourData[] | null>(null);
  const [selectedWireContourIndices, setSelectedWireContourIndices] = useState<number[]>([]);
  const [wireProgram, setWireProgram] = useState<WedmProgramResult | null>(null);
  const [edmElectrodeSource, setEdmElectrodeSource] = useState<EdmElectrodeSource | null>(null);
  const [selectedEdmFeatureIds, setSelectedEdmFeatureIds] = useState<string[]>(
    EDM_ELECTRODE_FEATURE_OPTIONS.map((item) => item.id),
  );
  const [edmElectrodeProgram, setEdmElectrodeProgram] = useState<EdmElectrodeProgram | null>(null);
  const [radialOffsetMm, setRadialOffsetMm] = useState('0');
  const [axialOffsetMm, setAxialOffsetMm] = useState('0');
  const [stockAllowanceMm, setStockAllowanceMm] = useState('0');
  const [originX, setOriginX] = useState('0');
  const [originY, setOriginY] = useState('0');
  const [offsetOverrides, setOffsetOverrides] = useState('');
  const [batchQuantity, setBatchQuantity] = useState('1');
  const [qualityTier, setQualityTier] = useState<'prototype' | 'production' | 'aerospace'>('production');
  const [sparkGapPerSideMm, setSparkGapPerSideMm] = useState('0.08');
  const [wearAllowanceMm, setWearAllowanceMm] = useState('0.03');
  const [finishPassCount, setFinishPassCount] = useState('2');
  const [legacyReferencePath, setLegacyReferencePath] = useState(DEFAULT_ROKU_REFERENCE_PATH);

  useEffect(() => {
    setViewMode('2d');
    setError(null);
    setStatus(null);
    setSelectedFileName(null);
    setLatheDraft(null);
    setLatheProgram(null);
    setWireSource(null);
    setWireContours(null);
    setSelectedWireContourIndices([]);
    setWireProgram(null);
    setEdmElectrodeSource(null);
    setSelectedEdmFeatureIds(EDM_ELECTRODE_FEATURE_OPTIONS.map((item) => item.id));
    setEdmElectrodeProgram(null);
    setSelectedLatheFeatureIds([]);
    setRadialOffsetMm('0');
    setAxialOffsetMm('0');
    setStockAllowanceMm('0');
    setOriginX('0');
    setOriginY('0');
    setOffsetOverrides('');
    setBatchQuantity('1');
    setQualityTier('production');
    setSparkGapPerSideMm('0.08');
    setWearAllowanceMm('0.03');
    setFinishPassCount('2');
    setLegacyReferencePath(DEFAULT_ROKU_REFERENCE_PATH);
  }, [mode]);

  const latheSelectedFeatures = useMemo(
    () => latheDraft?.features.filter((feature) => selectedLatheFeatureIds.includes(feature.id)) ?? [],
    [latheDraft, selectedLatheFeatureIds],
  );

  async function handleUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setUploading(true);
    setGenerating(false);
    setError(null);
    setStatus(null);
    setSelectedFileName(file.name);
    setLatheProgram(null);
    setWireProgram(null);
    setEdmElectrodeProgram(null);

    try {
      if (mode === 'lathe') {
        const fileData = await readFileAsBase64(file);
        const inferredRoute = inferLatheUploadRoute(file.name);
        const response = await latheUploadFile({
          fileName: file.name,
          fileData,
          fileType: inferredRoute === 'unknown' ? undefined : inferredRoute,
        });
        const draft = normalizeLatheDraft({
          extractedData: response.extractedData,
          fileName: file.name,
          materialName: materialLabel,
          materialGroup,
          stockDiameterMm,
          stockLengthMm,
          machineLabel,
          machineManufacturer,
          controllerId,
        });
        setLatheDraft(draft);
        setSelectedLatheFeatureIds(draft.features.map((feature) => feature.id));
        setStatus(
          draft.features.length
            ? `Loaded ${draft.features.length} lathe features from ${file.name}.`
            : `PRISM read ${file.name}, but no turning features were ready for auto-programming yet.`,
        );
      } else if (mode === 'wire_edm') {
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.dxf')) {
          const dxfContent = await file.text();
          setWireSource({ kind: 'dxf', fileName: file.name, dxfContent });
          const response = await fetchJson<{ ok: boolean; data: { contours: ContourData[] } }>('/api/v1/edm/parse-geometry', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ dxf_content: dxfContent, format: 'dxf' }),
            fallbackMessage: 'Wire geometry parse failed',
          });
          const contours = response.data?.contours ?? [];
          setWireContours(contours);
          setSelectedWireContourIndices(
            contours.map((contour, index) => (contour.is_closed ? index : -1)).filter((index) => index >= 0),
          );
          setStatus(
            contours.length
              ? `Loaded ${contours.length} wire contours from ${file.name}.`
              : `PRISM accepted ${file.name}, but did not detect selectable contours.`,
          );
        } else {
          const contentBase64 = await readFileAsBase64(file);
          setWireSource({ kind: 'image', fileName: file.name, contentBase64 });
          setWireContours(null);
          setSelectedWireContourIndices([]);
          setStatus(`Loaded ${file.name}. DXF unlocks contour-by-contour selection, but images and PDFs can still auto-program.`);
        }
      } else {
        const format = inferEdmElectrodeSourceFormat(file.name);
        if (isParseableEdmElectrodeSourceFormat(format)) {
          const content = await file.text();
          setEdmElectrodeSource({
            kind: 'parseable',
            fileName: file.name,
            format,
            content,
          });
          setStatus(
            `Loaded ${formatEdmElectrodeSourceLabel(format)} from ${file.name}. PRISM can draft a Roku-Roku electrode NC and keep the System 3R / trilobe packet attached.`,
          );
        } else {
          const contentBase64 = await readFileAsBase64(file);
          setEdmElectrodeSource({
            kind: 'reference',
            fileName: file.name,
            format,
            contentBase64,
          });
          setStatus(
            `Loaded ${file.name}. PRISM will build a macro-ready copper-tungsten electrode packet for ${EDM_ELECTRODE_MACHINE.brand} ${EDM_ELECTRODE_MACHINE.model}; DXF, IGES, or structured text unlock the draft NC lane.`,
          );
        }
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      if (mode === 'lathe') {
        if (!latheDraft || !latheSelectedFeatures.length) {
          throw new Error('Select at least one turning feature before generating a program.');
        }
        const radialOffset = clampNumber(radialOffsetMm);
        const axialOffset = clampNumber(axialOffsetMm);
        const stockAllowance = Math.max(0, clampNumber(stockAllowanceMm));
        const adjustedFeatures = latheSelectedFeatures.map((feature) => ({
          ...feature,
          od_mm: feature.od_mm != null ? Math.max(0, feature.od_mm + radialOffset * 2) : feature.od_mm,
          id_mm: feature.id_mm != null ? Math.max(0, feature.id_mm - radialOffset * 2) : feature.id_mm,
          length_mm: Math.max(0.05, feature.length_mm + axialOffset),
          position_z_mm: feature.position_z_mm != null ? feature.position_z_mm + axialOffset : feature.position_z_mm,
        }));
        const result = await turningProgramGenerate({
          ...latheDraft.baseInput,
          part_number: latheDraft.partNumber,
          material: latheDraft.material,
          bar_stock_od_mm: Math.max(
            latheDraft.baseInput.bar_stock_od_mm,
            stockDiameterMm,
            (latheDraft.baseInput.finished_od_mm ?? stockDiameterMm) + stockAllowance * 2,
          ),
          part_length_mm: Math.max(latheDraft.baseInput.part_length_mm, stockLengthMm),
          machine_brand: latheDraft.baseInput.machine_brand ?? machineManufacturer,
          machine_model: latheDraft.baseInput.machine_model ?? machineLabel,
          controller: latheDraft.baseInput.controller ?? normalizeTurningController(controllerId),
          features: adjustedFeatures,
          optimization_target:
            qualityTier === 'aerospace'
              ? 'surface_quality'
              : Number(batchQuantity) > 20
                ? 'min_cost'
                : 'balanced',
        });
        setLatheProgram(result.result);
        setStatus(`PRISM generated ${result.result.program_line_count} lines with ${result.result.total_operations} operations.`);
      } else if (mode === 'wire_edm') {
        if (!wireSource) {
          throw new Error('Upload a print or CAD file before generating a wire program.');
        }
        const controller = normalizeWedmController(controllerId);
        const common = {
          material: materialLabel,
          thickness_mm: stockThicknessMm,
          target_ra_um: targetRaUm,
          controller,
          machine_id: machineId,
          wire_type: buildWireTypeFromHolder(holderStyle),
          part_name: fileNameBase(wireSource.fileName),
          part_number: fileNameBase(wireSource.fileName).toUpperCase(),
          stock_allowance_mm: clampNumber(stockAllowanceMm),
          origin: { x: clampNumber(originX), y: clampNumber(originY) },
          expected_units: 'mm' as const,
        };
        const overrideValues = offsetOverrides
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));
        const response = await wePhotoToProgram(
          wireSource.kind === 'dxf'
            ? {
              ...common,
              dxf_content: wireSource.dxfContent,
              contour_indices: selectedWireContourIndices,
              ...(overrideValues.length ? { offset_overrides_mm: overrideValues } : {}),
            } as never
            : {
              ...common,
              image_base64: wireSource.contentBase64,
              ...(overrideValues.length ? { offset_overrides_mm: overrideValues } : {}),
            } as never,
        );
        if (!response.data?.success) {
          throw new Error(response.data?.warnings?.join(', ') || 'Wire program generation failed.');
        }
        setWireProgram(response.data);
        setStatus(`PRISM generated ${response.data.line_count} lines across ${response.data.passes_per_profile} passes.`);
      } else {
        if (!edmElectrodeSource) {
          throw new Error('Upload a print, scan, or CAD file before generating the electrode packet.');
        }
        const selectedElectrodeFeatures = EDM_ELECTRODE_FEATURE_OPTIONS.filter((item) =>
          selectedEdmFeatureIds.includes(item.id),
        );
        if (!selectedElectrodeFeatures.length) {
          throw new Error('Select at least one electrode package item before generating the packet.');
        }

        const sparkGap = Math.max(0, clampNumber(sparkGapPerSideMm, 0.08));
        const wearAllowance = Math.max(0, clampNumber(wearAllowanceMm, 0.03));
        const finishPasses = Math.max(1, Math.round(clampNumber(finishPassCount, 2)));
        const partNumber = fileNameBase(edmElectrodeSource.fileName).toUpperCase() || 'ELECTRODE';
        const burnTarget = machineLabel ? `${machineLabel} sinker burn target` : 'Sinker EDM burn target';
        const setupNotes = [
          `Electrode material: ${EDM_ELECTRODE_MATERIAL}.`,
          `Electrode machine: ${EDM_ELECTRODE_MACHINE.brand} ${EDM_ELECTRODE_MACHINE.model} (${EDM_ELECTRODE_MACHINE.controller}).`,
          `Holder package: ${EDM_HOLDER_PACKAGE}.`,
          `Burn target: ${burnTarget}.`,
          `Spark gap per side: ${sparkGap.toFixed(3)} mm.`,
          `Wear allowance: ${wearAllowance.toFixed(3)} mm.`,
          `Finish passes expected: ${finishPasses}.`,
          `Trilobe macro: ${EDM_TRILOBE_MACRO_PATH}.`,
          `Legacy reference folder: ${legacyReferencePath}.`,
          `Included packet items: ${selectedElectrodeFeatures.map((item) => item.label).join(', ')}.`,
        ];

        let sourceMode: EdmElectrodeProgram['sourceMode'] = 'macro-packet';
        let programText = buildEdmElectrodeTemplateProgram({
          partNumber,
          sparkGapPerSideMm: sparkGap,
          wearAllowanceMm: wearAllowance,
          finishPassCount: finishPasses,
          burnTarget,
        });
        const warnings: string[] = [
          'PRISM currently carries the trilobe macro and Roku-Roku legacy library path as release metadata; live macro execution and indexed legacy mining still need the dedicated bridge.',
        ];

        if (edmElectrodeSource.kind === 'parseable' && edmElectrodeSource.content) {
          try {
            const response = await fetchJson<{ result: AutoPrintToProgramDraftResult }>('/api/v1/cam/auto-print-to-program', {
              method: 'POST',
              headers: getRequestHeaders(),
              body: JSON.stringify({
                content: edmElectrodeSource.content,
                format: edmElectrodeSource.format,
                process_type: 'milling',
                process_variant: 'sinker_edm_electrode',
                material_name: `${EDM_ELECTRODE_MATERIAL} EDM Electrode`,
                material_iso_group: 'N',
                machine_brand: EDM_ELECTRODE_MACHINE.brand,
                machine_model: EDM_ELECTRODE_MACHINE.model,
                controller: 'fanuc',
                max_spindle_rpm: EDM_ELECTRODE_MACHINE.maxSpindleRpm,
                optimization_target: 'surface_quality',
                holder_package: EDM_HOLDER_PACKAGE,
                fixture_system: 'System 3R',
                electrode_material: EDM_ELECTRODE_MATERIAL,
                spark_gap_per_side_mm: sparkGap,
                wear_allowance_mm: wearAllowance,
                finish_pass_count: finishPasses,
                legacy_macro_path: EDM_TRILOBE_MACRO_PATH,
                legacy_reference_path: legacyReferencePath,
                selected_packet_items: selectedElectrodeFeatures.map((item) => item.label),
                include_setup_sheet: true,
                include_tool_list: true,
                units: 'mm',
              }),
              fallbackMessage: 'Electrode auto-program request failed',
            });

            const candidate = response.result;
            if (candidate?.program_text?.trim()) {
              sourceMode = 'draft-nc';
              programText = candidate.program_text.trim();
            } else {
              warnings.push('Parsed electrode source did not return toolpath-ready NC, so PRISM emitted a macro-ready packet instead.');
            }
            if (candidate?.warnings?.length) {
              warnings.push(
                ...candidate.warnings.map((warning) =>
                  `${(warning.severity ?? 'info').toUpperCase()}: ${warning.message ?? 'No message provided.'}`,
                ),
              );
            }
          } catch (issue) {
            warnings.push(issue instanceof Error ? issue.message : 'Electrode auto-program request failed.');
          }
        } else {
          warnings.push(
            `${formatEdmElectrodeSourceLabel(edmElectrodeSource.format)} inputs currently produce a macro-ready packet while direct geometry-to-NC normalization is completed for sinker electrode work.`,
          );
        }

        setEdmElectrodeProgram({
          partNumber,
          electrodeMaterial: EDM_ELECTRODE_MATERIAL,
          holderPackage: EDM_HOLDER_PACKAGE,
          burnTarget,
          electrodeMachine: `${EDM_ELECTRODE_MACHINE.brand} ${EDM_ELECTRODE_MACHINE.model}`,
          macroPath: EDM_TRILOBE_MACRO_PATH,
          legacyProgramPath: legacyReferencePath,
          sourceMode,
          programText,
          lineCount: programText.split('\n').filter((line) => line.trim()).length,
          setupNotes,
          warnings,
        });
        setStatus(
          sourceMode === 'draft-nc'
            ? `PRISM generated a draft Roku-Roku electrode NC for ${partNumber}.`
            : `PRISM generated a macro-ready Roku-Roku electrode packet for ${partNumber}.`,
        );
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Program generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  const modeLabel = mode === 'lathe' ? 'Turning' : mode === 'wire_edm' ? 'Wire EDM' : 'Sinker EDM';
  const uploadSurfaceLabel = mode === 'lathe' ? 'lathe' : mode === 'wire_edm' ? 'wire EDM' : 'sinker EDM electrode';
  const uploadPlaceholder = mode === 'lathe'
    ? 'Drop turning prints, PDFs, STEP, IGES, or DXF here.'
    : mode === 'wire_edm'
      ? 'Drop wire DXF, photo, or PDF here.'
      : 'Drop electrode prints, scans, DXF, IGES, or structured notes here.';
  const uploadDescription = mode === 'lathe'
    ? 'PRISM will classify the upload through the lathe intake route, normalize the extracted features, and let you choose what actually gets programmed.'
    : mode === 'wire_edm'
      ? 'DXF unlocks contour-by-contour selection with a 2D and 3D preview. Images and PDFs still flow straight into wire auto-programming.'
      : 'Sinker EDM uses this lane to stage the electrode machining packet: copper-tungsten stock, System 3R ER-32 hardware, trilobe macro notes, and a draft Roku-Roku NC whenever the source is parseable.';
  const generateDisabled = uploading || generating || (
    mode === 'lathe'
      ? !latheSelectedFeatures.length
      : mode === 'wire_edm'
        ? !wireSource
        : !edmElectrodeSource || !selectedEdmFeatureIds.length
  );
  const edmSelectedFeatures = EDM_ELECTRODE_FEATURE_OPTIONS.filter((item) => selectedEdmFeatureIds.includes(item.id));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTag>Auto Programming</SectionTag>
            <SectionTag>{modeLabel}</SectionTag>
            {machineLabel ? <SectionTag>{machineLabel}</SectionTag> : null}
          </div>
          <div className="mt-3 text-xl font-black tracking-tight text-slate-50">
            {mode === 'edm'
              ? 'Upload the print, scan, or CAD, then let PRISM build the electrode packet and draft the Roku-Roku release.'
              : 'Upload the print or CAD, choose the features, then let PRISM write the program.'}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {mode === 'edm'
              ? 'This keeps sinker EDM tied to the real electrode-prep flow instead of burying the work in notes: print intake, System 3R ER-32 hardware, trilobe macro handoff, and Roku-Roku program release stay together.'
              : `This keeps the ${surfaceLabel} connected to the real print-to-program lanes while still letting you jump straight into the dedicated wizard when you need the full CAD, sketch, and release flow.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {wizardPath ? (
            <Link
              to={wizardPath}
              state={wizardState}
              className="rounded-full border border-violet-300/35 bg-violet-400/[0.12] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-50 transition hover:border-violet-200/55 hover:bg-violet-400/[0.18]"
            >
              {wizardLabel ?? 'Open guided wizard'}
            </Link>
          ) : null}
          <Link
            to={programReleasePath}
            className="rounded-full border border-cyan-300/35 bg-cyan-300/[0.08] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-200/55 hover:bg-cyan-300/[0.12]"
          >
            Open full Print to CNC
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.98fr)_minmax(340px,1.02fr)]">
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-[24px] border border-dashed border-cyan-400/25 bg-[linear-gradient(135deg,rgba(8,18,31,0.96)_0%,rgba(8,31,47,0.94)_48%,rgba(13,43,67,0.94)_100%)] px-6 py-8 text-left transition hover:border-cyan-300/45 hover:bg-[linear-gradient(135deg,rgba(8,21,36,0.98)_0%,rgba(9,35,55,0.96)_46%,rgba(14,48,74,0.96)_100%)]"
            aria-label={`Upload ${uploadSurfaceLabel} print or CAD`}
          >
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-100/80">Upload dropbox</div>
            <div className="mt-3 text-lg font-semibold text-white">
              {selectedFileName ?? uploadPlaceholder}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {uploadDescription}
            </p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={
              mode === 'lathe'
                ? '.pdf,.png,.jpg,.jpeg,.webp,.step,.stp,.iges,.igs,.dxf'
                : mode === 'wire_edm'
                  ? '.dxf,.pdf,.png,.jpg,.jpeg,.webp'
                  : '.dxf,.igs,.iges,.txt,.md,.csv,.pdf,.png,.jpg,.jpeg,.webp,.step,.stp'
            }
            className="hidden"
            aria-label={`Upload ${uploadSurfaceLabel} file input`}
            onChange={(event) => void handleUpload(event.target.files)}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <SummaryMetric
              label={mode === 'edm' ? 'Electrode material' : 'Material'}
              value={mode === 'edm' ? EDM_ELECTRODE_MATERIAL : materialLabel}
              hint={mode === 'edm' ? 'Copper-tungsten defaults stay pinned for the Roku-Roku electrode lane.' : 'Uses the active calculator material if the upload does not contain a trusted callout.'}
            />
            <SummaryMetric
              label={mode === 'lathe' ? 'Stock OD / length' : mode === 'wire_edm' ? 'Stock thickness' : 'Electrode machine'}
              value={
                mode === 'lathe'
                  ? `${stockDiameterMm.toFixed(1)} mm / ${stockLengthMm.toFixed(1)} mm`
                  : mode === 'wire_edm'
                    ? `${stockThicknessMm.toFixed(1)} mm`
                    : `${EDM_ELECTRODE_MACHINE.brand} ${EDM_ELECTRODE_MACHINE.model}`
              }
              hint={
                mode === 'lathe'
                  ? 'Used to fill bar-stock and part-length defaults.'
                  : mode === 'wire_edm'
                    ? 'Feeds the live wire thickness and program pass logic.'
                    : `${EDM_HOLDER_PACKAGE} holder stack with ${EDM_ELECTRODE_MACHINE.controller} control posture.`
              }
            />
            <SummaryMetric
              label={mode === 'edm' ? 'Macro / handoff' : 'Target finish'}
              value={mode === 'edm' ? 'Trilobe macro + burn packet' : `${targetRaUm.toFixed(2)} um Ra`}
              hint={mode === 'edm' ? 'Setup notes keep the H: drive macro path and Roku-Roku reference path attached to the release.' : 'PRISM keeps this aligned with the calculator finish target.'}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Part view</div>
                <div className="mt-2 text-sm font-semibold text-slate-100">
                  Toggle between the manufacturing sketch and a part-style preview before you program.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['2d', '3d'] as const).map((nextMode) => (
                  <button
                    key={nextMode}
                    type="button"
                    onClick={() => setViewMode(nextMode)}
                    className={`rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition ${
                      viewMode === nextMode
                        ? 'border-cyan-300/55 bg-cyan-300/[0.14] text-cyan-50'
                        : 'border-slate-700/60 bg-[#0f1f36] text-slate-300 hover:border-cyan-300/30 hover:text-slate-100'
                    }`}
                  >
                    {nextMode === '2d' ? '2D profile' : '3D part'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[22px] border border-cyan-400/14 bg-[#07111d] p-3">
              {mode === 'lathe' ? (
                latheDraft?.features.length ? (
                  viewMode === '2d'
                    ? <LatheFeaturePreview2D features={latheDraft.features} selectedFeatureIds={selectedLatheFeatureIds} />
                    : <LatheFeaturePreview3D features={latheDraft.features} selectedFeatureIds={selectedLatheFeatureIds} />
                ) : (
                  <div className="flex h-[180px] items-center justify-center text-sm text-slate-500">
                    Upload a turning print or CAD file to populate the preview.
                  </div>
                )
              ) : (
                mode === 'wire_edm' ? (
                  wireContours?.length ? (
                    viewMode === '2d'
                      ? (
                        <WireEdmContourPicker
                          contours={wireContours}
                          selectedIndices={selectedWireContourIndices}
                          onSelectionChange={setSelectedWireContourIndices}
                          thickness_mm={stockThicknessMm}
                        />
                      )
                      : (
                        <WireEdmContour3D
                          contours={wireContours}
                          selectedIndices={selectedWireContourIndices}
                          thickness_mm={stockThicknessMm}
                          onWallSelect={(index) => {
                            setSelectedWireContourIndices((current) =>
                              current.includes(index)
                                ? current.filter((value) => value !== index)
                                : [...current, index],
                            );
                          }}
                        />
                      )
                  ) : (
                    <div className="flex h-[180px] items-center justify-center text-sm text-slate-500">
                      Upload wire geometry to populate contour selection and preview.
                    </div>
                  )
                ) : edmElectrodeSource ? (
                  <div className="grid h-[180px] gap-3 md:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-[18px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(8,19,34,0.96)_0%,rgba(9,28,48,0.98)_100%)] p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/75">
                        {viewMode === '2d' ? 'Electrode packet preview' : 'Electrode cell context'}
                      </div>
                      <div className="mt-3 text-base font-semibold text-white">{fileNameBase(edmElectrodeSource.fileName)}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-300">
                        {viewMode === '2d'
                          ? `${formatEdmElectrodeSourceLabel(edmElectrodeSource.format)} source staged for the sinker electrode lane with copper-tungsten stock, System 3R ER-32 hardware, and trilobe macro handoff.`
                          : `${EDM_ELECTRODE_MACHINE.brand} ${EDM_ELECTRODE_MACHINE.model} stays pinned as the electrode machining cell while the selected sinker machine remains the burn target.`}
                      </div>
                      <div className="mt-4 grid gap-2 text-xs text-slate-300 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                          <div className="font-bold uppercase tracking-[0.16em] text-slate-400">Holder</div>
                          <div className="mt-1 text-sm text-white">{EDM_HOLDER_PACKAGE}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                          <div className="font-bold uppercase tracking-[0.16em] text-slate-400">Macro</div>
                          <div className="mt-1 text-sm text-white">Trilobe packet</div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-[#081220] p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Live handoff</div>
                      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                        <div>
                          <div className="font-semibold text-white">Burn target</div>
                          <div>{machineLabel ?? 'Sinker EDM cell selected on the calculator page'}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-white">Electrode path</div>
                          <div>{edmElectrodeSource.kind === 'parseable' ? 'Draft NC + macro packet' : 'Macro-ready setup packet'}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-white">Selected items</div>
                          <div>{edmSelectedFeatures.length} package checks active</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[180px] items-center justify-center text-sm text-slate-500">
                    Upload a print or CAD file to stage the sinker EDM electrode packet and Roku-Roku program release.
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,22,40,0.96)_0%,rgba(8,18,31,0.98)_100%)] px-4 py-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">User-tunable inputs</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {mode === 'lathe' ? (
                <>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200">Radial stock offset (mm)</span>
                    <input value={radialOffsetMm} onChange={(event) => setRadialOffsetMm(event.target.value)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200">Axial length offset (mm)</span>
                    <input value={axialOffsetMm} onChange={(event) => setAxialOffsetMm(event.target.value)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200">Bar stock allowance (mm)</span>
                    <input value={stockAllowanceMm} onChange={(event) => setStockAllowanceMm(event.target.value)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200">Batch quantity</span>
                    <input value={batchQuantity} onChange={(event) => setBatchQuantity(event.target.value)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-slate-200">Release target</span>
                    <select value={qualityTier} onChange={(event) => setQualityTier(event.target.value as typeof qualityTier)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100">
                      <option value="prototype">Prototype / prove-out</option>
                      <option value="production">Production</option>
                      <option value="aerospace">Aerospace / tight finish</option>
                    </select>
                  </label>
                </>
              ) : mode === 'wire_edm' ? (
                <>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200">Origin X (mm)</span>
                    <input value={originX} onChange={(event) => setOriginX(event.target.value)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200">Origin Y (mm)</span>
                    <input value={originY} onChange={(event) => setOriginY(event.target.value)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200">Stock allowance (mm)</span>
                    <input value={stockAllowanceMm} onChange={(event) => setStockAllowanceMm(event.target.value)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-slate-200">Per-pass offset overrides (mm, comma-separated)</span>
                    <input value={offsetOverrides} onChange={(event) => setOffsetOverrides(event.target.value)} placeholder="0.180, 0.060, 0.020" className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                </>
              ) : (
                <>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200">Spark gap per side (mm)</span>
                    <input value={sparkGapPerSideMm} onChange={(event) => setSparkGapPerSideMm(event.target.value)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200">Wear allowance (mm)</span>
                    <input value={wearAllowanceMm} onChange={(event) => setWearAllowanceMm(event.target.value)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200">Finish passes</span>
                    <input value={finishPassCount} onChange={(event) => setFinishPassCount(event.target.value)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200">Stock allowance (mm)</span>
                    <input value={stockAllowanceMm} onChange={(event) => setStockAllowanceMm(event.target.value)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-slate-200">Legacy Roku-Roku reference folder</span>
                    <input value={legacyReferencePath} onChange={(event) => setLegacyReferencePath(event.target.value)} className="w-full rounded-xl border border-slate-700/60 bg-[#0b1626] px-3 py-2 text-sm text-slate-100" />
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,22,40,0.96)_0%,rgba(8,18,31,0.98)_100%)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Feature selection</div>
                <div className="mt-2 text-sm font-semibold text-slate-100">
                  {mode === 'lathe'
                    ? 'Select the turning features that should feed PRISM auto-programming.'
                    : mode === 'wire_edm'
                      ? 'Select the wire contours that should be burned in the generated NC file.'
                      : 'Select the electrode package items that must stay attached to the Roku-Roku release and sinker handoff.'}
                </div>
              </div>
              {mode === 'lathe' && latheDraft?.features.length ? (
                <button
                  type="button"
                  onClick={() => setSelectedLatheFeatureIds(selectedLatheFeatureIds.length === latheDraft.features.length ? [] : latheDraft.features.map((feature) => feature.id))}
                  className="rounded-full border border-slate-700/60 bg-[#0f1f36] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200 transition hover:border-cyan-300/30"
                >
                  {selectedLatheFeatureIds.length === latheDraft.features.length ? 'Clear all' : 'Select all'}
                </button>
              ) : mode === 'edm' ? (
                <button
                  type="button"
                  onClick={() => setSelectedEdmFeatureIds(selectedEdmFeatureIds.length === EDM_ELECTRODE_FEATURE_OPTIONS.length ? [] : EDM_ELECTRODE_FEATURE_OPTIONS.map((item) => item.id))}
                  className="rounded-full border border-slate-700/60 bg-[#0f1f36] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200 transition hover:border-cyan-300/30"
                >
                  {selectedEdmFeatureIds.length === EDM_ELECTRODE_FEATURE_OPTIONS.length ? 'Clear all' : 'Select all'}
                </button>
              ) : null}
            </div>
            <div className="mt-4 max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {mode === 'lathe' ? (
                latheDraft?.features.length ? (
                  latheDraft.features.map((feature) => {
                    const active = selectedLatheFeatureIds.includes(feature.id);
                    return (
                      <button
                        key={feature.id}
                        type="button"
                        onClick={() => setSelectedLatheFeatureIds((current) => current.includes(feature.id) ? current.filter((value) => value !== feature.id) : [...current, feature.id])}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-cyan-300/45 bg-cyan-300/[0.09]' : 'border-white/10 bg-white/[0.03] hover:border-cyan-300/20'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-100">{formatFeatureLabel(feature)}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-400">
                              {feature.od_mm != null ? `OD ${feature.od_mm.toFixed(2)} mm` : null}
                              {feature.id_mm != null ? ` / ID ${feature.id_mm.toFixed(2)} mm` : null}
                              {` / L ${feature.length_mm.toFixed(2)} mm`}
                            </div>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${active ? 'bg-cyan-400 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                            {active ? 'Included' : 'Excluded'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
                    Upload a turning print or CAD file to unlock feature selection.
                  </div>
                )
              ) : (
                mode === 'wire_edm' ? (
                  wireContours?.length ? (
                    wireContours.map((contour, index) => {
                      const active = selectedWireContourIndices.includes(index);
                      return (
                        <button
                          key={`${contour.name ?? 'contour'}-${index}`}
                          type="button"
                          onClick={() => setSelectedWireContourIndices((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-cyan-300/45 bg-cyan-300/[0.09]' : 'border-white/10 bg-white/[0.03] hover:border-cyan-300/20'}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-100">{contour.name ?? `Contour ${index + 1}`}</div>
                              <div className="mt-1 text-xs leading-5 text-slate-400">
                                {contour.is_closed ? 'Closed profile' : 'Open path'} / {contour.perimeter_mm?.toFixed(1) ?? '0.0'} mm perimeter
                              </div>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${active ? 'bg-cyan-400 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                              {active ? 'Included' : 'Excluded'}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
                      DXF uploads unlock contour selection here. Images and PDFs can still auto-program without manual contour picking.
                    </div>
                  )
                ) : (
                  EDM_ELECTRODE_FEATURE_OPTIONS.map((item) => {
                    const active = selectedEdmFeatureIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedEdmFeatureIds((current) => current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id])}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-cyan-300/45 bg-cyan-300/[0.09]' : 'border-white/10 bg-white/[0.03] hover:border-cyan-300/20'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-100">{item.label}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</div>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${active ? 'bg-cyan-400 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                            {active ? 'Included' : 'Excluded'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {(status || error) ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-rose-500/30 bg-rose-950/30 text-rose-200' : 'border-cyan-300/25 bg-cyan-950/30 text-cyan-50'}`}>
          {error ?? status}
        </div>
      ) : null}

      {mode === 'lathe' && latheDraft?.ambiguities.length ? (
        <div className="rounded-2xl border border-amber-300/25 bg-amber-950/20 px-4 py-4 text-sm text-amber-50">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/80">Attention points</div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-100">
            {latheDraft.ambiguities.slice(0, 4).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generateDisabled}
          className="inline-flex items-center rounded-full border border-cyan-300/40 bg-cyan-300/[0.12] px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/55 hover:bg-cyan-300/[0.18] disabled:cursor-not-allowed disabled:border-slate-700/60 disabled:bg-slate-900 disabled:text-slate-500"
        >
          {uploading ? 'Reading upload...' : generating ? 'PRISM is programming...' : 'PRISM auto-program'}
        </button>
        <div className="text-sm text-slate-400">
          {mode === 'lathe'
            ? 'Selected turning features, stock offsets, and release target feed the real turning program engine.'
            : mode === 'wire_edm'
              ? 'Selected contours, origin, and offset overrides feed the live wire program route.'
              : 'Selected electrode package items, macro notes, and Roku-Roku defaults feed the sinker EDM electrode release lane.'}
        </div>
      </div>

      {latheProgram ? (
        <div className="rounded-[24px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(7,17,29,0.98)_0%,rgba(11,22,38,0.98)_100%)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/80">Lathe program ready</div>
              <div className="mt-2 text-xl font-black tracking-tight text-white">{latheProgram.part_number || 'Turning program'}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {latheProgram.total_operations} operations, {latheProgram.total_tool_changes} tool changes, {latheProgram.confidence_score}% confidence.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadText(`${latheProgram.part_number || 'prism-lathe'}.nc`, latheProgram.program_text)} className="rounded-full border border-emerald-400/35 bg-emerald-500/[0.12] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/[0.18]">
                Download .NC
              </button>
              <button type="button" onClick={() => downloadText(`${latheProgram.part_number || 'prism-lathe'}-setup.txt`, latheProgram.setup_notes.join('\n'))} className="rounded-full border border-cyan-300/35 bg-cyan-300/[0.08] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/[0.14]">
                Download setup
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SummaryMetric label="Program lines" value={String(latheProgram.program_line_count)} />
            <SummaryMetric label="Cycle time" value={`${(latheProgram.estimated_cycle_time_sec / 60).toFixed(1)} min`} />
            <SummaryMetric label="Material" value={latheProgram.material} />
          </div>
          {latheProgram.warnings?.length ? (
            <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-950/20 px-4 py-4 text-sm text-amber-100">
              {latheProgram.warnings.map((warning) => `${warning.severity.toUpperCase()}: ${warning.message}`).join(' | ')}
            </div>
          ) : null}
          <pre className="mt-4 max-h-[260px] overflow-auto rounded-2xl border border-white/10 bg-[#050c16] px-4 py-4 text-xs leading-6 text-slate-200">
            {latheProgram.program_text}
          </pre>
        </div>
      ) : null}

      {wireProgram ? (
        <div className="rounded-[24px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(7,17,29,0.98)_0%,rgba(11,22,38,0.98)_100%)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/80">Wire program ready</div>
              <div className="mt-2 text-xl font-black tracking-tight text-white">{wireProgram.setup_sheet?.part_name ?? wireProgram.controller}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {wireProgram.line_count} lines, {wireProgram.passes_per_profile} passes per profile, predicted {wireProgram.predicted_ra_um.toFixed(2)} um Ra.
              </p>
            </div>
            <button type="button" onClick={() => weExportGcode(wireProgram.program_text, `${wireProgram.setup_sheet?.part_number ?? 'prism-wire'}.nc`)} className="rounded-full border border-emerald-400/35 bg-emerald-500/[0.12] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/[0.18]">
              Download .NC
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SummaryMetric label="Profiles" value={String(wireProgram.profiles_cut)} />
            <SummaryMetric label="Estimated time" value={`${wireProgram.estimated_time_min.toFixed(1)} min`} />
            <SummaryMetric label="Wire needed" value={`${wireProgram.wire_consumption_m.toFixed(1)} m`} />
          </div>
          {wireProgram.warnings?.length ? (
            <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-950/20 px-4 py-4 text-sm text-amber-100">
              {wireProgram.warnings.join(' | ')}
            </div>
          ) : null}
          <pre className="mt-4 max-h-[260px] overflow-auto rounded-2xl border border-white/10 bg-[#050c16] px-4 py-4 text-xs leading-6 text-slate-200">
            {wireProgram.program_text}
          </pre>
        </div>
      ) : null}

      {edmElectrodeProgram ? (
        <div className="rounded-[24px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(7,17,29,0.98)_0%,rgba(11,22,38,0.98)_100%)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/80">
                {edmElectrodeProgram.sourceMode === 'draft-nc' ? 'Electrode NC ready' : 'Electrode packet ready'}
              </div>
              <div className="mt-2 text-xl font-black tracking-tight text-white">{edmElectrodeProgram.partNumber}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {edmElectrodeProgram.electrodeMachine}, {edmElectrodeProgram.holderPackage}, {edmElectrodeProgram.electrodeMaterial}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadText(`${edmElectrodeProgram.partNumber || 'prism-electrode'}.nc`, edmElectrodeProgram.programText)} className="rounded-full border border-emerald-400/35 bg-emerald-500/[0.12] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/[0.18]">
                Download .NC
              </button>
              <button type="button" onClick={() => downloadText(`${edmElectrodeProgram.partNumber || 'prism-electrode'}-setup.txt`, edmElectrodeProgram.setupNotes.join('\n'))} className="rounded-full border border-cyan-300/35 bg-cyan-300/[0.08] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/[0.14]">
                Download setup
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SummaryMetric label="Source mode" value={edmElectrodeProgram.sourceMode === 'draft-nc' ? 'Draft NC' : 'Macro packet'} />
            <SummaryMetric label="Burn target" value={edmElectrodeProgram.burnTarget} />
            <SummaryMetric label="Program lines" value={String(edmElectrodeProgram.lineCount)} />
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Release notes</div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
              {edmElectrodeProgram.setupNotes.map((note) => (
                <li key={note}>- {note}</li>
              ))}
            </ul>
          </div>
          {edmElectrodeProgram.warnings.length ? (
            <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-950/20 px-4 py-4 text-sm text-amber-100">
              {edmElectrodeProgram.warnings.join(' | ')}
            </div>
          ) : null}
          <pre className="mt-4 max-h-[260px] overflow-auto rounded-2xl border border-white/10 bg-[#050c16] px-4 py-4 text-xs leading-6 text-slate-200">
            {edmElectrodeProgram.programText}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
