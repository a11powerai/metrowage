import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function POST(req: Request) {
    const { date: dateStr } = await req.json();
    const date = new Date(dateStr);
    const day = await prisma.productionDay.findFirst({
        where: { date: { gte: startOfDay(date), lte: endOfDay(date) } },
    });
    if (!day) return NextResponse.json({ error: "Day not found" }, { status: 404 });
    const updated = await prisma.productionDay.update({ where: { id: day.id }, data: { status: "Finalized" } });
    return NextResponse.json(updated);
}
