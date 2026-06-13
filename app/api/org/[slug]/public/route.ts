import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth needed
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      logo: true,
      description: true,
      website: true,
      phone: true,
      address: true,
      timezone: true,
      departments: {
        select: { id: true, name: true, color: true },
        orderBy: { name: "asc" },
      },
      members: {
        where: { isActive: true },
        select: {
          id: true,
          role: true,
          title: true,
          deptId: true,
          department: { select: { id: true, name: true, color: true } },
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
              eventTypes: {
                where: { isActive: true },
                select: { id: true, title: true, duration: true, price: true, currency: true, color: true, description: true },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(org);
}
