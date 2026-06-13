"use client";
import { useState, useEffect } from "react";
import { Clock, ChevronLeft, ChevronRight, Check, Loader2, Globe, AlertCircle, Users, X } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const GUEST_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const GUEST_TZ_LABEL = GUEST_TZ.replace(/_/g, " ");

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export type TeamService = {
  title: string;      // display title
  key: string;        // normalized title (sent to API)
  duration: number;
  price: number;
  currency: string;
  color: string;
  staffCount: number;
};

export default function RoundRobinBooking({ slug, service, onClose }: { slug: string; service: TeamService; onClose: () => void }) {
  const [step, setStep] = useState<"schedule" | "fill-form" | "confirmed">("schedule");
  const [currentMonth, setCurrentMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<{ start: string; label: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; label: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignedStaff, setAssignedStaff] = useState<string | null>(null);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Load union availability days for this service
  useEffect(() => {
    fetch(`/api/org/${slug}/round-robin?service=${encodeURIComponent(service.key)}`)
      .then((r) => r.json())
      .then((d) => setAvailableDays(d.availableDays ?? []))
      .catch(() => {});
  }, [slug, service.key]);

  // Load union slots when a date is picked
  useEffect(() => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    fetch(`/api/org/${slug}/round-robin?service=${encodeURIComponent(service.key)}&date=${toDateStr(selectedDate)}&tz=${encodeURIComponent(GUEST_TZ)}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, slug, service.key]);

  const getDaysInMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };
  const days = getDaysInMonth(currentMonth);

  const isDisabled = (day: number | null) => {
    if (!day) return true;
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    d.setHours(0, 0, 0, 0);
    if (d < today) return true;
    return !availableDays.includes(d.getDay());
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/${slug}/round-robin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: service.key,
          start: selectedSlot.start,
          name: form.name, email: form.email, phone: form.phone || null,
          notes: form.notes, timezone: GUEST_TZ,
        }),
      });
      const data = await res.json();
      if (data.requiresPayment && data.url) { window.location.href = data.url; return; }
      if (data.success) { setAssignedStaff(data.staffName ?? null); setStep("confirmed"); }
      else if (res.status === 409) { setError(data.error ?? "That time was just taken. Please choose another."); setSelectedSlot(null); setStep("schedule"); }
      else { setError(data.error ?? "Something went wrong. Please try again."); }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
      <div className="w-full max-w-3xl my-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex items-center gap-3" style={{ backgroundColor: service.color + "12" }}>
            {step !== "confirmed" && step !== "schedule" ? (
              <button onClick={() => setStep("schedule")} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
            ) : null}
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">{service.title}</h2>
              <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1"><Clock size={11} /> {service.duration} min</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Users size={11} /> Any available staff ({service.staffCount})</span>
                {service.price > 0 && <><span>·</span><span className="font-medium text-gray-700">{service.currency} {service.price}</span></>}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/50 transition-colors"><X size={18} className="text-gray-500" /></button>
          </div>

          {error && (
            <div className="m-5 mb-0 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          {/* Schedule */}
          {step === "schedule" && (
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-6 md:border-r border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-gray-900">{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      disabled={currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth()}
                      className="p-2 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-30"><ChevronLeft size={16} className="text-gray-500" /></button>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><ChevronRight size={16} className="text-gray-500" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 mb-2">
                  {DAYS_SHORT.map((d) => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, idx) => {
                    const disabled = isDisabled(day);
                    const isSelected = day && selectedDate &&
                      selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
                    return (
                      <button key={idx} disabled={disabled}
                        onClick={() => { if (day && !disabled) setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)); }}
                        className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                          !day ? "" : isSelected ? "text-white shadow-sm" : disabled ? "text-gray-200 cursor-not-allowed" : "text-gray-700 bg-indigo-50/60 hover:bg-indigo-100 hover:text-indigo-700"
                        }`}
                        style={isSelected ? { backgroundColor: service.color } : {}}>
                        {day}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 mt-5 text-xs text-gray-400"><Globe size={12} /><span>Times shown in {GUEST_TZ_LABEL}</span></div>
              </div>
              <div className="p-6">
                {!selectedDate ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10 text-gray-400">
                    <Users size={28} className="mb-3 text-gray-300" />
                    <p className="text-sm">Pick a date to see available times</p>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-900 mb-1">{selectedDate.toLocaleDateString("en-US", { weekday: "long" })}</h3>
                    <p className="text-xs text-gray-400 mb-4">{selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                    ) : slots.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No available times on this day.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                        {slots.map((slot) => (
                          <button key={slot.start} onClick={() => { setSelectedSlot(slot); setStep("fill-form"); }}
                            className="py-3 rounded-xl text-sm font-medium border-2 transition-all hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                            style={{ borderColor: "#e5e7eb" }}>
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          {step === "fill-form" && selectedDate && selectedSlot && (
            <form onSubmit={handleBook} className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {selectedSlot.label}
                <span className="text-gray-400"> · {GUEST_TZ_LABEL} · you'll be matched with an available staff member</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                <input required type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Jane Smith" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="jane@example.com" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-gray-400 font-normal">(optional — for SMS reminders)</span></label>
                <input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 555 000 0000" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3}
                  placeholder="Anything we should know?" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ backgroundColor: service.color }}>
                {submitting ? <><Loader2 size={16} className="animate-spin" /> {service.price > 0 ? "Redirecting to payment..." : "Confirming..."}</> : service.price > 0 ? `Confirm & Pay ${service.currency || "$"}${service.price}` : "Confirm Booking"}
              </button>
            </form>
          )}

          {/* Confirmed */}
          {step === "confirmed" && selectedDate && selectedSlot && (
            <div className="p-10 text-center">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5"><Check size={40} className="text-green-500" /></div>
              <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
              <p className="text-gray-500 mt-2 text-sm">A confirmation has been sent to <strong>{form.email}</strong></p>
              <div className="mt-6 p-5 bg-gray-50 rounded-2xl text-left space-y-3 max-w-sm mx-auto">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Service</span><span className="font-semibold text-gray-900">{service.title}</span></div>
                {assignedStaff && <div className="flex justify-between text-sm"><span className="text-gray-500">With</span><span className="font-semibold text-gray-900">{assignedStaff}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-gray-500">Date</span><span className="font-semibold text-gray-900">{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Time</span><span className="font-semibold text-gray-900">{selectedSlot.label}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Timezone</span><span className="font-semibold text-gray-900">{GUEST_TZ_LABEL}</span></div>
              </div>
              <button onClick={onClose} className="w-full max-w-sm mx-auto mt-6 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
