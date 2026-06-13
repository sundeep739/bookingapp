"use client";
import { useState, useEffect } from "react";
import { Plus, Clock, Link2, Pencil, Trash2, Video, MapPin, Phone, ToggleLeft, ToggleRight, Loader2, X, Save, AlertCircle, HelpCircle, GripVertical } from "lucide-react";

type Question = { id: string; label: string; type: "text" | "textarea" | "select"; required: boolean; options?: string[] };
let _qid = 0;
const qid = () => `q${Date.now()}_${_qid++}`;

type EventType = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  duration: number;
  color: string;
  location: string | null;
  isActive: boolean;
  price: number;
  currency: string;
  _count: { bookings: number };
};

const colorOptions = ["#4F46E5", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const locationOptions = [
  { value: "Google Meet", label: "Google Meet" },
  { value: "Zoom", label: "Zoom" },
  { value: "Phone", label: "Phone call" },
  { value: "In-person", label: "In-person" },
  { value: "", label: "Other / TBD" },
];

function LocationIcon({ loc }: { loc: string | null }) {
  if (!loc) return <Video size={14} />;
  const l = loc.toLowerCase();
  if (l.includes("phone")) return <Phone size={14} />;
  if (l.includes("person")) return <MapPin size={14} />;
  return <Video size={14} />;
}

function EventModal({
  event,
  onClose,
  onSave,
}: {
  event: Partial<EventType> | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const isEdit = !!event?.id;
  const [form, setForm] = useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    duration: String(event?.duration ?? 30),
    color: event?.color ?? "#3b82f6",
    location: event?.location ?? "Google Meet",
    price: String(event?.price ?? 0),
  });
  const [questions, setQuestions] = useState<Question[]>(
    Array.isArray((event as any)?.questions) ? (event as any).questions : []
  );

  const addQuestion = () => setQuestions((q) => [...q, { id: qid(), label: "", type: "text", required: false }]);
  const updateQuestion = (id: string, patch: Partial<Question>) => setQuestions((q) => q.map((x) => x.id === id ? { ...x, ...patch } : x));
  const removeQuestion = (id: string) => setQuestions((q) => q.filter((x) => x.id !== id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      const cleanQuestions = questions
        .filter((q) => q.label.trim())
        .map((q) => ({ ...q, label: q.label.trim(), options: q.type === "select" ? (q.options ?? []).filter(Boolean) : undefined }));
      await onSave({ ...form, questions: cleanQuestions });
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Event Type" : "New Event Type"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X size={18} className="text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. 30 Minute Meeting" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="What's this meeting about?" rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (minutes)</label>
              <select value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                {[15, 20, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
              <select value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                {locationOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Color</label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((c) => (
                <button type="button" key={c} onClick={() => setForm((p) => ({ ...p, color: c }))}
                  className={`w-8 h-8 rounded-full border-4 transition-all ${form.color === c ? "border-gray-900 scale-110" : "border-white shadow"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (0 = free)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
          </div>
          {/* Custom booking questions */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <HelpCircle size={14} className="text-gray-400" /> Booking Questions
              </label>
              <button type="button" onClick={addQuestion} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                <Plus size={13} /> Add question
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Ask invitees for extra info when they book (e.g. "Reason for visit").</p>

            {questions.length === 0 ? (
              <p className="text-xs text-gray-300 italic">No custom questions. Name and email are always collected.</p>
            ) : (
              <div className="space-y-2.5">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                      <input value={q.label} onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                        placeholder="Question label"
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400" />
                      <button type="button" onClick={() => removeQuestion(q.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pl-6 flex-wrap">
                      <select value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as Question["type"] })}
                        className="px-2 py-1 rounded-md border border-gray-200 text-xs focus:outline-none focus:border-indigo-400">
                        <option value="text">Short text</option>
                        <option value="textarea">Long text</option>
                        <option value="select">Dropdown</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-gray-500">
                        <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                          className="rounded accent-indigo-500" />
                        Required
                      </label>
                      {q.type === "select" && (
                        <input value={(q.options ?? []).join(", ")} onChange={(e) => updateQuestion(q.id, { options: e.target.value.split(",").map((s) => s.trim()) })}
                          placeholder="Option 1, Option 2, Option 3"
                          className="flex-1 min-w-[140px] px-2 py-1 rounded-md border border-gray-200 text-xs focus:outline-none focus:border-indigo-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ backgroundColor: "#4F46E5" }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EventTypesList() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);

  const load = () => {
    fetch("/api/event-types").then((r) => r.json()).then(setEvents).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleToggle = async (ev: EventType) => {
    setEvents((prev) => prev.map((e) => e.id === ev.id ? { ...e, isActive: !e.isActive } : e));
    await fetch(`/api/event-types/${ev.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !ev.isActive }),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event type? This cannot be undone.")) return;
    await fetch(`/api/event-types/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSave = async (form: any) => {
    if (editingEvent) {
      const res = await fetch(`/api/event-types/${editingEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      load();
    } else {
      const res = await fetch("/api/event-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      load();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {modalOpen && (
        <EventModal
          event={editingEvent}
          onClose={() => { setModalOpen(false); setEditingEvent(null); }}
          onSave={handleSave}
        />
      )}

      <div className="flex justify-end">
        <button onClick={() => { setEditingEvent(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#4F46E5" }}>
          <Plus size={16} />New Event Type
        </button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No event types yet</h3>
          <p className="text-gray-500 text-sm mb-6">Create your first event type to start accepting bookings.</p>
          <button onClick={() => { setEditingEvent(null); setModalOpen(true); }}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: "#4F46E5" }}>
            Create Event Type
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {events.map((ev) => (
            <div key={ev.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${ev.isActive ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
              <div className="h-1.5 w-full" style={{ backgroundColor: ev.color }} />
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{ev.title}</h3>
                    {ev.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ev.description}</p>}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-sm text-gray-500"><Clock size={14} />{ev.duration} min</span>
                      <span className="flex items-center gap-1 text-sm text-gray-500"><LocationIcon loc={ev.location} />{ev.location || "TBD"}</span>
                      {ev.price > 0 && <span className="text-sm font-semibold text-gray-700">${ev.price}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleToggle(ev)} className="mt-1 flex-shrink-0">
                    {ev.isActive
                      ? <ToggleRight size={28} style={{ color: "#4F46E5" }} />
                      : <ToggleLeft size={28} className="text-gray-300" />}
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Link2 size={13} /><span className="font-mono">/{ev.slug}</span>
                    </div>
                    <span className="text-xs text-gray-400">{ev._count.bookings} bookings</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingEvent(ev); setModalOpen(true); }}
                      className="p-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-700">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(ev.id)}
                      className="p-2 rounded-xl hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add card */}
          <button onClick={() => { setEditingEvent(null); setModalOpen(true); }}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group min-h-[160px]">
            <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
              <Plus size={24} className="text-gray-400 group-hover:text-indigo-500" />
            </div>
            <span className="text-sm font-medium text-gray-500 group-hover:text-indigo-600">Add New Event Type</span>
          </button>
        </div>
      )}
    </div>
  );
}
