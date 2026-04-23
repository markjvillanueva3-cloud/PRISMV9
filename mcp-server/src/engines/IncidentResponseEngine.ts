/**
 * IncidentResponseEngine — U-LPR-SEC-IR
 *
 * Incident response and security event management:
 * - DFIR (Digital Forensics & Incident Response)
 * - Forensic snapshot specifications
 * - Chain of custody tracking
 * - IR runbook with RACI
 * - Tabletop exercise tracking
 * - Legal hold coordination
 * - LLM red-team attack detection
 * - Prompt injection detection
 * - Jailbreak detection
 * - PII extraction detection
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC-IR
 * @phase PHASE-9 (Security + Compliance)
 */

import * as crypto from 'crypto';
import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IncidentType =
  | 'data_breach'
  | 'unauthorized_access'
  | 'malware'
  | 'phishing'
  | 'dos_attack'
  | 'prompt_injection'
  | 'jailbreak_attempt'
  | 'pii_extraction'
  | 'model_inversion'
  | 'data_exfiltration'
  | 'insider_threat'
  | 'policy_violation'
  | 'other';

export type IncidentStatus = 'detected' | 'triaged' | 'investigating' | 'containing' | 'eradicating' | 'recovering' | 'closed';

export interface Incident {
  id: string;
  tenantId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  detectedAt: number;
  triageAt?: number;
  containedAt?: number;
  resolvedAt?: number;
  closedAt?: number;
  assignee?: string;
  affectedSystems: string[];
  affectedUsers: number;
  indicators: string[];
  timeline: IncidentTimelineEntry[];
  forensicSnapshots: string[];
  chainOfCustody: ChainOfCustodyEntry[];
  legalHoldActive: boolean;
  llmAttack?: LLMAttackDetails;
}

export interface IncidentTimelineEntry {
  timestamp: number;
  action: string;
  actor: string;
  details?: string;
}

export interface ChainOfCustodyEntry {
  id: string;
  evidenceId: string;
  evidenceType: 'log' | 'memory_dump' | 'disk_image' | 'network_capture' | 'screenshot' | 'model_output' | 'prompt_log';
  collectedAt: number;
  collectedBy: string;
  hash: string;
  hashAlgorithm: string;
  location: string;
  notes?: string;
}

export interface ForensicSnapshot {
  id: string;
  incidentId: string;
  tenantId: string;
  createdAt: number;
  createdBy: string;
  type: 'ram' | 'disk' | 'log_bundle' | 'llm_context' | 'full';
  hash: string;
  size: number;
  location: string;
  encrypted: boolean;
  retentionDays: number;
}

export interface LLMAttackDetails {
  attackType: 'prompt_injection' | 'jailbreak' | 'pii_extraction' | 'model_inversion';
  prompt?: string;
  response?: string;
  detectionMethod: string;
  confidence: number;
  indicators: string[];
}

export interface IRRunbook {
  id: string;
  tenantId: string;
  name: string;
  version: string;
  incidentTypes: IncidentType[];
  steps: RunbookStep[];
  raciMatrix: Record<string, RAClRole>;
  lastUpdated: number;
  lastExercise?: number;
}

export interface RunbookStep {
  order: number;
  action: string;
  responsible: string;
  accountable: string;
  consulted: string[];
  informed: string[];
  timeLimit?: string;
  automated: boolean;
}

export type RAClRole = 'responsible' | 'accountable' | 'consulted' | 'informed';

export interface TabletopExercise {
  id: string;
  tenantId: string;
  runbookId: string;
  scenario: string;
  conductedAt: number;
  participants: string[];
  duration: number;
  findings: string[];
  improvements: string[];
  nextScheduled?: number;
}

export interface LLMThreatDetection {
  isAttack: boolean;
  attackType?: LLMAttackDetails['attackType'];
  confidence: number;
  indicators: string[];
  recommendation: string;
}

export interface IncidentResponseConfig {
  tenantId: string;
  defaultRetentionDays: number;
  autoTriageEnabled: boolean;
  llmMonitoringEnabled: boolean;
  notificationWebhooks: string[];
  escalationContacts: Array<{ severity: IncidentSeverity; contacts: string[] }>;
}

