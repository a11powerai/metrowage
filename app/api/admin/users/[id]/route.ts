import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const body = await req.json();
    const user = await prisma.user.update({ where: { id: Number(params.id) }, data: { active: body.active } });
    return NextResponse.json({ id: user.id, active: user.active });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    await prisma.user.delete({ where: { id: Number(params.id) } });
    return NextResponse.json({ ok: true });
}
