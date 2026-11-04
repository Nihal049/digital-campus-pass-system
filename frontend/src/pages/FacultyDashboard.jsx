import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PassCard from '../components/PassCard';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Search 
} from 'lucide-react';

export default function FacultyDashboard() {
  const { user, token } = useAuth();
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PENDING'); // PENDING or REVIEWED
  const [rejectingPassId, setRejectingPassId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activePassModal, setActivePassModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPasses();
  }, []);

  const fetchPasses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/passes', {
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

  const handleApprove = async (passId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/passes/${passId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: `Approved by Mentor ${user.name}` })
      });
      if (res.ok) {
        fetchPasses();
      }
    } catch (err) {
      console.error('Failed to approve pass:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/passes/${rejectingPassId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectReason.trim() })
      });
      if (res.ok) {
        setRejectingPassId(null);
        setRejectReason('');
        fetchPasses();
      }
    } catch (err) {
      console.error('Failed to reject pass:', err);
    } finally {
      setActionLoading(false);
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

  const pendingPasses = passes.filter(p => p.status === 'PENDING');
  const reviewedPasses = passes.filter(p => p.status !== 'PENDING');

  const currentList = tab === 'PENDING' ? pendingPasses : reviewedPasses;

  const filteredList = currentList.filter(p => {
    const s = searchTerm.toLowerCase();
    return p.student_name?.toLowerCase().includes(s) ||
           p.reg_no?.toLowerCase().includes(s) ||
           p.pass_number?.toLowerCase().includes(s) ||
           p.destination?.toLowerCase().includes(s);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Faculty Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            Faculty Mentor & Reviewer Portal
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {user?.name}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Department: <span className="text-slate-800 font-medium">{user?.department}</span> • Faculty ID: <span className="text-slate-800 font-mono">{user?.reg_no}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-center">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Pending Review</div>
            <div className="text-xl font-bold text-slate-900">{pendingPasses.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setTab('PENDING')}
            className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              tab === 'PENDING'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Approvals ({pendingPasses.length})
          </button>
          <button
            onClick={() => setTab('REVIEWED')}
            className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              tab === 'REVIEWED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pass History ({reviewedPasses.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search student or roll no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
          />
        </div>
      </div>

      {/* Requests Queue */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Loading pass requests...</div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-sm shadow-xs">
          {tab === 'PENDING' 
            ? 'No pending pass requests! All submissions have been reviewed.' 
            : 'No pass history records match your search criteria.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((p) => {
            const isPending = p.status === 'PENDING';

            const statusColors = {
              APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
              PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
              REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
              CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200'
            };

            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-xs space-y-3.5 transition"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 uppercase">
                        {p.pass_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{p.pass_number}</span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                        {p.student_name?.[0] || 'S'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 leading-tight">{p.student_name}</div>
                        <div className="text-xs text-slate-500 font-mono">{p.reg_no} • {p.department}</div>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${statusColors[p.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {p.status}
                  </span>
                </div>

                {/* Details */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Destination: {p.destination}</span>
                  </div>
                  <div className="text-slate-600">
                    <span className="font-semibold text-slate-800">Purpose: </span>{p.reason}
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200 flex items-center justify-between">
                    <span>Valid: {new Date(p.valid_from).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(p.valid_to).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>Date: {new Date(p.valid_from).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => openPassDetails(p.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition cursor-pointer"
                  >
                    View Pass
                  </button>

                  {isPending && (
                    <>
                      <button
                        onClick={() => setRejectingPassId(p.id)}
                        disabled={actionLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-semibold transition cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>

                      <button
                        onClick={() => handleApprove(p.id)}
                        disabled={actionLoading}
                        className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve & Issue QR
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingPassId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Specify Rejection Reason
            </h3>
            <p className="text-xs text-slate-500">
              The student will receive this remark on their dashboard explaining why their pass was declined.
            </p>

            <textarea
              required
              rows={3}
              placeholder="e.g. Incomplete lab assignments; examination schedule conflict; invalid destination..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
            ></textarea>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setRejectingPassId(null); setRejectReason(''); }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectReason.trim()}
                onClick={handleReject}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-70"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pass Card Modal */}
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
