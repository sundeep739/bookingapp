"use client";
import { useState } from "react";
import {
  X, Mail, Phone, Calendar, Clock, Video, MapPin, FileText,
  CheckCircle, XCircle, RefreshCw, Loader2, User as UserIcon,
} from "lucide-react";

const STATUS = {
  CONFIRMED:   { label: "Confirmed",   color: "#10b981", bg: "#d1fae5" },
  PENDING:     { label: "Pending",     color: "#f59e0b", bg: "#fef3c7" },
  COMPLETED:   { label: "Completed",   color: "#3b82f6", bg: "#dbeafe" },
  CANCELLED:   { label: "Cancelled",   color: "#ef4444", bg: "#fee2e2" },
  RESCHEDULED: { label: "Rescheduled", color: "#8b5cf6", bg: "#ede9fe" },
  NO_SHOW:     { label: "No Show",     color: "#6b7280", bg: "#f3f4f6" },
} as const;

const ACTIONS = [
  { status: "CONFIRMED", label: "Confirm",   icon: CheckCircle, color: "#10b981" },
  { status: "COMPLETED", label: "Complete",  icon: CheckCircle, color: "#3b82f6" },
  { status: "NO_SHOW",   label: "No Show",   icon: XCircle,     color: "#6b7280" },
  { status: "CANCELLED", label: "Cancel",    icon: XCircle,     color: "#ef4444" },
];

export default function BookingDetailDrawer({
  booking, onClose, onUpdated,
}: {
  booking: any | null;
  onClose: () => void;
  onUpdated: (b: any) => void;
}) {
  const [updating, setUpdating] = useState<string | null>(null);
  if (!booking) return null;

  const s = STATUS[booking.status as keyof typeof STATUS] ?? STATUS.PENDING;
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  const changeStatus = async (status: string) => {
    setUpdating(status);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdated({ ...booking, status: updated.status });
      }
    } finally {
      setUpdating(null);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-50 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-[slideIn_0.2s_ease-out]">
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Booking Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invitee */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#e53e6d,#f97316)" }}>
              {booking.inviteeName?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 truncate">{booking.inviteeName}</h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1"
                style={{ color: s.color, backgroundColor: s.bg }}>
                {s.label}
              </span>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <Row icon={Mail} label="Email">
              <a href={`mailto:${booking.inviteeEmail}`} className="text-pink-600 hover:underline break-all">{booking.inviteeEmail}</a>
            </Row>
            {booking.inviteePhone && (
              <Row icon={Phone} label="Phone">
                <a href={`tel:${booking.inviteePhone}`} className="text-pink-600 hover:underline">{booking.inviteePhone}</a>
              </Row>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Event */}
          <div className="space-y-3">
            <Row icon={UserIcon} label="Service">
              <div className="flex items-center gap-2">
                {booking.eventType?.color && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: booking.eventType.color }} />}
                <span className="font-medium text-gray-900">{booking.eventType?.title}</span>
              </div>
            </Row>
            <Row icon={Calendar} label="Date">
              <span className="text-gray-900">{start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            </Row>
            <Row icon={Clock} label="Time">
              <span className="text-gray-900">
                {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            </Row>
            {booking.location ? (
              <Row icon={MapPin} label="Location"><span className="text-gray-900">{booking.location}</span></Row>
            ) : (
              <Row icon={Video} label="Location"><span className="text-gray-900">Google Meet</span></Row>
            )}
            {booking.notes && (
              <Row icon={FileText} label="Notes"><span className="text-gray-700">{booking.notes}</span></Row>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">Change status</p>
          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.filter((a) => a.status !== booking.status).map((a) => (
              <button key={a.status} onClick={() => changeStatus(a.status)} disabled={!!updating}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: a.color + "33", color: a.color }}>
                {updating === a.status ? <Loader2 size={14} className="animate-spin" /> : <a.icon size={14} />}
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <div className="text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}
