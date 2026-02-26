import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const body = await req.json();
    const item = await prisma.commission.update({ where: { id: Number(params.id) }, data: { approved: body.approved } });
    return NextResponse.json(item);
}
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    await prisma.commission.delete({ where: { id: Number(params.id) } });
    return NextResponse.json({ ok: true });
}
