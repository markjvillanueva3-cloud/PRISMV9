/**
 * BIZ-MS2 U-BIZ16: Employee Status Change Modal
 * Handles status transitions with change_reason.
 * Termination requires typed-name confirmation.
 */
import { useState } from 'react';
import type { Employee } from '../../api/types';
import { ActionButton, Field, Input, Select } from '../workspace/WorkspacePrimitives';

interface StatusChangeModalProps {
  employee: Employee;
  onConfirm: (newStatus: string, changeReason: string, returnDate?: string) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

type NewStatus = 'active' | 'on_leave' | 'inactive' | 'terminated';

const STATUS_OPTIONS: { value: NewStatus; label: string; from: string[] }[] = [
  { value: 'active', label: 'Active', from: ['on_leave', 'inactive'] },
  { value: 'on_leave', label: 'On Leave', from: ['active'] },
  { value: 'inactive', label: 'Inactive', from: ['active'] },
  { value: 'terminated', label: 'Terminated (IRREVERSIBLE)', from: ['active', 'on_leave', 'inactive'] },
];

export function StatusChangeModal({ employee, onConfirm, onClose, saving }: StatusChangeModalProps) {
  const [newStatus, setNewStatus] = useState<NewStatus | ''>('');
  const [changeReason, setChangeReason] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [confirmName, setConfirmName] = useState('');

  const available = STATUS_OPTIONS.filter(
    (opt) => opt.from.includes(employee.status) && opt.value !== employee.status,
  );

  const isTermination = newStatus === 'terminated';
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const nameConfirmed = !isTermination || confirmName.toLowerCase() === fullName.toLowerCase();
  const canSubmit = newStatus && changeReason.trim().length >= 3 && nameConfirmed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mx-4 w-full max-w-md rounded-[24px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-50">Change Status: {fullName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
        </div>

        <div className="mb-3 text-sm text-slate-400">
          Current status: <span className="font-medium text-slate-200">{employee.status}</span>
        </div>

        {employee.status === 'terminated' ? (
          <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            This employee is terminated. Status cannot be changed.
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <Field label="New status">
                <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value as NewStatus)}>
                  <option value="">Select new status</option>
                  {available.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Change reason (required, min 3 chars)">
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                  placeholder="Why is this status change needed?"
                />
              </Field>

              {newStatus === 'on_leave' && (
                <Field label="Expected return date">
                  <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                </Field>
              )}

              {isTermination && (
                <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3">
                  <div className="mb-2 text-sm font-semibold text-red-300">
                    This action is IRREVERSIBLE.
                  </div>
                  <Field label={`Type "${fullName}" to confirm`}>
                    <Input
                      type="text"
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={fullName}
                    />
                  </Field>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <ActionButton
                onClick={() => void onConfirm(newStatus, changeReason, returnDate || undefined)}
                disabled={saving || !canSubmit}
                tone={isTermination ? 'rose' : undefined}
              >
                {saving ? 'Updating...' : isTermination ? 'Terminate Employee' : 'Update Status'}
              </ActionButton>
              <button
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
