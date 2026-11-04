import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle
} from 'lucide-react';

export default function PublicPassVerifyPage() {
  const { passNumber } = useParams();
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    verifyPass();
  }, [passNumber]);

  const verifyPass = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      const savedToken = localStorage.getItem('campus_pass_token');
      if (savedToken) {
        headers['Authorization'] = `Bearer ${savedToken}`;
      }

      const res = await fetch('/api/gate/verify-qr', {
        method: 'POST',
        headers,
        body: JSON.stringify({ passNumber: passNumber })
      });
      const data = await res.json();
      if (!res.ok && !data.pass) {
        setErrorMsg(data.reason || 'Pass not found or invalid format.');
      } else {
        setPassData(data);
      }
    } catch (err) {
      setErrorMsg('Failed to connect to campus verification authority.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        
        {/* University Header */}
        <div className="bg-slate-900 p-5 text-white text-center">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mx-auto mb-2 border border-slate-700">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">CAMPUS ACCESS VERIFICATION</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {passNumber}</p>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-2.5"></div>
              Verifying pass cryptographic signature...
            </div>
          ) : errorMsg ? (
            <div className="p-5 rounded-lg bg-rose-50 border border-rose-200 text-center space-y-2">
              <XCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <div className="text-sm font-bold text-rose-900">INVALID PASS</div>
              <p className="text-xs text-rose-700">{errorMsg}</p>
            </div>
          ) : passData ? (
            <div className="space-y-4">
              
              {/* Outcome Banner */}
              <div className={`p-4 rounded-lg border text-center space-y-1 ${
                passData.isValid 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {passData.isValid ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-700 mx-auto mb-1" />
                ) : (
                  <AlertTriangle className="w-7 h-7 text-rose-700 mx-auto mb-1" />
                )}
                <div className="text-sm font-bold tracking-wide uppercase">
                  {passData.isValid ? 'OFFICIALLY VERIFIED PASS' : 'VERIFICATION FAILED'}
                </div>
                <div className="text-xs opacity-90">{passData.reason}</div>
              </div>

              {/* Pass Details */}
              {passData.pass && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs text-slate-700">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{passData.pass.user_name}</div>
                      <div className="text-slate-500 font-mono">{passData.pass.reg_no}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 uppercase">
                      {passData.pass.pass_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Department:</span>
                      <span className="font-semibold text-slate-900">{passData.pass.department}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Destination:</span>
                      <span className="font-semibold text-slate-900">{passData.pass.destination}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Valid Until:</span>
                      <span className="font-mono text-emerald-700 font-semibold">
                        {new Date(passData.pass.valid_to).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : null}

          <div className="text-center pt-2 border-t border-slate-200">
            <Link to="/" className="text-xs text-slate-600 hover:text-slate-900 font-semibold hover:underline">
              ← Return to CampusPass Portal
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
