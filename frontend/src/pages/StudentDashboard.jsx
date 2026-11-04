import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PassCard from '../components/PassCard';
import { 
  Plus, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  MapPin, 
  AlertCircle,
  FileText,
  Search,
  Trash2
} from 'lucide-react';

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [activePassModal, setActivePassModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    pass_type: 'STUDENT_OUT_PASS',
    reason: '',
    destination: '',
    valid_from: new Date().toISOString().slice(0, 16),
    valid_to: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchPasses();
  }, [statusFilter]);

  const fetchPasses = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' 
        ? '/api/passes' 
        : `/api/passes?status=${statusFilter}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPasses(data.passes);
      }
    } catch (err) {
      console.error('Failed to load passes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/passes/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit pass request');
      }

      setShowApplyModal(false);
      setFormData({
        pass_type: 'STUDENT_OUT_PASS',
        reason: '',
        destination: '',
        valid_from: new Date().toISOString().slice(0, 16),
        valid_to: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16)
      });
      fetchPasses();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPass = async (passId) => {
    if (!confirm('Are you sure you want to cancel this pending pass?')) return;

    try {
      const res = await fetch(`/api/passes/${passId}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPasses();
      }
    } catch (err) {
      console.error('Failed to cancel pass:', err);
    }
  };

  const openPassDetails = async (passId) => {
    try {
      const res = await fetch(`/api/passes/${passId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActivePassModal(data);
      }
    } catch (err) {
      console.error('Failed to fetch pass details:', err);
    }
  };

  const filteredPasses = passes.filter(p => {
    const s = searchTerm.toLowerCase();
    return p.pass_number?.toLowerCase().includes(s) ||
           p.destination?.toLowerCase().includes(s) ||
           p.reason?.toLowerCase().includes(s);
  });

  const activePass = passes.find(p => p.status === 'APPROVED');
  const pendingCount = passes.filter(p => p.status === 'PENDING').length;
  const approvedCount = passes.filter(p => p.status === 'APPROVED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            Student Access Portal • Batch 17
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Roll No: <span className="text-slate-800 font-mono font-medium">{user?.reg_no}</span> • Department: <span className="text-slate-800 font-medium">{user?.department}</span>
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Request New Pass
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Passes</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{approvedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Approvals</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{pendingCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Passes Created</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{passes.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Active Pass Highlight Card */}
      {activePass && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  ACTIVE DIGITAL PASS
                </span>
                <span className="text-xs text-slate-600 font-mono">{activePass.pass_number}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {activePass.pass_type.replace(/_/g, ' ')}: {activePass.destination}
              </h3>
              <p className="text-slate-600 text-xs mt-0.5">
                Valid until {new Date(activePass.valid_to).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Approved by {activePass.approver_name || 'Faculty Mentor'}
              </p>
            </div>
          </div>

          <button
            onClick={() => openPassDetails(activePass.id)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            View & Scan QR Code
          </button>
        </div>
      )}

      {/* Passes List & Filter */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            My Campus Passes
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search passes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    statusFilter === st 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Passes Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Loading campus passes...
            </div>
          ) : filteredPasses.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No passes found matching your selection.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                  <th className="px-4 py-3">Pass Number</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Destination & Purpose</th>
                  <th className="px-4 py-3">Validity Window</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPasses.map((p) => {
                  const statusColors = {
                    APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
                    REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
                    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
                    REVOKED: 'bg-red-50 text-red-800 border-red-200',
                    COMPLETED: 'bg-blue-50 text-blue-800 border-blue-200',
                  };

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-slate-900">
                        {p.pass_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {p.pass_type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 truncate max-w-xs">{p.destination}</div>
                        <div className="text-slate-500 text-[11px] truncate max-w-xs">{p.reason}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">
                          {new Date(p.valid_from).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          to {new Date(p.valid_to).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${statusColors[p.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPassDetails(p.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition cursor-pointer"
                          >
                            Details
                          </button>
                          {p.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancelPass(p.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Cancel Pass"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Apply Pass Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl shadow-xl overflow-hidden">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Request Digital Campus Pass</h3>
                <p className="text-xs text-slate-400 mt-0.5">Submit for mentor / warden review and QR cryptographic signature</p>
              </div>
              <button 
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleApply} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Pass Type</label>
                <select
                  value={formData.pass_type}
                  onChange={(e) => setFormData({ ...formData, pass_type: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors cursor-pointer"
                >
                  <option value="STUDENT_OUT_PASS">Student Out Pass (Day Clearance)</option>
                  <option value="EVENT_PASS">Event / Hackathon Pass (Off-Campus)</option>
                  <option value="EMERGENCY_PASS">Emergency Medical Pass</option>
                  <option value="VISITOR_PASS">Visitor Access Pass</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Destination Address / Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Tech Center, State University Auditorium"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Specific Purpose / Reason</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State detailed reason for leaving campus..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Departure Time (From)</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Return Time (Until)</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.valid_to}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Campus Policy Compliance:</div>
                <div>• Hostel curfews apply: 9:30 PM on weekdays, 10:30 PM on weekends.</div>
                <div>• Emergency passes require verified medical documentation upon return.</div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-xs transition cursor-pointer disabled:opacity-70"
                >
                  {submitting ? 'Submitting...' : 'Submit Pass Request'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Active Pass Card Modal */}
      {activePassModal && (
        <PassCard
          pass={activePassModal.pass}
          qr={activePassModal.qr}
          onClose={() => setActivePassModal(null)}
        />
      )}

    </div>
  );
}
