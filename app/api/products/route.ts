import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const products = await prisma.product.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { slabs: true } } },
    });
    return NextResponse.json(products);
}

export async function POST(req: Request) {
    const body = await req.json();
    try {
        const product = await prisma.product.create({ data: body });
        return NextResponse.json(product, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Product ID already exists" }, { status: 409 });
    }
}
