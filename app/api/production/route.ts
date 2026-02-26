import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMatchingSlab, calculateLineTotal } from "@/lib/calculations";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url, "http://n");
    const dateStr = searchParams.get("date");
    if (!dateStr) return NextResponse.json({ lines: [] });

    const date = new Date(dateStr);
    const day = await prisma.productionDay.findFirst({
        where: { date: { gte: startOfDay(date), lte: endOfDay(date) } },
        include: {
            lines: {
                include: { worker: true, product: true },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!day) return NextResponse.json({ lines: [] });
    return NextResponse.json(day);
}

export async function POST(req: Request) {
    const body = await req.json();
    const { date: dateStr, workerId, productId, quantity } = body;

    const date = new Date(dateStr);

    // Get or create the production day
    let day = await prisma.productionDay.findFirst({
        where: { date: { gte: startOfDay(date), lte: endOfDay(date) } },
    });

    if (day?.status === "Finalized") {
        return NextResponse.json({ error: "This day is finalized and locked." }, { status: 403 });
    }

    if (!day) {
        day = await prisma.productionDay.create({ data: { date: startOfDay(date) } });
    }

    // Find slab
    const slabs = await prisma.incentiveSlab.findMany({ where: { productId: Number(productId) } });
    const slab = findMatchingSlab(slabs, Number(quantity));
    if (!slab) {
        return NextResponse.json({ error: "No matching incentive slab found for this product and quantity." }, { status: 422 });
    }

    const lineTotal = calculateLineTotal(Number(quantity), slab.ratePerUnit);

    // Check for duplicate
    const existing = await prisma.productionLine.findUnique({
        where: { dayId_workerId_productId: { dayId: day.id, workerId: Number(workerId), productId: Number(productId) } },
    });

    if (existing) {
        return NextResponse.json({ error: "An entry for this Worker + Product + Date already exists. Delete the existing entry first or update its quantity." }, { status: 409 });
    }

    const line = await prisma.productionLine.create({
        data: {
            dayId: day.id,
            workerId: Number(workerId),
            productId: Number(productId),
            quantity: Number(quantity),
            appliedRate: slab.ratePerUnit,
            lineTotal,
        },
        include: { worker: true, product: true },
    });

    return NextResponse.json(line, { status: 201 });
}
