import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  FileText, 
  Activity, 
  Bot, 
  CheckCircle2, 
  Clock, 
  RefreshCw 
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [passes, setPasses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [passesRes, logsRes, statsRes] = await Promise.all([
        fetch('/api/passes', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/audit-logs?limit=5', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/rag/stats')
      ]);

      if (passesRes.ok) setPasses((await passesRes.json()).passes || []);
      if (logsRes.ok) setLogs((await logsRes.json()).logs || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingPasses = passes.filter(p => p.status === 'PENDING').length;
  const approvedPasses = passes.filter(p => p.status === 'APPROVED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Admin Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            Central Campus Administration Console
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {user?.name}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Campus Pass Master Authority • System Administrator
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Metrics
        </button>
      </div>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Passes</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{passes.length}</div>
            <div className="text-[11px] text-emerald-700 mt-1 font-medium">{approvedPasses} Approved & Valid</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{pendingPasses}</div>
            <div className="text-[11px] text-amber-600 mt-1 font-medium">Awaiting action</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">RAG Knowledge Chunks</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.chunks || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">{stats?.documents || 0} Indexed Policies</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System State</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">ONLINE</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">PostgreSQL & pgvector Active</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <Link
          to="/audit-logs"
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-xl shadow-xs transition block group"
        >
          <Activity className="w-7 h-7 text-slate-700 mb-2.5" />
          <h3 className="text-sm font-bold text-slate-900">Security Audit Logs</h3>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, and inspect immutable system audit records for compliance and tracing.
          </p>
        </Link>

        <Link
          to="/gate-scanner"
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-xl shadow-xs transition block group"
        >
          <ShieldCheck className="w-7 h-7 text-slate-700 mb-2.5" />
          <h3 className="text-sm font-bold text-slate-900">Gate Scanner & Movements</h3>
          <p className="text-xs text-slate-500 mt-1">
            Monitor gate entry and exit activity across Main Gate, North Gate, and Hostel Gate.
          </p>
        </Link>

        <Link
          to="/assistant"
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-xl shadow-xs transition block group"
        >
          <Bot className="w-7 h-7 text-slate-700 mb-2.5" />
          <h3 className="text-sm font-bold text-slate-900">RAG Knowledge Management</h3>
          <p className="text-xs text-slate-500 mt-1">
            Upload new campus handbooks, review vectorized chunks, and test policy questions.
          </p>
        </Link>

      </div>

      {/* Recent Activity Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-600" />
            Recent Security & Pass Activity Stream
          </h2>
          <Link to="/audit-logs" className="text-xs text-slate-600 hover:text-slate-900 font-semibold">
            View All Logs →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 font-mono text-slate-500">
                    {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {l.actor_name || 'System'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {l.action}
                  </td>
                  <td className="px-4 py-3 text-slate-600 truncate max-w-sm">
                    {l.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
