import { useMemo } from 'react';
import { WorkspaceAICopilot, type WorkspaceCopilotSuggestion } from './WorkspaceAICopilot';

export interface AppwCaptureOpsCopilotProps {
  deskLabel: string;
  activeLaneLabel: string;
  activeLaneDetail: string;
  workflowSourceLabel?: string | null;
  upstreamSourceLabel?: string | null;
  workflowReference?: string | null;
  contextCustomer?: string | null;
  contextThreadId?: string | null;
  targetLabel?: string | null;
  targetRecordId?: string | null;
  department?: string | null;
  machine?: string | null;
  zone?: string | null;
  note?: string | null;
  previewState?: string | null;
  previewError?: string | null;
  scanMessage?: string | null;
  latestScan?: string | null;
  cameraSupported?: boolean;
  microphoneSupported?: boolean;
  scannerSupported?: boolean;
  recordCount?: number;
  photoCount?: number;
  videoCount?: number;
  audioCount?: number;
  documentCount?: number;
  qrCount?: number;
  mapCount?: number;
  alarmEvidenceCount?: number;
  qualityEvidenceCount?: number;
  routeContextRefreshedAt?: number | null;
  devicePostureRefreshedAt?: number | null;
  previewPostureRefreshedAt?: number | null;
  ledgerRefreshedAt?: number | null;
}

function formatRefresh(value?: number | null) {
  if (!value) {
    return 'not refreshed in this session';
  }

  return `refreshed ${new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function buildSummary(props: AppwCaptureOpsCopilotProps) {
  const posture: string[] = [];

  posture.push(`${props.activeLaneLabel} lane active`);
  if (props.activeLaneDetail) posture.push(props.activeLaneDetail);
  if (props.workflowSourceLabel) posture.push(`launched from ${props.workflowSourceLabel}`);
  if (props.upstreamSourceLabel) posture.push(`upstream ${props.upstreamSourceLabel}`);
  if (props.workflowReference) posture.push(`record ${props.workflowReference}`);
  if (props.contextCustomer) posture.push(`customer ${props.contextCustomer}`);
  if (props.contextThreadId) posture.push(`thread ${props.contextThreadId}`);
  if (props.targetLabel) posture.push(`target ${props.targetLabel}`);
  if (props.targetRecordId) posture.push(`record id ${props.targetRecordId}`);
  if (props.department) posture.push(`department ${props.department}`);
  if (props.machine) posture.push(`machine ${props.machine}`);
  if (props.zone) posture.push(`zone ${props.zone}`);
  if (props.note) posture.push(props.note);
  if (props.previewState) posture.push(`preview ${props.previewState}`);
  if (props.latestScan) posture.push('qr payload staged');
  if (props.previewError) posture.push('preview recovery required');
  if (props.scanMessage) posture.push(props.scanMessage);
  posture.push(props.cameraSupported ? 'camera ready' : 'camera upload fallback');
  posture.push(props.microphoneSupported ? 'microphone ready' : 'audio upload fallback');
  posture.push(props.scannerSupported ? 'live qr decode ready' : 'manual qr fallback');
  posture.push(`${props.recordCount ?? 0} staged records`);
  if ((props.photoCount ?? 0) > 0) posture.push(`${props.photoCount} photos`);
  if ((props.videoCount ?? 0) > 0) posture.push(`${props.videoCount} videos`);
  if ((props.audioCount ?? 0) > 0) posture.push(`${props.audioCount} audio captures`);
  if ((props.documentCount ?? 0) > 0) posture.push(`${props.documentCount} docs`);
  if ((props.qrCount ?? 0) > 0) posture.push(`${props.qrCount} qr captures`);
  if ((props.mapCount ?? 0) > 0) posture.push(`${props.mapCount} map captures`);
  if ((props.alarmEvidenceCount ?? 0) > 0) posture.push(`${props.alarmEvidenceCount} troubleshooting records`);
  if ((props.qualityEvidenceCount ?? 0) > 0) posture.push(`${props.qualityEvidenceCount} quality evidence records`);
  posture.push(`workflow ${formatRefresh(props.routeContextRefreshedAt)}`);
  posture.push(`device posture ${formatRefresh(props.devicePostureRefreshedAt)}`);
  posture.push(`preview posture ${formatRefresh(props.previewPostureRefreshedAt)}`);
  posture.push(`ledger ${formatRefresh(props.ledgerRefreshedAt)}`);

  return `PRISM AI is reasoning over workflow continuity, device capability posture, live preview readiness, QR staging, evidence routing risk, and staged-ledger coverage for the Capture Ops desk. Current posture: ${posture.join(' | ')}.`;
}

function buildSuggestions(props: AppwCaptureOpsCopilotProps): WorkspaceCopilotSuggestion[] {
  const suggestions: WorkspaceCopilotSuggestion[] = [];

  if ((props.recordCount ?? 0) > 0) {
    suggestions.push({
      id: 'route-staged-evidence',
      label: 'Route staged evidence',
      query: `Review the staged capture ledger for ${props.targetRecordId || props.workflowReference || 'the active workflow'} and explain which records should flow into jobs, machines, inventory, quality, or alarm follow-up first so evidence continuity is preserved.`,
    });
  }

  if (props.previewError || !props.cameraSupported || !props.scannerSupported) {
    suggestions.push({
      id: 'recover-capture-posture',
      label: 'Recover capture posture',
      query: 'Assess the current device and preview posture. Explain the safest recovery path when live preview or QR decode is degraded, and show how the operator should continue capture work without losing workflow continuity.',
    });
  }

  if (props.latestScan || props.scannerSupported) {
    suggestions.push({
      id: 'assess-traveler-readiness',
      label: 'Assess traveler readiness',
      query: `Use the active QR and traveler posture${props.latestScan ? ' with a payload already staged' : ''} to explain whether the next step should return to shop floor, open messages, or collect more evidence before handoff.`,
    });
  }

  if ((props.alarmEvidenceCount ?? 0) > 0 || props.targetLabel === 'Alarm / troubleshooting') {
    suggestions.push({
      id: 'triage-machine-evidence',
      label: 'Triage machine evidence',
      query: 'Interpret the current troubleshooting evidence and explain whether the next move is alarm escalation, parameter review, machine registry update, or additional capture before operations resume.',
    });
  }

  if (props.workflowSourceLabel || props.upstreamSourceLabel || props.workflowReference) {
    suggestions.push({
      id: 'preserve-workflow-continuity',
      label: 'Preserve workflow continuity',
      query: `Explain how Capture Ops should preserve continuity${props.workflowReference ? ` for ${props.workflowReference}` : ''} while handing work back into shop floor, messages, or another APPW desk without dropping the upstream record context.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'open-capture-brief',
      label: 'Open capture brief',
      query: `Review the ${props.deskLabel} context and recommend the next evidence, routing, and recovery actions.`,
    });
  }

  return suggestions.slice(0, 6);
}

