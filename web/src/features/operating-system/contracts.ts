import type { Employee, Job, MilestoneSyncResult, ScheduleResult } from '../../api/types';
import type { JobTrackingPacket, ParsedJobTrackingPayload } from '../../utils/jobTracking';
import type {
  MachineCatalogItem,
  MachineControllerCapabilityOption,
  MachineMode,
} from '../../data/calculatorWorkspace';

// Frontend operating-system contracts live in the web app as adapter seams only.
// Claude-owned backend work remains the final authority on production payloads.

export type { Job } from '../../api/types';

export type OperatingSystemEntityType =
  | 'Job'
  | 'Quote'
  | 'Customer'
  | 'PO'
  | 'Order'
  | 'Part'
  | 'Invoice'
  | 'Quality'
  | 'Lesson';

export type TravelerStepStatus = 'complete' | 'running' | 'ready' | 'blocked';
export type WorkflowTone = 'neutral' | 'watch' | 'good';
export type ApprovalStatus = 'ready' | 'waiting' | 'approved' | 'blocked';
export type ExceptionSeverity = 'info' | 'watch' | 'critical';
export type StudyTone = 'ready' | 'loaded' | 'watch' | 'critical';

export interface DeskCounts {
  inbox: number;
  approvals: number;
  atRisk: number;
  liveJobs: number;
}

export type LearningSignalScope = 'shop' | 'network' | 'hybrid';
export type LearningSignalStatus = 'live' | 'warming' | 'planned';

export interface LearningSignalCaptureRecord {
  id: string;
  label: string;
  scope: LearningSignalScope;
  status: LearningSignalStatus;
  detail: string;
  coverage: string;
}

export interface LearningImprovementRecord {
  id: string;
  title: string;
  source: LearningSignalScope;
  detail: string;
  impact: string;
}

// Backend contract note: learning intelligence should ultimately come from
// Claude-owned backend payloads that can combine shop-private adaptation with
// privacy-safe cross-shop aggregation/federation. The frontend seam exists so
// tenant-specialized + network-learning UX can converge early without inventing
// the final persistence/training pipeline in parallel.
export interface ShopLearningProfile {
  shopLabel: string;
  specialization: string;
  autonomyPosture: string;
  adaptationScore: string;
  policyNote: string;
  captures: LearningSignalCaptureRecord[];
  improvements: LearningImprovementRecord[];
}

export interface NetworkLearningProfile {
  participatingShops: string;
  promotedRecipes: string;
  safeSharePolicy: string;
  captureCoverage: string;
  captures: LearningSignalCaptureRecord[];
  improvements: LearningImprovementRecord[];
}

export interface PlatformLearningSnapshot {
  shopProfile: ShopLearningProfile;
  networkProfile: NetworkLearningProfile;
  rolloutActions: string[];
}

export type IntelligenceTone = 'neutral' | 'good' | 'watch' | 'critical';

export interface PrismIntelligenceMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: IntelligenceTone;
}

export interface PrismCliSurface {
  id: string;
  command: string;
  label: string;
  detail: string;
  example: string;
  route: string;
  group: 'reasoning' | 'physics' | 'automation' | 'execution';
  keywords: string[];
}

export interface PrismReasoningLayer {
  id: string;
  label: string;
  detail: string;
  status: string;
  tone: IntelligenceTone;
  signals: string[];
}

export interface PrismModelCard {
  id: string;
  name: string;
  domain: string;
  status: string;
  accuracyLabel: string;
  samplesLabel: string;
  learningMode: string;
  reasoningNote: string;
}

export interface PrismChainCard {
  id: string;
  taskClass: string;
  tier: string;
  tokenBudgetLabel: string;
  failBehavior: string;
  detail: string;
  emphasis: string;
}

export interface PrismAgentSummary {
  activeAgents: string;
  queueDepth: string;
  throughput: string;
  modelAccess: string;
  detail: string;
  alerts: string[];
}

export interface PrismPromptModelMatch {
  id: string;
  name: string;
  domain: string;
  why: string;
}

export interface PrismAgentCandidate {
  id: string;
  name: string;
  category: string;
  reason: string;
}

export interface PrismApprenticeExplanation {
  parameter: string;
  value: string;
  explanation: string;
  depth: string;
  factors: Array<{
    factor: string;
    impact: string;
    physics: string;
  }>;
}

export interface PrismSuggestedSurface {
  label: string;
  route: string;
  actionLabel: string;
  cliCommand: string;
}

export interface PrismIntelligenceWorkspace {
  summary: string;
  mission: string;
  metrics: PrismIntelligenceMetric[];
  promptStarters: string[];
  cliSurfaces: PrismCliSurface[];
  reasoningLayers: PrismReasoningLayer[];
  modelCards: PrismModelCard[];
  chainCards: PrismChainCard[];
  agentSummary: PrismAgentSummary;
}

