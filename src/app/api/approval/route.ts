import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireUser();
    const requests = await prisma.approvalRequest.findMany({
      where: { userId: user.id, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
