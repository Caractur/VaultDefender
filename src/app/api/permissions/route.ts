import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

const CreatePermissionSchema = z.object({
  repoFullName: z.string().min(1),
  allowedPaths: z.array(z.string()).default([]),
  allowedActions: z.array(z.string()).default([]),
});

export async function GET() {
  try {
    const user = await requireUser();
    const permissions = await prisma.permission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const parsed = permissions.map((p) => {
      let paths: string[] = [];
      let actions: string[] = [];
      try { paths = JSON.parse(p.allowedPaths); } catch { /* corrupted — treat as empty */ }
      try { actions = JSON.parse(p.allowedActions); } catch { /* corrupted — treat as empty */ }
      return { ...p, allowedPaths: paths, allowedActions: actions };
    });

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = CreatePermissionSchema.parse(body);

    const permission = await prisma.permission.upsert({
      where: {
        userId_repoFullName: {
          userId: user.id,
          repoFullName: data.repoFullName,
        },
      },
      update: {
        allowedPaths: JSON.stringify(data.allowedPaths),
        allowedActions: JSON.stringify(data.allowedActions),
        isActive: true,
      },
      create: {
        userId: user.id,
        repoFullName: data.repoFullName,
        allowedPaths: JSON.stringify(data.allowedPaths),
        allowedActions: JSON.stringify(data.allowedActions),
      },
    });

    return NextResponse.json(permission);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.permission.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const PatchPermissionSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  allowedPaths: z.array(z.string()).optional(),
  allowedActions: z.array(z.string()).optional(),
});

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = PatchPermissionSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.allowedPaths !== undefined) updateData.allowedPaths = JSON.stringify(data.allowedPaths);
    if (data.allowedActions !== undefined) updateData.allowedActions = JSON.stringify(data.allowedActions);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.permission.updateMany({
      where: { id: data.id, userId: user.id },
      data: updateData,
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