export interface PrismPromptAnalysis {
  prompt: string;
  aiIntent: {
    intent: string;
    confidence: number;
    suggestedAction?: string;
    entities: Record<string, string | number>;
    alternatives: Array<{ intent: string; confidence: number }>;
  };
  automation: {
    taskClass: string;
    confidence: number;
    chainId: string;
    tokenBudget: number;
    matchedKeywords: string[];
    chainSteps: string[];
  };
  modelMatches: PrismPromptModelMatch[];
  agentCandidates: PrismAgentCandidate[];
  apprentice?: PrismApprenticeExplanation;
  suggestedSurface: PrismSuggestedSurface;
  reasoningSummary: string;
  nextActions: string[];
}

export interface PrismShopFloorInsightInput {
  employeeId?: string;
  employeeName?: string;
  department?: string;
  role?: string;
  shiftStatus?: string;
  activeJobId?: string;
  activeOperation?: string;
  trackedJobId?: string;
  trackedJobName?: string;
  material?: string;
  liveAttendanceCount: number;
  runningTaskCount: number;
  completedParts: number;
  extraParts: number;
  hotJobCount: number;
  cycleVariancePct?: number;
  handoffSummary?: string;
  roiSignals: string[];
}

export interface PrismShopFloorInsight {
  headline: string;
  tone: IntelligenceTone;
  confidence: number;
  aiIntent: PrismPromptAnalysis['aiIntent'];
  automation: PrismPromptAnalysis['automation'];
  modelMatches: PrismPromptModelMatch[];
  agentCandidates: PrismAgentCandidate[];
  apprentice?: PrismApprenticeExplanation;
  suggestedSurface: PrismSuggestedSurface;
  reasoningSummary: string;
  liveSignals: string[];
  riskFlags: string[];
  nextActions: string[];
}

export type ShellUnitSystem = 'inch' | 'metric';
export type CommerceTone = 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
export type DistributorScope = 'nationwide' | 'local' | 'manufacturer';

export interface ShellCommerceTier {
  id: string;
  label: string;
  shortLabel: string;
  priceLabel: string;
  summary: string;
  roiNote: string;
  purchaseLabel: string;
  features: string[];
  tone: CommerceTone;
}

export interface ShellCommerceAddOn {
  id: string;
  label: string;
  priceLabel: string;
  summary: string;
  roiNote: string;
  category: string;
  tone: CommerceTone;
}

export interface CommerceRegion {
  id: string;
  label: string;
  detail: string;
  localLabel: string;
  groupLabel?: string;
  statesLabel?: string;
}

export interface ShellCommerceBillingPlanPrice {
  planId: string;
  label: string;
  monthlyLabel: string;
  annualLabel: string;
}

export interface ShellCommerceBillingPosture {
  source: 'staged' | 'live';
  authenticated: boolean;
  currentPlanId: string;
  currentPlanLabel: string;
  roleLabel: string;
  detail: string;
  planPrices: ShellCommerceBillingPlanPrice[];
  mappedTierId?: string;
  mappedTierLabel?: string;
  lastSyncLabel?: string;
}

export interface ShellCommerceCatalog {
  tiers: ShellCommerceTier[];
  addOns: ShellCommerceAddOn[];
  regions: CommerceRegion[];
  shellNote: string;
  billingPosture: ShellCommerceBillingPosture;
}

export interface ShellCommerceSelection {
  unitSystem: ShellUnitSystem;
  tierId: string;
  addOnIds: string[];
  regionId: string;
}

export interface DistributorOffer {
  id: string;
  name: string;
  scope: DistributorScope;
  locationLabel: string;
  priceLabel: string;
  etaLabel: string;
  note: string;
  href: string;
  featured?: boolean;
}

export interface PurchaseRecommendation {
  id: string;
  title: string;
  category: string;
  detail: string;
  roiStrength: string;
  estimatedPrice: string;
  payback: string;
  whyNow: string;
  distributors: DistributorOffer[];
}

export interface AlarmRepairTrack {
  id: string;
  title: string;
  detail: string;
  posture: string;
}

export interface AlarmRelatedPartRecord {
  id: string;
  label: string;
  category: string;
  priceLabel: string;
  stockNote: string;
  usageNote: string;
}

export interface AlarmCommerceWorkspace {
  summary: string;
  repairTracks: AlarmRepairTrack[];
  relatedParts: AlarmRelatedPartRecord[];
  recommendations: PurchaseRecommendation[];
}

export interface InventoryDocumentTemplate {
  id: string;
  label: string;
  summary: string;
  extractionTargets: string[];
  confidencePosture: string;
  samplePath: string;
}

export interface InventoryReceivingRecord {
  id: string;
  supplier: string;
  reference: string;
  partCount: string;
  department: string;
  status: 'ready' | 'watch' | 'blocked';
  note: string;
}

export interface InventoryDepartmentRoute {
  id: string;
  department: string;
  queuedItems: string;
  routingNote: string;
}

