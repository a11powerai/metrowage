import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSlabOverlap } from "@/lib/calculations";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const slabs = await prisma.incentiveSlab.findMany({
        where: { productId: Number(id) },
        orderBy: { qtyFrom: "asc" },
    });
    return NextResponse.json(slabs);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.incentiveSlab.findMany({ where: { productId: Number(id) } });

    const overlaps = checkSlabOverlap(existing, { qtyFrom: body.qtyFrom, qtyTo: body.qtyTo });
    if (overlaps) {
        return NextResponse.json({ error: "Slab overlaps with an existing slab. Please choose a non-overlapping range." }, { status: 409 });
    }

    const slab = await prisma.incentiveSlab.create({
        data: { ...body, productId: Number(id) },
    });
    return NextResponse.json(slab, { status: 201 });
}