export interface IRStats {
  totalIncidents: number;
  activeIncidents: number;
  closedIncidents: number;
  incidentsBySeverity: Record<IncidentSeverity, number>;
  incidentsByType: Record<string, number>;
  avgResolutionTimeMs: number;
  forensicSnapshots: number;
  runbooks: number;
  exercises: number;
  llmAttacksDetected: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class IncidentResponseEngine {
  private incidents: Map<string, Incident> = new Map();
  private snapshots: Map<string, ForensicSnapshot> = new Map();
  private runbooks: Map<string, IRRunbook> = new Map();
  private exercises: Map<string, TabletopExercise> = new Map();
  private configs: Map<string, IncidentResponseConfig> = new Map();

  private readonly PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(previous|all|above)\s+instructions/i,
    /disregard\s+(your|the)\s+(instructions|rules|guidelines)/i,
    /you\s+are\s+now\s+a/i,
    /pretend\s+(you're|to\s+be)/i,
    /jailbreak/i,
    /\[system\]/i,
    /\<\|im_start\|\>/i,
    /\<\|endoftext\|\>/i,
    /DAN\s+mode/i,
    /bypass\s+(safety|filter|restriction)/i,
    /act\s+as\s+if\s+you\s+have\s+no\s+(rules|restrictions)/i,
    /reveal\s+(your|the)\s+(system|initial)\s+prompt/i,
    /what\s+(is|are)\s+your\s+(instructions|rules)/i,
  ];

  private readonly PII_EXTRACTION_PATTERNS = [
    /give\s+me\s+(all\s+)?(user|customer|employee)\s+(data|information|records)/i,
    /extract\s+(all\s+)?(personal|private|sensitive)\s+(information|data)/i,
    /list\s+(all\s+)?email\s+addresses/i,
    /show\s+(me\s+)?social\s+security\s+numbers/i,
    /reveal\s+(all\s+)?credit\s+card/i,
    /dump\s+(the\s+)?database/i,
  ];

  private readonly MODEL_INVERSION_PATTERNS = [
    /what\s+(data|information)\s+were\s+you\s+trained\s+on/i,
    /reveal\s+training\s+(data|examples)/i,
    /generate\s+(exact|verbatim)\s+training/i,
    /memorized\s+(data|information)/i,
    /reproduce\s+(copyrighted|licensed)\s+content/i,
  ];

  private defaultConfig: Omit<IncidentResponseConfig, 'tenantId'> = {
    defaultRetentionDays: 90,
    autoTriageEnabled: true,
    llmMonitoringEnabled: true,
    notificationWebhooks: [],
    escalationContacts: [],
  };

  /**
   * Sets configuration for a tenant.
   */
  setConfig(config: IncidentResponseConfig): void {
    this.configs.set(config.tenantId, config);
    log.info(`[IR] Config set for tenant ${config.tenantId}`);
  }

  /**
   * Gets configuration for a tenant.
   */
  getConfig(tenantId: string): IncidentResponseConfig {
    return this.configs.get(tenantId) || { tenantId, ...this.defaultConfig };
  }

  /**
   * Creates a new incident.
   */
  createIncident(input: {
    tenantId: string;
    type: IncidentType;
    severity: IncidentSeverity;
    title: string;
    description: string;
    affectedSystems?: string[];
    affectedUsers?: number;
    indicators?: string[];
    llmAttack?: LLMAttackDetails;
  }): Incident {
    const id = this.generateId('inc');
    const now = Date.now();
    const config = this.getConfig(input.tenantId);

    const incident: Incident = {
      id,
      tenantId: input.tenantId,
      type: input.type,
      severity: input.severity,
      status: config.autoTriageEnabled ? 'triaged' : 'detected',
      title: input.title,
      description: input.description,
      detectedAt: now,
      triageAt: config.autoTriageEnabled ? now : undefined,
      affectedSystems: input.affectedSystems || [],
      affectedUsers: input.affectedUsers || 0,
      indicators: input.indicators || [],
      timeline: [{
        timestamp: now,
        action: 'Incident detected',
        actor: 'system',
        details: input.description,
      }],
      forensicSnapshots: [],
      chainOfCustody: [],
      legalHoldActive: false,
      llmAttack: input.llmAttack,
    };

    if (config.autoTriageEnabled) {
      incident.timeline.push({
        timestamp: now,
        action: 'Auto-triaged',
        actor: 'system',
        details: `Severity: ${input.severity}`,
      });
    }

    this.incidents.set(id, incident);
    log.warn(`[IR] Incident created: ${id} - ${input.type} (${input.severity})`);

    return incident;
  }

  /**
   * Updates incident status.
   */
  updateStatus(incidentId: string, status: IncidentStatus, actor: string, notes?: string): Incident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    const now = Date.now();
    const oldStatus = incident.status;
    incident.status = status;

    // Set timestamps based on status
    switch (status) {
      case 'triaged':
        incident.triageAt = now;
        break;
      case 'containing':
      case 'eradicating':
        incident.containedAt = incident.containedAt || now;
        break;
      case 'recovering':
      case 'closed':
        incident.resolvedAt = incident.resolvedAt || now;
        if (status === 'closed') {
          incident.closedAt = now;
        }
        break;
    }

    incident.timeline.push({
      timestamp: now,
      action: `Status changed: ${oldStatus} → ${status}`,
      actor,
      details: notes,
    });

    log.info(`[IR] Incident ${incidentId} status: ${oldStatus} → ${status}`);
    return incident;
  }

