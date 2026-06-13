"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, ChevronRight, Loader2 } from "lucide-react";
import BookingDetailDrawer from "./BookingDetailDrawer";

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  CONFIRMED:  { label: "Confirmed",  icon: CheckCircle, color: "#10b981", bg: "#d1fae5" },
  PENDING:    { label: "Pending",    icon: Clock,       color: "#f59e0b", bg: "#fef3c7" },
  COMPLETED:  { label: "Completed",  icon: CheckCircle, color: "#3b82f6", bg: "#dbeafe" },
  CANCELLED:  { label: "Cancelled",  icon: XCircle,     color: "#ef4444", bg: "#fee2e2" },
};

export default function RecentBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/bookings?limit=6")
      .then((r) => r.json())
      .then(setBookings)
      .finally(() => setLoading(false));
  }, []);

  const handleUpdated = (updated: any) => {
    setBookings((prev) => prev.map((b) => b.id === updated.id ? { ...b, ...updated } : b));
    setSelected(updated);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Recent Bookings</h2>
        <a href="/dashboard/bookings" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View all →</a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Clock size={36} className="text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">No bookings yet</p>
          <p className="text-xs text-gray-300 mt-1">Bookings will appear here once people start scheduling.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden divide-y divide-gray-50">
            {bookings.map((b) => {
              const s = statusConfig[b.status] ?? statusConfig.PENDING;
              const SIcon = s.icon;
              return (
                <button key={b.id} onClick={() => setSelected(b)}
                  className="w-full text-left px-4 py-3.5 flex items-start gap-3 active:bg-indigo-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {b.inviteeName?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.inviteeName}</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0" style={{ color: s.color, backgroundColor: s.bg }}>
                        <SIcon size={10} />{s.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{b.eventType?.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(b.startTime)} · {formatTime(b.startTime)}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invitee</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Type</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => {
                  const s = statusConfig[b.status] ?? statusConfig.PENDING;
                  const SIcon = s.icon;
                  return (
                    <tr key={b.id} onClick={() => setSelected(b)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {b.inviteeName?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{b.inviteeName}</p>
                            <p className="text-xs text-gray-400">{b.inviteeEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{b.eventType?.title}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-800">{formatDate(b.startTime)}</p>
                        <p className="text-xs text-gray-400">{formatTime(b.startTime)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: s.color, backgroundColor: s.bg }}>
                          <SIcon size={12} />{s.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight size={16} className="text-gray-300 inline" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <BookingDetailDrawer booking={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
    </div>
  );
}