export interface InventoryCheckoutRecord {
  id: string;
  toolId: string;
  label: string;
  category: string;
  location: string;
  priceLabel: string;
  status: 'ready' | 'watch';
  note: string;
}

export interface InventoryUsagePulse {
  id: string;
  label: string;
  machine: string;
  operator: string;
  state: string;
  indexedEdges: number;
  maxEdges: number;
  costPerPart: string;
  nextAction: string;
}

export interface InventoryFormulaNote {
  id: string;
  label: string;
  purpose: string;
  output: string;
  note: string;
}

export interface InventoryOperationsWorkspace {
  summary: string;
  shellNote: string;
  documentTemplates: InventoryDocumentTemplate[];
  receivingQueue: InventoryReceivingRecord[];
  departmentRoutes: InventoryDepartmentRoute[];
  checkoutQueue: InventoryCheckoutRecord[];
  usagePulses: InventoryUsagePulse[];
  formulaNotes: InventoryFormulaNote[];
}

export type CalculatorToolCribImportSourceType =
  | 'purchase_order'
  | 'invoice'
  | 'rfq'
  | 'email'
  | 'attachment'
  | 'cadcam_scan';

export type CalculatorToolCribSuggestionKind =
  | 'tooling_part'
  | 'holder_part'
  | 'fixture_part'
  | 'part_number'
  | 'library';

export interface CalculatorToolCribSuggestion {
  id: string;
  kind: CalculatorToolCribSuggestionKind;
  label: string;
  manufacturer?: string;
  partNumber?: string;
  quantityHint?: string;
  confidence: number;
  evidence: string;
  action: string;
  sourceType: CalculatorToolCribImportSourceType;
}

export interface CalculatorCadCamLibraryFinding {
  id: string;
  softwareFamily: string;
  softwareLabel: string;
  path: string;
  confidence: number;
  matchedBy: string[];
}

export interface CalculatorToolCribImportRecord {
  id: string;
  userId: string;
  workspaceId: string;
  sourceType: CalculatorToolCribImportSourceType;
  sourceLabel: string;
  filename?: string;
  importedAt: string;
  status: 'ready' | 'needs_review';
  summary: string;
  suggestions: CalculatorToolCribSuggestion[];
  discoveredLibraries?: CalculatorCadCamLibraryFinding[];
  redaction?: {
    applied: boolean;
    replacementCount: number;
    redactedFields: string[];
    note: string;
  };
}

export interface CalculatorToolCribWorkspace {
  userId: string;
  workspaceId: string;
  summary: string;
  lastUpdatedAt: string | null;
  imports: CalculatorToolCribImportRecord[];
  partNumbers: string[];
  toolingPartNumbers: string[];
  discoveredLibraries: CalculatorCadCamLibraryFinding[];
}

export interface IngestCalculatorToolCribDocumentInput {
  userId: string;
  workspaceId?: string;
  sourceType: CalculatorToolCribImportSourceType;
  filename: string;
  title?: string;
  contentBase64?: string;
  contentText?: string;
}

export interface RunCalculatorToolCribLocalScanInput {
  userId: string;
  workspaceId?: string;
  approvedByUser: boolean;
  roots?: string[];
  maxResults?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  type: OperatingSystemEntityType;
  status: string;
  owner: string;
  detail: string;
  workspaceLabel: string;
  workspaceRoute: string;
  to: string;
  keywords: string[];
}

export interface PinnedEntity extends SearchResult {}

export interface RecentEntity extends SearchResult {}

export interface ShellBootstrap {
  deskCounts: DeskCounts;
  pinnedEntities: PinnedEntity[];
  recentEntities: RecentEntity[];
  shellNote: string;
}

export interface ShellRecordState {
  pinnedRecords: SearchResult[];
  recentRecords: SearchResult[];
}

export interface ShellSavedView {
  id: string;
  userId: string;
  name: string;
  entityType: string;
  to: string;
  isDefault: boolean;
  updatedAt: string;
}

export interface CreateShellSavedViewInput {
  name: string;
  entityType: string;
  to: string;
  isDefault?: boolean;
}

export interface UpdateShellSavedViewInput {
  viewId: string;
  name?: string;
  to?: string;
  isDefault?: boolean;
}

export type EmailLoginShellKind = 'employee' | 'admin';
export type MessageThreadSource = 'email' | 'app' | 'workflow';
export type MessageThreadPriority = 'normal' | 'watch' | 'hot';

export interface EmailLoginOption {
  id: string;
  email: string;
  displayName: string;
  role: string;
  department: string;
  shellKind: EmailLoginShellKind;
  profileId?: string;
  destination: string;
  tagline: string;
  unreadCount: number;
}

export interface MessageChannelSummary {
  id: string;
  label: string;
  detail: string;
  countLabel: string;
}

