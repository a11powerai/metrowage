import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMatchingSlab, calculateLineTotal } from "@/lib/calculations";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url, "http://n");
    const productId = Number(searchParams.get("productId"));
    const quantity = Number(searchParams.get("quantity"));

    if (!productId || !quantity) return NextResponse.json({});

    const slabs = await prisma.incentiveSlab.findMany({ where: { productId } });
    const slab = findMatchingSlab(slabs, quantity);
    if (!slab) return NextResponse.json({});

    return NextResponse.json({ rate: slab.ratePerUnit, total: calculateLineTotal(quantity, slab.ratePerUnit) });
}
