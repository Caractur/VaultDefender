import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

const UpdateSchema = z.object({
  status: z.enum(["approved", "denied"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const data = UpdateSchema.parse(body);

    const existing = await prisma.approvalRequest.findFirst({
      where: { id, userId: user.id, status: "pending" },
    });

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: { status: data.status, resolvedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `Approval ${data.status}: ${existing.action}`,
        toolName: existing.toolName,
        repo: existing.repo,
        path: existing.path,
        riskLevel: existing.riskLevel,
        decision: data.status === "approved" ? "allowed" : "blocked",
        reason: `User ${data.status} the approval request`,
        approvalRequired: true,
        approved: data.status === "approved",
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
