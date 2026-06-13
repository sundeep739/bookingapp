"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck, Check, Loader2, AlertCircle, ArrowRight, ArrowLeft,
  Stethoscope, Scissors, User as UserIcon, Sparkles, Plus, Trash2,
  Building2, Clock, DollarSign, Mail, X, Briefcase,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
type UseCase = "individual" | "clinic" | "barbershop" | "other";
type Service = { key: string; title: string; duration: number; price: number; color: string; enabled: boolean };
type Dept = { key: string; name: string; color: string; enabled: boolean };
type DayAvail = { dayOfWeek: number; isActive: boolean; startTime: string; endTime: string };
type Invite = { key: string; email: string };

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

let _id = 0;
const uid = () => `k${_id++}`;

// ─── Presets per use case ─────────────────────────────────────────────────────
const PRESETS: Record<UseCase, {
  services: Omit<Service, "key" | "enabled">[];
  departments?: Omit<Dept, "key" | "enabled">[];
  availability: DayAvail[];
}> = {
  individual: {
    services: [
      { title: "15 Minute Meeting", duration: 15, price: 0, color: "#3b82f6" },
      { title: "30 Minute Meeting", duration: 30, price: 0, color: "#10b981" },
      { title: "60 Minute Consultation", duration: 60, price: 0, color: "#8b5cf6" },
    ],
    availability: weekDefault(1, 5, "09:00", "17:00"),
  },
  clinic: {
    departments: [
      { name: "General Practice", color: "#3b82f6" },
      { name: "Dentistry", color: "#10b981" },
      { name: "Pediatrics", color: "#f59e0b" },
      { name: "Cardiology", color: "#ef4444" },
    ],
    services: [
      { title: "New Patient Visit", duration: 30, price: 0, color: "#3b82f6" },
      { title: "Follow-up Appointment", duration: 15, price: 0, color: "#10b981" },
      { title: "Consultation", duration: 45, price: 0, color: "#8b5cf6" },
      { title: "Annual Checkup", duration: 30, price: 0, color: "#f59e0b" },
    ],
    availability: weekDefault(1, 5, "09:00", "17:00"),
  },
  barbershop: {
    services: [
      { title: "Haircut", duration: 30, price: 25, color: "#3b82f6" },
      { title: "Beard Trim", duration: 15, price: 15, color: "#10b981" },
      { title: "Haircut & Beard", duration: 45, price: 35, color: "#8b5cf6" },
      { title: "Hair Color", duration: 90, price: 80, color: "#ec4899" },
      { title: "Kids Cut", duration: 20, price: 18, color: "#f59e0b" },
    ],
    availability: weekDefault(2, 6, "10:00", "19:00"),
  },
  other: {
    services: [
      { title: "30 Minute Appointment", duration: 30, price: 0, color: "#3b82f6" },
    ],
    availability: weekDefault(1, 5, "09:00", "17:00"),
  },
};

function weekDefault(fromDay: number, toDay: number, start: string, end: string): DayAvail[] {
  return Array.from({ length: 7 }, (_, d) => ({
    dayOfWeek: d,
    isActive: d >= fromDay && d <= toDay,
    startTime: start,
    endTime: end,
  }));
}

const USE_CASES: { id: UseCase; icon: any; title: string; desc: string; color: string; bg: string }[] = [
  { id: "individual", icon: UserIcon, title: "Just me", desc: "A personal booking page for meetings or sessions.", color: "#4F46E5", bg: "#EEF2FF" },
  { id: "clinic", icon: Stethoscope, title: "Clinic / Hospital", desc: "Multiple doctors, departments, and appointment types.", color: "#3b82f6", bg: "#eff6ff" },
  { id: "barbershop", icon: Scissors, title: "Barber / Salon", desc: "Staff, services with prices, and shop hours.", color: "#10b981", bg: "#ecfdf5" },
  { id: "other", icon: Briefcase, title: "Something else", desc: "Tutor, coach, trainer, consultant — fully customizable.", color: "#8b5cf6", bg: "#f5f3ff" },
];

