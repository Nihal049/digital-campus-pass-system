import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search,
  RefreshCw
} from 'lucide-react';

export default function SecurityDashboard() {
  const { user, token } = useAuth();
  const [selectedGate, setSelectedGate] = useState('Main Gate');
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [actionSuccess, setActionSuccess] = useState('');
  const scannerRef = useRef(null);
  const qrReaderId = 'html5-qr-reader';

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, [selectedGate]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/gate/history?gate_name=${selectedGate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScanHistory(data.scans || []);
      }
    } catch (err) {
      console.error('Failed to load gate history:', err);
    }
  };

  const startScanner = async () => {
    try {
      setScannerActive(true);
      const html5QrCode = new Html5Qrcode(qrReaderId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleVerify(decodedText);
          stopScanner();
        },
        () => {}
      );
    } catch (err) {
      console.error('Unable to start camera:', err);
      setScannerActive(false);
      alert('Camera access unavailable or permission denied. You can use manual pass lookup or paste QR data.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScannerActive(false);
  };

  const handleVerify = async (payloadOrPassNum) => {
    setVerifying(true);
    setActionSuccess('');
    try {
      const isJson = payloadOrPassNum.trim().startsWith('{');
      const body = isJson 
        ? { qrData: payloadOrPassNum.trim() } 
        : { passNumber: payloadOrPassNum.trim() };

      const res = await fetch('/api/gate/verify-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      setScanResult(data);
    } catch (err) {
      console.error('Verification failed:', err);
      setScanResult({
        isValid: false,
        reason: 'Network or server error during QR verification.'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRecordGateScan = async (actionType) => {
    if (!scanResult?.pass?.id) return;

    try {
      const res = await fetch('/api/gate/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pass_id: scanResult.pass.id,
          gate_name: selectedGate,
          action_type: actionType, // ENTRY or EXIT
          result: scanResult.isValid ? 'GRANTED' : 'DENIED',
          denial_reason: scanResult.isValid ? null : scanResult.reason
        })
      });

      if (res.ok) {
        setActionSuccess(`Successfully recorded ${actionType} at ${selectedGate}`);
        fetchHistory();
        setTimeout(() => {
          setScanResult(null);
          setActionSuccess('');
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to log scan:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Security Station Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            Campus Gate Security Kiosk • Officer on Duty
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {user?.name}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Badge: <span className="text-slate-800 font-mono font-medium">{user?.reg_no}</span> • Unit: <span className="text-slate-800 font-medium">Campus Access Control</span>
          </p>
        </div>

        {/* Gate Selector */}
        <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-600 ml-1" />
          <span className="text-xs text-slate-500 font-medium">Active Gate:</span>
          <select
            value={selectedGate}
            onChange={(e) => setSelectedGate(e.target.value)}
            className="bg-white text-slate-900 text-xs font-semibold rounded-md px-3 py-1.5 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 cursor-pointer"
          >
            <option value="Main Gate">Main Gate (Gate 1 - 24/7)</option>
            <option value="North Gate">North Gate (Gate 2 - Academic)</option>
            <option value="Hostel Gate">Hostel Gate (Gate 3 - Residential)</option>
          </select>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: QR Scanner & Lookup */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-700" />
                Live Camera QR Scanner
              </span>
              <button
                onClick={fetchHistory}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </h2>

            {/* Video Viewport */}
            <div className="relative bg-slate-900 rounded-xl overflow-hidden min-h-[260px] flex items-center justify-center p-3">
              <div id={qrReaderId} className="w-full"></div>
              
              {!scannerActive && (
                <div className="text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-300 mx-auto flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-white">Camera Scanner Inactive</div>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Click "Activate Camera" to scan student and visitor passes directly through your device webcam.
                  </p>
                  <button
                    onClick={startScanner}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    Activate Camera Scanner
                  </button>
                </div>
              )}

              {scannerActive && (
                <button
                  onClick={stopScanner}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 z-10 cursor-pointer"
                >
                  <CameraOff className="w-3.5 h-3.5" /> Stop Camera
                </button>
              )}
            </div>

            {/* Manual Pass ID Entry */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                Manual Pass ID or Scanned String Lookup
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter PASS-2026-XXXX or paste QR data..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && manualInput && handleVerify(manualInput)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
                <button
                  disabled={verifying || !manualInput.trim()}
                  onClick={() => handleVerify(manualInput)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Search className="w-3.5 h-3.5" />
                  Verify
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Verification Result Panel */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs min-h-[350px] flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                Gate Verification Outcome
              </h2>

              {verifying && (
                <div className="p-12 text-center text-slate-500 text-sm">
                  <div className="w-7 h-7 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  Verifying cryptographic tokens and pass status...
                </div>
              )}

              {actionSuccess && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                  {actionSuccess}
                </div>
              )}

              {!verifying && !scanResult && (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Scan a QR pass or enter a Pass ID on the left to verify access authorization.
                </div>
              )}

              {!verifying && scanResult && (
                <div className="space-y-4">
                  
                  {/* Status Banner */}
                  <div className={`p-4 rounded-lg border flex items-start gap-3 ${
                    scanResult.isValid 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}>
                    {scanResult.isValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-sm tracking-wide uppercase">
                        {scanResult.isValid ? 'ACCESS GRANTED • PASS VERIFIED' : 'ACCESS DENIED • VERIFICATION FAILED'}
                      </div>
                      <div className="text-xs opacity-90 mt-0.5 font-medium">{scanResult.reason}</div>
                    </div>
                  </div>

                  {/* Pass Details */}
                  {scanResult.pass && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs">
                      
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{scanResult.pass.user_name}</div>
                          <div className="text-slate-500 font-mono">{scanResult.pass.reg_no} • {scanResult.pass.department}</div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 uppercase">
                          {scanResult.pass.pass_type.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                        <div>
                          <span className="text-slate-500 block font-medium">Destination:</span>
                          <span className="font-semibold text-slate-900">{scanResult.pass.destination}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block font-medium">Pass Number:</span>
                          <span className="font-mono text-slate-900">{scanResult.pass.pass_number}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block font-medium">Valid Until:</span>
                          <span className="font-semibold text-slate-900">
                            {new Date(scanResult.pass.valid_to).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block font-medium">Last Movement:</span>
                          <span className="font-medium text-slate-800">
                            {scanResult.lastScan 
                              ? `${scanResult.lastScan.action_type} at ${new Date(scanResult.lastScan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : 'No prior scans'}
                          </span>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Action Buttons for Security Guard */}
            {scanResult && scanResult.pass && (
              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleRecordGateScan('EXIT')}
                  className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Grant Campus EXIT
                </button>

                <button
                  onClick={() => handleRecordGateScan('ENTRY')}
                  className="flex items-center justify-center gap-2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Grant Campus ENTRY
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Gate Activity History Feed */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            Live Gate Scans & Movement Activity ({selectedGate})
          </h2>
          <span className="text-xs text-slate-500">Auto-refreshes every 10s</span>
        </div>

        {scanHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No scan events recorded at {selectedGate} today yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User Details</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Security Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scanHistory.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {new Date(s.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{s.user_name}</div>
                      <div className="font-mono text-slate-500 text-[11px]">{s.reg_no}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                        s.action_type === 'ENTRY' ? 'text-emerald-700' : 'text-slate-800'
                      }`}>
                        {s.action_type === 'ENTRY' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        {s.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                        s.result === 'GRANTED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {s.result}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.destination || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-500">{s.guard_name || 'Gate Officer'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
