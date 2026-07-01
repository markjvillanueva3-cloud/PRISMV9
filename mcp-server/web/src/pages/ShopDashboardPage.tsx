import { useState, useEffect, useCallback } from 'react';
import { SafetyBadge } from '../components/shared/SafetyBadge';
import { useWebSocket, type WSMessage } from '../hooks/useWebSocket';
import { NotificationBell, NotificationPanel, ToastContainer, useNotifications } from '../components/shared/NotificationCenter';
import {
  loadDashboardSnapshotWithFallback,
  DEMO_OEE,
  type MachineStatus,
  type JobProgress,
  type ToolLife,
  type OEEData,
  type DashboardSnapshotSource,
} from '../api/dashboard';

// ── Types ──────────────────────────────────────────────────────────

// MachineStatus / JobProgress / ToolLife / OEEData are imported from api/dashboard.ts -- the single
// source of truth, shared with the live-snapshot loader (loadDashboardSnapshotWithFallback) + DEMO set.

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
// Demo seed (DEMO_MACHINES/JOBS/TOOLS/OEE) lives in api/dashboard.ts and is applied by the snapshot
// loader as a LABELED per-surface fallback -- this page no longer carries its own copy or fabricates.

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
  const [machines, setMachines] = useState<MachineStatus[]>([]);
  const [jobs, setJobs] = useState<JobProgress[]>([]);
  const [tools, setTools] = useState<ToolLife[]>([]);
  const [oee, setOee] = useState<OEEData>(DEMO_OEE);
  const [dataSource, setDataSource] = useState<DashboardSnapshotSource>('demo');
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

  // Load the real dashboard snapshot (machine-live / job-dashboard / tool-usage / telemetry routes).
  // Per surface it falls back to LABELED demo data with an honest source posture; it NEVER fabricates
  // live motion (the prior RNG-simulated tick did -- a shop-floor dashboard must never invent progress).
  const loadSnapshot = useCallback(async () => {
    const snap = await loadDashboardSnapshotWithFallback();
    setMachines(snap.machines);
    setJobs(snap.jobs);
    setTools(snap.tools);
    setOee(snap.oee);
    setDataSource(snap.source);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    loadSnapshot();
    const timer = setInterval(loadSnapshot, 60_000); // re-poll real routes, not a random simulation
    return () => clearInterval(timer);
  }, [loadSnapshot]);

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
            background: isConnected ? '#22c55e' : '#9ca3af',
            display: 'inline-block',
          }} title={isConnected ? 'Real-time feed connected' : 'Real-time feed offline'} />
          {dataSource === 'live' ? 'Live data' : dataSource === 'mixed' ? 'Mixed (live + demo)' : 'Demo data'}
          {' '}- Updated {lastUpdate.toLocaleTimeString()}
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
