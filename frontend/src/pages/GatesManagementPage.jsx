import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building, 
  Plus, 
  MapPin, 
  Layers
} from 'lucide-react';

export default function GatesManagementPage() {
  const { token } = useAuth();
  const [gates, setGates] = useState([]);
  const [passTypes, setPassTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Gate Form
  const [showGateModal, setShowGateModal] = useState(false);
  const [gateForm, setGateForm] = useState({
    gate_name: '',
    gate_number: '',
    location: '',
    description: ''
  });

  // New Pass Type Form
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeForm, setTypeForm] = useState({
    code: '',
    name: '',
    description: '',
    max_duration_hours: 24,
    requires_approval: true
  });

  useEffect(() => {
    fetchGatesAndTypes();
  }, []);

  const fetchGatesAndTypes = async () => {
    setLoading(true);
    try {
      const [gRes, tRes] = await Promise.all([
        fetch('/api/gates'),
        fetch('/api/pass-types')
      ]);
      if (gRes.ok) setGates((await gRes.json()).gates || []);
      if (tRes.ok) setPassTypes((await tRes.json()).passTypes || []);
    } catch (err) {
      console.error('Failed to load gates/types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/gates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(gateForm)
      });
      if (res.ok) {
        setShowGateModal(false);
        setGateForm({ gate_name: '', gate_number: '', location: '', description: '' });
        fetchGatesAndTypes();
      }
    } catch (err) {
      console.error('Failed to create gate:', err);
    }
  };

  const handleToggleGate = async (gate) => {
    const newStatus = gate.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await fetch(`/api/gates/${gate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      fetchGatesAndTypes();
    } catch (err) {
      console.error('Failed to toggle gate:', err);
    }
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pass-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(typeForm)
      });
      if (res.ok) {
        setShowTypeModal(false);
        setTypeForm({ code: '', name: '', description: '', max_duration_hours: 24, requires_approval: true });
        fetchGatesAndTypes();
      }
    } catch (err) {
      console.error('Failed to create pass type:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Building className="w-4 h-4 text-slate-700" />
            Infrastructure & Access Control Configuration
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Campus Gates & Pass Categories
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Configure designated security gates and customize leave / out-pass categories.
          </p>
        </div>
      </div>

      {/* Grid: Gates and Pass Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Section 1: Campus Gates */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-700" />
              Campus Gates ({gates.length})
            </h2>
            <button
              onClick={() => setShowGateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Gate
            </button>
          </div>

          <div className="space-y-2.5">
            {gates.map((g) => (
              <div
                key={g.id}
                className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{g.gate_name}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      {g.gate_number}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {g.location}
                  </div>
                  {g.description && <div className="text-[11px] text-slate-500 mt-0.5">{g.description}</div>}
                </div>

                <button
                  onClick={() => handleToggleGate(g)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase transition cursor-pointer ${
                    g.status === 'ACTIVE' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200' 
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
                  }`}
                >
                  {g.status}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Pass Types */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              Pass Categories ({passTypes.length})
            </h2>
            <button
              onClick={() => setShowTypeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Category
            </button>
          </div>

          <div className="space-y-2.5">
            {passTypes.map((pt) => (
              <div
                key={pt.id}
                className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg flex items-start justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">{pt.name}</div>
                  <div className="font-mono text-xs text-slate-600 mt-0.5">{pt.code}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{pt.description}</div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-3">
                    <span>Max: {pt.max_duration_hours}h</span>
                    <span>Approval: {pt.requires_approval ? 'Required' : 'Auto-Granted'}</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                  {pt.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Add Gate Modal */}
      {showGateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-700" />
              Add New Campus Gate
            </h3>

            <form onSubmit={handleCreateGate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Gate Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sports Complex Gate"
                  value={gateForm.gate_name}
                  onChange={(e) => setGateForm({ ...gateForm, gate_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Gate Number / Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GATE-06"
                  value={gateForm.gate_number}
                  onChange={(e) => setGateForm({ ...gateForm, gate_number: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Location Details</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Campus Perimeter"
                  value={gateForm.location}
                  onChange={(e) => setGateForm({ ...gateForm, location: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Operating notes, authorized traffic..."
                  value={gateForm.description}
                  onChange={(e) => setGateForm({ ...gateForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Save Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Pass Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              Create Custom Pass Category
            </h3>

            <form onSubmit={handleCreateType} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Pass Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LAB_RESEARCH_PASS"
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Late Night Lab Research Pass"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Max Duration (Hours)</label>
                <input
                  type="number"
                  required
                  value={typeForm.max_duration_hours}
                  onChange={(e) => setTypeForm({ ...typeForm, max_duration_hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Purpose, eligibility criteria..."
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Create Pass Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
