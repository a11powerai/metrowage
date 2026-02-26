import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.incentiveSlab.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
}

