import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/users?search=&plan=&page=&limit=
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const search  = searchParams.get("search") ?? "";
  const plan    = searchParams.get("plan") ?? "";
  const page    = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit   = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const skip    = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { email:    { contains: search, mode: "insensitive" } },
      { name:     { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
    ];
  }
  if (plan) where.plan = plan;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        plan: true,
        planStatus: true,
        planRenewsAt: true,
        stripeCustomerId: true,
        stripeConnectId: true,
        stripeChargesEnabled: true,
        createdAt: true,
        updatedAt: true,
        suspended: true,
        _count: {
          select: {
            bookings: true,
            eventTypes: true,
            ownedOrgs: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
