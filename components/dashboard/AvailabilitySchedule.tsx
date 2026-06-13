"use client";
import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Loader2, Check } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type DaySchedule = { enabled: boolean; slots: { start: string; end: string }[] };

const defaultSchedule: Record<string, DaySchedule> = {
  Sunday:    { enabled: false, slots: [{ start: "09:00", end: "17:00" }] },
  Monday:    { enabled: true,  slots: [{ start: "09:00", end: "17:00" }] },
  Tuesday:   { enabled: true,  slots: [{ start: "09:00", end: "17:00" }] },
  Wednesday: { enabled: true,  slots: [{ start: "09:00", end: "17:00" }] },
  Thursday:  { enabled: true,  slots: [{ start: "09:00", end: "17:00" }] },
  Friday:    { enabled: true,  slots: [{ start: "09:00", end: "17:00" }] },
  Saturday:  { enabled: false, slots: [{ start: "09:00", end: "17:00" }] },
};

export default function AvailabilitySchedule() {
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load from DB on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/availability").then((r) => r.json()),
      fetch("/api/user/profile").then((r) => r.json()),
    ]).then(([avail, profile]) => {
      if (profile.timezone) setTimezone(profile.timezone);
      if (avail && avail.length > 0) {
        const built: Record<string, DaySchedule> = {};
        DAYS.forEach((day, idx) => {
          const record = avail.find((a: any) => a.dayOfWeek === idx);
          built[day] = record
            ? { enabled: record.isActive, slots: [{ start: record.startTime, end: record.endTime }] }
            : { enabled: false, slots: [{ start: "09:00", end: "17:00" }] };
        });
        setSchedule(built);
      }
    }).finally(() => setLoading(false));
  }, []);

  const toggleDay = (day: string) =>
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }));

  const updateSlot = (day: string, idx: number, field: "start" | "end", value: string) =>
    setSchedule((prev) => {
      const slots = [...prev[day].slots];
      slots[idx] = { ...slots[idx], [field]: value };
      return { ...prev, [day]: { ...prev[day], slots } };
    });

  const addSlot = (day: string) =>
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], slots: [...prev[day].slots, { start: "09:00", end: "17:00" }] } }));

  const removeSlot = (day: string, idx: number) =>
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], slots: prev[day].slots.filter((_, i) => i !== idx) } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Flatten: one record per enabled day (use first slot per day)
      const scheduleArr = DAYS.map((day, idx) => ({
        dayOfWeek: idx,
        isActive: schedule[day].enabled,
        startTime: schedule[day].slots[0]?.start ?? "09:00",
        endTime: schedule[day].slots[0]?.end ?? "17:00",
      }));
      await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: scheduleArr, timezone }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Timezone */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Timezone</h2>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
          <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
          <option value="America/Denver">America/Denver (UTC-7)</option>
          <option value="America/Chicago">America/Chicago (UTC-6)</option>
          <option value="America/New_York">America/New_York (UTC-5)</option>
          <option value="Europe/London">Europe/London (UTC+0)</option>
          <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
          <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
          <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
          <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
          <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
          <option value="Australia/Sydney">Australia/Sydney (UTC+10)</option>
          <option value="UTC">UTC</option>
        </select>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Weekly Availability</h2>
        <div className="space-y-4">
          {DAYS.map((day) => {
            const d = schedule[day];
            return (
              <div key={day} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${d.enabled ? "border-indigo-100 bg-indigo-50/30" : "border-gray-100 bg-gray-50/50"}`}>
                <div className="flex items-center gap-3 w-32 flex-shrink-0 pt-0.5">
                  <button onClick={() => toggleDay(day)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${d.enabled ? "" : "bg-gray-200"}`}
                    style={d.enabled ? { backgroundColor: "#4F46E5" } : {}}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${d.enabled ? "left-5" : "left-1"}`} />
                  </button>
                  <span className={`text-sm font-medium ${d.enabled ? "text-gray-900" : "text-gray-400"}`}>{day.slice(0, 3)}</span>
                </div>
                {d.enabled ? (
                  <div className="flex-1 space-y-2">
                    {d.slots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="time" value={slot.start} onChange={(e) => updateSlot(day, idx, "start", e.target.value)}
                          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                        <span className="text-gray-400 text-sm">to</span>
                        <input type="time" value={slot.end} onChange={(e) => updateSlot(day, idx, "end", e.target.value)}
                          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                        {d.slots.length > 1 && (
                          <button onClick={() => removeSlot(day, idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addSlot(day)} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-1">
                      <Plus size={13} /> Add time slot
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 pt-1">Unavailable</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-70 ${saved ? "bg-green-500" : ""}`}
          style={saved ? {} : { backgroundColor: "#4F46E5" }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Availability"}
        </button>
      </div>
    </div>
  );
}