export interface MessageThreadSummary {
  id: string;
  channelId: string;
  subject: string;
  preview: string;
  participantsLabel: string;
  ownerLabel: string;
  updatedLabel: string;
  source: MessageThreadSource;
  priority: MessageThreadPriority;
  unreadCount: number;
  linkedRecordIds: string[];
}

export interface MessageEntry {
  id: string;
  sender: string;
  senderRole: string;
  sentLabel: string;
  body: string;
  source: MessageThreadSource;
  direction: 'inbound' | 'outbound' | 'internal';
}

export interface MessagesWorkspace {
  summary: string;
  identityLabel: string;
  activeMailbox: string;
  connectionNote: string;
  channels: MessageChannelSummary[];
  threads: MessageThreadSummary[];
  selectedThreadId: string;
  selectedThreadEntries: MessageEntry[];
  actionLabels: string[];
  linkedRecords: RecentEntity[];
}

export interface HotJobRecord {
  jobId: string;
  partNumber: string;
  customer: string;
  dueDate: string;
  note: string;
  setBy: string;
  setAt: string;
}

export interface TravelerStepRecord {
  id: string;
  code: string;
  title: string;
  machine: string;
  estimate: string;
  status: TravelerStepStatus;
  note: string;
}

export interface WorkflowTimelineEntry {
  id: string;
  time: string;
  title: string;
  detail: string;
  tone: WorkflowTone;
}

export interface ApprovalSummary {
  id: string;
  label: string;
  owner: string;
  status: ApprovalStatus;
  detail: string;
}

export interface ShortageRecord {
  id: string;
  item: string;
  eta: string;
  severity: 'watch' | 'high';
  action: string;
  owner: string;
}

export interface JobAttachmentRecord {
  id: string;
  label: string;
  type: string;
  freshness: string;
}

export interface JobDeskRecord {
  jobId: string;
  owner: string;
  workcenter: string;
  queueSlot: string;
  isHot: boolean;
  hotNote: string | null;
  traveler: TravelerStepRecord[];
  shortages: ShortageRecord[];
  approvals: ApprovalSummary[];
  attachments: JobAttachmentRecord[];
  timeline: WorkflowTimelineEntry[];
  purchasingActions: string[];
  nextActions: string[];
}

export interface JobIntakeDraft {
  customer: string;
  part_number: string;
  description: string;
  quantity: string;
  material: string;
  due_date: string;
  priority: string;
}

export interface SummaryMetricRecord {
  id: string;
  label: string;
  value: string;
  hint: string;
  accent?: string;
}

export interface StudyExceptionRecord {
  id: string;
  title: string;
  detail: string;
  severity: ExceptionSeverity;
}

export interface PlannerActionRecord {
  id: string;
  title: string;
  detail: string;
}

export interface SequenceStepRecord {
  id: string;
  label: string;
  detail: string;
  badge?: string;
}

export interface MachineBlockRecord {
  id: string;
  jobId: string;
  start: number;
  end: number;
}

export interface MachineLaneRecord {
  id: string;
  machine: string;
  note: string;
  blocks: MachineBlockRecord[];
}

export interface ScheduleReleaseCheck {
  id: string;
  label: string;
  detail: string;
}

export interface ScheduleReleaseRecord {
  studyKey: string;
  owner: string;
  publishSummary: string;
  approvals: ApprovalSummary[];
  shortages: ShortageRecord[];
  checks: ScheduleReleaseCheck[];
}

export interface SchedulingStudyRecord {
  key: string;
  label: string;
  detail: string;
  tone: StudyTone;
  statusLabel: string;
  postureValue: string;
  bottleneckValue: string;
  publishValue: string;
  boardTitle: string;
  boardSubtitle: string;
  metrics: SummaryMetricRecord[];
  exceptions: StudyExceptionRecord[];
  plannerActions: PlannerActionRecord[];
  sequence: SequenceStepRecord[];
  machineLanes: MachineLaneRecord[];
  release: ScheduleReleaseRecord;
  payload: unknown | null;
  payloadLabel: string;
  inspectorNote: string;
}

export interface SchedulingStudyInputs {
  jobShopResult: ScheduleResult | null;
  singleResult: unknown | null;
  johnsonsResult: unknown | null;
  cpmResult: unknown | null;
}

// Backend contract note: this universal intake / print-to-CNC surface is a
// frontend adapter seam only. Claude-owned backend payloads should eventually
// provide file ids, revision lineage, extracted geometry/features, simulation
// result ids, quote revision linkage, and release-status fanout.
export interface ProgramReleasePartClass {
  id: string;
  label: string;
  detail: string;
  geometryClass: string;
}

export interface ProgramReleaseMachineProfile {
  id: string;
  manufacturerId?: string;
  manufacturer?: string;
  label: string;
  familyId?: string;
  familyLabel?: string;
  controller: string;
  kinematics: string;
  spindle: string;
  maxRpm: number;
  strength: string;
  collisionEnvelope: string;
  machineRatePerHour: number;
}

