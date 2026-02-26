import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    await prisma.allowance.update({ where: { id: Number(params.id) }, data: { active: false } });
    return NextResponse.json({ ok: true });
}