const TIMEZONES = [
  "Pacific/Honolulu","America/Anchorage","America/Los_Angeles","America/Denver",
  "America/Chicago","America/New_York","America/Sao_Paulo","Europe/London",
  "Europe/Paris","Europe/Helsinki","Europe/Moscow","Asia/Dubai","Asia/Kolkata",
  "Asia/Bangkok","Asia/Singapore","Asia/Tokyo","Australia/Sydney","Pacific/Auckland","UTC",
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function GuidedOnboarding({ userName }: { userName: string }) {
  const router = useRouter();

  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const defaultUsername = userName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);

  // Shared state
  const [username, setUsername] = useState(defaultUsername);
  const [displayName, setDisplayName] = useState(userName);
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

  // Org
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  // Collections
  const [services, setServices] = useState<Service[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [availability, setAvailability] = useState<DayAvail[]>(weekDefault(1, 5, "09:00", "17:00"));
  const [invites, setInvites] = useState<Invite[]>([{ key: uid(), email: "" }]);

  const isOrg = useCase === "clinic" || useCase === "barbershop";
  const hasPrices = useCase === "barbershop";
  const hasDepartments = useCase === "clinic";

  // Apply presets when a use case is chosen
  function chooseUseCase(uc: UseCase) {
    const preset = PRESETS[uc];
    setUseCase(uc);
    setServices(preset.services.map((s) => ({ ...s, key: uid(), enabled: true })));
    setDepartments((preset.departments ?? []).map((d) => ({ ...d, key: uid(), enabled: true })));
    setAvailability(preset.availability.map((a) => ({ ...a })));
    setError("");
    setStepIdx(1);
  }

  // Build the dynamic list of steps for the chosen use case
  const steps = useMemo(() => {
    if (!useCase) return ["usecase"];
    const s = ["usecase"];
    if (isOrg) s.push("org");
    s.push("profile");
    if (hasDepartments) s.push("departments");
    s.push("services", "availability");
    if (isOrg) s.push("invite");
    s.push("review");
    return s;
  }, [useCase, isOrg, hasDepartments]);

  const currentStep = steps[stepIdx];
  const totalSteps = steps.length;

  function next() { setError(""); setStepIdx((i) => Math.min(i + 1, totalSteps - 1)); }
  function back() { setError(""); setStepIdx((i) => Math.max(i - 1, 0)); }

  // Validation per step
  function validateAndNext() {
    setError("");
    if (currentStep === "org") {
      if (!orgName.trim()) return setError("Please enter your organization name");
      if (!orgSlug.trim()) return setError("Please enter a URL for your organization");
    }
    if (currentStep === "profile") {
      if (!username.trim()) return setError("Please choose a booking link");
      if (!/^[a-z0-9_-]+$/.test(username)) return setError("Only lowercase letters, numbers, hyphens and underscores");
    }
    if (currentStep === "services") {
      if (!services.some((s) => s.enabled && s.title.trim())) return setError("Add at least one service");
    }
    if (currentStep === "availability") {
      if (!availability.some((d) => d.isActive)) return setError("Select at least one working day");
    }
    next();
  }

  async function finish() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        useCase,
        username: username.trim(),
        timezone,
        bio: bio.trim() || undefined,
        org: isOrg ? {
          name: orgName.trim(),
          slug: orgSlug.trim(),
          type: useCase,
          description: bio.trim() || undefined,
        } : undefined,
        departments: hasDepartments
          ? departments.filter((d) => d.enabled && d.name.trim()).map((d) => ({ name: d.name.trim(), color: d.color }))
          : undefined,
        services: services.filter((s) => s.enabled && s.title.trim()).map((s) => ({
          title: s.title.trim(),
          duration: s.duration,
          price: hasPrices ? s.price : 0,
          color: s.color,
        })),
        availability: availability.map((d) => ({
          dayOfWeek: d.dayOfWeek, isActive: d.isActive, startTime: d.startTime, endTime: d.endTime,
        })),
        invites: isOrg ? invites.filter((i) => i.email.trim()).map((i) => ({ email: i.email.trim(), role: "MEMBER" })) : undefined,
      };

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); setSaving(false); return; }
      router.push("/dashboard");
    } catch {
      setError("Network error — please try again");
      setSaving(false);
    }
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f4f6fb" }}>
      {/* Top bar */}
      <header className="px-4 sm:px-8 py-4 flex items-center justify-between border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#4F46E5" }}>
            <CalendarCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">BookEasy</span>
        </div>
        {useCase && (
          <span className="text-xs text-gray-400 font-medium">
            Step {stepIdx + 1} of {totalSteps}
          </span>
        )}
      </header>

      {/* Progress bar */}
      {useCase && (
        <div className="h-1 bg-gray-100">
          <div className="h-full transition-all duration-300" style={{ width: `${((stepIdx + 1) / totalSteps) * 100}%`, backgroundColor: "#4F46E5" }} />
        </div>
      )}

      {/* Body */}
      <main className="flex-1 flex items-start justify-center px-4 py-8 sm:py-12 overflow-y-auto">
        <div className="w-full max-w-2xl">
          {currentStep === "usecase" && <UseCaseStep onChoose={chooseUseCase} />}

          {currentStep === "org" && (
            <OrgStep
              useCase={useCase!}
              orgName={orgName} setOrgName={setOrgName}
              orgSlug={orgSlug} setOrgSlug={setOrgSlug}
            />
          )}

          {currentStep === "profile" && (
            <ProfileStep
              isOrg={isOrg}
              username={username} setUsername={setUsername}
              displayName={displayName} setDisplayName={setDisplayName}
              bio={bio} setBio={setBio}
              timezone={timezone} setTimezone={setTimezone}
            />
          )}

          {currentStep === "departments" && (
            <DepartmentsStep departments={departments} setDepartments={setDepartments} />
          )}

          {currentStep === "services" && (
            <ServicesStep useCase={useCase!} hasPrices={hasPrices} services={services} setServices={setServices} />
          )}

          {currentStep === "availability" && (
            <AvailabilityStep availability={availability} setAvailability={setAvailability} />
          )}

          {currentStep === "invite" && (
            <InviteStep orgName={orgName} invites={invites} setInvites={setInvites} />
          )}

          {currentStep === "review" && (
            <ReviewStep
              useCase={useCase!} isOrg={isOrg} hasPrices={hasPrices} hasDepartments={hasDepartments}
              username={username} orgName={orgName} orgSlug={orgSlug}
              services={services.filter((s) => s.enabled && s.title.trim())}
              departments={departments.filter((d) => d.enabled && d.name.trim())}
              availability={availability} timezone={timezone}
              invites={invites.filter((i) => i.email.trim())}
            />
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* Nav buttons */}
          {currentStep !== "usecase" && (
            <div className="flex items-center gap-3 mt-8">
              <button onClick={back}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-white transition-colors">
                <ArrowLeft size={16} /> Back
              </button>
              {currentStep === "review" ? (
                <button onClick={finish} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-70"
                  style={{ backgroundColor: "#4F46E5" }}>
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Setting up your account...</> : <><Sparkles size={16} /> Finish & Launch</>}
                </button>
              ) : (
                <>
                  {currentStep === "invite" && (
                    <button onClick={next}
                      className="px-5 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                      Skip for now
                    </button>
                  )}
                  <button onClick={validateAndNext}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: "#4F46E5" }}>
                    Continue <ArrowRight size={16} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Step: Use case ───────────────────────────────────────────────────────────
function UseCaseStep({ onChoose }: { onChoose: (uc: UseCase) => void }) {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome to BookEasy! 👋</h1>
        <p className="text-gray-500">Let's set up your bookings. What best describes you?</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {USE_CASES.map((uc) => (
          <button key={uc.id} onClick={() => onChoose(uc.id)}
            className="bg-white rounded-2xl border-2 border-gray-100 p-6 text-left hover:shadow-md hover:border-indigo-200 transition-all group">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: uc.bg }}>
              <uc.icon size={24} style={{ color: uc.color }} />
            </div>
            <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{uc.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{uc.desc}</p>
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-gray-400 mt-6">Don't worry — you can change anything later.</p>
    </div>
  );
}

