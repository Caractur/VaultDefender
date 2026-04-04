import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const raw = parseInt(searchParams.get("limit") || "50");
    const limit = Math.min(Number.isNaN(raw) ? 50 : raw, 100);

    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
