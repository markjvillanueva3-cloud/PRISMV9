export interface CamIntegration {
  cam_system: string;
  connection_status: "connected" | "disconnected" | "error";
  version: string;
  supported_operations: string[];
  last_sync: string;
  toolpath_count: number;
  post_processor: string;
  warnings?: string[];
}

export interface DncTransfer {
  transfer_id: string;
  file_name: string;
  machine_id: string;
  direction: "upload" | "download";
  protocol: "serial" | "ethernet" | "ftp" | "cifs";
  status: "queued" | "transferring" | "complete" | "error";
  progress_pct: number;
  bytes_transferred: number;
  transfer_rate_bps: number;
  error_message?: string;
}

export interface ErpSync {
  sync_id: string;
  erp_system: string;
  entity_type: "work_order" | "bom" | "routing" | "inventory" | "schedule";
  direction: "import" | "export" | "bidirectional";
  records_processed: number;
  records_failed: number;
  last_sync: string;
  status: "idle" | "syncing" | "complete" | "error";
  conflicts?: { field: string; local_value: string; remote_value: string }[];
}

export interface MobileInterface {
  device_id: string;
  device_type: "tablet" | "phone" | "hmi" | "wearable";
  connected_machine?: string;
  active_session: boolean;
  capabilities: string[];
  notifications: { id: string; type: string; message: string; timestamp: string }[];
  dashboard_widgets: string[];
}

export interface MeasurementResult {
  measurement_id: string;
  device: string;
  device_type: "cmm" | "laser_scanner" | "vision" | "profilometer" | "caliper";
  features: { name: string; nominal: number; actual: number; tolerance: number; deviation: number; in_spec: boolean }[];
  overall_pass: boolean;
  report_url?: string;
  timestamp: string;
}

export interface IntegrationInput {
  action: string;
  [key: string]: unknown;
}

export interface ApiError {
  message: string;
  code?: string;
}
