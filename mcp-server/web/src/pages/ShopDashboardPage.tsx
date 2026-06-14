import { useState, useEffect, useCallback } from 'react';
import { SafetyBadge } from '../components/shared/SafetyBadge';
import { useWebSocket, type WSMessage } from '../hooks/useWebSocket';
import { NotificationBell, NotificationPanel, ToastContainer, useNotifications } from '../components/shared/NotificationCenter';

// ── Types ──────────────────────────────────────────────────────────

interface MachineStatus {
  id: string;
  name: string;
  brand: string;
  status: 'running' | 'idle' | 'alarm' | 'offline' | 'setup';
  spindle_rpm: number;
  feed_rate: number;
  current_program: string;
  uptime_pct: number;
}

interface JobProgress {
  id: string;
  job_number: string;
  part_name: string;
  machine: string;
  progress_pct: number;
  completed: number;
  total: number;
  eta_minutes: number;
  current_op: string;
}

interface ToolLife {
  id: string;
  tool_name: string;
  machine: string;
  life_remaining_pct: number;
  estimated_minutes: number;
  wear_rate: 'normal' | 'elevated' | 'critical';
}

interface OEEData {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

// ── Status Colors ──────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  running: { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  idle: { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' },
  alarm: { bg: '#fecaca', text: '#991b1b', dot: '#ef4444' },
  offline: { bg: '#e5e7eb', text: '#374151', dot: '#9ca3af' },
  setup: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
};

// ── Mock Data (replaced by WebSocket in production) ────────────────

// JM Die Company shop-floor seed — the REAL fleet (Okuma/Hurco/Haas/Mitsubishi per
// src/data/jm-die-profile.ts JM_DIE_CONTROLLER_MAP) running real cold-heading die/punch work for
// JM's fastener customers. Live telemetry replaces this once the machine WebSocket rooms are wired;
// until then this is the demo display. Mirrors api/dashboard.ts DEMO_* so both dashboards agree.
const MOCK_MACHINES: MachineStatus[] = [
  { id: 'm1', name: 'Hurco VM30i', brand: 'Hurco', status: 'running', spindle_rpm: 9000, feed_rate: 1800, current_program: '1042', uptime_pct: 93 },
  { id: 'm2', name: 'Okuma GENOS L300-M', brand: 'Okuma', status: 'running', spindle_rpm: 3500, feed_rate: 220, current_program: 'O2207', uptime_pct: 90 },
  { id: 'm3', name: 'Haas VF-2', brand: 'Haas', status: 'idle', spindle_rpm: 0, feed_rate: 0, current_program: '', uptime_pct: 84 },
  { id: 'm4', name: 'Okuma Multus B250II', brand: 'Okuma', status: 'setup', spindle_rpm: 0, feed_rate: 0, current_program: '', uptime_pct: 81 },
  { id: 'm5', name: 'Mitsubishi EA12S', brand: 'Mitsubishi', status: 'alarm', spindle_rpm: 0, feed_rate: 0, current_program: 'EA-0571', uptime_pct: 70 },
  { id: 'm6', name: 'Okuma M460V-5AX', brand: 'Okuma', status: 'running', spindle_rpm: 12000, feed_rate: 2400, current_program: 'DIE_CAV.MIN', uptime_pct: 88 },
];

const MOCK_JOBS: JobProgress[] = [
  { id: 'j1', job_number: 'JM-24-0412', part_name: 'Cold-Header Die — HOLO-KROME 3/8-16 SHCS', machine: 'Hurco VM30i', progress_pct: 72, completed: 36, total: 50, eta_minutes: 85, current_op: 'Op 30 - Cavity Mill' },
  { id: 'j2', job_number: 'JM-24-0418', part_name: 'Trim Die Insert — ITW Shakeproof', machine: 'Okuma GENOS L300-M', progress_pct: 45, completed: 9, total: 20, eta_minutes: 210, current_op: 'Op 20 - OD Turn' },
  { id: 'j3', job_number: 'JM-24-0421', part_name: 'Carbide Punch — SEMBLEX T-25 TORX', machine: 'Okuma M460V-5AX', progress_pct: 90, completed: 18, total: 20, eta_minutes: 22, current_op: 'Op 40 - Finish Profile' },
];