export interface ProgramReleaseToolholderProfile {
  id: string;
  label: string;
  style: string;
  gageLength: string;
  rigidity: string;
  note: string;
}

export interface ProgramReleaseToolingPackage {
  id: string;
  label: string;
  coverage: string;
  note: string;
  packageCost: number;
}

export interface ProgramReleaseFixtureProfile {
  id: string;
  label: string;
  setupCount: number;
  datumPlan: string;
  note: string;
  burdenCost: number;
}

export interface ProgramReleaseStockProfile {
  id: string;
  label: string;
  material: string;
  size: string;
  source: string;
  marketPrice: number;
  logisticsCost: number;
  volatility: string;
}

export interface ProgramReleaseCadSourceProfile {
  id: string;
  label: string;
  status: 'preferred' | 'fallback' | 'compare';
  simulationReadiness: string;
  note: string;
  securityNote: string;
}

export interface ProgramReleaseChecklistItem {
  id: string;
  label: string;
  status: 'ready' | 'review' | 'blocked';
  detail: string;
}

export interface ProgramReleaseDfmFinding {
  id: string;
  title: string;
  severity: ExceptionSeverity;
  area: string;
  detail: string;
  action: string;
  source: string;
}

export interface ProgramReleaseGdtFocus {
  id: string;
  label: string;
  status: 'ready' | 'review' | 'blocked';
  requirement: string;
  note: string;
  owner: string;
}

export interface ProgramReleaseSourceComparison {
  id: string;
  label: string;
  status: 'preferred' | 'fallback' | 'compare';
  geometryTrust: string;
  setupGeneration: string;
  simulationTrust: string;
  releasePosture: string;
  note: string;
  recommended: boolean;
}

export interface ProgramReleaseOperationRecord {
  id: string;
  code: string;
  title: string;
  strategy: string;
  machineMode: string;
  holder: string;
  tooling: string;
  spindleRpm: number;
  feedRate: string;
  doc: string;
  stepOver: string;
  cycleMinutes: number;
  rapidPosture: string;
  collisionPosture: string;
  verificationPosture: string;
}

export interface ProgramReleaseSetupSheetSection {
  id: string;
  title: string;
  items: string[];
}

export interface ProgramReleaseQuoteLine {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
}

export interface ProgramReleaseCatalog {
  partClasses: ProgramReleasePartClass[];
  machines: ProgramReleaseMachineProfile[];
  toolholders: ProgramReleaseToolholderProfile[];
  toolingPackages: ProgramReleaseToolingPackage[];
  fixtures: ProgramReleaseFixtureProfile[];
  stockProfiles: ProgramReleaseStockProfile[];
  cadSources: ProgramReleaseCadSourceProfile[];
}

export interface ProgramReleaseMachineFacetOption {
  id?: string;
  label?: string;
  value: string;
  count: number;
}

export interface ProgramReleaseMachineSearchFacets {
  manufacturers: ProgramReleaseMachineFacetOption[];
  families: ProgramReleaseMachineFacetOption[];
  kinematics: ProgramReleaseMachineFacetOption[];
  controllers: ProgramReleaseMachineFacetOption[];
}

export interface ProgramReleaseMachineSearchInput {
  query?: string;
  manufacturer?: string;
  familyId?: string;
  kinematics?: string;
  controller?: string;
  limit?: number;
  offset?: number;
}

export interface ProgramReleaseMachineSearchResult {
  machines: ProgramReleaseMachineProfile[];
  total: number;
  hasMore: boolean;
  facets: ProgramReleaseMachineSearchFacets;
}

export interface ProgramReleaseSavedMachineProfile {
  profileId: string;
  userId: string;
  workspaceId?: string;
  displayName: string;
  machineId: string;
  machineLabel: string;
  selectedControllerId: string;
  selectedSpindlePackageId: string;
  enabledCoolantStrategyIds: string[];
  canDriveProgramRelease: boolean;
}

export interface SaveProgramReleaseMachineProfileInput {
  userId: string;
  workspaceId?: string;
  machineId: string;
  displayName?: string;
  makeDefault?: boolean;
}

export interface CalculatorMachineSelectionDraft {
  machineMode: MachineMode;
  machine: MachineCatalogItem;
  controllerOptions: MachineCatalogItem['controllerOptions'];
  spindleOptions: MachineCatalogItem['spindleOptions'];
  controllerCapabilityOptions: MachineControllerCapabilityOption[];
  coolantStrategyIds: string[];
  selectedControllerId: string;
  selectedSpindlePackageId: string;
  enabledCoolantStrategyIds: string[];
  enabledControllerFeatureIds: string[];
  enabledMachineFeatureIds?: string[];
  toolingStationCountOverride?: number;
  measuredPerformance?: CalculatorMachineMeasuredPerformance;
}

