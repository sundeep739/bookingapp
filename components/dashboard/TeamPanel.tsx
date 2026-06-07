"use client";
import { useEffect, useState } from "react";
import ImageUpload from "@/components/shared/ImageUpload";
import {
  Plus, Building2, Users, Trash2, Mail, Settings, ExternalLink,
  ChevronDown, ChevronRight, CheckCircle, Loader2, Edit2, X,
  BarChart2, Calendar, Crown, Shield, User as UserIcon,
} from "lucide-react";

const ORG_TYPES = [
  { value: "general", label: "General / Other" },
  { value: "clinic", label: "Medical Clinic / Hospital" },
  { value: "barbershop", label: "Barber Shop" },
  { value: "salon", label: "Beauty Salon / Spa" },
  { value: "consultancy", label: "Consultancy / Agency" },
  { value: "fitness", label: "Gym / Fitness Studio" },
  { value: "education", label: "Tutoring / Education" },
];

const ROLE_ICONS: Record<string, any> = { OWNER: Crown, ADMIN: Shield, MEMBER: UserIcon };
const ROLE_COLORS: Record<string, string> = { OWNER: "text-yellow-600 bg-yellow-50", ADMIN: "text-blue-600 bg-blue-50", MEMBER: "text-gray-600 bg-gray-100" };

const DEPT_COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16"];