const MOCK_TOOLS: ToolLife[] = [
  { id: 't1', tool_name: 'EM 6mm 4F AlTiN (D2 die steel)', machine: 'Hurco VM30i', life_remaining_pct: 35, estimated_minutes: 42, wear_rate: 'elevated' },
  { id: 't2', tool_name: 'Carbide Drill 4.2mm', machine: 'Hurco VM30i', life_remaining_pct: 78, estimated_minutes: 156, wear_rate: 'normal' },
  { id: 't3', tool_name: 'CNMG 432 Carbide (M2 HSS)', machine: 'Okuma GENOS L300-M', life_remaining_pct: 12, estimated_minutes: 8, wear_rate: 'critical' },
  { id: 't4', tool_name: 'Ball EM 3mm 2F (H13)', machine: 'Okuma M460V-5AX', life_remaining_pct: 65, estimated_minutes: 95, wear_rate: 'normal' },
];

const MOCK_OEE: OEEData = { availability: 0.87, performance: 0.82, quality: 0.96, oee: 0.685 };

// ── Components ─────────────────────────────────────────────────────

function StatCard({ title, value, subtitle, color }: { title: string; value: string; subtitle?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color ?? '#111827' }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

function MachineCard({ machine }: { machine: MachineStatus }) {
  const s = STATUS_COLORS[machine.status] ?? STATUS_COLORS.offline;
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{machine.name}</div>
        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: s.bg, color: s.text, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
          {machine.status.toUpperCase()}
        </span>
      </div>
      {machine.status === 'running' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12, color: '#6b7280' }}>
          <div>RPM: <strong style={{ color: '#111' }}>{machine.spindle_rpm.toLocaleString()}</strong></div>
          <div>Feed: <strong style={{ color: '#111' }}>{machine.feed_rate}</strong> mm/min</div>
          <div>Program: <strong style={{ color: '#111' }}>{machine.current_program}</strong></div>
          <div>Uptime: <strong style={{ color: '#111' }}>{machine.uptime_pct}%</strong></div>
        </div>
      )}
    </div>
  );
}

function JobRow({ job }: { job: JobProgress }) {
  const barColor = job.progress_pct > 80 ? '#22c55e' : job.progress_pct > 40 ? '#3b82f6' : '#eab308';
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <strong style={{ fontSize: 13 }}>{job.job_number}</strong>
          <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 8 }}>{job.part_name}</span>
        </div>
        <span style={{ fontSize: 12, color: '#6b7280' }}>ETA: {job.eta_minutes}min</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${job.progress_pct}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.5s' }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, minWidth: 36, textAlign: 'right' }}>{job.progress_pct}%</span>
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{job.current_op} — {job.machine} — {job.completed}/{job.total} parts</div>
    </div>
  );
}

function ToolLifeRow({ tool }: { tool: ToolLife }) {
  const color = tool.wear_rate === 'critical' ? '#ef4444' : tool.wear_rate === 'elevated' ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{tool.tool_name}</div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>{tool.machine} — {tool.estimated_minutes}min remaining</div>
      </div>
      <div style={{ width: 60, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${tool.life_remaining_pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 36, textAlign: 'right' }}>{tool.life_remaining_pct}%</span>
    </div>
  );
}

function OEEGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (value * circumference);
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="36" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="44" cy="44" r="36" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 44 44)" style={{ transition: 'stroke-dashoffset 0.5s' }} />
        <text x="44" y="48" textAnchor="middle" fontSize="18" fontWeight="700" fill="#111827">{pct}%</text>
      </svg>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────

