import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const products = await prisma.product.findMany({
        orderBy: [{ category: "asc" }, { name: "asc" }],
        include: { _count: { select: { slabs: true } } },
    });
    return NextResponse.json(products);
}

export async function POST(req: Request) {
    const body = await req.json();
    try {
        // Auto-generate Product ID: PRD-001
        const last = await prisma.product.findFirst({ orderBy: { id: "desc" } });
        let nextNum = 1;
        if (last?.productId) {
            const match = last.productId.match(/\d+$/);
            if (match) nextNum = parseInt(match[0]) + 1;
        }
        const productId = `PRD-${String(nextNum).padStart(3, "0")}`;

        const product = await prisma.product.create({
            data: {
                productId,
                name: body.name,
                category: body.category || "",
                model: body.model || "",
            },
        });
        return NextResponse.json(product, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message ?? "Error creating product" }, { status: 409 });
    }
}
