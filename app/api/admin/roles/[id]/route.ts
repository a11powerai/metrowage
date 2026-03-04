import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session-utils";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const ctx = await getSessionContext();
    if (!ctx || !ctx.hasPermission("admin.roles")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, permissions } = body as {
        name?: string;
        description?: string;
        permissions?: string[];
    };

    const role = await prisma.role.findUnique({ where: { id: Number(id) } });
    if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Update role name/description
    await prisma.role.update({
        where: { id: role.id },
        data: {
            name: name ?? role.name,
            description: description !== undefined ? description : role.description,
        },
    });

    // Update permissions if provided
    if (permissions) {
        // Remove all existing permissions for this role
        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

        // Assign new permissions
        const perms = await prisma.permission.findMany({
            where: { key: { in: permissions } },
        });

        for (const perm of perms) {
            await prisma.rolePermission.create({
                data: { roleId: role.id, permissionId: perm.id },
            });
        }
    }

    return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const ctx = await getSessionContext();
    if (!ctx || !ctx.hasPermission("admin.roles")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const role = await prisma.role.findUnique({ where: { id: Number(id) } });
    if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (role.isSystem) {
        return NextResponse.json({ error: "Cannot delete a system role" }, { status: 403 });
    }

    // Check if any users are assigned to this role
    const userCount = await prisma.user.count({ where: { roleId: role.id } });
    if (userCount > 0) {
        return NextResponse.json({ error: `Cannot delete: ${userCount} user(s) still assigned to this role` }, { status: 409 });
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.role.delete({ where: { id: role.id } });

    return NextResponse.json({ ok: true });
}
