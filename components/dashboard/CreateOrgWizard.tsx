"use client";
import { useMemo, useState } from "react";
import { X, ArrowLeft, ArrowRight, Plus, Trash2, Mail, Loader2, Sparkles, Building2, Check } from "lucide-react";
import { BUSINESS_TEMPLATES, getTemplate, type BusinessTemplate } from "@/lib/business-templates";

const DEPT_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];
let _k = 0;
const k = () => `o${_k++}`;

type Dept = { key: string; name: string; color: string };
type Invite = { key: string; email: string };
type Step = "type" | "details" | "departments" | "invites";

// A generic "team" choice for businesses that don't match a preset.
const GENERIC: BusinessTemplate = {
  id: "general", name: "General team", icon: "🏢", category: "General",
  description: "A team or business that doesn't fit the presets.",
  color: "#4F46E5", bg: "#EEF2FF",
  isOrg: true, hasPrices: true, hasDepartments: false, slotInterval: 0, defaultReminderHours: 24,
  availability: { fromDay: 1, toDay: 5, start: "09:00", end: "17:00" }, services: [],
};

export default function CreateOrgWizard({ onClose, onCreate }: { onClose: () => void; onCreate: (org: any) => void }) {
  const orgTemplates = useMemo(() => [...BUSINESS_TEMPLATES.filter((t) => t.isOrg), GENERIC], []);

  const [step, setStep] = useState<Step>("type");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const template = templateId === "general" ? GENERIC : (templateId ? getTemplate(templateId) ?? null : null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [invites, setInvites] = useState<Invite[]>([{ key: k(), email: "" }]);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const autoSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function choose(t: BusinessTemplate) {
    setTemplateId(t.id);
    setDepartments((t.departments ?? []).map((d) => ({ key: k(), name: d.name, color: d.color })));
    setError("");
    setStep("details");
  }

  const steps: Step[] = ["type", "details", "departments", "invites"];
  const idx = steps.indexOf(step);

  function nextFromDetails() {
    if (!name.trim()) return setError("Please enter a name");
    if (!slug.trim()) return setError("Please choose a URL");
    setError("");
    setStep("departments");
  }

  async function create() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), type: templateId, description: description.trim() || undefined }),
      });
      const org = await res.json();
      if (!res.ok) { setError(org.error || "Failed to create"); setCreating(false); return; }

      // Seed departments + invites via existing endpoints (best-effort).
      for (const d of departments.filter((x) => x.name.trim())) {
        await fetch(`/api/org/${org.slug}/departments`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: d.name.trim(), color: d.color }),
        }).catch(() => {});
      }
      for (const inv of invites.filter((x) => x.email.trim())) {
        await fetch(`/api/org/${org.slug}/members`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inv.email.trim(), role: "MEMBER" }),
        }).catch(() => {});
      }
      onCreate(org);
    } catch {
      setError("Network error — please try again");
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-8">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step !== "type" && (
              <button onClick={() => setStep(steps[idx - 1])} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><ArrowLeft size={16} /></button>
            )}
            <h3 className="font-bold text-gray-900">{step === "type" ? "Set up a team" : template?.name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>

        {step !== "type" && (
          <div className="h-1 bg-gray-100"><div className="h-full transition-all" style={{ width: `${(idx / (steps.length - 1)) * 100}%`, backgroundColor: "#4F46E5" }} /></div>
        )}

        <div className="p-5 space-y-4">
          {/* Step 1 — pick a business type */}
          {step === "type" && (
            <>
              <p className="text-sm text-gray-500">Pick the type of business — we'll prefill departments and structure. You can change everything later.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {orgTemplates.map((t) => (
                  <button key={t.id} onClick={() => choose(t)}
                    className="text-left bg-white rounded-2xl border-2 border-gray-100 p-4 hover:shadow-md hover:border-indigo-200 transition-all group flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: t.bg }}>{t.icon}</div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{t.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2 — org details */}
          {step === "details" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business name *</label>
                <input value={name} autoFocus
                  onChange={(e) => { setName(e.target.value); setSlug(autoSlug(e.target.value)); }}
                  placeholder="e.g. City Center Clinic"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Public booking URL *</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-400">
                  <span className="px-3 py-2.5 bg-gray-50 text-sm text-gray-500 border-r border-gray-200 whitespace-nowrap">bookeasy.app/org/</span>
                  <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="city-center" className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  placeholder="What does your business do?"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              </div>
            </>
          )}

          {/* Step 3 — departments */}
          {step === "departments" && (
            <>
              <p className="text-sm text-gray-500">Group staff into departments or specialties. Optional — skip if you don't need them.</p>
              <div className="space-y-2">
                {departments.map((d) => (
                  <div key={d.key} className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {DEPT_COLORS.slice(0, 4).map((c) => (
                        <button key={c} onClick={() => setDepartments((p) => p.map((x) => x.key === d.key ? { ...x, color: c } : x))}
                          className={`w-5 h-5 rounded-full transition-transform ${d.color === c ? "scale-125 ring-2 ring-offset-1 ring-gray-300" : ""}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <input value={d.name} onChange={(e) => setDepartments((p) => p.map((x) => x.key === d.key ? { ...x, name: e.target.value } : x))}
                      placeholder="Department name"
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <button onClick={() => setDepartments((p) => p.filter((x) => x.key !== d.key))} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => setDepartments((p) => [...p, { key: k(), name: "", color: DEPT_COLORS[p.length % DEPT_COLORS.length] }])}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"><Plus size={16} /> Add department</button>
            </>
          )}

          {/* Step 4 — invites */}
          {step === "invites" && (
            <>
              <p className="text-sm text-gray-500">Invite your staff by email. They'll get a link to join and set up their own schedule. Optional — you can do this later.</p>
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div key={inv.key} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input type="email" value={inv.email} onChange={(e) => setInvites((p) => p.map((x) => x.key === inv.key ? { ...x, email: e.target.value } : x))}
                        placeholder="colleague@example.com"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    {invites.length > 1 && (
                      <button onClick={() => setInvites((p) => p.filter((x) => x.key !== inv.key))} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><X size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setInvites((p) => [...p, { key: k(), email: "" }])}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"><Plus size={16} /> Add another</button>
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer actions */}
        {step !== "type" && (
          <div className="flex items-center gap-3 p-5 border-t border-gray-100">
            {step === "departments" || step === "invites" ? (
              <button onClick={() => step === "departments" ? setStep("invites") : create()} disabled={creating}
                className="text-sm font-medium text-gray-500 hover:text-gray-700">Skip</button>
            ) : null}
            <div className="flex-1" />
            {step === "details" && (
              <button onClick={nextFromDetails} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: "#4F46E5" }}>
                Continue <ArrowRight size={15} />
              </button>
            )}
            {step === "departments" && (
              <button onClick={() => setStep("invites")} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: "#4F46E5" }}>
                Continue <ArrowRight size={15} />
              </button>
            )}
            {step === "invites" && (
              <button onClick={create} disabled={creating} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-70" style={{ backgroundColor: "#4F46E5" }}>
                {creating ? <><Loader2 size={15} className="animate-spin" /> Creating...</> : <><Sparkles size={15} /> Create team</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
