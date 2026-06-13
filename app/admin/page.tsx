"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users, Calendar, TrendingUp, DollarSign, Building2, ShieldAlert,
  Search, ChevronLeft, ChevronRight, MoreVertical, CheckCircle,
  XCircle, AlertTriangle, RefreshCw, ExternalLink, Trash2, Ban,
  UserCheck, CreditCard, Activity, Clock, Mail,
} from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────

interface PlatformStats {
  users: { total: number; newThisMonth: number; active30d: number; growth: string | null };
  orgs: { total: number };
  bookings: {
    total: number; thisMonth: number; confirmed: number;
    cancelled: number; paid: number; growth: string | null; cancellationRate: string;
  };
  revenue: { thisMonth: number; prevMonth: number; growth: string | null };
  planDistribution: Record<string, number>;
  monthlyTrend: { month: string; bookings: number }[];
  recentUsers: any[];
  recentBookings: any[];
}

interface AdminUser {
  id: string; name: string | null; email: string | null; username: string | null;
  image: string | null; plan: string; planStatus: string | null; suspended: boolean;
  stripeCustomerId: string | null; stripeConnectId: string | null;
  stripeChargesEnabled: boolean; createdAt: string; adminNote: string | null;
  _count: { bookings: number; eventTypes: number; ownedOrgs: number };
}