export interface CalculatorMachineMeasuredPerformance {
  guidewayType?: MachineCatalogItem['guidewayType'];
  machineAgeYears?: number;
  measuredPowerKw?: number;
  measuredMaxTorqueNm?: number;
  measuredNaturalFrequencyHz?: number;
  measuredSystemStiffnessNPerUm?: number;
  measuredDampingRatio?: number;
  measuredAxisAccelerationMps2?: number;
  measuredAxisJerkMps3?: number;
  notes?: string[];
}

export interface CalculatorSavedMachineProfile {
  profileId: string;
  userId: string;
  workspaceId?: string;
  displayName: string;
  machineMode: MachineMode;
  machineId: string;
  machineLabel: string;
  selectedControllerId: string;
  selectedSpindlePackageId: string;
  enabledCoolantStrategyIds: string[];
  enabledControllerFeatureIds: string[];
  enabledMachineFeatureIds?: string[];
  toolingStationCountOverride?: number;
  measuredPerformance?: CalculatorMachineMeasuredPerformance;
  canDriveCalculatorSelections: boolean;
}

export interface SaveCalculatorMachineProfileInput {
  userId: string;
  workspaceId?: string;
  displayName?: string;
  makeDefault?: boolean;
  selection: CalculatorMachineSelectionDraft;
}

export interface ProgramReleaseInput {
  packetId?: string;
  partClassId: string;
  machineId: string;
  toolholderId: string;
  toolingPackageId: string;
  fixtureId: string;
  stockId: string;
  cadSourceId: string;
}

export interface ProgramReleaseWorkspace {
  metrics: SummaryMetricRecord[];
  selectedPartClass: ProgramReleasePartClass;
  selectedMachine: ProgramReleaseMachineProfile;
  selectedToolholder: ProgramReleaseToolholderProfile;
  selectedToolingPackage: ProgramReleaseToolingPackage;
  selectedFixture: ProgramReleaseFixtureProfile;
  selectedStock: ProgramReleaseStockProfile;
  selectedCadSource: ProgramReleaseCadSourceProfile;
  alerts: string[];
  collisionChecks: ProgramReleaseChecklistItem[];
  simulationChecks: ProgramReleaseChecklistItem[];
  dfmFindings: ProgramReleaseDfmFinding[];
  gdtFocuses: ProgramReleaseGdtFocus[];
  sourceComparisons: ProgramReleaseSourceComparison[];
  operationPlan: ProgramReleaseOperationRecord[];
  setupSheet: ProgramReleaseSetupSheetSection[];
  quoteLines: ProgramReleaseQuoteLine[];
  quotingSummary: string;
  reviewSummary: string;
  integrationNotes: string[];
  handoffActions: string[];
  programPreview: string;
}

export interface EmployeeShellNavItem {
  id: string;
  label: string;
  to: string;
  description: string;
  countLabel?: string;
}

export interface EmployeeShellNavGroup {
  id: string;
  label: string;
  items: EmployeeShellNavItem[];
}

export interface EmployeeHomeModule {
  id: string;
  title: string;
  detail: string;
  to: string;
  countLabel?: string;
}

export interface EmployeeAccessCard {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
}

export interface EmployeeShiftPriority {
  id: string;
  label: string;
  title: string;
  detail: string;
  to: string;
  badge?: string;
  tone: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
}

export interface EmployeeAttentionItem {
  id: string;
  label: string;
  title: string;
  detail: string;
  to: string;
  tone: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
}

export interface EmployeeHandoffNote {
  id: string;
  author: string;
  timestampLabel: string;
  detail: string;
  to?: string;
}

export interface EmployeeRestrictedSurface {
  id: string;
  label: string;
  detail: string;
}

export interface EmployeeShellProfileSummary {
  id: string;
  displayName: string;
  role: string;
  department: string;
  tagline: string;
}

export interface EmployeeShellBootstrap {
  profileId: string;
  employeeId: string;
  displayName: string;
  role: string;
  department: string;
  subtitle: string;
  homeModules: EmployeeHomeModule[];
  navGroups: EmployeeShellNavGroup[];
  accessCards: EmployeeAccessCard[];
  shiftPriorities: EmployeeShiftPriority[];
  attentionItems: EmployeeAttentionItem[];
  handoffNotes: EmployeeHandoffNote[];
  restrictedSurfaces: EmployeeRestrictedSurface[];
  hotJobs: HotJobRecord[];
  deskCounts: DeskCounts;
  pins: PinnedEntity[];
  recents: RecentEntity[];
  policyNote: string;
}

export interface ShopFloorDepartmentCheckIn {
  id: string;
  jobId: string;
  department: string;
  employeeId: string;
  employeeName: string;
  scannedAt: string;
}

export interface ShopFloorTrackedTask {
  id: string;
  title: string;
  department: string;
  operationCode: string;
  quantityTarget: number;
  cycleSeconds: number;
  note: string;
  status: 'idle' | 'running' | 'paused' | 'completed';
  elapsedSeconds: number;
  startedAtMs?: number;
  partsCompleted: number;
  extraParts: number;
}