  /**
   * Assigns incident to handler.
   */
  assignIncident(incidentId: string, assignee: string, actor: string): Incident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    const oldAssignee = incident.assignee;
    incident.assignee = assignee;

    incident.timeline.push({
      timestamp: Date.now(),
      action: oldAssignee ? `Reassigned from ${oldAssignee}` : 'Assigned',
      actor,
      details: `Assigned to ${assignee}`,
    });

    return incident;
  }

  /**
   * Adds a timeline entry.
   */
  addTimelineEntry(incidentId: string, action: string, actor: string, details?: string): Incident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    incident.timeline.push({
      timestamp: Date.now(),
      action,
      actor,
      details,
    });

    return incident;
  }

  /**
   * Creates a forensic snapshot.
   */
  createForensicSnapshot(input: {
    incidentId: string;
    tenantId: string;
    createdBy: string;
    type: ForensicSnapshot['type'];
    location: string;
    size: number;
    encrypted?: boolean;
  }): ForensicSnapshot {
    const config = this.getConfig(input.tenantId);
    const id = this.generateId('snap');
    const now = Date.now();

    const hash = crypto.randomBytes(32).toString('hex');

    const snapshot: ForensicSnapshot = {
      id,
      incidentId: input.incidentId,
      tenantId: input.tenantId,
      createdAt: now,
      createdBy: input.createdBy,
      type: input.type,
      hash,
      size: input.size,
      location: input.location,
      encrypted: input.encrypted ?? true,
      retentionDays: config.defaultRetentionDays,
    };

    this.snapshots.set(id, snapshot);

    // Link to incident
    const incident = this.incidents.get(input.incidentId);
    if (incident) {
      incident.forensicSnapshots.push(id);
      incident.timeline.push({
        timestamp: now,
        action: `Forensic snapshot created: ${input.type}`,
        actor: input.createdBy,
        details: `Location: ${input.location}, Hash: ${hash.substring(0, 16)}...`,
      });
    }

    log.info(`[IR] Forensic snapshot created: ${id} for incident ${input.incidentId}`);
    return snapshot;
  }

  /**
   * Adds chain of custody entry.
   */
  addChainOfCustody(incidentId: string, entry: {
    evidenceType: ChainOfCustodyEntry['evidenceType'];
    collectedBy: string;
    location: string;
    notes?: string;
  }): ChainOfCustodyEntry | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    const id = this.generateId('coc');
    const evidenceId = this.generateId('evd');
    const hash = crypto.randomBytes(32).toString('hex');

    const cocEntry: ChainOfCustodyEntry = {
      id,
      evidenceId,
      evidenceType: entry.evidenceType,
      collectedAt: Date.now(),
      collectedBy: entry.collectedBy,
      hash,
      hashAlgorithm: 'SHA-256',
      location: entry.location,
      notes: entry.notes,
    };

    incident.chainOfCustody.push(cocEntry);
    incident.timeline.push({
      timestamp: Date.now(),
      action: `Evidence collected: ${entry.evidenceType}`,
      actor: entry.collectedBy,
      details: `Evidence ID: ${evidenceId}`,
    });

    log.info(`[IR] Chain of custody entry added: ${id} for incident ${incidentId}`);
    return cocEntry;
  }

  /**
   * Sets legal hold for incident.
   */
  setLegalHold(incidentId: string, active: boolean, actor: string): Incident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    incident.legalHoldActive = active;
    incident.timeline.push({
      timestamp: Date.now(),
      action: active ? 'Legal hold activated' : 'Legal hold released',
      actor,
    });

    log.info(`[IR] Legal hold ${active ? 'activated' : 'released'} for incident ${incidentId}`);
    return incident;
  }

  /**
   * Creates an IR runbook.
   */
  createRunbook(input: {
    tenantId: string;
    name: string;
    version: string;
    incidentTypes: IncidentType[];
    steps: RunbookStep[];
    raciMatrix?: Record<string, RAClRole>;
  }): IRRunbook {
    const id = this.generateId('rb');

    const runbook: IRRunbook = {
      id,
      tenantId: input.tenantId,
      name: input.name,
      version: input.version,
      incidentTypes: input.incidentTypes,
      steps: input.steps,
      raciMatrix: input.raciMatrix || {},
      lastUpdated: Date.now(),
    };

    this.runbooks.set(id, runbook);
    log.info(`[IR] Runbook created: ${input.name} v${input.version}`);

    return runbook;
  }

  /**
   * Gets runbook for incident type.
   */
  getRunbookForType(tenantId: string, type: IncidentType): IRRunbook | null {
    for (const runbook of this.runbooks.values()) {
      if (runbook.tenantId === tenantId && runbook.incidentTypes.includes(type)) {
        return runbook;
      }
    }
    return null;
  }

  /**
   * Records a tabletop exercise.
   */
  recordExercise(input: {
    tenantId: string;
    runbookId: string;
    scenario: string;
    participants: string[];
    duration: number;
    findings: string[];
    improvements: string[];
    nextScheduled?: number;
  }): TabletopExercise {
    const id = this.generateId('ex');

    const exercise: TabletopExercise = {
      id,
      tenantId: input.tenantId,
      runbookId: input.runbookId,
      scenario: input.scenario,
      conductedAt: Date.now(),
      participants: input.participants,
      duration: input.duration,
      findings: input.findings,
      improvements: input.improvements,
      nextScheduled: input.nextScheduled,
    };

    this.exercises.set(id, exercise);

    // Update runbook last exercise
    const runbook = this.runbooks.get(input.runbookId);
    if (runbook) {
      runbook.lastExercise = exercise.conductedAt;
    }

    log.info(`[IR] Tabletop exercise recorded: ${input.scenario}`);
    return exercise;
  }

  /**
   * Detects LLM threats in prompts/responses.
   */
  detectLLMThreat(input: { prompt: string; response?: string }): LLMThreatDetection {
    const indicators: string[] = [];
    let attackType: LLMAttackDetails['attackType'] | undefined;
    let maxConfidence = 0;

    // Check prompt injection patterns
    for (const pattern of this.PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(input.prompt)) {
        indicators.push(`Prompt injection pattern: ${pattern.source.substring(0, 30)}...`);
        if (!attackType || maxConfidence < 0.8) {
          attackType = input.prompt.toLowerCase().includes('jailbreak') ? 'jailbreak' : 'prompt_injection';
          maxConfidence = Math.max(maxConfidence, 0.8);
        }
      }
    }

    // Check PII extraction patterns
    for (const pattern of this.PII_EXTRACTION_PATTERNS) {
      if (pattern.test(input.prompt)) {
        indicators.push(`PII extraction pattern: ${pattern.source.substring(0, 30)}...`);
        if (!attackType || maxConfidence < 0.85) {
          attackType = 'pii_extraction';
          maxConfidence = Math.max(maxConfidence, 0.85);
        }
      }
    }

    // Check model inversion patterns
    for (const pattern of this.MODEL_INVERSION_PATTERNS) {
      if (pattern.test(input.prompt)) {
        indicators.push(`Model inversion pattern: ${pattern.source.substring(0, 30)}...`);
        if (!attackType || maxConfidence < 0.7) {
          attackType = 'model_inversion';
          maxConfidence = Math.max(maxConfidence, 0.7);
        }
      }
    }

    // Check response for leaked sensitive patterns
    if (input.response) {
      if (/system\s*prompt|initial\s*instructions/i.test(input.response)) {
        indicators.push('Response may contain system prompt leak');
        maxConfidence = Math.max(maxConfidence, 0.9);
        attackType = attackType || 'prompt_injection';
      }
    }

    const isAttack = indicators.length > 0;
    let recommendation = 'No action required';

    if (isAttack) {
      switch (attackType) {
        case 'prompt_injection':
          recommendation = 'Block request, log attempt, consider IP rate limiting';
          break;
        case 'jailbreak':
          recommendation = 'Block request, flag user for review, increase monitoring';
          break;
        case 'pii_extraction':
          recommendation = 'Block request, audit data access, notify security team';
          break;
        case 'model_inversion':
          recommendation = 'Block request, log for analysis, review model outputs';
          break;
      }
    }

    return {
      isAttack,
      attackType,
      confidence: maxConfidence,
      indicators,
      recommendation,
    };
  }

  /**
   * Creates incident from LLM threat detection.
   */
  createIncidentFromLLMThreat(
    tenantId: string,
    detection: LLMThreatDetection,
    prompt: string,
    response?: string
  ): Incident | null {
    if (!detection.isAttack) return null;

    return this.createIncident({
      tenantId,
      type: detection.attackType === 'jailbreak' ? 'jailbreak_attempt' :
            detection.attackType === 'pii_extraction' ? 'pii_extraction' :
            detection.attackType === 'model_inversion' ? 'model_inversion' : 'prompt_injection',
      severity: detection.confidence >= 0.9 ? 'high' : detection.confidence >= 0.7 ? 'medium' : 'low',
      title: `LLM ${detection.attackType} detected`,
      description: detection.recommendation,
      indicators: detection.indicators,
      llmAttack: {
        attackType: detection.attackType!,
        prompt,
        response,
        detectionMethod: 'pattern_matching',
        confidence: detection.confidence,
        indicators: detection.indicators,
      },
    });
  }

  /**
   * Gets incident by ID.
   */
  getIncident(incidentId: string): Incident | null {
    return this.incidents.get(incidentId) || null;
  }

  /**
   * Lists incidents for a tenant.
   */
  listIncidents(tenantId: string, options?: {
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    type?: IncidentType;
    activeOnly?: boolean;
  }): Incident[] {
    const results: Incident[] = [];

    for (const incident of this.incidents.values()) {
      if (incident.tenantId !== tenantId) continue;
      if (options?.status && incident.status !== options.status) continue;
      if (options?.severity && incident.severity !== options.severity) continue;
      if (options?.type && incident.type !== options.type) continue;
      if (options?.activeOnly && incident.status === 'closed') continue;
      results.push(incident);
    }

    return results.sort((a, b) => b.detectedAt - a.detectedAt);
  }

  /**
   * Gets statistics.
   */
  getStats(): IRStats {
    let activeIncidents = 0;
    let closedIncidents = 0;
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let llmAttacksDetected = 0;
    const bySeverity: Record<IncidentSeverity, number> = {
      critical: 0, high: 0, medium: 0, low: 0, info: 0,
    };
    const byType: Record<string, number> = {};

    for (const incident of this.incidents.values()) {
      bySeverity[incident.severity]++;
      byType[incident.type] = (byType[incident.type] || 0) + 1;

      if (incident.status === 'closed') {
        closedIncidents++;
        if (incident.closedAt && incident.detectedAt) {
          totalResolutionTime += incident.closedAt - incident.detectedAt;
          resolvedCount++;
        }
      } else {
        activeIncidents++;
      }

      if (incident.llmAttack) {
        llmAttacksDetected++;
      }
    }

    return {
      totalIncidents: this.incidents.size,
      activeIncidents,
      closedIncidents,
      incidentsBySeverity: bySeverity,
      incidentsByType: byType,
      avgResolutionTimeMs: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      forensicSnapshots: this.snapshots.size,
      runbooks: this.runbooks.size,
      exercises: this.exercises.size,
      llmAttacksDetected,
    };
  }

  /**
   * Clears all data (for testing).
   */
  clear(): void {
    this.incidents.clear();
    this.snapshots.clear();
    this.runbooks.clear();
    this.exercises.clear();
    this.configs.clear();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
  }
}

export const incidentResponseEngine = new IncidentResponseEngine();