function buildContext(props: AppwCaptureOpsCopilotProps) {
  return {
    desk: props.deskLabel,
    active_lane: props.activeLaneLabel,
    active_lane_detail: props.activeLaneDetail,
    workflow_source: props.workflowSourceLabel,
    upstream_source: props.upstreamSourceLabel,
    workflow_reference: props.workflowReference,
    context_customer: props.contextCustomer,
    context_thread_id: props.contextThreadId,
    target_label: props.targetLabel,
    target_record_id: props.targetRecordId,
    department: props.department,
    machine: props.machine,
    zone: props.zone,
    note: props.note,
    preview_state: props.previewState,
    preview_error: props.previewError,
    scan_message: props.scanMessage,
    latest_scan: props.latestScan,
    camera_supported: props.cameraSupported ?? false,
    microphone_supported: props.microphoneSupported ?? false,
    scanner_supported: props.scannerSupported ?? false,
    record_count: props.recordCount ?? 0,
    photo_count: props.photoCount ?? 0,
    video_count: props.videoCount ?? 0,
    audio_count: props.audioCount ?? 0,
    document_count: props.documentCount ?? 0,
    qr_count: props.qrCount ?? 0,
    map_count: props.mapCount ?? 0,
    alarm_evidence_count: props.alarmEvidenceCount ?? 0,
    quality_evidence_count: props.qualityEvidenceCount ?? 0,
    route_context_refreshed_at: props.routeContextRefreshedAt ?? null,
    device_posture_refreshed_at: props.devicePostureRefreshedAt ?? null,
    preview_posture_refreshed_at: props.previewPostureRefreshedAt ?? null,
    ledger_refreshed_at: props.ledgerRefreshedAt ?? null,
    appw_stage: 'APPW-MS1 capture intelligence hardening',
    desk_type: 'capture_ops',
  };
}

export function AppwCaptureOpsCopilot(props: AppwCaptureOpsCopilotProps) {
  const summary = useMemo(
    () => buildSummary(props),
    [
      props.activeLaneDetail,
      props.activeLaneLabel,
      props.alarmEvidenceCount,
      props.audioCount,
      props.cameraSupported,
      props.contextCustomer,
      props.contextThreadId,
      props.department,
      props.devicePostureRefreshedAt,
      props.documentCount,
      props.ledgerRefreshedAt,
      props.latestScan,
      props.machine,
      props.mapCount,
      props.microphoneSupported,
      props.note,
      props.photoCount,
      props.previewError,
      props.previewPostureRefreshedAt,
      props.previewState,
      props.qrCount,
      props.qualityEvidenceCount,
      props.recordCount,
      props.routeContextRefreshedAt,
      props.scanMessage,
      props.scannerSupported,
      props.targetLabel,
      props.targetRecordId,
      props.upstreamSourceLabel,
      props.videoCount,
      props.workflowReference,
      props.workflowSourceLabel,
      props.zone,
    ],
  );

  const suggestions = useMemo(
    () => buildSuggestions(props),
    [
      props.alarmEvidenceCount,
      props.cameraSupported,
      props.deskLabel,
      props.latestScan,
      props.previewError,
      props.recordCount,
      props.scannerSupported,
      props.targetLabel,
      props.targetRecordId,
      props.upstreamSourceLabel,
      props.workflowReference,
      props.workflowSourceLabel,
    ],
  );

  const context = useMemo(
    () => buildContext(props),
    [
      props.activeLaneDetail,
      props.activeLaneLabel,
      props.alarmEvidenceCount,
      props.audioCount,
      props.cameraSupported,
      props.contextCustomer,
      props.contextThreadId,
      props.department,
      props.deskLabel,
      props.devicePostureRefreshedAt,
      props.documentCount,
      props.latestScan,
      props.ledgerRefreshedAt,
      props.machine,
      props.mapCount,
      props.microphoneSupported,
      props.note,
      props.photoCount,
      props.previewError,
      props.previewPostureRefreshedAt,
      props.previewState,
      props.qrCount,
      props.qualityEvidenceCount,
      props.recordCount,
      props.routeContextRefreshedAt,
      props.scanMessage,
      props.scannerSupported,
      props.targetLabel,
      props.targetRecordId,
      props.upstreamSourceLabel,
      props.videoCount,
      props.workflowReference,
      props.workflowSourceLabel,
      props.zone,
    ],
  );

  return (
    <div data-testid="appw-capture-copilot">
      <WorkspaceAICopilot workspaceLabel={props.deskLabel} summary={summary} context={context} suggestions={suggestions} />
    </div>
  );
}

export default AppwCaptureOpsCopilot;
