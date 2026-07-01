/**
 * EMP-MS0 U-EMP1: Employee Edit Modal
 * HR Manager+ can edit clearance, OT policy, role, dept, rate, status.
 * Also supports manager override to close forgotten shifts.
 */
import { useState } from 'react';
import type { ClearanceLevel, Employee, OvertimePolicy } from '../../api/types';
import { ActionButton, Field, Input, Select } from '../workspace/WorkspacePrimitives';

interface EmployeeEditModalProps {
  employee: Employee;
  onSave: (employeeId: string, updates: Record<string, unknown>) => Promise<void>;
  // 2026-05-27 iter25 widened to accept (id, reason) — caller's
  // handleManagerCloseShift requires `reason: string`, so the prop must too.
  // Modal's internal call site at L163 already supplies a sensible default
  // ('Manager closed shift') so this matches without prompting the operator.
  onCloseShift?: (employeeId: string, reason: string) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

const CLEARANCE_OPTIONS: { value: ClearanceLevel; label: string }[] = [
  { value: 'shop_floor', label: 'Shop Floor' },
  { value: 'lead', label: 'Lead' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'admin', label: 'Admin' },
];

const OT_RULES: { value: 'daily' | 'weekly'; label: string }[] = [
  { value: 'daily', label: 'Daily (CA-style)' },
  { value: 'weekly', label: 'Weekly (Federal FLSA)' },
];

export function EmployeeEditModal({ employee, onSave, onCloseShift, onClose, saving }: EmployeeEditModalProps) {
  const [role, setRole] = useState(employee.role);
  const [department, setDepartment] = useState(employee.department);
  const [rate, setRate] = useState(String(employee.labor_rates?.regular ?? 0));
  const [status, setStatus] = useState(employee.status);
  const [clearance, setClearance] = useState<ClearanceLevel>(employee.clearance_level ?? 'shop_floor');
  const [otRule, setOtRule] = useState<'daily' | 'weekly'>(employee.overtime_policy?.rule ?? 'weekly');
  const [otDaily, setOtDaily] = useState(String(employee.overtime_policy?.daily_threshold_hrs ?? 8));
  const [otWeekly, setOtWeekly] = useState(String(employee.overtime_policy?.weekly_threshold_hrs ?? 40));
  const [otMultiplier, setOtMultiplier] = useState(String(employee.overtime_policy?.ot_multiplier ?? 1.5));
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    const hourlyRate = parseFloat(rate);
    if (Number.isNaN(hourlyRate) || hourlyRate <= 0) {
      setError('Hourly rate must be a positive number');
      return;
    }
    const otPolicy: OvertimePolicy = {
      rule: otRule,
      daily_threshold_hrs: parseFloat(otDaily) || 8,
      weekly_threshold_hrs: parseFloat(otWeekly) || 40,
      ot_multiplier: parseFloat(otMultiplier) || 1.5,
      dt_multiplier: (parseFloat(otMultiplier) || 1.5) * 2 / 1.5,
    };
    await onSave(employee.id, {
      role,
      department,
      hourly_rate: hourlyRate,
      status,
      clearance_level: clearance,
      overtime_policy: otPolicy,
    });
  };

  // Cert expiry warnings
  const now = new Date();
  const expiringSoon = (employee.certifications ?? []).filter((c) => {
    if (!c.expires) return false;
    const exp = new Date(c.expires);
    const daysUntil = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 30 && daysUntil > 0;
  });
  const expired = (employee.certifications ?? []).filter((c) => {
    if (!c.expires) return false;
    return new Date(c.expires) < now;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mx-4 w-full max-w-lg rounded-[24px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-50">
            Edit: {employee.first_name} {employee.last_name}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
        </div>

        {(expired.length > 0 || expiringSoon.length > 0) && (
          <div className="mb-4 space-y-2">
            {expired.map((c) => (
              <div key={c.name} className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                Certification "{c.name}" expired on {c.expires}
              </div>
            ))}
            {expiringSoon.map((c) => (
              <div key={c.name} className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-300">
                Certification "{c.name}" expires {c.expires} (within 30 days)
              </div>
            ))}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role">
              <Input type="text" value={role} onChange={(e) => setRole(e.target.value)} />
            </Field>
            <Field label="Department">
              <Input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </Field>
            <Field label="Hourly rate ($)">
              <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} min="0" step="0.01" />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as Employee['status'])}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </Select>
            </Field>
            <Field label="Clearance level">
              <Select value={clearance} onChange={(e) => setClearance(e.target.value as ClearanceLevel)}>
                {CLEARANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="OT rule">
              <Select value={otRule} onChange={(e) => setOtRule(e.target.value as 'daily' | 'weekly')}>
                {OT_RULES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Daily OT threshold (hrs)">
              <Input type="number" value={otDaily} onChange={(e) => setOtDaily(e.target.value)} min="1" step="0.5" />
            </Field>
            <Field label="Weekly OT threshold (hrs)">
              <Input type="number" value={otWeekly} onChange={(e) => setOtWeekly(e.target.value)} min="1" step="0.5" />
            </Field>
            <Field label="OT multiplier">
              <Input type="number" value={otMultiplier} onChange={(e) => setOtMultiplier(e.target.value)} min="1" step="0.1" />
            </Field>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ActionButton onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </ActionButton>
            {onCloseShift && (
              <button
                type="button"
                onClick={() => void onCloseShift(employee.id, 'Manager closed forgotten shift from EmployeeEditModal')}
                disabled={saving}
                className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-400/20 disabled:opacity-50"
              >
                Close Forgotten Shift
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
