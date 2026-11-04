import React, { useState } from 'react';
import { 
  Printer, 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Building,
  User, 
  Maximize2, 
  Download
} from 'lucide-react';

export default function PassCard({ pass, qr, onClose }) {
  const [fullscreenQR, setFullscreenQR] = useState(false);

  if (!pass) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    if (!qr?.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qr.qrDataUrl;
    link.download = `CampusPass_QR_${pass.pass_number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusConfig = {
    APPROVED: {
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
      label: 'APPROVED & VALID'
    },
    PENDING: {
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Clock,
      label: 'AWAITING APPROVAL'
    },
    REJECTED: {
      color: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: XCircle,
      label: 'REJECTED'
    },
    CANCELLED: {
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: XCircle,
      label: 'CANCELLED'
    },
    REVOKED: {
      color: 'bg-red-50 text-red-800 border-red-200',
      icon: AlertTriangle,
      label: 'REVOKED'
    },
    COMPLETED: {
      color: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: CheckCircle2,
      label: 'COMPLETED & LOGGED'
    }
  };

  const currentStatus = statusConfig[pass.status] || statusConfig.PENDING;
  const StatusIcon = currentStatus.icon;

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl shadow-xl overflow-hidden print:m-0 print:border-none print:shadow-none print:w-full">
          
          {/* Header */}
          <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-slate-300" />
                <span className="font-bold tracking-tight text-base text-white">DIGITAL CAMPUS PASS</span>
              </div>
              <div className="text-xs text-slate-400 font-mono tracking-wider mt-0.5">
                {pass.pass_number}
              </div>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-md font-medium uppercase">
              {pass.pass_type.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Pass Body */}
          <div className="p-6 space-y-4">
            
            {/* Status Banner */}
            <div className={`flex items-center justify-between px-3.5 py-2 rounded-lg border ${currentStatus.color}`}>
              <div className="flex items-center gap-2">
                <StatusIcon className="w-4 h-4" />
                <span className="text-xs font-bold tracking-wide uppercase">{currentStatus.label}</span>
              </div>
              <span className="text-[11px] opacity-80">
                {pass.approval_time ? `Approved: ${formatDate(pass.approval_time)}` : 'Submitted: ' + formatDate(pass.created_at)}
              </span>
            </div>

            {/* QR Code Section */}
            {pass.status === 'APPROVED' && qr?.qrDataUrl ? (
              <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-lg border border-slate-200 relative group">
                <img 
                  src={qr.qrDataUrl} 
                  alt="Digital Pass QR Code" 
                  className="w-48 h-48 object-contain cursor-pointer bg-white p-2 rounded-md border border-slate-200"
                  onClick={() => setFullscreenQR(true)}
                  title="Click for fullscreen view"
                />
                
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setFullscreenQR(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[11px] font-medium transition shadow-xs"
                  >
                    <Maximize2 className="w-3 h-3" /> Fullscreen QR
                  </button>
                  <button
                    onClick={handleDownloadQR}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[11px] font-medium transition shadow-xs"
                  >
                    <Download className="w-3 h-3" /> Save PNG
                  </button>
                </div>

                <div className="text-[10px] text-slate-500 font-mono mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  HMAC-SHA256 Cryptographically Signed
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-center text-slate-600 text-xs">
                <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto mb-1.5" />
                {pass.status === 'PENDING' ? (
                  <p>QR Code will be generated and signed automatically once approved by your faculty mentor.</p>
                ) : (
                  <p>QR code unavailable for pass with status: {pass.status}</p>
                )}
              </div>
            )}

            {/* Student & Destination Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-slate-500 flex items-center gap-1 mb-1 font-medium">
                  <User className="w-3.5 h-3.5" />
                  <span>Pass Holder</span>
                </div>
                <div className="font-semibold text-slate-900 text-sm truncate">{pass.student_name || 'Pass Holder'}</div>
                <div className="text-slate-500 font-mono">{pass.reg_no}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-slate-500 flex items-center gap-1 mb-1 font-medium">
                  <Building className="w-3.5 h-3.5" />
                  <span>Department</span>
                </div>
                <div className="font-semibold text-slate-900 text-sm">{pass.department || 'N/A'}</div>
                <div className="text-slate-500">Batch 17</div>
              </div>
            </div>

            {/* Time Window */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-600" /> Valid From:
                </span>
                <span className="font-mono text-slate-900 font-semibold">{formatDate(pass.valid_from)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-600" /> Valid Until:
                </span>
                <span className="font-mono text-slate-900 font-semibold">{formatDate(pass.valid_to)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-600 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500 font-medium">Destination: </span>
                  <span className="font-semibold text-slate-900">{pass.destination}</span>
                </div>
              </div>
            </div>

            {/* Reason / Remarks */}
            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-900">Purpose: </span>
              {pass.reason}
              {pass.approval_notes && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-slate-700">
                  <span className="font-semibold text-slate-900">Reviewer Remark: </span> {pass.approval_notes}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <strong>Instructions</strong>: Present this QR code to the Security Guard at Gate 1, 2, or 3. Valid physical campus ID card must accompany this digital pass.
            </div>

          </div>

          {/* Modal Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 print:hidden">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition"
            >
              Close
            </button>

            {pass.status === 'APPROVED' && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save Pass
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Fullscreen Mobile QR Modal */}
      {fullscreenQR && qr?.qrDataUrl && (
        <div 
          onClick={() => setFullscreenQR(false)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 cursor-pointer"
        >
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center space-y-3 shadow-2xl">
            <h3 className="text-slate-900 font-bold text-base tracking-tight">SCAN DIGITAL PASS</h3>
            <div className="text-xs text-slate-500 font-mono font-medium">{pass.pass_number}</div>
            
            <img 
              src={qr.qrDataUrl} 
              alt="Fullscreen QR" 
              className="w-full aspect-square object-contain mx-auto bg-white p-2 rounded-lg border border-slate-200" 
            />

            <div className="text-xs text-slate-800 font-semibold">{pass.student_name} ({pass.reg_no})</div>
            <div className="text-[11px] text-emerald-700 font-bold">Valid Until: {formatDate(pass.valid_to)}</div>
            <p className="text-[10px] text-slate-400">Tap anywhere to minimize</p>
          </div>
        </div>
      )}
    </>
  );
}
