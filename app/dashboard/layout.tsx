export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { username: true },
  });
  if (!user?.username) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#f4f6fb" }}>
      <Sidebar />
      {/* pt-16 on mobile gives room for the hamburger button; pt-0 on desktop */}
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
