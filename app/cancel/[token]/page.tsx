"use client";
import { useEffect, useState, use } from "react";
import { CalendarCheck, Check, Loader2, AlertCircle, X, RefreshCw, ChevronLeft } from "lucide-react";

export default function ManageBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState("");

  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [rsDate, setRsDate] = useState("");
  const [slots, setSlots] = useState<{ start: string; label: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [rsSlot, setRsSlot] = useState<{ start: string; label: string } | null>(null);
  const [rsSaving, setRsSaving] = useState(false);
  const [rescheduled, setRescheduled] = useState(false);

  useEffect(() => {
    fetch(`/api/cancel/${token}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setBooking(d); })
      .catch(() => setError("Failed to load booking"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (mode !== "reschedule" || !rsDate || !booking) return;
    setSlotsLoading(true); setSlots([]); setRsSlot(null);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/book/${booking.hostUsername}/slots?date=${rsDate}&slug=${booking.eventSlug}&duration=${booking.duration}&tz=${encodeURIComponent(tz)}`)
      .then((r) => r.json()).then((d) => setSlots(d.slots ?? [])).finally(() => setSlotsLoading(false));
  }, [rsDate, mode, booking]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/cancel/${token}`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Failed to cancel"); return; }
      setCancelled(true);
    } finally { setCancelling(false); }
  };

  const submitReschedule = async () => {
    if (!rsSlot) return;
    setRsSaving(true);
    try {
      const res = await fetch(`/api/cancel/${token}/reschedule`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: rsSlot.start }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error ?? "Could not reschedule"); return; }
      setBooking({ ...booking, startTime: d.startTime });
      setRescheduled(true);
      setMode("view");
    } finally { setRsSaving(false); }
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f4f6fb" }}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e53e6d" }}>
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">BookEasy</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-pink-500" /></div>
          ) : error ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-7 h-7 text-red-500" /></div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Booking not found</h2>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          ) : cancelled || booking?.status === "CANCELLED" ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><X className="w-7 h-7 text-gray-500" /></div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Cancelled</h2>
              <p className="text-gray-500 text-sm">Your booking has been cancelled.</p>
              <a href={`/${booking?.hostUsername}`} className="inline-block mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "#e53e6d" }}>Book Again</a>
            </div>
          ) : mode === "reschedule" ? (
            <>
              <button onClick={() => setMode("view")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"><ChevronLeft size={15} /> Back</button>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Reschedule</h2>
              <p className="text-gray-500 text-sm mb-5">Pick a new time for {booking.eventTitle}.</p>
              <label className="block text-xs font-medium text-gray-500 mb-1">New date</label>
              <input type="date" value={rsDate} min={todayStr} onChange={(e) => setRsDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 mb-4" />
              {rsDate && (
                slotsLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-pink-400" /></div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No open slots on this day.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto mb-4">
                    {slots.map((s) => (
                      <button key={s.start} onClick={() => setRsSlot(s)}
                        className={`py-2 rounded-lg text-xs font-medium border-2 transition-colors ${rsSlot?.start === s.start ? "text-white border-transparent" : "border-gray-200 text-gray-600 hover:border-pink-300"}`}
                        style={rsSlot?.start === s.start ? { backgroundColor: "#e53e6d" } : {}}>{s.label}</button>
                    ))}
                  </div>
                )
              )}
              <button onClick={submitReschedule} disabled={!rsSlot || rsSaving}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: "#e53e6d" }}>
                {rsSaving ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Confirm new time
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Manage your booking</h2>
              <p className="text-gray-500 text-sm mb-6">Reschedule or cancel your meeting.</p>

              {rescheduled && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2 mb-4">
                  <Check size={15} /> Rescheduled — a confirmation email is on its way.
                </div>
              )}

              <div className="bg-gray-50 rounded-2xl p-5 space-y-2 mb-6">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Event</span><span className="font-semibold text-gray-900">{booking.eventTitle}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Date</span><span className="font-semibold text-gray-900">{fmtDate(booking.startTime)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Time</span><span className="font-semibold text-gray-900">{fmtTime(booking.startTime)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Host</span><span className="font-semibold text-gray-900">{booking.hostName}</span></div>
              </div>

              <button onClick={() => { setMode("reschedule"); setRsDate(""); }}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mb-3" style={{ backgroundColor: "#e53e6d" }}>
                <RefreshCw size={15} /> Reschedule
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                {cancelling ? <><Loader2 size={15} className="animate-spin" />Cancelling...</> : "Cancel Booking"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