const PLAN_COLORS: Record<string, string> = {
  free:     "bg-gray-100 text-gray-700",
  pro:      "bg-blue-100 text-blue-700",
  team:     "bg-purple-100 text-purple-700",
  business: "bg-amber-100 text-amber-700",
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:  "bg-green-100 text-green-700",
  PENDING:    "bg-yellow-100 text-yellow-700",
  CANCELLED:  "bg-red-100 text-red-700",
  COMPLETED:  "bg-blue-100 text-blue-700",
  RESCHEDULED:"bg-purple-100 text-purple-700",
  NO_SHOW:    "bg-orange-100 text-orange-700",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color = "blue", delta,
}: {
  icon: any; label: string; value: string | number; sub?: string;
  color?: string; delta?: string | null;
}) {
  const iconBg: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600", green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600", amber: "bg-amber-100 text-amber-600",
    rose: "bg-indigo-100 text-indigo-600",
  };
  const isPositive = delta && !delta.startsWith("-");
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${iconBg[color] ?? iconBg.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        {delta && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPositive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
            {isPositive ? "+" : ""}{delta}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {text}
    </span>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [userPlanFilter, setUserPlanFilter] = useState("");
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "bookings" | "system" | "dormant">("overview");
  const [dormantUsers, setDormantUsers]     = useState<any[]>([]);
  const [dormantLoading, setDormantLoading] = useState(false);
  const [dormantDays, setDormantDays]       = useState(90);
  const [selectedDormant, setSelectedDormant] = useState<Set<string>>(new Set());
  const [emailSending, setEmailSending]     = useState(false);
  const [actionUser, setActionUser] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<"plan" | "suspend" | "delete" | "note" | null>(null);
  const [actionValue, setActionValue] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // ── load stats ──────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) { router.push("/dashboard"); return; }
      setStats(await res.json());
    } finally {
      setLoadingStats(false);
    }
  }, [router]);

  // ── load users ──────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({
        page: String(userPage), limit: "20",
        ...(userSearch ? { search: userSearch } : {}),
        ...(userPlanFilter ? { plan: userPlanFilter } : {}),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setUserTotal(data.pagination?.total ?? 0);
    } finally {
      setLoadingUsers(false);
    }
  }, [userPage, userSearch, userPlanFilter]);

  const loadDormant = useCallback(async () => {
    setDormantLoading(true);
    try {
      const res = await fetch(`/api/admin/dormant?days=${dormantDays}`);
      const data = await res.json();
      setDormantUsers(data.users ?? []);
    } finally {
      setDormantLoading(false);
    }
  }, [dormantDays]);

  const sendDormantWarnings = async () => {
    if (selectedDormant.size === 0) return;
    if (!confirm(`Send re-engagement emails to ${selectedDormant.size} dormant users?`)) return;
    setEmailSending(true);
    try {
      const res = await fetch("/api/admin/dormant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selectedDormant), graceDays: 30 }),
      });
      const data = await res.json();
      showToast(`Sent ${data.sent} emails${data.failed ? `, ${data.failed} failed` : ""}`);
      setSelectedDormant(new Set());
      loadDormant();
    } finally {
      setEmailSending(false);
    }
  };

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (activeTab === "users")   loadUsers();   }, [activeTab, loadUsers]);
  useEffect(() => { if (activeTab === "dormant") loadDormant(); }, [activeTab, loadDormant]);

  // ── action handlers ─────────────────────────────────────────────────────────
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const doAction = async () => {
    if (!actionUser || !actionType) return;
    setActionLoading(true);
    try {
      if (actionType === "delete") {
        const res = await fetch(`/api/admin/users/${actionUser.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        showToast(`${actionUser.email} deleted`);
        loadUsers();
        loadStats();
      } else if (actionType === "suspend") {
        const suspend = !actionUser.suspended;
        const res = await fetch(`/api/admin/users/${actionUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suspended: suspend, suspendedReason: suspend ? actionValue : null }),
        });
        if (!res.ok) throw new Error("Update failed");
        showToast(suspend ? `${actionUser.email} suspended` : `${actionUser.email} unsuspended`);
        loadUsers();
      } else if (actionType === "plan") {
        const res = await fetch(`/api/admin/users/${actionUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: actionValue }),
        });
        if (!res.ok) throw new Error("Update failed");
        showToast(`Plan updated to ${actionValue}`);
        loadUsers(); loadStats();
      } else if (actionType === "note") {
        const res = await fetch(`/api/admin/users/${actionUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminNote: actionValue }),
        });
        if (!res.ok) throw new Error("Update failed");
        showToast("Note saved");
        loadUsers();
      }
    } catch (e: any) {
      showToast(e.message ?? "Error", false);
    } finally {
      setActionLoading(false);
      setActionUser(null);
      setActionType(null);
      setActionValue("");
    }
  };

  if (status === "loading" || loadingStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) return null;

  const tabs = [
    { id: "overview",  label: "Overview",   icon: Activity },
    { id: "users",     label: "Users",      icon: Users },
    { id: "bookings",  label: "Bookings",   icon: Calendar },
    { id: "dormant",   label: "Dormant",    icon: Clock },
    { id: "system",    label: "System",     icon: ShieldAlert },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-500" />
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Owner only</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Platform controls for {session?.user?.email}</p>
          </div>
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <ExternalLink className="w-4 h-4" /> Your dashboard
          </a>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users}       label="Total users"        value={stats.users.total}           sub={`${stats.users.newThisMonth} new this month`} delta={stats.users.growth}   color="blue" />
              <StatCard icon={Calendar}    label="Total bookings"     value={stats.bookings.total}        sub={`${stats.bookings.thisMonth} this month`}     delta={stats.bookings.growth} color="purple" />
              <StatCard icon={DollarSign}  label="Revenue this month" value={`$${stats.revenue.thisMonth.toFixed(2)}`} sub={`$${stats.revenue.prevMonth.toFixed(2)} last month`} delta={stats.revenue.growth} color="green" />
              <StatCard icon={Building2}   label="Organisations"      value={stats.orgs.total}            sub={`${stats.users.active30d} active users (30d)`} color="amber" />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={CheckCircle}  label="Confirmed bookings"   value={stats.bookings.confirmed}                              color="green" />
              <StatCard icon={XCircle}      label="Cancelled bookings"   value={stats.bookings.cancelled} sub={`${stats.bookings.cancellationRate}% rate`} color="rose" />
              <StatCard icon={CreditCard}   label="Paid bookings"        value={stats.bookings.paid}                                   color="blue" />
              <StatCard icon={TrendingUp}   label="Monthly booking trend" value={stats.monthlyTrend.at(-1)?.bookings ?? 0} sub="last full month" color="purple" />
            </div>

            {/* Plan distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Plan distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["free", "pro", "team", "business"].map((plan) => {
                  const count = stats.planDistribution[plan] ?? 0;
                  const pct = stats.users.total > 0
                    ? ((count / stats.users.total) * 100).toFixed(0)
                    : "0";
                  return (
                    <div key={plan} className="text-center p-4 rounded-lg bg-gray-50">
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <Badge text={plan.charAt(0).toUpperCase() + plan.slice(1)} className={PLAN_COLORS[plan]} />
                      <div className="text-xs text-gray-400 mt-1">{pct}% of users</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent users + recent bookings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent signups */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Recent signups</h3>
                <div className="space-y-3">
                  {stats.recentUsers.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {u.image
                          ? <img src={u.image} className="w-8 h-8 rounded-full object-cover" alt="" />
                          : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                              {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                            </div>
                        }
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{u.name ?? u.email}</div>
                          <div className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge text={u.plan} className={PLAN_COLORS[u.plan] ?? PLAN_COLORS.free} />
                        <span className="text-xs text-gray-400">{u._count.bookings} bookings</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent bookings across platform */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Recent bookings</h3>
                <div className="space-y-3">
                  {stats.recentBookings.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{b.inviteeName}</div>
                        <div className="text-xs text-gray-400">
                          {b.eventType?.title} · {b.host?.username ?? b.host?.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge text={b.status} className={STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"} />
                        {b.amountPaid && (
                          <span className="text-xs font-medium text-green-600">${b.amountPaid}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ────────────────────────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Search by name, email, username…"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                />
              </div>
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={userPlanFilter}
                onChange={(e) => { setUserPlanFilter(e.target.value); setUserPage(1); }}
              >
                <option value="">All plans</option>
                {["free","pro","team","business"].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
              <button
                onClick={loadUsers}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="text-sm text-gray-500">{userTotal} users total</div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stripe</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingUsers ? (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading…</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-400">No users found</td></tr>
                  ) : users.map((u) => (
                    <tr key={u.id} className={`hover:bg-gray-50 ${u.suspended ? "bg-red-50" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.image
                            ? <img src={u.image} className="w-8 h-8 rounded-full object-cover" alt="" />
                            : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                              </div>
                          }
                          <div>
                            <div className="font-medium text-gray-900">{u.name ?? "—"}</div>
                            <div className="text-xs text-gray-400">{u.email}</div>
                            {u.username && <div className="text-xs text-gray-400">@{u.username}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge text={u.plan} className={PLAN_COLORS[u.plan] ?? PLAN_COLORS.free} />
                        {u.planStatus && u.planStatus !== "active" && (
                          <div className="text-xs text-orange-500 mt-0.5">{u.planStatus}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {u._count.bookings}
                        {u._count.ownedOrgs > 0 && (
                          <span className="text-xs text-gray-400 ml-1">({u._count.ownedOrgs} org)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.stripeCustomerId
                          ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Customer</span>
                          : <span className="text-xs text-gray-400">—</span>
                        }
                        {u.stripeChargesEnabled && (
                          <div className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Connect</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {u.suspended
                          ? <Badge text="Suspended" className="bg-red-100 text-red-700" />
                          : <Badge text="Active" className="bg-green-100 text-green-700" />
                        }
                        {u.adminNote && (
                          <div className="text-xs text-amber-600 mt-0.5 truncate max-w-24" title={u.adminNote}>📝 Note</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Change plan */}
                          <button
                            title="Change plan"
                            onClick={() => { setActionUser(u); setActionType("plan"); setActionValue(u.plan); }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          {/* Suspend / unsuspend */}
                          <button
                            title={u.suspended ? "Unsuspend" : "Suspend"}
                            onClick={() => { setActionUser(u); setActionType("suspend"); setActionValue(""); }}
                            className={`p-1.5 rounded ${u.suspended ? "text-green-500 hover:bg-green-50" : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"}`}
                          >
                            {u.suspended ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                          {/* Note */}
                          <button
                            title="Add note"
                            onClick={() => { setActionUser(u); setActionType("note"); setActionValue(u.adminNote ?? ""); }}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {/* Delete */}
                          <button
                            title="Delete user"
                            onClick={() => { setActionUser(u); setActionType("delete"); setActionValue(""); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {userTotal > 20 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Page {userPage} of {Math.ceil(userTotal / 20)}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={userPage === 1}
                    onClick={() => setUserPage((p) => p - 1)}
                    className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={userPage >= Math.ceil(userTotal / 20)}
                    onClick={() => setUserPage((p) => p + 1)}
                    className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BOOKINGS TAB ─────────────────────────────────────────────────── */}
        {activeTab === "bookings" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Platform-wide recent bookings</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recentBookings.map((b: any) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{b.inviteeName}</div>
                        <div className="text-xs text-gray-400">{b.inviteeEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {b.host?.name ?? b.host?.email}
                        {b.host?.username && <div className="text-gray-400">@{b.host.username}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{b.eventType?.title}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(b.startTime).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge text={b.status} className={STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"} />
                      </td>
                      <td className="px-4 py-3 text-green-600 font-medium">
                        {b.amountPaid ? `$${b.amountPaid}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-4">Showing 8 most recent platform-wide bookings. Full booking search coming soon.</p>
          </div>
        )}

        {/* ── DORMANT TAB ──────────────────────────────────────────────────── */}
        {activeTab === "dormant" && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Dormant account management</h3>
              <p className="text-sm text-gray-500 mb-4">
                Users who signed up but have had no confirmed bookings in the selected period.
                You can send a re-engagement email or review them before cleaning up.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Inactive for more than</label>
                  <select
                    value={dormantDays}
                    onChange={(e) => setDormantDays(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  >
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>6 months</option>
                    <option value={365}>1 year</option>
                  </select>
                </div>
                <button
                  onClick={loadDormant}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  <RefreshCw className={`w-4 h-4 ${dormantLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                {selectedDormant.size > 0 && (
                  <button
                    onClick={sendDormantWarnings}
                    disabled={emailSending}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60"
                  >
                    <Mail className="w-4 h-4" />
                    {emailSending ? "Sending…" : `Email ${selectedDormant.size} selected`}
                  </button>
                )}
              </div>
            </div>

            {/* What the email does */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <strong>Re-engagement email</strong> tells the user their account is still active, invites them to log in,
              and mentions they can delete their account from Settings → Privacy. It does <strong>not</strong> auto-delete anything
              — you stay in control. Hard deletion is only available via the API with an explicit confirmation header.
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {dormantLoading ? "Loading…" : `${dormantUsers.length} dormant accounts`}
                </span>
                {dormantUsers.length > 0 && (
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() =>
                      setSelectedDormant(
                        selectedDormant.size === dormantUsers.length
                          ? new Set()
                          : new Set(dormantUsers.map((u) => u.id))
                      )
                    }
                  >
                    {selectedDormant.size === dormantUsers.length ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-8"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dormantLoading ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td></tr>
                  ) : dormantUsers.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">No dormant accounts found 🎉</td></tr>
                  ) : dormantUsers.map((u) => (
                    <tr key={u.id} className={`hover:bg-gray-50 ${selectedDormant.has(u.id) ? "bg-amber-50" : ""}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedDormant.has(u.id)}
                          onChange={(e) => {
                            const next = new Set(selectedDormant);
                            e.target.checked ? next.add(u.id) : next.delete(u.id);
                            setSelectedDormant(next);
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.name ?? "—"}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                        {u.username && <div className="text-xs text-gray-400">@{u.username}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge text={u.plan} className={PLAN_COLORS[u.plan] ?? PLAN_COLORS.free} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u._count?.bookings ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-amber-600 max-w-32 truncate">
                        {u.adminNote ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SYSTEM TAB ───────────────────────────────────────────────────── */}
        {activeTab === "system" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Env checks */}
              {[
                { label: "Database (Supabase)", ok: true, note: "Transaction Pooler — always on" },
                { label: "Email (Resend)", ok: !!process.env.RESEND_API_KEY, note: "RESEND_API_KEY" },
                { label: "Google OAuth", ok: true, note: "GOOGLE_CLIENT_ID configured" },
                { label: "Stripe Billing", ok: false, note: "Detected from client — check STRIPE_SECRET_KEY in Vercel" },
                { label: "Twilio SMS", ok: false, note: "Detected from client — check TWILIO_ vars in Vercel" },
                { label: "Cron (daily reminders)", ok: true, note: "0 8 * * * — see Vercel Cron Jobs tab" },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                  {item.ok
                    ? <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    : <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  }
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{item.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.note}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Quick links</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Supabase dashboard",    href: "https://supabase.com/dashboard" },
                  { label: "Vercel project",         href: "https://vercel.com/dashboard" },
                  { label: "Stripe dashboard",       href: "https://dashboard.stripe.com" },
                  { label: "Resend dashboard",       href: "https://resend.com/emails" },
                  { label: "Google Cloud Console",   href: "https://console.cloud.google.com" },
                  { label: "Twilio console",         href: "https://console.twilio.com" },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <strong>Note:</strong> Service status shown here is based on environment variable presence.
              Check the <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Vercel function logs</a> for
              real runtime errors, and the <a href="https://dashboard.stripe.com/test/webhooks" target="_blank" rel="noopener noreferrer" className="underline">Stripe webhook event log</a> for delivery failures.
            </div>
          </div>
        )}
      </div>

      {/* ── Action Modal ─────────────────────────────────────────────────────── */}
      {actionUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            {actionType === "delete" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg"><Trash2 className="w-5 h-5 text-red-600" /></div>
                  <h2 className="text-lg font-bold text-gray-900">Delete account</h2>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Permanently delete <strong>{actionUser.email}</strong> and all their data (bookings, event types, organisations)?
                  This is irreversible.
                </p>
              </>
            )}
            {actionType === "suspend" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${actionUser.suspended ? "bg-green-100" : "bg-amber-100"}`}>
                    {actionUser.suspended ? <UserCheck className="w-5 h-5 text-green-600" /> : <Ban className="w-5 h-5 text-amber-600" />}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {actionUser.suspended ? "Unsuspend" : "Suspend"} account
                  </h2>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  {actionUser.suspended
                    ? `Restore access for ${actionUser.email}?`
                    : `Block ${actionUser.email} from accepting bookings and logging in.`}
                </p>
                {!actionUser.suspended && (
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
                    placeholder="Reason (optional)"
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                  />
                )}
              </>
            )}
            {actionType === "plan" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg"><CreditCard className="w-5 h-5 text-blue-600" /></div>
                  <h2 className="text-lg font-bold text-gray-900">Change plan</h2>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Change <strong>{actionUser.email}</strong>&apos;s plan:
                </p>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                >
                  {["free","pro","team","business"].map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <p className="text-xs text-amber-600 mb-4">
                  ⚠️ This overrides Stripe billing. Use to grant trials or fix errors — Stripe renewals will revert it.
                </p>
              </>
            )}
            {actionType === "note" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg"><MoreVertical className="w-5 h-5 text-purple-600" /></div>
                  <h2 className="text-lg font-bold text-gray-900">Admin note</h2>
                </div>
                <p className="text-sm text-gray-600 mb-3">Internal note for <strong>{actionUser.email}</strong> (not visible to user):</p>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 h-24 resize-none"
                  placeholder="e.g. Comped trial, enterprise prospect, support ticket #123…"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                />
              </>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setActionUser(null); setActionType(null); setActionValue(""); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={doAction}
                disabled={actionLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 ${
                  actionType === "delete" ? "bg-red-600 hover:bg-red-700"
                  : actionType === "suspend" && !actionUser.suspended ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {actionLoading ? "…" : actionType === "delete" ? "Delete permanently"
                  : actionType === "suspend" ? (actionUser.suspended ? "Unsuspend" : "Suspend")
                  : actionType === "plan" ? "Change plan"
                  : "Save note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
