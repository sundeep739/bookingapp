export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GuidedOnboarding from "@/components/onboarding/GuidedOnboarding";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // If they already finished onboarding (have a username), go to dashboard
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { username: true },
  });
  if (user?.username) redirect("/dashboard");

  return <GuidedOnboarding userName={session.user?.name ?? ""} />;
}