export default function TeamPanel() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeOrg, setActiveOrg] = useState<string | null>(null);
  const [orgDetail, setOrgDetail] = useState<any>(null);
  const [orgStats, setOrgStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"members" | "departments" | "bookings" | "settings">("members");

  useEffect(() => {
    fetch("/api/org").then((r) => r.json()).then((data) => {
      setOrgs(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadOrg = async (slug: string) => {
    setActiveOrg(slug);
    setOrgDetail(null);
    setOrgStats(null);
    const [detail, stats] = await Promise.all([
      fetch(`/api/org/${slug}`).then((r) => r.json()),
      fetch(`/api/org/${slug}/stats`).then((r) => r.json()),
    ]);
    setOrgDetail(detail);
    setOrgStats(stats);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-pink-500" size={32} />
    </div>
  );

  if (activeOrg && orgDetail) return (
    <OrgDetail
      org={orgDetail}
      stats={orgStats}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onBack={() => { setActiveOrg(null); setOrgDetail(null); }}
      onRefresh={() => loadOrg(activeOrg)}
    />
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Teams & Organizations</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage your clinics, shops, and teams</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ backgroundColor: "#e53e6d" }}
        >
          <Plus size={16} /> New Organization
        </button>
      </div>

      {/* Empty state */}
      {orgs.length === 0 && !showCreate && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <Building2 className="mx-auto text-gray-300 mb-4" size={56} />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No organizations yet</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Create an organization for your clinic, barber shop, or any team-based business.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-2.5 rounded-xl text-white font-semibold"
            style={{ backgroundColor: "#e53e6d" }}
          >
            Create Organization
          </button>
        </div>
      )}

      {/* Org cards */}
      {orgs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orgs.map((org: any) => (
            <OrgCard key={org.id} org={org} onClick={() => loadOrg(org.slug)} />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateOrgModal
          onClose={() => setShowCreate(false)}
          onCreate={(org) => {
            setOrgs((prev) => [...prev, org]);
            setShowCreate(false);
            loadOrg(org.slug);
          }}
        />
      )}
    </div>
  );
}

function OrgCard({ org, onClick }: { org: any; onClick: () => void }) {
  const typeLabel = ORG_TYPES.find((t) => t.value === org.type)?.label || org.type;
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md transition-shadow group w-full"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Building2 className="text-white" size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{org.name}</h3>
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 capitalize whitespace-nowrap">{org.role?.toLowerCase()}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{typeLabel}</p>
          <p className="text-sm text-gray-500 mt-0.5">bookingapp.com/org/{org.slug}</p>
        </div>
        <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 flex-shrink-0 mt-1 transition-colors" />
      </div>
      <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
        <span className="flex items-center gap-1"><Users size={14} />{org.memberCount || 0} members</span>
        <span className="flex items-center gap-1"><Calendar size={14} />{org.bookingCount || 0} bookings</span>
      </div>
    </button>
  );
}

function OrgDetail({ org, stats, activeTab, setActiveTab, onBack, onRefresh }: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const orgUrl = `${appUrl}/org/${org.slug}`;

  const tabs = [
    { id: "members", label: "Staff", icon: Users },
    { id: "departments", label: "Departments", icon: Building2 },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          ← All Organizations
        </button>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Building2 className="text-white" size={26} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{org.name}</h2>
                {org.description && <p className="text-sm text-gray-500 mt-0.5">{org.description}</p>}
                <a href={orgUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-pink-500 hover:underline mt-1">
                  <ExternalLink size={12} /> {orgUrl}
                </a>
              </div>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                { label: "Total Bookings", value: stats.total },
                { label: "This Week", value: stats.thisWeek },
                { label: "Upcoming", value: stats.upcoming },
                { label: "Staff Members", value: stats.staffCount },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{s.value ?? "—"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {activeTab === "members" && <MembersTab org={org} onRefresh={onRefresh} />}
      {activeTab === "departments" && <DepartmentsTab org={org} onRefresh={onRefresh} />}
      {activeTab === "bookings" && <OrgBookingsTab slug={org.slug} members={org.members} />}
      {activeTab === "settings" && <OrgSettingsTab org={org} onRefresh={onRefresh} onDeleted={onBack} />}
    </div>
  );
}

// ─── Members Tab ─────────────────────────────────────────────────────────────

function MembersTab({ org, onRefresh }: { org: any; onRefresh: () => void }) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    await fetch(`/api/org/${org.slug}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    setInviting(false);
    setInviteSuccess(true);
    setInviteEmail("");
    setTimeout(() => setInviteSuccess(false), 3000);
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("Remove this member from the organization?")) return;
    setRemovingId(memberId);
    await fetch(`/api/org/${org.slug}/members/${memberId}`, { method: "DELETE" });
    setRemovingId(null);
    onRefresh();
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ role: string; title: string; deptId: string }>({ role: "MEMBER", title: "", deptId: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (m: any) => {
    setEditingId(m.id);
    setEditForm({ role: m.role, title: m.title ?? "", deptId: m.deptId ?? "" });
  };

  const saveEdit = async (memberId: string) => {
    setSavingEdit(true);
    await fetch(`/api/org/${org.slug}/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editForm.role, title: editForm.title || null, deptId: editForm.deptId || null }),
    });
    setSavingEdit(false);
    setEditingId(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Invite */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Staff Members ({org.members?.length || 0})</h3>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: "#e53e6d" }}
          >
            <Mail size={14} /> Invite Staff
          </button>
        </div>

        {showInvite && (
          <div className="bg-pink-50 rounded-xl p-4 mb-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Send email invitation</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={sendInvite}
                disabled={inviting || !inviteEmail}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: "#e53e6d" }}
              >
                {inviting ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {inviting ? "Sending..." : "Send Invite"}
              </button>
              {inviteSuccess && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle size={14} /> Invite sent!</span>}
            </div>
          </div>
        )}

        {/* Members list */}
        <div className="divide-y divide-gray-50">
          {org.members?.map((member: any) => {
            const RoleIcon = ROLE_ICONS[member.role] || UserIcon;
            const isEditing = editingId === member.id;
            return (
              <div key={member.id} className="py-3">
                <div className="flex items-center gap-3">
                  {member.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.user.image} alt="" className="rounded-xl flex-shrink-0 w-10 h-10 object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm"
                      style={{ background: "linear-gradient(135deg,#e53e6d,#f97316)" }}>
                      {(member.user.name || "?")[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{member.user.name}</p>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                        <RoleIcon size={10} />{member.role.toLowerCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{member.user.email}</p>
                    {member.title && <p className="text-xs text-gray-500">{member.title}</p>}
                    {member.department && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs text-white" style={{ backgroundColor: member.department.color }}>
                        {member.department.name}
                      </span>
                    )}
                  </div>
                  {member.user.username && (
                    <a href={`/${member.user.username}`} target="_blank" rel="noreferrer"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {member.role !== "OWNER" && (
                    <>
                      <button
                        onClick={() => (isEditing ? setEditingId(null) : startEdit(member))}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => removeMember(member.id)}
                        disabled={removingId === member.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        {removingId === member.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </>
                  )}
                </div>

                {/* Inline editor */}
                {isEditing && (
                  <div className="mt-3 bg-gray-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                      <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-pink-400">
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                      <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="e.g. Senior Stylist"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-pink-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                      <select value={editForm.deptId} onChange={(e) => setEditForm({ ...editForm, deptId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-pink-400">
                        <option value="">None</option>
                        {(org.departments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <button onClick={() => saveEdit(member.id)} disabled={savingEdit}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: "#e53e6d" }}>
                        {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Save
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-white">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Departments Tab ──────────────────────────────────────────────────────────

function DepartmentsTab({ org, onRefresh }: { org: any; onRefresh: () => void }) {
  const [departments, setDepartments] = useState<any[]>(org.departments || []);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEPT_COLORS[0]);
  const [adding, setAdding] = useState(false);

  const addDept = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/org/${org.slug}/departments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    const dept = await res.json();
    setDepartments((prev) => [...prev, dept]);
    setNewName("");
    setAdding(false);
    onRefresh();
  };

  const deleteDept = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    await fetch(`/api/org/${org.slug}/departments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">Departments / Specialties</h3>
      <p className="text-sm text-gray-500">Group your staff into departments (e.g. General Practice, Dental, Cardiology).</p>

      {/* Add form */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addDept()}
          placeholder="Department name..."
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
        <div className="flex gap-1">
          {DEPT_COLORS.map((c) => (
            <button key={c} onClick={() => setNewColor(c)}
              className={`w-7 h-7 rounded-lg transition-transform ${newColor === c ? "scale-110 ring-2 ring-offset-1 ring-gray-400" : ""}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <button onClick={addDept} disabled={adding || !newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: "#e53e6d" }}>
          <Plus size={14} /> Add
        </button>
      </div>

      {/* List */}
      {departments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No departments yet. Add your first one above.</p>
      ) : (
        <div className="space-y-2">
          {departments.map((dept: any) => (
            <div key={dept.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }} />
              <span className="flex-1 text-sm font-medium text-gray-900">{dept.name}</span>
              {dept._count?.members !== undefined && (
                <span className="text-xs text-gray-400">{dept._count.members} members</span>
              )}
              <button onClick={() => deleteDept(dept.id)}
                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bookings Tab ─────────────────────────────────────────────────────────────

function OrgBookingsTab({ slug, members }: { slug: string; members: any[] }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffFilter, setStaffFilter] = useState("all");

  useEffect(() => {
    const url = staffFilter !== "all" ? `/api/org/${slug}/bookings?staffId=${staffFilter}` : `/api/org/${slug}/bookings`;
    fetch(url).then((r) => r.json()).then((data) => {
      setBookings(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, [slug, staffFilter]);

  const STATUS_COLORS: Record<string, string> = {
    CONFIRMED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    CANCELLED: "bg-red-100 text-red-700",
    COMPLETED: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900">All Bookings ({bookings.length})</h3>
        <select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
        >
          <option value="all">All Staff</option>
          {members.map((m: any) => (
            <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-pink-400" size={24} /></div>
      ) : bookings.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">No bookings yet.</p>
      ) : (
        <div className="space-y-2">
          {bookings.map((b: any) => (
            <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{b.inviteeName}</p>
                <p className="text-xs text-gray-500">{b.eventType?.title} with {b.host?.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-600">{new Date(b.startTime).toLocaleDateString()}</p>
                <p className="text-xs text-gray-400">{new Date(b.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-600"}`}>
                {b.status.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function OrgSettingsTab({ org, onRefresh, onDeleted }: { org: any; onRefresh: () => void; onDeleted: () => void }) {
  const [form, setForm] = useState({
    name: org.name || "",
    description: org.description || "",
    type: org.type || "general",
    website: org.website || "",
    phone: org.phone || "",
    address: org.address || "",
    timezone: org.timezone || "UTC",
    logo: org.logo || null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/org/${org.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onRefresh();
  };

  const [deleting, setDeleting] = useState(false);

  const deleteOrg = async () => {
    if (!confirm(`Delete "${org.name}"? This permanently removes the organization, its departments and team memberships. Bookings are kept. This cannot be undone.`)) return;
    if (!confirm("Are you absolutely sure? This is permanent.")) return;
    setDeleting(true);
    const res = await fetch(`/api/org/${org.slug}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) onDeleted();
    else alert((await res.json()).error ?? "Could not delete organization");
  };

  return (
    <div className="space-y-4">
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">Organization Settings</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
        <ImageUpload
          value={form.logo}
          onChange={(img) => setForm({ ...form, logo: img })}
          fallback={
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Building2 className="text-white" size={28} />
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
            {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 555 000 0000"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="123 Main St, City"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
          style={{ backgroundColor: "#e53e6d" }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle size={14} /> Saved!</span>}
      </div>

      {/* Booking page link */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Public Booking Page</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <span className="text-sm text-gray-600 flex-1 truncate">
            {typeof window !== "undefined" ? window.location.origin : ""}/org/{org.slug}
          </span>
          <a
            href={`/org/${org.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-pink-500 hover:underline whitespace-nowrap"
          >
            <ExternalLink size={12} /> Open
          </a>
        </div>
      </div>
    </div>

    {/* Danger zone */}
    <div className="bg-white rounded-2xl border-2 border-red-100 p-5">
      <h3 className="font-semibold text-red-600">Danger zone</h3>
      <p className="text-sm text-gray-500 mt-1 mb-4">
        Deleting this organization removes its departments and team memberships. Individual staff accounts and past bookings are kept.
      </p>
      <button onClick={deleteOrg} disabled={deleting}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60">
        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        {deleting ? "Deleting…" : "Delete organization"}
      </button>
    </div>
    </div>
  );
}

// ─── Create Org Modal ─────────────────────────────────────────────────────────

function CreateOrgModal({ onClose, onCreate }: { onClose: () => void; onCreate: (org: any) => void }) {
  const [form, setForm] = useState({ name: "", slug: "", type: "general", description: "", timezone: "UTC" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const create = async () => {
    if (!form.name || !form.slug) { setError("Name and URL are required"); return; }
    setCreating(true);
    setError("");
    const res = await fetch("/api/org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to create"); setCreating(false); return; }
    onCreate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Create Organization</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) })}
              placeholder="City Medical Clinic"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking URL *</label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-pink-400">
              <span className="px-3 py-2.5 bg-gray-50 text-sm text-gray-500 border-r border-gray-200">bookingapp.com/org/</span>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="city-clinic"
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
              {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} placeholder="What does your organization do?"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex items-center gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={create} disabled={creating}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: "#e53e6d" }}>
            {creating ? "Creating..." : "Create Organization"}
          </button>
        </div>
      </div>
    </div>
  );
}
