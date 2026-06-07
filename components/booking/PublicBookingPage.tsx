"use client";
import { useState, useEffect } from "react";
import { CalendarCheck, Clock, Video, ChevronLeft, ChevronRight, Check, Loader2, MapPin } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

type Question = { id: string; label: string; type: "text" | "textarea" | "select"; required: boolean; options?: string[] };
type EventType = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  duration: number;
  color: string;
  location: string | null;
  price: number;
  currency: string;
  questions?: Question[] | null;
};

type HostProfile = {
  name: string | null;
  image: string | null;
  bio: string | null;
  eventTypes: EventType[];
};

type Step = "select-service" | "pick-date" | "pick-time" | "fill-form" | "confirmed" | "waitlist-join" | "waitlist-confirmed";

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function PublicBookingPage({ username }: { username: string }) {
  const [step, setStep]                   = useState<Step>("select-service");
  const [host, setHost]                   = useState<HostProfile | null>(null);
  const [hostLoading, setHostLoading]     = useState(true);
  const [hostError, setHostError]         = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [currentMonth, setCurrentMonth]   = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate]   = useState<Date | null>(null);
  const [slots, setSlots]                 = useState<{ start: string; label: string }[]>([]);
  const [slotsLoading, setSlotsLoading]   = useState(false);
  const [selectedSlot, setSelectedSlot]   = useState<{ start: string; label: string } | null>(null);
  const selectedTime = selectedSlot?.label ?? null;
  const [form, setForm]                   = useState({ name: "", email: "", phone: "", notes: "" });
  const [answers, setAnswers]             = useState<Record<string, string>>({});
  const [submitting, setSubmitting]       = useState(false);
  const [bookingId, setBookingId]         = useState<string | null>(null);
  const [waitlistForm, setWaitlistForm]   = useState({ name: "", email: "", phone: "" });
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Load host profile + event types
  useEffect(() => {
    fetch(`/api/book/${username}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setHostError(true); }
        else { setHost(data); }
      })
      .catch(() => setHostError(true))
      .finally(() => setHostLoading(false));
  }, [username]);

  // Load slots when date selected
  useEffect(() => {
    if (!selectedDate || !selectedEvent) return;
    setSlotsLoading(true);
    setSlots([]);
    fetch(
      `/api/book/${username}/slots?date=${toDateStr(selectedDate)}&slug=${selectedEvent.slug}&duration=${selectedEvent.duration}&tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`
    )
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, selectedEvent, username]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const isDisabled = (day: number | null) => {
    if (!day) return true;
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    d.setHours(0, 0, 0, 0);
    return d < today || d.getDay() === 0 || d.getDay() === 6;
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/book/${username}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug: selectedEvent.slug,
          start: selectedSlot.start,
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          notes: form.notes,
          answers: Object.fromEntries(
            (selectedEvent.questions ?? [])
              .filter((q) => answers[q.id]?.trim())
              .map((q) => [q.label, answers[q.id]])
          ),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBookingId(data.bookingId);
        setStep("confirmed");
      } else {
        alert("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setWaitlistSubmitting(true);
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTypeId: selectedEvent.id,
          hostUsername: username,
          name: waitlistForm.name,
          email: waitlistForm.email,
          phone: waitlistForm.phone || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      setStep("waitlist-confirmed");
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  const progressSteps = [
    { id: "select-service", label: "Service" },
    { id: "pick-date",      label: "Date" },
    { id: "pick-time",      label: "Time" },
    { id: "fill-form",      label: "Details" },
  ];
  const stepIdx = progressSteps.findIndex((s) => s.id === step);

  // ── Loading / error states ────────────────────────────────────────────
  if (hostLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f4f6fb" }}>
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (hostError || !host) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#f4f6fb" }}>
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl">😕</div>
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="text-gray-500">The user <strong>@{username}</strong> doesn't exist or hasn't set up their booking page yet.</p>
      </div>
    );
  }

  if (host.eventTypes.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#f4f6fb" }}>
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl">📅</div>
        <h1 className="text-2xl font-bold text-gray-900">No events available</h1>
        <p className="text-gray-500">@{username} hasn't created any booking events yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f4f6fb" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e53e6d" }}>
            <CalendarCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">BookEasy</span>
          <span className="text-gray-300 mx-1">·</span>
          <span className="text-gray-500 text-sm">@{username}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Progress bar */}
        {step !== "confirmed" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {progressSteps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    i < stepIdx ? "bg-green-100 text-green-700" :
                    i === stepIdx ? "text-white" : "bg-gray-100 text-gray-400"
                  }`}
                  style={i === stepIdx ? { backgroundColor: "#e53e6d" } : {}}
                >
                  {i < stepIdx ? <Check size={12} /> : <span>{i + 1}</span>}
                  {s.label}
                </div>
                {i < progressSteps.length - 1 && (
                  <div className={`w-8 h-px ${i < stepIdx ? "bg-green-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 1 — Select Service ─────────────────────────────────── */}
        {step === "select-service" && (
          <div>
            <div className="text-center mb-8">
              {host.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={host.image}
                  alt={host.name ?? username}
                  className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {(host.name ?? username)[0].toUpperCase()}
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-900">
                Book a meeting with {host.name ?? username}
              </h1>
              {host.bio && <p className="text-gray-500 mt-1 max-w-md mx-auto text-sm">{host.bio}</p>}
              <p className="text-gray-400 text-sm mt-1">@{username}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {host.eventTypes.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => { setSelectedEvent(ev); setStep("pick-date"); }}
                  className="bg-white rounded-2xl border border-gray-100 p-6 text-left hover:shadow-md hover:border-pink-200 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center" style={{ backgroundColor: ev.color + "20" }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ev.color }} />
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">{ev.title}</h3>
                  {ev.description && <p className="text-sm text-gray-500 mt-1">{ev.description}</p>}
                  <div className="flex items-center gap-1.5 mt-4 text-xs text-gray-400 flex-wrap">
                    <Clock size={13} />
                    <span>{ev.duration} min</span>
                    {ev.location ? (
                      <><MapPin size={13} className="ml-2" /><span>{ev.location}</span></>
                    ) : (
                      <><Video size={13} className="ml-2" /><span>Google Meet</span></>
                    )}
                    {ev.price > 0 && (
                      <span className="ml-auto font-semibold text-gray-700">
                        {ev.currency} {ev.price}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2 — Pick Date ──────────────────────────────────────── */}
        {step === "pick-date" && selectedEvent && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100" style={{ backgroundColor: selectedEvent.color + "10" }}>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep("select-service")} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedEvent.title}</h2>
                    <p className="text-xs text-gray-500">{selectedEvent.duration} min · Google Meet</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-5 text-center">Choose a Date</h3>
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft size={16} className="text-gray-500" />
                  </button>
                  <span className="font-semibold text-gray-900">
                    {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight size={16} className="text-gray-500" />
                  </button>
                </div>
                <div className="grid grid-cols-7 mb-2">
                  {DAYS_SHORT.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, idx) => {
                    const disabled = isDisabled(day);
                    const isSelected = day && selectedDate &&
                      selectedDate.getDate() === day &&
                      selectedDate.getMonth() === currentMonth.getMonth() &&
                      selectedDate.getFullYear() === currentMonth.getFullYear();
                    const isToday = day &&
                      today.getDate() === day &&
                      today.getMonth() === currentMonth.getMonth() &&
                      today.getFullYear() === currentMonth.getFullYear();

                    return (
                      <button
                        key={idx}
                        disabled={disabled}
                        onClick={() => {
                          if (day && !disabled) {
                            setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                            setStep("pick-time");
                          }
                        }}
                        className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                          !day ? "" :
                          isSelected ? "text-white shadow-sm" :
                          isToday ? "border-2 font-bold" :
                          disabled ? "text-gray-200 cursor-not-allowed" :
                          "text-gray-700 hover:bg-pink-50 hover:text-pink-600"
                        }`}
                        style={
                          isSelected ? { backgroundColor: selectedEvent.color } :
                          isToday    ? { borderColor: selectedEvent.color, color: selectedEvent.color } : {}
                        }
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3 — Pick Time ──────────────────────────────────────── */}
        {step === "pick-time" && selectedEvent && selectedDate && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep("pick-date")} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </h2>
                    <p className="text-xs text-gray-500">{selectedEvent.title} · {selectedEvent.duration} min</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Select a Time</h3>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-sm text-gray-400">No available slots on this day.</p>
                    <button
                      onClick={() => setStep("pick-date")}
                      className="text-pink-500 text-sm font-medium hover:underline block mx-auto"
                    >
                      ← Pick another date
                    </button>
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-xs text-gray-400 mb-3">Fully booked? Join the waitlist and we'll notify you when a slot opens.</p>
                      <button
                        onClick={() => setStep("waitlist-join")}
                        className="px-4 py-2 rounded-xl text-sm font-medium border-2 border-pink-200 text-pink-600 hover:bg-pink-50 transition-colors"
                      >
                        Join Waitlist
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {slots.map((slot) => (
                      <button
                        key={slot.start}
                        onClick={() => { setSelectedSlot(slot); setStep("fill-form"); }}
                        className="py-3 rounded-xl text-sm font-medium border-2 transition-all hover:border-pink-400 hover:text-pink-600 hover:bg-pink-50"
                        style={{ borderColor: "#e5e7eb" }}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4 — Fill Form ──────────────────────────────────────── */}
        {step === "fill-form" && selectedEvent && selectedDate && selectedTime && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100" style={{ backgroundColor: selectedEvent.color + "10" }}>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep("pick-time")} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedEvent.title}</h2>
                    <p className="text-xs text-gray-500">
                      {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {selectedTime}
                    </p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleBook} className="p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Your Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Jane Smith"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="jane@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone <span className="text-gray-400 font-normal">(optional — for SMS reminders)</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 555 000 0000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                  />
                </div>
                {/* Custom questions */}
                {selectedEvent.questions?.map((q) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {q.label} {q.required && <span className="text-pink-500">*</span>}
                    </label>
                    {q.type === "textarea" ? (
                      <textarea
                        required={q.required}
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 resize-none"
                      />
                    ) : q.type === "select" ? (
                      <select
                        required={q.required}
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                      >
                        <option value="">Select an option…</option>
                        {(q.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required={q.required}
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                      />
                    )}
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">What's this meeting about? (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Add any notes or questions..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ backgroundColor: selectedEvent.color }}
                >
                  {submitting ? <><Loader2 size={16} className="animate-spin" /> Confirming...</> : "Confirm Booking"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Step 5 — Confirmed ──────────────────────────────────────── */}
        {step === "confirmed" && selectedEvent && selectedDate && selectedTime && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
                <Check size={40} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
              <p className="text-gray-500 mt-2 text-sm">
                A confirmation has been sent to <strong>{form.email}</strong>
              </p>
              <div className="mt-6 p-5 bg-gray-50 rounded-2xl text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Event</span>
                  <span className="font-semibold text-gray-900">{selectedEvent.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date</span>
                  <span className="font-semibold text-gray-900">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Time</span>
                  <span className="font-semibold text-gray-900">{selectedTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-semibold text-gray-900">{selectedEvent.duration} minutes</span>
                </div>
                {bookingId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ref</span>
                    <span className="font-mono text-xs text-gray-400">{bookingId.slice(0, 8).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setStep("select-service");
                  setSelectedEvent(null);
                  setSelectedDate(null);
                  setSelectedSlot(null);
                  setSlots([]);
                  setBookingId(null);
                  setForm({ name: "", email: "", phone: "", notes: "" });
                }}
                className="w-full mt-6 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Book Another Meeting
              </button>
            </div>
          </div>
        )}
        {/* ── Waitlist Join ───────────────────────────────────────────── */}
        {step === "waitlist-join" && selectedEvent && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-amber-50">
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep("pick-time")} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  <div>
                    <h2 className="font-semibold text-gray-900">Join Waitlist</h2>
                    <p className="text-xs text-gray-500">{selectedEvent.title} with {host.name ?? username}</p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleWaitlist} className="p-6 space-y-4">
                <p className="text-sm text-gray-500">We'll notify you by email (and SMS if you provide a number) as soon as a slot opens up.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <input required type="text" value={waitlistForm.name}
                    onChange={(e) => setWaitlistForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Jane Smith"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                  <input required type="email" value={waitlistForm.email}
                    onChange={(e) => setWaitlistForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="jane@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone <span className="text-gray-400 font-normal">(optional — for SMS alert)</span>
                  </label>
                  <input type="tel" value={waitlistForm.phone}
                    onChange={(e) => setWaitlistForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 555 000 0000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400" />
                </div>
                <button type="submit" disabled={waitlistSubmitting}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ backgroundColor: "#f59e0b" }}>
                  {waitlistSubmitting ? <><Loader2 size={16} className="animate-spin" /> Joining...</> : "Join Waitlist"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Waitlist Confirmed ──────────────────────────────────────── */}
        {step === "waitlist-confirmed" && selectedEvent && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
              <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5 text-4xl">
                🔔
              </div>
              <h2 className="text-2xl font-bold text-gray-900">You're on the list!</h2>
              <p className="text-gray-500 mt-2 text-sm">
                We'll notify <strong>{waitlistForm.email}</strong> the moment a slot opens for <strong>{selectedEvent.title}</strong>.
              </p>
              {waitlistForm.phone && (
                <p className="text-gray-400 text-xs mt-1">You'll also get an SMS at {waitlistForm.phone}.</p>
              )}
              <button
                onClick={() => { setStep("select-service"); setSelectedEvent(null); }}
                className="w-full mt-6 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ← Back to Services
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
