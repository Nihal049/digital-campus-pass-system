import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  MapPin, 
  Search, 
  ShieldCheck, 
  ArrowUpRight, 
  RefreshCw 
} from 'lucide-react';

export default function CurrentlyInsidePage() {
  const { token, user } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [gateFilter, setGateFilter] = useState('ALL');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetchInside();
    const interval = setInterval(fetchInside, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchInside = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gate/currently-inside', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPeople(data.currentlyInside || []);
      }
    } catch (err) {
      console.error('Failed to load currently inside data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordExit = async (person) => {
    try {
      const res = await fetch('/api/gate/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pass_id: person.pass_id,
          gate_name: person.gate_name || 'Main Gate',
          action_type: 'EXIT',
          result: 'GRANTED'
        })
      });

      if (res.ok) {
        setActionMsg(`Recorded departure/exit for ${person.person_name}`);
        fetchInside();
        setTimeout(() => setActionMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to log departure:', err);
    }
  };

  const calculateDuration = (entryTime) => {
    const diffMs = Date.now() - new Date(entryTime).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `${diffMins} mins inside`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m inside`;
  };

  const filteredPeople = people.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = p.person_name?.toLowerCase().includes(s) ||
                          p.reg_no?.toLowerCase().includes(s) ||
                          p.pass_number?.toLowerCase().includes(s) ||
                          p.department?.toLowerCase().includes(s);
    const matchesGate = gateFilter === 'ALL' || p.gate_name === gateFilter;
    return matchesSearch && matchesGate;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            Real-Time Campus Presence Monitor
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Currently Inside Campus
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Live headcount of authorized students, visitors, and staff inside university grounds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-5 py-2.5 rounded-lg text-center">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Headcount Inside</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{people.length}</div>
          </div>
          <button
            onClick={fetchInside}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition shadow-xs cursor-pointer"
            title="Refresh Headcount"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-700" />
          {actionMsg}
        </div>
      )}

      {/* Controls & Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, roll no, or pass number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Filter Gate:</span>
          <select
            value={gateFilter}
            onChange={(e) => setGateFilter(e.target.value)}
            className="bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 cursor-pointer"
          >
            <option value="ALL">All Gates</option>
            <option value="Main Gate">Main Gate</option>
            <option value="North Gate">North Gate</option>
            <option value="Hostel Gate">Hostel Gate</option>
            <option value="Library Gate">Library Gate</option>
          </select>
        </div>

      </div>

      {/* Currently Inside Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Synchronizing live gate records...</div>
        ) : filteredPeople.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm space-y-1">
            <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="text-slate-800 font-semibold">No verified entries currently logged inside campus.</div>
            <div className="text-xs text-slate-500">When security guards scan and grant ENTRY, personnel will appear here.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Person Name & Dept</th>
                  <th className="px-4 py-3">Roll / ID Number</th>
                  <th className="px-4 py-3">Gate of Entry</th>
                  <th className="px-4 py-3">Entry Timestamp</th>
                  <th className="px-4 py-3">Duration Inside</th>
                  <th className="px-4 py-3">Pass Details</th>
                  <th className="px-4 py-3 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPeople.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{p.person_name}</div>
                        <div className="text-[11px] text-slate-500">{p.department}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600">
                        {p.reg_no}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {p.gate_name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {new Date(p.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <div className="text-[10px] text-slate-400">
                          {new Date(p.entry_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-emerald-700">
                        {calculateDuration(p.entry_time)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-slate-800">{p.pass_number}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{p.destination}</div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {(user.role === 'SECURITY' || user.role === 'ADMIN') && (
                          <button
                            onClick={() => handleRecordExit(p)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition cursor-pointer shadow-xs"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Log Exit
                          </button>
                        )}
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
