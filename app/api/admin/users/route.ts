import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
    const users = await prisma.user.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true, name: true, email: true, role: true, roleId: true,
            locationId: true, active: true, createdAt: true,
            roleRef: { select: { name: true } },
            location: { select: { name: true } },
        },
    });
    return NextResponse.json(users);
}

export async function POST(req: Request) {
    const body = await req.json();
    const hashed = await bcrypt.hash(body.password, 10);

    // Look up role name from roleId if provided
    let roleName = body.role ?? "Supervisor";
    if (body.roleId) {
        const role = await prisma.role.findUnique({ where: { id: Number(body.roleId) } });
        if (role) roleName = role.name;
    }

    try {
        const user = await prisma.user.create({
            data: {
                name: body.name,
                email: body.email,
                password: hashed,
                role: roleName,
                roleId: body.roleId ? Number(body.roleId) : null,
                locationId: body.locationId ? Number(body.locationId) : null,
            },
        });
        return NextResponse.json({
            id: user.id, name: user.name, email: user.email,
            role: user.role, roleId: user.roleId, active: user.active,
        }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
}
