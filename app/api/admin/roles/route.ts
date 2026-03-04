import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session-utils";

export async function GET() {
    const ctx = await getSessionContext();
    if (!ctx || !ctx.hasPermission("admin.roles")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roles = await prisma.role.findMany({
        orderBy: { name: "asc" },
        include: {
            permissions: { include: { permission: true } },
            _count: { select: { users: true } },
        },
    });

    return NextResponse.json(roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        userCount: r._count.users,
        permissions: r.permissions.map((rp) => rp.permission.key),
    })));
}

export async function POST(req: Request) {
    const ctx = await getSessionContext();
    if (!ctx || !ctx.hasPermission("admin.roles")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, permissions } = body as {
        name: string;
        description?: string;
        permissions: string[];
    };

    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    // Create role
    const role = await prisma.role.create({
        data: { name, description: description ?? undefined },
    });

    // Assign permissions
    const perms = await prisma.permission.findMany({
        where: { key: { in: permissions } },
    });

    for (const perm of perms) {
        await prisma.rolePermission.create({
            data: { roleId: role.id, permissionId: perm.id },
        });
    }

    return NextResponse.json({ id: role.id, name: role.name }, { status: 201 });
}
