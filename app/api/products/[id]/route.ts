import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const body = await req.json();
    const product = await prisma.product.update({ where: { id: Number(params.id) }, data: body });
    return NextResponse.json(product);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    await prisma.product.delete({ where: { id: Number(params.id) } });
    return NextResponse.json({ ok: true });
}