export function DashboardPage() {
  const [machines, setMachines] = useState(MOCK_MACHINES);
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [tools, setTools] = useState(MOCK_TOOLS);
  const [oee, _setOee] = useState(MOCK_OEE);
  const [safetyScore, setSafetyScore] = useState(0.88);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const {
    notifications, toasts, panelOpen, unreadCount,
    setPanelOpen, addNotification, dismissToast, markRead, clearAll,
  } = useNotifications();

  const onMessage = useCallback((msg: WSMessage) => {
    setLastUpdate(new Date());
    const p = msg.payload as Record<string, unknown>;
    switch (msg.type) {
      case 'machine:status':
        setMachines(prev => prev.map(m =>
          m.id === p.id ? { ...m, ...p } as MachineStatus : m));
        if (p.status === 'alarm') {
          addNotification('critical', 'Machine Alarm',
            `${String(p.name || p.id)} entered alarm state`,
            String(p.id ?? ''));
        }
        break;
      case 'job:progress':
        setJobs(prev => prev.map(j =>
          j.id === p.id ? { ...j, ...p } as JobProgress : j));
        if ((p.progress_pct as number) >= 100) {
          addNotification('success', 'Job Complete',
            `${String(p.job_number)} finished on ${String(p.machine)}`,
            String(p.id ?? ''));
        }
        break;
      case 'tool:wear':
        setTools(prev => prev.map(t =>
          t.id === p.id ? { ...t, ...p } as ToolLife : t));
        if ((p.life_remaining_pct as number) <= 10) {
          addNotification('warn', 'Tool Life Critical',
            `${String(p.tool_name)} at ${String(p.life_remaining_pct)}% on ${String(p.machine)}`,
            String(p.id ?? ''));
        }
        break;
      case 'safety:alert': {
        const score = p.score as number;
        if (typeof score === 'number') setSafetyScore(score);
        if (score < 0.7) {
          addNotification('emergency', 'Safety Score Low',
            `Safety score dropped to ${(score * 100).toFixed(0)}%`);
        }
        break;
      }
    }
  }, [addNotification]);

  const { isConnected } = useWebSocket({
    rooms: ['machine:all', 'job:all', 'tool:all', 'safety:all'],
    onMessage,
    autoConnect: true,
  });

  // Simulated real-time tick for demo mode
  useEffect(() => {
    const timer = setInterval(() => {
      setJobs(prev => prev.map(j => ({
        ...j,
        progress_pct: Math.min(100, j.progress_pct + Math.random() * 0.5),
        eta_minutes: Math.max(0, j.eta_minutes - 1),
      })));
      setTools(prev => prev.map(t => ({
        ...t,
        life_remaining_pct: Math.max(0, t.life_remaining_pct - Math.random() * 0.2),
        estimated_minutes: Math.max(0, t.estimated_minutes - 1),
      })));
      setLastUpdate(new Date());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const running = machines.filter(m => m.status === 'running').length;
  const alarms = machines.filter(m => m.status === 'alarm').length;

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Manufacturing Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#9ca3af' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isConnected ? '#22c55e' : '#ef4444',
            display: 'inline-block',
          }} />
          {isConnected ? 'Live' : 'Demo'} — Updated {lastUpdate.toLocaleTimeString()}
          <NotificationBell count={unreadCount} onClick={() => setPanelOpen(!panelOpen)} />
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {panelOpen && (
        <NotificationPanel
          notifications={notifications}
          onMarkRead={markRead}
          onClearAll={clearAll}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard title="Machines Running" value={`${running}/${machines.length}`} color={running > 0 ? '#166534' : '#991b1b'} />
        <StatCard title="Active Alarms" value={String(alarms)} color={alarms > 0 ? '#dc2626' : '#166534'} />
        <StatCard title="Active Jobs" value={String(jobs.length)} />
        <StatCard title="Safety Score" value={<SafetyBadge score={safetyScore} /> as any} />
        <StatCard title="OEE" value={`${Math.round(oee.oee * 100)}%`} color={oee.oee >= 0.7 ? '#166534' : '#dc2626'} subtitle="Overall Equipment Effectiveness" />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Machine Status Grid */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Machine Status</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {machines.map(m => <MachineCard key={m.id} machine={m} />)}
            </div>
          </div>

          {/* Active Jobs */}
          <div style={{ background: '#fff', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Active Jobs</h2>
            {jobs.map(j => <JobRow key={j.id} job={j} />)}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* OEE Gauges */}
          <div style={{ background: '#fff', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>OEE</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <OEEGauge label="Availability" value={oee.availability} />
              <OEEGauge label="Performance" value={oee.performance} />
              <OEEGauge label="Quality" value={oee.quality} />
              <OEEGauge label="OEE" value={oee.oee} />
            </div>
          </div>

          {/* Tool Life */}
          <div style={{ background: '#fff', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Tool Life Monitor</h2>
            {tools.map(t => <ToolLifeRow key={t.id} tool={t} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
