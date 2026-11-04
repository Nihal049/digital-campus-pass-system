import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  Search, 
  Filter, 
  RefreshCw 
} from 'lucide-react';

export default function AuditLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== 'ALL') params.append('action', actionFilter);
      if (entityFilter !== 'ALL') params.append('entity_type', entityFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    if (action.includes('APPROVED') || action.includes('GRANTED')) return 'text-emerald-800 bg-emerald-50 border-emerald-200';
    if (action.includes('REJECTED') || action.includes('DENIED') || action.includes('REVOKED')) return 'text-rose-800 bg-rose-50 border-rose-200';
    if (action.includes('LOGIN') || action.includes('REGISTER')) return 'text-blue-800 bg-blue-50 border-blue-200';
    return 'text-slate-700 bg-slate-100 border-slate-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Activity className="w-4 h-4 text-slate-700" />
            Security & Compliance Audit Trail
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            System Audit & Activity Logs
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Immutable chronological records of all user actions, pass approvals, gate scans, and policy access.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Logs
        </button>
      </div>

      {/* Controls & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by action, user, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Entity:</span>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 cursor-pointer"
            >
              <option value="ALL">All Entities</option>
              <option value="PASS">Digital Passes</option>
              <option value="GATE_SCAN">Gate Scans</option>
              <option value="VISITOR">Visitors</option>
              <option value="AUTH">Authentication</option>
              <option value="RAG_DOC">RAG Documents</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              <option value="PASS_REQUEST_CREATED">Pass Request</option>
              <option value="PASS_APPROVED">Pass Approved</option>
              <option value="PASS_REJECTED">Pass Rejected</option>
              <option value="GATE_SCAN_EXIT_GRANTED">Exit Granted</option>
              <option value="GATE_SCAN_ENTRY_GRANTED">Entry Granted</option>
              <option value="USER_LOGIN">User Login</option>
              <option value="RAG_DOCUMENT_INGESTED">Document Ingested</option>
            </select>
          </div>
        </div>

      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading audit events...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No audit logs found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor / User</th>
                  <th className="px-4 py-3">Action Event</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Event Details</th>
                  <th className="px-4 py-3 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((log) => {
                  let parsedDetails = null;
                  try {
                    parsedDetails = log.details ? JSON.parse(log.details) : null;
                  } catch {
                    parsedDetails = log.details;
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 font-sans">{log.actor_name || 'System'}</div>
                        <div className="text-[10px] text-slate-500 font-sans">{log.actor_role || 'ANONYMOUS'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase font-sans ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-sans">
                        <span className="font-semibold text-slate-800">{log.entity_type}</span>
                        {log.entity_id && <div className="text-[10px] text-slate-500 font-mono">{log.entity_id}</div>}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-700 font-sans">
                        {typeof parsedDetails === 'object' && parsedDetails !== null ? (
                          <span>{Object.entries(parsedDetails).map(([k, v]) => `${k}: ${v}`).join(' • ')}</span>
                        ) : (
                          <span>{log.details || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {log.ip_address || '::1'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
