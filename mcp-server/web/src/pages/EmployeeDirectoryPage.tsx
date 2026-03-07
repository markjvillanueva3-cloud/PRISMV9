/**
 * Employee Directory Page — Employee search, skills, utilization, department summary.
 */
import { useState, useEffect } from 'react';
import {
  listEmployees, employeeSearch, employeeDeptSummary,
  employeeCreate, employeeAddSkill, employeeUtilization, ApiError,
} from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { Employee } from '../api/types';

type Tab = 'directory' | 'departments' | 'onboard' | 'utilization';

export function EmployeeDirectoryPage() {
  const [tab, setTab] = useState<Tab>('directory');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deptSummary, setDeptSummary] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [utilData, setUtilData] = useState<any>(null);
  const [utilEmpId, setUtilEmpId] = useState('');
  // Onboard form
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newRate, setNewRate] = useState('');
  const [onboardResult, setOnboardResult] = useState<any>(null);
  // Add skill
  const [skillEmpId, setSkillEmpId] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillResult, setSkillResult] = useState<any>(null);

  async function loadEmployees() {
    setLoading(true);
    setError(null);
    try {
      const r = searchQuery
        ? await employeeSearch({ query: searchQuery })
        : await listEmployees();
      setEmployees((r.result as any)?.employees ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  async function loadDepts() {
    setLoading(true);
    setError(null);
    try {
      const r = await employeeDeptSummary();
      setDeptSummary((r.result as any)?.departments ?? (r.result as any) ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'directory') loadEmployees();
    if (tab === 'departments') loadDepts();
  }, [tab]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Employee Directory</h1>
        <p className="text-sm text-gray-500 mt-1">Search employees, manage skills, and view department utilization.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('directory')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'directory' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Directory
        </button>
        <button onClick={() => setTab('departments')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'departments' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Departments
        </button>
        <button onClick={() => setTab('onboard')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'onboard' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Onboard
        </button>
        <button onClick={() => setTab('utilization')}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === 'utilization' ? 'bg-prism-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Utilization
        </button>
      </div>

      {loading && <LoadingState label="Loading..." />}
      {error && <ErrorState message={error} />}

      {tab === 'directory' && (
        <>
          <div className="mb-4 flex gap-2">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, skill, or department..."
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
            <button onClick={loadEmployees}
              className="bg-prism-600 text-white px-4 py-2 rounded text-sm hover:bg-prism-700">
              Search
            </button>
          </div>

          {employees.length > 0 && !loading && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Skills</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employees.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{e.first_name} {e.last_name}</td>
                      <td className="px-4 py-2">{e.department}</td>
                      <td className="px-4 py-2">{e.role}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          e.status === 'active' ? 'bg-green-100 text-green-700' :
                          e.status === 'on_leave' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {(e.skills ?? []).slice(0, 3).map(s => (
                            <span key={s} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">{s}</span>
                          ))}
                          {(e.skills ?? []).length > 3 && (
                            <span className="text-xs text-gray-400">+{e.skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Onboard Tab */}
      {tab === 'onboard' && !loading && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">New Employee</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input type="text" value={newFirst} onChange={e => setNewFirst(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" value={newLast} onChange={e => setNewLast(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input type="text" value={newDept} onChange={e => setNewDept(e.target.value)}
                  placeholder="e.g. CNC, Assembly, QC"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input type="text" value={newRole} onChange={e => setNewRole(e.target.value)}
                  placeholder="e.g. Machinist, Inspector"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={async () => {
              setLoading(true); setError(null);
              try {
                const r = await employeeCreate({
                  first_name: newFirst, last_name: newLast,
                  department: newDept, role: newRole,
                  hourly_rate: parseFloat(newRate) || 0,
                });
                setOnboardResult(r.result);
              } catch (e) {
                setError(e instanceof ApiError ? e.message : 'Failed to create employee');
              } finally { setLoading(false); }
            }} disabled={!newFirst || !newLast}
              className="mt-4 bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50">
              Create Employee
            </button>
            {onboardResult && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                Employee created: {JSON.stringify(onboardResult)}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Add Skill</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input type="text" value={skillEmpId} onChange={e => setSkillEmpId(e.target.value)}
                  placeholder="EMP-001"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Skill</label>
                <input type="text" value={skillName} onChange={e => setSkillName(e.target.value)}
                  placeholder="e.g. 5-Axis Programming"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const r = await employeeAddSkill({ employee_id: skillEmpId, skill: skillName });
                  setSkillResult(r.result);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Failed to add skill');
                } finally { setLoading(false); }
              }} disabled={!skillEmpId || !skillName}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
                Add
              </button>
            </div>
            {skillResult && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                Skill added successfully.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Utilization Tab */}
      {tab === 'utilization' && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Employee Utilization</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input type="text" value={utilEmpId} onChange={e => setUtilEmpId(e.target.value)}
                  placeholder="EMP-001"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const r = await employeeUtilization({ employee_id: utilEmpId });
                  setUtilData(r.result);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Failed');
                } finally { setLoading(false); }
              }} disabled={!utilEmpId}
                className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium disabled:opacity-50">
                Check Utilization
              </button>
            </div>
          </div>
          {utilData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Utilization', value: `${utilData.utilization_pct ?? '-'}%` },
                { label: 'Billable Hours', value: utilData.billable_hours ?? '-' },
                { label: 'Total Hours', value: utilData.total_hours ?? '-' },
                { label: 'Active Jobs', value: utilData.active_jobs ?? '-' },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                  <span className="text-xs text-gray-500 block">{c.label}</span>
                  <span className="text-xl font-bold text-gray-900">{c.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'departments' && deptSummary.length > 0 && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deptSummary.map((d: any) => (
            <div key={d.department ?? d.name} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="font-semibold text-lg">{d.department ?? d.name}</h3>
              <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                <div><span className="text-xs text-gray-500 block">Headcount</span><span className="font-bold">{d.headcount ?? d.count ?? '-'}</span></div>
                <div><span className="text-xs text-gray-500 block">Utilization</span><span className="font-bold">{d.utilization_pct ?? '-'}%</span></div>
                <div><span className="text-xs text-gray-500 block">Avg Rate</span><span className="font-bold font-mono">${d.avg_rate ?? '-'}/hr</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
