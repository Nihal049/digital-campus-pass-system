import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogIn, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const testAccounts = [
    { name: 'P. Nihal (Batch 17)', role: 'STUDENT', email: 'nihal@campus.edu', pw: 'student123', color: 'border-blue-200 text-blue-700 bg-blue-50' },
    { name: 'Prof. Sunita Reddy', role: 'FACULTY', email: 'faculty@campus.edu', pw: 'faculty123', color: 'border-purple-200 text-purple-700 bg-purple-50' },
    { name: 'Officer Vikram Singh', role: 'SECURITY', email: 'guard@campus.edu', pw: 'security123', color: 'border-emerald-200 text-emerald-700 bg-emerald-50' },
    { name: 'Dr. Ramesh Sharma', role: 'ADMIN', email: 'admin@campus.edu', pw: 'admin123', color: 'border-rose-200 text-rose-700 bg-rose-50' },
    { name: 'Anand Verma', role: 'VISITOR', email: 'visitor@gmail.com', pw: 'visitor123', color: 'border-amber-200 text-amber-700 bg-amber-50' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async (acc) => {
    setEmail(acc.email);
    setPassword(acc.pw);
    setLoading(true);
    setErrorMsg('');

    try {
      await login(acc.email, acc.pw);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs mx-auto mb-3">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          CampusPass System
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Digital Campus Passes • Gate QR Verification • AI Campus Assistant
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white border border-slate-200 py-8 px-6 shadow-sm rounded-xl sm:px-10 space-y-5">
          
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Campus Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@campus.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-semibold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Authenticating...' : 'Sign In to CampusPass'}
            </button>
          </form>

          {/* 1-Click Demo Personas */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                1-Click Demo Login (Instant Access):
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {testAccounts.map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleTestLogin(acc)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex items-center justify-between cursor-pointer"
                >
                  <div className="truncate">
                    <span className="text-xs font-semibold text-slate-900">{acc.name}</span>
                    <span className="text-[11px] text-slate-500 block">{acc.email}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${acc.color}`}>
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 pt-1">
            Need a student or visitor account?{' '}
            <Link to="/register" className="text-slate-900 font-semibold hover:underline">
              Register here
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
