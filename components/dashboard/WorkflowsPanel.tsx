"use client";
import { useEffect, useState } from "react";
import { Plus, Loader2, X, Save, Trash2, Mail, MessageSquare, Clock, AlertCircle, Zap, ToggleLeft, ToggleRight } from "lucide-react";

type Workflow = {
  id: string;
  name: string;
  trigger: "BEFORE" | "AFTER";
  offsetMinutes: number;
  channel: "EMAIL" | "SMS";
  subject: string | null;
  message: string;
  eventTypeId: string | null;
  enabled: boolean;
};
type EventTypeLite = { id: string; title: string };

// Present offsetMinutes as a value + unit.
function splitOffset(min: number): { value: number; unit: "minutes" | "hours" | "days" } {
  if (min % 1440 === 0) return { value: min / 1440, unit: "days" };
  if (min % 60 === 0) return { value: min / 60, unit: "hours" };
  return { value: min, unit: "minutes" };
}
function toMinutes(value: number, unit: string): number {
  return unit === "days" ? value * 1440 : unit === "hours" ? value * 60 : value;
}
function offsetLabel(min: number): string {
  const { value, unit } = splitOffset(min);
  return `${value} ${value === 1 ? unit.slice(0, -1) : unit}`;
}

function WorkflowModal({ workflow, eventTypes, onClose, onSave }: {
  workflow: Partial<Workflow> | null;
  eventTypes: EventTypeLite[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const isEdit = !!workflow?.id;
  const initOffset = splitOffset(workflow?.offsetMinutes ?? 1440);
  const [form, setForm] = useState({
    name: workflow?.name ?? "",
    trigger: (workflow?.trigger ?? "BEFORE") as "BEFORE" | "AFTER",
    offsetValue: String(initOffset.value),
    offsetUnit: initOffset.unit as "minutes" | "hours" | "days",
    channel: (workflow?.channel ?? "EMAIL") as "EMAIL" | "SMS",
    subject: workflow?.subject ?? "",
    message: workflow?.message ?? "Hi {{name}}, this is a reminder about your {{event}} on {{time}} with {{host}}.",
    eventTypeId: workflow?.eventTypeId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required");
    if (!form.message.trim()) return setError("Message is required");
    setSaving(true); setError("");
    try {
      await onSave({
        name: form.name,
        trigger: form.trigger,
        offsetMinutes: toMinutes(parseInt(form.offsetValue) || 0, form.offsetUnit),
        channel: form.channel,
        subject: form.channel === "EMAIL" ? form.subject : null,
        message: form.message,
        eventTypeId: form.eventTypeId || null,
      });
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
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Workflow" : "New Workflow"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X size={18} className="text-gray-500" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. 2-hour reminder" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">When to send</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" value={form.offsetValue} onChange={(e) => setForm((p) => ({ ...p, offsetValue: e.target.value }))}
                className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
              <select value={form.offsetUnit} onChange={(e) => setForm((p) => ({ ...p, offsetUnit: e.target.value as any }))}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
              <select value={form.trigger} onChange={(e) => setForm((p) => ({ ...p, trigger: e.target.value as any }))}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                <option value="BEFORE">before the booking</option>
                <option value="AFTER">after the booking</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Channel</label>
              <select value={form.channel} onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value as any }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Applies to</label>
              <select value={form.eventTypeId} onChange={(e) => setForm((p) => ({ ...p, eventTypeId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                <option value="">All event types</option>
                {eventTypes.map((et) => <option key={et.id} value={et.id}>{et.title}</option>)}
              </select>
            </div>
          </div>

          {form.channel === "EMAIL" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email subject</label>
              <input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Reminder: {{event}}" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
            <textarea value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 resize-none" />
            <p className="text-xs text-gray-400 mt-1.5">Placeholders: <code>{"{{name}}"}</code> <code>{"{{event}}"}</code> <code>{"{{time}}"}</code> <code>{"{{host}}"}</code></p>
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

export default function WorkflowsPanel() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);

  const load = () => {
    Promise.all([
      fetch("/api/workflows").then((r) => r.json()),
      fetch("/api/event-types").then((r) => r.json()),
    ]).then(([wf, et]) => {
      setWorkflows(Array.isArray(wf) ? wf : []);
      setEventTypes(Array.isArray(et) ? et.map((e: any) => ({ id: e.id, title: e.title })) : []);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleToggle = async (wf: Workflow) => {
    setWorkflows((prev) => prev.map((w) => w.id === wf.id ? { ...w, enabled: !w.enabled } : w));
    await fetch(`/api/workflows/${wf.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !wf.enabled }) });
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };
  const handleSave = async (data: any) => {
    const url = editing ? `/api/workflows/${editing.id}` : "/api/workflows";
    const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json()).error);
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-5">
      {modalOpen && <WorkflowModal workflow={editing} eventTypes={eventTypes} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={handleSave} />}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500 max-w-xl">
          Automated email or SMS messages sent around each booking — reminders, follow-ups, thank-yous.
          Built-in 24h &amp; 1h SMS reminders still run; these are additional.
        </p>
        <button onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 flex-shrink-0" style={{ backgroundColor: "#4F46E5" }}>
          <Plus size={16} />New Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4"><Zap size={24} className="text-indigo-500" /></div>
          <h3 className="font-semibold text-gray-900">No workflows yet</h3>
          <p className="text-gray-500 text-sm mt-1 mb-5">Create one to automate reminders and follow-ups.</p>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "#4F46E5" }}>Create Workflow</button>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => (
            <div key={wf.id} className={`bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 ${wf.enabled ? "" : "opacity-60"}`}>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                {wf.channel === "SMS" ? <MessageSquare size={18} className="text-indigo-500" /> : <Mail size={18} className="text-indigo-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{wf.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{wf.channel}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                  <Clock size={12} /> {offsetLabel(wf.offsetMinutes)} {wf.trigger === "BEFORE" ? "before" : "after"} the booking
                  {wf.eventTypeId && <> · {eventTypes.find((e) => e.id === wf.eventTypeId)?.title ?? "specific event"}</>}
                </p>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{wf.message}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleToggle(wf)} title={wf.enabled ? "Disable" : "Enable"}>
                  {wf.enabled ? <ToggleRight size={26} style={{ color: "#4F46E5" }} /> : <ToggleLeft size={26} className="text-gray-300" />}
                </button>
                <button onClick={() => { setEditing(wf); setModalOpen(true); }} className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-colors text-sm font-medium">Edit</button>
                <button onClick={() => handleDelete(wf.id)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