export interface JobRegistrationResult {
  trackedJob: ParsedJobTrackingPayload | null;
  jobId: string;
  operation: string;
  selectedDepartment: string;
  tasks: ShopFloorTrackedTask[];
  message: string;
  prism_sync?: MilestoneSyncResult;
}

export interface DepartmentCheckInResult {
  duplicate: boolean;
  message: string;
  entry?: ShopFloorDepartmentCheckIn;
  tasks: ShopFloorTrackedTask[];
  prism_sync?: MilestoneSyncResult;
}

export type ShopFloorTaskEventTrigger =
  | 'shop-floor-task-started'
  | 'shop-floor-task-paused'
  | 'shop-floor-task-completed';

export interface ShopFloorTaskEventResult {
  acknowledged: boolean;
  trigger: ShopFloorTaskEventTrigger;
  taskId?: string;
  note?: string;
  prism_sync?: MilestoneSyncResult;
}

export interface ShellBootstrapProvider {
  getShellBootstrap(): Promise<ShellBootstrap>;
  getEmployeeShellProfiles(): Promise<EmployeeShellProfileSummary[]>;
  getEmployeeShellBootstrap(profileId?: string): Promise<EmployeeShellBootstrap>;
}

// Backend contract note: email authentication, mailbox stitching, and delivery
// state should ultimately converge on Claude-owned auth + messaging routes. This
// frontend seam keeps sign-in and inbox UX ready without inventing the production
// identity provider or message transport pipeline in parallel.
export interface AuthProvider {
  getEmailLoginOptions(): Promise<EmailLoginOption[]>;
  resolveEmailLogin(email: string): Promise<EmailLoginOption | null>;
}

export interface DeskProvider {
  getDeskCounts(): Promise<DeskCounts>;
}

export interface SearchProvider {
  search(query: string): Promise<SearchResult[]>;
  findRecordByFocus(pathname: string, search: string): SearchResult | null;
}

export interface ShellRecordProvider {
  getShellRecordState(): Promise<ShellRecordState>;
  pinShellRecord(record: SearchResult, currentPinnedRecords: SearchResult[]): Promise<SearchResult[]>;
  unpinShellRecord(record: SearchResult, currentPinnedRecords: SearchResult[]): Promise<SearchResult[]>;
  recordShellRecordAccess(record: SearchResult, currentRecentRecords: SearchResult[]): Promise<SearchResult[]>;
  getShellSavedViews(entityType?: string): Promise<ShellSavedView[]>;
  createShellSavedView(input: CreateShellSavedViewInput): Promise<ShellSavedView[]>;
  updateShellSavedView(input: UpdateShellSavedViewInput): Promise<ShellSavedView[]>;
  deleteShellSavedView(viewId: string, entityType?: string): Promise<ShellSavedView[]>;
}

export interface WorkflowProvider {
  buildJobApprovals(job: Job): Promise<ApprovalSummary[]>;
  buildScheduleReleaseRecord(input: {
    studyKey: string;
    tone: StudyTone;
    checks: ScheduleReleaseCheck[];
    exceptions: StudyExceptionRecord[];
  }): ScheduleReleaseRecord;
}

export interface JobExecutionProvider {
  buildJobDeskRecords(jobs: Job[]): Promise<JobDeskRecord[]>;
  buildJobPacket(job: Job, options?: { seed?: number; jobNameOverride?: string }): Promise<JobTrackingPacket>;
  buildJobIntakePreview(form: JobIntakeDraft): Promise<{ previewJob: Job; packet: JobTrackingPacket }>;
}

export interface SchedulingProvider {
  buildStudies(inputs: SchedulingStudyInputs): Promise<SchedulingStudyRecord[]>;
}

export interface ProgramReleaseProvider {
  getProgramReleaseCatalog(): Promise<ProgramReleaseCatalog>;
  getProgramReleaseMachine?(machineId: string): Promise<ProgramReleaseMachineProfile | null>;
  getProgramReleaseDefaultMachineProfile?(
    input?: { userId?: string; workspaceId?: string },
  ): Promise<ProgramReleaseSavedMachineProfile | null>;
  saveProgramReleaseMachineProfile?(
    input: SaveProgramReleaseMachineProfileInput,
  ): Promise<ProgramReleaseSavedMachineProfile | null>;
  searchProgramReleaseMachines?(input?: ProgramReleaseMachineSearchInput): Promise<ProgramReleaseMachineSearchResult>;
  buildProgramReleaseWorkspace(input: ProgramReleaseInput): Promise<ProgramReleaseWorkspace>;
}

export interface CalculatorMachineProfileProvider {
  getCalculatorDefaultMachineProfile?(
    input?: { userId?: string; workspaceId?: string },
  ): Promise<CalculatorSavedMachineProfile | null>;
  saveCalculatorMachineProfile?(
    input: SaveCalculatorMachineProfileInput,
  ): Promise<CalculatorSavedMachineProfile | null>;
}

