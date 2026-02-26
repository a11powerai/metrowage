import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const user = await prisma.user.update({ where: { id: Number(id) }, data: { active: body.active } });
    return NextResponse.json({ id: user.id, active: user.active });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.user.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
}

