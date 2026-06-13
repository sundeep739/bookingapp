"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { CalendarCheck, Building2, CheckCircle, XCircle, Loader2 } from "lucide-react";

const ORG_TYPE_LABELS: Record<string, string> = {
  clinic: "Medical Clinic",
  barbershop: "Barber Shop",
  salon: "Beauty Salon",
  consultancy: "Consultancy",
  general: "Organization",
};

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [token, setToken] = useState<string>("");
  const [invite, setInvite] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "accepting" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ token: t }) => {
      setToken(t);
      fetch(`/api/invite/${t}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) { setError(data.error); setState("error"); }
          else { setInvite(data); setState("ready"); }
        })
        .catch(() => { setError("Failed to load invite"); setState("error"); });
    });
  }, [params]);

  const accept = async () => {
    if (!session) { signIn("google", { callbackUrl: `/invite/${token}` }); return; }
    setState("accepting");
    const res = await fetch(`/api/invite/${token}`, { method: "POST" });
    const data = await res.json();
    if (data.error) { setError(data.error); setState("error"); }
    else { setState("success"); setTimeout(() => router.push("/dashboard"), 2000); }
  };

  if (state === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-indigo-500" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#4F46E5" }}>
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">BookEasy</span>
        </div>

        {state === "error" && (
          <div className="space-y-4">
            <XCircle className="mx-auto text-red-500" size={48} />
            <h2 className="text-xl font-bold text-gray-900">Invite Invalid</h2>
            <p className="text-gray-500">{error}</p>
            <button onClick={() => router.push("/")} className="w-full py-3 rounded-xl font-semibold text-white" style={{ backgroundColor: "#4F46E5" }}>
              Go to BookEasy
            </button>
          </div>
        )}

        {state === "success" && (
          <div className="space-y-4">
            <CheckCircle className="mx-auto text-green-500" size={48} />
            <h2 className="text-xl font-bold text-gray-900">You're in! 🎉</h2>
            <p className="text-gray-500">Redirecting to your dashboard...</p>
          </div>
        )}

        {(state === "ready" || state === "accepting") && invite && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto">
              <Building2 className="text-blue-600" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">You're Invited!</h2>
              <p className="text-gray-500">
                Join <strong>{invite.orgName}</strong>
                {invite.orgType && ` · ${ORG_TYPE_LABELS[invite.orgType] || invite.orgType}`}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Organization</span>
                <span className="font-semibold text-gray-900">{invite.orgName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Your role</span>
                <span className="font-semibold text-gray-900 capitalize">{invite.role.toLowerCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Invited email</span>
                <span className="font-semibold text-gray-900">{invite.email}</span>
              </div>
            </div>

            {session && session.user?.email !== invite.email && (
              <p className="text-sm text-red-500">
                You're signed in as <strong>{session.user?.email}</strong> but this invite is for <strong>{invite.email}</strong>.
                Please sign in with the correct account.
              </p>
            )}

            <button
              onClick={accept}
              disabled={state === "accepting"}
              className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: "#4F46E5" }}
            >
              {state === "accepting" ? <><Loader2 className="animate-spin" size={18} /> Accepting...</> :
               session ? "Accept Invitation" : "Sign in with Google to Accept"}
            </button>

            {!session && (
              <p className="text-xs text-gray-400">You'll be redirected back after signing in.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