export interface CalculatorToolCribProvider {
  getCalculatorToolCribWorkspace?(
    input?: { userId?: string; workspaceId?: string },
  ): Promise<CalculatorToolCribWorkspace | null>;
  ingestCalculatorToolCribDocument?(
    input: IngestCalculatorToolCribDocumentInput,
  ): Promise<CalculatorToolCribWorkspace | null>;
  scanCalculatorToolCribSources?(
    input: RunCalculatorToolCribLocalScanInput,
  ): Promise<CalculatorToolCribWorkspace | null>;
}

export interface ShopFloorProvider {
  buildTrackedTasks(packet: ParsedJobTrackingPayload | null, department: string, role?: string): Promise<ShopFloorTrackedTask[]>;
  registerJob(input: {
    scanInput: string;
    jobId: string;
    selectedDepartment: string;
    employee?: Pick<Employee, 'first_name' | 'role' | 'department'> | null;
  }): Promise<JobRegistrationResult>;
  checkIntoDepartment(input: {
    trackedJob: ParsedJobTrackingPayload | null;
    employee?: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'role'> | null;
    selectedDepartment: string;
    existingCheckIns: ShopFloorDepartmentCheckIn[];
    existingTasks: ShopFloorTrackedTask[];
    nowMs?: number;
  }): Promise<DepartmentCheckInResult>;
  buildRoiSignals(input: {
    tasks: ShopFloorTrackedTask[];
    nowMs: number;
    cycleVariance: number;
    totalExtras: number;
  }): Promise<string[]>;
  recordTaskEvent(input: {
    trigger: ShopFloorTaskEventTrigger;
    jobId?: string;
    taskId?: string;
    operation?: string;
    department?: string;
    quantityCompleted?: number;
    scrapQty?: number;
    note?: string;
  }): Promise<ShopFloorTaskEventResult>;
}

// Backend contract note: shell commerce, tiers, add-ons, and buy recommendations
// are staged here as frontend seams only. Claude-owned backend work remains the
// final authority for live regional pricing, supplier APIs, tenant entitlements,
// and recommendation ranking.
export interface CommerceProvider {
  getShellCommerceCatalog(): Promise<ShellCommerceCatalog>;
  getProgramPurchaseRecommendations(input: ProgramReleaseInput & { selection: ShellCommerceSelection }): Promise<PurchaseRecommendation[]>;
  getAlarmCommerceWorkspace(input: {
    controller: string;
    code?: string;
    severity?: string;
    selection: ShellCommerceSelection;
  }): Promise<AlarmCommerceWorkspace>;
}

// Backend contract note: inventory population, receiving, custody, and insert/tool
// usage tracking should ultimately converge onto Claude-owned backend routes.
// The frontend seam exists so document intake, receiving, department routing,
// and usage UX can be built now without inventing the production event model.
export interface InventoryOperationsProvider {
  getInventoryOperationsWorkspace(): Promise<InventoryOperationsWorkspace>;
}

// Backend contract note: hot-job state can already hydrate from live routes,
// but frontend-managed subscription/fanout still exists as the fallback seam
// until Claude lands authoritative realtime propagation and audit trails.
export interface HotJobProvider {
  getHotJobs(): Promise<HotJobRecord[]>;
  subscribeHotJobs(listener: (records: HotJobRecord[]) => void): () => void;
  isJobHot(jobId: string): boolean;
  setJobHot(input: {
    jobId: string;
    partNumber: string;
    customer: string;
    dueDate?: string;
    note?: string;
    setBy?: string;
  }): Promise<HotJobRecord[]>;
  clearJobHot(jobId: string): Promise<HotJobRecord[]>;
  rankJobsForTodo(jobs: Job[]): Job[];
}

export interface LearningIntelligenceProvider {
  getPlatformLearningSnapshot(): Promise<PlatformLearningSnapshot>;
  getPrismIntelligenceWorkspace(): Promise<PrismIntelligenceWorkspace>;
  analyzePrismPrompt(prompt: string): Promise<PrismPromptAnalysis>;
  analyzePrismShopFloor(input: PrismShopFloorInsightInput): Promise<PrismShopFloorInsight>;
}

export interface MessagesProvider {
  getMessagesWorkspace(input?: {
    profileId?: string;
    email?: string | null;
    threadId?: string | null;
  }): Promise<MessagesWorkspace>;
}

export interface OperatingSystemServices
  extends ShellBootstrapProvider,
    AuthProvider,
    DeskProvider,
    SearchProvider,
    ShellRecordProvider,
    WorkflowProvider,
    JobExecutionProvider,
    SchedulingProvider,
    ProgramReleaseProvider,
    CalculatorMachineProfileProvider,
    CalculatorToolCribProvider,
    ShopFloorProvider,
    HotJobProvider,
    LearningIntelligenceProvider,
    MessagesProvider,
    InventoryOperationsProvider,
    CommerceProvider {}