// ─── Step: Organization ───────────────────────────────────────────────────────
function OrgStep({ useCase, orgName, setOrgName, orgSlug, setOrgSlug }: any) {
  const label = useCase === "clinic" ? "clinic" : "shop";
  return (
    <div>
      <StepHeader
        icon={Building2}
        title={`Tell us about your ${label}`}
        subtitle={`This creates a public page where clients can see all your staff and book with anyone.`}
      />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <Field label={`${useCase === "clinic" ? "Clinic" : "Business"} Name`}>
          <input value={orgName}
            onChange={(e) => { setOrgName(e.target.value); setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")); }}
            placeholder={useCase === "clinic" ? "City Medical Centre" : "Sharp Cuts Barbershop"}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            autoFocus />
        </Field>
        <Field label="Public Page URL">
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400">
            <span className="px-3 py-3 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">bookeasy.app/org/</span>
            <input value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="city-medical"
              className="flex-1 px-3 py-3 text-sm focus:outline-none" />
          </div>
        </Field>
      </div>
    </div>
  );
}

// ─── Step: Profile ────────────────────────────────────────────────────────────
function ProfileStep({ isOrg, username, setUsername, displayName, setDisplayName, bio, setBio, timezone, setTimezone }: any) {
  return (
    <div>
      <StepHeader
        icon={UserIcon}
        title={isOrg ? "Your personal booking link" : "Your booking link"}
        subtitle={isOrg ? "Clients can also book directly with you using this link." : "This is the link you'll share with clients to let them book time with you."}
      />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <Field label="Booking Link">
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400">
            <span className="px-3 py-3 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">bookeasy.app/</span>
            <input value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="yourname" maxLength={30}
              className="flex-1 px-3 py-3 text-sm focus:outline-none" autoFocus />
          </div>
        </Field>
        <Field label="Display Name">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Dr. Jane Smith"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
        </Field>
        <Field label="Short Bio (optional)">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2}
            placeholder="A line or two about you or your services..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
        </Field>
        <Field label="Timezone">
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
            {!TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
          </select>
        </Field>
      </div>
    </div>
  );
}

// ─── Step: Departments ────────────────────────────────────────────────────────
function DepartmentsStep({ departments, setDepartments }: { departments: Dept[]; setDepartments: (d: Dept[]) => void }) {
  const add = () => setDepartments([...departments, { key: uid(), name: "", color: COLORS[departments.length % COLORS.length], enabled: true }]);
  const update = (key: string, patch: Partial<Dept>) => setDepartments(departments.map((d) => d.key === key ? { ...d, ...patch } : d));
  const remove = (key: string) => setDepartments(departments.filter((d) => d.key !== key));

  return (
    <div>
      <StepHeader icon={Building2} title="Set up your departments"
        subtitle="Group your doctors by specialty. We've suggested a few — keep, edit, or remove them." />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
        {departments.map((d) => (
          <div key={d.key} className="flex items-center gap-3">
            <div className="flex gap-1">
              {COLORS.slice(0, 4).map((c) => (
                <button key={c} onClick={() => update(d.key, { color: c })}
                  className={`w-5 h-5 rounded-full transition-transform ${d.color === c ? "scale-125 ring-2 ring-offset-1 ring-gray-300" : ""}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <input value={d.name} onChange={(e) => update(d.key, { name: e.target.value })}
              placeholder="Department name"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <button onClick={() => remove(d.key)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button onClick={add} className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2">
          <Plus size={16} /> Add department
        </button>
      </div>
    </div>
  );
}

// ─── Step: Services ───────────────────────────────────────────────────────────
function ServicesStep({ useCase, hasPrices, services, setServices }: { useCase: UseCase; hasPrices: boolean; services: Service[]; setServices: (s: Service[]) => void }) {
  const noun = useCase === "clinic" ? "appointment type" : useCase === "barbershop" ? "service" : "meeting type";
  const add = () => setServices([...services, { key: uid(), title: "", duration: 30, price: 0, color: COLORS[services.length % COLORS.length], enabled: true }]);
  const update = (key: string, patch: Partial<Service>) => setServices(services.map((s) => s.key === key ? { ...s, ...patch } : s));
  const remove = (key: string) => setServices(services.filter((s) => s.key !== key));

  return (
    <div>
      <StepHeader icon={CalendarCheck} title={`What can people book?`}
        subtitle={`These are your ${noun}s. We've pre-filled common ones — customize freely.`} />
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-3">
        {services.map((s) => (
          <div key={s.key} className={`rounded-xl border p-3 transition-colors ${s.enabled ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-60"}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => update(s.key, { enabled: !s.enabled })}
                className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-colors ${s.enabled ? "border-transparent text-white" : "border-gray-300"}`}
                style={s.enabled ? { backgroundColor: s.color } : {}}>
                {s.enabled && <Check size={12} />}
              </button>
              <input value={s.title} onChange={(e) => update(s.key, { title: e.target.value })}
                placeholder="Service name"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
              <button onClick={() => remove(s.key)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2 pl-8">
              <label className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock size={13} />
                <input type="number" value={s.duration} min={5} step={5}
                  onChange={(e) => update(s.key, { duration: parseInt(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 rounded-md border border-gray-200 text-sm focus:outline-none focus:border-indigo-400" />
                min
              </label>
              {hasPrices && (
                <label className="flex items-center gap-1 text-xs text-gray-500 ml-2">
                  <DollarSign size={13} />
                  <input type="number" value={s.price} min={0}
                    onChange={(e) => update(s.key, { price: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-2 py-1 rounded-md border border-gray-200 text-sm focus:outline-none focus:border-indigo-400" />
                </label>
              )}
            </div>
          </div>
        ))}
        <button onClick={add} className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-1">
          <Plus size={16} /> Add another
        </button>
      </div>
    </div>
  );
}

// ─── Step: Availability ───────────────────────────────────────────────────────
function AvailabilityStep({ availability, setAvailability }: { availability: DayAvail[]; setAvailability: (a: DayAvail[]) => void }) {
  const update = (day: number, patch: Partial<DayAvail>) =>
    setAvailability(availability.map((d) => d.dayOfWeek === day ? { ...d, ...patch } : d));

  return (
    <div>
      <StepHeader icon={Clock} title="When are you available?"
        subtitle="Set your working hours. Clients can only book during these times." />
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-2">
        {availability.map((d) => (
          <div key={d.dayOfWeek} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${d.isActive ? "" : "opacity-50"}`}>
            <button onClick={() => update(d.dayOfWeek, { isActive: !d.isActive })}
              className={`w-10 h-6 rounded-full flex items-center transition-colors flex-shrink-0 ${d.isActive ? "justify-end" : "justify-start bg-gray-200"}`}
              style={d.isActive ? { backgroundColor: "#4F46E5" } : {}}>
              <span className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5" />
            </button>
            <span className="w-20 sm:w-24 text-sm font-medium text-gray-700 flex-shrink-0">
              <span className="hidden sm:inline">{DAY_NAMES[d.dayOfWeek]}</span>
              <span className="sm:hidden">{DAY_SHORT[d.dayOfWeek]}</span>
            </span>
            {d.isActive ? (
              <div className="flex items-center gap-2 flex-1">
                <input type="time" value={d.startTime} onChange={(e) => update(d.dayOfWeek, { startTime: e.target.value })}
                  className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400" />
                <span className="text-gray-400 text-sm">to</span>
                <input type="time" value={d.endTime} onChange={(e) => update(d.dayOfWeek, { endTime: e.target.value })}
                  className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
            ) : (
              <span className="text-sm text-gray-400 flex-1">Unavailable</span>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => {
          const monday = availability.find((d) => d.dayOfWeek === 1);
          if (monday) setAvailability(availability.map((d) => d.isActive ? { ...d, startTime: monday.startTime, endTime: monday.endTime } : d));
        }}
        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-3">
        Apply Monday's hours to all active days
      </button>
    </div>
  );
}

// ─── Step: Invite ─────────────────────────────────────────────────────────────
function InviteStep({ orgName, invites, setInvites }: { orgName: string; invites: Invite[]; setInvites: (i: Invite[]) => void }) {
  const add = () => setInvites([...invites, { key: uid(), email: "" }]);
  const update = (key: string, email: string) => setInvites(invites.map((i) => i.key === key ? { ...i, email } : i));
  const remove = (key: string) => setInvites(invites.filter((i) => i.key !== key));

  return (
    <div>
      <StepHeader icon={Mail} title="Invite your team"
        subtitle={`Add the people who work at ${orgName || "your business"}. They'll get an email to join and set up their own schedule. You can always do this later.`} />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
        {invites.map((inv) => (
          <div key={inv.key} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="email" value={inv.email} onChange={(e) => update(inv.key, e.target.value)}
                placeholder="colleague@example.com"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
            {invites.length > 1 && (
              <button onClick={() => remove(inv.key)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button onClick={add} className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-1">
          <Plus size={16} /> Add another
        </button>
      </div>
    </div>
  );
}

// ─── Step: Review ─────────────────────────────────────────────────────────────
function ReviewStep({ useCase, isOrg, hasPrices, hasDepartments, username, orgName, orgSlug, services, departments, availability, timezone, invites }: any) {
  const activeDays = availability.filter((d: DayAvail) => d.isActive);
  return (
    <div>
      <StepHeader icon={Sparkles} title="You're all set! 🎉"
        subtitle="Here's a summary of your setup. Click finish to launch your booking system." />
      <div className="space-y-3">
        {isOrg && (
          <ReviewCard icon={Building2} title={useCase === "clinic" ? "Clinic" : "Business"}>
            <p className="font-semibold text-gray-900">{orgName}</p>
            <p className="text-sm text-gray-500">bookeasy.app/org/{orgSlug}</p>
          </ReviewCard>
        )}
        <ReviewCard icon={UserIcon} title="Your booking link">
          <p className="text-sm text-gray-700">bookeasy.app/<span className="font-semibold">{username}</span></p>
          <p className="text-xs text-gray-400 mt-0.5">{timezone.replace(/_/g, " ")}</p>
        </ReviewCard>
        {hasDepartments && departments.length > 0 && (
          <ReviewCard icon={Building2} title={`${departments.length} departments`}>
            <div className="flex flex-wrap gap-1.5">
              {departments.map((d: Dept) => (
                <span key={d.key} className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: d.color }}>{d.name}</span>
              ))}
            </div>
          </ReviewCard>
        )}
        <ReviewCard icon={CalendarCheck} title={`${services.length} bookable ${services.length === 1 ? "service" : "services"}`}>
          <div className="space-y-1">
            {services.map((s: Service) => (
              <div key={s.key} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="flex-1">{s.title}</span>
                <span className="text-gray-400">{s.duration}m{hasPrices && s.price > 0 ? ` · $${s.price}` : ""}</span>
              </div>
            ))}
          </div>
        </ReviewCard>
        <ReviewCard icon={Clock} title="Working hours">
          <div className="flex flex-wrap gap-1.5">
            {activeDays.map((d: DayAvail) => (
              <span key={d.dayOfWeek} className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                {DAY_SHORT[d.dayOfWeek]} {d.startTime}–{d.endTime}
              </span>
            ))}
          </div>
        </ReviewCard>
        {isOrg && invites.length > 0 && (
          <ReviewCard icon={Mail} title={`${invites.length} team ${invites.length === 1 ? "invite" : "invites"}`}>
            <div className="flex flex-wrap gap-1.5">
              {invites.map((i: Invite) => (
                <span key={i.key} className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">{i.email}</span>
              ))}
            </div>
          </ReviewCard>
        )}
      </div>
    </div>
  );
}

// ─── Shared UI bits ───────────────────────────────────────────────────────────
function StepHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "#EEF2FF" }}>
        <Icon size={22} style={{ color: "#4F46E5" }} />
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-gray-500 text-sm mt-1.5">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ReviewCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{title}</p>
        {children}
      </div>
    </div>
  );
}
