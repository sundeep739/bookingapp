"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, MapPin, Phone, Globe, Users, Clock,
  ChevronRight, Search, Zap,
} from "lucide-react";
import RoundRobinBooking, { type TeamService } from "./RoundRobinBooking";

const ORG_TYPE_LABELS: Record<string, string> = {
  clinic: "Medical Clinic",
  barbershop: "Barber Shop",
  salon: "Beauty Salon",
  consultancy: "Consultancy",
  general: "Organization",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Manager",
  MEMBER: "Staff",
};

interface Props {
  slug: string;
}

export default function OrgBookingPage({ slug }: Props) {
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<TeamService | null>(null);

  // Services offered by 2+ staff → bookable via round-robin ("any available").
  const teamServices = useMemo<TeamService[]>(() => {
    if (!org?.members) return [];
    const groups = new Map<string, { title: string; durations: number[]; prices: number[]; currency: string; color: string; staff: Set<string> }>();
    for (const m of org.members) {
      for (const et of (m.user.eventTypes ?? [])) {
        const key = et.title.trim().toLowerCase();
        const g = groups.get(key) ?? { title: et.title, durations: [] as number[], prices: [] as number[], currency: et.currency ?? "USD", color: et.color ?? "#4F46E5", staff: new Set<string>() };
        g.durations.push(et.duration);
        g.prices.push(et.price ?? 0);
        g.staff.add(m.user.id);
        groups.set(key, g);
      }
    }
    return [...groups.entries()]
      .filter(([, g]) => g.staff.size >= 2)
      .map(([key, g]) => ({
        title: g.title, key,
        duration: Math.max(...g.durations),
        price: Math.min(...g.prices),
        currency: g.currency, color: g.color,
        staffCount: g.staff.size,
      }));
  }, [org]);

  useEffect(() => {
    fetch(`/api/org/${slug}/public`)
      .then((r) => r.json())
      .then((data) => { setOrg(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse space-y-4 w-full max-w-4xl px-4">
        <div className="h-48 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );

  if (!org || org.error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Building2 className="mx-auto text-gray-300 mb-4" size={64} />
        <h2 className="text-2xl font-bold text-gray-700">Organization not found</h2>
        <p className="text-gray-500 mt-2">The page you're looking for doesn't exist.</p>
      </div>
    </div>
  );

  const filteredMembers = org.members.filter((m: any) => {
    const matchSearch = !search || m.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.title?.toLowerCase().includes(search.toLowerCase());
    const matchDept = selectedDept === "all" || m.deptId === selectedDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            {org.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo} alt={org.name} className="rounded-2xl object-cover flex-shrink-0 w-20 h-20" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Building2 className="text-white" size={36} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{org.name}</h1>
                {org.type && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {ORG_TYPE_LABELS[org.type] || org.type}
                  </span>
                )}
              </div>
              {org.description && <p className="text-gray-600 mt-1 text-sm md:text-base">{org.description}</p>}
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {org.address && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin size={14} />{org.address}
                  </span>
                )}
                {org.phone && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Phone size={14} />{org.phone}
                  </span>
                )}
                {org.website && (
                  <a href={org.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                    <Globe size={14} />{org.website.replace(/https?:\/\//, "")}
                  </a>
                )}
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Users size={14} />{org.members.length} staff
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedService && (
        <RoundRobinBooking slug={slug} service={selectedService} onClose={() => setSelectedService(null)} />
      )}

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Book with any available staff (round-robin) */}
        {teamServices.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-indigo-500" />
              <h2 className="text-base font-semibold text-gray-900">Book with any available staff</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teamServices.map((svc) => (
                <button key={svc.key} onClick={() => setSelectedService(svc)}
                  className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-indigo-200 transition-all group">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: svc.color }} />
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{svc.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={12} />{svc.duration} min</span>
                    <span className="flex items-center gap-1"><Users size={12} />{svc.staffCount} staff</span>
                    {svc.price > 0 && <span className="ml-auto font-semibold text-gray-700">{svc.currency} {svc.price}</span>}
                  </div>
                  <p className="text-xs text-indigo-600 font-medium mt-3 flex items-center gap-1">
                    Fastest availability <ChevronRight size={13} />
                  </p>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 my-7">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or pick a specific staff member</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </div>
        )}

        {/* Department filter + search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {org.departments.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedDept("all")}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${selectedDept === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
              >
                All
              </button>
              {org.departments.map((dept: any) => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDept(dept.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${selectedDept === dept.id ? "text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                  style={selectedDept === dept.id ? { backgroundColor: dept.color } : {}}
                >
                  {dept.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredMembers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No staff found{search ? ` for "${search}"` : ""}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member: any) => (
              <StaffCard
                key={member.id}
                member={member}
                orgSlug={slug}
                onBook={() => {
                  if (member.user.username) router.push(`/${member.user.username}`);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StaffCard({ member, orgSlug, onBook }: { member: any; orgSlug: string; onBook: () => void }) {
  const eventCount = member.user.eventTypes?.length || 0;
  const firstEvent = member.user.eventTypes?.[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-4">
        {member.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.user.image}
            alt={member.user.name || ""}
            className="rounded-xl flex-shrink-0 object-cover w-14 h-14"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-xl"
            style={{ background: "linear-gradient(135deg,#4F46E5,#f97316)" }}>
            {(member.user.name || "?")[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{member.user.name}</h3>
          {member.title && <p className="text-sm text-gray-500 truncate">{member.title}</p>}
          {member.department && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: member.department.color }}>
              {member.department.name}
            </span>
          )}
        </div>
      </div>

      {member.user.bio && (
        <p className="text-sm text-gray-500 mt-3 line-clamp-2">{member.user.bio}</p>
      )}

      {eventCount > 0 && (
        <div className="mt-3 space-y-1.5">
          {member.user.eventTypes.slice(0, 2).map((et: any) => (
            <div key={et.id} className="flex items-center gap-2 text-xs text-gray-500">
              <Clock size={12} />
              <span>{et.title}</span>
              <span className="ml-auto text-gray-400">{et.duration}m</span>
              {et.price > 0 && <span className="text-green-600 font-medium">${et.price}</span>}
            </div>
          ))}
          {eventCount > 2 && <p className="text-xs text-gray-400">+{eventCount - 2} more</p>}
        </div>
      )}

      {member.user.username ? (
        <button
          onClick={onBook}
          className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1 group-hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#4F46E5" }}
        >
          Book Appointment <ChevronRight size={14} />
        </button>
      ) : (
        <div className="mt-4 w-full py-2.5 rounded-xl text-sm text-center text-gray-400 bg-gray-50">
          Not available for booking
        </div>
      )}
    </div>
  );
}
