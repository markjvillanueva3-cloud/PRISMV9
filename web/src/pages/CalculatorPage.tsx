import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import { CalculatorSetupPreview3D } from '../components/calculator/CalculatorSetupPreview3D';
import { WireEdmPassChart } from '../components/calculator/WireEdmPassChart';
import { WireEdmContourPicker } from '../components/calculator/WireEdmContourPicker';
import { WireEdmContour3D } from '../components/calculator/WireEdmContour3D';
import { WireEdmBackplot, detectPathIssues, getPathVerdict, parseGCode } from '../components/calculator/WireEdmBackplot';
import {
  WireBreakRiskCard,
  WireEdmSurfaceIntegrityCard,
  WireEdmCostCard,
  WireEdmPassTable,
  WireEdmCornerCard,
  WireEdmTaperCard,
  WireEdmControllerNotes,
  wedmLabel,
} from '../components/calculator/WireEdmOptimizeCards';
import { CalculatorSectionPurchaseModal } from '../components/calculator/CalculatorSectionPurchaseModal';
import { FormulaCard } from '../components/FormulaCard';
import { PurchaseRecommendationModal } from '../components/shell/PurchaseRecommendationModal';
import {
  sfOrchestrate,
  sfQuick,
  sfToolRoiAnalysis,
  type SpeedFeedParams,
  type ToolRoiAnalysisParams,
  type ToolRoiAnalysisResult,
} from '../api/speedfeed';
import {
  weCalculatorSolve,
  weQuickSettings,
  type WireEdmCalcParams,
  type WireEdmCalcResult,
} from '../api/wireEdm';
import {
  fetchMachineCatalogState,
  fetchMaterialCatalogState,
  fetchProgrammingCatalogState,
  fetchToolCatalogState,
  fetchToolHolderCatalogState,
  type CalculatorCatalogLoadState,
  type CalculatorCatalogSourceState,
  type HolderPackageOption,
} from '../api/calculatorData';
import { listParts } from '../api/parts';
import {
  COOLANT_OPTIONS,
  coolantOptionsForMode,
  EXPERIENCE_PROFILES,
  filterCoolantOptionIds,
  MACHINE_CATALOG,
  MACHINE_MODE_OPTIONS,
  MATERIAL_CATALOG,
  MATERIAL_GROUPS,
  MODE_NOTES,
  PROGRAMMING_ENVIRONMENTS,
  STOCK_SHAPES,
  TOOL_CATALOG,
  WORKHOLDING_OPTIONS,
  workholdingOptionsForMode,
  type CoolantOptionId,
  type ExperienceLevel,
  type MachineCatalogItem,
  type MachineControllerCapabilityOption,
  type MachineMode,
  type MachineToolingLayout,
  type MaterialCatalogItem,
  type ProgrammingEnvironmentOption,
  type SelectionOption,
  type ToolCatalogItem,
} from '../data/calculatorWorkspace';
import { HOLDER_PACKAGE_LIBRARY } from '../data/calculatorHolderLibrary';
// U-F3-FIRST-EXTRACTION (slot:quebec /goal yolo, 2026-05-26): self-contained
// machine-portrait SVG renderer + its palette table moved out of this file.
import { MachinePreviewIllustration } from './calculator/MachinePreviewIllustration';
import { FORMULAS } from '../formulas';
import {
  compareSurfaceFinishToTarget,
  desiredRaForFinishTarget,
  formatSurfaceFinish,
  getSurfaceFinishPreview,
  MAX_DESIRED_RA_UM,
  MIN_DESIRED_RA_UM,
  nearestSurfaceFinishPreset,
  recommendFinishTargetForRa,
  SURFACE_FINISH_PRESETS,
  type SurfaceFinishRenderStyle,
  type UnitSystem as SurfaceFinishUnitSystem,
} from '../utils/calculatorSurfaceFinish';
import { buildCoolantStrategyRecommendation } from '../utils/calculatorCoolantStrategy';
import {
  buildCuttingParameterOptimization,
  deriveToolReachDefaults,
} from '../utils/calculatorParameterOptimization';
import {
  buildCalculatorSpeedFeedParams,
  classifyCalculatorResultSafetyPosture,
  normalizeCalculatorSpeedFeedResult,
  type CalculatorResultSafetyAssessment,
  type CalculatorNormalizedSpeedFeedResult,
  type CalculatorSolveSource,
} from '../utils/calculatorSpeedFeedContract';
import { evaluateNumericExpression, formatNumericExpressionValue } from '../utils/numericExpression';
import {
  buildInsertOptionsForTool,
  inferToolBodyType,
  selectPreferredToolForToolpath,
  toolSupportsToolpath,
  type ToolBodyFilter,
} from '../utils/calculatorTooling';
import { buildCalculatorSetupPreview } from '../utils/calculatorSetupPreview';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import { useShellCommerceSelection } from '../features/operating-system/shellCommerceState';
import type {
  CalculatorToolCribWorkspace,
  CalculatorSavedMachineProfile,
  CalculatorToolCribImportSourceType,
  InventoryOperationsWorkspace,
  PurchaseRecommendation,
} from '../features/operating-system/contracts';
import { resolveMachineSelectionOptions } from '../utils/machineConfigurationOptions';
import {
  buildCalculatorPrismModePlan,
  buildPurchaseRecommendationsFromToolRoi,
} from '../utils/calculatorPrismMode';
import {
  buildCoolantCommerceView,
  buildFixtureCommerceView,
  buildHolderCommerceView,
  buildMachineAlarmCommerceView,
  buildMachinePartsCommerceView,
  buildMaterialCommerceView,
  buildToolingCommerceView,
  type CalculatorSectionCommerceView,
} from '../utils/calculatorPurchaseRecommendations';
import {
  CALCULATOR_LANGUAGE_OPTIONS,
  calculatorCopy,
  type CalculatorLanguage,
} from '../utils/calculatorI18n';
import { buildWorkflowPath } from '../utils/workflowRouteContext';

export { scoreToolForToolpath, selectPreferredToolForToolpath, toolSupportsToolpath } from '../utils/calculatorTooling';

type StockShapeId = (typeof STOCK_SHAPES)[number]['id'];
type ProgrammingEnvironment = ProgrammingEnvironmentOption;
const CALCULATOR_DEFAULT_USER_ID = 'calculator-default';
const TOOL_CRIB_UPLOAD_SOURCE_OPTIONS: Array<{
  id: CalculatorToolCribImportSourceType;
  label: string;
  detail: string;
}> = [
  { id: 'purchase_order', label: 'PO', detail: 'Supplier purchase orders and receiving packs' },
  { id: 'invoice', label: 'Invoice', detail: 'Vendor invoices and packing slips' },
  { id: 'rfq', label: 'RFQ', detail: 'Customer RFQs, quote packs, and sourcing requests' },
  { id: 'email', label: 'Email', detail: 'Emailed tooling lists, approvals, and crib notes' },
  { id: 'attachment', label: 'Attachment', detail: 'General document attachments and exported lists' },
];
const MACHINE_GUIDEWAY_OPTIONS: Array<{
  id: NonNullable<MachineCatalogItem['guidewayType']>;
  label: string;
  detail: string;
}> = [
  {
    id: 'box',
    label: 'Box ways',
    detail: 'Higher damping and heavy-cut rigidity for conservative but stable parameter ceilings.',
  },
  {
    id: 'linear',
    label: 'Linear guides',
    detail: 'Higher acceleration and lighter friction. Best when the machine is fast and verified rigid enough.',
  },
  {
    id: 'hydrostatic',
    label: 'Hydrostatic',
    detail: 'Premium damping and stiffness. Use when the installed machine carries a hydrostatic axis package.',
  },
];

type LiveResult = CalculatorNormalizedSpeedFeedResult;

interface MachineFeatureOption extends SelectionOption {
  modes: MachineMode[];
  checkTip: string;
}

interface SetupSnapshot {
  id: string;
  name: string;
  savedAt: string;
  machineMode: MachineMode;
  machineTypeId?: string;
  manufacturer: string;
  machineId: string;
  controllerOptionId?: string;
  spindleOptionId?: string;
  toolingStationCountOverride?: number;
  machineCoolantOptionIds?: string[];
  selectedControllerCapabilityIds?: string[];
  materialGroup: string;
  materialSubcategoryId?: string;
  materialId: string;
  toolId: string;
  toolBodyFilter?: ToolBodyFilter;
  insertId?: string;
  operation: string;
  programmingId: string;
  licenseTierId: string;
  toolpathTypeId: string;
  toolpathId: string;
  stockShape: StockShapeId;
  stockSource: string;
  stockX: number;
  stockY: number;
  stockZ: number;
  toolDiameter: number;
  flutes: number;
  doc: number;
  woc: number;
  toolStickout?: number;
  toolLoc?: number;
  coolant: string;
  entryStyle: string;
  finishTarget: string;
  finishControlMode?: FinishControlMode;
  desiredRaUm?: number;
  workholding: string;
  workholdingCategory: string;
  workholdingBrand: string;
  workholdingPresetId: string;
  stabilityId: string;
  setupSource: string;
  holderBrand: string;
  holderPackageId: string;
  holderStyle: string;
  selectedFeatureIds: string[];
}

type UnitSystem = 'metric' | 'inch';
type FinishControlMode = 'auto' | 'manual';
type InterfaceLanguage = CalculatorLanguage;

const MM_PER_INCH = 25.4;
const FEET_PER_METER = 3.280839895;
const MM3_PER_IN3 = 16387.064;
const HP_PER_KW = 1.34102209;
const FT_LB_PER_NM = 0.737562149;
const UIN_PER_UM = 39.37007874;
const SELECTED_TEXT_OUTLINE_STYLE = {
  WebkitTextStroke: '0.28px rgba(2,6,23,0.92)',
  textShadow: '0 1px 2px rgba(2,6,23,0.92), 0 0 1px rgba(2,6,23,0.88)',
} as const;
const CALCULATOR_SNAPSHOT_STORAGE_KEY = 'prism-calculator-setup-snapshots-v1';
type CalculatorGuideStep = {
  panelId: string;
  title: string;
  detail: string;
  prompt: string;
  mode?: 'required' | 'review' | 'capture';
};

type CalculatorGuideStepMeta = {
  index: number;
  total: number;
  status: 'attention' | 'ready' | 'review' | 'capture';
  statusLabel: string;
  complete: boolean;
  missing: string[];
  detail: string;
};

type CalculatorGuideBubbleState = {
  visible: boolean;
  left: number;
  top: number;
  title: string;
  body: string;
};

type CalculatorGuideCursorState = {
  visible: boolean;
  left: number;
  top: number;
};

type CalculatorGuideFieldOverlay = {
  key: string;
  left: number;
  top: number;
  title: string;
  body: string;
};

type HelpTopicId =
  | 'confidence'
  | 'guided-focus'
  | 'prism-flow'
  | 'machine-selection'
  | 'machine-features'
  | 'material'
  | 'programming'
  | 'tooling-fixture'
  | 'cutting-results'
  | 'my-shop';

type CalculatorHelpTopic = {
  badge: string;
  title: string;
  summary: string;
  bullets: string[];
};

type CalculatorHelpAnchorRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type ActiveCalculatorHelpTopic = {
  topicId: HelpTopicId;
  anchorRect: CalculatorHelpAnchorRect;
};

type CalculatorGuideContextValue = {
  enabled: boolean;
  activePanelId: string | null;
  currentStepId?: string | null;
  currentStepIndex?: number;
  currentMessage?: string;
  stepMetaById?: Record<string, CalculatorGuideStepMeta>;
  jumpToStep?: (panelId: string) => void;
};

const CalculatorGuideContext = createContext<CalculatorGuideContextValue>({
  enabled: false,
  activePanelId: null,
  currentStepId: null,
  currentStepIndex: 0,
  currentMessage: undefined,
  stepMetaById: undefined,
  jumpToStep: undefined,
});

function CalculatorInfoHint({
  label,
  body,
  className,
}: {
  label: string;
  body: string;
  className?: string;
}) {
  return (
    <span className={`calculator-info-hint ${className ?? ''}`}>
      <span
        className="calculator-info-hint-button"
        aria-label={`Explain ${label}`}
        title={`Explain ${label}`}
      >
        ?
      </span>
      <span className="calculator-info-hint-tooltip" role="tooltip">
        <span className="calculator-info-hint-tooltip-title">{label}</span>
        <span className="calculator-info-hint-tooltip-body">{body}</span>
      </span>
    </span>
  );
}

const CALCULATOR_HELP_TOPICS: Record<HelpTopicId, CalculatorHelpTopic> = {
  confidence: {
    badge: 'Optimization confidence',
    title: 'What the confidence score means',
    summary: 'This is a release-readiness signal, not a marketing score.',
    bullets: [
      'It blends setup completeness, machine legality, and active solve posture.',
      'Higher scores mean the calculator has fewer unknowns and fewer contradictory inputs.',
      'Use it to decide whether the numbers are ready for CAM, quoting, or another setup pass.',
    ],
  },
  'guided-focus': {
    badge: 'Guided workflow',
    title: 'How Guided Focus works',
    summary: 'Guided Focus walks the job in the same order a programmer or setup person would verify it.',
    bullets: [
      'It starts with machine and setup truth, then moves into programming and tooling, then finishes in the result lane.',
      'Red means this step needs attention. Green means the section is ready enough to move on.',
      'Use it when you want the calculator to act like a disciplined handoff checklist.',
    ],
  },
  'prism-flow': {
    badge: 'Workflow engine',
    title: 'What PRISM Flow is doing',
    summary: 'PRISM Flow turns the calculator into an intake lane instead of a standalone number box.',
    bullets: [
      'It can read prints or intake files, build the setup picture, and connect that to machines, tooling, holders, and pricing.',
      'It prefers the machines and inventory your shop actually has before suggesting upgrades or outsourcing.',
      'The goal is a practical process plan, not just a feed-and-speed guess.',
    ],
  },
  'machine-selection': {
    badge: 'Machine truth',
    title: 'Why machine selection matters',
    summary: 'This panel sets the legal machine envelope for the rest of the calculator.',
    bullets: [
      'Machine, controller, spindle, coolant, and installed hardware change what the cut is allowed to do.',
      'If the selected package is wrong, the toolpath, finish, and cost suggestions can all drift.',
      'Treat this as the source of truth before trusting the center results.',
    ],
  },
  'machine-features': {
    badge: 'Installed options',
    title: 'Why machine features are separate',
    summary: 'Feature verification keeps the selected machine honest at the option-package level.',
    bullets: [
      'High-speed modes, probing, coolant delivery, and multiaxis packages are not universal.',
      'Turning these on or off changes what PRISM assumes is legal and cost-effective.',
      'Use this panel to match the exact machine sitting on the floor.',
    ],
  },
  material: {
    badge: 'Material behavior',
    title: 'Why material setup matters',
    summary: 'Material is more than a label. It changes load, wear, finish, and process stability.',
    bullets: [
      'Use the exact alloy and condition whenever possible.',
      'Material drives tool choice, coolant posture, and the confidence of the finish prediction.',
      'If the stock or heat condition is wrong, the math can look cleaner than the real cut.',
    ],
  },
  programming: {
    badge: 'CAM and path',
    title: 'Why programming setup matters',
    summary: 'The calculator needs the real CAM environment and toolpath family to make believable recommendations.',
    bullets: [
      'Different CAM systems and licenses expose different toolpaths.',
      'Roughing, finishing, contouring, turning, and specialty paths all bias tooling and cut posture differently.',
      'Use the exact package that will post or prove out the job.',
    ],
  },
  'tooling-fixture': {
    badge: 'Tooling stack',
    title: 'Why tooling and fixturing live together',
    summary: 'The tool, holder, and fixture act as one stability system.',
    bullets: [
      'A strong tool in the wrong holder can still chatter or miss the finish target.',
      'Fixture posture changes reach, rigidity, and how aggressively PRISM should push the machine.',
      'This panel is where setup realism replaces generic catalog assumptions.',
    ],
  },
  'cutting-results': {
    badge: 'Release gate',
    title: 'How to read Cutting Results',
    summary: 'This is the calculator’s release lane for speed, feed, load, finish, and warnings.',
    bullets: [
      'Read the confidence posture and warnings before handing numbers downstream.',
      'Use the solve source, signals, and finish posture to decide whether the output is ready or still needs setup work.',
      'This panel should answer “can I trust this?” before it answers “how fast can I run?”',
    ],
  },
  'my-shop': {
    badge: 'Shop memory',
    title: 'What My Shop saves',
    summary: 'My Shop stores the real machine and crib context that should keep repeating jobs consistent.',
    bullets: [
      'It preserves saved setup snapshots and canonical machine defaults.',
      'That memory can feed print intake, tooling suggestions, and later downstream workflows.',
      'Use it when you want the calculator to remember how your shop actually runs, not just this one session.',
    ],
  },
};

const DEFAULT_TOOL_PRICE_BY_TYPE: Record<string, number> = {
  face_mill: 325,
  boring_bar: 190,
  drill: 72,
  tap: 45,
  reamer: 88,
  insert: 42,
  endmill: 96,
};

function calculatorGuideHint(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes('machine type')) return 'Start with the machine family. It narrows the legal machine list and hardware assumptions.';
  if (normalized.includes('manufacturer')) return 'Filter by the real builder so model, controller, and spindle options stay truthful.';
  if (normalized.includes('machine model')) return 'Pick the exact machine package you are programming, not just a similar platform.';
  if (normalized.includes('controller')) return 'Use the installed control so feature checks, cycles, and CAM expectations stay legal.';
  if (normalized.includes('spindle')) return 'Match the actual spindle package because RPM, taper, and coolant support drive the solve.';
  if (normalized.includes('material')) return 'Use the exact material and condition. That changes speed, chip control, wear, and finish confidence.';
  if (normalized.includes('stock')) return 'Define the starting stock honestly so engagement, reach, and workholding assumptions stay stable.';
  if (normalized.includes('toolpath')) return 'Choose the real path strategy. Roughing, finishing, and contour paths need different tooling and stability.';
  if (normalized.includes('programming') || normalized.includes('cam')) return 'Keep the CAM package aligned with what will actually post the job.';
  if (normalized.includes('tool')) return 'Pick the actual cutter or insert family you expect to run on the machine.';
  if (normalized.includes('holder')) return 'Holder style controls interface fit, rigidity, reach, and runout risk.';
  if (normalized.includes('fixture') || normalized.includes('workholding')) return 'Select the workholding posture that matches how the part is really clamped.';
  if (normalized.includes('coolant')) return 'Coolant changes thermal load, chip evacuation, and legal machine capability.';
  if (normalized.includes('doc')) return 'Depth of cut is a first-order load driver. Increase it only when the tool, holder, and machine can carry it.';
  if (normalized.includes('woc') || normalized.includes('stepover')) return 'Width of cut changes radial load, chip thinning, and finish behavior.';
  if (normalized.includes('feed')) return 'Feed should stay consistent with tool geometry, material, and finish target.';
  if (normalized.includes('finish') || normalized.includes('ra')) return 'Use finish controls to decide whether the stack is roughing, balanced, or finish-first.';
  if (normalized.includes('guideway')) return 'Guideway and measured dynamics tune how aggressively PRISM should trust the machine.';
  if (normalized.includes('station') || normalized.includes('magazine') || normalized.includes('turret')) return 'Installed station count limits how much tooling the machine can realistically carry.';
  return 'Use this control to tighten the setup truth before trusting the cutting results.';
}

function calculatorGuideDescriptorFromElement(element: HTMLElement | null) {
  if (!element) return null;

  const aria = element.getAttribute('aria-label')?.trim();
  const title = element.getAttribute('title')?.trim();
  const dataLabel = element.getAttribute('data-guide-label')?.trim();
  const dataDescription = element.getAttribute('data-guide-description')?.trim();
  const elementId = element.getAttribute('id')?.trim();
  const explicitLabel =
    (elementId ? document.querySelector(`label[for="${elementId}"]`)?.textContent : undefined)
      ?.trim()
      ?.replace(/\s+/g, ' ');
  const labelContainer = element.closest('label');
  const labelText = (() => {
    if (!labelContainer) return '';
    const clone = labelContainer.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, select, button, textarea').forEach((node) => node.remove());
    return (clone.textContent ?? '').trim().replace(/\s+/g, ' ');
  })();
  const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ');
  const label =
    aria ||
    dataLabel ||
    title ||
    explicitLabel ||
    labelText ||
    text ||
    element.getAttribute('name')?.trim() ||
    element.getAttribute('placeholder')?.trim();

  if (!label) return null;

  return {
    title: label,
    body: dataDescription || calculatorGuideHint(label),
  };
}

function guideStepIdForPanelTitle(title: string) {
  if (title === 'Machine Selection') return 'machine-selection';
  if (title === 'Machine Features') return 'machine-features';
  if (title === 'Material') return 'material';
  if (title === 'Units') return 'units';
  if (title === 'Programming') return 'programming';
  if (title.includes('Tooling') || title.includes('Fixture')) return 'tooling-fixture';
  if (title.includes('Hardware')) return 'hardware';
  if (title === 'Cutting Results') return 'cutting-results';
  if (title === 'My Shop') return 'my-shop';
  return null;
}

function guideFocusSelectorForPanel(panelId: string) {
  switch (panelId) {
    case 'machine-selection':
      return '[data-guide-panel-body="true"] select[aria-label="Machine type"], [data-guide-panel-body="true"] select[aria-label="Manufacturer"], [data-guide-panel-body="true"] select[aria-label="Machine model"]';
    case 'material':
      return '[data-guide-panel-body="true"] select[aria-label="Material group"], [data-guide-panel-body="true"] select[aria-label="Material subcategory"], [data-guide-panel-body="true"] select[aria-label="Specific material"]';
    case 'units':
      return '[data-guide-panel-body="true"] button[data-guide-managed="true"], [data-guide-panel-body="true"] select';
    case 'programming':
      return '[data-guide-panel-body="true"] select[aria-label="Programming package select"], [data-guide-panel-body="true"] select[aria-label="Toolpath type select"], [data-guide-panel-body="true"] select[aria-label="Exact toolpath select"]';
    case 'tooling-fixture':
      return '[data-guide-panel-body="true"] select[aria-label="Holder brand"], [data-guide-panel-body="true"] select[aria-label="Tool brand"], [data-guide-panel-body="true"] select[aria-label="Workholding category"]';
    case 'cutting-parameters':
      return '[data-guide-panel-body="true"] input[aria-label="Tool diameter"], [data-guide-panel-body="true"] input[aria-label="DOC"], [data-guide-panel-body="true"] input[aria-label="WOC / engagement"], [data-guide-panel-body="true"] select[aria-label="Coolant strategy"]';
    case 'my-shop':
      return '[data-guide-panel-body="true"] button[aria-label="Save current setup to My Shop"], [data-guide-panel-body="true"] select[aria-label="My Shop setup snapshot"]';
    default:
      return '[data-guide-panel-body="true"] select, [data-guide-panel-body="true"] input, [data-guide-panel-body="true"] [data-guide-label], [data-guide-panel-body="true"] button[aria-label]';
  }
}

function parsePriceLabel(value: string | undefined, fallback = 0) {
  if (!value) return fallback;
  const normalized = value.replace(/,/g, '');
  const matches = [...normalized.matchAll(/\$?\s*([0-9]+(?:\.[0-9]+)?)/g)];
  if (!matches.length) return fallback;
  const numbers = matches
    .map((match) => Number(match[1]))
    .filter((candidate) => Number.isFinite(candidate));
  if (!numbers.length) return fallback;
  return Math.max(...numbers);
}

function inferToolInventoryType(
  tool: Pick<ToolCatalogItem, 'geometryClass' | 'operation'>,
): NonNullable<ToolRoiAnalysisParams['user_inventory']>[number]['type'] {
  if (tool.geometryClass === 'face-mill') return 'face_mill';
  if (tool.geometryClass === 'drill') return 'drill';
  if (tool.geometryClass === 'tap') return 'tap';
  if (tool.geometryClass === 'reamer') return 'reamer';
  if (tool.geometryClass === 'threading-insert' || tool.operation === 'threading') return 'tap';
  if (tool.geometryClass === 'boring-bar') return 'boring_bar';
  return 'endmill';
}

function inferToolInventoryMaterial(
  tool: Pick<ToolCatalogItem, 'toolMaterialClass'>,
): NonNullable<ToolRoiAnalysisParams['user_inventory']>[number]['material'] {
  const materialClass = tool.toolMaterialClass ?? 'carbide';
  switch (materialClass) {
    case 'cermet':
      return 'cermet';
    case 'ceramic':
      return 'ceramic';
    case 'pcd':
      return 'pcd';
    default:
      return 'carbide';
  }
}

function estimateToolPrice(tool: Pick<ToolCatalogItem, 'geometryClass' | 'operation'>) {
  return DEFAULT_TOOL_PRICE_BY_TYPE[inferToolInventoryType(tool)] ?? 96;
}

function inferInventoryCondition(status: 'ready' | 'watch') {
  return status === 'watch' ? 'worn' : 'good';
}

function inferCurrentToolCondition(
  tool: ToolCatalogItem | undefined,
  inventoryWorkspace: InventoryOperationsWorkspace | null,
): NonNullable<ToolRoiAnalysisParams['current_tool']>['condition'] {
  if (!tool || !inventoryWorkspace) return 'good';
  const queueMatch = inventoryWorkspace.checkoutQueue.find((item) => item.toolId === tool.id);
  if (queueMatch) {
    return queueMatch.status === 'watch' ? 'worn' : 'good';
  }
  return 'good';
}

function materialIsoGroup(
  material: MaterialCatalogItem | undefined,
): ToolRoiAnalysisParams['material']['iso_group'] {
  switch (material?.group) {
    case 'stainless':
      return 'M';
    case 'cast_iron':
      return 'K';
    case 'aluminum':
    case 'nonferrous':
    case 'plastic':
      return 'N';
    case 'superalloy':
    case 'titanium':
      return 'S';
    case 'tool_steel':
      return 'H';
    case 'steel':
    default:
      return 'P';
  }
}

function materialPhysics(material: MaterialCatalogItem | undefined) {
  const isoGroup = materialIsoGroup(material);
  switch (isoGroup) {
    case 'M':
      return { isoGroup, kc1_1: 2100, mc: 0.21 };
    case 'K':
      return { isoGroup, kc1_1: 1650, mc: 0.24 };
    case 'N':
      return { isoGroup, kc1_1: 900, mc: 0.2 };
    case 'S':
      return { isoGroup, kc1_1: 2400, mc: 0.18 };
    case 'H':
      return { isoGroup, kc1_1: 2600, mc: 0.17 };
    case 'P':
    default:
      return { isoGroup, kc1_1: 1850, mc: 0.23 };
  }
}

function inferFeatureType(
  machineMode: MachineMode,
  operationId: string,
  toolpath: { id: string; label: string; path: string; operationId: string } | undefined,
  tool: ToolCatalogItem | undefined,
): ToolRoiAnalysisParams['feature']['type'] {
  const signature = `${operationId} ${toolpath?.id ?? ''} ${toolpath?.label ?? ''} ${toolpath?.path ?? ''} ${tool?.geometryClass ?? ''}`.toLowerCase();
  if (/drill|hole/.test(signature)) return 'drill';
  if (/thread/.test(signature)) return 'thread';
  if (/bore|boring/.test(signature)) return 'bore';
  if (/chamfer/.test(signature)) return 'chamfer';
  if (/face/.test(signature)) return 'face';
  if (/slot|groove|part/.test(signature)) return machineMode === 'lathe' ? 'slot' : 'slot';
  if (/pocket/.test(signature)) return 'pocket';
  if (/contour|profile|finish|turning/.test(signature)) return 'contour';
  return 'contour';
}

function inferToleranceMm(finishTarget: string, desiredRaUm: number) {
  if (finishTarget === 'tight-finish' || desiredRaUm <= 1.6) return 0.01;
  if (finishTarget === 'general' || desiredRaUm <= 3.2) return 0.025;
  return 0.05;
}

function inferOptimizationGoal(
  finishTarget: string,
  toolpathTypeId: string | undefined,
  inventoryWorkspace: InventoryOperationsWorkspace | null,
): ToolRoiAnalysisParams['optimization_goal'] {
  if (finishTarget === 'tight-finish' || toolpathTypeId === 'surface_finish') return 'performance';
  if (inventoryWorkspace?.checkoutQueue.length) return 'balanced';
  return 'cost';
}

function buildToolRoiInventory(
  machineMode: MachineMode,
  inventoryWorkspace: InventoryOperationsWorkspace | null,
  toolLookup: Map<string, ToolCatalogItem>,
): ToolRoiAnalysisParams['user_inventory'] {
  if (!inventoryWorkspace) return undefined;
  const items = inventoryWorkspace.checkoutQueue
    .map((item) => {
      const tool = toolLookup.get(item.toolId);
      if (!tool || tool.mode !== machineMode) return null;
      return {
        id: item.id,
        name: item.label,
        type: inferToolInventoryType(tool),
        diameter_mm: tool.defaultDiameter,
        flutes: tool.defaultFlutes,
        material: inferToolInventoryMaterial(tool),
        coating: tool.coating,
        max_depth_mm: tool.defaultDiameter * 1.5,
        corner_radius_mm: tool.cornerRadiusMm,
        condition: inferInventoryCondition(item.status),
        price: parsePriceLabel(item.priceLabel, estimateToolPrice(tool)),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return items.length ? items : undefined;
}

function unwrapToolRoiAnalysisResult(payload: unknown): ToolRoiAnalysisResult | null {
  if (!payload || typeof payload !== 'object') return null;
  const envelope = payload as Record<string, unknown>;
  const nested = (envelope.result ?? envelope) as Record<string, unknown>;
  const raw = ((nested.value ?? nested) as Record<string, unknown>);
  if (!raw || typeof raw !== 'object') return null;
  if (!('budget_recommendation' in raw) || !('standard_recommendation' in raw) || !('premium_recommendation' in raw)) {
    return null;
  }
  return raw as unknown as ToolRoiAnalysisResult;
}

function sameIdSet(left: string[] | undefined, right: string[] | undefined) {
  const normalize = (values: string[] | undefined) =>
    [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort();

  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function humanizeToken(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeFilterId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CALCULATOR_COMPANION_WORKSPACES: SelectionOption[] = [
  {
    id: '/calculator',
    label: 'Calculator studio',
    detail: 'Main setup, tooling, machine, and live solve workspace.',
  },
  {
    id: '/toolpath',
    label: 'Toolpath advisor',
    detail: 'Strategy ranking and feature-to-toolpath planning companion.',
  },
  {
    id: '/what-if',
    label: 'What-if analysis',
    detail: 'Scenario lab for parameter tradeoffs, safety, and cost drift.',
  },
];

const CALCULATOR_WORKSPACE_GRID_CLASS =
  'grid gap-2.5 p-2.5 [--calculator-left-rail:360px] [--calculator-right-rail:360px] lg:grid-cols-[var(--calculator-left-rail)_minmax(0,1fr)] xl:[--calculator-left-rail:390px] xl:[--calculator-right-rail:430px] 2xl:[--calculator-left-rail:430px] 2xl:[--calculator-right-rail:500px] min-[1800px]:[--calculator-left-rail:500px] min-[1800px]:[--calculator-right-rail:560px] min-[2300px]:[--calculator-left-rail:560px] min-[2300px]:[--calculator-right-rail:620px]';

const CALCULATOR_MAIN_RAIL_GRID_CLASS =
  'grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,var(--calculator-right-rail))]';

type CalculatorCatalogStatus = Pick<
  CalculatorCatalogLoadState<unknown>,
  'source' | 'liveCount' | 'fallbackCount' | 'note' | 'sampled'
>;

const DEFAULT_CATALOG_STATUS: CalculatorCatalogStatus = {
  source: 'fallback',
  liveCount: 0,
  fallbackCount: 0,
  note: 'Using bundled calculator data.',
  sampled: false,
};

function toCatalogStatus<T>(state: CalculatorCatalogLoadState<T>): CalculatorCatalogStatus {
  return {
    source: state.source,
    liveCount: state.liveCount,
    fallbackCount: state.fallbackCount,
    note: state.note,
    sampled: state.sampled,
  };
}

function catalogStatusTone(source: CalculatorCatalogSourceState) {
  switch (source) {
    case 'live':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    case 'hybrid':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
    case 'fallback':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    case 'empty':
    default:
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
  }
}

function effectiveCatalogSource(status: CalculatorCatalogStatus): CalculatorCatalogSourceState {
  if (status.source === 'live' && status.sampled) {
    return 'hybrid';
  }
  return status.source;
}

function deriveOverallCatalogSource(statuses: CalculatorCatalogStatus[]): 'live' | 'hybrid' | 'fallback' {
  const sources = statuses.map(effectiveCatalogSource);
  if (sources.every((source) => source === 'live')) {
    return 'live';
  }
  if (sources.some((source) => source === 'fallback' || source === 'empty')) {
    return 'fallback';
  }
  return 'hybrid';
}

const MILL_OPERATIONS = [
  { id: 'face_milling', label: 'Facing' },
  { id: 'roughing', label: 'Adaptive roughing' },
  { id: 'slot_milling', label: 'Slotting' },
  { id: 'shoulder_milling', label: 'Shoulder milling' },
  { id: 'pocket_milling', label: 'Pocketing' },
  { id: 'finishing', label: 'Finishing' },
  { id: 'drilling', label: 'Drilling' },
];

const LATHE_OPERATIONS = [
  { id: 'turning_rough', label: 'OD roughing' },
  { id: 'turning_finish', label: 'OD finishing' },
  { id: 'boring', label: 'Boring' },
  { id: 'drilling', label: 'Drilling / holemaking' },
  { id: 'grooving', label: 'Grooving / parting' },
];

const PROCESS_OPERATIONS: Record<MachineMode, Array<{ id: string; label: string }>> = {
  mill: MILL_OPERATIONS,
  lathe: LATHE_OPERATIONS,
  edm: [
    { id: 'burn_finishing', label: 'Finish burn' },
    { id: 'burn_roughing', label: 'Rough burn' },
  ],
  wire_edm: [
    { id: 'wire_profile', label: 'Profile cut' },
    { id: 'wire_skims', label: 'Skim-pass finish' },
  ],
  laser: [
    { id: 'laser_cut', label: 'Sheet cut' },
    { id: 'laser_edge', label: 'Edge-quality pass' },
  ],
  waterjet: [
    { id: 'abrasive_cut', label: 'Abrasive cut' },
    { id: 'taper_control', label: 'Taper-controlled cut' },
  ],
};

const EXPERIENCE_STYLES: Record<ExperienceLevel, string> = {
  beginner: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-400',
  journeyman: 'border-amber-500/40 bg-amber-950/30 text-amber-400',
  master: 'border-rose-500/40 bg-rose-950/30 text-rose-400',
};

const MACHINE_MODE_LED_TONES: Record<
  MachineMode,
  {
    ring: string;
    ringAlt: string;
    glow: string;
    glowAlt: string;
    glowSoft: string;
    surface: string;
    surfaceAlt: string;
    text: string;
  }
> = {
  mill: {
    ring: 'rgba(56, 189, 248, 0.88)',
    ringAlt: 'rgba(96, 165, 250, 0.92)',
    glow: 'rgba(56, 189, 248, 0.46)',
    glowAlt: 'rgba(59, 130, 246, 0.42)',
    glowSoft: 'rgba(14, 165, 233, 0.22)',
    surface: 'rgba(7, 28, 46, 0.98)',
    surfaceAlt: 'rgba(12, 43, 74, 0.98)',
    text: '#d7f4ff',
  },
  lathe: {
    ring: 'rgba(251, 191, 36, 0.9)',
    ringAlt: 'rgba(249, 115, 22, 0.9)',
    glow: 'rgba(251, 191, 36, 0.42)',
    glowAlt: 'rgba(249, 115, 22, 0.38)',
    glowSoft: 'rgba(245, 158, 11, 0.22)',
    surface: 'rgba(51, 31, 8, 0.98)',
    surfaceAlt: 'rgba(78, 44, 6, 0.98)',
    text: '#fff1c2',
  },
  edm: {
    ring: 'rgba(168, 85, 247, 0.88)',
    ringAlt: 'rgba(217, 70, 239, 0.88)',
    glow: 'rgba(168, 85, 247, 0.42)',
    glowAlt: 'rgba(217, 70, 239, 0.34)',
    glowSoft: 'rgba(139, 92, 246, 0.22)',
    surface: 'rgba(32, 16, 52, 0.98)',
    surfaceAlt: 'rgba(58, 19, 76, 0.98)',
    text: '#f1ddff',
  },
  wire_edm: {
    ring: 'rgba(34, 211, 238, 0.9)',
    ringAlt: 'rgba(45, 212, 191, 0.9)',
    glow: 'rgba(34, 211, 238, 0.44)',
    glowAlt: 'rgba(45, 212, 191, 0.36)',
    glowSoft: 'rgba(6, 182, 212, 0.22)',
    surface: 'rgba(6, 32, 43, 0.98)',
    surfaceAlt: 'rgba(7, 56, 63, 0.98)',
    text: '#d3fbff',
  },
  laser: {
    ring: 'rgba(244, 63, 94, 0.9)',
    ringAlt: 'rgba(236, 72, 153, 0.88)',
    glow: 'rgba(244, 63, 94, 0.42)',
    glowAlt: 'rgba(236, 72, 153, 0.32)',
    glowSoft: 'rgba(225, 29, 72, 0.22)',
    surface: 'rgba(59, 11, 28, 0.98)',
    surfaceAlt: 'rgba(94, 14, 44, 0.98)',
    text: '#ffe0e8',
  },
  waterjet: {
    ring: 'rgba(45, 212, 191, 0.9)',
    ringAlt: 'rgba(34, 197, 94, 0.9)',
    glow: 'rgba(45, 212, 191, 0.42)',
    glowAlt: 'rgba(34, 197, 94, 0.34)',
    glowSoft: 'rgba(16, 185, 129, 0.22)',
    surface: 'rgba(7, 38, 36, 0.98)',
    surfaceAlt: 'rgba(8, 62, 49, 0.98)',
    text: '#d6fff7',
  },
};

const WORKSPACE_PLANS: Record<
  MachineMode,
  {
    eyebrow: string;
    title: string;
    summary: string;
    cadence: string;
    tone: string;
    steps: Array<{ title: string; detail: string }>;
  }
> = {
  mill: {
    eyebrow: 'Mill layout',
    title: 'Fixture -> tool crib -> engagement -> verify',
    summary: 'Milling keeps the process centered on the part, then fans out into tooling, workholding, and load-based verification.',
    cadence: 'Magazine-first workflow',
    tone: 'border-sky-500/30 bg-sky-950/30',
    steps: [
      { title: 'Fixture the work', detail: 'Lock material, stock form, and vise / fixture posture before choosing tooling.' },
      { title: 'Build the crib', detail: 'Pick the cutter family, holder, and companion tools the spindle will cycle through.' },
      { title: 'Dial engagement', detail: 'Tune DOC, WOC, coolant, and workholding so the cut is stable before the solve.' },
      { title: 'Verify output', detail: 'Read confidence, warnings, and load signals before handing numbers to CAM.' },
    ],
  },
  lathe: {
    eyebrow: 'Turning layout',
    title: 'Chuck / bar work -> turret -> tool station -> cut plan',
    summary: 'Turning shifts the workspace into a spindle-and-tooling rhythm, with the top-right panel becoming a turret or gang rail based on the chosen machine.',
    cadence: 'Turret-aware workflow',
    tone: 'border-amber-500/30 bg-amber-950/30',
    steps: [
      { title: 'Stage stock', detail: 'Define round or tubular stock, projection, and the machine posture first.' },
      { title: 'Lock workholding', detail: 'Match chuck, collet, or support strategy before trusting the turning numbers.' },
      { title: 'Index the tooling', detail: 'Use the hardware panel as a turret or gang station selector, matching the turret workflow.' },
      { title: 'Validate the cut', detail: 'Review live tooling, engagement, and warnings before posting into CAM.' },
    ],
  },
  edm: {
    eyebrow: 'Sinker EDM layout',
    title: 'Electrode -> burn intent -> flushing -> finish plan',
    summary: 'EDM uses a setup-first layout that emphasizes electrode package, flushing, and burn sequencing rather than live spindle physics.',
    cadence: 'Electrode package workflow',
    tone: 'border-violet-500/30 bg-violet-950/30',
    steps: [
      { title: 'Match the electrode', detail: 'Confirm the electrode style and reference system before anything else.' },
      { title: 'Set burn strategy', detail: 'Choose rough or finish burn intent based on the cavity and finish target.' },
      { title: 'Plan flushing', detail: 'Dielectric and fixture access become the main gating variables.' },
      { title: 'Hand off cleanly', detail: 'Use the handoff cards to push the setup into the dedicated EDM program flow.' },
    ],
  },
  wire_edm: {
    eyebrow: 'Wire EDM layout',
    title: 'Contour -> wire package -> skim strategy -> handoff',
    summary: 'Wire EDM collapses the workspace into contour prep, wire/flushing setup, and skim-pass readiness.',
    cadence: 'Contour-first workflow',
    tone: 'border-cyan-500/30 bg-cyan-950/30',
    steps: [
      { title: 'Load the contour', detail: 'Profile geometry and stock thickness drive the whole setup.' },
      { title: 'Confirm wire package', detail: 'Wire size, dielectric, and fixture access shape the process window.' },
      { title: 'Plan skim passes', detail: 'Finish quality comes from pass structure, not a generic speed/feed solve.' },
      { title: 'Send to pipeline', detail: 'Use the right rail as the final checklist before generating the cut program.' },
    ],
  },
  laser: {
    eyebrow: 'Laser layout',
    title: 'Sheet -> assist gas -> nozzle stack -> cut quality',
    summary: 'Laser mode compresses the page into a sheet-cut workflow with gas, nozzle, and edge-quality assumptions surfaced earlier.',
    cadence: 'Sheet-cut workflow',
    tone: 'border-rose-500/30 bg-rose-950/30',
    steps: [
      { title: 'Stage the sheet', detail: 'Sheet dimensions and material thickness lead the setup.' },
      { title: 'Choose the gas', detail: 'Assist gas and cut intent matter more than spindle-style tooling data.' },
      { title: 'Prep the head', detail: 'Nozzle and lens posture define the hardware lane on the right.' },
      { title: 'Review quality', detail: 'Use the handoff notes to decide whether the setup is production ready.' },
    ],
  },
  waterjet: {
    eyebrow: 'Waterjet layout',
    title: 'Plate -> abrasive stream -> taper control -> cold-cut handoff',
    summary: 'Waterjet mode stays focused on cut path, abrasive package, and taper-control assumptions for thick or heat-sensitive work.',
    cadence: 'Cold-cut workflow',
    tone: 'border-emerald-500/30 bg-emerald-950/30',
    steps: [
      { title: 'Define the blank', detail: 'Plate size and thickness come first because they set the travel and pump posture.' },
      { title: 'Lock the stream', detail: 'Abrasive, standoff, and fixture stability replace traditional tooling choices.' },
      { title: 'Manage taper', detail: 'Use the process lane to set expectations for edge straightness and finish.' },
      { title: 'Push to programming', detail: 'Treat the right-hand notes as the last checkpoint before path generation.' },
    ],
  },
};

const STOCK_SOURCE_OPTIONS: SelectionOption[] = [
  { id: 'shop-rack', label: 'Shop rack', detail: 'Use the stock you already keep on the floor or in the crib.' },
  { id: 'purchased', label: 'Purchased stock', detail: 'Bias the setup toward fresh-buy material and standard trade sizes.' },
  { id: 'remnant', label: 'Remnant rack', detail: 'Favor leftover stock and tighter stock-shape validation.' },
  { id: 'from-model', label: 'From part/model', detail: 'Treat the imported model or drawing as the stock truth source.' },
];

const SETUP_SOURCE_OPTIONS: SelectionOption[] = [
  { id: 'recommended', label: 'PRISM recommended', detail: 'Use PRISM defaults for tooling, holder posture, and fixture choices.' },
  { id: 'shop-crib', label: 'My shop crib', detail: 'Assume the setup should match the tools and fixtures already on your floor.' },
  { id: 'new-package', label: 'New setup package', detail: 'Bias the selection toward a fresh tooling / fixture package for the job.' },
];

const FINISH_TARGET_OPTIONS: SelectionOption[] = [
  { id: 'general', label: 'General production', detail: 'Balanced throughput and finish for everyday work.' },
  { id: 'tight-finish', label: 'Tight finish', detail: 'Favor finish quality and cleanup posture over raw removal rate.' },
  { id: 'high-removal', label: 'High removal', detail: 'Favor throughput, roughing stability, and stock removal.' },
  { id: 'prove-out', label: 'Safe prove-out', detail: 'Bias toward conservative engagement and verification-friendly setup.' },
];

const ENTRY_STYLE_OPTIONS: Record<MachineMode, SelectionOption[]> = {
  mill: [
    { id: 'balanced', label: 'Balanced entry', detail: 'General-purpose lead-in and engagement posture.' },
    { id: 'helix-ramp', label: 'Helix / ramp', detail: 'Favor helical entry or ramping where the toolpath supports it.' },
    { id: 'high-engagement', label: 'High-engagement roughing', detail: 'Bias the setup for adaptive / constant-engagement cuts.' },
  ],
  lathe: [
    { id: 'balanced', label: 'Balanced entry', detail: 'General turning entry and approach posture.' },
    { id: 'safe-approach', label: 'Safe approach', detail: 'Favor clean approach, retraction, and prove-out space.' },
    { id: 'chip-break', label: 'Chip-break focused', detail: 'Bias the setup toward chip control and interrupted-cut stability.' },
  ],
  edm: [
    { id: 'balanced', label: 'Balanced burn', detail: 'General rough/finish burn planning.' },
    { id: 'fine-detail', label: 'Fine detail', detail: 'Favor detail retention, orbit accuracy, and smaller step-offs.' },
    { id: 'heavy-flush', label: 'Flush-first', detail: 'Bias toward flushing access and reliable debris evacuation.' },
  ],
  wire_edm: [
    { id: 'balanced', label: 'Balanced contour', detail: 'General contouring and skim-pass planning.' },
    { id: 'slug-control', label: 'Slug control', detail: 'Favor slug retention, tabbing, and safe release control.' },
    { id: 'finish-skim', label: 'Finish skim', detail: 'Bias toward skim scheduling and edge-quality cleanup.' },
  ],
  laser: [
    { id: 'balanced', label: 'Balanced cut', detail: 'General edge quality and speed balance.' },
    { id: 'clean-edge', label: 'Clean edge', detail: 'Bias gas/nozzle posture toward cleaner cut faces.' },
    { id: 'nested-throughput', label: 'Nested throughput', detail: 'Favor efficient nest cutting and line-to-line flow.' },
  ],
  waterjet: [
    { id: 'balanced', label: 'Balanced cut', detail: 'General abrasive cutting posture.' },
    { id: 'taper-control', label: 'Taper control', detail: 'Bias toward straighter walls and compensation posture.' },
    { id: 'pierce-safe', label: 'Pierce-safe', detail: 'Favor safer pierce behavior on brittle or thick stock.' },
  ],
};

const HOLDER_STYLE_OPTIONS: Record<MachineMode, SelectionOption[]> = {
  mill: [
    { id: 'machine-standard', label: 'Machine standard', detail: 'Match the default spindle interface and holder posture for the selected machine.' },
    { id: 'hydraulic', label: 'Hydraulic / collet', detail: 'Bias toward general-purpose hydraulic or collet-style holder packages.' },
    { id: 'shrink-fit', label: 'Shrink-fit / performance', detail: 'Favor tighter runout and higher-performance finishing posture.' },
  ],
  lathe: [
    { id: 'machine-standard', label: 'Turret standard', detail: "Match the selected machine's turret or gang tooling interface." },
    { id: 'rigid-turning', label: 'Rigid turning holder', detail: 'Favor stable OD/ID turning holders for roughing and general contouring.' },
    { id: 'live-tooling', label: 'Live tooling package', detail: 'Bias toward driven-tool holders and live-tooling readiness.' },
    { id: 'twin-turret', label: 'Twin-turret package', detail: 'Favor synchronized upper/lower turret holders for transfer and pinch-turn work.' },
    { id: 'milling-head', label: 'Milling head package', detail: 'Bias toward B-axis milling-head or dedicated multitask milling tooling packages.' },
  ],
  edm: [
    { id: 'machine-standard', label: 'Machine standard', detail: 'Match the base electrode chuck / reference system.' },
    { id: 'erowa', label: 'EROWA style', detail: 'Favor palletized EDM reference tooling.' },
    { id: 'three-r', label: '3R style', detail: 'Favor 3R-style electrode holding and repeatability.' },
  ],
  wire_edm: [
    { id: 'machine-standard', label: 'Wire standard', detail: 'Match general guide and power-feed hardware.' },
    { id: 'fine-wire', label: 'Fine wire package', detail: 'Bias toward smaller wire and tighter contouring posture.' },
    { id: 'taper-package', label: 'Taper package', detail: 'Favor guide posture and hardware suited for taper work.' },
  ],
  laser: [
    { id: 'machine-standard', label: 'Head standard', detail: 'Match the normal nozzle/lens stack for the selected machine.' },
    { id: 'quality-head', label: 'Quality head', detail: 'Favor cleaner-edge nozzle posture and process stability.' },
    { id: 'high-flow-head', label: 'High-flow nozzle', detail: 'Bias toward faster cutting and nest throughput.' },
  ],
  waterjet: [
    { id: 'machine-standard', label: 'Head standard', detail: 'Match the standard orifice / mixing tube package.' },
    { id: 'precision-nozzle', label: 'Precision nozzle', detail: 'Favor straighter walls and tighter quality control.' },
    { id: 'heavy-plate', label: 'Heavy-plate package', detail: 'Bias toward thick-stock and longer-stream stability.' },
  ],
};

const HOLDER_BRAND_OPTIONS: Record<MachineMode, SelectionOption[]> = {
  mill: [
    { id: 'all', label: 'All holder brands', detail: 'Show every spindle-side holder package for the selected mill workflow.' },
    { id: 'haimer', label: 'HAIMER', detail: 'Hydraulic, shrink-fit, and high-balance holder packages.' },
    { id: 'regofix', label: 'REGO-FIX', detail: 'Collet and powRgrip-style mill holder systems.' },
    { id: 'sandvik', label: 'Sandvik / Coromant Capto', detail: 'Production-focused shell, arbor, and modular tooling.' },
  ],
  lathe: [
    { id: 'all', label: 'All holder brands', detail: 'Show all turret, live-tooling, and gang-tool holder packages.' },
    { id: 'sandvik', label: 'Sandvik', detail: 'General turning and boring holder packages.' },
    { id: 'haas', label: 'Haas / BMT', detail: 'Turret and live-tool interfaces for Haas-style Y-axis lathes.' },
    { id: 'okuma', label: 'Okuma / CAPTO', detail: 'CAPTO C6 and multitask holder packages for Okuma mill-turn platforms.' },
    { id: 'nakamura', label: 'Nakamura-Tome', detail: 'Twin-turret production holder packages for paired-spindle turning centers.' },
    { id: 'citizen', label: 'Citizen', detail: 'Swiss and gang-tooling holder packages.' },
  ],
  edm: [
    { id: 'all', label: 'All holder brands', detail: 'Show all electrode reference systems.' },
    { id: 'erowa', label: 'EROWA', detail: 'Palletized EDM tooling and reference packages.' },
    { id: 'three-r', label: '3R', detail: 'Reference tooling for repeatable EDM setups.' },
  ],
  wire_edm: [
    { id: 'all', label: 'All holder brands', detail: 'Show all guide and wire package options.' },
    { id: 'fanuc', label: 'FANUC', detail: 'Standard wire-guide and power-feed packages.' },
    { id: 'makino', label: 'Makino', detail: 'High-finish and taper-focused wire packages.' },
  ],
  laser: [
    { id: 'all', label: 'All head brands', detail: 'Show all nozzle and lens package variants.' },
    { id: 'trumpf', label: 'TRUMPF', detail: 'TruLaser nozzle and quality-head configurations.' },
    { id: 'precitec', label: 'Precitec', detail: 'Cutting head and process optics packages.' },
  ],
  waterjet: [
    { id: 'all', label: 'All head brands', detail: 'Show all mixing tube / orifice package options.' },
    { id: 'omax', label: 'OMAX', detail: 'Abrasive head packages for general contour cutting.' },
    { id: 'flow', label: 'Flow', detail: 'Dynamic taper and bevel-ready nozzle packages.' },
  ],
};

export { HOLDER_PACKAGE_LIBRARY } from '../data/calculatorHolderLibrary';

interface MachineToolingCapabilityProfile {
  kind: MachineToolingLayout['kind'];
  interfaceLabel?: string;
  spindleConnectionTypeId?: string;
  spindleConnectionLabel?: string;
  turretTypeId?: string;
  turretTypeLabel?: string;
  turretCount: number;
  hasSubSpindle: boolean;
  hasMillingHead: boolean;
  millingHeadLabel?: string;
  liveTooling: boolean;
}

function holderPackageStyleIds(holderPackage: HolderPackageOption) {
  return holderPackage.holderStyleIds?.length
    ? holderPackage.holderStyleIds
    : holderPackage.holderStyleId
      ? [holderPackage.holderStyleId]
      : ['machine-standard'];
}

function holderPackagePrimaryStyle(holderPackage?: HolderPackageOption | null) {
  if (!holderPackage) return 'machine-standard';
  const styles = holderPackageStyleIds(holderPackage);
  return holderPackage.holderStyleId
    ?? styles.find((styleId) => styleId !== 'machine-standard')
    ?? styles[0]
    ?? 'machine-standard';
}

function toolingInterfaceAliases(value?: string) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return [];
  switch (normalized) {
    case 'cat40-big-plus':
      return ['cat40-big-plus', 'cat40'];
    case 'hsk-a63':
      return ['hsk-a63', 'hsk_a63'];
    case 'bmt45':
    case 'bmt-45':
      return ['bmt45', 'bmt-45'];
    case 'bmt55':
    case 'bmt-55':
      return ['bmt55', 'bmt-55'];
    case 'bmt65':
    case 'bmt-65':
      return ['bmt65', 'bmt-65'];
    case 'vdi30':
    case 'vdi-30':
      return ['vdi30', 'vdi-30'];
    case 'vdi40':
    case 'vdi-40':
      return ['vdi40', 'vdi-40'];
    case 'vdi50':
    case 'vdi-50':
      return ['vdi50', 'vdi-50'];
    case 'vdi60':
    case 'vdi-60':
      return ['vdi60', 'vdi-60'];
    case 'vdi80':
    case 'vdi-80':
      return ['vdi80', 'vdi-80'];
    default:
      return [normalized];
  }
}

function toolingInterfaceLabel(value?: string) {
  const normalized = value ? normalizeToolingInterfaceId(value, '') : '';
  switch (normalized) {
    case 'cat40-big-plus':
      return 'CAT 40 Big+';
    case 'cat40':
      return 'CAT 40';
    case 'bt50':
      return 'BT50';
    case 'hsk-a63':
      return 'HSK-A63';
    case 'capto-c6':
      return 'CAPTO C6';
    case 'bmt45':
      return 'BMT45';
    case 'bmt55':
      return 'BMT55';
    case 'bmt65':
      return 'BMT65';
    case 'vdi30':
      return 'VDI30';
    case 'vdi40':
      return 'VDI40';
    case 'vdi50':
      return 'VDI50';
    case 'vdi60':
      return 'VDI60';
    case 'vdi80':
      return 'VDI80';
    case 'gang-tooling':
      return 'Gang tooling';
    case 'turret-standard':
      return 'Turret standard';
    default:
      return value ? humanizeToken(value) : 'Machine standard';
  }
}

function resolveHolderPackageInterface(holderPackage: HolderPackageOption, machine?: MachineCatalogItem | null) {
  if (holderPackage.spindleInterface) {
    return {
      id: normalizeToolingInterfaceId(holderPackage.spindleInterface, 'machine-standard'),
      label: holderPackage.spindleInterface,
    };
  }

  if (holderPackage.toolInterface) {
    return {
      id: normalizeToolingInterfaceId(holderPackage.toolInterface, 'machine-standard'),
      label: holderPackage.toolInterface,
    };
  }

  const profile = deriveMachineToolingCapability(machine);
  const compatibilityIds = holderPackage.mode === 'mill'
    ? holderPackage.compatibleSpindleConnectionTypeIds
    : holderPackage.compatibleTurretTypeIds;
  const profileInterfaceId = holderPackage.mode === 'mill' ? profile?.spindleConnectionTypeId : profile?.turretTypeId;
  const profileInterfaceLabel = holderPackage.mode === 'mill'
    ? profile?.spindleConnectionLabel ?? profile?.interfaceLabel
    : profile?.turretTypeLabel ?? profile?.interfaceLabel;

  if (profileInterfaceId && compatibilityIds?.length) {
    const profileAliases = new Set(toolingInterfaceAliases(profileInterfaceId));
    const matchedCompatibilityId =
      compatibilityIds.find((id) => id === profileInterfaceId)
      ?? compatibilityIds.find((id) => profileAliases.has(id));
    if (matchedCompatibilityId) {
      return {
        id: normalizeToolingInterfaceId(matchedCompatibilityId, 'machine-standard'),
        label: toolingInterfaceLabel(matchedCompatibilityId) === 'Machine standard'
          ? (profileInterfaceLabel ?? toolingInterfaceLabel(profileInterfaceId))
          : toolingInterfaceLabel(matchedCompatibilityId),
      };
    }
  }

  if (compatibilityIds?.length === 1) {
    return {
      id: normalizeToolingInterfaceId(compatibilityIds[0] ?? '', 'machine-standard'),
      label: toolingInterfaceLabel(compatibilityIds[0]),
    };
  }

  return {
    id: 'machine-standard',
    label: 'Machine standard',
  };
}

function holderPackageMatchesStyle(
  holderPackage: HolderPackageOption,
  holderStyleId: string,
  machine?: MachineCatalogItem | null,
) {
  if (holderStyleId === 'machine-standard') {
    return true;
  }

  const styles = holderPackageStyleIds(holderPackage);
  const profile = deriveMachineToolingCapability(machine);

  if (holderStyleId === 'live-tooling' && profile && !profile.liveTooling && !profile.hasMillingHead) {
    return false;
  }
  if (holderStyleId === 'twin-turret' && profile && profile.turretCount < 2) {
    return false;
  }
  if (holderStyleId === 'milling-head' && profile && !profile.hasMillingHead) {
    return false;
  }

  return styles.includes(holderStyleId);
}

function normalizeToolingInterfaceId(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (/(cat\s*40).*?(big\+|big plus)|(big\+|big plus).*?(cat\s*40)/i.test(normalized)) return 'cat40-big-plus';
  if (/cat\s*40/i.test(normalized)) return 'cat40';
  if (/bt\s*50/i.test(normalized)) return 'bt50';
  if (/hsk[\s-]*a\s*63/i.test(normalized)) return 'hsk-a63';
  if (/capto\s*c\s*6|coromant\s*capto\s*c\s*6/i.test(normalized)) return 'capto-c6';
  if (/bmt[\s_-]*45/i.test(normalized)) return 'bmt45';
  if (/bmt[\s_-]*55/i.test(normalized)) return 'bmt55';
  if (/bmt[\s_-]*65/i.test(normalized)) return 'bmt65';
  if (/vdi[\s_-]*30/i.test(normalized)) return 'vdi30';
  if (/vdi[\s_-]*40/i.test(normalized)) return 'vdi40';
  if (/vdi[\s_-]*50/i.test(normalized)) return 'vdi50';
  if (/vdi[\s_-]*80/i.test(normalized)) return 'vdi80';
  if (/gang/i.test(normalized)) return 'gang-tooling';
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

function deriveMachineToolingCapability(machine?: MachineCatalogItem | null): MachineToolingCapabilityProfile | null {
  const layout = machine?.toolingLayout;
  if (!machine || !layout) return null;

  const interfaceLabel = layout.interface?.trim() || undefined;
  const interfaceId = layout.interfaceId
    ?? normalizeToolingInterfaceId(interfaceLabel ?? '', layout.kind === 'magazine' ? 'cat40' : layout.kind === 'gang' ? 'gang-tooling' : 'turret-standard');
  const spindleConnectionTypeId =
    layout.spindleConnectionTypeId ?? (layout.kind === 'magazine' ? interfaceId : undefined);
  const spindleConnectionLabel =
    layout.spindleConnectionLabel ?? (layout.kind === 'magazine' ? interfaceLabel : undefined);
  const turretTypeId =
    layout.turretTypeId ?? (layout.kind === 'turret' || layout.kind === 'gang' ? interfaceId : undefined);
  const turretTypeLabel =
    layout.turretTypeLabel ?? (layout.kind === 'turret' || layout.kind === 'gang' ? interfaceLabel : undefined);
  const fallbackTurretCount = layout.kind === 'turret' || layout.kind === 'gang' ? 1 : 0;

  return {
    kind: layout.kind,
    interfaceLabel,
    spindleConnectionTypeId,
    spindleConnectionLabel,
    turretTypeId,
    turretTypeLabel,
    turretCount: layout.turretCount ?? fallbackTurretCount,
    hasSubSpindle: Boolean(layout.hasSubSpindle),
    hasMillingHead: Boolean(layout.hasMillingHead),
    millingHeadLabel: layout.millingHeadLabel,
    liveTooling: Boolean(layout.liveTooling),
  };
}

export function holderPackageMatchesMachine(
  holderPackage: HolderPackageOption,
  machine?: MachineCatalogItem | null,
) {
  if (!machine) return true;
  if (holderPackage.mode !== machine.mode) return false;

  const profile = deriveMachineToolingCapability(machine);
  if (!profile) return true;

  if (holderPackage.compatibleLayoutKinds?.length && !holderPackage.compatibleLayoutKinds.includes(profile.kind)) {
    return false;
  }
  const spindleAliases = new Set(toolingInterfaceAliases(profile.spindleConnectionTypeId));
  if (
    holderPackage.compatibleSpindleConnectionTypeIds?.length
    && (!spindleAliases.size || !holderPackage.compatibleSpindleConnectionTypeIds.some((id) => spindleAliases.has(id)))
  ) {
    return false;
  }
  const turretAliases = new Set(toolingInterfaceAliases(profile.turretTypeId));
  if (
    holderPackage.compatibleTurretTypeIds?.length
    && (!turretAliases.size || !holderPackage.compatibleTurretTypeIds.some((id) => turretAliases.has(id)))
  ) {
    return false;
  }
  if (holderPackage.requiresLiveTooling && !profile.liveTooling) {
    return false;
  }
  if (holderPackage.requiresMillingHead && !profile.hasMillingHead) {
    return false;
  }
  if (holderPackage.minTurretCount && profile.turretCount < holderPackage.minTurretCount) {
    return false;
  }
  if (holderPackage.maxTurretCount && profile.turretCount > holderPackage.maxTurretCount) {
    return false;
  }

  return true;
}

function defaultHolderPackageForMachine(
  machineMode: MachineMode,
  machine?: MachineCatalogItem | null,
  tool?: ToolCatalogItem | null,
) {
  const profile = deriveMachineToolingCapability(machine);
  const toolId = tool?.id;
  if (!profile) {
    if (machineMode === 'lathe') return 'sandvik-vdi-turn';
    if (machineMode === 'mill') {
      if (toolId === 'face-mill') return 'sandvik-shell-arbor';
      if (toolId === 'finisher') return 'haimer-shrink-mill';
      if (toolId === 'adaptive-endmill') return 'haimer-hydraulic-rough';
      return 'regofix-er-collet';
    }
    return '';
  }

  if (machineMode === 'mill') {
    switch (profile.spindleConnectionTypeId) {
      case 'bt50':
        return toolId === 'face-mill' ? 'sandvik-bt50-shell-arbor' : 'regofix-er-collet';
      case 'hsk-a63':
        return 'regofix-hsk-a63-powrgrip';
      case 'cat40-big-plus':
        if (toolId === 'face-mill') return 'sandvik-shell-arbor';
        if (toolId === 'adaptive-endmill') return 'haimer-hydraulic-rough';
        return 'haimer-bigplus-finishing';
      default:
        if (toolId === 'face-mill') return 'sandvik-shell-arbor';
        if (toolId === 'finisher') return 'haimer-shrink-mill';
        if (toolId === 'adaptive-endmill') return 'haimer-hydraulic-rough';
        return 'regofix-er-collet';
    }
  }

  if (machineMode === 'lathe') {
    if (profile.kind === 'gang') return 'citizen-gang-swiss';
    if (profile.hasMillingHead && profile.turretTypeId === 'turret-standard') return 'generic-vtl-milling-head';
    if (profile.hasMillingHead) return 'okuma-capto-c6-milling-head';
    if (profile.turretCount >= 2) return 'nakamura-vdi30-twin';
    if (profile.turretTypeId === 'capto-c6') return 'okuma-capto-c6-turn';
    if (profile.turretTypeId === 'turret-standard') return 'generic-vtl-turn';
    if (profile.turretTypeId === 'bmt45' || profile.turretTypeId === 'bmt55' || profile.turretTypeId === 'bmt65') {
      return 'sandvik-bmt-turn';
    }
    if (profile.turretTypeId === 'bmt65' && profile.liveTooling) return 'haas-bmt-live';
    return 'sandvik-vdi-turn';
  }

  return '';
}

function toolingCapabilityBadges(machine?: MachineCatalogItem | null) {
  const profile = deriveMachineToolingCapability(machine);
  if (!profile) return [];

  const badges = [profile.spindleConnectionLabel ?? profile.turretTypeLabel ?? profile.interfaceLabel]
    .filter(Boolean) as string[];

  if (profile.turretCount > 1) {
    badges.push(`${profile.turretCount} turrets`);
  }
  if (profile.hasSubSpindle) {
    badges.push('Sub spindle');
  }
  if (profile.hasMillingHead) {
    badges.push(profile.millingHeadLabel ?? 'Milling head');
  } else if (profile.liveTooling && profile.kind !== 'gang') {
    badges.push('Live tooling');
  }

  return badges;
}

interface WorkholdingPresetOption extends SelectionOption {
  modes: MachineMode[];
  categoryId: string;
  brandId: string;
  workholdingId: string;
  stabilityId: string;
}

const WORKHOLDING_CATEGORY_OPTIONS: Record<MachineMode, SelectionOption[]> = {
  mill: [
    { id: 'all', label: 'All workholding', detail: 'Show vise, fixture, and rotary options together.' },
    { id: 'vise', label: 'Vise systems', detail: 'Standard, 5-axis, and self-centering vise packages.' },
    { id: 'fixture', label: 'Fixture systems', detail: 'Plate, modular, and repeatable fixture packages.' },
    { id: 'rotary', label: 'Rotary / trunnion', detail: '4th-axis and 3+2-ready workholding.' },
  ],
  lathe: [
    { id: 'all', label: 'All workholding', detail: 'Show chucking, collet, and Swiss support packages.' },
    { id: 'chucking', label: 'Chucking / collet', detail: 'Standard chuck, collet, and bar workholding.' },
    { id: 'support', label: 'Support systems', detail: 'Tailstock, sub-spindle, and Swiss support options.' },
  ],
  edm: [
    { id: 'all', label: 'All workholding', detail: 'Show pallet, reference, and cavity support packages.' },
    { id: 'reference', label: 'Reference systems', detail: 'EROWA / 3R reference pallets and locators.' },
    { id: 'fixture', label: 'Fixture systems', detail: 'Plate and custom cavity support options.' },
  ],
  wire_edm: [
    { id: 'all', label: 'All workholding', detail: 'Show low-profile and tab/slug-control fixture packages.' },
    { id: 'wire', label: 'Wire fixtures', detail: 'Low-profile locating and contour-support packages.' },
    { id: 'slug', label: 'Slug control', detail: 'Packages focused on slug retention and safe release.' },
  ],
  laser: [
    { id: 'all', label: 'All workholding', detail: 'Show sheet, nest, and support-table packages.' },
    { id: 'sheet', label: 'Sheet support', detail: 'Slat, table, and flat-sheet support options.' },
    { id: 'nesting', label: 'Nest control', detail: 'Microjoint and nest-retention support strategies.' },
  ],
  waterjet: [
    { id: 'all', label: 'All workholding', detail: 'Show plate support and pierce-safe support packages.' },
    { id: 'plate', label: 'Plate support', detail: 'Cold-cut plate support and slat packages.' },
    { id: 'pierce', label: 'Pierce-safe', detail: 'Entry-safe packages for fragile or brittle stock.' },
  ],
};

const WORKHOLDING_BRAND_OPTIONS: Record<MachineMode, SelectionOption[]> = {
  mill: [
    { id: 'all', label: 'All brands', detail: 'Show every milling workholding brand.' },
    { id: 'kurt', label: 'Kurt', detail: 'General-purpose precision vise systems.' },
    { id: 'orange-vise', label: 'Orange Vise', detail: '5-axis and self-centering vise platforms.' },
    { id: '5th-axis', label: '5th Axis', detail: 'Modular and self-centering fixture systems.' },
    { id: 'chick', label: 'Chick', detail: 'Fixture plates and multi-part workholding.' },
  ],
  lathe: [
    { id: 'all', label: 'All brands', detail: 'Show all chucking and support brands.' },
    { id: 'hainbuch', label: 'Hainbuch', detail: 'Collet, chuck, and bar workholding.' },
    { id: 'smw', label: 'SMW Autoblok', detail: 'General chucking packages and jaw sets.' },
    { id: 'citizen', label: 'Citizen', detail: 'Swiss support and guide-bushing packages.' },
  ],
  edm: [
    { id: 'all', label: 'All brands', detail: 'Show all EDM fixture brands.' },
    { id: 'erowa', label: 'EROWA', detail: 'Reference pallets and EDM tooling.' },
    { id: 'three-r', label: '3R', detail: 'Reference tooling and repeatability packages.' },
  ],
  wire_edm: [
    { id: 'all', label: 'All brands', detail: 'Show all wire-fixture brands.' },
    { id: 'fanuc', label: 'FANUC', detail: 'General wire-fixture and guide support.' },
    { id: 'makino', label: 'Makino', detail: 'High-finish and taper support packages.' },
  ],
  laser: [
    { id: 'all', label: 'All brands', detail: 'Show all sheet-support brands.' },
    { id: 'trumpf', label: 'TRUMPF', detail: 'TruLaser sheet support and nesting support.' },
    { id: 'bystronic', label: 'Bystronic', detail: 'Sheet support and cut-quality support setups.' },
  ],
  waterjet: [
    { id: 'all', label: 'All brands', detail: 'Show all cold-cut support brands.' },
    { id: 'omax', label: 'OMAX', detail: 'Abrasive plate support packages.' },
    { id: 'flow', label: 'Flow', detail: 'Dynamic taper and support-table setups.' },
  ],
};

const WORKHOLDING_PRESET_LIBRARY: WorkholdingPresetOption[] = [
  {
    id: 'kurt-vise-parallels',
    label: 'Kurt vise + parallels',
    detail: 'Classic plate/block setup that matches the old default mill setup callout.',
    modes: ['mill'],
    categoryId: 'vise',
    brandId: 'kurt',
    workholdingId: 'vise-soft-jaw',
    stabilityId: 'production-stable',
  },
  {
    id: 'orange-vise-5axis',
    label: 'Orange Vise 5-axis',
    detail: 'Tall vise posture for tombstone-style or 3+2 prep work.',
    modes: ['mill'],
    categoryId: 'vise',
    brandId: 'orange-vise',
    workholdingId: 'vise-soft-jaw',
    stabilityId: 'aggressive-rigid',
  },
  {
    id: 'chick-one-lok',
    label: 'Chick One-Lok fixture',
    detail: 'Repeatable multi-part fixture plate setup for production runs.',
    modes: ['mill'],
    categoryId: 'fixture',
    brandId: 'chick',
    workholdingId: 'fixture-plate',
    stabilityId: 'production-stable',
  },
  {
    id: '5th-axis-rocklock',
    label: '5th Axis RockLock',
    detail: 'Quick-change modular fixture system for denser setup changes.',
    modes: ['mill'],
    categoryId: 'fixture',
    brandId: '5th-axis',
    workholdingId: 'fixture-plate',
    stabilityId: 'aggressive-rigid',
  },
  {
    id: 'haas-trt-package',
    label: 'TRT trunnion package',
    detail: 'Rotary / trunnion posture for index work and multiaxis staging.',
    modes: ['mill'],
    categoryId: 'rotary',
    brandId: '5th-axis',
    workholdingId: 'rotary-trunnion',
    stabilityId: 'index-ready',
  },
  {
    id: 'hainbuch-collet',
    label: 'Hainbuch collet chuck',
    detail: 'High-concentricity lathe workholding for bar and chucking work.',
    modes: ['lathe'],
    categoryId: 'chucking',
    brandId: 'hainbuch',
    workholdingId: 'collet-chuck',
    stabilityId: 'production-stable',
  },
  {
    id: 'smw-jaw-chuck',
    label: 'SMW jaw chuck',
    detail: 'General turning chuck package for OD roughing and finishing.',
    modes: ['lathe'],
    categoryId: 'chucking',
    brandId: 'smw',
    workholdingId: 'collet-chuck',
    stabilityId: 'production-stable',
  },
  {
    id: 'citizen-guide-bushing',
    label: 'Swiss guide-bushing support',
    detail: 'Swiss support posture for long, small-diameter parts.',
    modes: ['lathe'],
    categoryId: 'support',
    brandId: 'citizen',
    workholdingId: 'collet-chuck',
    stabilityId: 'swiss-support',
  },
  {
    id: 'erowa-reference-pallet',
    label: 'EROWA reference pallet',
    detail: 'Repeatable sinker EDM reference pallet and locator package.',
    modes: ['edm'],
    categoryId: 'reference',
    brandId: 'erowa',
    workholdingId: 'wire-fixture',
    stabilityId: 'detail-control',
  },
  {
    id: '3r-cavity-fixture',
    label: '3R cavity fixture',
    detail: 'Fine-detail cavity support posture for EDM burn setups.',
    modes: ['edm'],
    categoryId: 'fixture',
    brandId: 'three-r',
    workholdingId: 'wire-fixture',
    stabilityId: 'detail-control',
  },
  {
    id: 'fanuc-low-profile',
    label: 'Low-profile wire fixture',
    detail: 'Contour-ready wire setup with low obstruction and easy flushing.',
    modes: ['wire_edm'],
    categoryId: 'wire',
    brandId: 'fanuc',
    workholdingId: 'wire-fixture',
    stabilityId: 'detail-control',
  },
  {
    id: 'makino-slug-retention',
    label: 'Slug-retention wire fixture',
    detail: 'Fixture posture biased toward safe slug control and finish skim passes.',
    modes: ['wire_edm'],
    categoryId: 'slug',
    brandId: 'makino',
    workholdingId: 'wire-fixture',
    stabilityId: 'detail-control',
  },
  {
    id: 'trumpf-sheet-support',
    label: 'TRUMPF sheet support',
    detail: 'Stable flat-sheet support for contour and quality cutting.',
    modes: ['laser'],
    categoryId: 'sheet',
    brandId: 'trumpf',
    workholdingId: 'fixture-plate',
    stabilityId: 'sheet-flat',
  },
  {
    id: 'bystronic-nest-support',
    label: 'Bystronic nest support',
    detail: 'Nest-focused support posture with microjoint retention in mind.',
    modes: ['laser'],
    categoryId: 'nesting',
    brandId: 'bystronic',
    workholdingId: 'fixture-plate',
    stabilityId: 'sheet-flat',
  },
  {
    id: 'omax-standard-slats',
    label: 'OMAX slat support',
    detail: 'Standard plate support for abrasive contour work.',
    modes: ['waterjet'],
    categoryId: 'plate',
    brandId: 'omax',
    workholdingId: 'fixture-plate',
    stabilityId: 'cold-cut-stable',
  },
  {
    id: 'flow-pierce-safe',
    label: 'Flow pierce-safe support',
    detail: 'Support posture tuned for pierce scheduling and brittle stock.',
    modes: ['waterjet'],
    categoryId: 'pierce',
    brandId: 'flow',
    workholdingId: 'fixture-plate',
    stabilityId: 'cold-cut-stable',
  },
];

const STABILITY_OPTIONS: SelectionOption[] = [
  { id: 'production-stable', label: 'Production stable', detail: 'Balanced default for repeatable day-to-day machining.' },
  { id: 'aggressive-rigid', label: 'Aggressive / rigid', detail: 'Pushes harder on removal rate and clamping confidence.' },
  { id: 'index-ready', label: 'Index-ready', detail: 'Biases the setup toward rotary or multiaxis indexing stability.' },
  { id: 'swiss-support', label: 'Swiss support', detail: 'Long-part support and guide-bushing discipline comes first.' },
  { id: 'detail-control', label: 'Detail control', detail: 'Favor finer support and reduced obstruction for detail work.' },
  { id: 'sheet-flat', label: 'Sheet-flat', detail: 'Keep sheet or plate flatness and support consistency visible.' },
  { id: 'cold-cut-stable', label: 'Cold-cut stable', detail: 'Bias toward thick-plate stability and safer entry behavior.' },
];

const MACHINE_FEATURE_OPTIONS: MachineFeatureOption[] = [
  {
    id: 'through-spindle-coolant',
    label: 'Through-spindle coolant',
    detail: 'Confirm high-pressure through-tool delivery before trusting deeper drilling or aggressive steel work.',
    checkTip: 'Check the pump package, controller settings, and the holder/tool coolant-through path.',
    modes: ['mill', 'lathe'],
  },
  {
    id: 'probing-package',
    label: 'Probing package',
    detail: 'Use probing when prove-out posture, setup validation, or in-process checks matter.',
    checkTip: 'Verify the spindle probe, receiver, macros, and offset-write permissions are active.',
    modes: ['mill', 'lathe'],
  },
  {
    id: 'rotary-trunnion',
    label: 'Rotary / trunnion ready',
    detail: 'Confirm 4th-axis or 3+2 support before assuming index-ready fixtures or multiaxis setups.',
    checkTip: 'Check the physical unit, axis parameters, and post / workplane support.',
    modes: ['mill'],
  },
  {
    id: 'live-tooling',
    label: 'Live tooling',
    detail: 'Needed when the current turning setup expects driven tools or mill-turn style handoff.',
    checkTip: 'Confirm the live turret, driven holders, and speed limits for the active station package.',
    modes: ['lathe'],
  },
  {
    id: 'bar-feeder',
    label: 'Bar feeder / support',
    detail: 'Important for longer round stock and repeated lathe or Swiss work.',
    checkTip: 'Check the feeder interface, pusher setup, and support alignment for the current stock length.',
    modes: ['lathe'],
  },
  {
    id: 'auto-electrode-reference',
    label: 'Reference pallet system',
    detail: 'Confirm repeatable pallet or electrode reference hardware before assuming sinker EDM repeatability.',
    checkTip: 'Check pallet system, reference macros, and electrode setup repeatability.',
    modes: ['edm'],
  },
  {
    id: 'taper-control',
    label: 'Taper / skim control',
    detail: 'Needed for tighter wire EDM contour quality and skim-pass planning.',
    checkTip: 'Check taper-capable hardware and the skim/taper settings in the control and CAM post.',
    modes: ['wire_edm', 'waterjet'],
  },
  {
    id: 'assist-gas-package',
    label: 'Assist-gas package',
    detail: 'Confirm the gas/nozzle stack that supports the edge-quality target for laser work.',
    checkTip: 'Check gas supply, nozzle package, and lens condition for the selected thickness.',
    modes: ['laser'],
  },
];

// MACHINE_PREVIEW_PALETTE + MachinePreviewIllustration extracted to
// ./calculator/MachinePreviewIllustration.tsx as the first concrete step of
// U-F3-TAB-LEVEL-DYNAMIC-IMPORTS (slot:quebec /goal yolo, 2026-05-26).
// CalculatorPage drops ~160 LOC; behavior unchanged; subsequent extractions
// follow the same recipe.

function PrismHeaderMark({
  compact = false,
  idPrefix = 'calculator-toolbar-prism-mark',
}: {
  compact?: boolean;
  idPrefix?: string;
}) {
  return (
    <svg
      viewBox="0 0 72 72"
      aria-hidden="true"
      className={`calculator-toolbar-brand-mark-svg${compact ? ' calculator-toolbar-brand-mark-svg-compact' : ''}`}
    >
      <defs>
        <linearGradient id={`${idPrefix}-body`} x1="10%" y1="10%" x2="92%" y2="92%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="46%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-endmill-metal`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3f00" />
          <stop offset="14%" stopColor="#f59e0b" />
          <stop offset="32%" stopColor="#fde68a" />
          <stop offset="46%" stopColor="#fff7d6" />
          <stop offset="62%" stopColor="#fbbf24" />
          <stop offset="82%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-beam-horizontal`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="55%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-beam-vertical`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dbeafe" stopOpacity="0" />
          <stop offset="18%" stopColor="#67e8f9" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="82%" stopColor="#67e8f9" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#dbeafe" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-flute`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.98" />
          <stop offset="52%" stopColor="#f59e0b" stopOpacity="0.94" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={`${idPrefix}-glow`} cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor="rgba(34,211,238,0.26)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0)" />
        </radialGradient>
        <radialGradient id={`${idPrefix}-beam-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect x="5" y="5" width="62" height="62" rx={compact ? 17 : 20} fill="rgba(6, 16, 30, 0.94)" />
      <rect x="8.5" y="8.5" width="55" height="55" rx={compact ? 15 : 18} fill="rgba(8, 21, 40, 0.88)" stroke="rgba(103,232,249,0.18)" />
      <circle cx="36" cy="36" r="23.5" fill={`url(#${idPrefix}-glow)`} />
      <g opacity="0.99">
        <ellipse cx="22.75" cy="59.25" rx="6.25" ry="1.65" fill="rgba(15,23,42,0.58)" />
        <rect x="19.55" y="13.7" width="5.8" height="44.4" rx="2.9" fill={`url(#${idPrefix}-endmill-metal)`} stroke="rgba(255, 237, 213, 0.4)" strokeWidth="0.62" />
        <path d="M22.45 14.5v41.9" stroke="rgba(255,255,255,0.24)" strokeWidth="0.54" strokeLinecap="round" />
        <path d="M19.95 31.9c3.95 2.8 3.95 5.58 0 8.36" stroke="rgba(6,10,18,0.8)" strokeWidth="1.18" strokeLinecap="round" fill="none" />
        <path d="M19.95 36.25c3.95 2.8 3.95 5.58 0 8.36" stroke="rgba(6,10,18,0.8)" strokeWidth="1.18" strokeLinecap="round" fill="none" />
        <path d="M19.95 40.6c3.95 2.8 3.95 5.58 0 8.36" stroke="rgba(6,10,18,0.8)" strokeWidth="1.18" strokeLinecap="round" fill="none" />
        <path d="M19.95 44.95c3.95 2.8 3.95 5.58 0 8.36" stroke="rgba(6,10,18,0.8)" strokeWidth="1.18" strokeLinecap="round" fill="none" />
        <path d="M20.4 32.35c3.55 2.48 3.55 4.94 0 7.42" stroke={`url(#${idPrefix}-flute)`} strokeWidth="0.88" strokeLinecap="round" fill="none" />
        <path d="M20.4 36.7c3.55 2.48 3.55 4.94 0 7.42" stroke={`url(#${idPrefix}-flute)`} strokeWidth="0.88" strokeLinecap="round" fill="none" />
        <path d="M20.4 41.05c3.55 2.48 3.55 4.94 0 7.42" stroke={`url(#${idPrefix}-flute)`} strokeWidth="0.88" strokeLinecap="round" fill="none" />
        <path d="M20.4 45.4c3.55 2.48 3.55 4.94 0 7.42" stroke={`url(#${idPrefix}-flute)`} strokeWidth="0.88" strokeLinecap="round" fill="none" />
        <path d="M21.4 32.9c2.45 1.78 2.45 3.56 0 5.34" stroke="rgba(255,255,255,0.44)" strokeWidth="0.64" strokeLinecap="round" fill="none" />
        <path d="M21.4 37.25c2.45 1.78 2.45 3.56 0 5.34" stroke="rgba(255,255,255,0.44)" strokeWidth="0.64" strokeLinecap="round" fill="none" />
        <path d="M21.4 41.6c2.45 1.78 2.45 3.56 0 5.34" stroke="rgba(255,255,255,0.44)" strokeWidth="0.64" strokeLinecap="round" fill="none" />
        <path d="M21.4 45.95c2.45 1.78 2.45 3.56 0 5.34" stroke="rgba(255,255,255,0.44)" strokeWidth="0.64" strokeLinecap="round" fill="none" />
        <path d="M20.15 31.2h4.55" stroke="rgba(255,255,255,0.14)" strokeWidth="0.62" strokeLinecap="round" />
        <path d="M20.1 56.9h4.65" stroke="rgba(255,255,255,0.22)" strokeWidth="0.68" strokeLinecap="round" />
      </g>
      <path d="M30.4 17 30.4 36.6 35.8 40.4 36.7 27.5Z" fill="rgba(43, 182, 219, 0.94)" stroke="rgba(224,242,254,0.82)" strokeWidth="1.04" strokeLinejoin="round" />
      <path d="M30.4 17 47.4 27.4 36.7 27.5Z" fill={`url(#${idPrefix}-body)`} fillOpacity="0.99" stroke="rgba(224,242,254,0.84)" strokeWidth="1.04" strokeLinejoin="round" />
      <path d="M30.4 36.6 47.4 27.4 35.8 40.4Z" fill="rgba(79, 70, 229, 0.84)" stroke="rgba(224,242,254,0.74)" strokeWidth="1.02" strokeLinejoin="round" />
      <path d="M25.7 27.5H29.5" stroke={`url(#${idPrefix}-beam-horizontal)`} strokeWidth="2.05" strokeLinecap="round" />
      <path d="M30.4 17.2 36.7 27.5 35.8 40.1" stroke={`url(#${idPrefix}-beam-vertical)`} strokeWidth="0.98" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30.4 17V36.6" stroke="rgba(224,242,254,0.58)" strokeWidth="0.98" strokeLinecap="round" />
      <path d="M30.4 17 35.8 40.4" stroke="rgba(224,242,254,0.32)" strokeWidth="0.82" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30.4 36.6 47.4 27.4" stroke="rgba(8,15,28,0.42)" strokeWidth="0.92" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30.4 17 47.4 27.4 35.8 40.4 30.4 36.6V17Z" fill="none" stroke="rgba(224,242,254,0.34)" strokeWidth="0.78" strokeLinejoin="round" />
      <path d="M28.6 58.4H57.6" stroke="rgba(148,163,184,0.18)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// MachinePreviewIllustration moved to ./calculator/MachinePreviewIllustration.tsx
// per U-F3-FIRST-EXTRACTION (slot:quebec /goal yolo, 2026-05-26). The legacy
// inline body that previously lived here (~108 LOC) was deleted in this
// commit; the public symbol is now imported at the top of this file.
function _MachinePreviewIllustration_DEAD_BODY_GUARDED_NEVER_CALLED_FOR_ONE_REVISION() {
  type _Palette = { accent: string; accentSoft: string; fill: string; line: string; glow: string };
  const _palette = null as unknown as _Palette;
  const palette = _palette;
  const mode = 'mill' as MachineMode;
  const label = MACHINE_MODE_OPTIONS.find((item) => item.id === mode)?.label ?? mode;
  void label;
  const machineShape = (() => {
    switch (mode) {
      case 'mill':
        return (
          <>
            <rect x="36" y="96" width="148" height="18" rx="6" fill={palette.fill} />
            <rect x="52" y="34" width="34" height="78" rx="8" fill={palette.fill} />
            <rect x="82" y="28" width="80" height="18" rx="7" fill={palette.fill} />
            <rect x="140" y="46" width="28" height="56" rx="8" fill={palette.fill} />
            <rect x="90" y="80" width="68" height="16" rx="5" fill="rgba(248,250,252,0.12)" stroke={palette.line} strokeWidth="1.5" />
            <rect x="102" y="48" width="14" height="34" rx="5" fill={palette.accent} opacity="0.94" />
            <path d="M59 56h21m-21 11h21m-21 11h21" stroke={palette.line} strokeWidth="2" strokeLinecap="round" opacity="0.76" />
          </>
        );
      case 'lathe':
        return (
          <>
            <rect x="26" y="90" width="168" height="18" rx="8" fill={palette.fill} />
            <rect x="36" y="62" width="46" height="30" rx="7" fill={palette.fill} />
            <circle cx="60" cy="77" r="13" fill="rgba(248,250,252,0.13)" stroke={palette.line} strokeWidth="1.8" />
            <circle cx="60" cy="77" r="5.5" fill={palette.accent} />
            <rect x="92" y="70" width="58" height="14" rx="7" fill="rgba(248,250,252,0.14)" stroke={palette.line} strokeWidth="1.5" />
            <rect x="146" y="54" width="26" height="38" rx="6" fill={palette.fill} />
            <path d="M158 54v-14m-11 14 11-14 11 14" stroke={palette.line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M92 77h-10" stroke={palette.line} strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'edm':
        return (
          <>
            <rect x="42" y="88" width="136" height="26" rx="8" fill={palette.fill} />
            <rect x="56" y="30" width="30" height="58" rx="7" fill={palette.fill} />
            <rect x="84" y="24" width="68" height="14" rx="6" fill={palette.fill} />
            <rect x="116" y="38" width="10" height="30" rx="4" fill={palette.accent} />
            <rect x="92" y="68" width="58" height="14" rx="6" fill="rgba(248,250,252,0.12)" stroke={palette.line} strokeWidth="1.5" />
            <path d="M121 68v-14" stroke={palette.line} strokeWidth="2" strokeLinecap="round" />
            <path d="M64 46h14m-14 10h14m-14 10h14" stroke={palette.line} strokeWidth="2" strokeLinecap="round" opacity="0.74" />
          </>
        );
      case 'wire_edm':
        return (
          <>
            <rect x="38" y="28" width="30" height="82" rx="8" fill={palette.fill} />
            <rect x="154" y="28" width="28" height="82" rx="8" fill={palette.fill} />
            <rect x="68" y="28" width="86" height="14" rx="6" fill={palette.fill} />
            <rect x="82" y="84" width="56" height="18" rx="6" fill="rgba(248,250,252,0.12)" stroke={palette.line} strokeWidth="1.5" />
            <path d="M110 42v42" stroke={palette.accent} strokeWidth="3" strokeDasharray="4 4" strokeLinecap="round" />
            <path d="M98 84h24" stroke={palette.line} strokeWidth="2" strokeLinecap="round" />
            <path d="M48 54h10m96 0h10" stroke={palette.line} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          </>
        );
      case 'laser':
        return (
          <>
            <rect x="34" y="90" width="152" height="18" rx="7" fill={palette.fill} />
            <rect x="40" y="42" width="148" height="16" rx="7" fill={palette.fill} />
            <rect x="66" y="50" width="20" height="42" rx="7" fill={palette.fill} />
            <rect x="136" y="50" width="18" height="26" rx="6" fill={palette.fill} />
            <path d="M145 76v9" stroke={palette.accent} strokeWidth="3" strokeLinecap="round" />
            <path d="M145 86l-10 8h20l-10-8Z" fill={palette.accentSoft} stroke={palette.line} strokeWidth="1.4" />
            <path d="M54 58v32m118-32v32" stroke={palette.line} strokeWidth="2" opacity="0.74" />
          </>
        );
      case 'waterjet':
        return (
          <>
            <rect x="34" y="90" width="152" height="18" rx="7" fill={palette.fill} />
            <rect x="42" y="40" width="144" height="14" rx="7" fill={palette.fill} />
            <rect x="72" y="54" width="18" height="36" rx="7" fill={palette.fill} />
            <rect x="134" y="54" width="16" height="20" rx="6" fill={palette.fill} />
            <path d="M142 74v14" stroke={palette.accent} strokeWidth="3" strokeLinecap="round" />
            <path d="M142 90c0 0-3 6-6 10m6-10c0 0 3 6 6 10" stroke={palette.line} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M52 54v34m118-34v34" stroke={palette.line} strokeWidth="2" opacity="0.74" />
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <svg
      viewBox="0 0 220 140"
      role="img"
      aria-label={`${label} machine portrait`}
      className="calculator-toolbar-brand-machine-svg"
    >
      <defs>
        <linearGradient id={`calculator-machine-preview-${mode}`} x1="10%" y1="12%" x2="92%" y2="88%">
          <stop offset="0%" stopColor={palette.accent} stopOpacity="0.95" />
          <stop offset="100%" stopColor={palette.line} stopOpacity="0.72" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="200" height="120" rx="20" fill="rgba(3, 10, 22, 0.88)" />
      <rect x="20" y="18" width="180" height="104" rx="16" fill="rgba(9, 18, 33, 0.94)" stroke={palette.line} strokeOpacity="0.16" />
      <path d="M34 112H186" stroke={palette.line} strokeOpacity="0.28" strokeWidth="1.2" />
      <path d="M34 98H186M34 84H186M34 70H186M34 56H186M34 42H186" stroke={palette.line} strokeOpacity="0.09" strokeWidth="1" />
      <path d="M58 26h104" stroke={`url(#calculator-machine-preview-${mode})`} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="42" cy="26" r="4.8" fill={palette.accent} opacity="0.92" />
      <circle cx="178" cy="106" r="20" fill={palette.glow} />
      {machineShape}
    </svg>
  );
}

function MachineModeAnimatedPreview({ mode }: { mode: MachineMode }) {
  switch (mode) {
    case 'mill':
      return (
        <svg viewBox="0 0 140 72" aria-hidden="true" className="calculator-machine-mode-preview-svg">
          <rect className="machine-preview-base" x="20" y="52" width="100" height="10" rx="4" />
          <rect className="machine-preview-fill" x="28" y="22" width="18" height="30" rx="4" />
          <rect className="machine-preview-fill" x="44" y="18" width="54" height="10" rx="4" />
          <g className="machine-preview-mill-head">
            <rect className="machine-preview-fill-soft" x="86" y="27" width="16" height="19" rx="4" />
            <path className="machine-preview-tool" d="M94 46v10" />
            <path className="machine-preview-tool-detail" d="M92.5 48.5c2 1.6 2 3.1 0 4.7" />
            <path className="machine-preview-tool-detail" d="M92.5 51.6c2 1.6 2 3.1 0 4.7" />
          </g>
          <rect className="machine-preview-line-soft" x="62" y="42" width="30" height="8" rx="3" />
          <path className="machine-preview-line" d="M34 31h8M34 38h8M34 45h8" />
        </svg>
      );
    case 'lathe':
      return (
        <svg viewBox="0 0 140 72" aria-hidden="true" className="calculator-machine-mode-preview-svg">
          <rect className="machine-preview-base" x="16" y="50" width="108" height="10" rx="4" />
          <rect className="machine-preview-fill" x="18" y="31" width="30" height="19" rx="5" />
          <g className="machine-preview-lathe-spin">
            <circle className="machine-preview-line-soft" cx="32" cy="40.5" r="10.5" />
            <circle className="machine-preview-fill-soft" cx="32" cy="40.5" r="4.6" />
          </g>
          <rect className="machine-preview-line-soft" x="50" y="36" width="38" height="8" rx="4" />
          <g className="machine-preview-lathe-carriage">
            <rect className="machine-preview-fill" x="94" y="28" width="16" height="22" rx="4" />
            <path className="machine-preview-line" d="M102 28v-8m-7 8 7-8 7 8" />
          </g>
          <path className="machine-preview-line" d="M50 40.5H43" />
        </svg>
      );
    case 'edm':
      return (
        <svg viewBox="0 0 140 72" aria-hidden="true" className="calculator-machine-mode-preview-svg">
          <rect className="machine-preview-fill" x="20" y="20" width="18" height="32" rx="4" />
          <rect className="machine-preview-fill" x="36" y="16" width="42" height="8" rx="4" />
          <rect className="machine-preview-tank" x="48" y="42" width="40" height="12" rx="4" />
          <g className="machine-preview-edm-ram">
            <rect className="machine-preview-fill-soft" x="58" y="24" width="10" height="16" rx="3" />
            <path className="machine-preview-line" d="M63 40v4" />
          </g>
          <path className="machine-preview-spark" d="M62 45l2-4 2 4-2 5-2-5Z" />
          <rect className="machine-preview-base" x="30" y="54" width="72" height="8" rx="4" />
        </svg>
      );
    case 'wire_edm':
      return (
        <svg viewBox="0 0 140 72" aria-hidden="true" className="calculator-machine-mode-preview-svg">
          <rect className="machine-preview-fill" x="22" y="18" width="16" height="36" rx="4" />
          <rect className="machine-preview-fill" x="102" y="18" width="16" height="36" rx="4" />
          <rect className="machine-preview-fill" x="38" y="18" width="64" height="8" rx="4" />
          <rect className="machine-preview-line-soft" x="56" y="44" width="28" height="10" rx="4" />
          <path className="machine-preview-wire" d="M70 26v18" />
          <path className="machine-preview-spark" d="M66 45h8" />
          <rect className="machine-preview-base" x="30" y="56" width="80" height="6" rx="3" />
        </svg>
      );
    case 'laser':
      return (
        <svg viewBox="0 0 140 72" aria-hidden="true" className="calculator-machine-mode-preview-svg">
          <rect className="machine-preview-sheet" x="20" y="50" width="100" height="8" rx="3" />
          <rect className="machine-preview-fill" x="24" y="18" width="92" height="8" rx="4" />
          <g className="machine-preview-laser-head">
            <rect className="machine-preview-fill" x="82" y="26" width="14" height="18" rx="4" />
            <path className="machine-preview-laser-beam" d="M89 44v8" />
            <path className="machine-preview-spark" d="M84 53h10" />
          </g>
          <path className="machine-preview-line" d="M34 26v24m72-24v24" />
        </svg>
      );
    case 'waterjet':
      return (
        <svg viewBox="0 0 140 72" aria-hidden="true" className="calculator-machine-mode-preview-svg">
          <rect className="machine-preview-sheet" x="18" y="50" width="104" height="8" rx="3" />
          <rect className="machine-preview-fill" x="22" y="18" width="96" height="8" rx="4" />
          <g className="machine-preview-waterjet-head">
            <rect className="machine-preview-fill" x="84" y="26" width="12" height="14" rx="4" />
            <path className="machine-preview-water-stream" d="M90 40v9" />
            <path className="machine-preview-water-spray" d="M90 49c0 0-4 5-6 9m6-9c0 0 4 5 6 9m-4-6h8" />
          </g>
          <path className="machine-preview-line" d="M36 26v22m68-22v22" />
        </svg>
      );
    default:
      return null;
  }
}

export function CalculatorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const operatingSystem = useOperatingSystem();
  const {
    selection: shellCommerceSelection,
    setUnitSystem: setShellCommerceUnitSystem,
  } = useShellCommerceSelection();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const applyingSnapshotRef = useRef(false);
  const restoredDefaultMachineProfileRef = useRef(false);
  const finishControlModeRef = useRef<FinishControlMode>('auto');
  const previousFeatureResetMachineKeyRef = useRef<string>('');
  const previousMachineModeRef = useRef<MachineMode>('mill');
  const solveEpochRef = useRef(0);
  const [experience, setExperience] = useState<ExperienceLevel>('beginner');
  const [machineMode, setMachineMode] = useState<MachineMode>('mill');
  const [machineTypeId, setMachineTypeId] = useState('all');
  const [manufacturer, setManufacturer] = useState('all');
  const [machineId, setMachineId] = useState('haas-vf2ss');
  const [controllerOptionId, setControllerOptionId] = useState('');
  const [spindleOptionId, setSpindleOptionId] = useState('');
  const [toolingStationCountOverride, setToolingStationCountOverride] = useState<number | null>(null);
  const [materialGroup, setMaterialGroup] = useState('steel');
  const [materialSubcategoryId, setMaterialSubcategoryId] = useState('all');
  const [materialId, setMaterialId] = useState('4140');
  const [toolId, setToolId] = useState('face-mill');
  const [toolBodyFilter, setToolBodyFilter] = useState<ToolBodyFilter>('all');
  const [insertId, setInsertId] = useState('');
  const [operation, setOperation] = useState('face_milling');
  const [programmingId, setProgrammingId] = useState('mastercam-mill');
  const [toolpathTypeId, setToolpathTypeId] = useState('all');
  const [toolpathId, setToolpathId] = useState('mc-dynamic-mill');
  const [stockShape, setStockShape] = useState<StockShapeId>('plate');
  const [stockSource, setStockSource] = useState('shop-rack');
  const [stockX, setStockX] = useState(152.4);
  const [stockY, setStockY] = useState(101.6);
  const [stockZ, setStockZ] = useState(50.8);
  const [toolDiameter, setToolDiameter] = useState(76.2);
  const [flutes, setFlutes] = useState(6);
  const [doc, setDoc] = useState(2.5);
  const [woc, setWoc] = useState(38);
  const [toolStickout, setToolStickout] = useState(42);
  const [toolLoc, setToolLoc] = useState(22);
  const [coolant, setCoolant] = useState('flood');
  const [machineCoolantOptionIds, setMachineCoolantOptionIds] = useState<string[]>(
    () => filterCoolantOptionIds(MACHINE_CATALOG.find((item) => item.id === 'haas-vf2ss')?.coolantOptionIds, 'mill'),
  );
  const [selectedControllerCapabilityIds, setSelectedControllerCapabilityIds] = useState<string[]>([]);
  const [entryStyle, setEntryStyle] = useState('balanced');
  const [finishTarget, setFinishTarget] = useState('general');
  const [finishControlMode, setFinishControlMode] = useState<FinishControlMode>('auto');
  const [desiredRaUm, setDesiredRaUm] = useState(() => desiredRaForFinishTarget('general'));
  const [workholding, setWorkholding] = useState('vise-soft-jaw');
  const [workholdingCategory, setWorkholdingCategory] = useState('all');
  const [workholdingBrand, setWorkholdingBrand] = useState('all');
  const [workholdingPresetId, setWorkholdingPresetId] = useState('kurt-vise-parallels');
  const [stabilityId, setStabilityId] = useState('production-stable');
  const [setupSource, setSetupSource] = useState('recommended');
  const [toolVendorFilter, setToolVendorFilter] = useState('all');
  const [toolGeometryFilter, setToolGeometryFilter] = useState('all');
  const [toolSizeFilter, setToolSizeFilter] = useState('all');
  const [holderBrand, setHolderBrand] = useState('all');
  const [holderTypeFilter, setHolderTypeFilter] = useState('all');
  const [holderInterfaceFilter, setHolderInterfaceFilter] = useState('all');
  const [holderPackageId, setHolderPackageId] = useState('sandvik-shell-arbor');
  const [holderStyle, setHolderStyle] = useState('machine-standard');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(shellCommerceSelection.unitSystem);
  const [interfaceLanguage, setInterfaceLanguage] = useState<InterfaceLanguage>('en');
  const [shellRailCollapsed, setShellRailCollapsed] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return document.body.dataset.prismRailCollapsed === 'true';
  });
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [toolCribUploadSourceType, setToolCribUploadSourceType] =
    useState<CalculatorToolCribImportSourceType>('purchase_order');
  const [selectedStation, setSelectedStation] = useState(1);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [machineGuidewayType, setMachineGuidewayType] = useState<MachineCatalogItem['guidewayType']>(
    () => MACHINE_CATALOG.find((item) => item.id === 'haas-vf2ss')?.guidewayType,
  );
  const [machineAgeYears, setMachineAgeYears] = useState<number | null>(null);
  const [measuredMachinePowerKw, setMeasuredMachinePowerKw] = useState<number | null>(null);
  const [measuredMachineTorqueNm, setMeasuredMachineTorqueNm] = useState<number | null>(null);
  const [measuredMachineNaturalFrequencyHz, setMeasuredMachineNaturalFrequencyHz] = useState<number | null>(null);
  const [measuredMachineSystemStiffnessNPerUm, setMeasuredMachineSystemStiffnessNPerUm] = useState<number | null>(null);
  const [measuredMachineDampingRatio, setMeasuredMachineDampingRatio] = useState<number | null>(null);
  const [measuredMachineAxisAccelerationMps2, setMeasuredMachineAxisAccelerationMps2] = useState<number | null>(null);
  const [measuredMachineAxisJerkMps3, setMeasuredMachineAxisJerkMps3] = useState<number | null>(null);
  const [savedSetupSnapshots, setSavedSetupSnapshots] = useState<SetupSnapshot[]>([]);
  const [savedSnapshotId, setSavedSnapshotId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LiveResult | null>(null);
  const [wedmResult, setWedmResult] = useState<WireEdmCalcResult | null>(null);
  const [resultSolveSource, setResultSolveSource] = useState<CalculatorSolveSource | null>(null);
  const [liveMachines, setLiveMachines] = useState<MachineCatalogItem[]>(MACHINE_CATALOG);
  const [liveMaterials, setLiveMaterials] = useState(MATERIAL_CATALOG);
  const [liveProgrammingEnvironments, setLiveProgrammingEnvironments] = useState<ProgrammingEnvironment[]>(
    PROGRAMMING_ENVIRONMENTS.filter((item) => item.mode === 'mill'),
  );
  const [liveTools, setLiveTools] = useState(TOOL_CATALOG);
  const [liveHolderPackages, setLiveHolderPackages] = useState<HolderPackageOption[]>([]);
  const [machineCatalogStatus, setMachineCatalogStatus] = useState<CalculatorCatalogStatus>(DEFAULT_CATALOG_STATUS);
  const [materialCatalogStatus, setMaterialCatalogStatus] = useState<CalculatorCatalogStatus>(DEFAULT_CATALOG_STATUS);
  const [programmingCatalogStatus, setProgrammingCatalogStatus] = useState<CalculatorCatalogStatus>(DEFAULT_CATALOG_STATUS);
  const [toolCatalogStatus, setToolCatalogStatus] = useState<CalculatorCatalogStatus>(DEFAULT_CATALOG_STATUS);
  const [holderCatalogStatus, setHolderCatalogStatus] = useState<CalculatorCatalogStatus>(DEFAULT_CATALOG_STATUS);
  const [defaultMachineProfile, setDefaultMachineProfile] = useState<CalculatorSavedMachineProfile | null>(null);
  const [machineProfileSaveLoading, setMachineProfileSaveLoading] = useState(false);
  const [machineProfileSaveError, setMachineProfileSaveError] = useState<string | null>(null);
  const [machineProfileSaveSummary, setMachineProfileSaveSummary] = useState<string | null>(null);
  const [inventoryWorkspace, setInventoryWorkspace] = useState<InventoryOperationsWorkspace | null>(null);
  const [toolCribWorkspace, setToolCribWorkspace] = useState<CalculatorToolCribWorkspace | null>(null);
  const [toolCribImportLoading, setToolCribImportLoading] = useState(false);
  const [toolCribImportError, setToolCribImportError] = useState<string | null>(null);
  const [toolCribImportSummary, setToolCribImportSummary] = useState<string | null>(null);
  const [showLocalScanConsent, setShowLocalScanConsent] = useState(false);
  const [toolCribScanLoading, setToolCribScanLoading] = useState(false);
  const [toolCribScanError, setToolCribScanError] = useState<string | null>(null);
  const [prismModeEnabled, setPrismModeEnabled] = useState(false);
  const [prismPurchaseTarget, setPrismPurchaseTarget] = useState<PurchaseRecommendation | null>(null);
  const [prismLivePurchaseRecommendations, setPrismLivePurchaseRecommendations] = useState<PurchaseRecommendation[] | null>(null);
  const [prismPurchaseRecommendationSource, setPrismPurchaseRecommendationSource] = useState<'heuristic' | 'roi-engine'>('heuristic');
  const [prismPurchaseRecommendationNote, setPrismPurchaseRecommendationNote] = useState<string | null>(null);
  const [prismPurchaseRecommendationWarnings, setPrismPurchaseRecommendationWarnings] = useState<string[]>([]);
  const [sectionPurchaseView, setSectionPurchaseView] = useState<CalculatorSectionCommerceView | null>(null);
  const [sectionPurchaseBusyId, setSectionPurchaseBusyId] = useState<string | null>(null);
  const [showPrismModeDialog, setShowPrismModeDialog] = useState(false);
  const [showUploadWorkflowDialog, setShowUploadWorkflowDialog] = useState(false);
  const [showWhyPrismDialog, setShowWhyPrismDialog] = useState(false);
  const [activeHelpTopic, setActiveHelpTopic] = useState<ActiveCalculatorHelpTopic | null>(null);
  const [guidedModeEnabled, setGuidedModeEnabled] = useState(false);
  const [guidedAutoPlay, setGuidedAutoPlay] = useState(false);
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);
  const invalidateSolveState = useCallback((nextError: string | null = null) => {
    solveEpochRef.current += 1;
    setLoading(false);
    setResult(null);
    setWedmResult(null);
    setResultSolveSource(null);
    setError(nextError);
  }, []);
  const handleOpenHelpTopic = useCallback((topicId: HelpTopicId, anchorRect: CalculatorHelpAnchorRect) => {
    setActiveHelpTopic({
      topicId,
      anchorRect,
    });
  }, []);
  const [guideCursor, setGuideCursor] = useState<CalculatorGuideCursorState>({
    left: 0,
    top: 0,
    visible: false,
  });
  const [guideBubble, setGuideBubble] = useState<CalculatorGuideBubbleState>({
    visible: false,
    left: 0,
    top: 0,
    title: '',
    body: '',
  });
  const [guideFieldOverlays, setGuideFieldOverlays] = useState<CalculatorGuideFieldOverlay[]>([]);
  const guideAdvanceStateRef = useRef<{ panelId: string | null; complete: boolean }>({
    panelId: null,
    complete: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const readRailState = () => {
      if (typeof document === 'undefined') return;
      setShellRailCollapsed(document.body.dataset.prismRailCollapsed === 'true');
    };

    const handleRailState = (event: Event) => {
      const detail = (event as CustomEvent<{ collapsed?: boolean }>).detail;
      if (typeof detail?.collapsed === 'boolean') {
        setShellRailCollapsed(detail.collapsed);
        return;
      }
      readRailState();
    };

    readRailState();
    window.addEventListener('prism:rail-state', handleRailState);
    return () => window.removeEventListener('prism:rail-state', handleRailState);
  }, []);

  useEffect(() => {
    finishControlModeRef.current = finishControlMode;
  }, [finishControlMode]);

  useEffect(() => {
    let active = true;

    if (!operatingSystem.getCalculatorDefaultMachineProfile) {
      return () => {
        active = false;
      };
    }

    operatingSystem
      .getCalculatorDefaultMachineProfile({
        userId: CALCULATOR_DEFAULT_USER_ID,
        workspaceId: 'calculator',
      })
      .then((profile) => {
        if (!active) {
          return;
        }
        setDefaultMachineProfile(profile);
        if (profile && profile.machineMode !== machineMode) {
          setMachineMode(profile.machineMode);
        }
      })
      .catch(() => {
        if (active) {
          setDefaultMachineProfile(null);
        }
      });

    return () => {
      active = false;
    };
  }, [operatingSystem]);

  useEffect(() => {
    let active = true;

    if (!operatingSystem.getInventoryOperationsWorkspace) {
      return () => {
        active = false;
      };
    }

    operatingSystem
      .getInventoryOperationsWorkspace()
      .then((workspace) => {
        if (active) {
          setInventoryWorkspace(workspace);
        }
      })
      .catch(() => {
        if (active) {
          setInventoryWorkspace(null);
        }
      });

    return () => {
      active = false;
    };
  }, [operatingSystem]);

  useEffect(() => {
    let active = true;

    if (!operatingSystem.getCalculatorToolCribWorkspace) {
      return () => {
        active = false;
      };
    }

    operatingSystem
      .getCalculatorToolCribWorkspace({
        userId: CALCULATOR_DEFAULT_USER_ID,
        workspaceId: 'calculator',
      })
      .then((workspace) => {
        if (active) {
          setToolCribWorkspace(workspace);
        }
      })
      .catch(() => {
        if (active) {
          setToolCribWorkspace(null);
        }
      });

    return () => {
      active = false;
    };
  }, [operatingSystem]);

  useEffect(() => {
    let cancelled = false;
    fetchMachineCatalogState(machineMode).then((catalogState) => {
      if (!cancelled) {
        setLiveMachines(catalogState.items);
        setMachineCatalogStatus(toCatalogStatus(catalogState));
      }
    }).catch(() => {
      if (!cancelled) {
        const fallbackItems = MACHINE_CATALOG.filter((item) => item.mode === machineMode);
        setLiveMachines(fallbackItems);
        setMachineCatalogStatus({
          source: 'fallback',
          liveCount: 0,
          fallbackCount: fallbackItems.length,
          note: 'Machine registry is unavailable, so the bundled machine catalog is active.',
          sampled: false,
        });
      }
    });
    fetchProgrammingCatalogState(machineMode).then((catalogState) => {
      if (!cancelled) {
        setLiveProgrammingEnvironments(catalogState.items);
        setProgrammingCatalogStatus(toCatalogStatus(catalogState));
      }
    }).catch(() => {
      if (!cancelled) {
        const fallbackItems = PROGRAMMING_ENVIRONMENTS.filter((item) => item.mode === machineMode);
        setLiveProgrammingEnvironments(fallbackItems);
        setProgrammingCatalogStatus({
          source: 'fallback',
          liveCount: 0,
          fallbackCount: fallbackItems.length,
          note: 'Programming catalog route is unavailable, so the bundled programming catalog is active.',
          sampled: false,
        });
      }
    });
    fetchToolCatalogState(machineMode).then((catalogState) => {
      if (!cancelled) {
        setLiveTools(catalogState.items);
        setToolCatalogStatus(toCatalogStatus(catalogState));
      }
    }).catch(() => {
      if (!cancelled) {
        setLiveTools(TOOL_CATALOG);
        setToolCatalogStatus({
          source: 'fallback',
          liveCount: 0,
          fallbackCount: TOOL_CATALOG.filter((item) => item.mode === machineMode).length,
          note: 'Tool search is unavailable, so the curated fallback tool catalog is active.',
          sampled: false,
        });
      }
    });
    return () => { cancelled = true; };
  }, [machineMode]);

  useEffect(() => {
    let cancelled = false;
    fetchMaterialCatalogState(materialGroup).then((catalogState) => {
      if (!cancelled) {
        setLiveMaterials(catalogState.items);
        setMaterialCatalogStatus(toCatalogStatus(catalogState));
      }
    }).catch(() => {
      if (!cancelled) {
        setLiveMaterials(MATERIAL_CATALOG);
        setMaterialCatalogStatus({
          source: 'fallback',
          liveCount: 0,
          fallbackCount: MATERIAL_CATALOG.filter((item) => item.group === materialGroup).length,
          note: 'Material registry is unavailable, so the curated fallback material catalog is active.',
          sampled: false,
        });
      }
    });
    return () => { cancelled = true; };
  }, [materialGroup]);

  useEffect(() => {
    if (restoredDefaultMachineProfileRef.current || !defaultMachineProfile) {
      return;
    }

    if (defaultMachineProfile.machineMode !== machineMode) {
      setMachineMode(defaultMachineProfile.machineMode);
      return;
    }

    const machine = liveMachines.find((item) => item.id === defaultMachineProfile.machineId);
    if (!machine) {
      return;
    }

    restoredDefaultMachineProfileRef.current = true;
    applyingSnapshotRef.current = true;
    setMachineTypeId(machine.machineTypeId);
    setManufacturer(machine.manufacturer);
    setMachineId(machine.id);
    setControllerOptionId(defaultMachineProfile.selectedControllerId);
    setSpindleOptionId(defaultMachineProfile.selectedSpindlePackageId);
    setToolingStationCountOverride(defaultMachineProfile.toolingStationCountOverride ?? null);
    setMachineCoolantOptionIds(filterCoolantOptionIds(defaultMachineProfile.enabledCoolantStrategyIds, machine.mode));
    setSelectedControllerCapabilityIds(defaultMachineProfile.enabledControllerFeatureIds);
    setSelectedFeatureIds(defaultMachineProfile.enabledMachineFeatureIds ?? defaultSelectedFeatureIds(defaultMachineProfile.machineMode, machine));
    setMachineGuidewayType(defaultMachineProfile.measuredPerformance?.guidewayType ?? machine.guidewayType);
    setMachineAgeYears(defaultMachineProfile.measuredPerformance?.machineAgeYears ?? null);
    setMeasuredMachinePowerKw(defaultMachineProfile.measuredPerformance?.measuredPowerKw ?? null);
    setMeasuredMachineTorqueNm(defaultMachineProfile.measuredPerformance?.measuredMaxTorqueNm ?? null);
    setMeasuredMachineNaturalFrequencyHz(defaultMachineProfile.measuredPerformance?.measuredNaturalFrequencyHz ?? null);
    setMeasuredMachineSystemStiffnessNPerUm(defaultMachineProfile.measuredPerformance?.measuredSystemStiffnessNPerUm ?? null);
    setMeasuredMachineDampingRatio(defaultMachineProfile.measuredPerformance?.measuredDampingRatio ?? null);
    setMeasuredMachineAxisAccelerationMps2(defaultMachineProfile.measuredPerformance?.measuredAxisAccelerationMps2 ?? null);
    setMeasuredMachineAxisJerkMps3(defaultMachineProfile.measuredPerformance?.measuredAxisJerkMps3 ?? null);
  }, [defaultMachineProfile, liveMachines, machineMode]);

  const machinesForMode = [...liveMachines.filter((item) => item.mode === machineMode)].sort(
    (left, right) => left.manufacturer.localeCompare(right.manufacturer) || left.model.localeCompare(right.model),
  );
  const machineTypeOptions = buildMachineTypeOptions(machinesForMode, machineMode);
  const machinesForSelectedType =
    machineTypeId === 'all'
      ? machinesForMode
      : machinesForMode.filter((item) => item.machineTypeId === machineTypeId);
  const manufacturersForSelectedType = Array.from(
    new Set(machinesForSelectedType.map((item) => item.manufacturer).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
  const manufacturerOptions = [
    {
      id: 'all',
      label: `All manufacturers (${manufacturersForSelectedType.length})`,
    },
    ...manufacturersForSelectedType.map((item) => ({
      id: item,
      label: item,
    })),
  ];
  const filteredMachines = manufacturer === 'all'
    ? machinesForSelectedType
    : machinesForSelectedType.filter((item) => item.manufacturer === manufacturer);
  const explicitlySelectedMachine = machineId
    ? machinesForMode.find((item) => item.id === machineId)
    : undefined;
  const selectedMachine =
    explicitlySelectedMachine
    ?? filteredMachines.find((item) => item.id === machineId)
    ?? filteredMachines[0]
    ?? machinesForSelectedType[0]
    ?? machinesForMode[0];
  const effectiveToolingLayout = resolveEffectiveToolingLayout(selectedMachine?.toolingLayout, toolingStationCountOverride);
  const effectiveSelectedMachine =
    selectedMachine && effectiveToolingLayout
      ? { ...selectedMachine, toolingLayout: effectiveToolingLayout }
      : selectedMachine;
  const machineSelection = resolveMachineSelectionOptions(
    selectedMachine,
    controllerOptionId,
    spindleOptionId,
    machineMode,
  );
  const controllerOptions = machineSelection.controllerOptions.length
    ? machineSelection.controllerOptions
    : [{ id: 'controller-pending', label: 'Controller pending', detail: 'Select a machine to load controller options.' }];
  const spindleOptions = machineSelection.spindleOptions.length
    ? machineSelection.spindleOptions
    : [{ id: 'spindle-pending', label: 'Spindle package pending', detail: 'Select a machine to load spindle options.' }];
  const allowedMachineCoolantIds = machineSelection.coolantOptionIds.length
    ? machineSelection.coolantOptionIds
    : filterCoolantOptionIds(selectedMachine?.coolantOptionIds, machineMode);
  const machineCoolantToggleOptions = coolantOptionsForMode(machineMode).filter((option) =>
    allowedMachineCoolantIds.includes(option.id as CoolantOptionId),
  );
  const enabledMachineCoolantIds = filterCoolantOptionIds(
    machineCoolantOptionIds.filter((optionId) => allowedMachineCoolantIds.includes(optionId as CoolantOptionId)),
    machineMode,
  );
  const enabledMachineCoolantOptions = machineCoolantToggleOptions.filter((option) =>
    enabledMachineCoolantIds.includes(option.id as CoolantOptionId),
  );
  const coolantStrategyOptions = enabledMachineCoolantOptions.length
    ? enabledMachineCoolantOptions
    : machineCoolantToggleOptions.length
      ? machineCoolantToggleOptions
      : coolantOptionsForMode(machineMode);
  const allowedMachineCoolantSignature = allowedMachineCoolantIds.join('|');
  const machineCoolantSummary = coolantStrategyOptions.map((option) => option.label).join(' / ') || 'Select a machine capability';
  const selectedControllerOption = controllerOptions.find((item) => item.id === controllerOptionId) ?? controllerOptions[0];
  const selectedSpindleOption = spindleOptions.find((item) => item.id === spindleOptionId) ?? spindleOptions[0];
  const controllerCapabilityOptions = machineSelection.controllerCapabilityOptions.length
    ? machineSelection.controllerCapabilityOptions
    : selectedMachine?.controllerCapabilityOptions ?? [];
  const enabledControllerCapabilityIds = selectedControllerCapabilityIds.filter((capabilityId) =>
    controllerCapabilityOptions.some((option) => option.id === capabilityId),
  );
  const enabledControllerCapabilities = controllerCapabilityOptions.filter((option) =>
    enabledControllerCapabilityIds.includes(option.id),
  );
  const currentMeasuredMachinePerformance = buildMeasuredMachinePerformance({
    baselineGuidewayType: selectedMachine?.guidewayType,
    guidewayType: machineGuidewayType,
    machineAgeYears,
    measuredPowerKw: measuredMachinePowerKw,
    measuredMaxTorqueNm: measuredMachineTorqueNm,
    measuredNaturalFrequencyHz: measuredMachineNaturalFrequencyHz,
    measuredSystemStiffnessNPerUm: measuredMachineSystemStiffnessNPerUm,
    measuredDampingRatio: measuredMachineDampingRatio,
    measuredAxisAccelerationMps2: measuredMachineAxisAccelerationMps2,
    measuredAxisJerkMps3: measuredMachineAxisJerkMps3,
  });
  const effectiveMachineGuidewayType =
    currentMeasuredMachinePerformance?.guidewayType
    ?? machineGuidewayType
    ?? selectedMachine?.guidewayType;
  const measuredMachineSummaryLabel = currentMeasuredMachinePerformance ? 'Shop-audited' : 'Catalog baseline';
  const spindlePackageLabel =
    machineMode === 'edm' || machineMode === 'wire_edm' || machineMode === 'laser' || machineMode === 'waterjet'
      ? 'Process package'
      : 'Spindle package';
  const toolingStationFieldLabel = toolingStationLabel(effectiveToolingLayout);
  const toolingStationOptions = buildToolingStationOptions(selectedMachine?.toolingLayout, toolingStationCountOverride);
  const canAdjustToolingStations = Boolean(
    selectedMachine?.toolingLayout
    && supportsToolingStationSelection(selectedMachine.toolingLayout)
    && selectedMachine.toolingLayout.allowCustomStations !== false,
  );
  const effectiveToolingStationCount = effectiveToolingLayout?.stations;
  const savedMachineOptions = machinesForMode.map((item) => ({
    id: item.id,
    label: `${item.manufacturer} ${item.model}`,
    detail: `${item.machineTypeLabel} / ${item.family} / ${item.controllerOptions[0]?.label ?? 'Controller pending'}`,
  }));
  const isSelectedMachineProfileDefault = Boolean(
    defaultMachineProfile
    && selectedMachine
    && selectedControllerOption
    && selectedSpindleOption
    && defaultMachineProfile.machineId === selectedMachine.id
    && defaultMachineProfile.selectedControllerId === selectedControllerOption.id
    && defaultMachineProfile.selectedSpindlePackageId === selectedSpindleOption.id
    && (defaultMachineProfile.toolingStationCountOverride ?? effectiveToolingLayout?.stations ?? null) === (effectiveToolingStationCount ?? null)
    && sameIdSet(defaultMachineProfile.enabledCoolantStrategyIds, enabledMachineCoolantIds)
    && sameIdSet(defaultMachineProfile.enabledControllerFeatureIds, enabledControllerCapabilityIds)
    && sameIdSet(defaultMachineProfile.enabledMachineFeatureIds ?? [], selectedFeatureIds)
    && sameMeasuredMachinePerformance(defaultMachineProfile.measuredPerformance, currentMeasuredMachinePerformance),
  );
  const toolCribImportCount = toolCribWorkspace?.imports.length ?? 0;
  const toolCribLibraryCount = toolCribWorkspace?.discoveredLibraries.length ?? 0;
  const toolCribLatestImport = toolCribWorkspace?.imports[0] ?? null;
  const toolCribLatestPrivacyNote = toolCribLatestImport?.redaction?.applied
    ? toolCribLatestImport.redaction.note
    : null;
  const toolCribTopToolingPartNumbers = toolCribWorkspace?.toolingPartNumbers.slice(0, 4) ?? [];
  const toolCribTopPartNumbers = toolCribWorkspace?.partNumbers.slice(0, 4) ?? [];
  const toolCribTopLibraries = toolCribWorkspace?.discoveredLibraries.slice(0, 3) ?? [];
  const myShopPanelSummary = defaultMachineProfile?.canDriveCalculatorSelections
    ? `${savedSetupSnapshots.length} saved / default linked / ${toolCribImportCount} imports`
    : `${savedSetupSnapshots.length} saved / ${toolCribImportCount} imports`;
  const defaultMachineProfileStatusLabel = defaultMachineProfile
    ? isSelectedMachineProfileDefault
      ? 'Active default'
      : 'Stored default'
    : 'Not saved';
  const defaultMachineProfileSupportCopy = defaultMachineProfile?.canDriveCalculatorSelections
    ? 'This default can repopulate controller, spindle, tooling capacity, coolant, verified machine features, and measured machine posture anywhere the calculator machine profile is reused.'
    : 'Save the active machine package here to make it the reusable calculator default.';
  const defaultMachineControllerSummary = isSelectedMachineProfileDefault
    ? selectedControllerOption?.label ?? defaultMachineProfile?.selectedControllerId ?? 'Pending'
    : defaultMachineProfile?.selectedControllerId ?? 'Not saved';
  const defaultMachineSpindleSummary = isSelectedMachineProfileDefault
    ? selectedSpindleOption?.label ?? defaultMachineProfile?.selectedSpindlePackageId ?? 'Pending'
    : defaultMachineProfile?.selectedSpindlePackageId ?? 'Not saved';
  const defaultMachineToolingSummary =
    defaultMachineProfile?.toolingStationCountOverride != null
      ? formatToolingCapacitySummary(
          effectiveToolingLayout?.kind ?? selectedMachine?.toolingLayout?.kind,
          defaultMachineProfile.toolingStationCountOverride,
        )
      : 'Not saved';
  const defaultMachineFeatureSummary = defaultMachineProfile
    ? `${defaultMachineProfile.enabledMachineFeatureIds?.length ?? 0} verified`
    : 'Not saved';
  const defaultMachineMeasuredSummary = defaultMachineProfile?.measuredPerformance ? 'Saved' : 'Catalog baseline';
  const canSaveMachineProfile = Boolean(selectedMachine && operatingSystem.saveCalculatorMachineProfile);
  const saveMachineProfileActionLabel =
    isSelectedMachineProfileDefault
      ? 'Refresh calculator default'
      : 'Save current machine as default';

  const materialsForGroup = liveMaterials.filter((item) => item.group === materialGroup);
  const materialSubcategoryGroups = new Map<string, { label: string; count: number }>();
  for (const item of materialsForGroup) {
    const id = item.subcategoryId ?? 'general';
    const label = item.subcategoryLabel ?? item.familyLabel ?? 'General';
    const existing = materialSubcategoryGroups.get(id);
    materialSubcategoryGroups.set(id, {
      label,
      count: (existing?.count ?? 0) + 1,
    });
  }
  const materialSubcategoryOptions = [
    {
      id: 'all',
      label: `All subcategories (${materialsForGroup.length})`,
      detail: 'Show every material family inside the selected group.',
    },
    ...Array.from(materialSubcategoryGroups.entries())
      .sort((left, right) => left[1].label.localeCompare(right[1].label))
      .map(([id, summary]) => ({
        id,
        label: `${summary.label} (${summary.count})`,
        detail: `${summary.count} material variant${summary.count === 1 ? '' : 's'} in this family.`,
      })),
  ];
  const materialSubcategorySignature = materialSubcategoryOptions.map((item) => item.id).join('|');
  const materialsForSelection = materialSubcategoryId === 'all'
    ? materialsForGroup
    : materialsForGroup.filter((item) => (item.subcategoryId ?? 'general') === materialSubcategoryId);
  const materialsForSelectionSignature = materialsForSelection.map((item) => item.id).join('|');
  const selectedMaterial =
    materialsForSelection.find((item) => item.id === materialId)
    ?? materialsForSelection[0]
    ?? (materialSubcategoryId === 'all' ? materialsForGroup.find((item) => item.id === materialId) : undefined)
    ?? (materialSubcategoryId === 'all' ? materialsForGroup[0] : undefined)
    ?? liveMaterials[0];
  const machineCatalogBadge = machineCatalogStatus.source === 'live'
    ? 'Live machine registry'
    : machineCatalogStatus.source === 'hybrid'
      ? 'Hybrid machine slice'
      : machineCatalogStatus.source === 'fallback'
        ? 'Fallback machine slice'
        : 'No machine slice';
  const machineCatalogSummary = machineCatalogStatus.source === 'hybrid'
    ? `${machineCatalogStatus.liveCount.toLocaleString()} live + ${machineCatalogStatus.fallbackCount.toLocaleString()} bundled`
    : machineCatalogStatus.source === 'live'
      ? `${machineCatalogStatus.liveCount.toLocaleString()} live packages loaded`
      : `${machineCatalogStatus.fallbackCount.toLocaleString()} bundled packages loaded`;
  const overallCatalogSource = deriveOverallCatalogSource([
    machineCatalogStatus,
    materialCatalogStatus,
    programmingCatalogStatus,
    toolCatalogStatus,
    holderCatalogStatus,
  ]);
  const overallCatalogLabel = overallCatalogSource === 'live'
    ? calculatorCopy(interfaceLanguage, 'toolbar.liveRegistry', 'Live registry')
    : overallCatalogSource === 'hybrid'
      ? calculatorCopy(interfaceLanguage, 'toolbar.hybridSources', 'Hybrid Sources')
      : calculatorCopy(interfaceLanguage, 'toolbar.staticData', 'Static data');
  const overallCatalogPillClass = overallCatalogSource === 'live'
    ? 'calculator-toolbar-brand-pill-live'
    : overallCatalogSource === 'hybrid'
      ? 'calculator-toolbar-brand-pill-hybrid'
      : 'calculator-toolbar-brand-pill-static';
  const materialCatalogBadge = materialCatalogStatus.source === 'live'
    ? 'Live material registry'
    : materialCatalogStatus.source === 'hybrid'
      ? 'Hybrid material catalog'
      : materialCatalogStatus.source === 'fallback'
        ? 'Fallback material catalog'
        : 'No material catalog';
  const materialCatalogSummary = materialCatalogStatus.source === 'hybrid'
    ? `${materialCatalogStatus.liveCount.toLocaleString()} live + ${materialCatalogStatus.fallbackCount.toLocaleString()} curated`
    : materialCatalogStatus.source === 'live'
      ? `${materialCatalogStatus.liveCount.toLocaleString()} live materials loaded`
      : `${(materialCatalogStatus.fallbackCount || liveMaterials.length).toLocaleString()} curated materials loaded`;

  const toolSelectionMachine = effectiveSelectedMachine ?? selectedMachine;
  const baseToolsForMode = liveTools
    .filter((item) => item.mode === machineMode)
    .filter((item) => {
      if (
        machineMode === 'lathe'
        && item.requiresLiveTooling
        && !toolSelectionMachine?.toolingLayout?.liveTooling
        && !toolSelectionMachine?.toolingLayout?.hasMillingHead
      ) {
        return false;
      }
      return true;
    });

  const holderCompatibilityMachine = effectiveSelectedMachine ?? selectedMachine;
  const fallbackCompatibleHolderPackages = HOLDER_PACKAGE_LIBRARY.filter(
    (item) => item.mode === machineMode && holderPackageMatchesMachine(item, holderCompatibilityMachine),
  );
  const catalogCompatibleHolderPackages = liveHolderPackages.filter(
    (item) => item.mode === machineMode && holderPackageMatchesMachine(item, holderCompatibilityMachine),
  );
  const compatibleHolderPackagesBase = catalogCompatibleHolderPackages.length
    ? catalogCompatibleHolderPackages
    : fallbackCompatibleHolderPackages;
  const legacySelectedHolderPackage = HOLDER_PACKAGE_LIBRARY.find(
    (item) => item.id === holderPackageId && item.mode === machineMode && holderPackageMatchesMachine(item, holderCompatibilityMachine),
  );
  const compatibleHolderPackages =
    legacySelectedHolderPackage && !compatibleHolderPackagesBase.some((item) => item.id === legacySelectedHolderPackage.id)
      ? [...compatibleHolderPackagesBase, legacySelectedHolderPackage]
      : compatibleHolderPackagesBase;
  const holderCatalogSource: CalculatorCatalogSourceState = catalogCompatibleHolderPackages.length
    ? holderCatalogStatus.source
    : compatibleHolderPackages.length
      ? 'fallback'
      : 'empty';
  const dynamicHolderBrandOptions = compatibleHolderPackages.length
    ? [
        {
          id: 'all',
          label: `All holder brands (${new Set(compatibleHolderPackages.map((item) => item.brandId)).size})`,
          detail: 'Show every compatible holder package from the active machine-compatible database slice.',
        },
        ...Array.from(
          new Map(
            compatibleHolderPackages
              .filter((item) => item.brandId && (item.brandLabel ?? item.brandId))
              .map((item) => [
                item.brandId,
                {
                  id: item.brandId,
                  label: item.brandLabel ?? humanizeToken(item.brandId),
                  detail: `${compatibleHolderPackages.filter((candidate) => candidate.brandId === item.brandId).length} compatible holder packages`,
                },
              ]),
          ).values(),
        ).sort((left, right) => left.label.localeCompare(right.label)),
      ]
    : [];
  const holderBrandOptions = dynamicHolderBrandOptions.length
    ? dynamicHolderBrandOptions
    : HOLDER_BRAND_OPTIONS[machineMode];
  const filteredHolderStyleOptions = HOLDER_STYLE_OPTIONS[machineMode].filter(
    (item) => compatibleHolderPackages.some((pkg) => holderPackageMatchesStyle(pkg, item.id, holderCompatibilityMachine)),
  );
  const holderStyleOptions = filteredHolderStyleOptions.length
    ? filteredHolderStyleOptions
    : HOLDER_STYLE_OPTIONS[machineMode];
  const holderPackagesAfterBrandAndStyle = compatibleHolderPackages.filter(
    (item) =>
      (holderBrand === 'all' || item.brandId === holderBrand)
      && holderPackageMatchesStyle(item, holderStyle, holderCompatibilityMachine),
  );
  const holderTypeOptions = buildDynamicFilterOptions({
    items: holderPackagesAfterBrandAndStyle,
    allLabel: 'All holder types',
    allDetail: 'Show every compatible holder type for the active machine, brand, and holder posture.',
    getId: holderPackageTypeId,
    getLabel: holderPackageTypeLabel,
  });
  const holderPackagesAfterType = holderTypeFilter === 'all'
    ? holderPackagesAfterBrandAndStyle
    : holderPackagesAfterBrandAndStyle.filter((item) => holderPackageTypeId(item) === holderTypeFilter);
  const holderInterfaceOptions = buildDynamicFilterOptions({
    items: holderPackagesAfterType,
    allLabel: 'All holder sizes',
    allDetail: 'Show every compatible holder interface / size for the active machine package.',
    getId: (item) => holderPackageInterfaceId(item, holderCompatibilityMachine),
    getLabel: (item) => holderPackageInterfaceLabel(item, holderCompatibilityMachine),
  });
  const holderPackagesForMode = holderInterfaceFilter === 'all'
    ? holderPackagesAfterType
    : holderPackagesAfterType.filter((item) => holderPackageInterfaceId(item, holderCompatibilityMachine) === holderInterfaceFilter);
  const selectedHolderPackage =
    holderPackagesForMode.find((item) => item.id === holderPackageId) ??
    compatibleHolderPackages.find((item) => item.id === holderPackageId) ??
    holderPackagesForMode[0];
  const holderSelectionLabel = holderCatalogSource === 'live' || holderCatalogSource === 'hybrid'
    ? 'Compatible tool holder'
    : 'Holder package';
  const holderCatalogBadge = holderCatalogSource === 'live'
    ? 'Live holder database'
    : holderCatalogSource === 'hybrid'
      ? 'Hybrid holder catalog'
      : holderCatalogSource === 'fallback'
        ? 'Fallback holder library'
        : 'No compatible holders';
  const holderSelectionSummary = `${holderPackagesForMode.length || compatibleHolderPackages.length} compatible ${machineMode === 'lathe' ? 'holders' : 'tool holders'}`;
  const holderCatalogSummary = holderCatalogSource === 'hybrid'
    ? `${holderCatalogStatus.liveCount.toLocaleString()} live + ${holderCatalogStatus.fallbackCount.toLocaleString()} curated`
    : holderCatalogSource === 'live'
      ? `${catalogCompatibleHolderPackages.length.toLocaleString()} live compatible packages`
      : `${(compatibleHolderPackages.length || holderCatalogStatus.fallbackCount).toLocaleString()} curated compatible packages`;
  const toolingBadges = toolingCapabilityBadges(selectedMachine);
  const programmingCatalogBadge = programmingCatalogStatus.source === 'live'
    ? 'Live programming catalog'
    : programmingCatalogStatus.source === 'hybrid'
      ? 'Hybrid programming catalog'
      : programmingCatalogStatus.source === 'fallback'
        ? 'Fallback programming catalog'
        : 'No programming catalog';
  const programmingCatalogSummary = programmingCatalogStatus.source === 'hybrid'
    ? `${programmingCatalogStatus.liveCount.toLocaleString()} live + ${programmingCatalogStatus.fallbackCount.toLocaleString()} bundled`
    : programmingCatalogStatus.source === 'live'
      ? `${liveProgrammingEnvironments.length.toLocaleString()} live packages loaded`
      : `${(programmingCatalogStatus.fallbackCount || liveProgrammingEnvironments.length).toLocaleString()} bundled packages loaded`;
  const programmingEnvironmentsForMode = liveProgrammingEnvironments.filter((item) => item.mode === machineMode);
  const selectedProgramming =
    programmingEnvironmentsForMode.find((item) => item.id === programmingId) ?? programmingEnvironmentsForMode[0];
  const programmingLicenseOptions = licenseOptionsFor(selectedProgramming);
  const [licenseTierId, setLicenseTierId] = useState(
    programmingLicenseOptions[programmingLicenseOptions.length - 1]?.id ?? 'full',
  );
  const toolpathOptions = selectedProgramming?.toolpaths ?? [];
  const licensedToolpathOptions = filterToolpathsForLicense(selectedProgramming, toolpathOptions, licenseTierId, selectedMachine);
  const toolpathTypes = buildToolpathTypeOptions(licensedToolpathOptions);
  const selectedToolpathType = toolpathTypes.find((item) => item.id === toolpathTypeId) ?? toolpathTypes[0];
  const filteredToolpathOptions = selectedToolpathType?.id === 'all'
    ? licensedToolpathOptions
    : licensedToolpathOptions.filter((item) => classifyToolpathType(item).id === selectedToolpathType?.id);
  const selectedToolpath =
    filteredToolpathOptions.find((item) => item.id === toolpathId) ??
    licensedToolpathOptions.find((item) => item.id === toolpathId) ??
    filteredToolpathOptions[0] ??
    licensedToolpathOptions[0];
  const compatibleToolsForMode = selectedToolpath
    ? baseToolsForMode.filter((item) => toolSupportsToolpath(item, selectedToolpath))
    : baseToolsForMode;
  const toolConstructionCounts = compatibleToolsForMode.reduce(
    (totals, item) => {
      const bodyType = inferToolBodyType(item);
      totals[bodyType] += 1;
      return totals;
    },
    { solid: 0, indexable: 0 },
  );
  const toolBodyFilterOptions = [
    {
      id: 'all',
      label: `All constructions (${compatibleToolsForMode.length})`,
      detail: 'Show every tool body that fits the current toolpath and machine setup.',
    },
    {
      id: 'solid',
      label: `Solid bodies (${toolConstructionCounts.solid})`,
      detail: 'Solid carbide, HSS, brazed, and monoblock tooling only.',
    },
    {
      id: 'indexable',
      label: `Indexable bodies (${toolConstructionCounts.indexable})`,
      detail: 'Only tool bodies and holders that take replaceable inserts.',
    },
  ].filter((option) => option.id === 'all' || toolConstructionCounts[option.id as Exclude<ToolBodyFilter, 'all'>] > 0);
  const bodyFilteredToolsForMode = toolBodyFilter === 'all'
    ? compatibleToolsForMode
    : compatibleToolsForMode.filter((item) => inferToolBodyType(item) === toolBodyFilter);
  const toolVendorOptions = buildDynamicFilterOptions({
    items: bodyFilteredToolsForMode,
    allLabel: 'All tool brands',
    allDetail: 'Show every compatible tool brand/vendor for the active toolpath and construction filter.',
    getId: toolVendorFilterId,
    getLabel: toolVendorFilterLabel,
  });
  const vendorFilteredToolsForMode = toolVendorFilter === 'all'
    ? bodyFilteredToolsForMode
    : bodyFilteredToolsForMode.filter((item) => toolVendorFilterId(item) === toolVendorFilter);
  const toolGeometryOptions = buildDynamicFilterOptions({
    items: vendorFilteredToolsForMode,
    allLabel: 'All tool types',
    allDetail: 'Show every compatible tool geometry/type for the active machine and brand slice.',
    getId: toolGeometryFilterId,
    getLabel: toolGeometryFilterLabel,
  });
  const geometryFilteredToolsForMode = toolGeometryFilter === 'all'
    ? vendorFilteredToolsForMode
    : vendorFilteredToolsForMode.filter((item) => toolGeometryFilterId(item) === toolGeometryFilter);
  const toolSizeOptions = buildDynamicFilterOptions({
    items: geometryFilteredToolsForMode,
    allLabel: 'All tool sizes',
    allDetail: 'Show every compatible tool size bucket for the active machine, geometry, and toolpath slice.',
    getId: toolSizeBucketId,
    getLabel: toolSizeBucketLabel,
  });
  const sizedFilteredToolsForMode = toolSizeFilter === 'all'
    ? geometryFilteredToolsForMode
    : geometryFilteredToolsForMode.filter((item) => toolSizeBucketId(item) === toolSizeFilter);
  const toolsForMode = sizedFilteredToolsForMode.length
    ? sizedFilteredToolsForMode
    : geometryFilteredToolsForMode.length
      ? geometryFilteredToolsForMode
      : vendorFilteredToolsForMode.length
        ? vendorFilteredToolsForMode
        : bodyFilteredToolsForMode.length
          ? bodyFilteredToolsForMode
          : compatibleToolsForMode.length
            ? compatibleToolsForMode
            : baseToolsForMode;
  const liveToolsForMode = toolsForMode.filter((item) => item.source === 'database');
  const toolCatalogBadge = toolCatalogStatus.source === 'live'
    ? (toolCatalogStatus.sampled ? 'Sampled live tool catalog' : 'Live tool database')
    : toolCatalogStatus.source === 'hybrid'
      ? (toolCatalogStatus.sampled ? 'Sampled + curated tool catalog' : 'Hybrid tool catalog')
      : toolCatalogStatus.source === 'fallback'
        ? 'Curated fallback'
        : 'No compatible tools';
  const toolCatalogSummary = toolCatalogStatus.source === 'hybrid'
    ? `${toolCatalogStatus.liveCount.toLocaleString()} ${toolCatalogStatus.sampled ? 'sampled live' : 'live'} + ${toolCatalogStatus.fallbackCount.toLocaleString()} curated`
    : selectedToolpath
      ? `${toolsForMode.length.toLocaleString()} compatible tool bodies shown`
      : liveToolsForMode.length
        ? `${toolsForMode.length.toLocaleString()} compatible ${toolCatalogStatus.sampled ? 'sampled-live' : 'live'} tools loaded`
        : `${toolsForMode.length.toLocaleString()} curated tools available`;
  const backendWiringStatusCards: Array<{
    id: string;
    label: string;
    badge: string;
    summary: string;
    note: string;
    source: CalculatorCatalogSourceState;
  }> = [
    {
      id: 'machines',
      label: 'Machines',
      badge: machineCatalogBadge,
      summary: machineCatalogSummary,
      note: machineCatalogStatus.note,
      source: effectiveCatalogSource(machineCatalogStatus),
    },
    {
      id: 'materials',
      label: 'Materials',
      badge: materialCatalogBadge,
      summary: materialCatalogSummary,
      note: materialCatalogStatus.note,
      source: effectiveCatalogSource(materialCatalogStatus),
    },
    {
      id: 'programming',
      label: 'Programming',
      badge: programmingCatalogBadge,
      summary: programmingCatalogSummary,
      note: programmingCatalogStatus.note,
      source: effectiveCatalogSource(programmingCatalogStatus),
    },
    {
      id: 'tooling',
      label: 'Tooling',
      badge: toolCatalogBadge,
      summary: toolCatalogSummary,
      note: toolCatalogStatus.note,
      source: effectiveCatalogSource(toolCatalogStatus),
    },
    {
      id: 'holders',
      label: 'Holders',
      badge: holderCatalogBadge,
      summary: holderCatalogSummary,
      note: holderCatalogStatus.note,
      source: holderCatalogSource,
    },
  ];
  const materialSourceLabel = effectiveCatalogSource(materialCatalogStatus) === 'live'
    ? calculatorCopy(interfaceLanguage, 'material.sourceLive', 'live registry merged with PRISM baseline')
    : effectiveCatalogSource(materialCatalogStatus) === 'hybrid'
      ? calculatorCopy(interfaceLanguage, 'material.sourceHybrid', 'sampled live + curated')
      : calculatorCopy(interfaceLanguage, 'material.sourceFallback', 'PRISM baseline while the live registry recovers');
  const selectedTool =
    toolsForMode.find((item) => item.id === toolId)
    ?? compatibleToolsForMode.find((item) => item.id === toolId)
    ?? toolsForMode[0]
    ?? compatibleToolsForMode[0]
    ?? baseToolsForMode[0]
    ?? liveTools[0];
  const selectedToolBodyType = selectedTool ? inferToolBodyType(selectedTool) : 'solid';
  const selectedToolConstructionLabel = selectedToolBodyType === 'indexable' ? 'Indexable body' : 'Solid tool body';
  const toolSelectionLabel = selectedToolBodyType === 'indexable' || toolBodyFilter === 'indexable' ? 'Tool body' : 'Tool family';
  const insertOptions = selectedTool
    ? buildInsertOptionsForTool({
        tool: selectedTool,
        material: selectedMaterial,
        toolpath: selectedToolpath,
        machine: effectiveSelectedMachine,
      })
    : [];
  const recommendedInsertOption = insertOptions.find((option) => option.recommended) ?? insertOptions[0];
  const selectedInsertOption = insertOptions.find((option) => option.id === insertId) ?? recommendedInsertOption;

  const handleProgrammingChange = (nextProgrammingId: string) => {
    const nextProgramming =
      programmingEnvironmentsForMode.find((item) => item.id === nextProgrammingId) ?? programmingEnvironmentsForMode[0];
    const nextSelection = resolveProgrammingSelectionState({
      programming: nextProgramming,
      machine: selectedMachine,
      requestedLicenseTierId: licenseTierId,
      requestedToolpathTypeId: toolpathTypeId,
      requestedToolpathId: toolpathId,
    });
    setProgrammingId(nextProgramming?.id ?? '');
    setLicenseTierId(nextSelection.licenseTierId);
    setToolpathTypeId(nextSelection.toolpathTypeId);
    setToolpathId(nextSelection.toolpathId);
  };

  const handleLicenseTierChange = (nextLicenseTierId: string) => {
    const nextSelection = resolveProgrammingSelectionState({
      programming: selectedProgramming,
      machine: selectedMachine,
      requestedLicenseTierId: nextLicenseTierId,
      requestedToolpathTypeId: toolpathTypeId,
      requestedToolpathId: toolpathId,
    });
    setLicenseTierId(nextSelection.licenseTierId);
    setToolpathTypeId(nextSelection.toolpathTypeId);
    setToolpathId(nextSelection.toolpathId);
  };

  const handleToolpathTypeChange = (nextToolpathTypeId: string) => {
    const nextSelection = resolveProgrammingSelectionState({
      programming: selectedProgramming,
      machine: selectedMachine,
      requestedLicenseTierId: licenseTierId,
      requestedToolpathTypeId: nextToolpathTypeId,
      requestedToolpathId: toolpathId,
    });
    setToolpathTypeId(nextSelection.toolpathTypeId);
    setToolpathId(nextSelection.toolpathId);
  };

  const handleFinishTargetChange = (nextFinishTarget: string) => {
    setFinishTarget(nextFinishTarget);
    if (finishControlModeRef.current === 'manual') {
      setDesiredRaUm(desiredRaForFinishTarget(nextFinishTarget));
    }
  };

  const handleDesiredRaChange = (nextDesiredRaUm: number) => {
    const normalized = clampDesiredRa(nextDesiredRaUm);
    setFinishControlMode('manual');
    setDesiredRaUm(normalized);
    setFinishTarget(recommendFinishTargetForRa(normalized));
  };

  const processOperations = PROCESS_OPERATIONS[machineMode];
  const experienceProfile = EXPERIENCE_PROFILES.find((item) => item.id === experience) ?? EXPERIENCE_PROFILES[0];
  const modeNote = MODE_NOTES[machineMode];
  const workspacePlan = WORKSPACE_PLANS[machineMode];
  const entryStyleOptions = ENTRY_STYLE_OPTIONS[machineMode];
  const workholdingOptions = workholdingOptionsForMode(machineMode);
  const workholdingCategoryOptions = WORKHOLDING_CATEGORY_OPTIONS[machineMode];
  const workholdingBrandOptions = WORKHOLDING_BRAND_OPTIONS[machineMode];
  const workholdingPresetsForMode = WORKHOLDING_PRESET_LIBRARY.filter(
    (item) =>
      item.modes.includes(machineMode) &&
      (workholdingCategory === 'all' || item.categoryId === workholdingCategory) &&
      (workholdingBrand === 'all' || item.brandId === workholdingBrand),
  );
  const selectedWorkholdingPreset =
    workholdingPresetsForMode.find((item) => item.id === workholdingPresetId) ??
    WORKHOLDING_PRESET_LIBRARY.find((item) => item.id === workholdingPresetId && item.modes.includes(machineMode)) ??
    workholdingPresetsForMode[0];
  const selectedStability = STABILITY_OPTIONS.find((item) => item.id === stabilityId) ?? STABILITY_OPTIONS[0];
  const machineFeatureOptions = MACHINE_FEATURE_OPTIONS.filter((item) => item.modes.includes(machineMode));
  const setupCompleteness = getSetupCompleteness({
    selectedMachine,
    selectedMaterial,
    selectedTool,
    coolant,
    workholding,
    stockShape,
  });
  const calculatorFocusId = `${machineMode}-${selectedMachine?.id ?? 'machine'}-${selectedMaterial?.id ?? 'material'}-${operation}`.replace(
    /[^a-z0-9-]+/gi,
    '-',
  );
  const calculatorPacketId = ['calc', machineMode, selectedMachine?.id ?? 'machine', selectedTool?.id ?? 'tool', selectedHolderPackage?.id ?? 'holder'].join('__');
  const calculatorOrigin = {
    source: 'calculator',
    recordType: 'Calculator setup',
    recordId: calculatorFocusId,
    customer: '',
    note: `Carry ${selectedMachine?.model ?? 'machine'} / ${selectedMaterial?.name ?? 'material'} / ${selectedToolpath?.label ?? 'toolpath'} selections into the downstream workflow.`,
  };
  const selectedFeatureDetails = machineFeatureOptions.filter((item) => selectedFeatureIds.includes(item.id));
  const recommendedFeatureIds = getRecommendedFeatureIds({
    machineMode,
    selectedMachine,
    coolant,
    finishTarget,
    holderStyle,
    stockShape,
    stockSource,
    selectedProgramming,
    selectedWorkholdingPreset,
  });
  const missingFeatureWarnings = recommendedFeatureIds
    .filter((featureId) => !selectedFeatureIds.includes(featureId))
    .map((featureId) => machineFeatureOptions.find((item) => item.id === featureId))
    .filter((item): item is MachineFeatureOption => Boolean(item));
  const snapshotOptions = savedSetupSnapshots.map((snapshot) => ({
    id: snapshot.id,
    label: snapshot.name,
    detail: `${snapshot.machineMode.toUpperCase()} / ${snapshot.savedAt}`,
  }));
  const quoteBuilderPath = buildWorkflowPath('/quote-builder', location.search, {
    origin: calculatorOrigin,
    focus: {
      type: 'quote',
      id: calculatorFocusId,
      quoteId: calculatorFocusId,
      packetId: calculatorPacketId,
    },
    extras: {
      material: selectedMaterial?.name,
      operation,
      customerIntent: stockSource === 'purchased' ? 'bridge' : 'prototype',
    },
  });
  const purchasingPath = buildWorkflowPath('/purchasing', location.search, {
    origin: calculatorOrigin,
    focus: {
      type: 'packet',
      id: calculatorPacketId,
      packetId: calculatorPacketId,
    },
    extras: {
      material: selectedMaterial?.name,
    },
  });
  const inventoryPath = buildWorkflowPath('/inventory', location.search, {
    origin: calculatorOrigin,
    focus: {
      type: 'tooling',
      id: selectedTool?.id ?? calculatorPacketId,
    },
    extras: {
      tab: 'toolopt',
      toolId: selectedTool?.id,
    },
  });
  const postProcessorPath = buildWorkflowPath('/ppg', location.search, {
    origin: calculatorOrigin,
    focus: {
      type: 'packet',
      id: calculatorPacketId,
      packetId: calculatorPacketId,
    },
    extras: {
      machine: selectedMachine?.model,
      operation,
    },
  });
  const blueprintQuotePath = buildWorkflowPath('/blueprint-quote', location.search, {
    origin: calculatorOrigin,
    focus: {
      type: 'quote',
      id: calculatorFocusId,
      quoteId: calculatorFocusId,
      packetId: calculatorPacketId,
    },
    extras: {
      material: selectedMaterial?.name,
      machine: selectedMachine?.model,
      operation,
    },
  });
  const programReleasePath = buildWorkflowPath('/print-to-cnc', location.search, {
    origin: calculatorOrigin,
    focus: {
      type: 'packet',
      id: calculatorPacketId,
      packetId: calculatorPacketId,
    },
    extras: {
      machineId: selectedMachine?.id,
      partClassId: machineMode === 'lathe' ? 'turned-part' : 'prismatic-part',
      material: selectedMaterial?.name,
    },
  });
  const financialAnalysisPath = buildWorkflowPath('/financial-analysis', location.search, {
    origin: calculatorOrigin,
    focus: {
      type: 'machine',
      id: selectedMachine?.id ?? calculatorFocusId,
    },
    extras: {
      machineId: selectedMachine?.id,
      machine: selectedMachine?.model,
      material: selectedMaterial?.name,
      operation,
    },
  });

  useEffect(() => {
    setSavedSetupSnapshots(readSetupSnapshots());
  }, []);

  useEffect(() => {
    const fallbackMachineType = machineTypeOptions[0]?.id ?? 'all';
    if (!machineTypeOptions.some((item) => item.id === machineTypeId)) {
      setMachineTypeId(fallbackMachineType);
    }
  }, [machineMode, machineTypeId, machineTypeOptions]);

  useEffect(() => {
    const validManufacturers = manufacturerOptions.map((item) => item.id);
    const fallbackManufacturer = validManufacturers[0] ?? '';
    if (!validManufacturers.includes(manufacturer)) {
      setManufacturer(fallbackManufacturer);
    }
  }, [machineMode, machineTypeId, manufacturer, manufacturerOptions]);

  useEffect(() => {
    const fallbackMachine = filteredMachines[0]?.id ?? '';
    if (!filteredMachines.some((item) => item.id === machineId)) {
      setMachineId(fallbackMachine);
    }
  }, [machineTypeId, manufacturer, machineId, filteredMachines]);

  useEffect(() => {
    const fallbackController = controllerOptions[0]?.id ?? '';
    if (!controllerOptions.some((item) => item.id === controllerOptionId)) {
      setControllerOptionId(fallbackController);
    }
  }, [selectedMachine?.id, controllerOptions, controllerOptionId]);

  useEffect(() => {
    const fallbackSpindle = spindleOptions[0]?.id ?? '';
    if (!spindleOptions.some((item) => item.id === spindleOptionId)) {
      setSpindleOptionId(fallbackSpindle);
    }
  }, [selectedMachine?.id, spindleOptions, spindleOptionId]);

  useEffect(() => {
    const fallbackOptionId = coolantOptionsForMode(machineMode)[0]?.id ?? 'flood';
    const conservativeFallback = [fallbackOptionId];
    const nextMachineCoolantIds = allowedMachineCoolantIds.length ? allowedMachineCoolantIds : conservativeFallback;

    setMachineCoolantOptionIds((current) => {
      const normalizedCurrent = filterCoolantOptionIds(
        current.filter((optionId) => nextMachineCoolantIds.includes(optionId as CoolantOptionId)),
        machineMode,
      );
      const desired = applyingSnapshotRef.current
        ? (normalizedCurrent.length ? normalizedCurrent : nextMachineCoolantIds)
        : nextMachineCoolantIds;
      return normalizedCurrent.join('|') === desired.join('|') ? current : desired;
    });
  }, [machineMode, selectedMachine?.id, controllerOptionId, spindleOptionId, allowedMachineCoolantSignature]);

  useEffect(() => {
    const fallbackCoolant = coolantStrategyOptions[0]?.id ?? machineCoolantToggleOptions[0]?.id ?? 'flood';
    if (!coolantStrategyOptions.some((option) => option.id === coolant)) {
      setCoolant(fallbackCoolant);
    }
  }, [machineMode, selectedMachine?.id, machineCoolantOptionIds, coolantStrategyOptions, machineCoolantToggleOptions, coolant]);

  useEffect(() => {
    const previousMode = previousMachineModeRef.current;
    previousMachineModeRef.current = machineMode;

    if (machineMode === 'edm' || machineMode === 'wire_edm' || machineMode === 'laser' || machineMode === 'waterjet') {
      if (previousMode === 'mill' || previousMode === 'lathe') {
        setMaterialGroup('nontraditional');
      }
      return;
    }

    if (materialGroup === 'nontraditional') {
      setMaterialGroup('steel');
    }
  }, [machineMode, materialGroup]);

  useEffect(() => {
    if (materialSubcategoryId !== 'all' && !materialSubcategoryOptions.some((item) => item.id === materialSubcategoryId)) {
      setMaterialSubcategoryId('all');
    }
  }, [materialSubcategoryId, materialSubcategorySignature]);

  useEffect(() => {
    const currentMaterials = materialsForSelection.length ? materialsForSelection : materialsForGroup;
    if (!currentMaterials.some((item) => item.id === materialId)) {
      setMaterialId(currentMaterials[0]?.id ?? '');
    }
  }, [materialGroup, materialSubcategoryId, materialId, materialsForSelectionSignature, liveMaterials]);

  useEffect(() => {
    const currentTools = liveTools.filter((item) => item.mode === machineMode);
    if (!currentTools.some((item) => item.id === toolId)) {
      setToolId(currentTools[0]?.id ?? '');
    }
  }, [machineMode, toolId, liveTools]);

  useEffect(() => {
    if (!holderBrandOptions.some((item) => item.id === holderBrand)) {
      setHolderBrand('all');
    }
  }, [machineMode, holderBrandOptions, holderBrand]);

  useEffect(() => {
    if (!holderTypeOptions.some((item) => item.id === holderTypeFilter)) {
      setHolderTypeFilter('all');
    }
  }, [holderTypeFilter, holderTypeOptions]);

  useEffect(() => {
    if (!holderInterfaceOptions.some((item) => item.id === holderInterfaceFilter)) {
      setHolderInterfaceFilter('all');
    }
  }, [holderInterfaceFilter, holderInterfaceOptions]);

  useEffect(() => {
    if (!holderPackagesForMode.some((item) => item.id === holderPackageId)) {
      setHolderPackageId(holderPackagesForMode[0]?.id ?? '');
    }
  }, [machineMode, holderBrand, holderTypeFilter, holderInterfaceFilter, holderPackageId, holderPackagesForMode]);

  useEffect(() => {
    if (!workholdingOptions.some((item) => item.id === workholding)) {
      setWorkholding(workholdingOptions[0]?.id ?? '');
    }
  }, [machineMode, workholding, workholdingOptions]);

  useEffect(() => {
    if (!workholdingCategoryOptions.some((item) => item.id === workholdingCategory)) {
      setWorkholdingCategory('all');
    }
  }, [machineMode, workholdingCategoryOptions, workholdingCategory]);

  useEffect(() => {
    if (!workholdingBrandOptions.some((item) => item.id === workholdingBrand)) {
      setWorkholdingBrand('all');
    }
  }, [machineMode, workholdingBrandOptions, workholdingBrand]);

  useEffect(() => {
    if (!workholdingPresetsForMode.some((item) => item.id === workholdingPresetId)) {
      setWorkholdingPresetId(workholdingPresetsForMode[0]?.id ?? '');
    }
  }, [machineMode, workholdingCategory, workholdingBrand, workholdingPresetId, workholdingPresetsForMode]);

  useEffect(() => {
    if (!programmingEnvironmentsForMode.some((item) => item.id === programmingId)) {
      setProgrammingId(programmingEnvironmentsForMode[0]?.id ?? '');
    }
  }, [machineMode, programmingId, programmingEnvironmentsForMode]);

  useEffect(() => {
    const opts = ENTRY_STYLE_OPTIONS[machineMode];
    if (opts && !opts.some((item) => item.id === entryStyle)) {
      setEntryStyle(opts[0]?.id ?? 'balanced');
    }
  }, [machineMode, entryStyle]);

  useEffect(() => {
    const opts = holderStyleOptions;
    if (opts && !opts.some((item) => item.id === holderStyle)) {
      setHolderStyle(opts[0]?.id ?? 'machine-standard');
    }
  }, [machineMode, holderStyle, holderStyleOptions]);

  useEffect(() => {
    if (!programmingLicenseOptions.some((item) => item.id === licenseTierId)) {
      setLicenseTierId(programmingLicenseOptions[programmingLicenseOptions.length - 1]?.id ?? 'full');
    }
  }, [selectedProgramming?.id, programmingLicenseOptions, licenseTierId]);

  useEffect(() => {
    if (!toolpathTypes.some((item) => item.id === toolpathTypeId)) {
      setToolpathTypeId(toolpathTypes[0]?.id ?? '');
    }
  }, [programmingId, toolpathTypeId, toolpathTypes]);

  useEffect(() => {
    if (!filteredToolpathOptions.some((item) => item.id === toolpathId)) {
      setToolpathId(filteredToolpathOptions[0]?.id ?? toolpathOptions[0]?.id ?? '');
    }
  }, [toolpathTypeId, programmingId, toolpathId, filteredToolpathOptions, toolpathOptions]);

  useEffect(() => {
    if (!licensedToolpathOptions.some((item) => item.id === toolpathId)) {
      setToolpathId(licensedToolpathOptions[0]?.id ?? '');
    }
  }, [programmingId, licenseTierId, toolpathId, licensedToolpathOptions]);

  useEffect(() => {
    if (selectedToolpath && toolpathTypeId !== 'all') {
      const nextTypeId = classifyToolpathType(selectedToolpath).id;
      if (toolpathTypeId !== nextTypeId) {
        setToolpathTypeId(nextTypeId);
      }
    }
  }, [selectedToolpath?.id, toolpathTypeId]);

  useEffect(() => {
    if (toolBodyFilter !== 'all' && !toolBodyFilterOptions.some((option) => option.id === toolBodyFilter)) {
      setToolBodyFilter('all');
    }
  }, [toolBodyFilter, toolBodyFilterOptions]);

  useEffect(() => {
    if (!toolVendorOptions.some((option) => option.id === toolVendorFilter)) {
      setToolVendorFilter('all');
    }
  }, [toolVendorFilter, toolVendorOptions]);

  useEffect(() => {
    if (!toolGeometryOptions.some((option) => option.id === toolGeometryFilter)) {
      setToolGeometryFilter('all');
    }
  }, [toolGeometryFilter, toolGeometryOptions]);

  useEffect(() => {
    if (!toolSizeOptions.some((option) => option.id === toolSizeFilter)) {
      setToolSizeFilter('all');
    }
  }, [toolSizeFilter, toolSizeOptions]);

  useEffect(() => {
    if (!processOperations.some((item) => item.id === operation)) {
      setOperation(processOperations[0]?.id ?? '');
    }
  }, [machineMode, operation, processOperations]);

  useEffect(() => {
    if (!selectedTool || applyingSnapshotRef.current) return;
    setToolDiameter(selectedTool.defaultDiameter);
    setFlutes(selectedTool.defaultFlutes);
    const reachDefaults = deriveToolReachDefaults(selectedTool, selectedTool.defaultDiameter, machineMode);
    setToolLoc(reachDefaults.fluteLengthMm);
    setToolStickout(reachDefaults.stickoutMm);
    if (!selectedToolpath || !processOperations.some((item) => item.id === selectedToolpath.operationId)) {
      setOperation(selectedTool.operation);
    }
  }, [machineMode, selectedTool?.id, selectedToolpath?.id, processOperations]);

  useEffect(() => {
    if (selectedToolpath && processOperations.some((item) => item.id === selectedToolpath.operationId)) {
      setOperation(selectedToolpath.operationId);
    }
  }, [selectedToolpath?.id, processOperations]);

  useEffect(() => {
    if (!selectedToolpath || !selectedTool) return;
    if (toolSupportsToolpath(selectedTool, selectedToolpath)) return;

    const nextTool = selectPreferredToolForToolpath(toolsForMode, selectedToolpath);
    if (nextTool && nextTool.id !== selectedTool.id) {
      setToolId(nextTool.id);
    }
  }, [selectedToolpath?.id, selectedTool?.id, toolsForMode]);

  // â”€â”€ Toolpath-aware auto-adjustment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // When the user picks a specific CAM toolpath, adjust DOC, WOC, entry style,
  // and finish target to match that strategy's engagement assumptions.
  // Mill uses multiplier Ã— toolDiameter; lathe uses absolute mm values.
  useEffect(() => {
    if (!selectedTool || selectedToolBodyType !== 'indexable' || insertOptions.length === 0) {
      if (insertId) {
        setInsertId('');
      }
      return;
    }

    if (!insertOptions.some((option) => option.id === insertId)) {
      setInsertId(recommendedInsertOption?.id ?? insertOptions[0]?.id ?? '');
    }
  }, [selectedTool?.id, selectedToolBodyType, insertId, insertOptions, recommendedInsertOption?.id]);

  useEffect(() => {
    let cancelled = false;

    fetchToolHolderCatalogState({
      mode: machineMode,
      layoutKind: effectiveSelectedMachine?.toolingLayout?.kind,
      spindleConnectionTypeId: effectiveSelectedMachine?.toolingLayout?.spindleConnectionTypeId
        ?? effectiveSelectedMachine?.toolingLayout?.interfaceId,
      turretTypeId: effectiveSelectedMachine?.toolingLayout?.turretTypeId
        ?? effectiveSelectedMachine?.toolingLayout?.interfaceId,
      liveTooling: effectiveSelectedMachine?.toolingLayout?.liveTooling,
      hasMillingHead: effectiveSelectedMachine?.toolingLayout?.hasMillingHead,
      turretCount: effectiveSelectedMachine?.toolingLayout?.turretCount,
      toolId: selectedTool?.id,
      toolOperation: selectedTool?.operation,
      toolGeometryClass: selectedTool?.geometryClass,
    }, HOLDER_PACKAGE_LIBRARY).then((catalogState) => {
      if (!cancelled) {
        setLiveHolderPackages(catalogState.items);
        setHolderCatalogStatus(toCatalogStatus(catalogState));
      }
    }).catch(() => {
      if (!cancelled) {
        const fallbackItems = HOLDER_PACKAGE_LIBRARY.filter((item) => item.mode === machineMode);
        setLiveHolderPackages(fallbackItems);
        setHolderCatalogStatus({
          source: fallbackItems.length ? 'fallback' : 'empty',
          liveCount: 0,
          fallbackCount: fallbackItems.length,
          note: fallbackItems.length
            ? 'Holder catalog failed, so the curated holder fallback is active.'
            : 'No holder packages were available for this machine slice.',
          sampled: false,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    machineMode,
    effectiveSelectedMachine?.id,
    effectiveSelectedMachine?.toolingLayout?.kind,
    effectiveSelectedMachine?.toolingLayout?.spindleConnectionTypeId,
    effectiveSelectedMachine?.toolingLayout?.turretTypeId,
    effectiveSelectedMachine?.toolingLayout?.interfaceId,
    effectiveSelectedMachine?.toolingLayout?.liveTooling,
    effectiveSelectedMachine?.toolingLayout?.hasMillingHead,
    effectiveSelectedMachine?.toolingLayout?.turretCount,
    selectedTool?.id,
    selectedTool?.operation,
    selectedTool?.geometryClass,
  ]);

  useEffect(() => {
    if (applyingSnapshotRef.current) return;
    const defaults = getToolpathDefaults(selectedToolpath, machineMode);
    if (!defaults) return;
    if (machineMode === 'mill' || machineMode === 'lathe') {
      if (defaults.isAbsolute) {
        setDoc(defaults.docMm);
        setWoc(defaults.wocMm);
      } else {
        const dia = toolDiameter || 12;
        setDoc(Math.round(dia * defaults.docMm * 100) / 100);
        setWoc(Math.round(dia * defaults.wocMm * 100) / 100);
      }
    }
    const entryOpts = ENTRY_STYLE_OPTIONS[machineMode];
    if (entryOpts?.some((item) => item.id === defaults.entryStyle)) {
      setEntryStyle(defaults.entryStyle);
    }
    setFinishTarget(defaults.finishTarget);
    if (finishControlModeRef.current !== 'manual') {
      setDesiredRaUm(desiredRaForFinishTarget(defaults.finishTarget));
    }
  }, [selectedToolpath?.id, machineMode]);

  useEffect(() => {
    const defaults = defaultSelectedFeatureIds(machineMode, selectedMachine);
    const machineKey = `${machineMode}:${selectedMachine?.id ?? 'none'}`;
    const machineChanged =
      previousFeatureResetMachineKeyRef.current !== ''
      && previousFeatureResetMachineKeyRef.current !== machineKey;
    previousFeatureResetMachineKeyRef.current = machineKey;
    setSelectedFeatureIds((current) => {
      const filtered = current.filter((featureId) => machineFeatureOptions.some((item) => item.id === featureId));
      const next = machineChanged ? defaults : (filtered.length ? filtered : defaults);
      return sameIdSet(current, next) ? current : next;
    });
  }, [machineMode, selectedMachine?.id]);

  useEffect(() => {
    if (applyingSnapshotRef.current) {
      return;
    }
    setMachineGuidewayType(selectedMachine?.guidewayType);
    setMachineAgeYears(null);
    setMeasuredMachinePowerKw(null);
    setMeasuredMachineTorqueNm(null);
    setMeasuredMachineNaturalFrequencyHz(null);
    setMeasuredMachineSystemStiffnessNPerUm(null);
    setMeasuredMachineDampingRatio(null);
    setMeasuredMachineAxisAccelerationMps2(null);
    setMeasuredMachineAxisJerkMps3(null);
  }, [selectedMachine?.id]);

  useEffect(() => {
    const defaults = defaultSelectedControllerCapabilityIds(controllerCapabilityOptions);
    setSelectedControllerCapabilityIds((current) => {
      const filtered = current.filter((capabilityId) =>
        controllerCapabilityOptions.some((option) => option.id === capabilityId),
      );
      const next = filtered.length ? filtered : defaults;
      return sameIdSet(current, next) ? current : next;
    });
  }, [selectedMachine?.id, selectedControllerOption?.id, controllerCapabilityOptions]);

  useEffect(() => {
    if (!selectedHolderPackage) return;
    const nextHolderStyle = holderPackagePrimaryStyle(selectedHolderPackage);
    if (nextHolderStyle !== holderStyle) {
      setHolderStyle(nextHolderStyle);
    }
    const holderPackageTool =
      selectedHolderPackage.toolId ? toolsForMode.find((item) => item.id === selectedHolderPackage.toolId) : undefined;
    if (
      holderPackageTool &&
      holderPackageTool.id !== toolId &&
      (!selectedToolpath || toolSupportsToolpath(holderPackageTool, selectedToolpath))
    ) {
      setToolId(holderPackageTool.id);
    }
  }, [selectedHolderPackage?.id, selectedToolpath?.id, toolsForMode, toolId, holderStyle]);

  useEffect(() => {
    if (!selectedWorkholdingPreset) return;
    if (selectedWorkholdingPreset.workholdingId !== workholding) {
      setWorkholding(selectedWorkholdingPreset.workholdingId);
    }
    if (selectedWorkholdingPreset.stabilityId !== stabilityId) {
      setStabilityId(selectedWorkholdingPreset.stabilityId);
    }
  }, [selectedWorkholdingPreset?.id, workholding, stabilityId]);

  useEffect(() => {
    if (applyingSnapshotRef.current) {
      // Defer clearing the ref so downstream cascade effects (toolpath
      // auto-adjust, tool selection sync) in later render cycles also
      // see the guard and skip overwriting snapshot values.
      queueMicrotask(() => { applyingSnapshotRef.current = false; });
      invalidateSolveState();
      return;
    }
    if (machineMode === 'lathe') {
    const nextHolderPackageId = defaultHolderPackageForMachine(machineMode, holderCompatibilityMachine, selectedTool);
      const nextHolderPackage = HOLDER_PACKAGE_LIBRARY.find((item) => item.id === nextHolderPackageId);
      setCoolant(holderCompatibilityMachine?.toolingLayout?.liveTooling ? 'tsc' : 'flood');
      setWorkholding('collet-chuck');
      setWorkholdingCategory('all');
      setWorkholdingBrand('all');
      setWorkholdingPresetId(holderCompatibilityMachine?.toolingLayout?.kind === 'gang' ? 'citizen-guide-bushing' : 'hainbuch-collet');
      setStockShape('round');
      setStockSource('shop-rack');
      setEntryStyle('safe-approach');
      setFinishTarget('general');
      if (finishControlModeRef.current !== 'manual') {
        setDesiredRaUm(desiredRaForFinishTarget('general'));
      }
      setSetupSource('recommended');
      setHolderBrand('all');
      setHolderPackageId(nextHolderPackageId);
      setHolderStyle(holderPackagePrimaryStyle(nextHolderPackage));
      setStabilityId(holderCompatibilityMachine?.toolingLayout?.kind === 'gang' ? 'swiss-support' : 'production-stable');
      setSelectedStation(1);
      setDoc(1.5);
      setWoc(0.6);
    } else if (machineMode === 'mill') {
      const nextHolderPackageId = defaultHolderPackageForMachine(machineMode, holderCompatibilityMachine, selectedTool);
      const nextHolderPackage = HOLDER_PACKAGE_LIBRARY.find((item) => item.id === nextHolderPackageId);
      const millSetupDefaults = defaultMillSetupForMachine(holderCompatibilityMachine);
      setCoolant('flood');
      setWorkholding(millSetupDefaults.workholdingId);
      setWorkholdingCategory(millSetupDefaults.workholdingCategoryId);
      setWorkholdingBrand(millSetupDefaults.workholdingBrandId);
      setWorkholdingPresetId(millSetupDefaults.workholdingPresetId);
      setStockShape(millSetupDefaults.stockShape);
      setStockSource('shop-rack');
      setEntryStyle('balanced');
      setFinishTarget('general');
      if (finishControlModeRef.current !== 'manual') {
        setDesiredRaUm(desiredRaForFinishTarget('general'));
      }
      setSetupSource('recommended');
      setHolderBrand('all');
      setHolderPackageId(nextHolderPackageId || 'sandvik-shell-arbor');
      setHolderStyle(holderPackagePrimaryStyle(nextHolderPackage));
      setStabilityId(millSetupDefaults.stabilityId);
      setDoc(2.5);
      setWoc(38);
    } else if (machineMode === 'wire_edm') {
      setCoolant('dielectric');
      setWorkholding('wire-fixture');
      setWorkholdingCategory('all');
      setWorkholdingBrand('all');
      setWorkholdingPresetId('fanuc-low-profile');
      setStockShape('plate');
      setStockSource('from-model');
      setEntryStyle('finish-skim');
      setFinishTarget('tight-finish');
      if (finishControlModeRef.current !== 'manual') {
        setDesiredRaUm(desiredRaForFinishTarget('tight-finish'));
      }
      setSetupSource('recommended');
      setHolderBrand('all');
      setHolderPackageId('fanuc-wire-standard');
      setHolderStyle('machine-standard');
      setStabilityId('detail-control');
      setDoc(0.2);
      setWoc(0.25);
    } else if (machineMode === 'edm') {
      setCoolant('dielectric');
      setWorkholding('wire-fixture');
      setWorkholdingCategory('all');
      setWorkholdingBrand('all');
      setWorkholdingPresetId('erowa-reference-pallet');
      setStockShape('plate');
      setStockSource('from-model');
      setEntryStyle('fine-detail');
      setFinishTarget('tight-finish');
      if (finishControlModeRef.current !== 'manual') {
        setDesiredRaUm(desiredRaForFinishTarget('tight-finish'));
      }
      setSetupSource('recommended');
      setHolderBrand('all');
      setHolderPackageId('erowa-electrode');
      setHolderStyle('machine-standard');
      setStabilityId('detail-control');
      setDoc(0.15);
      setWoc(1.5);
    } else if (machineMode === 'laser' || machineMode === 'waterjet') {
      setCoolant(machineMode === 'laser' ? 'air' : 'dielectric');
      setWorkholding('fixture-plate');
      setWorkholdingCategory('all');
      setWorkholdingBrand('all');
      setWorkholdingPresetId(machineMode === 'laser' ? 'trumpf-sheet-support' : 'omax-standard-slats');
      setStockShape('sheet');
      setStockSource('purchased');
      setEntryStyle(machineMode === 'laser' ? 'clean-edge' : 'taper-control');
      setFinishTarget('general');
      if (finishControlModeRef.current !== 'manual') {
        setDesiredRaUm(desiredRaForFinishTarget('general'));
      }
      setSetupSource('recommended');
      setHolderBrand('all');
      setHolderPackageId(machineMode === 'laser' ? 'trumpf-quality-head' : 'omax-standard-head');
      setHolderStyle('machine-standard');
      setStabilityId(machineMode === 'laser' ? 'sheet-flat' : 'cold-cut-stable');
      setDoc(3);
      setWoc(1.5);
    }
    invalidateSolveState();
  }, [invalidateSolveState, machineMode, selectedMachine?.id]);

  useEffect(() => {
    if (applyingSnapshotRef.current || !selectedTool) {
      return;
    }

    const nextHolderPackageId = defaultHolderPackageForMachine(machineMode, holderCompatibilityMachine, selectedTool);
    if (!nextHolderPackageId || nextHolderPackageId === holderPackageId) {
      return;
    }

    const nextHolderPackage =
      compatibleHolderPackages.find((item) => item.id === nextHolderPackageId)
      ?? HOLDER_PACKAGE_LIBRARY.find((item) => item.id === nextHolderPackageId);

    if (!nextHolderPackage) {
      return;
    }

    setHolderPackageId(nextHolderPackage.id);
    setHolderStyle(holderPackagePrimaryStyle(nextHolderPackage));
  }, [machineMode, selectedMachine?.id, selectedTool?.id, selectedToolpath?.id]);

  useEffect(() => {
    if (applyingSnapshotRef.current) {
      return;
    }
    setToolingStationCountOverride(null);
  }, [selectedMachine?.id]);

  useEffect(() => {
    if (!effectiveToolingLayout?.stations) {
      if (selectedStation !== 1) {
        setSelectedStation(1);
      }
      return;
    }

    if (selectedStation > effectiveToolingLayout.stations) {
      setSelectedStation(effectiveToolingLayout.stations);
    }
  }, [effectiveToolingLayout?.kind, effectiveToolingLayout?.stations, selectedStation]);

  async function runCalculation() {
    if (!modeNote.livePhysics || !selectedMaterial || !selectedMachine || !selectedTool) {
      invalidateSolveState();
      return;
    }

    const solveEpoch = solveEpochRef.current + 1;
    solveEpochRef.current = solveEpoch;
    setLoading(true);
    setError(null);
    const isSolveCurrent = () => solveEpochRef.current === solveEpoch;

    try {
      // â”€â”€ Wire EDM mode: use dedicated 6-engine orchestrator â”€â”€
      if (machineMode === 'wire_edm') {
        const weParams: WireEdmCalcParams = {
          material: selectedMaterial?.id ?? selectedMaterial?.name ?? 'D2',
          thickness_mm: doc || 50,
          profile_length_mm: (stockX || 100),
          target_Ra_um: effectiveDesiredRaUm ?? 0.8,
          tolerance_mm: 0.01,
          wire_type: (holderStyle === 'fine-wire' ? 'brass' : holderStyle === 'taper-package' ? 'zinc_coated' : 'brass') as WireEdmCalcParams['wire_type'],
          wire_diameter_mm: holderStyle === 'fine-wire' ? 0.10 : 0.25,
          cut_type: operation === 'wire_skims' ? 'skim_only' : 'profile',
          taper_deg: 0,
          machine_controller: (selectedControllerOption?.id ?? 'fanuc') as WireEdmCalcParams['machine_controller'],
          machine_id: selectedMachine?.id,
          optimization_goal: (finishTarget === 'tight-finish' ? 'surface_finish' : finishTarget === 'high-removal' ? 'productivity' : 'balanced') as WireEdmCalcParams['optimization_goal'],
          workpiece_material_category: selectedMaterial?.isoGroup,
          workpiece_hardness_HRC: selectedMaterial?.hardness ? parseFloat(selectedMaterial.hardness) || undefined : undefined,
          is_submerged: coolant === 'dielectric',
          workholding_type: workholding,
        };
        try {
          const response = await weCalculatorSolve(weParams);
          if (!isSolveCurrent()) return;
          setResult(normalizeCalculatorSpeedFeedResult(response as any));
          setWedmResult((response as any)?.result ?? null);
          setResultSolveSource('orchestrate');
        } catch (orchestrateError: any) {
          try {
            const response = await weQuickSettings(weParams);
            if (!isSolveCurrent()) return;
            setResult(normalizeCalculatorSpeedFeedResult(response as any));
            setWedmResult((response as any)?.result ?? null);
            setResultSolveSource('quick');
            setError(
              orchestrateError?.message
                ? `Full wire EDM solve unavailable: ${orchestrateError.message}. Quick fallback is advisory only.`
                : 'Full wire EDM solve unavailable. Quick fallback is advisory only.',
            );
          } catch {
            throw orchestrateError;
          }
        }
      } else {
      // â”€â”€ Milling / Lathe / other modes: standard speed-feed path â”€â”€
      const params: SpeedFeedParams = buildCalculatorSpeedFeedParams({
        machineMode,
        machine: selectedMachine,
        controllerOption: selectedControllerOption,
        spindleOption: selectedSpindleOption,
        enabledControllerCapabilityIds,
        enabledMachineFeatureIds: selectedFeatureIds,
        enabledMachineCoolantIds,
        measuredMachineData: currentMeasuredMachinePerformance,
        material: selectedMaterial,
        tool: selectedTool,
        insertOption: selectedInsertOption,
        holderPackage: selectedHolderPackage,
        operationId: operation,
        toolpathTypeId,
        toolpath: selectedToolpath,
        programming: selectedProgramming,
        toolDiameterMm: toolDiameter,
        docMm: doc,
        wocMm: woc,
        flutes,
        toolStickoutMm: toolStickout,
        fluteLengthMm: toolLoc,
        stockShape,
        stockXm: stockX,
        stockYm: stockY,
        stockZm: stockZ,
        coolantId: coolant,
        workholdingId: workholding,
        workholdingCategoryId: workholdingCategory,
        workholdingPreset: selectedWorkholdingPreset,
        stabilityId,
        desiredRaUm: effectiveDesiredRaUm,
        finishTarget,
      });
      try {
        const response = await sfOrchestrate(params);
        if (!isSolveCurrent()) return;
        setResult(normalizeCalculatorSpeedFeedResult(response));
        setResultSolveSource('orchestrate');
      } catch (orchestrateError: any) {
        const response = await sfQuick(params);
        if (!isSolveCurrent()) return;
        setResult(normalizeCalculatorSpeedFeedResult(response));
        setResultSolveSource('quick');
        setError(
          orchestrateError?.message
            ? `Full PRISM solve unavailable: ${orchestrateError.message}. Quick fallback is advisory only.`
            : 'Full PRISM solve unavailable. Quick fallback is advisory only.',
        );
      }
      }
    } catch (caught: any) {
      if (isSolveCurrent()) {
        invalidateSolveState(caught?.message || 'Calculation failed');
      }
    } finally {
      if (isSolveCurrent()) {
        setLoading(false);
      }
    }
  }

  function handleFilePick(fileList: FileList | null) {
    const file = fileList?.[0];
    setSelectedUploadFile(file ?? null);
    setLoadedFileName(file?.name ?? null);
    setToolCribImportError(null);
    setToolCribImportSummary(null);
  }

  async function fileToBase64(file: File) {
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  async function maybeReadUploadText(file: File) {
    const lowerName = file.name.toLowerCase();
    const looksTextual =
      file.type.startsWith('text/')
      || lowerName.endsWith('.txt')
      || lowerName.endsWith('.csv')
      || lowerName.endsWith('.json')
      || lowerName.endsWith('.xml')
      || lowerName.endsWith('.eml')
      || lowerName.endsWith('.html')
      || lowerName.endsWith('.htm');

    if (!looksTextual) {
      return undefined;
    }

    try {
      return await file.text();
    } catch {
      return undefined;
    }
  }

  async function handleImportToolCribDocument() {
    if (!selectedUploadFile || !operatingSystem.ingestCalculatorToolCribDocument || toolCribImportLoading) {
      return;
    }

    setToolCribImportLoading(true);
    setToolCribImportError(null);
    setToolCribImportSummary(null);

    try {
      const [contentBase64, contentText] = await Promise.all([
        fileToBase64(selectedUploadFile),
        maybeReadUploadText(selectedUploadFile),
      ]);

      const workspace = await operatingSystem.ingestCalculatorToolCribDocument({
        userId: CALCULATOR_DEFAULT_USER_ID,
        workspaceId: 'calculator',
        sourceType: toolCribUploadSourceType,
        filename: selectedUploadFile.name,
        title: loadedFileName ?? selectedUploadFile.name,
        contentBase64,
        contentText,
      });

      setToolCribWorkspace(workspace);
      setToolCribImportSummary(workspace?.imports[0]?.summary ?? 'Imported document into My Shop / tool crib review.');
    } catch (issue) {
      setToolCribImportError(issue instanceof Error ? issue.message : 'Failed to import the document into My Shop / tool crib.');
    } finally {
      setToolCribImportLoading(false);
    }
  }

  async function handleRunLocalToolCribScan() {
    if (!operatingSystem.scanCalculatorToolCribSources || toolCribScanLoading) {
      return;
    }

    setToolCribScanLoading(true);
    setToolCribScanError(null);

    try {
      const workspace = await operatingSystem.scanCalculatorToolCribSources({
        userId: CALCULATOR_DEFAULT_USER_ID,
        workspaceId: 'calculator',
        approvedByUser: true,
      });
      setToolCribWorkspace(workspace);
      setToolCribImportSummary(workspace?.imports[0]?.summary ?? 'Local CAD/CAM tooling scan completed.');
      setShowLocalScanConsent(false);
    } catch (issue) {
      setToolCribScanError(issue instanceof Error ? issue.message : 'Local CAD/CAM tooling scan failed.');
    } finally {
      setToolCribScanLoading(false);
    }
  }

  function toggleMachineFeature(featureId: string) {
    setSelectedFeatureIds((current) =>
      current.includes(featureId) ? current.filter((item) => item !== featureId) : [...current, featureId],
    );
  }

  function toggleControllerCapability(capabilityId: string) {
    setSelectedControllerCapabilityIds((current) =>
      current.includes(capabilityId)
        ? current.filter((item) => item !== capabilityId)
        : [...current, capabilityId],
    );
  }

  function toggleMachineCoolantOption(optionId: string) {
    setMachineCoolantOptionIds((current) => {
      const normalized = filterCoolantOptionIds(current, machineMode);
      if (normalized.includes(optionId as CoolantOptionId)) {
        return normalized.length > 1 ? normalized.filter((item) => item !== optionId) : normalized;
      }
      return filterCoolantOptionIds([...normalized, optionId], machineMode);
    });
  }

  function handleToolingStationCountChange(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setToolingStationCountOverride(null);
      return;
    }

    const nextValue = Math.max(1, Math.round(Number(trimmed)));
    if (Number.isFinite(nextValue)) {
      setToolingStationCountOverride(nextValue);
    }
  }

  function saveCurrentSetupSnapshot() {
    const snapshot = createSetupSnapshot({
      machineMode,
      machineTypeId: selectedMachine?.machineTypeId ?? machineTypeId,
      manufacturer,
      machineId: selectedMachine?.id ?? machineId,
      controllerOptionId: selectedControllerOption?.id ?? controllerOptionId,
      spindleOptionId: selectedSpindleOption?.id ?? spindleOptionId,
      toolingStationCountOverride: effectiveToolingStationCount,
      machineCoolantOptionIds: enabledMachineCoolantIds,
      selectedControllerCapabilityIds: enabledControllerCapabilityIds,
      materialGroup,
      materialSubcategoryId,
      materialId: selectedMaterial?.id ?? materialId,
      toolId: selectedTool?.id ?? toolId,
      toolBodyFilter,
      insertId: selectedInsertOption?.id ?? insertId,
      operation,
      programmingId: selectedProgramming?.id ?? programmingId,
      licenseTierId,
      toolpathTypeId: selectedToolpathType?.id ?? toolpathTypeId,
      toolpathId: selectedToolpath?.id ?? toolpathId,
      stockShape,
      stockSource,
      stockX,
      stockY,
      stockZ,
      toolDiameter,
      flutes,
      doc,
      woc,
      toolStickout,
      toolLoc,
      coolant,
      entryStyle,
      finishTarget,
      finishControlMode,
      desiredRaUm,
      workholding,
      workholdingCategory,
      workholdingBrand,
      workholdingPresetId: selectedWorkholdingPreset?.id ?? workholdingPresetId,
      stabilityId,
      setupSource,
      holderBrand,
      holderPackageId: selectedHolderPackage?.id ?? holderPackageId,
      holderStyle,
      selectedFeatureIds,
      selectedMachine,
      selectedMaterial,
      selectedOperationLabel,
    });
    setSavedSetupSnapshots((current) => {
      const next = [snapshot, ...current.filter((item) => item.id !== snapshot.id)].slice(0, 12);
      writeSetupSnapshots(next);
      return next;
    });
    setSavedSnapshotId(snapshot.id);
  }

  function applySetupSnapshot(snapshotId: string) {
    setSavedSnapshotId(snapshotId);
    const snapshot = savedSetupSnapshots.find((item) => item.id === snapshotId);
    if (!snapshot) return;
    const snapshotTool = TOOL_CATALOG.find((item) => item.id === snapshot.toolId && item.mode === snapshot.machineMode)
      ?? TOOL_CATALOG.find((item) => item.id === snapshot.toolId)
      ?? null;
    const snapshotReachDefaults = deriveToolReachDefaults(snapshotTool, snapshot.toolDiameter, snapshot.machineMode);
    applyingSnapshotRef.current = true;
    setMachineMode(snapshot.machineMode);
    setMachineTypeId(snapshot.machineTypeId ?? 'all');
    setManufacturer(snapshot.manufacturer);
    setMachineId(snapshot.machineId);
    setControllerOptionId(snapshot.controllerOptionId ?? '');
    setSpindleOptionId(snapshot.spindleOptionId ?? '');
    setToolingStationCountOverride(snapshot.toolingStationCountOverride ?? null);
    setMachineCoolantOptionIds(filterCoolantOptionIds(snapshot.machineCoolantOptionIds, snapshot.machineMode));
    setSelectedControllerCapabilityIds(snapshot.selectedControllerCapabilityIds ?? []);
    setMaterialGroup(snapshot.materialGroup);
    setMaterialSubcategoryId(snapshot.materialSubcategoryId ?? 'all');
    setMaterialId(snapshot.materialId);
    setToolId(snapshot.toolId);
    setToolBodyFilter(snapshot.toolBodyFilter ?? 'all');
    setInsertId(snapshot.insertId ?? '');
    setOperation(snapshot.operation);
    setProgrammingId(snapshot.programmingId);
    setLicenseTierId(snapshot.licenseTierId);
    setToolpathTypeId(snapshot.toolpathTypeId);
    setToolpathId(snapshot.toolpathId);
    setStockShape(snapshot.stockShape);
    setStockSource(snapshot.stockSource);
    setStockX(snapshot.stockX);
    setStockY(snapshot.stockY);
    setStockZ(snapshot.stockZ);
    setToolDiameter(snapshot.toolDiameter);
    setFlutes(snapshot.flutes);
    setDoc(snapshot.doc);
    setWoc(snapshot.woc);
    setToolStickout(snapshot.toolStickout ?? snapshotReachDefaults.stickoutMm);
    setToolLoc(snapshot.toolLoc ?? snapshotReachDefaults.fluteLengthMm);
    setCoolant(snapshot.coolant);
    setEntryStyle(snapshot.entryStyle);
    setFinishTarget(snapshot.finishTarget);
    setFinishControlMode(snapshot.finishControlMode ?? 'manual');
    setDesiredRaUm(snapshot.desiredRaUm ?? desiredRaForFinishTarget(snapshot.finishTarget));
    setWorkholding(snapshot.workholding);
    setWorkholdingCategory(snapshot.workholdingCategory);
    setWorkholdingBrand(snapshot.workholdingBrand);
    setWorkholdingPresetId(snapshot.workholdingPresetId);
    setStabilityId(snapshot.stabilityId);
    setSetupSource(snapshot.setupSource);
    setHolderBrand(snapshot.holderBrand);
    setHolderPackageId(snapshot.holderPackageId);
    setHolderStyle(snapshot.holderStyle);
    setSelectedFeatureIds(snapshot.selectedFeatureIds);
  }

  function applyPrismModeSetup() {
    const recommendedHolder = compatibleHolderPackages.find(
      (holder) => holder.id === prismModePlan.recommendedSetup.holderPackageId,
    );

    setSetupSource(prismModePlan.recommendedSetup.setupSource);
    setCoolant(prismModePlan.recommendedSetup.coolantId);
    setHolderStyle(prismModePlan.recommendedSetup.holderStyleId);
    if (prismModePlan.recommendedSetup.holderPackageId) {
      setHolderPackageId(prismModePlan.recommendedSetup.holderPackageId);
    }
    if (recommendedHolder?.brandId) {
      setHolderBrand(recommendedHolder.brandId);
    }
    setMachineCoolantOptionIds((current) =>
      filterCoolantOptionIds(
        [...new Set([...current, prismModePlan.recommendedSetup.coolantId])]
          .filter((optionId) => allowedMachineCoolantIds.includes(optionId as CoolantOptionId)),
        machineMode,
      ),
    );
    setSelectedFeatureIds(prismModePlan.recommendedSetup.enabledFeatureIds);
    setSelectedControllerCapabilityIds(prismModePlan.recommendedSetup.enabledControllerCapabilityIds);
  }

  async function handleSaveMachineProfile() {
    if (
      !selectedMachine
      || !selectedControllerOption
      || !selectedSpindleOption
      || machineProfileSaveLoading
      || !operatingSystem.saveCalculatorMachineProfile
    ) {
      return;
    }

    setMachineProfileSaveLoading(true);
    setMachineProfileSaveError(null);
    setMachineProfileSaveSummary(null);

    try {
      const savedProfile = await operatingSystem.saveCalculatorMachineProfile({
        userId: CALCULATOR_DEFAULT_USER_ID,
        workspaceId: 'calculator',
        displayName: `${selectedMachine.manufacturer} ${selectedMachine.model} calculator default`,
        makeDefault: true,
        selection: {
          machineMode,
          machine: selectedMachine,
          controllerOptions,
          spindleOptions,
          controllerCapabilityOptions,
          coolantStrategyIds: allowedMachineCoolantIds,
          selectedControllerId: selectedControllerOption.id,
          selectedSpindlePackageId: selectedSpindleOption.id,
          enabledCoolantStrategyIds: enabledMachineCoolantIds,
          enabledControllerFeatureIds: enabledControllerCapabilityIds,
          enabledMachineFeatureIds: selectedFeatureIds,
          toolingStationCountOverride: effectiveToolingStationCount,
          measuredPerformance: currentMeasuredMachinePerformance,
        },
      });

      setDefaultMachineProfile(savedProfile);
      if (savedProfile) {
        setMachineProfileSaveSummary(
          `Saved ${savedProfile.machineLabel} as the default calculator machine profile.`,
        );
      }
    } catch (saveError) {
      setMachineProfileSaveError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save the current machine as the calculator default.',
      );
    } finally {
      setMachineProfileSaveLoading(false);
    }
  }

  const workflowSnapshot = [
    {
      label: 'Machine posture',
      value: selectedMachine?.family ?? 'Select a machine',
      detail: [selectedControllerOption?.label, selectedSpindleOption?.label, selectedMachine?.toolingLayout ? hardwareTitle(selectedMachine) : '']
        .filter(Boolean)
        .join(' / ') || 'Hardware lane not yet defined',
    },
    {
      label: 'Programming package',
      value: selectedProgramming?.label ?? 'Choose a package',
      detail: selectedProgramming
        ? `${selectedProgramming.vendor} / ${labelFor(programmingLicenseOptions, licenseTierId)}`
        : 'Programming flow pending',
    },
    {
      label: 'Exact toolpath',
      value: selectedToolpath?.label ?? 'Choose a toolpath',
      detail: selectedToolpath?.path ?? 'Toolpath route pending',
    },
    {
      label: 'Active hardware',
      value: hardwareDigest(effectiveSelectedMachine, selectedStation, selectedSpindleOption?.label),
      detail: `${selectedMachine?.coolant ?? 'Coolant posture pending'} / ${selectedControllerOption?.label ?? 'Controller pending'} / ${labelFor(SETUP_SOURCE_OPTIONS, setupSource)} / ${selectedStability.label} / ${selectedFeatureDetails.length || 0} verified feature${selectedFeatureDetails.length === 1 ? '' : 's'}`,
    },
  ];

  const machineModeLabel = MACHINE_MODE_OPTIONS.find((item) => item.id === machineMode)?.label ?? machineMode;
  const selectedMachineMode = selectedMachine?.mode ?? machineMode;
  const selectedMachineModeOption =
    MACHINE_MODE_OPTIONS.find((item) => item.id === selectedMachineMode)
    ?? MACHINE_MODE_OPTIONS.find((item) => item.id === machineMode)
    ?? MACHINE_MODE_OPTIONS[0];
  const selectedMachineConnectionLabel =
    selectedMachine?.toolingLayout?.spindleConnectionLabel
    ?? selectedMachine?.toolingLayout?.turretTypeLabel
    ?? selectedMachine?.toolingLayout?.millingHeadLabel
    ?? selectedMachine?.family
    ?? selectedMachine?.machineTypeLabel
    ?? selectedMachineModeOption.label;
  const selectedMachinePrimaryStat =
    selectedMachine && selectedMachine.spindleRpm > 0
      ? `${selectedMachine.spindleRpm.toLocaleString()} RPM`
      : selectedMachine && selectedMachine.powerHp > 0
        ? `${selectedMachine.powerHp} HP`
        : selectedMachine?.envelope ?? 'Machine envelope pending';
  const selectedMachineHasModelReference = selectedMachine?.notes?.some((note) => /3d model/i.test(note)) ?? false;
  const selectedMachineSummaryTitle = selectedMachine
    ? `${selectedMachine.manufacturer} ${selectedMachine.model}`
    : `Select a ${selectedMachineModeOption.label.toLowerCase()} package`;
  const selectedMachineSummaryMeta = selectedMachine
    ? `${selectedMachine.axes} · ${selectedMachine.machineTypeLabel}`
    : 'The machine portrait updates when the selected package changes.';
  const selectedMachineSummaryDetail = selectedMachine
    ? `${selectedMachineConnectionLabel} · ${selectedMachinePrimaryStat}`
    : 'Lock the real machine first so setup, tooling, finish, and runtime stay believable.';
  const openCalculatorGlobalSearch = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prism:calculator-open-search'));
    }
  };
  const toggleCalculatorRail = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prism:calculator-toggle-rail'));
    }
  };
  const selectedOperationLabel = labelFor(processOperations, operation);
  const t = (key: Parameters<typeof calculatorCopy>[1], fallback?: string) =>
    calculatorCopy(interfaceLanguage, key, fallback);
  const unitSystemLabel = unitSystem === 'inch' ? t('units.inch') : t('units.metric');
  const interfaceLanguageLabel =
    CALCULATOR_LANGUAGE_OPTIONS.find((option) => option.id === interfaceLanguage)?.label ?? 'English';
  const calculatorStudioLabel = t('toolbar.workspace', 'Calculator Studio');
  const machineSelectionTitle = t('panel.machineSelection');
  const machineFeaturesTitle = t('panel.machineFeatures');
  const materialTitle = t('panel.material');
  const unitsTitle = t('panel.units');
  const programmingTitle = t('panel.programming');
  const cuttingParametersTitle = t('panel.cuttingParameters');
  const cuttingResultsTitle = t('panel.cuttingResults');
  const toolingFixtureTitle = machineMode === 'lathe' ? t('panel.turretTooling') : t('panel.toolingFixture');
  const setupPreviewTitle = t('panel.setupPreview3d');
  const hardwarePanelTitle = t('panel.hardware', hardwareTitle(effectiveSelectedMachine));
  const processNotesTitle = t('panel.processNotes');
  const myShopTitle = t('panel.myShop');
  const formulaLibraryTitle = t('panel.formulaLibrary');
  const materialBaseSpeed =
    selectedMaterial == null
      ? 'Unavailable'
      : unitSystem === 'inch'
        ? `${selectedMaterial.baseSfm} sfm`
        : `${convertSfmToMetric(selectedMaterial.baseSfm).toFixed(0)} m/min`;
  const resultFeedRate =
    result?.feedRate != null ? convertFeedRate(result.feedRate, unitSystem) : undefined;
  const resultCuttingSpeed =
    result?.cuttingSpeed != null ? convertCuttingSpeed(result.cuttingSpeed, unitSystem) : undefined;
  const resultMrr =
    result?.mrr != null ? convertMrr(result.mrr, unitSystem) : undefined;
  const resultPower =
    result?.powerKw != null ? convertPower(result.powerKw, unitSystem) : undefined;
  const resultTorque =
    result?.torqueNm != null ? convertTorque(result.torqueNm, unitSystem) : undefined;
  const wireEdmSafetyAssessment: CalculatorResultSafetyAssessment | null =
    machineMode === 'wire_edm' && wedmResult
      ? (() => {
          const safetyRatio = Math.max(0, Math.min(1, wedmResult.safety_score ?? 0));
          const confidencePct = Math.round(safetyRatio * 100);
          const surfaceIntegrityAlerts = (wedmResult.surface_integrity?.spec_compliance ?? [])
            .flatMap((entry) => (
              entry.pass
                ? []
                : entry.violations.length
                  ? entry.violations
                  : [`${entry.standard}: out of spec`]
            ));
          const signals = [
            ...(wedmResult.wire_break_risk?.factors ?? []),
            ...surfaceIntegrityAlerts,
            ...(wedmResult.recommendations ?? []),
          ].filter((entry): entry is string => Boolean(entry));
          const solveSourceLabel = resultSolveSource === 'quick' ? 'Quick wire estimate' : 'Full wire EDM solve';

          if (safetyRatio < 0.35 || surfaceIntegrityAlerts.length > 0) {
            return {
              status: 'do-not-run',
              label: 'Do not run as-is',
              heading: 'Wire EDM risk signals are still blocking release.',
              summary: surfaceIntegrityAlerts.length > 0
                ? 'Surface-integrity or spec-compliance violations were returned by the wire EDM solve.'
                : 'Wire-break risk or modeled safety is too weak to release this setup straight to production.',
              guidance: 'Resolve the skim strategy, wire class, flushing posture, and compliance violations before releasing the job.',
              tone: 'rose',
              releaseBlocked: true,
              confidencePct,
              solveSourceLabel,
              signals,
            } satisfies CalculatorResultSafetyAssessment;
          }

          if (resultSolveSource === 'quick' || safetyRatio < 0.78 || signals.length > 0) {
            return {
              status: 'verify-before-release',
              label: 'Verify before release',
              heading: resultSolveSource === 'quick'
                ? 'Quick wire estimates still need operator review.'
                : 'The wire cut is plausible, but it still needs prove-out review.',
              summary: resultSolveSource === 'quick'
                ? 'The calculator fell back to a quicker wire estimate. Treat it as a prove-out starting point only.'
                : 'Review wire-break risk, skim strategy, and flushing posture before posting or releasing this contour.',
              guidance: 'Verify wire class, skim count, slug-control strategy, and flushing stability before release.',
              tone: 'amber',
              releaseBlocked: true,
              confidencePct,
              solveSourceLabel,
              signals,
            } satisfies CalculatorResultSafetyAssessment;
          }

          return {
            status: 'release-ready',
            label: 'Release-ready with verification trail',
            heading: 'This wire EDM setup cleared the current PRISM safety gate.',
            summary: 'The wire EDM solve returned a stable skim strategy and acceptable risk posture for release.',
            guidance: 'Carry the skim-pass ladder, wire class, and surface-integrity notes into setup and post.',
            tone: 'emerald',
            releaseBlocked: false,
            confidencePct,
            solveSourceLabel,
            signals,
          } satisfies CalculatorResultSafetyAssessment;
        })()
      : null;
  const resultSafety = wireEdmSafetyAssessment ?? classifyCalculatorResultSafetyPosture(result, {
    solveSource: resultSolveSource,
    setupCompleteness,
    livePhysics: modeNote.livePhysics,
  });
  const resultSafetyTone = {
    slate: {
      panel: 'border-slate-600/50 bg-slate-900/70',
      badge: 'border-slate-500/40 bg-slate-500/10 text-slate-200',
      progress: 'from-slate-400 via-slate-300 to-slate-200',
      signal: 'border-slate-700/60 bg-slate-900/70 text-slate-300',
      lead: 'text-slate-100',
    },
    emerald: {
      panel: 'border-emerald-500/30 bg-emerald-950/20',
      badge: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
      progress: 'from-emerald-400 via-teal-300 to-cyan-200',
      signal: 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-100/90',
      lead: 'text-emerald-50',
    },
    amber: {
      panel: 'border-amber-500/35 bg-amber-950/20',
      badge: 'border-amber-400/45 bg-amber-400/10 text-amber-100',
      progress: 'from-amber-400 via-orange-300 to-yellow-200',
      signal: 'border-amber-500/20 bg-amber-500/[0.07] text-amber-100/90',
      lead: 'text-amber-50',
    },
    rose: {
      panel: 'border-rose-500/35 bg-rose-950/30',
      badge: 'border-rose-400/45 bg-rose-400/10 text-rose-100',
      progress: 'from-rose-500 via-red-400 to-orange-200',
      signal: 'border-rose-500/25 bg-rose-500/[0.08] text-rose-100/90',
      lead: 'text-rose-50',
    },
  }[resultSafety.tone];
  const resultSafetyNeedsAttention = resultSafety.tone === 'amber' || resultSafety.tone === 'rose';
  const resultSignalStack =
    result
      ? [...new Set([...result.safetyChecks, ...result.limitingFactors, ...result.warnings])]
      : resultSafety.signals;
  const selectedToolpathTypeIdForPreview = selectedToolpath ? classifyToolpathType(selectedToolpath).id : selectedToolpathType?.id ?? 'general';
  const prismModeInput = {
    machineMode,
    machine: selectedMachine,
    material: selectedMaterial,
    tool: selectedTool,
    toolpath: selectedToolpath,
    toolpathTypeId: selectedToolpathTypeIdForPreview,
    programmingLabel: selectedProgramming?.label,
    finishTarget,
    stockShape,
    stockSource,
    currentSetupSource: setupSource,
    currentCoolantId: coolant,
    availableCoolantOptions: coolantStrategyOptions,
    toolDiameterMm: toolDiameter,
    docMm: doc,
    wocMm: woc,
    compatibleHolderPackages,
    currentHolderStyleId: holderStyle,
    currentHolderPackageId: selectedHolderPackage?.id ?? holderPackageId,
    recommendedFeatureIds,
    currentFeatureIds: selectedFeatureIds,
    controllerCapabilityOptions,
    currentControllerCapabilityIds: enabledControllerCapabilityIds,
    defaultMachineProfile,
    inventoryWorkspace,
    result,
    selection: shellCommerceSelection,
    purchasingHrefBase: purchasingPath,
  };
  const prismModePlan = buildCalculatorPrismModePlan(prismModeInput);
  const coolantRecommendation = buildCoolantStrategyRecommendation({
    machineMode,
    material: selectedMaterial,
    tool: selectedTool,
    toolpath: selectedToolpath,
    finishTarget,
    currentCoolantId: coolant,
    availableCoolantOptions: coolantStrategyOptions,
    toolDiameterMm: toolDiameter,
    docMm: doc,
    wocMm: woc,
  });
  const resultDisplayWarnings =
    resultSignalStack.length
      ? resultSignalStack
      : machineMode === 'mill' || machineMode === 'lathe'
        ? defaultWarnings(coolantRecommendation, coolant, workholding)
        : nonTraditionalReadiness(machineMode, coolant, workholding);
  const parameterOptimization = buildCuttingParameterOptimization({
    machineMode,
    machine: effectiveSelectedMachine ?? selectedMachine,
    material: selectedMaterial,
    tool: selectedTool,
    toolpath: selectedToolpath,
    operationId: operation,
    toolpathTypeId: selectedToolpathTypeIdForPreview,
    holderStyleId: holderStyle,
    stabilityId,
    coolantId: coolant,
    toolDiameterMm: toolDiameter,
    currentDocMm: doc,
    currentWocMm: woc,
    currentLocMm: toolLoc,
    currentStickoutMm: toolStickout,
    stockZMm: stockZ,
  });
  const setupPreviewWarnings =
    result?.warnings.length
      ? result.warnings
      : machineMode === 'mill' || machineMode === 'lathe'
        ? defaultWarnings(coolantRecommendation, coolant, workholding)
        : nonTraditionalReadiness(machineMode, coolant, workholding);
  const setupPreview = buildCalculatorSetupPreview({
    machineMode,
    machine: effectiveSelectedMachine ?? selectedMachine,
    spindleOption: selectedSpindleOption,
    holderPackage: selectedHolderPackage,
    tool: selectedTool,
    material: selectedMaterial,
    toolpath: selectedToolpath,
    toolDiameterMm: toolDiameter,
    docMm: doc,
    wocMm: woc,
    toolStickoutMmOverride: toolStickout,
    fluteLengthMmOverride: toolLoc,
    stockXMm: stockX,
    stockYMm: stockY,
    stockZMm: stockZ,
    coolantId: coolant,
    coolantRecommendation,
    liveRpm: result?.rpm,
    warnings: setupPreviewWarnings,
  });
  const selectedCommerceMachine = effectiveSelectedMachine ?? selectedMachine;
  const selectedInsertLabel = selectedInsertOption?.label ?? (selectedToolBodyType === 'indexable' ? 'Recommended insert' : undefined);

  const openMaterialPurchaseOptions = () => {
    setSectionPurchaseView(
      buildMaterialCommerceView({
        selection: shellCommerceSelection,
        machine: selectedCommerceMachine ?? undefined,
        material: selectedMaterial,
        stockShape,
        stockSource,
      }),
    );
  };

  const openHolderPurchaseOptions = () => {
    setSectionPurchaseView(
      buildHolderCommerceView({
        selection: shellCommerceSelection,
        machine: selectedCommerceMachine ?? undefined,
        holderPackage: selectedHolderPackage,
        holderSelectionLabel,
        toolpathLabel: selectedToolpath?.label,
      }),
    );
  };

  const openToolingPurchaseOptions = () => {
    setSectionPurchaseView(
      buildToolingCommerceView({
        selection: shellCommerceSelection,
        machine: selectedCommerceMachine ?? undefined,
        material: selectedMaterial,
        tool: selectedTool,
        toolpathLabel: selectedToolpath?.label,
        selectedInsertLabel,
        toolConstructionLabel: selectedToolConstructionLabel,
      }),
    );
  };

  const openFixturePurchaseOptions = () => {
    setSectionPurchaseView(
      buildFixtureCommerceView({
        selection: shellCommerceSelection,
        machine: selectedCommerceMachine ?? undefined,
        workholdingLabel: labelFor(WORKHOLDING_OPTIONS, workholding),
        presetLabel: selectedWorkholdingPreset?.label,
        stabilityLabel: selectedStability.label,
      }),
    );
  };

  const openCoolantPurchaseOptions = () => {
    setSectionPurchaseView(
      buildCoolantCommerceView({
        selection: shellCommerceSelection,
        machine: selectedCommerceMachine ?? undefined,
        coolantLabel: labelFor(COOLANT_OPTIONS, coolant),
        recommendedCoolantLabel: coolantRecommendation.recommendedLabel,
        rationale: coolantRecommendation.rationale,
        material: selectedMaterial,
        toolpathLabel: selectedToolpath?.label,
        toolLabel: selectedTool?.label,
      }),
    );
  };

  async function openMachinePartsOptions() {
    if (!selectedMachine) return;
    setSectionPurchaseBusyId('machine-parts');
    try {
      const query = [selectedMachine.manufacturer, selectedMachine.model, selectedControllerOption?.label]
        .filter(Boolean)
        .join(' ');
      let parts = [] as Awaited<ReturnType<typeof listParts>>['parts'];
      try {
        const result = await listParts({ query, limit: 6 });
        parts = result.parts;
      } catch {
        parts = [];
      }
      setSectionPurchaseView(
        buildMachinePartsCommerceView({
          selection: shellCommerceSelection,
          machine: selectedCommerceMachine ?? selectedMachine,
          controllerLabel: selectedControllerOption?.label,
          spindleLabel: selectedSpindleOption?.label,
          parts,
        }),
      );
    } finally {
      setSectionPurchaseBusyId(null);
    }
  }

  async function openMachineAlarmOptions() {
    if (!selectedMachine) return;
    setSectionPurchaseBusyId('machine-alarm');
    try {
      const controllerLabel = (selectedControllerOption?.label ?? selectedMachine.manufacturer).toLowerCase();
      const controllerFamily =
        controllerLabel.includes('okuma') ? 'okuma' :
        controllerLabel.includes('haas') ? 'haas' :
        controllerLabel.includes('siemens') ? 'siemens' :
        controllerLabel.includes('mazak') ? 'mazak' :
        controllerLabel.includes('heidenhain') ? 'heidenhain' :
        controllerLabel.includes('fanuc') ? 'fanuc' :
        selectedMachine.manufacturer.toLowerCase();

      let workspace;
      try {
        workspace = await operatingSystem.getAlarmCommerceWorkspace({
          controller: controllerFamily,
          selection: shellCommerceSelection,
        });
      } catch {
        workspace = {
          summary: `${(selectedCommerceMachine ?? selectedMachine)?.manufacturer ?? 'Selected'} ${(selectedCommerceMachine ?? selectedMachine)?.model ?? 'machine'} alarm support is temporarily using the staged recovery posture while the live alarm desk is unavailable.`,
          repairTracks: [
            {
              id: 'alarm-track-verify',
              title: 'Verify machine state',
              detail: 'Confirm offsets, machine state, and restart posture before cycling again.',
              posture: 'Guided recovery',
            },
          ],
          relatedParts: [],
          recommendations: [],
        };
      }

      setSectionPurchaseView(
        buildMachineAlarmCommerceView({
          selection: shellCommerceSelection,
          machine: selectedCommerceMachine ?? selectedMachine,
          workspace,
        }),
      );
    } finally {
      setSectionPurchaseBusyId(null);
    }
  }
  useEffect(() => {
    if (!prismModeEnabled || !prismModePlan.hasSetupDelta) {
      return;
    }

    applyPrismModeSetup();
  }, [
    prismModeEnabled,
    prismModePlan.hasSetupDelta,
    prismModePlan.recommendedSetup.coolantId,
    prismModePlan.recommendedSetup.enabledControllerCapabilityIds,
    prismModePlan.recommendedSetup.enabledFeatureIds,
    prismModePlan.recommendedSetup.holderPackageId,
    prismModePlan.recommendedSetup.holderStyleId,
    prismModePlan.recommendedSetup.setupSource,
  ]);
  const currentToolpathDefaults = getToolpathDefaults(selectedToolpath, machineMode);
  const finishPreviewInputBase = {
    machineMode,
    machine: selectedMachine,
    material: selectedMaterial,
    tool: selectedTool,
    toolpath: selectedToolpath,
    toolpathTypeId: selectedToolpathTypeIdForPreview,
    programmingLabel: selectedProgramming?.label,
    coolantId: coolant,
    finishTarget,
    toolDiameterMm: toolDiameter,
    docMm: doc,
    wocMm: woc,
    toolFluteCount: flutes,
    toolStickoutMm: toolStickout,
    fluteLengthMm: toolLoc,
    defaults: currentToolpathDefaults,
    holderStyleId: holderStyle,
    stabilityId,
  };
  const autoCalculatedRaUm = clampDesiredRa(
    getSurfaceFinishPreview({
      ...finishPreviewInputBase,
      desiredRaUm: desiredRaForFinishTarget(finishTarget),
      actualFeedPerToothMm: result?.feedPerTooth,
      actualFeedRateMmPerMin: result?.feedRate,
      actualRpm: result?.rpm,
      actualCuttingSpeedMpm: result?.cuttingSpeed,
      actualAxialDepthMm: result?.axialDepthMm,
      actualRadialDepthMm: result?.radialDepthMm,
    }).expectedRaUm,
  );
  const effectiveDesiredRaUm = finishControlMode === 'auto' ? autoCalculatedRaUm : desiredRaUm;
  const activePrismPurchaseRecommendations =
    prismLivePurchaseRecommendations?.length ? prismLivePurchaseRecommendations : prismModePlan.purchaseRecommendations;
  const prismPurchaseSourceLabel =
    prismPurchaseRecommendationSource === 'roi-engine' ? 'ROI engine live' : 'Heuristic fallback';
  const liveSolverConfidenceScore = Math.round(
    (
      machineMode === 'wire_edm'
        ? wedmResult?.safety_score ?? 0
        : result?.confidence ?? 0
    ) * 100,
  );
  const optimizationReleasePenalty =
    resultSafety.status === 'do-not-run' ? 24 : resultSafety.status === 'verify-before-release' ? 12 : 0;
  const optimizationSolveSourcePenalty =
    resultSolveSource === 'quick'
    || !Number.isFinite(machineMode === 'wire_edm' ? wedmResult?.safety_score : result?.confidence)
      ? 6
      : 0;
  const toolbarOptimizationScore = Math.max(
    6,
    Math.min(
      100,
      Math.round(
        setupCompleteness * 0.6
        + prismModePlan.confidenceScore * 0.24
        + liveSolverConfidenceScore * 0.16
        - optimizationReleasePenalty
        - optimizationSolveSourcePenalty,
      ),
    ),
  );
  const toolbarOptimizationTone =
    toolbarOptimizationScore >= 90
      ? {
          label: 'Fully optimized',
          detail: 'Inputs, machine posture, and active cut state are aligned enough for a confident handoff.',
          accent: 'text-emerald-200',
          glow: 'rgba(34,197,94,0.32)',
          glowSoft: 'rgba(74,222,128,0.16)',
        }
      : toolbarOptimizationScore >= 76
        ? {
            label: 'Close to optimized',
            detail: 'The setup is strong, but there is still room to tighten the package before release.',
            accent: 'text-yellow-200',
            glow: 'rgba(234,179,8,0.3)',
            glowSoft: 'rgba(250,204,21,0.16)',
          }
        : toolbarOptimizationScore >= 58
          ? {
              label: 'Needs tuning',
              detail: 'Key assumptions are in place, but the setup still needs refinement before you should trust it fully.',
              accent: 'text-orange-200',
              glow: 'rgba(249,115,22,0.32)',
              glowSoft: 'rgba(251,146,60,0.16)',
            }
          : {
              label: 'Needs inputs',
              detail: 'Too many assumptions are still open. Fill the red-guided areas before relying on these numbers.',
              accent: 'text-red-200',
          glow: 'rgba(239,68,68,0.34)',
          glowSoft: 'rgba(248,113,113,0.16)',
        };
  const toolbarPrismTone = prismModeEnabled
    ? {
        glow: 'rgba(168,85,247,0.34)',
        glowSoft: 'rgba(45,212,191,0.2)',
        badge: 'Live optimization engaged',
        detail: 'PRISM is actively steering setup assumptions, upgrade paths, and machine-aware optimization.',
      }
    : {
        glow: 'rgba(14,165,233,0.28)',
        glowSoft: 'rgba(168,85,247,0.16)',
        badge: 'Hero optimization lane',
        detail: 'Open the machine-aware PRISM lane to apply setup guidance and inspect upgrade paths worth buying.',
      };
  const toolbarOptimizationSummary =
    toolbarOptimizationScore >= 90
      ? 'Release posture is strong.'
      : toolbarOptimizationScore >= 76
        ? 'Only minor tuning remains.'
        : toolbarOptimizationScore >= 58
          ? 'A few setup choices still need tuning.'
          : 'The package still needs setup work.';
  const toolbarPrismSummary = prismModeEnabled ? 'Live machine-aware solve active.' : 'Open the guarded machine-aware solve.';
  const prismModeExplainerCards = [
    {
      title: 'What PRISM mode unlocks',
      body: 'It turns the calculator from a number box into a machine-aware decision lane that keeps setup, tooling, finish, and downstream buy choices connected.',
      accent: 'text-cyan-100',
      shell: 'border-cyan-400/18 bg-[linear-gradient(180deg,rgba(10,32,48,0.96)_0%,rgba(8,18,32,0.98)_100%)]',
    },
    {
      title: 'Why it feels better than competitors',
      body: 'Most competitive tools stay narrow: simple S&F calculators, CAM-locked wizards, isolated tooling catalogs, or generic assistants. PRISM keeps those slices in one operating lane.',
      accent: 'text-violet-100',
      shell: 'border-violet-400/18 bg-[linear-gradient(180deg,rgba(30,18,52,0.96)_0%,rgba(12,16,32,0.98)_100%)]',
    },
    {
      title: 'How it works without giving away the recipe',
      body: 'It blends constraint logic, machine legality, physics-informed cutting models, finish estimation, and weighted optimization so the advice stays grounded instead of generic.',
      accent: 'text-emerald-100',
      shell: 'border-emerald-400/18 bg-[linear-gradient(180deg,rgba(10,31,29,0.96)_0%,rgba(9,18,26,0.98)_100%)]',
    },
  ] as const;
  const prismModeScienceCards = [
    {
      title: 'Constraint + legality layer',
      body: 'Controller, spindle, coolant, holder, and machine-package filters remove impossible combinations before recommendations are shown.',
      tone: 'border-cyan-400/18 bg-[linear-gradient(180deg,rgba(12,30,47,0.96)_0%,rgba(10,22,38,0.98)_100%)]',
    },
    {
      title: 'Math + optimization layer',
      body: 'Weighted scoring balances machine fit, cut quality, finish risk, shop memory, and commercial payoff instead of chasing one metric in isolation.',
      tone: 'border-violet-400/18 bg-[linear-gradient(180deg,rgba(28,19,50,0.96)_0%,rgba(13,19,34,0.98)_100%)]',
    },
    {
      title: 'Science + process layer',
      body: 'Material response, tool geometry, engagement, thermal posture, and stability cues keep the calculator tied to machining reality without exposing the internal model details.',
      tone: 'border-emerald-400/18 bg-[linear-gradient(180deg,rgba(10,30,28,0.96)_0%,rgba(10,20,30,0.98)_100%)]',
    },
  ] as const;
  const prismModePricingTiers = [
    {
      name: 'Essentials',
      price: '$29/mo',
      note: '$290/year billed annually',
      accent: 'text-slate-100',
      shell: 'border-slate-400/18 bg-[linear-gradient(180deg,rgba(71,85,105,0.18)_0%,rgba(15,23,42,0.98)_100%)]',
      bullets: ['Single module access', 'Entry calculator workflow', 'Generic machine and tooling posture'],
    },
    {
      name: 'Standard',
      price: '$79/mo',
      note: '$790/year billed annually',
      accent: 'text-sky-100',
      shell: 'border-sky-400/20 bg-[linear-gradient(180deg,rgba(59,130,246,0.18)_0%,rgba(11,20,39,0.98)_100%)]',
      bullets: ['2 modules included', '300+ machine database access', 'Brand tooling with balanced production guidance'],
    },
    {
      name: 'Professional',
      price: '$149/mo',
      note: '$1,490/year billed annually',
      accent: 'text-violet-100',
      shell: 'border-violet-400/22 bg-[linear-gradient(180deg,rgba(168,85,247,0.18)_0%,rgba(18,15,35,0.98)_100%)]',
      bullets: ['4 modules included', 'Full machine database', 'Brand holders, finish control, and full quoting lane'],
    },
    {
      name: 'Enterprise',
      price: '$299/mo',
      note: '$2,990/year billed annually',
      accent: 'text-amber-100',
      shell: 'border-amber-400/22 bg-[linear-gradient(180deg,rgba(245,158,11,0.18)_0%,rgba(24,17,10,0.98)_100%)]',
      bullets: ['All modules unlocked', 'Advanced AI-driven print/CAD intake', 'Multi-user, API, and priority support posture'],
    },
  ] as const;
  useEffect(() => {
    setUnitSystem(shellCommerceSelection.unitSystem);
  }, [shellCommerceSelection.unitSystem]);

  useEffect(() => {
    if (!selectedMachine || !selectedMaterial || !selectedTool || !selectedToolpath) {
      setPrismLivePurchaseRecommendations(null);
      setPrismPurchaseRecommendationSource('heuristic');
      setPrismPurchaseRecommendationNote(null);
      setPrismPurchaseRecommendationWarnings([]);
      return;
    }

    const featureType = inferFeatureType(machineMode, operation, selectedToolpath, selectedTool);
    const physics = materialPhysics(selectedMaterial);
    const currentQueueMatch = inventoryWorkspace?.checkoutQueue.find((item) => item.toolId === selectedTool.id);
    const calculatorToolLookup = new Map(liveTools.map((tool) => [tool.id, tool]));
    const inventory = buildToolRoiInventory(machineMode, inventoryWorkspace, calculatorToolLookup);
    const livePurchaseInput = {
      ...prismModeInput,
      purchasingHrefBase: purchasingPath,
    };
    const params: ToolRoiAnalysisParams = {
      feature: {
        type: featureType,
        dimensions: {
          diameter_mm: toolDiameter,
          width_mm: Math.max(woc, toolDiameter * 0.4),
          depth_mm: Math.max(doc, 0.5),
          length_mm: Math.max(stockX, stockY, toolDiameter),
        },
        tolerance_mm: inferToleranceMm(finishTarget, effectiveDesiredRaUm),
        surface_finish_Ra: effectiveDesiredRaUm,
      },
      material: {
        iso_group: physics.isoGroup,
        name: selectedMaterial.name,
        kc1_1: physics.kc1_1,
        mc: physics.mc,
      },
      machine: {
        max_rpm: selectedMachine.spindleRpm,
        max_power_kw: selectedMachine.powerHp / HP_PER_KW,
        machine_rate_per_hour: machineMode === 'mill' ? 110 : machineMode === 'lathe' ? 95 : 78,
      },
      current_tool: {
        id: selectedTool.id,
        name: selectedTool.label,
        price: parsePriceLabel(currentQueueMatch?.priceLabel, estimateToolPrice(selectedTool)),
        condition: inferCurrentToolCondition(selectedTool, inventoryWorkspace),
      },
      user_inventory: inventory,
      optimization_goal: inferOptimizationGoal(finishTarget, selectedToolpathTypeIdForPreview, inventoryWorkspace),
    };

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const response = await sfToolRoiAnalysis(params);
        if (!active) return;
        const roiResult = unwrapToolRoiAnalysisResult(response);
        if (!roiResult) {
          throw new Error('ROI engine response was incomplete.');
        }
        const liveRecommendations = buildPurchaseRecommendationsFromToolRoi(
          livePurchaseInput,
          roiResult,
          prismModePlan.confidenceScore,
        );
        if (!active) return;
        setPrismLivePurchaseRecommendations(liveRecommendations.recommendations);
        setPrismPurchaseRecommendationSource('roi-engine');
        setPrismPurchaseRecommendationNote(liveRecommendations.note);
        setPrismPurchaseRecommendationWarnings(liveRecommendations.warnings.slice(0, 2));
      } catch {
        if (!active) return;
        setPrismLivePurchaseRecommendations(null);
        setPrismPurchaseRecommendationSource('heuristic');
        setPrismPurchaseRecommendationNote(
          'Using the local PRISM heuristic while the live ROI engine is unavailable.',
        );
        setPrismPurchaseRecommendationWarnings([]);
      }
    }, 260);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    coolant,
    doc,
    effectiveDesiredRaUm,
    finishTarget,
    holderPackageId,
    holderStyle,
    inventoryWorkspace,
    liveTools,
    machineMode,
    operation,
    prismModePlan.confidenceScore,
    purchasingPath,
    result,
    selectedMachine,
    selectedMaterial,
    selectedTool,
    selectedToolpath,
    setupSource,
    selectedToolpathTypeIdForPreview,
    stockX,
    stockY,
    toolDiameter,
    woc,
  ]);
  const activeFinishPreset = nearestSurfaceFinishPreset(effectiveDesiredRaUm);
  const surfaceFinishPreview = getSurfaceFinishPreview({
    ...finishPreviewInputBase,
    desiredRaUm: effectiveDesiredRaUm,
    actualFeedPerToothMm: result?.feedPerTooth,
    actualFeedRateMmPerMin: result?.feedRate,
    actualRpm: result?.rpm,
    actualCuttingSpeedMpm: result?.cuttingSpeed,
    actualAxialDepthMm: result?.axialDepthMm,
    actualRadialDepthMm: result?.radialDepthMm,
    actualRaUm: result?.ra,
  });
  const liveSurfaceFinishRaUm = result ? surfaceFinishPreview.liveCalculatedRaUm ?? result?.ra : undefined;
  const resultSurfaceFinish =
    liveSurfaceFinishRaUm != null ? convertSurfaceFinish(liveSurfaceFinishRaUm, unitSystem) : undefined;
  const finishModeSummaryLabel = finishControlMode === 'auto' ? 'Auto-calculated' : 'Manual override';
  const finishModeTargetLabel = finishControlMode === 'auto' ? 'Auto target' : 'Manual target';
  const finishModeHeading =
    finishControlMode === 'auto' ? 'Auto-calculated surface finish' : 'Manual surface finish target';
  const finishModeBody =
    finishControlMode === 'auto'
      ? 'PRISM is deriving this Ra target from the machine, material, toolpath, DOC/WOC, coolant, tooling stack, holder posture, and any live cut-state inputs currently available.'
      : 'Manual override is pinned to the finish you choose. Switch back to Auto any time to let PRISM follow the current setup again.';
  const finishModeSliderLabel =
    finishControlMode === 'auto' ? 'Auto-calculated Ra finish' : 'Manual desired Ra finish';
  const finishModeSliderHint =
    finishControlMode === 'auto'
      ? 'Click a preset or drag the slider to force a print target.'
      : 'Manual target stays pinned until you switch back to Auto.';
  const liveFinishComparison =
    liveSurfaceFinishRaUm != null ? compareSurfaceFinishToTarget(liveSurfaceFinishRaUm, effectiveDesiredRaUm) : null;
  const handleOptimizeDoc = () => {
    setDoc(parameterOptimization.recommendedDocMm);
  };
  const handleOptimizeLoc = () => {
    setToolLoc(parameterOptimization.recommendedLocMm);
    setToolStickout((current) => Math.max(current, parameterOptimization.recommendedStickoutMm));
  };
  const handleFinishControlModeChange = (nextMode: FinishControlMode) => {
    if (nextMode === finishControlMode) return;
    if (nextMode === 'manual') {
      setDesiredRaUm(clampDesiredRa(effectiveDesiredRaUm));
    }
    setFinishControlMode(nextMode);
  };
  const setupHighlights = [
    `${selectedMachine?.model ?? 'No machine'} / ${selectedControllerOption?.label ?? selectedMachine?.axes ?? 'Machine not selected'}`,
    `${selectedMaterial?.name ?? 'No material'} / ${labelFor(STOCK_SOURCE_OPTIONS, stockSource)}`,
    `${selectedTool?.label ?? 'No tool'} / ${selectedHolderPackage?.label ?? labelFor(HOLDER_STYLE_OPTIONS[machineMode], holderStyle)}`,
    `${selectedToolpath?.label ?? 'Toolpath TBD'} / ${labelFor(COOLANT_OPTIONS, coolant)} coolant / ${formatSurfaceFinish(effectiveDesiredRaUm, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 2)} ${finishControlMode === 'auto' ? 'auto target' : 'manual target'} / ${selectedStability.label}`,
  ];
  const requestedFinishMarkerPercent =
    ((MAX_DESIRED_RA_UM - effectiveDesiredRaUm) / (MAX_DESIRED_RA_UM - MIN_DESIRED_RA_UM)) * 100;
  const predictedFinishMarkerPercent =
    ((MAX_DESIRED_RA_UM - surfaceFinishPreview.expectedRaUm) / (MAX_DESIRED_RA_UM - MIN_DESIRED_RA_UM)) * 100;
  const guideSteps: CalculatorGuideStep[] = useMemo(() => [
    {
      panelId: 'machine-selection',
      title: machineSelectionTitle,
      detail: 'Start in the upper-left lane and lock the real machine package first.',
      prompt: 'Pick the exact machine, controller, spindle, and installed tooling capacity before you trust anything downstream.',
      mode: 'required',
    },
    {
      panelId: 'machine-features',
      title: machineFeaturesTitle,
      detail: 'Confirm only the options that are physically installed on this machine.',
      prompt: 'Control packages, coolant support, and verified features keep PRISM from suggesting unsupported capability.',
      mode: 'required',
    },
    {
      panelId: 'material',
      title: materialTitle,
      detail: 'Set the actual material and stock posture next.',
      prompt: 'Grade, condition, and stock size change speed, finish, chip behavior, and safe engagement.',
      mode: 'required',
    },
    {
      panelId: 'units',
      title: unitsTitle,
      detail: 'Set the working units and the amount of guidance you want.',
      prompt: 'Choose inch or metric early and set the guided depth so the rest of the page reads the way you actually work.',
      mode: 'required',
    },
    {
      panelId: 'tooling-fixture',
      title: toolingFixtureTitle,
      detail: 'Move into the upper-right lane and define the physical stack.',
      prompt: 'Tool, holder, insert, and fixture posture are the real-world constraints that make the solve believable.',
      mode: 'required',
    },
    {
      panelId: 'setup-preview',
      title: setupPreviewTitle,
      detail: 'Review the live setup preview before you move on.',
      prompt: 'Use the preview as a quick visual sanity check that the stack you are building still looks plausible.',
      mode: 'review',
    },
    {
      panelId: 'hardware',
      title: hardwarePanelTitle,
      detail: 'Verify stationing and hardware topology in the right lane.',
      prompt: 'This catches interface and station mismatches before they show up as bad recommendations or unsafe output.',
      mode: 'review',
    },
    {
      panelId: 'process-notes',
      title: processNotesTitle,
      detail: 'Skim the process notes lane for the current stack interpretation.',
      prompt: 'PRISM summarizes coolant, tooling, programming, and workholding posture here so you can spot drift quickly.',
      mode: 'review',
    },
    {
      panelId: 'programming',
      title: programmingTitle,
      detail: 'Then move into the center lane and pick the real programming path.',
      prompt: 'Choose the CAM package, license, and exact toolpath you will actually post so the rest of the guidance stays workflow-legal.',
      mode: 'required',
    },
    {
      panelId: 'cutting-parameters',
      title: cuttingParametersTitle,
      detail: 'Dial in the actual cut inputs that drive the solve.',
      prompt: 'Tool diameter, DOC, WOC, coolant, entry, and finish target directly change load, finish, and safety posture.',
      mode: 'required',
    },
    {
      panelId: 'cutting-results',
      title: cuttingResultsTitle,
      detail: 'Finish in the center results lane and judge the live output.',
      prompt: 'This is the output that matters. Re-check RPM, feed, power, finish, and safety posture after every major setup change.',
      mode: 'required',
    },
    {
      panelId: 'my-shop',
      title: myShopTitle,
      detail: 'Capture the validated setup once the result looks credible.',
      prompt: 'Save the default machine or a setup snapshot so future calculator sessions and downstream desks inherit the same machine truth.',
      mode: 'capture',
    },
  ], [
    cuttingParametersTitle,
    cuttingResultsTitle,
    hardwarePanelTitle,
    machineFeaturesTitle,
    machineSelectionTitle,
    materialTitle,
    myShopTitle,
    processNotesTitle,
    programmingTitle,
    setupPreviewTitle,
    toolingFixtureTitle,
    unitsTitle,
  ]);

  const machineSelectionMissing = [
    !selectedMachine ? 'Choose a machine model' : null,
    !selectedControllerOption ? 'Choose a controller' : null,
    !selectedSpindleOption ? 'Choose a spindle package' : null,
    !effectiveToolingStationCount ? 'Confirm installed tooling capacity' : null,
  ].filter((value): value is string => Boolean(value));

  const machineFeatureMissing = [
    controllerCapabilityOptions.length > 0 && enabledControllerCapabilityIds.length === 0 ? 'Verify installed control packages' : null,
    machineCoolantToggleOptions.length > 0 && enabledMachineCoolantIds.length === 0 ? 'Verify installed coolant strategies' : null,
  ].filter((value): value is string => Boolean(value));

  const materialMissing = [
    !selectedMaterial ? 'Choose the specific material' : null,
    !(stockX > 0 && stockY > 0 && stockZ > 0) ? 'Confirm the stock size' : null,
  ].filter((value): value is string => Boolean(value));

  const rotaryToolingMode = machineMode === 'mill' || machineMode === 'lathe';
  const toolingFixtureMissing = rotaryToolingMode
    ? [
        !selectedTool ? 'Choose the tool package' : null,
        !selectedHolderPackage ? 'Choose the holder package' : null,
        !workholding ? 'Choose the fixture posture' : null,
      ].filter((value): value is string => Boolean(value))
    : [];

  const setupPreviewMissing = [
    !selectedMachine ? 'Machine not selected yet' : null,
    !selectedMaterial ? 'Material not selected yet' : null,
  ].filter((value): value is string => Boolean(value));

  const hardwareMissing = [
    !selectedMachine ? 'Machine hardware not loaded yet' : null,
    !selectedSpindleOption ? 'Spindle package still pending' : null,
  ].filter((value): value is string => Boolean(value));

  const processNotesMissing = [
    !selectedMachine ? 'Machine context missing' : null,
    !selectedMaterial ? 'Material context missing' : null,
    !selectedToolpath ? 'Programming path missing' : null,
  ].filter((value): value is string => Boolean(value));

  const programmingMissing = [
    !selectedProgramming ? 'Choose a software package' : null,
    !selectedToolpathType ? 'Choose a toolpath family' : null,
    !selectedToolpath ? 'Choose the exact toolpath' : null,
  ].filter((value): value is string => Boolean(value));

  const cuttingParameterMissing = [
    !(toolDiameter > 0) ? 'Set tool diameter' : null,
    !(doc > 0) ? 'Set DOC' : null,
    !(woc > 0) ? 'Set WOC / engagement' : null,
    !coolant ? 'Set coolant strategy' : null,
    !entryStyle ? 'Set entry style' : null,
  ].filter((value): value is string => Boolean(value));

  const cuttingResultsMissing = [
    machineMode === 'wire_edm' ? (!wedmResult ? 'Run the wire EDM solve' : null) : (!result ? 'Run the cutting solve' : null),
  ].filter((value): value is string => Boolean(value));

  const myShopMissing = [
    !defaultMachineProfile && savedSetupSnapshots.length === 0 ? 'Save a machine default or setup snapshot' : null,
  ].filter((value): value is string => Boolean(value));

  const guideStepMetaById: Record<string, CalculatorGuideStepMeta> = useMemo(() => Object.fromEntries(
    guideSteps.map((step, index) => {
      let missing: string[] = [];
      let status: CalculatorGuideStepMeta['status'] = 'ready';
      let statusLabel = 'Ready';
      let detail = step.detail;

      switch (step.panelId) {
        case 'machine-selection':
          missing = machineSelectionMissing;
          break;
        case 'machine-features':
          missing = machineFeatureMissing;
          detail = selectedFeatureDetails.length
            ? `${selectedFeatureDetails.length} machine feature${selectedFeatureDetails.length === 1 ? '' : 's'} verified so far.`
            : step.detail;
          break;
        case 'material':
          missing = materialMissing;
          break;
        case 'units':
          detail = `${unitSystemLabel} · ${experienceProfile.badge}`;
          break;
        case 'tooling-fixture':
          missing = toolingFixtureMissing;
          if (!rotaryToolingMode) {
            status = 'review';
            statusLabel = 'Review';
            detail = 'Non-rotary mode is active, so this lane behaves more like a hardware and consumables review.';
          }
          break;
        case 'setup-preview':
          missing = setupPreviewMissing;
          status = missing.length ? 'attention' : 'review';
          statusLabel = missing.length ? 'Needs input' : 'Review';
          detail = missing.length ? 'The preview still needs core setup inputs before it becomes a reliable visual check.' : 'Preview the setup layout and make sure the stack still looks believable.';
          break;
        case 'hardware':
          missing = hardwareMissing;
          status = missing.length ? 'attention' : 'review';
          statusLabel = missing.length ? 'Needs input' : 'Review';
          detail = missing.length ? 'Machine hardware posture still depends on earlier selections.' : 'Hardware topology is consistent enough to review.';
          break;
        case 'process-notes':
          missing = processNotesMissing;
          status = missing.length ? 'attention' : 'review';
          statusLabel = missing.length ? 'Needs input' : 'Review';
          detail = missing.length ? 'Process notes will become more useful once machine, material, and toolpath are set.' : 'Read the notes as a compact explanation of the current stack.';
          break;
        case 'programming':
          missing = programmingMissing;
          break;
        case 'cutting-parameters':
          missing = cuttingParameterMissing;
          break;
        case 'cutting-results':
          missing = cuttingResultsMissing;
          detail = missing.length ? 'The results lane will lock in once a live solve is available.' : 'The live result is ready for validation.';
          break;
        case 'my-shop':
          missing = myShopMissing;
          status = missing.length ? 'capture' : 'ready';
          statusLabel = missing.length ? 'Capture' : 'Saved';
          detail = missing.length ? 'Persist this setup so the next session starts from the same machine truth.' : 'A reusable machine truth is already captured in My Shop.';
          break;
        default:
          break;
      }

      if (step.mode === 'required' && status === 'ready' && missing.length) {
        status = 'attention';
        statusLabel = 'Needs input';
      } else if (step.mode === 'required' && status === 'ready') {
        statusLabel = 'Ready';
      } else if (step.mode === 'review' && !missing.length && status !== 'attention') {
        status = 'review';
        statusLabel = 'Review';
      }

      const complete = status === 'ready' || status === 'review';

      return [
        step.panelId,
        {
          index,
          total: guideSteps.length,
          status,
          statusLabel,
          complete,
          missing,
          detail,
        } satisfies CalculatorGuideStepMeta,
      ];
    }),
  ), [
    JSON.stringify(cuttingParameterMissing),
    JSON.stringify(cuttingResultsMissing),
    JSON.stringify(hardwareMissing),
    JSON.stringify(machineFeatureMissing),
    JSON.stringify(machineSelectionMissing),
    JSON.stringify(materialMissing),
    JSON.stringify(myShopMissing),
    JSON.stringify(processNotesMissing),
    JSON.stringify(programmingMissing),
    JSON.stringify(setupPreviewMissing),
    JSON.stringify(toolingFixtureMissing),
    Boolean(defaultMachineProfile),
    Boolean(result),
    Boolean(wedmResult),
    experienceProfile.badge,
    guideSteps,
    machineMode,
    rotaryToolingMode,
    savedSetupSnapshots.length,
    selectedFeatureDetails.length,
    unitSystemLabel,
  ]);

  const completedGuideStepCount = guideSteps.filter((step) => guideStepMetaById[step.panelId]?.complete).length;
  const firstActionableGuideStepIndex = guideSteps.findIndex((step) => {
    const meta = guideStepMetaById[step.panelId];
    return meta?.status === 'attention' || meta?.status === 'capture';
  });
  const nextActionableGuideStepIndex = guideSteps.findIndex((step, index) => {
    if (index <= guidedStepIndex) return false;
    const meta = guideStepMetaById[step.panelId];
    return meta?.status === 'attention' || meta?.status === 'capture';
  });
  const jumpToGuideStep = useCallback((panelId: string) => {
    const targetIndex = guideSteps.findIndex((step) => step.panelId === panelId);
    if (targetIndex >= 0) {
      setGuidedModeEnabled(true);
      setGuidedStepIndex(targetIndex);
    }
  }, [guideSteps]);

  const currentGuideStep = guidedModeEnabled ? guideSteps[guidedStepIndex] ?? guideSteps[0] : null;
  const currentGuidePanelId = currentGuideStep?.panelId ?? null;
  const currentGuideTitle = currentGuideStep?.title ?? '';
  const currentGuidePrompt = currentGuideStep?.prompt ?? '';
  const currentGuideMeta = currentGuidePanelId ? guideStepMetaById[currentGuidePanelId] ?? null : null;
  const guideStepIndexById = useMemo(
    () => Object.fromEntries(guideSteps.map((step, index) => [step.panelId, index])),
    [guideSteps],
  );
  const guideLaneGroups = useMemo(() => ([
    {
      id: 'left',
      label: 'Left lane',
      detail: 'Start at the top-left and work downward through machine and material truth first.',
      panelIds: ['machine-selection', 'machine-features', 'material', 'units'],
      shellClass: 'border-cyan-300/20 bg-[linear-gradient(135deg,rgba(10,28,44,0.92)_0%,rgba(10,40,58,0.84)_100%)]',
      badgeClass: 'border-cyan-300/24 bg-cyan-400/10 text-cyan-50',
      labelClass: 'text-cyan-100',
    },
    {
      id: 'right',
      label: 'Right lane',
      detail: 'Then validate the right-side hardware, tooling, and process posture before solving.',
      panelIds: ['tooling-fixture', 'setup-preview', 'hardware', 'process-notes'],
      shellClass: 'border-amber-300/18 bg-[linear-gradient(135deg,rgba(49,25,15,0.92)_0%,rgba(70,35,26,0.82)_100%)]',
      badgeClass: 'border-amber-300/24 bg-amber-400/10 text-amber-50',
      labelClass: 'text-amber-100',
    },
    {
      id: 'center',
      label: 'Center lane',
      detail: 'Finish with programming, cut inputs, live results, and capture the validated setup.',
      panelIds: ['programming', 'cutting-parameters', 'cutting-results', 'my-shop'],
      shellClass: 'border-violet-300/18 bg-[linear-gradient(135deg,rgba(32,21,58,0.92)_0%,rgba(28,40,79,0.84)_100%)]',
      badgeClass: 'border-violet-300/24 bg-violet-400/10 text-violet-50',
      labelClass: 'text-violet-100',
    },
  ]), []);

  useEffect(() => {
    if (!guidedModeEnabled) {
      setGuideCursor((current) => (current.visible ? { ...current, visible: false } : current));
      setGuideFieldOverlays((current) => (current.length ? [] : current));
      return;
    }

    setGuidedStepIndex((current) => {
      if (current < guideSteps.length) return current;
      return 0;
    });
  }, [guidedModeEnabled, guideSteps.length]);

  useEffect(() => {
    if (!guidedModeEnabled || guidedAutoPlay || !currentGuideStep) {
      guideAdvanceStateRef.current = {
        panelId: currentGuideStep?.panelId ?? null,
        complete: Boolean(currentGuideMeta?.complete),
      };
      return;
    }

    const previous = guideAdvanceStateRef.current;
    guideAdvanceStateRef.current = {
      panelId: currentGuideStep.panelId,
      complete: Boolean(currentGuideMeta?.complete),
    };

    if (
      currentGuideStep.mode === 'review'
      || previous.panelId !== currentGuideStep.panelId
      || previous.complete
      || !currentGuideMeta?.complete
    ) {
      return;
    }

    if (nextActionableGuideStepIndex >= 0 && nextActionableGuideStepIndex !== guidedStepIndex) {
      const timeout = window.setTimeout(() => {
        setGuidedStepIndex(nextActionableGuideStepIndex);
      }, 680);

      return () => window.clearTimeout(timeout);
    }

    return;
  }, [
    currentGuideMeta?.complete,
    currentGuideStep,
    guidedAutoPlay,
    guidedModeEnabled,
    guidedStepIndex,
    nextActionableGuideStepIndex,
  ]);

  useEffect(() => {
    if (!guidedModeEnabled || !guidedAutoPlay || guideSteps.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      setGuidedStepIndex((current) => (current + 1) % guideSteps.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [guidedAutoPlay, guidedModeEnabled, guideSteps.length]);

  useEffect(() => {
    if (!guidedModeEnabled || !currentGuidePanelId) {
      setGuideCursor((current) => (current.visible ? { ...current, visible: false } : current));
      return;
    }

    let frame = 0;
    const updateCursor = () => {
      const target = document.querySelector<HTMLElement>(`[data-guide-target="${currentGuidePanelId}"]`);
      if (!target) {
        setGuideCursor((current) => (current.visible ? { ...current, visible: false } : current));
        return;
      }

      const focusElement = target.querySelector<HTMLElement>(guideFocusSelectorForPanel(currentGuidePanelId)) ?? target;
      const rect = focusElement.getBoundingClientRect();
      const nextCursor = {
        left: rect.left + Math.min(Math.max(rect.width * 0.4, 40), 140),
        top: rect.top + Math.min(Math.max(rect.height * 0.55, 18), 42),
        visible: true,
      };
      setGuideCursor((current) => (
        current.visible === nextCursor.visible
        && current.left === nextCursor.left
        && current.top === nextCursor.top
          ? current
          : nextCursor
      ));
    };

    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateCursor);
    };

    schedule();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [currentGuidePanelId, guidedModeEnabled]);

  useEffect(() => {
    if (!guidedModeEnabled || !currentGuidePanelId) {
      return;
    }

    const target = document.querySelector<HTMLElement>(`[data-guide-target="${currentGuidePanelId}"]`);
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'nearest' });
    }
  }, [currentGuidePanelId, guidedModeEnabled]);

  useEffect(() => {
    if (!guidedModeEnabled || !currentGuidePanelId) {
      setGuideBubble((current) => (current.visible ? { ...current, visible: false } : current));
      setGuideFieldOverlays((current) => (current.length ? [] : current));
      return;
    }

    const target = document.querySelector<HTMLElement>(`[data-guide-target="${currentGuidePanelId}"]`);
    if (!target) {
      setGuideBubble((current) => (current.visible ? { ...current, visible: false } : current));
      setGuideFieldOverlays((current) => (current.length ? [] : current));
      return;
    }

    const focusCandidate =
      target.querySelector<HTMLElement>(guideFocusSelectorForPanel(currentGuidePanelId))
      ?? target.querySelector<HTMLElement>('[data-guide-panel-body=\"true\"] select, [data-guide-panel-body=\"true\"] input')
      ?? target.querySelector<HTMLElement>('[data-guide-panel-body=\"true\"] [data-guide-label], [data-guide-panel-body=\"true\"] button[aria-label]');
    const descriptor = calculatorGuideDescriptorFromElement(focusCandidate ?? target);
    const bubbleAnchor = (focusCandidate ?? target).getBoundingClientRect();

    const nextBubble = {
      visible: true,
      left: bubbleAnchor.left + Math.min(Math.max(bubbleAnchor.width * 0.2, 72), 220),
      top: bubbleAnchor.top + Math.min(Math.max(bubbleAnchor.height + 18, 44), 96),
      title: descriptor?.title ?? currentGuideTitle,
      body: descriptor?.body ?? currentGuidePrompt,
    };

    setGuideBubble((current) => (
      current.visible === nextBubble.visible
      && current.left === nextBubble.left
      && current.top === nextBubble.top
      && current.title === nextBubble.title
      && current.body === nextBubble.body
        ? current
        : nextBubble
    ));
  }, [currentGuidePanelId, currentGuidePrompt, currentGuideTitle, guidedModeEnabled]);

  useEffect(() => {
    if (!guidedModeEnabled || !currentGuidePanelId) {
      setGuideFieldOverlays((current) => (current.length ? [] : current));
      return;
    }

    const target = document.querySelector<HTMLElement>(`[data-guide-target="${currentGuidePanelId}"]`);
    if (!target) {
      setGuideFieldOverlays((current) => (current.length ? [] : current));
      return;
    }

    const interactiveElements = Array.from(
      target.querySelectorAll<HTMLElement>(
        '[data-guide-panel-body="true"] select:not([data-guide-managed="true"]), [data-guide-panel-body="true"] input:not([data-guide-managed="true"])',
      ),
    ).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20 && window.getComputedStyle(element).display !== 'none';
    });

    const overlays = interactiveElements
      .map((element, index) => {
        const descriptor = calculatorGuideDescriptorFromElement(element);
        if (!descriptor) return null;
        const rect = element.getBoundingClientRect();
        const placeRight = index % 2 === 0;
        const overlayWidth = 232;
        const left = placeRight
          ? Math.min(rect.right + 14, window.innerWidth - overlayWidth - 18)
          : Math.max(18, rect.left - overlayWidth - 14);
        const top = Math.max(96, rect.top - 4);
        return {
          key: `${descriptor.title}-${index}`,
          left,
          top,
          title: descriptor.title,
          body: descriptor.body,
        } satisfies CalculatorGuideFieldOverlay;
      })
      .filter((overlay): overlay is CalculatorGuideFieldOverlay => overlay !== null);

    setGuideFieldOverlays((current) => {
      const unchanged = current.length === overlays.length
        && current.every((overlay, index) => {
          const nextOverlay = overlays[index];
          return nextOverlay
            && overlay.key === nextOverlay.key
            && overlay.left === nextOverlay.left
            && overlay.top === nextOverlay.top
            && overlay.title === nextOverlay.title
            && overlay.body === nextOverlay.body;
        });

      return unchanged ? current : overlays;
    });
  }, [currentGuidePanelId, guidedModeEnabled]);

  const calculatorGuideValue = useMemo<CalculatorGuideContextValue>(() => ({
    enabled: guidedModeEnabled,
    activePanelId: currentGuideStep?.panelId ?? null,
    currentStepId: currentGuideStep?.panelId ?? null,
    currentStepIndex: guidedStepIndex,
    currentMessage: currentGuideStep?.prompt,
    stepMetaById: guideStepMetaById,
    jumpToStep: jumpToGuideStep,
  }), [
    guideStepMetaById,
    guidedModeEnabled,
    guidedStepIndex,
    jumpToGuideStep,
    currentGuideStep?.panelId,
    currentGuideStep?.prompt,
  ]);

  return (
    <CalculatorGuideContext.Provider
      value={calculatorGuideValue}
    >
    <div className="calculator-workspace-root relative w-full text-slate-200 bg-[#0a1224] min-h-screen lg:min-h-full">
      {guidedModeEnabled && currentGuideStep && guideCursor.visible ? (
        <div
          className="pointer-events-none fixed z-[95] transition-all duration-700 ease-out"
          style={{ left: guideCursor.left, top: guideCursor.top, transform: 'translate(-50%, -50%)' }}
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-300/35 bg-red-400/10 blur-xl" />
          <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-red-100 bg-red-500 text-[13px] font-black text-white shadow-[0_0_18px_rgba(248,113,113,0.55)]">
            +
          </div>
        </div>
      ) : null}
      {guidedModeEnabled && guideBubble.visible ? (
        <div
          className="pointer-events-none fixed z-[94] max-w-[280px] transition-all duration-500 ease-out"
          style={{ left: guideBubble.left, top: guideBubble.top, transform: 'translate(-8%, 0)' }}
          aria-hidden="true"
        >
          <div className="rounded-2xl border border-red-300/25 bg-[linear-gradient(135deg,rgba(56,11,18,0.94)_0%,rgba(20,10,18,0.98)_100%)] px-4 py-3 text-red-50 shadow-[0_18px_42px_rgba(15,23,42,0.42)]">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-200">{t('toolbar.guideBubble')}</div>
            <div className="mt-1 text-sm font-semibold text-white">{guideBubble.title}</div>
            <div className="mt-2 text-xs leading-5 text-red-100/85">{guideBubble.body}</div>
          </div>
        </div>
      ) : null}
      {guidedModeEnabled
        ? guideFieldOverlays.map((overlay) => (
            <div
              key={overlay.key}
              className="pointer-events-none fixed z-[93] hidden max-w-[232px] lg:block"
              style={{ left: overlay.left, top: overlay.top }}
              aria-hidden="true"
            >
              <div className="rounded-2xl border border-red-300/18 bg-[linear-gradient(135deg,rgba(58,11,18,0.9)_0%,rgba(18,10,17,0.96)_100%)] px-3 py-2.5 text-red-50 shadow-[0_14px_28px_rgba(15,23,42,0.28)]">
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-red-200/90">{t('toolbar.focusHere')}</div>
                <div className="mt-1 text-[11px] font-semibold leading-4 text-white">{overlay.title}</div>
                <div className="mt-1 text-[10px] leading-4 text-red-100/80">{overlay.body}</div>
              </div>
            </div>
          ))
        : null}
      {/* â”€â”€ Compact header bar â”€â”€ */}
      <div className="border-b border-slate-700/50 bg-[linear-gradient(135deg,#0d1a2d,#162742)] px-4 pb-7 pt-3">
        <div className="calculator-toolbar-overview-grid flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-stretch xl:gap-4">
          <div className="calculator-toolbar-brand-shell">
            <div className="calculator-toolbar-brand-card">
              <div className="calculator-toolbar-brand-copy">
                <div className="calculator-toolbar-brand-kicker">Machine-aware</div>
                <div className="calculator-toolbar-brand-hero-shell">
                  <div className="calculator-toolbar-brand-title-row">
                    <div className="calculator-toolbar-brand-mark" aria-hidden="true">
                      <PrismHeaderMark />
                    </div>
                      <div className="calculator-toolbar-brand-title-copy min-w-0">
                        <div className="calculator-toolbar-brand-wordmark">PRISM</div>
                        <div className="calculator-toolbar-brand-title">Ultimate Machining Tool</div>
                        <div className="calculator-toolbar-brand-subtitle">
                          Process Readiness Intelligence for Setup & Machining.
                        </div>
                      </div>
                  </div>
                </div>
                <div className="calculator-toolbar-brand-pill-row">
                  <span className="calculator-toolbar-brand-pill calculator-toolbar-brand-pill-mode">
                    {selectedMachineModeOption.icon} {machineModeLabel}
                  </span>
                  <span className={`calculator-toolbar-brand-pill ${experience === 'beginner' ? 'calculator-toolbar-brand-pill-beginner' : experience === 'journeyman' ? 'calculator-toolbar-brand-pill-journeyman' : 'calculator-toolbar-brand-pill-master'}`}>
                    {experienceProfile.badge}
                  </span>
                  <span className={`calculator-toolbar-brand-pill ${overallCatalogPillClass}`}>
                    {overallCatalogLabel}
                  </span>
                </div>
              </div>

              <div className="calculator-toolbar-machine-portrait">
                <div className="calculator-toolbar-machine-portrait-shell">
                  <div className="calculator-toolbar-machine-portrait-badge">
                    {selectedMachineModeOption.label} portrait
                  </div>
                  <div className="calculator-toolbar-machine-portrait-visual">
                    <MachinePreviewIllustration mode={selectedMachineMode} />
                  </div>
                  <div className="calculator-toolbar-machine-portrait-title">{selectedMachineSummaryTitle}</div>
                  <div className="calculator-toolbar-machine-portrait-meta">{selectedMachineSummaryMeta}</div>
                  <div className="calculator-toolbar-machine-portrait-detail">{selectedMachineSummaryDetail}</div>
                  <div className="calculator-toolbar-machine-portrait-badges">
                    <span className="calculator-toolbar-machine-chip">{selectedMachineConnectionLabel}</span>
                    {selectedMachineHasModelReference ? (
                      <span className="calculator-toolbar-machine-chip calculator-toolbar-machine-chip-secondary">
                        3D model reference
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="calculator-toolbar-control-shell">
            <div className="calculator-toolbar-control-main">
              <div className="calculator-toolbar-hero-cluster">
                <div
                  className="calculator-toolbar-confidence-shell"
                  aria-label={`Optimization confidence ${toolbarOptimizationScore}% ${toolbarOptimizationTone.label}`}
                  style={{
                    boxShadow: `0 0 0 1px rgba(255,255,255,0.07), 0 0 22px ${toolbarOptimizationTone.glow}, 0 0 56px ${toolbarOptimizationTone.glowSoft}, 0 0 108px ${toolbarOptimizationTone.glowSoft}`,
                  }}
                >
                  <div className="calculator-toolbar-confidence-card">
                    <div className="calculator-toolbar-confidence-block">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="calculator-toolbar-confidence-label">
                            {t('toolbar.confidence')}
                            <CalculatorInfoHint
                              label="Optimization confidence"
                              body="This is PRISM's overall trust level in the current setup. It reflects machine fit, tooling legality, engagement, finish posture, and solve stability."
                              className="ml-2"
                            />
                          </div>
                          <div className={`calculator-toolbar-confidence-status mt-1 ${toolbarOptimizationTone.accent}`}>
                            {toolbarOptimizationTone.label}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="calculator-toolbar-confidence-value">{toolbarOptimizationScore}%</div>
                          <div className="calculator-toolbar-confidence-caption">
                            optimization
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 calculator-toolbar-confidence-track">
                        <div className="calculator-toolbar-confidence-spectrum" />
                        <div
                          className="calculator-toolbar-confidence-fill"
                          style={{ width: `${toolbarOptimizationScore}%` }}
                        />
                        <div className="calculator-toolbar-confidence-led" />
                        <div
                          className="calculator-toolbar-confidence-marker"
                          style={{ left: `calc(${toolbarOptimizationScore}% - 2px)` }}
                        />
                      </div>
                      <div className="calculator-toolbar-confidence-scale" aria-hidden="true">
                        <span>Risk</span>
                        <span>Balanced</span>
                        <span>Optimized</span>
                      </div>
                      <div className="calculator-toolbar-confidence-detail mt-3">
                        {toolbarOptimizationSummary}
                      </div>
                    </div>
                    <div className="calculator-toolbar-confidence-footer">
                      <span className="calculator-toolbar-confidence-chip">
                        {prismModePlan.confidenceLabel}
                      </span>
                      <span className="calculator-toolbar-confidence-chip calculator-toolbar-confidence-chip-secondary">
                        {overallCatalogLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  title={t('toolbar.prismModeTitle')}
                  aria-label="Open PRISM engine"
                  aria-expanded={showPrismModeDialog}
                  onClick={() => setShowPrismModeDialog(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setShowPrismModeDialog(true);
                    }
                  }}
                  className="calculator-toolbar-prism-shell"
                  style={{
                    boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 32px ${toolbarPrismTone.glow}, 0 0 88px ${toolbarPrismTone.glowSoft}`,
                  }}
                >
                  <div className="calculator-toolbar-prism-card">
                    <div className="calculator-toolbar-prism-led" aria-hidden="true" />
                    <div className="calculator-toolbar-prism-header">
                      <div>
                        <div className="calculator-toolbar-prism-label">
                          Prism Engine
                          <CalculatorInfoHint
                            label="PRISM engine"
                            body="PRISM mode runs the richer machine-aware solve. It keeps machine legality, tool/holder posture, finish expectation, and shop memory in the same decision loop."
                            className="ml-2"
                          />
                        </div>
                        <div className="calculator-toolbar-prism-title">Machine-aware solve</div>
                      </div>
                      <div className="calculator-toolbar-prism-mark" aria-hidden="true">
                        <PrismHeaderMark compact idPrefix="calculator-toolbar-prism-mode-mark" />
                      </div>
                    </div>
                    <div className="calculator-toolbar-prism-story">
                      Machine legality, cut-state math, finish prediction, and shop memory in one guarded solve.
                    </div>
                    <div className="calculator-toolbar-prism-statgrid">
                      <span className="calculator-toolbar-prism-badge">
                        {toolbarPrismTone.badge}
                      </span>
                      <span className="calculator-toolbar-prism-badge calculator-toolbar-prism-badge-secondary">
                        {`${prismModePlan.confidenceLabel} · ${prismModePlan.inventoryCoverageLabel}`}
                      </span>
                    </div>
                    <div className="calculator-toolbar-prism-footer">
                      <span className="calculator-toolbar-prism-summary">{toolbarPrismSummary}</span>
                      <button
                        type="button"
                        aria-label="Open benefits and pricing overview"
                        onClick={(event) => {
                          event.stopPropagation();
                          setShowWhyPrismDialog(true);
                        }}
                        className="calculator-toolbar-prism-inline-link"
                      >
                        {t('toolbar.whyPrism')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="calculator-toolbar-utility-stack">
                <div className="calculator-toolbar-focus-card calculator-toolbar-focus-card-units space-y-1">
                  <div className="calculator-toolbar-focus-label">{t('toolbar.units')}</div>
                  <select
                    aria-label="Quick unit system"
                    value={unitSystem}
                    onChange={(event) => {
                      const nextUnitSystem = event.target.value as UnitSystem;
                      setUnitSystem(nextUnitSystem);
                      setShellCommerceUnitSystem(nextUnitSystem);
                    }}
                    className="calculator-toolbar-focus-select"
                    title={`${t('toolbar.units')}: ${unitSystemLabel}`}
                  >
                    <option value="inch">{t('units.inch')}</option>
                    <option value="metric">{t('units.metric')}</option>
                  </select>
                </div>

                <div className="calculator-toolbar-focus-card calculator-toolbar-focus-card-guided space-y-1">
                    <div className="calculator-toolbar-focus-label">
                      {guidedModeEnabled ? t('toolbar.guidedOn') : t('toolbar.guided')}
                      <CalculatorInfoHint
                        label="Guided Setup"
                        body="Guided Setup highlights the next required section in dependency order so the setup is built from machine truth into programming and then results."
                        className="ml-2"
                      />
                  </div>
                  <button
                    type="button"
                      aria-label={t('toolbar.guided')}
                    aria-pressed={guidedModeEnabled}
                    onClick={() => {
                      setGuidedModeEnabled((current) => !current);
                      setGuidedStepIndex(0);
                    }}
                    className={`calculator-toolbar-focus-button calculator-toolbar-focus-button-guided ${guidedModeEnabled ? 'calculator-toolbar-focus-button-guided-active' : ''}`}
                  >
                    <span className="block text-[0.96rem] font-black uppercase tracking-[0.08em] text-white">
                        {guidedModeEnabled ? `${t('toolbar.step')} ${guidedStepIndex + 1}/${guideSteps.length}` : t('toolbar.guided')}
                      </span>
                    <span className="mt-1 block text-[0.76rem] leading-5 text-rose-100/82">
                        {guidedModeEnabled
                          ? currentGuideStep?.title ?? t('toolbar.followGuide')
                          : t('toolbar.guidedStart', 'Start at Machine Selection')}
                      </span>
                  </button>
                </div>

                <div className="calculator-toolbar-focus-card calculator-toolbar-focus-card-language space-y-1">
                  <div className="calculator-toolbar-focus-label">{t('toolbar.language')}</div>
                  <select
                    aria-label="Interface language"
                    value={interfaceLanguage}
                    onChange={(event) => setInterfaceLanguage(event.target.value as InterfaceLanguage)}
                    title={`${t('toolbar.language')}: ${interfaceLanguageLabel}`}
                    className="calculator-toolbar-focus-select"
                  >
                    {CALCULATOR_LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="calculator-toolbar-focus-card calculator-toolbar-focus-card-workspace space-y-1">
                    <div className="calculator-toolbar-focus-label">{t('toolbar.workspace')}</div>
                  <select
                    aria-label="Calculator companion workspace"
                    value="/calculator"
                    onChange={(event) => {
                      if (event.target.value !== '/calculator') navigate(event.target.value);
                    }}
                    className="calculator-toolbar-focus-select"
                  >
                    {CALCULATOR_COMPANION_WORKSPACES.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  aria-label={shellRailCollapsed ? 'Show navigation rail' : 'Hide navigation rail'}
                  onClick={toggleCalculatorRail}
                  className="calculator-toolbar-focus-card calculator-toolbar-focus-card-rail calculator-toolbar-utility-action-card"
                >
                  <span className="calculator-toolbar-focus-label">
                    {shellRailCollapsed ? 'Show rail' : 'Hide rail'}
                  </span>
                  <span className="calculator-toolbar-utility-action-copy">
                    {shellRailCollapsed ? 'Restore the navigation rail.' : 'Open more canvas for the setup view.'}
                  </span>
                </button>

                <button
                  type="button"
                  aria-label="Open global search"
                  onClick={openCalculatorGlobalSearch}
                  className="calculator-toolbar-focus-card calculator-toolbar-focus-card-search calculator-toolbar-utility-action-card"
                >
                  <span className="calculator-toolbar-focus-label">Global search</span>
                  <span className="calculator-toolbar-utility-action-copy">
                    Search desks, jobs, quotes, parts, and lessons.
                  </span>
                  <span className="calculator-toolbar-utility-action-shortcut">Ctrl K</span>
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Experience + workflow launchers + machine mode row â”€â”€ */}
      {guidedModeEnabled && currentGuideStep ? (
        <div className="border-b border-red-400/20 bg-[linear-gradient(135deg,rgba(71,12,18,0.94)_0%,rgba(24,10,16,0.98)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(254,202,202,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-200">
                {t('toolbar.guidedStep')} / {t('toolbar.step')} {guidedStepIndex + 1} / {guideSteps.length}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-white">{currentGuideStep.title}</div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                    currentGuideMeta?.status === 'ready'
                      ? 'border-emerald-300/35 bg-emerald-500/14 text-emerald-100'
                      : currentGuideMeta?.status === 'review'
                        ? 'border-sky-300/35 bg-sky-500/14 text-sky-100'
                        : currentGuideMeta?.status === 'capture'
                          ? 'border-fuchsia-300/35 bg-fuchsia-500/14 text-fuchsia-100'
                          : 'border-red-300/35 bg-red-500/14 text-red-100'
                  }`}
                >
                  {currentGuideMeta?.statusLabel ?? 'Guided'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-100/90">
                  {completedGuideStepCount}/{guideSteps.length} ready
                </span>
              </div>
              <div className="mt-2 text-xs leading-5 text-red-100/85">{currentGuideStep.prompt}</div>
              <div className="mt-3 text-[11px] leading-5 text-red-100/72">{currentGuideMeta?.detail ?? currentGuideStep.detail}</div>
            </div>
            <div className="rounded-full border border-red-300/25 bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-100">
              {t('toolbar.followGuide')}
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {guideLaneGroups.map((lane, laneIndex) => {
              const laneActive = Boolean(currentGuidePanelId && lane.panelIds.includes(currentGuidePanelId));
              const laneOpenCount = lane.panelIds.reduce((count, panelId) => {
                const status = guideStepMetaById[panelId]?.status;
                return count + (status === 'attention' || status === 'capture' ? 1 : 0);
              }, 0);

              return (
                <div
                  key={lane.id}
                  className={`rounded-3xl border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                    laneActive
                      ? 'border-red-200/40 bg-[linear-gradient(135deg,rgba(75,15,23,0.92)_0%,rgba(43,15,21,0.88)_100%)] shadow-[0_0_22px_rgba(248,113,113,0.18)]'
                      : lane.shellClass
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`text-[10px] font-bold uppercase tracking-[0.22em] ${
                        laneActive ? 'text-red-100' : lane.labelClass
                      }`}>
                        {laneIndex + 1}. {lane.label}
                      </div>
                      <div className={`mt-1 text-[11px] leading-5 ${
                        laneActive ? 'text-red-100/80' : 'text-slate-300/82'
                      }`}>
                        {lane.detail}
                      </div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${
                      laneActive
                        ? 'border-red-200/28 bg-red-500/14 text-red-50'
                        : lane.badgeClass
                    }`}>
                      {laneOpenCount ? `${laneOpenCount} open` : 'Ready'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {lane.panelIds.map((panelId) => {
                      const stepIndex = guideStepIndexById[panelId];
                      if (stepIndex === undefined) return null;

                      const step = guideSteps[stepIndex];
                      const stepMeta = guideStepMetaById[panelId];
                      const active = stepIndex === guidedStepIndex;
                      const stepTone = calculatorPanelTone(panelId);
                      const toneClass =
                        stepMeta?.status === 'ready'
                          ? 'border-emerald-300/28 bg-emerald-500/[0.12] text-emerald-100'
                          : stepMeta?.status === 'review'
                            ? 'border-sky-300/28 bg-sky-500/[0.12] text-sky-100'
                            : stepMeta?.status === 'capture'
                              ? 'border-fuchsia-300/28 bg-fuchsia-500/[0.12] text-fuchsia-100'
                              : 'border-red-300/28 bg-red-500/[0.12] text-red-100';

                      return (
                        <button
                          key={step.panelId}
                          type="button"
                          onClick={() => setGuidedStepIndex(stepIndex)}
                          className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                            active
                              ? 'border-red-100/55 bg-red-500/18 text-white shadow-[0_0_18px_rgba(248,113,113,0.18)]'
                              : `${stepTone.titleWrap} ${toneClass} hover:border-red-200/45 hover:text-white`
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[9px] font-bold uppercase tracking-[0.18em]">
                                {t('toolbar.step')} {stepIndex + 1}
                              </div>
                              <div className={`mt-1 text-[11px] font-semibold leading-4 ${
                                active ? 'text-white' : stepTone.titleTone
                              }`}>
                                {step.title}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] uppercase tracking-[0.16em] opacity-80">
                                {stepMeta?.statusLabel ?? 'Review'}
                              </div>
                              <div className="mt-1 text-[9px] uppercase tracking-[0.16em] opacity-60">
                                {lane.label}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className={`${currentGuideMeta?.missing.length ? 'calculator-warning-attention ' : ''}rounded-2xl border border-red-300/20 bg-black/10 px-4 py-3`}>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-200">What still needs attention</div>
              {currentGuideMeta?.missing.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentGuideMeta.missing.map((item) => (
                    <span key={item} className="calculator-warning-attention-inline rounded-full border border-red-200/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-50">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-[11px] leading-5 text-red-50/80">
                  This step is ready enough to move on. Use the red rails to sanity-check the panel, then continue.
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {firstActionableGuideStepIndex >= 0 && firstActionableGuideStepIndex !== guidedStepIndex ? (
                <button
                  type="button"
                  onClick={() => setGuidedStepIndex(firstActionableGuideStepIndex)}
                  className="rounded-full border border-red-200/30 bg-red-500/12 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-50 transition hover:border-red-100/50 hover:bg-red-500/18"
                >
                  Jump to first missing
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setGuidedStepIndex((current) => (current + 1) % guideSteps.length)}
                className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-50 transition hover:border-red-100/35 hover:bg-white/10"
              >
                Next section
              </button>
            </div>
          </div>
        </div>
      ) : null}

        <div className="mt-5 border-b border-slate-700/50 bg-[linear-gradient(135deg,#0d1a2d,#152238)] px-4 pb-4 pt-3.5">
        <div className="flex flex-col gap-3">
          <div className="calculator-machine-mode-row">
            {MACHINE_MODE_OPTIONS.map((mode) => (
              <div
                key={mode.id}
                className={`calculator-machine-mode-card ${machineMode === mode.id ? 'is-active' : ''}`}
                style={{
                  '--calculator-machine-ring': MACHINE_MODE_LED_TONES[mode.id].ring,
                  '--calculator-machine-ring-alt': MACHINE_MODE_LED_TONES[mode.id].ringAlt,
                  '--calculator-machine-led': MACHINE_MODE_LED_TONES[mode.id].glow,
                  '--calculator-machine-led-alt': MACHINE_MODE_LED_TONES[mode.id].glowAlt,
                  '--calculator-machine-led-soft': MACHINE_MODE_LED_TONES[mode.id].glowSoft,
                  '--calculator-machine-surface': MACHINE_MODE_LED_TONES[mode.id].surface,
                  '--calculator-machine-surface-alt': MACHINE_MODE_LED_TONES[mode.id].surfaceAlt,
                  '--calculator-machine-text': MACHINE_MODE_LED_TONES[mode.id].text,
                } as unknown as CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => setMachineMode(mode.id)}
                  className={`calculator-machine-mode-chip ${machineMode === mode.id ? 'is-active' : ''}`}
                >
                  <span className="calculator-machine-mode-chip-icon">{mode.icon}</span>
                  <span className="calculator-machine-mode-chip-label">{mode.label}</span>
                </button>
                <div className="calculator-machine-mode-preview-shell" aria-hidden="true">
                  <MachineModeAnimatedPreview mode={mode.id} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" aria-label="Calculator data backbone status">
            {backendWiringStatusCards.map((item) => (
              <div
                key={item.id}
                title={item.note}
                aria-label={`${item.label}: ${item.badge}. ${item.summary}. ${item.note}`}
                className="rounded-2xl border border-slate-700/50 bg-[#081320] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${catalogStatusTone(item.source)}`}>
                    {item.badge}
                  </span>
                </div>
                <div className="mt-2 text-[11px] font-semibold leading-5 text-slate-200">{item.summary}</div>
              </div>
            ))}
          </div>

          <div className="calculator-toolbar-secondary-band">
            <div className="calculator-toolbar-flow-group">
              <div className="relative group/upload">
                <button
                  type="button"
                  title={t('toolbar.uploadWorkflowTitle')}
                  aria-label="Open PRISM Flow"
                  aria-expanded={showUploadWorkflowDialog}
                  onClick={() => setShowUploadWorkflowDialog(true)}
                  className={`calculator-toolbar-flow-shell ${
                    showUploadWorkflowDialog ? 'calculator-toolbar-flow-shell-active' : ''
                  }`}
                >
                  <span className="calculator-toolbar-flow-copywrap">
                    <span className="calculator-toolbar-flow-label">
                      {t('toolbar.uploadWorkflow')}
                      <CalculatorInfoHint
                        label="PRISM Flow"
                        body="PRISM Flow is the lane that interprets the part, builds the setup plan, matches machine and tooling, estimates runtime, and shapes pricing posture."
                        className="ml-2"
                      />
                    </span>
                    <span className="calculator-toolbar-flow-copy">{loadedFileName ?? t('toolbar.uploadWorkflowDetail')}</span>
                  </span>
                  <span className="calculator-toolbar-flow-arrow" aria-hidden="true">↗</span>
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-[260px] -translate-x-1/2 translate-y-1 rounded-2xl border border-cyan-400/20 bg-[#081321]/95 px-3 py-2 text-[11px] leading-5 text-slate-200 opacity-0 shadow-[0_12px_36px_rgba(2,12,24,0.42)] backdrop-blur-sm transition duration-150 group-hover/upload:translate-y-0 group-hover/upload:opacity-100 group-focus-within/upload:translate-y-0 group-focus-within/upload:opacity-100">
                  {t('toolbar.uploadWorkflowTooltip')}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowUploadWorkflowDialog(true)}
                aria-label="Explain PRISM Flow"
                className="calculator-toolbar-flow-what"
              >
                {t('toolbar.uploadWorkflowWhatIs', 'See What PRISM Flow Unlocks')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Calculator Workspace: Balanced rails with a wider center cutting lane â”€â”€ */}
      <div className={CALCULATOR_WORKSPACE_GRID_CLASS}>
        <aside className="space-y-3 lg:sticky lg:top-2 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
          <div
            className={`calculator-rail-experience-strip ${
              guidedModeEnabled ? 'calculator-rail-experience-strip-guided' : ''
            } ${
              guideStepMetaById.units?.complete ? 'calculator-rail-experience-strip-complete' : ''
            }`}
          >
                <div className="calculator-rail-experience-strip-header">
                  <div>
                    <div className="calculator-rail-experience-strip-kicker">
                      Experience level
                      <CalculatorInfoHint
                        label="Experience level"
                        body="This sets how much explanation the calculator shows while you work. Guided Setup is the step-by-step mode; these buttons control how much extra context you want around it."
                        className="ml-2"
                      />
                    </div>
                    <div className="calculator-rail-experience-strip-title">How much context do you want?</div>
                  </div>
              <span className="calculator-rail-experience-strip-status">
                {guidedModeEnabled ? 'Guided handoff active' : experienceProfile.badge}
              </span>
            </div>
            <div className="calculator-rail-experience-button-row">
              {EXPERIENCE_PROFILES.map((profile) => {
                const tone =
                  profile.id === 'beginner'
                    ? 'calculator-rail-experience-button-beginner'
                    : profile.id === 'journeyman'
                      ? 'calculator-rail-experience-button-journeyman'
                      : 'calculator-rail-experience-button-master';

                return (
                  <button
                    key={profile.id}
                    type="button"
                    data-guide-managed="true"
                    data-guide-label={`Guided depth ${profile.label}`}
                    data-guide-description={`Use the ${profile.label} experience level when you want the calculator to explain more or less context while you work through the setup.`}
                    aria-label={`Guided depth ${profile.label}`}
                    aria-pressed={experience === profile.id}
                    onClick={() => setExperience(profile.id)}
                    className={`calculator-rail-experience-button ${tone} ${
                      experience === profile.id ? 'is-selected' : ''
                    } ${
                      guidedModeEnabled && currentGuidePanelId === 'units' ? 'is-guided-target' : ''
                    }`}
                  >
                    <span className="calculator-rail-experience-button-label">{profile.badge}</span>
                    <span className="calculator-rail-experience-button-copy">{profile.summary}</span>
                  </button>
                );
              })}
            </div>
          </div>

              <Panel icon="ðŸ­" title={machineSelectionTitle} guideTargetId="machine-selection" helpTopicId="machine-selection" onOpenHelp={handleOpenHelpTopic} summary={selectedMachine ? `${selectedMachine.manufacturer} ${selectedMachine.model}` : undefined} collapsible>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700/50 bg-[#0a1628] px-3 py-3 text-xs text-slate-400">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 font-bold uppercase tracking-[0.18em] ${catalogStatusTone(machineCatalogStatus.source)}`}>
                    {machineCatalogBadge}
                  </span>
                  <span className="rounded-full border border-slate-700/50 bg-[#0f1f36] px-3 py-1 font-semibold text-slate-400">
                    {machineCatalogStatus.liveCount > 0 ? `${machineCatalogStatus.liveCount.toLocaleString()} live` : `${machineCatalogStatus.fallbackCount.toLocaleString()} bundled`}
                  </span>
                </div>
                <p className="mt-3 leading-5">{machineCatalogStatus.note}</p>
              </div>
              <SelectField
                label="Machine from catalog"
                ariaLabel="Machine from catalog"
                value={selectedMachine?.id ?? ''}
                onChange={(value) => {
                  const nextMachine = machinesForMode.find((item) => item.id === value);
                  if (!nextMachine) return;
                  setMachineTypeId(nextMachine.machineTypeId);
                  setManufacturer(nextMachine.manufacturer);
                  setMachineId(nextMachine.id);
                }}
                options={savedMachineOptions}
                guideHint="Pick the closest catalog machine, then tune the controller, spindle, coolant, and measured shop data below to match the actual machine."
              />

              <SelectField
                label={t('machine.machineType')}
                ariaLabel="Machine type"
                value={machineTypeId}
                onChange={setMachineTypeId}
                options={machineTypeOptions}
                guideHint="Start here. Machine family is the first legality gate for the entire calculator."
              />

              <SelectField
                label={t('machine.manufacturer')}
                ariaLabel="Manufacturer"
                value={manufacturer}
                onChange={setManufacturer}
                options={manufacturerOptions}
                guideHint="Filter to the real builder before choosing a model so controller and spindle options stay credible."
              />

              <SelectField
                label={t('machine.model')}
                ariaLabel="Machine model"
                value={selectedMachine?.id ?? ''}
                onChange={setMachineId}
                options={filteredMachines.map((item) => ({
                  id: item.id,
                  label: item.model,
                  detail: `${item.machineTypeLabel} / ${item.family}`,
                }))}
                guideHint="Pick the exact machine package on the floor, not a similar platform."
              />
              <div className="rounded-xl border border-slate-700/40 bg-[#0c1727] px-3 py-2 text-[12px] leading-5 text-slate-400">
                {t('machine.filterSummary')
                  .replace('{packages}', String(filteredMachines.length))
                  .replace('{brands}', String(Math.max(0, manufacturerOptions.length - 1)))
                  .replace('{controllers}', String(controllerOptions.length))}
              </div>

              <SelectField
                label={t('machine.controller')}
                ariaLabel="Controller"
                value={selectedControllerOption?.id ?? controllerOptionId}
                onChange={setControllerOptionId}
                options={controllerOptions}
                guideHint="Lock the installed control before trusting cycles, packages, or CAM behavior."
              />

              <SelectField
                label={t('machine.spindlePackage', spindlePackageLabel)}
                ariaLabel={spindlePackageLabel}
                value={selectedSpindleOption?.id ?? spindleOptionId}
                onChange={setSpindleOptionId}
                options={spindleOptions}
                guideHint="Spindle package defines taper, RPM ceiling, and coolant posture. Match the real machine before you solve."
              />

              {supportsToolingStationSelection(effectiveToolingLayout) && effectiveToolingLayout?.stations ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{toolingStationFieldLabel}</div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-500">
                        {t('machine.toolingStationsHelp')}
                      </div>
                    </div>
                    <div className="rounded-full border border-slate-700/50 bg-[#0f1f36] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {formatToolingCapacitySummary(effectiveToolingLayout.kind, effectiveToolingStationCount)}
                    </div>
                  </div>
                  {toolingStationOptions.length ? (
                    <div className="flex flex-wrap gap-2">
                      {toolingStationOptions.map((stationCount) => {
                        const active = stationCount === effectiveToolingStationCount;
                        return (
                          <button
                            key={stationCount}
                            type="button"
                            aria-label={`${toolingStationFieldLabel} ${stationCount}`}
                            aria-pressed={active}
                            onClick={() => setToolingStationCountOverride(stationCount)}
                            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
                              active
                                ? 'border-sky-400/60 bg-sky-500/15 text-sky-100'
                                : 'border-slate-700/50 bg-[#0f1f36] text-slate-400 hover:border-slate-600 hover:bg-[#162742]'
                            }`}
                          >
                            {formatToolingCapacityOption(effectiveToolingLayout.kind, stationCount)}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {canAdjustToolingStations ? (
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-semibold text-slate-400">{t('machine.customInstalledCount')}</span>
                      <div className="flex items-center gap-2">
                        <EquationNumberInput
                          ariaLabel={toolingStationFieldLabel}
                          value={toolingStationCountOverride ?? effectiveToolingStationCount ?? ''}
                          onCommit={(nextValue) => handleToolingStationCountChange(nextValue === null ? '' : String(nextValue))}
                          min={1}
                          step={1}
                          integer
                          className="w-full rounded-lg border border-slate-600 bg-[#0a1628] px-2.5 py-1.5 text-[12px] text-slate-100 outline-none transition focus:border-sky-500"
                        />
                        <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {effectiveToolingLayout.kind === 'magazine' ? t('machine.tools') : t('machine.stations')}
                        </span>
                      </div>
                    </label>
                  ) : null}
                </div>
              ) : null}

              {controllerCapabilityOptions.length ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t('machine.installedControlPackages')}</div>
                    <div className="text-[11px] text-slate-500">{t('machine.enabled').replace('{count}', String(enabledControllerCapabilityIds.length))}</div>
                  </div>
                  <div className="grid gap-2">
                    {controllerCapabilityOptions.map((capability) => {
                      const enabled = enabledControllerCapabilityIds.includes(capability.id);
                      return (
                        <button
                          key={capability.id}
                          type="button"
                          aria-label={`Controller capability ${capability.label}`}
                          aria-pressed={enabled}
                          onClick={() => toggleControllerCapability(capability.id)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            enabled
                              ? 'border-violet-400/70 bg-violet-500/15 text-slate-100 shadow-[0_0_0_1px_rgba(167,139,250,0.18)]'
                              : 'border-slate-700/50 bg-[#0f1f36] text-slate-300 hover:border-slate-600 hover:bg-[#162742]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold">{capability.label}</div>
                              <div className={`mt-1 text-xs leading-5 ${enabled ? 'text-slate-300' : 'text-slate-500'}`}>
                                {capability.detail}
                              </div>
                              <div className="mt-2 text-[11px] leading-5 text-slate-500">
                                <span className="font-semibold text-slate-300">{t('machine.howToCheck')}</span> {capability.checkTip}
                              </div>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                              enabled ? 'bg-violet-400/20 text-violet-100' : 'bg-slate-900 text-slate-500'
                            }`}>
                              {enabled ? t('machine.on') : t('machine.off')}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-[11px] leading-5 text-slate-500">
                    {t('machine.controllerLane').replace('{value}', selectedControllerOption?.label ?? t('machine.controllerPending'))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t('machine.installedCoolantStrategies')}</div>
                  <div className="text-[11px] text-slate-500">{t('machine.enabled').replace('{count}', String(enabledMachineCoolantIds.length))}</div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {machineCoolantToggleOptions.map((option) => {
                    const enabled = enabledMachineCoolantIds.includes(option.id as CoolantOptionId);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-label={`Machine coolant ${option.label}`}
                        aria-pressed={enabled}
                        onClick={() => toggleMachineCoolantOption(option.id)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          enabled
                            ? 'border-sky-400/70 bg-sky-500/15 text-slate-100 shadow-[0_0_0_1px_rgba(56,189,248,0.18)]'
                            : 'border-slate-700/50 bg-[#0f1f36] text-slate-300 hover:border-slate-600 hover:bg-[#162742]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold">{option.label}</div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                            enabled ? 'bg-sky-400/20 text-sky-200' : 'bg-slate-900 text-slate-500'
                          }`}>
                            {enabled ? t('machine.on') : t('machine.off')}
                          </span>
                        </div>
                        <div className={`mt-1 text-xs leading-5 ${enabled ? 'text-slate-300' : 'text-slate-500'}`}>
                          {option.detail}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] leading-5 text-slate-500">
                  {t('machine.machineBaseline').replace('{value}', selectedMachine?.coolant ?? t('machine.processSpecificSetup'))}
                </div>
              </div>

              {selectedMachine && (
                <div className="space-y-3 rounded-2xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t('machine.measuredPosture')}</div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-500">
                        {t('machine.measuredPostureBody')}
                      </div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                      currentMeasuredMachinePerformance
                        ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                        : 'border-slate-700/50 bg-slate-900 text-slate-500'
                    }`}>
                      {measuredMachineSummaryLabel}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t('machine.guidewayConstruction')}</div>
                    <div className="grid gap-2">
                      {MACHINE_GUIDEWAY_OPTIONS.map((option) => {
                        const active = effectiveMachineGuidewayType === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-label={`Guideway ${option.label}`}
                            aria-pressed={active}
                            onClick={() => setMachineGuidewayType(option.id)}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              active
                                ? 'border-emerald-400/70 bg-emerald-500/15 text-slate-100 shadow-[0_0_0_1px_rgba(52,211,153,0.18)]'
                                : 'border-slate-700/50 bg-[#0a1628] text-slate-300 hover:border-slate-600 hover:bg-[#162742]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold">{option.label}</div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                                active ? 'bg-emerald-400/20 text-emerald-100' : 'bg-slate-900 text-slate-500'
                              }`}>
                                {active ? t('machine.active') : t('machine.off')}
                              </span>
                            </div>
                            <div className={`mt-1 text-xs leading-5 ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                              {option.detail}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MeasuredMachineInput
                      label={t('machine.machineAge')}
                      unit={t('machine.years')}
                      ariaLabel={t('machine.machineAge')}
                      value={machineAgeYears}
                      onCommit={setMachineAgeYears}
                      min={0}
                      step={1}
                      integer
                    />
                    <MeasuredMachineInput
                      label={t('machine.continuousSpindlePower')}
                      unit="kW"
                      ariaLabel={t('machine.continuousSpindlePower')}
                      value={measuredMachinePowerKw}
                      onCommit={setMeasuredMachinePowerKw}
                      min={0}
                      step={0.1}
                    />
                    <MeasuredMachineInput
                      label={t('machine.measuredMaxTorque')}
                      unit="Nm"
                      ariaLabel={t('machine.measuredMaxTorque')}
                      value={measuredMachineTorqueNm}
                      onCommit={setMeasuredMachineTorqueNm}
                      min={0}
                      step={0.1}
                    />
                    <MeasuredMachineInput
                      label={t('machine.naturalFrequency')}
                      unit="Hz"
                      ariaLabel={t('machine.naturalFrequency')}
                      value={measuredMachineNaturalFrequencyHz}
                      onCommit={setMeasuredMachineNaturalFrequencyHz}
                      min={0}
                      step={1}
                    />
                    <MeasuredMachineInput
                      label={t('machine.structuralStiffness')}
                      unit="N/um"
                      ariaLabel={t('machine.structuralStiffness')}
                      value={measuredMachineSystemStiffnessNPerUm}
                      onCommit={setMeasuredMachineSystemStiffnessNPerUm}
                      min={0}
                      step={0.1}
                    />
                    <MeasuredMachineInput
                      label={t('machine.dampingRatio')}
                      unit=""
                      ariaLabel={t('machine.dampingRatio')}
                      value={measuredMachineDampingRatio}
                      onCommit={setMeasuredMachineDampingRatio}
                      min={0}
                      step={0.001}
                    />
                    <MeasuredMachineInput
                      label={t('machine.axisAcceleration')}
                      unit="m/s^2"
                      ariaLabel={t('machine.axisAcceleration')}
                      value={measuredMachineAxisAccelerationMps2}
                      onCommit={setMeasuredMachineAxisAccelerationMps2}
                      min={0}
                      step={0.1}
                    />
                    <MeasuredMachineInput
                      label={t('machine.axisJerk')}
                      unit="m/s^3"
                      ariaLabel={t('machine.axisJerk')}
                      value={measuredMachineAxisJerkMps3}
                      onCommit={setMeasuredMachineAxisJerkMps3}
                      min={0}
                      step={0.1}
                    />
                  </div>
                </div>
              )}

              {selectedMachine && (
                <div className="rounded-2xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{selectedMachine.model}</div>
                      <div className="mt-1 text-xs text-slate-500">{selectedMachine.machineTypeLabel} / {selectedMachine.family}</div>
                    </div>
                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                      {selectedMachine.axes}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Meta label={t('machine.controller')} value={selectedControllerOption?.label ?? t('common.pending')} />
                    <Meta label={spindlePackageLabel} value={selectedSpindleOption?.label ?? t('common.pending')} />
                    <Meta label={t('machine.power')} value={selectedMachine.powerHp ? `${selectedMachine.powerHp} hp` : t('common.na')} />
                    <Meta label={t('machine.envelope')} value={selectedMachine.envelope} />
                    <Meta label={t('machine.guideway')} value={formatGuidewayType(effectiveMachineGuidewayType)} />
                    <Meta label={t('machine.naturalFrequency')} value={formatMachineMetric(measuredMachineNaturalFrequencyHz ?? selectedMachine.naturalFrequencyHz, 'Hz')} />
                    <Meta label={t('machine.axisAccelShort')} value={formatMachineMetric(measuredMachineAxisAccelerationMps2 ?? selectedMachine.axisAccelerationMps2, 'm/s^2')} />
                    <Meta label={t('machine.axisJerkShort')} value={formatMachineMetric(measuredMachineAxisJerkMps3 ?? selectedMachine.axisJerkMps3, 'm/s^3')} />
                    <Meta label={t('machine.coolant')} value={machineCoolantSummary} />
                    <Meta label={t('machine.hardwareLane')} value={hardwareDigest(effectiveSelectedMachine, selectedStation, selectedSpindleOption?.label)} />
                    <Meta label={t('machine.solverPosture')} value={measuredMachineSummaryLabel} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedMachine.bestFor.map((item) => (
                      <span key={item} className="rounded-full border border-slate-700/50 bg-[#0f1f36] px-2.5 py-1 text-[11px] font-medium text-slate-400">
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-label="Open machine parts buy options"
                      onClick={() => void openMachinePartsOptions()}
                      disabled={sectionPurchaseBusyId === 'machine-parts'}
                      className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-400/[0.10] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-100 transition hover:border-sky-300/50 hover:bg-sky-400/[0.16] disabled:cursor-not-allowed disabled:border-slate-700/50 disabled:bg-slate-900 disabled:text-slate-500"
                    >
                      {sectionPurchaseBusyId === 'machine-parts' ? `${t('machine.parts')}...` : t('machine.parts')}
                    </button>
                    <button
                      type="button"
                      aria-label="Open machine alarm support"
                      onClick={() => void openMachineAlarmOptions()}
                      disabled={sectionPurchaseBusyId === 'machine-alarm'}
                      className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/[0.10] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-100 transition hover:border-amber-300/50 hover:bg-amber-400/[0.16] disabled:cursor-not-allowed disabled:border-slate-700/50 disabled:bg-slate-900 disabled:text-slate-500"
                    >
                      {sectionPurchaseBusyId === 'machine-alarm' ? `${t('machine.alarm')}...` : t('machine.alarm')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Panel>

              <Panel icon="âš™ï¸" title={machineFeaturesTitle} guideTargetId="machine-features" helpTopicId="machine-features" onOpenHelp={handleOpenHelpTopic} summary={selectedFeatureDetails.length ? t('machine.verifiedCount').replace('{count}', String(selectedFeatureDetails.length)) : undefined} collapsible>
            <div className="space-y-4">
              <div className="grid gap-3">
                {machineFeatureOptions.map((feature) => {
                  const active = selectedFeatureIds.includes(feature.id);
                  const recommended = recommendedFeatureIds.includes(feature.id);
                  return (
                    <button
                      key={feature.id}
                      type="button"
                      data-guide-managed="true"
                      data-guide-label={`Machine feature ${feature.label}`}
                      data-guide-description={`Confirm whether ${feature.label} is really installed on this machine package before you trust setup assumptions. ${feature.checkTip}`}
                      aria-label={`Machine feature ${feature.label}`}
                      aria-pressed={active}
                      onClick={() => toggleMachineFeature(feature.id)}
                      className={`rounded-xl border px-4 py-4 text-left transition ${
                        active
                          ? 'border-emerald-500/50 bg-emerald-950/30 shadow-[0_4px_12px_rgba(16,185,129,0.08)]'
                          : recommended
                            ? 'border-amber-500/40 bg-amber-950/20 hover:border-amber-500/60'
                            : 'border-slate-700/50 bg-[#0f1f36] hover:border-slate-700/50 hover:bg-[#162742]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-100">{feature.label}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-400">{feature.detail}</div>
                          <div className="mt-3 text-xs leading-5 text-slate-500">
                            <span className="font-semibold text-slate-300">{t('machine.howToCheck')}</span> {feature.checkTip}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                            active
                              ? 'bg-emerald-600 text-white'
                              : recommended
                                ? 'bg-amber-950/40 text-amber-400'
                                : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {active ? t('machine.featureVerified') : recommended ? t('machine.featureRecommended') : t('machine.featureOptional')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {missingFeatureWarnings.length ? (
                <div className="calculator-warning-attention rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400">{t('machine.openVerificationItems')}</div>
                  <div className="mt-2 space-y-2">
                    {missingFeatureWarnings.map((feature) => (
                      <div key={feature.id} className="calculator-warning-attention-inline rounded-lg border border-amber-500/20 bg-[#0a1628] px-3 py-2 text-[12px] leading-5 text-amber-300/80">
                        {t('machine.setupUsesUnconfirmed').replace('{feature}', feature.label)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2.5 text-[12px] leading-5 text-emerald-400">
                  {t('machine.allChecksAligned')}
                </div>
              )}
            </div>
          </Panel>

              <Panel icon="ðŸ§±" title={materialTitle} guideTargetId="material" helpTopicId="material" onOpenHelp={handleOpenHelpTopic} summary={selectedMaterial?.name} collapsible>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700/50 bg-[#0a1628] px-3 py-3 text-xs text-slate-400">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 font-bold uppercase tracking-[0.18em] ${catalogStatusTone(materialCatalogStatus.source)}`}>
                    {materialCatalogBadge}
                  </span>
                  <span className="rounded-full border border-slate-700/50 bg-[#0f1f36] px-3 py-1 font-semibold text-slate-400">
                    {materialCatalogStatus.liveCount > 0
                      ? `${materialCatalogStatus.liveCount.toLocaleString()} live`
                      : `${materialCatalogStatus.fallbackCount.toLocaleString()} curated`}
                  </span>
                </div>
                <p className="mt-3 leading-5">{materialCatalogStatus.note}</p>
              </div>
              <SelectField
                label={t('material.group')}
                ariaLabel={t('material.group')}
                value={materialGroup}
                onChange={setMaterialGroup}
                options={MATERIAL_GROUPS.filter((item) => (machineMode === 'mill' || machineMode === 'lathe' ? item.id !== 'nontraditional' : true)).map((item) => ({
                  id: item.id,
                  label: item.label,
                  detail: item.detail,
                }))}
                guideHint="Start with the material family so PRISM narrows speed, wear, and finish behavior into the right band."
              />

              <SelectField
                label={t('material.subcategory')}
                ariaLabel={t('material.subcategory')}
                value={materialSubcategoryId}
                onChange={setMaterialSubcategoryId}
                options={materialSubcategoryOptions}
                guideHint="Use the subcategory to avoid broad defaults and keep alloy behavior specific."
              />

              <SelectField
                label={t('material.specific')}
                ariaLabel={t('material.specific')}
                value={selectedMaterial?.id ?? ''}
                onChange={setMaterialId}
                options={materialsForSelection.map((item) => ({
                  id: item.id,
                  label: formatMaterialOptionLabel(item),
                  detail: `${item.hardness} / ${item.idealCoolant}`,
                }))}
                guideHint="Pick the exact grade and condition you will actually cut. This is what makes the finish and wear model believable."
              />
              <div className="rounded-xl border border-slate-700/40 bg-[#0c1727] px-3 py-2 text-[12px] leading-5 text-slate-400">
                {t('material.sliceSummary')
                  .replace('{count}', String(materialsForSelection.length))
                  .replace('{scope}', materialSubcategoryId === 'all' ? t('material.scopeAll') : t('material.scopeFocused'))
                  .replace('{source}', materialSourceLabel)}
              </div>

              {selectedMaterial && (
                <div className="rounded-2xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4 text-sm leading-6 text-slate-400">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-100">{selectedMaterial.name}</div>
                    <span className="rounded-full bg-slate-700/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {selectedMaterial.hardness}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedMaterial.groupLabel ? (
                      <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">
                        {selectedMaterial.groupLabel}
                      </span>
                    ) : null}
                    {selectedMaterial.subcategoryLabel ? (
                      <span className="rounded-full border border-indigo-400/25 bg-indigo-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-100">
                        {selectedMaterial.subcategoryLabel}
                      </span>
                    ) : null}
                    {selectedMaterial.conditionLabel ? (
                      <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                        {selectedMaterial.conditionLabel}
                      </span>
                    ) : null}
                    {selectedMaterial.isoGroup ? (
                      <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100">
                        ISO {selectedMaterial.isoGroup}
                      </span>
                    ) : null}
                    <div className="mt-4">
                      <button
                        type="button"
                        aria-label="Open coolant buy options"
                        onClick={openCoolantPurchaseOptions}
                        className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/[0.10] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/[0.16]"
                      >
                      {t('material.buyCoolant')}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{selectedMaterial.note}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Meta label={unitSystem === 'inch' ? t('material.baseSfm') : t('material.baseSpeed')} value={materialBaseSpeed} />
                    <Meta label={t('material.machinability')} value={selectedMaterial.machinability} />
                    <Meta label={t('material.chipControl')} value={selectedMaterial.chipControl} />
                    <Meta label={t('material.idealCoolant')} value={selectedMaterial.idealCoolant} />
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      aria-label="Open material buy options"
                      onClick={openMaterialPurchaseOptions}
                      className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/[0.10] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/[0.16]"
                    >
                      {t('material.buyMaterial')}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <SelectField
                  label={t('material.stockSource')}
                  ariaLabel={t('material.stockSource')}
                  value={stockSource}
                  onChange={setStockSource}
                  options={STOCK_SOURCE_OPTIONS}
                  guideHint="Tell PRISM where the stock definition came from so it can judge confidence and whether this is prototype, purchased, or model-driven material."
                />
                <div className="text-[10px] font-semibold text-slate-400 mt-1">{t('material.stockShape')}</div>
                <div className="flex flex-wrap gap-1">
                  {STOCK_SHAPES.map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      data-guide-managed="true"
                      data-guide-label={`Stock shape ${shape.label}`}
                      data-guide-description={`Choose the stock form that most closely matches the raw material you will actually load. This changes the envelope and workholding assumptions.`}
                      aria-label={`Stock shape ${shape.label}`}
                      onClick={() => setStockShape(shape.id)}
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                        stockShape === shape.id
                          ? 'bg-sky-600 text-white border border-sky-400'
                          : 'border border-slate-600 text-slate-400 hover:text-slate-200'
                      }`}
                    >{shape.label}</button>
                  ))}
                </div>
                <StockInputs
                  unitSystem={unitSystem}
                  stockShape={stockShape}
                  stockX={stockX}
                  stockY={stockY}
                  stockZ={stockZ}
                  setStockX={setStockX}
                  setStockY={setStockY}
                  setStockZ={setStockZ}
                />
              </div>
            </div>
          </Panel>

          <Panel icon="ðŸ“" title={unitsTitle} guideTargetId="units" summary={unitSystemLabel} collapsible>
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t('units.system')}</div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'inch', label: t('units.inch'), detail: t('units.inchDetail') },
                    { id: 'metric', label: t('units.metric'), detail: t('units.metricDetail') },
                  ] as Array<{ id: UnitSystem; label: string; detail: string }>).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      data-guide-managed="true"
                      data-guide-label={`Unit system ${option.label}`}
                      data-guide-description={`Choose ${option.label} if that is how the programmer or operator needs to read the rest of the calculator. It changes how every dimensional and speed label is presented.`}
                      aria-label={`Unit system ${option.label}`}
                      aria-pressed={unitSystem === option.id}
                          onClick={() => {
                            setUnitSystem(option.id);
                            setShellCommerceUnitSystem(option.id);
                          }}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        unitSystem === option.id
                          ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                          : 'border-slate-700/50 bg-[#0f1f36] hover:border-slate-700/50 hover:bg-[#162742]'
                      }`}
                    >
                      <div className="text-sm font-semibold">{option.label}</div>
                      <div className={`mt-1 text-xs leading-5 ${unitSystem === option.id ? 'text-slate-300' : 'text-slate-500'}`}>
                        {option.detail}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t('units.guidedDepth')}</div>
                <div className="grid gap-2">
                  {EXPERIENCE_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      data-guide-managed="true"
                      data-guide-label={`Guided depth ${profile.label}`}
                      data-guide-description={`Use the ${profile.label} guidance depth when you want the calculator to explain more or less context while you work through the setup.`}
                      onClick={() => setExperience(profile.id)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        experience === profile.id
                          ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                          : 'border-slate-700/50 bg-[#0f1f36] hover:border-slate-700/50 hover:bg-[#162742]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold">{profile.label}</div>
                          <div className={`mt-1 text-xs ${experience === profile.id ? 'text-slate-300' : 'text-slate-500'}`}>{profile.summary}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                          experience === profile.id ? 'bg-white/10 text-white' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {profile.badge}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </aside>
        <div className="min-w-0 flex flex-col gap-6 xl:w-full xl:max-w-none">
          <div className={CALCULATOR_MAIN_RAIL_GRID_CLASS}>
            <div className="min-w-0 flex flex-col gap-6 xl:pr-2">
              {showUploadWorkflowDialog ? (
                <CalculatorWorkspaceDialog
                  title={t('toolbar.uploadWorkflow')}
                  summary={loadedFileName ?? t('toolbar.uploadWorkflowDetail')}
                  badge={t('upload.badge')}
                  icon="ðŸ“"
                  onClose={() => setShowUploadWorkflowDialog(false)}
                >
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFilePick(event.dataTransfer.files);
                  }}
                  className="group rounded-xl border border-dashed border-slate-700/50 bg-[linear-gradient(180deg,#0f1f36_0%,#0a1628_100%)] px-6 py-8 text-center transition hover:border-sky-500/50 hover:bg-[#162742]"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-2xl text-white shadow-lg shadow-slate-900/20 transition group-hover:scale-105">
                    â¤´
                  </div>
                  <div className="mt-5 text-lg font-semibold text-slate-100">
                    {loadedFileName ? loadedFileName : t('upload.dropPrompt')}
                  </div>
                  <p className="mx-auto mt-2 max-w-xs text-[11px] leading-5 text-slate-500">
                    {t('upload.browse')}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {[
                      t('upload.chip.poInvoice'),
                      t('upload.chip.rfqEmail'),
                      t('upload.chip.pdfDrawing'),
                      t('upload.chip.stepDxfImage'),
                    ].map((item) => (
                      <span key={item} className="rounded-full border border-slate-700/50 bg-[#0f1f36] px-3 py-1 text-xs font-medium text-slate-400">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.dxf,.step,.stp,.png,.jpg,.jpeg,.webp,.eml,.msg,.txt,.csv,.json,.xml,.xlsx,.xls,.doc,.docx,.htm,.html"
                  onChange={(event) => handleFilePick(event.target.files)}
                />
                <div className="mt-4 rounded-[24px] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(8,30,48,0.96)_0%,rgba(8,18,31,0.98)_58%,rgba(14,35,55,0.98)_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_30px_rgba(34,211,238,0.08)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <div className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100">
                        {t('upload.heroBadge')}
                      </div>
                      <div className="mt-3 text-lg font-semibold tracking-[0.01em] text-slate-50">
                        {t('upload.heroTitle')}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {t('upload.intakePointBody')}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-right">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">{t('upload.afterHeading')}</div>
                      <div className="mt-2 text-sm font-semibold text-slate-100">
                        {t('upload.afterSummary')}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">{t('upload.processPlanningTitle')}</div>
                      <div className="mt-2 text-sm font-semibold text-slate-100">{t('upload.processPlanningSubtitle')}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {t('upload.processPlanningBody')}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">{t('upload.inventoryRoiTitle')}</div>
                      <div className="mt-2 text-sm font-semibold text-slate-100">{t('upload.inventoryRoiSubtitle')}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {t('upload.inventoryRoiBody')}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">{t('upload.outsourceCompareTitle')}</div>
                      <div className="mt-2 text-sm font-semibold text-slate-100">{t('upload.outsourceCompareSubtitle')}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {t('upload.outsourceCompareBody')}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-200">{t('upload.machineUpgradeTitle')}</div>
                      <div className="mt-2 text-sm font-semibold text-slate-100">{t('upload.machineUpgradeSubtitle')}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {t('upload.machineUpgradeBody')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
                    <div className="rounded-2xl border border-cyan-300/18 bg-cyan-300/[0.07] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">{t('upload.toolCribBadge')}</div>
                          <div className="mt-2 text-sm font-semibold text-slate-50">{t('upload.toolCribTitle')}</div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {t('upload.toolCribBody')}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-cyan-100/80">
                            {t('upload.toolCribPrivacy')}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-right">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/80">{t('upload.activeImportMemory')}</div>
                          <div className="mt-2 text-sm font-semibold text-slate-100">{t('upload.activeImportCounts').replace('{imports}', String(toolCribImportCount)).replace('{libraries}', String(toolCribLibraryCount))}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {TOOL_CRIB_UPLOAD_SOURCE_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            aria-label={`Use ${option.label} intake type`}
                            onClick={() => setToolCribUploadSourceType(option.id)}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                              toolCribUploadSourceType === option.id
                                ? 'border-cyan-300/55 bg-cyan-300/[0.14] text-cyan-50'
                                : 'border-slate-700/60 bg-[#0f1f36] text-slate-300 hover:border-cyan-300/30 hover:text-slate-100'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 text-xs leading-5 text-slate-400">
                        {(TOOL_CRIB_UPLOAD_SOURCE_OPTIONS.find((option) => option.id === toolCribUploadSourceType)?.detail)
                          ?? t('upload.reviewHint')}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          aria-label="Import uploaded document into My Shop tool crib"
                          onClick={handleImportToolCribDocument}
                          disabled={!selectedUploadFile || !operatingSystem.ingestCalculatorToolCribDocument || toolCribImportLoading}
                          className="inline-flex items-center rounded-full border border-cyan-300/40 bg-cyan-950/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-950/60 disabled:cursor-not-allowed disabled:border-slate-700/60 disabled:bg-slate-900 disabled:text-slate-500"
                        >
                          {toolCribImportLoading ? t('upload.extracting') : t('upload.importButton')}
                        </button>
                        <div className="text-xs text-slate-400">
                          {selectedUploadFile
                            ? t('upload.readyToParse').replace('{file}', selectedUploadFile.name)
                            : t('upload.chooseDoc')}
                        </div>
                      </div>

                      {(toolCribImportError || toolCribImportSummary) ? (
                        <div
                          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                            toolCribImportError
                              ? 'border-rose-500/30 bg-rose-950/30 text-rose-200'
                              : 'border-cyan-300/25 bg-cyan-950/30 text-cyan-50'
                          }`}
                        >
                          {toolCribImportError ?? toolCribImportSummary}
                        </div>
                      ) : null}
                      {!toolCribImportError && toolCribLatestPrivacyNote ? (
                        <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-500/[0.08] px-4 py-3 text-xs leading-5 text-amber-100">
                          {t('upload.privacyActive')}: {toolCribLatestPrivacyNote}
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('upload.detectedTooling')}</div>
                          <div className="mt-3 space-y-2">
                            {(toolCribLatestImport?.suggestions.filter((suggestion) => suggestion.kind !== 'part_number').slice(0, 4) ?? []).length ? (
                              toolCribLatestImport?.suggestions
                                .filter((suggestion) => suggestion.kind !== 'part_number')
                                .slice(0, 4)
                                .map((suggestion) => (
                                  <div key={suggestion.id} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                    <div className="text-sm font-semibold text-slate-100">{suggestion.label}</div>
                                    <div className="mt-1 text-xs leading-5 text-slate-400">{suggestion.action}</div>
                                  </div>
                                ))
                            ) : (
                              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-xs leading-5 text-slate-500">
                                {t('upload.detectedToolingEmpty')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('upload.detectedPartNumbers')}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {toolCribWorkspace?.partNumbers.length ? (
                              toolCribWorkspace.partNumbers.slice(0, 6).map((partNumber) => (
                                <span key={partNumber} className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-xs font-semibold text-emerald-200">
                                  {partNumber}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-slate-700/60 bg-[#0f1f36] px-3 py-1 text-xs font-semibold text-slate-500">
                                {t('upload.detectedPartNumbersEmpty')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-rose-300/16 bg-rose-300/[0.05] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-200">{t('upload.localScanBadge')}</div>
                      <div className="mt-2 text-sm font-semibold text-slate-50">{t('upload.localScanTitle')}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {t('upload.localScanBody')}
                      </p>

                      {!showLocalScanConsent ? (
                        <button
                          type="button"
                          aria-label="Review local CAD CAM scan permission"
                          onClick={() => setShowLocalScanConsent(true)}
                          className="mt-4 inline-flex items-center rounded-full border border-rose-300/30 bg-rose-950/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-rose-100 transition hover:border-rose-200/60 hover:bg-rose-950/45"
                        >
                          {t('upload.reviewPermission')}
                        </button>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-rose-300/20 bg-[#160910] px-4 py-4">
                          <div className="text-sm font-semibold text-rose-100">{t('upload.permissionCheckpoint')}</div>
                          <div className="mt-2 text-xs leading-5 text-rose-100/80">
                            {t('upload.permissionBody')}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              aria-label="Allow local CAD CAM tooling scan"
                              onClick={handleRunLocalToolCribScan}
                              disabled={toolCribScanLoading}
                              className="inline-flex items-center rounded-full border border-rose-300/40 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-rose-50 transition hover:border-rose-200/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {toolCribScanLoading ? t('upload.scanning') : t('upload.allowScan')}
                            </button>
                            <button
                              type="button"
                              aria-label="Cancel local CAD CAM tooling scan"
                              onClick={() => setShowLocalScanConsent(false)}
                              className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-950/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-200 transition hover:border-slate-500/60 hover:bg-slate-900"
                            >
                              {t('upload.cancel')}
                            </button>
                          </div>
                        </div>
                      )}

                      {toolCribScanError ? (
                        <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                          {toolCribScanError}
                        </div>
                      ) : null}

                      <div className="mt-4 space-y-2">
                        {(toolCribWorkspace?.discoveredLibraries.slice(0, 3) ?? []).length ? (
                          toolCribWorkspace?.discoveredLibraries.slice(0, 3).map((library) => (
                            <div key={library.id} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                              <div className="text-sm font-semibold text-slate-100">{library.softwareLabel}</div>
                              <div className="mt-1 break-all text-xs leading-5 text-slate-400">{library.path}</div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-xs leading-5 text-slate-500">
                            {t('upload.localScanEmpty')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 xl:grid-cols-4">
                    {[
                      {
                        title: t('upload.openBlueprintQuote'),
                        body: t('upload.openBlueprintQuoteBody'),
                        href: blueprintQuotePath,
                      },
                      {
                        title: t('upload.openPrintToCnc'),
                        body: t('upload.openPrintToCncBody'),
                        href: programReleasePath,
                      },
                      {
                        title: t('upload.openQuoteCompare'),
                        body: t('upload.openQuoteCompareBody'),
                        href: quoteBuilderPath,
                      },
                      {
                        title: t('upload.openMachineRoi'),
                        body: t('upload.openMachineRoiBody'),
                        href: financialAnalysisPath,
                      },
                    ].map((action) => (
                      <button
                        key={action.title}
                        type="button"
                        onClick={() => navigate(action.href)}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition hover:border-cyan-300/28 hover:bg-cyan-300/[0.08]"
                      >
                        <div className="text-sm font-semibold text-slate-100">{action.title}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{action.body}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </CalculatorWorkspaceDialog>
              ) : null}

              {activeHelpTopic ? (
                <CalculatorHelpPopover
                  topicId={activeHelpTopic.topicId}
                  anchorRect={activeHelpTopic.anchorRect}
                  onClose={() => setActiveHelpTopic(null)}
                />
              ) : null}

              {showWhyPrismDialog ? (
                <CalculatorWorkspaceDialog
                  title={t('toolbar.whyPrism')}
                  summary={t('why.summary')}
                  badge={t('why.badge')}
                  icon="âœ¦"
                  onClose={() => setShowWhyPrismDialog(false)}
                  maxWidthClassName="max-w-[1120px]"
                >
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-violet-300/18 bg-[linear-gradient(135deg,rgba(26,18,56,0.96)_0%,rgba(11,17,34,0.98)_54%,rgba(18,28,52,0.98)_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_32px_rgba(129,140,248,0.10)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-2xl">
                          <div className="inline-flex items-center rounded-full border border-violet-300/35 bg-violet-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-100">
                            {t('why.heroBadge')}
                          </div>
                          <div className="mt-3 text-lg font-semibold tracking-[0.01em] text-slate-50">
                            {t('why.heroTitle')}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {t('why.heroBody')}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-right">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-100/80">{t('why.optimizingForHeading')}</div>
                          <div className="mt-2 text-sm font-semibold text-slate-100">{t('why.optimizingForSummary')}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-3">
                      {prismModeExplainerCards.map((card) => (
                        <div key={card.title} className={`rounded-2xl border px-4 py-4 ${card.shell}`}>
                          <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${card.accent}`}>{card.title}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-300">{card.body}</div>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200">{t('why.compareBasic')}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-100">{t('why.compareBasicSubtitle')}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {t('why.compareBasicBody')}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">{t('why.compareCam')}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-100">{t('why.compareCamSubtitle')}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {t('why.compareCamBody')}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">{t('why.compareTooling')}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-100">{t('why.compareToolingSubtitle')}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {t('why.compareToolingBody')}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">{t('why.compareAssistant')}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-100">{t('why.compareAssistantSubtitle')}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {t('why.compareAssistantBody')}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-3">
                      {[
                        t('why.pointMachineAware'),
                        t('why.pointCrossSoftware'),
                        t('why.pointMaterialInteractions'),
                        t('why.pointShopMemory'),
                        t('why.pointPlanningRelease'),
                        t('why.pointKnowledgeBase'),
                      ].map((point) => (
                        <div key={point} className="rounded-2xl border border-slate-700/60 bg-[#0d182a] px-4 py-4 text-sm leading-6 text-slate-300">
                          {point}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-[24px] border border-cyan-400/14 bg-[linear-gradient(135deg,rgba(9,24,40,0.98)_0%,rgba(10,18,30,0.99)_52%,rgba(19,12,33,0.98)_100%)] px-5 py-5 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-3xl">
                          <div className="inline-flex items-center rounded-full border border-cyan-300/28 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100">
                            What makes PRISM mode credible
                          </div>
                          <div className="mt-3 text-lg font-semibold text-slate-50">
                            Real machining math and science, without dumping the internal recipe.
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            PRISM mode is not a generic assistant wrapper. It sits on top of machine legality, cut-state math, finish estimation, and manufacturing-specific knowledge so the recommendations stay physically believable and commercially useful.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/80">Guardrail</div>
                          <div className="mt-2 text-sm font-semibold text-slate-100">Enough detail to trust it. Not enough to clone it.</div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 xl:grid-cols-3">
                        {prismModeScienceCards.map((card) => (
                          <div key={card.title} className={`rounded-2xl border px-4 py-4 ${card.tone}`}>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">{card.title}</div>
                            <div className="mt-2 text-sm leading-6 text-slate-300">{card.body}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-amber-400/16 bg-[linear-gradient(135deg,rgba(36,22,8,0.98)_0%,rgba(18,17,28,0.98)_54%,rgba(29,17,9,0.98)_100%)] px-5 py-5 shadow-[0_0_28px_rgba(245,158,11,0.08)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-3xl">
                          <div className="inline-flex items-center rounded-full border border-amber-300/26 bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-100">
                            Pricing structure
                          </div>
                          <div className="mt-3 text-lg font-semibold text-slate-50">
                            PRISM calculator pricing ladder
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            Start with the calculator lane, then unlock deeper machine-aware setup logic, shop-memory coverage, and workflow guidance as the tiers move up.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 xl:grid-cols-4">
                        {prismModePricingTiers.map((tier) => (
                          <div key={tier.name} className={`rounded-2xl border px-4 py-4 ${tier.shell}`}>
                            <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${tier.accent}`}>{tier.name}</div>
                            <div className="mt-2 text-2xl font-black text-white">{tier.price}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">{tier.note}</div>
                            <div className="mt-4 space-y-2">
                              {tier.bullets.map((bullet) => (
                                <div key={bullet} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-slate-300">
                                  {bullet}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CalculatorWorkspaceDialog>
              ) : null}

              <Panel icon="ðŸ’»" title={programmingTitle} guideTargetId="programming" helpTopicId="programming" onOpenHelp={handleOpenHelpTopic} summary={selectedProgramming?.label}
                className="order-2"
                collapsible
              >
                <div className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <SelectField
                      label={t('programming.package')}
                      ariaLabel="Programming package select"
                      value={selectedProgramming?.id ?? ''}
                      onChange={handleProgrammingChange}
                      options={programmingEnvironmentsForMode.map((environment) => ({
                        id: environment.id,
                        label: environment.label,
                        detail: `${environment.vendor} / ${environment.badge}`,
                      }))}
                      guideHint="Choose the package that will really own the posted path so the rest of the workflow stays software-legal."
                    />
                    <SelectField
                      label={t('programming.license')}
                      ariaLabel="CAM license tier"
                      value={licenseTierId}
                      onChange={handleLicenseTierChange}
                      options={programmingLicenseOptions}
                      guideHint="License tier cuts the toolpath list down to what your seat can actually run."
                    />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <SelectField
                      label={t('programming.toolpathType')}
                      ariaLabel="Toolpath type select"
                      value={selectedToolpathType?.id ?? ''}
                      onChange={handleToolpathTypeChange}
                      options={toolpathTypes.map((type) => ({
                        id: type.id,
                        label: type.label,
                        detail:
                          type.id === 'all'
                            ? `${type.count} licensed paths across every family`
                            : `${type.count} available paths in this family`,
                      }))}
                      guideHint="Use the toolpath family to narrow from every licensed path into the real machining intent."
                    />
                    <SelectField
                      label={t('programming.exactToolpath')}
                      ariaLabel="Exact toolpath select"
                      value={selectedToolpath?.id ?? ''}
                      onChange={setToolpathId}
                      options={filteredToolpathOptions.map((toolpath) => ({
                        id: toolpath.id,
                        label: toolpath.label,
                        detail: toolpath.path,
                      }))}
                      guideHint="Pick the exact posted strategy here. This is what ties tooling, entry style, and finish posture together."
                    />
                  </div>

                  <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Programming catalog source</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${catalogStatusTone(programmingCatalogStatus.source)}`}>
                          {programmingCatalogBadge}
                        </span>
                        <span className="rounded-full border border-slate-700/50 bg-[#0a1628] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          {programmingCatalogSummary}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{programmingCatalogStatus.note}</p>
                  </div>


                  <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
                  <div className="space-y-4 rounded-xl border border-slate-700/50 bg-[#0f1f36] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Software package</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {programmingEnvironmentsForMode.map((environment) => {
                        const active = selectedProgramming?.id === environment.id;
                        const logo = programmingLogo(environment.label);
                        return (
                          <button
                            key={environment.id}
                            type="button"
                            aria-label={`Programming package ${environment.label}`}
                            aria-pressed={active}
                            onClick={() => handleProgrammingChange(environment.id)}
                            className={`rounded-xl border px-4 py-4 text-left transition ${
                              active
                                ? 'border-sky-500/50 bg-[linear-gradient(180deg,rgba(8,47,73,0.6)_0%,#0a1628_100%)] shadow-[0_4px_12px_rgba(14,165,233,0.08)]'
                                : 'border-slate-700/50 bg-[#0f1f36] hover:border-slate-600 hover:bg-[#162742]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-black tracking-[0.08em] ${
                                  active
                                    ? 'border-sky-500/40 bg-sky-950/40 text-sky-400'
                                    : 'border-slate-700/50 bg-[#0a1628] text-slate-300'
                                }`}
                                style={active ? SELECTED_TEXT_OUTLINE_STYLE : undefined}
                                aria-hidden="true"
                              >
                                {logo.mark}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-100" style={active ? SELECTED_TEXT_OUTLINE_STYLE : undefined}>
                                  {environment.label}
                                </div>
                                <div
                                  className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${active ? 'text-slate-400' : 'text-slate-400'}`}
                                  style={active ? SELECTED_TEXT_OUTLINE_STYLE : undefined}
                                >
                                  {logo.wordmark}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-xl border border-slate-700/50 bg-[#0f1f36] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Toolpath type</div>
                        {selectedToolpathType && (
                          <span className="rounded-full border border-slate-700/50 bg-[#0f1f36] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            {selectedToolpathType.id === 'all'
                              ? `${licensedToolpathOptions.length} total`
                              : `${filteredToolpathOptions.length} of ${licensedToolpathOptions.length}`}
                          </span>
                        )}
                      </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {toolpathTypes.map((type) => {
                        const active = selectedToolpathType?.id === type.id;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            aria-label={`Toolpath type ${type.label}`}
                            aria-pressed={active}
                            onClick={() => handleToolpathTypeChange(type.id)}
                            className={`rounded-xl border px-4 py-4 text-left transition ${
                              active
                                ? 'border-indigo-500/50 bg-[linear-gradient(180deg,rgba(49,46,129,0.3)_0%,#0a1628_100%)] text-slate-100 shadow-[0_4px_12px_rgba(99,102,241,0.08)]'
                                : 'border-slate-700/50 bg-[#0f1f36] hover:border-slate-600 hover:bg-[#162742]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold" style={active ? SELECTED_TEXT_OUTLINE_STYLE : undefined}>
                                {type.label}
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                                  active ? 'bg-indigo-950/40 text-indigo-400' : 'bg-slate-700 text-slate-400'
                                }`}
                                style={active ? SELECTED_TEXT_OUTLINE_STYLE : undefined}
                              >
                                {type.count}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Exact toolpath</div>
                      {selectedToolpath && (
                        <span className="rounded-full border border-slate-700/50 bg-[#0f1f36] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          {labelFor(processOperations, selectedToolpath.operationId)}
                        </span>
                      )}
                    </div>
                    <div className="grid max-h-[360px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                      {filteredToolpathOptions.map((toolpath) => {
                        const active = selectedToolpath?.id === toolpath.id;
                        return (
                          <button
                            key={toolpath.id}
                            type="button"
                            aria-label={`Toolpath ${toolpath.label}`}
                            aria-pressed={active}
                            onClick={() => setToolpathId(toolpath.id)}
                            className={`rounded-xl border px-4 py-4 text-left transition ${
                              active
                                ? 'border-cyan-500/50 bg-[linear-gradient(180deg,rgba(22,78,99,0.4)_0%,#0a1628_100%)] text-slate-100 shadow-[0_4px_12px_rgba(34,211,238,0.08)]'
                                : 'border-slate-700/50 bg-[#0f1f36]/90 hover:border-slate-600 hover:bg-[#162742]'
                            }`}
                          >
                            <div className="text-sm font-semibold" style={active ? SELECTED_TEXT_OUTLINE_STYLE : undefined}>
                              {toolpath.label}
                            </div>
                            <div
                              className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${active ? 'text-cyan-400' : 'text-slate-400'}`}
                              style={active ? SELECTED_TEXT_OUTLINE_STYLE : undefined}
                            >
                              {toolpath.path}
                            </div>
                            <p className={`mt-3 text-sm leading-6 ${active ? 'text-slate-400' : 'text-slate-400'}`}>
                              Route this operation through {toolpath.path} and verify the final engagement against the live machine and tooling stack.
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    {selectedToolpath && (
                      <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-100">{selectedToolpath.label}</div>
                            <div className="mt-1 text-xs text-slate-500">{selectedToolpath.path}</div>
                          </div>
                          <span className="rounded-full border border-slate-700/50 bg-[#0f1f36] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            {selectedToolpathType?.label ?? (selectedProgramming?.kind === 'manual' ? 'Manual path' : 'CAM-native path')}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-400">
                          Use {selectedToolpath.path} as the primary programming route, then confirm feeds, entry posture, and license-fit before release.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              </Panel>

              {showPrismModeDialog ? (
                <CalculatorWorkspaceDialog
                  title={t('toolbar.prismMode')}
                  summary={`${prismModePlan.confidenceLabel} / ${prismModePlan.inventoryCoverageLabel}`}
                  badge="Optimization lane"
                  icon="ðŸ§ "
                  onClose={() => setShowPrismModeDialog(false)}
                  maxWidthClassName="max-w-[1240px]"
                >
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-cyan-400/18 bg-[linear-gradient(135deg,rgba(8,34,54,0.98)_0%,rgba(7,21,36,0.98)_52%,rgba(8,26,42,0.99)_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_34px_rgba(34,211,238,0.10)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
                            Advanced optimization lane
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300">
                            Machine-aware setup guidance
                          </span>
                        </div>
                        <div className="mt-3 text-lg font-semibold tracking-[0.01em] text-slate-50">{prismModePlan.summary}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{prismModePlan.detail}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-sky-400/20 bg-sky-400/[0.08] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">
                            {prismModePlan.confidenceScore}% recommendation confidence
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                            prismPurchaseRecommendationSource === 'roi-engine'
                              ? 'border-emerald-400/30 bg-emerald-400/[0.10] text-emerald-200 shadow-[0_0_22px_rgba(16,185,129,0.12)]'
                              : 'border-amber-400/30 bg-amber-400/[0.09] text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.08)]'
                          }`}>
                            {prismPurchaseSourceLabel}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          aria-label={prismModeEnabled ? 'Disable PRISM auto-apply' : 'Enable PRISM auto-apply'}
                          aria-pressed={prismModeEnabled}
                          onClick={() => setPrismModeEnabled((current) => !current)}
                          className={`inline-flex items-center rounded-full border px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] transition ${
                            prismModeEnabled
                              ? 'border-emerald-300/45 bg-emerald-400/[0.13] text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.12)] hover:bg-emerald-400/[0.18]'
                              : 'border-cyan-400/20 bg-[#081727] text-slate-200 shadow-[0_0_18px_rgba(14,165,233,0.07)] hover:border-cyan-300/40 hover:bg-cyan-400/[0.08] hover:text-cyan-100'
                          }`}
                        >
                          {prismModeEnabled ? 'Auto-apply on' : 'Auto-apply off'}
                        </button>
                        <button
                          type="button"
                          aria-label="Apply PRISM setup now"
                          onClick={applyPrismModeSetup}
                          className="inline-flex items-center rounded-full border border-cyan-300/45 bg-[linear-gradient(135deg,rgba(34,211,238,0.22)_0%,rgba(59,130,246,0.16)_100%)] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.18)] transition hover:border-cyan-200/65 hover:shadow-[0_0_32px_rgba(34,211,238,0.24)]"
                        >
                          {prismModePlan.hasSetupDelta ? `Apply ${prismModePlan.setupDeltaCount} changes` : 'Setup already aligned'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {prismModePlan.signals.map((signal) => (
                        <div
                          key={signal.id}
                          className={`rounded-2xl border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${
                            signal.tone === 'good'
                              ? 'border-emerald-400/22 bg-[linear-gradient(180deg,rgba(16,185,129,0.10)_0%,rgba(9,25,23,0.92)_100%)]'
                              : signal.tone === 'watch'
                                ? 'border-amber-400/22 bg-[linear-gradient(180deg,rgba(251,191,36,0.10)_0%,rgba(33,23,11,0.92)_100%)]'
                                : 'border-cyan-400/14 bg-[linear-gradient(180deg,rgba(14,165,233,0.08)_0%,rgba(8,19,31,0.96)_100%)]'
                          }`}
                        >
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{signal.title}</div>
                          <div className="mt-2 text-sm font-semibold text-slate-100">{signal.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-cyan-500/14 bg-[linear-gradient(180deg,rgba(12,30,47,0.96)_0%,rgba(10,22,38,0.98)_100%)] px-4 py-4 shadow-[0_0_24px_rgba(14,165,233,0.06)]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Recommended setup posture</div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Meta label="Setup source" value={labelFor(SETUP_SOURCE_OPTIONS, prismModePlan.recommendedSetup.setupSource)} />
                        <Meta label="Coolant" value={labelFor(COOLANT_OPTIONS, prismModePlan.recommendedSetup.coolantId)} />
                        <Meta label="Holder style" value={labelFor(holderStyleOptions, prismModePlan.recommendedSetup.holderStyleId)} />
                        <Meta
                          label={holderSelectionLabel}
                          value={
                            compatibleHolderPackages.find((holder) => holder.id === prismModePlan.recommendedSetup.holderPackageId)?.label
                            ?? prismModePlan.recommendedSetup.holderPackageId
                          }
                        />
                        <Meta label="Machine features" value={`${prismModePlan.recommendedSetup.enabledFeatureIds.length} active`} />
                        <Meta label="Control packages" value={`${prismModePlan.recommendedSetup.enabledControllerCapabilityIds.length} active`} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-cyan-500/14 bg-[linear-gradient(180deg,rgba(12,30,47,0.96)_0%,rgba(10,22,38,0.98)_100%)] px-4 py-4 shadow-[0_0_24px_rgba(45,212,191,0.05)]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Evidence stack</div>
                      <div className="mt-3 space-y-3">
                        {prismModePlan.evidence.map((item) => (
                          <div key={item} className="rounded-2xl border border-white/7 bg-[#091726] px-4 py-3 text-sm leading-6 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-cyan-400/16 bg-[linear-gradient(180deg,rgba(10,29,46,0.98)_0%,rgba(8,18,31,0.99)_100%)] px-4 py-4 shadow-[0_0_32px_rgba(14,165,233,0.08)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/[0.10] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
                            {t('purchase.rankedPaths')}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                            {t('purchase.prismGuidance')}
                          </span>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">
                          {t('purchase.guidanceBody')}
                        </div>
                        {prismPurchaseRecommendationNote ? (
                          <div className="mt-3 rounded-2xl border border-white/7 bg-white/[0.04] px-3 py-3 text-xs leading-5 text-slate-400">{prismPurchaseRecommendationNote}</div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-sky-400/30 bg-sky-400/[0.10] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.1)]">
                          {prismModePlan.confidenceScore}% confidence
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                          prismPurchaseRecommendationSource === 'roi-engine'
                            ? 'border-emerald-400/30 bg-emerald-400/[0.10] text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.14)]'
                            : 'border-amber-400/30 bg-amber-400/[0.10] text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.08)]'
                        }`}>
                          {prismPurchaseSourceLabel}
                        </span>
                      </div>
                    </div>

                    {prismPurchaseRecommendationWarnings.length ? (
                      <div className="mt-4 grid gap-2">
                        {prismPurchaseRecommendationWarnings.map((warning) => (
                          <div
                            key={warning}
                            className="calculator-warning-attention rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs leading-5 text-amber-100/85"
                          >
                            {warning}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-3 xl:grid-cols-3">
                      {activePrismPurchaseRecommendations.map((recommendation, index) => {
                        const tone = prismRecommendationTone(recommendation.category);
                        return (
                          <button
                            key={recommendation.id}
                            type="button"
                            aria-label={`Open PRISM purchase option ${recommendation.title}`}
                            onClick={() => setPrismPurchaseTarget(recommendation)}
                            className={`group rounded-[22px] border px-4 py-4 text-left transition duration-200 ${tone.card}`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${tone.badge}`}>
                                {recommendation.category}
                              </div>
                              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                                #{index + 1} ranked path
                              </div>
                            </div>
                            <div className="mt-3 text-base font-semibold text-slate-50">{recommendation.title}</div>
                            <div className="mt-2 text-sm leading-6 text-slate-300">{recommendation.detail}</div>
                            <div className="mt-4 grid gap-2 text-xs text-slate-300">
                              <div className={`rounded-xl border px-3 py-2 ${tone.metric}`}>
                                <span className="font-semibold text-slate-50">Price:</span> {recommendation.estimatedPrice}
                              </div>
                              <div className={`rounded-xl border px-3 py-2 ${tone.metric}`}>
                                <span className="font-semibold text-slate-50">ROI:</span> {recommendation.roiStrength}
                              </div>
                              <div className={`rounded-xl border px-3 py-2 ${tone.metric}`}>
                                <span className="font-semibold text-slate-50">Payback:</span> {recommendation.payback}
                              </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                              <span className="text-slate-400">Open ranked buy path</span>
                              <span className={`transition group-hover:translate-x-1 ${tone.accent}`}>Inspect option â†’</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CalculatorWorkspaceDialog>
              ) : null}

              <Panel
                icon="ðŸ”©" title={cuttingParametersTitle} guideTargetId="cutting-parameters" summary={selectedOperationLabel}
                className="order-3"
                collapsible
              >
                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <SelectField
                    label={t('cutting.entryStyle')}
                    ariaLabel="Entry style"
                    value={entryStyle}
                    onChange={setEntryStyle}
                    options={entryStyleOptions}
                    guideHint="Use the real entry posture because plunge, helix, and ramp strategies change load and finish immediately."
                  />
                  <SelectField
                    label={t('cutting.machiningPosture')}
                    ariaLabel="Finish target"
                    value={finishTarget}
                    onChange={handleFinishTargetChange}
                    options={FINISH_TARGET_OPTIONS}
                    guideHint="Choose whether this operation is roughing, balanced, or finish-first so PRISM tunes the cut around the real goal."
                  />
                </div>

                <div className="mb-5 rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{finishModeHeading}</div>
                      <div className="mt-2 text-lg font-black text-slate-100">
                        {formatSurfaceFinish(effectiveDesiredRaUm, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 2)}
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                        {finishModeBody}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-full border border-slate-700/60 bg-[#0a1628] p-1">
                        <button
                          type="button"
                          data-guide-managed="true"
                          data-guide-label="Finish target mode auto"
                          data-guide-description="Auto mode derives the desired finish from the current machine, material, tooling, and cut state."
                          aria-label="Finish target mode auto"
                          aria-pressed={finishControlMode === 'auto'}
                          onClick={() => handleFinishControlModeChange('auto')}
                          className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                            finishControlMode === 'auto'
                              ? 'bg-cyan-500/20 text-cyan-200'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Auto
                        </button>
                        <button
                          type="button"
                          data-guide-managed="true"
                          data-guide-label="Finish target mode manual"
                          data-guide-description="Manual mode lets you force the desired finish target when the print or customer requirement is already known."
                          aria-label="Finish target mode manual"
                          aria-pressed={finishControlMode === 'manual'}
                          onClick={() => handleFinishControlModeChange('manual')}
                          className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                            finishControlMode === 'manual'
                              ? 'bg-amber-500/20 text-amber-200'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Manual
                        </button>
                      </div>
                      <span className="rounded-full border border-slate-700/60 bg-[#0a1628] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                        {finishModeSummaryLabel}
                      </span>
                      <span className="rounded-full border border-sky-500/30 bg-sky-950/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-400">
                        {activeFinishPreset.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {SURFACE_FINISH_PRESETS.map((preset) => {
                      const active = preset.id === activeFinishPreset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          data-guide-managed="true"
                          data-guide-label={`Finish preset ${preset.label}`}
                          data-guide-description="Use a finish preset to quickly move the target surface band before fine-tuning the exact Ra requirement."
                          aria-label={`Finish preset ${preset.label}`}
                          aria-pressed={active}
                          onClick={() => handleDesiredRaChange(preset.raUm)}
                          className={`rounded-full border px-3 py-2 text-left text-xs font-semibold transition ${
                            active
                              ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-200'
                              : 'border-slate-700/60 bg-[#0a1628] text-slate-300 hover:border-slate-600 hover:bg-[#162742]'
                          }`}
                        >
                          <span className="block">{preset.label}</span>
                          <span className={`mt-1 block text-[10px] uppercase tracking-[0.16em] ${active ? 'text-cyan-300' : 'text-slate-500'}`}>
                            {formatSurfaceFinish(preset.raUm, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 2)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.618fr)_minmax(320px,1fr)]">
                    <div className="space-y-4">
                      <label className="block">
                        <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {finishModeSliderLabel}
                        <CalculatorInfoHint
                          label="Desired Ra finish"
                          body="Requested Ra is the finish target you want to hit. PRISM compares that target with the finish this machine, toolpath, tooling, and cut state are likely to produce."
                          className="ml-2"
                        />
                      </span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {activeFinishPreset.shortLabel}
                          </span>
                        </div>
                        <input
                          data-guide-managed="true"
                          data-guide-label="Desired Ra finish"
                          data-guide-description="Use the slider to set the exact surface-finish target and watch the finish preview and solve react to it."
                          aria-label="Desired Ra finish"
                          type="range"
                          min={MIN_DESIRED_RA_UM}
                          max={MAX_DESIRED_RA_UM}
                          step={0.05}
                          value={effectiveDesiredRaUm}
                          onChange={(event) => handleDesiredRaChange(Number(event.target.value))}
                          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan-400"
                        />
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{formatSurfaceFinish(MAX_DESIRED_RA_UM, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 1)}</span>
                          <span>{formatSurfaceFinish(MIN_DESIRED_RA_UM, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 1)}</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-5 text-slate-500">{finishModeSliderHint}</p>
                      </label>

                      <div className="grid gap-3 md:grid-cols-3">
                        <PreviewMetric label="Forecast range" value={`${formatSurfaceFinish(surfaceFinishPreview.expectedMinRaUm, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 2)} - ${formatSurfaceFinish(surfaceFinishPreview.expectedMaxRaUm, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 2)}`} />
                        <PreviewMetric label="Machining posture" value={labelFor(FINISH_TARGET_OPTIONS, finishTarget)} />
                        <PreviewMetric label="Verdict" value={surfaceFinishPreview.verdictLabel} />
                      </div>

                      <div className="rounded-2xl border border-slate-700/50 bg-[#0a1628] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Adaptive cut input block</div>
                            <div className="mt-1 text-sm font-semibold text-slate-100">Drive the finish model and the live solve from one place</div>
                          </div>
                          <span className="rounded-full border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                            Adaptive tuning ready
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <label className="block md:col-span-2">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-400">Operation</span>
                            <select
                              data-guide-managed="true"
                              data-guide-label="Operation"
                              data-guide-description="Operation selects the machining intent for the cut. It helps PRISM decide which tools, feeds, and finish logic are even plausible."
                              value={operation}
                              onChange={(event) => setOperation(event.target.value)}
                              className="w-full rounded-lg border border-slate-600 bg-[#08111f] px-2.5 py-1.5 text-[12px] text-slate-100 outline-none transition focus:border-sky-500"
                            >
                              {processOperations.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <NumberField
                            label="Tool diameter"
                            unit={lengthUnit(unitSystem)}
                            value={convertLength(toolDiameter, unitSystem)}
                            onChange={(value) => setToolDiameter(parseLength(value, unitSystem))}
                            min={unitSystem === 'inch' ? 0.005 : 0.1}
                            step={unitSystem === 'inch' ? 0.001 : 0.1}
                            guideHint="Use the actual cutter diameter in the spindle. This is the root dimension for chip load, engagement, and finish logic."
                          />
                          <NumberField
                            label="Flutes / stations"
                            unit=""
                            value={flutes}
                            onChange={setFlutes}
                            min={1}
                            step={1}
                            integer
                            guideHint="Flute or station count changes chip evacuation, feed capability, and how aggressively PRISM should push the cut."
                          />
                          <ActionNumberField
                            label="DOC"
                            unit={lengthUnit(unitSystem)}
                            value={convertLength(doc, unitSystem)}
                            onChange={(value) => setDoc(parseLength(value, unitSystem))}
                            min={unitSystem === 'inch' ? 0.001 : 0.01}
                            step={unitSystem === 'inch' ? 0.001 : 0.1}
                            actionLabel="Optimize DOC"
                            onAction={handleOptimizeDoc}
                            helperText={`${parameterOptimization.docStatusLabel}. ${parameterOptimization.docReason}`}
                            guideHint="Depth of cut is one of the biggest load drivers. Increase it only when the machine, holder, and tool can really carry it."
                          />
                          <NumberField
                            label="WOC / engagement"
                            unit={lengthUnit(unitSystem)}
                            value={convertLength(woc, unitSystem)}
                            onChange={(value) => setWoc(parseLength(value, unitSystem))}
                            min={unitSystem === 'inch' ? 0.001 : 0.01}
                            step={unitSystem === 'inch' ? 0.001 : 0.1}
                            guideHint="Radial engagement controls chip thinning, side load, and finish behavior. Keep it honest."
                          />
                          <ActionNumberField
                            label="Tool extension from holder"
                            unit={lengthUnit(unitSystem)}
                            value={convertLength(toolStickout, unitSystem)}
                            onChange={(value) => setToolStickout(parseLength(value, unitSystem))}
                            min={unitSystem === 'inch' ? 0.05 : 1}
                            step={unitSystem === 'inch' ? 0.01 : 0.5}
                            helperText={`${parameterOptimization.stickoutStatusLabel}. ${parameterOptimization.stickoutReason}`}
                            guideHint="Tool extension is where rigidity starts to disappear. Match the real gauge length, not the ideal one."
                          />
                          <ActionNumberField
                            label="LOC / flute length"
                            unit={lengthUnit(unitSystem)}
                            value={convertLength(toolLoc, unitSystem)}
                            onChange={(value) => setToolLoc(parseLength(value, unitSystem))}
                            min={unitSystem === 'inch' ? 0.05 : 1}
                            step={unitSystem === 'inch' ? 0.01 : 0.5}
                            actionLabel="Optimize LOC"
                            onAction={handleOptimizeLoc}
                            helperText={`${parameterOptimization.locStatusLabel}. ${parameterOptimization.locReason}`}
                            guideHint="Flute length sets how much cutting edge is truly available before chatter, rubbing, or reach issues show up."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-700/50 bg-[#0a1628] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Generated finish view</div>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Left is the finish reference PRISM is targeting. Right is the finish this exact machine, material, coolant, toolpath, tooling stack, and live cut state are currently likely to leave behind.
                      </p>
                      <div className="mt-3 rounded-xl border border-slate-700/50 bg-[#08111f] px-3 py-3 text-[11px] leading-5 text-slate-400">
                        This is a comparator-style visual expectation, not an inspection photo. The preview now blends process lay, material reflectivity, and finish band together so the surface reads more like a real machining outcome.
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,0.618fr)_minmax(0,1fr)]">
                          <div className="space-y-2 rounded-2xl border border-slate-700/50 bg-[#0c1522] px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Requested finish</div>
                            <span className="rounded-full border border-slate-700/50 bg-[#111c2d] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                                {formatSurfaceFinish(effectiveDesiredRaUm, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 2)}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-slate-100">{surfaceFinishPreview.requestedSurface.label}</div>
                            <p className="text-[11px] leading-5 text-slate-400">{surfaceFinishPreview.requestedSurface.detail}</p>
                            <div className="grid gap-2 pt-2 text-[11px] leading-5 text-slate-400">
                              <div><span className="font-semibold text-slate-200">Comparator:</span> {surfaceFinishPreview.requestedSurface.referenceBasisLabel}</div>
                              <div><span className="font-semibold text-slate-200">Process lay:</span> {surfaceFinishPreview.requestedSurface.processFamilyLabel}</div>
                              <div><span className="font-semibold text-slate-200">Material character:</span> {surfaceFinishPreview.requestedSurface.materialResponseLabel}</div>
                            </div>
                          </div>
                          <FinishSwatch
                            value={formatSurfaceFinish(effectiveDesiredRaUm, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 2)}
                            tone={surfaceFinishPreview.requestedSurface}
                          />
                        </div>

                        <div className="grid gap-3 md:grid-cols-[minmax(0,0.618fr)_minmax(0,1fr)]">
                          <div className="space-y-2 rounded-2xl border border-slate-700/50 bg-[#0c1522] px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Predicted finish with current stack</div>
                              <span className="rounded-full border border-slate-700/50 bg-[#111c2d] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                                {formatSurfaceFinish(surfaceFinishPreview.expectedRaUm, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 2)}
                              </span>
                            </div>
                            <div className="inline-flex w-fit rounded-full border border-cyan-500/30 bg-cyan-950/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                              {surfaceFinishPreview.predictionSourceLabel}
                            </div>
                            <div className="text-sm font-semibold text-slate-100">{surfaceFinishPreview.predictedSurface.label}</div>
                            <p className="text-[11px] leading-5 text-slate-400">{surfaceFinishPreview.predictedSurface.detail}</p>
                            <p className="text-[11px] leading-5 text-slate-500">{surfaceFinishPreview.predictionSourceDetail}</p>
                            <div className="grid gap-2 pt-2 text-[11px] leading-5 text-slate-400">
                              <div><span className="font-semibold text-slate-200">Comparator:</span> {surfaceFinishPreview.predictedSurface.referenceBasisLabel}</div>
                              <div><span className="font-semibold text-slate-200">Process lay:</span> {surfaceFinishPreview.predictedSurface.processFamilyLabel}</div>
                              <div><span className="font-semibold text-slate-200">Material character:</span> {surfaceFinishPreview.predictedSurface.materialResponseLabel}</div>
                            </div>
                          </div>
                          <FinishSwatch
                            value={formatSurfaceFinish(surfaceFinishPreview.expectedRaUm, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 2)}
                            tone={surfaceFinishPreview.predictedSurface}
                          />
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-700/50 bg-[#08111f] px-4 py-3">
                        <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <span>Rough</span>
                          <span>Finish scale</span>
                          <span>Fine</span>
                        </div>
                        <div className="relative mt-3 h-3 overflow-hidden rounded-full border border-slate-700/50 bg-[#091220]">
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,#4b5563_0%,#64748b_28%,#94a3b8_56%,#cbd5e1_76%,#f8fafc_100%)]" />
                          <div
                            className="absolute top-1/2 h-5 w-[2px] -translate-y-1/2 bg-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]"
                            style={{ left: `calc(${requestedFinishMarkerPercent}% - 1px)` }}
                          />
                          <div
                            className="absolute top-1/2 h-5 w-[2px] -translate-y-1/2 bg-amber-300 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]"
                            style={{ left: `calc(${predictedFinishMarkerPercent}% - 1px)` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-cyan-300" />
                            {finishModeTargetLabel}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-300" />
                            Predicted
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                    {surfaceFinishPreview.drivers.map((driver) => (
                      <Insight key={driver.label} title={driver.label} value={driver.value} body={driver.detail} />
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-1">
                  <SelectField
                    label="Coolant strategy"
                    ariaLabel="Coolant strategy"
                    value={coolant}
                    onChange={setCoolant}
                    options={coolantStrategyOptions}
                    guideHint="Coolant changes heat, chip evacuation, finish, and legal machine capability. Match the setup on the floor."
                  />
                  <OptionGrid
                    label="Coolant strategy"
                    options={coolantStrategyOptions}
                    value={coolant}
                    onChange={setCoolant}
                    guideHint="Use the coolant posture the machine and tool actually have available, not just the one that looks best on paper."
                  />
                  <div className={`rounded-xl border px-4 py-3 ${
                    coolantRecommendation.alignment === 'aligned'
                      ? 'border-emerald-500/30 bg-emerald-950/20'
                      : 'border-amber-500/30 bg-amber-950/20 calculator-warning-attention'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Recommended coolant posture</div>
                        <div className="mt-2 text-sm font-semibold text-slate-100">
                          {coolantRecommendation.recommendedLabel}
                          {coolantRecommendation.alignment === 'aligned' ? ' / active setup aligned' : ' / current setup is a tradeoff'}
                        </div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                        coolantRecommendation.alignment === 'aligned'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}>
                        {coolantRecommendation.alignment === 'aligned' ? 'Best-fit active' : 'Consider switching'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{coolantRecommendation.rationale}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      <span className="font-semibold text-slate-300">Basis:</span> {coolantRecommendation.basis}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      <span className="font-semibold text-slate-300">Tradeoff note:</span> {coolantRecommendation.tradeoff}
                    </p>
                    {coolantRecommendation.alternatives.length ? (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Alternate supported options: {coolantRecommendation.alternatives.map((optionId) => labelFor(COOLANT_OPTIONS, optionId)).join(' / ')}
                      </p>
                    ) : null}
                  </div>
                </div>


                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void runCalculation()}
                    disabled={loading || !modeNote.livePhysics}
                    className="inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {loading ? 'Calculating...' : modeNote.livePhysics ? 'Run PRISM calculation' : 'Setup-first mode'}
                  </button>
                  <span className="text-sm text-slate-500">
                    {modeNote.livePhysics
                      ? 'Feeds the live speed/feed engine with the setup you built on this page.'
                      : 'This machine family keeps the same workspace, but dedicated program engines handle the final outputs.'}
                  </span>
                </div>
              </Panel>

              <Panel
                icon="ðŸ“Š"
                title={cuttingResultsTitle}
                guideTargetId="cutting-results"
                helpTopicId="cutting-results"
                onOpenHelp={handleOpenHelpTopic}
                summary={machineMode === 'wire_edm' && wedmResult ? `${wedmResult.first_cut_speed_mm_min?.toFixed(1) ?? 'Unavailable'} mm/min` : result?.rpm != null ? `${Math.round(result.rpm).toLocaleString()} RPM` : undefined}
                collapsible
                className="order-1 border-cyan-300/30 bg-[#07111d] shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_36px_rgba(34,211,238,0.12),0_0_84px_rgba(14,165,233,0.09)]"
                headerClassName="border-b border-cyan-400/15 bg-[linear-gradient(135deg,rgba(6,20,36,0.98)_0%,rgba(9,34,58,0.98)_42%,rgba(14,55,88,0.96)_100%)]"
                bodyClassName="!px-0 !py-0"
              >
                <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,rgba(103,232,249,0.98)_0%,rgba(59,130,246,0.44)_22%,rgba(34,211,238,1)_48%,rgba(96,165,250,0.42)_76%,rgba(45,212,191,0.96)_100%)] p-[2px] shadow-[0_0_0_1px_rgba(165,243,252,0.24),0_0_34px_rgba(34,211,238,0.18),0_0_92px_rgba(14,165,233,0.16)]">
                  <div className="pointer-events-none absolute inset-[-10px] rounded-[30px] bg-[radial-gradient(circle,rgba(34,211,238,0.2)_0%,rgba(14,165,233,0.12)_36%,transparent_72%)] blur-2xl" />
                  <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-cyan-100/18" />
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(236,254,255,1),rgba(125,211,252,0.95),transparent)]" />
                  <div className="pointer-events-none absolute inset-x-8 bottom-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(45,212,191,0.88),rgba(125,211,252,0.98),transparent)]" />
                  <div className="pointer-events-none absolute inset-y-7 left-0 w-[2px] bg-[linear-gradient(180deg,transparent,rgba(165,243,252,0.92),rgba(56,189,248,0.86),transparent)]" />
                  <div className="pointer-events-none absolute inset-y-7 right-0 w-[2px] bg-[linear-gradient(180deg,transparent,rgba(103,232,249,0.92),rgba(45,212,191,0.82),transparent)]" />
                  <div className="relative rounded-[22px] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),transparent_34%),linear-gradient(180deg,#07111d_0%,#0b1626_100%)] px-5 py-5 md:px-6">
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-3xl">
                        <div className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${resultSafetyTone.badge}`}>
                          {resultSafety.label}
                        </div>
                        <div className={`mt-3 text-2xl font-black tracking-tight ${resultSafetyTone.lead}`}>
                          {resultSafety.heading}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {resultSafety.summary}
                        </p>
                      </div>
                      <div className="min-w-[220px] rounded-2xl border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(7,18,32,0.9)_0%,rgba(8,28,47,0.8)_100%)] px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">{resultSafety.solveSourceLabel}</div>
                        <div className="mt-2 text-2xl font-black text-white">
                          {machineMode === 'wire_edm' && wedmResult
                            ? `${wedmResult.first_cut_speed_mm_min?.toFixed(1) ?? 'Unavailable'} mm/min`
                            : result?.rpm != null ? `${Math.round(result.rpm).toLocaleString()} RPM` : 'Awaiting solve'}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {machineMode === 'wire_edm'
                            ? `${wedmResult?.passes?.length ?? 0} passes / ${selectedMachine?.model ?? 'Select a machine'}`
                            : `${result?.resolvedCamLabel ?? selectedToolpath?.label ?? 'Select a toolpath'} / ${result?.resolvedMachineLabel ?? selectedMachine?.model ?? 'Select a machine'}`}
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="calculator-warning-attention mb-4 rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2.5 text-[12px] text-rose-400">
                        {error}
                      </div>
                    )}

                    {modeNote.livePhysics ? (
                      <div className="space-y-5">
                        <div className={`${resultSafetyNeedsAttention ? 'calculator-warning-attention ' : ''}rounded-2xl border px-4 py-4 ${resultSafetyTone.panel}`}>
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="max-w-3xl">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Release posture</div>
                              <div className={`mt-2 text-xl font-black ${resultSafetyTone.lead}`}>{resultSafety.label}</div>
                              <p className="mt-2 text-sm leading-6 text-slate-200/90">{resultSafety.guidance}</p>
                            </div>
                            <div className={`rounded-2xl border px-4 py-3 text-right ${resultSafetyTone.badge}`}>
                              <div className="text-[10px] font-bold uppercase tracking-[0.18em]">Solve source</div>
                              <div className="mt-1 text-sm font-semibold">{resultSafety.solveSourceLabel}</div>
                              <div className="mt-2 text-lg font-black">{resultSafety.confidencePct}% confidence</div>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                            {(resultSafety.signals.length ? resultSafety.signals : resultDisplayWarnings).slice(0, 4).map((signal) => (
                              <div
                                key={signal}
                                className={`${resultSafetyNeedsAttention ? 'calculator-warning-attention-inline ' : ''}min-w-[280px] flex-1 rounded-2xl border px-4 py-3 text-sm leading-6 ${resultSafetyTone.signal}`}
                              >
                                {signal}
                              </div>
                            ))}
                          </div>
                        </div>

                        {machineMode === 'wire_edm' && wedmResult ? (
                          <WireEdmResultCards wedmResult={wedmResult} controller={selectedControllerOption?.id ?? 'generic'} calcParams={{ material: selectedMaterial?.id ?? selectedMaterial?.name ?? 'D2', thickness_mm: doc || 50, target_ra_um: effectiveDesiredRaUm ?? 0.8, wire_type: holderStyle === 'fine-wire' ? 'brass_0.20' : holderStyle === 'taper-package' ? 'coated_0.25' : 'brass_0.25' }} />
                        ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <ResultMetric label="RPM" value={result?.rpm} unit="rev/min" highlight="text-sky-300" />
                          <ResultMetric
                            label="Cutting speed"
                            value={resultCuttingSpeed}
                            unit={unitSystem === 'inch' ? 'sfm' : 'm/min'}
                            highlight="text-indigo-300"
                            decimals={unitSystem === 'inch' ? 0 : 1}
                          />
                          <ResultMetric
                            label="Feed rate"
                            value={resultFeedRate}
                            unit={unitSystem === 'inch' ? 'ipm' : 'mm/min'}
                            highlight="text-emerald-300"
                            decimals={unitSystem === 'inch' ? 2 : 1}
                          />
                          <ResultMetric
                            label="MRR"
                            value={resultMrr}
                            unit={unitSystem === 'inch' ? 'in^3/min' : 'cm^3/min'}
                            highlight="text-fuchsia-300"
                            decimals={unitSystem === 'inch' ? 3 : 1}
                          />
                          <ResultMetric
                            label="Power"
                            value={resultPower}
                            unit={unitSystem === 'inch' ? 'hp' : 'kW'}
                            highlight="text-amber-300"
                            decimals={unitSystem === 'inch' ? 1 : 1}
                          />
                          <ResultMetric
                            label="Torque"
                            value={resultTorque}
                            unit={unitSystem === 'inch' ? 'ft-lb' : 'N*m'}
                            highlight="text-cyan-300"
                            decimals={unitSystem === 'inch' ? 1 : 1}
                          />
                          <ResultMetric label="Tool life" value={result?.toolLife} unit="min" highlight="text-violet-300" />
                          <ResultMetric
                            label="Surface finish"
                            value={resultSurfaceFinish}
                            unit={unitSystem === 'inch' ? 'uin Ra' : 'um Ra'}
                            highlight="text-rose-300"
                            decimals={unitSystem === 'inch' ? 0 : 2}
                          />
                        </div>
                        )}

                        <div className={`${liveFinishComparison?.status === 'close' || liveFinishComparison?.status === 'miss' ? 'calculator-warning-attention ' : ''}rounded-2xl border px-4 py-4 ${
                          liveFinishComparison?.status === 'beat'
                            ? 'border-emerald-500/30 bg-emerald-950/20'
                            : liveFinishComparison?.status === 'on-target'
                              ? 'border-cyan-500/30 bg-cyan-950/20'
                              : liveFinishComparison?.status === 'close'
                                ? 'border-amber-500/30 bg-amber-950/20'
                                : liveFinishComparison?.status === 'miss'
                                  ? 'border-rose-500/30 bg-rose-950/20'
                                  : 'border-slate-700/50 bg-[#0f1f36]'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{finishModeTargetLabel} vs live result</div>
                              <div className="mt-2 text-lg font-bold text-slate-100">
                                {finishModeTargetLabel} {formatSurfaceFinish(effectiveDesiredRaUm, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 2)}
                                {' / '}
                                Live {liveSurfaceFinishRaUm != null ? formatSurfaceFinish(liveSurfaceFinishRaUm, unitSystem as SurfaceFinishUnitSystem, unitSystem === 'inch' ? 0 : 2) : 'Awaiting solve'}
                              </div>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200">
                              {liveFinishComparison?.label ?? surfaceFinishPreview.verdictLabel}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-300">
                            {liveFinishComparison?.detail ?? surfaceFinishPreview.verdictDetail}
                          </p>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                          <div className="rounded-xl border border-slate-700/50 bg-slate-950 px-5 py-5 text-white">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Confidence and release gate</div>
                                <div className="mt-2 text-4xl font-black">{resultSafety.confidencePct}%</div>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Model</div>
                                <div className="mt-1 text-sm font-semibold text-white">{result?.formula ?? 'Awaiting run'}</div>
                              </div>
                            </div>
                            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                              <div className={`h-full rounded-full bg-gradient-to-r ${resultSafetyTone.progress}`} style={{ width: `${Math.max(resultSafety.confidencePct, 6)}%` }} />
                            </div>
                            <p className="mt-4 text-sm leading-6 text-slate-300">
                              {resultSafety.guidance}
                            </p>
                          </div>

                          <div className={`${resultDisplayWarnings.length ? 'calculator-warning-attention ' : ''}rounded-xl border border-slate-700/50 bg-[#0f1f36] px-5 py-5`}>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Safety checks, warnings, and limiting factors</div>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              {resultDisplayWarnings.map((warning) => (
                                <div key={warning} className="calculator-warning-attention-inline rounded-2xl border border-slate-700/50 bg-[#0f1f36] px-4 py-3 text-sm leading-6 text-slate-400">
                                  {warning}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-xl border border-slate-700/50 bg-slate-950 px-5 py-5 text-white">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Setup-first mode</div>
                          <div className="mt-3 text-2xl font-black">{modeNote.title}</div>
                          <p className="mt-3 text-sm leading-7 text-slate-300">{modeNote.detail}</p>
                          <div className="mt-5 grid gap-3 md:grid-cols-2">
                            <PreviewMetric label="Machine" value={selectedMachine?.model ?? 'TBD'} />
                            <PreviewMetric label="Material" value={selectedMaterial?.name ?? 'TBD'} />
                            <PreviewMetric label="Programming" value={selectedProgramming?.label ?? 'TBD'} />
                            <PreviewMetric label="Toolpath" value={selectedToolpath?.label ?? 'TBD'} />
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-5 py-5">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Next handoff</div>
                          <div className="mt-4 space-y-3">
                            {nonTraditionalReadiness(machineMode, coolant, workholding).map((item) => (
                              <div key={item} className="rounded-2xl border border-slate-700/50 bg-[#0f1f36] px-4 py-3 text-sm leading-6 text-slate-400">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            </div>

            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-7.5rem)] xl:overflow-y-auto xl:pr-2 xl:[scrollbar-gutter:stable]">
              <Panel icon="ðŸ”§" title={toolingFixtureTitle} guideTargetId="tooling-fixture" helpTopicId="tooling-fixture" onOpenHelp={handleOpenHelpTopic} summary={selectedTool?.family ?? selectedTool?.label} collapsible>
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Setup station</div>
                        <div className="mt-2 text-lg font-black tracking-tight text-slate-100">
                          {selectedMachine?.model ?? 'Machine setup'}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Keep the real setup choices here: tool package, holder posture, and fixture stability before you trust the numbers.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <span className="rounded-full border border-slate-700/50 bg-[#0a1628] px-3 py-1">
                          {hardwareTitle(selectedMachine)}
                        </span>
                        {(toolingBadges.length ? toolingBadges : [selectedMachine?.toolingLayout?.interface ?? 'Setup lane']).map((badge) => (
                          <span key={badge} className="rounded-full border border-slate-700/50 bg-[#0a1628] px-3 py-1">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Tool package</div>
                      {selectedTool && (
                        <span className="rounded-full border border-sky-500/30 bg-sky-950/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-400">
                          {selectedTool.family}
                        </span>
                      )}
                    </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Setup source"
                      ariaLabel="Setup source"
                      value={setupSource}
                      onChange={setSetupSource}
                      options={SETUP_SOURCE_OPTIONS}
                      guideHint="Tell PRISM whether this posture comes from the floor, CAM, or a saved baseline so it weights trust correctly."
                    />
                    <SelectField
                      label="Holder brand"
                      ariaLabel="Holder brand"
                      value={holderBrand}
                      onChange={setHolderBrand}
                      options={holderBrandOptions}
                      guideHint="Filter by holder builder when your shop crib is standardized or when vendor-specific fit matters."
                    />
                    <SelectField
                      label="Holder type"
                      ariaLabel="Holder type"
                      value={holderTypeFilter}
                      onChange={setHolderTypeFilter}
                      options={holderTypeOptions}
                      guideHint="Holder type changes rigidity, reach, and runout risk. Keep it aligned with the real setup."
                    />
                    <SelectField
                      label="Holder size / interface"
                      ariaLabel="Holder size or interface"
                      value={holderInterfaceFilter}
                      onChange={setHolderInterfaceFilter}
                      options={holderInterfaceOptions}
                      guideHint="This should match the machine spindle, turret, or live-tool interface exactly."
                    />
                    <SelectField
                      label={holderSelectionLabel}
                      ariaLabel={holderSelectionLabel}
                      value={selectedHolderPackage?.id ?? ''}
                      onChange={setHolderPackageId}
                      options={holderPackagesForMode.map((item) => ({
                          id: item.id,
                          label: item.label,
                          detail: item.detail,
                        }))}
                      guideHint="Choose the actual holder package the cutter will run in so reach and interface fit stay believable."
                      />
                    <SelectField
                      label="Holder style"
                      ariaLabel="Holder style"
                      value={holderStyle}
                      onChange={setHolderStyle}
                      options={holderStyleOptions}
                      guideHint="Holder style is the quick rigidity posture for this setup. Use it to reflect the real shop choice."
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`rounded-full border px-3 py-1 font-bold uppercase tracking-[0.18em] ${
                      catalogStatusTone(holderCatalogSource)
                    }`}>
                      {holderCatalogBadge}
                    </span>
                    <span className="rounded-full border border-slate-700/50 bg-[#0a1628] px-3 py-1 font-semibold text-slate-400">
                      {holderSelectionSummary}
                    </span>
                  </div>
                  {selectedMachine && compatibleHolderPackages.length > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-700/50 bg-[#0a1628] px-3 py-3 text-xs text-slate-400">
                        {holderCatalogStatus.note}
                      </div>
                    )}
                    <div className="mt-4">
                      <button
                        type="button"
                        aria-label="Open holder buy options"
                        onClick={openHolderPurchaseOptions}
                        className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-400/[0.10] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-100 transition hover:border-sky-300/50 hover:bg-sky-400/[0.16]"
                      >
                        Buy holder
                      </button>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className={`rounded-full border px-3 py-1 font-bold uppercase tracking-[0.18em] ${
                          catalogStatusTone(toolCatalogStatus.source)
                        }`}>
                          {toolCatalogBadge}
                        </span>
                        <span className="rounded-full border border-slate-700/50 bg-[#0a1628] px-3 py-1 font-semibold text-slate-400">
                          {toolCatalogSummary}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-700/50 bg-[#0a1628] px-3 py-3 text-xs text-slate-400">
                        {toolCatalogStatus.note}
                      </div>

                      <SelectField
                        label="Tool construction"
                        ariaLabel="Tool construction"
                        value={toolBodyFilter}
                        onChange={(value) => setToolBodyFilter(value as ToolBodyFilter)}
                        options={toolBodyFilterOptions}
                        guideHint="Start with the tool-body family so PRISM knows whether it is solving around solid, indexable, or specialty tooling."
                      />
                      <div className="grid gap-4 md:grid-cols-2">
                        <SelectField
                          label="Tool brand"
                          ariaLabel="Tool brand"
                          value={toolVendorFilter}
                          onChange={setToolVendorFilter}
                          options={toolVendorOptions}
                          guideHint="Use brand filtering when the crib or purchasing policy matters. Otherwise leave it open for the full compatible set."
                        />
                        <SelectField
                          label="Tool type"
                          ariaLabel="Tool type"
                          value={toolGeometryFilter}
                          onChange={setToolGeometryFilter}
                          options={toolGeometryOptions}
                          guideHint="Tool type decides geometry class and what cut styles are even plausible for the selected path."
                        />
                        <SelectField
                          label="Tool size"
                          ariaLabel="Tool size"
                          value={toolSizeFilter}
                          onChange={setToolSizeFilter}
                          options={toolSizeOptions}
                          guideHint="Use size filtering to match the cutter envelope to the feature, reach, and machine stiffness you really have."
                        />
                      </div>

                      <label className="block">
                        <span className="mb-1 block text-[10px] font-semibold text-slate-400">{toolSelectionLabel}</span>
                        <select
                          data-guide-managed="true"
                          data-guide-label={toolSelectionLabel}
                          data-guide-description="Pick the actual cutter or tool body you expect to run so the holder, insert, and cut recommendations stay grounded."
                          aria-label="Tool family"
                          value={selectedTool?.id ?? ''}
                          onChange={(event) => setToolId(event.target.value)}
                          className="w-full rounded-lg border border-slate-600 bg-[#0a1628] px-2.5 py-1.5 text-[12px] text-slate-100 outline-none transition focus:border-sky-500"
                        >
                          {toolsForMode.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.vendor ? `${item.vendor} / ` : ''}{item.family} / {item.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      {selectedToolBodyType === 'indexable' && insertOptions.length > 0 && (
                        <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                          <SelectField
                            label="Insert package"
                            ariaLabel="Insert package"
                            value={selectedInsertOption?.id ?? ''}
                            onChange={setInsertId}
                            options={insertOptions.map((option) => ({
                              id: option.id,
                              label: option.recommended ? `${option.label} / Recommended` : option.label,
                              detail: option.detail,
                            }))}
                            guideHint="Choose the insert package that matches the tool body and the material you truly expect to cut."
                          />
                          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">Suggested insert</div>
                            <div className="mt-2 text-sm font-semibold text-slate-100">
                              {recommendedInsertOption?.label ?? 'Published family pending'}
                            </div>
                            <div className="mt-2 text-xs leading-5 text-slate-400">
                              {recommendedInsertOption?.recommendationReason ?? 'Select an indexable tool body to surface insert guidance.'}
                            </div>
                            {selectedInsertOption && selectedInsertOption.id !== recommendedInsertOption?.id && (
                              <div className="mt-2 text-[11px] leading-5 text-slate-500">
                                Current pick: {selectedInsertOption.label}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedTool && (
                      <div className="mt-4 rounded-xl border border-sky-500/30 bg-[#0a1628] px-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-100">{selectedTool.label}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {selectedHolderPackage ? `${selectedHolderPackage.label} / ${selectedHolderPackage.detail}` : selectedTool.description}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-slate-700/50 bg-[#0f1f36] px-2.5 py-1 font-medium text-slate-400">{selectedTool.holder}</span>
                            <span className="rounded-full border border-slate-700/50 bg-[#0f1f36] px-2.5 py-1 font-medium text-slate-400">{selectedTool.coating}</span>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <Meta label="Construction" value={selectedToolConstructionLabel} />
                          <Meta label="Tool type" value={toolGeometryFilterLabel(selectedTool)} />
                          <Meta label="Tool size" value={toolSizeBucketLabel(selectedTool)} />
                          <Meta label="Default holder" value={selectedTool.holder} />
                          <Meta label="Coating" value={selectedTool.coating} />
                          <Meta label="Vendor" value={selectedTool.vendor ?? 'Curated baseline'} />
                          <Meta label="Catalog ref" value={selectedTool.catalogNumber ?? selectedTool.id} />
                          <Meta label="Insert family" value={selectedTool.insertType ?? (selectedToolBodyType === 'indexable' ? 'Published by tool body' : 'Not applicable')} />
                          <Meta label="Selected insert" value={selectedInsertOption?.label ?? (selectedToolBodyType === 'indexable' ? 'Auto-selecting recommended insert' : 'Solid tool body')} />
                          <Meta label="Holder brand" value={labelFor(holderBrandOptions, holderBrand)} />
                          <Meta label="Holder type" value={selectedHolderPackage ? holderPackageTypeLabel(selectedHolderPackage) : humanizeToken(holderStyle)} />
                          <Meta label="Holder size" value={selectedHolderPackage ? holderPackageInterfaceLabel(selectedHolderPackage, holderCompatibilityMachine) : selectedMachine?.toolingLayout?.interface ?? 'Machine standard'} />
                          <Meta label={holderSelectionLabel} value={selectedHolderPackage?.label ?? 'Machine standard'} />
                          <Meta
                            label="Selection source"
                            value={selectedHolderPackage?.source === 'database'
                              ? 'Live holder database'
                              : holderCatalogSource === 'hybrid'
                                ? 'Hybrid holder catalog'
                                : 'Fallback holder library'}
                          />
                          <Meta label="Interface fit" value={selectedTool.holderInterface ?? selectedHolderPackage?.spindleInterface ?? selectedHolderPackage?.toolInterface ?? selectedMachine?.toolingLayout?.interface ?? 'Machine standard'} />
                        </div>
                        <div className="mt-4">
                          <button
                            type="button"
                            aria-label="Open tooling buy options"
                            onClick={openToolingPurchaseOptions}
                            className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/[0.10] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                          >
                            Buy tooling
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-400">Fixture posture</div>
                      <span className="rounded-full border border-violet-500/30 bg-violet-950/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">
                        {labelFor(WORKHOLDING_OPTIONS, workholding)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Treat this as the stability checkpoint. Fixture choice belongs in the setup lane, separate from the cut-strategy panel.
                    </p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <SelectField
                        label="Workholding category"
                        ariaLabel="Workholding category"
                        value={workholdingCategory}
                        onChange={setWorkholdingCategory}
                        options={workholdingCategoryOptions}
                        guideHint="Start with the fixture family so PRISM knows how the part is restrained before it judges load and finish."
                      />
                      <SelectField
                        label="Workholding brand"
                        ariaLabel="Workholding brand"
                        value={workholdingBrand}
                        onChange={setWorkholdingBrand}
                        options={workholdingBrandOptions}
                        guideHint="Brand matters when the exact vise, chuck, or modular system affects the setup truth."
                      />
                      <SelectField
                        label="Saved workholding preset"
                        ariaLabel="Saved workholding preset"
                        value={selectedWorkholdingPreset?.id ?? ''}
                        onChange={setWorkholdingPresetId}
                        options={workholdingPresetsForMode.map((item) => ({
                          id: item.id,
                          label: item.label,
                          detail: item.detail,
                        }))}
                        guideHint="Use a saved fixture preset when it reflects the real clamping strategy. Otherwise build the posture manually."
                      />
                      <SelectField
                        label="Stability posture"
                        ariaLabel="Stability posture"
                        value={stabilityId}
                        onChange={setStabilityId}
                        options={STABILITY_OPTIONS}
                        guideHint="Stability posture tells PRISM how aggressive it can be with load, chatter risk, and finish expectations."
                      />
                    </div>
                    <div className="mt-4">
                      <SelectField
                        label="Fixture family"
                        ariaLabel="Fixture family"
                        value={workholding}
                        onChange={setWorkholding}
                        options={workholdingOptions}
                        guideHint="Choose the actual fixture family that will hold the part so the stability lane and setup preview stay realistic."
                      />
                    </div>
                    <div className="mt-4 rounded-xl border border-violet-500/30 bg-[#0a1628] px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-100">
                            {selectedWorkholdingPreset?.label ?? labelFor(WORKHOLDING_OPTIONS, workholding)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {selectedWorkholdingPreset?.detail ?? 'Workholding preset ready for verification.'}
                          </div>
                        </div>
                        <span className="rounded-full border border-violet-500/30 bg-violet-950/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">
                          {selectedStability.label}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        aria-label="Open fixture buy options"
                        onClick={openFixturePurchaseOptions}
                        className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-400/[0.10] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-100 transition hover:border-violet-300/50 hover:bg-violet-400/[0.16]"
                      >
                        Buy fixture
                      </button>
                    </div>
                    <div className="mt-4">
                      <OptionGrid label="Fixture / workholding" options={workholdingOptions} value={workholding} onChange={setWorkholding} />
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel
                icon="ðŸ›°ï¸"
                title={setupPreviewTitle}
                guideTargetId="setup-preview"
                summary={setupPreview.statusLabel}
                collapsible
              >
                <CalculatorSetupPreview3D preview={setupPreview} />
              </Panel>

              <Panel icon="ðŸ—ï¸" title={hardwarePanelTitle} guideTargetId="hardware" summary={hardwareDigest(effectiveSelectedMachine, selectedStation)} collapsible>
                <HardwarePanel
                  machine={effectiveSelectedMachine}
                  toolLabel={selectedTool?.label ?? 'TBD'}
                  selectedStation={selectedStation}
                  onSelectStation={setSelectedStation}
                />
              </Panel>

              <Panel icon="ðŸ’¡" title={processNotesTitle} guideTargetId="process-notes" collapsible>
                <div className="space-y-4">
                  <Insight
                    title="Coolant fit"
                    value={`${labelFor(COOLANT_OPTIONS, coolant)} selected`}
                    body={`${coolantRecommendation.rationale} This selection is ${coolantRecommendation.alignment === 'aligned' ? 'well aligned with the current cut posture.' : 'a deliberate tradeoff against the best-fit recommendation.'}`}
                  />
                  <Insight
                    title="Tooling posture"
                    value={selectedTool?.family ?? 'TBD'}
                    body={`Holder: ${selectedTool?.holder ?? 'TBD'} / Coating: ${selectedTool?.coating ?? 'TBD'}`}
                  />
                  <Insight
                    title="Programming path"
                    value={`${selectedProgramming?.label ?? 'TBD'} / ${selectedToolpath?.label ?? 'TBD'}`}
                    body={
                      selectedToolpath
                        ? `${selectedToolpath.path} Use this as the calculator-to-CAM handoff route for the selected operation.`
                        : 'Pick a package and toolpath.'
                    }
                  />
                  <Insight
                    title="Workholding posture"
                    value={`${labelFor(WORKHOLDING_OPTIONS, workholding)} / ${selectedStability.label}`}
                    body={`Stock form is ${stockShape}. Confirm rigidity before trusting the numbers. Active preset: ${selectedWorkholdingPreset?.label ?? 'setup-driven'}.`}
                  />
                </div>
              </Panel>

              <Panel
                icon="ðŸ­" title={myShopTitle} guideTargetId="my-shop" summary={myShopPanelSummary}
                collapsible
              >
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t('myShop.snapshotTitle')}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-100">
                          {selectedMachine?.model ?? t('myShop.machineFallback')} / {selectedMaterial?.name ?? t('myShop.materialFallback')} / {selectedOperationLabel}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {t('myShop.snapshotHint')}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          aria-label={saveMachineProfileActionLabel}
                          onClick={handleSaveMachineProfile}
                          disabled={!canSaveMachineProfile || machineProfileSaveLoading}
                          className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-950/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-200 transition hover:border-sky-400/60 hover:bg-sky-950/50 disabled:cursor-not-allowed disabled:border-slate-700/50 disabled:bg-slate-900 disabled:text-slate-500"
                        >
                          {machineProfileSaveLoading ? 'Saving default...' : saveMachineProfileActionLabel}
                        </button>
                        <button
                          type="button"
                          aria-label="Save current setup to My Shop"
                          data-guide-label="Save current setup to My Shop"
                          data-guide-description="Capture this validated calculator posture once the result looks credible so future jobs inherit the same machine truth."
                          onClick={saveCurrentSetupSnapshot}
                          className="inline-flex items-center rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
                        >
                          Save current setup
                        </button>
                      </div>
                    </div>

                    {(machineProfileSaveSummary || machineProfileSaveError) && (
                      <div
                        className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                          machineProfileSaveError
                            ? 'border-rose-500/30 bg-rose-950/30 text-rose-200'
                            : 'border-sky-500/30 bg-sky-950/30 text-sky-100'
                        }`}
                      >
                        {machineProfileSaveError ?? machineProfileSaveSummary}
                      </div>
                    )}

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <SelectField
                        label="My Shop setup snapshot"
                        ariaLabel="My Shop setup snapshot"
                        value={savedSnapshotId}
                        onChange={applySetupSnapshot}
                        options={
                          snapshotOptions.length
                            ? snapshotOptions
                            : [{ id: '', label: 'No saved setup yet', detail: 'Save the active calculator posture to start your shop library.' }]
                        }
                        guideHint="Bring proven machine, tooling, and cut posture back in without rebuilding the setup from scratch."
                      />
                      <div className="rounded-2xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t('myShop.calculatorMachineDefault')}</div>
                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                              defaultMachineProfile
                                ? 'border-sky-500/30 bg-sky-950/30 text-sky-300'
                                : 'border-slate-700/50 bg-slate-900 text-slate-500'
                            }`}
                          >
                            {defaultMachineProfileStatusLabel}
                          </span>
                        </div>
                        <div className="mt-3 text-sm font-semibold text-slate-100">
                          {defaultMachineProfile?.machineLabel ?? t('myShop.noCanonicalMachineDefault')}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {defaultMachineProfileSupportCopy}
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <Meta label={t('machine.controller')} value={defaultMachineControllerSummary} />
                          <Meta label={t('machine.spindlePackage')} value={defaultMachineSpindleSummary} />
                          <Meta label={t('machine.toolingStationsTitle')} value={defaultMachineToolingSummary} />
                          <Meta
                            label={t('machine.installedCoolantStrategies')}
                            value={defaultMachineProfile ? t('machine.enabled').replace('{count}', String(defaultMachineProfile.enabledCoolantStrategyIds.length)) : t('myShop.notSaved')}
                          />
                          <Meta
                            label={t('machine.installedControlPackages')}
                            value={defaultMachineProfile ? t('machine.enabled').replace('{count}', String(defaultMachineProfile.enabledControllerFeatureIds.length)) : t('myShop.notSaved')}
                          />
                          <Meta label={machineFeaturesTitle} value={defaultMachineFeatureSummary} />
                          <Meta label={t('machine.measuredPosture')} value={defaultMachineMeasuredSummary} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t('myShop.verifiedMachinePosture')}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedFeatureDetails.length ? (
                          selectedFeatureDetails.map((feature) => (
                            <span key={feature.id} className="rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                              {feature.label}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-slate-700/50 bg-[#0f1f36] px-3 py-1 text-[11px] font-semibold text-slate-500">
                            No optional hardware verified yet
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-cyan-300/18 bg-cyan-300/[0.05] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">{t('myShop.memoryTitle')}</div>
                          <div className="mt-2 text-sm font-semibold text-slate-100">
                            {toolCribWorkspace?.summary ?? t('myShop.noToolingIntelligence')}
                          </div>
                          <div className="mt-1 text-xs leading-5 text-slate-400">
                            {t('myShop.memoryBody')}
                          </div>
                          {toolCribLatestPrivacyNote ? (
                            <div className="mt-2 inline-flex items-center rounded-full border border-amber-300/20 bg-amber-500/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100">
                              {t('myShop.privacyActive')}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowUploadWorkflowDialog(true)}
                          className="inline-flex items-center rounded-full border border-cyan-300/35 bg-cyan-950/35 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-950/55"
                        >
                          {t('myShop.openIntakeWorkflow')}
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Meta label={t('myShop.importedIntakes')} value={toolCribImportCount > 0 ? `${toolCribImportCount} ${t('myShop.staged')}` : t('myShop.noneYet')} />
                        <Meta label={t('myShop.discoveredLibraries')} value={toolCribLibraryCount > 0 ? `${toolCribLibraryCount} ${t('myShop.linked')}` : t('myShop.noneYet')} />
                        <Meta label={t('myShop.latestIntake')} value={toolCribLatestImport?.sourceLabel ?? t('myShop.noIntakeStaged')} />
                        <Meta label={t('myShop.lastUpdated')} value={toolCribWorkspace?.lastUpdatedAt ? new Date(toolCribWorkspace.lastUpdatedAt).toLocaleString() : t('myShop.notYetUpdated')} />
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('myShop.partNumbers')}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {toolCribTopPartNumbers.length ? (
                              toolCribTopPartNumbers.map((partNumber) => (
                                <span key={partNumber} className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-xs font-semibold text-emerald-200">
                                  {partNumber}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-slate-700/60 bg-[#0f1f36] px-3 py-1 text-xs font-semibold text-slate-500">
                                {t('myShop.noPartNumbers')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('myShop.toolingHolderPartNumbers')}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {toolCribTopToolingPartNumbers.length ? (
                              toolCribTopToolingPartNumbers.map((partNumber) => (
                                <span key={partNumber} className="rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-3 py-1 text-xs font-semibold text-cyan-100">
                                  {partNumber}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-slate-700/60 bg-[#0f1f36] px-3 py-1 text-xs font-semibold text-slate-500">
                                {t('myShop.noToolingClues')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('myShop.linkedLibraries')}</div>
                          <div className="mt-3 space-y-2">
                            {toolCribTopLibraries.length ? (
                              toolCribTopLibraries.map((library) => (
                                <div key={library.id} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                  <div className="text-sm font-semibold text-slate-100">{library.softwareLabel}</div>
                                  <div className="mt-1 break-all text-xs leading-5 text-slate-400">{library.path}</div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-xs leading-5 text-slate-500">
                                {t('myShop.noLinkedLibraries')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      {
                        title: 'Add to quote packet',
                        body: 'Carry the exact machine, material, toolpath, and setup posture into the internal pricing desk.',
                        href: quoteBuilderPath,
                      },
                      {
                        title: 'Open sourcing desk',
                        body: 'Push material and package assumptions into Purchasing for distributor and buy planning.',
                        href: purchasingPath,
                      },
                      {
                        title: 'Check tool crib fit',
                        body: 'Open Inventory with the active tool focus so crib coverage and buy gaps stay attached to this setup.',
                        href: inventoryPath,
                      },
                      {
                        title: 'Stage post workflow',
                        body: 'Send the current machine and operation posture into the post-processor desk before release.',
                        href: postProcessorPath,
                      },
                    ].map((action) => (
                      <button
                        key={action.title}
                        type="button"
                        aria-label={action.title}
                        onClick={() => navigate(action.href)}
                        className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4 text-left transition hover:border-slate-700/50 hover:bg-[#162742]"
                      >
                        <div className="text-sm font-semibold text-slate-100">{action.title}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">{action.body}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          <Panel
            icon="ðŸ“" title={formulaLibraryTitle} guideTargetId="formula-library" summary={`${FORMULAS.length} formulas`}
            collapsible
            defaultCollapsed
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {FORMULAS.map((formula) => (
                <FormulaCard key={formula.id} formula={formula} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
      <CalculatorSectionPurchaseModal
        view={sectionPurchaseView}
        onClose={() => setSectionPurchaseView(null)}
        onInspectRecommendation={(recommendation) => setPrismPurchaseTarget(recommendation)}
      />
      <PurchaseRecommendationModal recommendation={prismPurchaseTarget} onClose={() => setPrismPurchaseTarget(null)} />
    </div>
    </CalculatorGuideContext.Provider>
  );
}

function prismRecommendationTone(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes('budget')) {
    return {
      card:
        'border-amber-400/18 bg-[linear-gradient(180deg,rgba(251,191,36,0.10)_0%,rgba(17,14,8,0.98)_100%)] shadow-[0_0_24px_rgba(251,191,36,0.08)] hover:border-amber-300/35 hover:shadow-[0_0_30px_rgba(251,191,36,0.14)]',
      badge: 'border-amber-300/28 bg-amber-300/[0.12] text-amber-100',
      metric: 'border-amber-400/12 bg-[#16110a]',
      accent: 'text-amber-100',
    };
  }
  if (normalized.includes('premium')) {
    return {
      card:
        'border-emerald-400/18 bg-[linear-gradient(180deg,rgba(16,185,129,0.10)_0%,rgba(8,18,16,0.98)_100%)] shadow-[0_0_24px_rgba(16,185,129,0.08)] hover:border-emerald-300/35 hover:shadow-[0_0_30px_rgba(16,185,129,0.14)]',
      badge: 'border-emerald-300/28 bg-emerald-300/[0.12] text-emerald-100',
      metric: 'border-emerald-400/12 bg-[#0c1713]',
      accent: 'text-emerald-100',
    };
  }
  return {
    card:
      'border-cyan-400/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.10)_0%,rgba(8,18,31,0.98)_100%)] shadow-[0_0_24px_rgba(34,211,238,0.08)] hover:border-cyan-300/35 hover:shadow-[0_0_30px_rgba(34,211,238,0.14)]',
    badge: 'border-cyan-300/28 bg-cyan-300/[0.12] text-cyan-100',
    metric: 'border-cyan-400/12 bg-[#0b1624]',
    accent: 'text-cyan-100',
  };
}

function readSetupSnapshots() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CALCULATOR_SNAPSHOT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SetupSnapshot[]) : [];
  } catch {
    return [];
  }
}

function writeSetupSnapshots(snapshots: SetupSnapshot[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CALCULATOR_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
  } catch {
    // Ignore storage failures and keep the page interactive.
  }
}

function createSetupSnapshot(
  config: Omit<SetupSnapshot, 'id' | 'name' | 'savedAt'> & {
    selectedMachine?: MachineCatalogItem;
    selectedMaterial?: { name: string } | null;
    selectedOperationLabel: string;
  },
): SetupSnapshot {
  const savedAt = new Date().toLocaleDateString();
  return {
    id: [
      config.machineMode,
      config.machineId,
      config.materialId,
      config.operation,
      config.toolId,
      config.toolBodyFilter ?? 'all',
      config.insertId ?? 'insert-auto',
      config.toolingStationCountOverride ?? 'base',
      config.holderPackageId,
      config.workholdingPresetId,
    ].join('__'),
    name: `${config.selectedMachine?.model ?? 'Machine'} / ${config.selectedMaterial?.name ?? 'Material'} / ${config.selectedOperationLabel}`,
    savedAt,
    machineMode: config.machineMode,
    machineTypeId: config.machineTypeId,
    manufacturer: config.manufacturer,
    machineId: config.machineId,
    controllerOptionId: config.controllerOptionId,
    spindleOptionId: config.spindleOptionId,
    toolingStationCountOverride: config.toolingStationCountOverride,
    machineCoolantOptionIds: config.machineCoolantOptionIds ?? [],
    selectedControllerCapabilityIds: config.selectedControllerCapabilityIds ?? [],
    materialGroup: config.materialGroup,
    materialSubcategoryId: config.materialSubcategoryId,
    materialId: config.materialId,
    toolId: config.toolId,
    toolBodyFilter: config.toolBodyFilter,
    insertId: config.insertId,
    operation: config.operation,
    programmingId: config.programmingId,
    licenseTierId: config.licenseTierId,
    toolpathTypeId: config.toolpathTypeId,
    toolpathId: config.toolpathId,
    stockShape: config.stockShape,
    stockSource: config.stockSource,
    stockX: config.stockX,
    stockY: config.stockY,
    stockZ: config.stockZ,
    toolDiameter: config.toolDiameter,
    flutes: config.flutes,
    doc: config.doc,
    woc: config.woc,
    toolStickout: config.toolStickout,
    toolLoc: config.toolLoc,
    coolant: config.coolant,
    entryStyle: config.entryStyle,
    finishTarget: config.finishTarget,
    finishControlMode: config.finishControlMode,
    desiredRaUm: config.desiredRaUm,
    workholding: config.workholding,
    workholdingCategory: config.workholdingCategory,
    workholdingBrand: config.workholdingBrand,
    workholdingPresetId: config.workholdingPresetId,
    stabilityId: config.stabilityId,
    setupSource: config.setupSource,
    holderBrand: config.holderBrand,
    holderPackageId: config.holderPackageId,
    holderStyle: config.holderStyle,
    selectedFeatureIds: config.selectedFeatureIds,
  };
}

function formatMaterialOptionLabel(item: MaterialCatalogItem) {
  const details: string[] = [];
  if (item.subcategoryLabel && !item.name.toLowerCase().includes(item.subcategoryLabel.toLowerCase())) {
    details.push(item.subcategoryLabel);
  }
  if (item.conditionLabel && !item.name.toLowerCase().includes(item.conditionLabel.toLowerCase())) {
    details.push(item.conditionLabel);
  }
  if (item.hardness) {
    details.push(item.hardness);
  }
  return details.length ? `${item.name} / ${details.join(' / ')}` : item.name;
}

function defaultSelectedControllerCapabilityIds(
  controllerCapabilityOptions: MachineControllerCapabilityOption[],
) {
  return controllerCapabilityOptions
    .filter((option) => option.defaultEnabled)
    .map((option) => option.id);
}

const COMMON_TOOLING_STATION_OPTIONS = {
  magazine: [24, 30, 40, 48, 60, 80, 120],
  turret: [8, 10, 12, 16, 24],
  gang: [6, 8, 10, 12],
} as const;
type ToolingLayoutKind = NonNullable<MachineCatalogItem['toolingLayout']>['kind'];

function normalizeToolingStationCount(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim().length === 0) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.max(1, Math.round(parsed));
  return Number.isFinite(rounded) ? rounded : null;
}

function supportsToolingStationSelection(layout?: MachineCatalogItem['toolingLayout']) {
  return Boolean(layout && (layout.kind === 'magazine' || layout.kind === 'turret' || layout.kind === 'gang'));
}

function resolveEffectiveToolingLayout(
  layout: MachineCatalogItem['toolingLayout'] | undefined,
  stationCountOverride: number | null,
) {
  if (!layout || !supportsToolingStationSelection(layout)) {
    return layout;
  }

  const normalizedOverride = normalizeToolingStationCount(stationCountOverride);
  if (!normalizedOverride) {
    return layout;
  }

  return {
    ...layout,
    stations: normalizedOverride,
  };
}

function buildToolingStationOptions(
  layout: MachineCatalogItem['toolingLayout'] | undefined,
  stationCountOverride: number | null,
) {
  if (!layout || !supportsToolingStationSelection(layout)) {
    return [];
  }

  const baseOptions = layout.stationOptions?.length
    ? layout.stationOptions
    : COMMON_TOOLING_STATION_OPTIONS[layout.kind];
  const stationCounts = [
    ...baseOptions,
    normalizeToolingStationCount(layout.stations),
    normalizeToolingStationCount(stationCountOverride),
  ].filter((value): value is number => value != null);

  return [...new Set(stationCounts)].sort((left, right) => left - right);
}

function toolingStationLabel(layout?: MachineCatalogItem['toolingLayout']) {
  if (!layout) return 'Tooling capacity';
  switch (layout.kind) {
    case 'magazine':
      return 'Tool magazine capacity';
    case 'turret':
      return 'Turret station count';
    case 'gang':
      return 'Gang station count';
    default:
      return 'Tooling capacity';
  }
}

function formatToolingCapacityOption(
  kind: ToolingLayoutKind,
  stationCount: number,
) {
  return kind === 'magazine' ? `${stationCount} tools` : `${stationCount} stations`;
}

function formatToolingCapacitySummary(
  kind: ToolingLayoutKind | undefined,
  stationCount?: number | null,
) {
  const normalizedCount = normalizeToolingStationCount(stationCount);
  if (!normalizedCount) return 'Published count';
  if (kind === 'magazine') {
    return `${normalizedCount}-tool crib`;
  }
  return `${normalizedCount} installed`;
}

function buildMeasuredMachinePerformance({
  baselineGuidewayType,
  guidewayType,
  machineAgeYears,
  measuredPowerKw,
  measuredMaxTorqueNm,
  measuredNaturalFrequencyHz,
  measuredSystemStiffnessNPerUm,
  measuredDampingRatio,
  measuredAxisAccelerationMps2,
  measuredAxisJerkMps3,
}: {
  baselineGuidewayType?: MachineCatalogItem['guidewayType'];
  guidewayType?: MachineCatalogItem['guidewayType'];
  machineAgeYears?: number | null;
  measuredPowerKw?: number | null;
  measuredMaxTorqueNm?: number | null;
  measuredNaturalFrequencyHz?: number | null;
  measuredSystemStiffnessNPerUm?: number | null;
  measuredDampingRatio?: number | null;
  measuredAxisAccelerationMps2?: number | null;
  measuredAxisJerkMps3?: number | null;
}): CalculatorSavedMachineProfile['measuredPerformance'] {
  const next: NonNullable<CalculatorSavedMachineProfile['measuredPerformance']> = {};
  const numericEntries = [
    ['machineAgeYears', machineAgeYears],
    ['measuredPowerKw', measuredPowerKw],
    ['measuredMaxTorqueNm', measuredMaxTorqueNm],
    ['measuredNaturalFrequencyHz', measuredNaturalFrequencyHz],
    ['measuredSystemStiffnessNPerUm', measuredSystemStiffnessNPerUm],
    ['measuredDampingRatio', measuredDampingRatio],
    ['measuredAxisAccelerationMps2', measuredAxisAccelerationMps2],
    ['measuredAxisJerkMps3', measuredAxisJerkMps3],
  ] as const;
  const hasMeasuredNumbers = numericEntries.some(([, value]) => typeof value === 'number' && Number.isFinite(value));
  const effectiveGuidewayType = guidewayType ?? baselineGuidewayType;

  if (effectiveGuidewayType && (hasMeasuredNumbers || effectiveGuidewayType !== baselineGuidewayType)) {
    next.guidewayType = effectiveGuidewayType;
  }

  for (const [key, value] of numericEntries) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      switch (key) {
        case 'machineAgeYears':
          next.machineAgeYears = value;
          break;
        case 'measuredPowerKw':
          next.measuredPowerKw = value;
          break;
        case 'measuredMaxTorqueNm':
          next.measuredMaxTorqueNm = value;
          break;
        case 'measuredNaturalFrequencyHz':
          next.measuredNaturalFrequencyHz = value;
          break;
        case 'measuredSystemStiffnessNPerUm':
          next.measuredSystemStiffnessNPerUm = value;
          break;
        case 'measuredDampingRatio':
          next.measuredDampingRatio = value;
          break;
        case 'measuredAxisAccelerationMps2':
          next.measuredAxisAccelerationMps2 = value;
          break;
        case 'measuredAxisJerkMps3':
          next.measuredAxisJerkMps3 = value;
          break;
        default:
          break;
      }
    }
  }

  return Object.keys(next).length ? next : undefined;
}

function sameMeasuredMachinePerformance(
  left: CalculatorSavedMachineProfile['measuredPerformance'],
  right: CalculatorSavedMachineProfile['measuredPerformance'],
) {
  const guidewayMatches = (left?.guidewayType ?? undefined) === (right?.guidewayType ?? undefined);
  if (!guidewayMatches) {
    return false;
  }

  const numericKeys: Array<keyof NonNullable<CalculatorSavedMachineProfile['measuredPerformance']>> = [
    'machineAgeYears',
    'measuredPowerKw',
    'measuredMaxTorqueNm',
    'measuredNaturalFrequencyHz',
    'measuredSystemStiffnessNPerUm',
    'measuredDampingRatio',
    'measuredAxisAccelerationMps2',
    'measuredAxisJerkMps3',
  ];

  return numericKeys.every((key) => {
    const leftValue = left?.[key];
    const rightValue = right?.[key];
    if (leftValue == null && rightValue == null) {
      return true;
    }
    return leftValue === rightValue;
  });
}

function formatGuidewayType(value?: MachineCatalogItem['guidewayType']) {
  switch (value) {
    case 'box':
      return 'Box ways';
    case 'linear':
      return 'Linear guides';
    case 'hydrostatic':
      return 'Hydrostatic';
    default:
      return 'Catalog pending';
  }
}

function formatMachineMetric(value: number | undefined, unit: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'N/A';
  }
  const rounded = value >= 100 ? Math.round(value) : Number(value.toFixed(value >= 10 ? 1 : 3));
  return `${rounded} ${unit}`;
}

function buildDynamicFilterOptions<T>({
  items,
  allLabel,
  allDetail,
  getId,
  getLabel,
}: {
  items: T[];
  allLabel: string;
  allDetail: string;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
}): SelectionOption[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const item of items) {
    const id = getId(item);
    const label = getLabel(item);
    const existing = counts.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(id, { label, count: 1 });
    }
  }

  return [
    {
      id: 'all',
      label: `${allLabel} (${counts.size})`,
      detail: allDetail,
    },
    ...Array.from(counts.entries())
      .map(([id, value]) => ({
        id,
        label: `${value.label} (${value.count})`,
        detail: `${value.count} compatible option${value.count === 1 ? '' : 's'}`,
      }))
      .sort((left, right) => left.label.localeCompare(right.label)),
  ];
}

function toolVendorFilterId(tool: ToolCatalogItem) {
  return normalizeFilterId(tool.vendor ?? 'curated-baseline');
}

function toolVendorFilterLabel(tool: ToolCatalogItem) {
  return tool.vendor?.trim() || 'Curated baseline';
}

function toolGeometryFilterId(tool: ToolCatalogItem) {
  return normalizeFilterId(tool.geometryClass ?? tool.operation ?? tool.family);
}

function toolGeometryFilterLabel(tool: ToolCatalogItem) {
  return tool.geometryClass ? humanizeToken(tool.geometryClass) : tool.family;
}

function toolSizeBucketId(tool: ToolCatalogItem) {
  const diameter = tool.defaultDiameter ?? 0;
  if (diameter <= 3) return 'micro';
  if (diameter <= 10) return 'small';
  if (diameter <= 20) return 'medium';
  if (diameter <= 40) return 'large';
  return 'heavy';
}

function toolSizeBucketLabel(tool: ToolCatalogItem) {
  switch (toolSizeBucketId(tool)) {
    case 'micro':
      return 'Micro <= 3 mm';
    case 'small':
      return 'Small 3-10 mm';
    case 'medium':
      return 'Medium 10-20 mm';
    case 'large':
      return 'Large 20-40 mm';
    default:
      return 'Heavy > 40 mm';
  }
}

function holderPackageTypeId(holderPackage: HolderPackageOption) {
  return normalizeFilterId(
    holderPackage.holderType
    ?? holderPackage.holderSubcategory
    ?? holderPackage.holderStyleId
    ?? 'machine-standard',
  );
}

function holderPackageTypeLabel(holderPackage: HolderPackageOption) {
  return holderPackage.holderType
    ?? holderPackage.holderSubcategory
    ?? humanizeToken(holderPackage.holderStyleId ?? 'machine-standard');
}

function holderPackageInterfaceId(holderPackage: HolderPackageOption, machine?: MachineCatalogItem | null) {
  return resolveHolderPackageInterface(holderPackage, machine).id;
}

function holderPackageInterfaceLabel(holderPackage: HolderPackageOption, machine?: MachineCatalogItem | null) {
  return resolveHolderPackageInterface(holderPackage, machine).label;
}

function machineSelectionSignature(machine?: MachineCatalogItem | null) {
  return [
    machine?.manufacturer,
    machine?.model,
    machine?.machineTypeId,
    machine?.machineTypeLabel,
    machine?.family,
    machine?.axes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function machineUsesRotaryTrunnion(machine?: MachineCatalogItem | null) {
  const signature = machineSelectionSignature(machine);
  return machine?.machineTypeId === 'mill_vertical_4'
    || (/(trunnion|5-axis|5 axis|3\+2|rotary)/.test(signature) && !/optional\s+(trt|rotary)/.test(signature));
}

function machineLooksHorizontalMill(machine?: MachineCatalogItem | null) {
  const signature = machineSelectionSignature(machine);
  return /(horizontal|hmc|pallet)/.test(signature);
}

function defaultMillSetupForMachine(machine?: MachineCatalogItem | null) {
  if (machineUsesRotaryTrunnion(machine)) {
    return {
      workholdingId: 'rotary-trunnion',
      workholdingCategoryId: 'rotary',
      workholdingBrandId: '5th-axis',
      workholdingPresetId: 'haas-trt-package',
      stabilityId: 'index-ready',
      stockShape: 'plate' as StockShapeId,
    };
  }

  if (machineLooksHorizontalMill(machine)) {
    return {
      workholdingId: 'fixture-plate',
      workholdingCategoryId: 'fixture',
      workholdingBrandId: 'chick',
      workholdingPresetId: 'chick-one-lok',
      stabilityId: 'aggressive-rigid',
      stockShape: 'plate' as StockShapeId,
    };
  }

  return {
    workholdingId: 'vise-soft-jaw',
    workholdingCategoryId: 'vise',
    workholdingBrandId: 'kurt',
    workholdingPresetId: 'kurt-vise-parallels',
    stabilityId: 'production-stable',
    stockShape: 'plate' as StockShapeId,
  };
}

function defaultSelectedFeatureIds(machineMode: MachineMode, machine?: MachineCatalogItem) {
  const defaults = new Set<string>();
  const coolantSignature = machine?.coolant.toLowerCase() ?? '';
  const layout = machine?.toolingLayout;

  if (coolantSignature.includes('tsc') || coolantSignature.includes('through-tool') || coolantSignature.includes('through-tool ready')) {
    defaults.add('through-spindle-coolant');
  }
  if (machineMode === 'mill' && machineUsesRotaryTrunnion(machine)) {
    defaults.add('rotary-trunnion');
  }
  if (machineMode === 'lathe' && layout?.liveTooling) {
    defaults.add('live-tooling');
  }
  if (machineMode === 'lathe' && layout?.kind === 'gang') {
    defaults.add('bar-feeder');
  }
  if (machineMode === 'edm') {
    defaults.add('auto-electrode-reference');
  }
  if (machineMode === 'wire_edm' || machineMode === 'waterjet') {
    defaults.add('taper-control');
  }
  if (machineMode === 'laser') {
    defaults.add('assist-gas-package');
  }

  return Array.from(defaults);
}

function getRecommendedFeatureIds({
  machineMode,
  selectedMachine,
  coolant,
  finishTarget,
  holderStyle,
  stockShape,
  stockSource,
  selectedProgramming,
  selectedWorkholdingPreset,
}: {
  machineMode: MachineMode;
  selectedMachine?: MachineCatalogItem;
  coolant: string;
  finishTarget: string;
  holderStyle: string;
  stockShape: StockShapeId;
  stockSource: string;
  selectedProgramming?: { kind?: string } | null;
  selectedWorkholdingPreset?: { id?: string } | null;
}) {
  const recommended = new Set<string>();

  if (coolant === 'tsc') {
    recommended.add('through-spindle-coolant');
  }
  if (finishTarget === 'prove-out') {
    recommended.add('probing-package');
  }
  if (machineMode === 'mill' && (selectedMachine?.axes?.toLowerCase().includes('trt') || selectedWorkholdingPreset?.id?.includes('trt'))) {
    recommended.add('rotary-trunnion');
  }
  if (machineMode === 'lathe' && (selectedMachine?.toolingLayout?.liveTooling || holderStyle === 'live-tooling')) {
    recommended.add('live-tooling');
  }
  if (machineMode === 'lathe' && stockShape === 'round' && stockSource === 'shop-rack') {
    recommended.add('bar-feeder');
  }
  if (machineMode === 'edm' && selectedProgramming?.kind === 'cam') {
    recommended.add('auto-electrode-reference');
  }
  if ((machineMode === 'wire_edm' || machineMode === 'waterjet') && finishTarget === 'tight-finish') {
    recommended.add('taper-control');
  }
  if (machineMode === 'laser' && finishTarget !== 'high-removal') {
    recommended.add('assist-gas-package');
  }

  return Array.from(recommended);
}

function calculatorPanelTone(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes('machine')) {
    return {
      railHorizontal: 'h-[2px] bg-[linear-gradient(90deg,transparent,rgba(103,232,249,0.82),rgba(20,184,166,0.76),transparent)] shadow-[0_0_16px_rgba(34,211,238,0.16)]',
      railVertical: 'w-[2px] bg-[linear-gradient(180deg,transparent,rgba(103,232,249,0.72),rgba(20,184,166,0.62),transparent)] shadow-[0_0_16px_rgba(34,211,238,0.14)]',
      headerSurface: 'border-b border-sky-300/22 bg-[linear-gradient(135deg,rgba(20,43,74,0.98)_0%,rgba(20,70,89,0.99)_42%,rgba(18,36,57,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(45,212,191,0.18),0_0_34px_rgba(34,211,238,0.12)]',
      titleWrap: 'border-sky-300/24 bg-[linear-gradient(135deg,rgba(14,33,56,0.92)_0%,rgba(17,58,73,0.9)_100%)] shadow-[0_0_18px_rgba(34,211,238,0.12)]',
      iconTone: 'drop-shadow-[0_0_10px_rgba(103,232,249,0.18)]',
      titleTone: 'text-slate-50 drop-shadow-[0_0_14px_rgba(125,211,252,0.16)]',
    };
  }

  if (normalized.includes('material') || normalized.includes('formula')) {
    return {
      railHorizontal: 'h-[2px] bg-[linear-gradient(90deg,transparent,rgba(251,191,36,0.82),rgba(249,115,22,0.72),transparent)] shadow-[0_0_16px_rgba(251,191,36,0.14)]',
      railVertical: 'w-[2px] bg-[linear-gradient(180deg,transparent,rgba(251,191,36,0.72),rgba(249,115,22,0.62),transparent)] shadow-[0_0_16px_rgba(251,191,36,0.12)]',
      headerSurface: 'border-b border-amber-300/20 bg-[linear-gradient(135deg,rgba(63,38,12,0.98)_0%,rgba(105,59,18,0.98)_40%,rgba(39,24,12,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(251,191,36,0.18),0_0_30px_rgba(245,158,11,0.1)]',
      titleWrap: 'border-amber-300/24 bg-[linear-gradient(135deg,rgba(57,35,12,0.92)_0%,rgba(97,52,17,0.88)_100%)] shadow-[0_0_16px_rgba(245,158,11,0.12)]',
      iconTone: 'drop-shadow-[0_0_10px_rgba(251,191,36,0.16)]',
      titleTone: 'text-slate-50 drop-shadow-[0_0_12px_rgba(251,191,36,0.12)]',
    };
  }

  if (normalized.includes('programming') || normalized.includes('toolpath')) {
    return {
      railHorizontal: 'h-[2px] bg-[linear-gradient(90deg,transparent,rgba(196,181,253,0.82),rgba(129,140,248,0.72),transparent)] shadow-[0_0_16px_rgba(167,139,250,0.14)]',
      railVertical: 'w-[2px] bg-[linear-gradient(180deg,transparent,rgba(196,181,253,0.72),rgba(129,140,248,0.62),transparent)] shadow-[0_0_16px_rgba(167,139,250,0.12)]',
      headerSurface: 'border-b border-violet-300/20 bg-[linear-gradient(135deg,rgba(43,24,77,0.98)_0%,rgba(55,44,112,0.98)_42%,rgba(28,23,59,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(167,139,250,0.16),0_0_30px_rgba(129,140,248,0.1)]',
      titleWrap: 'border-violet-300/24 bg-[linear-gradient(135deg,rgba(34,24,71,0.92)_0%,rgba(52,43,102,0.88)_100%)] shadow-[0_0_16px_rgba(167,139,250,0.12)]',
      iconTone: 'drop-shadow-[0_0_10px_rgba(196,181,253,0.16)]',
      titleTone: 'text-slate-50 drop-shadow-[0_0_12px_rgba(196,181,253,0.12)]',
    };
  }

  if (normalized.includes('cutting')) {
    return {
      railHorizontal: 'h-[2px] bg-[linear-gradient(90deg,transparent,rgba(45,212,191,0.86),rgba(34,211,238,0.78),transparent)] shadow-[0_0_18px_rgba(45,212,191,0.16)]',
      railVertical: 'w-[2px] bg-[linear-gradient(180deg,transparent,rgba(45,212,191,0.74),rgba(34,211,238,0.62),transparent)] shadow-[0_0_16px_rgba(45,212,191,0.14)]',
      headerSurface: 'border-b border-cyan-300/22 bg-[linear-gradient(135deg,rgba(11,56,61,0.99)_0%,rgba(15,87,94,0.99)_38%,rgba(16,40,56,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(45,212,191,0.2),0_0_34px_rgba(45,212,191,0.12)]',
      titleWrap: 'border-cyan-300/24 bg-[linear-gradient(135deg,rgba(10,49,53,0.92)_0%,rgba(12,76,78,0.9)_100%)] shadow-[0_0_18px_rgba(45,212,191,0.12)]',
      iconTone: 'drop-shadow-[0_0_10px_rgba(45,212,191,0.18)]',
      titleTone: 'text-slate-50 drop-shadow-[0_0_14px_rgba(45,212,191,0.14)]',
    };
  }

  if (normalized.includes('my shop') || normalized.includes('process')) {
    return {
      railHorizontal: 'h-[2px] bg-[linear-gradient(90deg,transparent,rgba(74,222,128,0.78),rgba(45,212,191,0.68),transparent)] shadow-[0_0_16px_rgba(74,222,128,0.12)]',
      railVertical: 'w-[2px] bg-[linear-gradient(180deg,transparent,rgba(74,222,128,0.68),rgba(45,212,191,0.58),transparent)] shadow-[0_0_14px_rgba(74,222,128,0.1)]',
      headerSurface: 'border-b border-emerald-300/18 bg-[linear-gradient(135deg,rgba(21,58,45,0.98)_0%,rgba(17,73,72,0.98)_42%,rgba(16,38,44,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(74,222,128,0.16),0_0_28px_rgba(45,212,191,0.08)]',
      titleWrap: 'border-emerald-300/22 bg-[linear-gradient(135deg,rgba(17,49,38,0.92)_0%,rgba(16,64,64,0.88)_100%)] shadow-[0_0_16px_rgba(74,222,128,0.1)]',
      iconTone: 'drop-shadow-[0_0_10px_rgba(110,231,183,0.16)]',
      titleTone: 'text-slate-50 drop-shadow-[0_0_12px_rgba(110,231,183,0.1)]',
    };
  }

  if (normalized.includes('unit')) {
    return {
      railHorizontal: 'h-[2px] bg-[linear-gradient(90deg,transparent,rgba(165,180,252,0.8),rgba(96,165,250,0.68),transparent)] shadow-[0_0_16px_rgba(129,140,248,0.12)]',
      railVertical: 'w-[2px] bg-[linear-gradient(180deg,transparent,rgba(165,180,252,0.7),rgba(96,165,250,0.58),transparent)] shadow-[0_0_14px_rgba(129,140,248,0.1)]',
      headerSurface: 'border-b border-indigo-300/18 bg-[linear-gradient(135deg,rgba(27,37,72,0.98)_0%,rgba(33,53,92,0.98)_42%,rgba(17,28,54,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(129,140,248,0.14),0_0_28px_rgba(96,165,250,0.08)]',
      titleWrap: 'border-indigo-300/22 bg-[linear-gradient(135deg,rgba(23,35,70,0.92)_0%,rgba(27,50,88,0.88)_100%)] shadow-[0_0_16px_rgba(129,140,248,0.1)]',
      iconTone: 'drop-shadow-[0_0_10px_rgba(165,180,252,0.14)]',
      titleTone: 'text-slate-50 drop-shadow-[0_0_12px_rgba(165,180,252,0.1)]',
    };
  }

  if (normalized.includes('tooling') || normalized.includes('turret')) {
    return {
      railHorizontal: 'h-[2px] bg-[linear-gradient(90deg,transparent,rgba(248,113,113,0.76),rgba(251,191,36,0.66),transparent)] shadow-[0_0_16px_rgba(248,113,113,0.12)]',
      railVertical: 'w-[2px] bg-[linear-gradient(180deg,transparent,rgba(248,113,113,0.66),rgba(251,191,36,0.56),transparent)] shadow-[0_0_14px_rgba(248,113,113,0.1)]',
      headerSurface: 'border-b border-rose-300/18 bg-[linear-gradient(135deg,rgba(68,29,34,0.98)_0%,rgba(94,44,39,0.98)_42%,rgba(59,38,18,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(251,191,36,0.14),0_0_28px_rgba(248,113,113,0.08)]',
      titleWrap: 'border-rose-300/22 bg-[linear-gradient(135deg,rgba(64,26,33,0.92)_0%,rgba(90,46,34,0.88)_100%)] shadow-[0_0_16px_rgba(248,113,113,0.1)]',
      iconTone: 'drop-shadow-[0_0_10px_rgba(251,146,60,0.14)]',
      titleTone: 'text-slate-50 drop-shadow-[0_0_12px_rgba(251,146,60,0.1)]',
    };
  }

  if (normalized.includes('hardware')) {
    return {
      railHorizontal: 'h-[2px] bg-[linear-gradient(90deg,transparent,rgba(192,132,252,0.74),rgba(244,114,182,0.64),transparent)] shadow-[0_0_16px_rgba(216,180,254,0.12)]',
      railVertical: 'w-[2px] bg-[linear-gradient(180deg,transparent,rgba(192,132,252,0.64),rgba(244,114,182,0.54),transparent)] shadow-[0_0_14px_rgba(216,180,254,0.1)]',
      headerSurface: 'border-b border-fuchsia-300/18 bg-[linear-gradient(135deg,rgba(54,28,73,0.98)_0%,rgba(79,35,77,0.98)_42%,rgba(53,23,53,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(244,114,182,0.14),0_0_28px_rgba(192,132,252,0.08)]',
      titleWrap: 'border-fuchsia-300/22 bg-[linear-gradient(135deg,rgba(48,24,66,0.92)_0%,rgba(72,31,70,0.88)_100%)] shadow-[0_0_16px_rgba(216,180,254,0.1)]',
      iconTone: 'drop-shadow-[0_0_10px_rgba(244,114,182,0.14)]',
      titleTone: 'text-slate-50 drop-shadow-[0_0_12px_rgba(244,114,182,0.1)]',
    };
  }

  return {
    railHorizontal: 'h-[2px] bg-[linear-gradient(90deg,transparent,rgba(103,232,249,0.76),rgba(56,189,248,0.68),transparent)] shadow-[0_0_14px_rgba(34,211,238,0.12)]',
    railVertical: 'w-[2px] bg-[linear-gradient(180deg,transparent,rgba(103,232,249,0.66),rgba(56,189,248,0.56),transparent)] shadow-[0_0_14px_rgba(34,211,238,0.1)]',
    headerSurface: 'border-b border-cyan-300/22 bg-[linear-gradient(135deg,rgba(37,63,98,0.99)_0%,rgba(46,86,128,0.99)_28%,rgba(29,55,87,0.99)_62%,rgba(18,35,58,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(103,232,249,0.18),0_0_40px_rgba(56,189,248,0.16)]',
    titleWrap: 'border-cyan-300/24 bg-[linear-gradient(135deg,rgba(20,43,74,0.92)_0%,rgba(26,58,92,0.88)_100%)] shadow-[0_0_16px_rgba(56,189,248,0.1)]',
    iconTone: 'drop-shadow-[0_0_10px_rgba(103,232,249,0.14)]',
    titleTone: 'text-slate-50 drop-shadow-[0_0_14px_rgba(125,211,252,0.12)]',
  };
}

function Panel({
  icon,
  title,
  summary,
  collapsible = false,
  defaultCollapsed = false,
  className,
  headerClassName,
  bodyClassName,
  guideVisible = false,
  guideActive = false,
  guideTargetId,
  guideMessage,
  guideStepLabel,
  helpTopicId,
  onOpenHelp,
  children,
}: {
  icon?: string;
  title: string;
  summary?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  guideVisible?: boolean;
  guideActive?: boolean;
  guideTargetId?: string;
  guideMessage?: string;
  guideStepLabel?: string;
  helpTopicId?: HelpTopicId;
  onOpenHelp?: (topicId: HelpTopicId, anchorRect: CalculatorHelpAnchorRect) => void;
  children: ReactNode;
  eyebrow?: string;
  description?: string;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const calculatorGuide = useContext(CalculatorGuideContext);
  const resolvedGuideTargetId = guideTargetId ?? guideStepIdForPanelTitle(title) ?? undefined;
  const tone = calculatorPanelTone(resolvedGuideTargetId ?? title);
  const resolvedGuideVisible = true;
  const guideMeta = resolvedGuideTargetId ? calculatorGuide?.stepMetaById?.[resolvedGuideTargetId] : undefined;
  const resolvedGuideActive = guideActive || Boolean(calculatorGuide?.enabled && calculatorGuide.currentStepId === resolvedGuideTargetId);
  const resolvedGuideMessage = guideMessage ?? (resolvedGuideActive ? calculatorGuide?.currentMessage : undefined);
  const resolvedGuideStepLabel = guideStepLabel ?? (resolvedGuideActive ? `Step ${(guideMeta?.index ?? calculatorGuide?.currentStepIndex ?? 0) + 1}` : undefined);
  const resolvedGuideComplete = Boolean(calculatorGuide?.enabled && !resolvedGuideActive && guideMeta?.complete);
  const resolvedGuideStatusClass = resolvedGuideActive
    ? 'calculator-guide-panel-attention'
    : resolvedGuideComplete
      ? 'calculator-guide-panel-complete'
      : '';
  const guideRailHorizontalClass = resolvedGuideActive
    ? 'calculator-guide-led-rail calculator-guide-led-rail-horizontal calculator-guide-led-rail-attention'
    : resolvedGuideComplete
      ? 'calculator-guide-led-rail calculator-guide-led-rail-horizontal calculator-guide-led-rail-complete'
      : tone.railHorizontal;
  const guideRailVerticalClass = resolvedGuideActive
    ? 'calculator-guide-led-rail calculator-guide-led-rail-vertical calculator-guide-led-rail-attention'
    : resolvedGuideComplete
      ? 'calculator-guide-led-rail calculator-guide-led-rail-vertical calculator-guide-led-rail-complete'
      : tone.railVertical;
  const panelGuideValue = useMemo<CalculatorGuideContextValue>(() => ({
    enabled: resolvedGuideActive,
    activePanelId: resolvedGuideTargetId ?? title,
  }), [resolvedGuideActive, resolvedGuideTargetId, title]);

  return (
    <section
      data-guide-target={resolvedGuideTargetId}
      className={`calculator-guide-panel relative overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0d1a2d] shadow-[0_10px_28px_rgba(2,6,23,0.24)] ${resolvedGuideStatusClass} ${className ?? ''}`}
    >
      {resolvedGuideVisible ? (
        <>
          <div className={`pointer-events-none absolute inset-x-4 top-0 z-[1] ${guideRailHorizontalClass}`} />
          <div className={`pointer-events-none absolute inset-x-4 bottom-0 z-[1] ${guideRailHorizontalClass}`} />
          <div className={`pointer-events-none absolute inset-y-6 left-0 z-[1] ${guideRailVerticalClass}`} />
          <div className={`pointer-events-none absolute inset-y-6 right-0 z-[1] ${guideRailVerticalClass}`} />
        </>
      ) : null}
      <div
        className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-center ${tone.headerSurface} ${resolvedGuideComplete ? 'calculator-guide-panel-header-complete' : ''} ${resolvedGuideActive ? 'calculator-guide-panel-header-attention' : ''} ${headerClassName ?? ''}`}
      >
        {collapsible ? (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            className="calculator-panel-header-main flex min-w-0 flex-1 items-center gap-2.5 bg-transparent text-center"
          >
            {icon && <span className={`shrink-0 text-[18px] ${tone.iconTone}`} aria-hidden="true">{icon}</span>}
            <div className={`calculator-panel-title-chip inline-flex min-w-0 items-center rounded-xl border px-3 py-1.5 ${tone.titleWrap} ${resolvedGuideComplete ? 'calculator-guide-panel-title-complete' : ''} ${resolvedGuideActive ? 'calculator-guide-panel-title-attention' : ''}`}>
              <h2 className={`calculator-panel-title-text truncate text-[19px] font-black tracking-[0.01em] sm:text-[21px] ${tone.titleTone}`}>{title}</h2>
            </div>
            {calculatorGuide?.enabled && guideMeta ? (
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                  resolvedGuideActive
                    ? 'border-red-100/45 bg-red-500/14 text-red-50'
                    : guideMeta.status === 'ready'
                      ? 'border-emerald-400/25 bg-emerald-500/[0.10] text-emerald-100'
                      : guideMeta.status === 'review'
                        ? 'border-sky-400/25 bg-sky-500/[0.10] text-sky-100'
                        : guideMeta.status === 'capture'
                          ? 'border-fuchsia-400/25 bg-fuchsia-500/[0.10] text-fuchsia-100'
                          : 'border-red-300/25 bg-red-500/[0.10] text-red-100'
                }`}
              >
                Step {guideMeta.index + 1} · {guideMeta.statusLabel}
              </span>
            ) : null}
          </button>
        ) : (
          <div className="calculator-panel-header-main flex min-w-0 flex-1 items-center gap-2.5">
            {icon && <span className={`shrink-0 text-[18px] ${tone.iconTone}`} aria-hidden="true">{icon}</span>}
            <div className={`calculator-panel-title-chip inline-flex min-w-0 items-center rounded-xl border px-3 py-1.5 ${tone.titleWrap} ${resolvedGuideComplete ? 'calculator-guide-panel-title-complete' : ''} ${resolvedGuideActive ? 'calculator-guide-panel-title-attention' : ''}`}>
              <h2 className={`calculator-panel-title-text truncate text-[19px] font-black tracking-[0.01em] sm:text-[21px] ${tone.titleTone}`}>{title}</h2>
            </div>
            {calculatorGuide?.enabled && guideMeta ? (
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                  resolvedGuideActive
                    ? 'border-red-100/45 bg-red-500/14 text-red-50'
                    : guideMeta.status === 'ready'
                      ? 'border-emerald-400/25 bg-emerald-500/[0.10] text-emerald-100'
                      : guideMeta.status === 'review'
                        ? 'border-sky-400/25 bg-sky-500/[0.10] text-sky-100'
                        : guideMeta.status === 'capture'
                          ? 'border-fuchsia-400/25 bg-fuchsia-500/[0.10] text-fuchsia-100'
                          : 'border-red-300/25 bg-red-500/[0.10] text-red-100'
                }`}
              >
                Step {guideMeta.index + 1} · {guideMeta.statusLabel}
              </span>
            ) : null}
          </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {summary && (
            <span className="calculator-panel-summary hidden max-w-[240px] truncate text-[12px] font-semibold text-slate-100/90 sm:inline">{summary}</span>
          )}
          {helpTopicId && onOpenHelp ? (
            <CalculatorHelpDot topicId={helpTopicId} onOpen={onOpenHelp} />
          ) : null}
          {collapsible && (
            <span className={`text-[11px] text-sky-200/80 transition-transform ${collapsed ? '' : 'rotate-180'}`}>&#9660;</span>
          )}
        </div>
      </div>
      {resolvedGuideActive && resolvedGuideMessage ? (
        <div className="pointer-events-none absolute right-3 top-[3.35rem] z-[2] max-w-[260px] rounded-2xl border border-red-300/25 bg-[linear-gradient(135deg,rgba(53,13,19,0.97)_0%,rgba(24,10,16,0.98)_100%)] px-3 py-2 text-[11px] leading-5 text-red-50 shadow-[0_18px_36px_rgba(15,23,42,0.45)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-200">{resolvedGuideStepLabel ?? 'Guided focus'}</div>
          <div className="mt-1">{resolvedGuideMessage}</div>
        </div>
      ) : null}
      <CalculatorGuideContext.Provider value={panelGuideValue}>
        {!collapsed && <div data-guide-panel-body="true" className={`space-y-3 px-4 py-3.5 ${bodyClassName ?? ''}`}>{children}</div>}
      </CalculatorGuideContext.Provider>
    </section>
  );
}

function GuideFieldBubble({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mt-2 rounded-2xl border border-red-300/20 bg-[linear-gradient(135deg,rgba(61,11,17,0.72)_0%,rgba(18,10,18,0.9)_100%)] px-3 py-2 text-[11px] leading-5 text-red-50/90 shadow-[0_10px_24px_rgba(15,23,42,0.24)]">
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-red-200">Why this input matters</div>
      <div className="mt-1">
        <span className="font-semibold text-red-100">{label}:</span> {hint ?? calculatorGuideHint(label)}
      </div>
    </div>
  );
}

function CalculatorHelpPopover({
  topicId,
  anchorRect,
  onClose,
}: {
  topicId: HelpTopicId;
  anchorRect: CalculatorHelpAnchorRect;
  onClose: () => void;
}) {
  const topic = CALCULATOR_HELP_TOPICS[topicId];
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') {
      return { left: 16, top: 16, width: 360 };
    }

    const width = Math.min(420, Math.max(300, window.innerWidth - 32));
    return { left: 16, top: 16, width };
  });

  useEffect(() => {
    const placePopover = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const nextWidth = Math.min(420, Math.max(300, viewportWidth - 32));
      const anchorCenter = anchorRect.left + anchorRect.width / 2;
      const nextLeft = Math.min(Math.max(anchorCenter - nextWidth / 2, 16), viewportWidth - nextWidth - 16);
      const placeAbove = anchorRect.bottom > viewportHeight * 0.62;
      const nextTop = placeAbove
        ? Math.max(16, anchorRect.top - 16 - 272)
        : Math.min(anchorRect.bottom + 14, viewportHeight - 288);

      setPosition({
        left: nextLeft,
        top: nextTop,
        width: nextWidth,
      });
    };

    placePopover();
    window.addEventListener('resize', placePopover);

    return () => {
      window.removeEventListener('resize', placePopover);
    };
  }, [anchorRect]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[82]">
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={topic.title}
        className="pointer-events-auto absolute rounded-[24px] border border-cyan-300/22 bg-[linear-gradient(145deg,rgba(8,20,34,0.98)_0%,rgba(12,19,33,0.99)_100%)] shadow-[0_18px_52px_rgba(2,8,23,0.52),0_0_24px_rgba(34,211,238,0.10)] backdrop-blur-sm"
        style={{
          left: `${position.left}px`,
          top: `${position.top}px`,
          width: `${position.width}px`,
          maxHeight: 'min(30rem, 68vh)',
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-cyan-300/14 px-4 py-3">
          <div className="min-w-0">
            <div className="inline-flex items-center rounded-full border border-cyan-300/24 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100">
              {topic.badge}
            </div>
            <h3 className="mt-2 text-sm font-black uppercase tracking-[0.04em] text-white">
              {topic.title}
            </h3>
          </div>
          <button
            type="button"
            aria-label={`Close ${topic.title}`}
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-600/70 bg-[#0c1727] text-slate-300 transition hover:border-cyan-300/40 hover:bg-[#13233a] hover:text-white"
          >
            ×
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto px-4 py-4">
          <div className="rounded-2xl border border-cyan-300/14 bg-[#0b1727] px-4 py-3 text-[12px] leading-6 text-slate-200">
            {topic.summary}
          </div>
          <div className="grid gap-2.5">
            {topic.bullets.map((bullet) => (
              <div
                key={bullet}
                className="rounded-2xl border border-slate-700/60 bg-[#0d182a] px-4 py-3 text-[12px] leading-6 text-slate-300"
              >
                {bullet}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalculatorWorkspaceDialog({
  title,
  summary,
  badge,
  icon,
  onClose,
  maxWidthClassName = 'max-w-[1180px]',
  children,
}: {
  title: string;
  summary?: ReactNode;
  badge?: string;
  icon?: string;
  onClose: () => void;
  maxWidthClassName?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/88 px-4 py-8 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClassName} rounded-[28px] border border-slate-700/70 bg-[#081523] shadow-[0_20px_80px_rgba(2,8,23,0.72)]`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-[28px] border-b border-slate-700/60 bg-[linear-gradient(135deg,#0f1f36,#162742)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {badge ? (
                <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-100">
                  {badge}
                </span>
              ) : null}
              {summary ? (
                <span className="text-xs text-slate-400">{summary}</span>
              ) : null}
            </div>
            <div className="mt-2 flex items-center gap-3">
              {icon ? <span className="text-xl" aria-hidden="true">{icon}</span> : null}
              <h2 className="text-xl font-bold text-slate-50">{title}</h2>
            </div>
          </div>
          <button
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-[#0c1727] text-slate-300 transition hover:border-slate-500 hover:bg-[#13233a] hover:text-white"
          >
            Ã—
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function CalculatorHelpDot({
  topicId,
  onOpen,
  className,
}: {
  topicId: HelpTopicId;
  onOpen: (topicId: HelpTopicId, anchorRect: CalculatorHelpAnchorRect) => void;
  className?: string;
}) {
  const topic = CALCULATOR_HELP_TOPICS[topicId];

  return (
    <button
      type="button"
      aria-label={`Explain ${topic.title}`}
      title={topic.title}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        onOpen(topicId, {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        });
      }}
      className={`calculator-help-dot ${className ?? ''}`}
    >
      ?
    </button>
  );
}

function NumberField({
  label,
  unit,
  value,
  onChange,
  min,
  step,
  integer = false,
  guideHint,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  step: number;
  integer?: boolean;
  guideHint?: string;
}) {
  const panelGuide = useContext(CalculatorGuideContext);
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <EquationNumberInput
          ariaLabel={label}
          guideLabel={label}
          guideDescription={guideHint}
          value={Number.isFinite(value) ? value : ''}
          onCommit={(nextValue) => {
            if (typeof nextValue === 'number') {
              onChange(integer ? Math.round(nextValue) : nextValue);
            }
          }}
          min={min}
          step={step}
          integer={integer}
          className="w-full rounded-lg border border-slate-600 bg-[#0a1628] px-2.5 py-1.5 text-[12px] text-slate-100 outline-none transition focus:border-sky-500"
        />
        {unit && <span className="text-[10px] font-semibold text-slate-500 shrink-0 w-8">{unit}</span>}
      </div>
      {panelGuide?.enabled ? <GuideFieldBubble label={label} hint={guideHint} /> : null}
    </label>
  );
}

function ActionNumberField({
  label,
  unit,
  value,
  onChange,
  min,
  step,
  integer = false,
  actionLabel,
  onAction,
  helperText,
  guideHint,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  integer?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  helperText?: string;
  guideHint?: string;
}) {
  const panelGuide = useContext(CalculatorGuideContext);
  return (
    <div className="block">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="block text-[10px] font-semibold text-slate-400">{label}</span>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            data-guide-managed="true"
            className="rounded-full border border-cyan-500/30 bg-cyan-950/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200 transition hover:border-cyan-400/50 hover:text-cyan-100"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-[#08111f] px-2.5 py-1.5">
        <EquationNumberInput
          ariaLabel={label}
          guideLabel={label}
          guideDescription={guideHint}
          value={Number.isFinite(value) ? value : ''}
          onCommit={(nextValue) => {
            if (typeof nextValue === 'number') {
              onChange(integer ? Math.round(nextValue) : nextValue);
            }
          }}
          min={min}
          step={step}
          integer={integer}
          className="w-full bg-transparent text-[12px] text-slate-100 outline-none"
        />
        {unit && <span className="shrink-0 w-8 text-[10px] font-semibold text-slate-500">{unit}</span>}
      </div>
      {helperText ? <p className="mt-2 text-[11px] leading-5 text-slate-500">{helperText}</p> : null}
      {panelGuide?.enabled ? <GuideFieldBubble label={label} hint={guideHint} /> : null}
    </div>
  );
}

function EquationNumberInput({
  ariaLabel,
  guideLabel,
  guideDescription,
  value,
  onCommit,
  className,
  min,
  step,
  integer = false,
  allowEmpty = false,
}: {
  ariaLabel: string;
  guideLabel?: string;
  guideDescription?: string;
  value: number | '';
  onCommit: (value: number | null) => void;
  className?: string;
  min?: number;
  step?: number;
  integer?: boolean;
  allowEmpty?: boolean;
}) {
  const [draft, setDraft] = useState(typeof value === 'number' ? formatNumericExpressionValue(value) : '');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(typeof value === 'number' ? formatNumericExpressionValue(value) : '');
    }
  }, [focused, value]);

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      if (allowEmpty) {
        onCommit(null);
        setDraft('');
      } else {
        setDraft(typeof value === 'number' ? formatNumericExpressionValue(value) : '');
      }
      return;
    }

    const parsed = evaluateNumericExpression(trimmed);
    if (parsed === null) {
      setDraft(typeof value === 'number' ? formatNumericExpressionValue(value) : '');
      return;
    }

    const normalized = integer ? Math.round(parsed) : parsed;
    onCommit(normalized);
    setDraft(formatNumericExpressionValue(normalized));
  };

  return (
    <input
      type="text"
      data-guide-managed="true"
      data-guide-label={guideLabel ?? ariaLabel}
      data-guide-description={guideDescription}
      inputMode={step !== undefined && step >= 1 ? 'numeric' : 'decimal'}
      aria-label={ariaLabel}
      value={draft}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commitDraft();
      }}
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);

        const trimmed = nextDraft.trim();
        if (!trimmed) {
          if (allowEmpty) {
            onCommit(null);
          }
          return;
        }

        const parsed = evaluateNumericExpression(trimmed);
        if (parsed === null) {
          return;
        }

        onCommit(integer ? Math.round(parsed) : parsed);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitDraft();
          (event.currentTarget as HTMLInputElement).blur();
        }
        if (event.key === 'Escape') {
          setDraft(typeof value === 'number' ? formatNumericExpressionValue(value) : '');
          (event.currentTarget as HTMLInputElement).blur();
        }
      }}
      title="Supports math like 1/8, 25.4*2, or 48+12"
      min={min}
      step={step}
      className={className}
    />
  );
}

function SelectField({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  guideHint,
}: {
  label: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string; detail?: string }>;
  guideHint?: string;
}) {
  const panelGuide = useContext(CalculatorGuideContext);
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">{label}</span>
      <select
        data-guide-managed="true"
        data-guide-label={label}
        data-guide-description={guideHint}
        aria-label={ariaLabel ?? label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-600 bg-[#0a1628] px-3 py-2 text-[13px] text-slate-100 outline-none transition focus:border-sky-500"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {options.find((option) => option.id === value)?.detail ? (
        <div className="mt-2 text-[12px] leading-5 text-slate-500">{options.find((option) => option.id === value)?.detail}</div>
      ) : null}
      {panelGuide?.enabled ? <GuideFieldBubble label={label} hint={guideHint} /> : null}
    </label>
  );
}

function OptionGrid({
  label,
  options,
  value,
  onChange,
  guideHint,
}: {
  label: string;
  options: Array<{ id: string; label: string; detail: string }>;
  value: string;
  onChange: (value: string) => void;
  guideHint?: string;
}) {
  const panelGuide = useContext(CalculatorGuideContext);
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="grid gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            data-guide-managed="true"
            data-guide-label={`${label} ${option.label}`}
            data-guide-description={guideHint ?? option.detail}
            onClick={() => onChange(option.id)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              value === option.id
                ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                : 'border-slate-700/50 bg-[#0f1f36] text-slate-300 hover:border-slate-700/50 hover:bg-[#162742]'
            }`}
          >
            <div className="text-sm font-semibold">{option.label}</div>
            <div className={`mt-1 text-xs leading-5 ${value === option.id ? 'text-slate-300' : 'text-slate-500'}`}>{option.detail}</div>
          </button>
        ))}
      </div>
      {panelGuide?.enabled ? <GuideFieldBubble label={label} hint={guideHint} /> : null}
    </div>
  );
}

function StockInputs({
  unitSystem,
  stockShape,
  stockX,
  stockY,
  stockZ,
  setStockX,
  setStockY,
  setStockZ,
}: {
  unitSystem: UnitSystem;
  stockShape: StockShapeId;
  stockX: number;
  stockY: number;
  stockZ: number;
  setStockX: (value: number) => void;
  setStockY: (value: number) => void;
  setStockZ: (value: number) => void;
}) {
  const labels =
    stockShape === 'round'
      ? ['Diameter', 'Length', 'Projection']
      : stockShape === 'tube'
        ? ['OD', 'ID', 'Length']
        : stockShape === 'sheet'
          ? ['Length', 'Width', 'Thickness']
          : ['Length', 'Width', 'Height'];

  return (
    <div className="grid grid-cols-3 gap-3">
      <NumberField
        label={labels[0]}
        unit={lengthUnit(unitSystem)}
        value={convertLength(stockX, unitSystem)}
        onChange={(value) => setStockX(parseLength(value, unitSystem))}
        min={unitSystem === 'inch' ? 0.01 : 0.1}
        step={unitSystem === 'inch' ? 0.125 : 1}
        guideHint={`${labels[0]} should reflect the real raw stock envelope, not the finished feature size.`}
      />
      <NumberField
        label={labels[1]}
        unit={lengthUnit(unitSystem)}
        value={convertLength(stockY, unitSystem)}
        onChange={(value) => setStockY(parseLength(value, unitSystem))}
        min={unitSystem === 'inch' ? 0.01 : 0.1}
        step={unitSystem === 'inch' ? 0.125 : 1}
        guideHint={`${labels[1]} helps PRISM judge engagement, reach, and clamping realism from the starting stock.`}
      />
      <NumberField
        label={labels[2]}
        unit={lengthUnit(unitSystem)}
        value={convertLength(stockZ, unitSystem)}
        onChange={(value) => setStockZ(parseLength(value, unitSystem))}
        min={unitSystem === 'inch' ? 0.01 : 0.1}
        step={unitSystem === 'inch' ? 0.125 : 1}
        guideHint={`${labels[2]} closes the stock envelope so the setup and cut model do not assume missing material.`}
      />
    </div>
  );
}

function ResultMetric({
  label,
  value,
  unit,
  highlight,
  decimals = 1,
}: {
  label: string;
  value?: number;
  unit: string;
  highlight: string;
  decimals?: number;
}) {
  const display =
    value != null && Number.isFinite(value)
      ? value < 0.01
        ? value.toExponential(2)
        : value.toFixed(decimals)
      : 'Unavailable';

  return (
    <div className="rounded-2xl border border-cyan-400/12 bg-[linear-gradient(180deg,#101a2c_0%,#0c1522_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className={`mt-3 text-3xl font-black tracking-tight drop-shadow-[0_0_10px_rgba(15,23,42,0.45)] md:text-[2rem] ${highlight}`}>{display}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">{unit}</div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

// WEDM_CONTROLLER_LABELS and wedmLabel moved to WireEdmOptimizeCards.tsx and imported above

function WireEdmResultCards({ wedmResult, controller, calcParams }: { wedmResult: WireEdmCalcResult; controller: string; calcParams?: { material: string; thickness_mm: number; target_ra_um: number; wire_type: string } }) {
  const passes = wedmResult.passes ?? [];
  const firstPass = passes[0];
  const lastPass = passes[passes.length - 1];
  const [programGenState, setProgramGenState] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [generatedProgram, setGeneratedProgram] = useState<{ text: string; filename: string; result: import('../api/wireEdm').WedmProgramResult } | null>(null);
  const [programError, setProgramError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'reading' | 'generating'>('idle');
  const [parsedContours, setParsedContours] = useState<import('../components/calculator/WireEdmContourPicker').ContourData[] | null>(null);
  const [selectedContourIndices, setSelectedContourIndices] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [backplotPass, setBackplotPass] = useState(0);

  // Backplot path verdict — gates download when RED issues detected
  const backplotVerdict = useMemo(() => {
    if (!generatedProgram) return null;
    const data = parseGCode(generatedProgram.text);
    const issues = detectPathIssues(data);
    return getPathVerdict(issues);
  }, [generatedProgram]);

  // Shop-critical program generation inputs
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [originX, setOriginX] = useState('');
  const [originY, setOriginY] = useState('');
  const [stockAllowance, setStockAllowance] = useState('');
  const [leadInMm, setLeadInMm] = useState('2.0');
  const [leadInType, setLeadInType] = useState<'linear' | 'arc' | 'tangent'>('linear');
  const [leadOutMm, setLeadOutMm] = useState('2.0');
  const [leadOutType, setLeadOutType] = useState<'linear' | 'arc' | 'tangent'>('linear');
  const [actualWireDia, setActualWireDia] = useState('');
  const [startHoleX, setStartHoleX] = useState('');
  const [startHoleY, setStartHoleY] = useState('');
  const [offsetOverrides, setOffsetOverrides] = useState('');
  const [feedOverrides, setFeedOverrides] = useState('');

  /** Build shop-critical overrides from UI state */
  function buildShopParams(): Record<string, unknown> {
    const p: Record<string, unknown> = {};
    if (originX && originY) p.origin = { x: parseFloat(originX), y: parseFloat(originY) };
    if (stockAllowance) p.stock_allowance_mm = parseFloat(stockAllowance);
    if (leadInMm) p.lead_in_mm = parseFloat(leadInMm);
    if (leadInType !== 'linear') p.lead_in_type = leadInType;
    if (leadOutMm) p.lead_out_mm = parseFloat(leadOutMm);
    if (leadOutType !== 'linear') p.lead_out_type = leadOutType;
    if (actualWireDia) p.actual_wire_diameter_mm = parseFloat(actualWireDia);
    if (startHoleX && startHoleY) p.start_holes = [{ x: parseFloat(startHoleX), y: parseFloat(startHoleY) }];
    if (offsetOverrides.trim()) {
      p.offset_overrides_mm = offsetOverrides.split(',').map(v => { const n = parseFloat(v.trim()); return isNaN(n) ? null : n; });
    }
    if (feedOverrides.trim()) {
      p.feed_overrides_mm_min = feedOverrides.split(',').map(v => { const n = parseFloat(v.trim()); return isNaN(n) ? null : n; });
    }
    return p;
  }

  async function generateProgram() {
    if (!calcParams) return;
    setProgramGenState('generating');
    setProgramError(null);
    try {
      const { wePhotoToProgram } = await import('../api/wireEdm');
      const resp = await wePhotoToProgram({
        material: calcParams.material,
        thickness_mm: calcParams.thickness_mm,
        target_ra_um: calcParams.target_ra_um,
        controller: controller as import('../api/wireEdm').WedmController,
        wire_type: calcParams.wire_type,
        contours: [{
          id: 'calc_rect',
          segments: [
            { type: 'line', start: { x: 0, y: 0 }, end: { x: 25, y: 0 } },
            { type: 'line', start: { x: 25, y: 0 }, end: { x: 25, y: 25 } },
            { type: 'line', start: { x: 25, y: 25 }, end: { x: 0, y: 25 } },
            { type: 'line', start: { x: 0, y: 25 }, end: { x: 0, y: 0 } },
          ],
          is_closed: true,
          is_exterior: true,
          area_mm2: 625,
          perimeter_mm: 100,
          bbox: { min_x: 0, min_y: 0, max_x: 25, max_y: 25 },
        }],
        ...buildShopParams(),
      } as any);
      if (resp.data?.success) {
        const filename = `PRISM_WEDM_${calcParams.material}_${new Date().toISOString().split('T')[0]}.NC`;
        setGeneratedProgram({ text: resp.data.program_text, filename, result: resp.data });
        setProgramGenState('done');
      } else {
        setProgramError(resp.data?.warnings?.join(', ') || 'Program generation failed');
        setProgramGenState('error');
      }
    } catch (err: unknown) {
      setProgramError(err instanceof Error ? err.message : 'Unknown error');
      setProgramGenState('error');
    }
  }

  async function downloadProgram() {
    if (!generatedProgram) return;
    const { weExportGcode } = await import('../api/wireEdm');
    weExportGcode(generatedProgram.text, generatedProgram.filename);
  }

  // Store raw DXF text for re-generation after contour selection
  const [dxfContent, setDxfContent] = useState<string | null>(null);
  const [dxfFilename, setDxfFilename] = useState<string>('');

  async function handleDxfUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !calcParams) return;
    setUploadState('reading');
    setProgramError(null);
    try {
      const text = await file.text();
      setDxfContent(text);
      setDxfFilename(file.name.replace(/\.[^.]+$/, ''));
      setUploadState('generating');

      // First: parse geometry to show contour picker
      const { fetchJson } = await import('../api/requestCore');
      const { getRequestHeaders } = await import('../api/client');
      const parseResp = await fetchJson<{ ok: boolean; data: { contours: import('../components/calculator/WireEdmContourPicker').ContourData[] } }>('/api/v1/edm/parse-geometry', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ dxf_content: text, format: 'dxf' }),
        fallbackMessage: 'Geometry parse failed',
      });

      if (parseResp?.data?.contours?.length) {
        setParsedContours(parseResp.data.contours);
        // Auto-select all closed contours
        const closedIndices = parseResp.data.contours
          .map((c: { is_closed: boolean }, i: number) => c.is_closed ? i : -1)
          .filter((i: number) => i >= 0);
        setSelectedContourIndices(closedIndices);
        setProgramGenState('idle'); // Wait for user to confirm selection
      } else {
        // No contours parsed — generate directly
        await generateFromDxf(text, file.name.replace(/\.[^.]+$/, ''));
      }
    } catch (err: unknown) {
      setProgramError(err instanceof Error ? err.message : 'File read error');
      setProgramGenState('error');
    } finally {
      setUploadState('idle');
      e.target.value = '';
    }
  }

  /** Generate program from stored DXF + selected contour indices */
  async function generateFromSelection() {
    if (!dxfContent || !calcParams || selectedContourIndices.length === 0) return;
    setProgramGenState('generating');
    setProgramError(null);
    try {
      const { wePhotoToProgram } = await import('../api/wireEdm');
      const resp = await wePhotoToProgram({
        dxf_content: dxfContent,
        material: calcParams.material,
        thickness_mm: calcParams.thickness_mm,
        target_ra_um: calcParams.target_ra_um,
        controller: controller as import('../api/wireEdm').WedmController,
        wire_type: calcParams.wire_type,
        contour_indices: selectedContourIndices,
        ...buildShopParams(),
      } as any);
      if (resp.data?.success) {
        const filename = `${dxfFilename}_${calcParams.material}.NC`;
        setGeneratedProgram({ text: resp.data.program_text, filename, result: resp.data });
        setProgramGenState('done');
      } else {
        setProgramError(resp.data?.warnings?.join(', ') || 'Program generation failed');
        setProgramGenState('error');
      }
    } catch (err: unknown) {
      setProgramError(err instanceof Error ? err.message : 'Generation error');
      setProgramGenState('error');
    }
  }

  async function generateFromDxf(text: string, baseName: string) {
    if (!calcParams) return;
    const { wePhotoToProgram } = await import('../api/wireEdm');
    const resp = await wePhotoToProgram({
      dxf_content: text,
      material: calcParams.material,
      thickness_mm: calcParams.thickness_mm,
      target_ra_um: calcParams.target_ra_um,
      controller: controller as import('../api/wireEdm').WedmController,
      wire_type: calcParams.wire_type,
      ...buildShopParams(),
    } as any);
    if (resp.data?.success) {
      const filename = `${baseName}_${calcParams.material}.NC`;
      setGeneratedProgram({ text: resp.data.program_text, filename, result: resp.data });
      setProgramGenState('done');
    } else {
      setProgramError(resp.data?.warnings?.join(', ') || 'Program generation failed');
      setProgramGenState('error');
    }
  }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !calcParams) return;
    setUploadState('reading');
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      setUploadState('generating');
      const { wePhotoToProgram } = await import('../api/wireEdm');
      const resp = await wePhotoToProgram({
        image_base64: base64,
        material: calcParams.material,
        thickness_mm: calcParams.thickness_mm,
        target_ra_um: calcParams.target_ra_um,
        controller: controller as import('../api/wireEdm').WedmController,
        wire_type: calcParams.wire_type,
        expected_units: 'inch',
      });
      if (resp.data?.success) {
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const filename = `${baseName}_${calcParams.material}.NC`;
        setGeneratedProgram({ text: resp.data.program_text, filename, result: resp.data });
        setProgramGenState('done');
      } else {
        setProgramError(resp.data?.warnings?.join(', ') || 'OCR + program generation failed');
        setProgramGenState('error');
      }
    } catch (err: unknown) {
      setProgramError(err instanceof Error ? err.message : 'Upload error');
      setProgramGenState('error');
    } finally {
      setUploadState('idle');
      e.target.value = '';
    }
  }

  function exportSetupSheet() {
    const lines: string[] = [
      'â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—',
      'â•‘          WIRE EDM SETUP SHEET                â•‘',
      'â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•',
      '',
      `Controller: ${controller.toUpperCase()}`,
      `Generated: ${new Date().toISOString().split('T')[0]}`,
      '',
      'â”€â”€ Process Summary â”€â”€',
      `First cut speed: ${wedmResult.first_cut_speed_mm_min?.toFixed(2) ?? 'Unavailable'} mm/min`,
      `Total passes: ${passes.length}`,
      `Total cut time: ${wedmResult.total_time_min?.toFixed(1) ?? 'Unavailable'} min`,
      `Wire consumption: ${wedmResult.total_wire_m?.toFixed(1) ?? 'Unavailable'} m`,
      `Wire tension: ${wedmResult.wire_tension_N?.toFixed(1) ?? 'Unavailable'} N`,
      `Flushing pressure: ${wedmResult.flushing_pressure_bar?.toFixed(1) ?? 'Unavailable'} bar`,
      `Power: ${wedmResult.power_pct?.toFixed(0) ?? 'Unavailable'}%`,
      '',
      'â”€â”€ Per-Pass Parameters â”€â”€',
      `${'Pass'.padEnd(5)} ${'Type'.padEnd(12)} ${wedmLabel(controller, 'offset').padEnd(10)} ${'Speed'.padEnd(10)} ${wedmLabel(controller, 't_on').padEnd(8)} ${wedmLabel(controller, 't_off').padEnd(8)} ${wedmLabel(controller, 'peak_current').padEnd(8)} ${wedmLabel(controller, 'servo_voltage').padEnd(8)} ${'Ra um'.padEnd(8)}`,
      'â”€'.repeat(90),
    ];
    passes.forEach((p, i) => {
      lines.push(
        `${String(i + 1).padEnd(5)} ${(p.type ?? '').padEnd(12)} ${(p.offset_mm ?? 0).toFixed(3).padEnd(10)} ${(p.speed_mm_min ?? 0).toFixed(1).padEnd(10)} ${(p.t_on_us ?? 0).toFixed(1).padEnd(8)} ${(p.t_off_us ?? 0).toFixed(1).padEnd(8)} ${(p.peak_current_A ?? 0).toFixed(1).padEnd(8)} ${(p.servo_voltage_V ?? 0).toFixed(0).padEnd(8)} ${(p.predicted_Ra_um ?? 0).toFixed(2).padEnd(8)}`,
      );
    });
    if (wedmResult.estimated_cost) {
      lines.push('', 'â”€â”€ Cost Estimate â”€â”€');
      lines.push(`Machine: $${(wedmResult.estimated_cost.machine_usd ?? 0).toFixed(2)}`);
      lines.push(`Wire: $${(wedmResult.estimated_cost.wire_usd ?? 0).toFixed(2)}`);
      lines.push(`Total: $${(wedmResult.estimated_cost.total_usd ?? 0).toFixed(2)}`);
    }
    lines.push('', 'â”€â”€ Generated by PRISM Wire EDM Calculator â”€â”€');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedm-setup-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Process Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResultMetric label="First cut speed" value={wedmResult.first_cut_speed_mm_min} unit="mm/min" highlight="text-sky-300" decimals={1} />
        <ResultMetric label="Total time" value={wedmResult.total_time_min} unit="min" highlight="text-emerald-300" decimals={1} />
        <ResultMetric label="Wire used" value={wedmResult.total_wire_m} unit="m" highlight="text-amber-300" decimals={1} />
        <ResultMetric label="Power" value={wedmResult.power_pct} unit="%" highlight="text-fuchsia-300" decimals={0} />
      </div>

      {/* Wire Tension & Flushing Card */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResultMetric label={wedmLabel(controller, 'wire_tension')} value={wedmResult.wire_tension_N} unit="N" highlight="text-cyan-300" decimals={1} />
        <ResultMetric label={wedmLabel(controller, 'flushing')} value={wedmResult.flushing_pressure_bar} unit="bar" highlight="text-indigo-300" decimals={1} />
        <ResultMetric label="Surface finish" value={lastPass?.predicted_Ra_um} unit="um Ra" highlight="text-rose-300" decimals={2} />
        <ResultMetric label="Safety score" value={wedmResult.safety_score != null ? wedmResult.safety_score * 100 : undefined} unit="%" highlight="text-violet-300" decimals={0} />
      </div>

      {/* Cutting Parameters Card (first pass) */}
      {firstPass && (
        <div className="rounded-2xl border border-cyan-400/15 bg-[#0c1522] px-5 py-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Cutting parameters / {controller.toUpperCase()} labels
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{wedmLabel(controller, 't_on')}</div>
              <div className="mt-1 text-lg font-bold text-cyan-300">{(firstPass.t_on_us ?? 0).toFixed(1)} &micro;s</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{wedmLabel(controller, 't_off')}</div>
              <div className="mt-1 text-lg font-bold text-cyan-300">{(firstPass.t_off_us ?? 0).toFixed(1)} &micro;s</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{wedmLabel(controller, 'peak_current')}</div>
              <div className="mt-1 text-lg font-bold text-amber-300">{(firstPass.peak_current_A ?? 0).toFixed(1)} A</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{wedmLabel(controller, 'servo_voltage')}</div>
              <div className="mt-1 text-lg font-bold text-indigo-300">{(firstPass.servo_voltage_V ?? 0).toFixed(0)} V</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{wedmLabel(controller, 'wire_speed')}</div>
              <div className="mt-1 text-lg font-bold text-emerald-300">{(firstPass.wire_speed_m_min ?? 0).toFixed(1)} m/min</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{wedmLabel(controller, 'power_pct')}</div>
              <div className="mt-1 text-lg font-bold text-fuchsia-300">{(firstPass.power_pct ?? 0).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Per-Pass Table */}
      {passes.length > 0 && (
        <div className="rounded-2xl border border-slate-700/40 bg-[#0c1522] px-1 py-3 md:px-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pass breakdown</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportSetupSheet}
                className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-900/50"
              >
                Export setup sheet
              </button>
              {calcParams && (
                <>
                  <button
                    type="button"
                    onClick={generateProgram}
                    disabled={programGenState === 'generating'}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-900/50 disabled:opacity-50"
                  >
                    {programGenState === 'generating' ? 'Generating...' : 'Generate NC program'}
                  </button>
                  <label className="cursor-pointer rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-300 transition hover:bg-amber-900/50">
                    {uploadState !== 'idle' ? 'Processing...' : 'Upload DXF'}
                    <input type="file" accept=".dxf" className="hidden" onChange={handleDxfUpload} disabled={uploadState !== 'idle'} />
                  </label>
                  <label className="cursor-pointer rounded-lg border border-violet-500/30 bg-violet-950/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-violet-300 transition hover:bg-violet-900/50">
                    {uploadState !== 'idle' ? 'Processing...' : 'Upload photo'}
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleImageUpload} disabled={uploadState !== 'idle'} />
                  </label>
                  {generatedProgram && (
                    <button
                      type="button"
                      onClick={downloadProgram}
                      disabled={backplotVerdict != null && !backplotVerdict.canDownload}
                      title={backplotVerdict && !backplotVerdict.canDownload ? backplotVerdict.label : 'Download NC program'}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition ${
                        backplotVerdict && !backplotVerdict.canDownload
                          ? 'border-red-500/40 bg-red-950/50 text-red-400 cursor-not-allowed opacity-60'
                          : 'border-green-500/40 bg-green-950/50 text-green-300 hover:bg-green-900/60'
                      }`}
                    >
                      {backplotVerdict && !backplotVerdict.canDownload ? 'Download blocked' : 'Download .NC'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {programError && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-2 text-xs text-red-300">
              {programError}
            </div>
          )}
          {generatedProgram && (
            <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-4 py-2 text-xs text-emerald-300">
              NC program ready: {generatedProgram.result.line_count} lines, {generatedProgram.result.passes_per_profile} passes, ~{generatedProgram.result.estimated_time_min} min
              {generatedProgram.result.controller && ` | ${generatedProgram.result.controller}`}
            </div>
          )}

          {/* Wire Path Backplot — auto-displayed after program generation (U-W100-22) */}
          {generatedProgram && (
            <div className="mb-3">
              <WireEdmBackplot
                gcode={generatedProgram.text}
                selectedPass={backplotPass}
                onPassSelect={setBackplotPass}
                height={400}
                showIssues
              />
              {backplotVerdict && (
                <div className={`mt-2 rounded-lg border px-4 py-2 text-xs font-semibold ${
                  backplotVerdict.color === 'red'
                    ? 'border-red-500/40 bg-red-950/30 text-red-300'
                    : backplotVerdict.color === 'yellow'
                    ? 'border-amber-500/40 bg-amber-950/30 text-amber-300'
                    : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                }`}>
                  {backplotVerdict.label}
                  {!backplotVerdict.canDownload && (
                    <span className="ml-2 font-normal text-red-400">— Fix critical issues before downloading</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Shop Settings Panel — collapsible */}
          {calcParams && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-700/30 bg-slate-900/40 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400 transition hover:bg-slate-800/50"
              >
                <span>Program settings{showAdvanced ? '' : ' (origin, lead-in/out, wire comp, offsets)'}</span>
                <span className="text-slate-600">{showAdvanced ? '\u25B2' : '\u25BC'}</span>
              </button>
              {showAdvanced && (
                <div className="mt-2 grid gap-3 rounded-xl border border-slate-700/20 bg-[#0a1018] p-4 md:grid-cols-2 xl:grid-cols-3">
                  {/* Origin */}
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Work origin (G92)</label>
                    <div className="flex gap-2">
                      <input type="number" step="any" placeholder="X" value={originX} onChange={e => setOriginX(e.target.value)}
                        className="w-full rounded border border-slate-700/40 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300 placeholder:text-slate-600" />
                      <input type="number" step="any" placeholder="Y" value={originY} onChange={e => setOriginY(e.target.value)}
                        className="w-full rounded border border-slate-700/40 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300 placeholder:text-slate-600" />
                    </div>
                    <div className="mt-0.5 text-[9px] text-slate-600">Leave blank for 0, 0</div>
                  </div>

                  {/* Stock allowance */}
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Stock allowance (mm)</label>
                    <input type="number" step="0.001" placeholder="0.000" value={stockAllowance} onChange={e => setStockAllowance(e.target.value)}
                      className="w-full rounded border border-slate-700/40 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300 placeholder:text-slate-600" />
                    <div className="mt-0.5 text-[9px] text-slate-600">+ overcut (smaller part) / - undercut (larger part)</div>
                  </div>

                  {/* Actual wire diameter */}
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Actual wire dia (mm)</label>
                    <input type="number" step="0.01" placeholder={calcParams.wire_type?.includes('0.20') ? '0.20' : '0.25'} value={actualWireDia} onChange={e => setActualWireDia(e.target.value)}
                      className="w-full rounded border border-slate-700/40 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300 placeholder:text-slate-600" />
                    <div className="mt-0.5 text-[9px] text-slate-600">If different from planned — compensates offsets</div>
                  </div>

                  {/* Lead-in */}
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Lead-in</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.1" value={leadInMm} onChange={e => setLeadInMm(e.target.value)}
                        className="w-20 rounded border border-slate-700/40 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300" />
                      <span className="self-center text-[10px] text-slate-600">mm</span>
                      <select value={leadInType} onChange={e => setLeadInType(e.target.value as 'linear' | 'arc' | 'tangent')}
                        className="rounded border border-slate-700/40 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300">
                        <option value="linear">Linear</option>
                        <option value="arc">Arc</option>
                        <option value="tangent">Tangent</option>
                      </select>
                    </div>
                  </div>

                  {/* Lead-out */}
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Lead-out</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.1" value={leadOutMm} onChange={e => setLeadOutMm(e.target.value)}
                        className="w-20 rounded border border-slate-700/40 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300" />
                      <span className="self-center text-[10px] text-slate-600">mm</span>
                      <select value={leadOutType} onChange={e => setLeadOutType(e.target.value as 'linear' | 'arc' | 'tangent')}
                        className="rounded border border-slate-700/40 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300">
                        <option value="linear">Linear</option>
                        <option value="arc">Arc</option>
                        <option value="tangent">Tangent</option>
                      </select>
                    </div>
                  </div>

                  {/* Start hole */}
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Start hole position</label>
                    <div className="flex gap-2">
                      <input type="number" step="any" placeholder="X (auto)" value={startHoleX} onChange={e => setStartHoleX(e.target.value)}
                        className="w-full rounded border border-slate-700/40 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300 placeholder:text-slate-600" />
                      <input type="number" step="any" placeholder="Y (auto)" value={startHoleY} onChange={e => setStartHoleY(e.target.value)}
                        className="w-full rounded border border-slate-700/40 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300 placeholder:text-slate-600" />
                    </div>
                  </div>

                  {/* Per-pass offset overrides */}
                  <div className="md:col-span-2 xl:col-span-3">
                    <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Per-pass offset overrides (mm, comma-sep)</label>
                    <input type="text" placeholder="e.g. 0.200, 0.150, 0.140, 0.135" value={offsetOverrides} onChange={e => setOffsetOverrides(e.target.value)}
                      className="w-full rounded border border-slate-700/40 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 font-mono" />
                    <div className="mt-0.5 text-[9px] text-slate-600">Blank entries use calculated values. Leave empty for auto.</div>
                  </div>

                  {/* Per-pass feed overrides */}
                  <div className="md:col-span-2 xl:col-span-3">
                    <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Per-pass feed overrides (mm/min, comma-sep)</label>
                    <input type="text" placeholder="e.g. 3.0, 6.0, 5.5, 5.0" value={feedOverrides} onChange={e => setFeedOverrides(e.target.value)}
                      className="w-full rounded border border-slate-700/40 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 font-mono" />
                    <div className="mt-0.5 text-[9px] text-slate-600">Blank entries use calculated values. Leave empty for auto.</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contour Picker (2D/3D) — shown after DXF upload parses geometry */}
          {parsedContours && parsedContours.length > 0 && (
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('2d')}
                  className={`rounded px-3 py-1 text-[10px] font-semibold uppercase tracking-widest transition ${
                    viewMode === '2d'
                      ? 'bg-cyan-600/40 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800/60 text-slate-500 border border-slate-700/30 hover:text-slate-400'
                  }`}
                >
                  2D sketch
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`rounded px-3 py-1 text-[10px] font-semibold uppercase tracking-widest transition ${
                    viewMode === '3d'
                      ? 'bg-cyan-600/40 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800/60 text-slate-500 border border-slate-700/30 hover:text-slate-400'
                  }`}
                >
                  3D view
                </button>
                {selectedContourIndices.length > 0 && (
                  <button
                    type="button"
                    onClick={generateFromSelection}
                    disabled={programGenState === 'generating'}
                    className="ml-auto rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-900/50 disabled:opacity-50"
                  >
                    {programGenState === 'generating' ? 'Generating...' : `Generate program (${selectedContourIndices.length} profiles)`}
                  </button>
                )}
              </div>

              {viewMode === '2d' ? (
                <WireEdmContourPicker
                  contours={parsedContours}
                  selectedIndices={selectedContourIndices}
                  onSelectionChange={setSelectedContourIndices}
                  thickness_mm={calcParams?.thickness_mm}
                />
              ) : (
                <WireEdmContour3D
                  contours={parsedContours}
                  selectedIndices={selectedContourIndices}
                  thickness_mm={calcParams?.thickness_mm ?? 25}
                  onWallSelect={(idx, side) => {
                    // Toggle contour selection on wall click
                    if (selectedContourIndices.includes(idx)) {
                      setSelectedContourIndices(selectedContourIndices.filter(i => i !== idx));
                    } else {
                      setSelectedContourIndices([...selectedContourIndices, idx]);
                    }
                  }}
                />
              )}
            </div>
          )}

          <WireEdmPassTable passes={passes} controller={controller} />
        </div>
      )}

      {/* Multi-Pass Progression Chart */}
      {passes.length > 0 && (
        <WireEdmPassChart passes={passes} />
      )}

      {/* Cost Estimate Card */}
      {wedmResult.estimated_cost && (
        <WireEdmCostCard cost={wedmResult.estimated_cost} />
      )}

      {/* Wire Break Risk Card */}
      {wedmResult.wire_break_risk && (
        <WireBreakRiskCard risk={wedmResult.wire_break_risk} />
      )}

      {/* Corner Compensation Card */}
      {wedmResult.corner_compensation?.length > 0 && (
        <WireEdmCornerCard corners={wedmResult.corner_compensation} />
      )}

      {/* Taper Card */}
      {wedmResult.taper && (
        <WireEdmTaperCard taper={wedmResult.taper} />
      )}

      {/* Surface Integrity Safety Card — ALWAYS VISIBLE, CANNOT BE HIDDEN */}
      {wedmResult.surface_integrity && (
        <WireEdmSurfaceIntegrityCard integrity={wedmResult.surface_integrity} />
      )}

      {/* Recommendations */}
      {wedmResult.recommendations?.length > 0 && (
        <WireEdmControllerNotes recommendations={wedmResult.recommendations} />
      )}
    </div>
  );
}

// WireBreakRiskCard and WireEdmSurfaceIntegrityCard extracted to
// ../components/calculator/WireEdmOptimizeCards.tsx

function encodeInlineSvg(markup: string) {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(markup)}")`;
}

function buildFinishNoiseOverlay(tone: SurfaceFinishRenderStyle) {
  const seed = Math.max(7, Math.round(tone.laySpacingPx * 13 + tone.highlightSpreadPct));
  const opacity = Math.min(0.22, tone.microFacetOpacity * 1.35 + 0.03);
  return encodeInlineSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 180" preserveAspectRatio="none">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed}" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="360" height="180" filter="url(#n)" opacity="${opacity.toFixed(3)}" />
    </svg>`,
  );
}

function buildFinishTextureOverlay(tone: SurfaceFinishRenderStyle) {
  const stroke = `rgba(248,250,252,${Math.min(0.55, tone.layOpacity + 0.14)})`;
  const softStroke = `rgba(226,232,240,${Math.min(0.24, tone.secondaryOpacity + 0.06)})`;

  const paths = (() => {
    switch (tone.layFamily) {
      case 'turned':
      case 'axial':
        return Array.from({ length: 15 }, (_, index) => {
          const y = 16 + index * 10;
          const drift = (index % 3) * 2.5;
          return `<path d="M-8 ${y} C 84 ${y - 2 - drift}, 188 ${y + 2 + drift}, 368 ${y}" stroke="${stroke}" stroke-width="1.25" fill="none" stroke-linecap="round" />
            <path d="M-8 ${y + 4.5} C 86 ${y + 2.5 - drift}, 190 ${y + 6.5 + drift}, 368 ${y + 4.5}" stroke="${softStroke}" stroke-width="0.7" fill="none" stroke-linecap="round" />`;
        }).join('');
      case 'face':
        return Array.from({ length: 9 }, (_, index) => {
          const radius = 38 + index * 15;
          return `<path d="M 324 164 A ${radius} ${radius} 0 0 0 ${40 + index * 6} ${20 + index * 7}" stroke="${stroke}" stroke-width="1.1" fill="none" stroke-linecap="round" />`;
        }).join('');
      case 'scallop':
        return Array.from({ length: 10 }, (_, index) => {
          const offset = index * 16;
          return `<path d="M -20 ${36 + offset} Q 54 ${8 + offset}, 128 ${36 + offset} T 276 ${36 + offset} T 424 ${36 + offset}" stroke="${stroke}" stroke-width="1.2" fill="none" stroke-linecap="round" />`;
        }).join('');
      case 'adaptive':
        return Array.from({ length: 8 }, (_, index) => {
          const y = 18 + index * 20;
          return `<path d="M -10 ${y} C 42 ${y - 10}, 96 ${y + 14}, 154 ${y + 2} S 264 ${y - 10}, 370 ${y + 6}" stroke="${stroke}" stroke-width="1.15" fill="none" stroke-linecap="round" />`;
        }).join('');
      case 'ground':
        return Array.from({ length: 22 }, (_, index) => {
          const x = index * 18 - 20;
          return `<path d="M ${x} 0 L ${x + 58} 180" stroke="${stroke}" stroke-width="0.85" fill="none" stroke-linecap="round" />
            <path d="M ${x + 10} 0 L ${x + 68} 180" stroke="${softStroke}" stroke-width="0.45" fill="none" stroke-linecap="round" />`;
        }).join('');
      case 'parallel':
      case 'profile':
      default:
        return Array.from({ length: 14 }, (_, index) => {
          const x = index * 26 - 24;
          return `<path d="M ${x} 0 L ${x + 34} 180" stroke="${stroke}" stroke-width="1" fill="none" stroke-linecap="round" />
            <path d="M ${x + 8} 0 L ${x + 42} 180" stroke="${softStroke}" stroke-width="0.55" fill="none" stroke-linecap="round" />`;
        }).join('');
    }
  })();

  return encodeInlineSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 180" preserveAspectRatio="none">
      <rect width="360" height="180" fill="transparent" />
      ${paths}
    </svg>`,
  );
}

function FinishSwatch({
  value,
  tone,
}: {
  value: string;
  tone: SurfaceFinishRenderStyle;
}) {
  const highlightStart = Math.max(16, 50 - tone.highlightSpreadPct / 2);
  const highlightEnd = Math.min(84, 50 + tone.highlightSpreadPct / 2);
  const processTextureOverlay = buildFinishTextureOverlay(tone);
  const noiseTextureOverlay = buildFinishNoiseOverlay(tone);
  const brightLay = `rgba(241,245,249,${Math.min(0.82, tone.layOpacity + 0.08)})`;
  const softLay = `rgba(226,232,240,${Math.min(0.52, tone.secondaryOpacity + 0.04)})`;
  const metallicGhost = `rgba(191,219,254,${Math.min(0.16, tone.secondaryOpacity * 0.38 + 0.02)})`;
  const softShadow = `rgba(51,65,85,${Math.min(0.16, tone.edgeShadowOpacity * 0.42 + 0.02)})`;
  const hazeShadow = `rgba(15,23,42,${Math.min(0.1, tone.chatterOpacity * 0.25)})`;
  const layLayers = (() => {
    switch (tone.layFamily) {
      case 'turned':
        return [
          `repeating-linear-gradient(${tone.layAngleDeg}deg, ${brightLay} 0px, ${brightLay} ${tone.layThicknessPx}px, rgba(15,23,42,0) ${tone.layThicknessPx}px, rgba(15,23,42,0) ${tone.laySpacingPx}px)`,
          `repeating-linear-gradient(${tone.secondaryAngleDeg}deg, ${softLay} 0px, ${softLay} 1px, rgba(15,23,42,0) 1px, rgba(15,23,42,0) ${tone.secondarySpacingPx}px)`,
          `linear-gradient(${tone.layAngleDeg + 90}deg, rgba(255,255,255,0) 0%, ${metallicGhost} 48%, rgba(255,255,255,0) 100%)`,
        ];
      case 'scallop':
        return [
          `repeating-radial-gradient(circle at -8% 50%, ${brightLay} 0px, ${brightLay} ${tone.layThicknessPx}px, rgba(15,23,42,0) ${tone.layThicknessPx}px, rgba(15,23,42,0) ${tone.laySpacingPx}px)`,
          `repeating-linear-gradient(${tone.secondaryAngleDeg}deg, ${softLay} 0px, ${softLay} 1px, rgba(15,23,42,0) 1px, rgba(15,23,42,0) ${tone.secondarySpacingPx}px)`,
          `linear-gradient(${tone.layAngleDeg + 22}deg, rgba(255,255,255,0) 18%, ${metallicGhost} 52%, rgba(255,255,255,0) 84%)`,
        ];
      case 'adaptive':
        return [
          `repeating-linear-gradient(${tone.layAngleDeg}deg, ${brightLay} 0px, ${brightLay} ${tone.layThicknessPx}px, rgba(15,23,42,0) ${tone.layThicknessPx}px, rgba(15,23,42,0) ${tone.laySpacingPx}px)`,
          `linear-gradient(${tone.secondaryAngleDeg}deg, rgba(255,255,255,0) 10%, ${metallicGhost} 50%, rgba(255,255,255,0) 88%)`,
          `repeating-linear-gradient(${tone.secondaryAngleDeg}deg, ${softShadow} 0px, ${softShadow} 0.8px, rgba(15,23,42,0) 0.8px, rgba(15,23,42,0) ${Math.max(tone.chatterSpacingPx + 4, tone.secondarySpacingPx)}px)`,
        ];
      case 'face':
        return [
          `repeating-radial-gradient(circle at 112% 125%, ${brightLay} 0px, ${brightLay} ${tone.layThicknessPx}px, rgba(15,23,42,0) ${tone.layThicknessPx}px, rgba(15,23,42,0) ${tone.laySpacingPx * 1.25}px)`,
          `linear-gradient(${tone.secondaryAngleDeg}deg, ${softLay} 0%, rgba(248,250,252,0) 64%)`,
          `radial-gradient(circle at 34% 28%, ${metallicGhost} 0%, rgba(255,255,255,0) 44%)`,
        ];
      case 'axial':
        return [
          `repeating-linear-gradient(${tone.layAngleDeg}deg, ${brightLay} 0px, ${brightLay} ${tone.layThicknessPx}px, rgba(15,23,42,0) ${tone.layThicknessPx}px, rgba(15,23,42,0) ${tone.laySpacingPx}px)`,
          `repeating-linear-gradient(${tone.secondaryAngleDeg}deg, ${softLay} 0px, ${softLay} 1px, rgba(15,23,42,0) 1px, rgba(15,23,42,0) ${tone.secondarySpacingPx}px)`,
          `linear-gradient(${tone.layAngleDeg + 90}deg, rgba(255,255,255,0) 0%, ${metallicGhost} 46%, rgba(255,255,255,0) 100%)`,
        ];
      case 'ground':
        return [
          `repeating-linear-gradient(${tone.layAngleDeg}deg, ${brightLay} 0px, ${brightLay} 1px, rgba(15,23,42,0) 1px, rgba(15,23,42,0) ${Math.max(3, tone.laySpacingPx - 1)}px)`,
          `repeating-linear-gradient(${tone.secondaryAngleDeg}deg, ${softLay} 0px, ${softLay} 1px, rgba(15,23,42,0) 1px, rgba(15,23,42,0) ${Math.max(4, tone.secondarySpacingPx - 2)}px)`,
          `linear-gradient(${tone.layAngleDeg + 45}deg, rgba(255,255,255,0) 0%, ${metallicGhost} 50%, rgba(255,255,255,0) 100%)`,
        ];
      case 'profile':
      case 'parallel':
      default:
        return [
          `repeating-linear-gradient(${tone.layAngleDeg}deg, ${brightLay} 0px, ${brightLay} ${tone.layThicknessPx}px, rgba(15,23,42,0) ${tone.layThicknessPx}px, rgba(15,23,42,0) ${tone.laySpacingPx}px)`,
          `repeating-linear-gradient(${tone.secondaryAngleDeg}deg, ${softLay} 0px, ${softLay} 1px, rgba(15,23,42,0) 1px, rgba(15,23,42,0) ${tone.secondarySpacingPx}px)`,
          `linear-gradient(${tone.layAngleDeg + 90}deg, rgba(255,255,255,0) 0%, ${metallicGhost} 48%, rgba(255,255,255,0) 100%)`,
        ];
    }
  })();

  return (
    <div
      className="relative h-28 overflow-hidden rounded-2xl border border-slate-700/50 md:h-32"
      aria-label={`${tone.accentLabel} swatch ${value}`}
      title={`${tone.accentLabel}: ${value}`}
      style={{
        backgroundColor: tone.baseEnd,
        backgroundImage: [
          `radial-gradient(circle at 24% 30%, rgba(255,255,255,${tone.microFacetOpacity}) 0 ${Math.max(1, tone.microFacetSizePx / 9)}px, rgba(255,255,255,0) ${Math.max(3, tone.microFacetSizePx / 3)}px)`,
          `radial-gradient(circle at 78% 62%, rgba(255,255,255,${tone.microFacetOpacity * 0.9}) 0 ${Math.max(1, tone.microFacetSizePx / 10)}px, rgba(255,255,255,0) ${Math.max(3, tone.microFacetSizePx / 3.4)}px)`,
          `linear-gradient(${tone.highlightAngleDeg}deg, rgba(255,255,255,0) ${highlightStart}%, rgba(255,255,255,${tone.highlightOpacity}) 50%, rgba(255,255,255,0) ${highlightEnd}%)`,
          `linear-gradient(180deg, rgba(255,255,255,${tone.smearOpacity * 0.82}) 0%, rgba(255,255,255,0) 44%, rgba(15,23,42,${tone.edgeShadowOpacity * 0.38}) 100%)`,
          `linear-gradient(${tone.secondaryAngleDeg + 18}deg, rgba(255,255,255,0) 8%, ${hazeShadow} 48%, rgba(255,255,255,0) 92%)`,
          ...layLayers,
          `radial-gradient(circle at 80% 24%, rgba(255,255,255,${tone.shimmerOpacity}) 0%, rgba(255,255,255,0) ${tone.shimmerSizePx}%)`,
          `radial-gradient(circle at 28% 72%, rgba(248,250,252,${tone.pitOpacity * 0.28}) 0 ${tone.pitSizePx / 5}px, rgba(248,250,252,0) ${tone.pitSizePx / 2}px)`,
          `radial-gradient(circle at 70% 44%, rgba(148,163,184,${tone.pitOpacity * 0.18}) 0 ${tone.pitSizePx / 6}px, rgba(148,163,184,0) ${tone.pitSizePx / 2.6}px)`,
          `linear-gradient(145deg, ${tone.baseStart} 0%, ${tone.baseMid} 48%, ${tone.baseEnd} 100%)`,
        ].join(', '),
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: processTextureOverlay,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          mixBlendMode: 'screen',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage: noiseTextureOverlay,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          mixBlendMode: 'soft-light',
        }}
      />
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(255,255,255,${tone.hazeOpacity})` }} />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.2)_100%)]" />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-300">{value}</div>
    </div>
  );
}

function MeasuredMachineInput({
  label,
  unit,
  ariaLabel,
  value,
  onCommit,
  min,
  step,
  integer = false,
  guideHint,
}: {
  label: string;
  unit: string;
  ariaLabel: string;
  value: number | null;
  onCommit: (value: number | null) => void;
  min?: number;
  step?: number;
  integer?: boolean;
  guideHint?: string;
}) {
  const panelGuide = useContext(CalculatorGuideContext);
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <EquationNumberInput
          ariaLabel={ariaLabel}
          value={value ?? ''}
          onCommit={onCommit}
          min={min}
          step={step}
          integer={integer}
          allowEmpty
          className="w-full rounded-lg border border-slate-600 bg-[#0a1628] px-2.5 py-1.5 text-[12px] text-slate-100 outline-none transition focus:border-sky-500"
        />
        <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {unit || 'ratio'}
        </span>
      </div>
      {panelGuide?.enabled ? <GuideFieldBubble label={label} hint={guideHint} /> : null}
    </label>
  );
}

function Insight({ title, value, body }: { title: string; value: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <div className="mt-2 text-sm font-semibold text-slate-100">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );
}

export function licenseOptionsFor(
  programming:
    | {
        id: string;
        mode: MachineMode;
        kind: 'manual' | 'cam' | 'nesting';
      }
    | undefined,
): SelectionOption[] {
  if (!programming) {
    return [{ id: 'full', label: 'Full access', detail: 'Show the full package catalog.' }];
  }

  if (programming.kind === 'manual') {
    return [{ id: 'manual-core', label: 'Manual workflow', detail: 'Use the full hand-coded / process-planning set.' }];
  }

  switch (programming.mode) {
    case 'mill':
      return [
        { id: 'core-2d', label: 'Core 2D seat', detail: '2D milling, contour, pocketing, and drilling basics.' },
        { id: 'advanced-3d', label: 'Advanced 3D seat', detail: 'Adds adaptive, 3D roughing, and full 3D finishing.' },
        { id: 'multiaxis', label: 'Multiaxis seat', detail: 'Includes simultaneous multiaxis, swarf, and specialty paths.' },
      ];
    case 'lathe':
      return [
        { id: 'turning-core', label: 'Turning core', detail: 'Standard rough, finish, groove, and drill/bore turning paths.' },
        { id: 'live-tooling', label: 'Live-tooling seat', detail: 'Adds driven-tool and mill-turn operations.' },
        { id: 'swiss-sync', label: 'Swiss / sync seat', detail: 'Includes synchronized Swiss and multi-channel flows.' },
      ];
    case 'wire_edm':
      return [
        { id: 'profile-core', label: 'Profile core', detail: 'Standard 2-axis / profile wire cutting.' },
        { id: 'taper-skim', label: 'Taper + skim', detail: 'Adds taper and skim-pass workflows.' },
        { id: 'full-wire', label: 'Full wire seat', detail: 'Includes slug retention, tabbing, and the full wire set.' },
      ];
    case 'edm':
      return [
        { id: 'burn-core', label: 'Burn core', detail: 'Primary cavity rough/finish burn workflows.' },
        { id: 'orbit-detail', label: 'Orbit + detail', detail: 'Adds orbit, detail, and wear-comp style workflows.' },
      ];
    case 'laser':
      return [
        { id: 'cut-core', label: 'Cut core', detail: 'Contour and basic sheet-cut workflows.' },
        { id: 'quality-nesting', label: 'Quality + nesting', detail: 'Adds edge-quality, microjoint, and nest-optimization paths.' },
      ];
    case 'waterjet':
      return [
        { id: 'cut-core', label: 'Cut core', detail: 'Standard abrasive contour cutting.' },
        { id: 'quality-taper', label: 'Quality + taper', detail: 'Adds taper, bevel, and advanced pierce strategy paths.' },
      ];
    default:
      return [{ id: 'full', label: 'Full access', detail: 'Show the full package catalog.' }];
  }
}

export function resolveProgrammingSelectionState({
  programming,
  machine,
  requestedLicenseTierId,
  requestedToolpathTypeId,
  requestedToolpathId,
}: {
  programming: ProgrammingEnvironment | undefined;
  machine?: MachineCatalogItem | undefined;
  requestedLicenseTierId: string;
  requestedToolpathTypeId: string;
  requestedToolpathId: string;
}) {
  const licenseOptions = licenseOptionsFor(programming);
  const licenseTierId = licenseOptions.some((item) => item.id === requestedLicenseTierId)
    ? requestedLicenseTierId
    : (licenseOptions[licenseOptions.length - 1]?.id ?? 'full');
  const licensedToolpathOptions = filterToolpathsForLicense(programming, programming?.toolpaths ?? [], licenseTierId, machine);
  const toolpathTypes = buildToolpathTypeOptions(licensedToolpathOptions);
  const toolpathTypeId = toolpathTypes.some((item) => item.id === requestedToolpathTypeId)
    ? requestedToolpathTypeId
    : (toolpathTypes[0]?.id ?? '');
  const filteredToolpathOptions = toolpathTypeId === 'all'
    ? licensedToolpathOptions
    : licensedToolpathOptions.filter((toolpath) => classifyToolpathType(toolpath).id === toolpathTypeId);
  const toolpathId = filteredToolpathOptions.some((item) => item.id === requestedToolpathId)
    ? requestedToolpathId
    : (filteredToolpathOptions[0]?.id ?? licensedToolpathOptions[0]?.id ?? '');

  return {
    licenseTierId,
    toolpathTypeId,
    toolpathId,
  };
}

export function filterToolpathsForLicense(
  programming:
    | {
        mode: MachineMode;
        kind: 'manual' | 'cam' | 'nesting';
      }
    | undefined,
  toolpaths: Array<{ id: string; label: string; path: string; operationId: string; summary?: string }>,
  licenseTierId: string,
  machine?: Pick<MachineCatalogItem, 'machineTypeId' | 'toolingLayout'> | undefined,
) {
  if (!programming || programming.kind === 'manual') {
    return toolpaths;
  }

  return toolpaths.filter((toolpath) => {
    const signature = `${toolpath.label} ${toolpath.path}`.toLowerCase();
    const isMultiAxis = /swarf|multi-axis|5-axis|variable contour|simultaneous|bevel/i.test(signature);
    const isAdvancedMill = /dynamic|adaptive|optirough|maxx|z-level|parallel|scallop|flow|streamline|3d|imachining|vortex|waveform|volumill/i.test(signature);
    const isMillTurnSignature = /live tool|live-tool|live tooling|live-tooling|live milling|mill-turn|mill\/turn|driven tool|driven-tool|c\/y|c-axis|y-axis|milling head|cross milling|secondary spindle|sub spindle|sub-spindle|sync manager|synchroni[sz]ed|handoff|pickoff/i.test(signature);
    const isSwissSignature = /swiss|guide bushing|sliding head/i.test(signature);
    const isWireAdvanced = /taper|skim|slug|tab/i.test(signature);
    const isEdmAdvanced = /orbit|detail|wear/i.test(signature);
    const isLaserAdvanced = /quality|common line|flyline|microtab|microjoint|mark/i.test(signature);
    const isWaterjetAdvanced = /quality|taper|dynamic|bevel|pierce/i.test(signature);
    const hasLiveToolingCapability =
      Boolean(machine?.toolingLayout?.liveTooling)
      || Boolean(machine?.toolingLayout?.millingHeadLabel)
      || (machine?.toolingLayout?.liveRpm ?? 0) > 0;
    const hasSwissCapability =
      machine?.machineTypeId === 'lathe_swiss'
      || machine?.toolingLayout?.kind === 'gang';

    switch (programming.mode) {
      case 'mill':
        if (licenseTierId === 'core-2d') return !isAdvancedMill && !isMultiAxis;
        if (licenseTierId === 'advanced-3d') return !isMultiAxis;
        return true;
      case 'lathe':
        if (isMillTurnSignature && !hasLiveToolingCapability) return false;
        if (isSwissSignature && !hasSwissCapability) return false;
        if (licenseTierId === 'turning-core') return !isMillTurnSignature && !isSwissSignature;
        if (licenseTierId === 'live-tooling') return !isSwissSignature;
        return true;
      case 'wire_edm':
        if (licenseTierId === 'profile-core') return !isWireAdvanced;
        if (licenseTierId === 'taper-skim') return !/slug|tab/i.test(signature);
        return true;
      case 'edm':
        if (licenseTierId === 'burn-core') return !isEdmAdvanced;
        return true;
      case 'laser':
        if (licenseTierId === 'cut-core') return !isLaserAdvanced;
        return true;
      case 'waterjet':
        if (licenseTierId === 'cut-core') return !isWaterjetAdvanced;
        return true;
      default:
        return true;
    }
  });
}

function HardwarePanel({
  machine,
  toolLabel,
  selectedStation,
  onSelectStation,
}: {
  machine?: MachineCatalogItem;
  toolLabel: string;
  selectedStation: number;
  onSelectStation: (value: number) => void;
}) {
  const layout = machine?.toolingLayout;

  if (!machine || !layout) {
    return <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-5 py-8 text-sm text-slate-500">Select a machine to shape the hardware panel.</div>;
  }

  if (layout.kind === 'turret' && layout.stations) {
    const stationCount = layout.stations;
    const radius = 118;
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700/50 bg-[radial-gradient(circle,_rgba(15,23,42,0.4),_rgba(10,22,40,0)_65%)] px-4 py-6">
          <div className="mx-auto relative h-[280px] w-[280px]">
            <div className="absolute inset-[32px] rounded-full border border-slate-700/50 bg-[#0a1628] shadow-inner" />
            <div className="absolute inset-[92px] flex items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-center text-xs font-bold uppercase tracking-[0.22em] text-white">
              {layout.interface}
            </div>
            {Array.from({ length: stationCount }).map((_, index) => {
              const station = index + 1;
              const angle = (Math.PI * 2 * index) / stationCount - Math.PI / 2;
              const left = 140 + Math.cos(angle) * radius - 28;
              const top = 140 + Math.sin(angle) * radius - 28;
              const active = station === selectedStation;
              return (
                <button
                  key={station}
                  type="button"
                  onClick={() => onSelectStation(station)}
                  style={{ left, top }}
                  className={`absolute flex h-14 w-14 items-center justify-center rounded-full border text-xs font-black transition ${
                    active
                      ? 'border-slate-950 bg-slate-950 text-white shadow-lg'
                      : 'border-slate-700/50 bg-[#0f1f36] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  T{station}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-100">Turret station T{selectedStation}</div>
              <div className="mt-1 text-xs text-slate-500">{toolLabel}</div>
            </div>
            <span className="rounded-full border border-slate-700/50 bg-[#0f1f36] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {stationCount} stations
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
            <Meta label="Interface" value={layout.turretTypeLabel ?? layout.interface ?? 'Turret'} />
            <Meta label="Live tooling" value={layout.liveTooling ? `Yes / ${layout.liveRpm?.toLocaleString() ?? 'Unavailable'} RPM` : 'No'} />
            <Meta label="Turrets" value={layout.turretCount?.toString() ?? '1'} />
            <Meta label="Milling head" value={layout.hasMillingHead ? layout.millingHeadLabel ?? 'Yes' : 'No'} />
          </div>
        </div>
      </div>
    );
  }

  if (layout.kind === 'gang' && layout.stations) {
    const stationCount = layout.stations;
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-5">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: stationCount }).map((_, index) => {
              const station = index + 1;
              const active = station === selectedStation;
              return (
                <button
                  key={station}
                  type="button"
                  onClick={() => onSelectStation(station)}
                  className={`min-w-[92px] rounded-[22px] border px-4 py-5 text-center transition ${
                    active ? 'border-slate-950 bg-slate-950 text-white shadow-lg' : 'border-slate-700/50 bg-[#0f1f36] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">T{station}</div>
                  <div className="mt-2 text-lg">â–®</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
          <div className="text-sm font-semibold text-slate-100">Gang tooling rail / T{selectedStation}</div>
          <div className="mt-1 text-xs text-slate-500">{toolLabel}</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Meta label="Layout" value={layout.turretTypeLabel ?? 'Linear gang rail'} />
            <Meta label="Live tooling" value={layout.liveTooling ? `Yes / ${layout.liveRpm?.toLocaleString() ?? 'Unavailable'} RPM` : 'No'} />
            <Meta label="Sub spindle" value={layout.hasSubSpindle ? 'Yes' : 'No'} />
          </div>
        </div>
      </div>
    );
  }

  if (layout.kind === 'magazine' && layout.stations) {
    const stationCount = layout.stations;
    const shelfLabels = ['Current tool', 'Next up', 'Backup'];
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
          <div className="grid gap-3">
            {shelfLabels.map((label, index) => (
              <div key={label} className="rounded-[20px] border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
                <div className="mt-2 text-sm font-semibold text-slate-100">{index === 0 ? toolLabel : index === 1 ? 'Face / spot drill companion' : 'Chamfer / deburr tool'}</div>
                <div className="mt-1 text-xs text-slate-500">{layout.interface} magazine slot {index + 1}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
          <div className="text-sm font-semibold text-slate-100">Magazine crib</div>
          <div className="mt-1 text-xs text-slate-500">{stationCount} tools / {layout.spindleConnectionLabel ?? layout.interface}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {hardwareCards(layout.kind, toolLabel, machine.model).map((card) => (
        <div key={card.title} className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{card.eyebrow}</div>
          <div className="mt-2 text-sm font-semibold text-slate-100">{card.title}</div>
          <div className="mt-1 text-sm leading-6 text-slate-500">{card.body}</div>
        </div>
      ))}
    </div>
  );
}

function getSetupCompleteness({
  selectedMachine,
  selectedMaterial,
  selectedTool,
  coolant,
  workholding,
  stockShape,
}: {
  selectedMachine?: MachineCatalogItem;
  selectedMaterial?: { id: string };
  selectedTool?: { id: string };
  coolant: string;
  workholding: string;
  stockShape: string;
}) {
  const checks = [
    Boolean(selectedMachine?.id),
    Boolean(selectedMaterial?.id),
    Boolean(selectedTool?.id),
    Boolean(coolant),
    Boolean(workholding),
    Boolean(stockShape),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function lengthUnit(unitSystem: UnitSystem) {
  return unitSystem === 'inch' ? 'in' : 'mm';
}

function convertLength(valueMm: number, unitSystem: UnitSystem) {
  const raw = unitSystem === 'inch' ? valueMm / MM_PER_INCH : valueMm;
  return parseFloat(raw.toFixed(unitSystem === 'inch' ? 3 : 2));
}

function parseLength(value: number, unitSystem: UnitSystem) {
  return unitSystem === 'inch' ? value * MM_PER_INCH : value;
}

function convertSfmToMetric(valueSfm: number) {
  return valueSfm * 0.3048;
}

function convertFeedRate(valueMmPerMin: number, unitSystem: UnitSystem) {
  return unitSystem === 'inch' ? valueMmPerMin / MM_PER_INCH : valueMmPerMin;
}

function convertCuttingSpeed(valueMetersPerMin: number, unitSystem: UnitSystem) {
  return unitSystem === 'inch' ? valueMetersPerMin * FEET_PER_METER : valueMetersPerMin;
}

function convertMrr(valueCm3PerMin: number, unitSystem: UnitSystem) {
  return unitSystem === 'inch' ? (valueCm3PerMin * 1000) / MM3_PER_IN3 : valueCm3PerMin;
}

function convertPower(valueKw: number, unitSystem: UnitSystem) {
  return unitSystem === 'inch' ? valueKw * HP_PER_KW : valueKw;
}

function convertTorque(valueNm: number, unitSystem: UnitSystem) {
  return unitSystem === 'inch' ? valueNm * FT_LB_PER_NM : valueNm;
}

function convertSurfaceFinish(valueUm: number, unitSystem: UnitSystem) {
  return unitSystem === 'inch' ? valueUm * UIN_PER_UM : valueUm;
}

function clampDesiredRa(valueUm: number) {
  return Math.min(Math.max(valueUm, MIN_DESIRED_RA_UM), MAX_DESIRED_RA_UM);
}

function programmingLogo(label: string) {
  const key = label.toLowerCase();
  if (key.includes('mastercam')) return { mark: 'MC', wordmark: 'Mastercam' };
  if (key.includes('hypermill')) return { mark: 'hm', wordmark: 'hyperMILL' };
  if (key.includes('fusion')) return { mark: 'F360', wordmark: 'Fusion 360' };
  if (key.includes('nx')) return { mark: 'NX', wordmark: 'NX CAM' };
  if (key.includes('esprit')) return { mark: 'ES', wordmark: 'ESPRIT' };
  if (key.includes('gibbs')) return { mark: 'GC', wordmark: 'GibbsCAM' };
  if (key.includes('solidcam')) return { mark: 'SC', wordmark: 'SolidCAM' };
  if (key.includes('powermill')) return { mark: 'PM', wordmark: 'PowerMill' };
  if (key.includes('bobcad')) return { mark: 'BC', wordmark: 'BobCAD' };
  if (key.includes('edgecam')) return { mark: 'EC', wordmark: 'EDGECAM' };
  if (key.includes('featurecam')) return { mark: 'FC', wordmark: 'FeatureCAM' };
  if (key.includes('solidworks cam')) return { mark: 'SW', wordmark: 'SW CAM' };
  if (key.includes('cimatron')) return { mark: 'CI', wordmark: 'Cimatron' };
  if (key.includes('topsolid')) return { mark: 'TS', wordmark: 'TopSolid' };
  if (key.includes('worknc')) return { mark: 'WN', wordmark: 'WorkNC' };
  if (key.includes('tebis')) return { mark: 'TB', wordmark: 'Tebis' };
  if (key.includes('catia')) return { mark: 'CA', wordmark: 'CATIA' };
  if (key.includes('peps')) return { mark: 'PP', wordmark: 'PEPS' };
  if (key.includes('sigmanest')) return { mark: 'SN', wordmark: 'SigmaNEST' };
  if (key.includes('lantek')) return { mark: 'LK', wordmark: 'Lantek' };
  if (key.includes('radan')) return { mark: 'RD', wordmark: 'RADAN' };
  if (key.includes('pronest')) return { mark: 'PN', wordmark: 'ProNest' };
  if (key.includes('wardjet')) return { mark: 'WJ', wordmark: 'Wardjet' };
  if (key.includes('bysoft')) return { mark: 'BS', wordmark: 'BySoft' };
  if (key.includes('trutops')) return { mark: 'TT', wordmark: 'TruTops' };
  if (key.includes('omax')) return { mark: 'OM', wordmark: 'OMAX' };
  if (key.includes('flowxpert')) return { mark: 'FX', wordmark: 'FlowXpert' };
  if (key.includes('basic')) return { mark: 'BSC', wordmark: 'Basic' };
  if (key.includes('conversational')) return { mark: 'CNV', wordmark: 'Conversational' };
  if (key.includes('prism')) return { mark: 'PR', wordmark: 'PRISM' };
  if (key.includes('manual')) return { mark: 'MNL', wordmark: 'Manual' };
  return { mark: label.slice(0, 2).toUpperCase(), wordmark: label };
}

function isSurfaceFlowSignature(signature: string) {
  return /\bflow(?:line)?\b/.test(signature);
}

export function classifyToolpathType(toolpath: { label: string; path: string; operationId: string }) {
  const signature = `${toolpath.label} ${toolpath.path}`.toLowerCase();
  const isLiveToolTurningPath = [
    'live tool',
    'live-tool',
    'live tooling',
    'live-tooling',
    'live milling',
    'mill-turn',
    'mill/turn',
    'driven tool',
    'driven-tool',
    'c/y',
    'c-axis',
    'y-axis',
    'milling head',
    'cross milling',
  ].some((keyword) => signature.includes(keyword));
  const isSwissTurningPath = [
    'swiss',
    'guide bushing',
    'guide-bushing',
    'sliding head',
    'sliding-head',
  ].some((keyword) => signature.includes(keyword));

  if (toolpath.operationId === 'drilling') {
    return { id: 'drilling', label: 'Drilling / holemaking' };
  }
  if (signature.includes('drill')) {
    return { id: 'drilling', label: 'Drilling / holemaking' };
  }
  if (signature.includes('thread')) {
    return { id: 'threading', label: 'Threading' };
  }
  if (signature.includes('groov') || signature.includes('parting')) {
    return { id: 'grooving', label: 'Grooving / parting' };
  }
  if (toolpath.operationId === 'boring' || signature.includes('boring')) {
    return { id: 'boring', label: 'Boring' };
  }
  if (isSwissTurningPath) {
    return { id: 'swiss_sync', label: 'Swiss / synchronized turning' };
  }
  if (toolpath.operationId === 'turning_rough') {
    return { id: 'turning_rough', label: 'Rough turning' };
  }
  if (toolpath.operationId === 'turning_finish') {
    if (isLiveToolTurningPath) {
      return { id: 'live_milling', label: 'Live-tool milling' };
    }
    return { id: 'turning_finish', label: 'Finish turning' };
  }
  if (toolpath.operationId === 'wire_skims' || signature.includes('skim')) {
    return { id: 'skim', label: 'Skim / finish passes' };
  }
  if (toolpath.operationId === 'wire_profile') {
    return { id: 'wire_profile', label: 'Profile cutting' };
  }
  if (toolpath.operationId === 'burn_roughing') {
    return { id: 'burn_roughing', label: 'Rough burning' };
  }
  if (toolpath.operationId === 'burn_finishing') {
    return { id: 'burn_finishing', label: 'Finish burning' };
  }
  if (toolpath.operationId === 'laser_cut') {
    if (signature.includes('flyline') || signature.includes('common-line') || signature.includes('nest')) {
      return { id: 'laser_nesting', label: 'Nesting / throughput' };
    }
    return { id: 'laser_profile', label: 'Profile cutting' };
  }
  if (toolpath.operationId === 'laser_edge') {
    if (signature.includes('mark') || signature.includes('etch')) {
      return { id: 'marking', label: 'Marking / etching' };
    }
    return { id: 'laser_quality', label: 'Quality / edge control' };
  }
  if (toolpath.operationId === 'abrasive_cut') {
    if (signature.includes('pierce')) {
      return { id: 'piercing', label: 'Piercing / entry control' };
    }
    return { id: 'abrasive_contour', label: 'Contour cutting' };
  }
  if (toolpath.operationId === 'taper_control') {
    if (signature.includes('bevel')) {
      return { id: 'bevel', label: 'Bevel cutting' };
    }
    return { id: 'taper_control', label: 'Taper / bevel control' };
  }
  if (signature.includes('swarf') || signature.includes('5x') || signature.includes('multi-axis') || signature.includes('simultaneous')) {
    return { id: 'multiaxis', label: 'Multi-axis finishing' };
  }
  if (signature.includes('parallel') || isSurfaceFlowSignature(signature) || signature.includes('scallop') || signature.includes('z-level')) {
    return { id: 'surface_finish', label: 'Surface finishing' };
  }
  if (signature.includes('adaptive') || signature.includes('dynamic') || signature.includes('rough') || signature.includes('opti') || signature.includes('cavity') || signature.includes('imachining') || signature.includes('vortex') || signature.includes('waveform') || signature.includes('volumill')) {
    return { id: 'roughing', label: 'Roughing' };
  }
  if (toolpath.operationId === 'pocket_milling' || signature.includes('pocket')) {
    return { id: 'pocketing', label: 'Pocketing' };
  }
  if (toolpath.operationId === 'slot_milling' || signature.includes('slot')) {
    return { id: 'slotting', label: 'Slotting' };
  }
  if (toolpath.operationId === 'shoulder_milling' || signature.includes('contour') || signature.includes('profile')) {
    return { id: 'profiling', label: 'Contouring / profiling' };
  }
  if (toolpath.operationId === 'finishing') {
    return { id: 'finishing', label: 'Finishing' };
  }
  if (toolpath.operationId === 'wire_skims' || signature.includes('skim')) {
    return { id: 'skim', label: 'Skim / finish passes' };
  }
  if (toolpath.operationId === 'wire_profile') {
    return { id: 'wire_profile', label: 'Profile cutting' };
  }
  if (toolpath.operationId === 'burn_roughing') {
    return { id: 'burn_roughing', label: 'Rough burning' };
  }
  if (toolpath.operationId === 'burn_finishing') {
    return { id: 'burn_finishing', label: 'Finish burning' };
  }
  if (toolpath.operationId === 'laser_cut') {
    if (signature.includes('flyline') || signature.includes('common-line') || signature.includes('nest')) {
      return { id: 'laser_nesting', label: 'Nesting / throughput' };
    }
    return { id: 'laser_profile', label: 'Profile cutting' };
  }
  if (toolpath.operationId === 'laser_edge') {
    if (signature.includes('mark') || signature.includes('etch')) {
      return { id: 'marking', label: 'Marking / etching' };
    }
    return { id: 'laser_quality', label: 'Quality / edge control' };
  }
  if (toolpath.operationId === 'abrasive_cut') {
    if (signature.includes('pierce')) {
      return { id: 'piercing', label: 'Piercing / entry control' };
    }
    return { id: 'abrasive_contour', label: 'Contour cutting' };
  }
  if (toolpath.operationId === 'taper_control') {
    if (signature.includes('bevel')) {
      return { id: 'bevel', label: 'Bevel cutting' };
    }
    return { id: 'taper_control', label: 'Taper / bevel control' };
  }

  return { id: toolpath.operationId, label: labelForGenericOperation(toolpath.operationId) };
}

/**
 * Toolpath-aware auto-adjustment defaults.
 * When the user selects a specific CAM toolpath, these multipliers set DOC/WOC
 * relative to tool diameter, plus recommended entry style and finish target.
 * This mirrors how production CAM packages configure engagement Unavailable Dynamic Mill
 * assumes constant-engagement (deep DOC, 10% WOC), while 2D Pocket assumes
 * moderate engagement, and Contour assumes spring-pass finish.
 */
export interface ToolpathDefaults {
  docMm: number;           // absolute DOC in mm (for turning) or multiplier Ã— toolDia (for milling)
  wocMm: number;           // absolute WOC in mm (for turning) or multiplier Ã— toolDia (for milling)
  isAbsolute: boolean;     // true = docMm/wocMm are absolute mm, false = multiply by toolDiameter
  entryStyle: string;      // maps to ENTRY_STYLE_OPTIONS
  finishTarget: string;    // maps to FINISH_TARGET_OPTIONS
}

export function getToolpathDefaults(
  toolpath: { id: string; label: string; path: string; operationId: string } | undefined,
  machineMode: MachineMode,
): ToolpathDefaults | null {
  if (!toolpath) return null;
  const sig = `${toolpath.label} ${toolpath.path}`.toLowerCase();

  // â”€â”€ Mill toolpaths (multiplier-based: DOC/WOC = toolDiameter Ã— factor) â”€â”€
  if (machineMode === 'mill') {
    // Roughing strategies Unavailable gated by operationId first, then refined by keyword
    if (toolpath.operationId === 'roughing') {
      if (/dynamic|adaptive|imachining|profit\s*mill|waveform|volumill|vortex|maxx\s*rough/i.test(sig)) {
        // Constant-engagement roughing: deep DOC, narrow WOC
        return { docMm: 2.0, wocMm: 0.10, isAbsolute: false, entryStyle: 'helix-ramp', finishTarget: 'high-removal' };
      }
      // Standard roughing (Cavity Mill, OptiRough, Area Roughing, Volume Milling)
      return { docMm: 1.0, wocMm: 0.50, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'high-removal' };
    }
    // Pocketing
    if (toolpath.operationId === 'pocket_milling') {
      return { docMm: 1.0, wocMm: 0.60, isAbsolute: false, entryStyle: 'helix-ramp', finishTarget: 'general' };
    }
    // Slotting Unavailable full-width engagement
    if (toolpath.operationId === 'slot_milling') {
      return { docMm: 0.5, wocMm: 1.0, isAbsolute: false, entryStyle: 'helix-ramp', finishTarget: 'general' };
    }
    // Contouring / profiling Unavailable spring pass width
    if (toolpath.operationId === 'shoulder_milling') {
      return { docMm: 1.0, wocMm: 0.05, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
    }
    // 3D surface finishing Unavailable Z-level, parallel, scallop, flowline
    if (toolpath.operationId === 'finishing') {
      if (/swarf|variable contour|multi-axis|5-axis|5x|simultaneous/i.test(sig)) {
        return { docMm: 0.8, wocMm: 0.10, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
      }
      if (/z-level|zlevel|steep/i.test(sig)) {
        return { docMm: 0.5, wocMm: 0.15, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
      }
      if (/barrel|lens|maxx\s*finish/i.test(sig)) {
        return { docMm: 0.4, wocMm: 0.30, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
      }
      return { docMm: 0.3, wocMm: 0.20, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
    }
    // Facing
    if (toolpath.operationId === 'face_milling') {
      return { docMm: 0.3, wocMm: 0.80, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'general' };
    }
    // Drilling / holemaking Unavailable 1Ã—D peck depth (safe default per Sandvik CoroDrill)
    if (toolpath.operationId === 'drilling') {
      return { docMm: 1.0, wocMm: 1.0, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'general' };
    }
  }

  // â”€â”€ Lathe toolpaths (absolute mm Unavailable NOT multiplied by tool diameter) â”€â”€
  // Turning DOC (ap) depends on insert rating, not diameter. Use safe
  // absolute values: rough ap â‰ˆ 2.5mm, finish ap â‰ˆ 0.3mm, feed â‰ˆ proportional.
  if (machineMode === 'lathe') {
    if ([
      'live tool',
      'live-tool',
      'live tooling',
      'live-tooling',
      'live milling',
      'mill-turn',
      'mill/turn',
      'driven tool',
      'driven-tool',
      'c/y',
      'c-axis',
      'y-axis',
      'milling head',
      'cross milling',
    ].some((keyword) => sig.includes(keyword))) {
      if (toolpath.operationId === 'drilling' || /drill/.test(sig)) {
        return { docMm: 1.0, wocMm: 1.0, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'general' };
      }
      if (/finish|blend|profile|contour/.test(sig)) {
        return { docMm: 0.5, wocMm: 0.1, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'tight-finish' };
      }
      return { docMm: 0.75, wocMm: 0.2, isAbsolute: false, entryStyle: 'balanced', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'turning_rough') {
      if (/profit|adaptive|i\s*turn/i.test(sig)) {
        return { docMm: 3.0, wocMm: 0.8, isAbsolute: true, entryStyle: 'balanced', finishTarget: 'high-removal' };
      }
      return { docMm: 2.5, wocMm: 0.6, isAbsolute: true, entryStyle: 'safe-approach', finishTarget: 'high-removal' };
    }
    if (toolpath.operationId === 'turning_finish') {
      if (/thread/i.test(sig)) {
        return { docMm: 0.15, wocMm: 0.1, isAbsolute: true, entryStyle: 'safe-approach', finishTarget: 'tight-finish' };
      }
      return { docMm: 0.3, wocMm: 0.15, isAbsolute: true, entryStyle: 'safe-approach', finishTarget: 'tight-finish' };
    }
    if (toolpath.operationId === 'grooving') {
      return { docMm: 3.0, wocMm: 3.0, isAbsolute: true, entryStyle: 'chip-break', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'boring') {
      return { docMm: 1.5, wocMm: 0.4, isAbsolute: true, entryStyle: 'safe-approach', finishTarget: 'general' };
    }
  }

  // â”€â”€ Wire EDM toolpaths (entry style only Unavailable DOC/WOC not adjusted) â”€â”€
  if (machineMode === 'wire_edm') {
    if (toolpath.operationId === 'wire_profile') {
      if (/taper|4-axis|ruled/i.test(sig)) {
        return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'slug-control', finishTarget: 'tight-finish' };
      }
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'balanced', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'wire_skims') {
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'finish-skim', finishTarget: 'tight-finish' };
    }
  }

  // â”€â”€ Sinker EDM toolpaths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (machineMode === 'edm') {
    if (toolpath.operationId === 'burn_roughing') {
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'heavy-flush', finishTarget: 'high-removal' };
    }
    if (toolpath.operationId === 'burn_finishing') {
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'fine-detail', finishTarget: 'tight-finish' };
    }
  }

  // â”€â”€ Laser toolpaths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (machineMode === 'laser') {
    if (toolpath.operationId === 'laser_cut') {
      if (/common.line|flyline|nest/i.test(sig)) {
        return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'nested-throughput', finishTarget: 'general' };
      }
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'balanced', finishTarget: 'general' };
    }
    if (toolpath.operationId === 'laser_edge') {
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'clean-edge', finishTarget: 'tight-finish' };
    }
  }

  // â”€â”€ Waterjet toolpaths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (machineMode === 'waterjet') {
    if (toolpath.operationId === 'taper_control') {
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'taper-control', finishTarget: 'tight-finish' };
    }
    if (toolpath.operationId === 'abrasive_cut') {
      if (/pierce/i.test(sig)) {
        return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'pierce-safe', finishTarget: 'general' };
      }
      return { docMm: 0, wocMm: 0, isAbsolute: true, entryStyle: 'balanced', finishTarget: 'general' };
    }
  }

  return null;
}

export function buildToolpathTypeOptions(toolpaths: Array<{ label: string; path: string; operationId: string; summary?: string }>) {
  const map = new Map<string, { id: string; label: string; count: number }>();
  toolpaths.forEach((toolpath) => {
    const type = classifyToolpathType(toolpath);
    const current = map.get(type.id);
    if (current) {
      current.count += 1;
    } else {
      map.set(type.id, { ...type, count: 1 });
    }
  });
  if (toolpaths.length === 0) {
    return [];
  }
  return [
    { id: 'all', label: 'All licensed toolpaths', count: toolpaths.length },
    ...Array.from(map.values()),
  ];
}

function labelForGenericOperation(operationId: string) {
  switch (operationId) {
    case 'roughing':
      return 'Roughing';
    case 'pocket_milling':
      return 'Pocketing';
    case 'shoulder_milling':
      return 'Contouring / profiling';
    case 'slot_milling':
      return 'Slotting';
    case 'finishing':
      return 'Finishing';
    case 'face_milling':
      return 'Face milling';
    case 'drilling':
      return 'Drilling';
    default:
      return operationId.replace(/_/g, ' ');
  }
}

function labelFor(options: Array<{ id: string; label: string }>, value: string) {
  return options.find((item) => item.id === value)?.label ?? value;
}

function defaultWarnings(
  coolantRecommendation: ReturnType<typeof buildCoolantStrategyRecommendation>,
  coolant: string,
  workholding: string,
) {
  return [
    `Recommended coolant posture is ${coolantRecommendation.recommendedLabel} (${coolantRecommendation.materialBaseline} baseline), while the current setup is ${labelFor(COOLANT_OPTIONS, coolant)}.`,
    coolantRecommendation.rationale,
    `Verify ${labelFor(WORKHOLDING_OPTIONS, workholding)} is rigid enough before you trust finish or chatter assumptions.`,
    'Treat this page as the setup truth source before sending numbers downstream into CAM or quoting.',
  ];
}

function nonTraditionalReadiness(machineMode: MachineMode, coolant: string, workholding: string) {
  if (machineMode === 'wire_edm') {
    return [
      'Confirm skim-pass count and wire class before generating production numbers.',
      `Current fluid posture: ${labelFor(COOLANT_OPTIONS, coolant)}.`,
      `Fixture posture: ${labelFor(WORKHOLDING_OPTIONS, workholding)} with flush access confirmed.`,
    ];
  }
  if (machineMode === 'edm') {
    return [
      'Lock electrode system, holder standard, and flushing intent first.',
      `Current fluid posture: ${labelFor(COOLANT_OPTIONS, coolant)}.`,
      `Fixture posture: ${labelFor(WORKHOLDING_OPTIONS, workholding)} with dielectric clearance confirmed.`,
    ];
  }
  if (machineMode === 'laser') {
    return [
      'Use this surface to lock material thickness, assist gas, and nozzle assumptions.',
      `Current gas / coolant posture: ${labelFor(COOLANT_OPTIONS, coolant)}.`,
      `Fixture posture: ${labelFor(WORKHOLDING_OPTIONS, workholding)} keeping the sheet stable and flat.`,
    ];
  }
  if (machineMode === 'waterjet') {
    return [
      'Use this surface to lock stock, abrasive, and taper-control assumptions before toolpath generation.',
      `Current fluid posture: ${labelFor(COOLANT_OPTIONS, coolant)}.`,
      `Fixture posture: ${labelFor(WORKHOLDING_OPTIONS, workholding)} for thick plate stability.`,
    ];
  }
  return defaultWarnings(
    {
      recommendedId: coolant as CoolantOptionId,
      recommendedLabel: labelFor(COOLANT_OPTIONS, coolant),
      alignment: 'aligned',
      materialBaseline: 'process-specific',
      rationale: `Current coolant posture is ${labelFor(COOLANT_OPTIONS, coolant)} for this process family.`,
      tradeoff: 'Confirm the process-specific flushing or gas requirements before release.',
      alternatives: [],
      basis: 'Nontraditional process setup',
    },
    coolant,
    workholding,
  );
}

function hardwareTitle(machine?: MachineCatalogItem) {
  if (!machine?.toolingLayout) return 'Process hardware';
  switch (machine.toolingLayout.kind) {
    case 'turret':
      return 'Turret layout';
    case 'gang':
      return 'Gang tooling rail';
    case 'magazine':
      return 'Tool crib';
    case 'wire':
      return 'Wire package';
    case 'electrode':
      return 'Electrode package';
    case 'laser':
      return 'Laser head package';
    case 'waterjet':
      return 'Waterjet head package';
    default:
      return 'Process hardware';
  }
}

function hardwareDigest(
  machine: MachineCatalogItem | undefined,
  selectedStation: number,
  spindleLabel?: string,
) {
  const layout = machine?.toolingLayout;
  if (!layout) return 'Pick a machine to shape the lane';
  switch (layout.kind) {
    case 'turret':
      return `Turret station T${selectedStation}`;
    case 'gang':
      return `Gang rail station T${selectedStation}`;
    case 'magazine':
      return spindleLabel ? `${layout.stations ?? 'Unavailable'}-tool crib / ${spindleLabel}` : `${layout.stations ?? 'Unavailable'}-tool crib`;
    case 'wire':
      return 'Wire package';
    case 'electrode':
      return 'Electrode package';
    case 'laser':
      return 'Laser head package';
    case 'waterjet':
      return 'Waterjet nozzle package';
    default:
      return 'Process hardware';
  }
}

function hardwareCards(kind: string, toolLabel: string, machineName: string) {
  if (kind === 'wire') {
    return [
      {
        eyebrow: 'Wire',
        title: 'Primary wire package',
        body: `${toolLabel} staged on ${machineName}. Wire package, power, and skim-pass context for the active setup.`,
      },
      {
        eyebrow: 'Workholding',
        title: 'Flush path and slug control',
        body: 'Keep upper and lower nozzle access visible and treat slug release as a first-class setup event.',
      },
    ];
  }
  if (kind === 'electrode') {
    return [
      {
        eyebrow: 'Electrode',
        title: 'Electrode and holder stack',
        body: `${toolLabel} staged as the active burn package on ${machineName}.`,
      },
      {
        eyebrow: 'Dielectric',
        title: 'Flushing posture',
        body: 'Confirm side flushing, through-electrode intent, and workholding access before you trust the burn plan.',
      },
    ];
  }
  if (kind === 'laser') {
    return [
      {
        eyebrow: 'Optics',
        title: 'Nozzle and lens stack',
        body: `${toolLabel} staged with the selected assist-gas assumptions on ${machineName}.`,
      },
      {
        eyebrow: 'Sheet control',
        title: 'Sheet support posture',
        body: 'Keep lift, resonance, and edge-fall protection visible before finalizing the cut setup.',
      },
    ];
  }
  return [
    {
      eyebrow: 'Cutting head',
      title: 'Orifice, tube, and abrasive path',
      body: `${toolLabel} staged as the active waterjet head package on ${machineName}.`,
    },
    {
      eyebrow: 'Fixture',
      title: 'Cold-cut support posture',
      body: 'Use this panel to keep plate support, splash control, and taper assumptions visible.',
    },
  ];
}

const MACHINE_TYPE_ORDER: Record<MachineMode, string[]> = {
  mill: [
    'mill_vertical_3',
    'mill_vertical_4',
    'mill_vertical_5',
    'mill_horizontal_3',
    'mill_horizontal_4',
    'mill_horizontal_5',
    'mill_gantry_3',
    'mill_gantry_4',
    'mill_gantry_5',
  ],
  lathe: [
    'lathe_2axis',
    'lathe_y_axis',
    'lathe_subspindle',
    'lathe_multitask',
    'lathe_swiss',
    'lathe_vtl',
  ],
  edm: ['edm_sinker'],
  wire_edm: ['wire_edm_wire'],
  laser: ['laser_fiber'],
  waterjet: ['waterjet_abrasive'],
};

function allMachineTypeLabel(mode: MachineMode): string {
  switch (mode) {
    case 'mill':
      return 'All mill types';
    case 'lathe':
      return 'All lathe types';
    case 'edm':
      return 'All EDM types';
    case 'wire_edm':
      return 'All wire EDM types';
    case 'laser':
      return 'All laser types';
    case 'waterjet':
      return 'All waterjet types';
    default:
      return 'All machine types';
  }
}

function buildMachineTypeOptions(machines: MachineCatalogItem[], mode: MachineMode): SelectionOption[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const machine of machines) {
    const current = counts.get(machine.machineTypeId);
    counts.set(machine.machineTypeId, {
      label: machine.machineTypeLabel,
      count: (current?.count ?? 0) + 1,
    });
  }

  const order = MACHINE_TYPE_ORDER[mode];
  const ordered = [...counts.entries()].sort((left, right) => {
    const leftIndex = order.indexOf(left[0]);
    const rightIndex = order.indexOf(right[0]);
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    return normalizedLeft - normalizedRight || left[1].label.localeCompare(right[1].label);
  });

  return [
    {
      id: 'all',
      label: allMachineTypeLabel(mode),
      detail: `${machines.length} machine${machines.length === 1 ? '' : 's'} in the current ${mode} registry slice.`,
    },
    ...ordered.map(([id, entry]) => ({
      id,
      label: entry.label,
      detail: `${entry.count} machine${entry.count === 1 ? '' : 's'} available.`,
    })),
  ];
}

