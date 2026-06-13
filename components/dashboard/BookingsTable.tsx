"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, RefreshCw, Search, Loader2, ChevronRight } from "lucide-react";
import BookingDetailDrawer from "./BookingDetailDrawer";

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  CONFIRMED:   { label: "Confirmed",   icon: CheckCircle, color: "#10b981", bg: "#d1fae5" },
  PENDING:     { label: "Pending",     icon: Clock,       color: "#f59e0b", bg: "#fef3c7" },
  COMPLETED:   { label: "Completed",   icon: CheckCircle, color: "#3b82f6", bg: "#dbeafe" },
  CANCELLED:   { label: "Cancelled",   icon: XCircle,     color: "#ef4444", bg: "#fee2e2" },
  RESCHEDULED: { label: "Rescheduled", icon: RefreshCw,   color: "#8b5cf6", bg: "#ede9fe" },
  NO_SHOW:     { label: "No Show",     icon: XCircle,     color: "#6b7280", bg: "#f3f4f6" },
};

const filters = ["All", "CONFIRMED", "PENDING", "COMPLETED", "CANCELLED"];

export default function BookingsTable() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  const load = (status?: string) => {
    setLoading(true);
    const qs = status && status !== "All" ? `?status=${status}` : "";
    fetch(`/api/bookings${qs}`)
      .then((r) => r.json())
      .then(setBookings)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(activeFilter); }, [activeFilter]);

  const handleUpdated = (updated: any) => {
    setBookings((prev) => prev.map((b) => b.id === updated.id ? { ...b, ...updated } : b));
    setSelected(updated);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const filtered = bookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.inviteeName?.toLowerCase().includes(q) ||
      b.inviteeEmail?.toLowerCase().includes(q) ||
      b.eventType?.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeFilter === f ? "text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"}`}
              style={activeFilter === f ? { backgroundColor: "#4F46E5" } : {}}>
              {f === "All" ? "All Bookings" : statusConfig[f]?.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder="Search bookings..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 w-64" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? "No bookings match your search" : "No bookings yet"}</p>
            {!search && <p className="text-sm mt-1">Bookings will appear here once people start scheduling.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invitee</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Type</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((b) => {
                  const s = statusConfig[b.status] ?? statusConfig.PENDING;
                  const SIcon = s.icon;
                  return (
                    <tr key={b.id} onClick={() => setSelected(b)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                            {b.inviteeName?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{b.inviteeName}</p>
                            <p className="text-xs text-gray-400">{b.inviteeEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {b.eventType?.color && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.eventType.color }} />}
                          <span className="text-sm text-gray-600">{b.eventType?.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-800">{formatDate(b.startTime)}</p>
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
        )}
      </div>

      <BookingDetailDrawer booking={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
    </div>
  );
}
