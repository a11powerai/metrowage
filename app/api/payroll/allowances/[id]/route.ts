import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.allowance.update({ where: { id: Number(id) }, data: { active: false } });
    return NextResponse.json({ ok: true });
}

