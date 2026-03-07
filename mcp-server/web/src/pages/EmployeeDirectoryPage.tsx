/**
 * Employee Directory Page — Employee search, skills, utilization, department summary.
 */
import { useState, useEffect } from 'react';
import { listEmployees, employeeSearch, employeeDeptSummary, ApiError } from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type { Employee } from '../api/types';

type Tab = 'directory' | 'departments';

export function EmployeeDirectoryPage() {
  const [tab, setTab] = useState<Tab>('directory');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deptSummary, setDeptSummary] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
