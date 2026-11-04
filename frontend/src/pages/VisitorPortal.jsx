import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PassCard from '../components/PassCard';
import { 
  Users, 
  UserPlus, 
  AlertCircle
} from 'lucide-react';

export default function VisitorPortal() {
  const { user, token } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activePassModal, setActivePassModal] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    gov_id_type: 'Aadhaar',
    gov_id_number: '',
    purpose: '',
    expected_arrival: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/visitors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVisitors(data.visitors || []);
      }
    } catch (err) {
      console.error('Failed to load visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/visitors/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register visitor');

      setShowRegisterModal(false);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        gov_id_type: 'Aadhaar',
        gov_id_number: '',
        purpose: '',
        expected_arrival: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)
      });
      fetchVisitors();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (visitorId) => {
    try {
      const res = await fetch(`/api/visitors/${visitorId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchVisitors();
      }
    } catch (err) {
      console.error('Failed to approve visitor:', err);
    }
  };

  const handleStatusUpdate = async (visitorId, newStatus) => {
    try {
      const res = await fetch(`/api/visitors/${visitorId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchVisitors();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
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
      console.error('Failed to view visitor pass:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Users className="w-4 h-4 text-slate-700" />
            Visitor Access & Security Clearance Portal
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Campus Visitor Management
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Register visitors, issue digital gate passes, and track check-in and check-out logs.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Pre-Register Visitor
        </button>
      </div>

      {/* Visitors List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            Registered Visitors Directory
          </h2>
          <span className="text-xs text-slate-500">{visitors.length} total entries</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading visitor registry...</div>
        ) : visitors.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No visitor entries found. Click "Pre-Register Visitor" to add a visitor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Visitor Name</th>
                  <th className="px-4 py-3">Contact & ID</th>
                  <th className="px-4 py-3">Purpose & Host</th>
                  <th className="px-4 py-3">Expected Arrival</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{v.full_name}</div>
                      <div className="text-[11px] text-slate-500">{v.email || 'No email'}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-800 font-medium">{v.phone}</div>
                      <div className="text-slate-500 text-[11px]">{v.gov_id_type}: {v.gov_id_number}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-800">{v.purpose}</div>
                      <div className="text-slate-500 text-[11px]">Host: {v.host_name || 'Campus Host'}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {new Date(v.expected_arrival).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                        v.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        v.status === 'CHECKED_IN' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        v.status === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      {v.status === 'INVITED' && (user.role === 'FACULTY' || user.role === 'ADMIN') && (
                        <button
                          onClick={() => handleApprove(v.id)}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                          Approve Visit
                        </button>
                      )}

                      {v.pass_id && (
                        <button
                          onClick={() => openPassDetails(v.pass_id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition cursor-pointer"
                        >
                          View QR Pass
                        </button>
                      )}

                      {(user.role === 'SECURITY' || user.role === 'ADMIN') && (
                        <>
                          {v.status === 'APPROVED' && (
                            <button
                              onClick={() => handleStatusUpdate(v.id, 'CHECKED_IN')}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold shadow-xs transition cursor-pointer"
                            >
                              Check-In
                            </button>
                          )}
                          {v.status === 'CHECKED_IN' && (
                            <button
                              onClick={() => handleStatusUpdate(v.id, 'CHECKED_OUT')}
                              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition cursor-pointer"
                            >
                              Check-Out
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pre-Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl shadow-xl overflow-hidden">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Pre-Register Campus Visitor</h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-white cursor-pointer text-lg">&times;</button>
            </div>

            <form onSubmit={handleRegister} className="p-6 space-y-3.5 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Malhotra"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="visitor@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Government ID Type</label>
                  <select
                    value={formData.gov_id_type}
                    onChange={(e) => setFormData({ ...formData, gov_id_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900 cursor-pointer"
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver License">Driver's License</option>
                    <option value="Voter ID">Voter ID</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Gov ID Number</label>
                  <input
                    type="text"
                    required
                    placeholder="ID Number..."
                    value={formData.gov_id_number}
                    onChange={(e) => setFormData({ ...formData, gov_id_number: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Purpose of Visit</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Guest Lecture, Lab Inspection, Parent Consultation"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Expected Arrival</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.expected_arrival}
                  onChange={(e) => setFormData({ ...formData, expected_arrival: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-70"
                >
                  {submitting ? 'Registering...' : 'Register Visitor'}
                </button>
              </div>
            </form>
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
