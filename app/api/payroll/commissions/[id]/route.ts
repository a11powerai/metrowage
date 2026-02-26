import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const item = await prisma.commission.update({ where: { id: Number(id) }, data: { approved: body.approved } });
    return NextResponse.json(item);
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.commission.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
}

