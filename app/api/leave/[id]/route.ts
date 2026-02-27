import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const leave = await prisma.leave.update({
        where: { id: Number(id) },
        data: { status: body.status, approvedById: body.approvedById ?? null },
    });
    return NextResponse.json(leave);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.leave.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
}
