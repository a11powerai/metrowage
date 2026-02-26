import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
    const users = await prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } });
    return NextResponse.json(users);
}

export async function POST(req: Request) {
    const body = await req.json();
    const hashed = await bcrypt.hash(body.password, 10);
    try {
        const user = await prisma.user.create({ data: { ...body, password: hashed } });
        return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
}
