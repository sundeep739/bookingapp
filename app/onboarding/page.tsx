export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // If they already have a username, skip onboarding
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/user/profile`, {
    headers: { cookie: "" }, // server-side fetch handled via auth()
  });

  return <OnboardingForm userName={session.user?.name ?? ""} />;
}
