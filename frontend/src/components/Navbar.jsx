import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  QrCode, 
  FileText, 
  Users, 
  Activity, 
  Bot, 
  LogOut, 
  UserCheck, 
  Bell, 
  MapPin, 
  Check, 
  CheckCheck,
  Building
} from 'lucide-react';

export default function Navbar() {
  const { user, token, logout, quickSwitch } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      await fetch(`/api/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  if (!user) return null;

  const testAccounts = [
    { label: 'Student: P. Nihal (Batch 17)', role: 'STUDENT', email: 'nihal@campus.edu', pw: 'student123' },
    { label: 'Faculty: Prof. Sunita Reddy', role: 'FACULTY', email: 'faculty@campus.edu', pw: 'faculty123' },
    { label: 'Security: Officer Vikram Singh', role: 'SECURITY', email: 'guard@campus.edu', pw: 'security123' },
    { label: 'Admin: Dr. Ramesh Sharma', role: 'ADMIN', email: 'admin@campus.edu', pw: 'admin123' },
    { label: 'Visitor: Anand Verma', role: 'VISITOR', email: 'visitor@gmail.com', pw: 'visitor123' },
  ];

  const handleQuickSwitch = async (e) => {
    const selectedEmail = e.target.value;
    if (!selectedEmail) return;
    const acc = testAccounts.find(a => a.email === selectedEmail);
    if (acc) {
      await quickSwitch(acc.email, acc.pw);
      navigate('/');
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/', roles: ['STUDENT', 'FACULTY', 'SECURITY', 'ADMIN', 'VISITOR'], icon: FileText },
    { label: 'Gate Scanner', path: '/gate-scanner', roles: ['SECURITY', 'ADMIN'], icon: QrCode },
    { label: 'Currently Inside', path: '/currently-inside', roles: ['SECURITY', 'ADMIN'], icon: MapPin },
    { label: 'Visitors', path: '/visitors', roles: ['ADMIN', 'FACULTY', 'SECURITY', 'VISITOR'], icon: Users },
    { label: 'Gates & Types', path: '/gates-management', roles: ['ADMIN'], icon: Building },
    { label: 'Audit Logs', path: '/audit-logs', roles: ['ADMIN', 'SECURITY'], icon: Activity },
    { label: 'AI Campus Assistant', path: '/assistant', roles: ['STUDENT', 'FACULTY', 'SECURITY', 'ADMIN', 'VISITOR'], icon: Bot },
  ];

  const roleColors = {
    ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
    FACULTY: 'bg-purple-50 text-purple-700 border-purple-200',
    STUDENT: 'bg-blue-50 text-blue-700 border-blue-200',
    SECURITY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    VISITOR: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-base text-slate-900 tracking-tight flex items-center gap-2">
                  CampusPass <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">Batch-17</span>
                </span>
                <span className="text-[11px] text-slate-500 block -mt-0.5">Enterprise Access & AI RAG System</span>
              </div>
            </Link>

            {/* Nav Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.filter(item => item.roles.includes(user.role)).map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition ${
                      active 
                        ? 'bg-slate-100 text-slate-900 font-semibold' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            
            {/* Quick Switcher */}
            <div className="hidden xl:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md text-xs">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500">Persona:</span>
              <select
                onChange={handleQuickSwitch}
                value={user.email}
                className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer text-xs"
              >
                {testAccounts.map(acc => (
                  <option key={acc.email} value={acc.email} className="bg-white text-slate-800">
                    {acc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* In-App Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-600 rounded-full"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-slate-700" /> Notifications ({unreadCount} new)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No notifications right now.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs transition flex items-start justify-between gap-2 ${
                            n.is_read ? 'bg-white text-slate-600' : 'bg-slate-50/70 text-slate-900 font-medium'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-900">{n.title}</div>
                            <div className="text-slate-600 text-[11px] mt-0.5 leading-snug font-normal">{n.message}</div>
                            <div className="text-[10px] text-slate-400 mt-1 font-normal">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          {!n.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="text-slate-400 hover:text-slate-700 p-1 shrink-0"
                              title="Mark read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Link & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <Link
                to="/profile"
                className="text-right hover:opacity-80 transition hidden sm:block"
                title="View Profile"
              >
                <div className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</div>
                <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                  <span className={`px-1.5 py-0.2 rounded font-semibold border ${roleColors[user.role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {user.role}
                  </span>
                </div>
              </Link>

              <button
                onClick={logout}
                title="Sign out"
                className="p-2 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
